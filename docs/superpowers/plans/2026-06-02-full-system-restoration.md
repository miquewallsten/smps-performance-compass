# Full System Restoration — SMPS Performance Compass

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore all 18 production defects to fully working state by fixing root causes, not patching symptoms.

**Architecture:** The app migrated from browser-only localStorage (Lovable.ai) to full MySQL + JWT + REST API. The evaluation engine (scoring formula, section weights, templates) is correct. The UX breaks due to: (1) period resolution defaulting to data-empty 2026-H2, (2) position name mismatches between old hardcoded names and new normalized names causing template lookup failures, (3) corrupted stored scores in DB, (4) missing SMTP config blocking email flows.

**Tech Stack:** React 18 + Vite + TypeScript (frontend), Express + MySQL + JWT (backend), TanStack React Query, Drizzle-inspired raw SQL, nodemailer

**Root Cause Summary:**
- **Period System**: `useCurrentPeriod()` resolves to 2026-H2 (June 2026) which has 1 eval. All 15 real evals are in 2026-H1. `useDisplayPeriod()` fallback is date-based (< 7 days from period start), which depends on exact period config dates. The Dashboard `hasCurrentData` check uses global `totalEmployees` (13) instead of period-specific metrics, so fallback never triggers. Reports and Evaluations both default to the near-empty period.
- **Position Name Chaos**: The migration created duplicate entries for position names — both old (`pasante_corporativo`, `archivo_soporte`) and new (`pasante`, `soporte`) exist in `section_weights` and `position_config`. Template questions use old names (`archivo_soporte`). `normalizePosition()` maps old→new in frontend. Users migrated to new names can't find templates stored under old names.
- **Score Corruption**: 3 evaluations have `total_score` that doesn't match the `calculateScore()` formula. Root cause: scores submitted before the score calculation formula was fixed are stale.
- **Missing SMTP**: No SMTP credentials configured, but sendmail works in production. The issue is in development/testing where no emails go out at all.

---

### Task 1: Fix Position Name Chaos — Single Canonical Naming

**Files:**
- Modify: `server/db/migrate.ts:774-778`
- Modify: `server/db/seed-evaluation-data.ts`
- Modify: `src/lib/evaluationConfig.ts:162-166`

**Root Cause:** The system has TWO sets of position names for the same roles: `pasante_corporativo`→`pasante` and `archivo_soporte`→`soporte`. Both names exist in `section_weights`, `position_config`, and `template_questions`, but inconsistently. Template questions for `archivo_soporte` exist but NOT for `soporte`. Users migrated to new names can't find their templates.

**Fix Strategy:** Keep ONLY the ORIGINAL names (`pasante_corporativo`, `archivo_soporte`, `pasante_carrera`) everywhere. Remove the "normalized" names (`pasante`, `soporte`). Revert users already migrated.

- [ ] **Step 1: Remove duplicate position entries from seed data**

In `server/db/seed-evaluation-data.ts`, remove the duplicate section_weights entries for `pasante` and `soporte`, and the duplicate position_config entries. Also remove any template_questions for position `pasante` that duplicate `pasante_corporativo`.

The section_weights block currently has both old and new names. Keep only the original names:

```typescript
// REMOVE these lines (around line 85 and 92):
{ position: 'pasante', tecnico: 40, competencias: 40, blandas: 20 },
{ position: 'soporte', tecnico: 0, competencias: 50, blandas: 50 },

// REMOVE these position_config entries (around line 108 and 115):
{ position: 'pasante', label: 'Pasante', level: 'legal', rank: 9, sort: 9 },
{ position: 'soporte', label: 'Soporte', level: 'administrativo', rank: 7, sort: 16 },
```

- [ ] **Step 2: Remove the position name migration that renames users**

In `server/db/migrate.ts`, remove the migration that renames `pasante_corporativo` → `pasante` and `archivo_soporte` → `soporte` (lines 774-778):

```typescript
// REMOVE these lines:
['pasante_corporativo', 'pasante'],
['archivo_soporte', 'soporte'],
```

And add a REVERSE migration to restore any users already renamed:

```typescript
// ADD after the existing position migrations:
// Reverse any previous incorrect renames
['pasante', 'pasante_corporativo'],
['soporte', 'archivo_soporte'],
```

- [ ] **Step 3: Remove normalizePosition function entirely**

In `src/lib/evaluationConfig.ts`, remove the `normalizePosition` function (lines 162-166) and its export from `src/types/index.ts` (line 49):

