/**
 * Centralized Notification Service for SMPS Performance Compass.
 *
 * Generates, stores, and delivers notifications through multiple channels.
 * Designed to be called from route handlers and scheduled jobs.
 *
 * Channels:
 *   - In-app: stored in notifications table, fetched via API
 *   - Email: sent via existing email service (sendmail/SMTP)
 *
 * Types: info, reminder, warning, approval_required, escalation
 */
import { db } from '../db/connection.js';
import { sendTemplateEmail } from './email.js';
import { auditLog } from './audit.js';

// ─── Types ────────────────────────────────────────────────────────────────

export type NotificationType = 'info' | 'reminder' | 'warning' | 'approval_required' | 'escalation';
export type NotificationCategory = 'evaluation' | 'objective' | 'action_plan' | 'vacation' | 'system' | 'onboarding';

export interface CreateNotificationParams {
  recipientId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body?: string;
  actionUrl?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  sendEmail?: boolean;
  expiresAt?: string;
}

// ─── Core: Create Notification ─────────────────────────────────────────────

export async function createNotification(params: CreateNotificationParams): Promise<string | null> {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    // Check user preference
    const pref = await db.get(
      'SELECT email_enabled, in_app_enabled FROM notification_preferences WHERE user_id = ? AND category = ?',
      [params.recipientId, params.category]
    ) as any;

    const inAppEnabled = pref?.in_app_enabled ?? 1;
    const emailEnabled = pref?.email_enabled ?? 1;

    if (!inAppEnabled && !(emailEnabled && params.sendEmail !== false)) {
      // User has disabled both channels for this category
      return null;
    }

    await db.run(
      `INSERT INTO notifications (id, recipient_id, type, category, title, body, action_url, related_entity_id, related_entity_type, is_read, is_email_enabled, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [id, params.recipientId, params.type, params.category, params.title, params.body || null,
       params.actionUrl || null, params.relatedEntityId || null, params.relatedEntityType || null,
       emailEnabled ? 1 : 0, now, params.expiresAt || null]
    );

    // Record in-app delivery
    await db.run(
      `INSERT INTO notification_deliveries (id, notification_id, channel, status, attempted_at, delivered_at) VALUES (?, ?, 'in_app', 'sent', ?, ?)`,
      [crypto.randomUUID(), id, now, now]
    );

    // Send email if enabled and requested
    if (emailEnabled && params.sendEmail !== false && params.type !== 'info') {
      // Only send emails for non-info notifications (reminders, warnings, approvals, escalations)
      await sendNotificationEmail(id, params);
    }

    return id;
  } catch (err) {
    console.error('[Notifications] Create error:', err);
    return null;
  }
}

// ─── Email Delivery ──────────────────────────────────────────────────────

async function sendNotificationEmail(notificationId: string, params: CreateNotificationParams): Promise<void> {
  try {
    // Get recipient email
    const user = await db.get('SELECT email, name FROM users WHERE id = ?', [params.recipientId]) as any;
    if (!user) return;

    const appUrl = process.env.APP_URL || 'https://smps.bowdot.online';
    const fullActionUrl = params.actionUrl ? `${appUrl}${params.actionUrl}` : appUrl;

    const typeEmoji: Record<string, string> = {
      info: 'ℹ️',
      reminder: '⏰',
      warning: '⚠️',
      approval_required: '✅',
      escalation: '🔴',
    };

    const typeLabel: Record<string, string> = {
      info: 'Información',
      reminder: 'Recordatorio',
      warning: 'Advertencia',
      approval_required: 'Aprobación Requerida',
      escalation: 'Escalación',
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; background: #1e40af; color: white; padding: 12px 16px; border-radius: 8px; font-weight: bold; font-size: 18px;">SM<br/>PS</div>
        </div>
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">${typeEmoji[params.type] || 'ℹ️'} ${typeLabel[params.type] || 'Notificación'}</p>
          <h3 style="margin: 0 0 12px; color: #1e293b; font-size: 18px;">${params.title}</h3>
          ${params.body ? `<p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.5;">${params.body}</p>` : ''}
        </div>
        ${params.actionUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${fullActionUrl}" style="background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">Ver en SMPS</a>
        </div>
        ` : ''}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Esta notificación fue generada por SMPS Performance Compass. Puede gestionar sus preferencias de notificación en la configuración de su cuenta.</p>
      </div>
    `;

    const result = await sendTemplateEmail({
      to: user.email,
      subject: `SMPS — ${params.title}`,
      html,
    });

    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    if (result) {
      await db.run('UPDATE notifications SET is_email_sent = 1, email_sent_at = ? WHERE id = ?', [now, notificationId]);
      await db.run(
        `INSERT INTO notification_deliveries (id, notification_id, channel, status, attempted_at, delivered_at) VALUES (?, ?, 'email', 'sent', ?, ?)`,
        [crypto.randomUUID(), notificationId, now, now]
      );
    } else {
      await db.run(
        `INSERT INTO notification_deliveries (id, notification_id, channel, status, attempted_at, error_message) VALUES (?, ?, 'email', 'failed', ?, 'Email send returned false')`,
        [crypto.randomUUID(), notificationId, now]
      );
    }
  } catch (err) {
    console.error('[Notifications] Email delivery error:', err);
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    await db.run(
      `INSERT INTO notification_deliveries (id, notification_id, channel, status, attempted_at, error_message) VALUES (?, ?, 'email', 'failed', ?, ?)`,
      [crypto.randomUUID(), notificationId, now, (err as Error).message?.slice(0, 200)]
    );
  }
}

// ─── Mark Read ─────────────────────────────────────────────────────────────

export async function markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
  try {
    const notif = await db.get('SELECT id, is_read FROM notifications WHERE id = ? AND recipient_id = ?', [notificationId, userId]);
    if (!notif) return false;
    if ((notif as any).is_read) return true;

    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    await db.run('UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ?', [now, notificationId]);
    return true;
  } catch (err) {
    console.error('[Notifications] Mark read error:', err);
    return false;
  }
}

// ─── Mark All Read ─────────────────────────────────────────────────────────

export async function markAllNotificationsRead(userId: string): Promise<number> {
  try {
    const result = await db.run('UPDATE notifications SET is_read = 1, read_at = NOW() WHERE recipient_id = ? AND is_read = 0', [userId]);
    return result.affectedRows || 0;
  } catch (err) {
    console.error('[Notifications] Mark all read error:', err);
    return 0;
  }
}

// ─── Get Unread Count ──────────────────────────────────────────────────────

export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const result = await db.get('SELECT COUNT(*) as cnt FROM notifications WHERE recipient_id = ? AND is_read = 0', [userId]);
    return (result as any)?.cnt || 0;
  } catch (err) {
    return 0;
  }
}

// ─── Cleanup Expired ──────────────────────────────────────────────────────

export async function cleanupExpiredNotifications(): Promise<number> {
  try {
    const result = await db.run('DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < NOW()');
    return result.affectedRows || 0;
  } catch (err) {
    return 0;
  }
}
