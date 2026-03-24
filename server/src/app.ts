import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import apiRouter from './routes/index';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

// Security & logging middleware
app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', apiRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
