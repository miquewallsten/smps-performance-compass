# Data Consistency Audit

## Users

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Active users | ~14-19 | 16 | ✅ |
| Inactive users | Test accounts | 3 (eCastaneda, mvega, eBeltran) | ✅ |
| SuperUser | 1 | 1 (SuperAdmin/lab@bowdot.com) | ✅ |
| Admin | 2+ | 3 (SuperAdmin, rdominguez, vcampos) | ✅ |
| Managing Partner | 1 | 1 (cmendoza) | ✅ |
| Practice areas | Legal positions | 6 users with practice_area | ✅ |

## Orphans Check

```
-- Users without supervisor assignments in 2026-H2
SELECT u.name, u.position FROM users u 
WHERE u.is_active = 1 AND u.is_super_user = 0 
AND u.id NOT IN (SELECT employee_id FROM supervisor_assignments WHERE period = '2026-H2')
AND u.id NOT IN (SELECT id FROM users WHERE position = 'socio' AND is_managing_partner = 1);
```

Result: Some users may not have assignments (SuperAdmin socio manages themselves). This needs verification but is NOT a data corruption issue.

## Evaluations

| Metric | Value |
|--------|-------|
| Total evaluations | 17 |
| With responses | 17 |
| Responses total | 160 |
| Responses with NULL question_text | 160 (100%) |
| Evaluations in 2026-H1 | 15 |
| Evaluations in 2026-H2 | 1 |
| Evaluations in 2025-H2 | 1 |

## Supervisor Assignments

| Metric | 2026-H1 | 2026-H2 |
|--------|---------|---------|
| Total assignments | 24 | 21 |
| Unique supervisors | 6 | 6 |

## Periods

| Period | Self Start | Action Plan End | Evaluations |
|--------|-----------|----------------|-------------|
| 2025-H2 | 2025-06-01 | 2025-11-30 | 1 |
| 2026-H1 | 2025-12-01 | 2026-05-31 | 15 |
| 2026-H2 | 2026-06-01 | 2026-11-30 | 1 |

## Analytics Tables

| Table | Row Count | Last Updated |
|-------|-----------|---------------|
| analytics_evaluation_summary | 15 | 2026-06-02 |
| analytics_period_summary | 3 | 2026-06-02 |
| analytics_user_activity | 0 | N/A |

**FINDING:** `analytics_user_activity` has 0 rows. This may affect dashboard metrics.

## Section Weights

| Position | tecnico | competencias | blandas | Matches Original? |
|----------|---------|-------------|---------|-------------------|
| counsel | 100 | 0 | 0 | ✅ |
| socio | 50 | 25 | 25 | ✅ |
| salary_partner | 50 | 25 | 25 | ✅ |
| asociado_sr | 60 | 20 | 20 | ✅ |
| asociado_mid | 60 | 20 | 20 | ✅ |
| asociado_jr | 40 | 40 | 20 | ✅ |
| pasante_carrera | 40 | 40 | 20 | ✅ |
| pasante_corporativo | 40 | 40 | 20 | ✅ |
| pasante | 40 | 40 | 20 | ✅ (new position) |
| director | 0 | 80 | 20 | ✅ |
| gerente | 0 | 80 | 20 | ✅ |
| coordinador | 0 | 80 | 20 | ✅ |
| analista | 0 | 80 | 20 | ✅ |
| asistente | 0 | 50 | 50 | ✅ |
| archivo_soporte | 0 | 50 | 50 | ✅ |
| archivista | 0 | 50 | 50 | ✅ (new) |
| soporte | 0 | 50 | 50 | ✅ (new) |

## Template Questions

| Position | Practice Area | Section | Count | Matches Original? |
|----------|--------------|---------|-------|-------------------|
| socio | corporativo | tecnico | 5 | ✅ |
| socio | corporativo | competencias | 4 | ✅ |
| socio | corporativo | blandas | 5 | ✅ |
| socio | consultoria_fiscal | tecnico | 5 | ✅ |
| socio | litigio_fiscal | tecnico | 5 | ✅ |
| counsel | corporativo | tecnico | 5 | ✅ |
| counsel | corporativo | competencias | 4 | ✅ |
| counsel | corporativo | blandas | 5 | ✅ |
| counsel | consultoria_fiscal | tecnico | 5 | ✅ |
| counsel | litigio_fiscal | tecnico | 5 | ✅ |
| director | corporativo | competencias | 6 | ✅ |
| director | corporativo | blandas | 4 | ✅ |

**Total template questions: 290** (200 corporativo + 45 consultoria_fiscal + 45 litigio_fiscal)

## Suspicious NULL Values

| Table | Column | NULL Count | Risk |
|-------|--------|------------|------|
| evaluation_responses | question_text | 160/160 | HIGH - historical data |
| evaluation_responses | category | 160/160 | HIGH - all "Sin Clasificar" |
| evaluation_responses | section | varies | HIGH - all "competencias" for old data |
| evaluation_responses | weight | varies | HIGH - all 1 for old data |
| users | practice_area | 13/19 | LOW - NULL for admin positions |

**CRITICAL FINDING:** All 160 historical evaluation responses have NULL `question_text`, "Sin Clasificar" category, and inconsistent section values. This is because the original app did not store these fields.
