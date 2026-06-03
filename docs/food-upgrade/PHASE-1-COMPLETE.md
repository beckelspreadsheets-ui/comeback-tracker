# Phase 1 complete — gram entry

## Schema
- Bumped to v3. Migration function: `migrateV2toV3` in `src/hooks/usePersistedState.js:36`.
- `migrate` now chains v1→v2→v3 via `migrateV1toV2` and `migrateV2toV3`, so any installed data (pre-v2 or v2) upgrades cleanly in one pass.
- Library items now have `unit: 'serving' | 'gram'`. All legacy items default to `'serving'`; macros are untouched.
- Entries use `amount` + `unit`. Legacy entries are rewritten: `amount = Number(servings) || 1`, `unit = 'serving'`, and the old `servings` field is dropped (lossy-but-equivalent — `amount` replaces it).

## Files changed
- `src/hooks/usePersistedState.js` — `SCHEMA_VERSION = 3`, split migration into `migrateV1toV2` + `migrateV2toV3`, chained version-aware runner.
- `src/lib/foodApi.js` — `mapOffProduct` and `mapUsdaFood` return a `unit` field. Per-100g sources (OFF no-serving, USDA SR Legacy / Foundation) are converted to per-gram with 4-decimal precision via a new `numPerGram` helper and `servingDesc: '1 g'`. Branded / per-serving sources keep existing behavior with `unit: 'serving'`.
- `src/lib/foodHelpers.js` — `sumEntries` reads `e.amount ?? e.servings` (kept as a safety fallback per brief).
- `src/components/FoodEntrySheet.jsx`
  - Draft carries `unit`; sheet state renamed `servings` → `amount`.
  - Edit stage stepper is unit-aware: ±0.25 default 1 for servings, ±5 default 100 for grams. Label swaps between "Servings" and "Grams". `inputMode` swaps to `numeric` for grams, `decimal` for servings.
  - `handleConfirmAdd` persists `{ amount, unit }` on the entry and propagates `unit` to `onSaveToLibrary`.
  - Manual tab: new `[Per serving] [Per gram]` segmented toggle matches the phase toggle styling. In gram mode the serving-desc input is hidden, `servingDesc` is forced to `'1 g'`, a per-gram helper line is shown, and the macro inputs switch to `step="0.01"` with a "1.65" hint on the Cal field.
  - Library list shows `X.XX kcal/g` and per-gram macros for gram-unit items; `per g` replaces the servingDesc line.
- `src/screens/FoodScreen.jsx`
  - Entry row uses `a = Number(e.amount ?? e.servings) || 1`.
  - Label is unit-aware: `Ng` for gram entries, `servingDesc` when `a === 1`, `a × servingDesc` otherwise.
  - `saveToLibrary` dedupes on `name + servingDesc + unit` (previously `name + servingDesc`) so serving-mode and gram-mode library items with the same name don't collide.

## Test results
- `npm run build:andrew` — succeeds cleanly (only the pre-existing recharts chunk-size advisory, unrelated to this phase).
- Static review of migration: migrateV2toV3 is idempotent (skips any entry that already has `unit` + `amount`), preserves unknown fields via spread, and walks every date / bucket in `food.log`.
- Manual browser test plan (1–7 in the brief) was not executed in this run — UI sign-off is expected from the human-in-the-loop per `ROADMAP.md` step 5. Build + type-free JS passed.

## Deferred / gotchas
- `OFF search` + `USDA SR` results previously filtered with `mapped.cal > 0`. For per-gram foods the value is much smaller (e.g. 0.17 for lettuce), but still positive, so the filter still passes; genuinely zero-cal items are still excluded. No change needed.
- Barcode lookups via OFF return per-serving data when available and fall back to per-gram otherwise — same new path as search results, so the Edit stage handles them without a code branch.
- The `servings` fallback in `sumEntries` and in `FoodScreen` entry rendering is intentional (per brief) — any pre-migration entry that slips through (e.g. a stale export) still totals correctly.
- `numPerGram` rounds to 4 decimals (milligram precision). Noticed during implementation: the brief proposed a few variants; the 4-decimal scheme was chosen to keep the model tight and avoid a third unit.
- `manual.unit` is stored on the manual form draft; it is reset to `'serving'` by `emptyManual` whenever the sheet opens, which matches the existing reset semantics for the other manual fields.

## Next phase
Phase 2 (AI paste) now unblocked.
