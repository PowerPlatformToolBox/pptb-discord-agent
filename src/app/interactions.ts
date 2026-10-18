/**
 * POST /api/interactions - Discord Interactions Endpoint (slash commands over HTTP)
 */

import { waitUntil } from '@vercel/functions';
import {
  ApplicationCommandType,
  InteractionResponseType,
  InteractionType,
  MessageFlags,
  type APIChatInputApplicationCommandInteraction,
  type APIInteraction,
  type APIInteractionResponse,
} from 'discord-api-types/v10';
import { findCommand } from '../commands';
import { loadConfig } from '../config/config';
import { getDiscordRest } from '../discord/rest';
import { verifyDiscordSignature } from '../security/signatures';
import { createErrorLogObject } from '../utils/errorHelper';
import { getLogger } from '../utils/logger';
import { json, parseJson, readRawBody } from './http';

const logger = getLogger('Interactions');

const ERROR_REPLY = 'There was an error executing this command.';

function respond(body: APIInteractionResponse): Response {
  return json(200, body);
}

export async function handleInteraction(request: Request): Promise<Response> {
  const config = loadConfig();
  const raw = await readRawBody(request);
  if (raw === null) return json(413, { error: 'Request body too large' });

  const valid = verifyDiscordSignature(
    config.discord.publicKey,
    raw,
    request.headers.get('x-signature-ed25519'),
    request.headers.get('x-signature-timestamp')
  );
  if (!valid) return json(401, { error: 'Invalid request signature' });

  const interaction = parseJson(raw) as APIInteraction | undefined;
  if (!interaction) return json(400, { error: 'Invalid JSON' });

  if (interaction.type === InteractionType.Ping) {
    return respond({ type: InteractionResponseType.Pong });
  }

  if (
    interaction.type !== InteractionType.ApplicationCommand ||
    interaction.data.type !== ApplicationCommandType.ChatInput
  ) {
    return json(400, { error: 'Unsupported interaction type' });
  }

  const chatInput = interaction as APIChatInputApplicationCommandInteraction;
  const name = chatInput.data.name;
  const command = findCommand(name);
  if (!command) {
    logger.warn('Unknown command', { name });
    return respond({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: 'Unknown command.', flags: MessageFlags.Ephemeral },
    });
  }

  try {
    const result = command.execute(chatInput);

    if (result.type === 'reply') {
      return respond({ type: InteractionResponseType.ChannelMessageWithSource, data: result.data });
    }

    const followUp = async (): Promise<void> => {
      const rest = getDiscordRest();
      try {
        const body = await result.work();
        await rest.editOriginalInteractionResponse(config.discord.clientId, chatInput.token, body);
      } catch (error) {
        logger.error('Deferred command failed', { command: name, ...createErrorLogObject(error) });
        await rest
          .editOriginalInteractionResponse(config.discord.clientId, chatInput.token, {
            content: ERROR_REPLY,
          })
          .catch(() => undefined);
      }
    };

    // Keeps the function alive after responding so the follow-up can finish.
    waitUntil(followUp());
    return respond({ type: InteractionResponseType.DeferredChannelMessageWithSource });
  } catch (error) {
    logger.error('Command failed', { command: name, ...createErrorLogObject(error) });
    return respond({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: ERROR_REPLY, flags: MessageFlags.Ephemeral },
    });
  }
}
