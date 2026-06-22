import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';

import { env, isDev, isProd } from './config/env';
import { logger, morganStream } from './config/logger';
import { requestIdMiddleware } from './middleware/requestId';
import { generalRateLimiter, authRateLimiter } from './middleware/rateLimiter';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import alertsRouter from './modules/alerts/alert.routes';
import splunkRouter from './routes/splunk.routes';
import riskRouter from './routes/risk.routes';
import incidentsRouter from './modules/incidents/incident.routes';
import aiRouter from './routes/ai.routes';
import n8nRouter from './integrations/n8n/n8n.webhook';
import reportsRouter from './routes/reports.routes';

// ---------------------------------------------------------------------------
// Application factory
// Separating creation from listening makes unit testing straightforward.
// ---------------------------------------------------------------------------
export function createApp(): Application {
  const app = express();

  // â”€â”€ Trust proxy (required when behind nginx / ALB / Cloudflare) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isProd) {
    app.set('trust proxy', 1);
  }

  // â”€â”€ Security headers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.use(
    helmet({
      // Allow the SOC dashboard to embed API responses in same-origin iframes
      frameguard:            { action: 'sameorigin' },
      crossOriginEmbedderPolicy: isProd,
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc:  ["'self'"],
              scriptSrc:   ["'self'"],
              styleSrc:    ["'self'"],
              imgSrc:      ["'self'", 'data:'],
              connectSrc:  ["'self'"],
              fontSrc:     ["'self'"],
              objectSrc:   ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
      hsts: isProd
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
    }),
  );

  // â”€â”€ CORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!origin) return callback(null, true);

        const isVercel = origin.endsWith('.vercel.app') || origin === 'https://vercel.app';

        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || isVercel) {
          callback(null, true);
        } else {
          logger.warn({ origin }, 'cors: rejected request from disallowed origin');
          callback(new Error(`CORS: origin '${origin}' is not allowed`));
        }
      },
      credentials:      env.CORS_CREDENTIALS,
      methods:          ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders:   ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
      exposedHeaders:   ['X-Request-ID', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
      maxAge:           86_400,    // preflight cache: 24 hours
      optionsSuccessStatus: 204,
    }),
  );

  // â”€â”€ Request ID (before Morgan so it can be logged) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.use(requestIdMiddleware);

  // â”€â”€ HTTP request logging â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const morganFormat = isDev
    ? ':method :url :status :res[content-length] - :response-time ms'
    : ':remote-addr - :method :url :status :res[content-length] :response-time ms :req[x-request-id]';

  app.use(morgan(morganFormat, { stream: morganStream, skip: (req) => req.path === '/health' }));

  // â”€â”€ Response compression â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      },
      threshold: 1024,   // only compress responses > 1 KB
    }),
  );

  // â”€â”€ Body parsers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // â”€â”€ Global rate limiter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.use(generalRateLimiter);

  // =========================================================================
  // Routes
  // =========================================================================

  // Health / readiness / metrics probes â€” no API prefix, no auth
  app.use('/', healthRouter);

  // Versioned API base path
  const apiBase = `${env.API_PREFIX}/${env.API_VERSION}`;

  // â”€â”€ Auth endpoints (strict rate limiter applied per-router) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // app.use(`${apiBase}/auth`, authRateLimiter, authRouter);

  // â”€â”€ Placeholder for future feature routers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.use(`${apiBase}/alerts`,    alertsRouter);
  app.use(`${apiBase}/splunk`,    splunkRouter);
  app.use(`${apiBase}/risk`,      riskRouter);
  app.use(`${apiBase}/incidents`, incidentsRouter);
  app.use(`${apiBase}/ai`,        aiRouter);
  app.use(`${apiBase}/n8n`,       n8nRouter);
  // app.use(`${apiBase}/incidents`, incidentsRouter);
  // app.use(`${apiBase}/assets`,    assetsRouter);
  // app.use(`${apiBase}/agents`,    agentsRouter);
  // app.use(`${apiBase}/users`,     usersRouter);
  app.use(`${apiBase}/reports`,   reportsRouter);
  // app.use(`${apiBase}/threat-intel`, threatIntelRouter);

  // â”€â”€ API root â€” returns available endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.get(apiBase, (_req: Request, res: Response) => {
    res.json({
      service:    'SOCVision AI API',
      version:    env.API_VERSION,
      status:     'operational',
      timestamp:  new Date().toISOString(),
      endpoints: {
        health:  '/health',
        ready:   '/ready',
        metrics: '/metrics',
        api:     apiBase,
        docs:    env.ENABLE_SWAGGER ? `${apiBase}/docs` : null,
      },
    });
  });

  // =========================================================================
  // Error handling  (must come AFTER all routes)
  // =========================================================================
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  logger.info(
    {
      apiBase,
      cors:         allowedOrigins,
      rateLimit:    `${env.RATE_LIMIT_MAX_REQUESTS} req / ${env.RATE_LIMIT_WINDOW_MS}ms`,
      swagger:      env.ENABLE_SWAGGER,
    },
    'app: Express application configured',
  );

  return app;
}


