import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

// ─── GET /api/assignments ────────────────────────────────────────────────
router.get('/', authMiddleware, (req: Request, res: Response) => {
  try {
    const { period, employeeId, supervisorId } = req.query as {
      period?: string;
      employeeId?: string;
      supervisorId?: string;
    };

    let sql = 'SELECT * FROM supervisor_assignments WHERE 1=1';
    const params: string[] = [];

    if (period) {
      sql += ' AND period = ?';
      params.push(period);
    }
    if (employeeId) {
      sql += ' AND employee_id = ?';
      params.push(employeeId);
    }
    if (supervisorId) {
      sql += ' AND supervisor_id = ?';
      params.push(supervisorId);
    }

    const assignments = db.prepare(sql).all(...params);
    return res.json(assignments);
  } catch (err) {
    console.error('List assignments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/assignments ──────────────────────────────────────────────
router.post('/', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const { employeeId, supervisorId, period } = req.body as {
      employeeId?: string;
      supervisorId?: string;
      period?: string;
    };

    if (!employeeId || !supervisorId || !period) {
      return res.status(400).json({ error: 'employeeId, supervisorId, and period are required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO supervisor_assignments (id, employee_id, supervisor_id, period)
       VALUES (?, ?, ?, ?)`
    ).run(id, employeeId, supervisorId, period);

    const assignment = db.prepare('SELECT * FROM supervisor_assignments WHERE id = ?').get(id);
    return res.status(201).json(assignment);
  } catch (err: unknown) {
    // Handle unique constraint violation
    if (err instanceof Error && err.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Assignment already exists for this employee, supervisor, and period' });
    }
    console.error('Create assignment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/assignments/:id ─────────────────────────────────────────
router.delete('/:id', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const assignment = db.prepare('SELECT id FROM supervisor_assignments WHERE id = ?').get(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    db.prepare('DELETE FROM supervisor_assignments WHERE id = ?').run(id);

    return res.json({ message: 'Assignment deleted successfully' });
  } catch (err) {
    console.error('Delete assignment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
