# Phase 4C — Final Authorization + Authentication Cleanup Verification

**Date:** 2026-06-01
**Commit:** 1ccbe88
**Status:** DEPLOYED TO PRODUCTION

---

## 1. Files Modified

| File | Change |
|------|--------|
| `server/routes/users.ts` | Added `hasRole`, `normalizeRole`, `isSupervisorOf` imports. GET `/` restricted to super_user/admin/socio (employee → 403). GET `/:id` restricted to self + direct supervisor + admin/super_user/socio (unrelated → 403). All denials logged. |
| `server/routes/assignments.ts` | Added `hasRole`, `normalizeRole`, `getSuperviseeIds`, `auditLog` imports. GET `/` filtered by role: admin/socio see all, supervisor sees supervisee assignments, employee sees own assignments. |
| `server/routes/timeline.ts` | Added `hasRole`, `normalizeRole`, `isSupervisorOf`, `auditLog` imports. `canAccessTimeline` now async, includes supervisor + socio access. Denials logged. |
| `server/routes/system.ts` | Added `hasRole`, `normalizeRole`, `auditLog` imports. GET `/status` restricted to super_user/admin only. Socio/employee → 403 with audit log. |

---

## 2. Authorization Matrix

### GET /api/users (list all users)

| Role | Access | HTTP |
|------|--------|------|
| super_user | ✅ All users | 200 |
| admin | ✅ All users | 200 |
| socio | ✅ All users | 200 |
| employee | ❌ Denied | 403 |

### GET /api/users/:id (individual profile)

| Role | Self | Supervisor of | Supervisee of | Unrelated |
|------|------|---------------|---------------|-----------|
| super_user | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ |
| socio | ✅ | ✅ | ✅ | ✅ |
| employee | ✅ | ✅ | ✅ | ❌ 403 |

### GET /api/assignments

| Role | Access |
|------|--------|
| super_user | All assignments |
| admin | All assignments |
| socio | All assignments (read-only) |
| supervisor | Assignments involving direct supervisees |
| employee | Assignments involving themselves |

### GET /api/users/:id/timeline

| Role | Self | Supervisor of | Supervisee of | Unrelated |
|------|------|---------------|---------------|-----------|
| super_user | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ |
| socio | ✅ | ✅ | ✅ | ✅ |
| employee | ✅ | ✅ | ✅ | ❌ 403 |

### GET /api/system/status

| Role | Access | HTTP |
|------|--------|------|
| super_user | ✅ | 200 |
| admin | ✅ | 200 |
| socio | ❌ | 403 |
| employee | ❌ | 403 |

---

## 3. Verification Results

All tests run against production at `https://smps.bowdot.online` using employee account `smorales@smps.com`.

| # | Test | Expected | Actual | Status |
|---|------|----------|--------|--------|
| 1 | Employee → GET /api/users | 403 | 403 "Insufficient permissions" | ✅ PASS |
| 2 | Employee → GET own profile (/api/users/:id) | 200 | 200 with profile data | ✅ PASS |
| 3 | Employee → GET unrelated profile (atorres) | 403 | 403 "Access denied" | ✅ PASS |
| 4 | Employee → GET supervisor profile (rdominguez) | 200 | 200 with profile data | ✅ PASS |
| 5 | Employee → GET supervisee profile (jparedes/gortiz) | 200 | 200 | ✅ PASS |
| 6 | Employee → GET unrelated timeline (atorres) | 403 | 403 "Access denied" | ✅ PASS |
| 7 | Employee → GET supervisee timeline (jparedes) | 200 | 200 with timeline data | ✅ PASS |
| 8 | Employee → GET /api/system/status | 403 | 403 "Admin access required" | ✅ PASS |
| 9 | Employee → GET /api/assignments (filtered) | Filtered | 9 assignments (own + supervisees) | ✅ PASS |

---

## 4. Audit Log Evidence

Four `authorization_denied` entries were created in `authentication_audit` during testing:

```
1. user: smorales (7169ed0b), resource: "GET /api/users", reason: "employee cannot list users"
2. user: smorales (7169ed0b), resource: "GET /api/users/:id", targetId: atorres, reason: "unrelated employee"
3. user: smorales (7169ed0b), resource: "GET /api/users/:id/timeline", targetId: atorres, reason: "unrelated employee"
4. user: smorales (7169ed0b), resource: "GET /api/system/status", reason: "non-admin access"
```

All entries include: `user_id`, `ip_address`, `user_agent`, `metadata` (with resource + reason), `created_at`.

---

## 5. SMTP Status

