# Objective Automation

## Event-Driven Notifications

| Trigger | When | Recipient | Type | Implementation |
|---|---|---|---|---|
| Objectives created | POST /api/objectives | Assigned supervisor | info | Route handler |
| Objectives submitted | POST /api/objectives/:id/submit | Assigned supervisor | approval_required | Route handler |
| Objectives approved | POST /api/objectives/:id/review | Employee | info | Route handler |
| Objectives rejected | POST /api/objectives/:id/review | Employee | warning | Route handler |

## Scheduled Reminders

| Trigger | Timing | Recipient | Type |
|---|---|---|---|
| Objective review pending | 7 days after submission | Supervisor | reminder |

**Note:** Objective reminders are not yet implemented in the scheduler. They can be added to `notification-scheduler.ts` when needed. Current volume is low (0 objectives in production).

## Implementation Status

Event-driven notifications for objectives are NOT yet wired into `server/routes/objectives.ts`. This is a pending task — the notification service is ready, just needs trigger code to be added to the objectives route handlers.
