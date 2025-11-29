# Railway Deployment Guide

## Overview

Railway provides $5 free credits monthly - perfect for low-usage Discord bots!

## Prerequisites

- GitHub account with `pptb-discord-assistant` repository
- Railway account (sign up with GitHub)
- All Discord/GitHub tokens ready

---

## Step 1: Sign Up & Connect GitHub

1. Go to **railway.app**
2. Click **"Login with GitHub"**
3. Authorize Railway to access repositories

---

## Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose repository: `MattBerg11/pptb-discord-assistant`
4. Click **"Deploy Now"**

Railway will automatically:
- Detect `nixpacks.toml` configuration
- Install Node.js 18 and pnpm
- Build the project

---

## Step 3: Configure Environment Variables

1. Click on your service ("pptb-discord-assistant")
2. Go to **"Variables"** tab
3. Click **"New Variable"** for each:

### Required Variables

```bash
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_server_id
GITHUB_TOKEN=your_github_token
GITHUB_ORG=PowerPlatformToolBox
LOG_CHANNEL_ID=your_log_channel_id
REACTION_EMOJI=⭐
WEBHOOK_PORT=3000
WEBHOOK_SECRET=your_generated_secret
PROJECT_THREAD_CHANNEL_ID=your_thread_channel_id
RELEASE_CHANNEL_ID=your_release_channel_id
PROJECT_DISCUSSION_LABEL=DiscordDiscussion
NODE_ENV=production
LOG_LEVEL=info
```

### Generate WEBHOOK_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Get Discord Channel IDs

1. Enable Developer Mode in Discord: Settings → Advanced → Developer Mode
2. Right-click channel → Copy Channel ID
3. Paste into Railway variables

---

## Step 4: Deploy

1. Railway should automatically start building
2. Wait ~2-3 minutes for first build
3. Check **"Deployments"** tab for progress

**Build logs should show:**
```
✓ Installing pnpm
✓ pnpm install --frozen-lockfile
✓ pnpm build
✓ Build complete
```

---

## Step 5: Get Your Public URL

1. Go to **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. You'll get: `https://pptb-discord-assistant-production.up.railway.app`
4. **Copy this URL**

---

## Step 6: Configure GitHub Webhook

1. Go to: `github.com/PowerPlatformToolBox/desktop-app/settings/hooks`
2. Click **"Add webhook"**

**Configure:**
- **Payload URL:** `https://your-railway-app.up.railway.app`
- **Content type:** `application/json`
- **Secret:** Your `WEBHOOK_SECRET` from environment variables
- **Events:** ✅ Issues, Pull requests, Releases
- **Active:** ✅ Checked

3. Click **"Add webhook"**

---

## Step 7: Test Everything

### Test Discord Bot

```
Type /ping in your Discord server
Bot should respond with latency
```

### Test Discussion Thread

1. Create issue in `desktop-app` repository
2. Add label: `DiscordDiscussion`
3. Check Discord - thread should appear!

### Test Release Announcement

1. Publish a release in `desktop-app`
2. Make sure it's NOT draft or pre-release
3. Check Discord - announcement should appear!

### Check Logs

In Railway:
1. Go to **"Deployments"**
2. Click latest deployment
3. Click **"View Logs"**

You should see:
```
Bot logged in {"username":"...","id":"...","guilds":1}
Webhook server started {"port":3000}
Bot is ready and online
```

---

## Auto-Deploy Configuration

**Already active!** Every push to `main` will:

1. Trigger automatic build on Railway
2. Run `pnpm install --frozen-lockfile`
3. Run `pnpm build`
4. Deploy new version
5. Zero downtime deployment

**To deploy:**
```bash
git add .
git commit -m "feat: add feature"
git push origin main
```

Railway automatically deploys in ~2-3 minutes.

---

## Monitoring & Maintenance

### View Logs

1. Dashboard → **"Deployments"**
2. Click deployment → **"View Logs"**
3. Real-time log streaming

### View Metrics

1. Click **"Metrics"** tab
2. See CPU, Memory, Network usage

### Restart Service

1. Click **"..."** menu
2. Select **"Restart"**

Or force redeploy:
1. Settings → **"Redeploy"**

### Update Environment Variables

1. Go to **"Variables"** tab
2. Edit or add variables
3. Service automatically redeploys

---

