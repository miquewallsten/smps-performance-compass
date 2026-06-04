/**
 * Migration: Add feature_visibility table for database-driven feature visibility control.
 * Safe to re-run (uses IF NOT EXISTS).
 */
import { pool, run } from './connection.js';

export async function migrateFeatureVisibility(): Promise<void> {
  console.log('🔧 Migrating feature_visibility table...');

  const createTable = `CREATE TABLE IF NOT EXISTS feature_visibility (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role VARCHAR(50) NOT NULL,
    feature VARCHAR(100) NOT NULL,
    visible TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_role_feature (role, feature)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

  try {
    await run(createTable);
    console.log('✅ feature_visibility table created (if not exists)');

    // Default visibility settings - all features visible to all roles by default
    const defaults = [
      { role: 'admin', feature: 'objectives', visible: 1 },
      { role: 'admin', feature: 'evaluations', visible: 1 },
      { role: 'admin', feature: 'communications', visible: 1 },
      { role: 'admin', feature: 'vacations', visible: 1 },
      { role: 'admin', feature: 'reports', visible: 1 },
      { role: 'admin', feature: 'user_management', visible: 1 },
      { role: 'admin', feature: 'position_management', visible: 1 },
      { role: 'admin', feature: 'evaluation_templates', visible: 1 },
      { role: 'admin', feature: 'question_library', visible: 1 },
      { role: 'socio', feature: 'objectives', visible: 1 },
      { role: 'socio', feature: 'evaluations', visible: 1 },
      { role: 'socio', feature: 'communications', visible: 1 },
      { role: 'socio', feature: 'vacations', visible: 1 },
      { role: 'socio', feature: 'reports', visible: 1 },
      { role: 'socio', feature: 'user_management', visible: 0 },
      { role: 'socio', feature: 'position_management', visible: 0 },
      { role: 'socio', feature: 'evaluation_templates', visible: 0 },
      { role: 'socio', feature: 'question_library', visible: 0 },
      { role: 'evaluator', feature: 'objectives', visible: 1 },
      { role: 'evaluator', feature: 'evaluations', visible: 1 },
      { role: 'evaluator', feature: 'communications', visible: 1 },
      { role: 'evaluator', feature: 'vacations', visible: 1 },
      { role: 'evaluator', feature: 'reports', visible: 0 },
      { role: 'evaluator', feature: 'user_management', visible: 0 },
      { role: 'evaluator', feature: 'position_management', visible: 0 },
      { role: 'evaluator', feature: 'evaluation_templates', visible: 0 },
      { role: 'evaluator', feature: 'question_library', visible: 0 },
      { role: 'staff', feature: 'objectives', visible: 1 },
      { role: 'staff', feature: 'evaluations', visible: 1 },
      { role: 'staff', feature: 'communications', visible: 1 },
      { role: 'staff', feature: 'vacations', visible: 1 },
      { role: 'staff', feature: 'reports', visible: 0 },
      { role: 'staff', feature: 'user_management', visible: 0 },
      { role: 'staff', feature: 'position_management', visible: 0 },
      { role: 'staff', feature: 'evaluation_templates', visible: 0 },
      { role: 'staff', feature: 'question_library', visible: 0 },
    ];

    // Insert defaults if not already present
    for (const def of defaults) {
      const existing = await pool.execute(
        'SELECT id FROM feature_visibility WHERE role = ? AND feature = ?',
        [def.role, def.feature]
      );
      if (!existing[0] || (Array.isArray(existing[0]) && existing[0].length === 0)) {
        await run(
          `INSERT INTO feature_visibility (role, feature, visible) VALUES (?, ?, ?)`,
          [def.role, def.feature, def.visible]
        );
      }
    }

    console.log('✅ Default feature_visibility settings inserted');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateFeatureVisibility()
    .then(() => { console.log('Migration complete'); process.exit(0); })
    .catch((err) => { console.error(err); process.exit(1); });
}
