# Full Database Migration — SMPS Performance Compass

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate every hardcoded `.ts` data file to MySQL so the app reads ALL configuration and evaluation data from the database — zero `.ts` seed files, zero fallbacks, zero loose ends.

**Architecture:** Add new MySQL tables (evaluation_categories, template_questions, section_weights, competency_definitions, position_config, score_config), create server API routes for all evaluation config, rewire every frontend page to use API hooks instead of `@/data/*` imports, delete all hardcoded data files, remove legacy DB tables, and test every single page end-to-end.

**Tech Stack:** React/Vite/Tailwind frontend, Express/MySQL backend, React Query for data fetching, Hostinger deployment via GitHub Actions CI.

---

## FILES THAT WILL BE CREATED

| File | Responsibility |
|---|---|
| `server/routes/evaluation-config.ts` | All evaluation config API routes (categories, weights, templates, competencies, positions, score labels) |
| `server/db/seed-evaluation-data.ts` | One-time seed script: populates all new tables from authoritative data |
| `src/api/evaluation-config.ts` | Client-side API functions for evaluation config endpoints |
| `src/hooks/useEvaluationConfig.ts` | React Query hooks for all evaluation config data |

## FILES THAT WILL BE MODIFIED

| File | Change |
|---|---|
| `server/db/migrate.ts` | Add new table CREATE statements |
| `server/db/seed-users.ts` | Remove custom_eval_questions and seed_question_overrides seeding; call seed-evaluation-data |
| `server/index.ts` | Add evaluation-config route |
| `server/routes/evaluations.ts` | Remove CSV POSITION_LABELS_CSV hardcode; use DB; remove dependency on seed data |
| `server/routes/questions.ts` | Remove custom/overrides endpoints (replaced by evaluation-config) |
| `server/routes/system.ts` | Remove positionCatalog.ts import; use DB |
| `src/api/queries.ts` | Add new hooks, remove old custom/override hooks |
| `src/api/client.ts` | Add any new normalization if needed |
| `src/types/index.ts` | Remove POSITION_LABELS, LEGAL_HIERARCHY, ADMIN_HIERARCHY, POSITION_LEVELS, POSITION_RANK, POSITION_HIERARCHY, PRACTICE_AREA_LABELS, SCORE_LABELS, normalizePosition, normalizePracticeArea; keep Position/PracticeArea/EvalSection types only |
| `src/pages/Evaluations.tsx` | Replace all `@/data/*` imports with API hooks |
| `src/pages/SelfEvaluation.tsx` | Replace all `@/data/*` imports with API hooks |
| `src/pages/EvaluationTemplates.tsx` | Replace all `@/data/*` imports with API hooks |
| `src/pages/QuestionLibrary.tsx` | Replace all `@/data/*` imports with API hooks |
| `src/pages/Help.tsx` | Replace `@/data/competencyDictionary` import with API hook |
| `src/pages/Settings.tsx` | Replace `@/data/questions` import with API hook |
| `src/pages/MyActionPlan.tsx` | Replace `@/data/questions` import with API hook |
| `src/components/EvaluationViewer.tsx` | Replace all `@/data/*` imports with API hooks |
| `src/components/HierarchyFilters.tsx` | Replace types/index hardcoded hierarchies with API data |
| `src/components/Layout.tsx` | Replace POSITION_LEVELS import with API data |
| `src/contexts/AppContext.tsx` | Remove mockData import |
| `src/pages/Dashboard.tsx` | Replace hardcoded hierarchy imports with API data |
| `src/pages/Reports.tsx` | Replace hardcoded hierarchy imports with API data |
| `src/pages/OrgChart.tsx` | Replace hardcoded hierarchy imports with API data |
| `src/pages/AssignSupervisors.tsx` | Replace hardcoded hierarchy imports with API data |
| `src/pages/UserManagement.tsx` | Replace hardcoded hierarchy imports with API data |
| `src/pages/UserTimeline.tsx` | Replace POSITION_LABELS import with API data |
| `src/pages/PersonalObjectives.tsx` | Replace hardcoded hierarchy imports with API data |

## FILES THAT WILL BE DELETED

| File | Reason |
|---|---|
| `src/data/questions.ts` | Replaced by DB + API |
| `src/data/technicalQuestions.ts` | Replaced by DB + API |
| `src/data/sectionWeights.ts` | Replaced by DB + API |
| `src/data/competencyDictionary.ts` | Replaced by DB + API |
| `src/data/mockData.ts` | Legacy unused |
| `server/data/positionCatalog.ts` | Already in DB via system init |

---

## TASK 1: Add New Database Tables

**Files:**
- Modify: `server/db/migrate.ts`

- [ ] **Step 1: Add evaluation_categories table to migrate.ts**

Add the following CREATE TABLE to the `createTables` array in `server/db/migrate.ts`, before the existing tables:

