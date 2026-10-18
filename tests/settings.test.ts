import { describe, expect, it } from '@jest/globals';
import { loadConfig } from '../src/config/config';
import { getNotification } from '../src/notifications/catalog';
import { isNotificationEnabled, resolveChannelId } from '../src/notifications/settings';
import { ConfigurationError } from '../src/types/errors';
import { TEST_ENV, useTestEnv } from './testEnv';

describe('notification settings', () => {
  useTestEnv();
  const approved = getNotification('verify.approved');
  const update = getNotification('tool.update');

  it('is enabled by default', () => {
    expect(isNotificationEnabled(approved, loadConfig())).toBe(true);
  });

  it.each(['verify.approved', 'verify.*', '*', 'tool.update, verify.approved'])(
    'DISABLED_NOTIFICATIONS=%s disables verify.approved',
    (value) => {
      process.env.DISABLED_NOTIFICATIONS = value;
      expect(isNotificationEnabled(approved, loadConfig())).toBe(false);
    }
  );

  it('does not disable other categories with a prefix wildcard', () => {
    process.env.DISABLED_NOTIFICATIONS = 'verify.*';
    expect(isNotificationEnabled(update, loadConfig())).toBe(true);
  });

  it('routes to the default channel alias', () => {
    expect(resolveChannelId(update, loadConfig())).toBe(TEST_ENV.DISCORD_CHANNEL_TOOLS);
  });

  it('honours alias and raw-ID overrides', () => {
    process.env.NOTIFICATION_ROUTES = 'tool.update=releases,verify.approved=987654321098765432';
    const config = loadConfig();
    expect(resolveChannelId(update, config)).toBe(TEST_ENV.DISCORD_CHANNEL_RELEASES);
    expect(resolveChannelId(approved, config)).toBe('987654321098765432');
  });

  it('rejects unknown route targets', () => {
    process.env.NOTIFICATION_ROUTES = 'tool.update=general';
    expect(() => resolveChannelId(update, loadConfig())).toThrow(ConfigurationError);
  });
});
