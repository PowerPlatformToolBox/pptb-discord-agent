# Notifications

All Discord notifications are defined in one place,
[`src/notifications/catalog.ts`](../src/notifications/catalog.ts). Each entry has:
- a stable **key** (e.g. `verify.approved`)
- a payload schema
- a message template
- a default channel
- an on/off switch

Everything below is driven by that catalogue.

## Catalogue

| Category | Event | Key | Default channel | Sent by |
| --- | --- | --- | --- | --- |
| Tool Submission | New | `tool-submission.new` | admin | pptb-web |
| Tool Submission | Approved | `tool-submission.approved` | tools | pptb-web |
| Tool Submission | Rejected | `tool-submission.rejected` | admin | pptb-web |
| Tool Submission | Revoked | `tool-submission.revoked` | tools | pptb-web |
| Tool | UpdateCategories | `tool.update-categories` | admin | pptb-web |
| Tool | Deprecated | `tool.deprecated` | tools | pptb-web |
| Tool | Deleted | `tool.deleted` | tools | pptb-web |
| Tool | Update | `tool.update` | tools | pptb-web (`/api/update-tool`, called by tool-management) |
| Tool | ManualUpdate | `tool.manual-update` | admin | pptb-web |
| Tool | UpdateFailed | `tool.update-failed` | admin | pptb-web (`/api/update-tool`, called by tool-management) |
| Verify | Requested | `verify.requested` | admin | pptb-web |
| Verify | Assigned | `verify.assigned` | admin | pptb-web |
| Verify | Approved | `verify.approved` | tools | pptb-web |
| Verify | Rejected | `verify.rejected` | admin | pptb-web |
| Verify | Revoked | `verify.revoked` | admin | pptb-web |
| PPTB | NewRelease | `pptb.new-release` | releases | GitHub `release` webhook (`desktop-app`) |
| PPTB | Insider | `pptb.insider` | insider | GitHub `release` webhook (`desktop-app`, pre-release) |
| VSCODE | NewRelease | `vscode.new-release` | releases | GitHub `release` webhook (`vscode-extension`) |
| GitHub | DiscussionThread | `github.discussion-thread` | discussions | GitHub `issues` / `pull_request` webhook |
| GitHub | Stars | `github.stars` | stars | GitHub `star` webhook + daily cron |

Two kinds of notification go to different places:

- **Internal ones** (submissions awaiting review, rejections, failures, the verification queue) go
  to the private `admin` channel by default.
- **Community-facing ones** go to `tools` or `releases`.

Rejection reasons are never posted publicly by default. `/api/health` lists every key and whether
it is currently enabled.

## Turn notifications off or on

**Without a code change**: set `DISABLED_NOTIFICATIONS` in Vercel, then redeploy. It's a
comma-separated list of:

| Entry | Effect |
| --- | --- |
| `verify.assigned` | That one notification |
| `verify.*` | Every notification in the category (the part before the dot) |
| `*` | Everything (emergency mute) |

```bash
DISABLED_NOTIFICATIONS=verify.assigned,tool.manual-update
DISABLED_NOTIFICATIONS=github.*
```

A disabled notification is acknowledged with `200 {"status":"disabled"}`, so senders don't retry.
Remove the entry and redeploy to turn it back on.

**Permanently in code**: set `enabled: false` in its definition under
[`src/notifications/events/`](../src/notifications/events). Use this for notifications that should
stay off for everyone.

## Route a notification to another channel

Every notification has a default **channel alias**: `admin`, `tools`, `releases`, `insider`,
`discussions` or `stars`. Each alias maps to a `DISCORD_CHANNEL_*` variable. To send one
notification somewhere else, set `NOTIFICATION_ROUTES` to `key=target` pairs. The target can be an
alias or a raw channel ID:

```bash
# Announce newly verified tools in #announcements, and tool updates in a dedicated channel
NOTIFICATION_ROUTES=verify.approved=releases,tool.update=123456789012345678
```

