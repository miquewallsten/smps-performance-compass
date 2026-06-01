# Workflow Inventory

## 1. Evaluation Lifecycle

| Step | Trigger | Actor | Approver | Deadline | Escalation | Notification Opportunity |
|---|---|---|---|---|---|---|
| Period opens | period_configs.self_start reaches today | System | — | — | — | Notify all employees: "Self-evaluation period has started" |
| Self-eval assigned | Supervisor creates assignment | Supervisor | — | period_configs.self_end | Notify supervisor after 3 days | Notify employee: "Complete your self-evaluation by [date]" |
| Self-eval due soon | 7 days before self_end | System | — | self_end | — | Reminder to employee |
| Self-eval due soon | 3 days before self_end | System | — | self_end | Escalate to supervisor | Urgent reminder to employee |
| Self-eval overdue | Past self_end, no self eval | System | Supervisor | — | Escalate to admin | Alert employee + supervisor |
| Self-eval overdue | Every 7 days past deadline | System | — | — | Escalate if 14+ days | Repeated reminder |
| Self-eval completed | PUT /api/evaluations/:id with completed_at | Employee | — | — | — | Notify supervisor: "Ready for your evaluation" |
| Supervisor eval due soon | 7 days before supervisor_end | System | — | supervisor_end | — | Reminder to supervisor |
| Supervisor eval due soon | 3 days before supervisor_end | System | — | supervisor_end | Escalate | Urgent reminder to supervisor |
| Supervisor eval overdue | Past supervisor_end | System | Admin | — | Escalate to admin | Alert supervisor + admin |
| Supervisor eval completed | PUT /api/evaluations/:id | Supervisor | — | — | — | Notify employee: "Supervisor evaluation completed" |
| Feedback session due | Supervisor eval completed | System | — | feedback_end | — | Notify supervisor: "Schedule feedback session" |
| Feedback due soon | 7 days before feedback_end | System | — | feedback_end | — | Reminder to supervisor |
| Feedback overdue | Past feedback_end | System | Admin | — | Escalate | Alert supervisor + admin |
| Feedback completed | PATCH /api/evaluations/:id/feedback | Supervisor | — | — | — | Notify employee: "Feedback session completed" |
| NA approval needed | Evaluation has not_applicable responses | System | Admin | — | — | Notify admin: "NA approval required" |
| NA approved | PATCH /api/evaluations/:id/na-approval | Admin | — | — | — | Notify employee + supervisor |

## 2. Objective Lifecycle

| Step | Trigger | Actor | Approver | Deadline | Escalation | Notification Opportunity |
|---|---|---|---|---|---|---|
| Objectives created | POST /api/objectives | Employee/Supervisor | — | — | — | Notify supervisor: "Objectives created, review pending" |
| Objectives submitted | POST /api/objectives/:id/submit | Employee | Supervisor | — | — | Notify supervisor: "Objectives submitted for review" |
| Objective review overdue | 7 days after submission, no review | System | Supervisor | — | Escalate to admin | Reminder to supervisor |
| Objective approved | POST /api/objectives/:id/review (approved) | Supervisor | — | — | — | Notify employee: "Your objectives have been approved" |
| Objective rejected | POST /api/objectives/:id/review (rejected) | Supervisor | — | — | — | Notify employee: "Objectives need revision" |

## 3. Action Plan Lifecycle

| Step | Trigger | Actor | Approver | Deadline | Escalation | Notification Opportunity |
|---|---|---|---|---|---|---|
| Plan created | POST /api/action-plans | Employee/Supervisor | Supervisor | — | — | Notify supervisor: "Action plan created, approval pending" |
| Plan approval pending | Plan with approval_status='pending' | System | Supervisor | — | — | Reminder after 3 days |
| Plan approved | POST /api/action-plans/:id/approve (approved) | Supervisor | — | — | — | Notify employee: "Your action plan has been approved" |
| Plan rejected | POST /api/action-plans/:id/approve (rejected) | Supervisor | — | — | — | Notify employee: "Action plan needs revision" |
| Action plan due soon | 7 days before action_plan_end | System | — | action_plan_end | — | Reminder to employee + supervisor |
| Action plan overdue | Past action_plan_end, plan not completed | System | Supervisor | — | Escalate to admin | Alert to all parties |

## 4. Vacation Lifecycle

| Step | Trigger | Actor | Approver | Deadline | Escalation | Notification Opportunity |
|---|---|---|---|---|---|---|
| Request submitted | POST /api/vacations/requests | Employee | Supervisor | — | — | Notify supervisor: "Vacation request pending approval" |
| Approval overdue | 3 days after submission, status='pending' | System | Supervisor | — | Escalate to admin | Reminder to supervisor |
| Request approved | POST /api/vacations/requests/:id/approve (approved) | Supervisor | — | — | — | Notify employee: "Your vacation has been approved" |
| Request rejected | POST /api/vacations/requests/:id/approve (rejected) | Supervisor | — | — | — | Notify employee: "Your vacation request was rejected" |
| Upcoming leave | 1 day before start_date | System | — | — | — | Reminder to employee + supervisor |
| Request cancelled | DELETE /api/vacations/requests/:id | Employee | — | — | — | Notify supervisor if request was pending |

## 5. User Onboarding Lifecycle

| Step | Trigger | Actor | Approver | Deadline | Escalation | Notification Opportunity |
|---|---|---|---|---|---|---|
| Account created | POST /api/users (with activation) | Admin | — | — | — | Activation email sent to user |
| Activation pending | 48 hours after creation, not activated | System | — | — | Notify admin | Reminder to user, alert admin |
| Account activated | POST /api/auth/activate | User | — | — | — | Welcome notification in app |
| Password reset requested | POST /api/auth/request-password-reset | User | — | Token expiry (1hr) | — | Reset email sent |
| Password reset completed | POST /api/auth/complete-password-reset | User | — | — | — | Confirmation notification |
| Force password change | Admin resets password | Admin | User | Next login | Escalate after 7 days | Notify user immediately |

---

## Summary of Notification Touchpoints

| Workflow | Immediate | Reminder | Overdue | Approval | Status Change |
|---|---|---|---|---|---|
| Evaluation | 6 | 4 | 3 | 2 | 5 |
| Objectives | 3 | 1 | 1 | 1 | 2 |
| Action Plans | 3 | 1 | 1 | 1 | 2 |
| Vacations | 3 | 1 | 1 | 0 | 2 |
| Onboarding | 4 | 1 | 0 | 0 | 1 |
| **Total** | **19** | **8** | **6** | **4** | **12** |

**Estimated notification volume at 14 users:** ~10-20 per period (most are time-based, not event-based).
**Estimated notification volume at 100 users:** ~100-200 per period.
**Estimated notification volume at 1000 users:** ~1000-2000 per period.
