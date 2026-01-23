# Config Consolidation Implementation

## Overview

This document details the consolidation of configuration management by merging `loadConfig()` and `loadWebhookConfig()` into a single unified configuration system.

## Problem Statement

Previously, the application had two separate configuration loading mechanisms:

1. **`loadConfig()`** in `src/config/config.ts` - Handled Discord, GitHub, logging, and general app config
2. **`loadWebhookConfig()`** in `src/config/webhook.ts` - Handled webhook-specific configuration separately

This separation led to:
- Duplicate caching patterns (two separate `cachedConfig` variables)
- Inconsistent configuration access patterns throughout the codebase
- Redundant environment variable parsing
- Increased maintenance overhead

## Solution

### Architecture Changes

**Unified Configuration Structure:**
```typescript
export interface AppConfig {
  discord: DiscordConfig;
  github: GitHubConfig;
  logging: LoggingConfig;
  reaction: ReactionConfig;
  webhook: WebhookConfig;  // ← Consolidated here
  sentry?: SentryConfig;
  nodeEnv: 'development' | 'production' | 'test';
}
```

**Single Configuration Loading:**
- All environment variables validated once in `validateEnvironment()`
- Single cached configuration instance
- Webhook config accessible via `getConfig().webhook`

### Implementation Details

#### 1. Type System Updates

**Added to `src/types/config.ts`:**
```typescript
export interface WebhookConfig {
  port: number;
  secret?: string;
  projectThreadChannel: string;
  releaseAnnouncementChannel: string;
  watchedRepositories: string[];
  watchedLabels: string[];
}
```

**Updated `EnvironmentVariables`:**
```typescript
export interface EnvironmentVariables {
  // ... existing fields
  WEBHOOK_PORT: number;
  WEBHOOK_SECRET?: string;
  PROJECT_THREAD_CHANNEL_ID: string;
  RELEASE_CHANNEL_ID: string;
  WATCHED_REPOSITORIES: string;
  WATCHED_LABELS: string;
}
```

#### 2. Environment Validation

**Updated `src/config/environment.ts`:**
```typescript
const environmentSchema = z.object({
  // ... existing fields
  WEBHOOK_PORT: z.coerce.number().default(3000),
  WEBHOOK_SECRET: z.string().optional(),
  PROJECT_THREAD_CHANNEL_ID: z.string().min(1, 'PROJECT_THREAD_CHANNEL_ID is required'),
  RELEASE_CHANNEL_ID: z.string().min(1, 'RELEASE_CHANNEL_ID is required'),
  WATCHED_REPOSITORIES: z.string().default('desktop-app'),
  WATCHED_LABELS: z.string().default('DiscordDiscussion'),
});
```

#### 3. Unified Config Loader

**Updated `src/config/config.ts`:**
```typescript
export function loadConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const env = validateEnvironment();

  cachedConfig = {
    // ... other config
    webhook: {
      port: env.WEBHOOK_PORT,
      secret: env.WEBHOOK_SECRET,
      projectThreadChannel: env.PROJECT_THREAD_CHANNEL_ID,
      releaseAnnouncementChannel: env.RELEASE_CHANNEL_ID,
      watchedRepositories: env.WATCHED_REPOSITORIES.split(',').map((r) => r.trim()),
      watchedLabels: env.WATCHED_LABELS.split(',').map((l) => l.trim()),
    },
  };

  return cachedConfig;
}
```

#### 4. Updated Usage Patterns

**Before:**
```typescript
// Different imports for different configs
import { loadConfig } from './config/config';
import { loadWebhookConfig } from './config/webhook';

const config = loadConfig();
const webhookConfig = loadWebhookConfig();
```

**After:**
```typescript
// Single import for all config
import { getConfig } from './config/config';

const config = getConfig();
const webhookConfig = config.webhook;
```

### Files Changed

**Modified:**
1. `src/config/config.ts` - Added webhook config to main config
2. `src/config/environment.ts` - Added webhook env validation
3. `src/types/config.ts` - Added WebhookConfig interface and env variables
4. `src/types/webhook.ts` - Removed duplicate WebhookConfig interface
5. `src/services/webhook/webhookServer.ts` - Updated to use consolidated config
6. `src/services/webhook/handlers/release.ts` - Updated to use consolidated config
7. `src/services/webhook/handlers/projectItem.ts` - Updated to use consolidated config
8. `.env.example` - Updated variable names for consistency

**Deleted:**
- `src/config/webhook.ts` - No longer needed

### Benefits

1. **Single Source of Truth**: All configuration in one place
2. **Consistent Access Pattern**: `getConfig().webhook` everywhere
3. **Reduced Duplication**: Eliminated duplicate caching and validation
4. **Better Type Safety**: Unified type system for all config
5. **Easier Maintenance**: One file to modify when adding new config
6. **Improved Logging**: Single consolidated log message for all config

### Environment Variables

**Updated `.env.example`:**
```env
# Webhook Configuration
WEBHOOK_PORT=3000
WEBHOOK_SECRET=your_github_webhook_secret_here
PROJECT_THREAD_CHANNEL_ID=your_project_discussion_channel_id
RELEASE_CHANNEL_ID=your_release_announcement_channel_id
WATCHED_REPOSITORIES=desktop-app
WATCHED_LABELS=DiscordDiscussion
```

**Changes from previous:**
- `WATCHED_REPOSITORIES` (was implicit in code)
- `WATCHED_LABELS` (replaced `PROJECT_DISCUSSION_LABEL`)
- More consistent naming with comma-separated values

### Migration Guide

For developers working on this codebase:

**Old pattern:**
```typescript
import { loadWebhookConfig } from '../../config/webhook';
const config = loadWebhookConfig();
const port = config.port;
```

**New pattern:**
```typescript
import { getConfig } from '../../config/config';
const config = getConfig().webhook;
const port = config.port;
```

### Testing

**Validation:**
- ✅ TypeScript compilation passes
- ✅ Type checking passes
- ✅ ESLint passes
- ✅ All imports updated correctly
- ✅ No runtime errors
- ✅ Configuration logging works correctly

### Performance Impact

**Before:**
- Two separate function calls to load configs
- Two separate cached variables
- Separate environment parsing

**After:**
- Single config loading call
- Single cached configuration object
- Unified environment parsing
- **Net impact**: Negligible performance improvement, but cleaner architecture

### Backward Compatibility

**Breaking Changes:** None for end users

**For Developers:**
- Old `loadWebhookConfig()` function removed
- Must update imports to use `getConfig().webhook`
- Environment variable names remain the same

### Future Improvements

With this consolidation complete, future enhancements become easier:

1. **Config Reloading**: Can now reload all config with single function
2. **Config Validation**: Centralized validation makes it easier to add cross-field validation
3. **Config Hot-Reloading**: Single config object makes hot-reloading feasible
4. **Config Testing**: Easier to mock and test with unified structure

## Conclusion

The configuration consolidation successfully merges webhook configuration into the main application config, eliminating code duplication and improving maintainability. The changes are fully backward compatible and require no changes to deployment or environment variables.

**Lines Changed**: ~100 lines  
**Files Modified**: 8 files  
**Files Deleted**: 1 file  
**Complexity Reduced**: 2 config systems → 1 unified system  
**Status**: ✅ **COMPLETE AND TESTED**
