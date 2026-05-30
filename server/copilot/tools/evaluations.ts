/**
 * Tool: evaluations — List, score, complete evaluations; manage questions and action plans.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/connection.js';
import { Tool } from '../types.js';
import { getLatestPeriod } from './helpers.js';

export const evaluationsTool: Tool = {
  name: 'evaluations',
  description: `Evaluaciones de desempeño. Acciones:
- list: evaluaciones de un periodo
- get: detalle de una evaluación con respuestas
- set_score: calificar una pregunta (1-5)
- complete_eval: completar evaluación
- complete_feedback: completar sesión de feedback
- update_comments: actualizar comentarios
- questions: preguntas de una posición o biblioteca
- create_question: crear pregunta en biblioteca
- batch_questions: crear múltiples preguntas
- update_question: actualizar pregunta (texto, peso, categoría)
- delete_question: eliminar/ocultar pregunta
- list_library: preguntas de la biblioteca
- supervisor_assignments: asignaciones de supervisores
- action_plan: planes de acción
- personal_objectives: objetivos personales`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'get', 'set_score', 'complete_eval', 'complete_feedback', 'update_comments', 'questions', 'create_question', 'batch_questions', 'update_question', 'delete_question', 'list_library', 'supervisor_assignments', 'action_plan', 'personal_objectives'] },
      period: { type: 'string' }, id: { type: 'string' }, evaluated_id: { type: 'string' },
      question_id: { type: 'string' }, score: { type: 'number' }, text: { type: 'string' },
      category: { type: 'string' }, weight: { type: 'string' }, hidden: { type: 'string' },
      questions: { type: 'array', items: { type: 'object' } },
      position: { type: 'string' }, comments: { type: 'string' },
    },
    required: ['action'],
  },
  execute: async (args, uid, _cfg) => {
    const act = args.action as string;
    const period = (args.period as string) || await getLatestPeriod();
    try {
      if (act === 'list') {
        return JSON.stringify(await db.all(
          'SELECT e.*, eu.name as evaluated_name, er.name as evaluator_name FROM evaluations e JOIN users eu ON e.evaluated_id=eu.id LEFT JOIN users er ON e.evaluator_id=er.id WHERE e.period=? ORDER BY eu.name, e.type',
          [period]));
      }
      if (act === 'get') {
        if (!args.id) return JSON.stringify({ error: 'Falta id' });
        const ev = await db.get('SELECT * FROM evaluations WHERE id=?', [args.id]);
        if (!ev) return JSON.stringify({ error: 'No encontrada' });
        const responses = await db.all('SELECT * FROM evaluation_responses WHERE evaluation_id=?', [args.id]);
        const naApprovals = await db.all('SELECT * FROM evaluation_na_approvals WHERE evaluation_id=?', [args.id]);
        return JSON.stringify({ ...ev, responses, naApprovals });
      }
      if (act === 'set_score') {
        if (!args.id || !args.question_id || args.score === undefined) return JSON.stringify({ error: 'Falta id, question_id, score' });
        const score = Math.min(5, Math.max(1, Number(args.score)));
        await db.run('INSERT INTO evaluation_responses (id,evaluation_id,question_id,score,not_applicable,no_elements,weight) VALUES(?,?,?,?,0,0,1) ON DUPLICATE KEY UPDATE score=VALUES(score)',
          [uuidv4(), args.id, args.question_id, score]);
        return JSON.stringify({ ok: true, msg: `Pregunta ${args.question_id} calificada con ${score}` });
      }
      if (act === 'complete_eval') {
        if (!args.id) return JSON.stringify({ error: 'Falta id' });
        await db.run('UPDATE evaluations SET completed_at=?, total_score=(SELECT COALESCE(SUM(score*weight),0) FROM evaluation_responses WHERE evaluation_id=?) WHERE id=?',
          [new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), args.id, args.id]);
        return JSON.stringify({ ok: true, msg: 'Evaluación completada' });
      }
      if (act === 'complete_feedback') {
        if (!args.id) return JSON.stringify({ error: 'Falta id' });
        await db.run('UPDATE evaluations SET feedback_completed=1, feedback_completed_at=?, feedback_completed_by=? WHERE id=?',
          [new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), uid, args.id]);
        return JSON.stringify({ ok: true, msg: 'Feedback completado' });
      }
      if (act === 'update_comments') {
        if (!args.id) return JSON.stringify({ error: 'Falta id' });
        const updates: string[] = [];
        const vals: unknown[] = [];
        if (args.comments !== undefined) { updates.push('comments=?'); vals.push(args.comments); }
        if (updates.length === 0) return JSON.stringify({ error: 'Sin cambios' });
        vals.push(args.id);
        await db.run(`UPDATE evaluations SET ${updates.join(', ')} WHERE id=?`, vals);
        return JSON.stringify({ ok: true, msg: 'Comentarios actualizados' });
      }
      if (act === 'questions') {
        if (args.position) {
          const template = await db.all('SELECT question_id, category, question_text as text, weight, section, practice_area, is_active FROM template_questions WHERE position=? ORDER BY section, category, sort_order', [args.position]);
          return JSON.stringify({ template, position: args.position });
        }
        const lib = await db.all('SELECT question_id, category, text, default_weight, default_section FROM question_library ORDER BY category');
        return JSON.stringify({ library: lib });
      }
      if (act === 'create_question') {
        if (!args.text || !args.category) return JSON.stringify({ error: 'Falta text y category' });
        const id = uuidv4(), qid = args.question_id || 'q_' + Date.now();
        await db.run('INSERT INTO question_library (id,question_id,category,default_section,default_weight,text,created_at,created_by) VALUES(?,?,?,?,?,?,?,?,?)',
          [id, qid, args.category, null, Number(args.weight) || 5, args.text, new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), uid]);
        return JSON.stringify({ ok: true, qid, msg: 'Pregunta creada en biblioteca' });
      }
      if (act === 'batch_questions') {
        const qs = args.questions as Record<string, unknown>[];
        const r: Record<string, unknown>[] = [];
        for (const q of qs) {
          if (!q.category || !q.text) { r.push({ text: q.text, error: 'Faltan campos' }); continue; }
          try { const id = uuidv4(), qid = 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2,6); await db.run('INSERT INTO question_library (id,question_id,category,default_section,default_weight,text,created_at,created_by) VALUES(?,?,?,?,?,?,?,?,?)', [id, qid, q.category, null, Number(q.weight) || 5, q.text, new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), uid]); r.push({ qid, ok: true }); } catch (e) { r.push({ text: q.text, error: String(e) }); }
        }
        return JSON.stringify({ msg: `${r.filter(x => x.ok).length}/${qs.length} creadas`, results: r });
      }
      if (act === 'update_question') {
        if (!args.question_id) return JSON.stringify({ error: 'Falta question_id' });
        const existing = await db.get('SELECT * FROM question_library WHERE question_id=?', [args.question_id]);
        if (existing) {
          const updates = []; const vals = [];
          if (args.text) { updates.push('text=?'); vals.push(args.text); }
          if (args.category) { updates.push('category=?'); vals.push(args.category); }
          if (args.weight) { updates.push('default_weight=?'); vals.push(parseFloat(args.weight as string) || (existing as any).default_weight); }
          if (args.hidden !== undefined) { updates.push('hidden=?'); vals.push(args.hidden === 'true' ? 1 : 0); }
          if (updates.length > 0) { vals.push(args.question_id); await db.run('UPDATE question_library SET ' + updates.join(', ') + ' WHERE question_id=?', vals); }
          return JSON.stringify({ ok: true, msg: 'Pregunta de biblioteca actualizada' });
        }
        // seed_question_overrides table dropped — question_library is the only source
        return JSON.stringify({ error: 'Pregunta no encontrada' });
      }
      if (act === 'delete_question') {
        if (!args.question_id) return JSON.stringify({ error: 'Falta question_id' });
        const lib = await db.get('SELECT * FROM question_library WHERE question_id=?', [args.question_id]);
        if (lib) { await db.run('DELETE FROM question_library WHERE question_id=?', [args.question_id]); return JSON.stringify({ ok: true, msg: 'Pregunta de biblioteca eliminada' }); }
        // seed_question_overrides table dropped — only question_library exists
        return JSON.stringify({ error: 'Pregunta no encontrada' });
      }
      if (act === 'list_library') return JSON.stringify(await db.all('SELECT question_id, category, text, default_weight, default_section FROM question_library ORDER BY category, text'));
      if (act === 'supervisor_assignments') {
        return JSON.stringify(await db.all('SELECT sa.*,eu.name as employee_name,su.name as supervisor_name FROM supervisor_assignments sa JOIN users eu ON sa.employee_id=eu.id JOIN users su ON sa.supervisor_id=su.id WHERE sa.period=?', [period]));
      }
      if (act === 'action_plan') {
        if (args.id) {
          const plan = await db.get('SELECT * FROM action_plans WHERE id=?', [args.id]);
          const items = await db.all('SELECT * FROM smart_action_items WHERE action_plan_id=?', [args.id]);
          return JSON.stringify({ ...plan, items });
        }
        const userId = args.evaluated_id;
        if (userId) {
          const plans = await db.all('SELECT * FROM action_plans WHERE user_id=? ORDER BY created_at DESC', [userId]);
          return JSON.stringify(plans);
        }
        return JSON.stringify(await db.all('SELECT ap.*, u.name as user_name FROM action_plans ap JOIN users u ON ap.user_id=u.id ORDER BY ap.created_at DESC LIMIT 50'));
      }
      if (act === 'personal_objectives') {
        if (args.evaluated_id) {
          const objs = await db.all('SELECT * FROM personal_objectives WHERE user_id=? ORDER BY created_at DESC', [args.evaluated_id]);
          return JSON.stringify(objs);
        }
        return JSON.stringify(await db.all('SELECT po.*, u.name as user_name FROM personal_objectives po JOIN users u ON po.user_id=u.id ORDER BY po.created_at DESC LIMIT 50'));
      }
      return JSON.stringify({ error: 'Acción desconocida' });
    } catch (e: any) {
      return JSON.stringify({ error: e.message || 'Error en evaluaciones' });
    }
  },
};
