# Fix Blank Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the blank dashboard and related race conditions caused by migrating from hardcoded constants to async DB-driven config, without reverting any DB architecture.

**Architecture:** Create a `useCurrentPeriod()` React hook that replaces the mutable `CURRENT_PERIOD` module variable with proper React state tied to `usePeriods()`. Fix the `posData` useMemo dependency on position config. Update all 12 consumer files to use the hook. The DB schema, server routes, and seed data remain untouched.

**Tech Stack:** React, TanStack Query (React Query), TypeScript

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/hooks/useCurrentPeriod.ts` | New hook — reactive current period from DB |
| Modify | `src/hooks/useEvalConfigInit.ts` | Remove period resolution logic (moved to useCurrentPeriod) |
| Modify | `src/pages/Dashboard.tsx` | Fix useMemo deps, use useCurrentPeriod |
| Modify | `src/components/Layout.tsx` | Use useCurrentPeriod |
| Modify | `src/components/PeriodEndAlert.tsx` | Use useCurrentPeriod |
| Modify | `src/pages/SelfEvaluation.tsx` | Use useCurrentPeriod |
| Modify | `src/pages/Evaluations.tsx` | Use useCurrentPeriod |
| Modify | `src/pages/Reports.tsx` | Use useCurrentPeriod |
| Modify | `src/pages/OrgChart.tsx` | Use useCurrentPeriod |
| Modify | `src/pages/Vacations.tsx` | Use useCurrentPeriod |
| Modify | `src/pages/ScoreAnalysis.tsx` | Use useCurrentPeriod |
| Modify | `src/pages/Settings.tsx` | Use useCurrentPeriod |
| Modify | `src/pages/MyActionPlan.tsx` | Use useCurrentPeriod |
| Modify | `src/pages/PeriodConfig.tsx` | Use useCurrentPeriod |
| Modify | `src/types/index.ts` | Remove re-export of CURRENT_PERIOD |

---

### Task 1: Create `useCurrentPeriod` Hook

**Files:**
- Create: `src/hooks/useCurrentPeriod.ts`

- [ ] **Step 1: Create the hook file**

```typescript
// src/hooks/useCurrentPeriod.ts
import { useMemo } from 'react';
import { usePeriods } from '@/api/queries';
import { setPeriods, setCurrentPeriod } from '@/lib/evaluationConfig';

/**
 * Reactive hook that resolves the current evaluation period from the DB.
 *
 * Replaces the mutable `CURRENT_PERIOD` module variable for React components.
 * The hook is tied to usePeriods() — when periods data arrives or changes,
 * the returned period updates and triggers a re-render.
 *
 * Also keeps the module-level CURRENT_PERIOD in sync for any non-React code
 * that still reads it directly (e.g., initial state defaults).
 */