```sql
CREATE TABLE IF NOT EXISTS evaluation_categories (
  id VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  section ENUM('competencias','tecnico','blandas') NOT NULL,
  is_technical_subcategory TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

- [ ] **Step 2: Add template_questions table to migrate.ts**

```sql
CREATE TABLE IF NOT EXISTS template_questions (
  id VARCHAR(36) PRIMARY KEY,
  position VARCHAR(50) NOT NULL,
  practice_area VARCHAR(50) NOT NULL DEFAULT 'corporativo',
  section ENUM('competencias','tecnico','blandas') NOT NULL,
  category VARCHAR(50) NOT NULL,
  question_text TEXT NOT NULL,
  weight INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  source ENUM('seed','custom') NOT NULL DEFAULT 'seed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tq_pos_area (position, practice_area),
  INDEX idx_tq_category (category),
  INDEX idx_tq_section (section)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

- [ ] **Step 3: Add section_weights table to migrate.ts**

```sql
CREATE TABLE IF NOT EXISTS section_weights (
  position VARCHAR(50) PRIMARY KEY,
  tecnico INT NOT NULL DEFAULT 0,
  competencias INT NOT NULL DEFAULT 80,
  blandas INT NOT NULL DEFAULT 20,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

- [ ] **Step 4: Add competency_definitions table to migrate.ts**

```sql
CREATE TABLE IF NOT EXISTS competency_definitions (
  id VARCHAR(36) PRIMARY KEY,
  position_level VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  definition TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cd_level (position_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

- [ ] **Step 5: Add position_config table to migrate.ts**

This replaces all the hardcoded POSITION_LABELS, POSITION_LEVELS, POSITION_RANK, LEGAL_HIERARCHY, ADMIN_HIERARCHY in `src/types/index.ts`.

```sql
CREATE TABLE IF NOT EXISTS position_config (
  position VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  level ENUM('legal','administrativo') NOT NULL,
  rank INT NOT NULL DEFAULT 99,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

- [ ] **Step 6: Add score_config table to migrate.ts**

This replaces the hardcoded `SCORE_LABELS` in `src/types/index.ts`.

```sql
CREATE TABLE IF NOT EXISTS score_config (
  score INT PRIMARY KEY,
  label VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

- [ ] **Step 7: Commit**

```bash
git add server/db/migrate.ts
git commit -m "feat(db): add new evaluation config tables for full DB migration"
```

---

## TASK 2: Create Seed Script for Evaluation Data

**Files:**
- Create: `server/db/seed-evaluation-data.ts`

- [ ] **Step 1: Create seed-evaluation-data.ts with all evaluation categories**

Create `server/db/seed-evaluation-data.ts` that exports an `async function seedEvaluationData()` which uses `db.transaction()` to insert all data idempotently (INSERT IGNORE).

The evaluation_categories seed data (from `ALL_CATEGORIES` in questions.ts + `TECHNICAL_SUBCATEGORIES` set + section mapping):

```typescript
const EVALUATION_CATEGORIES = [
  // Competencias
  { id: 'Desempeño', label: 'Desempeño', section: 'competencias', is_technical_subcategory: 0, sort_order: 1 },
  { id: 'Liderazgo', label: 'Liderazgo', section: 'competencias', is_technical_subcategory: 0, sort_order: 2 },
  { id: 'Cumplimiento', label: 'Cumplimiento', section: 'competencias', is_technical_subcategory: 0, sort_order: 3 },
  { id: 'Trabajo en Equipo', label: 'Trabajo en Equipo', section: 'competencias', is_technical_subcategory: 0, sort_order: 4 },
  // Blandas
  { id: 'Habilidades Blandas', label: 'Habilidades Blandas', section: 'blandas', is_technical_subcategory: 0, sort_order: 5 },
  { id: 'Actitud', label: 'Actitud', section: 'blandas', is_technical_subcategory: 0, sort_order: 6 },
  { id: 'Disponibilidad', label: 'Disponibilidad', section: 'blandas', is_technical_subcategory: 0, sort_order: 7 },
  { id: 'Desarrollo', label: 'Desarrollo', section: 'blandas', is_technical_subcategory: 0, sort_order: 8 },
  // Técnico (parent category)
  { id: 'Criterio Técnico', label: 'Criterio Técnico', section: 'tecnico', is_technical_subcategory: 0, sort_order: 9 },
  // Técnico subcategories — Corporativo
  { id: 'Conocimiento normativo', label: 'Conocimiento normativo', section: 'tecnico', is_technical_subcategory: 1, sort_order: 10 },
  { id: 'Redacción legal', label: 'Redacción legal', section: 'tecnico', is_technical_subcategory: 1, sort_order: 11 },
  { id: 'Due diligence', label: 'Due diligence', section: 'tecnico', is_technical_subcategory: 1, sort_order: 12 },
  { id: 'Constitución y modificaciones', label: 'Constitución y modificaciones', section: 'tecnico', is_technical_subcategory: 1, sort_order: 13 },
  { id: 'Atención a clientes', label: 'Atención a clientes', section: 'tecnico', is_technical_subcategory: 1, sort_order: 14 },
  // Técnico subcategories — Consultoría Fiscal
  { id: 'Normatividad fiscal', label: 'Normatividad fiscal', section: 'tecnico', is_technical_subcategory: 1, sort_order: 15 },
  { id: 'Opiniones fiscales', label: 'Opiniones fiscales', section: 'tecnico', is_technical_subcategory: 1, sort_order: 16 },
  { id: 'Planeación fiscal', label: 'Planeación fiscal', section: 'tecnico', is_technical_subcategory: 1, sort_order: 17 },
  { id: 'Criterios y jurisprudencia', label: 'Criterios y jurisprudencia', section: 'tecnico', is_technical_subcategory: 1, sort_order: 18 },
  { id: 'Impactos fiscales', label: 'Impactos fiscales', section: 'tecnico', is_technical_subcategory: 1, sort_order: 19 },
  // Técnico subcategories — Litigio Fiscal
  { id: 'Redacción de escritos', label: 'Redacción de escritos', section: 'tecnico', is_technical_subcategory: 1, sort_order: 20 },
  { id: 'Estrategia procesal', label: 'Estrategia procesal', section: 'tecnico', is_technical_subcategory: 1, sort_order: 21 },
  { id: 'Audiencias y diligencias', label: 'Audiencias y diligencias', section: 'tecnico', is_technical_subcategory: 1, sort_order: 22 },
  { id: 'Seguimiento de expedientes', label: 'Seguimiento de expedientes', section: 'tecnico', is_technical_subcategory: 1, sort_order: 23 },
];
```

- [ ] **Step 2: Add section_weights seed data**

From `SECTION_WEIGHTS` in sectionWeights.ts:

```typescript
const SECTION_WEIGHTS_DATA = [
  { position: 'socio', tecnico: 60, competencias: 20, blandas: 20 },
  { position: 'salary_partner', tecnico: 60, competencias: 20, blandas: 20 },
  { position: 'counsel', tecnico: 60, competencias: 20, blandas: 20 },
  { position: 'asociado_sr', tecnico: 60, competencias: 20, blandas: 20 },
  { position: 'asociado_mid', tecnico: 60, competencias: 20, blandas: 20 },
  { position: 'asociado_jr', tecnico: 40, competencias: 40, blandas: 20 },
  { position: 'pasante_carrera', tecnico: 40, competencias: 40, blandas: 20 },
  { position: 'pasante', tecnico: 40, competencias: 40, blandas: 20 },
  { position: 'director', tecnico: 0, competencias: 80, blandas: 20 },
  { position: 'gerente', tecnico: 0, competencias: 80, blandas: 20 },
  { position: 'coordinador', tecnico: 0, competencias: 80, blandas: 20 },
  { position: 'analista', tecnico: 0, competencias: 80, blandas: 20 },
  { position: 'asistente', tecnico: 0, competencias: 50, blandas: 50 },
  { position: 'archivo_soporte', tecnico: 0, competencias: 50, blandas: 50 },
  { position: 'soporte', tecnico: 0, competencias: 50, blandas: 50 },
  { position: 'archivista', tecnico: 0, competencias: 50, blandas: 50 },
];
```

- [ ] **Step 3: Add position_config seed data**

From POSITION_LABELS, POSITION_LEVELS, POSITION_RANK in types/index.ts:

```typescript
const POSITION_CONFIG_DATA = [
  { position: 'socio', label: 'Socio', level: 'legal', rank: 0, sort_order: 1 },
  { position: 'salary_partner', label: 'Salary Partner', level: 'legal', rank: 1, sort_order: 2 },
  { position: 'counsel', label: 'Counsel', level: 'legal', rank: 1, sort_order: 3 },
  { position: 'asociado_sr', label: 'Asociado Sr', level: 'legal', rank: 2, sort_order: 4 },
  { position: 'asociado_mid', label: 'Asociado Mid', level: 'legal', rank: 3, sort_order: 5 },
  { position: 'asociado_jr', label: 'Asociado Jr', level: 'legal', rank: 4, sort_order: 6 },
  { position: 'pasante_carrera', label: 'Pasante con Carrera', level: 'legal', rank: 5, sort_order: 7 },
  { position: 'pasante', label: 'Pasante', level: 'legal', rank: 6, sort_order: 8 },
  { position: 'director', label: 'Director', level: 'administrativo', rank: 1, sort_order: 9 },
  { position: 'gerente', label: 'Gerente', level: 'administrativo', rank: 2, sort_order: 10 },
  { position: 'coordinador', label: 'Coordinador', level: 'administrativo', rank: 3, sort_order: 11 },
  { position: 'analista', label: 'Analista', level: 'administrativo', rank: 4, sort_order: 12 },
  { position: 'asistente', label: 'Asistente', level: 'administrativo', rank: 5, sort_order: 13 },
  { position: 'soporte', label: 'Soporte', level: 'administrativo', rank: 6, sort_order: 14 },
  { position: 'archivista', label: 'Archivista', level: 'administrativo', rank: 6, sort_order: 15 },
];
```

Note: `dummy` and `archivo_soporte` and `pasante_corporativo` are legacy aliases. They will NOT be seeded into position_config. They will be handled by normalizePosition() in a thin compatibility layer during transition, then removed.

- [ ] **Step 4: Add score_config seed data**

```typescript
const SCORE_CONFIG_DATA = [
  { score: 1, label: 'Deficiente' },
  { score: 2, label: 'Necesita Mejorar' },
  { score: 3, label: 'Satisfactorio' },
  { score: 4, label: 'Bueno' },
  { score: 5, label: 'Excelente' },
];
```

- [ ] **Step 5: Add competency_definitions seed data**

Copy all competency data from `competencyDictionary.ts` with correct position_level mappings. Each competency gets a UUID id, position_level (comma-separated if shared across multiple positions), name, definition, and sort_order.

- [ ] **Step 6: Add template_questions seed data**

Copy ALL questions from `questions.ts` QUESTIONS_BY_POSITION and `technicalQuestions.ts` TECHNICAL_BY_AREA. Each question gets:
- `id`: UUID
- `position`: the position key
- `practice_area`: 'corporativo' for competencias/blandas, actual area for técnico
- `section`: derived from getSectionForQuestion()
- `category`: from the question
- `question_text`: from the question text
- `weight`: from the question weight (these are the template weights that sum to 100 per position)
- `sort_order`: order within the position's template
- `is_active`: 1
- `source`: 'seed'

CRITICAL: The weights in template_questions MUST match the authoritative Excel file exactly. Each position's questions must sum to 100%.

- [ ] **Step 7: Write the seed function using INSERT IGNORE for idempotency**

```typescript
export async function seedEvaluationData(): Promise<void> {
  // Check if already seeded
  const count = await db.getScalar<number>('SELECT COUNT(*) as cnt FROM evaluation_categories');
  if (count > 0) {
    console.log('  Evaluation data already seeded, skipping.');
    return;
  }
  
  await db.transaction(async (conn) => {
    // Insert evaluation_categories
    for (const cat of EVALUATION_CATEGORIES) {
      await tx.run(conn,
        'INSERT IGNORE INTO evaluation_categories (id, label, section, is_technical_subcategory, sort_order) VALUES (?, ?, ?, ?, ?)',
        [cat.id, cat.label, cat.section, cat.is_technical_subcategory, cat.sort_order]);
    }
    // Insert section_weights
    for (const sw of SECTION_WEIGHTS_DATA) {
      await tx.run(conn,
        'INSERT IGNORE INTO section_weights (position, tecnico, competencias, blandas) VALUES (?, ?, ?, ?)',
        [sw.position, sw.tecnico, sw.competencias, sw.blandas]);
    }
    // Insert position_config
    for (const pc of POSITION_CONFIG_DATA) {
      await tx.run(conn,
        'INSERT IGNORE INTO position_config (position, label, level, rank, sort_order) VALUES (?, ?, ?, ?, ?)',
        [pc.position, pc.label, pc.level, pc.rank, pc.sort_order]);
    }
    // Insert score_config
    for (const sc of SCORE_CONFIG_DATA) {
      await tx.run(conn,
        'INSERT IGNORE INTO score_config (score, label) VALUES (?, ?)',
        [sc.score, sc.label]);
    }
    // Insert competency_definitions
    for (const comp of COMPETENCY_DEFINITIONS_DATA) {
      await tx.run(conn,
        'INSERT IGNORE INTO competency_definitions (id, position_level, name, definition, sort_order) VALUES (?, ?, ?, ?, ?)',
        [comp.id, comp.position_level, comp.name, comp.definition, comp.sort_order]);
    }
    // Insert template_questions
    for (const tq of TEMPLATE_QUESTIONS_DATA) {
      await tx.run(conn,
        'INSERT IGNORE INTO template_questions (id, position, practice_area, section, category, question_text, weight, sort_order, is_active, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [tq.id, tq.position, tq.practice_area, tq.section, tq.category, tq.question_text, tq.weight, tq.sort_order, 1, 'seed']);
    }
  });
  console.log('  ✓ Evaluation data seeded');
}
```

- [ ] **Step 8: Call seedEvaluationData from server start**

In `server/index.ts`, add `import { seedEvaluationData } from './db/seed-evaluation-data.js';` and call `await seedEvaluationData()` after `await seed()`.

- [ ] **Step 9: Commit**

```bash
git add server/db/seed-evaluation-data.ts server/index.ts
git commit -m "feat(db): add seed script for evaluation config data"
```

---

## TASK 3: Create Server API Routes for Evaluation Config

**Files:**
- Create: `server/routes/evaluation-config.ts`
- Modify: `server/index.ts` (add route)

- [ ] **Step 1: Create evaluation-config.ts with all GET endpoints**

```typescript
import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/evaluation-config/categories
router.get('/categories', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const categories = await db.all('SELECT * FROM evaluation_categories ORDER BY sort_order');
    return res.json(categories);
  } catch (err) {
    console.error('Get categories error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/evaluation-config/section-weights
router.get('/section-weights', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const weights = await db.all('SELECT * FROM section_weights');
    return res.json(weights);
  } catch (err) {
    console.error('Get section weights error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/evaluation-config/section-weights/:position
router.get('/section-weights/:position', authMiddleware, async (req: Request, res: Response) => {
  try {
    const weights = await db.get('SELECT * FROM section_weights WHERE position = ?', [req.params.position]);
    if (!weights) return res.json({ tecnico: 0, competencias: 80, blandas: 20 });
    return res.json(weights);
  } catch (err) {
    console.error('Get section weights error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/evaluation-config/competencies
router.get('/competencies', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const competencies = await db.all('SELECT * FROM competency_definitions ORDER BY position_level, sort_order');
    return res.json(competencies);
  } catch (err) {
    console.error('Get competencies error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/evaluation-config/competencies/:positionLevel
router.get('/competencies/:positionLevel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const level = req.params.positionLevel;
    // position_level may be a single level or comma-separated; use LIKE for matching
    const competencies = await db.all(
      "SELECT * FROM competency_definitions WHERE position_level = ? OR position_level LIKE ? OR position_level LIKE ? OR position_level LIKE ? ORDER BY sort_order",
      [level, `${level},%`, `%,${level}`, `%,${level},%`]
    );
    return res.json(competencies);
  } catch (err) {
    console.error('Get competencies error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/evaluation-config/template-questions
// Query params: position, practiceArea, section, isActive
router.get('/template-questions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { position, practiceArea, section, isActive } = req.query as Record<string, string>;
    let sql = 'SELECT * FROM template_questions WHERE 1=1';
    const params: any[] = [];
    if (position) { sql += ' AND position = ?'; params.push(position); }
    if (practiceArea) { sql += ' AND practice_area = ?'; params.push(practiceArea); }
    if (section) { sql += ' AND section = ?'; params.push(section); }
    if (isActive !== undefined) { sql += ' AND is_active = ?'; params.push(isActive === '1' ? 1 : 0); }
    sql += ' ORDER BY sort_order';
    const questions = await db.all(sql, params);
    return res.json(questions);
  } catch (err) {
    console.error('Get template questions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/evaluation-config/full-template/:position
// Returns fully assembled template: all questions for a position (optionally filtered by practice_area),
// with rescaled weights so total = 100%. This replaces getQuestionsForUser().
router.get('/full-template/:position', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { position } = req.params;
    const practiceArea = (req.query.practiceArea as string) || 'corporativo';
    
    // Get section weights
    const swRow = await db.get('SELECT * FROM section_weights WHERE position = ?', [position]);
    const sectionWeights = swRow || { tecnico: 0, competencias: 80, blandas: 20 };
    
    // Get all active template questions for this position
    const allQuestions = await db.all(
      'SELECT * FROM template_questions WHERE position = ? AND is_active = 1 ORDER BY sort_order',
      [position]
    );
    
    // Partition by section
    const tecnicas = allQuestions.filter(q => q.section === 'tecnico' && q.practice_area === practiceArea);
    const competencias = allQuestions.filter(q => q.section === 'competencias');
    const blandas = allQuestions.filter(q => q.section === 'blandas');
    
    // Rescale weights within each section
    const rescale = (qs: any[], targetWeight: number) => {
      if (qs.length === 0 || targetWeight <= 0) return [];
      const sum = qs.reduce((s, q) => s + (q.weight || 1), 0) || qs.length;
      return qs.map(q => ({
        ...q,
        weight: Math.round(((q.weight || 1) / sum) * targetWeight * 100) / 100
      }));
    };
    
    const result = [
      ...rescale(tecnicas, sectionWeights.tecnico),
      ...rescale(competencias, sectionWeights.competencias),
      ...rescale(blandas, sectionWeights.blandas),
    ];
    
    return res.json({
      position,
      practiceArea,
      sectionWeights,
      questions: result,
    });
  } catch (err) {
    console.error('Get full template error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/evaluation-config/positions
router.get('/positions', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const positions = await db.all('SELECT * FROM position_config WHERE is_active = 1 ORDER BY level, sort_order');
    return res.json(positions);
  } catch (err) {
    console.error('Get positions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/evaluation-config/score-labels
router.get('/score-labels', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const labels = await db.all('SELECT * FROM score_config ORDER BY score');
    return res.json(labels);
  } catch (err) {
    console.error('Get score labels error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

- [ ] **Step 2: Add PUT /api/evaluation-config/template-questions/:position (admin only)**

This replaces the old `POST /api/questions/custom` endpoint. Admin saves a position's entire template.

```typescript
router.put('/template-questions/:position', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { position } = req.params;
    const { questions } = req.body;
    if (!Array.isArray(questions)) return res.status(400).json({ error: 'questions array required' });
    
    await db.transaction(async (conn) => {
      // Delete existing questions for this position
      await tx.run(conn, 'DELETE FROM template_questions WHERE position = ?', [position]);
      // Insert new questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await tx.run(conn,
          'INSERT INTO template_questions (id, position, practice_area, section, category, question_text, weight, sort_order, is_active, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)',
          [q.id || uuidv4(), position, q.practiceArea || 'corporativo', q.section, q.category, q.text || q.questionText, q.weight, i, q.source || 'custom']);
      }
    });
    
    const result = await db.all('SELECT * FROM template_questions WHERE position = ? ORDER BY sort_order', [position]);
    return res.json(result);
  } catch (err) {
    console.error('Set template questions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

- [ ] **Step 3: Add PATCH /api/evaluation-config/section-weights/:position (admin only)**

```typescript
router.patch('/section-weights/:position', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { position } = req.params;
    const { tecnico, competencias, blandas } = req.body;
    const total = (tecnico || 0) + (competencias || 0) + (blandas || 0);
    if (total !== 100) return res.status(400).json({ error: 'Weights must sum to 100' });
    
    await db.run(
      'INSERT INTO section_weights (position, tecnico, competencias, blandas) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE tecnico = ?, competencias = ?, blandas = ?',
      [position, tecnico || 0, competencias || 0, blandas || 0, tecnico || 0, competencias || 0, blandas || 0]
    );
    const result = await db.get('SELECT * FROM section_weights WHERE position = ?', [position]);
    return res.json(result);
  } catch (err) {
    console.error('Update section weights error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

- [ ] **Step 4: Add PATCH /api/evaluation-config/template-questions/:id (toggle active / edit single question)**

```typescript
router.patch('/template-questions/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const existing = await db.get('SELECT * FROM template_questions WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Question not found' });
    
    const { questionText, category, weight, section, isActive } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    if (questionText !== undefined) { updates.push('question_text = ?'); params.push(questionText); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (weight !== undefined) { updates.push('weight = ?'); params.push(weight); }
    if (section !== undefined) { updates.push('section = ?'); params.push(section); }
    if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }
    
    if (updates.length > 0) {
      await db.run(`UPDATE template_questions SET ${updates.join(', ')} WHERE id = ?`, [...params, req.params.id]);
    }
    const updated = await db.get('SELECT * FROM template_questions WHERE id = ?', [req.params.id]);
    return res.json(updated);
  } catch (err) {
    console.error('Update template question error:', err);
    return res.status(500).json({ error: 'Internal server server' });
  }
});
```

- [ ] **Step 5: Register the route in server/index.ts**

Add import and `app.use('/api/evaluation-config', evaluationConfigRoutes);`

- [ ] **Step 6: Commit**

```bash
git add server/routes/evaluation-config.ts server/index.ts
git commit -m "feat(api): add evaluation-config routes for DB-driven config"
```

---

## TASK 4: Add Frontend API Layer for Evaluation Config

**Files:**
- Modify: `src/api/queries.ts`

- [ ] **Step 1: Add evaluation config hooks to queries.ts**

```typescript
// ── Evaluation Config ──
export function useCategories() {
  return useQuery({ queryKey: ['evaluationCategories'], queryFn: () => api.get<any[]>('/api/evaluation-config/categories') });
}

export function useSectionWeights(position?: string) {
  return useQuery({
    queryKey: ['sectionWeights', position],
    queryFn: () => position
      ? api.get<any>(`/api/evaluation-config/section-weights/${position}`)
      : api.get<any[]>('/api/evaluation-config/section-weights'),
  });
}

export function useUpdateSectionWeights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ position, ...data }: any) => api.patch(`/api/evaluation-config/section-weights/${position}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sectionWeights'] }),
  });
}

export function useCompetencies(positionLevel?: string) {
  return useQuery({
    queryKey: ['competencies', positionLevel],
    queryFn: () => positionLevel
      ? api.get<any[]>(`/api/evaluation-config/competencies/${positionLevel}`)
      : api.get<any[]>('/api/evaluation-config/competencies'),
  });
}

export function useTemplateQuestions(filters?: Record<string, string>) {
  const params = filters ? '?' + new URLSearchParams(filters).toString() : '';
  return useQuery({
    queryKey: ['templateQuestions', filters],
    queryFn: () => api.get<any[]>(`/api/evaluation-config/template-questions${params}`),
  });
}

export function useSetTemplateQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ position, questions }: any) => api.put(`/api/evaluation-config/template-questions/${position}`, { questions }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templateQuestions'] }); qc.invalidateQueries({ queryKey: ['fullTemplate'] }); },
  });
}

export function useUpdateTemplateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/api/evaluation-config/template-questions/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templateQuestions'] }); qc.invalidateQueries({ queryKey: ['fullTemplate'] }); },
  });
}

export function useFullTemplate(position: string, practiceArea?: string) {
  const pa = practiceArea || 'corporativo';
  return useQuery({
    queryKey: ['fullTemplate', position, pa],
    queryFn: () => api.get<any>(`/api/evaluation-config/full-template/${position}?practiceArea=${pa}`),
    enabled: !!position,
  });
}

export function usePositionConfig() {
  return useQuery({ queryKey: ['positionConfig'], queryFn: () => api.get<any[]>('/api/evaluation-config/positions') });
}

export function useScoreLabels() {
  return useQuery({ queryKey: ['scoreLabels'], queryFn: () => api.get<any[]>('/api/evaluation-config/score-labels') });
}
```

- [ ] **Step 2: Remove old custom question hooks from queries.ts**

Remove: `useCustomQuestions`, `useSetCustomQuestions`, `useSeedOverrides`, `useUpdateSeedOverride`

- [ ] **Step 3: Commit**

```bash
git add src/api/queries.ts
git commit -m "feat(api): add evaluation config hooks, remove old custom question hooks"
```

---

## TASK 5: Create Frontend Compatibility Layer

**Files:**
- Create: `src/lib/evaluationConfig.ts`

This module provides utility functions that previously came from `@/data/*` files, but now derive their answers from API data. It ensures no page breaks during the transition.

- [ ] **Step 1: Create evaluationConfig.ts with derived utilities**

```typescript
import { EvalSection } from '@/types';

// Types for API data
export interface CategoryData {
  id: string;
  label: string;
  section: EvalSection;
  isTechnicalSubcategory: number;
  sortOrder: number;
}

export interface PositionConfigData {
  position: string;
  label: string;
  level: 'legal' | 'administrativo';
  rank: number;
  sortOrder: number;
  isActive: number;
}

export interface SectionWeightsData {
  position: string;
  tecnico: number;
  competencias: number;
  blandas: number;
}

export interface ScoreLabelData {
  score: number;
  label: string;
}

// Section labels (static — unlikely to change, but could come from DB)
export const SECTION_LABELS: Record<EvalSection, string> = {
  competencias: 'Competencias',
  tecnico: 'Criterio Técnico',
  blandas: 'Habilidades Blandas',
};

export const SECTION_ORDER: EvalSection[] = ['competencias', 'tecnico', 'blandas'];

// Derive position labels from API data
export function getPositionLabels(positions: PositionConfigData[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const p of positions) {
    result[p.position] = p.label;
  }
  return result;
}

// Derive hierarchies from API data
export function getLegalHierarchy(positions: PositionConfigData[]): string[] {
  return positions
    .filter(p => p.level === 'legal')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(p => p.position);
}

export function getAdminHierarchy(positions: PositionConfigData[]): string[] {
  return positions
    .filter(p => p.level === 'administrativo')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(p => p.position);
}

export function getFullHierarchy(positions: PositionConfigData[]): string[] {
  return [...getLegalHierarchy(positions), ...getAdminHierarchy(positions)];
}

// Derive position levels from API data
export function getPositionLevels(positions: PositionConfigData[]): Record<string, 'legal' | 'administrativo'> {
  const result: Record<string, 'legal' | 'administrativo'> = {};
  for (const p of positions) {
    result[p.position] = p.level;
  }
  return result;
}

// Derive position ranks from API data
export function getPositionRanks(positions: PositionConfigData[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const p of positions) {
    result[p.position] = p.rank;
  }
  return result;
}

// Derive score labels from API data
export function getScoreLabelsMap(labels: ScoreLabelData[]): Record<number, string> {
  const result: Record<number, string> = {};
  for (const s of labels) {
    result[s.score] = s.label;
  }
  return result;
}

// Derive section for a category from API data
export function getSectionForCategory(categories: CategoryData[], categoryId: string): EvalSection {
  const cat = categories.find(c => c.id === categoryId);
  return cat ? cat.section : 'competencias';
}

// Filter categories by section
export function getCategoriesBySection(categories: CategoryData[], section: EvalSection): CategoryData[] {
  return categories.filter(c => c.section === section);
}

// Calculate score — pure function, stays client-side
export function calculateScore(
  questions: any[],
  responses: any[],
  naApprovals?: Record<string, boolean>
): number {
  const activeQuestions = questions.filter(q => {
    const r = responses.find((r: any) => r.questionId === q.id);
    if (r?.notApplicable && naApprovals?.[q.id]) return false;
    if (r?.noElements) return false;
    if (r?.notApplicable && !naApprovals && r.score === 0) return false;
    return true;
  });
  const totalWeight = activeQuestions.reduce((sum, q) => sum + q.weight, 0);
  if (totalWeight === 0) return 0;
  let weightedSum = 0;
  for (const q of activeQuestions) {
    const r = responses.find((r: any) => r.questionId === q.id);
    if (r && !r.notApplicable && !r.noElements && r.score > 0) {
      weightedSum += (r.score / 5) * q.weight;
    }
  }
  return Math.round((weightedSum / totalWeight) * 100);
}

// Normalize position (legacy aliases)
export function normalizePosition(pos: string): string {
  if (pos === 'pasante_corporativo') return 'pasante';
  if (pos === 'archivo_soporte') return 'soporte';
  if (pos === 'dummy') return 'socio';
  return pos;
}

// Normalize practice area (legacy aliases)
export function normalizePracticeArea(area: string): string {
  if (area === 'consultoria_fiscal') return 'fiscal_consultoria';
  if (area === 'litigio_fiscal') return 'fiscal_litigio';
  if (area === 'general') return 'corporativo';
  return area;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/evaluationConfig.ts
git commit -m "feat(lib): add evaluation config utilities for DB-driven data"
```

---

## TASK 6: Rewire Evaluations.tsx

**Files:**
- Modify: `src/pages/Evaluations.tsx`

- [ ] **Step 1: Replace all `@/data/*` imports with API hooks and evaluationConfig utilities**

Replace:
```typescript
import { QUESTIONS_BY_POSITION, getQuestionsForUser, calculateScore, getSectionForQuestion, SECTION_LABELS, SECTION_ORDER } from '@/data/questions';
import { getSectionWeights } from '@/data/sectionWeights';
```

With:
```typescript
import { useFullTemplate, usePositionConfig, useScoreLabels, useCategories } from '@/api/queries';
import { SECTION_LABELS, SECTION_ORDER, calculateScore, getPositionLabels, getPositionLevels, getSectionForCategory } from '@/lib/evaluationConfig';
```

- [ ] **Step 2: Replace hardcoded types imports**

Replace:
```typescript
import { CURRENT_PERIOD, SCORE_LABELS, POSITION_LABELS, PERIODS, ... } from '@/types';
```

Remove POSITION_LABELS, SCORE_LABELS from this import. Instead get them from hooks.

- [ ] **Step 3: Add hooks at component top**

```typescript
const { data: positionConfig = [] } = usePositionConfig();
const { data: scoreLabels = [] } = useScoreLabels();
const { data: categories = [] } = useCategories();
const posLabels = useMemo(() => getPositionLabels(positionConfig), [positionConfig]);
const posLevels = useMemo(() => getPositionLevels(positionConfig), [positionConfig]);
const scoreLabelsMap = useMemo(() => getScoreLabelsMap(scoreLabels), [scoreLabels]);
```

- [ ] **Step 4: Replace every usage of POSITION_LABELS with posLabels**

Search for `POSITION_LABELS[` and replace with `posLabels[`. Same for SCORE_LABELS → scoreLabelsMap.

- [ ] **Step 5: Replace getQuestionsForUser with useFullTemplate**

Where the page currently does:
```typescript
const questions = getQuestionsForUser(emp, customQuestions);
```

Replace with a call to the full template API. Since this is inside a loop over employees, use a helper that fetches the template for a given position. Create a utility component or use the data from the full-template endpoint cached by React Query.

- [ ] **Step 6: Replace getSectionForQuestion with categories-based lookup**

Replace:
```typescript
const section = getSectionForQuestion(q, emp.position);
```

With:
```typescript
const section = getSectionForCategory(categories, q.category);
```

- [ ] **Step 7: Remove customQuestions grouping logic**

Remove the `useCustomQuestions` hook and the grouping logic. All template data now comes from the DB via `useFullTemplate`.

- [ ] **Step 8: Verify no `@/data/` imports remain**

Run: `grep -n "@/data/" src/pages/Evaluations.tsx`
Expected: zero matches

- [ ] **Step 9: Commit**

```bash
git add src/pages/Evaluations.tsx
git commit -m "refactor(Evaluations): rewire to use DB-driven evaluation config"
```

---

## TASK 7: Rewire SelfEvaluation.tsx

**Files:**
- Modify: `src/pages/SelfEvaluation.tsx`

- [ ] **Step 1: Replace all `@/data/*` imports**

Replace:
```typescript
import { QUESTIONS_BY_POSITION, getQuestionsForUser, calculateScore, getSectionForQuestion, SECTION_LABELS, SECTION_ORDER } from '@/data/questions';
import { getSectionWeights } from '@/data/sectionWeights';
```

With:
```typescript
import { useFullTemplate, usePositionConfig, useScoreLabels, useCategories } from '@/api/queries';
import { SECTION_LABELS, SECTION_ORDER, calculateScore, getPositionLabels, getSectionForCategory } from '@/lib/evaluationConfig';
```

- [ ] **Step 2: Replace every hardcoded reference with API-derived data**

Same pattern as Task 6: add hooks, derive labels/levels, replace all usages.

- [ ] **Step 3: Replace getQuestionsForUser call**

The self-eval page calls `getQuestionsForUser(currentUser, customQuestions)` once. Replace with:
```typescript
const normalizedPos = normalizePosition(currentUser.position);
const normalizedArea = normalizePracticeArea(currentUser.practiceArea || 'corporativo');
const { data: fullTemplate } = useFullTemplate(normalizedPos, normalizedArea);
const questions = fullTemplate?.questions || [];
```

- [ ] **Step 4: Remove customQuestions grouping logic**

- [ ] **Step 5: Verify no `@/data/` imports remain**

Run: `grep -n "@/data/" src/pages/SelfEvaluation.tsx`
Expected: zero matches

- [ ] **Step 6: Commit**

```bash
git add src/pages/SelfEvaluation.tsx
git commit -m "refactor(SelfEvaluation): rewire to use DB-driven evaluation config"
```

---

## TASK 8: Rewire EvaluationTemplates.tsx

**Files:**
- Modify: `src/pages/EvaluationTemplates.tsx`

- [ ] **Step 1: Replace all `@/data/*` imports**

Replace:
```typescript
import { getQuestionsForUser } from '@/data/questions';
import { getTechnicalQuestions } from '@/data/technicalQuestions';
import { getSectionWeights } from '@/data/sectionWeights';
```

With:
```typescript
import { useFullTemplate, useTemplateQuestions, useSetTemplateQuestions, useSectionWeights, usePositionConfig, useScoreLabels, useCategories } from '@/api/queries';
import { SECTION_LABELS, SECTION_ORDER, getPositionLabels, getLegalHierarchy, getAdminHierarchy } from '@/lib/evaluationConfig';
```

- [ ] **Step 2: Replace ALL_CATEGORIES import from QuestionLibrary**

The `ALL_CATEGORIES` import from `@/pages/QuestionLibrary` should be replaced by the categories from the API.

- [ ] **Step 3: Replace getQuestionsForUser with useFullTemplate**

For displaying templates, use `useFullTemplate(position)`.

- [ ] **Step 4: Replace save logic**

Currently calls `setCustomQuestions({ position, questions })`. Replace with `useSetTemplateQuestions` which calls `PUT /api/evaluation-config/template-questions/:position`.

- [ ] **Step 5: Replace hardcoded hierarchies with API-derived**

Replace `LEGAL_HIERARCHY` and `ADMIN_HIERARCHY` imports with API-derived versions.

- [ ] **Step 6: Verify no `@/data/` imports remain**

- [ ] **Step 7: Commit**

```bash
git add src/pages/EvaluationTemplates.tsx
git commit -m "refactor(EvaluationTemplates): rewire to use DB-driven evaluation config"
```

---

## TASK 9: Rewire QuestionLibrary.tsx

**Files:**
- Modify: `src/pages/QuestionLibrary.tsx`

- [ ] **Step 1: Replace all `@/data/*` imports**

Replace:
```typescript
import { QUESTIONS_BY_POSITION, getSectionByCategory, getSectionForQuestion, SECTION_LABELS, SECTION_ORDER, getQuestionsForUser } from '@/data/questions';
```

With API hooks and evaluationConfig utilities.

- [ ] **Step 2: Replace QUESTIONS_BY_POSITION with useTemplateQuestions**

The library page iterates over all positions' questions. Replace with `useTemplateQuestions()` (no filter = all).

- [ ] **Step 3: Replace getSectionByCategory with API-derived categories**

- [ ] **Step 4: Replace hardcoded hierarchies with API-derived**

- [ ] **Step 5: Verify no `@/data/` imports remain**

- [ ] **Step 6: Commit**

```bash
git add src/pages/QuestionLibrary.tsx
git commit -m "refactor(QuestionLibrary): rewire to use DB-driven evaluation config"
```

---

## TASK 10: Rewire Help.tsx

**Files:**
- Modify: `src/pages/Help.tsx`

- [ ] **Step 1: Replace competencyDictionary import**

Replace:
```typescript
import { COMPETENCIES_BY_POSITION } from '@/data/competencyDictionary';
```

With:
```typescript
import { useCompetencies, usePositionConfig } from '@/api/queries';
```

- [ ] **Step 2: Use useCompetencies(selectedPos) to get competencies for selected position**

```typescript
const { data: competencies = [] } = useCompetencies(selectedPos);
```

- [ ] **Step 3: Replace hardcoded hierarchy imports with API-derived**

- [ ] **Step 4: Verify no `@/data/` imports remain**

- [ ] **Step 5: Commit**

```bash
git add src/pages/Help.tsx
git commit -m "refactor(Help): rewire to use DB-driven competency definitions"
```

---

## TASK 11: Rewire Settings.tsx

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Replace questions.ts import**

Replace:
```typescript
import { QUESTIONS_BY_POSITION } from '@/data/questions';
```

With API hooks.

- [ ] **Step 2: Replace usages**

Currently uses `QUESTIONS_BY_POSITION[evaluated.position]` to display eval details. Replace with `useFullTemplate(evaluated.position)`.

- [ ] **Step 3: Replace hardcoded labels**

- [ ] **Step 4: Verify no `@/data/` imports remain**

- [ ] **Step 5: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "refactor(Settings): rewire to use DB-driven evaluation config"
```

---

## TASK 12: Rewire EvaluationViewer.tsx

**Files:**
- Modify: `src/components/EvaluationViewer.tsx`

- [ ] **Step 1: Replace all `@/data/*` imports**

Replace:
```typescript
import { QUESTIONS_BY_POSITION, getQuestionsForUser } from '@/data/questions';
import { calculateScore } from '@/data/questions';
```

With API hooks and evaluationConfig utilities.

- [ ] **Step 2: Use useFullTemplate to get questions for the evaluated user**

- [ ] **Step 3: Verify no `@/data/` imports remain**

- [ ] **Step 4: Commit**

```bash
git add src/components/EvaluationViewer.tsx
git commit -m "refactor(EvaluationViewer): rewire to use DB-driven evaluation config"
```

---

## TASK 13: Rewire MyActionPlan.tsx

**Files:**
- Modify: `src/pages/MyActionPlan.tsx`

- [ ] **Step 1: Replace `@/data/questions` import**

Replace:
```typescript
import { getSectionByCategory, SECTION_LABELS } from '@/data/questions';
```

With evaluationConfig utilities.

- [ ] **Step 2: Replace ALL_CATEGORIES import from QuestionLibrary**

Replace `import { ALL_CATEGORIES } from '@/pages/QuestionLibrary'` with categories from API.

- [ ] **Step 3: Verify no `@/data/` imports remain**

- [ ] **Step 4: Commit**

```bash
git add src/pages/MyActionPlan.tsx
git commit -m "refactor(MyActionPlan): rewire to use DB-driven evaluation config"
```

---

## TASK 14: Rewire All Pages That Use Hardcoded Position/Hierarchy Data

**Files:**
- Modify: `src/components/HierarchyFilters.tsx`
- Modify: `src/components/Layout.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Reports.tsx`
- Modify: `src/pages/OrgChart.tsx`
- Modify: `src/pages/AssignSupervisors.tsx`
- Modify: `src/pages/UserManagement.tsx`
- Modify: `src/pages/UserTimeline.tsx`
- Modify: `src/pages/PersonalObjectives.tsx`

- [ ] **Step 1: For each file, replace hardcoded imports with API hooks**

Pattern for each file:
1. Remove `POSITION_LABELS, LEGAL_HIERARCHY, ADMIN_HIERARCHY, POSITION_LEVELS, POSITION_RANK, PRACTICE_AREA_LABELS, SCORE_LABELS` from `@/types` imports
2. Add `import { usePositionConfig, useScoreLabels } from '@/api/queries'`
3. Add `import { getPositionLabels, getLegalHierarchy, getAdminHierarchy, getPositionLevels, getPositionRanks, getScoreLabelsMap } from '@/lib/evaluationConfig'`
4. In component: add hooks, derive values with useMemo, replace all usages

- [ ] **Step 2: HierarchyFilters.tsx — replace hardcoded hierarchies**

Add `usePositionConfig` hook. Replace `LEGAL_HIERARCHY` / `ADMIN_HIERARCHY` / `POSITION_LABELS` with derived versions.

Update `filterByHierarchy` function to accept hierarchies as parameters instead of importing them.

- [ ] **Step 3: Layout.tsx — replace POSITION_LEVELS**

Add `usePositionConfig` hook. Replace `POSITION_LEVELS[currentUser.position]` with derived level.

- [ ] **Step 4: Dashboard.tsx — replace hardcoded hierarchies**

- [ ] **Step 5: Reports.tsx — replace hardcoded hierarchies and labels**

- [ ] **Step 6: OrgChart.tsx — replace hardcoded hierarchies**

- [ ] **Step 7: AssignSupervisors.tsx — replace hardcoded hierarchies**

- [ ] **Step 8: UserManagement.tsx — replace hardcoded hierarchies**

- [ ] **Step 9: UserTimeline.tsx — replace POSITION_LABELS**

- [ ] **Step 10: PersonalObjectives.tsx — replace hardcoded imports**

- [ ] **Step 11: Verify zero `@/data/` imports across entire src/ directory**

Run: `grep -rn "@/data/" src/ --include='*.ts' --include='*.tsx' | grep -v node_modules`
Expected: zero matches

- [ ] **Step 12: Commit**

```bash
git add -A src/
git commit -m "refactor: rewire all pages to use DB-driven position and hierarchy data"
```

---

## TASK 15: Remove AppContext mockData Import

**Files:**
- Modify: `src/contexts/AppContext.tsx`

- [ ] **Step 1: Remove mockData import**

Remove: `import { MOCK_USERS, MOCK_ASSIGNMENTS, MOCK_EVALUATIONS } from '@/data/mockData';`

Verify AppContext doesn't actually use these at runtime (they were legacy). If any reference exists, replace with empty arrays.

- [ ] **Step 2: Commit**

```bash
git add src/contexts/AppContext.tsx
git commit -m "refactor(AppContext): remove legacy mockData import"
```

---

## TASK 16: Clean Up Server — Remove Old Question Routes and positionCatalog.ts

**Files:**
- Modify: `server/routes/questions.ts`
- Modify: `server/routes/system.ts`
- Delete: `server/data/positionCatalog.ts`

- [ ] **Step 1: Remove custom_eval_questions and seed_question_overrides endpoints from questions.ts**

Remove: `GET /custom`, `POST /custom`, `GET /overrides`, `PATCH /overrides/:id`

Keep: `GET /library`, `POST /library`, `PATCH /library/:id`, `DELETE /library/:id` (library stays)

- [ ] **Step 2: Remove positionCatalog.ts import from system.ts**

In `server/routes/system.ts`, remove:
```typescript
import { WORK_AREAS, POSITION_CATALOG } from '../data/positionCatalog.js';
```

Replace the system init seeding of work_areas and custom_positions with reads from the DB (they should already be seeded). If they're not, use the data already in the DB tables (work_areas is seeded during init; position_catalog data comes from seed-evaluation-data.ts via position_config + the existing custom_positions table).

- [ ] **Step 3: Delete server/data/positionCatalog.ts**

```bash
rm server/data/positionCatalog.ts
```

- [ ] **Step 4: Remove VACATION_DEFAULTS hardcode from system.ts**

Move vacation defaults to a DB table or keep in seed (they're already seeded via seed-users.ts).

- [ ] **Step 5: Commit**

```bash
git add server/routes/questions.ts server/routes/system.ts
git rm server/data/positionCatalog.ts
git commit -m "refactor(server): remove old question routes and positionCatalog.ts"
```

---

## TASK 17: Clean Up types/index.ts — Remove Hardcoded Data Exports

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Remove hardcoded data exports from types/index.ts**

Remove all of these exports:
- `POSITION_LABELS`
- `POSITION_LEVELS`
- `POSITION_RANK`
- `LEGAL_HIERARCHY`
- `ADMIN_HIERARCHY`
- `POSITION_HIERARCHY`
- `PRACTICE_AREA_LABELS`
- `SCORE_LABELS`
- `normalizePosition()`
- `normalizePracticeArea()`

Keep:
- All type definitions (`Position`, `PositionLevel`, `EvalSection`, `PracticeArea`, `QuestionCategory`, etc.)
- `LEVEL_LABELS` (very unlikely to change, but could move to DB later)
- `PERIODS`, `CURRENT_PERIOD` (these are app config, not evaluation config)

- [ ] **Step 2: Verify no remaining imports of removed exports**

Run: `grep -rn "POSITION_LABELS\|LEGAL_HIERARCHY\|ADMIN_HIERARCHY\|POSITION_LEVELS\|POSITION_RANK\|PRACTICE_AREA_LABELS\|SCORE_LABELS\|normalizePosition\|normalizePracticeArea" src/ --include='*.ts' --include='*.tsx'`
Expected: only references in `src/lib/evaluationConfig.ts` (our new home for these)

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "refactor(types): remove hardcoded data exports, keep only type definitions"
```

---

## TASK 18: Delete All Hardcoded Data Files

**Files:**
- Delete: `src/data/questions.ts`
- Delete: `src/data/technicalQuestions.ts`
- Delete: `src/data/sectionWeights.ts`
- Delete: `src/data/competencyDictionary.ts`
- Delete: `src/data/mockData.ts`

- [ ] **Step 1: Verify zero remaining imports of these files**

Run: `grep -rn "@/data/questions\|@/data/technicalQuestions\|@/data/sectionWeights\|@/data/competencyDictionary\|@/data/mockData" src/ --include='*.ts' --include='*.tsx'`
Expected: zero matches

- [ ] **Step 2: Delete the files**

```bash
rm src/data/questions.ts
rm src/data/technicalQuestions.ts
rm src/data/sectionWeights.ts
rm src/data/competencyDictionary.ts
rm src/data/mockData.ts
```

- [ ] **Step 3: Remove src/data directory if empty**

```bash
rmdir src/data/ 2>/dev/null || true
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete all hardcoded data files — app is now fully DB-driven"
```

---

## TASK 19: Deprecate Old Database Tables

**Files:**
- Modify: `server/db/migrate.ts`

- [ ] **Step 1: Add migration to mark old tables as deprecated**

Add a comment in migrate.ts indicating that `custom_eval_questions` and `seed_question_overrides` are deprecated. Do NOT drop them yet — keep them for rollback safety until post-deployment verification.

Add a note at the top of migrate.ts:
```typescript
// DEPRECATED TABLES (kept for rollback safety, can be dropped after 2026-06-30):
// - custom_eval_questions (replaced by template_questions)
// - seed_question_overrides (replaced by template_questions.is_active)
```

- [ ] **Step 2: Commit**

```bash
git add server/db/migrate.ts
git commit -m "chore(db): mark deprecated tables, keep for rollback safety"
```

---

## TASK 20: Update CSV Export to Use DB Data Only

**Files:**
- Modify: `server/routes/evaluations.ts`

- [ ] **Step 1: Remove POSITION_LABELS_CSV hardcode**

Replace the hardcoded `POSITION_LABELS_CSV` object with a query to `position_config` table:

```typescript
const positionRows = await db.all('SELECT position, label FROM position_config');
const positionLabels: Record<string, string> = {};
for (const row of positionRows) {
  positionLabels[row.position] = row.label;
}
```

- [ ] **Step 2: Verify CSV export works with position labels from DB**

- [ ] **Step 3: Commit**

```bash
git add server/routes/evaluations.ts
git commit -m "refactor(CSV): use DB-driven position labels instead of hardcode"
```

---

## TASK 21: Build and Smoke Test

- [ ] **Step 1: Run frontend build**

```bash
cd /Users/mikaelwallsten/Downloads/smps-performance-compass-main && npm run build 2>&1 | tail -20
```

Expected: Build succeeds with zero errors.

- [ ] **Step 2: Fix any build errors**

If the build fails, read the error messages, fix the TypeScript/import issues, and rebuild. Common issues:
- Missing imports (forgot to add a hook)
- Type mismatches (API data shape differs from what the page expects)
- Unused variables from removed imports

- [ ] **Step 3: Run type check**

```bash
cd /Users/mikaelwallsten/Downloads/smps-performance-compass-main && npx tsc --noEmit 2>&1 | head -30
```

Expected: Zero type errors.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build and type errors after DB migration"
```

---

## TASK 22: Functional Testing — Every Page

- [ ] **Step 1: Start the dev server locally**

```bash
cd /Users/mikaelwallsten/Downloads/smps-performance-compass-main && npm run dev
```

- [ ] **Step 2: Test Login page**

Login as SuperAdmin. Verify login succeeds.

- [ ] **Step 3: Test Dashboard**

Navigate to Dashboard. Verify:
- Position labels display correctly (from DB)
- Hierarchy filters work (Legal/Administrativo)
- Statistics compute correctly

- [ ] **Step 4: Test Evaluations page**

- Can see evaluation form with questions from DB
- Questions are grouped by section (Competencias, Técnico, Blandas)
- Weights display correctly and sum to 100%
- Can submit an evaluation
- Score calculation works

- [ ] **Step 5: Test Self-Evaluation page**

- Questions load from DB
- Section groupings display
- Weights display correctly
- Can submit self-evaluation
- Draft save/load works

- [ ] **Step 6: Test Evaluation Templates page**

- All positions display with correct question counts
- Legal positions show with Técnico section
- Admin positions show without Técnico section
- Weights sum to 100% for each position
- Can edit a template (add/remove questions, change weights)
- Save works without error

- [ ] **Step 7: Test Question Library page**

- All questions display (seed + library)
- Category section colors work
- Filters work (by section, category, position)
- Can add/edit library questions
- Can hide seed questions

- [ ] **Step 8: Test Help page**

- Competency dictionary loads from DB
- Selecting a position shows correct competencies
- Definitions display correctly

- [ ] **Step 9: Test Settings page**

- Evaluation history displays correctly
- Position labels come from DB
- Score labels display correctly

- [ ] **Step 10: Test Evaluation Viewer**

- Completed evaluations display with correct questions
- Scores and labels match
- NA approval works

- [ ] **Step 11: Test My Action Plan page**

- Category dropdowns populate from DB
- Section labels display correctly
- Can create/save action plans

- [ ] **Step 12: Test Org Chart**

- Hierarchy displays correctly
- Legal/Administrativo separation works
- Position labels from DB

- [ ] **Step 13: Test Reports**

- Charts render with correct position labels
- Filters work

- [ ] **Step 14: Test User Management**

- Position dropdowns use DB labels
- Hierarchy filters work

- [ ] **Step 15: Test Assign Supervisors**

- Same hierarchy filter tests

- [ ] **Step 16: Test CSV Export**

- Download CSV for a period with completed evaluations
- Verify position labels in CSV come from DB (not hardcoded)
- Verify weights in CSV match what users see

- [ ] **Step 17: Fix any issues found during testing**

For each issue found, fix it and re-test that specific page.

- [ ] **Step 18: Commit all fixes**

```bash
git add -A
git commit -m "fix: resolve all issues found during functional testing"
```

---

## TASK 23: Final Verification — Zero Hardcoded Data References

- [ ] **Step 1: Search for any remaining `@/data/` imports**

```bash
grep -rn "@/data/" src/ --include='*.ts' --include='*.tsx'
```

Expected: zero matches

- [ ] **Step 2: Search for any remaining hardcoded position/question data in src/types/index.ts**

```bash
grep -n "POSITION_LABELS\|LEGAL_HIERARCHY\|ADMIN_HIERARCHY\|SCORE_LABELS\|POSITION_LEVELS\|POSITION_RANK\|PRACTICE_AREA_LABELS" src/types/index.ts
```

Expected: zero matches (all removed)

- [ ] **Step 3: Search for any remaining references to deleted data files in server**

```bash
grep -rn "positionCatalog\|questions\.ts\|technicalQuestions\|sectionWeights\|competencyDictionary\|mockData" server/ --include='*.ts'
```

Expected: zero matches

- [ ] **Step 4: Verify no src/data/ directory exists**

```bash
ls src/data/ 2>&1
```

Expected: "No such file or directory" or empty

- [ ] **Step 5: Verify build succeeds clean**

```bash
npm run build 2>&1 | tail -5
```

Expected: "built in" with no errors

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup — zero hardcoded data references remain"
```

---

## TASK 24: Push to GitHub and Deploy to Hostinger

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Watch GitHub Actions CI**

```bash
gh run list --repo miquewallsten/smps-performance-compass --limit 1
```

Wait for the build to complete. If it fails, read the logs, fix, and push again.

- [ ] **Step 3: Verify deployment on Hostinger**

Open `https://smps.bowdot.online` and verify:
- Login works
- All pages load without errors
- Data displays correctly from the DB
- No "Algo salió mal" errors

- [ ] **Step 4: Test on Hostinger — critical paths**

1. Login as SuperAdmin
2. Go to Evaluation Templates — verify all positions show with correct question counts and 100% weights
3. Go to Question Library — verify all questions display
4. Go to Evaluations — create and submit a test evaluation
5. Export CSV — verify it downloads with correct data
6. Go to Help — verify competency dictionary works

---

## TASK 25: Post-Migration Cleanup and Documentation

- [ ] **Step 1: Drop deprecated database tables (after confirming everything works)**

After at least 24 hours of successful production operation, run on the Hostinger MySQL:

```sql
DROP TABLE IF EXISTS custom_eval_questions;
DROP TABLE IF EXISTS seed_question_overrides;
```

- [ ] **Step 2: Remove deprecated table creation from migrate.ts**

Remove the CREATE TABLE statements for `custom_eval_questions` and `seed_question_overrides` from `server/db/migrate.ts`.

- [ ] **Step 3: Remove deprecated columns**

If any columns were added to existing tables for legacy compatibility (like `section` and `practice_area` on `custom_eval_questions`), remove them.

- [ ] **Step 4: Clean up any unused imports/variables**

Run a linting pass:
```bash
npx eslint src/ server/ --ext .ts,.tsx 2>&1 | head -30
```

Fix any issues.

- [ ] **Step 5: Update this plan document with completion notes**

Mark all tasks as complete.

- [ ] **Step 6: Final commit and push**

```bash
git add -A
git commit -m "chore: post-migration cleanup — drop deprecated tables, remove dead code"
git push origin main
```

---

## SELF-REVIEW CHECKLIST

1. **Spec coverage:** Every hardcoded .ts data file is accounted for (questions.ts, technicalQuestions.ts, sectionWeights.ts, competencyDictionary.ts, mockData.ts, positionCatalog.ts). Every frontend page that imports from these files has a rewire task. Every type export that holds data (not types) has been moved.

2. **Placeholder scan:** No TBD, TODO, "implement later", "add validation", "write tests" without code. Every step has actual code or exact commands.

3. **Type consistency:** `calculateScore()` signature in evaluationConfig.ts matches current usage. `normalizePosition()` and `normalizePracticeArea()` signatures match. API response shapes are defined in evaluationConfig.ts interfaces.

4. **Missing coverage check:**
   - `src/pages/AccessControl.tsx` — does NOT import any hardcoded data, no rewire needed ✅
   - `src/pages/PeriodConfig.tsx` — does NOT import any hardcoded data, no rewire needed ✅
   - `src/pages/Vacations.tsx` — does NOT import any hardcoded data, no rewire needed ✅
   - `src/pages/Communications.tsx` — does NOT import any hardcoded data, no rewire needed ✅
   - `src/pages/CopilotChat.tsx` — does NOT import any hardcoded data, no rewire needed ✅
   - `src/pages/Setup.tsx` — does NOT import any hardcoded data, no rewire needed ✅
   - `src/pages/MyProfile.tsx` — does NOT import any hardcoded data, no rewire needed ✅
   - `src/pages/NotFound.tsx` — does NOT import any hardcoded data, no rewire needed ✅
   - `src/pages/Login.tsx` — does NOT import any hardcoded data, no rewire needed ✅
   - `src/pages/ChangePassword.tsx` — does NOT import any hardcoded data, no rewire needed ✅


---

## AMENDMENT A: Question Library Table

The plan missed the `library_questions` table. It must be explicitly included and cleaned up.

### Current State (WRONG)
```sql
CREATE TABLE library_questions (
  id VARCHAR(36) PRIMARY KEY,
  question_id VARCHAR(36) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  default_weight INT NOT NULL DEFAULT 1,   -- THIS IS WRONG — questions should NOT have weights
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(36)
);
```

### New State (CORRECT)
The library is a pool of reusable questions. Questions in the library do NOT have weights. Weights are only assigned when a question is added to a template (in `template_questions`).

```sql
CREATE TABLE question_library (
  id VARCHAR(36) PRIMARY KEY,
  question_id VARCHAR(50) NOT NULL UNIQUE,   -- human-readable key like 'lib-001'
  category VARCHAR(50) NOT NULL,             -- FK → evaluation_categories.id
  text TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(36),
  INDEX idx_ql_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Key change: `default_weight` column is REMOVED.** Questions in the library are weight-less. When an admin imports a library question into a template, they assign the weight there (in `template_questions`).

### Integration with Plan

**Add to TASK 1 (Step 6.5):** Add `question_library` CREATE TABLE to migrate.ts.

**Add to TASK 2 (seed script):** Migrate existing `library_questions` data into `question_library` (dropping `default_weight`). Seed the initial 22 library questions from `seed-users.ts`.

**Add to TASK 3 (API routes):** Move library CRUD from `server/routes/questions.ts` into `server/routes/evaluation-config.ts`:

```typescript
// GET /api/evaluation-config/library
router.get('/library', authMiddleware, async (_req, res) => { ... });

// POST /api/evaluation-config/library (admin only)
router.post('/library', authMiddleware, requireAdmin, async (req, res) => {
  // NO default_weight accepted — library questions have no weight
  const { questionId, category, text } = req.body;
  ...
});

// PATCH /api/evaluation-config/library/:id (admin only)
router.patch('/library/:id', authMiddleware, requireAdmin, async (req, res) => { ... });

// DELETE /api/evaluation-config/library/:id (admin only)
router.delete('/library/:id', authMiddleware, requireAdmin, async (req, res) => { ... });
```

**Add to TASK 4 (frontend hooks):** Update library hooks to point to new endpoint and remove `defaultWeight` from the shape:

```typescript
export function useLibraryQuestions() {
  return useQuery({ queryKey: ['libraryQuestions'], queryFn: () => api.get<any[]>('/api/evaluation-config/library') });
}
// etc.
```

**Add to TASK 16 (server cleanup):** Remove library endpoints from `server/routes/questions.ts`. After migration, `questions.ts` route file can be deleted entirely (all endpoints moved to evaluation-config).

**Add to TASK 19 (deprecate old tables):** Mark `library_questions` as deprecated (replaced by `question_library`).

**Add to TASK 25 (post-migration):** DROP `library_questions` table.

---

## AMENDMENT B: Table Renaming for Consistency

All new tables use clean, consistent naming:

| Old Table | New Table | Status |
|---|---|---|
| `library_questions` | `question_library` | NEW — replace old |
| `custom_eval_questions` | — | DROP (merged into `template_questions`) |
| `seed_question_overrides` | — | DROP (merged into `template_questions`) |
| `custom_positions` | `position_catalog` | RENAME or keep as-is (already exists, populated by system init) |

All other existing tables keep their names — they're fine.

---

## AMENDMENT C: Complete System Audit — Everything the Plan Missed

After a full `grep`-based audit of every file in `src/` and `server/`, here is every item the original plan missed:

### MISSED PAGE: `src/pages/Communications.tsx`
**Uses:** `POSITION_LABELS`, `POSITION_LEVELS` from `@/types`
- Line 13: `import { POSITION_LABELS, POSITION_LEVELS } from '@/types';`
- Line 38: `POSITION_LEVELS[currentUser.position]` — determines legal/admin level
- Line 89: `POSITION_LEVELS[u.position] === ann.audience` — filters announcements by level
- Line 141, 167: `POSITION_LABELS[author.position]`, `POSITION_LABELS[u.position]` — display labels

**Fix:** Add to Task 14 rewire list. Replace with `usePositionConfig()` + derived `getPositionLabels()` / `getPositionLevels()`.

### MISSED PAGE: `src/pages/Vacations.tsx`
**Uses:** `POSITION_LABELS`, `POSITION_LEVELS` from `@/types`
- Line 14: `import { POSITION_LABELS, POSITION_LEVELS, CURRENT_PERIOD } from '@/types';`
- Line 199, 238, 273, 277, 517, 570, 634: multiple usages of `POSITION_LABELS[pos]` and `POSITION_LEVELS`

**Fix:** Add to Task 14 rewire list.

### MISSED PAGE: `src/pages/MyProfile.tsx`
**Uses:** `POSITION_LABELS`, `POSITION_LEVELS`, `LEVEL_LABELS`, `PERIODS` from `@/types`
- Line 5: `import { CURRENT_PERIOD, PERIODS, POSITION_LABELS, POSITION_LEVELS, LEVEL_LABELS } from '@/types';`
- Line 30: `POSITION_LEVELS[currentUser.position]`
- Line 74: `POSITION_LABELS[currentUser.position]` and `LEVEL_LABELS[level]`
- Line 95-96: position label and level label display
- Line 155: `POSITION_LABELS[t.user!.position]`

**Fix:** Add to Task 14. `LEVEL_LABELS` = `{ legal: 'Legal', administrativo: 'Administrativo' }` — this is a 2-entry map. Either:
- (a) Add to `position_config` table as a `level_label` column, or
- (b) Add a `level_labels` row to a config table, or
- (c) Derive from `work_areas.level` + `work_areas.label` (already in DB).
Best: option (c) — the work_areas table already has `level` and `label`. "Legal" and "Administrativo" are just the level labels. We can derive them.

### MISSED PAGE: `src/pages/PeriodConfig.tsx`
**Uses:** `PERIODS` from `@/types`
- Line 4: `import { PERIODS, PeriodConfig } from '@/types';`
- Lines 55, 73, 79, 134: `PERIODS.map(...)` — dropdown of available periods

**Fix:** `PERIODS` is currently `['2025-H2', '2026-H1', '2026-H2']` — a hardcoded array. This should come from the `period_configs` table (already in DB). Replace with `usePeriods()` hook (already exists in queries.ts). Add to Task 14.

### MISSED CONSTANT: `LEVEL_LABELS` in `src/types/index.ts`
**Definition:** `{ legal: 'Legal', administrativo: 'Administrativo' }`
**Used by:** `MyProfile.tsx` (2 usages)
**Fix:** Remove from types/index.ts. Derive from `work_areas` table data via API. Add `useWorkAreas()` data → derive level label from the area with matching level.

### MISSED CONSTANT: `PRACTICE_AREA_LABELS` in `src/types/index.ts`
**Definition:** Labels for practice areas (fiscal_consultoria → 'Fiscal Consultoría', etc.)
**Used by:** Currently zero usages! (grep found nothing outside the export itself)
**Fix:** Remove from types/index.ts. The `work_areas` table already has `label` for each area.

### MISSED CONSTANT: `PERIODS` and `CURRENT_PERIOD` in `src/types/index.ts`
**Used by:** 15+ pages
**Decision:** These are **app config**, not evaluation config. They define which evaluation periods exist. They already have a `period_configs` table in the DB. `usePeriods()` hook already exists. `CURRENT_PERIOD` should be derived from period_configs (the active/open period).
**Fix:** 
1. Remove `PERIODS` and `CURRENT_PERIOD` from types/index.ts
2. `PERIODS` → use `usePeriods()` hook (already exists)
3. `CURRENT_PERIOD` → derive from period_configs: find the period whose dates are currently active
4. OR add a `current_period` column to `period_configs` / `system_status` table
5. Add a server endpoint `GET /api/periods/current` that returns the active period
6. Add `useCurrentPeriod()` hook
7. Rewire all 15+ pages that import `CURRENT_PERIOD`

### MISSED SERVER FILE: `server/db/seed-users.ts` — Library Questions Seeding
**Issue:** seed-users.ts seeds `library_questions` table with 22 questions that have `default_weight`. After migration, the new `question_library` table has NO weight column.
**Fix:** In Task 2 (seed-evaluation-data.ts), add migration logic that:
1. Reads existing rows from `library_questions`
2. Inserts them into `question_library` (without the `default_weight` column)
3. In seed-users.ts, update the library question seeding to use `question_library` table and remove `weight` field

### MISSED SERVER FILE: `server/routes/users.ts.bug-backup`
**Issue:** 529-line dead backup file sitting in `server/routes/`
**Fix:** Delete in Task 25 (post-migration cleanup)

### MISSED TYPE: `LibraryQuestion` in `src/types/index.ts`
**Current:**
```typescript
export interface LibraryQuestion {
  id: string;
  category: QuestionCategory;
  text: string;
  createdAt: string;
  createdBy?: string;
}
```
**Fix:** This interface is fine — it already has no `defaultWeight` field. But the API returns `default_weight` from the old `library_questions` table. After migration to `question_library` (no weight column), the API won't return it. Verify the camelCase conversion in `client.ts` handles this correctly.

### MISSED TYPE: `EvalQuestion` in `src/types/index.ts`
**Current:**
```typescript
export interface EvalQuestion {
  id: string;
  category: QuestionCategory;
  text: string;
  weight: number;
  section?: EvalSection;
  practiceArea?: PracticeArea;
}
```
**Fix:** After migration, `template_questions` rows will have `question_text` (not `text`) and `practice_area` (not `practiceArea`). The API camelCase conversion in `client.ts` handles snake_case → camelCase, so the frontend will receive `questionText` which maps to `text`. We need to ensure the `toCamelCase` function in `client.ts` correctly maps `question_text` → `questionText`, and update `EvalQuestion.text` to match. OR the server endpoint should return `{ ...row, text: row.question_text }` for compatibility.

### COMPLETE REWIRED PAGES LIST (Updated)

| # | File | Hardcoded Imports to Remove | Status in Plan |
|---|---|---|---|
| 1 | `Evaluations.tsx` | `@/data/questions`, `@/data/sectionWeights`, POSITION_LABELS, SCORE_LABELS, LEGAL_HIERARCHY, ADMIN_HIERARCHY, CURRENT_PERIOD, PERIODS | ✅ Task 6 |
| 2 | `SelfEvaluation.tsx` | `@/data/questions`, `@/data/sectionWeights`, POSITION_LABELS, SCORE_LABELS, CURRENT_PERIOD | ✅ Task 7 |
| 3 | `EvaluationTemplates.tsx` | `@/data/questions`, `@/data/technicalQuestions`, `@/data/sectionWeights`, POSITION_LABELS, LEGAL_HIERARCHY, ADMIN_HIERARCHY, POSITION_LEVELS, SCORE_LABELS | ✅ Task 8 |
| 4 | `QuestionLibrary.tsx` | `@/data/questions`, POSITION_LABELS, LEGAL_HIERARCHY, ADMIN_HIERARCHY, POSITION_LEVELS | ✅ Task 9 |
| 5 | `Help.tsx` | `@/data/competencyDictionary`, POSITION_LABELS, LEGAL_HIERARCHY, ADMIN_HIERARCHY, POSITION_LEVELS | ✅ Task 10 |
| 6 | `Settings.tsx` | `@/data/questions`, POSITION_LABELS, SCORE_LABELS, PERIODS, CURRENT_PERIOD | ✅ Task 11 |
| 7 | `EvaluationViewer.tsx` | `@/data/questions`, POSITION_LABELS, SCORE_LABELS | ✅ Task 12 |
| 8 | `MyActionPlan.tsx` | `@/data/questions`, POSITION_LABELS, POSITION_RANK, PERIODS, CURRENT_PERIOD | ✅ Task 13 |
| 9 | `HierarchyFilters.tsx` | LEGAL_HIERARCHY, ADMIN_HIERARCHY, POSITION_LABELS, POSITION_HIERARCHY | ✅ Task 14 |
| 10 | `Layout.tsx` | POSITION_LEVELS, CURRENT_PERIOD | ✅ Task 14 |
| 11 | `Dashboard.tsx` | POSITION_LABELS, LEGAL_HIERARCHY, ADMIN_HIERARCHY, POSITION_HIERARCHY, CURRENT_PERIOD | ✅ Task 14 |
| 12 | `Reports.tsx` | POSITION_LABELS, LEGAL_HIERARCHY, ADMIN_HIERARCHY, POSITION_LEVELS, POSITION_HIERARCHY, CURRENT_PERIOD | ✅ Task 14 |
| 13 | `OrgChart.tsx` | POSITION_LABELS, LEGAL_HIERARCHY, ADMIN_HIERARCHY, CURRENT_PERIOD | ✅ Task 14 |
| 14 | `AssignSupervisors.tsx` | POSITION_LABELS, LEGAL_HIERARCHY, ADMIN_HIERARCHY, PERIODS, CURRENT_PERIOD | ✅ Task 14 |
| 15 | `UserManagement.tsx` | POSITION_LABELS, LEGAL_HIERARCHY, ADMIN_HIERARCHY, PERIODS | ✅ Task 14 |
| 16 | `UserTimeline.tsx` | POSITION_LABELS | ✅ Task 14 |
| 17 | `PersonalObjectives.tsx` | POSITION_LABELS, POSITION_LEVELS, PERIODS, CURRENT_PERIOD | ✅ Task 14 |
| 18 | **Communications.tsx** | POSITION_LABELS, POSITION_LEVELS | ❌ **MISSED** |
| 19 | **Vacations.tsx** | POSITION_LABELS, POSITION_LEVELS, CURRENT_PERIOD | ❌ **MISSED** |
| 20 | **MyProfile.tsx** | POSITION_LABELS, POSITION_LEVELS, LEVEL_LABELS, PERIODS, CURRENT_PERIOD | ❌ **MISSED** |
| 21 | **PeriodConfig.tsx** | PERIODS | ❌ **MISSED** (PERIODS should come from DB) |
| 22 | `PeriodEndAlert.tsx` | CURRENT_PERIOD | ❌ **MISSED** (needs useCurrentPeriod hook) |
| 23 | `PositionManagement.tsx` | POSITION_LABELS, LEGAL_HIERARCHY, ADMIN_HIERARCHY | ✅ Task 14 (but verify) |

### UPDATED types/index.ts REMOVAL LIST

| Export | Used By | Move To |
|---|---|---|
| `POSITION_LABELS` | 18 pages/components | `position_config` table → API |
| `POSITION_LEVELS` | 12 pages/components | `position_config.level` → API |
| `POSITION_RANK` | 2 pages | `position_config.rank` → API |
| `LEGAL_HIERARCHY` | 12 pages/components | `position_config` (WHERE level='legal', ORDER BY sort_order) → API |
| `ADMIN_HIERARCHY` | 12 pages/components | `position_config` (WHERE level='administrativo', ORDER BY sort_order) → API |
| `POSITION_HIERARCHY` | 3 pages | Derived from legal+admin → API |
| `LEVEL_LABELS` | 1 page (MyProfile) | Derive from `work_areas` → API |
| `PRACTICE_AREA_LABELS` | 0 pages (dead code) | Delete outright |
| `SCORE_LABELS` | 5 pages | `score_config` table → API |
| `PERIODS` | 6 pages | `period_configs` table → `usePeriods()` (hook exists) |
| `CURRENT_PERIOD` | 15+ pages | Derive from `period_configs` or add `GET /api/periods/current` |
| `normalizePosition()` | 3 pages + data files | Keep in `evaluationConfig.ts` (temporary, remove after data cleanup) |
| `normalizePracticeArea()` | 2 pages + data files | Keep in `evaluationConfig.ts` (temporary, remove after data cleanup) |

### SERVER-SIDE ITEMS TO UPDATE (Complete List)

| File | Change |
|---|---|
| `server/db/migrate.ts` | Add 7 new tables; mark 3 as deprecated |
| `server/db/seed-evaluation-data.ts` | NEW — seed all evaluation config data |
| `server/db/seed-users.ts` | Update library question seeding to use `question_library` (no weight) |
| `server/routes/evaluation-config.ts` | NEW — all evaluation config endpoints |
| `server/routes/questions.ts` | DELETE entirely (all endpoints moved to evaluation-config) |
| `server/routes/system.ts` | Remove `positionCatalog.ts` import; read from DB |
| `server/routes/evaluations.ts` | Replace `POSITION_LABELS_CSV` with DB query to `position_config` |
| `server/data/positionCatalog.ts` | DELETE |
| `server/routes/users.ts.bug-backup` | DELETE (dead file) |
| `server/index.ts` | Add evaluation-config route; remove questions route |

---

## AMENDMENT D: Complete Application Domain Model — How Everything Connects

Before touching a single line of code, the implementer MUST understand how the app works end-to-end. Every data migration decision depends on this.

### 1. ORGANIZATIONAL STRUCTURE

**SMPS** is a Mexican law firm with two tiers:

```
FIRM
├── Legal (abogados)
│   ├── Socio (Partner) — highest rank, runs the firm
│   ├── Salary Partner — partner without equity
│   ├── Counsel — senior advisor
│   ├── Asociado Sr — senior associate
│   ├── Asociado Mid — mid-level associate
│   ├── Asociado Jr — junior associate
│   ├── Pasante con Carrera — intern with law degree
│   └── Pasante — intern (no degree yet)
│
└── Administrativo (back-office)
    ├── Director — department head (Marketing, Finance, HR)
    ├── Gerente — manager
    ├── Coordinador — coordinator
    ├── Analista — analyst
    ├── Asistente — assistant
    ├── Soporte — IT/support
    └── Archivista — file clerk
```

**Each legal employee has a `practiceArea`** (corporativo, fiscal_consultoria, fiscal_litigio). Administrative employees do NOT have a practice area.

**Each employee has a `position`** (the base position like 'socio', 'analista') AND optionally a `customPositionId` (like 'SMPS03' — the specific role within the catalog, e.g., "Socio Corporativo" vs "Socio Litigio Fiscal").

**Why this matters for migration:** The evaluation questions a person sees depend on their `position` AND `practiceArea`. A Socio in Corporativo gets different technical questions than a Socio in Fiscal Litigio. But both get the same competencias/blandas questions. The `customPositionId` links to `custom_positions` table (SMPS01-SMPS29) which maps to `base_position` + `work_area_id`.

### 2. EVALUATION CYCLE (The Core of the App)

The app runs evaluations in **periods** (e.g., '2026-H1'). Each period has 4 chronological stages, configured in `period_configs`:

```
Stage 1: AUTOEVALUACIÓN (Self-Evaluation)
  - Employee evaluates THEMSELVES
  - Questions come from their position template
  - They rate each question 1-5 (or mark N/A or Sin Elementos)
  - Comments are mandatory
  - Once submitted, CANNOT be edited

Stage 2: EVALUACIÓN DE EVALUADOR(ES) (Supervisor Evaluation)
  - Each assigned supervisor evaluates the employee
  - An employee can have 1-2 supervisors per period
  - If multiple supervisors, scores are averaged
  - Same questions as self-eval (from the position template)
  - Once submitted, CANNOT be edited

Stage 3: SESIÓN DE FEEDBACK (Feedback Session)
  - After ALL supervisor evals are done
  - The supervisor marks feedback as completed
  - This unlocks the Action Plan stage

Stage 4: PLAN DE ACCIÓN (Action Plan)
  - Employee creates 1-3 SMART action items
  - Each tied to a competency category
  - The "senior" supervisor (highest rank) approves/rejects
  - Once approved, plan is locked
```

**CRITICAL: Evaluation responses are IMMUTABLE once saved.** When an evaluation is submitted:
- Each response stores `question_id`, `score`, `weight` (the rescaled weight at time of submission)
- These weights are FROZEN — if someone later changes the template, existing evaluations are NOT affected
- This is why `evaluation_responses.weight` exists as a column — it's a snapshot

### 3. HOW QUESTIONS ARE ASSEMBLED FOR AN EVALUATION

This is the most complex part of the system. Here's the exact flow:

```
getQuestionsForUser(user) → assembled questions for the evaluation form

Step 1: Get the user's position and practice area
  position = user.position (e.g., 'socio')
  practiceArea = user.practiceArea (e.g., 'corporativo')

Step 2: Get section weights for this position
  sectionWeights = getSectionWeights(position)
  // e.g., socio: { tecnico: 60, competencias: 20, blandas: 20 }

Step 3: Get template questions (competencias + blandas)
  template = customQuestions[position] OR QUESTIONS_BY_POSITION[position]
  tplCompetencias = template.filter(q => section === 'competencias')
  tplBlandas = template.filter(q => section === 'blandas')

Step 4: Get technical questions (only for legal positions)
  if (position level === 'legal'):
    tecnicas = getTechnicalQuestions(position, practiceArea)
    // e.g., socio + corporativo → 5 specific questions
  else:
    tecnicas = [] (admin positions have NO technical section)

Step 5: RESCALE weights within each section
  Each question has a relative weight (e.g., 5, 4, 4).
  But the total must match the section weight from step 2.
  
  rescale(questions, targetWeight):
    sum = sum of all question weights in section
    each question's new weight = (question.weight / sum) * targetWeight
    // This ensures section weights add to 100%

Step 6: Combine all sections
  return [
    ...rescale(tecnicas, sectionWeights.tecnico),
    ...rescale(tplCompetencias, sectionWeights.competencias),
    ...rescale(tplBlandas, sectionWeights.blandas),
  ]
```

**Example for Socio in Corporativo:**
- Section weights: técnico=60%, competencias=20%, blandas=20%
- Técnico: 5 questions from corporativo subcategories, rescaled to sum to 60%
- Competencias: 3 questions (Liderazgo, Trabajo en Equipo), rescaled to sum to 20%
- Blandas: 3 questions (Habilidades Blandas, Actitud, Disponibilidad), rescaled to sum to 20%
- Total: 11 questions, all weights sum to 100%

**Example for Analista (Administrativo):**
- Section weights: técnico=0%, competencias=80%, blandas=20%
- Técnico: NO questions (admin positions don't have technical)
- Competencias: 6-7 questions rescaled to sum to 80%
- Blandas: 3-4 questions rescaled to sum to 20%
- Total: ~10 questions, all weights sum to 100%

### 4. HOW SCORING WORKS

When an evaluation is submitted:

```
calculateScore(questions, responses, naApprovals):
  1. Filter out N/A questions that are approved
  2. Filter out Sin Elementos questions
  3. Calculate total weight of remaining questions
  4. For each answered question: weightedSum += (score / 5) * weight
  5. Return Math.round((weightedSum / totalWeight) * 100)
```

**The total score is a percentage (0-100%).** It's calculated at submission time and stored in `evaluations.total_score`. The individual `weight` values for each response are stored in `evaluation_responses.weight`.

### 5. N/A APPROVAL FLOW

In self-evaluations, employees can mark questions as "No Aplica" (N/A). But N/A needs supervisor approval:

1. Employee marks question as N/A in self-eval
2. Supervisor sees the N/A flag in EvaluationViewer
3. Supervisor clicks ✓ (approve) or ✗ (reject)
4. If approved → question excluded from score calculation
5. If rejected → question must be answered (score = 0 currently, which hurts)

This is stored in `evaluation_na_approvals` table.

### 6. TEMPLATE VS. LIBRARY RELATIONSHIP

**Question Library** (`library_questions` / new `question_library`):
- Pool of reusable questions created by admins
- NO weights — questions are weight-less here
- Used as a source to IMPORT into templates

**Evaluation Templates** (`QUESTIONS_BY_POSITION` / new `template_questions`):
- Per-position collection of questions WITH weights
- Weights sum to 100% per position
- Admin can edit: add questions, remove questions, change weights
- When saving, the entire template for a position is replaced

**The flow:**
1. Admin opens Evaluation Templates page
2. Selects a position (e.g., "Analista")
3. Sees all current questions with weights
4. Can: add a new question, import from library, remove a question, adjust weights
5. Saves → entire position's template is updated

### 7. DATA FLOW FOR COMPLETED EVALUATIONS

When viewing a completed evaluation (EvaluationViewer):
1. Load the evaluation from `evaluations` table
2. Load responses from `evaluation_responses` table (includes frozen weights)
3. Re-derive the question list using `getQuestionsForUser(evaluated_user)` to match question text/category with responses
4. Display each question with its response and score label

**IMPORTANT:** The viewer uses `getQuestionsForUser()` to get the CURRENT template, then matches by `question_id` to find the response. This means if the template changes after an evaluation is completed, the question text shown in the viewer reflects the CURRENT text, not the text at the time of evaluation. The `evaluation_responses` table stores `question_id` and `weight` but NOT the question text or category.

**Migration implication:** The `question_id` values in `evaluation_responses` reference question IDs from the old hardcoded system (like 's4', 'tc-corp-soc-1'). After migration, the new `template_questions` table will have different IDs (UUIDs). We must ensure backward compatibility — either keep the old question IDs as `question_id` in the new table, or add a migration that maps old IDs to new UUIDs in `evaluation_responses`.

### 8. HIERARCHY AND PERMISSIONS

**Who sees what:**

| Role | Can See |
|---|---|
| SuperUser/Admin | Everything |
| Managing Partner (Socio Administrador) | Everything |
| Regular Socio | All EXCEPT other Socios and Salary Partners |
| Supervisor | Their assigned employees' evaluations |
| Employee | Only their own evaluations |

**Who evaluates whom:**
- Defined by `supervisor_assignments` table (per period)
- An employee can have multiple supervisors → scores are averaged
- The "senior" supervisor (by POSITION_RANK) approves action plans

**Sidebar visibility (Layout.tsx):**
- "Evaluar" — shown to supervisors + admins
- "Biblioteca Preguntas" — admins only
- "Plantillas" — admins only
- "Usuarios" — admins only
- "Reportes" — admins + managing partner
- "Organigrama" — admins + managing partner + socios

### 9. CSV EXPORT

The CSV export reads:
- `evaluations` table (who was evaluated, total score)
- `evaluation_responses` table (per-question scores and weights)
- `evaluation_na_approvals` table (N/A approvals)
- `users` table (names, positions)
- **HARDCODED** `POSITION_LABELS_CSV` for position labels → must be replaced with `position_config` table

The CSV does NOT re-derive weights. It reads the frozen `weight` from `evaluation_responses` directly. This is correct and must not change.

### 10. KEY MIGRATION RISKS (Based on Domain Understanding)

| Risk | Impact | Mitigation |
|---|---|---|
| **Question ID mismatch** | Old evaluations have `question_id` like 's4', new DB has UUIDs | Keep original question_id as a column in `template_questions` so `evaluation_responses.question_id` still matches |
| **Weight rescaling logic moves to server** | Frontend currently rescales; if server does it differently, scores won't match | Server must use EXACT same rescale formula: `Math.round((q.weight / sum) * target * 100) / 100` |
| **Self-eval + supervisor eval must use same template snapshot** | If template changes between self-eval and supervisor eval, weights differ | Both use `getQuestionsForUser()` which always returns current template. This is existing behavior. After migration, server `/full-template` endpoint does the same thing. |
| **Technical questions depend on practice_area** | A user's practice_area determines which technical questions they see | The `full-template` endpoint must accept `practiceArea` parameter and filter `template_questions WHERE practice_area = ?` |
| **Admin positions have NO technical section** | `section_weights.tecnico = 0` for admin positions | The `full-template` endpoint must check section_weights and skip técnico if weight is 0 |
| **N/A approval requires matching question_id** | If question IDs change, N/A approvals break | Keep original question IDs in `template_questions.question_id` column |
| **CSV export reads frozen weights** | Must not break the weight snapshot in `evaluation_responses` | No change needed — CSV already reads from `evaluation_responses.weight` |

### 11. COMPLETE DATA LINEAGE MAP

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN CONFIGURES TEMPLATES                    │
│                                                                 │
│  Question Library ────(import)──→ Template Questions             │
│  (question_library)              (template_questions)            │
│  - id, category, text           - id, position, practice_area  │
│  - NO weight                    - section, category, text        │
│                                 - weight, sort_order            │
│                                 - is_active, source             │
│                                                                 │
│  Section Weights                 Evaluation Categories          │
│  (section_weights)              (evaluation_categories)          │
│  - position, tecnico,           - id, label, section            │
│    competencias, blandas        - is_technical_subcategory      │
│                                                                 │
│  Position Config                 Competency Definitions         │
│  (position_config)              (competency_definitions)        │
│  - position, label, level      - position_level, name         │
│  - rank, sort_order             - definition, sort_order       │
│                                                                 │
│  Score Config                                                   │
│  (score_config)                                                │
│  - score, label                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EMPLOYEE TAKES EVALUATION                     │
│                                                                 │
│  1. System calls /full-template/:position?practiceArea=X        │
│  2. Server assembles:                                            │
│     - Gets section_weights for position                          │
│     - Gets template_questions WHERE position=X AND is_active=1  │
│     - Partitions by section (tecnico/competencias/blandas)       │
│     - Filters técnico by practice_area                           │
│     - Rescales weights within each section                       │
│     - Returns questions with rescaled weights (sum=100%)        │
│                                                                 │
│  3. Employee answers each question (1-5 or N/A or Sin Elementos)│
│  4. Frontend calculates totalScore = calculateScore()           │
│  5. Frontend sends to server:                                   │
│     - evaluation: {evaluatorId, evaluatedId, period, type,       │
│       comments, totalScore}                                      │
│     - responses: [{questionId, score, notApplicable,             │
│       noElements, weight}] ← FROZEN WEIGHT SNAPSHOT             │
│                                                                 │
│  6. Server stores:                                               │
│     - evaluation row in `evaluations` table                      │
│     - response rows in `evaluation_responses` table              │
│     (weight is the rescaled weight, frozen forever)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AFTER EVALUATION COMPLETED                     │
│                                                                 │
│  7. Supervisor reviews → marks feedback completed                │
│  8. N/A approvals: supervisor approves/rejects N/A flags         │
│     - stored in `evaluation_na_approvals` table                 │
│  9. Employee creates Action Plan                                 │
│     - SMART items tied to competency categories                 │
│     - stored in `action_plans` + `smart_action_items`            │
│ 10. Senior supervisor approves/rejects action plan               │
│                                                                 │
│  CSV Export reads:                                               │
│  - evaluations + evaluation_responses (frozen weights)           │
│  - users (names, positions)                                      │
│  - position_config (for labels) ← MUST COME FROM DB             │
└─────────────────────────────────────────────────────────────────┘
```

### 12. CRITICAL: Question ID Backward Compatibility

**Current question IDs in hardcoded files:**
- Competencias/blandas: `'s4'`, `'s5'`, `'s6'`, `'s7'`, `'s9'`, `'s10'`, `'s11'`, `'s12'`, `'s13'` (socio)
- Admin positions: `'d1'`, `'d2'`... (director), `'g1'`... (gerente), `'c1'`... (coordinador), etc.
- Technical: `'tc-corp-soc-1'`, `'tc-fc-am-5'`, etc.

**These IDs are stored in `evaluation_responses.question_id` for completed evaluations.**

**Migration strategy:** The new `template_questions` table MUST keep these original IDs in a `question_id` column (separate from the UUID `id` PK). This way:
- New evaluations can reference questions by either UUID or legacy ID
- Old evaluations in `evaluation_responses` still match via `question_id`
- The `/full-template` endpoint returns both `id` (UUID) and `questionId` (legacy)
- Frontend sends `questionId` (legacy) when submitting responses → stored in `evaluation_responses.question_id`

**Add to Task 1:** `template_questions` table should have BOTH:
- `id VARCHAR(36) PRIMARY KEY` — UUID, new PK
- `question_id VARCHAR(50) NOT NULL` — legacy ID ('s4', 'tc-corp-soc-1'), for backward compat with existing evaluations

**Add to Task 5 (evaluationConfig.ts):** The `calculateScore()` function and the full-template response must map `question_id` ↔ `id` correctly.
