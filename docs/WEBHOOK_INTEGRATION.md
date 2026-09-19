# GitHub Webhooks Integration

This document describes the Discord bot's GitHub webhook handlers for posting release announcements and sponsorship updates to Discord channels.

## Overview

The bot integrates with GitHub webhooks to automatically post:

- **Release Announcements** (Main & Dev versions)
- **Sponsor Notifications** (creation, updates, cancellations)

## GitHub Webhook Setup

### 1. Create Organization/Repository Webhook

Navigate to your repository settings:

```
Settings → Webhooks → Add webhook
```

**Webhook Configuration:**

- **Payload URL**: `https://your-domain.com/webhook/github`
- **Content type**: `application/json`
- **Secret**: Generate a strong secret (minimum 32 characters)
- **SSL verification**: Enable

### 2. Select Events

Configure the webhook to send the following events:

```
☑ Releases
☑ Sponsorships (organization-level only)
```

For repository-level webhooks, only "Releases" is available. For sponsorship webhooks, configure at the organization level.

## Release Webhooks

### Payload Structure

The GitHub release webhook sends the following payload:

```json
{
  "action": "published|created|edited|deleted|released|prereleased|unpublished",
  "release": {
    "id": 123456789,
    "tag_name": "v1.2.0",
    "target_commitish": "main",
    "name": "Release v1.2.0",
    "draft": false,
    "prerelease": false,
    "created_at": "2025-01-16T12:00:00Z",
    "published_at": "2025-01-16T12:30:00Z",
    "assets": [
      {
        "name": "app-1.2.0.exe",
        "content_type": "application/octet-stream",
        "browser_download_url": "https://github.com/...",
        "size": 104857600,
        "download_count": 42
      }
    ],
    "body": "## Highlights\n• Feature A\n\n## Fixes\n• Bug fix 1",
    "author": {
      "login": "username",
      "avatar_url": "https://avatars.githubusercontent.com/u/12345?v=4"
    },
    "html_url": "https://github.com/org/repo/releases/tag/v1.2.0"
  },
  "repository": {
    "name": "desktop-app",
    "full_name": "PowerPlatformToolBox/desktop-app",
    "html_url": "https://github.com/PowerPlatformToolBox/desktop-app",
    "owner": {
      "login": "PowerPlatformToolBox",
      "avatar_url": "https://avatars.githubusercontent.com/u/12345?v=4"
    }
  }
}
```

### Release Types

The bot automatically detects release type:

| Type             | Detection                                   | Color     | Emoji |
| ---------------- | ------------------------------------------- | --------- | ----- |
| **Main Release** | `v1.0.0` format                             | 🟢 Green  | 🚀    |
| **Dev Release**  | Contains `dev`, `alpha`, `beta`, or `rc`    | 🟣 Purple | 🔬    |
| **Major**        | Version jump (e.g., `v1.0.0` → `v2.0.0`)    | 🟢 Green  | 🚀    |
| **Minor**        | Feature release (e.g., `v1.0.0` → `v1.1.0`) | 🟢 Green  | 🚀    |
| **Patch**        | Bug fix (e.g., `v1.0.0` → `v1.0.1`)         | 🟢 Green  | 🚀    |

### Release Body Format

Format release notes with these sections:

```markdown
# Power Platform ToolBox v1.2.0

## Highlights

• Feature 1
• Feature 2
• Feature 3

## Fixes

• Bug fix 1
• Bug fix 2

## Developer & Build

• Dev note 1
• Dev note 2

## Notes

• Migration note
• Breaking change notice

## Full Changelog

[Compare versions](https://github.com/org/repo/compare/v1.1.0...v1.2.0)
```

**Parsing Rules:**

- Bot extracts up to 5 highlights, 4 fixes, 3 dev notes, 2 notes
- Each bullet point (`•`) is parsed as a separate item
- First 3 assets are shown as download links
- Sections can be omitted; missing sections won't appear in the embed

### Discord Message Format

**Main Release:**

```
🚀 v1.2.0

✨ Highlights
• Feature 1
• Feature 2

🐛 Fixes
• Bug fix 1

⚙️ Developer & Build
• Dev note 1

📥 Downloads
[app-1.2.0.exe](url) • [app-1.2.0.dmg](url)

🔗 Full Changelog
[View on GitHub](url)
```

**Dev Release:**

```
🔬 v1.2.0-beta (DEV)

⚠️ Development Release
This is a development/testing release. Not recommended for production.

✨ Changes
• Feature 1

⚙️ Technical Details
• Implementation detail

🧪 Testing
Test in a non-production environment. Report issues on GitHub.
```

## Sponsorship Webhooks

### Setup Requirements

Sponsorships webhooks are **organization-level only** and require:

1. Organization owner permissions
2. GitHub Sponsors enabled on the organization
3. Webhook configured at organization level (not repository level)

