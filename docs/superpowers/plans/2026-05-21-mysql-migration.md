# MySQL Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace better-sqlite3 with mysql2, making the entire database layer async and Hostinger-compatible (no native modules).

**Architecture:** Create a thin async wrapper around mysql2/promise that mimics the current better-sqlite3 API (`db.get()`, `db.all()`, `db.run()`, `db.transaction()`). All 14 route files become async. MySQL tables auto-create on startup. No SSH or build tools needed on deployment.

**Tech Stack:** mysql2 (pure JS), Express async handlers, UUID generation in app code

---

## File Structure

### New Files
- `server/db/connection.ts` — **Rewrite**: MySQL pool wrapper with `get()`, `all()`, `run()`, `transaction()`, `exec()` methods
- `server/db/migrate-mysql.ts` — **New**: MySQL-specific migration script (standalone, runnable via `npx tsx`)

### Modified Files
- `server/db/migrate.ts` — **Rewrite**: MySQL CREATE TABLE statements, remove pragmas/sqlite_master
- `server/db/seed-users.ts` — **Rewrite**: Async MySQL inserts
- `server/db/auto-init.ts` — **Remove** (merged into server/index.ts)
- `server/index.ts` — **Rewrite**: Add auto-migration + seeding on startup, async Express handlers
- `server/routes/auth.ts` — **Rewrite**: Async db calls
- `server/routes/users.ts` — **Rewrite**: Async db calls
- `server/routes/evaluations.ts` — **Rewrite**: Async db calls, INSERT OR REPLACE → ON DUPLICATE KEY UPDATE
- `server/routes/assignments.ts` — **Rewrite**: Async db calls, UNIQUE constraint error → ER_DUP_ENTRY
- `server/routes/announcements.ts` — **Rewrite**: Async db calls, INSERT OR IGNORE → INSERT IGNORE
- `server/routes/periods.ts` — **Rewrite**: Async db calls, INSERT OR REPLACE → ON DUPLICATE KEY UPDATE
- `server/routes/vacations.ts` — **Rewrite**: Async db calls, INSERT OR REPLACE → ON DUPLICATE KEY UPDATE
- `server/routes/objectives.ts` — **Rewrite**: Async db calls
- `server/routes/action-plans.ts` — **Rewrite**: Async db calls
- `server/routes/questions.ts` — **Rewrite**: Async db calls
- `server/routes/positions.ts` — **Rewrite**: Async db calls
- `server/routes/system.ts` — **Rewrite**: Async db calls
- `server/routes/copilot.ts` — **Rewrite**: Async db calls, INSERT OR REPLACE → ON DUPLICATE KEY UPDATE
- `server/middleware/auth.ts` — **Rewrite**: Async db call
- `server/middleware/rbac.ts` — **Rewrite**: Async db call
- `server/db/connection.ts` — **Rewrite**: MySQL pool
- `server/db/schema.ts` — **Keep** (reference only, not used at runtime)
- `package.json` — **Modify**: Remove better-sqlite3, add mysql2
- `.env.production` — **Modify**: Replace DATABASE_URL with MYSQL_* vars
- `build-server.mjs` — **Modify**: Remove better-sqlite3 from externals, add mysql2
- `server.js` — **Keep** (entry point wrapper)

### Removed Files
- `server/db/auto-init.ts` — Merged into server/index.ts
- `server/db/smps.db` — No longer needed
- `server/db/migrate-standalone.cjs` — No longer needed
- `server/db/seed-users-standalone.cjs` — No longer needed

---

## Task 1: Install mysql2, Remove better-sqlite3

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove better-sqlite3 and add mysql2**

```bash
cd /Users/mikaelwallsten/Downloads/smps-performance-compass-main
npm uninstall better-sqlite3 @types/better-sqlite3
npm install mysql2
npm uninstall @types/better-sqlite3
```

- [ ] **Step 2: Verify package.json has mysql2 and not better-sqlite3**

