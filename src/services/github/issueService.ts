/**
 * GitHub issue management service
 */

import type {
  CreateIssueParams,
  CreateIssueResult,
  GitHubIssue,
  GitHubServiceResult,
} from '../../types/github';
import { ValidationError } from '../../types/errors';
import { getErrorMessage } from '../../utils/errorHelper';
import { getLogger } from '../../utils/logger';
import { sanitizeIssueInput, validateLabels, validateRepoName } from '../../utils/validators';
import { getGitHubClient, type GitHubClient } from './githubClient';

export class GitHubIssueService {
  private readonly logger = getLogger('GitHubIssueService');

  constructor(private readonly client: GitHubClient) {}

  public async createIssue(
    params: CreateIssueParams
  ): Promise<GitHubServiceResult<CreateIssueResult>> {
    const owner = this.client.getOrg();
    try {
      if (!validateRepoName(params.repo)) {
        throw new ValidationError('Invalid repository name', { repo: params.repo });
      }

      const issue = await this.client.request<GitHubIssue>(
        `/repos/${owner}/${params.repo}/issues`,
        {
          method: 'POST',
          body: {
            title: sanitizeIssueInput(params.title),
            body: sanitizeIssueInput(params.body),
            labels: params.labels ? validateLabels(params.labels) : [],
          },
        }
      );

      this.logger.info('GitHub issue created', {
        owner,
        repo: params.repo,
        issueNumber: issue.number,
      });

      return { success: true, data: { url: issue.html_url, number: issue.number } };
    } catch (error) {
      this.logger.error('Failed to create GitHub issue', {
        error: getErrorMessage(error),
        owner,
        repo: params.repo,
      });
      return { success: false, error: getErrorMessage(error) };
    }
  }
}

let serviceInstance: GitHubIssueService | null = null;

export function getGitHubIssueService(): GitHubIssueService {
  if (!serviceInstance) {
    serviceInstance = new GitHubIssueService(getGitHubClient());
  }
  return serviceInstance;
}
