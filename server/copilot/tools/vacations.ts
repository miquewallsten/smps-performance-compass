/**
 * Tool: vacations — Full vacation management including balances and extra days.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/connection.js';
import { Tool } from '../types.js';
import { nowMySQL } from './helpers.js';

export const vacationsTool: Tool = {
  name: 'vacations',
  description: `Vacaciones. Acciones:
- list: solicitudes de vacaciones (filtro: status, user_id)
- get: detalle de una solicitud
- approve: aprobar solicitud
- reject: rechazar solicitud
- balance: saldo de días de vacaciones de un usuario
- extra_days: días extra otorgados
- add_extra_days: agregar días extra a un usuario`,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'get', 'approve', 'reject', 'balance', 'extra_days', 'add_extra_days'] },
      status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
      id: { type: 'string' },
      user_id: { type: 'string' },
      days: { type: 'number' },
      reason: { type: 'string' },
      period: { type: 'string' },
    },
    required: ['action'],
  },
  execute: async (args, uid, _cfg) => {
    const act = args.action as string;
    try {
      if (act === 'list') {
        const status = args.status || 'pending';
        let sql = 'SELECT v.*, u.name as user_name, u.position FROM vacation_requests v JOIN users u ON v.user_id=u.id WHERE v.status=?';
        const params: unknown[] = [status];
        if (args.user_id) { sql += ' AND v.user_id=?'; params.push(args.user_id); }
        sql += ' ORDER BY v.created_at DESC LIMIT 50';
        return JSON.stringify(await db.all(sql, params));
      }
      if (act === 'get') {
        if (!args.id) return JSON.stringify({ error: 'Falta id' });
        const req = await db.get('SELECT v.*, u.name as user_name FROM vacation_requests v JOIN users u ON v.user_id=u.id WHERE v.id=?', [args.id]);
        if (!req) return JSON.stringify({ error: 'Solicitud no encontrada' });
        const approvals = await db.all('SELECT va.*, u.name as approver_name FROM vacation_approvals va JOIN users u ON va.approver_id=u.id WHERE va.vacation_request_id=?', [args.id]);
        return JSON.stringify({ ...req, approvals });
      }
      if (act === 'approve') {
        if (!args.id) return JSON.stringify({ error: 'Falta id' });
        await db.run('UPDATE vacation_requests SET status=?, updated_at=? WHERE id=?', ['approved', nowMySQL(), args.id]);
        await db.run('INSERT INTO vacation_approvals (id, vacation_request_id, approver_id, action, approved_at) VALUES(?,?,?,?,?)',
          [uuidv4(), args.id, uid, 'approved', nowMySQL()]);
        return JSON.stringify({ ok: true, msg: 'Aprobada' });
      }
      if (act === 'reject') {
        if (!args.id) return JSON.stringify({ error: 'Falta id' });
        await db.run('UPDATE vacation_requests SET status=?, updated_at=? WHERE id=?', ['rejected', nowMySQL(), args.id]);
        await db.run('INSERT INTO vacation_approvals (id, vacation_request_id, approver_id, action, comment, approved_at) VALUES(?,?,?,?,?,?)',
          [uuidv4(), args.id, uid, 'rejected', args.reason || '', nowMySQL()]);
        return JSON.stringify({ ok: true, msg: 'Rechazada' });
      }
      if (act === 'balance') {
        if (!args.user_id) return JSON.stringify({ error: 'Falta user_id' });
        const user = await db.get('SELECT u.id, u.name, u.position FROM users u WHERE u.id=?', [args.user_id]);
        if (!user) return JSON.stringify({ error: 'Usuario no encontrado' });
        // Get days entitlement by position
        const posConfig = await db.get('SELECT position FROM position_config WHERE position=?', [(user as any).position]);
        const entitlementMap: Record<string, number> = {
          socio: 15, salary_partner: 15, counsel: 15, asociado_sr: 15, asociado_mid: 12, asociado_jr: 12,
          pasante_carrera: 6, pasante: 6, director: 15, gerente: 15, coordinador: 12,
          analista: 12, asistente: 12, soporte: 12, archivista: 12,
        };
        const entitlement = entitlementMap[(user as any).position] || 12;
        // Count approved days this year
        const year = new Date().getFullYear();
        const used = (await db.get(
          "SELECT COALESCE(SUM(days),0) as total FROM vacation_requests WHERE user_id=? AND status='approved' AND YEAR(start_date)=?",
          [args.user_id, year]
        ) as any)?.total || 0;
        // Extra days
        const extra = (await db.get(
          'SELECT COALESCE(SUM(days),0) as total FROM extra_vacation_days WHERE user_id=? AND YEAR(added_at)=?',
          [args.user_id, year]
        ) as any)?.total || 0;
        return JSON.stringify({
          user_id: args.user_id, name: (user as any).name, position: (user as any).position,
          entitlement, extra_days: extra, total_available: entitlement + extra,
          used, remaining: entitlement + extra - used,
        });
      }
      if (act === 'extra_days') {
        return JSON.stringify(await db.all(
          'SELECT e.*, u.name as user_name FROM extra_vacation_days e JOIN users u ON e.user_id=u.id ORDER BY e.added_at DESC LIMIT 50'));
      }
      if (act === 'add_extra_days') {
        if (!args.user_id || !args.days || !args.reason) return JSON.stringify({ error: 'Falta user_id, days, reason' });
        const id = uuidv4();
        const period = args.period || new Date().getFullYear().toString();
        await db.run('INSERT INTO extra_vacation_days (id, user_id, days, reason, added_by, added_at, period) VALUES(?,?,?,?,?,?,?)',
          [id, args.user_id, Number(args.days), args.reason, uid, nowMySQL(), period]);
        return JSON.stringify({ ok: true, msg: `${args.days} días extra agregados` });
      }
      return JSON.stringify({ error: 'Acción desconocida' });
    } catch (e: any) {
      return JSON.stringify({ error: e.message });
    }
  },
};
