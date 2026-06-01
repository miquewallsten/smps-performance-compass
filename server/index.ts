import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { pool } from './db/connection.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed-users.js';
import { seedEvaluationData, cleanupOldCustomQuestions } from './db/seed-evaluation-data.js';
import { migrateAuth } from './db/migrate-auth.js';
import { migrateSnapshots } from './db/migrate-snapshots.js';
import { migrateFKs } from './db/migrate-fks.js';
import { migrateIndexes } from './db/migrate-indexes.js';
import { migrateAnalytics } from './db/migrate-analytics.js';
import analyticsRoutes from './routes/analytics.js';
import { refreshAnalytics } from './services/analytics-refresh.js';
import { migrateNotifications } from './db/migrate-notifications.js';
import notificationRoutes from './routes/notifications.js';
import { startNotificationScheduler } from './services/notification-scheduler.js';

import authRoutes from './routes/auth.js';
import authNewRoutes from './routes/auth-new.js';
import userRoutes from './routes/users.js';
import assignmentRoutes from './routes/assignments.js';
import systemRoutes from './routes/system.js';
import evaluationRoutes from './routes/evaluations.js';
import actionPlanRoutes from './routes/action-plans.js';
import objectiveRoutes from './routes/objectives.js';
import announcementRoutes from './routes/announcements.js';
import vacationRoutes from './routes/vacations.js';
import evaluationConfigRoutes from './routes/evaluation-config.js';
import positionRoutes from './routes/positions.js';
import workAreaRoutes from './routes/work-areas.js';
import locationRoutes from './routes/locations.js';
import periodRoutes from './routes/periods.js';
import copilotRoutes from './copilot/index.js';
import deployRoutes from './routes/deploy.js';
import timelineRoutes from './routes/timeline.js';
import { loginLimiter, resetPasswordLimiter, apiLimiter } from './middleware/rate-limit.js';
import { authMiddleware } from './middleware/auth.js';
import { hasRole } from './middleware/permissions.js';
import { auditLog, getClientIp, getUserAgent } from './services/audit.js';
import { startBackupScheduler } from './services/backup-scheduler.js';
import { startSessionCleanupScheduler } from './services/session-cleanup.js';

// Rate limiter for new auth endpoints
import rateLimit from 'express-rate-limit';
const activationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' }, standardHeaders: true, legacyHeaders: false });
const passwordResetRequestLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 3, message: { error: 'Demasiados intentos de reseteo. Intenta de nuevo en 15 minutos.' }, standardHeaders: true, legacyHeaders: false });
const passwordResetCompleteLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' }, standardHeaders: true, legacyHeaders: false });
const deployLimiter = rateLimit({ windowMs: 60 * 1000, max: 3, message: { error: 'Demasiados intentos de despliegue.' }, standardHeaders: true, legacyHeaders: false });

dotenv.config();

// ─── SECURITY: Fail fast if JWT_SECRET is missing in production ──────────
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start in production without it.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: In production, only allow requests from the SMPS domain.
// In development, allow localhost for convenience.
if (process.env.NODE_ENV === 'production') {
  app.use(cors({
    origin: ['https://smps.bowdot.online', 'http://smps.bowdot.online'],
    credentials: true,
  }));
} else {
  app.use(cors());
}

app.use(express.json());

// ─── SECURITY HEADERS ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for SPA; CSP should be added later
  crossOriginEmbedderPolicy: false, // Allow iframe embedding for future integrations
}));

// Trust proxy for rate limiting behind Passenger/nginx
app.set("trust proxy", 1);

// ─── RATE LIMITING ──────────────────────────────────────────────────────────
// Apply rate limiting to sensitive auth endpoints
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/reset-password', resetPasswordLimiter);
app.use('/api/auth/security-question', resetPasswordLimiter);
// New auth endpoints rate limiting
app.use('/api/auth/activate', activationLimiter);
app.use('/api/auth/resend-activation', activationLimiter);
app.use('/api/auth/verify-activation', activationLimiter);
app.use('/api/auth/request-password-reset', passwordResetRequestLimiter);
app.use('/api/auth/verify-reset-token', passwordResetCompleteLimiter);
app.use('/api/auth/complete-password-reset', passwordResetCompleteLimiter);

