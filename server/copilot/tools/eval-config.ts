/**
 * Tools: evaluation_templates, question_library, categories, section_weights, position_config
 * — Evaluation configuration management.
 */
import { db } from '../../db/connection.js';
import { Tool } from '../types.js';

function now(): string {
  return new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

// ─── EVALUATION TEMPLATES ────────────────────────────────────────────────────
export const evaluationTemplatesTool: Tool = {
  name: 'evaluation_templates',
  description: `Plantillas de evaluación (template_questions). Acciones:
- list: preguntas de una posición (requiere position)
- get: detalle de una pregunta por ID
- add: agregar pregunta a plantilla de posición
- batch_add: agregar múltiples preguntas
- update: actualizar pregunta (text, weight, category, hidden)
- delete: eliminar pregunta de plantilla
- reorder: cambiar sort_order de preguntas`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'get', 'add', 'batch_add', 'update', 'delete', 'reorder'] },
      position: { type: 'string' }, question_id: { type: 'string' },
      category: { type: 'string' }, text: { type: 'string' },
      weight: { type: 'number' }, section: { type: 'string' },
      practice_area: { type: 'string' }, hidden: { type: 'string' },
      is_active: { type: 'string' }, sort_order: { type: 'number' },
      questions: { type: 'array', items: { type: 'object' } },
    },
    required: ['action'],
  },
  execute: async (args, _uid, _cfg) => {
    const act = args.action as string;
    if (act === 'list') {
      if (!args.position) return JSON.stringify({ error: 'Falta position' });
      return JSON.stringify(await db.all(
        'SELECT * FROM template_questions WHERE position=? AND is_active=1 ORDER BY section, sort_order, category',
        [args.position]));
    }
    if (act === 'get') {
      if (!args.question_id) return JSON.stringify({ error: 'Falta question_id' });
      const q = await db.get('SELECT * FROM template_questions WHERE question_id=?', [args.question_id]);
      return q ? JSON.stringify(q) : JSON.stringify({ error: 'No encontrada' });
    }
    if (act === 'add') {
      if (!args.position || !args.category || !args.text) return JSON.stringify({ error: 'Falta position, category, text' });
      const qid = args.question_id || `tq_${args.position}_${Date.now()}`;
      await db.run(
        'INSERT INTO template_questions (question_id, position, category, question_text, weight, section, practice_area, is_active, sort_order, source) VALUES(?,?,?,?,?,?,?,?,?,?)',
        [qid, args.position, args.category, args.text, args.weight || 1, args.section || 'competencias', args.practice_area || null, 1, args.sort_order || 99, 'custom']);
      return JSON.stringify({ ok: true, qid, msg: 'Pregunta agregada a plantilla' });
    }
    if (act === 'batch_add') {
      const qs = args.questions as Record<string, unknown>[];
      if (!args.position || !qs?.length) return JSON.stringify({ error: 'Falta position y questions[]' });
      const r: Record<string, unknown>[] = [];
      for (const q of qs) {
        if (!q.category || !q.text) { r.push({ text: q.text, error: 'Faltan campos' }); continue; }
        try {
          const qid = `tq_${args.position}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
          await db.run(
            'INSERT INTO template_questions (question_id, position, category, question_text, weight, section, practice_area, is_active, sort_order, source) VALUES(?,?,?,?,?,?,?,?,?,?)',
            [qid, args.position, q.category, q.text, Number(q.weight) || 1, q.section || 'competencias', q.practice_area || null, 1, q.sort_order || 99, 'custom']);
          r.push({ qid, ok: true });
        } catch (e) { r.push({ text: q.text, error: String(e) }); }
      }
      return JSON.stringify({ msg: `${r.filter(x => x.ok).length}/${qs.length} agregadas`, results: r });
    }
    if (act === 'update') {
      if (!args.question_id) return JSON.stringify({ error: 'Falta question_id' });
      const updates: string[] = [];
      const vals: unknown[] = [];
      if (args.text !== undefined) { updates.push('question_text=?'); vals.push(args.text); }
      if (args.category !== undefined) { updates.push('category=?'); vals.push(args.category); }
      if (args.weight !== undefined) { updates.push('weight=?'); vals.push(Number(args.weight)); }
      if (args.section !== undefined) { updates.push('section=?'); vals.push(args.section); }
      if (args.practice_area !== undefined) { updates.push('practice_area=?'); vals.push(args.practice_area); }
      if (args.is_active !== undefined) { updates.push('is_active=?'); vals.push(args.is_active === 'true' ? 1 : 0); }
      if (args.sort_order !== undefined) { updates.push('sort_order=?'); vals.push(Number(args.sort_order)); }
      if (args.hidden === 'true') { updates.push('is_active=0'); }
      if (updates.length === 0) return JSON.stringify({ error: 'Sin cambios' });
      vals.push(args.question_id);
      await db.run(`UPDATE template_questions SET ${updates.join(', ')} WHERE question_id=?`, vals);
      return JSON.stringify({ ok: true, msg: 'Pregunta de plantilla actualizada' });
    }
    if (act === 'delete') {
      if (!args.question_id) return JSON.stringify({ error: 'Falta question_id' });
      await db.run('DELETE FROM template_questions WHERE question_id=?', [args.question_id]);
      return JSON.stringify({ ok: true, msg: 'Pregunta de plantilla eliminada' });
    }
    if (act === 'reorder') {
      if (!args.question_id || args.sort_order === undefined) return JSON.stringify({ error: 'Falta question_id y sort_order' });
      await db.run('UPDATE template_questions SET sort_order=? WHERE question_id=?', [Number(args.sort_order), args.question_id]);
      return JSON.stringify({ ok: true, msg: 'Orden actualizado' });
    }
    return JSON.stringify({ error: 'Acción desconocida' });
  },
};

// ─── QUESTION LIBRARY ────────────────────────────────────────────────────────
export const questionLibraryTool: Tool = {
  name: 'question_library',
  description: `Biblioteca de preguntas (question_library). Acciones:
- list: todas las preguntas
- add: agregar pregunta
- update: actualizar pregunta
- delete: eliminar pregunta`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'add', 'update', 'delete'] },
      question_id: { type: 'string' }, category: { type: 'string' },
      text: { type: 'string' }, default_weight: { type: 'number' },
    },
    required: ['action'],
  },
  execute: async (args, uid, _cfg) => {
    const act = args.action as string;
    if (act === 'list') return JSON.stringify(await db.all('SELECT id, question_id, category, default_section, default_weight, text FROM question_library ORDER BY category, text'));
    if (act === 'add') {
      if (!args.category || !args.text) return JSON.stringify({ error: 'Falta category, text' });
      const { v4: uuid } = await import('uuid');
      const id = uuid(), qid = args.question_id || 'lq_' + Date.now();
      await db.run('INSERT INTO question_library (id,question_id,category,default_section,text,default_weight,created_at,created_by) VALUES(?,?,?,?,?,?,?,?,?)',
        [id, qid, args.category, args.default_section || null, args.text, args.default_weight || 5, now(), uid]);
      return JSON.stringify({ ok: true, qid });
    }
    if (act === 'update') {
      if (!args.question_id) return JSON.stringify({ error: 'Falta question_id' });
      const updates: string[] = [];
      const vals: unknown[] = [];
      if (args.text !== undefined) { updates.push('text=?'); vals.push(args.text); }
      if (args.category !== undefined) { updates.push('category=?'); vals.push(args.category); }
      if (args.default_weight !== undefined) { updates.push('default_weight=?'); vals.push(Number(args.default_weight)); }
      if (updates.length === 0) return JSON.stringify({ error: 'Sin cambios' });
      vals.push(args.question_id);
      await db.run(`UPDATE question_library SET ${updates.join(', ')} WHERE question_id=?`, vals);
      return JSON.stringify({ ok: true, msg: 'Pregunta de biblioteca actualizada' });
    }
    if (act === 'delete') {
      if (!args.question_id) return JSON.stringify({ error: 'Falta question_id' });
      await db.run('DELETE FROM question_library WHERE question_id=?', [args.question_id]);
      return JSON.stringify({ ok: true, msg: 'Pregunta eliminada de biblioteca' });
    }
    return JSON.stringify({ error: 'Acción desconocida' });
  },
};

// ─── CATEGORIES ──────────────────────────────────────────────────────────────
export const categoriesTool: Tool = {
  name: 'categories',
  description: `Categorías de evaluación (evaluation_categories). Acciones:
- list: todas las categorías
- add: crear categoría (campos: id, label, section, sort_order?)
- update: actualizar categoría (campos: id, label?, section?, sort_order?)
- delete: eliminar categoría`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'add', 'update', 'delete'] },
      id: { type: 'string' }, label: { type: 'string' },
      section: { type: 'string', enum: ['competencias', 'tecnico', 'blandas'] },
      sort_order: { type: 'number' },
    },
    required: ['action'],
  },
  execute: async (args, _uid, _cfg) => {
    const act = args.action as string;
    if (act === 'list') return JSON.stringify(await db.all('SELECT * FROM evaluation_categories ORDER BY section, sort_order'));
    if (act === 'add') {
      if (!args.id || !args.label || !args.section) return JSON.stringify({ error: 'Campos obligatorios: id, label, section' });
      try {
        await db.run('INSERT INTO evaluation_categories (id, label, section, is_technical_subcategory, sort_order) VALUES(?,?,?,?,?)',
          [args.id, args.label, args.section, 0, args.sort_order || 0]);
        return JSON.stringify({ ok: true, msg: `Categoría "${args.label}" creada` });
      } catch (e: any) { if (e.code === 'ER_DUP_ENTRY') return JSON.stringify({ error: 'Ya existe una categoría con ese ID' }); return JSON.stringify({ error: e.message }); }
    }
    if (act === 'update') {
      if (!args.id) return JSON.stringify({ error: 'Falta id' });
      const updates: string[] = [];
      const vals: unknown[] = [];
      if (args.label !== undefined) { updates.push('label=?'); vals.push(args.label); }
      if (args.section !== undefined) { updates.push('section=?'); vals.push(args.section); }
      if (args.sort_order !== undefined) { updates.push('sort_order=?'); vals.push(Number(args.sort_order)); }
      if (updates.length === 0) return JSON.stringify({ error: 'Sin cambios' });
      vals.push(args.id);
      await db.run(`UPDATE evaluation_categories SET ${updates.join(', ')} WHERE id=?`, vals);
      return JSON.stringify({ ok: true, msg: 'Categoría actualizada' });
    }
    if (act === 'delete') {
      if (!args.id) return JSON.stringify({ error: 'Falta id' });
      await db.run('DELETE FROM evaluation_categories WHERE id=?', [args.id]);
      return JSON.stringify({ ok: true, msg: 'Categoría eliminada' });
    }
    return JSON.stringify({ error: 'Acción desconocida' });
  },
};

// ─── SECTION WEIGHTS ─────────────────────────────────────────────────────────
export const sectionWeightsTool: Tool = {
  name: 'section_weights',
  description: `Pesos de sección por posición (section_weights). Acciones:
- list: todos los pesos
- get: pesos de una posición
- update: actualizar pesos de una posición (tecnico, competencias, blandas deben sumar 100%)`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'get', 'update'] },
      position: { type: 'string' },
      tecnico: { type: 'number' }, competencias: { type: 'number' }, blandas: { type: 'number' },
    },
    required: ['action'],
  },
  execute: async (args, _uid, _cfg) => {
    const act = args.action as string;
    if (act === 'list') return JSON.stringify(await db.all('SELECT * FROM section_weights ORDER BY position'));
    if (act === 'get') {
      if (!args.position) return JSON.stringify({ error: 'Falta position' });
      const sw = await db.get('SELECT * FROM section_weights WHERE position=?', [args.position]);
      return sw ? JSON.stringify(sw) : JSON.stringify({ error: 'Posición sin pesos configurados' });
    }
    if (act === 'update') {
      if (!args.position) return JSON.stringify({ error: 'Falta position' });
      const current = await db.get('SELECT * FROM section_weights WHERE position=?', [args.position]) as any;
      const tec = Number(args.tecnico ?? current?.tecnico ?? 0);
      const comp = Number(args.competencias ?? current?.competencias ?? 80);
      const bland = Number(args.blandas ?? current?.blandas ?? 20);
      const total = tec + comp + bland;
      if (total !== 100) return JSON.stringify({ error: `Pesos deben sumar 100%. Actual: ${tec}+${comp}+${bland}=${total}%`, current: { tecnico: tec, competencias: comp, blandas: bland } });
      // Oops — use bland not blandas variable for the check message
      if (current) {
        await db.run('UPDATE section_weights SET tecnico=?, competencias=?, blandas=? WHERE position=?', [tec, comp, bland, args.position]);
      } else {
        await db.run('INSERT INTO section_weights (position, tecnico, competencias, blandas) VALUES(?,?,?,?)', [args.position, tec, comp, bland]);
      }
      return JSON.stringify({ ok: true, msg: `Pesos actualizados: T=${tec}% C=${comp}% B=${bland}%` });
    }
    return JSON.stringify({ error: 'Acción desconocida' });
  },
};

// ─── POSITION CONFIG ────────────────────────────────────────────────────────
export const positionConfigTool: Tool = {
  name: 'position_config',
  description: `Configuración de posiciones y jerarquía (position_config). Acciones:
- list: listar todas las posiciones (filtro: level, is_active)
- get: obtener detalle de una posición
- hierarchy: obtener jerarquía completa (legal y administrativo) desde la DB
- update: actualizar label, position_rank, sort_order de una posición
- add: crear nueva posición en la configuración
- deactivate: desactivar una posición`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'get', 'hierarchy', 'update', 'add', 'deactivate'] },
      position: { type: 'string' },
      level: { type: 'string', description: 'Filter: legal, administrativo' },
      is_active: { type: 'string', description: 'Filter: true or false' },
      label: { type: 'string', description: 'Position label' },
      rank: { type: 'number', description: 'Hierarchy rank (lower = higher in hierarchy)' },
      sort_order: { type: 'number' },
    },
    required: ['action'],
  },
  execute: async (args, _uid, _cfg) => {
    const act = args.action as string;
    try {
      if (act === 'list') {
        let s = 'SELECT position, label, level, position_rank, sort_order, is_active FROM position_config WHERE 1=1';
        const p: unknown[] = [];
        if (args.level) { s += ' AND level=?'; p.push(args.level); }
        if (args.is_active !== undefined) { s += ' AND is_active=?'; p.push(args.is_active === 'true' || args.is_active === '1' ? 1 : 0); }
        s += ' ORDER BY level, position_rank, sort_order';
        return JSON.stringify(await db.all(s, p));
      }
      if (act === 'get') {
        const pos = await db.get('SELECT * FROM position_config WHERE position=?', [args.position]);
        return pos ? JSON.stringify(pos) : JSON.stringify({ error: 'Posición no encontrada' });
      }
      if (act === 'hierarchy') {
        const legal = await db.all("SELECT position, label, position_rank FROM position_config WHERE level='legal' AND is_active=1 ORDER BY position_rank, sort_order");
        const admin = await db.all("SELECT position, label, position_rank FROM position_config WHERE level='administrativo' AND is_active=1 ORDER BY position_rank, sort_order");
        return JSON.stringify({ legal, administrativo: admin });
      }
      if (act === 'update') {
        if (!args.position) return JSON.stringify({ error: 'Se requiere position' });
        const updates: string[] = [];
        const vals: unknown[] = [];
        if (args.label) { updates.push('label=?'); vals.push(args.label); }
        if (args.rank !== undefined) { updates.push('position_rank=?'); vals.push(Number(args.rank)); }
        if (args.sort_order !== undefined) { updates.push('sort_order=?'); vals.push(Number(args.sort_order)); }
        if (updates.length === 0) return JSON.stringify({ error: 'Nada que actualizar' });
        vals.push(args.position);
        await db.run(`UPDATE position_config SET ${updates.join(', ')} WHERE position=?`, vals);
        return JSON.stringify({ ok: true, msg: 'Posición actualizada' });
      }
      if (act === 'add') {
        if (!args.position || !args.label || !args.level) return JSON.stringify({ error: 'Se requiere position, label, level' });
        const rank = Number(args.rank) || 99;
        const sortOrder = Number(args.sort_order) || 99;
        const exists = await db.get('SELECT position FROM position_config WHERE position=?', [args.position]);
        if (exists) return JSON.stringify({ error: 'Posición ya existe' });
        await db.run('INSERT INTO position_config (position, label, level, position_rank, sort_order, is_active) VALUES(?,?,?,?,?,1)', [args.position, args.label, args.level, rank, sortOrder]);
        return JSON.stringify({ ok: true, msg: 'Posición creada' });
      }
      if (act === 'deactivate') {
        if (!args.position) return JSON.stringify({ error: 'Se requiere position' });
        await db.run('UPDATE position_config SET is_active=0 WHERE position=?', [args.position]);
        return JSON.stringify({ ok: true, msg: 'Posición desactivada' });
      }
      return JSON.stringify({ error: 'Acción desconocida' });
    } catch (e: any) { return JSON.stringify({ error: e.message }); }
  },
};
