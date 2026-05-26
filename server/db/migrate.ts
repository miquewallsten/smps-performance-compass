import { pool, exec, getScalar } from './connection.js';

/**
 * Run all database migrations — creates every table and index if they don't exist.
 * Errors for "already exists" are caught and ignored so this is safe to re-run.
 */
export async function migrate(): Promise<void> {
  const createTables: string[] = [
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      security_question TEXT NOT NULL,
      security_answer TEXT NOT NULL,
      name VARCHAR(255) NOT NULL,
      position VARCHAR(50) NOT NULL,
      practice_area VARCHAR(255),
      custom_position_id VARCHAR(36),
      is_admin TINYINT(1) NOT NULL DEFAULT 0,
      is_super_user TINYINT(1) NOT NULL DEFAULT 0,
      is_managing_partner TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      must_change_password TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      INDEX idx_sessions_user (user_id),
      INDEX idx_sessions_token (token_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS custom_positions (
      id VARCHAR(36) PRIMARY KEY,
      label VARCHAR(255) NOT NULL,
      level VARCHAR(50) NOT NULL,
      practice_area VARCHAR(255),
      base_position VARCHAR(50) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS period_configs (
      period VARCHAR(50) PRIMARY KEY,
      self_start DATETIME NOT NULL,
      self_end DATETIME NOT NULL,
      supervisor_start DATETIME NOT NULL,
      supervisor_end DATETIME NOT NULL,
      feedback_start DATETIME NOT NULL,
      feedback_end DATETIME NOT NULL,
      action_plan_start DATETIME NOT NULL,
      action_plan_end DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS supervisor_assignments (
      id VARCHAR(36) PRIMARY KEY,
      employee_id VARCHAR(36) NOT NULL,
      supervisor_id VARCHAR(36) NOT NULL,
      period VARCHAR(50) NOT NULL,
      UNIQUE KEY supervisor_assignments_employee_supervisor_period_unique (employee_id, supervisor_id, period),
      INDEX idx_sa_employee (employee_id),
      INDEX idx_sa_supervisor (supervisor_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS evaluations (
      id VARCHAR(36) PRIMARY KEY,
      evaluator_id VARCHAR(36) NOT NULL,
      evaluated_id VARCHAR(36) NOT NULL,
      period VARCHAR(50) NOT NULL,
      type VARCHAR(50) NOT NULL,
      comments TEXT NOT NULL,
      supervisor_comments TEXT,
      total_score DOUBLE NOT NULL DEFAULT 0,
      completed_at DATETIME,
      feedback_completed TINYINT(1) NOT NULL DEFAULT 0,
      feedback_completed_at DATETIME,
      feedback_completed_by VARCHAR(36),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY evaluations_evaluator_evaluated_period_type_unique (evaluator_id, evaluated_id, period, type),
      INDEX idx_eval_evaluator (evaluator_id),
      INDEX idx_eval_evaluated (evaluated_id),
      INDEX idx_eval_period (period)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS evaluation_responses (
      id VARCHAR(36) PRIMARY KEY,
      evaluation_id VARCHAR(36) NOT NULL,
      question_id VARCHAR(36) NOT NULL,
      score DOUBLE NOT NULL DEFAULT 0,
      not_applicable TINYINT(1) NOT NULL DEFAULT 0,
      no_elements TINYINT(1) NOT NULL DEFAULT 0,
      na_approved TINYINT(1) NOT NULL DEFAULT 0,
      weight DOUBLE NOT NULL DEFAULT 1,
      response_text TEXT,
      INDEX idx_er_evaluation (evaluation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS evaluation_na_approvals (
      id VARCHAR(36) PRIMARY KEY,
      evaluation_id VARCHAR(36) NOT NULL,
      question_id VARCHAR(36) NOT NULL,
      approved TINYINT(1) NOT NULL DEFAULT 0,
      approved_by VARCHAR(36),
      approved_at DATETIME,
      UNIQUE KEY ena_eval_question_unique (evaluation_id, question_id),
      INDEX idx_ena_evaluation (evaluation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS action_plans (
      id VARCHAR(36) PRIMARY KEY,
      employee_id VARCHAR(36) NOT NULL,
      supervisor_id VARCHAR(36) NOT NULL,
      period VARCHAR(50) NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      approval_status VARCHAR(50) NOT NULL DEFAULT 'pending',
      approval_comments TEXT,
      approved_by VARCHAR(36),
      approved_at DATETIME,
      status VARCHAR(50) NOT NULL DEFAULT 'draft',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY action_plans_employee_period_unique (employee_id, period),
      INDEX idx_ap_employee (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS smart_action_items (
      id VARCHAR(36) PRIMARY KEY,
      action_plan_id VARCHAR(36) NOT NULL,
      competencia VARCHAR(255) NOT NULL DEFAULT '',
      objetivo TEXT NOT NULL,
      acciones TEXT NOT NULL,
      que_evitar TEXT NOT NULL DEFAULT '',
      fecha_revision VARCHAR(50) NOT NULL DEFAULT '',
      apoyos TEXT NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sai_plan (action_plan_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS personal_objectives (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      period VARCHAR(50) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'personal',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY personal_objectives_user_period_unique (user_id, period),
      INDEX idx_po_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS admin_objectives (
      id VARCHAR(36) PRIMARY KEY,
      personal_objectives_id VARCHAR(36) NOT NULL,
      tipo_objetivo VARCHAR(255) NOT NULL DEFAULT '',
      nombre_objetivo VARCHAR(255) NOT NULL DEFAULT '',
      pilares_estrategicos TEXT,
      alcance TEXT,
      porcentaje_avance DOUBLE NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'draft',
      submitted_at DATETIME,
      reviewed_by VARCHAR(36),
      reviewed_at DATETIME,
      reviewer_comment TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ao_parent (personal_objectives_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS legal_objectives (
      id VARCHAR(36) PRIMARY KEY,
      personal_objectives_id VARCHAR(36) NOT NULL,
      horas_meta DOUBLE NOT NULL DEFAULT 0,
      horas_ajustadas DOUBLE NOT NULL DEFAULT 0,
      porcentaje_horas_vs_meta DOUBLE NOT NULL DEFAULT 0,
      porcentaje_eficiencia DOUBLE NOT NULL DEFAULT 0,
      meta_pro_bono DOUBLE NOT NULL DEFAULT 0,
      realizado_pro_bono DOUBLE NOT NULL DEFAULT 0,
      meta_marketing DOUBLE NOT NULL DEFAULT 0,
      realizado_marketing DOUBLE NOT NULL DEFAULT 0,
      meta_business_dev DOUBLE NOT NULL DEFAULT 0,
      realizado_business_dev DOUBLE NOT NULL DEFAULT 0,
      meta_mentoring DOUBLE NOT NULL DEFAULT 0,
      realizado_mentoring DOUBLE NOT NULL DEFAULT 0,
      resultado_area DOUBLE NOT NULL DEFAULT 0,
      resultado_firma DOUBLE NOT NULL DEFAULT 0,
      porcentaje_total_bono DOUBLE NOT NULL DEFAULT 0,
      INDEX idx_lo_parent (personal_objectives_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS announcements (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      audience VARCHAR(50) NOT NULL DEFAULT 'all',
      priority VARCHAR(50) NOT NULL DEFAULT 'normal',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      archived TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      author_id VARCHAR(36) NOT NULL,
      INDEX idx_ann_author (author_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS announcement_reads (
      id VARCHAR(36) PRIMARY KEY,
      announcement_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ar_announcement (announcement_id),
      INDEX idx_ar_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS vacation_requests (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      start_date VARCHAR(50) NOT NULL,
      end_date VARCHAR(50) NOT NULL,
      days INT NOT NULL DEFAULT 0,
      reason TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      period VARCHAR(50),
      INDEX idx_vr_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS vacation_approvals (
      id VARCHAR(36) PRIMARY KEY,
      vacation_request_id VARCHAR(36) NOT NULL,
      approver_id VARCHAR(36) NOT NULL,
      approved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      action VARCHAR(50) NOT NULL,
      comment TEXT,
      INDEX idx_va_request (vacation_request_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS vacation_config (
      position VARCHAR(50) PRIMARY KEY,
      days INT NOT NULL DEFAULT 20
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS extra_vacation_days (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      days INT NOT NULL DEFAULT 0,
      reason TEXT NOT NULL,
      added_by VARCHAR(36) NOT NULL,
      added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      period VARCHAR(50),
      INDEX idx_evd_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS custom_eval_questions (
      id VARCHAR(36) PRIMARY KEY,
      position VARCHAR(50) NOT NULL,
      question_id VARCHAR(36) NOT NULL,
      category VARCHAR(50) NOT NULL,
      text TEXT NOT NULL,
      weight DOUBLE NOT NULL DEFAULT 1,
      hidden TINYINT(1) NOT NULL DEFAULT 0,
      UNIQUE KEY custom_eval_questions_position_question_unique (position, question_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS library_questions (
      id VARCHAR(36) PRIMARY KEY,
      question_id VARCHAR(36) NOT NULL UNIQUE,
      category VARCHAR(50) NOT NULL,
      text TEXT NOT NULL,
      default_weight INT NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(36)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS seed_question_overrides (
      question_id VARCHAR(36) PRIMARY KEY,
      text TEXT,
      category VARCHAR(50),
      weight INT,
      hidden TINYINT(1) NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS module_config (
      id INT PRIMARY KEY DEFAULT 1,
      evaluations TINYINT(1) NOT NULL DEFAULT 1,
      communications TINYINT(1) NOT NULL DEFAULT 1,
      vacations TINYINT(1) NOT NULL DEFAULT 1,
      copilot TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS system_status (
      id INT PRIMARY KEY DEFAULT 1,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      activation_date VARCHAR(50) NOT NULL,
      payment_plan VARCHAR(50) NOT NULL DEFAULT 'monthly',
      max_users INT NOT NULL DEFAULT 50,
      tickets INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS activation_history (
      id VARCHAR(36) PRIMARY KEY,
      action VARCHAR(255) NOT NULL,
      date DATETIME NOT NULL,
      by_user_id VARCHAR(36)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS copilot_conversations (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL DEFAULT 'Nueva conversación',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cc_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS copilot_messages (
      id VARCHAR(36) PRIMARY KEY,
      conversation_id VARCHAR(36) NOT NULL,
      role VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      tool_calls TEXT,
      tool_results TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cm_conversation (conversation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS copilot_config (
      id INT PRIMARY KEY DEFAULT 1,
      model VARCHAR(255) NOT NULL DEFAULT 'qwen3.5:397b',
      api_provider VARCHAR(50) NOT NULL DEFAULT 'ollama',
      api_base_url VARCHAR(500) DEFAULT NULL,
      api_key TEXT,
      can_manage_users TINYINT(1) NOT NULL DEFAULT 1,
      can_manage_evaluations TINYINT(1) NOT NULL DEFAULT 1,
      can_manage_vacations TINYINT(1) NOT NULL DEFAULT 1,
      can_manage_announcements TINYINT(1) NOT NULL DEFAULT 1,
      can_manage_periods TINYINT(1) NOT NULL DEFAULT 0,
      can_manage_system TINYINT(1) NOT NULL DEFAULT 0,
      can_view_reports TINYINT(1) NOT NULL DEFAULT 1,
      max_tokens INT NOT NULL DEFAULT 2048,
      temperature DOUBLE NOT NULL DEFAULT 0.3
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];

  // ─── Execute CREATE TABLE statements ────────────────────────────────────────
  for (const sql of createTables) {
    try {
      await exec(sql);
    } catch (err: any) {
      if (err?.code === 'ER_TABLE_EXISTS_ERROR' || /already exists/i.test(err?.message)) {
        // Table already exists — fine, skip
      } else {
        console.error('Error creating table:', err);
        throw err;
      }
    }
  }

  // ─── ALTER TABLE migrations for existing databases ──────────────────────────
  const alterMigrations: string[] = [
    // evaluation_responses: add not_applicable and no_elements
    `ALTER TABLE evaluation_responses ADD COLUMN IF NOT EXISTS not_applicable TINYINT(1) NOT NULL DEFAULT 0 AFTER score`,
    `ALTER TABLE evaluation_responses ADD COLUMN IF NOT EXISTS no_elements TINYINT(1) NOT NULL DEFAULT 0 AFTER not_applicable`,

    // evaluation_na_approvals: add approved column and unique key
    `ALTER TABLE evaluation_na_approvals ADD COLUMN IF NOT EXISTS approved TINYINT(1) NOT NULL DEFAULT 0 AFTER question_id`,
    `ALTER TABLE evaluation_na_approvals ADD UNIQUE INDEX IF NOT EXISTS ena_eval_question_unique (evaluation_id, question_id)`,

    // action_plans: add missing columns
    `ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '' AFTER period`,
    `ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) NOT NULL DEFAULT 'pending' AFTER content`,
    `ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS approval_comments TEXT AFTER approval_status`,
    `ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS approved_by VARCHAR(36) AFTER approval_comments`,
    `ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS approved_at DATETIME AFTER approved_by`,

    // smart_action_items: add missing SMART columns
    `ALTER TABLE smart_action_items ADD COLUMN IF NOT EXISTS competencia VARCHAR(255) NOT NULL DEFAULT '' AFTER action_plan_id`,
    `ALTER TABLE smart_action_items ADD COLUMN IF NOT EXISTS objetivo TEXT NOT NULL AFTER competencia`,
    `ALTER TABLE smart_action_items ADD COLUMN IF NOT EXISTS acciones TEXT NOT NULL AFTER objetivo`,
    `ALTER TABLE smart_action_items ADD COLUMN IF NOT EXISTS que_evitar TEXT NOT NULL DEFAULT '' AFTER acciones`,
    `ALTER TABLE smart_action_items ADD COLUMN IF NOT EXISTS fecha_revision VARCHAR(50) NOT NULL DEFAULT '' AFTER que_evitar`,
    `ALTER TABLE smart_action_items ADD COLUMN IF NOT EXISTS apoyos TEXT NOT NULL DEFAULT '' AFTER fecha_revision`,

    // personal_objectives: make pilares_estrategicos and alcance nullable (code doesn't always provide them)
    `ALTER TABLE personal_objectives MODIFY COLUMN pilares_estrategicos TEXT NULL`,
    `ALTER TABLE personal_objectives MODIFY COLUMN alcance TEXT NULL`,

    // admin_objectives: add missing columns
    `ALTER TABLE admin_objectives ADD COLUMN IF NOT EXISTS personal_objectives_id VARCHAR(36) AFTER id`,
    `ALTER TABLE admin_objectives ADD COLUMN IF NOT EXISTS tipo_objetivo VARCHAR(255) NOT NULL DEFAULT '' AFTER personal_objectives_id`,
    `ALTER TABLE admin_objectives ADD COLUMN IF NOT EXISTS nombre_objetivo VARCHAR(255) NOT NULL DEFAULT '' AFTER tipo_objetivo`,
    `ALTER TABLE admin_objectives ADD COLUMN IF NOT EXISTS pilares_estrategicos TEXT AFTER nombre_objetivo`,
    `ALTER TABLE admin_objectives ADD COLUMN IF NOT EXISTS alcance TEXT AFTER pilares_estrategicos`,
    `ALTER TABLE admin_objectives ADD COLUMN IF NOT EXISTS porcentaje_avance DOUBLE NOT NULL DEFAULT 0 AFTER alcance`,
    `ALTER TABLE admin_objectives ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'draft' AFTER porcentaje_avance`,
    `ALTER TABLE admin_objectives ADD COLUMN IF NOT EXISTS submitted_at DATETIME AFTER status`,
    `ALTER TABLE admin_objectives ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(36) AFTER submitted_at`,
    `ALTER TABLE admin_objectives ADD COLUMN IF NOT EXISTS reviewed_at DATETIME AFTER reviewed_by`,
    `ALTER TABLE admin_objectives ADD COLUMN IF NOT EXISTS reviewer_comment TEXT AFTER reviewed_at`,

    // legal_objectives: add missing columns
    `ALTER TABLE legal_objectives ADD COLUMN IF NOT EXISTS personal_objectives_id VARCHAR(36) AFTER id`,
    `ALTER TABLE legal_objectives ADD COLUMN IF NOT EXISTS horas_meta DOUBLE NOT NULL DEFAULT 0 AFTER personal_objectives_id`,
    `ALTER TABLE legal_objectives ADD COLUMN IF NOT EXISTS horas_ajustadas DOUBLE NOT NULL DEFAULT 0 AFTER horas_meta`,
    `ALTER TABLE legal_objectives ADD COLUMN IF NOT EXISTS porcentaje_horas_vs_meta DOUBLE NOT NULL DEFAULT 0 AFTER horas_ajustadas`,
    `ALTER TABLE legal_objectives ADD COLUMN IF NOT EXISTS porcentaje_eficiencia DOUBLE NOT NULL DEFAULT 0 AFTER porcentaje_horas_vs_meta`,
    `ALTER TABLE legal_objectives ADD COLUMN IF NOT EXISTS meta_pro_bono DOUBLE NOT NULL DEFAULT 0 AFTER porcentaje_eficiencia`,
    `ALTER TABLE legal_objectives ADD COLUMN IF NOT EXISTS realizado_pro_bono DOUBLE NOT NULL DEFAULT 0 AFTER meta_pro_bono`,
    `ALTER TABLE legal_objectives ADD COLUMN IF NOT EXISTS meta_marketing DOUBLE NOT NULL DEFAULT 0 AFTER realizado_pro_bono`,
    `ALTER TABLE legal_objectives ADD COLUMN IF NOT EXISTS realizado_marketing DOUBLE NOT NULL DEFAULT 0 AFTER meta_marketing`,
    `ALTER TABLE legal_objectives ADD COLUMN IF NOT EXISTS meta_business_dev DOUBLE NOT NULL DEFAULT 0 AFTER realizado_marketing`,
    `ALTER TABLE legal_objectives ADD COLUMN IF NOT EXISTS realizado_business_dev DOUBLE NOT NULL DEFAULT 0 AFTER meta_business_dev`,
    `ALTER TABLE legal_objectives ADD COLUMN IF NOT EXISTS meta_mentoring DOUBLE NOT NULL DEFAULT 0 AFTER realizado_business_dev`,
    `ALTER TABLE legal_objectives ADD COLUMN IF NOT EXISTS realizado_mentoring DOUBLE NOT NULL DEFAULT 0 AFTER meta_mentoring`,
    `ALTER TABLE legal_objectives ADD COLUMN IF NOT EXISTS resultado_area DOUBLE NOT NULL DEFAULT 0 AFTER realizado_mentoring`,
    `ALTER TABLE legal_objectives ADD COLUMN IF NOT EXISTS resultado_firma DOUBLE NOT NULL DEFAULT 0 AFTER resultado_area`,
    `ALTER TABLE legal_objectives ADD COLUMN IF NOT EXISTS porcentaje_total_bono DOUBLE NOT NULL DEFAULT 0 AFTER resultado_firma`,

    // vacation_requests: add days column if missing
    `ALTER TABLE vacation_requests ADD COLUMN IF NOT EXISTS days INT NOT NULL DEFAULT 0 AFTER end_date`,
  ];

  for (const sql of alterMigrations) {
    try {
      await exec(sql);
    } catch (err: any) {
      if (/already exists/i.test(err?.message) || /Duplicate column/i.test(err?.message) || /Duplicate key/i.test(err?.message)) {
        // Already exists — fine, skip
      } else {
        console.error('Alter table warning:', err?.message || err);
        // Don't throw — non-critical if alter fails
      }
    }
  }

  // ─── Verify ──────────────────────────────────────────────────────────────────
  const tableCount = await getScalar<number>(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()`
  );
  console.log(`Migration completed successfully. ${tableCount} tables in database.`);
}
