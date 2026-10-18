/**
 * Subset of GitHub webhook payloads used by the bot
 */

interface GitHubUser {
  login: string;
  avatar_url?: string;
}

interface GitHubLabel {
  name: string;
}

interface GitHubIssueLike {
  number: number;
  title: string;
  body?: string | null;
  html_url: string;
  user: GitHubUser;
  labels?: GitHubLabel[];
}

export interface GitHubWebhookPayload {
  action?: string;
  repository?: {
    name: string;
    full_name: string;
    html_url: string;
    stargazers_count?: number;
    owner?: GitHubUser;
  };
  label?: GitHubLabel;
  issue?: GitHubIssueLike;
  pull_request?: GitHubIssueLike;
  release?: {
    tag_name: string;
    name?: string | null;
    body?: string | null;
    html_url: string;
    draft: boolean;
    prerelease: boolean;
  };
}
