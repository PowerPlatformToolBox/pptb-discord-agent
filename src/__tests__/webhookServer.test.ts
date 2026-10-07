import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { signPptbEvent } from '../services/webhook/pptbSignature';
import type { PptbEventListener } from '../services/webhook/webhookServer';
import type { GitHubWebhookPayload } from '../types/webhook';
import { samplePptbEvent } from './pptbFixtures';
import { TEST_ENV } from './testEnv';

const BASE = `http://127.0.0.1:${TEST_ENV.WEBHOOK_PORT}`;
const sign = (body: string): string =>
  'sha256=' + createHmac('sha256', TEST_ENV.WEBHOOK_SECRET).update(body).digest('hex');

type Server = { start(): void; stop(): void };

describe('WebhookServer', () => {
  let server: Server;
  let handler: ReturnType<typeof vi.fn>;
  let pptbListener: Mock<PptbEventListener>;

  beforeEach(async () => {
    for (const [key, value] of Object.entries(TEST_ENV)) vi.stubEnv(key, value);
    vi.resetModules();
    const { loadConfig } = await import('../config/config');
    loadConfig();
    const { WebhookServer } = await import('../services/webhook/webhookServer');
    handler = vi.fn().mockResolvedValue(undefined);
    pptbListener = vi.fn<PptbEventListener>().mockResolvedValue('posted');
    server = new WebhookServer(
      new Map([['star', handler as (payload: GitHubWebhookPayload) => Promise<void>]]),
      pptbListener
    );
    server.start();
    // wait until the port accepts connections
    for (let i = 0; i < 50; i++) {
      try {
        await fetch(`${BASE}/health`);
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 20));
      }
    }
  });

  afterEach(() => {
    server?.stop();
    vi.unstubAllEnvs();
  });

  it('answers the health check', async () => {
    const res = await fetch(`${BASE}/health`);
    expect(res.status).toBe(200);
  });

  it('rejects non-POST requests other than health', async () => {
    const res = await fetch(`${BASE}/`, { method: 'PUT' });
    expect(res.status).toBe(405);
  });

  it('rejects a missing or wrong signature', async () => {
    const body = JSON.stringify({ action: 'created' });
    const missing = await fetch(BASE, { method: 'POST', body });
    expect(missing.status).toBe(401);
    const wrong = await fetch(BASE, {
      method: 'POST',
      body,
      headers: { 'x-hub-signature-256': 'sha256=deadbeef', 'x-github-event': 'star' },
    });
    expect(wrong.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('dispatches a correctly signed event to its handler', async () => {
    const body = JSON.stringify({ action: 'created' });
    const res = await fetch(BASE, {
      method: 'POST',
      body,
      headers: { 'x-hub-signature-256': sign(body), 'x-github-event': 'star' },
    });
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledWith({ action: 'created' });
  });

  it('returns 500 when the handler throws', async () => {
    handler.mockRejectedValueOnce(new Error('nope'));
    const body = JSON.stringify({ action: 'created' });
    const res = await fetch(BASE, {
      method: 'POST',
      body,
      headers: { 'x-hub-signature-256': sign(body), 'x-github-event': 'star' },
    });
    expect(res.status).toBe(500);
  });

  describe('POST /pptb-events', () => {
    const postEvent = (body: string, headers: Record<string, string> = {}): Promise<Response> =>
      fetch(`${BASE}/pptb-events`, { method: 'POST', body, headers });
    const signedHeaders = (body: string): Record<string, string> => {
      const timestamp = String(Math.floor(Date.now() / 1000));
      return {
        'x-pptb-timestamp': timestamp,
        'x-pptb-signature': signPptbEvent(TEST_ENV.PPTB_EVENTS_SECRET, timestamp, body),
      };
    };

    it('rejects an unsigned event', async () => {
      const res = await postEvent(JSON.stringify(samplePptbEvent()));
      expect(res.status).toBe(401);
      expect(pptbListener).not.toHaveBeenCalled();
    });

    it('rejects an event signed with the GitHub webhook secret', async () => {
      const body = JSON.stringify(samplePptbEvent());
      const timestamp = String(Math.floor(Date.now() / 1000));
      const res = await postEvent(body, {
        'x-pptb-timestamp': timestamp,
        'x-pptb-signature': signPptbEvent(TEST_ENV.WEBHOOK_SECRET, timestamp, body),
      });
      expect(res.status).toBe(401);
    });

    it('rejects a signed event with an invalid payload', async () => {
      const body = JSON.stringify({ ...samplePptbEvent(), event: 'Verified' });
      const res = await postEvent(body, signedHeaders(body));
      expect(res.status).toBe(400);
      expect(pptbListener).not.toHaveBeenCalled();
    });

    it('passes a valid signed event to the listener', async () => {
      const event = samplePptbEvent();
      const body = JSON.stringify(event);
      const res = await postEvent(body, signedHeaders(body));
      expect(res.status).toBe(200);
      expect(pptbListener).toHaveBeenCalledWith(event);
    });

    it('returns 500 when posting to Discord fails', async () => {
      pptbListener.mockRejectedValueOnce(new Error('discord down'));
      const body = JSON.stringify(samplePptbEvent());
      const res = await postEvent(body, signedHeaders(body));
      expect(res.status).toBe(500);
    });
  });
});
