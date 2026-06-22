import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { DatabaseError } from 'pg';
import { isDev } from '../config/env';
import { logger } from '../config/logger';
import { ApiResponse, AppError, ErrorCode } from '../types';

// ---------------------------------------------------------------------------
// Map Postgres error codes → AppError
// ---------------------------------------------------------------------------
function fromDatabaseError(err: DatabaseError): AppError {
  switch (err.code) {
    case '23505': // unique_violation
      return new AppError(
        'A record with this value already exists',
        409,
        ErrorCode.DB_UNIQUE_VIOLATION,
        { constraint: err.constraint },
      );
    case '23503': // foreign_key_violation
      return new AppError(
        'Referenced record does not exist',
        409,
        ErrorCode.DB_FOREIGN_KEY_VIOLATION,
        { constraint: err.constraint },
      );
    case '23502': // not_null_violation
      return new AppError(
        `Column '${err.column}' cannot be null`,
        400,
        ErrorCode.VALIDATION_ERROR,
      );
    case '22P02': // invalid_text_representation
      return new AppError('Invalid UUID or enum value', 400, ErrorCode.BAD_REQUEST);
    case '57014': // query_canceled (statement_timeout)
      return new AppError('Database query timed out', 504, ErrorCode.DB_ERROR);
    default:
      return new AppError('Database error', 500, ErrorCode.DB_ERROR, undefined, false);
  }
}

// ---------------------------------------------------------------------------
// Map Zod validation error → AppError
// ---------------------------------------------------------------------------
function fromZodError(err: ZodError): AppError {
  const details = err.issues.map((issue) => ({
    path:    issue.path.join('.'),
    message: issue.message,
    code:    issue.code,
  }));

  return new AppError('Validation failed', 422, ErrorCode.VALIDATION_ERROR, details);
}

// ---------------------------------------------------------------------------
// Global error handler  (must have 4 parameters to be recognised by Express)
// ---------------------------------------------------------------------------
export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── Normalise to AppError ─────────────────────────────────────────────────
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof ZodError) {
    appError = fromZodError(err);
  } else if (err instanceof DatabaseError) {
    appError = fromDatabaseError(err);
  } else if (err instanceof SyntaxError && 'body' in err) {
    // Malformed JSON body
    appError = new AppError('Malformed JSON body', 400, ErrorCode.BAD_REQUEST);
  } else if (err instanceof Error) {
    // Unknown operational error
    appError = new AppError(
      isDev ? err.message : 'Internal server error',
      500,
      ErrorCode.INTERNAL_ERROR,
      undefined,
      false,
    );
    if (err.stack) {
      appError.stack = err.stack;
    }
  } else {
    appError = AppError.internal();
  }

  // ── Log appropriately ─────────────────────────────────────────────────────
  const logPayload = {
    requestId: (req as { requestId?: string }).requestId,
    method:    req.method,
    path:      req.path,
    statusCode: appError.statusCode,
    errorCode:  appError.errorCode,
    err:        appError,
  };

  if (appError.statusCode >= 500) {
    logger.error(logPayload, `[${appError.errorCode}] ${appError.message}`);
  } else if (appError.statusCode >= 400) {
    logger.warn(logPayload, `[${appError.errorCode}] ${appError.message}`);
  }

  // ── Build response ────────────────────────────────────────────────────────
  const body: ApiResponse<never> = {
    success:   false,
    timestamp: new Date().toISOString(),
    requestId: (req as { requestId?: string }).requestId ?? 'unknown',
    error: {
      code:    appError.errorCode,
      message: appError.message,
      ...(appError.details !== undefined && { details: appError.details }),
      ...(isDev && appError.stack    && { stack: appError.stack }),
    },
  };

  res.status(appError.statusCode).json(body);
}

// ---------------------------------------------------------------------------
// 404 catch-all  (registered AFTER all routes)
// ---------------------------------------------------------------------------
export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiResponse<never> = {
    success:   false,
    timestamp: new Date().toISOString(),
    requestId: (req as { requestId?: string }).requestId ?? 'unknown',
    error: {
      code:    ErrorCode.NOT_FOUND,
      message: `Cannot ${req.method} ${req.path}`,
    },
  };

  res.status(404).json(body);
}
