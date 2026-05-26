import { Router, Request, Response } from 'express';
import { db, tx } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

// ─── GET /api/periods ──────────────────────────────────────────────────────
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const periods = await db.all('SELECT * FROM period_configs');
    return res.json(periods);
  } catch (err) {
    console.error('List periods error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/periods ──────────────────────────────────────────────────────
router.post('/', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { period, selfStart, selfEnd, supervisorStart, supervisorEnd, feedbackStart, feedbackEnd, actionPlanStart, actionPlanEnd } = req.body;
    if (!period || !selfStart || !selfEnd || !supervisorStart || !supervisorEnd || !feedbackStart || !feedbackEnd || !actionPlanStart || !actionPlanEnd) {
      return res.status(400).json({ error: 'All period fields are required' });
    }

    await db.run(
      `INSERT INTO period_configs (period, self_start, self_end, supervisor_start, supervisor_end, feedback_start, feedback_end, action_plan_start, action_plan_end)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE self_start=VALUES(self_start), self_end=VALUES(self_end), supervisor_start=VALUES(supervisor_start), supervisor_end=VALUES(supervisor_end), feedback_start=VALUES(feedback_start), feedback_end=VALUES(feedback_end), action_plan_start=VALUES(action_plan_start), action_plan_end=VALUES(action_plan_end)`,
      [period, selfStart, selfEnd, supervisorStart, supervisorEnd, feedbackStart, feedbackEnd, actionPlanStart, actionPlanEnd]
    );

    const config = await db.get('SELECT * FROM period_configs WHERE period = ?', [period]);
    return res.json(config);
  } catch (err) {
    console.error('Create/update period error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
