/**
 * Tool: supervisor_assignments — Manage supervisor-employee assignments with batch operations.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/connection.js';
import { Tool } from '../types.js';
import { getLatestPeriod, nowMySQL } from './helpers.js';

export const supervisorAssignmentsTool: Tool = {
  name: 'supervisor_assignments',
  description: `Asignaciones de supervisor. Acciones:
- list: todas las asignaciones de un periodo
- by_supervisor: empleados asignados a un supervisor
- by_employee: supervisores asignados a un empleado
- assign: asignar supervisor a empleado
- batch_assign: asignar múltiples supervisores (array de {employee_id, supervisor_id})
- remove: eliminar asignación
- auto_assign: asignar supervisores automáticamente basado en jerarquía (solo para posiciones sin supervisor)`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'by_supervisor', 'by_employee', 'assign', 'batch_assign', 'remove', 'auto_assign'] },
      employee_id: { type: 'string' },
      supervisor_id: { type: 'string' },
      assignment_id: { type: 'string' },
      period: { type: 'string' },
      assignments: { type: 'array', items: { type: 'object', properties: { employee_id: { type: 'string' }, supervisor_id: { type: 'string' } } } },
    },
    required: ['action'],
  },
  execute: async (args, _uid, _cfg) => {
    const act = args.action as string;
    const period = (args.period as string) || await getLatestPeriod();
    try {
      if (act === 'list') {
        return JSON.stringify(await db.all(
          'SELECT sa.id, sa.employee_id, sa.supervisor_id, sa.period, eu.name as employee_name, su.name as supervisor_name FROM supervisor_assignments sa JOIN users eu ON sa.employee_id=eu.id JOIN users su ON sa.supervisor_id=su.id WHERE sa.period=? ORDER BY su.name, eu.name',
          [period]));
      }
      if (act === 'by_supervisor') {
        if (!args.supervisor_id) return JSON.stringify({ error: 'Falta supervisor_id' });
        return JSON.stringify(await db.all(
          'SELECT sa.*, eu.name as employee_name, eu.position FROM supervisor_assignments sa JOIN users eu ON sa.employee_id=eu.id WHERE sa.supervisor_id=? AND sa.period=?',
          [args.supervisor_id, period]));
      }
      if (act === 'by_employee') {
        if (!args.employee_id) return JSON.stringify({ error: 'Falta employee_id' });
        return JSON.stringify(await db.all(
          'SELECT sa.*, su.name as supervisor_name, su.position FROM supervisor_assignments sa JOIN users su ON sa.supervisor_id=su.id WHERE sa.employee_id=? AND sa.period=?',
          [args.employee_id, period]));
      }
      if (act === 'assign') {
        if (!args.employee_id || !args.supervisor_id) return JSON.stringify({ error: 'Falta employee_id y supervisor_id' });
        const id = uuidv4();
        await db.run('INSERT IGNORE INTO supervisor_assignments (id, employee_id, supervisor_id, period) VALUES(?,?,?,?)',
          [id, args.employee_id, args.supervisor_id, period]);
        return JSON.stringify({ ok: true, msg: 'Supervisor asignado' });
      }
      if (act === 'batch_assign') {
        const asns = args.assignments as { employee_id: string; supervisor_id: string }[];
        if (!asns?.length) return JSON.stringify({ error: 'Falta assignments array' });
        const r: Record<string, unknown>[] = [];
        for (const a of asns) {
          if (!a.employee_id || !a.supervisor_id) { r.push({ employee_id: a.employee_id, error: 'Faltan campos' }); continue; }
          try {
            const id = uuidv4();
            await db.run('INSERT IGNORE INTO supervisor_assignments (id, employee_id, supervisor_id, period) VALUES(?,?,?,?)',
              [id, a.employee_id, a.supervisor_id, period]);
            r.push({ employee_id: a.employee_id, ok: true });
          } catch (e) { r.push({ employee_id: a.employee_id, error: String(e) }); }
        }
        return JSON.stringify({ msg: `${r.filter(x => x.ok).length}/${asns.length} asignadas`, results: r });
      }
      if (act === 'remove') {
        if (!args.assignment_id) return JSON.stringify({ error: 'Falta assignment_id' });
        await db.run('DELETE FROM supervisor_assignments WHERE id=?', [args.assignment_id]);
        return JSON.stringify({ ok: true, msg: 'Asignación eliminada' });
      }
      if (act === 'auto_assign') {
        // Find active employees without supervisor assignments for this period
        const unassigned = await db.all(`
          SELECT u.id, u.name, u.position, u.practice_area, pc.level, pc.position_rank
          FROM users u
          JOIN position_config pc ON pc.position = u.position
          WHERE u.is_active = 1 AND u.is_super_user = 0
            AND pc.position_rank > 1
            AND NOT EXISTS (SELECT 1 FROM supervisor_assignments sa WHERE sa.employee_id = u.id AND sa.period = ?)
          ORDER BY pc.level, pc.position_rank
        `, [period]);

        if (unassigned.length === 0) return JSON.stringify({ ok: true, msg: 'Todos los empleados ya tienen supervisor asignado', assigned: 0 });

        // Get potential supervisors (rank 1 in each area, or admins)
        const supervisors = await db.all(`
          SELECT u.id, u.name, u.position, u.practice_area, pc.level, pc.position_rank
          FROM users u
          JOIN position_config pc ON pc.position = u.position
          WHERE u.is_active = 1 AND (pc.position_rank <= 2 OR u.is_admin = 1 OR u.is_managing_partner = 1)
          ORDER BY pc.level, pc.position_rank
        `);

        const r: Record<string, unknown>[] = [];
        for (const emp of unassigned) {
          // Find best supervisor: same area preferred, or same level, or admin
          const best = supervisors.find((s: any) =>
            s.practice_area === emp.practice_area && s.level === emp.level && s.id !== emp.id
          ) || supervisors.find((s: any) =>
            s.level === emp.level && s.id !== emp.id
          ) || supervisors.find((s: any) => s.id !== emp.id);

          if (best) {
            try {
              const id = uuidv4();
              await db.run('INSERT IGNORE INTO supervisor_assignments (id, employee_id, supervisor_id, period) VALUES(?,?,?,?)',
                [id, emp.id, best.id, period]);
              r.push({ employee: emp.name, supervisor: best.name, ok: true });
            } catch (e) { r.push({ employee: emp.name, error: String(e) }); }
          } else {
            r.push({ employee: emp.name, error: 'No se encontró supervisor adecuado' });
          }
        }
        return JSON.stringify({ msg: `${r.filter(x => x.ok).length}/${unassigned.length} asignados automáticamente`, results: r });
      }
      return JSON.stringify({ error: 'Acción desconocida' });
    } catch (e: any) {
      return JSON.stringify({ error: e.message });
    }
  },
};
