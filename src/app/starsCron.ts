/**
 * GET /api/cron/stars - daily reconciliation of the stars channel (Vercel Cron)
 *
 * Star webhooks keep the count live, but renames are rate limited (~2 per 10 minutes), so some
 * updates are skipped. This job re-syncs the channel with the real count once a day.
 */

import { loadConfig } from '../config/config';
import { dispatch } from '../notifications/dispatcher';
import { verifyBearer } from '../security/signatures';
import { getGitHubClient } from '../services/github/githubClient';
import { createErrorLogObject } from '../utils/errorHelper';
import { getLogger } from '../utils/logger';
import { json } from './http';

export async function handleStarsCron(request: Request): Promise<Response> {
  const config = loadConfig();
  if (!verifyBearer(config.security.cronSecret, request.headers.get('authorization'))) {
    return json(401, { error: 'Unauthorized' });
  }

  try {
    const repo = await getGitHubClient().getRepository(config.github.starsRepository);
    const result = await dispatch('github.stars', {
      repository: repo.full_name,
      stars: repo.stargazers_count,
    });
    return json(200, result);
  } catch (error) {
    getLogger('StarsCron').error('Stars sync failed', createErrorLogObject(error));
    return json(500, { error: 'Stars sync failed' });
  }
}
