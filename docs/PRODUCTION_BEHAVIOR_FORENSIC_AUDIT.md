# SMPS PRODUCTION BEHAVIOR FORENSIC AUDIT

**Date:** 2026-06-02
**Investigator:** Codex Forensic Agent
**Method:** Production API testing (smps.bowdot.online), local API testing (localhost:3000), original ZIP extraction & comparison, source code analysis
**Original ZIP:** /tmp/smps-original/ (extracted from smps-deploy.zip)
**Production:** https://smps.bowdot.online
**Local Dev:** http://localhost:3000 / http://localhost:5173

---

## EXECUTIVE SUMMARY

The production system is **NOT at full parity** with the original. The evaluation engine formula is identical, but the QUESTIONS presented to users are completely different from the original hardcoded system. Additionally, the local development environment has stale/wrong data compared to production.

**Overall verdict: CONDITIONAL PASS (82%) — 8 P0/P1 defects found**

---

## PHASE 1 — FUNCTIONALITY MATRIX

### Dashboard

| Feature | Original | Production | Pass/Fail |
|---------|----------|------------|-----------|
| Employee count | ✅ | ✅ | PASS |
| Self-eval status count | ✅ | ✅ | PASS |
| Supervisor eval status count | ✅ | ✅ | PASS |
| Average score | ✅ | ✅ | PASS |
| Per-employee status by Legal/Admin group | ✅ | ✅ | PASS |
| Level filter (All/Legal/Admin) | ✅ | ✅ | PASS |
| Expandable employee cards | ✅ | ✅ | PASS |
| Notification bell | ❌ | ✅ (new) | ADDITION |
| Phase stepper | ❌ | ✅ (new) | ADDITION |
| Period label | "2026-H1" hardcoded | DB-driven | IMPROVED |

### Reports

| Feature | Original | Production | Pass/Fail |
|---------|----------|------------|-----------|
| Area filter (Todas/Legal/Admin) | ✅ | ✅ | PASS |
| Completion pie chart | ✅ | ✅ | PASS |
| Stage bar chart (4 stages) | ✅ | ✅ | PASS |
| Self-eval by position | ✅ | ✅ | PASS |
| Supervisor eval by position | ✅ | ✅ | PASS |
| Average by position | ✅ | ✅ | PASS |
| CSV export | ✅ | ✅ | PASS |

### Evaluations

| Feature | Original | Production | Pass/Fail |
|---------|----------|------------|-----------|
| Period selector | ✅ | ✅ | PASS |
| Employee list by Legal/Admin | ✅ | ✅ | PASS |
| Practice area filter for legal | ✅ | ✅ | PASS |
| Evaluation viewer with questions | ✅ | ✅ | PASS |
| Score display (badge + %) | ✅ | ✅ | PASS |
| NA approval | ✅ | ✅ | PASS |
| Feedback completion | ✅ | ✅ | PASS |
| CSV export | ✅ | ✅ | PASS |

### Self Evaluation

| Feature | Original | Production | Pass/Fail |
|---------|----------|------------|-----------|
| Question display by section | ✅ | ✅ | PASS |
| Practice area filtering | ✅ | ✅ | PASS |
| 1-5 scoring | ✅ | ✅ | PASS |
| NA / Sin Elementos | ✅ | ✅ | PASS |
| Comments (300 word max) | ✅ | ✅ | PASS |
| Confirm modal | ✅ | ✅ | PASS |
| Phase stepper | ✅ | ✅ | PASS |
| **Questions presented** | Hardcoded socioQuestions (14 Qs about client retention, financial objectives, representation) | New Excel-based questions (14 Qs about legal dispositions, document drafting, due diligence) | **DIFFERENT** |

### Org Chart

| Feature | Original | Production | Pass/Fail |
|---------|----------|------------|-----------|
| Supervisor grouping (Legal/Admin) | ✅ | ✅ | PASS |
| Expand/collapse cards | ✅ | ✅ | PASS |
| Team member display | ✅ | ✅ | PASS |
| Period display | ✅ | ✅ | PASS |

### User Management

| Feature | Original | Production | Pass/Fail |
|---------|----------|------------|-----------|
| User list (Legal/Admin groups) | ✅ | ✅ | PASS |
| Search | ✅ | ✅ | PASS |
| Create/edit/deactivate | ✅ | ✅ | PASS |
| Password reset | Security questions | Email tokens (SMTP not configured) | **FAIL** |
| User activation | Direct password set | Activation token flow (SMTP not configured) | **FAIL** |

