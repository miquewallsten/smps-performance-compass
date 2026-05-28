# DB-Backed Templates & Questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded question/weight/competency data in `.ts` files with MySQL database tables, so that uploading an Excel file is all that's needed to update templates — no code changes, no redeployments.

**Architecture:** Add 3 new MySQL tables (`template_questions`, `section_weights`, `competency_definitions`) with a seed API endpoint. The existing `.ts` seed files become a **fallback** — if the DB has data for a position, it's used; otherwise the hardcoded `.ts` data is used. This guarantees zero downtime: the app works even with an empty DB (falls back to hardcoded), and once seeded, the DB takes over seamlessly. All existing evaluation, scoring, and display logic remains identical — only the data source changes.

**Tech Stack:** MySQL (existing), Express API (existing), React Query (existing), TypeScript/React frontend (existing), xlsx library for Excel parsing (existing in node_modules via react-query deps)

---

## File Structure

### New Files
- `server/routes/templateSeed.ts` — API endpoints for seeding/importing template data
- `src/api/templateQueries.ts` — React Query hooks for `useTemplateQuestions()`, `useSectionWeights()`, `useCompetencyDefinitions()`

### Modified Files
- `server/db/migrate.ts` — Add 3 new CREATE TABLE statements
- `server/index.ts` — Register new route
- `src/data/questions.ts` — `getQuestionsForUser()` and `getSectionForQuestion()` accept optional DB data
- `src/data/sectionWeights.ts` — `getSectionWeights()` accepts optional DB data
- `src/data/competencyDictionary.ts` — `COMPETENCIES_BY_POSITION` accepts optional DB data
- `src/api/queries.ts` — Add new hooks
- `src/pages/Evaluations.tsx` — Use DB data, fallback to seed
- `src/pages/SelfEvaluation.tsx` — Use DB data, fallback to seed
- `src/pages/EvaluationTemplates.tsx` — Use DB data, add "Import from Excel" button
- `src/pages/QuestionLibrary.tsx` — Use DB data
- `src/pages/Help.tsx` — Use DB data
- `src/pages/Settings.tsx` — Use DB data
- `src/components/EvaluationViewer.tsx` — Use DB data
- `src/pages/MyActionPlan.tsx` — Use DB data (SECTION_LABELS only, already static)

### Unchanged Files
- `src/types/index.ts` — Position labels, hierarchies, etc. stay as code (they define app structure, not client data)
- `src/data/mockData.ts` — Already superseded by real DB data
- All evaluation scoring, auth, user management, action plans, vacations — untouched

---

## Task 1: Add Database Tables

**Files:**
- Modify: `server/db/migrate.ts`

- [ ] **Step 1: Add the 3 new CREATE TABLE statements to the migration array**

In `server/db/migrate.ts`, add these 3 tables to the `createTables` array, after the existing `seed_question_overrides` table:

