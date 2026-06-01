/**
 * Notification API Routes
 *
 * Endpoints:
 *   GET  /api/notifications         — List notifications for current user
 *   GET  /api/notifications/count    — Get unread count
 *   PATCH /api/notifications/:id/read — Mark one notification as read
 *   POST /api/notifications/read-all — Mark all as read
 *   GET  /api/notifications/preferences — Get user's notification preferences
 *   PATCH /api/notifications/preferences — Update user's notification preferences
 *   GET  /api/notifications/pending-actions — Get pending approval/action items for dashboard widget
 */
import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { createNotification, markNotificationRead, markAllNotificationsRead, getUnreadCount } from '../services/notifications.js';

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

// ─── GET /api/notifications ──────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = req.query.unread === 'true';

    let query = 'SELECT * FROM notifications WHERE recipient_id = ?';
    const params: any[] = [userId];

    if (unreadOnly) {
      query += ' AND is_read = 0';
    }

    // Filter out expired notifications
    query += ' AND (expires_at IS NULL OR expires_at > NOW())';

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const notifications = await db.all(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as cnt FROM notifications WHERE recipient_id = ?';
    const countParams: any[] = [userId];
    if (unreadOnly) {
      countQuery += ' AND is_read = 0';
    }
    countQuery += ' AND (expires_at IS NULL OR expires_at > NOW())';

    const total = await db.get(countQuery, countParams);

    return res.json({
      notifications,
      total: (total as any)?.cnt || 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error('List notifications error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/notifications/count ───────────────────────────────────────────
router.get('/count', async (req: Request, res: Response) => {
  try {
    const count = await getUnreadCount(req.user!.id);
    return res.json({ unread: count });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/notifications/:id/read ──────────────────────────────────────
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const success = await markNotificationRead(req.params.id, req.user!.id);
    if (!success) return res.status(404).json({ error: 'Notification not found' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/notifications/read-all ───────────────────────────────────────
router.post('/read-all', async (req: Request, res: Response) => {
  try {
    const count = await markAllNotificationsRead(req.user!.id);
    return res.json({ success: true, markedRead: count });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/notifications/preferences ────────────────────────────────────
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const prefs = await db.all(
      'SELECT * FROM notification_preferences WHERE user_id = ?',
      [req.user!.id]
    );
    return res.json(prefs);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/notifications/preferences ───────────────────────────────────
router.patch('/preferences', async (req: Request, res: Response) => {
  try {
    const { category, emailEnabled, inAppEnabled, reminderFrequency, digestEnabled } = req.body;
    if (!category) return res.status(400).json({ error: 'category is required' });

    const updates: string[] = [];
    const params: any[] = [];

    if (emailEnabled !== undefined) { updates.push('email_enabled = ?'); params.push(emailEnabled ? 1 : 0); }
    if (inAppEnabled !== undefined) { updates.push('in_app_enabled = ?'); params.push(inAppEnabled ? 1 : 0); }
    if (reminderFrequency) { updates.push('reminder_frequency = ?'); params.push(reminderFrequency); }
    if (digestEnabled !== undefined) { updates.push('digest_enabled = ?'); params.push(digestEnabled ? 1 : 0); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.user!.id, category);
    await db.run(
      `UPDATE notification_preferences SET ${updates.join(', ')} WHERE user_id = ? AND category = ?`,
      params
    );

    const updated = await db.get(
      'SELECT * FROM notification_preferences WHERE user_id = ? AND category = ?',
      [req.user!.id, category]
    );
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/notifications/pending-actions ─────────────────────────────────
// Dashboard widget: returns items requiring the user's action
router.get('/pending-actions', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const currentPeriod = req.query.period as string;

    const actions: any[] = [];

    // 1. Pending supervisor evaluations
    if (currentPeriod) {
      const pendingSupEvals = await db.all(
        `SELECT e.id, e.evaluated_id, u.name as evaluated_name, e.period,
                pc.supervisor_end as deadline
         FROM evaluations e
         JOIN users u ON u.id = e.evaluated_id
         JOIN period_configs pc ON pc.period = e.period
         WHERE e.evaluator_id = ? AND e.type = 'supervisor' AND e.completed_at IS NULL
           AND e.period = ?`,
        [userId, currentPeriod]
      );
      for (const e of pendingSupEvals as any[]) {
        actions.push({
          type: 'evaluation',
          actionType: 'complete_supervisor_eval',
          title: `Evaluar a ${e.evaluated_name}`,
          entityId: e.id,
          deadline: e.deadline,
          url: `/evaluations/${e.id}`,
        });
      }

      // 2. Pending feedback sessions
      const pendingFeedback = await db.all(
        `SELECT e.id, u.name as evaluated_name, e.period,
                pc.feedback_end as deadline
         FROM evaluations e
         JOIN users u ON u.id = e.evaluated_id
         JOIN period_configs pc ON pc.period = e.period
         WHERE e.evaluator_id = ? AND e.type = 'supervisor' AND e.completed_at IS NOT NULL
           AND e.feedback_completed = 0 AND e.period = ?`,
        [userId, currentPeriod]
      );
      for (const e of pendingFeedback as any[]) {
        actions.push({
          type: 'evaluation',
          actionType: 'complete_feedback',
          title: `Sesión de feedback con ${e.evaluated_name}`,
          entityId: e.id,
          deadline: e.deadline,
          url: `/evaluations/${e.id}`,
        });
      }

      // 3. Pending action plan approvals
      const pendingActionPlans = await db.all(
        `SELECT ap.id, u.name as employee_name, ap.period,
                pc.action_plan_end as deadline
         FROM action_plans ap
         JOIN users u ON u.id = ap.employee_id
         JOIN period_configs pc ON pc.period = ap.period
         WHERE ap.supervisor_id = ? AND ap.approval_status = 'pending' AND ap.period = ?`,
        [userId, currentPeriod]
      );
      for (const p of pendingActionPlans as any[]) {
        actions.push({
          type: 'action_plan',
          actionType: 'approve_action_plan',
          title: `Aprobar plan de acción de ${p.employee_name}`,
          entityId: p.id,
          deadline: p.deadline,
          url: `/action-plans/${p.id}`,
        });
      }

      // 4. Pending vacation approvals (supervisor)
      const pendingVacations = await db.all(
        `SELECT vr.id, u.name as employee_name, vr.start_date, vr.end_date, vr.days
         FROM vacation_requests vr
         JOIN users u ON u.id = vr.user_id
         JOIN supervisor_assignments sa ON sa.employee_id = vr.user_id AND sa.supervisor_id = ?
         WHERE vr.status = 'pending'`,
        [userId]
      );
      for (const v of pendingVacations as any[]) {
        actions.push({
          type: 'vacation',
          actionType: 'approve_vacation',
          title: `Aprobar vacaciones de ${v.employee_name} (${v.days} días)`,
          entityId: v.id,
          deadline: null,
          url: `/vacations`,
        });
      }

      // 5. Pending self-evaluations (employee's own)
      const pendingSelfEvals = await db.all(
        `SELECT e.id, e.period, pc.self_end as deadline
         FROM evaluations e
         JOIN period_configs pc ON pc.period = e.period
         WHERE e.evaluator_id = ? AND e.type = 'self' AND e.completed_at IS NULL AND e.period = ?`,
        [userId, currentPeriod]
      );
      for (const e of pendingSelfEvals as any[]) {
        actions.push({
          type: 'evaluation',
          actionType: 'complete_self_eval',
          title: 'Completar autoevaluación',
          entityId: e.id,
          deadline: e.deadline,
          url: `/self-evaluation`,
        });
      }
    }

    // Sort by deadline (urgent first, no deadline last)
    actions.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    return res.json({ actions, total: actions.length });
  } catch (err) {
    console.error('Pending actions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
