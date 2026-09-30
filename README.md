# Omni Integration

NestJS bridge for external tool sync. First connector: **Linear → Squash TM** requirements.

## What it does

1. Receives Linear webhooks at `POST /webhooks/linear`
2. Filters by `LINEAR_TEAM_NAME` / `LINEAR_TEAM_ID` (default `omni-suites`)
3. When label `LINEAR_READY_LABEL` (default `ready-for-tc`) is present:
   - **no mapping** → create Squash requirement + save mapping
   - **mapping exists** → update Squash requirement
4. When label is removed and mapping exists → mark Squash req `[Not ready]` (no delete)
5. Idempotent via `integration_mappings` on Postgres (`omni_integration_db`)

## Layout

```text
src/
  core/                 # Prisma, Config, health
  modules/
    integrations/       # External API adapters
      linear/           # Guards, Parser service, Types
      squash/           # Client, Requirements service, Types
      discord/          # Controller, Service, Module, Ed25519 signature verification
    webhooks/           # Edge controller, Linear sync service, Mappings repo, Types
scripts/
  register-commands.mjs # Discord guild slash command registration
```

## Local run

```bash
cp .env.sample .env
# Ensure omni_integration_db exists on Postgres
npx prisma migrate deploy
npm run start:dev
```

Health: `GET /health`  
Linear Webhook: `POST /webhooks/linear`  
Discord Interactions: `POST /api/discord/interactions`

## Linear setup

1. Create team matching `LINEAR_TEAM_NAME` (e.g. `omni-suites`)
2. Create label matching `LINEAR_READY_LABEL` (e.g. `ready-for-tc`)
3. Webhook URL: `https://hooks.test-suites-poc.work.gd/webhooks/linear`
4. Subscribe to **Issues** and **Issue Labels**; paste signing secret into `LINEAR_WEBHOOK_SECRET`

## Squash setup

1. Create project matching `SQUASH_PROJECT_NAME`
2. Create API token (or use basic auth) → `SQUASH_API_TOKEN` / `SQUASH_USER`+`SQUASH_PASSWORD`
3. Base URL must include `/squash` (e.g. `http://squash-tm:8080/squash` on Docker)

---

## Discord E2E Integration Setup Guide

The Discord integration allows team members to trigger automated Playwright E2E test runs directly from Discord using the `/run-tests` slash command.

### How It Works

```text
Discord user types /run-tests (suite, grep, test_env)
        │
        ▼
Discord POSTs interaction payload (Ed25519 signed)
        │
        ▼
POST /api/discord/interactions (DiscordController)
        │
        ├─ 1. Signature Verification: verifyKey(rawBody, signature, timestamp, publicKey)
        │
        ├─ 2. Immediate 200 OK Reply (<3s deadline):
        │     "🚀 Triggering E2E Tests... ⏳ Dispatching to GitHub Actions..."
        │
        └─ 3. Background Task:
              POST to GitHub API (workflow_dispatch on e2e.yml)
                │
                ├─ Success → PATCH https://discord.com/api/v10/webhooks/{appId}/{interactionToken}/messages/@original
                │            "✅ E2E Tests Triggered! 🔗 View workflow runs"
                │
                └─ Error   → PATCH .../messages/@original
                             "❌ Failed to trigger workflow: <error>"
```

### 1. Environment Variables

Add the following to your `.env` (or VM `infra/apps/.env`):

```env
# Discord Configuration
DISCORD_APPLICATION_ID=
DISCORD_PUBLIC_KEY=
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=

# GitHub PAT (Classic token with repo and workflow scopes)
DISCORD_GITHUB_PAT_TOKEN=

```

| Variable | Description |
|---|---|
| `DISCORD_APPLICATION_ID` | Application / Client ID from Discord Developer Portal |
| `DISCORD_PUBLIC_KEY` | Public key used to verify incoming webhook signatures |
| `DISCORD_BOT_TOKEN` | Bot token used to authenticate management scripts |
| `DISCORD_GUILD_ID` | Discord Server ID (enables instant guild-scoped slash command registration) |
| `DISCORD_GITHUB_PAT_TOKEN` | GitHub Classic Personal Access Token with `repo` and `workflow` scopes |

