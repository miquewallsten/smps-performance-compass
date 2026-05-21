import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { signToken, hashToken, getTokenExpiry, getRole } from '../auth/jwt.js';
import { hashPassword, verifyPassword, hashSecurityAnswer, verifySecurityAnswer } from '../auth/security.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAuthenticated } from '../middleware/rbac.js';
const router = Router();
// Helper to strip sensitive fields from a user row
function sanitizeUser(user) {
    const { password_hash, security_answer, ...safe } = user;
    return safe;
}
// ─── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (!user.is_active) {
            return res.status(403).json({ error: 'Account is deactivated' });
        }
        const passwordHash = user.password_hash;
        const valid = await verifyPassword(password, passwordHash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const role = getRole({
            isAdmin: Boolean(user.is_admin),
            isSuperUser: Boolean(user.is_super_user),
        });
        const token = signToken({
            sub: user.id,
            email: user.email,
            role,
            name: user.name,
        });
        return res.json({ token, user: sanitizeUser(user) });
    }
    catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ─── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', authMiddleware, requireAuthenticated, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader.substring(7);
        const tokenHash = hashToken(token);
        const expiresAt = getTokenExpiry().toISOString();
        const payload = req.user;
        // Add token to blocklist
        db.prepare('INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), payload.id, tokenHash, new Date().toISOString(), expiresAt);
        // Clean up expired sessions
        db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString());
        return res.json({ message: 'Logged out successfully' });
    }
    catch (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ─── GET /api/auth/me ───────────────────────────────────────────────────────
router.get('/me', authMiddleware, requireAuthenticated, (req, res) => {
    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({ user: sanitizeUser(user) });
    }
    catch (err) {
        console.error('Me error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ─── POST /api/auth/change-password ─────────────────────────────────────────
router.post('/change-password', authMiddleware, requireAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword, securityQuestion, securityAnswer } = req.body;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // If user must change password, currentPassword is optional (forced change)
        if (!user.must_change_password) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Current password is required' });
            }
            const valid = await verifyPassword(currentPassword, user.password_hash);
            if (!valid) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
        }
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        const hashedPassword = await hashPassword(newPassword);
        const now = new Date().toISOString();
        if (securityQuestion && securityAnswer) {
            const hashedAnswer = await hashSecurityAnswer(securityAnswer);
            db.prepare('UPDATE users SET password_hash = ?, security_question = ?, security_answer = ?, must_change_password = 0, updated_at = ? WHERE id = ?').run(hashedPassword, securityQuestion, hashedAnswer, now, user.id);
        }
        else {
            db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?').run(hashedPassword, now, user.id);
        }
        return res.json({ message: 'Password changed successfully' });
    }
    catch (err) {
        console.error('Change password error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ─── POST /api/auth/security-question ───────────────────────────────────────
router.post('/security-question', (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        const user = db.prepare('SELECT security_question FROM users WHERE email = ?').get(email);
        if (!user) {
            // Don't reveal whether the email exists
            return res.json({ securityQuestion: null });
        }
        return res.json({ securityQuestion: user.security_question });
    }
    catch (err) {
        console.error('Security question error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ─── POST /api/auth/reset-password ──────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
    try {
        const { email, securityAnswer, newPassword } = req.body;
        if (!email || !securityAnswer || !newPassword) {
            return res.status(400).json({ error: 'Email, security answer, and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const validAnswer = await verifySecurityAnswer(securityAnswer, user.security_answer);
        if (!validAnswer) {
            return res.status(401).json({ error: 'Incorrect security answer' });
        }
        const hashedPassword = await hashPassword(newPassword);
        const now = new Date().toISOString();
        db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?').run(hashedPassword, now, user.id);
        return res.json({ message: 'Password reset successfully' });
    }
    catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
//# sourceMappingURL=auth.js.map