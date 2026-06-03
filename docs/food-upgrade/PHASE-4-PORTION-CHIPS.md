# Phase 4 — Visual portion chips

**Schema bump:** none
**Depends on:** Phase 1 complete (uses gram-unit mode from phase 1)
**Estimated effort:** small — static data + one UI strip

---

## Goal

Cooked veggies and sides can't be weighed post-cook. Restaurant plates can't be weighed. On-the-go, there's no scale. This phase adds a set of **tap-to-fill portion chips** that translate common visual estimates ("palm of protein," "fist of rice," "cup of cooked veg") into gram amounts and macro profiles.

The chips are a Manual-tab accelerator. Tap a chip → Manual fields fill with that chip's defaults → user adjusts if needed → Continue to Edit stage → log. They don't replace the Search or Restaurant flows — they're the fallback when nothing else applies.

## Orientation

1. `docs/food-upgrade/ROADMAP.md`
2. `docs/food-upgrade/PHASE-1-COMPLETE.md` — unit-aware entry model. Chips take advantage of gram mode where it makes sense.
3. `src/components/FoodEntrySheet.jsx` — the Manual tab layout after phases 1 and 2. You're adding a chip strip at the top.

## Chip library

New file: `src/lib/portionChips.js`. Data only — no side effects.

```js
// Each chip is a visual estimate → grams → macros (per-unit, respecting the phase 1 unit field).
// Numbers sourced from USDA FDC averages, rounded to whole numbers.
export const PORTION_CHIPS = [
  // PROTEIN (palm-based)
  {
    id: 'palm-lean',
    label: 'Palm — lean protein',
    category: 'protein',
    example: 'chicken breast, tilapia, tuna',
    name: 'Lean protein (palm)',
    unit: 'serving',
    servingDesc: '1 palm (≈ 4 oz / 115 g)',
    cal: 185,
    p: 35,
    c: 0,
    f: 4,
  },
  {
    id: 'palm-medium',
    label: 'Palm — medium protein',
    category: 'protein',
    example: 'sirloin, 90/10 beef, pork loin',
    name: 'Medium protein (palm)',
    unit: 'serving',
    servingDesc: '1 palm (≈ 4 oz / 115 g)',
    cal: 220,
    p: 30,
    c: 0,
    f: 10,
  },
  {
    id: 'palm-fatty',
    label: 'Palm — fatty protein',
    category: 'protein',
    example: 'salmon, ribeye, 80/20 beef',
    name: 'Fatty protein (palm)',
    unit: 'serving',
    servingDesc: '1 palm (≈ 4 oz / 115 g)',
    cal: 275,
    p: 25,
    c: 0,
    f: 18,
  },
  {
    id: 'egg',
    label: '1 egg',
    category: 'protein',
    example: 'large whole egg',
    name: 'Egg, large',
    unit: 'serving',
    servingDesc: '1 large',
    cal: 72,
    p: 6,
    c: 0,
    f: 5,
  },

  // STARCHES (fist-based, cooked)
  {
    id: 'fist-rice',
    label: 'Fist — rice cooked',
    category: 'starch',
    example: 'white or brown, cooked',
    name: 'Rice, cooked (fist)',
    unit: 'serving',
    servingDesc: '1 cup cooked (≈ 200 g)',
    cal: 260,
    p: 5,
    c: 56,
    f: 1,
  },
  {
    id: 'fist-pasta',
    label: 'Fist — pasta cooked',
    category: 'starch',
    example: 'any shape, cooked',
    name: 'Pasta, cooked (fist)',
    unit: 'serving',
    servingDesc: '1 cup cooked (≈ 140 g)',
    cal: 220,
    p: 8,
    c: 43,
    f: 1,
  },
  {
    id: 'fist-potato',
    label: 'Fist — mashed potato',
    category: 'starch',
    example: 'with butter + milk, restaurant style',
    name: 'Mashed potato (fist)',
    unit: 'serving',
    servingDesc: '1 cup (≈ 210 g)',
    cal: 240,
    p: 4,
    c: 36,
    f: 9,
  },
  {
    id: 'fist-roasted-potato',
    label: 'Fist — roasted potato',
    category: 'starch',
    example: 'with a bit of oil',
    name: 'Roasted potato (fist)',
    unit: 'serving',
    servingDesc: '1 cup (≈ 150 g)',
    cal: 195,
    p: 4,
    c: 30,
    f: 7,
  },
  {
    id: 'slice-bread',
    label: '1 slice bread',
    category: 'starch',
    example: 'medium slice',
    name: 'Bread, slice',
    unit: 'serving',
    servingDesc: '1 slice',
    cal: 80,
    p: 3,
    c: 15,
    f: 1,
  },

  // VEG (cup-based, cooked)
  {
    id: 'cup-veg-nonstarch',
    label: '1 cup — cooked veg',
    category: 'veg',
    example: 'broccoli, green beans, zucchini',
    name: 'Cooked veg, non-starch (cup)',
    unit: 'serving',
    servingDesc: '1 cup cooked',
    cal: 35,
    p: 3,
    c: 7,
    f: 0,
  },
  {
    id: 'cup-leafy',
    label: '1 cup — leafy greens',
    category: 'veg',
    example: 'spinach/kale cooked, or 2 cups raw',
    name: 'Leafy greens (cup cooked)',
    unit: 'serving',
    servingDesc: '1 cup cooked',
    cal: 45,
    p: 5,
    c: 8,
    f: 1,
  },
  {
    id: 'cup-salad',
    label: '2 cups — side salad',
    category: 'veg',
    example: 'mixed greens, no dressing',
    name: 'Side salad, undressed',
    unit: 'serving',
    servingDesc: '2 cups',
    cal: 20,
    p: 2,
    c: 4,
    f: 0,
  },

  // FATS (thumb-based)
  {
    id: 'thumb-oil',
    label: 'Thumb — added oil',
    category: 'fat',
    example: 'olive oil, cooking fat',
    name: 'Oil, added (thumb)',
    unit: 'serving',
    servingDesc: '1 tbsp (≈ 14 g)',
    cal: 120,
    p: 0,
    c: 0,
    f: 14,
  },
  {
    id: 'thumb-butter',
    label: 'Thumb — butter',
    category: 'fat',
    example: 'salted butter',
    name: 'Butter (thumb)',
    unit: 'serving',
    servingDesc: '1 tbsp (≈ 14 g)',
    cal: 100,
    p: 0,
    c: 0,
    f: 11,
  },
  {
    id: 'handful-nuts',
    label: 'Handful — mixed nuts',
    category: 'fat',
    example: 'almonds / cashews / peanuts',
    name: 'Mixed nuts (handful)',
    unit: 'serving',
    servingDesc: '≈ 1 oz / 28 g',
    cal: 175,
    p: 5,
    c: 6,
    f: 15,
  },
  {
    id: 'thumb-dressing',
    label: 'Thumb — salad dressing',
    category: 'fat',
    example: 'vinaigrette / ranch average',
    name: 'Salad dressing (thumb)',
    unit: 'serving',
    servingDesc: '1 tbsp',
    cal: 75,
    p: 0,
    c: 2,
    f: 7,
  },
];

export const CHIP_CATEGORIES = [
  { key: 'protein', label: 'Protein' },
  { key: 'starch', label: 'Starch' },
  { key: 'veg', label: 'Veg' },
  { key: 'fat', label: 'Fat' },
];
```

