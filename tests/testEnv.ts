import { afterEach, beforeEach, jest } from '@jest/globals';
import { resetConfig } from '../src/config/config';
import { resetDiscordRest } from '../src/discord/rest';

export const TEST_ENV: Record<string, string> = {
  DISCORD_BOT_TOKEN: 'token',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_PUBLIC_KEY: 'a'.repeat(64),
  DISCORD_GUILD_ID: '123456789012345679',
  DISCORD_CHANNEL_ADMIN: '100000000000000001',
  DISCORD_CHANNEL_TOOLS: '100000000000000002',
  DISCORD_CHANNEL_RELEASES: '100000000000000003',
  DISCORD_CHANNEL_INSIDER: '100000000000000004',
  DISCORD_CHANNEL_DISCUSSIONS: '100000000000000005',
  DISCORD_CHANNEL_STARS: '100000000000000006',
  GITHUB_TOKEN: 'gh-token',
  GITHUB_ORG: 'PowerPlatformToolBox',
  GITHUB_WEBHOOK_SECRET: 'github-secret',
  STARS_REPOSITORY: 'desktop-app',
  WATCHED_LABELS: 'DiscordDiscussion,feature',
  PLATFORM_EVENTS_SECRET: 'p'.repeat(32),
  CRON_SECRET: 'c'.repeat(16),
  LOG_LEVEL: 'error',
};

/**
 * Stub a complete, valid environment for each test and clear cached singletons.
 */
export function useTestEnv(): void {
  beforeEach(() => {
    jest.replaceProperty(process, 'env', {
      ...process.env,
      ...TEST_ENV,
      DISABLED_NOTIFICATIONS: undefined,
      NOTIFICATION_ROUTES: undefined,
    });
    resetConfig();
    resetDiscordRest();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetConfig();
    resetDiscordRest();
  });
}
