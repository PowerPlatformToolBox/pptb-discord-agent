/**
 * GitHub API client wrapper using Octokit
 */

import { Octokit } from '@octokit/rest';
import { getConfig } from '../../config/config';
import { getLogger } from '../../utils/logger';
import { GitHubAPIError } from '../../types/errors';

export class GitHubClient {
  private octokit: Octokit;
  private readonly org: string;
  private readonly logger = getLogger();

  constructor() {
    const config = getConfig();
    this.octokit = new Octokit({
      auth: config.github.token,
    });
    this.org = config.github.org;
    this.logger.info('GitHub client initialized', { org: this.org });
  }

  public getOrg(): string {
    return this.org;
  }

  public getOctokit(): Octokit {
    return this.octokit;
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.octokit.rest.users.getAuthenticated();
      this.logger.info('GitHub API connection test successful');
      return true;
    } catch (error) {
      this.logger.error('GitHub API connection test failed', { error });
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