All chips are `unit: 'serving'` — they're estimations, not weighed. Phase 1's gram mode is for known-weight foods; chips are for the opposite case.

## Work items

### 1. `src/lib/portionChips.js` (new)

As above.

### 2. `src/components/FoodEntrySheet.jsx` — chip strip in Manual tab

Place the strip **between** the phase-2 "Paste from AI" block and the Name input. It's a quick-fill accelerator — prominent but not overwhelming.

```jsx
<div className="border border-bone/[0.06]">
  <div className="px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.22em] text-gold border-b border-bone/[0.06]">
    Quick portions
  </div>
  <div className="p-3 space-y-3">
    {CHIP_CATEGORIES.map((cat) => {
      const chips = PORTION_CHIPS.filter((c) => c.category === cat.key);
      return (
        <div key={cat.key}>
          <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-stone mb-1.5">
            {cat.label}
          </div>
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
            {chips.map((chip) => (
              <button
                key={chip.id}
                onClick={() => applyChip(chip)}
                className="shrink-0 px-3 py-2 border border-bone/10 text-bone/80 text-[11px] font-mono whitespace-nowrap hover:border-gold/40 active:scale-[0.97]"
                title={chip.example}
              >
                {chip.label}
                <span className="ml-1.5 text-gold tabular-nums">{chip.cal}</span>
              </button>
            ))}
          </div>
        </div>
      );
    })}
  </div>
</div>
```

