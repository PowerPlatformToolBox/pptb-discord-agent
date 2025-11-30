/**
 * GitHub-related type definitions
 */

export interface GitHubIssue {
  number: number;
  title: string;
  body?: string;
  html_url: string;
  state: string;
  created_at: string;
  labels: Array<{ name: string }>;
}

export interface GitHubRepository {
  name: string;
  description?: string;
  html_url: string;
  stargazers_count: number;
  language?: string;
}

export interface CreateIssueParams {
  repo: string;
  title: string;
  body: string;
  labels?: string[];
  owner?: string; // Optional owner override (defaults to configured org)
}

export interface GitHubServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateIssueResult {
  issue: GitHubIssue;
  url: string;
  number: number;
}