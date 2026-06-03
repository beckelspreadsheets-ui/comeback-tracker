# Phase 5 — Meal templates (one-tap repeat meals)

**Schema bump:** v3 → v4
**Depends on:** Phase 1 complete (entry shape is finalized)
**Estimated effort:** medium — schema migration + new UI surface on FoodScreen

---

## Goal

Andrew rotates the same ~10 meals most of the month. Re-logging each component every time is friction. This phase lets him bundle a meal bucket's current contents into a named **template**, then one-tap that template into any future day's log.

Example: after logging today's breakfast (oats + berries + whey + coffee = 4 entries), tap "Save as template…" on the Breakfast card, name it "Usual oats bowl." Tomorrow, tap the template in the Templates section — all 4 entries are added to tomorrow's breakfast log with fresh `id` and `at` values.

## Orientation

1. `docs/food-upgrade/ROADMAP.md`
2. `docs/food-upgrade/PHASE-1-COMPLETE.md` — entry schema after phase 1
3. All prior `PHASE-N-COMPLETE.md` files — catch up on anything that affected the model
4. `src/hooks/usePersistedState.js` — migration pattern
5. `src/lib/program.js` — `DEFAULT_FOOD` shape
6. `src/screens/FoodScreen.jsx` — entry point for Save-as-template and Template log buttons
7. `src/components/FoodEntrySheet.jsx` — NOT modified in this phase (templates live on the FoodScreen, not the entry sheet)

## Data model

```js
food.templates: [
  {
    id: 't_xxxxx',
    name: 'Usual oats bowl',
    defaultMeal: 'breakfast',   // user can override at log time
    items: [
      // Copy of the entry shape minus id/at, unit-aware from phase 1
      { itemId?, name, cal, p, c, f, amount, unit, servingDesc, barcode? },
      // ... more items
    ],
    createdAt: 1718...,
    lastUsedAt: 1718...,
    usageCount: 0,
  },
]
```

### Migration v3 → v4

- `SCHEMA_VERSION = 4`.
- `migrateV3toV4(state)`: if `state.food.templates` is missing, initialize to `[]`.
- `DEFAULT_FOOD` in `src/lib/program.js` also gets `templates: []`.

## Work items

### 1. `src/hooks/usePersistedState.js`

- Bump `SCHEMA_VERSION` to 4.
- Add `migrateV3toV4` and chain it after `migrateV2toV3`.

### 2. `src/lib/program.js`

- `DEFAULT_FOOD`: add `templates: []`.

### 3. `src/screens/FoodScreen.jsx` — Save-as-template button per bucket

On each meal bucket card (lines 362–413), add a second action button beside "+ add food":

```jsx
<div className="flex border-t border-bone/[0.04]">
  <button
    onClick={() => openSheet(bucket.key)}
    className="flex-1 py-3 text-[10px] font-mono uppercase tracking-[0.22em] text-stone hover:text-gold flex items-center justify-center gap-1.5 active:scale-[0.99] min-h-[44px]"
  >
    <Plus size={12} /> Add food
  </button>
  {entries.length > 0 && (
    <button
      onClick={() => setSaveTemplateMeal(bucket.key)}
      className="px-4 py-3 border-l border-bone/[0.04] text-[10px] font-mono uppercase tracking-[0.22em] text-stone hover:text-gold active:scale-[0.99] min-h-[44px]"
      title="Save this bucket as a template"
    >
      <Bookmark size={12} />
    </button>
  )}
</div>
```

Only shows when there's at least one entry in the bucket.

### 4. `src/components/TemplateSaveModal.jsx` (new)

A simple modal (bottom sheet for consistency with FoodEntrySheet, but smaller). One input:

- Name (required)
- Shows preview: item count, total cal, total macros
- Save / Cancel

