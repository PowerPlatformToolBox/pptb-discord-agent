/**
 * Application constants
 */

export const BOT_NAME = 'PPTB Agent';

export const COLORS = {
  PRIMARY: 0x5865f2,
  SUCCESS: 0x57f287,
  ERROR: 0xed4245,
  WARNING: 0xfee75c,
  INFO: 0x3498db,
  NEUTRAL: 0x95a5a6,
} as const;

// Discord API limits: https://discord.com/developers/docs/resources/message#embed-object-embed-limits
export const DISCORD_LIMITS = {
  MESSAGE_CONTENT: 2000,
  EMBED_TITLE: 256,
  EMBED_DESCRIPTION: 4096,
  EMBED_FIELD_NAME: 256,
  EMBED_FIELD_VALUE: 1024,
  EMBED_FIELDS: 25,
  THREAD_NAME: 100,
} as const;
