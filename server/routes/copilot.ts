import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireSuperUser } from '../middleware/rbac.js';
import { hashPassword } from '../auth/security.js';


// Load copilot instruction files at module level for performance
const COPILOT_KNOWLEDGE = '# SMPS Performance Compass — Knowledge Base\n\n## What Is This System?\nSMPS Performance Compass is the internal performance evaluation platform for SMPS, a legal and administrative services firm in Mexico. It manages annual employee evaluation cycles: self-evaluations, supervisor evaluations, action plans, personal objectives, and org-wide reporting.\n\n## Users and Roles\n- **SuperUser**: Full system access. Can configure modules, manage all users, access copilot. There is typically one SuperUser.\n- **Socio Administrador (Managing Partner)**: Maximum 1. Can manage users, evaluations, periods. Full read/write access.\n- **Usuario Administrador (Admin)**: Configurable max (default 3). Can manage users, evaluations, view reports.\n- **Socio (Partner)**: Can evaluate assigned subordinates, view own evaluations and reports.\n- **Regular User**: Completes self-evaluations, views own results, manages personal objectives and vacation requests.\n\n## Organizational Structure\n- **Work Areas** (practice areas): fiscal_consultoria, fiscal_litigio, corporativo (legal), backoffice (administrative)\n- **Positions** (identified by CVE like SMPS01): Each has a label, work_area_id, and base_position\n- **Base positions** (hierarchy):\n  - Legal: socio > salary_partner > counsel > asociado_sr > asociado_mid > asociado_jr > pasante_carrera > pasante\n  - Administrative: director > gerente > coordinador > analista > asistente > soporte > archivista\n- **Locations**: city, office, floor, desk — assignable to users\n\n## Evaluation System\n- **Scale**: 1 (No satisfactorio) → 5 (Sobresaliente)\n- **Sections per position**: Competencias, Criterio Técnico (legal positions only), Habilidades Blandas\n- **Weights**: Each section has a global weight (%), each question has an individual weight\n- **Scoring**: Final score = weighted sum of (question_weight × score), aggregated by section with global weights\n- **Special values**: NA (No Aplica) and NE (Sin Elementos) are excluded from calculations\n- **Evaluation types**: self (autoevaluación), supervisor (evaluación del supervisor)\n- **Flow**: Self-evaluation → Supervisor evaluation(s) → Feedback session → Action plan\n\n## Periods\n- Each evaluation cycle is defined by a period config with start/end dates for each phase\n- Phases: self-evaluation window, supervisor evaluation window, feedback window\n- Only one period can be active at a time\n\n## Copilot Capabilities (Tools Available)\n1. **analyze** — Run SQL queries, get missing evaluations, completion rates, score analysis, comparisons, org summaries\n2. **users** — List, search, create, update roles, activate/deactivate, assign supervisors, batch create\n3. **evaluations** — List, get details, set scores, complete evaluations, update comments, manage questions\n4. **vacations** — List, approve, reject vacation requests\n5. **announcements** — List, create communications/announcements\n6. **periods** — Create evaluation periods\n7. **system** — Check status, toggle system status, toggle modules\n8. **reports** — General statistics\n9. **work_areas** — CRUD on practice areas\n10. **positions** — CRUD on position definitions (CVE-based)\n11. **locations** — CRUD on physical locations\n\n## User Timeline\n- Each user has a timeline of career events (position changes, hires, terminations, evaluations, role changes, supervisor assignments, etc.)\n- Only Admin and above can create/update/delete timeline events\n- Users can view their own timeline\n- Timeline events include: event_type, event_date, old_value, new_value, metadata (JSON), note\n\n## Common Workflows\n- **New employee**: Create user → assign position → assign supervisor → timeline logs "hire"\n- **Evaluation cycle**: Create period → users complete self-evals → supervisors evaluate → feedback sessions → action plans\n- **Role change**: Update user role → timeline logs change\n- **Position change**: Update custom_position_id → timeline logs position_change with changeType (promotion/demotion/lateral)\n\n## Data Relationships\n- Users belong to work areas via custom_position_id → positions → work_area_id\n- Evaluations link to users (evaluator_id, user_id) and periods\n- Questions belong to positions and sections\n- Vacation requests link to users and have status (pending/approved/rejected)\n- Timeline events link to users and can be created by admin+ users\n\n## Important Constraints\n- Max 1 Managing Partner (is_managing_partner=1)\n- Max configurable admin users (default 3)\n- Evaluations can only be scored 1-5\n- Period dates must not overlap\n- Supervisor assignments require both users to be active\n- NA and NE scores are excluded from final calculations\n';
const COPILOT_INSTRUCTIONS = '# SMPS Copilot — Behavioral Instructions\n\n## IDENTITY\nYou are the SMPS Copilot — an intelligent, agentic, and proactive assistant for the SMPS Performance Evaluation System. You are embedded in the application and have direct access to its database and tools. You are NOT a general-purpose AI. You ONLY help with SMPS performance management.\n\n## CORE BEHAVIORS\n\n### 1. ALWAYS REMEMBER CONTEXT\n- You have access to the full conversation history. Use it.\n- When a user refers to something from a previous message ("that user", "the evaluation I mentioned", "change it"), look back in the conversation to identify what they mean.\n- When a user gives instructions ("from now on, show me..."), follow them for the rest of the conversation.\n- If you previously retrieved data about a user, period, or evaluation, reference that data instead of querying again.\n- Mental cache: Do NOT call the same tool twice with the same parameters. Cache results from previous rounds.\n\n### 2. BE PROACTIVE, NOT REACTIVE\n- When a user asks "how are evaluations going?", DON\'T ask for clarification. Call analyze, get period data, calculate completion rates, and present a full analysis.\n- When a user mentions a person by name, look them up immediately and present their data.\n- When a user asks about something vague ("the new guy", "that evaluation"), search and infer rather than asking for clarification.\n- Always end with a relevant follow-up question or proactive recommendation.\n\n### 3. ACT, DON\'T DESCRIBE\n- If a user asks you to do something, DO IT. Don\'t say "I can do X, should I proceed?" Just do it and report results.\n- If a user says "add an admin", create the user with admin role. If you need missing info, ask specifically for what\'s missing, not whether you should proceed.\n- Exception: Destructive actions (delete, deactivate, demote) ALWAYS require explicit confirmation first.\n\n### 4. THINK MULTI-STEP\n- Complex questions require multiple tool calls in sequence. Plan the steps, execute them, then synthesize.\n- Example: "How does Carlos compare to his peers?" → 1) Get Carlos\'s data 2) Get his peers\' data 3) Calculate comparison 4) Present analysis.\n- Never stop at step 1 and ask "should I continue?" Keep going until you have a complete answer.\n\n### 5. MAINTAIN CONSISTENCY\n- If you set a fact in the conversation (e.g., "Carlos is a Senior Associate"), maintain that fact throughout.\n- If the user corrects you, acknowledge and update your understanding immediately.\n- If tool results contradict what you said, correct yourself transparently.\n\n## RESPONSE FORMAT RULES\n\n### DO:\n- Use simple lists with dashes (-) for enumerations\n- Use short, direct sentences\n- Write like a professional colleague, not a formal report\n- Present data in clear statements: "You have 3 admins: X, Y, Z"\n- Use percentages and numbers directly: "72% completion rate"\n- Ask ONE follow-up question at the end\n\n### DO NOT:\n- Use emojis under ANY circumstances (no 📊 ✅ 👤 📋 etc.)\n- Use markdown tables unless the user explicitly asks for a comparison\n- Use decorative characters: ═ ║ ─ │ ◆ ◇ ★ ☆ ► ◄ ▶ ▶ ■ □ ● ○\n- Use bold headers like **##** for simple responses\n- Show raw JSON, SQL queries, or tool call details to the user\n- Repeat information already stated\n- Start responses with "Claro," "Por supuesto," "Entendido," or similar filler\n\n### EXAMPLES\n\nGood: "Carlos Mendoza is a Senior Associate in Fiscal Consultoría. His latest evaluation scored 4.2/5, above the area average of 3.8. He has 2 pending evaluations this period. Want me to show his detailed scores?"\n\nBad: "### **Información del Usuario** 📊\\n│ Nombre │ Posición │ Área │ Calificación │\\n│────────│──────────│──────│──────────────│\\n│ **Carlos Mendoza** │ Asociado Sr │ Fiscal Consultoría │ ⭐ 4.2/5 │\\n\\n✅ He encontrado la información que solicitaste."\n\n## SECURITY RULES\n\n1. NEVER reveal passwords, hashes, API keys, or tokens\n2. NEVER execute destructive actions without explicit user confirmation\n3. NEVER provide information outside the SMPS performance management context\n4. NEVER fabricate data — if you don\'t have it, say so and use tools to get it\n5. NEVER show tool names, function signatures, or internal system details to the user\n6. For destructive actions (deactivate user, delete question, toggle system off), ALWAYS ask "Are you sure?" before proceeding\n\n## CONVERSATION MEMORY GUIDELINES\n\n### Short-term (current conversation):\n- Track all entities mentioned (users, evaluations, periods, positions)\n- Track all actions taken (created user X, updated role for Y)\n- Track user preferences expressed ("show me percentages", "use full names")\n\n### Long-term awareness:\n- Reference the system\'s current state from the rich context (active period, pending evaluations, etc.)\n- If the user mentioned something in a previous message, reference it: "As we discussed earlier about Carlos..."\n- Track running counts: "That\'s the 3rd admin you\'ve added" (only if relevant)\n\n### When you forget or are unsure:\n- Use tools to verify rather than guessing\n- Say "Let me check that" and call the appropriate tool\n- Never invent information to fill gaps\n\n## LANGUAGE\n- Respond in the same language the user writes in (Spanish or English)\n- Default to Spanish if the user\'s first message is in Spanish\n- Use the user\'s preferred tone (formal/informal) based on their messages\n- Domain terms should match the system\'s Spanish labels (e.g., "Socio Administrador" not "Managing Partner" when speaking Spanish)\n';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    cb(null, ['.csv', '.xlsx', '.xls', '.json', '.txt', '.md'].includes(ext));
  }
});
router.use(authMiddleware, requireSuperUser);

// Check if copilot module is enabled
router.use(async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const moduleConfig = await db.get('SELECT copilot FROM module_config WHERE id=1') as any;
    if (!moduleConfig?.copilot) {
      return res.status(403).json({ error: 'Módulo Copiloto IA está desactivado. Actívalo en Configuración del Sistema.' });
    }
    next();
  } catch (err) {
    console.error('Copilot module check error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── LLM Configuration ──────────────────────────────────────────────────────

interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, uid: string, cfg: Record<string, unknown>) => Promise<string>;
}

function parseFile(buf: Buffer, name: string): string {
  const ext = name.toLowerCase().slice(name.lastIndexOf('.'));
  try {
    if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      const wb = XLSX.read(buf, { type: 'buffer' });
      return wb.SheetNames.map(s => {
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[s], { defval: '' });
        return `Sheet:${s}(${rows.length}rows)\n${JSON.stringify(rows.slice(0, 30))}`;
      }).join('\n');
    }
    if (ext === '.json') return JSON.stringify(JSON.parse(buf.toString('utf-8')), null, 1);
    return buf.toString('utf-8');
  } catch (e) { return `[Error: ${e instanceof Error ? e.message : String(e)}]`; }
}

