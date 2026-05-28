// Diccionario de competencias por posición (extraído de "diccionario_de_competencias_how_a_evaluar_por_puesto").
import { Position } from '@/types';

export interface Competency {
  name: string;
  definition: string;
}

const LEGAL_ALL: Competency[] = [
  { name: 'Comunicación profesional', definition: 'Habilidad para expresar ideas jurídicas complejas de manera clara, estructurada y precisa, oral y escrita, adaptando el mensaje al interlocutor (cliente, socio, autoridad, contraparte o equipo). Incluye oportunidad, cuidado en la forma y fondo, y capacidad para generar confianza y credibilidad profesional.' },
  { name: 'Gestión del tiempo y prioridades', definition: 'Capacidad para organizar, planear y ejecutar el trabajo de forma eficiente, cumpliendo plazos críticos y administrando múltiples asuntos sin sacrificar calidad. Implica priorizar, anticipar cuellos de botella, comunicar cargas y equilibrar urgencias del cliente con los intereses del despacho.' },
  { name: 'Responsabilidad profesional', definition: 'Compromiso consistente con la calidad técnica, la ética, la confidencialidad y el cumplimiento de obligaciones profesionales, asumiendo plenamente las consecuencias de las decisiones y acciones propias. Incluye dar seguimiento puntual, reconocer errores a tiempo y corregirlos, protegiendo la reputación del cliente y del despacho.' },
];

const LEGAL_JR_PLUS: Competency[] = [
  { name: 'Análisis y criterio jurídico', definition: 'Capacidad para interpretar el marco legal aplicable con profundidad y contexto, identificar riesgos y alternativas viables, y emitir recomendaciones jurídicas sólidas, razonadas y oportunas, alineadas con los objetivos del cliente y la estrategia del despacho. Implica saber cuándo ser conservador y cuándo creativo, sin comprometer la ética ni la calidad técnica.' },
  { name: 'Trabajo colaborativo', definition: 'Capacidad para integrarse y contribuir activamente al equipo, compartiendo información, conocimiento y responsabilidades, con una actitud de corresponsabilidad por los resultados. Implica respetar roles, construir soluciones conjuntas y anteponer el resultado colectivo al lucimiento individual.' },
];

const LEGAL_MID_PLUS: Competency[] = [
  { name: 'Desarrollo y atención al cliente', definition: 'Habilidad para construir y mantener relaciones de largo plazo con los clientes, entendiendo sus necesidades reales, anticipando riesgos y oportunidades, y agregando valor más allá del encargo específico. Incluye seguimiento, sensibilidad comercial y participación activa en la identificación de nuevas oportunidades de servicio.' },
  { name: 'Visión de negocio', definition: 'Capacidad para entender el impacto económico, operativo y estratégico de las decisiones jurídicas, tanto para el cliente como para el despacho. Implica conocer cómo se genera la facturación, la rentabilidad de los asuntos, la eficiencia en el uso de recursos y alinear el criterio legal con objetivos empresariales.' },
  { name: 'Desarrollo de talento', definition: 'Capacidad para formar, guiar y desarrollar a abogados más jóvenes, mediante retroalimentación clara, acompañamiento técnico y ejemplo profesional. Implica delegar con criterio, fomentar el aprendizaje continuo y construir equipos sólidos y sostenibles.' },
];

const SALARY_PARTNER_PLUS: Competency[] = [
  { name: 'Generación de práctica', definition: 'Capacidad para construir cartera propia, identificar oportunidades de negocio y aportar facturación incremental al despacho, equilibrando ejecución técnica con desarrollo comercial.' },
  { name: 'Liderazgo de equipos', definition: 'Habilidad para dirigir asuntos complejos coordinando varios abogados, distribuyendo cargas, asegurando estándares de calidad y formando a la siguiente generación.' },
  { name: 'Madurez de criterio', definition: 'Juicio profesional consolidado para tomar decisiones jurídicas y comerciales con autonomía, anticipando riesgos y aportando recomendaciones accionables a socios y clientes.' },
];

