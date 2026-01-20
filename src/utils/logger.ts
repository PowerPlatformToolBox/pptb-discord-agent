/**
 * Application logger using Winston
 */

import fs from 'node:fs';
import path from 'node:path';
import { createLogger, format, transports, type Logger } from 'winston';

const { combine, timestamp, printf, errors, splat, metadata, colorize } = format;

let loggerInstance: Logger | null = null;
const childLoggers: Record<string, Logger> = {};

function createAppLogger(): Logger {
  // Console-only logging by default; file logging disabled unless explicitly enabled via env
  const env = process.env.NODE_ENV ?? 'development';
  const enableFileLogs = process.env.ENABLE_FILE_LOGS === 'true'; // Disabled by default
  const level = env === 'development' ? 'debug' : 'info';

  let logDir = '';
  if (enableFileLogs) {
    // Use LOG_DIR env var or default to ./logs
    logDir = process.env.LOG_DIR
      ? path.resolve(process.env.LOG_DIR)
      : path.resolve(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  const consoleFormat = combine(
    colorize(),
    timestamp(),
    errors({ stack: true }),
    splat(),
    metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    printf(({ timestamp: ts, level: lv, message, metadata: md, stack }) => {
      const meta = Object.keys(md || {}).length ? ` ${JSON.stringify(md)}` : '';
      const stackMsg = stack ? `\n${stack}` : '';
      return `${ts} [${lv}]: ${message}${meta}${stackMsg}`;
    })
  );

  const fileFormat = combine(
    timestamp(),
    errors({ stack: true }),
    splat(),
    metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    format.json()
  );

  const transportsList: (transports.ConsoleTransportInstance | transports.FileTransportInstance)[] =
    [new transports.Console({ format: consoleFormat })];

  if (enableFileLogs) {
    transportsList.push(
      new transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
      new transports.File({ filename: path.join(logDir, 'combined.log') })
    );
  }

  return createLogger({
    level,
    format: fileFormat,
    transports: transportsList,
    exitOnError: false,
  });
}

/**
 * Returns a singleton Winston logger instance.
 */
export function getLogger(moduleName?: string): Logger {
  if (!loggerInstance) {
    loggerInstance = createAppLogger();
  }

  if (!moduleName) {
    return loggerInstance;
  }

  if (!childLoggers[moduleName]) {
    childLoggers[moduleName] = loggerInstance.child({ module: moduleName });
  }

  return childLoggers[moduleName];
}
