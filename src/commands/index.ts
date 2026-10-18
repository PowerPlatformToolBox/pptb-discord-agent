/**
 * Slash command registry. Add new commands here, then run `pnpm deploy-commands`.
 */

import { aboutCommand } from './about';
import { createIssueCommand } from './createIssue';
import { createHelpCommand } from './help';
import { pingCommand } from './ping';
import type { SlashCommand } from './types';

export const COMMANDS: readonly SlashCommand[] = [
  pingCommand,
  createIssueCommand,
  createHelpCommand(() => COMMANDS),
  aboutCommand,
];

const byName = new Map(COMMANDS.map((command) => [command.definition.name, command]));

export function findCommand(name: string): SlashCommand | undefined {
  return byName.get(name);
}
