# Trend Analytics Design

## Current Capability

The `/api/analytics/trends` endpoint returns:
1. `periodSummaries` — array of analytics_period_summary rows (up to 10 most recent)
2. `evaluationTrends` — period × type breakdown with counts and avg scores from live evaluations table

## Trend Metrics Available

### Evaluation Score Trends

```
Period     | Self Avg | Supervisor Avg | Overall Avg | Completion Rate
2025-H2    | 88       | —             | 88          | 0%
2026-H1    | 79.8     | 71.9          | 74.7        | 62%
2026-H2    | 75       | —             | 75          | 0%
```

**Insight:** 2026-H1 is the only period with meaningful data. Score gap between self (79.8) and supervisor (71.9) is 7.9 points.

### Completion Rate Trends

```
Period     | Self | Supervisor | Feedback | Action Plans
2025-H2    | 1    | 0          | 0        | 0
2026-H1    | 5    | 8          | 3        | 3
2026-H2    | 1    | 0          | 0        | 0
```

### Department-Level Trends

Currently not available in pre-computed form. Requires:
- analytics_evaluation_summary has `evaluated_position` and `evaluated_practice_area`
- Can compute Legal vs Administrative trends by grouping on position level

---

## Trend Visualizations

### 1. Score Trend Line Chart

**X-axis:** Periods (chronological)
**Y-axis:** Average score (0–100)
**Lines:**
- Self-evaluation average (blue)
- Supervisor evaluation average (green)
- Overall average (orange)

**Requires:** 2+ periods of data. Currently only 1 meaningful period.

### 2. Completion Rate Trend

**X-axis:** Periods
**Y-axis:** Completion rate (0–100%)
**Bars:** Stacked by phase (self, supervisor, feedback, action plan)

### 3. Department Performance Trend

**X-axis:** Periods
**Y-axis:** Average score
**Lines:** One per department (Legal, Administrative)

**Requires:** analytics_evaluation_summary grouped by `evaluated_practice_area`.

### 4. Supervisor Effectiveness Trend

**X-axis:** Periods
**Y-axis:** Average score gap (self - supervisor) per supervisor

**Data source:** Requires new query joining evaluations with supervisor_assignments.

---

## Implementation Roadmap

### Phase 1 (Current)
- `/api/analytics/trends` endpoint exists
- Returns period summaries + evaluation type breakdown
- Frontend not yet connected

### Phase 2 (Next)
- Connect Reports.tsx to trends endpoint
- Add period selector dropdown
- Display score trend line chart

### Phase 3 (Future)
- Add department-level trend breakdown
- Add supervisor effectiveness metrics
- Add quarter-over-quarter and year-over-year comparisons
- Add growth indicators (↑ +5.2% vs previous period)

---

## Data Requirements for Meaningful Trends

Current system has **1 completed period** (2026-H1). Trends require 2+ periods.

**Recommendation:** Do not invest heavily in trend UI until at least 2 periods have completed evaluation cycles. The data structure supports it; the visualization is premature.

**Minimum for trend visibility:** 2 completed periods with supervisor evaluations.

---

## Period Comparison Logic

```sql
-- Current period
SELECT * FROM analytics_period_summary WHERE period = '2026-H1';

-- Previous period
SELECT * FROM analytics_period_summary WHERE period = '2025-H2';

-- Calculate delta
SELECT
  curr.period,
  curr.avg_overall_score - prev.avg_overall_score as score_delta,
  curr.completion_rate - prev.completion_rate as completion_delta
FROM analytics_period_summary curr
LEFT JOIN analytics_period_summary prev
  ON prev.period = (
    SELECT MAX(p2.period) FROM analytics_period_summary p2
    WHERE p2.period < curr.period
  )
```

This can be computed server-side or client-side once multiple periods exist.
