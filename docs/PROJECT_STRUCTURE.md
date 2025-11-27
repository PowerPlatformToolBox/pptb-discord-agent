# PPTB Discord Assistant - Project Structure

## Complete Folder and File Layout

```
pptb-discord-assistant/
├── src/
│   ├── types/
│   │   ├── config.ts           # Configuration type definitions
│   │   ├── discord.ts          # Discord-related types (commands, events)
│   │   ├── errors.ts           # Custom error class definitions
│   │   ├── github.ts           # GitHub API type definitions
│   │   └── index.ts            # Type exports index
│   │
│   ├── config/
│   │   ├── config.ts           # Main configuration loader (singleton)
│   │   ├── environment.ts      # Environment variable validation (Zod schema)
│   │   ├── constants.ts        # Application constants (colors, limits, timeouts)
│   │   └── intents.ts          # Discord client intents and partials
│   │
│   ├── services/
│   │   ├── github/
│   │   │   ├── githubClient.ts       # Octokit wrapper (singleton)
│   │   │   └── issueService.ts       # GitHub issue operations service
│   │   │
│   │   └── discord/
│   │       └── (future Discord service extensions)
│   │
│   ├── handlers/
│   │   ├── events/
│   │   │   ├── ready.ts              # Bot ready event (ClientReady)
│   │   │   ├── messageReactionAdd.ts # Message reaction handler (logging)
│   │   │   └── interactionCreate.ts  # Slash command handler
│   │   │
│   │   └── commands/
│   │       ├── utility/
│   │       │   └── ping.ts           # Ping command (latency check)
│   │       │
│   │       └── github/
│   │           └── createIssue.ts    # Create GitHub issue command
│   │
│   ├── utils/
│   │   ├── logger.ts           # Winston logger instance & factory
│   │   ├── embedBuilder.ts     # Discord embed builder utilities
│   │   └── validators.ts       # Input validation & sanitization
│   │
│   ├── middleware/
│   │   └── (error handling, logging middleware)
│   │
│   ├── scripts/
│   │   └── deployCommands.ts   # Slash command deployment script
│   │
│   └── main.ts                 # Main application entry point
│
├── tests/
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── mocks/                  # Test mocks
│
├── .github/
│   └── workflows/
│       └── lint.yml            # GitHub Actions CI/CD (linting, formatting, type check)
│
├── docs/
│   └── (architecture, setup, contributing documentation)
│
├── logs/                       # Runtime logs (git-ignored)
├── dist/                       # Compiled JavaScript output (git-ignored)
│
├── Configuration Files
│   ├── package.json            # npm/pnpm dependencies & scripts
│   ├── tsconfig.json           # TypeScript compiler configuration (strict mode)
│   ├── tsconfig.build.json     # Build-specific TypeScript config
│   ├── eslint.config.mjs       # ESLint configuration (TypeScript, strict rules)
│   ├── .prettierrc.json        # Prettier code formatter config
│   ├── .lintstagedrc.json      # lint-staged pre-commit hooks
│   ├── .gitignore              # Git ignore patterns
│   ├── .env.example            # Environment variables template
│   ├── .env                    # Actual environment variables (git-ignored)
│   ├── README.md               # Project documentation
│   └── LICENSE                 # GPL-3.0 license
```

## File Count Summary

- **Type Definitions**: 5 files
- **Configuration**: 4 files
- **Services**: 2 files
- **Event Handlers**: 3 files
- **Commands**: 2 files
- **Utilities**: 3 files
- **Scripts**: 1 file
- **Main Application**: 1 file
- **Configuration Files**: 9 files
- **Total TypeScript Source**: 21 files
- **Total Project Files**: 30+ files

## Key Points

### TypeScript Organization
- All source code in `/src` with strict TypeScript mode
- Type definitions centralized in `/src/types`
- Services layer isolated in `/src/services`
- Event handlers and commands modular and organized by feature
- Utilities separated for reusability

### Configuration Management
- Environment variables validated with Zod schema
- Configuration loaded once (singleton pattern)
- No hardcoded values anywhere
- Feature flags and constants centralized

### Error Handling
- Custom error classes (DiscordBotError, ConfigurationError, GitHubAPIError, ValidationError)
- Context metadata with every error
- Centralized error logging

### Code Quality
- ESLint strict TypeScript rules
- Prettier formatting enforcement
- Pre-commit hooks with Husky
- Source maps for debugging
- Full type safety (noImplicitAny: true)

### Services Pattern
- GitHub client as Octokit wrapper (singleton)
- Issue service for GitHub operations
- Extensible for future services

### Event-Driven Architecture
- Discord.js event system utilized
- Custom event types for extensibility
- Error handling per event

### Commands Architecture
- Modular command files by category (utility, github)
- Slash commands with full type safety
- Deferral for long-running operations
- Error handling and user feedback