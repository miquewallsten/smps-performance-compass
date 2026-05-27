# SMPS Performance Compass — Knowledge Base

## What Is This System?
SMPS Performance Compass is the internal performance evaluation platform for SMPS, a legal and administrative services firm in Mexico. It manages annual employee evaluation cycles: self-evaluations, supervisor evaluations, action plans, personal objectives, and org-wide reporting.

## Users and Roles
- **SuperUser**: Full system access. Can configure modules, manage all users, access copilot. There is typically one SuperUser.
- **Socio Administrador (Managing Partner)**: Maximum 1. Can manage users, evaluations, periods. Full read/write access.
- **Usuario Administrador (Admin)**: Configurable max (default 3). Can manage users, evaluations, view reports.
- **Socio (Partner)**: Can evaluate assigned subordinates, view own evaluations and reports.
- **Regular User**: Completes self-evaluations, views own results, manages personal objectives and vacation requests.

## Organizational Structure
- **Work Areas** (practice areas): fiscal_consultoria, fiscal_litigio, corporativo (legal), backoffice (administrative)
- **Positions** (identified by CVE like SMPS01): Each has a label, work_area_id, and base_position
- **Base positions** (hierarchy):
  - Legal: socio > salary_partner > counsel > asociado_sr > asociado_mid > asociado_jr > pasante_carrera > pasante
  - Administrative: director > gerente > coordinador > analista > asistente > soporte > archivista
- **Locations**: city, office, floor, desk — assignable to users

## Evaluation System
- **Scale**: 1 (No satisfactorio) → 5 (Sobresaliente)
- **Sections per position**: Competencias, Criterio Técnico (legal positions only), Habilidades Blandas
- **Weights**: Each section has a global weight (%), each question has an individual weight
- **Scoring**: Final score = weighted sum of (question_weight × score), aggregated by section with global weights
- **Special values**: NA (No Aplica) and NE (Sin Elementos) are excluded from calculations
- **Evaluation types**: self (autoevaluación), supervisor (evaluación del supervisor)
- **Flow**: Self-evaluation → Supervisor evaluation(s) → Feedback session → Action plan

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

## User Timeline
- Each user has a timeline of career events (position changes, hires, terminations, evaluations, role changes, supervisor assignments, etc.)
- Only Admin and above can create/update/delete timeline events
- Users can view their own timeline
- Timeline events include: event_type, event_date, old_value, new_value, metadata (JSON), note

## Common Workflows
- **New employee**: Create user → assign position → assign supervisor → timeline logs "hire"
- **Evaluation cycle**: Create period → users complete self-evals → supervisors evaluate → feedback sessions → action plans
- **Role change**: Update user role → timeline logs change
- **Position change**: Update custom_position_id → timeline logs position_change with changeType (promotion/demotion/lateral)

## Data Relationships
- Users belong to work areas via custom_position_id → positions → work_area_id
- Evaluations link to users (evaluator_id, user_id) and periods
- Questions belong to positions and sections
- Vacation requests link to users and have status (pending/approved/rejected)
- Timeline events link to users and can be created by admin+ users

## Important Constraints
- Max 1 Managing Partner (is_managing_partner=1)
- Max configurable admin users (default 3)
- Evaluations can only be scored 1-5
- Period dates must not overlap
- Supervisor assignments require both users to be active
- NA and NE scores are excluded from final calculations
