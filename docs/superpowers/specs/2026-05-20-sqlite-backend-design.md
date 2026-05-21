# SMPS Performance Compass — SQLite Backend Design

**Date:** 2026-05-20  
**Status:** Approved  

## Overview

Replace the current localStorage-based state management with an Express.js backend using SQLite (via better-sqlite3 and Drizzle ORM), adding proper authentication, multi-user support, and Hostinger-compatible deployment.

## 1. Architecture

```
┌─────────────────────────────────────────────┐
│            Hostinger Server                  │
│                                              │
│  ┌─────────────────────────────────────┐    │
│  │        Express.js Server             │    │
│  │                                      │    │
│  │  /api/*  →  REST API handlers        │    │
│  │  /*      →  React SPA (built/dist)   │    │
│  │                                      │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │     better-sqlite3           │    │    │
│  │  │     data/smps.db (file)      │    │    │
│  │  └─────────────────────────────┘    │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│            Browser                          │
│                                              │
│  React SPA                                  │
│  ├─ AuthContext (JWT token + current user)   │
│  ├─ React Query (all server state)           │
│  └─ Static data (questions, weights, etc.)   │
└─────────────────────────────────────────────┘
```

### Project Structure

```
smps-performance-compass-main/
├── server/                  ← NEW: Express backend
│   ├── index.ts            ← Entry point
│   ├── db/
│   │   ├── schema.ts       ← Drizzle schema definitions
│   │   ├── migrate.ts      ← Migration runner
│   │   └── seed.ts         ← Initial data seeding
│   ├── auth/
│   │   ├── jwt.ts          ← Token creation/validation
│   │   └── security.ts     ← Password hashing + security questions
│   ├── routes/
│   │   ├── auth.ts         ← Login, logout, me, change-password, reset-password
│   │   ├── users.ts        ← CRUD users
│   │   ├── evaluations.ts  ← CRUD evaluations
│   │   ├── assignments.ts  ← Supervisor assignments
│   │   ├── action-plans.ts ← Action plans + approval
│   │   ├── objectives.ts   ← Personal objectives
│   │   ├── announcements.ts← Communications
│   │   ├── vacations.ts   ← Vacation requests
│   │   ├── questions.ts    ← Question library + seed overrides
│   │   ├── positions.ts    ← Custom positions
│   │   ├── periods.ts      ← Period configuration
│   │   └── system.ts       ← System status, modules, activation
│   ├── middleware/
│   │   ├── auth.ts         ← JWT verification middleware
│   │   └── rbac.ts         ← Role-based access control
│   └── utils/
│       └── visibility.ts   ← Same visibility rules from frontend
├── src/                     ← EXISTING: React frontend (refactored)
│   ├── api/
│   │   ├── client.ts       ← Fetch wrapper with auth headers
│   │   └── queries.ts     ← React Query hooks per entity
│   ├── contexts/
│   │   ├── AuthContext.tsx  ← NEW: JWT auth state
│   │   └── AppContext.tsx   ← DELETED: replaced by AuthContext + React Query
│   └── ... (existing pages, components)
└── data/                    ← SQLite database file (gitignored)
    └── smps.db
```

### Key Decisions

- Single Express process serves both API and static files
- Drizzle ORM for type-safe DB access with auto-generated migrations
- Frontend keeps static reference data (questions, weights, competencies) as TypeScript code
- All user-generated data goes to SQLite
- React Query replaces all localStorage persistence
- < 20 concurrent users — SQLite with WAL mode is sufficient

## 2. Database Schema

SQLite using Drizzle ORM. Text IDs preserve compatibility with existing mock data during seeding. ISO text dates. Booleans as INTEGER (0/1).

### Users

