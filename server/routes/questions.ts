import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

// ─── Library Questions ──────────────────────────────────────────────────────

router.get('/library', authMiddleware, (_req: Request, res: Response) => {
  try {
    const questions = db.prepare('SELECT * FROM library_questions').all();
    return res.json(questions);
  } catch (err) {
    console.error('List library questions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/library', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const { questionId, category, text, defaultWeight } = req.body;
    if (!questionId || !category || !text || !defaultWeight) {
      return res.status(400).json({ error: 'questionId, category, text, and defaultWeight are required' });
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO library_questions (id, question_id, category, text, default_weight, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, questionId, category, text, defaultWeight, now, req.user!.id);
    const question = db.prepare('SELECT * FROM library_questions WHERE id = ?').get(id);
    return res.status(201).json(question);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Question ID already exists' });
    }
    console.error('Create library question error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/library/:id', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const question = db.prepare('SELECT * FROM library_questions WHERE id = ?').get(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const { category, text, defaultWeight } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (text !== undefined) { updates.push('text = ?'); params.push(text); }
    if (defaultWeight !== undefined) { updates.push('default_weight = ?'); params.push(defaultWeight); }

    if (updates.length > 0) {
      db.prepare(`UPDATE library_questions SET ${updates.join(', ')} WHERE id = ?`).run(...params, req.params.id);
    }
    const updated = db.prepare('SELECT * FROM library_questions WHERE id = ?').get(req.params.id);
    return res.json(updated);
  } catch (err) {
    console.error('Update library question error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/library/:id', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM library_questions WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Question deleted' });
  } catch (err) {
    console.error('Delete library question error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Custom Questions ────────────────────────────────────────────────────────

router.get('/custom', authMiddleware, (req: Request, res: Response) => {
  try {
    const { position } = req.query as Record<string, string>;
    let sql = 'SELECT * FROM custom_eval_questions WHERE 1=1';
    const params: string[] = [];
    if (position) { sql += ' AND position = ?'; params.push(position); }
    const questions = db.prepare(sql).all(...params);
    return res.json(questions);
  } catch (err) {
    console.error('List custom questions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/custom', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const { position, questions } = req.body;
    if (!position) return res.status(400).json({ error: 'position is required' });
    if (!Array.isArray(questions)) return res.status(400).json({ error: 'questions array is required' });

    // Delete existing custom questions for this position, then insert new ones
    const deleteStmt = db.prepare('DELETE FROM custom_eval_questions WHERE position = ?');
    const insertStmt = db.prepare(
      'INSERT INTO custom_eval_questions (id, position, question_id, category, text, weight, section, practice_area) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    const transaction = db.transaction(() => {
      deleteStmt.run(position);
      for (const q of questions) {
        insertStmt.run(uuidv4(), position, q.questionId, q.category, q.text, q.weight, q.section || null, q.practiceArea || null);
      }
    });
    transaction();

    const result = db.prepare('SELECT * FROM custom_eval_questions WHERE position = ?').all(position);
    return res.json(result);
  } catch (err) {
    console.error('Set custom questions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Seed Question Overrides ────────────────────────────────────────────────

router.get('/overrides', authMiddleware, (_req: Request, res: Response) => {
  try {
    const overrides = db.prepare('SELECT * FROM seed_question_overrides').all();
    return res.json(overrides);
  } catch (err) {
    console.error('List overrides error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/overrides/:id', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const { text, category, weight, hidden } = req.body;
    const existing = db.prepare('SELECT * FROM seed_question_overrides WHERE question_id = ?').get(req.params.id);

    if (existing) {
      const updates: string[] = [];
      const params: any[] = [];
      if (text !== undefined) { updates.push('text = ?'); params.push(text); }
      if (category !== undefined) { updates.push('category = ?'); params.push(category); }
      if (weight !== undefined) { updates.push('weight = ?'); params.push(weight); }
      if (hidden !== undefined) { updates.push('hidden = ?'); params.push(hidden ? 1 : 0); }
      if (updates.length > 0) {
        db.prepare(`UPDATE seed_question_overrides SET ${updates.join(', ')} WHERE question_id = ?`).run(...params, req.params.id);
      }
    } else {
      db.prepare('INSERT INTO seed_question_overrides (question_id, text, category, weight, hidden) VALUES (?, ?, ?, ?, ?)')
        .run(req.params.id, text || null, category || null, weight || null, hidden ? 1 : 0);
    }

    const result = db.prepare('SELECT * FROM seed_question_overrides WHERE question_id = ?').get(req.params.id);
    return res.json(result);
  } catch (err) {
    console.error('Update override error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