const SOCIO_PLUS: Competency[] = [
  { name: 'Visión estratégica del despacho', definition: 'Capacidad para definir rumbo, prioridades y posicionamiento del despacho, conectando la práctica jurídica con objetivos institucionales de mediano y largo plazo.' },
  { name: 'Desarrollo y retención de clientes clave', definition: 'Habilidad para construir relaciones de confianza de largo plazo con clientes estratégicos, ampliando el alcance del servicio y asegurando continuidad de la relación.' },
  { name: 'Generación de negocio y reputación', definition: 'Aporta facturación, refiere clientes nuevos, fortalece la marca del despacho mediante presencia en mercado, publicaciones, conferencias y redes profesionales.' },
  { name: 'Gobierno y toma de decisiones institucionales', definition: 'Participa activamente en decisiones de gobierno (presupuesto, sociedad, expansión, políticas), con sensibilidad institucional y compromiso colegiado.' },
  { name: 'Formación de socios y sucesión', definition: 'Identifica y forma a la siguiente generación de socios, transmitiendo conocimiento, criterio comercial y valores del despacho.' },
  { name: 'Rentabilidad y disciplina financiera', definition: 'Gestiona la rentabilidad de los asuntos a su cargo: tarifas, eficiencia, cobranza y rentabilidad por cliente, alineando práctica con sostenibilidad económica.' },
];

const DIRECCION: Competency[] = [
  { name: 'Orientación al negocio del despacho', definition: 'Capacidad para comprender cómo el despacho genera valor, rentabilidad y reputación, y para alinear las decisiones administrativas con los objetivos estratégicos, financieros y comerciales, actuando con visión integral del negocio legal.' },
  { name: 'Criterio profesional y credibilidad', definition: 'Habilidad para emitir opiniones, recomendaciones y decisiones fundamentadas, generando confianza en socios y abogados mediante juicio sólido, independencia de criterio y respaldo técnico, incluso bajo presión o desacuerdo.' },
  { name: 'Comunicación ejecutiva', definition: 'Capacidad para comunicar información relevante de forma clara, directa y oportuna, estructurando mensajes orientados a la toma de decisiones y adaptando el lenguaje al interlocutor.' },
  { name: 'Manejo organizacional y sensibilidad política', definition: 'Habilidad para leer y gestionar las dinámicas internas del despacho —relaciones entre socios, jerarquías informales, sensibilidades personales—, actuando con diplomacia, firmeza y respeto por la institucionalidad.' },
  { name: 'Ética y confidencialidad', definition: 'Compromiso sostenido con el manejo responsable, discreto y ético de la información sensible, actuando con integridad, lealtad institucional y responsabilidad profesional.' },
  { name: 'Orientación a soluciones y ejecución', definition: 'Capacidad para identificar alternativas viables ante problemas, proponer soluciones prácticas y dar seguimiento hasta su implementación, asegurando cumplimiento en tiempo y forma.' },
  { name: 'Influencia y colaboración transversal', definition: 'Habilidad para generar acuerdos, alinear voluntades y movilizar acciones sin depender de autoridad jerárquica, construyendo colaboración con socios, abogados y otras áreas.' },
  { name: 'Pensamiento estratégico aplicado', definition: 'Capacidad para conectar la operación diaria con la visión de mediano y largo plazo, anticipando impactos, priorizando con criterio y contribuyendo a decisiones que fortalezcan la sostenibilidad y crecimiento del despacho.' },
];

