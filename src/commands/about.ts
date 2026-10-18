import { MessageFlags } from 'discord-api-types/v10';
import { BOT_NAME, PPTB_LINKS } from '../config/constants';
import type { CommandResult, SlashCommand } from './types';

export const aboutCommand: SlashCommand = {
  definition: {
    name: 'about',
    description: 'Meet PPTB Agent and find out why the offline badge is expected',
  },
  execute(): CommandResult {
    return {
      type: 'reply',
      data: {
        content: [
          `**About ${BOT_NAME}**`,
          "Power Platform ToolBox's event-driven sidekick.",
          '',
          'I post release alerts, tool updates, and verification announcements; open discussion threads for selected GitHub issues and PRs; keep the stars counter in sync; and help you create GitHub issues.',
          '',
          '**Offline by design. Unlike your last solution import.**',
          'I run as stateless Vercel Functions on the Hobby plan. Slash commands arrive as signed HTTP requests; notifications go out through the Discord REST API.',
          'No persistent Gateway connection means no green dot or member-list activity text. The offline badge is not a health check. Use `/ping` to check that I respond and `/help` for commands.',
          '',
          "Not an AI chatbot. Just TypeScript with a job to do. Mentions and DMs aren't command interfaces.",
          '',
          `[ToolBox](${PPTB_LINKS.website}) | [Documentation](${PPTB_LINKS.docs}) | [Support / GitHub issues](${PPTB_LINKS.support})`,
        ].join('\n'),
        flags: MessageFlags.Ephemeral,
        allowed_mentions: { parse: [] },
      },
    };
  },
};
