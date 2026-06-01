/**
 * Evaluation Snapshot Migration
 *
 * Adds snapshot columns to evaluation_responses so that historical evaluations
 * remain accurate even if template questions are changed or deleted.
 *
 * Migration steps:
 * 1. Add snapshot columns (question_text, category, section, question_type)
 * 2. Backfill existing data where possible
 * 3. Add index on question_id
 */
import { db } from './connection.js';

export async function migrateSnapshots(): Promise<void> {
  console.log('Running evaluation snapshot migration...');

  // Step 1: Add snapshot columns to evaluation_responses
  const snapshotColumns = [
    { name: 'question_text', def: 'TEXT DEFAULT NULL AFTER question_id' },
    { name: 'category', def: 'VARCHAR(100) DEFAULT NULL AFTER question_text' },
    { name: 'section', def: 'VARCHAR(50) DEFAULT NULL AFTER category' },
    { name: 'question_type', def: 'VARCHAR(50) DEFAULT NULL AFTER section' },
  ];

  for (const col of snapshotColumns) {
    try {
      await db.run(`ALTER TABLE evaluation_responses ADD COLUMN ${col.name} ${col.def}`);
      console.log(`  ✓ Added column evaluation_responses.${col.name}`);
    } catch (err: any) {
      if (err.message?.includes('Duplicate column')) {
        console.log(`  ✓ Column evaluation_responses.${col.name} already exists`);
      } else {
        console.error(`  ✗ Failed to add column ${col.name}:`, err.message);
      }
    }
  }

  // Step 2: Backfill existing data from template_questions where possible
  try {
    const result = await db.run(`
      UPDATE evaluation_responses er
      INNER JOIN template_questions tq ON er.question_id = tq.question_id
      SET er.question_text = tq.question_text,
          er.category = tq.category,
          er.section = tq.section,
          er.question_type = 'seed'
    `);
    console.log(`  ✓ Backfilled ${result.affectedRows || 0} evaluation_responses from template_questions`);
  } catch (err: any) {
    console.error('  ✗ Backfill error:', err.message);
  }

  // Step 3: Best-effort backfill for orphaned question_ids using naming patterns
  try {
    // tc-corp-* → Competencias Corporativas
    await db.run(`
      UPDATE evaluation_responses
      SET category = 'Competencias Corporativas', section = 'competencias', question_type = 'legacy'
      WHERE question_id LIKE 'tc-corp-%' AND category IS NULL
    `);

    // tc-cf-* → Competencias Funcionales
    await db.run(`
      UPDATE evaluation_responses
      SET category = 'Competencias Funcionales', section = 'competencias', question_type = 'legacy'
      WHERE question_id LIKE 'tc-cf-%' AND category IS NULL
    `);

    // asr* → Aspectos de Resultado
    await db.run(`
      UPDATE evaluation_responses
      SET category = 'Aspectos de Resultado', section = 'tecnico', question_type = 'legacy'
      WHERE question_id LIKE 'asr%' AND category IS NULL
    `);

    // di* → Desarrollo Individual
    await db.run(`
      UPDATE evaluation_responses
      SET category = 'Desarrollo Individual', section = 'blandas', question_type = 'legacy'
      WHERE question_id LIKE 'di%' AND category IS NULL
    `);

    // co* → Comunicación
    await db.run(`
      UPDATE evaluation_responses
      SET category = 'Comunicación', section = 'blandas', question_type = 'legacy'
      WHERE question_id LIKE 'co%' AND category IS NULL
    `);

    // an* → Análisis
    await db.run(`
      UPDATE evaluation_responses
      SET category = 'Análisis', section = 'tecnico', question_type = 'legacy'
      WHERE question_id LIKE 'an%' AND category IS NULL
    `);

    // pc* → Pensamiento Crítico
    await db.run(`
      UPDATE evaluation_responses
      SET category = 'Pensamiento Crítico', section = 'competencias', question_type = 'legacy'
      WHERE question_id LIKE 'pc%' AND category IS NULL
    `);

    // s* (remaining) → Sin Clasificar
    await db.run(`
      UPDATE evaluation_responses
      SET category = 'Sin Clasificar', section = 'competencias', question_type = 'legacy'
      WHERE category IS NULL
    `);

    console.log('  ✓ Best-effort backfill completed for orphaned question_ids');
  } catch (err: any) {
    console.error('  ✗ Best-effort backfill error:', err.message);
  }

  // Step 4: Add missing index on evaluation_responses.question_id
  try {
    await db.run('CREATE INDEX idx_er_question ON evaluation_responses (question_id)');
    console.log('  ✓ Added index idx_er_question on evaluation_responses.question_id');
  } catch (err: any) {
    if (err.message?.includes('Duplicate')) {
      console.log('  ✓ Index idx_er_question already exists');
    } else {
      console.error('  ✗ Index error:', err.message);
    }
  }

  // Step 5: Clean up orphans from deleted test user
  try {
    const testUserId = '62a06f95-11b8-4010-9b9d-1de28a3cf1e9';
    const testEvalId = '2780b6d3-ed52-44f4-aa3e-292db8e6f1e5';

    // Delete orphaned evaluation_responses
    const del1 = await db.run('DELETE FROM evaluation_responses WHERE evaluation_id = ?', [testEvalId]);
    console.log(`  ✓ Deleted ${del1.affectedRows || 0} orphaned evaluation_responses`);

    // Delete orphaned evaluation
    const del2 = await db.run('DELETE FROM evaluations WHERE evaluated_id = ?', [testUserId]);
    console.log(`  ✓ Deleted ${del2.affectedRows || 0} orphaned evaluations`);

    // Delete orphaned supervisor_assignments
    const del3 = await db.run('DELETE FROM supervisor_assignments WHERE employee_id = ? OR supervisor_id = ?', [testUserId, testUserId]);
    console.log(`  ✓ Deleted ${del3.affectedRows || 0} orphaned supervisor_assignments`);

    // Delete orphaned action plan items then action plan
    const del4a = await db.run('DELETE FROM smart_action_items WHERE action_plan_id IN (SELECT id FROM action_plans WHERE employee_id = ?)', [testUserId]);
    console.log(`  ✓ Deleted ${del4a.affectedRows || 0} orphaned smart_action_items`);
    const del4b = await db.run('DELETE FROM action_plans WHERE employee_id = ?', [testUserId]);
    console.log(`  ✓ Deleted ${del4b.affectedRows || 0} orphaned action_plans`);

  } catch (err: any) {
    console.error('  ✗ Orphan cleanup error:', err.message);
  }

  console.log('Evaluation snapshot migration complete.');
}
