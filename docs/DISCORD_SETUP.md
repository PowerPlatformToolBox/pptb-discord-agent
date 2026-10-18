# Discord setup

This guide sets up the **PPTB Agent** application in Discord, invites it to the Power Platform ToolBox
server, creates the channels it posts to and connects slash commands. Allow about 20 minutes.

Do the steps in order. Step 6 needs the Vercel deployment from [DEPLOYMENT.md](./DEPLOYMENT.md), so
you will switch between the two guides once.

Keep a scratch note open. You will collect values for these environment variables as you go:

| Value | Variable |
| --- | --- |
| Application ID | `DISCORD_CLIENT_ID` |
| Public Key | `DISCORD_PUBLIC_KEY` |
| Bot token | `DISCORD_BOT_TOKEN` |
| Server ID | `DISCORD_GUILD_ID` |
| Six channel IDs | `DISCORD_CHANNEL_*` |

## How the bot works (read once)

PPTB Agent runs on Vercel as a set of small web endpoints. It does **not** keep a live connection to
Discord, so:

- In the member list it always shows as **offline**. This is expected; it still works.
- Notifications are sent through Discord's HTTP API when an event arrives.
- Slash commands (`/ping`, `/create-issue`) reach the bot through Discord's **Interactions Endpoint
  URL** (step 6).

## 1. Turn on Developer Mode

You need it to copy IDs.

1. Discord → **User Settings** (gear icon) → **Advanced**.
2. Turn on **Developer Mode**.

## 2. Create the application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and click
   **New Application**.
2. Name it **PPTB Agent**, accept the terms and click **Create**.
3. On **General Information**:
   - Upload an app icon (the PPTB logo works well) and add a short description, for example
     "Notifications and helpers for Power Platform ToolBox".
   - Copy **Application ID** → `DISCORD_CLIENT_ID`.
   - Copy **Public Key** → `DISCORD_PUBLIC_KEY`.
   - Leave **Interactions Endpoint URL** empty for now (step 6).

## 3. Create the bot user and token

1. Open the **Bot** page.
2. Click **Reset Token**, confirm, and copy the token → `DISCORD_BOT_TOKEN`.
   - Treat it like a password. Anyone with it can act as the bot.
   - If it leaks, click **Reset Token** again and update the value in Vercel.
3. Under **Privileged Gateway Intents**, leave all three **off**. The bot doesn't need them.
4. Optional: turn **Public Bot** off, so only you can add it to servers.

## 4. Invite the bot to the server

1. Open **Installation** (left menu). Under **Installation Contexts**, keep **Guild Install** only.
2. Set **Install Link** to **None** (you'll use the link below instead), then save.
3. Open this URL in your browser, replacing `YOUR_CLIENT_ID` with your Application ID:

   ```text
   https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot%20applications.commands&permissions=309237730320
   ```

4. Pick the Power Platform ToolBox server and click **Authorize**.

The permissions in that link (`309237730320`) are exactly what the bot uses:

| Permission | Why |
| --- | --- |
| View Channels | See the channels it posts to |
| Send Messages | Post notifications |
| Embed Links | Rich notification cards |
| Read Message History | Find existing discussion threads, to avoid duplicates |
| Create Public Threads | GitHub discussion threads |
| Send Messages in Threads | First message in each discussion thread |
| Manage Channels | Rename the stars voice channel. You'll limit this to that channel in step 5 |

Copy the server ID: right-click the server icon → **Copy Server ID** → `DISCORD_GUILD_ID`.

## 5. Create the channels

The bot routes each notification to one of six **channel aliases**. Create (or reuse) a channel for
each, then right-click it → **Copy Channel ID** and save it in the matching variable.

| Alias | Variable | Suggested channel | Who should see it | Default notifications |
| --- | --- | --- | --- | --- |
| `admin` | `DISCORD_CHANNEL_ADMIN` | `#pptb-admin` (private) | Admins/moderators only | New submissions, rejections, category changes, manual updates, update failures, verification queue |
| `tools` | `DISCORD_CHANNEL_TOOLS` | `#tool-updates` | Everyone | Approved tools, removals, deprecations, updates, newly verified tools |
| `releases` | `DISCORD_CHANNEL_RELEASES` | `#announcements` | Everyone | Stable PPTB and VS Code extension releases |
| `insider` | `DISCORD_CHANNEL_INSIDER` | `#insider-builds` | Everyone (or insiders) | PPTB pre-release builds |
| `discussions` | `DISCORD_CHANNEL_DISCUSSIONS` | `#github-discussions` | Everyone | One thread per labeled GitHub issue/PR |
| `stars` | `DISCORD_CHANNEL_STARS` | A **voice** channel | Everyone | Renamed to `⭐ <stars>` |

You can point several aliases at the same channel ID, for example `releases` and `insider`. To move
one notification to a different channel later, use `NOTIFICATION_ROUTES` (no code change). See
[NOTIFICATIONS.md](./NOTIFICATIONS.md#route-a-notification-to-another-channel).

### Channel permissions

For each channel: **Edit Channel** → **Permissions** → **Add members or roles** → **PPTB Agent**, then allow:

- All text channels: **View Channel**, **Send Messages**, **Embed Links**.
- `discussions` channel, additionally: **Create Public Threads**, **Send Messages in Threads**,
  **Read Message History**.
- `admin` channel: it's private, so the bot must be added explicitly, or it gets
  `403 Missing Access`.
- `stars` voice channel: **View Channel** and **Manage Channel**. Then, under **Server Settings →
  Roles → PPTB Agent**, turn off **Manage Channels**, so the bot can only rename this one channel.

## 6. Connect slash commands (after deploying)

First finish [DEPLOYMENT.md](./DEPLOYMENT.md) through **Verify the deployment**, so the bot is
live on Vercel with all environment variables set. Then:

1. Developer Portal → your app → **General Information**.
2. Set **Interactions Endpoint URL** to:

   ```text
   https://YOUR-PROJECT.vercel.app/api/interactions
   ```

3. Click **Save Changes**. Discord immediately sends a signed test request.
   - If saving fails with *"The specified interactions endpoint url could not be verified"*:
     - Check that `DISCORD_PUBLIC_KEY` in Vercel matches the portal exactly.
     - Check that you redeployed after setting it.
     - Check that the URL is the **production** domain. Preview URLs are behind Vercel login.

4. Register the commands, from your computer in the repo folder:

   ```bash
   pnpm install
   vercel env pull .env      # or fill .env by hand from .env.example
   pnpm deploy-commands
   ```

   This registers `/ping` and `/create-issue` in your server; they appear right away. Run it again
   only when a command's name, description or options change.

5. Test: type `/ping` in any channel the bot can see. You should get `🏓 Pong!`.

## 7. Test the notifications

With `.env` filled in (step 6.4):

```bash
# Every platform notification (sends 15 sample messages)
pnpm send-test-event all https://YOUR-PROJECT.vercel.app

# A single one
pnpm send-test-event verify.approved https://YOUR-PROJECT.vercel.app
```

Each line prints the HTTP status. `200 {"status":"sent",...}` means the message was posted.
`{"status":"disabled"}` means it's switched off. For anything else, see
[TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

Release, discussion-thread and stars notifications come from GitHub. Test those with **Redeliver**
on the GitHub webhook page ([DEPLOYMENT.md](./DEPLOYMENT.md#4-connect-github-webhooks)).

## Renaming the bot later

The name in Discord comes from the Developer Portal (**General Information → Name** and **Bot →
Username**). `BOT_NAME` in `src/config/constants.ts` only affects the `/api/health` response. Update both to
keep them consistent.
