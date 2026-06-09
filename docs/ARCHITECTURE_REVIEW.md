# Architecture Review — SMPS Performance Compass

> Senior engineer review, 2026-06-05. No functionality changes — only code quality, scalability, and maintainability.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  Vite + TypeScript + TanStack Query + shadcn/ui          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Pages   │  │  Hooks   │  │   API    │              │
│  │  (32)    │  │  (6)     │  │  Client  │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │             │                      │
│  ┌────┴──────────────┴─────────────┴────┐               │
│  │         AuthContext (global state)    │               │
│  └──────────────────────────────────────┘               │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/JSON
┌────────────────────────┴────────────────────────────────┐
│                  Backend (Express 5)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Routes   │  │Middleware │  │ Services │              │
│  │  (19)     │  │  (5)      │  │  (8)     │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │             │                      │
│  ┌────┴──────────────┴─────────────┴────┐               │
│  │         db/connection.ts (pool)       │               │
│  └──────────────────────────────────────┘               │
└────────────────────────┬────────────────────────────────┘
                         │ mysql2
┌────────────────────────┴────────────────────────────────┐
│                    MySQL Database                         │
│  20+ tables: users, evaluations, action_plans, etc.      │
└──────────────────────────────────────────────────────────┘
```

### Data Flow
1. **Auth**: JWT token → `authMiddleware` → `req.user` (payload + DB user check)
2. **Authorization**: `permissions.ts` + `rbac.ts` middleware chains
3. **API**: REST endpoints → raw SQL via `db.*` helpers → JSON responses
4. **Frontend**: `apiFetch` → `toCamelCase` transform → TanStack Query cache → React components
5. **Analytics**: Periodic `refreshAnalytics()` materializes `analytics_*` tables from transactional data

---

## 2. Critical Problem Areas

### 🔴 P0 — DRY Violations (Duplicate Logic)

| Problem | Files | Impact |
|---------|-------|--------|
| `sanitizeUser()` defined 3× identically | `auth.ts`, `users.ts`, `system.ts` | Bug magnet — fix one, miss others |
| `isAdminOrSocio` logic duplicated 5× on frontend | `Evaluations.tsx`, `Reports.tsx`, `ScoreAnalysis.tsx`, `PersonalObjectives.tsx`, `Dashboard.tsx` | Inconsistent role checks — `isSuperUser` missing in some |
| `toMySQLDate()` pattern (`new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')`) repeated 20+ times | Every route file | Error-prone, inconsistent timestamp format |
| Error handling pattern `try { … } catch (err) { console.error(…); return res.status(500).json({ error: 'Internal server error' }) }` in every handler | All 19 route files | No structured logging, no error IDs, no request correlation |

### 🔴 P0 — No Error Handling Middleware

Every route handler wraps its entire body in `try/catch` with identical error handling. This is:
- **~400 lines of boilerplate** across all routes
- **No request correlation** — errors logged without request ID
- **No structured error response** — clients get generic "Internal server error"
- **No error classification** — all errors treated identically

### 🟡 P1 — Authorization Scattered & Inconsistent

| Location | Pattern | Issue |
|----------|---------|-------|
| `server/middleware/permissions.ts` | `isAdminOrSocio()`, `hasRole()`, `requireEntityAccess()` | Good — centralized |
| `server/middleware/rbac.ts` | `requireAdmin()`, `requireSelfOrAdmin()` | **Duplicated** — `requireAdmin` overlaps with `hasRole(['admin'])` |
| `server/routes/evaluations.ts` | Inline `if (!isAdminOrSocio(req.user!))` checks | Should use middleware |
| `server/routes/analytics.ts` | Inline role checks | Should use middleware |
| Frontend pages | `isAdmin \|\| isSocio \|\| !!currentUser.isManagingPartner` | Inconsistent — some include `isSuperUser`, some don't |

### 🟡 P1 — N+1 Query Patterns

| Route | Problem |
|-------|---------|
| `GET /api/action-plans` | Fetches all plans, then loops to fetch items for each plan |
| `GET /api/objectives` | Fetches all objectives, then loops to fetch admin/legal objectives for each |
| `GET /api/evaluations` | Fetches evaluations, then separate queries for responses and NA approvals |
| `analytics-refresh.ts` | Loops over every evaluation to fetch response counts individually |
| `analytics-refresh.ts` | Loops over every user × period to check individual flags |

