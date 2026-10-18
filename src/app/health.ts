/**
 * GET /api/health - liveness and configuration check
 */

import { BOT_NAME } from '../config/constants';
import { loadConfig } from '../config/config';
import { NOTIFICATIONS } from '../notifications/catalog';
import { isNotificationEnabled, resolveChannelId } from '../notifications/settings';
import { createErrorLogObject } from '../utils/errorHelper';
import { getLogger } from '../utils/logger';
import { json } from './http';

export function handleHealth(): Response {
  try {
    const config = loadConfig();
    const notifications = NOTIFICATIONS.map((n) => {
      resolveChannelId(n, config); // throws on a bad NOTIFICATION_ROUTES entry
      return { key: n.key, enabled: isNotificationEnabled(n, config) };
    });
    return json(200, { status: 'ok', bot: BOT_NAME, notifications });
  } catch (error) {
    // Details go to logs only; the public response stays generic.
    getLogger('Health').error('Configuration invalid', createErrorLogObject(error));
    return json(503, { status: 'misconfigured', bot: BOT_NAME });
  }
}