**STATUS: NOT CONFIGURED — STUB MODE ACTIVE**

```
SMTP_HOST=          (empty)
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=          (empty)
SMTP_PASS=          (empty)
SMTP_FROM="SMPS Performance <noreply@smps.bowdot.online>"
APP_URL=https://smps.bowdot.online
```

**Impact:**
- Activation emails are NOT sent. They are logged to console only.
- Password reset emails are NOT sent. They are logged to console only.
- Admin must manually share activation/reset links.
- No MX, SPF, DKIM, or DMARC records exist for `bowdot.online`.

**Action Required:** Configure Hostinger SMTP mailbox or alternative before disabling legacy endpoints.

---

## 6. Legacy Password Reset Status

**STATUS: REMAINS ACTIVE (SMTP not configured)**

| Endpoint | Status | Reason |
|----------|--------|--------|
| POST /api/auth/security-question | ✅ Active | SMTP not configured; disabling would lock users out of password recovery |
| POST /api/auth/reset-password (legacy) | ✅ Active | SMTP not configured; no email-based alternative available yet |

**Known Risk:** Security question = "What is your email?" with answer = email. Trivially exploitable. Must be disabled as soon as SMTP is configured and verified.

**Verification:**
```
POST /api/auth/security-question {"email":"smorales@smps.com"} → 200 {"securityQuestion":"¿Cuál es su correo electrónico?"}
POST /api/auth/reset-password (wrong answer) → 401 "Incorrect security answer"
```

---

## 7. Secret Rotation Status

| Secret | Status | Evidence |
|--------|--------|----------|
| JWT_SECRET | **NOT ROTATED** | Same value in `.env.production` since initial deployment. Was previously 644 permissions (now 600). Exposed in git history. |
| GitHub PAT (`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`) | **NOT ROTATED** | Still in `.git/config` remote URL on production server. Visible to anyone with SSH access. |
| Ollama API Key | **NOT ROTATED** | Still in plaintext in `.env.production`. Also stored in `copilot_config` table in database. |
| DEPLOY_WEBHOOK_SECRET | **UNKNOWN** | Uses default fallback `smps-deploy-webhook-2025` if `DEPLOY_WEBHOOK_SECRET` env var not set. Not found in `.env.production`. |

**File Permissions:**
```
-rw------- (600) /home/u906489923/domains/bowdot.online/nodejs/.env
-rw------- (600) /home/u906489923/domains/bowdot.online/nodejs/.env.production
```

---

## 8. Remaining Critical Findings

### CRITICAL

| # | Finding | Impact | Status |
|---|---------|--------|--------|
| 1 | **SMTP not configured** | Activation/password-reset emails not sent. Admin must manually share links. | BLOCKING |
| 2 | **GitHub PAT in .git/config** | Anyone with SSH access can read it and push to repo. | UNFIXED |
| 3 | **JWT_SECRET not rotated** | Exposed in git history and previous 644 permissions. | UNFIXED |
| 4 | **Legacy security question endpoints active** | Trivially exploitable (answer = email). | WAITING ON SMTP |

### HIGH

| # | Finding | Impact | Status |
|---|---------|--------|--------|
| 5 | **Ollama API key in plaintext** | Both in `.env.production` and `copilot_config` DB table. | UNFIXED |
| 6 | **Deploy webhook default secret** | Uses hardcoded fallback if env var not set. | UNFIXED |
| 7 | **No database backup automation** | Risk of data loss. | UNFIXED |

### MEDIUM

| # | Finding | Impact | Status |
|---|---------|--------|--------|
| 8 | **170 orphaned evaluation_responses** | Reference deleted question IDs. | UNFIXED |
| 9 | **4 test users in production** | prueba@smps.com, test123@bowdot.com, audit-test@smps.com, verify@test.com | UNFIXED |
| 10 | **Missing foreign keys** | Only 3 FKs in entire 39-table database. | UNFIXED |
| 11 | **Missing database indexes** | evaluation_responses.question_id and other critical indexes missing. | UNFIXED |
| 12 | **No snapshot integrity** | evaluation_responses only store question_id, not frozen text/weight. | UNFIXED |

---

## 9. Routes Still Without Fine-Grained Authorization

The following routes have `authMiddleware` but lack role-based or ownership-based fine-grained authorization. These are LOW priority because they expose reference/config data, not sensitive user data.

