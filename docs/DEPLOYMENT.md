# Deploying to Vercel

PPTB Agent is a set of Vercel Functions (`api/*.ts`). There is no long-running server and no build
step. Vercel compiles the TypeScript functions on deploy. This guide covers a first deployment and
day-to-day operations.

Before you start, have the values from [DISCORD_SETUP.md](./DISCORD_SETUP.md) steps 1–5 ready.

## Endpoints

| Path | Method | Called by | Auth |
| --- | --- | --- | --- |
| `/api/health` | GET | You / uptime monitors | None. Returns `ok` or `misconfigured`, no secrets |
| `/api/interactions` | POST | Discord (slash commands) | Ed25519 signature (`DISCORD_PUBLIC_KEY`) |
| `/api/github` | POST | GitHub webhooks | HMAC `X-Hub-Signature-256` (`GITHUB_WEBHOOK_SECRET`) |
| `/api/events` | POST | pptb-web, tool-management | HMAC `X-PPTB-Signature` + timestamp (`PLATFORM_EVENTS_SECRET`) |
| `/api/cron/stars` | GET | Vercel Cron, daily at 06:00 UTC | `Authorization: Bearer <CRON_SECRET>` |

## 1. Generate the shared secrets

Run this three times in a terminal and keep each value:

```bash
openssl rand -hex 32
```

- `GITHUB_WEBHOOK_SECRET`: pasted into the GitHub webhook in step 4.
- `PLATFORM_EVENTS_SECRET`: shared with pptb-web and tool-management.
- `CRON_SECRET`: used only by Vercel.

## 2. Create a GitHub token

The token is used by `/create-issue` and the daily stars sync.

1. GitHub → **Settings → Developer settings → Fine-grained tokens → Generate new token**.
2. **Resource owner**: `PowerPlatformToolBox`. **Repository access**: the repos people can file
   issues in (`desktop-app`, `pptb-web`, `pptb-docs-web`), plus `STARS_REPOSITORY` if it isn't one
   of them.
3. **Permissions**: *Issues* read and write, *Metadata* read (selected automatically).
4. Set an expiry and add a calendar reminder to rotate it. Save it as `GITHUB_TOKEN`.

## 3. Create the Vercel project

