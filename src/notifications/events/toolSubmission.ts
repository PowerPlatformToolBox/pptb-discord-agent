/**
 * Tool Submission notifications (producer: pptb-web)
 */

import { z } from 'zod';
import { COLORS } from '../../config/constants';
import { defineNotification } from '../types';
import {
  actorSchema,
  EXAMPLE_ACTOR,
  EXAMPLE_TOOL,
  field,
  formatActor,
  httpUrl,
  reasonSchema,
  toolEmbed,
  toolSchema,
} from '../shared';

export const toolSubmissionNew = defineNotification({
  key: 'tool-submission.new',
  category: 'Tool Submission',
  event: 'New',
  description: 'A new tool is submitted',
  enabled: true,
  channel: 'admin',
  source: 'platform',
  schema: z.object({
    tool: toolSchema,
    submittedBy: actorSchema,
    reviewUrl: httpUrl.optional(),
  }),
  example: {
    tool: EXAMPLE_TOOL,
    submittedBy: EXAMPLE_ACTOR,
    reviewUrl: 'https://www.powerplatformtoolbox.com/admin/tool-intakes',
  },
  delivery: {
    kind: 'message',
    render: ({ tool, submittedBy, reviewUrl }) => ({
      embeds: [
        toolEmbed({
          title: `📥 New tool submission: ${tool.name}`,
          color: COLORS.INFO,
          tool,
          url: reviewUrl,
          description: tool.description,
          fields: [field('Submitted by', formatActor(submittedBy))],
          footer: 'Awaiting review',
        }),
      ],
    }),
  },
});

export const toolSubmissionApproved = defineNotification({
  key: 'tool-submission.approved',
  category: 'Tool Submission',
  event: 'Approved',
  description: 'New tool submission approved',
  enabled: true,
  channel: 'tools',
  source: 'platform',
  schema: z.object({ tool: toolSchema, approvedBy: actorSchema.optional() }),
  example: { tool: EXAMPLE_TOOL, approvedBy: { name: 'PPTB Admin' } },
  delivery: {
    kind: 'message',
    render: ({ tool }) => ({
      embeds: [
        toolEmbed({
          title: `🎉 New tool on the marketplace: ${tool.name}`,
          color: COLORS.SUCCESS,
          tool,
          description: tool.description,
        }),
      ],
    }),
  },
});

export const toolSubmissionRejected = defineNotification({
  key: 'tool-submission.rejected',
  category: 'Tool Submission',
  event: 'Rejected',
  description: 'New tool submission rejected',
  enabled: true,
  channel: 'admin',
  source: 'platform',
  schema: z.object({
    tool: toolSchema,
    reason: reasonSchema.optional(),
    rejectedBy: actorSchema.optional(),
  }),
  example: {
    tool: EXAMPLE_TOOL,
    reason: 'Package is missing a README.',
    rejectedBy: { name: 'PPTB Admin' },
  },
  delivery: {
    kind: 'message',
    render: ({ tool, reason, rejectedBy }) => ({
      embeds: [
        toolEmbed({
          title: `❌ Tool submission rejected: ${tool.name}`,
          color: COLORS.ERROR,
          tool,
          fields: [
            field('Rejected by', rejectedBy && formatActor(rejectedBy)),
            field('Reason', reason, false),
          ],
        }),
      ],
    }),
  },
});

export const toolSubmissionRevoked = defineNotification({
  key: 'tool-submission.revoked',
  category: 'Tool Submission',
  event: 'Revoked',
  description: 'Tool removed from marketplace',
  enabled: true,
  channel: 'tools',
  source: 'platform',
  schema: z.object({
    tool: toolSchema,
    reason: reasonSchema.optional(),
    revokedBy: actorSchema.optional(),
  }),
  example: { tool: EXAMPLE_TOOL, reason: 'Violates the marketplace policy.' },
  delivery: {
    kind: 'message',
    render: ({ tool, reason }) => ({
      embeds: [
        toolEmbed({
          title: `⛔ Tool removed from the marketplace: ${tool.name}`,
          color: COLORS.ERROR,
          tool,
          fields: [field('Reason', reason, false)],
        }),
      ],
    }),
  },
});

export const TOOL_SUBMISSION_NOTIFICATIONS = [
  toolSubmissionNew,
  toolSubmissionApproved,
  toolSubmissionRejected,
  toolSubmissionRevoked,
] as const;