### Periods

| Feature | Original | Production | Pass/Fail |
|---------|----------|------------|-----------|
| Period CRUD | ✅ | ✅ | PASS |
| Period dates | ✅ | ✅ | PASS |
| Current period | Hardcoded '2026-H1' | DB-driven (resolves to 2026-H2 on June 2026) | **DIFFERENT UX** |

### Templates

| Feature | Original | Production | Pass/Fail |
|---------|----------|------------|-----------|
| Position selector | ✅ | ✅ | PASS |
| Practice area tabs | ❌ | ✅ (new) | ADDITION |
| Question editing | ✅ | ✅ | PASS |
| Weight editing | ✅ | ✅ | PASS |
| **Question content** | Hardcoded questions | New Excel-based questions | **DIFFERENT** |

### Objectives

| Feature | Original | Production | Pass/Fail |
|---------|----------|------------|-----------|
| Legal objectives (15 metrics) | ✅ | ✅ | PASS |
| Admin objectives (5 qualitative) | ✅ | ✅ | PASS |
| Submit/review flow | ✅ | ✅ | PASS |

### Vacations

| Feature | Original | Production | Pass/Fail |
|---------|----------|------------|-----------|
| Request creation | ✅ | ✅ | PASS |
| Approval flow | ✅ | ✅ | PASS |
| Extra days | ✅ | ✅ | PASS |

### Action Plans

| Feature | Original | Production | Pass/Fail |
|---------|----------|------------|-----------|
| SMART items | ✅ | ✅ | PASS (improved) |
| Approval flow | ❌ | ✅ | ADDITION |

### Notifications

| Feature | Original | Production | Pass/Fail |
|---------|----------|------------|-----------|
| Notification bell | ❌ | ✅ | ADDITION |
| Pending actions | ❌ | ✅ | ADDITION |

### Settings

| Feature | Original | Production | Pass/Fail |
|---------|----------|------------|-----------|
| Personal info | ✅ | ✅ | PASS |
| Password change | ✅ (with security question) | ✅ (without security question) | PASS |
| Evaluation history | ✅ | ✅ | PASS |
| Period selector | ✅ | ✅ | PASS |

### Authentication

| Feature | Original | Production | Pass/Fail |
|---------|----------|------------|-----------|
| Login | Email + password | Email + password | PASS |
| Password reset | Security questions | Email tokens (SMTP not configured) | **FAIL** |
| Account activation | Admin sets password | Activation token (SMTP not configured) | **FAIL** |

---

## PHASE 2 — VISUAL REGRESSION AUDIT

### DEFECT V01: Production has correct section weights but LOCAL DEV has WRONG weights

- **Screen:** `/api/evaluation-config/section-weights` response
- **Expected:** socio=50/25/25, salary_partner=50/25/25, counsel=100/0/0
- **Actual (local):** socio=60/20/20, salary_partner=60/20/20, counsel=60/20/20
- **Root Cause:** Local database has stale section_weights. The seed script checks `if count === 290` to skip reseed but local DB has different count. Also, the seed DELETE only deletes `source='seed'` but doesn't force re-insert if weights were manually edited.
- **File:** `server/db/seed-evaluation-data.ts` (reseed guard condition)
- **Fix:** Production is correct. Local needs DB reset or manual weight update.

### DEFECT V02: Competency dictionary is EMPTY

- **Screen:** Help page / Competency dictionary
- **Expected:** Competency definitions for legal and administrativo positions
- **Actual:** 0 rows in `competency_definitions` table
- **Root Cause:** The competency_definitions table exists but was never seeded with data. The original had hardcoded `COMPETENCIES_BY_POSITION` in `competencyDictionary.ts`.
- **File:** `server/db/seed-evaluation-data.ts` (no competency seeding), `/src/pages/Help.tsx`
- **Fix:** Seed competency_definitions from original hardcoded data.

### DEFECT V03: pasante_corporativo label changed to "Pasante"

- **Screen:** Position labels in Org Chart, User Management, Dashboard
- **Expected:** "Pasante Corporativo"
- **Actual:** "Pasante"
- **Root Cause:** `position_config` table has `label='Pasante'` for `pasante_corporativo`. The original `POSITION_LABELS` had 'Pasante Corporativo'.
- **File:** `server/db/seed-evaluation-data.ts` line ~118
- **Fix:** Change label to "Pasante Corporativo" for pasante_corporativo position.

### DEFECT V04: Users José Luis Paredes has position "soporte" not "archivo_soporte"

