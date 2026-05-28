export type Position =
  | 'socio'
  | 'salary_partner'
  | 'counsel'
  | 'asociado_sr'
  | 'asociado_mid'
  | 'asociado_jr'
  | 'pasante_carrera'
  | 'pasante_corporativo'  // backward compat
  | 'pasante'
  | 'director'
  | 'gerente'
  | 'coordinador'
  | 'analista'
  | 'asistente'
  | 'archivo_soporte'      // backward compat
  | 'soporte'
  | 'archivista'
  | 'dummy';

export type PositionLevel = 'legal' | 'administrativo';

export { getPositionLabel as POSITION_LABELS_DEPRECATED } from '@/lib/evaluationConfig';  // Use getPositionLabel() instead

export { getPositionLevel as POSITION_LEVELS_DEPRECATED } from '@/lib/evaluationConfig';  // Use getPositionLevel() instead

export { LEVEL_LABELS } from '@/lib/evaluationConfig';

// Position rank for "evaluador de mayor rango" calculations (lower index = higher rank)
export { getPositionRank as POSITION_RANK_DEPRECATED } from '@/lib/evaluationConfig';  // Use getPositionRank() instead

export { getLegalHierarchy as LEGAL_HIERARCHY_DEPRECATED } from '@/lib/evaluationConfig';  // Use getLegalHierarchy() instead

export { getAdminHierarchy as ADMIN_HIERARCHY_DEPRECATED } from '@/lib/evaluationConfig';  // Use getAdminHierarchy() instead

export { getPositionHierarchy as POSITION_HIERARCHY_DEPRECATED } from '@/lib/evaluationConfig';  // Use getPositionHierarchy() instead

export type QuestionCategory =
  | 'Desempeño' | 'Liderazgo' | 'Cumplimiento' | 'Habilidades Blandas'
  | 'Trabajo en Equipo' | 'Actitud' | 'Disponibilidad' | 'Desarrollo' | 'Comunicación'
  | 'Criterio Técnico'
  // Sub-categorías de Criterio Técnico (Corporativo)
  | 'Conocimiento normativo' | 'Redacción legal' | 'Due diligence'
  | 'Constitución y modificaciones' | 'Atención a clientes'
  // Sub-categorías de Criterio Técnico (Consultoría Fiscal)
  | 'Normatividad fiscal' | 'Opiniones fiscales' | 'Planeación fiscal'
  | 'Criterios y jurisprudencia' | 'Impactos fiscales'
  // Sub-categorías de Criterio Técnico (Litigio Fiscal)
  | 'Redacción de escritos' | 'Estrategia procesal' | 'Audiencias y diligencias'
  | 'Seguimiento de expedientes';

export type EvalSection = 'competencias' | 'tecnico' | 'blandas';

export type PracticeArea = 'fiscal_consultoria' | 'fiscal_litigio' | 'corporativo' | 'backoffice'
  | 'consultoria_fiscal' | 'litigio_fiscal' | 'general';  // backward compat

// PRACTICE_AREA_LABELS - use practice area labels from DB

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
 * Maps old keys to new keys so the rest of the code only needs to handle canonical keys.
 */
export { normalizePracticeArea } from '@/lib/evaluationConfig';

/**
 * Normalize a position to its canonical form.
 * Maps old position keys to their current equivalents so the rest of the code
 * only needs to handle canonical positions.
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
  practiceArea?: PracticeArea; // solo aplica a posiciones legales
  customPositionId?: string;   // referencia al catálogo de puestos (cve_puesto)
  locationId?: string;        // FK → Location.id
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
  competencia: string;       // Qué competencia / área se busca desarrollar
  objetivo: string;          // SMART: específico, medible, alcanzable, relevante, con tiempo
  acciones: string;          // Acciones concretas a ejecutar
  queEvitar: string;         // Conductas o hábitos a evitar
  fechaRevision: string;     // ISO yyyy-mm-dd
  apoyos: string;            // Apoyos requeridos del supervisor/jefe
}

export interface ActionPlan {
  id: string;
  employeeId: string;
  supervisorId: string; // The senior evaluator who reviews/approves
  period: string;
  content: string;                       // legacy: texto libre (compatibilidad)
  items?: SmartActionItem[];             // nueva estructura SMART
  createdAt: string;
  updatedAt: string;
  // Approval flow by senior evaluator
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

export { getScoreLabels as SCORE_LABELS_DEPRECATED } from '@/lib/evaluationConfig';  // Use getScoreLabels() instead

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
  status?: AdminObjectiveStatus;       // default 'draft'
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;                 // userId del evaluador
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
  expiresAt?: string; // expiry date
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
  period?: string; // year period
}

export interface ExtraVacationDays {
  id: string;
  userId: string;
  days: number;
  reason: string;
  addedBy: string;
  addedAt: string;
  period: string; // e.g. "2025", "2026"
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
