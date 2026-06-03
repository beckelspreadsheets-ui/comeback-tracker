# Phase 3 — Restaurant tab (Nutritionix chain menus)

**Schema bump:** none
**Depends on:** Phase 1 complete
**Estimated effort:** medium — new API integration, new tab, error handling

---

## Goal

Add a fifth tab to the entry sheet: **Rest.** (Restaurant). Search a chain by name ("chipotle", "chick-fil-a"), pick a menu item, log with exact published macros. Covers ~900 US chains via Nutritionix.

This is the biggest accuracy win in the whole roadmap — for chains it brings restaurant logging from "±20% estimated" to "±5% published."

## Orientation

1. `docs/food-upgrade/ROADMAP.md`
2. `docs/food-upgrade/PHASE-1-COMPLETE.md` — schema + entry model
3. `src/lib/foodApi.js` — follow the same pattern for env-var key handling and the `mapXProduct` function shape
4. `src/components/FoodEntrySheet.jsx` — the `TABS` array (line 7) and tab rendering (lines 310–465). You'll add a fifth tab.

## API — Nutritionix

- Developer signup: https://developer.nutritionix.com — free tier, 200 calls/day per key.
- Auth: `x-app-id` and `x-app-key` headers on every request.
- Endpoints used:
  - `GET https://trackapi.nutritionix.com/v2/search/instant?query={q}&branded=true&common=false` — returns `branded[]` items, each with `nix_item_id`, `brand_name`, `food_name`, `serving_qty`, `serving_unit`, `nf_calories`, `photo.thumb`.
  - `GET https://trackapi.nutritionix.com/v2/search/item?nix_item_id={id}` — full nutrients including protein, carbs, fat.

### Env vars

