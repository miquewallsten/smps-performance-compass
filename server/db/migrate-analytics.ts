/**
 * Analytics Tables Migration
 *
 * Creates pre-computed summary tables for fast dashboard and report queries.
 * These tables are refreshed via a scheduled job or on-demand.
 */
import { db } from './connection.js';

export async function migrateAnalytics(): Promise<void> {
  console.log('Running analytics migration...');

  // 1. analytics_evaluation_summary — one row per evaluation with pre-computed data
  try {
    await db.run(`CREATE TABLE IF NOT EXISTS analytics_evaluation_summary (
      id VARCHAR(36) PRIMARY KEY,
      evaluation_id VARCHAR(36) NOT NULL,
      period VARCHAR(50) NOT NULL,
      evaluated_id VARCHAR(36) NOT NULL,
      evaluated_name VARCHAR(255) NOT NULL,
      evaluated_position VARCHAR(50) DEFAULT NULL,
      evaluated_practice_area VARCHAR(100) DEFAULT NULL,
      evaluator_id VARCHAR(36) NOT NULL,
      evaluator_name VARCHAR(255) DEFAULT NULL,
      eval_type VARCHAR(50) NOT NULL,
      total_score DOUBLE DEFAULT 0,
      completed_at DATETIME DEFAULT NULL,
      feedback_completed TINYINT(1) DEFAULT 0,
      response_count INT DEFAULT 0,
      na_count INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_aes_evaluation (evaluation_id),
      KEY idx_aes_period (period),
      KEY idx_aes_evaluated (evaluated_id),
      KEY idx_aes_evaluator (evaluator_id),
      KEY idx_aes_type (eval_type),
      KEY idx_aes_period_type (period, eval_type),
      KEY idx_aes_period_position (period, evaluated_position)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('  ✓ Created analytics_evaluation_summary');
  } catch (err: any) {
    if (err.message?.includes('already exists')) console.log('  ✓ analytics_evaluation_summary already exists');
    else console.error('  ✗ analytics_evaluation_summary:', err.message?.slice(0, 100));
  }

  // 2. analytics_period_summary — one row per period with aggregate KPIs
  try {
    await db.run(`CREATE TABLE IF NOT EXISTS analytics_period_summary (
      period VARCHAR(50) PRIMARY KEY,
      total_employees INT DEFAULT 0,
      total_evaluated INT DEFAULT 0,
      self_eval_completed INT DEFAULT 0,
      supervisor_eval_completed INT DEFAULT 0,
      feedback_completed INT DEFAULT 0,
      action_plans_created INT DEFAULT 0,
      avg_self_score DOUBLE DEFAULT NULL,
      avg_supervisor_score DOUBLE DEFAULT NULL,
      avg_overall_score DOUBLE DEFAULT NULL,
      completion_rate DOUBLE DEFAULT 0,
      self_start DATE DEFAULT NULL,
      self_end DATE DEFAULT NULL,
      supervisor_start DATE DEFAULT NULL,
      supervisor_end DATE DEFAULT NULL,
      action_plan_end DATE DEFAULT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_aps_completion (completion_rate)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('  ✓ Created analytics_period_summary');
  } catch (err: any) {
    if (err.message?.includes('already exists')) console.log('  ✓ analytics_period_summary already exists');
    else console.error('  ✗ analytics_period_summary:', err.message?.slice(0, 100));
  }

  // 3. analytics_user_activity — tracks user login and feature usage
  try {
    await db.run(`CREATE TABLE IF NOT EXISTS analytics_user_activity (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      period VARCHAR(50) DEFAULT NULL,
      has_self_eval TINYINT(1) DEFAULT 0,
      has_supervisor_eval TINYINT(1) DEFAULT 0,
      has_feedback TINYINT(1) DEFAULT 0,
      has_action_plan TINYINT(1) DEFAULT 0,
      has_objectives TINYINT(1) DEFAULT 0,
      login_count INT DEFAULT 0,
      last_login DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_aua_user_period (user_id, period),
      KEY idx_aua_user (user_id),
      KEY idx_aua_period (period)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('  ✓ Created analytics_user_activity');
  } catch (err: any) {
    if (err.message?.includes('already exists')) console.log('  ✓ analytics_user_activity already exists');
    else console.error('  ✗ analytics_user_activity:', err.message?.slice(0, 100));
  }

  // 4. analytics_copilot_views — curated views for safe copilot analytics access
  try {
    await db.run(`CREATE TABLE IF NOT EXISTS analytics_copilot_views (
      id VARCHAR(36) PRIMARY KEY,
      view_name VARCHAR(100) NOT NULL,
      description TEXT DEFAULT NULL,
      query_template TEXT NOT NULL,
      allowed_params JSON DEFAULT NULL,
      risk_level ENUM('low','medium','high') DEFAULT 'low',
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_acv_name (view_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('  ✓ Created analytics_copilot_views');
  } catch (err: any) {
    if (err.message?.includes('already exists')) console.log('  ✓ analytics_copilot_views already exists');
    else console.error('  ✗ analytics_copilot_views:', err.message?.slice(0, 100));
  }

  // 5. Seed copilot analytics views if empty
  try {
    const existing = await db.get('SELECT COUNT(*) as cnt FROM analytics_copilot_views');
    if ((existing as any)?.cnt === 0) {
      const views = [
        { name: 'evaluation_completion_rate', desc: 'Evaluation completion rate by period', query: 'SELECT period, COUNT(*) as total, SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END) as completed, ROUND(SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*) * 100, 1) as rate FROM evaluations GROUP BY period', params: '["period"]', risk: 'low' },
        { name: 'avg_score_by_period', desc: 'Average evaluation score by period', query: 'SELECT period, type, ROUND(AVG(total_score), 1) as avg_score, COUNT(*) as count FROM evaluations WHERE completed_at IS NOT NULL GROUP BY period, type', params: '["period","type"]', risk: 'low' },
        { name: 'supervisor_coverage', desc: 'Supervisor assignment coverage', query: 'SELECT period, COUNT(DISTINCT employee_id) as assigned, (SELECT COUNT(*) FROM users WHERE is_active=1 AND is_super_user=0) as total FROM supervisor_assignments GROUP BY period', params: '["period"]', risk: 'low' },
        { name: 'action_plan_status', desc: 'Action plan completion status', query: 'SELECT period, status, COUNT(*) as count FROM action_plans GROUP BY period, status', params: '["period","status"]', risk: 'low' },
        { name: 'vacation_summary', desc: 'Vacation request summary', query: 'SELECT status, COUNT(*) as count, SUM(days) as total_days FROM vacation_requests GROUP BY status', params: '["status"]', risk: 'low' },
        { name: 'login_activity', desc: 'User login activity', query: 'SELECT DATE(created_at) as date, COUNT(*) as logins, COUNT(DISTINCT user_id) as unique_users FROM authentication_audit WHERE action = "login_success" GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30', params: '[]', risk: 'low' },
      ];
      for (const v of views) {
        await db.run(
          `INSERT INTO analytics_copilot_views (id, view_name, description, query_template, allowed_params, risk_level) VALUES (?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), v.name, v.desc, v.query, v.params, v.risk]
        );
      }
      console.log('  ✓ Seeded 6 copilot analytics views');
    }
  } catch (err: any) {
    console.error('  ✗ Copilot views seed error:', err.message?.slice(0, 100));
  }

  console.log('Analytics migration complete.');
}
