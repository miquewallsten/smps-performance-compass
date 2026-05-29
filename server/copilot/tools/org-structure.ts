/**
 * Tools: work_areas, positions (CVE), locations — Organizational structure management.
 */
import { db } from '../../db/connection.js';
import { Tool } from '../types.js';

function now(): string {
  return new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

// ─── WORK AREAS ─────────────────────────────────────────────────────────────
export const workAreasTool: Tool = {
  name: 'work_areas',
  description: `Áreas de trabajo (práctica). Acciones:
- list: listar áreas (filtro: level)
- get: obtener área por ID
- create: crear área (campos: id, label, level, sort_order?)
- update: actualizar área (campos: id, label?, level?, sort_order?)
- delete: eliminar área (solo si no tiene puestos asignados)`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'get', 'create', 'update', 'delete'] },
      id: { type: 'string', description: 'Área ID (ej: fiscal_consultoria)' },
      label: { type: 'string' },
      level: { type: 'string', description: 'legal o administrativo' },
      sort_order: { type: 'number' },
    },
    required: ['action'],
  },
  execute: async (args) => {
    const act = args.action as string;
    if (act === 'list') {
      let sql = 'SELECT wa.*, (SELECT COUNT(*) FROM custom_positions WHERE work_area_id = wa.id) AS position_count FROM work_areas wa';
      const params: unknown[] = [];
      if (args.level) { sql += ' WHERE wa.level = ?'; params.push(args.level); }
      sql += ' ORDER BY wa.sort_order, wa.label';
      return JSON.stringify(await db.all(sql, params));
    }
    if (act === 'get') {
      if (!args.id) return JSON.stringify({ error: 'Falta id' });
      const area = await db.get('SELECT * FROM work_areas WHERE id = ?', [args.id]);
      if (!area) return JSON.stringify({ error: 'Área no encontrada' });
      const positions = await db.all('SELECT * FROM custom_positions WHERE work_area_id = ? ORDER BY id', [args.id]);
      return JSON.stringify({ ...area, positions });
    }
    if (act === 'create') {
      if (!args.id || !args.label || !args.level) return JSON.stringify({ error: 'Campos obligatorios: id, label, level' });
      if (!['legal', 'administrativo'].includes(args.level as string)) return JSON.stringify({ error: 'Level debe ser "legal" o "administrativo"' });
      try {
        await db.run('INSERT INTO work_areas (id, label, level, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [args.id, args.label, args.level, args.sort_order || 0, now(), now()]);
        return JSON.stringify({ ok: true, msg: `Área "${args.label}" creada` });
      } catch (e: any) { if (e.code === 'ER_DUP_ENTRY') return JSON.stringify({ error: 'Ya existe un área con ese ID' }); return JSON.stringify({ error: e.message }); }
    }
    if (act === 'update') {
      if (!args.id) return JSON.stringify({ error: 'Falta id del área' });
      const area = await db.get('SELECT * FROM work_areas WHERE id = ?', [args.id]);
      if (!area) return JSON.stringify({ error: 'Área no encontrada' });
      const updates: string[] = [];
      const vals: unknown[] = [];
      if (args.label !== undefined) { updates.push('label = ?'); vals.push(args.label); }
      if (args.level !== undefined) { if (!['legal', 'administrativo'].includes(args.level as string)) return JSON.stringify({ error: 'Level debe ser "legal" o "administrativo"' }); updates.push('level = ?'); vals.push(args.level); }
      if (args.sort_order !== undefined) { updates.push('sort_order = ?'); vals.push(args.sort_order); }
      if (updates.length === 0) return JSON.stringify({ error: 'Sin cambios' });
      updates.push('updated_at = ?'); vals.push(now()); vals.push(args.id);
      await db.run(`UPDATE work_areas SET ${updates.join(', ')} WHERE id = ?`, vals);
      return JSON.stringify({ ok: true, msg: 'Área actualizada' });
    }
    if (act === 'delete') {
      if (!args.id) return JSON.stringify({ error: 'Falta id' });
      const posCount = (await db.get('SELECT COUNT(*) c FROM custom_positions WHERE work_area_id = ?', [args.id]) as any).c;
      if (posCount > 0) return JSON.stringify({ error: `No se puede eliminar: tiene ${posCount} puesto(s) asignado(s). Elimina primero los puestos.` });
      await db.run('DELETE FROM work_areas WHERE id = ?', [args.id]);
      return JSON.stringify({ ok: true, msg: 'Área eliminada' });
    }
    return JSON.stringify({ error: 'Acción desconocida' });
  },
};

