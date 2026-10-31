/**
 * GitHub API type definitions
 */

export interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
}

export interface GitHubRepositoryInfo {
  name: string;
  full_name: string;
  stargazers_count: number;
}

export interface CreateIssueParams {
  repo: string;
  title: string;
  body: string;
  labels?: string[];
}

export interface GitHubServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateIssueResult {
  url: string;
  number: number;
}

export interface GitHubRelease {
  tag_name: string;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
}

export interface GitHubCompareCommit {
  sha: string;
  html_url: string;
  commit: { message: string };
  parents?: Array<{ sha: string }>;
}

export interface GitHubComparison {
  html_url: string;
  total_commits: number;
  commits: GitHubCompareCommit[];
}