1. In [Vercel](https://vercel.com/new), click **Add New → Project** and import
   `PowerPlatformToolBox/pptb-discord-assistant`.
2. **Framework Preset**: *Other*. Leave **Build Command** and **Output Directory** empty;
   `vercel.json` already sets them.
3. Expand **Environment Variables** and add every variable from [`.env.example`](../.env.example),
   scoped to **Production** (and Preview, if you want working previews).

   | Variable | Value |
   | --- | --- |
   | `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_GUILD_ID` | From the Developer Portal |
   | `DISCORD_CHANNEL_ADMIN` … `DISCORD_CHANNEL_STARS` | The six channel IDs |
   | `GITHUB_TOKEN` | Step 2 |
   | `GITHUB_ORG` | `PowerPlatformToolBox` |
   | `GITHUB_WEBHOOK_SECRET`, `PLATFORM_EVENTS_SECRET`, `CRON_SECRET` | Step 1 |
   | `STARS_REPOSITORY` | `desktop-app` |
   | `WATCHED_LABELS` | `DiscordDiscussion` |
   | `DISCUSSION_THREAD_ROLE_IDS` | Optional; comma-separated role IDs to add their members to discussion threads |
   | `LOG_LEVEL` | `info` (optional) |
   | `DISABLED_NOTIFICATIONS`, `NOTIFICATION_ROUTES` | Optional; leave empty to start |

   Mark the token and secrets as **Sensitive**.

4. Click **Deploy**.
5. **Settings → Domains**: note the production domain, e.g. `pptb-agent.vercel.app`. You can rename
   the project or add a custom domain such as `bot.powerplatformtoolbox.com`.

> **Deployment Protection:** Vercel protects *preview* URLs with a login by default. Discord and
> GitHub can't pass that login, so always give them the **production** domain.

### Verify the deployment

Open `https://YOUR-DOMAIN/api/health` in a browser.

- `{"status":"ok","bot":"PPTB Agent","notifications":[...]}`: everything is configured. The list
  shows which notifications are enabled.
- `{"status":"misconfigured"}` (HTTP 503): an environment variable is missing or invalid. Open
  **Vercel → Project → Logs**, filter by `/api/health`, and read the `Configuration invalid` entry.
  It names each bad variable. Fix it under **Settings → Environment Variables**, then **Redeploy**.
  Environment changes only apply to new deployments.

Now continue with [DISCORD_SETUP.md step 6](./DISCORD_SETUP.md#6-connect-slash-commands-after-deploying)
to connect slash commands.

## 4. Connect GitHub webhooks

GitHub webhooks drive:
- release announcements,
- discussion threads,
- live star counts.

Use an **organization** webhook to cover every repo with one setup.

1. GitHub → `PowerPlatformToolBox` org → **Settings → Webhooks → Add webhook**.
2. **Payload URL**: `https://YOUR-DOMAIN/api/github`
3. **Content type**: `application/json`. This is required; the form-encoded type is rejected.
4. **Secret**: your `GITHUB_WEBHOOK_SECRET`.
5. **Which events?** → *Let me select individual events*, then tick:
   - **Releases**: PPTB stable/insider and VS Code extension announcements.
   - **Issues** and **Pull requests**: discussion threads when a watched label is added.
   - **Stars**: live star count.
6. Click **Add webhook**. GitHub sends a `ping`, which should show a green tick (HTTP 200).

What the bot does with each event:

| GitHub event | Repositories | Result |
| --- | --- | --- |
| `release` published, not draft, not pre-release | `desktop-app` | `pptb.new-release` → `releases` |
| `release` published, pre-release | `desktop-app` | `pptb.insider` → `insider` |
| `release` published, not pre-release | `vscode-extension` | `vscode.new-release` → `releases` |
| `issues` / `pull_request` `labeled` with a label in `WATCHED_LABELS` | Any org repo | `github.discussion-thread`: one thread per repo + number |
| `star` created/deleted | `STARS_REPOSITORY` only | `github.stars` renames the stars channel |

Repositories and event types not in this table are acknowledged with HTTP 200 and ignored. The
release mapping lives in `RELEASE_REPOSITORIES` in
[`src/sources/github/router.ts`](../src/sources/github/router.ts).

**Testing:** on the webhook page open **Recent Deliveries**, pick a delivery and click **Redeliver**.
The response body lists what was sent, e.g. `{"results":[{"key":"pptb.new-release","status":"sent"}]}`.
A failed Discord delivery returns HTTP 500, so it shows as a red failure you can redeliver once the
problem is fixed.

## 5. Connect pptb-web and tool-management

Tool submission, tool and verification notifications are sent by the platform services to
`/api/events`. Set these in each service:

| Variable | Value |
| --- | --- |
| `DISCORD_EVENTS_URL` | `https://YOUR-DOMAIN/api/events` |
| `DISCORD_EVENTS_SECRET` | Same value as `PLATFORM_EVENTS_SECRET` |

The integration work for each repo is described in [INTEGRATIONS.md](./INTEGRATIONS.md); the
request format is in [NOTIFICATIONS.md](./NOTIFICATIONS.md#sending-events-from-platform-services).

## 6. Daily stars sync (Vercel Cron)

`vercel.json` schedules `GET /api/cron/stars` daily at 06:00 UTC. Discord only allows about two
channel renames per 10 minutes, so on busy days some live star updates are skipped. The daily job
corrects the count. Vercel attaches `CRON_SECRET` automatically.

- Check runs under **Vercel → Project → Settings → Cron Jobs**. You can also trigger a run there.
- The Hobby plan allows at most one run per day, and the time can drift within that hour. On Pro
  you could change the schedule in `vercel.json`, for example to `0 * * * *` (hourly).

## Day-to-day operations

| Task | How |
| --- | --- |
| Deploy a change | Merge to `main`; Vercel deploys automatically. PRs get preview deployments |
| Change an env var | Settings → Environment Variables → edit → **Deployments → … → Redeploy** |
| Turn a notification off/on | Edit `DISABLED_NOTIFICATIONS`, redeploy. See [NOTIFICATIONS.md](./NOTIFICATIONS.md) |
| Move a notification to another channel | Edit `NOTIFICATION_ROUTES`, redeploy |
| Change or add slash commands | Edit `src/commands/`, deploy, then run `pnpm deploy-commands` locally |
| Read logs | Vercel → Project → **Logs**. Every line is JSON with `scope`, `message` and context |
| Roll back | Vercel → Deployments → pick a previous one → **Promote to Production** |
| Rotate the bot token | Developer Portal → Bot → Reset Token → update `DISCORD_BOT_TOKEN` → redeploy |
| Rotate a shared secret | Update it in both places (GitHub webhook or pptb-web/tool-management), then redeploy |

## Local development

```bash
pnpm install
cp .env.example .env     # or: vercel env pull .env
pnpm dev                 # http://localhost:3000/api/health
```

`pnpm dev` serves the landing page at `http://localhost:3000/` and the same API handlers as
Vercel. The health endpoint is `http://localhost:3000/api/health`.
To receive real Discord or GitHub traffic locally,
expose the port with a tunnel such as `ngrok http 3000`. Then temporarily point the Interactions
Endpoint URL or a test webhook at the tunnel URL. `vercel dev` also works if you have the Vercel CLI.

Before opening a PR:

```bash
pnpm lint && pnpm format:check && pnpm type-check && pnpm test
```

## Migrating from Railway

The previous version ran on Railway as a gateway bot. To switch over:

1. Complete steps 1–6 above. The Discord application and bot token can stay the same; you only add
   the **Public Key** and the **Interactions Endpoint URL**.
2. Update the existing GitHub webhook's **Payload URL** to `https://YOUR-DOMAIN/api/github`.
   Updating avoids duplicate posts from two webhooks.
3. Run `pnpm deploy-commands` once.
4. Stop and delete the Railway service. While both run, the old bot may post duplicate release
   messages.

Renamed or removed environment variables:

| Old (Railway) | New (Vercel) |
| --- | --- |
| `WEBHOOK_SECRET` | `GITHUB_WEBHOOK_SECRET` |
| `PROJECT_THREAD_CHANNEL_ID` | `DISCORD_CHANNEL_DISCUSSIONS` |
| `RELEASE_CHANNEL_ID` | `DISCORD_CHANNEL_RELEASES` (and `DISCORD_CHANNEL_INSIDER`) |
| `STARS_VOICE_CHANNEL_ID` | `DISCORD_CHANNEL_STARS` |
| `WATCHED_REPOSITORIES` | Removed: release repos are mapped in code (`RELEASE_REPOSITORIES`) |
| `WEBHOOK_PORT`, `NODE_ENV`, `ENABLE_FILE_LOGS`, `LOG_DIR` | Removed: Vercel handles ports and logs |
