import { db, tx } from './connection.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed evaluation config data into the database.
 * Replaces: questions.ts, technicalQuestions.ts, sectionWeights.ts,
 * competencyDictionary.ts, positionCatalog.ts, score labels, categories.
 * Idempotent: uses INSERT IGNORE.
 */
export async function seedEvaluationData(): Promise<void> {
  const count = await db.getScalar<number>('SELECT COUNT(*) as cnt FROM evaluation_categories');
  // Always run cleanup first
  await cleanupOldCustomQuestions();
  if (count > 0) {
    console.log('  Evaluation data already seeded, skipping insert.');
    return;
  }
  console.log('  Seeding evaluation data...');

  const now = () => new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

  await db.transaction(async (conn) => {

    // ═══════════════════════════════════════════════════════════════════
    // 1. EVALUATION CATEGORIES
    // ═══════════════════════════════════════════════════════════════════
    const categories = [
      // Competencias
      { id: 'Desempeño', label: 'Desempeño', section: 'competencias', isTech: 0, sort: 1 },
      { id: 'Liderazgo', label: 'Liderazgo', section: 'competencias', isTech: 0, sort: 2 },
      { id: 'Cumplimiento', label: 'Cumplimiento', section: 'competencias', isTech: 0, sort: 3 },
      { id: 'Trabajo en Equipo', label: 'Trabajo en Equipo', section: 'competencias', isTech: 0, sort: 4 },
      // Blandas
      { id: 'Habilidades Blandas', label: 'Habilidades Blandas', section: 'blandas', isTech: 0, sort: 5 },
      { id: 'Actitud', label: 'Actitud', section: 'blandas', isTech: 0, sort: 6 },
      { id: 'Disponibilidad', label: 'Disponibilidad', section: 'blandas', isTech: 0, sort: 7 },
      { id: 'Desarrollo', label: 'Desarrollo', section: 'blandas', isTech: 0, sort: 8 },
      // Técnico (parent)
      { id: 'Criterio Técnico', label: 'Criterio Técnico', section: 'tecnico', isTech: 0, sort: 9 },
      // Técnico sub-categorías
      { id: 'Conocimiento normativo', label: 'Conocimiento normativo', section: 'tecnico', isTech: 1, sort: 10 },
      { id: 'Redacción legal', label: 'Redacción legal', section: 'tecnico', isTech: 1, sort: 11 },
      { id: 'Due diligence', label: 'Due diligence', section: 'tecnico', isTech: 1, sort: 12 },
      { id: 'Constitución y modificaciones', label: 'Constitución y modificaciones', section: 'tecnico', isTech: 1, sort: 13 },
      { id: 'Atención a clientes', label: 'Atención a clientes', section: 'tecnico', isTech: 1, sort: 14 },
      { id: 'Normatividad fiscal', label: 'Normatividad fiscal', section: 'tecnico', isTech: 1, sort: 15 },
      { id: 'Opiniones fiscales', label: 'Opiniones fiscales', section: 'tecnico', isTech: 1, sort: 16 },
      { id: 'Planeación fiscal', label: 'Planeación fiscal', section: 'tecnico', isTech: 1, sort: 17 },
      { id: 'Criterios y jurisprudencia', label: 'Criterios y jurisprudencia', section: 'tecnico', isTech: 1, sort: 18 },
      { id: 'Impactos fiscales', label: 'Impactos fiscales', section: 'tecnico', isTech: 1, sort: 19 },
      { id: 'Redacción de escritos', label: 'Redacción de escritos', section: 'tecnico', isTech: 1, sort: 20 },
      { id: 'Estrategia procesal', label: 'Estrategia procesal', section: 'tecnico', isTech: 1, sort: 21 },
      { id: 'Audiencias y diligencias', label: 'Audiencias y diligencias', section: 'tecnico', isTech: 1, sort: 22 },
      { id: 'Seguimiento de expedientes', label: 'Seguimiento de expedientes', section: 'tecnico', isTech: 1, sort: 23 },
    ];
    for (const c of categories) {
      await tx.run(conn, 'INSERT IGNORE INTO evaluation_categories (id, label, section, is_technical_subcategory, sort_order) VALUES (?, ?, ?, ?, ?)',
        [c.id, c.label, c.section, c.isTech, c.sort]);
    }
    console.log(`  ✓ Categories (${categories.length})`);

    // ═══════════════════════════════════════════════════════════════════
    // 2. SECTION WEIGHTS
    // ═══════════════════════════════════════════════════════════════════
    const sectionWeights = [
      { position: 'socio', tecnico: 60, competencias: 20, blandas: 20 },
      { position: 'salary_partner', tecnico: 60, competencias: 20, blandas: 20 },
      { position: 'counsel', tecnico: 60, competencias: 20, blandas: 20 },
      { position: 'asociado_sr', tecnico: 60, competencias: 20, blandas: 20 },
      { position: 'asociado_mid', tecnico: 60, competencias: 20, blandas: 20 },
      { position: 'asociado_jr', tecnico: 40, competencias: 40, blandas: 20 },
      { position: 'pasante_carrera', tecnico: 40, competencias: 40, blandas: 20 },
      { position: 'pasante_corporativo', tecnico: 40, competencias: 40, blandas: 20 },
      { position: 'pasante', tecnico: 40, competencias: 40, blandas: 20 },
      { position: 'director', tecnico: 0, competencias: 80, blandas: 20 },
      { position: 'gerente', tecnico: 0, competencias: 80, blandas: 20 },
      { position: 'coordinador', tecnico: 0, competencias: 80, blandas: 20 },
      { position: 'analista', tecnico: 0, competencias: 80, blandas: 20 },
      { position: 'asistente', tecnico: 0, competencias: 50, blandas: 50 },
      { position: 'archivo_soporte', tecnico: 0, competencias: 50, blandas: 50 },
      { position: 'soporte', tecnico: 0, competencias: 50, blandas: 50 },
      { position: 'archivista', tecnico: 0, competencias: 50, blandas: 50 },
      { position: 'dummy', tecnico: 60, competencias: 20, blandas: 20 },
    ];
    for (const sw of sectionWeights) {
      await tx.run(conn, 'INSERT IGNORE INTO section_weights (position, tecnico, competencias, blandas) VALUES (?, ?, ?, ?)',
        [sw.position, sw.tecnico, sw.competencias, sw.blandas]);
    }
    console.log(`  ✓ Section weights (${sectionWeights.length})`);

    // ═══════════════════════════════════════════════════════════════════
    // 3. POSITION CONFIG
    // ═══════════════════════════════════════════════════════════════════
    const positions = [
      { position: 'socio', label: 'Socio', level: 'legal' as const, rank: 0, sort: 1 },
      { position: 'salary_partner', label: 'Salary Partner', level: 'legal' as const, rank: 1, sort: 2 },
      { position: 'counsel', label: 'Counsel', level: 'legal' as const, rank: 1, sort: 3 },
      { position: 'asociado_sr', label: 'Asociado Sr', level: 'legal' as const, rank: 2, sort: 4 },
      { position: 'asociado_mid', label: 'Asociado Mid', level: 'legal' as const, rank: 3, sort: 5 },
      { position: 'asociado_jr', label: 'Asociado Jr', level: 'legal' as const, rank: 4, sort: 6 },
      { position: 'pasante_carrera', label: 'Pasante con Carrera', level: 'legal' as const, rank: 5, sort: 7 },
      { position: 'pasante_corporativo', label: 'Pasante', level: 'legal' as const, rank: 6, sort: 8 },
      { position: 'pasante', label: 'Pasante', level: 'legal' as const, rank: 6, sort: 9 },
      { position: 'director', label: 'Director', level: 'administrativo' as const, rank: 1, sort: 10 },
      { position: 'gerente', label: 'Gerente', level: 'administrativo' as const, rank: 2, sort: 11 },
      { position: 'coordinador', label: 'Coordinador', level: 'administrativo' as const, rank: 3, sort: 12 },
      { position: 'analista', label: 'Analista', level: 'administrativo' as const, rank: 4, sort: 13 },
      { position: 'asistente', label: 'Asistente', level: 'administrativo' as const, rank: 5, sort: 14 },
      { position: 'archivo_soporte', label: 'Archivo y Soporte', level: 'administrativo' as const, rank: 6, sort: 15 },
      { position: 'soporte', label: 'Soporte', level: 'administrativo' as const, rank: 6, sort: 16 },
      { position: 'archivista', label: 'Archivista', level: 'administrativo' as const, rank: 6, sort: 17 },
    ];
    for (const p of positions) {
      await tx.run(conn, 'INSERT IGNORE INTO position_config (position, label, level, rank, sort_order) VALUES (?, ?, ?, ?, ?)',
        [p.position, p.label, p.level, p.rank, p.sort]);
    }
    console.log(`  ✓ Position config (${positions.length})`);

    // ═══════════════════════════════════════════════════════════════════
    // 4. SCORE CONFIG
    // ═══════════════════════════════════════════════════════════════════
    const scores = [
      { score: 1, label: 'Deficiente' },
      { score: 2, label: 'Necesita Mejorar' },
      { score: 3, label: 'Satisfactorio' },
      { score: 4, label: 'Bueno' },
      { score: 5, label: 'Excelente' },
    ];
    for (const s of scores) {
      await tx.run(conn, 'INSERT IGNORE INTO score_config (score, label) VALUES (?, ?)', [s.score, s.label]);
    }
    console.log(`  ✓ Score config (${scores.length})`);

    // ═══════════════════════════════════════════════════════════════════
    // 5. COMPETENCY DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════
    const competencies = [
      // Legal - All (pasante through socio)
      { level: 'pasante,asociado_jr,pasante_carrera,pasante_corporativo,pasante', name: 'Comunicación profesional', def: 'Habilidad para expresar ideas jurídicas complejas de manera clara, estructurada y precisa, oral y escrita, adaptando el mensaje al interlocutor.', sort: 1 },
      { level: 'pasante,asociado_jr,pasante_carrera,pasante_corporativo,pasante', name: 'Gestión del tiempo y prioridades', def: 'Capacidad para organizar, planear y ejecutar el trabajo de forma eficiente, cumpliendo plazos críticos y administrando múltiples asuntos sin sacrificar calidad.', sort: 2 },
      { level: 'pasante,asociado_jr,asociado_mid,asociado_sr,pasante_carrera,pasante_corporativo,pasante,salary_partner,counsel,socio', name: 'Responsabilidad profesional', def: 'Compromiso consistente con la calidad técnica, la ética, la confidencialidad y el cumplimiento de obligaciones profesionales, asumiendo plenamente las consecuencias de las decisiones y acciones propias.', sort: 3 },
      // Legal - JR+ (asociado_jr+)
      { level: 'asociado_jr,asociado_mid,asociado_sr,pasante_carrera,pasante_corporativo,pasante,salary_partner,counsel,socio', name: 'Análisis y criterio jurídico', def: 'Capacidad para interpretar el marco legal aplicable con profundidad y contexto, identificar riesgos y alternativas viables, y emitir recomendaciones jurídicas sólidas, razonadas y oportunas.', sort: 4 },
      { level: 'asociado_jr,asociado_mid,asociado_sr,pasante_carrera,pasante_corporativo,pasante,salary_partner,counsel,socio', name: 'Trabajo colaborativo', def: 'Capacidad para integrarse y contribuir activamente al equipo, compartiendo información, conocimiento y responsabilidades, con una actitud de corresponsabilidad por los resultados.', sort: 5 },
      // Legal - MID+ (asociado_mid+)
      { level: 'asociado_mid,asociado_sr,salary_partner,counsel,socio', name: 'Desarrollo y atención al cliente', def: 'Habilidad para construir y mantener relaciones de largo plazo con los clientes, entendiendo sus necesidades reales, anticipando riesgos y oportunidades, y agregando valor más allá del encargo específico.', sort: 6 },
      { level: 'asociado_mid,asociado_sr,salary_partner,counsel,socio', name: 'Visión de negocio', def: 'Capacidad para entender el impacto económico, operativo y estratégico de las decisiones jurídicas, tanto para el cliente como para el despacho.', sort: 7 },
      { level: 'asociado_mid,asociado_sr,salary_partner,counsel,socio', name: 'Desarrollo de talento', def: 'Capacidad para formar, guiar y desarrollar a abogados más jóvenes, mediante retroalimentación clara, acompañamiento técnico y ejemplo profesional.', sort: 8 },
      // Legal - Salary Partner+ (salary_partner, counsel, socio)
      { level: 'salary_partner,counsel,socio', name: 'Generación de práctica', def: 'Capacidad para construir cartera propia, identificar oportunidades de negocio y aportar facturación incremental al despacho.', sort: 9 },
      { level: 'salary_partner,counsel,socio', name: 'Liderazgo de equipos', def: 'Habilidad para dirigir asuntos complejos coordinando varios abogados, distribuyendo cargas, asegurando estándares de calidad y formando a la siguiente generación.', sort: 10 },
      { level: 'salary_partner,counsel,socio', name: 'Madurez de criterio', def: 'Juicio profesional consolidado para tomar decisiones jurídicas y comerciales con autonomía, anticipando riesgos y aportando recomendaciones accionables.', sort: 11 },
      // Legal - Socio only
      { level: 'socio', name: 'Visión estratégica del despacho', def: 'Capacidad para definir rumbo, prioridades y posicionamiento del despacho, conectando la práctica jurídica con objetivos institucionales.', sort: 12 },
      { level: 'socio', name: 'Desarrollo y retención de clientes clave', def: 'Habilidad para construir relaciones de confianza de largo plazo con clientes estratégicos, ampliando el alcance del servicio.', sort: 13 },
      { level: 'socio', name: 'Generación de negocio y reputación', def: 'Aporta facturación, refiere clientes nuevos, fortalece la marca del despacho mediante presencia en mercado, publicaciones, conferencias y redes profesionales.', sort: 14 },
      { level: 'socio', name: 'Gobierno y toma de decisiones institucionales', def: 'Participa activamente en decisiones de gobierno (presupuesto, sociedad, expansión, políticas), con sensibilidad institucional y compromiso colegiado.', sort: 15 },
      // Administrativo - Dirección (director, gerente)
      { level: 'director,gerente', name: 'Visión estratégica y liderazgo institucional', def: 'Capacidad para definir la dirección del área, alinear objetivos operativos con la visión del despacho, y conducir al equipo hacia metas claras.', sort: 1 },
      { level: 'director,gerente', name: 'Comunicación ejecutiva y negociación', def: 'Habilidad para representar al área ante socios y clientes, transmitir decisiones difíciles con claridad y empatía.', sort: 2 },
      { level: 'director,gerente', name: 'Juicio profesional y gestión de riesgos', def: 'Capacidad para evaluar situaciones con criterio práctico, anticipar consecuencias y tomar decisiones informadas.', sort: 3 },
      { level: 'director,gerente', name: 'Integridad y liderazgo ético', def: 'Compromiso con la transparencia, la verdad y el manejo ético de la información sensible.', sort: 4 },
      { level: 'director,gerente', name: 'Orientación a soluciones y ejecución', def: 'Capacidad para identificar alternativas viables ante problemas, proponer soluciones prácticas y dar seguimiento hasta su implementación.', sort: 5 },
      { level: 'director,gerente', name: 'Influencia y colaboración transversal', def: 'Habilidad para generar acuerdos, alinear voluntades y movilizar acciones sin depender de autoridad jerárquica.', sort: 6 },
      { level: 'director,gerente', name: 'Pensamiento estratégico aplicado', def: 'Capacidad para conectar la operación diaria con la visión de mediano y largo plazo, anticipando impactos y priorizando con criterio.', sort: 7 },
      // Administrativo - Coordinación (coordinador, analista)
      { level: 'coordinador,analista', name: 'Comprensión del negocio del despacho', def: 'Capacidad para entender cómo su área contribuye a los resultados del despacho, alineando procesos y proyectos con prioridades operativas.', sort: 1 },
      { level: 'coordinador,analista', name: 'Juicio operativo y confiabilidad profesional', def: 'Habilidad para tomar decisiones dentro de su ámbito con criterio práctico, consultando cuando corresponde y cumpliendo acuerdos.', sort: 2 },
      { level: 'coordinador,analista', name: 'Comunicación funcional y seguimiento', def: 'Capacidad para comunicar instrucciones, avances y alertas de manera clara y oportuna, asegurando entendimiento y dando seguimiento puntual.', sort: 3 },
      { level: 'coordinador,analista', name: 'Manejo relacional y coordinación interna', def: 'Habilidad para relacionarse con distintos interlocutores del despacho, entendiendo jerarquías y sensibilidades, facilitando la colaboración.', sort: 4 },
      { level: 'coordinador,analista', name: 'Integridad y manejo responsable de la información', def: 'Capacidad para resguardar información sensible, aplicar lineamientos internos y actuar con ética y discreción.', sort: 5 },
      { level: 'coordinador,analista', name: 'Resolución operativa y control de ejecución', def: 'Habilidad para identificar problemas operativos, proponer soluciones prácticas, coordinar su implementación y asegurar cumplimiento.', sort: 6 },
      { level: 'coordinador,analista', name: 'Colaboración transversal e influencia operativa', def: 'Capacidad para coordinar esfuerzos con otras áreas y equipos, logrando acuerdos operativos sin depender de autoridad jerárquica directa.', sort: 7 },
      { level: 'coordinador,analista', name: 'Visión de mejora continua', def: 'Habilidad para identificar oportunidades de mejora en procesos, herramientas o formas de trabajo, proponiendo ajustes que incrementen eficiencia y calidad.', sort: 8 },
      // Administrativo - Soporte (asistente, archivo_soporte, soporte, archivista)
      { level: 'asistente,archivo_soporte,soporte,archivista', name: 'Confiabilidad y responsabilidad operativa', def: 'Capacidad para cumplir de manera consistente con tareas, tiempos y acuerdos, cuidando los detalles y entendiendo que su trabajo impacta el servicio al cliente.', sort: 1 },
      { level: 'asistente,archivo_soporte,soporte,archivista', name: 'Actitud de servicio profesional', def: 'Disposición genuina para apoyar a abogados, socios y clientes con trato respetuoso, oportuno y profesional.', sort: 2 },
      { level: 'asistente,archivo_soporte,soporte,archivista', name: 'Orden, método y cuidado de la información', def: 'Capacidad para trabajar de forma organizada, sistemática y precisa, resguardando documentación, datos y procesos.', sort: 3 },
      { level: 'asistente,archivo_soporte,soporte,archivista', name: 'Comunicación clara y respetuosa', def: 'Habilidad para transmitir información de forma directa, comprensible y oportuna, escuchando instrucciones y confirmando entendimientos.', sort: 4 },
      { level: 'asistente,archivo_soporte,soporte,archivista', name: 'Adaptabilidad y disposición al aprendizaje', def: 'Capacidad para ajustarse a cambios de prioridades, procesos o herramientas, aprender nuevas formas de trabajo y mantener actitud abierta.', sort: 5 },
    ];
    for (const c of competencies) {
      await tx.run(conn, 'INSERT IGNORE INTO competency_definitions (id, position_level, name, definition, sort_order) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), c.level, c.name, c.def, c.sort]);
    }
    console.log(`  ✓ Competency definitions (${competencies.length})`);

    // ═══════════════════════════════════════════════════════════════════
    // 6. TEMPLATE QUESTIONS
    // ═══════════════════════════════════════════════════════════════════
    // All questions from questions.ts (competencias+blandas) and technicalQuestions.ts (tecnico)
    // Keeping original question_id values for backward compatibility with existing evaluations

    // Helper: create a question entry
    const q = (id: string, position: string, practiceArea: string, section: string, category: string, text: string, weight: number, sortOrder: number) =>
      [uuidv4(), id, position, practiceArea, section, category, text, weight, sortOrder, 1, 'seed'] as const;

    // ─── SOCIO (also salary_partner, counsel) ─── Competencias + Blandas
    const socioQs = [
      q('s4','socio','corporativo','competencias','Liderazgo','¿Cómo califica la visión estratégica y dirección del despacho?',5,1),
      q('s5','socio','corporativo','competencias','Liderazgo','¿Cómo califica el desarrollo y mentoría del equipo?',5,2),
      q('s6','socio','corporativo','competencias','Liderazgo','¿Cómo califica la toma de decisiones estratégicas?',5,3),
      q('s9','socio','corporativo','competencias','Trabajo en Equipo','¿Cómo califica la coordinación entre áreas y socios?',5,4),
      q('s7','socio','corporativo','blandas','Habilidades Blandas','¿Cómo califica la comunicación con el equipo y clientes?',4,5),
      q('s10','socio','corporativo','blandas','Habilidades Blandas','¿Cómo califica la resolución de conflictos internos?',4,6),
      q('s11','socio','corporativo','blandas','Actitud','¿Cómo califica la ética profesional y ejemplo hacia el equipo?',4,7),
      q('s12','socio','corporativo','blandas','Disponibilidad','¿Cómo califica la disponibilidad ante situaciones críticas?',4,8),
      q('s13','socio','corporativo','blandas','Habilidades Blandas','¿Cómo califica la capacidad de innovación y adaptación?',4,9),
    ];
    // Socio questions apply to socio, salary_partner, counsel
    for (const pos of ['socio', 'salary_partner', 'counsel']) {
      for (const [id, _pos, pa, section, category, text, weight, sortOrder, isActive, source] of socioQs) {
        await tx.run(conn,
          'INSERT IGNORE INTO template_questions (id, question_id, position, practice_area, section, category, question_text, weight, sort_order, is_active, source) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [uuidv4(), _pos === 'socio' ? `s4` : `s4`, pos, pa, section, category, text, weight, sortOrder, isActive, source]);
      }
    }
    // Actually this is getting complex because we need to duplicate for each position.
    // Let me simplify: insert each question for each applicable position.

    // Reset and do it properly with a helper
    console.log('  Seeding template questions...');

    // Define all competencias+blandas questions per position group
    const templateQs: Array<{id: string, positions: string[], practiceArea: string, section: string, category: string, text: string, weight: number}> = [
      // SOCIO / SALARY_PARTNER / COUNSEL
      {id:'s4',positions:['socio','salary_partner','counsel'],practiceArea:'corporativo',section:'competencias',category:'Liderazgo',text:'¿Cómo califica la visión estratégica y dirección del despacho?',weight:5},
      {id:'s5',positions:['socio','salary_partner','counsel'],practiceArea:'corporativo',section:'competencias',category:'Liderazgo',text:'¿Cómo califica el desarrollo y mentoría del equipo?',weight:5},
      {id:'s6',positions:['socio','salary_partner','counsel'],practiceArea:'corporativo',section:'competencias',category:'Liderazgo',text:'¿Cómo califica la toma de decisiones estratégicas?',weight:5},
      {id:'s9',positions:['socio','salary_partner','counsel'],practiceArea:'corporativo',section:'competencias',category:'Trabajo en Equipo',text:'¿Cómo califica la coordinación entre áreas y socios?',weight:5},
      {id:'s7',positions:['socio','salary_partner','counsel'],practiceArea:'corporativo',section:'blandas',category:'Habilidades Blandas',text:'¿Cómo califica la comunicación con el equipo y clientes?',weight:4},
      {id:'s10',positions:['socio','salary_partner','counsel'],practiceArea:'corporativo',section:'blandas',category:'Habilidades Blandas',text:'¿Cómo califica la resolución de conflictos internos?',weight:4},
      {id:'s11',positions:['socio','salary_partner','counsel'],practiceArea:'corporativo',section:'blandas',category:'Actitud',text:'¿Cómo califica la ética profesional y ejemplo hacia el equipo?',weight:4},
      {id:'s12',positions:['socio','salary_partner','counsel'],practiceArea:'corporativo',section:'blandas',category:'Disponibilidad',text:'¿Cómo califica la disponibilidad ante situaciones críticas?',weight:4},
      {id:'s13',positions:['socio','salary_partner','counsel'],practiceArea:'corporativo',section:'blandas',category:'Habilidades Blandas',text:'¿Cómo califica la capacidad de innovación y adaptación?',weight:4},

      // ASOCIADO SR
      {id:'asr1',positions:['asociado_sr'],practiceArea:'corporativo',section:'competencias',category:'Liderazgo',text:'¿Cómo califica la capacidad de dirección de equipos de trabajo?',weight:5},
      {id:'asr2',positions:['asociado_sr'],practiceArea:'corporativo',section:'competencias',category:'Liderazgo',text:'¿Cómo califica la mentoría y formación de abogados junior?',weight:5},
      {id:'asr3',positions:['asociado_sr'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica la calidad de su trabajo jurídico?',weight:6},
      {id:'asr4',positions:['asociado_sr'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica el cumplimiento de entregas?',weight:5},
      {id:'asr5',positions:['asociado_sr'],practiceArea:'porporativo',section:'competencias',category:'Trabajo en Equipo',text:'¿Cómo califica la coordinación con el equipo?',weight:4},
      {id:'asr6',positions:['asociado_sr'],practiceArea:'corporativo',section:'blandas',category:'Habilidades Blandas',text:'¿Cómo califica la comunicación con clientes y equipo?',weight:4},
      {id:'asr7',positions:['asociado_sr'],practiceArea:'corporativo',section:'blandas',category:'Actitud',text:'¿Cómo califica la ética profesional?',weight:4},

      // ASOCIADO MID
      {id:'am1',positions:['asociado_mid'],practiceArea:'corporativo',section:'competencias',category:'Análisis y criterio jurídico',text:'¿Cómo califica la capacidad de análisis y resolución de problemas jurídicos?',weight:6},
      {id:'am2',positions:['asociado_mid'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica la calidad y oportunidad de su trabajo?',weight:6},
      {id:'am3',positions:['asociado_mid'],practiceArea:'corporativo',section:'competencias',category:'Trabajo en Equipo',text:'¿Cómo califica la colaboración con socios y equipo?',weight:4},
      {id:'am4',positions:['asociado_mid'],practiceArea:'corporativo',section:'competencias',category:'Desarrollo y atención al cliente',text:'¿Cómo califica el seguimiento y comunicación con clientes?',weight:5},
      {id:'am5',positions:['asociado_mid'],practiceArea:'corporativo',section:'competencias',category:'Liderazgo',text:'¿Cómo califica la capacidad de delegación y supervisión?',weight:4},
      {id:'am6',positions:['asociado_mid'],practiceArea:'corporativo',section:'blandas',category:'Habilidades Blandas',text:'¿Cómo califica la comunicación efectiva?',weight:5},

      // ASOCIADO JR
      {id:'ajr1',positions:['asociado_jr'],practiceArea:'corporativo',section:'competencias',category:'Análisis y criterio jurídico',text:'¿Cómo califica la capacidad de análisis y razonamiento jurídico?',weight:6},
      {id:'ajr2',positions:['asociado_jr'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica la calidad de su trabajo?',weight:7},
      {id:'ajr3',positions:['asociado_jr'],practiceArea:'corporativo',section:'competencias',category:'Responsabilidad profesional',text:'¿Cómo califica el cumplimiento de plazos y compromisos?',weight:6},
      {id:'ajr4',positions:['asociado_jr'],practiceArea:'corporativo',section:'competencias',category:'Trabajo en Equipo',text:'¿Cómo califica la colaboración con el equipo?',weight:5},
      {id:'ajr5',positions:['asociado_jr'],practiceArea:'corporativo',section:'competencias',category:'Comunicación profesional',text:'¿Cómo califica la comunicación clara y efectiva?',weight:5},
      {id:'ajr6',positions:['asociado_jr'],practiceArea:'corporativo',section:'competencias',category:'Gestión del tiempo y prioridades',text:'¿Cómo califica la gestión del tiempo?',weight:5},
      {id:'ajr7',positions:['asociado_jr'],practiceArea:'corporativo',section:'blandas',category:'Habilidades Blandas',text:'¿Cómo califica la disposición al aprendizaje?',weight:5},

      // PASANTE CON CARRERA
      {id:'pc1',positions:['pasante_carrera'],practiceArea:'corporativo',section:'competencias',category:'Comunicación profesional',text:'¿Cómo califica la comunicación escrita y oral?',weight:6},
      {id:'pc2',positions:['pasante_carrera'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica la calidad de su trabajo?',weight:6},
      {id:'pc3',positions:['pasante_carrera'],practiceArea:'corporativo',section:'competencias',category:'Responsabilidad profesional',text:'¿Cómo califica el cumplimiento de tareas asignadas?',weight:6},
      {id:'pc4',positions:['pasante_carrera'],practiceArea:'corporativo',section:'competencias',category:'Trabajo en Equipo',text:'¿Cómo califica la colaboración con el equipo?',weight:5},
      {id:'pc5',positions:['pasante_carrera'],practiceArea:'corporativo',section:'competencias',category:'Gestión del tiempo y prioridades',text:'¿Cómo califica la gestión del tiempo?',weight:5},
      {id:'pc6',positions:['pasante_carrera'],practiceArea:'corporativo',section:'competencias',category:'Análisis y criterio jurídico',text:'¿Cómo califica la capacidad de análisis jurídico?',weight:5},
      {id:'pc7',positions:['pasante_carrera'],practiceArea:'corporativo',section:'competencias',category:'Desarrollo y atención al cliente',text:'¿Cómo califica la disposición para aprender?',weight:4},
      {id:'pc8',positions:['pasante_carrera'],practiceArea:'corporativo',section:'blandas',category:'Actitud',text:'¿Cómo califica la ética profesional?',weight:4},

      // PASANTE (also pasante_corporativo)
      {id:'pco1',positions:['pasante','pasante_corporativo'],practiceArea:'corporativo',section:'competencias',category:'Comunicación profesional',text:'¿Cómo califica la comunicación escrita y oral?',weight:6},
      {id:'pco2',positions:['pasante','pasante_corporativo'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica la calidad de su trabajo?',weight:6},
      {id:'pco3',positions:['pasante','pasante_corporativo'],practiceArea:'corporativo',section:'competencias',category:'Responsabilidad profesional',text:'¿Cómo califica el cumplimiento de instrucciones?',weight:6},
      {id:'pco4',positions:['pasante','pasante_corporativo'],practiceArea:'corporativo',section:'competencias',category:'Gestión del tiempo y prioridades',text:'¿Cómo califica la gestión del tiempo?',weight:5},
      {id:'pco5',positions:['pasante','pasante_corporativo'],practiceArea:'corporativo',section:'competencias',category:'Trabajo en Equipo',text:'¿Cómo califica la colaboración con el equipo?',weight:5},
      {id:'pco6',positions:['pasante','pasante_corporativo'],practiceArea:'corporativo',section:'competencias',category:'Desarrollo y atención al cliente',text:'¿Cómo califica la disposición para aprender?',weight:4},
      {id:'pco7',positions:['pasante','pasante_corporativo'],practiceArea:'corporativo',section:'blandas',category:'Actitud',text:'¿Cómo califica la ética profesional?',weight:5},

      // DIRECTOR
      {id:'d1',positions:['director'],practiceArea:'corporativo',section:'competencias',category:'Liderazgo',text:'¿Cómo califica la visión estratégica y dirección del área?',weight:6},
      {id:'d2',positions:['director'],practiceArea:'corporativo',section:'competencias',category:'Liderazgo',text:'¿Cómo califica la capacidad de tomar decisiones y resolver problemas?',weight:5},
      {id:'d3',positions:['director'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica la calidad de su trabajo?',weight:5},
      {id:'d4',positions:['director'],practiceArea:'corporativo',section:'competencias',category:'Desarrollo y atención al cliente',text:'¿Cómo califica la relación con clientes internos y externos?',weight:4},
      {id:'d5',positions:['director'],practiceArea:'corporativo',section:'competencias',category:'Visión de negocio',text:'¿Cómo califica la comprensión del impacto de sus decisiones en el despacho?',weight:4},
      {id:'d6',positions:['director'],practiceArea:'corporativo',section:'competencias',category:'Comunicación ejecutiva y negociación',text:'¿Cómo califica la comunicación efectiva con socios y equipo?',weight:4},
      {id:'d7',positions:['director'],practiceArea:'corporativo',section:'competencias',category:'Trabajo en Equipo',text:'¿Cómo califica la coordinación entre áreas?',weight:3},
      {id:'d8',positions:['director'],practiceArea:'corporativo',section:'competencias',category:'Integridad y liderazgo ético',text:'¿Cómo califica la integridad y manejo de información sensible?',weight:3},
      {id:'d9',positions:['director'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica el cumplimiento de entregas?',weight:4},
      {id:'d10',positions:['director'],practiceArea:'corporativo',section:'blandas',category:'Habilidades Blandas',text:'¿Cómo califica la capacidad de innovación y adaptación?',weight:4},

      // GERENTE
      {id:'g1',positions:['gerente'],practiceArea:'corporativo',section:'competencias',category:'Liderazgo',text:'¿Cómo califica la capacidad de dirección de equipos?',weight:5},
      {id:'g2',positions:['gerente'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica la calidad de su trabajo?',weight:6},
      {id:'g3',positions:['gerente'],practiceArea:'corporativo',section:'competencias',category:'Desarrollo y atención al cliente',text:'¿Cómo califica el seguimiento y comunicación con clientes?',weight:4},
      {id:'g4',positions:['gerente'],practiceArea:'corporativo',section:'competencias',category:'Comunicación ejecutiva y negociación',text:'¿Cómo califica la comunicación efectiva?',weight:5},
      {id:'g5',positions:['gerente'],practiceArea:'corporativo',section:'competencias',category:'Trabajo en Equipo',text:'¿Cómo califica la coordinación con su equipo?',weight:4},
      {id:'g6',positions:['gerente'],practiceArea:'corporativo',section:'competencias',category:'Visión de negocio',text:'¿Cómo califica la comprensión del negocio del despacho?',weight:4},
      {id:'g7',positions:['gerente'],practiceArea:'corporativo',section:'competencias',category:'Integridad y liderazgo ético',text:'¿Cómo califica la integridad y manejo de información?',weight:4},
      {id:'g8',positions:['gerente'],practiceArea:'corporativo',section:'competencias',category:'Desarrollo de talento',text:'¿Cómo califica la formación y desarrollo de su equipo?',weight:3},
      {id:'g9',positions:['gerente'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica el cumplimiento de entregas?',weight:4},
      {id:'g10',positions:['gerente'],practiceArea:'corporativo',section:'blandas',category:'Habilidades Blandas',text:'¿Cómo califica la capacidad de negociación y resolución de conflictos?',weight:4},

      // COORDINADOR
      {id:'co1',positions:['coordinador'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica la calidad de su trabajo?',weight:6},
      {id:'co2',positions:['coordinador'],practiceArea:'corporativo',section:'competencias',category:'Cumplimiento',text:'¿Cómo califica el seguimiento de procedimientos?',weight:6},
      {id:'co3',positions:['coordinador'],practiceArea:'corporativo',section:'competencias',category:'Comunicación funcional y seguimiento',text:'¿Cómo califica la comunicación con el equipo?',weight:5},
      {id:'co4',positions:['coordinador'],practiceArea:'corporativo',section:'competencias',category:'Trabajo en Equipo',text:'¿Cómo califica la coordinación con su equipo?',weight:5},
      {id:'co5',positions:['coordinador'],practiceArea:'corporativo',section:'competencias',category:'Juicio operativo y confiabilidad profesional',text:'¿Cómo califica la toma de decisiones operativas?',weight:4},
      {id:'co6',positions:['coordinador'],practiceArea:'corporativo',section:'competencias',category:'Integridad y manejo responsable de la información',text:'¿Cómo califica la confidencialidad?',weight:4},
      {id:'co7',positions:['coordinador'],practiceArea:'corporativo',section:'competencias',category:'Resolución operativa y control de ejecución',text:'¿Cómo califica la resolución de problemas?',weight:4},
      {id:'co8',positions:['coordinador'],practiceArea:'corporativo',section:'competencias',category:'Visión de mejora continua',text:'¿Cómo califica la proactividad?',weight:3},
      {id:'co9',positions:['coordinador'],practiceArea:'corporativo',section:'competencias',category:'Colaboración transversal e influencia operativa',text:'¿Cómo califica la colaboración con otras áreas?',weight:3},
      {id:'co10',positions:['coordinador'],practiceArea:'corporativo',section:'blandas',category:'Habilidades Blandas',text:'¿Cómo califica la adaptabilidad?',weight:4},

      // ANALISTA
      {id:'an1',positions:['analista'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica la calidad de su trabajo?',weight:10},
      {id:'an2',positions:['analista'],practiceArea:'corporativo',section:'competencias',category:'Cumplimiento',text:'¿Cómo califica el cumplimiento de entregas?',weight:15},
      {id:'an3',positions:['analista'],practiceArea:'corporativo',section:'competencias',category:'Cumplimiento',text:'¿Cómo califica el seguimiento de procedimientos?',weight:13},
      {id:'an4',positions:['analista'],practiceArea:'corporativo',section:'competencias',category:'Trabajo en Equipo',text:'¿Cómo califica la colaboración?',weight:13},
      {id:'an5',positions:['analista'],practiceArea:'corporativo',section:'competencias',category:'Cumplimiento',text:'¿Cómo califica la confidencialidad?',weight:12},
      {id:'an6',positions:['analista'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica la gestión del tiempo?',weight:10},
      {id:'an7',positions:['analista'],practiceArea:'corporativo',section:'blandas',category:'Habilidades Blandas',text:'¿Cómo califica la comunicación?',weight:5},
      {id:'an8',positions:['analista'],practiceArea:'corporativo',section:'blandas',category:'Actitud',text:'¿Cómo califica la proactividad?',weight:5},
      {id:'an9',positions:['analista'],practiceArea:'corporativo',section:'blandas',category:'Disponibilidad',text:'¿Cómo califica la disponibilidad?',weight:5},
      {id:'an10',positions:['analista'],practiceArea:'corporativo',section:'blandas',category:'Habilidades Blandas',text:'¿Cómo califica la adaptabilidad?',weight:4},

      // ASISTENTE
      {id:'as1',positions:['asistente'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica la calidad de su trabajo?',weight:10},
      {id:'as2',positions:['asistente'],practiceArea:'corporativo',section:'competencias',category:'Cumplimiento',text:'¿Cómo califica el seguimiento de instrucciones?',weight:10},
      {id:'as3',positions:['asistente'],practiceArea:'corporativo',section:'competencias',category:'Trabajo en Equipo',text:'¿Cómo califica la coordinación con su equipo?',weight:10},
      {id:'as4',positions:['asistente'],practiceArea:'corporativo',section:'competencias',category:'Cumplimiento',text:'¿Cómo califica la confidencialidad?',weight:10},
      {id:'as5',positions:['asistente'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica la gestión del tiempo?',weight:10},
      {id:'as6',positions:['asistente'],practiceArea:'corporativo',section:'competencias',category:'Desarrollo y atención al cliente',text:'¿Cómo califica la atención a clientes internos?',weight:10},
      {id:'as7',positions:['asistente'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica la resolución de problemas?',weight:10},
      {id:'as8',positions:['asistente'],practiceArea:'corporativo',section:'competencias',category:'Comunicación funcional y seguimiento',text:'¿Cómo califica la comunicación?',weight:10},
      {id:'as9',positions:['asistente'],practiceArea:'corporativo',section:'blandas',category:'Actitud',text:'¿Cómo califica la actitud de servicio?',weight:10},
      {id:'as10',positions:['asistente'],practiceArea:'corporativo',section:'blandas',category:'Disponibilidad',text:'¿Cómo califica la disponibilidad?',weight:10},

      // ARCHIVO Y SOPORTE (also soporte, archivista)
      {id:'ar1',positions:['archivo_soporte','soporte','archivista'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica la calidad de su trabajo?',weight:9},
      {id:'ar2',positions:['archivo_soporte','soporte','archivista'],practiceArea:'corporativo',section:'competencias',category:'Cumplimiento',text:'¿Cómo califica el seguimiento de instrucciones?',weight:7},
      {id:'ar3',positions:['archivo_soporte','soporte','archivista'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica la gestión del tiempo?',weight:6},
      {id:'ar4',positions:['archivo_soporte','soporte','archivista'],practiceArea:'corporativo',section:'competencias',category:'Trabajo en Equipo',text:'¿Cómo califica la coordinación con su equipo?',weight:6},
      {id:'ar5',positions:['archivo_soporte','soporte','archivista'],practiceArea:'corporativo',section:'competencias',category:'Cumplimiento',text:'¿Cómo califica la confidencialidad?',weight:6},
      {id:'ar6',positions:['archivo_soporte','soporte','archivista'],practiceArea:'corporativo',section:'competencias',category:'Comunicación funcional y seguimiento',text:'¿Cómo califica la comunicación?',weight:6},
      {id:'ar7',positions:['archivo_soporte','soporte','archivista'],practiceArea:'corporativo',section:'competencias',category:'Desempeño',text:'¿Cómo califica la resolución de problemas?',weight:5},
      {id:'ar8',positions:['archivo_soporte','soporte','archivista'],practiceArea:'corporativo',section:'competencias',category:'Resolución operativa y control de ejecución',text:'¿Cómo califica la proactividad?',weight:5},
      {id:'ar9',positions:['archivo_soporte','soporte','archivista'],practiceArea:'corporativo',section:'competencias',category:'Desarrollo y atención al cliente',text:'¿Cómo califica la atención a clientes?',weight:5},
      {id:'ar10',positions:['archivo_soporte','soporte','archivista'],practiceArea:'corporativo',section:'blandas',category:'Habilidades Blandas',text:'¿Cómo califica la comunicación con el equipo?',weight:10},
      {id:'ar11',positions:['archivo_soporte','soporte','archivista'],practiceArea:'corporativo',section:'blandas',category:'Actitud',text:'¿Cómo califica la actitud de servicio y disposición?',weight:12},
      {id:'ar12',positions:['archivo_soporte','soporte','archivista'],practiceArea:'corporativo',section:'blandas',category:'Disponibilidad',text:'¿Cómo califica la disponibilidad?',weight:10},
      {id:'ar13',positions:['archivo_soporte','soporte','archivista'],practiceArea:'corporativo',section:'blandas',category:'Habilidades Blandas',text:'¿Cómo califica la adaptabilidad?',weight:9},
      {id:'ar14',positions:['archivo_soporte','soporte','archivista'],practiceArea:'corporativo',section:'blandas',category:'Actitud',text:'¿Cómo califica la iniciativa propia?',weight:9},
    ];

    let questionCount = 0;
    let sortOrder = 0;
    for (const q of templateQs) {
      for (const pos of q.positions) {
        sortOrder++;
        await tx.run(conn,
          'INSERT IGNORE INTO template_questions (id, question_id, position, practice_area, section, category, question_text, weight, sort_order, is_active, source) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [uuidv4(), q.id, pos, q.practiceArea, q.section, q.category, q.text, q.weight, sortOrder, 1, 'seed']);
        questionCount++;
      }
    }

    // ─── TECHNICAL QUESTIONS ──────────────────────────────────────────────
    // From technicalQuestions.ts - all 3 practice areas × legal positions
    // Corporativo questions (5 per position)
    const techCorp: Array<{id: string, positions: string[], category: string, text: string, weight: number}> = [
      {id:'tc-corp-soc-1',positions:['socio','salary_partner','counsel'],category:'Conocimiento normativo',text:'¿Identifica de manera correcta el marco legal aplicable y las fuentes normativas relevantes al caso?',weight:12},
      {id:'tc-corp-soc-2',positions:['socio','salary_partner','counsel'],category:'Redacción legal',text:'¿Elabora documentos jurídicos claros, precisos y bien estructurados, con argumentación sólida?',weight:12},
      {id:'tc-corp-soc-3',positions:['socio','salary_partner','counsel'],category:'Due diligence',text:'¿Lidera due diligence completas, identificando riesgos legales y proponiendo estrategias de mitigación?',weight:12},
      {id:'tc-corp-soc-4',positions:['socio','salary_partner','counsel'],category:'Constitución y modificaciones',text:'¿Estructura y negocia operaciones societarias complejas con visión estratégica?',weight:12},
      {id:'tc-corp-soc-5',positions:['socio','salary_partner','counsel'],category:'Atención a clientes',text:'¿Gestiona relaciones con clientes clave, anticipando necesidades y generando confianza profesional?',weight:12},

      {id:'tc-corp-asr-1',positions:['asociado_sr'],category:'Conocimiento normativo',text:'¿Aplica correctamente el marco legal aplicable al caso?',weight:8},
      {id:'tc-corp-asr-2',positions:['asociado_sr'],category:'Redacción legal',text:'¿Redacta documentos jurídicos claros y bien estructurados?',weight:8},
      {id:'tc-corp-asr-3',positions:['asociado_sr'],category:'Due diligence',text:'¿Conduce revisiones legales completas identificando los riesgos principales?',weight:8},
      {id:'tc-corp-asr-4',positions:['asociado_sr'],category:'Constitución y modificaciones',text:'¿Prepara documentos societarios con precisión y atención al detalle?',weight:8},
      {id:'tc-corp-asr-5',positions:['asociado_sr'],category:'Atención a clientes',text:'¿Mantiene comunicación proactiva y clara con los clientes?',weight:8},

      {id:'tc-corp-am-1',positions:['asociado_mid'],category:'Conocimiento normativo',text:'¿Identifica las disposiciones legales aplicables y sus implicaciones prácticas?',weight:8},
      {id:'tc-corp-am-2',positions:['asociado_mid'],category:'Redacción legal',text:'¿Redacta documentos jurídicos con estructura lógica y fundamentación adecuada?',weight:8},
      {id:'tc-corp-am-3',positions:['asociado_mid'],category:'Due diligence',text:'¿Participa en revisiones legales identificando riesgos relevantes?',weight:8},
      {id:'tc-corp-am-4',positions:['asociado_mid'],category:'Constitución y modificaciones',text:'¿Prepara documentos societarios bajo supervisión, con atención al detalle?',weight:8},
      {id:'tc-corp-am-5',positions:['asociado_mid'],category:'Atención a clientes',text:'¿Responde oportunamente a las solicitudes de los clientes?',weight:8},

      {id:'tc-corp-ajr-1',positions:['asociado_jr'],category:'Conocimiento normativo',text:'¿Comprende los conceptos legales básicos y puede identificar las normas aplicables?',weight:8},
      {id:'tc-corp-ajr-2',positions:['asociado_jr'],category:'Redacción legal',text:'¿Redacta borradores simples con guía, iniciando a trabajar en dos idiomas cuando es requerido?',weight:8},
      {id:'tc-corp-ajr-3',positions:['asociado_jr'],category:'Due diligence',text:'¿Sistematiza documentos y apoya en la identificación de hallazgos simples de relevancia legal?',weight:8},
      {id:'tc-corp-ajr-4',positions:['asociado_jr'],category:'Constitución y modificaciones',text:'¿Prepara formatos con supervisión, asegurando precisión y congruencia en la información?',weight:8},
      {id:'tc-corp-ajr-5',positions:['asociado_jr'],category:'Atención a clientes',text:'¿Participa como apoyo en la elaboración de respuestas básicas a clientes o autoridades?',weight:8},

      {id:'tc-corp-pct-1',positions:['pasante_carrera'],category:'Conocimiento normativo',text:'¿Conoce y aplica principios generales del derecho corporativo al realizar sus tareas?',weight:8},
      {id:'tc-corp-pct-2',positions:['pasante_carrera'],category:'Redacción legal',text:'¿Redacta borradores simples con guía, iniciando a trabajar en dos idiomas cuando es requerido?',weight:8},
      {id:'tc-corp-pct-3',positions:['pasante_carrera'],category:'Due diligence',text:'¿Sistematiza documentos y apoya en la identificación de hallazgos simples de relevancia legal?',weight:8},
      {id:'tc-corp-pct-4',positions:['pasante_carrera'],category:'Constitución y modificaciones',text:'¿Prepara formatos con supervisión, asegurando precisión y congruencia en la información?',weight:8},
      {id:'tc-corp-pct-5',positions:['pasante_carrera'],category:'Atención a clientes',text:'¿Participa como apoyo en la elaboración de respuestas básicas a clientes o autoridades?',weight:8},

      {id:'tc-corp-pas-1',positions:['pasante','pasante_corporativo'],category:'Conocimiento normativo',text:'¿Identifica de manera correcta documentos básicos como actas y contratos?',weight:8},
      {id:'tc-corp-pas-2',positions:['pasante','pasante_corporativo'],category:'Redacción legal',text:'¿Llena de forma adecuada y precisa los formatos predefinidos?',weight:8},
      {id:'tc-corp-pas-3',positions:['pasante','pasante_corporativo'],category:'Due diligence',text:'¿Apoya de manera eficiente en la recopilación de documentos solicitados?',weight:8},
      {id:'tc-corp-pas-4',positions:['pasante','pasante_corporativo'],category:'Constitución y modificaciones',text:'¿Realiza búsquedas en el registro público de la propiedad y del comercio o guía trámites de forma correcta?',weight:8},
      {id:'tc-corp-pas-5',positions:['pasante','pasante_corporativo'],category:'Atención a clientes',text:'¿Escucha atentamente las reuniones internas y toma notas completas y ordenadas?',weight:8},
    ];

    // Fiscal Consultoría questions (5 per position, same IDs for same level)
    const techConsultoria: Array<{id: string, positions: string[], category: string, text: string, weight: number}> = [
      {id:'tc-fc-soc-1',positions:['socio','salary_partner','counsel'],category:'Normatividad fiscal',text:'¿Interpreta y aplica con criterio el marco fiscal completo (CFF, LISR, LIVA, RLISR, RMF) al caso concreto?',weight:12},
      {id:'tc-fc-soc-2',positions:['socio','salary_partner','counsel'],category:'Opiniones fiscales',text:'¿Emite opiniones fiscales fundamentadas y estratégicas que guían la toma de decisiones del cliente?',weight:12},
      {id:'tc-fc-soc-3',positions:['socio','salary_partner','counsel'],category:'Planeación fiscal',text:'¿Diseña estrategias de planeación fiscal creativas y legales, alineadas con los objetivos del cliente?',weight:12},
      {id:'tc-fc-soc-4',positions:['socio','salary_partner','counsel'],category:'Criterios y jurisprudencia',text:'¿Analiza y aplica criterios jurisprudenciales relevantes para fortalecer la posición del cliente?',weight:12},
      {id:'tc-fc-soc-5',positions:['socio','salary_partner','counsel'],category:'Impactos fiscales',text:'¿Cuantifica y comunica con claridad los impactos fiscales de las alternativas planteadas?',weight:12},

      {id:'tc-fc-asr-1',positions:['asociado_sr'],category:'Normatividad fiscal',text:'¿Aplica correctamente las disposiciones fiscales aplicables al caso?',weight:8},
      {id:'tc-fc-asr-2',positions:['asociado_sr'],category:'Opiniones fiscales',text:'¿Elabora borradores de opiniones fiscales con análisis jurídico sólido?',weight:8},
      {id:'tc-fc-asr-3',positions:['asociado_sr'],category:'Planeación fiscal',text:'¿Participa en la estructuración de estrategias fiscales bajo supervisión?',weight:8},
      {id:'tc-fc-asr-4',positions:['asociado_sr'],category:'Criterios y jurisprudencia',text:'¿Identifica y resume criterios jurisprudenciales relevantes?',weight:8},
      {id:'tc-fc-asr-5',positions:['asociado_sr'],category:'Impactos fiscales',text:'¿Calcula impactos fiscales con precisión y los presenta de forma clara?',weight:8},

      {id:'tc-fc-am-1',positions:['asociado_mid'],category:'Normatividad fiscal',text:'¿Comprende las disposiciones fiscales principales y sus implicaciones?',weight:8},
      {id:'tc-fc-am-2',positions:['asociado_mid'],category:'Opiniones fiscales',text:'¿Redacta secciones de opiniones fiscales con fundamentación adecuada?',weight:8},
      {id:'tc-fc-am-3',positions:['asociado_mid'],category:'Planeación fiscal',text:'¿Contribuye a la estructuración de alternativas fiscales bajo supervisión?',weight:8},
      {id:'tc-fc-am-4',positions:['asociado_mid'],category:'Criterios y jurisprudencia',text:'¿Investiga y compila criterios relevantes para el caso?',weight:8},
      {id:'tc-fc-am-5',positions:['asociado_mid'],category:'Impactos fiscales',text:'¿Realiza cálculos fiscales básicos con precisión?',weight:8},

      {id:'tc-fc-ajr-1',positions:['asociado_jr'],category:'Normatividad fiscal',text:'¿Identifica las normas fiscales aplicables a un caso concreto?',weight:8},
      {id:'tc-fc-ajr-2',positions:['asociado_jr'],category:'Opiniones fiscales',text:'¿Elabora resúmenes de disposiciones fiscales relevantes?',weight:8},
      {id:'tc-fc-ajr-3',positions:['asociado_jr'],category:'Planeación fiscal',text:'¿Apoya en la recopilación de información para análisis fiscales?',weight:8},
      {id:'tc-fc-ajr-4',positions:['asociado_jr'],category:'Criterios y jurisprudencia',text:'¿Busca y compila criterios jurisprudenciales bajo supervisión?',weight:8},
      {id:'tc-fc-ajr-5',positions:['asociado_jr'],category:'Impactos fiscales',text:'¿Realiza cálculos fiscales simples con verificación?',weight:8},

      {id:'tc-fc-pct-1',positions:['pasante_carrera'],category:'Normatividad fiscal',text:'¿Conoce las disposiciones fiscales básicas y su aplicación?',weight:8},
      {id:'tc-fc-pct-2',positions:['pasante_carrera'],category:'Opiniones fiscales',text:'¿Resume disposiciones fiscales de forma clara y organizada?',weight:8},
      {id:'tc-fc-pct-3',positions:['pasante_carrera'],category:'Planeación fiscal',text:'¿Apoya en la recopilación de datos para análisis fiscales?',weight:8},
      {id:'tc-fc-pct-4',positions:['pasante_carrera'],category:'Criterios y jurisprudencia',text:'¿Busca y clasifica criterios y jurisprudencia bajo supervisión?',weight:8},
      {id:'tc-fc-pct-5',positions:['pasante_carrera'],category:'Impactos fiscales',text:'¿Realiza cálculos fiscales sencillos con guía?',weight:8},

      {id:'tc-fc-pas-1',positions:['pasante','pasante_corporativo'],category:'Normatividad fiscal',text:'¿Conoce las disposiciones fiscales elementales?',weight:8},
      {id:'tc-fc-pas-2',positions:['pasante','pasante_corporativo'],category:'Opiniones fiscales',text:'¿Organiza información fiscal de manera clara?',weight:8},
      {id:'tc-fc-pas-3',positions:['pasante','pasante_corporativo'],category:'Planeación fiscal',text:'¿Apoya en la recopilación de información para el equipo?',weight:8},
      {id:'tc-fc-pas-4',positions:['pasante','pasante_corporativo'],category:'Criterios y jurisprudencia',text:'¿Busca criterios relevantes bajo instrucción?',weight:8},
      {id:'tc-fc-pas-5',positions:['pasante','pasante_corporativo'],category:'Impactos fiscales',text:'¿Realiza cálculos aritméticos básicos con verificación?',weight:8},
    ];

    // Fiscal Litigio questions (5 per position)
    const techLitigio: Array<{id: string, positions: string[], category: string, text: string, weight: number}> = [
      {id:'tc-lf-soc-1',positions:['socio','salary_partner','counsel'],category:'Redacción de escritos',text:'¿Formula la teoría del caso en recursos complejos, integrando argumentos constitucionales y de derechos humanos?',weight:12},
      {id:'tc-lf-soc-2',positions:['socio','salary_partner','counsel'],category:'Estrategia procesal',text:'¿Diseña la estrategia de defensa integral para asuntos de alta cuantía, previendo escenarios ante diversas instancias?',weight:12},
      {id:'tc-lf-soc-3',positions:['socio','salary_partner','counsel'],category:'Audiencias y diligencias',text:'¿Lidera negociaciones ante autoridades y representa al despacho con solidez técnica en audiencias críticas?',weight:12},
      {id:'tc-lf-soc-4',positions:['socio','salary_partner','counsel'],category:'Conocimiento normativo',text:'¿Integra doctrina jurídica y criterios de la SCJN para crear precedentes favorables en la defensa de los clientes?',weight:12},
      {id:'tc-lf-soc-5',positions:['socio','salary_partner','counsel'],category:'Seguimiento de expedientes',text:'¿Supervisa la ejecución impecable de la cartera de juicios, asegurando la rentabilidad y el cumplimiento de objetivos?',weight:12},

      {id:'tc-lf-asr-1',positions:['asociado_sr'],category:'Redacción de escritos',text:'¿Redacta escritos y alegatos jurídicos con estructura lógica y fundamentación sólida?',weight:8},
      {id:'tc-lf-asr-2',positions:['asociado_sr'],category:'Estrategia procesal',text:'¿Participa en la definición de la estrategia procesal bajo supervisión del socio?',weight:8},
      {id:'tc-lf-asr-3',positions:['asociado_sr'],category:'Audiencias y diligencias',text:'¿Prepara y asiste a audiencias con dominio del expediente y capacidad de reacción?',weight:8},
      {id:'tc-lf-asr-4',positions:['asociado_sr'],category:'Conocimiento normativo',text:'¿Aplica correctamente las normas procesales aplicables al caso?',weight:8},
      {id:'tc-lf-asr-5',positions:['asociado_sr'],category:'Seguimiento de expedientes',text:'¿Da seguimiento puntual a plazos y requerimientos procesales?',weight:8},

      {id:'tc-lf-am-1',positions:['asociado_mid'],category:'Redacción de escritos',text:'¿Elabora borradores de escritos con argumentación jurídica adecuada?',weight:8},
      {id:'tc-lf-am-2',positions:['asociado_mid'],category:'Estrategia procesal',text:'¿Contribuye al análisis procesal y propuestas estratégicas bajo supervisión?',weight:8},
      {id:'tc-lf-am-3',positions:['asociado_mid'],category:'Audiencias y diligencias',text:'¿Apoya en la preparación de audiencias y diligencias con investigación y organización?',weight:8},
      {id:'tc-lf-am-4',positions:['asociado_mid'],category:'Conocimiento normativo',text:'¿Investiga y aplica las disposiciones procesales relevantes?',weight:8},
      {id:'tc-lf-am-5',positions:['asociado_mid'],category:'Seguimiento de expedientes',text:'¿Mantiene control de plazos y seguimiento de expedientes?',weight:8},

      {id:'tc-lf-ajr-1',positions:['asociado_jr'],category:'Redacción de escritos',text:'¿Prepara borradores de escritos simples con guía?',weight:8},
      {id:'tc-lf-ajr-2',positions:['asociado_jr'],category:'Estrategia procesal',text:'¿Analiza hechos y normas aplicables bajo supervisión?',weight:8},
      {id:'tc-lf-ajr-3',positions:['asociado_jr'],category:'Audiencias y diligencias',text:'¿Organiza expedientes y documentos para audiencias?',weight:8},
      {id:'tc-lf-ajr-4',positions:['asociado_jr'],category:'Conocimiento normativo',text:'¿Identifica las normas procesales básicas aplicables?',weight:8},
      {id:'tc-lf-ajr-5',positions:['asociado_jr'],category:'Seguimiento de expedientes',text:'¿Realiza seguimiento de plazos y requerimientos bajo supervisión?',weight:8},

      {id:'tc-lf-pct-1',positions:['pasante_carrera'],category:'Redacción de escritos',text:'¿Asiste en la redacción de escritos simples bajo instrucción?',weight:8},
      {id:'tc-lf-pct-2',positions:['pasante_carrera'],category:'Estrategia procesal',text:'¿Investiga antecedentes y jurisprudencia bajo supervisión?',weight:8},
      {id:'tc-lf-pct-3',positions:['pasante_carrera'],category:'Audiencias y diligencias',text:'¿Prepara carpetas de documentos para audiencias?',weight:8},
      {id:'tc-lf-pct-4',positions:['pasante_carrera'],category:'Conocimiento normativo',text:'¿Identifica disposiciones procesales elementales?',weight:8},
      {id:'tc-lf-pct-5',positions:['pasante_carrera'],category:'Seguimiento de expedientes',text:'¿Organiza expedientes y controla plazos básicos?',weight:8},

      {id:'tc-lf-pas-1',positions:['pasante','pasante_corporativo'],category:'Redacción de escritos',text:'¿Apoya en la preparación de documentos básicos para procedimientos?',weight:8},
      {id:'tc-lf-pas-2',positions:['pasante','pasante_corporativo'],category:'Estrategia procesal',text:'¿Investiga información básica para el caso?',weight:8},
      {id:'tc-lf-pas-3',positions:['pasante','pasante_corporativo'],category:'Audiencias y diligencias',text:'¿Organiza documentos y materiales para audiencias?',weight:8},
      {id:'tc-lf-pas-4',positions:['pasante','pasante_corporativo'],category:'Conocimiento normativo',text:'¿Reconoce las normas procesales más relevantes?',weight:8},
      {id:'tc-lf-pas-5',positions:['pasante','pasante_corporativo'],category:'Seguimiento de expedientes',text:'¿Mantiene registros organizados de expedientes?',weight:8},
    ];

    // Insert all technical questions
    const allTechQuestions = [...techCorp, ...techConsultoria, ...techLitigio];
    for (const tq of allTechQuestions) {
      for (const pos of tq.positions) {
        sortOrder++;
        await tx.run(conn,
          'INSERT IGNORE INTO template_questions (id, question_id, position, practice_area, section, category, question_text, weight, sort_order, is_active, source) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [uuidv4(), tq.id, pos, tq.id.startsWith('tc-corp') ? 'corporativo' : tq.id.startsWith('tc-fc') ? 'fiscal_consultoria' : 'fiscal_litigio', 'tecnico', tq.category, tq.text, tq.weight, sortOrder, 1, 'seed']);
        questionCount++;
      }
    }

    console.log(`  ✓ Template questions seeded (total rows: ${questionCount})`);

    // ═══════════════════════════════════════════════════════════════════
    // 7. QUESTION LIBRARY (migrate from existing library_questions table)
    // ═══════════════════════════════════════════════════════════════════
    const existingLib = await tx.all(conn, 'SELECT question_id, category, text, created_by FROM library_questions');
    for (const q of existingLib) {
      await tx.run(conn,
        'INSERT IGNORE INTO question_library (id, question_id, category, text, created_by) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), q.question_id, q.category, q.text, q.created_by]);
    }
    console.log(`  ✓ Question library migrated (${existingLib.length} questions)`);

  });

  console.log('✅ Evaluation data seeding complete!');
}

// Self-execution for standalone run
if (import.meta.url === `file://${process.argv[1]}`) {
  seedEvaluationData().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}

// Cleanup: Delete old custom_eval_questions and template_questions with empty section
// Also delete seed_question_overrides (replaced by template_questions)
export async function cleanupOldCustomQuestions(): Promise<void> {
  console.log('  Cleaning up old evaluation data...');
  try {
    await db.run('DELETE FROM custom_eval_questions');
    console.log('  ✓ Deleted all custom_eval_questions');
  } catch (err: any) {
    if (err?.code !== 'ER_NO_SUCH_TABLE') console.error('  Error cleaning custom_eval_questions:', err);
  }
  
  try {
    await db.run("DELETE FROM template_questions WHERE section IS NULL OR section = ''");
    console.log('  ✓ Cleaned template_questions with empty section');
  } catch (err: any) {
    console.error('  Error cleaning template_questions:', err);
  }
  
  try {
    await db.run('DELETE FROM seed_question_overrides');
    console.log('  ✓ Deleted all seed_question_overrides');
  } catch (err: any) {
    if (err?.code !== 'ER_NO_SUCH_TABLE') console.error('  Error cleaning seed_question_overrides:', err);
  }
}
