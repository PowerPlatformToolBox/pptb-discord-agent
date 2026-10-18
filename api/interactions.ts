import { handleInteraction } from '../src/app/interactions';

export function POST(request: Request): Promise<Response> {
  return handleInteraction(request);
}
