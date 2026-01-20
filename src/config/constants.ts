/**
 * Application constants
 */

export const CONSTANTS = {
  // Discord
  DISCORD_COLORS: {
    PRIMARY: 0x5865f2,
    SUCCESS: 0x57f287,
    ERROR: 0xed4245,
    WARNING: 0xfee75c,
    INFO: 0x5865f2,
  },

  // Bot metadata
  BOT_VERSION: '1.0.0',
  BOT_NAME: 'PPTB Discord Assistant',

  // Limits
  MAX_EMBED_DESCRIPTION_LENGTH: 4096,
  MAX_EMBED_FIELDS: 25,
  MAX_EMBED_FIELD_VALUE_LENGTH: 1024,

  // Timeouts
  COMMAND_TIMEOUT_MS: 30000,
  REACTION_FETCH_TIMEOUT_MS: 5000,
} as const;
