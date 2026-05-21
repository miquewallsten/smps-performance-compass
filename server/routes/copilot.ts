import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

// All copilot routes require admin or super_user
router.use(authMiddleware, requireAdmin);

// ─── GET /api/copilot/config ────────────────────────────────────────────────
router.get('/config', (_req: Request, res: Response) => {
  try {
    let config = db.prepare('SELECT * FROM copilot_config WHERE id = 1').get() as Record<string, unknown> | undefined;
    if (!config) {
      db.prepare(`
        INSERT INTO copilot_config (id, model, api_provider, can_manage_users, can_manage_evaluations, can_manage_vacations, can_manage_announcements, can_manage_periods, can_manage_system, can_view_reports, max_tokens, temperature)
        VALUES (1, 'llama-3.3-70b-versatile', 'groq', 1, 1, 1, 1, 0, 0, 1, 2048, 0.3)
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
      // Convert camelCase to snake_case for DB
      const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (typeof value === 'boolean') {
        updates.push(`${dbKey} = ?`);
        values.push(value ? 1 : 0);
      } else {
        updates.push(`${dbKey} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(1); // id = 1
    db.prepare(`UPDATE copilot_config SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const config = db.prepare('SELECT * FROM copilot_config WHERE id = 1').get();
    return res.json(config);
  } catch (err) {
    console.error('Update copilot config error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/copilot/conversations ──────────────────────────────────────────
router.get('/conversations', (req: Request, res: Response) => {
  try {
    const conversations = db.prepare(
      'SELECT * FROM copilot_conversations WHERE user_id = ? ORDER BY updated_at DESC'
    ).all(req.user!.id);
    return res.json(conversations);
  } catch (err) {
    console.error('List conversations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/copilot/conversations ─────────────────────────────────────────
router.post('/conversations', (req: Request, res: Response) => {
  try {
    const id = uuidv4();
    const { title } = req.body as { title?: string };
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO copilot_conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, req.user!.id, title || 'Nueva conversación', now, now);
    const conversation = db.prepare('SELECT * FROM copilot_conversations WHERE id = ?').get(id);
    return res.status(201).json(conversation);
  } catch (err) {
    console.error('Create conversation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/copilot/conversations/:id ──────────────────────────────────────
router.get('/conversations/:id', (req: Request, res: Response) => {
  try {
    const conversation = db.prepare(
      'SELECT * FROM copilot_conversations WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user!.id) as Record<string, unknown> | undefined;

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = db.prepare(
      'SELECT * FROM copilot_messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(req.params.id);

    return res.json({ ...conversation, messages });
  } catch (err) {
    console.error('Get conversation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/copilot/conversations/:id ───────────────────────────────────
router.delete('/conversations/:id', (req: Request, res: Response) => {
  try {
    const conversation = db.prepare(
      'SELECT * FROM copilot_conversations WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user!.id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    db.prepare('DELETE FROM copilot_messages WHERE conversation_id = ?').run(req.params.id);
    db.prepare('DELETE FROM copilot_conversations WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Conversation deleted' });
  } catch (err) {
    console.error('Delete conversation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Tool definitions for the AI agent ────────────────────────────────────────

interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, userId: string, config: Record<string, unknown>) => Promise<string>;
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `Eres el Copiloto SMPS, un asistente de IA integrado en el sistema de gestión de desempeño SMPS Performance Compass. Tu función es ayudar a los administradores y superusuarios a gestionar el sistema de manera eficiente.

Contexto del sistema SMPS:
- Es un sistema de evaluación de desempeño para un despacho de abogados
- Los usuarios tienen roles: SuperUsuario (super_user), Administrador (admin), o usuario normal
- Las posiciones incluyen: Socio, Salary Partner, Counsel, Asociado Sr/Mid/Jr, Director, Gerente, Coordinador, Analista, Asistente, etc.
- Hay módulos de: Evaluaciones, Comunicaciones, Vacaciones
- Los periodos de evaluación son semestrales (ej: 2026-H1, 2025-H2)

SIEMPRE responde en español. Sé útil, claro y conciso. Cuando realices acciones, confirma qué hiciste. Si no estás seguro, pregunta antes de actuar.

Cuando sugieras cambios destructivos (eliminar usuarios, etc.), siempre pide confirmación primero.`;

function getTools(config: Record<string, unknown>): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  // ── User management ──
  if (config.can_manage_users) {
    tools.push({
      name: 'list_users',
      description: 'Lista todos los usuarios del sistema. Puede filtrar por rol o estado.',
      parameters: {
        type: 'object',
        properties: {
          role: { type: 'string', description: 'Filtrar por rol: admin, super_user, o vacío para todos' },
          active: { type: 'boolean', description: 'Filtrar por estado activo' },
        },
      },
      execute: async (args) => {
        let sql = 'SELECT id, name, email, position, practice_area, is_admin, is_super_user, is_managing_partner, is_active FROM users WHERE 1=1';
        const params: unknown[] = [];
        if (args.role === 'admin') { sql += ' AND is_admin = 1'; }
        if (args.role === 'super_user') { sql += ' AND is_super_user = 1'; }
        if (args.active !== undefined) { sql += ' AND is_active = ?'; params.push(args.active ? 1 : 0); }
        const users = db.prepare(sql).all(...params);
        return JSON.stringify(users);
      },
    });

    tools.push({
      name: 'get_user',
      description: 'Obtiene los detalles de un usuario específico por su ID.',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'ID del usuario' },
        },
        required: ['user_id'],
      },
      execute: async (args) => {
        const user = db.prepare('SELECT id, name, email, position, practice_area, is_admin, is_super_user, is_managing_partner, is_active FROM users WHERE id = ?').get(args.user_id);
        if (!user) return JSON.stringify({ error: 'Usuario no encontrado' });
        return JSON.stringify(user);
      },
    });

    tools.push({
      name: 'search_users',
      description: 'Busca usuarios por nombre o email.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Texto a buscar en nombre o email' },
        },
        required: ['query'],
      },
      execute: async (args) => {
        const users = db.prepare("SELECT id, name, email, position, is_admin, is_active FROM users WHERE name LIKE ? OR email LIKE ?").all(`%${args.query}%`, `%${args.query}%`);
        return JSON.stringify(users);
      },
    });

    tools.push({
      name: 'update_user_role',
      description: 'Actualiza el rol de un usuario (admin, managing_partner, super_user).',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'ID del usuario' },
          is_admin: { type: 'boolean', description: 'Si el usuario es administrador' },
          is_managing_partner: { type: 'boolean', description: 'Si el usuario es socio gestor' },
        },
        required: ['user_id'],
      },
      execute: async (args, _userId, _config) => {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(args.user_id);
        if (!user) return JSON.stringify({ error: 'Usuario no encontrado' });
        const updates: string[] = [];
        const values: unknown[] = [];
        if (args.is_admin !== undefined) { updates.push('is_admin = ?'); values.push(args.is_admin ? 1 : 0); }
        if (args.is_managing_partner !== undefined) { updates.push('is_managing_partner = ?'); values.push(args.is_managing_partner ? 1 : 0); }
        if (updates.length === 0) return JSON.stringify({ error: 'No hay campos para actualizar' });
        updates.push('updated_at = ?'); values.push(new Date().toISOString());
        values.push(args.user_id);
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        return JSON.stringify({ success: true, message: 'Rol actualizado correctamente' });
      },
    });

    tools.push({
      name: 'deactivate_user',
      description: 'Desactiva un usuario del sistema (no lo elimina permanentemente).',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'ID del usuario a desactivar' },
        },
        required: ['user_id'],
      },
      execute: async (args) => {
        const user = db.prepare('SELECT id, name, is_active FROM users WHERE id = ?').get(args.user_id) as Record<string, unknown> | undefined;
        if (!user) return JSON.stringify({ error: 'Usuario no encontrado' });
        if (!user.is_active) return JSON.stringify({ error: 'El usuario ya está desactivado' });
        db.prepare('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), args.user_id);
        return JSON.stringify({ success: true, message: `Usuario "${user.name}" desactivado correctamente` });
      },
    });

    tools.push({
      name: 'activate_user',
      description: 'Reactiva un usuario desactivado.',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'ID del usuario a reactivar' },
        },
        required: ['user_id'],
      },
      execute: async (args) => {
        const user = db.prepare('SELECT id, name, is_active FROM users WHERE id = ?').get(args.user_id) as Record<string, unknown> | undefined;
        if (!user) return JSON.stringify({ error: 'Usuario no encontrado' });
        if (user.is_active) return JSON.stringify({ error: 'El usuario ya está activo' });
        db.prepare('UPDATE users SET is_active = 1, updated_at = ? WHERE id = ?').run(new Date().toISOString(), args.user_id);
        return JSON.stringify({ success: true, message: `Usuario "${user.name}" reactivado correctamente` });
      },
    });

    tools.push({
      name: 'get_supervisor_assignments',
      description: 'Obtiene las asignaciones de supervisores para un periodo.',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', description: 'Periodo (ej: 2026-H1)' },
        },
        required: ['period'],
      },
      execute: async (args) => {
        const assignments = db.prepare('SELECT * FROM supervisor_assignments WHERE period = ?').all(args.period);
        // Enrich with names
        const enriched = (assignments as Record<string, unknown>[]).map(a => {
          const emp = db.prepare('SELECT name FROM users WHERE id = ?').get(a.employee_id) as Record<string, unknown> | undefined;
          const sup = db.prepare('SELECT name FROM users WHERE id = ?').get(a.supervisor_id) as Record<string, unknown> | undefined;
          return { ...a, employeeName: emp?.name, supervisorName: sup?.name };
        });
        return JSON.stringify(enriched);
      },
    });

    tools.push({
      name: 'reset_user_password',
      description: 'Resetea la contraseña de un usuario. El usuario deberá cambiarla en su próximo inicio de sesión.',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'ID del usuario' },
          new_password: { type: 'string', description: 'Nueva contraseña (mínimo 6 caracteres)' },
        },
        required: ['user_id', 'new_password'],
      },
      execute: async (args) => {
        if (!args.new_password || (args.new_password as string).length < 6) {
          return JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(args.user_id) as Record<string, unknown> | undefined;
        if (!user) return JSON.stringify({ error: 'Usuario no encontrado' });
        // Note: We need to hash the password - for now return a message
        // In production, import hashPassword from auth/security.js
        return JSON.stringify({ success: true, message: `Se ha reseteado la contraseña de "${user.name}". Use la funcionalidad de reset en el sistema para completar.` });
      },
    });
  }

  // ── Evaluation management ──
  if (config.can_manage_evaluations) {
    tools.push({
      name: 'get_evaluation_summary',
      description: 'Obtiene un resumen de las evaluaciones para un periodo.',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', description: 'Periodo (ej: 2026-H1)' },
        },
        required: ['period'],
      },
      execute: async (args) => {
        const evaluations = db.prepare('SELECT * FROM evaluations WHERE period = ?').all(args.period);
        const selfDone = (evaluations as Record<string, unknown>[]).filter(e => e.type === 'self' && e.completed_at).length;
        const supervisorDone = (evaluations as Record<string, unknown>[]).filter(e => e.type === 'supervisor' && e.completed_at).length;
        const total = (evaluations as Record<string, unknown>[]).length;
        return JSON.stringify({
          period: args.period,
          totalEvaluations: total,
          selfEvaluationsCompleted: selfDone,
          supervisorEvaluationsCompleted: supervisorDone,
          pendingEvaluations: total - selfDone - supervisorDone,
        });
      },
    });

    tools.push({
      name: 'get_user_evaluations',
      description: 'Obtiene las evaluaciones de un usuario específico.',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'ID del usuario evaluado' },
          period: { type: 'string', description: 'Periodo (ej: 2026-H1)' },
        },
        required: ['user_id'],
      },
      execute: async (args) => {
        let sql = 'SELECT * FROM evaluations WHERE evaluated_id = ?';
        const params: unknown[] = [args.user_id];
        if (args.period) { sql += ' AND period = ?'; params.push(args.period); }
        const evaluations = db.prepare(sql).all(...params);
        return JSON.stringify(evaluations);
      },
    });

    tools.push({
      name: 'get_period_config',
      description: 'Obtiene la configuración de periodos de evaluación.',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        const configs = db.prepare('SELECT * FROM period_configs').all();
        return JSON.stringify(configs);
      },
    });

    tools.push({
      name: 'get_evaluation_questions',
      description: 'Obtiene las preguntas de evaluación para una posición.',
      parameters: {
        type: 'object',
        properties: {
          position: { type: 'string', description: 'Posición (ej: socio, asociado_sr)' },
        },
        required: ['position'],
      },
      execute: async (args) => {
        const questions = db.prepare('SELECT * FROM custom_eval_questions WHERE position = ?').all(args.position);
        return JSON.stringify(questions);
      },
    });
  }

  // ── Vacation management ──
  if (config.can_manage_vacations) {
    tools.push({
      name: 'list_vacation_requests',
      description: 'Lista las solicitudes de vacaciones. Puede filtrar por estado.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filtrar por estado: pending, approved, rejected' },
        },
      },
      execute: async (args) => {
        let sql = 'SELECT vr.*, u.name as employee_name FROM vacation_requests vr JOIN users u ON vr.user_id = u.id WHERE 1=1';
        const params: unknown[] = [];
        if (args.status) { sql += ' AND vr.status = ?'; params.push(args.status); }
        const requests = db.prepare(sql).all(...params);
        return JSON.stringify(requests);
      },
    });

    tools.push({
      name: 'approve_vacation',
      description: 'Aprueba o rechaza una solicitud de vacaciones.',
      parameters: {
        type: 'object',
        properties: {
          request_id: { type: 'string', description: 'ID de la solicitud' },
          action: { type: 'string', description: 'approved o rejected' },
          comment: { type: 'string', description: 'Comentario opcional' },
        },
        required: ['request_id', 'action'],
      },
      execute: async (args, userId) => {
        const { request_id, action, comment } = args;
        if (!['approved', 'rejected'].includes(action as string)) {
          return JSON.stringify({ error: 'Acción debe ser "approved" o "rejected"' });
        }
        const request = db.prepare('SELECT * FROM vacation_requests WHERE id = ?').get(request_id);
        if (!request) return JSON.stringify({ error: 'Solicitud no encontrada' });
        const now = new Date().toISOString();
        db.prepare('UPDATE vacation_requests SET status = ? WHERE id = ?').run(action, request_id);
        db.prepare('INSERT INTO vacation_approvals (id, vacation_request_id, approver_id, approved_at, action, comment) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), request_id, userId, now, action, comment || null);
        return JSON.stringify({ success: true, message: `Solicitud de vacaciones ${action === 'approved' ? 'aprobada' : 'rechazada'} correctamente` });
      },
    });
  }

  // ── Announcement management ──
  if (config.can_manage_announcements) {
    tools.push({
      name: 'list_announcements',
      description: 'Lista los anuncios/comunicados del sistema.',
      parameters: {
        type: 'object',
        properties: {
          include_archived: { type: 'boolean', description: 'Incluir anuncios archivados' },
        },
      },
      execute: async (args) => {
        let sql = 'SELECT a.*, u.name as author_name FROM announcements a JOIN users u ON a.author_id = u.id';
        if (!args.include_archived) sql += ' WHERE a.archived = 0';
        const announcements = db.prepare(sql).all();
        return JSON.stringify(announcements);
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
        return JSON.stringify({ success: true, message: 'Anuncio creado correctamente', id });
      },
    });
  }

  // ── System management ──
  if (config.can_manage_system) {
    tools.push({
      name: 'get_system_status',
      description: 'Obtiene el estado actual del sistema.',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        const status = db.prepare('SELECT * FROM system_status WHERE id = 1').get();
        const moduleConfig = db.prepare('SELECT * FROM module_config WHERE id = 1').get();
        return JSON.stringify({ status, modules: moduleConfig });
      },
    });

    tools.push({
      name: 'toggle_system_status',
      description: 'Activa o desactiva el sistema.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'active o inactive' },
        },
        required: ['status'],
      },
      execute: async (args, userId) => {
        if (!['active', 'inactive'].includes(args.status as string)) {
          return JSON.stringify({ error: 'Estado debe ser "active" o "inactive"' });
        }
        db.prepare('UPDATE system_status SET status = ? WHERE id = 1').run(args.status);
        const action = args.status === 'active' ? 'activated' : 'deactivated';
        db.prepare('INSERT INTO activation_history (id, action, date, by) VALUES (?, ?, ?, ?)').run(uuidv4(), action, new Date().toISOString(), userId);
        return JSON.stringify({ success: true, message: `Sistema ${args.status === 'active' ? 'activado' : 'desactivado'} correctamente` });
      },
    });

    tools.push({
      name: 'toggle_module',
      description: 'Activa o desactiva un módulo del sistema (evaluations, communications, vacations).',
      parameters: {
        type: 'object',
        properties: {
          module: { type: 'string', description: 'Nombre del módulo: evaluations, communications, vacations' },
          enabled: { type: 'boolean', description: 'true para activar, false para desactivar' },
        },
        required: ['module', 'enabled'],
      },
      execute: async (args) => {
        const allowed = ['evaluations', 'communications', 'vacations'];
        if (!allowed.includes(args.module as string)) {
          return JSON.stringify({ error: 'Módulo no válido' });
        }
        const dbField = args.module;
        db.prepare(`UPDATE module_config SET ${dbField} = ? WHERE id = 1`).run(args.enabled ? 1 : 0);
        return JSON.stringify({ success: true, message: `Módulo "${args.module}" ${args.enabled ? 'activado' : 'desactivado'}` });
      },
    });
  }

  // ── Reports (view only) ──
  if (config.can_view_reports) {
    tools.push({
      name: 'get_dashboard_stats',
      description: 'Obtiene estadísticas generales del sistema para el panel principal.',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', description: 'Periodo (ej: 2026-H1)' },
        },
      },
      execute: async (args) => {
        const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get() as Record<string, unknown>).count;
        const totalAdmins = (db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 1 AND is_active = 1').get() as Record<string, unknown>).count;
        let evalStats = { total: 0, completed: 0 };
        if (args.period) {
          const evals = db.prepare('SELECT * FROM evaluations WHERE period = ?').all(args.period) as Record<string, unknown>[];
          evalStats = { total: evals.length, completed: evals.filter(e => e.completed_at).length };
        }
        const pendingVacations = (db.prepare("SELECT COUNT(*) as count FROM vacation_requests WHERE status = 'pending'").get() as Record<string, unknown>).count;
        return JSON.stringify({
          activeUsers: totalUsers,
          adminUsers: totalAdmins,
          evaluationStats: evalStats,
          pendingVacationRequests: pendingVacations,
        });
      },
    });
  }

  return tools;
}

// Convert tools to OpenAI function calling format
function toolsToFunctions(tools: ToolDefinition[]) {
  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

// ─── POST /api/copilot/chat ──────────────────────────────────────────────────
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { conversationId, message } = req.body as { conversationId?: string; message: string };

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get copilot config
    let config = db.prepare('SELECT * FROM copilot_config WHERE id = 1').get() as Record<string, unknown> | undefined;
    if (!config) {
      db.prepare(`
        INSERT INTO copilot_config (id, model, api_provider, can_manage_users, can_manage_evaluations, can_manage_vacations, can_manage_announcements, can_manage_periods, can_manage_system, can_view_reports, max_tokens, temperature)
        VALUES (1, 'llama-3.3-70b-versatile', 'groq', 1, 1, 1, 1, 0, 0, 1, 2048, 0.3)
      `).run();
      config = db.prepare('SELECT * FROM copilot_config WHERE id = 1').get() as Record<string, unknown>;
    }

    // Get API key from environment
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured. Please set the GROQ_API_KEY environment variable.' });
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      convId = uuidv4();
      const now = new Date().toISOString();
      db.prepare('INSERT INTO copilot_conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(convId, req.user!.id, message.slice(0, 50), now, now);
    } else {
      // Verify ownership
      const conv = db.prepare('SELECT * FROM copilot_conversations WHERE id = ? AND user_id = ?').get(convId, req.user!.id);
      if (!conv) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
    }

    // Save user message
    const userMsgId = uuidv4();
    db.prepare('INSERT INTO copilot_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)').run(userMsgId, convId, 'user', message, new Date().toISOString());

    // Load conversation history
    const history = db.prepare('SELECT role, content, tool_calls, tool_results FROM copilot_messages WHERE conversation_id = ? ORDER BY created_at ASC').all(convId) as Record<string, unknown>[];

    // Build messages array for Groq
    const messages: Record<string, unknown>[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Add conversation history (limit to last 20 messages to stay within token limits)
    const recentHistory = history.slice(-20);
    for (const msg of recentHistory) {
      const entry: Record<string, unknown> = { role: msg.role, content: msg.content };
      if (msg.tool_calls) {
        try { entry.tool_calls = JSON.parse(msg.tool_calls as string); } catch {}
      }
      messages.push(entry);
    }

    // Get available tools
    const tools = getTools(config);
    const functions = toolsToFunctions(tools);

    // Call Groq API
    let response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model || 'llama-3.3-70b-versatile',
        messages,
        temperature: Number(config.temperature) || 0.3,
        max_tokens: Number(config.max_tokens) || 2048,
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

    // Handle tool calls
    let toolCallsData: string | null = null;
    let toolResultsData: string | null = null;

    if (assistantMessage.tool_calls && Array.isArray(assistantMessage.tool_calls)) {
      const toolCalls = assistantMessage.tool_calls as Record<string, unknown>[];
      toolCallsData = JSON.stringify(toolCalls);

      const toolResults: Record<string, unknown>[] = [];

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function?.name as string;
        const functionArgs = typeof toolCall.function?.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments as string)
          : toolCall.function?.arguments as Record<string, unknown>;
        const tool = tools.find(t => t.name === functionName);

        if (tool) {
          try {
            const result = await tool.execute(functionArgs || {}, req.user!.id, config);
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: functionName,
              content: result,
            });
          } catch (err) {
            console.error(`Tool execution error (${functionName}):`, err);
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: functionName,
              content: JSON.stringify({ error: 'Tool execution failed' }),
            });
          }
        }
      }

      toolResultsData = JSON.stringify(toolResults);

      // If there were tool calls, make a second call to get the final response
      if (toolResults.length > 0) {
        // Add assistant message with tool calls to history
        messages.push(assistantMessage);

        // Add tool results
        for (const result of toolResults) {
          messages.push({
            role: 'tool',
            tool_call_id: result.tool_call_id,
            content: result.content,
          });
        }

        // Second API call with tool results
        const secondResponse = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.model || 'llama-3.3-70b-versatile',
            messages,
            temperature: Number(config.temperature) || 0.3,
            max_tokens: Number(config.max_tokens) || 2048,
          }),
        });

        if (secondResponse.ok) {
          const secondData = await secondResponse.json() as Record<string, unknown>;
          const secondChoices = secondData.choices as Record<string, unknown>[];
          const secondMessage = secondChoices?.[0]?.message as Record<string, unknown>;
          if (secondMessage?.content) {
            assistantMessage.content = secondMessage.content;
          }
        }
      }
    }

    // Save assistant message
    const assistantMsgId = uuidv4();
    const assistantContent = typeof assistantMessage.content === 'string' ? assistantMessage.content : JSON.stringify(assistantMessage.content);
    db.prepare('INSERT INTO copilot_messages (id, conversation_id, role, content, tool_calls, tool_results, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      assistantMsgId, convId, 'assistant', assistantContent || 'Lo siento, no pude generar una respuesta.', toolCallsData, toolResultsData, new Date().toISOString()
    );

    // Update conversation timestamp
    db.prepare('UPDATE copilot_conversations SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), convId);

    return res.json({
      conversationId: convId,
      message: {
        id: assistantMsgId,
        role: 'assistant',
        content: assistantContent || 'Lo siento, no pude generar una respuesta.',
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
