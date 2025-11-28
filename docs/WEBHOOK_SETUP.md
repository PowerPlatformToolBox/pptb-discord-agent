# GitHub Webhooks Setup Guide

This guide covers setting up GitHub webhooks to integrate with the Discord bot.

## Features

### 1. Project Item Discussion Threads

When an issue or PR is labeled with `DiscordDiscussion`, the bot automatically creates a Discord thread in a designated channel.

**Webhook Event:** `issues` or `pull_request` with `labeled` action

### 2. Release Announcements

When a full release is published on `desktop-app` (non-draft, non-prerelease), the bot posts an announcement.

**Webhook Event:** `release` with `published` action

---

## Configuration

### 1. Update `.env`

Add these new environment variables:

```bash
# Webhook server configuration
WEBHOOK_PORT=3000                                    # Port for webhook server
WEBHOOK_SECRET=your_secure_random_string_here        # GitHub webhook secret (optional but recommended)

# Discord channel IDs
PROJECT_THREAD_CHANNEL_ID=1234567890123456789       # Channel for project discussion threads
RELEASE_CHANNEL_ID=1234567890123456789              # Channel for release announcements

# Label configuration
PROJECT_DISCUSSION_LABEL=DiscordDiscussion          # Label that triggers thread creation
```

### 2. Get Discord Channel IDs

1. Enable Developer Mode in Discord: Settings → Advanced → Developer Mode
2. Right-click the channel → Copy Channel ID
3. Paste into `.env`

### 3. Generate Webhook Secret (Recommended)

```bash
# Generate a secure random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output to `WEBHOOK_SECRET` in `.env`

---

## GitHub Webhook Setup

### Step 1: Expose Webhook Endpoint

**For local development:**

Use a tunnel service like ngrok:

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

**For production:**

Deploy bot to a server with public IP/domain and open port 3000 (or your configured port).

### Step 2: Configure GitHub Webhook

1. Go to your GitHub repository (e.g., `PowerPlatformToolBox/desktop-app`)
2. Settings → Webhooks → Add webhook

**Payload URL:**
```
https://your-domain.com
```
or
```
https://abc123.ngrok.io
```

**Content type:** `application/json`

**Secret:** Paste your `WEBHOOK_SECRET` value

**Which events would you like to trigger this webhook?**

Select "Let me select individual events":
- ☑ Issues
- ☑ Pull requests
- ☑ Releases

**Active:** ☑ Checked

Click "Add webhook"

### Step 3: Test Webhook

**For Project Item Discussion:**

1. Create or open an issue/PR in the repository
2. Add the `DiscordDiscussion` label
3. Check your Discord channel - a thread should appear!

**For Release Announcement:**

1. Create a new release in `desktop-app` repository
2. Make sure it's NOT a draft or pre-release
3. Publish the release
4. Check your Discord release channel - announcement should appear!

---

## Verification

### Check Webhook Deliveries

In GitHub:
1. Repository → Settings → Webhooks
2. Click on your webhook
3. Scroll to "Recent Deliveries"
4. Click on a delivery to see request/response

### Check Bot Logs

```bash
# View logs
tail -f logs/combined.log

# Or if running in dev mode, logs appear in console
pnpm dev
```

You should see:
```
Webhook server started {"port":3000}
Webhook received {"event":"issues","action":"labeled","repo":"desktop-app"}
Created discussion thread {"threadId":"...","itemNumber":123,"itemType":"Issue"}
```

---

## Troubleshooting

### Webhook not receiving events

**Check webhook URL is accessible:**
```bash
curl -X POST https://your-domain.com -H "Content-Type: application/json" -d '{}'
```

Should return `{"error":"Invalid signature"}` or similar (not connection error)

**Check firewall/port forwarding:**
- Ensure port 3000 (or your configured port) is open
- For cloud deployments, check security groups/firewall rules

### Signature verification failing

**Ensure WEBHOOK_SECRET matches:**
- Value in `.env` must exactly match GitHub webhook secret
- No extra spaces or quotes

### Threads not being created

**Check label name:**
- Default is `DiscordDiscussion` (case-sensitive)
- Change via `PROJECT_DISCUSSION_LABEL` in `.env`

**Check channel ID:**
- `PROJECT_THREAD_CHANNEL_ID` must be a valid text channel
- Bot needs permissions: Send Messages, Create Threads, Manage Threads

**Check bot permissions:**
```
☑ View Channels
☑ Send Messages
☑ Send Messages in Threads
☑ Create Public Threads
☑ Manage Threads
☑ Embed Links
```

### Releases not being announced

**Check repository name:**
- Only `desktop-app` releases are announced
- Edit `src/services/webhook/handlers/release.ts` to change

**Check release type:**
- Must be full release (not draft or pre-release)
- Edit handler if you want to include pre-releases

---

## Security Best Practices

1. **Always use WEBHOOK_SECRET** in production
2. **Use HTTPS** for webhook endpoint (required by GitHub)
3. **Validate payload** before processing (done automatically)
4. **Rate limit** webhook endpoint if needed
5. **Monitor logs** for suspicious activity

---

## Advanced Configuration

### Multiple Repositories

To handle webhooks from multiple repos, update handlers:

**Example:** Different channels per repo

```typescript
// In src/services/webhook/handlers/release.ts
const channelMap: Record<string, string> = {
  'desktop-app': config.releaseAnnouncementChannel,
  'other-repo': 'different_channel_id',
};

const channelId = channelMap[payload.repository.name];
```

### Custom Labels

Change the trigger label in `.env`:

```bash
PROJECT_DISCUSSION_LABEL=NeedsDiscussion
```

### Thread Auto-Archive Duration

Edit in `src/services/webhook/handlers/projectItem.ts`:

```typescript
autoArchiveDuration: 10080, // 7 days (1440=1d, 4320=3d, 10080=7d)
```

---

## Deployment Considerations

### Production Deployment

**Option 1: VPS with reverse proxy**

```nginx
# nginx config
server {
    listen 80;
    server_name bot.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

**Option 2: Docker with port mapping**

```bash
docker run -p 3000:3000 -d pptb-discord-assistant
```

**Option 3: Cloud platforms**

- AWS EC2/Lightsail with Elastic IP
- DigitalOcean Droplet
- Azure VM
- Google Cloud Compute Engine

Ensure webhook port is accessible from internet.

---

## Webhook Events Reference

### Issues Event

**Triggered when:**
- Issue is labeled with `DiscordDiscussion`

**Action:** Creates discussion thread

### Pull Request Event

**Triggered when:**
- PR is labeled with `DiscordDiscussion`

**Action:** Creates discussion thread

### Release Event

**Triggered when:**
- Full release is published on `desktop-app`
- Not draft or pre-release

**Action:** Posts announcement

---

## Support

For issues or questions:
1. Check bot logs: `logs/combined.log`
2. Check GitHub webhook deliveries
3. Verify `.env` configuration
4. Check Discord bot permissions