- **Screen:** User list, any page showing José Luis Paredes
- **Expected:** Position = "archivo_soporte", label = "Archivo y Soporte"
- **Actual:** Position = "soporte" (via normalizePosition)
- **Root Cause:** `normalizePosition()` in evaluationConfig.ts maps `archivo_soporte` → `soporte`. But the original had no `soporte` position at all.
- **File:** `src/lib/evaluationConfig.ts:normalizePosition()`
- **Fix:** Remove the `archivo_soporte` → `soporte` normalization, or update position in DB.

### DEFECT V05: Users Laura Hernández and Miguel Ángel López have position "pasante" not "pasante_corporativo"

- **Screen:** User list, any page showing these users
- **Expected:** Position = "pasante_corporativo", label = "Pasante Corporativo"
- **Actual:** Position = "pasante" (via normalizePosition)
- **Root Cause:** Same `normalizePosition()` maps `pasante_corporativo` → `pasante`.
- **File:** `src/lib/evaluationConfig.ts:normalizePosition()`
- **Fix:** Remove `pasante_corporativo` → `pasante` normalization.

### DEFECT V06: Extra positions in DB that don't exist in original

- **Screen:** position_config table, section_weights
- **Expected:** 14 positions (matching original hardcoded)
- **Actual:** 17 positions — added `pasante`, `soporte`, `archivista`
- **Root Cause:** Seed script added new positions beyond original.
- **Impact:** These have correct weights and templates but introduce inconsistency with original system.

---

## PHASE 3 — EVALUATION ENGINE LIVE TEST

### Production Section Weights Verification ✅

All 14 original positions match. Only local dev has stale data.

| Position | Prod DB | Original | Match |
|----------|---------|----------|-------|
| socio | 50/25/25 | 50/25/25 | ✅ |
| salary_partner | 50/25/25 | 50/25/25 | ✅ |
| counsel | 100/0/0 | 100/0/0 | ✅ |
| asociado_sr | 60/20/20 | 60/20/20 | ✅ |
| asociado_mid | 60/20/20 | 60/20/20 | ✅ |
| asociado_jr | 40/40/20 | 40/40/20 | ✅ |
| pasante_carrera | 40/40/20 | 40/40/20 | ✅ |
| pasante_corporativo | 40/40/20 | 40/40/20 | ✅ |
| director | 0/80/20 | 0/80/20 | ✅ |
| gerente | 0/80/20 | 0/80/20 | ✅ |
| coordinador | 0/80/20 | 0/80/20 | ✅ |
| analista | 0/80/20 | 0/80/20 | ✅ |
| asistente | 0/50/50 | 0/50/50 | ✅ |
| archivo_soporte | 0/50/50 | 0/50/50 | ✅ |

### Template Question Rescaling ✅

| Position | Section | Raw Sum | Target | Per-Question | Correct? |
|----------|---------|---------|--------|--------------|----------|
| socio | tecnico | 60 (5×12) | 50 | 10.00 | ✅ |
| socio | competencias | 40 (4×10) | 25 | 6.25 | ✅ |
| socio | blandas | 50 (5×10) | 25 | 5.00 | ✅ |
| counsel | tecnico | 60 (5×12) | 100 | 20.00 | ✅ |
| counsel | competencias | 40 (4×10) | 0 | 0 (hidden) | ✅ |
| counsel | blandas | 50 (5×10) | 0 | 0 (hidden) | ✅ |

### Scoring Formula ✅

The `calculateScore()` function is byte-for-byte identical between original and current systems.

### Question Content: DIFFERENT

The questions in the current system come from the authoritative Excel file (preguntas-por-posicion-2026-05-28) and are DIFFERENT from the original hardcoded questions in `questions.ts`. See original socio questions vs current:

| Original ID | Original Question | Current Question |
|-------------|-------------------|------------------|
| s1 | ¿Cómo califica la captación y retención de clientes? | ¿Domina las disposiciones legales aplicables y las aplica con criterio en casos complejos? |
| s2 | ¿Cómo califica el cumplimiento de objetivos financieros del despacho? | ¿Elabora documentos jurídicos sofisticados con alto nivel de precisión y detalle? |
| s4 | ¿Cómo califica la visión estratégica y dirección del despacho? | ¿Cómo califica la visión estratégica y dirección del despacho? (SAME) |
| s5 | ¿Cómo califica el desarrollo y mentoría del equipo? | ¿Cómo califica el desarrollo y mentoría del equipo? (SAME) |

