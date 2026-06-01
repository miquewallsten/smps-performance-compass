/**
 * Notification Scheduler for SMPS Performance Compass.
 *
 * Runs from within the Node.js process (like backup-scheduler).
 * Checks for overdue items, upcoming deadlines, and generates digests.
 *
 * Schedule:
 *   - Reminders: Every hour
 *   - Digests: Daily at 8:00 AM CST
 *   - Cleanup: Daily at 2:00 AM CST
 */
import { db } from '../db/connection.js';
import { createNotification, cleanupExpiredNotifications, NotificationType, NotificationCategory } from './notifications.js';

interface PeriodConfig {
  period: string;
  self_start: string;
  self_end: string;
  supervisor_start: string;
  supervisor_end: string;
  feedback_start: string;
  feedback_end: string;
  action_plan_start: string;
  action_plan_end: string;
}

function cstNow(): Date {
  return new Date(new Date().getTime() - 6 * 60 * 60 * 1000);
}

function daysBetween(now: Date, target: string): number {
  const targetDate = new Date(target + 'T23:59:59');
  return Math.ceil((targetDate.getTime() - now.getTime()) / 86400000);
}

// ─── Reminder Checks ────────────────────────────────────────────────────────

async function checkEvaluationReminders(): Promise<void> {
  try {
    const now = cstNow();
    const activePeriods = await db.all(
      'SELECT * FROM period_configs WHERE self_end > NOW() OR supervisor_end > NOW() OR feedback_end > NOW()'
    ) as PeriodConfig[];

    for (const pc of activePeriods) {
      const period = pc.period;

      // Self-evaluation reminders
      const selfDaysLeft = daysBetween(now, pc.self_end);
      if (selfDaysLeft === 7 || selfDaysLeft === 3 || selfDaysLeft === 0) {
        // Find employees who haven't completed self-eval
        const incomplete = await db.all(
          `SELECT u.id, u.name, u.email FROM users u
           WHERE u.is_active = 1 AND u.is_super_user = 0
           AND u.id NOT IN (
             SELECT DISTINCT evaluator_id FROM evaluations WHERE period = ? AND type = 'self' AND completed_at IS NOT NULL
           )`,
          [period]
        );

        for (const user of incomplete as any[]) {
          const type: NotificationType = selfDaysLeft <= 0 ? 'warning' : 'reminder';
          const urgency = selfDaysLeft <= 0 ? '¡ATENCIÓN!' : selfDaysLeft === 3 ? '¡URGENTE!' : '';
          const title = `${urgency} Autoevaluación ${selfDaysLeft <= 0 ? 'vencida' : `vence en ${selfDaysLeft} días`}`;
          const body = `Período: ${period}. ${selfDaysLeft <= 0 ? 'La fecha límite ha pasado.' : `Fecha límite: ${pc.self_end.split(' ')[0]}`}`;

          await createNotification({
            recipientId: user.id,
            type,
            category: 'evaluation',
            title,
            body,
            actionUrl: '/self-evaluation',
            relatedEntityId: period,
            relatedEntityType: 'period',
            sendEmail: selfDaysLeft <= 3,
          });
        }
      }

      // Supervisor evaluation reminders
      const supDaysLeft = daysBetween(now, pc.supervisor_end);
      if (supDaysLeft === 7 || supDaysLeft === 3 || supDaysLeft === 0) {
        const incomplete = await db.all(
          `SELECT e.evaluator_id, u.name as supervisor_name, COUNT(*) as pending_count
           FROM evaluations e
           JOIN users u ON u.id = e.evaluator_id
           WHERE e.period = ? AND e.type = 'supervisor' AND e.completed_at IS NULL
           GROUP BY e.evaluator_id, u.name`,
          [period]
        );

        for (const row of incomplete as any[]) {
          const type: NotificationType = supDaysLeft <= 0 ? 'warning' : 'reminder';
          const urgency = supDaysLeft <= 0 ? '¡ATENCIÓN!' : supDaysLeft === 3 ? '¡URGENTE!' : '';
          const title = `${urgency} Evaluaciones pendientes ${supDaysLeft <= 0 ? 'vencidas' : `vencen en ${supDaysLeft} días`}`;
          const body = `Tiene ${row.pending_count} evaluación(es) de supervisor pendiente(s) para el período ${period}.`;

          await createNotification({
            recipientId: row.evaluator_id,
            type,
            category: 'evaluation',
            title,
            body,
            actionUrl: '/evaluations',
            relatedEntityId: period,
            relatedEntityType: 'period',
            sendEmail: supDaysLeft <= 3,
          });
        }
      }

      // Feedback reminders
      const fbDaysLeft = daysBetween(now, pc.feedback_end);
      if (fbDaysLeft === 7 || fbDaysLeft === 3 || fbDaysLeft === 0) {
        const incomplete = await db.all(
          `SELECT e.evaluator_id, u.name, COUNT(*) as pending_count
           FROM evaluations e
           JOIN users u ON u.id = e.evaluator_id
           WHERE e.period = ? AND e.type = 'supervisor' AND e.completed_at IS NOT NULL AND e.feedback_completed = 0
           GROUP BY e.evaluator_id, u.name`,
          [period]
        );

        for (const row of incomplete as any[]) {
          const type: NotificationType = fbDaysLeft <= 0 ? 'warning' : 'reminder';
          const title = `Sesiones de feedback pendientes ${fbDaysLeft <= 0 ? '(vencidas)' : `— ${fbDaysLeft} días restantes`}`;

          await createNotification({
            recipientId: row.evaluator_id,
            type,
            category: 'evaluation',
            title,
            body: `Tiene ${row.pending_count} sesión(es) de feedback pendiente(s).`,
            actionUrl: '/evaluations',
            relatedEntityId: period,
            relatedEntityType: 'period',
            sendEmail: fbDaysLeft <= 3,
          });
        }
      }

      // Action plan reminders
      const apDaysLeft = daysBetween(now, pc.action_plan_end);
      if (apDaysLeft === 7 || apDaysLeft === 3 || apDaysLeft === 0) {
        // Pending approval action plans
        const pendingPlans = await db.all(
          `SELECT ap.supervisor_id, COUNT(*) as pending_count
           FROM action_plans ap
           WHERE ap.period = ? AND ap.approval_status = 'pending'
           GROUP BY ap.supervisor_id`,
          [period]
        );

        for (const row of pendingPlans as any[]) {
          const type: NotificationType = apDaysLeft <= 0 ? 'warning' : 'reminder';
          const title = `Planes de acción pendientes de aprobación ${apDaysLeft <= 0 ? '(vencidos)' : `— ${apDaysLeft} días restantes`}`;

          await createNotification({
            recipientId: row.supervisor_id,
            type,
            category: 'action_plan',
            title,
            body: `Tiene ${row.pending_count} plan(es) de acción pendiente(s) de aprobación.`,
            actionUrl: '/action-plans',
            sendEmail: apDaysLeft <= 3,
          });
        }
      }
    }

    // Vacation approval reminders (3 days pending)
    const pendingVacations = await db.all(
      `SELECT sa.supervisor_id, COUNT(*) as pending_count
       FROM vacation_requests vr
       JOIN supervisor_assignments sa ON sa.employee_id = vr.user_id
       WHERE vr.status = 'pending'
         AND vr.created_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
       GROUP BY sa.supervisor_id`
    );

    for (const row of pendingVacations as any[]) {
      await createNotification({
        recipientId: row.supervisor_id,
        type: 'reminder',
        category: 'vacation',
        title: 'Solicitudes de vacaciones pendientes',
        body: `Tiene ${row.pending_count} solicitud(es) de vacaciones pendiente(s) de aprobación.`,
        actionUrl: '/vacations',
        sendEmail: true,
      });
    }

  } catch (err) {
    console.error('[NotificationScheduler] Reminder check error:', err);
  }
}

