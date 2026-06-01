# Action Plan Automation

## Event-Driven Notifications (IMPLEMENTED)

| Trigger | When | Recipient | Type | Implementation |
|---|---|---|---|---|
| Plan created | POST /api/action-plans | Supervisor | approval_required | evaluations.ts ✅ |
| Plan approved | POST /api/action-plans/:id/approve | Employee | info | action-plans.ts ✅ |
| Plan rejected | POST /api/action-plans/:id/approve | Employee | warning | action-plans.ts ✅ |

## Scheduled Reminders

| Trigger | Timing | Recipient | Type |
|---|---|---|---|
| Plan approval pending | 7 days before action_plan_end | Supervisor | reminder |
| Plan overdue | Past action_plan_end | Employee + Supervisor | warning |

**Implementation:** In `notification-scheduler.ts` — `checkEvaluationReminders()` also checks action plan deadlines.
