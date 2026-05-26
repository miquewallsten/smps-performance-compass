# SQLite → MySQL Migration Design Spec

## Goal
Migrate the SMPS Performance Compass from SQLite (better-sqlite3) to MySQL (mysql2) to enable deployment on Hostinger without native module compilation issues.

## Architecture
Replace the synchronous `better-sqlite3` driver with an async `mysql2` connection pool, wrapped in a thin helper module (`server/db/connection.ts`) that provides `db.get()`, `db.all()`, `db.run()`, and `db.transaction()` methods. All route handlers become async. MySQL database and tables are auto-created on server startup. No SSH or build tools needed on the server.

## Tech Stack
- **Database driver**: `mysql2` (pure JavaScript, no native compilation)
- **Connection**: MySQL connection pool via `mysql2/promise`
- **Schema**: Raw SQL CREATE TABLE statements (MySQL dialect)
- **Deployment target**: Hostinger Business Web Hosting with Node.js

## Key Design Decisions

### 1. Thin async wrapper (not ORM)
Keep all existing SQL queries, just wrap them in async calls. Minimizes changes to route files.

### 2. Auto-migration on startup
Tables are created automatically when the server starts. No separate migration script needed for production.

### 3. Environment variables for MySQL
```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=u906489923_smPS
MYSQL_PASSWORD=<from-hostinger>
MYSQL_DATABASE=u906489923_smPS
```

### 4. UUIDs stored as VARCHAR(36)
Keep using `uuid` package for ID generation. Store as VARCHAR(36) in MySQL.

### 5. Boolean fields as TINYINT(1)
Store 0/1 to match current SQLite behavior.

### 6. Dates as DATETIME
Store as MySQL DATETIME columns. Generate timestamps in application code with `new Date().toISOString().slice(0, 19).replace('T', ' ')`.

## SQLite → MySQL Syntax Mapping

| SQLite | MySQL |
|--------|-------|
| `datetime('now')` | `CURRENT_TIMESTAMP` |
| `INSERT OR REPLACE INTO` | `INSERT ... ON DUPLICATE KEY UPDATE` |
| `INSERT OR IGNORE INTO` | `INSERT IGNORE INTO` |
| `UNIQUE constraint failed` error | `ER_DUP_ENTRY` error code |
| `sqlite_master` | `INFORMATION_SCHEMA.TABLES` |
| `PRAGMA journal_mode = WAL` | Remove (InnoDB) |
| `PRAGMA foreign_keys = ON` | Remove (MySQL default) |
| `INTEGER PRIMARY KEY` (UUID as text) | `VARCHAR(36) PRIMARY KEY` |
| `INTEGER` (boolean) | `TINYINT(1)` |
| `REAL` | `DOUBLE` |
| `db.prepare(sql).get(params)` | `await db.get(sql, params)` |
| `db.prepare(sql).all(params)` | `await db.all(sql, params)` |
| `db.prepare(sql).run(params)` | `await db.run(sql, params)` |
| `db.transaction(() => { ... })` | `await db.transaction(async (conn) => { ... })` |
| `db.exec(sql)` | `await db.exec(sql)` |