Run: `grep -E "mysql2|better-sqlite3" package.json`
Expected: Shows `mysql2` in dependencies, no `better-sqlite3`

- [ ] **Step 3: Update build-server.mjs to remove better-sqlite3 external and add mysql2**

In `build-server.mjs`, change the esbuild command line from:
```
--external:better-sqlite3 --external:multer
```
to:
```
--external:mysql2
```

(Keep multer external if it has native bindings, but mysql2 is pure JS and doesn't need external — actually mysql2 IS pure JS so we should NOT externalize it. Only externalize native modules.)

The build-server.mjs should change to:
```javascript
import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';

console.log('Building server bundle with esbuild...');

try {
  execSync(
    'npx esbuild server/index.ts --bundle --platform=node --target=node18 --outfile=server.cjs --format=cjs --external:multer',
    { stdio: 'inherit', cwd: process.cwd() }
  );
  
  if (existsSync('server.cjs')) {
    const stats = statSync('server.cjs');
    console.log(`✓ server.cjs created (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.error('server.cjs was not created');
    process.exit(1);
  }
} catch (err) {
  console.error('Failed to build server.cjs:', err.message);
  process.exit(1);
}
```

Note: `better-sqlite3` is removed from externals (it's no longer a dependency). `multer` stays external because it may have optional native bindings. `mysql2` is NOT externalized because it's pure JavaScript and should be bundled.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json build-server.mjs
git commit -m "chore: replace better-sqlite3 with mysql2"
```

---

## Task 2: Create MySQL Connection Module

**Files:**
- Create: `server/db/connection.ts`

- [ ] **Step 1: Write the MySQL connection wrapper**

Create `server/db/connection.ts`:

