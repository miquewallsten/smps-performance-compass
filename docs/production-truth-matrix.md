# SMPS PRODUCTION TRUTH MATRIX

**Date:** 2026-06-02  
**Method:** Production API dump + original ZIP comparison + codebase analysis  
**Production API:** https://smps.bowdot.online  
**Status:** INVESTIGATION ONLY — NO FIXES MADE

---

## EXECUTIVE SUMMARY

Production has **16 active defects** across the application. The evaluation engine (scoring formula, section weights, templates) is correct. The problems stem from: wrong stored scores, empty period defaulting, missing data (objectives), position name mismatches, and incomplete workflow coverage.

---

## SCREEN INVENTORY & TRUTH MATRIX

### 1. DASHBOARD

| Element | DB Has Data | API Returns | Hook Gets | Renders | Status |
|---------|-------------|-------------|-----------|---------|--------|
| Employee Count Card | ✅ 14 active | ✅ totalEmployees=13* | ✅ overview | ✅ 13 shown | ⚠️ Always 13 regardless of period |
| Self-Eval Completed | ✅ 6 (2026-H1) | ✅ selfEvalCompleted=6 | ✅ overview | Shows 1 (2026-H2) | **FAIL** — wrong period |
| Sup-Eval Completed | ✅ 9 (2026-H1) | ✅ supervisorEvalCompleted=8 | ✅ overview | Shows 0 (2026-H2) | **FAIL** — wrong period |
| Average Score | ✅ 70 (2026-H1) | ✅ avgScore=70 | ✅ overview | Shows 75 (2026-H2) | **FAIL** — wrong period |
| Per-Employee Status | ✅ 14 active users | ✅ users API | ✅ hook | ✅ group cards render | PASS |
| Legal/Admin Grouping | ✅ position_config | ✅ positions API | ✅ evalConfig | ✅ grouped | PASS |
| Level Filter | ✅ | N/A (client) | N/A | ✅ filter works | PASS |
| Period Display | 2026-H2 (June) | ✅ | ✅ | "Periodo: 2026-H2" | ⚠️ Shows empty period |
| Pending Evaluations | ✅ assignments exist | ✅ | ✅ | ✅ | PASS |

*\*totalEmployees counts all active non-superuser users globally, not period-scoped.*

**Root Cause:** `useCurrentPeriod()` resolves to 2026-H2. Dashboard fallback never triggers because `totalEmployees` is always 13 (global count). `hasCurrentData` check on `src/pages/Dashboard.tsx:43` is always true.

### 2. REPORTS

| Element | DB Has Data | API Returns | Hook Gets | Renders | Status |
|---------|-------------|-------------|-----------|---------|--------|
| Completion Pie | ✅ | ✅ raw evals | ✅ all evals | Shows 2026-H2 (0%) | **FAIL** — wrong period |
| Stage Bar Chart | ✅ | ✅ | ✅ | 0 self, 0 sup, 0 fb, 0 plan | **FAIL** — wrong period |
| Self-Eval by Position | ✅ data exists for H1 | ✅ | ✅ | Empty (H2) | **FAIL** — wrong period |
| Sup-Eval by Position | ✅ data exists for H1 | ✅ | ✅ | Empty (H2) | **FAIL** — wrong period |
| Avg by Position | ✅ data exists for H1 | ✅ | ✅ | Empty (H2) | **FAIL** — wrong period |
| Area Filter | N/A (client) | N/A | N/A | ✅ | PASS |
| CSV Export | ✅ | ✅ | ✅ | ✅ | PASS |

**Root Cause:** Reports uses `useCurrentPeriod()` (2026-H2). No period selector. No fallback to data-rich period.

### 3. EVALUATIONS PAGE

| Element | DB Has Data | API Returns | Hook Gets | Renders | Status |
|---------|-------------|-------------|-----------|---------|--------|
| Period Selector | ✅ 3 periods | ✅ | ✅ | ✅ defaults to 2026-H2 | ⚠️ Defaults to empty period |
| Employee List | ✅ | ✅ users + evals | ✅ | Only 2 users for H2 | **FAIL** — wrong period |
| Evaluation Viewer | ✅ | ✅ | ✅ | ✅ | PASS |
| Score Display | ✅ | ✅ | ✅ | ✅ | PASS (except wrong stored) |
| NA Approval | ✅ | ✅ | ✅ | ✅ | PASS |
| Feedback | ✅ 3 completed | ✅ | ✅ | ✅ | PASS |
| CSV Export | ✅ | ✅ | ✅ | ✅ | PASS |

