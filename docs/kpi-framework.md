# Executive KPI Framework

## People KPIs

| KPI | Definition | Source | Frequency |
|---|---|---|---|
| Active Employees | Count of users where is_active=1 and is_super_user=0 | users | Real-time |
| New Employees | Count of users created in current period | users.created_at | Period |
| Inactive Employees | Count of users where is_active=0 | users | Real-time |
| Supervisor Coverage | % of employees with at least one supervisor assignment | supervisor_assignments / users | Period |
| Supervisor Ratio | Average number of direct reports per supervisor | supervisor_assignments | Period |
| Position Distribution | Count of employees by position level | users.position | Period |

---

## Performance KPIs

| KPI | Definition | Source | Frequency |
|---|---|---|---|
| Evaluations Completed | Count of evaluations with completed_at IS NOT NULL | evaluations | Period |
| Evaluations Pending | Count of evaluations with completed_at IS NULL | evaluations | Period |
| Completion Rate | % of assigned employees with completed supervisor evaluation | evaluations / supervisor_assignments | Period |
| Average Score (Self) | AVG(total_score) WHERE type=self AND completed | evaluations | Period |
| Average Score (Supervisor) | AVG(total_score) WHERE type=supervisor AND completed | evaluations | Period |
| Average Score (Overall) | AVG(total_score) WHERE completed | evaluations | Period |
| Self-Supervisor Score Gap | Difference between self and supervisor average scores | evaluations | Period |
| Score by Department | Average score grouped by practice_area | evaluations + users | Period |
| Score by Position Level | Average score grouped by position | evaluations + users | Period |
| Feedback Completion Rate | % of completed supervisor evals with feedback_completed=1 | evaluations | Period |
| NA Approval Rate | % of evaluations with NA approvals | evaluation_na_approvals | Period |

---

## Objectives KPIs

| KPI | Definition | Source | Frequency |
|---|---|---|---|
| Objectives Created | Count of personal_objectives in period | personal_objectives | Period |
| Objectives Submitted | Count with status='submitted' | personal_objectives | Period |
| Objectives Approved | Count with status='approved' | personal_objectives | Period |
| Objectives Rejected | Count with status='rejected' | personal_objectives | Period |
| Completion Rate | % of created objectives that are approved | personal_objectives | Period |

---

## Action Plan KPIs

| KPI | Definition | Source | Frequency |
|---|---|---|---|
| Action Plans Created | Count of action_plans in period | action_plans | Period |
| Action Plans Approved | Count with approval_status='approved' | action_plans | Period |
| Action Plans Rejected | Count with approval_status='rejected' | action_plans | Period |
| Action Plans Pending | Count with approval_status='pending' | action_plans | Period |
| Smart Items Created | Count of smart_action_items per plan | smart_action_items | Period |
| Average Items Per Plan | AVG smart items per action plan | smart_action_items | Period |
| Closure Rate | % of approved plans with all items completed | smart_action_items | Period |

---

## Vacation KPIs

| KPI | Definition | Source | Frequency |
|---|---|---|---|
| Requests Submitted | Count of vacation_requests | vacation_requests | Period |
| Requests Approved | Count with status='approved' | vacation_requests | Period |
| Requests Rejected | Count with status='rejected' | vacation_requests | Period |
| Requests Pending | Count with status='pending' | vacation_requests | Period |
| Total Days Requested | SUM(days) across all requests | vacation_requests | Period |
| Average Request Duration | AVG(days) per request | vacation_requests | Period |
| Approval Rate | % of requests approved | vacation_requests | Period |
| Average Approval Time | AVG time between request and approval | vacation_requests | Period |

---

## System KPIs

| KPI | Definition | Source | Frequency |
|---|---|---|---|
| Login Success Count | Count of login_success events | authentication_audit | Daily |
| Login Failure Count | Count of login_failure events | authentication_audit | Daily |
| Unique Active Users | COUNT(DISTINCT user_id) with login_success | authentication_audit | Daily |
| Password Resets | Count of password_reset_request events | authentication_audit | Monthly |
| Account Activations | Count of activation events | authentication_audit | Monthly |
| Force Password Changes | Count of force_password_change events | authentication_audit | Monthly |
| Copilot Conversations | Count of copilot_conversations | copilot_conversations | Period |
| Copilot Messages | Count of copilot_messages | copilot_messages | Period |

---

## Trend KPIs (Period-over-Period)

| KPI | Definition | Calculation |
|---|---|---|
| Score Trend | Direction of average scores across periods | Compare current vs previous period avg_overall_score |
| Completion Rate Trend | Direction of evaluation completion | Compare current vs previous period completion_rate |
| Employee Count Trend | Change in active employee count | Current - previous period total_employees |
| Feedback Gap Trend | Change in feedback completion gap | Current vs previous (supervisor_completed - feedback_completed) |
| Action Plan Closure Trend | Change in action plan approval rate | Current vs previous period approval_rate |

---

## Role-Specific KPI Views

### Super User / Admin
All KPIs above. Full visibility. No filtering.

### Socio
All KPIs above. Read-only. No modification metrics.

### Supervisor
- People: only direct reports
- Performance: only evaluations involving supervisees
- Objectives: only own supervisees' objectives
- Action Plans: only own supervisees' action plans
- Vacations: only own supervisees' requests
- System: own login activity only

### Employee
- People: own profile only
- Performance: own evaluations only
- Objectives: own objectives only
- Action Plans: own action plans only
- Vacations: own requests only
- System: own login activity only
