# Final Authorization Matrix — SMPS Performance Compass

> **Source of truth for implementation.** Every route protection must reference this document.

## Role Definitions

| Role | JWT `role` | Flags | Description |
|------|-----------|-------|-------------|
| SuperUser | `super_user` | `is_super_user=1` | Full system access including copilot and system config |
| Admin | `admin` | `is_admin=1` | User management, evaluation config, all modules (cannot modify super_user status) |
| Managing Partner | `admin` | `is_managing_partner=1` | Treated as admin for access; can see all evaluations |
| Socio | `user` | `position='socio'` or `position='salary_partner'` | Can see all evaluations except other socios/managing partners |
| Employee | `user` | default | Own data + supervised team |

**Important**: Supervisor is NOT a role. It is a period-based assignment in `supervisor_assignments`. Any user (including socio, admin) can be assigned as a supervisor.

## Visibility Function

```
canSeeUserData(viewer, targetUser, period):
  if viewer.role == 'super_user' or viewer.role == 'admin' or viewer.isManagingPartner: return true
  if viewer.id == targetUser.id: return true
  if viewer.position == 'socio' or viewer.position == 'salary_partner':
    if targetUser.position in ['socio', 'salary_partner'] or targetUser.isManagingPartner: return false
    return true
  if exists(supervisor_assignments WHERE supervisor_id=viewer.id AND employee_id=targetUser.id AND period=period): return true
  if exists(supervisor_assignments WHERE supervisor_id=viewer.id AND employee_id=targetUser.id) AND period is null: return true
  return false
```

---

## Evaluations

| # | Action | Employee | Supervisor | Socio | Admin | SuperUser | Implementation |
|---|--------|----------|------------|-------|-------|-----------|----------------|
| E1 | Read own evaluation | ✅ | ✅ | ✅ | ✅ | ✅ | `requireOwnershipOrRole('admin')` |
| E2 | Read supervisee evaluation | ❌ | ✅ | ✅ | ✅ | ✅ | `requireSupervisorOrRole('admin')` |
| E3 | Read all evaluations | ❌ | ❌ | ✅* | ✅ | ✅ | `requireRole('admin','socio')` + socio filter |
| E4 | Export CSV | ❌ | ❌ | ✅* | ✅ | ✅ | `requireRole('admin','socio')` + socio filter |
| E5 | Create self-evaluation | ✅ | ✅ | ✅ | ✅ | ✅ | validate: `evaluatorId == evaluatedId == req.user.id` |
| E6 | Create supervisor evaluation | ❌ | ✅** | ✅** | ✅ | ✅ | validate: `evaluatorId == req.user.id` + supervisor assignment check |
| E7 | Update own draft | ✅ | ✅ | ✅ | ✅ | ✅ | `requirePermission`: evaluator or admin |
| E8 | Update supervisee evaluation | ❌ | ✅** | ❌ | ✅ | ✅ | `requirePermission`: supervisor assignment check |
| E9 | Complete feedback | ❌ | ✅** | ❌ | ✅ | ✅ | `requireSupervisorOrRole('admin')` |
| E10 | Approve NA | ❌ | ✅** | ❌ | ✅ | ✅ | `requireSupervisorOrRole('admin')` |

\* Socio cannot see other socios' or managing partner's evaluations  
\** Only for users they supervise in the evaluation period

---

## Evaluation Responses

Inherit visibility from parent evaluation. No separate access control.

---

## Objectives (personal_objectives)

| # | Action | Employee | Supervisor | Socio | Admin | SuperUser | Implementation |
|---|--------|----------|------------|-------|-------|-----------|----------------|
| O1 | Read own objectives | ✅ | ✅ | ✅ | ✅ | ✅ | `requireOwnershipOrRole('admin')` |
| O2 | Read all objectives | ❌ | ❌ | ✅ | ✅ | ✅ | `requireRole('admin','socio')` + filter |
| O3 | Create own objectives | ✅ | ✅ | ✅ | ✅ | ✅ | validate: `userId == req.user.id` or admin |
| O4 | Create for others | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` |
| O5 | Submit own objectives | ✅ | ✅ | ✅ | ✅ | ✅ | `requireOwnershipOrRole('admin')` |
| O6 | Review/approve objectives | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` |

---

## Action Plans

