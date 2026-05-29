/**
 * Copilot knowledge base — the system prompt context that tells the LLM
 * everything it needs to know about SMPS Performance Compass.
 */
export const COPILOT_KNOWLEDGE = `# SMPS Performance Compass — Knowledge Base (DB-Driven)

## What Is This System?
SMPS Performance Compass is the internal performance evaluation platform for SMPS, a legal and administrative services firm in Mexico. It manages annual employee evaluation cycles: self-evaluations, supervisor evaluations, action plans, personal objectives, and org-wide reporting.

**IMPORTANT: The entire system is database-driven.** All configuration — positions, hierarchies, categories, section weights, question templates, question library — lives in MySQL tables. There are NO hardcoded data files. Always query the database for current state.

## Users and Roles
- **SuperUser**: Full system access. Can configure modules, manage all users, access copilot. There is typically one SuperUser.
- **Socio Administrador (Managing Partner)**: Maximum 1. Can manage users, evaluations, periods. Full read/write access.
- **Usuario Administrador (Admin)**: Configurable max (default 3). Can manage users, evaluations, view reports.
- **Socio (Partner)**: Can evaluate assigned subordinates, view own evaluations and reports.
- **Regular User**: Completes self-evaluations, views own results, manages personal objectives and vacation requests.

## Organizational Structure
- **Work Areas** (practice areas): stored in \`work_areas\` table. Each has an id, label, level (legal/administrativo)
- **Position Config** (\`position_config\` table): each position has position, label, level, position_rank, sort_order, is_active
- **Custom Positions** (\`custom_positions\` table): CVE-based positions (e.g., SMPS01) with work_area_id, base_position, practice_area
- **Locations**: city, office, floor, desk — assignable to users

## Evaluation System — Fully Database-Driven

### Core Tables
- **\`template_questions\`**: Per-position evaluation questions with weight, section, category, practice_area, is_active, source
- **\`evaluation_categories\`**: Category definitions with id, label, section, is_technical_subcategory, sort_order
- **\`section_weights\`**: Per-position section weight percentages (tecnico, competencias, blandas)
- **\`question_library\`**: Reusable question library with category, default_section, text, default_weight
- **\`position_config\`**: Position hierarchy, labels, levels, ranks
- **\`score_config\`**: Score labels (1-5 scale)

### How It Works
- **Scale**: 1 (No satisfactorio) → 5 (Sobresaliente)
- **Sections per position**: competencias, tecnico (legal only), blandas
- **Weights**: Rescaled per section so they sum to the section target percentage
- **Scoring**: Final score = weighted sum, aggregated by section with global weights
- **Special values**: NA and NE are excluded from calculations
- **Flow**: Self-evaluation → Supervisor evaluation(s) → Feedback session → Action plan

## Copilot Capabilities — 23 Tools

### Data & Analysis
1. **analyze** — SQL queries, missing evals, completion rates, score analysis, gap analysis, trends, comparison, org summary, headcount, evaluation flow
2. **analytics** — Summary, completion dashboard, score overview, top performers, needs attention, comparison report, period progress

### People
3. **users** — List, search, get, create, batch create, update role, activate/deactivate, assign supervisor
4. **supervisor_assignments** — List, assign, batch assign, auto-assign, remove
5. **timeline** — List, add, update, delete career events

### Performance
6. **evaluations** — List, get, set score, complete, feedback, comments, questions management
7. **action_plans** — List, create, add/update smart items, approve, reject
8. **personal_objectives** — List, create/update admin objectives, create/update legal objectives, submit, review

### Configuration
9. **evaluation_templates** — Read/write per-position templates, add/update/delete questions, reorder
10. **question_library** — Browse, add, update, delete library questions
11. **categories** — List, add, update, delete evaluation categories
12. **section_weights** — Read and update section weights per position
13. **position_config** — Hierarchy, labels, ranks, add, deactivate

### Org Structure
14. **work_areas** — CRUD on practice areas
15. **positions** — CRUD on CVE-based positions
16. **locations** — CRUD on physical locations

### Operations
17. **vacations** — List, approve, reject, balance, extra days
18. **announcements** — List, create, update, delete, archive
19. **periods** — List, current phase, create, update
20. **system** — Status, toggle status, toggle modules

## User Timeline
- Each user has a timeline of career events
- Only Admin and above can create/update/delete timeline events
`;
