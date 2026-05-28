import { pool, exec, getScalar, run, get, all } from './connection.js';

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
      location_id VARCHAR(50),
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
      work_area_id VARCHAR(50) NOT NULL,
      base_position VARCHAR(50) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS work_areas (
      id VARCHAR(50) PRIMARY KEY,
      label VARCHAR(255) NOT NULL,
      level ENUM('legal','administrativo') NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS locations (
      id VARCHAR(50) PRIMARY KEY,
      label VARCHAR(255) NOT NULL,
      city VARCHAR(255),
      office VARCHAR(255),
      floor VARCHAR(50),
      desk VARCHAR(50),
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
      content TEXT NOT NULL,
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
      que_evitar TEXT NOT NULL,
      fecha_revision VARCHAR(50) NOT NULL DEFAULT '',
      apoyos TEXT NOT NULL,
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
      max_admin_users INT NOT NULL DEFAULT 3,
      tickets INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    
    `CREATE TABLE IF NOT EXISTS user_timeline (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      event_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      old_value TEXT,
      new_value TEXT,
      metadata TEXT,
      note TEXT,
      created_by VARCHAR(36),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_timeline_user_date (user_id, event_date DESC),
      INDEX idx_timeline_type (event_type)
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
    `ALTER TABLE evaluation_responses ADD COLUMN not_applicable TINYINT(1) NOT NULL DEFAULT 0 AFTER score`,
    `ALTER TABLE evaluation_responses ADD COLUMN no_elements TINYINT(1) NOT NULL DEFAULT 0 AFTER not_applicable`,

    // evaluation_na_approvals: add approved column and unique key
    `ALTER TABLE evaluation_na_approvals ADD COLUMN approved TINYINT(1) NOT NULL DEFAULT 0 AFTER question_id`,
    `ALTER TABLE evaluation_na_approvals ADD UNIQUE INDEX IF NOT EXISTS ena_eval_question_unique (evaluation_id, question_id)`,

    // action_plans: add missing columns
    `ALTER TABLE action_plans ADD COLUMN content TEXT NOT NULL AFTER period`,
    `ALTER TABLE action_plans ADD COLUMN approval_status VARCHAR(50) NOT NULL DEFAULT 'pending' AFTER content`,
    `ALTER TABLE action_plans ADD COLUMN approval_comments TEXT AFTER approval_status`,
    `ALTER TABLE action_plans ADD COLUMN approved_by VARCHAR(36) AFTER approval_comments`,
    `ALTER TABLE action_plans ADD COLUMN approved_at DATETIME AFTER approved_by`,

    // smart_action_items: add missing SMART columns
    `ALTER TABLE smart_action_items ADD COLUMN competencia VARCHAR(255) NOT NULL DEFAULT '' AFTER action_plan_id`,
    `ALTER TABLE smart_action_items ADD COLUMN objetivo TEXT NOT NULL AFTER competencia`,
    `ALTER TABLE smart_action_items ADD COLUMN acciones TEXT NOT NULL AFTER objetivo`,
    `ALTER TABLE smart_action_items ADD COLUMN que_evitar TEXT NOT NULL AFTER acciones`,
    `ALTER TABLE smart_action_items ADD COLUMN fecha_revision VARCHAR(50) NOT NULL DEFAULT '' AFTER que_evitar`,
    `ALTER TABLE smart_action_items ADD COLUMN apoyos TEXT NOT NULL AFTER fecha_revision`,

    // personal_objectives: make pilares_estrategicos and alcance nullable (code doesn't always provide them)
    `ALTER TABLE personal_objectives MODIFY COLUMN pilares_estrategicos TEXT NULL`,
    `ALTER TABLE personal_objectives MODIFY COLUMN alcance TEXT NULL`,

    // admin_objectives: add missing columns
    `ALTER TABLE admin_objectives ADD COLUMN personal_objectives_id VARCHAR(36) AFTER id`,
    `ALTER TABLE admin_objectives ADD COLUMN tipo_objetivo VARCHAR(255) NOT NULL DEFAULT '' AFTER personal_objectives_id`,
    `ALTER TABLE admin_objectives ADD COLUMN nombre_objetivo VARCHAR(255) NOT NULL DEFAULT '' AFTER tipo_objetivo`,
    `ALTER TABLE admin_objectives ADD COLUMN pilares_estrategicos TEXT AFTER nombre_objetivo`,
    `ALTER TABLE admin_objectives ADD COLUMN alcance TEXT AFTER pilares_estrategicos`,
    `ALTER TABLE admin_objectives ADD COLUMN porcentaje_avance DOUBLE NOT NULL DEFAULT 0 AFTER alcance`,
    `ALTER TABLE admin_objectives ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'draft' AFTER porcentaje_avance`,
    `ALTER TABLE admin_objectives ADD COLUMN submitted_at DATETIME AFTER status`,
    `ALTER TABLE admin_objectives ADD COLUMN reviewed_by VARCHAR(36) AFTER submitted_at`,
    `ALTER TABLE admin_objectives ADD COLUMN reviewed_at DATETIME AFTER reviewed_by`,
    `ALTER TABLE admin_objectives ADD COLUMN reviewer_comment TEXT AFTER reviewed_at`,

    // legal_objectives: add missing columns
    `ALTER TABLE legal_objectives ADD COLUMN personal_objectives_id VARCHAR(36) AFTER id`,
    `ALTER TABLE legal_objectives ADD COLUMN horas_meta DOUBLE NOT NULL DEFAULT 0 AFTER personal_objectives_id`,
    `ALTER TABLE legal_objectives ADD COLUMN horas_ajustadas DOUBLE NOT NULL DEFAULT 0 AFTER horas_meta`,
    `ALTER TABLE legal_objectives ADD COLUMN porcentaje_horas_vs_meta DOUBLE NOT NULL DEFAULT 0 AFTER horas_ajustadas`,
    `ALTER TABLE legal_objectives ADD COLUMN porcentaje_eficiencia DOUBLE NOT NULL DEFAULT 0 AFTER porcentaje_horas_vs_meta`,
    `ALTER TABLE legal_objectives ADD COLUMN meta_pro_bono DOUBLE NOT NULL DEFAULT 0 AFTER porcentaje_eficiencia`,
    `ALTER TABLE legal_objectives ADD COLUMN realizado_pro_bono DOUBLE NOT NULL DEFAULT 0 AFTER meta_pro_bono`,
    `ALTER TABLE legal_objectives ADD COLUMN meta_marketing DOUBLE NOT NULL DEFAULT 0 AFTER realizado_pro_bono`,
    `ALTER TABLE legal_objectives ADD COLUMN realizado_marketing DOUBLE NOT NULL DEFAULT 0 AFTER meta_marketing`,
    `ALTER TABLE legal_objectives ADD COLUMN meta_business_dev DOUBLE NOT NULL DEFAULT 0 AFTER realizado_marketing`,
    `ALTER TABLE legal_objectives ADD COLUMN realizado_business_dev DOUBLE NOT NULL DEFAULT 0 AFTER meta_business_dev`,
    `ALTER TABLE legal_objectives ADD COLUMN meta_mentoring DOUBLE NOT NULL DEFAULT 0 AFTER realizado_business_dev`,
    `ALTER TABLE legal_objectives ADD COLUMN realizado_mentoring DOUBLE NOT NULL DEFAULT 0 AFTER meta_mentoring`,
    `ALTER TABLE legal_objectives ADD COLUMN resultado_area DOUBLE NOT NULL DEFAULT 0 AFTER realizado_mentoring`,
    `ALTER TABLE legal_objectives ADD COLUMN resultado_firma DOUBLE NOT NULL DEFAULT 0 AFTER resultado_area`,
    `ALTER TABLE legal_objectives ADD COLUMN porcentaje_total_bono DOUBLE NOT NULL DEFAULT 0 AFTER resultado_firma`,

    // vacation_requests: add days column if missing
    `ALTER TABLE vacation_requests ADD COLUMN days INT NOT NULL DEFAULT 0 AFTER end_date`,

    // ─── Work Areas & Positions & Locations ──────────────────────────────────
    // work_areas: create table
    `CREATE TABLE IF NOT EXISTS work_areas (
      id VARCHAR(50) PRIMARY KEY,
      label VARCHAR(255) NOT NULL,
      level ENUM('legal','administrativo') NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // locations: create table
    `CREATE TABLE IF NOT EXISTS locations (
      id VARCHAR(50) PRIMARY KEY,
      label VARCHAR(255) NOT NULL,
      city VARCHAR(255),
      office VARCHAR(255),
      floor VARCHAR(50),
      desk VARCHAR(50),
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // custom_positions: add work_area_id and updated_at
    `ALTER TABLE custom_positions ADD COLUMN work_area_id VARCHAR(50) AFTER label`,
    `ALTER TABLE custom_positions ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,

    // users: add location_id
    `ALTER TABLE users ADD COLUMN location_id VARCHAR(50) AFTER must_change_password`,
  ];

  for (const sql of alterMigrations) {
    try {
      await exec(sql);
    } catch (err: any) {
      if (/already exists/i.test(err?.message) || /Duplicate column/i.test(err?.message) || /Duplicate key/i.test(err?.message) || /duplicate column name/i.test(err?.message)) {
        // Already exists — fine, skip
      } else {
        console.error('Alter table warning:', err?.message || err);
        // Don't throw — non-critical if alter fails
      }
    }
  }

  // ─── Data Migration: Work Areas & Positions ────────────────────────────────
  // 1. Ensure all 4 current work areas exist (INSERT IGNORE handles existing)
  console.log('  Ensuring work areas exist...');
  const now = new Date().toISOString();
  const areas = [
    ['fiscal_consultoria', 'Fiscal Consultoría', 'legal', 1],
    ['fiscal_litigio', 'Fiscal Litigio', 'legal', 2],
    ['corporativo', 'Corporativo', 'legal', 3],
    ['backoffice', 'Backoffice', 'administrativo', 4],
  ] as const;
  for (const [id, label, level, sortOrder] of areas) {
    await run(
      'INSERT IGNORE INTO work_areas (id, label, level, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, label, level, sortOrder, now, now]
    );
  }
  console.log('  ✓ work_areas ensured');

  // 2. Migrate old work_area IDs to new ones (handles upgrades from previous schema)
  // Old: consultoria_fiscal → fiscal_consultoria, litigio_fiscal → fiscal_litigio,
  //      administrativo → backoffice, general → corporativo
  const oldToNewArea: Record<string, string> = {
    'consultoria_fiscal': 'fiscal_consultoria',
    'litigio_fiscal': 'fiscal_litigio',
    'administrativo': 'backoffice',
    'general': 'corporativo',
  };
  for (const [oldId, newId] of Object.entries(oldToNewArea)) {
    const migrated = await run(
      `UPDATE custom_positions SET work_area_id = ? WHERE work_area_id = ?`,
      [newId, oldId]
    );
    if (migrated && migrated.affectedRows > 0) {
      console.log(`  ✓ Migrated ${migrated.affectedRows} positions from area '${oldId}' to '${newId}'`);
    }
    // Also migrate users with practice_area pointing to old IDs
    const userMigrated = await run(
      `UPDATE users SET practice_area = ? WHERE practice_area = ?`,
      [newId, oldId]
    );
    if (userMigrated && userMigrated.affectedRows > 0) {
      console.log(`  ✓ Migrated ${userMigrated.affectedRows} users from practice_area '${oldId}' to '${newId}'`);
    }
  }

  // 3. Fix positions with NULL work_area_id
  const nullWorkAreaCount = await getScalar<number>(
    'SELECT COUNT(*) AS cnt FROM custom_positions WHERE work_area_id IS NULL'
  );
  if (nullWorkAreaCount && nullWorkAreaCount > 0) {
    console.log(`  Migrating ${nullWorkAreaCount} positions to work_area_id...`);
    // Set all NULL work_area_id positions to 'backoffice' as a safe default
    // (these would be from an old schema migration and are likely admin positions)
    await run("UPDATE custom_positions SET work_area_id = 'backoffice' WHERE work_area_id IS NULL");
    console.log('  ✓ positions migrated to work_area_id');
  }

  // 4. Remove stale work areas (old IDs that are no longer valid)
  const validAreaIds = areas.map(a => a[0]);
  const staleAreas = await all(`SELECT id FROM work_areas WHERE id NOT IN (${validAreaIds.map(() => '?').join(',')})`, validAreaIds);
  for (const stale of staleAreas) {
    // Check if any positions reference this area before deleting
    const posUsingStale = await getScalar<number>(`SELECT COUNT(*) AS cnt FROM custom_positions WHERE work_area_id = ?`, [stale.id]);
    if (posUsingStale === 0) {
      await run('DELETE FROM work_areas WHERE id = ?', [stale.id]);
      console.log(`  ✓ Removed stale work area '${stale.id}'`);
    } else {
      console.log(`  ⚠ Cannot remove stale work area '${stale.id}': ${posUsingStale} position(s) still reference it`);
    }
  }

  // Seed positions if custom_positions is empty (e.g. existing DB that had positions lost during schema change)
  const posCount = await getScalar<number>('SELECT COUNT(*) AS cnt FROM custom_positions');
  if (posCount === 0) {
    console.log('  Seeding positions into custom_positions...');
    const now = new Date().toISOString();
    const positions = [
      ['SMPS01', 'Socio Consultoría Fiscal', 'fiscal_consultoria', 'socio'],
      ['SMPS02', 'Socio Litigio Fiscal', 'fiscal_litigio', 'socio'],
      ['SMPS03', 'Socio Corporativo', 'corporativo', 'socio'],
      ['SMPS04', 'Salary Partner Consultoría Fiscal', 'fiscal_consultoria', 'salary_partner'],
      ['SMPS05', 'Salary Partner Litigio Fiscal', 'fiscal_litigio', 'salary_partner'],
      ['SMPS06', 'Salary Partner Corporativo', 'corporativo', 'salary_partner'],
      ['SMPS07', 'Counsel Consultoría Fiscal', 'fiscal_consultoria', 'counsel'],
      ['SMPS08', 'Counsel Litigio Fiscal', 'fiscal_litigio', 'counsel'],
      ['SMPS09', 'Counsel Corporativo', 'corporativo', 'counsel'],
      ['SMPS10', 'Asociado Sr Consultoría Fiscal', 'fiscal_consultoria', 'asociado_sr'],
      ['SMPS11', 'Asociado Sr Litigio Fiscal', 'fiscal_litigio', 'asociado_sr'],
      ['SMPS12', 'Asociado Sr Corporativo', 'corporativo', 'asociado_sr'],
      ['SMPS13', 'Asociado Mid Consultoría Fiscal', 'fiscal_consultoria', 'asociado_mid'],
      ['SMPS14', 'Asociado Mid Litigio Fiscal', 'fiscal_litigio', 'asociado_mid'],
      ['SMPS15', 'Asociado Mid Corporativo', 'corporativo', 'asociado_mid'],
      ['SMPS16', 'Asociado Jr Consultoría Fiscal', 'fiscal_consultoria', 'asociado_jr'],
      ['SMPS17', 'Asociado Jr Litigio Fiscal', 'fiscal_litigio', 'asociado_jr'],
      ['SMPS18', 'Asociado Jr Corporativo', 'corporativo', 'asociado_jr'],
      ['SMPS19', 'Pasante con Carrera Terminada Consultoría Fiscal', 'fiscal_consultoria', 'pasante_carrera'],
      ['SMPS20', 'Pasante con Carrera Terminada Litigio Fiscal', 'fiscal_litigio', 'pasante_carrera'],
      ['SMPS21', 'Pasante con Carrera Terminada Corporativo', 'corporativo', 'pasante_carrera'],
      ['SMPS22', 'Pasante Consultoría Fiscal', 'fiscal_consultoria', 'pasante'],
      ['SMPS23', 'Pasante Litigio Fiscal', 'fiscal_litigio', 'pasante'],
      ['SMPS24', 'Pasante Corporativo', 'corporativo', 'pasante'],
      ['SMPS25', 'Director de Marketing y BD', 'backoffice', 'director'],
      ['SMPS26', 'Directora de Admón y Finanzas', 'backoffice', 'director'],
      ['SMPS27', 'Directora de Recursos Humanos', 'backoffice', 'director'],
      ['SMPS28', 'Coord. Cobranza', 'backoffice', 'coordinador'],
      ['SMPS29', 'Coord. Servicios Generales', 'backoffice', 'coordinador'],
      ['SMPS30', 'Coordinador de BD', 'backoffice', 'coordinador'],
      ['SMPS31', 'Coordinador de Marketing', 'backoffice', 'coordinador'],
      ['SMPS32', 'Coordinadora de R.H.', 'backoffice', 'coordinador'],
      ['SMPS33', 'Gte. Facturación y Cobranza', 'backoffice', 'gerente'],
      ['SMPS34', 'Analista Sistemas', 'backoffice', 'analista'],
      ['SMPS35', 'Soporte Sistemas', 'backoffice', 'soporte'],
      ['SMPS36', 'Archivista', 'backoffice', 'archivista'],
      ['SMPS37', 'Asistente Consultoría Fiscal', 'backoffice', 'asistente'],
      ['SMPS38', 'Asistente Corporativo', 'backoffice', 'asistente'],
    ] as const;
    for (const [id, label, workAreaId, basePosition] of positions) {
      await run(
        'INSERT IGNORE INTO custom_positions (id, label, work_area_id, base_position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, label, workAreaId, basePosition, now, now]
      );
    }
    console.log(`  ✓ ${positions.length} positions seeded`);
  }


  // ─── Add user_timeline table if missing ──────────────────────────────────
  try {
    const timelineCheck = await getScalar<number>(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_timeline'`
    );
    if (timelineCheck === 0) {
      await run(`CREATE TABLE IF NOT EXISTS user_timeline (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        old_value TEXT,
        new_value TEXT,
        metadata TEXT,
        note TEXT,
        created_by VARCHAR(36),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_timeline_user_date (user_id, event_date DESC),
        INDEX idx_timeline_type (event_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      console.log('  ✓ Created user_timeline table');
    }
  } catch (e) {
    console.log('  ⚠ Could not create user_timeline table (may already exist):', (e as Error).message);
  }

  // ─── Verify ──────────────────────────────────────────────────────────────────
  // ─── Add max_admin_users column if missing ────────────────────────────────
  try {
    const colCheck = await getScalar<number>(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_status' AND COLUMN_NAME = 'max_admin_users'`
    );
    if (colCheck === 0) {
      await run(`ALTER TABLE system_status ADD COLUMN max_admin_users INT NOT NULL DEFAULT 3`);
      console.log('  ✓ Added max_admin_users column to system_status');
    }
  } catch (e) {
    console.log('  ⚠ Could not add max_admin_users column (may already exist):', (e as Error).message);
  }
  const tableCount = await getScalar<number>(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()`
  );
  console.log(`Migration completed successfully. ${tableCount} tables in database.`);

  // Migration: Add unique constraint to announcement_reads for (announcement_id, user_id)
  try {
    await db.run('ALTER TABLE announcement_reads ADD UNIQUE INDEX ar_announcement_user_unique (announcement_id, user_id)');
    console.log('✅ Added unique constraint to announcement_reads');
  } catch (err: any) {
    if (err.code === 'ER_DUP_KEYNAME' || err.message?.includes('Duplicate key name')) {
      console.log('⏭️  Unique constraint on announcement_reads already exists');
    } else {
      console.error('⚠️  Could not add unique constraint to announcement_reads:', err.message);
    }
  }

  // Migration: Round all total_score values to whole numbers (remove decimals)
  try {
    const rounded = await run('UPDATE evaluations SET total_score = ROUND(total_score) WHERE total_score != ROUND(total_score)');
    console.log('✅ Rounded total_score values to whole numbers');
  } catch (e) {
    console.log('  ⚠ Could not round total_score values:', (e as Error).message);
  }


  // Migration: Round all weight values to whole numbers in evaluation_responses and custom_eval_questions
  try {
    const result1 = await run('UPDATE evaluation_responses SET weight = ROUND(weight) WHERE weight != ROUND(weight)');
    console.log('✅ Rounded evaluation_responses weight values to whole numbers');
  } catch (e) {
    console.log('  ⚠ Could not round evaluation_responses weight values:', (e as Error).message);
  }
  try {
    const result2 = await run('UPDATE custom_eval_questions SET weight = ROUND(weight) WHERE weight != ROUND(weight)');
    console.log('✅ Rounded custom_eval_questions weight values to whole numbers');
  } catch (e) {
    console.log('  ⚠ Could not round custom_eval_questions weight values:', (e as Error).message);
  }
  try {
    const result3 = await run('UPDATE seed_question_overrides SET weight = ROUND(weight) WHERE weight IS NOT NULL AND weight != ROUND(weight)');
    console.log('✅ Rounded seed_question_overrides weight values to whole numbers');
  } catch (e) {
    console.log('  ⚠ Could not round seed_question_overrides weight values:', (e as Error).message);
  }


  // Migration: Add section and practice_area columns to custom_eval_questions if missing
  try {
    const secColCheck = await getScalar<number>(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_eval_questions' AND COLUMN_NAME = 'section'`
    );
    if (secColCheck === 0) {
      await run('ALTER TABLE custom_eval_questions ADD COLUMN section VARCHAR(50) AFTER weight');
      console.log('  ✓ Added section column to custom_eval_questions');
    }
  } catch (e) {
    console.log('  ⚠ Could not add section column:', (e as Error).message);
  }
  try {
    const paColCheck = await getScalar<number>(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_eval_questions' AND COLUMN_NAME = 'practice_area'`
    );
    if (paColCheck === 0) {
      await run('ALTER TABLE custom_eval_questions ADD COLUMN practice_area VARCHAR(255) AFTER section');
      console.log('  ✓ Added practice_area column to custom_eval_questions');
    }
  } catch (e) {
    console.log('  ⚠ Could not add practice_area column:', (e as Error).message);
  }


  // ─── Migration: Normalize legacy position and practice_area values ──────
  // Convert old position keys to new canonical keys
  const positionMigrations: [string, string][] = [
    ['pasante_corporativo', 'pasante'],
    ['archivo_soporte', 'soporte'],
    ['abogado', 'asociado_jr'],  // Legacy position, map to closest equivalent
  ];
  for (const [oldVal, newVal] of positionMigrations) {
    try {
      const result = await run(`UPDATE users SET position = ? WHERE position = ?`, [newVal, oldVal]);
      if (result.affectedRows > 0) {
        console.log(`  ✓ Migrated ${result.affectedRows} user(s) from position '${oldVal}' to '${newVal}'`);
      }
    } catch (e) {
      console.log(`  ⚠ Could not migrate position '${oldVal}':`, (e as Error).message);
    }
    try {
      const result2 = await run(`UPDATE custom_eval_questions SET position = ? WHERE position = ?`, [newVal, oldVal]);
      if (result2.affectedRows > 0) {
        console.log(`  ✓ Migrated ${result2.affectedRows} custom question(s) from position '${oldVal}' to '${newVal}'`);
      }
    } catch (e) {
      console.log(`  ⚠ Could not migrate custom_eval_questions position '${oldVal}':`, (e as Error).message);
    }
  }

  // Convert old practice_area keys to new canonical keys
  const practiceAreaMigrations: [string, string][] = [
    ['consultoria_fiscal', 'fiscal_consultoria'],
    ['litigio_fiscal', 'fiscal_litigio'],
    ['general', 'corporativo'],
  ];
  for (const [oldVal, newVal] of practiceAreaMigrations) {
    try {
      const result = await run(`UPDATE users SET practice_area = ? WHERE practice_area = ?`, [newVal, oldVal]);
      if (result.affectedRows > 0) {
        console.log(`  ✓ Migrated ${result.affectedRows} user(s) from practice_area '${oldVal}' to '${newVal}'`);
      }
    } catch (e) {
      console.log(`  ⚠ Could not migrate practice_area '${oldVal}':`, (e as Error).message);
    }
  }


}
