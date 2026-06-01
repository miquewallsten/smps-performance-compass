# Password Reset Flow — SMPS Performance Compass

## Overview

The password reset flow replaces the current security-question-based reset with an email-based token system. This eliminates the weakest security mechanism in the current system (all users share the same security question with the answer being their email).

---

## Current Flow (Being Replaced)

```
User → POST /api/auth/security-question { email }
       ← { securityQuestion: "¿Cuál es su correo electrónico?" }
User → POST /api/auth/reset-password { email, securityAnswer, newPassword }
       ← { message: "Password reset successfully" }
```

**Weakness**: Anyone who knows a user's email can reset their password, because the security answer IS the email.

---

## New Flow

```
User → POST /api/auth/forgot-password { email }
       ← 200 { message: "If an account exists with this email, a reset link has been sent." }

       Server sends email with reset link:
       https://smps.bowdot.online/reset-password?token=<64-hex-token>

User → Clicks link → Reset Password page

User → POST /api/auth/reset-password-token { token, newPassword, confirmPassword }
       ← 200 { message: "Password reset successfully" }
```

---

## Token Design

### Generation

```typescript
import crypto from 'crypto';

function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
```

- 64 hex characters (256 bits)
- Cryptographically random
- Single use — deleted after successful reset
- Stored in `password_reset_tokens` table (separate from users)

### Why a separate table instead of user columns?

- A user may have multiple reset tokens if they request several (before using any)
- Cleaner separation of concerns
- Easier to audit and clean up
- Allows tracking of token metadata (IP address, requested_at)

---

## Endpoint Specifications

### POST /api/auth/forgot-password

**Authentication**: None (public)

**Request Body**:
```json
{
  "email": "mgarcia@smps.com"
}
```

**Processing**:
1. Validate email format
2. Look up user by email
3. If user not found → still return success message (prevents email enumeration)
4. If user found:
   a. Generate reset token
   b. Insert into `password_reset_tokens` table
   c. Send email with reset link
5. Insert audit log: `password_reset_requested` (even if email not found — records IP)
6. Return `200 { message: "Si existe una cuenta con este correo, se ha enviado un enlace para restablecer la contraseña." }`

**Rate Limiting**: 3 requests per 15 minutes per IP

**Important**: Always return the same message regardless of whether the email exists. This prevents enumeration.

---

### POST /api/auth/reset-password-token

**Authentication**: None (public)

**Request Body**:
```json
{
  "token": "64-hex-character-token",
  "newPassword": "NewPassword123",
  "confirmPassword": "NewPassword123"
}
```

**Validation**:
- `token`: required, must match `[a-f0-9]{64}`
- `newPassword`: required, minimum 8 characters, complexity rules
- `confirmPassword`: must match `newPassword`

**Processing**:
1. Look up token in `password_reset_tokens`
2. If not found → `400 { error: 'Token inválido o expirado' }`
3. If `expires_at < NOW()` → `400 { error: 'El token ha expirado. Solicite uno nuevo.' }`
4. If `used_at IS NOT NULL` → `400 { error: 'Este token ya fue utilizado' }`
5. Hash new password with bcrypt (12 rounds)
6. Update user: `password_hash = ?, must_change_password = 0`
7. Mark token as used: `used_at = NOW()`
8. Invalidate all sessions for this user: `DELETE FROM sessions WHERE user_id = ?`
9. Insert audit log: `password_reset_completed`
10. Return `200 { message: 'Contraseña restablecida exitosamente' }`

**Rate Limiting**: 5 requests per 15 minutes per IP

---

### GET /api/auth/verify-reset-token

**Authentication**: None (public)

**Purpose**: Frontend can check if a token is valid before showing the reset form.

**Request**: `GET /api/auth/verify-reset-token?token=xxx`

**Processing**:
1. Look up token in `password_reset_tokens`
2. If not found → `400 { error: 'Token inválido' }`
3. If expired → `400 { error: 'Token expirado' }`
4. If used → `400 { error: 'Token ya utilizado' }`
5. Return `200 { email: 'm***@smps.com' }` (masked email for confirmation)

---

### POST /api/auth/resend-reset

