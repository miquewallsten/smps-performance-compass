# SMPS Root Cause Analysis

**Date:** 2026-06-01

---

## R01 — Dashboard Missing Employee Status Table

**Category:** H — Missing implementation  
**Root Cause:** Dashboard.tsx was completely rewritten to use analytics API. The original Dashboard computed metrics from raw data and rendered per-employee status cards in `renderUserGroup()`. The current Dashboard only renders aggregate metrics from `useAnalyticsOverview()` and `useAnalyticsEvaluations()`. The per-employee list was never reimplemented.  
**Fix:** Add a "My Team" or "Evaluation Progress" section to Dashboard that shows per-employee status, grouped by Legal/Administrativo, exactly like the original.

---

## R02 — Reports Missing Area Filter

**Category:** A — Frontend bug  
**Root Cause:** Reports.tsx was rewritten using analytics API. The original had `areaFilter` state with filter buttons for "Todas las áreas", "Legal", "Administrativo". The current Reports.tsx does not include this filter.  
**Fix:** Add area filter state and filter buttons to Reports.tsx, filtering `evalAnalytics.byPosition` by legal/admin positions.

---

## R03 — Reports Missing Self-Eval By Position Chart

**Category:** A — Frontend bug  
**Root Cause:** The analytics API (`/api/analytics/evaluations`) returns `byPosition` with aggregate data, but the frontend doesn't render a per-position self-eval completion chart.  
**Fix:** Add a bar chart showing self-eval completion by position, similar to the original.

---

## R04 — Reports Missing Supervisor Eval By Position Chart

**Category:** A — Frontend bug  
**Root Cause:** Same as R03.  
**Fix:** Add a bar chart showing supervisor eval completion by position.

---

## R05 — Password Reset Does Not Work (No SMTP)

**Category:** F — Migration bug  
**Root Cause:** The authentication redesign replaced security-question-based password reset with email-based reset. The old flow (`POST /api/auth/security-question` → `POST /api/auth/reset-password`) still exists in the backend. The new flow (`POST /api/auth/request-password-reset` → `POST /api/auth/complete-password-reset`) requires SMTP to send emails. SMTP is not configured on Hostinger. The frontend only links to the new flow.  
**Fix Options:**
- Option A: Configure SMTP on Hostinger (recommended, permanent fix)
- Option B: Temporarily restore the security question password reset UI until SMTP is configured
- Option C: Add a fallback in the ForgotPassword page that shows the security question flow if email sending fails

---

## R06 — Historical Evaluation Responses Data Quality

**Category:** G — Data corruption  
**Root Cause:** When evaluations were first created in the system, the seed data had `weight=1` for all template questions, and `question_text` was not being stored in evaluation_responses. The seed was later fixed to have proper weights, but the 88 historical responses that were already created retain weight=1. All 160 historical responses have question_text=NULL because snapshotting was not implemented at creation time.  
**Impact:** When viewing historical evaluation details, the EvaluationViewer loads current template questions (which have proper weights and text) and matches them by question_id. The question text displays correctly from the template. The stored total_score was calculated with the weights that existed at creation time, so it's consistent with weight=1 (simple average).  
**Fix:** Backfill question_text and category in evaluation_responses from template_questions matching on question_id + position. Optionally recalculate total_score using proper weights.

---

## R07 — Practice Area Values In Old Format

**Category:** G — Data corruption  
**Root Cause:** Users were created with practice_area values like 'fiscal_consultoria' and 'fiscal_litigio', but template_questions uses 'consultoria_fiscal' and 'litigio_fiscal'. The `normalizePracticeArea()` function handles this mapping, so evaluations work correctly. However, the DB values are inconsistent.  
**Fix:** Run UPDATE statements:
```sql
UPDATE users SET practice_area = 'consultoria_fiscal' WHERE practice_area = 'fiscal_consultoria';
UPDATE users SET practice_area = 'litigio_fiscal' WHERE practice_area = 'fiscal_litigio';
```

---

## R08 — Test User "Prueba Martha"

**Category:** G — Data corruption  
**Root Cause:** Test user created during development.  
**Fix:** Deactivate:
```sql
UPDATE users SET is_active = 0 WHERE name = 'Prueba Martha';
```
Or delete after checking for foreign key references.

---

## PRIORITY ORDER FOR FIXES

1. **R06** — Backfill historical data (MEDIUM, data integrity)
2. **R05** — Fix password reset (HIGH, user-facing)
3. **R01** — Add employee status to Dashboard (MEDIUM, user-facing)
4. **R02** — Add area filter to Reports (MEDIUM, user-facing)
5. **R03/R04** — Add position charts to Reports (LOW, nice-to-have)
6. **R07** — Clean practice_area values (LOW, code handles it)
7. **R08** — Deactivate test user (LOW, admin action)
