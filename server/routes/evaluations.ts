import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Helper: fetch responses for given evaluation IDs
function fetchResponses(evaluationIds: string[]) {
  if (evaluationIds.length === 0) return new Map<string, any[]>();
  const placeholders = evaluationIds.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM evaluation_responses WHERE evaluation_id IN (${placeholders})`).all(...evaluationIds);
  const map = new Map<string, any[]>();
  for (const r of rows) {
    if (!map.has(r.evaluation_id)) map.set(r.evaluation_id, []);
    map.get(r.evaluation_id)!.push(r);
  }
  return map;
}

// Helper: fetch NA approvals for given evaluation IDs
function fetchNaApprovals(evaluationIds: string[]) {
  if (evaluationIds.length === 0) return new Map<string, any[]>();
  const placeholders = evaluationIds.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM evaluation_na_approvals WHERE evaluation_id IN (${placeholders})`).all(...evaluationIds);
  const map = new Map<string, any[]>();
  for (const r of rows) {
    if (!map.has(r.evaluation_id)) map.set(r.evaluation_id, []);
    map.get(r.evaluation_id)!.push(r);
  }
  return map;
}

// ─── GET /api/evaluations ────────────────────────────────────────────────
router.get('/', authMiddleware, (req: Request, res: Response) => {
  try {
    const { period, evaluatorId, evaluatedId, type } = req.query as Record<string, string>;
    let sql = 'SELECT * FROM evaluations WHERE 1=1';
    const params: string[] = [];
    if (period) { sql += ' AND period = ?'; params.push(period); }
    if (evaluatorId) { sql += ' AND evaluator_id = ?'; params.push(evaluatorId); }
    if (evaluatedId) { sql += ' AND evaluated_id = ?'; params.push(evaluatedId); }
    if (type) { sql += ' AND type = ?'; params.push(type); }

    const evaluations = db.prepare(sql).all(...params);
    const ids = evaluations.map((e: any) => e.id);
    const responsesMap = fetchResponses(ids);
    const approvalsMap = fetchNaApprovals(ids);

    const result = evaluations.map((e: any) => ({
      ...e,
      responses: responsesMap.get(e.id) || [],
      naApprovals: approvalsMap.get(e.id) || [],
    }));
    return res.json(result);
  } catch (err) {
    console.error('List evaluations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/evaluations/:id ──────────────────────────────────────────────
router.get('/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const evaluation = db.prepare('SELECT * FROM evaluations WHERE id = ?').get(req.params.id);
    if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });
    const responses = db.prepare('SELECT * FROM evaluation_responses WHERE evaluation_id = ?').all(req.params.id);
    const naApprovals = db.prepare('SELECT * FROM evaluation_na_approvals WHERE evaluation_id = ?').all(req.params.id);
    return res.json({ ...evaluation, responses, naApprovals });
  } catch (err) {
    console.error('Get evaluation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/evaluations ───────────────────────────────────────────────
router.post('/', authMiddleware, (req: Request, res: Response) => {
  try {
    const { evaluatorId, evaluatedId, period, type, comments, responses } = req.body;
    if (!evaluatorId || !evaluatedId || !period || !type) {
      return res.status(400).json({ error: 'evaluatorId, evaluatedId, period, and type are required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const respArr = responses || [];
    const totalScore = respArr.length > 0 ? respArr.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / respArr.length : 0;

    const insertEval = db.prepare(
      `INSERT INTO evaluations (id, evaluator_id, evaluated_id, period, type, comments, supervisor_comments, total_score, completed_at, feedback_completed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    );

    const insertResp = db.prepare(
      `INSERT INTO evaluation_responses (id, evaluation_id, question_id, score, not_applicable, no_elements)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    const transaction = db.transaction(() => {
      insertEval.run(id, evaluatorId, evaluatedId, period, type, comments || '', null, Math.round(totalScore * 100) / 100, now, now);
      for (const r of respArr) {
        insertResp.run(uuidv4(), id, r.questionId, r.score, r.notApplicable ? 1 : 0, r.noElements ? 1 : 0);
      }
    });

    transaction();

    const evaluation = db.prepare('SELECT * FROM evaluations WHERE id = ?').get(id);
    const evalResponses = db.prepare('SELECT * FROM evaluation_responses WHERE evaluation_id = ?').all(id);
    return res.status(201).json({ ...evaluation, responses: evalResponses });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Evaluation already exists for this evaluator, evaluated, period, and type' });
    }
    console.error('Create evaluation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/evaluations/:id ───────────────────────────────────────────
router.patch('/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const evaluation = db.prepare('SELECT * FROM evaluations WHERE id = ?').get(req.params.id);
    if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });

    const { comments, supervisorComments, totalScore, responses } = req.body;
    const now = new Date().toISOString();

    const updates: string[] = [];
    const params: any[] = [];
    if (comments !== undefined) { updates.push('comments = ?'); params.push(comments); }
    if (supervisorComments !== undefined) { updates.push('supervisor_comments = ?'); params.push(supervisorComments); }
    if (totalScore !== undefined) { updates.push('total_score = ?'); params.push(totalScore); }
    updates.push('completed_at = ?'); params.push(now);

    if (responses && Array.isArray(responses)) {
      const deleteResps = db.prepare('DELETE FROM evaluation_responses WHERE evaluation_id = ?');
      const insertResp = db.prepare(
        `INSERT INTO evaluation_responses (id, evaluation_id, question_id, score, not_applicable, no_elements) VALUES (?, ?, ?, ?, ?, ?)`
      );
      const t = db.transaction(() => {
        if (updates.length > 0) {
          db.prepare(`UPDATE evaluations SET ${updates.join(', ')} WHERE id = ?`).run(...params, req.params.id);
        }
        deleteResps.run(req.params.id);
        for (const r of responses) {
          insertResp.run(uuidv4(), req.params.id, r.questionId, r.score, r.notApplicable ? 1 : 0, r.noElements ? 1 : 0);
        }
      });
      t();
    } else if (updates.length > 0) {
      db.prepare(`UPDATE evaluations SET ${updates.join(', ')} WHERE id = ?`).run(...params, req.params.id);
    }

    const updated = db.prepare('SELECT * FROM evaluations WHERE id = ?').get(req.params.id);
    const evalResponses = db.prepare('SELECT * FROM evaluation_responses WHERE evaluation_id = ?').all(req.params.id);
    return res.json({ ...updated, responses: evalResponses });
  } catch (err) {
    console.error('Update evaluation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/evaluations/:id/feedback ──────────────────────────────────
router.patch('/:id/feedback', authMiddleware, (req: Request, res: Response) => {
  try {
    const evaluation = db.prepare('SELECT * FROM evaluations WHERE id = ?').get(req.params.id);
    if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });
    const now = new Date().toISOString();
    db.prepare('UPDATE evaluations SET feedback_completed = 1, feedback_completed_at = ?, feedback_completed_by = ? WHERE id = ?')
      .run(now, req.user!.id, req.params.id);
    const updated = db.prepare('SELECT * FROM evaluations WHERE id = ?').get(req.params.id);
    return res.json(updated);
  } catch (err) {
    console.error('Feedback error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/evaluations/:id/na-approval ───────────────────────────────
router.patch('/:id/na-approval', authMiddleware, (req: Request, res: Response) => {
  try {
    const evaluation = db.prepare('SELECT * FROM evaluations WHERE id = ?').get(req.params.id);
    if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });
    const { questionId, approved } = req.body;
    if (!questionId) return res.status(400).json({ error: 'questionId is required' });
    db.prepare('INSERT OR REPLACE INTO evaluation_na_approvals (evaluation_id, question_id, approved) VALUES (?, ?, ?)')
      .run(req.params.id, questionId, approved ? 1 : 0);
    const approvals = db.prepare('SELECT * FROM evaluation_na_approvals WHERE evaluation_id = ?').all(req.params.id);
    return res.json(approvals);
  } catch (err) {
    console.error('NA approval error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
