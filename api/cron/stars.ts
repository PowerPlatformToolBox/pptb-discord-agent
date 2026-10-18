import { handleStarsCron } from '../../src/app/starsCron';

export function GET(request: Request): Promise<Response> {
  return handleStarsCron(request);
}
