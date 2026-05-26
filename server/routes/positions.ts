import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

// ─── GET /api/positions ────────────────────────────────────────────────────
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const positions = await db.all('SELECT * FROM custom_positions');
    return res.json(positions);
  } catch (err) {
    console.error('List positions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/positions ────────────────────────────────────────────────────
router.post('/', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, label, level, practiceArea, basePosition } = req.body;
    if (!id || !label || !level || !basePosition) {
      return res.status(400).json({ error: 'id, label, level, and basePosition are required' });
    }
    const now = new Date().toISOString();
    await db.run('INSERT INTO custom_positions (id, label, level, practice_area, base_position, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, label, level, practiceArea || null, basePosition, now]);
    const position = await db.get('SELECT * FROM custom_positions WHERE id = ?', [id]);
    return res.status(201).json(position);
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Position ID already exists' });
    }
    console.error('Create position error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/positions/:id ──────────────────────────────────────────────
router.delete('/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const position = await db.get('SELECT * FROM custom_positions WHERE id = ?', [req.params.id]);
    if (!position) return res.status(404).json({ error: 'Position not found' });
    await db.run('DELETE FROM custom_positions WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Position deleted' });
  } catch (err) {
    console.error('Delete position error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
