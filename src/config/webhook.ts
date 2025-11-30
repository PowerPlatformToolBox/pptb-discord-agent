/**
 * Webhook configuration
 */

import { z } from 'zod';
import { getLogger } from '../utils/logger';

const webhookConfigSchema = z.object({
  port: z.coerce.number().default(3000),
  secret: z.string().optional(),
  projectThreadChannel: z.string(),
  releaseAnnouncementChannel: z.string(),
  watchedRepositories: z.string().transform((val) => val.split(',')).default('pptb-mockaroo-munger'),
  watchedLabels: z.string().transform((val) => val.split(',')).default('DiscordDiscussion'),
});

export type WebhookConfig = z.infer<typeof webhookConfigSchema>;

let cachedConfig: WebhookConfig | null = null;

export function loadWebhookConfig(): WebhookConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const logger = getLogger();

  const config = webhookConfigSchema.parse({
    port: process.env.WEBHOOK_PORT,
    secret: process.env.WEBHOOK_SECRET,
    projectThreadChannel: process.env.PROJECT_THREAD_CHANNEL_ID,
    releaseAnnouncementChannel: process.env.RELEASE_CHANNEL_ID,
    watchedRepositories: process.env.WATCHED_REPOSITORIES,
    watchedLabels: process.env.WATCHED_LABELS,
  });

  cachedConfig = config;

  logger.info('Webhook config loaded', {
    port: config.port,
    projectThreadChannel: config.projectThreadChannel,
    releaseAnnouncementChannel: config.releaseAnnouncementChannel,
    watchedRepositories: config.watchedRepositories,
    watchedLabels: config.watchedLabels,
  });

  return config;
}
