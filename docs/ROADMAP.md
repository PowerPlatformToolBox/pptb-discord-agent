# Improvement roadmap

Last reviewed: **2026-10-18**

This is the working backlog for PPTB Agent. Work from the top down within each phase; the order
balances community value, reliability, effort, and maintenance. IDs stay stable when items move.
There are no target dates until an item is picked up.

## Constraints and decisions

- **Stay on Vercel Hobby.** No plan upgrade, additional hosting, always-on worker, or new managed
  service is part of this roadmap.
- Keep the HTTP-only architecture. No Discord Gateway connection, background heartbeat process,
  artificial keep-alive requests, or polling to simulate presence.
- **Appearing offline is expected, not a defect.** Slash commands and notifications still work.
  An always-online indicator is out of scope under these constraints.
- Reuse Discord, GitHub, and existing PPTB APIs. Do not add a database, queue, cache service,
  monitoring service, or paid AI dependency.
- Keep scheduled work at most daily per job and within Hobby limits. Recheck the current limits
  before adding a job; do not rely on exact execution times or frequent retries.
- Prefer user-triggered features, bounded API calls, link buttons, and configuration over
  scheduled automation and stored state.

## Status tracking

| Status      | Meaning                                                                       |
| ----------- | ----------------------------------------------------------------------------- |
| Pending     | Agreed backlog item; implementation has not started                           |
| In progress | Actively being implemented; record an owner and issue or PR                   |
| Blocked     | Cannot continue; record the specific prerequisite or decision                 |
| Done        | Implemented, checked, and documented; record the evidence                     |
| Deferred    | Intentionally not scheduled; reconsider only when its stated condition is met |

The baseline below records functionality present in the repository, **not confirmation of a live
deployment or Discord configuration**. Proposed improvements started as Pending or Deferred;
the tables and progress log track subsequent work. Prepared copy alone does not complete a
manual Discord configuration task.

## Already implemented

| ID  | Capability                                                                                          | Status      | Evidence / scope                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B01 | Stateless Vercel endpoints with inbound authentication                                              | Done        | [Handlers](../src/app/) and [signature helpers](../src/security/signatures.ts); public health endpoint intentionally has no authentication                                           |
| B02 | `/ping` and `/create-issue`                                                                         | Done        | [Command registry](../src/commands/index.ts); issue creation runs as deferred work                                                                                                   |
| B03 | Central notification catalogue, validation, switches, and channel routing                           | Done        | [Notification guide](NOTIFICATIONS.md) and [dispatcher](../src/notifications/dispatcher.ts)                                                                                          |
| B04 | Tool, submission, verification, and product release notifications                                   | In progress | [Event definitions](../src/notifications/events/); live delivery depends on producer configuration                                                                                   |
| B05 | GitHub issue/PR discussion threads and stars updates                                                | Done        | [GitHub notifications](../src/notifications/events/github.ts); existing thread-name lookup and unchanged-channel checks avoid some duplicates, not all                               |
| B06 | Daily stars reconciliation                                                                          | Done        | [Cron handler](../src/app/starsCron.ts) and [schedule](../vercel.json)                                                                                                               |
| B07 | Configuration health check, structured logs, message clamping, and notification mention suppression | Done        | [Health handler](../src/app/health.ts), [logger](../src/utils/logger.ts), [format helpers](../src/discord/format.ts), and dispatcher; not an end-to-end delivery or uptime guarantee |
| B08 | Automated tests and CI quality checks                                                               | Done        | [Tests](../tests/) and [CI workflow](../.github/workflows/ci.yml); this roadmap does not claim a fresh test run                                                                      |

## Phase 1: quick wins and foundations

These are the recommended first five improvements.