// General API rate limit for all other endpoints
app.use('/api/', apiLimiter);

// Health check (no rate limit)

// Health stats — restricted to admin/super_user only
app.get('/api/health/stats', authMiddleware, async (req, res) => {
  try {
    if (!hasRole(req.user!, ['super_user', 'admin'])) {
      await auditLog({ action: 'authorization_denied', userId: req.user!.id, ipAddress: getClientIp(req), userAgent: getUserAgent(req), metadata: { resource: '/api/health/stats' } });
      return res.status(403).json({ error: 'Admin access required' });
    }
    const activeUsers = await pool.execute('SELECT COUNT(*) as cnt FROM users WHERE is_active = 1');
    const assignmentsByPeriod = await pool.execute('SELECT period, COUNT(*) as cnt FROM supervisor_assignments GROUP BY period');
    const evalsByPeriod = await pool.execute('SELECT period, type, COUNT(*) as cnt FROM evaluations GROUP BY period, type');
    const periods = await pool.execute('SELECT period, self_start, action_plan_end FROM period_configs ORDER BY period');
    res.json({
      activeUsers: (activeUsers[0] as any)[0]?.cnt,
      assignmentsByPeriod: assignmentsByPeriod[0],
      evalsByPeriod: evalsByPeriod[0],
      periods: periods[0],
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Stats query failed', details: String(err) });
  }
});
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', authNewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/action-plans', actionPlanRoutes);
app.use('/api/objectives', objectiveRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/vacations', vacationRoutes);
app.use('/api/evaluation-config', evaluationConfigRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/work-areas', workAreaRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/deploy', deployLimiter, deployRoutes);
app.use('/api/users', timelineRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);


  // ─── TECH DIAGRAM: Public static page at /techdiagram.html ─────────────────
  app.get("/techdiagram.html", (_req, res) => {
    res.sendFile(path.resolve(process.cwd(), "dist/techdiagram.html"));
  });

// Multi-domain routing: serve landing page for bowdot.online, SMPS app for smps.bowdot.online
// The landing page lives in /landing; the SMPS app lives in /dist
if (process.env.NODE_ENV === 'production') {
  const SMPS_DOMAINS = ['smps.bowdot.online'];
  const isSmpsDomain = (host: string | undefined) =>
    host && SMPS_DOMAINS.some(d => host.includes(d));

  // Landing page for the main domain (bowdot.online)
  const landingPath = path.resolve(process.cwd(), 'landing');
  app.use((req, _res, next) => {
    // Only serve landing if it's the main domain AND not an API route
    if (!isSmpsDomain(req.get('host')) && !req.path.startsWith('/api')) {
      express.static(landingPath)(req, _res, next);
    } else {
      next();
    }
  });

  // SMPS app for smps.bowdot.online (or API routes on any domain)
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));

  // SPA fallback for SMPS app
  app.use((req, res) => {
    if (isSmpsDomain(req.get('host'))) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      // Main domain: serve landing page for any non-API route
      res.sendFile(path.join(landingPath, 'index.html'));
    }
  });
}

// Start server after database initialization
async function startServer() {
  try {
    console.log('Initializing database...');
    await migrate();
    console.log('Running auth migration...');
    await migrateAuth();
    console.log('Running snapshot migration...');
    await migrateSnapshots();
    console.log('Running FK migration...');
    await migrateFKs();
    console.log('Running index migration...');
    await migrateIndexes();
    console.log('Running analytics migration...');
    await migrateAnalytics();
    console.log('Running notifications migration...');
    await migrateNotifications();
    console.log('Seeding database...');
    await seed();
    console.log('Seeding evaluation data...');
    await seedEvaluationData();
    await cleanupOldCustomQuestions();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      startBackupScheduler();
      startSessionCleanupScheduler();
      startNotificationScheduler();
      // Refresh analytics tables on startup, then every 30 minutes
      refreshAnalytics();
      setInterval(() => refreshAnalytics(), 30 * 60 * 1000);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

export default app;
