/**
 * Foreign Key Implementation Migration
 *
 * Adds foreign keys for all critical relationships.
 * Must be run AFTER orphan cleanup (migrate-snapshots.ts handles that).
 *
 * FKs are added with RESTRICT on delete (no cascade) to prevent accidental data loss.
 * Application code must handle cascading deletes explicitly.
 */
import { db } from './connection.js';

export async function migrateFKs(): Promise<void> {
  console.log('Running foreign key migration...');

  const foreignKeys = [
    // CRITICAL: evaluations → users
    {
      name: 'fk_eval_evaluator',
      table: 'evaluations',
      column: 'evaluator_id',
      refTable: 'users',
      refColumn: 'id',
      risk: 'CRITICAL',
    },
    {
      name: 'fk_eval_evaluated',
      table: 'evaluations',
      column: 'evaluated_id',
      refTable: 'users',
      refColumn: 'id',
      risk: 'CRITICAL',
    },

    // CRITICAL: evaluation_responses → evaluations
    {
      name: 'fk_er_evaluation',
      table: 'evaluation_responses',
      column: 'evaluation_id',
      refTable: 'evaluations',
      refColumn: 'id',
      risk: 'CRITICAL',
    },

    // HIGH: supervisor_assignments → users
    {
      name: 'fk_sa_employee',
      table: 'supervisor_assignments',
      column: 'employee_id',
      refTable: 'users',
      refColumn: 'id',
      risk: 'HIGH',
    },
    {
      name: 'fk_sa_supervisor',
      table: 'supervisor_assignments',
      column: 'supervisor_id',
      refTable: 'users',
      refColumn: 'id',
      risk: 'HIGH',
    },

    // HIGH: action_plans → users
    {
      name: 'fk_ap_employee',
      table: 'action_plans',
      column: 'employee_id',
      refTable: 'users',
      refColumn: 'id',
      risk: 'HIGH',
    },

    // HIGH: personal_objectives → users
    {
      name: 'fk_po_user',
      table: 'personal_objectives',
      column: 'user_id',
      refTable: 'users',
      refColumn: 'id',
      risk: 'HIGH',
    },

    // HIGH: vacation_requests → users
    {
      name: 'fk_vr_user',
      table: 'vacation_requests',
      column: 'user_id',
      refTable: 'users',
      refColumn: 'id',
      risk: 'HIGH',
    },

    // MEDIUM: copilot_conversations → users
    {
      name: 'fk_cc_user',
      table: 'copilot_conversations',
      column: 'user_id',
      refTable: 'users',
      refColumn: 'id',
      risk: 'MEDIUM',
    },

    // MEDIUM: copilot_messages → copilot_conversations
    {
      name: 'fk_cm_conversation',
      table: 'copilot_messages',
      column: 'conversation_id',
      refTable: 'copilot_conversations',
      refColumn: 'id',
      risk: 'MEDIUM',
    },

    // MEDIUM: smart_action_items → action_plans
    {
      name: 'fk_sai_plan',
      table: 'smart_action_items',
      column: 'action_plan_id',
      refTable: 'action_plans',
      refColumn: 'id',
      risk: 'MEDIUM',
    },

    // MEDIUM: evaluation_na_approvals → evaluations
    {
      name: 'fk_ena_evaluation',
      table: 'evaluation_na_approvals',
      column: 'evaluation_id',
      refTable: 'evaluations',
      refColumn: 'id',
      risk: 'MEDIUM',
    },
  ];

  for (const fk of foreignKeys) {
    try {
      // First verify no orphans exist for this relationship
      const orphanCheck = await db.get(
        `SELECT COUNT(*) as cnt FROM ${fk.table} t LEFT JOIN ${fk.refTable} r ON t.${fk.column} = r.${fk.refColumn} WHERE r.${fk.refColumn} IS NULL`
      );
      const orphanCount = (orphanCheck as any)?.cnt || 0;

      if (orphanCount > 0) {
        console.log(`  ✗ REJECTED: ${fk.name} — ${orphanCount} orphaned records in ${fk.table}.${fk.column}`);
        continue;
      }

      await db.run(
        `ALTER TABLE ${fk.table} ADD CONSTRAINT ${fk.name} FOREIGN KEY (${fk.column}) REFERENCES ${fk.refTable}(${fk.refColumn}) ON DELETE RESTRICT ON UPDATE CASCADE`
      );
      console.log(`  ✓ Added FK: ${fk.name} (${fk.table}.${fk.column} → ${fk.refTable}.${fk.refColumn})`);
    } catch (err: any) {
      if (err.message?.includes('Duplicate') || err.message?.includes('already exists')) {
        console.log(`  ✓ FK ${fk.name} already exists`);
      } else {
        console.error(`  ✗ FAILED: ${fk.name}:`, err.message?.slice(0, 100));
      }
    }
  }

  // Rejected FKs (documented)
  console.log('');
  console.log('Rejected FKs:');
  console.log('  - sessions.user_id → users.id: Sessions are ephemeral, FK would block user deletion');
  console.log('  - authentication_audit.user_id → users.id: Audit records must survive user deletion');
  console.log('  - evaluation_responses.question_id → template_questions.question_id: question_id format changed between seed versions; use snapshot columns instead');
  console.log('  - user_timeline.user_id → users.id: Already exists (user_timeline_ibfk_1)');
  console.log('  - user_timeline.created_by → users.id: Already exists (user_timeline_ibfk_2)');
  console.log('  - password_reset_tokens.user_id → users.id: Already exists (fk_prt_user)');

  console.log('Foreign key migration complete.');
}
