# Auth Schema Design — SMPS Performance Compass

## Overview

Schema changes required to support the new authentication model: activation tokens, password reset tokens, and authentication audit logging.

**No migrations are created.** This document defines the target schema only.

---

## New Tables

### password_reset_tokens

Stores password reset tokens separate from users. A user can have multiple pending reset tokens.

```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_prt_user (user_id),
  INDEX idx_prt_token (token_hash),
  INDEX idx_prt_expires (expires_at),

  -- Foreign key
  CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Design decisions**:
- `token_hash`: SHA-256 hash of the token sent to the user. The plaintext token is never stored, similar to how JWT blocklist works. When a user submits a reset token, we hash it and look it up.
- `used_at`: When the token was used. NULL until used. Used for audit trail.
- `ip_address`: IP address that requested the reset, for audit.
- Separate table from users because a user can have multiple reset tokens (they might request several before using one).

### authentication_audit

Records every authentication-related event for security auditing and compliance.

```sql
CREATE TABLE IF NOT EXISTS authentication_audit (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  action VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_created (created_at),
  INDEX idx_audit_ip (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Audit actions**:

| Action | Description | user_id |
|--------|-------------|---------|
| `login_success` | Successful login | user's id |
| `login_failed` | Failed login attempt | NULL or user's id if email exists |
| `login_failed_deactivated` | Login attempt on deactivated account | user's id |
| `logout` | User logged out | user's id |
| `password_changed` | User changed their password | user's id |
| `password_reset_requested` | User requested a password reset | user's id |
| `password_reset_email_sent` | Reset email sent | user's id |
| `password_reset_completed` | User reset password via token | user's id |
| `password_reset_failed` | Invalid or expired reset token | NULL (we don't know who) |
| `admin_password_reset` | Admin triggered password reset | target user's id, admin's id in metadata |
| `activation_email_sent` | Activation email sent to new user | user's id |
| `activation_email_resent` | Activation email resent | user's id |
| `account_activated` | User activated their account | user's id |
| `activation_failed` | Invalid or expired activation token | NULL |
| `token_revoked` | JWT token revoked (logout) | user's id |
| `mfa_enabled` | User enabled MFA (future) | user's id |
| `mfa_disabled` | User disabled MFA (future) | user's id |
| `mfa_challenge_success` | MFA challenge passed (future) | user's id |
| `mfa_challenge_failed` | MFA challenge failed (future) | user's id |
| `user_created` | Admin created a user record | target user's id, admin's id in metadata |
| `user_deactivated` | Admin deactivated a user | target user's id, admin's id in metadata |

**metadata format**:
```json
{
  "actor_id": "uuid-of-admin-who-performed-action",
  "token_prefix": "first-8-chars-of-token",
  "email": "user@example.com",
  "reason": "optional reason text"
}
```

---

## Modified Tables

### users (add columns)

```sql
-- Activation flow
ALTER TABLE users ADD COLUMN activation_token VARCHAR(64) NULL;
ALTER TABLE users ADD COLUMN activation_expires_at DATETIME NULL;

-- MFA (future, add columns now as nullable defaults)
ALTER TABLE users ADD COLUMN mfa_enabled TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN mfa_secret TEXT NULL;
ALTER TABLE users ADD COLUMN mfa_backup_codes TEXT NULL;
ALTER TABLE users ADD COLUMN mfa_enabled_at DATETIME NULL;
ALTER TABLE users ADD COLUMN mfa_last_used_at DATETIME NULL;

-- Index for activation token lookup
ALTER TABLE users ADD INDEX idx_users_activation_token (activation_token);
```

**Notes**:
- `activation_token` stores the SHA-256 hash of the plaintext token sent to the user (same pattern as JWT blocklist). Plaintext token is never stored in DB.
- `activation_token` and `activation_expires_at` are cleared (set to NULL) after successful activation.
- MFA columns are all nullable with defaults. They won't be used until Phase 2 of MFA implementation.
- `password_hash` can be NULL for newly created users who haven't activated yet. This is a breaking change — the login flow must check for NULL password_hash and return an appropriate error.

### password_hash NULL handling

Currently `password_hash TEXT NOT NULL`. Change to:

```sql
ALTER TABLE users MODIFY COLUMN password_hash TEXT NULL;
```

This allows:
- `password_hash = NULL` → account not yet activated
- `password_hash = '<bcrypt_hash>'` → account has a password

Login flow must check:
```sql
-- If password_hash is NULL, the account hasn't been activated yet
SELECT * FROM users WHERE email = ?
-- If result.password_hash is NULL, return: "Account not yet activated. Check your email."
```

---

## Index Summary

### New Indexes

| Table | Column | Purpose |
|-------|--------|---------|
| `users` | `activation_token` | Fast lookup of activation tokens |
| `password_reset_tokens` | `user_id` | Find all tokens for a user |
| `password_reset_tokens` | `token_hash` | Fast lookup of reset tokens |
| `password_reset_tokens` | `expires_at` | Cleanup of expired tokens |
| `authentication_audit` | `user_id` | Audit trail per user |
| `authentication_audit` | `action` | Filter by event type |
| `authentication_audit` | `created_at` | Time-based queries |
| `authentication_audit` | `ip_address` | IP-based queries (security analysis) |

### Existing Indexes (No Changes)

| Table | Column | Purpose |
|-------|--------|---------|
| `users` | `email` | Login lookup (unique) |
| `sessions` | `token_hash` | JWT blocklist lookup |
| `sessions` | `user_id` | Find sessions for a user |

---

## Expiration Strategy

### Activation Tokens

| Property | Value |
|----------|-------|
| Expiry | 48 hours from creation |
| Storage | `users.activation_expires_at` |
| Cleanup | On activation attempt or periodic job |
| Renewal | Via `POST /api/auth/resend-activation` |

### Password Reset Tokens

| Property | Value |
|----------|-------|
| Expiry | 1 hour (self-service) or 24 hours (admin-triggered) |
| Storage | `password_reset_tokens.expires_at` |
| Cleanup | Periodic job: `DELETE FROM password_reset_tokens WHERE expires_at < NOW() - INTERVAL 7 DAY` |
| Single use | `used_at` set on consumption; token is invalid after use |

### JWT Tokens (Existing)

| Property | Value |
|----------|-------|
| Expiry | 24 hours (reduce to 8 hours in this phase) |
| Storage | Client-side localStorage |
| Revocation | `sessions` table blocklist |
| Cleanup | On logout and periodic cleanup |

---

## Data Integrity

### Foreign Keys

```sql
-- password_reset_tokens → users
ALTER TABLE password_reset_tokens
  ADD CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- authentication_audit → users (no FK, user_id can be NULL for anonymous events)
```

### Cascading Deletes

- When a user is deleted (deactivated, not actually deleted), their `password_reset_tokens` should be cleaned up.
- `authentication_audit` records should be preserved even if a user is deactivated (for compliance).

### Cleanup Strategy

```sql
-- Run daily via cron job or scheduled task

-- 1. Clean up expired password reset tokens (keep for 7 days for audit)
DELETE FROM password_reset_tokens
WHERE expires_at < NOW() - INTERVAL 7 DAY;

-- 2. Clean up used password reset tokens (keep for 30 days for audit)
DELETE FROM password_reset_tokens
WHERE used_at IS NOT NULL AND used_at < NOW() - INTERVAL 30 DAY;

-- 3. Clean up expired sessions
DELETE FROM sessions
WHERE expires_at < NOW();

-- 4. Clean up old audit records (keep for 2 years for compliance)
DELETE FROM authentication_audit
WHERE created_at < NOW() - INTERVAL 2 YEAR;
```

---

## Migration Order

When implementing, run migrations in this order:

1. Add `activation_token`, `activation_expires_at` columns to `users`
2. Add MFA columns to `users` (nullable, defaults)
3. Modify `password_hash` to allow NULL
4. Create `password_reset_tokens` table
5. Create `authentication_audit` table
6. Add indexes
7. **Do NOT remove** `security_question` and `security_answer` columns yet (backward compatibility)

### Data Migration

```sql
-- For existing users who have must_change_password = 1:
-- They will need to use the OLD reset-password flow (security question)
-- until the new flow is in place.
-- After the frontend is updated, remove the old flow.

-- For new users going forward:
-- They will be created with activation tokens instead of passwords.
-- password_hash will be NULL until they activate.
```

---

## Backward Compatibility

During the transition period (Phase 1 → Phase 2 → Phase 3):

1. **Old endpoints remain functional**: `/api/auth/security-question` and `/api/auth/reset-password` (old) continue working
2. **New endpoints are added alongside**: `/api/auth/forgot-password`, `/api/auth/reset-password-token`, `/api/auth/activate`
3. **Frontend switches to new flow**: Login page, user creation, password reset all use new endpoints
4. **Old columns remain**: `security_question` and `security_answer` stay in `users` table
5. **Old columns are removed in Phase 3**: After all references are removed from code

---

## Estimated Storage Impact

For 50 users:

| Table | Estimated Rows | Estimated Size |
|-------|---------------|---------------|
| `password_reset_tokens` | ~100/year | ~50 KB |
| `authentication_audit` | ~5,000/year | ~2 MB |
| `users` (new columns) | 50 | ~5 KB |

For 1,000 users:

| Table | Estimated Rows | Estimated Size |
|-------|---------------|---------------|
| `password_reset_tokens` | ~2,000/year | ~1 MB |
| `authentication_audit` | ~100,000/year | ~40 MB |
| `users` (new columns) | 1,000 | ~100 KB |

The `authentication_audit` table will be the largest. With proper indexing and periodic cleanup (2-year retention), it should not cause performance issues.
