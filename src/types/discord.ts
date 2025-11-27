/**
 * Discord-related type definitions
 */

import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  Message,
  MessageReaction,
  User,
} from 'discord.js';

export interface BotCommand {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface BotEvent {
  name: string;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void>;
}

export interface MessageLogData {
  message: Message;
  reaction: MessageReaction;
  user: User;
}