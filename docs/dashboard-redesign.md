# Dashboard Redesign — Role-Specific Views

## Current State

The Dashboard (src/pages/Dashboard.tsx) loads raw data from 5 API endpoints and computes all KPIs client-side. This creates:
- Slow load times for admin/socio (full dataset)
- No period comparison
- No trend indicators
- No export capability

## Target: Connect to Analytics API

Replace raw API calls with `/api/analytics/*` endpoints that return pre-computed data.

---

## Super User Dashboard

**Widget 1: System Overview**
- Total employees
- Active users (from authentication_audit, last 30 days)
- Server status
- Backup status

**Widget 2: Period KPIs**
- Completion rate (large number + progress ring)
- Avg overall score
- Days until phase deadline
- Phase indicator

**Widget 3: Period Comparison**
- Current vs previous period score trend
- Completion rate trend (up/down arrow)

**Widget 4: Score Distribution**
- Histogram of scores across all employees
- By position level (bar chart)

**Widget 5: Department Breakdown**
- Legal vs Administrative metrics
- Expandable rows per position

**Widget 6: Action Plan Status**
- Approved / Rejected / Pending counts
- Overdue items highlighted

**Widget 7: System Activity**
- Recent logins chart (last 30 days)
- Copilot usage stats

---

## Admin Dashboard

Same as Super User minus System Overview and System Activity.

**Widget replacements:**
- System Overview → Team Overview (same people metrics)
- System Activity → Recent Team Activity

---

## Socio Dashboard

**Widget 1: Firm Overview**
- Total employees
- Completion rate (all stages)
- Avg overall score
- Period indicator

**Widget 2: Score Trends**
- Period-over-period score comparison
- Self vs supervisor gap

**Widget 3: Department Breakdown**
- Legal vs Administrative
- Position-level drill-down

**Widget 4: Supervisor Effectiveness**
- Completion rates by supervisor
- Average score gaps by supervisor

**Widget 5: Action Plan Summary**
- Status breakdown
- Department breakdown

**Widget 6: Announcements**
- Active announcements (current)

---

## Supervisor Dashboard

**Widget 1: My Team**
- Direct reports count
- Team completion rate
- Team avg score

**Widget 2: Team Status Grid**
- Per-employee progress: self/supervisor/feedback/action-plan
- Clickable rows → employee profile

**Widget 3: Pending Actions**
- Pending supervisor evaluations
- Pending feedback sessions
- Pending action plan approvals
- Pending vacation approvals

**Widget 4: My Self-Evaluation**
- Status badge
- Score badge (if completed)

**Widget 5: Announcements**
- Active announcements

---

## Employee Dashboard

**Widget 1: My Progress**
- Current phase indicator
- What's done / what's next
- Days until deadline

**Widget 2: My Evaluations**
- Self-eval status + score
- Supervisor eval status + score (if completed)

**Widget 3: My Action Plan**
- Status
- Smart items checklist

**Widget 4: My Objectives**
- Status summary

**Widget 5: My Vacations**
- Balance
- Pending requests

**Widget 6: Announcements**
- Active announcements

---

## Implementation Priority

1. **Phase 7A:** Replace Dashboard.tsx raw API calls with analytics API calls
2. **Phase 7B:** Add role-specific widget visibility
3. **Phase 7C:** Add trend/comparison widgets for admin/socio
4. **Phase 7D:** Add pending actions widget for supervisors
5. **Phase 7E:** Add employee progress widget

---

## Technical Approach

```typescript
// Replace current pattern:
const { data: usersData } = useUsers();
const { data: evaluationsData } = useEvaluations({ period: currentPeriod });
// ... compute everything in JS

// With:
const { data: overview } = useAnalyticsOverview(currentPeriod);
const { data: evalAnalytics } = useAnalyticsEvaluations(currentPeriod);
const { data: trends } = useAnalyticsTrends();
// ... use pre-computed data directly
```

**Performance impact:** Dashboard load from ~2s → ~200ms for admin. Same data, pre-computed server-side.
