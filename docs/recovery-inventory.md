# SMPS PERFORMANCE COMPASS — RECOVERY INVENTORY

Generated: 2026-06-01

---

## FRONTEND PAGES

| Page | Route | Component | Hooks Used | API Endpoints | Status |
|------|-------|-----------|------------|---------------|--------|
| Dashboard | `/dashboard` | `Dashboard.tsx` | `useAuth`, `useAnalyticsOverview`, `useAnalyticsEvaluations`, `usePendingActions`, `useUnreadNotificationCount`, `useCurrentPeriod` | `GET /api/analytics/overview?period=`, `GET /api/analytics/evaluations?period=`, `GET /api/notifications/pending-actions?period=`, `GET /api/notifications/count` | Working — depends on period with data |
| Self Evaluation | `/self-evaluation` | `SelfEvaluation.tsx` | `useAuth`, `useEvaluations`, `useAssignments`, `useActionPlans`, `useCreateEvaluation`, `useCurrentPeriod`, `useFullTemplate` | `GET /api/evaluations`, `GET /api/assignments?period=`, `GET /api/action-plans`, `POST /api/evaluations`, `GET /api/evaluation-config/full-template/:position` | Working |
| Evaluations | `/evaluations` | `Evaluations.tsx` | `useUsers`, `useEvaluations`, `useAssignments`, `useCreateEvaluation`, `useUpdateEvaluation`, `useCompleteFeedback`, `useApproveNA`, `useActionPlans`, `useCreateActionPlan`, `useExportEvaluationsCSV`, `usePeriods`, `useCurrentPeriod`, `useTemplateQuestions`, `useFullTemplate` | `GET /api/evaluations`, `GET /api/users`, `GET /api/assignments`, `GET /api/evaluation-config/template-questions`, `PATCH /api/evaluations/:id`, `PATCH /api/evaluations/:id/feedback`, `PATCH /api/evaluations/:id/na-approval`, `POST /api/action-plans`, `GET /api/evaluations/export/csv` | Working |
| Reports | `/reports` | `Reports.tsx` | `useAuth`, `useAnalyticsEvaluations`, `useAnalyticsObjectives`, `useAnalyticsVacations`, `useAnalyticsActionPlans`, `useAnalyticsTrends`, `useCurrentPeriod` | `GET /api/analytics/evaluations?period=`, `GET /api/analytics/objectives?period=`, `GET /api/analytics/vacations`, `GET /api/analytics/action-plans?period=`, `GET /api/analytics/trends` | Working — depends on period with data |
| Score Analysis | `/score-analysis` | `ScoreAnalysis.tsx` | `useAuth`, `useUsers`, `useEvaluations`, `usePeriods`, `useCurrentPeriod` | `GET /api/users`, `GET /api/evaluations`, `GET /api/periods` | Working — depends on period with data |
| User Management | `/users` | `UserManagement.tsx` | `useAuth`, `useUsers`, `useEvaluations`, `useUpdateUser`, `useResetUserPassword`, `useCreateUser`, `useDeleteUser`, `useSystemStatus`, `useUpdateUserRole`, `usePositions`, `useWorkAreas`, `useLocations` | `GET /api/users`, `GET /api/evaluations`, `PATCH /api/users/:id`, `POST /api/users/:id/reset-password`, `POST /api/users`, `DELETE /api/users/:id`, `PATCH /api/users/:id/role`, `GET /api/positions`, `GET /api/work-areas`, `GET /api/locations` | Working |
| Assign Supervisors | `/assign` | `AssignSupervisors.tsx` | `useAuth`, `useUsers`, `useAssignments`, `useCreateAssignment`, `useDeleteAssignment`, `useEvaluations`, `usePeriods`, `useCurrentPeriod` | `GET /api/users`, `GET /api/assignments?period=`, `POST /api/assignments`, `DELETE /api/assignments/:id`, `GET /api/evaluations` | Working |
| Org Chart | `/orgchart` | `OrgChart.tsx` | `useAuth`, `useUsers`, `useAssignments`, `useCurrentPeriod` | `GET /api/users`, `GET /api/assignments?period=` | Working — depends on current period |
| Settings | `/settings` | `Settings.tsx` | `useAuth`, `useUsers`, `useEvaluations`, `useAssignments`, `useActionPlans`, `usePeriods`, `useCurrentPeriod`, `useTemplateQuestions` | Auth: `POST /api/auth/change-password`, `GET /api/evaluations`, `GET /api/action-plans`, `GET /api/assignments?period=` | Working |
| My Action Plan | `/my-action-plan` | `MyActionPlan.tsx` | `useAuth`, `useUsers`, `useEvaluations`, `useAssignments`, `useActionPlans`, `useCreateActionPlan`, `useApproveActionPlan`, `usePeriods`, `useCurrentPeriod` | `GET /api/users`, `GET /api/evaluations`, `GET /api/assignments`, `GET /api/action-plans`, `POST /api/action-plans`, `POST /api/action-plans/:id/approve` | Working |
| My Profile | `/my-profile` | `MyProfile.tsx` | `useAuth`, `useUsers`, `useEvaluations`, `useAssignments`, `useObjectives`, `usePeriods`, `useCurrentPeriod` | `GET /api/users`, `GET /api/evaluations`, `GET /api/assignments`, `GET /api/objectives` | Working |
| Personal Objectives | `/personal-objectives` | `PersonalObjectives.tsx` | `useAuth`, `useUsers`, `useObjectives`, `useCreateObjective`, `useAssignments`, `useSubmitObjective`, `useReviewObjective`, `usePeriods`, `useCurrentPeriod` | `GET /api/objectives`, `POST /api/objectives`, `POST /api/objectives/:id/submit`, `POST /api/objectives/:id/review` | Working |
| Vacations | `/vacations` | `Vacations.tsx` | `useAuth`, `useUsers`, `useAssignments`, `useVacationConfig`, `useVacationRequests`, `useCreateVacationRequest`, `useUpdateVacationRequest`, `useAddExtraVacationDays`, `useCancelVacationRequest`, `useCurrentPeriod` | `GET /api/vacations/requests`, `POST /api/vacations/requests`, `PATCH /api/vacations/requests/:id/approve`, `DELETE /api/vacations/requests/:id`, `GET /api/vacations/config` | Working |
| Communications | `/communications` | `Communications.tsx` | `useAuth`, `useUsers`, `useAnnouncements`, `useCreateAnnouncement`, `useMarkAnnouncementRead`, `useUpdateAnnouncement` | `GET /api/announcements`, `POST /api/announcements`, `POST /api/announcements/:id/read`, `PATCH /api/announcements/:id` | Working |
| Period Config | `/period-config` | `PeriodConfig.tsx` | `useAuth`, `usePeriods`, `useCreatePeriod` | `GET /api/periods`, `POST /api/periods` | Working |
| Question Library | `/question-library` | `QuestionLibrary.tsx` | `useAuth`, hooks from `useEvaluationConfig` | `GET /api/evaluation-config/library`, `POST /api/evaluation-config/library`, `PATCH /api/evaluation-config/library/:id`, `DELETE /api/evaluation-config/library/:id` | Working |
| Evaluation Templates | `/evaluation-templates` | `EvaluationTemplates.tsx` | hooks from `useEvaluationConfig` | `GET /api/evaluation-config/template-questions`, `PUT /api/evaluation-config/template-questions/:position`, `GET /api/evaluation-config/categories`, `GET /api/evaluation-config/section-weights` | Working |
| Access Control | `/access` | `AccessControl.tsx` | `useAuth`, `useUsers`, `useSystemStatus`, `useUpdateSystemStatus`, `useSystemModules`, `useUpdateSystemModules`, `useActivationHistory`, `useCopilotConfig`, `useUpdateCopilotConfig` | `GET /api/users`, `GET /api/system/status`, `PATCH /api/system/status`, `GET /api/system/modules`, `PATCH /api/system/modules`, `GET /api/system/activation-history`, `GET/PATCH /api/copilot/config` | Working (super_user only) |
| Copilot | `/copilot` | `CopilotChat.tsx` | `useAuth`, copilot hooks | `GET /api/copilot/config`, `POST /api/copilot/chat`, conversation CRUD | Working (super_user + module enabled) |
| Notifications | `/notifications` | `Notifications.tsx` | `useNotifications`, `useMarkNotificationRead`, `useMarkAllNotificationsRead` | `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `POST /api/notifications/read-all` | Working |
| Notification Preferences | `/notification-preferences` | `NotificationPreferences.tsx` | `useNotificationPreferences`, `useUpdateNotificationPreferences` | `GET /api/notifications/preferences`, `PATCH /api/notifications/preferences` | Working |
| User Timeline | `/users/:id/timeline` | `UserTimeline.tsx` | `useUserTimeline`, `useCreateTimelineEvent`, `useUpdateTimelineEvent`, `useDeleteTimelineEvent` | `GET /api/users/:id/timeline`, `POST /api/users/:id/timeline`, `PATCH /api/users/:id/timeline/:eventId`, `DELETE /api/users/:id/timeline/:eventId` | Working |
| Position Management | `/positions` | `PositionManagement.tsx` | `usePositions`, `useWorkAreas`, `useCreatePosition`, `useUpdatePosition`, `useDeletePosition`, `useCreateWorkArea`, `useUpdateWorkArea`, `useDeleteWorkArea` | `GET /api/positions`, `POST /api/positions`, `PATCH /api/positions/:id`, `DELETE /api/positions/:id`, `GET /api/work-areas`, `POST /api/work-areas`, `PATCH /api/work-areas/:id`, `DELETE /api/work-areas/:id` | Working (admin only) |
| Help | `/help` | `Help.tsx` | None | None | Working |
| Login | `/login` | `Login.tsx` | `useAuth` (login, initializeSystem) | `POST /api/auth/login`, `POST /api/system/init` | Working |
| Activate Account | `/activate-account` | `ActivateAccount.tsx` | `useAuth` (activateAccount, verifyActivationToken) | `POST /api/auth/activate`, `GET /api/auth/verify-activation` | Working |
| Forgot Password | `/forgot-password` | `ForgotPassword.tsx` | `useAuth` (requestPasswordReset) | `POST /api/auth/request-password-reset` | Working |
| Reset Password | `/reset-password` | `ResetPassword.tsx` | `useAuth` (verifyResetToken, completePasswordReset) | `GET /api/auth/verify-reset-token`, `POST /api/auth/complete-password-reset` | Working |
| Change Password | (in-app) | `ChangePassword.tsx` | `useAuth` (changePassword) | `POST /api/auth/change-password` | Working |
| My Profile | `/my-profile` | `MyProfile.tsx` | (see above) | (see above) | Working |

---

## BACKEND ENDPOINTS

### Auth Routes (`/api/auth`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| POST | `/login` | No | No | users | Login |
| POST | `/logout` | Yes | Yes | sessions | Layout |
| GET | `/me` | Yes | Yes | users | AuthContext |
| POST | `/change-password` | Yes | Yes | users | ChangePassword |
| POST | `/security-question` | No | No | — (DISABLED 410) | — |
| POST | `/reset-password` | No | No | — (DISABLED 410) | — |

### Auth-New Routes (`/api/auth`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| POST | `/activate` | No | No | users, password_reset_tokens | ActivateAccount |
| GET | `/verify-activation` | No | No | users | ActivateAccount |
| POST | `/resend-activation` | No | No | users, password_reset_tokens | ActivateAccount |
| POST | `/request-password-reset` | No | No | users, password_reset_tokens | ForgotPassword |
| GET | `/verify-reset-token` | No | No | password_reset_tokens | ResetPassword |
| POST | `/complete-password-reset` | No | No | users, password_reset_tokens, sessions | ResetPassword |

### Users Routes (`/api/users`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| GET | `/` | Yes | super_user, admin, socio | users | UserManagement, all list pages |
| GET | `/:id` | Yes | self, supervisor, admin, socio | users | MyProfile, UserTimeline |
| POST | `/` | Yes | super_user, admin | users | UserManagement |
| PATCH | `/:id` | Yes | self, admin, super_user | users | UserManagement |
| DELETE | `/:id` | Yes | super_user, admin | users | UserManagement |
| POST | `/:id/reset-password` | Yes | admin, super_user | users | UserManagement |
| PATCH | `/:id/role` | Yes | super_user (for isSuperUser), admin (for others) | users | UserManagement |
| GET | `/:id/timeline` | Yes | self, supervisor, admin, socio | user_timeline | UserTimeline |
| POST | `/:id/timeline` | Yes | admin | user_timeline | UserTimeline |
| PATCH | `/:id/timeline/:eventId` | Yes | admin | user_timeline | UserTimeline |
| DELETE | `/:id/timeline/:eventId` | Yes | admin | user_timeline | UserTimeline |

### Evaluations Routes (`/api/evaluations`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| GET | `/export/csv` | Yes | admin, socio | evaluations, users, evaluation_responses, evaluation_na_approvals | Evaluations |
| GET | `/` | Yes | filtered by role | evaluations, evaluation_responses, evaluation_na_approvals | All eval pages |
| GET | `/:id` | Yes | owner, supervisor, admin | evaluations, evaluation_responses, evaluation_na_approvals | EvaluationViewer |
| POST | `/` | Yes | self or supervisor | evaluations, evaluation_responses | SelfEvaluation, Evaluations |
| PATCH | `/:id` | Yes | owner, supervisor, admin | evaluations, evaluation_responses | Evaluations |
| PATCH | `/:id/feedback` | Yes | supervisor of evaluated | evaluations | Evaluations |
| PATCH | `/:id/na-approval` | Yes | supervisor of evaluated | evaluations, evaluation_na_approvals | Evaluations |

### Assignments Routes (`/api/assignments`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| GET | `/` | Yes | filtered by role | supervisor_assignments | AssignSupervisors, all period-filtered pages |
| POST | `/` | Yes | admin | supervisor_assignments | AssignSupervisors |
| DELETE | `/:id` | Yes | admin | supervisor_assignments | AssignSupervisors |

### Action Plans Routes (`/api/action-plans`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| GET | `/` | Yes | owner, supervisor, admin | action_plans, smart_action_items | MyActionPlan, Settings, Evaluations |
| POST | `/` | Yes | self, supervisor, admin | action_plans, smart_action_items | MyActionPlan |
| PATCH | `/:id` | Yes | owner, supervisor, admin | action_plans, smart_action_items | MyActionPlan |
| POST | `/:id/approve` | Yes | supervisor of employee | action_plans | MyActionPlan |

### Objectives Routes (`/api/objectives`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| GET | `/` | Yes | filtered by role | personal_objectives, admin_objectives, legal_objectives | PersonalObjectives |
| POST | `/` | Yes | self, supervisor, admin | personal_objectives, admin_objectives, legal_objectives | PersonalObjectives |
| POST | `/:id/submit` | Yes | owner, admin | personal_objectives, admin_objectives | PersonalObjectives |
| POST | `/:id/review` | Yes | supervisor, admin | admin_objectives | PersonalObjectives |

### Vacations Routes (`/api/vacations`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| GET | `/requests` | Yes | filtered by role | vacation_requests, vacation_approvals | Vacations |
| POST | `/requests` | Yes | self, supervisor, admin | vacation_requests, vacation_approvals | Vacations |
| PATCH | `/requests/:id` | Yes | owner, supervisor, admin | vacation_requests | Vacations |
| POST | `/requests/:id/approve` | Yes | supervisor | vacation_requests, vacation_approvals | Vacations |
| DELETE | `/requests/:id` | Yes | owner (pending), admin | vacation_requests | Vacations |
| GET | `/config` | Yes | admin | vacation_config | Vacations (admin) |
| PATCH | `/config` | Yes | admin | vacation_config | Vacations (admin) |
| POST | `/extra-days` | Yes | admin | extra_vacation_days | Vacations (admin) |

### Periods Routes (`/api/periods`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| GET | `/` | Yes | — | period_configs | All period-aware pages |
| POST | `/` | Yes | admin | period_configs | PeriodConfig |

### Analytics Routes (`/api/analytics`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| GET | `/overview` | Yes | — (filtered) | analytics_period_summary OR live query | Dashboard |
| GET | `/evaluations` | Yes | — (filtered) | analytics_evaluation_summary | Reports, ScoreAnalysis |
| GET | `/trends` | Yes | — (filtered) | evaluations (live) | Reports |
| GET | `/objectives` | Yes | — (filtered) | personal_objectives | Reports |
| GET | `/vacations` | Yes | — (filtered) | vacation_requests | Reports |
| GET | `/action-plans` | Yes | — (filtered) | action_plans | Reports |

### Notifications Routes (`/api/notifications`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| GET | `/` | Yes | self | notifications | Notifications, NotificationBell |
| GET | `/count` | Yes | self | notifications | NotificationBell |
| PATCH | `/:id/read` | Yes | self | notifications | Notifications |
| POST | `/read-all` | Yes | self | notifications | Notifications |
| GET | `/preferences` | Yes | self | notification_preferences | NotificationPreferences |
| PATCH | `/preferences` | Yes | self | notification_preferences | NotificationPreferences |
| GET | `/pending-actions` | Yes | self | evaluations, action_plans, vacation_requests, supervisor_assignments, period_configs | Dashboard |

### System Routes (`/api/system`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| GET | `/initialized` | No | No | system_status | Login |
| POST | `/init` | No | No | users, work_areas, custom_positions, vacation_config, module_config, system_status, period_configs | Setup |
| GET | `/status` | Yes | — | system_status | AccessControl |
| PATCH | `/status` | Yes | super_user | system_status | AccessControl |
| GET | `/modules` | No | No | module_config | AuthContext |
| PATCH | `/modules` | Yes | super_user | module_config | AccessControl |
| GET | `/activation-history` | Yes | super_user | activation_history | AccessControl |
| POST | `/backfill-timeline` | Yes | super_user | user_timeline | AccessControl |

### Evaluation Config Routes (`/api/evaluation-config`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| GET | `/categories` | Yes | — | evaluation_categories | QuestionLibrary, EvaluationTemplates |
| POST | `/categories` | Yes | admin | evaluation_categories | QuestionLibrary |
| GET | `/section-weights` | Yes | — | section_weights | EvaluationTemplates |
| GET | `/section-weights/:position` | Yes | — | section_weights | EvaluationTemplates |
| PATCH | `/section-weights/:position` | Yes | admin | section_weights | EvaluationTemplates |
| GET | `/competencies` | Yes | — | competency_definitions | EvaluationTemplates |
| GET | `/competencies/:level` | Yes | — | competency_definitions | EvaluationTemplates |
| GET | `/template-questions` | Yes | — | template_questions | QuestionLibrary, Evaluations |
| PUT | `/template-questions/:position` | Yes | admin | template_questions | QuestionLibrary |
| PATCH | `/template-questions/:id` | Yes | admin | template_questions | QuestionLibrary |
| GET | `/full-template/:position` | Yes | — | template_questions, section_weights, evaluation_categories, competency_definitions, position_config | SelfEvaluation |
| GET | `/positions` | Yes | — | position_config | PositionManagement |
| GET | `/score-labels` | Yes | — | score_config | useEvalConfigInit |
| GET | `/library` | Yes | — | question_library | QuestionLibrary |
| POST | `/library` | Yes | admin | question_library | QuestionLibrary |
| PATCH | `/library/:id` | Yes | admin | question_library | QuestionLibrary |
| DELETE | `/library/:id` | Yes | admin | question_library | QuestionLibrary |
| POST | `/reseed` | Yes | admin | template_questions, section_weights, question_library | QuestionLibrary |

### Announcements Routes (`/api/announcements`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| GET | `/` | Yes | filtered by audience | announcements, announcement_reads | Communications |
| POST | `/` | Yes | admin | announcements | Communications |
| PATCH | `/:id` | Yes | admin | announcements | Communications |
| POST | `/:id/read` | Yes | self | announcement_reads | Communications |

### Positions Routes (`/api/positions`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| GET | `/` | Yes | — | custom_positions, work_areas | UserManagement, PositionManagement |
| GET | `/:id` | Yes | — | custom_positions, work_areas | — |
| POST | `/` | Yes | admin | custom_positions | PositionManagement |
| PATCH | `/:id` | Yes | admin | custom_positions | PositionManagement |
| DELETE | `/:id` | Yes | admin | custom_positions | PositionManagement |

### Work Areas Routes (`/api/work-areas`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| GET | `/` | Yes | — | work_areas | UserManagement |
| POST | `/` | Yes | admin | work_areas | PositionManagement |
| PATCH | `/:id` | Yes | admin | work_areas | PositionManagement |
| DELETE | `/:id` | Yes | admin | work_areas | PositionManagement |

### Locations Routes (`/api/locations`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| GET | `/` | Yes | — | locations | UserManagement |
| POST | `/` | Yes | admin | locations | — |
| PATCH | `/:id` | Yes | admin | locations | — |
| DELETE | `/:id` | Yes | admin | locations | — |

### Copilot Routes (`/api/copilot`)
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| Various | Chat, config, conversations | Yes | super_user | copilot_conversations, copilot_messages, system_status | CopilotChat |

### Health Routes
| Method | Route | Auth | AuthZ | Tables | Frontend Pages |
|--------|-------|------|-------|--------|----------------|
| GET | `/api/health` | No | No | — | Monitoring |
| GET | `/api/health/stats` | Yes | super_user, admin | users, supervisor_assignments, evaluations, period_configs | Monitoring |

---

## DATABASE TABLES

| Table | Purpose | Used By |
|-------|---------|---------|
| `users` | User accounts and profiles | Auth, UserManagement, all pages |
| `sessions` | JWT token blocklist | Auth |
| `custom_positions` | Position catalog (CVE) | PositionManagement, UserManagement |
| `work_areas` | Legal/Administrativo areas | PositionManagement, UserManagement |
| `locations` | Office locations | UserManagement |
| `period_configs` | Evaluation period dates | All period-aware pages |
| `supervisor_assignments` | Employee↔Supervisor mapping per period | AssignSupervisors, OrgChart, all period-filtered pages |
| `evaluations` | Evaluation records | SelfEvaluation, Evaluations, Reports |
| `evaluation_responses` | Question responses per evaluation | Evaluations |
| `evaluation_na_approvals` | N/A approval records | Evaluations |
| `action_plans` | Action plans per employee/period | MyActionPlan |
| `smart_action_items` | SMART items within action plans | MyActionPlan |
| `personal_objectives` | Objectives per employee/period | PersonalObjectives |
| `admin_objectives` | Admin-type objective items | PersonalObjectives |
| `legal_objectives` | Legal-type objective items | PersonalObjectives |
| `vacation_requests` | Vacation requests | Vacations |
| `vacation_approvals` | Approval records for vacations | Vacations |
| `vacation_config` | Vacation days per position | Vacations |
| `extra_vacation_days` | Extra vacation days granted | Vacations |
| `announcements` | Company announcements | Communications |
| `announcement_reads` | Read receipts for announcements | Communications |
| `notifications` | In-app notifications | Notifications, NotificationBell |
| `notification_deliveries` | Delivery tracking for notifications | Notifications service |
| `notification_preferences` | User notification preferences | NotificationPreferences |
| `user_timeline` | Timeline events for users | UserTimeline |
| `section_weights` | Section weights per position | EvaluationTemplates, SelfEvaluation |
| `evaluation_categories` | Question categories | QuestionLibrary |
| `template_questions` | Question templates per position | QuestionLibrary, SelfEvaluation |
| `question_library` | Canonical question definitions | QuestionLibrary |
| `competency_definitions` | Competency definitions per level | EvaluationTemplates |
| `score_config` | Score label definitions | useEvalConfigInit |
| `position_config` | Position hierarchy config | useEvalConfigInit |
| `module_config` | Feature toggles (evaluations, vacations, etc.) | AccessControl |
| `system_status` | System status and configuration | AccessControl |
| `activation_history` | System activation/deactivation log | AccessControl |
| `password_reset_tokens` | Password reset tokens | auth-new |
| `analytics_period_summary` | Pre-computed period analytics | Dashboard |
| `analytics_evaluation_summary` | Pre-computed evaluation analytics | Reports |
| `analytics_user_activity` | Pre-computed user activity | (reserved) |
| `copilot_conversations` | Copilot chat conversations | CopilotChat |
| `copilot_messages` | Copilot chat messages | CopilotChat |

