import { config } from './config/env.js';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import piRoutes from './routes/pis.js';
import positionRoutes from './routes/positions.js';
import applicationRoutes from './routes/applications.js';
import participantRoutes from './routes/participants.js';
import studiesRoutes from './routes/studies.js';
import messageRoutes from './routes/messages.js';
const app = express();
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/pis', piRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/studies', studiesRoutes);
app.use('/api/messages', messageRoutes);
app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
});
// Global error handler — catches unhandled errors from async route handlers
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
    console.error('[Error]', err.message);
    res.status(500).json({ error: 'Internal server error' });
});
app.listen(config.port, () => {
    console.log(`ResearchHub server running on http://localhost:${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
});
