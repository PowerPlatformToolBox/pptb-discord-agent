/**
 * Signature check for PPTB events.
 *
 * pptb-web sends:
 *   x-pptb-timestamp: unix seconds
 *   x-pptb-signature: sha256=<hex HMAC-SHA256 of `${timestamp}.${rawBody}` with PPTB_EVENTS_SECRET>
 * Signing the timestamp lets old requests be rejected, so a captured request can't be replayed.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export const PPTB_SIGNATURE_HEADER = 'x-pptb-signature';
export const PPTB_TIMESTAMP_HEADER = 'x-pptb-timestamp';
export const PPTB_MAX_SKEW_SECONDS = 300;

export function signPptbEvent(secret: string, timestamp: string, body: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

export function verifyPptbSignature(
  secret: string,
  body: string,
  timestamp: string | undefined,
  signature: string | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) {
    return false;
  }
  if (Math.abs(nowSeconds - Number(timestamp)) > PPTB_MAX_SKEW_SECONDS) {
    return false;
  }
  const expected = Buffer.from(signPptbEvent(secret, timestamp, body));
  const actual = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
