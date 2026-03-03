/**
 * Shared types for embed factory functions
 */
import type { EmbedBuilder } from 'discord.js';
import type { GitHubWebhookPayload } from '../../../types/webhook';

/**
 * Base parameters for all embed factories
 */
export interface BaseEmbedParams {
  payload: GitHubWebhookPayload;
}

/**
 * Parameters for thread starter embed factory
 */
export interface ThreadStarterEmbedParams extends BaseEmbedParams {
  release: NonNullable<GitHubWebhookPayload['release']>;
}

/**
 * Return type for embed factory functions
 */
export interface EmbedFactoryResult {
  embed: EmbedBuilder;
  content?: string;
}
