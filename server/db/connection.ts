import mysql from 'mysql2/promise';

// MySQL connection configuration from environment variables
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'smps_dev',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+00:00',
};

// Create the connection pool
export const pool = mysql.createPool(MYSQL_CONFIG);

/**
 * Execute a query that returns a single row.
 * Returns the first row or undefined if no rows found.
 */
export async function get<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(sql, params);
  return rows[0] as T | undefined;
}

/**
 * Execute a query that returns multiple rows.
 */
export async function all<T = any>(sql: string, params?: any[]): Promise<T[]> {
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
  async get<T = any>(conn: mysql.PoolConnection, sql: string, params?: any[]): Promise<T | undefined> {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(sql, params);
    return rows[0] as T | undefined;
  },
  async all<T = any>(conn: mysql.PoolConnection, sql: string, params?: any[]): Promise<T[]> {
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
