/**
 * GitHub issue management service
 */

import { getGitHubClient } from './githubClient';
import { getLogger } from '../../utils/logger';
import { GitHubAPIError } from '../../types/errors';
import { sanitizeIssueInput, validateLabels, validateRepoName } from '../../utils/validators';
import type {
  GitHubServiceResult,
  CreateIssueResult,
  CreateIssueParams,
  GitHubIssue,
  GitHubRepository,
} from '../../types';

export class GitHubIssueService {
  private readonly logger = getLogger();
  private readonly client = getGitHubClient();

  public async createIssue(
    params: CreateIssueParams
  ): Promise<GitHubServiceResult<CreateIssueResult>> {
    try {
      if (!validateRepoName(params.repo)) {
        throw new GitHubAPIError('Invalid repository name', { repo: params.repo });
      }

      const title = sanitizeIssueInput(params.title);
      const body = sanitizeIssueInput(params.body);
      const labels = params.labels ? validateLabels(params.labels) : [];

      const response = await this.client.getOctokit().rest.issues.create({
        owner: this.client.getOrg(),
        repo: params.repo,
        title,
        body,
        labels,
      });

      this.logger.info('GitHub issue created', {
        repo: params.repo,
        issueNumber: response.data.number,
        url: response.data.html_url,
      });

      return {
        success: true,
        data: {
          issue: response.data as GitHubIssue,
          url: response.data.html_url,
          number: response.data.number,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create GitHub issue', {
        error: error instanceof Error ? error.message : 'Unknown error',
        repo: params.repo,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async listRepositories(): Promise<GitHubServiceResult<GitHubRepository[]>> {
    try {
      const response = await this.client.getOctokit().rest.repos.listForOrg({
        org: this.client.getOrg(),
        type: 'all',
        sort: 'updated',
        per_page: 10,
      });

      const repos: GitHubRepository[] = response.data.map((repo) => ({
        name: repo.name,
        description: repo.description ?? undefined,
        html_url: repo.html_url,
        stargazers_count: repo.stargazers_count ?? 0,
        language: repo.language ?? undefined,
      }));

      return {
        success: true,
        data: repos,
      };
    } catch (error) {
      this.logger.error('Failed to list repositories', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async getIssue(
    repo: string,
    issueNumber: number
  ): Promise<GitHubServiceResult<GitHubIssue>> {
    try {
      const response = await this.client.getOctokit().rest.issues.get({
        owner: this.client.getOrg(),
        repo,
        issue_number: issueNumber,
      });

      return {
        success: true,
        data: response.data as GitHubIssue,
      };
    } catch (error) {
      this.logger.error('Failed to get issue', {
        error: error instanceof Error ? error.message : 'Unknown error',
        repo,
        issueNumber,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async addComment(
    repo: string,
    issueNumber: number,
    comment: string
  ): Promise<GitHubServiceResult<unknown>> {
    try {
      const sanitizedComment = sanitizeIssueInput(comment);

      const response = await this.client.getOctokit().rest.issues.createComment({
        owner: this.client.getOrg(),
        repo,
        issue_number: issueNumber,
        body: sanitizedComment,
      });

      this.logger.info('Comment added to issue', {
        repo,
        issueNumber,
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to add comment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        repo,
        issueNumber,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

let serviceInstance: GitHubIssueService | null = null;

export function getGitHubIssueService(): GitHubIssueService {
  if (!serviceInstance) {
    serviceInstance = new GitHubIssueService();
  }
  return serviceInstance;
}