**Note:** Evaluations fetches ALL evaluations (no period filter) and filters client-side. Users can manually switch to 2026-H1 to see data.

### 4. SELF EVALUATION

| Element | DB Has Data | API Returns | Hook Gets | Renders | Status |
|---------|-------------|-------------|-----------|---------|--------|
| Template Load | ✅ 290 questions | ✅ full-template API | ✅ useFullTemplate | ✅ questions rendered | PASS |
| Section Weights | ✅ correct | ✅ | ✅ | ✅ | PASS |
| Practice Area Filter | ✅ | ✅ | ✅ | ✅ | PASS |
| NA/Sin Elementos | ✅ | N/A (client) | N/A | ✅ | PASS |
| Score Calc | ✅ formula correct | N/A (client) | ✅ calcScore | ✅ | PASS |
| Submit | ✅ POST works | ✅ | ✅ | ✅ stores correctly | PASS |

**Current status for 2026-H2:** 0 self-evals submitted by active users. 9 active users in 2026-H1 never did self-eval.

### 5. ORG CHART

| Element | DB Has Data | API Returns | Hook Gets | Renders | Status |
|---------|-------------|-------------|-----------|---------|--------|
| Supervisor Cards | ✅ 21 asgn H2 | ✅ | ✅ | ✅ | PASS |
| Legal/Admin Grouping | ✅ position_config | ✅ | ✅ | ✅ | PASS |
| Team Members | ✅ | ✅ | ✅ | ✅ | PASS |
| Period Display | 2026-H2 | ✅ | ✅ | ✅ | PASS |

**Issues Found:**
- **Prueba Martha** (inactive director) appears in 2026-H2 assignments under Sandra Morales
- Mutual supervision: Carlos Mendoza ↔ Patricia Salinas, Carlos Mendoza ↔ Rafael Domínguez, Sandra Morales ↔ Fernando Ruiz

### 6. USERS (User Management)

| Element | DB Has Data | API Returns | Hook Gets | Renders | Status |
|---------|-------------|-------------|-----------|---------|--------|
| User List | ✅ 19 users | ✅ | ✅ | ✅ | PASS |
| Legal/Admin Groups | ✅ | ✅ | ✅ | ✅ | PASS |
| Search | N/A (client) | N/A | N/A | ✅ | PASS |
| Create/Edit/Delete | ✅ endpoint works | ✅ | ✅ | ⚠️ Activation needs SMTP | PARTIAL |

**Position Name Issues:**
- José Luis Paredes: position=`soporte` (original: `archivo_soporte`)
- Laura Hernández: position=`pasante` (original: `pasante_corporativo`)
- Lic. Carlos Mendoza: practice_area=`fiscal_consultoria` (old format)

### 7. SETTINGS

| Element | DB Has Data | API Returns | Hook Gets | Renders | Status |
|---------|-------------|-------------|-----------|---------|--------|
| Evaluation History | ✅ | ✅ | ✅ | ✅ | PASS |
| Password Change | ✅ endpoint works | ✅ | ✅ | ✅ | PASS |
| Period Selector | ✅ | ✅ | ✅ | ✅ defaults to H2 | ⚠️ Defaults empty |

### 8. OBJECTIVES

| Element | DB Has Data | API Returns | Hook Gets | Renders | Status |
|---------|-------------|-------------|-----------|---------|--------|
| Legal Objectives | ❌ EMPTY | ❌ [] | ❌ | Empty page | **FAIL** |
| Admin Objectives | ❌ EMPTY | ❌ [] | ❌ | Empty page | **FAIL** |

**DB has 0 objectives.** No objectives were ever created in the system.

### 9. VACATIONS

| Element | DB Has Data | API Returns | Hook Gets | Renders | Status |
|---------|-------------|-------------|-----------|---------|--------|
| Request List | Not tested | Not tested | Not tested | Not tested | UNVERIFIED |
| Create Request | Not tested | Not tested | Not tested | Not tested | UNVERIFIED |
| Approval Flow | Not tested | Not tested | Not tested | Not tested | UNVERIFIED |

### 10. ACTION PLANS

| Element | DB Has Data | API Returns | Hook Gets | Renders | Status |
|---------|-------------|-------------|-----------|---------|--------|
| Plan List | ✅ 3 plans | ✅ | ✅ | ✅ | PASS |
| Create/Submit | ✅ | ✅ | ✅ | ✅ | PASS |

**Coverage gap:** Only 3 action plans for 17 evaluations (18% coverage).

