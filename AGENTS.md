# AGENTS.md

TypeScript Discord bot (discord.js v14) for Power Platform ToolBox. It also runs an HTTP server that receives GitHub webhooks. Deployed on Railway.

## Setup and commands

Node 24 (see `.node-version`) and pnpm 10.18.3. Use pnpm only.

```bash
pnpm install
cp .env.example .env   # fill in every value
pnpm dev               # tsx watch src/main.ts, loads .env if present
pnpm build             # tsc -p tsconfig.build.json -> dist/
pnpm start             # node dist/main.js, loads .env if present
pnpm deploy-commands   # registers slash commands; run after build
pnpm test              # vitest run
```

Env files are loaded with `node --env-file-if-exists=.env`; there is no dotenv dependency.

CI (`.github/workflows/ci.yml`) runs these on every PR and on pushes to main. Run them locally before opening a PR:

```bash
pnpm lint && pnpm format:check && pnpm type-check && pnpm test
```

`pnpm format` rewrites files with Prettier.

## Layout

- `src/main.ts`: bootstrap. Loads commands and events from compiled `dist/`, registers webhook handlers, starts the webhook server, then logs in to Discord.
- `src/config/`: Zod env validation (`environment.ts`) and cached `loadConfig()` / `getConfig()` (`config.ts`).
- `src/handlers/commands/<folder>/`: slash commands (`createIssue`, `ping`).
- `src/handlers/events/`: Discord events (`ready`, `interactionCreate`).
- `src/services/webhook/webhookServer.ts`: HTTP server (`GET /health`, POST for GitHub events, HMAC check).
- `src/services/webhook/handlers/`: live webhook handlers (`projectItem`, `release`, `star`).
- `src/services/discord/voiceChannelService.ts`: renames the stars voice channel.
- `src/services/github/`: GitHub API client and issue service.
- `src/handlers/webhooks/` and `src/services/webhook/embeds/`: legacy code not imported by `main.ts`; do not extend it.
- `src/utils/`: logger (Winston), channel cache, path cache, error helpers, validators.
- `src/__tests__/`: vitest unit and webhook server tests.

## Webhook events

Wired in `src/main.ts`.

| Event | Behavior |
| --- | --- |
| `issues`, `pull_request` | On `labeled` with a label in `WATCHED_LABELS`, creates a discussion thread in `PROJECT_THREAD_CHANNEL_ID`. |
| `release` | Only `published`, non-draft. Posts an announcement to `RELEASE_CHANNEL_ID` (pre-release is labeled Insider) with a "What's New" section from the release body. |
| `star` | `created` or `deleted`: renames the `STARS_VOICE_CHANNEL_ID` channel to the current star count. |

Requests must carry a valid `X-Hub-Signature-256` for `WEBHOOK_SECRET`.

## Environment

Source of truth is `src/config/environment.ts`. Every variable is required; there are no defaults. `.env.example` is the template.

| Variable | Purpose |
| --- | --- |
| `DISCORD_BOT_TOKEN` | Bot token |
| `DISCORD_CLIENT_ID` | Application client ID |
| `DISCORD_GUILD_ID` | Guild for command registration |
| `GITHUB_TOKEN` | GitHub API token |
| `GITHUB_ORG` | GitHub organization |
| `NODE_ENV` | `development`, `production` or `test` |
| `LOG_LEVEL` | `debug`, `info`, `warn` or `error` |
| `ENABLE_FILE_LOGS` | `true` or `false` |
| `LOG_DIR` | Directory for file logs |
| `WEBHOOK_PORT` | HTTP port (positive integer) |
| `WEBHOOK_SECRET` | GitHub webhook HMAC secret |
| `PROJECT_THREAD_CHANNEL_ID` | Channel for discussion threads |
| `RELEASE_CHANNEL_ID` | Channel for release announcements |
| `STARS_VOICE_CHANNEL_ID` | Voice channel renamed with the star count |
| `WATCHED_REPOSITORIES` | Comma-separated repository names |
| `WATCHED_LABELS` | Comma-separated labels that trigger threads |

When adding or removing a variable, update `environment.ts`, `.env.example`, `src/__tests__/testEnv.ts` and this table together.

## Conventions

- TypeScript strict mode: no `any`, explicit return types, `import type` for types.
- Prettier: 2 spaces, single quotes, semicolons, width 100, LF. ESLint 10 flat config in `eslint.config.js`.
- Commands export a `BotCommand` (`data` and `execute`). Events export `{ name, once?, execute }`.
- Services are singletons obtained through `getX()` helpers.
- Log with `LoggerFactory` or `getLogger`, include context (repo, channelId), never log secrets. The logger reads `process.env` directly and must not call `loadConfig()`.
- Validation uses zod 4 (`error.issues`).

## Gotchas

- Commands and events load at runtime from compiled `.js` in `dist/`. After adding or changing a command, rebuild and run `pnpm deploy-commands`.
- The webhook server starts before Discord login so Railway health checks pass. Keep that order.
- Shutdown handles SIGINT and SIGTERM; keep it working when changing lifecycle code.
- Discord limits: message content 2000 characters, embed field 1024, and channel renames are rate limited (about 2 per 10 minutes).
- Railway builds with `pnpm build` and starts with `pnpm deploy-commands; pnpm start`.
- Never commit `.env` or tokens.