To move a **whole group** of notifications, change the alias's channel ID, for example
`DISCORD_CHANNEL_TOOLS`. An invalid route makes `/api/health` report `misconfigured`, and the
affected notification fails until it's fixed.

## Sending events from platform services

pptb-web and tool-management send events to `POST /api/events`. Only notifications marked as
platform-sent in the catalogue are accepted; release, thread and stars events come only from GitHub.

### Request

```http
POST https://YOUR-DOMAIN/api/events
Content-Type: application/json
X-PPTB-Timestamp: 1760000000
X-PPTB-Signature: sha256=<hex HMAC-SHA256 of "<timestamp>.<raw body>" using PLATFORM_EVENTS_SECRET>

{
  "type": "verify.approved",
  "id": "optional-id-for-log-correlation",
  "occurredAt": "2025-10-17T12:00:00Z",
  "data": { "tool": { "id": "…", "name": "Solution Explorer" }, "reviewer": { "name": "Jane" } }
}
```

- The timestamp is Unix **seconds**. Requests more than 5 minutes off the server clock are rejected,
  which blocks replays.
- Sign the **exact bytes** you send. Serialize the JSON once and use that string for both the
  signature and the body.

### Responses

| Status | Meaning | Should the sender retry? |
| --- | --- | --- |
| 200 `{"status":"sent"}` | Posted to Discord | – |
| 200 `{"status":"disabled"}` | Notification switched off | No |
| 400 | Unknown `type`, a GitHub-only type, or bad envelope | No: fix the sender |
| 401 | Bad or missing signature, or clock skew > 5 min | No: check the secret and clock |
| 413 | Body over 4 MB | No |
| 422 `{"issues":[…]}` | `data` doesn't match the schema; `issues` says which field | No: fix the payload |
| 500 | Bot misconfigured | Later |
| 502 | Discord rejected or failed the request | Yes, with backoff |

Senders should **never** let a notification failure break the user action. Fire it after the
database write, catch every error, and log it.

### Signing example (TypeScript / Node)

This is a complete helper. pptb-web can drop it into `lib/discord-notify.ts`.

```ts
import { createHmac } from 'node:crypto';

export async function notifyDiscord(type: string, data: unknown): Promise<void> {
  const url = process.env.DISCORD_EVENTS_URL;
  const secret = process.env.DISCORD_EVENTS_SECRET;
  if (!url || !secret) return; // not configured: skip silently

  const body = JSON.stringify({ type, id: crypto.randomUUID(), occurredAt: new Date().toISOString(), data });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PPTB-Timestamp': timestamp,
        'X-PPTB-Signature': `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.error('Discord notification failed', type, response.status, await response.text());
  } catch (error) {
    console.error('Discord notification error', type, error);
  }
}
```

### Signing example (bash / GitHub Actions)

```bash
BODY=$(jq -cn --arg name "$TOOL_NAME" --arg id "$TOOL_ID" --arg v "$VERSION" \
  '{type:"tool.update", data:{tool:{id:$id, name:$name, version:$v}}}')
TS=$(date +%s)
SIG=$(printf '%s' "$TS.$BODY" | openssl dgst -sha256 -hmac "$DISCORD_EVENTS_SECRET" | sed 's/^.* //')
curl -fsS -X POST "$DISCORD_EVENTS_URL" \
  -H 'Content-Type: application/json' \
  -H "X-PPTB-Timestamp: $TS" \
  -H "X-PPTB-Signature: sha256=$SIG" \
  --data-raw "$BODY" || echo "::warning::Discord notification failed"
