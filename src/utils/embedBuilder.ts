/**
 * Discord embed builders for consistent message formatting
 */

import { EmbedBuilder } from 'discord.js';
import { CONSTANTS } from '../config/constants';
import type { GitHubIssue } from '../types';

/**
 * Create error embed
 */
export function createErrorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setColor(CONSTANTS.DISCORD_COLORS.ERROR)
    .setTimestamp();
}

/**
 * Create success embed
 */
export function createSuccessEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setColor(CONSTANTS.DISCORD_COLORS.SUCCESS)
    .setTimestamp();
}

/**
 * Create GitHub issue embed
 */
export function createGitHubIssueEmbed(issueData: GitHubIssue): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`Issue #${issueData.number}: ${issueData.title}`)
    .setURL(issueData.html_url)
    .setColor(0x238636)
    .setDescription(
      issueData.body
        ? issueData.body.substring(0, CONSTANTS.MAX_EMBED_DESCRIPTION_LENGTH - 3) + '...'
        : '*No description provided*'
    )
    .addFields(
      { name: 'State', value: issueData.state, inline: true },
      {
        name: 'Created',
        value: new Date(issueData.created_at).toLocaleDateString(),
        inline: true,
      }
    )
    .setTimestamp();

  if (issueData.labels && issueData.labels.length > 0) {
    embed.addFields({
      name: 'Labels',
      value: issueData.labels.map((label) => label.name).join(', '),
      inline: false,
    });
  }

  return embed;
}
