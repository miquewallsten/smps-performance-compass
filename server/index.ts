import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { pool } from './db/connection.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed-users.js';
import { seedEvaluationData, cleanupOldCustomQuestions } from './db/seed-evaluation-data.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import assignmentRoutes from './routes/assignments.js';
import systemRoutes from './routes/system.js';
import evaluationRoutes from './routes/evaluations.js';
import actionPlanRoutes from './routes/action-plans.js';
import objectiveRoutes from './routes/objectives.js';
import announcementRoutes from './routes/announcements.js';
import vacationRoutes from './routes/vacations.js';
import questionRoutes from './routes/questions.js';
import evaluationConfigRoutes from './routes/evaluation-config.js';
import positionRoutes from './routes/positions.js';
import workAreaRoutes from './routes/work-areas.js';
import locationRoutes from './routes/locations.js';
import periodRoutes from './routes/periods.js';
import copilotRoutes from './copilot/index.js';
import deployRoutes from './routes/deploy.js';
import timelineRoutes from './routes/timeline.js';
import { loginLimiter, resetPasswordLimiter, apiLimiter } from './middleware/rate-limit.js';

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

// Trust proxy for rate limiting behind Passenger/nginx
app.set("trust proxy", 1);

// ─── RATE LIMITING ──────────────────────────────────────────────────────────
// Apply rate limiting to sensitive auth endpoints
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/reset-password', resetPasswordLimiter);
app.use('/api/auth/security-question', resetPasswordLimiter);
// General API rate limit for all other endpoints
app.use('/api/', apiLimiter);

// Health check (no rate limit)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/action-plans', actionPlanRoutes);
app.use('/api/objectives', objectiveRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/vacations', vacationRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/evaluation-config', evaluationConfigRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/work-areas', workAreaRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/deploy', deployRoutes);
app.use('/api/users', timelineRoutes);

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
    console.log('Seeding database...');
    await seed();
    console.log('Seeding evaluation data...');
    await seedEvaluationData();
    await cleanupOldCustomQuestions();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

export default app;
