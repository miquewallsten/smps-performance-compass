import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DATABASE_URL || path.resolve(__dirname, 'smps.db');

export const db = new Database(DB_PATH);

// Enable WAL mode for concurrent read/write
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
