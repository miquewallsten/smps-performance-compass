import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { hashPassword } from '../auth/security.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    cb(null, ['.csv', '.xlsx', '.xls', '.json', '.txt', '.md'].includes(ext));
  }
});
router.use(authMiddleware, requireAdmin);

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

const GROQ = 'https://api.groq.com/openai/v1/chat/completions';

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

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────
async function buildSystemPrompt(cfg: Record<string, unknown>, userName: string, hasTools: boolean): Promise<string> {
  const u = (await db.get('SELECT COUNT(*) c FROM users WHERE is_active=1') as any).c;
  const p = await db.all('SELECT period FROM period_configs ORDER BY period DESC LIMIT 1') as any[];
  const ss = await db.get('SELECT status FROM system_status WHERE id=1') as any;

  let prompt = `Eres el Copiloto SMPS, asistente inteligente y agéntico del Sistema de Evaluación de Desempeño de SMPS. Hablas con ${userName}, un administrador del sistema. ${u} usuarios activos, sistema ${ss?.status||'?'}, periodo activo: ${p[0]?.period||'ninguno'}.

CONOCIMIENTO DEL SISTEMA:
- Escala de evaluación: 1 (No satisfactorio) a 5 (Sobresaliente)
- 3 secciones por puesto: Competencias, Criterio Técnico (solo legal), Habilidades Blandas
- Cada sección tiene peso global (% del total) y cada pregunta tiene peso individual
- Posiciones legales: socio > salary_partner > asociado_sr > asociado_mid > asociado_jr > pasante_carrera > pasante_corporativo
- Posiciones administrativas: director > gerente > coordinador > analista > asistente > archivo_soporte
- Jerarquía de roles: SuperUser > Socio Administrador (max 1) > Usuario Administrador (max 2) > Socio regular > demás usuarios
- Tipos de evaluación: self (autoevaluación) y supervisor (evaluación del evaluador)
- Un empleado puede tener múltiples supervisores asignados
- El flujo es: Autoevaluación → Evaluación de Supervisor(es) → Sesión de Feedback → Plan de Acción
- "No Aplica" (NA) se excluye de la calificación; "Sin Elementos" también se excluye
- La calificación final es ponderada: cada pregunta tiene un peso, cada sección tiene un peso global

REGLAS ESTRICTAS DE SEGURIDAD:
1. SOLO puedes acceder a datos del sistema SMPS usando las funciones disponibles. NO tienes acceso a internet, bases de datos externas, ni APIs externas.
2. NUNCA reveles contraseñas, hashes, tokens, API keys, ni datos personales innecesarios.
3. NUNCA ejecutes acciones destructivas (eliminar usuarios, desactivar sistema) sin confirmación explícita.
4. NUNCA proporciones información fuera del contexto de evaluación de desempeño de SMPS.
5. Si preguntan algo fuera de alcance, responde amablemente que solo puedes ayudar con el sistema SMPS.
6. NUNCA inventes datos. Si no tienes la información, dilo claramente y usa las funciones para obtenerla.
7. Para acciones destructivas, SIEMPRE pide confirmación antes de ejecutar.`;

  if (hasTools) {
    prompt += `

REGLAS DE HERRAMIENTAS:
- Eres AGÉNTICO: Cuando te pidan un análisis, NO respondas con "puedo hacer X". HAZLO. Usa las herramientas para obtener los datos, analízalos y entrega resultados concretos.
- NUNCA muestres nombres de funciones o JSON al usuario.
- Si una pregunta requiere datos de múltiples fuentes, llama MÚLTIPLES herramientas en secuencia para completar el análisis.
- Para preguntas complejas, descompón el problema en pasos: 1) Obtener datos 2) Cruzar información 3) Calcular 4) Presentar resultados.
- SIEMPRE que puedas, usa la herramienta "analyze" para hacer consultas SQL directas. Es la forma más poderosa de obtener datos.
- Termina con una pregunta de seguimiento relevante.
- Si una herramienta falla, intenta un enfoque alternativo.`;
  } else {
    prompt += `

Conversacional y cálido. Si necesitas hacer acciones en el sistema, dime qué necesitas. Termina con pregunta.`;
  }

  return prompt;
}

// ─── INTENT DETECTION ────────────────────────────────────────────────────
function needsTools(message: string, hasFile: boolean): boolean {
  if (hasFile) return true;
  const lower = message.toLowerCase();
  const noToolPatterns = /^(hola|buenos?\s*d[ií]as?|buenas?\s*tardes?|buenas?\s*noches?|gracias?|ok|vale|entiendo|sip|si|no|correcto|perfecto|genial|excelente|c[oó]mo\s+est[aá]s|qu[eé]\s*tal|hey|saludos|bye|adi[oó]s|hasta\s+luego)\s*[!?.]*$/i;
  if (noToolPatterns.test(lower.trim())) return false;
  // Almost everything else likely needs tools in this system
  return true;
}

