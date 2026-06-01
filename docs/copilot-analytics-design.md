# Copilot Analytics Design

## Current State

Copilot has access to an `analyze` tool (server/copilot/tools/analyze.ts) that can execute SELECT queries against the database. This tool has security restrictions (table/column denylists) implemented in Phase 4B.

The `analytics_copilot_views` table contains 6 curated view definitions that provide safe analytics access.

---

## Security Model

### What Copilot CAN access (via analyze tool):
- All tables NOT in the denylist
- All columns NOT in the column denylist

### What Copilot CANNOT access (denylist from Phase 4B):

**Table Denylist:**
- sessions
- password_reset_tokens
- authentication_audit

**Column Denylist:**
- password_hash
- security_answer
- token_hash
- api_key
- activation_token_hash
- mfa_secret

**Keyword Denylist:**
- SHOW, DESCRIBE, EXPLAIN, INFORMATION_SCHEMA, mysql, performance_schema, sys

---

## Curated Analytics Views

The `analytics_copilot_views` table provides pre-approved query templates:

| View Name | Risk | Description |
|---|---|---|
| evaluation_completion_rate | LOW | Completion rate by period |
| avg_score_by_period | LOW | Average score by period and type |
| supervisor_coverage | LOW | Assignment coverage by period |
| action_plan_status | LOW | Action plan counts by status |
| vacation_summary | LOW | Vacation request summary |
| login_activity | LOW | Daily login counts |

---

## Future: View-Only Access Model

**Goal:** Replace raw SQL access with curated view execution only.

### Design

```typescript
// Instead of: Copilot sends arbitrary SELECT
// New model: Copilot selects a view_name and provides params

interface CopilotAnalyticsRequest {
  view_name: string;
  params: Record<string, string>;
}

// Server validates:
// 1. view_name exists in analytics_copilot_views
// 2. view is active (is_active=1)
// 3. All params are in allowed_params
// 4. Risk level is acceptable for user's role
```

### Risk Level → Role Mapping

| Risk Level | super_user | admin | socio | supervisor | employee |
|---|---|---|---|---|---|
| LOW | ✅ | ✅ | ✅ | ✅ | ✅ |
| MEDIUM | ✅ | ✅ | ✅ | ❌ | ❌ |
| HIGH | ✅ | ✅ | ❌ | ❌ | ❌ |

### Example Conversation Flow

```
User: "How is evaluation completion looking this period?"

Copilot: [Selects view: evaluation_completion_rate]
         [Params: { period: "2026-H1" }]
         [Risk: LOW — allowed for all roles]

Result: "Evaluation completion for 2026-H1:
         - 5 out of 13 employees completed self-evaluation (38%)
         - 8 out of 13 completed supervisor evaluation (62%)"
```

```
User: "Show me all login failures"

Copilot: [Selects view: login_activity]
         [Query includes login_failure data]
         [Risk: MEDIUM — supervisor/employee blocked]

Result: (for admin) "Last 30 days login activity..."
Result: (for employee) "Sorry, you don't have access to system-wide login data."
```

---

## Implementation Roadmap

### Phase 1 (Current — DONE)
- analytics_copilot_views table created and seeded
- analyze.ts has denylist protection
- Copilot can query analytics_* tables safely

### Phase 2 (Next)
- Add view execution endpoint: POST /api/analytics/copilot-query
- Validate view_name, params, and risk level
- Log all copilot analytics queries to authentication_audit

### Phase 3 (Future)
- Replace analyze tool's raw SQL with view-only access
- Add more views as business needs emerge
- Add parameterized queries (period, department, position)

---

## Audit Requirements

All Copilot analytics queries must be logged:

```typescript
await auditLog({
  action: 'copilot_analytics_query',
  userId: conversationUserId,
  metadata: {
    view_name: viewName,
    params: providedParams,
    risk_level: view.risk_level,
    rows_returned: results.length
  }
});
```

---

## Current Risk Assessment

**Current risk level: MEDIUM**

The analyze tool still allows arbitrary SELECT queries against most tables. While sensitive tables/columns are blocked, a determined user could:
- Query all user data (names, emails, positions)
- Query evaluation details for any employee
- Query action plan contents
- Query vacation request details

**Mitigation in place:** Copilot is restricted to super_user only (Phase 4B).

**Future mitigation:** View-only access model eliminates this risk entirely.
