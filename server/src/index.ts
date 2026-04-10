import { config } from './config/env.js';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import piRoutes from './routes/pis.js';
import positionRoutes from './routes/positions.js';
import applicationRoutes from './routes/applications.js';
import studiesRoutes from './routes/studies.js';
import messageRoutes from './routes/messages.js';
import notificationRoutes from './routes/notifications.js';
import { processNotificationQueue } from './lib/notificationQueue.js';

const app = express();

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/pis', piRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/studies', studiesRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Global error handler — catches unhandled errors from async route handlers
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`ResearchHub server running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

// Sweep unsent notification queue every hour so rate-limited students
// receive their accumulated emails once their cooldown expires.
const QUEUE_SWEEP_INTERVAL_MS = 60 * 60 * 1000;
setInterval(() => {
  processNotificationQueue().catch((err: unknown) =>
    console.error('[notifications] Scheduled sweep error:', err)
  );
}, QUEUE_SWEEP_INTERVAL_MS);
