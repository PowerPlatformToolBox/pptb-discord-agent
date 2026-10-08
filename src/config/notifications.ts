/**
 * Where PPTB event notifications go and who they ping.
 *
 * Every category posts to defaultChannelId until it gets its own channelId.
 * A single event can also get its own channelId, be muted (enabled: false),
 * or ping someone (mention: a key of mentions, which can be a role or a user).
 *
 * IDs are not secrets, so they live here instead of env vars. Changing routing needs a deploy.
 */

import { z } from 'zod';
import { PPTB_EVENTS, type PptbEventCategory } from '../types/pptbEvents';

const snowflake = z.string().regex(/^\d{17,20}$/, 'must be a Discord ID');

const mentionSchema = z.object({
  type: z.enum(['role', 'user']),
  // Leave out until the role or user exists; the event still posts, just without a ping
  id: snowflake.optional(),
});
export type Mention = z.infer<typeof mentionSchema>;

const eventRouteSchema = z.object({
  enabled: z.boolean().optional(),
  channelId: snowflake.optional(),
  mention: z.string().optional(),
});
type EventRoute = z.infer<typeof eventRouteSchema>;

const categorySchema = <E extends readonly [string, ...string[]]>(events: E) =>
  z.object({
    channelId: snowflake.optional(),
    events: z.object(
      Object.fromEntries(events.map((e) => [e, eventRouteSchema])) as Record<
        E[number],
        typeof eventRouteSchema
      >
    ),
  });

export const notificationConfigSchema = z
  .object({
    defaultChannelId: snowflake,
    mentions: z.record(z.string().min(1), mentionSchema),
    categories: z.object({
      toolSubmission: categorySchema(PPTB_EVENTS.toolSubmission),
      tool: categorySchema(PPTB_EVENTS.tool),
      verify: categorySchema(PPTB_EVENTS.verify),
      // GitHub release webhook for the vscode-extension repo
      vscode: z.object({ channelId: snowflake.optional() }),
    }),
  })
  .superRefine((config, ctx) => {
    // Catch a typo in an event's mention key at startup
    for (const category of Object.keys(PPTB_EVENTS) as PptbEventCategory[]) {
      const events = config.categories[category].events as Record<string, EventRoute>;
      for (const [event, route] of Object.entries(events)) {
        if (route.mention && !(route.mention in config.mentions)) {
          ctx.addIssue({
            code: 'custom',
            path: ['categories', category, 'events', event, 'mention'],
            message: `"${route.mention}" is not defined in mentions`,
          });
        }
      }
    }
  });

export type NotificationConfig = z.infer<typeof notificationConfigSchema>;

export const NOTIFICATIONS: NotificationConfig = {
  defaultChannelId: '1443628411351470080',
  mentions: {
    // TODO: add the role IDs once the roles exist. A user is { type: 'user', id: '…' }
    toolIntake: { type: 'role' },
    toolVerification: { type: 'role' },
  },
  categories: {
    toolSubmission: {
      events: {
        New: { mention: 'toolIntake' },
        Approved: {},
        Rejected: {},
        ChangesRequested: {},
        // Not configured yet: nothing in pptb-web removes a submission, so this never fires
        Revoked: { enabled: false },
      },
    },
    tool: {
      events: {
        UpdateCategories: {},
        Deprecated: {},
        Deleted: {},
        Update: {},
        ManualUpdate: {},
        // Likely gets its own role later
        UpdateFailed: { mention: 'toolIntake' },
      },
    },
    verify: {
      events: {
        Requested: { mention: 'toolVerification' },
        Assigned: {},
        Approved: {},
        Rejected: {},
        Revoked: {},
      },
    },
    vscode: {},
  },
};

/**
 * Validate the notification config. Called at startup so a bad ID stops the bot instead of failing silently later.
 */
export function validateNotificationConfig(config: unknown = NOTIFICATIONS): NotificationConfig {
  const result = notificationConfigSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Notification config validation failed:\n${errors.join('\n')}`);
  }
  return result.data;
}

export interface ResolvedRoute {
  channelId: string;
  mention?: Required<Mention>;
}

/**
 * Work out where an event goes. Returns null when the event is muted.
 */
export function resolveRoute<C extends PptbEventCategory>(
  config: NotificationConfig,
  category: C,
  event: string
): ResolvedRoute | null {
  const categoryConfig = config.categories[category];
  const route = (categoryConfig.events as Record<string, EventRoute>)[event];
  if (!route || route.enabled === false) {
    return null;
  }
  const mention = route.mention ? config.mentions[route.mention] : undefined;
  return {
    channelId: route.channelId ?? categoryConfig.channelId ?? config.defaultChannelId,
    mention: mention?.id ? { type: mention.type, id: mention.id } : undefined,
  };
}

/**
 * Mention keys that events use but that have no ID yet. Logged at startup.
 */
export function unconfiguredMentions(config: NotificationConfig): string[] {
  return Object.entries(config.mentions)
    .filter(([, mention]) => !mention.id)
    .map(([key]) => key);
}

export function resolveVscodeChannel(config: NotificationConfig): string {
  return config.categories.vscode.channelId ?? config.defaultChannelId;
}
