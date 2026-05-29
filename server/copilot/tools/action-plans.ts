/**
 * Tool: action_plans — Dedicated CRUD for action plans and smart items.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/connection.js';
import { Tool } from '../types.js';
import { getLatestPeriod, nowMySQL } from './helpers.js';

export const actionPlansTool: Tool = {
  name: 'action_plans',
  description: `Planes de acción. Acciones:
- list: planes de acción (filtro: employee_id, period)
- get: detalle de un plan con items
- create: crear plan de acción para un empleado
- add_item: agregar acción inteligente (competencia, objetivo, acciones, qué evitar, fecha revisión, apoyos)
- update_item: actualizar una acción inteligente
- remove_item: eliminar una acción inteligente
- approve: aprobar plan
- reject: rechazar plan con comentarios`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'get', 'create', 'add_item', 'update_item', 'remove_item', 'approve', 'reject'] },
      id: { type: 'string', description: 'Plan ID' },
      employee_id: { type: 'string' },
      supervisor_id: { type: 'string' },
      period: { type: 'string' },
      content: { type: 'string', description: 'Free-form plan content' },
      item_id: { type: 'string', description: 'Smart action item ID' },
      competencia: { type: 'string' },
      objetivo: { type: 'string' },
      acciones: { type: 'string' },
      que_evitar: { type: 'string' },
      fecha_revision: { type: 'string' },
      apoyos: { type: 'string' },
      comments: { type: 'string', description: 'Approval/rejection comments' },
    },
    required: ['action'],
  },
  execute: async (args, uid, _cfg) => {
    const act = args.action as string;
    const period = (args.period as string) || await getLatestPeriod();
    try {
      if (act === 'list') {
        let sql = 'SELECT ap.*, u.name as employee_name, s.name as supervisor_name FROM action_plans ap JOIN users u ON ap.user_id=u.id LEFT JOIN users s ON ap.supervisor_id=s.id WHERE 1=1';
        const params: unknown[] = [];
        if (args.employee_id) { sql += ' AND ap.user_id=?'; params.push(args.employee_id); }
        if (args.period) { sql += ' AND ap.period=?'; params.push(period); }
        sql += ' ORDER BY ap.created_at DESC LIMIT 50';
        return JSON.stringify(await db.all(sql, params));
      }
      if (act === 'get') {
        if (!args.id) return JSON.stringify({ error: 'Falta id' });
        const plan = await db.get('SELECT * FROM action_plans WHERE id=?', [args.id]);
        if (!plan) return JSON.stringify({ error: 'Plan no encontrado' });
        const items = await db.all('SELECT * FROM smart_action_items WHERE action_plan_id=?', [args.id]);
        return JSON.stringify({ ...plan, items });
      }
      if (act === 'create') {
        if (!args.employee_id) return JSON.stringify({ error: 'Falta employee_id' });
        // Check if plan already exists for this employee/period
        const existing = await db.get('SELECT id FROM action_plans WHERE user_id=? AND period=?', [args.employee_id, period]);
        if (existing) return JSON.stringify({ error: 'Ya existe un plan de acción para este empleado y periodo', plan_id: existing.id });
        const id = uuidv4();
        await db.run('INSERT INTO action_plans (id, user_id, supervisor_id, period, content, approval_status, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?)',
          [id, args.employee_id, args.supervisor_id || uid, period, args.content || '', 'pending', nowMySQL(), nowMySQL()]);
        return JSON.stringify({ ok: true, id, msg: 'Plan de acción creado' });
      }
      if (act === 'add_item') {
        if (!args.id) return JSON.stringify({ error: 'Falta id del plan' });
        if (!args.competencia || !args.objetivo) return JSON.stringify({ error: 'Falta competencia y objetivo' });
        const itemId = uuidv4();
        await db.run('INSERT INTO smart_action_items (id, action_plan_id, competencia, objetivo, acciones, que_evitar, fecha_revision, apoyos) VALUES(?,?,?,?,?,?,?,?)',
          [itemId, args.id, args.competencia, args.objetivo, args.acciones || '', args.que_evitar || '', args.fecha_revision || '', args.apoyos || '']);
        return JSON.stringify({ ok: true, item_id: itemId, msg: 'Acción inteligente agregada' });
      }
      if (act === 'update_item') {
        if (!args.item_id) return JSON.stringify({ error: 'Falta item_id' });
        const updates: string[] = [];
        const vals: unknown[] = [];
        if (args.competencia !== undefined) { updates.push('competencia=?'); vals.push(args.competencia); }
        if (args.objetivo !== undefined) { updates.push('objetivo=?'); vals.push(args.objetivo); }
        if (args.acciones !== undefined) { updates.push('acciones=?'); vals.push(args.acciones); }
        if (args.que_evitar !== undefined) { updates.push('que_evitar=?'); vals.push(args.que_evitar); }
        if (args.fecha_revision !== undefined) { updates.push('fecha_revision=?'); vals.push(args.fecha_revision); }
        if (args.apoyos !== undefined) { updates.push('apoyos=?'); vals.push(args.apoyos); }
        if (updates.length === 0) return JSON.stringify({ error: 'Sin cambios' });
        vals.push(args.item_id);
        await db.run(`UPDATE smart_action_items SET ${updates.join(', ')} WHERE id=?`, vals);
        return JSON.stringify({ ok: true, msg: 'Acción inteligente actualizada' });
      }
      if (act === 'remove_item') {
        if (!args.item_id) return JSON.stringify({ error: 'Falta item_id' });
        await db.run('DELETE FROM smart_action_items WHERE id=?', [args.item_id]);
        return JSON.stringify({ ok: true, msg: 'Acción inteligente eliminada' });
      }
      if (act === 'approve') {
        if (!args.id) return JSON.stringify({ error: 'Falta id' });
        await db.run('UPDATE action_plans SET approval_status=?, approved_by=?, approved_at=?, approval_comments=?, updated_at=? WHERE id=?',
          ['approved', uid, nowMySQL(), args.comments || '', nowMySQL(), args.id]);
        return JSON.stringify({ ok: true, msg: 'Plan aprobado' });
      }
      if (act === 'reject') {
        if (!args.id) return JSON.stringify({ error: 'Falta id' });
        await db.run('UPDATE action_plans SET approval_status=?, approval_comments=?, updated_at=? WHERE id=?',
          ['rejected', args.comments || '', nowMySQL(), args.id]);
        return JSON.stringify({ ok: true, msg: 'Plan rechazado' });
      }
      return JSON.stringify({ error: 'Acción desconocida' });
    } catch (e: any) {
      return JSON.stringify({ error: e.message });
    }
  },
};