| # | Action | Employee | Supervisor | Socio | Admin | SuperUser | Implementation |
|---|--------|----------|------------|-------|-------|-----------|----------------|
| AP1 | Read own plan | ✅ | ✅ | ✅ | ✅ | ✅ | `requireOwnershipOrRole('admin')` on `employee_id` |
| AP2 | Read supervisee plan | ❌ | ✅ | ✅ | ✅ | ✅ | `requireSupervisorOrRole('admin')` on `employee_id` |
| AP3 | Read all plans | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` |
| AP4 | Create plan | ❌ | ✅** | ❌ | ✅ | ✅ | validate: `supervisorId == req.user.id` or admin |
| AP5 | Update own plan | ✅ | ✅** | ❌ | ✅ | ✅ | `requirePermission`: employee or supervisor or admin |
| AP6 | Approve/reject plan | ❌ | ✅** | ❌ | ✅ | ✅ | `requireSupervisorOrRole('admin')` on `employee_id` |

\** Only for employees they supervise in the current period

---

## Vacation Requests

| # | Action | Employee | Supervisor | Socio | Admin | SuperUser | Implementation |
|---|--------|----------|------------|-------|-------|-----------|----------------|
| V1 | Read own requests | ✅ | ✅ | ✅ | ✅ | ✅ | `requireOwnershipOrRole('admin')` on `user_id` |
| V2 | Read supervisee requests | ❌ | ✅ | ❌ | ✅ | ✅ | `requireSupervisorOrRole('admin')` on `user_id` |
| V3 | Read all requests | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` |
| V4 | Create own request | ✅ | ✅ | ✅ | ✅ | ✅ | validate: `userId == req.user.id` |
| V5 | Create for others | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` |
| V6 | Cancel own request | ✅ | ✅ | ✅ | ✅ | ✅ | `requireOwnershipOrRole('admin')` (status must be pending) |
| V7 | Approve/reject | ❌ | ✅** | ❌ | ✅ | ✅ | `requireSupervisorOrRole('admin')` on `user_id` |
| V8 | View config | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` |
| V9 | Update config | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` |
| V10 | Add extra days | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` |

\** Only for employees they supervise

---

## Supervisor Assignments

| # | Action | Employee | Supervisor | Socio | Admin | SuperUser | Implementation |
|---|--------|----------|------------|-------|-------|-----------|----------------|
| SA1 | Read own assignments | ✅ | ✅ | ✅ | ✅ | ✅ | All authenticated users |
| SA2 | Read all assignments | ❌ | ❌ | ✅ | ✅ | ✅ | `requireRole('admin','socio')` |
| SA3 | Create assignment | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` |
| SA4 | Delete assignment | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` |

---

## Users

| # | Action | Employee | Supervisor | Socio | Admin | SuperUser | Implementation |
|---|--------|----------|------------|-------|-------|-----------|----------------|
| U1 | Read own profile | ✅ | ✅ | ✅ | ✅ | ✅ | `requireSelfOrAdmin` |
| U2 | Read supervisee profile | ✅ | ✅ | ✅ | ✅ | ✅ | assignment check (existing) |
| U3 | Read all profiles | ❌ | ❌ | ✅* | ✅ | ✅ | `requireRole('admin','socio')` + filter |
| U4 | Create user | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` |
| U5 | Update profile | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` |
| U6 | Update own name/email | ✅ | ✅ | ✅ | ✅ | ✅ | `requireSelfOrAdmin` |
| U7 | Update roles | ❌ | ❌ | ❌ | ✅* | ✅ | `requireRole('admin')` (super_user only by super_user) |
| U8 | Deactivate user | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` |

\* Socio cannot see other socios or managing partner

---

## Announcements

| # | Action | Employee | Supervisor | Socio | Admin | SuperUser | Implementation |
|---|--------|----------|------------|-------|-------|-----------|----------------|
| AN1 | Read (by audience) | ✅ | ✅ | ✅ | ✅ | ✅ | All authenticated (existing filter) |
| AN2 | Create | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` (existing) |
| AN3 | Update | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` (existing) |
| AN4 | Archive | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` (existing) |
| AN5 | Mark read | ✅ | ✅ | ✅ | ✅ | ✅ | All authenticated (existing) |

---

## Periods (period_configs)

