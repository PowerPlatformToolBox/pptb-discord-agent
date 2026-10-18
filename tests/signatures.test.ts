import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from '@jest/globals';
import {
  hmacSha256Hex,
  verifyBearer,
  verifyDiscordSignature,
  verifyGitHubSignature,
  verifyPlatformSignature,
} from '../src/security/signatures';

describe('verifyGitHubSignature', () => {
  const body = '{"zen":"hi"}';
  const signature = `sha256=${hmacSha256Hex('secret', body)}`;

  it('accepts a valid signature', () => {
    expect(verifyGitHubSignature('secret', body, signature)).toBe(true);
  });

  it('rejects a missing, wrong or tampered signature', () => {
    expect(verifyGitHubSignature('secret', body, null)).toBe(false);
    expect(verifyGitHubSignature('other', body, signature)).toBe(false);
    expect(verifyGitHubSignature('secret', `${body} `, signature)).toBe(false);
  });
});

describe('verifyPlatformSignature', () => {
  const body = '{"type":"tool.update"}';
  const now = 1_700_000_000;
  const sig = (ts: number): string => `sha256=${hmacSha256Hex('secret', `${ts}.${body}`)}`;

  it('accepts a fresh, valid signature', () => {
    expect(verifyPlatformSignature('secret', body, sig(now), String(now), now)).toBe(true);
  });

  it('rejects stale timestamps (replay protection)', () => {
    const old = now - 301;
    expect(verifyPlatformSignature('secret', body, sig(old), String(old), now)).toBe(false);
  });

  it('rejects a signature for a different timestamp', () => {
    expect(verifyPlatformSignature('secret', body, sig(now), String(now + 1), now + 1)).toBe(false);
  });

  it('rejects missing or malformed headers', () => {
    expect(verifyPlatformSignature('secret', body, null, String(now), now)).toBe(false);
    expect(verifyPlatformSignature('secret', body, sig(now), 'abc', now)).toBe(false);
  });
});

describe('verifyDiscordSignature', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyHex = publicKey
    .export({ format: 'der', type: 'spki' })
    .subarray(-32)
    .toString('hex');
  const body = '{"type":1}';
  const timestamp = '1700000000';
  const signature = sign(null, Buffer.from(timestamp + body), privateKey).toString('hex');

  it('accepts a valid Ed25519 signature', () => {
    expect(verifyDiscordSignature(publicKeyHex, body, signature, timestamp)).toBe(true);
  });

  it('rejects tampered bodies, wrong keys and garbage', () => {
    expect(verifyDiscordSignature(publicKeyHex, '{"type":2}', signature, timestamp)).toBe(false);
    expect(verifyDiscordSignature('b'.repeat(64), body, signature, timestamp)).toBe(false);
    expect(verifyDiscordSignature(publicKeyHex, body, 'zz', timestamp)).toBe(false);
    expect(verifyDiscordSignature(publicKeyHex, body, null, timestamp)).toBe(false);
  });
});

describe('verifyBearer', () => {
  it('matches only the exact bearer token', () => {
    expect(verifyBearer('s3cret', 'Bearer s3cret')).toBe(true);
    expect(verifyBearer('s3cret', 'Bearer wrong')).toBe(false);
    expect(verifyBearer('s3cret', null)).toBe(false);
  });
});
