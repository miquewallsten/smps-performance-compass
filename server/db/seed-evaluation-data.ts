import { db, tx } from './connection.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed evaluation config data into the database.
 * EXACTLY matches the authoritative Excel file (preguntas-por-posicion-2026-05-28).
 *
 * NORMALIZED ARCHITECTURE:
 * - ALL unique questions live in question_library (84 questions)
 * - template_questions references them via library_question_id FK
 * - question_text is still stored in template_questions (denormalized cache) for query performance
 * - but the canonical source of truth for question text and category is question_library
 *
 * This function DELETES all existing seed data and re-seeds from scratch
 * to ensure the database always matches the Excel.
 *
 * Question Library: NO weights. Weights only exist in template_questions.
 */
export async function seedEvaluationData(): Promise<void> {
  console.log('  Checking if re-seeding is needed...');
  
  // Always run cleanup first
  await cleanupOldCustomQuestions();
  
  // Check if we need to re-seed by counting template_questions
  const count = await db.getScalar<number>('SELECT COUNT(*) as cnt FROM template_questions WHERE source = ?', ['seed']);
  
  if (count === 198) {
    console.log('  Evaluation data already seeded (198 questions), skipping.');
    return;
  }
  
  console.log(`  Current seed questions: ${count}, expected 198. Re-seeding...`);
  
  // Delete all seed data to re-seed fresh
  await db.run("DELETE FROM template_questions WHERE source = 'seed'");
  console.log('  ✓ Deleted existing seed template_questions');
  await db.run("DELETE FROM section_weights");
  console.log('  ✓ Deleted existing section_weights');
  await db.run("DELETE FROM question_library WHERE created_by IS NULL");
  console.log('  ✓ Deleted seed question_library entries');
  
  // Ensure Comunicación category exists (used by Soporte)
  // Ensure all evaluation categories exist
  const categories = [
    { id: 'Desempeño', label: 'Desempeño', section: 'competencias', is_tech: 0, sort: 1 },
    { id: 'Liderazgo', label: 'Liderazgo', section: 'competencias', is_tech: 0, sort: 2 },
    { id: 'Cumplimiento', label: 'Cumplimiento', section: 'competencias', is_tech: 0, sort: 3 },
    { id: 'Trabajo en Equipo', label: 'Trabajo en Equipo', section: 'competencias', is_tech: 0, sort: 4 },
    { id: 'Actitud', label: 'Actitud', section: 'blandas', is_tech: 0, sort: 5 },
    { id: 'Disponibilidad', label: 'Disponibilidad', section: 'blandas', is_tech: 0, sort: 6 },
    { id: 'Habilidades Blandas', label: 'Habilidades Blandas', section: 'blandas', is_tech: 0, sort: 7 },
    { id: 'Desarrollo', label: 'Desarrollo', section: 'blandas', is_tech: 0, sort: 8 },
    { id: 'Criterio Técnico', label: 'Criterio Técnico', section: 'tecnico', is_tech: 0, sort: 9 },
    { id: 'Atención a clientes', label: 'Atención a clientes', section: 'tecnico', is_tech: 1, sort: 10 },
    { id: 'Conocimiento normativo', label: 'Conocimiento normativo', section: 'tecnico', is_tech: 1, sort: 11 },
    { id: 'Constitución y modificaciones', label: 'Constitución y modificaciones', section: 'tecnico', is_tech: 1, sort: 12 },
    { id: 'Due diligence', label: 'Due diligence', section: 'tecnico', is_tech: 1, sort: 13 },
    { id: 'Redacción legal', label: 'Redacción legal', section: 'tecnico', is_tech: 1, sort: 14 },
    { id: 'Comunicación', label: 'Comunicación', section: 'blandas', is_tech: 0, sort: 24 },
  ];
  for (const cat of categories) {
    await db.run("INSERT IGNORE INTO evaluation_categories (id, label, section, is_technical_subcategory, sort_order) VALUES (?, ?, ?, ?, ?)",
      [cat.id, cat.label, cat.section, cat.is_tech, cat.sort]);
  }
  console.log(`  ✓ Categories (${categories.length})`);
  
  const now = () => new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  
  await db.transaction(async (conn) => {


    // ═══════════════════════════════════════════════════════════════════
    // 1. SECTION WEIGHTS (per position, from Excel)
    // ═══════════════════════════════════════════════════════════════════
    const sectionWeights: { position: string; tecnico: number; competencias: number; blandas: number }[] = [
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
    ];
    
    // Seed position_config if empty
    const posCount = await db.getScalar<number>('SELECT COUNT(*) as cnt FROM position_config');
    if (posCount === 0) {
      const positions = [
        { position: 'socio', label: 'Socio', level: 'legal', rank: 1, sort: 1 },
        { position: 'salary_partner', label: 'Salary Partner', level: 'legal', rank: 2, sort: 2 },
        { position: 'counsel', label: 'Counsel', level: 'legal', rank: 3, sort: 3 },
        { position: 'asociado_sr', label: 'Asociado Senior', level: 'legal', rank: 4, sort: 4 },
        { position: 'asociado_mid', label: 'Asociado Mid-Level', level: 'legal', rank: 5, sort: 5 },
        { position: 'asociado_jr', label: 'Asociado Junior', level: 'legal', rank: 6, sort: 6 },
        { position: 'pasante_carrera', label: 'Pasante de Carrera', level: 'legal', rank: 7, sort: 7 },
        { position: 'pasante_corporativo', label: 'Pasante Corporativo', level: 'legal', rank: 8, sort: 8 },
        { position: 'pasante', label: 'Pasante', level: 'legal', rank: 9, sort: 9 },
        { position: 'director', label: 'Director', level: 'administrativo', rank: 1, sort: 10 },
        { position: 'gerente', label: 'Gerente', level: 'administrativo', rank: 2, sort: 11 },
        { position: 'coordinador', label: 'Coordinador', level: 'administrativo', rank: 3, sort: 12 },
        { position: 'analista', label: 'Analista', level: 'administrativo', rank: 4, sort: 13 },
        { position: 'asistente', label: 'Asistente', level: 'administrativo', rank: 5, sort: 14 },
        { position: 'archivo_soporte', label: 'Archivo/Soporte', level: 'administrativo', rank: 6, sort: 15 },
        { position: 'soporte', label: 'Soporte', level: 'administrativo', rank: 7, sort: 16 },
        { position: 'archivista', label: 'Archivista', level: 'administrativo', rank: 8, sort: 17 },
      ];
      for (const pos of positions) {
        await tx.run(conn, 'INSERT IGNORE INTO position_config (position, label, level, position_rank, sort_order, is_active) VALUES(?,?,?,?,?,1)',
          [pos.position, pos.label, pos.level, pos.rank, pos.sort]);
      }
      console.log('  ✓ Position config seeded');
    }

    for (const sw of sectionWeights) {
      await tx.run(conn, 'INSERT INTO section_weights (position, tecnico, competencias, blandas) VALUES (?, ?, ?, ?)',
        [sw.position, sw.tecnico, sw.competencias, sw.blandas]);
    }
    console.log(`  ✓ Section weights (${sectionWeights.length})`);


    // ═══════════════════════════════════════════════════════════════════
    // 2. QUESTION LIBRARY (84 unique questions — the single source of truth)
    // Each question has a questionId, category, defaultSection, and text.
    // Weights only exist in template_questions.
    // ═══════════════════════════════════════════════════════════════════
    const libraryQuestions: { questionId: string; category: string; defaultSection: string; text: string }[] = [
      { questionId: 'ql-001', category: 'Desempeño', defaultSection: 'competencias', text: '¿Cómo califica la calidad de su trabajo?' },
      { questionId: 'ql-002', category: 'Desempeño', defaultSection: 'competencias', text: '¿Cómo califica el cumplimiento de entregas?' },
      { questionId: 'ql-003', category: 'Cumplimiento', defaultSection: 'competencias', text: '¿Cómo califica el seguimiento de procedimientos?' },
      { questionId: 'ql-004', category: 'Trabajo en Equipo', defaultSection: 'competencias', text: '¿Cómo califica la colaboración?' },
      { questionId: 'ql-005', category: 'Cumplimiento', defaultSection: 'competencias', text: '¿Cómo califica la confidencialidad?' },
      { questionId: 'ql-006', category: 'Desempeño', defaultSection: 'competencias', text: '¿Cómo califica la gestión del tiempo?' },
      { questionId: 'ql-007', category: 'Habilidades Blandas', defaultSection: 'blandas', text: '¿Cómo califica la comunicación?' },
      { questionId: 'ql-008', category: 'Actitud', defaultSection: 'blandas', text: '¿Cómo califica la proactividad?' },
      { questionId: 'ql-009', category: 'Disponibilidad', defaultSection: 'blandas', text: '¿Cómo califica la disponibilidad?' },
      { questionId: 'ql-010', category: 'Habilidades Blandas', defaultSection: 'blandas', text: '¿Cómo califica la adaptabilidad?' },
      { questionId: 'ql-011', category: 'Desempeño', defaultSection: 'competencias', text: '¿Cómo califica el cumplimiento de tareas?' },
      { questionId: 'ql-012', category: 'Cumplimiento', defaultSection: 'competencias', text: '¿Cómo califica el seguimiento de instrucciones?' },
      { questionId: 'ql-013', category: 'Desempeño', defaultSection: 'competencias', text: '¿Cómo califica el manejo de sistemas de archivo?' },
      { questionId: 'ql-014', category: 'Trabajo en Equipo', defaultSection: 'competencias', text: '¿Cómo califica la coordinación con su equipo?' },
      { questionId: 'ql-015', category: 'Cumplimiento', defaultSection: 'competencias', text: '¿Cómo califica el seguimiento a instrucciones?' },
      { questionId: 'ql-016', category: 'Habilidades Blandas', defaultSection: 'blandas', text: '¿Cómo califica la comunicación con el equipo?' },
      { questionId: 'ql-017', category: 'Actitud', defaultSection: 'blandas', text: '¿Cómo califica la actitud de servicio y disposición?' },
      { questionId: 'ql-018', category: 'Actitud', defaultSection: 'blandas', text: '¿Cómo califica la iniciativa propia?' },
      { questionId: 'ql-019', category: 'Trabajo en Equipo', defaultSection: 'competencias', text: '¿Cómo califica la colaboración con el equipo?' },
      { questionId: 'ql-020', category: 'Desempeño', defaultSection: 'competencias', text: '¿Cómo califica la puntualidad?' },
      { questionId: 'ql-021', category: 'Conocimiento normativo', defaultSection: 'tecnico', text: '¿Aplica correctamente las normas societarias básicas en los asuntos que gestiona?' },
      { questionId: 'ql-022', category: 'Redacción legal', defaultSection: 'tecnico', text: '¿Redacta documentos sencillos utilizando vocabulario técnico en inglés y español de manera adecuada?' },
      { questionId: 'ql-023', category: 'Due diligence', defaultSection: 'tecnico', text: '¿Identifica irregularidades evidentes en documentos o procesos societarios?' },
      { questionId: 'ql-024', category: 'Constitución y modificaciones', defaultSection: 'tecnico', text: '¿Tramita asambleas y poderes básicos siguiendo los procedimientos establecidos?' },
      { questionId: 'ql-025', category: 'Atención a clientes', defaultSection: 'tecnico', text: '¿Da seguimiento técnico inicial a los asuntos, asegurando su avance conforme a lo planificado?' },
      { questionId: 'ql-026', category: 'Liderazgo', defaultSection: 'competencias', text: '¿Cómo califica la capacidad de guía a miembros junior del equipo?' },
      { questionId: 'ql-027', category: 'Habilidades Blandas', defaultSection: 'blandas', text: '¿Cómo califica la comunicación efectiva?' },
      { questionId: 'ql-028', category: 'Actitud', defaultSection: 'blandas', text: '¿Cómo califica la disposición para aprender?' },
      { questionId: 'ql-029', category: 'Conocimiento normativo', defaultSection: 'tecnico', text: '¿Analiza de manera adecuada las implicaciones jurídicas de los asuntos que gestiona?' },
      { questionId: 'ql-030', category: 'Redacción legal', defaultSection: 'tecnico', text: '¿Elabora contratos incluyendo cláusulas específicas que respondan a las necesidades del cliente?' },
      { questionId: 'ql-031', category: 'Due diligence', defaultSection: 'tecnico', text: '¿Redacta reportes técnicos claros, precisos y completos?' },
      { questionId: 'ql-032', category: 'Constitución y modificaciones', defaultSection: 'tecnico', text: '¿Coordina asambleas y modificaciones societarias complejas con criterio profesional?' },
      { questionId: 'ql-033', category: 'Atención a clientes', defaultSection: 'tecnico', text: '¿Gestiona la relación con el cliente, respondiendo oportunamente a sus consultas?' },
      { questionId: 'ql-034', category: 'Trabajo en Equipo', defaultSection: 'competencias', text: '¿Cómo califica la colaboración efectiva con el equipo?' },
      { questionId: 'ql-035', category: 'Habilidades Blandas', defaultSection: 'blandas', text: '¿Cómo califica la comunicación con clientes y colegas?' },
      { questionId: 'ql-036', category: 'Actitud', defaultSection: 'blandas', text: '¿Cómo califica la actitud de servicio y compromiso?' },
      { questionId: 'ql-037', category: 'Disponibilidad', defaultSection: 'blandas', text: '¿Cómo califica la disponibilidad y respuesta oportuna?' },
      { questionId: 'ql-038', category: 'Habilidades Blandas', defaultSection: 'blandas', text: '¿Cómo califica la capacidad de adaptación al cambio?' },
      { questionId: 'ql-039', category: 'Conocimiento normativo', defaultSection: 'tecnico', text: '¿Domina las disposiciones legales aplicables y las aplica con criterio en casos complejos?' },
      { questionId: 'ql-040', category: 'Redacción legal', defaultSection: 'tecnico', text: '¿Elabora documentos jurídicos sofisticados con alto nivel de precisión y detalle?' },
      { questionId: 'ql-041', category: 'Due diligence', defaultSection: 'tecnico', text: '¿Lidera procesos de revisión exhaustiva identificando riesgos y oportunidades legales?' },
      { questionId: 'ql-042', category: 'Constitución y modificaciones', defaultSection: 'tecnico', text: '¿Diseña y supervisa estructuras societarias complejas con visión estratégica?' },
      { questionId: 'ql-043', category: 'Atención a clientes', defaultSection: 'tecnico', text: '¿Asesora estratégicamente al cliente, anticipando escenarios y proponiendo soluciones?' },
      { questionId: 'ql-044', category: 'Liderazgo', defaultSection: 'competencias', text: '¿Cómo califica el liderazgo en casos complejos?' },
      { questionId: 'ql-045', category: 'Desempeño', defaultSection: 'competencias', text: '¿Cómo califica el cumplimiento de objetivos?' },
      { questionId: 'ql-046', category: 'Trabajo en Equipo', defaultSection: 'competencias', text: '¿Cómo califica la coordinación del equipo?' },
      { questionId: 'ql-047', category: 'Desempeño', defaultSection: 'competencias', text: '¿Cómo califica la eficiencia en sus procesos?' },
      { questionId: 'ql-048', category: 'Habilidades Blandas', defaultSection: 'blandas', text: '¿Cómo califica la resolución de conflictos?' },
      { questionId: 'ql-049', category: 'Actitud', defaultSection: 'blandas', text: '¿Cómo califica la proactividad y compromiso?' },
      { questionId: 'ql-050', category: 'Disponibilidad', defaultSection: 'blandas', text: '¿Cómo califica la disponibilidad para situaciones urgentes?' },
      { questionId: 'ql-051', category: 'Desempeño', defaultSection: 'competencias', text: '¿Cómo califica el cumplimiento de objetivos y metas?' },
      { questionId: 'ql-052', category: 'Trabajo en Equipo', defaultSection: 'competencias', text: '¿Cómo califica la coordinación del equipo a su cargo?' },
      { questionId: 'ql-053', category: 'Desempeño', defaultSection: 'competencias', text: '¿Cómo califica la eficiencia operativa?' },
      { questionId: 'ql-054', category: 'Actitud', defaultSection: 'blandas', text: '¿Cómo califica la actitud de servicio?' },
      { questionId: 'ql-055', category: 'Liderazgo', defaultSection: 'competencias', text: '¿Cómo califica la visión estratégica y dirección del despacho?' },
      { questionId: 'ql-056', category: 'Liderazgo', defaultSection: 'competencias', text: '¿Cómo califica el desarrollo y mentoría del equipo?' },
      { questionId: 'ql-057', category: 'Liderazgo', defaultSection: 'competencias', text: '¿Cómo califica la toma de decisiones estratégicas?' },
      { questionId: 'ql-058', category: 'Trabajo en Equipo', defaultSection: 'competencias', text: '¿Cómo califica la coordinación entre áreas y socios?' },
      { questionId: 'ql-059', category: 'Habilidades Blandas', defaultSection: 'blandas', text: '¿Cómo califica la comunicación con el equipo y clientes?' },
      { questionId: 'ql-060', category: 'Habilidades Blandas', defaultSection: 'blandas', text: '¿Cómo califica la resolución de conflictos internos?' },
      { questionId: 'ql-061', category: 'Actitud', defaultSection: 'blandas', text: '¿Cómo califica la ética profesional y ejemplo hacia el equipo?' },
      { questionId: 'ql-062', category: 'Disponibilidad', defaultSection: 'blandas', text: '¿Cómo califica la disponibilidad ante situaciones críticas?' },
      { questionId: 'ql-063', category: 'Habilidades Blandas', defaultSection: 'blandas', text: '¿Cómo califica la capacidad de innovación y adaptación?' },
      { questionId: 'ql-064', category: 'Liderazgo', defaultSection: 'competencias', text: '¿Cómo califica la visión estratégica y dirección del área?' },
      { questionId: 'ql-065', category: 'Liderazgo', defaultSection: 'competencias', text: '¿Cómo califica la gestión de recursos humanos y financieros?' },
      { questionId: 'ql-067', category: 'Trabajo en Equipo', defaultSection: 'competencias', text: '¿Cómo califica la coordinación entre departamentos?' },
      { questionId: 'ql-069', category: 'Cumplimiento', defaultSection: 'competencias', text: '¿Cómo califica el seguimiento de políticas y procedimientos?' },
      { questionId: 'ql-070', category: 'Actitud', defaultSection: 'blandas', text: '¿Cómo califica el compromiso con la firma?' },
      { questionId: 'ql-071', category: 'Liderazgo', defaultSection: 'competencias', text: '¿Cómo califica la gestión del equipo a su cargo?' },
      { questionId: 'ql-072', category: 'Trabajo en Equipo', defaultSection: 'competencias', text: '¿Cómo califica la coordinación con otras áreas?' },
      { questionId: 'ql-073', category: 'Cumplimiento', defaultSection: 'competencias', text: '¿Cómo califica el seguimiento de políticas?' },
      { questionId: 'ql-074', category: 'Habilidades Blandas', defaultSection: 'blandas', text: '¿Cómo califica la resolución de problemas?' },
      { questionId: 'ql-075', category: 'Conocimiento normativo', defaultSection: 'tecnico', text: '¿Identifica de manera correcta documentos básicos como actas y contratos?' },
      { questionId: 'ql-076', category: 'Redacción legal', defaultSection: 'tecnico', text: '¿Llena de forma adecuada y precisa los formatos predefinidos?' },
      { questionId: 'ql-077', category: 'Due diligence', defaultSection: 'tecnico', text: '¿Apoya de manera eficiente en la recopilación de documentos solicitados?' },
      { questionId: 'ql-078', category: 'Constitución y modificaciones', defaultSection: 'tecnico', text: '¿Realiza búsquedas en el registro público de la propiedad y del comercio o guía trámites de forma correcta?' },
      { questionId: 'ql-079', category: 'Atención a clientes', defaultSection: 'tecnico', text: '¿Escucha atentamente las reuniones internas y toma notas completas y ordenadas?' },
      { questionId: 'ql-080', category: 'Conocimiento normativo', defaultSection: 'tecnico', text: '¿Conoce y aplica principios generales del derecho corporativo al realizar sus tareas?' },
      { questionId: 'ql-081', category: 'Redacción legal', defaultSection: 'tecnico', text: '¿Redacta borradores simples con guía, iniciando a trabajar en dos idiomas cuando es requerido?' },
      { questionId: 'ql-082', category: 'Due diligence', defaultSection: 'tecnico', text: '¿Sistematiza documentos y apoya en la identificación de hallazgos simples de relevancia legal?' },
      { questionId: 'ql-083', category: 'Constitución y modificaciones', defaultSection: 'tecnico', text: '¿Prepara formatos con supervisión, asegurando precisión y congruencia en la información?' },
      { questionId: 'ql-084', category: 'Atención a clientes', defaultSection: 'tecnico', text: '¿Participa como apoyo en la elaboración de respuestas básicas a clientes o autoridades?' },
    ];

    // Build a quick lookup: questionId -> text
    const libMap = new Map<string, string>();
    for (const q of libraryQuestions) {
      libMap.set(q.questionId, q.text);
      await tx.run(conn,
        'INSERT IGNORE INTO question_library (id, question_id, category, default_section, text, created_by) VALUES (?, ?, ?, ?, ?, NULL)',
        [uuidv4(), q.questionId, q.category, q.defaultSection, q.text]);
    }
    console.log(`  ✓ Question library (${libraryQuestions.length} unique questions)`);


    // ═══════════════════════════════════════════════════════════════════
    // 3. TEMPLATE QUESTIONS (200 entries referencing question_library)
    // Each entry references a library question by libraryRef and adds
    // position-specific data (position, practiceArea, section, category, weight).
    // ═══════════════════════════════════════════════════════════════════
    const templateQuestions: { libraryRef: string; position: string; practiceArea: string; section: string; category: string; weight: number; sortOrder: number }[] = [
      { libraryRef: 'ql-001', position: 'analista', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 17, sortOrder: 1 },
      { libraryRef: 'ql-002', position: 'analista', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 15, sortOrder: 2 },
      { libraryRef: 'ql-003', position: 'analista', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 13, sortOrder: 3 },
      { libraryRef: 'ql-004', position: 'analista', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 13, sortOrder: 4 },
      { libraryRef: 'ql-005', position: 'analista', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 12, sortOrder: 5 },
      { libraryRef: 'ql-006', position: 'analista', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 10, sortOrder: 6 },
      { libraryRef: 'ql-007', position: 'analista', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 7 },
      { libraryRef: 'ql-008', position: 'analista', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 5, sortOrder: 8 },
      { libraryRef: 'ql-009', position: 'analista', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', weight: 5, sortOrder: 9 },
      { libraryRef: 'ql-010', position: 'analista', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 10 },
      { libraryRef: 'ql-001', position: 'archivista', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 10, sortOrder: 11 },
      { libraryRef: 'ql-011', position: 'archivista', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 8, sortOrder: 12 },
      { libraryRef: 'ql-012', position: 'archivista', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 7, sortOrder: 13 },
      { libraryRef: 'ql-013', position: 'archivista', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 7, sortOrder: 14 },
      { libraryRef: 'ql-014', position: 'archivista', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 6, sortOrder: 15 },
      { libraryRef: 'ql-015', position: 'archivista', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 6, sortOrder: 16 },
      { libraryRef: 'ql-005', position: 'archivista', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 6, sortOrder: 17 },
      { libraryRef: 'ql-016', position: 'archivista', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 10, sortOrder: 18 },
      { libraryRef: 'ql-017', position: 'archivista', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 12, sortOrder: 19 },
      { libraryRef: 'ql-009', position: 'archivista', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', weight: 10, sortOrder: 20 },
      { libraryRef: 'ql-010', position: 'archivista', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 9, sortOrder: 21 },
      { libraryRef: 'ql-018', position: 'archivista', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 9, sortOrder: 22 },
      { libraryRef: 'ql-001', position: 'archivo_soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 10, sortOrder: 23 },
      { libraryRef: 'ql-011', position: 'archivo_soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 8, sortOrder: 24 },
      { libraryRef: 'ql-012', position: 'archivo_soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 7, sortOrder: 25 },
      { libraryRef: 'ql-013', position: 'archivo_soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 7, sortOrder: 26 },
      { libraryRef: 'ql-014', position: 'archivo_soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 6, sortOrder: 27 },
      { libraryRef: 'ql-015', position: 'archivo_soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 6, sortOrder: 28 },
      { libraryRef: 'ql-005', position: 'archivo_soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 6, sortOrder: 29 },
      { libraryRef: 'ql-016', position: 'archivo_soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 10, sortOrder: 30 },
      { libraryRef: 'ql-017', position: 'archivo_soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 12, sortOrder: 31 },
      { libraryRef: 'ql-009', position: 'archivo_soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', weight: 10, sortOrder: 32 },
      { libraryRef: 'ql-010', position: 'archivo_soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 9, sortOrder: 33 },
      { libraryRef: 'ql-018', position: 'archivo_soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 9, sortOrder: 34 },
      { libraryRef: 'ql-001', position: 'asistente', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 10, sortOrder: 35 },
      { libraryRef: 'ql-011', position: 'asistente', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 10, sortOrder: 36 },
      { libraryRef: 'ql-012', position: 'asistente', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 8, sortOrder: 37 },
      { libraryRef: 'ql-019', position: 'asistente', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 8, sortOrder: 38 },
      { libraryRef: 'ql-005', position: 'asistente', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 8, sortOrder: 39 },
      { libraryRef: 'ql-020', position: 'asistente', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 6, sortOrder: 40 },
      { libraryRef: 'ql-017', position: 'asistente', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 15, sortOrder: 41 },
      { libraryRef: 'ql-009', position: 'asistente', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', weight: 13, sortOrder: 42 },
      { libraryRef: 'ql-007', position: 'asistente', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 11, sortOrder: 43 },
      { libraryRef: 'ql-010', position: 'asistente', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 11, sortOrder: 44 },
      { libraryRef: 'ql-021', position: 'asociado_jr', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', weight: 8, sortOrder: 45 },
      { libraryRef: 'ql-022', position: 'asociado_jr', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', weight: 8, sortOrder: 46 },
      { libraryRef: 'ql-023', position: 'asociado_jr', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', weight: 8, sortOrder: 47 },
      { libraryRef: 'ql-024', position: 'asociado_jr', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', weight: 8, sortOrder: 48 },
      { libraryRef: 'ql-025', position: 'asociado_jr', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', weight: 8, sortOrder: 49 },
      { libraryRef: 'ql-019', position: 'asociado_jr', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 15, sortOrder: 50 },
      { libraryRef: 'ql-012', position: 'asociado_jr', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 15, sortOrder: 51 },
      { libraryRef: 'ql-026', position: 'asociado_jr', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', weight: 10, sortOrder: 52 },
      { libraryRef: 'ql-027', position: 'asociado_jr', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 53 },
      { libraryRef: 'ql-028', position: 'asociado_jr', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 5, sortOrder: 54 },
      { libraryRef: 'ql-009', position: 'asociado_jr', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', weight: 5, sortOrder: 55 },
      { libraryRef: 'ql-010', position: 'asociado_jr', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 56 },
      { libraryRef: 'ql-029', position: 'asociado_mid', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', weight: 12, sortOrder: 57 },
      { libraryRef: 'ql-030', position: 'asociado_mid', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', weight: 12, sortOrder: 58 },
      { libraryRef: 'ql-031', position: 'asociado_mid', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', weight: 12, sortOrder: 59 },
      { libraryRef: 'ql-032', position: 'asociado_mid', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', weight: 12, sortOrder: 60 },
      { libraryRef: 'ql-033', position: 'asociado_mid', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', weight: 12, sortOrder: 61 },
      { libraryRef: 'ql-026', position: 'asociado_mid', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', weight: 10, sortOrder: 62 },
      { libraryRef: 'ql-034', position: 'asociado_mid', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 10, sortOrder: 63 },
      { libraryRef: 'ql-035', position: 'asociado_mid', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 64 },
      { libraryRef: 'ql-036', position: 'asociado_mid', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 5, sortOrder: 65 },
      { libraryRef: 'ql-037', position: 'asociado_mid', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', weight: 5, sortOrder: 66 },
      { libraryRef: 'ql-038', position: 'asociado_mid', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 67 },
      { libraryRef: 'ql-039', position: 'asociado_sr', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', weight: 12, sortOrder: 68 },
      { libraryRef: 'ql-040', position: 'asociado_sr', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', weight: 12, sortOrder: 69 },
      { libraryRef: 'ql-041', position: 'asociado_sr', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', weight: 12, sortOrder: 70 },
      { libraryRef: 'ql-042', position: 'asociado_sr', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', weight: 12, sortOrder: 71 },
      { libraryRef: 'ql-043', position: 'asociado_sr', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', weight: 12, sortOrder: 72 },
      { libraryRef: 'ql-044', position: 'asociado_sr', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', weight: 5, sortOrder: 73 },
      { libraryRef: 'ql-045', position: 'asociado_sr', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', weight: 10, sortOrder: 74 },
      { libraryRef: 'ql-046', position: 'asociado_sr', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 5, sortOrder: 75 },
      { libraryRef: 'ql-047', position: 'asociado_sr', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 76 },
      { libraryRef: 'ql-048', position: 'asociado_sr', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 77 },
      { libraryRef: 'ql-049', position: 'asociado_sr', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 5, sortOrder: 78 },
      { libraryRef: 'ql-050', position: 'asociado_sr', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', weight: 5, sortOrder: 79 },
      { libraryRef: 'ql-051', position: 'coordinador', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 17, sortOrder: 80 },
      { libraryRef: 'ql-052', position: 'coordinador', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 15, sortOrder: 81 },
      { libraryRef: 'ql-053', position: 'coordinador', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 13, sortOrder: 82 },
      { libraryRef: 'ql-012', position: 'coordinador', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 13, sortOrder: 83 },
      { libraryRef: 'ql-004', position: 'coordinador', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 12, sortOrder: 84 },
      { libraryRef: 'ql-005', position: 'coordinador', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 10, sortOrder: 85 },
      { libraryRef: 'ql-007', position: 'coordinador', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 86 },
      { libraryRef: 'ql-054', position: 'coordinador', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 5, sortOrder: 87 },
      { libraryRef: 'ql-009', position: 'coordinador', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', weight: 5, sortOrder: 88 },
      { libraryRef: 'ql-010', position: 'coordinador', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 89 },
      { libraryRef: 'ql-039', position: 'counsel', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', weight: 12, sortOrder: 90 },
      { libraryRef: 'ql-040', position: 'counsel', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', weight: 12, sortOrder: 91 },
      { libraryRef: 'ql-041', position: 'counsel', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', weight: 12, sortOrder: 92 },
      { libraryRef: 'ql-042', position: 'counsel', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', weight: 12, sortOrder: 93 },
      { libraryRef: 'ql-043', position: 'counsel', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', weight: 12, sortOrder: 94 },
      { libraryRef: 'ql-055', position: 'counsel', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', weight: 5, sortOrder: 95 },
      { libraryRef: 'ql-056', position: 'counsel', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', weight: 5, sortOrder: 96 },
      { libraryRef: 'ql-057', position: 'counsel', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', weight: 5, sortOrder: 97 },
      { libraryRef: 'ql-058', position: 'counsel', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 5, sortOrder: 98 },
      { libraryRef: 'ql-059', position: 'counsel', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 4, sortOrder: 99 },
      { libraryRef: 'ql-060', position: 'counsel', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 4, sortOrder: 100 },
      { libraryRef: 'ql-061', position: 'counsel', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 4, sortOrder: 101 },
      { libraryRef: 'ql-062', position: 'counsel', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', weight: 4, sortOrder: 102 },
      { libraryRef: 'ql-063', position: 'counsel', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 4, sortOrder: 103 },
      { libraryRef: 'ql-064', position: 'director', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', weight: 15, sortOrder: 104 },
      { libraryRef: 'ql-065', position: 'director', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', weight: 14, sortOrder: 105 },
      { libraryRef: 'ql-051', position: 'director', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 14, sortOrder: 106 },
      { libraryRef: 'ql-067', position: 'director', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 13, sortOrder: 107 },
      { libraryRef: 'ql-053', position: 'director', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 13, sortOrder: 108 },
      { libraryRef: 'ql-069', position: 'director', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 11, sortOrder: 109 },
      { libraryRef: 'ql-016', position: 'director', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 110 },
      { libraryRef: 'ql-070', position: 'director', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 5, sortOrder: 111 },
      { libraryRef: 'ql-009', position: 'director', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', weight: 5, sortOrder: 112 },
      { libraryRef: 'ql-048', position: 'director', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 113 },
      { libraryRef: 'ql-071', position: 'gerente', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', weight: 15, sortOrder: 114 },
      { libraryRef: 'ql-051', position: 'gerente', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 15, sortOrder: 115 },
      { libraryRef: 'ql-053', position: 'gerente', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 13, sortOrder: 116 },
      { libraryRef: 'ql-072', position: 'gerente', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 13, sortOrder: 117 },
      { libraryRef: 'ql-073', position: 'gerente', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 12, sortOrder: 118 },
      { libraryRef: 'ql-005', position: 'gerente', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 12, sortOrder: 119 },
      { libraryRef: 'ql-027', position: 'gerente', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 120 },
      { libraryRef: 'ql-008', position: 'gerente', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 5, sortOrder: 121 },
      { libraryRef: 'ql-009', position: 'gerente', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', weight: 5, sortOrder: 122 },
      { libraryRef: 'ql-074', position: 'gerente', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 123 },
      { libraryRef: 'ql-075', position: 'pasante', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', weight: 8, sortOrder: 124 },
      { libraryRef: 'ql-076', position: 'pasante', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', weight: 8, sortOrder: 125 },
      { libraryRef: 'ql-077', position: 'pasante', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', weight: 8, sortOrder: 126 },
      { libraryRef: 'ql-078', position: 'pasante', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', weight: 8, sortOrder: 127 },
      { libraryRef: 'ql-079', position: 'pasante', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', weight: 8, sortOrder: 128 },
      { libraryRef: 'ql-019', position: 'pasante', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 15, sortOrder: 129 },
      { libraryRef: 'ql-072', position: 'pasante', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 15, sortOrder: 130 },
      { libraryRef: 'ql-012', position: 'pasante', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 10, sortOrder: 131 },
      { libraryRef: 'ql-007', position: 'pasante', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 132 },
      { libraryRef: 'ql-028', position: 'pasante', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 5, sortOrder: 133 },
      { libraryRef: 'ql-009', position: 'pasante', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', weight: 5, sortOrder: 134 },
      { libraryRef: 'ql-010', position: 'pasante', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 135 },
      { libraryRef: 'ql-080', position: 'pasante_carrera', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', weight: 8, sortOrder: 136 },
      { libraryRef: 'ql-081', position: 'pasante_carrera', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', weight: 8, sortOrder: 137 },
      { libraryRef: 'ql-082', position: 'pasante_carrera', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', weight: 8, sortOrder: 138 },
      { libraryRef: 'ql-083', position: 'pasante_carrera', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', weight: 8, sortOrder: 139 },
      { libraryRef: 'ql-084', position: 'pasante_carrera', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', weight: 8, sortOrder: 140 },
      { libraryRef: 'ql-019', position: 'pasante_carrera', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 10, sortOrder: 141 },
      { libraryRef: 'ql-012', position: 'pasante_carrera', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 10, sortOrder: 142 },
      { libraryRef: 'ql-007', position: 'pasante_carrera', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 143 },
      { libraryRef: 'ql-028', position: 'pasante_carrera', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 5, sortOrder: 144 },
      { libraryRef: 'ql-009', position: 'pasante_carrera', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', weight: 5, sortOrder: 145 },
      { libraryRef: 'ql-010', position: 'pasante_carrera', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 146 },
      { libraryRef: 'ql-075', position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', weight: 8, sortOrder: 147 },
      { libraryRef: 'ql-076', position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', weight: 8, sortOrder: 148 },
      { libraryRef: 'ql-077', position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', weight: 8, sortOrder: 149 },
      { libraryRef: 'ql-078', position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', weight: 8, sortOrder: 150 },
      { libraryRef: 'ql-079', position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', weight: 8, sortOrder: 151 },
      { libraryRef: 'ql-019', position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 15, sortOrder: 152 },
      { libraryRef: 'ql-072', position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 15, sortOrder: 153 },
      { libraryRef: 'ql-012', position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 10, sortOrder: 154 },
      { libraryRef: 'ql-007', position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 155 },
      { libraryRef: 'ql-028', position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 5, sortOrder: 156 },
      { libraryRef: 'ql-009', position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', weight: 5, sortOrder: 157 },
      { libraryRef: 'ql-010', position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 5, sortOrder: 158 },
      { libraryRef: 'ql-039', position: 'salary_partner', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', weight: 12, sortOrder: 159 },
      { libraryRef: 'ql-040', position: 'salary_partner', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', weight: 12, sortOrder: 160 },
      { libraryRef: 'ql-041', position: 'salary_partner', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', weight: 12, sortOrder: 161 },
      { libraryRef: 'ql-042', position: 'salary_partner', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', weight: 12, sortOrder: 162 },
      { libraryRef: 'ql-043', position: 'salary_partner', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', weight: 12, sortOrder: 163 },
      { libraryRef: 'ql-055', position: 'salary_partner', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', weight: 5, sortOrder: 164 },
      { libraryRef: 'ql-056', position: 'salary_partner', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', weight: 5, sortOrder: 165 },
      { libraryRef: 'ql-057', position: 'salary_partner', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', weight: 5, sortOrder: 166 },
      { libraryRef: 'ql-058', position: 'salary_partner', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 5, sortOrder: 167 },
      { libraryRef: 'ql-059', position: 'salary_partner', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 4, sortOrder: 168 },
      { libraryRef: 'ql-060', position: 'salary_partner', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 4, sortOrder: 169 },
      { libraryRef: 'ql-061', position: 'salary_partner', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 4, sortOrder: 170 },
      { libraryRef: 'ql-062', position: 'salary_partner', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', weight: 4, sortOrder: 171 },
      { libraryRef: 'ql-063', position: 'salary_partner', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 4, sortOrder: 172 },
      { libraryRef: 'ql-039', position: 'socio', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', weight: 12, sortOrder: 173 },
      { libraryRef: 'ql-040', position: 'socio', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', weight: 12, sortOrder: 174 },
      { libraryRef: 'ql-041', position: 'socio', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', weight: 12, sortOrder: 175 },
      { libraryRef: 'ql-042', position: 'socio', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', weight: 12, sortOrder: 176 },
      { libraryRef: 'ql-043', position: 'socio', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', weight: 12, sortOrder: 177 },
      { libraryRef: 'ql-055', position: 'socio', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', weight: 5, sortOrder: 178 },
      { libraryRef: 'ql-056', position: 'socio', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', weight: 5, sortOrder: 179 },
      { libraryRef: 'ql-057', position: 'socio', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', weight: 5, sortOrder: 180 },
      { libraryRef: 'ql-058', position: 'socio', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 5, sortOrder: 181 },
      { libraryRef: 'ql-059', position: 'socio', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 4, sortOrder: 182 },
      { libraryRef: 'ql-060', position: 'socio', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 4, sortOrder: 183 },
      { libraryRef: 'ql-061', position: 'socio', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 4, sortOrder: 184 },
      { libraryRef: 'ql-062', position: 'socio', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', weight: 4, sortOrder: 185 },
      { libraryRef: 'ql-063', position: 'socio', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 4, sortOrder: 186 },
      { libraryRef: 'ql-001', position: 'soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 9, sortOrder: 187 },
      { libraryRef: 'ql-011', position: 'soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 9, sortOrder: 188 },
      { libraryRef: 'ql-012', position: 'soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 7, sortOrder: 189 },
      { libraryRef: 'ql-013', position: 'soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 7, sortOrder: 190 },
      { libraryRef: 'ql-014', position: 'soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', weight: 6, sortOrder: 191 },
      { libraryRef: 'ql-015', position: 'soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', weight: 6, sortOrder: 192 },
      { libraryRef: 'ql-005', position: 'soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 6, sortOrder: 193 },
      { libraryRef: 'ql-016', position: 'soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Comunicación', weight: 10, sortOrder: 194 },
      { libraryRef: 'ql-017', position: 'soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 12, sortOrder: 195 },
      { libraryRef: 'ql-009', position: 'soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', weight: 10, sortOrder: 196 },
      { libraryRef: 'ql-010', position: 'soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', weight: 9, sortOrder: 197 },
      { libraryRef: 'ql-018', position: 'soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', weight: 9, sortOrder: 198 },
      { libraryRef: 'ql-001', position: 'pasante_carrera', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 10, sortOrder: 199 },
      { libraryRef: 'ql-011', position: 'pasante_carrera', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', weight: 10, sortOrder: 200 },
    ];
    
    // Insert template questions with library_question_id reference
    let questionCount = 0;
    for (const tq of templateQuestions) {
      const libText = libMap.get(tq.libraryRef) || '';
      // Look up the library question id to set as library_question_id
      const libRow = await tx.get(conn, 'SELECT id FROM question_library WHERE question_id = ?', [tq.libraryRef]);
      const libraryQuestionId = libRow ? libRow.id : null;
      
      await tx.run(conn,
        'INSERT INTO template_questions (id, question_id, position, practice_area, section, category, question_text, weight, sort_order, is_active, source, library_question_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
        [uuidv4(), 'seed-' + tq.sortOrder.toString().padStart(3, '0'), tq.position, tq.practiceArea, tq.section, tq.category, libText, tq.weight, tq.sortOrder, 'seed', libraryQuestionId]);
      questionCount++;
    }
    console.log(`  ✓ Template questions seeded: ${questionCount} rows`);

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

// Cleanup: Delete old data that shouldn't exist
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
// redeploy trigger Thu May 28 14:07:30 CST 2026
