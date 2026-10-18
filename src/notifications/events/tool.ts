/**
 * Tool lifecycle notifications (producers: pptb-web, tool-management)
 */

import { z } from 'zod';
import { COLORS } from '../../config/constants';
import { defineNotification } from '../types';
import {
  actorSchema,
  bulletList,
  EXAMPLE_ACTOR,
  EXAMPLE_TOOL,
  field,
  formatActor,
  httpUrl,
  link,
  reasonSchema,
  toolEmbed,
  toolSchema,
} from '../shared';

const categoryList = z.array(z.string().min(1).max(100)).max(50);

export const toolUpdateCategories = defineNotification({
  key: 'tool.update-categories',
  category: 'Tool',
  event: 'UpdateCategories',
  description: 'Tool categories updated',
  enabled: true,
  channel: 'admin',
  source: 'platform',
  schema: z.object({
    tool: toolSchema,
    categories: categoryList,
    previousCategories: categoryList.optional(),
    updatedBy: actorSchema.optional(),
  }),
  example: {
    tool: EXAMPLE_TOOL,
    categories: ['Solutions', 'ALM'],
    previousCategories: ['Solutions'],
    updatedBy: { name: 'PPTB Admin' },
  },
  delivery: {
    kind: 'message',
    render: ({ tool, categories, previousCategories, updatedBy }) => ({
      embeds: [
        toolEmbed({
          title: `🏷️ Categories updated: ${tool.name}`,
          color: COLORS.INFO,
          tool,
          fields: [
            field('Categories', categories.join(', ') || 'None', false),
            field('Previous', previousCategories?.join(', ') || undefined, false),
            field('Updated by', updatedBy && formatActor(updatedBy)),
          ],
        }),
      ],
    }),
  },
});

export const toolDeprecated = defineNotification({
  key: 'tool.deprecated',
  category: 'Tool',
  event: 'Deprecated',
  description: 'Tool deprecated',
  enabled: true,
  channel: 'tools',
  source: 'platform',
  schema: z.object({
    tool: toolSchema,
    reason: reasonSchema.optional(),
    replacement: z.object({ name: z.string().min(1).max(200), url: httpUrl.optional() }).optional(),
  }),
  example: {
    tool: EXAMPLE_TOOL,
    reason: 'No longer maintained.',
    replacement: { name: 'Solution Explorer Pro' },
  },
  delivery: {
    kind: 'message',
    render: ({ tool, reason, replacement }) => ({
      embeds: [
        toolEmbed({
          title: `⚠️ Tool deprecated: ${tool.name}`,
          color: COLORS.WARNING,
          tool,
          fields: [
            field('Reason', reason, false),
            field('Replacement', replacement && link(replacement.name, replacement.url), false),
          ],
        }),
      ],
    }),
  },
});

export const toolDeleted = defineNotification({
  key: 'tool.deleted',
  category: 'Tool',
  event: 'Deleted',
  description: 'Tool deleted from marketplace',
  enabled: true,
  channel: 'tools',
  source: 'platform',
  schema: z.object({ tool: toolSchema, reason: reasonSchema.optional() }),
  example: { tool: EXAMPLE_TOOL, reason: 'Removed at the author’s request.' },
  delivery: {
    kind: 'message',
    render: ({ tool, reason }) => ({
      embeds: [
        toolEmbed({
          title: `🗑️ Tool deleted: ${tool.name}`,
          color: COLORS.ERROR,
          tool,
          fields: [field('Reason', reason, false)],
        }),
      ],
    }),
  },
});

export const toolUpdate = defineNotification({
  key: 'tool.update',
  category: 'Tool',
  event: 'Update',
  description: 'Tool update detected',
  enabled: true,
  channel: 'tools',
  source: 'platform',
  schema: z.object({
    tool: toolSchema.extend({ version: z.string().min(1).max(64) }),
    previousVersion: z.string().max(64).optional(),
    releaseNotes: z.string().max(1000).optional(),
    releaseNotesUrl: httpUrl.optional(),
  }),
  example: {
    tool: { ...EXAMPLE_TOOL, version: '1.4.0' },
    previousVersion: '1.3.2',
    releaseNotes: 'Adds solution diff view.',
    releaseNotesUrl: 'https://www.npmjs.com/package/@pptb/solution-explorer',
  },
  delivery: {
    kind: 'message',
    render: ({ tool, previousVersion, releaseNotes, releaseNotesUrl }) => ({
      embeds: [
        toolEmbed({
          title: `⬆️ ${tool.name} updated to v${tool.version}`,
          color: COLORS.SUCCESS,
          tool,
          description: releaseNotes,
          fields: [
            field('Previous version', previousVersion),
            field('Release notes', releaseNotesUrl && link('View', releaseNotesUrl)),
          ],
        }),
      ],
    }),
  },
});

export const toolManualUpdate = defineNotification({
  key: 'tool.manual-update',
  category: 'Tool',
  event: 'ManualUpdate',
  description: "Tool update trigger via 'My Tools'",
  enabled: true,
  channel: 'admin',
  source: 'platform',
  schema: z.object({
    tool: toolSchema,
    requestedBy: actorSchema,
    targetVersion: z.string().max(64).optional(),
    workflowUrl: httpUrl.optional(),
  }),
  example: {
    tool: EXAMPLE_TOOL,
    requestedBy: EXAMPLE_ACTOR,
    targetVersion: '1.4.1',
    workflowUrl: 'https://github.com/PowerPlatformToolBox/tool-management/actions/runs/1',
  },
  delivery: {
    kind: 'message',
    render: ({ tool, requestedBy, targetVersion, workflowUrl }) => ({
      embeds: [
        toolEmbed({
          title: `🔄 Manual update triggered: ${tool.name}`,
          color: COLORS.INFO,
          tool,
          url: workflowUrl,
          fields: [
            field('Requested by', formatActor(requestedBy)),
            field('Target version', targetVersion),
            field('Workflow', workflowUrl && link('View run', workflowUrl)),
          ],
        }),
      ],
    }),
  },
});

export const toolUpdateFailed = defineNotification({
  key: 'tool.update-failed',
  category: 'Tool',
  event: 'UpdateFailed',
  description: 'Tool update failed due to validation issues',
  enabled: true,
  channel: 'admin',
  source: 'platform',
  schema: z.object({
    tool: toolSchema,
    attemptedVersion: z.string().max(64).optional(),
    errors: z.array(z.string().min(1).max(500)).min(1).max(20),
    workflowUrl: httpUrl.optional(),
  }),
  example: {
    tool: EXAMPLE_TOOL,
    attemptedVersion: '1.4.1',
    errors: ['package.json is missing "displayName"', 'Icon exceeds 1 MB'],
    workflowUrl: 'https://github.com/PowerPlatformToolBox/tool-management/actions/runs/2',
  },
  delivery: {
    kind: 'message',
    render: ({ tool, attemptedVersion, errors, workflowUrl }) => ({
      embeds: [
        toolEmbed({
          title: `🚫 Tool update failed: ${tool.name}`,
          color: COLORS.ERROR,
          tool,
          url: workflowUrl,
          fields: [
            field('Attempted version', attemptedVersion),
            field('Validation errors', bulletList(errors), false),
            field('Workflow', workflowUrl && link('View run', workflowUrl)),
          ],
        }),
      ],
    }),
  },
});

export const TOOL_NOTIFICATIONS = [
  toolUpdateCategories,
  toolDeprecated,
  toolDeleted,
  toolUpdate,
  toolManualUpdate,
  toolUpdateFailed,
] as const;
