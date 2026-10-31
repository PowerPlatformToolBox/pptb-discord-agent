/**
 * Product release notifications (producer: GitHub `release` webhooks)
 */

import type { APIEmbedField } from 'discord-api-types/v10';
import { z } from 'zod';
import { COLORS, DISCORD_LIMITS } from '../../config/constants';
import type { MessagePayload } from '../../discord/format';
import { defineNotification } from '../types';
import { bulletList, field, httpUrl, link } from '../shared';

const releaseSchema = z.object({
  repository: z.string().min(1),
  repositoryUrl: httpUrl,
  tagName: z.string().min(1),
  body: z.string().default(''),
  url: httpUrl,
});

type ReleaseData = z.infer<typeof releaseSchema>;

/**
 * List items under a "What's New" / "What's Changed" heading (optionally led by an emoji).
 */
export function extractWhatsNew(body: string): string[] {
  const items: string[] = [];
  let inSection = false;

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (/^#{1,3}\s+(?:[^\w\s]+\s*)?What['’]?s\s+(New|Changed)/iu.test(trimmed)) {
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

const insiderSchema = releaseSchema.extend({
  branch: z.string().optional(),
  // Added by src/sources/github/enrich.ts; without them the card lists the release notes' commits.
  previousTag: z.string().optional(),
  previousUrl: httpUrl.optional(),
  compareUrl: httpUrl.optional(),
  totalCommits: z.number().int().nonnegative().optional(),
  commits: z
    .array(
      z.object({
        sha: z.string().regex(/^[0-9a-f]{7,40}$/i),
        message: z.string(),
        url: httpUrl,
      })
    )
    .max(250)
    .optional(),
});

type InsiderData = z.infer<typeof insiderSchema>;

/** Commits listed on the card before collapsing into "…and N more". */
export const MAX_INSIDER_COMMITS = 15;

function commitLine(sha: string, message: string, url: string, repoUrl: string): string {
  return `[\`${sha.slice(0, 7)}\`](${url}) ${linkPullRequests(message, repoUrl)}`.trim();
}

/**
 * Commit lines, newest first: from the GitHub compare lookup, else the release notes'
 * "- <sha> <message>" items.
 */
function insiderCommitLines(insider: InsiderData): string[] {
  if (insider.commits) {
    return insider.commits.map((commit) =>
      commitLine(commit.sha, commit.message, commit.url, insider.repositoryUrl)
    );
  }
  return extractWhatsNew(insider.body).map((item) => {
    const text = item.slice(2).trim();
    const match = /^([0-9a-f]{7,40})\s+(.*)$/i.exec(text);
    if (!match) return linkPullRequests(text, insider.repositoryUrl);
    const [, sha = '', message = ''] = match;
    return commitLine(
      sha,
      message,
      `${insider.repositoryUrl}/commit/${sha}`,
      insider.repositoryUrl
    );
  });
}

export function renderInsider(insider: InsiderData): MessagePayload {
  const version = insider.tagName.replace(/^v/, '');
  const lines = insiderCommitLines(insider);
  const total = Math.max(insider.totalCommits ?? lines.length, lines.length);

  const moreNote = (omitted: number): string => {
    if (omitted <= 0) return '';
    const text = `…and ${omitted} more`;
    return insider.compareUrl ? link(text, insider.compareUrl) : text;
  };

  const kept: string[] = [];
  let used = 0;
  for (const line of lines.slice(0, MAX_INSIDER_COMMITS)) {
    const reserve = moreNote(total - kept.length - 1).length + 1;
    if (used + line.length + 3 + reserve > DISCORD_LIMITS.EMBED_DESCRIPTION) break;
    kept.push(line);
    used += line.length + 3;
  }

  const empty = insider.commits
    ? 'No new commits since the previous build.'
    : 'No commit details in the release notes.';
  const description =
    [bulletList(kept), moreNote(total - kept.length)].filter(Boolean).join('\n') || empty;
  const commitCount = `${total} ${total === 1 ? 'commit' : 'commits'}`;

  return {
    embeds: [
      {
        title: `🚧 Insider pre-release: ${version}`,
        url: insider.url,
        description,
        color: COLORS.WARNING,
        fields: [
          field('Version', version),
          field('Branch', insider.branch),
          field('Commits', total > 0 ? link(commitCount, insider.compareUrl) : undefined),
          field(
            'Previous build',
            insider.previousTag && link(insider.previousTag.replace(/^v/, ''), insider.previousUrl)
          ),
          field('Downloads', link('Release page', insider.url)),
        ].filter((item): item is APIEmbedField => item !== null),
        footer: { text: 'Testing purposes only. Not for production use.' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
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

const DESKTOP_APP_URL = 'https://github.com/PowerPlatformToolBox/desktop-app';

export const pptbInsider = defineNotification({
  key: 'pptb.insider',
  category: 'PPTB',
  event: 'Insider',
  description: 'A new insider release deployed',
  enabled: true,
  channel: 'insider',
  source: 'github',
  schema: insiderSchema,
  example: {
    repository: 'desktop-app',
    repositoryUrl: DESKTOP_APP_URL,
    tagName: 'v1.2.8-dev.20261030',
    body: "## 📋 What's New\n\n- 152f482 [Fix] Show colour SVG tool icons (#738)",
    url: `${DESKTOP_APP_URL}/releases/tag/v1.2.8-dev.20261030`,
    branch: 'dev',
    previousTag: 'v1.2.8-dev.20261027',
    previousUrl: `${DESKTOP_APP_URL}/releases/tag/v1.2.8-dev.20261027`,
    compareUrl: `${DESKTOP_APP_URL}/compare/v1.2.8-dev.20261027...v1.2.8-dev.20261030`,
    totalCommits: 2,
    commits: [
      {
        sha: '152f4820000000000000000000000000000000aa',
        message: '[Fix] Show colour SVG tool icons and load icons for local tools (#738)',
        url: `${DESKTOP_APP_URL}/commit/152f4820000000000000000000000000000000aa`,
      },
      {
        sha: '6351f130000000000000000000000000000000bb',
        message: 'docs: update known issues section in README',
        url: `${DESKTOP_APP_URL}/commit/6351f130000000000000000000000000000000bb`,
      },
    ],
  },
  delivery: { kind: 'message', render: renderInsider },
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
