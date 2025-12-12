/**
 * GitHub release webhook handler
 */
import { type Client, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getLogger } from '../../../utils/logger';
import { loadWebhookConfig } from '../../../config/webhook';
import type { GitHubWebhookPayload } from '../../../types/webhook';
import { createDesktopAppReleaseEmbed } from '../embeds';
import { PLATFORM_EMOJIS } from '../../../constants/discord';

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

  // Check if repository is in watched list
  if (!config.watchedRepositories.includes(payload.repository.name)) {
    logger.debug('Skipping unwatched repository', { 
      repo: payload.repository.name,
      watched: config.watchedRepositories,
    });
    return;
  }

  try {
    const channel = await client.channels.fetch(config.releaseAnnouncementChannel);

    if (!channel || !channel.isTextBased()) {
      logger.error('Invalid release channel', { channelId: config.releaseAnnouncementChannel });
      return;
    }

    // Ensure channel supports sending messages (not PartialGroupDMChannel)
    if (
      channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildAnnouncement &&
      channel.type !== ChannelType.DM
    ) {
      logger.error('Channel type does not support send', { 
        channelId: config.releaseAnnouncementChannel,
        channelType: channel.type 
      });
      return;
    }

    // Use the embed factory to create the embed
    const { embed, content } = createDesktopAppReleaseEmbed({
      release,
      payload
    });

    // Create download buttons for different platforms
    const buttons: ActionRowBuilder<ButtonBuilder>[] = [];
    
    if (release.assets && release.assets.length > 0) {
      const downloadButtons: ButtonBuilder[] = [];

      // Windows installer
      const windowsAsset = release.assets.find(asset => 
        asset.name.toLowerCase().endsWith('.exe') || 
        asset.name.toLowerCase().includes('win')
      );
      if (windowsAsset) {
        const winButton = new ButtonBuilder()
          .setLabel('Windows')
          .setURL(windowsAsset.browser_download_url)
          .setStyle(ButtonStyle.Link);
        
        try {
          winButton.setEmoji(PLATFORM_EMOJIS.WINDOWS);
        } catch {
          // If custom emoji fails, just use label without emoji
        }
        
        downloadButtons.push(winButton);
      }

      // macOS installer
      const macAsset = release.assets.find(asset => 
        asset.name.toLowerCase().includes('mac') || 
        asset.name.toLowerCase().includes('darwin') ||
        asset.name.toLowerCase().endsWith('.dmg')
      );
      if (macAsset) {
        const macButton = new ButtonBuilder()
          .setLabel('macOS')
          .setURL(macAsset.browser_download_url)
          .setStyle(ButtonStyle.Link);
        
        try {
          macButton.setEmoji(PLATFORM_EMOJIS.MACOS);
        } catch {
          // If custom emoji fails, just use label without emoji
        }
        
        downloadButtons.push(macButton);
      }

      // Linux AppImage
      const linuxAsset = release.assets.find(asset => 
        asset.name.toLowerCase().endsWith('.appimage') ||
        asset.name.toLowerCase().includes('linux')
      );
      if (linuxAsset) {
        const linuxButton = new ButtonBuilder()
          .setLabel('Linux')
          .setURL(linuxAsset.browser_download_url)
          .setStyle(ButtonStyle.Link);
        
        try {
          linuxButton.setEmoji(PLATFORM_EMOJIS.LINUX);
        } catch {
          // If custom emoji fails, just use label without emoji
        }
        
        downloadButtons.push(linuxButton);
      }

      if (downloadButtons.length > 0) {
        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(...downloadButtons);
        buttons.push(row);
      }
    }

    await channel.send({
      content,
      embeds: [embed],
      components: buttons,
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
