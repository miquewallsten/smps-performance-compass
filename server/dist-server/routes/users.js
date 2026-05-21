import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { hashPassword, hashSecurityAnswer } from '../auth/security.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin, requireSelfOrAdmin } from '../middleware/rbac.js';
const router = Router();
// Helper to strip sensitive fields from a user row
function sanitizeUser(user) {
    const { password_hash, security_answer, ...safe } = user;
    return safe;
}
// Columns to select for safe user responses (excludes password_hash and security_answer)
const SAFE_USER_COLUMNS = `id, name, email, position, practice_area, custom_position_id, is_admin, is_super_user, is_managing_partner, is_active, must_change_password, created_at, updated_at`;
// ─── GET /api/users ──────────────────────────────────────────────────────
router.get('/', authMiddleware, requireAdmin, (_req, res) => {
    try {
        const users = db.prepare(`SELECT ${SAFE_USER_COLUMNS} FROM users`).all();
        return res.json(users);
    }
    catch (err) {
        console.error('List users error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ─── GET /api/users/:id ────────────────────────────────────────────────────
router.get('/:id', authMiddleware, requireSelfOrAdmin, (req, res) => {
    try {
        const user = db.prepare(`SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = ?`).get(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json(sanitizeUser(user));
    }
    catch (err) {
        console.error('Get user error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ─── POST /api/users ─────────────────────────────────────────────────────
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { name, email, position, password, practiceArea, customPositionId, isAdmin, isManagingPartner } = req.body;
        if (!name || !email || !position || !password) {
            return res.status(400).json({ error: 'Name, email, position, and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        // Check email uniqueness
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(409).json({ error: 'Email is already registered' });
        }
        const id = uuidv4();
        const hashedPassword = await hashPassword(password);
        // Default security question so admin-created users can reset
        const securityQuestion = '¿Cuál es su correo electrónico?';
        const hashedAnswer = await hashSecurityAnswer(email);
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO users (id, email, password_hash, security_question, security_answer, name, position, practice_area, custom_position_id, is_admin, is_super_user, is_managing_partner, is_active, must_change_password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, email, hashedPassword, securityQuestion, hashedAnswer, name, position, practiceArea ?? null, customPositionId ?? null, isAdmin ? 1 : 0, 0, // isSuperUser is always false for admin-created users
        isManagingPartner ? 1 : 0, 1, // isActive
        1, // mustChangePassword
        now, now);
        const user = db.prepare(`SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = ?`).get(id);
        return res.status(201).json(sanitizeUser(user));
    }
    catch (err) {
        console.error('Create user error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ─── PATCH /api/users/:id ────────────────────────────────────────────────
router.patch('/:id', authMiddleware, requireSelfOrAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isAdminUser = req.user.role === 'admin' || req.user.role === 'super_user';
        const isSelf = req.user.id === id;
        const updates = [];
        const values = [];
        if (isAdminUser) {
            // Admin can change all fields
            const { name, email, position, practiceArea, customPositionId, isActive } = req.body;
            if (name !== undefined) {
                updates.push('name = ?');
                values.push(name);
            }
            if (email !== undefined) {
                updates.push('email = ?');
                values.push(email);
            }
            if (position !== undefined) {
                updates.push('position = ?');
                values.push(position);
            }
            if (practiceArea !== undefined) {
                updates.push('practice_area = ?');
                values.push(practiceArea);
            }
            if (customPositionId !== undefined) {
                updates.push('custom_position_id = ?');
                values.push(customPositionId);
            }
            if (isActive !== undefined) {
                updates.push('is_active = ?');
                values.push(isActive ? 1 : 0);
            }
        }
        else if (isSelf) {
            // Self can only change name and email
            const { name, email } = req.body;
            if (name !== undefined) {
                updates.push('name = ?');
                values.push(name);
            }
            if (email !== undefined) {
                updates.push('email = ?');
                values.push(email);
            }
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        updates.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        const updatedUser = db.prepare(`SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = ?`).get(id);
        return res.json(sanitizeUser(updatedUser));
    }
    catch (err) {
        console.error('Update user error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ─── DELETE /api/users/:id ────────────────────────────────────────────────
router.delete('/:id', authMiddleware, requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const now = new Date().toISOString();
        db.prepare('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?').run(now, id);
        return res.json({ message: 'User deactivated successfully' });
    }
    catch (err) {
        console.error('Delete user error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ─── POST /api/users/:id/reset-password ───────────────────────────────────
router.post('/:id/reset-password', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const hashedPassword = await hashPassword(newPassword);
        const now = new Date().toISOString();
        db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = ? WHERE id = ?').run(hashedPassword, now, id);
        return res.json({ message: 'Password reset successfully' });
    }
    catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ─── PATCH /api/users/:id/role ───────────────────────────────────────────
router.patch('/:id/role', authMiddleware, requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { isAdmin, isManagingPartner, isSuperUser } = req.body;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const updates = [];
        const values = [];
        if (isAdmin !== undefined) {
            updates.push('is_admin = ?');
            values.push(isAdmin ? 1 : 0);
        }
        if (isManagingPartner !== undefined) {
            updates.push('is_managing_partner = ?');
            values.push(isManagingPartner ? 1 : 0);
        }
        // Can only modify isSuperUser if you ARE a super_user
        if (isSuperUser !== undefined) {
            if (req.user.role !== 'super_user') {
                return res.status(403).json({ error: 'Only super users can modify super user status' });
            }
            // Cannot demote yourself from super_user
            if (req.user.id === id && !isSuperUser) {
                return res.status(403).json({ error: 'Cannot demote yourself from super user' });
            }
            updates.push('is_super_user = ?');
            values.push(isSuperUser ? 1 : 0);
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        updates.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        const updatedUser = db.prepare(`SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = ?`).get(id);
        return res.json(sanitizeUser(updatedUser));
    }
    catch (err) {
        console.error('Update role error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
//# sourceMappingURL=users.js.map