| Order / ID | Improvement                                       | Status  | Completion criteria                                                                                                                                                                                                                                                                                                                                               |
| ---------- | ------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 / R01 | Profile, branding, and offline-status explanation | Done | Completed 2026-10-18, confirmed by Danish. Bot avatar, profile description, role colour, and pinned introduction completed in Discord; see the [branding guide](DISCORD_SETUP.md#branding-and-introduction) and [R01 checklist](#r01-branding-checklist). |
| 2 / R02 | `/help` and `/about` | Done | Implemented and verified 2026-10-18. Registry-driven help, official links, HTTP-only explanation, immediate ephemeral replies, and mention suppression; [signed interaction tests](../tests/handlers.test.ts) pass. See [activation tracking](#r02-implementation-and-activation) for pending deployment and registration. |
| 3 / R03    | Bounded requests and clearer failure diagnostics  | Pending | Add explicit outbound request deadlines within the function budget; carry delivery/event/interaction identifiers into relevant success and failure logs; log failures to edit deferred replies rather than silently dropping them. Test timeouts and upstream failures without logging secrets or interaction tokens. Preserve non-2xx webhook delivery failures. |
| 4 / R04    | Release link buttons                              | Pending | Stable, insider, and VS Code releases include valid links to release notes and available downloads or the marketplace. Omit unavailable actions; preserve text links, message limits, and mention suppression. Test that components survive formatting and reach the Discord REST payload.                                                                        |
| 5 / R05    | `/latest` release lookup                          | Pending | Select desktop stable, desktop insider, or VS Code releases; return the version, release date, summary, and official link. Report missing releases and API failures clearly; acknowledge before doing network work.                                                                                                                                               |

Why this order: make the bot recognizable and discoverable first, improve the shared failure path
before adding more API-dependent commands, then make existing release information easier to use.

### R01 branding checklist

Scope confirmed on 2026-10-18: profile description, role colour, and pinned introduction in a
funny, technical tone. Keep the current name and logo. No banner or runtime changes in this pass.

| Sub-item | Status | Evidence / next action |
| --- | --- | --- |
| R01.1 Bot avatar | Done | Danish confirmed on 2026-10-18 that setting the bot avatar fixed the missing icon in Discord. |
| R01.2 Profile description | Done | Completion confirmed by Danish on 2026-10-18; [setup guide](DISCORD_SETUP.md#profile-description). |
| R01.3 Role colour | Done | Completion confirmed by Danish on 2026-10-18; [setup steps](DISCORD_SETUP.md#role-colour). |
| R01.4 Pinned introduction | Done | Completion confirmed by Danish on 2026-10-18; [introduction guide](DISCORD_SETUP.md#pinned-introduction). |

R01 is complete based on Danish's confirmation on 2026-10-18. These are manual Discord
configuration changes; no deployment or runtime changes were required. Always-online presence
and member-list activity text remain out of scope.

### R02 implementation and activation

| Sub-item | Status | Evidence / next action |
| --- | --- | --- |
| R02.1 Commands and documentation | Done | [Help](../src/commands/help.ts) reads the command registry at execution time; [about](../src/commands/about.ts) explains the bot and offline badge. Both respond privately without external API calls. Official links are shared in [constants](../src/config/constants.ts); [setup instructions](DISCORD_SETUP.md#available-slash-commands) cover activation. |
| R02.2 Automated verification | Done | On 2026-10-18, lint, format check, type check, and all 122 tests across 11 suites passed. Six new signed-interaction cases verify private replies, mention suppression, message limits, current registry descriptions, architecture copy, and rejection of tampered requests. Existing `/ping` and deferred `/create-issue` tests still pass. |
| R02.3 Vercel production deployment | Pending | Deploy the updated code through the existing Vercel workflow. No new service, environment variable, or plan upgrade is needed. |
| R02.4 Guild command registration and live check | Pending | After deployment, run `pnpm deploy-commands` with matching application/guild configuration. In Discord, run `/help` and `/about`; verify the four-command list, private replies, links, and offline explanation. Update any pinned command list. |

R02 is Done for repository implementation and automated verification. Production activation has
not been performed or confirmed in this session; the separate pending rows above track it.

## Phase 2: self-service and support

Start after Phase 1, or pick an independent item when its scope is ready.

| Order / ID | Improvement                                   | Status  | Completion criteria / prerequisites                                                                                                                                                                                                                                                                                                             |
| ---------- | --------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6 / R06    | `/docs <topic>` and curated FAQ answers       | Pending | Return maintained official links and concise answers for installation, updates, tools, and troubleshooting. Unknown topics provide useful choices. Use curated content, not an AI service.                                                                                                                                                      |
| 7 / R07    | Improve `/create-issue` input and error UX    | Pending | Offer a structured modal for useful reproduction details; validate supported repositories and input; make failures actionable without exposing upstream internals. Handle modal submissions over HTTP and test signed requests, valid submissions, invalid submissions, and deferred work.                                                      |
| 8 / R08    | `/tool <name>` catalogue lookup               | Pending | First confirm an existing, supported read API and response contract. Return tool name, author, version, description, and official link; handle no match, ambiguous results, timeouts, and unavailable data. If no suitable source exists, mark Blocked instead of introducing another backend.                                                  |
| 9 / R09    | Tool-name autocomplete                        | Pending | Depends on R08's confirmed catalogue source. Add autocomplete interaction routing and bounded results within Discord's response deadline; autocomplete cannot use the ordinary deferred-command flow. Cover signed requests and source failures; no full catalogue scan per keystroke.                                                          |
| 10 / R10   | Message context action: create a GitHub issue | Pending | Reuse R07's issue form and validation. Read only the message supplied with the interaction, preview what will be copied, require explicit confirmation, and include its Discord link. Do not copy private-channel content into a public issue without an explicit warning and permission checks. No message-history listener or Gateway access. |

## Phase 3: useful extras and delivery design

| Order / ID | Improvement                                            | Status  | Completion criteria                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11 / R11   | `/stats` using existing sources                        | Pending | Show repository stars and any tool/download counts actually exposed by supported APIs. Label source and freshness; say when a metric is unavailable rather than inventing totals. No new analytics store or scheduled collection.                                                                                                                                                   |
| 12 / R12   | Assess duplicate-delivery and partial-failure handling | Pending | Document current duplicate scenarios, including retries and a thread being created before its first message fails. Evaluate bounded Discord-side checks or an existing producer's durable event record without adding a service. Deliver a tested improvement only where feasible, or explicitly record the remaining limitation. This item does not promise exactly-once delivery. |

### Important implementation notes

- **R03:** existing logs, the public configuration health check, and short Discord rate-limit
  retries are already present. Extend them rather than replacing them with a new monitoring
  system. Never expose configuration or delivery details through public health responses.
- **R04:** the current message payload and clamping helper support only content and embeds.
  Update the shared types and formatter as well as the release renderer; adding buttons only
  in the renderer would not deliver them.
- **R05:** stable and insider lookups need distinct release selection. Do not assume GitHub's
  latest stable release endpoint returns pre-releases.
- **R07/R09/R10:** the current interaction handler supports only chat-input commands. Add the
  required modal, autocomplete, and message-command handling deliberately; keep signature
  verification on the raw request body and register changed command definitions.
- **R12:** platform event IDs and GitHub delivery IDs are currently useful for correlation,
  not durable deduplication. Function memory cannot coordinate concurrent requests or survive
  cold starts. Do not mark a delivery complete before it succeeds, hide failed deliveries
  behind successful responses, or claim that an HTTP acknowledgement guarantees exactly-once
  effects.

## Deferred / optional

These are not prerequisites for the main roadmap and should not create maintenance obligations.

| ID  | Idea                                                                      | Status   | Condition for reconsidering                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D01 | Automated weekly digest                                                   | Deferred | A useful aggregate can be read from existing sources without storing incoming events, and R12 establishes an acceptable duplicate/missed-run policy. Use an eligible weekly job or a weekly gate in daily work, never frequent polling. Budget runtime and failure isolation so stars reconciliation is preserved. An on-demand digest is a simpler alternative. |
| D02 | Forum posts for community tool announcements                              | Deferred | The community wants a forum workflow and has agreed on channel, tags, visibility, and bot permissions. Add explicit forum-post support; do not silently redirect existing text-thread delivery into a forum channel. Keep private review/rejection details private.                                                                                              |
| D03 | Durable delivery history, queued retries, and comprehensive deduplication | Deferred | A suitable durable mechanism is already available in the existing stack and can be reused without new hosting, a new managed service, or significant maintenance. Otherwise keep the limitation documented; an in-memory set is not a replacement.                                                                                                               |

An always-online presence process, a Vercel plan upgrade, new hosting, and a paid monitoring or AI
service are **out of scope**, not pending tasks.

## Keeping this roadmap current

1. Pick an ID, change its status to In progress, and add an owner and issue/PR link in its row.
2. Record actual blockers and dependencies. Do not mark an item Done just because a related
   helper exists or a document was written.
3. For code changes, add focused tests and run the repository's lint, format, type, and test
   checks. Update the relevant guides and deploy command definitions when they change.
4. Mark Done with a completion date and implementation/test evidence. Record deployment and
   Discord smoke-test confirmation separately; code completion is not proof of live operation.
5. For configuration-only tasks such as R01, record a manual Discord check instead of code tests.
6. Update the review date and progress log. Split partial work into explicit sub-items rather
   than hiding unfinished acceptance criteria behind a Done status.

### Progress log

| Date       | Item     | Update                                                                                                                                          |
| ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-18 | Baseline | Reviewed repository capabilities and created the ordered backlog. No roadmap feature implementation or live configuration validation performed. |
| 2026-10-18 | R01 | Danish confirmed the bot avatar fix. Prepared funny/technical profile and pinned-message copy, role-colour instructions, and a verification checklist. Description, colour, and message publication still await manual confirmation; no banner or application-code changes. |
| 2026-10-18 | R01 completed | Danish confirmed R01 is done. Marked the parent item and all branding sub-items Done. R02 (`/help` and `/about`) remains the next pending improvement. |
| 2026-10-18 | R02 implemented | Added registry-driven `/help` and technical-humour `/about`, official links, ephemeral replies, and mention suppression. Lint, formatting, type checking, and all 122 tests passed. Updated README and Discord setup; production deployment, command registration, and live checks remain pending. R03 is the next pending implementation. |
