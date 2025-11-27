/**
 * Application configuration management
 */

import { validateEnvironment } from './environment';
import { ConfigurationError } from '../types/errors';
import type { AppConfig } from '../types';

let cachedConfig: AppConfig | null = null;

/**
 * Load and validate application configuration
 */
export function loadConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const env = validateEnvironment();

    cachedConfig = {
      discord: {
        token: env.DISCORD_BOT_TOKEN,
        clientId: env.DISCORD_CLIENT_ID,
        guildId: env.DISCORD_GUILD_ID,
      },
      github: {
        token: env.GITHUB_TOKEN,
        org: env.GITHUB_ORG,
      },
      logging: {
        level: env.LOG_LEVEL ?? 'info',
        channelId: env.LOG_CHANNEL_ID,
      },
      reaction: {
        logEmoji: env.REACTION_EMOJI ?? '⭐',
      },
      nodeEnv: env.NODE_ENV ?? 'development',
    };

    return cachedConfig;
  } catch (error) {
    throw new ConfigurationError(
      `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { error }
    );
  }
}

/**
 * Get current configuration (throws if not loaded)
 */
export function getConfig(): AppConfig {
  if (!cachedConfig) {
    throw new ConfigurationError('Configuration not loaded. Call loadConfig() first.');
  }

  return cachedConfig;
}