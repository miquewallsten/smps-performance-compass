# SMPS Integrity Monitoring Framework

**Date:** 2026-06-02  
**Status:** DESIGN ONLY — NOT IMPLEMENTED

---

## Design Goals

A nightly job that detects data integrity issues before users see them.

---

## Monitoring Checks

### 1. Completed Evaluations Without Responses
```sql
SELECT e.id, e.type, e.period, e.completed_at
FROM evaluations e
LEFT JOIN evaluation_responses er ON er.evaluation_id = e.id
WHERE e.completed_at IS NOT NULL
GROUP BY e.id
HAVING COUNT(er.id) = 0;
```
**Trigger:** Any rows returned → **CRITICAL ALERT**

### 2. Score Mismatches
```sql
-- Compare stored total_score against recalculation from responses
-- Run nightly, flag any deviation
```
**Trigger:** Any rows returned → **HIGH ALERT**

### 3. Analytics Mismatches
```sql
-- Compare analytics tables against source tables
-- Check: total_employees, eval counts, avg scores
-- SELECT source_count, analytics_count WHERE mismatch
```
**Trigger:** Any mismatch > 5% → **MEDIUM ALERT**

### 4. Orphaned Assignments
```sql
SELECT sa.id, sa.employee_id, sa.period
FROM supervisor_assignments sa
LEFT JOIN users u ON u.id = sa.employee_id
WHERE u.id IS NULL OR u.is_active = 0;
```
**Trigger:** Any rows returned → **MEDIUM ALERT**

### 5. Invalid Supervisors
```sql
SELECT sa.id, sa.supervisor_id, sa.employee_id
FROM supervisor_assignments sa
LEFT JOIN users u ON u.id = sa.supervisor_id
WHERE u.id IS NULL OR u.is_active = 0;
```
**Trigger:** Any rows returned → **MEDIUM ALERT**

### 6. Invalid Positions
```sql
SELECT u.id, u.name, u.position
FROM users u
LEFT JOIN position_config pc ON pc.position = u.position
WHERE pc.position IS NULL;
```
**Trigger:** Any rows returned → **LOW ALERT**

### 7. Empty Current Period
Query evaluations count for current active period.  
**Trigger:** 0 evaluations AND current period is past self_start + 3 days → **HIGH ALERT**

### 8. Mutual Supervisor Assignments
```sql
SELECT sa1.employee_id, sa1.supervisor_id
FROM supervisor_assignments sa1
JOIN supervisor_assignments sa2 
  ON sa1.employee_id = sa2.supervisor_id 
  AND sa1.supervisor_id = sa2.employee_id
  AND sa1.period = sa2.period
WHERE sa1.period = ?;
```
**Trigger:** Any rows returned → **MEDIUM ALERT**

### 9. Missing Objective Data
```sql
SELECT COUNT(*) FROM personal_objectives WHERE period = ?;
```
**Trigger:** 0 rows for current period → **MEDIUM ALERT**

### 10. Inactive Users With Assignments
```sql
SELECT sa.id, u.name, sa.period
FROM supervisor_assignments sa
JOIN users u ON u.id = sa.employee_id
WHERE u.is_active = 0;
```
**Trigger:** Any rows returned → **LOW ALERT**

---

## Schema

```sql
CREATE TABLE IF NOT EXISTS integrity_checks (
  id VARCHAR(36) PRIMARY KEY,
  check_name VARCHAR(100) NOT NULL,
  check_query TEXT NOT NULL,
  severity ENUM('critical','high','medium','low') NOT NULL,
  last_run_at DATETIME,
  last_status ENUM('pass','fail','error') DEFAULT 'pass',
  last_result TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS integrity_check_runs (
  id VARCHAR(36) PRIMARY KEY,
  check_id VARCHAR(36) NOT NULL,
  run_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pass','fail','error') NOT NULL,
  row_count INT DEFAULT 0,
  details TEXT,
  INDEX idx_icr_check (check_id),
  INDEX idx_icr_run_at (run_at)
);
```

---

## Job Schedule

| Time | Check | Severity |
|------|-------|----------|
| 02:00 UTC | All checks | — |
| Every 15 min | Empty evaluations | CRITICAL |
| Hourly | Score mismatches | HIGH |

---

## Alerting

| Channel | Trigger |
|---------|---------|
| Email to admin | CRITICAL or HIGH failures |
| Dashboard widget | Summary of last run status |
| API endpoint | GET /api/admin/integrity/status |

---

## Dashboard Metrics

A simple status card:
- ✅ All checks passed
- ⚠️ 2 warnings (medium)
- ❌ 1 critical failure → investigation needed

