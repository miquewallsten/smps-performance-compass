# SMPS Score Integrity Audit

**Date:** 2026-06-02
**Method:** Production API evaluation dump + formula recalculation
**Production:** https://smps.bowdot.online
**Status:** AUDIT COMPLETE — 4 SQL repairs identified

---

## Summary

| Metric | Value |
|--------|-------|
| Total evaluations | 17 |
| Scores correct | 13 |
| Score mismatches | 3 |
| Empty + completed | 1 |
| **Accuracy** | **76%** |

---

## Complete Score Table

| # | Evaluation ID | Type | Period | Employee | Stored | Calc | Δ | Responses |
|---|---------------|------|--------|----------|--------|------|---|-----------|
| 1 | 22f37d5a | supervisor | 2026-H1 | Lic. Diego Ramírez | 80 | 80 | 0 | 13 |
| 2 | 2b54fc9c | supervisor | 2026-H1 | Ing. Rafael Domínguez | 80 | 80 | 0 | 13 |
| 3 | 2bd03bda | self | 2026-H1 | Lic. Carlos Mendoza | 79 | 79 | 0 | 14 |
| 4 | 60e7662f | supervisor | 2026-H1 | Lic. Carlos Mendoza | 80 | 80 | 0 | 14 |
| 5 | 65c501e6 | self | 2026-H1 | Lic. Diego Ramírez | 70 | 70 | 0 | 2 |
| 6 | 663aeb2a | supervisor | 2026-H1 | Lic. Roberto Figueroa | 80 | 80 | 0 | 14 |
| **7** | **67d81b7b** | **self** | **2026-H2** | **Lic. Emilio Castañeda** | **75** | **70** | **-5** | **4** |
| 8 | 685a5318 | self | 2026-H1 | Ing. Rafael Domínguez | 80 | 80 | 0 | 10 |
| **9** | **6e8f5bd7** | **self** | **2025-H2** | **SuperAdmin** | **88** | **70** | **-18** | **2** |
| 10 | 758314d9 | self | 2026-H1 | SuperAdmin | 80 | 80 | 0 | 14 |
| 11 | 76ca26af | self | 2026-H1 | Prueba Martha | 80 | 80 | 0 | 10 |
| **12** | **8cc7361d** | **supervisor** | **2026-H1** | **SuperAdmin** | **0** | **—** | **—** | **0** |
| 13 | 9c1c8fe9 | supervisor | 2026-H1 | Lic. Patricia Salinas | 80 | 80 | 0 | 14 |
| 14 | c5c5413c | self | 2026-H1 | Lic. Patricia Salinas | 80 | 80 | 0 | 14 |
| 15 | d950b356 | supervisor | 2026-H1 | C.P. Sandra Morales | 80 | 80 | 0 | 10 |
| 16 | e65a5a84 | supervisor | 2026-H1 | Fernando Ruiz | 80 | 80 | 0 | 10 |
| **17** | **f6d483e0** | **supervisor** | **2026-H1** | **Lic. Carlos Mendoza** | **87** | **90** | **+3** | **2** |

---

## Mismatch Details

### 1. Lic. Emilio Castañeda (self, 2026-H2)
- **ID:** `67d81b7b-b8ea-4371-a2bc-63935ce23eeb`
- **Responses:** 4 (s1=3, s2=4, s3=5/NA, s4=2)
- **Weights:** 10, 9, 8, 8 (original question weights, not rescaled)
- **Active responses:** 4 (s3 has NA=1 but score≠0, so INCLUDED)
- **Calculation:** `round((0.6×10 + 0.8×9 + 1.0×8 + 0.4×8) / 35 × 100) = round(69.7) = 70`
- **Stored:** 75 (-5 error)

### 2. SuperAdmin (self, 2025-H2)
- **ID:** `6e8f5bd7-c5f8-451b-be6d-9a1812a10f32`
- **Responses:** 2 (s1=4, s2=3)
- **Weights:** 1, 1 (original seed weights, never rescaled)
- **Calculation:** `round((0.8 + 0.6) / 2 × 100) = 70`
- **Stored:** 88 (-18 error — gross deviation)

### 3. Lic. Carlos Mendoza (supervisor, 2026-H1)
- **ID:** `f6d483e0-1d85-4c57-aeaf-6223a6ea2962`
- **Evaluated by:** SuperAdmin
- **Responses:** 2 (s1=4, s2=5)
- **Weights:** 1, 1
- **Calculation:** `round((0.8 + 1.0) / 2 × 100) = 90`
- **Stored:** 87 (+3 error)

---

## Empty Completed Evaluation

### 4. SuperAdmin → SuperAdmin (supervisor, 2026-H1)
- **ID:** `8cc7361d-6e66-47ed-97a9-d1c408303e91`
- **Responses:** 0
- **Status:** Marked as completed (completed_at = 2026-06-01T16:24:01.000Z)
- **Impact:** Drags down average score calculations

---

## SQL Repair Statements

```sql
-- Fix score mismatches
UPDATE evaluations SET total_score = 70 WHERE id = '67d81b7b-b8ea-4371-a2bc-63935ce23eeb';
UPDATE evaluations SET total_score = 70 WHERE id = '6e8f5bd7-c5f8-451b-be6d-9a1812a10f32';
UPDATE evaluations SET total_score = 90 WHERE id = 'f6d483e0-1d85-4c57-aeaf-6223a6ea2962';

-- Fix empty completed evaluation
UPDATE evaluations SET completed_at = NULL WHERE id = '8cc7361d-6e66-47ed-97a9-d1c408303e91';
```

**Risk:** ZERO — these are data corrections only. No schema changes. No code changes. Scores recalculated using the same formula that the application uses.

