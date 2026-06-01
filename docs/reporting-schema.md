# Reporting Schema

## Analytics Tables

### analytics_evaluation_summary

**Purpose:** Pre-computed evaluation data, one row per evaluation. Avoids expensive joins between evaluations, users, and evaluation_responses when displaying dashboards.

| Column | Type | Purpose |
|---|---|---|
| id | VARCHAR(36) PK | Row identifier |
| evaluation_id | VARCHAR(36) UQ | FK to evaluations.id |
| period | VARCHAR(50) | Period identifier (e.g., "2026-H1") |
| evaluated_id | VARCHAR(36) | FK to users.id (evaluated employee) |
| evaluated_name | VARCHAR(255) | Denormalized employee name |
| evaluated_position | VARCHAR(50) | Denormalized employee position |
| evaluated_practice_area | VARCHAR(100) | Denormalized practice area |
| evaluator_id | VARCHAR(36) | FK to users.id (evaluator) |
| evaluator_name | VARCHAR(255) | Denormalized evaluator name |
| eval_type | VARCHAR(50) | "self" or "supervisor" |
| total_score | DOUBLE | Final evaluation score |
| completed_at | DATETIME | When evaluation was completed |
| feedback_completed | TINYINT(1) | Whether feedback session done |
| response_count | INT | Number of responses in evaluation |
| na_count | INT | Number of NA (not applicable) responses |

**Indexes:**
- uq_aes_evaluation (evaluation_id) — prevents duplicates
- idx_aes_period (period) — dashboard filter
- idx_aes_evaluated (evaluated_id) — employee lookup
- idx_aes_evaluator (evaluator_id) — supervisor lookup
- idx_aes_type (eval_type) — type filter
- idx_aes_period_type (period, eval_type) — composite dashboard query
- idx_aes_period_position (period, evaluated_position) — department breakdown

**Refresh:** Full rebuild every 30 minutes (DELETE + INSERT). ~16 rows currently, sub-second.

---

### analytics_period_summary

**Purpose:** Aggregate KPIs per period. Powers the overview endpoint and trend analysis.

| Column | Type | Purpose |
|---|---|---|
| period | VARCHAR(50) PK | Period identifier |
| total_employees | INT | Active employee count |
| total_evaluated | INT | Employees with completed supervisor eval |
| self_eval_completed | INT | Distinct employees with completed self-eval |
| supervisor_eval_completed | INT | Distinct employees with completed supervisor eval |
| feedback_completed | INT | Distinct employees with completed feedback |
| action_plans_created | INT | Action plans in this period |
| avg_self_score | DOUBLE | Average self-evaluation score |
| avg_supervisor_score | DOUBLE | Average supervisor evaluation score |
| avg_overall_score | DOUBLE | Average overall score |
| completion_rate | DOUBLE | % of employees evaluated (0–100) |
| self_start | DATE | Self-eval phase start |
| self_end | DATE | Self-eval phase end |
| supervisor_start | DATE | Supervisor eval phase start |
| supervisor_end | DATE | Supervisor eval phase end |
| action_plan_end | DATE | Action plan phase end |

**Refresh:** UPSERT every 30 minutes. Currently 3 rows (3 periods).

---

### analytics_user_activity

**Purpose:** Per-user per-period feature adoption tracking. Identifies users who haven't completed steps.

| Column | Type | Purpose |
|---|---|---|
| id | VARCHAR(36) PK | Row identifier |
| user_id | VARCHAR(36) | FK to users.id |
| period | VARCHAR(50) | Period identifier |
| has_self_eval | TINYINT(1) | Completed self-eval |
| has_supervisor_eval | TINYINT(1) | Has supervisor eval |
| has_feedback | TINYINT(1) | Completed feedback |
| has_action_plan | TINYINT(1) | Has action plan |
| has_objectives | TINYINT(1) | Has objectives |
| login_count | INT | Total successful logins |
| last_login | DATETIME | Most recent login |

**Unique constraint:** (user_id, period) — one row per user per period.

**Refresh:** UPSERT every 30 minutes. Currently 39 rows (13 users × 3 periods).

---

### analytics_copilot_views

**Purpose:** Curated SQL view definitions for safe Copilot analytics access. Copilot can query these pre-approved views instead of raw tables.

| Column | Type | Purpose |
|---|---|---|
| id | VARCHAR(36) PK | Row identifier |
| view_name | VARCHAR(100) UQ | Unique view name |
| description | TEXT | Human-readable description |
| query_template | TEXT | SQL template with parameterized placeholders |
| allowed_params | JSON | List of allowed parameter names |
| risk_level | ENUM('low','medium','high') | Security classification |
| is_active | TINYINT(1) | Whether view is enabled |

**Seeded Views (6):**

1. `evaluation_completion_rate` — low risk
2. `avg_score_by_period` — low risk
3. `supervisor_coverage` — low risk
4. `action_plan_status` — low risk
5. `vacation_summary` — low risk
6. `login_activity` — low risk

---

## Refresh Strategy

| Table | Method | Frequency | Duration (current data) |
|---|---|---|---|
| analytics_evaluation_summary | DELETE + INSERT | 30 min | ~200ms |
| analytics_period_summary | UPSERT | 30 min | ~100ms |
| analytics_user_activity | UPSERT | 30 min | ~500ms |
| analytics_copilot_views | Seed once | On migration | N/A |

**Total refresh time:** ~1 second for current data volume (14 users, 3 periods).

**Scalability:** At 1000 users, estimated refresh time: ~30–60 seconds. Will need incremental refresh strategy.

---

## Future Tables (Not Yet Implemented)

| Table | Purpose | Priority |
|---|---|---|
| analytics_score_distribution | Histogram of scores by period | Medium |
| analytics_supervisor_effectiveness | Avg score gap per supervisor | Medium |
| analytics_vacation_summary | Pre-aggregated vacation stats | Low |
| analytics_objective_summary | Pre-aggregated objective stats | Low |

These are deferred until the current analytics tables are integrated into the frontend and proven useful.
