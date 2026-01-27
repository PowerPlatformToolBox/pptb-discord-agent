/**
 * Environment variable schema and validation
 */

import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import type { EnvironmentVariables } from '../types';

// Load environment variables
dotenvConfig();

const environmentSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1, 'DISCORD_BOT_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_GUILD_ID: z.string().optional(),
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),
  GITHUB_ORG: z.string().default('PowerPlatformToolBox'),
  LOG_CHANNEL_ID: z.string().min(1, 'LOG_CHANNEL_ID is required'),
  REACTION_EMOJI: z.string().default('📝'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SENTRY_DSN: z.string().optional(),
  ENABLE_FILE_LOGS: z.enum(['true', 'false']).optional().default('false'),
  LOG_DIR: z.string().optional().default('./logs'),
  WEBHOOK_PORT: z.coerce.number().default(3000),
  WEBHOOK_SECRET: z.string().optional(),
  PROJECT_THREAD_CHANNEL_ID: z.string().min(1, 'PROJECT_THREAD_CHANNEL_ID is required'),
  RELEASE_CHANNEL_ID: z.string().min(1, 'RELEASE_CHANNEL_ID is required'),
  // Comma-separated lists. If empty after parsing, defaults will be applied in config.ts
  WATCHED_REPOSITORIES: z.string().default('desktop-app'),
  WATCHED_LABELS: z.string().default('DiscordDiscussion'),
});

/**
 * Validate and return environment variables
 */
export function validateEnvironment(): EnvironmentVariables {
  const result = environmentSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  return result.data;
}