// ─── POSITIONS (CVE) ────────────────────────────────────────────────────────
export const positionsTool: Tool = {
  name: 'positions',
  description: `Gestión de puestos (CVE Puesto). Acciones:
- list: listar puestos (filtro: work_area_id)
- get: obtener puesto por CVE
- create: crear puesto (campos: id/CVE, label, work_area_id, base_position)
- update: actualizar puesto (campos: id/CVE actual, label?, work_area_id?, base_position?, new_id?)
- delete: eliminar puesto (requiere id, solo si no tiene usuarios asignados)`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'get', 'create', 'update', 'delete'] },
      id: { type: 'string', description: 'CVE del puesto (ej: SMPS12)' },
      new_id: { type: 'string', description: 'Nuevo CVE al renombrar' },
      label: { type: 'string', description: 'Nombre del puesto' },
      work_area_id: { type: 'string', description: 'ID del área de trabajo' },
      base_position: { type: 'string', description: 'Posición base' },
    },
    required: ['action'],
  },
  execute: async (args) => {
    const act = args.action as string;
    if (act === 'list') {
      let sql = `SELECT cp.*, wa.label AS work_area_label, wa.level AS work_area_level FROM custom_positions cp JOIN work_areas wa ON cp.work_area_id = wa.id`;
      const params: unknown[] = [];
      if (args.work_area_id) { sql += ' WHERE cp.work_area_id = ?'; params.push(args.work_area_id); }
      sql += ' ORDER BY cp.id';
      return JSON.stringify(await db.all(sql, params));
    }
    if (act === 'get') {
      if (!args.id) return JSON.stringify({ error: 'Falta CVE' });
      const pos = await db.get('SELECT cp.*, wa.label AS work_area_label, wa.level AS work_area_level FROM custom_positions cp JOIN work_areas wa ON cp.work_area_id = wa.id WHERE cp.id = ?', [args.id]);
      if (!pos) return JSON.stringify({ error: 'Puesto no encontrado' });
      return JSON.stringify(pos);
    }
    if (act === 'create') {
      if (!args.id || !args.label || !args.work_area_id || !args.base_position) return JSON.stringify({ error: 'Campos obligatorios: id (CVE), label, work_area_id, base_position' });
      const area = await db.get('SELECT id FROM work_areas WHERE id = ?', [args.work_area_id]);
      if (!area) return JSON.stringify({ error: 'Área de trabajo no encontrada' });
      try {
        await db.run('INSERT INTO custom_positions (id, label, work_area_id, base_position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [args.id, args.label, args.work_area_id, args.base_position, now(), now()]);
        return JSON.stringify({ ok: true, msg: `Puesto ${args.id} "${args.label}" creado en área ${args.work_area_id}` });
      } catch (e: any) { if (e.code === 'ER_DUP_ENTRY') return JSON.stringify({ error: 'Ya existe un puesto con ese CVE' }); return JSON.stringify({ error: e.message }); }
    }
    if (act === 'update') {
      if (!args.id) return JSON.stringify({ error: 'Falta CVE del puesto a actualizar' });
      const pos = await db.get('SELECT * FROM custom_positions WHERE id = ?', [args.id]);
      if (!pos) return JSON.stringify({ error: 'Puesto no encontrado' });
      if (args.new_id && args.new_id !== args.id) {
        const userCount = (await db.get('SELECT COUNT(*) c FROM users WHERE custom_position_id = ?', [args.id]) as any).c;
        if (userCount > 0) return JSON.stringify({ error: `No se puede cambiar el CVE: ${userCount} usuario(s) asignado(s). Remueve las asignaciones primero.` });
      }
      const updates: string[] = [];
      const vals: unknown[] = [];
      if (args.new_id && args.new_id !== args.id) { updates.push('id = ?'); vals.push(args.new_id); }
      if (args.label !== undefined) { updates.push('label = ?'); vals.push(args.label); }
      if (args.work_area_id !== undefined) {
        const area = await db.get('SELECT id FROM work_areas WHERE id = ?', [args.work_area_id]);
        if (!area) return JSON.stringify({ error: 'Área de trabajo no encontrada' });
        updates.push('work_area_id = ?'); vals.push(args.work_area_id);
      }
      if (args.base_position !== undefined) { updates.push('base_position = ?'); vals.push(args.base_position); }
      if (updates.length === 0) return JSON.stringify({ error: 'Sin cambios' });
      updates.push('updated_at = ?'); vals.push(now());
      vals.push(args.id as string);
      await db.run(`UPDATE custom_positions SET ${updates.join(', ')} WHERE id = ?`, vals);
      if (args.new_id && args.new_id !== args.id) {
        await db.run('UPDATE users SET custom_position_id = ? WHERE custom_position_id = ?', [args.new_id, args.id]);
      }
      return JSON.stringify({ ok: true, msg: 'Puesto actualizado' });
    }
    if (act === 'delete') {
      if (!args.id) return JSON.stringify({ error: 'Falta CVE' });
      const userCount = (await db.get('SELECT COUNT(*) c FROM users WHERE custom_position_id = ?', [args.id]) as any).c;
      if (userCount > 0) return JSON.stringify({ error: `No se puede eliminar: ${userCount} usuario(s) asignado(s). Remueve las asignaciones primero.` });
      await db.run('DELETE FROM custom_positions WHERE id = ?', [args.id]);
      return JSON.stringify({ ok: true, msg: 'Puesto eliminado' });
    }
    return JSON.stringify({ error: 'Acción desconocida' });
  },
};

