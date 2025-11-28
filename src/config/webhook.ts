/**
 * Webhook configuration
 */

import { z } from 'zod';
import type { WebhookConfig } from '../types/webhook';

const webhookEnvSchema = z.object({
  WEBHOOK_PORT: z.string().default('3000').transform(Number),
  WEBHOOK_SECRET: z.string().optional(),
  PROJECT_THREAD_CHANNEL_ID: z.string().min(1),
  RELEASE_CHANNEL_ID: z.string().min(1),
  PROJECT_DISCUSSION_LABEL: z.string().default('DiscordDiscussion'),
});

export function loadWebhookConfig(): WebhookConfig {
  const result = webhookEnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Webhook config validation failed:\n${errors.join('\n')}`);
  }

  return {
    port: result.data.WEBHOOK_PORT,
    secret: result.data.WEBHOOK_SECRET,
    projectThreadChannel: result.data.PROJECT_THREAD_CHANNEL_ID,
    releaseAnnouncementChannel: result.data.RELEASE_CHANNEL_ID,
    projectDiscussionLabel: result.data.PROJECT_DISCUSSION_LABEL,
  };
}