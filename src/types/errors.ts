/**
 * Custom error type definitions
 */

export class BotError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BotError';
  }
}

export class ConfigurationError extends BotError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', context);
    this.name = 'ConfigurationError';
  }
}

export class DiscordAPIError extends BotError {
  constructor(
    message: string,
    public readonly status: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'DISCORD_API_ERROR', context);
    this.name = 'DiscordAPIError';
  }
}

export class DiscordRateLimitError extends DiscordAPIError {
  constructor(
    message: string,
    public readonly retryAfterSeconds: number,
    context?: Record<string, unknown>
  ) {
    super(message, 429, context);
    this.name = 'DiscordRateLimitError';
  }
}

export class GitHubAPIError extends BotError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'GITHUB_API_ERROR', context);
    this.name = 'GitHubAPIError';
  }
}

export class ValidationError extends BotError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}
