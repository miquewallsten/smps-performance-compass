/**
 * Token generation and hashing utilities for activation and password reset flows.
 *
 * Tokens are cryptographically random 256-bit values.
 * Only the SHA-256 hash is stored in the database.
 * The plaintext token is sent to the user via email and never stored.
 */
import crypto from 'crypto';

/**
 * Generate a cryptographically random token (64 hex characters = 256 bits).
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token using SHA-256 for database storage.
 * The plaintext token is never stored.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify that a plaintext token matches a stored hash.
 */
export function verifyToken(token: string, storedHash: string): boolean {
  return hashToken(token) === storedHash;
}

/**
 * Generate a token and return both the plaintext (for email link)
 * and the hash (for database storage).
 */
export function generateTokenPair(): { token: string; tokenHash: string } {
  const token = generateToken();
  const tokenHash = hashToken(token);
  return { token, tokenHash };
}

/**
 * Get token expiry date.
 */
export function getExpiryDate(hours: number): Date {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
}

/**
 * Format a date for MySQL datetime.
 */
export function toMySQLDate(date: Date): string {
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}
