/**
 * Types for SMPS Performance Compass.
 *
 * Position and QuestionCategory are now dynamic strings — 
 * all data comes from the database, not from hardcoded unions.
 */

export type Position = string;

export type PositionLevel = 'legal' | 'administrativo';

export { LEVEL_LABELS } from '@/lib/evaluationConfig';

export type QuestionCategory = string;

export type EvalSection = 'competencias' | 'tecnico' | 'blandas';

export type PracticeArea = string;

export interface EvalQuestion {
  id: string;
  category: QuestionCategory;
  text: string;
  weight: number;
  section?: EvalSection;
  practiceArea?: PracticeArea;
}

export interface LibraryQuestion {
  id: string;
  category: QuestionCategory;
  text: string;
  createdAt: string;
  createdBy?: string;
}

/**
 * Normalize a practice area to its canonical form.
 */
export { normalizePracticeArea } from '@/lib/evaluationConfig';

/**
 * Normalize a position to its canonical form.
 */
export { normalizePosition } from '@/lib/evaluationConfig';

/** Posición (CVE Puesto) dada de alta por el admin. */
export interface CustomPosition {
  id: string;              // CVE code, e.g. "SMPS12"
  label: string;           // e.g. "Asociado Jr Corporativo"
  workAreaId: string;      // FK → WorkArea.id
  basePosition: Position;  // posición base de la que hereda plantilla y pesos
  workAreaLabel?: string;  // joined from work_areas
  workAreaLevel?: PositionLevel; // joined from work_areas
  createdAt: string;
  updatedAt?: string;
}

/** Área de trabajo (Legal / Administrativo). */
export interface WorkArea {
  id: string;
  label: string;
  level: PositionLevel;
  sortOrder: number;
  positionCount?: number;
  positions?: CustomPosition[];
  createdAt: string;
  updatedAt?: string;
}

/** Ubicación física del empleado (ciudad, oficina, piso, escritorio). */
export interface Location {
  id: string;
  label: string;
  city?: string;
  office?: string;
  floor?: string;
  desk?: string;
  sortOrder: number;
  userCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  position: Position;
  practiceArea?: PracticeArea;
  customPositionId?: string;
  locationId?: string;
  isAdmin: boolean;
  isActive: boolean;
  password: string;

  isSuperUser?: boolean;
  isDummy?: boolean;
  createdBy?: string;
  isManagingPartner?: boolean;
}

export interface SupervisorAssignment {
  id: string;
  employeeId: string;
  supervisorId: string;
  period: string;
}

export interface EvaluationResponse {
  questionId: string;
  score: number;
  notApplicable?: boolean;
  noElements?: boolean;
  weight?: number;
}

export interface Evaluation {
  id: string;
  evaluatorId: string;
  evaluatedId: string;
  period: string;
  type: 'self' | 'supervisor';
  responses: EvaluationResponse[];
  comments: string;
  supervisorComments?: string;
  completedAt: string;
  totalScore: number;
  naApprovals?: Record<string, boolean>;
  feedbackCompleted?: boolean;
  feedbackCompletedAt?: string;
  feedbackCompletedBy?: string;
}

export interface SmartActionItem {
  id: string;
  competencia: string;
  objetivo: string;
  acciones: string;
  queEvitar: string;
  fechaRevision: string;
  apoyos: string;
}

export interface ActionPlan {
  id: string;
  employeeId: string;
  supervisorId: string;
  period: string;
  content: string;
  items?: SmartActionItem[];
  createdAt: string;
  updatedAt: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvalComments?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface PeriodConfig {
  period: string;
  selfStart: string;
  selfEnd: string;
  supervisorStart: string;
  supervisorEnd: string;
  feedbackStart: string;
  feedbackEnd: string;
  actionPlanStart: string;
  actionPlanEnd: string;
}

export { PERIODS } from '@/lib/evaluationConfig';
export { CURRENT_PERIOD } from '@/lib/evaluationConfig';

export type AdminObjectiveStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface AdminObjective {
  id: string;
  tipoObjetivo: string;
  nombreObjetivo: string;
  pilaresEstrategicos: string;
  alcance: string;
  porcentajeAvance: number;
  status?: AdminObjectiveStatus;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerComment?: string;
}

export interface LegalObjective {
  id: string;
  horasMeta: number;
  horasAjustadas: number;
  porcentajeHorasVsMeta: number;
  porcentajeEficiencia: number;
  metaProBono: number;
  realizadoProBono: number;
  metaMarketing: number;
  realizadoMarketing: number;
  metaBusinessDev: number;
  realizadoBusinessDev: number;
  metaMentoring: number;
  realizadoMentoring: number;
  resultadoArea: number;
  resultadoFirma: number;
  porcentajeTotalBono: number;
}

export interface PersonalObjectives {
  userId: string;
  period: string;
  type: 'legal' | 'admin';
  adminObjectives?: AdminObjective[];
  legalObjective?: LegalObjective;
}

export interface Announcement {
  id: string;
  authorId: string;
  title: string;
  body: string;
  audience: 'all' | 'legal' | 'administrativo';
  createdAt: string;
  readBy: string[];
  expiresAt?: string;
  archived?: boolean;
}

export interface VacationApproval {
  approverId: string;
  approvedAt: string;
  action: 'approved' | 'rejected';
  comment?: string;
}

export interface VacationRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvals: VacationApproval[];
  period?: string;
}

export interface ExtraVacationDays {
  id: string;
  userId: string;
  days: number;
  reason: string;
  addedBy: string;
  addedAt: string;
  period: string;
}

export interface ModuleConfig {
  evaluations: boolean;
  communications: boolean;
  vacations: boolean;
}

export interface ActivationHistoryEntry {
  action: 'activated' | 'deactivated';
  date: string;
  by: string;
}
