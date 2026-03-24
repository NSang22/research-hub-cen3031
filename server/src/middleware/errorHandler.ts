import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@research-hub/shared';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message = err.message ?? 'Internal Server Error';

  const response: ApiResponse<never> = {
    success: false,
    error: message,
  };

  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', err.stack);
  }

  res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiResponse<never> = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  };
  res.status(404).json(response);
}
