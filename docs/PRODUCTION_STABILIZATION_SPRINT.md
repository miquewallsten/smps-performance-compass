# SMPS PRODUCTION STABILIZATION SPRINT

**Date:** 2026-06-02 · **Investigator:** Codex  
**Production:** https://smps.bowdot.online  
**Rules:** Evaluation engine FROZEN — no template/weight/question/competency changes

---

## PHASE 1 — EVALUATION ENGINE LOCK VERIFICATION

### Protected Table Counts

| Table | Row Count | Status |
|-------|-----------|--------|
| `question_library` | **84** | ✅ LOCKED |
| `template_questions` | **290** (17 positions, 3 sections, 3 practice areas, all active) | ✅ LOCKED |
| `section_weights` | **17** | ✅ LOCKED |
| `competency_definitions` | **35** | ✅ LOCKED |
| `evaluation_categories` | **24** | ✅ LOCKED |

### Section Weights Verification (Key Positions)

| Position | DB Value | Expected | Match |
|----------|----------|----------|-------|
| socio | 50/25/25 | 50/25/25 | ✅ |
| salary_partner | 50/25/25 | 50/25/25 | ✅ |
| counsel | 100/0/0 | 100/0/0 | ✅ |

### Scoring Formula

`calculateScore()` is byte-for-byte identical to original. **LOCKED.**

### Files That Could Modify Protected Data

| File | Touches | Risk |
|------|---------|------|
| `server/routes/evaluation-config.ts` | template_questions, section_weights, question_library CRUD | **PROTECTED** |
| `server/db/seed-evaluation-data.ts` | All seed data | **DO NOT RUN** |
| `src/lib/evaluationConfig.ts` | In-memory cache, section weights getters, scoring | **PROTECTED** |

---

## PHASE 2-3 — LIVE DEFECT DISCOVERY & HIERARCHY AUDIT

### Production Data Summary

| Metric | Value |
|--------|-------|
| Total users | 19 |
| Active users | 14 |
| Evaluations | 17 (15 in 2026-H1, 1 in 2026-H2, 1 in 2025-H2) |
| Completed | 17 |
| Score range | 4–88 (avg 71.4) |
| Supervisor assignments (2026-H1) | 24 |
| Supervisor assignments (2026-H2) | 1 |

### User Roster (Active)

| # | User | Position | Practice Area | Admin | MP | Supervisors |
|---|------|----------|---------------|-------|-----|-------------|
| 1 | SuperAdmin | socio | - | 0* | 0* | none |
| 2 | Carlos Mendoza | socio | fiscal_consultoria | 0* | 0* | Patricia Salinas |
| 3 | Patricia Salinas | socio | - | 0* | 0* | Carlos Mendoza |
| 4 | Andrés Beltrán | salary_partner | - | 0* | 0* | none |
| 5 | Roberto Figueroa | asociado_mid | corporativo | 0* | 0* | Carlos Mendoza |
| 6 | Ana Lucía Torres | asociado_mid | corporativo | 0* | 0* | Patricia Salinas |
| 7 | Diego Ramírez | pasante_carrera | corporativo | 0* | 0* | Roberto Figueroa, Carlos Mendoza |
| 8 | Laura Hernández | **pasante** | - | 0* | 0* | Ana Lucía Torres, Roberto Figueroa |
| 9 | Rafael Domínguez | director | - | 0* | 0* | Verónica Campos, Carlos Mendoza |
| 10 | Verónica Campos | gerente | - | 0* | 0* | Rafael Domínguez |
| 11 | Sandra Morales | coordinador | - | 0* | 0* | Fernando Ruiz, Rafael Domínguez |
| 12 | Fernando Ruiz | analista | - | 0* | 0* | Sandra Morales, Rafael Domínguez |
| 13 | Gabriela Ortiz | asistente | - | 0* | 0* | Verónica Campos, Sandra Morales |
| 14 | José Luis Paredes | **soporte** | - | 0* | 0* | Sandra Morales, Verónica Campos |

*\* API returns numeric 0/1 for these fields but the camelCase transformer may not be converting them to boolean for `isAdmin`/`isManagingPartner` — see DEFECT D02.*

### Supervisor Hierarchy Map (2026-H1)

