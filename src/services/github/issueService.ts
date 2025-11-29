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

      const issue = await this.client.request<GitHubIssue>(
        `/repos/${this.client.getOrg()}/${params.repo}/issues`,
        {
          method: 'POST',
          body: {
            title,
            body,
            labels,
          },
        }
      );

      this.logger.info('GitHub issue created', {
        repo: params.repo,
        issueNumber: issue.number,
        url: issue.html_url,
      });

      return {
        success: true,
        data: {
          issue,
          url: issue.html_url,
          number: issue.number,
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
      const repos = await this.client.request<Array<{
        name: string;
        description: string | null;
        html_url: string;
        stargazers_count: number;
        language: string | null;
      }>>(`/orgs/${this.client.getOrg()}/repos?type=all&sort=updated&per_page=10`);

      const repositories: GitHubRepository[] = repos.map((repo) => ({
        name: repo.name,
        description: repo.description ?? undefined,
        html_url: repo.html_url,
        stargazers_count: repo.stargazers_count ?? 0,
        language: repo.language ?? undefined,
      }));

      return {
        success: true,
        data: repositories,
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
      const issue = await this.client.request<GitHubIssue>(
        `/repos/${this.client.getOrg()}/${repo}/issues/${issueNumber}`
      );

      return {
        success: true,
        data: issue,
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

      const response = await this.client.request(
        `/repos/${this.client.getOrg()}/${repo}/issues/${issueNumber}/comments`,
        {
          method: 'POST',
          body: {
            body: sanitizedComment,
          },
        }
      );

      this.logger.info('Comment added to issue', {
        repo,
        issueNumber,
      });

      return {
        success: true,
        data: response,
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