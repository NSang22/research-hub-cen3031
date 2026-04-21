import { Request, Response, NextFunction } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

//AI-generated: this entire file is a standard Express async error-handling
//wrapper that Claude generated, it's pure boilerplate needed to avoid
//wrapping every route in a try/catch manually.
/** Wraps an async route handler so Express catches thrown errors properly. */
export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