```typescript
import mysql from 'mysql2/promise';

// MySQL connection configuration from environment variables
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'smps',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+00:00',
};

// Create the connection pool
export const pool = mysql.createPool(MYSQL_CONFIG);

// Helper types
interface RowDataPacket {
  [key: string]: any;
}

/**
 * Execute a query that returns a single row.
 * Returns the first row or undefined if no rows found.
 */
export async function get<T = RowDataPacket>(sql: string, params?: any[]): Promise<T | undefined> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(sql, params);
  return rows[0] as T | undefined;
}

/**
 * Execute a query that returns multiple rows.
 */
export async function all<T = RowDataPacket>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(sql, params);
  return rows as T[];
}

/**
 * Execute a query that modifies data (INSERT, UPDATE, DELETE).
 * Returns the result with affectedRows, insertId, etc.
 */
export async function run(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute<mysql.ResultSetHeader>(sql, params);
  return result;
}

/**
 * Execute raw SQL (for DDL statements like CREATE TABLE).
 */
export async function exec(sql: string): Promise<void> {
  await pool.execute(sql);
}

/**
 * Execute a query and return the first column of the first row.
 * Useful for COUNT queries.
 */
export async function getScalar<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
  const row = await get(sql, params);
  if (!row) return undefined;
  const values = Object.values(row);
  return values[0] as T;
}

/**
 * Run a transaction. The callback receives a connection (not a pool).
 * All operations within the callback use the same connection.
 * If the callback throws, the transaction is rolled back.
 */
export async function transaction<T>(callback: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Transaction-aware query helpers that work on a specific connection.
 * Use these inside transaction callbacks.
 */
export const tx = {
  async get<T = RowDataPacket>(conn: mysql.PoolConnection, sql: string, params?: any[]): Promise<T | undefined> {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(sql, params);
    return rows[0] as T | undefined;
  },
  async all<T = RowDataPacket>(conn: mysql.PoolConnection, sql: string, params?: any[]): Promise<T[]> {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(sql, params);
    return rows as T[];
  },
  async run(conn: mysql.PoolConnection, sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
    const [result] = await conn.execute<mysql.ResultSetHeader>(sql, params);
    return result;
  },
};

/**
 * Check if a table exists in the database.
 */
export async function tableExists(tableName: string): Promise<boolean> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
    [MYSQL_CONFIG.database, tableName]
  );
  return (rows[0] as any).cnt > 0;
}

// Export pool as default for direct access if needed
export default pool;

// Named exports matching the current import pattern
export const db = { get, all, run, exec, getScalar, transaction, tableExists, tx };
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit server/db/connection.ts`
Expected: No errors (may have some import resolution issues, that's OK for now)

- [ ] **Step 3: Commit**

```bash
git add server/db/connection.ts
git commit -m "feat: add MySQL connection wrapper module"
```

---

## Task 3: Create MySQL Migration Script

**Files:**
- Modify: `server/db/migrate.ts`

- [ ] **Step 1: Rewrite migrate.ts for MySQL**

Replace the entire contents of `server/db/migrate.ts` with MySQL-compatible CREATE TABLE statements. This file will be used both as a standalone script (`npx tsx server/db/migrate.ts`) and called from `server/index.ts` on startup.

```typescript
import { pool, exec, getScalar } from './connection.js';

async function migrate() {
  console.log('Running MySQL migrations...');

  // Create database tables
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      security_question VARCHAR(500) NOT NULL,
      security_answer VARCHAR(500) NOT NULL,
      name VARCHAR(255) NOT NULL,
      position VARCHAR(100) NOT NULL,
      practice_area VARCHAR(100),
      custom_position_id VARCHAR(36),
      is_admin TINYINT(1) NOT NULL DEFAULT 0,
      is_super_user TINYINT(1) NOT NULL DEFAULT 0,
      is_managing_partner TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      must_change_password TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS custom_positions (
      id VARCHAR(36) PRIMARY KEY,
      label VARCHAR(255) NOT NULL,
      level VARCHAR(50) NOT NULL,
      practice_area VARCHAR(100),
      base_position VARCHAR(100) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS period_configs (
      period VARCHAR(50) PRIMARY KEY,
      self_start VARCHAR(20) NOT NULL,
      self_end VARCHAR(20) NOT NULL,
      supervisor_start VARCHAR(20) NOT NULL,
      supervisor_end VARCHAR(20) NOT NULL,
      feedback_start VARCHAR(20) NOT NULL,
      feedback_end VARCHAR(20) NOT NULL,
      action_plan_start VARCHAR(20) NOT NULL,
      action_plan_end VARCHAR(20) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS supervisor_assignments (
      id VARCHAR(36) PRIMARY KEY,
      employee_id VARCHAR(36) NOT NULL,
      supervisor_id VARCHAR(36) NOT NULL,
      period VARCHAR(50) NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_assignment (employee_id, supervisor_id, period)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS evaluations (
      id VARCHAR(36) PRIMARY KEY,
      evaluator_id VARCHAR(36) NOT NULL,
      evaluated_id VARCHAR(36) NOT NULL,
      period VARCHAR(50) NOT NULL,
      type VARCHAR(50) NOT NULL,
      comments TEXT NOT NULL DEFAULT '',
      supervisor_comments TEXT,
      total_score DOUBLE NOT NULL DEFAULT 0,
      completed_at DATETIME,
      feedback_completed TINYINT(1) NOT NULL DEFAULT 0,
      feedback_completed_at DATETIME,
      feedback_completed_by VARCHAR(36),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (evaluated_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_evaluation (evaluator_id, evaluated_id, period, type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS evaluation_responses (
      id VARCHAR(36) PRIMARY KEY,
      evaluation_id VARCHAR(36) NOT NULL,
      question_id VARCHAR(100) NOT NULL,
      score INT NOT NULL,
      not_applicable TINYINT(1) NOT NULL DEFAULT 0,
      no_elements TINYINT(1) NOT NULL DEFAULT 0,
      FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS evaluation_na_approvals (
      id VARCHAR(36) PRIMARY KEY,
      evaluation_id VARCHAR(36) NOT NULL,
      question_id VARCHAR(100) NOT NULL,
      approved_by VARCHAR(36),
      approved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS personal_objectives (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      period VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'draft',
      supervisor_comments TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS action_plans (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      period VARCHAR(50) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS action_plan_items (
      id VARCHAR(36) PRIMARY KEY,
      plan_id VARCHAR(36) NOT NULL,
      description TEXT NOT NULL,
      responsible VARCHAR(255),
      deadline VARCHAR(20),
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES action_plans(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS announcements (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      content TEXT NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'info',
      priority INT NOT NULL DEFAULT 0,
      created_by VARCHAR(36) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS announcement_reads (
      id VARCHAR(36) PRIMARY KEY,
      announcement_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_read (user_id, announcement_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS vacation_requests (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      start_date VARCHAR(20) NOT NULL,
      end_date VARCHAR(20) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'vacation',
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      comments TEXT,
      approved_by VARCHAR(36),
      approved_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS vacation_config (
      id INT PRIMARY KEY DEFAULT 1,
      default_days INT NOT NULL DEFAULT 20,
      carry_over_max INT NOT NULL DEFAULT 5,
      advance_days_min INT NOT NULL DEFAULT 3
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS extra_vacation_days (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      days INT NOT NULL,
      reason VARCHAR(500) NOT NULL,
      period VARCHAR(50) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS module_config (
      id INT PRIMARY KEY DEFAULT 1,
      evaluations TINYINT(1) NOT NULL DEFAULT 1,
      communications TINYINT(1) NOT NULL DEFAULT 1,
      vacations TINYINT(1) NOT NULL DEFAULT 1,
      copilot TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS system_status (
      id INT PRIMARY KEY DEFAULT 1,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      activation_date DATETIME NOT NULL,
      payment_plan VARCHAR(50) NOT NULL DEFAULT 'monthly',
      max_users INT NOT NULL DEFAULT 50,
      tickets INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS activation_history (
      id VARCHAR(36) PRIMARY KEY,
      action VARCHAR(100) NOT NULL,
      date DATETIME NOT NULL,
      by_user VARCHAR(36),
      FOREIGN KEY (by_user) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS copilot_conversations (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL DEFAULT 'Nueva conversación',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS copilot_messages (
      id VARCHAR(36) PRIMARY KEY,
      conversation_id VARCHAR(36) NOT NULL,
      role VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      tool_calls TEXT,
      tool_results TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES copilot_conversations(id) ON DELETE CASCADE,
      INDEX idx_copilot_messages_conversation (conversation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS copilot_config (
      id INT PRIMARY KEY DEFAULT 1,
      model VARCHAR(100) NOT NULL DEFAULT 'llama-3.3-70b-versatile',
      api_provider VARCHAR(50) NOT NULL DEFAULT 'groq',
      can_manage_users TINYINT(1) NOT NULL DEFAULT 1,
      can_manage_evaluations TINYINT(1) NOT NULL DEFAULT 1,
      can_manage_vacations TINYINT(1) NOT NULL DEFAULT 1,
      can_manage_announcements TINYINT(1) NOT NULL DEFAULT 1,
      can_manage_periods TINYINT(1) NOT NULL DEFAULT 0,
      can_manage_system TINYINT(1) NOT NULL DEFAULT 0,
      can_view_reports TINYINT(1) NOT NULL DEFAULT 1,
      max_tokens INT NOT NULL DEFAULT 2048,
      temperature DOUBLE NOT NULL DEFAULT 0.3
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON evaluations(evaluator_id)`,
    `CREATE INDEX IF NOT EXISTS idx_evaluations_evaluated ON evaluations(evaluated_id)`,
    `CREATE INDEX IF NOT EXISTS idx_evaluations_period ON evaluations(period)`,
    `CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_employee ON supervisor_assignments(employee_id)`,
    `CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_supervisor ON supervisor_assignments(supervisor_id)`,
    `CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_vacation_requests_user ON vacation_requests(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_copilot_conversations_user ON copilot_conversations(user_id)`,
  ];

  for (const sql of statements) {
    try {
      await exec(sql);
    } catch (err: any) {
      // Ignore "already exists" errors for indexes
      if (!err.message?.includes('Duplicate key name') && !err.message?.includes('already exists')) {
        throw err;
      }
    }
  }

  // Verify tables
  const count = await getScalar<number>('SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?', [process.env.MYSQL_DATABASE || 'smps']);
  console.log(`✓ Database initialized (${count} tables)`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => { console.log('Migration completed successfully.'); process.exit(0); })
    .catch((err) => { console.error('Migration failed:', err); process.exit(1); });
}

