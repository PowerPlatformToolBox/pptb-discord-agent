/**
 * Validates, renders and delivers notifications to Discord
 */

import type { AppConfig } from '../config/config';
import { loadConfig } from '../config/config';
import { DISCORD_LIMITS } from '../config/constants';
import { clampMessage, truncate, type MessagePayload } from '../discord/format';
import { getDiscordRest, type DiscordRestClient } from '../discord/rest';
import { DiscordRateLimitError } from '../types/errors';
import { getLogger } from '../utils/logger';
import { getNotification, type NotificationKey } from './catalog';
import { isNotificationEnabled, resolveChannelId } from './settings';

export type DispatchStatus = 'sent' | 'disabled' | 'skipped';

export interface DispatchResult {
  key: NotificationKey;
  status: DispatchStatus;
  channelId?: string;
  reason?: string;
}

export interface DispatchDeps {
  config: AppConfig;
  rest: DiscordRestClient;
}

const logger = getLogger('Dispatcher');

function defaultDeps(): DispatchDeps {
  return { config: loadConfig(), rest: getDiscordRest() };
}

function toBody(message: MessagePayload): MessagePayload & { allowed_mentions: { parse: [] } } {
  // Never ping anyone from untrusted payload text (@everyone, roles, users).
  return { ...clampMessage(message), allowed_mentions: { parse: [] } };
}

/**
 * Send a notification. Throws ZodError for invalid input and DiscordAPIError on delivery failure.
 */
export async function dispatch(
  key: NotificationKey,
  input: unknown,
  deps: DispatchDeps = defaultDeps()
): Promise<DispatchResult> {
  const { config, rest } = deps;
  const notification = getNotification(key);

  if (!isNotificationEnabled(notification, config)) {
    logger.info('Notification disabled, skipping', { key });
    return { key, status: 'disabled' };
  }

  const delivery = notification.build(input);
  const channelId = resolveChannelId(notification, config);

  switch (delivery.kind) {
    case 'message': {
      await rest.sendMessage(channelId, toBody(delivery.message));
      logger.info('Notification sent', { key, channelId });
      return { key, status: 'sent', channelId };
    }

    case 'thread': {
      const threads = await rest.listThreads(config.discord.guildId, channelId);
      const existing = threads.find((thread) => thread.name?.startsWith(delivery.dedupeKey));
      if (existing) {
        logger.info('Thread already exists', { key, threadId: existing.id });
        return { key, status: 'skipped', channelId, reason: 'thread-exists' };
      }
      const thread = await rest.startThread(
        channelId,
        truncate(delivery.threadName, DISCORD_LIMITS.THREAD_NAME)
      );
      await rest.sendMessage(thread.id, toBody(delivery.message));
      logger.info('Thread created', { key, channelId, threadId: thread.id });
      return { key, status: 'sent', channelId };
    }

    case 'channel-name': {
      const channel = await rest.getChannel(channelId);
      if ('name' in channel && channel.name === delivery.name) {
        return { key, status: 'skipped', channelId, reason: 'unchanged' };
      }
      try {
        await rest.renameChannel(channelId, delivery.name);
      } catch (error) {
        // Renames are limited to ~2 per 10 minutes; the next event or the daily cron catches up.
        if (error instanceof DiscordRateLimitError) {
          logger.warn('Channel rename rate limited', {
            key,
            channelId,
            retryAfter: error.retryAfterSeconds,
          });
          return { key, status: 'skipped', channelId, reason: 'rate-limited' };
        }
        throw error;
      }
      logger.info('Channel renamed', { key, channelId, name: delivery.name });
      return { key, status: 'sent', channelId };
    }
  }
}
