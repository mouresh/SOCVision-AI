import { Pool, PoolClient, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { env, isProd } from './env';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// Pool configuration
// ---------------------------------------------------------------------------
const poolConfig: PoolConfig = {
  host:               env.DB_HOST,
  port:               env.DB_PORT,
  database:           env.DB_NAME,
  user:               env.DB_USER,
  password:           env.DB_PASSWORD,
  min:                env.DB_POOL_MIN,
  max:                env.DB_POOL_MAX,
  idleTimeoutMillis:  env.DB_POOL_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_POOL_CONNECTION_TIMEOUT_MS,
  statement_timeout:  env.DB_STATEMENT_TIMEOUT_MS,
  application_name:   'socvision-api',

  ssl:
    env.DB_SSL === 'false'
      ? false
      : env.DB_SSL === 'require'
      ? { rejectUnauthorized: true }
      : { rejectUnauthorized: !isProd },
};

// ---------------------------------------------------------------------------
// Pool singleton
// ---------------------------------------------------------------------------
export const pool = new Pool(poolConfig);

// ── Pool-level event hooks ─────────────────────────────────────────────────
pool.on('connect', (client) => {
  // Enforce UTC session-level so timestamps are always stored consistently
  client.query("SET timezone = 'UTC'").catch((err) =>
    logger.warn({ err }, 'db: failed to set session timezone'),
  );

  logger.debug(
    { host: env.DB_HOST, db: env.DB_NAME },
    'db: new client connected to pool',
  );
});

pool.on('acquire', () => {
  logger.debug(
    { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
    'db: client acquired from pool',
  );
});

pool.on('remove', () => {
  logger.debug('db: client removed from pool');
});

pool.on('error', (err, _client) => {
  logger.error({ err }, 'db: unexpected error on idle pool client');
});

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Execute a parameterised query against the pool.
 * Returns the full QueryResult — callers destructure { rows } as needed.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values?: unknown[],
): Promise<QueryResult<T>> {
  const start = Date.now();

  try {
    const result = await pool.query<T>(sql, values);

    logger.debug(
      { sql: sql.slice(0, 120), rows: result.rowCount, ms: Date.now() - start },
      'db: query executed',
    );

    return result;
  } catch (err) {
    logger.error(
      { err, sql: sql.slice(0, 120), ms: Date.now() - start },
      'db: query failed',
    );
    throw err;
  }
}

/**
 * Run multiple statements inside a single transaction.
 * Automatically commits on success and rolls back on any error.
 *
 * @example
 * const result = await withTransaction(async (client) => {
 *   await client.query('INSERT INTO alerts ...', [...]);
 *   await client.query('INSERT INTO audit_logs ...', [...]);
 *   return { ok: true };
 * });
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'db: transaction rolled back');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Borrow a raw client for advanced use-cases (cursors, COPY, advisory locks).
 * Always call release() in a finally block.
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
export interface DbHealthStatus {
  healthy:     boolean;
  latencyMs:   number;
  poolTotal:   number;
  poolIdle:    number;
  poolWaiting: number;
  error?:      string;
}

export async function checkDbHealth(): Promise<DbHealthStatus> {
  const start = Date.now();

  try {
    await pool.query('SELECT 1');

    return {
      healthy:     true,
      latencyMs:   Date.now() - start,
      poolTotal:   pool.totalCount,
      poolIdle:    pool.idleCount,
      poolWaiting: pool.waitingCount,
    };
  } catch (err) {
    return {
      healthy:     false,
      latencyMs:   Date.now() - start,
      poolTotal:   pool.totalCount,
      poolIdle:    pool.idleCount,
      poolWaiting: pool.waitingCount,
      error:       err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Initialise — verify connectivity at boot
// ---------------------------------------------------------------------------
export async function initDatabase(): Promise<void> {
  logger.info(
    { host: env.DB_HOST, port: env.DB_PORT, db: env.DB_NAME },
    'db: connecting to PostgreSQL…',
  );

  const health = await checkDbHealth();

  if (!health.healthy) {
    throw new Error(`Database connection failed: ${health.error}`);
  }

  logger.info(
    { latencyMs: health.latencyMs, poolMax: env.DB_POOL_MAX },
    'db: PostgreSQL connection pool ready',
  );
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
export async function closeDatabase(): Promise<void> {
  logger.info('db: draining connection pool…');
  await pool.end();
  logger.info('db: all connections closed');
}
