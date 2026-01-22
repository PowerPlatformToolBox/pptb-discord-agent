/**
 * GitHub API client using native fetch
 */

import { getConfig } from '../../config/config';
import { GitHubAPIError } from '../../types/errors';
import { createErrorLogObject } from '../../utils/errorHelper';
import { getLogger } from '../../utils/logger';

interface GitHubAPIOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

interface GitHubErrorResponse {
  message?: string;
  documentation_url?: string;
}

export class GitHubClient {
  private readonly token: string;
  private readonly org: string;
  private readonly baseURL = 'https://api.github.com';
  private readonly logger = getLogger('GitHubClient');

  constructor() {
    const config = getConfig();
    this.token = config.github.token;
    this.org = config.github.org;
    this.logger.info('GitHub client initialized', { org: this.org });
  }

  public getOrg(): string {
    return this.org;
  }

  /**
   * Make authenticated request to GitHub API
   */
  public async request<T>(endpoint: string, options: GitHubAPIOptions = {}): Promise<T> {
    const { method = 'GET', body } = options;

    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'pptb-discord-assistant',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        let errorData: GitHubErrorResponse = {
          message: response.statusText,
        };

        try {
          errorData = await response.json();
        } catch {
          // Use default error message if JSON parsing fails
        }

        this.logger.error('GitHub API request failed', {
          endpoint,
          method,
          status: response.status,
          error: errorData.message,
          documentationUrl: errorData.documentation_url,
        });

        throw new GitHubAPIError(
          `GitHub API error: ${response.status} ${errorData.message || response.statusText}`,
          {
            endpoint,
            status: response.status,
            error: errorData,
          }
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof GitHubAPIError) {
        throw error;
      }

      this.logger.error('GitHub API request error', {
        endpoint,
        method,
        ...createErrorLogObject(error),
      });

      throw new GitHubAPIError('Failed to make GitHub API request', {
        endpoint,
        error,
      });
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.request('/user');
      this.logger.info('GitHub API connection test successful', { org: this.org });
      return true;
    } catch (error) {
      this.logger.error('GitHub API connection test failed', {
        org: this.org,
        ...createErrorLogObject(error),
      });
      throw new GitHubAPIError('Failed to connect to GitHub API', { error });
    }
  }
}

let clientInstance: GitHubClient | null = null;

export function getGitHubClient(): GitHubClient {
  if (!clientInstance) {
    clientInstance = new GitHubClient();
  }
  return clientInstance;
}
