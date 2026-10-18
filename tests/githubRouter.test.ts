import { describe, expect, it } from '@jest/globals';
import { routeGitHubEvent } from '../src/sources/github/router';
import type { GitHubWebhookPayload } from '../src/sources/github/types';

const options = {
  org: 'PowerPlatformToolBox',
  watchedLabels: ['DiscordDiscussion'],
  starsRepository: 'desktop-app',
};

function repo(name: string, owner = 'PowerPlatformToolBox') {
  return {
    name,
    full_name: `${owner}/${name}`,
    html_url: `https://github.com/${owner}/${name}`,
    owner: { login: owner },
    stargazers_count: 77,
  };
}

function release(name: string, prerelease: boolean, extra: Partial<GitHubWebhookPayload> = {}) {
  return {
    action: 'published',
    repository: repo(name),
    release: {
      tag_name: 'v1.0.0',
      body: 'notes',
      html_url: `https://github.com/PowerPlatformToolBox/${name}/releases/tag/v1.0.0`,
      draft: false,
      prerelease,
    },
    ...extra,
  } as GitHubWebhookPayload;
}

const item = {
  number: 7,
  title: 'Title',
  body: 'Body',
  html_url: 'https://github.com/PowerPlatformToolBox/desktop-app/pull/7',
  user: { login: 'octocat', avatar_url: 'https://avatars.githubusercontent.com/u/1' },
  labels: [{ name: 'DiscordDiscussion' }],
};

describe('routeGitHubEvent', () => {
  it('maps desktop-app releases to stable and insider notifications', () => {
    expect(routeGitHubEvent('release', release('desktop-app', false), options)[0]?.key).toBe(
      'pptb.new-release'
    );
    expect(routeGitHubEvent('release', release('desktop-app', true), options)[0]?.key).toBe(
      'pptb.insider'
    );
  });

  it('maps vscode-extension releases and ignores its pre-releases', () => {
    expect(routeGitHubEvent('release', release('vscode-extension', false), options)[0]?.key).toBe(
      'vscode.new-release'
    );
    expect(routeGitHubEvent('release', release('vscode-extension', true), options)).toEqual([]);
  });

  it('ignores unmapped repos, drafts, other actions and other orgs', () => {
    expect(routeGitHubEvent('release', release('pptb-web', false), options)).toEqual([]);
    const draft = release('desktop-app', false);
    draft.release = { ...draft.release!, draft: true };
    expect(routeGitHubEvent('release', draft, options)).toEqual([]);
    expect(
      routeGitHubEvent('release', release('desktop-app', false, { action: 'created' }), options)
    ).toEqual([]);
    expect(
      routeGitHubEvent(
        'release',
        release('desktop-app', false, { repository: repo('desktop-app', 'someone-else') }),
        options
      )
    ).toEqual([]);
  });

  it('creates threads for pull requests labelled with a watched label', () => {
    const payload = {
      action: 'labeled',
      label: { name: 'DiscordDiscussion' },
      pull_request: item,
      repository: repo('desktop-app'),
    } as GitHubWebhookPayload;
    const [routed] = routeGitHubEvent('pull_request', payload, options);
    expect(routed?.key).toBe('github.discussion-thread');
    expect(routed?.data).toMatchObject({ kind: 'PR', number: 7, label: 'DiscordDiscussion' });
  });

  it('only reacts to the label that was just added', () => {
    const payload = {
      action: 'labeled',
      label: { name: 'bug' },
      issue: item,
      repository: repo('desktop-app'),
    } as GitHubWebhookPayload;
    expect(routeGitHubEvent('issues', payload, options)).toEqual([]);
  });

  it('updates stars only for STARS_REPOSITORY', () => {
    const star = (name: string) =>
      ({ action: 'created', repository: repo(name) }) as GitHubWebhookPayload;
    expect(routeGitHubEvent('star', star('desktop-app'), options)).toEqual([
      { key: 'github.stars', data: { repository: 'PowerPlatformToolBox/desktop-app', stars: 77 } },
    ]);
    expect(routeGitHubEvent('star', star('pptb-web'), options)).toEqual([]);
  });
});
