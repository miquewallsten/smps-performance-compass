# Copilot Auth Boundary — SMPS Performance Compass

## Overview

This document defines what the Copilot (AI assistant) can and cannot do regarding authentication and user management after the auth redesign. The principle is: **Copilot creates the employee record, but never touches credentials.**

---

## Current Copilot User Creation

The `users` tool in `server/copilot/tools/users.ts` currently creates users with:

```typescript
await db.run('INSERT INTO users (id, email, password_hash, security_question, security_answer, name, position, ...) VALUES (?, ?, ?, ...)',
  [id, args.email, hp, '¿Email?', args.email, args.name, derivedPosition, ...]);
```

**Problems**:
1. Requires a `password` parameter — Copilot sets the password
2. Sets `security_question` to `'¿Email?'` and `security_answer` to the user's email (identical to admin creation)
3. Sets `must_change_password = 1` — forcing user to change the known password on first login
4. The password is sent in plaintext through the AI conversation

---

## New Copilot User Creation (After Redesign)

### What Copilot CAN Do

| Action | Allowed | Notes |
|--------|---------|-------|
| Create employee record (name, email, position, role) | ✅ | No password needed |
| Assign supervisor | ✅ | Same as current |
| Set role (admin, managing_partner) | ✅ | Same as current |
| Set position, practice area, location | ✅ | Same as current |
| Activate/deactivate user | ✅ | Same as current |
| Update role | ✅ | Same as current |
| Search/list users | ✅ | Same as current (with field restrictions) |

### What Copilot CANNOT Do

| Action | Allowed | Notes |
|--------|---------|-------|
| Set passwords | ❌ | User sets their own password via activation link |
| Read passwords | ❌ | Never stored in plaintext; hashed only |
| Reset passwords | ❌ | Must go through email-based reset flow |
| View activation tokens | ❌ | Tokens are hashed in DB; only email links contain them |
| View password reset tokens | ❌ | Tokens are hashed in DB |
| Resend activation emails | ⚠️ | Can trigger, but cannot see the token |
| Read security answers | ❌ | Will be removed in Phase 3 |
| Read authentication audit | ❌ | Not within Copilot's scope |
| Modify MFA settings | ❌ | Not within Copilot's scope |

---

## Copilot Tool Modifications

### users Tool — Modified Parameters

**Current parameters**:
```typescript
{
  action: 'create',
  name: 'string',
  email: 'string',
  position: 'string',
  password: 'string',    // ← REMOVE
  practice_area: 'string',
  custom_position_id: 'string',
  location_id: 'string',
  is_admin: 'string',
  is_managing_partner: 'string'
}
```

**New parameters**:
```typescript
{
  action: 'create',
  name: 'string',
  email: 'string',
  position: 'string',
  // password REMOVED — user activates via email
  practice_area: 'string',
  custom_position_id: 'string',
  location_id: 'string',
  is_admin: 'string',
  is_managing_partner: 'string'
}
```

**New behavior for `create` action**:
1. Validate name, email, position (same as current)
2. Check email uniqueness (same as current)
3. Generate `activation_token` and `activation_expires_at`
4. Insert user with `password_hash = NULL`, `is_active = 0`
5. Send activation email (or log if email fails)
6. Return user data + `activationLink` (for admin reference)

**New response**:
```json
{
  "ok": true,
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "activationSent": true,
  "message": "Usuario creado. Se ha enviado un correo de activación."
}
```

If email fails:
```json
{
  "ok": true,
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "activationSent": false,
  "message": "Usuario creado pero no se pudo enviar el correo de activación. El administrador debe compartir el enlace manualmente.",
  "activationLink": "https://smps.bowdot.online/activate?token=..."
}
```

### users Tool — Removed Actions

| Action | Change | Reason |
|--------|--------|--------|
| `create` (with password) | Modified — no password param | Users set their own passwords |
| `batch_create` (with password) | Modified — no password param | Same as above |

### users Tool — Added Actions

| Action | Description |
|--------|-------------|
| `resend_activation` | Resend activation email for a pending user. Does NOT reveal the token. |

### analyze Tool — Restricted Tables

The `analyze` tool must NEVER be able to query these tables/columns:

