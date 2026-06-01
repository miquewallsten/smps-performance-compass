# Report Performance Audit

## Methodology

Measured endpoint response times from external client (curl) to production server at smps.bowdot.online. All requests include JWT authentication.

---

## Analytics API Performance (Pre-Computed Tables)

| Endpoint | Response Time | Source | Notes |
|---|---|---|---|
| GET /api/analytics/overview?period=2026-H1 | ~200ms | analytics_period_summary | Cached data, single row lookup |
| GET /api/analytics/evaluations?period=2026-H1 | ~300ms | analytics_evaluation_summary | 14 rows, role-filtered |
| GET /api/analytics/trends | ~340ms | analytics_period_summary + evaluations | 2 queries, small dataset |
| GET /api/analytics/objectives?period=2026-H1 | ~290ms | personal_objectives (live) | 0 rows currently |
| GET /api/analytics/vacations | ~280ms | vacation_requests (live) | 0 rows currently |
| GET /api/analytics/action-plans?period=2026-H1 | ~300ms | action_plans (live) | 3 rows, role-filtered |

**All analytics endpoints under 500ms. Target met.**

---

## Legacy Dashboard Performance (Raw API Calls)

| Endpoint | Response Time | Notes |
|---|---|---|
| GET /api/users | ~300ms | Returns all users |
| GET /api/evaluations | ~400ms | Returns all evaluations |
| GET /api/assignments | ~250ms | Returns all assignments |
| GET /api/periods | ~200ms | Returns period configs |
| GET /api/vacations/requests | ~250ms | Returns all vacation requests |

**Current Dashboard loads 5+ API calls = ~1.4s+ total.**

The dashboard then computes all aggregations client-side in JavaScript, adding ~200ms of rendering time.

**Total dashboard load: ~1.6–2.5s for admin users (full dataset).**

---

## Before vs After Comparison

| Metric | Before (Raw APIs) | After (Analytics API) | Improvement |
|---|---|---|---|
| API calls for dashboard | 5+ | 2–3 | 50% fewer |
| Total data transfer | ~50KB (all users + evals) | ~5KB (aggregated) | 90% less |
| Server-side computation | None (client-side JS) | Pre-computed (30min cache) | Eliminated |
| Dashboard load time (admin) | ~2.5s | ~0.5s (projected) | 80% faster |
| Dashboard load time (employee) | ~1.5s | ~0.3s (projected) | 80% faster |

---

## N+1 Query Analysis

### Found: analytics-refresh.ts — refreshEvaluationSummary()

```typescript
// For EACH evaluation, makes 2 additional queries:
for (const e of evaluations as any[]) {
  const responseCount = await db.get('SELECT COUNT(*) FROM evaluation_responses WHERE evaluation_id = ?', [e.id]);
  const naCount = await db.get('SELECT COUNT(*) FROM evaluation_responses WHERE evaluation_id = ? AND not_applicable = 1', [e.id]);
}
```

**Impact:** With 16 evaluations → 32 extra queries during refresh. Acceptable at current scale.

**Fix for scale:** Replace with batch query:
```sql
SELECT evaluation_id, COUNT(*) as cnt,
       SUM(CASE WHEN not_applicable = 1 THEN 1 ELSE 0 END) as na_count
FROM evaluation_responses
GROUP BY evaluation_id
```

### Found: Dashboard.tsx — Client-side N+1

```typescript
// Loads ALL users, then filters in JavaScript
const visible = users.filter(u => u.isActive && !u.isSuperUser);
if (myTeamIds) base = base.filter(u => myTeamIds.includes(u.id) || u.id === currentUser.id);
```

**Impact:** Transfers entire user list to every client. Fixed by analytics API.

---

## Slow Query Candidates

| Query | Table | Estimated Time | Index Status |
|---|---|---|---|
| evaluations by period | evaluations | ~50ms | ✅ idx_period exists |
| evaluation_responses by evaluation_id | evaluation_responses | ~20ms | ✅ FK index exists |
| supervisor_assignments by period | supervisor_assignments | ~30ms | ✅ idx_period exists |
| action_plans by period + employee | action_plans | ~30ms | ✅ Composite index |
| authentication_audit by date | authentication_audit | ~100ms | ✅ idx_created_at exists |

**No critical slow queries found at current data volume (14 users, 16 evaluations).**

---

## Scalability Projections

| Users | Evaluations | Dashboard (raw) | Dashboard (analytics) | Analytics Refresh |
|---|---|---|---|---|
| 14 | 16 | ~2.5s | ~0.5s | ~1s |
| 100 | 200 | ~8s | ~0.8s | ~10s |
| 500 | 1000 | ~30s+ | ~1.5s | ~60s |
| 1000 | 2000 | ~60s+ | ~2s | ~120s |

**Key insight:** Analytics tables make dashboards viable at 10x current scale. At 100+ users, raw API approach becomes unusable.

**Analytics refresh bottleneck:** The per-evaluation loop in refreshEvaluationSummary() needs batch optimization before 100+ users.

---

## Recommendations

1. **IMMEDIATE:** Connect Dashboard.tsx and Reports.tsx to analytics API
2. **SHORT-TERM:** Optimize refreshEvaluationSummary() with batch query
3. **MEDIUM-TERM:** Add objectives/vacations/action-plans to summary tables
4. **LONG-TERM:** Consider incremental refresh (only new/changed records)
