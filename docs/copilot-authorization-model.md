# Copilot Authorization Model — SMPS Performance Compass

## Current State

The copilot is restricted to **SuperUser only** at the route level (`requireSuperUser` middleware). This is correct and sufficient for role-based access.

However, the copilot has **23 tools** with varying risk levels. The current `can_manage_*` config flags only gate 4 of them:

| Flag | Tools Gated |
|------|-------------|
| `can_manage_users` | `users` tool |
| `can_manage_evaluations` | `evaluations` tool |
| `can_manage_vacations` | `vacations` tool |
| `can_manage_announcements` | `announcements` tool |

The remaining 19 tools are **always available** when the copilot module is enabled, regardless of config flags.

## Tool Risk Classification

### 🔴 CRITICAL — Can Access or Modify Sensitive Data

| Tool | Actions | Risk | Current Gating |
|------|---------|------|----------------|
| `analyze` | **Direct SQL execution** | Can query `users.password_hash`, `users.security_answer`, `copilot_config.api_key`, `sessions.token_hash` | None — always available |
| `users` | list, search, get, create, batch_create, update_role, deactivate, activate, assign_supervisor | Can create users, change roles, assign supervisors | `can_manage_users` flag |

**The `analyze` tool is the most critical risk.** It allows the AI to run arbitrary SELECT queries against the database. While it blocks DROP/INSERT/UPDATE/ALTER/CREATE, it does NOT block:
- `SELECT password_hash, security_answer FROM users`
- `SELECT api_key FROM copilot_config`
- `SELECT token_hash FROM sessions`
- Subqueries or UNION-based data extraction

### 🟠 HIGH — Can Modify System Configuration or Data

| Tool | Actions | Risk | Current Gating |
|------|---------|------|----------------|
| `system` | status, toggle_status, toggle_module | Can deactivate the entire system or toggle modules | `can_manage_system` flag |
| `periods` | list, current, create, update | Can create/modify evaluation periods | None — always available |
| `evaluations` | list, get, set_score, complete_eval, complete_feedback, update_comments, create_question, batch_questions, update_question, delete_question, supervisor_assignments, action_plan, personal_objectives | Can score evaluations, complete them, modify questions | `can_manage_evaluations` flag |
| `eval-config` | categories, section_weights, competencies, templates, positions, score_labels, question_library, reseed | Can modify evaluation configuration, reseed all data | None — always available |

### 🟡 MEDIUM — Read Sensitive Data or Moderate Impact

| Tool | Actions | Risk | Current Gating |
|------|---------|------|----------------|
| `analytics` | summary, completion_dashboard, score_overview, top_performers, needs_attention, comparison_report, period_progress | Read-only analytics — exposes evaluation scores for all users | `can_view_reports` flag |
| `supervisor_assignments` | list, assign, unassign | Can reassign supervisors | `can_manage_users` flag |
| `action_plans` | list, create, approve | Can create and approve action plans | None — always available |
| `personal_objectives` | list, create, review | Can create and approve objectives | None — always available |

### ⚪ LOW — Read-Only or Limited Impact

| Tool | Actions | Risk | Current Gating |
|------|---------|------|----------------|
| `timeline` | list, create, update, delete | Can modify timeline events | None — always available |
| `work_areas` | list, create, update, delete | Can modify org structure | None — always available |
| `positions` | list, create, update, delete | Can modify position hierarchy | None — always available |
| `locations` | list, create, update, delete | Can modify locations | None — always available |
| `announcements` | list, create, update, archive | Can post announcements | `can_manage_announcements` flag |
| `vacations` | list, approve, reject, config | Can manage vacations | `can_manage_vacations` flag |

## Recommendations

### Immediate (Before Copilot Expansion)

1. **Block sensitive tables in `analyze` tool**: Add a table blacklist that prevents querying `users`, `sessions`, `copilot_config`, `copilot_messages`, `copilot_conversations`

2. **Add column-level masking**: For `users` table queries, automatically exclude `password_hash` and `security_answer`

3. **Log all `analyze` SQL queries**: Store the full SQL and results in `copilot_messages` for audit trail (already partially done via `tool_calls`/`tool_results`)

4. **Add `can_manage_system` enforcement**: The `system` and `periods` tools should respect this flag

5. **Add `can_manage_eval_config` enforcement**: The `eval-config` tool should require a new config flag

### Medium-Term

6. **Add confirmation requirement for destructive tool actions**: When the AI calls `complete_eval`, `update_role`, `deactivate`, `toggle_status`, `delete_question`, it should require explicit user confirmation in the chat

7. **Add audit logging**: Every tool call should be logged with the user ID, tool name, action, and arguments in a structured `copilot_tool_audit` table

### Tool Permission Matrix

| Tool | Allowed Roles | Confirmation Required | Audit Logging |
|------|--------------|---------------------|---------------|
| `analyze` | SuperUser | Yes for SQL | Yes (SQL + results) |
| `users` | SuperUser (if `can_manage_users`) | Yes for create/update_role/deactivate | Yes |
| `evaluations` | SuperUser (if `can_manage_evaluations`) | Yes for set_score/complete/delete | Yes |
| `system` | SuperUser (if `can_manage_system`) | Yes for toggle actions | Yes |
| `periods` | SuperUser | No | Yes |
| `eval-config` | SuperUser | Yes for reseed/delete | Yes |
| `analytics` | SuperUser (if `can_view_reports`) | No | Yes |
| `action_plans` | SuperUser | No | Yes |
| `personal_objectives` | SuperUser | No | Yes |
| `supervisor_assignments` | SuperUser (if `can_manage_users`) | No | Yes |
| `timeline` | SuperUser | No | Yes |
| `vacations` | SuperUser (if `can_manage_vacations`) | No | Yes |
| `announcements` | SuperUser (if `can_manage_announcements`) | No | Yes |
| `work_areas` | SuperUser | No | Yes |
| `positions` | SuperUser | No | Yes |
| `locations` | SuperUser | No | Yes |
