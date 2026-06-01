# Supervisor Access Model — SMPS Performance Compass

## Current Implementation

### How supervisor assignments work

Supervisor assignments are stored in `supervisor_assignments` with `employee_id`, `supervisor_id`, and `period`. An employee can have multiple supervisors in a period (multi-supervisor model).

### Current supervisor visibility (from code analysis)

**Frontend** (`Evaluations.tsx`):

```typescript
const isSupervisor = (employeeId: string) => 
  assignments.some(a => a.supervisorId === currentUser.id && a.employeeId === employeeId);

// Regular employees: see only themselves + their supervisees
const viewableUsers = isAdminOrSocio
  ? users.filter(u => canViewUserEvaluations(currentUser, u))
  : users.filter(u => u.isActive && !u.isDummy && 
      (u.id === currentUser.id || myAssignments.some(a => a.employeeId === u.id)));
```

**Backend** (`users.ts`):

```typescript
// Regular users: fetch their assignments to determine visibility
const assignments = await db.all(
  'SELECT employee_id, supervisor_id FROM supervisor_assignments WHERE (employee_id = ? OR supervisor_id = ?)',
  [userId, userId]
);
const visibleIds = new Set([userId]);
for (const a of assignments) { visibleIds.add(a.employee_id); visibleIds.add(a.supervisor_id); }
const visibleUsers = activeUsers.filter(u => visibleIds.has(u.id));
```

## Current Visibility Rules

| Can See | Direct Reports | Indirect Reports | Historical Periods | Other Users |
|---------|---------------|-----------------|--------------------|-------------|
| Regular employee | ❌ | ❌ | ❌ | Only self |
| Supervisor | ✅ Current period only | ❌ | ❌ | Self + direct reports |
| Socio | ✅ All | ✅ All | ✅ All | All except other socios/MP |
| Admin | ✅ All | ✅ All | ✅ All | All |

## Problem Analysis

### Problem 1: No indirect report visibility

A supervisor who manages a mid-level manager cannot see the evaluations of that manager's team. Example:

```
Socio → Asociado Sr → Asociado Jr
```

If the Socio supervises the Asociado Sr, they can see the Asociado Sr's evaluation. But they cannot directly see the Asociado Jr's evaluation unless they are also assigned as a supervisor of the Asociado Jr.

**Current behavior**: This is partially handled by having multiple supervisor assignments (e.g., the Socio is assigned to both the Asociado Sr AND the Asociado Jr). The seed data confirms this pattern — Diego Ramírez has TWO supervisor assignments (one from each supervisor).

**Recommendation**: The current multi-assignment model is correct for this organization. Do NOT add transitive (indirect) visibility — it would complicate the model and create unwanted visibility paths.

### Problem 2: No historical period visibility for supervisors

When a new period starts, supervisors see their current assignments. But they cannot see which employees they supervised in previous periods unless they check the period filter.

**Current behavior**: The `GET /api/assignments` endpoint accepts an optional `period` query parameter. The frontend defaults to `currentPeriod`. Supervisors CAN view previous period assignments by changing the period filter.

**Recommendation**: This is acceptable. Keep current behavior.

### Problem 3: Supervisor cannot see evaluations from a different period

The `GET /api/evaluations` endpoint filters by period. A supervisor supervising an employee in 2026-H1 cannot see that employee's 2025-H2 evaluations unless they were also the supervisor in that period.

**Recommendation**: Keep current behavior. Historical visibility should be tied to the assignment period, not current assignments.

## Supervisor Access Rules (Definitive)

### What "supervisor of" means

A user U is a "supervisor of" employee E in period P if and only if there exists a row in `supervisor_assignments` where `supervisor_id = U.id AND employee_id = E.id AND period = P`.

### What a supervisor can see

| Data | Visibility |
|------|-----------|
| Employee's profile | ✅ For their direct reports in the current period |
| Employee's evaluations (current period) | ✅ For their direct reports |
| Employee's evaluations (other periods) | ✅ Only if they were also assigned in that period |
| Employee's action plans | ✅ For direct reports (any period they were supervisor) |
| Employee's objectives | ✅ Same as evaluations |
| Employee's vacation requests | ✅ For direct reports in the current period |
| Employee's timeline | ❌ (admin only) |
| Other supervisor's evaluations | ❌ Only admin/socio can see evaluations by other supervisors |

### What "current period" means

The current period is determined by `period_configs` sorted by period DESC, taking the most recent. The frontend uses `useCurrentPeriod()` hook which fetches all periods and picks the latest.

### Multi-supervisor model

An employee can have multiple supervisors in the same period. Each supervisor can:
- See the employee's evaluations
- Create supervisor evaluations
- Approve action plans
- Approve vacation requests

There is no "primary supervisor" concept. All assigned supervisors have equal access.

### Managing Partner special case

The managing partner (socio administrador) is automatically an admin. They can see all employees' data regardless of supervisor assignments, per the `isManagingPartner` flag.

## Recommendations

1. **Keep multi-assignment model** — it works for the org structure
2. **Add period-aware supervisor checks** to backend routes (currently missing)
3. **Do NOT add transitive visibility** — it creates unwanted access paths
4. **Add `requireSupervisorOrRole` middleware** for all supervisor-dependent routes
5. **Keep historical period filtering** as-is — supervisors see data for periods they were assigned
