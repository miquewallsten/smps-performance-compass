# Evaluation Automation

## Automated Reminders

| Trigger | Timing | Recipient | Type | Channel |
|---|---|---|---|---|
| Self-eval period started | On period start | All employees | info | In-app |
| Self-eval due in 7 days | 7 days before self_end | Employees without self-eval | reminder | In-app + Email |
| Self-eval due in 3 days | 3 days before self_end | Employees without self-eval | reminder | In-app + Email |
| Self-eval overdue | On self_end | Employees without self-eval | warning | In-app + Email |
| Self-eval completed | On completion | Assigned supervisors | info | In-app |
| Supervisor eval due in 7 days | 7 days before supervisor_end | Supervisors with pending evals | reminder | In-app + Email |
| Supervisor eval due in 3 days | 3 days before supervisor_end | Supervisors with pending evals | reminder | In-app + Email |
| Supervisor eval overdue | On supervisor_end | Supervisors with pending evals | warning | In-app + Email |
| Supervisor eval completed | On completion | Evaluated employee | info | In-app |
| Feedback due in 7 days | 7 days before feedback_end | Supervisors without feedback | reminder | In-app + Email |
| Feedback due in 3 days | 3 days before feedback_end | Supervisors without feedback | reminder | In-app + Email |
| Feedback overdue | On feedback_end | Supervisors without feedback | warning | In-app + Email |
| Supervisor eval overdue 7+ days | 7 days past supervisor_end | Admins | escalation | In-app + Email |

## Implementation

**Scheduler:** `server/services/notification-scheduler.ts`
- `checkEvaluationReminders()` — runs hourly, generates reminders for 7d/3d/0d milestones
- `checkOverdueEscalations()` — runs hourly, escalates 7+ day overdue items to admins

**Event Triggers:** `server/routes/evaluations.ts`
- On PUT /:id (completion): notifies supervisor (self-eval) or employee (supervisor eval)
- On PATCH /:id/feedback: notifies employee
