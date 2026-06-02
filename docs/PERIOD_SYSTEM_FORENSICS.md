# SMPS PERIOD SYSTEM FORENSICS

**Date:** 2026-06-02  
**Investigation only — no code changes to period system**

---

## PART C: PERIOD FLOW TRACE

### Period Resolution Engine

```
useCurrentPeriod() → usePeriods() → GET /api/periods
                                ↓
                          periodsData from DB
                                ↓
                    ┌───────────┴───────────┐
                    │ 1. Date range match?   │
                    │   now ∈ [selfStart,    │
                    │          actionPlanEnd]│
                    │   → return matched     │
                    └───────────┬───────────┘
                                │ no match
                    ┌───────────┴───────────┐
                    │ 2. Most recent started │
                    │   selfStart ≤ now      │
                    │   → return latest      │
                    └───────────────────────┘
```

On June 1, 2026:
- 2026-H2: selfStart=2026-06-01, actionPlanEnd=2026-11-30
- now (2026-06-01) IS within [2026-06-01, 2026-11-30]
- **Result: 2026-H2**

---

### Per-Page Period Behavior

| Page | Period Source | Resolved Value | API Calls | Period Used in Query | Data Shown |
|------|--------------|----------------|-----------|---------------------|------------|
| **Dashboard** | `useCurrentPeriod()` | 2026-H2 | `useAnalyticsOverview(currentPeriod)` | 2026-H2 | 1 self-eval, 0 supervisor |
| | | | `useAnalyticsEvaluations(analyticsPeriod)` | 2026-H2* | Charts: 1 eval |
| | | | `usePendingActions(currentPeriod)` | 2026-H2 | Pending: empty |
| | | | `useEvaluations({period: currentPeriod})` | 2026-H2 | Raw evals: 1 |
| | | | `useAssignments(currentPeriod)` | 2026-H2 | Raw assignments: 1 |
| **Reports** | `useCurrentPeriod()` | 2026-H2 | `useEvaluations()` (ALL) | client-filter to 2026-H2 | Charts: 0 completions |
| | | | `useAssignments(currentPeriod)` | 2026-H2 | 1 assignment |
| | | | `useActionPlans()` (ALL) | client-filter to 2026-H2 | 0 plans |
| **Evaluations** | `useCurrentPeriod()` → `viewPeriod` state | 2026-H2 (default) | `useEvaluations()` (ALL) | client-filter to viewPeriod | 1 eval listed |
| | | | `useAssignments()` (ALL) | client-filter to currentPeriod | Assignments: 1 |
| **SelfEvaluation** | `useCurrentPeriod()` | 2026-H2 | `useEvaluations()` (ALL) | client-filter to currentPeriod | No existing self-eval |
| | | | `useAssignments()` (ALL) | client-filter to currentPeriod | Assignments: 1 |
| | | | `useActionPlans()` (ALL) | client-filter to currentPeriod | No plan |
| **OrgChart** | `useCurrentPeriod()` | 2026-H2 | `useAssignments(currentPeriod)` | 2026-H2 | 1 assignment shown |
| **Settings** | `useCurrentPeriod()` | 2026-H2 | `useEvaluations()` (ALL) | selectedPeriod state | History: minimal |
| **Assignments** | `useCurrentPeriod()` | 2026-H2 | `useAssignments(currentPeriod)` | 2026-H2 | 1 assignment |

*\*Dashboard analyticsPeriod uses previousPeriod fallback, but hasCurrentData check sees totalEmployees=13 > 0, so fallback to 2026-H1 never triggers.*

### Data Available Per Period

| Period | Self Evals | Supervisor Evals | Assignments | Users with Data |
|--------|-----------|-----------------|-------------|-----------------|
| 2026-H1 | 6 | 9 | 24 | 10 |
| 2026-H2 | 1 | 0 | 1 | 2 |
| 2025-H2 | 1 | 0 | 0 | 1 |

---

### Dashboard Fallback Analysis

```typescript
const { data: overview } = useAnalyticsOverview(currentPeriod);  // 2026-H2
const hasCurrentData = overview && (overview.totalEmployees > 0 || overview.selfEvalCompleted > 0);
```

`analytics_period_summary.total_employees` is populated via:
```sql
SELECT COUNT(*) FROM users WHERE is_active = 1 AND is_super_user = 0
```
This is a **global count** (always 13), NOT period-scoped.