| # | Action | Employee | Supervisor | Socio | Admin | SuperUser | Implementation |
|---|--------|----------|------------|-------|-------|-----------|----------------|
| P1 | Read | ✅ | ✅ | ✅ | ✅ | ✅ | All authenticated (existing) |
| P2 | Create/update | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` (existing) |

---

## Timeline

| # | Action | Employee | Supervisor | Socio | Admin | SuperUser | Implementation |
|---|--------|----------|------------|-------|-------|-----------|----------------|
| T1 | Read own timeline | ✅ | ✅ | ✅ | ✅ | ✅ | existing |
| T2 | Read any timeline | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` (existing) |
| T3 | Create event | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` (existing) |
| T4 | Update event | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` (existing) |
| T5 | Delete event | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` (existing) |

---

## Evaluation Config (categories, weights, templates, questions, positions)

| # | Action | Employee | Supervisor | Socio | Admin | SuperUser | Implementation |
|---|--------|----------|------------|-------|-------|-----------|----------------|
| EC1 | Read | ✅ | ✅ | ✅ | ✅ | ✅ | All authenticated (existing) |
| EC2 | Create/update/delete | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` (existing) |
| EC3 | Reseed | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` (existing) |

---

## Copilot

| # | Action | Employee | Supervisor | Socio | Admin | SuperUser | Implementation |
|---|--------|----------|------------|-------|-------|-----------|----------------|
| CP1 | Access | ❌ | ❌ | ❌ | ❌ | ✅ | `requireSuperUser` (existing) |
| CP2 | Configure | ❌ | ❌ | ❌ | ❌ | ✅ | `requireSuperUser` (existing) |
| CP3 | Chat | ❌ | ❌ | ❌ | ❌ | ✅ | `requireSuperUser` (existing) |

---

## System

| # | Action | Employee | Supervisor | Socio | Admin | SuperUser | Implementation |
|---|--------|----------|------------|-------|-------|-----------|----------------|
| SY1 | Read status | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` (existing) |
| SY2 | Toggle status | ❌ | ❌ | ❌ | ❌ | ✅ | `requireSuperUser` (existing) |
| SY3 | Read modules | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole('admin')` (existing) |
| SY4 | Update modules | ❌ | ❌ | ❌ | ❌ | ✅ | `requireSuperUser` (existing) |

---

## Health

| # | Action | Employee | Supervisor | Socio | Admin | SuperUser | Implementation |
|---|--------|----------|------------|-------|-------|-----------|----------------|
| H1 | Health check | Unauthenticated | Unauthenticated | Unauthenticated | Unauthenticated | Unauthenticated | Public (existing) |
| H2 | Stats | ❌ | ❌ | ❌ | ✅ | ✅ | **ADD authMiddleware** |

---

## Middleware Mapping

| Middleware | When to Use |
|------------|-------------|
| `requireRole('admin')` | Admin-only actions (CRUD config, manage users) |
| `requireRole('admin', 'socio')` | Admin or Socio visibility (with socio filter) |
| `requireRole('super_user')` | SuperUser-only (system config, copilot) |
| `requireOwnershipOrRole('admin')` | Self-access or admin (view own profile, own data) |
| `requireSupervisorOrRole('admin')` | Supervisor access or admin (evaluations, action plans, vacations) |
| `requirePermission(fn)` | Complex checks (evaluation ownership, period-aware supervisor) |

## Socio Filter

When `requireRole('admin', 'socio')` is used for list endpoints, the response must be filtered:

```typescript
if (user.position === 'socio' || user.position === 'salary_partner') {
  // Exclude: users where position is 'socio', 'salary_partner', or isManagingPartner
  results = results.filter(r => 
    r.position !== 'socio' && 
    r.position !== 'salary_partner' && 
    !r.isManagingPartner
  );
}
```

## Period-Aware Supervisor Checks

For `requireSupervisorOrRole`, the middleware accepts an optional `period` query parameter. When period is provided, the check is:

```sql
SELECT id FROM supervisor_assignments 
WHERE supervisor_id = ? AND employee_id = ? AND period = ?
```

When period is not provided:

```sql
SELECT id FROM supervisor_assignments 
WHERE supervisor_id = ? AND employee_id = ?
```

This allows supervisors to access historical data from periods they were assigned.
