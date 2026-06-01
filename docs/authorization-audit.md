# Authorization Audit — SMPS Performance Compass

> Generated from production code inspection. Every route is listed with its current
> authorization state and a recommended fix.

## Legend

- **Auth** = `authMiddleware` (valid JWT required)
- **Admin** = `requireAdmin` (role admin or super_user)
- **Super** = `requireSuperUser` (role super_user only)
- **SelfOrAdmin** = `requireSelfOrAdmin` (own resource or admin)
- **None** = no middleware at all
- **⚠️ GAP** = authenticated but no role/ownership check — any logged-in user can access

---

## Evaluations (`server/routes/evaluations.ts`)

| Route | Method | Auth | Current AuthZ | Data Exposed | Recommended |
|-------|--------|------|---------------|--------------|-------------|
| `/api/evaluations/export/csv` | GET | Auth | Admin/super/socio check inline | All evaluation scores for period | OK — but socio check is positional, not role-based |
| `/api/evaluations` | GET | Auth | **None** ⚠️ | All evaluations + responses + NA approvals for any filter | Filter by visibility: own evals, or admin/supervisor of evaluated |
| `/api/evaluations/:id` | GET | Auth | **None** ⚠️ | Full evaluation with all responses | Check: is viewer the evaluator, evaluated, supervisor of evaluated, or admin? |
| `/api/evaluations` | POST | Auth | **None** ⚠️ | Can create evaluation for anyone | Validate: evaluatorId must be self or admin; evaluated must be assigned to evaluator |
| `/api/evaluations/:id` | PUT | Auth | **None** ⚠️ | Can modify any evaluation | Validate: only evaluator or admin can update; only during valid period phase |
| `/api/evaluations/:id/feedback` | PATCH | Auth | **None** ⚠️ | Can mark any feedback as complete | Validate: only supervisor of evaluated or admin |
| `/api/evaluations/:id/na-approval` | PATCH | Auth | **None** ⚠️ | Can approve NA on any evaluation | Validate: only supervisor or admin |

**Verdict: 6 out of 7 evaluation routes have NO authorization beyond authentication. Any logged-in user can read, create, modify, and approve any evaluation.**

---

## Objectives (`server/routes/objectives.ts`)

| Route | Method | Auth | Current AuthZ | Data Exposed | Recommended |
|-------|--------|------|---------------|--------------|-------------|
| `/api/objectives` | GET | Auth | Partial — filters non-admin to own userId | Own objectives OK, but admin sees all | OK for GET — visibility is role-based |
| `/api/objectives` | POST | Auth | **None** ⚠️ | Can create objectives for any user | Validate: userId must be self or admin |
| `/api/objectives/:id/submit` | POST | Auth | **None** ⚠️ | Can submit any objective | Validate: objective must belong to requesting user or admin |
| `/api/objectives/:id/review` | POST | Auth | **None** ⚠️ | Can approve/reject any objective | Validate: only admin or assigned supervisor |

**Verdict: 3 out of 4 objective routes lack authorization. Any user can create objectives for others, submit others' objectives, or approve/reject them.**

---

## Action Plans (`server/routes/action-plans.ts`)

| Route | Method | Auth | Current AuthZ | Data Exposed | Recommended |
|-------|--------|------|---------------|--------------|-------------|
| `/api/action-plans` | GET | Auth | **None** ⚠️ | All action plans for any filter | Filter: own plans, or admin, or supervisor of employee |
| `/api/action-plans` | POST | Auth | **None** ⚠️ | Can create plan for any employee | Validate: supervisor must be self or admin |
| `/api/action-plans/:id` | PATCH | Auth | **None** ⚠️ | Can modify any plan | Validate: employee, supervisor, or admin |
| `/api/action-plans/:id/approve` | POST | Auth | **None** ⚠️ | Can approve any plan | Validate: only supervisor or admin |

**Verdict: All 4 action plan routes lack authorization. Any user can read, create, modify, and approve any action plan.**

---

## Vacations (`server/routes/vacations.ts`)