Therefore:
- 2026-H2 analytics: `totalEmployees=13, selfEvalCompleted=1`
- `hasCurrentData` = (13 > 0) = **TRUE** → fallback NEVER triggers
- Analytics period stays at 2026-H2

**The fallback logic is effectively dead code** because `totalEmployees` is always ≥ 13 for all periods.

---

## PART D: PERIOD DECISION DOCUMENT

### Q1: Should default period be A) current calendar period or B) most recent period with data?

**Current state:** A — current calendar period (2026-H2 on June 1, 2026)

**Analysis:**

| Approach | Pros | Cons |
|----------|------|------|
| A — Calendar | Correct during active eval window, predictable, matches period config dates | Confusing during transitions (empty screens), users must manually switch |
| B — Data-driven | Shows most relevant data immediately, smooth UX | Could mask period transition issues, unclear when to show "new period" |

**Recommendation: HYBRID** — Use calendar period but fall back to data-driven when current period is clearly empty (no evaluations at all). The fallback already exists but is broken by the global totalEmployees count.

---

### Q2: What exact screens depend on current calendar period?

| Screen | Depends on calendar period? | Why |
|--------|----------------------------|-----|
| **SelfEvaluation** | YES — to know which period the user should submit for | Users must self-evaluate for the currently active period |
| **Evaluations** (create) | YES — new evaluations are saved under current period | Supervisors evaluate employees for the active period |
| **Dashboard** | PARTIAL — shows pending actions for current period | Pending evaluations are period-specific |
| **OrgChart** | PARTIAL — shows assignments for current period | Org chart reflects current period structure |

---

### Q3: What exact screens depend on historical data?

| Screen | Depends on historical data? | Why |
|--------|---------------------------|-----|
| **Dashboard** (stats) | YES — completion rates, averages | Users want to see results from previous periods |
| **Reports** | YES — all charts | Reports summarize completed periods |
| **Evaluations** (view) | YES — viewPeriod selector | Users browse past evaluations |
| **Settings** | YES — evaluation history | Users check their own past evaluations |

---

### Q4: If we switch to "most recent period with data", what breaks?

1. **SelfEvaluation**: Users would submit self-evals against 2026-H1 (closed period) instead of 2026-H2 (current period). New evaluations would be created in the wrong period.
2. **Evaluations create**: Supervisor evaluations would be created for 2026-H1 instead of 2026-H2.
3. **Period confusion**: Users wouldn't know they're in a new evaluation period.
4. **Dashboard pending actions**: Would show 2026-H1 pending items that may be obsolete.

**Severity: HIGH.** Switching globally to data-driven period would break the evaluation workflow.

---

### Q5: If we keep current calendar period, what remains confusing?

1. **Dashboard appears empty** — 2026-H2 has 1 evaluation vs 2026-H1's 15
2. **Reports show no data** — 0 completions across all stages for 2026-H2
3. **OrgChart shows 1 assignment** — looks like the organization is incomplete
4. **Users must manually switch** to 2026-H1 via period selector (available on Evaluations page, but NOT on Dashboard or Reports)
5. **Period label says "2026-H2"** — users don't understand why they see "empty" data

**Severity: MEDIUM.** Confusing UX but technically correct behavior.

---

### RECOMMENDATION

**Do NOT change `useCurrentPeriod()` to be data-driven.** This would break evaluation creation.

**Instead, fix Dashboard and Reports to be smarter about WHICH period they display for analytics/statistics:**

1. **Dashboard analytics cards**: Show data for the most recent period WITH completed evaluations (not necessarily current period). Keep pending actions and per-employee status for current period.

2. **Reports**: Default to the most recent period with data, or show a clear "Period: 2026-H2 (Aún sin datos)" message with a one-click switch to 2026-H1.

3. **Evaluations**: Keep current behavior — default to current period for creation, with period selector for viewing history.

4. **Fix the Dashboard fallback**: Change `hasCurrentData` check from `totalEmployees > 0` to `selfEvalCompleted > 0 || supervisorEvalCompleted > 0`.

**Files affected:**
- `src/pages/Dashboard.tsx` — fix fallback check (line 43)
- `src/pages/Reports.tsx` — could default to period with most data
- `server/routes/analytics.ts` — make total_employees period-scoped (line 57)

**Files NOT changed:**
- `src/hooks/useCurrentPeriod.ts` — keep current behavior
- Evaluation creation/submission — keep current behavior