```

### Try it

`pnpm send-test-event <key|all> [base-url]` signs and sends each notification's built-in example
using `PLATFORM_EVENTS_SECRET` from `.env`.

## Payload reference

Every platform event's `data` contains a `tool` object:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | ✔ | Tool ID in pptb-web |
| `name` | string | ✔ | Display name |
| `packageName` | string | | npm package |
| `version` | string | | **Required** for `tool.update` |
| `description` | string | | ≤ 1000 chars |
| `authors` | string[] | | |
| `url` | URL | | Marketplace page, used as the embed link |
| `iconUrl` | URL | | Embed thumbnail |

An **actor** is `{ "name": string, "discordHandle"?: string }`. URLs must be `http(s)`. Reasons are
1–1000 characters.

| Key | Additional `data` fields (✔ = required) |
| --- | --- |
| `tool-submission.new` | `submittedBy` actor ✔, `reviewUrl` |
| `tool-submission.approved` | `approvedBy` actor |
| `tool-submission.rejected` | `reason`, `rejectedBy` actor |
| `tool-submission.revoked` | `reason`, `revokedBy` actor |
| `tool.update-categories` | `categories` string[] ✔, `previousCategories` string[], `updatedBy` actor |
| `tool.deprecated` | `reason`, `replacement` `{ name ✔, url }` |
| `tool.deleted` | `reason` |
| `tool.update` | `tool.version` ✔, `previousVersion`, `releaseNotes` (≤ 1000), `releaseNotesUrl` |
| `tool.manual-update` | `requestedBy` actor ✔, `targetVersion`, `workflowUrl` |
| `tool.update-failed` | `errors` string[] ✔ (1–20), `attemptedVersion`, `workflowUrl` |
| `verify.requested` | `requestedBy` actor ✔, `reviewUrl` |
| `verify.assigned` | `assignee` actor ✔, `reviewUrl` |
| `verify.approved` | `reviewer` actor |
| `verify.rejected` | `reason`, `reviewer` actor |
| `verify.revoked` | `reason` ✔, `revokedBy` actor |

A full example of each payload is in its definition's `example` property in
[`src/notifications/events/`](../src/notifications/events). The source code is the authoritative
schema; a 422 response tells you exactly which field is wrong.

Messages never ping anyone: `allowed_mentions` is always empty, so text like `@everyone` in a
payload is harmless.

## Add a new notification

1. Pick the category file in [`src/notifications/events/`](../src/notifications/events), or create
   a new file for a new category.
2. Add a definition with `defineNotification`:

   ```ts
   export const toolFeatured = defineNotification({
     key: 'tool.featured',             // category.event, lowercase-kebab
     category: 'Tool',
     event: 'Featured',
     description: 'Tool featured on the marketplace home page',
     enabled: true,
     channel: 'tools',                 // default alias; override with NOTIFICATION_ROUTES
     source: 'platform',               // 'platform' = /api/events, 'github' = webhooks
     schema: z.object({ tool: toolSchema, featuredUntil: z.iso.datetime().optional() }),
     example: { tool: EXAMPLE_TOOL },
     delivery: {
       kind: 'message',
       render: ({ tool }) => ({
         embeds: [toolEmbed({ title: `🌟 Featured: ${tool.name}`, color: COLORS.PRIMARY, tool })],
       }),
     },
   });
   ```

3. Add it to that file's exported list (e.g. `TOOL_NOTIFICATIONS`). If you created a new file, also
   add its list to `NOTIFICATIONS` in [`catalog.ts`](../src/notifications/catalog.ts).
4. Run `pnpm test`. The catalogue tests render every `example` and check the Discord size limits
   automatically.
5. Add a row to the tables above, then deploy. Producers can send the new `type` right away.

For a new **GitHub** event, add the mapping in
[`src/sources/github/router.ts`](../src/sources/github/router.ts). To announce releases from
another repo, add it to `RELEASE_REPOSITORIES` there.

To add a new **channel alias**:
- add it to `CHANNEL_ALIASES` in [`channels.ts`](../src/notifications/channels.ts),
- add a `DISCORD_CHANNEL_<ALIAS>` variable to `environment.ts`, `config.ts`, `.env.example` and
  `tests/testEnv.ts`.
