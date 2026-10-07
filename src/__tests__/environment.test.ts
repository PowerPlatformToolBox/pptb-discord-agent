import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_ENV } from './testEnv';

async function loadValidate(): Promise<() => unknown> {
  vi.resetModules();
  const mod = await import('../config/environment');
  return mod.validateEnvironment;
}

describe('validateEnvironment', () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries(TEST_ENV)) vi.stubEnv(key, value);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts a complete environment and coerces the port', async () => {
    const validate = await loadValidate();
    expect(validate()).toMatchObject({ WEBHOOK_PORT: 38123, NODE_ENV: 'test' });
  });

  it('names the missing variable', async () => {
    vi.stubEnv('GITHUB_TOKEN', '');
    const validate = await loadValidate();
    expect(() => validate()).toThrow(/GITHUB_TOKEN/);
  });

  it('rejects an invalid LOG_LEVEL', async () => {
    vi.stubEnv('LOG_LEVEL', 'verbose');
    const validate = await loadValidate();
    expect(() => validate()).toThrow(/LOG_LEVEL/);
  });
});
