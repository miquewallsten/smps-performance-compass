# Foreign Key Audit Report

**Date:** 2026-06-01
**Database:** MariaDB 11.8.6, 39 tables

## Current Foreign Keys (3 total)

| Table | Column | References | Constraint |
|-------|--------|-----------|------------|
| password_reset_tokens | user_id | users.id | fk_prt_user |
| user_timeline | user_id | users.id | user_timeline_ibfk_1 |
| user_timeline | created_by | users.id | user_timeline_ibfk_2 |

## Complete FK Audit Matrix

### evaluations

| Column | Ref Table | Ref Column | FK Exists? | Should FK Exist? | Risk Level |
|--------|-----------|------------|-----------|------------------|------------|
| evaluator_id | users | id | NO | YES | HIGH |
| evaluated_id | users | id | NO | YES | HIGH |

### evaluation_responses

| Column | Ref Table | Ref Column | FK Exists? | Should FK Exist? | Risk Level |
|--------|-----------|------------|-----------|------------------|------------|
| evaluation_id | evaluations | id | NO | YES | CRITICAL |
| question_id | template_questions | question_id | NO | YES* | HIGH |

*question_id FK requires snapshot columns first; template_questions.question_id may change between periods.

### supervisor_assignments

| Column | Ref Table | Ref Column | FK Exists? | Should FK Exist? | Risk Level |
|--------|-----------|------------|-----------|------------------|------------|
| employee_id | users | id | NO | YES | HIGH |
| supervisor_id | users | id | NO | YES | HIGH |

### action_plans

| Column | Ref Table | Ref Column | FK Exists? | Should FK Exist? | Risk Level |
|--------|-----------|------------|-----------|------------------|------------|
| employee_id | users | id | NO | YES | HIGH |
| supervisor_id | users | id | NO | YES | MEDIUM |

### personal_objectives

| Column | Ref Table | Ref Column | FK Exists? | Should FK Exist? | Risk Level |
|--------|-----------|------------|-----------|------------------|------------|
| user_id | users | id | NO | YES | HIGH |
| reviewed_by | users | id | NO | YES | LOW |

### vacation_requests

| Column | Ref Table | Ref Column | FK Exists? | Should FK Exist? | Risk Level |
|--------|-----------|------------|-----------|------------------|------------|
| user_id | users | id | NO | YES | HIGH |

### sessions

| Column | Ref Table | Ref Column | FK Exists? | Should FK Exist? | Risk Level |
|--------|-----------|------------|-----------|------------------|------------|
| user_id | users | id | NO | DEFERRED | LOW |

*Sessions are ephemeral; FK would cascade-delete on user deletion which may be undesirable.

### copilot_conversations

| Column | Ref Table | Ref Column | FK Exists? | Should FK Exist? | Risk Level |
|--------|-----------|------------|-----------|------------------|------------|
| user_id | users | id | NO | YES | MEDIUM |

### copilot_messages

| Column | Ref Table | Ref Column | FK Exists? | Should FK Exist? | Risk Level |
|--------|-----------|------------|-----------|------------------|------------|
| conversation_id | copilot_conversations | id | NO | YES | MEDIUM |

### smart_action_items

| Column | Ref Table | Ref Column | FK Exists? | Should FK Exist? | Risk Level |
|--------|-----------|------------|-----------|------------------|------------|
| action_plan_id | action_plans | id | NO | YES | MEDIUM |

### evaluation_na_approvals

| Column | Ref Table | Ref Column | FK Exists? | Should FK Exist? | Risk Level |
|--------|-----------|------------|-----------|------------------|------------|
| evaluation_id | evaluations | id | NO | YES | MEDIUM |

### announcement_reads

| Column | Ref Table | Ref Column | FK Exists? | Should FK Exist? | Risk Level |
|--------|-----------|------------|-----------|------------------|------------|
| announcement_id | announcements | id | NO | YES | LOW |
| user_id | users | id | NO | YES | LOW |

### authentication_audit

| Column | Ref Table | Ref Column | FK Exists? | Should FK Exist? | Risk Level |
|--------|-----------|------------|-----------|------------------|------------|
| user_id | users | id | NO | NO* | N/A |

*Audit records must survive user deletion. FK with SET NULL is an option but adds complexity.

## Summary

| Category | Count |
|----------|-------|
| Existing FKs | 3 |
| Missing critical FKs | 6 |
| Missing high-priority FKs | 10 |
| Missing medium-priority FKs | 4 |
| Deferred (sessions) | 1 |
| Not recommended (audit) | 1 |
| **Total missing** | **21** |

## Risk Assessment

Without FKs:
- **Orphan records** can accumulate silently when users are deleted
- **Data corruption** can occur from application bugs without DB-level protection
- **Reporting errors** from joins returning unexpected NULLs
- **Cascade behavior** must be handled in application code (error-prone)
