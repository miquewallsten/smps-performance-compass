/**
 * Tool: analyze — Direct SQL queries and deep analysis.
 * The most powerful copilot tool for data exploration.
 */
import { db } from '../../db/connection.js';
import { Tool } from '../types.js';
import { getLatestPeriod } from './helpers.js';

export const analyzeTool: Tool = {
  name: 'analyze',
  description: `Análisis profundo de datos. Acciones:
- query: ejecutar SQL SELECT directo (máximo 100 filas)
- missing_evals: evaluaciones faltantes por periodo
- completion_rates: tasas de completitud por posición
- score_analysis: análisis de calificaciones (promedio, min, max, distribución)
- score_distribution: histograma de calificaciones por posición/periodo
- comparison: comparar calificaciones entre dos periodos
- gap_analysis: identificar brechas entre autoevaluación y evaluación de supervisor
- trends: tendencias de calificaciones a lo largo de periodos
- org_summary: resumen organizacional por posición
- headcount: conteo de personal por área, posición, ubicación
- evaluation_flow: estado del flujo de evaluación (autoeval → supervisor → feedback → action plan)`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['query', 'missing_evals', 'completion_rates', 'score_analysis', 'score_distribution', 'comparison', 'gap_analysis', 'trends', 'org_summary', 'headcount', 'evaluation_flow'] },
      sql: { type: 'string', description: 'SQL query to execute (SELECT only)' },
      period: { type: 'string', description: 'Period (defaults to latest)' },
      compare_period: { type: 'string' },
      position: { type: 'string' },
      group_by: { type: 'string', enum: ['position', 'area', 'level', 'location'] },
    },
    required: ['action'],
  },
  execute: async (args, _uid, _cfg) => {
    const act = args.action as string;
    const period = (args.period as string) || await getLatestPeriod();
    try {
      if (act === 'query') {
        const sql = (args.sql as string)?.trim();
        if (!sql) return JSON.stringify({ error: 'SQL vacío' });
        if (!/^[\s(]*SELECT/i.test(sql)) return JSON.stringify({ error: 'Solo SELECT permitido' });
        if (/\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|EXEC)\b/i.test(sql)) return JSON.stringify({ error: 'Operación no permitida' });
        const rows = await db.all(sql);
        return JSON.stringify(rows.slice(0, 100));
      }
      if (act === 'missing_evals') {
        const rows = await db.all(`
          SELECT u.id, u.name, u.position,
            CASE WHEN e_self.id IS NULL THEN 1 ELSE 0 END as missing_self,
            CASE WHEN sa.id IS NOT NULL AND e_sup.id IS NULL THEN 1 ELSE 0 END as missing_supervisor
          FROM users u
          LEFT JOIN evaluations e_self ON e_self.evaluator_id = u.id AND e_self.type = 'self' AND e_self.period = ? AND e_self.completed_at IS NOT NULL
          LEFT JOIN supervisor_assignments sa ON sa.employee_id = u.id AND sa.period = ?
          LEFT JOIN evaluations e_sup ON e_sup.evaluated_id = u.id AND e_sup.type = 'supervisor' AND e_sup.period = ? AND e_sup.completed_at IS NOT NULL
          WHERE u.is_active = 1 AND u.is_super_user = 0
        `, [period, period, period]);
        return JSON.stringify(rows);
      }
      if (act === 'completion_rates') {
        const rows = await db.all(`
          SELECT u.position,
            COUNT(DISTINCT u.id) as total,
            COUNT(DISTINCT e_self.evaluator_id) as self_done,
            COUNT(DISTINCT e_sup.evaluated_id) as sup_done
          FROM users u
          LEFT JOIN evaluations e_self ON e_self.evaluator_id = u.id AND e_self.type = 'self' AND e_self.period = ? AND e_self.completed_at IS NOT NULL
          LEFT JOIN supervisor_assignments sa ON sa.employee_id = u.id AND sa.period = ?
          LEFT JOIN evaluations e_sup ON e_sup.evaluated_id = u.id AND e_sup.type = 'supervisor' AND e_sup.period = ? AND e_sup.completed_at IS NOT NULL
          WHERE u.is_active = 1 AND u.is_super_user = 0
          GROUP BY u.position
        `, [period, period, period]);
        return JSON.stringify(rows);
      }
      if (act === 'score_analysis') {
        const posFilter = args.position ? ' AND u.position=?' : '';
        const params: unknown[] = [period];
        if (args.position) params.push(args.position);
        const rows = await db.all(`
          SELECT u.position, e.type,
            COUNT(*) as count, AVG(e.total_score) as avg_score,
            MIN(e.total_score) as min_score, MAX(e.total_score) as max_score,
            STDDEV(e.total_score) as stddev_score
          FROM evaluations e
          JOIN users u ON u.id = e.evaluated_id
          WHERE e.period = ? AND e.completed_at IS NOT NULL${posFilter}
          GROUP BY u.position, e.type
        `, params);
        return JSON.stringify(rows);
      }
      if (act === 'score_distribution') {
        const rows = await db.all(`
          SELECT u.position, e.type,
            SUM(CASE WHEN e.total_score >= 90 THEN 1 ELSE 0 END) as excellent,
            SUM(CASE WHEN e.total_score >= 75 AND e.total_score < 90 THEN 1 ELSE 0 END) as good,
            SUM(CASE WHEN e.total_score >= 60 AND e.total_score < 75 THEN 1 ELSE 0 END) as satisfactory,
            SUM(CASE WHEN e.total_score >= 40 AND e.total_score < 60 THEN 1 ELSE 0 END) as needs_improvement,
            SUM(CASE WHEN e.total_score < 40 THEN 1 ELSE 0 END) as deficient,
            COUNT(*) as total
          FROM evaluations e
          JOIN users u ON u.id = e.evaluated_id
          WHERE e.period = ? AND e.completed_at IS NOT NULL
          GROUP BY u.position, e.type
        `, [period]);
        return JSON.stringify(rows);
      }
      if (act === 'gap_analysis') {
        // Compare self-evaluation vs supervisor evaluation for the same person
        const rows = await db.all(`
          SELECT u.name, u.position,
            e_self.total_score as self_score,
            e_sup.total_score as supervisor_score,
            (e_self.total_score - e_sup.total_score) as gap,
            CASE
              WHEN e_self.total_score - e_sup.total_score > 15 THEN 'autoevaluación muy alta'
              WHEN e_self.total_score - e_sup.total_score > 5 THEN 'autoevaluación ligeramente alta'
              WHEN e_self.total_score - e_sup.total_score < -15 THEN 'evaluador mucho más alto'
              WHEN e_self.total_score - e_sup.total_score < -5 THEN 'evaluador ligeramente más alto'
              ELSE 'concordante'
            END as assessment
          FROM evaluations e_self
          JOIN evaluations e_sup ON e_self.evaluated_id = e_sup.evaluated_id AND e_sup.type = 'supervisor' AND e_sup.period = e_self.period
          JOIN users u ON u.id = e_self.evaluated_id
          WHERE e_self.type = 'self' AND e_self.period = ? AND e_self.completed_at IS NOT NULL
            AND e_sup.completed_at IS NOT NULL AND u.is_active = 1 AND u.is_super_user = 0
          ORDER BY ABS(gap) DESC
        `, [period]);
        return JSON.stringify(rows);
      }
      if (act === 'trends') {
        // Score trends across periods
        const rows = await db.all(`
          SELECT e.period, u.position, e.type,
            AVG(e.total_score) as avg_score,
            COUNT(*) as count
          FROM evaluations e
          JOIN users u ON u.id = e.evaluated_id
          WHERE e.completed_at IS NOT NULL AND u.is_active = 1 AND u.is_super_user = 0
          GROUP BY e.period, u.position, e.type
          ORDER BY e.period, u.position, e.type
        `);
        return JSON.stringify(rows);
      }
      if (act === 'comparison') {
        const p2 = args.compare_period;
        if (!p2) return JSON.stringify({ error: 'Necesita compare_period' });
        const rows = await db.all(`
          SELECT u.name, u.position,
            e1.total_score as score_p1, e1.period as period_p1, e1.type,
            e2.total_score as score_p2, e2.period as period_p2,
            (e2.total_score - e1.total_score) as delta
          FROM evaluations e1
          JOIN evaluations e2 ON e1.evaluated_id = e2.evaluated_id AND e1.type = e2.type
          JOIN users u ON u.id = e1.evaluated_id
          WHERE e1.period = ? AND e2.period = ? AND e1.completed_at IS NOT NULL AND e2.completed_at IS NOT NULL
          ORDER BY ABS(delta) DESC
        `, [period, p2]);
        return JSON.stringify(rows);
      }
      if (act === 'org_summary') {
        const rows = await db.all(`
          SELECT position, COUNT(*) as count,
            SUM(CASE WHEN is_admin=1 THEN 1 ELSE 0 END) as admins,
            SUM(CASE WHEN is_managing_partner=1 THEN 1 ELSE 0 END) as managing_partners
          FROM users WHERE is_active=1 AND is_super_user=0
          GROUP BY position ORDER BY position
        `);
        return JSON.stringify(rows);
      }
      if (act === 'headcount') {
        const groupBy = (args.group_by as string) || 'position';
        let sql = '';
        if (groupBy === 'area') {
          sql = `SELECT wa.label as area, wa.level, COUNT(u.id) as count FROM users u JOIN work_areas wa ON u.practice_area = wa.id WHERE u.is_active=1 AND u.is_super_user=0 GROUP BY wa.id ORDER BY count DESC`;
        } else if (groupBy === 'level') {
          sql = `SELECT pc.level, COUNT(u.id) as count FROM users u JOIN position_config pc ON u.position = pc.position WHERE u.is_active=1 AND u.is_super_user=0 GROUP BY pc.level`;
        } else if (groupBy === 'location') {
          sql = `SELECT l.label as location, COUNT(u.id) as count FROM users u LEFT JOIN locations l ON u.location_id = l.id WHERE u.is_active=1 AND u.is_super_user=0 GROUP BY u.location_id ORDER BY count DESC`;
        } else {
          sql = `SELECT u.position, pc.label as position_label, pc.level, COUNT(u.id) as count FROM users u JOIN position_config pc ON u.position = pc.position WHERE u.is_active=1 AND u.is_super_user=0 GROUP BY u.position ORDER BY pc.level, pc.position_rank`;
        }
        return JSON.stringify(await db.all(sql));
      }
      if (act === 'evaluation_flow') {
        // Show each user's progress through the full evaluation pipeline
        const rows = await db.all(`
          SELECT u.id, u.name, u.position,
            CASE WHEN e_self.id IS NOT NULL THEN 1 ELSE 0 END as self_done,
            CASE WHEN e_sup.id IS NOT NULL THEN 1 ELSE 0 END as supervisor_done,
            CASE WHEN e_sup.feedback_completed = 1 THEN 1 ELSE 0 END as feedback_done,
            CASE WHEN ap.id IS NOT NULL THEN 1 ELSE 0 END as action_plan_done
          FROM users u
          LEFT JOIN evaluations e_self ON e_self.evaluator_id = u.id AND e_self.type = 'self' AND e_self.period = ? AND e_self.completed_at IS NOT NULL
          LEFT JOIN evaluations e_sup ON e_sup.evaluated_id = u.id AND e_sup.type = 'supervisor' AND e_sup.period = ? AND e_sup.completed_at IS NOT NULL
          LEFT JOIN action_plans ap ON ap.user_id = u.id AND ap.period = ?
          WHERE u.is_active = 1 AND u.is_super_user = 0
          ORDER BY u.position, u.name
        `, [period, period, period]);
        // Compute summary
        const total = rows.length;
        const selfDone = rows.filter((r: any) => r.self_done).length;
        const supDone = rows.filter((r: any) => r.supervisor_done).length;
        const fbDone = rows.filter((r: any) => r.feedback_done).length;
        const apDone = rows.filter((r: any) => r.action_plan_done).length;
        return JSON.stringify({
          period,
          summary: { total, self_done: selfDone, supervisor_done: supDone, feedback_done: fbDone, action_plan_done: apDone },
          users: rows,
        });
      }
      return JSON.stringify({ error: 'Acción desconocida' });
    } catch (e: any) {
      return JSON.stringify({ error: e.message || 'Error en análisis' });
    }
  },
};