```sql
CREATE TABLE users (
  id                  TEXT PRIMARY KEY,
  email               TEXT UNIQUE NOT NULL,
  password_hash       TEXT NOT NULL,
  security_question   TEXT NOT NULL,
  security_answer     TEXT NOT NULL,       -- bcrypt hashed
  name                TEXT NOT NULL,
  position            TEXT NOT NULL,
  practice_area       TEXT,
  custom_position_id  TEXT,
  is_admin            INTEGER NOT NULL DEFAULT 0,
  is_super_user       INTEGER NOT NULL DEFAULT 0,
  is_managing_partner INTEGER NOT NULL DEFAULT 0,
  is_active           INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
```

### Custom Positions

```sql
CREATE TABLE custom_positions (
  id              TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  level           TEXT NOT NULL,
  practice_area   TEXT,
  base_position   TEXT NOT NULL,
  created_at      TEXT NOT NULL
);
```

### Period Configuration

```sql
CREATE TABLE period_configs (
  period            TEXT PRIMARY KEY,
  self_start        TEXT NOT NULL,
  self_end          TEXT NOT NULL,
  supervisor_start  TEXT NOT NULL,
  supervisor_end    TEXT NOT NULL,
  feedback_start    TEXT NOT NULL,
  feedback_end      TEXT NOT NULL,
  action_plan_start TEXT NOT NULL,
  action_plan_end   TEXT NOT NULL
);
```

### Supervisor Assignments

```sql
CREATE TABLE supervisor_assignments (
  id            TEXT PRIMARY KEY,
  employee_id   TEXT NOT NULL REFERENCES users(id),
  supervisor_id TEXT NOT NULL REFERENCES users(id),
  period        TEXT NOT NULL,
  UNIQUE(employee_id, supervisor_id, period)
);
```

### Evaluations

```sql
CREATE TABLE evaluations (
  id                    TEXT PRIMARY KEY,
  evaluator_id          TEXT NOT NULL REFERENCES users(id),
  evaluated_id          TEXT NOT NULL REFERENCES users(id),
  period                TEXT NOT NULL,
  type                  TEXT NOT NULL,
  comments              TEXT DEFAULT '',
  supervisor_comments   TEXT,
  total_score           REAL DEFAULT 0,
  completed_at          TEXT,
  feedback_completed    INTEGER DEFAULT 0,
  feedback_completed_at TEXT,
  feedback_completed_by TEXT REFERENCES users(id),
  created_at            TEXT NOT NULL,
  UNIQUE(evaluator_id, evaluated_id, period, type)
);

CREATE TABLE evaluation_responses (
  id              TEXT PRIMARY KEY,
  evaluation_id   TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  question_id     TEXT NOT NULL,
  score           INTEGER NOT NULL,
  not_applicable  INTEGER DEFAULT 0,
  no_elements     INTEGER DEFAULT 0
);

CREATE TABLE evaluation_na_approvals (
  evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  question_id   TEXT NOT NULL,
  approved      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(evaluation_id, question_id)
);
```

### Action Plans

```sql
CREATE TABLE action_plans (
  id                TEXT PRIMARY KEY,
  employee_id       TEXT NOT NULL REFERENCES users(id),
  supervisor_id     TEXT NOT NULL REFERENCES users(id),
  period            TEXT NOT NULL,
  content           TEXT DEFAULT '',
  approval_status   TEXT DEFAULT 'pending',
  approval_comments TEXT,
  approved_by       TEXT REFERENCES users(id),
  approved_at       TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  UNIQUE(employee_id, period)
);

CREATE TABLE smart_action_items (
  id              TEXT PRIMARY KEY,
  action_plan_id  TEXT NOT NULL REFERENCES action_plans(id) ON DELETE CASCADE,
  competencia     TEXT NOT NULL,
  objetivo        TEXT NOT NULL,
  acciones        TEXT NOT NULL,
  que_evitar      TEXT NOT NULL,
  fecha_revision  TEXT NOT NULL,
  apoyos          TEXT NOT NULL
);
```

### Personal Objectives

