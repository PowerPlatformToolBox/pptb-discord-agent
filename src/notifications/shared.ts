/**
 * Shared payload schemas and embed helpers for notification definitions
 */

import type { APIEmbed, APIEmbedField } from 'discord-api-types/v10';
import { z } from 'zod';

export const httpUrl = z.url({ protocol: /^https?$/ });

export const toolSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  packageName: z.string().max(214).optional(),
  version: z.string().max(64).optional(),
  description: z.string().max(1000).optional(),
  authors: z.array(z.string().max(100)).max(20).optional(),
  /** Marketplace page */
  url: httpUrl.optional(),
  iconUrl: httpUrl.optional(),
});

export const actorSchema = z.object({
  name: z.string().min(1).max(100),
  discordHandle: z.string().max(100).optional(),
});

export const reasonSchema = z.string().min(1).max(1000);

export type ToolInfo = z.infer<typeof toolSchema>;
export type Actor = z.infer<typeof actorSchema>;

export const EXAMPLE_TOOL: ToolInfo = {
  id: 'b0f0c3d6-1111-4c2a-9a54-000000000001',
  name: 'Solution Explorer',
  packageName: '@pptb/solution-explorer',
  version: '1.4.0',
  description: 'Browse and compare Dataverse solutions.',
  authors: ['Jane Doe'],
  url: 'https://www.powerplatformtoolbox.com/tools/b0f0c3d6-1111-4c2a-9a54-000000000001',
};

export const EXAMPLE_ACTOR: Actor = { name: 'Jane Doe', discordHandle: 'janedoe' };

export function link(text: string, url?: string): string {
  return url ? `[${text}](${url})` : text;
}

export function formatActor(actor: Actor): string {
  return actor.discordHandle ? `${actor.name} (@${actor.discordHandle})` : actor.name;
}

export function field(
  name: string,
  value: string | undefined | null,
  inline = true
): APIEmbedField | null {
  return value ? { name, value, inline } : null;
}

export function bulletList(items: string[]): string {
  return items.map((item) => `• ${item}`).join('\n');
}

interface ToolEmbedOptions {
  title: string;
  color: number;
  tool: ToolInfo;
  description?: string;
  url?: string;
  fields?: Array<APIEmbedField | null>;
  footer?: string;
}

/**
 * Standard embed for tool-centric notifications: tool name/version/package/authors first,
 * followed by event-specific fields.
 */
export function toolEmbed(options: ToolEmbedOptions): APIEmbed {
  const { tool } = options;
  const fields = [
    field('Tool', link(tool.name, tool.url)),
    field('Version', tool.version),
    field('Package', tool.packageName ? `\`${tool.packageName}\`` : undefined),
    field('Author(s)', tool.authors?.join(', ')),
    ...(options.fields ?? []),
  ].filter((item): item is APIEmbedField => item !== null);

  return {
    title: options.title,
    url: options.url ?? tool.url,
    description: options.description,
    color: options.color,
    fields,
    thumbnail: tool.iconUrl ? { url: tool.iconUrl } : undefined,
    footer: options.footer ? { text: options.footer } : undefined,
    timestamp: new Date().toISOString(),
  };
}
