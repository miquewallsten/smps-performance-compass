# Evaluation Security Model — SMPS Performance Compass

## Entity Structure

An evaluation has:
- **evaluator_id**: The person who created the evaluation (self = evaluated person, supervisor = their supervisor)
- **evaluated_id**: The person being evaluated
- **period**: The evaluation period (e.g., "2026-H1")
- **type**: Either `self` or `supervisor`
- **responses**: Array of question responses with scores, weights, NA flags
- **total_score**: Computed weighted score
- **completed_at**: When it was submitted
- **feedback_completed**: Whether feedback was given

## Who May View

### Self-Evaluation

| Who | Can View | Notes |
|-----|----------|-------|
| The evaluated employee | ✅ | Own evaluation |
| Assigned supervisor(s) | ✅ | Direct reports only |
| Socio | ✅ | Cannot see other socios' or managing partner's |
| Admin / SuperUser | ✅ | All |

### Supervisor Evaluation

| Who | Can View | Notes |
|-----|----------|-------|
| The evaluated employee | ✅ | They can see what was written about them |
| The evaluator (supervisor) | ✅ | Own evaluation |
| Other assigned supervisor(s) | ✅ | Same employee, same period |
| Uninvolved supervisor | ❌ | Not assigned to this employee |
| Socio | ✅ | Cannot see other socios' evaluations |
| Admin / SuperUser | ✅ | All |

### Historical Evaluations (Previous Periods)

Same rules apply. A supervisor can only see evaluations from periods where they were assigned to the employee.

### Evaluation Responses (Individual Question Answers)

Responses inherit the same visibility as their parent evaluation. There is no separate access control for individual question responses — if you can see the evaluation, you can see all its responses.

### Scoring Details

Same as responses. If you can see the evaluation, you can see the total score, individual question scores, weights, and NA flags.

### Comments

| Who | Can See | Notes |
|-----|---------|-------|
| The evaluated employee | ✅ | Self-comments always visible |
| The evaluator | ✅ | Own comments |
| Supervisor (for feedback) | Supervisor comments only | For their direct reports |
| Socio | ✅ | All comments for visible evaluations |
| Admin / SuperUser | ✅ | All |

Frontend code explicitly controls this:

```typescript
supervisorComments: (isSocio || isSupervisor(selectedEmployee)) ? supervisorComments : undefined,
```

A regular employee viewing their own evaluation does NOT see supervisor comments unless they are also a supervisor.

## Who May Edit

### Draft Evaluations

| Who | Can Edit | Notes |
|-----|----------|-------|
| The evaluator | ✅ | Own draft evaluation |
| Admin / SuperUser | ✅ | Any evaluation |
| Anyone else | ❌ | |

### Completed Evaluations

| Who | Can Edit | Notes |
|-----|----------|-------|
| The evaluator | ✅ | Can update scores and comments |
| Admin / SuperUser | ✅ | Any evaluation |
| Anyone else | ❌ | |

**CRITICAL GAP**: Currently any authenticated user can edit any evaluation (no authorization check). This must be fixed.

### Feedback

| Who | Can Complete | Notes |
|-----|-------------|-------|
| Assigned supervisor | ✅ | Only for their direct reports |
| Admin / SuperUser | ✅ | Any evaluation |
| Anyone else | ❌ | |

**CRITICAL GAP**: Currently any authenticated user can complete feedback.

### NA Approvals

| Who | Can Approve | Notes |
|-----|-------------|-------|
| Assigned supervisor | ✅ | Only for their direct reports |
| Admin / SuperUser | ✅ | Any evaluation |
| Anyone else | ❌ | |

**CRITICAL GAP**: Currently any authenticated user can approve NA flags.

## Who May Create

### Self-Evaluation

| Who | Can Create | Notes |
|-----|------------|-------|
| The evaluated employee | ✅ | Only for themselves (evaluator_id = evaluated_id) |
| Admin / SuperUser | ✅ | Can create on behalf of employee |

**CRITICAL GAP**: Currently any authenticated user can create a self-evaluation for any user.

### Supervisor Evaluation

| Who | Can Create | Notes |
|-----|------------|-------|
| Assigned supervisor | ✅ | Only for their assigned employee |
| Admin / SuperUser | ✅ | Any evaluation |
| Anyone else | ❌ | |

**CRITICAL GAP**: Currently any authenticated user can create a supervisor evaluation for any employee.

## Who May Delete

Evaluations cannot be deleted through the API. There is no DELETE endpoint for evaluations. This is correct — evaluations should be immutable once created.

## Who May Export

| Who | Can Export | Notes |
|-----|-----------|-------|
| Socio | ✅ | All visible evaluations |
| Admin / SuperUser | ✅ | All evaluations |
| Managing Partner | ✅ | All evaluations |
| Anyone else | ❌ | |

**Current implementation** uses a positional check (`user.position === 'socio'`) instead of role-based. This should be changed to check `user.role === 'admin' || user.role === 'super_user' || user.isManagingPartner`.

## Period Enforcement

Currently, the backend does NOT enforce evaluation period phases. A supervisor can submit evaluations outside the supervisor evaluation window. This is a business logic gap but not a security issue.

**Recommendation**: Add period phase validation to evaluation creation/update endpoints to ensure submissions only happen during the correct phase.

## Unique Constraint

Evaluations have a unique constraint on `(evaluator_id, evaluated_id, period, type)`. This prevents duplicate evaluations for the same person, same period, same type. This is correct and should be preserved.

## Score Integrity

The `total_score` is computed by the frontend and sent to the backend. The backend stores it as-is (`Math.round(totalScore)`). There is no server-side score validation or recalculation.

**Risk**: A malicious user could submit any `total_score` value that doesn't match their responses.

**Recommendation**: Either recalculate the score server-side (ideal) or at minimum validate that the score is within the valid range (0-100).

## Snapshot Integrity (Data Integrity Finding)

As confirmed in the production audit:

- `evaluation_responses.question_id` uses old-format IDs (like `s4`, `asr8`, `tc-corp-pct-1`)
- These IDs do NOT match the current `template_questions` (which use `seed-001` format) or `question_library` (which uses `ql-001` format)
- **100% of existing responses (170/170) are orphaned from their question definitions**

This means:
- Historical evaluations reference questions that no longer exist in their original form
- If a question's text or category is changed in the template, historical evaluations will display the new text
- There is no audit trail of what question text was shown at the time of evaluation

**Recommendation**: Add `question_text`, `category`, and `section` columns to `evaluation_responses` to freeze the question at the time of evaluation creation.
