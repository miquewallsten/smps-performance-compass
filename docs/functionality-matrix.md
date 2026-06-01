# SMPS PERFORMANCE COMPASS — FUNCTIONALITY MATRIX

Generated: 2026-06-01

---

## Status Legend
- ✅ **Working** — Feature functions correctly end-to-end
- ⚠️ **Partially Working** — Feature works but has known issues
- ❌ **Broken** — Feature does not function correctly
- 🔍 **Needs Verification** — Cannot confirm without runtime testing

---

| Feature | UI | API | DB | Status | Notes |
|---------|-----|-----|-----|--------|-------|
| **Login** | ✅ Login.tsx | ✅ POST /api/auth/login | ✅ users, sessions | ✅ Working | Email + password, JWT auth |
| **Logout** | ✅ Layout.tsx | ✅ POST /api/auth/logout | ✅ sessions | ✅ Working | JWT blocklist |
| **Session validation** | ✅ AuthContext | ✅ GET /api/auth/me | ✅ users | ✅ Working | Checks active user |
| **Account activation** | ✅ ActivateAccount.tsx | ✅ POST /api/auth/activate | ✅ users, password_reset_tokens | ✅ Working | Token-based activation |
| **Password reset** | ✅ ForgotPassword.tsx + ResetPassword.tsx | ✅ POST /api/auth/request-password-reset, POST /api/auth/complete-password-reset | ✅ password_reset_tokens | ✅ Working | Email-based reset flow |
| **Change password** | ✅ ChangePassword.tsx | ✅ POST /api/auth/change-password | ✅ users | ✅ Working | |
| **System initialization** | ✅ Setup.tsx | ✅ POST /api/system/init | ✅ system_status, users, work_areas, custom_positions | ✅ Working | First-time setup |
| **Users list** | ✅ UserManagement.tsx | ✅ GET /api/users | ✅ users | ✅ Working | Admin/socio only |
| **Create user** | ✅ UserManagement.tsx | ✅ POST /api/users | ✅ users | ✅ Working | Sends activation email |
| **Edit user** | ✅ UserManagement.tsx | ✅ PATCH /api/users/:id | ✅ users | ✅ Working | |
| **Deactivate user** | ✅ UserManagement.tsx | ✅ DELETE /api/users/:id | ✅ users | ✅ Working | Soft delete |
| **Reset user password** | ✅ UserManagement.tsx | ✅ POST /api/users/:id/reset-password | ✅ users | ✅ Working | |
| **Role management** | ✅ UserManagement.tsx | ✅ PATCH /api/users/:id/role | ✅ users | ✅ Working | |
| **Period management** | ✅ PeriodConfig.tsx | ✅ GET/POST /api/periods | ✅ period_configs | ✅ Working | |
| **Period selection** | ✅ useCurrentPeriod hook | ✅ GET /api/periods | ✅ period_configs | ⚠️ See Period Audit | Falls back to latest started period; 2026-H2 starts 2026-06-01 |
| **Evaluations list** | ✅ Evaluations.tsx | ✅ GET /api/evaluations | ✅ evaluations, evaluation_responses, evaluation_na_approvals | ✅ Working | Role-filtered |
| **Self-evaluation** | ✅ SelfEvaluation.tsx | ✅ POST /api/evaluations | ✅ evaluations, evaluation_responses | ✅ Working | Uses full-template endpoint |
| **Supervisor evaluation** | ✅ Evaluations.tsx | ✅ POST/PATCH /api/evaluations | ✅ evaluations, evaluation_responses | ✅ Working | |
| **Evaluation detail/viewer** | ✅ EvaluationViewer.tsx | ✅ GET /api/evaluations/:id | ✅ evaluations, evaluation_responses | ✅ Working | Shows NA approvals, scores |
| **Feedback completion** | ✅ Evaluations.tsx | ✅ PATCH /api/evaluations/:id/feedback | ✅ evaluations | ✅ Working | |
| **NA approval** | ✅ EvaluationViewer.tsx | ✅ PATCH /api/evaluations/:id/na-approval | ✅ evaluation_na_approvals | ✅ Working | |
| **Evaluation export CSV** | ✅ Evaluations.tsx (admin) | ✅ GET /api/evaluations/export/csv | ✅ evaluations | ✅ Working | Admin/socio only |
| **Assignments list** | ✅ AssignSupervisors.tsx | ✅ GET /api/assignments | ✅ supervisor_assignments | ✅ Working | Role-filtered |
| **Create assignment** | ✅ AssignSupervisors.tsx | ✅ POST /api/assignments | ✅ supervisor_assignments | ✅ Working | |
| **Delete assignment** | ✅ AssignSupervisors.tsx | ✅ DELETE /api/assignments/:id | ✅ supervisor_assignments | ✅ Working | |
| **Action plans list** | ✅ MyActionPlan.tsx | ✅ GET /api/action-plans | ✅ action_plans, smart_action_items | ✅ Working | |
| **Create action plan** | ✅ MyActionPlan.tsx | ✅ POST /api/action-plans | ✅ action_plans, smart_action_items | ✅ Working | |
| **Approve action plan** | ✅ MyActionPlan.tsx | ✅ POST /api/action-plans/:id/approve | ✅ action_plans | ✅ Working | |
| **Objectives list** | ✅ PersonalObjectives.tsx | ✅ GET /api/objectives | ✅ personal_objectives, admin_objectives, legal_objectives | ✅ Working | |
| **Create objectives** | ✅ PersonalObjectives.tsx | ✅ POST /api/objectives | ✅ personal_objectives, admin_objectives, legal_objectives | ✅ Working | |
| **Submit objectives** | ✅ PersonalObjectives.tsx | ✅ POST /api/objectives/:id/submit | ✅ admin_objectives | ✅ Working | |
| **Review objectives** | ✅ PersonalObjectives.tsx | ✅ POST /api/objectives/:id/review | ✅ admin_objectives | ✅ Working | |
| **Vacations list** | ✅ Vacations.tsx | ✅ GET /api/vacations/requests | ✅ vacation_requests, vacation_approvals | ✅ Working | |
| **Create vacation** | ✅ Vacations.tsx | ✅ POST /api/vacations/requests | ✅ vacation_requests | ✅ Working | |
| **Approve vacation** | ✅ Vacations.tsx | ✅ POST /api/vacations/requests/:id/approve | ✅ vacation_requests, vacation_approvals | ✅ Working | |
| **Vacation config** | ✅ Vacations.tsx (admin) | ✅ GET/PATCH /api/vacations/config | ✅ vacation_config | ✅ Working | |
| **Extra vacation days** | ✅ Vacations.tsx (admin) | ✅ POST /api/vacations/extra-days | ✅ extra_vacation_days | ✅ Working | |
| **Dashboard** | ✅ Dashboard.tsx | ✅ GET /api/analytics/overview, /api/notifications/pending-actions | ✅ analytics_* | ⚠️ Partially Working | Depends on period with data; 2026-H2 may show empty if no data yet |
| **Reports** | ✅ Reports.tsx | ✅ GET /api/analytics/evaluations, trends, objectives, vacations, action-plans | ✅ analytics_*, evaluations | ⚠️ Partially Working | Depends on period with data |
| **Score Analysis** | ✅ ScoreAnalysis.tsx | ✅ GET /api/evaluations, /api/users | ✅ evaluations | ⚠️ Partially Working | Depends on period with data |
| **Org Chart** | ✅ OrgChart.tsx | ✅ GET /api/users, /api/assignments | ✅ users, supervisor_assignments | ✅ Working | Admin/socio/super_user only |
| **Notifications** | ✅ Notifications.tsx, NotificationBell.tsx | ✅ GET/PATCH/POST /api/notifications | ✅ notifications | ✅ Working | In-app + email delivery |
| **Notification preferences** | ✅ NotificationPreferences.tsx | ✅ GET/PATCH /api/notifications/preferences | ✅ notification_preferences | ✅ Working | |
| **Communications** | ✅ Communications.tsx | ✅ GET/POST/PATCH /api/announcements | ✅ announcements, announcement_reads | ✅ Working | |
| **Access Control** | ✅ AccessControl.tsx | ✅ GET/PATCH /api/system/status, /api/system/modules | ✅ system_status, module_config | ✅ Working | Super_user only |
| **Copilot** | ✅ CopilotChat.tsx | ✅ /api/copilot/* | ✅ copilot_conversations, copilot_messages | ✅ Working | Super_user + module enabled |
| **Position Management** | ✅ PositionManagement.tsx | ✅ GET/POST/PATCH/DELETE /api/positions, /api/work-areas | ✅ custom_positions, work_areas | ✅ Working | Admin only |
| **User Timeline** | ✅ UserTimeline.tsx | ✅ GET/POST/PATCH/DELETE /api/users/:id/timeline | ✅ user_timeline | ✅ Working | |
| **My Profile** | ✅ MyProfile.tsx | ✅ GET /api/users/:id, /api/evaluations, /api/objectives, /api/assignments | ✅ users, evaluations, objectives | ✅ Working | |
| **Evaluation templates** | ✅ EvaluationTemplates.tsx | ✅ /api/evaluation-config/* | ✅ template_questions, section_weights, evaluation_categories | ✅ Working | |
| **Question library** | ✅ QuestionLibrary.tsx | ✅ /api/evaluation-config/library/* | ✅ question_library | ✅ Working | |
| **Period end alert** | ✅ PeriodEndAlert.tsx | ✅ GET /api/periods | ✅ period_configs | ✅ Working | Shows alert 60 days before period end |

---

## PERIOD SYSTEM STATUS

| Component | Implementation | Status | Notes |
|-----------|---------------|--------|-------|
| Period config CRUD | ✅ GET/POST /api/periods | ✅ Working | Admin creates/updates periods |
| Period selector | ✅ useCurrentPeriod hook | ⚠️ Needs audit | Determines "current" period; may select 2026-H2 on 2026-06-01 |
| Period in evaluations | ✅ useCurrentPeriod → API filter | ⚠️ May show empty | Evaluations filtered by period; 2026-H2 likely has no data |
| Period in assignments | ✅ useCurrentPeriod → API filter | ⚠️ May show empty | Assignments filtered by period |
| Period in dashboard | ✅ useCurrentPeriod → analytics API | ⚠️ May show empty | Dashboard uses currentPeriod for all queries |
| Period in org chart | ✅ useCurrentPeriod → assignments API | ⚠️ May show empty | Shows assignments for current period |
| Default fallback | ✅ Falls back to latest started period | ⚠️ Critical | 2026-H2 self_start is 2026-06-01 = today |

---

## AUTHORIZATION STATUS

| Role | Pages Accessible | API Access | Status |
|------|-----------------|-----------|--------|
| **super_user** | All pages + Access Control + Copilot | All endpoints | ✅ Working |
| **admin (is_admin)** | Most pages except Access Control + Copilot | All user-facing endpoints | ✅ Working |
| **socio (position=socio)** | Dashboard, Evaluations, Reports, Org Chart | Own + supervisees + all (with socio visibility rules) | ✅ Working |
| **managing_partner** | Most admin pages | Same as admin | ✅ Working |
| **employee** | Dashboard, Self-Eval, My Profile, Vacations, Objectives, Action Plans | Own + supervisees' data | ✅ Working |
| **supervisor** | Dashboard + evaluatees' data | Own + supervisees' data | ✅ Working |

