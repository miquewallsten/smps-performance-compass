# SMPS PERFORMANCE COMPASS — REGRESSIONS & PERIOD AUDIT

Generated: 2026-06-01

---

# CRITICAL FINDING: Period Transition Makes App Appear Empty

## Problem

Today is June 1, 2026. The period **2026-H2** starts today (`self_start: 2026-06-01`). 

The `useCurrentPeriod` hook resolves the "current period" by:
1. Finding a period where `now >= selfStart && now <= actionPlanEnd`
2. Falling back to the most recent started period

With 2026-H2 starting today, the system will select **2026-H2** as the current period. However, **2026-H2 has NO data** — no evaluations, no assignments, no action plans, no objectives.

### Impact

| Component | What Happens | Severity |
|-----------|-------------|----------|
| Dashboard | Shows zeros for all KPIs, empty pending actions | 🔴 Critical |
| Evaluations page | No evaluations for 2026-H2 | 🔴 Critical |
| Org Chart | No assignments for 2026-H2 → empty org chart | 🔴 Critical |
| Self Evaluation | No self-eval exists for 2026-H2, shows fresh form | ✅ Correct behavior |
| My Profile | No evaluation data for 2026-H2 | 🟡 Moderate |
| Reports | Empty charts/tables for 2026-H2 | 🟡 Moderate |
| Score Analysis | Empty for 2026-H2 | 🟡 Moderate |
| My Action Plan | No plans for 2026-H2 | ✅ Correct behavior |
| Personal Objectives | No objectives for 2026-H2 | ✅ Correct behavior |
| Vacations | Not period-dependent, works fine | ✅ Working |
| Notifications | Not period-dependent, works fine | ✅ Working |
| Layout sidebar | `pendingEvalCount` shows 0 | 🟡 Moderate |

### Root Cause Analysis

The `useCurrentPeriod` hook in `src/hooks/useCurrentPeriod.ts`:

```typescript
// 1. Find a period where we're within its overall range (selfStart → actionPlanEnd)
const current = periodsData.find((p: any) => {
  const overallStart = new Date(p.selfStart || p.self_start);
  const overallEnd = new Date(p.actionPlanEnd || p.action_plan_end || ...);
  return now >= overallStart && now <= overallEnd;
});
```

This is technically **correct** — 2026-H2 IS the current period. The problem is that the UI doesn't gracefully handle the transition between periods where a new period has started but has no data yet.

### Recommendation

The system should:

**Option A (Recommended): Use the current period for new activities, but display historical data from the most recent completed period for read-only views.**

This means:
- Dashboard, Reports, Score Analysis should fall back to showing the most recent period with data when the current period has none
- Self-eval, action plans, objectives should use the current period (2026-H2) for creating new records
- Assignments page should allow creating new assignments for 2026-H2
- Period selector should be available on all data-heavy pages, defaulting to the current period but allowing manual selection

**Option B: Add a "period with data" fallback.**

When the current period has no data, show a banner explaining the transition and default analytics views to the previous period while keeping forms/creation for the current period.

---

# OTHER REGRESSIONS FOUND

## Regression #1: Vacation Config API Requires Admin, But Vacations Page Calls It For All Users

**File:** `server/routes/vacations.ts` line 227

**Issue:** `GET /api/vacations/config` has `requireAdmin` middleware, but the Vacations page (`src/pages/Vacations.tsx`) calls `useVacationConfig()` unconditionally for all users to display vacation day allowances.

**Impact:** Non-admin users see a 403 error in the console when loading the Vacations page. The vacation day display may show "0 days" because the API call fails silently.

**Root Cause:** The `useVacationConfig` hook calls `/api/vacations/config` which requires admin, but all users need to see their vacation day allowance.

**Fix:** Change the route to allow all authenticated users to read vacation config (but keep write operations admin-only), OR create a separate endpoint `/api/vacations/my-allowance` that returns just the current user's allowance.

## Regression #2: Evaluation Period Selector Default is Current Period

**Files:** `Evaluations.tsx`, `ScoreAnalysis.tsx`, `MyActionPlan.tsx`, `PersonalObjectives.tsx`, `MyProfile.tsx`, `AssignSupervisors.tsx`, `Settings.tsx`

**Issue:** Multiple pages initialize `viewPeriod` or `period` state with `useCurrentPeriod()` which now returns `2026-H2`. Users who want to see 2026-H1 data must manually change the period selector. This is correct behavior but may confuse users who expect to see their previous data on first load.

