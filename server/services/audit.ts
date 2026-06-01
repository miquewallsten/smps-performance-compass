/**
 * Authentication audit logging service.
 *
 * Records all authentication events to the authentication_audit table
 * for security monitoring and compliance.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';

export type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'login_failed_deactivated'
  | 'login_failed_not_activated'
  | 'logout'
  | 'password_changed'
  | 'password_reset_requested'
  | 'password_reset_email_sent'
  | 'password_reset_completed'
  | 'password_reset_failed'
  | 'admin_password_reset_requested'
  | 'activation_email_sent'
  | 'activation_email_resent'
  | 'account_activated'
  | 'activation_failed'
  | 'token_revoked'
  | 'user_created'
  | 'user_deactivated'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'mfa_challenge_success'
  | 'mfa_challenge_failed'
  | 'authorization_denied'
  | 'copilot_blocked_query'
  | 'security_violation';

interface AuditLogParams {
  action: AuditAction;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Log an authentication event to the audit table.
 * This function never throws — if it fails, it logs to console but doesn't break the parent request.
 */
export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    const id = uuidv4();
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    await db.run(
      `INSERT INTO authentication_audit (id, user_id, action, ip_address, user_agent, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        params.userId || null,
        params.action,
        params.ipAddress || null,
        params.userAgent || null,
        params.metadata ? JSON.stringify(params.metadata) : null,
        now,
      ]
    );
  } catch (err) {
    // Audit logging should never break the parent request
    console.error('Audit log error:', err);
  }
}

/**
 * Extract IP address from Express request, accounting for proxies.
 */
export function getClientIp(req: { headers: Record<string, string | string[] | undefined>; ip?: string }): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.ip || 'unknown';
}

/**
 * Extract user agent from Express request.
 */
export function getUserAgent(req: { headers: Record<string, string | string[] | undefined> }): string {
  const ua = req.headers['user-agent'];
  if (typeof ua === 'string') return ua.slice(0, 500);
  return 'unknown';
}

/**
 * Clean up old audit records (run periodically).
 * Keeps records for the specified number of days.
 */
export async function cleanupAuditLogs(retentionDays: number = 730): Promise<number> {
  try {
    const result = await db.run(
      `DELETE FROM authentication_audit WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [retentionDays]
    );
    return result.affectedRows;
  } catch (err) {
    console.error('Audit cleanup error:', err);
    return 0;
  }
}