```sql
CREATE TABLE personal_objectives (
  id        TEXT PRIMARY KEY,
  user_id   TEXT NOT NULL REFERENCES users(id),
  period    TEXT NOT NULL,
  type      TEXT NOT NULL,
  UNIQUE(user_id, period)
);

CREATE TABLE admin_objectives (
  id                      TEXT PRIMARY KEY,
  personal_objectives_id  TEXT NOT NULL REFERENCES personal_objectives(id) ON DELETE CASCADE,
  tipo_objetivo           TEXT NOT NULL,
  nombre_objetivo         TEXT NOT NULL,
  pilares_estrategicos    TEXT DEFAULT '',
  alcance                 TEXT DEFAULT '',
  porcentaje_avance       REAL DEFAULT 0,
  status                  TEXT DEFAULT 'draft',
  submitted_at            TEXT,
  reviewed_at             TEXT,
  reviewed_by             TEXT REFERENCES users(id),
  reviewer_comment        TEXT
);

CREATE TABLE legal_objectives (
  id                        TEXT PRIMARY KEY,
  personal_objectives_id    TEXT NOT NULL REFERENCES personal_objectives(id) ON DELETE CASCADE,
  horas_meta                REAL DEFAULT 0,
  horas_ajustadas           REAL DEFAULT 0,
  porcentaje_horas_vs_meta  REAL DEFAULT 0,
  porcentaje_eficiencia     REAL DEFAULT 0,
  meta_pro_bono             REAL DEFAULT 0,
  realizado_pro_bono        REAL DEFAULT 0,
  meta_marketing            REAL DEFAULT 0,
  realizado_marketing        REAL DEFAULT 0,
  meta_business_dev         REAL DEFAULT 0,
  realizado_business_dev    REAL DEFAULT 0,
  meta_mentoring            REAL DEFAULT 0,
  realizado_mentoring       REAL DEFAULT 0,
  resultado_area            REAL DEFAULT 0,
  resultado_firma           REAL DEFAULT 0,
  porcentaje_total_bono     REAL DEFAULT 0
);
```

### Announcements

```sql
CREATE TABLE announcements (
  id          TEXT PRIMARY KEY,
  author_id   TEXT NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  audience    TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  expires_at  TEXT,
  archived    INTEGER DEFAULT 0
);

CREATE TABLE announcement_reads (
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY(announcement_id, user_id)
);
```

### Vacations

```sql
CREATE TABLE vacation_requests (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL,
  days        INTEGER NOT NULL,
  reason      TEXT DEFAULT '',
  status      TEXT DEFAULT 'pending',
  created_at  TEXT NOT NULL,
  period      TEXT
);

CREATE TABLE vacation_approvals (
  id                  TEXT PRIMARY KEY,
  vacation_request_id TEXT NOT NULL REFERENCES vacation_requests(id) ON DELETE CASCADE,
  approver_id         TEXT NOT NULL REFERENCES users(id),
  approved_at         TEXT NOT NULL,
  action              TEXT NOT NULL,
  comment             TEXT
);

CREATE TABLE extra_vacation_days (
  id        TEXT PRIMARY KEY,
  user_id   TEXT NOT NULL REFERENCES users(id),
  days      INTEGER NOT NULL,
  reason    TEXT NOT NULL,
  added_by  TEXT NOT NULL REFERENCES users(id),
  added_at  TEXT NOT NULL,
  period    TEXT NOT NULL
);

CREATE TABLE vacation_config (
  position TEXT PRIMARY KEY,
  days     INTEGER NOT NULL
);
```

### Evaluation Questions & Positions

```sql
CREATE TABLE custom_eval_questions (
  id            TEXT PRIMARY KEY,
  position      TEXT NOT NULL,
  question_id   TEXT NOT NULL,
  category      TEXT NOT NULL,
  text          TEXT NOT NULL,
  weight        INTEGER NOT NULL,
  section       TEXT,
  practice_area TEXT,
  UNIQUE(position, question_id)
);

CREATE TABLE library_questions (
  id              TEXT PRIMARY KEY,
  question_id     TEXT UNIQUE NOT NULL,
  category        TEXT NOT NULL,
  text            TEXT NOT NULL,
  default_weight  INTEGER NOT NULL,
  created_at      TEXT NOT NULL,
  created_by      TEXT REFERENCES users(id)
);

CREATE TABLE seed_question_overrides (
  question_id TEXT PRIMARY KEY,
  text        TEXT,
  category    TEXT,
  weight      INTEGER,
  hidden      INTEGER DEFAULT 0
);
```