```typescript
// REMOVE:
export function normalizePosition(pos: string): string {
  if (pos === 'pasante_corporativo') return 'pasante';
  if (pos === 'archivo_soporte') return 'soporte';
  return pos;
}
```

Also remove the re-export from `src/types/index.ts` line 49:
```typescript
// REMOVE:
export { normalizePosition } from '@/lib/evaluationConfig';
```

- [ ] **Step 4: Check template_questions for `pasante` position entries and migrate them to `pasante_corporativo`**

Add a migration in `server/db/migrate.ts`:

```typescript
// Migrate template_questions from 'pasante' to 'pasante_corporativo'
try {
  const result = await run(
    `UPDATE template_questions SET position = 'pasante_corporativo' WHERE position = 'pasante'`
  );
  if (result.affectedRows > 0) {
    console.log(`  ✓ Migrated ${result.affectedRows} template_questions from 'pasante' to 'pasante_corporativo'`);
  }
} catch (e) {
  console.log('  ⚠ Could not migrate pasante template_questions:', (e as Error).message);
}
```

- [ ] **Step 5: Update the full-template route to accept both old and new names during transition**

In `server/routes/evaluation-config.ts:201`, add a normalization at the top of the handler (before the position_config lookup):

```typescript
// ADD at line 203-204, after const { position } = req.params:
// Temporary: accept both old and new position names
const canonicalPosition = position === 'pasante' ? 'pasante_corporativo' 
  : position === 'soporte' ? 'archivo_soporte' 
  : position;
// Then use canonicalPosition instead of position for all DB queries
```

- [ ] **Step 6: Remove 'pasante' and 'soporte' from the legal/administrative fallback in useDisplayPeriod and useCurrentPeriod**

No changes needed here — these hooks use `position_config` from DB, and once we remove the duplicate entries, only the canonical names will appear.

- [ ] **Step 7: Commit**

```bash
git add server/db/migrate.ts server/db/seed-evaluation-data.ts server/routes/evaluation-config.ts src/lib/evaluationConfig.ts src/types/index.ts
git commit -m "fix: canonicalize position names — remove duplicate pasante/soporte, keep original names only

Root cause: migration created duplicate position names (pasante_corporativo→pasante,
archivo_soporte→soporte) but template_questions still use original names, breaking
template lookup for users migrated to new names. Now keeping ONLY original names
everywhere and reverting any users already renamed."
```

---

### Task 2: Fix Period Default — Always Show Data-Rich Period

**Files:**
- Modify: `src/hooks/useDisplayPeriod.ts`
- Modify: `src/pages/Dashboard.tsx:40-44`
- Modify: `server/routes/analytics.ts:48`

**Root Cause:** `useDisplayPeriod()` is purely date-based — if current period started ≥ 7 days ago, it returns current period regardless of whether data exists. Dashboard fallback `hasCurrentData` uses global `totalEmployees` (always 13) instead of period-specific metrics. Reports has no period selector.

**Fix Strategy:** Make `useDisplayPeriod()` data-aware by checking analytics for actual evaluation counts. Fix Dashboard fallback to check period-specific metrics. Add period selector to Reports.

- [ ] **Step 1: Rewrite `useDisplayPeriod()` to be data-aware using analytics overview**

Replace `src/hooks/useDisplayPeriod.ts` entirely:

```typescript
import { useMemo } from 'react';
import { usePeriods, useAnalyticsOverview } from '@/api/queries';

/**
 * Resolves the best period to DISPLAY analytics and history.
 *
 * Rules (in priority order):
 * 1. If current period has real evaluation data (selfEvalCompleted > 0 OR supervisorEvalCompleted > 0), use it
 * 2. Otherwise, find the most recent past period with data
 * 3. Fall back to most recent period by date
 *
 * Uses the lightweight analytics overview API (aggregate counts, not full evaluations).
 */
export function useDisplayPeriod(): string {
  const { data: periodsData = [] } = usePeriods();

  // Sort periods newest first by start date
  const sortedPeriods = useMemo(() => {
    if (periodsData.length === 0) return [];
    return [...periodsData].sort(
      (a: any, b: any) => new Date(b.selfStart || b.self_start).getTime() - new Date(a.selfStart || a.self_start).getTime()
    );
  }, [periodsData]);

  // Fetch analytics for the newest period to check if it has data
  const newestPeriod = sortedPeriods[0]?.period;
  const { data: newestOverview } = useAnalyticsOverview(newestPeriod || '2026-H1');

  const displayPeriod = useMemo(() => {
    if (periodsData.length === 0) return '2026-H1';

    // If newest period has real evaluation data, use it
    if (newestOverview) {
      const hasData = (newestOverview.selfEvalCompleted || 0) > 0 || (newestOverview.supervisorEvalCompleted || 0) > 0;
      if (hasData) return newestPeriod!;
    }

    // Otherwise, use the next most recent period
    const fallback = sortedPeriods[1]?.period || sortedPeriods[0]?.period || '2026-H1';
    return fallback;
  }, [periodsData, sortedPeriods, newestPeriod, newestOverview]);

  return displayPeriod;
}
```

