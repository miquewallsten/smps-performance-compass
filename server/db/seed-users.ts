import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = process.env.DATABASE_URL || path.resolve(__dirname, 'smps.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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

async function seed() {
  console.log('Seeding database...');

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, security_question, security_answer, name, position, practice_area, custom_position_id, is_admin, is_super_user, is_managing_partner, is_active, must_change_password, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const insertAssignment = db.prepare(`
    INSERT OR IGNORE INTO supervisor_assignments (id, employee_id, supervisor_id, period)
    VALUES (?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    // ─── 1. Create SuperAdmin ────────────────────────────────────────────
    const existingSuper = db.prepare('SELECT id FROM users WHERE email = ?').get(SUPERADMIN_EMAIL) as { id: string } | undefined;

    if (existingSuper) {
      // Update password hash to ensure it's correct
      const passwordHash = bcrypt.hashSync(SUPERADMIN_PASSWORD, 12);
      db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime(\'now\') WHERE id = ?').run(passwordHash, existingSuper.id);
      console.log(`  ✓ SuperAdmin already exists (${SUPERADMIN_EMAIL}) - password updated`);
    } else {
      const saId = uuidv4();
      const saPasswordHash = bcrypt.hashSync(SUPERADMIN_PASSWORD, 12);
      const saSecurityHash = bcrypt.hashSync(SUPERADMIN_EMAIL.toLowerCase().trim(), 12);
      const saSecurityQuestion = '¿Cuál es su correo electrónico?';
      insertUser.run(saId, SUPERADMIN_EMAIL, saPasswordHash, saSecurityQuestion, saSecurityHash, SUPERADMIN_NAME, 'socio', null, 1, 1, 1, 1, 0);
      console.log(`  ✓ SuperAdmin created (${SUPERADMIN_EMAIL})`);
    }

    // ─── 2. Create regular users ────────────────────────────────────────
    for (const user of USERS) {
      const id = uuidv4();
      const passwordHash = bcrypt.hashSync(user.password, 12);
      const securityAnswerHash = bcrypt.hashSync(user.email.toLowerCase().trim(), 12);
      const securityQuestion = '¿Cuál es su correo electrónico?';

      insertUser.run(
        id, user.email, passwordHash, securityQuestion, securityAnswerHash,
        user.name, user.position, user.practiceArea || null,
        user.isAdmin ? 1 : 0, 0, user.isManagingPartner ? 1 : 0,
        user.isActive ? 1 : 0, 1, // must_change_password = 1 for all regular users
      );

      console.log(`  ✓ ${user.name} (${user.email}) - ${user.position}${user.isAdmin ? ' [ADMIN]' : ''}${user.isManagingPartner ? ' [MANAGING_PARTNER]' : ''}${!user.isActive ? ' [INACTIVE]' : ''}`);
    }

    // ─── 3. Seed system_status if missing ──────────────────────────────
    const hasStatus = db.prepare('SELECT id FROM system_status LIMIT 1').get();
    if (!hasStatus) {
      const saUser = db.prepare('SELECT id FROM users WHERE email = ?').get(SUPERADMIN_EMAIL) as { id: string } | undefined;
      db.prepare(`INSERT INTO system_status (id, status, activation_date, payment_plan, max_users, tickets) VALUES (1, 'active', datetime('now'), 'monthly', 50, 0)`).run();
      if (saUser) {
        db.prepare(`INSERT INTO activation_history (id, action, date, by) VALUES (?, 'activated', datetime('now'), ?)`).run(uuidv4(), saUser.id);
      }
      console.log('  ✓ System status seeded');
    }

    // ─── 4. Seed module_config if missing ──────────────────────────────
    const hasModules = db.prepare('SELECT id FROM module_config LIMIT 1').get();
    if (!hasModules) {
      db.prepare(`INSERT INTO module_config (id, evaluations, communications, vacations, copilot) VALUES (1, 1, 1, 1, 1)`).run();
      console.log('  ✓ Module config seeded');
    }

    // ─── 5. Seed assignments ────────────────────────────────────────────
    for (const assignment of ASSIGNMENTS) {
      const employee = db.prepare('SELECT id FROM users WHERE email = ?').get(assignment.employeeEmail) as { id: string } | undefined;
      const supervisor = db.prepare('SELECT id FROM users WHERE email = ?').get(assignment.supervisorEmail) as { id: string } | undefined;

      if (!employee || !supervisor) {
        console.warn(`  ⚠ Skipping assignment: ${assignment.employeeEmail} → ${assignment.supervisorEmail} (user not found)`);
        continue;
      }

      const existing = db.prepare('SELECT id FROM supervisor_assignments WHERE employee_id = ? AND supervisor_id = ? AND period = ?').get(employee.id, supervisor.id, assignment.period);
      if (existing) continue;

      insertAssignment.run(uuidv4(), employee.id, supervisor.id, assignment.period);
      console.log(`  ✓ Assignment: ${assignment.employeeEmail} → ${assignment.supervisorEmail} (${assignment.period})`);
    }
  });

  transaction();

  // ─── Summary ──────────────────────────────────────────────────────────
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  const assignmentCount = (db.prepare('SELECT COUNT(*) as count FROM supervisor_assignments').get() as any).count;
  console.log(`\n✅ Seeding complete!`);
  console.log(`   Users: ${userCount}`);
  console.log(`   Assignments: ${assignmentCount}`);
  console.log(`   SuperAdmin: ${SUPERADMIN_EMAIL} / ${SUPERADMIN_PASSWORD}`);

  db.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
