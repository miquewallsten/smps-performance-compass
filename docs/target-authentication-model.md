# Target Authentication Model — SMPS Performance Compass

## Design Principles

1. **Self-hosted** — no external SaaS dependencies
2. **Zero-knowledge admin** — admins never see or set user passwords
3. **Email-verified** — all critical flows require email confirmation
4. **Audit-logged** — every authentication event is recorded
5. **Future-proof** — MFA-ready architecture from day one

---

## Current vs Target Comparison

| Feature | Current | Target |
|---------|---------|--------|
| User creation | Admin sets password | Admin creates record, user activates via email |
| Password reset | Security question (email as answer) | Email-based token reset |
| Security questions | All users share same question (email) | **Removed entirely** |
| Force password change | `must_change_password` flag | Activation token (first login = new password) |
| Email verification | None | Required for activation and password reset |
| MFA | None | Architecture ready, TOTP in future phase |
| Audit logging | None | All auth events logged to `authentication_audit` |
| Session management | Blocklist in DB | Short-lived access token + refresh token rotation |
| Token storage | localStorage | httpOnly cookie (access) + localStorage (refresh) |

---

## Role System (Unchanged)

The JWT role system remains the same:

| DB Columns | Derived Role | Description |
|------------|-------------|-------------|
| `is_super_user = 1` | `super_user` | Full system access |
| `is_admin = 1 OR is_managing_partner = 1` | `admin` | User management, all modules |
| default | `user` | Regular employee |

The `position` column determines visibility (socio, salary_partner, etc.).

No changes to the role hierarchy or permission model.

---

## New User Onboarding Flow

### Step 1: Admin Creates Employee Record

**Endpoint**: `POST /api/users` (admin only, modified)

Admin provides:
```
{
  name: "Lic. María García",
  email: "mgarcia@smps.com",
  position: "asociado_mid",
  practiceArea: "corporativo",
  isAdmin: false,
  isManagingPartner: false
}
```

**What changes**: No `password` field. No `securityQuestion`. No `securityAnswer`.

Server creates the user with:
- `password_hash = NULL`
- `is_active = 0` (inactive until activated)
- `activation_token = <crypto-random UUID>`
- `activation_expires_at = <now + 48 hours>`
- Audit log entry: `user_created`

Server sends activation email to `mgarcia@smps.com` with link:
```
https://smps.bowdot.online/activate?token=<activation_token>
```

### Step 2: User Receives Activation Email

Email contains:
- Welcome message: "Bienvenido a SMPS Performance Compass"
- Activation link valid for 48 hours
- Instructions in Spanish

### Step 3: User Activates Account

**Endpoint**: `POST /api/auth/activate`

User provides:
```
{
  token: "<activation_token>",
  password: "their-chosen-password",
  confirmPassword: "their-chosen-password"
}
```

Server validates:
- Token exists and not expired
- Password meets requirements (min 8 chars, complexity rules)
- Token is single-use (deleted after successful activation)

Server updates:
- `password_hash = bcrypt(newPassword)`
- `is_active = 1`
- `activation_token = NULL`
- `activation_expires_at = NULL`
- Audit log: `account_activated`

### Step 4: User Logs In

Standard login flow. First login after activation.

---

## Password Reset Flow (New)

### Step 1: User Requests Reset

**Endpoint**: `POST /api/auth/forgot-password`

```
{ email: "mgarcia@smps.com" }
```

Server:
- Always returns `200 { message: "If an account exists with this email, a reset link has been sent." }`
- Does NOT reveal whether email exists (prevents enumeration)
- If email exists: generates `password_reset_token`, stores in DB with 1-hour expiry, sends email
- Audit log: `password_reset_requested`

### Step 2: User Receives Reset Email

Email contains:
- Reset link: `https://smps.bowdot.online/reset-password?token=<reset_token>`
- Valid for 1 hour
- Instructions in Spanish

### Step 3: User Resets Password

**Endpoint**: `POST /api/auth/reset-password-token`

```
{
  token: "<reset_token>",
  newPassword: "new-password",
  confirmPassword: "new-password"
}
```

Server validates:
- Token exists and not expired
- Token not already used
- Password meets requirements

Server updates:
- `password_hash = bcrypt(newPassword)`
- `must_change_password = 0`
- `password_reset_token = NULL`
- `password_reset_expires_at = NULL`
- Invalidates all existing sessions for this user (forces re-login)
- Audit log: `password_reset_completed`

---

## Password Change (Existing, Modified)

**Endpoint**: `POST /api/auth/change-password` (authenticated)

