import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DATABASE_URL || path.resolve(process.cwd(), 'server', 'db', 'smps.db');
const db = new Database(DB_PATH);


db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const migrate = db.transaction(() => {
  // ─── users ──────────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      security_question TEXT NOT NULL,
      security_answer TEXT NOT NULL,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      practice_area TEXT,
      custom_position_id TEXT,
      is_admin INTEGER NOT NULL DEFAULT 0,
      is_super_user INTEGER NOT NULL DEFAULT 0,
      is_managing_partner INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ─── sessions ────────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );
  `);

  // ─── custom_positions ────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_positions (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      level TEXT NOT NULL,
      practice_area TEXT,
      base_position TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ─── period_configs ──────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS period_configs (
      period TEXT PRIMARY KEY,
      self_start TEXT NOT NULL,
      self_end TEXT NOT NULL,
      supervisor_start TEXT NOT NULL,
      supervisor_end TEXT NOT NULL,
      feedback_start TEXT NOT NULL,
      feedback_end TEXT NOT NULL,
      action_plan_start TEXT NOT NULL,
      action_plan_end TEXT NOT NULL
    );
  `);

  // ─── supervisor_assignments ──────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS supervisor_assignments (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES users(id),
      supervisor_id TEXT NOT NULL REFERENCES users(id),
      period TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS supervisor_assignments_employee_supervisor_period_unique
      ON supervisor_assignments(employee_id, supervisor_id, period);
  `);

  // ─── evaluations ────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      evaluator_id TEXT NOT NULL REFERENCES users(id),
      evaluated_id TEXT NOT NULL REFERENCES users(id),
      period TEXT NOT NULL,
      type TEXT NOT NULL,
      comments TEXT NOT NULL DEFAULT '',
      supervisor_comments TEXT,
      total_score REAL NOT NULL DEFAULT 0,
      completed_at TEXT,
      feedback_completed INTEGER NOT NULL DEFAULT 0,
      feedback_completed_at TEXT,
      feedback_completed_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS evaluations_evaluator_evaluated_period_type_unique
      ON evaluations(evaluator_id, evaluated_id, period, type);
  `);

  // ─── evaluation_responses ────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS evaluation_responses (
      id TEXT PRIMARY KEY,
      evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      not_applicable INTEGER NOT NULL DEFAULT 0,
      no_elements INTEGER NOT NULL DEFAULT 0
    );
  `);

  // ─── evaluation_na_approvals ─────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS evaluation_na_approvals (
      evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL,
      approved INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (evaluation_id, question_id)
    );
  `);

  // ─── action_plans ────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS action_plans (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES users(id),
      supervisor_id TEXT NOT NULL REFERENCES users(id),
      period TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      approval_status TEXT NOT NULL DEFAULT 'pending',
      approval_comments TEXT,
      approved_by TEXT REFERENCES users(id),
      approved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS action_plans_employee_period_unique
      ON action_plans(employee_id, period);
  `);

  // ─── smart_action_items ─────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS smart_action_items (
      id TEXT PRIMARY KEY,
      action_plan_id TEXT NOT NULL REFERENCES action_plans(id) ON DELETE CASCADE,
      competencia TEXT NOT NULL,
      objetivo TEXT NOT NULL,
      acciones TEXT NOT NULL,
      que_evitar TEXT NOT NULL,
      fecha_revision TEXT NOT NULL,
      apoyos TEXT NOT NULL
    );
  `);

  // ─── personal_objectives ────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS personal_objectives (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      period TEXT NOT NULL,
      type TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS personal_objectives_user_period_unique
      ON personal_objectives(user_id, period);
  `);

  // ─── admin_objectives ───────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_objectives (
      id TEXT PRIMARY KEY,
      personal_objectives_id TEXT NOT NULL REFERENCES personal_objectives(id) ON DELETE CASCADE,
      tipo_objetivo TEXT NOT NULL,
      nombre_objetivo TEXT NOT NULL,
      pilares_estrategicos TEXT NOT NULL DEFAULT '',
      alcance TEXT NOT NULL DEFAULT '',
      porcentaje_avance REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      submitted_at TEXT,
      reviewed_at TEXT,
      reviewed_by TEXT REFERENCES users(id),
      reviewer_comment TEXT
    );
  `);

  // ─── legal_objectives ───────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS legal_objectives (
      id TEXT PRIMARY KEY,
      personal_objectives_id TEXT NOT NULL REFERENCES personal_objectives(id) ON DELETE CASCADE,
      horas_meta REAL NOT NULL DEFAULT 0,
      horas_ajustadas REAL NOT NULL DEFAULT 0,
      porcentaje_horas_vs_meta REAL NOT NULL DEFAULT 0,
      porcentaje_eficiencia REAL NOT NULL DEFAULT 0,
      meta_pro_bono REAL NOT NULL DEFAULT 0,
      realizado_pro_bono REAL NOT NULL DEFAULT 0,
      meta_marketing REAL NOT NULL DEFAULT 0,
      realizado_marketing REAL NOT NULL DEFAULT 0,
      meta_business_dev REAL NOT NULL DEFAULT 0,
      realizado_business_dev REAL NOT NULL DEFAULT 0,
      meta_mentoring REAL NOT NULL DEFAULT 0,
      realizado_mentoring REAL NOT NULL DEFAULT 0,
      resultado_area REAL NOT NULL DEFAULT 0,
      resultado_firma REAL NOT NULL DEFAULT 0,
      porcentaje_total_bono REAL NOT NULL DEFAULT 0
    );
  `);

  // ─── announcements ──────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      audience TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      archived INTEGER NOT NULL DEFAULT 0
    );
  `);

  // ─── announcement_reads ─────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcement_reads (
      announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      PRIMARY KEY (announcement_id, user_id)
    );
  `);

  // ─── vacation_requests ───────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS vacation_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days INTEGER NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      period TEXT
    );
  `);

  // ─── vacation_approvals ──────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS vacation_approvals (
      id TEXT PRIMARY KEY,
      vacation_request_id TEXT NOT NULL REFERENCES vacation_requests(id) ON DELETE CASCADE,
      approver_id TEXT NOT NULL REFERENCES users(id),
      approved_at TEXT NOT NULL,
      action TEXT NOT NULL,
      comment TEXT
    );
  `);

  // ─── extra_vacation_days ────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS extra_vacation_days (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      days INTEGER NOT NULL,
      reason TEXT NOT NULL,
      added_by TEXT NOT NULL REFERENCES users(id),
      added_at TEXT NOT NULL,
      period TEXT NOT NULL
    );
  `);

  // ─── vacation_config ────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS vacation_config (
      position TEXT PRIMARY KEY,
      days INTEGER NOT NULL
    );
  `);

  // ─── custom_eval_questions ──────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_eval_questions (
      id TEXT PRIMARY KEY,
      position TEXT NOT NULL,
      question_id TEXT NOT NULL,
      category TEXT NOT NULL,
      text TEXT NOT NULL,
      weight INTEGER NOT NULL,
      section TEXT,
      practice_area TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS custom_eval_questions_position_question_unique
      ON custom_eval_questions(position, question_id);
  `);

  // ─── library_questions ──────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS library_questions (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      text TEXT NOT NULL,
      default_weight INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT REFERENCES users(id)
    );
  `);

  // ─── seed_question_overrides ────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS seed_question_overrides (
      question_id TEXT PRIMARY KEY,
      text TEXT,
      category TEXT,
      weight INTEGER,
      hidden INTEGER NOT NULL DEFAULT 0
    );
  `);

  // ─── module_config ──────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS module_config (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      evaluations INTEGER NOT NULL DEFAULT 1,
      communications INTEGER NOT NULL DEFAULT 1,
      vacations INTEGER NOT NULL DEFAULT 1,
      copilot INTEGER NOT NULL DEFAULT 1
    );
  `);

  // ─── system_status ──────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_status (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      status TEXT NOT NULL DEFAULT 'active',
      activation_date TEXT NOT NULL,
      payment_plan TEXT NOT NULL DEFAULT 'monthly',
      max_users INTEGER NOT NULL DEFAULT 50,
      tickets INTEGER NOT NULL DEFAULT 0
    );
  `);

  // ─── activation_history ─────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS activation_history (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      date TEXT NOT NULL,
      by TEXT REFERENCES users(id)
    );
  `);


  // ─── copilot_conversations ──────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS copilot_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL DEFAULT 'Nueva conversación',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS copilot_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES copilot_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_calls TEXT,
      tool_results TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_copilot_messages_conversation ON copilot_messages(conversation_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_copilot_conversations_user ON copilot_conversations(user_id);
  `);

  // ─── copilot_config ──────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS copilot_config (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      model TEXT NOT NULL DEFAULT 'llama-3.3-70b-versatile',
      api_provider TEXT NOT NULL DEFAULT 'groq',
      can_manage_users INTEGER NOT NULL DEFAULT 1,
      can_manage_evaluations INTEGER NOT NULL DEFAULT 1,
      can_manage_vacations INTEGER NOT NULL DEFAULT 1,
      can_manage_announcements INTEGER NOT NULL DEFAULT 1,
      can_manage_periods INTEGER NOT NULL DEFAULT 0,
      can_manage_system INTEGER NOT NULL DEFAULT 0,
      can_view_reports INTEGER NOT NULL DEFAULT 1,
      max_tokens INTEGER NOT NULL DEFAULT 2048,
      temperature REAL NOT NULL DEFAULT 0.3
    );
  `);

  // ─── Indexes ────────────────────────────────────────────────────────────────
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON evaluations(evaluator_id);
    CREATE INDEX IF NOT EXISTS idx_evaluations_evaluated ON evaluations(evaluated_id);
    CREATE INDEX IF NOT EXISTS idx_evaluations_period ON evaluations(period);
    CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_employee ON supervisor_assignments(employee_id);
    CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_supervisor ON supervisor_assignments(supervisor_id);
    CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id);
    CREATE INDEX IF NOT EXISTS idx_vacation_requests_user ON vacation_requests(user_id);
  `);
});

try {
  migrate();
  console.log('Migration completed successfully.');

  // Verify tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[];
  console.log('Tables created:');
  for (const t of tables) {
    console.log(`  - ${t.name}`);
  }

  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name").all() as { name: string }[];
  console.log('Indexes created:');
  for (const idx of indexes) {
    console.log(`  - ${idx.name}`);
  }
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
} finally {
  db.close();
}
