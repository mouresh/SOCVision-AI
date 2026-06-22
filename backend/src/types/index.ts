import { Request } from 'express';

// ---------------------------------------------------------------------------
// API Response envelope
// ---------------------------------------------------------------------------
export interface ApiResponse<T = unknown> {
  success:   boolean;
  data?:     T;
  error?:    ApiError;
  meta?:     ResponseMeta;
  timestamp: string;
  requestId: string;
}

export interface ApiError {
  code:    string;
  message: string;
  details?: unknown;
  stack?:  string;       // only in development
}

export interface ResponseMeta {
  page?:       number;
  limit?:      number;
  total?:      number;
  totalPages?: number;
}

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------
export enum ErrorCode {
  // Generic
  INTERNAL_ERROR          = 'INTERNAL_ERROR',
  VALIDATION_ERROR        = 'VALIDATION_ERROR',
  NOT_FOUND               = 'NOT_FOUND',
  CONFLICT                = 'CONFLICT',
  BAD_REQUEST             = 'BAD_REQUEST',
  // Auth
  UNAUTHORIZED            = 'UNAUTHORIZED',
  FORBIDDEN               = 'FORBIDDEN',
  TOKEN_EXPIRED           = 'TOKEN_EXPIRED',
  TOKEN_INVALID           = 'TOKEN_INVALID',
  // Rate limiting
  RATE_LIMIT_EXCEEDED     = 'RATE_LIMIT_EXCEEDED',
  // Database
  DB_ERROR                = 'DB_ERROR',
  DB_UNIQUE_VIOLATION     = 'DB_UNIQUE_VIOLATION',
  DB_FOREIGN_KEY_VIOLATION = 'DB_FOREIGN_KEY_VIOLATION',
  // Resource-specific
  ASSET_NOT_FOUND         = 'ASSET_NOT_FOUND',
  ALERT_NOT_FOUND         = 'ALERT_NOT_FOUND',
  INCIDENT_NOT_FOUND      = 'INCIDENT_NOT_FOUND',
  USER_NOT_FOUND          = 'USER_NOT_FOUND',
}

// ---------------------------------------------------------------------------
// Structured application error
// ---------------------------------------------------------------------------
export class AppError extends Error {
  public readonly statusCode:  number;
  public readonly errorCode:   ErrorCode;
  public readonly details?:    unknown;
  public readonly isOperational: boolean;

  constructor(
    message:     string,
    statusCode:  number      = 500,
    errorCode:   ErrorCode   = ErrorCode.INTERNAL_ERROR,
    details?:    unknown,
    isOperational = true,
  ) {
    super(message);
    this.name          = 'AppError';
    this.statusCode    = statusCode;
    this.errorCode     = errorCode;
    this.details       = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, 400, ErrorCode.BAD_REQUEST, details);
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(message, 401, ErrorCode.UNAUTHORIZED);
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(message, 403, ErrorCode.FORBIDDEN);
  }

  static notFound(resource: string): AppError {
    return new AppError(`${resource} not found`, 404, ErrorCode.NOT_FOUND);
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409, ErrorCode.CONFLICT);
  }

  static validationError(message: string, details?: unknown): AppError {
    return new AppError(message, 422, ErrorCode.VALIDATION_ERROR, details);
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(message, 500, ErrorCode.INTERNAL_ERROR, undefined, false);
  }
}

// ---------------------------------------------------------------------------
// Authenticated request (augmented by auth middleware)
// ---------------------------------------------------------------------------
export interface AuthenticatedUser {
  id:          string;
  email:       string;
  username:    string;
  roles:       string[];
  permissions: string[];
  isSuperuser: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?:      AuthenticatedUser;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export interface PaginationQuery {
  page:  number;
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  items:      T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}
