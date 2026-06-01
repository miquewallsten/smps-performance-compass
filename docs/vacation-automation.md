# Vacation Automation

## Event-Driven Notifications (IMPLEMENTED)

| Trigger | When | Recipient | Type | Implementation |
|---|---|---|---|---|
| Request submitted | POST /api/vacations/requests | Assigned supervisor(s) | approval_required | vacations.ts ✅ |
| Request approved | POST /api/vacations/requests/:id/approve | Employee | info | vacations.ts ✅ |
| Request rejected | POST /api/vacations/requests/:id/approve | Employee | warning | vacations.ts ✅ |

## Scheduled Reminders

| Trigger | Timing | Recipient | Type |
|---|---|---|---|
| Vacation approval overdue | 3 days after submission | Supervisor | reminder |
| Upcoming leave | 1 day before start_date | Employee + Supervisor | reminder |

**Implementation:** Vacation approval reminders are in `notification-scheduler.ts`. Upcoming leave reminders are NOT yet implemented.
