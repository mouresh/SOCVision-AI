import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { initDatabase, closeDatabase } from './config/database';

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function bootstrap(): Promise<void> {
  logger.info(
    { env: env.NODE_ENV, version: process.env.npm_package_version ?? '0.0.0' },
    '🚀  SOCVision API — starting…',
  );

  // 1. Verify database connectivity before accepting traffic
  await initDatabase();

  // 2. Build the Express application
  const app = createApp();

  // 3. Create the HTTP server (keeps a reference for graceful shutdown)
  const server = http.createServer(app);

  // Keep-alive tuning for production behind a load balancer
  server.keepAliveTimeout    = 65_000;  // > AWS ALB idle timeout (60s)
  server.headersTimeout      = 66_000;  // slightly above keepAlive

  // 4. Start listening
  await new Promise<void>((resolve, reject) => {
    server.listen(env.PORT, env.HOST, () => resolve());
    server.once('error', reject);
  });

  logger.info(
    { host: env.HOST, port: env.PORT },
    `✅  SOCVision API listening on http://${env.HOST}:${env.PORT}`,
  );

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutdown: signal received — draining connections…');

    // Stop accepting new connections
    server.close(async (err) => {
      if (err) {
        logger.error({ err }, 'shutdown: error closing HTTP server');
      } else {
        logger.info('shutdown: HTTP server closed');
      }

      // Close database pool
      try {
        await closeDatabase();
      } catch (dbErr) {
        logger.error({ err: dbErr }, 'shutdown: error closing database pool');
      }

      logger.info('shutdown: clean exit');
      process.exit(err ? 1 : 0);
    });

    // Force-kill if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('shutdown: grace period exceeded — forcing exit');
      process.exit(1);
    }, 15_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
bootstrap().catch((err) => {
  logger.error({ err }, '💥  SOCVision API failed to start');
  process.exit(1);
});
