import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, tx } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { isAdminOrSocio, isSupervisorOf, getSuperviseeIds } from '../middleware/permissions.js';

const router = Router();

// ─── GET /api/objectives ────────────────────────────────────────────────────
// AUTHZ: Employee sees own + supervisees'. Admin/socio sees all.
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, period } = req.query as Record<string, string>;
    let sql = 'SELECT * FROM personal_objectives WHERE 1=1';
    const params: string[] = [];

    if (isAdminOrSocio(req.user!)) {
      // Admin/socio: see all, optionally filter by userId
      if (userId) { sql += ' AND user_id = ?'; params.push(userId); }
    } else {
      // Employee: see own + supervisees
      const superviseeIds = await getSuperviseeIds(req.user!.id, period);
      const visibleIds = [req.user!.id, ...superviseeIds];
      const placeholders = visibleIds.map(() => '?').join(',');
      sql += ` AND user_id IN (${placeholders})`;
      params.push(...visibleIds);
    }

    if (period) { sql += ' AND period = ?'; params.push(period); }

    const objectives = await db.all(sql, params);
    const result = [];
    for (const obj of objectives) {
      if (obj.type === 'admin') {
        const adminObjs = await db.all('SELECT * FROM admin_objectives WHERE personal_objectives_id = ?', [obj.id]);
        result.push({ ...obj, adminObjectives: adminObjs, legalObjective: null });
      } else {
        const legalObj = await db.get('SELECT * FROM legal_objectives WHERE personal_objectives_id = ?', [obj.id]);
        result.push({ ...obj, adminObjectives: [], legalObjective: legalObj || null });
      }
    }
    return res.json(result);
  } catch (err) {
    console.error('List objectives error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/objectives ──────────────────────────────────────────────────
// AUTHZ: Must be creating for self or supervisor of the user, or admin/socio.
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, period, type, adminObjectives, legalObjective } = req.body;
    if (!userId || !period || !type) {
      return res.status(400).json({ error: 'userId, period, and type are required' });
    }
    if (!['admin', 'legal'].includes(type)) {
      return res.status(400).json({ error: 'Type must be admin or legal' });
    }

    // ─── Authorization check ───
    if (!isAdminOrSocio(req.user!)) {
      const isOwn = userId === req.user!.id;
      const isSup = !isOwn && await isSupervisorOf(req.user!.id, userId, period);
      if (!isOwn && !isSup) {
        return res.status(403).json({ error: 'You can only create objectives for yourself or your direct reports' });
      }
    }

    const existing = await db.get('SELECT * FROM personal_objectives WHERE user_id = ? AND period = ?', [userId, period]);

    const objId = await db.transaction(async (conn) => {
      let objId: string;

      if (existing) {
        objId = (existing as any).id;
        if (type === 'admin') {
          await tx.run(conn, 'DELETE FROM admin_objectives WHERE personal_objectives_id = ?', [objId]);
        } else {
          await tx.run(conn, 'DELETE FROM legal_objectives WHERE personal_objectives_id = ?', [objId]);
        }
      } else {
        objId = uuidv4();
        await tx.run(conn, 'INSERT INTO personal_objectives (id, user_id, period, type) VALUES (?, ?, ?, ?)', [objId, userId, period, type]);
      }

      if (type === 'admin' && adminObjectives && Array.isArray(adminObjectives)) {
        for (const obj of adminObjectives) {
          await tx.run(conn,
            `INSERT INTO admin_objectives (id, personal_objectives_id, tipo_objetivo, nombre_objetivo, pilares_estrategicos, alcance, porcentaje_avance, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), objId, obj.tipoObjetivo || '', obj.nombreObjetivo || '', obj.pilaresEstrategicos || '', obj.alcance || '', obj.porcentajeAvance || 0, obj.status || 'draft']);
        }
      } else if (type === 'legal' && legalObjective) {
        const lo = legalObjective;
        await tx.run(conn,
          `INSERT INTO legal_objectives (id, personal_objectives_id, horas_meta, horas_ajustadas, porcentaje_horas_vs_meta, porcentaje_eficiencia,
           meta_pro_bono, realizado_pro_bono, meta_marketing, realizado_marketing, meta_business_dev, realizado_business_dev,
           meta_mentoring, realizado_mentoring, resultado_area, resultado_firma, porcentaje_total_bono)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), objId, lo.horasMeta || 0, lo.horasAjustadas || 0, lo.porcentajeHorasVsMeta || 0, lo.porcentajeEficiencia || 0,
          lo.metaProBono || 0, lo.realizadoProBono || 0, lo.metaMarketing || 0, lo.realizadoMarketing || 0,
          lo.metaBusinessDev || 0, lo.realizadoBusinessDev || 0, lo.metaMentoring || 0, lo.realizadoMentoring || 0,
          lo.resultadoArea || 0, lo.resultadoFirma || 0, lo.porcentajeTotalBono || 0]);
      }

      return objId;
    });

    const obj = await db.get('SELECT * FROM personal_objectives WHERE id = ?', [objId]);
    if ((obj as any).type === 'admin') {
      const adminObjs = await db.all('SELECT * FROM admin_objectives WHERE personal_objectives_id = ?', [objId]);
      return res.json({ ...obj, adminObjectives: adminObjs, legalObjective: null });
    } else {
      const legalObj = await db.get('SELECT * FROM legal_objectives WHERE personal_objectives_id = ?', [objId]);
      return res.json({ ...obj, adminObjectives: [], legalObjective: legalObj || null });
    }
  } catch (err) {
    console.error('Create objectives error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/objectives/:id/submit ───────────────────────────────────────
// AUTHZ: Must be the owner of the objectives, or admin/socio.
router.post('/:id/submit', authMiddleware, async (req: Request, res: Response) => {
  try {
    const obj = await db.get('SELECT * FROM personal_objectives WHERE id = ?', [req.params.id]) as any;
    if (!obj) return res.status(404).json({ error: 'Objectives not found' });

    // ─── Authorization check ───
    if (!isAdminOrSocio(req.user!)) {
      if (obj.user_id !== req.user!.id) {
        const isSup = await isSupervisorOf(req.user!.id, obj.user_id, obj.period);
        if (!isSup) {
          return res.status(403).json({ error: 'You can only submit your own objectives' });
        }
      }
    }

    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    await db.run("UPDATE admin_objectives SET status = 'pending', submitted_at = ? WHERE personal_objectives_id = ? AND status = 'draft'",
      [now, req.params.id]);

    const adminObjs = await db.all('SELECT * FROM admin_objectives WHERE personal_objectives_id = ?', [req.params.id]);
    return res.json({ ...obj, adminObjectives: adminObjs, legalObjective: null });
  } catch (err) {
    console.error('Submit objectives error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/objectives/:id/review ───────────────────────────────────────
// AUTHZ: Must be supervisor of the user, or admin/super_user. Socio cannot review (read-only).
router.post('/:id/review', authMiddleware, async (req: Request, res: Response) => {
  try {
    const obj = await db.get('SELECT * FROM personal_objectives WHERE id = ?', [req.params.id]) as any;
    if (!obj) return res.status(404).json({ error: 'Objectives not found' });

    // ─── Authorization check: supervisor or admin only (not socio for write actions) ───
    if (req.user!.role !== 'super_user' && req.user!.role !== 'admin') {
      const isSup = await isSupervisorOf(req.user!.id, obj.user_id, obj.period);
      if (!isSup) {
        return res.status(403).json({ error: 'Only the supervisor or an administrator can review objectives' });
      }
    }

    const { objectiveId, status, comment } = req.body;
    if (!objectiveId || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'objectiveId and valid status (approved/rejected) are required' });
    }

    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    await db.run('UPDATE admin_objectives SET status = ?, reviewed_by = ?, reviewed_at = ?, reviewer_comment = ? WHERE id = ?',
      [status, req.user!.id, now, comment || null, objectiveId]);

    const adminObjs = await db.all('SELECT * FROM admin_objectives WHERE personal_objectives_id = ?', [req.params.id]);
    return res.json({ ...obj, adminObjectives: adminObjs, legalObjective: null });
  } catch (err) {
    console.error('Review objectives error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
