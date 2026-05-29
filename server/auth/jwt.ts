import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// JWT_SECRET must be set in production. The server will refuse to start without it.
// In development, we allow a fallback for convenience but log a warning.
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      // This should never be reached — server/index.ts checks first — but defense in depth
      throw new Error('JWT_SECRET is not set. Refusing to run in production without it.');
    }
    console.warn('⚠️  WARNING: JWT_SECRET not set — using dev-only fallback. Never use this in production.');
    return 'dev-secret-NEVER-USE-IN-PRODUCTION';
  }
  return secret;
})();

const JWT_EXPIRES_IN = '24h';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'super_user' | 'admin' | 'user';
  name: string;
  position: string;
  isManagingPartner: boolean;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenExpiry(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 24);
  return date;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getRole(user: { isAdmin: boolean; isSuperUser: boolean; isManagingPartner?: boolean }): 'super_user' | 'admin' | 'user' {
  if (user.isSuperUser) return 'super_user';
  if (user.isAdmin || user.isManagingPartner) return 'admin';
  return 'user';
}
