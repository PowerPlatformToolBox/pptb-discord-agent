/**
 * GitHub webhook type definitions
 */

export interface GitHubWebhookPayload {
  action: string;
  sender: {
    login: string;
    avatar_url: string;
  };
  repository: {
    name: string;
    full_name: string;
    html_url: string;
    stargazers_count?: number;
    owner?: {
      login: string;
      avatar_url: string;
    };
  };
  projects_v2_item?: {
    id: string;
    node_id: string;
  };
  release?: {
    tag_name: string;
    name: string;
    body: string;
    html_url: string;
    draft: boolean;
    prerelease: boolean;
    published_at: string;
    zipball_url: string;
    tarball_url: string;
    author: {
      login: string;
      avatar_url: string;
      html_url: string;
    };
    assets?: Array<{
      name: string;
      browser_download_url: string;
      size: number;
      download_count: number;
    }>;
  };
  issue?: {
    number: number;
    title: string;
    body: string;
    html_url: string;
    labels: Array<{ name: string; color: string }>;
    user: {
      login: string;
      avatar_url: string;
    };
  };
  pull_request?: {
    number: number;
    title: string;
    body: string;
    html_url: string;
    user: {
      login: string;
      avatar_url: string;
    };
  };
}
