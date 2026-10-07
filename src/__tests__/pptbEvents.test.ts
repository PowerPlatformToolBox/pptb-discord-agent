import { ChannelType, type Client } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NOTIFICATIONS,
  resolveRoute,
  resolveVscodeChannel,
  validateNotificationConfig,
} from '../config/notifications';
import { createPptbEventEmbed } from '../services/pptbEvents/embed';
import { PptbEventHandler } from '../services/pptbEvents/handler';
import { signPptbEvent, verifyPptbSignature } from '../services/webhook/pptbSignature';
import { pptbEventSchema } from '../types/pptbEvents';
import { samplePptbEvent, testNotificationConfig } from './pptbFixtures';

const fetchChannel = vi.fn();
vi.mock('../utils/channelCache', () => ({
  getChannelCache: () => ({ fetch: fetchChannel }),
}));

describe('pptbEventSchema', () => {
  it('accepts a valid event', () => {
    expect(pptbEventSchema.safeParse(samplePptbEvent()).success).toBe(true);
  });

  it('rejects an event that belongs to another category', () => {
    const result = pptbEventSchema.safeParse({ ...samplePptbEvent(), event: 'UpdateFailed' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-http tool url', () => {
    const event = samplePptbEvent({ tool: { name: 'x', url: 'javascript:alert(1)' } });
    expect(pptbEventSchema.safeParse(event).success).toBe(false);
  });
});

describe('notification config', () => {
  it('accepts the test config', () => {
    expect(() => validateNotificationConfig(testNotificationConfig())).not.toThrow();
  });

  it('names a bad ID', () => {
    const config = testNotificationConfig();
    config.roles.toolIntake = 'not-an-id';
    expect(() => validateNotificationConfig(config)).toThrow(/roles\.toolIntake/);
  });

  it('keeps Revoked submissions muted until pptb-web can send them', () => {
    expect(NOTIFICATIONS.categories.toolSubmission.events.Revoked.enabled).toBe(false);
  });

  it('falls back from event to category to default channel', () => {
    const config = testNotificationConfig();
    expect(resolveRoute(config, 'verify', 'Assigned')).toEqual({
      channelId: '100000000000000001',
      roleId: undefined,
    });
    expect(resolveRoute(config, 'tool', 'Update')?.channelId).toBe('100000000000000002');
    expect(resolveRoute(config, 'tool', 'UpdateFailed')).toEqual({
      channelId: '100000000000000003',
      roleId: '200000000000000001',
    });
  });

  it('returns null for a muted event', () => {
    expect(resolveRoute(testNotificationConfig(), 'toolSubmission', 'Revoked')).toBeNull();
  });

  it('routes VS Code releases to their channel, else the default', () => {
    const config = testNotificationConfig();
    expect(resolveVscodeChannel(config)).toBe('100000000000000004');
    config.categories.vscode = {};
    expect(resolveVscodeChannel(config)).toBe('100000000000000001');
  });
});

describe('createPptbEventEmbed', () => {
  it('shows the event, tool, developer, reason and subject', () => {
    const embed = createPptbEventEmbed(
      samplePptbEvent({
        category: 'verify',
        event: 'Rejected',
        actor: 'Admin',
        reason: 'Missing README',
        detail: { Version: '1.2.0' },
      } as never)
    ).toJSON();
    expect(embed.title).toBe('Verification rejected: FetchXML Builder');
    expect(embed.url).toBe('https://www.powerplatformtoolbox.com/tools/abc');
    expect(embed.color).toBe(0xed4245);
    expect(embed.description).toBe('Missing README');
    expect(embed.footer?.text).toBe('intake:abc-123');
    expect(embed.fields).toEqual([
      { name: 'Developer', value: 'Jane Dev', inline: true },
      { name: 'By', value: 'Admin', inline: true },
      { name: 'Version', value: '1.2.0', inline: true },
    ]);
  });
});

describe('verifyPptbSignature', () => {
  const now = 1_800_000_000;
  const ts = String(now);
  const body = '{"a":1}';

  it('accepts a fresh, correct signature', () => {
    expect(verifyPptbSignature('s', body, ts, signPptbEvent('s', ts, body), now)).toBe(true);
  });

  it('rejects a changed body or wrong secret', () => {
    expect(verifyPptbSignature('s', '{"a":2}', ts, signPptbEvent('s', ts, body), now)).toBe(false);
    expect(verifyPptbSignature('s', body, ts, signPptbEvent('x', ts, body), now)).toBe(false);
  });

  it('rejects a stale timestamp', () => {
    const old = String(now - 301);
    expect(verifyPptbSignature('s', body, old, signPptbEvent('s', old, body), now)).toBe(false);
  });

  it('rejects missing headers', () => {
    expect(verifyPptbSignature('s', body, undefined, undefined, now)).toBe(false);
  });
});

describe('PptbEventHandler', () => {
  let send: ReturnType<typeof vi.fn>;
  let handler: PptbEventHandler;

  beforeEach(() => {
    send = vi.fn().mockResolvedValue(undefined);
    fetchChannel.mockReset().mockResolvedValue({ type: ChannelType.GuildText, send });
    handler = new PptbEventHandler({} as Client, testNotificationConfig());
  });

  it('posts with a role ping that only that role can trigger', async () => {
    await expect(handler.handle(samplePptbEvent())).resolves.toBe('posted');
    expect(fetchChannel).toHaveBeenCalledWith(expect.anything(), '100000000000000001');
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '<@&200000000000000001>',
        allowedMentions: { parse: [], roles: ['200000000000000001'] },
      })
    );
  });

  it('posts without a ping when the event has no role', async () => {
    await handler.handle(samplePptbEvent({ id: 'other', event: 'Approved' } as never));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ content: undefined, allowedMentions: { parse: [], roles: [] } })
    );
  });

  it('ignores a repeated event id', async () => {
    await handler.handle(samplePptbEvent());
    await expect(handler.handle(samplePptbEvent())).resolves.toBe('duplicate');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('does not post a muted event', async () => {
    const result = await handler.handle(samplePptbEvent({ event: 'Revoked' } as never));
    expect(result).toBe('muted');
    expect(send).not.toHaveBeenCalled();
  });

  it('lets a failed post be retried', async () => {
    send.mockRejectedValueOnce(new Error('discord down'));
    await expect(handler.handle(samplePptbEvent())).rejects.toThrow('discord down');
    await expect(handler.handle(samplePptbEvent())).resolves.toBe('posted');
  });

  it('throws when the channel is not a text channel', async () => {
    fetchChannel.mockResolvedValueOnce({ type: ChannelType.GuildVoice });
    await expect(handler.handle(samplePptbEvent())).rejects.toThrow(/not a text channel/);
  });
});
