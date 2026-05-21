import express from 'express';
import cors from 'cors';
import path from 'path';
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
import positionRoutes from './routes/positions.js';
import periodRoutes from './routes/periods.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
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
app.use('/api/positions', positionRoutes);
app.use('/api/periods', periodRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

export default app;
