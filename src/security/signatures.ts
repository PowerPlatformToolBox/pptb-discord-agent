/**
 * Request signature verification for every inbound source
 */

import { createHmac, createPublicKey, timingSafeEqual, verify } from 'node:crypto';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * GitHub webhooks: `X-Hub-Signature-256: sha256=<hex hmac of raw body>`
 */
export function verifyGitHubSignature(
  secret: string,
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) return false;
  return safeEqual(signature, `sha256=${hmacSha256Hex(secret, rawBody)}`);
}

export const PLATFORM_SIGNATURE_HEADER = 'x-pptb-signature';
export const PLATFORM_TIMESTAMP_HEADER = 'x-pptb-timestamp';
export const PLATFORM_MAX_SKEW_SECONDS = 300;

/**
 * PPTB platform events: `X-PPTB-Timestamp: <unix seconds>` and
 * `X-PPTB-Signature: sha256=<hex hmac of "<timestamp>.<raw body>">`. Timestamp blocks replays.
 */
export function verifyPlatformSignature(
  secret: string,
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!signature || !timestamp || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > PLATFORM_MAX_SKEW_SECONDS) return false;
  return safeEqual(signature, `sha256=${hmacSha256Hex(secret, `${timestamp}.${rawBody}`)}`);
}

// DER prefix for an Ed25519 SubjectPublicKeyInfo; the raw 32-byte key is appended.
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

/**
 * Discord interactions: Ed25519 signature over `<timestamp><raw body>`.
 */
export function verifyDiscordSignature(
  publicKeyHex: string,
  rawBody: string,
  signature: string | null,
  timestamp: string | null
): boolean {
  if (!signature || !timestamp || !/^[0-9a-f]{128}$/i.test(signature)) return false;
  try {
    const key = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, 'hex')]),
      format: 'der',
      type: 'spki',
    });
    return verify(null, Buffer.from(timestamp + rawBody), key, Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Vercel cron: `Authorization: Bearer <CRON_SECRET>`
 */
export function verifyBearer(secret: string, header: string | null): boolean {
  return !!header && safeEqual(header, `Bearer ${secret}`);
}
