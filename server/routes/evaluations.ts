import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, tx } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { logTimelineEvent } from './users.js';

const router = Router();

// Helper: fetch responses for given evaluation IDs
async function fetchResponses(evaluationIds: string[]) {
  if (evaluationIds.length === 0) return new Map<string, any[]>();
  const placeholders = evaluationIds.map(() => '?').join(',');
  const rows = await db.all(`SELECT * FROM evaluation_responses WHERE evaluation_id IN (${placeholders})`, evaluationIds);
  const map = new Map<string, any[]>();
  for (const r of rows) {
    if (!map.has(r.evaluation_id)) map.set(r.evaluation_id, []);
    map.get(r.evaluation_id)!.push(r);
  }
  return map;
}

// Helper: fetch NA approvals for given evaluation IDs
async function fetchNaApprovals(evaluationIds: string[]) {
  if (evaluationIds.length === 0) return new Map<string, any[]>();
  const placeholders = evaluationIds.map(() => '?').join(',');
  const rows = await db.all(`SELECT * FROM evaluation_na_approvals WHERE evaluation_id IN (${placeholders})`, evaluationIds);
  const map = new Map<string, any[]>();
  for (const r of rows) {
    if (!map.has(r.evaluation_id)) map.set(r.evaluation_id, []);
    map.get(r.evaluation_id)!.push(r);
  }
  return map;
}