### 11. EVALUATION TEMPLATES

| Element | DB Has Data | API Returns | Hook Gets | Renders | Status |
|---------|-------------|-------------|-----------|---------|--------|
| Template List | ✅ 290 questions | ✅ | ✅ | ✅ | PASS |
| Section Weights | ✅ 17 positions | ✅ | ✅ | ✅ | PASS |
| Position Selector | ✅ | ✅ | ✅ | ✅ | PASS |
| Practice Area Tabs | ✅ | ✅ | ✅ | ✅ | PASS |

### 12. NOTIFICATIONS

| Element | DB Has Data | API Returns | Hook Gets | Renders | Status |
|---------|-------------|-------------|-----------|---------|--------|
| Unread Count | ✅ 0 | ✅ | ✅ | ✅ | PASS |
| Pending Actions | ✅ 0 for H2 | ✅ | ✅ | ✅ | PASS |

### 13. AUTHENTICATION

| Element | DB Has Data | API Returns | Hook Gets | Renders | Status |
|---------|-------------|-------------|-----------|---------|--------|
| Login | ✅ users table | ✅ token | ✅ | ✅ | PASS |
| Password Reset | ✅ tokens table | ✅ | ✅ | ❌ No email | **FAIL** — no SMTP |
| Activation | ✅ tokens table | ✅ | ✅ | ❌ No email | **FAIL** — no SMTP |

---

## PHASE 3 — BROKEN DATA FLOW ANALYSIS

### FAIL #1: Dashboard shows wrong period data

```
MySQL: 15 evals in 2026-H1, 1 eval in 2026-H2
    ↓
API /analytics/overview?period=2026-H2: {totalEmployees:13, selfEvalCompleted:1, ...}
API /analytics/overview?period=2026-H1: {totalEmployees:13, selfEvalCompleted:6, ...}
    ↓
Hook useAnalyticsOverview(currentPeriod): gets 2026-H2 data
    ↓
Component Dashboard.tsx:43: hasCurrentData = overview.totalEmployees > 0 → TRUE (always 13)
    ↓
RENDER: Shows 2026-H2 stats (1 self, 0 sup)
```

**Break Point:** `src/pages/Dashboard.tsx` line 43 — `hasCurrentData` check uses global `totalEmployees` instead of period-specific metrics.

### FAIL #2: Reports show empty data

```
MySQL: 15 evals in 2026-H1, 1 eval in 2026-H2
    ↓
Hook useEvaluations(): fetches ALL 17 evaluations
    ↓
Component Reports.tsx: filters by currentPeriod (2026-H2): 1 eval remains
    ↓
RENDER: 0 self completions, 0 sup completions, 0 feedback, 0 plans
```

**Break Point:** `src/pages/Reports.tsx` — no period selector, always uses `useCurrentPeriod()`.

### FAIL #3: Evaluations list shows minimal data

```
MySQL: 17 evals total, 15 in 2026-H1
    ↓
Hook useEvaluations(): fetches ALL 17 evaluations (no period filter)
    ↓
Component Evaluations.tsx:69: viewPeriod = useState(currentPeriod) → 2026-H2
    ↓
Line 465: ev.period !== viewPeriod → filters out all non-H2
    ↓
RENDER: 1 evaluation shown
```

**Break Point:** `src/pages/Evaluations.tsx` line 69 — `viewPeriod` defaults to 2026-H2.

### FAIL #4: 3 evaluations have wrong stored total_score

```
MySQL evaluations table:
  67d81b7b: total_score=75 → should be 70 (formula calc)
  6e8f5bd7: total_score=88 → should be 70 (formula calc)
  f6d483e0: total_score=87 → should be 90 (formula calc)
    ↓
API returns wrong scores
    ↓
Hook receives wrong scores
    ↓
Component renders wrong scores on Dashboard, Reports, EvaluationViewer
```

**Break Point:** Database `evaluations` table — stored total_score doesn't match formula.

### FAIL #5: Objectives completely empty

```
MySQL personal_objectives: 0 rows
    ↓
API /api/objectives: [] (empty array)
    ↓
Hook useObjectives: empty
    ↓
Component PersonalObjectives.tsx: empty page
```

**Break Point:** Database — no objectives created.

### FAIL #6: Password reset / activation don't work

```
API /api/auth/request-password-reset: creates token, returns OK
    ↓
server/services/email.ts: stub transport logs to console
    ↓
No email sent (SMTP not configured)
    ↓
User never receives reset link
```

**Break Point:** `server/services/email.ts` — stub email transport, no SMTP configured on Hostinger.

