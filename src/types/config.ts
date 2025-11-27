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

export interface AppConfig {
  discord: DiscordConfig;
  github: GitHubConfig;
  logging: LoggingConfig;
  reaction: ReactionConfig;
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
}