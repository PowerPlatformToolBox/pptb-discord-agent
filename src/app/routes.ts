/**
 * Route table shared by the local dev server (Vercel maps api/*.ts files to the same paths)
 */

import { handleGitHubWebhook } from './githubWebhook';
import { handleHealth } from './health';
import { handleInteraction } from './interactions';
import { handlePlatformEvent } from './platformEvents';
import { handleStarsCron } from './starsCron';

export type Handler = (request: Request) => Response | Promise<Response>;

export const ROUTES: Record<string, Partial<Record<'GET' | 'POST', Handler>>> = {
  '/api/github': { POST: handleGitHubWebhook },
  '/api/events': { POST: handlePlatformEvent },
  '/api/interactions': { POST: handleInteraction },
  '/api/health': { GET: handleHealth },
  '/api/cron/stars': { GET: handleStarsCron },
};
