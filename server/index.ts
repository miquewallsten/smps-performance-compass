import express from 'express';
import cors from 'cors';
import path from 'path';
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

// API routes will be mounted here
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// etc.

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
