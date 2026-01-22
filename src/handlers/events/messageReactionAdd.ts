/**
 * Message reaction add event handler
 */

import { ChannelType, Events, type MessageReaction, type TextChannel, type User } from 'discord.js';
import { getConfig } from '../../config/config';
import type { MessageReactionAddEvent } from '../../types';
import { getChannelCache } from '../../utils/channelCache';
import { createErrorEmbed, createMessageLogEmbed } from '../../utils/embedBuilder';
import { getLogger } from '../../utils/logger';

export const messageReactionAddEvent: MessageReactionAddEvent = {
  name: Events.MessageReactionAdd,
  async execute(reaction: MessageReaction, user: User): Promise<void> {
    const logger = getLogger();
    const config = getConfig();

    try {
      if (user.bot) {
        return;
      }

      if (reaction.partial) {
        try {
          await reaction.fetch();
        } catch (error) {
          logger.error('Failed to fetch partial reaction', { error });
          return;
        }
      }

      const message = reaction.message;
      if (message.partial) {
        try {
          await message.fetch();
        } catch (error) {
          logger.error('Failed to fetch partial message', { error });
          return;
        }
      }

      if (reaction.emoji.name !== config.reaction.logEmoji) {
        return;
      }

      if (!message.guild) {
        logger.warn('Message reaction in DM, skipping', { userId: user.id });
        return;
      }

      const channelCache = getChannelCache();
      const logChannel = await channelCache.fetch(message.client, config.logging.channelId);
      if (!logChannel) {
        logger.error('Log channel not found', { channelId: config.logging.channelId });
        return;
      }

      if (!logChannel.isTextBased()) {
        logger.error('Log channel is not text-based', { channelId: config.logging.channelId });
        return;
      }

      // Ensure message is fully fetched (not partial)
      const fullMessage = message.partial ? await message.fetch() : message;
      const embed = createMessageLogEmbed(fullMessage, reaction, user);
      await (logChannel as TextChannel).send({ embeds: [embed] });

      logger.info('Message logged successfully', {
        messageId: message.id,
        userId: user.id,
        channelId: message.channel.id,
      });
    } catch (error) {
      logger.error('Error in messageReactionAdd handler', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      try {
        const errorEmbed = createErrorEmbed(
          'Logging Error',
          'Failed to log message. Please check bot permissions and configuration.'
        );

        const channel = reaction.message.channel;
        if (
          channel.type === ChannelType.GuildText ||
          channel.type === ChannelType.DM ||
          channel.type === ChannelType.GuildAnnouncement
        ) {
          await channel.send({ embeds: [errorEmbed] });
        }
      } catch (sendError) {
        logger.error('Failed to send error message', { error: sendError });
      }
    }
  },
};
