/**
 * Channel aliases used for notification routing.
 *
 * Each alias maps to a DISCORD_CHANNEL_<ALIAS> environment variable. Events pick an alias in the
 * catalog, and NOTIFICATION_ROUTES can re-point any event to another alias or a raw channel ID.
 */

export const CHANNEL_ALIASES = [
  'admin',
  'tools',
  'releases',
  'insider',
  'discussions',
  'stars',
] as const;

export type ChannelAlias = (typeof CHANNEL_ALIASES)[number];

export function isChannelAlias(value: string): value is ChannelAlias {
  return (CHANNEL_ALIASES as readonly string[]).includes(value);
}