**Severity:** 🟡 Moderate — Users can switch, but the default view is empty.

## Regression #3: Analytics Overview Has No Fallback for Empty Periods

**File:** `server/routes/analytics.ts` — `GET /api/analytics/overview`

**Issue:** When querying analytics for a period with no data (like 2026-H2), the `analytics_period_summary` table has no entry. The fallback live-query path works but returns zeros for everything.

**Impact:** Dashboard shows all zeros — 0 employees evaluated, 0% completion, null average score.

**Fix:** The dashboard should detect "no data" for the current period and show a transitional state, or fall back to the previous period's data for comparison.

## Regression #4: `useVacationRequests` Returns Array But No Extra Days

**File:** `src/pages/Vacations.tsx` line 26

**Issue:** `extraVacationDaysData` is assigned from `useVacationRequests()` (which fetches vacation requests, not extra days). The `extraVacationDays` array is hardcoded to `[]`. There's no API hook or endpoint to fetch extra vacation days for a specific user.

**Impact:** Extra vacation days granted by admins are never displayed in the UI, making vacation day calculations incorrect.

**Fix:** Create a `useExtraVacationDays` hook that calls a new endpoint `GET /api/vacations/extra-days` or add extra days data to the existing vacation requests response.

## Regression #5: Layout Calls `useVacationRequests()` Without Period Filter

**File:** `src/components/Layout.tsx` line 46

**Issue:** `useVacationRequests()` fetches ALL vacation requests across all periods. The sidebar vacation count badge should only count pending requests relevant to the current period or the current user.

**Severity:** 🟡 Low — Extra data loaded but not visible to user since it's filtered client-side.

## Regression #6: Settings Page Shows Empty Evaluation Detail

**File:** `src/pages/Settings.tsx`

**Issue:** The Settings page shows evaluation details for `selectedPeriod` (defaults to `currentPeriod`), but the `renderEvalDetail` function uses `const questions = [];` (empty array) instead of fetching the template questions for the evaluation's position. This means the detailed evaluation view always shows empty categories.

**Severity:** 🟡 Moderate — Users can't see their question-by-question breakdown in Settings.

**Fix:** Use `useFullTemplate` or `useTemplateQuestions` to load the correct template questions for the evaluation's position.

---

# PERIOD SYSTEM AUDIT (Phase 6)

## How Periods Are Selected

### `useCurrentPeriod` Hook (`src/hooks/useCurrentPeriod.ts`)

1. Fetches all period configs from `GET /api/periods`
2. Finds the period where `now >= selfStart && now <= actionPlanEnd`
3. Falls back to the most recent started period

### Current Period Configs in DB

| Period | self_start | self_end | supervisor_start | supervisor_end | feedback_start | feedback_end | action_plan_start | action_plan_end |
|--------|------------|----------|-----------------|---------------|---------------|-------------|-------------------|-----------------|
| 2025-H2 | 2025-06-01 | 2025-07-15 | 2025-07-16 | 2025-09-01 | 2025-09-02 | 2025-10-15 | 2025-10-16 | 2025-11-30 |
| 2026-H1 | 2025-12-01 | 2026-01-15 | 2026-01-16 | 2026-03-01 | 2026-03-02 | 2026-04-15 | 2026-04-16 | 2026-05-31 |
| 2026-H2 | 2026-06-01 | 2026-07-15 | 2026-07-16 | 2026-09-01 | 2026-09-02 | 2026-10-15 | 2026-10-16 | 2026-11-30 |

### On June 1, 2026:
- `2026-H2.self_start = 2026-06-01` → `now >= self_start` = TRUE
- `2026-H2.action_plan_end = 2026-11-30` → `now <= action_plan_end` = TRUE
- **Therefore: `useCurrentPeriod()` returns `2026-H2`**

### Period Usage Across Pages

