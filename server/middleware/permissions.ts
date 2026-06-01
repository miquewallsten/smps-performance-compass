/**
 * Reusable authorization middleware for SMPS Performance Compass.
 *
 * Usage:
 *   router.get('/', authMiddleware, requireRole('admin'), handler)
 *   router.get('/:id', authMiddleware, requireOwnershipOrRole('admin'), handler)
 *   router.post('/:id/approve', authMiddleware, requireSupervisorOrRole('admin'), handler)
 *
 * All middleware assumes `authMiddleware` has already run and populated `req.user.
 */
import { Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { auditLog, getClientIp, getUserAgent } from '../services/audit.js';

type Role = 'super_user' | 'admin' | 'managing_partner' | 'socio' | 'employee';

/**
 * Map a user object to a normalized role string.
 */
export function normalizeRole(user: NonNullable<Request['user']>): Role {
  if (user.role === 'super_user') return 'super_user';
  if (user.role === 'admin') return 'admin';
  if (user.position === 'socio' || user.position === 'salary_partner') return 'socio';
  return 'employee';
}

/**
 * Check if a user has one of the allowed roles.
 * super_user → matches everything
 * admin → matches admin, managing_partner
 * socio → matches socio, admin
 */
export function hasRole(user: NonNullable<Request['user']>, roles: Role[]): boolean {
  const role = normalizeRole(user);
  if (role === 'super_user') return true;
  if (role === 'admin') return roles.some(r => r === 'admin' || r === 'managing_partner');
  if (role === 'socio') return roles.includes('socio') || roles.includes('admin');
  return roles.includes(role);
}

/**
 * Is this user an admin, super_user, or socio? (broad "can see everything" check)
 */
export function isAdminOrSocio(user: NonNullable<Request['user']>): boolean {
  return hasRole(user, ['super_user', 'admin', 'socio']);
}

/**
 * Check if user is the direct supervisor of a given employee (any period).
 * Uses supervisor_assignments table. Period-aware if period provided.
 */
export async function isSupervisorOf(supervisorId: string, employeeId: string, period?: string): Promise<boolean> {
  try {
    const periodClause = period ? ' AND period = ?' : '';
    const params = period ? [supervisorId, employeeId, period] : [supervisorId, employeeId];
    const assignment = await db.get(
      `SELECT id FROM supervisor_assignments WHERE supervisor_id = ? AND employee_id = ?${periodClause} LIMIT 1`,
      params
    );
    return !!assignment;
  } catch {
    return false;
  }
}

/**
 * Get all employee IDs that a user supervises (optionally for a specific period).
 */
export async function getSuperviseeIds(supervisorId: string, period?: string): Promise<string[]> {
  try {
    const periodClause = period ? ' AND period = ?' : '';
    const params = period ? [supervisorId, period] : [supervisorId];
    const rows = await db.all(
      `SELECT DISTINCT employee_id FROM supervisor_assignments WHERE supervisor_id = ?${periodClause}`,
      params
    );
    return rows.map((r: any) => r.employee_id);
  } catch {
    return [];
  }
}

/**
 * Log an authorization denial to the audit table.
 */
async function logDenial(req: Request, resource: string, reason: string): Promise<void> {
  try {
    await auditLog({
      action: 'authorization_denied', // reuse — we'll add proper type later
      userId: req.user?.id || null,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: { type: 'authorization_denied', resource, reason },
    });
  } catch { /* never break the request */ }
}

// ─── Middleware Factories ───────────────────────────────────────────────

/**
 * Require that the authenticated user has one of the specified roles.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (hasRole(req.user, roles)) return next();
    logDenial(req, req.path, `required roles: ${roles.join(',')}, user role: ${normalizeRole(req.user)}`);
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

/**
 * Require that the authenticated user has ANY of the specified roles.
 */
export function requireAnyRole(...roles: Role[]) {
  return requireRole(...roles);
}

/**
 * Require that the authenticated user is the owner of the resource
 * OR has one of the specified roles.
 */
export function requireOwnershipOrRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (hasRole(req.user, roles)) return next();
    const targetId = req.params.id || req.params.userId || req.body?.userId;
    if (targetId && req.user.id === targetId) return next();
    logDenial(req, req.path, `not owner and not role ${roles.join(',')}`);
    return res.status(403).json({ error: 'Access denied: you can only access your own resources' });
  };
}

/**
 * Require that the authenticated user is the owner of the resource,
 * OR is a supervisor of the target user, OR has one of the specified roles.
 */
