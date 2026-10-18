/**
 * Register slash commands with Discord (guild scoped, instant).
 * Run after changing any command: `pnpm deploy-commands`
 */

import { COMMANDS } from '../commands';
import { loadConfig } from '../config/config';
import { getDiscordRest } from '../discord/rest';
import { createErrorLogObject } from '../utils/errorHelper';
import { getLogger } from '../utils/logger';

async function deployCommands(): Promise<void> {
  const logger = getLogger('DeployCommands');
  try {
    const { discord } = loadConfig();
    const result = await getDiscordRest().putGuildCommands(
      discord.clientId,
      discord.guildId,
      COMMANDS.map((command) => command.definition)
    );
    logger.info('Deployed commands', {
      count: result.length,
      names: COMMANDS.map((command) => command.definition.name),
      guildId: discord.guildId,
    });
  } catch (error) {
    logger.error('Failed to deploy commands', createErrorLogObject(error));
    process.exitCode = 1;
  }
}

void deployCommands();
