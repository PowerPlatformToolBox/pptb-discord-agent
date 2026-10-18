import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it, jest } from '@jest/globals';
import { waitUntil } from '@vercel/functions';
import {
  InteractionResponseType,
  MessageFlags,
  type APIInteractionResponseChannelMessageWithSource,
} from 'discord-api-types/v10';
import { handleGitHubWebhook } from '../src/app/githubWebhook';
import { handleHealth } from '../src/app/health';
import { handleInteraction } from '../src/app/interactions';
import { handlePlatformEvent } from '../src/app/platformEvents';
import { handleStarsCron } from '../src/app/starsCron';
import { COMMANDS, findCommand } from '../src/commands';
import { pingCommand } from '../src/commands/ping';
import { BOT_NAME, DISCORD_LIMITS, PPTB_LINKS } from '../src/config/constants';
import { getNotification } from '../src/notifications/catalog';
import { hmacSha256Hex } from '../src/security/signatures';
import { TEST_ENV, useTestEnv } from './testEnv';

interface FetchCall {
  url: string;
  method: string;
  body: unknown;
}

jest.mock('@vercel/functions', () => ({
  waitUntil: jest.fn<typeof waitUntil>(),
}));

function stubFetch(
  respond: (url: string, method: string) => { status?: number; body?: unknown } = () => ({
    body: { id: '1' },
  })
): FetchCall[] {
  const calls: FetchCall[] = [];
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const { status = 200, body = {} } = respond(url, method);
    return new Response(JSON.stringify(body), { status });
  });
  return calls;
}

function platformRequest(payload: unknown, secret = TEST_ENV.PLATFORM_EVENTS_SECRET!): Request {
  const body = JSON.stringify(payload);
  const ts = String(Math.floor(Date.now() / 1000));
  return new Request('http://localhost/api/events', {
    method: 'POST',
    headers: {
      'x-pptb-timestamp': ts,
      'x-pptb-signature': `sha256=${hmacSha256Hex(secret, `${ts}.${body}`)}`,
    },
    body,
  });
}

describe('POST /api/events', () => {
  useTestEnv();

  it('delivers a valid platform event', async () => {
    const calls = stubFetch();
    const data = getNotification('tool-submission.new').example;
    const response = await handlePlatformEvent(
      platformRequest({ type: 'tool-submission.new', id: 'evt-1', data })
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'sent' });
    expect(calls[0]?.url).toContain(`/channels/${TEST_ENV.DISCORD_CHANNEL_ADMIN}/messages`);
  });

  it('rejects a bad signature', async () => {
    stubFetch();
    const response = await handlePlatformEvent(
      platformRequest({ type: 'tool-submission.new', data: {} }, 'x'.repeat(32))
    );
    expect(response.status).toBe(401);
  });

  it('rejects unknown types and GitHub-only notifications', async () => {
    stubFetch();
    expect((await handlePlatformEvent(platformRequest({ type: 'nope', data: {} }))).status).toBe(
      400
    );
    const release = getNotification('pptb.new-release').example;
    expect(
      (await handlePlatformEvent(platformRequest({ type: 'pptb.new-release', data: release })))
        .status
    ).toBe(400);
  });

  it('returns 422 with issues for invalid data', async () => {
    stubFetch();
    const response = await handlePlatformEvent(
      platformRequest({ type: 'tool.update', data: { tool: { name: 'x' } } })
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toHaveProperty('issues');
  });

  it('returns 200 with status disabled when switched off', async () => {
    process.env.DISABLED_NOTIFICATIONS = 'tool-submission.*';
    const calls = stubFetch();
    const data = getNotification('tool-submission.new').example;
    const response = await handlePlatformEvent(
      platformRequest({ type: 'tool-submission.new', data })
    );
    expect(await response.json()).toMatchObject({ status: 'disabled' });
    expect(calls).toHaveLength(0);
  });

  it('returns 502 when Discord rejects the message', async () => {
    stubFetch(() => ({ status: 403, body: { message: 'Missing Access', code: 50001 } }));
    const data = getNotification('tool-submission.new').example;
    const response = await handlePlatformEvent(
      platformRequest({ type: 'tool-submission.new', data })
    );
    expect(response.status).toBe(502);
  });
});

function githubRequest(event: string, payload: unknown, secret = TEST_ENV.GITHUB_WEBHOOK_SECRET!) {
  const body = JSON.stringify(payload);
  return new Request('http://localhost/api/github', {
    method: 'POST',
    headers: {
      'x-github-event': event,
      'x-hub-signature-256': `sha256=${hmacSha256Hex(secret, body)}`,
    },
    body,
  });
}

