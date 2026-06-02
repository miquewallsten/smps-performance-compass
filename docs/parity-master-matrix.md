# SMPS Parity Master Matrix

**Date:** 2026-06-01  
**Method:** Side-by-side comparison of original ZIP (`/tmp/smps-original/`) vs current codebase + production API testing

---

## PAGE-BY-PAGE COMPARISON

### 1. Login

| Aspect | Original | Current | Match? | Notes |
|--------|----------|---------|--------|-------|
| Login form | Email + password | Email + password | ✅ YES | Identical |
| Password reset | Security question flow (email → question → answer → new password) | Email-based reset (separate /forgot-password and /reset-password pages) | ⚠️ DIFFERENT | Original used security questions; current uses email tokens. SMTP not configured so email reset doesn't work. Legacy security question endpoints still exist in backend. |
| Account activation | Not present (users created with passwords) | New /activate-account flow with token | ➕ NEW | Improvement, but SMTP must work for this to function |
| Error messages | Spanish error messages | Spanish error messages | ✅ YES | |
| Logout | Yes | Yes | ✅ YES | |

### 2. Dashboard

| Aspect | Original | Current | Match? | Notes |
|--------|----------|---------|--------|-------|
| Period label | Hardcoded CURRENT_PERIOD | Dynamic from DB via useCurrentPeriod() | ✅ YES | Current is better |
| Total employees count | Computed from users.filter(u => u.isActive && !u.isSuperUser) | From analytics API (overview.totalEmployees) | ✅ YES | Same result |
| Self-eval status | Computed from periodEvals.find | From analytics (selfEvalCompleted) | ✅ YES | |
| Supervisor eval status | Computed from assignments + evals | From analytics (supervisorEvalCompleted) | ✅ YES | |
| My pending evaluations | Listed with "Evaluar" button | Listed with quick action links | ✅ YES | |
| Employee list by hierarchy | YES - expandable cards by Legal/Administrativo by position | NO - only shows aggregate metrics | ❌ NO | **REGRESSION**: Employee-by-employee status view is missing |
| Average score | Computed locally from relevantEvals | From analytics (avgOverallScore) | ✅ YES | |
| Period transition | No fallback | Falls back to previous period if current has no data | ➕ IMPROVEMENT | |
| Notification badge | Not present | Present | ➕ NEW | |

### 3. Self Evaluation

| Aspect | Original | Current | Match? | Notes |
|--------|----------|---------|--------|-------|
| Questions source | Hardcoded `getQuestionsForUser()` | API `useFullTemplate(position, practiceArea)` | ✅ YES | Same questions, DB-driven |
| Section weights | Hardcoded `getSectionWeights()` | DB-driven `getSectionWeights()` | ✅ YES | Same values |
| Practice area filtering | `getTechnicalQuestions(position, practiceArea)` | API filters tecnico by practiceArea | ✅ YES | |
| Score calculation | `calculateScore()` from hardcoded | `calculateScore()` from evaluationConfig | ✅ YES | Formula identical |
| NA handling | Yes | Yes | ✅ YES | |
| Sin Elementos handling | Yes | Yes | ✅ YES | |
| Comments required | Yes (300 word max) | Yes (300 word max) | ✅ YES | |
| Confirm modal | Yes | Yes | ✅ YES | |
| Draft saving | Not present | localStorage draft saving | ➕ NEW | |
| Period | Hardcoded CURRENT_PERIOD | useCurrentPeriod() hook | ✅ YES | |

### 4. Evaluations (Supervisor)

| Aspect | Original | Current | Match? | Notes |
|--------|----------|---------|--------|-------|
| View evaluations | Period-based view with history filter | Period-based view with history filter | ✅ YES | |
| Supervisor evaluation form | Uses `getQuestionsForUser()` for selected employee | Uses `useFullTemplate(employee.position, employee.practiceArea)` | ✅ YES | |
| Practice area filtering | Applied in `getQuestionsForUser()` | Applied in frontend filter of tecnico questions | ✅ YES | Fixed |
| NA approval | Yes | Yes (with dedicated endpoint) | ✅ YES | |
| Sin Elementos | Yes | Yes | ✅ YES | |
| Action plan modal | Yes | Yes | ✅ YES | |
| Visibility rules | `canViewUserEvaluations()` + `myAssignments` | Same logic + server-side `filterEvaluationsForUser()` | ✅ YES | |
| CSV export | Not present | Present | ➕ NEW | |
| Phase stepper | Not present | Present | ➕ NEW | |

### 5. Evaluation Viewer (Detail)

| Aspect | Original | Current | Match? | Notes |
|--------|----------|---------|--------|-------|
| Shows questions | Uses `QUESTIONS_BY_POSITION[evaluated.position]` | Uses `useTemplateQuestions()` filtered by position + practiceArea | ✅ YES | |
| Practice area filtering | Applied via `getQuestionsForUser()` | Applied in frontend by practiceArea | ✅ YES | |
| Score display | Badge with percentage | ScoreBadge component | ✅ YES | |
| NA display | Shows NA + approval buttons | Same | ✅ YES | |
| Sin Elementos display | Shows "Sin Elementos" | Same | ✅ YES | |
| Supervisor comments | Editable by supervisor | Same | ✅ YES | |
| Action plan link | Shows action plans | Same | ✅ YES | |

### 6. Users / User Management

| Aspect | Original | Current | Match? | Notes |
|--------|----------|---------|--------|-------|
| User list | All users visible to admin/socio | Same + server-side authorization | ✅ YES | |
| Employee evaluations button | "Evaluations" link in user list | Same | ✅ YES | |
| Create user | With password | With activation flow | ➕ DIFFERENT | Better security but SMTP required |
| Practice area | Select with PRACTICE_AREA_LABELS | DB-driven work areas | ✅ YES | |
| Assign supervisors | Yes | Yes | ✅ YES | |

