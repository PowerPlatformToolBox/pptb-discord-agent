/**
 * Local development server: serves the same handlers Vercel deploys from api/.
 * Use a tunnel (e.g. ngrok) to receive GitHub webhooks or Discord interactions locally.
 */

import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { ROUTES } from '../app/routes';
import { createErrorLogObject } from '../utils/errorHelper';
import { getLogger } from '../utils/logger';

const logger = getLogger('DevServer');
const port = Number(process.env.PORT ?? 3000);

async function toRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(`http://localhost:${port}${req.url ?? '/'}`, {
    method: req.method,
    headers,
    body: hasBody ? Buffer.concat(chunks) : undefined,
  });
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const request = await toRequest(req);
  const pathname = new URL(request.url).pathname;
  const isLandingPage = pathname === '/' || pathname === '/index.html';
  const route = isLandingPage
    ? {
        GET: async (): Promise<Response> =>
          new Response(await readFile(resolve(__dirname, '../../public/index.html'), 'utf8'), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }),
      }
    : ROUTES[pathname];
  const handler = route?.[request.method as 'GET' | 'POST'];

  const response = handler
    ? await handler(request)
    : new Response(JSON.stringify({ error: route ? 'Method not allowed' : 'Not found' }), {
        status: route ? 405 : 404,
      });

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
  logger.info(`${request.method} ${new URL(request.url).pathname} ${response.status}`);
}

export function createDevServer(): Server {
  return createServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      logger.error('Unhandled request error', createErrorLogObject(error));
      res.writeHead(500).end();
    });
  });
}

if (require.main === module) {
  createDevServer().listen(port, () =>
    logger.info(`Dev server listening on http://localhost:${port}`)
  );
}
