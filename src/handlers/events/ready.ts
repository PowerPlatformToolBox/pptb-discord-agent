/**
 * Client ready event handler
 */

import { Events, type Client } from 'discord.js';
import { getLogger } from '../../utils/logger';
import type { ReadyEvent } from '../../types';

export const readyEvent: ReadyEvent = {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client<true>): Promise<void> {
    const logger = getLogger();
    logger.info('Bot logged in', {
      username: client.user.tag,
      id: client.user.id,
      guilds: client.guilds.cache.size,
    });

    await client.user.setPresence({
      activities: [{ name: 'GitHub Issues', type: 3 }],
      status: 'online',
    });

    logger.info('Bot is ready and online');
  },
};