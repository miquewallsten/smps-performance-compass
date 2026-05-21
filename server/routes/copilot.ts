import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import * as XLSX from 'xlsx';
import db from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { hashPassword } from '../auth/security.js';

const router = Router();

// Multer for file uploads (up to 10MB, CSV/Excel/JSON/TXT)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json', 'text/plain', 'text/markdown',
    ];
    const exts = ['.csv', '.xlsx', '.xls', '.json', '.txt', '.md'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (allowed.includes(file.mimetype) || exts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported. Use CSV, Excel, JSON, TXT, or Markdown.'));
    }
  },
});

// All copilot routes require admin or super_user
router.use(authMiddleware, requireAdmin);

// ─── Helper: Parse uploaded file ──────────────────────────────────────────────
function parseFile(buffer: Buffer, filename: string): string {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  try {
    if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheets: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        sheets.push(`=== Sheet: ${sheetName} (${rows.length} rows) ===\n${JSON.stringify(rows.slice(0, 200), null, 2)}`);
      }
      return sheets.join('\n\n');
    }
    if (ext === '.json') {
      const data = JSON.parse(buffer.toString('utf-8'));
      return JSON.stringify(data, null, 2);
    }
    // .txt, .md
    return buffer.toString('utf-8');
  } catch (err) {
    return `[Error parsing file: ${err instanceof Error ? err.message : String(err)}]`;
  }
}

