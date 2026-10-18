# Integrating other PPTB services

Fifteen of the eighteen catalogue notifications start in other repositories. This guide lists, for
each repo, where to add the call. It also gives a ready-to-paste prompt for a coding agent (Copilot,
Claude, etc.) working in that repo.

The contract (endpoint, signing, payloads, responses) is in
[NOTIFICATIONS.md](./NOTIFICATIONS.md#sending-events-from-platform-services).

| Repo | Sends | How |
| --- | --- | --- |
| `pptb-web` | All Tool Submission, Tool and Verify events | Signed `POST /api/events` from API routes |
| `tool-management` | Nothing directly | Its `check-updates.yml` calls pptb-web `/api/update-tool`, which sends `tool.update` / `tool.update-failed` |
| `desktop-app`, `vscode-extension` | Releases | GitHub org webhook ([DEPLOYMENT.md](./DEPLOYMENT.md#4-connect-github-webhooks)); no code change |

## pptb-web

### Where each event comes from

| Notification | Route | When |
| --- | --- | --- |
| `tool-submission.new` | `app/api/submit-tool` (POST) | After the intake row is saved, next to the existing `sendEmail` |
| `tool-submission.approved` | `app/api/admin/tool-intakes` (POST) | `action === "approve"` succeeded |
| `tool-submission.rejected` | `app/api/admin/tool-intakes` (POST) | `action === "reject"` succeeded (`needs_changes` sends nothing) |
| `tool-submission.revoked` | **No route yet**, see "Open decision" below | An admin removes a published tool from the marketplace |
| `tool.update-categories` | `app/api/tools/update-categories` | Categories saved |
| `tool.deprecated` | `app/api/tools/update-status` | New status is `deprecated` |
| `tool.deleted` | `app/api/tools/update-status` | New status is `deleted` |
| `tool.manual-update` | `app/api/tools/[id]/trigger-update` | Workflow dispatch succeeded |
| `tool.update` | `app/api/update-tool` | New version validated and published |
| `tool.update-failed` | `app/api/update-tool` | `validationErrors.length > 0` (the `validation_failed` branch) |
| `verify.requested` | `app/api/tools/[id]/request-verification` | Request saved, next to the existing emails |
| `verify.assigned` | `app/api/admin/verification-requests` | `action === "start-review"` succeeded |
| `verify.approved` | `app/api/admin/verification-requests` | `action === "decide"` with `decision === "approve"` saved |
| `verify.rejected` | `app/api/admin/verification-requests` | `action === "decide"` with `decision === "reject"` saved |
| `verify.revoked` | `app/api/revoke-verification` | Events whose variant is `revoked`, not `grace` |

### Open decision: "Tool Submission → Revoked"

The catalogue describes this as "Tool removed from marketplace". pptb-web has no admin action for
that today; tool statuses are only `active`, `deprecated` and `deleted`. Options:

1. Send `tool-submission.revoked` from `update-status` when an **admin** sets `deleted` on someone
   else's tool, and `tool.deleted` when the **owner** deletes their own.
2. Add an explicit admin "revoke/unpublish" action later, and send the event from there.
3. Disable it for now with `DISABLED_NOTIFICATIONS=tool-submission.revoked`.

The prompt below uses option 1; edit it if you choose differently.

### Prompt for pptb-web

```text
Add Discord notifications to pptb-web by calling the PPTB Agent bot's signed event endpoint.

1. Create lib/discord-notify.ts exporting
   `notifyDiscord(type: DiscordEventType, data: Record<string, unknown>): Promise<void>`.
   - Read DISCORD_EVENTS_URL and DISCORD_EVENTS_SECRET from process.env. If either is missing,
     return without doing anything.
   - Body: JSON.stringify({ type, id: crypto.randomUUID(), occurredAt: new Date().toISOString(), data }).
     Serialize once and send exactly those bytes.
   - Headers: Content-Type: application/json; X-PPTB-Timestamp: <unix seconds>;
     X-PPTB-Signature: "sha256=" + hex HMAC-SHA256(secret, `${timestamp}.${body}`) (node:crypto).
   - 5 second timeout (AbortSignal.timeout). Never throw: catch everything and console.error the
     type, status and response text on failure.
   - DiscordEventType is a string union of: tool-submission.new, tool-submission.approved,
     tool-submission.rejected, tool-submission.revoked, tool.update-categories, tool.deprecated,
     tool.deleted, tool.update, tool.manual-update, tool.update-failed, verify.requested,
     verify.assigned, verify.approved, verify.rejected, verify.revoked.
   - Add a helper `toDiscordTool(tool)` that maps a tool row to
     { id, name, packageName?, version?, description? (max 1000 chars), authors?: string[],
       url?: `${NEXT_PUBLIC_SITE_URL}/tools/${id}`, iconUrl? (only if an absolute https URL) }.
     Omit fields that are null/empty rather than sending null.
   - Actors are { name, discordHandle? }; use the user's display name. Never send emails.

2. Call notifyDiscord AFTER the database write succeeds. Do not let it change the HTTP response.
   On Vercel, wrap it in `after(() => notifyDiscord(...))` from next/server so it runs after the
   response; otherwise `await` it inside the existing try block.
   - app/api/submit-tool POST: "tool-submission.new"
     { tool, submittedBy, reviewUrl: `${site}/admin/tool-intakes` }
   - app/api/admin/tool-intakes POST: approve → "tool-submission.approved" { tool, approvedBy };
     reject → "tool-submission.rejected" { tool, reason?, rejectedBy }. Nothing for needs_changes.
   - app/api/tools/update-categories: "tool.update-categories"
     { tool, categories: string[] (new, non-empty), previousCategories?, updatedBy }
   - app/api/tools/update-status: deprecated → "tool.deprecated" { tool, reason? };
     deleted by the tool owner → "tool.deleted" { tool, reason? };
     deleted by an admin who is not the owner → "tool-submission.revoked" { tool, reason?, revokedBy }.
   - app/api/tools/[id]/trigger-update: "tool.manual-update"
     { tool, requestedBy, targetVersion?, workflowUrl? }
   - app/api/update-tool: on success → "tool.update"
     { tool: { ...tool, version: <new version, required> }, previousVersion?, releaseNotesUrl? };
     in the validation_failed branch → "tool.update-failed"
     { tool, attemptedVersion?, errors: validationErrors (strings, max 20, each max 500 chars) }.
   - app/api/tools/[id]/request-verification: "verify.requested"
     { tool, requestedBy, reviewUrl: `${site}/admin/verification-requests` }
   - app/api/admin/verification-requests: start-review → "verify.assigned"
     { tool, assignee: <admin>, reviewUrl }; decide approve → "verify.approved" { tool, reviewer };
     decide reject → "verify.rejected" { tool, reason?, reviewer }.
   - app/api/revoke-verification: only for MATURITY_EVENTS with variant "revoked" →
     "verify.revoked" { tool, reason: <event reason>, revokedBy? }.

3. Add DISCORD_EVENTS_URL and DISCORD_EVENTS_SECRET to .env.example with comments, and to the
   deployment docs. Add unit tests for lib/discord-notify.ts: signature format, no-op when not
   configured, swallows network errors. Do not change existing email behaviour.
```

## tool-management

No new step is needed if pptb-web sends `tool.update` and `tool.update-failed` from
`/api/update-tool`, as above. That route already receives every update from `check-updates.yml`.

Add a direct call only to report failures **before** pptb-web is reached, for example when npm can't
be queried or the `UPDATE_TOOL_API_URL` request fails.

### Prompt for tool-management (optional)

```text
In .github/workflows/check-updates.yml, after the "Invoke NextJS Update Tool API" call for each
package, if the curl to UPDATE_TOOL_API_URL fails (non-2xx or network error), notify Discord:

- Secrets: DISCORD_EVENTS_URL, DISCORD_EVENTS_SECRET. Skip silently if either is empty.
- Body (jq -c): {"type":"tool.update-failed","data":{"tool":{"id":<tool id or package name>,
  "name":<package name>,"packageName":<package name>},"attemptedVersion":<version>,
  "errors":[<short error text, max 500 chars>],
  "workflowUrl":"${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"}}
- Sign: TS=$(date +%s); SIG=$(printf '%s' "$TS.$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')
- curl -fsS -X POST "$DISCORD_EVENTS_URL" -H 'Content-Type: application/json'
  -H "X-PPTB-Timestamp: $TS" -H "X-PPTB-Signature: sha256=$SIG" --data-raw "$BODY"
- A Discord failure must never fail the workflow: append `|| echo "::warning::Discord notify failed"`.
```

## Rollout checklist

1. Deploy PPTB Agent and set `PLATFORM_EVENTS_SECRET` ([DEPLOYMENT.md](./DEPLOYMENT.md)).
2. In pptb-web on Vercel, set `DISCORD_EVENTS_URL=https://YOUR-DOMAIN/api/events` and
   `DISCORD_EVENTS_SECRET=<same value>`. Do the same in tool-management repo secrets if you use the
   optional step.
3. Ship the pptb-web change. Exercise one flow end to end, e.g. request verification on a test tool,
   and check the admin channel.
4. Watch **Vercel → PPTB Agent → Logs** for `Platform event processed` entries, and for any 4xx
   responses, which mean the payload needs fixing in pptb-web.
