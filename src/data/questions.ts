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
    if (cat === 'Criterio Técnico' || cat === 'Desempeño' || cat === 'Cumplimiento') return 'tecnico';
    if (isTechnicalSubcategory(cat)) return 'tecnico';
    return 'competencias';
  }

  // Administrativo: Desempeño y Cumplimiento → competencias (NO técnico)
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

// === LEGAL POSITIONS (competencias + blandas only; técnico comes from technicalQuestions.ts) ===

const socioQuestions: EvalQuestion[] = [
  { id: 's4', category: 'Liderazgo', text: '¿Cómo califica la visión estratégica y dirección del despacho?', weight: 5 },
  { id: 's5', category: 'Liderazgo', text: '¿Cómo califica el desarrollo y mentoría del equipo?', weight: 5 },
  { id: 's6', category: 'Liderazgo', text: '¿Cómo califica la toma de decisiones estratégicas?', weight: 5 },
  { id: 's9', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación entre áreas y socios?', weight: 5 },
  { id: 's7', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación con el equipo y clientes?', weight: 4 },
  { id: 's10', category: 'Habilidades Blandas', text: '¿Cómo califica la resolución de conflictos internos?', weight: 4 },
  { id: 's11', category: 'Actitud', text: '¿Cómo califica la ética profesional y ejemplo hacia el equipo?', weight: 4 },
  { id: 's12', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad ante situaciones críticas?', weight: 4 },
  { id: 's13', category: 'Habilidades Blandas', text: '¿Cómo califica la capacidad de innovación y adaptación?', weight: 4 },
];

const asociadoSrQuestions: EvalQuestion[] = [
  { id: 'asr5', category: 'Liderazgo', text: '¿Cómo califica el liderazgo en casos complejos?', weight: 5 },
  { id: 'asr6', category: 'Liderazgo', text: '¿Cómo califica la mentoría hacia abogados junior y pasantes?', weight: 10 },
  { id: 'asr9', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración con otros departamentos?', weight: 5 },
  { id: 'asr8', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación clara y efectiva?', weight: 5 },
  { id: 'asr12', category: 'Habilidades Blandas', text: '¿Cómo califica la resolución de conflictos?', weight: 5 },
  { id: 'asr13', category: 'Actitud', text: '¿Cómo califica la proactividad y compromiso?', weight: 5 },
  { id: 'asr14', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad para situaciones urgentes?', weight: 5 },
];

const asociadoMidQuestions: EvalQuestion[] = [
  { id: 'amd5', category: 'Liderazgo', text: '¿Cómo califica la capacidad de guía a miembros junior del equipo?', weight: 10 },
  { id: 'amd6', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración efectiva con el equipo?', weight: 10 },
  { id: 'amd7h', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación con clientes y colegas?', weight: 5 },
  { id: 'amd8h', category: 'Actitud', text: '¿Cómo califica la actitud de servicio y compromiso?', weight: 5 },
  { id: 'amd9h', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad y respuesta oportuna?', weight: 5 },
  { id: 'amd10h', category: 'Habilidades Blandas', text: '¿Cómo califica la capacidad de adaptación al cambio?', weight: 5 },
];

const asociadoJrQuestions: EvalQuestion[] = [
  { id: 'ajr5', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración con el equipo?', weight: 15 },
  { id: 'ajr6', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de instrucciones?', weight: 15 },
  { id: 'ajr7', category: 'Liderazgo', text: '¿Cómo califica la capacidad de guía a miembros junior del equipo?', weight: 10 },
  { id: 'ajr8h', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación efectiva?', weight: 5 },
  { id: 'ajr9h', category: 'Actitud', text: '¿Cómo califica la disposición para aprender?', weight: 5 },
  { id: 'ajr10h', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 5 },
  { id: 'ajr11h', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?', weight: 5 },
];

const pasanteCarreraQuestions: EvalQuestion[] = [
  { id: 'pc5', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración con el equipo?', weight: 10 },
  { id: 'pc6', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de instrucciones?', weight: 10 },
  { id: 'pc3', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de tareas?', weight: 10 },
  { id: 'pc4', category: 'Desempeño', text: '¿Cómo califica la puntualidad en entregas?', weight: 10 },
  { id: 'pc7', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación?', weight: 5 },
  { id: 'pc8', category: 'Actitud', text: '¿Cómo califica la disposición para aprender?', weight: 5 },
  { id: 'pc9', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 5 },
  { id: 'pc10', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?', weight: 5 },
];

const pasanteCorporativoQuestions: EvalQuestion[] = [
  { id: 'pco5', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración con el equipo?', weight: 15 },
  { id: 'pco6', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación con otras áreas?', weight: 15 },
  { id: 'pco7', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de instrucciones?', weight: 10 },
  { id: 'pco8', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación?', weight: 5 },
  { id: 'pco9', category: 'Actitud', text: '¿Cómo califica la disposición para aprender?', weight: 5 },
  { id: 'pco10', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 5 },
  { id: 'pco11', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?', weight: 5 },
];

// === ADMINISTRATIVE POSITIONS (all questions; no técnico section) ===

const directorQuestions: EvalQuestion[] = [
  { id: 'd1', category: 'Liderazgo', text: '¿Cómo califica la visión estratégica y dirección del área?', weight: 15 },
  { id: 'd2', category: 'Liderazgo', text: '¿Cómo califica la gestión de recursos humanos y financieros?', weight: 14 },
  { id: 'd3', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de objetivos y metas?', weight: 14 },
  { id: 'd4', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación entre departamentos?', weight: 13 },
  { id: 'd5', category: 'Desempeño', text: '¿Cómo califica la eficiencia operativa?', weight: 13 },
  { id: 'd6', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de políticas y procedimientos?', weight: 11 },
  { id: 'd7', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación con el equipo?', weight: 5 },
  { id: 'd8', category: 'Actitud', text: '¿Cómo califica el compromiso con la firma?', weight: 5 },
  { id: 'd9', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 5 },
  { id: 'd10', category: 'Habilidades Blandas', text: '¿Cómo califica la resolución de conflictos?', weight: 5 },
];

const gerenteQuestions: EvalQuestion[] = [
  { id: 'g1', category: 'Liderazgo', text: '¿Cómo califica la gestión del equipo a su cargo?', weight: 15 },
  { id: 'g2', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de objetivos?', weight: 15 },
  { id: 'g3', category: 'Desempeño', text: '¿Cómo califica la eficiencia operativa?', weight: 13 },
  { id: 'g4', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación con otras áreas?', weight: 13 },
  { id: 'g5', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de políticas?', weight: 12 },
  { id: 'g6', category: 'Cumplimiento', text: '¿Cómo califica la confidencialidad?', weight: 12 },
  { id: 'g7', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación efectiva?', weight: 5 },
  { id: 'g8', category: 'Actitud', text: '¿Cómo califica la proactividad?', weight: 5 },
  { id: 'g9', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 5 },
  { id: 'g10', category: 'Habilidades Blandas', text: '¿Cómo califica la resolución de problemas?', weight: 5 },
];

const coordinadorQuestions: EvalQuestion[] = [
  { id: 'co1', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de objetivos?', weight: 17 },
  { id: 'co2', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación del equipo?', weight: 15 },
  { id: 'co3', category: 'Desempeño', text: '¿Cómo califica la eficiencia en sus procesos?', weight: 13 },
  { id: 'co4', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de instrucciones?', weight: 13 },
  { id: 'co5', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración?', weight: 12 },
  { id: 'co6', category: 'Cumplimiento', text: '¿Cómo califica la confidencialidad?', weight: 10 },
  { id: 'co7', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación?', weight: 5 },
  { id: 'co8', category: 'Actitud', text: '¿Cómo califica la actitud de servicio?', weight: 5 },
  { id: 'co9', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 5 },
  { id: 'co10', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?', weight: 5 },
];

const analistaQuestions: EvalQuestion[] = [
  { id: 'an1', category: 'Desempeño', text: '¿Cómo califica la calidad de su trabajo?', weight: 17 },
  { id: 'an2', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de entregas?', weight: 15 },
  { id: 'an3', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de procedimientos?', weight: 13 },
  { id: 'an4', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración?', weight: 13 },
  { id: 'an5', category: 'Cumplimiento', text: '¿Cómo califica la confidencialidad?', weight: 12 },
  { id: 'an6', category: 'Desempeño', text: '¿Cómo califica la gestión del tiempo?', weight: 10 },
  { id: 'an7', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación?', weight: 5 },
  { id: 'an8', category: 'Actitud', text: '¿Cómo califica la proactividad?', weight: 5 },
  { id: 'an9', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 5 },
  { id: 'an10', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?', weight: 5 },
];

const asistente_questions: EvalQuestion[] = [
  { id: 'as1', category: 'Desempeño', text: '¿Cómo califica la calidad de su trabajo?', weight: 10 },
  { id: 'as2', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de tareas?', weight: 10 },
  { id: 'as3', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de instrucciones?', weight: 8 },
  { id: 'as4', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración con el equipo?', weight: 8 },
  { id: 'as5', category: 'Cumplimiento', text: '¿Cómo califica la confidencialidad?', weight: 8 },
  { id: 'as6', category: 'Desempeño', text: '¿Cómo califica la puntualidad?', weight: 6 },
  { id: 'as7', category: 'Actitud', text: '¿Cómo califica la actitud de servicio y disposición?', weight: 15 },
  { id: 'as8', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 13 },
  { id: 'as9', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación?', weight: 11 },
  { id: 'as10', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?', weight: 11 },
];

const archivoSoporteQuestions: EvalQuestion[] = [
  { id: 'ar1', category: 'Desempeño', text: '¿Cómo califica la calidad de su trabajo?', weight: 10 },
  { id: 'ar2', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de tareas?', weight: 8 },
  { id: 'ar3', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de instrucciones?', weight: 7 },
  { id: 'ar4', category: 'Desempeño', text: '¿Cómo califica el manejo de sistemas de archivo?', weight: 7 },
  { id: 'ar5', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación con su equipo?', weight: 6 },
  { id: 'ar6', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento a instrucciones?', weight: 6 },
  { id: 'ar7', category: 'Desempeño', text: '¿Cómo califica la confidencialidad?', weight: 6 },
  { id: 'ar8', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación con el equipo?', weight: 10 },
  { id: 'ar9', category: 'Actitud', text: '¿Cómo califica la actitud de servicio y disposición?', weight: 12 },
  { id: 'ar10', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 10 },
  { id: 'ar11', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?', weight: 9 },
  { id: 'ar12', category: 'Actitud', text: '¿Cómo califica la iniciativa propia?', weight: 9 },
];

// Soporte has one different question from Archivo y Soporte
const soporteQuestions: EvalQuestion[] = [
  { id: 'so1', category: 'Desempeño', text: '¿Cómo califica la calidad de su trabajo?', weight: 9 },
  { id: 'so2', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de tareas?', weight: 9 },
  { id: 'so3', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de instrucciones?', weight: 7 },
  { id: 'so4', category: 'Desempeño', text: '¿Cómo califica el manejo de sistemas de archivo?', weight: 7 },
  { id: 'so5', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación con su equipo?', weight: 6 },
  { id: 'so6', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento a instrucciones?', weight: 6 },
  { id: 'so7', category: 'Desempeño', text: '¿Cómo califica la confidencialidad?', weight: 6 },
  { id: 'so8', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación con el equipo?', weight: 10 },
  { id: 'so9', category: 'Actitud', text: '¿Cómo califica la actitud de servicio y disposición?', weight: 12 },
  { id: 'so10', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 10 },
  { id: 'so11', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?', weight: 9 },
  { id: 'so12', category: 'Actitud', text: '¿Cómo califica la iniciativa propia?', weight: 9 },
];

export const QUESTIONS_BY_POSITION: Record<Position, EvalQuestion[]> = {
  socio: socioQuestions,
  salary_partner: socioQuestions,
  counsel: socioQuestions,

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
  soporte: soporteQuestions,
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
  responses: EvaluationResponses[],
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