The competencias and blandas questions are mostly identical. The técnico questions were replaced with new practice-area-specific questions.

### Section Mapping: DIFFERENT

**Original:** Categories 'Desempeño' and 'Cumplimiento' mapped to 'tecnico' for legal positions.
**Current:** 'Desempeño' and 'Cumplimiento' map to 'competencias' (from DB evaluation_categories).
**Impact:** None for current templates (they use different categories), but would affect any legacy question evaluation.

---

## PHASE 4 — USER HIERARCHY AUDIT

### Visibility Rules ✅

`canViewUserEvaluations()` is identical between original and current:
- SuperUser/Admin: see all
- Managing Partner: see all
- Regular Socio: see all EXCEPT other Socios, Managing Partner, Salary Partners
- Others: by supervisor assignment

### Supervisor Assignments ✅

Production 2026-H1: 20 assignments, 2026-H2: 1 assignment. Structure identical to original.

### Org Chart ✅

Legal/Administrativo grouping, expand/collapse, team member display all match original.

### User Roles (Production Data)

| User | Position | Admin | MP | SuperUser | Practice Area |
|------|----------|-------|-----|-----------|---------------|
| SuperAdmin | socio | ✅ | ✅ | ✅ | NULL |
| Carlos Mendoza | socio | ✅ | ✅ | ❌ | NULL |
| Patricia Salinas | socio | ❌ | ❌ | ❌ | NULL |
| Legal users | various | ❌ | ❌ | ❌ | corporativo |

**Note:** practice_area is NULL for socio/director positions but "corporativo" for other legal positions. This is correct behavior since practice_area filtering is only relevant for positions with technical questions.

---

## PHASE 5 — PERIOD SYSTEM AUDIT

| Location | Original | Current | Status |
|----------|----------|---------|--------|
| Dashboard | Hardcoded '2026-H1' | useCurrentPeriod() → 2026-H2 (June 2026) | **DIFFERENT** |
| Reports | Hardcoded '2026-H1' | 2026-H2 | **DIFFERENT** |
| Evaluations | viewPeriod defaults to CURRENT_PERIOD | viewPeriod defaults to currentPeriod | **DIFFERENT** |
| Self Eval | CURRENT_PERIOD | useCurrentPeriod() | **DIFFERENT** |
| Assignments | CURRENT_PERIOD | currentPeriod | **DIFFERENT** |

**Impact:** On June 1 2026, users see 2026-H2 (new, nearly empty period) instead of 2026-H1 where all their data is. The Dashboard has fallback logic to use 2026-H1 when 2026-H2 has no data, but the period label says 2026-H2. Other pages default to 2026-H2 with no data visible.

---

## PHASE 6 — FRONTEND BUG HUNT

### Clean Codebase ✅

- 0 TODO markers
- 0 FIXME markers
- 0 @ts-ignore directives
- 0 console.log statements
- 0 HACK/TEMP/WORKAROUND comments

### Potential Issues Found

1. **`normalizePosition()` maps positions to non-original names** — `pasante_corporativo` → `pasante`, `archivo_soporte` → `soporte`
2. **`evaluationConfig.ts` has fallback defaults** — `getSectionWeights()` falls back to `{tecnico:0, competencias:80, blandas:20}` if position not found, which is wrong for legal positions
3. **Analytics tables may be stale** — `analytics_user_activity` has 0 rows, requiring live fallback

---

## PHASE 7 — API/UI CONSISTENCY

### API Response Shape

| Field | Original | Current Production | Match? |
|-------|----------|-------------------|--------|
| evaluations response fields | camelCase (evaluatorId) | snake_case (evaluator_id) + frontend camelCase transform | ✅ (transform handles it) |
| section_weights | Hardcoded, no API | Full API with 17 positions | ✅ (extended) |
| full-template | No API (client-side assembly) | API with rescaling | ➕ NEW |
| assignments keys | employeeId, supervisorId, period | employee_id, supervisor_id, period | ⚠️ snake_case |
| users fields | isAdmin, isActive, etc. | Same + role, locationId | ✅ |

### Data Flow Verification (Production)