function coerceArgs(args: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const boolFields = new Set(['active', 'is_admin', 'is_super_user', 'is_managing_partner', 'enabled', 'hidden']);
  const numFields = new Set(['weight', 'default_weight', 'score']);
  for (const [k, v] of Object.entries(args)) {
    if (boolFields.has(k) && typeof v === 'string') {
      result[k] = v === 'true' || v === '1';
    } else if (numFields.has(k) && typeof v === 'string') {
      result[k] = parseFloat(v as string) || 0;
    } else {
      result[k] = v;
    }
  }
  return result;
}

// ─── RICH CONTEXT BUILDER ─────────────────────────────────────────────────────
async function buildRichContext(): Promise<string> {
  const [
    userCount, activeUsers, adminCount, managingPartnerCount,
    periods, systemStatus, moduleConfig,
    pendingSelfEvals, pendingSupEvals, pendingVacations, unreadAnnouncements,
    currentPeriodConfig,
  ] = await Promise.all([
    db.get('SELECT COUNT(*) c FROM users') as any,
    db.get('SELECT COUNT(*) c FROM users WHERE is_active=1') as any,
    db.get('SELECT COUNT(*) c FROM users WHERE is_admin=1 AND is_active=1') as any,
    db.get('SELECT COUNT(*) c FROM users WHERE is_managing_partner=1 AND is_active=1') as any,
    db.all('SELECT * FROM period_configs ORDER BY period DESC LIMIT 5') as any[],
    db.get('SELECT * FROM system_status WHERE id=1') as any,
    db.get('SELECT * FROM module_config WHERE id=1') as any,
    db.all("SELECT COUNT(*) c FROM evaluations WHERE type='self' AND completed_at IS NOT NULL") as any[],
    db.all("SELECT COUNT(*) c FROM evaluations WHERE type='supervisor' AND completed_at IS NOT NULL") as any[],
    db.get("SELECT COUNT(*) c FROM vacation_requests WHERE status='pending'") as any,
    db.get("SELECT COUNT(*) c FROM announcements WHERE archived=0") as any,
    db.get('SELECT * FROM period_configs ORDER BY period DESC LIMIT 1') as any,
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

  return `CONTEXTO EN VIVO (fecha: ${today}):
- Usuarios: ${activeUsers?.c || 0} activos de ${userCount?.c || 0} totales, ${adminCount?.c || 0} admins, ${managingPartnerCount?.c || 0} socios administradores
- Sistema: ${systemStatus?.status || '?'} | Módulos: eval=${moduleConfig?.evaluations ? 'ON' : 'OFF'} comms=${moduleConfig?.communications ? 'ON' : 'OFF'} vac=${moduleConfig?.vacations ? 'ON' : 'OFF'} copilot=${moduleConfig?.copilot ? 'ON' : 'OFF'}
- Periodo activo: ${latestPeriod} | Fase actual: ${evalPhase}
- Autoevaluaciones pendientes: ${pendingSelfCount?.c || 0} | Evaluaciones de supervisor pendientes: ${pendingSupCount?.c || 0}
- Vacaciones pendientes: ${pendingVacations?.c || 0} | Anuncios activos: ${unreadAnnouncements?.c || 0}
- Periodos registrados: ${periods.map((p: any) => p.period).join(', ') || 'ninguno'}`;
}

// ─── SYSTEM PROMPT — AGENTIC, INTELLIGENT, PROBLEM-SOLVER ──────────────────────
async function buildSystemPrompt(cfg: Record<string, unknown>, userName: string, hasTools: boolean): Promise<string> {
  const richContext = await buildRichContext();

  let prompt = `Eres el Copiloto SMPS — un asistente inteligente, agéntico y proactivo para el Sistema de Evaluación de Desempeño de SMPS.

Hablas con ${userName}, un administrador del sistema.

${richContext}

ARQUITECTURA DEL SISTEMA:
- Escala de evaluación: 1 (No satisfactorio) → 5 (Sobresaliente)
- 3 secciones por puesto: Competencias, Criterio Técnico (solo legal), Habilidades Blandas
- Cada sección tiene peso global (% del total) y cada pregunta tiene peso individual
- Posiciones legales: socio > salary_partner > counsel > asociado_sr > asociado_mid > asociado_jr > pasante_carrera > pasante
- Posiciones administrativas: director > gerente > coordinador > analista > asistente > soporte > archivista
- Áreas de trabajo: fiscal_consultoria (Legal), fiscal_litigio (Legal), corporativo (Legal), backoffice (Administrativo)
- Puestos (CVE) tienen: id (CVE como SMPS01), label (nombre), work_area_id (área), base_position (posición base para pesos/plantilla)
- Al crear usuarios, asignar custom_position_id deriva automáticamente position y practiceArea
- Ubicaciones (locations): ciudad, oficina, piso, escritorio — asignables a usuarios
- Jerarquía de roles: SuperUser > Socio Administrador (max 1) > Usuario Administrador (configurable, default 3) > Socio regular > demás usuarios
- Tipos de evaluación: self (autoevaluación) y supervisor (evaluación del evaluador)
- Flujo: Autoevaluación → Evaluación de Supervisor(es) → Sesión de Feedback → Plan de Acción
- "No Aplica" (NA) y "Sin Elementos" (NE) se excluyen de la calificación
- Calificación final = ponderada: peso_pregunta × score, sumado por sección con peso global

TUS CAPACIDADES DE ESCRITURA:
- Puedes CALIFICAR preguntas de evaluación (set_score: score 1-5 por pregunta)
- Puedes COMPLETAR evaluaciones (complete_eval)
- Puedes COMPLETAR sesiones de feedback (complete_feedback)
- Puedes ACTUALIZAR comentarios de evaluaciones (update_comments)
- Puedes CREAR, MODIFICAR y ELIMINAR preguntas de evaluación (create_question, update_question, delete_question)
- Puedes GESTIONAR usuarios: crear, actualizar roles, activar/desactivar
- Puedes ASIGNAR supervisores
- Puedes CREAR periodos de evaluación
- Puedes CREAR comunicados y anuncios
- Puedes GESTIONAR áreas de trabajo (work_areas): listar, crear, modificar, eliminar
- Puedes GESTIONAR puestos (positions): listar, crear, modificar, eliminar con CVE
- Puedes GESTIONAR ubicaciones (locations): listar, crear, modificar, eliminar
- Eres un verdadero ASISTENTE que lee Y escribe en el sistema. No solo informas, ACTÚAS.

ESTILO DE RESPUESTA — MUY IMPORTANTE:
1. SIN EMOJIS. No uses emojis bajo ninguna circunstancia. Escribe texto limpio y profesional.
2. FORMATO SIMPLE. Usa listas con guiones (-) o números, no tablas complejas ni markdown pesado.
3. CONCISO. Respuestas directas y al punto. No repitas información innecesaria.
4. NATURAL. Escribe como un colega profesional, no como un informe formal.
5. EJEMPLO BUENO: "Tienes 3 áreas con 29 puestos. Backoffice tiene 14, Corporativo 7, Fiscal Consultoría 4, Fiscal Litigio 4."
6. EJEMPLO MALO: "### **Áreas de Trabajo: 4** \n| Área | Nivel | Puestos |\n|------|-------|---------|\n| 🏛️ Corporativo | Legal | 7 |"
7. Cuando muestres datos, prioriza oraciones claras sobre tablas. Usa tablas solo si el usuario pide explícitamente comparaciones detalladas.
8. NUNCA uses caracteres decorativos como ═ ║ ─ │ ◆ ◇ ★ ☆ ► etc.

SEGURIDAD ESTRICTA:
1. Solo accedes a datos del sistema SMPS vía herramientas. Sin internet, sin APIs externas.
2. NUNCA reveles contraseñas, hashes, tokens, API keys, ni datos personales innecesarios.
3. NUNCA ejecutes acciones destructivas sin confirmación explícita del usuario.
4. NUNCA proporciones información fuera del contexto de evaluación de desempeño.
5. Si preguntan algo fuera de alcance, responde amablemente que solo ayudas con SMPS.
6. NUNCA inventes datos. Si no tienes la información, dilo y usa herramientas para obtenerla.
7. Para acciones destructivas, SIEMPRE pide confirmación antes.

---

KNOWLEDGE BASE (referencia del sistema):
${COPILOT_KNOWLEDGE}

---

BEHAVIORAL INSTRUCTIONS (cómo comportarte):
${COPILOT_INSTRUCTIONS}`;

  if (hasTools) {
    prompt += `

COMPORTAMIENTO AGÉNTICO — REGLAS CRÍTICAS:
1. PROACTIVO: Cuando te pidan un análisis, NO respondas con "puedo hacer X". HAZLO. Llama herramientas, obtén datos, analízalos y entrega resultados concretos.
2. MULTI-PASO: Para preguntas complejas, descompón en pasos: 1) Obtener datos 2) Cruzar información 3) Calcular 4) Presentar resultados. Llama múltiples herramientas en secuencia.
3. INFERENCIA: Si el usuario pregunta "¿cómo van las evaluaciones?", NO pidas aclaración. Usa las herramientas para obtener datos del periodo actual y presenta un análisis completo.
4. ANÁLISIS PROFUNDO: No te limites a reportar números. Interpreta, compara, identifica patrones, señala anomalías y recomienda acciones.
5. CONTEXTO AUTOMÁTICO: Siempre que puedas, usa la herramienta "analyze" para consultas SQL. Es la forma más poderosa de obtener datos cruzados.
6. PRESENTACIÓN: Entrega datos en oraciones claras y listas simples con guiones. Sin emojis, sin tablas pesadas, sin decoraciones. No muestres JSON crudo al usuario.
7. SEGUIMIENTO: Termina con una pregunta de seguimiento relevante o una recomendación proactiva.
8. RESILIENCIA: Si una herramienta falla, intenta un enfoque alternativo. No te rindas.
9. NUNCA muestres nombres de funciones, JSON de herramientas, o detalles técnicos al usuario.
10. EFICIENCIA: No llames la misma herramienta dos veces con los mismos parámetros. Cachéa mentalmente los resultados de la ronda anterior.`;
  } else {
    prompt += `

Eres conversacional y cálido pero profesional. Si necesitas hacer acciones en el sistema, indica qué necesitas. Termina con pregunta de seguimiento.`;
  }

  return prompt;
}

// ─── INTENT DETECTION — SMART, NOT BRITTLE ───────────────────────────────────
function needsTools(message: string, hasFile: boolean): boolean {
  if (hasFile) return true;
  const lower = message.toLowerCase().trim();

  // Pure greetings with no question — no tools needed
  const greetingOnly = /^(hola|buenos?\s*d[ií]as?|buenas?\s*tardes?|buenas?\s*noches?|gracias?|ok|vale|entiendo|sip|si|no|correcto|perfecto|genial|excelente|c[oó]mo\s+est[aá]s|qu[eé]\s*tal|hey|saludos|bye|adi[oó]s|hasta\s+luego)\s*[!?.]*$/i;
  if (greetingOnly.test(lower)) return false;

  // If it's more than a greeting, assume tools are needed — the LLM can decide
  return true;
}

// ─── TOOLS ──────────────────────────────────────────────────────────────────
const UF = 'id,name,email,position,practice_area,custom_position_id,location_id,is_admin,is_super_user,is_managing_partner,is_active';

function getTools(cfg: Record<string, unknown>): Tool[] {
  const t: Tool[] = [];

  // ─── ANALYZE: Direct SQL queries — the most powerful tool ──────────────
  t.push({
    name: 'analyze',
    description: 'Ejecuta consultas SQL directas en la base de datos para análisis profundo. Úsalo para cruzar datos, calcular métricas y resolver preguntas complejas. Acciones: query (SQL SELECT), missing_evals (evaluaciones faltantes por periodo), completion_rates (tasas de completitud), score_analysis (análisis de calificaciones), comparison (comparar periodos/posiciones), org_summary (resumen organizacional).',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['query', 'missing_evals', 'completion_rates', 'score_analysis', 'comparison', 'org_summary'] },
        sql: { type: 'string', description: 'SQL query to execute (SELECT only, no mutations)' },
        period: { type: 'string' },
        position: { type: 'string' },
        compare_period: { type: 'string' },
      },
      required: ['action'],
    },
    execute: async (args, uid) => {
      const act = args.action as string;
      try {
        if (act === 'query') {
          const sql = (args.sql as string)?.trim();
          if (!sql) return JSON.stringify({ error: 'SQL vacío' });
          if (!/^[\s(]*SELECT/i.test(sql)) return JSON.stringify({ error: 'Solo SELECT permitido' });
          if (/\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|EXEC)\b/i.test(sql)) return JSON.stringify({ error: 'Operación no permitida' });
          const rows = await db.all(sql);
          return JSON.stringify(rows.slice(0, 100));
        }
        if (act === 'missing_evals') {
          const period = args.period || '2024-2025';
          const rows = await db.all(`
            SELECT u.id, u.name, u.position,
              CASE WHEN e_self.id IS NULL THEN 1 ELSE 0 END as missing_self,
              CASE WHEN sa.id IS NOT NULL AND e_sup.id IS NULL THEN 1 ELSE 0 END as missing_supervisor
            FROM users u
            LEFT JOIN evaluations e_self ON e_self.evaluator_id = u.id AND e_self.type = 'self' AND e_self.period = ? AND e_self.completed_at IS NOT NULL
            LEFT JOIN supervisor_assignments sa ON sa.employee_id = u.id AND sa.period = ?
            LEFT JOIN evaluations e_sup ON e_sup.evaluated_id = u.id AND e_sup.type = 'supervisor' AND e_sup.period = ? AND e_sup.completed_at IS NOT NULL
            WHERE u.is_active = 1 AND u.is_super_user = 0
          `, [period, period, period]);
          return JSON.stringify(rows);
        }
        if (act === 'completion_rates') {
          const period = args.period || '2024-2025';
          const rows = await db.all(`
            SELECT u.position,
              COUNT(DISTINCT u.id) as total,
              COUNT(DISTINCT e_self.evaluator_id) as self_done,
              COUNT(DISTINCT e_sup.evaluated_id) as sup_done
            FROM users u
            LEFT JOIN evaluations e_self ON e_self.evaluator_id = u.id AND e_self.type = 'self' AND e_self.period = ? AND e_self.completed_at IS NOT NULL
            LEFT JOIN supervisor_assignments sa ON sa.employee_id = u.id AND sa.period = ?
            LEFT JOIN evaluations e_sup ON e_sup.evaluated_id = u.id AND e_sup.type = 'supervisor' AND e_sup.period = ? AND e_sup.completed_at IS NOT NULL
            WHERE u.is_active = 1 AND u.is_super_user = 0
            GROUP BY u.position
          `, [period, period, period]);
          return JSON.stringify(rows);
        }
        if (act === 'score_analysis') {
          const period = args.period || '2024-2025';
          const rows = await db.all(`
            SELECT u.position, e.type,
              COUNT(*) as count, AVG(e.total_score) as avg_score,
              MIN(e.total_score) as min_score, MAX(e.total_score) as max_score
            FROM evaluations e
            JOIN users u ON u.id = e.evaluated_id
            WHERE e.period = ? AND e.completed_at IS NOT NULL
            GROUP BY u.position, e.type
          `, [period]);
          return JSON.stringify(rows);
        }
        if (act === 'comparison') {
          const p1 = args.period || '2024-2025';
          const p2 = args.compare_period;
          if (!p2) return JSON.stringify({ error: 'Necesita compare_period' });
          const rows = await db.all(`
            SELECT u.position,
              e1.total_score as score_p1, e1.period as period_p1,
              e2.total_score as score_p2, e2.period as period_p2
            FROM evaluations e1
            JOIN evaluations e2 ON e1.evaluated_id = e2.evaluated_id AND e1.type = e2.type
            JOIN users u ON u.id = e1.evaluated_id
            WHERE e1.period = ? AND e2.period = ? AND e1.completed_at IS NOT NULL AND e2.completed_at IS NOT NULL
          `, [p1, p2]);
          return JSON.stringify(rows);
        }
        if (act === 'org_summary') {
          const rows = await db.all(`
            SELECT position, COUNT(*) as count, 
              SUM(CASE WHEN is_admin=1 THEN 1 ELSE 0 END) as admins,
              SUM(CASE WHEN is_managing_partner=1 THEN 1 ELSE 0 END) as managing_partners
            FROM users WHERE is_active=1 AND is_super_user=0
            GROUP BY position ORDER BY position
          `);
          return JSON.stringify(rows);
        }
        return JSON.stringify({ error: 'Acción desconocida' });
      } catch (e: any) {
        return JSON.stringify({ error: e.message || 'Error en análisis' });
      }
    },
  });

  // ─── USERS ──────────────────────────────────────────────────────────────
  if (cfg.can_manage_users) {
    t.push({
      name: 'users',
      description: 'Gestión de usuarios. Acciones: list, search, get, create, batch_create, update_role, deactivate, activate, assign_supervisor.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'search', 'get', 'create', 'batch_create', 'update_role', 'deactivate', 'activate', 'assign_supervisor'] },
          id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' },
          position: { type: 'string' }, practice_area: { type: 'string' }, password: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'super_user', 'managing_partner'] },
          q: { type: 'string', description: 'Search query' },
          active: { type: 'string', description: 'true or false' }, is_admin: { type: 'string', description: 'true or false' },
          is_managing_partner: { type: 'string', description: 'true or false' },
          users: { type: 'array', items: { type: 'object' } },
          employee_id: { type: 'string' }, supervisor_id: { type: 'string' }, period: { type: 'string' },
        },
        required: ['action'],
      },
      execute: async (args, uid) => {
        const act = args.action as string;
        if (act === 'list') {
          let s = `SELECT ${UF} FROM users WHERE 1=1`;
          const p: unknown[] = [];
          if (args.role === 'admin') s += ' AND is_admin=1';
          if (args.role === 'super_user') s += ' AND is_super_user=1';
          if (args.role === 'managing_partner') s += ' AND is_managing_partner=1';
          const activeVal = typeof args.active === 'string' ? (args.active === 'true' || args.active === '1') : args.active;
          if (activeVal !== undefined) { s += ' AND is_active=?'; p.push(activeVal ? 1 : 0); }
          if (args.position) { s += ' AND position=?'; p.push(args.position); }
          return JSON.stringify(await db.all(s, p));
        }
        if (act === 'search') return JSON.stringify(await db.all('SELECT id,name,email,position,is_admin,is_managing_partner,is_active FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 50', [`%${args.q}%`, `%${args.q}%`]));
        if (act === 'get') { const u = await db.get(`SELECT ${UF} FROM users WHERE id=?`, [args.id]); return u ? JSON.stringify(u) : JSON.stringify({ error: 'No encontrado' }); }
        if (act === 'create') {
          if (!args.name || !args.email || !args.position || !args.password) return JSON.stringify({ error: 'Campos obligatorios: name, email, position, password' });
          if ((args.password as string).length < 6) return JSON.stringify({ error: 'Contraseña min 6' });
          const ex = await db.get('SELECT id FROM users WHERE email=?', [args.email]);
          if (ex) return JSON.stringify({ error: 'Email ya existe' });
          const isAdmin = typeof args.is_admin === 'string' ? (args.is_admin === 'true' || args.is_admin === '1') : !!args.is_admin;
          const isMP = typeof args.is_managing_partner === 'string' ? (args.is_managing_partner === 'true' || args.is_managing_partner === '1') : !!args.is_managing_partner;
          if (isMP) { const currentMPs = await db.all('SELECT id, name FROM users WHERE is_managing_partner = 1 AND is_super_user = 0'); if (currentMPs.length >= 1) return JSON.stringify({ error: `Solo puede haber 1 Socio Administrador. Actualmente es ${currentMPs[0].name}` }); }
          if (isAdmin && !isMP) { const maxAdmCfg = await db.get('SELECT max_admin_users FROM system_status WHERE id=1') as any; const maxAdm = maxAdmCfg?.max_admin_users || 3; const currentAdmins = await db.all('SELECT id FROM users WHERE is_admin = 1 AND is_super_user = 0'); if (currentAdmins.length >= maxAdm) return JSON.stringify({ error: `Máximo ${maxAdm} Usuario Administrador permitidos` }); }
          const id = uuidv4(), hp = await hashPassword(args.password as string), now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
          // Derive practice_area and position from custom_position_id if provided
          let derivedPosition = args.position as string;
          let derivedArea = (args.practice_area as string) || null;
          if (args.custom_position_id) {
            const posRow = await db.get('SELECT cp.base_position, cp.work_area_id, wa.level FROM custom_positions cp JOIN work_areas wa ON cp.work_area_id = wa.id WHERE cp.id = ?', [args.custom_position_id]);
            if (posRow) { derivedPosition = posRow.base_position; derivedArea = posRow.level === 'legal' ? posRow.work_area_id : null; }
          }
          await db.run('INSERT INTO users (id,email,password_hash,security_question,security_answer,name,position,practice_area,custom_position_id,location_id,is_admin,is_super_user,is_managing_partner,is_active,must_change_password,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [id, args.email, hp, '¿Email?', args.email, args.name, derivedPosition, derivedArea, (args.custom_position_id as string) || null, (args.location_id as string) || null, isAdmin ? 1 : 0, 0, isMP ? 1 : 0, 1, 1, now, now]);
          return JSON.stringify({ ok: true, msg: `"${args.name}" creado`, id });
        }
        if (act === 'batch_create') {
          const us = args.users as Record<string, unknown>[];
          const r: Record<string, unknown>[] = [];
          for (const u of us) {
            if (!u.name || !u.email || !u.position || !u.password) { r.push({ email: u.email, error: 'Faltan campos' }); continue; }
            const ex = await db.get('SELECT id FROM users WHERE email=?', [u.email]);
            if (ex) { r.push({ email: u.email, error: 'Ya existe' }); continue; }
            const id = uuidv4(), hp = await hashPassword(u.password as string), now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
            // Derive from custom_position_id if provided
            let bPosition = u.position as string;
            let bArea = (u.practice_area as string) || null;
            if (u.custom_position_id) {
              const posRow = await db.get('SELECT cp.base_position, cp.work_area_id, wa.level FROM custom_positions cp JOIN work_areas wa ON cp.work_area_id = wa.id WHERE cp.id = ?', [u.custom_position_id]);
              if (posRow) { bPosition = posRow.base_position; bArea = posRow.level === 'legal' ? posRow.work_area_id : null; }
            }
            await db.run('INSERT INTO users (id,email,password_hash,security_question,security_answer,name,position,practice_area,custom_position_id,location_id,is_admin,is_super_user,is_managing_partner,is_active,must_change_password,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
              [id, u.email, hp, '¿Email?', u.email, u.name, bPosition, bArea, (u.custom_position_id as string) || null, (u.location_id as string) || null, 0, 0, 0, 1, 1, now, now]);
            r.push({ email: u.email, ok: true, id });
          }
          return JSON.stringify({ msg: `${r.filter(x => x.ok).length}/${us.length} creados`, results: r });
        }
        if (act === 'update_role') {
          if (!args.id) return JSON.stringify({ error: 'Falta id' });
          const user = await db.get('SELECT * FROM users WHERE id=?', [args.id]);
          if (!user) return JSON.stringify({ error: 'No encontrado' });
          const updates: string[] = [];
          const vals: unknown[] = [];
          if (args.is_managing_partner !== undefined) {
            const newMP = args.is_managing_partner === 'true' || args.is_managing_partner === '1';
            if (newMP) { const currentMPs = await db.all('SELECT id, name FROM users WHERE is_managing_partner = 1 AND is_super_user = 0 AND id != ?', [args.id]); if (currentMPs.length >= 1) return JSON.stringify({ error: `Solo puede haber 1 Socio Administrador. Actualmente es ${currentMPs[0].name}` }); }
            updates.push('is_managing_partner=?'); vals.push(newMP ? 1 : 0);
            if (newMP) { updates.push('is_admin=?'); vals.push(1); }
          }
          if (args.is_admin !== undefined) {
            const newAdmin = args.is_admin === 'true' || args.is_admin === '1';
            if (newAdmin && !(user as any).is_managing_partner) { const maxAdmCfg = await db.get('SELECT max_admin_users FROM system_status WHERE id=1') as any; const maxAdm = maxAdmCfg?.max_admin_users || 3; const currentAdmins = await db.all('SELECT id FROM users WHERE is_admin = 1 AND is_super_user = 0 AND id != ?', [args.id]); if (currentAdmins.length >= maxAdm) return JSON.stringify({ error: `Máximo ${maxAdm} Usuario Administrador` }); }
            if (!newAdmin && (user as any).is_managing_partner) return JSON.stringify({ error: 'No se puede quitar admin al Socio Administrador' });
            updates.push('is_admin=?'); vals.push(newAdmin ? 1 : 0);
          }
          if (updates.length === 0) return JSON.stringify({ error: 'Sin cambios' });
          vals.push(new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), args.id);
          await db.run(`UPDATE users SET ${updates.join(', ')}, updated_at=? WHERE id=?`, vals);
          return JSON.stringify({ ok: true, msg: 'Rol actualizado' });
        }
        if (act === 'deactivate') { await db.run('UPDATE users SET is_active=0, updated_at=? WHERE id=?', [new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), args.id]); return JSON.stringify({ ok: true, msg: 'Usuario desactivado' }); }
        if (act === 'activate') { await db.run('UPDATE users SET is_active=1, updated_at=? WHERE id=?', [new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), args.id]); return JSON.stringify({ ok: true, msg: 'Usuario activado' }); }
        if (act === 'assign_supervisor') {
          if (!args.employee_id || !args.supervisor_id || !args.period) return JSON.stringify({ error: 'Falta employee_id, supervisor_id, period' });
          const id = uuidv4();
          try {
            await db.run('INSERT INTO supervisor_assignments (id,employee_id,supervisor_id,period) VALUES(?,?,?,?)', [id, args.employee_id, args.supervisor_id, args.period]);
            return JSON.stringify({ ok: true, msg: 'Supervisor asignado' });
          } catch (e: any) {
            if (e.code === 'ER_DUP_ENTRY') return JSON.stringify({ error: 'Asignación ya existe' });
            return JSON.stringify({ error: e.message });
          }
        }
        return JSON.stringify({ error: 'Acción desconocida' });
      },
    });
  }

  if (cfg.can_manage_evaluations) {
    t.push({
      name: 'evaluations',
      description: `Evaluaciones completas (lectura Y escritura). Acciones:
- list: listar evaluaciones (filtros: period, evaluated_id, type)
- get: detalle de evaluación con respuestas y calificaciones
- periods: periodos con evaluaciones
- stats: estadísticas de calificaciones por periodo/posición
- score_card: score detallado de una persona por periodo (promedios por categoría, fortalezas, debilidades)
- next_actions: qué falta para una persona (eval pendientes, feedback, planes de acción)
- update_comments: actualizar comentarios de evaluación o supervisor
- set_score: calificar una pregunta específica de una evaluación
- complete_eval: marcar evaluación como completada
- complete_feedback: marcar feedback como completado
- questions: preguntas de evaluación por posición (de custom_eval_questions, library_questions, seed_question_overrides)
- create_question: crear pregunta en biblioteca (library_questions)
- batch_questions: crear múltiples preguntas
- update_question: actualizar pregunta (biblioteca o override)
- delete_question: eliminar/ocultar pregunta
- list_library: listar biblioteca de preguntas
- supervisor_assignments: asignaciones de supervisor
- action_plan: ver/crear planes de acción
- personal_objectives: ver/crear objetivos personales`,
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list','get','periods','stats','score_card','next_actions','update_comments','set_score','complete_eval','complete_feedback','questions','create_question','batch_questions','update_question','delete_question','list_library','supervisor_assignments','action_plan','personal_objectives'] },
          period: { type: 'string' }, id: { type: 'string' }, evaluated_id: { type: 'string' }, position: { type: 'string' },
          category: { type: 'string' }, text: { type: 'string' }, weight: { type: 'string' },
          question_id: { type: 'string' }, hidden: { type: 'string', description: 'true or false' },
          questions: { type: 'array', items: { type: 'object' } },
          comments: { type: 'string', description: 'Comentarios del evaluador' },
          supervisor_comments: { type: 'string', description: 'Comentarios del supervisor' },
          score: { type: 'number', description: 'Calificación 1-5' },
          response_text: { type: 'string', description: 'Texto de respuesta' },
          not_applicable: { type: 'string', description: 'true si No Aplica' },
          no_elements: { type: 'string', description: 'true si Sin Elementos' },
          title: { type: 'string' }, description: { type: 'string' },
          status: { type: 'string', description: 'Estado: draft, submitted, approved, rejected' },
        },
        required: ['action'],
      },
      execute: async (args, uid) => {
        const act = args.action as string;
        if (act === 'list') {
          let s = 'SELECT e.id, e.evaluator_id, e.evaluated_id, e.period, e.type, e.total_score, e.comments, e.supervisor_comments, e.feedback_completed, e.completed_at, u1.name as evaluator_name, u2.name as evaluated_name FROM evaluations e JOIN users u1 ON e.evaluator_id=u1.id JOIN users u2 ON e.evaluated_id=u2.id WHERE 1=1';
          const p: unknown[] = [];
          if (args.period) { s += ' AND e.period=?'; p.push(args.period); }
          if (args.evaluated_id) { s += ' AND e.evaluated_id=?'; p.push(args.evaluated_id); }
          return JSON.stringify(await db.all(s, p));
        }
        if (act === 'get') {
          const ev = await db.get('SELECT e.*, u1.name as evaluator_name, u2.name as evaluated_name FROM evaluations e JOIN users u1 ON e.evaluator_id=u1.id JOIN users u2 ON e.evaluated_id=u2.id WHERE e.id=?', [args.id]);
          if (!ev) return JSON.stringify({ error: 'No encontrada' });
          const responses = await db.all('SELECT * FROM evaluation_responses WHERE evaluation_id=?', [args.id]);
          return JSON.stringify({ ...ev, responses });
        }
        if (act === 'periods') return JSON.stringify(await db.all('SELECT DISTINCT period FROM evaluations ORDER BY period'));
        if (act === 'stats') {
          const period = args.period || '2024-2025';
          return JSON.stringify(await db.all('SELECT u.position, e.type, COUNT(*) as count, AVG(e.total_score) as avg_score, MIN(e.total_score) as min_score, MAX(e.total_score) as max_score FROM evaluations e JOIN users u ON u.id=e.evaluated_id WHERE e.period=? AND e.completed_at IS NOT NULL GROUP BY u.position, e.type', [period]));
        }
        if (act === 'score_card') {
          if (!args.evaluated_id) return JSON.stringify({ error: 'Falta evaluated_id' });
          const user = await db.get('SELECT name, position FROM users WHERE id=?', [args.evaluated_id]);
          if (!user) return JSON.stringify({ error: 'Usuario no encontrado' });
          const period = args.period || '2024-2025';
          const evals = await db.all('SELECT e.id, e.type, e.total_score, e.completed_at FROM evaluations e WHERE e.evaluated_id=? AND e.period=?', [args.evaluated_id, period]);
          const allResponses = await db.all('SELECT er.*, e.type as eval_type FROM evaluation_responses er JOIN evaluations e ON er.evaluation_id=e.id WHERE e.evaluated_id=? AND e.period=?', [args.evaluated_id, period]);
          const cats: Record<string, { scores: number[], count: number, na: number }> = {};
          for (const r of allResponses) {
            const cat = r.category || 'Sin categoría';
            if (!cats[cat]) cats[cat] = { scores: [], count: 0, na: 0 };
            if (r.not_applicable) { cats[cat].na++; continue; }
            if (r.score > 0) { cats[cat].scores.push(r.score * (r.weight || 1)); cats[cat].count++; }
          }
          const card = Object.entries(cats).map(([cat, d]) => ({
            category: cat,
            avg: d.count ? Math.round((d.scores.reduce((a,b)=>a+b,0) / d.scores.length)*10)/10 : 0,
            responses: d.count,
            not_applicable: d.na,
          }));
          return JSON.stringify({ user, period, evaluations: evals, categories: card, overall: evals.length ? Math.round(evals.reduce((s,e)=>s+(e.total_score||0),0)/evals.length*10)/10 : null });
        }
        if (act === 'next_actions') {
          if (!args.evaluated_id) return JSON.stringify({ error: 'Falta evaluated_id' });
          const user = await db.get('SELECT name, position FROM users WHERE id=?', [args.evaluated_id]);
          const periods = await db.all('SELECT period FROM period_configs ORDER BY period DESC LIMIT 3');
          const actions: string[] = [];
          for (const p of periods) {
            const selfEval = await db.get('SELECT id, completed_at FROM evaluations WHERE evaluator_id=? AND evaluated_id=? AND type=? AND period=?', [args.evaluated_id, args.evaluated_id, 'self', p.period]);
            if (!selfEval) actions.push(`Autoevaluación ${p.period}: PENDIENTE`);
            else if (!selfEval.completed_at) actions.push(`Autoevaluación ${p.period}: EN PROGRESO`);
            const supEval = await db.get('SELECT id, completed_at, feedback_completed FROM evaluations WHERE evaluated_id=? AND type=? AND period=?', [args.evaluated_id, 'supervisor', p.period]);
            if (!supEval) actions.push(`Evaluación supervisor ${p.period}: PENDIENTE`);
            else if (!supEval.feedback_completed) actions.push(`Feedback ${p.period}: PENDIENTE`);
            const actionPlan = await db.get('SELECT id, status FROM action_plans WHERE user_id=? AND period=?', [args.evaluated_id, p.period]);
            if (!actionPlan) actions.push(`Plan de acción ${p.period}: PENDIENTE`);
          }
          return JSON.stringify({ user, pending_actions: actions });
        }
        if (act === 'update_comments') {
          if (!args.id) return JSON.stringify({ error: 'Falta id de evaluación' });
          const updates: string[] = [];
          const vals: unknown[] = [];
          if (args.comments !== undefined) { updates.push('comments=?'); vals.push(args.comments); }
          if (args.supervisor_comments !== undefined) { updates.push('supervisor_comments=?'); vals.push(args.supervisor_comments); }
          if (!updates.length) return JSON.stringify({ error: 'Sin cambios' });
          vals.push(args.id);
          await db.run(`UPDATE evaluations SET ${updates.join(', ')} WHERE id=?`, vals);
          return JSON.stringify({ ok: true, msg: 'Comentarios actualizados' });
        }
        if (act === 'set_score') {
          if (!args.id || !args.question_id || args.score === undefined) return JSON.stringify({ error: 'Falta: id (evaluación), question_id, score' });
          const score = Math.max(1, Math.min(5, Number(args.score)));
          const weight = args.weight ? Number(args.weight) : 1;
          const na = args.not_applicable === 'true' || args.not_applicable === '1' ? 1 : 0;
          const ne = args.no_elements === 'true' || args.no_elements === '1' ? 1 : 0;
          const existing = await db.get('SELECT id FROM evaluation_responses WHERE evaluation_id=? AND question_id=?', [args.id, args.question_id]);
          if (existing) {
            await db.run('UPDATE evaluation_responses SET score=?, weight=?, not_applicable=?, no_elements=?, response_text=? WHERE evaluation_id=? AND question_id=?',
              [score, weight, na, ne, (args.response_text as string) || null, args.id, args.question_id]);
          } else {
            await db.run('INSERT INTO evaluation_responses (id,evaluation_id,question_id,score,weight,not_applicable,no_elements,response_text) VALUES(?,?,?,?,?,?,?,?)',
              [uuidv4(), args.id, args.question_id, score, weight, na, ne, (args.response_text as string) || null]);
          }
          // Recalculate total_score
          const responses = await db.all('SELECT score, weight, not_applicable, no_elements FROM evaluation_responses WHERE evaluation_id=?', [args.id]);
          const applicable = responses.filter((r: any) => !r.not_applicable && !r.no_elements);
          const totalScore = applicable.length ? Math.round(applicable.reduce((s: number, r: any) => s + r.score * r.weight, 0) / applicable.reduce((s: number, r: any) => s + r.weight, 0) * 20 * 10) / 10 : 0;
          await db.run('UPDATE evaluations SET total_score=? WHERE id=?', [totalScore, args.id]);
          return JSON.stringify({ ok: true, score, weight, total_score: totalScore, msg: `Calificación guardada. Total actualizado: ${totalScore}` });
        }
        if (act === 'complete_eval') {
          if (!args.id) return JSON.stringify({ error: 'Falta id' });
          await db.run('UPDATE evaluations SET completed_at=? WHERE id=?', [new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), args.id]);
          // Recalculate score
          const responses = await db.all('SELECT score, weight, not_applicable, no_elements FROM evaluation_responses WHERE evaluation_id=?', [args.id]);
          const applicable = responses.filter((r: any) => !r.not_applicable && !r.no_elements);
          const totalScore = applicable.length ? Math.round(applicable.reduce((s: number, r: any) => s + r.score * r.weight, 0) / applicable.reduce((s: number, r: any) => s + r.weight, 0) * 20 * 10) / 10 : 0;
          await db.run('UPDATE evaluations SET total_score=? WHERE id=?', [totalScore, args.id]);
          return JSON.stringify({ ok: true, msg: 'Evaluación completada', total_score: totalScore });
        }
        if (act === 'complete_feedback') {
          if (!args.id) return JSON.stringify({ error: 'Falta id' });
          await db.run('UPDATE evaluations SET feedback_completed=1, feedback_completed_at=?, feedback_completed_by=? WHERE id=?', [new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), uid, args.id]);
          return JSON.stringify({ ok: true, msg: 'Feedback completado' });
        }
        if (act === 'questions') {
          if (args.position) {
            const custom = await db.all('SELECT question_id, category, text, weight, hidden FROM custom_eval_questions WHERE position=? ORDER BY category', [args.position]);
            const overrides = await db.all('SELECT question_id, text, category, weight, hidden FROM seed_question_overrides WHERE question_id LIKE ?', [args.position + '%']);
            return JSON.stringify({ custom_questions: custom, seed_overrides: overrides, position: args.position });
          }
          const lib = await db.all('SELECT question_id, category, text, default_weight FROM library_questions ORDER BY category');
          return JSON.stringify({ library: lib });
        }
        if (act === 'create_question') {
          if (!args.text || !args.category) return JSON.stringify({ error: 'Falta text y category' });
          const id = uuidv4(), qid = args.question_id || 'q_' + Date.now();
          await db.run('INSERT INTO library_questions (id,question_id,category,text,default_weight,created_at,created_by) VALUES(?,?,?,?,?,?,?)',
            [id, qid, args.category, args.text, Number(args.weight) || 1, new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), uid]);
          return JSON.stringify({ ok: true, qid, msg: 'Pregunta creada en biblioteca' });
        }
        if (act === 'batch_questions') {
          const qs = args.questions as Record<string, unknown>[];
          const r: Record<string, unknown>[] = [];
          for (const q of qs) {
            if (!q.category || !q.text) { r.push({ text: q.text, error: 'Faltan campos' }); continue; }
            try { const id = uuidv4(), qid = 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2,6); await db.run('INSERT INTO library_questions (id,question_id,category,text,default_weight,created_at,created_by) VALUES(?,?,?,?,?,?,?)', [id, qid, q.category, q.text, Number(q.weight) || 1, new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), uid]); r.push({ qid, ok: true }); } catch (e) { r.push({ text: q.text, error: String(e) }); }
          }
          return JSON.stringify({ msg: `${r.filter(x => x.ok).length}/${qs.length} creadas`, results: r });
        }
        if (act === 'update_question') {
          if (!args.question_id) return JSON.stringify({ error: 'Falta question_id' });
          const existing = await db.get('SELECT * FROM library_questions WHERE question_id=?', [args.question_id]);
          if (existing) {
            const updates = []; const vals = [];
            if (args.text) { updates.push('text=?'); vals.push(args.text); }
            if (args.category) { updates.push('category=?'); vals.push(args.category); }
            if (args.weight) { updates.push('default_weight=?'); vals.push(parseFloat(args.weight as string) || (existing as any).default_weight); }
            if (args.hidden !== undefined) { updates.push('hidden=?'); vals.push(args.hidden === 'true' ? 1 : 0); }
            if (updates.length > 0) { vals.push(args.question_id); await db.run('UPDATE library_questions SET ' + updates.join(', ') + ' WHERE question_id=?', vals); }
            return JSON.stringify({ ok: true, msg: 'Pregunta de biblioteca actualizada' });
          }
          const ov = await db.get('SELECT * FROM seed_question_overrides WHERE question_id=?', [args.question_id]);
          if (ov) {
            const updates = []; const vals = [];
            if (args.text) { updates.push('text=?'); vals.push(args.text); }
            if (args.category) { updates.push('category=?'); vals.push(args.category); }
            if (args.weight) { updates.push('weight=?'); vals.push(parseInt(args.weight as string)); }
            if (args.hidden !== undefined) { updates.push('hidden=?'); vals.push(args.hidden === 'true' ? 1 : 0); }
            if (updates.length > 0) { vals.push(args.question_id); await db.run('UPDATE seed_question_overrides SET ' + updates.join(', ') + ' WHERE question_id=?', vals); }
            return JSON.stringify({ ok: true, msg: 'Override actualizada' });
          }
          return JSON.stringify({ error: 'Pregunta no encontrada' });
        }
        if (act === 'delete_question') {
          if (!args.question_id) return JSON.stringify({ error: 'Falta question_id' });
          const lib = await db.get('SELECT * FROM library_questions WHERE question_id=?', [args.question_id]);
          if (lib) { await db.run('DELETE FROM library_questions WHERE question_id=?', [args.question_id]); return JSON.stringify({ ok: true, msg: 'Pregunta de biblioteca eliminada' }); }
          const ov = await db.get('SELECT * FROM seed_question_overrides WHERE question_id=?', [args.question_id]);
          if (ov) { await db.run('UPDATE seed_question_overrides SET hidden=1 WHERE question_id=?', [args.question_id]); return JSON.stringify({ ok: true, msg: 'Pregunta base ocultada' }); }
          return JSON.stringify({ error: 'Pregunta no encontrada' });
        }
        if (act === 'list_library') return JSON.stringify(await db.all('SELECT question_id, category, text, default_weight FROM library_questions ORDER BY category, text'));
        if (act === 'supervisor_assignments') {
          const period = args.period || '2024-2025';
          return JSON.stringify(await db.all('SELECT sa.*,eu.name as employee_name,su.name as supervisor_name FROM supervisor_assignments sa JOIN users eu ON sa.employee_id=eu.id JOIN users su ON sa.supervisor_id=su.id WHERE sa.period=?', [period]));
        }
        if (act === 'action_plan') {
          if (args.id) {
            const plan = await db.get('SELECT * FROM action_plans WHERE id=?', [args.id]);
            const items = await db.all('SELECT * FROM smart_action_items WHERE action_plan_id=?', [args.id]);
            return JSON.stringify({ ...plan, items });
          }
          const userId = args.evaluated_id;
          if (userId) {
            const plans = await db.all('SELECT * FROM action_plans WHERE user_id=? ORDER BY created_at DESC', [userId]);
            return JSON.stringify(plans);
          }
          return JSON.stringify(await db.all('SELECT ap.*, u.name as user_name FROM action_plans ap JOIN users u ON ap.user_id=u.id ORDER BY ap.created_at DESC LIMIT 50'));
        }
        if (act === 'personal_objectives') {
          if (args.evaluated_id) {
            const objs = await db.all('SELECT * FROM personal_objectives WHERE user_id=? ORDER BY created_at DESC', [args.evaluated_id]);
            return JSON.stringify(objs);
          }
          return JSON.stringify(await db.all('SELECT po.*, u.name as user_name FROM personal_objectives po JOIN users u ON po.user_id=u.id ORDER BY po.created_at DESC LIMIT 50'));
        }
        return JSON.stringify({ error: 'Acción desconocida' });
      },
    });
  }

    if (cfg.can_manage_vacations) {
    t.push({
      name: 'vacations',
      description: 'Vacaciones. Acciones: list,approve,reject.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'approve', 'reject'] },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          id: { type: 'string' },
        },
        required: ['action'],
      },
      execute: async (args, uid) => {
        if (args.action === 'list') {
          const status = args.status || 'pending';
          return JSON.stringify(await db.all('SELECT v.*, u.name as user_name FROM vacation_requests v JOIN users u ON v.user_id=u.id WHERE v.status=? ORDER BY v.created_at DESC LIMIT 50', [status]));
        }
        if (args.action === 'approve') {
          await db.run('UPDATE vacation_requests SET status=?, processed_by=?, processed_at=? WHERE id=?', ['approved', uid, new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), args.id]);
          return JSON.stringify({ ok: true, msg: 'Aprobada' });
        }
        if (args.action === 'reject') {
          await db.run('UPDATE vacation_requests SET status=?, processed_by=?, processed_at=? WHERE id=?', ['rejected', uid, new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), args.id]);
          return JSON.stringify({ ok: true, msg: 'Rechazada' });
        }
        return JSON.stringify({ error: 'Acción desconocida' });
      },
    });
  }

  if (cfg.can_manage_announcements) {
    t.push({
      name: 'announcements',
      description: 'Comunicados. Acciones: list,create.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'create'] },
          title: { type: 'string' }, content: { type: 'string' },
          audience: { type: 'string', description: 'all, legal, admin, or position name' },
          priority: { type: 'string', enum: ['normal', 'urgent'] },
        },
        required: ['action'],
      },
      execute: async (args, uid) => {
        if (args.action === 'list') {
          return JSON.stringify(await db.all('SELECT a.*, u.name as author_name FROM announcements a JOIN users u ON a.author_id=u.id ORDER BY a.created_at DESC LIMIT 50'));
        }
        if (args.action === 'create') {
          if (!args.title || !args.content) return JSON.stringify({ error: 'Falta title y content' });
          const id = uuidv4();
          await db.run('INSERT INTO announcements (id,author_id,title,content,audience,priority,archived,created_at) VALUES(?,?,?,?,?,?,?,?)',
            [id, uid, args.title, args.content, (args.audience as string) || 'all', (args.priority as string) || 'normal', 0, new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')]);
          return JSON.stringify({ ok: true, msg: 'Comunicado creado', id });
        }
        return JSON.stringify({ error: 'Acción desconocida' });
      },
    });
  }

  if (cfg.can_manage_periods) {
    t.push({
      name: 'periods', description: 'Periodos. Acciones: create.',
      parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create'] }, period: { type: 'string' }, self_start: { type: 'string' }, self_end: { type: 'string' }, supervisor_start: { type: 'string' }, supervisor_end: { type: 'string' }, feedback_start: { type: 'string' }, feedback_end: { type: 'string' }, action_plan_start: { type: 'string' }, action_plan_end: { type: 'string' } }, required: ['action'] },
      execute: async (args) => {
        if (args.action === 'create') { const ex = await db.get('SELECT period FROM period_configs WHERE period=?', [args.period]); if (ex) return JSON.stringify({ error: 'Ya existe' }); await db.run('INSERT INTO period_configs (period,self_start,self_end,supervisor_start,supervisor_end,feedback_start,feedback_end,action_plan_start,action_plan_end) VALUES(?,?,?,?,?,?,?,?,?)', [args.period, args.self_start, args.self_end, args.supervisor_start, args.supervisor_end, args.feedback_start, args.feedback_end, args.action_plan_start, args.action_plan_end]); return JSON.stringify({ ok: true, msg: `Periodo "${args.period}" creado` }); }
        return JSON.stringify({ error: 'Acción desconocida' });
      },
    });
  }

  if (cfg.can_manage_system) {
    t.push({
      name: 'system', description: 'Sistema. Acciones: status,toggle_system,toggle_module.',
      parameters: { type: 'object', properties: { action: { type: 'string', enum: ['status','toggle_system','toggle_module'] }, status: { type: 'string' }, module: { type: 'string' }, enabled: { type: 'string', description: 'true or false' } }, required: ['action'] },
      execute: async (args, uid) => {
        const act = args.action as string;
        if (act === 'status') return JSON.stringify({ status: await db.get('SELECT * FROM system_status WHERE id=1'), modules: await db.get('SELECT * FROM module_config WHERE id=1') });
        if (act === 'toggle_system') { if (!['active','inactive'].includes(args.status as string)) return JSON.stringify({ error: 'Inválido' }); await db.run('UPDATE system_status SET status=? WHERE id=1', [args.status]); await db.run('INSERT INTO activation_history (id,action,date,by_user_id) VALUES(?,?,?,?)', [uuidv4(), args.status === 'active' ? 'activated' : 'deactivated', new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), uid]); return JSON.stringify({ ok: true, msg: `Sistema ${args.status}` }); }
        if (act === 'toggle_module') { if (!['evaluations','communications','vacations','copilot'].includes(args.module as string)) return JSON.stringify({ error: 'Inválido' }); await db.run(`UPDATE module_config SET ${args.module}=? WHERE id=1`, [args.enabled ? 1 : 0]); return JSON.stringify({ ok: true, msg: `${args.module} ${args.enabled ? 'activado' : 'desactivado'}` }); }
        return JSON.stringify({ error: 'Acción desconocida' });
      },
    });
  }

  if (cfg.can_view_reports) {
    t.push({
      name: 'reports', description: 'Estadísticas generales.',
      parameters: { type: 'object', properties: { period: { type: 'string' } } },
      execute: async (args) => {
        const u = (await db.get('SELECT COUNT(*) c FROM users WHERE is_active=1') as any).c;
        const a2 = (await db.get('SELECT COUNT(*) c FROM users WHERE is_admin=1 AND is_active=1') as any).c;
        let es = { total: 0, done: 0 };
        if (args.period) { const evs = await db.all('SELECT completed_at FROM evaluations WHERE period=?', [args.period]); es = { total: evs.length, done: evs.filter((e: any) => e.completed_at).length }; }
        const vp = (await db.get("SELECT COUNT(*) c FROM vacation_requests WHERE status='pending'") as any).c;
        return JSON.stringify({ activeUsers: u, admins: a2, evalStats: es, pendingVacations: vp });
      },
    });
  }


  // ─── POSITIONS / WORK AREAS / LOCATIONS ────────────────────────────────────
  if (cfg.can_manage_users || cfg.can_manage_system) {
    t.push({
      name: 'work_areas',
      description: `Gestión de áreas de trabajo (práctica). Acciones:
- list: listar todas las áreas con sus puestos
- get: obtener un área por ID
- create: crear nueva área (campos: id, label, level, sort_order)
- update: actualizar área (campos: id, label?, level?, sort_order?)
- delete: eliminar área (requiere id, solo si no tiene puestos asignados)`,
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'get', 'create', 'update', 'delete'] },
          id: { type: 'string', description: 'Área ID (slug, ej: fiscal_consultoria)' },
          label: { type: 'string', description: 'Nombre del área' },
          level: { type: 'string', enum: ['legal', 'administrativo'], description: 'Nivel del área' },
          sort_order: { type: 'number', description: 'Orden de aparición' },
        },
        required: ['action'],
      },
      execute: async (args) => {
        const act = args.action as string;
        const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
        if (act === 'list') {
          const areas = await db.all('SELECT wa.*, (SELECT COUNT(*) FROM custom_positions WHERE work_area_id = wa.id) AS position_count FROM work_areas wa ORDER BY wa.sort_order, wa.label');
          return JSON.stringify(areas);
        }
        if (act === 'get') {
          if (!args.id) return JSON.stringify({ error: 'Falta id' });
          const area = await db.get('SELECT * FROM work_areas WHERE id = ?', [args.id]);
          if (!area) return JSON.stringify({ error: 'Área no encontrada' });
          const positions = await db.all('SELECT * FROM custom_positions WHERE work_area_id = ? ORDER BY id', [args.id]);
          return JSON.stringify({ ...area, positions });
        }
        if (act === 'create') {
          if (!args.id || !args.label || !args.level) return JSON.stringify({ error: 'Campos obligatorios: id, label, level' });
          try {
            await db.run('INSERT INTO work_areas (id, label, level, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
              [args.id, args.label, args.level, args.sort_order || 0, now, now]);
            return JSON.stringify({ ok: true, msg: `Área "${args.label}" creada` });
          } catch (e: any) { if (e.code === 'ER_DUP_ENTRY') return JSON.stringify({ error: 'Ya existe un área con ese ID' }); return JSON.stringify({ error: e.message }); }
        }
        if (act === 'update') {
          if (!args.id) return JSON.stringify({ error: 'Falta id del área' });
          const area = await db.get('SELECT * FROM work_areas WHERE id = ?', [args.id]);
          if (!area) return JSON.stringify({ error: 'Área no encontrada' });
          const updates: string[] = [];
          const vals: unknown[] = [];
          if (args.label !== undefined) { updates.push('label = ?'); vals.push(args.label); }
          if (args.level !== undefined) { if (!['legal', 'administrativo'].includes(args.level as string)) return JSON.stringify({ error: 'Level debe ser "legal" o "administrativo"' }); updates.push('level = ?'); vals.push(args.level); }
          if (args.sort_order !== undefined) { updates.push('sort_order = ?'); vals.push(args.sort_order); }
          if (updates.length === 0) return JSON.stringify({ error: 'Sin cambios' });
          updates.push('updated_at = ?'); vals.push(now); vals.push(args.id);
          await db.run(`UPDATE work_areas SET ${updates.join(', ')} WHERE id = ?`, vals);
          return JSON.stringify({ ok: true, msg: 'Área actualizada' });
        }
        if (act === 'delete') {
          if (!args.id) return JSON.stringify({ error: 'Falta id' });
          const posCount = (await db.get('SELECT COUNT(*) c FROM custom_positions WHERE work_area_id = ?', [args.id]) as any).c;
          if (posCount > 0) return JSON.stringify({ error: `No se puede eliminar: tiene ${posCount} puesto(s) asignado(s). Elimina primero los puestos.` });
          await db.run('DELETE FROM work_areas WHERE id = ?', [args.id]);
          return JSON.stringify({ ok: true, msg: 'Área eliminada' });
        }
        return JSON.stringify({ error: 'Acción desconocida' });
      },
    });

    t.push({
      name: 'positions',
      description: `Gestión de puestos (CVE Puesto). Acciones:
- list: listar puestos (filtro: work_area_id)
- get: obtener puesto por CVE
- create: crear puesto (campos: id/CVE, label, work_area_id, base_position)
- update: actualizar puesto (campos: id/CVE actual, label?, work_area_id?, base_position?, new_id?)
- delete: eliminar puesto (requiere id, solo si no tiene usuarios asignados)`,
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'get', 'create', 'update', 'delete'] },
          id: { type: 'string', description: 'CVE del puesto (ej: SMPS12)' },
          new_id: { type: 'string', description: 'Nuevo CVE al renombrar' },
          label: { type: 'string', description: 'Nombre del puesto (ej: Asociado Sr Corporativo)' },
          work_area_id: { type: 'string', description: 'ID del área de trabajo (ej: fiscal_consultoria, backoffice)' },
          base_position: { type: 'string', description: 'Posición base (ej: socio, asociado_sr, director, asistente, etc.)' },
        },
        required: ['action'],
      },
      execute: async (args) => {
        const act = args.action as string;
        const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
        if (act === 'list') {
          let sql = `SELECT cp.*, wa.label AS work_area_label, wa.level AS work_area_level FROM custom_positions cp JOIN work_areas wa ON cp.work_area_id = wa.id`;
          const params: unknown[] = [];
          if (args.work_area_id) { sql += ' WHERE cp.work_area_id = ?'; params.push(args.work_area_id); }
          sql += ' ORDER BY cp.id';
          return JSON.stringify(await db.all(sql, params));
        }
        if (act === 'get') {
          if (!args.id) return JSON.stringify({ error: 'Falta CVE' });
          const pos = await db.get('SELECT cp.*, wa.label AS work_area_label, wa.level AS work_area_level FROM custom_positions cp JOIN work_areas wa ON cp.work_area_id = wa.id WHERE cp.id = ?', [args.id]);
          if (!pos) return JSON.stringify({ error: 'Puesto no encontrado' });
          return JSON.stringify(pos);
        }
        if (act === 'create') {
          if (!args.id || !args.label || !args.work_area_id || !args.base_position) return JSON.stringify({ error: 'Campos obligatorios: id (CVE), label, work_area_id, base_position' });
          const area = await db.get('SELECT id FROM work_areas WHERE id = ?', [args.work_area_id]);
          if (!area) return JSON.stringify({ error: 'Área de trabajo no encontrada' });
          try {
            await db.run('INSERT INTO custom_positions (id, label, work_area_id, base_position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
              [args.id, args.label, args.work_area_id, args.base_position, now, now]);
            return JSON.stringify({ ok: true, msg: `Puesto ${args.id} "${args.label}" creado en área ${args.work_area_id}` });
          } catch (e: any) { if (e.code === 'ER_DUP_ENTRY') return JSON.stringify({ error: 'Ya existe un puesto con ese CVE' }); return JSON.stringify({ error: e.message }); }
        }
        if (act === 'update') {
          if (!args.id) return JSON.stringify({ error: 'Falta CVE del puesto a actualizar' });
          const pos = await db.get('SELECT * FROM custom_positions WHERE id = ?', [args.id]);
          if (!pos) return JSON.stringify({ error: 'Puesto no encontrado' });
          if (args.new_id && args.new_id !== args.id) {
            const userCount = (await db.get('SELECT COUNT(*) c FROM users WHERE custom_position_id = ?', [args.id]) as any).c;
            if (userCount > 0) return JSON.stringify({ error: `No se puede cambiar el CVE: ${userCount} usuario(s) asignado(s). Remueve las asignaciones primero.` });
          }
          const updates: string[] = [];
          const vals: unknown[] = [];
          if (args.new_id && args.new_id !== args.id) { updates.push('id = ?'); vals.push(args.new_id); }
          if (args.label !== undefined) { updates.push('label = ?'); vals.push(args.label); }
          if (args.work_area_id !== undefined) {
            const area = await db.get('SELECT id FROM work_areas WHERE id = ?', [args.work_area_id]);
            if (!area) return JSON.stringify({ error: 'Área de trabajo no encontrada' });
            updates.push('work_area_id = ?'); vals.push(args.work_area_id);
          }
          if (args.base_position !== undefined) { updates.push('base_position = ?'); vals.push(args.base_position); }
          if (updates.length === 0) return JSON.stringify({ error: 'Sin cambios' });
          updates.push('updated_at = ?'); vals.push(now);
          const currentId = args.id as string;
          vals.push(currentId);
          await db.run(`UPDATE custom_positions SET ${updates.join(', ')} WHERE id = ?`, vals);
          if (args.new_id && args.new_id !== args.id) {
            await db.run('UPDATE users SET custom_position_id = ? WHERE custom_position_id = ?', [args.new_id, args.id]);
          }
          return JSON.stringify({ ok: true, msg: 'Puesto actualizado' });
        }
        if (act === 'delete') {
          if (!args.id) return JSON.stringify({ error: 'Falta CVE' });
          const userCount = (await db.get('SELECT COUNT(*) c FROM users WHERE custom_position_id = ?', [args.id]) as any).c;
          if (userCount > 0) return JSON.stringify({ error: `No se puede eliminar: ${userCount} usuario(s) asignado(s). Remueve las asignaciones primero.` });
          await db.run('DELETE FROM custom_positions WHERE id = ?', [args.id]);
          return JSON.stringify({ ok: true, msg: 'Puesto eliminado' });
        }
        return JSON.stringify({ error: 'Acción desconocida' });
      },
    });

    t.push({
      name: 'locations',
      description: `Gestión de ubicaciones físicas (ciudad, oficina, piso, escritorio). Acciones:
- list: listar ubicaciones
- get: obtener ubicación por ID
- create: crear ubicación (campos: id, label, city?, office?, floor?, desk?, sort_order?)
- update: actualizar ubicación (campos: id, label?, city?, office?, floor?, desk?, sort_order?)
- delete: eliminar ubicación (solo si no tiene usuarios asignados)`,
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'get', 'create', 'update', 'delete'] },
          id: { type: 'string', description: 'ID de ubicación (ej: cdmx-oficentro)' },
          label: { type: 'string', description: 'Nombre/etiqueta de la ubicación' },
          city: { type: 'string', description: 'Ciudad' },
          office: { type: 'string', description: 'Oficina' },
          floor: { type: 'string', description: 'Piso' },
          desk: { type: 'string', description: 'Escritorio' },
          sort_order: { type: 'number', description: 'Orden' },
        },
        required: ['action'],
      },
      execute: async (args) => {
        const act = args.action as string;
        const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
        if (act === 'list') {
          return JSON.stringify(await db.all('SELECT l.*, (SELECT COUNT(*) FROM users WHERE location_id = l.id) AS user_count FROM locations l ORDER BY l.sort_order, l.label'));
        }
        if (act === 'get') {
          if (!args.id) return JSON.stringify({ error: 'Falta id' });
          const loc = await db.get('SELECT * FROM locations WHERE id = ?', [args.id]);
          if (!loc) return JSON.stringify({ error: 'Ubicación no encontrada' });
          return JSON.stringify(loc);
        }
        if (act === 'create') {
          if (!args.id || !args.label) return JSON.stringify({ error: 'Campos obligatorios: id, label' });
          try {
            await db.run('INSERT INTO locations (id, label, city, office, floor, desk, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [args.id, args.label, args.city || null, args.office || null, args.floor || null, args.desk || null, args.sort_order || 0, now, now]);
            return JSON.stringify({ ok: true, msg: `Ubicación "${args.label}" creada` });
          } catch (e: any) { if (e.code === 'ER_DUP_ENTRY') return JSON.stringify({ error: 'Ya existe una ubicación con ese ID' }); return JSON.stringify({ error: e.message }); }
        }
        if (act === 'update') {
          if (!args.id) return JSON.stringify({ error: 'Falta id de la ubicación' });
          const loc = await db.get('SELECT * FROM locations WHERE id = ?', [args.id]);
          if (!loc) return JSON.stringify({ error: 'Ubicación no encontrada' });
          const updates: string[] = [];
          const vals: unknown[] = [];
          if (args.label !== undefined) { updates.push('label = ?'); vals.push(args.label); }
          if (args.city !== undefined) { updates.push('city = ?'); vals.push(args.city || null); }
          if (args.office !== undefined) { updates.push('office = ?'); vals.push(args.office || null); }
          if (args.floor !== undefined) { updates.push('floor = ?'); vals.push(args.floor || null); }
          if (args.desk !== undefined) { updates.push('desk = ?'); vals.push(args.desk || null); }
          if (args.sort_order !== undefined) { updates.push('sort_order = ?'); vals.push(args.sort_order); }
          if (updates.length === 0) return JSON.stringify({ error: 'Sin cambios' });
          updates.push('updated_at = ?'); vals.push(now); vals.push(args.id);
          await db.run(`UPDATE locations SET ${updates.join(', ')} WHERE id = ?`, vals);
          return JSON.stringify({ ok: true, msg: 'Ubicación actualizada' });
        }
        if (act === 'delete') {
          if (!args.id) return JSON.stringify({ error: 'Falta id' });
          const userCount = (await db.get('SELECT COUNT(*) c FROM users WHERE location_id = ?', [args.id]) as any).c;
          if (userCount > 0) return JSON.stringify({ error: `No se puede eliminar: ${userCount} usuario(s) asignado(s). Remueve las asignaciones primero.` });
          await db.run('DELETE FROM locations WHERE id = ?', [args.id]);
          return JSON.stringify({ ok: true, msg: 'Ubicación eliminada' });
        }
        return JSON.stringify({ error: 'Acción desconocida' });
      },
    });
  }

  return t;
}

