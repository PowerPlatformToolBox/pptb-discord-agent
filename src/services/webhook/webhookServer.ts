/**
 * GitHub webhook HTTP server
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getLogger } from '../../utils/logger';
import { loadWebhookConfig } from '../../config/webhook';
import type { GitHubWebhookPayload } from '../../types/webhook';
import type { Client } from 'discord.js';

export class WebhookServer {
  private readonly logger = getLogger();
  private readonly config = loadWebhookConfig();
  private server: ReturnType<typeof createServer> | null = null;
  private discordClient: Client | null = null;

  constructor(
    private readonly handlers: Map<string, (payload: GitHubWebhookPayload) => Promise<void>>
  ) {}

  public setDiscordClient(client: Client): void {
    this.discordClient = client;
  }

  public start(): void {
    this.server = createServer((req, res) => void this.handleRequest(req, res));

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
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
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
          await handler(payload);
        } else {
          this.logger.debug('No handler for event', { event });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        this.logger.error('Webhook processing error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
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
  handlers: Map<string, (payload: GitHubWebhookPayload) => Promise<void>>
): WebhookServer {
  if (!webhookServerInstance) {
    webhookServerInstance = new WebhookServer(handlers);
  }
  return webhookServerInstance;
}

export function getWebhookServer(): WebhookServer | null {
  return webhookServerInstance;
}