### 🟡 P1 — Module-Level Mutable State (Frontend)

`evaluationConfig.ts` uses module-level `let` variables (`_positionConfig`, `_sectionWeights`, `_scoreLabels`, `_categories`) mutated by setter functions called from `useEvalConfigInit`. This:
- Breaks React's unidirectional data flow
- Makes state invisible to React DevTools
- Creates race conditions if components read before init completes
- Makes testing impossible without side effects

### 🟡 P1 — No Request Validation on Most Routes

Only `auth.ts` and `users.ts` use Zod validation (`validate()` middleware). The other 17 route files accept raw `req.body` with no schema validation:
- `evaluations.ts` — no validation on create/update
- `action-plans.ts` — no validation
- `objectives.ts` — no validation
- `periods.ts` — no validation
- `analytics.ts` — no period format validation on some endpoints

### 🟢 P2 — Performance Bottlenecks

| Issue | Detail |
|-------|--------|
| Auth middleware hits DB on every request | `authMiddleware` does a DB query to check `is_active` on every API call |
| Session blocklist check on every request | Another DB query per request to check `sessions` table |
| Analytics refresh is O(n²) | Nested loops over users × periods with individual DB queries |
| No pagination on list endpoints | `GET /api/users`, `GET /api/evaluations`, `GET /api/notifications` return all records |
| No caching headers | API responses have no `Cache-Control` or `ETag` headers |

### 🟢 P2 — Maintainability Issues

| Issue | Detail |
|-------|--------|
| No TypeScript types for DB rows | All DB results typed as `any` — no compile-time safety |
| Mixed Spanish/English in error messages | Some errors in Spanish, some in English |
| No API versioning | All routes under `/api/` with no version prefix |
| Rate limiters defined inline in `index.ts` | Should be in middleware module |
| `hashSecurityAnswer` imported but not used in `auth.ts` change-password | Dead import |
| Frontend `any` types everywhere | `useUsers()` returns `any[]`, all mutation data is `any` |

---

## 3. Refactoring Strategy

### Phase 1: Extract Shared Utilities (Zero Risk)

Create `server/utils/helpers.ts`:
- `sanitizeUser()` — single source of truth
- `toMySQLDate()` — consistent timestamp formatting
- `asyncHandler()` — wraps route handlers with error handling

### Phase 2: Centralize Authorization (Low Risk)

- Consolidate `rbac.ts` into `permissions.ts`
- Create frontend `useIsAdminOrSocio()` hook
- Replace inline role checks with middleware chains

### Phase 3: Fix N+1 Queries (Medium Risk)

- Batch-fetch related data in route handlers
- Use JOINs instead of sequential queries
- Add pagination to list endpoints

### Phase 4: Type Safety (Medium Risk)

- Generate TypeScript types from DB schema
- Replace `any` with proper types in API client
- Add Zod schemas for all route inputs

---

## 4. Clean Architecture Target

```
server/
├── utils/
│   ├── helpers.ts        ← sanitizeUser, toMySQLDate, asyncHandler
│   ├── types.ts          ← DB row types, API request/response types
│   └── date.ts           ← Date formatting utilities
├── middleware/
│   ├── auth.ts           ← Authentication only
│   ├── permissions.ts    ← All authorization (consolidated)
│   ├── validate.ts        ← Zod schemas + validation middleware
│   └── rate-limit.ts      ← All rate limiters
├── services/
│   ├── analytics.ts      ← Analytics business logic (separate from refresh)
│   ├── notifications.ts   ← Notification service
│   └── ...
├── routes/
│   ├── auth.ts           ← Thin handlers calling services
│   └── ...
└── index.ts              ← Clean route registration

src/
├── hooks/
│   ├── useAuth.ts         ← isAdminOrSocio, role helpers
│   └── ...
├── api/
│   ├── client.ts
│   ├── queries.ts
│   └── types.ts           ← API response types
└── lib/
    ├── evaluationConfig.ts ← Pure functions only (no mutable state)
    └── ...
```