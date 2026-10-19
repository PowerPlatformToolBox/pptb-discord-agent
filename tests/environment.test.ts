import { describe, expect, it } from '@jest/globals';
import { loadConfig, parseRoutes } from '../src/config/config';
import { validateEnvironment } from '../src/config/environment';
import { ConfigurationError } from '../src/types/errors';
import { useTestEnv } from './testEnv';

describe('validateEnvironment', () => {
  useTestEnv();

  it('accepts a complete environment', () => {
    expect(validateEnvironment()).toMatchObject({ GITHUB_ORG: 'PowerPlatformToolBox' });
  });

  it('names the missing variable', () => {
    process.env.GITHUB_TOKEN = '';
    expect(() => validateEnvironment()).toThrow(/GITHUB_TOKEN/);
  });

  it('rejects an invalid LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'verbose';
    expect(() => validateEnvironment()).toThrow(/LOG_LEVEL/);
  });

  it('rejects channel IDs that are not snowflakes', () => {
    process.env.DISCORD_CHANNEL_TOOLS = 'general';
    expect(() => validateEnvironment()).toThrow(/DISCORD_CHANNEL_TOOLS/);
  });

  it('rejects invalid discussion thread role IDs', () => {
    process.env.DISCUSSION_THREAD_ROLE_IDS = 'not-a-role-id';
    expect(() => validateEnvironment()).toThrow(/DISCUSSION_THREAD_ROLE_IDS/);
  });

  it('rejects a short PLATFORM_EVENTS_SECRET', () => {
    process.env.PLATFORM_EVENTS_SECRET = 'short';
    expect(() => validateEnvironment()).toThrow(/PLATFORM_EVENTS_SECRET/);
  });
});

describe('loadConfig', () => {
  useTestEnv();

  it('maps channels, lists and optional overrides', () => {
    process.env.DISABLED_NOTIFICATIONS = 'verify.*, tool.deleted';
    process.env.NOTIFICATION_ROUTES = 'tool.update=releases,verify.approved=123456789012345678';
    process.env.DISCUSSION_THREAD_ROLE_IDS = '200000000000000001, 200000000000000002';
    const config = loadConfig();
    expect(config.discord.channels.admin).toBe('100000000000000001');
    expect(config.discord.discussionRoleIds).toEqual(['200000000000000001', '200000000000000002']);
    expect(config.github.watchedLabels).toEqual(['DiscordDiscussion', 'feature']);
    expect(config.notifications.disabled).toEqual(['verify.*', 'tool.deleted']);
    expect(config.notifications.routes).toEqual({
      'tool.update': 'releases',
      'verify.approved': '123456789012345678',
    });
  });

  it('wraps validation failures in ConfigurationError', () => {
    process.env.DISCORD_BOT_TOKEN = '';
    expect(() => loadConfig()).toThrow(ConfigurationError);
  });
});

describe('parseRoutes', () => {
  it('rejects malformed entries', () => {
    expect(() => parseRoutes('tool.update')).toThrow(ConfigurationError);
  });
});
