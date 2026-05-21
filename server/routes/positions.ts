import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

// ─── GET /api/positions ────────────────────────────────────────────────────
router.get('/', authMiddleware, (_req: Request, res: Response) => {
  try {
    const positions = db.prepare('SELECT * FROM custom_positions').all();
    return res.json(positions);
  } catch (err) {
    console.error('List positions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/positions ────────────────────────────────────────────────────
router.post('/', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const { id, label, level, practiceArea, basePosition } = req.body;
    if (!id || !label || !level || !basePosition) {
      return res.status(400).json({ error: 'id, label, level, and basePosition are required' });
    }
    const now = new Date().toISOString();
    db.prepare('INSERT INTO custom_positions (id, label, level, practice_area, base_position, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, label, level, practiceArea || null, basePosition, now);
    const position = db.prepare('SELECT * FROM custom_positions WHERE id = ?').get(id);
    return res.status(201).json(position);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Position ID already exists' });
    }
    console.error('Create position error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/positions/:id ──────────────────────────────────────────────
router.delete('/:id', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const position = db.prepare('SELECT * FROM custom_positions WHERE id = ?').get(req.params.id);
    if (!position) return res.status(404).json({ error: 'Position not found' });
    db.prepare('DELETE FROM custom_positions WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Position deleted' });
  } catch (err) {
    console.error('Delete position error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
