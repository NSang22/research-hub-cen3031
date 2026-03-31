export class AppError extends Error {
    statusCode;
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}
export function errorHandler(err, _req, res, _next) {
    const appError = err;
    const statusCode = appError.statusCode ?? 500;
    console.error('[Error]', err.message);
    res.status(statusCode).json({
        success: false,
        error: err.message || 'Internal server error',
    });
}
