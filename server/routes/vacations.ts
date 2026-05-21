import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

// ─── GET /api/vacations/requests ───────────────────────────────────────────
router.get('/requests', authMiddleware, (req: Request, res: Response) => {
  try {
    const { userId, status } = req.query as Record<string, string>;
    let sql = 'SELECT * FROM vacation_requests WHERE 1=1';
    const params: string[] = [];
    if (userId) { sql += ' AND user_id = ?'; params.push(userId); }
    if (status) { sql += ' AND status = ?'; params.push(status); }

    const requests = db.prepare(sql).all(...params);
    const result = requests.map((r: any) => {
      const approvals = db.prepare('SELECT * FROM vacation_approvals WHERE vacation_request_id = ?').all(r.id);
      return { ...r, approvals };
    });
    return res.json(result);
  } catch (err) {
    console.error('List vacation requests error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/vacations/requests ──────────────────────────────────────────
router.post('/requests', authMiddleware, (req: Request, res: Response) => {
  try {
    const { userId, startDate, endDate, days, reason, period } = req.body;
    if (!userId || !startDate || !endDate || !days) {
      return res.status(400).json({ error: 'userId, startDate, endDate, and days are required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO vacation_requests (id, user_id, start_date, end_date, days, reason, status, created_at, period) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, userId, startDate, endDate, days, reason || '', 'pending', now, period || null);

    const request = db.prepare('SELECT * FROM vacation_requests WHERE id = ?').get(id);
    return res.status(201).json({ ...request, approvals: [] });
  } catch (err) {
    console.error('Create vacation request error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/vacations/requests/:id ──────────────────────────────────────
router.patch('/requests/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const request = db.prepare('SELECT * FROM vacation_requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const { status, reason } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (reason !== undefined) { updates.push('reason = ?'); params.push(reason); }

    if (updates.length > 0) {
      db.prepare(`UPDATE vacation_requests SET ${updates.join(', ')} WHERE id = ?`).run(...params, req.params.id);
    }

    const updated = db.prepare('SELECT * FROM vacation_requests WHERE id = ?').get(req.params.id);
    const approvals = db.prepare('SELECT * FROM vacation_approvals WHERE vacation_request_id = ?').all(req.params.id);
    return res.json({ ...updated, approvals });
  } catch (err) {
    console.error('Update vacation request error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/vacations/requests/:id/approve ───────────────────────────────
router.post('/requests/:id/approve', authMiddleware, (req: Request, res: Response) => {
  try {
    const request = db.prepare('SELECT * FROM vacation_requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const { action, comment } = req.body;
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approved or rejected' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO vacation_approvals (id, vacation_request_id, approver_id, approved_at, action, comment) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, req.params.id, req.user!.id, now, action, comment || null);

    db.prepare('UPDATE vacation_requests SET status = ? WHERE id = ?').run(action, req.params.id);

    const updated = db.prepare('SELECT * FROM vacation_requests WHERE id = ?').get(req.params.id);
    const approvals = db.prepare('SELECT * FROM vacation_approvals WHERE vacation_request_id = ?').all(req.params.id);
    return res.json({ ...updated, approvals });
  } catch (err) {
    console.error('Approve vacation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/vacations/requests/:id ──────────────────────────────────────
router.delete('/requests/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const request = db.prepare('SELECT * FROM vacation_requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if ((request as any).user_id !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'super_user') {
      return res.status(403).json({ error: 'Can only delete your own requests' });
    }
    if ((request as any).status !== 'pending' && req.user!.role !== 'admin' && req.user!.role !== 'super_user') {
      return res.status(400).json({ error: 'Can only delete pending requests' });
    }
    db.prepare('DELETE FROM vacation_requests WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Request deleted' });
  } catch (err) {
    console.error('Delete vacation request error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/vacations/config ──────────────────────────────────────────────
router.get('/config', authMiddleware, requireAdmin, (_req: Request, res: Response) => {
  try {
    const config = db.prepare('SELECT * FROM vacation_config').all();
    return res.json(config);
  } catch (err) {
    console.error('Get vacation config error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/vacations/config ─────────────────────────────────────────────
router.patch('/config', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const { positions } = req.body;
    if (!Array.isArray(positions)) return res.status(400).json({ error: 'positions array required' });

    for (const p of positions) {
      db.prepare('INSERT OR REPLACE INTO vacation_config (position, days) VALUES (?, ?)').run(p.position, p.days);
    }

    const config = db.prepare('SELECT * FROM vacation_config').all();
    return res.json(config);
  } catch (err) {
    console.error('Update vacation config error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/vacations/extra-days ──────────────────────────────────────────
router.post('/extra-days', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const { userId, days, reason, period } = req.body;
    if (!userId || !days || !reason || !period) {
      return res.status(400).json({ error: 'userId, days, reason, and period are required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO extra_vacation_days (id, user_id, days, reason, added_by, added_at, period) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, userId, days, reason, req.user!.id, now, period);

    const extra = db.prepare('SELECT * FROM extra_vacation_days WHERE id = ?').get(id);
    return res.status(201).json(extra);
  } catch (err) {
    console.error('Add extra days error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
