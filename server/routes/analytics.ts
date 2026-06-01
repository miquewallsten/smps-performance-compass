/**
 * Analytics API Routes
 *
 * Provides fast, pre-computed analytics for dashboards and reports.
 * All data comes from analytics_* tables (refreshed periodically).
 */
import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { hasRole, normalizeRole, isSupervisorOf, getSuperviseeIds } from '../middleware/permissions.js';
import { auditLog, getClientIp, getUserAgent } from '../services/audit.js';

const router = Router();

// All analytics routes require authentication
router.use(authMiddleware);

// Helper: get visible user IDs based on role
async function getVisibleUserIds(user: any): Promise<string[] | null> {
  // null means "see all"
  const role = normalizeRole(user);
  if (hasRole(user, ['super_user', 'admin', 'socio'])) return null;
  
  const superviseeIds = await getSuperviseeIds(user.id);
  return [user.id, ...superviseeIds];
}

// ─── GET /api/analytics/overview ────────────────────────────────────
// High-level KPIs for the current period
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string;
    if (!period) return res.status(400).json({ error: 'period query parameter required' });
    
    const summary = await db.get(
      'SELECT * FROM analytics_period_summary WHERE period = ?', [period]
    );
    
    // If no pre-computed summary, compute on the fly
    if (!summary) {
      const totalUsers = await db.get('SELECT COUNT(*) as cnt FROM users WHERE is_active = 1 AND is_super_user = 0');
      const selfCompleted = await db.get(
        'SELECT COUNT(DISTINCT evaluator_id) as cnt FROM evaluations WHERE period = ? AND type = "self" AND completed_at IS NOT NULL', [period]
      );
      const supCompleted = await db.get(
        'SELECT COUNT(DISTINCT evaluated_id) as cnt FROM evaluations WHERE period = ? AND type = "supervisor" AND completed_at IS NOT NULL', [period]
      );
      const feedbackCompleted = await db.get(
        'SELECT COUNT(DISTINCT evaluated_id) as cnt FROM evaluations WHERE period = ? AND feedback_completed = 1', [period]
      );
      const avgScore = await db.get(
        'SELECT AVG(total_score) as avg FROM evaluations WHERE period = ? AND completed_at IS NOT NULL', [period]
      );
      
      return res.json({
        period,
        totalEmployees: (totalUsers as any)?.cnt || 0,
        selfEvalCompleted: (selfCompleted as any)?.cnt || 0,
        supervisorEvalCompleted: (supCompleted as any)?.cnt || 0,
        feedbackCompleted: (feedbackCompleted as any)?.cnt || 0,
        avgScore: (avgScore as any)?.avg ? Math.round((avgScore as any).avg * 10) / 10 : null,
        _source: 'live',
      });
    }
    
    return res.json({ ...summary, _source: 'cached' });
  } catch (err) {
    console.error('Analytics overview error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/analytics/evaluations ────────────────────────────────
// Evaluation analytics with role-based filtering
router.get('/evaluations', async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string;
    if (!period) return res.status(400).json({ error: 'period query parameter required' });
    
    const visibleIds = await getVisibleUserIds(req.user!);
    
    let query = 'SELECT * FROM analytics_evaluation_summary WHERE period = ?';
    const params: any[] = [period];
    
    if (visibleIds) {
      const placeholders = visibleIds.map(() => '?').join(',');
      query += ` AND evaluated_id IN (${placeholders})`;
      params.push(...visibleIds);
    }
    
    const evaluations = await db.all(query, params);
    
    // Compute aggregates
    const total = evaluations.length;
    const completed = evaluations.filter((e: any) => e.completed_at).length;
    const avgScore = completed > 0
      ? Math.round(evaluations.filter((e: any) => e.completed_at).reduce((s: number, e: any) => s + (e.total_score || 0), 0) / completed * 10) / 10
      : null;
    
    // Breakdown by type
    const byType: Record<string, { total: number; completed: number; avgScore: number | null }> = {};
    for (const e of evaluations as any[]) {
      if (!byType[e.eval_type]) byType[e.eval_type] = { total: 0, completed: 0, avgScore: null };
      byType[e.eval_type].total++;
      if (e.completed_at) {
        byType[e.eval_type].completed++;
      }
    }
    for (const type of Object.keys(byType)) {
      const typeEvals = evaluations.filter((e: any) => e.eval_type === type && e.completed_at);
      byType[type].avgScore = typeEvals.length > 0
        ? Math.round(typeEvals.reduce((s: number, e: any) => s + (e.total_score || 0), 0) / typeEvals.length * 10) / 10
        : null;
    }
    
    // Breakdown by position
    const byPosition: Record<string, { total: number; completed: number; avgScore: number | null }> = {};
    for (const e of evaluations as any[]) {
      const pos = e.evaluated_position || 'unknown';
      if (!byPosition[pos]) byPosition[pos] = { total: 0, completed: 0, avgScore: null };
      byPosition[pos].total++;
      if (e.completed_at) byPosition[pos].completed++;
    }
    for (const pos of Object.keys(byPosition)) {
      const posEvals = evaluations.filter((e: any) => e.evaluated_position === pos && e.eval_type === 'self' && e.completed_at);
      byPosition[pos].avgScore = posEvals.length > 0
        ? Math.round(posEvals.reduce((s: number, e: any) => s + (e.total_score || 0), 0) / posEvals.length * 10) / 10
        : null;
    }
    
    return res.json({
      period,
      total,
      completed,
      avgScore,
      byType,
      byPosition,
      evaluations,
      _source: evaluations.length > 0 && (evaluations[0] as any).evaluated_name ? 'cached' : 'live',
    });
  } catch (err) {
    console.error('Analytics evaluations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/analytics/trends ────────────────────────────────────
// Period-over-period trend comparison
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const periods = await db.all(
      'SELECT * FROM analytics_period_summary ORDER BY period DESC LIMIT 10'
    );
    
    // Also get evaluation counts by type per period
    const periodTrends = await db.all(`
      SELECT e.period, e.type, 
             COUNT(*) as total,
             SUM(CASE WHEN e.completed_at IS NOT NULL THEN 1 ELSE 0 END) as completed,
             ROUND(AVG(CASE WHEN e.completed_at IS NOT NULL THEN e.total_score ELSE NULL END), 1) as avg_score
      FROM evaluations e
      GROUP BY e.period, e.type
      ORDER BY e.period ASC, e.type
    `);
    
    return res.json({
      periodSummaries: periods,
      evaluationTrends: periodTrends,
    });
  } catch (err) {
    console.error('Analytics trends error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/analytics/objectives ────────────────────────────────
// Objective completion analytics
router.get('/objectives', async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string;
    const visibleIds = await getVisibleUserIds(req.user!);
    
    let query = 'SELECT po.*, u.name as user_name, u.position FROM personal_objectives po JOIN users u ON po.user_id = u.id WHERE 1=1';
    const params: any[] = [];
    
    if (period) {
      query += ' AND po.period = ?';
      params.push(period);
    }
    
    if (visibleIds) {
      const placeholders = visibleIds.map(() => '?').join(',');
      query += ` AND po.user_id IN (${placeholders})`;
      params.push(...visibleIds);
    }
    
    const objectives = await db.all(query, params);
    
    const total = objectives.length;
    const byStatus: Record<string, number> = {};
    for (const o of objectives as any[]) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    }
    
    return res.json({ period, total, byStatus, objectives });
  } catch (err) {
    console.error('Analytics objectives error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/analytics/vacations ──────────────────────────────────
// Vacation analytics
router.get('/vacations', async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string;
    const visibleIds = await getVisibleUserIds(req.user!);
    
    let query = 'SELECT vr.*, u.name as user_name, u.position FROM vacation_requests vr JOIN users u ON vr.user_id = u.id WHERE 1=1';
    const params: any[] = [];
    
    if (visibleIds) {
      const placeholders = visibleIds.map(() => '?').join(',');
      query += ` AND vr.user_id IN (${placeholders})`;
      params.push(...visibleIds);
    }
    
    const requests = await db.all(query, params);
    
    const total = requests.length;
    const byStatus: Record<string, number> = {};
    let totalDays = 0;
    for (const r of requests as any[]) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      totalDays += r.days || 0;
    }
    
    return res.json({ period, total, byStatus, totalDays, requests });
  } catch (err) {
    console.error('Analytics vacations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/analytics/action-plans ──────────────────────────────
// Action plan analytics
router.get('/action-plans', async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string;
    const visibleIds = await getVisibleUserIds(req.user!);
    
    let query = 'SELECT ap.*, u.name as employee_name, u.position FROM action_plans ap JOIN users u ON ap.employee_id = u.id WHERE 1=1';
    const params: any[] = [];
    
    if (period) {
      query += ' AND ap.period = ?';
      params.push(period);
    }
    
    if (visibleIds) {
      const placeholders = visibleIds.map(() => '?').join(',');
      query += ` AND ap.employee_id IN (${placeholders})`;
      params.push(...visibleIds);
    }
    
    const plans = await db.all(query, params);
    
    const total = plans.length;
    const byStatus: Record<string, number> = {};
    for (const p of plans as any[]) {
      const status = p.approval_status || p.status || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
    }
    
    return res.json({ period, total, byStatus, plans });
  } catch (err) {
    console.error('Analytics action-plans error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
