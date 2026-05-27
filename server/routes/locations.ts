import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

// ─── GET /api/locations ───────────────────────────────────────────────────
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const locations = await db.all(
      `SELECT l.*, 
        (SELECT COUNT(*) FROM users WHERE location_id = l.id) AS user_count
       FROM locations l ORDER BY l.sort_order, l.label`
    );
    return res.json(locations);
  } catch (err) {
    console.error('List locations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/locations ──────────────────────────────────────────────────
router.post('/', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, label, city, office, floor, desk, sortOrder } = req.body;
    if (!id || !label) {
      return res.status(400).json({ error: 'id and label are required' });
    }
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    await db.run(
      'INSERT INTO locations (id, label, city, office, floor, desk, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, label, city || null, office || null, floor || null, desk || null, sortOrder || 0, now, now]
    );
    const location = await db.get('SELECT * FROM locations WHERE id = ?', [id]);
    return res.status(201).json(location);
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Location ID already exists' });
    }
    console.error('Create location error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/locations/:id ─────────────────────────────────────────────
router.patch('/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, city, office, floor, desk, sortOrder } = req.body;
    const location = await db.get('SELECT * FROM locations WHERE id = ?', [id]);
    if (!location) return res.status(404).json({ error: 'Location not found' });

    const updates: string[] = [];
    const values: any[] = [];
    if (label !== undefined) { updates.push('label = ?'); values.push(label); }
    if (city !== undefined) { updates.push('city = ?'); values.push(city || null); }
    if (office !== undefined) { updates.push('office = ?'); values.push(office || null); }
    if (floor !== undefined) { updates.push('floor = ?'); values.push(floor || null); }
    if (desk !== undefined) { updates.push('desk = ?'); values.push(desk || null); }
    if (sortOrder !== undefined) { updates.push('sort_order = ?'); values.push(sortOrder); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = ?');
    values.push(new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''));
    values.push(id);
    await db.run(`UPDATE locations SET ${updates.join(', ')} WHERE id = ?`, values);

    const updated = await db.get('SELECT * FROM locations WHERE id = ?', [id]);
    return res.json(updated);
  } catch (err) {
    console.error('Update location error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/locations/:id ─────────────────────────────────────────────
router.delete('/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const location = await db.get('SELECT * FROM locations WHERE id = ?', [id]);
    if (!location) return res.status(404).json({ error: 'Location not found' });

    const userCount = await db.get(
      'SELECT COUNT(*) AS cnt FROM users WHERE location_id = ?', [id]
    ) as any;
    if (userCount.cnt > 0) {
      return res.status(409).json({ error: `Cannot delete location: ${userCount.cnt} user(s) assigned. Remove assignments first.` });
    }

    await db.run('DELETE FROM locations WHERE id = ?', [id]);
    return res.json({ message: 'Location deleted' });
  } catch (err) {
    console.error('Delete location error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
