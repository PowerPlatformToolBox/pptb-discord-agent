import { handleGitHubWebhook } from '../src/app/githubWebhook';

export function POST(request: Request): Promise<Response> {
  return handleGitHubWebhook(request);
}
