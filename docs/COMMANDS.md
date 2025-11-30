# Discord Bot Commands

## GitHub Commands

### `/create-issue`

Create a GitHub issue in PowerPlatformToolBox repositories.

**Usage:**
```
/create-issue repository:<repo> title:<title> description:<description> [labels:<labels>]
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repository` | Choice | Yes | Repository dropdown selection |
| `title` | String | Yes | Issue title |
| `description` | String | Yes | Issue description |
| `labels` | String | No | Comma-separated labels (e.g., `bug,enhancement`) |

**Repository Options:**

| Repository | Owner | Purpose |
|------------|-------|----------|
| 🖥️ Desktop App (Main Project) | PowerPlatformToolBox | Main desktop application |
| 🌐 Website | PowerPlatformToolBox | powerplatformtoolbox.com website |
| 📚 Documentation | PowerPlatformToolBox | Documentation site |
| 🧪 Mockaroo Munger (Testing) | MattBerg11 | Mockaroo data munger tool (private, testing) |

**Examples:**

**Create bug report:**
```
/create-issue 
  repository: Desktop App
  title: Table control not rendering properly
  description: When loading large datasets, the table component freezes
  labels: bug,ui
```

**Create feature request:**
```
/create-issue 
  repository: Website
  title: Add dark mode toggle
  description: Users want ability to switch between light/dark themes
  labels: enhancement,ux
```

**Testing in Mockaroo Munger:**
```
/create-issue 
  repository: Mockaroo Munger (Testing)
  title: Test webhook integration
  description: Testing GitHub webhook functionality
```

**Response:**

On success, bot replies with embed containing:
- Issue number
- Repository name with emoji
- Issue title
- Direct URL to GitHub issue
- Owner/repository path

Issue body automatically includes:
- User's description
- Footer with Discord username

**Permissions Required:**
- GitHub token must have `repo` scope
- Write access to target repository
- For testing repo: Token needs access to MattBerg11/pptb-mockaroo-munger

**Error Handling:**

Common errors:
- Invalid repository name
- Missing GitHub permissions
- Rate limit exceeded
- Network/API failures

Bot provides clear error messages in Discord embed.

---

## General Commands

### `/ping`

Check if bot is online and responsive.

**Usage:**
```
/ping
```

**Response:**
```
Pong! Latency: 42ms
```

---

## Admin Commands

*Coming soon*

---

## Command Registration

Commands are automatically registered on bot startup. To manually deploy commands:

```bash
pnpm deploy-commands
```

This updates all slash commands in Discord.

**Environment variables required:**
- `DISCORD_BOT_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID` (for guild-specific commands)

---

## Repository Links

**PowerPlatformToolBox Organization:**
- [desktop-app](https://github.com/PowerPlatformToolBox/desktop-app) - Main project
- [pptb-web](https://github.com/PowerPlatformToolBox/pptb-web) - Website
- [pptb-docs-web](https://github.com/PowerPlatformToolBox/pptb-docs-web) - Documentation

**Testing:**
- [pptb-mockaroo-munger](https://github.com/MattBerg11/pptb-mockaroo-munger) - Mockaroo data munger tool (private)