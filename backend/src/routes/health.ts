import { Router, Request, Response } from 'express';
import os from 'os';
import { checkDbHealth } from '../config/database';
import { env } from '../config/env';

const router = Router();

// ---------------------------------------------------------------------------
// GET /health  — liveness probe (no external dependencies checked)
// Suitable for Kubernetes livenessProbe / load-balancer health checks
// ---------------------------------------------------------------------------
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status:    'ok',
    service:   'socvision-api',
    version:   process.env.npm_package_version ?? '0.0.0',
    env:       env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()),
  });
});

// ---------------------------------------------------------------------------
// GET /ready  — readiness probe (verifies database connectivity)
// Suitable for Kubernetes readinessProbe — pod won't receive traffic until ready
// ---------------------------------------------------------------------------
router.get('/ready', async (_req: Request, res: Response) => {
  const db = await checkDbHealth();

  const payload = {
    status:    db.healthy ? 'ready' : 'not_ready',
    service:   'socvision-api',
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()),
    checks: {
      database: {
        healthy:   db.healthy,
        latencyMs: db.latencyMs,
        pool: {
          total:   db.poolTotal,
          idle:    db.poolIdle,
          waiting: db.poolWaiting,
        },
        ...(db.error && { error: db.error }),
      },
      memory: {
        heapUsedMb:  Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rssMb:       Math.round(process.memoryUsage().rss / 1024 / 1024),
        freeSystemMb: Math.round(os.freemem() / 1024 / 1024),
      },
    },
  };

  res.status(db.healthy ? 200 : 503).json(payload);
});

// ---------------------------------------------------------------------------
// GET /metrics  — lightweight prometheus-style plaintext (if enabled)
// ---------------------------------------------------------------------------
router.get('/metrics', (_req: Request, res: Response): void => {
  if (!env.ENABLE_METRICS) {
    res.status(404).json({ error: 'Metrics endpoint is disabled' });
    return;
  }

  const mem = process.memoryUsage();
  const metrics = [
    `# HELP socvision_process_uptime_seconds Process uptime in seconds`,
    `# TYPE socvision_process_uptime_seconds gauge`,
    `socvision_process_uptime_seconds ${process.uptime().toFixed(2)}`,
    '',
    `# HELP socvision_heap_used_bytes V8 heap used bytes`,
    `# TYPE socvision_heap_used_bytes gauge`,
    `socvision_heap_used_bytes ${mem.heapUsed}`,
    '',
    `# HELP socvision_heap_total_bytes V8 heap total bytes`,
    `# TYPE socvision_heap_total_bytes gauge`,
    `socvision_heap_total_bytes ${mem.heapTotal}`,
    '',
    `# HELP socvision_rss_bytes Resident set size bytes`,
    `# TYPE socvision_rss_bytes gauge`,
    `socvision_rss_bytes ${mem.rss}`,
  ].join('\n');

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(200).send(metrics);
});

export default router;
