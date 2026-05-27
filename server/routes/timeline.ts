import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

// Helper to check if user can access a timeline
function canAccessTimeline(requester: { id: string; role: string }, targetId: string): boolean {
  // User can always see their own timeline
  if (requester.id === targetId) return true;
  // Admins and super_users can see any user's timeline
  if (requester.role === 'admin' || requester.role === 'super_user') return true;
  return false;
}

// ─── GET /api/users/:id/timeline ──────────────────────────────────────────
router.get('/:id/timeline', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, from, to, limit, offset } = req.query as {
      type?: string;
      from?: string;
      to?: string;
      limit?: string;
      offset?: string;
    };

    if (!canAccessTimeline(req.user!, id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let sql = 'SELECT * FROM user_timeline WHERE user_id = ?';
    const params: unknown[] = [id];

    if (type) {
      const types = String(type).split(',');
      sql += ` AND event_type IN (${types.map(() => '?').join(',')})`;
      params.push(...types);
    }
    if (from) {
      sql += ' AND event_date >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND event_date <= ?';
      params.push(to);
    }

    sql += ' ORDER BY event_date DESC, created_at DESC';

    const limitNum = Math.min(parseInt(limit || '50', 10), 200);
    const offsetNum = parseInt(offset || '0', 10);
    sql += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offsetNum);

    const events = await db.all(sql, params);

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM user_timeline WHERE user_id = ?';
    const countParams: unknown[] = [id];
    if (type) {
      const types = String(type).split(',');
      countSql += ` AND event_type IN (${types.map(() => '?').join(',')})`;
      countParams.push(...types);
    }
    if (from) {
      countSql += ' AND event_date >= ?';
      countParams.push(from);
    }
    if (to) {
      countSql += ' AND event_date <= ?';
      countParams.push(to);
    }
    const { total } = await db.get(countSql, countParams) as { total: number };

    return res.json({ events, total, hasMore: (offsetNum + limitNum) < total });
  } catch (err) {
    console.error('Get timeline error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/users/:id/timeline ──────────────────────────────────────────
router.post('/:id/timeline', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { eventType, note, metadata, oldValue, newValue } = req.body as {
      eventType?: string;
      note?: string;
      metadata?: Record<string, unknown>;
      oldValue?: string;
      newValue?: string;
    };

    if (!eventType || !note) {
      return res.status(400).json({ error: 'eventType and note are required' });
    }

    const user = await db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    const eventId = uuidv4();

    await db.run(
      `INSERT INTO user_timeline (id, user_id, event_type, event_date, old_value, new_value, metadata, note, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        id,
        eventType,
        now,
        oldValue || null,
        newValue || null,
        metadata ? JSON.stringify(metadata) : null,
        note,
        req.user!.id,
        now,
        now
      ]
    );

    const event = await db.get('SELECT * FROM user_timeline WHERE id = ?', [eventId]);
    return res.status(201).json(event);
  } catch (err) {
    console.error('Create timeline event error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/users/:id/timeline/:eventId ──────────────────────────────────
router.patch('/:id/timeline/:eventId', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, eventId } = req.params;
    const { note } = req.body as { note?: string };

    if (!note) {
      return res.status(400).json({ error: 'note is required' });
    }

    const event = await db.get('SELECT * FROM user_timeline WHERE id = ?', [eventId]);
    if (!event) {
      return res.status(404).json({ error: 'Timeline event not found' });
    }

    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    await db.run('UPDATE user_timeline SET note = ?, updated_at = ? WHERE id = ?', [note, now, eventId]);

    const updated = await db.get('SELECT * FROM user_timeline WHERE id = ?', [eventId]);
    return res.json(updated);
  } catch (err) {
    console.error('Update timeline event error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/users/:id/timeline/:eventId ────────────────────────────────
// SuperUser only
router.delete('/:id/timeline/:eventId', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, eventId } = req.params;


    const event = await db.get('SELECT * FROM user_timeline WHERE id = ?', [eventId]);
    if (!event) {
      return res.status(404).json({ error: 'Timeline event not found' });
    }

    await db.run('DELETE FROM user_timeline WHERE id = ?', [eventId]);
    return res.json({ message: 'Timeline event deleted' });
  } catch (err) {
    console.error('Delete timeline event error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
