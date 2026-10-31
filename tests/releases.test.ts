import { describe, expect, it } from '@jest/globals';
import {
  extractWhatsNew,
  linkPullRequests,
  MAX_INSIDER_COMMITS,
  renderInsider,
  renderRelease,
} from '../src/notifications/events/releases';

const repoUrl = 'https://github.com/PowerPlatformToolBox/desktop-app';

describe('release rendering', () => {
  it("extracts only the What's New / What's Changed list", () => {
    const body = "intro\n## What's Changed\n- one\n* two\ntext\n## Fixes\n- three";
    expect(extractWhatsNew(body)).toEqual(['- one', '* two']);
  });

  it("accepts an emoji before the What's New heading", () => {
    expect(extractWhatsNew("## 📋 What's New\n\n- abc1234 fix\n\n## Next")).toEqual([
      '- abc1234 fix',
    ]);
  });

  it('links PR URLs and bare references', () => {
    expect(linkPullRequests('- fix (#12)', repoUrl)).toBe(`- fix (#[12](${repoUrl}/pull/12))`);
    expect(linkPullRequests(`- by @x in ${repoUrl}/pull/9`, repoUrl)).toBe(
      `- by @x in #[9](${repoUrl}/pull/9)`
    );
  });

  it('renders without a section when there are no items', () => {
    const message = renderRelease('Release', {
      repository: 'desktop-app',
      repositoryUrl: repoUrl,
      tagName: 'v1.0.0',
      body: '',
      url: `${repoUrl}/releases/tag/v1.0.0`,
    });
    expect(message.content).toBe(`# Release - 1.0.0\n\n${repoUrl}/releases/tag/v1.0.0`);
  });

  it('stays within 2000 characters and reports omitted items', () => {
    const items = Array.from({ length: 200 }, (_, i) => `- change number ${i} with some text`);
    const message = renderRelease('Release', {
      repository: 'desktop-app',
      repositoryUrl: repoUrl,
      tagName: 'v2.0.0',
      body: `## What's New\n${items.join('\n')}`,
      url: `${repoUrl}/releases/tag/v2.0.0`,
    });
    expect(message.content!.length).toBeLessThanOrEqual(2000);
    expect(message.content).toMatch(/…and \d+ more/);
    expect(message.content!.endsWith(`${repoUrl}/releases/tag/v2.0.0`)).toBe(true);
  });
});

describe('insider rendering', () => {
  const tag = 'v1.2.8-dev.20261030';
  const base = {
    repository: 'desktop-app',
    repositoryUrl: repoUrl,
    tagName: tag,
    body: '',
    url: `${repoUrl}/releases/tag/${tag}`,
  };
  const compareUrl = `${repoUrl}/compare/v1.2.8-dev.20261027...${tag}`;
  const sha = (i: number): string => i.toString(16).padStart(40, 'a');
  const commit = (i: number, message = `change ${i}`) => ({
    sha: sha(i),
    message,
    url: `${repoUrl}/commit/${sha(i)}`,
  });

  it('renders an embed with linked commits and build fields', () => {
    const message = renderInsider({
      ...base,
      branch: 'dev',
      previousTag: 'v1.2.8-dev.20261027',
      previousUrl: `${repoUrl}/releases/tag/v1.2.8-dev.20261027`,
      compareUrl,
      totalCommits: 1,
      commits: [commit(1, 'Fix icons (#738)')],
    });
    const embed = message.embeds![0]!;

    expect(message.content).toBeUndefined();
    expect(embed.title).toBe('🚧 Insider pre-release: 1.2.8-dev.20261030');
    expect(embed.url).toBe(base.url);
    expect(embed.description).toBe(
      `• [\`${sha(1).slice(0, 7)}\`](${repoUrl}/commit/${sha(1)}) Fix icons (#[738](${repoUrl}/pull/738))`
    );
    expect(embed.fields).toEqual([
      { name: 'Version', value: '1.2.8-dev.20261030', inline: true },
      { name: 'Branch', value: 'dev', inline: true },
      { name: 'Commits', value: `[1 commit](${compareUrl})`, inline: true },
      {
        name: 'Previous build',
        value: `[1.2.8-dev.20261027](${repoUrl}/releases/tag/v1.2.8-dev.20261027)`,
        inline: true,
      },
      { name: 'Downloads', value: `[Release page](${base.url})`, inline: true },
    ]);
  });

  it('falls back to the commits in the release notes', () => {
    const message = renderInsider({
      ...base,
      body: "# 👀 Insider Pre-Release\n\n## 📋 What's New\n\n- 152f482 [Fix] Icons (#738)\n- plain note\n\n## TESTING PURPOSES ONLY",
    });
    const embed = message.embeds![0]!;

    expect(embed.description).toBe(
      [
        `• [\`152f482\`](${repoUrl}/commit/152f482) [Fix] Icons (#[738](${repoUrl}/pull/738))`,
        '• plain note',
      ].join('\n')
    );
    expect(embed.fields).toContainEqual({ name: 'Commits', value: '2 commits', inline: true });
    expect(embed.fields?.map((f) => f.name)).not.toContain('Previous build');
  });

  it('says when there is nothing to list', () => {
    expect(renderInsider(base).embeds![0]!.description).toBe(
      'No commit details in the release notes.'
    );
    expect(renderInsider({ ...base, commits: [] }).embeds![0]!.description).toBe(
      'No new commits since the previous build.'
    );
  });

  it('caps the list and links the remainder to the comparison', () => {
    const commits = Array.from({ length: 40 }, (_, i) => commit(i, 'x'.repeat(300)));
    const message = renderInsider({ ...base, compareUrl, totalCommits: 300, commits });
    const description = message.embeds![0]!.description!;
    const listed = description.split('\n').filter((line) => line.startsWith('• '));

    expect(listed.length).toBeLessThanOrEqual(MAX_INSIDER_COMMITS);
    expect(description.length).toBeLessThanOrEqual(4096);
    expect(description.endsWith(`[…and ${300 - listed.length} more](${compareUrl})`)).toBe(true);
  });
});
