/**
 * Discord-related type definitions
 */

import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  Interaction,
  Client,
} from 'discord.js';

export interface BotCommand {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface BotEvent<T = unknown[]> {
  name: string;
  once?: boolean;
  execute: (...args: T extends unknown[] ? T : never) => Promise<void>;
}

// Specific event types for better type safety
export type ReadyEvent = BotEvent<[Client<true>]>;
export type InteractionCreateEvent = BotEvent<[Interaction]>;