### System Configuration

```sql
CREATE TABLE module_config (
  id             INTEGER PRIMARY KEY DEFAULT 1 CHECK(id = 1),
  evaluations    INTEGER NOT NULL DEFAULT 1,
  communications INTEGER NOT NULL DEFAULT 1,
  vacations      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE system_status (
  id              INTEGER PRIMARY KEY DEFAULT 1 CHECK(id = 1),
  status          TEXT NOT NULL DEFAULT 'active',
  activation_date TEXT NOT NULL,
  payment_plan    TEXT NOT NULL DEFAULT 'monthly',
  max_users       INTEGER NOT NULL DEFAULT 50,
  tickets         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE activation_history (
  id      TEXT PRIMARY KEY,
  action  TEXT NOT NULL,
  date    TEXT NOT NULL,
  by      TEXT NOT NULL REFERENCES users(id)
);
```

### Sessions (JWT Blocklist)

```sql
CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
```

## 3. Authentication & Authorization

### Login Flow

1. User submits email + password to POST /api/auth/login
2. Server verifies bcrypt password hash, checks is_active
3. Server generates JWT (24h expiry) with { sub, email, role }
4. Client stores token in localStorage as smps_token
5. All subsequent requests include Authorization: Bearer <token>

### First Login / Password Reset

- New users created by admin receive a temporary password + must_change_password = 1
- On first login, user is redirected to /change-password
- User sets own password + picks a security question + answer
- Security answer is bcrypt-hashed (never stored in plaintext)

### Forgot Password Flow

1. User clicks "Olvidaste tu contrasena?"
2. Enters email
3. Server returns the security question for that email
4. User answers the question
5. Server verifies answer (bcrypt compare)
6. If correct: user sets a new password directly
7. If wrong: "Respuesta incorrecta. Contacte al administrador."

### JWT Structure

```json
{
  "sub": "u1",
  "email": "cmendoza@smps.com",
  "role": "admin",
  "iat": 1740000000,
  "exp": 1740086400
}
```

### Authorization Middleware

