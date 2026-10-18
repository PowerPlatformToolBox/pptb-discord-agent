/**
 * /ping - check that the bot responds
 */

import { snowflakeToTimestamp } from './options';
import type { SlashCommand } from './types';

export const pingCommand: SlashCommand = {
  definition: {
    name: 'ping',
    description: 'Check bot latency and API response time',
  },
  execute(interaction) {
    const latency = Math.max(0, Date.now() - snowflakeToTimestamp(interaction.id));
    return {
      type: 'reply',
      data: { content: `🏓 Pong!\nBot Latency: ${latency}ms` },
    };
  },
};