---

## PHASE 4 — EVALUATION DEEP AUDIT

### Score Integrity

| Evaluation | Period | Type | Stored | Calc | Match |
|------------|--------|------|--------|------|-------|
| 22f37d5a... | 2026-H1 | supervisor | 80 | 80 | ✅ |
| 2b54fc9c... | 2026-H1 | supervisor | 80 | 80 | ✅ |
| 2bd03bda... | 2026-H1 | self | 79 | 79 | ✅ |
| 60e7662f... | 2026-H1 | supervisor | 80 | 80 | ✅ |
| 65c501e6... | 2026-H1 | self | 70 | 70 | ✅ FIXED |
| 663aeb2a... | 2026-H1 | supervisor | 80 | 80 | ✅ |
| 67d81b7b... | 2026-H2 | self | 75 | 70 | ❌ MISMATCH |
| 685a5318... | 2026-H1 | self | 80 | 80 | ✅ |
| 6e8f5bd7... | 2025-H2 | self | 88 | 70 | ❌ MISMATCH |
| 758314d9... | 2026-H1 | self | 80 | 80 | ✅ |
| 76ca26af... | 2026-H1 | self | 80 | 80 | ✅ |
| 8cc7361d... | 2026-H1 | supervisor | 0 | — | ❌ 0 RESPONSES |
| 9c1c8fe9... | 2026-H1 | supervisor | 80 | 80 | ✅ |
| c5c5413c... | 2026-H1 | self | 80 | 80 | ✅ |
| d950b356... | 2026-H1 | supervisor | 80 | 80 | ✅ |
| e65a5a84... | 2026-H1 | supervisor | 80 | 80 | ✅ |
| f6d483e0... | 2026-H1 | supervisor | 87 | 90 | ❌ MISMATCH |

**Score integrity: 13/17 correct, 3 wrong, 1 empty = 76%**

### Mismatch Details

**67d81b7b (Emilio Castañeda, self, 2026-H2):**
- s3: score=5, w=8, NA=1 → NOT excluded (NA + score≠0)
- s4: score=2, w=8
- s1: score=3, w=10
- s2: score=4, w=9
- Calc: round((1.0×8 + 0.4×8 + 0.6×10 + 0.8×9)/35×100) = round(69.7) = **70**
- Stored: **75** — WRONG

**6e8f5bd7 (SuperAdmin, self, 2025-H2):**
- s2: score=3, w=1
- s1: score=4, w=1
- Calc: round((0.6+0.8)/2×100) = **70**
- Stored: **88** — GROSSLY WRONG

**f6d483e0 (SuperAdmin→Carlos Mendoza, supervisor, 2026-H1):**
- s1: score=4, w=1
- s2: score=5, w=1
- Calc: round((0.8+1.0)/2×100) = **90**
- Stored: **87** — WRONG

---

## PHASE 5 — ORG CHART AUDIT

### Supervisor Hierarchy (2026-H2)

| Supervisor | Team Members | Issues |
|------------|-------------|--------|
| Carlos Mendoza | Patricia Salinas, Roberto Figueroa, Diego Ramírez, Rafael Domínguez | Mutual with Patricia & Rafael |
| Patricia Salinas | Ana Lucía Torres, Carlos Mendoza | Mutual with Carlos |
| Rafael Domínguez | Carlos Mendoza, Verónica Campos, Sandra Morales, Fernando Ruiz | Mutual with Carlos & Verónica |
| Verónica Campos | Rafael Domínguez, José Luis Paredes, Gabriela Ortiz | Mutual with Rafael |
| Sandra Morales | Fernando Ruiz, Gabriela Ortiz, José Luis Paredes, **Prueba Martha** | Prueba Martha is INACTIVE |
| Fernando Ruiz | Sandra Morales | Mutual with Sandra |
| Ana Lucía Torres | Laura Hernández | OK |
| Roberto Figueroa | Diego Ramírez, Laura Hernández | OK |

### Inactive Users with Assignments

| User | Status | 2026-H1 | 2026-H2 |
|------|--------|---------|---------|
| Prueba Martha | INACTIVE | ✅ (assigned) | ✅ (assigned in H2!) |
| Emilio Castañeda | INACTIVE | ✅ | ❌ |
| Mariana Vega | INACTIVE | ✅ | ❌ |
| Miguel Ángel López | INACTIVE | ✅ | ❌ |

---

## PHASE 6 — PERIOD AUDIT