```
{
  currentPassword: "current",
  newPassword: "new-password"
}
```

Changes:
- **Remove** `securityQuestion` and `securityAnswer` parameters
- **Require** `currentPassword` for all users (remove the `must_change_password` bypass)
- Audit log: `password_changed`

---

## Admin Password Reset (Modified)

**Endpoint**: `POST /api/users/:id/reset-password` (admin only)

Admin triggers a password reset email. Admin does NOT set the new password.

Changes:
- **Remove** `newPassword` from request body
- Instead, generate a `password_reset_token` with 24-hour expiry
- Send email to the user with reset link
- Audit log: `admin_password_reset_requested`

---

## Token Architecture (Future Improvement)

### Current
- Single JWT token, 24h expiry
- Blocklist in `sessions` table (queried on every request)

### Target (Phase 2 — not in this phase)
- Access token: short-lived JWT (15 min), stored in httpOnly cookie
- Refresh token: longer-lived (7 days), stored in httpOnly cookie
- Rotation: new refresh token issued on every refresh, old one invalidated
- No blocklist needed for access tokens (short expiry)
- Refresh token revocation stored in DB

### This Phase
Keep current JWT approach but:
- Add `authentication_audit` table for all events
- Add token revocation endpoint (logout already exists)
- Reduce JWT expiry to 8 hours (from 24)
- Add idle timeout check (invalidate tokens older than 4 hours of inactivity)

---

## Security Question Removal Plan

### Phase 1: Add email-based reset (this phase)
- Add `forgot-password` and `reset-password-token` endpoints
- Keep `security-question` and `reset-password` endpoints working for backward compatibility
- Change frontend to use email-based reset by default
- Add migration to add new columns

### Phase 2: Deprecate security questions
- Frontend removes security question UI from ChangePassword page
- Backend keeps endpoints but marks them deprecated
- New users no longer get security questions
- Existing users can still use security question reset

### Phase 3: Remove security questions entirely
- Remove `security_question` and `security_answer` columns from `users`
- Remove `/api/auth/security-question` endpoint
- Remove `/api/auth/reset-password` (old endpoint)
- Remove security question from ChangePassword page
- Remove security question from system init
- Remove security question from user creation

---

## Password Requirements

Current: minimum 6 characters, no other rules.

Target:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Not the same as the previous password (store last 3 hashes)

This will be enforced in the Zod validation schema and on the frontend.

---

## Account States

| State | `is_active` | `password_hash` | `activation_token` | Can Login |
|-------|-----------|----------------|-------------------|-----------|
| Pending activation | 0 | NULL | set (not expired) | No |
| Activating | 0 | set | being consumed | No |
| Active | 1 | set | NULL | Yes |
| Deactivated | 0 | set | NULL | No |
| Password reset pending | 1 | set | NULL, reset_token set | Yes (until token used) |

---

## API Endpoints (New and Modified)

### New Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/activate` | POST | None | Activate account with token |
| `/api/auth/forgot-password` | POST | None | Request password reset email |
| `/api/auth/reset-password-token` | POST | None | Reset password with token |
| `/api/auth/resend-activation` | POST | None | Resend activation email |

### Modified Endpoints

| Endpoint | Change |
|----------|--------|
| `POST /api/users` | Remove `password` param; generate activation token; send email |
| `POST /api/users/:id/reset-password` | Remove `newPassword` param; send reset email instead |
| `POST /api/auth/change-password` | Remove `securityQuestion`/`securityAnswer` params |
| `POST /api/auth/reset-password` | Deprecate (keep for backward compatibility) |
| `POST /api/auth/security-question` | Deprecate (keep for backward compatibility) |

### Unchanged Endpoints

| Endpoint | Notes |
|----------|-------|
| `POST /api/auth/login` | No changes |
| `POST /api/auth/logout` | No changes |
| `GET /api/auth/me` | No changes |
| `POST /api/system/init` | Remove security question from init |

---

## Frontend Changes

### New Pages

| Page | Route | Purpose |
|------|-------|---------|
| Activation Page | `/activate?token=...` | Set password on first login |
| Forgot Password Page | `/forgot-password` | Enter email to get reset link |
| Reset Password Page | `/reset-password?token=...` | Set new password with token |

### Modified Pages

| Page | Change |
|------|--------|
| Login | Replace security question flow with "Forgot password?" → email flow |
| Change Password | Remove security question section |
| User Management | Remove password field from create user form |
| Setup | Remove security question from system init |

### Removed Pages

None — existing pages are modified, not removed (backward compatibility during transition).