| Route | Method | Current Auth | Issue | Priority |
|-------|--------|--------------|-------|----------|
| GET /api/announcements | GET | authMiddleware only | Any user can see all announcements | Low (announcements are public by nature) |
| POST /api/announcements/:id/read | POST | authMiddleware only | Any user can mark announcements as read | Low |
| GET /api/evaluation-config/categories | GET | authMiddleware only | Config data visible to all | Low (reference data) |
| GET /api/evaluation-config/section-weights | GET | authMiddleware only | Config data visible to all | Low (reference data) |
| GET /api/evaluation-config/competencies | GET | authMiddleware only | Config data visible to all | Low (reference data) |
| GET /api/evaluation-config/template-questions | GET | authMiddleware only | Config data visible to all | Low (reference data) |
| GET /api/locations | GET | authMiddleware only | Location list visible to all | Low (reference data) |
| GET /api/periods | GET | authMiddleware only | Period list visible to all | Low (reference data) |
| GET /api/positions | GET | authMiddleware only | Position list visible to all | Low (reference data) |
| GET /api/work-areas | GET | authMiddleware only | Work areas visible to all | Low (reference data) |

**Note:** All write operations (POST, PATCH, DELETE, PUT) on these routes already require `requireAdmin`.

### Routes intentionally without authMiddleware:

| Route | Reason |
|-------|--------|
| GET /api/system/initialized | Must be public — used during first-time setup |
| POST /api/system/init | Must be public — used during first-time setup; guarded by "already initialized" check |
| POST /api/auth/login | Must be public — login |
| POST /api/auth/security-question | Must be public (for now) — password recovery |
| POST /api/auth/reset-password (legacy) | Must be public (for now) — password recovery |
| POST /api/auth/activate | Token-based auth — public by design |
| POST /api/auth/verify-activation | Token-based auth — public by design |
| POST /api/auth/resend-activation | Token-based auth — public by design |
| POST /api/auth/request-password-reset | Token-based auth — public by design |
| GET /api/auth/verify-reset-token | Token-based auth — public by design |
| POST /api/auth/complete-password-reset | Token-based auth — public by design |
| POST /api/deploy | Webhook — HMAC signature auth |
| GET /api/health | Health check — public by design |

---

## 10. Complete Route Authorization Map

### Previously Protected (Phase 4A + 4B)

| Route | Method | Authorization |
|-------|--------|-------------|
| GET /api/evaluations | GET | Filtered by role (employee=own+supervisees, admin/socio=all) |
| GET /api/evaluations/:id | GET | requireEntityAccess |
| POST /api/evaluations | POST | Owner or supervisor or admin |
| PUT /api/evaluations/:id | PUT | requireEntityAccess |
| PATCH /api/evaluations/:id/feedback | PATCH | requireSupervisorAction |
| PATCH /api/evaluations/:id/na-approval | PATCH | requireSupervisorAction |
| GET /api/action-plans | GET | Filtered by role |
| POST /api/action-plans | POST | Owner or supervisor or admin |
| PATCH /api/action-plans/:id | PATCH | requireEntityAccess |
| POST /api/action-plans/:id/approve | POST | requireSupervisorAction |
| GET /api/objectives | GET | Filtered by role |
| POST /api/objectives | POST | Self or supervisor |
| POST /api/objectives/:id/submit | POST | Self or supervisor |
| POST /api/objectives/:id/review | POST | Supervisor or admin (socio read-only) |
| GET /api/vacations/requests | GET | Filtered by role |
| PATCH /api/vacations/requests/:id | PATCH | Owner or supervisor |
| POST /api/vacations/requests/:id/approve | POST | Supervisor or admin |
| DELETE /api/vacations/requests/:id | DELETE | Owner+pending or admin |
| GET /api/health/stats | GET | admin/super_user only (4B) |
| Copilot (all routes) | ALL | super_user only (Phase 4B) |

### Newly Protected (Phase 4C)

| Route | Method | Authorization |
|-------|--------|-------------|
| GET /api/users | GET | super_user/admin/socio only (employee → 403) |
| GET /api/users/:id | GET | self + direct supervisor + admin/super_user/socio |
| GET /api/assignments | GET | Filtered by role |
| GET /api/users/:id/timeline | GET | self + direct supervisor + admin/super_user/socio |
| GET /api/system/status | GET | super_user/admin only |

---

## Deployment Confirmation

- **Build:** Successful (server.cjs 6.6MB, 63 frontend assets)
- **Git push:** `1ccbe88` pushed to main
- **Server rebuild:** esbuild completed on production
- **Passenger restart:** Triggered via `tmp/restart.txt`
- **Health check:** `GET /api/health` → 200 OK
- **Frontend assets:** 63 files uploaded via SCP
- **Verification tests:** 9/9 passed against production
