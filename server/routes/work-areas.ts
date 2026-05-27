import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

// ─── GET /api/work-areas ──────────────────────────────────────────────────
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const areas = await db.all(
      `SELECT wa.*, 
        (SELECT COUNT(*) FROM custom_positions WHERE work_area_id = wa.id) AS position_count
       FROM work_areas wa ORDER BY wa.sort_order, wa.label`
    );
    // Attach positions for each area
    const areasWithPositions = await Promise.all(areas.map(async (area: any) => {
      const positions = await db.all(
        `SELECT cp.*, wa.label AS work_area_label, wa.level AS work_area_level
         FROM custom_positions cp
         JOIN work_areas wa ON cp.work_area_id = wa.id
         WHERE cp.work_area_id = ?
         ORDER BY cp.id`,
        [area.id]
      );
      return { ...area, positions };
    }));
    return res.json(areasWithPositions);
  } catch (err) {
    console.error('List work areas error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/work-areas ─────────────────────────────────────────────────
router.post('/', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, label, level, sortOrder } = req.body;
    if (!id || !label || !level) {
      return res.status(400).json({ error: 'id, label, and level are required' });
    }
    if (!['legal', 'administrativo'].includes(level)) {
      return res.status(400).json({ error: 'Level must be "legal" or "administrativo"' });
    }
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    await db.run(
      'INSERT INTO work_areas (id, label, level, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, label, level, sortOrder || 0, now, now]
    );
    const area = await db.get('SELECT * FROM work_areas WHERE id = ?', [id]);
    return res.status(201).json(area);
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Work area ID already exists' });
    }
    console.error('Create work area error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/work-areas/:id ────────────────────────────────────────────
router.patch('/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, level, sortOrder } = req.body;
    const area = await db.get('SELECT * FROM work_areas WHERE id = ?', [id]);
    if (!area) return res.status(404).json({ error: 'Work area not found' });

    const updates: string[] = [];
    const values: any[] = [];
    if (label !== undefined) { updates.push('label = ?'); values.push(label); }
    if (level !== undefined) {
      if (!['legal', 'administrativo'].includes(level)) {
        return res.status(400).json({ error: 'Level must be "legal" or "administrativo"' });
      }
      updates.push('level = ?'); values.push(level);
    }
    if (sortOrder !== undefined) { updates.push('sort_order = ?'); values.push(sortOrder); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = ?');
    values.push(new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''));
    values.push(id);
    await db.run(`UPDATE work_areas SET ${updates.join(', ')} WHERE id = ?`, values);

    const updated = await db.get('SELECT * FROM work_areas WHERE id = ?', [id]);
    return res.json(updated);
  } catch (err) {
    console.error('Update work area error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/work-areas/:id ───────────────────────────────────────────
router.delete('/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const area = await db.get('SELECT * FROM work_areas WHERE id = ?', [id]);
    if (!area) return res.status(404).json({ error: 'Work area not found' });

    const posCount = await db.get(
      'SELECT COUNT(*) AS cnt FROM custom_positions WHERE work_area_id = ?', [id]
    ) as any;
    if (posCount.cnt > 0) {
      return res.status(409).json({ error: `Cannot delete area with ${posCount.cnt} assigned position(s). Remove positions first.` });
    }

    await db.run('DELETE FROM work_areas WHERE id = ?', [id]);
    return res.json({ message: 'Work area deleted' });
  } catch (err) {
    console.error('Delete work area error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
