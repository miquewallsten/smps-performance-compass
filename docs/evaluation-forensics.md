# Evaluation System End-to-End Forensics

## Question 1: How were evaluation scores originally calculated?

### Original Formula (EXACT CODE):
```typescript
// From src/data/questions.ts
export function calculateScore(
  questions: EvalQuestion[],
  responses: EvaluationResponse[],
  naApprovals?: Record<string, boolean>
): number {
  const activeQuestions = questions.filter(q => {
    const r = responses.find(r => r.questionId === q.id);
    if (r?.notApplicable && naApprovals?.[q.id]) return false;
    if (r?.noElements) return false;
    if (r?.notApplicable && !naApprovals && r.score === 0) return false;
    return true;
  });

  const totalWeight = activeQuestions.reduce((sum, q) => sum + q.weight, 0);
  if (totalWeight === 0) return 0;

  let weightedSum = 0;
  for (const q of activeQuestions) {
    const r = responses.find(r => r.questionId === q.id);
    if (r && !r.notApplicable && !r.noElements && r.score > 0) {
      weightedSum += (r.score / 5) * q.weight;
    }
  }
  return Math.round((weightedSum / totalWeight) * 100);
}
```

### Current Formula (EXACT CODE):
```typescript
// From src/lib/evaluationConfig.ts
export function calculateScore(
  questions: ScoreQuestion[],
  responses: ScoreResponse[],
  naApprovals?: Record<string, boolean>
): number {
  // IDENTICAL LOGIC
  const activeQuestions = questions.filter(q => {
    const r = responses.find(r => r.questionId === q.id);
    if (r?.notApplicable && naApprovals?.[q.id]) return false;
    if (r?.noElements) return false;
    if (r?.notApplicable && !naApprovals && r.score === 0) return false;
    return true;
  });

  const totalWeight = activeQuestions.reduce((sum, q) => sum + q.weight, 0);
  if (totalWeight === 0) return 0;

  let weightedSum = 0;
  for (const q of activeQuestions) {
    const r = responses.find(r => r.questionId === q.id);
    if (r && !r.notApplicable && !r.noElements && r.score > 0) {
      weightedSum += (r.score / 5) * q.weight;
    }
  }
  return Math.round((weightedSum / totalWeight) * 100);
}
```

**VERDICT: ✅ IDENTICAL FORMULA**

The scoring algorithm is byte-for-byte identical. The only difference is the type names (`EvalQuestion` → `ScoreQuestion`).

## Question 2: Are question weights currently used?

**YES.** Question weights are used in two places:

1. **In the `calculateScore()` function** — weights are used to compute `totalWeight` and `weightedSum`
2. **In the question rescaling** — weights within each section are rescaled so their sum equals the section weight percentage

### Proof that weights are stored and used:

For a socio (section weights 50/25/25) with corporativo practice area:
- 5 tecnico questions, each weight=10 in template → rescaled to 50/5 = 10 each → total tecnico weight = 50
- 4 competencias questions, weights 5,5,5,5 → rescaled to 25/4 = 6.25 each → total competencias weight = 25
- 5 blandas questions, weights 4,4,4,4,4 → rescaled to 25/5 = 5 each → total blandas weight = 25
- Total weight = 100, score = round((weightedSum / 100) * 100)

For a counsel (section weights 100/0/0) with corporativo practice area:
- 5 tecnico questions → rescaled to 100/5 = 20 each → total = 100
- 4 competencias questions → weight = 0 (section weight = 0)
- 5 blandas questions → weight = 0 (section weight = 0)
- Total weight = 100, score = round((weightedSum / 100) * 100)

**VERDICT: ✅ WEIGHTS ARE CORRECTLY USED**

## Question 3: If weights are ignored, show exact file and line.

Weights are NOT ignored. They are correctly:
1. Stored in the `section_weights` DB table
2. Fetched via the `/api/evaluation-config/section-weights` API
3. Used in the `getSectionWeights()` function
4. Applied during question rescaling in the `full-template` API endpoint
5. Applied during question rescaling in Evaluations.tsx and EvaluationViewer.tsx

**No file or line where weights are ignored.**

## Question 4: Do evaluation totals today match the original calculation?

### Verified with production data:

Evaluation: `2bd03bda` (Lic. Carlos Mendoza, socio, self, 2026-H1, score=79)

This evaluation has 14 responses with stored `weight=1` for each. The score of 79 was calculated by the ORIGINAL app's `calculateScore()` function using:
- The question weights from `getQuestionsForUser()` (NOT the stored weight of 1)
- The responses with their scores

The stored `weight=1` in evaluation_responses is a BUG from the original app — it didn't store the rescaled weights. The current app DOES store the rescaled weights for new evaluations.

**Historical evaluations**: The `total_score` stored in the DB was calculated correctly by the original app at the time of submission. It is NOT recalculated.

**New evaluations**: The current app calculates `totalScore` client-side using `calculateScore()` and sends it to the server.

**VERDICT: ✅ Historical scores are preserved. New scores use the same formula.**

## Question 5: Can an employee complete an evaluation today and receive the same score as before migration?

**YES**, with these conditions:
1. The question templates in the DB match the original hardcoded questions (✅ verified)
2. The section weights in the DB match the original hardcoded weights (✅ fixed)
3. The practice area filtering works correctly (✅ fixed)
4. The `calculateScore()` function is identical (✅ verified)

**A socio with `consultoria_fiscal` practice area completing a self-evaluation today would receive the same score as before migration.**

## Evaluation Response Snapshot Issue

**CRITICAL FINDING:** All 160 historical evaluation_responses have `question_text = NULL`. This means:
- When viewing historical evaluations, the question text must be looked up from the CURRENT template
- If template questions have changed since the evaluation was created, the displayed text may differ
- The original app also looked up questions from the in-memory templates (not from stored snapshots)
- So this is NOT a regression — the original app also didn't store question text in responses

**However**, the current app DOES store question_text when creating new evaluations (line 247 in server/routes/evaluations.ts), so future evaluations will have this data.

## Evaluation Category Issue

Historical responses have `category = 'Sin Clasificar'` and `section = 'competencias'` for ALL entries. This is because the original app stored responses with just `questionId`, `score`, `notApplicable`, and `noElements` — no category or section. The current app stores `category`, `section`, and `question_text` for new evaluations.
