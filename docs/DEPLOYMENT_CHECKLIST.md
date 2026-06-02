# SMPS Deployment Checklist

**Every deployment to production must pass all checks.**

---

## Pre-Deployment

### 1. Tests
```bash
npm test
```
- [ ] All tests pass (0 failures)
- [ ] Evaluation engine tests pass (42 tests)

### 2. Data Integrity
```bash
npm run audit:all
```
- [ ] Zero score mismatches
- [ ] Zero empty completed evaluations
- [ ] Zero orphaned assignments
- [ ] Zero analytics drift
- [ ] Template integrity passes (290 templates, 17 weights, 84 library)

### 3. Build
```bash
npm run build
```
- [ ] Frontend builds without errors
- [ ] Backend builds without errors

### 4. Health Check
```bash
curl https://smps.bowdot.online/api/health
curl https://smps.bowdot.online/api/system/integrity
```
- [ ] Health endpoint returns OK
- [ ] Integrity endpoint returns status: "healthy"

---

## Deployment Steps

1. [ ] Verify `main` branch is up to date
2. [ ] Run pre-deployment checks above
3. [ ] Push to `main` (triggers GitHub Actions)
4. [ ] Monitor GitHub Actions for build success
5. [ ] Monitor GitHub Actions for deploy success

---

## Post-Deployment Verification

### 1. API Health
- [ ] `GET /api/health` → `{"status":"ok"}`
- [ ] `GET /api/system/integrity` → `{"status":"healthy"}`

### 2. Authentication
- [ ] Login works (lab@bowdot.com)
- [ ] Token returned
- [ ] Session created

### 3. Core Pages Load
- [ ] Dashboard loads with data
- [ ] Evaluations page loads
- [ ] Self Evaluation loads
- [ ] Org Chart loads
- [ ] Reports show charts

### 4. Evaluation Engine
- [ ] Score calculation produces correct results
- [ ] Section weights load correctly
- [ ] Template questions load correctly
- [ ] Practice area filtering works

### 5. Period System
- [ ] Current period correctly resolved
- [ ] Display period shows most recent data
- [ ] Creation targets current period

---

## Rollback Procedure

If deployment fails:

1. Revert to previous commit:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```
2. Or restore from server backup

---

## Protected Systems Verification

Before ANY deployment, verify these remain unchanged:

- [ ] template_questions: 290 rows, 17 positions, 3 sections
- [ ] question_library: 84 rows
- [ ] section_weights: 17 rows, all sum to 100
- [ ] position_config: 17 positions
- [ ] evaluation_categories: 24 categories
- [ ] competency_definitions: 35 rows
- [ ] calculateScore() logic unchanged
- [ ] visibility rules unchanged

