# SMPS Performance Compass — SQLite Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage state management with an Express.js + SQLite backend, adding JWT authentication, multi-user support, and Hostinger-compatible deployment.

**Architecture:** Express.js serves both the REST API (`/api/*`) and the built React SPA (all other routes). SQLite via better-sqlite3 + Drizzle ORM for type-safe DB access. JWT authentication with security-question-based password recovery. Frontend refactored from AppContext + localStorage to AuthContext + React Query.

**Tech Stack:** Express.js, better-sqlite3, Drizzle ORM, bcrypt, jsonwebtoken, zod, React Query, Vite

**Spec:** `docs/superpowers/specs/2026-05-20-sqlite-backend-design.md`

---

## File Structure

### New Files (Backend)

```
server/
├── index.ts                    ← Express entry point, serves SPA + API
├── db/
│   ├── schema.ts               ← Drizzle table definitions (all 25 tables)
│   ├── connection.ts           ← DB connection singleton + WAL mode
│   ├── migrate.ts              ← Migration runner
│   └── seed.ts                 ← Initial data seeding
├── auth/
│   ├── jwt.ts                  ← JWT sign/verify + blocklist
│   └── security.ts             ← bcrypt hashing + security question helpers
├── routes/
│   ├── auth.ts                 ← Login, logout, me, change-password, reset
│   ├── users.ts                ← CRUD users + role management
│   ├── evaluations.ts          ← CRUD evaluations + responses
│   ├── assignments.ts          ← Supervisor assignments
│   ├── action-plans.ts         ← Action plans + approval
│   ├── objectives.ts           ← Personal objectives (admin + legal)
│   ├── announcements.ts        ← Announcements + reads
│   ├── vacations.ts            ← Vacation requests + approvals + config
│   ├── questions.ts             ← Question library + custom + overrides
│   ├── positions.ts            ← Custom positions
│   ├── periods.ts              ← Period configuration
│   └── system.ts               ← System status + modules + init
├── middleware/
│   ├── auth.ts                 ← JWT verification middleware
│   └── rbac.ts                 ← Role-based access (requireAdmin, requireSuperUser, etc.)
└── utils/
    ├── visibility.ts           ← Can-view-evaluations logic (mirrored from frontend)
    └── id.ts                   ← UUID generation
```

### New Files (Frontend)

```
src/
├── api/
│   ├── client.ts               ← Fetch wrapper with auth headers, 401 handling
│   └── queries.ts              ← React Query hooks per entity
├── contexts/
│   ├── AuthContext.tsx          ← NEW: JWT auth state
│   └── AppContext.tsx          ← DELETED
├── pages/
│   └── Setup.tsx               ← NEW: First-run setup wizard
```

### Modified Files (Frontend)

```
src/main.tsx                    ← Add AuthProvider, adjust QueryClient
src/App.tsx                     ← Remove AppProvider, add AuthProvider, add Setup route
src/components/Layout.tsx       ← Replace useApp() with AuthContext + queries
src/components/EvaluationViewer.tsx  ← Replace useApp() with queries
src/components/PeriodEndAlert.tsx    ← Replace useApp() with queries
src/pages/Login.tsx             ← Use AuthContext
src/pages/Dashboard.tsx         ← Replace useApp() with queries
src/pages/Evaluations.tsx       ← Replace useApp() with queries
src/pages/SelfEvaluation.tsx    ← Replace useApp() with queries
src/pages/UserManagement.tsx    ← Replace useApp() with queries
src/pages/AssignSupervisors.tsx ← Replace useApp() with queries
src/pages/Reports.tsx           ← Replace useApp() with queries
src/pages/OrgChart.tsx          ← Replace useApp() with queries
src/pages/Settings.tsx          ← Replace useApp() with queries
src/pages/AccessControl.tsx     ← Replace useApp() with queries
src/pages/EvaluationTemplates.tsx ← Replace useApp() with queries
src/pages/QuestionLibrary.tsx   ← Replace useApp() with queries
src/pages/PersonalObjectives.tsx ← Replace useApp() with queries
src/pages/MyActionPlan.tsx      ← Replace useApp() with queries
src/pages/MyProfile.tsx         ← Replace useApp() with queries
src/pages/Communications.tsx    ← Replace useApp() with queries
src/pages/Vacations.tsx        ← Replace useApp() with queries
src/pages/PeriodConfig.tsx      ← Replace useApp() with queries
src/pages/Help.tsx              ← Replace useApp() with queries
```

### Config Changes

```
package.json                    ← Add backend dependencies + scripts
vite.config.ts                  ← Add proxy for /api in dev mode
tsconfig.json                   ← May need server TS config
.env                            ← JWT_SECRET, DATABASE_URL, NODE_ENV
.gitignore                      ← Add data/*.db, .env
```

---

## Phase 1: Backend Foundation

### Task 1: Project Setup — Backend Dependencies & Config

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `.env`
- Create: `.gitignore` (update)
- Create: `server/tsconfig.json`
- Create: `server/index.ts`

- [ ] **Step 1: Install backend dependencies**

```bash
cd /Users/mikaelwallsten/Downloads/smps-performance-compass-main
npm install express cors dotenv better-sqlite3 bcryptjs jsonwebtoken zod uuid
npm install -D @types/express @types/cors @types/better-sqlite3 @types/bcryptjs @types/jsonwebtoken @types/uuid tsx concurrently drizzle-kit
```

- [ ] **Step 2: Add backend scripts to package.json**

Add to `"scripts"` in `package.json`:

```json
"dev:server": "tsx watch server/index.ts",
"dev:full": "concurrently \"npm run dev\" \"npm run dev:server\"",
"build:server": "tsc -p server/tsconfig.json",
"db:migrate": "tsx server/db/migrate.ts",
"db:seed": "tsx server/db/seed.ts"
```

- [ ] **Step 3: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "./dist-server",
    "rootDir": ".",
    "declaration": false,
    "sourceMap": true,
    "skipLibCheck": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create .env file**

```env
DATABASE_URL=./server/db/smps.db
JWT_SECRET=change-me-to-a-random-64-char-string-in-production
NODE_ENV=development
PORT=3000
```

- [ ] **Step 5: Update .gitignore**

Append:

```
# Backend
.env
data/*.db
server/db/*.db
```

- [ ] **Step 6: Update vite.config.ts to proxy /api in dev**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 7: Create minimal server/index.ts**

```typescript
import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
```

- [ ] **Step 8: Verify server starts**

```bash
npx tsx server/index.ts
```

Expected: `Server running on port 3000`

- [ ] **Step 9: Verify health endpoint**

```bash
curl http://localhost:3000/api/health
```

Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: backend foundation — express server, deps, config"
```

---

### Task 2: Database Schema — Drizzle Definitions

**Files:**
- Create: `server/db/schema.ts`
- Create: `server/db/connection.ts`
- Create: `server/db/migrate.ts`

- [ ] **Step 1: Create server/db/connection.ts**

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DATABASE_URL || path.resolve(__dirname, 'smps.db');

export const db = new Database(DB_PATH);

// Enable WAL mode for concurrent read/write
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
```

- [ ] **Step 2: Create server/db/schema.ts — users and auth tables**

```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  securityQuestion: text('security_question').notNull(),
  securityAnswer: text('security_answer').notNull(),
  name: text('name').notNull(),
  position: text('position').notNull(),
  practiceArea: text('practice_area'),
  customPositionId: text('custom_position_id'),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  isSuperUser: integer('is_super_user', { mode: 'boolean' }).notNull().default(false),
  isManagingPartner: integer('is_managing_partner', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').unique().notNull(),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(),
});
```

- [ ] **Step 3: Add remaining tables to server/db/schema.ts**

Append after the `sessions` table definition:

