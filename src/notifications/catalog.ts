/**
 * Notification catalogue: the single registry of every notification the bot can send.
 *
 * To add a notification: define it in `events/<category>.ts` with `defineNotification`, then add
 * it to the list below. To disable one: set `enabled: false` in its definition, or list its key
 * in the DISABLED_NOTIFICATIONS environment variable (no code change needed).
 */

import { GITHUB_NOTIFICATIONS } from './events/github';
import { RELEASE_NOTIFICATIONS } from './events/releases';
import { TOOL_NOTIFICATIONS } from './events/tool';
import { TOOL_SUBMISSION_NOTIFICATIONS } from './events/toolSubmission';
import { VERIFY_NOTIFICATIONS } from './events/verify';
import type { Notification } from './types';

export const NOTIFICATIONS = [
  ...TOOL_SUBMISSION_NOTIFICATIONS,
  ...TOOL_NOTIFICATIONS,
  ...VERIFY_NOTIFICATIONS,
  ...RELEASE_NOTIFICATIONS,
  ...GITHUB_NOTIFICATIONS,
] as const;

export type NotificationKey = (typeof NOTIFICATIONS)[number]['key'];

const byKey = new Map<string, Notification<NotificationKey>>();
for (const notification of NOTIFICATIONS) {
  if (byKey.has(notification.key)) {
    throw new Error(`Duplicate notification key: ${notification.key}`);
  }
  byKey.set(notification.key, notification);
}

export function findNotification(key: string): Notification<NotificationKey> | undefined {
  return byKey.get(key);
}

export function getNotification(key: NotificationKey): Notification<NotificationKey> {
  const notification = byKey.get(key);
  if (!notification) throw new Error(`Unknown notification key: ${key}`);
  return notification;
}
