# Frontend/API Contract Audit

## API Response Shape Comparison

### GET /api/evaluations

**Original response shape:**
```typescript
{
  id, evaluator_id, evaluated_id, period, type, 
  comments, supervisor_comments, total_score, 
  completed_at, feedback_completed, created_at,
  responses: [{ id, evaluation_id, question_id, score, not_applicable, no_elements }],
  naApprovals: [{ evaluation_id, question_id, approved }]
}
```

**Current response shape:**
```typescript
{
  id, evaluator_id, evaluated_id, period, type,
  comments, supervisor_comments, total_score,
  completed_at, feedback_completed, feedback_completed_at, feedback_completed_by,
  created_at,
  responses: [{ id, evaluation_id, question_id, question_text, category, section, question_type, score, not_applicable, no_elements, weight }],
  naApprovals: [{ id, evaluation_id, question_id, approved, approved_by, approved_at }]
}
```

**Differences:**
- ✅ Added `feedback_completed_at`, `feedback_completed_by` (new fields)
- ✅ Added `question_text`, `category`, `section`, `question_type`, `weight` in responses (snapshot)
- ✅ Added `approved_by`, `approved_at` in NA approvals (audit trail)
- ⚠️ `question_text` is NULL for all historical responses

### GET /api/users

**Original:** Returns users with `isSuperUser`, `isAdmin`, `isManagingPartner`, `isActive`
**Current:** Same fields plus `role`, `locationId`

**No regressions.** ✅

### GET /api/assignments

**Original:** Returns `id, employee_id, supervisor_id, period`
**Current:** Same shape

**No regressions.** ✅

### GET /api/evaluation-config/full-template/:position

**Original:** No equivalent endpoint. Used hardcoded `getQuestionsForUser()`.
**Current:** New endpoint returning:
```typescript
{
  position, practiceArea, sectionWeights,
  questions: [...rescaled questions...],
  categories, competencies, positionConfig
}
```

**New API, no regression.** ✅

## Frontend Field Mappings

### Evaluations Page

| Original Field | Current Field | Match? |
|---------------|---------------|--------|
| `e.evaluatorId` | `e.evaluator_id` | ⚠️ camelCase → snake_case |
| `e.evaluatedId` | `e.evaluated_id` | ⚠️ camelCase → snake_case |
| `e.totalScore` | `e.total_score` | ⚠️ camelCase → snake_case |
| `e.feedbackCompleted` | `e.feedback_completed` | ⚠️ camelCase → snake_case |
| `r.questionId` | `r.question_id` | ⚠️ camelCase → snake_case |
| `r.notApplicable` | `r.not_applicable` | ⚠️ camelCase → snake_case |
| `r.noElements` | `r.no_elements` | ⚠️ camelCase → snake_case |

**IMPORTANT:** The frontend uses a `toCamelCase` API transformation. The API returns snake_case, but the React Query hooks transform it to camelCase. This means the frontend code uses `e.evaluatorId` not `e.evaluator_id`.

### Dashboard

| Original | Current | Match? |
|----------|---------|--------|
| `useEvaluations({ period: CURRENT_PERIOD })` | `useAnalyticsOverview(currentPeriod)` | ⚠️ Different data source |
| `useAssignments(CURRENT_PERIOD)` | `useAssignments(currentPeriod)` | ✅ |
| `useUsers()` | `useUsers()` | ✅ |
| Direct count calculations | Pre-computed analytics | ⚠️ Different |

### Self-Evaluation

| Original | Current | Match? |
|----------|---------|--------|
| `getQuestionsForUser(currentUser)` | `useFullTemplate(position, practiceArea)` | ✅ |
| `getSectionWeights(position)` | From `templateData.sectionWeights` | ✅ |
| `CURRENT_PERIOD` | `useCurrentPeriod()` | ✅ |

## Period Filtering Differences

| Component | Original | Current | Difference |
|-----------|----------|---------|-------------|
| Dashboard | `CURRENT_PERIOD` (hardcoded) | `useCurrentPeriod()` + fallback | ⚠️ Can show previous period |
| Evaluations | `CURRENT_PERIOD` for pending, `viewPeriod` for history | Same logic, DB-driven periods | ✅ |
| SelfEvaluation | `CURRENT_PERIOD` | `useCurrentPeriod()` | ✅ |
| OrgChart | `useAssignments(CURRENT_PERIOD)` | `useAssignments(currentPeriod)` | ✅ |
| Reports | Local calculation | Analytics API | ⚠️ Different source |
| Settings | `CURRENT_PERIOD` | `selectedPeriod` state | ✅ |
