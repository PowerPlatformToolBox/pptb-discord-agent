/**
 * Ping command - Check bot latency
 */

import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { BotCommand } from '../../../types';

export const pingCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and API response time'),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const { resource } = await interaction.reply({
      content: 'Pinging...',
      withResponse: true,
    });

    const latency = (resource?.message?.createdTimestamp ?? Date.now()) - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply(
      `🏓 Pong!\nBot Latency: ${latency}ms\nAPI Latency: ${apiLatency}ms`
    );
  },
};
