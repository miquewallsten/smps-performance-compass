/**
 * Data Integrity Audit Scripts
 * 
 * Usage: 
 *   npx tsx server/scripts/audit.ts scores
 *   npx tsx server/scripts/audit.ts analytics
 *   npx tsx server/scripts/audit.ts hierarchy
 *   npx tsx server/scripts/audit.ts periods
 *   npx tsx server/scripts/audit.ts all
 */

import { db } from '../db/connection.js';

type Status = 'PASS' | 'WARNING' | 'FAIL';

let warnings = 0;
let failures = 0;

function report(label: string, status: Status, detail: string = '') {
  const icon = status === 'PASS' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';
  console.log(`  ${icon} ${label}${detail ? ': ' + detail : ''}`);
  if (status === 'WARNING') warnings++;
  if (status === 'FAIL') failures++;
}

async function check(label: string, fn: () => Promise<Status>, detailFn?: () => Promise<string>) {
  try {
    const result = await fn();
    const detail = detailFn ? await detailFn() : '';
    report(label, result, detail);
  } catch (err: any) {
    report(label, 'FAIL', err.message);
  }
}

async function auditScores() {
  console.log('\n🔍 Score Integrity Audit');
  
  const evals = await db.all(
    'SELECT e.* FROM evaluations e WHERE e.completed_at IS NOT NULL'
  );
  
  let mismatches = 0;
  let emptyCompleted = 0;
  
  for (const e of evals as any[]) {
    const responses = await db.all(
      'SELECT * FROM evaluation_responses WHERE evaluation_id = ?', [e.id]
    );
    
    if (responses.length === 0) {
      emptyCompleted++;
      continue;
    }
    
    let totalW = 0, wSum = 0;
    for (const r of responses as any[]) {
      if (r.not_applicable && r.score === 0) continue;
      if (r.no_elements) continue;
      totalW += r.weight || 1;
      wSum += (r.score / 5) * (r.weight || 1);
    }
    
    const calc = totalW > 0 ? Math.round((wSum / totalW) * 100) : 0;
    if (calc !== Math.round(e.total_score)) {
      mismatches++;
    }
  }
  
  report('Score matches', mismatches === 0 ? 'PASS' : 'FAIL', 
    mismatches > 0 ? `${mismatches} mismatches found` : 'All scores correct');
  report('Empty completed evals', emptyCompleted === 0 ? 'PASS' : 'WARNING',
    emptyCompleted > 0 ? `${emptyCompleted} completed evals with 0 responses` : 'None');
}

async function auditAnalytics() {
  console.log('\n🔍 Analytics Audit');
  
  const periods = await db.all('SELECT DISTINCT period FROM evaluations');
  
  for (const p of periods as any[]) {
    const period = p.period;
    
    // Source counts
    const srcSelf = await db.getScalar<number>(
      'SELECT COUNT(DISTINCT evaluator_id) FROM evaluations WHERE period = ? AND type = "self" AND completed_at IS NOT NULL', [period]
    );
    const srcSup = await db.getScalar<number>(
      'SELECT COUNT(DISTINCT evaluated_id) FROM evaluations WHERE period = ? AND type = "supervisor" AND completed_at IS NOT NULL', [period]
    );
    
    // Analytics counts
    const summary = await db.get(
      'SELECT * FROM analytics_period_summary WHERE period = ?', [period]
    ) as any;
    
    if (summary) {
      const selfMatch = srcSelf === summary.self_eval_completed;
      const supMatch = srcSup === summary.supervisor_eval_completed;
      report(`Analytics ${period} self`, selfMatch ? 'PASS' : 'WARNING',
        !selfMatch ? `src=${srcSelf} vs analytics=${summary.self_eval_completed}` : '');
      report(`Analytics ${period} sup`, supMatch ? 'PASS' : 'WARNING',
        !supMatch ? `src=${srcSup} vs analytics=${summary.supervisor_eval_completed}` : '');
    } else {
      report(`Analytics ${period}`, 'WARNING', 'No summary row found');
    }
  }
}

async function auditHierarchy() {
  console.log('\n🔍 Hierarchy Audit');
  
  const users = await db.all('SELECT * FROM users WHERE is_active = 1');
  const positions = await db.all('SELECT position FROM position_config WHERE is_active = 1');
  const validPositions = new Set(positions.map((p: any) => p.position));
  
  // Check all users have valid positions
  for (const u of users as any[]) {
    if (!validPositions.has(u.position)) {
      report(`User ${u.name}`, 'FAIL', `Invalid position: ${u.position}`);
    }
  }
  
  if (users.every((u: any) => validPositions.has(u.position))) {
    report('All users have valid positions', 'PASS');
  }
  
  // Check for orphaned assignments
  const orphaned = await db.all(
    `SELECT sa.id, sa.employee_id, sa.period FROM supervisor_assignments sa
     LEFT JOIN users u ON u.id = sa.employee_id WHERE u.id IS NULL OR u.is_active = 0`
  );
  report('Orphaned assignments', orphaned.length === 0 ? 'PASS' : 'WARNING',
    orphaned.length > 0 ? `${orphaned.length} found` : 'None');
  
  // Check for invalid supervisors
  const invalidSup = await db.all(
    `SELECT sa.id, sa.supervisor_id FROM supervisor_assignments sa
     LEFT JOIN users u ON u.id = sa.supervisor_id WHERE u.id IS NULL OR u.is_active = 0`
  );
  report('Invalid supervisors', invalidSup.length === 0 ? 'PASS' : 'WARNING',
    invalidSup.length > 0 ? `${invalidSup.length} found` : 'None');
  
  // Check for mutual assignments
  const mutual = await db.all(
    `SELECT sa1.employee_id, sa1.supervisor_id, sa1.period FROM supervisor_assignments sa1
     JOIN supervisor_assignments sa2 ON sa1.employee_id = sa2.supervisor_id 
     AND sa1.supervisor_id = sa2.employee_id AND sa1.period = sa2.period`
  );
  report('Mutual supervisor pairs', mutual.length === 0 ? 'PASS' : 'WARNING',
    mutual.length > 0 ? `${mutual.length}` : 'None');
}

async function auditPeriods() {
  console.log('\n🔍 Period Audit');
  
  const periods = await db.all('SELECT * FROM period_configs ORDER BY period');
  
  // Check each period has valid date ranges
  for (const p of periods as any[]) {
    const hasDates = p.self_start && p.self_end && p.supervisor_start && p.supervisor_end;
    report(`Period ${p.period} dates`, hasDates ? 'PASS' : 'FAIL',
      hasDates ? '' : 'Missing date fields');
  }
  
  // Check for period without evaluations
  for (const p of periods as any[]) {
    const count = await db.getScalar<number>(
      'SELECT COUNT(*) FROM evaluations WHERE period = ?', [p.period]
    );
    report(`Period ${p.period} evals`, count > 0 ? 'PASS' : 'WARNING',
      `Has ${count} evaluations`);
  }
}

async function main() {
  const cmd = process.argv[2] || 'all';
  
  console.log('SMPS Integrity Audit');
  console.log('===================');
  
  if (cmd === 'all' || cmd === 'scores') await auditScores();
  if (cmd === 'all' || cmd === 'analytics') await auditAnalytics();
  if (cmd === 'all' || cmd === 'hierarchy') await auditHierarchy();
  if (cmd === 'all' || cmd === 'periods') await auditPeriods();
  
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Audit complete: ${failures} failures, ${warnings} warnings`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
