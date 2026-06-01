/**
 * Authentication redesign migration — adds activation tokens, password reset tokens,
 * authentication audit, and new user columns.
 *
 * This migration is designed to be idempotent (safe to re-run).
 * It does NOT remove existing security_question/security_answer columns.
 * Backward compatibility is maintained.
 */
import { getScalar, run } from './connection.js';

export async function migrateAuth(): Promise<void> {
  console.log('Running auth migration...');

  // ── 1. Modify users table: allow NULL password_hash, add new columns ────
  // Change password_hash from NOT NULL to NULL so unactivated users can exist without passwords
  try {
    const phCheck = await getScalar<number>(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash' AND IS_NULLABLE = 'NO'`
    );
    if (phCheck > 0) {
      await run('ALTER TABLE users MODIFY COLUMN password_hash TEXT NULL');
      console.log('  ✓ Made password_hash nullable');
    }
  } catch (e) {
    console.log('  ⚠ Could not modify password_hash column:', (e as Error).message);
  }

  // activation_token_hash — SHA-256 hash of the activation token (plaintext never stored)
  try {
    const atCheck = await getScalar<number>(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'activation_token_hash'`
    );
    if (atCheck === 0) {
      await run('ALTER TABLE users ADD COLUMN activation_token_hash VARCHAR(64) NULL AFTER must_change_password');
      console.log('  ✓ Added activation_token_hash column');
    }
  } catch (e) {
    console.log('  ⚠ Could not add activation_token_hash:', (e as Error).message);
  }

  // activation_expires_at — when the activation token expires
  try {
    const aeCheck = await getScalar<number>(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'activation_expires_at'`
    );
    if (aeCheck === 0) {
      await run('ALTER TABLE users ADD COLUMN activation_expires_at DATETIME NULL AFTER activation_token_hash');
      console.log('  ✓ Added activation_expires_at column');
    }
  } catch (e) {
    console.log('  ⚠ Could not add activation_expires_at:', (e as Error).message);
  }

  // activated_at — when the user activated their account
  try {
    const aaCheck = await getScalar<number>(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'activated_at'`
    );
    if (aaCheck === 0) {
      await run('ALTER TABLE users ADD COLUMN activated_at DATETIME NULL AFTER activation_expires_at');
      console.log('  ✓ Added activated_at column');
    }
  } catch (e) {
    console.log('  ⚠ Could not add activated_at:', (e as Error).message);
  }

  // password_changed_at — when the user last changed their password
  try {
    const pcCheck = await getScalar<number>(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_changed_at'`
    );
    if (pcCheck === 0) {
      await run('ALTER TABLE users ADD COLUMN password_changed_at DATETIME NULL AFTER activated_at');
      console.log('  ✓ Added password_changed_at column');
    }
  } catch (e) {
    console.log('  ⚠ Could not add password_changed_at:', (e as Error).message);
  }

  // MFA columns (nullable, defaults, for future use)
  try {
    const mfaCheck = await getScalar<number>(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'mfa_enabled'`
    );
    if (mfaCheck === 0) {
      await run('ALTER TABLE users ADD COLUMN mfa_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER password_changed_at');
      console.log('  ✓ Added mfa_enabled column');
    }
  } catch (e) {
    console.log('  ⚠ Could not add mfa_enabled:', (e as Error).message);
  }

  try {
    const msCheck = await getScalar<number>(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'mfa_secret'`
    );
    if (msCheck === 0) {
      await run('ALTER TABLE users ADD COLUMN mfa_secret TEXT NULL AFTER mfa_enabled');
      console.log('  ✓ Added mfa_secret column');
    }
  } catch (e) {
    console.log('  ⚠ Could not add mfa_secret:', (e as Error).message);
  }

  // Index for activation token lookup
  try {
    await run('ALTER TABLE users ADD INDEX idx_users_activation_token (activation_token_hash)');
    console.log('  ✓ Added index on users.activation_token_hash');
  } catch (e: any) {
    if (!/already exists|Duplicate/i.test(e?.message)) console.log('  ⚠ Could not add activation_token index:', e?.message);
  }

  // ── 2. Create password_reset_tokens table ──────────────────────────────
  try {
    await run(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      token_hash VARCHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      ip_address VARCHAR(45) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_prt_user (user_id),
      INDEX idx_prt_token (token_hash),
      INDEX idx_prt_expires (expires_at),
      CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('  ✓ Created password_reset_tokens table');
  } catch (e: any) {
    if (!/already exists/i.test(e?.message)) console.log('  ⚠ Could not create password_reset_tokens:', e?.message);
    else console.log('  ✓ password_reset_tokens table already exists');
  }

  // ── 3. Create authentication_audit table ────────────────────────────────
  try {
    await run(`CREATE TABLE IF NOT EXISTS authentication_audit (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NULL,
      action VARCHAR(50) NOT NULL,
      ip_address VARCHAR(45) NULL,
      user_agent TEXT NULL,
      metadata JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_user (user_id),
      INDEX idx_audit_action (action),
      INDEX idx_audit_created (created_at),
      INDEX idx_audit_ip (ip_address)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('  ✓ Created authentication_audit table');
  } catch (e: any) {
    if (!/already exists/i.test(e?.message)) console.log('  ⚠ Could not create authentication_audit:', e?.message);
    else console.log('  ✓ authentication_audit table already exists');
  }

  // ── 4. Migrate existing users: set activated_at for active users with passwords ──
  // All existing users who have a password and are active should be considered "activated"
  try {
    const result = await run(
      `UPDATE users SET activated_at = created_at, password_changed_at = COALESCE(updated_at, created_at) WHERE activated_at IS NULL AND password_hash IS NOT NULL AND is_active = 1`
    );
    if (result.affectedRows > 0) {
      console.log(`  ✓ Set activated_at for ${result.affectedRows} existing active users`);
    }
  } catch (e) {
    console.log('  ⚠ Could not set activated_at for existing users:', (e as Error).message);
  }

  console.log('Auth migration complete.');
}
