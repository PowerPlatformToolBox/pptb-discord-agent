/**
 * Error handling utilities
 */

/**
 * Safely extracts error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Safely extracts error stack from unknown error type
 */
export function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

/**
 * Creates a standardized error object for logging
 */
export function createErrorLogObject(error: unknown): {
  error: string;
  stack?: string;
} {
  return {
    error: getErrorMessage(error),
    stack: getErrorStack(error),
  };
}