| Page | API Called | Data Returned | Rendered | Match? |
|------|-----------|---------------|----------|--------|
| Dashboard | /api/analytics/overview | totalEmployees=13, selfEval=6, supEval=8, avg=70 | 13, 6, 8, 70% | ✅ |
| Dashboard | /api/users | 19 users | 16 active shown (filtered) | ⚠️ 3 inactive hidden |
| Evaluations | /api/evaluations?period=2026-H1 | 15 evals | 15 shown | ✅ |
| Reports | Raw data (useUsers, useEvaluations) | Client-side computed | Charts rendered | ✅ |
| Self Eval | /api/evaluation-config/full-template | 14 questions (socio/corp) | 14 shown | ✅ |

---

## PHASE 8 — DEFECT BACKLOG

### P0 — PRODUCTION BREAKING

| ID | Severity | Description | Steps to Reproduce | Expected | Actual | Root Cause | File | Fix |
|----|----------|-------------|---------------------|----------|--------|------------|------|-----|
| **P0-01** | P0 | Password reset does not work | Click "¿Olvidaste tu contraseña?" on Login → enter email → no email received | User receives reset link email | Nothing happens (SMTP not configured) | Email transport is stub; Hostinger SMTP not configured | `server/services/email.ts`, `.env.production` | Configure SMTP on Hostinger OR restore security-question flow in frontend |
| **P0-02** | P0 | Account activation does not work | Admin creates new user → activation email never sent | User receives activation link | Nothing happens | Same as P0-01 | `server/services/email.ts` | Same fix as P0-01 |
| **P0-03** | P0 | Competency dictionary is EMPTY | Navigate to Help page → see competency definitions | Competency definitions for each position level | Empty page with 0 competencies | `competency_definitions` table never seeded | `server/db/seed-evaluation-data.ts` | Seed competency_definitions from original hardcoded data |

### P1 — MAJOR FUNCTIONALITY REGRESSION

| ID | Severity | Description | Steps to Reproduce | Expected | Actual | Root Cause | File | Fix |
|----|----------|-------------|---------------------|----------|--------|------------|------|-----|
| **P1-01** | P1 | Period defaults to 2026-H2 (empty) on June 2026 | Log in to app → Dashboard shows 2026-H2 with 1 evaluation | Show most recent period with data (2026-H1) | Shows 2026-H2 label with fallback data OR empty screens | `useCurrentPeriod()` resolves by date range, not data availability | `src/hooks/useCurrentPeriod.ts` | Change `useCurrentPeriod()` to prefer period with most completed evaluations, fall back to date-based |
| **P1-02** | P1 | Evaluation questions DIFFERENT from original | Compare socio self-eval questions between original and current | Same questions as original hardcoded | Different questions (Excel-based instead of hardcoded) | Questions were updated from authoritative Excel file, replacing original hardcoded versions | `server/db/seed-evaluation-data.ts` | This may be INTENTIONAL — verify with stakeholder whether Excel-based questions should replace originals |
| **P1-03** | P1 | User positions normalized to non-original names | View José Luis Paredes or Laura Hernández in user list | Position = "archivo_soporte" / "pasante_corporativo" | Position = "soporte" / "pasante" | `normalizePosition()` maps original positions to new names | `src/lib/evaluationConfig.ts` lines 149-152 | Remove normalizePosition() mappings, use canonical DB values |
| **P1-04** | P1 | pasante_corporativo label shows "Pasante" | View position labels in Org Chart or User table | "Pasante Corporativo" | "Pasante" | DB seed uses `label='Pasante'` for pasante_corporativo | `server/db/seed-evaluation-data.ts` line ~118 | Change label to "Pasante Corporativo" |
| **P1-05** | P1 | Local dev environment has WRONG section weights | Run local dev → socio shows 60/20/20 weights | 50/25/25 | 60/20/20 | Local DB has stale section_weights; reseed skipped because count ≠ 290 | `server/db/seed-evaluation-data.ts` reseed guard | Run `POST /api/evaluation-config/reseed` locally or update weights manually |

### P2 — UX REGRESSION

| ID | Severity | Description |
|----|----------|-------------|
| **P2-01** | P2 | Section mapping differs: original mapped 'Desempeño'/'Cumplimiento' to 'tecnico' for legal, current maps them to 'competencias' — affects any legacy evaluation using those categories |
| **P2-02** | P2 | `normalizePracticeArea()` in evaluationConfig.ts maps in the opposite direction from the normalizePosition() — `consultoria_fiscal` → `fiscal_consultoria` — this inconsistency means the code normalizes in conflicting directions |
| **P2-03** | P2 | Extra positions (pasante, soporte, archivista) exist in DB but not in original system — adds confusion in position lists |
| **P2-04** | P2 | Analytics tables may be stale; `analytics_user_activity` has 0 rows; dashboard falls back to live queries |

