import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

// ─── GET /api/positions ────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { work_area_id } = req.query;
    let sql = `SELECT cp.*, wa.label AS work_area_label, wa.level AS work_area_level
               FROM custom_positions cp
               JOIN work_areas wa ON cp.work_area_id = wa.id`;
    const params: any[] = [];
    if (work_area_id) {
      sql += ' WHERE cp.work_area_id = ?';
      params.push(work_area_id);
    }
    sql += ' ORDER BY cp.id';
    const positions = await db.all(sql, params);
    return res.json(positions);
  } catch (err) {
    console.error('List positions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/positions/:id ───────────────────────────────────────────────
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const position = await db.get(
      `SELECT cp.*, wa.label AS work_area_label, wa.level AS work_area_level
       FROM custom_positions cp
       JOIN work_areas wa ON cp.work_area_id = wa.id
       WHERE cp.id = ?`,
      [req.params.id]
    );
    if (!position) return res.status(404).json({ error: 'Position not found' });
    return res.json(position);
  } catch (err) {
    console.error('Get position error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/positions ────────────────────────────────────────────────────
router.post('/', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, label, workAreaId, basePosition } = req.body;
    if (!id || !label || !workAreaId || !basePosition) {
      return res.status(400).json({ error: 'id, label, workAreaId, and basePosition are required' });
    }
    // Validate work area exists
    const area = await db.get('SELECT id FROM work_areas WHERE id = ?', [workAreaId]);
    if (!area) return res.status(400).json({ error: 'Work area not found' });

    const now = new Date().toISOString();
    await db.run(
      'INSERT INTO custom_positions (id, label, work_area_id, base_position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, label, workAreaId, basePosition, now, now]
    );
    const position = await db.get(
      `SELECT cp.*, wa.label AS work_area_label, wa.level AS work_area_level
       FROM custom_positions cp JOIN work_areas wa ON cp.work_area_id = wa.id WHERE cp.id = ?`,
      [id]
    );
    return res.status(201).json(position);
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Position ID already exists' });
    }
    console.error('Create position error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/positions/:id ──────────────────────────────────────────────
router.patch('/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, workAreaId, basePosition, newId } = req.body;

    const position = await db.get('SELECT * FROM custom_positions WHERE id = ?', [id]);
    if (!position) return res.status(404).json({ error: 'Position not found' });

    // Block CVE change if users are assigned
    if (newId && newId !== id) {
      const userCount = await db.get(
        'SELECT COUNT(*) AS cnt FROM users WHERE custom_position_id = ?', [id]
      ) as any;
      if (userCount.cnt > 0) {
        return res.status(409).json({ error: `Cannot change CVE: ${userCount.cnt} user(s) assigned to this position. Remove assignments first.` });
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (newId && newId !== id) { updates.push('id = ?'); values.push(newId); }
    if (label !== undefined) { updates.push('label = ?'); values.push(label); }
    if (workAreaId !== undefined) {
      const area = await db.get('SELECT id FROM work_areas WHERE id = ?', [workAreaId]);
      if (!area) return res.status(400).json({ error: 'Work area not found' });
      updates.push('work_area_id = ?'); values.push(workAreaId);
    }
    if (basePosition !== undefined) { updates.push('base_position = ?'); values.push(basePosition); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.run(`UPDATE custom_positions SET ${updates.join(', ')} WHERE id = ?`, values);

    const finalId = (newId && newId !== id) ? newId : id;
    const updated = await db.get(
      `SELECT cp.*, wa.label AS work_area_label, wa.level AS work_area_level
       FROM custom_positions cp JOIN work_areas wa ON cp.work_area_id = wa.id WHERE cp.id = ?`,
      [finalId]
    );

    // If CVE changed, update users who reference the old CVE
    if (newId && newId !== id) {
      await db.run('UPDATE users SET custom_position_id = ? WHERE custom_position_id = ?', [newId, id]);
    }

    return res.json(updated);
  } catch (err) {
    console.error('Update position error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/positions/:id ──────────────────────────────────────────────
router.delete('/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const position = await db.get('SELECT * FROM custom_positions WHERE id = ?', [req.params.id]);
    if (!position) return res.status(404).json({ error: 'Position not found' });

    const userCount = await db.get(
      'SELECT COUNT(*) AS cnt FROM users WHERE custom_position_id = ?', [req.params.id]
    ) as any;
    if (userCount.cnt > 0) {
      return res.status(409).json({ error: `Cannot delete position: ${userCount.cnt} user(s) assigned. Remove assignments first.` });
    }

    await db.run('DELETE FROM custom_positions WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Position deleted' });
  } catch (err) {
    console.error('Delete position error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
