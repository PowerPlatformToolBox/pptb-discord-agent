# Railway Deployment Guide

## Prerequisites

- Railway account (sign up with GitHub)
- .env created with tokens ready

---

## Step 1: Sign Up & Connect GitHub

1. Go to **railway.app**
2. Click **"Login with GitHub"**
3. Authorize Railway to access repositories

---

## Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose repository
4. Click **"Deploy Now"**

Railway will automatically:

- Detect `packageManager` field in package.json
- Install pnpm
- Run `pnpm install`
- Run `pnpm build` (from scripts)
- Start with `pnpm start`

---

## Step 3: Configure Environment Variables

1. Click on your service ("pptb-discord-assistant")
2. Go to **"Variables"** tab
3. Go to **Raw Editor**
4. Paste the configured .env into the editor

### Required Variables

**Important production adjustments:**

- Set `NODE_ENV=production`
- Set `LOG_LEVEL=info` (not `debug`)
- Generate a secure `WEBHOOK_SECRET` (see below)

### Generate WEBHOOK_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Get Discord Channel IDs

1. Enable Developer Mode in Discord: Settings → Advanced → Developer Mode
2. Right-click channel → Copy Channel ID
3. Paste into Railway variables

---

## Step 4: Railway Auto-Detects pnpm

Railway reads `package.json` and sees:

```json
{
  "packageManager": "pnpm@9.14.4",
  "engines": {
    "node": ">=24.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

This tells Railway:

- Use Node.js 24+
- Use pnpm 9.14.4 specifically
- Install dependencies with pnpm

**No additional configuration needed!**

---

## Step 5: Deploy

1. Railway automatically starts building
2. Wait ~2-3 minutes for first build
3. Check **"Deployments"** tab for progress

**Build logs should show:**

```
✓ Detected pnpm from packageManager field
✓ Installing pnpm@9.14.4
✓ Running pnpm install
✓ Running pnpm build
✓ Build complete
✓ Starting: pnpm start
```

---

## Step 6: Get Your Public URL

1. Go to **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. You'll get: `https://pptb-discord-assistant-production.up.railway.app`
4. **Copy this URL**

---

## Step 7: Configure GitHub Webhook

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

## How Railway Detects pnpm

Railway's Railpack system checks in order:

1. **`packageManager` field** in package.json (recommended)

   ```json
   "packageManager": "pnpm@9.14.4"
   ```

2. **`pnpm-lock.yaml`** file presence
   - If found, uses pnpm automatically

3. **`engines.pnpm`** field
   ```json
   "engines": { "pnpm": ">=8.0.0" }
   ```

Your project uses **all three** for maximum compatibility!

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

### "pnpm not found" Error

**Solution 1: Check package.json**
Ensure these fields exist:

```json
{
  "packageManager": "pnpm@10.18.3",
  "engines": {
    "pnpm": ">=8.0.0"
  }
}
```
```

**Solution 2: Check pnpm-lock.yaml**
Ensure `pnpm-lock.yaml` is committed to repository:

```bash
git add pnpm-lock.yaml
git commit -m "Add pnpm lockfile"
git push
```

**Solution 3: Manual Settings Override**
In Railway Settings → Build:

- Install Command: `pnpm install`
- Build Command: `pnpm build`
- Start Command: `pnpm start`

### Build Failing

**Check deployment logs:**

1. Deployments → Click failed build
2. Read error messages

**Common issues:**

- Missing environment variables
- TypeScript compilation errors
- Missing pnpm-lock.yaml

**Solutions:**

- Verify all environment variables are set
- Run `pnpm build` locally to test
- Ensure lockfile is committed

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
- Port 3000 is exposed

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

## Why This Works

Railway's **Railpack** (modern build system):

- ✅ Automatically detects `packageManager` field
- ✅ Respects `engines` specifications
- ✅ No deprecated nixpacks needed
- ✅ No custom configuration files needed
- ✅ Standard Node.js project structure

**Everything is in package.json - Railway does the rest!**

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

## Summary

Railway is perfect for this Discord bot:

- ✅ 100% free for your usage
- ✅ Auto-detects pnpm from package.json
- ✅ No deprecated nixpacks needed
- ✅ Auto-deploy from GitHub
- ✅ Secure and reliable
- ✅ Easy to manage

**Total monthly cost: $0** (within free tier)  
**Setup time: 10 minutes**  
**Maintenance: Zero** (auto-deploys)

**Modern Railpack approach - no legacy configs needed!**
