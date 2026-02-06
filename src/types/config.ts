/**
 * Application configuration type definitions
 */

export interface DiscordConfig {
  token: string;
  clientId: string;
  guildId?: string;
}

export interface GitHubConfig {
  token: string;
  org: string;
  repositories?: string[];
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  channelId: string;
}

export interface ReactionConfig {
  logEmoji: string;
}

export interface SentryConfig {
  dsn?: string;
}

export interface WebhookConfig {
  port: number;
  secret?: string;
  projectThreadChannel: string;
  releaseAnnouncementChannel: string;
  starsVoiceChannel: string;
  releaseVoiceChannel: string;
  insiderVoiceChannel: string;
  watchedRepositories: string[];
  watchedLabels: string[];
}

export interface AppConfig {
  discord: DiscordConfig;
  github: GitHubConfig;
  logging: LoggingConfig;
  reaction: ReactionConfig;
  webhook: WebhookConfig;
  sentry?: SentryConfig;
  nodeEnv: 'development' | 'production' | 'test';
}

export interface EnvironmentVariables {
  DISCORD_BOT_TOKEN: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_GUILD_ID?: string;
  GITHUB_TOKEN: string;
  GITHUB_ORG: string;
  LOG_CHANNEL_ID: string;
  REACTION_EMOJI?: string;
  NODE_ENV?: 'development' | 'production' | 'test';
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  SENTRY_DSN?: string;
  ENABLE_FILE_LOGS?: string;
  LOG_DIR?: string;
  WEBHOOK_PORT: number;
  WEBHOOK_SECRET?: string;
  PROJECT_THREAD_CHANNEL_ID: string;
  RELEASE_CHANNEL_ID: string;
  STARS_VOICE_CHANNEL_ID: string;
  RELEASE_VOICE_CHANNEL_ID: string;
  INSIDER_VOICE_CHANNEL_ID: string;
  WATCHED_REPOSITORIES: string;
  WATCHED_LABELS: string;
}
