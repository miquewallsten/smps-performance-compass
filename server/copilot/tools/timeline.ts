/**
 * Tool: timeline — User career timeline management.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/connection.js';
import { Tool } from '../types.js';
import { nowMySQL } from './helpers.js';

export const timelineTool: Tool = {
  name: 'timeline',
  description: `Línea de tiempo del usuario. Acciones:
- list: eventos de un usuario (filtro: type, from, to)
- get: detalle de un evento
- add: crear evento (position_change, hire, termination, evaluation_completed, role_change, note, custom)
- update: actualizar evento
- delete: eliminar evento
- recent: eventos recientes de todos los usuarios`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'get', 'add', 'update', 'delete', 'recent'] },
      user_id: { type: 'string' },
      event_id: { type: 'string' },
      event_type: { type: 'string', description: 'position_change, hire, termination, evaluation_completed, role_change, note, custom' },
      event_date: { type: 'string', description: 'YYYY-MM-DD' },
      old_value: { type: 'string' },
      new_value: { type: 'string' },
      note: { type: 'string' },
      metadata: { type: 'object', description: 'Additional structured data' },
      from: { type: 'string', description: 'Filter from date' },
      to: { type: 'string', description: 'Filter to date' },
    },
    required: ['action'],
  },
  execute: async (args, uid, _cfg) => {
    const act = args.action as string;
    try {
      if (act === 'list') {
        if (!args.user_id) return JSON.stringify({ error: 'Falta user_id' });
        let sql = 'SELECT * FROM user_timeline WHERE user_id=?';
        const params: unknown[] = [args.user_id];
        if (args.event_type) { sql += ' AND event_type=?'; params.push(args.event_type); }
        if (args.from) { sql += ' AND event_date>=?'; params.push(args.from); }
        if (args.to) { sql += ' AND event_date<=?'; params.push(args.to); }
        sql += ' ORDER BY event_date DESC, created_at DESC LIMIT 50';
        return JSON.stringify(await db.all(sql, params));
      }
      if (act === 'get') {
        if (!args.event_id) return JSON.stringify({ error: 'Falta event_id' });
        const ev = await db.get('SELECT * FROM user_timeline WHERE id=?', [args.event_id]);
        return ev ? JSON.stringify(ev) : JSON.stringify({ error: 'Evento no encontrado' });
      }
      if (act === 'add') {
        if (!args.user_id || !args.event_type) return JSON.stringify({ error: 'Falta user_id y event_type' });
        const id = uuidv4();
        const eventDate = args.event_date || new Date().toISOString().split('T')[0];
        await db.run(
          'INSERT INTO user_timeline (id, user_id, event_type, event_date, old_value, new_value, metadata, note, created_by, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
          [id, args.user_id, args.event_type, eventDate, args.old_value || null, args.new_value || null,
           args.metadata ? JSON.stringify(args.metadata) : null, args.note || '', uid, nowMySQL(), nowMySQL()]);
        return JSON.stringify({ ok: true, id, msg: 'Evento creado' });
      }
      if (act === 'update') {
        if (!args.event_id) return JSON.stringify({ error: 'Falta event_id' });
        const updates: string[] = [];
        const vals: unknown[] = [];
        if (args.event_type !== undefined) { updates.push('event_type=?'); vals.push(args.event_type); }
        if (args.event_date !== undefined) { updates.push('event_date=?'); vals.push(args.event_date); }
        if (args.old_value !== undefined) { updates.push('old_value=?'); vals.push(args.old_value); }
        if (args.new_value !== undefined) { updates.push('new_value=?'); vals.push(args.new_value); }
        if (args.note !== undefined) { updates.push('note=?'); vals.push(args.note); }
        if (args.metadata !== undefined) { updates.push('metadata=?'); vals.push(JSON.stringify(args.metadata)); }
        if (updates.length === 0) return JSON.stringify({ error: 'Sin cambios' });
        updates.push('updated_at=?'); vals.push(nowMySQL()); vals.push(args.event_id);
        await db.run(`UPDATE user_timeline SET ${updates.join(', ')} WHERE id=?`, vals);
        return JSON.stringify({ ok: true, msg: 'Evento actualizado' });
      }
      if (act === 'delete') {
        if (!args.event_id) return JSON.stringify({ error: 'Falta event_id' });
        await db.run('DELETE FROM user_timeline WHERE id=?', [args.event_id]);
        return JSON.stringify({ ok: true, msg: 'Evento eliminado' });
      }
      if (act === 'recent') {
        const rows = await db.all(`
          SELECT t.*, u.name as user_name FROM user_timeline t
          JOIN users u ON u.id = t.user_id
          ORDER BY t.created_at DESC LIMIT 30
        `);
        return JSON.stringify(rows);
      }
      return JSON.stringify({ error: 'Acción desconocida' });
    } catch (e: any) {
      return JSON.stringify({ error: e.message });
    }
  },
};
