import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, tx } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ─── GET /api/action-plans ────────────────────────────────────────────────
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId, period } = req.query as Record<string, string>;
    let sql = 'SELECT * FROM action_plans WHERE 1=1';
    const params: string[] = [];
    if (employeeId) { sql += ' AND employee_id = ?'; params.push(employeeId); }
    if (period) { sql += ' AND period = ?'; params.push(period); }

    const plans = await db.all(sql, params);
    const result = [];
    for (const plan of plans) {
      const items = await db.all('SELECT * FROM smart_action_items WHERE action_plan_id = ?', [plan.id]);
      result.push({ ...plan, items });
    }
    return res.json(result);
  } catch (err) {
    console.error('List action plans error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/action-plans ──────────────────────────────────────────────
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId, supervisorId, period, content, items } = req.body;
    if (!employeeId || !supervisorId || !period) {
      return res.status(400).json({ error: 'employeeId, supervisorId, and period are required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    await db.transaction(async (conn) => {
      await tx.run(conn,
        `INSERT INTO action_plans (id, employee_id, supervisor_id, period, content, approval_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [id, employeeId, supervisorId, period, content || '', now, now]);
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await tx.run(conn,
            `INSERT INTO smart_action_items (id, action_plan_id, competencia, objetivo, acciones, que_evitar, fecha_revision, apoyos)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), id, item.competencia || '', item.objetivo || '', item.acciones || '', item.queEvitar || '', item.fechaRevision || '', item.apoyos || '']);
        }
      }
    });

    const plan = await db.get('SELECT * FROM action_plans WHERE id = ?', [id]);
    const planItems = await db.all('SELECT * FROM smart_action_items WHERE action_plan_id = ?', [id]);
    return res.status(201).json({ ...plan, items: planItems });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Action plan already exists for this employee and period' });
    }
    console.error('Create action plan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/action-plans/:id ──────────────────────────────────────────
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const plan = await db.get('SELECT * FROM action_plans WHERE id = ?', [req.params.id]);
    if (!plan) return res.status(404).json({ error: 'Action plan not found' });

    const { content, items } = req.body;
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    const updates: string[] = [];
    const params: any[] = [];

    if (content !== undefined) { updates.push('content = ?'); params.push(content); }
    updates.push('updated_at = ?'); params.push(now);

    if (items && Array.isArray(items)) {
      await db.transaction(async (conn) => {
        await tx.run(conn, `UPDATE action_plans SET ${updates.join(', ')} WHERE id = ?`, [...params, req.params.id]);
        await tx.run(conn, 'DELETE FROM smart_action_items WHERE action_plan_id = ?', [req.params.id]);
        for (const item of items) {
          await tx.run(conn,
            `INSERT INTO smart_action_items (id, action_plan_id, competencia, objetivo, acciones, que_evitar, fecha_revision, apoyos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), req.params.id, item.competencia || '', item.objetivo || '', item.acciones || '', item.queEvitar || '', item.fechaRevision || '', item.apoyos || '']);
        }
      });
    } else {
      await db.run(`UPDATE action_plans SET ${updates.join(', ')} WHERE id = ?`, [...params, req.params.id]);
    }

    const updated = await db.get('SELECT * FROM action_plans WHERE id = ?', [req.params.id]);
    const planItems = await db.all('SELECT * FROM smart_action_items WHERE action_plan_id = ?', [req.params.id]);
    return res.json({ ...updated, items: planItems });
  } catch (err) {
    console.error('Update action plan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/action-plans/:id/approve ────────────────────────────────────
router.post('/:id/approve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const plan = await db.get('SELECT * FROM action_plans WHERE id = ?', [req.params.id]);
    if (!plan) return res.status(404).json({ error: 'Action plan not found' });

    const { status, comments } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    await db.run('UPDATE action_plans SET approval_status = ?, approval_comments = ?, approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?',
      [status, comments || null, req.user!.id, now, now, req.params.id]);

    const updated = await db.get('SELECT * FROM action_plans WHERE id = ?', [req.params.id]);
    const planItems = await db.all('SELECT * FROM smart_action_items WHERE action_plan_id = ?', [req.params.id]);
    return res.json({ ...updated, items: planItems });
  } catch (err) {
    console.error('Approve action plan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
