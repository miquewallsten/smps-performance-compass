/**
 * Index Implementation Migration
 *
 * Adds missing indexes for performance-critical queries.
 * Based on analysis of actual query patterns in routes.
 */
import { db } from './connection.js';

export async function migrateIndexes(): Promise<void> {
  console.log('Running index migration...');

  const indexes = [
    // evaluation_responses: question_id (for orphan detection and template joins)
    { name: 'idx_er_question', table: 'evaluation_responses', column: 'question_id', note: 'Critical for template question lookups' },

    // evaluations: composite for dashboard queries (evaluated + period)
    { name: 'idx_eval_evaluated_period', table: 'evaluations', columns: ['evaluated_id', 'period'], note: 'Dashboard: my evaluations by period' },

    // evaluations: type filter
    { name: 'idx_eval_type', table: 'evaluations', column: 'type', note: 'Filter evaluations by type (self/supervisor/feedback)' },

    // evaluations: completed_at for completion rate queries
    { name: 'idx_eval_completed', table: 'evaluations', column: 'completed_at', note: 'Completion rate queries' },

    // supervisor_assignments: period filter (common query param)
    { name: 'idx_sa_period', table: 'supervisor_assignments', column: 'period', note: 'Filter assignments by period' },

    // action_plans: supervisor_id lookups
    { name: 'idx_ap_supervisor', table: 'action_plans', column: 'supervisor_id', note: 'Supervisor action plan visibility' },

    // action_plans: period filter
    { name: 'idx_ap_period', table: 'action_plans', column: 'period', note: 'Filter action plans by period' },

    // personal_objectives: period filter
    { name: 'idx_po_period', table: 'personal_objectives', column: 'period', note: 'Filter objectives by period' },

    // sessions: expires_at for cleanup
    { name: 'idx_sessions_expires', table: 'sessions', column: 'expires_at', note: 'Session cleanup queries' },

    // password_reset_tokens: expires_at for cleanup (already exists, verify)
    // idx_prt_expires already exists

    // users: is_active for filtered queries
    { name: 'idx_users_active', table: 'users', column: 'is_active', note: 'Filter active users' },

    // copilot_messages: created_at for chronological ordering
    { name: 'idx_cm_created', table: 'copilot_messages', column: 'created_at', note: 'Message ordering' },

    // vacation_requests: status filter
    { name: 'idx_vr_status', table: 'vacation_requests', column: 'status', note: 'Filter vacation requests by status' },

    // vacation_approvals: vacation_request_id (already has idx_va_request)
    // vacation_approvals: approver lookups
    { name: 'idx_va_approver', table: 'vacation_approvals', columns: ['vacation_request_id', 'approver_id'], note: 'Approver lookup' },

    // authentication_audit: composite user+action for per-user audit queries
    { name: 'idx_audit_user_action', table: 'authentication_audit', columns: ['user_id', 'action'], note: 'Per-user audit trail' },
  ];

  for (const idx of indexes) {
    try {
      const columns = idx.columns || [idx.column];
      const colList = columns.join(', ');
      await db.run(`CREATE INDEX ${idx.name} ON ${idx.table} (${colList})`);
      console.log(`  ✓ Added index: ${idx.name} on ${idx.table}(${colList})`);
    } catch (err: any) {
      if (err.message?.includes('Duplicate') || err.message?.includes('already exists')) {
        console.log(`  ✓ Index ${idx.name} already exists`);
      } else {
        console.error(`  ✗ FAILED: ${idx.name}:`, err.message?.slice(0, 100));
      }
    }
  }

  console.log('Index migration complete.');
}
