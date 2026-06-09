/**
 * Shared server utilities for SMPS Performance Compass.
 *
 * Extracts repeated patterns from route handlers into single-source-of-truth helpers.
 * No functionality changes — only DRY improvements.
 */

import { Request, Response, NextFunction } from 'express';

// ─── User Sanitization ────────────────────────────────────────────────────

/**
 * Strip sensitive fields (password_hash, security_answer, activation_token_hash)
 * from a user row before sending it to the client.
 *
 * Also converts MySQL TINYINT(1) booleans to actual booleans.
 *
 * SINGLE SOURCE OF TRUTH — replaces the 3 identical copies in auth.ts, users.ts, system.ts.
 */
export function sanitizeUser(user: Record<string, unknown>) {
  const {
    password_hash,
    security_answer,
    activation_token_hash,
    ...safe
  } = user;

  return {
    ...safe,
    isAdmin: Boolean(user.is_admin),
    isSuperUser: Boolean(user.is_super_user),
    isManagingPartner: Boolean(user.is_managing_partner),
    isActive: Boolean(user.is_active),
    mustChangePassword: Boolean(user.must_change_password),
  };
}

// ─── Date Formatting ──────────────────────────────────────────────────────

/**
 * Convert a JavaScript Date (or the current time) to a MySQL-compatible datetime string.
 *
 * Format: "YYYY-MM-DD HH:MM:SS" — no milliseconds, no timezone suffix.
 *
 * SINGLE SOURCE OF TRUTH — replaces the 20+ inline `.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')`.
 */
export function toMySQLDate(date?: Date): string {
  const d = date ?? new Date();
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

/**
 * Get the current time as a MySQL datetime string.
 * Shorthand for `toMySQLDate(new Date())`.
 */
export function nowMySQL(): string {
  return toMySQLDate();
}

// ─── Async Error Handler ───────────────────────────────────────────────────

/**
 * Wrap an async Express route handler to catch unhandled errors and return
 * a consistent 500 response. Eliminates the `try/catch + console.error + res.status(500)`
 * boilerplate that's duplicated in every route handler.
 *
 * Usage:
 *   router.get('/path', authMiddleware, asyncHandler(async (req, res) => {
 *     const data = await db.all('SELECT ...');
 *     return res.json(data);
 *   }));
 *
 * Errors are logged with the route path for correlation.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(`[${req.method} ${req.path}] Error:`, err);
      return res.status(500).json({ error: 'Internal server error' });
    });
  };
}

// ─── Pagination Helper ─────────────────────────────────────────────────────

/**
 * Parse pagination parameters from query string.
 * Returns `{ limit, offset }` with sensible defaults.
 */
export function parsePagination(query: Record<string, any>): { limit: number; offset: number } {
  const limit = Math.min(Math.max(parseInt(query.limit as string) || 50, 1), 200);
  const offset = Math.max(parseInt(query.offset as string) || 0, 0);
  return { limit, offset };
}

// ─── Period Validation ─────────────────────────────────────────────────────

/**
 * Validate that a period string matches the expected format: YYYY-H1 or YYYY-H2.
 */
export function isValidPeriod(period: string): boolean {
  return /^\d{4}-H[12]$/.test(period);
}