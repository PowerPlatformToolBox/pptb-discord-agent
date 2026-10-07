/**
 * Where PPTB event notifications go and who they ping.
 *
 * Every category posts to defaultChannelId until it gets its own channelId.
 * A single event can also get its own channelId, be muted (enabled: false),
 * or ping a role (mention: a key of roles).
 *
 * IDs are not secrets, so they live here instead of env vars. Changing routing needs a deploy.
 */

import { z } from 'zod';
import { PPTB_EVENTS, type PptbEventCategory } from '../types/pptbEvents';

const snowflake = z.string().regex(/^\d{17,20}$/, 'must be a Discord ID');

const ROLE_KEYS = ['toolIntake', 'toolVerification'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

const eventRouteSchema = z.object({
  enabled: z.boolean().optional(),
  channelId: snowflake.optional(),
  mention: z.enum(ROLE_KEYS).optional(),
});

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

export const notificationConfigSchema = z.object({
  defaultChannelId: snowflake,
  roles: z.object({ toolIntake: snowflake, toolVerification: snowflake }),
  categories: z.object({
    toolSubmission: categorySchema(PPTB_EVENTS.toolSubmission),
    tool: categorySchema(PPTB_EVENTS.tool),
    verify: categorySchema(PPTB_EVENTS.verify),
    // GitHub release webhook for the vscode-extension repo
    vscode: z.object({ channelId: snowflake.optional() }),
  }),
});

export type NotificationConfig = z.infer<typeof notificationConfigSchema>;

// TODO before merge: fill in the real channel and role IDs
export const NOTIFICATIONS: NotificationConfig = {
  defaultChannelId: '',
  roles: {
    toolIntake: '',
    toolVerification: '',
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
  roleId?: string;
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
  const route = (categoryConfig.events as Record<string, z.infer<typeof eventRouteSchema>>)[event];
  if (!route || route.enabled === false) {
    return null;
  }
  return {
    channelId: route.channelId ?? categoryConfig.channelId ?? config.defaultChannelId,
    roleId: route.mention ? config.roles[route.mention] : undefined,
  };
}

export function resolveVscodeChannel(config: NotificationConfig): string {
  return config.categories.vscode.channelId ?? config.defaultChannelId;
}