| Table/Column | Reason |
|-------------|--------|
| `users.password_hash` | Contains bcrypt hashes — still sensitive |
| `users.security_answer` | Will be removed but still sensitive during transition |
| `users.activation_token` | Allows account takeover if leaked |
| `users.mfa_secret` | Would allow bypassing MFA |
| `users.mfa_backup_codes` | Would allow bypassing MFA |
| `sessions.token_hash` | Would allow session hijacking |
| `copilot_config.api_key` | Contains API keys |
| `password_reset_tokens` | Would allow password reset bypass |
| `authentication_audit` | Contains sensitive security logs |

**Implementation**: Add a table/column blacklist to the `analyze` tool's SQL validation:

```typescript
// In server/copilot/tools/analyze.ts
const BLOCKED_TABLES = [
  'sessions',
  'password_reset_tokens',
  'authentication_audit',
];

const BLOCKED_COLUMNS: Record<string, string[]> = {
  'users': ['password_hash', 'security_answer', 'activation_token', 'mfa_secret', 'mfa_backup_codes'],
  'copilot_config': ['api_key'],
};

function validateQuery(sql: string): string | null {
  // Check for blocked tables
  for (const table of BLOCKED_TABLES) {
    if (sql.toLowerCase().includes(table.toLowerCase())) {
      return `No se puede consultar la tabla '${table}' por razones de seguridad.`;
    }
  }
  // Check for blocked columns
  for (const [table, columns] of Object.entries(BLOCKED_COLUMNS)) {
    for (const column of columns) {
      // Match patterns like "table.column" or just "column" when the table is referenced
      if (sql.toLowerCase().includes(`${table.toLowerCase()}.${column.toLowerCase()}`) ||
          (sql.toLowerCase().includes(table.toLowerCase()) && sql.toLowerCase().includes(column.toLowerCase()))) {
        return `No se puede consultar '${table}.${column}' por razones de seguridad.`;
      }
    }
  }
  return null;
}
```

Additionally, when the `analyze` tool queries the `users` table, it should always use the safe column list:

```sql
SELECT id, name, email, position, practice_area, custom_position_id, location_id,
       is_admin, is_managing_partner, is_active, must_change_password, created_at, updated_at
FROM users
```

Never `SELECT * FROM users`.

---

## Copilot Instructions Update

The copilot instructions must be updated to reflect these changes:

### Current Instructions (relevant excerpt)
```
7. When creating users, always set must_change_password=true
8. When showing user data, never include password_hash or security_answer fields
```

### New Instructions
```
7. When creating users, NEVER set a password. The system sends an activation email.
   If the email fails, tell the admin to share the activation link manually.
8. NEVER show password_hash, security_answer, activation_token, mfa_secret, or
   mfa_backup_codes fields — these are security-sensitive.
9. NEVER attempt to reset passwords. Direct the admin to use the password reset email flow.
10. When a new user is created, confirm that an activation email was sent.
    If it wasn't sent, provide the activation link for manual sharing.
```

---

## Boundary Enforcement Summary

| Boundary | Enforcement |
|----------|-------------|
| Copilot cannot set passwords | Remove `password` parameter from `create` action |
| Copilot cannot read passwords | `USER_FIELDS` constant already excludes `password_hash` |
| Copilot cannot read security answers | `USER_FIELDS` constant already excludes `security_answer` |
| Copilot cannot read activation tokens | Add `activation_token` to exclusion list |
| Copilot cannot query sensitive tables | Add blacklist to `analyze` tool |
| Copilot cannot query sensitive columns | Add column blacklist to `analyze` tool |
| Copilot cannot reset passwords | Remove `password` from all user-modification actions |
| Copilot instructions reflect new rules | Update `COPILOT_INSTRUCTIONS.md` and `instructions-inline.ts` |

---

## Transition Plan

### Phase 1 (Auth redesign — this phase)
- Remove `password` from Copilot `create` action
- Add `activation_token` and `mfa_*` columns to column exclusion list
- Add `password_reset_tokens` and `authentication_audit` to table blacklist
- Update Copilot instructions
- Add `resend_activation` action to `users` tool

### Phase 2 (Ongoing)
- Monitor Copilot behavior for any attempts to access sensitive data
- Add audit logging for all Copilot tool calls (separate from auth audit)

### Phase 3 (After security question removal)
- Remove `security_answer` from column exclusion list (column no longer exists)
- Remove `security_question` from user creation paths
