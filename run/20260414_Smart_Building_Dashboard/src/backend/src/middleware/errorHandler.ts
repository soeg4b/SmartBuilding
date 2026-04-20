import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { config } from '../config';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message =
    config.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred'
      : err.message || 'Internal server error';

  // Log server errors with full stack trace
  if (statusCode >= 500) {
    logger.error('Unhandled server error', {
      statusCode,
      code,
      message: err.message,
      stack: err.stack,
      details: err.details,
    });
  } else {
    logger.warn('Client error', {
      statusCode,
      code,
      message: err.message,
    });
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
}

/**
 * Create an AppError with status code and error code.
 */
export function createAppError(
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}
