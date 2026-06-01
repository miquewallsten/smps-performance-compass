/**
 * Reusable authorization middleware for SMPS Performance Compass.
 *
 * Usage:
 *   router.get('/', authMiddleware, requireRole('admin'), handler)
 *   router.get('/:id', authMiddleware, requireOwnershipOrRole('admin'), handler)
 *   router.post('/:id/approve', authMiddleware, requireSupervisorOrRole('admin'), handler)
 *
 * All middleware assumes `authMiddleware` has already run and populated `req.user`.
 */
import { Request, Response, NextFunction } from 'express';

// Re-use the global Express type extension from auth.ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'super_user' | 'admin' | 'user';
        name: string;
        position: string;
        isManagingPartner: boolean;
      };
    }
  }
}

type Role = 'super_user' | 'admin' | 'managing_partner' | 'socio' | 'employee';

/**
 * Map a user object to a normalized role string.
 * Uses the `role` field set by the JWT middleware, plus positional
 * checks for socio/managing_partner that are encoded in the role.
 */
function normalizeRole(user: NonNullable<Request['user']>): Role {
  // The JWT payload sets role to 'super_user', 'admin', or 'user'.
  // 'admin' includes both isAdmin and isManagingPartner (see auth/jwt.ts getRole).
  if (user.role === 'super_user') return 'super_user';
  if (user.role === 'admin') return 'admin';
  if (user.position === 'socio') return 'socio';
  return 'employee';
}

/**
 * Check if a user has one of the allowed roles.
 */
function hasRole(user: NonNullable<Request['user']>, roles: Role[]): boolean {
  const role = normalizeRole(user);

  if (role === 'super_user') {
    // super_user matches everything
    return true;
  }

  if (role === 'admin') {
    // admin matches admin, managing_partner
    return roles.some(r => r === 'admin' || r === 'managing_partner');
  }

  if (role === 'socio') {
    return roles.includes('socio') || roles.includes('admin');
  }

  return roles.includes(role);
}

/**
 * Require that the authenticated user has one of the specified roles.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (hasRole(req.user, roles)) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

/**
 * Require that the authenticated user has ANY of the specified roles.
 * Alias for requireRole for clarity.
 */
export function requireAnyRole(...roles: Role[]) {
  return requireRole(...roles);
}

/**
 * Require that the authenticated user is the owner of the resource
 * OR has one of the specified roles.
 *
 * Checks `req.params.id` or `req.params.userId` or `req.body.userId`
 * against `req.user.id`.
 */
export function requireOwnershipOrRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    // Check role first (admin bypasses ownership)
    if (hasRole(req.user, roles)) return next();

    // Check ownership via param or body
    const targetId = req.params.id || req.params.userId || req.body?.userId;
    if (targetId && req.user.id === targetId) return next();

    return res.status(403).json({ error: 'Access denied: you can only access your own resources' });
  };
}

/**
 * Require that the authenticated user is the owner of the resource,
 * OR is a supervisor of the target user, OR has one of the specified roles.
 *
 * Fetches supervisor assignments from DB to verify relationship.
 */
export function requireSupervisorOrRole(...roles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    // Check role first
    if (hasRole(req.user, roles)) return next();

    // Check ownership
    const targetId = req.params.id || req.params.userId || req.params.evaluatedId || req.body?.userId || req.body?.evaluatedId;
    if (targetId && req.user.id === targetId) return next();

    // Check supervisor relationship
    if (targetId) {
      try {
        const { db } = await import('../db/connection.js');
        const period = req.query.period as string | undefined;
        const periodClause = period ? ' AND period = ?' : '';
        const params = period ? [req.user.id, targetId, period] : [req.user.id, targetId];
        const assignment = await db.get(
          `SELECT id FROM supervisor_assignments WHERE supervisor_id = ? AND employee_id = ?${periodClause} LIMIT 1`,
          params
        );
        if (assignment) return next();
      } catch (err) {
        console.error('Supervisor check error:', err);
      }
    }

    return res.status(403).json({ error: 'Access denied: you can only access your own or your supervisees\' resources' });
  };
}

/**
 * Generic permission check. Provide a custom async predicate.
 *
 * Usage:
 *   router.patch('/:id', authMiddleware, requirePermission(async (user, req) => {
 *     const plan = await db.get('SELECT * FROM action_plans WHERE id = ?', [req.params.id]);
 *     return user.role === 'admin' || user.id === plan?.employee_id || user.id === plan?.supervisor_id;
 *   }), handler)
 */
export function requirePermission(
  check: (user: NonNullable<Request['user']>, req: Request) => Promise<boolean> | boolean
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const allowed = await check(req.user, req);
      if (allowed) return next();
      return res.status(403).json({ error: 'Access denied' });
    } catch (err) {
      console.error('Permission check error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
