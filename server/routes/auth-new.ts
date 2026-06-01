/**
 * New authentication endpoints for activation and password reset.
 *
 * These endpoints complement (not replace) the existing auth routes.
 * The old security-question flow has been DISABLED (410 Gone). Use email-based reset.
 *
 * Endpoints:
 *   POST /api/auth/activate              — Activate account with token + set password
 *   GET  /api/auth/verify-activation     — Verify activation token is valid
 *   POST /api/auth/resend-activation     — Resend activation email
 *   POST /api/auth/request-password-reset — Request password reset email (forgot password)
 *   GET  /api/auth/verify-reset-token    — Verify reset token is valid
 *   POST /api/auth/complete-password-reset — Reset password with token
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import { hashPassword, verifyPassword } from '../auth/security.js';
import { validatePassword } from '../services/password.js';
import { generateTokenPair, toMySQLDate } from '../services/tokens.js';
import { sendActivationEmail, sendPasswordResetEmail, sendAdminPasswordResetEmail } from '../services/email.js';
import { auditLog, getClientIp, getUserAgent } from '../services/audit.js';
import { authMiddleware } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// ─── Zod Schemas ─────────────────────────────────────────────────────────

const ActivateSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirme su contraseña'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

const RequestPasswordResetSchema = z.object({
  email: z.string().email('Email inválido'),
});

const CompletePasswordResetSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirme su contraseña'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

const ResendActivationSchema = z.object({
  email: z.string().email('Email inválido'),
});

// ─── POST /api/auth/activate ───────────────────────────────────────────
// Activate an account and set the initial password.
router.post('/activate', async (req: Request, res: Response) => {
  try {
    const parseResult = ActivateSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => e.message).join(', ');
      return res.status(400).json({ error: errors });
    }

    const { token, password } = parseResult.data;

    // Validate password complexity
    const validation = validatePassword(password);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join('. ') });
    }

    // Hash the token to look it up in the database
    const { hashToken } = await import('../services/tokens.js');
    const tokenHash = hashToken(token);

    // Find user by activation token hash
    const user = await db.get(
      'SELECT id, email, name, is_active, password_hash FROM users WHERE activation_token_hash = ?',
      [tokenHash]
    ) as Record<string, unknown> | undefined;

    if (!user) {
      await auditLog({ action: 'activation_failed', ipAddress: getClientIp(req), userAgent: getUserAgent(req) });
      return res.status(400).json({ error: 'Token de activación inválido o expirado' });
    }

    // Check if already activated
    if (user.is_active && user.password_hash) {
      return res.status(400).json({ error: 'Esta cuenta ya ha sido activada' });
    }

    // Check if token expired
    const expiresAt = user.activation_expires_at as string | null;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      await auditLog({ action: 'activation_failed', userId: user.id as string, ipAddress: getClientIp(req), userAgent: getUserAgent(req) });
      return res.status(400).json({ error: 'El token de activación ha expirado. Solicite uno nuevo.' });
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);
    const now = toMySQLDate(new Date());

    // Activate the account
    await db.run(
      `UPDATE users SET
        password_hash = ?,
        is_active = 1,
        must_change_password = 0,
        activation_token_hash = NULL,
        activation_expires_at = NULL,
        activated_at = ?,
        password_changed_at = ?,
        updated_at = ?
      WHERE id = ?`,
      [hashedPassword, now, now, now, user.id]
    );

    // Delete any sessions for this user (security)
    await db.run('DELETE FROM sessions WHERE user_id = ?', [user.id]);

    await auditLog({
      action: 'account_activated',
      userId: user.id as string,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return res.json({ message: 'Cuenta activada exitosamente. Puede iniciar sesión.' });
  } catch (err) {
    console.error('Activation error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /api/auth/verify-activation ────────────────────────────────────
// Verify that an activation token is valid (for frontend pre-validation).
router.get('/verify-activation', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    const { hashToken } = await import('../services/tokens.js');
    const tokenHash = hashToken(token);

    const user = await db.get(
      'SELECT id, email, name, is_active, password_hash, activation_expires_at FROM users WHERE activation_token_hash = ?',
      [tokenHash]
    ) as Record<string, unknown> | undefined;

    if (!user) {
      return res.status(400).json({ error: 'Token de activación inválido' });
    }

    if (user.is_active && user.password_hash) {
      return res.status(400).json({ error: 'Esta cuenta ya ha sido activada' });
    }

    const expiresAt = user.activation_expires_at as string | null;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return res.status(400).json({ error: 'El token de activación ha expirado. Solicite uno nuevo.' });
    }

    // Return masked email for confirmation
    const email = user.email as string;
    const [local, domain] = email.split('@');
    const maskedEmail = local.slice(0, 2) + '***@' + domain;

    return res.json({ email: maskedEmail, name: user.name });
  } catch (err) {
    console.error('Verify activation error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/auth/resend-activation ───────────────────────────────────
// Resend activation email for a pending account.
router.post('/resend-activation', async (req: Request, res: Response) => {
  try {
    const parseResult = ResendActivationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    const { email } = parseResult.data;

    // Always return the same message to prevent email enumeration
    const successMessage = 'Si existe una cuenta con este correo que aún no ha sido activada, se enviará un nuevo enlace de activación.';

    const user = await db.get('SELECT id, name, email, is_active, password_hash FROM users WHERE email = ?', [email]) as Record<string, unknown> | undefined;

    if (!user || (user.is_active && user.password_hash)) {
      // Don't reveal whether the email exists or the account is already active
      await auditLog({ action: 'activation_email_resent', ipAddress: getClientIp(req), userAgent: getUserAgent(req), metadata: { email } });
      return res.json({ message: successMessage });
    }

    // Generate new activation token
    const { token, tokenHash } = generateTokenPair();
    const expiresAt = toMySQLDate(new Date(Date.now() + 48 * 60 * 60 * 1000)); // 48 hours
    const now = toMySQLDate(new Date());

    await db.run(
      'UPDATE users SET activation_token_hash = ?, activation_expires_at = ?, updated_at = ? WHERE id = ?',
      [tokenHash, expiresAt, now, user.id]
    );

    // Send activation email
    const emailSent = await sendActivationEmail(user.email as string, user.name as string, token);

    await auditLog({
      action: 'activation_email_resent',
      userId: user.id as string,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: { emailSent },
    });

    return res.json({ message: successMessage });
  } catch (err) {
    console.error('Resend activation error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/auth/request-password-reset ──────────────────────────────
// Request a password reset email. Always returns the same message
// to prevent email enumeration.
router.post('/request-password-reset', async (req: Request, res: Response) => {
  try {
    const parseResult = RequestPasswordResetSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    const { email } = parseResult.data;

    // Always return the same message
    const successMessage = 'Si existe una cuenta con este correo, se ha enviado un enlace para restablecer la contraseña.';

    const user = await db.get('SELECT id, name, email, is_active FROM users WHERE email = ?', [email]) as Record<string, unknown> | undefined;

    if (!user || !user.is_active) {
      // Don't reveal whether the email exists
      await auditLog({ action: 'password_reset_requested', ipAddress: getClientIp(req), userAgent: getUserAgent(req), metadata: { email } });
      return res.json({ message: successMessage });
    }

    // Generate reset token
    const { token, tokenHash } = generateTokenPair();
    const expiresAt = toMySQLDate(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
    const now = toMySQLDate(new Date());

    // Store the reset token
    await db.run(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), user.id, tokenHash, expiresAt, getClientIp(req), now]
    );

    // Send reset email
    const emailSent = await sendPasswordResetEmail(user.email as string, user.name as string, token, 1);

    await auditLog({
      action: 'password_reset_requested',
      userId: user.id as string,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: { emailSent },
    });

    return res.json({ message: successMessage });
  } catch (err) {
    console.error('Request password reset error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /api/auth/verify-reset-token ───────────────────────────────────
// Verify that a password reset token is valid.
router.get('/verify-reset-token', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    const { hashToken } = await import('../services/tokens.js');
    const tokenHash = hashToken(token);

    const resetToken = await db.get(
      'SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?',
      [tokenHash]
    ) as Record<string, unknown> | undefined;

    if (!resetToken) {
      return res.status(400).json({ error: 'Token inválido' });
    }

    if (resetToken.used_at) {
      return res.status(400).json({ error: 'Este token ya fue utilizado' });
    }

    if (new Date(resetToken.expires_at as string) < new Date()) {
      return res.status(400).json({ error: 'El token ha expirado. Solicite uno nuevo.' });
    }

    // Get user email (masked)
    const user = await db.get('SELECT email, name FROM users WHERE id = ?', [resetToken.user_id]) as Record<string, unknown> | undefined;
    if (!user) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    const email = user.email as string;
    const [local, domain] = email.split('@');
    const maskedEmail = local.slice(0, 2) + '***@' + domain;

    return res.json({ email: maskedEmail, name: user.name });
  } catch (err) {
    console.error('Verify reset token error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/auth/complete-password-reset ─────────────────────────────
// Complete password reset with token.
router.post('/complete-password-reset', async (req: Request, res: Response) => {
  try {
    const parseResult = CompletePasswordResetSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => e.message).join(', ');
      return res.status(400).json({ error: errors });
    }

    const { token, newPassword } = parseResult.data;

    // Validate password complexity
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join('. ') });
    }

    // Hash the token to look it up
    const { hashToken } = await import('../services/tokens.js');
    const tokenHash = hashToken(token);

    // Find the reset token
    const resetToken = await db.get(
      'SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?',
      [tokenHash]
    ) as Record<string, unknown> | undefined;

    if (!resetToken) {
      await auditLog({ action: 'password_reset_failed', ipAddress: getClientIp(req), userAgent: getUserAgent(req) });
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    if (resetToken.used_at) {
      return res.status(400).json({ error: 'Este token ya fue utilizado' });
    }

    if (new Date(resetToken.expires_at as string) < new Date()) {
      return res.status(400).json({ error: 'El token ha expirado. Solicite uno nuevo.' });
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);
    const now = toMySQLDate(new Date());

    // Update the user's password
    await db.run(
      `UPDATE users SET
        password_hash = ?,
        must_change_password = 0,
        password_changed_at = ?,
        updated_at = ?
      WHERE id = ?`,
      [hashedPassword, now, now, resetToken.user_id]
    );

    // Mark the reset token as used
    await db.run(
      'UPDATE password_reset_tokens SET used_at = ? WHERE id = ?',
      [now, resetToken.id]
    );

    // Invalidate all sessions for this user (force re-login)
    await db.run('DELETE FROM sessions WHERE user_id = ?', [resetToken.user_id]);

    // Invalidate all other reset tokens for this user
    await db.run(
      'UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL AND id != ?',
      [now, resetToken.user_id, resetToken.id]
    );

    await auditLog({
      action: 'password_reset_completed',
      userId: resetToken.user_id as string,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return res.json({ message: 'Contraseña restablecida exitosamente. Puede iniciar sesión con su nueva contraseña.' });
  } catch (err) {
    console.error('Complete password reset error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
