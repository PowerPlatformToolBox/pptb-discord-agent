/**
 * Helpers that keep outgoing messages inside Discord limits
 */

import type { APIEmbed } from 'discord-api-types/v10';
import { DISCORD_LIMITS } from '../config/constants';

export interface MessagePayload {
  content?: string;
  embeds?: APIEmbed[];
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

function clampEmbed(embed: APIEmbed): APIEmbed {
  return {
    ...embed,
    title:
      embed.title === undefined ? undefined : truncate(embed.title, DISCORD_LIMITS.EMBED_TITLE),
    description:
      embed.description === undefined
        ? undefined
        : truncate(embed.description, DISCORD_LIMITS.EMBED_DESCRIPTION),
    fields: embed.fields?.slice(0, DISCORD_LIMITS.EMBED_FIELDS).map((field) => ({
      ...field,
      name: truncate(field.name, DISCORD_LIMITS.EMBED_FIELD_NAME),
      value: truncate(field.value, DISCORD_LIMITS.EMBED_FIELD_VALUE),
    })),
  };
}

/**
 * Enforce Discord size limits on any rendered message.
 */
export function clampMessage(message: MessagePayload): MessagePayload {
  return {
    content:
      message.content === undefined
        ? undefined
        : truncate(message.content, DISCORD_LIMITS.MESSAGE_CONTENT),
    embeds: message.embeds?.map(clampEmbed),
  };
}
