# PPTB Discord Assistant

> Production-ready Discord bot with GitHub integration for PowerPlatformToolBox

## Overview

TypeScript Discord bot featuring:
- **Message reaction logging** to dedicated Discord channel
- **GitHub issue creation** via slash commands
- **Automated discussion threads** for GitHub project items
- **Release announcements** for new versions
- **Full type safety** with TypeScript strict mode
- **Production-grade architecture** aligned with PowerPlatformToolBox standards

## Features

### Discord Integration
- ⭐ Message logging via emoji reactions
- 💬 Slash commands with full type safety
- 🧵 Auto-create threads for labeled GitHub items
- 🎨 Rich embeds for user feedback
- ⚠️ Comprehensive error handling

### GitHub Integration
- 📝 Create issues in PowerPlatformToolBox repos
- 🔍 Query organization repositories
- 💭 Add comments to issues
- 🧵 Auto-create discussion threads for labeled items
- 🚀 Announce new releases automatically
- ✅ Input validation and sanitization

### GitHub Webhooks
- 🔔 **Project Discussion Threads**: When an issue/PR is labeled with `DiscordDiscussion`, a thread is automatically created
- 🎉 **Release Announcements**: Full releases from `desktop-app` are announced with @everyone
- 🔒 HMAC signature verification for security
- ⚙️ Configurable port, channels, and labels

### Architecture
- 🏗️ Modular service design
- 📦 Singleton patterns for stateless services
- 🔐 Environment validation with Zod
- 📊 Structured logging with Winston
- 🧪 ESLint + Prettier code quality
- 🪝 Pre-commit hooks with Husky

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- Discord Bot Token
- GitHub Personal Access Token

### Installation

```bash
# Clone repository
git clone https://github.com/MattBerg11/pptb-discord-assistant.git
cd pptb-discord-assistant

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your tokens

# Build and deploy
pnpm build
pnpm deploy-commands  # Register slash commands
pnpm dev              # Start development server
```

### Environment Variables

```env
# Discord
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_test_guild_id

# GitHub
GITHUB_TOKEN=your_github_token
GITHUB_ORG=PowerPlatformToolBox

# Bot Configuration
LOG_CHANNEL_ID=your_logging_channel_id
REACTION_EMOJI=⭐

# Webhook Configuration
WEBHOOK_PORT=3000
WEBHOOK_SECRET=your_webhook_secret
PROJECT_THREAD_CHANNEL_ID=your_thread_channel_id
RELEASE_CHANNEL_ID=your_release_channel_id
PROJECT_DISCUSSION_LABEL=DiscordDiscussion

# Environment
NODE_ENV=development
LOG_LEVEL=debug
```

## Project Structure

```
src/
├── types/              # TypeScript type definitions
├── config/             # Configuration management
├── services/           # Business logic (GitHub, Discord, Webhooks)
│   ├── github/        # GitHub API services
│   └── webhook/       # Webhook server and handlers
├── handlers/           # Event and command handlers
│   ├── events/        # Discord event handlers
│   └── commands/      # Slash command implementations
├── utils/              # Utility functions
├── scripts/            # Deployment and build scripts
└── main.ts             # Application entry point
```

## Available Commands

```bash
pnpm dev              # Start development with auto-reload
pnpm build            # Compile TypeScript
pnpm start            # Run production build
pnpm deploy-commands  # Deploy slash commands to Discord
pnpm lint             # Check code quality
pnpm format           # Format code with Prettier
pnpm type-check       # Validate TypeScript types
```

## Bot Commands

### `/ping`
Check bot latency and API response time

### `/create-issue`
Create a GitHub issue in PowerPlatformToolBox repositories

**Options:**
- `repository` (required) - Repository name
- `title` (required) - Issue title
- `description` (required) - Issue description
- `labels` (optional) - Comma-separated labels

## Webhook Features

### Automatic Discussion Threads

When you label an issue or PR with `DiscordDiscussion`, the bot automatically:
1. Creates a thread in your designated channel
2. Posts an embed with item details
3. Includes author, labels, and direct link
4. Prevents duplicate threads

### Release Announcements

When a full release is published on `desktop-app`:
1. Bot posts announcement with @everyone
2. Includes version, release notes, and link
3. Only for non-draft, non-prerelease versions
4. Customizable per repository

**Setup Guide:** See [docs/WEBHOOK_SETUP.md](docs/WEBHOOK_SETUP.md)

## Development

### Adding Commands

1. Create file in `src/handlers/commands/<category>/<name>.ts`
2. Export command object with `data` (SlashCommandBuilder) and `execute` function
3. Commands are auto-loaded from directory

### Adding Events

1. Create file in `src/handlers/events/<name>.ts`
2. Export event object with `name`, optional `once`, and `execute` function
3. Events are auto-loaded from directory

### Adding Services

1. Create class in `src/services/<domain>/<service>.ts`
2. Implement singleton pattern with getter function
3. Use service in commands/events via getter

### Adding Webhook Handlers

1. Create handler in `src/services/webhook/handlers/<name>.ts`
2. Register in `src/main.ts` webhook handlers map
3. Handler receives payload and Discord client

## Technology Stack

- **Discord.js v14+** - Discord bot framework
- **TypeScript 5.7+** - Type-safe JavaScript
- **Octokit** - GitHub API client
- **Winston** - Structured logging
- **Zod** - Runtime schema validation
- **ESLint + Prettier** - Code quality
- **pnpm** - Fast package manager

## Discord Permissions

**Required OAuth2 Scopes:**
- `bot`
- `applications.commands`

**Required Bot Permissions:**
- View Channels
- Send Messages
- Send Messages in Threads
- Create Public Threads
- Manage Threads
- Embed Links
- Read Message History
- Add Reactions
- Use External Emojis

## Standards Alignment

This project follows:
- PowerPlatformToolBox desktop-app architecture patterns
- TypeScript strict mode standards
- Discord.js v14+ best practices
- Modern ES6+ JavaScript patterns

## Documentation

- [Setup & Reference Guide](docs/SETUP_AND_REFERENCE_GUIDE.md)
- [Project Structure](docs/PROJECT_STRUCTURE.md)
- [Development Guide](docs/TYPESCRIPT_BOT_META_PROMPT.md)
- [Package Contents](docs/PACKAGE_CONTENTS.md)
- **[Webhook Setup Guide](docs/WEBHOOK_SETUP.md)** ⭐

## License

GPL-3.0 - See [LICENSE](LICENSE) for details

## Contributing

Contributions welcome! Please:
1. Follow TypeScript strict mode
2. Include comprehensive error handling
3. Add structured logging
4. Run `pnpm lint` and `pnpm format`
5. Update documentation as needed

---

**Version:** 1.0.0  
**Status:** Production Ready  
**Created:** November 2025