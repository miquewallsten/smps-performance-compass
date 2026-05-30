/**
 * Rich context builder — assembles a live snapshot of the system state
 * to include in the copilot's system prompt.
 */
import { db } from '../db/connection.js';

export async function buildRichContext(): Promise<string> {
  const [
    userCount, activeUsers, adminCount, managingPartnerCount,
    periods, systemStatus, moduleConfig,
    pendingVacations, unreadAnnouncements,
    currentPeriodConfig,
    positionConfigRows, sectionWeightsRows, categoryCount, libraryCount,
    templateSummary,
  ] = await Promise.all([
    db.get('SELECT COUNT(*) c FROM users') as any,
    db.get('SELECT COUNT(*) c FROM users WHERE is_active=1') as any,
    db.get('SELECT COUNT(*) c FROM users WHERE is_admin=1 AND is_active=1') as any,
    db.get('SELECT COUNT(*) c FROM users WHERE is_managing_partner=1 AND is_active=1') as any,
    db.all('SELECT * FROM period_configs ORDER BY period DESC LIMIT 5') as any,
    db.get('SELECT * FROM system_status WHERE id=1') as any,
    db.get('SELECT * FROM module_config WHERE id=1') as any,
    db.get("SELECT COUNT(*) c FROM vacation_requests WHERE status='pending'") as any,
    db.get("SELECT COUNT(*) c FROM announcements WHERE archived=0") as any,
    db.get('SELECT * FROM period_configs ORDER BY period DESC LIMIT 1') as any,
    db.all('SELECT position, label, level, position_rank FROM position_config WHERE is_active=1 ORDER BY level, position_rank, sort_order') as any,
    db.all('SELECT position, tecnico, competencias, blandas FROM section_weights ORDER BY position') as any,
    db.get('SELECT COUNT(*) c FROM evaluation_categories') as any,
    db.get('SELECT COUNT(*) c FROM question_library') as any,
    db.all('SELECT position, COUNT(*) q_count, SUM(weight) total_weight FROM template_questions WHERE is_active=1 GROUP BY position ORDER BY position') as any,
  ]);

  const latestPeriod = currentPeriodConfig?.period || 'ninguno';
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Determine current evaluation phase
  let evalPhase = 'inactivo';
  if (currentPeriodConfig) {
    if (today >= currentPeriodConfig.self_start && today <= currentPeriodConfig.self_end) evalPhase = 'autoevaluación';
    else if (today >= currentPeriodConfig.supervisor_start && today <= currentPeriodConfig.supervisor_end) evalPhase = 'evaluación de supervisor';
    else if (today >= currentPeriodConfig.feedback_start && today <= currentPeriodConfig.feedback_end) evalPhase = 'sesión de feedback';
    else if (today >= currentPeriodConfig.action_plan_start && today <= currentPeriodConfig.action_plan_end) evalPhase = 'plan de acción';
    else if (today < currentPeriodConfig.self_start) evalPhase = 'pre-periodo';
    else evalPhase = 'post-periodo';
  }

  // Count pending evaluations more accurately
  const pendingSelfCount = await db.get(`
    SELECT COUNT(*) c FROM users u
    WHERE u.is_active = 1 AND u.is_super_user = 0
    AND NOT EXISTS (SELECT 1 FROM evaluations e WHERE e.evaluator_id = u.id AND e.type = 'self' AND e.period = ? AND e.completed_at IS NOT NULL)
  `, [latestPeriod]) as any;

  const pendingSupCount = await db.get(`
    SELECT COUNT(*) c FROM supervisor_assignments sa
    WHERE sa.period = ?
    AND NOT EXISTS (SELECT 1 FROM evaluations e WHERE e.evaluated_id = sa.employee_id AND e.evaluator_id = sa.supervisor_id AND e.type = 'supervisor' AND e.period = ? AND e.completed_at IS NOT NULL)
  `, [latestPeriod, latestPeriod]) as any;

  // Build position hierarchy from DB
  const legalPositions = positionConfigRows.filter((p: any) => p.level === 'legal').map((p: any) => p.label || p.position);
  const adminPositions = positionConfigRows.filter((p: any) => p.level === 'administrativo').map((p: any) => p.label || p.position);

  // Build template weight summary
  const weightSummary = templateSummary.map((t: any) => {
    const sw = sectionWeightsRows.find((w: any) => w.position === t.position);
    return t.position + '(' + t.q_count + 'q, peso=' + t.total_weight + '%, secciones=' + (sw ? 'T:' + sw.tecnico + '% C:' + sw.competencias + '% B:' + sw.blandas + '%' : 'sin pesos') + ')';
  }).join(', ');

  // Build question-to-template mapping (which questions are used by which positions)
  const questionTemplateMap = await db.all(`
    SELECT ql.question_id, ql.category, LEFT(ql.text, 80) as text_preview,
      GROUP_CONCAT(DISTINCT tq.position ORDER BY tq.position) as positions
    FROM question_library ql
    LEFT JOIN template_questions tq ON tq.library_question_id = ql.id AND tq.is_active = 1
    GROUP BY ql.id
    ORDER BY ql.category, ql.text
  `) as any[];

  const questionMapStr = questionTemplateMap.map((q: any) => {
    const posList = q.positions ? q.positions.split(',').length + ' plantilla(s): ' + q.positions : 'sin plantilla';
    return q.question_id + ' [' + q.category + '] ' + q.text_preview + '... → ' + posList;
  }).join('\n  ');

  return `CONTEXTO EN VIVO (fecha: ${today}):
- Usuarios: ${activeUsers?.c || 0} activos de ${userCount?.c || 0} totales, ${adminCount?.c || 0} admins, ${managingPartnerCount?.c || 0} socios administradores
- Sistema: ${systemStatus?.status || '?'} | Módulos: eval=${moduleConfig?.evaluations ? 'ON' : 'OFF'} comms=${moduleConfig?.communications ? 'ON' : 'OFF'} vac=${moduleConfig?.vacations ? 'ON' : 'OFF'} copilot=${moduleConfig?.copilot ? 'ON' : 'OFF'}
- Periodo activo: ${latestPeriod} | Fase actual: ${evalPhase}
- Autoevaluaciones pendientes: ${pendingSelfCount?.c || 0} | Evaluaciones de supervisor pendientes: ${pendingSupCount?.c || 0}
- Vacaciones pendientes: ${pendingVacations?.c || 0} | Anuncios activos: ${unreadAnnouncements?.c || 0}
- Periodos registrados: ${periods.map((p: any) => p.period).join(', ') || 'ninguno'}
- Jerarquía Legal: ${legalPositions.join(' > ')}
- Jerarquía Administrativa: ${adminPositions.join(' > ')}
- Categorías de evaluación: ${categoryCount?.c || 0} | Preguntas en biblioteca: ${libraryCount?.c || 0}
- Templates: ${weightSummary}
- Preguntas y plantillas que las usan (${libraryCount?.c || 0} preguntas):
  ${questionMapStr}`;
}
