import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  securityQuestion: text('security_question').notNull(),
  securityAnswer: text('security_answer').notNull(),
  name: text('name').notNull(),
  position: text('position').notNull(),
  practiceArea: text('practice_area'),
  customPositionId: text('custom_position_id'),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  isSuperUser: integer('is_super_user', { mode: 'boolean' }).notNull().default(false),
  isManagingPartner: integer('is_managing_partner', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Sessions ────────────────────────────────────────────────────────────────

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  expiresAt: text('expires_at').notNull(),
});

// ─── Custom Positions ────────────────────────────────────────────────────────

export const customPositions = sqliteTable('custom_positions', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  level: text('level').notNull(),
  practiceArea: text('practice_area'),
  basePosition: text('base_position').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Period Configs ──────────────────────────────────────────────────────────

export const periodConfigs = sqliteTable('period_configs', {
  period: text('period').primaryKey(),
  selfStart: text('self_start').notNull(),
  selfEnd: text('self_end').notNull(),
  supervisorStart: text('supervisor_start').notNull(),
  supervisorEnd: text('supervisor_end').notNull(),
  feedbackStart: text('feedback_start').notNull(),
  feedbackEnd: text('feedback_end').notNull(),
  actionPlanStart: text('action_plan_start').notNull(),
  actionPlanEnd: text('action_plan_end').notNull(),
});

// ─── Supervisor Assignments ──────────────────────────────────────────────────

export const supervisorAssignments = sqliteTable('supervisor_assignments', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull().references(() => users.id),
  supervisorId: text('supervisor_id').notNull().references(() => users.id),
  period: text('period').notNull(),
}, (table) => [
  uniqueIndex('supervisor_assignments_employee_supervisor_period_unique').on(table.employeeId, table.supervisorId, table.period),
]);

// ─── Evaluations ─────────────────────────────────────────────────────────────

export const evaluations = sqliteTable('evaluations', {
  id: text('id').primaryKey(),
  evaluatorId: text('evaluator_id').notNull().references(() => users.id),
  evaluatedId: text('evaluated_id').notNull().references(() => users.id),
  period: text('period').notNull(),
  type: text('type').notNull(),
  comments: text('comments').notNull().default(''),
  supervisorComments: text('supervisor_comments'),
  totalScore: real('total_score').notNull().default(0),
  completedAt: text('completed_at'),
  feedbackCompleted: integer('feedback_completed', { mode: 'boolean' }).notNull().default(false),
  feedbackCompletedAt: text('feedback_completed_at'),
  feedbackCompletedBy: text('feedback_completed_by').references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  uniqueIndex('evaluations_evaluator_evaluated_period_type_unique').on(table.evaluatorId, table.evaluatedId, table.period, table.type),
]);

// ─── Evaluation Responses ────────────────────────────────────────────────────

