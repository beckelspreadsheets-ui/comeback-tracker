# Food Tracker — Accuracy Upgrade Roadmap

This folder contains 5 self-contained phase briefs that upgrade the food tracker from "tier 4 built" to "genuinely accurate." Each phase is meant to be executed in a **fresh Claude session** with no prior context — read the brief, do the work, verify, write a handoff file, and stop.

---

## Why this exists

The current food tracker works but has real accuracy holes:

1. **OpenFoodFacts per-100g foods are logged as "1 serving = 100g"**, forcing the user to do mental math every time they eat something that isn't exactly 100g.
2. **Restaurants have no first-class path** — you're manually entering macros or guessing against generic library items.
3. **Cooked sides (veggies, rice, mashed potato)** can't be weighed post-cook, so there's no good workflow for them.
4. **Repeat meals** (the same Chipotle bowl 3×/week) require re-logging every item.
5. **On-the-go estimation** (no scale, no menu) is a dead zone.

We're not adding an in-app LLM. Reason: the user already pays for ChatGPT/Claude subscriptions and will use those out-of-band for the rare non-chain meal. In-app inference would mean new API keys, proxy infra, and ongoing cost for a job the user's existing tools already do fine.

## The 5 phases

| # | Phase | Delivers | Depends on |
|---|-------|----------|------------|
| 1 | [Gram entry](./PHASE-1-GRAM-ENTRY.md) | Unit-aware library items & entries. OFF per-100g foods become first-class. | — |
| 2 | [AI paste](./PHASE-2-AI-PASTE.md) | Paste-to-parse in Manual tab. Bring-your-own-model estimation. | Phase 1 |
| 3 | [Restaurants](./PHASE-3-RESTAURANTS.md) | Nutritionix chain menu tab. Exact published macros for ~900 chains. | Phase 1 |
| 4 | [Portion chips](./PHASE-4-PORTION-CHIPS.md) | Tap-to-fill visual portion presets (palm / fist / cup / thumb). | Phase 1 |
| 5 | [Meal templates](./PHASE-5-MEAL-TEMPLATES.md) | One-tap log for repeat meals (your usual Chipotle bowl). | Phase 1 |

Phases 2–5 each depend on Phase 1's schema change. Execute in order.

---

## Expected accuracy after all 5 phases

| Scenario | Approach | Expected error |
|---|---|---|
| Home meal (can weigh raw) | Gram entry + library | ±5% |
| Chain restaurant | Restaurant tab (Nutritionix) | ±5% (published data) |
| Repeat order | Meal template one-tap | Same as first-log accuracy |
| Non-chain restaurant | Paste from ChatGPT/Claude + photo | ±15–20% (physical floor) |
| Cooked side at home | Portion chips (palm/fist/cup) | ±15% |

Weighing raw is the ceiling. The 5 phases systematically collapse the gap to that ceiling wherever weighing is impossible.

---

## Execution model — **not cron**

These are one-shot sequential phases, not recurring work. Cron is the wrong fit.

**Recommended loop:**

```
for phase in PHASE-1 PHASE-2 PHASE-3 PHASE-4 PHASE-5:
  1. Open a fresh Claude session.
  2. Prompt: "Read docs/food-upgrade/<phase>.md and execute it."
  3. Agent reads the brief + any prior PHASE-N-COMPLETE.md handoff files.
  4. Agent does the work, writes PHASE-N-COMPLETE.md summary, stops.
  5. YOU: run `npm run dev`, verify the new feature works as described in the brief's Test Plan.
  6. YOU: commit the changes. `git add . && git commit -m "food upgrade phase N"`.
  7. Move to next phase.
```

Why human-in-the-loop between phases:
- Each phase produces visual UI changes that need a real browser to verify.
- A broken phase N shouldn't silently poison phase N+1.
- Schema migrations (phases 1 and 5) touch localStorage — if they're wrong, you want to know before piling more changes on top.

### If you want unattended execution

You can chain them with the CLI, but this is higher risk for a UI project:

```bash
for n in 1 2 3 4 5; do
  claude -p --permission-mode acceptEdits \
    "Read docs/food-upgrade/PHASE-${n}-*.md and execute it. Write docs/food-upgrade/PHASE-${n}-COMPLETE.md when done."
  [ $? -ne 0 ] && break
done
```

Don't use this for the first pass. Do it only after you've already run all 5 manually once and know the briefs are clean.

---

## Fresh-context handoff protocol

Each phase brief ends with a **Handoff artifact** section. At the end of the phase, the agent writes `PHASE-N-COMPLETE.md` in this folder with:

- What was built (bullet list of concrete changes)
- Files changed (with line-number anchors for key pieces)
- Schema version after the phase
- Any surprises, deferred TODOs, or gotchas
- Test results (did the Test Plan pass locally)

The next phase's agent reads **all prior** `PHASE-*-COMPLETE.md` files at the start of its work. That's how fresh context stays coherent across phases without you manually re-explaining state.

---

## State of the codebase (snapshot for fresh agents)

All paths relative to `/Users/andrewferguson/Downloads/comeback-tracker`.

Current schema version: **2** (see `src/hooks/usePersistedState.js:5`).

Key food files:

- `src/lib/program.js` — `DEFAULT_FOOD` (line 46), `USER_PRESETS` (line 6)
- `src/lib/foodApi.js` — OFF + USDA search, `mapOffProduct`, `mapUsdaFood`
- `src/lib/foodHelpers.js` — `sumEntries`, `sumDay`, `weekSeries`, `MEAL_BUCKETS`
- `src/lib/nutrition.js` — BMR / TDEE / `calcTargets`, `PHASES`
- `src/components/FoodEntrySheet.jsx` — 4-tab bottom-sheet entry (Library / Search / Scan / Manual)
- `src/components/BarcodeScanner.jsx` — camera overlay, BarcodeDetector + @zxing/browser fallback
- `src/screens/FoodScreen.jsx` — the Food tab
- `src/screens/MetricsScreen.jsx` — hosts the 12-week protein compliance bar chart
- `src/hooks/usePersistedState.js` — localStorage, migration function, SCHEMA_VERSION

Design system (read before touching UI):

- Dark ink (#0b0b0e) ground, gold leaf (#d4af37) primary accent, bone text, stone secondary
- Pine green for positive deltas, vermillion for negative
- 10px mono uppercase eyebrows with `tracking-[0.22em]`
- JetBrains Mono for all numbers (`font-mono tabular-nums`)
- 44px min tap targets, 16px input font size (iOS zoom avoidance)
- Custom Tailwind palette in `tailwind.config.js`
- When adding dynamic color classes, add them to the safelist

Don't touch:

- `scripts/setup-cloudflare.sh`, `wrangler.toml`, `public/_headers`, `public/_redirects`
- The build/deploy scripts in `package.json`
- `src/lib/utils.js` Epley math and calibration data

---

## Status

- [ ] Phase 1 — gram entry
- [ ] Phase 2 — AI paste
- [ ] Phase 3 — restaurants
- [ ] Phase 4 — portion chips
- [ ] Phase 5 — meal templates

Check boxes as phases land.