export { migrate };
```

- [ ] **Step 2: Commit**

```bash
git add server/db/migrate.ts
git commit -m "feat: rewrite migrate.ts for MySQL"
```

---

## Task 4: Create MySQL Seed Script

**Files:**
- Modify: `server/db/seed-users.ts`

- [ ] **Step 1: Rewrite seed-users.ts for MySQL**

The seed script must be fully async, use mysql2, and generate timestamps in MySQL format. It seeds the SuperAdmin and 17 regular users. The key change is all `db.prepare().run()` → `await db.run()` and `db.prepare().get()` → `await db.get()`, and `db.transaction()` → `await db.transaction()`.

This is a large file (~200 lines). The full rewrite replaces:
- `import Database from 'better-sqlite3'` → `import { db, tx } from './connection.js'`
- `new Database(DB_PATH)` → uses the `db` pool
- `db.pragma(...)` → removed
- `db.prepare(sql).get(params)` → `await db.get(sql, params)` or `await tx.get(conn, sql, params)` inside transactions
- `db.prepare(sql).all(params)` → `await db.all(sql, params)`
- `db.prepare(sql).run(params)` → `await db.run(sql, params)`
- `db.transaction(() => { ... })` → `await db.transaction(async (conn) => { ... })`
- `datetime('now')` in SQL → `new Date().toISOString().slice(0, 19).replace('T', ' ')` in JavaScript
- `bcrypt.hashSync()` stays synchronous (it's fast)
- `uuidv4()` stays the same
- `db.close()` → removed (pool manages connections)

- [ ] **Step 2: Commit**

```bash
git add server/db/seed-users.ts
git commit -m "feat: rewrite seed-users.ts for MySQL async"
```

---

## Task 5: Rewrite server/index.ts with Auto-Migration

**Files:**
- Modify: `server/index.ts`

- [ ] **Step 1: Rewrite server/index.ts**

The new `server/index.ts` will:
1. Import the MySQL pool and migration/seed functions
2. Run auto-migration on startup (create tables if they don't exist)
3. Seed the SuperAdmin if no users exist
4. Initialize system_status and module_config if empty
5. Make all Express route handlers async (they already mostly are, just need to add `async` keyword)
6. Use `await db.get/all/run` instead of sync `db.prepare().get/all/run`

The key structural changes:
- Remove the massive inline migration SQL (it's now in `migrate.ts`)
- Add `import { migrate } from './db/migrate.js'`
- Add `import { seedUsers } from './db/seed-users.js'`
- Add startup sequence: `await migrate()`, then `await seedUsers()`
- Export `pool` so routes can import from `connection.ts`
- All route imports stay the same, but each route file will be rewritten in subsequent tasks

- [ ] **Step 2: Commit**

```bash
git add server/index.ts
git commit -m "feat: rewrite server/index.ts with MySQL auto-migration"
```

---

## Task 6: Rewrite Auth Middleware for MySQL

**Files:**
- Modify: `server/middleware/auth.ts`
- Modify: `server/middleware/rbac.ts`

- [ ] **Step 1: Rewrite auth.ts**

Change from:
```typescript
import { db } from '../db/connection.js';
const session = db.prepare('SELECT id FROM sessions WHERE token_hash = ?').get(hashedToken);
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
```
To:
```typescript
import { db } from '../db/connection.js';
const session = await db.get('SELECT id FROM sessions WHERE token_hash = ?', [hashedToken]);
const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
```

Make the middleware function async and use `await` for all db calls.

- [ ] **Step 2: Rewrite rbac.ts**

Same pattern: import `db` from connection, make the middleware async, add `await` to all db calls.

- [ ] **Step 3: Commit**

```bash
git add server/middleware/auth.ts server/middleware/rbac.ts
git commit -m "feat: rewrite auth middleware for MySQL async"
```

---

## Task 7: Rewrite Route Files for MySQL (Part 1: Auth & Users)

**Files:**
- Modify: `server/routes/auth.ts`
- Modify: `server/routes/users.ts`

- [ ] **Step 1: Rewrite auth.ts**

All `db.prepare().get/run` → `await db.get/run`. All route handlers become `async (req, res) => { ... }`. Error handling changes: `UNIQUE constraint failed` → check for `err.code === 'ER_DUP_ENTRY'`.

- [ ] **Step 2: Rewrite users.ts**

Same async conversion. Dynamic UPDATE queries stay dynamic but use `await db.run()`. The `SAFE_USER_COLUMNS` constant stays.

- [ ] **Step 3: Commit**

```bash
git add server/routes/auth.ts server/routes/users.ts
git commit -m "feat: rewrite auth and users routes for MySQL async"
```

---

## Task 8: Rewrite Route Files for MySQL (Part 2: Evaluations & Assignments)

**Files:**
- Modify: `server/routes/evaluations.ts`
- Modify: `server/routes/assignments.ts`

- [ ] **Step 1: Rewrite evaluations.ts**

Key changes:
- `db.prepare().get/all/run` → `await db.get/all/run`
- `db.transaction(() => { ... })` → `await db.transaction(async (conn) => { ... })` with `tx.get/tx.run` instead of `db.get/db.run` inside the transaction
- `INSERT OR REPLACE INTO evaluation_na_approvals` → `INSERT INTO evaluation_na_approvals ... ON DUPLICATE KEY UPDATE approved_by = VALUES(approved_by), approved_at = VALUES(approved_at)`
- `err.message?.includes('UNIQUE constraint failed')` → `err.code === 'ER_DUP_ENTRY'`
- Dynamic WHERE building stays the same pattern but uses `await db.all()`

- [ ] **Step 2: Rewrite assignments.ts**

- `UNIQUE constraint failed` error check → `err.code === 'ER_DUP_ENTRY'`
- All db calls become async

- [ ] **Step 3: Commit**

```bash
git add server/routes/evaluations.ts server/routes/assignments.ts
git commit -m "feat: rewrite evaluations and assignments routes for MySQL async"
```

---

## Task 9: Rewrite Route Files for MySQL (Part 3: Remaining Routes)

**Files:**
- Modify: `server/routes/announcements.ts`
- Modify: `server/routes/periods.ts`
- Modify: `server/routes/vacations.ts`
- Modify: `server/routes/objectives.ts`
- Modify: `server/routes/action-plans.ts`
- Modify: `server/routes/questions.ts`
- Modify: `server/routes/positions.ts`
- Modify: `server/routes/system.ts`
- Modify: `server/routes/copilot.ts`

- [ ] **Step 1: Rewrite each route file with the same pattern:**
  - All `db.prepare().get/all/run` → `await db.get/all/run`
  - All `db.transaction()` → `await db.transaction(async (conn) => { ... })` with `tx.get/tx.all/tx.run`
  - `INSERT OR REPLACE` → `INSERT ... ON DUPLICATE KEY UPDATE`
  - `INSERT OR IGNORE` → `INSERT IGNORE`
  - `UNIQUE constraint failed` → `err.code === 'ER_DUP_ENTRY'`
  - `datetime('now')` in SQL → JavaScript `new Date().toISOString().slice(0, 19).replace('T', ' ')`
  - All Express handlers become `async (req, res) => { ... }`
  - Copilot's `INSERT INTO copilot_config VALUES(1, ...)` → `INSERT INTO copilot_config (id, model, api_provider, ...) VALUES (1, ...)` (always specify column names)

- [ ] **Step 2: Commit**

```bash
git add server/routes/
git commit -m "feat: rewrite all remaining route files for MySQL async"
```

---

## Task 10: Update Environment Configuration

**Files:**
- Modify: `.env.production`
- Modify: `.env` (dev)
- Delete: `server/db/auto-init.ts`
- Delete: `server/db/migrate-standalone.cjs`
- Delete: `server/db/seed-users-standalone.cjs`
- Delete: `server/db/smps.db`, `server/db/smps.db-shm`, `server/db/smps.db-wal`

- [ ] **Step 1: Update .env.production**

Replace `DATABASE_URL` with MySQL credentials:
```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=u906489923_smPS
MYSQL_PASSWORD=<from-hostinger-panel>
MYSQL_DATABASE=u906489923_smPS
JWT_SECRET=791794abc42eb8c7eeae01385d9b45943ded236691169c081f86970f64dc08e289d99a6becbc7ec6b25047e124f5053a3dc39d41af3ea5ae02e8c53840d17cca
PORT=3000
GROQ_API_KEY=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
NODE_ENV=production
```

- [ ] **Step 2: Update .env (dev)**

```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=smps_dev
JWT_SECRET=dev-secret-change-in-production-use-random-64-chars
NODE_ENV=development
PORT=3000
GROQ_API_KEY=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
```

- [ ] **Step 3: Remove SQLite artifacts**

```bash
rm -f server/db/auto-init.ts server/db/migrate-standalone.cjs server/db/seed-users-standalone.cjs server/db/smps.db server/db/smps.db-shm server/db/smps.db-wal server/db/.gitkeep
```

- [ ] **Step 4: Commit**

```bash
git add .env.production .env
git rm server/db/auto-init.ts server/db/migrate-standalone.cjs server/db/seed-users-standalone.cjs
git commit -m "chore: update env config for MySQL, remove SQLite artifacts"
```

---

## Task 11: Update Build Configuration

**Files:**
- Modify: `build-server.mjs`
- Modify: `package.json`

- [ ] **Step 1: Update build-server.mjs**

Remove `better-sqlite3` from externals (it's no longer a dependency). `mysql2` should NOT be externalized since it's pure JavaScript and should be bundled. Keep `multer` external:

```javascript
import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';