describe('POST /api/github', () => {
  useTestEnv();

  const releasePayload = {
    action: 'published',
    repository: {
      name: 'desktop-app',
      full_name: 'PowerPlatformToolBox/desktop-app',
      html_url: 'https://github.com/PowerPlatformToolBox/desktop-app',
      owner: { login: 'PowerPlatformToolBox' },
    },
    release: {
      tag_name: 'v1.0.0',
      body: "## What's New\n- thing",
      html_url: 'https://github.com/PowerPlatformToolBox/desktop-app/releases/tag/v1.0.0',
      draft: false,
      prerelease: true,
    },
  };

  it('announces an insider release to the insider channel', async () => {
    const calls = stubFetch();
    const response = await handleGitHubWebhook(githubRequest('release', releasePayload));
    expect(response.status).toBe(200);
    expect(calls[0]?.url).toContain(`/channels/${TEST_ENV.DISCORD_CHANNEL_INSIDER}/messages`);
  });

  it('rejects an invalid signature', async () => {
    stubFetch();
    const response = await handleGitHubWebhook(githubRequest('release', releasePayload, 'bad'));
    expect(response.status).toBe(401);
  });

  it('returns 500 so GitHub records the failed delivery', async () => {
    stubFetch(() => ({ status: 500, body: {} }));
    const response = await handleGitHubWebhook(githubRequest('release', releasePayload));
    expect(response.status).toBe(500);
  });

  it('acknowledges events it does not handle', async () => {
    const calls = stubFetch();
    const response = await handleGitHubWebhook(githubRequest('ping', { zen: 'hi' }));
    expect(response.status).toBe(200);
    expect(calls).toHaveLength(0);
  });
});

