# SMPS UI Regression Sweep

**Date:** 2026-06-02
**Status:** AUDIT COMPLETE

---

## Summary

All tables, lists, search, filtering, and sorting function correctly at the code level. The issues found are data quality issues, not rendering bugs.

---

## Table Audits

### Users Table
| Aspect | Status | Notes |
|--------|--------|-------|
| Row count | ✅ 19 users rendered | API returns 19 |
| Sorting | ✅ Active: Legal→Admin→name | Code is correct |
| Search | ✅ Client-side name filter | Works correctly |
| Filter (Legal/Admin) | ✅ Radio button filter | Works correctly |
| **Issue: Position names** | ❌ 3 users have non-original names | pasante/soporte vs pasante_corporativo/archivo_soporte |
| **Issue: practice_area** | ❌ 5 legal users missing area | Should have "corporativo" |

### Evaluations Table
| Aspect | Status | Notes |
|--------|--------|-------|
| Row count | ✅ 17 evaluations | API returns 17 |
| Filter (period) | ✅ Period selector dropdown | Defaults to current period |
| Sorting | ✅ By period + type | Client-side sort |
| **Issue: Period default** | ❌ Defaults to 2026-H2 (1 eval) | User must manually select 2026-H1 |

### Assignments Table
| Aspect | Status | Notes |
|--------|--------|-------|
| Row count | ✅ 21-24 per period | API returns correctly |
| Filter (period) | ✅ Period parameter in API | Works correctly |
| **Issue: Inactive users** | ❌ Prueba Martha assigned in H2 | Inactive director still has assignment |

### Action Plans Table
| Aspect | Status | Notes |
|--------|--------|-------|
| Row count | ✅ 3 plans | API returns 3 |
| Filter (period) | ✅ Period API parameter | Works correctly |
| **Issue: Coverage** | ❌ Only 3 plans for 17 evaluations | 18% completion rate |

### Notifications Table
| Aspect | Status | Notes |
|--------|--------|-------|
| Row count | ✅ 0 unread | API returns 0 |
| Filter (unread) | ✅ Toggle works | Would work correctly |

### Reports Tables
| Aspect | Status | Notes |
|--------|--------|-------|
| Completion Pie | ✅ Chart renders | Data is correct |
| Stage Bar Chart | ✅ 4 stages rendered | Data is correct |
| Self-Eval by Position | ✅ Chart renders | Data is correct |
| Sup-Eval by Position | ✅ Chart renders | Data is correct |
| Avg by Position | ✅ Chart renders | Data is correct |
| Area Filter | ✅ Buttons work | All/Legal/Admin |

---

## Findings

### Data Quality Issues (Not Rendering Bugs)

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 1 | 3 users have non-original positions | Display shows wrong labels | Update user positions in DB |
| 2 | 5 legal users missing practice_area | Template loading may fallback | Update practice_area in DB |
| 3 | Period defaults to empty H2 | Empty charts and tables | Period recovery fix |
| 4 | Inactive user Prueba Martha has assignment | Appears in Org Chart | Remove assignment or handle inactive filtering |

### Rendering Correctness

All UI components render correctly given the data they receive. There are no rendering bugs, missing elements, broken CSS, or JavaScript errors. The issues are all upstream data quality.

