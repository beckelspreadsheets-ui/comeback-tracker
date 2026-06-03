# Phase 3 complete — restaurants

## What shipped
- `src/lib/restaurantApi.js` — FatSecret-backed restaurant search + item details
- `functions/api/fatsecret/*` — Cloudflare Pages Function proxy for FatSecret OAuth/API calls
- Fifth tab in `FoodEntrySheet` (`Rest.` with `Utensils` icon)
- Env-var gated: `VITE_RESTAURANT_API=fatsecret`. Tab hidden if missing.
- Shared abort handling so switching tabs cancels in-flight Restaurant requests.

## Deploy-side TODO for the user
Set these env vars in each Cloudflare Pages project (`comeback-andrew`, `comeback-alexander`) before the next deploy:
- `VITE_RESTAURANT_API=fatsecret`
- `FATSECRET_CLIENT_ID`
- `FATSECRET_CLIENT_SECRET`
- `FATSECRET_SCOPE=basic`

## Test results
1. FatSecret OAuth token request: pass.
2. FatSecret food search request: blocked by FatSecret IP allowlist (`Invalid IP address detected` for the current public IP).
3. `npm run build:andrew`: pass.
4. Restaurant tab UI: build-level verified only; live search requires FatSecret IP allowlist/deploy env configuration.

## Deferred / gotchas
- Credentials are stored only in ignored local env files (`.env.local`, `.dev.vars`) and must not be committed.
- FatSecret requires allowed API caller IP configuration. Cloudflare Pages Functions may not provide stable egress IPs, so deployed live search may require a different proxy host with static egress if FatSecret enforces IP allowlisting for this account.
- Build still emits the existing Vite chunk-size warning for `recharts`; unchanged by this phase.

## Next phase
Phase 4 (portion chips) is complete.
