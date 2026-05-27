/**
 * Backfill Timeline Events from Historical Data
 * 
 * Reads existing users, evaluations, and assignments from the database
 * and creates timeline events for them retroactively.
 * 
 * Run on server: cd ~/domains/bowdot.online/nodejs && node -e "require('./server.cjs')" 
 * Or via SSH: npx tsx server/scripts/backfill-timeline.ts
 */

import { v4 as uuidv4 } from 'uuid';

// This script needs to run against the production database
// We'll use the db connection from the main app
import { db } from '../db/connection.js';

const DRY_RUN = process.argv.includes('--dry-run');

async function backfill() {
  console.log(`\n📜 Timeline Backfill ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}\n`);

  let totalCreated = 0;

  // ─── 1. User creation events (hire) ──────────────────────────────────
  console.log('1. Backfilling user hire events...');
  const users = await db.all('SELECT id, name, position, is_super_user, created_at FROM users ORDER BY created_at ASC');
  
  for (const user of users) {
    const existing = await db.get(
      "SELECT id FROM user_timeline WHERE user_id = ? AND event_type = 'hire'",
      [user.id]
    );
    if (existing) {
      console.log(`  ⏭  ${user.name} — hire event already exists`);
      continue;
    }

    const note = user.is_super_user ? 'SuperAdmin del sistema' : 
                 user.position === 'socio' ? 'Socio fundador' : 
                 'Usuario registrado en el sistema';
    console.log(`  ✅ ${user.name} — hire (${user.created_at})`);

    if (!DRY_RUN) {
      await db.run(
        `INSERT INTO user_timeline (id, user_id, event_type, event_date, metadata, note, created_by, created_at, updated_at)
         VALUES (?, ?, 'hire', ?, ?, ?, 'system', ?, ?)`,
        [
          uuidv4(),
          user.id,
          user.created_at,
          JSON.stringify({ position: user.position }),
          note,
          user.created_at,
          user.created_at
        ]
      );
      totalCreated++;
    }
  }

  // ─── 2. Evaluation completion events ─────────────────────────────────
  console.log('\n2. Backfilling evaluation completion events...');
  const evals = await db.all(`
    SELECT e.id, e.evaluated_id, e.evaluator_id, e.type, e.total_score, e.completed_at, e.period,
           u.name as evaluator_name
    FROM evaluations e
    LEFT JOIN users u ON e.evaluator_id = u.id
    WHERE e.completed_at IS NOT NULL
    ORDER BY e.completed_at ASC
  `);

  for (const ev of evals) {
    const existing = await db.get(
      "SELECT id FROM user_timeline WHERE user_id = ? AND event_type = 'evaluation_completed' AND metadata LIKE ?",
      [ev.evaluated_id, `%${ev.id}%`]
    );
    if (existing) {
      console.log(`  ⏭  Eval ${ev.id.slice(0,8)} — already exists`);
      continue;
    }

    const evalTypeLabels: Record<string, string> = {
      self: 'Autoevaluación',
      supervisor: 'Evaluación de Supervisor',
      feedback: 'Sesión de Feedback'
    };

    const metadata = {
      evalId: ev.id,
      evalType: ev.type,
      score: Math.round(ev.total_score),
      period: ev.period,
      evaluatorName: ev.evaluator_name
    };

    console.log(`  ✅ ${evalTypeLabels[ev.type] || ev.type} — ${ev.period} — score: ${Math.round(ev.total_score)}%`);

    if (!DRY_RUN) {
      await db.run(
        `INSERT INTO user_timeline (id, user_id, event_type, event_date, metadata, note, created_by, created_at, updated_at)
         VALUES (?, ?, 'evaluation_completed', ?, ?, ?, 'system', ?, ?)`,
        [
          uuidv4(),
          ev.evaluated_id,
          ev.completed_at,
          JSON.stringify(metadata),
          `${evalTypeLabels[ev.type] || ev.type} completada — ${Math.round(ev.total_score)}% — Periodo ${ev.period}`,
          ev.completed_at,
          ev.completed_at
        ]
      );
      totalCreated++;
    }
  }

  // ─── 3. Supervisor assignment events ─────────────────────────────────
  console.log('\n3. Backfilling supervisor assignment events...');
  const assignments = await db.all(`
    SELECT sa.employee_id, sa.supervisor_id, sa.period,
           su.name as supervisor_name
    FROM supervisor_assignments sa
    LEFT JOIN users su ON sa.supervisor_id = su.id
    ORDER BY sa.period ASC
  `);

  for (const asgn of assignments) {
    const existing = await db.get(
      "SELECT id FROM user_timeline WHERE user_id = ? AND event_type = 'supervisor_assigned' AND metadata LIKE ?",
      [asgn.employee_id, `%${asgn.supervisor_id}%${asgn.period}%`]
    );
    if (existing) {
      continue;
    }

    // Approximate date from period
    const year = asgn.period.includes('H') ? asgn.period.replace('H', '20') : '2026';
    const periodDate = `${year}-01-15 00:00:00`;
    
    const metadata = {
      supervisorId: asgn.supervisor_id,
      supervisorName: asgn.supervisor_name,
      period: asgn.period
    };

    console.log(`  ✅ ${asgn.supervisor_name} → user ${asgn.employee_id.slice(0,8)} — ${asgn.period}`);

    if (!DRY_RUN) {
      await db.run(
        `INSERT INTO user_timeline (id, user_id, event_type, event_date, metadata, note, created_by, created_at, updated_at)
         VALUES (?, ?, 'supervisor_assigned', ?, ?, ?, 'system', ?, ?)`,
        [
          uuidv4(),
          asgn.employee_id,
          periodDate,
          JSON.stringify(metadata),
          `${asgn.supervisor_name} asignado como supervisor — ${asgn.period}`,
          periodDate,
          periodDate
        ]
      );
      totalCreated++;
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Backfill complete! ${DRY_RUN ? 'Would create' : 'Created'} ${totalCreated} timeline events.`);
  console.log(`${'='.repeat(50)}\n`);
}

backfill().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
