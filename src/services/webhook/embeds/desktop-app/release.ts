/**
 * Desktop-app release embed factory
 */
import { EmbedBuilder } from 'discord.js';
import type { ReleaseEmbedParams, EmbedFactoryResult } from '../types';
import { DISCORD_COLORS } from '../../../../constants/discord';

/**
 * Creates a release announcement embed for desktop-app
 */
export function createDesktopAppReleaseEmbed(
  params: ReleaseEmbedParams
): EmbedFactoryResult {
  const { release, payload } = params;

  // Format description (trim to Discord's 4096 char limit)
  let description = release.body || 'No release notes provided';
  if (description.length > 4000) {
    description = description.substring(0, 3997) + '...';
  }

  // Create embed
  const embed = new EmbedBuilder()
    .setTitle(`🚀 ${release.name || release.tag_name}`)
    .setURL(release.html_url)
    .setDescription(description)
    .setColor(DISCORD_COLORS.BLURPLE)
    .addFields(
      { name: '📦 Version', value: release.tag_name, inline: true }
    )
    .setTimestamp(new Date(release.published_at))
    .setFooter({
      text: `${payload.repository.name} • ${release.prerelease ? 'Pre-release' : 'Stable Release'}`,
      iconURL: payload.repository.owner?.avatar_url
    });

  // Build meta details
  const flags: string[] = [];
  if (release.prerelease) flags.push('Pre-release');
  if (release.draft) flags.push('Draft');

  const metaLines: string[] = [];
  metaLines.push('- Commits in this release: _see GitHub compare view_');
  if (flags.length) metaLines.push(`- Flags: ${flags.join(', ')}`);

  if (metaLines.length) {
    embed.addFields({
      name: 'ℹ️ Details',
      value: metaLines.join('\n'),
      inline: false
    });
  }

  // Add links section
  embed.addFields({
    name: '🔗 Links',
    value: `[View Release](${release.html_url}) • [Source Code](${release.zipball_url})`,
    inline: false
  });

  return {
    embed,
    content: '🎉 **New release available!**'
  };
}
