# API And Data Safety Smoke

Status: local smoke proven; URL-mode smoke harness ready; production scope and bindings not supplied
Date: 2026-05-24
Related plan gates: `PROD-042`, `PROD-043` in `docs/comeback-city-kart-racer-production-readiness-plan.md`

## Proven Local Smoke

Command:

```bash
npm run test:api:data
```

Latest evidence:

| Command | Result | Evidence |
| --- | --- | --- |
| `API_DATA_SMOKE_ARTIFACT_DIR=.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z npm run test:api:data` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/npm-run-test-api-data-local.log` |
| `npm run test:api:data` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/api-data-restore-001-20260523T235700Z/npm-run-test-api-data.log` |
| `npm run build` | Pass with existing large-chunk warning | `.agent/runs/kart-racer-production-readiness/evidence/api-data-restore-001-20260523T235700Z/npm-run-build.log` |
| `node --check 'functions/api/sync/backups/[id]/restore.js'` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/api-data-restore-001-20260523T235700Z/node-check-sync-backup-restore.log` |

The smoke covers:

- Cloudflare Access JWT verification through a generated RS256 token and mocked JWKS response.
- `/api/sync/me` authenticated profile listing and `cache-control: no-store`.
- `/api/sync/state` empty-state read, current app schema write, readback, stale-rev conflict, read-only visible profile, and forbidden profile behavior.
- `/api/sync/backups` backup creation/listing after an update and read-only backup rejection.
- `/api/sync/backups/[id]/restore` authenticated own-profile same-schema restore, current-state safety backup creation, stale-rev conflict, other-user backup hiding, and old-schema safe rejection.
- D1-like `user_states` and `state_backups` behavior from `migrations/0001_comeback_sync.sql`.
- FatSecret short-query no-op, missing-credentials error, search success, item success, and upstream API error behavior.
- Safe error checks for conflict/backup/FatSecret paths without raw state or configured secret leakage.

## Schema And Restore Compatibility Fix

The current app state schema is `5` in `src/hooks/usePersistedState.js`. The sync Function validator now uses the same schema version in `functions/api/sync/_shared.js`, and the smoke proves `makeDefaultState()` writes/readbacks at schema `5`.

The local restore proof is `.agent/runs/kart-racer-production-readiness/evidence/api-data-restore-001-20260523T235700Z/api-data-restore-001-summary.json`. The latest rerun summary is `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/api-data-smoke-summary.json`. It proves same-schema D1 backup restore locally by restoring revision `1` over current revision `2`, creating a safety backup of revision `2`, and reading back restored revision `3`.

## Preview/Production URL Smoke Harness

The same command can run safe read-only probes against a supplied preview or production URL:

```bash
API_DATA_SMOKE_URL=<preview-url> API_DATA_SMOKE_TARGET=preview npm run test:api:data
API_DATA_SMOKE_URL=<production-url> API_DATA_SMOKE_TARGET=production npm run test:api:data
```

Authenticated sync read smoke requires a release-owner supplied Cloudflare Access JWT:

```bash
API_DATA_SMOKE_URL=<url> \
API_DATA_SMOKE_TARGET=production \
API_DATA_SMOKE_JWT=<cf-access-jwt> \
API_DATA_SMOKE_USER_ID=<user-id> \
npm run test:api:data
```

Live FatSecret proxy smoke requires explicit owner approval to call the deployed external proxy:

```bash
API_DATA_SMOKE_URL=<url> \
API_DATA_SMOKE_TARGET=production \
API_DATA_SMOKE_FATSECRET_LIVE_QUERY=<query> \
npm run test:api:data
```

URL mode records `api-data-smoke-summary.json` when `API_DATA_SMOKE_ARTIFACT_DIR` is set. It checks safe non-5xx behavior for unauthenticated sync routes, verifies FatSecret short-query and missing-item response shapes, checks configured secret values are not leaked, and optionally verifies authenticated sync read routes plus live FatSecret search when the required owner-supplied inputs exist.

Latest URL-mode harness evidence: `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/url-mode-mock/api-data-smoke-summary.json`. This was run against a deployment-shaped local mock server with a mock JWT and mock live FatSecret query to prove harness behavior. It is not preview or production binding evidence.

## Not Proven Yet

This does not close the production API/data gate. The repo still lacks:

- owner decision that Cloudflare sync/D1 and FatSecret are in production scope,
- production Cloudflare Pages project/domain,
- production D1 binding name and migration evidence,
- Cloudflare Access audience/team-domain production values,
- FatSecret production secrets/bindings proof,
- preview/prod smoke against real bindings,
- production binding rollback compatibility evidence,
- barcode/camera production scope and Permissions-Policy decision,
- telemetry/log retention and privacy approval.
