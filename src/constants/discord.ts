/**
 * Discord-related constants
 */

/**
 * Discord embed colors
 */
export const DISCORD_COLORS = {
  /** Discord Blurple - #5865F2 */
  BLURPLE: 0x5865f2,
  /** Green - #57F287 */
  GREEN: 0x57f287,
  /** Yellow - #FEE75C */
  YELLOW: 0xfee75c,
  /** Red - #ED4245 */
  RED: 0xed4245,
  /** Fuchsia - #EB459E */
  FUCHSIA: 0xeb459e,
} as const;

/**
 * Platform emoji IDs for desktop-app releases
 * Note: These are custom emojis that need to exist in your Discord server
 */
export const PLATFORM_EMOJIS = {
  /** Windows emoji ID */
  WINDOWS: { name: 'm1', id: '1446014221820231821' },
  /** macOS emoji ID */
  MACOS: { name: 'a1', id: '1446014603883446353' },
  /** Linux emoji ID */
  LINUX: { name: 'linux', id: '1446019504483205160' },
} as const;
