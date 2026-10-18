/**
 * Slash command registry. Add new commands here, then run `pnpm deploy-commands`.
 */

import { createIssueCommand } from './createIssue';
import { pingCommand } from './ping';
import type { SlashCommand } from './types';

export const COMMANDS: readonly SlashCommand[] = [pingCommand, createIssueCommand];

const byName = new Map(COMMANDS.map((command) => [command.definition.name, command]));

export function findCommand(name: string): SlashCommand | undefined {
  return byName.get(name);
}
