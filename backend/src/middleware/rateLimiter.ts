import rateLimit, { RateLimitRequestHandler, Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiResponse, ErrorCode } from '../types';

// ---------------------------------------------------------------------------
// Shared response builder for rate limit hits
// ---------------------------------------------------------------------------
function rateLimitHandler(req: Request, res: Response): void {
  logger.warn(
    {
      ip:        req.ip,
      path:      req.path,
      requestId: req.requestId,
    },
    'rate-limit: request blocked',
  );

  const body: ApiResponse<never> = {
    success:   false,
    timestamp: new Date().toISOString(),
    requestId: req.requestId ?? 'unknown',
    error: {
      code:    ErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'Too many requests — please slow down and try again later.',
    },
  };

  res.status(429).json(body);
}

// ---------------------------------------------------------------------------
// Base options shared by all limiters
// ---------------------------------------------------------------------------
const baseOptions: Partial<Options> = {
  standardHeaders: true,   // Return rate limit info in the RateLimit-* headers
  legacyHeaders:   false,  // Disable the X-RateLimit-* headers
  handler:         rateLimitHandler,
  keyGenerator:    (req) =>
    // Prefer the real IP forwarded by a trusted proxy
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    req.ip ??
    'unknown',
  skip: (req) =>
    // Skip health-check endpoint so load balancers don't consume quota
    req.path === '/health' || req.path === '/ready',
};

// ---------------------------------------------------------------------------
// General API rate limiter  — applied to all routes
// ---------------------------------------------------------------------------
export const generalRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max:      env.RATE_LIMIT_MAX_REQUESTS,
  message:  undefined,   // handled by handler above
});

// ---------------------------------------------------------------------------
// Auth rate limiter — much stricter, applied only to /auth/* endpoints
// ---------------------------------------------------------------------------
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max:      env.RATE_LIMIT_AUTH_MAX,
});

// ---------------------------------------------------------------------------
// Strict rate limiter — for sensitive operations (password reset, MFA, export)
// ---------------------------------------------------------------------------
export const strictRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000, // 1 hour window
  max:      5,
});
