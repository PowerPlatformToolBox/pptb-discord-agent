/**
 * Custom error type definitions
 */

export class DiscordBotError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DiscordBotError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConfigurationError extends DiscordBotError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', context);
    this.name = 'ConfigurationError';
  }
}

export class DiscordAPIError extends DiscordBotError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DISCORD_API_ERROR', context);
    this.name = 'DiscordAPIError';
  }
}

export class GitHubAPIError extends DiscordBotError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'GITHUB_API_ERROR', context);
    this.name = 'GitHubAPIError';
  }
}

export class ValidationError extends DiscordBotError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}
