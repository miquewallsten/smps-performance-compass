# Business Access Model — SMPS Performance Compass

## 1. Employee Workflow

An **employee** is any active user who is not an admin, super_user, or managing partner. Their position can be anything from pasante to socio (regular partner).

### What an employee does:

1. **Self-Evaluation**: Completes their own self-evaluation during the self-evaluation phase
2. **View own evaluations**: Sees their own self and supervisor evaluation results
3. **View their supervisor's name**: Knows who evaluates them
4. **Personal Objectives**: Creates and submits their own objectives
5. **Action Plans**: Views their own action plan (created by their supervisor)
6. **Vacations**: Requests and tracks their own vacation days
7. **Announcements**: Reads announcements targeted at their level
8. **My Profile**: Views their own evaluation results, timeline, and supervisor assignments

### What an employee CANNOT do:

- View other employees' evaluations (except through supervisor role)
- View reports or score analysis
- Manage users, positions, work areas, or locations
- Access copilot
- Change system configuration
- Approve action plans, objectives, or vacations
- Export evaluation data

---

## 2. Supervisor Workflow

A **supervisor** is an employee who has been assigned supervisees via `supervisor_assignments`. This is a role assigned per period, not a system role.

### What a supervisor does (in addition to employee actions):

1. **Evaluate direct reports**: Completes supervisor evaluations for assigned employees
2. **View direct reports' evaluations**: Sees evaluation results for their supervisees
3. **Complete feedback**: Marks feedback sessions as complete for their supervisees
4. **Approve NA**: Approves "Not Applicable" flags on questions for their supervisees
5. **View action plans**: Sees action plans for their supervisees
6. **Approve action plans**: Approves or rejects action plans for their supervisees
7. **View supervisee objectives**: Can review objectives of their direct reports
8. **Approve vacations**: Can approve/reject vacation requests from their supervisees

### Important rules observed from the frontend code:

- A supervisor only sees supervisees assigned **in the current period** (`assignments.filter(a => a.supervisorId === currentUser.id && a.period === currentPeriod)`)
- The `isSupervisor` check is a function that checks the current period's assignments
- A supervisor can see comments on evaluations they authored (supervisorComments)
- A supervisor CANNOT see other supervisors' evaluation details for the same employee unless they are also admin/socio

### What a supervisor CANNOT do:

- See evaluations for employees they don't supervise (unless admin/socio)
- Modify evaluations they didn't author
- Access system configuration
- Access copilot

---

## 3. Socio (Partner) Workflow

A **socio** (regular partner, not managing partner) has elevated visibility but limited management.

### What a socio does (in addition to supervisor actions):

1. **View all evaluations**: Can see evaluations for all employees except other socios and the managing partner (frontend visibility rule: `canViewUserEvaluations`)
2. **Export CSV**: Can export evaluation data
3. **View reports and score analysis**: Can access the Reports and Score Analysis pages
4. **View org chart**: Can see the organizational structure
5. **View personal objectives**: Can see all objectives (frontend: `isAdminOrSocio` check)

### What a socio CANNOT do:

- See evaluations of other socios or the managing partner
- Manage users or system configuration
- Access copilot
- Change roles
- Approve vacations system-wide

### Critical visibility rule from `visibility.ts`:

```typescript
if (viewer.position === 'socio') {
  if (target.isManagingPartner) return false;  // cannot see managing partner's evals
  if (target.position === 'socio') return false;  // cannot see other socios' evals
  if (target.position === 'salary_partner') return false;  // cannot see salary partners' evals
  return true;  // can see everyone else's evals
}
```

---

## 4. Admin (Usuario Administrador) Workflow

An **admin** has full management access to the evaluation system but cannot access system-level configuration.

### What an admin does (in addition to all above):

1. **Manage users**: Create, update, deactivate users
2. **Assign supervisors**: Create and delete supervisor assignments
3. **Configure evaluations**: Manage templates, questions, categories, weights, score labels
4. **Manage periods**: Create and configure evaluation periods
5. **Manage positions, work areas, locations**: Full CRUD
6. **View all evaluations**: No visibility restrictions
7. **Export evaluation data**
8. **View all reports**
9. **Access Control**: Can see user management, supervisor assignments, evaluation templates
10. **Announcements**: Create and manage announcements
11. **Vacations**: Approve any vacation request, configure vacation days
12. **Action Plans**: Create and approve action plans for any employee
13. **Objectives**: Review and approve objectives for any employee
14. **Timeline**: View any user's timeline

### What an admin CANNOT do:

- Access system status toggle (activate/deactivate)
- Change module configuration (evaluations, communications, vacations, copilot)
- Access copilot
- View activation history
- Promote users to super_user
- Create more admin users beyond the configured maximum (default 3)

### Maximum admin limit:

From `system_status.max_admin_users` (default 3). Enforced in the `PATCH /api/users/:id/role` route.

---

## 5. SuperUser Workflow

A **super_user** has unrestricted access to everything.

### What a super_user does (in addition to all admin actions):

1. **System configuration**: Toggle system active/inactive status
2. **Module configuration**: Enable/disable evaluations, communications, vacations, copilot
3. **Copilot access**: Full access to the AI copilot with all tools
4. **Role management**: Can promote users to super_user (with self-demotion protection)
5. **System initialization**: First-run setup
6. **Timeline backfill**: Can trigger historical timeline creation
7. **Activation history**: Can view system activation/deactivation log

### What a super_user CANNOT do:

- Demote themselves (enforced in code)
- There is no other restriction

---

## Managing Partner vs Admin

The `managing_partner` role is a single user (enforced: max 1) who is automatically also an admin. In the role hierarchy:

```
getRole(user) {
  if (user.isSuperUser) return 'super_user';
  if (user.isAdmin || user.isManagingPartner) return 'admin';  // managing_partner IS admin
  return 'user';
}
```

The managing partner gets all admin privileges PLUS:
- The Socio Administrador label in the UI
- Visibility of all users' evaluations (frontend: `isManagingPartner` flag)
- Cannot have their admin role removed without first removing the managing partner role

---

## Evaluation Period Phases

The system enforces time-based phases for evaluation periods:

| Phase | Dates | Who Acts |
|-------|-------|----------|
| Self-Evaluation | self_start → self_end | Employee completes own evaluation |
| Supervisor Evaluation | supervisor_start → supervisor_end | Supervisor evaluates their team |
| Feedback Session | feedback_start → feedback_end | Supervisor and employee discuss results |
| Action Plan | action_plan_start → action_plan_end | Supervisor creates action plan |

The frontend uses `period_configs` to determine the current phase and conditionally shows/hides UI elements. The backend **does not enforce phase timing** — it's enforced client-side only.

---

## Module Toggle System

Modules can be enabled/disabled by super_user via `module_config`:

| Module | Affects | Default |
|--------|---------|---------|
| evaluations | Self-evaluation, evaluation, reports visibility | ON |
| communications | Announcements | ON |
| vacations | Vacation requests and approvals | ON |
| copilot | AI copilot chat (super_user only) | ON |

The backend only checks module config for the copilot route. Other modules rely on frontend hiding.
