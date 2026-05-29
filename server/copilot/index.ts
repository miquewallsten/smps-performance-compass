/**
 * Copilot routes — the main entry point for the Copilot API.
 *
 * Route definitions only. All logic is in dedicated modules:
 * - prompt.ts       → system prompt + context builder
 * - intent.ts       → needsTools detection
 * - file-parser.ts  → parseFile + coerceArgs
 * - tools/          → 16 tool definitions
 * - types.ts        → shared types
 */
import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireSuperUser } from '../middleware/rbac.js';
import { buildSystemPrompt } from './prompt.js';
import { needsTools } from './intent.js';
import { parseFile, coerceArgs } from './file-parser.js';
import { getTools } from './tools/index.js';
import { toolsToFunctions } from './types.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    cb(null, ['.csv', '.xlsx', '.xls', '.json', '.txt', '.md'].includes(ext));
  },
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

// ─── CONFIG ──────────────────────────────────────────────────────────────────
router.get('/config', async (_req: Request, res: Response) => {
  try {
    let cfg = await db.get('SELECT * FROM copilot_config WHERE id=1') as Record<string, unknown> | undefined;
    if (!cfg) {
      await db.run("INSERT INTO copilot_config (id,model,api_provider,api_base_url,api_key,can_manage_users,can_manage_evaluations,can_manage_vacations,can_manage_announcements,can_manage_periods,can_manage_system,can_view_reports,max_tokens,temperature) VALUES(1,'qwen3.5:397b','ollama',NULL,NULL,1,1,1,1,1,1,1,4096,0.3)");
      cfg = await db.get('SELECT * FROM copilot_config WHERE id=1') as Record<string, unknown>;
    }
    if (cfg?.api_key && typeof cfg.api_key === 'string' && cfg.api_key.length > 8) {
      cfg = { ...cfg, api_key: (cfg.api_key as string).slice(0, 4) + '••••' + (cfg.api_key as string).slice(-4) };
    }
    res.json(cfg);
  } catch (e) { console.error('Config error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/config', async (req: Request, res: Response) => {
  try {
    const fieldMap: Record<string, string> = {
      model: 'model', apiProvider: 'api_provider', api_provider: 'api_provider',
      apiBaseUrl: 'api_base_url', api_base_url: 'api_base_url',
      apiKey: 'api_key', api_key: 'api_key',
      canManageUsers: 'can_manage_users', canManageEvaluations: 'can_manage_evaluations',
      canManageVacations: 'can_manage_vacations', canManageAnnouncements: 'can_manage_announcements',
      canManagePeriods: 'can_manage_periods', canManageSystem: 'can_manage_system',
      canViewReports: 'can_view_reports', maxTokens: 'max_tokens', temperature: 'temperature',
    };
    const booleanFields = new Set(['can_manage_users','can_manage_evaluations','can_manage_vacations','can_manage_announcements','can_manage_periods','can_manage_system','can_view_reports']);
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(req.body)) {
      const col = fieldMap[key] || (key.includes('_') ? key : null);
      if (!col) continue;
      if (col === 'api_key') {
        if (!value || (typeof value === 'string' && value.includes('•'))) continue;
        updates.push('api_key=?'); values.push(value);
      } else if (booleanFields.has(col)) {
        updates.push(`${col}=?`); values.push(value ? 1 : 0);
      } else {
        updates.push(`${col}=?`); values.push(value);
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

// ─── CONVERSATIONS ────────────────────────────────────────────────────────────
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const convs = await db.all('SELECT * FROM copilot_conversations WHERE user_id=? ORDER BY updated_at DESC', [req.user!.id]);
    res.json(convs);
  } catch (e) { console.error('List conversations error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const conv = await db.get('SELECT * FROM copilot_conversations WHERE id=? AND user_id=?', [req.params.id, req.user!.id]);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    const msgs = await db.all('SELECT id,role,content,created_at FROM copilot_messages WHERE conversation_id=? ORDER BY created_at', [req.params.id]);
    res.json({ ...conv, messages: msgs });
  } catch (e) { console.error('Get conversation error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/conversations/:id', async (req: Request, res: Response) => {
  try {
    await db.run('DELETE FROM copilot_messages WHERE conversation_id=?', [req.params.id]);
    await db.run('DELETE FROM copilot_conversations WHERE id=? AND user_id=?', [req.params.id, req.user!.id]);
    res.json({ ok: true });
  } catch (e) { console.error('Delete conversation error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/conversations', async (req: Request, res: Response) => {
  try {
    const convs = await db.all('SELECT id FROM copilot_conversations WHERE user_id=?', [req.user!.id]);
    for (const c of convs) {
      await db.run('DELETE FROM copilot_messages WHERE conversation_id=?', [c.id]);
    }
    await db.run('DELETE FROM copilot_conversations WHERE user_id=?', [req.user!.id]);
    res.json({ ok: true, deleted: convs.length });
  } catch (e) { console.error('Clear conversations error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

// ─── CHAT ─────────────────────────────────────────────────────────────────────
router.post('/chat', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { message, conversationId } = req.body as { message?: string; conversationId?: string };
    if (!message && !req.file) return res.status(400).json({ error: 'Message or file required' });

    const cfg = await db.get('SELECT * FROM copilot_config WHERE id=1') as Record<string, unknown>;
    if (!cfg) return res.status(500).json({ error: 'Copilot not configured' });

    const endpoint = (cfg.api_base_url as string) || process.env.OLLAMA_BASE_URL || 'https://ollama.com/v1';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cfg.api_key) headers['Authorization'] = `Bearer ${cfg.api_key}`;
    else if (process.env.OLLAMA_API_KEY) headers['Authorization'] = `Bearer ${process.env.OLLAMA_API_KEY}`;

    // Parse uploaded file
    let fileContent = '';
    if (req.file) fileContent = parseFile(req.file.buffer, req.file.originalname);

    const fullMessage = fileContent ? `${message || ''}\n\nAttached file content:\n${fileContent}` : message || '';
    const userName = req.user!.name;
    const convId = conversationId || uuidv4();

    // Create conversation if new
    if (!conversationId) {
      await db.run('INSERT INTO copilot_conversations (id,user_id,title,created_at,updated_at) VALUES(?,?,?,?,?)',
        [convId, req.user!.id, (message || 'New conversation').slice(0, 100), new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')]);
    }

    // Save user message
    await db.run('INSERT INTO copilot_messages (id,conversation_id,role,content,created_at) VALUES(?,?,?,?,?)',
      [uuidv4(), convId, 'user', fullMessage, new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')]);

    // Load conversation history
    const history = (await db.all('SELECT role, content FROM copilot_messages WHERE conversation_id=? ORDER BY created_at', [convId])).reverse() as Record<string, unknown>[];

    const useTools = needsTools(fullMessage, !!fileContent);
    const messages: Record<string, unknown>[] = [{ role: 'system', content: await buildSystemPrompt(cfg, userName, useTools) }];
    for (const m of history) messages.push({ role: m.role, content: m.content });

    const tools = useTools ? getTools(cfg) : [];
    const fns = toolsToFunctions(tools);
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
