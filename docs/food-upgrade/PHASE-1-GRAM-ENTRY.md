# Phase 1 — Unit-aware library items and entries (gram mode)

**Schema bump:** v2 → v3
**Depends on:** nothing (first phase)
**Estimated effort:** medium — touches schema, API mappers, entry sheet, display, and migration

---

## Goal

Today, every food library item and every logged entry is assumed to be in "servings." When OpenFoodFacts returns a food with only per-100g data, the app fakes it by setting `servingDesc: '100g'` and treating 100g as one serving. That forces the user to mentally convert ("I ate 165g of chicken breast → that's 1.65 servings") and creates systematic error.

This phase adds a **unit** concept — `'serving' | 'gram'` — to both library items and log entries. Gram-mode foods store per-gram macros and accept a gram amount at log time. The UI renders gram inputs (step 5, default 100) instead of the servings ±0.25 stepper. Existing serving-based items and existing logged data are untouched.

## Orientation — read these first, cold

Read every file in full before editing anything. No exceptions.

1. `docs/food-upgrade/ROADMAP.md` — understand where this phase fits.
2. `src/hooks/usePersistedState.js` — current migration pattern (v1→v2). Copy this pattern for v2→v3.
3. `src/lib/program.js` lines 46–55 — `DEFAULT_FOOD` shape.
4. `src/lib/foodApi.js` — `mapOffProduct` (lines 14–32) and `mapUsdaFood` (lines 34–55). You'll change these.
5. `src/lib/foodHelpers.js` — `sumEntries` (line 41), `MEAL_BUCKETS` (line 3).
6. `src/components/FoodEntrySheet.jsx` — all of it. The Edit stage (lines 220–304) and Manual tab (lines 468–524) are the main UI changes.
7. `src/screens/FoodScreen.jsx` — entry display (lines 374–403), `addEntry` / `saveToLibrary` mutators.

## Data model changes

### Library item — add `unit` field

```js
// BEFORE
{ id, name, cal, p, c, f, servingDesc, barcode?, lastUsedAt, usageCount }

// AFTER
{ id, name, cal, p, c, f, unit, servingDesc, barcode?, lastUsedAt, usageCount }
// unit: 'serving' | 'gram'
// When unit === 'gram', cal/p/c/f are per-gram (e.g. chicken breast ≈ 1.65cal/g, 0.31p/g).
// When unit === 'serving', cal/p/c/f are per-serving (current behavior).
```

### Log entry — rename `servings` → `amount`, add `unit`

```js
// BEFORE
{ id, itemId?, name, cal, p, c, f, servings, servingDesc, at, barcode? }

// AFTER
{ id, itemId?, name, cal, p, c, f, amount, unit, servingDesc, at, barcode? }
// cal/p/c/f are per-unit (serving or gram)
// amount is the quantity in that unit
// Display: total cal = cal * amount
```

### Migration v2 → v3 (in `usePersistedState.js`)

- Bump `SCHEMA_VERSION` to 3.
- For every library item: if `unit` is missing, set `unit: 'serving'`. Don't change cal/p/c/f.
- For every entry in every day's log, every meal bucket: if `amount` is missing, set `amount: Number(servings) || 1` and `unit: 'serving'`. Keep `servings` field present but unused (avoid lossy migration — we can drop it in a later phase if needed). Actually: **do drop it** to keep the model clean. The migration is lossy only in that `servings` disappears, which is fine because `amount` replaces it.

Write a dedicated migration function `migrateV2toV3(state)` that runs inside the existing `migrate` function. The existing migrate handles v1→v2; chain v2→v3 after it.

## Work items

### 1. `src/hooks/usePersistedState.js`

- `SCHEMA_VERSION = 3`.
- Add `migrateV2toV3(state)` that updates library items and entries as described above.
- Update `migrate(parsed)` to detect the current version and run appropriate step(s). `v1 → v2 → v3` in sequence.
- Test: open the dev app with your existing localStorage data — it should migrate without losing any logged entries.

### 2. `src/lib/foodApi.js` — gram-mode for OFF and USDA

`mapOffProduct`:
- If per-serving data is present (`n['energy-kcal_serving'] != null || n.proteins_serving != null`), return `unit: 'serving'` and macros as today.
- Otherwise, return **per-gram** macros (divide the `_100g` values by 100) and `unit: 'gram'`, `servingDesc: '1 g'`. Round to 2 decimals for per-gram values via `numPerGram(v) = Math.round(Number(v) * 100) / 10000` — but don't lose precision below useful levels. Actually simpler: store per-100g values as-is but mark `unit: 'gram_100'`. Then at display/scale time, divide by 100. But this adds a third unit. **Stick with two units.** Store per-gram values rounded to 4 decimals: `Math.round(Number(v) * 10000) / 10000`. That gives milligram precision.

`mapUsdaFood`:
- USDA SR Legacy / Foundation is per-100g. Convert to per-gram, `unit: 'gram'`.
- USDA Branded is per-serving. Keep as `unit: 'serving'`.

### 3. `src/components/FoodEntrySheet.jsx`

**Draft shape**: add `unit` field propagated from the picked food.

**Edit stage** (currently lines 220–304):
- Replace the single "Servings" control with a conditional control:
  - `unit === 'serving'` → current ±0.25 stepper, default 1.
  - `unit === 'gram'` → ±5g stepper, default 100. Input placeholder "165". Label reads "Grams." Show "0g" state gracefully.