// ─── TOOLS ──────────────────────────────────────────────────────────────
const UF = 'id,name,email,position,practice_area,is_admin,is_super_user,is_managing_partner,is_active';

function getTools(cfg: Record<string, unknown>): Tool[] {
  const t: Tool[] = [];

  // ─── ANALYZE: Direct SQL queries for deep analysis ─────────────────────
  t.push({
    name: 'analyze',
    description: 'Ejecuta consultas SQL directas en la base de datos del sistema para análisis profundo. Úsalo para cruzar datos, calcular métricas, y resolver preguntas complejas que otras herramientas no pueden. Acciones: query (ejecutar SQL), missing_evals (evaluaciones faltantes), completion_rates (tasas de completitud), score_analysis (análisis de calificaciones), comparison (comparar periodos/posiciones).',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['query', 'missing_evals', 'completion_rates', 'score_analysis', 'comparison'] },
        sql: { type: 'string', description: 'SQL query to execute (SELECT only, no mutations)' },
        period: { type: 'string' },
        position: { type: 'string' },
        user_id: { type: 'string' },
        period_a: { type: 'string', description: 'First period for comparison' },
        period_b: { type: 'string', description: 'Second period for comparison' },
      },
      required: ['action'],
    },
    execute: async (args) => {
      const act = args.action as string;

      if (act === 'query') {
        const sql = (args.sql as string || '').trim();
        // Safety: only allow SELECT statements
        if (!sql.toUpperCase().startsWith('SELECT')) {
          return JSON.stringify({ error: 'Solo se permiten consultas SELECT' });
        }
        // Block dangerous patterns
        if (/DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE|GRANT/i.test(sql)) {
          return JSON.stringify({ error: 'Operación no permitida' });
        }
        try {
          const rows = await db.all(sql, []);
          // Limit results
          const limited = Array.isArray(rows) ? rows.slice(0, 100) : rows;
          return JSON.stringify({ rows: limited, count: Array.isArray(rows) ? rows.length : 1 });
        } catch (e: any) {
          return JSON.stringify({ error: `SQL error: ${e.message}` });
        }
      }

      if (act === 'missing_evals') {
        const period = args.period as string;
        if (!period) return JSON.stringify({ error: 'Se requiere period' });
        // Find supervisors who haven't completed evaluations for their assigned employees
        const assigned = await db.all(
          `SELECT sa.employee_id, sa.supervisor_id, eu.name as employee_name, su.name as supervisor_name, eu.position as employee_position
           FROM supervisor_assignments sa
           JOIN users eu ON sa.employee_id = eu.id
           JOIN users su ON sa.supervisor_id = su.id
           WHERE sa.period = ? AND eu.is_active = 1`,
          [period]
        );
        const completed = await db.all(
          `SELECT evaluator_id, evaluated_id FROM evaluations WHERE period = ? AND type = 'supervisor'`,
          [period]
        );
        const completedSet = new Set(completed.map((c: any) => `${c.evaluator_id}_${c.evaluated_id}`));
        const missing = assigned.filter((a: any) => !completedSet.has(`${a.supervisor_id}_${a.employee_id}`));
        // Also check self-evaluations
        const selfCompleted = await db.all(
          `SELECT evaluated_id FROM evaluations WHERE period = ? AND type = 'self'`,
          [period]
        );
        const selfSet = new Set(selfCompleted.map((c: any) => c.evaluated_id));
        const missingSelf = assigned
          .map((a: any) => a.employee_id)
          .filter((id, i, arr) => arr.indexOf(id) === i)
          .map((id: string) => {
            const a = assigned.find((a: any) => a.employee_id === id);
            return { employee_id: id, employee_name: (a as any).employee_name, employee_position: (a as any).employee_position };
          })
          .filter((e: any) => !selfSet.has(e.employee_id));
        return JSON.stringify({
          period,
          supervisor_evals_missing: missing.length,
          supervisor_evals_missing_details: missing.slice(0, 30),
          self_evals_missing: missingSelf.length,
          self_evals_missing_details: missingSelf.slice(0, 30),
          total_assignments: assigned.length,
          total_supervisor_completed: completed.length,
        });
      }

      if (act === 'completion_rates') {
        const period = args.period as string;
        if (!period) return JSON.stringify({ error: 'Se requiere period' });
        const assignments = await db.all('SELECT * FROM supervisor_assignments WHERE period = ?', [period]);
        const uniqueEmployees = [...new Set(assignments.map((a: any) => a.employee_id))];
        const selfEvals = await db.all("SELECT evaluated_id FROM evaluations WHERE period = ? AND type = 'self'", [period]);
        const supEvals = await db.all("SELECT evaluator_id, evaluated_id FROM evaluations WHERE period = ? AND type = 'supervisor'", [period]);
        const selfDone = new Set(selfEvals.map((e: any) => e.evaluated_id));
        const supDone = new Set(supEvals.map((e: any) => `${e.evaluator_id}_${e.evaluated_id}`));
        const totalExpectedSup = assignments.length;
        const completedSup = assignments.filter((a: any) => supDone.has(`${a.supervisor_id}_${a.employee_id}`)).length;
        const completedSelf = uniqueEmployees.filter((id: string) => selfDone.has(id)).length;
        const feedbackDone = await db.all("SELECT evaluated_id FROM evaluations WHERE period = ? AND feedback_completed = 1", [period]);
        const feedbackSet = new Set(feedbackDone.map((f: any) => f.evaluated_id));
        return JSON.stringify({
          period,
          self_eval: { completed: completedSelf, total: uniqueEmployees.length, rate: uniqueEmployees.length ? Math.round((completedSelf / uniqueEmployees.length) * 100) : 0 },
          supervisor_eval: { completed: completedSup, total: totalExpectedSup, rate: totalExpectedSup ? Math.round((completedSup / totalExpectedSup) * 100) : 0 },
          feedback: { completed: feedbackSet.size, total: uniqueEmployees.length, rate: uniqueEmployees.length ? Math.round((feedbackSet.size / uniqueEmployees.length) * 100) : 0 },
          overall_progress: uniqueEmployees.length ? Math.round(((completedSelf + completedSup + feedbackSet.size) / (uniqueEmployees.length + totalExpectedSup + uniqueEmployees.length)) * 100) : 0,
        });
      }

      if (act === 'score_analysis') {
        const period = args.period as string;
        if (!period) return JSON.stringify({ error: 'Se requiere period' });
        const evals = await db.all(
          `SELECT e.*, u.name as evaluated_name, u.position as evaluated_position
           FROM evaluations e JOIN users u ON e.evaluated_id = u.id
           WHERE e.period = ?`,
          [period]
        );
        if (evals.length === 0) return JSON.stringify({ period, message: 'Sin evaluaciones para este periodo' });
        const byPosition: Record<string, { scores: number[]; count: number; names: string[] }> = {};
        for (const e of evals) {
          const pos = (e as any).evaluated_position;
          if (!byPosition[pos]) byPosition[pos] = { scores: [], count: 0, names: [] };
          byPosition[pos].scores.push((e as any).total_score);
          byPosition[pos].count++;
          byPosition[pos].names.push((e as any).evaluated_name);
        }
        const summary = Object.entries(byPosition).map(([pos, d]) => ({
          position: pos,
          count: d.count,
          avg: Math.round((d.scores.reduce((a: number, b: number) => a + b, 0) / d.scores.length) * 10) / 10,
          min: Math.min(...d.scores),
          max: Math.max(...d.scores),
          names: d.names,
        }));
        const allScores = evals.map((e: any) => e.total_score);
        return JSON.stringify({
          period,
          total_evaluations: evals.length,
          overall_avg: Math.round((allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length) * 10) / 10,
          overall_min: Math.min(...allScores),
          overall_max: Math.max(...allScores),
          by_position: summary.sort((a, b) => b.avg - a.avg),
          top_performers: evals.sort((a: any, b: any) => b.total_score - a.total_score).slice(0, 5).map((e: any) => ({ name: e.evaluated_name, position: e.evaluated_position, score: e.total_score, type: e.type })),
          needs_attention: evals.sort((a: any, b: any) => a.total_score - b.total_score).slice(0, 5).map((e: any) => ({ name: e.evaluated_name, position: e.evaluated_position, score: e.total_score, type: e.type })),
        });
      }

      if (act === 'comparison') {
        const pa = args.period_a as string;
        const pb = args.period_b as string;
        if (!pa || !pb) return JSON.stringify({ error: 'Se requieren period_a y period_b' });
        const [evalsA, evalsB] = await Promise.all([
          db.all('SELECT evaluated_id, total_score, type FROM evaluations WHERE period = ?', [pa]),
          db.all('SELECT evaluated_id, total_score, type FROM evaluations WHERE period = ?', [pb]),
        ]);
        const avgA = evalsA.length ? Math.round((evalsA.reduce((s: number, e: any) => s + e.total_score, 0) / evalsA.length) * 10) / 10 : 0;
        const avgB = evalsB.length ? Math.round((evalsB.reduce((s: number, e: any) => s + e.total_score, 0) / evalsB.length) * 10) / 10 : 0;
        // Per-user comparison for users present in both periods
        const mapA = new Map(evalsA.map((e: any) => [e.evaluated_id, e]));
        const mapB = new Map(evalsB.map((e: any) => [e.evaluated_id, e]));
        const commonUsers: string[] = [];
        for (const id of mapA.keys()) { if (mapB.has(id)) commonUsers.push(id); }
        const users = await db.all(`SELECT id, name, position FROM users WHERE id IN (${commonUsers.map(() => '?').join(',')})`, commonUsers);
        const userMap = new Map(users.map((u: any) => [u.id, u]));
        const changes = commonUsers.map(id => {
          const a = mapA.get(id) as any;
          const b = mapB.get(id) as any;
          const u = userMap.get(id) as any;
          return { name: u?.name, position: u?.position, period_a_score: a.total_score, period_b_score: b.total_score, change: Math.round((b.total_score - a.total_score) * 10) / 10 };
        }).sort((a, b) => b.change - a.change);
        return JSON.stringify({
          period_a: pa, period_b: pb,
          period_a_avg: avgA, period_a_count: evalsA.length,
          period_b_avg: avgB, period_b_count: evalsB.length,
          overall_change: Math.round((avgB - avgA) * 10) / 10,
          improved: changes.filter(c => c.change > 0),
          declined: changes.filter(c => c.change < 0),
          stable: changes.filter(c => c.change === 0),
        });
      }

      return JSON.stringify({ error: 'Acción desconocida' });
    },
  });

  if (cfg.can_manage_users) {
    t.push({
      name: 'users',
      description: 'Gestión de usuarios. Acciones: list,search,get,create,batch_create,update_role,deactivate,activate,assign_supervisor.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list','search','get','create','batch_create','update_role','deactivate','activate','assign_supervisor'] },
          id: { type: 'string' }, q: { type: 'string' }, role: { type: 'string' }, active: { type: 'string', description: 'true or false' },
          name: { type: 'string' }, email: { type: 'string' }, position: { type: 'string' },
          password: { type: 'string' }, practice_area: { type: 'string' },
          is_admin: { type: 'string', description: 'true or false' }, is_super_user: { type: 'string', description: 'true or false' }, is_managing_partner: { type: 'string', description: 'true or false' },
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
        if (act === 'search') return JSON.stringify(await db.all('SELECT id,name,email,position,is_admin,is_managing_partner,is_active FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 20', [`%${args.q}%`, `%${args.q}%`]));
        if (act === 'get') { const u = await db.get(`SELECT ${UF} FROM users WHERE id=?`, [args.id]); return u ? JSON.stringify(u) : JSON.stringify({ error: 'No encontrado' }); }
        if (act === 'create') {
          if (!args.name || !args.email || !args.position || !args.password) return JSON.stringify({ error: 'Campos obligatorios: name, email, position, password' });
          if ((args.password as string).length < 6) return JSON.stringify({ error: 'Contraseña min 6' });
          const ex = await db.get('SELECT id FROM users WHERE email=?', [args.email]);
          if (ex) return JSON.stringify({ error: 'Email ya existe' });
          const isAdmin = typeof args.is_admin === 'string' ? (args.is_admin === 'true' || args.is_admin === '1') : !!args.is_admin;
          const isMP = typeof args.is_managing_partner === 'string' ? (args.is_managing_partner === 'true' || args.is_managing_partner === '1') : !!args.is_managing_partner;
          // Enforce role limits
          if (isMP) { const currentMPs = await db.all('SELECT id, name FROM users WHERE is_managing_partner = 1 AND is_super_user = 0'); if (currentMPs.length >= 1) return JSON.stringify({ error: `Solo puede haber 1 Socio Administrador. Actualmente es ${currentMPs[0].name}` }); }
          if (isAdmin && !isMP) { const currentAdmins = await db.all('SELECT id FROM users WHERE is_admin = 1 AND is_super_user = 0'); if (currentAdmins.length >= 2) return JSON.stringify({ error: 'Máximo 2 Usuario Administrador permitidos' }); }
          const id = uuidv4(), hp = await hashPassword(args.password as string), now = new Date().toISOString();
          await db.run('INSERT INTO users (id,email,password_hash,security_question,security_answer,name,position,practice_area,is_admin,is_super_user,is_managing_partner,is_active,must_change_password,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [id, args.email, hp, '¿Email?', args.email, args.name, args.position, (args.practice_area as string) || null, isAdmin ? 1 : 0, 0, isMP ? 1 : 0, 1, 1, now, now]);
          return JSON.stringify({ ok: true, msg: `"${args.name}" creado`, id });
        }
        if (act === 'batch_create') {
          const us = args.users as Record<string, unknown>[];
          const r: Record<string, unknown>[] = [];
          for (const u of us) {
            if (!u.name || !u.email || !u.position || !u.password) { r.push({ email: u.email, error: 'Faltan campos' }); continue; }
            const ex = await db.get('SELECT id FROM users WHERE email=?', [u.email]);
            if (ex) { r.push({ email: u.email, error: 'Ya existe' }); continue; }
            const id = uuidv4(), hp = await hashPassword(u.password as string), now = new Date().toISOString();
            await db.run('INSERT INTO users (id,email,password_hash,security_question,security_answer,name,position,practice_area,is_admin,is_super_user,is_managing_partner,is_active,must_change_password,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
              [id, u.email, hp, '¿Email?', u.email, u.name, u.position, (u.practice_area as string) || null, 0, 0, 0, 1, 1, now, now]);
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
            if (newMP) { updates.push('is_admin=?'); vals.push(1); } // MP must be admin
          }
          if (args.is_admin !== undefined) {
            const newAdmin = args.is_admin === 'true' || args.is_admin === '1';
            if (newAdmin && !(user as any).is_managing_partner) { const currentAdmins = await db.all('SELECT id FROM users WHERE is_admin = 1 AND is_super_user = 0 AND id != ?', [args.id]); if (currentAdmins.length >= 2) return JSON.stringify({ error: 'Máximo 2 Usuario Administrador' }); }
            if (!newAdmin && (user as any).is_managing_partner) return JSON.stringify({ error: 'No se puede quitar admin al Socio Administrador' });
            updates.push('is_admin=?'); vals.push(newAdmin ? 1 : 0);
          }
          if (updates.length === 0) return JSON.stringify({ error: 'Sin cambios' });
          vals.push(new Date().toISOString(), args.id);
          await db.run(`UPDATE users SET ${updates.join(', ')}, updated_at=? WHERE id=?`, vals);
          return JSON.stringify({ ok: true, msg: 'Rol actualizado' });
        }
        if (act === 'deactivate') { await db.run('UPDATE users SET is_active=0, updated_at=? WHERE id=?', [new Date().toISOString(), args.id]); return JSON.stringify({ ok: true, msg: 'Usuario desactivado' }); }
        if (act === 'activate') { await db.run('UPDATE users SET is_active=1, updated_at=? WHERE id=?', [new Date().toISOString(), args.id]); return JSON.stringify({ ok: true, msg: 'Usuario activado' }); }
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
      description: 'Evaluaciones. Acciones: list,get,periods,stats,questions,create_question,batch_questions,update_question,delete_question,list_library,supervisor_assignments.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list','get','periods','stats','questions','create_question','batch_questions','update_question','delete_question','list_library','supervisor_assignments'] },
          period: { type: 'string' }, id: { type: 'string' }, evaluated_id: { type: 'string' }, position: { type: 'string' },
          category: { type: 'string' }, text: { type: 'string' }, weight: { type: 'string' },
          question_id: { type: 'string' }, hidden: { type: 'string', description: 'true or false' },
          questions: { type: 'array', items: { type: 'object' } },
        },
        required: ['action'],
      },
      execute: async (args, uid) => {
        const act = args.action as string;
        if (act === 'list') {
          let s = 'SELECT e.id, e.evaluator_id, e.evaluated_id, e.period, e.type, e.total_score, e.comments, e.feedback_completed, u1.name as evaluator_name, u2.name as evaluated_name FROM evaluations e JOIN users u1 ON e.evaluator_id=u1.id JOIN users u2 ON e.evaluated_id=u2.id WHERE 1=1';
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
        if (act === 'periods') return JSON.stringify(await db.all('SELECT * FROM period_configs ORDER BY period DESC'));
        if (act === 'stats') {
          if (!args.evaluated_id) return JSON.stringify({ error: 'Falta evaluated_id' });
          const user = await db.get('SELECT name,position FROM users WHERE id=?', [args.evaluated_id]);
          if (!user) return JSON.stringify({ error: 'No encontrado' });
          const allR = await db.all('SELECT er.* FROM evaluation_responses er JOIN evaluations e ON er.evaluation_id=e.id WHERE e.evaluated_id=?', [args.evaluated_id]) as any[];
          const cats: Record<string, { total: number; count: number }> = {};
          for (const r of allR) { const c = r.category || 'Sin categoría'; if (!cats[c]) cats[c] = { total: 0, count: 0 }; if (r.score && !r.not_applicable) { cats[c].total += r.score; cats[c].count++; } }
          const catScores = Object.entries(cats).map(([c, d]) => ({ category: c, avg: d.count ? Math.round((d.total / d.count) * 10) / 10 : 0, count: d.count })).sort((a, b) => a.avg - b.avg);
          const applicable = allR.filter(r => !r.not_applicable);
          const overallAvg = applicable.length ? Math.round((applicable.reduce((s, r) => s + r.score, 0) / applicable.length) * 10) / 10 : 0;
          return JSON.stringify({ user, overallAvg, categoryScores: catScores, weakest: catScores.slice(0, 3), strongest: catScores.slice(-3).reverse() });
        }
        if (act === 'questions') return JSON.stringify(await db.all('SELECT question_id,category,text,weight,section FROM custom_eval_questions WHERE position=?', [args.position]));
        if (act === 'create_question') { const id = uuidv4(), qid = `q_${Date.now()}`; await db.run('INSERT INTO library_questions (id,question_id,category,text,default_weight,created_at,created_by) VALUES(?,?,?,?,?,?,?)', [id, qid, args.category, args.text, args.weight, new Date().toISOString(), uid]); return JSON.stringify({ ok: true, qid }); }
        if (act === 'batch_questions') { const qs = args.questions as Record<string, unknown>[]; const r: Record<string, unknown>[] = []; for (const q of qs) { if (!q.category || !q.text || !q.weight) { r.push({ text: q.text, error: 'Faltan campos' }); continue; } try { const id = uuidv4(), qid = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; await db.run('INSERT INTO library_questions (id,question_id,category,text,default_weight,created_at,created_by) VALUES(?,?,?,?,?,?,?)', [id, qid, q.category, q.text, q.weight, new Date().toISOString(), uid]); r.push({ qid, ok: true }); } catch (e) { r.push({ text: q.text, error: String(e) }); } } return JSON.stringify({ msg: `${r.filter(x => x.ok).length}/${qs.length} creadas`, results: r }); }
        if (act === 'update_question') { if (!args.question_id) return JSON.stringify({ error: 'Falta question_id' }); const existing = await db.get('SELECT * FROM library_questions WHERE question_id=?', [args.question_id]); if (existing) { const updates = []; const vals = []; if (args.text) { updates.push('text=?'); vals.push(args.text); } if (args.category) { updates.push('category=?'); vals.push(args.category); } if (args.weight) { updates.push('default_weight=?'); vals.push(parseFloat(args.weight as string) || (existing as any).default_weight); } if (updates.length > 0) { vals.push(args.question_id); await db.run('UPDATE library_questions SET ' + updates.join(', ') + ' WHERE question_id=?', vals); } return JSON.stringify({ ok: true, msg: 'Pregunta actualizada' }); } const ov = await db.get('SELECT * FROM seed_question_overrides WHERE question_id=?', [args.question_id]); if (ov) { const updates = []; const vals = []; if (args.text) { updates.push('text=?'); vals.push(args.text); } if (args.category) { updates.push('category=?'); vals.push(args.category); } if (args.weight) { updates.push('weight=?'); vals.push(parseFloat(args.weight as string)); } if (args.hidden !== undefined) { updates.push('hidden=?'); vals.push(args.hidden === 'true' ? 1 : 0); } if (updates.length > 0) { vals.push(args.question_id); await db.run('UPDATE seed_question_overrides SET ' + updates.join(', ') + ' WHERE question_id=?', vals); } return JSON.stringify({ ok: true, msg: 'Override actualizada' }); } return JSON.stringify({ error: 'Pregunta no encontrada' }); }
        if (act === 'delete_question') { if (!args.question_id) return JSON.stringify({ error: 'Falta question_id' }); const lib = await db.get('SELECT * FROM library_questions WHERE question_id=?', [args.question_id]); if (lib) { await db.run('DELETE FROM library_questions WHERE question_id=?', [args.question_id]); return JSON.stringify({ ok: true, msg: 'Pregunta de biblioteca eliminada' }); } const ov = await db.get('SELECT * FROM seed_question_overrides WHERE question_id=?', [args.question_id]); if (ov) { await db.run('UPDATE seed_question_overrides SET hidden=1 WHERE question_id=?', [args.question_id]); return JSON.stringify({ ok: true, msg: 'Pregunta base ocultada' }); } return JSON.stringify({ error: 'Pregunta no encontrada' }); }
        if (act === 'list_library') return JSON.stringify(await db.all('SELECT question_id, category, text, default_weight FROM library_questions ORDER BY category, text'));
        if (act === 'supervisor_assignments') return JSON.stringify(await db.all('SELECT sa.*,eu.name as employee_name,su.name as supervisor_name FROM supervisor_assignments sa JOIN users eu ON sa.employee_id=eu.id JOIN users su ON sa.supervisor_id=su.id WHERE sa.period=?', [args.period]));
        return JSON.stringify({ error: 'Acción desconocida' });
      },
    });
  }

  if (cfg.can_manage_vacations) {
    t.push({
      name: 'vacations', description: 'Vacaciones. Acciones: list,approve_reject.',
      parameters: { type: 'object', properties: { action: { type: 'string', enum: ['list','approve_reject'] }, status: { type: 'string' }, id: { type: 'string' }, decision: { type: 'string', enum: ['approve','reject'] } }, required: ['action'] },
      execute: async (args, uid) => {
        const act = args.action as string;
        if (act === 'list') { let s = "SELECT vr.*,u.name as employee_name FROM vacation_requests vr JOIN users u ON vr.user_id=u.id WHERE 1=1"; const p: unknown[] = []; if (args.status) { s += ' AND vr.status=?'; p.push(args.status); } return JSON.stringify(await db.all(s, p)); }
        if (act === 'approve_reject') { if (!args.id || !args.decision) return JSON.stringify({ error: 'Falta id o decisión' }); const vr = await db.get('SELECT * FROM vacation_requests WHERE id=?', [args.id]) as any; if (!vr) return JSON.stringify({ error: 'No encontrada' }); if (vr.status !== 'pending') return JSON.stringify({ error: `Ya ${vr.status}` }); const status = args.decision === 'approve' ? 'approved' : 'rejected'; await db.run('UPDATE vacation_requests SET status=?,processed_by=?,processed_at=? WHERE id=?', [status, uid, new Date().toISOString(), args.id]); return JSON.stringify({ ok: true, msg: status }); }
        return JSON.stringify({ error: 'Acción desconocida' });
      },
    });
  }

  if (cfg.can_manage_announcements) {
    t.push({
      name: 'announcements', description: 'Anuncios. Acciones: list,create.',
      parameters: { type: 'object', properties: { action: { type: 'string', enum: ['list','create'] }, title: { type: 'string' }, body: { type: 'string' }, audience: { type: 'string', enum: ['all','legal','administrativo'] }, expires_at: { type: 'string' } }, required: ['action'] },
      execute: async (args, uid) => {
        const act = args.action as string;
        if (act === 'list') return JSON.stringify(await db.all('SELECT * FROM announcements WHERE archived=0 OR archived IS NULL ORDER BY created_at DESC LIMIT 20'));
        if (act === 'create') { if (!args.title || !args.body || !args.audience) return JSON.stringify({ error: 'Faltan campos' }); const id = uuidv4(), now = new Date().toISOString(); await db.run('INSERT INTO announcements (id,author_id,title,body,audience,created_at,expires_at,archived) VALUES(?,?,?,?,?,?,?,0)', [id, uid, args.title, args.body, args.audience, now, (args.expires_at as string) || null]); return JSON.stringify({ ok: true, msg: 'Anuncio creado', id }); }
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
        if (act === 'toggle_system') { if (!['active','inactive'].includes(args.status as string)) return JSON.stringify({ error: 'Inválido' }); await db.run('UPDATE system_status SET status=? WHERE id=1', [args.status]); await db.run('INSERT INTO activation_history (id,action,date,by_user_id) VALUES(?,?,?,?)', [uuidv4(), args.status === 'active' ? 'activated' : 'deactivated', new Date().toISOString(), uid]); return JSON.stringify({ ok: true, msg: `Sistema ${args.status}` }); }
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
      await db.run("INSERT INTO copilot_config (id,model,api_provider,api_key,can_manage_users,can_manage_evaluations,can_manage_vacations,can_manage_announcements,can_manage_periods,can_manage_system,can_view_reports,max_tokens,temperature) VALUES(1,'llama-3.3-70b-versatile','groq',NULL,1,1,1,1,1,1,1,4096,0.3)");
      cfg = await db.get('SELECT * FROM copilot_config WHERE id=1') as Record<string, unknown>;
    }
    // Mask API key
    if (cfg?.api_key && typeof cfg.api_key === 'string' && cfg.api_key.length > 8) {
      cfg = { ...cfg, api_key: cfg.api_key.slice(0, 4) + '••••' + cfg.api_key.slice(-4) };
    }
    return res.json(cfg);
  } catch (err) { console.error('Config error:', err); return res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/config', async (req: Request, res: Response) => {
  try {
    const allowed = ['model','apiProvider','canManageUsers','canManageEvaluations','canManageVacations','canManageAnnouncements','canManagePeriods','canManageSystem','canViewReports','maxTokens','temperature','apiKey'];
    const updates: string[] = [];
    const values: unknown[] = [];
    for (const [k, v] of Object.entries(req.body)) {
      const snakeKey = k.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
      if (!allowed.includes(k) && !allowed.includes(snakeKey)) continue;
      const col = snakeKey;
      if (k === 'apiKey' || snakeKey === 'api_key') { if (v && typeof v === 'string' && v.includes('•')) continue; updates.push('api_key=?'); values.push(v); }
      else if (typeof v === 'boolean') { updates.push(`${col}=?`); values.push(v ? 1 : 0); }
      else { updates.push(`${col}=?`); values.push(v); }
    }
    if (updates.length > 0) { values.push(1); await db.run(`UPDATE copilot_config SET ${updates.join(', ')} WHERE id=?`, values); }
    const cfg = await db.get('SELECT * FROM copilot_config WHERE id=1') as Record<string, unknown>;
    if (cfg?.api_key && typeof cfg.api_key === 'string' && cfg.api_key.length > 8) {
      return res.json({ ...cfg, api_key: (cfg.api_key as string).slice(0, 4) + '••••' + (cfg.api_key as string).slice(-4) });
    }
    return res.json(cfg);
  } catch (err) { console.error('Update config error:', err); return res.status(500).json({ error: 'Internal server error' }); }
});

// ─── CONVERSATIONS ───────────────────────────────────────────────────────────
router.get('/conversations', async (req: Request, res: Response) => { try { return res.json(await db.all('SELECT * FROM copilot_conversations WHERE user_id=? ORDER BY updated_at DESC', [req.user!.id])); } catch (e) { return res.status(500).json({ error: 'Internal server error' }); } });
router.post('/conversations', async (req: Request, res: Response) => { try { const id = uuidv4(), now = new Date().toISOString(); await db.run('INSERT INTO copilot_conversations (id,user_id,title,created_at,updated_at) VALUES(?,?,?,?,?)', [id, req.user!.id, (req.body.title as string) || 'Nueva conversación', now, now]); return res.status(201).json(await db.get('SELECT * FROM copilot_conversations WHERE id=?', [id])); } catch (e) { return res.status(500).json({ error: 'Internal server error' }); } });
router.get('/conversations/:id', async (req: Request, res: Response) => { try { const c = await db.get('SELECT * FROM copilot_conversations WHERE id=? AND user_id=?', [req.params.id, req.user!.id]); if (!c) return res.status(404).json({ error: 'Not found' }); return res.json({ ...(c as any), messages: await db.all('SELECT * FROM copilot_messages WHERE conversation_id=? ORDER BY created_at ASC', [req.params.id]) }); } catch (e) { return res.status(500).json({ error: 'Internal server error' }); } });
router.delete('/conversations/:id', async (req: Request, res: Response) => { try { await db.run('DELETE FROM copilot_messages WHERE conversation_id=?', [req.params.id]); await db.run('DELETE FROM copilot_conversations WHERE id=? AND user_id=?', [req.params.id, req.user!.id]); return res.json({ msg: 'Deleted' }); } catch (e) { return res.status(500).json({ error: 'Internal server error' }); } });

// ─── CHAT ─────────────────────────────────────────────────────────────────────
router.post('/chat', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const cfg = await db.get('SELECT * FROM copilot_config WHERE id=1') as Record<string, unknown>;
    const apiKey = (cfg?.api_key as string) || process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'No API key configured. Add your Groq API key in Copilot Settings.' });

    let convId = req.body.conversationId as string;
    let fileContent = '';
    if (req.file) { fileContent = parseFile(req.file.buffer, req.file.originalname); }
    const fullMessage = fileContent ? `${req.body.message}\n\n[Archivo: ${req.file.originalname}]\n${fileContent}` : req.body.message;
    const currentUser = await db.get('SELECT name FROM users WHERE id=?', [req.user!.id]) as any;
    const userName = currentUser?.name || 'Admin';

    if (!convId) {
      convId = uuidv4();
      const now = new Date().toISOString();
      await db.run('INSERT INTO copilot_conversations (id,user_id,title,created_at,updated_at) VALUES(?,?,?,?,?)', [convId, req.user!.id, fullMessage.slice(0, 60).replace(/\n/g, ' '), now, now]);
    } else {
      const c = await db.get('SELECT id FROM copilot_conversations WHERE id=? AND user_id=?', [convId, req.user!.id]);
      if (!c) return res.status(404).json({ error: 'Not found' });
    }

    await db.run('INSERT INTO copilot_messages (id,conversation_id,role,content,created_at) VALUES(?,?,?,?,?)', [uuidv4(), convId, 'user', fullMessage, new Date().toISOString()]);

    const history = (await db.all('SELECT role,content FROM copilot_messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT 20', [convId])).reverse() as Record<string, unknown>[];

    const useTools = needsTools(fullMessage, !!fileContent);
    const messages: Record<string, unknown>[] = [{ role: 'system', content: await buildSystemPrompt(cfg, userName, useTools) }];
    for (const m of history) messages.push({ role: m.role, content: m.content });

    const tools = useTools ? getTools(cfg) : [];
    const fns = toFunctions(tools);
    const maxRounds = useTools ? 6 : 1;
    let finalResponse = '';
    let toolCallsData: string | null = null;
    let toolResultsData: string | null = null;

    const callLLM = async (msgs: Record<string, unknown>[]): Promise<globalThis.Response> => {
      const model = cfg.model || 'llama-3.3-70b-versatile';
      const body = JSON.stringify({
        model, messages: msgs,
        temperature: Number(cfg.temperature) || 0.3,
        max_tokens: Math.min(Number(cfg.max_tokens) || 4096, 8192),
        tools: fns.length > 0 ? fns : undefined,
        tool_choice: fns.length > 0 ? 'auto' : undefined,
      });
      let resp = await fetch(GROQ, { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body });
      for (let retry = 0; retry < 3 && resp.status === 429; retry++) {
        const errBody = await resp.clone().text();
        const waitMatch = errBody.match(/try again in (\d+\.?\d*)s/i);
        const waitSec = waitMatch ? Math.ceil(parseFloat(waitMatch[1])) + 2 : (5 * (retry + 1));
        console.log(`Rate limited, waiting ${waitSec}s (retry ${retry + 1})...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        resp = await fetch(GROQ, { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body });
      }
      return resp;
    };

    for (let round = 0; round < maxRounds; round++) {
      const resp = await callLLM(messages);

      if (!resp.ok) {
        const err = await resp.text();
        console.error('Groq error:', resp.status, err);
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
        // Force a final text response instead of another tool call
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

    await db.run('INSERT INTO copilot_messages (id,conversation_id,role,content,tool_calls,tool_results,created_at) VALUES(?,?,?,?,?,?,?)', [uuidv4(), convId, 'assistant', finalResponse, toolCallsData, toolResultsData, new Date().toISOString()]);
    await db.run('UPDATE copilot_conversations SET updated_at=? WHERE id=?', [new Date().toISOString(), convId]);

    return res.json({ conversationId: convId, message: { id: uuidv4(), role: 'assistant', content: finalResponse } });
  } catch (e) { console.error('Chat error:', e); return res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
