import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DATABASE_URL || path.resolve(__dirname, 'smps.db');

export const db = new Database(DB_PATH);

// Enable WAL mode for concurrent read/write
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
