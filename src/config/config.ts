/**
 * Application configuration management
 */

import type { AppConfig } from '../types';
import { ConfigurationError } from '../types/errors';
import { LoggerFactory } from '../utils/logger';
import { validateEnvironment } from './environment';

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
        logEmoji: env.REACTION_EMOJI ?? '📝',
      },
      webhook: {
        port: env.WEBHOOK_PORT,
        secret: env.WEBHOOK_SECRET,
        projectThreadChannel: env.PROJECT_THREAD_CHANNEL_ID,
        releaseAnnouncementChannel: env.RELEASE_CHANNEL_ID,
        starsVoiceChannel: env.STARS_VOICE_CHANNEL_ID,
        releaseVoiceChannel: env.RELEASE_VOICE_CHANNEL_ID,
        insiderVoiceChannel: env.INSIDER_VOICE_CHANNEL_ID,
        watchedRepositories: (() => {
          const parsed = env.WATCHED_REPOSITORIES.split(',')
            .map((r) => r.trim())
            .filter((r) => r.length > 0);
          // If parsing results in empty array, fall back to schema default
          return parsed.length > 0 ? parsed : ['desktop-app'];
        })(),
        watchedLabels: (() => {
          const parsed = env.WATCHED_LABELS.split(',')
            .map((l) => l.trim())
            .filter((l) => l.length > 0);
          // If parsing results in empty array, fall back to schema default
          return parsed.length > 0 ? parsed : ['DiscordDiscussion'];
        })(),
      },
      nodeEnv: env.NODE_ENV ?? 'development',
    };

    // Logger is initialized here after config is created
    // IMPORTANT: Logger must remain independent of this config to avoid circular dependencies
    // Logger reads from process.env directly and should not call loadConfig()
    const logger = LoggerFactory.generic();

    logger.info('Configuration loaded', {
      nodeEnv: cachedConfig.nodeEnv,
      logLevel: cachedConfig.logging.level,
      webhookPort: cachedConfig.webhook.port,
      watchedRepositories: cachedConfig.webhook.watchedRepositories,
      watchedLabels: cachedConfig.webhook.watchedLabels,
    });

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
