# Authorization Remediation Plan — SMPS Performance Compass

## Route-by-Route Fixes

Each route is listed with the specific middleware to add and any additional logic needed.

### Priority Legend

- 🔴 **P0** — Any authenticated user can read/modify any data
- 🟠 **P1** — Any authenticated user can perform privileged actions (approve, create for others)
- 🟡 **P2** — Data visible to more users than intended
- ⚪ **P3** — Minor or cosmetic

---

## Evaluations (`server/routes/evaluations.ts`)

### 🔴 P0: `GET /api/evaluations` — List all evaluations

**Current:** Any authenticated user gets all evaluations matching query params.
**Fix:** Add role-based filtering.

```typescript
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  // Admin/super/managing_partner see all
  if (user.role === 'admin' || user.role === 'super_user' || user.isManagingPartner) {
    // existing logic — return all
  }
  // Socio sees all except other socios and managing partners (visibility rules)
  if (user.position === 'socio') {
    // filter out socios, salary_partners, managing partners from evaluated list
  }
  // Regular employee: only own evaluations + those where they are evaluator or supervisor
  // Return evaluations where evaluator_id = user.id OR evaluated_id = user.id
  //   OR user is supervisor of evaluated in the period
});
```

**Ownership check needed:** evaluator, evaluated, or supervisor of evaluated.

---

### 🔴 P0: `GET /api/evaluations/:id` — Get single evaluation

**Current:** Any authenticated user gets any evaluation by ID.
**Fix:** Check that requester is evaluator, evaluated, supervisor, or admin.

```typescript
router.get('/:id', authMiddleware, requirePermission(async (user, req) => {
  const eval = await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
  if (!eval) return true; // will 404 later
  if (user.role === 'admin' || user.role === 'super_user' || user.isManagingPartner) return true;
  if (user.id === eval.evaluator_id || user.id === eval.evaluated_id) return true;
  // Check supervisor
  const assignment = await db.get(
    'SELECT id FROM supervisor_assignments WHERE supervisor_id = ? AND employee_id = ? AND period = ? LIMIT 1',
    [user.id, eval.evaluated_id, eval.period]
  );
  return !!assignment;
}), async (req, res) => { /* ... */ });
```

---

### 🔴 P0: `POST /api/evaluations` — Create evaluation

**Current:** Any authenticated user can create an evaluation for anyone.
**Fix:** Validate that evaluatorId is the requesting user (for self-evaluations) or the user is a supervisor of the evaluated (for supervisor evaluations) or admin.

```typescript
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { evaluatorId, evaluatedId, period, type } = req.body;
  const user = req.user!;

  if (type === 'self') {
    // Self-evaluation: evaluator must be the evaluated user
    if (evaluatorId !== evaluatedId) return res.status(403).json({ error: 'Self-evaluation must be by the evaluated user' });
    if (evaluatorId !== user.id && user.role !== 'admin' && user.role !== 'super_user') {
      return res.status(403).json({ error: 'You can only create your own self-evaluation' });
    }
  } else if (type === 'supervisor') {
    // Supervisor evaluation: evaluator must be assigned as supervisor
    if (user.role !== 'admin' && user.role !== 'super_user') {
      if (evaluatorId !== user.id) {
        return res.status(403).json({ error: 'You can only evaluate as yourself' });
      }
      const assignment = await db.get(
        'SELECT id FROM supervisor_assignments WHERE supervisor_id = ? AND employee_id = ? AND period = ?',
        [user.id, evaluatedId, period]
      );
      if (!assignment) return res.status(403).json({ error: 'You are not assigned as supervisor for this employee' });
    }
  }
  // ... existing creation logic
});
```

---

### 🔴 P0: `PUT /api/evaluations/:id` — Update evaluation

**Current:** Any authenticated user can update any evaluation.
**Fix:** Only evaluator, supervisor, or admin can update.

```typescript
router.put('/:id', authMiddleware, requirePermission(async (user, req) => {
  const eval = await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
  if (!eval) return true; // 404 handled downstream
  if (user.role === 'admin' || user.role === 'super_user' || user.isManagingPartner) return true;
  if (user.id === eval.evaluator_id) return true;
  // Supervisor of evaluated can also update
  const assignment = await db.get(
    'SELECT id FROM supervisor_assignments WHERE supervisor_id = ? AND employee_id = ? AND period = ?',
    [user.id, eval.evaluated_id, eval.period]
  );
  return !!assignment;
}), async (req, res) => { /* ... */ });
```

---

### 🟠 P1: `PATCH /api/evaluations/:id/feedback` — Complete feedback

**Current:** Any authenticated user can mark feedback as complete.
**Fix:** Only supervisor of evaluated or admin.

