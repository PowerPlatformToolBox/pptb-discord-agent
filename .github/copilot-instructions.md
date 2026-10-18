<!-- Copilot / AI agent instructions for pptb-discord-assistant -->

# PPTB Agent — Copilot Instructions

**Read [`AGENTS.md`](../AGENTS.md) first.** It is the authoritative, up-to-date guide to this
repository: commands, layout, endpoints, environment variables, conventions and gotchas.

## Quick orientation

- PPTB Agent is the Power Platform ToolBox Discord bot.
- It runs as stateless **Vercel Functions** (`api/*.ts`), with no discord.js and no gateway.
- Discord is reached only through its HTTP API (`src/discord/rest.ts`). Slash commands arrive
  through the Interactions Endpoint (`/api/interactions`).
- Notifications are centralized in `src/notifications/catalog.ts`. Each one is defined in
  `src/notifications/events/<category>.ts`.
- Runtime switches: `DISABLED_NOTIFICATIONS` turns notifications off and `NOTIFICATION_ROUTES`
  redirects them. Neither needs a code change.
- Docs for humans are in `docs/`: `DISCORD_SETUP`, `DEPLOYMENT`, `NOTIFICATIONS`, `INTEGRATIONS`,
  `TROUBLESHOOTING`.

## Non-negotiables

- TypeScript strict mode: no `any`, explicit return types, `import type` for types.
- Handlers take a Web `Request` and return a `Response`. Keep `api/` files as thin adapters.
- Verify signatures on the raw body before parsing. Never log secrets or tokens.
- Outgoing Discord messages must keep `allowed_mentions: { parse: [] }`.
- When an environment variable changes, update everything listed in `AGENTS.md` together.
- Before a PR: `pnpm lint && pnpm format:check && pnpm type-check && pnpm test`.
- Never commit `.env` files or tokens.
