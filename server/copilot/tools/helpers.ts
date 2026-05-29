/**
 * Shared helpers for copilot tools.
 */
import { db } from '../../db/connection.js';

/**
 * Get the latest period from the database.
 * Returns the most recent period string (e.g. '2026-H1') or a fallback.
 */
export async function getLatestPeriod(): Promise<string> {
  try {
    const row = await db.get('SELECT period FROM period_configs ORDER BY period DESC LIMIT 1') as { period: string } | undefined;
    return row?.period || '2026-H1';
  } catch {
    return '2026-H1';
  }
}

/**
 * Get the current date formatted for MySQL DATETIME.
 */
export function nowMySQL(): string {
  return new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

/**
 * Get the current date as YYYY-MM-DD.
 */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