| Route | Method | Auth | Current AuthZ | Data Exposed | Recommended |
|-------|--------|------|---------------|--------------|-------------|
| `/api/vacations/requests` | GET | Auth | **None** ⚠️ | All vacation requests for any filter | Filter: own requests, or admin, or supervisor of user |
| `/api/vacations/requests` | POST | Auth | **None** ⚠️ | Can create request for any user | Validate: userId must be self |
| `/api/vacations/requests/:id` | PATCH | Auth | **None** ⚠️ | Can change status of any request | Validate: only admin can change status |
| `/api/vacations/requests/:id/approve` | POST | Auth | **None** ⚠️ | Can approve any vacation | Validate: only supervisor or admin |
| `/api/vacations/requests/:id` | DELETE | Auth | Partial — checks ownership or admin | Own + admin | OK |
| `/api/vacations/config` | GET | Auth | Admin | Vacation config | OK |
| `/api/vacations/config` | PATCH | Auth | Admin | Update config | OK |
| `/api/vacations/extra-days` | POST | Auth | Admin | Add extra days | OK |

**Verdict: 4 out of 8 vacation routes lack authorization. Any user can see all requests, create for others, change status, and approve.**

---

## Announcements (`server/routes/announcements.ts`)

| Route | Method | Auth | Current AuthZ | Data Exposed | Recommended |
|-------|--------|------|---------------|--------------|-------------|
| `/api/announcements` | GET | Auth | Filters by audience | OK — role-filtered | OK |
| `/api/announcements` | POST | Auth | Admin | Create announcement | OK |
| `/api/announcements/:id` | PATCH | Auth | Admin | Update announcement | OK |
| `/api/announcements/:id/read` | POST | Auth | None needed | Mark as read | OK |

**Verdict: Announcements are properly secured.**

---

## Users (`server/routes/users.ts`)

| Route | Method | Auth | Current AuthZ | Data Exposed | Recommended |
|-------|--------|------|---------------|--------------|-------------|
| `/api/users` | GET | Auth | Role-filtered in handler | Visibility by role | OK — complex but correct |
| `/api/users/:id` | GET | Auth | SelfOrAdmin or assignment check | Single user | OK |
| `/api/users` | POST | Auth | Admin | Create user | OK |
| `/api/users/:id` | PATCH | Auth | SelfOrAdmin | Update user | OK |
| `/api/users/:id` | DELETE | Auth | Admin | Delete user | OK |
| `/api/users/:id/reset-password` | POST | Auth | Admin | Reset password | OK |
| `/api/users/:id/role` | PATCH | Auth | Admin | Update role | OK |
| `/api/users/:id/timeline` | GET | Auth | Admin or self | Timeline events | OK |
| `/api/users/:id/timeline` | POST | Auth | Admin | Create event | OK |

**Verdict: Users are properly secured.**

---

## Assignments (`server/routes/assignments.ts`)

| Route | Method | Auth | Current AuthZ | Data Exposed | Recommended |
|-------|--------|------|---------------|--------------|-------------|
| `/api/assignments` | GET | Auth | **None** ⚠️ | All assignments for any filter | Filter: own assignments, or admin |
| `/api/assignments` | POST | Auth | Admin | Create assignment | OK |
| `/api/assignments/:id` | DELETE | Auth | Admin | Delete assignment | OK |

**Verdict: GET assignments is visible to any authenticated user. This may be intentional for the org chart, but exposes supervisor-subordinate relationships to all users.**

---

## Evaluation Config (`server/routes/evaluation-config.ts`)

| Route | Method | Auth | Current AuthZ | Data Exposed | Recommended |
|-------|--------|------|---------------|--------------|-------------|
| GET categories/weights/competencies/templates/library/score-labels/positions | GET | Auth | None | Read-only config | OK — all users need to read config |
| POST/PATCH/DELETE config changes | Various | Auth | Admin | Modify config | OK |
| `/api/evaluation-config/reseed` | POST | Auth | Admin | Danger: deletes and re-seeds | OK but destructive |

**Verdict: Evaluation config is properly secured.**

---

## Periods (`server/routes/periods.ts`)

| Route | Method | Auth | Current AuthZ | Data Exposed | Recommended |
|-------|--------|------|---------------|--------------|-------------|
| `/api/periods` | GET | Auth | None | Period configs | OK — all users need periods |
| `/api/periods` | POST | Auth | Admin | Create/update period | OK |

**Verdict: Periods are properly secured.**