### 2. Discord Developer Portal Setup

1. **Create Application**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications).
   - Click **New Application** (e.g. `Omni Bot`).
   - Under **General Information**, copy `APPLICATION ID` and `PUBLIC KEY`.

2. **Create Bot & Token**:
   - Navigate to the **Bot** tab.
   - Click **Reset Token** to generate and copy `DISCORD_BOT_TOKEN`.

3. **Invite Bot to Server**:
   - Go to **OAuth2** → **OAuth2 URL Generator**.
   - Check scopes: `bot` and `applications.commands`.
   - Under Bot Permissions, select: `Send Messages`, `Embed Links`, `Attach Files`, `Use Slash Commands`.
   - Copy the generated URL, open in your browser, and authorize it for your server.

4. **Get Server (Guild) ID**:
   - In Discord Desktop App: **User Settings** → **Advanced** → Enable **Developer Mode**.
   - Right-click your Discord server name/icon → **Copy Server ID** → set as `DISCORD_GUILD_ID`.

### 3. GitHub PAT Configuration

To trigger GitHub Actions workflows via `workflow_dispatch`, GitHub requires a token with the **`workflow`** and **`repo`** scopes. A **Classic Personal Access Token** is recommended to ensure reliable dispatch permissions across organization repositories:

1. In GitHub, go to **Settings** → **Developer Settings** → **Personal Access Tokens** → **[Tokens (classic)](https://github.com/settings/tokens/new)**.
2. Configure the token:
   - **Note**: `omni-discord-trigger`
   - **Expiration**: Select your preferred validity (e.g. 90 days or No expiration)
   - **Select scopes**:
     - [x] **`repo`** (Full control of private repositories)
     - [x] **`workflow`** (Update and trigger GitHub Action workflows)
3. Click **Generate token** and copy the secret (`ghp_...`).
4. Set the token in `DISCORD_GITHUB_PAT_TOKEN` in your `.env` (and `/opt/omni-infra/apps/.env` on the VM).

### 4. Register Slash Commands

Discord commands can be registered globally (takes up to 1 hour to propagate) or guild-scoped (propagates **instantly**). For private team bots, guild registration is recommended.

Run the registration script:

```bash
# Uses values from .env automatically
node scripts/register-commands.mjs
```

Or pass them inline:
```bash
DISCORD_APPLICATION_ID="" \
DISCORD_BOT_TOKEN="" \
DISCORD_GUILD_ID="" \
node scripts/register-commands.mjs
```

#### Command Options in `/run-tests`:
- **`suite`** (Required): `🔥 Smoke` | `🧪 Sanity` | `🔁 Regression` | `🖥 UI` | `🔌 API` | `🌐 All` | `🎯 Custom (use grep)`
- **`grep`** (Optional): Tag or regex filter (e.g. `TC-106`, `TC-105`) when `suite: custom`
- **`test_env`** (Optional): `🚀 Staging` | `💻 Local` (defaults to `staging`)

### 5. Configure Interactions Endpoint URL

1. Ensure `omni-integration` is running and accessible via HTTPS (Traefik route `https://hooks.test-suites-poc.work.gd`).
2. Go to **Discord Developer Portal** → **General Information**.
3. In **Interactions Endpoint URL**, enter:
   ```
   https://hooks.test-suites-poc.work.gd/api/discord/interactions
   ```
4. Click **Save Changes**. Discord will send an Ed25519-signed `PING`; `omni-integration` will respond with `PONG`. If valid, Discord saves with a green checkmark.

### 6. Channel Permissions & Access Control

To restrict where `/run-tests` can be used (e.g., exclude from `#test-release` or restrict to `#dev`):
1. In Discord: **Server Settings** → **Integrations** → **Omni Bot**.
2. Under **Commands**, select `/run-tests`.
3. Add channels to disable or enable execution per channel or role.

---

## Deploy

Image: `${GCP_AR_REPO}/omni-integration:staging`  
Compose service in `infra/apps/docker-compose.yml`  
Route: `hooks.test-suites-poc.work.gd` in Traefik

