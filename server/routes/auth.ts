import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, tx } from '../db/connection.js';
import { signToken, hashToken, getTokenExpiry, getRole } from '../auth/jwt.js';
import { hashPassword, verifyPassword, hashSecurityAnswer, verifySecurityAnswer } from '../auth/security.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAuthenticated } from '../middleware/rbac.js';

const router = Router();

// Helper to strip sensitive fields from a user row
function sanitizeUser(user: Record<string, unknown>) {
  const { password_hash, security_answer, ...safe } = user;
  return {
    ...safe,
    isAdmin: Boolean(user.is_admin),
    isSuperUser: Boolean(user.is_super_user),
    isManagingPartner: Boolean(user.is_managing_partner),
    isActive: Boolean(user.is_active),
    mustChangePassword: Boolean(user.must_change_password),
  };
}

// ─── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]) as Record<string, unknown> | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const passwordHash = user.password_hash as string;
    const valid = await verifyPassword(password, passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const role = getRole({
      isAdmin: Boolean(user.is_admin),
      isSuperUser: Boolean(user.is_super_user),
      isManagingPartner: Boolean(user.is_managing_partner),
    });

    const token = signToken({
      sub: user.id as string,
      email: user.email as string,
      role,
      name: user.name as string,
      position: user.position as string,
      isManagingPartner: Boolean(user.is_managing_partner),
    });

    return res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', authMiddleware, requireAuthenticated, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization!;
    const token = authHeader.substring(7);
    const tokenHash = hashToken(token);
    const expiresAt = getTokenExpiry().toISOString();

    const payload = req.user!;

    // Add token to blocklist
    await db.run(
      'INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), payload.id, tokenHash, new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''), expiresAt]
    );

    // Clean up expired sessions
    await db.run('DELETE FROM sessions WHERE expires_at < ?', [new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')]);

    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/auth/me ───────────────────────────────────────────────────────
router.get('/me', authMiddleware, requireAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user!.id]) as Record<string, unknown> | undefined;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/change-password ─────────────────────────────────────────
router.post('/change-password', authMiddleware, requireAuthenticated, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword, securityQuestion, securityAnswer } = req.body as {
      currentPassword?: string;
      newPassword?: string;
      securityQuestion?: string;
      securityAnswer?: string;
    };

    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user!.id]) as Record<string, unknown> | undefined;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user must change password, currentPassword is optional (forced change)
    if (!user.must_change_password) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }
      const valid = await verifyPassword(currentPassword, user.password_hash as string);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const hashedPassword = await hashPassword(newPassword);
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    if (securityQuestion && securityAnswer) {
      const hashedAnswer = await hashSecurityAnswer(securityAnswer);
      await db.run(
        'UPDATE users SET password_hash = ?, security_question = ?, security_answer = ?, must_change_password = 0, updated_at = ? WHERE id = ?',
        [hashedPassword, securityQuestion, hashedAnswer, now, user.id as string]
      );
    } else {
      await db.run(
        'UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?',
        [hashedPassword, now, user.id as string]
      );
    }

    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/security-question ───────────────────────────────────────
router.post('/security-question', async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await db.get('SELECT security_question FROM users WHERE email = ?', [email]) as { security_question: string } | undefined;

    if (!user) {
      // Don't reveal whether the email exists
      return res.json({ securityQuestion: null });
    }

    return res.json({ securityQuestion: user.security_question });
  } catch (err) {
    console.error('Security question error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/reset-password ──────────────────────────────────────────
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, securityAnswer, newPassword } = req.body as {
      email?: string;
      securityAnswer?: string;
      newPassword?: string;
    };

    if (!email || !securityAnswer || !newPassword) {
      return res.status(400).json({ error: 'Email, security answer, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]) as Record<string, unknown> | undefined;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validAnswer = await verifySecurityAnswer(securityAnswer, user.security_answer as string);
    if (!validAnswer) {
      return res.status(401).json({ error: 'Incorrect security answer' });
    }

    const hashedPassword = await hashPassword(newPassword);
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    await db.run(
      'UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?',
      [hashedPassword, now, user.id as string]
    );

    return res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
