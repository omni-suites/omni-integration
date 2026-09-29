# Integration connector template

Copy this folder when adding a new external system (e.g. `github/`, `jira/`).

## Checklist

1. Create `<vendor>.module.ts` and export a client / parser (no Prisma, no other vendors).
2. Register the module in `integrations.module.ts`.
3. Add a sync use-case under `modules/sync/` (e.g. `github-to-squash.sync.ts`).
4. Add `POST /webhooks/<vendor>` in `webhooks.controller.ts`.
5. Reuse `mappings` with `source` / `target` strings — do not create a parallel mapping table.

Connectors must not import each other. Orchestration stays in `sync`.