- Rename `servings` state variable to `amount`.
- Metric display (cal/P/C/F preview): `Math.round(draft.cal * amount)` stays correct because cal is per-unit.

**Confirm add** (`handleConfirmAdd`):
- Entry gets `{ amount, unit }` instead of `{ servings }`.
- Library save: preserve the unit — `onSaveToLibrary({ name, cal, p, c, f, unit, servingDesc, barcode })`.

**Manual tab** (currently lines 468–524):
- Add a unit segmented toggle above the fields: `[Per serving] [Per gram]`.
- When `per gram` is selected:
  - Hide the "Serving" (servingDesc) input, force `servingDesc: '1 g'`.
  - Cal/P/C/F input placeholders read as per-gram values ("1.65" instead of "165") — use step="0.01" and inputMode="decimal".
  - Show a subtle helper: "Enter per-gram values (e.g. chicken breast: 1.65 cal/g, 0.31 P/g)."
- When `per serving` is selected, behave as today.

### 4. `src/lib/foodHelpers.js`

`sumEntries` — rename `servings` to `amount`, default 1:

```js
export const sumEntries = (entries = []) =>
  entries.reduce(
    (acc, e) => {
      const a = Number(e.amount ?? e.servings) || 1;  // fallback for any pre-migration data that slipped through
      acc.cal += (Number(e.cal) || 0) * a;
      acc.p += (Number(e.p) || 0) * a;
      acc.c += (Number(e.c) || 0) * a;
      acc.f += (Number(e.f) || 0) * a;
      return acc;
    },
    { cal: 0, p: 0, c: 0, f: 0 }
  );
```

### 5. `src/screens/FoodScreen.jsx`

Entry display (lines 374–403):
- Rename `const s = Number(e.servings) || 1` to `const a = Number(e.amount ?? e.servings) || 1`.
- Update the label line (line 384) to render unit-aware text:
  - `unit === 'gram'`: `${a}g` (e.g. "165g")
  - `unit === 'serving'` and `a === 1`: `e.servingDesc` (e.g. "1 cup")
  - `unit === 'serving'` and `a !== 1`: `${a} × ${e.servingDesc}` (current behavior)

### 6. Library list rendering (`FoodEntrySheet.jsx`, lines 351–374)

For gram-unit library items, display `per g` next to the kcal number. For serving-unit items, display current serving description. Keep the UI tight.

## Visual acceptance

Match Kintsugi style exactly. Key rules:

- Unit toggle in Manual tab: segmented control, same styling as the phase toggle in `FoodScreen.jsx:253-268`.
- Gram input: same visual as serving stepper, but with `5` as the increment label if you show it. Font-mono tabular-nums. Placeholder "100" in stone color.
- No new colors, no new fonts, no new animations.

## Test plan (manual — run before writing handoff)

1. `npm run dev`. No console errors. App loads.
2. Open DevTools → Application → LocalStorage → inspect `comeback-tracker-v1` key. `schemaVersion` is `3`. Existing entries have `amount` and `unit` fields. Existing library items have `unit: 'serving'`.
3. Go to Food tab → Add food on Breakfast → Search "chicken breast" (USDA key helps but OFF also has it).
4. If a per-100g result comes back: confirm Edit stage shows a Grams input. Enter 165. Confirm the cal/P/C/F preview scales correctly. Add to breakfast. Confirm the entry card shows "165g · chicken breast" and the calorie value is roughly 165 × (cal-per-gram).
5. Search again, pick a per-serving result (branded item with serving size). Confirm it still shows the Servings stepper. Behavior unchanged.
6. Manual tab → toggle to "Per gram" → enter name "butter", cal 7.17, P 0.08, C 0.06, F 0.81 → save to library → log 15g → confirm 107 cal / 12g F added. (Real butter: 717cal/100g → 7.17/g. 15g → 107.5cal.)
7. Logs from before migration: verify their totals haven't changed.
8. `npm run build:andrew` succeeds with no errors or warnings.

## Out of scope for this phase

- Restaurant tab (phase 3)
- Portion chips (phase 4)
- AI paste entry (phase 2)
- Meal templates (phase 5)
- Changing the storage key from `comeback-tracker-v1`
- Removing the `servings` fallback in `sumEntries` — keep it for safety.
- Barcode scanner changes — barcodes always come back as serving-unit via OFF's barcode lookup.

## Handoff artifact

When the phase is complete, write `docs/food-upgrade/PHASE-1-COMPLETE.md` with:

```markdown
# Phase 1 complete — gram entry

## Schema
- Bumped to v3. Migration function: `migrateV2toV3` in `src/hooks/usePersistedState.js:NN`.
- Library items now have `unit: 'serving' | 'gram'`. All legacy items default to `'serving'`.
- Entries use `amount` + `unit`. Legacy entries migrated via the function above.

## Files changed
- src/hooks/usePersistedState.js — migration + SCHEMA_VERSION
- src/lib/foodApi.js — mapOffProduct / mapUsdaFood return unit field
- src/lib/foodHelpers.js — sumEntries uses amount
- src/components/FoodEntrySheet.jsx — unit-aware Edit stage + Manual tab toggle
- src/screens/FoodScreen.jsx — unit-aware entry display

## Test results
[did the Test Plan pass? list any items that didn't]

## Deferred / gotchas
[anything surprising you ran into]

## Next phase
Phase 2 (AI paste) now unblocked.
```
