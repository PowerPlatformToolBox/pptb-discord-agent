/**
 * Interaction create event handler (slash commands)
 */

import {
  Events,
  MessageFlags,
  type ChatInputCommandInteraction,
  type Interaction,
} from 'discord.js';
import type { BotCommand, InteractionCreateEvent } from '../../types';
import { createErrorLogObject } from '../../utils/errorHelper';
import { getLogger } from '../../utils/logger';

const logger = getLogger('InteractionCreate');

export const interactionCreateEvent: InteractionCreateEvent = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction): Promise<void> {
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
        ...createErrorLogObject(error),
      });

      const errorMessage = {
        content: 'There was an error executing this command.',
        flags: MessageFlags.Ephemeral as const,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },
};
