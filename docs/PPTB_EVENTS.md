# PPTB events

pptb-web tells the bot when something happens to a submission, tool or verification. The bot posts it to Discord.

## Request

`POST /pptb-events` on the bot's webhook port.

Headers:

- `x-pptb-timestamp`: current unix time in seconds
- `x-pptb-signature`: `sha256=` + hex HMAC-SHA256 of `${timestamp}.${rawBody}`, keyed with `PPTB_EVENTS_SECRET`

Requests more than 5 minutes old are rejected.

```ts
import { createHmac } from 'node:crypto';

const body = JSON.stringify(event);
const timestamp = String(Math.floor(Date.now() / 1000));
const signature =
  'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
```

## Body

```json
{
  "id": "intake:abc-123:pending_review",
  "category": "toolSubmission",
  "event": "New",
  "occurredAt": "2026-10-07T06:00:00.000Z",
  "subject": { "type": "intake", "id": "abc-123" },
  "tool": { "id": "optional", "name": "FetchXML Builder", "url": "https://..." },
  "developer": "optional display name",
  "actor": "optional, who did it",
  "reason": "optional, shown as the embed description",
  "detail": { "Version": "1.2.0" }
}
```

- `id` must be unique per event. The bot ignores an `id` it has already posted, so a retry is safe.
- `subject` is what the event is about. Keep it the same across events for the same intake, tool or verification request.

| category         | events                                                                                |
| ---------------- | ------------------------------------------------------------------------------------- |
| `toolSubmission` | `New`, `Approved`, `Rejected`, `ChangesRequested`, `Revoked` (muted for now)          |
| `tool`           | `UpdateCategories`, `Deprecated`, `Deleted`, `Update`, `ManualUpdate`, `UpdateFailed` |
| `verify`         | `Requested`, `Assigned`, `Approved`, `Rejected`, `Revoked`                            |

## Responses

- `200` posted, muted or duplicate (`result` says which)
- `400` invalid JSON or payload (`issues` lists the problems)
- `401` bad or stale signature
- `500` Discord post failed; safe to retry with the same `id`

## Routing

Channels, pings and muted events are set in `src/config/notifications.ts`. Every category uses `defaultChannelId` until it gets its own `channelId`. A single event can also have its own `channelId`, `mention` or `enabled: false`. A `mention` names an entry in `mentions`, which is a role (`{ type: 'role', id }`) or a user (`{ type: 'user', id }`). An entry without an `id` posts with no ping.

VS Code extension releases come in through the GitHub release webhook and use `categories.vscode.channelId`, falling back to the default channel.
