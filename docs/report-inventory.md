# Report Inventory

## Existing Reports

### 1. Dashboard (src/pages/Dashboard.tsx)

**Purpose:** Main landing page showing current period evaluation progress.

**Audience:** All authenticated users.

**Data Sources:**
- `/api/users` — user list with filtering
- `/api/evaluations` — evaluations for current period
- `/api/assignments` — supervisor assignments for current period
- `/api/periods` — period configuration
- `/api/announcements` — active announcements
- `/api/vacations/requests` — vacation requests

**KPIs Displayed:**
- Total visible employees
- Self-evaluation completion count/ratio
- Supervisor evaluation completion count/ratio
- Feedback completion count/ratio
- Action plan completion count/ratio
- Current phase indicator (self → supervisor → feedback → action plan)
- Days until current phase deadline
- Average score (when evaluations complete)
- User's own self-evaluation score badge

**Performance Characteristics:**
- 5 separate API calls on mount
- Client-side filtering and aggregation (not pre-computed)
- N+1 pattern: loads ALL users + ALL evaluations + ALL assignments, then filters in JS
- Estimated dashboard load: ~1.5–3s for admin/socio (full dataset)

**Known Limitations:**
- No period-over-period comparison
- No department drill-down
- No export capability
- Employee view only shows own + direct reports
- Team listing does not include scores for supervisor evaluations

---

### 2. Reports Page (src/pages/Reports.tsx)

**Purpose:** Evaluation analytics with charts for current period.

**Audience:** Admin, Socio, Supervisor (filtered view).

**Data Sources:**
- `/api/users` — all active users
- `/api/evaluations` — all evaluations
- `/api/assignments` — supervisor assignments
- `/api/action-plans` — action plans

**Charts Displayed:**
- Pie chart: "Evaluaciones Completadas" — completed vs in-progress (all stages)
- Bar chart: "Realización por Etapa" — self/supervisor/feedback/action-plan completion
- Bar chart: "Autoevaluaciones por Nivel" — self-eval by position level
- Bar chart: "Eval. Supervisor por Nivel" — supervisor eval by position level
- Bar chart: "Promedio por Posición" — average score by position

**Filters:**
- Area filter: All / Legal / Administrativo
- Period: current period only (from context)

**Performance Characteristics:**
- 4 API calls on mount
- All aggregation done client-side in JS
- Uses recharts for rendering

**Known Limitations:**
- No CSV/export
- No date range selection
- No period comparison
- No trend lines
- No supervisor effectiveness metrics
- No action plan timeline
- No vacation analytics
- Calculations done in browser (does not use analytics API yet)

---

### 3. CSV Exports

**Current state:** No CSV export functionality exists.

**Gap:** Users cannot export any data.

---

### 4. Analytics API (NEW — server/routes/analytics.ts)

**Purpose:** Pre-computed analytics for dashboards and reports.

**Audience:** All authenticated users (role-filtered).

**Endpoints:**
| Endpoint | Purpose | Source |
|---|---|---|
| GET /api/analytics/overview | Period KPIs | analytics_period_summary (cached) |
| GET /api/analytics/evaluations | Evaluation analytics | analytics_evaluation_summary |
| GET /api/analytics/trends | Period-over-period | analytics_period_summary |
| GET /api/analytics/objectives | Objective analytics | personal_objectives (live) |
| GET /api/analytics/vacations | Vacation analytics | vacation_requests (live) |
| GET /api/analytics/action-plans | Action plan analytics | action_plans (live) |

**Performance:**
- Overview: single table lookup (~5ms)
- Evaluations: filtered summary table (~10ms)
- Trends: 2 queries (~20ms)
- Others: live joins with role filtering (~50–100ms)

**Known Limitations:**
- Objectives/vacations/action-plans still query live tables (not yet in summary tables)
- Trends endpoint queries evaluations table directly for type breakdown
- No caching layer (recomputes every 30 minutes)
- Frontend not yet connected to analytics API

---

## Summary

| Capability | Status | Performance | Gap |
|---|---|---|---|
| Dashboard KPIs | EXISTS (client-side) | Slow for admin | Move to analytics API |
| Evaluation Charts | EXISTS (client-side) | Slow for admin | Move to analytics API |
| Period Comparison | NEW (analytics API) | Fast | Frontend not connected |
| Trend Analysis | NEW (analytics API) | Fast | Frontend not connected |
| CSV Export | MISSING | — | Build |
| Excel Export | MISSING | — | Build |
| Supervisor Effectiveness | MISSING | — | Design |
| Action Plan Timeline | MISSING | — | Design |
| Vacation Balance Report | MISSING | — | Design |
| Login Activity Report | MISSING | — | Build from auth_audit |
