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

interface SeedUser {
  name: string;
  email: string;
  position: string;
  practiceArea?: string;
  isAdmin: boolean;
  isManagingPartner: boolean;
  isActive: boolean;
  password: string;
  securityQuestion: string;
  securityAnswer: string;
}

const USERS: SeedUser[] = [
  // === LEGAL ===
  // Socios
  { name: 'Lic. Carlos Mendoza', email: 'cmendoza@smps.com', position: 'socio', isAdmin: true, isManagingPartner: true, isActive: true, password: '1234' },
  { name: 'Lic. Patricia Salinas', email: 'psalinas@smps.com', position: 'socio', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  // Salary Partner
  { name: 'Lic. Andrés Beltrán', email: 'abeltran@smps.com', position: 'salary_partner', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  // Asociado Sr
  { name: 'Lic. Roberto Figueroa', email: 'rfigueroa@smps.com', position: 'asociado_sr', practiceArea: 'corporativo', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  // Asociado Mid
  { name: 'Lic. Ana Lucía Torres', email: 'atorres@smps.com', position: 'asociado_mid', practiceArea: 'corporativo', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  // Asociado Jr
  { name: 'Lic. Emilio Castañeda', email: 'ecastaneda@smps.com', position: 'asociado_jr', practiceArea: 'corporativo', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  // Pasante con Carrera
  { name: 'Lic. Diego Ramírez', email: 'dramirez@smps.com', position: 'pasante_carrera', practiceArea: 'corporativo', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  { name: 'Lic. Mariana Vega', email: 'mvega@smps.com', position: 'pasante_carrera', practiceArea: 'litigio_fiscal', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  // Pasante Corporativo
  { name: 'Laura Hernández', email: 'lhernandez@smps.com', position: 'pasante_corporativo', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  { name: 'Miguel Ángel López', email: 'malopez@smps.com', position: 'pasante_corporativo', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  // === ADMINISTRATIVO ===
  // Director
  { name: 'Ing. Rafael Domínguez', email: 'rdominguez@smps.com', position: 'director', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  // Gerente
  { name: 'Lic. Verónica Campos', email: 'vcampos@smps.com', position: 'gerente', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  // Coordinador
  { name: 'C.P. Sandra Morales', email: 'smorales@smps.com', position: 'coordinador', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  // Analista
  { name: 'Fernando Ruiz', email: 'fruiz@smps.com', position: 'analista', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  // Asistente
  { name: 'Gabriela Ortiz', email: 'gortiz@smps.com', position: 'asistente', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
  { name: 'Alejandra Núñez', email: 'anunez@smps.com', position: 'asistente', isAdmin: false, isManagingPartner: false, isActive: false, password: '1234' },
  // Archivo y Soporte
  { name: 'José Luis Paredes', email: 'jparedes@smps.com', position: 'archivo_soporte', isAdmin: false, isManagingPartner: false, isActive: true, password: '1234' },
];

interface SeedAssignment {
  employeeEmail: string;
  supervisorEmail: string;
  period: string;
}

const ASSIGNMENTS: SeedAssignment[] = [
  // Current period: 2026-H1
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
  // Also seed for 2025-H2 (historical)
  { employeeEmail: 'dramirez@smps.com', supervisorEmail: 'rfigueroa@smps.com', period: '2025-H2' },
  { employeeEmail: 'lhernandez@smps.com', supervisorEmail: 'rfigueroa@smps.com', period: '2025-H2' },
];

async function seed() {
  console.log('Seeding users and assignments...');

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, security_question, security_answer, name, position, practice_area, custom_position_id, is_admin, is_super_user, is_managing_partner, is_active, must_change_password, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const insertAssignment = db.prepare(`
    INSERT OR IGNORE INTO supervisor_assignments (id, employee_id, supervisor_id, period)
    VALUES (?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    // Insert users
    for (const user of USERS) {
      const id = uuidv4();
      const passwordHash = bcrypt.hashSync(user.password, 12);
      const securityAnswerHash = bcrypt.hashSync(user.email.toLowerCase().trim(), 12);
      const securityQuestion = '¿Cuál es su correo electrónico?';
      const mustChange = user.email === 'lab@bowdot.com' ? 0 : 1;

      insertUser.run(
        id,
        user.email,
        passwordHash,
        securityQuestion,
        securityAnswerHash,
        user.name,
        user.position,
        user.practiceArea || null,
        user.isAdmin ? 1 : 0,
        0, // isSuperUser - only lab@bowdot.com is SuperUser, already in DB
        user.isManagingPartner ? 1 : 0,
        user.isActive ? 1 : 0,
        mustChange,
      );

      console.log(`  ✓ ${user.name} (${user.email}) - ${user.position}${user.isAdmin ? ' [ADMIN]' : ''}${user.isManagingPartner ? ' [MANAGING_PARTNER]' : ''}${!user.isActive ? ' [INACTIVE]' : ''}`);
    }

    // Insert assignments
    for (const assignment of ASSIGNMENTS) {
      const employee = db.prepare('SELECT id FROM users WHERE email = ?').get(assignment.employeeEmail) as { id: string } | undefined;
      const supervisor = db.prepare('SELECT id FROM users WHERE email = ?').get(assignment.supervisorEmail) as { id: string } | undefined;

      if (!employee || !supervisor) {
        console.warn(`  ⚠ Skipping assignment: ${assignment.employeeEmail} → ${assignment.supervisorEmail} (user not found)`);
        continue;
      }

      const existing = db.prepare('SELECT id FROM supervisor_assignments WHERE employee_id = ? AND supervisor_id = ? AND period = ?').get(employee.id, supervisor.id, assignment.period);
      if (existing) {
        console.log(`  ⊙ Assignment already exists: ${assignment.employeeEmail} → ${assignment.supervisorEmail} (${assignment.period})`);
        continue;
      }

      insertAssignment.run(uuidv4(), employee.id, supervisor.id, assignment.period);
      console.log(`  ✓ Assignment: ${assignment.employeeEmail} → ${assignment.supervisorEmail} (${assignment.period})`);
    }
  });

  transaction();
  console.log('\nSeeding complete!');

  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  const assignmentCount = (db.prepare('SELECT COUNT(*) as count FROM supervisor_assignments').get() as any).count;
  console.log(`Total users: ${userCount}`);
  console.log(`Total assignments: ${assignmentCount}`);

  db.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