```typescript
router.patch('/:id/feedback', authMiddleware, requirePermission(async (user, req) => {
  const eval = await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
  if (!eval) return true;
  if (user.role === 'admin' || user.role === 'super_user' || user.isManagingPartner) return true;
  const assignment = await db.get(
    'SELECT id FROM supervisor_assignments WHERE supervisor_id = ? AND employee_id = ? AND period = ?',
    [user.id, eval.evaluated_id, eval.period]
  );
  return !!assignment;
}), async (req, res) => { /* ... */ });
```

---

### 🟠 P1: `PATCH /api/evaluations/:id/na-approval` — Approve NA

**Current:** Any authenticated user can approve NA flags.
**Fix:** Same as feedback — supervisor of evaluated or admin.

Use same `requirePermission` pattern as feedback.

---

## Objectives (`server/routes/objectives.ts`)

### 🔴 P0: `POST /api/objectives` — Create objectives

**Current:** Any authenticated user can create objectives for any user.
**Fix:** userId must be self or admin.

```typescript
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (req.user!.role !== 'admin' && req.user!.role !== 'super_user' && req.user!.id !== userId) {
    return res.status(403).json({ error: 'You can only create objectives for yourself' });
  }
  // ... existing logic
});
```

### 🟠 P1: `POST /api/objectives/:id/submit` — Submit objectives

**Current:** Any user can submit any objectives.
**Fix:** Only the owner or admin.

```typescript
router.post('/:id/submit', authMiddleware, requirePermission(async (user, req) => {
  const obj = await db.get('SELECT * FROM personal_objectives WHERE id = ?', [req.params.id]);
  if (!obj) return true;
  if (user.role === 'admin' || user.role === 'super_user') return true;
  return user.id === obj.user_id;
}), async (req, res) => { /* ... */ });
```

### 🟠 P1: `POST /api/objectives/:id/review` — Review objectives

**Current:** Any user can approve/reject any objectives.
**Fix:** Only admin or supervisor.

```typescript
router.post('/:id/review', authMiddleware, requireRole('admin'), async (req, res) => { /* ... */ });
```

---

## Action Plans (`server/routes/action-plans.ts`)

### 🔴 P0: `GET /api/action-plans` — List all action plans

**Current:** Returns all plans matching optional filters.
**Fix:** Filter by ownership or admin.

```typescript
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  let sql = 'SELECT * FROM action_plans WHERE 1=1';
  const params: string[] = [];

  if (user.role !== 'admin' && user.role !== 'super_user' && !user.isManagingPartner) {
    // Regular user: only see own plans + plans of supervised employees
    sql += ' AND (employee_id = ? OR supervisor_id = ?)';
    params.push(user.id, user.id);
  }
  // existing filter logic for employeeId, period
  // ...
});
```

### 🔴 P0: `POST /api/action-plans` — Create action plan

**Current:** Any user can create plan for anyone.
**Fix:** supervisorId must be self or admin; employeeId must be supervised by requesting user.

### 🟠 P1: `PATCH /api/action-plans/:id` — Update action plan

**Current:** Any user can update any plan.
**Fix:** Only employee, supervisor, or admin.

### 🟠 P1: `POST /api/action-plans/:id/approve` — Approve action plan

**Current:** Any user can approve any plan.
**Fix:** Only the supervisor or admin.

```typescript
router.post('/:id/approve', authMiddleware, requirePermission(async (user, req) => {
  const plan = await db.get('SELECT * FROM action_plans WHERE id = ?', [req.params.id]);
  if (!plan) return true;
  if (user.role === 'admin' || user.role === 'super_user' || user.isManagingPartner) return true;
  return user.id === plan.supervisor_id;
}), async (req, res) => { /* ... */ });
```

---

## Vacations (`server/routes/vacations.ts`)

### 🟡 P2: `GET /api/vacations/requests` — List vacation requests

**Current:** Returns all requests; optional filters but no role-based filtering.
**Fix:** Filter by user or supervisor relationship.

```typescript
router.get('/requests', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  let sql = 'SELECT * FROM vacation_requests WHERE 1=1';
  const params: string[] = [];

  if (user.role === 'admin' || user.role === 'super_user' || user.isManagingPartner) {
    // Admin sees all — apply optional filters
  } else {
    // Regular user: see own requests + requests from supervised employees
    const assignments = await db.all(
      'SELECT employee_id FROM supervisor_assignments WHERE supervisor_id = ?',
      [user.id]
    );
    const visibleIds = [user.id, ...assignments.map(a => a.employee_id)];
    sql += ' AND user_id IN (?)';
    params.push(visibleIds.join(','));
  }
  // existing filter logic
  // ...
});
```

### 🔴 P0: `POST /api/vacations/requests` — Create vacation request

**Current:** Any user can create request for any user.
**Fix:** userId must be self.

```typescript
router.post('/requests', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (req.user!.role !== 'admin' && req.user!.super_user !== true && req.user!.id !== userId) {
    return res.status(403).json({ error: 'You can only create vacation requests for yourself' });
  }
  // ... existing logic
});
```

### 🟠 P1: `PATCH /api/vacations/requests/:id` — Update request status