const COORDINACION: Competency[] = [
  { name: 'Comprensión del negocio del despacho', definition: 'Capacidad para entender cómo su área contribuye a los resultados del despacho, alineando procesos y proyectos con prioridades operativas y objetivos definidos por la Dirección.' },
  { name: 'Juicio operativo y confiabilidad profesional', definition: 'Habilidad para tomar decisiones dentro de su ámbito con criterio práctico, consultando cuando corresponde, cumpliendo acuerdos y generando confianza por la consistencia de su actuación.' },
  { name: 'Comunicación funcional y seguimiento', definition: 'Capacidad para comunicar instrucciones, avances y alertas de manera clara y oportuna, asegurando entendimiento y dando seguimiento puntual a los compromisos.' },
  { name: 'Manejo relacional y coordinación interna', definition: 'Habilidad para relacionarse con distintos interlocutores del despacho, entendiendo jerarquías y sensibilidades, facilitando la colaboración y evitando fricciones.' },
  { name: 'Integridad y manejo responsable de la información', definition: 'Capacidad para resguardar información sensible, aplicar lineamientos internos y actuar con ética y discreción.' },
  { name: 'Resolución operativa y control de ejecución', definition: 'Habilidad para identificar problemas operativos, proponer soluciones prácticas, coordinar su implementación y asegurar cumplimiento de procesos, tiempos y estándares.' },
  { name: 'Colaboración transversal e influencia operativa', definition: 'Capacidad para coordinar esfuerzos con otras áreas y equipos, logrando acuerdos operativos sin depender de autoridad jerárquica directa.' },
  { name: 'Visión de mejora continua', definition: 'Habilidad para identificar oportunidades de mejora en procesos, herramientas o formas de trabajo, proponiendo ajustes que incrementen eficiencia y calidad.' },
];

const SOPORTE: Competency[] = [
  { name: 'Confiabilidad y responsabilidad operativa', definition: 'Capacidad para cumplir de manera consistente con tareas, tiempos y acuerdos, cuidando los detalles y entendiendo que su trabajo impacta el servicio al cliente y la operación legal del despacho.' },
  { name: 'Actitud de servicio profesional', definition: 'Disposición genuina para apoyar a abogados, socios y clientes con trato respetuoso, oportuno y profesional, manteniendo límites claros y entendiendo el servicio como parte del estándar del despacho.' },
  { name: 'Orden, método y cuidado de la información', definition: 'Capacidad para trabajar de forma organizada, sistemática y precisa, resguardando documentación, datos y procesos con apego a lineamientos, confidencialidad y buenas prácticas.' },
  { name: 'Comunicación clara y respetuosa', definition: 'Habilidad para transmitir información de forma directa, comprensible y oportuna, escuchando instrucciones, confirmando entendimientos y escalando situaciones relevantes sin generar confusión ni fricción.' },
  { name: 'Adaptabilidad y disposición al aprendizaje', definition: 'Capacidad para ajustarse a cambios de prioridades, procesos o herramientas, aprender nuevas formas de trabajo y mantener actitud abierta frente a la evolución tecnológica y operativa del despacho.' },
];

export const COMPETENCIES_BY_POSITION: Record<Position, Competency[]> = {
  // Legal
  pasante: LEGAL_ALL,
  pasante_corporativo: LEGAL_ALL,
  pasante_carrera: LEGAL_ALL,
  asociado_jr: [...LEGAL_ALL, ...LEGAL_JR_PLUS],
  asociado_mid: [...LEGAL_ALL, ...LEGAL_JR_PLUS, ...LEGAL_MID_PLUS],
  asociado_sr: [...LEGAL_ALL, ...LEGAL_JR_PLUS, ...LEGAL_MID_PLUS],
  salary_partner: [...LEGAL_ALL, ...LEGAL_JR_PLUS, ...LEGAL_MID_PLUS, ...SALARY_PARTNER_PLUS],
  counsel: [...LEGAL_ALL, ...LEGAL_JR_PLUS, ...LEGAL_MID_PLUS, ...SOCIO_PLUS],
  socio: [...LEGAL_ALL, ...LEGAL_JR_PLUS, ...LEGAL_MID_PLUS, ...SOCIO_PLUS],

  // Administrativo
  director: DIRECCION,
  gerente: DIRECCION,
  coordinador: COORDINACION,
  analista: COORDINACION,
  asistente: SOPORTE,
  archivo_soporte: SOPORTE,
  soporte: SOPORTE,
  archivista: SOPORTE,
  dummy: [],
};