### 7. Org Chart

| Aspect | Original | Current | Match? | Notes |
|--------|----------|---------|--------|-------|
| Hierarchy display | By Legal/Administrativo groups | Same via getLegalHierarchy/getAdminHierarchy | ✅ YES | |
| Supervisor cards | Expandable, showing team members | Same | ✅ YES | |
| Access control | Admin/socio/super_user only | Same + managing_partner | ✅ YES | |
| Period | Hardcoded CURRENT_PERIOD | useCurrentPeriod() | ✅ YES | |

### 8. Reports

| Aspect | Original | Current | Match? | Notes |
|--------|----------|---------|--------|-------|
| Completion pie chart | Yes | Yes (from analytics) | ✅ YES | |
| Stage bar chart | Yes (self/supervisor/feedback/action) | Yes (self/supervisor only) | ⚠️ PARTIAL | Feedback and action plan stages missing from chart |
| Score by position | Yes | Yes (from analytics) | ✅ YES | |
| Area filter | Yes (all/legal/administrativo) | **NO** | ❌ NO | **REGRESSION** |
| Self-eval by position | Yes | Missing from current reports | ❌ NO | **REGRESSION** |
| Supervisor eval by position | Yes | Missing from current reports | ❌ NO | **REGRESSION** |
| Trend chart | Not present | Present | ➕ NEW | |

### 9. Settings

| Aspect | Original | Current | Match? | Notes |
|--------|----------|---------|--------|-------|
| Password change | Yes (with security question) | Yes (without security question) | ✅ YES | |
| My evaluations detail | Uses `QUESTIONS_BY_POSITION` with hardcoded | Uses `useFullTemplate()` from DB | ✅ YES | |
| Period selector | Dropdown of PERIODS | Dropdown from DB | ✅ YES | |

### 10. Period Config

| Aspect | Original | Current | Match? | Notes |
|--------|----------|---------|--------|-------|
| Period CRUD | Yes (CRUD) | Yes (CRUD) | ✅ YES | |
| Period dates | selfStart, selfEnd, supervisorStart, etc. | Same fields | ✅ YES | |

### 11. Vacations

| Aspect | Original | Current | Match? | Notes |
|--------|----------|---------|--------|-------|
| Vacation requests | Yes | Yes | ✅ YES | |
| Approvals | Yes | Yes | ✅ YES | |
| Extra days | Yes | Yes | ✅ YES | |

### 12. Objectives

| Aspect | Original | Current | Match? | Notes |
|--------|----------|---------|--------|-------|
| Personal objectives | Yes (legal/admin split) | Yes | ✅ YES | |

### 13. Action Plans

| Aspect | Original | Current | Match? | Notes |
|--------|----------|---------|--------|-------|
| Create/approve | Yes | Yes | ✅ YES | |

### 14. Copilot

| Aspect | Original | Current | Match? | Notes |
|--------|----------|---------|--------|-------|
| Chat | Yes | Yes | ✅ YES | |
| Analytics access | Unrestricted | Restricted by role | ➕ IMPROVEMENT | |

### 15. Authentication Flows

| Aspect | Original | Current | Match? | Notes |
|--------|----------|---------|--------|-------|
| Login | Email/password | Email/password | ✅ YES | |
| Password reset | Security questions | Email-based tokens | ⚠️ DIFFERENT | Email reset doesn't work without SMTP |
| Activation | N/A (password set at creation) | Token-based activation | ➕ NEW | Requires SMTP |
| Session | JWT | JWT + sessions table | ✅ YES | |
| Change password | Yes | Yes | ✅ YES | |

---

## REGRESSION SUMMARY

| # | Page/Feature | What's Missing | Severity | Category |
|---|---------------|---------------|----------|----------|
| R01 | Dashboard | Per-employee status table grouped by Legal/Admin | MEDIUM | H - Missing implementation |
| R02 | Reports | Area filter (all/legal/administrativo) | MEDIUM | A - Frontend bug |
| R03 | Reports | Self-eval by position chart | LOW | A - Frontend bug |
| R04 | Reports | Supervisor eval by position chart | LOW | A - Frontend bug |
| R05 | Login | Password reset via email doesn't work (no SMTP) | HIGH | F - Migration bug |
| R06 | Historical Data | 160 eval_responses have question_text=NULL and weight=1 | MEDIUM | G - Data corruption |
| R07 | Historical Data | 75 eval_responses have category="Sin Clasificar" | LOW | G - Data corruption |
| R08 | Users | Some practice_area values use old format | LOW | G - Data corruption |
| R09 | Users | Test user "Prueba Martha" still active | LOW | G - Data corruption |

---

## WHAT WORKS CORRECTLY

1. ✅ Login/logout
2. ✅ Evaluation scoring formula
3. ✅ Section weights (all 14+ positions match original)
4. ✅ Template questions (all 290 questions present with correct text)
5. ✅ Practice area filtering (corporativo, consultoría fiscal, litigio fiscal)
6. ✅ Supervisor assignments
7. ✅ Visibility rules
8. ✅ Self-evaluation flow
9. ✅ Supervisor evaluation flow
10. ✅ NA / Sin Elementos handling
11. ✅ Period system (DB-driven)
12. ✅ Org chart
13. ✅ User management
14. ✅ Vacations
15. ✅ Objectives
16. ✅ Action plans
17. ✅ Settings
18. ✅ Authorization (server-side)
