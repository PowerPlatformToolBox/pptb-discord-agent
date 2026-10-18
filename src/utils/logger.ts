/**
 * Structured JSON logger for Vercel function logs.
 *
 * Reads LOG_LEVEL from process.env directly; must not call loadConfig() (avoids circular deps
 * and lets config errors themselves be logged).
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogMeta = Record<string, unknown>;

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
}

function currentLevel(): LogLevel {
  const level = process.env.LOG_LEVEL as LogLevel | undefined;
  return level && level in LEVELS ? level : 'info';
}

function write(level: LogLevel, scope: string, message: string, meta?: LogMeta): void {
  if (LEVELS[level] < LEVELS[currentLevel()]) return;
  const line = JSON.stringify({ level, scope, message, ...meta, time: new Date().toISOString() });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

const loggers = new Map<string, Logger>();

export function getLogger(scope = 'app'): Logger {
  let logger = loggers.get(scope);
  if (!logger) {
    logger = {
      debug: (message, meta) => write('debug', scope, message, meta),
      info: (message, meta) => write('info', scope, message, meta),
      warn: (message, meta) => write('warn', scope, message, meta),
      error: (message, meta) => write('error', scope, message, meta),
    };
    loggers.set(scope, logger);
  }
  return logger;
}
