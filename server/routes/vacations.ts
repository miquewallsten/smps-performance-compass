import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, tx } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { isAdminOrSocio, isSupervisorOf, getSuperviseeIds } from '../middleware/permissions.js';

import { createNotification } from '../services/notifications.js';

const router = Router();

// ─── GET /api/vacations/requests ───────────────────────────────────────────
// AUTHZ: Employee sees own + supervisees'. Admin/socio sees all.
router.get('/requests', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, status } = req.query as Record<string, string>;
    let sql = 'SELECT * FROM vacation_requests WHERE 1=1';
    const params: string[] = [];

    if (isAdminOrSocio(req.user!)) {
      // Admin/socio: see all, optionally filter
      if (userId) { sql += ' AND user_id = ?'; params.push(userId); }
    } else {
      // Employee: see own + supervisees
      const superviseeIds = await getSuperviseeIds(req.user!.id);
      const visibleIds = [req.user!.id, ...superviseeIds];
      const placeholders = visibleIds.map(() => '?').join(',');
      sql += ` AND user_id IN (${placeholders})`;
      params.push(...visibleIds);
    }

    if (status) { sql += ' AND status = ?'; params.push(status); }

    const requests = await db.all(sql, params);
    const result = await Promise.all(requests.map(async (r: any) => {
      const approvals = await db.all('SELECT * FROM vacation_approvals WHERE vacation_request_id = ?', [r.id]);
      return { ...r, approvals };
    }));
    return res.json(result);
  } catch (err) {
    console.error('List vacation requests error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/vacations/requests ──────────────────────────────────────────
// AUTHZ: Must be creating for self or supervisor of user, or admin/socio.
router.post('/requests', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, startDate, endDate, days, reason, period } = req.body;
    if (!userId || !startDate || !endDate || !days) {
      return res.status(400).json({ error: 'userId, startDate, endDate, and days are required' });
    }

    // ─── Authorization check ───
    if (!isAdminOrSocio(req.user!)) {
      if (userId !== req.user!.id) {
        const isSup = await isSupervisorOf(req.user!.id, userId);
        if (!isSup) {
          return res.status(403).json({ error: 'You can only create vacation requests for yourself or your direct reports' });
        }
      }
    }

    const id = uuidv4();
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    await db.run(
      'INSERT INTO vacation_requests (id, user_id, start_date, end_date, days, reason, status, created_at, period) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId, startDate, endDate, days, reason || '', 'pending', now, period || null]
    );

    const request = await db.get('SELECT * FROM vacation_requests WHERE id = ?', [id]);

    // Notify supervisor(s) about pending vacation approval
    const supervisors = await db.all(
      'SELECT supervisor_id FROM supervisor_assignments WHERE employee_id = ?',
      [userId]
    );
    const reqUser = await db.get('SELECT name FROM users WHERE id = ?', [userId]);
    for (const sa of supervisors as any[]) {
      await createNotification({
        recipientId: sa.supervisor_id,
        type: 'approval_required',
        category: 'vacation',
        title: `Solicitud de vacaciones — ${(reqUser as any)?.name || 'Empleado'}`,
        body: `Solicitud de ${days} día(s) de vacaciones del ${startDate} al ${endDate}.`,
        actionUrl: '/vacations',
        relatedEntityId: id,
        relatedEntityType: 'vacation_request',
      });
    }

    return res.status(201).json({ ...request, approvals: [] });
  } catch (err) {
    console.error('Create vacation request error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/vacations/requests/:id ──────────────────────────────────────
// AUTHZ: Must be the request owner or supervisor of the owner, or admin/socio.
router.patch('/requests/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const request = await db.get('SELECT * FROM vacation_requests WHERE id = ?', [req.params.id]) as any;
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // ─── Authorization check ───
    if (!isAdminOrSocio(req.user!)) {
      const isOwn = request.user_id === req.user!.id;
      const isSup = !isOwn && await isSupervisorOf(req.user!.id, request.user_id);
      if (!isOwn && !isSup) {
        return res.status(403).json({ error: 'You can only modify your own requests or your direct reports\' requests' });
      }
    }

    const { status, reason } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (reason !== undefined) { updates.push('reason = ?'); params.push(reason); }

    if (updates.length > 0) {
      await db.run(`UPDATE vacation_requests SET ${updates.join(', ')} WHERE id = ?`, [...params, req.params.id]);
    }

    const updated = await db.get('SELECT * FROM vacation_requests WHERE id = ?', [req.params.id]);
    const approvals = await db.all('SELECT * FROM vacation_approvals WHERE vacation_request_id = ?', [req.params.id]);

    // Notify employee about vacation decision
    const actionLabel = action === 'approved' ? 'aprobada' : 'rechazada';
    await createNotification({
      recipientId: request.user_id,
      type: action === 'approved' ? 'info' : 'warning',
      category: 'vacation',
      title: `Vacaciones ${actionLabel}`,
      body: `Su solicitud de vacaciones del ${request.start_date} al ${request.end_date} ha sido ${actionLabel}.`,
      actionUrl: '/vacations',
      relatedEntityId: req.params.id,
      relatedEntityType: 'vacation_request',
    });

    return res.json({ ...updated, approvals });
  } catch (err) {
    console.error('Update vacation request error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/vacations/requests/:id/approve ───────────────────────────────
// AUTHZ: Must be supervisor of the request owner, or admin/super_user. Socio cannot approve.
router.post('/requests/:id/approve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const request = await db.get('SELECT * FROM vacation_requests WHERE id = ?', [req.params.id]) as any;
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // ─── Authorization check: supervisor or admin/super_user only ───
    if (req.user!.role !== 'super_user' && req.user!.role !== 'admin') {
      const isSup = await isSupervisorOf(req.user!.id, request.user_id);
      if (!isSup) {
        return res.status(403).json({ error: 'Only the supervisor or an administrator can approve vacation requests' });
      }
    }

    const { action, comment } = req.body;
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approved or rejected' });
    }

    const id = uuidv4();
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    await db.run(
      'INSERT INTO vacation_approvals (id, vacation_request_id, approver_id, approved_at, action, comment) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.params.id, req.user!.id, now, action, comment || null]
    );

    await db.run('UPDATE vacation_requests SET status = ? WHERE id = ?', [action, req.params.id]);

    const updated = await db.get('SELECT * FROM vacation_requests WHERE id = ?', [req.params.id]);
    const approvals = await db.all('SELECT * FROM vacation_approvals WHERE vacation_request_id = ?', [req.params.id]);

    // Notify employee about vacation decision
    const actionLabel = action === 'approved' ? 'aprobada' : 'rechazada';
    await createNotification({
      recipientId: request.user_id,
      type: action === 'approved' ? 'info' : 'warning',
      category: 'vacation',
      title: `Vacaciones ${actionLabel}`,
      body: `Su solicitud de vacaciones del ${request.start_date} al ${request.end_date} ha sido ${actionLabel}.`,
      actionUrl: '/vacations',
      relatedEntityId: req.params.id,
      relatedEntityType: 'vacation_request',
    });

    return res.json({ ...updated, approvals });
  } catch (err) {
    console.error('Approve vacation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/vacations/requests/:id ──────────────────────────────────────
// AUTHZ: Must be the request owner (and request is pending), or admin/super_user.
router.delete('/requests/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const request = await db.get('SELECT * FROM vacation_requests WHERE id = ?', [req.params.id]) as any;
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // ─── Authorization check ───
    if (req.user!.role !== 'admin' && req.user!.role !== 'super_user') {
      if (request.user_id !== req.user!.id) {
        return res.status(403).json({ error: 'Can only delete your own requests' });
      }
      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Can only delete pending requests' });
      }
    }

    await db.run('DELETE FROM vacation_requests WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Request deleted' });
  } catch (err) {
    console.error('Delete vacation request error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/vacations/config ──────────────────────────────────────────────
router.get('/config', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const config = await db.all('SELECT * FROM vacation_config');
    return res.json(config);
  } catch (err) {
    console.error('Get vacation config error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/vacations/config ─────────────────────────────────────────────
router.patch('/config', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { positions } = req.body;
    if (!Array.isArray(positions)) return res.status(400).json({ error: 'positions array required' });

    for (const p of positions) {
      await db.run(
        'INSERT INTO vacation_config (position, days) VALUES (?, ?) ON DUPLICATE KEY UPDATE days=VALUES(days)',
        [p.position, p.days]
      );
    }

    const config = await db.all('SELECT * FROM vacation_config');
    return res.json(config);
  } catch (err) {
    console.error('Update vacation config error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/vacations/extra-days ──────────────────────────────────────────
router.get('/extra-days', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, period } = req.query as { userId?: string; period?: string };
    const role = normalizeRole(req.user!);

    // Admin/super_user/socio can see all, employees see own only
    if (hasRole(req.user!, ['super_user', 'admin', 'socio'])) {
      let sql = 'SELECT * FROM extra_vacation_days WHERE 1=1';
      const params: string[] = [];
      if (userId) { sql += ' AND user_id = ?'; params.push(userId); }
      if (period) { sql += ' AND period = ?'; params.push(period); }
      const extras = await db.all(sql, params);
      return res.json(extras);
    }

    // Regular employee: see own extra days only
    let sql = 'SELECT * FROM extra_vacation_days WHERE user_id = ?';
    const params: string[] = [req.user!.id];
    if (period) { sql += ' AND period = ?'; params.push(period); }
    const extras = await db.all(sql, params);
    return res.json(extras);
  } catch (err) {
    console.error('Get extra days error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// ─── POST /api/vacations/extra-days ──────────────────────────────────────────
router.post('/extra-days', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, days, reason, period } = req.body;
    if (!userId || !days || !reason || !period) {
      return res.status(400).json({ error: 'userId, days, reason, and period are required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    await db.run(
      'INSERT INTO extra_vacation_days (id, user_id, days, reason, added_by, added_at, period) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, userId, days, reason, req.user!.id, now, period]
    );

    const extra = await db.get('SELECT * FROM extra_vacation_days WHERE id = ?', [id]);
    return res.status(201).json(extra);
  } catch (err) {
    console.error('Add extra days error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
