/**
 * GitHub Projects v2 item webhook handler
 */

import { ChannelType, type Client, EmbedBuilder } from 'discord.js';
import { getLogger } from '../../../utils/logger';
import { loadWebhookConfig } from '../../../config/webhook';
import { CONSTANTS } from '../../../config/constants';
import type { GitHubWebhookPayload } from '../../../types/webhook';

export async function handleProjectItem(
  payload: GitHubWebhookPayload,
  client: Client
): Promise<void> {
  const logger = getLogger();
  const config = loadWebhookConfig();

  // Only handle 'labeled' action
  if (payload.action !== 'labeled') {
    return;
  }

  // Check if issue/PR has the discussion label
  const labels = payload.issue?.labels || [];
  const hasDiscussionLabel = labels.some(
    (label) => label.name === config.projectDiscussionLabel
  );

  if (!hasDiscussionLabel) {
    return;
  }

  try {
    const channel = await client.channels.fetch(config.projectThreadChannel);

    if (!channel || !channel.isTextBased() || channel.type !== ChannelType.GuildText) {
      logger.error('Invalid thread channel', { channelId: config.projectThreadChannel });
      return;
    }

    const item = payload.issue || payload.pull_request;
    if (!item) {
      logger.warn('No issue or PR in payload');
      return;
    }

    const itemType = payload.issue ? 'Issue' : 'PR';
    const threadName = `${itemType} #${item.number}: ${item.title}`.substring(0, 100);

    // Check if thread already exists
    const existingThreads = await channel.threads.fetchActive();
    const existingThread = existingThreads.threads.find((thread) =>
      thread.name.includes(`#${item.number}`)
    );

    if (existingThread) {
      logger.info('Thread already exists', { threadId: existingThread.id });
      return;
    }

    // Create embed for thread starter message
    const embed = new EmbedBuilder()
      .setTitle(`${itemType} #${item.number}: ${item.title}`)
      .setURL(item.html_url)
      .setDescription(item.body?.substring(0, 500) || 'No description provided')
      .setColor(CONSTANTS.DISCORD_COLORS.PRIMARY)
      .addFields(
        { name: 'Repository', value: payload.repository.full_name, inline: true },
        { name: 'Author', value: item.user.login, inline: true },
        {
          name: 'Labels',
          value: labels.map((l) => l.name).join(', ') || 'None',
          inline: false,
        }
      )
      .setThumbnail(item.user.avatar_url)
      .setTimestamp();

    // Create thread
    const thread = await channel.threads.create({
      name: threadName,
      autoArchiveDuration: 10080, // 7 days
      reason: `Discussion for ${itemType} #${item.number}`,
    });

    await thread.send({
      content: `Discussion thread for ${payload.repository.full_name} ${itemType} #${item.number}`,
      embeds: [embed],
    });

    logger.info('Created discussion thread', {
      threadId: thread.id,
      itemNumber: item.number,
      itemType,
    });
  } catch (error) {
    logger.error('Failed to create thread', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}