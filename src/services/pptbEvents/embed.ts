/**
 * Discord embed for a PPTB event. One layout for every category; the event decides label and colour.
 */

import { EmbedBuilder } from 'discord.js';
import { CONSTANTS } from '../../config/constants';
import type { PptbEvent, PptbEventCategory } from '../../types/pptbEvents';

const COLORS = {
  success: 0x57f287,
  failure: 0xed4245,
  pending: 0xfee75c,
  info: 0x5865f2,
  retired: 0x99aab5,
} as const;

const CATEGORY_TITLES: Record<PptbEventCategory, string> = {
  toolSubmission: '📥 Tool Submission',
  tool: '🧰 Tool',
  verify: '🛡️ Verification',
};

type EventStyle = { label: string; color: number };

const EVENT_STYLES: {
  [C in PptbEventCategory]: Record<Extract<PptbEvent, { category: C }>['event'], EventStyle>;
} = {
  toolSubmission: {
    New: { label: 'New submission', color: COLORS.pending },
    Approved: { label: 'Approved', color: COLORS.success },
    Rejected: { label: 'Rejected', color: COLORS.failure },
    ChangesRequested: { label: 'Changes requested', color: COLORS.pending },
    Revoked: { label: 'Submission removed', color: COLORS.failure },
  },
  tool: {
    UpdateCategories: { label: 'Categories updated', color: COLORS.info },
    Deprecated: { label: 'Deprecated', color: COLORS.retired },
    Deleted: { label: 'Deleted', color: COLORS.retired },
    Update: { label: 'Updated', color: COLORS.success },
    ManualUpdate: { label: 'Manual update', color: COLORS.info },
    UpdateFailed: { label: 'Update failed', color: COLORS.failure },
  },
  verify: {
    Requested: { label: 'Verification requested', color: COLORS.pending },
    Assigned: { label: 'Verification assigned', color: COLORS.info },
    Approved: { label: 'Verified', color: COLORS.success },
    Rejected: { label: 'Verification rejected', color: COLORS.failure },
    Revoked: { label: 'Verification revoked', color: COLORS.failure },
  },
};

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

export function getEventStyle(event: PptbEvent): EventStyle {
  return (EVENT_STYLES[event.category] as Record<string, EventStyle>)[event.event];
}

export function createPptbEventEmbed(event: PptbEvent): EmbedBuilder {
  const style = getEventStyle(event);
  const maxValue = CONSTANTS.MAX_EMBED_FIELD_VALUE_LENGTH;

  const embed = new EmbedBuilder()
    .setAuthor({ name: CATEGORY_TITLES[event.category] })
    .setTitle(truncate(`${style.label}: ${event.tool.name}`, 256))
    .setColor(style.color)
    .setTimestamp(new Date(event.occurredAt))
    // Subject in the footer so a later version can find and edit this card
    .setFooter({ text: `${event.subject.type}:${event.subject.id}` });

  if (event.tool.url) {
    embed.setURL(event.tool.url);
  }
  if (event.developer) {
    embed.addFields({
      name: 'Developer',
      value: truncate(event.developer, maxValue),
      inline: true,
    });
  }
  if (event.actor) {
    embed.addFields({ name: 'By', value: truncate(event.actor, maxValue), inline: true });
  }
  if (event.reason) {
    embed.setDescription(truncate(event.reason, CONSTANTS.MAX_EMBED_DESCRIPTION_LENGTH));
  }
  for (const [name, value] of Object.entries(event.detail ?? {})) {
    if (embed.data.fields && embed.data.fields.length >= CONSTANTS.MAX_EMBED_FIELDS) break;
    if (value.length === 0) continue;
    embed.addFields({ name: truncate(name, 256), value: truncate(value, maxValue), inline: true });
  }

  return embed;
}
