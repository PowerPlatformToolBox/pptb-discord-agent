/**
 * Slash command contracts for the HTTP interactions endpoint
 */

import type {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponseCallbackData,
  RESTPatchAPIWebhookWithTokenMessageJSONBody,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';

/**
 * - `reply`: answered immediately (must be within Discord's 3 second window)
 * - `defer`: Discord shows "thinking…", `work` runs after the response and edits the reply
 */
export type CommandResult =
  | { type: 'reply'; data: APIInteractionResponseCallbackData }
  | { type: 'defer'; work: () => Promise<RESTPatchAPIWebhookWithTokenMessageJSONBody> };

export interface SlashCommand {
  definition: RESTPostAPIChatInputApplicationCommandsJSONBody;
  execute(interaction: APIChatInputApplicationCommandInteraction): CommandResult;
}