export const evaluationResponses = sqliteTable('evaluation_responses', {
  id: text('id').primaryKey(),
  evaluationId: text('evaluation_id').notNull().references(() => evaluations.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull(),
  score: integer('score').notNull(),
  notApplicable: integer('not_applicable', { mode: 'boolean' }).notNull().default(false),
  noElements: integer('no_elements', { mode: 'boolean' }).notNull().default(false),
});

// ─── Evaluation NA Approvals ────────────────────────────────────────────────

export const evaluationNaApprovals = sqliteTable('evaluation_na_approvals', {
  evaluationId: text('evaluation_id').notNull().references(() => evaluations.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull(),
  approved: integer('approved', { mode: 'boolean' }).notNull().default(false),
});

// ─── Action Plans ────────────────────────────────────────────────────────────

export const actionPlans = sqliteTable('action_plans', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull().references(() => users.id),
  supervisorId: text('supervisor_id').notNull().references(() => users.id),
  period: text('period').notNull(),
  content: text('content').notNull().default(''),
  approvalStatus: text('approval_status').notNull().default('pending'),
  approvalComments: text('approval_comments'),
  approvedBy: text('approved_by').references(() => users.id),
  approvedAt: text('approved_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  uniqueIndex('action_plans_employee_period_unique').on(table.employeeId, table.period),
]);

// ─── SMART Action Items ─────────────────────────────────────────────────────

export const smartActionItems = sqliteTable('smart_action_items', {
  id: text('id').primaryKey(),
  actionPlanId: text('action_plan_id').notNull().references(() => actionPlans.id, { onDelete: 'cascade' }),
  competencia: text('competencia').notNull(),
  objetivo: text('objetivo').notNull(),
  acciones: text('acciones').notNull(),
  queEvitar: text('que_evitar').notNull(),
  fechaRevision: text('fecha_revision').notNull(),
  apoyos: text('apoyos').notNull(),
});

// ─── Personal Objectives ────────────────────────────────────────────────────

export const personalObjectives = sqliteTable('personal_objectives', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  period: text('period').notNull(),
  type: text('type').notNull(),
}, (table) => [
  uniqueIndex('personal_objectives_user_period_unique').on(table.userId, table.period),
]);

// ─── Admin Objectives ───────────────────────────────────────────────────────

export const adminObjectives = sqliteTable('admin_objectives', {
  id: text('id').primaryKey(),
  personalObjectivesId: text('personal_objectives_id').notNull().references(() => personalObjectives.id, { onDelete: 'cascade' }),
  tipoObjetivo: text('tipo_objetivo').notNull(),
  nombreObjetivo: text('nombre_objetivo').notNull(),
  pilaresEstrategicos: text('pilares_estrategicos').notNull().default(''),
  alcance: text('alcance').notNull().default(''),
  porcentajeAvance: real('porcentaje_avance').notNull().default(0),
  status: text('status').notNull().default('draft'),
  submittedAt: text('submitted_at'),
  reviewedAt: text('reviewed_at'),
  reviewedBy: text('reviewed_by').references(() => users.id),
  reviewerComment: text('reviewer_comment'),
});

// ─── Legal Objectives ───────────────────────────────────────────────────────

export const legalObjectives = sqliteTable('legal_objectives', {
  id: text('id').primaryKey(),
  personalObjectivesId: text('personal_objectives_id').notNull().references(() => personalObjectives.id, { onDelete: 'cascade' }),
  horasMeta: real('horas_meta').notNull().default(0),
  horasAjustadas: real('horas_ajustadas').notNull().default(0),
  porcentajeHorasVsMeta: real('porcentaje_horas_vs_meta').notNull().default(0),
  porcentajeEficiencia: real('porcentaje_eficiencia').notNull().default(0),
  metaProBono: real('meta_pro_bono').notNull().default(0),
  realizadoProBono: real('realizado_pro_bono').notNull().default(0),
  metaMarketing: real('meta_marketing').notNull().default(0),
  realizadoMarketing: real('realizado_marketing').notNull().default(0),
  metaBusinessDev: real('meta_business_dev').notNull().default(0),
  realizadoBusinessDev: real('realizado_business_dev').notNull().default(0),
  metaMentoring: real('meta_mentoring').notNull().default(0),
  realizadoMentoring: real('realizado_mentoring').notNull().default(0),
  resultadoArea: real('resultado_area').notNull().default(0),
  resultadoFirma: real('resultado_firma').notNull().default(0),
  porcentajeTotalBono: real('porcentaje_total_bono').notNull().default(0),
});

// ─── Announcements ───────────────────────────────────────────────────────────

export const announcements = sqliteTable('announcements', {
  id: text('id').primaryKey(),
  authorId: text('author_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  audience: text('audience').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  expiresAt: text('expires_at'),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
});

// ─── Announcement Reads ──────────────────────────────────────────────────────

export const announcementReads = sqliteTable('announcement_reads', {
  announcementId: text('announcement_id').notNull().references(() => announcements.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
});

// ─── Vacation Requests ───────────────────────────────────────────────────────

export const vacationRequests = sqliteTable('vacation_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  days: integer('days').notNull(),
  reason: text('reason').notNull().default(''),
  status: text('status').notNull().default('pending'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  period: text('period'),
});

// ─── Vacation Approvals ──────────────────────────────────────────────────────

export const vacationApprovals = sqliteTable('vacation_approvals', {
  id: text('id').primaryKey(),
  vacationRequestId: text('vacation_request_id').notNull().references(() => vacationRequests.id, { onDelete: 'cascade' }),
  approverId: text('approver_id').notNull().references(() => users.id),
  approvedAt: text('approved_at').notNull(),
  action: text('action').notNull(),
  comment: text('comment'),
});

// ─── Extra Vacation Days ─────────────────────────────────────────────────────

export const extraVacationDays = sqliteTable('extra_vacation_days', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  days: integer('days').notNull(),
  reason: text('reason').notNull(),
  addedBy: text('added_by').notNull().references(() => users.id),
  addedAt: text('added_at').notNull(),
  period: text('period').notNull(),
});

// ─── Vacation Config ─────────────────────────────────────────────────────────

export const vacationConfig = sqliteTable('vacation_config', {
  position: text('position').primaryKey(),
  days: integer('days').notNull(),
});

// ─── Custom Eval Questions ───────────────────────────────────────────────────

export const customEvalQuestions = sqliteTable('custom_eval_questions', {
  id: text('id').primaryKey(),
  position: text('position').notNull(),
  questionId: text('question_id').notNull(),
  category: text('category').notNull(),
  text: text('text').notNull(),
  weight: integer('weight').notNull(),
  section: text('section'),
  practiceArea: text('practice_area'),
}, (table) => [
  uniqueIndex('custom_eval_questions_position_question_unique').on(table.position, table.questionId),
]);

// ─── Library Questions ────────────────────────────────────────────────────────

export const libraryQuestions = sqliteTable('library_questions', {
  id: text('id').primaryKey(),
  questionId: text('question_id').notNull().unique(),
  category: text('category').notNull(),
  text: text('text').notNull(),
  defaultWeight: integer('default_weight').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  createdBy: text('created_by').references(() => users.id),
});

// ─── Seed Question Overrides ─────────────────────────────────────────────────

export const seedQuestionOverrides = sqliteTable('seed_question_overrides', {
  questionId: text('question_id').primaryKey(),
  text: text('text'),
  category: text('category'),
  weight: integer('weight'),
  hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
});

// ─── Module Config ──────────────────────────────────────────────────────────

export const moduleConfig = sqliteTable('module_config', {
  id: integer('id').primaryKey().default(1),
  evaluations: integer('evaluations', { mode: 'boolean' }).notNull().default(true),
  communications: integer('communications', { mode: 'boolean' }).notNull().default(true),
  vacations: integer('vacations', { mode: 'boolean' }).notNull().default(true),
});

// ─── System Status ───────────────────────────────────────────────────────────

export const systemStatus = sqliteTable('system_status', {
  id: integer('id').primaryKey().default(1),
  status: text('status').notNull().default('active'),
  activationDate: text('activation_date').notNull(),
  paymentPlan: text('payment_plan').notNull().default('monthly'),
  maxUsers: integer('max_users').notNull().default(50),
  tickets: integer('tickets').notNull().default(0),
});

// ─── Activation History ──────────────────────────────────────────────────────

export const activationHistory = sqliteTable('activation_history', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  date: text('date').notNull(),
  by: text('by').references(() => users.id),
});

// ─── Copilot Conversations ──────────────────────────────────────────────────

export const copilotConversations = sqliteTable('copilot_conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull().default('Nueva conversación'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const copilotMessages = sqliteTable('copilot_messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => copilotConversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  toolCalls: text('tool_calls'),
  toolResults: text('tool_results'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const copilotConfig = sqliteTable('copilot_config', {
  id: integer('id').primaryKey().default(1),
  model: text('model').notNull().default('llama-3.3-70b-versatile'),
  apiProvider: text('api_provider').notNull().default('groq'),
  canManageUsers: integer('can_manage_users', { mode: 'boolean' }).notNull().default(true),
  canManageEvaluations: integer('can_manage_evaluations', { mode: 'boolean' }).notNull().default(true),
  canManageVacations: integer('can_manage_vacations', { mode: 'boolean' }).notNull().default(true),
  canManageAnnouncements: integer('can_manage_announcements', { mode: 'boolean' }).notNull().default(true),
  canManagePeriods: integer('can_manage_periods', { mode: 'boolean' }).notNull().default(false),
  canManageSystem: integer('can_manage_system', { mode: 'boolean' }).notNull().default(false),
  canViewReports: integer('can_view_reports', { mode: 'boolean' }).notNull().default(true),
  maxTokens: integer('max_tokens').notNull().default(2048),
  temperature: real('temperature').notNull().default(0.3),
});
