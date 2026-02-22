/**
 * GitHub star webhook handler
 */

import type { Client } from 'discord.js';
import { getConfig } from '../../../config/config';
import type { GitHubWebhookPayload } from '../../../types/webhook';
import { getErrorMessage } from '../../../utils/errorHelper';
import { LoggerFactory } from '../../../utils/logger';
import { getVoiceChannelService } from '../../discord/voiceChannelService';

export async function handleStar(payload: GitHubWebhookPayload, client: Client): Promise<void> {
  const logger = LoggerFactory.forWebhook('Star');
  const config = getConfig().webhook;

  logger.info('handleStar called', {
    action: payload.action,
    repo: payload.repository?.name,
    stargazers_count: payload.repository?.stargazers_count,
  });

  // Only handle created or deleted star actions
  if (payload.action !== 'created' && payload.action !== 'deleted') {
    logger.debug('Skipping star action', { action: payload.action });
    return;
  }

  // Get the current star count from the payload
  const starCount = payload.repository.stargazers_count;
  if (starCount === undefined) {
    logger.warn('Star count not found in payload', {
      repo: payload.repository.name,
    });
    return;
  }

  // Skip if voice channel is not configured
  if (!config.starsVoiceChannel) {
    logger.debug('Stars voice channel not configured, skipping update');
    return;
  }

  try {
    const voiceChannelService = getVoiceChannelService();
    const success = await voiceChannelService.updateStarsChannel(
      client,
      config.starsVoiceChannel,
      starCount
    );

    if (success) {
      logger.info('Updated stars voice channel', {
        repo: payload.repository.name,
        starCount,
        action: payload.action,
      });
    } else {
      logger.warn('Failed to update stars voice channel', {
        repo: payload.repository.name,
        starCount,
        action: payload.action,
      });
    }
  } catch (error) {
    logger.error('Failed to update stars voice channel', {
      error: getErrorMessage(error),
    });
  }
}
