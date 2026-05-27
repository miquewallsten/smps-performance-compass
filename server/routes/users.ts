import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import { hashPassword, hashSecurityAnswer } from '../auth/security.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin, requireSelfOrAdmin } from '../middleware/rbac.js';

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


// Helper to strip sensitive fields from a user row
function sanitizeUser(user: Record<string, unknown>) {
  const { password_hash, security_answer, ...safe } = user;
  return safe;
}

// Columns to select for safe user responses (excludes password_hash and security_answer)
const SAFE_USER_COLUMNS = `id, name, email, position, practice_area, custom_position_id, location_id, is_admin, is_super_user, is_managing_partner, is_active, must_change_password, created_at, updated_at`;

// ─── GET /api/users ──────────────────────────────────────────────────────
// Visibility rules:
// - SuperUser & Admin: see all active users (excluding other SuperUsers)
// - Managing Partner (Socio Administrador): see all except SuperUsers
// - Other Socios: see all except other Socios, Managing Partners, and Salary Partners
// - Regular users: see users they supervise + themselves
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const allUsers = await db.all(`SELECT ${SAFE_USER_COLUMNS} FROM users`);
    const activeUsers = allUsers.filter((u: any) => u.is_active === 1 || u.is_active === true);
    const role = req.user!.role;
    
    // SuperUser and Admin can see all users (including inactive for management)
    if (role === 'super_user' || role === 'admin') {
      return res.json(allUsers);
    }
    
    // Regular user: fetch their assignments to determine visibility
    const userId = req.user!.id;
    const assignments = await db.all(
      'SELECT employee_id, supervisor_id FROM supervisor_assignments WHERE (employee_id = ? OR supervisor_id = ?)',
      [userId, userId]
    );
    
    // Visible user IDs: self + anyone in their assignments
    const visibleIds = new Set<string>([userId]);
    for (const a of assignments) {
      visibleIds.add(a.employee_id);
      visibleIds.add(a.supervisor_id);
    }
    
    // Regular users only see active users in their scope
    const visibleUsers = activeUsers.filter((u: any) => visibleIds.has(u.id));
    return res.json(visibleUsers);
  } catch (err) {
    console.error('List users error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/users/:id ────────────────────────────────────────────────────
// Allow: self, admin, super_user, or anyone who supervises/is supervised by the target
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const targetId = req.params.id;
    const role = req.user!.role;
    const userId = req.user!.id;

    // Admin and super_user can see any user
    if (role === 'admin' || role === 'super_user') {
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

    // Check if user has an assignment relationship with target
    const assignment = await db.get(
      'SELECT id FROM supervisor_assignments WHERE (supervisor_id = ? AND employee_id = ?) OR (employee_id = ? AND supervisor_id = ?) LIMIT 1',
      [userId, targetId, userId, targetId]
    ) as Record<string, unknown> | undefined;

    if (assignment) {
      const user = await db.get(`SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = ?`, [targetId]) as Record<string, unknown> | undefined;
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json(sanitizeUser(user));
    }

    return res.status(403).json({ error: 'Access denied' });
  } catch (err) {
    console.error('Get user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/users ─────────────────────────────────────────────────────
router.post('/', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
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

    if (!name || !email || !position || !password) {
      return res.status(400).json({ error: 'Name, email, position, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

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
    const hashedPassword = await hashPassword(password);
    // Default security question so admin-created users can reset
    const securityQuestion = '¿Cuál es su correo electrónico?';
    const hashedAnswer = await hashSecurityAnswer(email);
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    await db.run(
      `INSERT INTO users (id, email, password_hash, security_question, security_answer, name, position, practice_area, custom_position_id, location_id, is_admin, is_super_user, is_managing_partner, is_active, must_change_password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        1, // isActive
        1, // mustChangePassword
        now,
        now
      ]
    );

    const user = await db.get(`SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = ?`, [id]) as Record<string, unknown>;
    // Log hire event to timeline
    await logTimelineEvent(id, 'hire', {
      newValue: position,
      metadata: { practiceArea: practiceArea || null, customPositionId: customPositionId || null, locationId: locationId || null, isAdmin: !!finalIsAdmin, isManagingPartner: !!finalIsMP },
      note: 'Usuario creado',
      createdBy: req.user!.id
    });
    return res.status(201).json(sanitizeUser(user));
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
    values.push(new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''));
    values.push(id);

    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    const updatedUser = await db.get(`SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = ?`, [id]) as Record<string, unknown>;
    // Log position changes and reactivation to timeline
    if (isAdminUser && updates.length > 0) {
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
router.post('/:id/reset-password', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body as { newPassword?: string };

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hashedPassword = await hashPassword(newPassword);
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    await db.run('UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = ? WHERE id = ?', [hashedPassword, now, id]);
    // Log password reset event
    await logTimelineEvent(id, 'password_reset', { note: 'Contraseña restablecida por administrador', createdBy: req.user!.id });

    return res.json({ message: 'Password reset successfully' });
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
    values.push(new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''));
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
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
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
