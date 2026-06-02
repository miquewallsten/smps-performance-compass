# SMPS Protected Systems Registry

**DO NOT MODIFY THESE SYSTEMS WITHOUT EXPLICIT AUTHORIZATION.**

---

## Protected Tables

### 1. question_library (84 rows)
- **Purpose:** Canonical question definitions. Single source of truth for question text and category.
- **Source files:** `server/db/seed-evaluation-data.ts` (seed), `server/routes/evaluation-config.ts` (CRUD)
- **Dependencies:** `template_questions.library_question_id` → `question_library.id`

### 2. template_questions (290 rows)
- **Purpose:** Questions assigned to each position, section, and practice area with weights.
- **Source files:** `server/db/seed-evaluation-data.ts` (seed), `server/routes/evaluation-config.ts` (CRUD)
- **Dependencies:** `question_library`, `section_weights`, `position_config`, `evaluation_categories`

### 3. section_weights (17 rows)
- **Purpose:** Percentage allocation per position (tecnico/competencias/blandas), must sum to 100.
- **Source files:** `server/db/seed-evaluation-data.ts`, `server/routes/evaluation-config.ts`
- **Dependencies:** `position_config`

### 4. position_config (17 rows)
- **Purpose:** Position hierarchy, labels, levels, and sort order.
- **Source files:** `server/db/seed-evaluation-data.ts`
- **Dependencies:** `section_weights`, `template_questions`, `users`

### 5. competency_definitions (35 rows)
- **Purpose:** Competency descriptions per position level for the Help/dictionary page.
- **Source files:** `server/db/seed-evaluation-data.ts`
- **Dependencies:** `position_config`

### 6. evaluation_categories (24 rows)
- **Purpose:** Category-to-section mapping for question organization.
- **Source files:** `server/db/seed-evaluation-data.ts`
- **Dependencies:** `template_questions`

### 7. evaluations + evaluation_responses
- **Purpose:** Historical evaluation records. Scores are formula-derived.
- **Source files:** `server/routes/evaluations.ts`
- **Dependencies:** `users`, `template_questions`

---

## Protected Logic

### 1. calculateScore() — `src/lib/evaluationConfig.ts`
- **Purpose:** Core scoring formula. Excludes NA-approved and Sin Elementos questions. Weighted average scaled to 100.
- **Dependencies:** Question weights, responses, NA approvals
- **Tests:** `src/test/evaluationConfig.test.ts`

### 2. Visibility Rules — `src/lib/visibility.ts`
- **Purpose:** `canViewUserEvaluations()` — determines which evaluations a user can see.
- **Rules:** SuperUser/Admin/MP see all. Socios hide other socios and salary partners. Others by assignment.
- **Dependencies:** User roles, positions

### 3. Hierarchy Rules — `src/lib/evaluationConfig.ts`
- **Purpose:** `getLegalHierarchy()`, `getAdminHierarchy()` — position ordering from position_config.
- **Dependencies:** `position_config`

### 4. Period Resolution — `src/hooks/useCurrentPeriod.ts`
- **Purpose:** Resolves the current evaluation period by calendar date from period_configs.
- **Dependencies:** `period_configs`

### 5. Template Assembly — `server/routes/evaluation-config.ts` (full-template endpoint)
- **Purpose:** Assembles questions for a position+practiceArea, filters tecnico by area, rescales weights.
- **Dependencies:** `template_questions`, `section_weights`, `position_config`
- **Display Period Resolution** — `src/hooks/useDisplayPeriod.ts`
- **Purpose:** Resolves the best period for analytics/history display based on evaluation data availability.

### 6. Practice Area Filtering
- **Purpose:** Filters tecnico questions by practice area (corporativo/consultoria_fiscal/litigio_fiscal) with corporativo fallback.
- **Source:** `server/routes/evaluation-config.ts` (full-template), `src/pages/Evaluations.tsx` (client-side)

### 7. Section Weight Allocation
- **Purpose:** Rescales question weights within each section to match the configured percentage.
- **Source:** `server/routes/evaluation-config.ts` (rescale function), `src/lib/evaluationConfig.ts` (getSectionWeights)

---

## Files Under Protection

| File | System | Risk if Modified |
|------|--------|-----------------|
| `server/db/seed-evaluation-data.ts` | Seed data for all templates | Can corrupt all question data |
| `server/routes/evaluation-config.ts` | Template/weight CRUD API | Can modify templates/weights |
| `src/lib/evaluationConfig.ts` | Scoring, weights, hierarchy | Breaks scoring and display |
| `src/lib/visibility.ts` | Access control | Breaks evaluation visibility |
| `src/hooks/useCurrentPeriod.ts` | Period resolution | Breaks evaluation creation |
| `server/routes/evaluations.ts` | Evaluation CRUD | Can corrupt evaluation data |
| `server/services/analytics-refresh.ts` | Analytics computation | Can produce wrong stats |
| `server/db/migrate.ts` | Schema definition | Can lose/damage data |

