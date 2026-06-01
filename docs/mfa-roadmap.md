# MFA Roadmap — SMPS Performance Compass

## Status

**Not implementing in this phase.** This document defines the future architecture so that MFA can be added later without major refactoring.

---

## Current State

- Single-factor authentication (password only)
- No MFA support of any kind
- No TOTP, no SMS, no authenticator apps, no backup codes

---

## Phase 1: Foundation (Current Phase)

Even though MFA is not being implemented yet, we will lay the groundwork:

1. **`authentication_audit` table** — logs all auth events, including future `mfa_enabled`, `mfa_disabled`, `mfa_challenge_succeeded`, `mfa_challenge_failed`
2. **User model changes** — add nullable columns for future MFA data:
   - `mfa_enabled TINYINT(1) DEFAULT 0`
   - `mfa_secret VARCHAR(255) NULL` (TOTP secret, encrypted at rest)
   - `mfa_backup_codes TEXT NULL` (JSON array of hashed backup codes)
   - `mfa_enabled_at DATETIME NULL`
3. **JWT payload extension** — add `mfa_verified: boolean` claim (default `false` for now)
4. **Login response extension** — add `mfaRequired: boolean` field (default `false` for now)

These columns will be NULL/default until MFA is implemented. No code changes needed in the auth flow yet.

---

## Phase 2: TOTP Implementation (Future)

### Technology Choice: TOTP (Time-Based One-Time Password)

**Why TOTP**:
- No SMS costs (unlike SMS OTP)
- No phone number required (privacy concern for a law firm)
- Works with Google Authenticator, Microsoft Authenticator, Authy, 1Password
- Offline-capable (no network needed for code generation)
- Well-standardized (RFC 6238)
- Self-hosted (no third-party service)

**Why NOT SMS OTP**:
- Costs money per message
- Vulnerable to SIM swap attacks
- Delivery not guaranteed in Mexico
- Phone numbers change
- Privacy concerns for a law firm

**Why NOT push notifications**:
- Requires a mobile app
- More complex to implement
- Not needed for 50 users

### Implementation

#### Dependencies

```json
{
  "dependencies": {
    "otplib": "^12.0.0",
    "qrcode": "^1.5.0"
  }
}
```

- `otplib`: TOTP generation and verification (RFC 6238)
- `qrcode`: Generate QR codes for authenticator app setup

#### New Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/mfa/setup` | POST | Yes | Generate TOTP secret and QR code |
| `/api/auth/mfa/verify` | POST | Yes | Verify TOTP code to complete setup |
| `/api/auth/mfa/disable` | POST | Yes | Disable MFA (requires password) |
| `/api/auth/mfa/backup-codes` | GET | Yes | Generate new backup codes |
| `/api/auth/login` | POST | None | Modified: return `mfaRequired: true` if MFA enabled |
| `/api/auth/mfa/challenge` | POST | None | Verify TOTP code during login |

#### TOTP Setup Flow

```
User → POST /api/auth/mfa/setup
       ← 200 { secret: "JBSWY3DPEHPK3PXP", qrCodeUrl: "otpauth://..." }
User → Scans QR code with authenticator app
User → POST /api/auth/mfa/verify { code: "123456" }
       ← 200 { backupCodes: ["abc123", "def456", ...], message: "MFA enabled" }
```

#### Login Flow with MFA

```
User → POST /api/auth/login { email, password }
       ← 200 { mfaRequired: true, mfaToken: "temp-uuid" }

User → POST /api/auth/mfa/challenge { mfaToken, code: "123456" }
       ← 200 { token: "jwt...", user: {...} }
```

If MFA is not enabled for the user, login proceeds as normal (single step).

#### TOTP Configuration

| Parameter | Value | Notes |
|-----------|-------|-------|
| Algorithm | SHA1 | Standard, compatible with all authenticator apps |
| Digits | 6 | Standard |
| Period | 30 seconds | Standard |
| Window | 1 | Allow ±1 period (30 seconds) to account for clock drift |
| Max attempts | 5 | Lock out after 5 failed attempts for 5 minutes |

#### Secret Storage

The TOTP secret must be encrypted at rest:

```typescript
// Encryption
const encrypted = encrypt(totpSecret, ENCRYPTION_KEY);
await db.run('UPDATE users SET mfa_secret = ?, mfa_enabled = 1 WHERE id = ?', [encrypted, userId]);

// Decryption
const encrypted = await db.get('SELECT mfa_secret FROM users WHERE id = ?', [userId]);
const totpSecret = decrypt(encrypted.mfa_secret, ENCRYPTION_KEY);
```

Use AES-256-GCM encryption with a key stored in environment variables.

#### Backup Codes

Generate 10 single-use backup codes when MFA is enabled:

```typescript
function generateBackupCodes(): string[] {
  return Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'));
}
```

- Stored as bcrypt hashes in `mfa_backup_codes` column (JSON array)
- Each code can only be used once
- User should save these codes in a secure location
- User can generate new codes via `/api/auth/mfa/backup-codes`

---

## Phase 3: Authenticator App Enhancements (Further Future)

### Recovery Flow

If a user loses their authenticator device:

1. Use one of the 10 backup codes
2. If no backup codes remaining, admin can disable MFA for the user:
   - `POST /api/users/:id/disable-mfa` (admin only)
   - Requires admin password confirmation
   - Audit logged

### Admin MFA Policy

- SuperUser can enforce MFA for all users
- Admin can enforce MFA for specific roles
- System config: `mfa_required` flag in `system_status` table
- If enforced, users must set up MFA before accessing the dashboard

---

## Database Schema (Future)

These columns will be added to the `users` table when MFA is implemented:

```sql
ALTER TABLE users ADD COLUMN mfa_enabled TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN mfa_secret TEXT NULL;
ALTER TABLE users ADD COLUMN mfa_backup_codes TEXT NULL;
ALTER TABLE users ADD COLUMN mfa_enabled_at DATETIME NULL;
ALTER TABLE users ADD COLUMN mfa_last_used_at DATETIME NULL;
```

And a new table for MFA attempt tracking:

```sql
CREATE TABLE IF NOT EXISTS mfa_attempts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  attempt_type ENUM('totp', 'backup_code') NOT NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mfa_attempts_user (user_id),
  INDEX idx_mfa_attempts_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Priority Assessment

| Phase | Priority | Business Justification |
|-------|----------|----------------------|
| Phase 1 (Foundation) | **Current** | Low effort, prepares for future |
| Phase 2 (TOTP) | Medium | 50 users, law firm, no urgent MFA need yet |
| Phase 3 (Policy) | Low | Needed only if compliance requires it |

For a law firm with 50 internal users, MFA is a "nice to have" rather than a "must have" right now. The activation token + email reset flow provides significant security improvement over the current security question approach. MFA can be added when compliance requirements demand it.

---

## Implementation Estimate

| Phase | Effort | Description |
|-------|--------|-------------|
| Phase 1 | 1 hour | Add columns to migration, add audit events |
| Phase 2 | 8-12 hours | TOTP setup, challenge, backup codes, QR generation |
| Phase 3 | 4-6 hours | Admin policy, enforcement, recovery |