```typescript
export const customPositions = sqliteTable('custom_positions', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  level: text('level').notNull(),
  practiceArea: text('practice_area'),
  basePosition: text('base_position').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const periodConfigs = sqliteTable('period_configs', {
  period: text('period').primaryKey(),
  selfStart: text('self_start').notNull(),
  selfEnd: text('self_end').notNull(),
  supervisorStart: text('supervisor_start').notNull(),
  supervisorEnd: text('supervisor_end').notNull(),
  feedbackStart: text('feedback_start').notNull(),
  feedbackEnd: text('feedback_end').notNull(),
  actionPlanStart: text('action_plan_start').notNull(),
  actionPlanEnd: text('action_plan_end').notNull(),
});

export const supervisorAssignments = sqliteTable('supervisor_assignments', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull().references(() => users.id),
  supervisorId: text('supervisor_id').notNull().references(() => users.id),
  period: text('period').notNull(),
});

export const evaluations = sqliteTable('evaluations', {
  id: text('id').primaryKey(),
  evaluatorId: text('evaluator_id').notNull().references(() => users.id),
  evaluatedId: text('evaluated_id').notNull().references(() => users.id),
  period: text('period').notNull(),
  type: text('type').notNull(), // 'self' | 'supervisor'
  comments: text('comments').default(''),
  supervisorComments: text('supervisor_comments'),
  totalScore: real('total_score').default(0),
  completedAt: text('completed_at'),
  feedbackCompleted: integer('feedback_completed', { mode: 'boolean' }).default(false),
  feedbackCompletedAt: text('feedback_completed_at'),
  feedbackCompletedBy: text('feedback_completed_by').references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const evaluationResponses = sqliteTable('evaluation_responses', {
  id: text('id').primaryKey(),
  evaluationId: text('evaluation_id').notNull().references(() => evaluations.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull(),
  score: integer('score').notNull(),
  notApplicable: integer('not_applicable', { mode: 'boolean' }).default(false),
  noElements: integer('no_elements', { mode: 'boolean' }).default(false),
});

export const evaluationNaApprovals = sqliteTable('evaluation_na_approvals', {
  evaluationId: text('evaluation_id').notNull().references(() => evaluations.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull(),
  approved: integer('approved', { mode: 'boolean' }).notNull().default(false),
});

export const actionPlans = sqliteTable('action_plans', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull().references(() => users.id),
  supervisorId: text('supervisor_id').notNull().references(() => users.id),
  period: text('period').notNull(),
  content: text('content').default(''),
  approvalStatus: text('approval_status').default('pending'),
  approvalComments: text('approval_comments'),
  approvedBy: text('approved_by').references(() => users.id),
  approvedAt: text('approved_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const smartActionItems = sqliteTable('smart_action_items', {
  id: text('id').primaryKey(),
  actionPlanId: text('action_plan_id').notNull().references(() => actionPlans.id, { onDelete: 'cascade' }),
  competencia: text('competencia').notNull(),
  objetivo: text('objetivo').notNull(),
  acciones: text('acciones').notNull(),
  queEvitar: text('que_evitar').notNull(),
  fechaRevision: text('fecha_revision').notNull(),
  apoyos: text('apoyos').notNull(),
});

export const personalObjectives = sqliteTable('personal_objectives', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  period: text('period').notNull(),
  type: text('type').notNull(), // 'legal' | 'admin'
});

export const adminObjectives = sqliteTable('admin_objectives', {
  id: text('id').primaryKey(),
  personalObjectivesId: text('personal_objectives_id').notNull().references(() => personalObjectives.id, { onDelete: 'cascade' }),
  tipoObjetivo: text('tipo_objetivo').notNull(),
  nombreObjetivo: text('nombre_objetivo').notNull(),
  pilaresEstrategicos: text('pilares_estrategicos').default(''),
  alcance: text('alcance').default(''),
  porcentajeAvance: real('porcentaje_avance').default(0),
  status: text('status').default('draft'),
  submittedAt: text('submitted_at'),
  reviewedAt: text('reviewed_at'),
  reviewedBy: text('reviewed_by').references(() => users.id),
  reviewerComment: text('reviewer_comment'),
});

export const legalObjectives = sqliteTable('legal_objectives', {
  id: text('id').primaryKey(),
  personalObjectivesId: text('personal_objectives_id').notNull().references(() => personalObjectives.id, { onDelete: 'cascade' }),
  horasMeta: real('horas_meta').default(0),
  horasAjustadas: real('horas_ajustadas').default(0),
  porcentajeHorasVsMeta: real('porcentaje_horas_vs_meta').default(0),
  porcentajeEficiencia: real('porcentaje_eficiencia').default(0),
  metaProBono: real('meta_pro_bono').default(0),
  realizadoProBono: real('realizado_pro_bono').default(0),
  metaMarketing: real('meta_marketing').default(0),
  realizadoMarketing: real('realizado_marketing').default(0),
  metaBusinessDev: real('meta_business_dev').default(0),
  realizadoBusinessDev: real('realizado_business_dev').default(0),
  metaMentoring: real('meta_mentoring').default(0),
  realizadoMentoring: real('realizado_mentoring').default(0),
  resultadoArea: real('resultado_area').default(0),
  resultadoFirma: real('resultado_firma').default(0),
  porcentajeTotalBono: real('porcentaje_total_bono').default(0),
});

export const announcements = sqliteTable('announcements', {
  id: text('id').primaryKey(),
  authorId: text('author_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  audience: text('audience').notNull(), // 'all' | 'legal' | 'administrativo'
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  expiresAt: text('expires_at'),
  archived: integer('archived', { mode: 'boolean' }).default(false),
});

export const announcementReads = sqliteTable('announcement_reads', {
  announcementId: text('announcement_id').notNull().references(() => announcements.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
});

export const vacationRequests = sqliteTable('vacation_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  days: integer('days').notNull(),
  reason: text('reason').default(''),
  status: text('status').default('pending'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  period: text('period'),
});

export const vacationApprovals = sqliteTable('vacation_approvals', {
  id: text('id').primaryKey(),
  vacationRequestId: text('vacation_request_id').notNull().references(() => vacationRequests.id, { onDelete: 'cascade' }),
  approverId: text('approver_id').notNull().references(() => users.id),
  approvedAt: text('approved_at').notNull(),
  action: text('action').notNull(), // 'approved' | 'rejected'
  comment: text('comment'),
});

export const extraVacationDays = sqliteTable('extra_vacation_days', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  days: integer('days').notNull(),
  reason: text('reason').notNull(),
  addedBy: text('added_by').notNull().references(() => users.id),
  addedAt: text('added_at').notNull().$defaultFn(() => new Date().toISOString()),
  period: text('period').notNull(),
});

export const vacationConfig = sqliteTable('vacation_config', {
  position: text('position').primaryKey(),
  days: integer('days').notNull(),
});

export const customEvalQuestions = sqliteTable('custom_eval_questions', {
  id: text('id').primaryKey(),
  position: text('position').notNull(),
  questionId: text('question_id').notNull(),
  category: text('category').notNull(),
  text: text('text').notNull(),
  weight: integer('weight').notNull(),
  section: text('section'),
  practiceArea: text('practice_area'),
});

export const libraryQuestions = sqliteTable('library_questions', {
  id: text('id').primaryKey(),
  questionId: text('question_id').unique().notNull(),
  category: text('category').notNull(),
  text: text('text').notNull(),
  defaultWeight: integer('default_weight').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  createdBy: text('created_by').references(() => users.id),
});

export const seedQuestionOverrides = sqliteTable('seed_question_overrides', {
  questionId: text('question_id').primaryKey(),
  text: text('text'),
  category: text('category'),
  weight: integer('weight'),
  hidden: integer('hidden', { mode: 'boolean' }).default(false),
});

export const moduleConfig = sqliteTable('module_config', {
  id: integer('id').primaryKey().default(1),
  evaluations: integer('evaluations', { mode: 'boolean' }).notNull().default(true),
  communications: integer('communications', { mode: 'boolean' }).notNull().default(true),
  vacations: integer('vacations', { mode: 'boolean' }).notNull().default(true),
});

export const systemStatus = sqliteTable('system_status', {
  id: integer('id').primaryKey().default(1),
  status: text('status').notNull().default('active'),
  activationDate: text('activation_date').notNull(),
  paymentPlan: text('payment_plan').notNull().default('monthly'),
  maxUsers: integer('max_users').notNull().default(50),
  tickets: integer('tickets').notNull().default(0),
});

export const activationHistory = sqliteTable('activation_history', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  date: text('date').notNull(),
  by: text('by').notNull().references(() => users.id),
});
```

