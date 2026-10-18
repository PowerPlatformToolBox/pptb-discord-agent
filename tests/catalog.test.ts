import { describe, expect, it } from '@jest/globals';
import { DISCORD_LIMITS } from '../src/config/constants';
import { NOTIFICATIONS, findNotification } from '../src/notifications/catalog';
import { CHANNEL_ALIASES } from '../src/notifications/channels';
import type { MessagePayload } from '../src/discord/format';
import type { Delivery } from '../src/notifications/types';

// The catalogue requested for the PPTB Discord server; every row must exist.
const REQUIRED_EVENTS: Array<[string, string]> = [
  ['Tool Submission', 'New'],
  ['Tool Submission', 'Approved'],
  ['Tool Submission', 'Rejected'],
  ['Tool Submission', 'Revoked'],
  ['Tool', 'UpdateCategories'],
  ['Tool', 'Deprecated'],
  ['Tool', 'Deleted'],
  ['Tool', 'Update'],
  ['Tool', 'ManualUpdate'],
  ['Tool', 'UpdateFailed'],
  ['Verify', 'Requested'],
  ['Verify', 'Assigned'],
  ['Verify', 'Approved'],
  ['Verify', 'Rejected'],
  ['Verify', 'Revoked'],
  ['PPTB', 'NewRelease'],
  ['PPTB', 'Insider'],
  ['VSCODE', 'NewRelease'],
];

function messageOf(delivery: Delivery): MessagePayload | undefined {
  return delivery.kind === 'channel-name' ? undefined : delivery.message;
}

describe('notification catalog', () => {
  it('covers every catalogue event', () => {
    const present = NOTIFICATIONS.map((n) => `${n.category}/${n.event}`);
    for (const [category, event] of REQUIRED_EVENTS) {
      expect(present).toContain(`${category}/${event}`);
    }
  });

  it('uses unique, well-formed keys and known channels', () => {
    const keys = NOTIFICATIONS.map((n) => n.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const n of NOTIFICATIONS) {
      expect(n.key).toMatch(/^[a-z]+(-[a-z]+)*\.[a-z]+(-[a-z]+)*$/);
      expect(CHANNEL_ALIASES).toContain(n.channel);
      expect(findNotification(n.key)).toBe(n);
    }
  });

  it.each(NOTIFICATIONS.map((n) => [n.key, n] as const))('%s builds its example', (_key, n) => {
    const delivery = n.build(n.example);
    expect(delivery.kind).toBeDefined();
    const message = messageOf(delivery);
    if (message) {
      expect(message.content || message.embeds?.length).toBeTruthy();
      expect((message.content ?? '').length).toBeLessThanOrEqual(DISCORD_LIMITS.MESSAGE_CONTENT);
    }
  });

  it.each(NOTIFICATIONS.map((n) => [n.key, n] as const))('%s rejects empty input', (_key, n) => {
    expect(() => n.build({})).toThrow();
  });
});
