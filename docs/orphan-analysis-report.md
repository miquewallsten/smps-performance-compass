# Orphan Analysis Report

**Date:** 2026-06-01

## Findings

### CRITICAL: evaluation_responses.question_id — 170 orphans (100%)

| Metric | Value |
|--------|-------|
| Total evaluation_responses | 170 |
| Orphans (question_id not in template_questions) | 170 |
| Matching (question_id in template_questions) | 0 |
| Percentage orphaned | **100%** |

**Root Cause:** The `seedEvaluationData()` function in `server/db/seed-evaluation-data.ts` was run with `cleanupOldCustomQuestions()` which re-seeded `template_questions` with new `question_id` format (`seed-NNN`), replacing the old format (`tc-corp-pct-1`, `asr8`, `di1`, etc.). The existing `evaluation_responses` still reference the old question IDs.

**Impact:**
- All 17 historical evaluations have responses that cannot resolve their question text, category, or weight from `template_questions`
- The `weight` column in `evaluation_responses` does contain values (1-17), but question text and category are lost
- Reports that join evaluation_responses to template_questions return ZERO rows

**Affected Evaluations:** 15 out of 17 evaluations have orphaned responses (2 evaluations have only 2-4 responses each, the rest have 10-14)

**Recommended Action:**
1. Add snapshot columns to `evaluation_responses` (question_text, category, section, weight)
2. Backfill where possible from old template question data
3. For irrecoverable data, mark as recovered with best-available information
4. Prevent future orphans by snapshotting at evaluation creation time

### HIGH: evaluations.evaluated_id — 1 orphan

| Metric | Value |
|--------|-------|
| Orphan count | 1 |
| Evaluated ID | `62a06f95-11b8-4010-9b9d-1de28a3cf1e9` |
| Evaluation ID | `2780b6d3-ed52-44f4-aa3e-292db8e6f1e5` |
| Period | 2026-H1 |
| Type | supervisor |

**Root Cause:** The evaluated user `prueba@smps.com` was deleted during Phase 5E cleanup.

**Impact:** 12 evaluation_responses also reference this evaluation. The supervisor evaluation for this user is now orphaned.

**Recommended Action:** Delete the orphaned evaluation and its 12 evaluation_responses.

### HIGH: supervisor_assignments — 2 orphans

| Metric | Value |
|--------|-------|
| employee_id orphans | 1 |
| supervisor_id orphans | 1 |
| Orphan user ID | `62a06f95-11b8-4010-9b9d-1de28a3cf1e9` (prueba@smps.com) |

**Root Cause:** Same as above — deleted test user.

**Affected rows:**
- Assignment `bc533913...`: employee=62a06f95, supervisor=98af717c (rfigueroa)
- Assignment `b8763d9b...`: employee=98af717c (rfigueroa), supervisor=62a06f95

**Recommended Action:** Delete both orphaned assignment rows.

### MEDIUM: action_plans.employee_id — 1 orphan

| Metric | Value |
|--------|-------|
| Orphan count | 1 |
| Employee ID | `62a06f95-11b8-4010-9b9d-1de28a3cf1e9` |

**Root Cause:** Same — deleted test user.

**Recommended Action:** Delete the orphaned action plan and its smart_action_items.

### Zero Orphan Tables (Confirmed Clean)

| Table.Column | Count |
|-------------|-------|
| evaluation_responses.evaluation_id | 0 |
| evaluations.evaluator_id | 0 |
| action_plans.supervisor_id | 0 |
| sessions.user_id | 0 |
| copilot_conversations.user_id | 0 |
| copilot_messages.conversation_id | 0 |
| user_timeline.user_id | 0 |
| user_timeline.created_by | 0 |
| personal_objectives.user_id | 0 |
| vacation_requests.user_id | 0 |
| authentication_audit.user_id (non-null) | 0 |
| evaluation_na_approvals.evaluation_id | 0 |
| announcement_reads.user_id | 0 |
| smart_action_items.action_plan_id | 0 |

## Cleanup Plan

### Step 1: Delete orphans from deleted test user (62a06f95)

```sql
-- Delete orphaned evaluation_responses first (12 rows)
DELETE FROM evaluation_responses WHERE evaluation_id = '2780b6d3-ed52-44f4-aa3e-292db8e6f1e5';

-- Delete orphaned evaluation (1 row)
DELETE FROM evaluations WHERE evaluated_id = '62a06f95-11b8-4010-9b9d-1de28a3cf1e9';

-- Delete orphaned supervisor_assignments (2 rows)
DELETE FROM supervisor_assignments WHERE employee_id = '62a06f95-11b8-4010-9b9d-1de28a3cf1e9';
DELETE FROM supervisor_assignments WHERE supervisor_id = '62a06f95-11b8-4010-9b9d-1de28a3cf1e9';

-- Delete orphaned action_plan and its items (1 plan + items)
DELETE FROM smart_action_items WHERE action_plan_id IN (SELECT id FROM action_plans WHERE employee_id = '62a06f95-11b8-4010-9b9d-1de28a3cf1e9');
DELETE FROM action_plans WHERE employee_id = '62a06f95-11b8-4010-9b9d-1de28a3cf1e9';
```

### Step 2: Address 170 question_id orphans (snapshot migration)

This requires the snapshot preservation migration (PART C).

**Unrecoverable data:** The question text, category, and section for the old question IDs (tc-corp-pct-1, asr8, etc.) are LOST. The seed data was replaced. The only way to recover would be from a database backup taken before the re-seed, which does not exist.

**Best-effort backfill:** Use the question_id naming pattern to infer approximate categories:
- `tc-corp-*` → Competencias Corporativas
- `tc-cf-*` → Competencias Funcionales
- `asr*` → Aspectos de Resultado
- `di*` → Desarrollo Individual
- `s*` → Sin clasificar (various)
- `co*` → Comunicación
- `an*` → Análisis
- `pc*` → Pensamiento Crítico