- [ ] **Step 2: Fix Dashboard `hasCurrentData` check to use period-specific metrics**

In `src/pages/Dashboard.tsx`, line 40-41, fix the data check:

```typescript
// BEFORE (line 40):
const hasCurrentData = overview && (overview.selfEvalCompleted > 0 || overview.supervisorEvalCompleted > 0);

// AFTER:
const hasCurrentData = overview && (
  (overview.selfEvalCompleted || 0) > 0 || 
  (overview.supervisorEvalCompleted || 0) > 0
);
```

This is already correct in the current code! The real issue is that `analyticsPeriod` is set to `displayPeriod` and `displayPeriod` resolves to 2026-H2 if H2 has been active > 7 days. The fix in Step 1 handles this.

But there's one more thing: on line 43, we also need to display a clear indicator when showing data from a non-current period:

No change needed to the logic. The `isPeriodTransition` variable on line 42 already handles this:
```typescript
const isPeriodTransition = displayPeriod !== currentPeriod;
```

This is already correct — the PeriodTransitionAlert will show when displaying a different period.

- [ ] **Step 3: Fix `total_employees` to be period-scoped in analytics**

In `server/routes/analytics.ts`, line 48, change the live query for `totalUsers` to be period-scoped. The issue is that `totalEmployees` in the overview API is always the global active user count, which makes `hasCurrentData` always true on Dashboard:

```typescript
// BEFORE (line 48):
const totalUsers = await db.get('SELECT COUNT(*) as cnt FROM users WHERE is_active = 1 AND is_super_user = 0');

// AFTER — count users who have assignments in this period:
const totalUsers = await db.get(
  'SELECT COUNT(DISTINCT u.id) as cnt FROM users u INNER JOIN supervisor_assignments sa ON sa.employee_id = u.id WHERE u.is_active = 1 AND u.is_super_user = 0 AND sa.period = ?',
  [period]
);
```

And update the cached path (line 75) to return 0 when there's no data, rather than the stale cached value:

No change needed on line 75 since the cached data comes from `analytics_period_summary` which is periodically refreshed.

- [ ] **Step 4: Add period selector to Reports page**

In `src/pages/Reports.tsx`, add a period selector dropdown (like Evaluations has). Currently Reports always uses `useDisplayPeriod()` with no way to switch:

Add the import at top:
```typescript
import { usePeriods } from '@/api/queries';
```

Add period state and selector after line 16:
```typescript
const { data: periodsData = [] } = usePeriods();
const sortedPeriods = [...periodsData].sort((a: any, b: any) => b.period.localeCompare(a.period));
const [selectedPeriod, setSelectedPeriod] = useState(displayPeriod);
const currentPeriod = selectedPeriod || displayPeriod; // use selected, fall back to display
```

Then replace `currentPeriod` usage throughout with `currentPeriod` (from state). Add the period selector in the header next to the area filter:

```tsx
// ADD after the area filter buttons (around line 150), before the CSV export button:
<select
  value={selectedPeriod}
  onChange={(e) => setSelectedPeriod(e.target.value)}
  className="px-3 py-1.5 rounded-md text-xs font-medium bg-card border"
>
  {sortedPeriods.map((p: any) => (
    <option key={p.period} value={p.period}>{p.period}</option>
  ))}
</select>
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDisplayPeriod.ts src/pages/Dashboard.tsx src/pages/Reports.tsx server/routes/analytics.ts
git commit -m "fix: period defaults — displayPeriod is now data-aware, analytics scoped to period, Reports gets period selector

Root cause: useDisplayPeriod was purely date-based, defaulting to 2026-H2 (empty).
Dashboard fallback used global totalEmployees (always 13) instead of period-specific
metrics. Reports had no period selector. Now displayPeriod checks analytics for real
data, total_employees is period-scoped, and Reports lets users switch periods."
```

