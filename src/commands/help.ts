import { MessageFlags } from 'discord-api-types/v10';
import { BOT_NAME, PPTB_LINKS } from '../config/constants';
import type { CommandResult, SlashCommand } from './types';

export function createHelpCommand(getCommands: () => readonly SlashCommand[]): SlashCommand {
  return {
    definition: {
      name: 'help',
      description: 'List available commands and official Power Platform ToolBox help links',
    },
    execute(): CommandResult {
      const commands = getCommands().map(
        ({ definition }) => `- \`/${definition.name}\` - ${definition.description}`
      );

      return {
        type: 'reply',
        data: {
          content: [
            `**${BOT_NAME} - command reference**`,
            'All the commands. No solution import required.',
            '',
            ...commands,
            '',
            '**Official links**',
            `[ToolBox](${PPTB_LINKS.website}) | [Documentation](${PPTB_LINKS.docs}) | [Support / GitHub issues](${PPTB_LINKS.support})`,
            '',
            'Offline badge? Expected: I use HTTP interactions, not a live Gateway connection. Try `/ping` to check that I respond, or `/about` for the architecture tour.',
          ].join('\n'),
          flags: MessageFlags.Ephemeral,
          allowed_mentions: { parse: [] },
        },
      };
    },
  };
}
