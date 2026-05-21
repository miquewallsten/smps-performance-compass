import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ─── GET /api/action-plans ────────────────────────────────────────────────
router.get('/', authMiddleware, (req: Request, res: Response) => {
  try {
    const { employeeId, period } = req.query as Record<string, string>;
    let sql = 'SELECT * FROM action_plans WHERE 1=1';
    const params: string[] = [];
    if (employeeId) { sql += ' AND employee_id = ?'; params.push(employeeId); }
    if (period) { sql += ' AND period = ?'; params.push(period); }

    const plans = db.prepare(sql).all(...params);
    const result = plans.map((plan: any) => {
      const items = db.prepare('SELECT * FROM smart_action_items WHERE action_plan_id = ?').all(plan.id);
      return { ...plan, items };
    });
    return res.json(result);
  } catch (err) {
    console.error('List action plans error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/action-plans ──────────────────────────────────────────────
router.post('/', authMiddleware, (req: Request, res: Response) => {
  try {
    const { employeeId, supervisorId, period, content, items } = req.body;
    if (!employeeId || !supervisorId || !period) {
      return res.status(400).json({ error: 'employeeId, supervisorId, and period are required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const insertPlan = db.prepare(
      `INSERT INTO action_plans (id, employee_id, supervisor_id, period, content, approval_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
    );
    const insertItem = db.prepare(
      `INSERT INTO smart_action_items (id, action_plan_id, competencia, objetivo, acciones, que_evitar, fecha_revision, apoyos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const transaction = db.transaction(() => {
      insertPlan.run(id, employeeId, supervisorId, period, content || '', now, now);
      if (items && Array.isArray(items)) {
        for (const item of items) {
          insertItem.run(uuidv4(), id, item.competencia || '', item.objetivo || '', item.acciones || '', item.queEvitar || '', item.fechaRevision || '', item.apoyos || '');
        }
      }
    });

    transaction();

    const plan = db.prepare('SELECT * FROM action_plans WHERE id = ?').get(id);
    const planItems = db.prepare('SELECT * FROM smart_action_items WHERE action_plan_id = ?').all(id);
    return res.status(201).json({ ...plan, items: planItems });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Action plan already exists for this employee and period' });
    }
    console.error('Create action plan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/action-plans/:id ──────────────────────────────────────────
router.patch('/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const plan = db.prepare('SELECT * FROM action_plans WHERE id = ?').get(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Action plan not found' });

    const { content, items } = req.body;
    const now = new Date().toISOString();
    const updates: string[] = [];
    const params: any[] = [];

    if (content !== undefined) { updates.push('content = ?'); params.push(content); }
    updates.push('updated_at = ?'); params.push(now);

    if (items && Array.isArray(items)) {
      const deleteItems = db.prepare('DELETE FROM smart_action_items WHERE action_plan_id = ?');
      const insertItem = db.prepare(
        `INSERT INTO smart_action_items (id, action_plan_id, competencia, objetivo, acciones, que_evitar, fecha_revision, apoyos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const t = db.transaction(() => {
        db.prepare(`UPDATE action_plans SET ${updates.join(', ')} WHERE id = ?`).run(...params, req.params.id);
        deleteItems.run(req.params.id);
        for (const item of items) {
          insertItem.run(uuidv4(), req.params.id, item.competencia || '', item.objetivo || '', item.acciones || '', item.queEvitar || '', item.fechaRevision || '', item.apoyos || '');
        }
      });
      t();
    } else {
      db.prepare(`UPDATE action_plans SET ${updates.join(', ')} WHERE id = ?`).run(...params, req.params.id);
    }

    const updated = db.prepare('SELECT * FROM action_plans WHERE id = ?').get(req.params.id);
    const planItems = db.prepare('SELECT * FROM smart_action_items WHERE action_plan_id = ?').all(req.params.id);
    return res.json({ ...updated, items: planItems });
  } catch (err) {
    console.error('Update action plan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/action-plans/:id/approve ────────────────────────────────────
router.post('/:id/approve', authMiddleware, (req: Request, res: Response) => {
  try {
    const plan = db.prepare('SELECT * FROM action_plans WHERE id = ?').get(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Action plan not found' });

    const { status, comments } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE action_plans SET approval_status = ?, approval_comments = ?, approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?')
      .run(status, comments || null, req.user!.id, now, now, req.params.id);

    const updated = db.prepare('SELECT * FROM action_plans WHERE id = ?').get(req.params.id);
    const planItems = db.prepare('SELECT * FROM smart_action_items WHERE action_plan_id = ?').all(req.params.id);
    return res.json({ ...updated, items: planItems });
  } catch (err) {
    console.error('Approve action plan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
