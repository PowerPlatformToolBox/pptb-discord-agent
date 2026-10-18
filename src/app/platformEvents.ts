/**
 * POST /api/events - signed events from PPTB platform services (pptb-web, tool-management)
 */

import { ZodError } from 'zod';
import { loadConfig } from '../config/config';
import { findNotification } from '../notifications/catalog';
import { dispatch } from '../notifications/dispatcher';
import {
  PLATFORM_SIGNATURE_HEADER,
  PLATFORM_TIMESTAMP_HEADER,
  verifyPlatformSignature,
} from '../security/signatures';
import { platformEventSchema } from '../sources/platform/envelope';
import { DiscordAPIError } from '../types/errors';
import { createErrorLogObject } from '../utils/errorHelper';
import { getLogger } from '../utils/logger';
import { json, parseJson, readRawBody } from './http';

const logger = getLogger('PlatformEvents');

export async function handlePlatformEvent(request: Request): Promise<Response> {
  const config = loadConfig();
  const raw = await readRawBody(request);
  if (raw === null) return json(413, { error: 'Request body too large' });

  const valid = verifyPlatformSignature(
    config.security.platformEventsSecret,
    raw,
    request.headers.get(PLATFORM_SIGNATURE_HEADER),
    request.headers.get(PLATFORM_TIMESTAMP_HEADER)
  );
  if (!valid) {
    logger.warn('Invalid platform event signature');
    return json(401, { error: 'Invalid signature' });
  }

  const envelope = platformEventSchema.safeParse(parseJson(raw));
  if (!envelope.success) {
    return json(400, { error: 'Invalid event envelope', issues: envelope.error.issues });
  }

  const { type, id, data } = envelope.data;
  const notification = findNotification(type);
  if (!notification || notification.source !== 'platform') {
    return json(400, { error: `Unknown event type "${type}"` });
  }

  try {
    const result = await dispatch(notification.key, data);
    logger.info('Platform event processed', { type, id, status: result.status });
    return json(200, result);
  } catch (error) {
    if (error instanceof ZodError) {
      return json(422, { error: 'Invalid event data', issues: error.issues });
    }
    logger.error('Platform event failed', { type, id, ...createErrorLogObject(error) });
    // 502 tells the producer delivery to Discord failed and a retry may succeed.
    return json(error instanceof DiscordAPIError ? 502 : 500, { error: 'Delivery failed' });
  }
}
