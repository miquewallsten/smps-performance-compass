/**
 * Analytics Refresh Service
 *
 * Refreshes pre-computed analytics tables from transactional data.
 * Called on startup and periodically (every 30 minutes in production).
 */
import { db } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';

export async function refreshAnalytics(): Promise<void> {
  console.log('[Analytics] Refreshing analytics tables...');
  const startTime = Date.now();

  try {
    // 1. Refresh evaluation summary
    await refreshEvaluationSummary();
    
    // 2. Refresh period summary
    await refreshPeriodSummary();
    
    // 3. Refresh user activity
    await refreshUserActivity();
    
    const elapsed = Date.now() - startTime;
    console.log(`[Analytics] Refresh completed in ${elapsed}ms`);
  } catch (err) {
    console.error('[Analytics] Refresh error:', err);
  }
}

async function refreshEvaluationSummary(): Promise<void> {
  try {
    // Clear and rebuild
    await db.run('DELETE FROM analytics_evaluation_summary');

    const evaluations = await db.all(`
      SELECT e.id, e.evaluator_id, e.evaluated_id, e.type, e.period, e.total_score,
             e.completed_at, e.feedback_completed,
             ev.name as evaluated_name, ev.position as evaluated_position, ev.practice_area as evaluated_practice_area,
             er.name as evaluator_name
      FROM evaluations e
      JOIN users ev ON ev.id = e.evaluated_id
      LEFT JOIN users er ON er.id = e.evaluator_id
    `);

    for (const e of evaluations as any[]) {
      const responseCount = await db.get(
        'SELECT COUNT(*) as cnt FROM evaluation_responses WHERE evaluation_id = ?', [e.id]
      );
      const naCount = await db.get(
        'SELECT COUNT(*) as cnt FROM evaluation_responses WHERE evaluation_id = ? AND not_applicable = 1', [e.id]
      );

      await db.run(
        `INSERT INTO analytics_evaluation_summary 
         (id, evaluation_id, period, evaluated_id, evaluated_name, evaluated_position, evaluated_practice_area,
          evaluator_id, evaluator_name, eval_type, total_score, completed_at, feedback_completed, response_count, na_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), e.id, e.period, e.evaluated_id, e.evaluated_name, e.evaluated_position, e.evaluated_practice_area,
         e.evaluator_id, e.evaluator_name, e.type, e.total_score, e.completed_at, e.feedback_completed ? 1 : 0,
         (responseCount as any)?.cnt || 0, (naCount as any)?.cnt || 0]
      );
    }
    console.log(`[Analytics] Refreshed ${evaluations.length} evaluation summaries`);
  } catch (err) {
    console.error('[Analytics] Evaluation summary refresh error:', err);
  }
}

async function refreshPeriodSummary(): Promise<void> {
  try {
    const periods = await db.all('SELECT DISTINCT period FROM evaluations ORDER BY period');
    
    for (const p of periods as any[]) {
      const period = p.period;
      
      const totalUsers = await db.get('SELECT COUNT(*) as cnt FROM users WHERE is_active = 1 AND is_super_user = 0');
      const totalEvaluated = await db.get(
        'SELECT COUNT(DISTINCT evaluated_id) as cnt FROM evaluations WHERE period = ? AND type = "supervisor" AND completed_at IS NOT NULL', [period]
      );
      const selfCompleted = await db.get(
        'SELECT COUNT(DISTINCT evaluator_id) as cnt FROM evaluations WHERE period = ? AND type = "self" AND completed_at IS NOT NULL', [period]
      );
      const supCompleted = await db.get(
        'SELECT COUNT(DISTINCT evaluated_id) as cnt FROM evaluations WHERE period = ? AND type = "supervisor" AND completed_at IS NOT NULL', [period]
      );
      const feedbackCompleted = await db.get(
        'SELECT COUNT(DISTINCT evaluated_id) as cnt FROM evaluations WHERE period = ? AND feedback_completed = 1', [period]
      );
      const actionPlansCreated = await db.get(
        'SELECT COUNT(*) as cnt FROM action_plans WHERE period = ?', [period]
      );
      const avgSelf = await db.get(
        'SELECT AVG(total_score) as avg FROM evaluations WHERE period = ? AND type = "self" AND completed_at IS NOT NULL', [period]
      );
      const avgSup = await db.get(
        'SELECT AVG(total_score) as avg FROM evaluations WHERE period = ? AND type = "supervisor" AND completed_at IS NOT NULL', [period]
      );
      const overallAvg = await db.get(
        'SELECT AVG(total_score) as avg FROM evaluations WHERE period = ? AND completed_at IS NOT NULL', [period]
      );
      
      const totalEmps = (totalUsers as any)?.cnt || 0;
      const totalEval = (totalEvaluated as any)?.cnt || 0;
      const completionRate = totalEmps > 0 ? Math.round((totalEval / totalEmps) * 100) : 0;
      
      // Get period dates from period_configs
      const periodConfig = await db.get('SELECT * FROM period_configs WHERE period = ?', [period]) as any;
      
      await db.run(
        `INSERT INTO analytics_period_summary 
         (period, total_employees, total_evaluated, self_eval_completed, supervisor_eval_completed,
          feedback_completed, action_plans_created, avg_self_score, avg_supervisor_score, avg_overall_score,
          completion_rate, self_start, self_end, supervisor_start, supervisor_end, action_plan_end)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         total_employees=VALUES(total_employees), total_evaluated=VALUES(total_evaluated),
         self_eval_completed=VALUES(self_eval_completed), supervisor_eval_completed=VALUES(supervisor_eval_completed),
         feedback_completed=VALUES(feedback_completed), action_plans_created=VALUES(action_plans_created),
         avg_self_score=VALUES(avg_self_score), avg_supervisor_score=VALUES(avg_supervisor_score),
         avg_overall_score=VALUES(avg_overall_score), completion_rate=VALUES(completion_rate),
         self_start=VALUES(self_start), self_end=VALUES(self_end),
         supervisor_start=VALUES(supervisor_start), supervisor_end=VALUES(supervisor_end),
         action_plan_end=VALUES(action_plan_end)`,
        [period, totalEmps, totalEval,
         (selfCompleted as any)?.cnt || 0, (supCompleted as any)?.cnt || 0,
         (feedbackCompleted as any)?.cnt || 0, (actionPlansCreated as any)?.cnt || 0,
         (avgSelf as any)?.avg ? Math.round((avgSelf as any).avg * 10) / 10 : null,
         (avgSup as any)?.avg ? Math.round((avgSup as any).avg * 10) / 10 : null,
         (overallAvg as any)?.avg ? Math.round((overallAvg as any).avg * 10) / 10 : null,
         completionRate,
         periodConfig?.self_start || null, periodConfig?.self_end || null,
         periodConfig?.supervisor_start || null, periodConfig?.supervisor_end || null,
         periodConfig?.action_plan_end || null]
      );
    }
    console.log(`[Analytics] Refreshed ${periods.length} period summaries`);
  } catch (err) {
    console.error('[Analytics] Period summary refresh error:', err);
  }
}

async function refreshUserActivity(): Promise<void> {
  try {
    // Get active periods
    const periods = await db.all('SELECT DISTINCT period FROM evaluations ORDER BY period');
    
    for (const p of periods as any[]) {
      const period = p.period;
      
      // Get all active users
      const users = await db.all('SELECT id FROM users WHERE is_active = 1 AND is_super_user = 0');
      
      for (const u of users as any[]) {
        const hasSelfEval = await db.get(
          'SELECT id FROM evaluations WHERE evaluator_id = ? AND type = "self" AND period = ? AND completed_at IS NOT NULL LIMIT 1',
          [u.id, period]
        );
        const hasSupEval = await db.get(
          'SELECT id FROM evaluations WHERE evaluated_id = ? AND type = "supervisor" AND period = ? AND completed_at IS NOT NULL LIMIT 1',
          [u.id, period]
        );
        const hasFeedback = await db.get(
          'SELECT id FROM evaluations WHERE evaluated_id = ? AND feedback_completed = 1 AND period = ? LIMIT 1',
          [u.id, period]
        );
        const hasActionPlan = await db.get(
          'SELECT id FROM action_plans WHERE employee_id = ? AND period = ? LIMIT 1',
          [u.id, period]
        );
        const hasObjectives = await db.get(
          'SELECT id FROM personal_objectives WHERE user_id = ? AND period = ? LIMIT 1',
          [u.id, period]
        );
        const loginInfo = await db.get(
          'SELECT COUNT(*) as cnt, MAX(created_at) as last FROM authentication_audit WHERE user_id = ? AND action = "login_success"',
          [u.id]
        );
        
        await db.run(
          `INSERT INTO analytics_user_activity 
           (id, user_id, period, has_self_eval, has_supervisor_eval, has_feedback, has_action_plan, has_objectives, login_count, last_login)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           has_self_eval=VALUES(has_self_eval), has_supervisor_eval=VALUES(has_supervisor_eval),
           has_feedback=VALUES(has_feedback), has_action_plan=VALUES(has_action_plan),
           has_objectives=VALUES(has_objectives), login_count=VALUES(login_count), last_login=VALUES(last_login)`,
          [uuidv4(), u.id, period,
           hasSelfEval ? 1 : 0, hasSupEval ? 1 : 0, hasFeedback ? 1 : 0,
           hasActionPlan ? 1 : 0, hasObjectives ? 1 : 0,
           (loginInfo as any)?.cnt || 0, (loginInfo as any)?.last || null]
        );
      }
    }
    console.log('[Analytics] Refreshed user activity');
  } catch (err) {
    console.error('[Analytics] User activity refresh error:', err);
  }
}
