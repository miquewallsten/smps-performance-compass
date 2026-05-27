import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, tx } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

// ─── Library Questions ──────────────────────────────────────────────────────

router.get('/library', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const questions = await db.all('SELECT * FROM library_questions');
    return res.json(questions);
  } catch (err) {
    console.error('List library questions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/library', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { questionId, category, text, defaultWeight } = req.body;
    if (!questionId || !category || !text || !defaultWeight) {
      return res.status(400).json({ error: 'questionId, category, text, and defaultWeight are required' });
    }
    const id = uuidv4();
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    await db.run('INSERT INTO library_questions (id, question_id, category, text, default_weight, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, questionId, category, text, defaultWeight, now, req.user!.id]);
    const question = await db.get('SELECT * FROM library_questions WHERE id = ?', [id]);
    return res.status(201).json(question);
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Question ID already exists' });
    }
    console.error('Create library question error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/library/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const question = await db.get('SELECT * FROM library_questions WHERE id = ?', [req.params.id]);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const { category, text, defaultWeight } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (text !== undefined) { updates.push('text = ?'); params.push(text); }
    if (defaultWeight !== undefined) { updates.push('default_weight = ?'); params.push(defaultWeight); }

    if (updates.length > 0) {
      await db.run(`UPDATE library_questions SET ${updates.join(', ')} WHERE id = ?`, [...params, req.params.id]);
    }
    const updated = await db.get('SELECT * FROM library_questions WHERE id = ?', [req.params.id]);
    return res.json(updated);
  } catch (err) {
    console.error('Update library question error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/library/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.run('DELETE FROM library_questions WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Question deleted' });
  } catch (err) {
    console.error('Delete library question error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Custom Questions ────────────────────────────────────────────────────────

router.get('/custom', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { position } = req.query as Record<string, string>;
    let sql = 'SELECT * FROM custom_eval_questions WHERE 1=1';
    const params: string[] = [];
    if (position) { sql += ' AND position = ?'; params.push(position); }
    const questions = await db.all(sql, params);
    return res.json(questions);
  } catch (err) {
    console.error('List custom questions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/custom', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { position, questions } = req.body;
    if (!position) return res.status(400).json({ error: 'position is required' });
    if (!Array.isArray(questions)) return res.status(400).json({ error: 'questions array is required' });

    // Delete existing custom questions for this position, then insert new ones
    await db.transaction(async (conn) => {
      await tx.run(conn, 'DELETE FROM custom_eval_questions WHERE position = ?', [position]);
      for (const q of questions) {
        await tx.run(conn,
          'INSERT INTO custom_eval_questions (id, position, question_id, category, text, weight, section, practice_area) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), position, q.questionId, q.category, q.text, q.weight, q.section || null, q.practiceArea || null]);
      }
    });

    const result = await db.all('SELECT * FROM custom_eval_questions WHERE position = ?', [position]);
    return res.json(result);
  } catch (err) {
    console.error('Set custom questions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Seed Question Overrides ────────────────────────────────────────────────

router.get('/overrides', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const overrides = await db.all('SELECT * FROM seed_question_overrides');
    return res.json(overrides);
  } catch (err) {
    console.error('List overrides error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/overrides/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { text, category, weight, hidden } = req.body;
    const existing = await db.get('SELECT * FROM seed_question_overrides WHERE question_id = ?', [req.params.id]);

    if (existing) {
      const updates: string[] = [];
      const params: any[] = [];
      if (text !== undefined) { updates.push('text = ?'); params.push(text); }
      if (category !== undefined) { updates.push('category = ?'); params.push(category); }
      if (weight !== undefined) { updates.push('weight = ?'); params.push(weight); }
      if (hidden !== undefined) { updates.push('hidden = ?'); params.push(hidden ? 1 : 0); }
      if (updates.length > 0) {
        await db.run(`UPDATE seed_question_overrides SET ${updates.join(', ')} WHERE question_id = ?`, [...params, req.params.id]);
      }
    } else {
      await db.run('INSERT INTO seed_question_overrides (question_id, text, category, weight, hidden) VALUES (?, ?, ?, ?, ?)',
        [req.params.id, text || null, category || null, weight || null, hidden ? 1 : 0]);
    }

    const result = await db.get('SELECT * FROM seed_question_overrides WHERE question_id = ?', [req.params.id]);
    return res.json(result);
  } catch (err) {
    console.error('Update override error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
