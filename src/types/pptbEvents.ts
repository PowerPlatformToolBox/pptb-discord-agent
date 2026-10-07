/**
 * PPTB event payloads sent by pptb-web to POST /pptb-events
 */

import { z } from 'zod';

export const PPTB_EVENTS = {
  toolSubmission: ['New', 'Approved', 'Rejected', 'ChangesRequested', 'Revoked'],
  tool: ['UpdateCategories', 'Deprecated', 'Deleted', 'Update', 'ManualUpdate', 'UpdateFailed'],
  verify: ['Requested', 'Assigned', 'Approved', 'Rejected', 'Revoked'],
} as const;

export type PptbEventCategory = keyof typeof PPTB_EVENTS;
export type PptbEventName<C extends PptbEventCategory> = (typeof PPTB_EVENTS)[C][number];

const httpUrl = z.url({ protocol: /^https?$/ });

const baseFields = {
  /** Unique per event; repeats are ignored so a retry can't post twice */
  id: z.string().min(1).max(200),
  occurredAt: z.iso.datetime({ offset: true }),
  /** What the event is about; stable across events so a card can be found again later */
  subject: z.object({
    type: z.enum(['intake', 'tool', 'verification', 'toolUpdate']),
    id: z.string().min(1).max(100),
  }),
  tool: z.object({
    id: z.string().min(1).max(100).optional(),
    name: z.string().min(1).max(200),
    url: httpUrl.optional(),
  }),
  developer: z.string().min(1).max(200).optional(),
  actor: z.string().min(1).max(200).optional(),
  reason: z.string().min(1).max(1000).optional(),
  detail: z.record(z.string().min(1).max(100), z.string().max(1000)).optional(),
};

export const pptbEventSchema = z.discriminatedUnion('category', [
  z.object({
    ...baseFields,
    category: z.literal('toolSubmission'),
    event: z.enum(PPTB_EVENTS.toolSubmission),
  }),
  z.object({ ...baseFields, category: z.literal('tool'), event: z.enum(PPTB_EVENTS.tool) }),
  z.object({ ...baseFields, category: z.literal('verify'), event: z.enum(PPTB_EVENTS.verify) }),
]);

export type PptbEvent = z.infer<typeof pptbEventSchema>;