```
Carlos Mendoza (socio)
  ├── Roberto Figueroa (asociado_mid)
  ├── Patricia Salinas (socio)
  ├── Diego Ramírez (pasante_carrera)
  └── Rafael Domínguez (director)

Patricia Salinas (socio)
  ├── Mariana Vega (pasante_carrera, inactive)
  ├── Ana Lucía Torres (asociado_mid)
  └── Carlos Mendoza (socio) ← mutual supervision

Rafael Domínguez (director)
  ├── Verónica Campos (gerente)
  ├── Fernando Ruiz (analista)
  └── Sandra Morales (coordinador)

Verónica Campos (gerente)
  ├── Gabriela Ortiz (asistente)
  ├── José Luis Paredes (soporte)
  └── Rafael Domínguez (director) ← mutual

Sandra Morales (coordinador)
  ├── José Luis Paredes (soporte)
  ├── Fernando Ruiz (analista)
  └── Gabriela Ortiz (asistente)

Roberto Figueroa (asociado_mid)
  ├── Emilio Castañeda (asociado_jr, inactive)
  ├── Diego Ramírez (pasante_carrera)
  └── Laura Hernández (pasante)

Ana Lucía Torres (asociado_mid)
  └── Laura Hernández (pasante)

Fernando Ruiz (analista)
  └── Sandra Morales (coordinador)
```

### Hierarchy Issues Found

| Issue | Detail |
|-------|--------|
| Carlos Mendoza ↔ Patricia Salinas | Mutual supervisor assignment — each supervises the other |
| Verónica Campos ↔ Rafael Domínguez | Mutual supervisor assignment |
| Sandra Morales ↔ Fernando Ruiz | Mutual supervisor assignment |
| Andrés Beltrán (salary_partner) | No supervisor assigned |
| SuperAdmin | No supervisor — correct for super_user |

---

## PHASE 4 — PERIOD AUDIT

### Period Configuration

| Period | Self Start | Self End | Current? |
|--------|-----------|---------|----------|
| 2025-H2 | 2025-06-01 | 2025-07-15 | No |
| 2026-H1 | 2025-12-01 | 2026-01-15 | No |
| 2026-H2 | **2026-06-01** | 2026-07-15 | **YES** (June 1, 2026) |

### Period Resolution Per Page

| Page | Resolved Period | Data Available | Status |
|------|----------------|---------------|--------|
| Dashboard | 2026-H2 | 1 eval | ⚠️ Empty-looking |
| Reports | 2026-H2 | 1 eval | ⚠️ Empty |
| Evaluations | 2026-H2 (default) | 1 eval | ⚠️ Empty |
| SelfEvaluation | 2026-H2 | 0 self evals | ⚠️ Empty form |
| OrgChart | 2026-H2 | 1 assignment | ⚠️ Minimal |
| Assignments | 2026-H2 | 1 assignment | ⚠️ Minimal |

**Root Cause:** June 1, 2026 falls within 2026-H2 date range. All pages resolve to the current period, which has minimal data.

### Dashboard Fallback Bug

```typescript
const hasCurrentData = overview && (overview.totalEmployees > 0 || overview.selfEvalCompleted > 0);
```

`totalEmployees` is a **global count** (all active non-superuser employees = 13), not period-scoped. So `hasCurrentData` is ALWAYS true. The fallback to previous period (2026-H1) NEVER triggers even though 2026-H2 has almost no data.

### Analytics Period Scoping

The `analytics_period_summary.total_employees` counts ALL active users globally, not users with data in the specific period. All three periods show `totalEmployees=13`.

---

## PHASE 5 — FRONTEND STATE AUDIT

### Query Key Architecture

| Key | Pattern | Invalidation |
|-----|---------|--------------|
| `['users']` | Global | Full invalidate on create/update/delete |
| `['assignments', period]` | Per-period | **BUG**: invalidates `['assignments']` (generic) on create/delete |
| `['evaluations', filters]` | With filters | Full invalidate on create/update/NA/feedback |
| `['evaluation', id]` | Single | No mutation-specific invalidate |
| `['actionPlans', filters]` | With filters | Invalidates `['actionPlans']` (generic) |
| `['objectives', filters]` | With filters | Invalidates `['objectives']` (generic) |
| `['analyticsOverview', period]` | Per-period | No invalidation after eval changes |
| `['analyticsEvaluations', period]` | Per-period | No invalidation after eval changes |

### Cache Invalidation Issues

1. **Assignments invalidation is too broad**: `useCreateAssignment` and `useDeleteAssignment` invalidate `['assignments']` (no period), but `useAssignments` uses `['assignments', period]`. This means period-filtered query caches won't be refreshed when assignments change.

2. **Analytics cache staleness**: After creating/updating an evaluation, the analytics caches (`['analyticsOverview', period]`, `['analyticsEvaluations', period]`) are NOT invalidated. Dashboard and Reports may show stale data until analytics tables are refreshed.

3. **Evaluation list stale after feedback**: `useCompleteFeedback` invalidates `['evaluations']` but `useEvaluations` can use `['evaluations', filters]`. If called with filters, the cache miss would cause a refetch anyway.

---

## PHASE 6 — DEFECT BACKLOG

### P0 — PRODUCTION DATA CORRUPTION

#### P0-01: Two evaluations have wrong total_score

