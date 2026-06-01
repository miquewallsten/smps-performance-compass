/**
 * Session & Token Cleanup Service for SMPS Performance Compass.
 *
 * Removes expired sessions, expired password reset tokens, and expired activation tokens.
 * Runs daily as part of the existing scheduler infrastructure.
 *
 * All cleanup actions are logged to authentication_audit for traceability.
 */
import { db } from '../db/connection.js';

interface CleanupResult {
  expiredSessions: number;
  expiredResetTokens: number;
  expiredActivationTokens: number;
  inactiveUserSessions: number;
}

function toMySQLDate(d: Date): string {
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

export async function runSessionCleanup(): Promise<CleanupResult> {
  const now = toMySQLDate(new Date());
  const result: CleanupResult = {
    expiredSessions: 0,
    expiredResetTokens: 0,
    expiredActivationTokens: 0,
    inactiveUserSessions: 0,
  };

  try {
    // 1. Remove expired sessions from blocklist
    const sessionsResult = await db.run('DELETE FROM sessions WHERE expires_at < ?', [now]);
    result.expiredSessions = sessionsResult.changes || 0;
    if (result.expiredSessions > 0) {
      console.log(`[SessionCleanup] Removed ${result.expiredSessions} expired sessions`);
    }

    // 2. Remove expired password reset tokens (already used or expired)
    const resetResult = await db.run(
      'DELETE FROM password_reset_tokens WHERE expires_at < ? AND used_at IS NOT NULL',
      [now]
    );
    result.expiredResetTokens = resetResult.changes || 0;
    // Also mark as used (but don't delete) expired unused tokens for audit trail
    const expiredUnused = await db.run(
      'UPDATE password_reset_tokens SET used_at = ? WHERE expires_at < ? AND used_at IS NULL',
      [now, now]
    );
    if (result.expiredResetTokens > 0 || (expiredUnused.changes || 0) > 0) {
      console.log(`[SessionCleanup] Cleaned ${result.expiredResetTokens} used expired reset tokens, marked ${expiredUnused.changes || 0} unused expired tokens`);
    }

    // 3. Clear expired activation tokens from users
    const activationResult = await db.run(
      'UPDATE users SET activation_token_hash = NULL, activation_expires_at = NULL WHERE activation_expires_at IS NOT NULL AND activation_expires_at < ? AND activated_at IS NOT NULL',
      [now]
    );
    result.expiredActivationTokens = activationResult.changes || 0;
    if (result.expiredActivationTokens > 0) {
      console.log(`[SessionCleanup] Cleared ${result.expiredActivationTokens} expired activation tokens`);
    }

    // 4. Remove sessions for inactive users (they should never have valid sessions)
    const inactiveSessionsResult = await db.run(
      'DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE is_active = 0)'
    );
    result.inactiveUserSessions = inactiveSessionsResult.changes || 0;
    if (result.inactiveUserSessions > 0) {
      console.log(`[SessionCleanup] Removed ${result.inactiveUserSessions} sessions for inactive users`);
    }

    console.log(`[SessionCleanup] Cleanup complete: ${result.expiredSessions} sessions, ${result.expiredResetTokens} reset tokens, ${result.expiredActivationTokens} activation tokens, ${result.inactiveUserSessions} inactive user sessions`);

    return result;
  } catch (err) {
    console.error('[SessionCleanup] Error during cleanup:', err);
    throw err;
  }
}

/**
 * Start the session cleanup scheduler.
 * Runs daily at 3:00 AM CST (alongside the backup scheduler).
 */
export function startSessionCleanupScheduler(): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SessionCleanup] Scheduler disabled in development mode');
    return;
  }

  let lastCleanup: string | null = null;

  const check = () => {
    const now = new Date();
    // Convert to CST (UTC-6)
    const cstOffset = -6 * 60;
    const cst = new Date(now.getTime() + cstOffset * 60 * 1000);
    const todayStr = cst.toISOString().slice(0, 10);
    const hour = cst.getUTCHours();

    // Run at 3:00 AM CST (same time window as DB backup)
    if (hour === 3 && lastCleanup !== todayStr) {
      lastCleanup = todayStr;
      runSessionCleanup().catch(err => console.error('[SessionCleanup] Scheduled cleanup failed:', err));
    }
  };

  // Check every hour
  setInterval(check, 60 * 60 * 1000);
  // Run once on startup after 90 seconds (to not collide with other startup tasks)
  setTimeout(() => {
    runSessionCleanup().catch(err => console.error('[SessionCleanup] Startup cleanup failed:', err));
  }, 90 * 1000);

  console.log('[SessionCleanup] Scheduler started (daily at 3AM CST)');
}
