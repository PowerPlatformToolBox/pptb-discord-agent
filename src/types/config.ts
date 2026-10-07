/**
 * Application configuration type definitions
 */

export interface DiscordConfig {
  token: string;
  clientId: string;
  guildId: string;
}

export interface GitHubConfig {
  token: string;
  org: string;
  repositories?: string[];
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
}

export interface WebhookConfig {
  port: number;
  secret: string;
  pptbEventsSecret: string;
  projectThreadChannel: string;
  releaseAnnouncementChannel: string;
  starsVoiceChannel: string;
  watchedRepositories: string[];
  watchedLabels: string[];
}

export interface AppConfig {
  discord: DiscordConfig;
  github: GitHubConfig;
  logging: LoggingConfig;
  webhook: WebhookConfig;
  nodeEnv: 'development' | 'production' | 'test';
}

export interface EnvironmentVariables {
  DISCORD_BOT_TOKEN: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_GUILD_ID: string;
  GITHUB_TOKEN: string;
  GITHUB_ORG: string;
  NODE_ENV: 'development' | 'production' | 'test';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  ENABLE_FILE_LOGS: 'true' | 'false';
  LOG_DIR: string;
  WEBHOOK_PORT: number;
  WEBHOOK_SECRET: string;
  PPTB_EVENTS_SECRET: string;
  PROJECT_THREAD_CHANNEL_ID: string;
  RELEASE_CHANNEL_ID: string;
  STARS_VOICE_CHANNEL_ID: string;
  WATCHED_REPOSITORIES: string;
  WATCHED_LABELS: string;
}
