import { describe, expect, it, jest } from '@jest/globals';
import { ZodError } from 'zod';
import { loadConfig } from '../src/config/config';
import type { DiscordRestClient } from '../src/discord/rest';
import { getNotification } from '../src/notifications/catalog';
import { dispatch, type DispatchDeps } from '../src/notifications/dispatcher';
import { DiscordRateLimitError } from '../src/types/errors';
import { TEST_ENV, useTestEnv } from './testEnv';

type RestMethod = (...args: unknown[]) => Promise<unknown>;
type MockFn = ReturnType<typeof jest.fn<RestMethod>>;
type MockRest = Record<
  | 'sendMessage'
  | 'startThread'
  | 'listThreads'
  | 'listGuildMembers'
  | 'addThreadMember'
  | 'getChannel'
  | 'renameChannel',
  MockFn
>;

function mockRest(overrides: Partial<MockRest> = {}): MockRest {
  return {
    sendMessage: jest.fn<RestMethod>().mockResolvedValue({ id: 'm1' }),
    startThread: jest.fn<RestMethod>().mockResolvedValue({ id: 't1' }),
    listThreads: jest.fn<RestMethod>().mockResolvedValue([]),
    listGuildMembers: jest.fn<RestMethod>().mockResolvedValue([]),
    addThreadMember: jest.fn<RestMethod>().mockResolvedValue(undefined),
    getChannel: jest.fn<RestMethod>().mockResolvedValue({ id: 'c1', name: '⭐ 1' }),
    renameChannel: jest.fn<RestMethod>().mockResolvedValue({}),
    ...overrides,
  };
}

function deps(rest: MockRest): DispatchDeps {
  return { config: loadConfig(), rest: rest as unknown as DiscordRestClient };
}

describe('dispatch', () => {
  useTestEnv();

  it('sends a message to the default channel with mentions disabled', async () => {
    const rest = mockRest();
    const input = getNotification('verify.approved').example;
    const result = await dispatch('verify.approved', input, deps(rest));

    expect(result).toEqual({
      key: 'verify.approved',
      status: 'sent',
      channelId: TEST_ENV.DISCORD_CHANNEL_TOOLS,
    });
    const [channelId, body] = rest.sendMessage.mock.calls[0] as [string, Record<string, unknown>];
    expect(channelId).toBe(TEST_ENV.DISCORD_CHANNEL_TOOLS);
    expect(body.allowed_mentions).toEqual({ parse: [] });
  });

  it('skips disabled notifications without calling Discord', async () => {
    process.env.DISABLED_NOTIFICATIONS = 'verify.*';
    const rest = mockRest();
    const result = await dispatch(
      'verify.approved',
      getNotification('verify.approved').example,
      deps(rest)
    );
    expect(result.status).toBe('disabled');
    expect(rest.sendMessage).not.toHaveBeenCalled();
  });

  it('throws ZodError for invalid input', async () => {
    await expect(dispatch('tool.update', { tool: {} }, deps(mockRest()))).rejects.toBeInstanceOf(
      ZodError
    );
  });

  it('creates a discussion thread once per repo and number', async () => {
    const example = getNotification('github.discussion-thread').example;
    const rest = mockRest();
    expect((await dispatch('github.discussion-thread', example, deps(rest))).status).toBe('sent');
    expect(rest.startThread).toHaveBeenCalledWith(
      TEST_ENV.DISCORD_CHANNEL_DISCUSSIONS,
      '[desktop-app#42] Add dark mode toggle'
    );
    expect(rest.sendMessage).toHaveBeenCalledWith('t1', expect.any(Object));

    const existing = mockRest({
      listThreads: jest
        .fn<RestMethod>()
        .mockResolvedValue([{ id: 'x', name: '[desktop-app#42] Old title' }]),
    });
    const second = await dispatch('github.discussion-thread', example, deps(existing));
    expect(second).toMatchObject({ status: 'skipped', reason: 'thread-exists' });
    expect(existing.startThread).not.toHaveBeenCalled();
  });

  it('does not treat the same number in another repo as a duplicate', async () => {
    const rest = mockRest({
      listThreads: jest
        .fn<RestMethod>()
        .mockResolvedValue([{ id: 'x', name: '[pptb-web#42] Other' }]),
    });
    const example = getNotification('github.discussion-thread').example;
    expect((await dispatch('github.discussion-thread', example, deps(rest))).status).toBe('sent');
  });

  it('adds members with configured roles to new discussion threads', async () => {
    process.env.DISCUSSION_THREAD_ROLE_IDS = '200000000000000001, 200000000000000002';
    const rest = mockRest({
      listGuildMembers: jest.fn<RestMethod>().mockResolvedValue([
        { user: { id: '300000000000000001' }, roles: ['200000000000000001'] },
        { user: { id: '300000000000000002' }, roles: ['200000000000000099'] },
        {
          user: { id: '300000000000000003' },
          roles: ['200000000000000001', '200000000000000002'],
        },
      ]),
    });

    const result = await dispatch(
      'github.discussion-thread',
      getNotification('github.discussion-thread').example,
      deps(rest)
    );

    expect(result.status).toBe('sent');
    expect(rest.listGuildMembers).toHaveBeenCalledWith(TEST_ENV.DISCORD_GUILD_ID);
    expect(rest.addThreadMember.mock.calls).toEqual([
      ['t1', '300000000000000001'],
      ['t1', '300000000000000003'],
    ]);
  });

  it('renames the stars channel and skips when unchanged or rate limited', async () => {
    const rest = mockRest();
    const sent = await dispatch('github.stars', { repository: 'o/r', stars: 5 }, deps(rest));
    expect(sent.status).toBe('sent');
    expect(rest.renameChannel).toHaveBeenCalledWith(TEST_ENV.DISCORD_CHANNEL_STARS, '⭐ 5');

    const unchanged = await dispatch('github.stars', { repository: 'o/r', stars: 1 }, deps(rest));
    expect(unchanged).toMatchObject({ status: 'skipped', reason: 'unchanged' });

    const limited = mockRest({
      renameChannel: jest
        .fn<RestMethod>()
        .mockRejectedValue(new DiscordRateLimitError('limited', 300)),
    });
    const skipped = await dispatch('github.stars', { repository: 'o/r', stars: 9 }, deps(limited));
    expect(skipped).toMatchObject({ status: 'skipped', reason: 'rate-limited' });
  });
});