Store in `.env.local` (Andrew's responsibility, not committed):
- `VITE_NUTRITIONIX_APP_ID`
- `VITE_NUTRITIONIX_API_KEY`

Never commit these. `.env.local` is already in `.gitignore` (verify).

If either is missing, the Restaurant tab should be **hidden entirely** (not just disabled). Reason: a visible-but-disabled tab is clutter on a 5-tab mobile layout where every slot is precious.

## Work items

### 1. `src/lib/restaurantApi.js` (new)

```js
const NUTRITIONIX_INSTANT = 'https://trackapi.nutritionix.com/v2/search/instant';
const NUTRITIONIX_ITEM = 'https://trackapi.nutritionix.com/v2/search/item';

const APP_ID = import.meta.env.VITE_NUTRITIONIX_APP_ID;
const APP_KEY = import.meta.env.VITE_NUTRITIONIX_API_KEY;

export const hasRestaurantKey = () => !!(APP_ID && APP_KEY);

const headers = () => ({
  'x-app-id': APP_ID,
  'x-app-key': APP_KEY,
});

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
};

// Map a Nutritionix instant-search hit to a lightweight card for the result list.
const mapInstantHit = (item) => ({
  source: 'nutritionix',
  nixItemId: item.nix_item_id,
  name: item.food_name,
  brand: item.brand_name,
  cal: num(item.nf_calories),
  servingDesc: `${item.serving_qty ?? 1} ${item.serving_unit ?? 'serving'}`.trim(),
  photo: item.photo?.thumb || null,
  // Macros filled in on `fetchItemDetails`.
});

// Full details for a picked item — has protein/carbs/fat.
const mapItemDetails = (item) => ({
  source: 'nutritionix',
  name: item.food_name,
  brand: item.brand_name,
  cal: num(item.nf_calories),
  p: num(item.nf_protein),
  c: num(item.nf_total_carbohydrate),
  f: num(item.nf_total_fat),
  servingDesc: `${item.serving_qty ?? 1} ${item.serving_unit ?? 'serving'}`.trim(),
  unit: 'serving',
  barcode: '',
});

export const searchRestaurants = async (query, { signal } = {}) => {
  if (!hasRestaurantKey()) throw new Error('no-key');
  const q = query.trim();
  if (!q || q.length < 2) return [];
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('offline');

  const params = new URLSearchParams({ query: q, branded: 'true', common: 'false' });
  const res = await fetch(`${NUTRITIONIX_INSTANT}?${params}`, { headers: headers(), signal });
  if (!res.ok) throw new Error(`nutritionix-${res.status}`);
  const data = await res.json();
  return (data.branded || []).map(mapInstantHit);
};

export const fetchItemDetails = async (nixItemId, { signal } = {}) => {
  if (!hasRestaurantKey()) throw new Error('no-key');
  const params = new URLSearchParams({ nix_item_id: nixItemId });
  const res = await fetch(`${NUTRITIONIX_ITEM}?${params}`, { headers: headers(), signal });
  if (!res.ok) throw new Error(`nutritionix-${res.status}`);
  const data = await res.json();
  const food = data.foods?.[0];
  if (!food) return null;
  return mapItemDetails(food);
};
```

### 2. `src/components/FoodEntrySheet.jsx` — fifth tab

- Import `Utensils` from `lucide-react` and `hasRestaurantKey`, `searchRestaurants`, `fetchItemDetails` from `../lib/restaurantApi.js`.
- Extend `TABS`:
  ```js
  const TABS = [
    { key: 'library', label: 'Library', icon: BookMarked },
    { key: 'search', label: 'Search', icon: Search },
    { key: 'scan', label: 'Scan', icon: Camera },
    { key: 'rest', label: 'Rest.', icon: Utensils },   // NEW
    { key: 'manual', label: 'Manual', icon: Pencil },
  ];
  ```
- Filter out the `rest` tab if `!hasRestaurantKey()`.
- Change the tab strip grid from `grid-cols-4` to `grid-cols-5` (when key present) or keep `grid-cols-4` (when hidden). Use a computed class.
- Add a new tab panel: same visual shell as Search (debounced query, loading spinner, result list). Key difference:
  - Debounce 500ms (respect Nutritionix rate limit).
  - Result row: brand thumb (if `photo`), `food_name`, brand, `nf_calories`, "Select →" affordance.
  - On tap: call `fetchItemDetails(nixItemId)`, show a loading state, then pass through `pickFood`.

### 3. State for the restaurant tab

Mirror the existing `search` tab state, prefixed (`restQuery`, `restResults`, `restSearching`, `restErr`). Share the same `abortRef` so switching tabs cancels in-flight requests.

Reset on `isOpen` (extend the existing effect).

### 4. Photo handling

Nutritionix thumbs are `.png`, small (~70×70). Show them at 40×40 in the result list with `object-cover` and a subtle `border border-bone/10`. Handle `photo: null` gracefully — reserve the space with an empty div to keep text alignment.

### 5. Error handling

- `no-key`: shouldn't happen because we hide the tab, but log `console.warn` if it somehow fires.
- `offline`: show the same WifiOff component as the Search tab.
- `nutritionix-429`: show "Rate limited — try again later (200 req/day limit)."
- Generic: "Restaurant search failed. Try again."

### 6. Logging the pick

`mapItemDetails` already sets `unit: 'serving'` and `amount: 1` will default in the Edit stage. No new code needed — the Edit stage flows as before.

## Visual acceptance

- Tab icon: `Utensils`, same sizing as other tabs.
- Label "Rest." (4 chars). Don't spell out "Restaurant" — the tab strip is mobile-constrained.
- Result rows: 56px min-height, thumb on the left, name + brand stacked, kcal on the right in gold mono.
- Loading: same `Loader2` spinner and stone text as the Search tab.
- Offline: same vermillion WifiOff callout.

## Test plan

1. Create `.env.local` in the repo root with your Nutritionix app id + key. `npm run dev`. Restaurant tab visible.
2. Open entry sheet. Tab strip shows 5 tabs. Icons evenly spaced.
3. Type "chipotle" — results appear within ~1s. Brand names correct.
4. Tap "Chicken Bowl" (or similar). Loading spinner, then Edit stage with real macros (Chipotle Chicken = ~180 cal, 32P, 0C, 4F for 4oz serving or so — numbers depend on current menu).
5. Add to Lunch. Entry appears with serving description like "4 oz" and correct calories.
6. Try a garbage query ("asdfasdf") — "No results" empty state shows after the debounce.
7. Turn wifi off — WifiOff message appears when searching.
8. Temporarily rename the env vars to invalid values → 429 or auth error shows the generic "failed" message. (Restore after.)
9. Remove env vars → Restaurant tab disappears from the tab strip. Layout collapses gracefully to 4 columns.
10. `npm run build:andrew` succeeds. Env vars propagate into the built bundle **only if the Pages deploy has them set** — remind the user to add them in the Cloudflare Pages project settings (or skip deploy until phase 3 lands).

## Out of scope

- Non-chain restaurants (use phase 2 AI paste).
- Multi-region chains (Nutritionix is US-biased; European/Asian chain coverage is limited — that's a known gap, not a bug).
- Caching. Each pick makes one API call; 200/day is generous for a single user.
- Writing Nutritionix items to library — the existing "Save to library" flow works, no changes needed.
- Usage quota UI — don't build a "you've used 47/200 today" display. It's premature.

## Handoff artifact

`docs/food-upgrade/PHASE-3-COMPLETE.md`:

```markdown
# Phase 3 complete — restaurants

## What shipped
- `src/lib/restaurantApi.js` — Nutritionix instant search + item details
- Fifth tab in FoodEntrySheet ("Rest." with Utensils icon)
- Env-var gated: `VITE_NUTRITIONIX_APP_ID` + `VITE_NUTRITIONIX_API_KEY`. Tab hidden if missing.

## Deploy-side TODO for the user
Set the two env vars in each Cloudflare Pages project (`comeback-andrew`, `comeback-alexander`) before next deploy.

## Test results
[pass/fail for each step]

## Deferred / gotchas
[anything]

## Next phase
Phase 4 (portion chips) now unblocked.
```