export function requireSupervisorOrRole(...roles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (hasRole(req.user, roles)) return next();

    const targetId = req.params.id || req.params.userId || req.params.evaluatedId || req.body?.userId || req.body?.evaluatedId;
    if (targetId && req.user.id === targetId) return next();

    if (targetId) {
      const period = req.query.period as string | undefined;
      if (await isSupervisorOf(req.user.id, targetId, period)) return next();
    }

    logDenial(req, req.path, `not owner, not supervisor, not role ${roles.join(',')}`);
    return res.status(403).json({ error: 'Access denied: you can only access your own or your supervisees\' resources' });
  };
}

/**
 * Require access to an entity identified by a DB record.
 * Loads the record, then checks: is the user the owner (employee_id),
 * the supervisor (supervisor_id), an admin, or a socio?
 *
 * Used for evaluations, action plans, etc. where the record has
 * employee_id and/or supervisor_id columns.
 */
export function requireEntityAccess(opts: {
  /** SQL to fetch the entity: must return a row with employee_id (and optionally supervisor_id) */
  query: string;
  /** Query params (besides the ID which is appended automatically) */
  queryParams?: any[];
  /** Which roles bypass the check entirely */
  bypassRoles?: Role[];
  /** Allow supervisors of the employee to access? */
  allowSupervisor?: boolean;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    const bypassRoles = opts.bypassRoles || ['super_user', 'admin', 'socio'];
    if (hasRole(req.user, bypassRoles)) return next();

    try {
      const entityId = req.params.id;
      if (!entityId) return res.status(400).json({ error: 'Resource ID required' });

      const entity = await db.get(opts.query, [...(opts.queryParams || []), entityId]) as Record<string, unknown> | undefined;
      if (!entity) return res.status(404).json({ error: 'Resource not found' });

      // Check ownership
      const employeeId = entity.employee_id || entity.evaluated_id || entity.user_id;
      if (employeeId && req.user.id === employeeId) {
        // Store entity for handler reuse
        (req as any)._entity = entity;
        return next();
      }

      // Check supervisor_id on the record
      const supervisorId = entity.supervisor_id || entity.evaluator_id;
      if (supervisorId && req.user.id === supervisorId) {
        (req as any)._entity = entity;
        return next();
      }

      // Check supervisor_assignments (is user a supervisor of the employee?)
      if (opts.allowSupervisor !== false && employeeId) {
        const period = (entity as any).period || req.query.period as string | undefined;
        if (await isSupervisorOf(req.user.id, employeeId as string, period)) {
          (req as any)._entity = entity;
          return next();
        }
      }

      logDenial(req, req.path, `no entity access: not owner/supervisor of ${entityId}`);
      return res.status(403).json({ error: 'Access denied' });
    } catch (err) {
      console.error('Entity access check error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Require that the user is the supervisor of the employee in the entity
 * OR is an admin/super_user. Used for approve/feedback endpoints.
 */
export function requireSupervisorAction(opts: {
  /** SQL to fetch the entity */
  query: string;
  /** Query params (besides the ID which is appended automatically) */
  queryParams?: any[];
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    // Admins and super_users always pass
    if (hasRole(req.user, ['super_user', 'admin'])) return next();

    try {
      const entityId = req.params.id;
      if (!entityId) return res.status(400).json({ error: 'Resource ID required' });

      const entity = await db.get(opts.query, [...(opts.queryParams || []), entityId]) as Record<string, unknown> | undefined;
      if (!entity) return res.status(404).json({ error: 'Resource not found' });

      // Check if user is the evaluator/supervisor on the record
      const supervisorId = entity.supervisor_id || entity.evaluator_id;
      if (supervisorId && req.user.id === supervisorId) {
        (req as any)._entity = entity;
        return next();
      }

      // Check supervisor_assignments
      const employeeId = entity.employee_id || entity.evaluated_id || entity.user_id;
      if (employeeId) {
        const period = (entity as any).period || req.query.period as string | undefined;
        if (await isSupervisorOf(req.user.id, employeeId as string, period)) {
          (req as any)._entity = entity;
          return next();
        }
      }

      logDenial(req, req.path, `supervisor action denied for ${entityId}`);
      return res.status(403).json({ error: 'Only the supervisor or an administrator can perform this action' });
    } catch (err) {
      console.error('Supervisor action check error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Generic permission check. Provide a custom async predicate.
 */
export function requirePermission(
  check: (user: NonNullable<Request['user']>, req: Request) => Promise<boolean> | boolean
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const allowed = await check(req.user, req);
      if (allowed) return next();
      logDenial(req, req.path, 'custom permission check failed');
      return res.status(403).json({ error: 'Access denied' });
    } catch (err) {
      console.error('Permission check error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
