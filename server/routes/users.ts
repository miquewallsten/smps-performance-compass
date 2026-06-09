import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import { hashPassword, hashSecurityAnswer } from '../auth/security.js';
import { generateTokenPair } from '../services/tokens.js';
import { sendActivationEmail, sendAdminPasswordResetEmail } from '../services/email.js';
import { auditLog, getClientIp, getUserAgent } from '../services/audit.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin, requireSelfOrAdmin } from '../middleware/rbac.js';
import { hasRole, normalizeRole, isSupervisorOf } from '../middleware/permissions.js';
import { validate, CreateUserSchema } from '../middleware/validate.js';
import { sanitizeUser, toMySQLDate } from '../utils/helpers.js';

const router = Router();


// Get the configured max admin user limit from system_status (default 3)
async function getMaxAdminUsers(): Promise<number> {
  try {
    const row = await db.get('SELECT max_admin_users FROM system_status WHERE id = 1') as Record<string, unknown> | undefined;
    return (row?.max_admin_users as number) || 3;
  } catch {
    return 3; // fallback default
  }
}

// Columns to select for safe user responses (excludes password_hash and security_answer)
const SAFE_USER_COLUMNS = `id, name, email, position, practice_area, custom_position_id, location_id, is_admin, is_super_user, is_managing_partner, is_active, must_change_password, created_at, updated_at`;

