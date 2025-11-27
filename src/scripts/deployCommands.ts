/**
 * Deploy slash commands to Discord
 */

import { REST, Routes } from 'discord.js';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../config/config';
import { getLogger } from '../utils/logger';
import type { BotCommand } from '../types';

async function deployCommands(): Promise<void> {
  try {
    const config = loadConfig();
    const logger = getLogger();
    const commands: unknown[] = [];

    const commandsPath = join(__dirname, '..', 'handlers', 'commands');
    const commandFolders = readdirSync(commandsPath);

    for (const folder of commandFolders) {
      const folderPath = join(commandsPath, folder);
      const commandFiles = readdirSync(folderPath).filter((file) => file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = join(folderPath, file);
        const commandModule = require(filePath) as Record<string, BotCommand>;
        const command = Object.values(commandModule)[0];

        if (command && 'data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
          logger.info('Prepared command', { name: command.data.name });
        }
      }
    }

    const rest = new REST().setToken(config.discord.token);

    logger.info('Deploying commands', { count: commands.length });

    const data = await rest.put(Routes.applicationCommands(config.discord.clientId), {
      body: commands,
    });

    logger.info('Successfully deployed commands', {
      count: Array.isArray(data) ? data.length : 0,
    });
  } catch (error) {
    const logger = getLogger();
    logger.error('Failed to deploy commands', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

void deployCommands();