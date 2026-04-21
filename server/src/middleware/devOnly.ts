import type { Request, Response } from 'express';
import { config } from '../config/env.js';

/**
 * Rejects the request with 404 when NODE_ENV is production.
 * Use this to guard dev/test-only endpoints.
 */
export function devOnly(req: Request, res: Response, next: () => void): void {
  if (config.nodeEnv === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  next();
}