// ─── GET /api/users ──────────────────────────────────────────────────────
// Authorization: super_user, admin, socio → see all users
// employee → 403 (user listing is admin-only; employees use GET /api/users/:id)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Only super_user, admin, and socio may list all users
    if (!hasRole(req.user!, ['super_user', 'admin', 'socio'])) {
      await auditLog({ action: 'authorization_denied', userId: req.user!.id, ipAddress: getClientIp(req), userAgent: getUserAgent(req), metadata: { resource: 'GET /api/users', reason: 'employee cannot list users' } });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const allUsers = await db.all(`SELECT ${SAFE_USER_COLUMNS} FROM users`);
    return res.json(allUsers);
  } catch (err) {
    console.error('List users error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/users/:id ────────────────────────────────────────────────────
// Authorization: self, direct supervisor, admin, super_user, socio
// Deny: unrelated employees → 403
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const targetId = req.params.id;
    const userId = req.user!.id;

    // Admin, super_user, and socio can see any user
    if (hasRole(req.user!, ['super_user', 'admin', 'socio'])) {
      const user = await db.get(`SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = ?`, [targetId]) as Record<string, unknown> | undefined;
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json(sanitizeUser(user));
    }

    // Self can always see their own profile
    if (userId === targetId) {
      const user = await db.get(`SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = ?`, [targetId]) as Record<string, unknown> | undefined;
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json(sanitizeUser(user));
    }

    // Check if user is the direct supervisor of the target OR is supervised by the target
    const isDirectSupervisor = await isSupervisorOf(userId, targetId);
    const isSupervisedBy = await isSupervisorOf(targetId, userId);
    if (isDirectSupervisor || isSupervisedBy) {
      const user = await db.get(`SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = ?`, [targetId]) as Record<string, unknown> | undefined;
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json(sanitizeUser(user));
    }

    // Unrelated employee — deny
    await auditLog({ action: 'authorization_denied', userId: req.user!.id, ipAddress: getClientIp(req), userAgent: getUserAgent(req), metadata: { resource: 'GET /api/users/:id', targetId, reason: 'unrelated employee' } });
    return res.status(403).json({ error: 'Access denied' });
  } catch (err) {
    console.error('Get user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/users ─────────────────────────────────────────────────────
router.post('/', authMiddleware, requireAdmin, validate(CreateUserSchema), async (req: Request, res: Response) => {
  try {
    const { name, email, position, password, practiceArea, customPositionId, locationId, isAdmin, isManagingPartner } = req.body as {
      name?: string;
      email?: string;
      position?: string;
      password?: string;
      practiceArea?: string;
      customPositionId?: string;
      locationId?: string;
      isAdmin?: boolean;
      isManagingPartner?: boolean;
    };

    if (!name || !email || !position) {
      return res.status(400).json({ error: 'Name, email, and position are required' });
    }

    // Password is optional — if not provided, user will be activated via email link
    const useActivation = !password;

    // Check email uniqueness
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    // Enforce role limits
    const finalIsAdmin = isAdmin ? 1 : 0;
    const finalIsMP = isManagingPartner ? 1 : 0;

    if (finalIsMP) {
      const currentMPs = await db.all('SELECT id, name FROM users WHERE is_managing_partner = 1 AND is_super_user = 0');
      if (currentMPs.length >= 1) {
        const mpName = currentMPs[0]?.name || 'otro usuario';
        return res.status(409).json({ error: `Solo puede haber un Socio Administrador. Actualmente es ${mpName}.` });
      }
    }

    if (finalIsAdmin && !isManagingPartner) {
      const maxAdminUsers = await getMaxAdminUsers();
      const currentAdmins = await db.all('SELECT id FROM users WHERE is_admin = 1 AND is_super_user = 0');
      if (currentAdmins.length >= maxAdminUsers) {
        return res.status(409).json({ error: `Máximo ${maxAdminUsers} Usuario Administrador permitidos. Quite permisos a otro primero.` });
      }
    }

    const id = uuidv4();
    const now = toMySQLDate();
    let hashedPassword: string | null = null;
    let activationTokenHash: string | null = null;
    let activationExpiresAt: string | null = null;
    let activationToken: string | null = null;
    let isActive = 1;
    let mustChangePassword = 0;

    if (useActivation) {
      // New flow: generate activation token, user sets their own password
      const tokenPair = generateTokenPair();
      activationToken = tokenPair.token;
      activationTokenHash = tokenPair.tokenHash;
      activationExpiresAt = toMySQLDate(new Date(Date.now() + 48 * 60 * 60 * 1000)); // 48 hours
      isActive = 0; // Not active until they activate
      mustChangePassword = 0;
    } else {
      // Legacy flow: admin sets password
      hashedPassword = await hashPassword(password!);
      mustChangePassword = 1;
    }

    const securityQuestion = '¿Cuál es su correo electrónico?';
    const hashedAnswer = await hashSecurityAnswer(email);

    await db.run(
      `INSERT INTO users (id, email, password_hash, security_question, security_answer, name, position, practice_area, custom_position_id, location_id, is_admin, is_super_user, is_managing_partner, is_active, must_change_password, activation_token_hash, activation_expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        email,
        hashedPassword,
        securityQuestion,
        hashedAnswer,
        name,
        position,
        practiceArea ?? null,
        customPositionId ?? null,
        locationId ?? null,
        finalIsAdmin,
        0, // isSuperUser is always false for admin-created users
        finalIsMP,
        isActive,
        mustChangePassword,
        activationTokenHash,
        activationExpiresAt,
        now,
        now
      ]
    );

    // Send activation email if using new flow
    if (useActivation && activationToken) {
      const emailSent = await sendActivationEmail(email, name, activationToken);
      if (!emailSent) {
        console.warn(`Failed to send activation email to ${email}. Admin should share the activation link manually.`);
      }
    }

    const user = await db.get(`SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = ?`, [id]) as Record<string, unknown>;
    // Audit log for user creation
    await auditLog({ action: 'user_created', userId: id, ipAddress: getClientIp(req), userAgent: getUserAgent(req), metadata: { createdBy: req.user!.id, useActivation, email } });
    // Log hire event to timeline
    await logTimelineEvent(id, 'hire', {
      newValue: position,
      metadata: { practiceArea: practiceArea || null, customPositionId: customPositionId || null, locationId: locationId || null, isAdmin: !!finalIsAdmin, isManagingPartner: !!finalIsMP },
      note: 'Usuario creado',
      createdBy: req.user!.id
    });
    const response: Record<string, unknown> = sanitizeUser(user);
    if (useActivation) {
      response.activationSent = true;
      // Include activation link only if email failed (for admin to share manually)
      if (!activationToken) {
        // Token wasn't generated (shouldn't happen)
      }
      // Don't include the token in the API response for security
      // The activation link was sent via email
    }
    return res.status(201).json(response);
  } catch (err) {
    console.error('Create user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/users/:id ────────────────────────────────────────────────
router.patch('/:id', authMiddleware, requireSelfOrAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]) as Record<string, unknown> | undefined;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isAdminUser = req.user!.role === 'admin' || req.user!.role === 'super_user';
    const isSelf = req.user!.id === id;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (isAdminUser) {
      // Admin can change all fields including role fields
      const { name, email, position, practiceArea, customPositionId, locationId, isActive, isAdmin, isManagingPartner, isSuperUser } = req.body as {
        name?: string;
        email?: string;
        position?: string;
        practiceArea?: string;
        customPositionId?: string;
        locationId?: string;
        isActive?: boolean;
        isAdmin?: boolean;
        isManagingPartner?: boolean;
        isSuperUser?: boolean;
      };

      if (name !== undefined) { updates.push('name = ?'); values.push(name); }
      if (email !== undefined) { updates.push('email = ?'); values.push(email); }
      if (position !== undefined) { updates.push('position = ?'); values.push(position); }
      if (practiceArea !== undefined) { updates.push('practice_area = ?'); values.push(practiceArea); }
      if (customPositionId !== undefined) { updates.push('custom_position_id = ?'); values.push(customPositionId); }
      if (locationId !== undefined) { updates.push('location_id = ?'); values.push(locationId); }
      if (isActive !== undefined) { updates.push('is_active = ?'); values.push(isActive ? 1 : 0); }

      // Role fields with validation - only validate when the value is CHANGING
      const currentIsMP = !!(user.is_managing_partner === 1 || user.is_managing_partner === true);
      const currentIsAdmin = !!(user.is_admin === 1 || user.is_admin === true);
      const currentIsSU = !!(user.is_super_user === 1 || user.is_super_user === true);

      if (isManagingPartner !== undefined) {
        const newMP = !!isManagingPartner;
        if (newMP !== currentIsMP) {
          // Only validate if actually changing the MP role
          if (newMP) {
            const currentMPs = await db.all('SELECT id, name FROM users WHERE is_managing_partner = 1 AND is_super_user = 0 AND id != ?', [id]);
            if (currentMPs.length >= 1) {
              const mpName = currentMPs[0]?.name || 'otro usuario';
              return res.status(409).json({ error: `Solo puede haber un Socio Administrador. Actualmente es ${mpName}.` });
            }
          }
        }
        updates.push('is_managing_partner = ?'); values.push(newMP ? 1 : 0);
        // If setting isManagingPartner=true, also ensure isAdmin=true
        if (newMP && isAdmin === undefined) {
          updates.push('is_admin = ?'); values.push(1);
        }
      }
      if (isAdmin !== undefined) {
        const newAdmin = !!isAdmin;
        if (newAdmin !== currentIsAdmin) {
          // Only validate if actually changing the admin role
          if (!newAdmin && currentIsMP) {
            return res.status(409).json({ error: 'No se puede quitar el rol de Administrador al Socio Administrador. Quite primero el rol de Socio Administrador.' });
          }
          if (newAdmin) {
            const maxAdminUsers = await getMaxAdminUsers();
            const currentAdmins = await db.all('SELECT id FROM users WHERE is_admin = 1 AND is_super_user = 0 AND id != ?', [id]);
            if (currentAdmins.length >= maxAdminUsers) {
              return res.status(409).json({ error: `Máximo ${maxAdminUsers} Usuario Administrador permitidos. Quite permisos a otro primero.` });
            }
          }
        }
        updates.push('is_admin = ?'); values.push(newAdmin ? 1 : 0);
      }
      if (isSuperUser !== undefined) {
        if (req.user!.role !== 'super_user') {
          return res.status(403).json({ error: 'Only super users can modify super user status' });
        }
        // Cannot demote yourself from super_user
        if (req.user!.id === id && !isSuperUser) {
          return res.status(403).json({ error: 'Cannot demote yourself from super user' });
        }
        updates.push('is_super_user = ?'); values.push(isSuperUser ? 1 : 0);
      }
      // Log position changes and reactivation to timeline
      if (updates.length > 0) {
        if (position !== undefined && position !== user.position) {
          const changeType = /* rank comparison */ 'lateral_move'; // simplified
          await logTimelineEvent(id, 'position_change', {
            oldValue: user.position as string,
            newValue: position,
            metadata: { customPositionId: customPositionId || null, changeType },
            note: `Posición cambiada: ${(user.position as string)} → ${position}`,
            createdBy: req.user!.id
          });
        }
        if (isActive === true && (user.is_active === 0 || user.is_active === false)) {
          await logTimelineEvent(id, 'reactivation', {
            note: 'Usuario reactivado',
            createdBy: req.user!.id
          });
        }
      }
    } else if (isSelf) {
      // Self can only change name and email
      const { name, email } = req.body as { name?: string; email?: string };

      if (name !== undefined) { updates.push('name = ?'); values.push(name); }
      if (email !== undefined) { updates.push('email = ?'); values.push(email); }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = ?');
    values.push(toMySQLDate());
    values.push(id);

    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    const updatedUser = await db.get(`SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = ?`, [id]) as Record<string, unknown>;
    return res.json(sanitizeUser(updatedUser));
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/users/:id ────────────────────────────────────────────────
router.delete('/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    await db.run('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?', [now, id]);
    // Log termination event
    await logTimelineEvent(id, 'termination', { note: 'Usuario desactivado', createdBy: req.user!.id });

    return res.json({ message: 'User deactivated successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/users/:id/reset-password ───────────────────────────────────
// Admin triggers a password reset email for the user.
// The admin does NOT set the password — the user sets it themselves via email link.
router.post('/:id/reset-password', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await db.get('SELECT id, email, name, is_active FROM users WHERE id = ?', [id]) as Record<string, unknown> | undefined;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate a password reset token with 24-hour expiry (admin-triggered)
    const { token, tokenHash } = generateTokenPair();
    const expiresAt = toMySQLDate(new Date(Date.now() + 24 * 60 * 60 * 1000)); // 24 hours
    const now = toMySQLDate(new Date());

    await db.run(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), id, tokenHash, expiresAt, getClientIp(req), now]
    );

    // Send reset email
    const emailSent = await sendAdminPasswordResetEmail(user.email as string, user.name as string, token);

    await auditLog({
      action: 'admin_password_reset_requested',
      userId: id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: { adminId: req.user!.id, emailSent },
    });

    // Log timeline event
    await logTimelineEvent(id, 'password_reset', { note: 'Correo de restablecimiento enviado por administrador', createdBy: req.user!.id });

    const response: Record<string, unknown> = { message: 'Se ha enviado un correo para restablecer la contraseña.' };
    if (!emailSent) {
      // Include the reset link if email failed, so admin can share it manually
      const resetLink = `${process.env.APP_URL || 'https://smps.bowdot.online'}/reset-password?token=${token}`;
      response.resetLink = resetLink;
      response.message = 'No se pudo enviar el correo. Comparta el enlace de restablecimiento manualmente.';
    }
    return res.json(response);
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/users/:id/role ───────────────────────────────────────────
router.patch('/:id/role', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isAdmin, isManagingPartner, isSuperUser } = req.body as {
      isAdmin?: boolean;
      isManagingPartner?: boolean;
      isSuperUser?: boolean;
    };

    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]) as Record<string, unknown> | undefined;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    // Enforce role limits: max 1 Socio Administrador (excluding super_users), max 2 Usuario Administrador (excluding super_users)
    if (isManagingPartner !== undefined && isManagingPartner) {
      // Count current managing partners (excluding super_users who are exempt from the limit)
      const currentMPs = await db.all('SELECT id, name FROM users WHERE is_managing_partner = 1 AND is_super_user = 0 AND id != ?', [id]);
      if (currentMPs.length >= 1) {
        const mpName = currentMPs[0]?.name || 'otro usuario';
        return res.status(409).json({ error: `Solo puede haber un Socio Administrador. Actualmente es ${mpName}.` });
      }
      updates.push('is_managing_partner = ?'); values.push(1);
      // Managing Partner must also be admin
      updates.push('is_admin = ?'); values.push(1);
    } else if (isManagingPartner !== undefined && !isManagingPartner) {
      updates.push('is_managing_partner = ?'); values.push(0);
    }

    if (isAdmin !== undefined) {
      // Cannot remove admin from a Managing Partner
      if (!isAdmin && (user.is_managing_partner === 1 || user.is_managing_partner === true)) {
        return res.status(409).json({ error: 'No se puede quitar el rol de Administrador al Socio Administrador. Quite primero el rol de Socio Administrador.' });
      }
      if (isAdmin) {
        const maxAdminUsers = await getMaxAdminUsers();
        const currentAdmins = await db.all('SELECT id FROM users WHERE is_admin = 1 AND is_super_user = 0 AND id != ?', [id]);
        if (currentAdmins.length >= maxAdminUsers) {
          return res.status(409).json({ error: `Máximo ${maxAdminUsers} Usuario Administrador permitidos. Quite permisos a otro primero.` });
        }
      }
      updates.push('is_admin = ?'); values.push(isAdmin ? 1 : 0);
    }

    // Can only modify isSuperUser if you ARE a super_user
    if (isSuperUser !== undefined) {
      if (req.user!.role !== 'super_user') {
        return res.status(403).json({ error: 'Only super users can modify super user status' });
      }
      // Cannot demote yourself from super_user
      if (req.user!.id === id && !isSuperUser) {
        return res.status(403).json({ error: 'Cannot demote yourself from super user' });
      }
      updates.push('is_super_user = ?');
      values.push(isSuperUser ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = ?');
    values.push(toMySQLDate());
    values.push(id);

    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    // Log role changes
    const roleChanges: string[] = [];
    if (isManagingPartner !== undefined) {
      roleChanges.push(isManagingPartner ? 'Socio Administrador' : 'Removido como Socio Administrador');
    }
    if (isAdmin !== undefined) {
      roleChanges.push(isAdmin ? 'Usuario Administrador' : 'Removido como Administrador');
    }
    if (isSuperUser !== undefined && req.user!.role === 'super_user') {
      roleChanges.push(isSuperUser ? 'SuperUser' : 'Removido como SuperUser');
    }
    if (roleChanges.length > 0) {
      await logTimelineEvent(id, 'role_change', {
        metadata: { changes: roleChanges },
        note: roleChanges.join(', '),
        createdBy: req.user!.id
      });
    }

    const updatedUser = await db.get(`SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = ?`, [id]) as Record<string, unknown>;
    return res.json(sanitizeUser(updatedUser));
  } catch (err) {
    console.error('Update role error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

// ─── Timeline event logging helpers ────────────────────────────────────────
// These are exported so other route files can call them to auto-log events

export async function logTimelineEvent(
  userId: string,
  eventType: string,
  options: {
    oldValue?: string;
    newValue?: string;
    metadata?: Record<string, unknown>;
    note?: string;
    createdBy?: string;
  } = {}
): Promise<void> {
  try {
    const now = toMySQLDate();
    await db.run(
      `INSERT INTO user_timeline (id, user_id, event_type, event_date, old_value, new_value, metadata, note, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        userId,
        eventType,
        now,
        options.oldValue || null,
        options.newValue || null,
        options.metadata ? JSON.stringify(options.metadata) : null,
        options.note || '',
        options.createdBy || 'system',
        now,
        now
      ]
    );
  } catch (err) {
    console.error('Timeline log error:', err);
    // Don't fail the parent request if timeline logging fails
  }
}
