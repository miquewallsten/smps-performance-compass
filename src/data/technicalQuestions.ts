import { EvalQuestion, Position, PracticeArea } from '@/types';

/**
 * Criterios técnicos (preguntas) por área de práctica y posición.
 * Fuente: archivo "Criterio Juridico - SDC.xlsx", hoja "Pregunta de Criterio técnico".
 *
 * Aplica únicamente a posiciones legales. Cada (área, posición) tiene 5 preguntas
 * con peso relativo: 8 para posiciones junior (pasante/asoc_jr), 12 para posiciones
 * senior (asociado_mid+). Los pesos se reescalan dentro de la sección "tecnico"
 * para respetar el peso global definido en sectionWeights.ts.
 *
 * Las 14 sub-categorías reemplazan la categoría plana "Criterio Técnico" anterior,
 * dando granularidad por área de práctica y tipo de competencia técnica.
 * Counsel ahora tiene sus propias preguntas (antes compartía las de socio).
 */

type LegalPosition = 'socio' | 'salary_partner' | 'counsel' | 'asociado_sr' | 'asociado_mid'
  | 'asociado_jr' | 'pasante_carrera' | 'pasante';

const corporativo: Record<LegalPosition, EvalQuestion[]> = {
  pasante: [
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
    { id: 'tc-corp-amd-4', category: 'Constitución y modificaciones', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Ejecuta reestructuras sencillas siguiendo lineamientos legales y corporativos?' },
    { id: 'tc-corp-amd-5', category: 'Atención a clientes', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Atiende requerimientos con autonomía, identificando riesgos y definiendo acciones concretas y ejecutables?' },
  ],
  asociado_sr: [
    { id: 'tc-corp-asr-1', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Diseña estructuras y soluciones legales complejas que atienden las necesidades estratégicas del cliente?' },
    { id: 'tc-corp-asr-2', category: 'Redacción legal', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Redacta y revisa con precisión piezas contractuales estratégicas que protegen los intereses del cliente?' },
    { id: 'tc-corp-asr-3', category: 'Due diligence', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Lidera procesos corporativos relevantes e interpreta adecuadamente riesgos legales complejos?' },
    { id: 'tc-corp-asr-4', category: 'Constitución y modificaciones', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Propone estructuras legales sólidas y asesora de manera efectiva en procesos de reorganización corporativa?' },
    { id: 'tc-corp-asr-5', category: 'Atención a clientes', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Representa al cliente con solidez y brinda asesoría confiable en estructuras legales complejas?' },
  ],
  counsel: [
    { id: 'tc-corp-cns-1', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Asegura estructuras legales viables y anticipa riesgos regulatorios transversales que impactan el negocio del cliente?' },
    { id: 'tc-corp-cns-2', category: 'Redacción legal', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Asegura que la redacción estratégica y el lenguaje jurídico blinden los intereses institucionales en transacciones críticas?' },
    { id: 'tc-corp-cns-3', category: 'Due diligence', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Lidera auditorías estratégicas, interpretando riesgos críticos y definiendo planes de mitigación de alto nivel?' },
    { id: 'tc-corp-cns-4', category: 'Constitución y modificaciones', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Asesora en procesos de reorganización corporativa, fusiones o adquisiciones con una visión de rentabilidad y eficiencia?' },
    { id: 'tc-corp-cns-5', category: 'Atención a clientes', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Actúa como asesor estratégico de cabecera para los tomadores de decisión (C-Level), generando confianza institucional?' },
  ],
  salary_partner: [
    { id: 'tc-corp-sp-1', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Asegura estructuras legales viables y anticipa riesgos regulatorios transversales que impactan el negocio del cliente?' },
    { id: 'tc-corp-sp-2', category: 'Redacción legal', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Asegura que la redacción estratégica y el lenguaje jurídico blinden los intereses institucionales en transacciones críticas?' },
    { id: 'tc-corp-sp-3', category: 'Due diligence', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Lidera auditorías estratégicas, interpretando riesgos críticos y definiendo planes de mitigación de alto nivel?' },
    { id: 'tc-corp-sp-4', category: 'Constitución y modificaciones', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Asesora en procesos de reorganización corporativa, fusiones o adquisiciones con una visión de rentabilidad y eficiencia?' },
    { id: 'tc-corp-sp-5', category: 'Atención a clientes', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Actúa como asesor estratégico de cabecera para los tomadores de decisión (C-Level), generando confianza institucional?' },
  ],
  socio: [
    { id: 'tc-corp-soc-1', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Asegura estructuras legales viables y anticipa riesgos regulatorios transversales que impactan el negocio del cliente?' },
    { id: 'tc-corp-soc-2', category: 'Redacción legal', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Asegura que la redacción estratégica y el lenguaje jurídico blinden los intereses institucionales en transacciones críticas?' },
    { id: 'tc-corp-soc-3', category: 'Due diligence', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Lidera auditorías estratégicas, interpretando riesgos críticos y definiendo planes de mitigación de alto nivel?' },
    { id: 'tc-corp-soc-4', category: 'Constitución y modificaciones', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Asesora en procesos de reorganización corporativa, fusiones o adquisiciones con una visión de rentabilidad y eficiencia?' },
    { id: 'tc-corp-soc-5', category: 'Atención a clientes', section: 'tecnico', practiceArea: 'corporativo', weight: 12, text: '¿Actúa como asesor estratégico de cabecera para los tomadores de decisión (C-Level), generando confianza institucional?' },
  ],
};

const consultoria: Record<LegalPosition, EvalQuestion[]> = {
  pasante: [
    { id: 'tc-fc-pas-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Distingue correctamente los impuestos básicos y los artículos clave aplicables?' },
    { id: 'tc-fc-pas-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Apoya de manera efectiva en el acopio de información legal solicitada?' },
    { id: 'tc-fc-pas-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Participa en análisis cuantitativo básico con precision?' },
    { id: 'tc-fc-pas-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Localiza criterios relevantes en buscadores jurídicos de forma eficiente?' },
    { id: 'tc-fc-pas-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Calcula cifras siguiendo las indicaciones dadas de manera correcta?' },
  ],
  pasante_carrera: [
    { id: 'tc-fc-pct-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Conoce y comprende la estructura de las leyes fiscales aplicables a su trabajo?' },
    { id: 'tc-fc-pct-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Integra insumos y documentación con supervisión, asegurando su congruencia y completitud?' },
    { id: 'tc-fc-pct-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Identifica posibles impactos fiscales con guía y orientación del equipo?' },
    { id: 'tc-fc-pct-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Relaciona y aplica jurisprudencia básica relevante a los casos que apoya?' },
    { id: 'tc-fc-pct-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Participa en la estimación de efectos fiscales básicos, siguiendo instrucciones y validando resultados con su supervisor?' },
  ],
  asociado_jr: [
    { id: 'tc-fc-ajr-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Aplica correctamente las normas básicas de ISR, IVA y CFF en los casos asignados?' },
    { id: 'tc-fc-ajr-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Redacta secciones de opiniones fiscales de manera clara y técnica?' },
    { id: 'tc-fc-ajr-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Propone escenarios fiscales considerando distintas alternativas y su impacto?' },
    { id: 'tc-fc-ajr-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Integra criterios fiscales y normativos en los análisis técnicos que realiza?' },
    { id: 'tc-fc-ajr-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 8, text: '¿Estima las implicaciones tributarias de manera coherente y fundamentada?' },
  ],
  asociado_mid: [
    { id: 'tc-fc-amd-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿interpreta correctamente las reformas fiscales y su aplicación en los casos asignados?' },
    { id: 'tc-fc-amd-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Desarrolla argumentos y conclusiones tecnicas solidas y fundamentadas?' },
    { id: 'tc-fc-amd-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Evalúa alternativas fiscales viables, considerando impactos y beneficios para el cliente?' },
    { id: 'tc-fc-amd-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Interpreta criterios relevantes y jurisprudencia aplicable de manera adecuada?' },
    { id: 'tc-fc-amd-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Evalúa riesgos colaterales y propone medidas para mitigarlos?' },
  ],
  asociado_sr: [
    { id: 'tc-fc-asr-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Diseña estrategias fiscales avanzadas alineadas con las necesidades del cliente y el marco normativo vigente?' },
    { id: 'tc-fc-asr-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Sustenta criterios técnicos de alto nivel con argumentos sólidos y actualizados?' },
    { id: 'tc-fc-asr-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Diseña y valida esquemas fiscales estratégicos con seguridad jurídica y viabilidad práctica?' },
    { id: 'tc-fc-asr-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Anticipa riesgos y defiende de manera efectiva la posición del cliente frente al SAT o tribunales?' },
    { id: 'tc-fc-asr-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Mide con precisión el impacto financiero, reputacional, legal y de cumplimiento de las estrategias fiscales propuestas?' },
  ],
  counsel: [
    { id: 'tc-fc-cns-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Asegura estructuras legales viables y anticipa riesgos regulatorios transversales que impactan el negocio del cliente?' },
    { id: 'tc-fc-cns-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Valida criterios técnicos de vanguardia con argumentos jurídicos sólidos que minimizan la vulnerabilidad del despacho?' },
    { id: 'tc-fc-cns-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Lidera modelos de eficiencia fiscal asegurando siempre la viabilidad práctica y el cumplimiento ético estricto?' },
    { id: 'tc-fc-cns-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Propone argumentos innovadores basados en tendencias de fiscalización y criterios jurisdiccionales de vanguardia?' },
    { id: 'tc-fc-cns-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Evalúa con precisión el impacto financiero y reputacional de las alternativas fiscales propuestas al cliente?' },
  ],
  salary_partner: [
    { id: 'tc-fc-sp-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Asegura estructuras legales viables y anticipa riesgos regulatorios transversales que impactan el negocio del cliente?' },
    { id: 'tc-fc-sp-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Valida criterios técnicos de vanguardia con argumentos jurídicos sólidos que minimizan la vulnerabilidad del despacho?' },
    { id: 'tc-fc-sp-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Lidera modelos de eficiencia fiscal asegurando siempre la viabilidad práctica y el cumplimiento ético estricto?' },
    { id: 'tc-fc-sp-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Propone argumentos innovadores basados en tendencias de fiscalización y criterios jurisdiccionales de vanguardia?' },
    { id: 'tc-fc-sp-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Evalúa con precisión el impacto financiero y reputacional de las alternativas fiscales propuestas al cliente?' },
  ],
  socio: [
    { id: 'tc-fc-soc-1', category: 'Normatividad fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Asegura estructuras legales viables y anticipa riesgos regulatorios transversales que impactan el negocio del cliente?' },
    { id: 'tc-fc-soc-2', category: 'Opiniones fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Valida criterios técnicos de vanguardia con argumentos jurídicos sólidos que minimizan la vulnerabilidad del despacho?' },
    { id: 'tc-fc-soc-3', category: 'Planeación fiscal', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Lidera modelos de eficiencia fiscal asegurando siempre la viabilidad práctica y el cumplimiento ético estricto?' },
    { id: 'tc-fc-soc-4', category: 'Criterios y jurisprudencia', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Propone argumentos innovadores basados en tendencias de fiscalización y criterios jurisdiccionales de vanguardia?' },
    { id: 'tc-fc-soc-5', category: 'Impactos fiscales', section: 'tecnico', practiceArea: 'fiscal_consultoria', weight: 12, text: '¿Evalúa con precisión el impacto financiero y reputacional de las alternativas fiscales propuestas al cliente?' },
  ],
};

const litigio: Record<LegalPosition, EvalQuestion[]> = {
  pasante: [
    { id: 'tc-lf-pas-1', category: 'Redacción de escritos', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Redacta de manera correcta oficios o escritos simples?' },
    { id: 'tc-lf-pas-2', category: 'Estrategia procesal', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Comprende las fases principales de un juicio fiscal?' },
    { id: 'tc-lf-pas-3', category: 'Audiencias y diligencias', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Asiste como observador o brinda apoyo efectivo durante las audiencias u otras diligencias?' },
    { id: 'tc-lf-pas-4', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Distingue las etapas procesales clave en los asuntos asignados?' },
    { id: 'tc-lf-pas-5', category: 'Seguimiento de expedientes', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Actualiza las bitácoras y archiva la información de forma ordenada y oportuna?' },
  ],
  pasante_carrera: [
    { id: 'tc-lf-pct-1', category: 'Redacción de escritos', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Prepara borradores con una estructura adecuada y conforme a los lineamientos del area?' },
    { id: 'tc-lf-pct-2', category: 'Estrategia procesal', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Distingue los medios de defensa aplicables en materia fiscal y los utiliza correctamente con guía?' },
    { id: 'tc-lf-pct-3', category: 'Audiencias y diligencias', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Participa en diligencias como apoyo, siguiendo indicaciones y observando el protocolo correspondiente?' },
    { id: 'tc-lf-pct-4', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Interpreta leyes fiscales con guía, identificando su aplicación en los asuntos asignados?' },
    { id: 'tc-lf-pct-5', category: 'Seguimiento de expedientes', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Sistematiza de forma ordenada la información y documentación de los juicios en los que colabora?' },
  ],
  asociado_jr: [
    { id: 'tc-lf-ajr-1', category: 'Redacción de escritos', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Redacta promociones básicas de manera clara y conforme a los lineamientos procesales?' },
    { id: 'tc-lf-ajr-2', category: 'Estrategia procesal', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Sigue correctamente las instrucciones relacionadas con los procedimientos y plazos procesales?' },
    { id: 'tc-lf-ajr-3', category: 'Audiencias y diligencias', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Atiende comparecencias básicas apoyando al equipo de manera efectiva?' },
    { id: 'tc-lf-ajr-4', category: 'Conocimiento normativo', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Aplica normas y principios fiscales en la defensa legal de los casos asignados?' },
    { id: 'tc-lf-ajr-5', category: 'Seguimiento de expedientes', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 8, text: '¿Da seguimiento puntual al expediente, asegurando que toda la documentación esté completa y actualizada?' },
  ],
  asociado_mid: [
    { id: 'tc-lf-amd-1', category: 'Redacción de escritos', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Redacta demandas y recursos de manera clara, completa y conforme a los lineamientos legales?' },
    { id: 'tc-lf-amd-2', category: 'Estrategia procesal', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Propone tácticas jurídicas adecuadas a la estrategia del caso y sus objetivos?' },
    { id: 'tc-lf-amd-3', category: 'Audiencias y diligencias', section: 'tecnico', practiceArea: 'fiscal_litigio', weight: 12, text: '¿Conduce audiencias con autonomía, siguiendo protocolos y representando correctamente al cliente?' },
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

export const TECHNICAL_BY_AREA: Record<Exclude<PracticeArea, 'backoffice'>, Record<LegalPosition, EvalQuestion[]>> = {
  corporativo,
  fiscal_consultoria: consultoria,
  fiscal_litigio: litigio,
};

const LEGAL_POSITIONS: LegalPosition[] = [
  'socio', 'salary_partner', 'counsel', 'asociado_sr', 'asociado_mid', 'asociado_jr', 'pasante_carrera', 'pasante',
];

/**
 * Devuelve las preguntas técnicas para una posición legal y área de práctica dadas.
 * Para posiciones no-legales retorna [].
 * Counsel ahora tiene sus propias preguntas (ya no mapea a socio).
 */
export function getTechnicalQuestions(position: Position, area?: PracticeArea): EvalQuestion[] {
  if (!LEGAL_POSITIONS.includes(position as LegalPosition)) return [];
  const effectivePos = position as LegalPosition;
  if (!area || area === 'backoffice') return corporativo[effectivePos];
  return TECHNICAL_BY_AREA[area]?.[effectivePos] || corporativo[effectivePos];
}