---

### Task 3: Fix Corrupted Evaluation Scores in DB

**Files:**
- Create: `server/scripts/recalculate-scores.ts`

**Root Cause:** 3 evaluations were submitted before the `calculateScore()` formula was fixed/corrected. Their stored `total_score` doesn't match what the formula would compute from their `evaluation_responses`.

**Fix Strategy:** Create a one-shot script that recalculates all evaluation scores from their responses using the canonical formula. Run it as part of migration.

- [ ] **Step 1: Create the score recalculation script**

Create `server/scripts/recalculate-scores.ts`:

```typescript
/**
 * One-shot script to recalculate all evaluation total_scores from their
 * stored responses using the canonical calculateScore formula.
 *
 * Run: npx tsx server/scripts/recalculate-scores.ts
 */
import { pool, db } from '../db/connection.js';

interface Response {
  questionId: string;
  score: number;
  notApplicable: boolean;
  noElements: boolean;
}

interface Question {
  id: string;
  weight: number;
}

function calculateScore(questions: Question[], responses: Response[], naApprovals: Record<string, boolean>): number {
  const activeQuestions = questions.filter(q => {
    const r = responses.find(r => r.questionId === q.id);
    if (r?.notApplicable && naApprovals[q.id]) return false;
    if (r?.noElements) return false;
    if (r?.notApplicable && !naApprovals && r.score === 0) return false;
    return true;
  });

  const totalWeight = activeQuestions.reduce((sum, q) => sum + q.weight, 0);
  if (totalWeight === 0) return 0;

  let weightedSum = 0;
  for (const q of activeQuestions) {
    const r = responses.find(r => r.questionId === q.id);
    if (r && !r.notApplicable && !r.noElements && r.score > 0) {
      weightedSum += (r.score / 5) * q.weight;
    }
  }
  return Math.round((weightedSum / totalWeight) * 100);
}

async function main() {
  console.log('Recalculating all evaluation scores...');

  const [allEvals] = await pool.execute('SELECT id, total_score FROM evaluations WHERE completed_at IS NOT NULL');
  const evals = allEvals as any[];

  let fixed = 0;
  let correct = 0;
  let zeroResp = 0;

  for (const ev of evals) {
    // Get responses for this evaluation
    const [rows] = await pool.execute(
      'SELECT question_id, score, not_applicable, no_elements, weight FROM evaluation_responses WHERE evaluation_id = ?',
      [ev.id]
    );
    const responses = (rows as any[]).map(r => ({
      questionId: r.question_id,
      score: r.score,
      notApplicable: !!r.not_applicable,
      noElements: !!r.no_elements,
    }));
    const questions = (rows as any[]).map(r => ({
      id: r.question_id,
      weight: r.weight || 1,
    }));

    if (responses.length === 0) {
      console.log(`  ${ev.id}: 0 responses, skipping`);
      zeroResp++;
      continue;
    }

    // Get NA approvals
    const [naRows] = await pool.execute(
      'SELECT question_id, approved FROM evaluation_na_approvals WHERE evaluation_id = ?',
      [ev.id]
    );
    const naApprovals: Record<string, boolean> = {};
    for (const na of naRows as any[]) {
      naApprovals[na.question_id] = !!na.approved;
    }

    const newScore = calculateScore(questions, responses, naApprovals);
    const oldScore = Math.round(ev.total_score);

    if (newScore !== oldScore) {
      console.log(`  ${ev.id}: ${oldScore} → ${newScore} (FIXED)`);
      await pool.execute('UPDATE evaluations SET total_score = ? WHERE id = ?', [newScore, ev.id]);
      fixed++;
    } else {
      correct++;
    }
  }

  console.log(`\nDone. Fixed: ${fixed}, Already correct: ${correct}, Zero responses: ${zeroResp}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run the script to fix existing scores**

```bash
npx tsx server/scripts/recalculate-scores.ts
```

Expected output: 3 scores fixed (67d81b7b: 75→70, 6e8f5bd7: 88→70, f6d483e0: 87→90), others already correct.

- [ ] **Step 3: Add score recalculation to the evaluation submission flow to prevent future corruption**

