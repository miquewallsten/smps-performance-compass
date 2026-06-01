import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, tx } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { isAdminOrSocio, isSupervisorOf, getSuperviseeIds, hasRole, normalizeRole, requireEntityAccess, requireSupervisorAction } from '../middleware/permissions.js';
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

/**
 * Filter evaluations based on user role.
 * Admin/socio: see all.
 * Employee with supervisor role: see own + supervisees'.
 * Regular employee: see only own (as evaluator or evaluated).
 */
async function filterEvaluationsForUser(evaluations: any[], userId: string, period?: string) {
  if (isAdminOrSocio({ id: userId, role: 'admin', email: '', name: '', position: '', isManagingPartner: false } as any)) {
    return evaluations; // admin/socio sees all
  }
  const superviseeIds = await getSuperviseeIds(userId, period);
  return evaluations.filter((e: any) => {
    // Own evaluations (self-eval or evaluated by user or evaluating user)
    if (e.evaluator_id === userId || e.evaluated_id === userId) return true;
    // Supervisor of the evaluated employee
    if (superviseeIds.includes(e.evaluated_id)) return true;
    return false;
  });
}

// ─── GET /api/evaluations/export/csv ──────────────────────────────────────
router.get('/export/csv', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { period } = req.query as Record<string, string>;
    if (!period) return res.status(400).json({ error: 'period query parameter is required' });

    // Verify user has permission (admin, super_user, or managing partner, or socio)
    const user = req.user!;
    const canExport = isAdminOrSocio(user);
    if (!canExport) {
      return res.status(403).json({ error: 'Admin, partner, or socio access required' });
    }

    const evaluations = await db.all(
      `SELECT e.id, e.evaluator_id, e.evaluated_id, e.type, e.total_score,
              e.comments, e.supervisor_comments, e.feedback_completed,
              ev.name as evaluated_name, ev.position as evaluated_position, ev.practice_area,
              er.name as evaluator_name, er.position as evaluator_position
       FROM evaluations e
       JOIN users ev ON ev.id = e.evaluated_id
       LEFT JOIN users er ON er.id = e.evaluator_id
       WHERE e.period = ? AND e.completed_at IS NOT NULL
       ORDER BY ev.name, e.type`,
      [period]
    );

    if (evaluations.length === 0) {
      return res.status(404).json({ error: 'No completed evaluations found for this period' });
    }

    const evalIds = evaluations.map((e: any) => e.id);
    const placeholders = evalIds.map(() => '?').join(',');
    const responses = await db.all(
      `SELECT er.evaluation_id, er.question_id, er.score, er.not_applicable, er.no_elements, er.weight
       FROM evaluation_responses er
       WHERE er.evaluation_id IN (${placeholders})`,
      evalIds
    );

    const naApprovals = await db.all(
      `SELECT na.evaluation_id, na.question_id, na.approved
       FROM evaluation_na_approvals na
       WHERE na.evaluation_id IN (${placeholders})`,
      evalIds
    );

    const naMap = new Map<string, boolean>();
    for (const na of naApprovals) {
      naMap.set(`${na.evaluation_id}::${na.question_id}`, na.approved === 1);
    }

    const posConfigRows = await db.all('SELECT position, label FROM position_config');
    const POSITION_LABELS_CSV: Record<string, string> = {};
    for (const row of posConfigRows) {
      POSITION_LABELS_CSV[row.position] = row.label;
    }
    const FALLBACK: Record<string, string> = {
      socio: 'Socio', salary_partner: 'Salary Partner', counsel: 'Counsel',
      asociado_sr: 'Asociado Sr', asociado_mid: 'Asociado Mid',
      asociado_jr: 'Asociado Jr', pasante_carrera: 'Pasante con Carrera', pasante: 'Pasante',
      director: 'Director', gerente: 'Gerente', coordinador: 'Coordinador',
      analista: 'Analista', asistente: 'Asistente', soporte: 'Soporte', archivista: 'Archivista',
    };
    for (const [k, v] of Object.entries(FALLBACK)) {
      if (!POSITION_LABELS_CSV[k]) POSITION_LABELS_CSV[k] = v;
    }

    // CSV generation (same as before)
    const headers = ['Empleado', 'Posición', 'Área', 'Tipo', 'Calificación (%)', 'Comentarios empleado', 'Comentarios supervisor'];
    const questionIds = [...new Set(responses.map((r: any) => r.question_id))];
    for (const qId of questionIds) {
      headers.push(`Pregunta ${qId}`);
    }

    const csvRows = [headers.join(',')];
    for (const evaluation of evaluations) {
      const row = [
        `"${evaluation.evaluated_name}"`,
        `"${POSITION_LABELS_CSV[evaluation.evaluated_position] || evaluation.evaluated_position}"`,
        `"${evaluation.practice_area || ''}"`,
        evaluation.type === 'self' ? 'Autoevaluación' : 'Supervisor',
        evaluation.total_score,
        `"${(evaluation.comments || '').replace(/"/g, '""')}"`,
        `"${(evaluation.supervisor_comments || '').replace(/"/g, '""')}"`,
      ];
      const evalResps = responses.filter((r: any) => r.evaluation_id === evaluation.id);
      for (const qId of questionIds) {
        const resp = evalResps.find((r: any) => r.question_id === qId);
        if (resp) {
          const isNA = resp.not_applicable && naMap.get(`${evaluation.id}::${qId}`);
          row.push(isNA ? 'N/A' : (resp.score !== null ? resp.score : ''));
        } else {
          row.push('');
        }
      }
      csvRows.push(row.join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="evaluations-${period}.csv"`);
    return res.send('\uFEFF' + csvRows.join('\n'));
  } catch (err) {
    console.error('CSV export error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/evaluations ────────────────────────────────────────────────
// AUTHZ: Employee sees own + supervisees'. Admin/socio sees all.
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { period, evaluatorId, evaluatedId, type } = req.query as Record<string, string>;
    let sql = 'SELECT * FROM evaluations WHERE 1=1';
    const params: string[] = [];
    if (period) { sql += ' AND period = ?'; params.push(period); }
    if (evaluatorId) { sql += ' AND evaluator_id = ?'; params.push(evaluatorId); }
    if (evaluatedId) { sql += ' AND evaluated_id = ?'; params.push(evaluatedId); }
    if (type) { sql += ' AND type = ?'; params.push(type); }

    let evaluations = await db.all(sql, params);

    // ─── Authorization filter ───
    if (!isAdminOrSocio(req.user!)) {
      const superviseeIds = await getSuperviseeIds(req.user!.id, period);
      evaluations = evaluations.filter((e: any) => {
        if (e.evaluator_id === req.user!.id || e.evaluated_id === req.user!.id) return true;
        if (superviseeIds.includes(e.evaluated_id)) return true;
        return false;
      });
    }

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
// AUTHZ: Must be owner (evaluator/evaluated), supervisor of evaluated, or admin/socio.
router.get('/:id', authMiddleware,
  requireEntityAccess({
    query: 'SELECT * FROM evaluations WHERE id = ?',
    allowSupervisor: true,
  }),
  async (req: Request, res: Response) => {
  try {
    const evaluation = (req as any)._entity || await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
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
// AUTHZ: Must be creating for self (evaluator=you or evaluated=you) or supervisor of evaluated, or admin/socio.
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { evaluatorId, evaluatedId, period, type, comments, supervisorComments, responses } = req.body;
    if (!evaluatorId || !evaluatedId || !period || !type) {
      return res.status(400).json({ error: 'evaluatorId, evaluatedId, period, and type are required' });
    }

    // ─── Authorization check ───
    if (!isAdminOrSocio(req.user!)) {
      const isOwner = (evaluatorId === req.user!.id || evaluatedId === req.user!.id);
      const isSup = !isOwner && await isSupervisorOf(req.user!.id, evaluatedId, period);
      if (!isOwner && !isSup) {
        return res.status(403).json({ error: 'You can only create evaluations for yourself or your direct reports' });
      }
    }

    const id = uuidv4();
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    const respArr = responses || [];
    const totalScore = req.body.totalScore !== undefined
      ? Number(req.body.totalScore)
      : (respArr.length > 0 ? respArr.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / respArr.length : 0);

    await db.transaction(async (conn) => {
      await tx.run(
        conn,
        `INSERT INTO evaluations (id, evaluator_id, evaluated_id, period, type, comments, supervisor_comments, total_score, completed_at, feedback_completed, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [id, evaluatorId, evaluatedId, period, type, comments || '', supervisorComments || null, Math.round(totalScore), now, now]
      );

      // Snapshot question data at evaluation creation time
      const questionIds = [...new Set(respArr.map((r: any) => r.questionId))];
      const questionSnapshots = new Map<string, { text: string; category: string; section: string }>();
      if (questionIds.length > 0) {
        const placeholders = questionIds.map(() => '?').join(',');
        const qRows = await tx.all(conn, `SELECT question_id, question_text, category, section FROM template_questions WHERE question_id IN (${placeholders})`, questionIds);
        for (const q of qRows as any[]) {
          questionSnapshots.set(q.question_id, { text: q.question_text, category: q.category, section: q.section });
        }
      }

      for (const r of respArr) {
        const snapshot = questionSnapshots.get(r.questionId) || { text: null, category: null, section: null };
        await tx.run(
          conn,
          `INSERT INTO evaluation_responses (id, evaluation_id, question_id, question_text, category, section, question_type, score, not_applicable, no_elements, weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), id, r.questionId, snapshot.text, snapshot.category, snapshot.section, snapshot.text ? 'seed' : null, r.score, r.notApplicable ? 1 : 0, r.noElements ? 1 : 0, Math.round(r.weight || 1)]
        );
      }
    });

    const evaluation = await db.get('SELECT * FROM evaluations WHERE id = ?', [id]);
    const evalResponses = await db.all('SELECT * FROM evaluation_responses WHERE evaluation_id = ?', [id]);
    const evalNaApprovals = await db.all('SELECT * FROM evaluation_na_approvals WHERE evaluation_id = ?', [id]);
    return res.json({ ...evaluation, responses: evalResponses, naApprovals: evalNaApprovals });
  } catch (err) {
    if ((err as any).code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Evaluation already exists for this evaluator, evaluated, period, and type' });
    }
    console.error('Create evaluation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/evaluations/:id ──────────────────────────────────────────────
// AUTHZ: Must be owner (evaluator/evaluated), supervisor of evaluated, or admin/socio.
router.put('/:id', authMiddleware,
  requireEntityAccess({
    query: 'SELECT * FROM evaluations WHERE id = ?',
    allowSupervisor: true,
  }),
  async (req: Request, res: Response) => {
  try {
    const evaluation = (req as any)._entity || await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
    if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });

    const { comments, supervisorComments, totalScore, responses } = req.body;
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    const updates: string[] = [];
    const params: any[] = [];
    if (comments !== undefined) { updates.push('comments = ?'); params.push(comments); }
    if (supervisorComments !== undefined) { updates.push('supervisor_comments = ?'); params.push(supervisorComments); }
    if (totalScore !== undefined) { updates.push('total_score = ?'); params.push(Math.round(totalScore)); }
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
            `INSERT INTO evaluation_responses (id, evaluation_id, question_id, question_text, category, section, question_type, score, not_applicable, no_elements, weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), req.params.id, r.questionId, null, null, null, null, r.score, r.notApplicable ? 1 : 0, r.noElements ? 1 : 0, Math.round(r.weight || 1)]
          );
        }
      });
    } else if (updates.length > 0) {
      await db.run(`UPDATE evaluations SET ${updates.join(', ')} WHERE id = ?`, [...params, req.params.id]);
    }

    const updated = await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
    const evalResponses = await db.all('SELECT * FROM evaluation_responses WHERE evaluation_id = ?', [req.params.id]);
    if (updated && updated.completed_at) {
      const evalType = updated.type === 'self' ? 'self' : 'supervisor';
      await logTimelineEvent(updated.evaluated_id, 'evaluation_completed', {
        metadata: { period: updated.period, evalType, score: updated.total_score, evaluatorId: updated.evaluator_id },
        note: `${evalType === 'self' ? 'Autoevaluación' : 'Evaluación de supervisor'} completada — Periodo: ${updated.period}, Calificación: ${updated.total_score}%`,
        createdBy: req.user!.id
      });
    }
    const evalNaApprovals = await db.all('SELECT * FROM evaluation_na_approvals WHERE evaluation_id = ?', [req.params.id]);
    return res.json({ ...updated, responses: evalResponses, naApprovals: evalNaApprovals });
  } catch (err) {
    console.error('Update evaluation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/evaluations/:id/feedback ──────────────────────────────────
// AUTHZ: Must be supervisor of the evaluated employee, or admin/super_user.
router.patch('/:id/feedback', authMiddleware,
  requireSupervisorAction({
    query: 'SELECT * FROM evaluations WHERE id = ?',
  }),
  async (req: Request, res: Response) => {
  try {
    const evaluation = (req as any)._entity || await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
    if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    await db.run('UPDATE evaluations SET feedback_completed = 1, feedback_completed_at = ?, feedback_completed_by = ? WHERE id = ?',
      [now, req.user!.id, req.params.id]);
    const updated = await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
    const evalResponses = await db.all('SELECT * FROM evaluation_responses WHERE evaluation_id = ?', [req.params.id]);
    const evalNaApprovals = await db.all('SELECT * FROM evaluation_na_approvals WHERE evaluation_id = ?', [req.params.id]);
    if (updated) {
      await logTimelineEvent(updated.evaluated_id, 'evaluation_completed', {
        metadata: { period: updated.period, evalType: 'feedback', score: updated.total_score },
        note: `Sesión de feedback completada — Periodo: ${updated.period}`,
        createdBy: req.user!.id
      });
    }
    return res.json({ ...updated, responses: evalResponses, naApprovals: evalNaApprovals });
  } catch (err) {
    console.error('Feedback error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/evaluations/:id/na-approval ───────────────────────────────
// AUTHZ: Must be supervisor of the evaluated employee, or admin/super_user.
router.patch('/:id/na-approval', authMiddleware,
  requireSupervisorAction({
    query: 'SELECT * FROM evaluations WHERE id = ?',
  }),
  async (req: Request, res: Response) => {
  try {
    const evaluation = (req as any)._entity || await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
    if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });
    const { questionId, approved } = req.body;
    if (!questionId) return res.status(400).json({ error: 'questionId is required' });

    await db.run(
      `INSERT INTO evaluation_na_approvals (id, evaluation_id, question_id, approved, approved_by, approved_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE approved = VALUES(approved), approved_by = VALUES(approved_by), approved_at = VALUES(approved_at)`,
      [uuidv4(), req.params.id, questionId, approved ? 1 : 0, req.user!.id, new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')]
    );

    const evalResponses = await db.all('SELECT * FROM evaluation_responses WHERE evaluation_id = ?', [req.params.id]);
    const allApprovals = await db.all('SELECT * FROM evaluation_na_approvals WHERE evaluation_id = ?', [req.params.id]);
    const updated = await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
    return res.json({ ...updated, responses: evalResponses, naApprovals: allApprovals });
  } catch (err) {
    console.error('NA approval error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
