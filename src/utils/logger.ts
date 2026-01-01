/**
 * Application logger using Winston
 */

import fs from 'node:fs';
import path from 'node:path';
import { createLogger, format, transports, type Logger } from 'winston';

const { combine, timestamp, printf, errors, splat, metadata, colorize } = format;

let loggerInstance: Logger | null = null;

function createAppLogger(): Logger {
  // Ensure logs directory exists only when file logging is enabled
  const env = process.env.NODE_ENV ?? 'development';
  const enableFileLogs = env !== 'production';
  const level = env === 'development' ? 'debug' : 'info';

  let logDir = '';
  if (enableFileLogs) {
    logDir = path.resolve(process.cwd(), 'logs');
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
export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = createAppLogger();
  }
  return loggerInstance;
}
