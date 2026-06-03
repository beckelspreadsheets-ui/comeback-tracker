# Phase 5 complete — meal templates

## Schema
- Bumped to v4.
- Migration: `migrateV3toV4` in `src/hooks/usePersistedState.js`.
- `food.templates: []` added to `DEFAULT_FOOD`.

## What shipped
- `src/components/TemplateSaveModal.jsx` — save-template bottom sheet with item and macro preview
- Save-as-template action on each populated meal bucket
- Templates section above the meal buckets with one-tap log + delete
- Template replay creates fresh entry `id` and `at` values

## Test results
1. `npm run build:andrew`: pass.
2. v4 schema/default wiring: pass at code level.
3. Save template / log template / delete template in the browser: not run interactively in this turn.
4. Export/import round-trip for templates: not run interactively in this turn.

## Deferred / gotchas
- The shell here still needed the explicit `nvm` path for `npm`: `~/.nvm/versions/node/v22.14.0/bin/npm`.
- The existing Vite chunk-size warning for `recharts` remains unchanged.

## Next phase
Food upgrade phases 1-5 are now implemented.
