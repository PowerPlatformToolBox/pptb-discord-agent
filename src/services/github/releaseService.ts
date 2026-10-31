/**
 * Release lookups: commits included in an insider build
 */

import type { GitHubComparison, GitHubRelease } from '../../types/github';
import { getGitHubClient, type GitHubClient } from './githubClient';

export interface ReleaseCommit {
  sha: string;
  /** First line of the commit message */
  message: string;
  url: string;
}

export interface InsiderChanges {
  previousTag: string;
  previousUrl: string;
  compareUrl: string;
  /** Non-merge commits since the previous insider build */
  totalCommits: number;
  /** Newest first */
  commits: ReleaseCommit[];
}

/**
 * Commits between the previous insider (pre-release) build and `tagName`. Returns undefined when
 * the release or a previous insider build can't be found.
 */
export async function getInsiderChanges(
  repo: string,
  tagName: string,
  client: GitHubClient = getGitHubClient()
): Promise<InsiderChanges | undefined> {
  const base = `/repos/${client.getOrg()}/${repo}`;
  const releases = await client.request<GitHubRelease[]>(`${base}/releases?per_page=20`);
  if (!Array.isArray(releases)) return undefined;

  // Releases are listed newest first; the previous build is the next pre-release after this one.
  const index = releases.findIndex((release) => release.tag_name === tagName);
  if (index === -1) return undefined;
  const previous = releases
    .slice(index + 1)
    .find((release) => release.prerelease && !release.draft);
  if (!previous) return undefined;

  const comparison = await client.request<GitHubComparison>(
    `${base}/compare/${encodeURIComponent(previous.tag_name)}...${encodeURIComponent(tagName)}`
  );
  if (!Array.isArray(comparison.commits)) return undefined;

  // Same as the insider workflow's `git log --no-merges`. The API returns oldest first.
  const commits = comparison.commits.filter((commit) => (commit.parents?.length ?? 0) <= 1);
  const unlisted = Math.max(0, comparison.total_commits - comparison.commits.length);

  return {
    previousTag: previous.tag_name,
    previousUrl: previous.html_url,
    compareUrl: comparison.html_url,
    totalCommits: commits.length + unlisted,
    commits: commits.reverse().map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message.split('\n')[0]?.trim() ?? '',
      url: commit.html_url,
    })),
  };
}
