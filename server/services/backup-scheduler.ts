/**
 * Backup Scheduler for SMPS Performance Compass.
 * 
 * Since Hostinger shared hosting doesn't provide cron access,
 * this module runs scheduled backups from within the Node.js process.
 * 
 * Schedule:
 * - Database: Daily at 3:00 AM CST (UTC-6)
 * - Source: Weekly on Sunday at 4:00 AM CST
 * 
 * Backups are stored in ~/backups/smps/
 * Retention: 30 days
 */
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const BACKUP_DIR = path.join(process.env.HOME || '/home/u906489923', 'backups/smps');
const DB_DIR = path.join(BACKUP_DIR, 'db');
const SOURCE_DIR = path.join(BACKUP_DIR, 'source');
const LOG_FILE = path.join(BACKUP_DIR, 'backup.log');
const RETENTION_DAYS = 30;

const DB_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const DB_PORT = process.env.MYSQL_PORT || '3306';
const DB_USER = process.env.MYSQL_USER || '';
const DB_PASS = process.env.MYSQL_PASSWORD || '';
const DB_NAME = process.env.MYSQL_DATABASE || '';
const APP_DIR = process.cwd();

function log(message: string): void {
  const entry = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, entry);
  console.log(`[Backup] ${message}`);
}

function ensureDirs(): void {
  [BACKUP_DIR, DB_DIR, SOURCE_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function cleanupOld(dir: string, prefix: string): void {
  try {
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith(prefix))
      .map(f => ({ name: f, path: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    let removed = 0;
    files.forEach(f => {
      if (f.mtime.getTime() < cutoff) {
        fs.unlinkSync(f.path);
        removed++;
      }
    });
    if (removed > 0) log(`Cleaned ${removed} old ${prefix} backups (retention: ${RETENTION_DAYS} days)`);
  } catch (err) {
    log(`Cleanup error: ${(err as Error).message}`);
  }
}

export function runDatabaseBackup(): void {
  ensureDirs();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = path.join(DB_DIR, `smps_db_${timestamp}.sql.gz`);

  log('--- Database backup started ---');
  try {
    const cmd = `mysqldump -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASS}" --single-transaction --routines --triggers "${DB_NAME}" 2>/dev/null | gzip > "${backupFile}"`;
    execSync(cmd, { timeout: 120000 });

    const size = fs.statSync(backupFile).size;
    const sizeStr = size > 1048576 ? `${(size / 1048576).toFixed(1)}MB` : `${(size / 1024).toFixed(0)}KB`;
    log(`SUCCESS: Database backup created ${path.basename(backupFile)} (${sizeStr})`);

    cleanupOld(DB_DIR, 'smps_db_');
  } catch (err) {
    log(`FAILED: Database backup error: ${(err as Error).message}`);
    // Remove partial file
    if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);
  }
  log('--- Database backup finished ---');
}

export function runSourceBackup(): void {
  ensureDirs();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = path.join(SOURCE_DIR, `smps_source_${timestamp}.tar.gz`);

  log('--- Source backup started ---');
  try {
    const cmd = `cd "${path.dirname(APP_DIR)}" && tar czf "${backupFile}" --exclude='node_modules' --exclude='dist' --exclude='tmp' --exclude='.git' --exclude='*.log' "$(basename "${APP_DIR}")" 2>/dev/null`;
    execSync(cmd, { timeout: 120000 });

    const size = fs.statSync(backupFile).size;
    const sizeStr = size > 1048576 ? `${(size / 1048576).toFixed(1)}MB` : `${(size / 1024).toFixed(0)}KB`;
    log(`SUCCESS: Source backup created ${path.basename(backupFile)} (${sizeStr})`);

    cleanupOld(SOURCE_DIR, 'smps_source_');
  } catch (err) {
    log(`FAILED: Source backup error: ${(err as Error).message}`);
    if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);
  }
  log('--- Source backup finished ---');
}

/**
 * Start the backup scheduler. Runs checks every hour.
 */
export function startBackupScheduler(): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Backup] Scheduler disabled in development mode');
    return;
  }

  let lastDbBackup: string | null = null;
  let lastSourceBackup: string | null = null;

  const check = () => {
    const now = new Date();
    // Convert to CST (UTC-6)
    const cstOffset = -6 * 60;
    const cst = new Date(now.getTime() + cstOffset * 60 * 1000);
    const todayStr = cst.toISOString().slice(0, 10);
    const hour = cst.getUTCHours();
    const day = cst.getUTCDay(); // 0 = Sunday

    // Daily DB backup at 3:00 AM CST
    if (hour === 3 && lastDbBackup !== todayStr) {
      lastDbBackup = todayStr;
      runDatabaseBackup();
    }

    // Weekly source backup on Sunday at 4:00 AM CST
    if (day === 0 && hour === 4 && lastSourceBackup !== todayStr) {
      lastSourceBackup = todayStr;
      runSourceBackup();
    }
  };

  // Check every hour
  setInterval(check, 60 * 60 * 1000);
  // Also check immediately in case we just started at the right time
  setTimeout(check, 60 * 1000);

  console.log('[Backup] Scheduler started (daily DB at 3AM CST, weekly source Sun 4AM CST)');
}