// ─── Overdue Escalations ──────────────────────────────────────────────────

async function checkOverdueEscalations(): Promise<void> {
  try {
    // Find evaluations overdue by 7+ days and escalate to admins
    const overdueSupervisorEvals = await db.all(
      `SELECT e.evaluator_id, u.name, COUNT(*) as overdue_count
       FROM evaluations e
       JOIN users u ON u.id = e.evaluator_id
       JOIN period_configs pc ON pc.period = e.period
       WHERE e.type = 'supervisor' AND e.completed_at IS NULL
         AND pc.supervisor_end < DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY e.evaluator_id, u.name`
    );

    // Get admins
    const admins = await db.all('SELECT id FROM users WHERE is_admin = 1 AND is_active = 1') as any[];

    for (const row of overdueSupervisorEvals) {
      for (const admin of admins) {
        await createNotification({
          recipientId: admin.id,
          type: 'escalation',
          category: 'evaluation',
          title: `Evaluaciones vencidas — ${row.name}`,
          body: `${row.name} tiene ${row.overdue_count} evaluación(es) de supervisor vencida(s) por más de 7 días.`,
          actionUrl: '/evaluations',
          sendEmail: true,
        });
      }
    }
  } catch (err) {
    console.error('[NotificationScheduler] Escalation check error:', err);
  }
}

// ─── Daily Digest ──────────────────────────────────────────────────────────

