# SMPS Workflow-by-Workflow Functional Comparison
## Original Hardcoded App vs Current DB-Driven App

### Executive Summary

After an exhaustive side-by-side comparison of every workflow, the migration from hardcoded to database-driven is **functionally complete** for all core evaluation flows. Three critical bugs were found and fixed in this session:

1. **Section weights mismatch** (counsel=100/0/0, socio=50/25/25, salary_partner=50/25/25) — FIXED in DB and seed script
2. **Practice area filtering** (supervisor evaluations showed ALL tecnico questions instead of filtering by employee's practice area) — FIXED in Evaluations.tsx, EvaluationViewer.tsx
3. **Period filter bug** (NA approvals used `currentPeriod` instead of `viewPeriod`) — FIXED in Evaluations.tsx

---

## WORKFLOW 1: LOGIN & AUTHENTICATION

| Aspect | Original | Current | Match? |
|-------|----------|---------|--------|
| Login | Email + password via JWT | Email + password via JWT | ✅ |
| Password change | Security question fallback | Email-based reset (no SMTP yet) | ⚠️ Email not functional |
| Session management | JWT token in localStorage | JWT token in localStorage | ✅ |
| Account activation | Admin creates with password | Admin creates with activation link | ⚠️ Activation needs SMTP |
| User creation | Admin creates with password | Admin creates, user sets password | ✅ Improved |
| Password hashing | bcrypt | bcrypt | ✅ |
| Rate limiting | None | Added | ✅ Improved |
| Account enumeration | Login reveals different errors | Same error for all failures | ✅ Improved |

**Verdict**: Auth is improved except SMTP is not yet configured, so password reset and activation don't send emails.

---

## WORKFLOW 2: SELF-EVALUATION

| Aspect | Original | Current | Match? |
|-------|----------|---------|--------|
| Question source | `getQuestionsForUser(user)` from hardcoded data | `useFullTemplate(position, practiceArea)` from API | ✅ |
| Practice area filtering | `getTechnicalQuestions(position, area)` | API filters tecnico by practiceArea | ✅ |
| Section weights | `SECTION_WEIGHTS[position]` hardcoded | `section_weights` table, fetched via API | ✅ |
| Score calculation | `calculateScore()` client-side | Same `calculateScore()` function client-side | ✅ |
| NA handling | Supported | Supported | ✅ |
| Sin Elementos | Supported | Supported | ✅ |
| Period | `CURRENT_PERIOD` hardcoded | `useCurrentPeriod()` hook, DB-driven | ✅ |
| Draft saving | localStorage | localStorage | ✅ |
| Comments | Required, max 300 words | Required, max 300 words | ✅ |
| Phase stepper | Shows self→supervisor→feedback→action plan | Shows same phases | ✅ |

**Verdict**: ✅ Fully functional. Self-evaluation correctly uses practice area filtering and section weights.

---

## WORKFLOW 3: SUPERVISOR EVALUATION

| Aspect | Original | Current | Match? |
|-------|----------|---------|--------|
| Question source | `getQuestionsForUser(emp, customQuestions)` | `customQuestions[empPos]` filtered by practiceArea | ✅ (after fix) |
| Practice area filtering | Uses `emp.practiceArea` to filter tecnico | Now uses `emp.practiceArea` to filter tecnico | ✅ (after fix) |
| Visibility rules | Admin/socio see all, supervisors see team | Same rules | ✅ |
| Evaluation submission | POST to /api/evaluations | POST to /api/evaluations | ✅ |
| Question snapshots | No snapshot (questions reference IDs) | Snapshots question_text, category, section, weight | ✅ Improved |
| Score calculation | Client-side `calculateScore()` | Same function, server also calculates | ✅ |
| NA approval | Supervisor can approve/reject NA | Same, with audit logging | ✅ Improved |
| Period selection | `viewPeriod` state, period dropdown | Same, with period dropdown | ✅ |

**Verdict**: ✅ Functional after practice area fix. Supervisor evaluations now correctly filter questions by employee's practice area.

---

## WORKFLOW 4: EVALUATION VIEWING (EvaluationViewer)

| Aspect | Original | Current | Match? |
|-------|----------|---------|--------|
| Question display | Uses `getQuestionsForUser(evaluated)` | Uses `customQuestions[evalPos]` filtered by practiceArea | ✅ (after fix) |
| Section display | Sections shown based on weights | Same, sections with 0 weight hidden | ✅ |
| Score recalculation | On NA approval change | On NA approval change | ✅ |
| Practice area filtering | Filters by `evaluated.practiceArea` | Now filters by `evaluated.practiceArea` | ✅ (after fix) |

**Verdict**: ✅ Functional after practice area fix.

---

## WORKFLOW 5: SECTION WEIGHTS & SCORING

| Position | Original | Current (DB) | Match? |
|----------|----------|---------------|--------|
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

**Verdict**: ✅ All section weights now match the original exactly.

---

## WORKFLOW 6: POSITION HIERARCHY & LABELS

| Aspect | Original | Current | Match? |
|-------|----------|---------|--------|
| Legal hierarchy | `LEGAL_HIERARCHY` constant | `getLegalHierarchy()` from DB | ✅ |
| Admin hierarchy | `ADMIN_HIERARCHY` constant | `getAdminHierarchy()` from DB | ✅ |
| Position labels | `POSITION_LABELS` constant | `getPositionLabel()` from DB | ✅ |
| Position ranks | `POSITION_RANK` constant | `positionRank` from DB | ✅ |
| Custom positions | `CustomPosition` + `POSITION_CATALOG` | `custom_positions` table | ✅ |

**Verdict**: ✅ Fully functional.

---

## WORKFLOW 7: VISIBILITY RULES

| Rule | Original | Current | Match? |
|------|----------|---------|--------|
| SuperUser sees all | ✅ | ✅ | ✅ |
| Admin sees all | ✅ | ✅ (isAdminOrSocio includes admin) | ✅ |
| Managing Partner sees all | ✅ | ✅ (isManagingPartner check added) | ✅ Improved |
| Socio sees all except other Socios/Salary Partners | ✅ | ✅ Same `canViewUserEvaluations` logic | ✅ |
| Regular employee sees own + supervisor assignments | ✅ | ✅ Same logic | ✅ |
| Supervisor sees direct reports | ✅ | ✅ Same logic | ✅ |

**Verdict**: ✅ Visibility rules are identical.

---

## WORKFLOW 8: PERIOD MANAGEMENT

| Aspect | Original | Current | Match? |
|-------|----------|---------|--------|
| Current period | Hardcoded `CURRENT_PERIOD = '2026-H1'` | DB-driven via `useCurrentPeriod()` | ✅ Improved |
| Period phases | Hardcoded in types | DB-driven via `period_configs` table | ✅ Improved |
| Period selector | Not in original | Added in current | ✅ New feature |
| Period transition | Manual code change | DB configuration | ✅ Improved |

**Verdict**: ✅ Improved. Period management is now dynamic.

---

## WORKFLOW 9: DASHBOARD

| Aspect | Original | Current | Match? |
|-------|----------|---------|--------|
| Data source | Client-side calculation from fetched data | Analytics API (`useAnalyticsOverview`) | ⚠️ Different source |
| Period display | `CURRENT_PERIOD` constant | Current period from DB | ✅ |
| Period fallback | N/A (hardcoded) | Falls back to previous period with data | ✅ New feature |
| Hierarchy filtering | LEGAL/ADMIN filters | Same filters via `getLegalHierarchy()`/`getAdminHierarchy()` | ✅ |
| Evaluation counts | Direct count from data | `overview.selfEvalCompleted` etc. | ⚠️ Depends on analytics tables |
| Score display | Calculated per-user from evaluations | `overview.avgOverallScore` | ⚠️ Depends on analytics |
| Pending actions | None | Added via `usePendingActions()` | ✅ New feature |
| Notifications | None | Added via `useUnreadNotificationCount()` | ✅ New feature |

**Verdict**: ⚠️ Dashboard uses analytics API instead of direct data. This is architecturally better but depends on analytics refresh being current. Needs verification that analytics tables are refreshed regularly.

---

## WORKFLOW 10: ORG CHART

| Aspect | Original | Current | Match? |
|-------|----------|---------|--------|
| Data source | `useAssignments(CURRENT_PERIOD)` | `useAssignments(currentPeriod)` | ✅ |
| Access control | Admin/socio only | Admin/socio/managing_partner | ✅ |
| Supervisor display | Grouped by LEGAL_HIERARCHY then ADMIN_HIERARCHY | Same grouping via `getLegalHierarchy()`/`getAdminHierarchy()` | ✅ |
| Expand/collapse | Per-supervisor card | Same | ✅ |

**Verdict**: ✅ Functionally identical.

---

## WORKFLOW 11: REPORTS

| Aspect | Original | Current | Match? |
|-------|----------|---------|--------|
| Data source | Client-side calculation | Analytics API + direct queries | ⚠️ Different architecture |
| Period filter | Hardcoded periods | DB-driven periods | ✅ |
| Level filter | Legal/Administrativo | Same | ✅ |
| Score display | Per-user averages | Per-user averages from analytics | ⚠️ Depends on analytics |
| Export | CSV | CSV | ✅ |

**Verdict**: ⚠️ Reports depend on analytics tables. Original calculated everything client-side from raw data.

---

## WORKFLOW 12: USER MANAGEMENT

| Aspect | Original | Current | Match? |
|-------|----------|---------|--------|
| User creation | Admin creates with password | Admin creates, user activates via email | ⚠️ Email not functional |
| Password reset | Security question | Email-based token | ⚠️ Email not functional |
| Role management | isAdmin, isSuperUser, isManagingPartner | Same + role field | ✅ |
| Practice area | Set on creation | Set on creation | ✅ |
| Deactivation | Sets is_active = 0 | Same | ✅ |
| User list | Admin only | Admin/socio/managing_partner | ✅ |
| Evaluation modal | Not in original | Added in current | ✅ New feature |

**Verdict**: ⚠️ New user activation and password reset require SMTP. Legacy password reset still works.

---

## WORKFLOW 13: EVALUATION TEMPLATES (ADMIN)

| Aspect | Original | Current | Match? |
|-------|----------|---------|--------|
| Question editing | Seed overrides + custom questions | DB-driven template_questions + question_library | ✅ Improved |
| Practice area tabs | Not in original | Added for legal positions | ✅ New feature |
| Section weights editing | Not editable | Editable via admin UI | ✅ New feature |
| Reseed capability | Not available | Available via /api/evaluation-config/reseed | ✅ |

**Verdict**: ✅ Improved. Template management is now fully DB-driven.

---

## WORKFLOW 14: COMPETENCY DICTIONARY (HELP PAGE)

| Aspect | Original | Current | Match? |
|-------|----------|---------|--------|
| Data source | Hardcoded `COMPETENCIES_BY_POSITION` | DB `competency_definitions` table | ✅ |
| Grouping | By position | By position_level (comma-separated) | ✅ Functionally equivalent |
| Content | Same competency names and definitions | Same content | ✅ |

**Verdict**: ✅ Functionally identical.

---

## WORKFLOW 15: ACTION PLANS

| Aspect | Original | Current | Match? |
|-------|----------|---------|--------|
| Creation | Text-based | Text-based with SMART items | ✅ Improved |
| Approval flow | Not in original | Added (pending/approved/rejected) | ✅ New feature |
| Period association | Per period | Per period | ✅ |

**Verdict**: ✅ Improved.

---

## WORKFLOW 16: PERSONAL OBJECTIVES

| Aspect | Original | Current | Match? |
|-------|----------|---------|--------|
| Legal objectives | 15 metrics | Same structure | ✅ |
| Admin objectives | Up to 5 with % avance | Same structure | ✅ |
| Period filter | CURRENT_PERIOD | currentPeriod from DB | ✅ |

**Verdict**: ✅ Functionally identical.

---

## WORKFLOW 17: VACATIONS

| Aspect | Original | Current | Match? |
|-------|----------|---------|--------|
| Request creation | Employee creates request | Same | ✅ |
| Approval flow | Supervisor approves | Same with multi-approval | ✅ |
| Vacation config | Per-position days | Same from DB | ✅ |
| Extra days | Admin can add | Same | ✅ |

**Verdict**: ✅ Functionally identical.

---

## KNOWN REMAINING ISSUES

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | SMTP not configured — activation/password reset emails can't send | HIGH | New users can't self-activate; password reset doesn't work via email |
| 2 | Historical evaluation responses have NULL question_text (160/160) | MEDIUM | Viewing old evaluations shows questions from current template, not snapshot |
| 3 | Dashboard defaults to 2026-H2 (nearly empty period) | MEDIUM (UX) | Users see empty dashboard until they select 2026-H1 |
| 4 | @tanstack/react-query-devtools visible in production | LOW | Developer tools visible to users |
| 5 | No MFA | LOW (deferred) | Acceptable for 14-user internal system |

---

## SUMMARY

| Category | Status |
|----------|--------|
| Self-Evaluation | ✅ Fully functional |
| Supervisor Evaluation | ✅ Fully functional (after practice area fix) |
| Evaluation Viewing | ✅ Fully functional (after practice area fix) |
| Section Weights | ✅ Matches original exactly |
| Position Hierarchy | ✅ DB-driven, matches original |
| Visibility Rules | ✅ Identical to original |
| Period Management | ✅ Improved (DB-driven) |
| Dashboard | ⚠️ Uses analytics API (needs verification) |
| Org Chart | ✅ Identical to original |
| Reports | ⚠️ Uses analytics API (needs verification) |
| User Management | ⚠️ Activation flow needs SMTP |
| Evaluation Templates | ✅ Improved (DB-driven) |
| Competency Dictionary | ✅ Identical to original |
| Action Plans | ✅ Improved |
| Objectives | ✅ Identical |
| Vacations | ✅ Identical |
| Authentication | ✅ Improved (but SMTP needed) |
| Notifications | ✅ New feature |

