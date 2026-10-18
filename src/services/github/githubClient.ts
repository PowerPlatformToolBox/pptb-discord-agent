/**
 * GitHub API client using native fetch
 */

import { loadConfig } from '../../config/config';
import type { GitHubRepositoryInfo } from '../../types/github';
import { GitHubAPIError } from '../../types/errors';
import { getLogger } from '../../utils/logger';

interface GitHubAPIOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
}

export class GitHubClient {
  private readonly baseURL = 'https://api.github.com';
  private readonly logger = getLogger('GitHubClient');

  constructor(
    private readonly token: string,
    private readonly org: string
  ) {}

  public getOrg(): string {
    return this.org;
  }

  public async request<T>(endpoint: string, options: GitHubAPIOptions = {}): Promise<T> {
    const { method = 'GET', body } = options;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'pptb-discord-assistant',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as { message?: string };
      this.logger.error('GitHub API request failed', {
        endpoint,
        method,
        status: response.status,
        error: error.message,
      });
      throw new GitHubAPIError(
        `GitHub API error: ${response.status} ${error.message ?? response.statusText}`,
        { endpoint, status: response.status }
      );
    }

    return (await response.json()) as T;
  }

  public getRepository(repo: string): Promise<GitHubRepositoryInfo> {
    return this.request<GitHubRepositoryInfo>(`/repos/${this.org}/${repo}`);
  }
}

let clientInstance: GitHubClient | null = null;

export function getGitHubClient(): GitHubClient {
  if (!clientInstance) {
    const { github } = loadConfig();
    clientInstance = new GitHubClient(github.token, github.org);
  }
  return clientInstance;
}