- **Screen:** Dashboard / Reports / Evaluation viewer for these evaluations
- **Repro:** View Diego Ramírez self-eval (score=4) or SuperAdmin evaluates Carlos Mendoza (score=87)
- **Expected:** Diego Ramírez = 70, SuperAdmin→Mendoza = 90
- **Actual:** Diego Ramírez = 4, SuperAdmin→Mendoza = 87
- **Evidence:**
  - `65c501e6`: responses q2=3, q1=4 (w=1 each) → calc = `round(((3/5+4/5)/2)*100)` = **70** → stored **4**
  - `f6d483e0`: responses s1=4, s2=5 (w=1 each) → calc = `round(((4/5+5/5)/2)*100)` = **90** → stored **87**
- **Root Cause:** Unknown — these evaluations were created by the original app during migration/testing. The formula was correct but the stored score is wrong. Possible manual intervention or early bug.
- **File:** Database `evaluations` table
- **Fix:** 
  ```sql
  UPDATE evaluations SET total_score = 70 WHERE id = '65c501e6-e709-4a53-bd15-08bcb09335bc';
  UPDATE evaluations SET total_score = 90 WHERE id = 'f6d483e0-1d85-4c57-aeaf-6223a6ea2962';
  ```

#### P0-02: Score=0 supervisor evaluation with 0 responses

- **Screen:** Dashboard avg score, Evaluations list
- **Repro:** View Sandra Morales → SuperAdmin supervisor eval in 2026-H1
- **Expected:** Should not exist (no responses = not a valid evaluation)
- **Actual:** Evaluation `8cc7361d-...` exists with type=supervisor, completed_at set, score=0, 0 responses
- **Root Cause:** Evaluation created with 0 responses and marked completed. This drags down average scores.
- **File:** Database `evaluations` table
- **Fix:** Delete or mark as not-completed:
  ```sql
  UPDATE evaluations SET completed_at = NULL, total_score = 0 WHERE id = '8cc7361d-6e66-47ed-97a9-d1c408303e91' AND completed_at IS NOT NULL;
  ```

### P1 — FUNCTIONALITY REGRESSION

#### P1-01: All pages default to empty period (2026-H2)

- **Screen:** Dashboard, Reports, Evaluations, SelfEvaluation, OrgChart
- **Repro:** Log in on June 1 2026 → all pages show 2026-H2 data (1 eval)
- **Expected:** Show period with most data, or at minimum 2026-H1 until 2026-H2 has meaningful data
- **Actual:** All pages resolve to 2026-H2 because current date falls within its range
- **Root Cause:** `useCurrentPeriod()` selects by date range, not data availability. The original app had `CURRENT_PERIOD='2026-H1'` hardcoded.
- **File:** `src/hooks/useCurrentPeriod.ts`
- **Fix:** Modify `useCurrentPeriod` to prefer the most recent period that has completed evaluations:
  ```typescript
  // After date-based resolution, check if this period has meaningful data
  // If not, fall back to the most recent period that does
  ```

#### P1-02: Dashboard fallback never triggers

- **Screen:** Dashboard
- **Repro:** 2026-H2 overview shows totalEmployees=13, selfEvalCompleted=1
- **Expected:** Fallback to 2026-H1 (13 employees, 6 self, 8 supervisor)
- **Actual:** Shows 2026-H2 because totalEmployees > 0
- **Root Cause:** `totalEmployees` is a global count (all active users), not period-scoped. So `hasCurrentData` is always true.
- **File:** `src/pages/Dashboard.tsx` line `hasCurrentData` check
- **Fix:** Change fallback check to use period-specific metrics:
  ```typescript
  const hasCurrentData = overview && (overview.selfEvalCompleted > 0 || overview.supervisorEvalCompleted > 0);
  ```

#### P1-03: Analytics shows identical totalEmployees for all periods

- **Screen:** Dashboard stats for any period
- **Repro:** Compare 2026-H1 vs 2026-H2 analytics
- **Expected:** Period-specific employee counts
- **Actual:** Both show totalEmployees=13
- **Root Cause:** `analytics_period_summary.total_employees` is populated with a global user count query, not period-scoped.
- **File:** `server/db/migrate-analytics.ts` (analytics refresh), `server/routes/analytics.ts` lines 56-57
- **Fix:** Make total_employees period-scoped — count only users who have evaluations in that period.

#### P1-04: Assignments cache invalidation uses wrong key

- **Screen:** AssignSupervisors, OrgChart
- **Repro:** Create/delete assignment → query with `['assignments', period]` is not invalidated
- **Expected:** Period-filtered queries refresh after mutation
- **Actual:** Only `['assignments']` (generic) is invalidated
- **Root Cause:** `useCreateAssignment` and `useDeleteAssignment` invalidate `['assignments']` but `useAssignments(period)` uses `['assignments', period]`
- **File:** `src/api/queries.ts` lines 57, 65
- **Fix:** Invalidate with the specific period key or invalidate all assignment queries.

