# Vacation Security Model — SMPS Performance Compass

## Current State

The vacation module is barely used in production (0 requests, 0 approvals in the database). However, the code exists and needs proper authorization.

## Entity: vacation_requests

| Field | Description |
|-------|-------------|
| id | UUID |
| user_id | Employee who requested |
| start_date | Start of vacation |
| end_date | End of vacation |
| days | Number of days |
| reason | Optional reason |
| status | pending / approved / rejected |
| period | Evaluation period |
| approvals | Array of approval records |

## Entity: vacation_approvals

| Field | Description |
|-------|-------------|
| id | UUID |
| vacation_request_id | FK to request |
| approver_id | Who approved/rejected |
| approved_at | Timestamp |
| action | approved / rejected |
| comment | Optional comment |

## Entity: vacation_config

Days per position (e.g., socio: 20, asociado_jr: 10). Admin-managed.

## Entity: extra_vacation_days

Additional days granted by admin to a specific user for a specific period.

## Who May Request Vacation

| Who | Can Create | Notes |
|-----|-----------|-------|
| Employee | ✅ For self only | `userId` must be `req.user.id` |
| Supervisor | ❌ Cannot create for others | Even if they supervise the employee |
| Admin | ✅ Can create for any user | Only admin-level should do this |
| SuperUser | ✅ Can create for any user | |

**Current vulnerability**: Any authenticated user can create a vacation request for any other user by setting `userId` in the request body.

## Who May View Requests

| Who | Can View | Notes |
|-----|----------|-------|
| Employee | ✅ Own requests only | |
| Supervisor | ✅ Own + supervisees' requests | In the current period |
| Admin / SuperUser | ✅ All requests | Filtered by query params |

**Current vulnerability**: `GET /api/vacations/requests` returns ALL requests regardless of the viewer's role.

## Who May Update Request Status

| Who | Can Change Status | Notes |
|-----|-------------------|-------|
| The requester | ✅ Cancel (delete) own pending request only | Cannot approve/reject |
| Assigned supervisor | ✅ Approve or reject | For their supervisees' requests only |
| Admin / SuperUser | ✅ Approve or reject | Any request |

**Current vulnerability**: `PATCH /api/vacations/requests/:id` allows any user to change status. `POST /api/vacations/requests/:id/approve` allows any user to approve any request.

## Who May Approve/Reject

| Who | Can Approve | Notes |
|-----|-------------|-------|
| Assigned supervisor | ✅ | Only for their direct reports |
| Admin / SuperUser | ✅ | Any request |
| Anyone else | ❌ | |

**Current vulnerability**: No check that the approver is actually the employee's supervisor.

## Who May View Vacation Config

| Who | Can View | Notes |
|-----|----------|-------|
| Admin / SuperUser | ✅ | Configuration only |
| Anyone else | ❌ | Internal config |

**Current implementation**: Correctly restricted to admin.

## Who May View Extra Days

| Who | Can View | Notes |
|-----|----------|-------|
| Admin / SuperUser | ✅ | Can add and view |
| Employee | ✅ Own extra days only | Should be visible in profile |
| Anyone else | ❌ | |

**Current implementation**: No endpoint to view own extra days. Admin can add but no read endpoint exists for employees.

## Vacation Balance Calculation

Currently, vacation balance is calculated on the frontend by:
1. Getting the base days from `vacation_config` for the employee's position
2. Adding `extra_vacation_days` for the employee and period
3. Subtracting approved vacation days for the period

There is no server-side endpoint for balance calculation. This is a business logic gap — a user could potentially manipulate the frontend to show incorrect balances.

**Recommendation**: Add a `GET /api/vacations/balance?userId=X&period=Y` endpoint that computes balance server-side.

## Multi-Supervisor Approval Model

The system does not currently have a concept of "all supervisors must approve" or "any supervisor can approve". The first supervisor to approve/reject sets the status.

**Recommendation**: For now, keep single-approval model (first supervisor wins). If multi-approval is needed later, add an `approval_required` count to `vacation_config` or per-assignment.
