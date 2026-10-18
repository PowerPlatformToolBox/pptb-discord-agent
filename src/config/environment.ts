/**
 * Environment variable schema and validation
 */

import { z } from 'zod';

const requiredString = (name: string): z.ZodString => z.string().min(1, `${name} is required`);

const snowflake = (name: string): z.ZodString =>
  z.string().regex(/^\d{17,20}$/, `${name} must be a Discord ID (17-20 digits)`);

// Required unless explicitly marked optional. Optional values exist only for opt-in tuning.
const environmentSchema = z.object({
  // Discord application
  DISCORD_BOT_TOKEN: requiredString('DISCORD_BOT_TOKEN'),
  DISCORD_CLIENT_ID: snowflake('DISCORD_CLIENT_ID'),
  DISCORD_PUBLIC_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, 'DISCORD_PUBLIC_KEY must be the 64-char hex application public key'),
  DISCORD_GUILD_ID: snowflake('DISCORD_GUILD_ID'),

  // Discord channels (notification routing targets)
  DISCORD_CHANNEL_ADMIN: snowflake('DISCORD_CHANNEL_ADMIN'),
  DISCORD_CHANNEL_TOOLS: snowflake('DISCORD_CHANNEL_TOOLS'),
  DISCORD_CHANNEL_RELEASES: snowflake('DISCORD_CHANNEL_RELEASES'),
  DISCORD_CHANNEL_INSIDER: snowflake('DISCORD_CHANNEL_INSIDER'),
  DISCORD_CHANNEL_DISCUSSIONS: snowflake('DISCORD_CHANNEL_DISCUSSIONS'),
  DISCORD_CHANNEL_STARS: snowflake('DISCORD_CHANNEL_STARS'),

  // GitHub
  GITHUB_TOKEN: requiredString('GITHUB_TOKEN'),
  GITHUB_ORG: requiredString('GITHUB_ORG'),
  GITHUB_WEBHOOK_SECRET: requiredString('GITHUB_WEBHOOK_SECRET'),
  STARS_REPOSITORY: requiredString('STARS_REPOSITORY'),
  WATCHED_LABELS: requiredString('WATCHED_LABELS'),

  // Inbound platform events (pptb-web, tool-management) and Vercel cron
  PLATFORM_EVENTS_SECRET: z.string().min(32, 'PLATFORM_EVENTS_SECRET must be at least 32 chars'),
  CRON_SECRET: z.string().min(16, 'CRON_SECRET must be at least 16 chars'),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Optional notification overrides (see docs/NOTIFICATIONS.md)
  DISABLED_NOTIFICATIONS: z.string().optional(),
  NOTIFICATION_ROUTES: z.string().optional(),
});

export type EnvironmentVariables = z.infer<typeof environmentSchema>;

/**
 * Validate and return environment variables
 */
export function validateEnvironment(env: NodeJS.ProcessEnv = process.env): EnvironmentVariables {
  const result = environmentSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  return result.data;
}
