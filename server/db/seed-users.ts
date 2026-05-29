import { db, tx, pool } from './connection.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// ─── SuperAdmin Configuration ────────────────────────────────────────────
const SUPERADMIN_EMAIL = 'lab@bowdot.com';
const SUPERADMIN_PASSWORD = '3791';
const SUPERADMIN_NAME = 'SuperAdmin';

// ─── Regular Users ──────────────────────────────────────────────────────
interface SeedUser {
  name: string;
  email: string;
  position: string;
  practiceArea?: string;
  isAdmin: boolean;
  isManagingPartner: boolean;
  isActive: boolean;
  password: string;
}

const USERS: SeedUser[] = [
  // === LEGAL ===
  { name: 'Lic. Carlos Mendoza', email: 'cmendoza@smps.com', position: 'socio', isAdmin: true, isManagingPartner: true, isActive: true, password: '1234' },
  { name: 'Lic. Patricia Salinas', email: 'psalinas@smps.com', position: 'socio', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  { name: 'Lic. Andrés Beltrán', email: 'abeltran@smps.com', position: 'salary_partner', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  { name: 'Lic. Roberto Figueroa', email: 'rfigueroa@smps.com', position: 'asociado_sr', practiceArea: 'corporativo', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  { name: 'Lic. Ana Lucía Torres', email: 'atorres@smps.com', position: 'asociado_mid', practiceArea: 'corporativo', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  { name: 'Lic. Emilio Castañeda', email: 'ecastaneda@smps.com', position: 'asociado_jr', practiceArea: 'corporativo', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  { name: 'Lic. Diego Ramírez', email: 'dramirez@smps.com', position: 'pasante_carrera', practiceArea: 'corporativo', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  { name: 'Lic. Mariana Vega', email: 'mvega@smps.com', position: 'pasante_carrera', practiceArea: 'litigio_fiscal', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  { name: 'Laura Hernández', email: 'lhernandez@smps.com', position: 'pasante_corporativo', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  { name: 'Miguel Ángel López', email: 'malopez@smps.com', position: 'pasante_corporativo', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  // === ADMINISTRATIVO ===
  { name: 'Ing. Rafael Domínguez', email: 'rdominguez@smps.com', position: 'director', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  { name: 'Lic. Verónica Campos', email: 'vcampos@smps.com', position: 'gerente', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  { name: 'C.P. Sandra Morales', email: 'smorales@smps.com', position: 'coordinador', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  { name: 'Fernando Ruiz', email: 'fruiz@smps.com', position: 'analista', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  { name: 'Gabriela Ortiz', email: 'gortiz@smps.com', position: 'asistente', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  { name: 'Alejandra Núñez', email: 'anunez@smps.com', position: 'asistente', isAdmin: false, isManagingPartner: false, isActive: false, password: '1234' },
  { name: 'José Luis Paredes', email: 'jparedes@smps.com', position: 'archivo_soporte', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
];

interface SeedAssignment {
  employeeEmail: string;
  supervisorEmail: string;
  period: string;
}

const ASSIGNMENTS: SeedAssignment[] = [
  { employeeEmail: 'cmendoza@smps.com', supervisorEmail: 'psalinas@smps.com', period: '2026-H1' },
  { employeeEmail: 'psalinas@smps.com', supervisorEmail: 'cmendoza@smps.com', period: '2026-H1' },
  { employeeEmail: 'rfigueroa@smps.com', supervisorEmail: 'cmendoza@smps.com', period: '2026-H1' },
  { employeeEmail: 'atorres@smps.com', supervisorEmail: 'psalinas@smps.com', period: '2026-H1' },
  { employeeEmail: 'dramirez@smps.com', supervisorEmail: 'rfigueroa@smps.com', period: '2026-H1' },
  { employeeEmail: 'dramirez@smps.com', supervisorEmail: 'cmendoza@smps.com', period: '2026-H1' },
  { employeeEmail: 'mvega@smps.com', supervisorEmail: 'atorres@smps.com', period: '2026-H1' },
  { employeeEmail: 'mvega@smps.com', supervisorEmail: 'psalinas@smps.com', period: '2026-H1' },
  { employeeEmail: 'lhernandez@smps.com', supervisorEmail: 'rfigueroa@smps.com', period: '2026-H1' },
  { employeeEmail: 'lhernandez@smps.com', supervisorEmail: 'atorres@smps.com', period: '2026-H1' },
  { employeeEmail: 'malopez@smps.com', supervisorEmail: 'rfigueroa@smps.com', period: '2026-H1' },
  { employeeEmail: 'smorales@smps.com', supervisorEmail: 'rdominguez@smps.com', period: '2026-H1' },
  { employeeEmail: 'fruiz@smps.com', supervisorEmail: 'smorales@smps.com', period: '2026-H1' },
  { employeeEmail: 'fruiz@smps.com', supervisorEmail: 'rdominguez@smps.com', period: '2026-H1' },
  { employeeEmail: 'gortiz@smps.com', supervisorEmail: 'vcampos@smps.com', period: '2026-H1' },
  { employeeEmail: 'gortiz@smps.com', supervisorEmail: 'smorales@smps.com', period: '2026-H1' },
  { employeeEmail: 'ecastaneda@smps.com', supervisorEmail: 'rfigueroa@smps.com', period: '2026-H1' },
  { employeeEmail: 'rdominguez@smps.com', supervisorEmail: 'cmendoza@smps.com', period: '2026-H1' },
  { employeeEmail: 'vcampos@smps.com', supervisorEmail: 'rdominguez@smps.com', period: '2026-H1' },
  { employeeEmail: 'jparedes@smps.com', supervisorEmail: 'vcampos@smps.com', period: '2026-H1' },
  { employeeEmail: 'dramirez@smps.com', supervisorEmail: 'rfigueroa@smps.com', period: '2025-H2' },
  { employeeEmail: 'lhernandez@smps.com', supervisorEmail: 'rfigueroa@smps.com', period: '2025-H2' },
];

export async function seed() {
  console.log('Seeding database...');

  const now = () => new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '').slice(0, 19).replace('T', ' ');

  // ─── 1. Create SuperAdmin ────────────────────────────────────────────
  await db.transaction(async (conn) => {
    const existingSuper = await tx.get(conn, 'SELECT id FROM users WHERE email = ?', [SUPERADMIN_EMAIL]) as { id: string } | undefined;

    if (existingSuper) {
      // SuperAdmin already exists - skip password re-hashing for faster startup
      console.log(`  ✓ SuperAdmin already exists (${SUPERADMIN_EMAIL})`);
    } else {
      const saId = uuidv4();
      const saPasswordHash = bcrypt.hashSync(SUPERADMIN_PASSWORD, 12);
      const saSecurityHash = bcrypt.hashSync(SUPERADMIN_EMAIL.toLowerCase().trim(), 12);
      const saSecurityQuestion = '¿Cuál es su correo electrónico?';
      await tx.run(conn,
        `INSERT IGNORE INTO users (id, email, password_hash, security_question, security_answer, name, position, practice_area, custom_position_id, is_super_user, is_admin, is_managing_partner, is_active, must_change_password, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
        [saId, SUPERADMIN_EMAIL, saPasswordHash, saSecurityQuestion, saSecurityHash, SUPERADMIN_NAME, 'socio', null, 1, 1, 1, 1, 0, now(), now()]
      );
      console.log(`  ✓ SuperAdmin created (${SUPERADMIN_EMAIL})`);
    }

    // ─── 2. Create regular users ────────────────────────────────────────
    for (const user of USERS) {
      // Check if user already exists to skip expensive bcrypt hashing
      const existingUser = await tx.get(conn, 'SELECT id FROM users WHERE email = ?', [user.email]) as { id: string } | undefined;
      if (existingUser) {
        console.log(`  ✓ ${user.name} (${user.email}) - ${user.position}${user.isAdmin ? ' [ADMIN]' : ''}${user.isManagingPartner ? ' [MANAGING_PARTNER]' : ''}${!user.isActive ? ' [INACTIVE]' : ''}`);
        continue;
      }
      const id = uuidv4();
      const passwordHash = bcrypt.hashSync(user.password, 12);
      const securityAnswerHash = bcrypt.hashSync(user.email.toLowerCase().trim(), 12);
      const securityQuestion = '¿Cuál es su correo electrónico?';

      await tx.run(conn,
        `INSERT INTO users (id, email, password_hash, security_question, security_answer, name, position, practice_area, custom_position_id, is_admin, is_super_user, is_managing_partner, is_active, must_change_password, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, user.email, passwordHash, securityQuestion, securityAnswerHash,
          user.name, user.position, user.practiceArea || null,
          user.isAdmin ? 1 : 0, 0, user.isManagingPartner ? 1 : 0,
          user.isActive ? 1 : 0, 1, now(), now(), // must_change_password = 1 for all regular users
        ]
      );

      console.log(`  ✓ ${user.name} (${user.email}) - ${user.position}${user.isAdmin ? ' [ADMIN]' : ''}${user.isManagingPartner ? ' [MANAGING_PARTNER]' : ''}${!user.isActive ? ' [INACTIVE]' : ''}`);
    }

    // ─── 3. Seed system_status if missing ──────────────────────────────
    const hasStatus = await tx.get(conn, 'SELECT id FROM system_status LIMIT 1');
    if (!hasStatus) {
      const saUser = await tx.get(conn, 'SELECT id FROM users WHERE email = ?', [SUPERADMIN_EMAIL]) as { id: string } | undefined;
      await tx.run(conn, `INSERT INTO system_status (id, status, activation_date, payment_plan, max_users, max_admin_users, tickets) VALUES (1, 'active', ?, 'monthly', 50, 3, 0)`, [now()]);
      if (saUser) {
        await tx.run(conn, `INSERT INTO activation_history (id, action, date, by_user_id) VALUES (?, 'activated', ?, ?)`, [uuidv4(), now(), saUser.id]);
      }
      console.log('  ✓ System status seeded');
    }

    // ─── 4. Seed module_config if missing ──────────────────────────────
    const hasModules = await tx.get(conn, 'SELECT id FROM module_config LIMIT 1');
    if (!hasModules) {
      await tx.run(conn, `INSERT INTO module_config (id, evaluations, communications, vacations, copilot) VALUES (1, 1, 1, 1, 1)`);
      console.log('  ✓ Module config seeded');
    }

    // ─── 5. Seed copilot_config if missing ──────────────────────────────
    const hasCopilotConfig = await tx.get(conn, 'SELECT id FROM copilot_config LIMIT 1');
    if (!hasCopilotConfig) {
      const saUser2 = await tx.get(conn, 'SELECT id FROM users WHERE email = ?', [SUPERADMIN_EMAIL]) as { id: string } | undefined;
      await tx.run(conn,
        `INSERT INTO copilot_config (id, model, api_provider, api_base_url, api_key, can_manage_users, can_manage_evaluations, can_manage_vacations, can_manage_announcements, can_manage_periods, can_manage_system, can_view_reports, max_tokens, temperature)
         VALUES (1, 'qwen3:235b', 'ollama', NULL, NULL, 1, 1, 1, 1, 1, 1, 1, 4096, 0.3)`);
      console.log('  ✓ Copilot config seeded');
    }

    // ─── 6. Seed library questions if empty ──────────────────────────────
    const hasLibraryQuestions = await tx.get(conn, 'SELECT id FROM question_library LIMIT 1');
    if (!hasLibraryQuestions) {
      const saUser3 = await tx.get(conn, 'SELECT id FROM users WHERE email = ?', [SUPERADMIN_EMAIL]) as { id: string } | undefined;
      const libraryQuestions = [
        { qid: 'lib-001', cat: 'Criterio Técnico', text: '¿Cómo califica la calidad técnica en el desempeño de sus funciones?', weight: 10 },
        { qid: 'lib-002', cat: 'Criterio Técnico', text: '¿Cómo califica la capacidad de análisis y resolución de problemas jurídicos?', weight: 9 },
        { qid: 'lib-003', cat: 'Criterio Técnico', text: '¿Cómo califica la actualización y conocimiento de la normativa aplicable?', weight: 8 },
        { qid: 'lib-004', cat: 'Liderazgo', text: '¿Cómo califica la capacidad de liderazgo y dirección de equipos?', weight: 8 },
        { qid: 'lib-005', cat: 'Liderazgo', text: '¿Cómo califica la toma de decisiones estratégicas?', weight: 7 },
        { qid: 'lib-006', cat: 'Liderazgo', text: '¿Cómo califica el desarrollo y mentoría del equipo a cargo?', weight: 7 },
        { qid: 'lib-007', cat: 'Desempeño', text: '¿Cómo califica el cumplimiento de objetivos y metas establecidos?', weight: 10 },
        { qid: 'lib-008', cat: 'Desempeño', text: '¿Cómo califica la puntualidad y asistencia?', weight: 6 },
        { qid: 'lib-009', cat: 'Desempeño', text: '¿Cómo califica la calidad y oportunidad de los entregables?', weight: 8 },
        { qid: 'lib-010', cat: 'Desempeño', text: '¿Cómo califica la gestión eficiente del tiempo y prioridades?', weight: 7 },
        { qid: 'lib-011', cat: 'Habilidades Blandas', text: '¿Cómo califica la comunicación clara y efectiva?', weight: 7 },
        { qid: 'lib-012', cat: 'Habilidades Blandas', text: '¿Cómo califica la capacidad de innovación y adaptación al cambio?', weight: 6 },
        { qid: 'lib-013', cat: 'Habilidades Blandas', text: '¿Cómo califica la resolución de conflictos y negociación?', weight: 6 },
        { qid: 'lib-014', cat: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración y coordinación con el equipo?', weight: 7 },
        { qid: 'lib-015', cat: 'Trabajo en Equipo', text: '¿Cómo califica la disposición para apoyar a compañeros?', weight: 6 },
        { qid: 'lib-016', cat: 'Actitud', text: '¿Cómo califica la ética profesional y compromiso?', weight: 7 },
        { qid: 'lib-017', cat: 'Actitud', text: '¿Cómo califica la actitud de servicio y proactividad?', weight: 6 },
        { qid: 'lib-018', cat: 'Cumplimiento', text: '¿Cómo califica el seguimiento a instrucciones y procedimientos?', weight: 7 },
        { qid: 'lib-019', cat: 'Cumplimiento', text: '¿Cómo califica la confidencialidad y discreción?', weight: 8 },
        { qid: 'lib-020', cat: 'Disponibilidad', text: '¿Cómo califica la disponibilidad ante situaciones críticas?', weight: 6 },
        { qid: 'lib-021', cat: 'Desarrollo', text: '¿Cómo califica la participación en actividades de formación continua?', weight: 5 },
        { qid: 'lib-022', cat: 'Desarrollo', text: '¿Cómo califica la disposición para adquirir nuevas competencias?', weight: 5 },
      ];
      for (const q of libraryQuestions) {
        await tx.run(conn,
          `INSERT INTO question_library (id, question_id, category, default_section, text, default_weight, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), q.qid, q.cat, null, q.text, q.weight, now(), saUser3?.id || null]);
      }
      console.log('  ✓ Library questions seeded');
    }

    // ─── 5. Seed assignments ────────────────────────────────────────────
    for (const assignment of ASSIGNMENTS) {
      const employee = await tx.get(conn, 'SELECT id FROM users WHERE email = ?', [assignment.employeeEmail]) as { id: string } | undefined;
      const supervisor = await tx.get(conn, 'SELECT id FROM users WHERE email = ?', [assignment.supervisorEmail]) as { id: string } | undefined;

      if (!employee || !supervisor) {
        console.warn(`  ⚠ Skipping assignment: ${assignment.employeeEmail} → ${assignment.supervisorEmail} (user not found)`);
        continue;
      }

      const existing = await tx.get(conn, 'SELECT id FROM supervisor_assignments WHERE employee_id = ? AND supervisor_id = ? AND period = ?', [employee.id, supervisor.id, assignment.period]);
      if (existing) continue;

      await tx.run(conn, `INSERT IGNORE INTO supervisor_assignments (id, employee_id, supervisor_id, period) VALUES (?, ?, ?, ?)`, [uuidv4(), employee.id, supervisor.id, assignment.period]);
      console.log(`  ✓ Assignment: ${assignment.employeeEmail} → ${assignment.supervisorEmail} (${assignment.period})`);
    }
  });

  // ─── Summary ──────────────────────────────────────────────────────────
  const userCount = (await db.get('SELECT COUNT(*) as count FROM users') as any).count;
  const assignmentCount = (await db.get('SELECT COUNT(*) as count FROM supervisor_assignments') as any).count;
  console.log(`\n✅ Seeding complete!`);
  console.log(`   Users: ${userCount}`);
  console.log(`   Assignments: ${assignmentCount}`);
  console.log(`   SuperAdmin: ${SUPERADMIN_EMAIL} / ${SUPERADMIN_PASSWORD}`);
}

// ─── Self-execution: run standalone with `npx tsx server/db/seed-users.ts` ──
if (import.meta.url === `file://${process.argv[1]}`) {
  seed().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
