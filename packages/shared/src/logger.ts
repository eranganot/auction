/**
 * Minimal dependency-free structured JSON logger. Each line is a single JSON
 * object: { ts, level, msg, ...context }. Honors LOG_LEVEL (debug<info<warn<error).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface Logger {
  debug(msg: string, ctx?: Record<string, unknown>): void;
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

function emit(
  threshold: LogLevel,
  level: LogLevel,
  bindings: Record<string, unknown>,
  msg: string,
  ctx?: Record<string, unknown>,
): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[threshold]) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...bindings,
    ...(ctx ?? {}),
  });
  // eslint-disable-next-line no-console
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  sink(line);
}

export function createLogger(
  level: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info',
  bindings: Record<string, unknown> = {},
): Logger {
  return {
    debug: (msg, ctx) => emit(level, 'debug', bindings, msg, ctx),
    info: (msg, ctx) => emit(level, 'info', bindings, msg, ctx),
    warn: (msg, ctx) => emit(level, 'warn', bindings, msg, ctx),
    error: (msg, ctx) => emit(level, 'error', bindings, msg, ctx),
    child: (extra) => createLogger(level, { ...bindings, ...extra }),
  };
}

/** Default process-wide logger. */
export const logger = createLogger();