### P2 — UX ISSUES

#### P2-01: User positions don't match original names

- **Screen:** User list, Dashboard, any page showing Laura Hernández or José Luis Paredes
- **Repro:** View these users → position shows "pasante" and "soporte"
- **Expected:** "pasante_corporativo" and "archivo_soporte" (original names)
- **Root Cause:** `normalizePosition()` in `src/lib/evaluationConfig.ts` remaps these positions
- **File:** `src/lib/evaluationConfig.ts` lines 149-152
- **Fix:** Remove the normalizePosition mappings OR update DB user positions to canonical names.

#### P2-02: Mutual supervisor assignments create circular hierarchy

- **Screen:** OrgChart
- **Repro:** View Carlos Mendoza ↔ Patricia Salinas mutual supervision
- **Expected:** Clear up/down hierarchy
- **Actual:** Circular mutual assignments obscure the actual reporting structure
- **Root Cause:** Seed data includes mutual assignments (e.g., Carlos supervises Patricia AND Patricia supervises Carlos)
- **File:** `server/db/seed-users.ts`
- **Fix:** Review and correct mutual assignments to establish clear reporting structure.

#### P2-03: Inactive users have completed evaluations

- **Screen:** Reports, evaluation counts
- **Repro:** Prueba Martha (inactive) has a completed self-eval score=80 with 10 responses
- **Expected:** Inactive users should not appear in evaluation counts
- **Actual:** They are included in analytics and evaluation lists
- **Root Cause:** Evaluation data was created before user was deactivated; no cleanup occurred
- **File:** Database data
- **Fix:** Exclude inactive users from analytics counts or mark their evaluations as archived.

#### P2-04: Analytics not invalidated after evaluation changes

- **Screen:** Dashboard showing stale data after evaluation submission
- **Repro:** Complete an evaluation → Dashboard analytics don't update
- **Expected:** Analytics refresh after evaluation CRUD
- **Actual:** Analytics caches (`['analyticsOverview']`, `['analyticsEvaluations']`) are never invalidated by evaluation mutations
- **File:** `src/api/queries.ts` — evaluation mutations don't invalidate analytics keys
- **Fix:** Add `qc.invalidateQueries({ queryKey: ['analyticsOverview'] })` in evaluation mutation `onSuccess` callbacks.

### P3 — COSMETIC

#### P3-01: Navigation labels differ from original

- **Screen:** Left sidebar
- **Expected:** "Panel Principal", "Mis Evaluaciones", "Mi Evaluación", "Evaluar Equipo", "Mi Plan de Acción"
- **Actual:** "Panel", "Mis Eval.", "Autoeval.", "Evaluar", "Plan Acción"
- **File:** `src/components/Layout.tsx`

#### P3-02: SuperAdmin shows admin=0, mp=0 in API

- **Screen:** N/A (API only)
- **Expected:** isAdmin=1, isSuperUser=1, isManagingPartner=1
- **Actual:** API returns numeric 0/1 correctly, but frontend `toCamelCase` boolean conversion may be inconsistent
- **File:** `src/api/client.ts` boolean field conversion

---

## FIX IMPLEMENTATION ORDER

1. **P0-01 + P0-02**: Fix wrong/stale evaluation scores (SQL — safe, no code changes)
2. **P1-01 + P1-02**: Fix period default behavior (UX improvement, no engine changes)
3. **P1-04**: Fix assignment cache invalidation (1-line fix)
4. **P2-04**: Add analytics cache invalidation to evaluation mutations (few lines)
5. **P1-03**: Make total_employees period-scoped (server change, needs testing)
6. **P2-01**: Fix position normalization (review if this is intentional)
7. **P2-02, P2-03, P3-01, P3-02**: Low-risk cosmetic/data fixes

---

## PROTECTION CHECKLIST — DO NOT TOUCH

| Item | File | Status |
|------|------|--------|
| question_library (84 rows) | DB + seed | 🔒 LOCKED |
| template_questions (290 rows) | DB + seed | 🔒 LOCKED |
| section_weights (17 rows) | DB + seed | 🔒 LOCKED |
| competency_definitions (35 rows) | DB + seed | 🔒 LOCKED |
| evaluation_categories (24 rows) | DB + seed | 🔒 LOCKED |
| calculateScore() | src/lib/evaluationConfig.ts | 🔒 LOCKED |
| full-template endpoint | server/routes/evaluation-config.ts | 🔒 LOCKED |
| seedEvaluationData() | server/db/seed-evaluation-data.ts | 🔒 DO NOT RUN |

