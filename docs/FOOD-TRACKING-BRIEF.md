# Food Tracking Feature — Build Brief

Hand this file (or the prompt below) to a fresh agent session. It's self-contained.

---

## Prompt (copy-paste into new session)

I'm adding a full food/calorie/macro tracking feature to my personal training PWA. This is a **Tier 4 build** — the most ambitious version — with phase-aware targets, barcode scanning, online food DB, and macro compliance charts.

### Where you are

**Location:** `/Users/andrewferguson/Downloads/comeback-tracker`

**Stack:** React 18, Vite 5, Tailwind 3, Recharts, lucide-react, vite-plugin-pwa, workbox-window. Zero backend. localStorage persistence only. Data is portable via JSON export/import (Export/Import icons in the header of `src/App.jsx`).

**Current state of the app** (read these before doing anything):
- `src/App.jsx` — root, tab nav, header, export/import wiring
- `src/hooks/usePersistedState.js` — localStorage-backed state. Key: `comeback-tracker-v1`. Schema version 1. Debounced writes.
- `src/lib/program.js` — 7-day training program, 24 lifts, calibration percentages, joint decision data, **`USER_PRESETS`** object keyed by user. `DEFAULT_SETTINGS` is selected at build time via `VITE_USER_PRESET=andrew|alexander` env var.
- `src/lib/utils.js` — Epley formula, phase/deload logic, target weight calc, `typeColors` palette
- `src/screens/NutritionScreen.jsx` — **you are replacing this.** Currently a pure calculator: computes BMR (Mifflin-St Jeor), TDEE (BMR × activity multiplier), and macros from the user's body weight in `state.settings`. Read it to understand the existing math — you'll reuse it.
- `src/screens/MetricsScreen.jsx` — weekly body weight / waist / arm / thigh logger + charts. Has been restyled with a "Kintsugi" aesthetic (black ink, kintsugi-gold accents, custom Tailwind colors: `bone`, `stone`, `gold`, `pine`, `vermillion`). **Match this aesthetic in your work.**
- `src/components/primitives.jsx` — `Card`, `SectionTitle`, `NumInput`, `Pill`. Reuse these.
- `tailwind.config.js` — custom color palette (bone, stone, gold, pine, vermillion, ink). Fonts: Archivo (display), Inter Tight (body), JetBrains Mono (numbers).

