/**
 * GitHub release webhook handler
 */
import { type Client, ChannelType } from 'discord.js';
import { getConfig } from '../../../config/config';
import { NOTIFICATIONS, resolveVscodeChannel } from '../../../config/notifications';
import type { GitHubWebhookPayload } from '../../../types/webhook';
import { getChannelCache } from '../../../utils/channelCache';
import { getErrorMessage } from '../../../utils/errorHelper';
import { LoggerFactory } from '../../../utils/logger';

const VSCODE_REPOSITORY = 'vscode-extension';

/**
 * Extract the "What's New" (or "What's Changed") section from the release body.
 * Returns the line items from that section, or an empty array if not found.
 */
function extractWhatsNewSection(body: string): string[] {
  const lines = body.split('\n');
  let inSection = false;
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect "What's New" or "What's Changed" section headers
    if (/^#{1,3}\s+What'?s\s+(New|Changed)/i.test(trimmed)) {
      inSection = true;
      continue;
    }

    // If we hit another section header while in the section, stop
    if (inSection && /^#{1,3}\s+/.test(trimmed)) {
      break;
    }

    // Collect list items within the section
    if (inSection && (trimmed.startsWith('- ') || trimmed.startsWith('* '))) {
      items.push(trimmed);
    }
  }

  return items;
}

/**
 * Convert PR references in text to hyperlinked format.
 * Handles:
 *   - Full URLs: https://github.com/org/repo/pull/123 → (#[123](url))
 *   - Short references: #123 → (#[123](repo_url/pull/123))
 */
function hyperlinkPRReferences(text: string, repoUrl: string): string {
  // First, convert full GitHub PR URLs to short hyperlinked format
  let result = text.replace(
    /https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/g,
    (fullUrl, prNumber: string) => `#[${prNumber}](${fullUrl})`
  );

  // Then, convert remaining bare #NUMBER references (not already inside [...])
  result = result.replace(
    /(?<!\[)#(\d+)(?!\])/g,
    (_match, prNumber: string) => `#[${prNumber}](${repoUrl}/pull/${prNumber})`
  );

  return result;
}

/**
 * Build the Discord message for a release announcement.
 */
function formatReleaseMessage(
  release: NonNullable<GitHubWebhookPayload['release']>,
  repoUrl: string,
  isInsiderRelease: boolean,
  productPrefix = ''
): string {
  const version = release.tag_name.replace(/^v/, '');
  const header = isInsiderRelease
    ? `# :construction:  ${productPrefix}Insider Pre-Release - ${version}`
    : `# :rocket:  ${productPrefix}Release - ${version}`;

  const whatsNewItems = extractWhatsNewSection(release.body || '');

  const parts: string[] = [header];

  if (whatsNewItems.length > 0) {
    parts.push('');
    parts.push("## :clipboard: What's New");
    parts.push('');
    for (const item of whatsNewItems) {
      parts.push(hyperlinkPRReferences(item, repoUrl));
    }
  }

  parts.push('');
  parts.push(release.html_url);

  return parts.join('\n');
}

export async function handleRelease(payload: GitHubWebhookPayload, client: Client): Promise<void> {
  const logger = LoggerFactory.forWebhook('Release');
  const config = getConfig().webhook;

  logger.info('handleRelease called', {
    action: payload.action,
    hasRelease: !!payload.release,
    repo: payload.repository?.name,
  });

  // Only handle published releases
  if (payload.action !== 'published' || !payload.release) {
    logger.info('Skipping release', {
      action: payload.action,
      hasRelease: !!payload.release,
    });
    return;
  }

  const release = payload.release;

  // Skip drafts
  if (release.draft) {
    logger.debug('Skipping draft release', { tag: release.tag_name });
    return;
  }

  // Determine if this is an insider release (pre-release)
  const isInsiderRelease = release.prerelease;

  // VS Code extension releases have their own channel in the notification config
  const isVscodeRelease = payload.repository.name === VSCODE_REPOSITORY;
  const channelId = isVscodeRelease
    ? resolveVscodeChannel(NOTIFICATIONS)
    : config.releaseAnnouncementChannel;

  try {
    const channelCache = getChannelCache();
    const channel = await channelCache.fetch(client, channelId);

    if (!channel || !channel.isTextBased()) {
      logger.error('Invalid release channel', { channelId });
      return;
    }

    // Ensure channel supports sending messages (not PartialGroupDMChannel)
    if (
      channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildAnnouncement &&
      channel.type !== ChannelType.DM
    ) {
      logger.error('Channel type does not support send', {
        channelId,
        channelType: channel.type,
      });
      return;
    }

    const message = formatReleaseMessage(
      release,
      payload.repository.html_url,
      isInsiderRelease,
      isVscodeRelease ? 'VS Code Extension ' : ''
    );

    await channel.send({ content: message });

    logger.info('Posted release announcement', {
      tag: release.tag_name,
      repo: payload.repository.name,
      isInsiderRelease,
    });
  } catch (error) {
    logger.error('Failed to post release announcement', {
      error: getErrorMessage(error),
    });
  }
}