---

## Timeline (`server/routes/timeline.ts`)

| Route | Method | Auth | Current AuthZ | Data Exposed | Recommended |
|-------|--------|------|---------------|--------------|-------------|
| `/api/users/:id/timeline` | GET | Auth | Admin or self | Timeline events | OK |
| `/api/users/:id/timeline` | POST | Auth | Admin | Create event | OK |
| `/api/users/:id/timeline/:eventId` | PATCH | Auth | Admin | Update event | OK |
| `/api/users/:id/timeline/:eventId` | DELETE | Auth | Admin | Delete event | OK |

**Verdict: Timeline is properly secured.**

---

## System (`server/routes/system.ts`)

| Route | Method | Auth | Current AuthZ | Data Exposed | Recommended |
|-------|--------|------|---------------|--------------|-------------|
| `/api/system/initialized` | GET | **None** | None | Boolean | OK — needed before auth |
| `/api/system/init` | POST | **None** | None | Creates super admin | **GAP: Should only work when system is NOT initialized** (has check) |
| `/api/system/status` | GET | Auth | None | System status | OK |
| `/api/system/status` | PATCH | Auth | SuperUser | Toggle status | OK |
| `/api/system/modules` | GET | Auth | None | Module config | OK |
| `/api/system/modules` | PATCH | Auth | SuperUser | Update modules | OK |
| `/api/system/activation-history` | GET | Auth | SuperUser | History | OK |

**Verdict: System routes are properly secured.**

---

## Auth (`server/routes/auth.ts`)

| Route | Method | Auth | Current AuthZ | Data Exposed | Recommended |
|-------|--------|------|---------------|--------------|-------------|
| `/api/auth/login` | POST | None | None | Returns JWT + user | OK |
| `/api/auth/logout` | POST | Auth | Any | Blocklists token | OK |
| `/api/auth/me` | GET | Auth | Any | Own user data | OK |
| `/api/auth/change-password` | POST | Auth | Any | Change own password | OK |
| `/api/auth/security-question` | POST | None | None | Returns security question | **⚠️ Exposes whether email exists** |
| `/api/auth/reset-password` | POST | None | Rate-limited | Resets password | **⚠️ Security question is same for all users** |

**Verdict: Auth routes have design weaknesses (identical security questions, email enumeration) but are functionally correct. Not in scope for this phase.**

---

## Deploy (`server/routes/deploy.ts`)

| Route | Method | Auth | Current AuthZ | Data Exposed | Recommended |
|-------|--------|------|---------------|--------------|-------------|
| `/api/deploy` | POST | **None** | HMAC signature | Triggers deployment | OK — webhook pattern |

---

## Health/Stats (`server/index.ts`)

| Route | Method | Auth | Current AuthZ | Data Exposed | Recommended |
|-------|--------|------|---------------|--------------|-------------|
| `/api/health` | GET | **None** | None | Status timestamp | OK — health check |
| `/api/health/stats` | GET | **None** | **None** ⚠️ | User counts, eval counts, periods | **Must require auth** |

---

## Copilot (`server/copilot/index.ts`)

| Route | Method | Auth | Current AuthZ | Data Exposed | Recommended |
|-------|--------|------|---------------|--------------|-------------|
| All `/api/copilot/*` | Various | Auth + SuperUser | SuperUser + module check | AI chat, config | OK — properly locked to SuperUser |

**Verdict: Copilot is properly secured at the route level (access control). The SQL injection risk in the analyze tool is a separate concern.**

---

## Summary of Gaps

| Severity | Count | Routes |
|----------|-------|--------|
| **Critical** — Any user can read/write any evaluation | 6 | evaluations GET/POST/PUT/PATCH×3 |
| **Critical** — Any user can approve any action plan/vacation | 3 | action-plans approve, vacations approve, objectives review |
| **High** — Any user can read all data in module | 6 | evaluations GET, objectives GET, action-plans GET, vacations GET, assignments GET, health/stats GET |
| **High** — Any user can create data for other users | 4 | objectives POST, vacations POST, action-plans POST, evaluations POST |
| **Medium** — Positional role check (socio) in CSV export | 1 | evaluations export CSV |

**Total routes missing authorization: 16**
**Total routes properly secured: 28**
