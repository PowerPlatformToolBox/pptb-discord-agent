/**
 * Maps GitHub webhook deliveries to catalog notifications (pure; no I/O)
 */

import type { NotificationKey } from '../../notifications/catalog';
import type { GitHubWebhookPayload } from './types';

export interface RoutedNotification {
  key: NotificationKey;
  data: unknown;
}

export interface GitHubRoutingOptions {
  org: string;
  watchedLabels: string[];
  starsRepository: string;
}

/**
 * Repository name -> release notifications. Repositories not listed here are never announced.
 */
export const RELEASE_REPOSITORIES: Record<
  string,
  { stable?: NotificationKey; prerelease?: NotificationKey }
> = {
  'desktop-app': { stable: 'pptb.new-release', prerelease: 'pptb.insider' },
  'vscode-extension': { stable: 'vscode.new-release' },
};

export function routeGitHubEvent(
  event: string,
  payload: GitHubWebhookPayload,
  options: GitHubRoutingOptions
): RoutedNotification[] {
  const repo = payload.repository;
  if (!repo) return [];
  if (repo.owner && repo.owner.login.toLowerCase() !== options.org.toLowerCase()) return [];

  switch (event) {
    case 'release': {
      const release = payload.release;
      if (payload.action !== 'published' || !release || release.draft) return [];
      const mapping = RELEASE_REPOSITORIES[repo.name];
      const key = release.prerelease ? mapping?.prerelease : mapping?.stable;
      if (!key) return [];
      return [
        {
          key,
          data: {
            repository: repo.name,
            repositoryUrl: repo.html_url,
            tagName: release.tag_name,
            body: release.body ?? '',
            url: release.html_url,
          },
        },
      ];
    }

    case 'issues':
    case 'pull_request': {
      const item = event === 'issues' ? payload.issue : payload.pull_request;
      const label = payload.label?.name;
      if (payload.action !== 'labeled' || !item || !label) return [];
      if (!options.watchedLabels.includes(label)) return [];
      return [
        {
          key: 'github.discussion-thread',
          data: {
            repository: repo.full_name,
            kind: event === 'issues' ? 'Issue' : 'PR',
            number: item.number,
            title: item.title,
            body: item.body,
            url: item.html_url,
            author: { login: item.user.login, avatarUrl: item.user.avatar_url },
            label,
            labels: (item.labels ?? []).map((l) => l.name),
          },
        },
      ];
    }

    case 'star': {
      if (payload.action !== 'created' && payload.action !== 'deleted') return [];
      if (repo.name !== options.starsRepository) return [];
      if (repo.stargazers_count === undefined) return [];
      return [
        { key: 'github.stars', data: { repository: repo.full_name, stars: repo.stargazers_count } },
      ];
    }

    default:
      return [];
  }
}
