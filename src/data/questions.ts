import { EvalQuestion, EvaluationResponse, Position, EvalSection, POSITION_LEVELS, QuestionCategory, User, PracticeArea } from '@/types';
import { getTechnicalQuestions } from './technicalQuestions';
import { getSectionWeights } from './sectionWeights';


/**
 * Determina la sección de evaluación para una pregunta según su categoría y la posición.
 * - Legal: Competencias / Criterio Técnico / Habilidades Blandas
 * - Administrativo: Competencias / Habilidades Blandas (sin Técnico)
 */
export function getSectionForQuestion(question: EvalQuestion, position: Position): EvalSection {
  if (question.section) return question.section;
  const cat = question.category;
  const isSoft = cat === 'Habilidades Blandas' || cat === 'Actitud' || cat === 'Disponibilidad' || cat === 'Desarrollo';
  if (isSoft) return 'blandas';
  // Criterio Técnico, sus 14 sub-categorías y Desempeño/Cumplimiento => sección técnica
  // (aplica para legal y administrativo — las sub-categorías de Criterio Técnico son de legal,
  //  Desempeño y Cumplimiento aplican a ambos niveles)
  if (isTechnicalCategory(cat)) return 'tecnico';
  // Liderazgo y Trabajo en Equipo => competencias
  return 'competencias';
}

/**
 * Sub-categorías de Criterio Técnico (fuente: Criterio Juridico - SDC.xlsx).
 * Todas se mapean a la sección "tecnico".
 */
const TECHNICAL_SUBCATEGORIES: Set<string> = new Set([
  'Criterio Técnico',
  'Conocimiento normativo', 'Redacción legal', 'Due diligence',
  'Constitución y modificaciones', 'Atención a clientes',
  'Normatividad fiscal', 'Opiniones fiscales', 'Planeación fiscal',
  'Criterios y jurisprudencia', 'Impactos fiscales',
  'Redacción de escritos', 'Estrategia procesal', 'Audiencias y diligencias',
  'Seguimiento de expedientes',
  'Desempeño', 'Cumplimiento',
]);

