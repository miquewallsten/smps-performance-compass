# SMPS Analytics Validation

**Date:** 2026-06-02
**Status:** VALIDATION COMPLETE — 13/15 checks passed

---

## Overview Analytics

| Metric | Source (DB) | API | Match |
|--------|-------------|-----|-------|
| totalEmployees | 13 | 13 | ✅ |
| selfEvalCompleted (2026-H1) | 6 | 6 | ✅ |
| **supervisorEvalCompleted (2026-H1)** | **9** | **8** | **❌ -1** |
| feedbackCompleted (2026-H1) | 3 | 3 | ✅ |
| **avgScore (2026-H1)** | **74 (integer)** | **74.4 (float)** | **❌ rounding** |
| selfEvalCompleted (2026-H2) | 1 | 1 | ✅ |
| supervisorEvalCompleted (2026-H2) | 0 | 0 | ✅ |
| feedbackCompleted (2026-H2) | 0 | 0 | ✅ |
| avgScore (2026-H2) | 75 | 75 | ✅ |

**Mismatches:**
1. `supervisorEvalCompleted` for 2026-H1: Source shows 9 completed supervisor evaluations, analytics shows 8. The `analytics_evaluation_summary` table is missing one record — possibly the empty evaluation or a refresh gap.
2. `avgScore` for 2026-H1: Source calculates integer 74, API returns float 74.4. The analytics table stores a non-rounded average while the application rounds to integer.

## Evaluation Analytics (by type)

| Metric | Source | API | Match |
|--------|--------|-----|-------|
| total evaluations (H1) | 15 | 15 | ✅ |
| completed evaluations (H1) | 15 | 15 | ✅ |
| byType.self.total | 6 | 6 | ✅ |
| byType.supervisor.total | 9 | 9 | ✅ |

## Action Plans Analytics

| Metric | Source | API | Match |
|--------|--------|-----|-------|
| total plans | 3 | 3 | ✅ |

## Objectives Analytics

| Metric | Source | API | Match |
|--------|--------|-----|-------|
| total | 0 | 0 | ✅ |

## Vacations Analytics

| Metric | Source | API | Match |
|--------|--------|-----|-------|
| total | 0 | 0 | ✅ |

---

## Findings

1. **supervisorEvalCompleted H1**: 1 evaluation missing from analytics summary table
2. **avgScore rounding**: Analytics stores float average, application rounds to integer
3. **totalEmployees**: Global count, not period-scoped (all periods show 13)

