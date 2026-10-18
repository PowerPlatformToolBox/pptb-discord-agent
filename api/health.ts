import { handleHealth } from '../src/app/health';

export function GET(): Response {
  return handleHealth();
}