```jsx
export const TemplateSaveModal = ({ isOpen, meal, entries, onSave, onClose }) => {
  const [name, setName] = useState('');
  const totals = sumEntries(entries);

  useEffect(() => {
    if (isOpen) setName('');
  }, [isOpen]);

  if (!isOpen) return null;

  const canSave = name.trim().length >= 2;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-ink border-t border-gold/20 p-5 space-y-4 safe-bottom">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-gold">
          Save {meal} as template
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name this template (e.g. Usual oats bowl)"
          className="w-full bg-ink/60 border border-bone/[0.08] px-4 py-3 text-bone text-base focus:border-gold/60 focus:outline-none"
        />
        <div className="grid grid-cols-4 gap-1 border border-bone/[0.06]">
          {[
            { label: 'Items', v: entries.length },
            { label: 'Cal', v: Math.round(totals.cal) },
            { label: 'P', v: Math.round(totals.p) + 'g' },
            { label: 'C', v: Math.round(totals.c) + 'g' },
          ].map((m) => (
            <div key={m.label} className="p-3 text-center border-r border-bone/[0.06] last:border-0">
              <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-stone">{m.label}</div>
              <div className="font-mono tabular-nums text-bone mt-1.5 text-sm">{m.v}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-bone/15 text-bone/80 font-mono text-[11px] uppercase tracking-[0.22em]"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(name.trim(), meal, entries)}
            disabled={!canSave}
            className="flex-[2] py-3 bg-gold text-ink font-mono text-[11px] uppercase tracking-[0.22em] disabled:opacity-40"
          >
            Save template
          </button>
        </div>
      </div>
    </>
  );
};
```

### 5. Templates section on FoodScreen

Add a new Card section **above** the meal buckets but **below** the progress bars:

```jsx
{food.templates.length > 0 && (
  <Card className="p-0 overflow-hidden">
    <button
      onClick={() => setTemplatesOpen((o) => !o)}
      className="w-full flex items-baseline justify-between px-4 py-3 active:bg-bone/[0.02]"
    >
      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-gold">
        Templates · {food.templates.length}
      </div>
      {templatesOpen ? <ChevronUp size={14} className="text-stone" /> : <ChevronDown size={14} className="text-stone" />}
    </button>
    {templatesOpen && (
      <div className="divide-y divide-bone/[0.04] border-t border-bone/[0.06]">
        {[...food.templates].sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0)).map((tpl) => {
          const totals = sumEntries(tpl.items);
          return (
            <div key={tpl.id} className="flex items-stretch">
              <button
                onClick={() => logTemplate(tpl)}
                className="flex-1 text-left px-4 py-3 active:bg-bone/[0.02]"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-display text-base text-bone leading-tight truncate">{tpl.name}</div>
                  <div className="font-mono text-xs text-gold tabular-nums shrink-0">
                    {Math.round(totals.cal)} kcal
                  </div>
                </div>
                <div className="text-[10px] font-mono text-stone mt-0.5">
                  {tpl.items.length} items · → {tpl.defaultMeal}
                </div>
              </button>
              <button
                onClick={() => deleteTemplate(tpl.id)}
                className="w-10 flex items-center justify-center text-stone/60 hover:text-vermillion active:scale-90"
                aria-label="Delete template"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    )}
  </Card>
)}
```

### 6. Template handlers in FoodScreen

```js
const [saveTemplateMeal, setSaveTemplateMeal] = useState(null);
const [templatesOpen, setTemplatesOpen] = useState(false);

const saveTemplate = (name, meal, entries) => {
  updateFood((f) => ({
    ...f,
    templates: [
      ...f.templates,
      {
        id: `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        defaultMeal: meal,
        items: entries.map((e) => ({
          itemId: e.itemId,
          name: e.name,
          cal: e.cal,
          p: e.p,
          c: e.c,
          f: e.f,
          amount: e.amount ?? e.servings ?? 1,
          unit: e.unit || 'serving',
          servingDesc: e.servingDesc,
          barcode: e.barcode,
        })),
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        usageCount: 0,
      },
    ],
  }));
  setSaveTemplateMeal(null);
};