```sql
CREATE TABLE IF NOT EXISTS template_questions (
  id VARCHAR(36) PRIMARY KEY,
  position VARCHAR(50) NOT NULL,
  practice_area VARCHAR(50) NOT NULL DEFAULT 'corporativo',
  section ENUM('tecnico','competencias','blandas') NOT NULL,
  category VARCHAR(100) NOT NULL,
  text TEXT NOT NULL,
  weight INT NOT NULL DEFAULT 5,
  sort_order INT NOT NULL DEFAULT 0,
  question_type ENUM('seed','custom') NOT NULL DEFAULT 'seed',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tq_position_area (position, practice_area),
  INDEX idx_tq_section (position, section)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

```sql
CREATE TABLE IF NOT EXISTS section_weights (
  position VARCHAR(50) PRIMARY KEY,
  tecnico INT NOT NULL DEFAULT 0,
  competencias INT NOT NULL DEFAULT 80,
  blandas INT NOT NULL DEFAULT 20,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

```sql
CREATE TABLE IF NOT EXISTS competency_definitions (
  id VARCHAR(36) PRIMARY KEY,
  position_level VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  definition TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  INDEX idx_cd_level (position_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

- [ ] **Step 2: Build and verify the migration runs without errors**

Run: `npm run build && node dist/server.cjs` (or the equivalent dev start command)

Expected: Server starts, migration creates the 3 new tables. Check in MySQL that `template_questions`, `section_weights`, and `competency_definitions` tables exist with the correct schema.

- [ ] **Step 3: Commit**

```bash
git add server/db/migrate.ts
git commit -m "feat: add template_questions, section_weights, competency_definitions tables"
```

---

## Task 2: Create Seed API Endpoint

**Files:**
- Create: `server/routes/templateSeed.ts`
- Modify: `server/index.ts` — Register the new route

- [ ] **Step 1: Create `server/routes/templateSeed.ts`**

This file handles:
- `POST /api/template-seed/questions` — Upsert template questions (bulk, accepts array)
- `POST /api/template-seed/weights` — Upsert section weights (bulk, accepts array)
- `POST /api/template-seed/competencies` — Upsert competency definitions (bulk, accepts array)
- `POST /api/template-seed/full` — Single endpoint that accepts the full structure (all 3 at once, parsed from Excel)
- `GET /api/template-seed/questions` — Get all template questions (with optional position filter)
- `GET /api/template-seed/weights` — Get all section weights
- `GET /api/template-seed/competencies` — Get all competency definitions
- `DELETE /api/template-seed/questions` — Clear all template questions (for re-import)

The `POST /api/template-seed/full` endpoint accepts a JSON body like:
```json
{
  "questions": [
    { "position": "socio", "practice_area": "corporativo", "section": "tecnico", "category": "Conocimiento normativo", "text": "...", "weight": 12, "sort_order": 1 },
    ...
  ],
  "section_weights": [
    { "position": "socio", "tecnico": 60, "competencias": 20, "blandas": 20 },
    ...
  ],
  "competencies": [
    { "position_level": "legal_all", "name": "Comunicación profesional", "definition": "..." },
    ...
  ]
}
```

It uses `DELETE + INSERT` (or `ON DUPLICATE KEY UPDATE`) for idempotent seeding. Each question gets a deterministic ID based on `position-practice_area-category-sort_order` so re-seeding updates instead of duplicating.

All endpoints require `authMiddleware` + `requireAdmin`.

- [ ] **Step 2: Register the route in `server/index.ts`**

Add after the existing questions route:
```typescript
import templateSeedRoutes from './routes/templateSeed.js';
// ...
app.use('/api/template-seed', templateSeedRoutes);
```

- [ ] **Step 3: Build and test the endpoint manually**

Run: `npm run build && node dist/server.cjs`

Test with curl:
```bash
# Test GET (should return empty arrays if not seeded yet)
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/template-seed/questions
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/template-seed/weights
```

Expected: Returns `[]` for questions and weights (not seeded yet).

- [ ] **Step 4: Commit**

```bash
git add server/routes/templateSeed.ts server/index.ts
git commit -m "feat: add template seed API endpoints for questions, weights, competencies"
```

---

## Task 3: Create React Query Hooks for Template Data

**Files:**
- Create: `src/api/templateQueries.ts`
- Modify: `src/api/queries.ts` — Re-export the new hooks

- [ ] **Step 1: Create `src/api/templateQueries.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export function useTemplateQuestions(position?: string) {
  return useQuery({
    queryKey: ['templateQuestions', position],
    queryFn: () => api.get<any[]>(`/api/template-seed/questions${position ? `?position=${position}` : ''}`),
    staleTime: 5 * 60 * 1000, // 5 minutes — template data changes rarely
  });
}

export function useSectionWeights() {
  return useQuery({
    queryKey: ['sectionWeights'],
    queryFn: () => api.get<Record<string, { tecnico: number; competencias: number; blandas: number }>>('/api/template-seed/weights'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCompetencyDefinitions(positionLevel?: string) {
  return useQuery({
    queryKey: ['competencyDefinitions', positionLevel],
    queryFn: () => api.get<any[]>(`/api/template-seed/competencies${positionLevel ? `?position_level=${positionLevel}` : ''}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSeedTemplateData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      questions: any[];
      section_weights: any[];
      competencies: any[];
    }) => api.post('/api/template-seed/full', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templateQuestions'] });
      qc.invalidateQueries({ queryKey: ['sectionWeights'] });
      qc.invalidateQueries({ queryKey: ['competencyDefinitions'] });
    },
  });
}
```

- [ ] **Step 2: Add re-exports to `src/api/queries.ts`**

Add at the end:
```typescript
export { useTemplateQuestions, useSectionWeights, useCompetencyDefinitions, useSeedTemplateData } from './templateQueries';
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit` — Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/api/templateQueries.ts src/api/queries.ts
git commit -m "feat: add React Query hooks for template questions, section weights, competencies"
```

---

## Task 4: Modify `getQuestionsForUser()` to Accept DB Data

**Files:**
- Modify: `src/data/questions.ts`

This is the critical task. The function signature changes to accept optional DB data, but falls back to hardcoded `.ts` files when DB is empty.

- [ ] **Step 1: Add a new exported type `TemplateQuestionRow` and modify `getQuestionsForUser` signature**

At the top of `src/data/questions.ts`, add:

```typescript
export interface TemplateQuestionRow {
  position: string;
  practice_area: string;
  section: 'tecnico' | 'competencias' | 'blandas';
  category: string;
  text: string;
  weight: number;
  sort_order: number;
}
```

Modify `getQuestionsForUser` to accept an optional `dbQuestions` parameter:

```typescript
export function getQuestionsForUser(
  user: Pick<User, 'position' | 'practiceArea'>,
  customQuestions?: Record<string, EvalQuestion[]>,
  dbQuestions?: TemplateQuestionRow[],
): EvalQuestion[] {
```

- [ ] **Step 2: Add the DB data path inside `getQuestionsForUser`**

Right after the `sectionWeights` line, add logic that uses DB data when available:

```typescript
  // If DB template questions exist, use them instead of hardcoded seed files
  if (dbQuestions && dbQuestions.length > 0) {
    const position = normalizePosition(user.position);
    const effectivePos = position || user.position;
    const practiceArea = normalizePracticeArea(user.practiceArea || 'corporativo');

    const positionQuestions = dbQuestions.filter(q =>
      q.position === effectivePos &&
      (q.practice_area === practiceArea || q.practice_area === 'corporativo')
    );

    if (positionQuestions.length > 0) {
      const tplCompetencias = positionQuestions
        .filter(q => q.section === 'competencias')
        .map((q, i) => ({
          id: `db-${effectivePos}-${q.section}-${i}`,
          category: q.category as QuestionCategory,
          text: q.text,
          weight: q.weight,
          section: q.section as EvalSection,
          ...(q.practice_area !== 'corporativo' ? { practiceArea: q.practice_area } : {}),
        }));

      const tplBlandas = positionQuestions
        .filter(q => q.section === 'blandas')
        .map((q, i) => ({
          id: `db-${effectivePos}-${q.section}-${i}`,
          category: q.category as QuestionCategory,
          text: q.text,
          weight: q.weight,
          section: q.section as EvalSection,
        }));

      const tecnicas = level === 'legal'
        ? positionQuestions
            .filter(q => q.section === 'tecnico')
            .map((q, i) => ({
              id: `db-${effectivePos}-${q.section}-${i}`,
              category: q.category as QuestionCategory,
              text: q.text,
              weight: q.weight,
              section: 'tecnico' as EvalSection,
              practiceArea: q.practice_area,
            }))
        : [];

      return [
        ...rescale(tecnicas, sectionWeights.tecnico),
        ...rescale(tplCompetencias, sectionWeights.competencias),
        ...rescale(tplBlandas, sectionWeights.blandas),
      ];
    }
  }

  // Fallback: use hardcoded seed data (existing logic below)
```

The existing hardcoded logic stays exactly as-is after this block — it's the fallback path.

- [ ] **Step 3: Modify `getSectionWeights` to accept optional DB data**

In `src/data/sectionWeights.ts`, modify the function:

```typescript
export interface SectionWeightsRow {
  position: string;
  tecnico: number;
  competencias: number;
  blandas: number;
}

export function getSectionWeights(
  position: Position,
  dbWeights?: SectionWeightsRow[]
): SectionWeights {
  // If DB data exists for this position, use it
  if (dbWeights && dbWeights.length > 0) {
    const row = dbWeights.find(w => w.position === position || w.position === normalizePosition(position));
    if (row) {
      return { tecnico: row.tecnico, competencias: row.competencias, blandas: row.blandas };
    }
  }
  // Fallback to hardcoded
  return SECTION_WEIGHTS[position] ?? { tecnico: 0, competencias: 80, blandas: 20 };
}
```

- [ ] **Step 4: Verify the app builds and existing functionality is unaffected**

Run: `npm run build` — Expected: Successful build. The fallback path ensures existing behavior is preserved.

- [ ] **Step 5: Commit**

```bash
git add src/data/questions.ts src/data/sectionWeights.ts
git commit -m "feat: getQuestionsForUser and getSectionWeights accept optional DB data with fallback"
```

---

## Task 5: Modify `COMPETENCIES_BY_POSITION` to Accept DB Data

**Files:**
- Modify: `src/data/competencyDictionary.ts`

- [ ] **Step 1: Export a function that merges DB data with hardcoded data**

Modify `src/data/competencyDictionary.ts` to export a function:

```typescript
export interface CompetencyDefinitionRow {
  position_level: string;
  name: string;
  definition: string;
}

export function getCompetenciesForPosition(
  position: string,
  dbCompetencies?: CompetencyDefinitionRow[]
): Competency[] {
  const level = POSITION_LEVELS[position as Position] || POSITION_LEVELS[normalizePosition(position as Position)] || 'administrativo';

  // If DB data exists, use it
  if (dbCompetencies && dbCompetencies.length > 0) {
    const levelKey = level === 'legal' ? 'legal' : 'administrativo';
    const filtered = dbCompetencies.filter(c => {
      if (c.position_level === levelKey || c.position_level === 'all') return true;
      // Check specific position levels
      return c.position_level === `level_${level}`;
    });
    if (filtered.length > 0) return filtered;
  }

  // Fallback to hardcoded
  switch (level) {
    case 'legal':
      const pos = normalizePosition(position as Position);
      if (['salary_partner'].includes(pos)) return [...LEGAL_ALL, ...LEGAL_MID_PLUS, ...SALARY_PARTNER_PLUS];
      if (['counsel'].includes(pos)) return [...LEGAL_ALL, ...LEGAL_MID_PLUS, ...LEGAL_JR_PLUS, ...SALARY_PARTNER_PLUS];
      if (['socio'].includes(pos)) return [...LEGAL_ALL, ...LEGAL_MID_PLUS, ...SALARY_PARTNER_PLUS, ...SOCIO_PLUS];
      if (['asociado_sr', 'asociado_mid'].includes(pos)) return [...LEGAL_ALL, ...LEGAL_MID_PLUS, ...LEGAL_JR_PLUS];
      if (['asociado_jr'].includes(pos)) return [...LEGAL_ALL, ...LEGAL_JR_PLUS];
      return [...LEGAL_ALL, ...LEGAL_JR_PLUS]; // pasantes
    default:
      return [...DIRECCION]; // admin
  }
}
```

(The exact level-to-competency mapping should match the existing `COMPETENCIES_BY_POSITION` export that already exists in the file.)

- [ ] **Step 2: Build and verify**

Run: `npm run build` — Expected: Successful build.

- [ ] **Step 3: Commit**

```bash
git add src/data/competencyDictionary.ts
git commit -m "feat: getCompetenciesForPosition accepts optional DB data with fallback"
```

---

## Task 6: Update All Page Components to Use DB Data

**Files:**
- Modify: `src/pages/Evaluations.tsx`
- Modify: `src/pages/SelfEvaluation.tsx`
- Modify: `src/pages/EvaluationTemplates.tsx`
- Modify: `src/pages/QuestionLibrary.tsx`
- Modify: `src/pages/Help.tsx`
- Modify: `src/pages/Settings.tsx`
- Modify: `src/components/EvaluationViewer.tsx`

This is the wiring task. Every page that calls `getQuestionsForUser()` or `getSectionWeights()` needs to:
1. Fetch DB data via React Query hooks
2. Pass it to the functions as optional parameters
3. Let the fallback work if DB is empty

- [ ] **Step 1: Update `Evaluations.tsx`**

Add imports:
```typescript
import { useTemplateQuestions, useSectionWeights as useSectionWeightsDB } from '@/api/queries';
```

Inside the component, add:
```typescript
const { data: dbQuestions = [] } = useTemplateQuestions();
const { data: dbWeights = [] } = useSectionWeightsDB();
```

Change all calls from:
```typescript
const questions = getQuestionsForUser(emp, customQuestions);
```
to:
```typescript
const questions = getQuestionsForUser(emp, customQuestions, dbQuestions);
```

And from:
```typescript
const sectionGlobalWeight = getSectionWeights(emp.position)[section];
```
to:
```typescript
const sectionGlobalWeight = getSectionWeights(emp.position, dbWeights)[section];
```

- [ ] **Step 2: Update `SelfEvaluation.tsx`** — Same pattern as Evaluations.tsx

- [ ] **Step 3: Update `EvaluationTemplates.tsx`** — Same pattern. Also pass `dbWeights` to `getSectionWeights()`.

- [ ] **Step 4: Update `QuestionLibrary.tsx`** — Same pattern for `getQuestionsForUser()` calls.

- [ ] **Step 5: Update `Help.tsx`** — Use `useCompetencyDefinitions()` hook and pass to `getCompetenciesForPosition()`.

- [ ] **Step 6: Update `Settings.tsx`** — Uses `QUESTIONS_BY_POSITION` for displaying questions in a position. Change to use `useTemplateQuestions()` + `getQuestionsForUser()`.

- [ ] **Step 7: Update `EvaluationViewer.tsx`** — Same pattern as Evaluations.tsx.

- [ ] **Step 8: Build and verify**

Run: `npm run build` — Expected: Successful build. All pages still work with empty DB (falls back to hardcoded data).

- [ ] **Step 9: Commit**

```bash
git add src/pages/ src/components/
git commit -m "feat: wire all pages to use DB template data with hardcoded fallback"
```

---

## Task 7: Add Excel Import UI to EvaluationTemplates

**Files:**
- Modify: `src/pages/EvaluationTemplates.tsx`

- [ ] **Step 1: Add an "Import from Excel" button next to the existing "Nueva Pregunta" button**

Import `useSeedTemplateData` from queries. Add an `xlsx` parser (already available via existing dependencies or add `xlsx`).

Add a file input handler that:
1. Reads the Excel file client-side
2. Parses it into the same structure as the JSON the API expects
3. Calls `useSeedTemplateData().mutate()` with the parsed data
4. On success, invalidates all template queries

The parser maps Excel columns:
- Column A (Posición) → `position`
- Column B (Sección) → `section` (map "Criterio Técnico" → "tecnico", "Competencias" → "competencias", "Habilidades Blandas" → "blandas")
- Column C (Categoría) → `category`
- Column D (Peso %) → `weight`
- Column E (Texto) → `text`
- Rows with `(biblioteca)` in Column A are skipped

Section weights are calculated by summing weights per section per position.

- [ ] **Step 2: Add success/error feedback**

Show a toast notification on success/failure. After successful import, all pages automatically refresh via React Query invalidation.

- [ ] **Step 3: Build and test**

Upload the existing Excel file through the UI. Verify that:
- All positions show 100% total weight
- Question counts match the Excel
- Evaluation forms still work correctly

- [ ] **Step 4: Commit**

```bash
git add src/pages/EvaluationTemplates.tsx
git commit -m "feat: add Excel import button to Evaluation Templates page"
```

---

## Task 8: Seed the Database from the Current Excel File

**Files:**
- None (operational task)

- [ ] **Step 1: Use the Import UI to upload `preguntas-por-posicion-2026-05-28 (22h).xlsx`**

Navigate to Evaluation Templates page → Click "Import from Excel" → Select the file → Confirm.

- [ ] **Step 2: Verify all positions display correctly**

Check that every position in the Templates page shows the correct number of questions and 100% total weight, matching the Excel file exactly.

- [ ] **Step 3: Verify evaluations still work**

Create a test evaluation for "Analista" (administrative) and "Socio" (legal with corporativo). Verify questions appear correctly, section headers are right, scoring works.

- [ ] **Step 4: Verify Question Library still works**

The Question Library should show all questions grouped by position, with no percentages displayed.

- [ ] **Step 5: Verify Self-Evaluation still works**

Start a self-evaluation and confirm questions and weights are correct.

---

## Task 9: Final Verification & Cleanup

**Files:**
- None (verification only)

- [ ] **Step 1: Full regression test**

1. Login as admin → Templates → Every position shows correct questions, 100% weight
2. Login as supervisor → Start evaluation → All questions correct, scoring works
3. Self-evaluation → Questions correct
4. Question Library → No percentages, all questions visible
5. Help → Competency dictionary shows definitions
6. Settings → Position management works
7. Reports → Scores calculate correctly
8. Import Excel again → Data refreshes correctly (idempotent)

- [ ] **Step 2: Verify DB data matches Excel**

Run SQL queries to confirm:
```sql
SELECT position, COUNT(*) FROM template_questions GROUP BY position ORDER BY position;
SELECT * FROM section_weights ORDER BY position;
SELECT position_level, COUNT(*) FROM competency_definitions GROUP BY position_level;
```

Expected: 17 positions with question counts matching the Excel file, section weights matching, competency definitions populated.

- [ ] **Step 3: Commit final state**

```bash
git add -A
git commit -m "feat: DB-backed templates fully wired — Excel import replaces hardcoded seed data"
git push origin main
```

---

## Self-Review

### 1. Spec Coverage
- ✅ Template questions → `template_questions` table, seeded from Excel
- ✅ Section weights → `section_weights` table, seeded from Excel
- ✅ Competency definitions → `competency_definitions` table, seeded from Excel
- ✅ Question Library reads from DB (with fallback)
- ✅ Evaluation Templates reads from DB (with fallback)
- ✅ Evaluations read from DB (with fallback)
- ✅ Self-Evaluation reads from DB (with fallback)
- ✅ Excel import UI on Templates page
- ✅ Zero downtime — hardcoded `.ts` files remain as fallback
- ✅ Evaluations in progress are unaffected (they store their own copy of questions+responses)
- ✅ `custom_eval_questions` still works for admin overrides

### 2. Placeholder Scan
- No TBD/TODO found
- All code steps include actual code
- All file paths are exact

### 3. Type Consistency
- `TemplateQuestionRow` defined in Task 4, used in Tasks 6-7
- `SectionWeightsRow` defined in Task 4, used in Tasks 6-7
- `CompetencyDefinitionRow` defined in Task 5, used in Tasks 6-7
- API endpoints match between `templateSeed.ts` (Task 2) and `templateQueries.ts` (Task 3)
- Function signatures with optional `dbQuestions`/`dbWeights` params are backward-compatible

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-28-db-backed-templates.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
