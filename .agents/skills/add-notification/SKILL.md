---
name: add-notification
description: Add or change a PPTB Agent Discord notification card (message embed, discussion thread or channel rename) and route GitHub or platform events to it. Use when asked to add, restyle, move or reroute a notification, announcement, card or embed, or to announce releases from another repository.
---

# Add or change a notification

Every Discord post comes from one entry in the notification catalogue. Handlers never post
directly: they call `dispatch(key, data)`, which validates, renders, clamps and delivers.

## Find or define the card

Definitions live in `src/notifications/events/<category>.ts`:

| File | Keys |
| --- | --- |
| `releases.ts` | `pptb.new-release`, `pptb.insider`, `vscode.new-release` |
| `github.ts` | `github.discussion-thread`, `github.stars` |
| `toolSubmission.ts` | `tool-submission.*` |
| `tool.ts` | `tool.*` |
| `verify.ts` | `verify.*` |

For a new card, add a `defineNotification({...})` with every field:

- `key`: `category.event-name` in lowercase kebab case. The catalogue test enforces the format.
- `category`, `event`, `description`: `NotificationCategory` is a union in `types.ts`; extend it for
  a new category.
- `enabled`: code-level switch. Runtime muting uses `DISABLED_NOTIFICATIONS`.
- `channel`: a default alias from `channels.ts`. Internal events (reviews, rejections, failures) go
  to `admin`; community-facing ones go to `tools`, `releases` or `insider`.
- `source`: `platform` for `/api/events`, `github` for webhooks or cron. Only `platform` keys are
  accepted from `/api/events`.
- `schema`: zod 4 schema for the payload. It must reject `{}`, so include a required field.
- `example`: a valid payload, used by tests and `pnpm send-test-event`.
- `delivery`: one of the three kinds below.

Then add it to the file's exported list. A new file also goes into `NOTIFICATIONS` in
`src/notifications/catalog.ts`.

## Pick a delivery

| Kind | `render` returns | Example |
| --- | --- | --- |
| `message` | `{ content?, embeds? }` | `verify.approved` (embed), `pptb.new-release` (markdown) |
| `thread` | `{ threadName, dedupeKey, message }` | `github.discussion-thread` |
| `channel-name` | The new channel name | `github.stars` |

Start `threadName` with `dedupeKey`: the dispatcher finds existing threads with
`name.startsWith(dedupeKey)`.

## Build the card

Reuse `src/notifications/shared.ts` for tool cards:

- `toolEmbed`: standard tool embed. Pass extra rows through `fields`.
- `field`: returns `null` for empty values, and `toolEmbed` drops them. Raw embeds must filter
  nulls themselves.
- `link`, `bulletList`, `formatActor`: text helpers.
- `toolSchema`, `actorSchema`, `reasonSchema`, `httpUrl`, `EXAMPLE_TOOL`, `EXAMPLE_ACTOR`: payload
  building blocks.

Colors come from `COLORS` in `src/config/constants.ts`.

Keep these rules in mind:

- `clampMessage` truncates anything over Discord's limits at send time. If a list can overflow,
  budget for it the way `renderRelease` does (`…and N more`) so links and footers survive.
- The dispatcher always sends `allowed_mentions: { parse: [] }`, so `@everyone`, role and user
  mentions in card text never ping. Allowing pings is a deliberate dispatcher change, not a card
  change, and must never apply to text from an untrusted payload.
- Rejection reasons stay in `admin` by default.

## Connect the source

**Platform event:** no routing code. `/api/events` looks the key up in the catalogue. Sending it is
pptb-web's job, so document the contract in `docs/INTEGRATIONS.md` for that repository.

**GitHub event:** add the mapping in `src/sources/github/router.ts`, which is pure and has no I/O.

- New repository for release announcements: add it to `RELEASE_REPOSITORIES` with `stable` and
  `prerelease` keys. Repositories not listed are never announced.
- New webhook event type: add a `case` to `routeGitHubEvent`, add payload fields to
  `src/sources/github/types.ts`, and note that the org webhook must subscribe to it.

**New channel alias:** add it to `CHANNEL_ALIASES` in `channels.ts`, then add the
`DISCORD_CHANNEL_<ALIAS>` variable everywhere `AGENTS.md` lists for environment changes.

## Update tests and docs

- `tests/catalog.test.ts`: renders every `example` automatically. Add new catalogue rows to
  `REQUIRED_EVENTS`.
- `tests/githubRouter.test.ts`: cover every new GitHub mapping, including what is ignored.
- Custom rendering logic: unit test it, as `tests/releases.test.ts` does.
- `docs/NOTIFICATIONS.md`: update the catalogue table, and the payload table for platform events.
- `docs/INTEGRATIONS.md`: for platform events, say where the producer sends it.
- `docs/DEPLOYMENT.md`: for GitHub events, update the event table.

Then follow the `test-and-deploy` skill. Card changes reach Discord on the next deployment; they do
not need `pnpm deploy-commands`.