// ─── LOCATIONS ──────────────────────────────────────────────────────────────
export const locationsTool: Tool = {
  name: 'locations',
  description: `Gestión de ubicaciones físicas (ciudad, oficina, piso, escritorio). Acciones:
- list: listar ubicaciones
- get: obtener ubicación por ID
- create: crear ubicación (campos: id, label, city?, office?, floor?, desk?, sort_order?)
- update: actualizar ubicación (campos: id, label?, city?, office?, floor?, desk?, sort_order?)
- delete: eliminar ubicación (solo si no tiene usuarios asignados)`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'get', 'create', 'update', 'delete'] },
      id: { type: 'string', description: 'ID de ubicación' },
      label: { type: 'string' },
      city: { type: 'string' },
      office: { type: 'string' },
      floor: { type: 'string' },
      desk: { type: 'string' },
      sort_order: { type: 'number' },
    },
    required: ['action'],
  },
  execute: async (args) => {
    const act = args.action as string;
    if (act === 'list') {
      return JSON.stringify(await db.all('SELECT l.*, (SELECT COUNT(*) FROM users WHERE location_id = l.id) AS user_count FROM locations l ORDER BY l.sort_order, l.label'));
    }
    if (act === 'get') {
      if (!args.id) return JSON.stringify({ error: 'Falta id' });
      const loc = await db.get('SELECT * FROM locations WHERE id = ?', [args.id]);
      if (!loc) return JSON.stringify({ error: 'Ubicación no encontrada' });
      return JSON.stringify(loc);
    }
    if (act === 'create') {
      if (!args.id || !args.label) return JSON.stringify({ error: 'Campos obligatorios: id, label' });
      try {
        await db.run('INSERT INTO locations (id, label, city, office, floor, desk, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [args.id, args.label, args.city || null, args.office || null, args.floor || null, args.desk || null, args.sort_order || 0, now(), now()]);
        return JSON.stringify({ ok: true, msg: `Ubicación "${args.label}" creada` });
      } catch (e: any) { if (e.code === 'ER_DUP_ENTRY') return JSON.stringify({ error: 'Ya existe una ubicación con ese ID' }); return JSON.stringify({ error: e.message }); }
    }
    if (act === 'update') {
      if (!args.id) return JSON.stringify({ error: 'Falta id' });
      const loc = await db.get('SELECT * FROM locations WHERE id = ?', [args.id]);
      if (!loc) return JSON.stringify({ error: 'Ubicación no encontrada' });
      const updates: string[] = [];
      const vals: unknown[] = [];
      if (args.label !== undefined) { updates.push('label = ?'); vals.push(args.label); }
      if (args.city !== undefined) { updates.push('city = ?'); vals.push(args.city); }
      if (args.office !== undefined) { updates.push('office = ?'); vals.push(args.office); }
      if (args.floor !== undefined) { updates.push('floor = ?'); vals.push(args.floor); }
      if (args.desk !== undefined) { updates.push('desk = ?'); vals.push(args.desk); }
      if (args.sort_order !== undefined) { updates.push('sort_order = ?'); vals.push(args.sort_order); }
      if (updates.length === 0) return JSON.stringify({ error: 'Sin cambios' });
      updates.push('updated_at = ?'); vals.push(now()); vals.push(args.id);
      await db.run(`UPDATE locations SET ${updates.join(', ')} WHERE id = ?`, vals);
      return JSON.stringify({ ok: true, msg: 'Ubicación actualizada' });
    }
    if (act === 'delete') {
      if (!args.id) return JSON.stringify({ error: 'Falta id' });
      const userCount = (await db.get('SELECT COUNT(*) c FROM users WHERE location_id = ?', [args.id]) as any).c;
      if (userCount > 0) return JSON.stringify({ error: `No se puede eliminar: ${userCount} usuario(s) asignado(s).` });
      await db.run('DELETE FROM locations WHERE id = ?', [args.id]);
      return JSON.stringify({ ok: true, msg: 'Ubicación eliminada' });
    }
    return JSON.stringify({ error: 'Acción desconocida' });
  },
};
