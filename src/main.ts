/**
 * Main application entry point
 */

import { Client, Collection } from 'discord.js';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from './config/config';
import { INTENTS, PARTIALS } from './config/intents';
import { getLogger } from './utils/logger';
import type { BotCommand, BotEvent } from './types';

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, BotCommand>;
  }
}

async function main(): Promise<void> {
  try {
    const config = loadConfig();
    const logger = getLogger();

    logger.info('Starting PPTB Discord Assistant', {
      nodeEnv: config.nodeEnv,
      logLevel: config.logging.level,
    });

    const client = new Client({
      intents: INTENTS,
      partials: PARTIALS,
    });

    client.commands = new Collection();

    // Load commands
    const commandsPath = join(__dirname, 'handlers', 'commands');
    const commandFolders = readdirSync(commandsPath);

    for (const folder of commandFolders) {
      const folderPath = join(commandsPath, folder);
      const commandFiles = readdirSync(folderPath).filter((file) => file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = join(folderPath, file);
        const commandModule = require(filePath) as Record<string, BotCommand>;
        const command = Object.values(commandModule)[0];

        if (command && 'data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          logger.info('Loaded command', { name: command.data.name });
        } else {
          logger.warn('Invalid command file', { path: filePath });
        }
      }
    }

    // Load events
    const eventsPath = join(__dirname, 'handlers', 'events');
    const eventFiles = readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);
      const eventModule = require(filePath) as Record<string, BotEvent>;
      const event = Object.values(eventModule)[0];

      if (event && 'name' in event && 'execute' in event) {
        if (event.once) {
          client.once(event.name, (...args: unknown[]) => void event.execute(...args));
        } else {
          client.on(event.name, (...args: unknown[]) => void event.execute(...args));
        }
        logger.info('Loaded event', { name: event.name, once: event.once ?? false });
      } else {
        logger.warn('Invalid event file', { path: filePath });
      }
    }

    // Global error handlers
    process.on('unhandledRejection', (error: Error) => {
      logger.error('Unhandled promise rejection', {
        error: error.message,
        stack: error.stack,
      });
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    await client.login(config.discord.token);
  } catch (error) {
    const logger = getLogger();
    logger.error('Failed to start bot', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

void main();