**Authentication**: None (public)

**Request Body**:
```json
{
  "email": "mgarcia@smps.com"
}
```

**Processing**: Same as `forgot-password` but with audit action `password_reset_resent`.

---

## Modified: POST /api/users/:id/reset-password (Admin)

**Current**: Admin provides `{ newPassword }` and sets the password directly.

**New**: Admin does NOT provide a password. Instead:

1. Generate reset token with 24-hour expiry (longer than self-service)
2. Insert into `password_reset_tokens`
3. Send email to the user
4. Insert audit log: `admin_password_reset_requested`
5. Return `200 { message: 'Se ha enviado un correo para restablecer la contraseña.' }`

**Fallback**: If email delivery fails, admin can see the reset link in the response:
```json
{
  "message": "Se ha enviado un correo para restablecer la contraseña.",
  "resetLink": "https://smps.bowdot.online/reset-password?token=abc123..."
}
```

**Why this change?**: Admin should never know or set user passwords. This is a security best practice and eliminates the "shared secret" problem.

---

## Email Content

### Reset Password Email

**Subject**: SMPS — Restablecer Contraseña

**Body** (Spanish):
```
Hola {name},

Recibimos una solicitud para restablecer su contraseña en SMPS Performance Compass.

Haga clic en el siguiente enlace para crear una nueva contraseña:

[Restablecer Contraseña]

Este enlace expirará en 1 hora.

Si no solicitó este cambio, puede ignorar este correo. Su contraseña no será modificada.

— Equipo SMPS
```

### Admin-Triggered Reset Email

**Subject**: SMPS — Restablecer Su Contraseña

**Body** (Spanish):
```
Hola {name},

Un administrador ha solicitado que restablezca su contraseña en SMPS Performance Compass.

Haga clic en el siguiente enlace para crear una nueva contraseña:

[Restablecer Contraseña]

Este enlace expirará en 24 horas.

Si no esperaba este correo, contacte a su administrador.

— Equipo SMPS
```

---

## Audit Logging

| Event | Action | Details |
|-------|--------|---------|
| Forgot password requested | `password_reset_requested` | email (if exists), IP address |
| Reset email sent | `password_reset_email_sent` | user_id, token_id |
| Reset token verified | `password_reset_token_verified` | user_id, IP address |
| Password reset completed | `password_reset_completed` | user_id, IP address |
| Invalid reset attempt | `password_reset_failed` | IP address, token_prefix |
| Admin triggered reset | `admin_password_reset_requested` | admin_id, target_user_id |
| Resend reset requested | `password_reset_resent` | email, IP address |

---

## Token Cleanup

A periodic cleanup job should remove expired and used tokens:

```sql
-- Run every 24 hours
DELETE FROM password_reset_tokens
WHERE expires_at < NOW() - INTERVAL 7 DAY;
```

This can be implemented as a Node.js cron job or a MySQL event.

---

## Transition Plan

### Phase 1: Add new endpoints (this phase)
- Add `POST /api/auth/forgot-password`
- Add `POST /api/auth/reset-password-token`
- Add `GET /api/auth/verify-reset-token`
- Keep old `POST /api/auth/security-question` and `POST /api/auth/reset-password` working
- Frontend switches to new flow

### Phase 2: Deprecate old endpoints
- Add `X-Deprecation` header to old endpoints
- Log usage of old endpoints
- Frontend removes all references to security questions

### Phase 3: Remove old endpoints (3+ months after Phase 2)
- Remove `POST /api/auth/security-question`
- Remove `POST /api/auth/reset-password` (old)
- Remove `security_question` and `security_answer` columns from `users`
- Remove security question from all user creation paths
- Remove `ChangePassword.tsx` security question section

---

## Frontend Changes

### New Pages

1. **ForgotPassword** (`/forgot-password`): Simple email input form
2. **ResetPassword** (`/reset-password?token=xxx`): New password form with token validation

### Modified Pages

1. **Login**: Replace "¿Olvidaste tu contraseña?" security question flow with email-based flow
2. **ChangePassword**: Remove security question section
3. **UserManagement**: Remove password field from "Add User" dialog

### Removed Pages

None during transition.
