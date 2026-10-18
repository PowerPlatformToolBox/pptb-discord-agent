# Troubleshooting

Start with `https://YOUR-DOMAIN/api/health`. Then check **Vercel → Project → Logs**, filtered by the
endpoint path. Every log line is JSON with `level`, `scope`, `message` and context such as the
notification `key`, `channelId` or GitHub `delivery`. Secrets are never logged.

## Quick reference

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `/api/health` returns `misconfigured` (503) | Missing or invalid environment variable | Read the `Configuration invalid` log line; fix the variable; **redeploy** |
| Bot shows offline | Expected: it runs on Vercel with no live gateway connection | Nothing to fix |
| Interactions Endpoint URL won't save | Wrong `DISCORD_PUBLIC_KEY`, not redeployed, or a protected preview URL | Copy the key again, redeploy, use the production domain |
| Slash commands don't appear | `pnpm deploy-commands` not run, or wrong `DISCORD_GUILD_ID` | Run it with `.env` filled in; restart the Discord client |
| "The application did not respond" | Interactions URL points at an old or broken deployment | Check the `/api/interactions` logs; confirm the URL |
| `/create-issue` says it failed | `GITHUB_TOKEN` expired or lacks *Issues: write* on that repo | Regenerate the token ([DEPLOYMENT.md](./DEPLOYMENT.md#2-create-a-github-token)) |
| Event returns 401 | Secret mismatch, or sender clock off by more than 5 min | Re-copy the secret on both sides; check the sender's clock |
| Event returns 422 | Payload doesn't match the schema | The response `issues` array names the field; see [NOTIFICATIONS.md](./NOTIFICATIONS.md#payload-reference) |
| Event returns 400 `Unknown event type` | Typo in `type`, or a GitHub-only key | Use a key from the catalogue table |
| Event returns 200 `disabled` | Listed in `DISABLED_NOTIFICATIONS` (maybe via `category.*` or `*`) | Remove it and redeploy |
| Event returns 502; log shows `Discord API 403 … Missing Access` | Bot can't see or post in the target channel | Add the bot to the channel's permissions ([DISCORD_SETUP.md](./DISCORD_SETUP.md#channel-permissions)) |
| Log shows `Discord API 404 … Unknown Channel` | Wrong channel ID, or the channel was deleted | Copy the ID again; update `DISCORD_CHANNEL_*` or `NOTIFICATION_ROUTES` |
| Log shows `Discord API 401` | Bot token reset or wrong | Update `DISCORD_BOT_TOKEN` and redeploy |
| Log shows `Invalid route "…"` | Bad `NOTIFICATION_ROUTES` target | Use an alias (`admin`, `tools`, …) or a 17–20 digit channel ID |

## GitHub webhooks

Open the webhook → **Recent Deliveries**.

- **Red, 401 `Invalid signature`**: the webhook secret doesn't match `GITHUB_WEBHOOK_SECRET`. The
  content type must be `application/json`.
- **Green, but nothing posted**: read the response body.
  - `"results":[]` means the event was ignored by design: wrong repo, a draft release, a label not
    in `WATCHED_LABELS`, an issue that was labeled with something else, or a star on a repo other
    than `STARS_REPOSITORY`.
  - `"status":"skipped","reason":"thread-exists"` means a thread for that issue already exists.
- **Red, 500**: delivery to Discord failed. The Vercel log line `Notification failed` has the
  reason. After fixing it, click **Redeliver**.
- **Release posted twice**: the old Railway bot, or a second webhook, is still active. Remove one.

## Stars channel

- Discord allows about **2 renames per 10 minutes** per channel. Bursts of stars are skipped with
  `reason: "rate-limited"`. The daily cron, or the next star after the window, catches up.
- `Missing Permissions`: give the bot **Manage Channel** on the voice channel itself.
- The count belongs to the wrong repo: check `STARS_REPOSITORY`.

## Discussion threads

- No thread was created: check that the bot has **Create Public Threads**, **Send Messages in
  Threads** and **Read Message History** in the discussions channel, and that the label matches
  `WATCHED_LABELS` exactly (case-sensitive).
- Threads are de-duplicated by the `[repo#number]` prefix in the thread name. Renaming a thread
  in Discord breaks this, and a later label creates a new thread.

## Cron

- **Settings → Cron Jobs** shows the schedule and lets you run it now. The response is in Logs
  under `/api/cron/stars`.
- 401 means `CRON_SECRET` is missing. Vercel only sends the header when the variable is set in
  the project.

## Reproducing locally

```bash
vercel env pull .env       # production values; handle with care
pnpm dev                   # http://localhost:3000
pnpm send-test-event tool.update http://localhost:3000
```

Set `LOG_LEVEL=debug` for more detail. Locally, messages go to the **real** channels configured in
`.env`. Use a test server or test channel IDs if you don't want to post to the community.