**Design language (non-negotiable — match it):**
- Dark-first: black `#0a0a0a` / `ink` backgrounds
- `gold` (#d4af37) = primary accent (Kintsugi)
- `bone` = primary text, `stone` = secondary text
- `pine` (green) = positive delta, `vermillion` (red) = negative delta
- 10px mono uppercase eyebrow labels with `tracking-[0.22em]`
- `font-mono tabular-nums` for all numeric values
- Subtle borders (`border-bone/[0.08]`), low-opacity dividers
- Touch-optimized: min 44px tap targets, 16px inputs (iOS zoom avoidance), safe-area aware

**Deployment** (do NOT mess with this — it already works):
- Two Cloudflare Pages projects: `comeback-andrew`, `comeback-alexander`
- Custom domains: `comeback-<name>.evenpathhomes.com`, Zero Trust gated
- Deploy commands (already in `package.json`):
  - `npm run deploy:andrew` → builds with `VITE_USER_PRESET=andrew` → deploys to comeback-andrew
  - `npm run deploy:alexander` → same for Alexander
- The setup script at `scripts/setup-cloudflare.sh` is infra — don't touch

---

### What to build (LOCKED scope)

A full food tracker. All decisions below are final — do not negotiate them down:

#### 1. **Replace the Nutrition tab**
- Rename the tab label from "Nutrition" to **"Food"**
- Rename `src/screens/NutritionScreen.jsx` → `src/screens/FoodScreen.jsx`
- Preserve the BMR/TDEE/macro calculator math but move it into a **collapsible "Targets" card** at the top of the new Food screen
- The rest of the screen is the food log

#### 2. **Track per food entry**
- Name (string)
- Calories (kcal)
- Protein (g)
- Carbs (g)
- Fat (g)
- Serving description (free text, e.g. "1 cup" or "4oz")
- Optional: barcode (for re-scan)

#### 3. **Phase-aware targets**
Build a `phase` concept with three states: **cut / maintain / bulk**.
- UI: toggle (segmented control) at the top of the Targets card
- Each phase has a configurable calorie offset: defaults cut=-500, maintain=0, bulk=+250 (user-editable in Targets card)
- Daily calorie target = TDEE (existing calc) + offset
- Daily protein target = `proteinPerLb` × current BW (user-configurable, default 1.0 g/lb)
- Carb + fat targets: split remaining calories after protein. Default: fat = 0.4 g/lb BW × 9 cal/g, carbs = remainder ÷ 4. All configurable.
- Persist phase + offsets in state.

#### 4. **Daily log with meal buckets**
Four buckets: Breakfast, Lunch, Dinner, Snacks (use lucide icons and/or emojis — match Kintsugi restraint).
- Tapping "+ add" on a meal bucket opens an entry flow (see section 5)
- Show per-meal subtotal (cals + protein) and daily running total
- Show progress bars toward daily targets (cals, protein, carbs, fat)
- Color: bars fill with `gold`; overshoot by >5% switches to `vermillion`
- Swipe-to-delete or long-press-to-delete on entries
- Date navigator at top: ◀ [ Mon Apr 21 ] ▶ — browse historical days

#### 5. **Food entry: three paths**
All three must work. Entry UI is a bottom sheet or modal.

**Path A — Custom library (primary)**
- Persistent user library of saved foods
- Search/filter by name, sort by most-recently-logged
- Tap → adjust servings → add to meal
- "Save to library" checkbox when manually entering a new food
- Library lives in state (localStorage) and survives export/import

**Path B — Online DB search**
- Provider: **OpenFoodFacts** (free, no API key, public). Endpoint: `https://world.openfoodfacts.org/api/v2/search?search_terms={q}&fields=product_name,nutriments,code&page_size=20`
- Secondary provider for branded/fresh: **USDA FoodData Central**. Requires a free API key (https://fdc.nal.usda.gov/api-key-signup.html). Store key via `VITE_USDA_API_KEY` env var, falls back to OpenFoodFacts-only if missing.
- Debounce search 300ms. Show loading state. Handle offline gracefully (disable search, show "offline — use library or manual entry").
- Tap result → pre-fill the entry form → user can adjust serving → save.

**Path C — Barcode scanner**
- Use `BarcodeDetector` API where available (Chrome/Android). Fall back to `@zxing/browser` (add as dep) for Safari/iOS.
- Open camera modal, scan UPC/EAN, lookup via `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
- On success: pre-fill entry form.
- On failure: "Not found — add manually?"
- Ensure camera permission request is polite (explain why in a pre-prompt dialog).

**Path D — Manual entry (always available)**
- Five fields: name, cal, p, c, f (all tabular mono inputs matching existing `NumInput` style)
- "Save to library" checkbox
- Submit adds to current meal bucket

#### 6. **Weekly aggregates**
On the Food screen below today's log:
- "Week average" card: avg daily cals + macro compliance rate (% of days within ±10% of target)
- "Week chart": small line chart of daily cals over the past 7 days, `gold` line, with a dashed target reference
- Use `Recharts` (already in deps)

#### 7. **Macro compliance chart on Metrics**
Extend `src/screens/MetricsScreen.jsx`:
- Add a new chart card below existing charts: "Macro compliance — 12 week"
- X-axis: weeks (reuses `W1`..`Wn` labels from metrics rows)
- Y-axis: % of days hitting protein target
- Bar chart, `pine` bars, with a reference line at 80% (compliance target)

#### 8. **State shape (NEW — bump schema to v2)**
Extend state in `usePersistedState.js`:

```js
food: {
  targets: {
    phase: 'cut',                    // 'cut' | 'maintain' | 'bulk'
    offsets: { cut: -500, maintain: 0, bulk: 250 },
    proteinPerLb: 1.0,
    fatGPerLb: 0.4,
  },
  library: [
    // { id, name, cal, p, c, f, fiber?, servingDesc, barcode?, lastUsedAt, usageCount }
  ],
  log: {
    '2026-04-21': {
      breakfast: [{ itemId?, name, cal, p, c, f, servings, at }],
      lunch: [...],
      dinner: [...],
      snacks: [...],
    },
    // ... more dates
  },
}
```

Write a schema migration from v1 → v2 that initializes the `food` branch without touching anything else. Must be safe for users who already have saved BW logs.

#### 9. **Offline behavior**
- All core features (manual entry, library, log viewing, targets, meal buckets, weekly agg, compliance chart) must work 100% offline
- Online DB search and barcode lookup require network — show a clean offline state when unavailable
- Service worker (vite-plugin-pwa) must cache the app shell as before. Don't break the PWA install flow.

#### 10. **Per-user defaults (via preset system)**
Extend `USER_PRESETS` in `src/lib/program.js`:
- Each preset gets an optional `food` subtree with `targets` defaults
- Andrew's preset: `phase: 'cut', proteinPerLb: 1.0` (he's in a recomp-via-cut-first phase)
- Alexander's preset: `phase: 'maintain'` (placeholder)

### Acceptance criteria

1. `npm run dev` runs clean, no console errors
2. `npm run build:andrew` and `npm run build:alexander` both succeed
3. Exporting state (header ⬇️) produces JSON that includes the new `food` branch; importing it round-trips correctly
4. All four entry paths work: library, OFF search, barcode scan (on Chrome/Android at minimum), manual
5. Phase toggle actually changes the daily target
6. Weekly average + compliance chart render correctly with 7+ days of data
7. Visual style matches Kintsugi aesthetic (verify by comparing to MetricsScreen side-by-side)
8. Existing features (Home, Settings, Calibration, Day, Metrics, Joint) untouched and still work
9. Service worker regenerates and the PWA still installs

### Don't do

- Don't add a backend. Zero network I/O except the OFF/USDA fetches.
- Don't break the existing preset system.
- Don't change `scripts/setup-cloudflare.sh`, `wrangler.toml`, `public/_headers`, `public/_redirects`, or any deployment infra.
- Don't add heavyweight deps. Allowed new deps: `@zxing/browser` (barcode fallback). That's it.
- Don't modify `src/lib/utils.js` calibration/Epley math.
- Don't ask the user to "paste an API key in chat." Use `VITE_USDA_API_KEY` env var; if missing, app silently falls back to OFF-only.

### When done

1. Run `npm run deploy:andrew` to push the new version to Andrew's gated subdomain
2. Report back with:
   - The deployment URL
   - Any library/API gotchas you hit
   - A 3-sentence summary of what was built and any deferred TODOs

---
