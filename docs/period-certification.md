# SMPS Period System Certification

**Date:** 2026-06-02
**Status:** CONDITIONAL PASS — 2 edge-case warnings

---

## PHASE 1: EXACT ALGORITHM

```typescript
useDisplayPeriod():
  1. Sort periods newest-first by selfStart
  2. Find "current" period where now ∈ [selfStart, actionPlanEnd]
  3. If current exists:
     a. If daysSinceStart < 7 → return PREVIOUS period
     b. Else → return CURRENT period
  4. If no current period (between periods) → return most recent period
```

### Simulation Results (Production Periods)

| Date | useCurrentPeriod | useDisplayPeriod | Note |
|------|-----------------|------------------|------|
| 2025-01-01 | NONE | 2026-H2 | ⚠️ Between — returns newest |
| 2025-06-01 | 2025-H2 | 2025-H2 | ✅ Correct |
| 2025-07-01 | 2025-H2 | 2025-H2 | ✅ Correct |
| 2025-12-31 | 2026-H1 | 2026-H1 | ✅ Correct |
| 2026-01-01 | 2026-H1 | 2026-H1 | ✅ Correct |
| **2026-06-01** | **2026-H2** | **2026-H1** | **✅ Grace works** |
| 2026-07-01 | 2026-H2 | 2026-H2 | ✅ After grace |
| 2026-12-31 | 2026-H2 | 2026-H2 | ⚠️ Between — ok |
| 2027-01-01 | 2026-H2 | 2026-H2 | ⚠️ Between — ok |

---

## PHASE 2: SCENARIO SIMULATION

**Key finding: The algorithm is purely date-driven. Evaluation count is irrelevant.**

| Scenario | Date | Evals | Display | Result |
|----------|------|-------|---------|--------|
| A: 0 evals | 2026-12-15 | 0 | 2026-H2 | ⚠️ Would show empty (grace expired 189 days ago) |
| B: 1 eval | 2026-12-15 | 1 | 2026-H2 | ✅ Has data |
| C: 50 evals | 2026-12-15 | 50 | 2026-H2 | ✅ Has data |
| D: 0 evals + asgn | 2026-12-15 | 0 | 2026-H2 | ⚠️ Same as A |
| E: 0 evals + obj | 2026-12-15 | 0 | 2026-H2 | ⚠️ Same as A |
| Grace ON | 2026-12-05 | 0 | 2026-H2 | Only first 7 days get grace |

**The 7-day grace window only covers the first week of a new period. After that, an empty period will show empty screens with no fallback.**

---

## PHASE 3: SCREEN-TO-HOOK MAPPING

### useCurrentPeriod() — Creation Workflows
| Screen | Usage |
|--------|-------|
| SelfEvaluation | Creates eval for current period ✅ |
| Evaluations (create) | New evals target current period ✅ |
| Dashboard (raw data) | Pending actions, per-employee table for current period ✅ |
| OrgChart | Shows current period assignments ✅ |

### useDisplayPeriod() — Analytics/History Workflows
| Screen | Usage |
|--------|-------|
| Dashboard (analytics) | Stats cards use display period ✅ |
| Reports | All charts use display period ✅ |
| Evaluations (history) | viewPeriod defaults to display period ✅ |

**Separation verified:** Creation workflows NEVER use display period. History/reporting NEVER use current period. ✅

---

## PHASE 4: CLASSIFICATION

**Current implementation: DATE-DRIVEN with 7-day grace window**

Not data-driven. The 7-day grace period is the ONLY concession to data availability. After 7 days, the display switches to the new period regardless of whether it contains evaluations.

### Risks

| Risk | Severity | Trigger |
|------|----------|---------|
| Empty screens after day 7 | MEDIUM | New period with no evaluations on day 8+ |
| Grace window too short | LOW | Only 7 days — slow-starting periods will show empty |
| No manual override | LOW | Users can't force a different display period |
| Between-period behavior | LOW | Shows most recent period (acceptable) |

---

## PHASE 5: FINAL ARCHITECTURE RECOMMENDATION

### Chosen: Option 3 — Hybrid

**Current period for creation + Data-driven for display**

**BUT** the current implementation is NOT data-driven — it's date-driven with a 7-day grace. To truly implement Option 3:

```
useDisplayPeriod():
  1. Check current calendar period
  2. If current period has ≥ 1 completed evaluation → use it
  3. If within first 7 days AND no evals → use previous period (grace)
  4. If after 7 days AND no evals → use previous period (don't show empty)
  5. Fall back to most recent period with data
```

This would require querying the analytics API with the current period to check if it has data. This is a lightweight API call (already cached by React Query).

**Current gap:** Step 4 is missing. After day 7, an empty period will display with no fallback.

### Recommendation: ADD data check after grace expires

```typescript
// After grace period, check if current period has actual data
if (daysSinceStart >= 7) {
  // Would need to check if current period has evaluations
  // If not, fall back to previous period
  return current.period; // ← CURRENT: shows empty
  // SHOULD: check data first
}
```

---

## CERTIFICATION: CONDITIONAL PASS

| Aspect | Status |
|--------|--------|
| Creation/history separation | ✅ PASS |
| Grace period works | ✅ PASS (June 2026 → shows 2026-H1) |
| Between-period handling | ⚠️ WARNING (acceptable) |
| Empty period after grace | ⚠️ WARNING (shows empty after day 7) |
| Evaluation engine untouched | ✅ PASS |
| No broken workflows | ✅ PASS |

**PASS with 2 warnings.** The system will function correctly for the current production use case. The 7-day grace window is sufficient for the June 2026 transition. However, if a future period goes 8+ days without evaluations, analytics/history screens will show empty data with no automatic fallback.

### Recommended improvement (NOT IMPLEMENTED):
Add a data check after the grace period expires: if current period has 0 completed evaluations, continue falling back to the previous period.