| Page | Period Resolved | Data Shown | Correct Period | Gap |
|------|----------------|-----------|----------------|-----|
| Dashboard | 2026-H2 | 1 self, 0 sup | 2026-H1 (15 evals) | ALL stats wrong |
| Reports | 2026-H2 | 0 completions | 2026-H1 (6 done) | ALL charts empty |
| Evaluations | 2026-H2 | 1 eval | 2026-H1 (15 evals) | List nearly empty |
| SelfEvaluation | 2026-H2 | New form | 2026-H2 (correct) | ✅ |
| OrgChart | 2026-H2 | 21 assignments | 2026-H2 (correct) | ✅ |
| Settings | 2026-H2 | History empty | User can switch | ⚠️ |
| Assignments | 2026-H2 | 21 assignments | 2026-H2 (correct) | ✅ |

---

## PHASE 7 — SORTING / PAGINATION

| Table | Sorting | Search | Pagination | Filters | Status |
|-------|---------|--------|------------|---------|--------|
| Users | ✅ by Legal/Admin + name | ✅ | ✅ client-side | ✅ level filter | PASS |
| Evaluations | ✅ by period + type | ❌ no search | ✅ client-side | ✅ period selector | PARTIAL |
| Assignments | Not tested | Not tested | Not tested | Not tested | UNVERIFIED |

---

## PHASE 8 — COMPLETE DEFECT BACKLOG

### P0 — PRODUCTION DATA CORRUPTION / BROKEN

| # | Severity | Screen | Description | File | Line |
|---|----------|--------|-------------|------|------|
| P0-01 | P0 | All | 3 evals have WRONG stored scores (67d81b7b=75→70, 6e8f5bd7=88→70, f6d483e0=87→90) | DB evaluations table | — |
| P0-02 | P0 | All | 1 eval completed with 0 responses (8cc7361d) | DB evaluations table | — |
| P0-03 | P0 | Objectives | Objectives table completely empty — 0 rows | DB personal_objectives | — |
| P0-04 | P0 | Login | Password reset doesn't send email (no SMTP) | server/services/email.ts | — |
| P0-05 | P0 | Login | Account activation doesn't send email (no SMTP) | server/services/email.ts | — |

### P1 — MAJOR FUNCTIONALITY REGRESSION

| # | Severity | Screen | Description | File | Line |
|---|----------|--------|-------------|------|------|
| P1-01 | P1 | Dashboard | Period defaults to 2026-H2 (empty); fallback broken because totalEmployees is global | Dashboard.tsx | 43 |
| P1-02 | P1 | Reports | All charts empty — defaults to 2026-H2, no period selector | Reports.tsx | 16 |
| P1-03 | P1 | Evaluations | Defaults to 2026-H2 showing 1 eval; must manually switch to H1 | Evaluations.tsx | 69 |
| P1-04 | P1 | Analytics | total_employees is global count, not period-scoped | analytics.ts | 57 |

### P2 — UX / DATA QUALITY

| # | Severity | Screen | Description |
|---|----------|--------|-------------|
| P2-01 | P2 | Org Chart | Inactive user Prueba Martha has assignments in 2026-H2 |
| P2-02 | P2 | Org Chart | 3 pairs of mutual supervisor assignments |
| P2-03 | P2 | Dashboard | 9 active users never did self-eval in 2026-H1 |
| P2-04 | P2 | Dashboard | 5 users have supervisor but never got evaluated |
| P2-05 | P2 | Action Plans | Only 3 plans for 17 evaluations (18%) |
| P2-06 | P2 | Users | Carlos Mendoza has practice_area="fiscal_consultoria" (old format) |

### P3 — COSMETIC

| # | Severity | Screen | Description |
|---|----------|--------|-------------|
| P3-01 | P3 | Users | José Luis Paredes position "soporte" instead of "archivo_soporte" |
| P3-02 | P3 | Users | Laura Hernández position "pasante" instead of "pasante_corporativo" |
| P3-03 | P3 | Nav | Navigation labels shortened from original |

---

## SUMMARY

| Severity | Count | Impact |
|----------|-------|--------|
| P0 | 5 | Data corruption, broken auth flows |
| P1 | 4 | Empty screens due to period default |
| P2 | 6 | Incomplete data, quality issues |
| P3 | 3 | Cosmetic label mismatches |
| **TOTAL** | **18** | **Evaluation engine correct, UX broken** |

**The evaluation engine (formula, weights, templates) is FUNCTIONALLY CORRECT. The production experience is BROKEN due to period defaults, corrupted scores, missing data, and auth gaps.**

