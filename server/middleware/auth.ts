import { Request, Response, NextFunction } from 'express';
import { verifyToken, hashToken, JwtPayload } from '../auth/jwt.js';
import { db } from '../db/connection.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { id: string };
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    // Check if token is in blocklist (logged out)
    const tokenHash = hashToken(token);
    const blocked = await db.get('SELECT id FROM sessions WHERE token_hash = ?', [tokenHash]);
    if (blocked) {
      return res.status(401).json({ error: 'Token revoked' });
    }

    // SECURITY: Verify the user still exists and is active
    const user = await db.get('SELECT id, is_active FROM users WHERE id = ?', [payload.sub]) as Record<string, unknown> | undefined;
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (!user.is_active) {
      // Inactive user — revoke all their sessions to force re-authentication
      await db.run('DELETE FROM sessions WHERE user_id = ?', [payload.sub]);
      return res.status(401).json({ error: 'Account deactivated' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Database error' });
  }

  req.user = { ...payload, id: payload.sub };
  next();
}
