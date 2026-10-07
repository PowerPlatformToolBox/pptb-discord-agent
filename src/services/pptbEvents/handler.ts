/**
 * Posts PPTB events from pptb-web to Discord
 */

import { ChannelType, type Client } from 'discord.js';
import { resolveRoute, type NotificationConfig } from '../../config/notifications';
import type { PptbEvent } from '../../types/pptbEvents';
import { getChannelCache } from '../../utils/channelCache';
import { LoggerFactory } from '../../utils/logger';
import { createPptbEventEmbed } from './embed';

const SEEN_LIMIT = 1000;

export type PptbEventResult = 'posted' | 'duplicate' | 'muted';

export class PptbEventHandler {
  private readonly logger = LoggerFactory.forWebhook('PptbEvents');
  // Insertion-ordered, so the oldest ID is dropped first
  private readonly seen = new Set<string>();

  constructor(
    private readonly client: Client,
    private readonly config: NotificationConfig
  ) {}

  public async handle(event: PptbEvent): Promise<PptbEventResult> {
    if (this.seen.has(event.id)) {
      this.logger.info('Skipping duplicate PPTB event', { id: event.id });
      return 'duplicate';
    }

    const route = resolveRoute(this.config, event.category, event.event);
    if (!route) {
      this.logger.info('PPTB event is muted', { category: event.category, event: event.event });
      this.remember(event.id);
      return 'muted';
    }

    const channel = await getChannelCache().fetch(this.client, route.channelId);
    if (
      !channel ||
      (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
    ) {
      throw new Error(`Notification channel ${route.channelId} is missing or not a text channel`);
    }

    await channel.send({
      content: route.roleId ? `<@&${route.roleId}>` : undefined,
      embeds: [createPptbEventEmbed(event)],
      // Only the configured role may ping; text from pptb-web never can
      allowedMentions: { parse: [], roles: route.roleId ? [route.roleId] : [] },
    });

    this.remember(event.id);
    this.logger.info('Posted PPTB event', {
      id: event.id,
      category: event.category,
      event: event.event,
      channelId: route.channelId,
    });
    return 'posted';
  }

  private remember(id: string): void {
    this.seen.add(id);
    if (this.seen.size > SEEN_LIMIT) {
      const oldest = this.seen.values().next().value;
      if (oldest !== undefined) this.seen.delete(oldest);
    }
  }
}