function toFunctions(tools: Tool[]) {
  return tools.map(t => ({ type: 'function' as const, function: { name: t.name, description: t.description, parameters: t.parameters } }));
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────
router.get('/config', async (_req: Request, res: Response) => {
  try {
    let cfg = await db.get('SELECT * FROM copilot_config WHERE id=1') as Record<string, unknown> | undefined;
    if (!cfg) {
      await db.run("INSERT INTO copilot_config (id,model,api_provider,api_base_url,api_key,can_manage_users,can_manage_evaluations,can_manage_vacations,can_manage_announcements,can_manage_periods,can_manage_system,can_view_reports,max_tokens,temperature) VALUES(1,'qwen3.5:397b','ollama',NULL,NULL,1,1,1,1,1,1,1,4096,0.3)");
      cfg = await db.get('SELECT * FROM copilot_config WHERE id=1') as Record<string, unknown>;
    }
    if (cfg?.api_key && typeof cfg.api_key === 'string' && cfg.api_key.length > 8) {
      cfg = { ...cfg, api_key: cfg.api_key.slice(0, 4) + '••••' + cfg.api_key.slice(-4) };
    }
    res.json(cfg);
  } catch (e) { console.error('Config error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/config', async (req: Request, res: Response) => {
  try {
    const fieldMap: Record<string, string> = {
      model: 'model',
      apiProvider: 'api_provider',
      api_provider: 'api_provider',
      apiBaseUrl: 'api_base_url',
      api_base_url: 'api_base_url',
      apiKey: 'api_key',
      api_key: 'api_key',
      canManageUsers: 'can_manage_users',
      canManageEvaluations: 'can_manage_evaluations',
      canManageVacations: 'can_manage_vacations',
      canManageAnnouncements: 'can_manage_announcements',
      canManagePeriods: 'can_manage_periods',
      canManageSystem: 'can_manage_system',
      canViewReports: 'can_view_reports',
      maxTokens: 'max_tokens',
      temperature: 'temperature',
    };
    const booleanFields = new Set(['can_manage_users','can_manage_evaluations','can_manage_vacations','can_manage_announcements','can_manage_periods','can_manage_system','can_view_reports']);
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(req.body)) {
      const col = fieldMap[key] || (key.includes('_') ? key : null);
      if (!col) continue;
      if (col === 'api_key') {
        if (!value || (typeof value === 'string' && value.includes('•'))) continue;
        updates.push('api_key=?');
        values.push(value);
      } else if (booleanFields.has(col)) {
        updates.push(`${col}=?`);
        values.push(value ? 1 : 0);
      } else {
        updates.push(`${col}=?`);
        values.push(value);
      }
    }
    if (updates.length > 0) {
      values.push(1);
      await db.run(`UPDATE copilot_config SET ${updates.join(', ')} WHERE id=?`, values);
    }
    const cfg = await db.get('SELECT * FROM copilot_config WHERE id=1') as Record<string, unknown>;
    if (cfg?.api_key && typeof cfg.api_key === 'string' && cfg.api_key.length > 8) {
      return res.json({ ...cfg, api_key: (cfg.api_key as string).slice(0, 4) + '••••' + (cfg.api_key as string).slice(-4) });
    }
    return res.json(cfg);
  } catch (e) { console.error('Config update error:', e); return res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/config', async (req: Request, res: Response) => {
  try {
    const { model, api_provider, api_base_url, api_key, can_manage_users, can_manage_evaluations, can_manage_vacations, can_manage_announcements, can_manage_periods, can_manage_system, can_view_reports, max_tokens, temperature } = req.body;
    const current = await db.get('SELECT api_key FROM copilot_config WHERE id=1') as any;
    const apiKey = (api_key && !api_key.includes('••••')) ? api_key : current?.api_key;
    await db.run('UPDATE copilot_config SET model=?,api_provider=?,api_base_url=?,api_key=?,can_manage_users=?,can_manage_evaluations=?,can_manage_vacations=?,can_manage_announcements=?,can_manage_periods=?,can_manage_system=?,can_view_reports=?,max_tokens=?,temperature=? WHERE id=1',
      [model || 'qwen3.5:397b', api_provider || 'ollama', api_base_url || null, apiKey, can_manage_users ? 1 : 0, can_manage_evaluations ? 1 : 0, can_manage_vacations ? 1 : 0, can_manage_announcements ? 1 : 0, can_manage_periods ? 1 : 0, can_manage_system ? 1 : 0, can_view_reports ? 1 : 0, max_tokens || 4096, temperature ?? 0.3]);
    const cfg = await db.get('SELECT * FROM copilot_config WHERE id=1') as Record<string, unknown>;
    if (cfg?.api_key && typeof cfg.api_key === 'string' && cfg.api_key.length > 8) {
      return res.json({ ...cfg, api_key: (cfg.api_key as string).slice(0, 4) + '••••' + (cfg.api_key as string).slice(-4) });
    }
    return res.json(cfg);
  } catch (e) { console.error('Config update error:', e); return res.status(500).json({ error: 'Internal server error' }); }
});

// ─── CONVERSATIONS ───────────────────────────────────────────────────────────
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const convs = await db.all('SELECT id, title, created_at, updated_at FROM copilot_conversations WHERE user_id=? ORDER BY updated_at DESC LIMIT 50', [req.user!.id]);
    res.json(convs);
  } catch (e) { console.error('Conversations error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const conv = await db.get('SELECT * FROM copilot_conversations WHERE id=? AND user_id=?', [req.params.id, req.user!.id]);
    if (!conv) return res.status(404).json({ error: 'No encontrada' });
    const messages = await db.all('SELECT id, role, content, created_at FROM copilot_messages WHERE conversation_id=? ORDER BY created_at', [req.params.id]);
    res.json({ ...conv, messages });
  } catch (e) { console.error('Conversation error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const conv = await db.get('SELECT id FROM copilot_conversations WHERE id=? AND user_id=?', [req.params.id, req.user!.id]);
    if (!conv) return res.status(404).json({ error: 'No encontrada' });
    await db.run('DELETE FROM copilot_messages WHERE conversation_id=?', [req.params.id]);
    await db.run('DELETE FROM copilot_conversations WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error('Delete error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/conversations', async (req: Request, res: Response) => {
  try {
    const convs = await db.all('SELECT id FROM copilot_conversations WHERE user_id=?', [req.user!.id]);
    const ids = convs.map((c: any) => c.id);
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      await db.run(`DELETE FROM copilot_messages WHERE conversation_id IN (${placeholders})`, ids);
      await db.run('DELETE FROM copilot_conversations WHERE user_id=?', [req.user!.id]);
    }
    res.json({ ok: true, deleted: ids.length });
  } catch (e) { console.error('Clear all error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

// ─── CHAT ────────────────────────────────────────────────────────────────────
router.post('/chat', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { message, conversationId } = req.body;
    const fullMessage = message || '';
    const fileContent = req.file ? parseFile(req.file.buffer, req.file.originalname) : '';
    const fileName = req.file?.originalname || '';

    if (!fullMessage && !fileContent) return res.status(400).json({ error: 'Mensaje vacío' });

    const cfg = await db.get('SELECT * FROM copilot_config WHERE id=1') as Record<string, unknown>;
    const apiKey = (cfg.api_key as string) || process.env.OLLAMA_API_KEY;
    const baseUrl = (cfg.api_base_url as string) || process.env.OLLAMA_BASE_URL || 'https://ollama.com/v1';
    const endpoint = `${baseUrl}/chat/completions`;

    if (!apiKey) return res.status(403).json({ error: 'API key no configurada. Configúrala en Ajustes del Copiloto.' });

    const headers: Record<string, string> = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

    const userName = (req.user as any)?.name || 'Admin';
    let convId = conversationId as string | undefined;

    if (!convId) {
      convId = uuidv4();
      const title = fullMessage.slice(0, 50) || 'Nueva conversación';
      await db.run('INSERT INTO copilot_conversations (id,user_id,title,created_at,updated_at) VALUES(?,?,?,?,?)', [convId, req.user!.id, title, new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')]);
    }

    await db.run('INSERT INTO copilot_messages (id,conversation_id,role,content,created_at) VALUES(?,?,?,?,?)', [uuidv4(), convId, 'user', fileContent ? `${fullMessage}\n\n[Archivo: ${fileName}]\n${fileContent}` : fullMessage, new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')]);

    const history = (await db.all('SELECT role, content FROM copilot_messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT 50', [convId])).reverse() as Record<string, unknown>[];

    const useTools = needsTools(fullMessage, !!fileContent);
    const messages: Record<string, unknown>[] = [{ role: 'system', content: await buildSystemPrompt(cfg, userName, useTools) }];
    for (const m of history) messages.push({ role: m.role, content: m.content });

    const tools = useTools ? getTools(cfg) : [];
    const fns = toFunctions(tools);
    const maxRounds = useTools ? 10 : 1;
    let finalResponse = '';
    let toolCallsData: string | null = null;
    let toolResultsData: string | null = null;

    const callLLM = async (msgs: Record<string, unknown>[]): Promise<globalThis.Response> => {
      const model = cfg.model || process.env.OLLAMA_MODEL || 'qwen3.5:397b';
      const body = JSON.stringify({
        model, messages: msgs,
        temperature: Number(cfg.temperature) || 0.3,
        max_tokens: Math.min(Number(cfg.max_tokens) || 4096, 8192),
        tools: fns.length > 0 ? fns : undefined,
        tool_choice: fns.length > 0 ? 'auto' : undefined,
      });
      let resp = await fetch(endpoint, { method: 'POST', headers, body });
      for (let retry = 0; retry < 3 && resp.status === 429; retry++) {
        const errBody = await resp.clone().text();
        const waitMatch = errBody.match(/try again in (\d+\.?\d*)s/i);
        const waitSec = waitMatch ? Math.ceil(parseFloat(waitMatch[1])) + 2 : (5 * (retry + 1));
        console.log(`Rate limited, waiting ${waitSec}s (retry ${retry + 1})...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        resp = await fetch(endpoint, { method: 'POST', headers, body });
      }
      return resp;
    };

    for (let round = 0; round < maxRounds; round++) {
      const resp = await callLLM(messages);

      if (!resp.ok) {
        const err = await resp.text();
        console.error('LLM error:', resp.status, err);
        if (resp.status === 429) return res.status(429).json({ error: 'El servicio de IA está temporalmente saturado. Por favor espera un momento e intenta de nuevo.' });
        return res.status(502).json({ error: 'Error del servicio de IA. Intenta de nuevo.' });
      }
      const data = await resp.json() as Record<string, unknown>;
      const msg = (data.choices as Record<string, unknown>[])?.[0]?.message as Record<string, unknown>;
      if (!msg) return res.status(502).json({ error: 'No response from AI' });

      const tcs = msg.tool_calls as any[] | undefined;
      if (!tcs || !tcs.length) { finalResponse = (msg.content as string) || 'No pude generar una respuesta. ¿Puedes repetir?'; break; }

      if (!toolCallsData) toolCallsData = JSON.stringify(tcs);
      messages.push(msg);

      const results: Record<string, unknown>[] = [];
      for (const tc of tcs) {
        let args = tc.function?.arguments;
        if (typeof args === 'string') { try { args = JSON.parse(args); } catch { args = {}; } }
        const tool = tools.find(t => t.name === tc.function?.name);
        if (tool) { try { const r = await tool.execute(coerceArgs((args as Record<string, unknown>) || {}), req.user!.id, cfg); results.push({ tool_call_id: tc.id, role: 'tool', name: tc.function?.name, content: r }); } catch (e) { console.error(`Tool ${tc.function?.name} error:`, e); results.push({ tool_call_id: tc.id, role: 'tool', name: tc.function?.name, content: JSON.stringify({ error: 'Tool execution failed' }) }); } }
      }
      if (!toolResultsData) toolResultsData = JSON.stringify(results);
      for (const r of results) messages.push({ role: 'tool', tool_call_id: r.tool_call_id, content: r.content });

      if (round === maxRounds - 1) {
        messages.push({ role: 'user', content: 'Por favor, dame tu conclusión basada en los resultados obtenidos. No llames más funciones.' });
        const finalResp = await callLLM(messages);
        if (finalResp.ok) {
          const finalData = await finalResp.json() as Record<string, unknown>;
          const finalMsg = (finalData.choices as Record<string, unknown>[])?.[0]?.message as Record<string, unknown>;
          if (finalMsg?.content) finalResponse = finalMsg.content as string;
        }
        if (!finalResponse) finalResponse = 'He completado las acciones solicitadas. ¿Necesitas algo más?';
        break;
      }
    }

    await db.run('INSERT INTO copilot_messages (id,conversation_id,role,content,tool_calls,tool_results,created_at) VALUES(?,?,?,?,?,?,?)', [uuidv4(), convId, 'assistant', finalResponse, toolCallsData, toolResultsData, new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')]);
    await db.run('UPDATE copilot_conversations SET updated_at=? WHERE id=?', [new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), convId]);

    return res.json({ conversationId: convId, message: { id: uuidv4(), role: 'assistant', content: finalResponse } });
  } catch (e) { console.error('Chat error:', e); return res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
