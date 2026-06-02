# Period System Forensics

## Original Behavior

The original app used a **hardcoded constant**:

```typescript
// src/types/index.ts
export const CURRENT_PERIOD = '2026-H1';
export const PERIODS = ['2025-H2', '2026-H1', '2026-H2'];
```

This meant:
- The current period was ALWAYS '2026-H1' regardless of the actual date
- Changing periods required a code change and redeployment
- The period dropdown showed '2025-H2', '2026-H1', '2026-H2'
- All data was associated with these hardcoded periods

## Current Behavior

The current app uses **database-driven periods**:

```typescript
// src/hooks/useCurrentPeriod.ts
export function useCurrentPeriod(): string {
  const { data: periodsData = [] } = usePeriods();
  // Finds the period where current date falls within its date range
  // Falls back to most recent started period
}
```

Period configs in DB:
| Period | Self Start | Self End | Supervisor End | Action Plan End |
|--------|-----------|---------|---------------|----------------|
| 2025-H2 | 2025-06-01 | 2025-07-15 | 2025-09-01 | 2025-11-30 |
| 2026-H1 | 2025-12-01 | 2026-01-15 | 2026-03-01 | 2026-05-31 |
| 2026-H2 | 2026-06-01 | 2026-07-15 | 2026-09-01 | 2026-11-30 |

## Why June 2026 Causes Empty Screens

**Root Cause:** Today is June 1, 2026. The `useCurrentPeriod()` hook resolves to **2026-H2** because we're within its date range. But 2026-H2 has only **1 evaluation** (a self-eval with 4 responses).

**Original App Behavior:** Would show 2026-H1 data (15 evaluations) because `CURRENT_PERIOD` was hardcoded to '2026-H1'.

**Current App Behavior:** Shows 2026-H2 data (1 evaluation) because `useCurrentPeriod()` correctly resolves to the current period.

**Is this a regression?** 

**NO** — this is CORRECT behavior. The original app had a hardcoded period that would need to be manually updated. The current app dynamically resolves the current period based on dates.

However, the UX is confusing because:
1. Dashboard shows "Periodo: 2026-H2" with almost no data
2. The period dropdown defaults to 2026-H2
3. Users expect to see their 2026-H1 evaluations

**Mitigation:** The Dashboard code already has fallback logic:
```typescript
const hasCurrentData = overview && (overview.totalEmployees > 0 || overview.selfEvalCompleted > 0);
const analyticsPeriod = hasCurrentData ? currentPeriod : previousPeriod;
```

This means the Dashboard falls back to 2026-H1 when 2026-H2 has no data. But the Evaluations page still defaults to 2026-H2.

## Period Carry-Forward

**Original:** Supervisor assignments were created per period. When a new period starts, assignments had to be manually recreated.

**Current:** Same behavior. Supervisor assignments are period-specific. The 2026-H2 period has 21 assignments (vs 24 for 2026-H1).

## Evaluation Visibility

**Original:** Evaluations filtered by `CURRENT_PERIOD` (hardcoded to 2026-H1).

**Current:** Evaluations filtered by `viewPeriod` (defaults to `currentPeriod` from DB). Users can change the period selector.

**Regression:** ⚠️ The period selector defaults to the current period (2026-H2), not the period with the most data. Users must manually switch to 2026-H1 to see historical data.

## Assessment

| Aspect | Original | Current | Regression? |
|--------|----------|---------|-------------|
| Current period | Hardcoded '2026-H1' | Dynamic based on dates | ⚠️ UX confusion, not a bug |
| Period config | Code change needed | DB-driven | ✅ Improved |
| Assignment carry-forward | Manual per period | Manual per period | ✅ Same |
| Dashboard fallback | N/A (always showed hardcoded period) | Falls back to previous period | ✅ Improved |
| Evaluation history | Period selector available | Period selector available | ✅ Same |
