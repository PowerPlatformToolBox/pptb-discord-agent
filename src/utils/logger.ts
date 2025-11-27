/**
 * Application logger using Winston
 */

import winston from 'winston';
import { getConfig } from '../config/config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  if (stack) {
    msg += `\n${stack}`;
  }

  return msg;
});

/**
 * Create and configure Winston logger instance
 */
export function createLogger(): winston.Logger {
  const config = getConfig();

  return winston.createLogger({
    level: config.logging.level,
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true })),
    defaultMeta: { service: 'pptb-discord-assistant' },
    transports: [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: combine(timestamp(), winston.format.json()),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: combine(timestamp(), winston.format.json()),
      }),
    ],
  });
}

let loggerInstance: winston.Logger | null = null;

/**
 * Get logger instance (singleton)
 */
export function getLogger(): winston.Logger {
  if (!loggerInstance) {
    loggerInstance = createLogger();

    // Add console transport in non-production
    const config = getConfig();
    if (config.nodeEnv !== 'production') {
      loggerInstance.add(
        new winston.transports.Console({
          format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
        })
      );
    }
  }

  return loggerInstance;
}