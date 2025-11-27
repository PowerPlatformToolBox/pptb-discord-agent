/**
 * Discord-related type definitions
 */

import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  Message,
  MessageReaction,
  User,
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

export interface MessageLogData {
  message: Message;
  reaction: MessageReaction;
  user: User;
}

// Specific event types for better type safety
export type ReadyEvent = BotEvent<[Client<true>]>;
export type MessageReactionAddEvent = BotEvent<[MessageReaction, User]>;
export type InteractionCreateEvent = BotEvent<[Interaction]>;