- authMiddleware — all /api/* routes except login, security-question, reset-password, and system/init
  - Extract Bearer token, verify JWT, check not in blocklist, attach user to request
- rbacMiddleware — per route:
  - requireAdmin() — isAdmin || isSuperUser
  - requireSuperUser() — isSuperUser
  - requireSelfOrAdmin(userId) — userId === currentUser.id || isAdmin

### Role Permissions Matrix

| Action | SuperUser | Admin | Managing Partner | Socio | Supervisor | Regular User |
|---|---|---|---|---|---|---|
| System activation | YES | NO | NO | NO | NO | NO |
| Module config | YES | NO | NO | NO | NO | NO |
| User management | YES | YES | NO | NO | NO | NO |
| Promote/demote admin role | YES | YES | NO | NO | NO | NO |
| Period config | YES | YES | NO | NO | NO | NO |
| Question library | YES | YES | NO | NO | NO | NO |
| View all evaluations | YES | YES | YES | partial | own | own |
| Evaluate team | YES | YES | YES | YES | YES (assigned) | NO |
| Self-evaluation | YES | YES | YES | YES | YES | YES |
| Action plans (own) | YES | YES | YES | YES | YES | YES |
| Approve action plans | YES | YES | YES | YES | YES (assigned) | NO |
| Announcements | YES | YES | YES | YES | read | read |
| Vacations (own) | YES | YES | YES | YES | YES | YES |
| Approve vacations | YES | YES | NO | NO | YES (assigned) | NO |
| Vacation config | YES | YES | NO | NO | NO | NO |

### Password Policy

- Minimum 6 characters
- bcrypt with 12 salt rounds
- Admin-created users get temporary password + must_change_password = 1
- Users can change their own password anytime from Settings

## 4. API Endpoints

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/login | None | Login, returns JWT + user |
| POST | /api/auth/logout | Bearer | Logout, adds token to blocklist |
| GET | /api/auth/me | Bearer | Get current user profile |
| POST | /api/auth/change-password | Bearer | Change own password |
| POST | /api/auth/security-question | None | Get security question for email |
| POST | /api/auth/reset-password | None | Verify security answer + set new password |

### Users

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/users | Admin | List all users |
| GET | /api/users/:id | Admin or Self | Get single user |
| POST | /api/users | Admin | Create user (with temp password) |
| PATCH | /api/users/:id | Admin or Self | Update user |
| DELETE | /api/users/:id | Admin | Deactivate user |
| POST | /api/users/:id/reset-password | Admin | Admin resets user password |
| PATCH | /api/users/:id/role | Admin | Promote/demote admin role |

### Supervisor Assignments

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/assignments | Bearer | List (filtered by query) |
| POST | /api/assignments | Admin | Create assignment |
| DELETE | /api/assignments/:id | Admin | Remove assignment |

### Evaluations

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/evaluations | Bearer | List (filtered by query) |
| GET | /api/evaluations/:id | Bearer | Get with responses |
| POST | /api/evaluations | Bearer | Create with responses |
| PATCH | /api/evaluations/:id | Bearer | Update |
| PATCH | /api/evaluations/:id/feedback | Bearer | Mark feedback completed |
| PATCH | /api/evaluations/:id/na-approval | Bearer | Approve/reject N/A |

### Action Plans

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/action-plans | Bearer | List (filtered) |
| POST | /api/action-plans | Bearer | Create/update |
| PATCH | /api/action-plans/:id | Bearer | Update content |
| POST | /api/action-plans/:id/approve | Bearer | Approve/reject |

### Personal Objectives

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/objectives | Bearer | List (filtered) |
| POST | /api/objectives | Bearer | Create/update |
| POST | /api/objectives/:id/submit | Bearer | Submit for review |
| POST | /api/objectives/:id/review | Bearer | Approve/reject |

### Announcements

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/announcements | Bearer | List (visibility-filtered) |
| POST | /api/announcements | Admin | Create |
| PATCH | /api/announcements/:id | Admin | Update/archive |
| POST | /api/announcements/:id/read | Bearer | Mark as read |

### Vacations

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/vacations/requests | Bearer | List (filtered) |
| POST | /api/vacations/requests | Bearer | Create request |
| PATCH | /api/vacations/requests/:id | Bearer | Update status |
| POST | /api/vacations/requests/:id/approve | Bearer | Approve/reject |
| DELETE | /api/vacations/requests/:id | Self | Delete own pending request |
| GET | /api/vacations/config | Admin | Get config |
| PATCH | /api/vacations/config | Admin | Update config |
| POST | /api/vacations/extra-days | Admin | Add extra days |

### Periods

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/periods | Bearer | List all |
| POST | /api/periods | Admin | Create/update |

### Questions & Positions

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/questions/library | Bearer | Get library questions |
| POST | /api/questions/library | Admin | Add |
| PATCH | /api/questions/library/:id | Admin | Update |
| DELETE | /api/questions/library/:id | Admin | Delete |
| GET | /api/questions/custom | Bearer | Get custom questions |
| POST | /api/questions/custom | Admin | Set custom questions |
| GET | /api/questions/overrides | Bearer | Get overrides |
| PATCH | /api/questions/overrides/:id | Admin | Update/hide override |
| GET | /api/positions | Bearer | List custom positions |
| POST | /api/positions | Admin | Add |
| DELETE | /api/positions/:id | Admin | Delete |

### System

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/system/status | Bearer | Get status |
| PATCH | /api/system/status | SuperUser | Activate/deactivate |
| GET | /api/system/modules | Bearer | Get modules |
| PATCH | /api/system/modules | SuperUser | Toggle modules |
| GET | /api/system/activation-history | SuperUser | Get history |
| POST | /api/system/init | None | First-run setup |

### Static Data

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/data/questions | Bearer | Seed questions per position |
| GET | /api/data/technical-questions | Bearer | Technical questions |
| GET | /api/data/section-weights | Bearer | Section weight config |
| GET | /api/data/competencies | Bearer | Competency dictionary |

## 5. Frontend Refactoring

### What Changes

Current: One monolithic AppContext holds all state + 30+ CRUD operations + localStorage persistence.
Target: AuthContext (auth only) + React Query (all server state).

### New Files

| File | Purpose |
|---|---|
| src/contexts/AuthContext.tsx | JWT token, currentUser, login/logout, changePassword |
| src/api/client.ts | Fetch wrapper with auth headers, 401 handling |
| src/api/queries.ts | React Query hooks per entity |

### Deleted Files

| File | Reason |
|---|---|
| src/contexts/AppContext.tsx | Replaced by AuthContext + React Query |

### Modified Files

| File | Change |
|---|---|
| src/main.tsx | Add AuthProvider wrapping |
| src/App.tsx | Remove AppProvider, add AuthProvider |
| All 20+ page files | Replace useApp() with React Query hooks |
| src/components/Layout.tsx | Use AuthContext + query hooks |
| src/components/EvaluationViewer.tsx | Use query hooks |
| src/components/PeriodEndAlert.tsx | Use query hooks |

### Unchanged Files

- All src/components/ui/* — untouched
- Page layout and visual design — untouched
- Routing structure — untouched
- src/types/index.ts — minor additions (auth types), mostly preserved
- src/data/mockData.ts — kept for DB seeding only
- src/data/questions.ts, technicalQuestions.ts, sectionWeights.ts, competencyDictionary.ts — kept as static data
- src/lib/visibility.ts — kept as-is

## 6. Deployment & Data Migration

### Hostinger Deployment

Target: Hostinger Business Web Hosting with Node.js

File structure on server:
- server/index.js — Compiled Express server
- server/db/smps.db — SQLite database file
- dist/ — Built React SPA
- package.json, node_modules/

Hostinger setup:
1. Node.js app in dashboard, entry point: server/index.js
2. Environment: NODE_ENV=production
3. SQLite path: ./server/db/smps.db
4. Express serves dist/ for all non-/api routes

Build and deploy:
```bash
npm run build          # React to dist/
npm run build:server   # TypeScript to server/
# Upload via SSH/Git, then npm install --production
```

### First-Run Setup

When app starts and no DB exists:
1. GET /api/system/status returns 404
2. Frontend shows Setup Wizard
3. Admin enters: Name, Email, Password, Security Question + Answer
4. POST /api/system/init creates DB, runs migrations, seeds defaults, creates Super Admin
5. Returns JWT, redirects to Dashboard

Seed data created on init:
- Super Admin user (from wizard form)
- Custom positions (from positionCatalog.ts)
- Position hierarchy, section weights, evaluation questions (from code)
- Module config (default: all active)
- System status (default: active)
- Vacation config (default days per position)

### Data Migration Strategy

Recommended: Fresh start. No migration of mock data. Start clean, admin creates real users through the UI.

### Environment Configuration

Local development:
```bash
DATABASE_URL=./server/db/smps.db
JWT_SECRET=<random-64-char-string>
NODE_ENV=development
PORT=8080
```

Production on Hostinger:
```bash
DATABASE_URL=./server/db/smps.db
JWT_SECRET=<different-random-64-char-string>
NODE_ENV=production
PORT=3000
```

### Development Workflow

```bash
npm run dev          # Vite dev server (React) on :5173
npm run dev:server   # Express + tsx watch on :3000
npm run dev:full     # Concurrent: both servers with proxy

# Vite proxy: /api/* -> http://localhost:3000
```

### Concurrency and SQLite

- SQLite WAL mode enabled (PRAGMA journal_mode=WAL) for concurrent read/write
- Suitable for fewer than 20 concurrent users
- Future PostgreSQL migration path is straightforward since Drizzle ORM abstracts SQL dialects
