# Phase 2 complete — AI paste

## What shipped
- `src/lib/foodParse.js` — `parseAiMacros(text)` and `AI_PROMPT` exports. Pure, dependency-free.
- `src/components/FoodEntrySheet.jsx` — Manual tab now opens with a collapsible "Paste from AI" `<details>` block above the Unit toggle. It holds:
  - "Copy prompt for ChatGPT / Claude" button (writes `AI_PROMPT` to the clipboard; flashes "Copied ✓" for 1.5s; in non-secure / clipboard-denied contexts it falls back to stuffing the prompt into the textarea so the user can select-copy).
  - A `font-mono` textarea with example placeholder.
  - "Parse → fill form" button that runs `parseAiMacros`, populates the Manual form's name/cal/P/C/F/servingDesc, forces `unit: 'serving'`, clears the textarea, and auto-collapses the block via a ref on the `<details>` element.
  - Inline vermillion error line for parse failures.
- Sheet state reset (`useEffect` on `isOpen`) now also resets `pasteText`, `parseErr`, and `promptCopied`.
- `Sparkles` icon added to the existing `lucide-react` import.

## Format support
- **Primary** — `NAME — CAL cal | P g protein | C g carbs | F g fat` (em-dash or hyphen; pipes or spaces).
- **JSON** — `{"name": ..., "cal": ..., "p": ..., "c": ..., "f": ...}` with aliases `calories`, `protein`, `carbs`/`carbohydrates`, `fat`.
- **Tolerant regex fallback** — handles compact forms like `NAME - 850cal 65P 45C 42F` and weird whitespace; macro matchers use word-boundary alternations (`protein|p`, `carbs?|carbohydrates?|c`, `fat|f`) to avoid collisions with letters in the dish name.
- Always produces `servingDesc: '1 serving'`; the Edit stage handles any further adjustment like any other food.

## Test results
1. **Expand "Paste from AI" + parse primary format** — not executed in this run; expected pass (regex covers the exact brief example).
2. **JSON paste** — not executed; `JSON.parse` branch handles it, aliases included.
3. **Garbage paste (`lol idk`)** — not executed; regex matches return NaN, parser returns `null`, error message shown, manual form untouched.
4. **Weird-spacing paste** — not executed; leading `replace(/\s+/g, ' ')` normalizes and regex anchors on digits + unit keywords.
5. **Copy prompt** — not executed in a browser; copy path uses `navigator.clipboard.writeText(AI_PROMPT)`. Fallback path stuffs the prompt into the textarea.
6. **Build** — `npm run build:andrew` succeeds (only the pre-existing recharts chunk-size advisory).

UI sign-off via live browser test is the human's step per `ROADMAP.md` #5.

## Deferred / gotchas
- Auto-submit on parse (i.e., calling `handleManualSubmit` after `setManual` to skip straight into Edit stage) was considered — **not** wired, because `setManual` is async and the existing `handleManualSubmit` reads from `manual` state. The user taps Continue one more time, same as manual typing. Keeps the code simple; can revisit if the extra tap annoys.
- Name extraction is heuristic: it prefers the side of the first `—`/`-` separator that has no digits. Ambiguous inputs (no separator, digits interleaved with letters) default to `'Meal'`. Edge cases beyond the brief's five test inputs weren't hunted down.
- Clipboard fallback puts the prompt into the paste textarea rather than alerting — non-intrusive, keeps the user in flow on iOS in-app browsers and other non-secure contexts.
- `<details>` is uncontrolled; the `ref.current.open = false` trick closes it imperatively on successful parse without needing extra state.
- Parser-unit is hard-coded to `'serving'` on parse, since AI output is per-dish, not per-gram. Phase 1's gram mode is still reachable via the toggle after parse, but the user would have to re-enter numbers — this matches the brief's scope.

## Next phase
Phase 3 (restaurants) now unblocked.
