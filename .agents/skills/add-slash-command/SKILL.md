---
name: add-slash-command
description: Add or change a PPTB Agent Discord slash command served over the HTTP Interactions Endpoint. Use when asked to add a command, change a command's options or replies, or fix a command that times out or shows "Unknown command".
---

# Add or change a slash command

Commands arrive at `POST /api/interactions`. There is no gateway and no discord.js, so a command is
a plain object that returns a result, and `src/app/interactions.ts` turns that into the response.

## Write the command

Create `src/commands/<name>.ts` exporting a `SlashCommand` with `definition` and `execute`.
`src/commands/ping.ts` is the smallest example and `src/commands/createIssue.ts` shows options and
deferred work. Command names are lowercase with hyphens.

`execute` is synchronous and must return one of:

| Result | Use for | Behavior |
| --- | --- | --- |
| `{ type: 'reply', data }` | Anything that needs no I/O | Sent as the interaction response |
| `{ type: 'defer', work }` | GitHub, Discord or other network calls | Discord shows "thinking…", then `work()` returns the body that edits the reply |

Discord allows 3 seconds to respond, so do all I/O inside `work`. `interactions.ts` keeps the
function alive with `waitUntil` and replaces the reply with a generic error if `work` throws.

Other rules:

- Read options with the helpers in `src/commands/options.ts` (`getStringOption`,
  `getInvokingUser`). Add a helper there for a new option type.
- Set `flags: MessageFlags.Ephemeral` when only the invoking user should see the reply.
- Set `allowed_mentions: { parse: [] }` when a reply includes user input or fixed text with
  mentions. The dispatcher's protection covers notifications only, not command replies.

## Register it

Add the command to `COMMANDS` in `src/commands/index.ts`. `/help` builds its list from that array.

## Test and document

- Add a case to `describe('POST /api/interactions')` in `tests/handlers.test.ts`, which signs
  requests with its own Ed25519 key.
- Update the command tables and lists in `docs/DISCORD_SETUP.md` and `README.md`.

## Release it

1. Merge so the handler is deployed first. Otherwise Discord can offer a command the bot answers
   with "Unknown command."
2. If `definition` changed (name, description or options), run `pnpm deploy-commands` once with
   production values in `.env`. It replaces the guild's full command list and applies right away.
   A change to the reply alone needs no registration.

Follow the `test-and-deploy` skill for the checks.