In `server/routes/evaluations.ts`, find the POST/PATCH handlers and ensure they re-calculate total_score from responses using the same formula. Let me check if this is already handled...

The current server evaluation route should already be computing total_score on submission. Let's verify by reading the create/update handlers.

- [ ] **Step 4: Commit**

```bash
git add server/scripts/recalculate-scores.ts
git commit -m "fix: recalculate corrupted evaluation scores from stored responses

Root cause: 3 evaluations had wrong total_score because they were submitted before
the score calculation formula was corrected. Created recalculation script that
recomputes scores from evaluation_responses using the canonical formula.
67d81b7b: 75→70, 6e8f5bd7: 88→70, f6d483e0: 87→90."
```

---

### Task 4: Verify Server-Side Score Calculation Prevents Future Corruption

**Files:**
- Read: `server/routes/evaluations.ts` (POST and PATCH handlers)

**Goal:** Ensure that every evaluation save recalculates total_score on the server side from the submitted responses using the canonical formula. This prevents score drift from client-side bugs.

- [ ] **Step 1: Read the evaluation route to check score calculation**

```bash
grep -n "total_score\|totalScore\|calculateScore" server/routes/evaluations.ts
```

If server is already calculating scores, verify the formula matches `src/lib/evaluationConfig.ts:calculateScore()`. If not calculating, add server-side recalculation.

- [ ] **Step 2: If needed, add/verify server-side score calculation matches client**

The server should recompute `total_score` from scratch using the responses array on every create/update. The formula MUST match `calculateScore()` in `evaluationConfig.ts`.

- [ ] **Step 3: Commit (if changes made)**

```bash
git add server/routes/evaluations.ts
git commit -m "fix: ensure server-side score recalculation matches canonical formula"
```

---

### Task 5: Fix Email Delivery — Configure for Production

**Files:**
- Modify: `server/services/email.ts` (already supports sendmail)
- Create/Modify: `.env.production.example`

**Root Cause:** In development, SMTP is not configured so emails log to console. In production (Hostinger), `sendmail` transport works correctly. The issue is that the app generates activation/reset links pointing to `localhost:5173` in dev and `smps.bowdot.online` in prod, but `APP_URL` is set to `http://localhost:5173` in `.env`. When running in production, `APP_URL` should be `https://smps.bowdot.online`.

- [ ] **Step 1: Fix APP_URL detection to auto-detect in production**

In `server/services/email.ts`, line 99-101, update `getAppUrl()` to use the request host when available, falling back to env:

```typescript
function getAppUrl(): string {
  // In production, use the configured app URL or derive from request
  if (process.env.APP_URL) return process.env.APP_URL;
  // Default production URL
  if (process.env.NODE_ENV === 'production') return 'https://smps.bowdot.online';
  // Development
  return 'http://localhost:5173';
}
```

- [ ] **Step 2: Update .env with correct APP_URL for development**

In `.env`:
```
APP_URL=http://localhost:5173
```

This is already correct.

- [ ] **Step 3: Add email health check to health stats endpoint**

In `server/index.ts`, the `/api/health/stats` endpoint already exists. Add email verification:

```typescript
import { verifyEmailConfig } from './services/email.js';

// In /api/health/stats handler, add:
const emailStatus = await verifyEmailConfig();
// Add to response: email: emailStatus
```

- [ ] **Step 4: Commit**

```bash
git add server/services/email.ts server/index.ts
git commit -m "fix: email delivery — auto-detect APP_URL in production, add email health check

Root cause: APP_URL defaults to localhost:5173, which is wrong for production
activation/reset links. Now auto-detects production URL when NODE_ENV=production."
```

---

### Task 6: Fix Objectives — Handle Empty State Gracefully

**Files:**
- Modify: `src/pages/PersonalObjectives.tsx`

**Root Cause:** The personal_objectives table has 0 rows because no objectives were ever created. The page shows empty without guidance. This is actually an empty-state UX issue, not a data bug — the feature works, users just haven't used it yet.

**Fix Strategy:** Add proper empty state with clear call-to-action instead of a blank page.

- [ ] **Step 1: Read and enhance PersonalObjectives.tsx with empty state**

Read the current page, then add an empty state card with instructions when no objectives exist:

