/**
 * Main application entry point
 */

import { Client, Collection } from 'discord.js';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from './config/config';
import { INTENTS, PARTIALS } from './config/intents';
import { handleProjectItem } from './services/webhook/handlers/projectItem';
import { handleRelease } from './services/webhook/handlers/release';
import { handleStar } from './services/webhook/handlers/star';
import { createWebhookServer } from './services/webhook/webhookServer';
import type { BotCommand, BotEvent } from './types';
import type { GitHubWebhookPayload } from './types/webhook';
import { createErrorLogObject } from './utils/errorHelper';
import { LoggerFactory } from './utils/logger';
import { AppPaths } from './utils/pathCache';
import { initializeSentry, captureException, addBreadcrumb } from './utils/sentryHelper';

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, BotCommand>;
  }
}

async function main(): Promise<void> {
  try {
    const config = loadConfig();
    const logger = LoggerFactory.generic();

    // Initialize Sentry for error tracking (if DSN provided)
    initializeSentry(config.sentry?.dsn);

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
    const commandsPath = AppPaths.getCommandsPath(__dirname);
    const commandFolders = await readdir(commandsPath);

    for (const folder of commandFolders) {
      const folderPath = AppPaths.getCommandFolderPath(__dirname, folder);
      const commandFiles = (await readdir(folderPath)).filter((file) => file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = join(folderPath, file);
        const commandModule = (await import(filePath)) as unknown as Record<string, BotCommand>;
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
    const eventsPath = AppPaths.getEventsPath(__dirname);
    const eventFiles = (await readdir(eventsPath)).filter((file) => file.endsWith('.js'));

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);
      const eventModule = (await import(filePath)) as Record<string, BotEvent>;
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

    // Setup webhook handlers
    const webhookHandlers = new Map<string, (payload: GitHubWebhookPayload) => Promise<void>>();

    // Handle issues (for project items)
    webhookHandlers.set('issues', async (payload) => {
      await handleProjectItem(payload, client);
    });

    // Handle pull requests (for project items)
    webhookHandlers.set('pull_request', async (payload) => {
      await handleProjectItem(payload, client);
    });

    // Handle releases
    webhookHandlers.set('release', async (payload) => {
      await handleRelease(payload, client);
    });

    // Handle stars
    webhookHandlers.set('star', async (payload) => {
      await handleStar(payload, client);
    });

    // Create and start webhook server
    const webhookServer = createWebhookServer(webhookHandlers);
    webhookServer.setDiscordClient(client);

    // Start webhook server immediately (before Discord login)
    // This allows Railway to health check the server
    webhookServer.start();

    // Global error handlers
    process.on('unhandledRejection', (error: Error) => {
      logger.error('Unhandled promise rejection', createErrorLogObject(error));
      captureException(error, { type: 'unhandledRejection' });
      addBreadcrumb('Unhandled rejection', 'error');
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', createErrorLogObject(error));
      captureException(error, { type: 'uncaughtException' });
      addBreadcrumb('Uncaught exception', 'error');
      process.exit(1);
    });

    // Login to Discord
    await client.login(config.discord.token);
    // Cleanup on exit
    process.on('SIGINT', () => {
      logger.info('Shutting down...');
      webhookServer.stop();
      void client.destroy();
      process.exit(0);
    });
  } catch (error) {
    const logger = LoggerFactory.generic();
    logger.error('Failed to start bot', createErrorLogObject(error));
    captureException(error, { stage: 'startup' });
    process.exit(1);
  }
}

void main();