console.log('Building server bundle with esbuild...');

try {
  execSync(
    'npx esbuild server/index.ts --bundle --platform=node --target=node18 --outfile=server.cjs --format=cjs --external:multer',
    { stdio: 'inherit', cwd: process.cwd() }
  );
  
  if (existsSync('server.cjs')) {
    const stats = statSync('server.cjs');
    console.log(`✓ server.cjs created (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.error('server.cjs was not created');
    process.exit(1);
  }
} catch (err) {
  console.error('Failed to build server.cjs:', err.message);
  process.exit(1);
}
```

- [ ] **Step 2: Build and test**

```bash
npm run build
```

Expected: Both `vite build` and `esbuild` succeed, `server.cjs` is created.

- [ ] **Step 3: Commit**

```bash
git add build-server.mjs package.json package-lock.json
git commit -m "chore: update build config for MySQL, remove better-sqlite3 external"
```

---

## Task 12: Local Testing

**Files:**
- N/A (testing only)

- [ ] **Step 1: Install MySQL locally (if not already installed)**

On macOS: `brew install mysql && brew services start mysql`

- [ ] **Step 2: Create local MySQL database**

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS smps_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

- [ ] **Step 3: Start the dev server**

```bash
npm run dev:full
```

- [ ] **Step 4: Verify auto-migration**

Check that all 25 tables were created:
```bash
mysql -u root smps_dev -e "SHOW TABLES;"
```

Expected: All tables listed (users, sessions, evaluations, etc.)

- [ ] **Step 5: Verify SuperAdmin was seeded**

```bash
mysql -u root smps_dev -e "SELECT email, name, is_super_user FROM users WHERE email='lab@bowdot.com';"
```

Expected: One row with `lab@bowdot.com`, `SuperAdmin`, `1`

- [ ] **Step 6: Test login**

```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"lab@bowdot.com","password":"3791"}'
```

Expected: JSON response with `token` and `user` object

- [ ] **Step 7: Commit**

```bash
git commit --allow-empty -m "test: verified MySQL migration locally"
```

---

## Task 13: Create Deployment ZIP and Hostinger Guide

**Files:**
- Modify: `HOSTINGER_DEPLOYMENT_GUIDE.md`

- [ ] **Step 1: Update HOSTINGER_DEPLOYMENT_GUIDE.md**

Replace all SQLite references with MySQL. Key changes:
- Remove all `better-sqlite3` rebuild steps
- Remove `npm rebuild better-sqlite3`
- Remove database file references
- Add MySQL database setup instructions (create database in Hostinger panel)
- Add `.env.production` MySQL credential instructions
- Update environment variables to `MYSQL_*` instead of `DATABASE_URL`
- Simplify the deployment to: `npm install` → `npm run build` → `node server.js`

- [ ] **Step 2: Create deployment ZIP**

```bash
cd /Users/mikaelwallsten/Downloads/smps-performance-compass-main
rm -f ../smps-deploy.zip
zip -r ../smps-deploy.zip . \
  -x "node_modules/*" \
  -x "server/db/*.db" \
  -x "server/db/*.db-shm" \
  -x "server/db/*.db-wal" \
  -x "server/dist-server/*" \
  -x ".env" \
  -x "*.log" \
  -x ".DS_Store" \
  -x ".git/*"
```

- [ ] **Step 3: Commit**

```bash
git add HOSTINGER_DEPLOYMENT_GUIDE.md
git commit -m "docs: update deployment guide for MySQL"
```

---

## Task 14: Deploy to Hostinger

**Files:**
- N/A (deployment only)

- [ ] **Step 1: Create MySQL database in Hostinger panel**

In hPanel → Databases → MySQL Databases:
1. Create database: `u906489923_smPS`
2. Create user: `u906489923_smPS` with a strong password
3. Grant all privileges

- [ ] **Step 2: Upload deployment ZIP**

```bash
scp -P 65002 /Users/mikaelwallsten/Downloads/smps-deploy.zip u906489923@82.29.157.108:~/
```

- [ ] **Step 3: SSH into Hostinger and deploy**

```bash
ssh -p 65002 u906489923@82.29.157.108
export PATH="/opt/alt/alt-nodejs22/root/usr/bin:$PATH"
export LD_LIBRARY_PATH="/opt/alt/alt-nodejs22/root/usr/lib64:$LD_LIBRARY_PATH"
cd ~/domains/lightgoldenrodyellow-wasp-535969.hostingersite.com/nodejs/
rm -rf *
unzip -o ~/smps-deploy.zip
npm install
npm run build
```

- [ ] **Step 4: Configure environment variables**

Edit `.env.production` with the MySQL credentials from Step 1:
```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=u906489923_smPS
MYSQL_PASSWORD=<password-from-step-1>
MYSQL_DATABASE=u906489923_smPS
JWT_SECRET=...
PORT=3000
NODE_ENV=production
```

- [ ] **Step 5: Start the server**

```bash
NODE_ENV=production node server.js
```

Expected output:
```
✓ Database initialized (25 tables)
✓ SuperAdmin seeded: lab@bowdot.com / 3791
Server running on port 3000 in production mode
```

- [ ] **Step 6: Verify in browser**

Open `https://lightgoldenrodyellow-wasp-535969.hostingersite.com/` and test login.

