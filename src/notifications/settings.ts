/**
 * Runtime switches and routing for notifications
 */

import type { AppConfig } from '../config/config';
import { ConfigurationError } from '../types/errors';
import { isChannelAlias } from './channels';
import type { Notification } from './types';

/**
 * Enabled when the definition is enabled and DISABLED_NOTIFICATIONS does not list the key,
 * its category prefix (`verify.*`) or `*`.
 */
export function isNotificationEnabled(notification: Notification, config: AppConfig): boolean {
  if (!notification.enabled) return false;
  const disabled = config.notifications.disabled;
  const prefix = `${notification.key.split('.')[0]}.*`;
  return (
    !disabled.includes('*') && !disabled.includes(prefix) && !disabled.includes(notification.key)
  );
}

/**
 * Resolve the Discord channel ID: NOTIFICATION_ROUTES override (alias or raw ID), else the
 * definition's default alias.
 */
export function resolveChannelId(notification: Notification, config: AppConfig): string {
  const target = config.notifications.routes[notification.key] ?? notification.channel;
  if (isChannelAlias(target)) return config.discord.channels[target];
  if (/^\d{17,20}$/.test(target)) return target;
  throw new ConfigurationError(
    `Invalid route "${target}" for ${notification.key}: use a channel alias or a channel ID`
  );
}