## Cost & Free Tier

**Railway Free Tier:**
- $5 in credits per month
- 500 execution hours
- 1GB RAM
- 1GB disk

**Your Bot Usage:**
- Running 24/7 = 720 hours/month
- Typical usage: ~$0.15-0.30/month
- **Well within free tier!** ✅

**Cost breakdown:**
- Execution: ~$0.0002/hour
- Memory: Included
- Network: Included (within limits)

---

## Troubleshooting

### Build Failing

**Check deployment logs:**
1. Deployments → Click failed build
2. Read error messages

**Common issues:**
- Missing environment variables
- TypeScript compilation errors
- pnpm install failures

**Solutions:**
- Verify all environment variables are set
- Check if `nixpacks.toml` is present
- Ensure `pnpm-lock.yaml` is committed

### Bot Not Responding in Discord

**Check runtime logs:**
```
Should see: "Bot logged in"
```

**Verify:**
- `DISCORD_BOT_TOKEN` is correct
- `DISCORD_CLIENT_ID` is correct
- Bot has proper Discord permissions

### Webhooks Not Working

**Check GitHub webhook deliveries:**
1. GitHub → Settings → Webhooks
2. Click webhook → Recent Deliveries
3. Look for errors (401, 500, etc.)

**Check Railway logs:**
```
Should see: "Webhook received"
```

**Verify:**
- `WEBHOOK_SECRET` matches GitHub webhook secret
- Railway URL is correct in GitHub webhook
- Port 3000 is configured

### "pnpm not found" Error

**Solution:**
Ensure `nixpacks.toml` is in repository root with:
```toml
[phases.setup]
nixPkgs = ['nodejs_18', 'pnpm']
```

Railway will automatically detect and use it.

---

## Security Best Practices

1. ✅ Use environment variables for all secrets
2. ✅ Enable `WEBHOOK_SECRET` for GitHub webhooks
3. ✅ Keep dependencies updated (`pnpm update`)
4. ✅ Monitor logs for suspicious activity
5. ✅ Use strong Discord bot token
6. ✅ Limit GitHub token permissions (repo scope only)

---

## Updating the Bot

### Method 1: Push to GitHub (Automatic)

```bash
# Make changes locally
git add .
git commit -m "update: improve feature"
git push origin main

# Railway auto-deploys in ~2-3 minutes
```

### Method 2: Manual Redeploy

1. Railway dashboard
2. Service settings → **"Redeploy"**

---

## Configuration Files

### nixpacks.toml

Tells Railway:
- Use Node.js 18
- Install pnpm
- Run pnpm commands for install/build/start

### .npmrc

Enforces:
- pnpm package manager
- Engine version requirements

---

## Support

**Railway Support:**
- Docs: docs.railway.app
- Discord: discord.gg/railway
- Help: help.railway.app

**Bot Issues:**
1. Check Railway logs first
2. Verify environment variables
3. Test locally with same `.env`
4. Check GitHub webhook deliveries

---

## Next Steps

1. ✅ Deploy bot to Railway
2. ✅ Configure environment variables
3. ✅ Get public URL
4. ✅ Configure GitHub webhooks
5. ✅ Test all features
6. 🎯 Monitor usage and logs
7. 🎯 Set up alerts (optional)

**Your bot is now production-ready with auto-deploy!** 🚀

---

## Comparison: Railway vs Other Platforms

**Why Railway?**
- ✅ Actually free for low-usage bots ($5 credits monthly)
- ✅ Auto-deploy on push (zero config)
- ✅ pnpm support via nixpacks
- ✅ HTTPS included
- ✅ Great logs and monitoring
- ✅ Easy environment variables
- ✅ Fast deployments (~2-3 min)

**vs DigitalOcean:**
- Railway: $0-5/month, Railway wins
- DigitalOcean: $5/month minimum

**vs Heroku:**
- Railway: $5 free credits
- Heroku: No free tier anymore

**vs AWS:**
- Railway: Simple setup
- AWS: Complex but more control

---

## Summary

Railway is perfect for this Discord bot:
- 100% free for your usage
- Auto-deploy from GitHub
- pnpm support built-in
- Secure and reliable
- Easy to manage

**Total monthly cost: $0** (within free tier)
**Setup time: 10 minutes**
**Maintenance: Zero** (auto-deploys)