describe('POST /api/interactions', () => {
  useTestEnv();
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyHex = publicKey
    .export({ format: 'der', type: 'spki' })
    .subarray(-32)
    .toString('hex');

  function interactionRequest(payload: unknown, tamper = false): Request {
    const body = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = sign(null, Buffer.from(timestamp + body), privateKey).toString('hex');
    return new Request('http://localhost/api/interactions', {
      method: 'POST',
      headers: { 'x-signature-ed25519': signature, 'x-signature-timestamp': timestamp },
      body: tamper ? `${body} ` : body,
    });
  }

  it('answers Discord PING with PONG', async () => {
    process.env.DISCORD_PUBLIC_KEY = publicKeyHex;
    const response = await handleInteraction(interactionRequest({ type: 1 }));
    expect(await response.json()).toEqual({ type: 1 });
  });

  it('rejects invalid signatures with 401', async () => {
    process.env.DISCORD_PUBLIC_KEY = publicKeyHex;
    const response = await handleInteraction(interactionRequest({ type: 1 }, true));
    expect(response.status).toBe(401);
  });

  it('replies to /ping', async () => {
    process.env.DISCORD_PUBLIC_KEY = publicKeyHex;
    const response = await handleInteraction(
      interactionRequest({
        type: 2,
        id: '1234567890123456789',
        token: 'tok',
        data: { type: 1, name: 'ping' },
      })
    );
    const body = (await response.json()) as { type: number; data: { content: string } };
    expect(body.type).toBe(4);
    expect(body.data.content).toContain('Pong');
  });

  it.each(['help', 'about'])(
    'replies to /%s privately without network or deferred work',
    async (name) => {
      process.env.DISCORD_PUBLIC_KEY = publicKeyHex;
      const calls = stubFetch();
      const response = await handleInteraction(
        interactionRequest({
          type: 2,
          id: '1234567890123456789',
          token: 'tok',
          data: { type: 1, name },
        })
      );
      const body = (await response.json()) as APIInteractionResponseChannelMessageWithSource;

      expect(response.status).toBe(200);
      expect(body.type).toBe(InteractionResponseType.ChannelMessageWithSource);
      expect(body.data?.flags).toBe(MessageFlags.Ephemeral);
      expect(body.data?.allowed_mentions).toEqual({ parse: [] });
      expect(body.data?.content).toContain(BOT_NAME);
      expect(body.data?.content).toContain('offline');
      expect(body.data?.content).toContain('Gateway connection');
      expect(body.data?.content).toContain('`/ping`');
      expect(body.data?.content?.length).toBeGreaterThan(0);
      expect(body.data?.content?.length).toBeLessThanOrEqual(DISCORD_LIMITS.MESSAGE_CONTENT);
      for (const url of Object.values(PPTB_LINKS)) {
        expect(body.data?.content).toContain(url);
      }
      expect(findCommand(name)?.definition.name).toBe(name);
      expect(waitUntil).not.toHaveBeenCalled();
      expect(calls).toHaveLength(0);
    }
  );

  it('builds /help from the current command registry, including updated descriptions', async () => {
    process.env.DISCORD_PUBLIC_KEY = publicKeyHex;
    jest.replaceProperty(
      pingCommand.definition,
      'description',
      'Check whether the webhook brain responds'
    );
    const response = await handleInteraction(
      interactionRequest({
        type: 2,
        id: '1234567890123456789',
        token: 'tok',
        data: { type: 1, name: 'help' },
      })
    );
    const body = (await response.json()) as APIInteractionResponseChannelMessageWithSource;
    const listedCommands = [...(body.data?.content ?? '').matchAll(/^- `\/([^`]+)` - (.+)$/gm)].map(
      (match) => [match[1], match[2]]
    );

    expect(listedCommands).toEqual(
      COMMANDS.map(({ definition }) => [definition.name, definition.description])
    );
    expect(new Set(COMMANDS.map(({ definition }) => definition.name)).size).toBe(COMMANDS.length);
  });

  it('explains /about without presenting the bot as a chatbot or online service', async () => {
    process.env.DISCORD_PUBLIC_KEY = publicKeyHex;
    const response = await handleInteraction(
      interactionRequest({
        type: 2,
        id: '1234567890123456789',
        token: 'tok',
        data: { type: 1, name: 'about' },
      })
    );
    const body = (await response.json()) as APIInteractionResponseChannelMessageWithSource;

    expect(body.data?.content).toContain('Unlike your last solution import');
    expect(body.data?.content).toContain('stateless Vercel Functions on the Hobby plan');
    expect(body.data?.content).toContain('Discord REST API');
    expect(body.data?.content).toContain('Not an AI chatbot');
    expect(body.data?.content).toContain('`/help`');
  });

  it.each(['help', 'about'])('rejects tampered /%s interactions before executing', async (name) => {
    process.env.DISCORD_PUBLIC_KEY = publicKeyHex;
    const calls = stubFetch();
    const response = await handleInteraction(
      interactionRequest(
        {
          type: 2,
          id: '1234567890123456789',
          token: 'tok',
          data: { type: 1, name },
        },
        true
      )
    );

    expect(response.status).toBe(401);
    expect(waitUntil).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });

  it('defers /create-issue and edits the reply with the result', async () => {
    process.env.DISCORD_PUBLIC_KEY = publicKeyHex;
    const calls = stubFetch((url) =>
      url.includes('api.github.com')
        ? {
            status: 201,
            body: {
              number: 5,
              title: 'T',
              html_url: 'https://github.com/PowerPlatformToolBox/desktop-app/issues/5',
            },
          }
        : { body: { id: 'm' } }
    );
    const response = await handleInteraction(
      interactionRequest({
        type: 2,
        id: '1234567890123456789',
        token: 'tok',
        member: { user: { id: '1', username: 'dev' } },
        data: {
          type: 1,
          name: 'create-issue',
          options: [
            { type: 3, name: 'repository', value: 'desktop-app' },
            { type: 3, name: 'title', value: 'T' },
            { type: 3, name: 'description', value: 'D' },
          ],
        },
      })
    );
    expect(((await response.json()) as { type: number }).type).toBe(5);

    expect(waitUntil).toHaveBeenCalledTimes(1);
    await jest.mocked(waitUntil).mock.calls[0]![0];
    expect(calls.some((c) => c.method === 'PATCH')).toBe(true);
    const github = calls.find((c) => c.url.includes('api.github.com'));
    expect(github?.url).toContain('/repos/PowerPlatformToolBox/desktop-app/issues');
    const edit = calls.find((c) => c.method === 'PATCH');
    expect(edit?.url).toContain(`/webhooks/${TEST_ENV.DISCORD_CLIENT_ID}/tok/messages/@original`);
  });
});

describe('GET /api/health and /api/cron/stars', () => {
  useTestEnv();

  it('reports ok with a valid configuration', async () => {
    const response = handleHealth();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'ok', bot: 'PPTB Agent' });
  });

  it('reports misconfigured without leaking details', async () => {
    process.env.DISCORD_BOT_TOKEN = '';
    const response = handleHealth();
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('DISCORD_BOT_TOKEN');
  });

  it('requires the cron secret', async () => {
    const response = await handleStarsCron(new Request('http://localhost/api/cron/stars'));
    expect(response.status).toBe(401);
  });

  it('syncs the star count', async () => {
    const calls = stubFetch((url, method) => {
      if (url.includes('api.github.com')) {
        return { body: { full_name: 'PowerPlatformToolBox/desktop-app', stargazers_count: 321 } };
      }
      return method === 'GET' ? { body: { id: 'c', name: '⭐ 300' } } : { body: {} };
    });
    const response = await handleStarsCron(
      new Request('http://localhost/api/cron/stars', {
        headers: { authorization: `Bearer ${TEST_ENV.CRON_SECRET}` },
      })
    );
    expect(response.status).toBe(200);
    const rename = calls.find((c) => c.method === 'PATCH');
    expect(rename?.body).toEqual({ name: '⭐ 321' });
  });
});