// ─── GET /api/evaluations ────────────────────────────────────────────────
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { period, evaluatorId, evaluatedId, type } = req.query as Record<string, string>;
    let sql = 'SELECT * FROM evaluations WHERE 1=1';
    const params: string[] = [];
    if (period) { sql += ' AND period = ?'; params.push(period); }
    if (evaluatorId) { sql += ' AND evaluator_id = ?'; params.push(evaluatorId); }
    if (evaluatedId) { sql += ' AND evaluated_id = ?'; params.push(evaluatedId); }
    if (type) { sql += ' AND type = ?'; params.push(type); }

    const evaluations = await db.all(sql, params);
    const ids = evaluations.map((e: any) => e.id);
    const responsesMap = await fetchResponses(ids);
    const approvalsMap = await fetchNaApprovals(ids);

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
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const evaluation = await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
    if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });
    const responses = await db.all('SELECT * FROM evaluation_responses WHERE evaluation_id = ?', [req.params.id]);
    const naApprovals = await db.all('SELECT * FROM evaluation_na_approvals WHERE evaluation_id = ?', [req.params.id]);
    return res.json({ ...evaluation, responses, naApprovals });
  } catch (err) {
    console.error('Get evaluation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/evaluations ───────────────────────────────────────────────
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { evaluatorId, evaluatedId, period, type, comments, supervisorComments, responses } = req.body;
    if (!evaluatorId || !evaluatedId || !period || !type) {
      return res.status(400).json({ error: 'evaluatorId, evaluatedId, period, and type are required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    const respArr = responses || [];
    // Use totalScore from the frontend (weighted calculation with section weights, NA, etc.)
    // Fall back to simple average only if not provided
    const totalScore = req.body.totalScore !== undefined
      ? Number(req.body.totalScore)
      : (respArr.length > 0 ? respArr.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / respArr.length : 0);

    await db.transaction(async (conn) => {
      await tx.run(
        conn,
        `INSERT INTO evaluations (id, evaluator_id, evaluated_id, period, type, comments, supervisor_comments, total_score, completed_at, feedback_completed, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [id, evaluatorId, evaluatedId, period, type, comments || '', supervisorComments || null, Math.round(totalScore * 100) / 100, now, now]
      );
      for (const r of respArr) {
        await tx.run(
          conn,
          `INSERT INTO evaluation_responses (id, evaluation_id, question_id, score, not_applicable, no_elements, weight) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), id, r.questionId, r.score, r.notApplicable ? 1 : 0, r.noElements ? 1 : 0, r.weight || 1]
        );
      }
    });

    const evaluation = await db.get('SELECT * FROM evaluations WHERE id = ?', [id]);
    const evalResponses = await db.all('SELECT * FROM evaluation_responses WHERE evaluation_id = ?', [id]);
    return res.status(201).json({ ...evaluation, responses: evalResponses });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Evaluation already exists for this evaluator, evaluated, period, and type' });
    }
    console.error('Create evaluation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/evaluations/:id ───────────────────────────────────────────
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const evaluation = await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
    if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });

    const { comments, supervisorComments, totalScore, responses } = req.body;
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    const updates: string[] = [];
    const params: any[] = [];
    if (comments !== undefined) { updates.push('comments = ?'); params.push(comments); }
    if (supervisorComments !== undefined) { updates.push('supervisor_comments = ?'); params.push(supervisorComments); }
    if (totalScore !== undefined) { updates.push('total_score = ?'); params.push(totalScore); }
    updates.push('completed_at = ?'); params.push(now);

    if (responses && Array.isArray(responses)) {
      await db.transaction(async (conn) => {
        if (updates.length > 0) {
          await tx.run(conn, `UPDATE evaluations SET ${updates.join(', ')} WHERE id = ?`, [...params, req.params.id]);
        }
        await tx.run(conn, 'DELETE FROM evaluation_responses WHERE evaluation_id = ?', [req.params.id]);
        for (const r of responses) {
          await tx.run(
            conn,
            `INSERT INTO evaluation_responses (id, evaluation_id, question_id, score, not_applicable, no_elements, weight) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), req.params.id, r.questionId, r.score, r.notApplicable ? 1 : 0, r.noElements ? 1 : 0, r.weight || 1]
          );
        }
      });
    } else if (updates.length > 0) {
      await db.run(`UPDATE evaluations SET ${updates.join(', ')} WHERE id = ?`, [...params, req.params.id]);
    }

    const updated = await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
    const evalResponses = await db.all('SELECT * FROM evaluation_responses WHERE evaluation_id = ?', [req.params.id]);
    // Log evaluation completion to timeline
    if (updated && updated.completed_at) {
      const evalType = updated.type === 'self' ? 'self' : 'supervisor';
      await logTimelineEvent(updated.evaluated_id, 'evaluation_completed', {
        metadata: { period: updated.period, evalType, score: updated.total_score, evaluatorId: updated.evaluator_id },
        note: `${evalType === 'self' ? 'Autoevaluación' : 'Evaluación de supervisor'} completada — Periodo: ${updated.period}, Calificación: ${updated.total_score}%`,
        createdBy: req.user!.id
      });
    }
    return res.json({ ...updated, responses: evalResponses });
  } catch (err) {
    console.error('Update evaluation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/evaluations/:id/feedback ──────────────────────────────────
router.patch('/:id/feedback', authMiddleware, async (req: Request, res: Response) => {
  try {
    const evaluation = await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
    if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    await db.run('UPDATE evaluations SET feedback_completed = 1, feedback_completed_at = ?, feedback_completed_by = ? WHERE id = ?',
      [now, req.user!.id, req.params.id]);
    const updated = await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
    // Log feedback completion to timeline
    if (updated) {
      await logTimelineEvent(updated.evaluated_id, 'evaluation_completed', {
        metadata: { period: updated.period, evalType: 'feedback', score: updated.total_score },
        note: `Sesión de feedback completada — Periodo: ${updated.period}`,
        createdBy: req.user!.id
      });
    }
    return res.json(updated);
  } catch (err) {
    console.error('Feedback error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/evaluations/:id/na-approval ───────────────────────────────
router.patch('/:id/na-approval', authMiddleware, async (req: Request, res: Response) => {
  try {
    const evaluation = await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
    if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });
    const { questionId, approved } = req.body;
    if (!questionId) return res.status(400).json({ error: 'questionId is required' });

    // Use ON DUPLICATE KEY UPDATE with the approved column
    await db.run(
      `INSERT INTO evaluation_na_approvals (id, evaluation_id, question_id, approved, approved_by, approved_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE approved = VALUES(approved), approved_by = VALUES(approved_by), approved_at = VALUES(approved_at)`,
      [uuidv4(), req.params.id, questionId, approved ? 1 : 0, req.user!.id, new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')]
    );

    const approvals = await db.all('SELECT * FROM evaluation_na_approvals WHERE evaluation_id = ?', [req.params.id]);
    return res.json(approvals);
  } catch (err) {
    console.error('NA approval error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
