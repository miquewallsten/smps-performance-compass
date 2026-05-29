import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

// ─── Library Questions (now uses question_library table) ──────────────────────

router.get('/library', authMiddleware, async (_req: Request, res: Response) => {
  try {
    // Query question_library (the canonical table) and include default_section and default_weight
    const questions = await db.all('SELECT id, question_id, category, default_section, default_weight, text, created_at, updated_at, created_by FROM question_library ORDER BY category, created_at');
    return res.json(questions);
  } catch (err) {
    console.error('List library questions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/library', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { category, text, defaultSection, defaultWeight } = req.body;
    const questionId = req.body.questionId || req.body.id;
    if (!category || !text) {
      return res.status(400).json({ error: 'category and text are required' });
    }
    const id = uuidv4();
    const qid = questionId || `lib-${category.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const weight = defaultWeight || 0;
    await db.run(
      'INSERT INTO question_library (id, question_id, category, default_section, default_weight, text, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)',
      [id, qid, category, defaultSection || null, weight, text, req.user!.id]
    );
    const question = await db.get('SELECT * FROM question_library WHERE id = ?', [id]);
    return res.status(201).json(question);
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Question ID already exists' });
    }
    console.error('Create library question error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/library/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { category, text, defaultSection, defaultWeight } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (text !== undefined) { updates.push('text = ?'); params.push(text); }
    if (defaultSection !== undefined) { updates.push('default_section = ?'); params.push(defaultSection); }
    if (defaultWeight !== undefined) { updates.push('default_weight = ?'); params.push(defaultWeight); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    await db.run(`UPDATE question_library SET ${updates.join(', ')} WHERE id = ?`, [...params, req.params.id]);
    
    // Sync changes to template_questions that reference this library question
    if (text !== undefined || category !== undefined) {
      const libQ = await db.get('SELECT * FROM question_library WHERE id = ?', [req.params.id]);
      if (libQ) {
        const syncUpdates: string[] = [];
        const syncParams: any[] = [];
        if (text !== undefined) { syncUpdates.push('question_text = ?'); syncParams.push(libQ.text); }
        if (category !== undefined) { syncUpdates.push('category = ?'); syncParams.push(libQ.category); }
        if (syncUpdates.length > 0) {
          await db.run(`UPDATE template_questions SET ${syncUpdates.join(', ')} WHERE library_question_id = ?`, [...syncParams, req.params.id]);
        }
      }
    }
    
    const updated = await db.get('SELECT * FROM question_library WHERE id = ?', [req.params.id]);
    return res.json(updated);
  } catch (err) {
    console.error('Update library question error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/library/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Check if this question is used in any template
    const usageCount = await db.getScalar<number>('SELECT COUNT(*) as cnt FROM template_questions WHERE library_question_id = ?', [req.params.id]);
    if (usageCount && usageCount > 0) {
      return res.status(409).json({ error: `Cannot delete: this question is used in ${usageCount} template(s). Remove it from templates first.` });
    }
    await db.run('DELETE FROM question_library WHERE id = ?', [req.params.id]);
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

    await db.transaction(async (conn) => {
      await db.tx.run(conn, 'DELETE FROM custom_eval_questions WHERE position = ?', [position]);
      for (const q of questions) {
        const questionId = q.questionId || q.id;
        if (!questionId) throw new Error('Each question must have an id or questionId');
        await db.tx.run(conn,
          'INSERT INTO custom_eval_questions (id, position, question_id, category, text, weight, section, practice_area) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), position, questionId, q.category, q.text, q.weight, q.section || null, q.practiceArea || null]);
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
