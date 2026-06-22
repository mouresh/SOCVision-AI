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
    'ðŸš€  SOCVision API â€” startingâ€¦',
  );

  // 1. Verify database connectivity before accepting traffic
  await initDatabase();

  
  // Seed MITRE ATT&CK techniques on startup
  try {
    const { MitreService } = await import('./services/mitre/mitre.service');
    const mitreService = new MitreService();
    const seeded = await mitreService.seedAllTechniques();
    logger.info({ seeded }, 'startup: MITRE ATT&CK techniques seeded');
  } catch (mitreErr: any) {
    logger.warn({ err: mitreErr.message }, 'startup: MITRE seeding failed (non-fatal)');
  }
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
    `âœ…  SOCVision API listening on http://${env.HOST}:${env.PORT}`,
  );

  // 5. Start periodic Splunk ingestion background job
  let isSyncing = false;
  const syncIntervalMs = 30000; // sync every 30s
  
  const splunkSyncJob = async () => {
    if (isSyncing) return;
    isSyncing = true;
    try {
      const { SplunkService } = await import('./services/splunk/splunk.service');
      const splunkService = new SplunkService();
      
      logger.info('background-sync: checking for new Splunk events');
      const events = await splunkService.getRecentEvents(50);
      if (events && events.length > 0) {
        await splunkService.ingestEventsAsAlerts(events);
      }
      
      // Also run pruning of alerts older than 30 days
      const prunedCount = await splunkService.pruneOldAlerts(30);
      if (prunedCount > 0) {
        logger.info({ prunedCount }, 'background-sync: pruned old alerts');
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'background-sync: failed to run Splunk ingestion job');
    } finally {
      isSyncing = false;
    }
  };

  // Run on startup
  splunkSyncJob();
  const syncTimer = setInterval(splunkSyncJob, syncIntervalMs);

  // â”€â”€ Graceful shutdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutdown: signal received â€” draining connectionsâ€¦');
    
    // Clear ingestion timer
    clearInterval(syncTimer);

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
      logger.error('shutdown: grace period exceeded â€” forcing exit');
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
  logger.error({ err }, 'ðŸ’¥  SOCVision API failed to start');
  process.exit(1);
});

