/**
 * Tool: personal_objectives — Create, update, submit, review personal objectives.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/connection.js';
import { Tool } from '../types.js';
import { getLatestPeriod, nowMySQL } from './helpers.js';

export const personalObjectivesTool: Tool = {
  name: 'personal_objectives',
  description: `Objetivos personales. Acciones:
- list: objetivos de un usuario o todos
- get: detalle de objetivos de un usuario
- create_admin: crear objetivo administrativo (tipo, nombre, pilares, alcance, avance)
- update_admin: actualizar objetivo administrativo
- submit: enviar objetivos para revisión
- review: aprobar/rechazar objetivos con comentarios
- create_legal: crear objetivo legal (horas, eficiencia, pro bono, marketing, mentoring)
- update_legal: actualizar objetivo legal`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'get', 'create_admin', 'update_admin', 'submit', 'review', 'create_legal', 'update_legal'] },
      user_id: { type: 'string' },
      period: { type: 'string' },
      objective_id: { type: 'string', description: 'Admin objective ID' },
      tipo_objetivo: { type: 'string' },
      nombre_objetivo: { type: 'string' },
      pilares_estrategicos: { type: 'string' },
      alcance: { type: 'string' },
      porcentaje_avance: { type: 'number' },
      status: { type: 'string', enum: ['draft', 'pending', 'approved', 'rejected'] },
      reviewer_comment: { type: 'string' },
      horas_meta: { type: 'number' }, horas_ajustadas: { type: 'number' },
      porcentaje_horas: { type: 'number' }, porcentaje_eficiencia: { type: 'number' },
      meta_pro_bono: { type: 'number' }, realizado_pro_bono: { type: 'number' },
      meta_marketing: { type: 'number' }, realizado_marketing: { type: 'number' },
      meta_business_dev: { type: 'number' }, realizado_business_dev: { type: 'number' },
      meta_mentoring: { type: 'number' }, realizado_mentoring: { type: 'number' },
    },
    required: ['action'],
  },
  execute: async (args, uid, _cfg) => {
    const act = args.action as string;
    const period = (args.period as string) || await getLatestPeriod();
    try {
      if (act === 'list') {
        const rows = await db.all('SELECT po.*, u.name as user_name FROM personal_objectives po JOIN users u ON po.user_id=u.id ORDER BY po.created_at DESC LIMIT 50');
        return JSON.stringify(rows);
      }
      if (act === 'get') {
        if (!args.user_id) return JSON.stringify({ error: 'Falta user_id' });
        const obj = await db.get('SELECT * FROM personal_objectives WHERE user_id=? AND period=?', [args.user_id, period]);
        if (!obj) return JSON.stringify({ error: 'No hay objetivos para este periodo' });
        const adminObjs = await db.all('SELECT * FROM admin_objectives WHERE personal_objectives_id=?', [(obj as any).id]);
        return JSON.stringify({ ...obj, admin_objectives: adminObjs });
      }
      if (act === 'create_admin') {
        if (!args.user_id) return JSON.stringify({ error: 'Falta user_id' });
        // Find or create personal_objectives record
        let pObj = await db.get('SELECT * FROM personal_objectives WHERE user_id=? AND period=?', [args.user_id, period]) as any;
        if (!pObj) {
          const pObjId = uuidv4();
          await db.run('INSERT INTO personal_objectives (id, user_id, period, type, created_at, updated_at) VALUES(?,?,?,?,?,?)',
            [pObjId, args.user_id, period, 'admin', nowMySQL(), nowMySQL()]);
          pObj = { id: pObjId };
        }
        const objId = uuidv4();
        await db.run('INSERT INTO admin_objectives (id, personal_objectives_id, tipo_objetivo, nombre_objetivo, pilares_estrategicos, alcance, porcentaje_avance, status) VALUES(?,?,?,?,?,?,?,?)',
          [objId, pObj.id, args.tipo_objetivo || '', args.nombre_objetivo || '', args.pilares_estrategicos || '', args.alcance || '', args.porcentaje_avance || 0, 'draft']);
        return JSON.stringify({ ok: true, id: objId, msg: 'Objetivo administrativo creado' });
      }
      if (act === 'update_admin') {
        if (!args.objective_id) return JSON.stringify({ error: 'Falta objective_id' });
        const updates: string[] = [];
        const vals: unknown[] = [];
        if (args.tipo_objetivo !== undefined) { updates.push('tipo_objetivo=?'); vals.push(args.tipo_objetivo); }
        if (args.nombre_objetivo !== undefined) { updates.push('nombre_objetivo=?'); vals.push(args.nombre_objetivo); }
        if (args.pilares_estrategicos !== undefined) { updates.push('pilares_estrategicos=?'); vals.push(args.pilares_estrategicos); }
        if (args.alcance !== undefined) { updates.push('alcance=?'); vals.push(args.alcance); }
        if (args.porcentaje_avance !== undefined) { updates.push('porcentaje_avance=?'); vals.push(Number(args.porcentaje_avance)); }
        if (args.status !== undefined) { updates.push('status=?'); vals.push(args.status); }
        if (updates.length === 0) return JSON.stringify({ error: 'Sin cambios' });
        vals.push(args.objective_id);
        await db.run(`UPDATE admin_objectives SET ${updates.join(', ')} WHERE id=?`, vals);
        return JSON.stringify({ ok: true, msg: 'Objetivo actualizado' });
      }
      if (act === 'submit') {
        if (!args.user_id) return JSON.stringify({ error: 'Falta user_id' });
        await db.run('UPDATE admin_objectives SET status=? WHERE personal_objectives_id=(SELECT id FROM personal_objectives WHERE user_id=? AND period=?)',
          ['pending', args.user_id, period]);
        return JSON.stringify({ ok: true, msg: 'Objetivos enviados para revisión' });
      }
      if (act === 'review') {
        if (!args.objective_id || !args.status) return JSON.stringify({ error: 'Falta objective_id y status (approved/rejected)' });
        await db.run('UPDATE admin_objectives SET status=?, reviewer_comment=?, reviewed_at=?, reviewed_by=? WHERE id=?',
          [args.status, args.reviewer_comment || '', nowMySQL(), uid, args.objective_id]);
        return JSON.stringify({ ok: true, msg: `Objetivo ${args.status === 'approved' ? 'aprobado' : 'rechazado'}` });
      }
      if (act === 'create_legal') {
        if (!args.user_id) return JSON.stringify({ error: 'Falta user_id' });
        let pObj = await db.get('SELECT * FROM personal_objectives WHERE user_id=? AND period=?', [args.user_id, period]) as any;
        if (!pObj) {
          const pObjId = uuidv4();
          await db.run('INSERT INTO personal_objectives (id, user_id, period, type, created_at, updated_at) VALUES(?,?,?,?,?,?)',
            [pObjId, args.user_id, period, 'legal', nowMySQL(), nowMySQL()]);
          pObj = { id: pObjId };
        }
        // Update legal objective fields
        await db.run(`UPDATE personal_objectives SET
          horas_meta=?, horas_ajustadas=?, porcentaje_horas_vs_meta=?, porcentaje_eficiencia=?,
          meta_pro_bono=?, realizado_pro_bono=?, meta_marketing=?, realizado_marketing=?,
          meta_business_dev=?, realizado_business_dev=?, meta_mentoring=?, realizado_mentoring=?,
          updated_at=?
          WHERE id=?`,
          [args.horas_meta || 0, args.horas_ajustadas || 0, args.porcentaje_horas || 0, args.porcentaje_eficiencia || 0,
           args.meta_pro_bono || 0, args.realizado_pro_bono || 0, args.meta_marketing || 0, args.realizado_marketing || 0,
           args.meta_business_dev || 0, args.realizado_business_dev || 0, args.meta_mentoring || 0, args.realizado_mentoring || 0,
           nowMySQL(), pObj.id]);
        return JSON.stringify({ ok: true, msg: 'Objetivo legal creado/actualizado' });
      }
      return JSON.stringify({ error: 'Acción desconocida' });
    } catch (e: any) {
      return JSON.stringify({ error: e.message });
    }
  },
};
