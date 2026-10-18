import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { createDevServer } from '../src/dev/server';

describe('local development server', () => {
  const server = createDevServer();
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it.each(['/', '/index.html'])('serves the public landing page at %s', async (path) => {
    const response = await fetch(`${baseUrl}${path}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(await response.text()).toBe(
      await readFile(resolve(__dirname, '../public/index.html'), 'utf8')
    );
  });

  it('keeps unknown paths as 404', async () => {
    const response = await fetch(`${baseUrl}/missing`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
  });

  it('rejects unsupported methods on the landing page', async () => {
    const response = await fetch(baseUrl, { method: 'POST' });
    expect(response.status).toBe(405);
  });

  it('preserves API route method handling', async () => {
    const response = await fetch(`${baseUrl}/api/events`);
    expect(response.status).toBe(405);
  });
});
