import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
const router = Router();
// ─── GET /api/objectives ────────────────────────────────────────────────────
router.get('/', authMiddleware, (req, res) => {
    try {
        const { userId, period } = req.query;
        let sql = 'SELECT * FROM personal_objectives WHERE 1=1';
        const params = [];
        if (userId) {
            sql += ' AND user_id = ?';
            params.push(userId);
        }
        if (period) {
            sql += ' AND period = ?';
            params.push(period);
        }
        const objectives = db.prepare(sql).all(...params);
        const result = objectives.map((obj) => {
            if (obj.type === 'admin') {
                const adminObjs = db.prepare('SELECT * FROM admin_objectives WHERE personal_objectives_id = ?').all(obj.id);
                return { ...obj, adminObjectives: adminObjs, legalObjective: null };
            }
            else {
                const legalObj = db.prepare('SELECT * FROM legal_objectives WHERE personal_objectives_id = ?').get(obj.id);
                return { ...obj, adminObjectives: [], legalObjective: legalObj || null };
            }
        });
        return res.json(result);
    }
    catch (err) {
        console.error('List objectives error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ─── POST /api/objectives ──────────────────────────────────────────────────
router.post('/', authMiddleware, (req, res) => {
    try {
        const { userId, period, type, adminObjectives, legalObjective } = req.body;
        if (!userId || !period || !type) {
            return res.status(400).json({ error: 'userId, period, and type are required' });
        }
        if (!['admin', 'legal'].includes(type)) {
            return res.status(400).json({ error: 'Type must be admin or legal' });
        }
        // Check if already exists
        const existing = db.prepare('SELECT * FROM personal_objectives WHERE user_id = ? AND period = ?').get(userId, period);
        const transaction = db.transaction(() => {
            let objId;
            if (existing) {
                objId = existing.id;
                // Delete old nested data
                if (type === 'admin') {
                    db.prepare('DELETE FROM admin_objectives WHERE personal_objectives_id = ?').run(objId);
                }
                else {
                    db.prepare('DELETE FROM legal_objectives WHERE personal_objectives_id = ?').run(objId);
                }
            }
            else {
                objId = uuidv4();
                db.prepare('INSERT INTO personal_objectives (id, user_id, period, type) VALUES (?, ?, ?, ?)').run(objId, userId, period, type);
            }
            if (type === 'admin' && adminObjectives && Array.isArray(adminObjectives)) {
                const insertAdmin = db.prepare(`INSERT INTO admin_objectives (id, personal_objectives_id, tipo_objetivo, nombre_objetivo, pilares_estrategicos, alcance, porcentaje_avance, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
                for (const obj of adminObjectives) {
                    insertAdmin.run(uuidv4(), objId, obj.tipoObjetivo || '', obj.nombreObjetivo || '', obj.pilaresEstrategicos || '', obj.alcance || '', obj.porcentajeAvance || 0, obj.status || 'draft');
                }
            }
            else if (type === 'legal' && legalObjective) {
                const lo = legalObjective;
                db.prepare(`INSERT INTO legal_objectives (id, personal_objectives_id, horas_meta, horas_ajustadas, porcentaje_horas_vs_meta, porcentaje_eficiencia,
           meta_pro_bono, realizado_pro_bono, meta_marketing, realizado_marketing, meta_business_dev, realizado_business_dev,
           meta_mentoring, realizado_mentoring, resultado_area, resultado_firma, porcentaje_total_bono)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(uuidv4(), objId, lo.horasMeta || 0, lo.horasAjustadas || 0, lo.porcentajeHorasVsMeta || 0, lo.porcentajeEficiencia || 0, lo.metaProBono || 0, lo.realizadoProBono || 0, lo.metaMarketing || 0, lo.realizadoMarketing || 0, lo.metaBusinessDev || 0, lo.realizadoBusinessDev || 0, lo.metaMentoring || 0, lo.realizadoMentoring || 0, lo.resultadoArea || 0, lo.resultadoFirma || 0, lo.porcentajeTotalBono || 0);
            }
            return objId;
        });
        const objId = transaction();
        const obj = db.prepare('SELECT * FROM personal_objectives WHERE id = ?').get(objId);
        if (obj.type === 'admin') {
            const adminObjs = db.prepare('SELECT * FROM admin_objectives WHERE personal_objectives_id = ?').all(objId);
            return res.json({ ...obj, adminObjectives: adminObjs, legalObjective: null });
        }
        else {
            const legalObj = db.prepare('SELECT * FROM legal_objectives WHERE personal_objectives_id = ?').get(objId);
            return res.json({ ...obj, adminObjectives: [], legalObjective: legalObj || null });
        }
    }
    catch (err) {
        console.error('Create objectives error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ─── POST /api/objectives/:id/submit ───────────────────────────────────────
router.post('/:id/submit', authMiddleware, (req, res) => {
    try {
        const obj = db.prepare('SELECT * FROM personal_objectives WHERE id = ?').get(req.params.id);
        if (!obj)
            return res.status(404).json({ error: 'Objectives not found' });
        const now = new Date().toISOString();
        db.prepare("UPDATE admin_objectives SET status = 'pending', submitted_at = ? WHERE personal_objectives_id = ? AND status = 'draft'")
            .run(now, req.params.id);
        const adminObjs = db.prepare('SELECT * FROM admin_objectives WHERE personal_objectives_id = ?').all(req.params.id);
        return res.json({ ...obj, adminObjectives: adminObjs, legalObjective: null });
    }
    catch (err) {
        console.error('Submit objectives error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ─── POST /api/objectives/:id/review ───────────────────────────────────────
router.post('/:id/review', authMiddleware, (req, res) => {
    try {
        const obj = db.prepare('SELECT * FROM personal_objectives WHERE id = ?').get(req.params.id);
        if (!obj)
            return res.status(404).json({ error: 'Objectives not found' });
        const { objectiveId, status, comment } = req.body;
        if (!objectiveId || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'objectiveId and valid status (approved/rejected) are required' });
        }
        const now = new Date().toISOString();
        db.prepare('UPDATE admin_objectives SET status = ?, reviewed_by = ?, reviewed_at = ?, reviewer_comment = ? WHERE id = ?')
            .run(status, req.user.id, now, comment || null, objectiveId);
        const adminObjs = db.prepare('SELECT * FROM admin_objectives WHERE personal_objectives_id = ?').all(req.params.id);
        return res.json({ ...obj, adminObjectives: adminObjs, legalObjective: null });
    }
    catch (err) {
        console.error('Review objectives error:', err);
        return res.status(500).json({ error: 'Internal server server' });
    }
});
export default router;
//# sourceMappingURL=objectives.js.map