# SMPS Safe Fix Plan

**Date:** 2026-06-02
**Status:** PLAN ONLY — NO CHANGES MADE

---

## Executive Summary

This document consolidates every defect found across all audit phases into a prioritized, risk-assessed fix plan. The evaluation engine (templates, weights, scoring formula, hierarchy) remains LOCKED and will NOT be touched.

---

## P0 — PRODUCTION DATA CORRUPTION (FIX IMMEDIATELY)

### P0-01: Fix 3 wrong evaluation scores
- **Risk:** ZERO (formula-verified data correction)
- **Files:** NONE (SQL only)
- **Tables:** `evaluations`
- **Rollback:** Restore from backup
- **User Impact:** Dashboard/reports show correct scores

```sql
UPDATE evaluations SET total_score = 70 WHERE id = '67d81b7b-b8ea-4371-a2bc-63935ce23eeb';
UPDATE evaluations SET total_score = 70 WHERE id = '6e8f5bd7-c5f8-451b-be6d-9a1812a10f32';
UPDATE evaluations SET total_score = 90 WHERE id = 'f6d483e0-1d85-4c57-aeaf-6223a6ea2962';
```

### P0-02: Fix evaluation completed with 0 responses
- **Risk:** ZERO (reverts invalid state)
- **Files:** NONE (SQL only)
- **Tables:** `evaluations`
- **Rollback:** Restore from backup

```sql
UPDATE evaluations SET completed_at = NULL WHERE id = '8cc7361d-6e66-47ed-97a9-d1c408303e91';
```

### P0-03: Password reset doesn't work (no SMTP)
- **Risk:** LOW (new configuration, no code changes)
- **Files:** `.env` (production environment variables)
- **Tables:** NONE
- **Rollback:** Remove SMTP env vars
- **Steps:**
  1. Configure SMTP in Hostinger hPanel → Advanced → Node.js → Environment Variables
  2. Set: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  3. Restart application
  4. Test password reset flow

### P0-04: Account activation doesn't work (no SMTP)
- **Same fix as P0-03** — configuring SMTP resolves both

---

## P1 — MAJOR FUNCTIONALITY (FIX NEXT SPRINT)

### P1-01: Dashboard shows wrong period (empty 2026-H2)
- **Risk:** VERY LOW (1-line change, no engine impact)
- **Files:** `src/pages/Dashboard.tsx` line 43
- **Tables:** NONE
- **Rollback:** Revert the line change
- **Change:**
```typescript
// BEFORE:
const hasCurrentData = overview && (overview.totalEmployees > 0 || overview.selfEvalCompleted > 0);
// AFTER:
const hasCurrentData = overview && (overview.selfEvalCompleted > 0 || overview.supervisorEvalCompleted > 0);
```

### P1-02: Reports shows empty charts
- **Risk:** LOW (new hook, doesn't change evaluation engine)
- **Files:** 
  - `src/hooks/useDisplayPeriod.ts` (NEW)
  - `src/pages/Reports.tsx` — use useDisplayPeriod() 
- **Tables:** NONE
- **Rollback:** Revert files
- **Approach:** Create `useDisplayPeriod()` hook that resolves to most recent period with ≥ 3 completed evaluations

### P1-03: Evaluations page defaults to 2026-H2
- **Risk:** VERY LOW
- **Files:** `src/pages/Evaluations.tsx` line 69
- **Tables:** NONE
- **Change:** `useState(useCurrentPeriod())` → `useState(useDisplayPeriod())`

### P1-04: Analytics total_employees is global, not period-scoped
- **Risk:** LOW (server-side change, no client impact)
- **Files:** `server/db/migrate-analytics.ts` (analytics refresh logic)
- **Tables:** `analytics_period_summary` (already exists)
- **Change:** Count only users with assignments in the specific period

---

## P2 — DATA QUALITY (FIX AT LEISURE)

### P2-01: Inactive user Prueba Martha has assignments
```sql
DELETE FROM supervisor_assignments WHERE employee_id = 'cc53d905-...' AND period IN ('2026-H1', '2026-H2');
```

### P2-02: Mutual supervisor assignments (3 pairs)
Review and correct assignment data — ensure clear hierarchy.

### P2-03: 9 users missing self-eval in 2026-H1
Not a bug — these users never completed self-eval. Process/reminder issue.

### P2-04: 5 users have supervisor but no eval
Not a bug — supervisors didn't evaluate them. Process/reminder issue.

### P2-05: Only 3 action plans (18% coverage)
Not a bug — plans weren't created. Process/reminder issue.

### P2-06: Carlos Mendoza practice_area = "fiscal_consultoria"
```sql
UPDATE users SET practice_area = 'consultoria_fiscal' WHERE id = 'bc55dcc5-...';
```

---

## P3 — COSMETIC

### P3-01: José Luis Paredes position "soporte" → should be "archivo_soporte"
```sql
UPDATE users SET position = 'archivo_soporte' WHERE id = '53cc13bb-...';
```

### P3-02: Laura Hernández position "pasante" → should be "pasante_corporativo"
```sql
UPDATE users SET position = 'pasante_corporativo' WHERE id = '6a1da68a-...';
```

### P3-03: Miguel Ángel López position "pasante" → should be "pasante_corporativo"
```sql
UPDATE users SET position = 'pasante_corporativo' WHERE id = 'b5a2dc6d-...';
```

---

## Execution Order

| Phase | Items | Risk | Effort | Schedule |
|-------|-------|------|--------|----------|
| 1 | P0-01, P0-02 | NONE | 5 min | Immediate |
| 2 | P0-03, P0-04 | LOW | 30 min | This week |
| 3 | P1-01 | VERY LOW | 5 min | This sprint |
| 4 | P1-02, P1-03 | LOW | 2 hrs | This sprint |
| 5 | P1-04 | LOW | 1 hr | Next sprint |
| 6 | P2-01, P2-06, P3-01, P3-02, P3-03 | NONE | 5 min | This week |
| 7 | P2-02 | MEDIUM | 1 hr | Next sprint |
| 8 | Integrity monitoring | LOW | 4 hrs | Future |

---

## What REMAINS LOCKED

- ✅ template_questions (290 rows) — NO CHANGES
- ✅ question_library (84 rows) — NO CHANGES
- ✅ section_weights (17 rows) — NO CHANGES
- ✅ position_config (17 positions) — NO CHANGES
- ✅ evaluation_categories (24 categories) — NO CHANGES
- ✅ competency_definitions (35 rows) — NO CHANGES
- ✅ calculateScore() — NO CHANGES
- ✅ full-template endpoint — NO CHANGES
- ✅ visibility rules — NO CHANGES
- ✅ practice area filtering — NO CHANGES

