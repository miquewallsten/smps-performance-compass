# SMPS Side-by-Side Comparison: Original vs Current

## Executive Summary

The migration from hardcoded to database-driven is **largely successful**. Core functionality is preserved:
- ✅ Questions by position and practice area
- ✅ Section weights per position (now fixed)
- ✅ Position hierarchy and labels
- ✅ Evaluation creation, viewing, scoring
- ✅ Self-evaluation flow
- ✅ Supervisor evaluation flow
- ✅ Period configuration
- ✅ Competency dictionary
- ✅ Practice area tabs for legal positions
- ✅ Visibility rules
- ✅ Org chart
- ✅ User management
- ✅ Vacations
- ✅ Action plans

## Critical Fixes Applied This Session

| Issue | Original | Current (Before) | Current (After) | Status |
|-------|----------|-------------------|-----------------|--------|
| Counsel section weights | 100/0/0 | 60/20/20 | 100/0/0 | ✅ FIXED |
| Socio section weights | 50/25/25 | 60/20/20 | 50/25/25 | ✅ FIXED |
| Salary Partner section weights | 50/25/25 | 60/20/20 | 50/25/25 | ✅ FIXED |
| Practice area filter (supervisor eval) | `getQuestionsForUser()` filters by practiceArea | ALL tecnico questions shown regardless of practiceArea | Filtered by employee's practiceArea | ✅ FIXED |
| Practice area filter (NA approvals) | N/A (used same questions) | ALL tecnico questions shown | Filtered by evaluated's practiceArea | ✅ FIXED |
| Practice area filter (EvaluationViewer) | `getQuestionsForUser()` filters by practiceArea | ALL tecnico questions shown | Filtered by evaluated's practiceArea | ✅ FIXED |
| NA approvals period filter | N/A (single period) | Uses `currentPeriod` (2026-H2) | Uses `viewPeriod` | ✅ FIXED |
| User practice_area values | `consultoria_fiscal`/`litigio_fiscal` | `fiscal_consultoria`/`fiscal_litigio` (wrong) | `consultoria_fiscal`/`litigio_fiscal` (correct) | ✅ FIXED |
| Seed data section weights | counsel=100/0/0, socio=50/25/25 | counsel=60/20/20, socio=60/20/20 | counsel=100/0/0, socio=50/25/25 | ✅ FIXED |

## Known Remaining Issues

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Historical evaluation responses have NULL question_text (160/160) | MEDIUM | Unrecoverable - historical data |
| 2 | Dashboard defaults to 2026-H2 (nearly empty period) | MEDIUM | UX needs period selector defaulting to most recent period with data |
| 3 | No SMTP configured - activation/password reset emails can't send | MEDIUM | Needs SMTP setup |
| 4 | xlsx module causes SyntaxError in server.cjs | LOW | Need `--external:xlsx` in esbuild |
| 5 | @tanstack/react-query-devtools visible in production | LOW | Should be devDependency |
| 6 | No MFA | MEDIUM | Deferred per product decision |
| 7 | Seed script count check is 290 (fragile) | LOW | Will break if re-seeded with different data |

## Architecture Comparison

| Feature | Original | Current | Match? |
|---------|----------|---------|--------|
| Questions by position | Hardcoded in `questions.ts` | DB-driven via `template_questions` + `question_library` | ✅ Working |
| Technical questions by area | Hardcoded in `technicalQuestions.ts` | DB-driven via `template_questions` (practice_area column) | ✅ Working |
| Section weights | Hardcoded in `sectionWeights.ts` | DB-driven via `section_weights` table | ✅ Working (after fix) |
| Position labels | Hardcoded `POSITION_LABELS` | DB-driven via `position_config` table | ✅ Working |
| Position hierarchy | Hardcoded `LEGAL_HIERARCHY`/`ADMIN_HIERARCHY` | DB-driven via `getLegalHierarchy()`/`getAdminHierarchy()` | ✅ Working |
| Period | Hardcoded `CURRENT_PERIOD = '2026-H1'` | DB-driven via `useCurrentPeriod()` hook | ✅ Working |
| Competency dictionary | Hardcoded in `competencyDictionary.ts` | DB-driven via `competency_definitions` table | ✅ Working |
| Visibility rules | `canViewUserEvaluations()` in `visibility.ts` | Same file, identical logic | ✅ Working |
| App context | `AppContext` with all state in localStorage | API-driven with React Query | ✅ Working |
| Mock data | `mockData.ts` with sample users/assignments | Removed, uses real DB | ✅ Working |
| Evaluation creation | Client-side, stored in localStorage | API calls to server, stored in DB | ✅ Working |
| Supervisor assignments | Hardcoded in mockData | DB-driven via `supervisor_assignments` table | ✅ Working |
| Authentication | Security questions | JWT + activation links + email reset | ✅ Improved |
| Password reset | Security question flow | Email-based token flow | ✅ Improved |
| Notifications | None | Full notification system with bell icon | ✅ New feature |
| Analytics | Client-side calculation from local data | Server-side analytics tables | ✅ Improved |
| Copilot | Basic AI chat | Enhanced with tools, knowledge base | ✅ Improved |
| Reports | Client-side calculation | Analytics API-driven | ✅ Working |
| Export | Basic CSV | CSV + role-aware filtering | ✅ Improved |

## Functional Comparison Detail

### Self-Evaluation Flow
| Step | Original | Current | Match? |
|------|----------|---------|--------|
| Questions loaded | `getQuestionsForUser(user)` | `useFullTemplate(position, practiceArea)` API | ✅ |
| Practice area filtering | Technical questions filtered by `user.practiceArea` | API filters by `practiceArea` param | ✅ |
| Section weight application | `SECTION_WEIGHTS[position]` rescaled | DB `section_weights` rescaled via API | ✅ |
| Score calculation | `calculateScore()` client-side | `calculateScore()` client-side (identical) | ✅ |
| NA handling | Supported | Supported | ✅ |
| Sin Elementos | Supported | Supported | ✅ |

### Supervisor Evaluation Flow
| Step | Original | Current | Match? |
|------|----------|---------|--------|
| Questions loaded | `getQuestionsForUser(emp)` | `customQuestions[empPos]` filtered by practiceArea | ✅ (after fix) |
| Practice area filtering | Technical questions filtered by `emp.practiceArea` | Now filters by `emp.practiceArea` | ✅ (after fix) |
| Visibility rules | Admin/socio see all, supervisors see their team | Same logic | ✅ |
| Period filtering | `CURRENT_PERIOD` constant | `useCurrentPeriod()` hook | ✅ |
| NA approvals | Available for supervisors | Available (period filter fixed) | ✅ (after fix) |

### Evaluation Scoring
| Position | Original Weights | Current Weights (DB) | Match? |
|----------|-----------------|---------------------|--------|
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

### Additional Positions (Not in Original)
| Position | Current Weights | Notes |
|----------|----------------|-------|
| pasante | 40/40/20 | Generic pasante |
| archivista | 0/50/50 | Same as archivo_soporte |
| soporte | 0/50/50 | Same as archivo_soporte |

These additional positions don't exist in the original but are reasonable additions.