### 3. `applyChip` handler

```js
const applyChip = (chip) => {
  setManual({
    name: chip.name,
    cal: String(chip.cal),
    p: String(chip.p),
    c: String(chip.c),
    f: String(chip.f),
    servingDesc: chip.servingDesc,
  });
  // If phase 1 added a unit toggle to Manual, reset it to 'serving'.
};
```

### 4. Scroll behavior (mobile)

The chip rows scroll horizontally. Set `overflow-x-auto` + `scrollbar-none`. Add a tiny scroll hint if needed — a right-side fade gradient — but keep it minimal. First-time users should be able to see at least 3 chips per row without scrolling on a 375px-wide screen.

Add this utility to `src/index.css` if not already present:

```css
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
```

### 5. Optional — a "1 cup restaurant rice" chip variant

Restaurants tend to serve larger portions than home. Consider adding 1.5x variants for a couple of common items:

- `rest-fist-rice`: "Rest. fist — rice" → 300g, 390cal
- `rest-fist-pasta`: "Rest. fist — pasta" → 200g, 315cal

Only add if the main list still reads cleanly. Skip if it's cluttering.

## Visual acceptance

- The strip feels tight, not busy. Categories are stacked vertically, chips scroll horizontally inside each row.
- Each chip shows: label + calorie count in gold. Example foods surface on long-press / title tooltip (desktop) but aren't visible by default.
- Tap feedback: chip briefly scales, manual form fills below. No modal, no transition.
- Works inside the existing bottom-sheet layout — don't introduce scroll issues.

## Test plan

1. Open Add food → Manual. Chip strip visible above Name input.
2. Tap "Palm — lean protein" → Name/cal/P/C/F fill with 185/35/0/4. Click Continue → Edit stage → add to Dinner.
3. Tap "Fist — rice cooked" → fields fill → save to library → verify it appears in Library tab and re-logs with same numbers.
4. Horizontal scroll works smoothly on mobile viewport (Chrome DevTools device emulation, 375px wide).
5. No visual overflow on narrow screens.
6. After tapping a chip, I can edit any field (e.g. change cal from 185 to 200) before confirming.
7. `npm run build:andrew` succeeds. Chip data is statically bundled (no runtime fetch).

## Out of scope

- Per-user custom chips.
- Chip editing UI.
- Chip → gram-mode conversion (current chips are all serving-unit; if a user wants gram precision they'll use OFF/USDA search).
- Photo of hand/palm for visual reference.
- Regional variants (e.g. European portion norms).
- Localization.

## Handoff artifact

`docs/food-upgrade/PHASE-4-COMPLETE.md`:

```markdown
# Phase 4 complete — portion chips

## What shipped
- `src/lib/portionChips.js` — PORTION_CHIPS, CHIP_CATEGORIES
- Quick portions strip at the top of the Manual tab (above Name, below Paste from AI)
- 4 categories: Protein / Starch / Veg / Fat
- 17 chips total (adjust final count here)

## Test results
[pass/fail]

## Deferred / gotchas
[anything]

## Next phase
Phase 5 (meal templates) now unblocked.
```
