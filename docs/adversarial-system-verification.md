# SMPS Adversarial System Verification

**Date:** 2026-06-02
**Method:** Hostile forensic audit — edge cases, data anomalies, JS failures, stale caches, dead features
**Status:** COMPLETE — 11 new defects found (6 undocumented)

---

## NEW DEFECTS (Not Previously Documented)

### P1 — MAJOR

#### P1-NEW-01: Analytics cache NEVER invalidated after evaluation mutations

- **Page:** Dashboard, Reports
- **Repro:** Complete an evaluation → navigate to Dashboard → analytics still show old data
- **Root Cause:** `useCreateEvaluation`, `useUpdateEvaluation`, `useCompleteFeedback`, and `useApproveNA` all invalidate `['evaluations']` but NEVER invalidate `['analyticsOverview']` or `['analyticsEvaluations']`. Dashboard and Reports read from these cached queries.
- **File:** `src/api/queries.ts` — all evaluation mutations
- **Fix:** Add `qc.invalidateQueries({ queryKey: ['analyticsOverview'] })` and `qc.invalidateQueries({ queryKey: ['analyticsEvaluations'] })` to evaluation mutation `onSuccess` callbacks.

#### P1-NEW-02: AuthContext swallows all errors silently

- **Page:** Login, any authenticated page
- **Repro:** Auth failure → user sees nothing, no error message
- **Root Cause:** `AuthContext.tsx` has 5 empty `catch {}` blocks (lines 57, 68, 76, 92, 98) that silently discard all errors. If token refresh fails, logout fails, or user fetch fails, the UI shows a spinner forever or a blank page with no error feedback.
- **File:** `src/contexts/AuthContext.tsx`
- **Fix:** Add error state and user-facing error messages to AuthContext.

#### P1-NEW-03: Non-existent period returns live analytics with global counts

- **Page:** Dashboard (API call)
- **Repro:** `GET /api/analytics/overview?period=NONEXISTENT` → returns `{totalEmployees: 13, selfEvalCompleted: 0, ..., _source: "live"}`
- **Expected:** 404 or explicit "Period not found" error
- **Actual:** Returns data from live query with global total_employees count
- **Root Cause:** The live fallback query uses global `SELECT COUNT(*) FROM users` instead of period-specific count.
- **File:** `server/routes/analytics.ts` line 49-64

---

### P2 — MODERATE

#### P2-NEW-01: 5 users have supervisor assignments but ZERO evaluations (ever)

- **Page:** Dashboard (employee status), Evaluations
- **Users:** Laura Hernández, José Luis Paredes, Gabriela Ortiz, Ana Lucía Torres, Verónica Campos
- **Impact:** These users appear in the org chart and assignment lists but have no evaluation history. They skew completion metrics to 0%.
- **Root Cause:** These users were assigned supervisors but never completed any evaluation cycle.

#### P2-NEW-02: Inactive user Prueba Martha is EVALUATOR for her own self-eval

- **Page:** Evaluations list, Reports
- **Repro:** View evaluations → Prueba Martha (inactive director) appears as both evaluator and evaluated
- **Impact:** 1 completed evaluation from an inactive user skews completion metrics
- **Root Cause:** User was deactivated after completing evaluations. Evaluation data wasn't cleaned up.

#### P2-NEW-03: useDisplayPeriod hook fetches ALL evaluations (potential performance issue)

- **Page:** Dashboard, Reports, Evaluations (any page using useDisplayPeriod)
- **Repro:** useDisplayPeriod calls useEvaluations() with NO period filter → fetches all 17 evaluations every time
- **Impact:** As evaluation count grows, this becomes a performance bottleneck. 17 evals is fine, but 500+ will be slow.
- **Root Cause:** `useDisplayPeriod` uses `useEvaluations()` without period filter to count completions.
- **File:** `src/hooks/useDisplayPeriod.ts` line 21
- **Fix:** Add period parameter or use analytics API instead of full evaluations fetch.

#### P2-NEW-04: Invalid position in full-template returns admin fallback weights

