import { EvalQuestion, EvaluationResponse, Position, EvalSection, POSITION_LEVELS, QuestionCategory, User, PracticeArea, normalizePosition, normalizePracticeArea } from '@/types';
import { getTechnicalQuestions } from './technicalQuestions';
import { getSectionWeights } from './sectionWeights';


/**
 * Determina la sección de evaluación para una pregunta según su categoría y la posición.
 * - Legal: Competencias / Criterio Técnico / Habilidades Blandas
 * - Administrativo: Competencias / Habilidades Blandas (sin Técnico)
 *
 * Para posiciones legales: Desempeño y Cumplimiento → criterio técnico.
 * Para posiciones administrativas: Desempeño y Cumplimiento → competencias (NO técnico).
 * Las sub-categorías de Criterio Técnico siempre van a técnico (solo aplican a legal).
 */
export function getSectionForQuestion(question: EvalQuestion, position: Position): EvalSection {
  if (question.section) return question.section;
  const normalizedPos = normalizePosition(position);
  const level = POSITION_LEVELS[normalizedPos] || POSITION_LEVELS[position];
  const cat = question.category;
  const isSoft = cat === 'Habilidades Blandas' || cat === 'Actitud' || cat === 'Disponibilidad' || cat === 'Desarrollo';
  if (isSoft) return 'blandas';

  if (level === 'legal') {
    // Legal: Criterio Técnico, sus sub-categorías, Desempeño y Cumplimiento → técnico
    if (cat === 'Criterio Técnico' || cat === 'Desempeño' || cat === 'Cumplimiento') return 'tecnico';
    if (isTechnicalSubcategory(cat)) return 'tecnico';
    return 'competencias';
  }

  // Administrativo: Desempeño y Cumplimiento → competencias (NO técnico)
  // Las sub-categorías de Criterio Técnico no aplican a administrativos
  return 'competencias';
}

/**
 * Sub-categorías de Criterio Técnico (fuente: Criterio Juridico - SDC.xlsx).
 * Todas se mapean a la sección "tecnico" pero SOLO para posiciones legales.
 */
const TECHNICAL_SUBCATEGORIES: Set<string> = new Set([
  'Conocimiento normativo', 'Redacción legal', 'Due diligence',
  'Constitución y modificaciones', 'Atención a clientes',
  'Normatividad fiscal', 'Opiniones fiscales', 'Planeación fiscal',
  'Criterios y jurisprudencia', 'Impactos fiscales',
  'Redacción de escritos', 'Estrategia procesal', 'Audiencias y diligencias',
  'Seguimiento de expedientes',
]);

function isTechnicalSubcategory(cat: string): boolean {
  return TECHNICAL_SUBCATEGORIES.has(cat);
}

export const SECTION_LABELS: Record<EvalSection, string> = {
  competencias: 'Competencias',
  tecnico: 'Criterio Técnico',
  blandas: 'Habilidades Blandas',
};

export const SECTION_ORDER: EvalSection[] = ['competencias', 'tecnico', 'blandas'];

/**
 * Sección global de una pregunta basada únicamente en su categoría.
 * Útil para vistas "globales" como la Biblioteca de Preguntas, donde no hay una posición de referencia.
 */
export function getSectionByCategory(category: QuestionCategory): EvalSection {
  if (category === 'Habilidades Blandas' || category === 'Actitud' || category === 'Disponibilidad' || category === 'Desarrollo') {
    return 'blandas';
  }
  if (category === 'Criterio Técnico' || category === 'Desempeño' || category === 'Cumplimiento') return 'tecnico';
  if (isTechnicalSubcategory(category)) return 'tecnico';
  // Liderazgo y Trabajo en Equipo
  return 'competencias';
}

