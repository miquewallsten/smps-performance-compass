# Activation Flow — SMPS Performance Compass

## Overview

The activation flow replaces the current "admin sets password" pattern with a secure, self-service onboarding process. The admin creates a user record without a password, and the user sets their own password via an activation link sent to their email.

---

## Flow Diagram

```
Admin                          Server                          User's Email                    User
─────                          ─────                           ────────────                    ────
POST /api/users                Create user record
{name, email, position,        is_active = 0
 isAdmin, ...}                 password_hash = NULL
                               activation_token = UUID
                               activation_expires_at = +48h
                               ──────────────────►
                               Send activation email           ──────────────────►
                                                                ──────────────────►
                               Audit log: user_created          Clicks link
                                                                                      GET /activate?token=XXX
                                                                                      Enters new password
                                                                                      POST /api/auth/activate
                                                                                      {token, password}

                               Validate token
                               Check not expired
                               Check not already used
                               Hash password with bcrypt
                               Set password_hash
                               Set is_active = 1
                               Clear activation_token
                               Clear activation_expires_at
                               Invalidate all sessions
                               Audit log: account_activated
                                                                                      ──► Redirect to login
```

---

## Token Design

### Generation

```typescript
import crypto from 'crypto';

function generateActivationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
```

- 64 hex characters (256 bits of entropy)
- Cryptographically random — not guessable
- Single use — deleted after successful activation

### Expiration

- Default: 48 hours from creation
- Configurable via env variable `ACTIVATION_TOKEN_EXPIRY_HOURS` (default: 48)
- After expiration, user must request a new activation link via `/api/auth/resend-activation`

### Storage

```sql
-- In the users table (new columns)
ALTER TABLE users ADD COLUMN activation_token VARCHAR(64) NULL;
ALTER TABLE users ADD COLUMN activation_expires_at DATETIME NULL;

-- Index for token lookup
CREATE INDEX idx_users_activation_token ON users(activation_token);
```

**Why in users table and not a separate table?**
- One-to-one relationship (each user has at most one pending activation)
- Simpler queries (no JOIN needed)
- Token is only needed during initial activation
- Token is cleared after activation (NULL)

---

## Endpoint Specification

### POST /api/auth/activate

**Authentication**: None (public endpoint)

**Request Body**:
```json
{
  "token": "64-hex-character-token",
  "password": "UserChosenPassword123",
  "confirmPassword": "UserChosenPassword123"
}
```

**Validation**:
- `token`: required, must match `[a-f0-9]{64}`
- `password`: required, minimum 8 characters
- `confirmPassword`: must match `password`
- Password complexity: at least 1 uppercase, 1 lowercase, 1 digit

**Processing**:
1. Look up user by `activation_token`
2. If not found → `400 { error: 'Token de activación inválido' }`
3. If `activation_expires_at < now` → `400 { error: 'El token de activación ha expirado. Solicite uno nuevo.' }`
4. If `is_active = 1` → `400 { error: 'Esta cuenta ya ha sido activada' }`
5. Hash password with bcrypt (12 rounds)
6. Update user:
   ```sql
   UPDATE users SET
     password_hash = ?,
     is_active = 1,
     must_change_password = 0,
     activation_token = NULL,
     activation_expires_at = NULL,
     updated_at = NOW()
   WHERE id = ?
   ```
7. Delete all sessions for this user (in case any exist from admin testing)
8. Insert audit log entry
9. Return `200 { message: 'Cuenta activada exitosamente' }`

**Rate Limiting**: 10 requests per 15 minutes per IP

**Error Responses**:
| Code | Message |
|------|---------|
| 400 | Token de activación inválido |
| 400 | El token de activación ha expirado |
| 400 | Esta cuenta ya ha sido activada |
| 400 | La contraseña debe tener al menos 8 caracteres |
| 400 | Las contraseñas no coinciden |
| 429 | Demasiados intentos |

---

### POST /api/auth/resend-activation

**Authentication**: None (public endpoint)

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Processing**:
1. Look up user by email
2. If not found → still return `200 { message: 'Si existe una cuenta con este correo, se enviará un nuevo enlace de activación.' }` (prevents enumeration)
3. If `is_active = 1` → return same success message (don't reveal account status)
4. Generate new activation token
5. Update user: `activation_token = ?, activation_expires_at = NOW() + 48h`
6. Send activation email
7. Insert audit log entry
8. Return `200 { message: '...' }`

**Rate Limiting**: 3 requests per 15 minutes per IP

---

### GET /api/auth/verify-activation-token

**Authentication**: None (public endpoint)

**Purpose**: Frontend can check if a token is valid before showing the activation form.

**Request**: `GET /api/auth/verify-activation-token?token=xxx`

**Processing**:
1. Look up user by `activation_token`
2. If not found → `400 { error: 'Token inválido' }`
3. If expired → `400 { error: 'Token expirado' }`
4. If already active → `400 { error: 'Cuenta ya activada' }`
5. Return `200 { email: 'u***@smps.com' }` (masked email for user confirmation)

---

## Modified: POST /api/users (Admin Creates User)

**Current**: Admin provides `{ name, email, position, password, ... }`

**New**: Admin provides `{ name, email, position, ... }` (no password)

**Processing**:
1. Validate input (same as current, minus password)
2. Check email uniqueness
3. Enforce role limits (same as current)
4. Generate activation token
5. Insert user with:
   - `password_hash = NULL`
   - `is_active = 0`
   - `activation_token = <generated>`
   - `activation_expires_at = NOW() + 48h`
   - `must_change_password = 0` (not needed — they're setting their own password)
6. Send activation email
7. Insert audit log: `user_created`
8. Return `201 { ...user, activationSent: true }`

**Fallback**: If email fails to send, the admin can copy the activation link from the response and send it manually. The response includes the token for admin reference:
```json
{
  "user": { "id": "...", "name": "...", "email": "..." },
  "activationLink": "https://smps.bowdot.online/activate?token=abc123..."
}
```

---

## Audit Logging

Every activation event is recorded in `authentication_audit`:

| Event | Action | Details |
|-------|--------|---------|
| Admin creates user | `user_created` | `actor_id`, `target_id`, `email` |
| Activation email sent | `activation_email_sent` | `target_id`, `email` |
| Activation email resent | `activation_email_resent` | `target_id`, `email` |
| Account activated | `account_activated` | `target_id`, `ip_address` |
| Activation token expired | `activation_token_expired` | `target_id` (via cleanup job) |
| Invalid activation attempt | `activation_failed` | `ip_address`, `token_prefix` |

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| User clicks activation link twice | Token is already cleared → shows "already activated" message |
| Token expires before user clicks | User clicks "Resend activation" → new token generated |
| Admin creates user with same email | Returns 409 "Email already registered" (same as current) |
| User tries to login before activating | Returns 403 "Account not activated" |
| User forgets they need to activate | Login page shows "Check your email for activation link" message |
| Email delivery fails | Admin gets activation link in API response; can send manually |
| Multiple activation tokens | Only one valid token per user at a time (new token replaces old) |
| Brute force token guessing | 256-bit entropy makes this infeasible; rate limiting adds protection |
