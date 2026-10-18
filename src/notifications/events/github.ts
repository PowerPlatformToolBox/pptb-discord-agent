/**
 * GitHub-driven automations (producer: GitHub webhooks / stars cron)
 */

import { z } from 'zod';
import { COLORS } from '../../config/constants';
import { defineNotification } from '../types';
import { httpUrl } from '../shared';

export const githubDiscussionThread = defineNotification({
  key: 'github.discussion-thread',
  category: 'GitHub',
  event: 'DiscussionThread',
  description: 'Discussion thread created when a watched label is added to an issue or PR',
  enabled: true,
  channel: 'discussions',
  source: 'github',
  schema: z.object({
    repository: z.string().min(1),
    kind: z.enum(['Issue', 'PR']),
    number: z.number().int().positive(),
    title: z.string().min(1),
    body: z.string().nullish(),
    url: httpUrl,
    author: z.object({ login: z.string(), avatarUrl: httpUrl.optional() }),
    label: z.string().min(1),
    labels: z.array(z.string()),
  }),
  example: {
    repository: 'PowerPlatformToolBox/desktop-app',
    kind: 'Issue',
    number: 42,
    title: 'Add dark mode toggle',
    body: 'It would be great to…',
    url: 'https://github.com/PowerPlatformToolBox/desktop-app/issues/42',
    author: { login: 'octocat' },
    label: 'DiscordDiscussion',
    labels: ['enhancement', 'DiscordDiscussion'],
  },
  delivery: {
    kind: 'thread',
    render: (item) => {
      const dedupeKey = `[${item.repository.split('/').pop()}#${item.number}]`;
      return {
        dedupeKey,
        threadName: `${dedupeKey} ${item.title}`,
        message: {
          content: `Discussion thread for ${item.repository} ${item.kind} #${item.number}`,
          embeds: [
            {
              title: `${item.kind} #${item.number}: ${item.title}`,
              url: item.url,
              description: item.body?.slice(0, 500) || 'No description provided',
              color: COLORS.PRIMARY,
              fields: [
                { name: 'Repository', value: item.repository, inline: true },
                { name: 'Author', value: item.author.login, inline: true },
                { name: 'Triggering Label', value: item.label, inline: true },
                { name: 'All Labels', value: item.labels.join(', ') || 'None', inline: false },
              ],
              thumbnail: item.author.avatarUrl ? { url: item.author.avatarUrl } : undefined,
              timestamp: new Date().toISOString(),
            },
          ],
        },
      };
    },
  },
});

export const githubStars = defineNotification({
  key: 'github.stars',
  category: 'GitHub',
  event: 'Stars',
  description: 'Voice channel renamed with the repository star count',
  enabled: true,
  channel: 'stars',
  source: 'github',
  schema: z.object({ repository: z.string().min(1), stars: z.number().int().nonnegative() }),
  example: { repository: 'PowerPlatformToolBox/desktop-app', stars: 1234 },
  delivery: {
    kind: 'channel-name',
    render: ({ stars }) => `⭐ ${stars.toLocaleString('en-US')}`,
  },
});

export const GITHUB_NOTIFICATIONS = [githubDiscussionThread, githubStars] as const;
