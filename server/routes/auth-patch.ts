/**
 * Patches to add to the EXISTING server/routes/auth.ts file.
 * 
 * This file contains the changes needed to:
 * 1. Add audit logging to login, logout, change-password, and reset-password endpoints
 * 2. Modify the login flow to check for activated accounts
 * 3. Update admin user creation to use activation tokens instead of passwords
 * 
 * INSTRUCTIONS: These changes should be manually integrated into server/routes/auth.ts
 */

// ─── 1. Add these imports at the top of auth.ts ───────────────────────────

/*
import { auditLog, getClientIp, getUserAgent } from '../services/audit.js';
import { generateTokenPair, toMySQLDate } from '../services/tokens.js';
import { sendActivationEmail } from '../services/email.js';
import { validatePassword } from '../services/password.js';
*/

// ─── 2. Modify POST /api/auth/login ──────────────────────────────────────

/*
After checking the user exists and is active, add a check for activated accounts:

    if (!user.password_hash) {
      // Account not yet activated
      await auditLog({ action: 'login_failed_not_activated', userId: user.id, ipAddress: getClientIp(req), userAgent: getUserAgent(req) });
      return res.status(403).json({ error: 'Cuenta no activada. Revise su correo electrónico para el enlace de activación.' });
    }

After successful password verification, add:

    await auditLog({ action: 'login_success', userId: user.id, ipAddress: getClientIp(req), userAgent: getUserAgent(req) });

After failed password verification, add:

    await auditLog({ action: 'login_failed', userId: user.id, ipAddress: getClientIp(req), userAgent: getUserAgent(req) });
*/

// ─── 3. Modify POST /api/auth/logout ──────────────────────────────────────

/*
After successful logout, add:

    await auditLog({ action: 'logout', userId: payload.id, ipAddress: getClientIp(req), userAgent: getUserAgent(req) });
*/

// ─── 4. Modify POST /api/auth/change-password ──────────────────────────────

/*
After successful password change, add:

    await auditLog({ action: 'password_changed', userId: req.user!.id, ipAddress: getClientIp(req), userAgent: getUserAgent(req) });
*/

// ─── 5. Modify POST /api/auth/reset-password (old flow) ──────────────────

/*
After successful password reset, add:

    await auditLog({ action: 'password_reset_completed', userId: user.id, ipAddress: getClientIp(req), userAgent: getUserAgent(req) });
*/

