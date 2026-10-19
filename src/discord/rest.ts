/**
 * Minimal Discord REST client (serverless friendly: no gateway, no caches, no timers)
 */

import {
  ChannelType,
  Routes,
  ThreadAutoArchiveDuration,
  type APIChannel,
  type APIGuildMember,
  type APIMessage,
  type APIThreadChannel,
  type RESTGetAPIGuildThreadsResult,
  type RESTGetAPIChannelThreadsArchivedPublicResult,
  type RESTPatchAPIWebhookWithTokenMessageJSONBody,
  type RESTPostAPIChannelMessageJSONBody,
  type RESTPutAPIApplicationGuildCommandsJSONBody,
} from 'discord-api-types/v10';
import { loadConfig } from '../config/config';
import { DiscordAPIError, DiscordRateLimitError } from '../types/errors';
import { getLogger } from '../utils/logger';

const API_BASE = 'https://discord.com/api/v10';
// Retry once inline only when Discord asks for a short wait; longer waits fail fast so the
// function does not hang (e.g. channel renames are limited to 2 per 10 minutes).
const MAX_INLINE_RETRY_SECONDS = 3;

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  auth?: boolean;
}

interface DiscordErrorBody {
  message?: string;
  code?: number;
  retry_after?: number;
}

export class DiscordRestClient {
  private readonly logger = getLogger('DiscordRest');

  constructor(private readonly token: string) {}

  public async request<T>(method: Method, route: string, options: RequestOptions = {}): Promise<T> {
    const { body, auth = true } = options;

    for (let attempt = 0; ; attempt++) {
      const headers: Record<string, string> = {
        'User-Agent':
          'DiscordBot (https://github.com/PowerPlatformToolBox/pptb-discord-assistant, 2.0)',
      };
      if (auth) headers.Authorization = `Bot ${this.token}`;
      if (body !== undefined) headers['Content-Type'] = 'application/json';

      const response = await fetch(`${API_BASE}${route}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      if (response.status === 204) return undefined as T;

      const data = (await response.json().catch(() => ({}))) as unknown;

      if (response.ok) return data as T;

      const error = data as DiscordErrorBody;

      if (response.status === 429) {
        const retryAfter = Number(error.retry_after ?? response.headers.get('retry-after') ?? 1);
        if (attempt === 0 && retryAfter <= MAX_INLINE_RETRY_SECONDS) {
          this.logger.warn('Rate limited, retrying', { route, retryAfter });
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        throw new DiscordRateLimitError(`Discord rate limit on ${method} ${route}`, retryAfter, {
          route,
        });
      }

      throw new DiscordAPIError(
        `Discord API ${response.status} on ${method} ${route}: ${error.message ?? response.statusText}`,
        response.status,
        { route, code: error.code }
      );
    }
  }

  public sendMessage(
    channelId: string,
    message: RESTPostAPIChannelMessageJSONBody
  ): Promise<APIMessage> {
    return this.request('POST', Routes.channelMessages(channelId), { body: message });
  }

  public startThread(channelId: string, name: string): Promise<APIThreadChannel> {
    return this.request('POST', Routes.threads(channelId), {
      body: {
        name,
        type: ChannelType.PublicThread,
        auto_archive_duration: ThreadAutoArchiveDuration.OneWeek,
      },
    });
  }

  public async listGuildMembers(guildId: string): Promise<APIGuildMember[]> {
    const members: APIGuildMember[] = [];
    let after: string | undefined;

    for (;;) {
      const query = new URLSearchParams({ limit: '1000' });
      if (after) query.set('after', after);
      const page = await this.request<APIGuildMember[]>(
        'GET',
        `${Routes.guildMembers(guildId)}?${query.toString()}`
      );
      members.push(...page);
      if (page.length < 1000) return members;
      after = page[page.length - 1]?.user.id;
    }
  }

  public addThreadMember(threadId: string, userId: string): Promise<void> {
    return this.request('PUT', Routes.threadMembers(threadId, userId));
  }

  public async listThreads(guildId: string, channelId: string): Promise<APIThreadChannel[]> {
    const [active, archived] = await Promise.all([
      this.request<RESTGetAPIGuildThreadsResult>('GET', Routes.guildActiveThreads(guildId)),
      this.request<RESTGetAPIChannelThreadsArchivedPublicResult>(
        'GET',
        `${Routes.channelThreads(channelId, 'public')}?limit=100`
      ),
    ]);
    const activeInChannel = (active.threads as APIThreadChannel[]).filter(
      (thread) => thread.parent_id === channelId
    );
    return [...activeInChannel, ...(archived.threads as APIThreadChannel[])];
  }

  public getChannel(channelId: string): Promise<APIChannel> {
    return this.request('GET', Routes.channel(channelId));
  }

  public renameChannel(channelId: string, name: string): Promise<APIChannel> {
    return this.request('PATCH', Routes.channel(channelId), { body: { name } });
  }

  public editOriginalInteractionResponse(
    applicationId: string,
    interactionToken: string,
    body: RESTPatchAPIWebhookWithTokenMessageJSONBody
  ): Promise<APIMessage> {
    return this.request('PATCH', Routes.webhookMessage(applicationId, interactionToken), {
      body,
      auth: false,
    });
  }

  public putGuildCommands(
    applicationId: string,
    guildId: string,
    commands: RESTPutAPIApplicationGuildCommandsJSONBody
  ): Promise<unknown[]> {
    return this.request('PUT', Routes.applicationGuildCommands(applicationId, guildId), {
      body: commands,
    });
  }
}

let instance: DiscordRestClient | null = null;

export function getDiscordRest(): DiscordRestClient {
  if (!instance) {
    instance = new DiscordRestClient(loadConfig().discord.token);
  }
  return instance;
}

export function resetDiscordRest(): void {
  instance = null;
}
