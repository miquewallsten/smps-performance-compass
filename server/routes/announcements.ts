import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

function getUserLevel(user: any): string {
  const legalPositions = ['socio', 'salary_partner', 'counsel', 'asociado_sr', 'asociado_mid', 'asociado_jr', 'pasante_carrera', 'pasante_corporativo'];
  return legalPositions.includes(user.position) ? 'legal' : 'administrativo';
}

// ─── GET /api/announcements ───────────────────────────────────────────────
router.get('/', authMiddleware, (req: Request, res: Response) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    let sql = 'SELECT * FROM announcements WHERE 1=1';
    const params: any[] = [];
    if (!includeArchived) { sql += ' AND (archived = 0 OR archived IS NULL)'; }

    const announcements = db.prepare(sql).all(...params);
    const result = announcements.map((a: any) => {
      const readBy = db.prepare('SELECT user_id FROM announcement_reads WHERE announcement_id = ?').all(a.id).map((r: any) => r.user_id);
      return { ...a, readBy };
    }).filter((a: any) => {
      if (req.user!.role === 'admin' || req.user!.role === 'super_user') return true;
      if (a.audience === 'all') return true;
      const level = getUserLevel(req.user!);
      return a.audience === level;
    });
    return res.json(result);
  } catch (err) {
    console.error('List announcements error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/announcements ──────────────────────────────────────────────
router.post('/', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const { title, body, audience, expiresAt } = req.body;
    if (!title || !body || !audience) return res.status(400).json({ error: 'title, body, and audience required' });
    if (!['all', 'legal', 'administrativo'].includes(audience)) return res.status(400).json({ error: 'Invalid audience' });

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO announcements (id, author_id, title, body, audience, created_at, expires_at, archived) VALUES (?, ?, ?, ?, ?, ?, ?, 0)')
      .run(id, req.user!.id, title, body, audience, now, expiresAt || null);

    const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
    return res.status(201).json({ ...announcement, readBy: [] });
  } catch (err) {
    console.error('Create announcement error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/announcements/:id ──────────────────────────────────────────
router.patch('/:id', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
    if (!announcement) return res.status(404).json({ error: 'Announcement not found' });

    const { title, body, audience, expiresAt, archived } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (body !== undefined) { updates.push('body = ?'); params.push(body); }
    if (audience !== undefined) { updates.push('audience = ?'); params.push(audience); }
    if (expiresAt !== undefined) { updates.push('expires_at = ?'); params.push(expiresAt); }
    if (archived !== undefined) { updates.push('archived = ?'); params.push(archived ? 1 : 0); }

    if (updates.length > 0) {
      db.prepare(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`).run(...params, req.params.id);
    }

    const updated = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
    const readBy = db.prepare('SELECT user_id FROM announcement_reads WHERE announcement_id = ?').all(req.params.id).map((r: any) => r.user_id);
    return res.json({ ...updated, readBy });
  } catch (err) {
    console.error('Update announcement error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/announcements/:id/read ──────────────────────────────────────
router.post('/:id/read', authMiddleware, (req: Request, res: Response) => {
  try {
    const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
    if (!announcement) return res.status(404).json({ error: 'Announcement not found' });

    db.prepare('INSERT OR IGNORE INTO announcement_reads (announcement_id, user_id) VALUES (?, ?)')
      .run(req.params.id, req.user!.id);
    return res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
