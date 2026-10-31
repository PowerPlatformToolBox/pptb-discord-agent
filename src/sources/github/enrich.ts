/**
 * Adds data that needs GitHub API calls to routed notifications (best effort)
 */

import { getInsiderChanges } from '../../services/github/releaseService';
import { createErrorLogObject } from '../../utils/errorHelper';
import { getLogger } from '../../utils/logger';
import type { RoutedNotification } from './router';

const logger = getLogger('GitHubEnrich');

/**
 * Insider builds get the commits since the previous insider build. On failure the notification
 * is returned unchanged and the card falls back to the release notes.
 */
export async function enrichNotification(routed: RoutedNotification): Promise<RoutedNotification> {
  if (routed.key !== 'pptb.insider') return routed;

  const data = routed.data as { repository: string; tagName: string };
  try {
    const changes = await getInsiderChanges(data.repository, data.tagName);
    return changes ? { ...routed, data: { ...data, ...changes } } : routed;
  } catch (error) {
    logger.warn('Insider commit lookup failed, using release notes', {
      repository: data.repository,
      tagName: data.tagName,
      ...createErrorLogObject(error),
    });
    return routed;
  }
}
