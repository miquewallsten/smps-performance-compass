/**
 * Tool: users — User management (list, search, create, batch, roles, activate/deactivate, assign supervisors).
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/connection.js';
import { hashPassword } from '../../auth/security.js';
import { Tool, USER_FIELDS } from '../types.js';

export const usersTool: Tool = {
  name: 'users',
  description: 'Gestión de usuarios. Acciones: list, search, get, create, batch_create, update_role, deactivate, activate, assign_supervisor.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'search', 'get', 'create', 'batch_create', 'update_role', 'deactivate', 'activate', 'assign_supervisor'] },
      id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' },
      position: { type: 'string' }, practice_area: { type: 'string' }, password: { type: 'string' },
      role: { type: 'string', enum: ['admin', 'super_user', 'managing_partner'] },
      q: { type: 'string', description: 'Search query' },
      active: { type: 'string', description: 'true or false' }, is_admin: { type: 'string', description: 'true or false' },
      is_managing_partner: { type: 'string', description: 'true or false' },
      users: { type: 'array', items: { type: 'object' } },
      employee_id: { type: 'string' }, supervisor_id: { type: 'string' }, period: { type: 'string' },
      custom_position_id: { type: 'string' }, location_id: { type: 'string' },
    },
    required: ['action'],
  },
  execute: async (args, uid, _cfg) => {
    const act = args.action as string;
    if (act === 'list') {
      let s = `SELECT ${USER_FIELDS} FROM users WHERE 1=1`;
      const p: unknown[] = [];
      if (args.role === 'admin') s += ' AND is_admin=1';
      if (args.role === 'super_user') s += ' AND is_super_user=1';
      if (args.role === 'managing_partner') s += ' AND is_managing_partner=1';
      const activeVal = typeof args.active === 'string' ? (args.active === 'true' || args.active === '1') : args.active;
      if (activeVal !== undefined) { s += ' AND is_active=?'; p.push(activeVal ? 1 : 0); }
      if (args.position) { s += ' AND position=?'; p.push(args.position); }
      return JSON.stringify(await db.all(s, p));
    }
    if (act === 'search') return JSON.stringify(await db.all('SELECT id,name,email,position,is_admin,is_managing_partner,is_active FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 50', [`%${args.q}%`, `%${args.q}%`]));
    if (act === 'get') { const u = await db.get(`SELECT ${USER_FIELDS} FROM users WHERE id=?`, [args.id]); return u ? JSON.stringify(u) : JSON.stringify({ error: 'No encontrado' }); }
    if (act === 'create') {
      if (!args.name || !args.email || !args.position || !args.password) return JSON.stringify({ error: 'Campos obligatorios: name, email, position, password' });
      if ((args.password as string).length < 6) return JSON.stringify({ error: 'Contraseña min 6' });
      const ex = await db.get('SELECT id FROM users WHERE email=?', [args.email]);
      if (ex) return JSON.stringify({ error: 'Email ya existe' });
      const isAdmin = typeof args.is_admin === 'string' ? (args.is_admin === 'true' || args.is_admin === '1') : !!args.is_admin;
      const isMP = typeof args.is_managing_partner === 'string' ? (args.is_managing_partner === 'true' || args.is_managing_partner === '1') : !!args.is_managing_partner;
      if (isMP) { const currentMPs = await db.all('SELECT id, name FROM users WHERE is_managing_partner = 1 AND is_super_user = 0'); if (currentMPs.length >= 1) return JSON.stringify({ error: `Solo puede haber 1 Socio Administrador. Actualmente es ${currentMPs[0].name}` }); }
      if (isAdmin && !isMP) { const maxAdmCfg = await db.get('SELECT max_admin_users FROM system_status WHERE id=1') as any; const maxAdm = maxAdmCfg?.max_admin_users || 3; const currentAdmins = await db.all('SELECT id FROM users WHERE is_admin = 1 AND is_super_user = 0'); if (currentAdmins.length >= maxAdm) return JSON.stringify({ error: `Máximo ${maxAdm} Usuario Administrador permitidos` }); }
      const id = uuidv4(), hp = await hashPassword(args.password as string), now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
      let derivedPosition = args.position as string;
      let derivedArea = (args.practice_area as string) || null;
      if (args.custom_position_id) {
        const posRow = await db.get('SELECT cp.base_position, cp.work_area_id, wa.level FROM custom_positions cp JOIN work_areas wa ON cp.work_area_id = wa.id WHERE cp.id = ?', [args.custom_position_id]);
        if (posRow) { derivedPosition = posRow.base_position; derivedArea = posRow.level === 'legal' ? posRow.work_area_id : null; }
      }
      await db.run('INSERT INTO users (id,email,password_hash,security_question,security_answer,name,position,practice_area,custom_position_id,location_id,is_admin,is_super_user,is_managing_partner,is_active,must_change_password,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [id, args.email, hp, '¿Email?', args.email, args.name, derivedPosition, derivedArea, (args.custom_position_id as string) || null, (args.location_id as string) || null, isAdmin ? 1 : 0, 0, isMP ? 1 : 0, 1, 1, now, now]);
      return JSON.stringify({ ok: true, msg: `"${args.name}" creado`, id });
    }
    if (act === 'batch_create') {
      const us = args.users as Record<string, unknown>[];
      const r: Record<string, unknown>[] = [];
      for (const u of us) {
        if (!u.name || !u.email || !u.position || !u.password) { r.push({ email: u.email, error: 'Faltan campos' }); continue; }
        const ex = await db.get('SELECT id FROM users WHERE email=?', [u.email]);
        if (ex) { r.push({ email: u.email, error: 'Ya existe' }); continue; }
        const id = uuidv4(), hp = await hashPassword(u.password as string), now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
        let bPosition = u.position as string;
        let bArea = (u.practice_area as string) || null;
        if (u.custom_position_id) {
          const posRow = await db.get('SELECT cp.base_position, cp.work_area_id, wa.level FROM custom_positions cp JOIN work_areas wa ON cp.work_area_id = wa.id WHERE cp.id = ?', [u.custom_position_id]);
          if (posRow) { bPosition = posRow.base_position; bArea = posRow.level === 'legal' ? posRow.work_area_id : null; }
        }
        const isAdmin = typeof u.is_admin === 'string' ? (u.is_admin === 'true' || u.is_admin === '1') : !!u.is_admin;
        await db.run('INSERT INTO users (id,email,password_hash,security_question,security_answer,name,position,practice_area,custom_position_id,location_id,is_admin,is_super_user,is_managing_partner,is_active,must_change_password,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          [id, u.email, hp, '¿Email?', u.email, u.name, bPosition, bArea, (u.custom_position_id as string) || null, (u.location_id as string) || null, isAdmin ? 1 : 0, 0, 0, 1, 1, now, now]);
        r.push({ email: u.email, ok: true, id });
      }
      return JSON.stringify({ msg: `${r.filter(x => x.ok).length}/${us.length} creados`, results: r });
    }
    if (act === 'update_role') {
      if (!args.id) return JSON.stringify({ error: 'Falta id' });
      const user = await db.get(`SELECT ${USER_FIELDS}, is_super_user as is_super_user_raw, is_admin as is_admin_raw, is_managing_partner as is_managing_partner_raw FROM users WHERE id=?`, [args.id]);
      if (!user) return JSON.stringify({ error: 'No encontrado' });
      const isAdmin = typeof args.is_admin === 'string' ? (args.is_admin === 'true' || args.is_admin === '1') : !!args.is_admin;
      const isMP = typeof args.is_managing_partner === 'string' ? (args.is_managing_partner === 'true' || args.is_managing_partner === '1') : !!args.is_managing_partner;
      if (isMP) { const currentMPs = await db.all('SELECT id, name FROM users WHERE is_managing_partner = 1 AND is_super_user = 0 AND id != ?', [args.id]); if (currentMPs.length >= 1) return JSON.stringify({ error: `Solo puede haber 1 Socio Administrador. Actualmente es ${currentMPs[0].name}` }); }
      if (isAdmin && !isMP) { const maxAdmCfg = await db.get('SELECT max_admin_users FROM system_status WHERE id=1') as any; const maxAdm = maxAdmCfg?.max_admin_users || 3; const currentAdmins = await db.all('SELECT id FROM users WHERE is_admin = 1 AND is_super_user = 0 AND id != ?', [args.id]); if (currentAdmins.length >= maxAdm) return JSON.stringify({ error: `Máximo ${maxAdm} Usuario Administrador permitidos` }); }
      const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
      if (args.role === 'admin') await db.run('UPDATE users SET is_admin=1, updated_at=? WHERE id=?', [now, args.id]);
      else if (args.role === 'super_user') await db.run('UPDATE users SET is_super_user=1, updated_at=? WHERE id=?', [now, args.id]);
      else if (args.role === 'managing_partner') await db.run('UPDATE users SET is_managing_partner=1, is_admin=1, updated_at=? WHERE id=?', [now, args.id]);
      else if (isMP) await db.run('UPDATE users SET is_managing_partner=?, is_admin=?, updated_at=? WHERE id=?', [isMP ? 1 : 0, isMP ? 1 : 0, now, args.id]);
      else if (isAdmin !== undefined) await db.run('UPDATE users SET is_admin=?, updated_at=? WHERE id=?', [isAdmin ? 1 : 0, now, args.id]);
      return JSON.stringify({ ok: true, msg: 'Rol actualizado' });
    }
    if (act === 'deactivate') {
      if (!args.id) return JSON.stringify({ error: 'Falta id' });
      await db.run('UPDATE users SET is_active=0, updated_at=? WHERE id=?', [new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), args.id]);
      return JSON.stringify({ ok: true, msg: 'Usuario desactivado' });
    }
    if (act === 'activate') {
      if (!args.id) return JSON.stringify({ error: 'Falta id' });
      await db.run('UPDATE users SET is_active=1, updated_at=? WHERE id=?', [new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), args.id]);
      return JSON.stringify({ ok: true, msg: 'Usuario activado' });
    }
    if (act === 'assign_supervisor') {
      if (!args.employee_id || !args.supervisor_id || !args.period) return JSON.stringify({ error: 'Falta employee_id, supervisor_id, period' });
      const id = uuidv4();
      await db.run('INSERT IGNORE INTO supervisor_assignments (id, employee_id, supervisor_id, period) VALUES (?, ?, ?, ?)', [id, args.employee_id, args.supervisor_id, args.period]);
      return JSON.stringify({ ok: true, msg: 'Supervisor asignado' });
    }
    return JSON.stringify({ error: 'Acción desconocida' });
  },
};
