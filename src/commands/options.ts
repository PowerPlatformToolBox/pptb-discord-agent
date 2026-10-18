/**
 * Helpers for reading interaction options and metadata
 */

import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
  type APIUser,
} from 'discord-api-types/v10';

const DISCORD_EPOCH = 1420070400000n;

export function getStringOption(
  interaction: APIChatInputApplicationCommandInteraction,
  name: string
): string | undefined {
  const option = interaction.data.options?.find((o) => o.name === name);
  return option?.type === ApplicationCommandOptionType.String ? option.value : undefined;
}

export function getInvokingUser(
  interaction: APIChatInputApplicationCommandInteraction
): APIUser | undefined {
  return interaction.member?.user ?? interaction.user;
}

export function snowflakeToTimestamp(id: string): number {
  return Number((BigInt(id) >> 22n) + DISCORD_EPOCH);
}
