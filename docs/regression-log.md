# SMPS Regression Log

**Date:** 2026-06-01  
**Method:** Production API testing + code comparison

---

## REGRESSION R01 — Dashboard Missing Employee Status Table

**Page:** Dashboard  
**Workflow:** View evaluation progress per employee  
**Expected behavior:** Original Dashboard showed expandable cards per Legal/Administrativo group, listing every employee with their position, self-eval status (✓ or pending), and supervisor eval status. Clicking "Evaluar" navigated to the evaluation form.  
**Actual behavior:** Current Dashboard shows aggregate metrics (totalEmployees, selfEvalCompleted, supervisorEvalCompleted) but no per-employee list.  
**Root cause:** Dashboard was rewritten to use analytics API instead of computing from raw data. The employee-by-employee view was not reimplemented.  
**File:** `src/pages/Dashboard.tsx` — original had `renderUserGroup()` with per-employee status, current only has `StatCard` components.  
**Severity:** MEDIUM  
**Category:** H — Missing implementation  

---

## REGRESSION R02 — Reports Missing Area Filter

**Page:** Reports  
**Workflow:** Filter report by Legal/Administrativo  
**Expected behavior:** Original Reports had 3 filter buttons: "Todas las áreas", "Legal", "Administrativo" that filtered `baseUsers` by `POSITION_LEVELS`.  
**Actual behavior:** Current Reports has no area filter.  
**Root cause:** Reports.tsx was rewritten using analytics API. The `areaFilter` state and `filterByHierarchy()` were not carried over.  
**File:** `src/pages/Reports.tsx` — original had `areaFilter` state and filter buttons, current does not.  
**Severity:** MEDIUM  
**Category:** A — Frontend bug  

---

## REGRESSION R03 — Reports Missing Self-Eval By Position Chart

**Page:** Reports  
**Workflow:** View self-evaluation completion by position  
**Expected behavior:** Original had "Autoevaluaciones por Nivel" bar chart showing completado/pendiente for each position.  
**Actual behavior:** Current has "Calificaciones" section showing avgScore by type (self/supervisor) but not by position.  
**Root cause:** Analytics API doesn't provide self-eval by position breakdown, or frontend doesn't consume it.  
**File:** `src/pages/Reports.tsx`  
**Severity:** LOW  
**Category:** A — Frontend bug  

---

## REGRESSION R04 — Reports Missing Supervisor Eval By Position Chart

**Page:** Reports  
**Workflow:** View supervisor evaluation completion by position  
**Expected behavior:** Original had "Evaluaciones de Evaluadores por Nivel" bar chart.  
**Actual behavior:** Not present in current.  
**Root cause:** Same as R03.  
**File:** `src/pages/Reports.tsx`  
**Severity:** LOW  
**Category:** A — Frontend bug  

---

## REGRESSION R05 — Password Reset Does Not Work (No SMTP)

**Page:** Login → Forgot Password  
**Workflow:** User clicks "¿Olvidaste tu contraseña?" → enters email → expects reset link  
**Expected behavior:** Original used security questions (email → question → answer → new password). Current should use email-based reset tokens.  
**Actual behavior:** Current routes to /forgot-password which calls `/api/auth/request-password-reset`. This generates a token but cannot send email because SMTP is not configured. The old security-question flow still exists in the backend but the frontend no longer links to it.  
**Root cause:** SMTP not configured on Hostinger. Email-based password reset is implemented but cannot deliver emails.  
**File:** `server/services/email.ts` (stub transport), `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx`  
**Severity:** HIGH  
**Category:** F — Migration bug  

---

## REGRESSION R06 — Historical Evaluation Responses Have NULL question_text and weight=1

**Page:** Evaluation Viewer (viewing historical evaluations)  
**Workflow:** Admin views evaluation detail for 2026-H1 period evaluations  
**Expected behavior:** Each response should show the question text and its rescaled weight.  
**Actual behavior:** 88 out of 160 historical evaluation_responses have weight=1 (unrescaled), and all 160 have question_text=NULL. 75 have category="Sin Clasificar".  
**Root cause:** These evaluations were created when the seed data had weight=1 and question_text was not being stored. The seed was later fixed but historical data was not backfilled.  
**File:** Database `evaluation_responses` table  
**Severity:** MEDIUM  
**Category:** G — Data corruption  

---

## REGRESSION R07 — Practice Area Values In Old Format

**Page:** Self-Evaluation, Evaluations  
**Workflow:** Load template for a user with practice_area='fiscal_consultoria' or 'fiscal_litigio'  
**Expected behavior:** Questions load correctly for the user's practice area.  
**Actual behavior:** Code normalizes these correctly via `normalizePracticeArea()`, so it works. But the DB stores non-canonical values.  
**Root cause:** Users were created/migrated with practice_area values that don't match the canonical form used in template_questions.  
**File:** `users` table: practice_area='fiscal_consultoria' (should be 'consultoria_fiscal'), practice_area='fiscal_litigio' (should be 'litigio_fiscal')  
**Severity:** LOW (code handles it)  
**Category:** G — Data corruption  

---

## REGRESSION R08 — Test User "Prueba Martha" Still Active

**Page:** Users, Dashboard  
**Workflow:** Admin views user list  
**Expected behavior:** Test users should be deactivated or removed.  
**Actual behavior:** "Prueba Martha" (position: director) is active with completed evaluations.  
**Root cause:** Test user was created during development and never cleaned up.  
**File:** Database `users` table  
**Severity:** LOW  
**Category:** G — Data corruption  

---

## NON-REGRESSIONS (Verified Working)

1. ✅ Evaluation scoring formula is identical
2. ✅ Section weights match original for all positions
3. ✅ Template questions are present and correct
4. ✅ Practice area filtering works
5. ✅ Supervisor assignments are correct
6. ✅ Visibility rules are identical
7. ✅ Period system works (DB-driven improvement)
8. ✅ Org chart works
9. ✅ Self-evaluation flow works
10. ✅ Supervisor evaluation flow works
11. ✅ NA and Sin Elementos handling works
12. ✅ Action plans work
13. ✅ Vacations work
14. ✅ Objectives work
15. ✅ Authorization middleware works (403 for employee accessing users)
16. ✅ Change password works
17. ✅ Period config CRUD works
18. ✅ Full template API returns correct weights (verified: socio/corporativo = 50/25/25 with proper rescaling)
