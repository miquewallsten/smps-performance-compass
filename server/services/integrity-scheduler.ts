/**
 * Nightly Integrity Job Scheduler
 * 
 * Runs integrity checks on a schedule and stores results.
 * Activated only when NODE_ENV=production (or INTEGRITY_CHECKS_ENABLED=true).
 */

import { db } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';

interface CheckResult {
  checkName: string;
  status: 'pass' | 'fail' | 'error';
  rowCount: number;
  details: string;
}

const CHECKS = [
  {
    name: 'score_mismatch',
    query: `
      SELECT e.id FROM evaluations e 
      WHERE e.completed_at IS NOT NULL
    `,
    process: async (): Promise<CheckResult> => {
      const evals = await db.all('SELECT e.id, e.total_score FROM evaluations e WHERE e.completed_at IS NOT NULL');
      let mismatches = 0;
      for (const e of evals as any[]) {
        const responses = await db.all('SELECT * FROM evaluation_responses WHERE evaluation_id = ?', [e.id]);
        if (responses.length === 0) continue;
        let totalW = 0, wSum = 0;
        for (const r of responses as any[]) {
          if (r.not_applicable && r.score === 0) continue;
          if (r.no_elements) continue;
          totalW += r.weight || 1;
          wSum += (r.score / 5) * (r.weight || 1);
        }
        const calc = totalW > 0 ? Math.round((wSum / totalW) * 100) : 0;
        if (calc !== Math.round(e.total_score)) mismatches++;
      }
      return { checkName: 'score_mismatch', status: mismatches === 0 ? 'pass' : 'fail', rowCount: mismatches, details: `${mismatches} evaluations with wrong scores` };
    },
  },
  {
    name: 'empty_completed',
    query: `
      SELECT e.id FROM evaluations e 
      LEFT JOIN evaluation_responses er ON er.evaluation_id = e.id
      WHERE e.completed_at IS NOT NULL
      GROUP BY e.id HAVING COUNT(er.id) = 0
    `,
    process: async (): Promise<CheckResult> => {
      const count = await db.getScalar<number>(`
        SELECT COUNT(*) FROM evaluations e 
        LEFT JOIN evaluation_responses er ON er.evaluation_id = e.id
        WHERE e.completed_at IS NOT NULL
        GROUP BY e.id HAVING COUNT(er.id) = 0
      `) || 0;
      return { checkName: 'empty_completed', status: count === 0 ? 'pass' : 'fail', rowCount: count, details: `${count} completed evals with 0 responses` };
    },
  },
  {
    name: 'orphaned_assignments',
    query: `
      SELECT sa.id FROM supervisor_assignments sa 
      LEFT JOIN users u ON u.id = sa.employee_id 
      WHERE u.id IS NULL OR u.is_active = 0
    `,
    process: async (): Promise<CheckResult> => {
      const count = await db.getScalar<number>(`
        SELECT COUNT(*) FROM supervisor_assignments sa 
        LEFT JOIN users u ON u.id = sa.employee_id 
        WHERE u.id IS NULL OR u.is_active = 0
      `) || 0;
      return { checkName: 'orphaned_assignments', status: count === 0 ? 'pass' : 'fail', rowCount: count, details: `${count} orphaned assignments` };
    },
  },
  {
    name: 'invalid_supervisors',
    query: `
      SELECT sa.id FROM supervisor_assignments sa 
      LEFT JOIN users u ON u.id = sa.supervisor_id 
      WHERE u.id IS NULL OR u.is_active = 0
    `,
    process: async (): Promise<CheckResult> => {
      const count = await db.getScalar<number>(`
        SELECT COUNT(*) FROM supervisor_assignments sa 
        LEFT JOIN users u ON u.id = sa.supervisor_id 
        WHERE u.id IS NULL OR u.is_active = 0
      `) || 0;
      return { checkName: 'invalid_supervisors', status: count === 0 ? 'pass' : 'fail', rowCount: count, details: `${count} invalid supervisors` };
    },
  },
  {
    name: 'analytics_drift',
    query: `SELECT period, supervisor_eval_completed FROM analytics_period_summary`,
    process: async (): Promise<CheckResult> => {
      const summaries = await db.all('SELECT * FROM analytics_period_summary') as any[];
      let drift = 0;
      for (const s of summaries) {
        const srcSup = await db.getScalar<number>(
          'SELECT COUNT(DISTINCT evaluated_id) FROM evaluations WHERE period = ? AND type = "supervisor" AND completed_at IS NOT NULL', [s.period]
        ) || 0;
        if (srcSup !== s.supervisor_eval_completed) drift++;
      }
      return { checkName: 'analytics_drift', status: drift === 0 ? 'pass' : 'fail', rowCount: drift, details: `${drift} periods with analytics mismatches` };
    },
  },
  {
    name: 'template_integrity',
    query: `SELECT COUNT(*) FROM template_questions WHERE is_active = 1`,
    process: async (): Promise<CheckResult> => {
      const tq = await db.getScalar<number>('SELECT COUNT(*) FROM template_questions WHERE is_active = 1') || 0;
      const sw = await db.getScalar<number>('SELECT COUNT(*) FROM section_weights') || 0;
      const ql = await db.getScalar<number>('SELECT COUNT(*) FROM question_library') || 0;
      const ok = tq === 290 && sw === 17 && ql === 84;
      return { checkName: 'template_integrity', status: ok ? 'pass' : 'fail', rowCount: ok ? 0 : 1, details: `templates=${tq}/290 weights=${sw}/17 library=${ql}/84` };
    },
  },
];

async function runAllChecks(): Promise<void> {
  const runId = uuidv4();
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

  console.log(`[Integrity] Starting nightly check run ${runId}`);

  for (const check of CHECKS) {
    try {
      const result = await check.process();
      
      await db.run(
        `INSERT INTO system_integrity_audit (id, check_name, run_id, status, row_count, details, run_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), check.name, runId, result.status, result.rowCount, result.details, now]
      );
      
      console.log(`[Integrity] ${result.status === 'pass' ? '✅' : '❌'} ${check.name}: ${result.details}`);
    } catch (err: any) {
      console.error(`[Integrity] Error in ${check.name}:`, err.message);
      await db.run(
        `INSERT INTO system_integrity_audit (id, check_name, run_id, status, row_count, details, run_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), check.name, runId, 'error', 0, err.message, now]
      );
    }
  }

  // Cleanup runs older than 90 days
  await db.run('DELETE FROM system_integrity_audit WHERE run_at < DATE_SUB(NOW(), INTERVAL 90 DAY)');
  console.log(`[Integrity] Run ${runId} complete`);
}

export function startIntegrityScheduler(): void {
  const enabled = process.env.NODE_ENV === 'production' || process.env.INTEGRITY_CHECKS_ENABLED === 'true';
  
  if (!enabled) {
    console.log('[Integrity] Scheduler disabled (not production)');
    return;
  }

  console.log('[Integrity] Scheduler started — running checks nightly at 02:00 UTC');
  
  // Run immediately on startup (for production deploy verification)
  runAllChecks().catch(err => console.error('[Integrity] Startup check failed:', err));
  
  // Schedule daily at 02:00 UTC
  setInterval(() => {
    const now = new Date();
    if (now.getUTCHours() === 2 && now.getUTCMinutes() === 0) {
      runAllChecks().catch(err => console.error('[Integrity] Nightly check failed:', err));
    }
  }, 60000); // Check every minute
}
