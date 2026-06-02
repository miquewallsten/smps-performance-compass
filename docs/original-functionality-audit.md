# SMPS Original Functionality Audit

## Page-by-Page Comparison

### 1. Dashboard

**Original Behavior:**
- Uses `useEvaluations()`, `useAssignments()`, `useUsers()` to fetch all data
- Calculates metrics client-side from raw data
- Filters by `CURRENT_PERIOD` constant ('2026-H1')
- Shows evaluation progress by position level
- Has "Legal" and "Administrativo" group filters
- Shows pending evaluations for supervisor
- Period is hardcoded constant

**Current Behavior:**
- Uses `useAnalyticsOverview()`, `useAnalyticsEvaluations()`, `usePendingActions()` (analytics APIs)
- Metrics come from pre-computed analytics tables
- Falls back to previous period if current has no data
- Shows phase stepper (self → supervisor → feedback → action plan)
- Shows notification count bell
- Period is DB-driven via `useCurrentPeriod()`

**Regression:** ⚠️ Dashboard shows empty when current period (2026-H2) has no data. Original always showed the hardcoded period's data. Current app does fall back logic but the UX is confusing.

**Fixed:** ✅ The current app now falls back to the most recent period with data.

### 2. Users / UserManagement

**Original Behavior:**
- Admin-only access (`requireAdmin` middleware)
- Lists all users with position, email, role
- Can create users with password
- Can deactivate users
- Can reset passwords
- Can change roles (isAdmin, isManagingPartner)

**Current Behavior:**
- Admin/socio/managing_partner access
- Same CRUD operations
- User creation now uses activation flow (activation token + email)
- Password reset uses email-based token flow
- Has "Evaluations" button on user rows to view their evaluations

**Regression:** ⚠️ Activation and password reset emails require SMTP which is not configured. Legacy password reset still works.

### 3. Org Chart

**Original Behavior:**
- Uses `useAssignments(CURRENT_PERIOD)` to get supervisor assignments
- Shows supervisors as cards with their team members
- Groups by LEGAL_HIERARCHY and ADMIN_HIERARCHY
- Uses POSITION_LABELS constant for display

**Current Behavior:**
- Uses `useAssignments(currentPeriod)` from DB
- Same card layout with expand/collapse
- Groups by `getLegalHierarchy()` and `getAdminHierarchy()` from DB
- Uses `getPositionLabel()` from DB

**Regression:** None. Functionally identical. ✅

### 4. Evaluations

**Original Behavior:**
- Uses `useEvaluations()` without period filter (fetches all)
- Filters by `viewPeriod` (defaulting to `CURRENT_PERIOD`)
- Visibility: admin/socio see all (filtered by `canViewUserEvaluations`), supervisors see their team, employees see own
- Questions built from `getQuestionsForUser(emp, customQuestions)` which filters by position + practice area
- NA approval section filters by `currentPeriod`
- Period dropdown for history view

**Current Behavior:**
- Uses `useEvaluations()` which fetches all periods
- Filters by `viewPeriod` (defaulting to `currentPeriod` from DB)
- Same visibility logic with `canViewUserEvaluations`
- Questions built from `customQuestions[empPos]` with practice area filtering (FIXED)
- NA approval section now uses `viewPeriod` (FIXED)
- Same period dropdown

**Regression:** ✅ Fixed. All evaluation flows are functionally equivalent.

### 5. Self-Evaluation

**Original Behavior:**
- Uses `getQuestionsForUser(currentUser)` to build questions
- Section weights from hardcoded `SECTION_WEIGHTS`
- Practice area from `currentUser.practiceArea`
- Period uses `CURRENT_PERIOD` constant

**Current Behavior:**
- Uses `useFullTemplate(position, practiceArea)` API endpoint
- Section weights from DB `section_weights` table
- Practice area from `currentUser.practiceArea`
- Period uses `useCurrentPeriod()` hook

**Regression:** None. ✅ Functionally equivalent.

### 6. Settings

**Original Behavior:**
- Shows current user's evaluation details
- Uses `QUESTIONS_BY_POSITION` to display question details
- Uses `CURRENT_PERIOD` for period selection
- Has password change form

**Current Behavior:**
- Uses `useFullTemplate(currentUser.position, currentUser.practiceArea)` for questions
- Uses `useCurrentPeriod()` for period selection
- Has same password change form (without security question)
- Shows period selector for viewing historical evaluations

**Regression:** ⚠️ Settings page uses the current user's template to display ANY evaluation's questions, not the evaluated person's template. If viewing a different position's evaluation, the questions shown may not match.

### 7. EvaluationTemplates (Admin)

**Original Behavior:**
- Uses `useCustomQuestions()` and seed overrides
- Admin can customize questions per position
- Has "Custom Questions" tab for each position
- Questions are stored in `custom_eval_questions` table

**Current Behavior:**
- Uses `useTemplateQuestions()` from DB
- Admin can edit template questions with practice area tabs for legal positions
- Has question library management
- Questions stored in `template_questions` and `question_library` tables

**Regression:** ⚠️ Different data model but functionally equivalent. Template questions now support practice area tabs for legal positions.

### 8. Reports

**Original Behavior:**
- Client-side calculation from raw data
- Uses `useEvaluations()` and `useUsers()` directly
- Filters by level and position
- Shows per-user scores

**Current Behavior:**
- Uses analytics API (`useAnalyticsEvaluations()`)
- Same filters
- Pre-computed metrics

**Regression:** ⚠️ Reports depend on analytics tables being up-to-date. If analytics tables are stale, data may be wrong.

### 9. Periods (PeriodConfig)

**Original Behavior:**
- Uses `usePeriods()` to fetch period configs
- Admin can create/edit periods
- Periods stored in `period_configs` table

**Current Behavior:**
- Same. Period management is DB-driven.

**Regression:** None. ✅

### 10. Vacations

**Original Behavior:**
- Employee creates vacation request
- Supervisor approves/rejects
- Admin manages vacation day configuration per position

**Current Behavior:**
- Same flow with additional notification support

**Regression:** None. ✅

### 11. Action Plans

**Original Behavior:**
- Created after supervisor evaluation
- Text-based content
- Supervisor can add comments

**Current Behavior:**
- Same with SMART items support
- Approval flow (pending/approved/rejected)

**Regression:** None. ✅ Improved.

### 12. PersonalObjectives

**Original Behavior:**
- Legal positions: 15 numeric metrics (objectives)
- Admin positions: up to 5 qualitative objectives with percentage

**Current Behavior:**
- Same structure from DB

**Regression:** None. ✅

### 13. Help

**Original Behavior:**
- Shows competency dictionary per position
- Uses `COMPETENCIES_BY_POSITION` hardcoded

**Current Behavior:**
- Same, from DB `competency_definitions` table

**Regression:** None. ✅

### 14. CopilotChat

**Original Behavior:**
- Simple AI chat using Ollama
- No tool execution

**Current Behavior:**
- Enhanced with tools (analyze, users, evaluations, etc.)
- Knowledge base
- Conversation history in DB

**Regression:** None. ✅ Improved.

### Pages in Current but NOT in Original:
- ActivateAccount.tsx ✅ New
- ForgotPassword.tsx ✅ New
- ResetPassword.tsx ✅ New
- NotificationPreferences.tsx ✅ New
- Notifications.tsx ✅ New
- PositionManagement.tsx ✅ New
- ScoreAnalysis.tsx ✅ New
- UserTimeline.tsx ✅ New

### Pages in Original but NOT in Current:
- None (all original pages exist in current)
