import { Router } from 'express';
import db from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
const router = Router();
// ─── GET /api/periods ──────────────────────────────────────────────────────
router.get('/', authMiddleware, (_req, res) => {
    try {
        const periods = db.prepare('SELECT * FROM period_configs').all();
        return res.json(periods);
    }
    catch (err) {
        console.error('List periods error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ─── POST /api/periods ──────────────────────────────────────────────────────
router.post('/', authMiddleware, requireAdmin, (req, res) => {
    try {
        const { period, selfStart, selfEnd, supervisorStart, supervisorEnd, feedbackStart, feedbackEnd, actionPlanStart, actionPlanEnd } = req.body;
        if (!period || !selfStart || !selfEnd || !supervisorStart || !supervisorEnd || !feedbackStart || !feedbackEnd || !actionPlanStart || !actionPlanEnd) {
            return res.status(400).json({ error: 'All period fields are required' });
        }
        db.prepare(`INSERT OR REPLACE INTO period_configs (period, self_start, self_end, supervisor_start, supervisor_end, feedback_start, feedback_end, action_plan_start, action_plan_end)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(period, selfStart, selfEnd, supervisorStart, supervisorEnd, feedbackStart, feedbackEnd, actionPlanStart, actionPlanEnd);
        const config = db.prepare('SELECT * FROM period_configs WHERE period = ?').get(period);
        return res.json(config);
    }
    catch (err) {
        console.error('Create/update period error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
//# sourceMappingURL=periods.js.map