**Current:** Any user can change status of any request.
**Fix:** Only admin can change status.

```typescript
router.patch('/requests/:id', authMiddleware, async (req: Request, res: Response) => {
  const { status } = req.body;
  if (status && req.user!.role !== 'admin' && !req.user!.isSuperUser) {
    return res.status(403).json({ error: 'Only admins can change request status' });
  }
  // ... existing logic
});
```

### 🟠 P1: `POST /api/vacations/requests/:id/approve` — Approve request

**Current:** Any user can approve any request.
**Fix:** Only supervisor of the request's user or admin.

```typescript
router.post('/requests/:id/approve', authMiddleware, requirePermission(async (user, req) => {
  const request = await db.get('SELECT * FROM vacation_requests WHERE id = ?', [req.params.id]);
  if (!request) return true;
  if (user.role === 'admin' || user.role === 'super_user' || user.isManagingPartner) return true;
  const assignment = await db.get(
    'SELECT id FROM supervisor_assignments WHERE supervisor_id = ? AND employee_id = ? LIMIT 1',
    [user.id, request.user_id]
  );
  return !!assignment;
}), async (req, res) => { /* ... */ });
```

---

## System (`server/index.ts`)

### ⚪ P3: `GET /api/health/stats` — Unauthenticated stats endpoint

**Current:** No auth required.
**Fix:** Add `authMiddleware`.

```typescript
app.get('/api/health/stats', authMiddleware, async (_req, res) => { /* ... */ });
```

---

## Assignments (`server/routes/assignments.ts`)

### 🟡 P2: `GET /api/assignments` — List assignments

**Current:** Returns all assignments. Visibility depends on frontend filtering.
**Fix:** For non-admin users, only return assignments where they are employee or supervisor.

```typescript
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  let sql = 'SELECT * FROM supervisor_assignments WHERE 1=1';
  const params: string[] = [];

  if (user.role !== 'admin' && user.role !== 'super_user' && !user.isManagingPartner) {
    sql += ' AND (employee_id = ? OR supervisor_id = ?)';
    params.push(user.id, user.id);
  }
  // existing period filter
  // ...
});
```

---

## Implementation Order

| Step | Route(s) | Priority | Effort |
|------|-----------|----------|--------|
| 1 | `GET /api/health/stats` — add authMiddleware | P3 | 5 min |
| 2 | `POST /api/evaluations` — add evaluator/supervisor validation | P0 | 1h |
| 3 | `PUT /api/evaluations/:id` — add ownership check | P0 | 1h |
| 4 | `PATCH /api/evaluations/:id/feedback` — add supervisor check | P1 | 30min |
| 5 | `PATCH /api/evaluations/:id/na-approval` — add supervisor check | P1 | 30min |
| 6 | `GET /api/evaluations` — add visibility filtering | P2 | 1h |
| 7 | `GET /api/evaluations/:id` — add ownership check | P0 | 30min |
| 8 | `POST /api/objectives` — add userId validation | P0 | 30min |
| 9 | `POST /api/objectives/:id/review` — add admin-only check | P1 | 15min |
| 10 | `POST /api/objectives/:id/submit` — add ownership check | P1 | 15min |
| 11 | `GET /api/action-plans` — add visibility filtering | P0 | 30min |
| 12 | `POST /api/action-plans` — add supervisor validation | P0 | 30min |
| 13 | `PATCH /api/action-plans/:id` — add ownership check | P1 | 30min |
| 14 | `POST /api/action-plans/:id/approve` — add supervisor check | P1 | 30min |
| 15 | `GET /api/vacations/requests` — add visibility filtering | P2 | 30min |
| 16 | `POST /api/vacations/requests` — add userId validation | P0 | 15min |
| 17 | `PATCH /api/vacations/requests/:id` — add admin-only for status changes | P1 | 15min |
| 18 | `POST /api/vacations/requests/:id/approve` — add supervisor check | P1 | 30min |
| 19 | `GET /api/assignments` — add visibility filtering | P2 | 15min |

**Total estimated effort: ~8 hours**

---

## Verification Checklist

After implementing each fix, verify:

- [ ] Regular employee cannot read other employees' evaluations
- [ ] Regular employee cannot create evaluations for other users
- [ ] Regular employee cannot approve feedback or NA on others' evaluations
- [ ] Regular employee cannot approve action plans for others
- [ ] Regular employee cannot approve vacation requests for others
- [ ] Regular employee cannot create vacation requests for others
- [ ] Regular employee cannot create objectives for others
- [ ] Regular employee cannot review (approve/reject) objectives
- [ ] Supervisor can only see evaluations of their direct reports
- [ ] Supervisor can only approve action plans of their direct reports
- [ ] Supervisor can only approve vacation requests of their direct reports
- [ ] Admin can still perform all operations
- [ ] SuperUser can still perform all operations
- [ ] `/api/health/stats` requires authentication
REMEDOF
echo "Remediation plan written"