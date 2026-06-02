# SMPS Period Recovery Plan

**Date:** 2026-06-02
**Status:** INVESTIGATION COMPLETE — NO IMPLEMENTATION

---

## Period System Analysis

### Production Periods

| Period | Self Start | Self End | Eval Count | Assignment Count |
|--------|-----------|---------|------------|-----------------|
| 2025-H2 | 2025-06-01 | 2025-07-15 | 1 | 0 (in DB: some missing) |
| 2026-H1 | 2025-12-01 | 2026-01-15 | 15 | 24 |
| 2026-H2 | 2026-06-01 | 2026-07-15 | 1 | 21 |

### Current Date: June 1, 2026 → useCurrentPeriod() resolves to 2026-H2

---

## Per-Page Period Behavior

| Page | Current Behavior | Has Period Selector? | Default Period | Data Shown | Recommended |
|------|-----------------|---------------------|----------------|------------|-------------|
| **Dashboard** | Shows analytics for 2026-H2 (1 eval) | ❌ No | 2026-H2 | Empty-looking | Most recent with data (2026-H1) |
| **Reports** | Shows charts for 2026-H2 (0 completions) | ❌ No | 2026-H2 | Empty | Most recent with data |
| **Evaluations** | Lists 1 eval in 2026-H2 | ✅ Yes | 2026-H2 | Near-empty | Calendar (correct for creation) + smart default |
| **SelfEvaluation** | Creates eval for 2026-H2 | ❌ No | 2026-H2 | New blank form | Calendar (correct — must submit for current) |
| **Org Chart** | Shows 21 assignments for 2026-H2 | ❌ No | 2026-H2 | Full chart | Calendar (correct) |
| **Settings** | Shows history for 2026-H2 | ✅ Yes | 2026-H2 | Near-empty | Most recent with data |
| **Assignments** | Shows 21 assignments for 2026-H2 | ❌ No | 2026-H2 | Full | Calendar (correct for management) |

---

## Classification

### Screens That MUST Use Calendar Period
| Screen | Reason |
|--------|--------|
| SelfEvaluation | Users must submit evaluations for the currently active period |
| Evaluations (create) | New evaluations are saved under current period |
| OrgChart | Shows current organizational structure |
| Assignments | Shows current period assignments |

### Screens That SHOULD Use Data-Rich Period
| Screen | Reason |
|--------|--------|
| Dashboard (analytics) | Shows completion stats — most useful with data |
| Reports | Summarizes completed evaluations |
| Settings (history) | Shows user's evaluation history |

### Screens With Ambiguous Purpose
| Screen | Current | Recommendation |
|--------|---------|---------------|
| Evaluations (view) | Defaults to current, has selector | Default to most recent with data, keep selector |

---

## Problem Analysis

### Root Cause Chain

```
1. useCurrentPeriod() → date-based resolution → 2026-H2
2. All pages use useCurrentPeriod()
3. Dashboard fallback: hasCurrentData checks totalEmployees (always 13) → never triggers
4. Analytics total_employees is global, not period-scoped
5. Result: Every analytics/history page shows empty data on June 1, 2026
```

### What The Original Did

Original app had `CURRENT_PERIOD = '2026-H1'` hardcoded. This was always correct because:
- The code was deployed with the period value
- Period changes required a code change + redeployment
- There was no concept of "current date" determining the period

### What We Need

Hybrid approach:
- **Creation screens**: Use calendar period (current behavior, correct)
- **Analytics/history screens**: Use most recent period with meaningful data
- **Period selectors**: Keep on pages that have them (Evaluations, Settings)

---

## Recommended Implementation (NOT IMPLEMENTED)

### Option A: Add `useDisplayPeriod()` Hook

```typescript
// NEW hook for analytics/history display
export function useDisplayPeriod(): string {
  const calendarPeriod = useCurrentPeriod();
  // Find most recent period with >= 3 completed evaluations
  // If calendar period qualifies, use it; otherwise fall back
}
```

**Files changed:**
- `src/hooks/useDisplayPeriod.ts` (new file)
- `src/pages/Dashboard.tsx` — use useDisplayPeriod() for analytics
- `src/pages/Reports.tsx` — use useDisplayPeriod()
- `src/pages/Settings.tsx` — use useDisplayPeriod() for history

**Files NOT changed:**
- `src/hooks/useCurrentPeriod.ts` — keep current behavior
- `src/pages/SelfEvaluation.tsx` — keep using useCurrentPeriod()
- `src/pages/Evaluations.tsx` — keep using useCurrentPeriod() for creation
- `src/pages/OrgChart.tsx` — keep using useCurrentPeriod()

### Option B: Fix Dashboard Fallback Only

Simpler fix: change the `hasCurrentData` check in Dashboard:

```typescript
// BEFORE (broken):
const hasCurrentData = overview && (overview.totalEmployees > 0 || overview.selfEvalCompleted > 0);

// AFTER (fixed):
const hasCurrentData = overview && (overview.selfEvalCompleted > 0 || overview.supervisorEvalCompleted > 0);
```

This alone would make the Dashboard show 2026-H1 data. Reports would still need a similar fix or its own `useDisplayPeriod()`.

### Option C: Analytics Period Scoping

Fix `total_employees` in analytics to be period-scoped:

```sql
-- Instead of:
SELECT COUNT(*) FROM users WHERE is_active = 1 AND is_super_user = 0

-- Use:
SELECT COUNT(DISTINCT u.id) FROM users u 
JOIN supervisor_assignments sa ON sa.employee_id = u.id 
WHERE sa.period = ? AND u.is_active = 1 AND u.is_super_user = 0
```

---

## Risk Assessment

| Approach | Risk | Effort | User Impact |
|----------|------|--------|-------------|
| Option A | LOW — new hook, doesn't break creation | MEDIUM | Dashboard/Reports show correct data |
| Option B | VERY LOW — 1 line change | LOW | Dashboard shows correct data |
| Option C | LOW — server-side change | MEDIUM | Analytics become period-accurate |

**Recommendation:** Start with Option B (Dashboard fix) as quick win, then implement Option A for Reports/Settings, then Option C for analytics accuracy.