// ─── GET /api/copilot/config ────────────────────────────────────────────────
router.get('/config', (_req: Request, res: Response) => {
  try {
    let config = db.prepare('SELECT * FROM copilot_config WHERE id = 1').get() as Record<string, unknown> | undefined;
    if (!config) {
      db.prepare(`
        INSERT INTO copilot_config (id, model, api_provider, can_manage_users, can_manage_evaluations, can_manage_vacations, can_manage_announcements, can_manage_periods, can_manage_system, can_view_reports, max_tokens, temperature)
        VALUES (1, 'llama-3.3-70b-versatile', 'groq', 1, 1, 1, 1, 1, 0, 1, 4096, 0.3)
      `).run();
      config = db.prepare('SELECT * FROM copilot_config WHERE id = 1').get() as Record<string, unknown>;
    }
    return res.json(config);
  } catch (err) {
    console.error('Get copilot config error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/copilot/config ──────────────────────────────────────────────
router.patch('/config', (req: Request, res: Response) => {
  try {
    const allowedFields = [
      'model', 'apiProvider', 'canManageUsers', 'canManageEvaluations',
      'canManageVacations', 'canManageAnnouncements', 'canManagePeriods',
      'canManageSystem', 'canViewReports', 'maxTokens', 'temperature'
    ];
    const updates: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(req.body)) {
      if (!allowedFields.includes(key)) continue;
      const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (typeof value === 'boolean') { updates.push(`${dbKey} = ?`); values.push(value ? 1 : 0); }
      else { updates.push(`${dbKey} = ?`); values.push(value); }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(1);
    db.prepare(`UPDATE copilot_config SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const config = db.prepare('SELECT * FROM copilot_config WHERE id = 1').get();
    return res.json(config);
  } catch (err) {
    console.error('Update copilot config error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Conversations CRUD ───────────────────────────────────────────────────────

router.get('/conversations', (req: Request, res: Response) => {
  try {
    const conversations = db.prepare('SELECT * FROM copilot_conversations WHERE user_id = ? ORDER BY updated_at DESC').all(req.user!.id);
    return res.json(conversations);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/conversations', (req: Request, res: Response) => {
  try {
    const id = uuidv4();
    const { title } = req.body as { title?: string };
    const now = new Date().toISOString();
    db.prepare('INSERT INTO copilot_conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, req.user!.id, title || 'Nueva conversación', now, now);
    return res.status(201).json(db.prepare('SELECT * FROM copilot_conversations WHERE id = ?').get(id));
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/conversations/:id', (req: Request, res: Response) => {
  try {
    const conversation = db.prepare('SELECT * FROM copilot_conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as Record<string, unknown> | undefined;
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    const messages = db.prepare('SELECT * FROM copilot_messages WHERE conversation_id = ? ORDER BY created_at ASC').all(req.params.id);
    return res.json({ ...conversation, messages });
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/conversations/:id', (req: Request, res: Response) => {
  try {
    const conv = db.prepare('SELECT * FROM copilot_conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    db.prepare('DELETE FROM copilot_messages WHERE conversation_id = ?').run(req.params.id);
    db.prepare('DELETE FROM copilot_conversations WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Conversation deleted' });
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }); }
});

// ─── POST /api/copilot/upload ────────────────────────────────────────────────
router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const content = parseFile(req.file.buffer, req.file.originalname);
    return res.json({
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      content,
    });
  } catch (err) {
    console.error('File upload error:', err);
    return res.status(500).json({ error: 'File processing failed' });
  }
});

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

function buildSystemPrompt(config: Record<string, unknown>, userId: string): string {
  // Gather live system context
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users WHERE is_active = 1').get() as any).c;
  const adminCount = (db.prepare('SELECT COUNT(*) as c FROM users WHERE is_admin = 1 AND is_active = 1').get() as any).c;
  const currentPeriods = db.prepare('SELECT * FROM period_configs ORDER BY period DESC').all();
  const modules = db.prepare('SELECT * FROM module_config WHERE id = 1').get() as Record<string, unknown>;
  const systemStatus = db.prepare('SELECT * FROM system_status WHERE id = 1').get() as Record<string, unknown>;
  const questionCount = (db.prepare('SELECT COUNT(*) as c FROM library_questions').get() as any).c;
  const customQCount = (db.prepare('SELECT COUNT(*) as c FROM custom_eval_questions').get() as any).c;

  const periodStr = currentPeriods.map((p: any) =>
    `  • ${p.period}: Auto=${p.self_start}→${p.self_end}, Supervisor=${p.supervisor_start}→${p.supervisor_end}, Feedback=${p.feedback_start}→${p.feedback_end}`
  ).join('\n');

  const modulesStr = `Evaluaciones=${modules?.evaluations ? '✅' : '❌'}, Comunicaciones=${modules?.communications ? '✅' : '❌'}, Vacaciones=${modules?.vacations ? '✅' : '❌'}`;
  const systemStr = `Sistema=${systemStatus?.status === 'active' ? '✅ Activo' : '❌ Inactivo'}, Plan=${systemStatus?.payment_plan}, MaxUsuarios=${systemStatus?.max_users}`;

  // Permissions
  const perms: string[] = [];
  if (config.can_manage_users) perms.push('✅ Gestionar Usuarios');
  if (config.can_manage_evaluations) perms.push('✅ Gestionar Evaluaciones');
  if (config.can_manage_vacations) perms.push('✅ Gestionar Vacaciones');
  if (config.can_manage_announcements) perms.push('✅ Gestionar Anuncios');
  if (config.can_manage_periods) perms.push('✅ Gestionar Periodos');
  if (config.can_manage_system) perms.push('✅ Gestionar Sistema');
  if (config.can_view_reports) perms.push('✅ Ver Reportes');
  const blocked = ['can_manage_users','can_manage_evaluations','can_manage_vacations','can_manage_announcements','can_manage_periods','can_manage_system','can_view_reports']
    .filter(k => !config[k]).map(k => `❌ ${k.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}`);
  const permStr = perms.concat(blocked).join(', ');

  return `Eres el Copiloto SMPS, un asistente de IA avanzado integrado en el sistema SMPS Performance Compass. Tu función es ayudar a los administradores a gestionar todo el sistema de forma inteligente mediante conversación natural.

CONOCIMIENTO COMPLETO DEL SISTEMA:

📋 ESTRUCTURA DEL SISTEMA:
- SMPS Performance Compass es un sistema de evaluación de desempeño para un despacho de abogados
- Posiciones legales: Socio, Salary Partner, Counsel, Asociado Sr/Mid/Jr, Pasante con Carrera, Pasante Corporativo
- Posiciones administrativas: Director, Gerente, Coordinador, Analista, Asistente, Archivo y Soporte
- Áreas de práctica legal: Corporativo, Consultoría Fiscal, Litigio Fiscal, General
- Periodos de evaluación son semestrales (ej: 2026-H1, 2025-H2)
- Cada periodo tiene fases: Autoevaluación → Evaluación Supervisor → Feedback → Plan de Acción

👥 USUARIOS ACTUALES:
- ${userCount} usuarios activos, ${adminCount} administradores
- Roles: SuperUsuario (control total), Administrador (gestión), Socio (solo lectura + evaluaciones), Usuario normal

📊 ESTADO ACTUAL:
- ${systemStr}
- Módulos: ${modulesStr}
- Periodos configurados:
${periodStr}
- ${questionCount} preguntas en la biblioteca, ${customQCount} preguntas customizadas

🔑 TUS PERMISOS ACTUALES:
${permStr}

INSTRUCCIONES DE COMPORTAMIENTO:
1. SIEMPRE responde en español
2. Sé proactivo: sugiere acciones cuando detectes oportunidades
3. Si una petición es ambigua o no tienes suficiente información, SIEMPRE haz preguntas de aclaración antes de actuar
4. Para acciones destructivas (desactivar usuarios, eliminar datos), SIEMPRE pide confirmación expllicando exactamente qué harás
5. Cuando crees usuarios, preguntas u otros registros, confirma los detalles antes de crear
6. Si el usuario sube un archivo, analízalo completo y explica qué contiene, luego pregunta qué quiere hacer con esos datos
7. Puedes crear registros en lote si el usuario sube un archivo con múltiples registros
8. Nunca reveles contraseñas, tokens internos ni detalles de seguridad del sistema
9. Sé útil, claro y conciso. Usa listas y formatos cuando sea apropiado
10. Si el usuario pregunta "¿qué puede hacer este empleado para mejorar?", analiza sus evaluaciones y sugiere áreas de mejora específicas con acciones concretas

HERRAMIENTAS DISPONIBLES:
Puedes usar las siguientes herramientas para ejecutar acciones reales en el sistema. Solo usa las herramientas que tienes permitidas según tus permisos.`;
}

// ─── Tool definitions ────────────────────────────────────────────────────────

interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, userId: string, config: Record<string, unknown>) => Promise<string>;
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

function getTools(config: Record<string, unknown>): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  // ── USER MANAGEMENT ──
  if (config.can_manage_users) {
    tools.push({
      name: 'list_users',
      description: 'Lista todos los usuarios del sistema. Opcionalmente filtra por rol o estado activo.',
      parameters: { type: 'object', properties: { role: { type: 'string', description: 'Filtrar por rol: admin, super_user, o vacío para todos' }, active: { type: 'boolean', description: 'Filtrar por estado activo' } } },
      execute: async (args) => {
        let sql = 'SELECT id, name, email, position, practice_area, is_admin, is_super_user, is_managing_partner, is_active FROM users WHERE 1=1';
        const params: unknown[] = [];
        if (args.role === 'admin') { sql += ' AND is_admin = 1'; }
        if (args.role === 'super_user') { sql += ' AND is_super_user = 1'; }
        if (args.active !== undefined) { sql += ' AND is_active = ?'; params.push(args.active ? 1 : 0); }
        return JSON.stringify(db.prepare(sql).all(...params));
      },
    });

    tools.push({
      name: 'get_user',
      description: 'Obtiene los detalles completos de un usuario por su ID.',
      parameters: { type: 'object', properties: { user_id: { type: 'string', description: 'ID del usuario' } }, required: ['user_id'] },
      execute: async (args) => {
        const user = db.prepare('SELECT id, name, email, position, practice_area, is_admin, is_super_user, is_managing_partner, is_active FROM users WHERE id = ?').get(args.user_id);
        if (!user) return JSON.stringify({ error: 'Usuario no encontrado' });
        return JSON.stringify(user);
      },
    });

    tools.push({
      name: 'search_users',
      description: 'Busca usuarios por nombre o email.',
      parameters: { type: 'object', properties: { query: { type: 'string', description: 'Texto a buscar en nombre o email' } }, required: ['query'] },
      execute: async (args) => {
        return JSON.stringify(db.prepare("SELECT id, name, email, position, is_admin, is_active FROM users WHERE name LIKE ? OR email LIKE ?").all(`%${args.query}%`, `%${args.query}%`));
      },
    });

    tools.push({
      name: 'create_user',
      description: 'Crea un nuevo usuario en el sistema. La contraseña temporal debe ser cambiada en el primer inicio de sesión.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre completo del usuario' },
          email: { type: 'string', description: 'Correo electrónico' },
          position: { type: 'string', description: 'Posición (socio, salary_partner, counsel, asociado_sr, asociado_mid, asociado_jr, pasante_carrera, pasante_corporativo, director, gerente, coordinador, analista, asistente, archivo_soporte)' },
          password: { type: 'string', description: 'Contraseña temporal (mínimo 6 caracteres)' },
          practice_area: { type: 'string', description: 'Área de práctica para posiciones legales: corporativo, consultoria_fiscal, litigio_fiscal, general' },
          is_admin: { type: 'boolean', description: 'Si el usuario es administrador' },
          is_managing_partner: { type: 'boolean', description: 'Si el usuario es socio gestor' },
        },
        required: ['name', 'email', 'position', 'password'],
      },
      execute: async (args, _userId, _config) => {
        const { name, email, position, password, practice_area, is_admin, is_managing_partner } = args as Record<string, unknown>;
        if (!name || !email || !position || !password) return JSON.stringify({ error: 'Nombre, email, posición y contraseña son obligatorios' });
        if ((password as string).length < 6) return JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' });
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) return JSON.stringify({ error: 'El correo electrónico ya está registrado' });
        const id = uuidv4();
        const hashedPassword = await hashPassword(password as string);
        const hashedAnswer = ''; // Will be set on first login
        const now = new Date().toISOString();
        db.prepare(
          `INSERT INTO users (id, email, password_hash, security_question, security_answer, name, position, practice_area, is_admin, is_super_user, is_managing_partner, is_active, must_change_password, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(id, email, hashedPassword, '¿Cuál es su correo electrónico?', hashedAnswer, name, position, (practice_area as string) || null, (is_admin ? 1 : 0), 0, (is_managing_partner ? 1 : 0), 1, 1, now, now);
        const user = db.prepare('SELECT id, name, email, position, is_admin, is_active FROM users WHERE id = ?').get(id);
        return JSON.stringify({ success: true, message: `Usuario "${name}" creado exitosamente`, user });
      },
    });

    tools.push({
      name: 'create_users_batch',
      description: 'Crea múltiples usuarios en lote a partir de una lista. Cada usuario debe tener nombre, email, posición y contraseña.',
      parameters: {
        type: 'object',
        properties: {
          users: { type: 'array', description: 'Lista de objetos con name, email, position, password, y opcionalmente practice_area, is_admin, is_managing_partner', items: { type: 'object' } },
        },
        required: ['users'],
      },
      execute: async (args, _userId, _config) => {
        const users = args.users as Record<string, unknown>[];
        if (!Array.isArray(users)) return JSON.stringify({ error: 'users debe ser un arreglo' });
        const results: Record<string, unknown>[] = [];
        for (const u of users) {
          const { name, email, position, password, practice_area, is_admin, is_managing_partner } = u as Record<string, unknown>;
          if (!name || !email || !position || !password) { results.push({ email, error: 'Campos obligatorios faltantes' }); continue; }
          if ((password as string).length < 6) { results.push({ email, error: 'Contraseña muy corta' }); continue; }
          const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
          if (existing) { results.push({ email, error: 'Email ya registrado' }); continue; }
          try {
            const id = uuidv4();
            const hashedPassword = await hashPassword(password as string);
            const now = new Date().toISOString();
            db.prepare(
              `INSERT INTO users (id, email, password_hash, security_question, security_answer, name, position, practice_area, is_admin, is_super_user, is_managing_partner, is_active, must_change_password, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(id, email, hashedPassword, '¿Cuál es su correo electrónico?', '', name, position, (practice_area as string) || null, (is_admin ? 1 : 0), 0, (is_managing_partner ? 1 : 0), 1, 1, now, now);
            results.push({ email, success: true, id });
          } catch (e) { results.push({ email, error: String(e) }); }
        }
        const created = results.filter(r => r.success).length;
        return JSON.stringify({ message: `${created} de ${users.length} usuarios creados`, results });
      },
    });

    tools.push({
      name: 'update_user_role',
      description: 'Actualiza el rol de un usuario (admin, managing_partner).',
      parameters: {
        type: 'object',
        properties: { user_id: { type: 'string', description: 'ID del usuario' }, is_admin: { type: 'boolean', description: 'Si es administrador' }, is_managing_partner: { type: 'boolean', description: 'Si es socio gestor' } },
        required: ['user_id'],
      },
      execute: async (args) => {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(args.user_id);
        if (!user) return JSON.stringify({ error: 'Usuario no encontrado' });
        const updates: string[] = [];
        const values: unknown[] = [];
        if (args.is_admin !== undefined) { updates.push('is_admin = ?'); values.push(args.is_admin ? 1 : 0); }
        if (args.is_managing_partner !== undefined) { updates.push('is_managing_partner = ?'); values.push(args.is_managing_partner ? 1 : 0); }
        if (updates.length === 0) return JSON.stringify({ error: 'No hay campos para actualizar' });
        updates.push('updated_at = ?'); values.push(new Date().toISOString()); values.push(args.user_id);
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        return JSON.stringify({ success: true, message: 'Rol actualizado correctamente' });
      },
    });

    tools.push({
      name: 'deactivate_user',
      description: 'Desactiva un usuario del sistema (no lo elimina).',
      parameters: { type: 'object', properties: { user_id: { type: 'string', description: 'ID del usuario' } }, required: ['user_id'] },
      execute: async (args) => {
        const user = db.prepare('SELECT id, name, is_active FROM users WHERE id = ?').get(args.user_id) as Record<string, unknown> | undefined;
        if (!user) return JSON.stringify({ error: 'Usuario no encontrado' });
        if (!user.is_active) return JSON.stringify({ error: 'El usuario ya está desactivado' });
        db.prepare('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), args.user_id);
        return JSON.stringify({ success: true, message: `Usuario "${user.name}" desactivado` });
      },
    });

    tools.push({
      name: 'activate_user',
      description: 'Reactiva un usuario desactivado.',
      parameters: { type: 'object', properties: { user_id: { type: 'string', description: 'ID del usuario' } }, required: ['user_id'] },
      execute: async (args) => {
        const user = db.prepare('SELECT id, name, is_active FROM users WHERE id = ?').get(args.user_id) as Record<string, unknown> | undefined;
        if (!user) return JSON.stringify({ error: 'Usuario no encontrado' });
        if (user.is_active) return JSON.stringify({ error: 'El usuario ya está activo' });
        db.prepare('UPDATE users SET is_active = 1, updated_at = ? WHERE id = ?').run(new Date().toISOString(), args.user_id);
        return JSON.stringify({ success: true, message: `Usuario "${user.name}" reactivado` });
      },
    });

    tools.push({
      name: 'get_supervisor_assignments',
      description: 'Obtiene las asignaciones de supervisores para un periodo.',
      parameters: { type: 'object', properties: { period: { type: 'string', description: 'Periodo (ej: 2026-H1)' } }, required: ['period'] },
      execute: async (args) => {
        const assignments = db.prepare('SELECT * FROM supervisor_assignments WHERE period = ?').all(args.period);
        const enriched = (assignments as Record<string, unknown>[]).map(a => {
          const emp = db.prepare('SELECT name FROM users WHERE id = ?').get(a.employee_id) as Record<string, unknown> | undefined;
          const sup = db.prepare('SELECT name FROM users WHERE id = ?').get(a.supervisor_id) as Record<string, unknown> | undefined;
          return { ...a, employeeName: emp?.name, supervisorName: sup?.name };
        });
        return JSON.stringify(enriched);
      },
    });

    tools.push({
      name: 'assign_supervisor',
      description: 'Asigna un supervisor a un empleado para un periodo.',
      parameters: {
        type: 'object',
        properties: {
          employee_id: { type: 'string', description: 'ID del empleado' },
          supervisor_id: { type: 'string', description: 'ID del supervisor' },
          period: { type: 'string', description: 'Periodo (ej: 2026-H1)' },
        },
        required: ['employee_id', 'supervisor_id', 'period'],
      },
      execute: async (args) => {
        const emp = db.prepare('SELECT name FROM users WHERE id = ?').get(args.employee_id);
        const sup = db.prepare('SELECT name FROM users WHERE id = ?').get(args.supervisor_id);
        if (!emp) return JSON.stringify({ error: 'Empleado no encontrado' });
        if (!sup) return JSON.stringify({ error: 'Supervisor no encontrado' });
        const existing = db.prepare('SELECT id FROM supervisor_assignments WHERE employee_id = ? AND supervisor_id = ? AND period = ?').get(args.employee_id, args.supervisor_id, args.period);
        if (existing) return JSON.stringify({ error: 'Esta asignación ya existe' });
        const id = uuidv4();
        db.prepare('INSERT INTO supervisor_assignments (id, employee_id, supervisor_id, period) VALUES (?, ?, ?, ?)').run(id, args.employee_id, args.supervisor_id, args.period);
        return JSON.stringify({ success: true, message: 'Supervisor asignado correctamente' });
      },
    });
  }

  // ── EVALUATION MANAGEMENT ──
  if (config.can_manage_evaluations) {
    tools.push({
      name: 'get_evaluation_summary',
      description: 'Obtiene un resumen de las evaluaciones para un periodo.',
      parameters: { type: 'object', properties: { period: { type: 'string', description: 'Periodo (ej: 2026-H1)' } }, required: ['period'] },
      execute: async (args) => {
        const evals = db.prepare('SELECT * FROM evaluations WHERE period = ?').all(args.period) as Record<string, unknown>[];
        const selfDone = evals.filter(e => e.type === 'self' && e.completed_at).length;
        const supDone = evals.filter(e => e.type === 'supervisor' && e.completed_at).length;
        const total = evals.length;
        return JSON.stringify({ period: args.period, totalEvaluations: total, selfCompleted: selfDone, supervisorCompleted: supDone, pending: total - selfDone - supDone });
      },
    });

    tools.push({
      name: 'get_user_evaluations',
      description: 'Obtiene las evaluaciones de un usuario.',
      parameters: { type: 'object', properties: { user_id: { type: 'string', description: 'ID del usuario' }, period: { type: 'string', description: 'Periodo' } }, required: ['user_id'] },
      execute: async (args) => {
        let sql = 'SELECT e.*, u.name as evaluator_name FROM evaluations e JOIN users u ON e.evaluator_id = u.id WHERE e.evaluated_id = ?';
        const params: unknown[] = [args.user_id];
        if (args.period) { sql += ' AND e.period = ?'; params.push(args.period); }
        return JSON.stringify(db.prepare(sql).all(...params));
      },
    });

    tools.push({
      name: 'get_user_improvement_suggestions',
      description: 'Analiza las evaluaciones de un usuario y sugiere áreas de mejora con acciones concretas.',
      parameters: { type: 'object', properties: { user_id: { type: 'string', description: 'ID del usuario' }, period: { type: 'string', description: 'Periodo (ej: 2026-H1)' } }, required: ['user_id'] },
      execute: async (args) => {
        let sql = 'SELECT * FROM evaluations WHERE evaluated_id = ?';
        const params: unknown[] = [args.user_id];
        if (args.period) { sql += ' AND period = ?'; params.push(args.period); }
        const evals = db.prepare(sql).all(...params) as Record<string, unknown>[];
        const user = db.prepare('SELECT name, position FROM users WHERE id = ?').get(args.user_id) as Record<string, unknown> | undefined;
        if (!user) return JSON.stringify({ error: 'Usuario no encontrado' });
        if (evals.length === 0) return JSON.stringify({ user, message: 'No hay evaluaciones para este usuario en el periodo especificado' });
        // Get responses for each evaluation
        const evalIds = evals.filter(e => e.completed_at).map(e => e.id);
        let responses: Record<string, unknown>[] = [];
        if (evalIds.length > 0) {
          const placeholders = evalIds.map(() => '?').join(',');
          responses = db.prepare(`SELECT er.*, e.type as eval_type FROM evaluation_responses er JOIN evaluations e ON er.evaluation_id = e.id WHERE er.evaluation_id IN (${placeholders})`).all(...evalIds) as Record<string, unknown>[];
        }
        // Calculate scores by category
        const categories: Record<string, { total: number; count: number; scores: number[] }> = {};
        const allQuestions = db.prepare('SELECT question_id, category, text FROM custom_eval_questions UNION ALL SELECT question_id, category, text FROM library_questions').all() as Record<string, unknown>[];
        const questionMap = new Map(allQuestions.map(q => [q.question_id, q]));
        for (const r of responses) {
          const qId = r.question_id as string;
          const q = questionMap.get(qId);
          const cat = (q?.category as string) || 'Sin categoría';
          if (!categories[cat]) categories[cat] = { total: 0, count: 0, scores: [] };
          categories[cat].total += r.score as number;
          categories[cat].count++;
          categories[cat].scores.push(r.score as number);
        }
        const result = Object.entries(categories).map(([cat, data]) => ({
          category: cat,
          averageScore: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0,
          totalQuestions: data.count,
        })).sort((a, b) => a.averageScore - b.averageScore);
        return JSON.stringify({ user, evaluations: evals.length, completedEvaluations: evals.filter(e => e.completed_at).length, categoryScores: result, weakestAreas: result.slice(0, 3) });
      },
    });

    tools.push({
      name: 'get_period_config',
      description: 'Obtiene la configuración de periodos de evaluación.',
      parameters: { type: 'object', properties: {} },
      execute: async () => JSON.stringify(db.prepare('SELECT * FROM period_configs').all()),
    });

    tools.push({
      name: 'get_evaluation_questions',
      description: 'Obtiene las preguntas de evaluación para una posición.',
      parameters: { type: 'object', properties: { position: { type: 'string', description: 'Posición (ej: socio, asociado_sr)' } }, required: ['position'] },
      execute: async (args) => JSON.stringify(db.prepare('SELECT * FROM custom_eval_questions WHERE position = ?').all(args.position)),
    });

    tools.push({
      name: 'create_library_question',
      description: 'Crea una nueva pregunta en la biblioteca de preguntas de evaluación.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Categoría: Desempeño, Liderazgo, Cumplimiento, Habilidades Blandas, Trabajo en Equipo, Actitud, Disponibilidad, Desarrollo, Criterio Técnico' },
          text: { type: 'string', description: 'Texto de la pregunta' },
          weight: { type: 'number', description: 'Peso de la pregunta (1-10)' },
        },
        required: ['category', 'text', 'weight'],
      },
      execute: async (args, userId) => {
        const id = uuidv4();
        const questionId = `q_${Date.now()}`;
        db.prepare('INSERT INTO library_questions (id, question_id, category, text, default_weight, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, questionId, args.category, args.text, args.weight, new Date().toISOString(), userId);
        return JSON.stringify({ success: true, message: 'Pregunta creada exitosamente', questionId });
      },
    });

    tools.push({
      name: 'create_questions_batch',
      description: 'Crea múltiples preguntas en lote a partir de una lista.',
      parameters: {
        type: 'object',
        properties: {
          questions: { type: 'array', description: 'Lista de objetos con category, text, weight', items: { type: 'object' } },
        },
        required: ['questions'],
      },
      execute: async (args, userId) => {
        const questions = args.questions as Record<string, unknown>[];
        if (!Array.isArray(questions)) return JSON.stringify({ error: 'questions debe ser un arreglo' });
        const results: Record<string, unknown>[] = [];
        const insertQ = db.prepare('INSERT INTO library_questions (id, question_id, category, text, default_weight, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for (const q of questions) {
          if (!q.category || !q.text || !q.weight) { results.push({ text: q.text, error: 'Campos faltantes' }); continue; }
          try {
            const id = uuidv4();
            const questionId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            insertQ.run(id, questionId, q.category, q.text, q.weight, new Date().toISOString(), userId);
            results.push({ questionId, text: q.text, success: true });
          } catch (e) { results.push({ text: q.text, error: String(e) }); }
        }
        return JSON.stringify({ message: `${results.filter(r => r.success).length} de ${questions.length} preguntas creadas`, results });
      },
    });
  }

  // ── VACATION MANAGEMENT ──
  if (config.can_manage_vacations) {
    tools.push({
      name: 'list_vacation_requests',
      description: 'Lista solicitudes de vacaciones. Filtrar por estado: pending, approved, rejected.',
      parameters: { type: 'object', properties: { status: { type: 'string', description: 'Estado: pending, approved, rejected' } } },
      execute: async (args) => {
        let sql = 'SELECT vr.*, u.name as employee_name FROM vacation_requests vr JOIN users u ON vr.user_id = u.id WHERE 1=1';
        const params: unknown[] = [];
        if (args.status) { sql += ' AND vr.status = ?'; params.push(args.status); }
        return JSON.stringify(db.prepare(sql).all(...params));
      },
    });

    tools.push({
      name: 'approve_vacation',
      description: 'Aprueba o rechaza una solicitud de vacaciones.',
      parameters: {
        type: 'object',
        properties: { request_id: { type: 'string', description: 'ID de la solicitud' }, action: { type: 'string', description: 'approved o rejected' }, comment: { type: 'string', description: 'Comentario opcional' } },
        required: ['request_id', 'action'],
      },
      execute: async (args, userId) => {
        if (!['approved', 'rejected'].includes(args.action as string)) return JSON.stringify({ error: 'Acción debe ser "approved" o "rejected"' });
        const request = db.prepare('SELECT * FROM vacation_requests WHERE id = ?').get(args.request_id);
        if (!request) return JSON.stringify({ error: 'Solicitud no encontrada' });
        db.prepare('UPDATE vacation_requests SET status = ? WHERE id = ?').run(args.action, args.request_id);
        db.prepare('INSERT INTO vacation_approvals (id, vacation_request_id, approver_id, approved_at, action, comment) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), args.request_id, userId, new Date().toISOString(), args.action, (args.comment as string) || null);
        return JSON.stringify({ success: true, message: `Solicitud ${args.action === 'approved' ? 'aprobada' : 'rechazada'}` });
      },
    });
  }

  // ── ANNOUNCEMENT MANAGEMENT ──
  if (config.can_manage_announcements) {
    tools.push({
      name: 'list_announcements',
      description: 'Lista los anuncios/comunicados del sistema.',
      parameters: { type: 'object', properties: { include_archived: { type: 'boolean', description: 'Incluir archivados' } } },
      execute: async (args) => {
        let sql = 'SELECT a.*, u.name as author_name FROM announcements a JOIN users u ON a.author_id = u.id';
        if (!args.include_archived) sql += ' WHERE a.archived = 0';
        return JSON.stringify(db.prepare(sql).all());
      },
    });

    tools.push({
      name: 'create_announcement',
      description: 'Crea un nuevo anuncio/comunicado.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título del anuncio' },
          body: { type: 'string', description: 'Contenido del anuncio' },
          audience: { type: 'string', description: 'Audiencia: all, legal, administrativo' },
          expires_at: { type: 'string', description: 'Fecha de expiración (ISO)' },
        },
        required: ['title', 'body', 'audience'],
      },
      execute: async (args, userId) => {
        const id = uuidv4();
        const now = new Date().toISOString();
        db.prepare('INSERT INTO announcements (id, author_id, title, body, audience, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, userId, args.title, args.body, args.audience, now, (args.expires_at as string) || null);
        return JSON.stringify({ success: true, message: 'Anuncio creado exitosamente', id });
      },
    });
  }

  // ── PERIOD MANAGEMENT ──
  if (config.can_manage_periods) {
    tools.push({
      name: 'create_period',
      description: 'Crea un nuevo periodo de evaluación con sus fechas.',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', description: 'Nombre del periodo (ej: 2026-H2)' },
          self_start: { type: 'string', description: 'Fecha inicio autoevaluación (YYYY-MM-DD)' },
          self_end: { type: 'string', description: 'Fecha fin autoevaluación' },
          supervisor_start: { type: 'string', description: 'Fecha inicio evaluación supervisor' },
          supervisor_end: { type: 'string', description: 'Fecha fin evaluación supervisor' },
          feedback_start: { type: 'string', description: 'Fecha inicio feedback' },
          feedback_end: { type: 'string', description: 'Fecha fin feedback' },
          action_plan_start: { type: 'string', description: 'Fecha inicio planes de acción' },
          action_plan_end: { type: 'string', description: 'Fecha fin planes de acción' },
        },
        required: ['period', 'self_start', 'self_end', 'supervisor_start', 'supervisor_end', 'feedback_start', 'feedback_end', 'action_plan_start', 'action_plan_end'],
      },
      execute: async (args) => {
        const existing = db.prepare('SELECT period FROM period_configs WHERE period = ?').get(args.period);
        if (existing) return JSON.stringify({ error: 'El periodo ya existe' });
        db.prepare(
          'INSERT INTO period_configs (period, self_start, self_end, supervisor_start, supervisor_end, feedback_start, feedback_end, action_plan_start, action_plan_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(args.period, args.self_start, args.self_end, args.supervisor_start, args.supervisor_end, args.feedback_start, args.feedback_end, args.action_plan_start, args.action_plan_end);
        return JSON.stringify({ success: true, message: `Periodo "${args.period}" creado exitosamente` });
      },
    });
  }

  // ── SYSTEM MANAGEMENT ──
  if (config.can_manage_system) {
    tools.push({
      name: 'get_system_status',
      description: 'Obtiene el estado completo del sistema.',
      parameters: { type: 'object', properties: {} },
      execute: async () => {
        const status = db.prepare('SELECT * FROM system_status WHERE id = 1').get();
        const moduleConfig = db.prepare('SELECT * FROM module_config WHERE id = 1').get();
        return JSON.stringify({ status, modules: moduleConfig });
      },
    });

    tools.push({
      name: 'toggle_system_status',
      description: 'Activa o desactiva el sistema.',
      parameters: { type: 'object', properties: { status: { type: 'string', description: 'active o inactive' } }, required: ['status'] },
      execute: async (args, userId) => {
        if (!['active', 'inactive'].includes(args.status as string)) return JSON.stringify({ error: 'Estado debe ser "active" o "inactive"' });
        db.prepare('UPDATE system_status SET status = ? WHERE id = 1').run(args.status);
        db.prepare('INSERT INTO activation_history (id, action, date, by) VALUES (?, ?, ?, ?)').run(uuidv4(), args.status === 'active' ? 'activated' : 'deactivated', new Date().toISOString(), userId);
        return JSON.stringify({ success: true, message: `Sistema ${args.status === 'active' ? 'activado' : 'desactivado'}` });
      },
    });

    tools.push({
      name: 'toggle_module',
      description: 'Activa o desactiva un módulo del sistema.',
      parameters: { type: 'object', properties: { module: { type: 'string', description: 'Módulo: evaluations, communications, vacations' }, enabled: { type: 'boolean', description: 'true=activar, false=desactivar' } }, required: ['module', 'enabled'] },
      execute: async (args) => {
        const allowed = ['evaluations', 'communications', 'vacations'];
        if (!allowed.includes(args.module as string)) return JSON.stringify({ error: 'Módulo no válido' });
        db.prepare(`UPDATE module_config SET ${args.module} = ? WHERE id = 1`).run(args.enabled ? 1 : 0);
        return JSON.stringify({ success: true, message: `Módulo "${args.module}" ${args.enabled ? 'activado' : 'desactivado'}` });
      },
    });
  }

  // ── REPORTS ──
  if (config.can_view_reports) {
    tools.push({
      name: 'get_dashboard_stats',
      description: 'Obtiene estadísticas generales del sistema.',
      parameters: { type: 'object', properties: { period: { type: 'string', description: 'Periodo (ej: 2026-H1)' } } },
      execute: async (args) => {
        const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users WHERE is_active = 1').get() as any).c;
        const adminUsers = (db.prepare('SELECT COUNT(*) as c FROM users WHERE is_admin = 1 AND is_active = 1').get() as any).c;
        let evalStats = { total: 0, completed: 0 };
        if (args.period) {
          const evals = db.prepare('SELECT * FROM evaluations WHERE period = ?').all(args.period) as Record<string, unknown>[];
          evalStats = { total: evals.length, completed: evals.filter(e => e.completed_at).length };
        }
        const pendingVacations = (db.prepare("SELECT COUNT(*) as c FROM vacation_requests WHERE status = 'pending'").get() as any).c;
        return JSON.stringify({ activeUsers: totalUsers, adminUsers: adminUsers, evaluationStats: evalStats, pendingVacationRequests: pendingVacations });
      },
    });
  }

  return tools;
}

function toolsToFunctions(tools: ToolDefinition[]) {
  return tools.map(tool => ({ type: 'function' as const, function: { name: tool.name, description: tool.description, parameters: tool.parameters } }));
}

// ─── POST /api/copilot/chat ──────────────────────────────────────────────────
router.post('/chat', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { conversationId, message } = req.body as { conversationId?: string; message?: string };
    const fileContent = req.file ? parseFile(req.file.buffer, req.file.originalname) : null;

    if (!message && !fileContent) {
      return res.status(400).json({ error: 'Message or file is required' });
    }

    // Build the full user message
    let fullMessage = message || '';
    if (fileContent) {
      fullMessage += `\n\n📎 Archivo adjunto: "${req.file!.originalname}" (${(req.file!.size / 1024).toFixed(1)} KB)\nContenido del archivo:\n\`\`\`\n${fileContent}\n\`\`\``;
    }

    // Get copilot config
    let config = db.prepare('SELECT * FROM copilot_config WHERE id = 1').get() as Record<string, unknown> | undefined;
    if (!config) {
      db.prepare('INSERT INTO copilot_config (id, model, api_provider, can_manage_users, can_manage_evaluations, can_manage_vacations, can_manage_announcements, can_manage_periods, can_manage_system, can_view_reports, max_tokens, temperature) VALUES (1, \'llama-3.3-70b-versatile\', \'groq\', 1, 1, 1, 1, 1, 0, 1, 4096, 0.3)').run();
      config = db.prepare('SELECT * FROM copilot_config WHERE id = 1').get() as Record<string, unknown>;
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured. Set the GROQ_API_KEY environment variable.' });
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      convId = uuidv4();
      const title = (fullMessage || '').slice(0, 60).replace(/\n/g, ' ');
      const now = new Date().toISOString();
      db.prepare('INSERT INTO copilot_conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(convId, req.user!.id, title, now, now);
    } else {
      const conv = db.prepare('SELECT * FROM copilot_conversations WHERE id = ? AND user_id = ?').get(convId, req.user!.id);
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    }

    // Save user message
    const userMsgId = uuidv4();
    db.prepare('INSERT INTO copilot_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)').run(userMsgId, convId, 'user', fullMessage, new Date().toISOString());

    // Load conversation history (last 30 messages for context)
    const history = db.prepare('SELECT role, content, tool_calls, tool_results FROM copilot_messages WHERE conversation_id = ? ORDER BY created_at ASC').all(convId) as Record<string, unknown>[];

    // Build messages with full system prompt
    const systemPrompt = buildSystemPrompt(config, req.user!.id);
    const messages: Record<string, unknown>[] = [{ role: 'system', content: systemPrompt }];

    // Add conversation history
    const recentHistory = history.slice(-30);
    for (const msg of recentHistory) {
      const entry: Record<string, unknown> = { role: msg.role, content: msg.content };
      messages.push(entry);
    }

    // Get available tools
    const tools = getTools(config);
    const functions = toolsToFunctions(tools);

    // Call Groq API (with up to 5 tool-call rounds)
    let finalResponse = '';
    let toolCallsData: string | null = null;
    let toolResultsData: string | null = null;
    const MAX_TOOL_ROUNDS = 5;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model || 'llama-3.3-70b-versatile',
          messages,
          temperature: Number(config.temperature) || 0.3,
          max_tokens: Number(config.max_tokens) || 4096,
          tools: functions.length > 0 ? functions : undefined,
          tool_choice: functions.length > 0 ? 'auto' : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Groq API error:', response.status, errorData);
        return res.status(502).json({ error: 'Failed to communicate with AI service', details: errorData });
      }

      const data = await response.json() as Record<string, unknown>;
      const choices = data.choices as Record<string, unknown>[];
      const assistantMessage = choices?.[0]?.message as Record<string, unknown>;

      if (!assistantMessage) {
        return res.status(502).json({ error: 'No response from AI service' });
      }

      // If no tool calls, we're done
      const messageToolCalls = assistantMessage.tool_calls as Record<string, unknown>[] | undefined;

      if (!messageToolCalls || messageToolCalls.length === 0) {
        finalResponse = (assistantMessage.content as string) || 'Lo siento, no pude generar una respuesta.';
        break;
      }

      // Save tool calls for display
      if (!toolCallsData) toolCallsData = JSON.stringify(messageToolCalls);

      // Add assistant message with tool calls to conversation
      messages.push(assistantMessage);

      // Execute tool calls
      const toolResults: Record<string, unknown>[] = [];
      for (const toolCall of messageToolCalls as any[]) {
        const functionName = toolCall.function?.name as string;
        let functionArgs = toolCall.function?.arguments;
        if (typeof functionArgs === 'string') {
          try { functionArgs = JSON.parse(functionArgs); } catch { functionArgs = {}; }
        }
        const tool = tools.find(t => t.name === functionName);

        if (tool) {
          try {
            const result = await tool.execute(functionArgs || {}, req.user!.id, config);
            toolResults.push({ tool_call_id: toolCall.id, role: 'tool', name: functionName, content: result });
          } catch (err) {
            console.error(`Tool execution error (${functionName}):`, err);
            toolResults.push({ tool_call_id: toolCall.id, role: 'tool', name: functionName, content: JSON.stringify({ error: 'Tool execution failed' }) });
          }
        }
      }

      if (!toolResultsData) toolResultsData = JSON.stringify(toolResults);

      // Add tool results to messages
      for (const result of toolResults) {
        messages.push({
          role: 'tool',
          tool_call_id: result.tool_call_id,
          content: result.content,
        });
      }

      // If this is the last round, get the final text response
      if (round === MAX_TOOL_ROUNDS - 1) {
        finalResponse = 'He realizado varias acciones. ¿Necesitas algo más?';
        break;
      }
    }

    // Save assistant message
    const assistantMsgId = uuidv4();
    db.prepare('INSERT INTO copilot_messages (id, conversation_id, role, content, tool_calls, tool_results, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      assistantMsgId, convId, 'assistant', finalResponse, toolCallsData, toolResultsData, new Date().toISOString()
    );

    // Update conversation timestamp and title (use first message as title if new)
    db.prepare('UPDATE copilot_conversations SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), convId);

    return res.json({
      conversationId: convId,
      message: {
        id: assistantMsgId,
        role: 'assistant',
        content: finalResponse,
        toolCalls: toolCallsData ? JSON.parse(toolCallsData) : null,
        toolResults: toolResultsData ? JSON.parse(toolResultsData) : null,
      },
    });
  } catch (err) {
    console.error('Copilot chat error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