```tsx
{/* Empty state */}
{objectives.length === 0 && !isLoading && (
  <div className="smps-surface-card text-center py-12">
    <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
    <h3 className="text-lg font-semibold mb-2">Sin objetivos para este periodo</h3>
    <p className="text-sm text-muted-foreground max-w-md mx-auto">
      {currentUser.position === 'socio' || currentUser.isAdmin
        ? 'Como administrador, puede crear objetivos para los miembros de su equipo.'
        : 'Su supervisor aún no ha definido objetivos para usted en este periodo.'}
    </p>
    {(currentUser.position === 'socio' || currentUser.isAdmin) && (
      <button onClick={handleCreateObjective} className="mt-4 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium">
        Crear primer objetivo
      </button>
    )}
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/PersonalObjectives.tsx
git commit -m "fix: add empty state to PersonalObjectives when no objectives exist"
```

---

### Task 7: Fix Inactive User Assignments & Data Quality

**Files:**
- Modify: `server/db/migrate.ts` (add cleanup migration)
- Modify: `server/routes/assignments.ts` (add guard)

**Root Cause:** Inactive users (like "Prueba Martha") have supervisor assignments in 2026-H2. Users with `is_active = 0` shouldn't be assignable. Mutual supervision pairs exist (Carlos↔Patricia, Carlos↔Rafael, Sandra↔Fernando).

**Fix Strategy:** Add DB cleanup for inactive user assignments. Add guard in assignment creation to prevent assigning inactive users. Mutual supervision is a data configuration choice, not a bug — but flag it.

- [ ] **Step 1: Add migration to clean up inactive user assignments**

In `server/db/migrate.ts`, add:

```typescript
// Clean up assignments for inactive users
try {
  const result = await run(
    `DELETE sa FROM supervisor_assignments sa
     INNER JOIN users u ON sa.employee_id = u.id
     WHERE u.is_active = 0`
  );
  if (result.affectedRows > 0) {
    console.log(`  ✓ Removed ${result.affectedRows} assignments for inactive users`);
  }
} catch (e) {
  console.log('  ⚠ Could not clean up inactive user assignments:', (e as Error).message);
}
```

- [ ] **Step 2: Add guard in assignment creation route**

In `server/routes/assignments.ts`, add a check in the POST handler:

```typescript
// ADD before creating assignment:
const employee = await db.get('SELECT is_active FROM users WHERE id = ?', [employeeId]);
if (!employee || !(employee as any).is_active) {
  return res.status(400).json({ error: 'Cannot assign inactive user' });
}
const supervisor = await db.get('SELECT is_active FROM users WHERE id = ?', [supervisorId]);
if (!supervisor || !(supervisor as any).is_active) {
  return res.status(400).json({ error: 'Cannot assign inactive supervisor' });
}
```

- [ ] **Step 3: Fix practice_area format for Carlos Mendoza**

Add a migration in `server/db/migrate.ts`:

```typescript
// Normalize remaining old practice_area formats
try {
  const result = await run(
    `UPDATE users SET practice_area = 'fiscal_consultoria' WHERE practice_area = 'consultoria_fiscal'`
  );
  if (result.affectedRows > 0) {
    console.log(`  ✓ Normalized ${result.affectedRows} users from consultoria_fiscal to fiscal_consultoria`);
  }
} catch (e) {
  console.log('  ⚠ Could not normalize practice_area:', (e as Error).message);
}
```

Wait — the practice_area format `fiscal_consultoria` IS the new format. The old one was `consultoria_fiscal`. The migration already handles this conversion. But the truth matrix says Carlos Mendoza has `fiscal_consultoria` which IS the correct format. Let me re-check...

Actually looking at the truth matrix: "Carlos Mendoza: practice_area=fiscal_consultoria (old format)". The migration converts `consultoria_fiscal` → `fiscal_consultoria`, so `fiscal_consultoria` IS the NEW format, not old. The truth matrix note is wrong or uses reversed naming. Either way, the `normalizePracticeArea` function in evaluationConfig.ts maps `consultoria_fiscal` → `fiscal_consultoria`. The current DB value for Carlos (`fiscal_consultoria`) IS correct. No fix needed.

- [ ] **Step 4: Commit**

```bash
git add server/db/migrate.ts server/routes/assignments.ts
git commit -m "fix: clean up inactive user assignments, prevent assigning inactive users"
```

---

### Task 8: Remove Dead Code — auth-patch.ts

**Files:**
- Read then Delete: `server/routes/auth-patch.ts`

**Root Cause:** auth-patch.ts registers 0 routes — it's dead code importing from nowhere and doing nothing. The audit found it's referenced in server/index.ts but contains no routes.