- **Page:** Self Evaluation (if position is invalid)
- **Repro:** `GET /api/evaluation-config/full-template/NONEXISTENT` → returns `{tecnico:0, competencias:80, blandas:20}` (admin fallback)
- **Expected:** 404 or error
- **Actual:** Returns admin default weights with 0 questions
- **Root Cause:** Fallback in `section_weights` lookup defaults to 0/80/20 (admin) when position not found.
- **File:** `server/routes/evaluation-config.ts` full-template endpoint

---

### P3 — COSMETIC

#### P3-NEW-01: localStorage draft restore silently fails in SelfEvaluation

- **Page:** SelfEvaluation
- **Repro:** In iOS Safari private mode, try to restore a saved draft
- **Expected:** Either restore works or user sees "No saved draft"
- **Actual:** `catch { /* ignore */ }` at line 47 swallows the error silently
- **File:** `src/pages/SelfEvaluation.tsx` line 47

---

## PREVIOUSLY DOCUMENTED DEFECTS (Still Open)

| ID | Severity | Description | Documented In |
|----|----------|-------------|---------------|
| P0-01 | P0 | Score mismatches (3 fixed, 1 blocked) | score-integrity-audit.md |
| P0-02 | P0 | Empty completed evaluation | score-integrity-audit.md |
| P0-03 | P0 | Password reset broken (no SMTP) | production-truth-matrix.md |
| P0-04 | P0 | Account activation broken (no SMTP) | production-truth-matrix.md |
| P1-01 | P1 | Dashboard default period (now fixed) | (FIXED in Phase 3) |
| P1-02 | P1 | Reports empty period (now fixed) | (FIXED in Phase 3) |
| P1-03 | P1 | Evaluations default period (now fixed) | (FIXED in Phase 3) |
| P1-04 | P1 | Analytics total_employees global (now fixed) | (FIXED in Phase 3) |
| P2-01 | P2 | Inactive user Prueba Martha has assignments | production-truth-matrix.md |
| P2-02 | P2 | Mutual supervisor assignments (3 pairs) | production-truth-matrix.md |
| P2-03 | P2 | 9 users missing self-eval in 2026-H1 | production-truth-matrix.md |
| P2-04 | P2 | Only 3 action plans (18% coverage) | production-truth-matrix.md |
| P3-01 | P3 | Position name mismatches | production-truth-matrix.md |
| P3-02 | P3 | Navigation labels shortened | production-truth-matrix.md |

---

## TESTED EDGE CASES (ALL PASS)

| Test | Result |
|------|--------|
| Non-existent evaluation ID → 404 | ✅ PASS |
| SQL injection in period param → empty result | ✅ PASS |
| No auth token → 401 | ✅ PASS |
| Invalid position in template → fallback weights | ⚠️ See P2-NEW-04 |
| Malformed practice area → corporativo fallback | ✅ PASS |
| No duplicate assignments | ✅ PASS |
| No self-supervisor evaluations | ✅ PASS |
| No self-assignments | ✅ PASS |


---

## ADDENDUM: IMPLEMENTATION GAPS FOUND

### P2-NEW-05: Integrity scheduler created but never wired

- **Severity:** P2
- **Page:** N/A (server infrastructure)
- **Repro:** Check server/index.ts — no import of `integrity-scheduler`, no call to `startIntegrityScheduler()`
- **Impact:** Nightly integrity checks will never run. The scheduler code exists but is dead.
- **Root Cause:** `startIntegrityScheduler()` was never called in the server boot sequence.
- **File:** `server/index.ts` (missing import + startup call)
- **Fix:** Add `import { startIntegrityScheduler } from './services/integrity-scheduler.js';` and call `startIntegrityScheduler();` after server starts.

### P2-NEW-06: system_integrity_audit table not in database migration

- **Severity:** P2
- **Page:** N/A (database schema)
- **Repro:** The `integrity-scheduler.ts` writes to `system_integrity_audit` table, but `migrate.ts` never creates it.
- **Impact:** First integrity check will fail with "table not found" error.
- **Root Cause:** Migration was not updated when the scheduler was created.
- **File:** `server/db/migrate.ts` (missing CREATE TABLE)
- **Fix:** Add CREATE TABLE for `system_integrity_audit` to the migration.

