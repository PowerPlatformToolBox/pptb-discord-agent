/**
 * Product release notifications (producer: GitHub `release` webhooks)
 */

import { z } from 'zod';
import { DISCORD_LIMITS } from '../../config/constants';
import type { MessagePayload } from '../../discord/format';
import { defineNotification } from '../types';
import { httpUrl } from '../shared';

const releaseSchema = z.object({
  repository: z.string().min(1),
  repositoryUrl: httpUrl,
  tagName: z.string().min(1),
  body: z.string().default(''),
  url: httpUrl,
});

type ReleaseData = z.infer<typeof releaseSchema>;

/**
 * List items under a "What's New" / "What's Changed" heading.
 */
export function extractWhatsNew(body: string): string[] {
  const items: string[] = [];
  let inSection = false;

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (/^#{1,3}\s+What'?s\s+(New|Changed)/i.test(trimmed)) {
      inSection = true;
      continue;
    }
    if (inSection && /^#{1,3}\s+/.test(trimmed)) break;
    if (inSection && (trimmed.startsWith('- ') || trimmed.startsWith('* '))) items.push(trimmed);
  }

  return items;
}

/**
 * Turn PR URLs and bare `#123` references into Discord markdown links.
 */
export function linkPullRequests(text: string, repoUrl: string): string {
  const withFullUrls = text.replace(
    /https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/(\d+)/g,
    (fullUrl, number: string) => `#[${number}](${fullUrl})`
  );
  return withFullUrls.replace(
    /(?<![[\w])#(\d+)(?!\])/g,
    (_match, number: string) => `#[${number}](${repoUrl}/pull/${number})`
  );
}

export function renderRelease(heading: string, release: ReleaseData): MessagePayload {
  const version = release.tagName.replace(/^v/, '');
  const head = `# ${heading} - ${version}`;
  const tail = `\n\n${release.url}`;
  const items = extractWhatsNew(release.body).map((item) =>
    linkPullRequests(item, release.repositoryUrl)
  );

  if (items.length === 0) return { content: head + tail };

  const sectionHeader = "\n\n## :clipboard: What's New\n";
  const budget = DISCORD_LIMITS.MESSAGE_CONTENT - head.length - tail.length - sectionHeader.length;
  const kept: string[] = [];
  let used = 0;

  for (const [index, item] of items.entries()) {
    const remaining = items.length - index - 1;
    const moreNote = remaining > 0 ? `\n…and ${remaining} more` : '';
    if (used + item.length + 1 + moreNote.length > budget) break;
    kept.push(item);
    used += item.length + 1;
  }

  const omitted = items.length - kept.length;
  const more = omitted > 0 ? `\n…and ${omitted} more` : '';
  return { content: `${head}${sectionHeader}${kept.join('\n')}${more}${tail}` };
}

const EXAMPLE_RELEASE: ReleaseData = {
  repository: 'desktop-app',
  repositoryUrl: 'https://github.com/PowerPlatformToolBox/desktop-app',
  tagName: 'v1.2.0',
  body: "## What's New\n- Faster startup (#101)\n- New tool gallery by @someone in https://github.com/PowerPlatformToolBox/desktop-app/pull/102\n\n## Fixes\n- misc",
  url: 'https://github.com/PowerPlatformToolBox/desktop-app/releases/tag/v1.2.0',
};

export const pptbNewRelease = defineNotification({
  key: 'pptb.new-release',
  category: 'PPTB',
  event: 'NewRelease',
  description: 'A new stable release deployed',
  enabled: true,
  channel: 'releases',
  source: 'github',
  schema: releaseSchema,
  example: EXAMPLE_RELEASE,
  delivery: {
    kind: 'message',
    render: (release) => renderRelease(':rocket:  Power Platform ToolBox Release', release),
  },
});

export const pptbInsider = defineNotification({
  key: 'pptb.insider',
  category: 'PPTB',
  event: 'Insider',
  description: 'A new insider release deployed',
  enabled: true,
  channel: 'insider',
  source: 'github',
  schema: releaseSchema,
  example: { ...EXAMPLE_RELEASE, tagName: 'v1.3.0-insider.1' },
  delivery: {
    kind: 'message',
    render: (release) => renderRelease(':construction:  Insider Pre-Release', release),
  },
});

export const vscodeNewRelease = defineNotification({
  key: 'vscode.new-release',
  category: 'VSCODE',
  event: 'NewRelease',
  description: 'A new vscode extension release deployed',
  enabled: true,
  channel: 'releases',
  source: 'github',
  schema: releaseSchema,
  example: {
    ...EXAMPLE_RELEASE,
    repository: 'vscode-extension',
    repositoryUrl: 'https://github.com/PowerPlatformToolBox/vscode-extension',
    url: 'https://github.com/PowerPlatformToolBox/vscode-extension/releases/tag/v0.5.0',
    tagName: 'v0.5.0',
  },
  delivery: {
    kind: 'message',
    render: (release) => renderRelease(':jigsaw:  VS Code Extension Release', release),
  },
});

export const RELEASE_NOTIFICATIONS = [pptbNewRelease, pptbInsider, vscodeNewRelease] as const;
