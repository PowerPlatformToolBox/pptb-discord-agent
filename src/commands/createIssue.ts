/**
 * /create-issue - create a GitHub issue in a PowerPlatformToolBox repository
 */

import { ApplicationCommandOptionType, type APIEmbed } from 'discord-api-types/v10';
import { COLORS } from '../config/constants';
import { getGitHubIssueService } from '../services/github/issueService';
import { getInvokingUser, getStringOption } from './options';
import type { SlashCommand } from './types';

const REPOSITORIES = [
  { name: '🖥️ Desktop App (Main Project)', value: 'desktop-app', emoji: '🖥️' },
  { name: '🌐 Website', value: 'pptb-web', emoji: '🌐' },
  { name: '📚 Documentation', value: 'pptb-docs-web', emoji: '📚' },
] as const;

function resultEmbed(title: string, description: string, color: number): APIEmbed {
  return { title, description, color, timestamp: new Date().toISOString() };
}

export const createIssueCommand: SlashCommand = {
  definition: {
    name: 'create-issue',
    description: 'Create a GitHub issue in a PowerPlatformToolBox repository',
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'repository',
        description: 'Select the repository',
        required: true,
        choices: REPOSITORIES.map(({ name, value }) => ({ name, value })),
      },
      {
        type: ApplicationCommandOptionType.String,
        name: 'title',
        description: 'Issue title',
        required: true,
      },
      {
        type: ApplicationCommandOptionType.String,
        name: 'description',
        description: 'Issue description',
        required: true,
      },
      {
        type: ApplicationCommandOptionType.String,
        name: 'labels',
        description: 'Comma-separated labels (e.g., bug,enhancement)',
        required: false,
      },
    ],
  },
  execute(interaction) {
    const repository = getStringOption(interaction, 'repository') ?? '';
    const title = getStringOption(interaction, 'title') ?? '';
    const description = getStringOption(interaction, 'description') ?? '';
    const labelsInput = getStringOption(interaction, 'labels');
    const username = getInvokingUser(interaction)?.username ?? 'unknown';

    return {
      type: 'defer',
      work: async () => {
        const labels = labelsInput ? labelsInput.split(',').map((label) => label.trim()) : [];
        const body = `${description}\n\n---\n*Created by ${username} via Discord*`;
        const result = await getGitHubIssueService().createIssue({
          repo: repository,
          title,
          body,
          labels,
        });

        if (!result.success || !result.data) {
          return {
            embeds: [
              resultEmbed(
                '❌ Issue Creation Failed',
                `Failed to create issue: ${result.error ?? 'Unknown error'}`,
                COLORS.ERROR
              ),
            ],
          };
        }

        const emoji = REPOSITORIES.find((r) => r.value === repository)?.emoji ?? '';
        const embed = resultEmbed(
          '✅ Issue Created',
          `Successfully created issue #${result.data.number} in ${emoji} ${repository}`,
          COLORS.SUCCESS
        );
        embed.fields = [
          { name: 'Title', value: title, inline: false },
          { name: 'URL', value: result.data.url, inline: false },
          { name: 'Repository', value: repository, inline: true },
        ];
        return { embeds: [embed] };
      },
    };
  },
};
