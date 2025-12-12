/**
 * Desktop-app thread starter embed factory
 */
import { EmbedBuilder } from 'discord.js';
import type { ThreadStarterEmbedParams, EmbedFactoryResult } from '../types';
import { DISCORD_COLORS } from '../../../../constants/discord';

/**
 * Creates a thread starter embed for desktop-app releases
 */
export function createDesktopAppThreadStarterEmbed(
  params: ThreadStarterEmbedParams
): EmbedFactoryResult {
  const { release, payload } = params;

  const embed = new EmbedBuilder()
    .setTitle(`💬 Discussion: ${release.name || release.tag_name}`)
    .setURL(release.html_url)
    .setDescription(
      'Use this thread to discuss the release, ask questions, or report issues.'
    )
    .setColor(DISCORD_COLORS.BLURPLE)
    .addFields(
      { name: '📦 Version', value: release.tag_name, inline: true },
      { name: '📌 Repository', value: payload.repository.name, inline: true }
    )
    .setTimestamp(new Date(release.published_at));

  if (payload.repository.owner?.avatar_url) {
    embed.setFooter({
      text: payload.repository.name,
      iconURL: payload.repository.owner.avatar_url
    });
  }

  return {
    embed,
    content: undefined
  };
}
