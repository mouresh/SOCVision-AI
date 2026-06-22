import { z } from 'zod';
import path from 'path';
import dotenv from 'dotenv';

// Load .env before validation so variables are populated
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const envSchema = z.object({
  // ── Runtime ───────────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  HOST: z.string().default('0.0.0.0'),

  // ── API ───────────────────────────────────────────────────────────────────
  API_VERSION: z.string().default('v1'),
  API_PREFIX: z.string().default('/api'),

  // ── PostgreSQL ────────────────────────────────────────────────────────────
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
  DB_SSL: z.enum(['true', 'false', 'require']).default('false'),
  DB_POOL_MIN: z.coerce.number().int().min(0).default(2),
  DB_POOL_MAX: z.coerce.number().int().min(1).default(20),
  DB_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().default(30_000),
  DB_POOL_CONNECTION_TIMEOUT_MS: z.coerce.number().int().default(5_000),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().default(30_000),

  // ── Security ──────────────────────────────────────────────────────────────
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),

  // ── CORS ──────────────────────────────────────────────────────────────────
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  CORS_CREDENTIALS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  // ── Rate Limiting ─────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(15 * 60 * 1000), // 15 min
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().default(500),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().default(10),   // stricter for /auth

  // ── Logging ───────────────────────────────────────────────────────────────
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  LOG_DIR: z.string().default('logs'),

  // ── Redis (optional — for session cache) ─────────────────────────────────
  REDIS_URL: z.string().url().optional(),

  // ── Service integrations ──────────────────────────────────────────────────
  SPLUNK_HEC_URL: z.string().url().optional(),
  SPLUNK_HEC_TOKEN: z.string().optional(),
  SPLUNK_HOST: z.string().default('localhost'),
  SPLUNK_PORT: z.coerce.number().int().default(8089),
  SPLUNK_USERNAME: z.string().default('admin'),
  SPLUNK_PASSWORD: z.string().default('changeme'),
  SPLUNK_TOKEN: z.string().optional(),
  SPLUNK_SIMULATION_MODE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  WAZUH_API_URL: z.string().url().optional(),
  WAZUH_API_USER: z.string().optional(),
  WAZUH_API_PASSWORD: z.string().optional(),

  // ── Feature flags ─────────────────────────────────────────────────────────
  ENABLE_SWAGGER: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  ENABLE_METRICS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

// ---------------------------------------------------------------------------
// Parse & validate
// ---------------------------------------------------------------------------
const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  const issues = _parsed.error.issues
    .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
    .join('\n');

  // Use console.error here — the logger hasn't initialised yet
  console.error('\n[SOCVision] ❌  Environment validation failed:\n' + issues + '\n');
  process.exit(1);
}

export const env = _parsed.data;

// ---------------------------------------------------------------------------
// Derived convenience flags
// ---------------------------------------------------------------------------
export const isProd        = env.NODE_ENV === 'production';
export const isDev         = env.NODE_ENV === 'development';
export const isTest        = env.NODE_ENV === 'test';

// Fully qualified base URL (useful for log messages / Swagger server URL)
export const BASE_URL =
  `http${isProd ? 's' : ''}://${env.HOST}:${env.PORT}${env.API_PREFIX}/${env.API_VERSION}`;

export type Env = z.infer<typeof envSchema>;