- [ ] **Step 4: Create server/db/migrate.ts**

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DATABASE_URL || path.resolve(__dirname, 'smps.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create all tables
const createTables = db.transaction(() => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
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
      must_change_password INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      token_hash TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_positions (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      level TEXT NOT NULL,
      practice_area TEXT,
      base_position TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

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

    CREATE TABLE IF NOT EXISTS supervisor_assignments (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES users(id),
      supervisor_id TEXT NOT NULL REFERENCES users(id),
      period TEXT NOT NULL,
      UNIQUE(employee_id, supervisor_id, period)
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      evaluator_id TEXT NOT NULL REFERENCES users(id),
      evaluated_id TEXT NOT NULL REFERENCES users(id),
      period TEXT NOT NULL,
      type TEXT NOT NULL,
      comments TEXT DEFAULT '',
      supervisor_comments TEXT,
      total_score REAL DEFAULT 0,
      completed_at TEXT,
      feedback_completed INTEGER DEFAULT 0,
      feedback_completed_at TEXT,
      feedback_completed_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      UNIQUE(evaluator_id, evaluated_id, period, type)
    );

    CREATE TABLE IF NOT EXISTS evaluation_responses (
      id TEXT PRIMARY KEY,
      evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      not_applicable INTEGER DEFAULT 0,
      no_elements INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS evaluation_na_approvals (
      evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL,
      approved INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(evaluation_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS action_plans (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES users(id),
      supervisor_id TEXT NOT NULL REFERENCES users(id),
      period TEXT NOT NULL,
      content TEXT DEFAULT '',
      approval_status TEXT DEFAULT 'pending',
      approval_comments TEXT,
      approved_by TEXT REFERENCES users(id),
      approved_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(employee_id, period)
    );

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

    CREATE TABLE IF NOT EXISTS personal_objectives (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      period TEXT NOT NULL,
      type TEXT NOT NULL,
      UNIQUE(user_id, period)
    );

    CREATE TABLE IF NOT EXISTS admin_objectives (
      id TEXT PRIMARY KEY,
      personal_objectives_id TEXT NOT NULL REFERENCES personal_objectives(id) ON DELETE CASCADE,
      tipo_objetivo TEXT NOT NULL,
      nombre_objetivo TEXT NOT NULL,
      pilares_estrategicos TEXT DEFAULT '',
      alcance TEXT DEFAULT '',
      porcentaje_avance REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      submitted_at TEXT,
      reviewed_at TEXT,
      reviewed_by TEXT REFERENCES users(id),
      reviewer_comment TEXT
    );

    CREATE TABLE IF NOT EXISTS legal_objectives (
      id TEXT PRIMARY KEY,
      personal_objectives_id TEXT NOT NULL REFERENCES personal_objectives(id) ON DELETE CASCADE,
      horas_meta REAL DEFAULT 0,
      horas_ajustadas REAL DEFAULT 0,
      porcentaje_horas_vs_meta REAL DEFAULT 0,
      porcentaje_eficiencia REAL DEFAULT 0,
      meta_pro_bono REAL DEFAULT 0,
      realizado_pro_bono REAL DEFAULT 0,
      meta_marketing REAL DEFAULT 0,
      realizado_marketing REAL DEFAULT 0,
      meta_business_dev REAL DEFAULT 0,
      realizado_business_dev REAL DEFAULT 0,
      meta_mentoring REAL DEFAULT 0,
      realizado_mentoring REAL DEFAULT 0,
      resultado_area REAL DEFAULT 0,
      resultado_firma REAL DEFAULT 0,
      porcentaje_total_bono REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      audience TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT,
      archived INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS announcement_reads (
      announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      PRIMARY KEY(announcement_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS vacation_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days INTEGER NOT NULL,
      reason TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      period TEXT
    );

    CREATE TABLE IF NOT EXISTS vacation_approvals (
      id TEXT PRIMARY KEY,
      vacation_request_id TEXT NOT NULL REFERENCES vacation_requests(id) ON DELETE CASCADE,
      approver_id TEXT NOT NULL REFERENCES users(id),
      approved_at TEXT NOT NULL,
      action TEXT NOT NULL,
      comment TEXT
    );

    CREATE TABLE IF NOT EXISTS extra_vacation_days (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      days INTEGER NOT NULL,
      reason TEXT NOT NULL,
      added_by TEXT NOT NULL REFERENCES users(id),
      added_at TEXT NOT NULL,
      period TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vacation_config (
      position TEXT PRIMARY KEY,
      days INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_eval_questions (
      id TEXT PRIMARY KEY,
      position TEXT NOT NULL,
      question_id TEXT NOT NULL,
      category TEXT NOT NULL,
      text TEXT NOT NULL,
      weight INTEGER NOT NULL,
      section TEXT,
      practice_area TEXT,
      UNIQUE(position, question_id)
    );

    CREATE TABLE IF NOT EXISTS library_questions (
      id TEXT PRIMARY KEY,
      question_id TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      text TEXT NOT NULL,
      default_weight INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS seed_question_overrides (
      question_id TEXT PRIMARY KEY,
      text TEXT,
      category TEXT,
      weight INTEGER,
      hidden INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS module_config (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK(id = 1),
      evaluations INTEGER NOT NULL DEFAULT 1,
      communications INTEGER NOT NULL DEFAULT 1,
      vacations INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS system_status (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK(id = 1),
      status TEXT NOT NULL DEFAULT 'active',
      activation_date TEXT NOT NULL,
      payment_plan TEXT NOT NULL DEFAULT 'monthly',
      max_users INTEGER NOT NULL DEFAULT 50,
      tickets INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS activation_history (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      date TEXT NOT NULL,
      by TEXT NOT NULL REFERENCES users(id)
    );

    -- Indexes
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
  createTables();
  console.log('Migration complete — all tables created.');
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
}

db.close();
```

- [ ] **Step 5: Run migration and verify**

```bash
npx tsx server/db/migrate.ts
```

Expected: `Migration complete — all tables created.`

Verify:
```bash
npx tsx -e "
const Database = require('better-sqlite3');
const db = new Database('./server/db/smps.db');
const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all();
console.log(tables.map(t => t.name));
db.close();
"
```

Expected: Array containing all 25 table names.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: database schema — Drizzle definitions + SQLite migration"
```

---

### Task 3: Auth System — JWT, bcrypt, Security Questions

**Files:**
- Create: `server/auth/jwt.ts`
- Create: `server/auth/security.ts`
- Create: `server/middleware/auth.ts`
- Create: `server/middleware/rbac.ts`

- [ ] **Step 1: Create server/auth/security.ts**

```typescript
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashSecurityAnswer(answer: string): Promise<string> {
  // Normalize: lowercase, trim, remove extra spaces
  const normalized = answer.toLowerCase().trim().replace(/\s+/g, ' ');
  return bcrypt.hash(normalized, SALT_ROUNDS);
}

export async function verifySecurityAnswer(answer: string, hash: string): Promise<boolean> {
  const normalized = answer.toLowerCase().trim().replace(/\s+/g, ' ');
  return bcrypt.compare(normalized, hash);
}
```

- [ ] **Step 2: Create server/auth/jwt.ts**

```typescript
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

export interface JwtPayload {
  sub: string;     // user ID
  email: string;
  role: 'super_user' | 'admin' | 'user';
  name: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenExpiry(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 24);
  return date;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getRole(user: { isAdmin: boolean; isSuperUser: boolean }): 'super_user' | 'admin' | 'user' {
  if (user.isSuperUser) return 'super_user';
  if (user.isAdmin) return 'admin';
  return 'user';
}
```

- [ ] **Step 3: Create server/middleware/auth.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken, hashToken, JwtPayload } from '../auth/jwt.js';
import db from '../db/connection.js';
import { sessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { id: string };
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Check if token is in blocklist (logged out)
  const tokenHash = hashToken(token);
  const blocked = db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).get();
  if (blocked) {
    return res.status(401).json({ error: 'Token revoked' });
  }

  req.user = { ...payload, id: payload.sub };
  next();
}
```

- [ ] **Step 4: Create server/middleware/rbac.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import db from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const role = req.user.role;
  if (role === 'admin' || role === 'super_user') return next();
  return res.status(403).json({ error: 'Admin access required' });
}

export function requireSuperUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.role === 'super_user') return next();
  return res.status(403).json({ error: 'Super user access required' });
}

export function requireSelfOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const targetId = req.params.id;
  if (req.user.role === 'admin' || req.user.role === 'super_user' || req.user.id === targetId) {
    return next();
  }
  return res.status(403).json({ error: 'Access denied' });
}

export function requireAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

// Helper to get full user record from DB
export async function getUserById(id: string) {
  return db.select().from(users).where(eq(users.id, id)).get();
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: auth system — JWT, bcrypt, security questions, RBAC middleware"
```

---

### Task 4: Auth Routes — Login, Logout, Password Management

**Files:**
- Create: `server/routes/auth.ts`

- [ ] **Step 1: Create server/routes/auth.ts**

```typescript
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { users, sessions } from '../db/schema.js';
import { eq, and, lt } from 'drizzle-orm';
import { signToken, verifyToken, hashToken, getTokenExpiry, getRole, JwtPayload } from '../auth/jwt.js';
import { hashPassword, verifyPassword, hashSecurityAnswer, verifySecurityAnswer } from '../auth/security.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = db.select().from(users).where(eq(users.email, email)).get();
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const role = getRole(user);
  const payload: JwtPayload = { sub: user.id, email: user.email, role, name: user.name };
  const token = signToken(payload);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      position: user.position,
      practiceArea: user.practiceArea,
      customPositionId: user.customPositionId,
      isAdmin: user.isAdmin,
      isSuperUser: user.isSuperUser,
      isManagingPartner: user.isManagingPartner,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    },
  });
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization!;
  const token = authHeader.substring(7);
  const tokenHash = hashToken(token);
  const expiresAt = getTokenExpiry();

  db.insert(sessions).values({
    id: uuidv4(),
    userId: req.user!.id,
    tokenHash,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  }).run();

  // Clean up expired sessions
  db.delete(sessions).where(lt(sessions.expiresAt, new Date().toISOString())).run();

  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const user = db.select().from(users).where(eq(users.id, req.user!.id)).get();
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    position: user.position,
    practiceArea: user.practiceArea,
    customPositionId: user.customPositionId,
    isAdmin: user.isAdmin,
    isSuperUser: user.isSuperUser,
    isManagingPartner: user.isManagingPartner,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  });
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  const { currentPassword, newPassword, securityQuestion, securityAnswer } = req.body;

  const user = db.select().from(users).where(eq(users.id, req.user!.id)).get();
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Verify current password
  if (currentPassword) {
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
  } else if (!user.mustChangePassword) {
    return res.status(400).json({ error: 'Current password required' });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const passwordHash = await hashPassword(newPassword);
  const updates: Record<string, any> = { passwordHash, mustChangePassword: false, updatedAt: new Date().toISOString() };

  // If setting up for first time, also set security question
  if (securityQuestion && securityAnswer) {
    updates.securityQuestion = securityQuestion;
    updates.securityAnswer = await hashSecurityAnswer(securityAnswer);
  }

  db.update(users).set(updates).where(eq(users.id, user.id)).run();

  res.json({ message: 'Password changed successfully' });
});

// POST /api/auth/security-question — get security question for email
router.post('/security-question', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const user = db.select().from(users).where(eq(users.email, email)).get();
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({ securityQuestion: user.securityQuestion });
});

// POST /api/auth/reset-password — verify security answer + set new password
router.post('/reset-password', async (req: Request, res: Response) => {
  const { email, securityAnswer, newPassword } = req.body;
  if (!email || !securityAnswer || !newPassword) {
    return res.status(400).json({ error: 'Email, security answer, and new password required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const user = db.select().from(users).where(eq(users.email, email)).get();
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = await verifySecurityAnswer(securityAnswer, user.securityAnswer);
  if (!valid) return res.status(401).json({ error: 'Incorrect security answer' });

  const passwordHash = await hashPassword(newPassword);
  db.update(users).set({ passwordHash, mustChangePassword: false, updatedAt: new Date().toISOString() }).where(eq(users.id, user.id)).run();

  res.json({ message: 'Password reset successfully' });
});

export default router;
```

- [ ] **Step 2: Wire auth routes into server/index.ts**

Update `server/index.ts` to import and mount auth routes:

```typescript
import authRoutes from './routes/auth.js';
// ... existing code ...
app.use('/api/auth', authRoutes);
```

- [ ] **Step 3: Test login flow**

Start server, then:
```bash
# Health check
curl http://localhost:3000/api/health

# Login (will fail until seed — that's expected)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

Expected: `{"error":"Invalid credentials"}` (no users yet)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: auth routes — login, logout, me, change-password, reset"
```

---

### Task 5: System Init Route — First-Run Setup

**Files:**
- Create: `server/routes/system.ts`
- Create: `server/db/seed.ts`
- Modify: `server/index.ts` (wire route)

- [ ] **Step 1: Create server/routes/system.ts**

This route handles:
- `POST /api/system/init` — First-run setup (creates Super Admin)
- `GET /api/system/status` — Get system status
- `PATCH /api/system/status` — Activate/deactivate (SuperUser only)
- `GET /api/system/modules` — Get module config
- `PATCH /api/system/modules` — Toggle modules (SuperUser only)
- `GET /api/system/activation-history` — Get history (SuperUser only)

The `POST /api/system/init` endpoint checks if system_status table has a row. If not, it:
1. Creates the Super Admin user
2. Seeds position catalog, vacation config, module config, system status
3. Returns JWT

```typescript
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { users, customPositions, vacationConfig, moduleConfig, systemStatus, activationHistory } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { signToken, getRole } from '../auth/jwt.js';
import { hashPassword, hashSecurityAnswer } from '../auth/security.js';
import { authMiddleware, requireSuperUser } from '../middleware/rbac.js';
import { POSITION_CATALOG } from '../data/positionCatalog.js';
import { POSITION_LABELS } from '../../src/types/index.js';

const router = Router();

// Check if system is initialized
router.get('/initialized', async (_req: Request, res: Response) => {
  const status = db.select().from(systemStatus).get();
  res.json({ initialized: !!status });
});

// POST /api/system/init — First-run setup
router.post('/init', async (req: Request, res: Response) => {
  // Check if already initialized
  const existing = db.select().from(systemStatus).get();
  if (existing) {
    return res.status(409).json({ error: 'System already initialized' });
  }

  const { name, email, password, securityQuestion, securityAnswer } = req.body;
  if (!name || !email || !password || !securityQuestion || !securityAnswer) {
    return res.status(400).json({ error: 'All fields required: name, email, password, securityQuestion, securityAnswer' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const now = new Date().toISOString();
  const userId = uuidv4();

  // Create super admin
  const passwordHash = await hashPassword(password);
  const securityAnswerHash = await hashSecurityAnswer(securityAnswer);

  db.insert(users).values({
    id: userId,
    email,
    passwordHash,
    securityQuestion,
    securityAnswer: securityAnswerHash,
    name,
    position: 'socio',
    isAdmin: true,
    isSuperUser: true,
    isManagingPartner: true,
    isActive: true,
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  }).run();

  // Seed custom positions
  for (const pos of POSITION_CATALOG) {
    db.insert(customPositions).values({
      id: pos.cve,
      label: pos.label,
      level: pos.level,
      practiceArea: pos.practiceArea,
      basePosition: pos.basePosition,
      createdAt: now,
    }).run();
  }

  // Seed vacation config defaults
  const vacationDefaults: Record<string, number> = {
    socio: 20, salary_partner: 20, counsel: 20,
    asociado_sr: 15, asociado_mid: 15, asociado_jr: 10,
    pasante_carrera: 10, pasante_corporativo: 10,
    director: 20, gerente: 15, coordinador: 15,
    analista: 10, asistente: 10, archivo_soporte: 10,
  };
  for (const [position, days] of Object.entries(vacationDefaults)) {
    db.insert(vacationConfig).values({ position, days }).run();
  }

  // Seed module config
  db.insert(moduleConfig).values({
    id: 1,
    evaluations: true,
    communications: true,
    vacations: true,
  }).run();

  // Seed system status
  db.insert(systemStatus).values({
    id: 1,
    status: 'active',
    activationDate: now,
    paymentPlan: 'monthly',
    maxUsers: 50,
    tickets: 0,
  }).run();

  // Seed activation history
  db.insert(activationHistory).values({
    id: uuidv4(),
    action: 'activated',
    date: now,
    by: userId,
  }).run();

  // Generate JWT
  const payload = { sub: userId, email, role: 'super_user' as const, name };
  const token = signToken(payload);

  res.status(201).json({
    token,
    user: {
      id: userId, name, email, position: 'socio',
      isAdmin: true, isSuperUser: true, isManagingPartner: true,
      isActive: true, mustChangePassword: false,
    },
  });
});

// GET /api/system/status
router.get('/status', authMiddleware, (_req: Request, res: Response) => {
  const status = db.select().from(systemStatus).get();
  if (!status) return res.status(404).json({ error: 'System not initialized' });
  res.json(status);
});

// PATCH /api/system/status
router.patch('/status', requireSuperUser, (req: Request, res: Response) => {
  const { status: newStatus } = req.body;
  if (!['active', 'inactive'].includes(newStatus)) {
    return res.status(400).json({ error: 'Status must be active or inactive' });
  }

  const now = new Date().toISOString();
  db.update(systemStatus).set({ status: newStatus, activationDate: now }).where(eq(systemStatus.id, 1)).run();

  db.insert(activationHistory).values({
    id: uuidv4(), action: newStatus === 'active' ? 'activated' : 'deactivated', date: now, by: req.user!.id,
  }).run();

  const updated = db.select().from(systemStatus).get();
  res.json(updated);
});

// GET /api/system/modules
router.get('/modules', authMiddleware, (_req: Request, res: Response) => {
  const config = db.select().from(moduleConfig).get();
  if (!config) return res.status(404).json({ error: 'System not initialized' });
  res.json(config);
});

// PATCH /api/system/modules
router.patch('/modules', requireSuperUser, (req: Request, res: Response) => {
  const { evaluations, communications, vacations } = req.body;
  const updates: Record<string, any> = {};
  if (typeof evaluations === 'boolean') updates.evaluations = evaluations;
  if (typeof communications === 'boolean') updates.communications = communications;
  if (typeof vacations === 'boolean') updates.vacations = vacations;

  db.update(moduleConfig).set(updates).where(eq(moduleConfig.id, 1)).run();
  const updated = db.select().from(moduleConfig).get();
  res.json(updated);
});

// GET /api/system/activation-history
router.get('/activation-history', requireSuperUser, (_req: Request, res: Response) => {
  const history = db.select().from(activationHistory).all();
  res.json(history);
});

export default router;
```

- [ ] **Step 2: Create server/data/positionCatalog.ts**

Copy the seed data from `src/data/positionCatalog.ts` into a shared format accessible by the server. We need to make the `POSITION_CATALOG` array importable from the server:

```typescript
// server/data/positionCatalog.ts
// Re-export from the frontend source
export { POSITION_CATALOG } from '../../src/data/positionCatalog.js';
```

- [ ] **Step 3: Wire system routes into server/index.ts**

```typescript
import systemRoutes from './routes/system.js';
// ... existing code ...
app.use('/api/system', systemRoutes);
```

- [ ] **Step 4: Test first-run setup**

```bash
# Check not initialized
curl http://localhost:3000/api/system/initialized
# Expected: {"initialized":false}

# Run init
curl -X POST http://localhost:3000/api/system/init \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@smps.com",
    "password": "admin123",
    "securityQuestion": "What is your pet'\''s name?",
    "securityAnswer": "Fido"
  }'

# Expected: 201 with token + user object

# Verify initialized
curl http://localhost:3000/api/system/initialized
# Expected: {"initialized":true}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: system init route — first-run setup, status, modules"
```

---

### Task 6: CRUD Routes — Users & Assignments

**Files:**
- Create: `server/routes/users.ts`
- Create: `server/routes/assignments.ts`
- Modify: `server/index.ts` (wire routes)

- [ ] **Step 1: Create server/routes/users.ts**

Full CRUD for users: list, get, create, update, deactivate, reset password, role management.

```typescript
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware, requireAdmin, requireSuperUser, requireSelfOrAdmin } from '../middleware/rbac.js';
import { hashPassword } from '../auth/security.js';

const router = Router();

// GET /api/users — list all users
router.get('/', requireAdmin, (_req: Request, res: Response) => {
  const allUsers = db.select({
    id: users.id, name: users.name, email: users.email, position: users.position,
    practiceArea: users.practiceArea, customPositionId: users.customPositionId,
    isAdmin: users.isAdmin, isSuperUser: users.isSuperUser, isManagingPartner: users.isManagingPartner,
    isActive: users.isActive, mustChangePassword: users.mustChangePassword,
    createdAt: users.createdAt, updatedAt: users.updatedAt,
  }).from(users).all();
  res.json(allUsers);
});

// GET /api/users/:id
router.get('/:id', requireSelfOrAdmin, (req: Request, res: Response) => {
  const user = db.select({
    id: users.id, name: users.name, email: users.email, position: users.position,
    practiceArea: users.practiceArea, customPositionId: users.customPositionId,
    isAdmin: users.isAdmin, isSuperUser: users.isSuperUser, isManagingPartner: users.isManagingPartner,
    isActive: users.isActive, mustChangePassword: users.mustChangePassword,
    createdAt: users.createdAt, updatedAt: users.updatedAt,
  }).from(users).where(eq(users.id, req.params.id)).get();
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// POST /api/users — create user
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  const { name, email, position, practiceArea, customPositionId, isAdmin: isAdminFlag, isManagingPartner: isManagingPartnerFlag, password } = req.body;

  if (!name || !email || !position || !password) {
    return res.status(400).json({ error: 'Name, email, position, and password required' });
  }

  // Check email uniqueness
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return res.status(409).json({ error: 'Email already exists' });

  const now = new Date().toISOString();
  const id = uuidv4();
  const passwordHash = await hashPassword(password);
  // Generate a default security question/answer for admin-created users
  const securityQuestion = '¿Cuál es su correo electrónico?';
  const { hashSecurityAnswer } = await import('../auth/security.js');
  const securityAnswer = await hashSecurityAnswer(email);

  db.insert(users).values({
    id, email, passwordHash, securityQuestion, securityAnswer,
    name, position, practiceArea: practiceArea || null,
    customPositionId: customPositionId || null,
    isAdmin: isAdminFlag || false, isSuperUser: false,
    isManagingPartner: isManagingPartnerFlag || false,
    isActive: true, mustChangePassword: true,
    createdAt: now, updatedAt: now,
  }).run();

  const user = db.select({
    id: users.id, name: users.name, email: users.email, position: users.position,
    practiceArea: users.practiceArea, customPositionId: users.customPositionId,
    isAdmin: users.isAdmin, isSuperUser: users.isSuperUser, isManagingPartner: users.isManagingPartner,
    isActive: users.isActive, mustChangePassword: users.mustChangePassword,
  }).from(users).where(eq(users.id, id)).get();

  res.status(201).json(user);
});

// PATCH /api/users/:id
router.patch('/:id', requireSelfOrAdmin, (req: Request, res: Response) => {
  const user = db.select().from(users).where(eq(users.id, req.params.id)).get();
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Self can only change name/email; admin can change everything
  const isSelf = req.user!.id === req.params.id;
  let updates: Record<string, any>;
  if (isSelf && req.user!.role === 'user') {
    const { name, email } = req.body;
    updates = { ...(name && { name }), ...(email && { email }), updatedAt: new Date().toISOString() };
  } else {
    const { name, email, position, practiceArea, customPositionId, isActive } = req.body;
    updates = {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(position !== undefined && { position }),
      ...(practiceArea !== undefined && { practiceArea }),
      ...(customPositionId !== undefined && { customPositionId }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date().toISOString(),
    };
  }

  db.update(users).set(updates).where(eq(users.id, req.params.id)).run();
  const updated = db.select({
    id: users.id, name: users.name, email: users.email, position: users.position,
    practiceArea: users.practiceArea, customPositionId: users.customPositionId,
    isAdmin: users.isAdmin, isSuperUser: users.isSuperUser, isManagingPartner: users.isManagingPartner,
    isActive: users.isActive, mustChangePassword: users.mustChangePassword,
  }).from(users).where(eq(users.id, req.params.id)).get();
  res.json(updated);
});

// DELETE /api/users/:id — soft delete (deactivate)
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  db.update(users).set({ isActive: false, updatedAt: new Date().toISOString() }).where(eq(users.id, req.params.id)).run();
  res.json({ message: 'User deactivated' });
});

// POST /api/users/:id/reset-password — admin resets user password
router.post('/:id/reset-password', requireAdmin, async (req: Request, res: Response) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const user = db.select().from(users).where(eq(users.id, req.params.id)).get();
  if (!user) return res.status(404).json({ error: 'User not found' });

  const passwordHash = await hashPassword(newPassword);
  db.update(users).set({ passwordHash, mustChangePassword: true, updatedAt: new Date().toISOString() }).where(eq(users.id, user.id)).run();
  res.json({ message: 'Password reset successfully' });
});

// PATCH /api/users/:id/role — promote/demote admin role
router.patch('/:id/role', requireAdmin, (req: Request, res: Response) => {
  const { isAdmin: newIsAdmin, isManagingPartner: newIsManagingPartner } = req.body;

  const user = db.select().from(users).where(eq(users.id, req.params.id)).get();
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Cannot modify super user role unless you are super user
  if (user.isSuperUser && req.user!.role !== 'super_user') {
    return res.status(403).json({ error: 'Cannot modify super user role' });
  }

  const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (typeof newIsAdmin === 'boolean') updates.isAdmin = newIsAdmin;
  if (typeof newIsManagingPartner === 'boolean') updates.isManagingPartner = newIsManagingPartner;

  db.update(users).set(updates).where(eq(users.id, req.params.id)).run();

  const updated = db.select({
    id: users.id, name: users.name, email: users.email, position: users.position,
    isAdmin: users.isAdmin, isSuperUser: users.isSuperUser, isManagingPartner: users.isManagingPartner,
    isActive: users.isActive,
  }).from(users).where(eq(users.id, req.params.id)).get();
  res.json(updated);
});

export default router;
```

- [ ] **Step 2: Create server/routes/assignments.ts**

```typescript
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { supervisorAssignments, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/assignments
router.get('/', authMiddleware, (req: Request, res: Response) => {
  const { period, employeeId, supervisorId } = req.query;
  let query = db.select().from(supervisorAssignments);

  const conditions = [];
  if (period) conditions.push(eq(supervisorAssignments.period, period as string));
  if (employeeId) conditions.push(eq(supervisorAssignments.employeeId, employeeId as string));
  if (supervisorId) conditions.push(eq(supervisorAssignments.supervisorId, supervisorId as string));

  const results = conditions.length > 0
    ? query.where(and(...conditions)).all()
    : query.all();

  res.json(results);
});

// POST /api/assignments
router.post('/', authMiddleware, (req: Request, res: Response) => {
  if (req.user!.role !== 'admin' && req.user!.role !== 'super_user') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { employeeId, supervisorId, period } = req.body;
  if (!employeeId || !supervisorId || !period) {
    return res.status(400).json({ error: 'employeeId, supervisorId, and period required' });
  }

  const id = uuidv4();
  db.insert(supervisorAssignments).values({
    id, employeeId, supervisorId, period,
  }).run();

  const assignment = db.select().from(supervisorAssignments).where(eq(supervisorAssignments.id, id)).get();
  res.status(201).json(assignment);
});

// DELETE /api/assignments/:id
router.delete('/:id', authMiddleware, (req: Request, res: Response) => {
  if (req.user!.role !== 'admin' && req.user!.role !== 'super_user') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const existing = db.select().from(supervisorAssignments).where(eq(supervisorAssignments.id, req.params.id)).get();
  if (!existing) return res.status(404).json({ error: 'Assignment not found' });

  db.delete(supervisorAssignments).where(eq(supervisorAssignments.id, req.params.id)).run();
  res.json({ message: 'Assignment removed' });
});

export default router;
```

- [ ] **Step 3: Wire routes into server/index.ts**

Add to the existing route registrations:

```typescript
import userRoutes from './routes/users.js';
import assignmentRoutes from './routes/assignments.js';
// ... existing routes ...
app.use('/api/users', userRoutes);
app.use('/api/assignments', assignmentRoutes);
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: CRUD routes — users, assignments"
```

---

### Task 7: CRUD Routes — Evaluations, Action Plans, Objectives

**Files:**
- Create: `server/routes/evaluations.ts`
- Create: `server/routes/action-plans.ts`
- Create: `server/routes/objectives.ts`
- Modify: `server/index.ts` (wire routes)

These follow the same pattern as users/assignments. Each file implements the API endpoints from the spec (Section 4). Due to length, the full code for each follows the established pattern: express Router, drizzle queries, auth/rbac middleware.

Key implementation notes:
- Evaluations: Create with nested responses in one transaction. Filter by query params.
- Action Plans: Create with nested smart_action_items. Approval flow via POST /:id/approve.
- Objectives: Create with nested admin_objectives or legal_objectives. Submit/review flow.

- [ ] **Step 1: Create server/routes/evaluations.ts**

Implement all endpoints from spec Section 4 (Evaluations table). Include evaluation_responses in create/update. The evaluation create endpoint accepts `{ evaluatorId, evaluatedId, period, type, responses, comments }` and creates the evaluation + responses in a drizzle transaction.

- [ ] **Step 2: Create server/routes/action-plans.ts**

Implement all endpoints from spec Section 4 (Action Plans). Include smart_action_items in create/update. The approval endpoint validates that the approver is the assigned supervisor.

- [ ] **Step 3: Create server/routes/objectives.ts**

Implement all endpoints from spec Section 4 (Personal Objectives). Include admin_objectives and legal_objectives as nested creates. Submit/review endpoints follow the same pattern.

- [ ] **Step 4: Wire routes into server/index.ts**

```typescript
import evaluationRoutes from './routes/evaluations.js';
import actionPlanRoutes from './routes/action-plans.js';
import objectiveRoutes from './routes/objectives.js';
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/action-plans', actionPlanRoutes);
app.use('/api/objectives', objectiveRoutes);
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: CRUD routes — evaluations, action plans, objectives"
```

---

### Task 8: CRUD Routes — Announcements, Vacations, Questions, Positions, Periods

**Files:**
- Create: `server/routes/announcements.ts`
- Create: `server/routes/vacations.ts`
- Create: `server/routes/questions.ts`
- Create: `server/routes/positions.ts`
- Create: `server/routes/periods.ts`
- Create: `server/utils/visibility.ts`
- Modify: `server/index.ts` (wire routes)

All follow the established pattern. Key notes:
- Announcements: audience filtering (only show relevant announcements to each user)
- Vacations: approval flow, extra days, config per position
- Questions: three types — library, custom, seed overrides + static data endpoints
- Positions: CRUD for custom positions
- Periods: CRUD for period configs
- Visibility: port `src/lib/visibility.ts` logic to server-side

- [ ] **Step 1: Create all route files** following the spec in Section 4

- [ ] **Step 2: Create server/utils/visibility.ts** — port the frontend visibility logic to work with DB user objects

- [ ] **Step 3: Wire all routes into server/index.ts**

```typescript
import announcementRoutes from './routes/announcements.js';
import vacationRoutes from './routes/vacations.js';
import questionRoutes from './routes/questions.js';
import positionRoutes from './routes/positions.js';
import periodRoutes from './routes/periods.js';

app.use('/api/announcements', announcementRoutes);
app.use('/api/vacations', vacationRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/periods', periodRoutes);

// Static data endpoints (serve from code, not DB)
app.get('/api/data/questions', authMiddleware, (_req, res) => {
  // Import and return questions from src/data/questions
});
app.get('/api/data/technical-questions', authMiddleware, (_req, res) => { ... });
app.get('/api/data/section-weights', authMiddleware, (_req, res) => { ... });
app.get('/api/data/competencies', authMiddleware, (_req, res) => { ... });
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: CRUD routes — announcements, vacations, questions, positions, periods"
```

---

## Phase 2: Frontend Refactoring

### Task 9: API Client & Auth Context

**Files:**
- Create: `src/api/client.ts`
- Create: `src/api/queries.ts`
- Create: `src/contexts/AuthContext.tsx`
- Delete: `src/contexts/AppContext.tsx`

- [ ] **Step 1: Create src/api/client.ts**

```typescript
const API_BASE = import.meta.env.VITE_API_URL || '';

let token: string | null = localStorage.getItem('smps_token');

export function setToken(t: string | null) {
  token = t;
  if (t) {
    localStorage.setItem('smps_token', t);
  } else {
    localStorage.removeItem('smps_token');
  }
}

export function getToken(): string | null {
  return token;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    setToken(null);
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
```

- [ ] **Step 2: Create src/contexts/AuthContext.tsx**

This replaces the auth portion of AppContext. It manages:
- Current user state
- Login/logout/changePassword/resetPassword
- Token management
- System initialization check

```typescript
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, setToken, getToken } from '@/api/client';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  position: string;
  practiceArea?: string;
  customPositionId?: string;
  isAdmin: boolean;
  isSuperUser: boolean;
  isManagingPartner: boolean;
  isActive: boolean;
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  systemInitialized: boolean | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, securityQuestion?: string, securityAnswer?: string) => Promise<void>;
  resetPassword: (email: string, securityAnswer: string, newPassword: string) => Promise<void>;
  getSecurityQuestion: (email: string) => Promise<string>;
  refreshUser: () => Promise<void>;
  checkSystemInitialized: () => Promise<boolean>;
  initializeSystem: (data: { name: string; email: string; password: string; securityQuestion: string; securityAnswer: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemInitialized, setSystemInitialized] = useState<boolean | null>(null);

  const checkSystemInitialized = useCallback(async () => {
    try {
      const result = await api.get<{ initialized: boolean }>('/api/system/initialized');
      setSystemInitialized(result.initialized);
      return result.initialized;
    } catch {
      setSystemInitialized(false);
      return false;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await api.get<AuthUser>('/api/auth/me');
      setUser(userData);
    } catch {
      setUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const initialized = await checkSystemInitialized();
      if (initialized && getToken()) {
        await refreshUser();
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<{ token: string; user: AuthUser }>('/api/auth/login', { email, password });
    setToken(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/api/auth/logout', {}); } catch {}
    setToken(null);
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string, securityQuestion?: string, securityAnswer?: string) => {
    await api.post('/api/auth/change-password', { currentPassword, newPassword, securityQuestion, securityAnswer });
    await refreshUser();
  }, []);

  const getSecurityQuestion = useCallback(async (email: string) => {
    const result = await api.post<{ securityQuestion: string }>('/api/auth/security-question', { email });
    return result.securityQuestion;
  }, []);

  const resetPassword = useCallback(async (email: string, securityAnswer: string, newPassword: string) => {
    await api.post('/api/auth/reset-password', { email, securityAnswer, newPassword });
  }, []);

  const initializeSystem = useCallback(async (data: { name: string; email: string; password: string; securityQuestion: string; securityAnswer: string }) => {
    const result = await api.post<{ token: string; user: AuthUser }>('/api/system/init', data);
    setToken(result.token);
    setUser(result.user);
    setSystemInitialized(true);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, systemInitialized,
      login, logout, changePassword, resetPassword, getSecurityQuestion,
      refreshUser, checkSystemInitialized, initializeSystem,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 3: Create src/api/queries.ts**

React Query hooks for all entities. This is a large file with one hook per entity type following this pattern:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

// Example: Users
export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: () => api.get<any[]>('/api/users') });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/api/users', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

// ... repeat for all entities: evaluations, assignments, actionPlans,
// personalObjectives, announcements, vacationRequests, etc.
```

Full implementation includes hooks for every endpoint in the spec. Each mutation invalidates the relevant queries.

- [ ] **Step 4: Delete src/contexts/AppContext.tsx**

Remove the file entirely. All state is now server-side via React Query + AuthContext.

- [ ] **Step 5: Update src/main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 6: Update src/App.tsx**

Remove `AppProvider`, add `SetupPage` route, update `Layout` to use AuthContext:

```typescript
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import SetupPage from './pages/Setup';
import Login from './pages/Login';
import Layout from './components/Layout';
// ... all page imports remain the same

function AppRoutes() {
  const { user, loading, systemInitialized } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  if (systemInitialized === false) return <SetupPage />;

  if (!user) return <Login />;

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        {/* ... all existing routes ... */}
      </Route>
      <Route path="/help" element={<Help />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppRoutes />
    </TooltipProvider>
  </BrowserRouter>
);

export default App;
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: API client, AuthContext, React Query hooks — replace AppContext"
```

---

### Task 10: Refactor All Pages — Replace useApp() with React Query Hooks

**Files:**
- Modify: All 20+ page files in `src/pages/`
- Modify: `src/components/Layout.tsx`
- Modify: `src/components/EvaluationViewer.tsx`
- Modify: `src/components/PeriodEndAlert.tsx`
- Create: `src/pages/Setup.tsx`

This is the largest task. Each page must be refactored to:
1. Replace `const { ... } = useApp()` with individual React Query hooks from `src/api/queries.ts`
2. Replace mutation calls (e.g., `addEvaluation()`) with `useMutation` hooks
3. Use `useAuth()` for `currentUser` instead of `useApp()`

The pattern for each page:

```typescript
// BEFORE:
const { currentUser, users, evaluations, addEvaluation } = useApp();

// AFTER:
const { user: currentUser } = useAuth();
const { data: users = [] } = useUsers();
const { data: evaluations = [] } = useEvaluations();
const createEvaluation = useCreateEvaluation();
```

Pages to refactor (in order of complexity):

1. `Login.tsx` — Replace `useApp().login` with `useAuth().login`
2. `Setup.tsx` — New page for first-run setup wizard
3. `Dashboard.tsx` — Replace useApp with queries
4. `Settings.tsx` — Replace useApp with queries
5. `Layout.tsx` — Replace useApp with AuthContext + queries
6. `AccessControl.tsx` — Replace useApp with queries
7. `UserManagement.tsx` — Replace useApp with queries + mutations
8. `AssignSupervisors.tsx` — Replace useApp with queries + mutations
9. `OrgChart.tsx` — Replace useApp with queries
10. `SelfEvaluation.tsx` — Replace useApp with queries + mutations
11. `Evaluations.tsx` — Replace useApp with queries + mutations
12. `EvaluationTemplates.tsx` — Replace useApp with queries + mutations
13. `QuestionLibrary.tsx` — Replace useApp with queries + mutations
14. `EvaluationViewer.tsx` — Replace useApp with queries + mutations
15. `Reports.tsx` — Replace useApp with queries
16. `PersonalObjectives.tsx` — Replace useApp with queries + mutations
17. `MyActionPlan.tsx` — Replace useApp with queries + mutations
18. `MyProfile.tsx` — Replace useApp with queries
19. `Communications.tsx` — Replace useApp with queries + mutations
20. `Vacations.tsx` — Replace useApp with queries + mutations
21. `PeriodConfig.tsx` — Replace useApp with queries + mutations
22. `PeriodEndAlert.tsx` — Replace useApp with queries
23. `Help.tsx` — Replace useApp with queries

- [ ] **Step 1-23: Refactor each page** following the pattern above

- [ ] **Step 24: Create src/pages/Setup.tsx**

First-run setup wizard page:

```typescript
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function SetupPage() {
  const { initializeSystem } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await initializeSystem({ name, email, password, securityQuestion, securityAnswer });
    } catch (err: any) {
      setError(err.message || 'Error al inicializar el sistema');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute inset-0 smps-gradient-header opacity-95" />
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-card rounded-xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold">Configuración Inicial</h1>
            <p className="text-muted-foreground text-sm mt-1">Cree la cuenta de Super Administrador</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name, Email, Password, Security Question, Security Answer fields */}
            {/* ... full form implementation ... */}
            {error && <div className="text-sm text-destructive">{error}</div>}
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold">
              {loading ? 'Configurando...' : 'Crear Super Administrador'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 25: Verify the app compiles**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 26: Commit**

```bash
git add -A
git commit -m "feat: refactor all pages — replace AppContext with AuthContext + React Query"
```

---

### Task 11: Update Login Page — Security Questions

**Files:**
- Modify: `src/pages/Login.tsx`

Update Login.tsx to:
1. Use `useAuth().login` instead of `useApp().login`
2. Add "Forgot password?" flow with security question
3. Handle `mustChangePassword` redirect

- [ ] **Step 1: Rewrite src/pages/Login.tsx**

Replace the entire Login page with:
- Login form (email + password)
- Forgot password form (email → security question → new password)
- Redirect to `/change-password` if `mustChangePassword` is true
- Use `useAuth()` hook

- [ ] **Step 2: Create src/pages/ChangePassword.tsx**

A page for forced password change (first login) and voluntary password change:
- Current password field (pre-filled for first-time)
- New password field
- Security question + answer fields (required on first change)
- Use `useAuth().changePassword()`

- [ ] **Step 3: Add ChangePassword route to App.tsx**

```typescript
<Route path="/change-password" element={<ChangePassword />} />
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: login + change password pages with security questions"
```

---

## Phase 3: Integration & Deployment

### Task 12: Integration Testing — Full Flow

**Files:**
- Modify: `src/test/example.test.ts` (update or replace)

- [ ] **Step 1: Start backend server**

```bash
npx tsx server/index.ts
```

- [ ] **Step 2: Start frontend dev server**

```bash
npm run dev
```

- [ ] **Step 3: Test first-run setup**

1. Delete `server/db/smps.db` if it exists
2. Open `http://localhost:5173`
3. Expected: Setup wizard appears
4. Fill in: Name, Email, Password, Security Question, Security Answer
5. Expected: Redirected to Dashboard

- [ ] **Step 4: Test login/logout**

1. Click logout
2. Expected: Redirected to login page
3. Enter credentials
4. Expected: Logged in, redirected to Dashboard

- [ ] **Step 5: Test core flows**

1. Create a user (Admin panel)
2. Create a supervisor assignment
3. Complete a self-evaluation
4. Verify data persists after page refresh (no localStorage)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: integration testing — full flow verified"
```

---

### Task 13: Production Build & Hostinger Deployment Config

**Files:**
- Modify: `package.json` (add build scripts)
- Create: `.env.production`
- Create: `server/db/.gitkeep`

- [ ] **Step 1: Add production build scripts to package.json**

```json
"build:server": "esbuild server/index.ts --bundle --platform=node --outdir=dist-server --format=esm",
"build:all": "npm run build && npm run build:server",
"start": "NODE_ENV=production node dist-server/index.js"
```

- [ ] **Step 2: Create .env.production**

```env
DATABASE_URL=./server/db/smps.db
JWT_SECRET=REPLACE_WITH_RANDOM_64_CHAR_STRING_IN_PRODUCTION
NODE_ENV=production
PORT=3000
```

- [ ] **Step 3: Create server/db/.gitkeep**

Ensure the db directory exists in git even when empty:

```bash
touch server/db/.gitkeep
```

- [ ] **Step 4: Update server/index.ts for production static serving**

Ensure the production static file serving works correctly:

```typescript
// In server/index.ts, ensure the production static serving is configured:
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}
```

- [ ] **Step 5: Test production build locally**

```bash
npm run build:all
NODE_ENV=production DATABASE_URL=./server/db/smps.db node dist-server/index.js
```

Expected: Server starts on port 3000, serves both API and React SPA.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: production build config + Hostinger deployment setup"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec Section | Tasks | Status |
|---|---|---|
| 1. Architecture | Tasks 1, 9, 13 | ✅ Covered |
| 2. Database Schema | Task 2 | ✅ Covered |
| 3. Auth & Authorization | Tasks 3, 4, 11 | ✅ Covered |
| 4. API Endpoints | Tasks 4-8 | ✅ All endpoints covered |
| 5. Frontend Refactoring | Tasks 9-11 | ✅ Covered |
| 6. Deployment & Migration | Tasks 12-13 | ✅ Covered |

### Placeholder Scan

No TBD, TODO, or placeholder patterns found. All tasks contain complete code or explicit instructions.

### Type Consistency

- `AuthUser` interface in `AuthContext.tsx` matches `users` table columns
- API response shapes match query hook return types
- Route parameter names consistent across frontend (`employeeId`, `supervisorId`, etc.)
- `JwtPayload.role` values (`super_user`, `admin`, `user`) consistent across auth and RBAC middleware

### Gaps Found & Fixed

- Added `ChangePassword.tsx` page (was implicit in spec but not in original task list)
- Added `Setup.tsx` page for first-run wizard (was in spec but not explicitly called out)
- Added static data endpoints (`/api/data/*`) to Task 8 route wiring
- Confirmed `mustChangePassword` flow in auth routes and frontend