function isTechnicalCategory(cat: string): boolean {
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
  if (isTechnicalCategory(category)) return 'tecnico';
  // Liderazgo y Trabajo en Equipo
  return 'competencias';
}

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
  { id: 'asr9', category: 'Habilidades Blandas', text: '¿Cómo califica el trabajo en equipo?', weight: 7 },
  { id: 'asr10', category: 'Habilidades Blandas', text: '¿Cómo califica la capacidad de negociación?', weight: 6 },
  { id: 'asr11', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación con otras áreas?', weight: 6 },
  { id: 'asr12', category: 'Actitud', text: '¿Cómo califica la actitud de servicio al cliente?', weight: 6 },
  { id: 'asr13', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad ante urgencias?', weight: 6 },
  { id: 'asr14', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad y flexibilidad?', weight: 5 },
];

const asociadoMidQuestions: EvalQuestion[] = [
  { id: 'am1', category: 'Criterio Técnico', text: '¿Cómo califica la calidad en análisis jurídico?', weight: 10 },
  { id: 'am2', category: 'Criterio Técnico', text: '¿Cómo califica el cumplimiento de plazos asignados?', weight: 10 },
  { id: 'am3', category: 'Criterio Técnico', text: '¿Cómo califica la redacción de documentos legales?', weight: 9 },
  { id: 'am4', category: 'Criterio Técnico', text: '¿Cómo califica la proactividad en casos asignados?', weight: 8 },
  { id: 'am5', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación con supervisores y equipo?', weight: 8 },
  { id: 'am6', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración con otros asociados?', weight: 8 },
  { id: 'am7', category: 'Criterio Técnico', text: '¿Cómo califica la atención al detalle en expedientes?', weight: 7 },
  { id: 'am8', category: 'Actitud', text: '¿Cómo califica la actitud de servicio y disposición?', weight: 7 },
  { id: 'am9', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad ante cargas de trabajo?', weight: 7 },
  { id: 'am10', category: 'Habilidades Blandas', text: '¿Cómo califica la capacidad de aprendizaje continuo?', weight: 7 },
  { id: 'am11', category: 'Criterio Técnico', text: '¿Cómo califica el seguimiento a instrucciones específicas?', weight: 6 },
  { id: 'am12', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad ante cambios?', weight: 6 },
  { id: 'am13', category: 'Criterio Técnico', text: '¿Cómo califica la organización de expedientes y documentos?', weight: 7 },
];

const asociadoJrQuestions: EvalQuestion[] = [
  { id: 'aj1', category: 'Criterio Técnico', text: '¿Cómo califica la calidad en investigación jurídica?', weight: 10 },
  { id: 'aj2', category: 'Criterio Técnico', text: '¿Cómo califica el cumplimiento de plazos asignados?', weight: 10 },
  { id: 'aj3', category: 'Criterio Técnico', text: '¿Cómo califica la redacción de documentos legales?', weight: 9 },
  { id: 'aj4', category: 'Criterio Técnico', text: '¿Cómo califica la proactividad en casos asignados?', weight: 8 },
  { id: 'aj5', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación con supervisores y equipo?', weight: 8 },
  { id: 'aj6', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración con otros abogados?', weight: 8 },
  { id: 'aj7', category: 'Criterio Técnico', text: '¿Cómo califica la atención al detalle en expedientes?', weight: 7 },
  { id: 'aj8', category: 'Actitud', text: '¿Cómo califica la actitud de servicio y disposición?', weight: 7 },
  { id: 'aj9', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad ante cargas de trabajo?', weight: 7 },
  { id: 'aj10', category: 'Habilidades Blandas', text: '¿Cómo califica la capacidad de aprendizaje continuo?', weight: 7 },
  { id: 'aj11', category: 'Criterio Técnico', text: '¿Cómo califica el seguimiento a instrucciones específicas?', weight: 6 },
  { id: 'aj12', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad ante cambios?', weight: 6 },
  { id: 'aj13', category: 'Criterio Técnico', text: '¿Cómo califica la organización de expedientes y documentos?', weight: 7 },
];

const pasanteCarreraQuestions: EvalQuestion[] = [
  { id: 'pc1', category: 'Criterio Técnico', text: '¿Cómo califica la investigación y recopilación de información jurídica?', weight: 10 },
  { id: 'pc2', category: 'Criterio Técnico', text: '¿Cómo califica la entrega de trabajos en tiempo?', weight: 9 },
  { id: 'pc3', category: 'Criterio Técnico', text: '¿Cómo califica la atención al detalle en documentos?', weight: 8 },
  { id: 'pc4', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación con supervisores?', weight: 7 },
  { id: 'pc5', category: 'Desarrollo', text: '¿Cómo califica el aprendizaje continuo y desarrollo profesional?', weight: 8 },
  { id: 'pc6', category: 'Actitud', text: '¿Cómo califica la actitud positiva y compromiso?', weight: 7 },
  { id: 'pc7', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad ante nuevas tareas?', weight: 7 },
  { id: 'pc8', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad y compromiso?', weight: 6 },
  { id: 'pc9', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación con el equipo?', weight: 7 },
  { id: 'pc10', category: 'Criterio Técnico', text: '¿Cómo califica la organización de expedientes?', weight: 7 },
  { id: 'pc11', category: 'Criterio Técnico', text: '¿Cómo califica el seguimiento a instrucciones?', weight: 7 },
  { id: 'pc12', category: 'Habilidades Blandas', text: '¿Cómo califica la discreción y confidencialidad?', weight: 8 },
  { id: 'pc13', category: 'Actitud', text: '¿Cómo califica la iniciativa propia?', weight: 9 },
];

const pasanteCorporativoQuestions: EvalQuestion[] = [
  { id: 'pco1', category: 'Criterio Técnico', text: '¿Cómo califica la investigación y recopilación de información jurídica?', weight: 10 },
  { id: 'pco2', category: 'Criterio Técnico', text: '¿Cómo califica la entrega de trabajos en tiempo?', weight: 9 },
  { id: 'pco3', category: 'Criterio Técnico', text: '¿Cómo califica la atención al detalle en documentos?', weight: 8 },
  { id: 'pco4', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación con supervisores?', weight: 7 },
  { id: 'pco5', category: 'Desarrollo', text: '¿Cómo califica el aprendizaje continuo y desarrollo profesional?', weight: 8 },
  { id: 'pco6', category: 'Actitud', text: '¿Cómo califica la actitud positiva y compromiso?', weight: 7 },
  { id: 'pco7', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad ante nuevas tareas?', weight: 7 },
  { id: 'pco8', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad y compromiso?', weight: 6 },
  { id: 'pco9', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación con el equipo?', weight: 7 },
  { id: 'pco10', category: 'Criterio Técnico', text: '¿Cómo califica la organización de expedientes?', weight: 7 },
  { id: 'pco11', category: 'Criterio Técnico', text: '¿Cómo califica el seguimiento a instrucciones?', weight: 7 },
  { id: 'pco12', category: 'Habilidades Blandas', text: '¿Cómo califica la discreción y confidencialidad?', weight: 8 },
  { id: 'pco13', category: 'Actitud', text: '¿Cómo califica la iniciativa propia?', weight: 5 },
  { id: 'pco14', category: 'Habilidades Blandas', text: '¿Cómo califica el trabajo en equipo?', weight: 4 },
];

// === ADMINISTRATIVE POSITIONS ===

const directorQuestions: EvalQuestion[] = [
  { id: 'di1', category: 'Liderazgo', text: '¿Cómo califica la visión y dirección del área?', weight: 10 },
  { id: 'di2', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de objetivos del área?', weight: 10 },
  { id: 'di3', category: 'Liderazgo', text: '¿Cómo califica el desarrollo y gestión del equipo?', weight: 9 },
  { id: 'di4', category: 'Cumplimiento', text: '¿Cómo califica la entrega de resultados en tiempo?', weight: 8 },
  { id: 'di5', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación con la dirección y equipo?', weight: 8 },
  { id: 'di6', category: 'Liderazgo', text: '¿Cómo califica la toma de decisiones estratégicas?', weight: 8 },
  { id: 'di7', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación interdepartamental?', weight: 7 },
  { id: 'di8', category: 'Actitud', text: '¿Cómo califica la ética profesional?', weight: 7 },
  { id: 'di9', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad ante situaciones críticas?', weight: 7 },
  { id: 'di10', category: 'Habilidades Blandas', text: '¿Cómo califica la innovación y mejora continua?', weight: 6 },
  { id: 'di11', category: 'Desempeño', text: '¿Cómo califica la gestión de presupuesto y recursos?', weight: 7 },
  { id: 'di12', category: 'Habilidades Blandas', text: '¿Cómo califica la resolución de conflictos?', weight: 6 },
  { id: 'di13', category: 'Desempeño', text: '¿Cómo califica la representación institucional?', weight: 7 },
];

const gerenteQuestions: EvalQuestion[] = [
  { id: 'ge1', category: 'Desempeño', text: '¿Cómo califica la gestión operativa del área?', weight: 10 },
  { id: 'ge2', category: 'Cumplimiento', text: '¿Cómo califica la entrega de resultados en tiempo?', weight: 10 },
  { id: 'ge3', category: 'Liderazgo', text: '¿Cómo califica la supervisión y desarrollo del equipo?', weight: 9 },
  { id: 'ge4', category: 'Desempeño', text: '¿Cómo califica la optimización de procesos?', weight: 8 },
  { id: 'ge5', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación efectiva?', weight: 8 },
  { id: 'ge6', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación con otras áreas?', weight: 7 },
  { id: 'ge7', category: 'Actitud', text: '¿Cómo califica la actitud profesional?', weight: 7 },
  { id: 'ge8', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 7 },
  { id: 'ge9', category: 'Habilidades Blandas', text: '¿Cómo califica la resolución de problemas?', weight: 7 },
  { id: 'ge10', category: 'Desempeño', text: '¿Cómo califica el control de calidad?', weight: 7 },
  { id: 'ge11', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?', weight: 6 },
  { id: 'ge12', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento a políticas y procedimientos?', weight: 7 },
  { id: 'ge13', category: 'Liderazgo', text: '¿Cómo califica la delegación efectiva?', weight: 7 },
];

const coordinadorQuestions: EvalQuestion[] = [
  { id: 'co1', category: 'Desempeño', text: '¿Cómo califica la precisión en registros y reportes?', weight: 12 },
  { id: 'co2', category: 'Cumplimiento', text: '¿Cómo califica el cumplimiento de obligaciones y plazos?', weight: 12 },
  { id: 'co3', category: 'Desempeño', text: '¿Cómo califica la elaboración de reportes?', weight: 10 },
  { id: 'co4', category: 'Cumplimiento', text: '¿Cómo califica la entrega de reportes en tiempo?', weight: 10 },
  { id: 'co5', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación de información?', weight: 8 },
  { id: 'co6', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación con otras áreas?', weight: 7 },
  { id: 'co7', category: 'Desempeño', text: '¿Cómo califica el manejo de herramientas y sistemas?', weight: 8 },
  { id: 'co8', category: 'Actitud', text: '¿Cómo califica la actitud profesional y ética?', weight: 7 },
  { id: 'co9', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad en periodos críticos?', weight: 7 },
  { id: 'co10', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad ante cambios?', weight: 6 },
  { id: 'co11', category: 'Habilidades Blandas', text: '¿Cómo califica el trabajo en equipo?', weight: 7 },
  { id: 'co12', category: 'Desempeño', text: '¿Cómo califica la confidencialidad en el manejo de información?', weight: 6 },
];

const analistaQuestions: EvalQuestion[] = [
  { id: 'an1', category: 'Desempeño', text: '¿Cómo califica la calidad de análisis y reportes?', weight: 12 },
  { id: 'an2', category: 'Cumplimiento', text: '¿Cómo califica la entrega de trabajos en tiempo?', weight: 10 },
  { id: 'an3', category: 'Desempeño', text: '¿Cómo califica la atención al detalle?', weight: 10 },
  { id: 'an4', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación efectiva?', weight: 9 },
  { id: 'an5', category: 'Habilidades Blandas', text: '¿Cómo califica el trabajo en equipo?', weight: 9 },
  { id: 'an6', category: 'Desempeño', text: '¿Cómo califica el manejo de herramientas?', weight: 8 },
  { id: 'an7', category: 'Actitud', text: '¿Cómo califica la iniciativa y proactividad?', weight: 8 },
  { id: 'an8', category: 'Actitud', text: '¿Cómo califica la actitud de servicio?', weight: 8 },
  { id: 'an9', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 7 },
  { id: 'an10', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación con su equipo?', weight: 7 },
  { id: 'an11', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?', weight: 6 },
  { id: 'an12', category: 'Desempeño', text: '¿Cómo califica la confidencialidad?', weight: 6 },
];

const asistente_questions: EvalQuestion[] = [
  { id: 'as1', category: 'Desempeño', text: '¿Cómo califica la atención telefónica y manejo de agenda?', weight: 10 },
  { id: 'as2', category: 'Desempeño', text: '¿Cómo califica la organización de archivos y correspondencia?', weight: 10 },
  { id: 'as3', category: 'Cumplimiento', text: '¿Cómo califica la entrega de tareas en tiempo?', weight: 9 },
  { id: 'as4', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación efectiva?', weight: 9 },
  { id: 'as5', category: 'Habilidades Blandas', text: '¿Cómo califica el trabajo en equipo?', weight: 9 },
  { id: 'as6', category: 'Desempeño', text: '¿Cómo califica la discreción y confidencialidad?', weight: 8 },
  { id: 'as7', category: 'Actitud', text: '¿Cómo califica la iniciativa y proactividad?', weight: 8 },
  { id: 'as8', category: 'Actitud', text: '¿Cómo califica la actitud de servicio?', weight: 8 },
  { id: 'as9', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?', weight: 8 },
  { id: 'as10', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación con su equipo de trabajo?', weight: 7 },
  { id: 'as11', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad ante nuevas tareas?', weight: 7 },
  { id: 'as12', category: 'Desempeño', text: '¿Cómo califica el manejo de herramientas de oficina?', weight: 7 },
];

const archivoSoporteQuestions: EvalQuestion[] = [
  { id: 'ar1', category: 'Desempeño', text: '¿Cómo califica la organización y gestión de archivos?', weight: 12 },
  { id: 'ar2', category: 'Cumplimiento', text: '¿Cómo califica la entrega de tareas en tiempo?', weight: 10 },
  { id: 'ar3', category: 'Desempeño', text: '¿Cómo califica la atención al detalle en documentación?', weight: 10 },
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
  counsel: socioQuestions, // Comparte preguntas de competencias/blandas con Socio; las técnicas vienen de technicalQuestions

  asociado_sr: asociadoSrQuestions,
  asociado_mid: asociadoMidQuestions,
  asociado_jr: asociadoJrQuestions,
  pasante_carrera: pasanteCarreraQuestions,
  pasante: pasanteCorporativoQuestions,
  director: directorQuestions,
  gerente: gerenteQuestions,
  coordinador: coordinadorQuestions,
  analista: analistaQuestions,
  asistente: asistente_questions,
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
  if (customQuestions && customQuestions[position]) return customQuestions[position];
  return QUESTIONS_BY_POSITION[position];
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
 * - Los pesos individuales se reescalan dentro de cada sección para que la
 *   suma respete el peso global de la sección (SECTION_WEIGHTS).
 */
export function getQuestionsForUser(
  user: Pick<User, 'position' | 'practiceArea'>,
  customQuestions?: Record<string, EvalQuestion[]>,
): EvalQuestion[] {
  const position = user.position;
  const level = POSITION_LEVELS[position];
  const sectionWeights = getSectionWeights(position);
  const template = (customQuestions && customQuestions[position]) || QUESTIONS_BY_POSITION[position] || [];

  // Particionar plantilla por sección.
  // Para legal: las preguntas técnicas vienen del catálogo de área (technicalQuestions.ts).
  // Para administrativo: las preguntas técnicas (Desempeño/Cumplimiento) vienen de la plantilla del puesto.
  const tplCompetencias = template.filter(q => getSectionForQuestion(q, position) === 'competencias');
  const tplBlandas = template.filter(q => getSectionForQuestion(q, position) === 'blandas');
  const tplTecnico = template.filter(q => getSectionForQuestion(q, position) === 'tecnico');

  // Técnicas: para legal vienen del catálogo de área; para admin vienen de la plantilla del puesto.
  const tecnicas: EvalQuestion[] = level === 'legal'
    ? getTechnicalQuestions(position, user.practiceArea || 'corporativo')
    : tplTecnico;

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
