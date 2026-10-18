/**
 * POST /api/github - GitHub webhook receiver
 */

import { loadConfig } from '../config/config';
import { dispatch, type DispatchResult } from '../notifications/dispatcher';
import { verifyGitHubSignature } from '../security/signatures';
import { routeGitHubEvent } from '../sources/github/router';
import type { GitHubWebhookPayload } from '../sources/github/types';
import { createErrorLogObject } from '../utils/errorHelper';
import { getLogger } from '../utils/logger';
import { json, parseJson, readRawBody } from './http';

const logger = getLogger('GitHubWebhook');

export async function handleGitHubWebhook(request: Request): Promise<Response> {
  const config = loadConfig();
  const raw = await readRawBody(request);
  if (raw === null) return json(413, { error: 'Request body too large' });

  if (
    !verifyGitHubSignature(
      config.github.webhookSecret,
      raw,
      request.headers.get('x-hub-signature-256')
    )
  ) {
    logger.warn('Invalid GitHub signature');
    return json(401, { error: 'Invalid signature' });
  }

  const event = request.headers.get('x-github-event') ?? '';
  const delivery = request.headers.get('x-github-delivery') ?? undefined;
  const payload = parseJson(raw) as GitHubWebhookPayload | undefined;
  if (!payload || typeof payload !== 'object') return json(400, { error: 'Invalid JSON' });

  const routed = routeGitHubEvent(event, payload, {
    org: config.github.org,
    watchedLabels: config.github.watchedLabels,
    starsRepository: config.github.starsRepository,
  });

  logger.info('GitHub webhook received', {
    event,
    delivery,
    action: payload.action,
    repo: payload.repository?.full_name,
    notifications: routed.map((r) => r.key),
  });

  const settled = await Promise.allSettled(routed.map((r) => dispatch(r.key, r.data)));
  const results: DispatchResult[] = [];
  let failed = false;

  settled.forEach((outcome, index) => {
    if (outcome.status === 'fulfilled') {
      results.push(outcome.value);
    } else {
      failed = true;
      logger.error('Notification failed', {
        key: routed[index]?.key,
        delivery,
        ...createErrorLogObject(outcome.reason),
      });
    }
  });

  // Non-2xx marks the delivery as failed in GitHub so it can be inspected and redelivered.
  return json(failed ? 500 : 200, { event, results, failed });
}
