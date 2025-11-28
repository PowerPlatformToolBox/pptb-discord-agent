/**
 * GitHub release webhook handler
 */

import { type Client, EmbedBuilder } from 'discord.js';
import { getLogger } from '../../../utils/logger';
import { loadWebhookConfig } from '../../../config/webhook';
import { CONSTANTS } from '../../../config/constants';
import type { GitHubWebhookPayload } from '../../../types/webhook';

export async function handleRelease(
  payload: GitHubWebhookPayload,
  client: Client
): Promise<void> {
  const logger = getLogger();
  const config = loadWebhookConfig();

  // Only handle published releases (not drafts or pre-releases)
  if (payload.action !== 'published' || !payload.release) {
    return;
  }

  const release = payload.release;

  // Skip pre-releases and drafts
  if (release.draft || release.prerelease) {
    logger.debug('Skipping draft or pre-release', { tag: release.tag_name });
    return;
  }

  // Only notify for desktop-app releases
  if (payload.repository.name !== 'desktop-app') {
    logger.debug('Skipping non-desktop-app release', { repo: payload.repository.name });
    return;
  }

  try {
    const channel = await client.channels.fetch(config.releaseAnnouncementChannel);

    if (!channel || !channel.isTextBased()) {
      logger.error('Invalid release channel', { channelId: config.releaseAnnouncementChannel });
      return;
    }

    // Create embed for release announcement
    const embed = new EmbedBuilder()
      .setTitle(`🚀 ${release.name || release.tag_name}`)
      .setURL(release.html_url)
      .setDescription(
        release.body
          ? release.body.substring(0, 2000) + (release.body.length > 2000 ? '...' : '')
          : 'No release notes provided'
      )
      .setColor(CONSTANTS.DISCORD_COLORS.SUCCESS)
      .addFields(
        { name: 'Version', value: release.tag_name, inline: true },
        { name: 'Repository', value: payload.repository.full_name, inline: true },
        { name: 'Published By', value: release.author.login, inline: true }
      )
      .setThumbnail(release.author.avatar_url)
      .setTimestamp(new Date(release.published_at))
      .setFooter({ text: 'PowerPlatformToolBox Release' });

    await channel.send({
      content: '🎉 @everyone New release available!',
      embeds: [embed],
    });

    logger.info('Posted release announcement', {
      tag: release.tag_name,
      repo: payload.repository.name,
    });
  } catch (error) {
    logger.error('Failed to post release announcement', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}