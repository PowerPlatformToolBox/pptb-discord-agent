/**
 * Create GitHub issue command
 */

import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { getGitHubIssueService } from '../../../services/github/issueService';
import { createSuccessEmbed, createErrorEmbed } from '../../../utils/embedBuilder';
import type { BotCommand } from '../../../types';

export const createIssueCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('create-issue')
    .setDescription('Create a GitHub issue in a PowerPlatformToolBox repository')
    .addStringOption((option) =>
      option.setName('repository').setDescription('The repository name').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('title').setDescription('Issue title').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('description').setDescription('Issue description').setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('labels')
        .setDescription('Comma-separated labels (e.g., bug,enhancement)')
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const repository = interaction.options.getString('repository', true);
    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description', true);
    const labelsInput = interaction.options.getString('labels');

    const labels = labelsInput ? labelsInput.split(',').map((label) => label.trim()) : [];
    const body = `${description}\n\n---\n*Created by ${interaction.user.tag} via Discord*`;

    const issueService = getGitHubIssueService();
    const result = await issueService.createIssue({
      repo: repository,
      title,
      body,
      labels,
    });

    if (result.success && result.data) {
      const embed = createSuccessEmbed(
        'Issue Created',
        `Successfully created issue #${result.data.number} in ${repository}`
      ).addFields(
        { name: 'Title', value: title, inline: false },
        { name: 'URL', value: result.data.url, inline: false }
      );

      await interaction.editReply({ embeds: [embed] });
    } else {
      const embed = createErrorEmbed(
        'Issue Creation Failed',
        `Failed to create issue: ${result.error ?? 'Unknown error'}`
      );

      await interaction.editReply({ embeds: [embed] });
    }
  },
};