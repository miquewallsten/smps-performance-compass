import { db, tx } from './connection.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed evaluation config data into the database.
 * EXACTLY matches the authoritative Excel file (preguntas-por-posicion-2026-05-28).
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
  
  if (count === 200) {
    console.log('  Evaluation data already seeded (200 questions), skipping.');
    return;
  }
  
  console.log(`  Current seed questions: ${count}, expected 200. Re-seeding...`);
  
  // Delete all seed data to re-seed fresh
  await db.run("DELETE FROM template_questions WHERE source = 'seed'");
  console.log('  ✓ Deleted existing seed template_questions');
  await db.run("DELETE FROM section_weights");
  console.log('  ✓ Deleted existing section_weights');
  await db.run("DELETE FROM question_library WHERE created_by IS NULL");
  console.log('  ✓ Deleted seed question_library entries');
  
  // Ensure Comunicación category exists (used by Soporte)
  await db.run("INSERT IGNORE INTO evaluation_categories (id, label, section, is_technical_subcategory, sort_order) VALUES ('Comunicación', 'Comunicación', 'blandas', 0, 24)");
  
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
    
    for (const sw of sectionWeights) {
      await tx.run(conn, 'INSERT INTO section_weights (position, tecnico, competencias, blandas) VALUES (?, ?, ?, ?)',
        [sw.position, sw.tecnico, sw.competencias, sw.blandas]);
    }
    console.log(`  ✓ Section weights (${sectionWeights.length})`);


    // ═══════════════════════════════════════════════════════════════════
    // 2. QUESTION LIBRARY (no weights — weights only in templates)
    // ═══════════════════════════════════════════════════════════════════
    const libraryQuestions: { questionId: string; category: string; text: string }[] = [

      { questionId: 'ql-001', category: 'Actitud', text: '¿Cómo califica el compromiso con la firma?' },
      { questionId: 'ql-002', category: 'Actitud', text: '¿Cómo califica la actitud de servicio y compromiso?' },
      { questionId: 'ql-003', category: 'Actitud', text: '¿Cómo califica la actitud de servicio y disposición?' },
      { questionId: 'ql-004', category: 'Actitud', text: '¿Cómo califica la actitud de servicio?' },
      { questionId: 'ql-005', category: 'Actitud', text: '¿Cómo califica la disposición para aprender?' },
      { questionId: 'ql-006', category: 'Actitud', text: '¿Cómo califica la iniciativa propia?' },
      { questionId: 'ql-007', category: 'Actitud', text: '¿Cómo califica la proactividad y compromiso?' },
      { questionId: 'ql-008', category: 'Actitud', text: '¿Cómo califica la proactividad?' },
      { questionId: 'ql-009', category: 'Actitud', text: '¿Cómo califica la ética profesional y ejemplo hacia el equipo?' },
      { questionId: 'ql-010', category: 'Comunicación', text: '¿Cómo califica la comunicación con el equipo?' },
      { questionId: 'ql-011', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad ante situaciones críticas?' },
      { questionId: 'ql-012', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad para situaciones urgentes?' },
      { questionId: 'ql-013', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad y respuesta oportuna?' },
      { questionId: 'ql-014', category: 'Disponibilidad', text: '¿Cómo califica la disponibilidad?' },
      { questionId: 'ql-015', category: 'Habilidades Blandas', text: '¿Cómo califica la adaptabilidad?' },
      { questionId: 'ql-016', category: 'Habilidades Blandas', text: '¿Cómo califica la capacidad de adaptación al cambio?' },
      { questionId: 'ql-017', category: 'Habilidades Blandas', text: '¿Cómo califica la capacidad de innovación y adaptación?' },
      { questionId: 'ql-018', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación clara y efectiva?' },
      { questionId: 'ql-019', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación con clientes y colegas?' },
      { questionId: 'ql-020', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación con el equipo y clientes?' },
      { questionId: 'ql-021', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación con el equipo?' },
      { questionId: 'ql-022', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación efectiva?' },
      { questionId: 'ql-023', category: 'Habilidades Blandas', text: '¿Cómo califica la comunicación?' },
      { questionId: 'ql-024', category: 'Habilidades Blandas', text: '¿Cómo califica la resolución de conflictos internos?' },
      { questionId: 'ql-025', category: 'Habilidades Blandas', text: '¿Cómo califica la resolución de conflictos?' },
      { questionId: 'ql-026', category: 'Habilidades Blandas', text: '¿Cómo califica la resolución de problemas?' },
      { questionId: 'ql-027', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento a instrucciones?' },
      { questionId: 'ql-028', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de instrucciones?' },
      { questionId: 'ql-029', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de políticas y procedimientos?' },
      { questionId: 'ql-030', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de políticas?' },
      { questionId: 'ql-031', category: 'Cumplimiento', text: '¿Cómo califica el seguimiento de procedimientos?' },
      { questionId: 'ql-032', category: 'Cumplimiento', text: '¿Cómo califica la confidencialidad?' },
      { questionId: 'ql-033', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de entregas?' },
      { questionId: 'ql-034', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de objetivos y metas?' },
      { questionId: 'ql-035', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de objetivos?' },
      { questionId: 'ql-036', category: 'Desempeño', text: '¿Cómo califica el cumplimiento de tareas?' },
      { questionId: 'ql-037', category: 'Desempeño', text: '¿Cómo califica el manejo de sistemas de archivo?' },
      { questionId: 'ql-038', category: 'Desempeño', text: '¿Cómo califica la calidad de su trabajo?' },
      { questionId: 'ql-039', category: 'Desempeño', text: '¿Cómo califica la confidencialidad?' },
      { questionId: 'ql-040', category: 'Desempeño', text: '¿Cómo califica la eficiencia en sus procesos?' },
      { questionId: 'ql-041', category: 'Desempeño', text: '¿Cómo califica la eficiencia operativa?' },
      { questionId: 'ql-042', category: 'Desempeño', text: '¿Cómo califica la gestión del tiempo?' },
      { questionId: 'ql-043', category: 'Desempeño', text: '¿Cómo califica la puntualidad?' },
      { questionId: 'ql-044', category: 'Liderazgo', text: '¿Cómo califica el desarrollo y mentoría del equipo?' },
      { questionId: 'ql-045', category: 'Liderazgo', text: '¿Cómo califica el liderazgo en casos complejos?' },
      { questionId: 'ql-046', category: 'Liderazgo', text: '¿Cómo califica la capacidad de guía a miembros junior del equipo?' },
      { questionId: 'ql-047', category: 'Liderazgo', text: '¿Cómo califica la gestión de recursos humanos y financieros?' },
      { questionId: 'ql-048', category: 'Liderazgo', text: '¿Cómo califica la gestión del equipo a su cargo?' },
      { questionId: 'ql-049', category: 'Liderazgo', text: '¿Cómo califica la mentoría hacia abogados junior y pasantes?' },
      { questionId: 'ql-050', category: 'Liderazgo', text: '¿Cómo califica la toma de decisiones estratégicas?' },
      { questionId: 'ql-051', category: 'Liderazgo', text: '¿Cómo califica la visión estratégica y dirección del despacho?' },
      { questionId: 'ql-052', category: 'Liderazgo', text: '¿Cómo califica la visión estratégica y dirección del área?' },
      { questionId: 'ql-053', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración con el equipo?' },
      { questionId: 'ql-054', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración con otros departamentos?' },
      { questionId: 'ql-055', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración efectiva con el equipo?' },
      { questionId: 'ql-056', category: 'Trabajo en Equipo', text: '¿Cómo califica la colaboración?' },
      { questionId: 'ql-057', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación con otras áreas?' },
      { questionId: 'ql-058', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación con su equipo?' },
      { questionId: 'ql-059', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación del equipo?' },
      { questionId: 'ql-060', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación entre departamentos?' },
      { questionId: 'ql-061', category: 'Trabajo en Equipo', text: '¿Cómo califica la coordinación entre áreas y socios?' },
      { questionId: 'ql-062', category: 'Atención a clientes', text: '¿Asesora estratégicamente al cliente, anticipando escenarios y proponiendo soluciones?' },
      { questionId: 'ql-063', category: 'Atención a clientes', text: '¿Da seguimiento técnico inicial a los asuntos, asegurando su avance conforme a lo planificado?' },
      { questionId: 'ql-064', category: 'Atención a clientes', text: '¿Escucha atentamente las reuniones internas y toma notas completas y ordenadas?' },
      { questionId: 'ql-065', category: 'Atención a clientes', text: '¿Gestiona la relación con el cliente, respondiendo oportunamente a sus consultas?' },
      { questionId: 'ql-066', category: 'Atención a clientes', text: '¿Participa como apoyo en la elaboración de respuestas básicas a clientes o autoridades?' },
      { questionId: 'ql-067', category: 'Conocimiento normativo', text: '¿Analiza de manera adecuada las implicaciones jurídicas de los asuntos que gestiona?' },
      { questionId: 'ql-068', category: 'Conocimiento normativo', text: '¿Aplica correctamente las normas societarias básicas en los asuntos que gestiona?' },
      { questionId: 'ql-069', category: 'Conocimiento normativo', text: '¿Conoce y aplica principios generales del derecho corporativo al realizar sus tareas?' },
      { questionId: 'ql-070', category: 'Conocimiento normativo', text: '¿Domina las disposiciones legales aplicables y las aplica con criterio en casos complejos?' },
      { questionId: 'ql-071', category: 'Conocimiento normativo', text: '¿Identifica de manera correcta documentos básicos como actas y contratos?' },
      { questionId: 'ql-072', category: 'Constitución y modificaciones', text: '¿Coordina asambleas y modificaciones societarias complejas con criterio profesional?' },
      { questionId: 'ql-073', category: 'Constitución y modificaciones', text: '¿Diseña y supervisa estructuras societarias complejas con visión estratégica?' },
      { questionId: 'ql-074', category: 'Constitución y modificaciones', text: '¿Prepara formatos con supervisión, asegurando precisión y congruencia en la información?' },
      { questionId: 'ql-075', category: 'Constitución y modificaciones', text: '¿Realiza búsquedas en el registro público de la propiedad y del comercio o guía trámites de forma correcta?' },
      { questionId: 'ql-076', category: 'Constitución y modificaciones', text: '¿Tramita asambleas y poderes básicos siguiendo los procedimientos establecidos?' },
      { questionId: 'ql-077', category: 'Due diligence', text: '¿Apoya de manera eficiente en la recopilación de documentos solicitados?' },
      { questionId: 'ql-078', category: 'Due diligence', text: '¿Identifica irregularidades evidentes en documentos o procesos societarios?' },
      { questionId: 'ql-079', category: 'Due diligence', text: '¿Lidera procesos de revisión exhaustiva identificando riesgos y oportunidades legales?' },
      { questionId: 'ql-080', category: 'Due diligence', text: '¿Redacta reportes técnicos claros, precisos y completos?' },
      { questionId: 'ql-081', category: 'Due diligence', text: '¿Sistematiza documentos y apoya en la identificación de hallazgos simples de relevancia legal?' },
      { questionId: 'ql-082', category: 'Redacción legal', text: '¿Elabora contratos incluyendo cláusulas específicas que respondan a las necesidades del cliente?' },
      { questionId: 'ql-083', category: 'Redacción legal', text: '¿Elabora documentos jurídicos sofisticados con alto nivel de precisión y detalle?' },
      { questionId: 'ql-084', category: 'Redacción legal', text: '¿Llena de forma adecuada y precisa los formatos predefinidos?' },
      { questionId: 'ql-085', category: 'Redacción legal', text: '¿Redacta borradores simples con guía, iniciando a trabajar en dos idiomas cuando es requerido?' },
      { questionId: 'ql-086', category: 'Redacción legal', text: '¿Redacta documentos sencillos utilizando vocabulario técnico en inglés y español de manera adecuada?' },
    ];
    
    for (const q of libraryQuestions) {
      await tx.run(conn,
        'INSERT IGNORE INTO question_library (id, question_id, category, text, created_by) VALUES (?, ?, ?, ?, NULL)',
        [uuidv4(), q.questionId, q.category, q.text]);
    }
    console.log(`  ✓ Question library (${libraryQuestions.length} questions)`);


    // ═══════════════════════════════════════════════════════════════════
    // 3. TEMPLATE QUESTIONS (with weights, per position — from Excel)
    // ═══════════════════════════════════════════════════════════════════
    const templateQuestions: { position: string; practiceArea: string; section: string; category: string; questionText: string; weight: number; sortOrder: number }[] = [

      { position: 'analista', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica la calidad de su trabajo?', weight: 17, sortOrder: 1 },
      { position: 'analista', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica el cumplimiento de entregas?', weight: 15, sortOrder: 2 },
      { position: 'analista', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica el seguimiento de procedimientos?', weight: 13, sortOrder: 3 },
      { position: 'analista', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la colaboración?', weight: 13, sortOrder: 4 },
      { position: 'analista', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica la confidencialidad?', weight: 12, sortOrder: 5 },
      { position: 'analista', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica la gestión del tiempo?', weight: 10, sortOrder: 6 },
      { position: 'analista', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la comunicación?', weight: 5, sortOrder: 7 },
      { position: 'analista', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la proactividad?', weight: 5, sortOrder: 8 },
      { position: 'analista', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', questionText: '¿Cómo califica la disponibilidad?', weight: 5, sortOrder: 9 },
      { position: 'analista', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la adaptabilidad?', weight: 5, sortOrder: 10 },
      { position: 'archivista', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica la calidad de su trabajo?', weight: 10, sortOrder: 11 },
      { position: 'archivista', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica el cumplimiento de tareas?', weight: 8, sortOrder: 12 },
      { position: 'archivista', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica el seguimiento de instrucciones?', weight: 7, sortOrder: 13 },
      { position: 'archivista', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica el manejo de sistemas de archivo?', weight: 7, sortOrder: 14 },
      { position: 'archivista', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la coordinación con su equipo?', weight: 6, sortOrder: 15 },
      { position: 'archivista', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica el seguimiento a instrucciones?', weight: 6, sortOrder: 16 },
      { position: 'archivista', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica la confidencialidad?', weight: 6, sortOrder: 17 },
      { position: 'archivista', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la comunicación con el equipo?', weight: 10, sortOrder: 18 },
      { position: 'archivista', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la actitud de servicio y disposición?', weight: 12, sortOrder: 19 },
      { position: 'archivista', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', questionText: '¿Cómo califica la disponibilidad?', weight: 10, sortOrder: 20 },
      { position: 'archivista', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la adaptabilidad?', weight: 9, sortOrder: 21 },
      { position: 'archivista', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la iniciativa propia?', weight: 9, sortOrder: 22 },
      { position: 'archivo_soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica la calidad de su trabajo?', weight: 10, sortOrder: 23 },
      { position: 'archivo_soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica el cumplimiento de tareas?', weight: 8, sortOrder: 24 },
      { position: 'archivo_soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica el seguimiento de instrucciones?', weight: 7, sortOrder: 25 },
      { position: 'archivo_soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica el manejo de sistemas de archivo?', weight: 7, sortOrder: 26 },
      { position: 'archivo_soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la coordinación con su equipo?', weight: 6, sortOrder: 27 },
      { position: 'archivo_soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica el seguimiento a instrucciones?', weight: 6, sortOrder: 28 },
      { position: 'archivo_soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica la confidencialidad?', weight: 6, sortOrder: 29 },
      { position: 'archivo_soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la comunicación con el equipo?', weight: 10, sortOrder: 30 },
      { position: 'archivo_soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la actitud de servicio y disposición?', weight: 12, sortOrder: 31 },
      { position: 'archivo_soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', questionText: '¿Cómo califica la disponibilidad?', weight: 10, sortOrder: 32 },
      { position: 'archivo_soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la adaptabilidad?', weight: 9, sortOrder: 33 },
      { position: 'archivo_soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la iniciativa propia?', weight: 9, sortOrder: 34 },
      { position: 'asistente', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica la calidad de su trabajo?', weight: 10, sortOrder: 35 },
      { position: 'asistente', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica el cumplimiento de tareas?', weight: 10, sortOrder: 36 },
      { position: 'asistente', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica el seguimiento de instrucciones?', weight: 8, sortOrder: 37 },
      { position: 'asistente', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la colaboración con el equipo?', weight: 8, sortOrder: 38 },
      { position: 'asistente', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica la confidencialidad?', weight: 8, sortOrder: 39 },
      { position: 'asistente', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica la puntualidad?', weight: 6, sortOrder: 40 },
      { position: 'asistente', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la actitud de servicio y disposición?', weight: 15, sortOrder: 41 },
      { position: 'asistente', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', questionText: '¿Cómo califica la disponibilidad?', weight: 13, sortOrder: 42 },
      { position: 'asistente', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la comunicación?', weight: 11, sortOrder: 43 },
      { position: 'asistente', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la adaptabilidad?', weight: 11, sortOrder: 44 },
      { position: 'asociado_jr', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', questionText: '¿Aplica correctamente las normas societarias básicas en los asuntos que gestiona?', weight: 8, sortOrder: 45 },
      { position: 'asociado_jr', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', questionText: '¿Redacta documentos sencillos utilizando vocabulario técnico en inglés y español de manera adecuada?', weight: 8, sortOrder: 46 },
      { position: 'asociado_jr', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', questionText: '¿Identifica irregularidades evidentes en documentos o procesos societarios?', weight: 8, sortOrder: 47 },
      { position: 'asociado_jr', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', questionText: '¿Tramita asambleas y poderes básicos siguiendo los procedimientos establecidos?', weight: 8, sortOrder: 48 },
      { position: 'asociado_jr', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', questionText: '¿Da seguimiento técnico inicial a los asuntos, asegurando su avance conforme a lo planificado?', weight: 8, sortOrder: 49 },
      { position: 'asociado_jr', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la colaboración con el equipo?', weight: 15, sortOrder: 50 },
      { position: 'asociado_jr', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica el seguimiento de instrucciones?', weight: 15, sortOrder: 51 },
      { position: 'asociado_jr', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', questionText: '¿Cómo califica la capacidad de guía a miembros junior del equipo?', weight: 10, sortOrder: 52 },
      { position: 'asociado_jr', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la comunicación efectiva?', weight: 5, sortOrder: 53 },
      { position: 'asociado_jr', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la disposición para aprender?', weight: 5, sortOrder: 54 },
      { position: 'asociado_jr', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', questionText: '¿Cómo califica la disponibilidad?', weight: 5, sortOrder: 55 },
      { position: 'asociado_jr', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la adaptabilidad?', weight: 5, sortOrder: 56 },
      { position: 'asociado_mid', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', questionText: '¿Analiza de manera adecuada las implicaciones jurídicas de los asuntos que gestiona?', weight: 12, sortOrder: 57 },
      { position: 'asociado_mid', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', questionText: '¿Elabora contratos incluyendo cláusulas específicas que respondan a las necesidades del cliente?', weight: 12, sortOrder: 58 },
      { position: 'asociado_mid', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', questionText: '¿Redacta reportes técnicos claros, precisos y completos?', weight: 12, sortOrder: 59 },
      { position: 'asociado_mid', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', questionText: '¿Coordina asambleas y modificaciones societarias complejas con criterio profesional?', weight: 12, sortOrder: 60 },
      { position: 'asociado_mid', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', questionText: '¿Gestiona la relación con el cliente, respondiendo oportunamente a sus consultas?', weight: 12, sortOrder: 61 },
      { position: 'asociado_mid', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', questionText: '¿Cómo califica la capacidad de guía a miembros junior del equipo?', weight: 10, sortOrder: 62 },
      { position: 'asociado_mid', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la colaboración efectiva con el equipo?', weight: 10, sortOrder: 63 },
      { position: 'asociado_mid', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la comunicación con clientes y colegas?', weight: 5, sortOrder: 64 },
      { position: 'asociado_mid', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la actitud de servicio y compromiso?', weight: 5, sortOrder: 65 },
      { position: 'asociado_mid', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', questionText: '¿Cómo califica la disponibilidad y respuesta oportuna?', weight: 5, sortOrder: 66 },
      { position: 'asociado_mid', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la capacidad de adaptación al cambio?', weight: 5, sortOrder: 67 },
      { position: 'asociado_sr', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', questionText: '¿Domina las disposiciones legales aplicables y las aplica con criterio en casos complejos?', weight: 12, sortOrder: 68 },
      { position: 'asociado_sr', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', questionText: '¿Elabora documentos jurídicos sofisticados con alto nivel de precisión y detalle?', weight: 12, sortOrder: 69 },
      { position: 'asociado_sr', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', questionText: '¿Lidera procesos de revisión exhaustiva identificando riesgos y oportunidades legales?', weight: 12, sortOrder: 70 },
      { position: 'asociado_sr', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', questionText: '¿Diseña y supervisa estructuras societarias complejas con visión estratégica?', weight: 12, sortOrder: 71 },
      { position: 'asociado_sr', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', questionText: '¿Asesora estratégicamente al cliente, anticipando escenarios y proponiendo soluciones?', weight: 12, sortOrder: 72 },
      { position: 'asociado_sr', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', questionText: '¿Cómo califica el liderazgo en casos complejos?', weight: 5, sortOrder: 73 },
      { position: 'asociado_sr', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', questionText: '¿Cómo califica la mentoría hacia abogados junior y pasantes?', weight: 10, sortOrder: 74 },
      { position: 'asociado_sr', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la colaboración con otros departamentos?', weight: 5, sortOrder: 75 },
      { position: 'asociado_sr', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la comunicación clara y efectiva?', weight: 5, sortOrder: 76 },
      { position: 'asociado_sr', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la resolución de conflictos?', weight: 5, sortOrder: 77 },
      { position: 'asociado_sr', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la proactividad y compromiso?', weight: 5, sortOrder: 78 },
      { position: 'asociado_sr', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', questionText: '¿Cómo califica la disponibilidad para situaciones urgentes?', weight: 5, sortOrder: 79 },
      { position: 'coordinador', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica el cumplimiento de objetivos?', weight: 17, sortOrder: 80 },
      { position: 'coordinador', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la coordinación del equipo?', weight: 15, sortOrder: 81 },
      { position: 'coordinador', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica la eficiencia en sus procesos?', weight: 13, sortOrder: 82 },
      { position: 'coordinador', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica el seguimiento de instrucciones?', weight: 13, sortOrder: 83 },
      { position: 'coordinador', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la colaboración?', weight: 12, sortOrder: 84 },
      { position: 'coordinador', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica la confidencialidad?', weight: 10, sortOrder: 85 },
      { position: 'coordinador', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la comunicación?', weight: 5, sortOrder: 86 },
      { position: 'coordinador', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la actitud de servicio?', weight: 5, sortOrder: 87 },
      { position: 'coordinador', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', questionText: '¿Cómo califica la disponibilidad?', weight: 5, sortOrder: 88 },
      { position: 'coordinador', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la adaptabilidad?', weight: 5, sortOrder: 89 },
      { position: 'counsel', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', questionText: '¿Domina las disposiciones legales aplicables y las aplica con criterio en casos complejos?', weight: 12, sortOrder: 90 },
      { position: 'counsel', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', questionText: '¿Elabora documentos jurídicos sofisticados con alto nivel de precisión y detalle?', weight: 12, sortOrder: 91 },
      { position: 'counsel', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', questionText: '¿Lidera procesos de revisión exhaustiva identificando riesgos y oportunidades legales?', weight: 12, sortOrder: 92 },
      { position: 'counsel', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', questionText: '¿Diseña y supervisa estructuras societarias complejas con visión estratégica?', weight: 12, sortOrder: 93 },
      { position: 'counsel', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', questionText: '¿Asesora estratégicamente al cliente, anticipando escenarios y proponiendo soluciones?', weight: 12, sortOrder: 94 },
      { position: 'counsel', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', questionText: '¿Cómo califica la visión estratégica y dirección del despacho?', weight: 5, sortOrder: 95 },
      { position: 'counsel', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', questionText: '¿Cómo califica el desarrollo y mentoría del equipo?', weight: 5, sortOrder: 96 },
      { position: 'counsel', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', questionText: '¿Cómo califica la toma de decisiones estratégicas?', weight: 5, sortOrder: 97 },
      { position: 'counsel', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la coordinación entre áreas y socios?', weight: 5, sortOrder: 98 },
      { position: 'counsel', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la comunicación con el equipo y clientes?', weight: 4, sortOrder: 99 },
      { position: 'counsel', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la resolución de conflictos internos?', weight: 4, sortOrder: 100 },
      { position: 'counsel', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la ética profesional y ejemplo hacia el equipo?', weight: 4, sortOrder: 101 },
      { position: 'counsel', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', questionText: '¿Cómo califica la disponibilidad ante situaciones críticas?', weight: 4, sortOrder: 102 },
      { position: 'counsel', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la capacidad de innovación y adaptación?', weight: 4, sortOrder: 103 },
      { position: 'director', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', questionText: '¿Cómo califica la visión estratégica y dirección del área?', weight: 15, sortOrder: 104 },
      { position: 'director', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', questionText: '¿Cómo califica la gestión de recursos humanos y financieros?', weight: 14, sortOrder: 105 },
      { position: 'director', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica el cumplimiento de objetivos y metas?', weight: 14, sortOrder: 106 },
      { position: 'director', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la coordinación entre departamentos?', weight: 13, sortOrder: 107 },
      { position: 'director', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica la eficiencia operativa?', weight: 13, sortOrder: 108 },
      { position: 'director', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica el seguimiento de políticas y procedimientos?', weight: 11, sortOrder: 109 },
      { position: 'director', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la comunicación con el equipo?', weight: 5, sortOrder: 110 },
      { position: 'director', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica el compromiso con la firma?', weight: 5, sortOrder: 111 },
      { position: 'director', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', questionText: '¿Cómo califica la disponibilidad?', weight: 5, sortOrder: 112 },
      { position: 'director', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la resolución de conflictos?', weight: 5, sortOrder: 113 },
      { position: 'gerente', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', questionText: '¿Cómo califica la gestión del equipo a su cargo?', weight: 15, sortOrder: 114 },
      { position: 'gerente', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica el cumplimiento de objetivos?', weight: 15, sortOrder: 115 },
      { position: 'gerente', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica la eficiencia operativa?', weight: 13, sortOrder: 116 },
      { position: 'gerente', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la coordinación con otras áreas?', weight: 13, sortOrder: 117 },
      { position: 'gerente', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica el seguimiento de políticas?', weight: 12, sortOrder: 118 },
      { position: 'gerente', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica la confidencialidad?', weight: 12, sortOrder: 119 },
      { position: 'gerente', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la comunicación efectiva?', weight: 5, sortOrder: 120 },
      { position: 'gerente', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la proactividad?', weight: 5, sortOrder: 121 },
      { position: 'gerente', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', questionText: '¿Cómo califica la disponibilidad?', weight: 5, sortOrder: 122 },
      { position: 'gerente', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la resolución de problemas?', weight: 5, sortOrder: 123 },
      { position: 'pasante', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', questionText: '¿Identifica de manera correcta documentos básicos como actas y contratos?', weight: 8, sortOrder: 124 },
      { position: 'pasante', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', questionText: '¿Llena de forma adecuada y precisa los formatos predefinidos?', weight: 8, sortOrder: 125 },
      { position: 'pasante', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', questionText: '¿Apoya de manera eficiente en la recopilación de documentos solicitados?', weight: 8, sortOrder: 126 },
      { position: 'pasante', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', questionText: '¿Realiza búsquedas en el registro público de la propiedad y del comercio o guía trámites de forma correcta?', weight: 8, sortOrder: 127 },
      { position: 'pasante', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', questionText: '¿Escucha atentamente las reuniones internas y toma notas completas y ordenadas?', weight: 8, sortOrder: 128 },
      { position: 'pasante', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la colaboración con el equipo?', weight: 15, sortOrder: 129 },
      { position: 'pasante', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la coordinación con otras áreas?', weight: 15, sortOrder: 130 },
      { position: 'pasante', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica el seguimiento de instrucciones?', weight: 10, sortOrder: 131 },
      { position: 'pasante', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la comunicación?', weight: 5, sortOrder: 132 },
      { position: 'pasante', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la disposición para aprender?', weight: 5, sortOrder: 133 },
      { position: 'pasante', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', questionText: '¿Cómo califica la disponibilidad?', weight: 5, sortOrder: 134 },
      { position: 'pasante', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la adaptabilidad?', weight: 5, sortOrder: 135 },
      { position: 'pasante_carrera', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', questionText: '¿Conoce y aplica principios generales del derecho corporativo al realizar sus tareas?', weight: 8, sortOrder: 136 },
      { position: 'pasante_carrera', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', questionText: '¿Redacta borradores simples con guía, iniciando a trabajar en dos idiomas cuando es requerido?', weight: 8, sortOrder: 137 },
      { position: 'pasante_carrera', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', questionText: '¿Sistematiza documentos y apoya en la identificación de hallazgos simples de relevancia legal?', weight: 8, sortOrder: 138 },
      { position: 'pasante_carrera', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', questionText: '¿Prepara formatos con supervisión, asegurando precisión y congruencia en la información?', weight: 8, sortOrder: 139 },
      { position: 'pasante_carrera', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', questionText: '¿Participa como apoyo en la elaboración de respuestas básicas a clientes o autoridades?', weight: 8, sortOrder: 140 },
      { position: 'pasante_carrera', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la colaboración con el equipo?', weight: 10, sortOrder: 141 },
      { position: 'pasante_carrera', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica el seguimiento de instrucciones?', weight: 10, sortOrder: 142 },
      { position: 'pasante_carrera', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la comunicación?', weight: 5, sortOrder: 143 },
      { position: 'pasante_carrera', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la disposición para aprender?', weight: 5, sortOrder: 144 },
      { position: 'pasante_carrera', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', questionText: '¿Cómo califica la disponibilidad?', weight: 5, sortOrder: 145 },
      { position: 'pasante_carrera', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la adaptabilidad?', weight: 5, sortOrder: 146 },
      { position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', questionText: '¿Identifica de manera correcta documentos básicos como actas y contratos?', weight: 8, sortOrder: 147 },
      { position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', questionText: '¿Llena de forma adecuada y precisa los formatos predefinidos?', weight: 8, sortOrder: 148 },
      { position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', questionText: '¿Apoya de manera eficiente en la recopilación de documentos solicitados?', weight: 8, sortOrder: 149 },
      { position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', questionText: '¿Realiza búsquedas en el registro público de la propiedad y del comercio o guía trámites de forma correcta?', weight: 8, sortOrder: 150 },
      { position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', questionText: '¿Escucha atentamente las reuniones internas y toma notas completas y ordenadas?', weight: 8, sortOrder: 151 },
      { position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la colaboración con el equipo?', weight: 15, sortOrder: 152 },
      { position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la coordinación con otras áreas?', weight: 15, sortOrder: 153 },
      { position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica el seguimiento de instrucciones?', weight: 10, sortOrder: 154 },
      { position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la comunicación?', weight: 5, sortOrder: 155 },
      { position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la disposición para aprender?', weight: 5, sortOrder: 156 },
      { position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', questionText: '¿Cómo califica la disponibilidad?', weight: 5, sortOrder: 157 },
      { position: 'pasante_corporativo', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la adaptabilidad?', weight: 5, sortOrder: 158 },
      { position: 'salary_partner', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', questionText: '¿Domina las disposiciones legales aplicables y las aplica con criterio en casos complejos?', weight: 12, sortOrder: 159 },
      { position: 'salary_partner', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', questionText: '¿Elabora documentos jurídicos sofisticados con alto nivel de precisión y detalle?', weight: 12, sortOrder: 160 },
      { position: 'salary_partner', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', questionText: '¿Lidera procesos de revisión exhaustiva identificando riesgos y oportunidades legales?', weight: 12, sortOrder: 161 },
      { position: 'salary_partner', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', questionText: '¿Diseña y supervisa estructuras societarias complejas con visión estratégica?', weight: 12, sortOrder: 162 },
      { position: 'salary_partner', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', questionText: '¿Asesora estratégicamente al cliente, anticipando escenarios y proponiendo soluciones?', weight: 12, sortOrder: 163 },
      { position: 'salary_partner', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', questionText: '¿Cómo califica la visión estratégica y dirección del despacho?', weight: 5, sortOrder: 164 },
      { position: 'salary_partner', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', questionText: '¿Cómo califica el desarrollo y mentoría del equipo?', weight: 5, sortOrder: 165 },
      { position: 'salary_partner', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', questionText: '¿Cómo califica la toma de decisiones estratégicas?', weight: 5, sortOrder: 166 },
      { position: 'salary_partner', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la coordinación entre áreas y socios?', weight: 5, sortOrder: 167 },
      { position: 'salary_partner', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la comunicación con el equipo y clientes?', weight: 4, sortOrder: 168 },
      { position: 'salary_partner', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la resolución de conflictos internos?', weight: 4, sortOrder: 169 },
      { position: 'salary_partner', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la ética profesional y ejemplo hacia el equipo?', weight: 4, sortOrder: 170 },
      { position: 'salary_partner', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', questionText: '¿Cómo califica la disponibilidad ante situaciones críticas?', weight: 4, sortOrder: 171 },
      { position: 'salary_partner', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la capacidad de innovación y adaptación?', weight: 4, sortOrder: 172 },
      { position: 'socio', practiceArea: 'corporativo', section: 'tecnico', category: 'Conocimiento normativo', questionText: '¿Domina las disposiciones legales aplicables y las aplica con criterio en casos complejos?', weight: 12, sortOrder: 173 },
      { position: 'socio', practiceArea: 'corporativo', section: 'tecnico', category: 'Redacción legal', questionText: '¿Elabora documentos jurídicos sofisticados con alto nivel de precisión y detalle?', weight: 12, sortOrder: 174 },
      { position: 'socio', practiceArea: 'corporativo', section: 'tecnico', category: 'Due diligence', questionText: '¿Lidera procesos de revisión exhaustiva identificando riesgos y oportunidades legales?', weight: 12, sortOrder: 175 },
      { position: 'socio', practiceArea: 'corporativo', section: 'tecnico', category: 'Constitución y modificaciones', questionText: '¿Diseña y supervisa estructuras societarias complejas con visión estratégica?', weight: 12, sortOrder: 176 },
      { position: 'socio', practiceArea: 'corporativo', section: 'tecnico', category: 'Atención a clientes', questionText: '¿Asesora estratégicamente al cliente, anticipando escenarios y proponiendo soluciones?', weight: 12, sortOrder: 177 },
      { position: 'socio', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', questionText: '¿Cómo califica la visión estratégica y dirección del despacho?', weight: 5, sortOrder: 178 },
      { position: 'socio', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', questionText: '¿Cómo califica el desarrollo y mentoría del equipo?', weight: 5, sortOrder: 179 },
      { position: 'socio', practiceArea: 'corporativo', section: 'competencias', category: 'Liderazgo', questionText: '¿Cómo califica la toma de decisiones estratégicas?', weight: 5, sortOrder: 180 },
      { position: 'socio', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la coordinación entre áreas y socios?', weight: 5, sortOrder: 181 },
      { position: 'socio', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la comunicación con el equipo y clientes?', weight: 4, sortOrder: 182 },
      { position: 'socio', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la resolución de conflictos internos?', weight: 4, sortOrder: 183 },
      { position: 'socio', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la ética profesional y ejemplo hacia el equipo?', weight: 4, sortOrder: 184 },
      { position: 'socio', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', questionText: '¿Cómo califica la disponibilidad ante situaciones críticas?', weight: 4, sortOrder: 185 },
      { position: 'socio', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la capacidad de innovación y adaptación?', weight: 4, sortOrder: 186 },
      { position: 'soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica la calidad de su trabajo?', weight: 9, sortOrder: 187 },
      { position: 'soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica el cumplimiento de tareas?', weight: 9, sortOrder: 188 },
      { position: 'soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica el seguimiento de instrucciones?', weight: 7, sortOrder: 189 },
      { position: 'soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica el manejo de sistemas de archivo?', weight: 7, sortOrder: 190 },
      { position: 'soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Trabajo en Equipo', questionText: '¿Cómo califica la coordinación con su equipo?', weight: 6, sortOrder: 191 },
      { position: 'soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Cumplimiento', questionText: '¿Cómo califica el seguimiento a instrucciones?', weight: 6, sortOrder: 192 },
      { position: 'soporte', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica la confidencialidad?', weight: 6, sortOrder: 193 },
      { position: 'soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Comunicación', questionText: '¿Cómo califica la comunicación con el equipo?', weight: 10, sortOrder: 194 },
      { position: 'soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la actitud de servicio y disposición?', weight: 12, sortOrder: 195 },
      { position: 'soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Disponibilidad', questionText: '¿Cómo califica la disponibilidad?', weight: 10, sortOrder: 196 },
      { position: 'soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Habilidades Blandas', questionText: '¿Cómo califica la adaptabilidad?', weight: 9, sortOrder: 197 },
      { position: 'soporte', practiceArea: 'corporativo', section: 'blandas', category: 'Actitud', questionText: '¿Cómo califica la iniciativa propia?', weight: 9, sortOrder: 198 },
      { position: 'pasante_carrera', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica la calidad de su trabajo?', weight: 10, sortOrder: 199 },
      { position: 'pasante_carrera', practiceArea: 'corporativo', section: 'competencias', category: 'Desempeño', questionText: '¿Cómo califica el cumplimiento de tareas?', weight: 10, sortOrder: 200 },
    ];
    
    let questionCount = 0;
    for (const tq of templateQuestions) {
      await tx.run(conn,
        'INSERT INTO template_questions (id, question_id, position, practice_area, section, category, question_text, weight, sort_order, is_active, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)',
        [uuidv4(), 'seed-' + tq.sortOrder.toString().padStart(3, '0'), tq.position, tq.practiceArea, tq.section, tq.category, tq.questionText, tq.weight, tq.sortOrder, 'seed']);
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
