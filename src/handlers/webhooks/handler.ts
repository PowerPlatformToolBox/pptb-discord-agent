import { Client, TextChannel } from 'discord.js';
import { getLogger } from '../../utils/logger';
import {
  ReleaseWebhookPayload,
  createDevReleaseEmbed,
  createMainReleaseEmbed,
  detectReleaseType,
  parseReleaseBody,
} from './releaseWebhook';
import { SponsorWebhookPayload, createSponsorEmbed } from './sponsorWebhook';

const logger = getLogger('WebhookHandler');

export interface WebhookConfig {
  releaseChannelId: string;
  devReleaseChannelId?: string;
  sponsorChannelId: string;
}

export class GitHubWebhookHandler {
  private client: Client;
  private config: WebhookConfig;

  constructor(client: Client, config: WebhookConfig) {
    this.client = client;
    this.config = config;
  }

  async handleReleaseWebhook(payload: ReleaseWebhookPayload): Promise<void> {
    try {
      // Only process published/created releases
      if (!['published', 'created', 'released'].includes(payload.action)) {
        logger.debug(`Skipping release action: ${payload.action}`);
        return;
      }

      const releaseType = detectReleaseType(payload.release.tag_name);
      const channelId = releaseType.isDevRelease
        ? this.config.devReleaseChannelId || this.config.releaseChannelId
        : this.config.releaseChannelId;

      const channel = (await this.client.channels.fetch(channelId)) as TextChannel;
      if (!channel) {
        logger.error(`Release channel ${channelId} not found`);
        return;
      }

      // Parse release body
      const releaseBody = parseReleaseBody(payload.release.body || '');

      // Create appropriate embed
      const embed = releaseType.isDevRelease
        ? createDevReleaseEmbed(payload, releaseBody)
        : createMainReleaseEmbed(payload, releaseBody);

      // Send message
      await channel.send({
        embeds: [embed],
        content: releaseType.isDevRelease
          ? `🔬 **Development Release**: ${payload.release.tag_name}`
          : `🚀 **New Release**: ${payload.release.tag_name}`,
      });

      logger.info(
        `Release webhook processed: ${payload.release.tag_name} (type: ${releaseType.releaseType})`
      );
    } catch (error) {
      logger.error('Error handling release webhook', {
        error: error instanceof Error ? error.message : String(error),
        release: payload.release.tag_name,
      });
      throw error;
    }
  }

  async handleSponsorWebhook(payload: SponsorWebhookPayload): Promise<void> {
    try {
      const channel = (await this.client.channels.fetch(
        this.config.sponsorChannelId
      )) as TextChannel;
      if (!channel) {
        logger.error(`Sponsor channel ${this.config.sponsorChannelId} not found`);
        return;
      }

      const embed = createSponsorEmbed(payload);
      if (!embed) {
        logger.info('Sponsor webhook skipped', {
          action: payload.action,
          sponsor: payload.sponsorship.sponsor.login,
        });
        return;
      }

      // Add sponsor URL if public
      if (payload.sponsorship.privacy_level === 'public') {
        embed.addFields({
          name: '🔗 Profile',
          value: `[${payload.sponsorship.sponsor.login}](${payload.sponsorship.sponsor.url})`,
          inline: false,
        });
      }

      await channel.send({
        embeds: [embed],
      });

      logger.info(`Sponsor webhook processed: action=${payload.action}`);
    } catch (error) {
      logger.error('Error handling sponsor webhook', {
        error: error instanceof Error ? error.message : String(error),
        action: payload.action,
      });
      throw error;
    }
  }

  async handleCustomWebhook(
    eventType: string,
    payload: Record<string, unknown>,
    channelId: string
  ): Promise<void> {
    try {
      const channel = (await this.client.channels.fetch(channelId)) as TextChannel;
      if (!channel) {
        logger.error(`Channel ${channelId} not found`);
        return;
      }
      // Log payload for debugging
      logger.debug('Custom webhook payload received', { eventType, payload });

      // Implement custom webhook logic here (placeholder)
      await channel.send({
        content: `📦 Custom event: ${eventType}`,
      });
      logger.info(`Custom webhook processed: ${eventType}`, { payloadKeys: Object.keys(payload) });
    } catch (error) {
      logger.error('Error handling custom webhook', {
        error: error instanceof Error ? error.message : String(error),
        eventType,
      });
      throw error;
    }
  }
}