async function generateDailyDigest(): Promise<void> {
  try {
    // For each admin/socio/supervisor, generate a digest of pending items
    const supervisors = await db.all(
      `SELECT DISTINCT sa.supervisor_id as id, u.name
       FROM supervisor_assignments sa
       JOIN users u ON u.id = sa.supervisor_id
       WHERE u.is_active = 1`
    ) as any[];

    const admins = await db.all(
      'SELECT id, name FROM users WHERE (is_admin = 1 OR is_super_user = 1) AND is_active = 1'
    ) as any[];

    // Merge and deduplicate
    const allRecipients = [...supervisors, ...admins];
    const seen = new Set<string>();
    const uniqueRecipients = allRecipients.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    for (const recipient of uniqueRecipients) {
      // Count pending items
      const pendingEvals = await db.get(
        `SELECT COUNT(*) as cnt FROM evaluations WHERE evaluator_id = ? AND type = 'supervisor' AND completed_at IS NULL`,
        [recipient.id]
      );
      const pendingFeedback = await db.get(
        `SELECT COUNT(*) as cnt FROM evaluations WHERE evaluator_id = ? AND type = 'supervisor' AND completed_at IS NOT NULL AND feedback_completed = 0`,
        [recipient.id]
      );
      const pendingActionPlans = await db.get(
        `SELECT COUNT(*) as cnt FROM action_plans WHERE supervisor_id = ? AND approval_status = 'pending'`,
        [recipient.id]
      );
      const pendingVacations = await db.get(
        `SELECT COUNT(*) as cnt FROM vacation_requests vr
         JOIN supervisor_assignments sa ON sa.employee_id = vr.user_id AND sa.supervisor_id = ?
         WHERE vr.status = 'pending'`,
        [recipient.id]
      );

      const totalPending = ((pendingEvals as any)?.cnt || 0) +
                           ((pendingFeedback as any)?.cnt || 0) +
                           ((pendingActionPlans as any)?.cnt || 0) +
                           ((pendingVacations as any)?.cnt || 0);

      if (totalPending > 0) {
        // Check digest preference
        const pref = await db.get(
          'SELECT digest_enabled FROM notification_preferences WHERE user_id = ? AND category = ?',
          [recipient.id, 'system']
        ) as any;

        if (pref?.digest_enabled === 0) continue;

        const parts: string[] = [];
        if ((pendingEvals as any)?.cnt > 0) parts.push(`• ${(pendingEvals as any).cnt} evaluación(es) de supervisor pendiente(s)`);
        if ((pendingFeedback as any)?.cnt > 0) parts.push(`• ${(pendingFeedback as any).cnt} sesión(es) de feedback pendiente(s)`);
        if ((pendingActionPlans as any)?.cnt > 0) parts.push(`• ${(pendingActionPlans as any).cnt} plan(es) de acción por aprobar`);
        if ((pendingVacations as any)?.cnt > 0) parts.push(`• ${(pendingVacations as any).cnt} solicitud(es) de vacaciones pendiente(s)`);

        await createNotification({
          recipientId: recipient.id,
          type: 'info',
          category: 'system',
          title: `Resumen diario — ${totalPending} acción(es) pendiente(s)`,
          body: parts.join('\n'),
          actionUrl: '/',
          sendEmail: true,
        });
      }
    }
  } catch (err) {
    console.error('[NotificationScheduler] Digest error:', err);
  }
}

// ─── Scheduler ─────────────────────────────────────────────────────────────

let lastReminderCheck: string | null = null;
let lastDigestDate: string | null = null;
let lastCleanupDate: string | null = null;

export function checkReminders(): void {
  const today = cstNow().toISOString().slice(0, 10);
  if (lastReminderCheck === today) return; // already checked today
  lastReminderCheck = today;

  console.log('[NotificationScheduler] Running reminder checks...');
  checkEvaluationReminders();
  checkOverdueEscalations();
}

export function checkDigests(): void {
  const today = cstNow().toISOString().slice(0, 10);
  if (lastDigestDate === today) return;
  lastDigestDate = today;

  console.log('[NotificationScheduler] Generating daily digest...');
  generateDailyDigest();
}

export function checkCleanup(): void {
  const today = cstNow().toISOString().slice(0, 10);
  if (lastCleanupDate === today) return;
  lastCleanupDate = today;

  console.log('[NotificationScheduler] Cleaning up expired notifications...');
  const count = cleanupExpiredNotifications();
  if (count > 0) console.log(`[NotificationScheduler] Cleaned up ${count} expired notifications`);
}

export function startNotificationScheduler(): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[NotificationScheduler] Disabled in development mode');
    return;
  }

  const check = () => {
    const now = cstNow();
    const hour = now.getUTCHours();

    // Reminders: every hour (but only generates once per day due to dedup check)
    checkReminders();

    // Digests: 8:00 AM CST
    if (hour === 8) checkDigests();

    // Cleanup: 2:00 AM CST
    if (hour === 2) checkCleanup();
  };

  // Check every hour
  setInterval(check, 60 * 60 * 1000);
  // First check after 2 minutes
  setTimeout(check, 2 * 60 * 1000);

  console.log('[NotificationScheduler] Started (reminders hourly, digest 8AM CST, cleanup 2AM CST)');
}
