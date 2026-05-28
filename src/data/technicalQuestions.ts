import { EvalQuestion, Position, PracticeArea, normalizePosition, normalizePracticeArea } from '@/types';

/**
 * Criterios técnicos (preguntas) por área de práctica y nivel.
 * Fuente: archivo "Criterio Juridico - SDC.xlsx", hoja "Pregunta de Criterio técnico".
 *
 * Aplica únicamente a posiciones legales. Cada (área, posición) tiene 5 preguntas
 * con peso relativo: 8 para posiciones junior (pasante/asoc_jr), 12 para posiciones
 * senior (asociado_mid+). Los pesos se reescalan dentro de la sección "tecnico"
 * para respetar el peso global definido en sectionWeights.ts.
 *
 * Las 14 sub-categorías dan granularidad por área de práctica y tipo de competencia técnica.
 * Counsel tiene sus propias preguntas de técnico.
 *
 * Se incluyen aliases para posiciones legacy (pasante_corporativo) y áreas de práctica
 * legacy (consultoria_fiscal, litigio_fiscal, general) para compatibilidad con datos existentes.
 */

type LegalPosition = 'socio' | 'salary_partner' | 'counsel' | 'asociado_sr' | 'asociado_mid'
  | 'asociado_jr' | 'pasante_carrera' | 'pasante' | 'pasante_corporativo' | 'abogado';

// Canonical practice area keys used in TECHNICAL_BY_AREA
type CanonicalPracticeArea = 'fiscal_consultoria' | 'fiscal_litigio' | 'corporativo';

// ─── Corporativo ──────────────────────────────────────────────────────────

