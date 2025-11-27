/**
 * Discord client intents and partials configuration
 */

import { GatewayIntentBits, Partials } from 'discord.js';

export const INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.MessageContent,
];

export const PARTIALS = [
  Partials.Message,
  Partials.Channel,
  Partials.Reaction,
  Partials.User,
];