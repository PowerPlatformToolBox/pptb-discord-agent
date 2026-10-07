import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitHubWebhookPayload } from '../types/webhook';
import { TEST_ENV } from './testEnv';

const BASE = `http://127.0.0.1:${TEST_ENV.WEBHOOK_PORT}`;
const sign = (body: string): string =>
  'sha256=' + createHmac('sha256', TEST_ENV.WEBHOOK_SECRET).update(body).digest('hex');

type Server = { start(): void; stop(): void };

describe('WebhookServer', () => {
  let server: Server;
  let handler: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    for (const [key, value] of Object.entries(TEST_ENV)) vi.stubEnv(key, value);
    vi.resetModules();
    const { loadConfig } = await import('../config/config');
    loadConfig();
    const { WebhookServer } = await import('../services/webhook/webhookServer');
    handler = vi.fn().mockResolvedValue(undefined);
    server = new WebhookServer(
      new Map([['star', handler as (payload: GitHubWebhookPayload) => Promise<void>]])
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
});
