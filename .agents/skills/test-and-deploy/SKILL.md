---
name: test-and-deploy
description: Verify and ship a PPTB Agent change. Covers the CI checks, Jest patterns, the local dev server, sending signed test events and GitHub webhooks, Vercel deployment, health checks and rollback. Use when asked to run tests, try a notification locally, deploy, or diagnose a failed delivery.
---

# Test and deploy

## Run the CI checks

Run these before every PR. CI runs the same four.

```bash
pnpm lint && pnpm format:check && pnpm type-check && pnpm test
```

If `format:check` fails, run `pnpm format`.

## Write tests

- Call `useTestEnv()` inside `describe`. It stubs a full environment and resets cached config and
  clients. New environment variables must be added to `tests/testEnv.ts`.
- Dispatcher behavior: pass a mock client through `DispatchDeps`, as `tests/dispatcher.test.ts`
  does.
- Endpoint behavior: stub `fetch` and sign real requests, as `tests/handlers.test.ts` does.
- GitHub mapping: call `routeGitHubEvent` directly, as `tests/githubRouter.test.ts` does.

## Run locally

```bash
pnpm dev
```

This serves the same handlers as Vercel at `http://localhost:3000`. Open `/api/health` first:
`misconfigured` means `.env` is incomplete, and the server log names each bad variable. Use
`.env.example` as the template, or run `vercel env pull .env`.

**Local sends are real.** With a valid bot token, these commands post to the channels in `.env`.
Point `DISCORD_CHANNEL_*` at a test server before running them, or set
`DISABLED_NOTIFICATIONS=*` to exercise signatures and routing without posting.

### Platform events

Sends each key's built-in `example`. Only `platform` keys are accepted.

```bash
pnpm send-test-event verify.approved
```

Use `all` as the key to send every platform event.

### GitHub webhooks

`send-test-event` rejects GitHub keys, so sign a payload yourself. Change `X-GitHub-Event` and the
JSON for other events. The body is signed as exact bytes, so reuse the same variable for both.

```bash
BODY='{"action":"published","repository":{"name":"desktop-app","full_name":"PowerPlatformToolBox/desktop-app","html_url":"https://github.com/PowerPlatformToolBox/desktop-app","owner":{"login":"PowerPlatformToolBox"}},"release":{"tag_name":"v1.3.0-insider.1","body":"## What'"'"'s New\n- Test item (#1)","html_url":"https://github.com/PowerPlatformToolBox/desktop-app/releases/tag/v1.3.0-insider.1","draft":false,"prerelease":true}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$GITHUB_WEBHOOK_SECRET" | sed 's/^.* //')
curl -i -X POST http://localhost:3000/api/github -H 'Content-Type: application/json' -H 'X-GitHub-Event: release' -H "X-Hub-Signature-256: sha256=$SIG" --data-binary "$BODY"
```

The response lists what happened, such as `{"results":[{"key":"pptb.insider","status":"sent"}]}`.
An empty `results` means the router ignored the event.

### Slash commands

Discord signs interactions with its private key, so they cannot be faked locally. Rely on
`tests/handlers.test.ts`, or expose the port with `ngrok http 3000` and temporarily point the
Interactions Endpoint URL at the tunnel.

## Deploy

Merging to `main` deploys to production through Vercel. There is no build step.

Production posts are visible to the community, so get the owner's approval before anything that
sends to production, changes production settings, or registers commands.

| Change | What else to do |
| --- | --- |
| Code or card | Nothing; merging deploys it |
| Slash command definition | Run `pnpm deploy-commands` after the deployment |
| Environment variable | Edit it in Vercel, then redeploy. Changes apply only to new deployments |
| New GitHub event type | Subscribe to it in the org webhook |

Preview deployments sit behind Vercel's login, so Discord and GitHub must use the production domain.

## Check production

- `GET /api/health`: `ok` plus each notification's state, or 503 `misconfigured`.
- Vercel Logs: JSON lines with `scope` and `message`. Look for `Notification sent` and
  `Platform event processed`.
- GitHub webhook **Recent Deliveries**: the response body shows the results, and **Redeliver**
  retries. `/api/github` returns 500 on a failed Discord delivery so that it can be redelivered.
- Roll back in Vercel: Deployments, pick a previous one, **Promote to Production**.

`docs/TROUBLESHOOTING.md` covers specific failures and `docs/DEPLOYMENT.md` covers setup.
