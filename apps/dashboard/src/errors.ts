import type { NextFunction, Request, Response } from 'express';
import type { Logger } from '@bidspirit/shared';

/** Error carrying an HTTP status and a Hebrew, user-facing message. */
export class ApiError extends Error {
  public readonly status: number;
  public readonly details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Wrap an async route handler so rejected promises reach the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

/** Centralized JSON error handler. Hebrew messages, structured logging. */
export function errorHandler(logger: Logger) {
  return (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof ApiError) {
      res.status(err.status).json({ error: err.message, details: err.details ?? null });
      return;
    }
    const message = (err as Error)?.message ?? 'Unknown error';
    logger.error('unhandled API error', { error: message });
    res.status(500).json({ error: 'שגיאת שרת פנימית', details: null });
  };
}
