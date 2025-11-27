/**
 * Interaction create event handler (slash commands)
 */

import { Events, type Interaction, type ChatInputCommandInteraction } from 'discord.js';
import { getLogger } from '../../utils/logger';
import type { InteractionCreateEvent, BotCommand } from '../../types';

export const interactionCreateEvent: InteractionCreateEvent = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction): Promise<void> {
    const logger = getLogger();

    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = (interaction.client as { commands?: Map<string, BotCommand> }).commands?.get(
      interaction.commandName
    );

    if (!command) {
      logger.warn('Unknown command executed', { commandName: interaction.commandName });
      return;
    }

    try {
      await command.execute(interaction as ChatInputCommandInteraction);
    } catch (error) {
      logger.error('Error executing command', {
        command: interaction.commandName,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      const errorMessage = {
        content: 'There was an error executing this command.',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },
};