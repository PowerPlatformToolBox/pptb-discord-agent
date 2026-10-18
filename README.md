# PPTB Agent

Discord notifications and slash commands for the **Power Platform ToolBox** community server,
hosted on **Vercel**.

PPTB Agent posts to Discord when things happen on the platform:
- tool submissions, updates and verification decisions from pptb-web,
- PPTB and VS Code extension releases from GitHub,
- discussion threads for labeled issues and PRs,
- a live star counter.

It also provides `/help`, `/about`, `/ping`, and `/create-issue` slash commands. `/help` lists the
registered commands and official links; `/about` explains the bot and its offline badge. Both
reply privately (ephemerally), without external API calls.

## Documentation

| Guide | Use it to |
| --- | --- |
| [Discord setup](docs/DISCORD_SETUP.md) | Create the Discord app, invite the bot, create channels, connect slash commands |
| [Deploying to Vercel](docs/DEPLOYMENT.md) | Deploy, configure env vars, connect GitHub webhooks, operate and migrate from Railway |
| [Notifications](docs/NOTIFICATIONS.md) | See the catalogue, turn notifications on/off, route to channels, send events, add new ones |
| [Integrations](docs/INTEGRATIONS.md) | Wire up pptb-web and tool-management (includes ready-to-use prompts) |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Diagnose missing messages, 4xx/5xx responses and permissions |
| [Improvement roadmap](docs/ROADMAP.md) | Track completed capabilities and prioritized improvements within Vercel Hobby |

**First-time setup order:**
1. [Discord setup](docs/DISCORD_SETUP.md) steps 1–5.
2. [Deployment](docs/DEPLOYMENT.md).
3. Discord setup steps 6–7.
4. [Integrations](docs/INTEGRATIONS.md).

## How it works

```text
pptb-web / tool-management ──signed POST──▶ /api/events ─┐
GitHub org webhook ─────────signed POST──▶ /api/github ──┼──▶ notification catalogue ──▶ Discord REST API
Vercel Cron (daily) ───────────────GET───▶ /api/cron/stars┘      (validate → render → route)
Discord slash commands ─────signed POST──▶ /api/interactions ──▶ /help, /about, /ping, /create-issue
```

- Every inbound request is signature-checked: Ed25519 for Discord, HMAC for GitHub and the platform
  services, a bearer token for cron.
- Each notification is defined once in
  [`src/notifications/events/`](src/notifications/events) and registered in
  [`catalog.ts`](src/notifications/catalog.ts). Disable with `DISABLED_NOTIFICATIONS` or redirect
  with `NOTIFICATION_ROUTES`, both without code changes.
- The bot appears **offline** in Discord because it runs serverless with no gateway connection.
  This is expected.

After deploying command changes to Vercel, run `pnpm deploy-commands` with the matching
application and guild configuration to register them in Discord. Deployment alone does not
register new commands; see [Discord setup](docs/DISCORD_SETUP.md#6-connect-slash-commands-after-deploying).

## Development

Requires Node 24 and pnpm 10.18.3.

```bash
pnpm install
cp .env.example .env            # or: vercel env pull .env
pnpm dev                        # local server on http://localhost:3000 (same handlers as Vercel)
pnpm send-test-event all        # post every sample platform notification to the local server
pnpm deploy-commands            # register slash commands in DISCORD_GUILD_ID
pnpm lint && pnpm format:check && pnpm type-check && pnpm test
```

```text
api/                     Vercel Functions (thin adapters)
src/app/                 Request → Response handlers (github, events, interactions, health, cron)
src/notifications/       Catalogue, per-category definitions, dispatcher, on/off + routing settings
src/sources/             GitHub webhook routing, platform event envelope
src/discord/             Discord REST client and message limits
src/security/            Signature verification
src/commands/            Slash commands
src/config/              Environment schema and config
src/scripts/             deploy-commands, send-test-event
src/dev/server.ts        Local development server
tests/                   Jest tests and shared test helpers
jest.config.ts           Jest configuration (Node environment, ts-jest for TypeScript)
```

Tests live outside the application source in the root-level `tests/` folder and use Jest.
Run `pnpm test` for the full suite, `pnpm test --watch` while developing, or
`pnpm test --coverage` for a coverage report in `coverage/`.

## License

GPL-3.0