export function useCurrentPeriod(): string {
  const { data: periodsData = [] } = usePeriods();

  return useMemo(() => {
    if (periodsData.length === 0) {
      // No period config in DB yet — return a safe default
      // (this matches the hardcoded fallback in evaluationConfig.ts)
      return '2026-H1';
    }

    const now = new Date();

    // 1. Find a period where we're currently within its overall date range
    //    (any phase: self_start → action_plan_end)
    const current = periodsData.find((p: any) => {
      const overallStart = new Date(p.self_start);
      const overallEnd = new Date(p.action_plan_end || p.feedback_end || p.supervisor_end || p.self_end);
      return now >= overallStart && now <= overallEnd;
    });

    if (current) {
      // Sync module-level state for non-React consumers
      setPeriods(periodsData.map((p: any) => p.period).sort());
      setCurrentPeriod(current.period);
      return current.period;
    }

    // 2. Fallback: most recent period that has already started
    const sorted = [...periodsData].sort(
      (a: any, b: any) => new Date(a.self_start).getTime() - new Date(b.self_start).getTime()
    );
    const started = sorted.filter((p: any) => new Date(p.self_start) <= now);

    const resolved = started.length > 0
      ? started[started.length - 1].period
      : sorted[sorted.length - 1].period; // earliest upcoming if nothing started

    // Sync module-level state for non-React consumers
    setPeriods(periodsData.map((p: any) => p.period).sort());
    setCurrentPeriod(resolved);
    return resolved;
  }, [periodsData]);
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/mikaelwallsten/Downloads/smps-performance-compass-main && npx tsc --noEmit --pretty src/hooks/useCurrentPeriod.ts 2>&1 | head -20`

Expected: No type errors (may show warnings about unused imports if standalone check)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCurrentPeriod.ts
git commit -m "feat: add useCurrentPeriod hook for reactive period resolution"
```

---

### Task 2: Update `useEvalConfigInit` — Remove period resolution

The period resolution logic is now in `useCurrentPeriod()`. We remove the duplicate logic from `useEvalConfigInit` to avoid two different resolution strategies fighting each other.

**Files:**
- Modify: `src/hooks/useEvalConfigInit.ts`

- [ ] **Step 1: Remove the period resolution effect**

Open `src/hooks/useEvalConfigInit.ts`. Remove the entire `useEffect` block that handles `periodsData` (the one that calls `setPeriods` and `setCurrentPeriod`). Keep the other effects (positionConfig, sectionWeights, scoreLabels, categories) and the `initialized` tracking.

The file should look like this after the change:

```typescript
/**
 * Initialization hook that loads evaluation config from DB on first use.
 * Populates the evaluationConfig module with DB data so that synchronous
 * getters (getPositionLabel, getSectionWeights, etc.) work correctly.
 *
 * Period resolution is handled by useCurrentPeriod() — do NOT add period
 * logic here, or the two hooks will conflict.
 */
import { useEffect } from 'react';
import { usePositionConfig, useSectionWeights, useScoreLabels, useCategories } from '@/hooks/useEvaluationConfig';
import {
  setPositionConfig, setSectionWeights, setScoreLabels, setCategories,
} from '@/lib/evaluationConfig';

let initialized = false;

export function useEvalConfigInit() {
  const { data: posConfig } = usePositionConfig();
  const { data: swData } = useSectionWeights();
  const { data: slData } = useScoreLabels();
  const { data: catData } = useCategories();

  useEffect(() => {
    if (posConfig && posConfig.length > 0) {
      setPositionConfig(posConfig);
    }
  }, [posConfig]);

  useEffect(() => {
    if (swData && swData.length > 0) {
      setSectionWeights(swData);
    }
  }, [swData]);

  useEffect(() => {
    if (slData && slData.length > 0) {
      setScoreLabels(slData);
    }
  }, [slData]);

  useEffect(() => {
    if (catData && catData.length > 0) {
      setCategories(catData);
    }
  }, [catData]);

  useEffect(() => {
    if (posConfig && swData && slData && catData && !initialized) {
      initialized = true;
    }
  }, [posConfig, swData, slData, catData]);
}
```

Key changes:
- Removed `usePeriods` import and its destructuring
- Removed the `useEffect` that called `setPeriods` and `setCurrentPeriod`
- Removed `setPeriods`, `setCurrentPeriod` from the import of evaluationConfig
- Added a comment explaining that period resolution lives in `useCurrentPeriod()`

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/mikaelwallsten/Downloads/smps-performance-compass-main && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No errors related to useEvalConfigInit.ts

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useEvalConfigInit.ts
git commit -m "refactor: remove period resolution from useEvalConfigInit — moved to useCurrentPeriod"
```

---

### Task 3: Fix Dashboard — useMemo dependencies and useCurrentPeriod

This is the primary bug fix. The `posData` useMemo misses the position config dependency, and `CURRENT_PERIOD` is a stale module variable.

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Update imports**

In `src/pages/Dashboard.tsx`, replace:

```typescript
import { CURRENT_PERIOD, getPositionLabel, getLegalHierarchy, getAdminHierarchy, getPositionHierarchy } from '@/lib/evaluationConfig';
```

With:

```typescript
import { getPositionLabel, getLegalHierarchy, getAdminHierarchy, getPositionHierarchy } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
import { usePositionConfig } from '@/hooks/useEvaluationConfig';
```

- [ ] **Step 2: Add hook calls inside the component**

Inside `Dashboard()`, after `const { user: currentUser } = useAuth();`, add:

```typescript
const currentPeriod = useCurrentPeriod();
const { data: posConfig = [] } = usePositionConfig();
```

- [ ] **Step 3: Replace all `CURRENT_PERIOD` with `currentPeriod`**

In `src/pages/Dashboard.tsx`, replace every occurrence of `CURRENT_PERIOD` (the module variable) with `currentPeriod` (the hook value). Specifically:

| Line context | Change |
|---|---|
| `useEvaluations({ period: CURRENT_PERIOD })` | `useEvaluations({ period: currentPeriod })` |
| `useAssignments(CURRENT_PERIOD)` | `useAssignments(currentPeriod)` |
| `usePeriods()` — already fetched by `useCurrentPeriod`, but Dashboard also needs `periodConfigs` for the phase/status bar. Keep the `usePeriods` call that's already there. |
| `.filter(a => a.period === CURRENT_PERIOD)` | `.filter(a => a.period === currentPeriod)` |
| `.filter(e => e.period === CURRENT_PERIOD)` | `.filter(e => e.period === currentPeriod)` |
| `(Array.isArray(periodConfigs) ? periodConfigs : []).find((c: any) => c.period === CURRENT_PERIOD)` | `.find((c: any) => c.period === currentPeriod)` |

- [ ] **Step 4: Fix `posData` useMemo dependencies**

Find the `posData` useMemo (~line 112-120) and add `posConfig` to the dependency array:

Before:
```typescript
const posData = useMemo(() => getPositionHierarchy().map(pos => {
    const pu = visible.filter(u => u.position === pos);
    if (pu.length === 0) return null;
    return {
      name: getPositionLabel(pos),
      selfPct: Math.round((pu.filter(u => pEvals.some(e => e.type === 'self' && e.evaluatorId === u.id)).length / pu.length) * 100),
      supPct: Math.round((pu.filter(u => pEvals.some(e => e.type === 'supervisor' && e.evaluatedId === u.id)).length / pu.length) * 100),
    };
  }).filter(Boolean), [visible, pEvals]);
```

After:
```typescript
const posData = useMemo(() => getPositionHierarchy().map(pos => {
    const pu = visible.filter(u => u.position === pos);
    if (pu.length === 0) return null;
    return {
      name: getPositionLabel(pos),
      selfPct: Math.round((pu.filter(u => pEvals.some(e => e.type === 'self' && e.evaluatorId === u.id)).length / pu.length) * 100),
      supPct: Math.round((pu.filter(u => pEvals.some(e => e.type === 'supervisor' && e.evaluatedId === u.id)).length / pu.length) * 100),
    };
  }).filter(Boolean), [visible, pEvals, posConfig]);
```

This ensures that when `posConfig` loads from the DB, `getPositionHierarchy()` will return real data and the memo will recompute.

- [ ] **Step 5: Verify the file compiles**

Run: `cd /Users/mikaelwallsten/Downloads/smps-performance-compass-main && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No errors in Dashboard.tsx

- [ ] **Step 6: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "fix: dashboard blank chart — add posConfig to useMemo deps, use reactive currentPeriod"
```

---

### Task 4: Fix Layout — useCurrentPeriod

**Files:**
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Update imports**

Replace:
```typescript
import { CURRENT_PERIOD, getPositionLevel } from '@/lib/evaluationConfig';
```

With:
```typescript
import { getPositionLevel } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
```

- [ ] **Step 2: Add hook call**

Inside `Layout()`, after `useEvalConfigInit();`, add:
```typescript
const currentPeriod = useCurrentPeriod();
```

- [ ] **Step 3: Replace all `CURRENT_PERIOD` references with `currentPeriod`**

In `src/components/Layout.tsx`, find and replace every `CURRENT_PERIOD` with `currentPeriod`:
- `useAssignments(CURRENT_PERIOD)` → `useAssignments(currentPeriod)`
- `useEvaluations({ period: CURRENT_PERIOD })` → `useEvaluations({ period: currentPeriod })`
- `a.period === CURRENT_PERIOD` (multiple occurrences) → `a.period === currentPeriod`
- `e.period === CURRENT_PERIOD` → `e.period === currentPeriod`
- `{CURRENT_PERIOD}` in JSX → `{currentPeriod}`

- [ ] **Step 4: Verify and commit**

Run: `cd /Users/mikaelwallsten/Downloads/smps-performance-compass-main && npx tsc --noEmit --pretty 2>&1 | head -20`

```bash
git add src/components/Layout.tsx
git commit -m "fix: layout — use reactive currentPeriod from useCurrentPeriod"
```

---

### Task 5: Fix PeriodEndAlert — useCurrentPeriod

**Files:**
- Modify: `src/components/PeriodEndAlert.tsx`

- [ ] **Step 1: Update imports**

Replace:
```typescript
import { CURRENT_PERIOD } from '@/lib/evaluationConfig';
```

With:
```typescript
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
```

- [ ] **Step 2: Add hook call inside the component**

After `const [dismissed, setDismissed] = useState(false);`, add:
```typescript
const currentPeriod = useCurrentPeriod();
```

- [ ] **Step 3: Replace `CURRENT_PERIOD` references**

- `periodConfigs.find(c => c.period === CURRENT_PERIOD)` → `periodConfigs.find(c => c.period === currentPeriod)`
- `El periodo {CURRENT_PERIOD} cierra` → `El periodo {currentPeriod} cierra`

- [ ] **Step 4: Verify and commit**

```bash
git add src/components/PeriodEndAlert.tsx
git commit -m "fix: PeriodEndAlert — use reactive currentPeriod"
```

---

### Task 6: Fix SelfEvaluation — useCurrentPeriod

**Files:**
- Modify: `src/pages/SelfEvaluation.tsx`

- [ ] **Step 1: Update imports**

Replace the import line that contains `CURRENT_PERIOD`:
```typescript
import { CURRENT_PERIOD, SECTION_LABELS, SECTION_ORDER, getSectionForQuestion, calculateScore, getSectionWeights, getPositionLabel, getScoreLabels } from '@/lib/evaluationConfig';
```

With:
```typescript
import { SECTION_LABELS, SECTION_ORDER, getSectionForQuestion, calculateScore, getSectionWeights, getPositionLabel, getScoreLabels } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
```

- [ ] **Step 2: Add hook call inside the component**

Near the top of the `SelfEvaluation()` function, add:
```typescript
const currentPeriod = useCurrentPeriod();
```

- [ ] **Step 3: Replace all `CURRENT_PERIOD` references with `currentPeriod`**

Find every `CURRENT_PERIOD` in the file and replace with `currentPeriod`. There should be 5 occurrences:
- `e.period === CURRENT_PERIOD` (3 times)
- `period: CURRENT_PERIOD` (1 time)
- `{CURRENT_PERIOD}` in JSX (2 times)

- [ ] **Step 4: Verify and commit**

```bash
git add src/pages/SelfEvaluation.tsx
git commit -m "fix: SelfEvaluation — use reactive currentPeriod"
```

---

### Task 7: Fix Evaluations — useCurrentPeriod

**Files:**
- Modify: `src/pages/Evaluations.tsx`

- [ ] **Step 1: Update imports**

Replace:
```typescript
import { CURRENT_PERIOD, getSectionWeights, getPositionLabel, getScoreLabels, getLegalHierarchy, getAdminHierarchy, PERIODS } from '@/lib/evaluationConfig';
```

With:
```typescript
import { getSectionWeights, getPositionLabel, getScoreLabels, getLegalHierarchy, getAdminHierarchy } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
```

Note: `PERIODS` is also removed — it will be replaced by `useCurrentPeriod()` plus `usePeriods()` where needed.

- [ ] **Step 2: Add hook calls inside the component**

Add near the top of the component:
```typescript
const currentPeriod = useCurrentPeriod();
const { data: periodsData = [] } = usePeriods();
const periods = periodsData.map((p: any) => p.period).sort();
```

- [ ] **Step 3: Replace `CURRENT_PERIOD` with `currentPeriod` and `PERIODS` with `periods`**

- `const [viewPeriod, setViewPeriod] = useState(CURRENT_PERIOD)` → `const [viewPeriod, setViewPeriod] = useState(currentPeriod)`
- All `CURRENT_PERIOD` → `currentPeriod` (there are ~12 occurrences)
- `{PERIODS.map(p => ...)` → `{periods.map(p => ...)`

- [ ] **Step 4: Verify and commit**

```bash
git add src/pages/Evaluations.tsx
git commit -m "fix: Evaluations — use reactive currentPeriod and periods from DB"
```

---

### Task 8: Fix Reports — useCurrentPeriod

**Files:**
- Modify: `src/pages/Reports.tsx`

- [ ] **Step 1: Update imports**

Replace:
```typescript
import { CURRENT_PERIOD, getPositionHierarchy, getLegalHierarchy, getAdminHierarchy } from '@/lib/evaluationConfig';
```

With:
```typescript
import { getPositionHierarchy, getLegalHierarchy, getAdminHierarchy } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
```

- [ ] **Step 2: Add hook call and replace references**

Add: `const currentPeriod = useCurrentPeriod();`
Replace all `CURRENT_PERIOD` with `currentPeriod`.

- [ ] **Step 3: Verify and commit**

```bash
git add src/pages/Reports.tsx
git commit -m "fix: Reports — use reactive currentPeriod"
```

---

### Task 9: Fix OrgChart — useCurrentPeriod

**Files:**
- Modify: `src/pages/OrgChart.tsx`

- [ ] **Step 1: Update imports**

Replace:
```typescript
import { CURRENT_PERIOD, getLegalHierarchy, getAdminHierarchy } from '@/lib/evaluationConfig';
```

With:
```typescript
import { getLegalHierarchy, getAdminHierarchy } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
```

- [ ] **Step 2: Add hook call and replace references**

Add: `const currentPeriod = useCurrentPeriod();`
Replace: `useAssignments(CURRENT_PERIOD)` → `useAssignments(currentPeriod)`
Replace: `a.period === CURRENT_PERIOD` → `a.period === currentPeriod`
Replace: `{CURRENT_PERIOD}` in JSX → `{currentPeriod}`

- [ ] **Step 3: Verify and commit**

```bash
git add src/pages/OrgChart.tsx
git commit -m "fix: OrgChart — use reactive currentPeriod"
```

---

### Task 10: Fix Vacations — useCurrentPeriod

**Files:**
- Modify: `src/pages/Vacations.tsx`

- [ ] **Step 1: Update imports**

Replace:
```typescript
import { CURRENT_PERIOD, getPositionLabel, getPositionLevel } from '@/lib/evaluationConfig';
```

With:
```typescript
import { getPositionLabel, getPositionLevel } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
```

- [ ] **Step 2: Add hook call and replace reference**

Add: `const currentPeriod = useCurrentPeriod();`
Replace: `a.period === CURRENT_PERIOD` → `a.period === currentPeriod`

- [ ] **Step 3: Verify and commit**

```bash
git add src/pages/Vacations.tsx
git commit -m "fix: Vacations — use reactive currentPeriod"
```

---

### Task 11: Fix ScoreAnalysis — useCurrentPeriod

**Files:**
- Modify: `src/pages/ScoreAnalysis.tsx`

- [ ] **Step 1: Update imports**

Replace:
```typescript
import { getPositionLabel, getPositionLevel, CURRENT_PERIOD, PERIODS, normalizePracticeArea } from '@/lib/evaluationConfig';
```

With:
```typescript
import { getPositionLabel, getPositionLevel, normalizePracticeArea } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
```

- [ ] **Step 2: Add hook calls and replace references**

Add near top of component:
```typescript
const currentPeriod = useCurrentPeriod();
const { data: periodsData = [] } = usePeriods();
const periods = periodsData.map((p: any) => p.period).sort();
```

- [ ] **Step 3: Replace occurrences**

- `useState(CURRENT_PERIOD)` → `useState(currentPeriod)`
- `{PERIODS.map(p => ...)}` → `{periods.map(p => ...)}`

- [ ] **Step 4: Verify and commit**

```bash
git add src/pages/ScoreAnalysis.tsx
git commit -m "fix: ScoreAnalysis — use reactive currentPeriod and periods from DB"
```

---

### Task 12: Fix Settings — useCurrentPeriod

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Update imports**

Replace:
```typescript
import { CURRENT_PERIOD, PERIODS, getPositionLabel, getScoreLabels, getSectionWeights, SECTION_ORDER } from '@/lib/evaluationConfig';
```

With:
```typescript
import { getPositionLabel, getScoreLabels, getSectionWeights, SECTION_ORDER } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
```

- [ ] **Step 2: Add hook calls and replace references**

Add near top of component:
```typescript
const currentPeriod = useCurrentPeriod();
const { data: periodsData = [] } = usePeriods();
const periods = periodsData.map((p: any) => p.period).sort();
```

- `useState(CURRENT_PERIOD)` → `useState(currentPeriod)`
- `{PERIODS.map(p => ...)}` → `{periods.map(p => ...)}`

- [ ] **Step 3: Verify and commit**

```bash
git add src/pages/Settings.tsx
git commit -m "fix: Settings — use reactive currentPeriod and periods from DB"
```

---

### Task 13: Fix MyActionPlan — useCurrentPeriod

**Files:**
- Modify: `src/pages/MyActionPlan.tsx`

- [ ] **Step 1: Update imports**

Replace:
```typescript
import { CURRENT_PERIOD, PERIODS, getPositionLabel, getPositionRank, SECTION_LABELS, getSectionByCategory } from '@/lib/evaluationConfig';
```

With:
```typescript
import { getPositionLabel, getPositionRank, SECTION_LABELS, getSectionByCategory } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
```

- [ ] **Step 2: Add hook calls and replace references**

Add near top of component:
```typescript
const currentPeriod = useCurrentPeriod();
const { data: periodsData = [] } = usePeriods();
const periods = periodsData.map((p: any) => p.period).sort();
```

- `useState(CURRENT_PERIOD)` → `useState(currentPeriod)`
- `{PERIODS.map(p => ...)}` → `{periods.map(p => ...)}`

- [ ] **Step 3: Verify and commit**

```bash
git add src/pages/MyActionPlan.tsx
git commit -m "fix: MyActionPlan — use reactive currentPeriod and periods from DB"
```

---

### Task 14: Fix PeriodConfig — use periods from DB

**Files:**
- Modify: `src/pages/PeriodConfig.tsx`

- [ ] **Step 1: Update imports**

Replace:
```typescript
import { PERIODS } from '@/lib/evaluationConfig';
```

With:
```typescript
import { usePeriods } from '@/api/queries';
```

- [ ] **Step 2: Add hook call and replace PERIODS**

Add near top of component:
```typescript
const { data: periodsData = [] } = usePeriods();
const periods = periodsData.map((p: any) => p.period).sort();
```

Replace `{PERIODS.map(p => ...)}` → `{periods.map(p => ...)}`
Replace any `PERIODS[0]` default → `periods[0] || ''`

- [ ] **Step 3: Verify and commit**

```bash
git add src/pages/PeriodConfig.tsx
git commit -m "fix: PeriodConfig — use periods from DB instead of module variable"
```

---

### Task 15: Clean up types/index.ts — Remove stale re-exports

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Remove the re-exports of CURRENT_PERIOD and PERIODS**

Find and remove these two lines:
```typescript
export { PERIODS } from '@/lib/evaluationConfig';
export { CURRENT_PERIOD } from '@/lib/evaluationConfig';
```

These were convenience re-exports. Since all consumers now import `useCurrentPeriod` directly and no longer import `CURRENT_PERIOD` or `PERIODS` from types, these re-exports are dead code and could cause confusion.

- [ ] **Step 2: Verify nothing else imports from types for CURRENT_PERIOD/PERIODS**

Run: `cd /Users/mikaelwallsten/Downloads/smps-performance-compass-main && grep -rn "from '@/types'" src/ | grep -i "CURRENT_PERIOD\|PERIODS" | head -10`

Expected: No results (all consumers have been updated in previous tasks).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "chore: remove stale CURRENT_PERIOD and PERIODS re-exports from types"
```

---

### Task 16: Final type-check and integration test

- [ ] **Step 1: Full TypeScript compilation check**

Run: `cd /Users/mikaelwallsten/Downloads/smps-performance-compass-main && npx tsc --noEmit --pretty 2>&1`

Expected: No type errors.

If there are errors, fix them. The most likely issues will be:
- A file still importing `CURRENT_PERIOD` or `PERIODS` from `@/types` or `@/lib/evaluationConfig` that wasn't updated
- A `usePeriods` import missing from a file that now needs it

- [ ] **Step 2: Search for any remaining direct CURRENT_PERIOD imports**

Run: `cd /Users/mikaelwallsten/Downloads/smps-performance-compass-main && grep -rn "import.*CURRENT_PERIOD" src/ | grep -v "useCurrentPeriod"`

Expected: No results. All `CURRENT_PERIOD` imports should be replaced with `useCurrentPeriod()` hook calls.

- [ ] **Step 3: Search for any remaining direct PERIODS imports**

Run: `cd /Users/mikaelwallsten/Downloads/smps-performance-compass-main && grep -rn "import.*PERIODS" src/ | grep -v "usePeriods\|useCurrentPeriod" | head -10`

Expected: No remaining `PERIODS` imports from `evaluationConfig` or `types`. The `evaluationConfig.ts` module still defines `PERIODS` as an internal export, but no consumer should import it directly anymore.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: final cleanup — resolve remaining type errors and stale imports"
```

---

## Self-Review Checklist

1. **Spec coverage:** Every component that used `CURRENT_PERIOD` has been updated (Dashboard, Layout, PeriodEndAlert, SelfEvaluation, Evaluations, Reports, OrgChart, Vacations, ScoreAnalysis, Settings, MyActionPlan, PeriodConfig). The `posData` useMemo dependency bug is fixed. The period fallback logic is improved.

2. **Placeholder scan:** No TBD, TODO, or "implement later" steps. Every step has complete code.

3. **Type consistency:** `useCurrentPeriod()` returns `string`. All consumers that used `CURRENT_PERIOD` as a string now get a `string` from the hook. `usePeriods()` returns the same shape used in `useEvalConfigInit`. `posConfig` from `usePositionConfig()` matches what `_positionConfig` expects.

4. **DB architecture preserved:** No changes to server routes, DB schema, seed data, or migration files. Only client-side React hooks and component imports change.

5. **No hardcoded data re-introduced:** Position hierarchies, section weights, score labels, etc. all remain DB-driven via `_positionConfig`, `_sectionWeights`, etc. The only change is ensuring React properly tracks when these async values load.

6. **The `evaluationConfig.ts` module is NOT deleted:** It still provides `setPeriods`, `setCurrentPeriod`, `getPositionLabel`, `getLegalHierarchy`, etc. The `useCurrentPeriod` hook calls `setPeriods`/`setCurrentPeriod` to keep the module in sync for any edge cases.

7. **The `PERIODS` and `CURRENT_PERIOD` module exports still exist** in `evaluationConfig.ts` for backward compatibility, but no client component should import them directly anymore.
