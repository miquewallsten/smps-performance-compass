import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'super_user' | 'admin' | 'user';
  name: string;
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

export function getRole(user: { isAdmin: boolean; isSuperUser: boolean }): 'super_user' | 'admin' | 'user' {
  if (user.isSuperUser) return 'super_user';
  if (user.isAdmin) return 'admin';
  return 'user';
}
