import { handlePlatformEvent } from '../src/app/platformEvents';

export function POST(request: Request): Promise<Response> {
  return handlePlatformEvent(request);
}
