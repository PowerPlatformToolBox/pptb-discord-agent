<!-- Copilot / AI agent instructions for pptb-discord-assistant -->

# PPTB Discord Assistant — Copilot Instructions

**IMPORTANT:** The `desktop-app` instructions are the authoritative source for coding style, build rules and workspace-wide constraints. When a rule conflicts, prefer `./desktop-app/.github/copilot-instructions.md`.

This merged file consolidates bot-specific guidance with the TypeScript bot instructions. Keep changes minimal and preserve the desktop-app precedence.

## Quick Orientation

This repository is a TypeScript Discord bot (discord.js v14+) used by PowerPlatformToolBox. Use this file for repo-specific conventions and the desktop-app file for workspace-wide rules.

## Key files

- `src/main.ts` — bootstrap: loads commands/events, starts webhook server, logs in the bot.
- `src/handlers/commands` & `src/handlers/events` — modules export command/event objects consumed at runtime (compiled `.js` in `dist/`).
- `src/config/*` — environment validation and `loadConfig()` (Zod-based validation via `validateEnvironment`).
- `src/services/webhook` — webhook server and payload handlers (GitHub integration).
- `src/utils/logger` — Winston logger singleton used across the app.

## How to run / build (repo-specific)

- **Install:** `pnpm install` (workspace uses `pnpm@10.x` — align to `pnpm@10.18.3`).
- **Dev (live):** `pnpm dev` (runs `tsx watch src/main.ts`).
- **Build:** `pnpm build` (runs `tsc`, emits `dist/`).
- **Start (prod):** `pnpm start` (runs `node dist/main.js`).
- **Deploy commands:** `pnpm run deploy-commands` (after build — `dist/scripts/deployCommands.js`).

## Required environment variables (exact keys used by `loadConfig()`)

- **DISCORD_BOT_TOKEN** (required)
- **DISCORD_CLIENT_ID** (required)
- **DISCORD_GUILD_ID** (required)
- **GITHUB_TOKEN** (required)
- **GITHUB_ORG** (required)
- **LOG_CHANNEL_ID** (required)
- **STARS_VOICE_CHANNEL_ID** (required)
- **WEBHOOK_PORT** (required)
- **WEBHOOK_SECRET** (required)
- **PROJECT_THREAD_CHANNEL_ID** (required)
- **RELEASE_CHANNEL_ID** (required)
- **WATCHED_REPOSITORIES** (required)
- **WATCHED_LABELS** (required)
- **NODE_ENV** (required)
- **LOG_LEVEL** (required)
- **ENABLE_FILE_LOGS** (required)
- **LOG_DIR** (required)

## Project conventions (non-negotiable)

- **TypeScript strict mode:** no implicit `any`; explicit return types; use `import type` for types.
- **Command modules:** export object with `data` (SlashCommandBuilder-like) and `execute(interaction)`; `data.name` is used for registration.
- **Event modules:** export `{ name, once?, execute }` and use `Events` enum where applicable.
- **Runtime file loading:** production runs compiled `.js` from `dist/`; `main.ts` reads `.js` files. Ensure `tsc` `outDir` is `dist` and compiled structure matches `src/` layout.
- **Logging:** use `getLogger()` singleton; include contextual metadata (userId, channelId, repo) and avoid secrets in logs.

## Developer workflows & checks

- **Before opening a PR run these locally:**

```bash
pnpm install
pnpm format
pnpm lint
pnpm type-check
pnpm build
```

- **Verify runtime artifacts exist after build:**

```bash
ls -la dist/handlers || echo "Missing compiled handlers"
```

- The webhook server starts before Discord login in `main.ts` to support platform health checks — preserve this sequence when changing startup.

## Style and tooling notes

- Follow the desktop-app `.prettierrc.json` and `.eslintrc.js` settings (4-space tabs, double quotes, semicolons) — the workspace root is authoritative.
- `packageManager` and `engines.pnpm` should align to `pnpm@10.18.3` (this repo has been updated to reflect that).

## Where to look for examples

- **Commands:** `src/handlers/commands/<folder>/*.ts` (see compiled `.js` in `dist/handlers` after build).
- **Webhooks:** `src/services/webhook` and `src/services/webhook/handlers`.
- **Config:** `src/config/environment.ts`, `src/config/config.ts`.

## Safety & operations

- **Never commit tokens or `.env` files.** Use `loadConfig()` for runtime validation and surface missing vars as errors.
- For changes that affect process lifecycle (SIGINT handling, uncaught exceptions, webhook ports), reference `main.ts` and preserve existing graceful-shutdown behavior.
