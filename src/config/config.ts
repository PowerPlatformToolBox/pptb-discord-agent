/**
 * Application configuration management
 */

import type { ChannelAlias } from '../notifications/channels';
import { ConfigurationError } from '../types/errors';
import { validateEnvironment } from './environment';

export interface AppConfig {
  discord: {
    token: string;
    clientId: string;
    publicKey: string;
    guildId: string;
    channels: Record<ChannelAlias, string>;
    discussionRoleIds: string[];
  };
  github: {
    token: string;
    org: string;
    webhookSecret: string;
    starsRepository: string;
    watchedLabels: string[];
  };
  security: {
    platformEventsSecret: string;
    cronSecret: string;
  };
  notifications: {
    disabled: string[];
    routes: Record<string, string>;
  };
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

let cachedConfig: AppConfig | null = null;

export function parseList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Parse `key=target,key2=target2` pairs.
 */
export function parseRoutes(value: string | undefined): Record<string, string> {
  const routes: Record<string, string> = {};
  for (const pair of parseList(value)) {
    const [key, target] = pair.split('=').map((part) => part.trim());
    if (!key || !target) {
      throw new ConfigurationError(
        `Invalid NOTIFICATION_ROUTES entry "${pair}" (expected key=target)`
      );
    }
    routes[key] = target;
  }
  return routes;
}

/**
 * Load and validate application configuration (cached per function instance)
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
        publicKey: env.DISCORD_PUBLIC_KEY,
        guildId: env.DISCORD_GUILD_ID,
        discussionRoleIds: parseList(env.DISCUSSION_THREAD_ROLE_IDS),
        channels: {
          admin: env.DISCORD_CHANNEL_ADMIN,
          tools: env.DISCORD_CHANNEL_TOOLS,
          releases: env.DISCORD_CHANNEL_RELEASES,
          insider: env.DISCORD_CHANNEL_INSIDER,
          discussions: env.DISCORD_CHANNEL_DISCUSSIONS,
          stars: env.DISCORD_CHANNEL_STARS,
        },
      },
      github: {
        token: env.GITHUB_TOKEN,
        org: env.GITHUB_ORG,
        webhookSecret: env.GITHUB_WEBHOOK_SECRET,
        starsRepository: env.STARS_REPOSITORY,
        watchedLabels: parseList(env.WATCHED_LABELS),
      },
      security: {
        platformEventsSecret: env.PLATFORM_EVENTS_SECRET,
        cronSecret: env.CRON_SECRET,
      },
      notifications: {
        disabled: parseList(env.DISABLED_NOTIFICATIONS),
        routes: parseRoutes(env.NOTIFICATION_ROUTES),
      },
      logLevel: env.LOG_LEVEL,
    };

    return cachedConfig;
  } catch (error) {
    if (error instanceof ConfigurationError) throw error;
    throw new ConfigurationError(
      `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Reset cached config (tests only)
 */
export function resetConfig(): void {
  cachedConfig = null;
}
