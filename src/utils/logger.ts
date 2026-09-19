/**
 * Application logger using Winston
 *
 * **Efficiency Notes:**
 * - Console-only logging by default (no file I/O overhead)
 * - File logging explicitly disabled unless ENABLE_FILE_LOGS=true
 * - Singleton pattern ensures one logger instance
 * - Child loggers cached per module name
 *
 * **Usage Patterns:**
 * - Services/Classes: Use module name for better tracing
 *   ```typescript
 *   private readonly logger = getLogger('MyService');
 *   ```
 * - Event handlers: Use descriptive module name
 *   ```typescript
 *   const logger = getLogger('InteractionCreate');
 *   ```
 * - One-off functions: Use without module name
 *   ```typescript
 *   const logger = getLogger();
 *   ```
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
 *
 * @param moduleName - Optional module identifier for better log tracing
 * @returns Logger instance (root or child logger if moduleName provided)
 *
 * @example
 * // In services/classes - use module name
 * private readonly logger = getLogger('GitHubService');
 *
 * @example
 * // In event handlers - use descriptive name
 * const logger = getLogger('MessageReactionAdd');
 *
 * @example
 * // In one-off functions - no module name needed
 * const logger = getLogger();
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

/**
 * Logger factory for consistent initialization patterns
 *
 * This factory provides semantic methods for creating loggers with appropriate context.
 * All codebase loggers now use LoggerFactory for consistency and maintainability.
 *
 * Usage examples:
 * - Services: `LoggerFactory.forService('MyService')`
 * - Events: `LoggerFactory.forEvent('MessageCreate')`
 * - Commands: `LoggerFactory.forCommand('ping')`
 * - Webhooks: `LoggerFactory.forWebhook('Release')`
 * - Generic: `LoggerFactory.generic()` (use sparingly for non-categorized contexts)
 */
export class LoggerFactory {
  /**
   * Create a logger for a service class
   */
  public static forService(serviceName: string): Logger {
    return getLogger(serviceName);
  }

  /**
   * Create a logger for an event handler
   */
  public static forEvent(eventName: string): Logger {
    return getLogger(eventName);
  }

  /**
   * Create a logger for a command handler
   */
  public static forCommand(commandName: string): Logger {
    return getLogger(`Command:${commandName}`);
  }

  /**
   * Create a logger for a webhook handler
   */
  public static forWebhook(webhookType: string): Logger {
    return getLogger(`Webhook:${webhookType}`);
  }

  /**
   * Create a generic logger (use sparingly)
   */
  public static generic(): Logger {
    return getLogger();
  }
}
