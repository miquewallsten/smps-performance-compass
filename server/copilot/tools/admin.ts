/**
 * Tools: periods, system, analytics — Admin-level system management + deep reporting.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/connection.js';
import { Tool } from '../types.js';
import { getLatestPeriod, nowMySQL, todayISO } from './helpers.js';

// ─── PERIODS ──────────────────────────────────────────────────────────────
export const periodsTool: Tool = {
  name: 'periods',
  description: `Periodos de evaluación. Acciones:
- list: todos los periodos
- current: periodo activo con fechas y fase actual
- create: crear nuevo periodo
- update: actualizar fechas de un periodo`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'current', 'create', 'update'] },
      period: { type: 'string' },
      self_start: { type: 'string' }, self_end: { type: 'string' },
      supervisor_start: { type: 'string' }, supervisor_end: { type: 'string' },
      feedback_start: { type: 'string' }, feedback_end: { type: 'string' },
      action_plan_start: { type: 'string' }, action_plan_end: { type: 'string' },
    },
    required: ['action'],
  },
  execute: async (args, _uid, _cfg) => {
    const act = args.action as string;
    if (act === 'list') {
      return JSON.stringify(await db.all('SELECT * FROM period_configs ORDER BY period DESC'));
    }
    if (act === 'current') {
      const latestPeriod = await getLatestPeriod();
      const pc = await db.get('SELECT * FROM period_configs WHERE period=?', [latestPeriod]);
      if (!pc) return JSON.stringify({ period: latestPeriod, phase: 'sin configurar' });
      const today = todayISO();
      let phase = 'inactivo';
      if (today >= (pc as any).self_start && today <= (pc as any).self_end) phase = 'autoevaluación';
      else if (today >= (pc as any).supervisor_start && today <= (pc as any).supervisor_end) phase = 'evaluación de supervisor';
      else if (today >= (pc as any).feedback_start && today <= (pc as any).feedback_end) phase = 'sesión de feedback';
      else if (today >= (pc as any).action_plan_start && today <= (pc as any).action_plan_end) phase = 'plan de acción';
      else if (today < (pc as any).self_start) phase = 'pre-periodo';
      else phase = 'post-periodo';
      return JSON.stringify({ ...pc, phase, today });
    }
    if (act === 'create') {
      if (!args.period) return JSON.stringify({ error: 'Falta period name' });
      await db.run('INSERT INTO period_configs (period,self_start,self_end,supervisor_start,supervisor_end,feedback_start,feedback_end,action_plan_start,action_plan_end) VALUES(?,?,?,?,?,?,?,?,?)',
        [args.period, args.self_start, args.self_end, args.supervisor_start, args.supervisor_end, args.feedback_start, args.feedback_end, args.action_plan_start, args.action_plan_end]);
      return JSON.stringify({ ok: true, msg: `Periodo ${args.period} creado` });
    }
    if (act === 'update') {
      if (!args.period) return JSON.stringify({ error: 'Falta period' });
      const updates: string[] = [];
      const vals: unknown[] = [];
      if (args.self_start) { updates.push('self_start=?'); vals.push(args.self_start); }
      if (args.self_end) { updates.push('self_end=?'); vals.push(args.self_end); }
      if (args.supervisor_start) { updates.push('supervisor_start=?'); vals.push(args.supervisor_start); }
      if (args.supervisor_end) { updates.push('supervisor_end=?'); vals.push(args.supervisor_end); }
      if (args.feedback_start) { updates.push('feedback_start=?'); vals.push(args.feedback_start); }
      if (args.feedback_end) { updates.push('feedback_end=?'); vals.push(args.feedback_end); }
      if (args.action_plan_start) { updates.push('action_plan_start=?'); vals.push(args.action_plan_start); }
      if (args.action_plan_end) { updates.push('action_plan_end=?'); vals.push(args.action_plan_end); }
      if (updates.length === 0) return JSON.stringify({ error: 'Sin cambios' });
      vals.push(args.period);
      await db.run(`UPDATE period_configs SET ${updates.join(', ')} WHERE period=?`, vals);
      return JSON.stringify({ ok: true, msg: 'Periodo actualizado' });
    }
    return JSON.stringify({ error: 'Acción desconocida' });
  },
};

// ─── SYSTEM ────────────────────────────────────────────────────────────────
export const systemTool: Tool = {
  name: 'system',
  description: 'Estado del sistema. Acciones: status, toggle_status, toggle_module.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['status', 'toggle_status', 'toggle_module'] },
      status: { type: 'string', enum: ['active', 'inactive'] },
      module: { type: 'string', enum: ['evaluations', 'communications', 'vacations', 'copilot'] },
      enabled: { type: 'string', enum: ['true', 'false'] },
    },
    required: ['action'],
  },
  execute: async (args, uid, _cfg) => {
    if (args.action === 'status') {
      const s = await db.get('SELECT * FROM system_status WHERE id=1');
      const m = await db.get('SELECT * FROM module_config WHERE id=1');
      return JSON.stringify({ system: s, modules: m });
    }
    if (args.action === 'toggle_status') {
      const newStatus = args.status || 'active';
      await db.run('UPDATE system_status SET status=?, updated_at=? WHERE id=1', [newStatus, nowMySQL()]);
      await db.run('INSERT INTO activation_history (id,action,date,by) VALUES(?,?,?,?)', [uuidv4(), newStatus === 'active' ? 'activated' : 'deactivated', nowMySQL(), uid]);
      return JSON.stringify({ ok: true, msg: `Sistema ${newStatus === 'active' ? 'activado' : 'desactivado'}` });
    }
    if (args.action === 'toggle_module') {
      if (!args.module || !args.enabled) return JSON.stringify({ error: 'Falta module y enabled' });
      const enabled = args.enabled === 'true' ? 1 : 0;
      await db.run(`UPDATE module_config SET ${args.module}=? WHERE id=1`, [enabled]);
      return JSON.stringify({ ok: true, msg: `Módulo ${args.module} ${enabled ? 'activado' : 'desactivado'}` });
    }
    return JSON.stringify({ error: 'Acción desconocida' });
  },
};

// ─── ANALYTICS (replaces weak reports) ─────────────────────────────────────
export const analyticsTool: Tool = {
  name: 'analytics',
  description: `Análisis y reportes avanzados. Acciones:
- summary: resumen general del sistema
- completion_dashboard: dashboard de completitud por posición y fase
- score_overview: panorama de calificaciones con distribución
- top_performers: mejores calificados por posición
- needs_attention: empleados que requieren atención (calificación baja, sin evaluación, etc.)
- comparison_report: reporte comparativo entre posiciones o áreas
- period_progress: progreso del periodo actual con predicción de completitud`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['summary', 'completion_dashboard', 'score_overview', 'top_performers', 'needs_attention', 'comparison_report', 'period_progress'] },
      period: { type: 'string' },
      threshold: { type: 'number', description: 'Score threshold for needs_attention (default 60)' },
    },
    required: ['action'],
  },
  execute: async (args, _uid, _cfg) => {
    const act = args.action as string;
    const period = (args.period as string) || await getLatestPeriod();
    try {
      if (act === 'summary') {
        const [users, evals, assignments, vacations, announcements, actionPlans, periods] = await Promise.all([
          db.get('SELECT COUNT(*) c FROM users WHERE is_active=1') as any,
          db.get('SELECT COUNT(*) c FROM evaluations WHERE period=? AND completed_at IS NOT NULL', [period]) as any,
          db.get('SELECT COUNT(*) c FROM supervisor_assignments WHERE period=?', [period]) as any,
          db.get("SELECT COUNT(*) c FROM vacation_requests WHERE status='pending'") as any,
          db.get('SELECT COUNT(*) c FROM announcements WHERE archived=0') as any,
          db.get('SELECT COUNT(*) c FROM action_plans WHERE period=?', [period]) as any,
          db.all('SELECT period FROM period_configs ORDER BY period DESC LIMIT 5') as any,
        ]);
        return JSON.stringify({
          active_users: users?.c, completed_evals: evals?.c, assignments: assignments?.c,
          pending_vacations: vacations?.c, active_announcements: announcements?.c,
          action_plans: actionPlans?.c, periods: periods.map((p: any) => p.period), current_period: period,
        });
      }
      if (act === 'completion_dashboard') {
        const rows = await db.all(`
          SELECT u.position, pc.label as position_label, pc.level,
            COUNT(DISTINCT u.id) as total,
            COUNT(DISTINCT CASE WHEN e_self.id IS NOT NULL THEN u.id END) as self_done,
            COUNT(DISTINCT CASE WHEN e_sup.id IS NOT NULL THEN u.id END) as sup_done,
            COUNT(DISTINCT CASE WHEN e_sup.feedback_completed = 1 THEN u.id END) as feedback_done,
            COUNT(DISTINCT CASE WHEN ap.id IS NOT NULL THEN u.id END) as action_plan_done
          FROM users u
          JOIN position_config pc ON pc.position = u.position
          LEFT JOIN evaluations e_self ON e_self.evaluator_id = u.id AND e_self.type = 'self' AND e_self.period = ? AND e_self.completed_at IS NOT NULL
          LEFT JOIN evaluations e_sup ON e_sup.evaluated_id = u.id AND e_sup.type = 'supervisor' AND e_sup.period = ? AND e_sup.completed_at IS NOT NULL
          LEFT JOIN action_plans ap ON ap.user_id = u.id AND ap.period = ?
          WHERE u.is_active = 1 AND u.is_super_user = 0
          GROUP BY u.position, pc.label, pc.level
          ORDER BY pc.level, pc.position_rank
        `, [period, period, period]);
        return JSON.stringify(rows);
      }
      if (act === 'score_overview') {
        const rows = await db.all(`
          SELECT u.position, e.type,
            COUNT(*) as count,
            ROUND(AVG(e.total_score)) as avg_score,
            ROUND(MIN(e.total_score)) as min_score,
            ROUND(MAX(e.total_score)) as max_score,
            SUM(CASE WHEN e.total_score >= 90 THEN 1 ELSE 0 END) as excellent,
            SUM(CASE WHEN e.total_score >= 75 AND e.total_score < 90 THEN 1 ELSE 0 END) as good,
            SUM(CASE WHEN e.total_score >= 60 AND e.total_score < 75 THEN 1 ELSE 0 END) as satisfactory,
            SUM(CASE WHEN e.total_score < 60 THEN 1 ELSE 0 END) as below_standard
          FROM evaluations e
          JOIN users u ON u.id = e.evaluated_id
          WHERE e.period = ? AND e.completed_at IS NOT NULL AND u.is_active = 1 AND u.is_super_user = 0
          GROUP BY u.position, e.type
        `, [period]);
        return JSON.stringify(rows);
      }
      if (act === 'top_performers') {
        const rows = await db.all(`
          SELECT u.name, u.position, e.type, ROUND(e.total_score) as score
          FROM evaluations e
          JOIN users u ON u.id = e.evaluated_id
          WHERE e.period = ? AND e.completed_at IS NOT NULL AND u.is_active = 1 AND u.is_super_user = 0
          ORDER BY e.total_score DESC
          LIMIT 20
        `, [period]);
        return JSON.stringify(rows);
      }
      if (act === 'needs_attention') {
        const threshold = args.threshold || 60;
        const [lowScores, noSelfEval, noSupervisorEval] = await Promise.all([
          db.all(`
            SELECT u.name, u.position, e.type, ROUND(e.total_score) as score
            FROM evaluations e JOIN users u ON u.id = e.evaluated_id
            WHERE e.period = ? AND e.completed_at IS NOT NULL AND e.total_score < ? AND u.is_active = 1
            ORDER BY e.total_score ASC LIMIT 20
          `, [period, threshold]),
          db.all(`
            SELECT u.name, u.position FROM users u
            WHERE u.is_active = 1 AND u.is_super_user = 0
              AND NOT EXISTS (SELECT 1 FROM evaluations e WHERE e.evaluator_id = u.id AND e.type = 'self' AND e.period = ? AND e.completed_at IS NOT NULL)
          `, [period]),
          db.all(`
            SELECT u.name, u.position FROM users u
            JOIN supervisor_assignments sa ON sa.employee_id = u.id AND sa.period = ?
            WHERE u.is_active = 1 AND u.is_super_user = 0
              AND NOT EXISTS (SELECT 1 FROM evaluations e WHERE e.evaluated_id = u.id AND e.type = 'supervisor' AND e.period = ? AND e.completed_at IS NOT NULL)
          `, [period, period]),
        ]);
        return JSON.stringify({
          low_scores: lowScores, missing_self_eval: noSelfEval, missing_supervisor_eval: noSupervisorEval,
          total_attention: lowScores.length + noSelfEval.length + noSupervisorEval.length,
        });
      }
      if (act === 'comparison_report') {
        const rows = await db.all(`
          SELECT pc.level, u.position, pc.label as position_label,
            COUNT(DISTINCT u.id) as headcount,
            ROUND(AVG(CASE WHEN e.type='self' THEN e.total_score END)) as avg_self_score,
            ROUND(AVG(CASE WHEN e.type='supervisor' THEN e.total_score END)) as avg_sup_score,
            ROUND(AVG(e.total_score)) as avg_overall
          FROM users u
          JOIN position_config pc ON pc.position = u.position
          LEFT JOIN evaluations e ON e.evaluated_id = u.id AND e.period = ? AND e.completed_at IS NOT NULL
          WHERE u.is_active = 1 AND u.is_super_user = 0
          GROUP BY pc.level, u.position, pc.label
          ORDER BY pc.level, pc.position_rank
        `, [period]);
        return JSON.stringify(rows);
      }
      if (act === 'period_progress') {
        const pc = await db.get('SELECT * FROM period_configs WHERE period=?', [period]);
        if (!pc) return JSON.stringify({ error: 'Periodo no configurado' });
        const today = todayISO();
        // Count completions at each stage
        const [total, selfDone, supDone, fbDone, apDone] = await Promise.all([
          db.get('SELECT COUNT(*) c FROM users WHERE is_active=1 AND is_super_user=0') as any,
          db.get('SELECT COUNT(*) c FROM users u WHERE u.is_active=1 AND u.is_super_user=0 AND EXISTS(SELECT 1 FROM evaluations e WHERE e.evaluator_id=u.id AND e.type="self" AND e.period=? AND e.completed_at IS NOT NULL)', [period]) as any,
          db.get('SELECT COUNT(DISTINCT e.evaluated_id) c FROM evaluations e WHERE e.type="supervisor" AND e.period=? AND e.completed_at IS NOT NULL', [period]) as any,
          db.get('SELECT COUNT(DISTINCT e.evaluated_id) c FROM evaluations e WHERE e.type="supervisor" AND e.period=? AND e.feedback_completed=1', [period]) as any,
          db.get('SELECT COUNT(*) c FROM action_plans WHERE period=?', [period]) as any,
        ]);
        const selfPct = total?.c ? Math.round((selfDone?.c / total.c) * 100) : 0;
        const supPct = total?.c ? Math.round((supDone?.c / total.c) * 100) : 0;
        const fbPct = total?.c ? Math.round((fbDone?.c / total.c) * 100) : 0;
        const apPct = total?.c ? Math.round((apDone?.c / total.c) * 100) : 0;
        // Simple prediction based on current pace
        const phase = today <= (pc as any).self_end ? 'autoevaluación' : today <= (pc as any).supervisor_end ? 'evaluación de supervisor' : today <= (pc as any).feedback_end ? 'feedback' : today <= (pc as any).action_plan_end ? 'plan de acción' : 'cerrado';
        return JSON.stringify({
          period, today, phase,
          total_employees: total?.c,
          progress: { self: { done: selfDone?.c, pct: selfPct }, supervisor: { done: supDone?.c, pct: supPct }, feedback: { done: fbDone?.c, pct: fbPct }, action_plan: { done: apDone?.c, pct: apPct } },
        });
      }
      return JSON.stringify({ error: 'Acción desconocida' });
    } catch (e: any) {
      return JSON.stringify({ error: e.message });
    }
  },
};
