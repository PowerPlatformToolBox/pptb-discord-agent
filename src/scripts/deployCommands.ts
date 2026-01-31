/**
 * Deploy slash commands to Discord
 */

import { REST, Routes } from 'discord.js';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from '../config/config';
import type { BotCommand } from '../types';
import { createErrorLogObject } from '../utils/errorHelper';
import { LoggerFactory } from '../utils/logger';
import { AppPaths } from '../utils/pathCache';

async function deployCommands(): Promise<void> {
  try {
    const config = loadConfig();
    const logger = LoggerFactory.generic();
    const commands: unknown[] = [];

    // When run via tsx, use dist folder (production build)
    // __dirname will be /app/dist/scripts after compilation
    // Use parent directory path for consistency with main.ts
    const baseDir = join(__dirname, '..');
    const commandsPath = AppPaths.getCommandsPath(baseDir);

    logger.info('Loading commands from', { path: commandsPath });

    const commandFolders = await readdir(commandsPath);

    for (const folder of commandFolders) {
      const folderPath = AppPaths.getCommandFolderPath(baseDir, folder);
      const commandFiles = (await readdir(folderPath)).filter((file) => file.endsWith('.js'));

      logger.info('Scanning folder', { folder, files: commandFiles.length });

      for (const file of commandFiles) {
        const filePath = join(folderPath, file);
        const commandModule = (await import(filePath)) as Record<string, BotCommand>;
        const command = Object.values(commandModule)[0];

        if (command && 'data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
          logger.info('Prepared command', { name: command.data.name });
        } else {
          logger.warn('Invalid command file', { file: filePath });
        }
      }
    }

    if (commands.length === 0) {
      logger.error('No commands found! Did you run pnpm build first?');
      process.exit(1);
    }

    const rest = new REST().setToken(config.discord.token);

    // Use guild commands if DISCORD_GUILD_ID is set (instant), otherwise global (1 hour delay)
    const route = config.discord.guildId
      ? Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId)
      : Routes.applicationCommands(config.discord.clientId);

    const deploymentType = config.discord.guildId ? 'guild (instant)' : 'global (up to 1 hour)';

    logger.info('Deploying commands', {
      count: commands.length,
      type: deploymentType,
      guildId: config.discord.guildId || 'N/A',
    });

    const data = await rest.put(route, {
      body: commands,
    });

    logger.info('Successfully deployed commands', {
      count: Array.isArray(data) ? data.length : 0,
      type: deploymentType,
    });

    if (!config.discord.guildId) {
      logger.warn('Using global commands. They may take up to 1 hour to appear.');
      logger.warn('For instant testing, set DISCORD_GUILD_ID in .env');
    }
  } catch (error) {
    const logger = LoggerFactory.generic();
    logger.error('Failed to deploy commands', createErrorLogObject(error));
    process.exit(1);
  }
}

void deployCommands();