Navigate to:

```
Organization Settings → Webhooks → Add webhook
```

### Payload Structure

The GitHub sponsorship webhook sends:

```json
{
  "action": "created|cancelled|edited|tier_changed",
  "sponsorship": {
    "node_id": "MDEyOlNwb25zb3JzaGlwMQ==",
    "created_at": "2025-01-16T12:00:00Z",
    "updated_at": "2025-01-16T12:00:00Z",
    "sponsor": {
      "login": "username",
      "id": 12345,
      "avatar_url": "https://avatars.githubusercontent.com/u/12345?v=4",
      "type": "User"
    },
    "sponsorable": {
      "login": "PowerPlatformToolBox",
      "type": "Organization"
    },
    "tier": {
      "name": "$5/month",
      "description": "Basic sponsor",
      "monthly_price_in_cents": 500,
      "is_custom": false
    },
    "privacy_level": "public|private",
    "monthly_price_in_cents": 500
  },
  "sender": {
    "login": "username",
    "type": "User"
  }
}
```

### Discord Message Format

**New Sponsor:**

```
💝 New Sponsor!

username is now sponsoring PowerPlatformToolBox!

Tier: Basic Sponsor
Amount: $5.00/month
Visibility: 🌐 Public
```

**Sponsorship Cancelled:**

```
� Sponsorship Ended

username has cancelled their sponsorship.

Previous Support: $5.00/month
```

**Tier Updated:**

```
📈 Sponsorship Tier Updated

username has updated their sponsorship tier.

New Tier: Premium Sponsor
New Amount: $10.00/month
```

### Privacy Handling

- **Public sponsors**: Shows name, avatar, and link
- **Private sponsors**: Shows "Anonymous Sponsor", no identifying information
- Bot respects GitHub's privacy settings automatically

## Environment Configuration

Add these environment variables to your `.env`:

```bash
# Release announcements
RELEASE_CHANNEL_ID=123456789000000000

# Development/pre-release announcements (optional, falls back to RELEASE_CHANNEL_ID)
DEV_RELEASE_CHANNEL_ID=123456789000000001

# Sponsorship notifications
SPONSOR_CHANNEL_ID=123456789000000002

# Webhook security
WEBHOOK_SECRET=your_webhook_secret_min_32_characters
```

## Webhook Endpoint

The webhook endpoint expects:

- Path: `/webhook/github`
- Method: `POST`
- Header: `X-Hub-Signature-256: sha256=...` (validated against WEBHOOK_SECRET)

## Error Handling

The bot handles:

- Invalid webhook signatures (rejected)
- Missing channels (logged, skipped)
- Malformed release bodies (graceful parsing)
- Network errors (logged with retry potential)

All errors are logged via Winston logger with:

- Error message
- Event details (release tag, sponsor name, etc.)
- Timestamp

## Examples

### Release Note Template

```markdown
# Power Platform ToolBox v1.2.0

## Highlights

• VS Code-style search with saved preferences
• Theme-aware modal refresh
• Multi-connection tooling improvements

## Fixes

• Resolved macOS window recreation issues
• Fixed connection footer colors
• Addressed CSP handling for tools

## Developer & Build

• Marketplace shows tool versions
• Structured logging via Winston
• Modular renderer architecture

## Notes

• No manual migration needed; existing settings preserved

## Full Changelog

https://github.com/PowerPlatformToolBox/desktop-app/compare/v1.1.0...v1.2.0
```

### Release Tags

Good practice examples:

- Main: `v1.0.0`, `v1.1.0`, `v2.0.0-rc.1`
- Dev: `v1.0.0-dev`, `v1.0.0-alpha.1`, `v1.0.0-beta`, `v1.0.0-rc.1`

### Webhook Secret Generation

Generate a strong secret (bash):

```bash
openssl rand -hex 32
# Example output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

## Troubleshooting

### Release not appearing in Discord

1. Check that webhook events are configured for "Releases"
2. Verify `RELEASE_CHANNEL_ID` is correct and bot has send permissions
3. Check bot logs for signature validation errors
4. Ensure release body includes section headers (`## Highlights`, etc.)

### Sponsor message not appearing

1. Webhook must be at organization level, not repository level
2. Verify GitHub Sponsors is enabled on the organization
3. Check `SPONSOR_CHANNEL_ID` is correct
4. Verify webhook includes "Sponsorships" event

### Wrong channel receiving messages

Check your environment variables:

- `RELEASE_CHANNEL_ID` - main releases
- `DEV_RELEASE_CHANNEL_ID` - dev releases (optional)
- `SPONSOR_CHANNEL_ID` - sponsorships

### Invalid signature errors

1. Verify `WEBHOOK_SECRET` matches GitHub webhook configuration
2. Secret is case-sensitive
3. Minimum 32 characters recommended
4. Regenerate if unknown
