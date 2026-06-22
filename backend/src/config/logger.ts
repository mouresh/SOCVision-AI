import winston, { format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { env, isProd, isTest } from './env';

// ---------------------------------------------------------------------------
// Custom log levels (extends Winston defaults with 'http' between info/verbose)
// ---------------------------------------------------------------------------
const LOG_LEVELS = {
  error:   0,
  warn:    1,
  info:    2,
  http:    3,
  verbose: 4,
  debug:   5,
  silly:   6,
};

const LOG_COLOURS = {
  error:   'red',
  warn:    'yellow',
  info:    'green',
  http:    'magenta',
  verbose: 'cyan',
  debug:   'blue',
  silly:   'grey',
};

winston.addColors(LOG_COLOURS);

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/** Strips ANSI escape codes (used when writing to file) */
const stripAnsi = format((info) => {
  // eslint-disable-next-line no-control-regex
  const ansiRegex = /\x1B\[[0-9;]*m/g;
  if (typeof info.message === 'string') {
    info.message = info.message.replace(ansiRegex, '');
  }
  return info;
});

/** Attaches the requesting service/module name if passed as metadata */
const serviceLabel = format((info) => {
  info.service = 'socvision-api';
  return info;
});

/** Redacts sensitive fields before logging */
const REDACTED_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'jwt_secret',
  'mfa_secret',
  'authorization',
  'cookie',
  'x-api-key',
]);

const redact = format((info) => {
  const redactObj = (obj: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (REDACTED_KEYS.has(k.toLowerCase())) {
        out[k] = '[REDACTED]';
      } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        out[k] = redactObj(v as Record<string, unknown>);
      } else {
        out[k] = v;
      }
    }
    return out;
  };

  // Redact the meta payload (everything except level/message/timestamp/service)
  const { level, message, timestamp, service, stack, ...meta } = info as Record<string, unknown>;
  const redacted = redactObj(meta);
  return Object.assign(info, redacted, { level, message, timestamp, service, stack });
});

// ── JSON format (production / structured logs) ────────────────────────────
const jsonFormat = format.combine(
  format.errors({ stack: true }),
  serviceLabel(),
  redact(),
  format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  format.json(),
);

// ── Pretty format (development terminal) ─────────────────────────────────
const prettyFormat = format.combine(
  format.errors({ stack: true }),
  serviceLabel(),
  redact(),
  format.timestamp({ format: 'HH:mm:ss.SSS' }),
  format.colorize({ all: true }),
  format.printf(({ timestamp, level, message, service, stack, ...meta }) => {
    const metaStr =
      Object.keys(meta).length > 0
        ? '\n  ' + JSON.stringify(meta, null, 2).replace(/\n/g, '\n  ')
        : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp} [${service}] ${level}: ${message}${metaStr}${stackStr}`;
  }),
);

// ---------------------------------------------------------------------------
// Transports
// ---------------------------------------------------------------------------
const activeTransports: winston.transport[] = [];

// ── Console ────────────────────────────────────────────────────────────────
if (!isTest) {
  activeTransports.push(
    new transports.Console({
      format: env.LOG_FORMAT === 'pretty' ? prettyFormat : jsonFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
  );
}

// ── Rotating file transports (non-test environments) ─────────────────────
if (!isTest) {
  const rotateBase: any = {
    dirname:         path.resolve(env.LOG_DIR),
    datePattern:     'YYYY-MM-DD',
    zippedArchive:   true,
    maxSize:         '50m',
    maxFiles:        isProd ? '90d' : '14d',
    format:          format.combine(stripAnsi(), jsonFormat),
    handleExceptions: false,    // console transport already handles these
    auditFile:       path.resolve(env.LOG_DIR, '.audit.json'),
  };

  // All logs ≥ http
  activeTransports.push(
    new DailyRotateFile({
      ...rotateBase,
      filename: 'socvision-%DATE%-combined.log',
      level:    'http',
    } as any),
  );

  // Errors only (makes it easy to tail errors in production)
  activeTransports.push(
    new DailyRotateFile({
      ...rotateBase,
      filename: 'socvision-%DATE%-error.log',
      level:    'error',
    } as any),
  );
}

// ---------------------------------------------------------------------------
// Logger singleton type extension to support Pino style: logger.info({ meta }, 'msg')
// ---------------------------------------------------------------------------
export interface CustomLogger extends winston.Logger {
  error(meta: object, message?: string): winston.Logger;
  error(message: string, ...meta: any[]): winston.Logger;
  warn(meta: object, message?: string): winston.Logger;
  warn(message: string, ...meta: any[]): winston.Logger;
  info(meta: object, message?: string): winston.Logger;
  info(message: string, ...meta: any[]): winston.Logger;
  http(meta: object, message?: string): winston.Logger;
  http(message: string, ...meta: any[]): winston.Logger;
  verbose(meta: object, message?: string): winston.Logger;
  verbose(message: string, ...meta: any[]): winston.Logger;
  debug(meta: object, message?: string): winston.Logger;
  debug(message: string, ...meta: any[]): winston.Logger;
}

export const logger = winston.createLogger({
  levels:             LOG_LEVELS,
  level:              env.LOG_LEVEL,
  transports:         activeTransports,
  exitOnError:        false,
  defaultMeta:        { service: 'socvision-api', env: env.NODE_ENV },
}) as unknown as CustomLogger;

// ---------------------------------------------------------------------------
// Morgan HTTP request stream  (used in app.ts)
// ---------------------------------------------------------------------------
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trimEnd());
  },
};

// ---------------------------------------------------------------------------
// Process-level safety nets
// ---------------------------------------------------------------------------
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'process: uncaught exception — shutting down');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'process: unhandled promise rejection');
  // Do NOT exit — allow the request cycle to fail naturally
});

