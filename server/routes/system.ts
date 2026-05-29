import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, tx } from '../db/connection.js';
import { signToken, getRole } from '../auth/jwt.js';
import { hashPassword, hashSecurityAnswer } from '../auth/security.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate, SystemInitSchema } from '../middleware/validate.js';
import { requireSuperUser } from '../middleware/rbac.js';
import { WORK_AREAS, POSITION_CATALOG } from '../data/positionCatalog.js';

const router = Router();

// Helper to strip sensitive fields from a user row
function sanitizeUser(user: Record<string, unknown>) {
  const { password_hash, security_answer, ...safe } = user;
  return safe;
}

// Vacation config defaults per position
const VACATION_DEFAULTS: Record<string, number> = {
  socio: 20,
  salary_partner: 20,
  counsel: 20,
  asociado_sr: 15,
  asociado_mid: 15,
  asociado_jr: 10,
  pasante: 10,
  pasante_carrera: 10,
  director: 20,
  gerente: 15,
  coordinador: 15,
  analista: 10,
  asistente: 10,
  soporte: 10,
  archivista: 10,
};

// ─── GET /api/system/initialized ──────────────────────────────────────────────
router.get('/initialized', async (_req: Request, res: Response) => {
  try {
    const row = await db.get('SELECT id FROM system_status LIMIT 1');
    return res.json({ initialized: !!row });
  } catch (err) {
    console.error('Check initialized error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/system/init ───────────────────────────────────────────────────
router.post('/init', validate(SystemInitSchema), async (req: Request, res: Response) => {
  try {
    // Check if already initialized
    const existing = await db.get('SELECT id FROM system_status LIMIT 1');
    if (existing) {
      return res.status(409).json({ error: 'System is already initialized' });
    }

    const { name, email, password, securityQuestion, securityAnswer } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      securityQuestion?: string;
      securityAnswer?: string;
    };

    if (!name || !email || !password || !securityQuestion || !securityAnswer) {
      return res.status(400).json({ error: 'Name, email, password, security question, and security answer are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already taken
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '').replace('T', ' ').replace(/\.\d{3}Z$/, '');
    const userId = uuidv4();

    // Hash password and security answer
    const hashedPassword = await hashPassword(password);
    const hashedAnswer = await hashSecurityAnswer(securityAnswer);

    // Run all seeding in a transaction
    await db.transaction(async (conn) => {
      // 1. Create super admin user
      await tx.run(conn,
        `INSERT INTO users (id, email, password_hash, security_question, security_answer, name, position, is_admin, is_super_user, is_managing_partner, is_active, must_change_password, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1, 1, 0, ?, ?)`,
        [userId, email, hashedPassword, securityQuestion, hashedAnswer, name, 'socio', now, now]);

      // 2. Seed work areas
      for (const area of WORK_AREAS) {
        await tx.run(conn,
          `INSERT INTO work_areas (id, label, level, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [area.id, area.label, area.level, area.sortOrder, now, now]);
      }

      // 3. Seed all custom positions
      for (const pos of POSITION_CATALOG) {
        await tx.run(conn,
          `INSERT INTO custom_positions (id, label, work_area_id, base_position, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [pos.cve, pos.label, pos.workAreaId, pos.basePosition, now, now]);
      }

      // 4. Seed vacation config defaults
      for (const [position, days] of Object.entries(VACATION_DEFAULTS)) {
        await tx.run(conn,
          `INSERT INTO vacation_config (position, days) VALUES (?, ?)`,
          [position, days]);
      }

      // 5. Seed module config (all enabled)
      await tx.run(conn,
        `INSERT INTO module_config (id, evaluations, communications, vacations, copilot) VALUES (1, 1, 1, 1, 1)`);

      // 6. Seed system status
      await tx.run(conn,
        `INSERT INTO system_status (id, status, activation_date, payment_plan, max_users, max_admin_users, tickets) VALUES (1, 'active', ?, 'monthly', 50, 3, 0)`,
        [now]);

      // 7. Seed activation history
      await tx.run(conn,
        `INSERT INTO activation_history (id, action, date, by_user_id) VALUES (?, 'activated', ?, ?)`,
        [uuidv4(), now, userId]);
    });

    // Generate JWT token for the new admin
    const role = getRole({ isAdmin: true, isSuperUser: true });
    const token = signToken({
      sub: userId,
      email,
      role,
      name,
    });

    // Fetch the created user to return
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]) as Record<string, unknown>;

    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('System init error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/system/status ──────────────────────────────────────────────────
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const row = await db.get('SELECT * FROM system_status LIMIT 1');
    if (!row) {
      return res.status(404).json({ error: 'System not initialized' });
    }
    return res.json(row);
  } catch (err) {
    console.error('Get system status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/system/status ────────────────────────────────────────────────
router.patch('/status', authMiddleware, requireSuperUser, async (req: Request, res: Response) => {
  try {
    const { status, activationDate, paymentPlan, maxUsers, tickets, maxAdminUsers } = req.body as {
      status?: string;
      activationDate?: string;
      paymentPlan?: string;
      maxUsers?: number;
      tickets?: number;
      maxAdminUsers?: number;
    };

    // Build dynamic SET clause
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ error: 'Status must be "active" or "inactive"' });
      }
      updates.push('status = ?');
      values.push(status);

      // Log activation/deactivation
      const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
      const action = status === 'active' ? 'activated' : 'deactivated';
      await db.run(
        `INSERT INTO activation_history (id, action, date, by_user_id) VALUES (?, ?, ?, ?)`,
        [uuidv4(), action, now, req.user!.id]);
    }

    if (activationDate !== undefined) {
      updates.push('activation_date = ?');
      values.push(activationDate);
    }

    if (paymentPlan !== undefined) {
      if (!['monthly', 'annual'].includes(paymentPlan)) {
        return res.status(400).json({ error: 'Payment plan must be "monthly" or "annual"' });
      }
      updates.push('payment_plan = ?');
      values.push(paymentPlan);
    }

    if (maxUsers !== undefined) {
      if (typeof maxUsers !== 'number' || maxUsers < 1) {
        return res.status(400).json({ error: 'maxUsers must be a positive number' });
      }
      updates.push('max_users = ?');
      values.push(maxUsers);
    }

    if (tickets !== undefined) {
      if (typeof tickets !== 'number' || tickets < 0) {
        return res.status(400).json({ error: 'tickets must be a non-negative number' });
      }
      updates.push('tickets = ?');
      values.push(tickets);
    }

    if (maxAdminUsers !== undefined) {
      if (typeof maxAdminUsers !== 'number' || maxAdminUsers < 1) {
        return res.status(400).json({ error: 'maxAdminUsers must be a positive number' });
      }
      updates.push('max_admin_users = ?');
      values.push(maxAdminUsers);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await db.run(`UPDATE system_status SET ${updates.join(', ')} WHERE id = 1`, values);

    const row = await db.get('SELECT * FROM system_status LIMIT 1');
    return res.json(row);
  } catch (err) {
    console.error('Patch system status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/system/modules ─────────────────────────────────────────────────
router.get('/modules', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const row = await db.get('SELECT * FROM module_config LIMIT 1');
    if (!row) {
      return res.status(404).json({ error: 'Module config not found' });
    }
    return res.json(row);
  } catch (err) {
    console.error('Get modules error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/system/modules ───────────────────────────────────────────────
router.patch('/modules', authMiddleware, requireSuperUser, async (req: Request, res: Response) => {
  try {
    const { evaluations, communications, vacations, copilot } = req.body as {
      evaluations?: boolean;
      communications?: boolean;
      vacations?: boolean;
      copilot?: boolean;
    };

    // Build dynamic SET clause
    const updates: string[] = [];
    const values: (number | string)[] = [];

    if (evaluations !== undefined) {
      updates.push('evaluations = ?');
      values.push(evaluations ? 1 : 0);
    }
    if (communications !== undefined) {
      updates.push('communications = ?');
      values.push(communications ? 1 : 0);
    }
    if (vacations !== undefined) {
      updates.push('vacations = ?');
      values.push(vacations ? 1 : 0);
    }
    if (copilot !== undefined) {
      updates.push('copilot = ?');
      values.push(copilot ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await db.run(`UPDATE module_config SET ${updates.join(', ')} WHERE id = 1`, values);

    const row = await db.get('SELECT * FROM module_config LIMIT 1');
    return res.json(row);
  } catch (err) {
    console.error('Patch modules error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/system/activation-history ──────────────────────────────────────
router.get('/activation-history', authMiddleware, requireSuperUser, async (_req: Request, res: Response) => {
  try {
    const rows = await db.all('SELECT * FROM activation_history ORDER BY date DESC');
    return res.json(rows);
  } catch (err) {
    console.error('Get activation history error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

// ─── POST /api/system/backfill-timeline ───────────────────────────────
// Backfill timeline events from historical data (SuperUser only)
router.post('/backfill-timeline', authMiddleware, requireSuperUser, async (req: Request, res: Response) => {
  try {
    const { v4: uuidv4 } = await import('uuid');
    let totalCreated = 0;

    // 1. User hire events
    const users = await db.all('SELECT id, name, position, is_super_user, created_at FROM users ORDER BY created_at ASC');
    for (const user of users) {
      const existing = await db.get("SELECT id FROM user_timeline WHERE user_id = ? AND event_type = 'hire'", [user.id]);
      if (existing) continue;
      const note = user.is_super_user ? 'SuperAdmin del sistema' : user.position === 'socio' ? 'Socio fundador' : 'Usuario registrado en el sistema';
      await db.run(
        `INSERT INTO user_timeline (id, user_id, event_type, event_date, metadata, note, created_by, created_at, updated_at) VALUES (?, ?, 'hire', ?, ?, ?, null, ?, ?)`,
        [uuidv4(), user.id, user.created_at, JSON.stringify({ position: user.position }), note, user.created_at, user.created_at]
      );
      totalCreated++;
    }

    // 2. Evaluation completion events
    const evals = await db.all(`
      SELECT e.id, e.evaluated_id, e.evaluator_id, e.type, e.total_score, e.completed_at, e.period,
             u.name as evaluator_name
      FROM evaluations e LEFT JOIN users u ON e.evaluator_id = u.id
      WHERE e.completed_at IS NOT NULL ORDER BY e.completed_at ASC
    `);
    const evalLabels: Record<string, string> = { self: 'Autoevaluación', supervisor: 'Evaluación de Supervisor', feedback: 'Sesión de Feedback' };
    for (const ev of evals) {
      const existing = await db.get("SELECT id FROM user_timeline WHERE user_id = ? AND event_type = 'evaluation_completed' AND metadata LIKE ?", [ev.evaluated_id, `%${ev.id}%`]);
      if (existing) continue;
      const metadata = { evalId: ev.id, evalType: ev.type, score: Math.round(ev.total_score), period: ev.period, evaluatorName: ev.evaluator_name };
      await db.run(
        `INSERT INTO user_timeline (id, user_id, event_type, event_date, metadata, note, created_by, created_at, updated_at) VALUES (?, ?, 'evaluation_completed', ?, ?, ?, null, ?, ?)`,
        [uuidv4(), ev.evaluated_id, ev.completed_at, JSON.stringify(metadata), `${evalLabels[ev.type] || ev.type} completada — ${Math.round(ev.total_score)}% — Periodo ${ev.period}`, ev.completed_at, ev.completed_at]
      );
      totalCreated++;
    }

    // 3. Supervisor assignment events
    const assignments = await db.all(`
      SELECT sa.employee_id, sa.supervisor_id, sa.period, su.name as supervisor_name
      FROM supervisor_assignments sa LEFT JOIN users su ON sa.supervisor_id = su.id
      ORDER BY sa.period ASC
    `);
    for (const asgn of assignments) {
      const existing = await db.get("SELECT id FROM user_timeline WHERE user_id = ? AND event_type = 'supervisor_assigned' AND metadata LIKE ?", [asgn.employee_id, `%${asgn.supervisor_id}%${asgn.period}%`]);
      if (existing) continue;
      const year = asgn.period.includes('H') ? asgn.period.replace('H', '20') : '2026';
      const periodDate = `${year}-01-15 00:00:00`;
      const metadata = { supervisorId: asgn.supervisor_id, supervisorName: asgn.supervisor_name, period: asgn.period };
      await db.run(
        `INSERT INTO user_timeline (id, user_id, event_type, event_date, metadata, note, created_by, created_at, updated_at) VALUES (?, ?, 'supervisor_assigned', ?, ?, ?, null, ?, ?)`,
        [uuidv4(), asgn.employee_id, periodDate, JSON.stringify(metadata), `${asgn.supervisor_name} asignado como supervisor — ${asgn.period}`, periodDate, periodDate]
      );
      totalCreated++;
    }

    return res.json({ status: 'complete', eventsCreated: totalCreated });
  } catch (err) {
    console.error('Backfill timeline error:', err);
    return res.status(500).json({ error: 'Backfill failed' });
  }
});