const logTemplate = (tpl) => {
  const now = Date.now();
  updateFood((f) => {
    const existing = f.log[date] || { breakfast: [], lunch: [], dinner: [], snacks: [] };
    const meal = tpl.defaultMeal;
    const newEntries = tpl.items.map((it, i) => ({
      id: makeEntryId(),
      itemId: it.itemId,
      name: it.name,
      cal: it.cal,
      p: it.p,
      c: it.c,
      f: it.f,
      amount: it.amount,
      unit: it.unit,
      servingDesc: it.servingDesc,
      at: now + i, // offset by index so order is preserved
      barcode: it.barcode,
    }));
    return {
      ...f,
      templates: f.templates.map((t) =>
        t.id === tpl.id ? { ...t, lastUsedAt: now, usageCount: (t.usageCount || 0) + 1 } : t
      ),
      log: {
        ...f.log,
        [date]: {
          ...existing,
          [meal]: [...(existing[meal] || []), ...newEntries],
        },
      },
    };
  });
};

const deleteTemplate = (id) => {
  if (!confirm('Delete this template? Cannot be undone.')) return;
  updateFood((f) => ({ ...f, templates: f.templates.filter((t) => t.id !== id) }));
};
```

### 7. Wire the modal

Render `TemplateSaveModal` at the bottom of `FoodScreen.jsx` (near the existing `<FoodEntrySheet />`):

```jsx
<TemplateSaveModal
  isOpen={!!saveTemplateMeal}
  meal={saveTemplateMeal}
  entries={saveTemplateMeal ? (dayLog[saveTemplateMeal] || []) : []}
  onSave={saveTemplate}
  onClose={() => setSaveTemplateMeal(null)}
/>
```

## Visual acceptance

- The Templates card sits between Progress bars and the meal buckets. Collapsible.
- Each template row: name + kcal on top line, "N items · → meal" on second line. Trash icon on the right.
- Save modal: same visual shell as the entry sheet but shorter.
- The per-bucket "Save as template" button is a bookmark icon tucked to the right of "+ add food." Low-profile.

## Test plan

1. Log 4 items to Breakfast on today's log.
2. Tap the bookmark icon on the Breakfast card. Modal opens with "Items: 4, Cal: (correct total), P: (correct)."
3. Name it "Usual breakfast" → Save. Modal closes.
4. Templates section appears above the meal buckets. Tap header to expand. "Usual breakfast · 4 items · → breakfast · XXX kcal" visible.
5. Navigate to yesterday (arrow left). Tap the Usual breakfast template. All 4 entries appear in yesterday's breakfast.
6. Each re-logged entry has a fresh `id` and `at` timestamp.
7. Delete the template via trash icon → confirm prompt → template removed.
8. Round-trip via export/import — templates survive.
9. `npm run build:andrew` succeeds.
10. DevTools localStorage: `schemaVersion` is 4.

## Out of scope

- Editing an existing template (delete + recreate is fine for v1).
- Shared templates between users.
- Template categories / tags.
- Scheduling templates (e.g. "log this every Monday").
- Exporting a template separately from the rest of the state.
- Partial template log (all-or-nothing for now).
- Overriding the target meal bucket at log time — add only if the user specifically asks; `defaultMeal` is captured at save time and used on log.

## Handoff artifact

`docs/food-upgrade/PHASE-5-COMPLETE.md`:

```markdown
# Phase 5 complete — meal templates

## Schema
- Bumped to v4. Migration: `migrateV3toV4` in `src/hooks/usePersistedState.js:NN`.
- `food.templates: []` added to DEFAULT_FOOD.

## Files changed
- src/hooks/usePersistedState.js — SCHEMA_VERSION + migration
- src/lib/program.js — DEFAULT_FOOD adds templates: []
- src/components/TemplateSaveModal.jsx (new)
- src/screens/FoodScreen.jsx — Templates section, save/log/delete handlers, bucket save button

## Test results
[pass/fail]

## Deferred / gotchas
[anything]

## All 5 phases complete
Food tracker upgrade done. Accuracy ceiling reached:
- Home meal: ±5% (gram entry)
- Chain restaurant: ±5% (Nutritionix)
- Repeat order: same as first-log
- Non-chain restaurant: ±15–20% (AI paste floor)
- Cooked side: ±15% (portion chips)
```
