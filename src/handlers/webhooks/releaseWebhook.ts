import { EmbedBuilder } from 'discord.js';

export interface ReleaseWebhookPayload {
  action:
    | 'published'
    | 'created'
    | 'edited'
    | 'deleted'
    | 'released'
    | 'prereleased'
    | 'unpublished';
  release: {
    id: number;
    tag_name: string;
    target_commitish: string;
    name: string;
    draft: boolean;
    prerelease: boolean;
    created_at: string;
    published_at: string;
    assets: Array<{
      id: number;
      name: string;
      label: string | null;
      state: string;
      content_type: string;
      size: number;
      download_count: number;
      created_at: string;
      updated_at: string;
      browser_download_url: string;
    }>;
    body: string;
    author: {
      login: string;
      id: number;
      avatar_url: string;
      url: string;
      type: string;
    };
    html_url: string;
    upload_url: string;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    owner: {
      login: string;
      id: number;
      avatar_url: string;
      type: string;
    };
  };
}

export interface DevReleaseConfig {
  isDevRelease: boolean;
  releaseType: 'major' | 'minor' | 'patch' | 'dev';
}

// Discord embed field value limit: 1024 characters
function truncateField(text: string): string {
  return text.length > 1024 ? `${text.substring(0, 1020)}...` : text;
}

export function parseReleaseBody(body: string): {
  highlights: string[];
  fixes: string[];
  developer: string[];
  notes: string[];
} {
  const sections = {
    highlights: [] as string[],
    fixes: [] as string[],
    developer: [] as string[],
    notes: [] as string[],
  };

  const lines = body.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.includes('## Highlights')) {
      currentSection = 'highlights';
      continue;
    }
    if (trimmed.includes('## Fixes')) {
      currentSection = 'fixes';
      continue;
    }
    if (trimmed.includes('## Developer & Build')) {
      currentSection = 'developer';
      continue;
    }
    if (trimmed.includes('## Notes')) {
      currentSection = 'notes';
      continue;
    }
    if (trimmed.includes('##')) {
      currentSection = '';
      continue;
    }

    if (trimmed.startsWith('•') && currentSection && trimmed.length > 2) {
      const bulletText = trimmed.substring(1).trim();
      sections[currentSection as keyof typeof sections].push(bulletText);
    }
  }

  return sections;
}

export function createMainReleaseEmbed(
  payload: ReleaseWebhookPayload,
  releaseBody: ReturnType<typeof parseReleaseBody>
): EmbedBuilder {
  const isPrerelease = payload.release.prerelease;
  const versionColor = isPrerelease ? 0xffa500 : 0x239922;

  const embed = new EmbedBuilder()
    .setTitle(`🚀 ${payload.repository.name} ${payload.release.tag_name}`)
    .setURL(payload.release.html_url)
    .setColor(versionColor)
    .setThumbnail(payload.repository.owner.avatar_url)
    .setTimestamp(new Date(payload.release.published_at))
    .setFooter({
      text: `Released by ${payload.release.author.login}`,
      iconURL: payload.release.author.avatar_url,
    });

  // Highlights
  if (releaseBody.highlights.length > 0) {
    const highlightsText = releaseBody.highlights.slice(0, 5).join('\n');
    embed.addFields({
      name: '✨ Highlights',
      value: truncateField(highlightsText) || 'No highlights',
      inline: false,
    });
  }

  // Fixes
  if (releaseBody.fixes.length > 0) {
    const fixesText = releaseBody.fixes.slice(0, 4).join('\n');
    embed.addFields({
      name: '🐛 Fixes',
      value: truncateField(fixesText) || 'No fixes',
      inline: false,
    });
  }

  // Developer & Build
  if (releaseBody.developer.length > 0) {
    const devText = releaseBody.developer.slice(0, 3).join('\n');
    embed.addFields({
      name: '⚙️ Developer & Build',
      value: truncateField(devText) || 'No dev notes',
      inline: false,
    });
  }

  // Download links (if assets exist)
  if (payload.release.assets.length > 0) {
    const assetLinks = payload.release.assets
      .slice(0, 3)
      .map((asset) => `[${asset.name}](${asset.browser_download_url})`)
      .join(' • ');
    embed.addFields({
      name: '📥 Downloads',
      value: truncateField(assetLinks) || 'View on GitHub',
      inline: false,
    });
  }

  // Notes
  if (releaseBody.notes.length > 0) {
    const notesText = releaseBody.notes.join('\n');
    embed.addFields({
      name: '📋 Notes',
      value: truncateField(notesText) || 'No notes',
      inline: false,
    });
  }

  // Changelog link
  embed.addFields({
    name: '🔗 Full Changelog',
    value: `[View on GitHub](${payload.release.html_url})`,
    inline: false,
  });

  return embed;
}

export function createDevReleaseEmbed(
  payload: ReleaseWebhookPayload,
  releaseBody: ReturnType<typeof parseReleaseBody>
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`🔬 ${payload.repository.name} ${payload.release.tag_name} (DEV)`)
    .setURL(payload.release.html_url)
    .setColor(0x6f42c1)
    .setThumbnail(payload.repository.owner.avatar_url)
    .setTimestamp(new Date(payload.release.published_at))
    .setFooter({
      text: `Released by ${payload.release.author.login}`,
      iconURL: payload.release.author.avatar_url,
    });

  embed.addFields({
    name: '⚠️ Development Release',
    value: 'This is a development/testing release. Not recommended for production.',
    inline: false,
  });

  // Highlights
  if (releaseBody.highlights.length > 0) {
    const highlightsText = releaseBody.highlights.slice(0, 5).join('\n');
    embed.addFields({
      name: '✨ Changes',
      value: truncateField(highlightsText) || 'No highlights',
      inline: false,
    });
  }

  // Developer & Build (more prominent for dev releases)
  if (releaseBody.developer.length > 0) {
    const devText = releaseBody.developer.join('\n');
    embed.addFields({
      name: '⚙️ Technical Details',
      value: truncateField(devText) || 'No dev notes',
      inline: false,
    });
  }

  // Fixes
  if (releaseBody.fixes.length > 0) {
    const fixesText = releaseBody.fixes.slice(0, 3).join('\n');
    embed.addFields({
      name: '🐛 Known Fixes',
      value: truncateField(fixesText) || 'No fixes',
      inline: false,
    });
  }

  // Testing instructions
  embed.addFields({
    name: '🧪 Testing',
    value: 'Test in a non-production environment. Report issues on GitHub.',
    inline: false,
  });

  return embed;
}

export function detectReleaseType(tagName: string): DevReleaseConfig {
  const isDev =
    tagName.includes('dev') ||
    tagName.includes('alpha') ||
    tagName.includes('beta') ||
    tagName.includes('rc');

  let releaseType: 'major' | 'minor' | 'patch' | 'dev' = 'patch';

  if (isDev) {
    releaseType = 'dev';
  } else {
    const versionMatch = tagName.match(/v?(\d+)\.(\d+)\.(\d+)/);
    if (versionMatch) {
      const major = parseInt(versionMatch[1], 10);
      const minor = parseInt(versionMatch[2], 10);
      if (major > 0 && minor === 0) releaseType = 'major';
      else if (minor > 0) releaseType = 'minor';
      else releaseType = 'patch';
    }
  }

  return {
    isDevRelease: isDev,
    releaseType,
  };
}
