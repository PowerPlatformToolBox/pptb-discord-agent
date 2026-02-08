/**
 * GitHub release webhook handler
 */
import { type Client, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
import { getConfig } from '../../../config/config';
import { PLATFORM_EMOJIS } from '../../../constants/discord';
import type { GitHubWebhookPayload } from '../../../types/webhook';
import { getChannelCache } from '../../../utils/channelCache';
import { getErrorMessage } from '../../../utils/errorHelper';
import { LoggerFactory } from '../../../utils/logger';
import { getVoiceChannelService } from '../../discord/voiceChannelService';
import { createDesktopAppReleaseEmbed } from '../embeds';

export async function handleRelease(payload: GitHubWebhookPayload, client: Client): Promise<void> {
  const logger = LoggerFactory.forWebhook('Release');
  const config = getConfig().webhook;

  logger.info('handleRelease called', {
    action: payload.action,
    hasRelease: !!payload.release,
    repo: payload.repository?.name,
  });

  // Only handle published releases (not drafts or pre-releases)
  if (payload.action !== 'published' || !payload.release) {
    logger.info('Skipping release', {
      action: payload.action,
      hasRelease: !!payload.release,
    });
    return;
  }

  const release = payload.release;

  // Skip drafts
  if (release.draft) {
    logger.debug('Skipping draft release', { tag: release.tag_name });
    return;
  }

  // Determine if this is an insider release (pre-release)
  const isInsiderRelease = release.prerelease;
  const version = release.tag_name;

  // Update voice channels based on release type
  try {
    const voiceChannelService = getVoiceChannelService();
    
    if (isInsiderRelease) {
      // Update insider channel for pre-releases
      await voiceChannelService.updateInsiderChannel(client, config.insiderVoiceChannel, version);
      logger.info('Updated insider voice channel', {
        repo: payload.repository.name,
        version,
      });
    } else {
      // Update release channel for stable releases
      await voiceChannelService.updateReleaseChannel(client, config.releaseVoiceChannel, version);
      logger.info('Updated release voice channel', {
        repo: payload.repository.name,
        version,
      });
    }
  } catch (error) {
    logger.error('Failed to update voice channels', {
      error: getErrorMessage(error),
    });
  }

  // Skip posting to Discord for pre-releases
  if (isInsiderRelease) {
    logger.debug('Skipping Discord post for pre-release', { tag: release.tag_name });
    return;
  }

  try {
    const channelCache = getChannelCache();
    const channel = await channelCache.fetch(client, config.releaseAnnouncementChannel);

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
        channelType: channel.type,
      });
      return;
    }

    // Use the embed factory to create the embed
    const { embed, content } = createDesktopAppReleaseEmbed({
      release,
      payload,
    });

    // Create download buttons for different platforms
    const buttons: ActionRowBuilder<ButtonBuilder>[] = [];

    if (release.assets && release.assets.length > 0) {
      const downloadButtons: ButtonBuilder[] = [];

      // Helper to check for platform token at word boundaries to avoid false positives
      const hasPlatformToken = (filename: string, token: string): boolean => {
        // Match token at start/end or separated by dot/underscore/hyphen
        const pattern = new RegExp(`(?:^|[._-])${token}(?:[._-]|$)`, 'i');
        return pattern.test(filename);
      };

      // Single-pass asset scanning for efficiency
      // Platform detection precedence: Windows > macOS > Linux
      // Each asset is assigned to at most one platform
      const platformAssets = {
        windows: null as typeof release.assets[0] | null,
        mac: null as typeof release.assets[0] | null,
        linux: null as typeof release.assets[0] | null,
      };

      for (const asset of release.assets) {
        const nameLower = asset.name.toLowerCase();

        // Windows installer
        if (
          !platformAssets.windows &&
          (nameLower.endsWith('.exe') ||
            hasPlatformToken(nameLower, 'win') ||
            hasPlatformToken(nameLower, 'windows'))
        ) {
          platformAssets.windows = asset;
        }
        // macOS installer
        else if (
          !platformAssets.mac &&
          (hasPlatformToken(nameLower, 'mac') ||
            hasPlatformToken(nameLower, 'darwin') ||
            nameLower.endsWith('.dmg'))
        ) {
          platformAssets.mac = asset;
        }
        // Linux AppImage
        else if (
          !platformAssets.linux &&
          (nameLower.endsWith('.appimage') || hasPlatformToken(nameLower, 'linux'))
        ) {
          platformAssets.linux = asset;
        }

        // Exit early if all platforms found
        if (platformAssets.windows && platformAssets.mac && platformAssets.linux) {
          break;
        }
      }

      // Create Windows button
      if (platformAssets.windows) {
        const winButton = new ButtonBuilder()
          .setLabel('Windows')
          .setURL(platformAssets.windows.browser_download_url)
          .setStyle(ButtonStyle.Link);

        try {
          winButton.setEmoji(PLATFORM_EMOJIS.WINDOWS);
        } catch {
          // If custom emoji fails, just use label without emoji
        }

        downloadButtons.push(winButton);
      }

      // Create macOS button
      if (platformAssets.mac) {
        const macButton = new ButtonBuilder()
          .setLabel('macOS')
          .setURL(platformAssets.mac.browser_download_url)
          .setStyle(ButtonStyle.Link);

        try {
          macButton.setEmoji(PLATFORM_EMOJIS.MACOS);
        } catch {
          // If custom emoji fails, just use label without emoji
        }

        downloadButtons.push(macButton);
      }

      // Create Linux button
      if (platformAssets.linux) {
        const linuxButton = new ButtonBuilder()
          .setLabel('Linux')
          .setURL(platformAssets.linux.browser_download_url)
          .setStyle(ButtonStyle.Link);

        try {
          linuxButton.setEmoji(PLATFORM_EMOJIS.LINUX);
        } catch {
          // If custom emoji fails, just use label without emoji
        }

        downloadButtons.push(linuxButton);
      }

      if (downloadButtons.length > 0) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(...downloadButtons);
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
      error: getErrorMessage(error),
    });
  }
}
