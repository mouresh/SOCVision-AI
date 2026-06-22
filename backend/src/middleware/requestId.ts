import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

declare global {
  // Augment the Express Request type globally so all downstream handlers
  // can reference req.requestId without casting.
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Stamps every incoming request with a UUID.
 * Respects the X-Request-ID header if provided by an upstream proxy/gateway,
 * otherwise generates a fresh v4 UUID.
 * Reflects the ID back in the response header for client-side correlation.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.headers['x-request-id'];
  const requestId =
    typeof incoming === 'string' && incoming.length > 0
      ? incoming
      : randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}