| Page | Period Source | Default Value | Has Period Selector? | Behavior on Empty Period |
|------|-------------|---------------|---------------------|-------------------------|
| Dashboard | `useCurrentPeriod()` | 2026-H2 | No | Shows zeros |
| Self Evaluation | `useCurrentPeriod()` | 2026-H2 | No | Shows empty form (correct) |
| Evaluations | `useCurrentPeriod()` → `useState` | 2026-H2 | Yes (period dropdown) | Can switch to 2026-H1 |
| Reports | `useCurrentPeriod()` | 2026-H2 | No | Shows empty charts |
| Score Analysis | `useCurrentPeriod()` → `useState` | 2026-H2 | Yes (period dropdown) | Can switch to 2026-H1 |
| Org Chart | `useCurrentPeriod()` | 2026-H2 | No | Empty org chart |
| My Action Plan | `useCurrentPeriod()` → `useState` | 2026-H2 | Yes (period dropdown) | Can switch |
| Personal Objectives | `useCurrentPeriod()` → `useState` | 2026-H2 | Yes (period dropdown) | Can switch |
| Assign Supervisors | `useCurrentPeriod()` → `useState` | 2026-H2 | Yes (period dropdown) | Can create new assignments |
| My Profile | `useCurrentPeriod()` → `useState` | 2026-H2 | Yes (period dropdown) | Can switch |
| Settings | `useCurrentPeriod()` → `useState` | 2026-H2 | Yes (period dropdown) | Can switch |
| Vacations | `useCurrentPeriod()` | 2026-H2 | No (vacations not period-based) | Works fine |

### Recommendation

**The correct behavior is to use the current period (2026-H2) as the default.** This is by design — new evaluations, assignments, etc. should be created for the current period.

However, pages that display historical data (Dashboard, Reports, Org Chart, Score Analysis) should:

1. Detect when the current period has no data
2. Show a transitional banner: "Período 2026-H2 iniciado. No hay datos aún. Mostrando datos de 2025-H2."
3. Fall back to the previous period for analytics display while keeping the current period for creation forms

---

# AUTHORIZATION AUDIT (Phase 7)

## Role Definitions

| Role | DB Fields | Can See | Notes |
|------|-----------|---------|-------|
| **super_user** | `is_super_user = 1` | Everything | System-level admin, Access Control page |
| **admin** | `is_admin = 1` | All users, all data | Can manage users, evaluations, etc. |
| **socio** | `position = 'socio'` or `'salary_partner'` | All except other socios' evaluations | Treated as high-level read access |
| **managing_partner** | `is_managing_partner = 1` | Everything | Socio Administrador — same access as admin |
| **supervisor** | Has assignments in `supervisor_assignments` | Own data + supervisees' data | Role-based via assignment, not DB field |
| **employee** | Default | Own data only | Can only see own evaluations, vacations, etc. |

## Authorization Check Results

| Endpoint | Employee | Supervisor | Admin | Socio | Super User | Status |
|----------|----------|------------|-------|-------|------------|--------|
| `GET /api/users` | ❌ 403 | ❌ 403 | ✅ All users | ✅ All users | ✅ All users | ✅ Working |
| `GET /api/users/:id` | ✅ Self only | ✅ Self + supervisees | ✅ Any | ✅ Any | ✅ Any | ✅ Working |
| `POST /api/users` | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ Working |
| `GET /api/evaluations` | ✅ Own + supervisees | ✅ Own + supervisees | ✅ All | ✅ All (except other socios) | ✅ All | ✅ Working |
| `GET /api/assignments` | ✅ Own | ✅ Own + supervisees | ✅ All | ✅ All | ✅ All | ✅ Working |
| `GET /api/evaluations/export/csv` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ Working |
| `GET /api/action-plans` | ✅ Own | ✅ Own + supervisees | ✅ All | ✅ All | ✅ All | ✅ Working |
| `POST /api/action-plans` | ✅ Own | ✅ Supervisee | ✅ Any | ✅ Any | ✅ Any | ✅ Working |
| `POST /api/action-plans/:id/approve` | ❌ | ✅ If supervisor | ✅ | ✅ | ✅ | ✅ Working |
| `GET /api/objectives` | ✅ Own | ✅ Own + supervisees | ✅ All | ✅ All | ✅ All | ✅ Working |
| `GET /api/vacations/requests` | ✅ Own | ✅ Own + supervisees | ✅ All | ✅ All | ✅ All | ✅ Working |
| `GET /api/analytics/overview` | ✅ Own | ✅ Own + supervisees | ✅ All | ✅ All | ✅ All | ✅ Working |
| `GET /api/notifications` | ✅ Own | ✅ Own | ✅ Own | ✅ Own | ✅ Own | ✅ Working |
| `GET /api/notifications/pending-actions` | ✅ Own | ✅ Own | ✅ Own | ✅ Own | ✅ Own | ✅ Working |

## Visibility Filter (Frontend)

