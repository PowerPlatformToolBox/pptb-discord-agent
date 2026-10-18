/**
 * Envelope for events POSTed by PPTB platform services (pptb-web, tool-management)
 */

import { z } from 'zod';

export const platformEventSchema = z.object({
  /** Notification key from the catalogue, e.g. `verify.approved`. */
  type: z.string().min(1).max(100),
  /** Producer-generated ID for log correlation. */
  id: z.string().max(100).optional(),
  occurredAt: z.iso.datetime().optional(),
  data: z.unknown(),
});

export type PlatformEvent = z.infer<typeof platformEventSchema>;
