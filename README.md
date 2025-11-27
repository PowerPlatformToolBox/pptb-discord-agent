# PPTB Discord Assistant

> Production-ready Discord bot with GitHub integration for PowerPlatformToolBox

## Overview

TypeScript Discord bot featuring:
- **Message reaction logging** to dedicated Discord channel
- **GitHub issue creation** via slash commands
- **Full type safety** with TypeScript strict mode
- **Production-grade architecture** aligned with PowerPlatformToolBox standards

## Features

### Discord Integration
- ⭐ Message logging via emoji reactions
- 💬 Slash commands with full type safety
- 🎨 Rich embeds for user feedback
- ⚠️ Comprehensive error handling

### GitHub Integration
- 📝 Create issues in PowerPlatformToolBox repos
- 🔍 Query organization repositories
- 💭 Add comments to issues
- ✅ Input validation and sanitization

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
pnpm deploy  # Register slash commands
pnpm dev     # Start development server
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

# Environment
NODE_ENV=development
LOG_LEVEL=debug
```

## Project Structure

```
src/
├── types/              # TypeScript type definitions
├── config/             # Configuration management
├── services/           # Business logic (GitHub, Discord)
├── handlers/           # Event and command handlers
│   ├── events/        # Discord event handlers
│   └── commands/      # Slash command implementations
├── utils/              # Utility functions
├── scripts/            # Deployment and build scripts
└── main.ts             # Application entry point
```

## Available Commands

```bash
pnpm dev          # Start development with auto-reload
pnpm build        # Compile TypeScript
pnpm start        # Run production build
pnpm deploy       # Deploy slash commands to Discord
pnpm lint         # Check code quality
pnpm format       # Format code with Prettier
pnpm type-check   # Validate TypeScript types
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

## Technology Stack

- **Discord.js v14+** - Discord bot framework
- **TypeScript 5.7+** - Type-safe JavaScript
- **Octokit** - GitHub API client
- **Winston** - Structured logging
- **Zod** - Runtime schema validation
- **ESLint + Prettier** - Code quality
- **pnpm** - Fast package manager

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