| Page | Filter | Status |
|------|--------|--------|
| Evaluations | `canViewUserEvaluations` + assignment-based | ✅ Working |
| Dashboard | Analytics API (role-filtered) | ✅ Working |
| Org Chart | Admin/socio/super_user only | ✅ Working |
| Reports | Analytics API (role-filtered) | ✅ Working |
| Score Analysis | Admin/socio/super_user only | ✅ Working |
| User Management | Admin/super_user only | ✅ Working |
| Access Control | Super_user only | ✅ Working |

---

# ISSUES SUMMARY

| # | Issue | Root Cause | Severity | Fix Required |
|---|-------|-----------|----------|-------------|
| 1 | App appears empty when new period starts | `useCurrentPeriod` returns 2026-H2 which has no data | 🔴 Critical | Add period transition handling |
| 2 | Vacation config 403 for non-admin | `GET /api/vacations/config` requires admin | 🟡 Moderate | Remove admin requirement or add user endpoint |
| 3 | Settings page empty evaluation detail | `renderEvalDetail` uses empty questions array | 🟡 Moderate | Use `useFullTemplate` or `useTemplateQuestions` |
| 4 | Extra vacation days not displayed | No API hook for extra days, hardcoded empty array | 🟡 Moderate | Add endpoint + hook |
| 5 | Analytics pages show zeros for empty period | No fallback to previous period | 🟡 Moderate | Add fallback logic |
| 6 | Layout loads all vacation requests | No period filter on vacation requests | 🟢 Low | Not user-visible bug |


---

## REGRESSIONS FOUND AND FIXED — Session 2 (2026-06-01)

### Bug #1: Notifications API — LIMIT/OFFSET MySQL Error (CRITICAL)

**File:** `server/routes/notifications.ts` (line 41-42)  
**Root Cause:** MySQL prepared statements (`pool.execute`) do not accept `LIMIT ?` and `OFFSET ?` as bind parameters. This caused `ER_WRONG_ARGUMENTS` errors.  
**Fix:** Changed from parameterized `LIMIT ? OFFSET ?` to inline `${limit} OFFSET ${offset}` since these are validated integers.  
**Severity:** 🔴 Critical — Notifications page and notification bell completely broken.

### Bug #2: Timeline API — LIMIT/OFFSET MySQL Error (CRITICAL)

**File:** `server/routes/timeline.ts` (line 69-70)  
**Root Cause:** Same as Bug #1.  
**Fix:** Same approach — inline validated integer values.  
**Severity:** 🔴 Critical — User timeline endpoint returned 500 error.

### Bug #3: Vacation Requests — Unknown Column 'period' (CRITICAL)

**File:** `server/routes/vacations.ts` (line 68)  
**Root Cause:** `vacation_requests` table does not have a `period` column, but the INSERT tried to use it.  
**Fix:** Removed `period` from the INSERT statement. Frontend still sends it but backend ignores it.  
**Severity:** 🔴 Critical — Creating vacation requests always failed.

### Bug #4: Action Plans — Missing Required Column 'category' (CRITICAL)

**File:** `server/routes/action-plans.ts` (lines 74, 130)  
**Root Cause:** `smart_action_items` table has NOT NULL columns `category` and `description` without defaults, but INSERT didn't include them.  
**Fix:** Added `category` and `description` columns to INSERT statements with defaults.  
**Severity:** 🔴 Critical — Creating action plans always failed.

### Bug #5: Analytics Overview — Inconsistent Response Format (MODERATE)

**File:** `server/routes/analytics.ts` (line 67)  
**Root Cause:** Cached analytics data used snake_case column names while live-computed data used camelCase. Frontend expects consistent format.  
**Fix:** Normalized cached response to map snake_case to camelCase.  
**Severity:** 🟡 Moderate — Dashboard showed inconsistent data structures.

### Bug #6: Extra Vacation Days — Unknown Column 'added_at' (MODERATE)

**File:** `server/routes/vacations.ts` (line 298)  
**Root Cause:** Table has `created_at` but INSERT used `added_at`.  
**Fix:** Changed `added_at` to `created_at`.  
**Severity:** 🟡 Moderate — Adding extra vacation days failed.

### Bug #7: extra_vacation_days Table Missing 'period' Column (MODERATE)

**Root Cause:** Migration defines `period` column but it wasn't present in the actual table.  
**Fix:** ALTER TABLE to add `period VARCHAR(50) DEFAULT NULL`.  
**Severity:** 🟡 Moderate — Extra vacation days couldn't be filtered by period.
