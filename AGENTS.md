# AGENTS.md

PPTB Agent: Discord notifications and slash commands for Power Platform ToolBox, built as
stateless **Vercel Functions** in TypeScript. There is no discord.js gateway connection. All Discord
calls use the HTTP API (`src/discord/rest.ts`), and slash commands arrive through the Interactions
Endpoint (`/api/interactions`).

## Setup and commands

Node 24 (see `.node-version`) and pnpm 10.18.3. Use pnpm only.

```bash
pnpm install
cp .env.example .env     # or: vercel env pull .env
pnpm dev                 # src/dev/server.ts on :3000, routes from src/app/routes.ts
pnpm deploy-commands     # registers slash commands (guild scoped)
pnpm send-test-event <key|all> [base-url]
pnpm test                # Jest
```

There is no build step. Vercel compiles `api/*.ts` on deploy (`vercel.json`: framework `null`,
static output `public/`). Env files are loaded with `--env-file-if-exists=.env`; there is no
dotenv dependency.

CI (`.github/workflows/ci.yml`) runs these checks; run them before opening a PR:

```bash
pnpm lint && pnpm format:check && pnpm type-check && pnpm test
```

## Layout

- `api/`: Vercel Function entry points. Thin adapters only; logic lives in `src/app/`.
- `src/app/`: Web `Request` → `Response` handlers: `githubWebhook`, `platformEvents`,
  `interactions`, `health`, `starsCron`. `routes.ts` is the route table for the dev server.
- `src/notifications/`:
  - `catalog.ts`: single registry.
  - `events/*.ts`: definitions per category (schema, renderer, default channel, `enabled`,
    `example`).
  - `dispatcher.ts`: validate → render → deliver.
  - `settings.ts`: `DISABLED_NOTIFICATIONS` and `NOTIFICATION_ROUTES`.
  - `channels.ts`: channel aliases.
- `src/sources/github/router.ts`: pure mapping of GitHub webhooks to notification keys
  (`RELEASE_REPOSITORIES`).
- `src/sources/platform/envelope.ts`: `/api/events` envelope schema.
- `src/discord/`: REST client (rate-limit aware) and message clamping to Discord limits.
- `src/security/signatures.ts`: GitHub HMAC, platform HMAC + timestamp, Discord Ed25519, cron bearer.
- `src/commands/`: slash commands (`SlashCommand` returns `reply` or `defer` with deferred work).
- `src/config/`: zod env schema (`environment.ts`), cached `loadConfig()` (`config.ts`), constants.
- `src/services/github/`: GitHub API client and issue service.
- `tests/`: Jest tests; `testEnv.ts` provides `useTestEnv()`. Configuration is in `jest.config.ts`.
- `docs/`: setup, deployment, notifications, integrations, troubleshooting.

## Endpoints

| Path | Source | Auth |
| --- | --- | --- |
| `POST /api/events` | pptb-web, tool-management | `X-PPTB-Signature` = `sha256=` HMAC of `"<ts>.<body>"`, `X-PPTB-Timestamp` within 300 s |
| `POST /api/github` | GitHub org webhook (`release`, `issues`, `pull_request`, `star`) | `X-Hub-Signature-256` |
| `POST /api/interactions` | Discord | Ed25519 (`DISCORD_PUBLIC_KEY`) |
| `GET /api/cron/stars` | Vercel Cron, daily | `Authorization: Bearer CRON_SECRET` |
| `GET /api/health` | Anyone | None; never returns config details |

## Environment

Source of truth is `src/config/environment.ts`; `.env.example` is the documented template.

| Variable | Purpose |
| --- | --- |
| `DISCORD_BOT_TOKEN` | Bot token |
| `DISCORD_CLIENT_ID` | Application ID |
| `DISCORD_PUBLIC_KEY` | Application public key (interaction signatures) |
| `DISCORD_GUILD_ID` | Guild (command registration, thread lookup) |
| `DISCORD_CHANNEL_ADMIN` / `_TOOLS` / `_RELEASES` / `_INSIDER` / `_DISCUSSIONS` / `_STARS` | Channel IDs for the six aliases |
| `DISCUSSION_THREAD_ROLE_IDS` | Optional, comma-separated Discord role IDs to auto-add their members to GitHub discussion threads |
| `GITHUB_TOKEN` | GitHub API token (issues, stars sync) |
| `GITHUB_ORG` | GitHub organization; webhooks from other owners are ignored |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook HMAC secret |
| `STARS_REPOSITORY` | Repo whose star count is shown |
| `WATCHED_LABELS` | Comma-separated labels that create discussion threads |
| `PLATFORM_EVENTS_SECRET` | HMAC secret shared with platform services (≥ 32 chars) |
| `CRON_SECRET` | Vercel cron bearer secret (≥ 16 chars) |
| `LOG_LEVEL` | Optional, default `info` |
| `DISABLED_NOTIFICATIONS` | Optional: keys, `category.*` or `*` |
| `NOTIFICATION_ROUTES` | Optional: `key=alias-or-channel-id` pairs |

When adding or removing a variable, update these together:
- `environment.ts`
- `config.ts`
- `.env.example`
- `tests/testEnv.ts`
- this table
- `docs/DEPLOYMENT.md`

## Adding a notification

1. Define it with `defineNotification` in `src/notifications/events/<category>.ts`. Include a key
   such as `category.event-name`, a zod schema, `example`, default `channel`, `source` and a
   renderer.
2. Add it to the file's exported list. New files must be added to `NOTIFICATIONS` in `catalog.ts`.
3. GitHub-sourced events also need a mapping in `src/sources/github/router.ts`.
4. Update the tables in `docs/NOTIFICATIONS.md`. The catalogue tests render every example and
   enforce Discord limits.

## Conventions

- TypeScript strict: no `any`, explicit return types, `import type` for types.
- Prettier: 2 spaces, single quotes, semicolons, width 100. ESLint 10 flat config.
- zod 4 (`error.issues`, `z.url`, `z.iso.datetime`).
- Handlers take a Web `Request` and return a `Response`. Keep `api/` files as one-line adapters.
- Singletons via `getX()` helpers (`getDiscordRest`, `getGitHubClient`), with `resetX()` for tests.
- Log with `getLogger(scope)` (JSON to stdout). Include context; never log secrets or tokens. The
  logger reads `process.env` directly and must not call `loadConfig()`.
- Outgoing messages always set `allowed_mentions: { parse: [] }` (done in the dispatcher).

## Gotchas

- Read the raw body (`request.text()`) before parsing; signatures are over exact bytes.
- Deferred slash commands use `waitUntil` from `@vercel/functions`. Respond within 3 s, then edit
  the original response.
- Discord limits: content 2000, embed description 4096, field 1024, 25 fields, thread name 100,
  channel renames about 2 per 10 minutes (the dispatcher skips rate-limited renames).
- Return non-2xx from `/api/github` on delivery failure so GitHub shows it as failed and allows
  redelivery.
- Vercel Hobby cron runs at most once a day.
- After changing a command definition, run `pnpm deploy-commands`.
- Never commit `.env` or tokens.
