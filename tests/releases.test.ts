import { describe, expect, it } from '@jest/globals';
import {
  extractWhatsNew,
  linkPullRequests,
  renderRelease,
} from '../src/notifications/events/releases';

const repoUrl = 'https://github.com/PowerPlatformToolBox/desktop-app';

describe('release rendering', () => {
  it("extracts only the What's New / What's Changed list", () => {
    const body = "intro\n## What's Changed\n- one\n* two\ntext\n## Fixes\n- three";
    expect(extractWhatsNew(body)).toEqual(['- one', '* two']);
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
