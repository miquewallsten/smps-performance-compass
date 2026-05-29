# SMPS Performance Compass — Knowledge Base (DB-Driven)

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
- **Work Areas** (practice areas): stored in `work_areas` table. Each has an id, label, level (legal/administrativo)
- **Position Config** (`position_config` table): each position has position, label, level, rank, sort_order, is_active
  - Legal positions (level='legal'): loaded from DB, ordered by rank
  - Administrative positions (level='administrativo'): loaded from DB, ordered by rank
  - **Always query position_config for the current hierarchy — never assume static values**
- **Custom Positions** (`custom_positions` table): CVE-based positions (e.g., SMPS01) with work_area_id, base_position, practice_area
- **Locations**: city, office, floor, desk — assignable to users

## Evaluation System — Fully Database-Driven

### Core Tables
- **`template_questions`**: Per-position evaluation questions with weight, section, category, practice_area, is_active, source
- **`evaluation_categories`**: Category definitions with id, label, section, is_technical_subcategory, sort_order
- **`section_weights`**: Per-position section weight percentages (tecnico, competencias, blandas)
- **`library_questions`**: Reusable question library with category, text, default_weight
- **`position_config`**: Position hierarchy, labels, levels, ranks
- **`score_config`**: Score labels (1-5 scale)

### How It Works
- **Scale**: 1 (No satisfactorio) → 5 (Sobresaliente) — labels in `score_config` table
- **Sections per position**: competencias, tecnico (legal positions only), blandas — weights in `section_weights` table
- **Questions per position**: defined in `template_questions`, filtered by position and section
- **Categories**: defined in `evaluation_categories`, each belongs to a section
- **Weights**: Each section has a global weight (%) from `section_weights`, each question has an individual weight from `template_questions`
- **Scoring**: Final score = weighted sum of (question_weight × score), aggregated by section with global weights
- **Special values**: NA (No Aplica) and NE (Sin Elementos) are excluded from calculations
- **Evaluation types**: self (autoevaluación), supervisor (evaluación del supervisor)
- **Flow**: Self-evaluation → Supervisor evaluation(s) → Feedback session → Action plan

### HOW WEIGHTS WORK
- Raw weights are defined per question in `template_questions.weight`
- The app RESCALES weights per section so they sum to the section's target percentage from `section_weights`
- Example: Competencias section has questions with raw weights summing to 49. Section target is 80%. Each question's displayed weight = (raw_weight / 49) × 80
- The same question can have DIFFERENT rescaled weights for different positions if they have different section weight targets
- **Always check `section_weights` table for the actual percentages per position**

### SECTION WEIGHTS
- Stored in `section_weights` table — columns: position, tecnico, competencias, blandas
- All values are percentages that should sum to 100%
- **Do NOT assume hardcoded values** — always query the table

## Question Library
- `library_questions` table: reusable questions not tied to a specific position
- Fields: id, question_id, category, text, default_weight, created_at, created_by
- When adding questions to a template, they come from the library
- The library does NOT have percentage weights — weights are assigned per template

## Periods
- Each evaluation cycle is defined by a period config with start/end dates for each phase
- Phases: self-evaluation window, supervisor evaluation window, feedback window
- Only one period can be active at a time

## Copilot Capabilities (Tools Available)
1. **analyze** — Run SQL queries, get missing evaluations, completion rates, score analysis, comparisons, org summaries
2. **users** — List, search, create, update roles, activate/deactivate, assign supervisors, batch create
3. **evaluations** — List, get details, set scores, complete evaluations, update comments, manage questions
4. **vacations** — List, approve, reject vacation requests
5. **announcements** — List, create communications/announcements
6. **periods** — Create evaluation periods
7. **system** — Check status, toggle system status, toggle modules
8. **reports** — General statistics
9. **work_areas** — CRUD on practice areas
10. **positions** — CRUD on position definitions (CVE-based)
11. **locations** — CRUD on physical locations
12. **evaluation_templates** — Read/write evaluation templates per position (template_questions)
13. **question_library** — Browse, add, update, delete library questions
14. **categories** — List and manage evaluation categories
15. **section_weights** — Read and update section weights per position
16. **position_config** — Read and manage position hierarchy configuration

## User Timeline
- Each user has a timeline of career events (position changes, hires, terminations, evaluations, role changes, supervisor assignments, etc.)
- Only Admin and above can create/update/delete timeline events
- Users can view their own timeline

## Common Workflows
- **New employee**: Create user → assign position → assign supervisor → timeline logs "hire"
- **Evaluation cycle**: Create period → users complete self-evals → supervisors evaluate → feedback sessions → action plans
- **Role change**: Update user role → timeline logs change
- **Position change**: Update custom_position_id → timeline logs position_change with changeType (promotion/demotion/lateral)
- **Edit template**: Query template_questions for position → modify weights/questions → update via tool
- **Add question**: Add to library_questions → then add to template_questions for desired positions

## Data Relationships (DB Schema)
- `users` → `custom_positions` (via custom_position_id) → `work_areas` (via work_area_id)
- `evaluations` → `evaluation_responses` → `template_questions` (via question_id)
- `template_questions` → `evaluation_categories` (via category) → sections
- `section_weights` → `position_config` (via position)
- `library_questions` → `evaluation_categories` (via category)
- `supervisor_assignments` → users (employee_id, supervisor_id) + periods
- `vacation_requests` → users + `vacation_approvals`
- `action_plans` → `smart_action_items`
- `user_timeline` → users + metadata JSON

## Important Constraints
- Max 1 Managing Partner (is_managing_partner=1)
- Max configurable admin users (check system_status.max_admin_users)
- Evaluations can only be scored 1-5
- Period dates must not overlap
- Supervisor assignments require both users to be active
- NA and NE scores are excluded from final calculations
- Template question weights per section must sum to section target percentage
- Section weights per position (tecnico + competencias + blandas) must sum to 100%

## FAQ — Common User Questions and Correct Answers

### "Why do percentages in the CSV not sum to 100%?"
The CSV uses rescaled weights (same function as the UI). Discrepancies are due to rounding: Math.round(... × 100) / 100 can leave ±0.01 per section. Total per position = 100.00% ± 0.03% due to rounding across 3 sections.

### "Why can't I have more than X admins?"
Check `system_status.max_admin_users` in the database. Default is 3.

### "Why does the same question have different weights for different positions?"
Weights are rescaled per section based on `section_weights` targets. Different positions have different targets, so the same raw weight produces different displayed weights.

### "How do I change the evaluation questions for a position?"
Use the evaluation_templates tool to list current questions, then modify them. Changes go to `template_questions` table.
