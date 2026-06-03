/**
 * Migration: Add smtp_config table for database-driven email configuration.
 * Safe to re-run (uses IF NOT EXISTS).
 */
import { pool, run } from './connection.js';

export async function migrateSmtpConfig(): Promise<void> {
  console.log('📧 Migrating smtp_config table...');

  const createTable = `CREATE TABLE IF NOT EXISTS smtp_config (
    id INT PRIMARY KEY DEFAULT 1,
    smtp_host VARCHAR(255) DEFAULT NULL,
    smtp_port INT DEFAULT 587,
    smtp_secure TINYINT(1) DEFAULT 0,
    smtp_user VARCHAR(255) DEFAULT NULL,
    smtp_pass TEXT DEFAULT NULL,
    smtp_from VARCHAR(255) DEFAULT 'SMPS Performance <notificaciones@bowdot.online>',
    mail_transport VARCHAR(50) DEFAULT 'auto',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

  try {
    await run(createTable);
    console.log('✅ smtp_config table created (if not exists)');

    // Check if config already exists
    const existing = await pool.execute('SELECT id FROM smtp_config WHERE id = 1');
    if (!existing[0] || (Array.isArray(existing[0]) && existing[0].length === 0)) {
      // Insert default config (inherits from env vars)
      await run(
        `INSERT INTO smtp_config (id, smtp_from, mail_transport) VALUES (1, 'SMPS Performance <notificaciones@bowdot.online>', 'auto')`
      );
      console.log('✅ Default smtp_config inserted');
    } else {
      console.log('ℹ️  smtp_config already exists');
    }
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateSmtpConfig()
    .then(() => { console.log('Migration complete'); process.exit(0); })
    .catch((err) => { console.error(err); process.exit(1); });
}
