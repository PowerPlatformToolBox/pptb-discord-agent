/**
 * Environment variable schema and validation
 */

import { z } from 'zod';
import type { EnvironmentVariables } from '../types';

const requiredString = (name: string): z.ZodString => z.string().min(1, `${name} is required`);

// Every variable is required: no defaults, no optionals
const environmentSchema = z.object({
  DISCORD_BOT_TOKEN: requiredString('DISCORD_BOT_TOKEN'),
  DISCORD_CLIENT_ID: requiredString('DISCORD_CLIENT_ID'),
  DISCORD_GUILD_ID: requiredString('DISCORD_GUILD_ID'),
  GITHUB_TOKEN: requiredString('GITHUB_TOKEN'),
  GITHUB_ORG: requiredString('GITHUB_ORG'),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']),
  ENABLE_FILE_LOGS: z.enum(['true', 'false']),
  LOG_DIR: requiredString('LOG_DIR'),
  WEBHOOK_PORT: z.coerce.number().int().positive(),
  WEBHOOK_SECRET: requiredString('WEBHOOK_SECRET'),
  PROJECT_THREAD_CHANNEL_ID: requiredString('PROJECT_THREAD_CHANNEL_ID'),
  RELEASE_CHANNEL_ID: requiredString('RELEASE_CHANNEL_ID'),
  STARS_VOICE_CHANNEL_ID: requiredString('STARS_VOICE_CHANNEL_ID'),
  // Comma-separated lists
  WATCHED_REPOSITORIES: requiredString('WATCHED_REPOSITORIES'),
  WATCHED_LABELS: requiredString('WATCHED_LABELS'),
});

/**
 * Validate and return environment variables
 */
export function validateEnvironment(): EnvironmentVariables {
  const result = environmentSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  return result.data;
}