- [ ] **Step 1: Check if auth-patch.ts is imported anywhere**

```bash
grep -rn "auth-patch\|authPatch" server/ --include="*.ts"
```

- [ ] **Step 2: Remove the import and file**

If it's imported in `server/index.ts`, remove the import. Then delete the file.

- [ ] **Step 3: Commit**

```bash
git rm server/routes/auth-patch.ts
# If imported in index.ts, remove that line
git add server/index.ts
git commit -m "chore: remove dead code — auth-patch.ts has 0 routes"
```

---

### Task 9: Add Period Selector to All Read-Only Pages

**Files:**
- Modify: `src/pages/Evaluations.tsx:69-71` (already has viewPeriod, but default needs fixing)
- Modify: `src/pages/Settings.tsx` (evaluation history section)

**Root Cause:** Evaluations already has a period selector but defaults to `displayPeriod`. If `displayPeriod` resolves correctly (fixed in Task 2), this should work. Settings page's evaluation history has no period selector.

- [ ] **Step 1: Ensure Evaluations.tsx viewPeriod defaults correctly**

Line 71: `const [viewPeriod, setViewPeriod] = useState(displayPeriod);`

After Task 2's fix to `useDisplayPeriod()`, this should default to a data-rich period. No change needed if Task 2 works.

- [ ] **Step 2: Check Settings.tsx evaluation history for period handling**

Read the settings page to verify it uses `displayPeriod` or has its own period handling. Add a period selector if missing.

- [ ] **Step 3: Commit (if changes made)**

---

### Task 10: Remove Duplicate Route Registration for Timeline

**Files:**
- Modify: `server/index.ts:149`

**Root Cause:** Timeline routes are mounted at `/api/users` (line 149) which conflicts with user routes also at `/api/users` (line 134). Express merges them, so it works, but `/api/users/:id/timeline` overlaps with `/api/users/:id`. Express handles this by matching specific routes first, but it's fragile.

- [ ] **Step 1: Check timeline route paths**

```bash
grep -n "router\.\(get\|post\|patch\|delete\|put\)" server/routes/timeline.ts
```

- [ ] **Step 2: Fix if needed**

If timeline routes use paths like `/:id/timeline`, they should be mounted at `/api` directly, not `/api/users`:

```typescript
// BEFORE:
app.use('/api/users', timelineRoutes);

// AFTER:
app.use('/api', timelineRoutes);
```

And update timeline.ts to use full paths: `/users/:id/timeline` instead of `/:id/timeline`.

- [ ] **Step 3: Commit (if changes made)**

---

### Task 11: Final Integration Verification

**Files:**
- Run: `npm run build` (or `npx vite build`)
- Check: Console for errors
- Test: Login, Dashboard, Reports, Evaluations, SelfEvaluation, Objectives, Vacations, Settings

**Goal:** Verify all fixes work together. No regressions.

- [ ] **Step 1: Build the frontend**

```bash
cd /Users/mikaelwallsten/Downloads/smps-performance-compass-main && npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Start the server and check for migration errors**

```bash
cd /Users/mikaelwallsten/Downloads/smps-performance-compass-main && npx tsx server/index.ts
```

Expected: All migrations pass, server starts on port 3000.

- [ ] **Step 3: Manual smoke test checklist**
  - Login with valid credentials → Dashboard loads
  - Dashboard shows stats from data-rich period (not empty)
  - Reports charts show real completion data
  - Evaluations list shows evaluations from data-rich period
  - Self-evaluation loads template for current user's position
  - Objectives shows at least an empty state with CTA
  - User management shows all users with correct position names
  - Period selector works on Reports and Evaluations pages
  - PeriodTransitionAlert shows when viewing non-current period

- [ ] **Step 4: Fix any issues found**

---

### Task 12: Final Commit and Summary

- [ ] **Step 1: Final git status check**

```bash
git status
git diff --stat
```

- [ ] **Step 2: Create summary commit if any uncommitted changes**

```bash
git add -A
git commit -m "fix: complete system restoration — period defaults, position names, scores, email, cleanup

Fixes all 18 production defects identified in the system audit:
- P0: Score corruption recalculated, email delivery fixed for production
- P1: Period defaults now data-aware, Dashboard/Reports/Evaluations show real data
- P2: Inactive user assignments cleaned, position names canonicalized
- P3: Dead code removed, duplicate routes fixed, empty states added"
```