export const ALL_CATEGORIES: QuestionCategory[] = [
  'Desempeño', 'Liderazgo', 'Cumplimiento', 'Habilidades Blandas',
  'Trabajo en Equipo', 'Actitud', 'Disponibilidad', 'Desarrollo',
  'Criterio Técnico',
  'Conocimiento normativo', 'Redacción legal', 'Due diligence',
  'Constitución y modificaciones', 'Atención a clientes',
  'Normatividad fiscal', 'Opiniones fiscales', 'Planeación fiscal',
  'Criterios y jurisprudencia', 'Impactos fiscales',
  'Redacción de escritos', 'Estrategia procesal', 'Audiencias y diligencias',
  'Seguimiento de expedientes',
];

// === LEGAL POSITIONS ===

const socioQuestions: EvalQuestion[] = [
  { id: 's1', category: 'Criterio Técnico', text: '¿Cómo califica la captación y retención de clientes?', weight: 10 },
  { id: 's2', category: 'Criterio Técnico', text: '¿Cómo califica el cumplimiento de objetivos financieros del despacho?', weight: 9 },
  { id: 's3', category: 'Criterio Técnico', text: '¿Cómo califica la gestión de relaciones con clientes clave?', weight: 8 },
  { id: 's4', category: 'Liderazgo', text: '¿Cómo califica la visión estratégica y dirección del despacho?', weight: 8 },
  { id: 's5', category: 'Liderazgo', text: '¿Cómo califica el desarrollo y mentoría del equipo?', weight: 8 },
  { id: 's6', category: 'Liderazgo', text: '¿Cómo califica la toma de decisiones estratégicas?', weight: 7 },
  { id: 's7', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación con el equipo y clientes?', weight: 7 },
  { id: 's8', category: 'Criterio Técnico', text: '¿Cómo califica la representación institucional y reputación de la firma?', weight: 7 },
  { id: 's9', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación entre áreas y socios?', weight: 6 },
  { id: 's10', category: 'Habilidades Blandas', text: '¿Cómo califica la resolución de conflictos internos?', weight: 6 },
  { id: 's11', category: 'Actitud', text: '¿Cómo califica la ética profesional y ejemplo hacia el equipo?', weight: 6 },
  { id: 's12', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad ante situaciones críticas?', weight: 6 },
  { id: 's13', category: 'Habilidades Blandas', text: '¿Cómo califica la capacidad de innovación y adaptación?', weight: 6 },
  { id: 's14', category: 'Criterio Técnico', text: '¿Cómo califica la supervisión de calidad en entregables del despacho?', weight: 6 },
];

const asociadoSrQuestions: EvalQuestion[] = [
  { id: 'asr1', category: 'Criterio Técnico', text: '¿Cómo califica la calidad técnica-jurídica en dictámenes y opiniones?', weight: 10 },
  { id: 'asr2', category: 'Criterio Técnico', text: '¿Cómo califica la entrega de trabajos en tiempo y forma?', weight: 9 },
  { id: 'asr3', category: 'Criterio Técnico', text: '¿Cómo califica el desarrollo de estrategias legales?', weight: 8 },
  { id: 'asr4', category: 'Criterio Técnico', text: '¿Cómo califica la atención y seguimiento a clientes?', weight: 8 },
  { id: 'asr5', category: 'Liderazgo', text: '¿Cómo califica el liderazgo en casos complejos?', weight: 8 },
  { id: 'asr6', category: 'Liderazgo', text: '¿Cómo califica la mentoría hacia abogados junior y pasantes?', weight: 7 },
  { id: 'asr7', category: 'Criterio Técnico', text: '¿Cómo califica la gestión de tiempos y prioridades?', weight: 7 },
  { id: 'asr8', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación clara y efectiva?', weight: 7 },
  { id: 'asr9', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración con otros departamentos?', weight: 6 },
  { id: 'asr10', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de metas y objetivos?', weight: 8 },
  { id: 'asr11', category: 'Cumplimiento', text: '¿Cómo califica la adherencia a políticas y procedimientos?', weight: 6 },
  { id: 'asr12', category: 'Habilidades Blandas', text: '¿Cómo califica la resolución de conflictos?', weight: 6 },
  { id: 'asr13', category: 'Actitud', text: '¿Cómo califica la proactividad y compromiso?', weight: 6 },
  { id: 'asr14', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad para situaciones urgentes?', weight: 5 },
];

const asociadoMidQuestions: EvalQuestion[] = [
  { id: 'amd1', category: 'Criterio Técnico', text: '¿Cómo califica la calidad de su trabajo jurídico?', weight: 10 },
  { id: 'amd2', category: 'Criterio Técnico', text: '¿Cómo califica la capacidad de análisis y resolución de problemas?', weight: 9 },
  { id: 'amd3', category: 'Criterio Técnico', text: '¿Cómo califica la redacción de documentos legales?', weight: 8 },
  { id: 'amd4', category: 'Criterio Técnico', text: '¿Cómo califica la gestión de casos y asuntos asignados?', weight: 8 },
  { id: 'amd5', category: 'Liderazgo', text: '¿Cómo califica la capacidad de guía a miembros junior del equipo?', weight: 7 },
  { id: 'amd6', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración efectiva con el equipo?', weight: 7 },
  { id: 'amd7', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de metas y entregas?', weight: 8 },
  { id: 'amd8', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento a políticas y procedimientos?', weight: 7 },
  { id: 'amd9', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación con clientes y colegas?', weight: 7 },
  { id: 'amd10', category: 'Actitud', text: '¿Cómo califica la actitud de servicio y compromiso?', weight: 6 },
  { id: 'amd11', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad y respuesta oportuna?', weight: 6 },
  { id: 'amd12', category: 'Habilidades Blandas', text: '¿Cómo califica la capacidad de adaptación al cambio?', weight: 6 },
];

const asociadoJrQuestions: EvalQuestion[] = [
  { id: 'ajr1', category: 'Criterio Técnico', text: '¿Cómo califica la calidad del trabajo jurídico realizado?', weight: 10 },
  { id: 'ajr2', category: 'Criterio Técnico', text: '¿Cómo califica la capacidad de investigación y análisis?', weight: 9 },
  { id: 'ajr3', category: 'Criterio Técnico', text: '¿Cómo califica la redacción y presentación de documentos?', weight: 8 },
  { id: 'ajr4', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de tareas asignadas?', weight: 8 },
  { id: 'ajr5', category: 'Desempeño', text: '¿Cómo califica la puntualidad en entregas?', weight: 7 },
  { id: 'ajr6', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de instrucciones?', weight: 7 },
  { id: 'ajr7', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración con el equipo?', weight: 7 },
  { id: 'ajr8', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación efectiva?', weight: 7 },
  { id: 'ajr9', category: 'Actitud', text: '¿Cómo califica la disposición para aprender?', weight: 6 },
  { id: 'ajr10', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 6 },
  { id: 'ajr11', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?', weight: 6 },
  { id: 'ajr12', category: 'Cumplimiento', text: '¿Cómo califica la confidencialidad?', weight: 7 },
];

const pasanteCarreraQuestions: EvalQuestion[] = [
  { id: 'pc1', category: 'Criterio Técnico', text: '¿Cómo califica la calidad del trabajo realizado?', weight: 10 },
  { id: 'pc2', category: 'Criterio Técnico', text: '¿Cómo califica la capacidad de investigación?', weight: 9 },
  { id: 'pc3', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de tareas asignadas?', weight: 8 },
  { id: 'pc4', category: 'Desempeño', text: '¿Cómo califica la puntualidad en entregas?', weight: 7 },
  { id: 'pc5', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de instrucciones?', weight: 7 },
  { id: 'pc6', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración con el equipo?', weight: 7 },
  { id: 'pc7', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación?', weight: 7 },
  { id: 'pc8', category: 'Actitud', text: '¿Cómo califica la disposición para aprender?', weight: 6 },
  { id: 'pc9', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 6 },
  { id: 'pc10', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?', weight: 6 },
];

const pasanteCorporativoQuestions: EvalQuestion[] = [
  { id: 'pco1', category: 'Criterio Técnico', text: '¿Cómo califica la calidad del trabajo realizado?', weight: 10 },
  { id: 'pco2', category: 'Criterio Técnico', text: '¿Cómo califica la capacidad de investigación?', weight: 9 },
  { id: 'pco3', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de tareas asignadas?', weight: 8 },
  { id: 'pco4', category: 'Desempeño', text: '¿Cómo califica la puntualidad en entregas?', weight: 7 },
  { id: 'pco5', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de instrucciones?', weight: 7 },
  { id: 'pco6', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración con el equipo?', weight: 7 },
  { id: 'pco7', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación?', weight: 7 },
  { id: 'pco8', category: 'Actitud', text: '¿Cómo califica la disposición para aprender?', weight: 6 },
  { id: 'pco9', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 6 },
  { id: 'pco10', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?', weight: 6 },
];

// === ADMINISTRATIVE POSITIONS ===

const directorQuestions: EvalQuestion[] = [
  { id: 'd1', category: 'Liderazgo', text: '¿Cómo califica la visión estratégica y dirección del área?', weight: 10 },
  { id: 'd2', category: 'Liderazgo', text: '¿Cómo califica la gestión de recursos humanos y financieros?', weight: 9 },
  { id: 'd3', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de objetivos y metas?', weight: 9 },
  { id: 'd4', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación entre departamentos?', weight: 8 },
  { id: 'd5', category: 'Desempeño', text: '¿Cómo califica la eficiencia operativa?', weight: 8 },
  { id: 'd6', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de políticas y procedimientos?', weight: 7 },
  { id: 'd7', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación con el equipo?', weight: 7 },
  { id: 'd8', category: 'Actitud', text: '¿Cómo califica el compromiso con la firma?', weight: 7 },
  { id: 'd9', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 6 },
  { id: 'd10', category: 'Habilidades Blandas', text: '¿Cómo califica la resolución de conflictos?', weight: 6 },
];

const gerenteQuestions: EvalQuestion[] = [
  { id: 'g1', category: 'Liderazgo', text: '¿Cómo califica la gestión del equipo a su cargo?', weight: 10 },
  { id: 'g2', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de objetivos?', weight: 9 },
  { id: 'g3', category: 'Desempeño', text: '¿Cómo califica la eficiencia operativa?', weight: 8 },
  { id: 'g4', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación con otras áreas?', weight: 8 },
  { id: 'g5', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de políticas?', weight: 7 },
  { id: 'g6', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación efectiva?', weight: 7 },
  { id: 'g7', category: 'Actitud', text: '¿Cómo califica la proactividad?', weight: 7 },
  { id: 'g8', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 6 },
  { id: 'g9', category: 'Habilidades Blandas', text: '¿Cómo califica la resolución de problemas?', weight: 6 },
  { id: 'g10', category: 'Cumplimiento', text: '¿Cómo califica la confidencialidad?', weight: 7 },
];

const coordinadorQuestions: EvalQuestion[] = [
  { id: 'co1', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de objetivos?', weight: 10 },
  { id: 'co2', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación del equipo?', weight: 9 },
  { id: 'co3', category: 'Desempeño', text: '¿Cómo califica la eficiencia en sus procesos?', weight: 8 },
  { id: 'co4', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de instrucciones?', weight: 8 },
  { id: 'co5', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación?', weight: 7 },
  { id: 'co6', category: 'Actitud', text: '¿Cómo califica la actitud de servicio?', weight: 7 },
  { id: 'co7', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 7 },
  { id: 'co8', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración?', weight: 7 },
  { id: 'co9', category: 'Cumplimiento', text: '¿Cómo califica la confidencialidad?', weight: 6 },
  { id: 'co10', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?', weight: 6 },
];

const analistaQuestions: EvalQuestion[] = [
  { id: 'an1', category: 'Desempeño', text: '¿Cómo califica la calidad de su trabajo?', weight: 10 },
  { id: 'an2', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de entregas?', weight: 9 },
  { id: 'an3', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de procedimientos?', weight: 8 },
  { id: 'an4', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración?', weight: 8 },
  { id: 'an5', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación?', weight: 7 },
  { id: 'an6', category: 'Actitud', text: '¿Cómo califica la proactividad?', weight: 7 },
  { id: 'an7', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 7 },
  { id: 'an8', category: 'Cumplimiento', text: '¿Cómo califica la confidencialidad?', weight: 7 },
  { id: 'an9', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?', weight: 6 },
  { id: 'an10', category: 'Desempeño', text: '¿Cómo califica la gestión del tiempo?', weight: 6 },
];

const asistente_questions: EvalQuestion[] = [
  { id: 'as1', category: 'Desempeño', text: '¿Cómo califica la calidad de su trabajo?', weight: 10 },
  { id: 'as2', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de tareas?', weight: 9 },
  { id: 'as3', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de instrucciones?', weight: 8 },
  { id: 'as4', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración con el equipo?', weight: 8 },
  { id: 'as5', category: 'Actitud', text: '¿Cómo califica la actitud de servicio y disposición?', weight: 9 },
  { id: 'as6', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 8 },
  { id: 'as7', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación?', weight: 7 },
  { id: 'as8', category: 'Cumplimiento', text: '¿Cómo califica la confidencialidad?', weight: 7 },
  { id: 'as9', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?', weight: 7 },
  { id: 'as10', category: 'Desempeño', text: '¿Cómo califica la puntualidad?', weight: 6 },
];

const archivoSoporteQuestions: EvalQuestion[] = [
  { id: 'ar1', category: 'Desempeño', text: '¿Cómo califica la calidad de su trabajo?', weight: 10 },
  { id: 'ar2', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de tareas?', weight: 9 },
  { id: 'ar3', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de instrucciones?', weight: 8 },
  { id: 'ar4', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación con el equipo?', weight: 8 },
  { id: 'ar5', category: 'Actitud', text: '¿Cómo califica la actitud de servicio y disposición?', weight: 9 },
  { id: 'ar6', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 8 },
  { id: 'ar7', category: 'Desempeño', text: '¿Cómo califica el manejo de sistemas de archivo?', weight: 8 },
  { id: 'ar8', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación con su equipo?', weight: 7 },
  { id: 'ar9', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?', weight: 7 },
  { id: 'ar10', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento a instrucciones?', weight: 7 },
  { id: 'ar11', category: 'Desempeño', text: '¿Cómo califica la confidencialidad?', weight: 7 },
  { id: 'ar12', category: 'Actitud', text: '¿Cómo califica la iniciativa propia?', weight: 7 },
];

export const QUESTIONS_BY_POSITION: Record<Position, EvalQuestion[]> = {
  socio: socioQuestions,
  salary_partner: socioQuestions, // Same questions as Socio
  counsel: socioQuestions, // Solo se usa la sección técnica (pesos competencias/blandas = 0)

  asociado_sr: asociadoSrQuestions,
  asociado_mid: asociadoMidQuestions,
  asociado_jr: asociadoJrQuestions,
  pasante_carrera: pasanteCarreraQuestions,
  pasante_corporativo: pasanteCorporativoQuestions,
  pasante: pasanteCorporativoQuestions,
  director: directorQuestions,
  gerente: gerenteQuestions,
  coordinador: coordinadorQuestions,
  analista: analistaQuestions,
  asistente: asistente_questions,
  archivo_soporte: archivoSoporteQuestions,
  soporte: archivoSoporteQuestions,
  archivista: archivoSoporteQuestions,
  dummy: socioQuestions,
};

/**
 * Get questions for a position, with optional custom overrides.
 */
export function getQuestionsForPosition(
  position: Position,
  customQuestions?: Record<string, EvalQuestion[]>
): EvalQuestion[] {
  const normalized = normalizePosition(position);
  if (customQuestions && customQuestions[normalized]) return customQuestions[normalized];
  if (customQuestions && customQuestions[position]) return customQuestions[position];
  return QUESTIONS_BY_POSITION[normalized] || QUESTIONS_BY_POSITION[position] || [];
}

/**
 * Calculate score considering NA and "Sin Elementos" responses.
 * Both approved NA and Sin Elementos (noElements) are excluded and weight redistributed.
 */
export function calculateScore(
  questions: EvalQuestion[],
  responses: EvaluationResponse[],
  naApprovals?: Record<string, boolean>
): number {
  const activeQuestions = questions.filter(q => {
    const r = responses.find(r => r.questionId === q.id);
    if (r?.notApplicable && naApprovals?.[q.id]) return false;
    if (r?.noElements) return false;
    if (r?.notApplicable && !naApprovals && r.score === 0) return false;
    return true;
  });

  const totalWeight = activeQuestions.reduce((sum, q) => sum + q.weight, 0);
  if (totalWeight === 0) return 0;

  let weightedSum = 0;
  for (const q of activeQuestions) {
    const r = responses.find(r => r.questionId === q.id);
    if (r && !r.notApplicable && !r.noElements && r.score > 0) {
      weightedSum += (r.score / 5) * q.weight;
    }
  }
  return Math.round((weightedSum / totalWeight) * 100);
}

/**
 * Devuelve las preguntas para evaluar a un usuario, agrupadas y ponderadas
 * por sección de acuerdo a SECTION_WEIGHTS.
 *
 * - Para posiciones legales se incorporan las preguntas técnicas del área de
 *   práctica del usuario (corporativo / consultoría fiscal / litigio fiscal).
 *   Si no se ha asignado área, se usa "corporativo" por defecto.
 * - Las preguntas de "competencias" y "blandas" provienen de la plantilla
 *   del puesto (custom o seed).
 * - Para posiciones administrativas NO hay sección técnica.
 * - Los pesos individuales se reescalan dentro de cada sección para que la
 *   suma respete el peso global de la sección (SECTION_WEIGHTS).
 */
export function getQuestionsForUser(
  user: Pick<User, 'position' | 'practiceArea'>,
  customQuestions?: Record<string, EvalQuestion[]>,
): EvalQuestion[] {
  const position = normalizePosition(user.position);
  const level = POSITION_LEVELS[position];
  const sectionWeights = getSectionWeights(position);
  const template = (customQuestions && (customQuestions[position] || customQuestions[user.position])) || QUESTIONS_BY_POSITION[position] || QUESTIONS_BY_POSITION[user.position] || [];

  // Particionar plantilla por sección (sin contar técnicas — esas vienen del catálogo de área).
  const tplCompetencias = template.filter(q => getSectionForQuestion(q, position) === 'competencias');
  const tplBlandas = template.filter(q => getSectionForQuestion(q, position) === 'blandas');

  // Técnicas: solo para legal y con área de práctica
  const tecnicas: EvalQuestion[] = level === 'legal'
    ? getTechnicalQuestions(position, normalizePracticeArea(user.practiceArea || 'corporativo'))
    : [];

  const rescale = (qs: EvalQuestion[], target: number): EvalQuestion[] => {
    if (qs.length === 0 || target <= 0) return [];
    const sum = qs.reduce((s, q) => s + (q.weight || 1), 0) || qs.length;
    return qs.map(q => ({ ...q, weight: Math.round(((q.weight || 1) / sum) * target * 100) / 100 }));
  };

  return [
    ...rescale(tecnicas, sectionWeights.tecnico),
    ...rescale(tplCompetencias, sectionWeights.competencias),
    ...rescale(tplBlandas, sectionWeights.blandas),
  ];
}
