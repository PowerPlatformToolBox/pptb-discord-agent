/**
 * GitHub webhook HTTP server
 */

import type { Client } from 'discord.js';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { getConfig } from '../../config/config';
import { pptbEventSchema, type PptbEvent } from '../../types/pptbEvents';
import type { GitHubWebhookPayload } from '../../types/webhook';
import { createErrorLogObject } from '../../utils/errorHelper';
import { LoggerFactory } from '../../utils/logger';
import { PPTB_SIGNATURE_HEADER, PPTB_TIMESTAMP_HEADER, verifyPptbSignature } from './pptbSignature';

export type PptbEventListener = (event: PptbEvent) => Promise<unknown>;

export class WebhookServer {
  private readonly logger = LoggerFactory.forService('WebhookServer');
  private readonly config = getConfig().webhook;
  private server: ReturnType<typeof createServer> | null = null;
  private discordClient: Client | null = null;

  constructor(
    private readonly handlers: Map<string, (payload: GitHubWebhookPayload) => Promise<void>>,
    private readonly pptbEventListener?: PptbEventListener
  ) {}

  public setDiscordClient(client: Client): void {
    this.discordClient = client;
  }

  public start(): void {
    this.server = createServer((req, res) => {
      // Set request timeout to 30 seconds
      req.setTimeout(30000, () => {
        this.logger.warn('Request timeout', { url: req.url });
        res.writeHead(408, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Request timeout' }));
      });
      void this.handleRequest(req, res);
    });

    this.server.listen(this.config.port, () => {
      this.logger.info('Webhook server started', { port: this.config.port });
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
      this.logger.info('Webhook server stopped');
    }
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Health check endpoint for Railway
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'healthy',
          uptime: process.uptime(),
          discord: this.discordClient?.isReady() ? 'connected' : 'connecting',
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    // Request body size limit (10MB for GitHub webhooks)
    const MAX_BODY_SIZE = 10 * 1024 * 1024;
    let body = '';
    let bodySize = 0;
    let requestTerminated = false;

    req.on('data', (chunk) => {
      if (requestTerminated) {
        return; // Ignore further data if request was terminated
      }

      bodySize += chunk.length;
      if (bodySize > MAX_BODY_SIZE) {
        this.logger.warn('Request body too large', { size: bodySize });
        requestTerminated = true;
        req.destroy();
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Request body too large' }));
        return;
      }
      body += chunk.toString();
    });

    req.on('end', async () => {
      // Skip processing if request was terminated due to size limit
      if (requestTerminated) {
        return;
      }

      if (req.url === '/pptb-events') {
        await this.handlePptbEvent(req, res, body);
        return;
      }

      try {
        // Verify signature if secret is configured
        if (this.config.secret) {
          const signature = req.headers['x-hub-signature-256'] as string;
          if (!signature || !this.verifySignature(body, signature)) {
            this.logger.warn('Invalid webhook signature');
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid signature' }));
            return;
          }
        }

        const event = req.headers['x-github-event'] as string;
        const payload: GitHubWebhookPayload = JSON.parse(body);

        this.logger.info('Webhook received', {
          event,
          action: payload.action,
          repo: payload.repository?.name,
        });

        const handler = this.handlers.get(event);
        if (handler) {
          this.logger.info('Calling handler', { event, handler: handler.name || 'anonymous' });
          try {
            await handler(payload);
            this.logger.info('Handler executed successfully', { event });
          } catch (handlerError) {
            this.logger.error('Handler threw error', {
              event,
              ...createErrorLogObject(handlerError),
            });
            throw handlerError;
          }
        } else {
          this.logger.debug('No handler for event', { event });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        this.logger.error('Webhook processing error', {
          ...createErrorLogObject(error),
        });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  }

  private async handlePptbEvent(
    req: IncomingMessage,
    res: ServerResponse,
    body: string
  ): Promise<void> {
    const reply = (status: number, payload: Record<string, unknown>): void => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    };

    const signed = verifyPptbSignature(
      this.config.pptbEventsSecret,
      body,
      req.headers[PPTB_TIMESTAMP_HEADER] as string | undefined,
      req.headers[PPTB_SIGNATURE_HEADER] as string | undefined
    );
    if (!signed) {
      this.logger.warn('Invalid PPTB event signature');
      reply(401, { error: 'Invalid signature' });
      return;
    }

    let parsed;
    try {
      parsed = pptbEventSchema.safeParse(JSON.parse(body));
    } catch {
      reply(400, { error: 'Invalid JSON' });
      return;
    }
    if (!parsed.success) {
      const issues = parsed.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      this.logger.warn('Invalid PPTB event payload', { issues });
      reply(400, { error: 'Invalid payload', issues });
      return;
    }

    if (!this.pptbEventListener) {
      reply(503, { error: 'PPTB events are not enabled' });
      return;
    }

    try {
      const result = await this.pptbEventListener(parsed.data);
      reply(200, { success: true, result });
    } catch (error) {
      this.logger.error('PPTB event processing error', {
        id: parsed.data.id,
        ...createErrorLogObject(error),
      });
      reply(500, { error: 'Internal server error' });
    }
  }

  private verifySignature(body: string, signature: string): boolean {
    if (!this.config.secret) return true;

    const hmac = createHmac('sha256', this.config.secret);
    const digest = 'sha256=' + hmac.update(body).digest('hex');

    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
    } catch {
      return false;
    }
  }

  public getDiscordClient(): Client | null {
    return this.discordClient;
  }
}

let webhookServerInstance: WebhookServer | null = null;

export function createWebhookServer(
  handlers: Map<string, (payload: GitHubWebhookPayload) => Promise<void>>,
  pptbEventListener?: PptbEventListener
): WebhookServer {
  if (!webhookServerInstance) {
    webhookServerInstance = new WebhookServer(handlers, pptbEventListener);
  }
  return webhookServerInstance;
}

export function getWebhookServer(): WebhookServer | null {
  return webhookServerInstance;
}
