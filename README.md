# Omni Integration

NestJS bridge for external tool sync. First connector: **Linear → Squash TM** requirements.

## What it does

1. Receives Linear webhooks at `POST /webhooks/linear`
2. Filters by `LINEAR_PROJECT_NAME` / `LINEAR_PROJECT_ID`
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
    webhooks/           # HTTP edge
    sync/               # use-cases (Linear→Squash)
    mappings/           # DB idempotency
    integrations/
      linear/           # signature + parse
      squash/           # REST client
      _template/        # copy for next vendor
```

## Local run

```bash
cp .env.sample .env
# Ensure omni_integration_db exists on Postgres
npx prisma migrate deploy
npm run start:dev
```

Health: `GET /health`  
Webhook: `POST /webhooks/linear`

## Linear setup

1. Create project matching `LINEAR_PROJECT_NAME` (e.g. `omni-suites`)
2. Create label matching `LINEAR_READY_LABEL` (e.g. `ready-for-tc`)
3. Webhook URL: `https://hooks.test-suites-poc.work.gd/webhooks/linear`
4. Subscribe to **Issues** and **Issue Labels**; paste signing secret into `LINEAR_WEBHOOK_SECRET`

## Squash setup

1. Create project matching `SQUASH_PROJECT_NAME`
2. Create API token (or use basic auth) → `SQUASH_API_TOKEN` / `SQUASH_USER`+`SQUASH_PASSWORD`
3. Base URL must include `/squash` (e.g. `http://squash-tm:8080/squash` on Docker)

## Deploy

Image: `${GCP_AR_REPO}/omni-integration:staging`  
Compose service in `infra/apps/docker-compose.yml`  
Route: `hooks.test-suites-poc.work.gd` in Traefik
