import * as Sentry from '@sentry/node';
import { getLogger } from './logger';

const logger = getLogger('SentryHelper');

/**
 * Initialize Sentry error tracking if DSN is provided.
 * Gracefully handles missing DSN and logs initialization status.
 * @param dsn - Optional Sentry DSN
 */
export function initializeSentry(dsn?: string): void {
  if (!dsn) {
    logger.info('Sentry DSN not configured; error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection(),
      ],
    });

    logger.info('Sentry initialized successfully', { dsn: dsn.substring(0, 20) + '...' });
  } catch (error) {
    logger.warn('Failed to initialize Sentry', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Capture an exception to Sentry if enabled.
 * @param error - The error to capture
 * @param context - Optional context metadata
 */
export function captureException(error: Error | unknown, context?: Record<string, unknown>): void {
  if (!Sentry.isInitialized()) {
    logger.debug('Sentry not initialized; skipping error capture');
    return;
  }

  try {
    if (context) {
      Sentry.captureException(error, {
        extra: context,
      });
    } else {
      Sentry.captureException(error);
    }
  } catch (captureError) {
    logger.warn('Failed to capture exception to Sentry', {
      error: captureError instanceof Error ? captureError.message : String(captureError),
    });
  }
}

/**
 * Add a breadcrumb to Sentry if enabled.
 * @param message - Breadcrumb message
 * @param category - Breadcrumb category (e.g., 'command', 'event', 'interaction')
 * @param data - Optional metadata
 */
export function addBreadcrumb(
  message: string,
  category: string = 'app',
  data?: Record<string, unknown>
): void {
  if (!Sentry.isInitialized()) {
    return;
  }

  try {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
    });
  } catch (error) {
    logger.debug('Failed to add breadcrumb to Sentry', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Check if Sentry is initialized and enabled.
 */
export function isSentryEnabled(): boolean {
  return Sentry.isInitialized();
}
