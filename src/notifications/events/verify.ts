/**
 * Tool verification notifications (producer: pptb-web)
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

const EXAMPLE_REVIEW_URL = 'https://www.powerplatformtoolbox.com/admin/verification-requests';

export const verifyRequested = defineNotification({
  key: 'verify.requested',
  category: 'Verify',
  event: 'Requested',
  description: "Tool verification requested via 'My Tools'",
  enabled: true,
  channel: 'admin',
  source: 'platform',
  schema: z.object({ tool: toolSchema, requestedBy: actorSchema, reviewUrl: httpUrl.optional() }),
  example: { tool: EXAMPLE_TOOL, requestedBy: EXAMPLE_ACTOR, reviewUrl: EXAMPLE_REVIEW_URL },
  delivery: {
    kind: 'message',
    render: ({ tool, requestedBy, reviewUrl }) => ({
      embeds: [
        toolEmbed({
          title: `🛡️ Verification requested: ${tool.name}`,
          color: COLORS.INFO,
          tool,
          url: reviewUrl,
          fields: [field('Requested by', formatActor(requestedBy))],
          footer: 'Awaiting reviewer',
        }),
      ],
    }),
  },
});

export const verifyAssigned = defineNotification({
  key: 'verify.assigned',
  category: 'Verify',
  event: 'Assigned',
  description: 'Tool verification picked up (assigned to) by admin',
  enabled: true,
  channel: 'admin',
  source: 'platform',
  schema: z.object({ tool: toolSchema, assignee: actorSchema, reviewUrl: httpUrl.optional() }),
  example: { tool: EXAMPLE_TOOL, assignee: { name: 'PPTB Admin' }, reviewUrl: EXAMPLE_REVIEW_URL },
  delivery: {
    kind: 'message',
    render: ({ tool, assignee, reviewUrl }) => ({
      embeds: [
        toolEmbed({
          title: `👀 Verification in review: ${tool.name}`,
          color: COLORS.PRIMARY,
          tool,
          url: reviewUrl,
          fields: [field('Assigned to', formatActor(assignee))],
        }),
      ],
    }),
  },
});

export const verifyApproved = defineNotification({
  key: 'verify.approved',
  category: 'Verify',
  event: 'Approved',
  description: 'Tool verification approved',
  enabled: true,
  channel: 'tools',
  source: 'platform',
  schema: z.object({ tool: toolSchema, reviewer: actorSchema.optional() }),
  example: { tool: EXAMPLE_TOOL, reviewer: { name: 'PPTB Admin' } },
  delivery: {
    kind: 'message',
    render: ({ tool }) => ({
      embeds: [
        toolEmbed({
          title: `✅ ${tool.name} is now verified`,
          color: COLORS.SUCCESS,
          tool,
          description: tool.description,
        }),
      ],
    }),
  },
});

export const verifyRejected = defineNotification({
  key: 'verify.rejected',
  category: 'Verify',
  event: 'Rejected',
  description: 'Tool verification rejected',
  enabled: true,
  channel: 'admin',
  source: 'platform',
  schema: z.object({
    tool: toolSchema,
    reason: reasonSchema.optional(),
    reviewer: actorSchema.optional(),
  }),
  example: {
    tool: EXAMPLE_TOOL,
    reason: 'Usage thresholds not met.',
    reviewer: { name: 'PPTB Admin' },
  },
  delivery: {
    kind: 'message',
    render: ({ tool, reason, reviewer }) => ({
      embeds: [
        toolEmbed({
          title: `❌ Verification rejected: ${tool.name}`,
          color: COLORS.ERROR,
          tool,
          fields: [
            field('Reviewer', reviewer && formatActor(reviewer)),
            field('Reason', reason, false),
          ],
        }),
      ],
    }),
  },
});

export const verifyRevoked = defineNotification({
  key: 'verify.revoked',
  category: 'Verify',
  event: 'Revoked',
  description: 'Tool verification revoked due to failed validation',
  enabled: true,
  channel: 'admin',
  source: 'platform',
  schema: z.object({ tool: toolSchema, reason: reasonSchema, revokedBy: actorSchema.optional() }),
  example: { tool: EXAMPLE_TOOL, reason: 'Latest version failed validation.' },
  delivery: {
    kind: 'message',
    render: ({ tool, reason, revokedBy }) => ({
      embeds: [
        toolEmbed({
          title: `⛔ Verification revoked: ${tool.name}`,
          color: COLORS.ERROR,
          tool,
          fields: [
            field('Revoked by', revokedBy && formatActor(revokedBy)),
            field('Reason', reason, false),
          ],
        }),
      ],
    }),
  },
});

export const VERIFY_NOTIFICATIONS = [
  verifyRequested,
  verifyAssigned,
  verifyApproved,
  verifyRejected,
  verifyRevoked,
] as const;