const corporativo: Record<LegalPosition, EvalQuestion[]> = {
  pasante: [
    { id: 'tc-corp-pas-1', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Identifica de manera correcta documentos básicos como actas y contratos?' },
    { id: 'tc-corp-pas-2', category: 'Redacción legal', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Llena de forma adecuada y precisa los formatos predefinidos?' },
    { id: 'tc-corp-pas-3', category: 'Due diligence', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Apoya de manera eficiente en la recopilación de documentos solicitados?' },
    { id: 'tc-corp-pas-4', category: 'Constitución y modificaciones', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Realiza búsquedas en el registro público de la propiedad y del comercio o guía trámites de forma correcta?' },
    { id: 'tc-corp-pas-5', category: 'Atención a clientes', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Escucha atentamente las reuniones internas y toma notas completas y ordenadas?' },
  ],
  pasante_corporativo: [
    { id: 'tc-corp-pas-1', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Identifica de manera correcta documentos básicos como actas y contratos?' },
    { id: 'tc-corp-pas-2', category: 'Redacción legal', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Llena de forma adecuada y precisa los formatos predefinidos?' },
    { id: 'tc-corp-pas-3', category: 'Due diligence', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Apoya de manera eficiente en la recopilación de documentos solicitados?' },
    { id: 'tc-corp-pas-4', category: 'Constitución y modificaciones', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Realiza búsquedas en el registro público de la propiedad y del comercio o guía trámites de forma correcta?' },
    { id: 'tc-corp-pas-5', category: 'Atención a clientes', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Escucha atentamente las reuniones internas y toma notas completas y ordenadas?' },
  ],
  pasante_carrera: [
    { id: 'tc-corp-pct-1', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Conoce y aplica principios generales del derecho corporativo al realizar sus tareas?' },
    { id: 'tc-corp-pct-2', category: 'Redacción legal', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Redacta borradores simples con guía, iniciando a trabajar en dos idiomas cuando es requerido?' },
    { id: 'tc-corp-pct-3', category: 'Due diligence', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Sistematiza documentos y apoya en la identificación de hallazgos simples de relevancia legal?' },
    { id: 'tc-corp-pct-4', category: 'Constitución y modificaciones', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Prepara formatos con supervisión, asegurando precisión y congruencia en la información?' },
    { id: 'tc-corp-pct-5', category: 'Atención a clientes', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Participa como apoyo en la elaboración de respuestas básicas a clientes o autoridades?' },
  ],
  abogado: [
    { id: 'tc-corp-ajr-1', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Aplica correctamente las normas societarias básicas en los asuntos que gestiona?' },
    { id: 'tc-corp-ajr-2', category: 'Redacción legal', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Redacta documentos sencillos utilizando vocabulario técnico en inglés y español de manera adecuada?' },
    { id: 'tc-corp-ajr-3', category: 'Due diligence', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Identifica irregularidades evidentes en documentos o procesos societarios?' },
    { id: 'tc-corp-ajr-4', category: 'Constitución y modificaciones', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Tramita asambleas y poderes básicos siguiendo los procedimientos establecidos?' },
    { id: 'tc-corp-ajr-5', category: 'Atención a clientes', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Da seguimiento técnico inicial a los asuntos, asegurando su avance conforme a lo planificado?' },
  ],
  asociado_jr: [
    { id: 'tc-corp-ajr-1', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Aplica correctamente las normas societarias básicas en los asuntos que gestiona?' },
    { id: 'tc-corp-ajr-2', category: 'Redacción legal', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Redacta documentos sencillos utilizando vocabulario técnico en inglés y español de manera adecuada?' },
    { id: 'tc-corp-ajr-3', category: 'Due diligence', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Identifica irregularidades evidentes en documentos o procesos societarios?' },
    { id: 'tc-corp-ajr-4', category: 'Constitución y modificaciones', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Tramita asambleas y poderes básicos siguiendo los procedimientos establecidos?' },
    { id: 'tc-corp-ajr-5', category: 'Atención a clientes', section: 'tecnico', practiceArea: 'corporativo', weight: 8, text: '¿Da seguimiento técnico inicial a los asuntos, asegurando su avance conforme a lo planificado?' },
  ],
  asociado_mid: [
    { id: 'tc-corp-amd-1', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Analiza de manera adecuada las implicaciones jurídicas de los asuntos que gestiona?' },
    { id: 'tc-corp-amd-2', category: 'Redacción legal', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Elabora contratos incluyendo cláusulas específicas que respondan a las necesidades del cliente?' },
    { id: 'tc-corp-amd-3', category: 'Due diligence', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Redacta reportes técnicos claros, precisos y completos?' },
    { id: 'tc-corp-amd-4', category: 'Constitución y modificaciones', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Coordina asambleas y modificaciones societarias complejas con criterio profesional?' },
    { id: 'tc-corp-amd-5', category: 'Atención a clientes', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Gestiona la relación con el cliente, respondiendo oportunamente a sus consultas?' },
  ],
  asociado_sr: [
    { id: 'tc-corp-asr-1', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Domina las disposiciones legales aplicables y las aplica con criterio en casos complejos?' },
    { id: 'tc-corp-asr-2', category: 'Redacción legal', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Elabora documentos jurídicos sofisticados con alto nivel de precisión y detalle?' },
    { id: 'tc-corp-asr-3', category: 'Due diligence', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Lidera procesos de revisión exhaustiva identificando riesgos y oportunidades legales?' },
    { id: 'tc-corp-asr-4', category: 'Constitución y modificaciones', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Diseña y supervisa estructuras societarias complejas con visión estratégica?' },
    { id: 'tc-corp-asr-5', category: 'Atención a clientes', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Asesora estratégicamente al cliente, anticipando escenarios y proponiendo soluciones?' },
  ],
  counsel: [
    { id: 'tc-corp-cns-1', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Domina las disposiciones legales aplicables y las aplica con criterio en casos complejos?' },
    { id: 'tc-corp-cns-2', category: 'Redacción legal', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Elabora documentos jurídicos sofisticados con alto nivel de precisión y detalle?' },
    { id: 'tc-corp-cns-3', category: 'Due diligence', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Lidera procesos de revisión exhaustiva identificando riesgos y oportunidades legales?' },
    { id: 'tc-corp-cns-4', category: 'Constitución y modificaciones', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Diseña y supervisa estructuras societarias complejas con visión estratégica?' },
    { id: 'tc-corp-cns-5', category: 'Atención a clientes', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Asesora estratégicamente al cliente, anticipando escenarios y proponiendo soluciones?' },
  ],
  salary_partner: [
    { id: 'tc-corp-sp-1', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Domina las disposiciones legales aplicables y las aplica con criterio en casos complejos?' },
    { id: 'tc-corp-sp-2', category: 'Redacción legal', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Elabora documentos jurídicos sofisticados con alto nivel de precisión y detalle?' },
    { id: 'tc-corp-sp-3', category: 'Due diligence', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Lidera procesos de revisión exhaustiva identificando riesgos y oportunidades legales?' },
    { id: 'tc-corp-sp-4', category: 'Constitución y modificaciones', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Diseña y supervisa estructuras societarias complejas con visión estratégica?' },
    { id: 'tc-corp-sp-5', category: 'Atención a clientes', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Asesora estratégicamente al cliente, anticipando escenarios y proponiendo soluciones?' },
  ],
  socio: [
    { id: 'tc-corp-soc-1', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Domina las disposiciones legales aplicables y las aplica con criterio en casos complejos?' },
    { id: 'tc-corp-soc-2', category: 'Redacción legal', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Elabora documentos jurídicos sofisticados con alto nivel de precisión y detalle?' },
    { id: 'tc-corp-soc-3', category: 'Due diligence', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Lidera procesos de revisión exhaustiva identificando riesgos y oportunidades legales?' },
    { id: 'tc-corp-soc-4', category: 'Constitución y modificaciones', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Diseña y supervisa estructuras societarias complejas con visión estratégica?' },
    { id: 'tc-corp-soc-5', category: 'Atención a clientes', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Asesora estratégicamente al cliente, anticipando escenarios y proponiendo soluciones?' },
  ],
};

// ─── Consultoría Fiscal ───────────────────────────────────────────────────

const consultoria: Record<LegalPosition, EvalQuestion[]> = {
  pasante: [
    { id: 'tc-cf-pas-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Identifica las disposiciones fiscales básicas aplicables a los clientes?' },
    { id: 'tc-cf-pas-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Apoya en la elaboración de opiniones fiscales sencillas bajo supervisión?' },
    { id: 'tc-cf-pas-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Recopila información y documentos necesarios para los casos de consultoría fiscal?' },
    { id: 'tc-cf-pas-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Realiza búsquedas básicas de criterios y jurisprudencia relevantes?' },
    { id: 'tc-cf-pas-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Organiza archivos y documentos fiscales de forma ordenada?' },
  ],
  pasante_corporativo: [
    { id: 'tc-cf-pas-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Identifica las disposiciones fiscales básicas aplicables a los clientes?' },
    { id: 'tc-cf-pas-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Apoya en la elaboración de opiniones fiscales sencillas bajo supervisión?' },
    { id: 'tc-cf-pas-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Recopila información y documentos necesarios para los casos de consultoría fiscal?' },
    { id: 'tc-cf-pas-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Realiza búsquedas básicas de criterios y jurisprudencia relevantes?' },
    { id: 'tc-cf-pas-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Organiza archivos y documentos fiscales de forma ordenada?' },
  ],
  pasante_carrera: [
    { id: 'tc-cf-pct-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Conoce y aplica las disposiciones fiscales básicas en los trabajos que le son asignados?' },
    { id: 'tc-cf-pct-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Participa en la preparación de opiniones fiscales simples con supervisión?' },
    { id: 'tc-cf-pct-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Apoya en la recopilación y análisis de información para la planeación fiscal?' },
    { id: 'tc-cf-pct-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Busca y resume criterios y jurisprudencia relevante bajo supervisión?' },
    { id: 'tc-cf-pct-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Organiza y sistematiza la información fiscal de los casos asignados?' },
  ],
  abogado: [
    { id: 'tc-cf-ajr-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Aplica correctamente las disposiciones fiscales vigentes en los asuntos que gestiona?' },
    { id: 'tc-cf-ajr-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Prepara opiniones fiscales sencillas con supervisión y precisión?' },
    { id: 'tc-cf-ajr-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Apoya en la elaboración de estrategias de planeación fiscal básicas?' },
    { id: 'tc-cf-ajr-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Identifica criterios y jurisprudencia relevante para los casos bajo su responsabilidad?' },
    { id: 'tc-cf-ajr-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Calcula impactos fiscales básicos con guía y precisión?' },
  ],
  asociado_jr: [
    { id: 'tc-cf-ajr-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Aplica correctamente las disposiciones fiscales vigentes en los asuntos que gestiona?' },
    { id: 'tc-cf-ajr-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Prepara opiniones fiscales sencillas con supervisión y precisión?' },
    { id: 'tc-cf-ajr-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Apoya en la elaboración de estrategias de planeación fiscal básicas?' },
    { id: 'tc-cf-ajr-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Identifica criterios y jurisprudencia relevante para los casos bajo su responsabilidad?' },
    { id: 'tc-cf-ajr-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Calcula impactos fiscales básicos con guía y precisión?' },
  ],
  asociado_mid: [
    { id: 'tc-cf-amd-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Interpreta y aplica correctamente las disposiciones fiscales en casos de complejidad media?' },
    { id: 'tc-cf-amd-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Elabora opiniones fiscales claras y bien fundamentadas?' },
    { id: 'tc-cf-amd-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Diseña estrategias de planeación fiscal efectivas para los clientes?' },
    { id: 'tc-cf-amd-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Analiza criterios y jurisprudencia para sustentar las posiciones fiscales del despacho?' },
    { id: 'tc-cf-amd-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Calcula impactos fiscales con precisión y presenta alternativas al cliente?' },
  ],
  asociado_sr: [
    { id: 'tc-cf-asr-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Domina las disposiciones fiscales y las aplica con criterio en casos complejos?' },
    { id: 'tc-cf-asr-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Elabora opiniones fiscales de alta calidad y complejidad?' },
    { id: 'tc-cf-asr-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Diseña estrategias de planeación fiscal innovadoras y efectivas?' },
    { id: 'tc-cf-asr-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Integra criterios y jurisprudencia relevante para fundamentar posiciones fiscales complejas?' },
    { id: 'tc-cf-asr-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Evalúa impactos fiscales de operaciones complejas y propone soluciones?' },
  ],
  counsel: [
    { id: 'tc-cf-cns-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Domina las disposiciones fiscales y las aplica con criterio en casos complejos?' },
    { id: 'tc-cf-cns-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Elabora opiniones fiscales de alta calidad y complejidad?' },
    { id: 'tc-cf-cns-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Diseña estrategias de planeación fiscal innovadoras y efectivas?' },
    { id: 'tc-cf-cns-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Integra criterios y jurisprudencia relevante para fundamentar posiciones fiscales complejas?' },
    { id: 'tc-cf-cns-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Evalúa impactos fiscales de operaciones complejas y propone soluciones?' },
  ],
  salary_partner: [
    { id: 'tc-cf-sp-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Establece la visión y estrategia fiscal del área de consultoría?' },
    { id: 'tc-cf-sp-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Firma opiniones fiscales de mayor complejidad y trascendencia?' },
    { id: 'tc-cf-sp-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Lidera estrategias de planeación fiscal para los clientes más importantes?' },
    { id: 'tc-cf-sp-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Interpreta criterios y jurisprudencia para establecer la posición institucional?' },
    { id: 'tc-cf-sp-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Evalúa impactos fiscales estratégicos y dirige la respuesta institucional?' },
  ],
  socio: [
    { id: 'tc-cf-soc-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Establece la visión y estrategia fiscal del área de consultoría?' },
    { id: 'tc-cf-soc-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Firma opiniones fiscales de mayor complejidad y trascendencia?' },
    { id: 'tc-cf-soc-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Lidera estrategias de planeación fiscal para los clientes más importantes?' },
    { id: 'tc-cf-soc-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Interpreta criterios y jurisprudencia para establecer la posición institucional?' },
    { id: 'tc-cf-soc-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Evalúa impactos fiscales estratégicos y dirige la respuesta institucional?' },
  ],
};

// ─── Litigio Fiscal ────────────────────────────────────────────────────────

const litigio: Record<LegalPosition, EvalQuestion[]> = {
  pasante: [
    { id: 'tc-lf-pas-1', category: 'Redacción de escritos', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Identifica de manera correcta documentos básicos como actas y contratos?' },
    { id: 'tc-lf-pas-2', category: 'Estrategia procesal', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Llena de forma adecuada y precisa los formatos predefinidos?' },
    { id: 'tc-lf-pas-3', category: 'Audiencias y diligencias', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Apoya de manera eficiente en la recopilación de documentos solicitados?' },
    { id: 'tc-lf-pas-4', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Realiza búsquedas en el registro público de la propiedad y del comercio o guía trámites de forma correcta?' },
    { id: 'tc-lf-pas-5', category: 'Seguimiento de expedientes', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Escucha atentamente las reuniones internas y toma notas completas y ordenadas?' },
  ],
  pasante_corporativo: [
    { id: 'tc-lf-pas-1', category: 'Redacción de escritos', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Identifica de manera correcta documentos básicos como actas y contratos?' },
    { id: 'tc-lf-pas-2', category: 'Estrategia procesal', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Llena de forma adecuada y precisa los formatos predefinidos?' },
    { id: 'tc-lf-pas-3', category: 'Audiencias y diligencias', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Apoya de manera eficiente en la recopilación de documentos solicitados?' },
    { id: 'tc-lf-pas-4', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Realiza búsquedas en el registro público de la propiedad y del comercio o guía trámites de forma correcta?' },
    { id: 'tc-lf-pas-5', category: 'Seguimiento de expedientes', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Escucha atentamente las reuniones internas y toma notas completas y ordenadas?' },
  ],
  pasante_carrera: [
    { id: 'tc-lf-pct-1', category: 'Redacción de escritos', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Conoce y aplica principios generales del derecho procesal fiscal al realizar sus tareas?' },
    { id: 'tc-lf-pct-2', category: 'Estrategia procesal', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Redacta borradores simples con guía, iniciando a trabajar en dos idiomas cuando es requerido?' },
    { id: 'tc-lf-pct-3', category: 'Audiencias y diligencias', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Sistematiza documentos y apoya en la identificación de hallazgos simples de relevancia legal?' },
    { id: 'tc-lf-pct-4', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Prepara formatos con supervisión, asegurando precisión y congruencia en la información?' },
    { id: 'tc-lf-pct-5', category: 'Seguimiento de expedientes', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Participa como apoyo en la elaboración de respuestas básicas a clientes o autoridades?' },
  ],
  abogado: [
    { id: 'tc-lf-ajr-1', category: 'Redacción de escritos', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Redacta escritos iniciales y respuestas con precisión y fundamento jurídico?' },
    { id: 'tc-lf-ajr-2', category: 'Estrategia procesal', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Aplica correctamente las normas procesales básicas en los asuntos que gestiona?' },
    { id: 'tc-lf-ajr-3', category: 'Audiencias y diligencias', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Prepara adecuadamente los expedientes para audiencias y diligencias?' },
    { id: 'tc-lf-ajr-4', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Identifica la normativa aplicable y la aplica de forma correcta en los asuntos asignados?' },
    { id: 'tc-lf-ajr-5', category: 'Seguimiento de expedientes', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Da seguimiento oportuno a los expedientes bajo su responsabilidad?' },
  ],
  asociado_jr: [
    { id: 'tc-lf-ajr-1', category: 'Redacción de escritos', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Redacta escritos iniciales y respuestas con precisión y fundamento jurídico?' },
    { id: 'tc-lf-ajr-2', category: 'Estrategia procesal', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Aplica correctamente las normas procesales básicas en los asuntos que gestiona?' },
    { id: 'tc-lf-ajr-3', category: 'Audiencias y diligencias', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Prepara adecuadamente los expedientes para audiencias y diligencias?' },
    { id: 'tc-lf-ajr-4', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Identifica la normativa aplicable y la aplica de forma correcta en los asuntos asignados?' },
    { id: 'tc-lf-ajr-5', category: 'Seguimiento de expedientes', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Da seguimiento oportuno a los expedientes bajo su responsabilidad?' },
  ],
  asociado_mid: [
    { id: 'tc-lf-amd-1', category: 'Redacción de escritos', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Redacta escritos complejos con argumentación jurídica sólida y estructurada?' },
    { id: 'tc-lf-amd-2', category: 'Estrategia procesal', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Diseña estrategias procesales efectivas para la defensa de los intereses del cliente?' },
    { id: 'tc-lf-amd-3', category: 'Audiencias y diligencias', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Representa al cliente en audiencias con preparación y solidez técnica?' },
    { id: 'tc-lf-amd-4', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Integra legislación y jurisprudencia relevante en la preparación y defensa de los casos?' },
    { id: 'tc-lf-amd-5', category: 'Seguimiento de expedientes', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Supervisa los tiempos procesales y notificaciones asegurando que los plazos se cumplan correctamente?' },
  ],
  asociado_sr: [
    { id: 'tc-lf-asr-1', category: 'Redacción de escritos', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Formula escritos complejos con una estrategia legal clara y coherente?' },
    { id: 'tc-lf-asr-2', category: 'Estrategia procesal', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Diseña estrategias integrales y representa al cliente de manera efectiva ante autoridades fiscales y tribunales?' },
    { id: 'tc-lf-asr-3', category: 'Audiencias y diligencias', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Negocia acuerdos relevantes y defiende con solidez la estrategia procesal planteada?' },
    { id: 'tc-lf-asr-4', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Propone argumentos innovadores fundamentados en doctrina y criterios legales aplicables?' },
    { id: 'tc-lf-asr-5', category: 'Seguimiento de expedientes', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Coordina equipos de trabajo y asegura la correcta ejecución de la estrategia jurídica en una cartera de casos?' },
  ],
  counsel: [
    { id: 'tc-lf-cns-1', category: 'Redacción de escritos', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Formula la teoría del caso en recursos complejos, integrando argumentos constitucionales y de derechos humanos?' },
    { id: 'tc-lf-cns-2', category: 'Estrategia procesal', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Diseña la estrategia de defensa integral para asuntos de alta cuantía, previendo escenarios ante diversas instancias?' },
    { id: 'tc-lf-cns-3', category: 'Audiencias y diligencias', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Lidera negociaciones ante autoridades y representa al despacho con solidez técnica en audiencias críticas?' },
    { id: 'tc-lf-cns-4', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Integra doctrina jurídica y criterios de la SCJN para crear precedentes favorables en la defensa de los clientes?' },
    { id: 'tc-lf-cns-5', category: 'Seguimiento de expedientes', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Supervisa la ejecución impecable de la cartera de juicios, asegurando la rentabilidad y el cumplimiento de objetivos?' },
  ],
  salary_partner: [
    { id: 'tc-lf-sp-1', category: 'Redacción de escritos', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Formula la teoría del caso en recursos complejos, integrando argumentos constitucionales y de derechos humanos?' },
    { id: 'tc-lf-sp-2', category: 'Estrategia procesal', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Diseña la estrategia de defensa integral para asuntos de alta cuantía, previendo escenarios ante diversas instancias?' },
    { id: 'tc-lf-sp-3', category: 'Audiencias y diligencias', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Lidera negociaciones ante autoridades y representa al despacho con solidez técnica en audiencias críticas?' },
    { id: 'tc-lf-sp-4', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Integra doctrina jurídica y criterios de la SCJN para crear precedentes favorables en la defensa de los clientes?' },
    { id: 'tc-lf-sp-5', category: 'Seguimiento de expedientes', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Supervisa la ejecución impecable de la cartera de juicios, asegurando la rentabilidad y el cumplimiento de objetivos?' },
  ],
  socio: [
    { id: 'tc-lf-soc-1', category: 'Redacción de escritos', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Formula la teoría del caso en recursos complejos, integrando argumentos constitucionales y de derechos humanos?' },
    { id: 'tc-lf-soc-2', category: 'Estrategia procesal', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Diseña la estrategia de defensa integral para asuntos de alta cuantía, previendo escenarios ante diversas instancias?' },
    { id: 'tc-lf-soc-3', category: 'Audiencias y diligencias', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Lidera negociaciones ante autoridades y representa al despacho con solidez técnica en audiencias críticas?' },
    { id: 'tc-lf-soc-4', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Integra doctrina jurídica y criterios de la SCJN para crear precedentes favorables en la defensa de los clientes?' },
    { id: 'tc-lf-soc-5', category: 'Seguimiento de expedientes', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Supervisa la ejecución impecable de la cartera de juicios, asegurando la rentabilidad y el cumplimiento de objetivos?' },
  ],
};

export const TECHNICAL_BY_AREA: Record<CanonicalPracticeArea, Record<LegalPosition, EvalQuestion[]>> = {
  corporativo,
  fiscal_consultoria: consultoria,
  fiscal_litigio: litigio,
};

const LEGAL_POSITIONS: LegalPosition[] = [
  'socio', 'salary_partner', 'counsel', 'asociado_sr', 'asociado_mid', 'asociado_jr', 'abogado', 'pasante_carrera', 'pasante', 'pasante_corporativo',
];

/**
 * Devuelve las preguntas técnicas para una posición legal y área de práctica dadas.
 * Para posiciones no-legales retorna [].
 * Normaliza posiciones y áreas de práctica legacy.
 */
export function getTechnicalQuestions(position: Position, area?: PracticeArea): EvalQuestion[] {
  const normalizedPos = normalizePosition(position);
  if (!LEGAL_POSITIONS.includes(normalizedPos as LegalPosition)) return [];
  const effectivePos = normalizedPos as LegalPosition;
  const canonicalArea = normalizePracticeArea(area || 'corporativo');
  if (canonicalArea === 'backoffice') return corporativo[effectivePos];
  return TECHNICAL_BY_AREA[canonicalArea]?.[effectivePos] || corporativo[effectivePos];
}
