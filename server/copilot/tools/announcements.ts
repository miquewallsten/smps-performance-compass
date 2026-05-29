/**
 * Tool: announcements — Full announcement management.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/connection.js';
import { Tool } from '../types.js';
import { nowMySQL } from './helpers.js';

export const announcementsTool: Tool = {
  name: 'announcements',
  description: `Comunicados y anuncios. Acciones:
- list: todos los comunicados (filtro: archived)
- get: detalle de un comunicado
- create: crear comunicado
- update: actualizar comunicado (title, content, audience)
- delete: eliminar comunicado
- archive: archivar comunicado`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'get', 'create', 'update', 'delete', 'archive'] },
      id: { type: 'string' },
      title: { type: 'string' }, content: { type: 'string' },
      audience: { type: 'string', description: 'all, legal, administrativo, or position name' },
      priority: { type: 'string', enum: ['normal', 'urgent'] },
      archived: { type: 'string', description: 'Filter: true for archived only' },
    },
    required: ['action'],
  },
  execute: async (args, uid, _cfg) => {
    const act = args.action as string;
    try {
      if (act === 'list') {
        const archivedFilter = args.archived === 'true' ? 1 : 0;
        return JSON.stringify(await db.all(
          'SELECT a.*, u.name as author_name FROM announcements a JOIN users u ON a.author_id=u.id WHERE a.archived=? ORDER BY a.created_at DESC LIMIT 50',
          [archivedFilter]));
      }
      if (act === 'get') {
        if (!args.id) return JSON.stringify({ error: 'Falta id' });
        const ann = await db.get('SELECT a.*, u.name as author_name FROM announcements a JOIN users u ON a.author_id=u.id WHERE a.id=?', [args.id]);
        return ann ? JSON.stringify(ann) : JSON.stringify({ error: 'Comunicado no encontrado' });
      }
      if (act === 'create') {
        if (!args.title || !args.content) return JSON.stringify({ error: 'Falta title y content' });
        const id = uuidv4();
        await db.run('INSERT INTO announcements (id,author_id,title,content,audience,priority,archived,created_at) VALUES(?,?,?,?,?,?,0,?)',
          [id, uid, args.title, args.content, args.audience || 'all', args.priority || 'normal', nowMySQL()]);
        return JSON.stringify({ ok: true, msg: 'Comunicado creado', id });
      }
      if (act === 'update') {
        if (!args.id) return JSON.stringify({ error: 'Falta id' });
        const updates: string[] = [];
        const vals: unknown[] = [];
        if (args.title !== undefined) { updates.push('title=?'); vals.push(args.title); }
        if (args.content !== undefined) { updates.push('content=?'); vals.push(args.content); }
        if (args.audience !== undefined) { updates.push('audience=?'); vals.push(args.audience); }
        if (args.priority !== undefined) { updates.push('priority=?'); vals.push(args.priority); }
        if (updates.length === 0) return JSON.stringify({ error: 'Sin cambios' });
        vals.push(args.id);
        await db.run(`UPDATE announcements SET ${updates.join(', ')} WHERE id=?`, vals);
        return JSON.stringify({ ok: true, msg: 'Comunicado actualizado' });
      }
      if (act === 'delete') {
        if (!args.id) return JSON.stringify({ error: 'Falta id' });
        await db.run('DELETE FROM announcements WHERE id=?', [args.id]);
        return JSON.stringify({ ok: true, msg: 'Comunicado eliminado' });
      }
      if (act === 'archive') {
        if (!args.id) return JSON.stringify({ error: 'Falta id' });
        await db.run('UPDATE announcements SET archived=1 WHERE id=?', [args.id]);
        return JSON.stringify({ ok: true, msg: 'Comunicado archivado' });
      }
      return JSON.stringify({ error: 'Acción desconocida' });
    } catch (e: any) {
      return JSON.stringify({ error: e.message });
    }
  },
};
