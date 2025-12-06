/**
 * GitHub release webhook handler
 */

import { type Client, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getLogger } from '../../../utils/logger';
import { loadWebhookConfig } from '../../../config/webhook';
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

    // Format release body (trim to Discord's 4096 char limit)
    let description = release.body || 'No release notes provided';
    if (description.length > 4000) {
      description = description.substring(0, 3997) + '...';
    }

    // Create embed for release announcement
    const embed = new EmbedBuilder()
      .setTitle(`🚀 ${release.name || release.tag_name}`)
      .setURL(release.html_url)
      .setDescription(description)
      .setColor(0x5865F2) // Discord blurple
      .addFields(
        { name: '📦 Version', value: release.tag_name, inline: true }
      )
      .setTimestamp(new Date(release.published_at))
      .setFooter({ 
        text: `${payload.repository.name} • ${release.prerelease ? 'Pre-release' : 'Stable Release'}`,
        iconURL: payload.repository.owner?.avatar_url 
      });

    // Build meta details
    const flags: string[] = [];
    if (release.prerelease) flags.push('Pre-release');
    if (release.draft) flags.push('Draft');

    const metaLines: string[] = [];
    metaLines.push('- Commits in this release: _see GitHub compare view_');
    if (flags.length) metaLines.push(`- Flags: ${flags.join(', ')}`);

    if (metaLines.length) {
      embed.addFields({
        name: 'ℹ️ Details',
        value: metaLines.join('\n'),
        inline: false
      });
    }

    // Add links section
    embed.addFields({
      name: '🔗 Links',
      value: `[View Release](${release.html_url}) • [Source Code](${release.zipball_url})`,
      inline: false
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
          winButton.setEmoji({ name: 'm1', id: '1446014221820231821' });
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
          macButton.setEmoji({ name: 'a1', id: '1446014603883446353' });
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
          linuxButton.setEmoji({ name: 'linux', id: '1446019504483205160' });
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
      content: '🎉 **New release available!**',
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
