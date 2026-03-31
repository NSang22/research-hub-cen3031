export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: import('express').Request,
  res: import('express').Response,
  _next: import('express').NextFunction
): void {
  const appError = err as AppError;
  const statusCode = appError.statusCode ?? 500;
  console.error('[Error]', err.message);
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
  });
}
