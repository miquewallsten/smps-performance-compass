import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, tx } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { logTimelineEvent } from './users.js';

const router = Router();

// ─── GET /api/assignments ────────────────────────────────────────────────
router.get('/', authMiddleware, async (req: Request, res: Response) => {
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

    const assignments = await db.all(sql, params);
    return res.json(assignments);
  } catch (err) {
    console.error('List assignments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/assignments ──────────────────────────────────────────────
router.post('/', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
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

    await db.run(
      `INSERT INTO supervisor_assignments (id, employee_id, supervisor_id, period)
       VALUES (?, ?, ?, ?)`,
      [id, employeeId, supervisorId, period]
    );

    const assignment = await db.get('SELECT * FROM supervisor_assignments WHERE id = ?', [id]);
    // Log supervisor assignment to timeline
    const supervisor = await db.get('SELECT name FROM users WHERE id = ?', [supervisorId]) as Record<string, unknown> | undefined;
    await logTimelineEvent(employeeId, 'supervisor_assigned', {
      metadata: { supervisorName: supervisor?.name || supervisorId, period },
      note: `Asignado a supervisor: ${supervisor?.name || supervisorId} — Periodo: ${period}`,
      createdBy: req.user!.id
    });
    return res.status(201).json(assignment);
  } catch (err: any) {
    // Handle unique constraint violation
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Assignment already exists for this employee, supervisor, and period' });
    }
    console.error('Create assignment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/assignments/:id ─────────────────────────────────────────
router.delete('/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const assignment = await db.get('SELECT id FROM supervisor_assignments WHERE id = ?', [id]);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Get assignment details before deleting for timeline
    const assignmentDetails = await db.get('SELECT * FROM supervisor_assignments WHERE id = ?', [id]) as Record<string, unknown> | undefined;
    await db.run('DELETE FROM supervisor_assignments WHERE id = ?', [id]);
    // Log supervisor removal to timeline
    if (assignmentDetails) {
      const supervisor = await db.get('SELECT name FROM users WHERE id = ?', [assignmentDetails.supervisor_id]) as Record<string, unknown> | undefined;
      await logTimelineEvent(assignmentDetails.employee_id as string, 'supervisor_removed', {
        metadata: { supervisorName: supervisor?.name || assignmentDetails.supervisor_id, period: assignmentDetails.period },
        note: `Removido supervisor: ${supervisor?.name || assignmentDetails.supervisor_id} — Periodo: ${assignmentDetails.period}`,
        createdBy: req.user!.id
      });
    }
    return res.json({ message: 'Assignment deleted successfully' });
  } catch (err) {
    console.error('Delete assignment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