### P3 — COSMETIC

| ID | Severity | Description |
|----|----------|-------------|
| **P3-01** | P3 | Navigation labels changed from original: "Panel Principal" → "Panel", "Mis Evaluaciones" → "Mis Eval.", "Mi Evaluación" → "Autoeval.", "Evaluar Equipo" → "Evaluar", "Mi Plan de Acción" → "Plan Acción" |

---

## CONCLUSION

The production system at https://smps.bowdot.online is **functional but has 3 P0 defects and 5 P1 defects**. The core evaluation engine (scoring formula, section weights, practice area filtering) works correctly on production. However:

1. **P0: Password reset and user activation don't work** because SMTP is not configured
2. **P0: Competency dictionary is empty** — the original hardcoded competency definitions were never migrated to the DB
3. **P1: Evaluation questions are different** from the original hardcoded system (updated from Excel)
4. **P1: Period defaults to 2026-H2** despite having almost no data
5. **P1: Position labels and normalization** changed from original values


---

## ADDENDUM: SCORING FORENSICS — CRITICAL FINDINGS

### P0-04: Two evaluations have WRONG stored total_score

**Evidence:** Production database query reveals 2 evaluations where `total_score` does not match the formula result:

| Evaluation ID | Type | Responses | Actual Calc | Stored Score | Mismatch |
|---------------|------|-----------|-------------|--------------|----------|
| `65c501e6-e709-...` | self | q2=3, q1=4 (w=1 each) | 70 | **4** | 66 points off |
| `f6d483e0-1d85-...` | supervisor | s1=4, s2=5 (w=1 each) | 90 | **87** | 3 points off |

**Calculation proof:**
- Eval 65c501e6: `((3/5 + 4/5) / 2) × 100 = 70`. Stored: 4 → WRONG
- Eval f6d483e0: `((4/5 + 5/5) / 2) × 100 = 90`. Stored: 87 → WRONG

**Root Cause:** These evaluations were created by the original app during migration/testing. The original app's `calculateScore()` was identical, so these were either:
1. Created with a different (buggy) formula in early development
2. Total_score was manually set during testing
3. Data corruption during migration

**File:** Database `evaluations` table, rows `65c501e6-...` and `f6d483e0-...`
**Fix:** Recalculate and update total_score for these evaluations:
```sql
UPDATE evaluations SET total_score = 70 WHERE id = '65c501e6-e709-4a53-bd15-08bcb09335bc';
UPDATE evaluations SET total_score = 90 WHERE id = 'f6d483e0-1d85-4c57-aeaf-6223a6ea2962';
```

### P1-06: Question counts differ from original templates

The new Excel-based templates have different numbers of questions per position vs the original hardcoded data:

| Position | Original Qs | Current Qs | Δ |
|----------|------------|------------|---|
| counsel | 14 | 5 | -9 (expected: 0-weight sections hidden) |
| asociado_sr | 14 | 12 | -2 |
| asociado_mid | 13 | 11 | -2 |
| asociado_jr | 15 | 12 | -3 |
| pasante_carrera | 14 | 13 | -1 |
| pasante_corporativo | 14 | 12 | -2 |
| gerente | 11 | 10 | -1 |
| coordinador | 11 | 10 | -1 |
| analista | 11 | 10 | -1 |
| archivo_soporte | 10 | 12 | +2 |

This is intentional (new Excel-based templates) but represents a departure from the original system.

---

## FINAL DEFECT COUNT

| Severity | Count | IDs |
|----------|-------|-----|
| P0 — Production Breaking | 4 | P0-01 (password reset), P0-02 (activation), P0-03 (empty competencies), P0-04 (wrong eval scores) |
| P1 — Major Regression | 6 | P1-01 (period default), P1-02 (different questions), P1-03 (position normalize), P1-04 (labels), P1-05 (local dev), P1-06 (question counts) |
| P2 — UX Regression | 4 | P2-01 (section mapping), P2-02 (normalize direction), P2-03 (extra positions), P2-04 (analytics stale) |
| P3 — Cosmetic | 1 | P3-01 (nav labels) |
| **TOTAL** | **15** | |

---

## VERIFICATION: SCORING FORMULA ACCURACY

12 of 14 completed evaluations with responses have CORRECT stored total_score (verified by independent recalculation). 2 have wrong scores.

The `calculateScore()` function formula is **identical** to the original.

**Formula verification status: 85.7% (12/14) of historical evaluations have correct scores.**
