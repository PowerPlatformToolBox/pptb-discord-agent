import { describe, expect, it, jest } from '@jest/globals';
import { GitHubClient } from '../src/services/github/githubClient';
import { getInsiderChanges } from '../src/services/github/releaseService';

const repoUrl = 'https://github.com/PowerPlatformToolBox/desktop-app';

const releases = [
  { tag_name: 'v1.2.8-dev.20261031', prerelease: true },
  { tag_name: 'v1.2.8-dev.20261030', prerelease: true },
  { tag_name: 'v1.2.7', prerelease: false },
  { tag_name: 'v1.2.8-dev.20261029', prerelease: true, draft: true },
  { tag_name: 'v1.2.8-dev.20261027', prerelease: true },
].map((release) => ({
  draft: false,
  ...release,
  html_url: `${repoUrl}/releases/tag/${release.tag_name}`,
}));

function compareCommit(sha: string, message: string, parents = 1) {
  return {
    sha,
    html_url: `${repoUrl}/commit/${sha}`,
    commit: { message },
    parents: Array.from({ length: parents }, (_, i) => ({ sha: `p${i}` })),
  };
}

function stubGitHub(comparison: unknown, list: unknown = releases): string[] {
  const urls: string[] = [];
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    urls.push(url);
    return new Response(JSON.stringify(url.includes('/compare/') ? comparison : list));
  });
  return urls;
}

describe('getInsiderChanges', () => {
  const client = new GitHubClient('token', 'PowerPlatformToolBox');

  it('compares against the previous published insider build, skipping stable and drafts', async () => {
    const urls = stubGitHub({
      html_url: `${repoUrl}/compare/v1.2.8-dev.20261027...v1.2.8-dev.20261030`,
      total_commits: 3,
      commits: [
        compareCommit('aaa1111', 'older commit\n\nbody text'),
        compareCommit('bbb2222', 'Merge pull request #1 from x/y', 2),
        compareCommit('ccc3333', 'newer commit (#5)'),
      ],
    });

    const changes = await getInsiderChanges('desktop-app', 'v1.2.8-dev.20261030', client);

    expect(urls[1]).toBe(
      'https://api.github.com/repos/PowerPlatformToolBox/desktop-app/compare/v1.2.8-dev.20261027...v1.2.8-dev.20261030'
    );
    expect(changes).toEqual({
      previousTag: 'v1.2.8-dev.20261027',
      previousUrl: `${repoUrl}/releases/tag/v1.2.8-dev.20261027`,
      compareUrl: `${repoUrl}/compare/v1.2.8-dev.20261027...v1.2.8-dev.20261030`,
      totalCommits: 2,
      commits: [
        { sha: 'ccc3333', message: 'newer commit (#5)', url: `${repoUrl}/commit/ccc3333` },
        { sha: 'aaa1111', message: 'older commit', url: `${repoUrl}/commit/aaa1111` },
      ],
    });
  });

  it('counts commits beyond the ones the API returned', async () => {
    stubGitHub({ html_url: `${repoUrl}/compare/a...b`, total_commits: 300, commits: [] });
    const changes = await getInsiderChanges('desktop-app', 'v1.2.8-dev.20261030', client);
    expect(changes?.totalCommits).toBe(300);
  });

  it('returns undefined when the release or a previous build is missing', async () => {
    stubGitHub({});
    expect(await getInsiderChanges('desktop-app', 'v9.9.9', client)).toBeUndefined();
    expect(await getInsiderChanges('desktop-app', 'v1.2.8-dev.20261027', client)).toBeUndefined();
  });

  it('returns undefined for unexpected responses', async () => {
    stubGitHub({}, { message: 'nope' });
    expect(await getInsiderChanges('desktop-app', 'v1.2.8-dev.20261030', client)).toBeUndefined();
  });
});
