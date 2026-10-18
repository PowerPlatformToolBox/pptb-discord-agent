/**
 * Send a signed sample platform event to a running deployment (or `pnpm dev`).
 *
 *   pnpm send-test-event <notification-key|all> [base-url]
 *
 * Uses each notification's built-in example payload and PLATFORM_EVENTS_SECRET from the env.
 */

import { NOTIFICATIONS } from '../notifications/catalog';
import {
  hmacSha256Hex,
  PLATFORM_SIGNATURE_HEADER,
  PLATFORM_TIMESTAMP_HEADER,
} from '../security/signatures';

async function send(
  baseUrl: string,
  secret: string,
  type: string,
  data: unknown
): Promise<boolean> {
  const body = JSON.stringify({ type, id: `test-${Date.now()}`, data });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [PLATFORM_TIMESTAMP_HEADER]: timestamp,
      [PLATFORM_SIGNATURE_HEADER]: `sha256=${hmacSha256Hex(secret, `${timestamp}.${body}`)}`,
    },
    body,
  });
  console.log(`${type.padEnd(28)} ${response.status} ${await response.text()}`);
  return response.ok;
}

async function main(): Promise<void> {
  const [target, baseUrl = 'http://localhost:3000'] = process.argv.slice(2);
  const secret = process.env.PLATFORM_EVENTS_SECRET;
  const platform = NOTIFICATIONS.filter((n) => n.source === 'platform');

  if (!target || !secret) {
    console.error('Usage: pnpm send-test-event <notification-key|all> [base-url]');
    console.error('Requires PLATFORM_EVENTS_SECRET in the environment or .env');
    console.error(`Keys: ${platform.map((n) => n.key).join(', ')}`);
    process.exit(1);
  }

  const selected = target === 'all' ? platform : platform.filter((n) => n.key === target);
  if (selected.length === 0) {
    console.error(`Unknown or non-platform key "${target}"`);
    process.exit(1);
  }

  let ok = true;
  for (const notification of selected) {
    ok = (await send(baseUrl, secret, notification.key, notification.example)) && ok;
  }
  process.exit(ok ? 0 : 1);
}

void main();
