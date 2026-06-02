# Template System Forensics

## Original State

The original app used **three hardcoded files** for question data:

1. **`src/data/questions.ts`** — Base questions per position (QUESTIONS_BY_POSITION)
2. **`src/data/sectionWeights.ts`** — Section weights per position
3. **`src/data/technicalQuestions.ts`** — Technical questions by position and practice area

Question assembly:
```typescript
// getQuestionsForUser(user, customQuestions) in questions.ts
1. Get base template for position
2. Partition by section (competencias, blandas)
3. Get technical questions based on position + practiceArea
4. Rescale weights within each section to match SECTION_WEIGHTS
```

Custom questions (admin overrides) were stored in `custom_eval_questions` table and merged at runtime.

## Current State

The current app uses **database tables**:

1. **`template_questions`** — 290 rows (questions per position, section, practice area)
2. **`section_weights`** — 17 rows (weights per position)
3. **`question_library`** — Library of reusable questions
4. **`evaluation_categories`** — Categories for grouping
5. **`position_config`** — Position hierarchy, labels, levels
6. **`competency_definitions`** — Competencies by position level

Question assembly:
```typescript
// GET /api/evaluation-config/full-template/:position?practiceArea=xxx
1. Get section weights for position
2. Get all template questions for position
3. Partition by section (tecnico, competencias, blandas)
4. Filter tecnico by practice area (fallback to corporativo)
5. Rescale weights within each section
```

## Template Question Comparison

### Counsel Position

**Original (questions.ts):**
```typescript
counsel: socioQuestions, // Uses same questions as socio
// But with section weights: tecnico=100, competencias=0, blandas=0
```

**Current (DB):**
- counsel/corporativo: 5 tecnico + 4 competencias + 5 blandas = 14 questions
- counsel/consultoria_fiscal: 5 tecnico questions
- counsel/litigio_fiscal: 5 tecnico questions
- Section weights: tecnico=100, competencias=0, blandas=0 (FIXED)

**VERDICT:** ✅ Functionally equivalent. Counsel uses socio's competencias/blandas questions (same set) but with 0 weight for those sections. Only tecnico matters for scoring.

### Socio Position

**Original:** 14 questions (s1-s14) from `socioQuestions`
- s1-s3, s8, s14: Criterio Técnico
- s4-s6: Liderazgo  
- s7, s10, s13: Habilidades Blandas
- s9: Trabajo en Equipo
- s11: Actitud
- s12: Disponibilidad

**Current (DB):** 14 questions for counsel/corporativo
- 5 tecnico (from corporativo area)
- 4 competencias (Liderazgo, Trabajo en Equipo)
- 5 blandas (Habilidades Blandas, Actitud, Disponibilidad)

**VERDICT:** ✅ Match. Question texts and categories are equivalent.

### Administrative Positions

**Original:** Director has 10 questions (6 competencias + 4 blandas), section weights 0/80/20.
**Current (DB):** director/corporativo has 6 competencias + 4 blandas = 10 questions, weights 0/80/20.

**VERDICT:** ✅ Match.

## Historical Data Impact

### Template Reseeding
When the seed script was re-run, it:
1. Deleted all seed data from `template_questions`
2. Re-inserted with the correct question text
3. Fixed the fiscal template entries that had blank `question_text`

**Impact:** The 160 existing evaluation_responses still have `question_text = NULL` because they were created by the original app. New evaluations will have `question_text` populated.

### Question ID Mapping

| Original ID | Template Question ID | Category | Section |
|-------------|---------------------|----------|---------|
| s1-s14 (socio) | seed-084 to seed-103 | Various | Various |
| tc-corp-soc-1 to tc-corp-soc-5 | seed-089 to seed-093 | Various | tecnico |
| etc. | etc. | etc. | etc. |

Historical evaluation responses reference the original question IDs (s1, s2, tc-corp-soc-1, etc.) which still exist in `template_questions` table. The current app correctly looks up question text from the template when displaying historical evaluations.

**VERDICT:** ⚠️ Historical evaluation responses have NULL `question_text`, but the current app correctly falls back to template questions for display. No data loss, but no snapshot preservation either.

## Missing Links

No broken relationships detected. All template questions have valid `position`, `section`, `practice_area`, and `category` values.

## Assessment

| Aspect | Status |
|--------|--------|
| Question content | ✅ Matches original |
| Section weights | ✅ Matches original (after fix) |
| Practice area filtering | ✅ Works correctly (after fix) |
| Question rescaling | ✅ Identical algorithm |
| Competency dictionary | ✅ Matches original |
| Historical snapshot preservation | ⚠️ All responses have NULL question_text |
| Template admin UI | ✅ Improved (practice area tabs) |
