# Phase 2 — AI paste quick-entry

**Schema bump:** none
**Depends on:** Phase 1 complete (reads unit-aware entry model)
**Estimated effort:** small — pure UI + one regex parser

---

## Goal

The user pays for ChatGPT and Claude subscriptions. When they eat at a non-chain restaurant or a meal they can't weigh, they'll open the subscription they're already paying for, paste a photo or description, and get macros back. This phase gives them a **paste target** inside the Manual entry tab so they don't have to type the numbers by hand.

Explicitly **not** in scope: any LLM API call from the app itself. No API keys, no proxies, no SDK dependencies. The parsing is pure regex against a known output format, plus a "copy prompt" button that gives the user a ready-made prompt to paste into their AI subscription.

## Orientation — read these first

1. `docs/food-upgrade/ROADMAP.md`
2. `docs/food-upgrade/PHASE-1-COMPLETE.md` — know the current schema and entry shape after phase 1
3. `src/components/FoodEntrySheet.jsx` — the Manual tab (modified in phase 1) is where the paste UI lives

## The prompt the user will paste into ChatGPT / Claude

Design the app to emit this exact prompt when the user taps "Copy prompt":

```
Estimate macros for this meal. Output EXACTLY one line in this format, nothing else:

NAME — CAL cal | P g protein | C g carbs | F g fat

Where NAME is the dish, CAL/P/C/F are integers. No explanation, no bullets, no code block.

Meal:
[describe the meal here, or attach a photo]
```

This locks the model to a single line with predictable separators. The app's parser only has to handle that one format plus 2–3 sensible variants for when the model drifts slightly.

## The parser

New file: `src/lib/foodParse.js`.

```js
// Parse AI-generated macro lines. Returns { name, cal, p, c, f, servingDesc } or null.
export const parseAiMacros = (raw) => {
  if (!raw) return null;
  const text = raw.trim().replace(/\s+/g, ' ');

  // Primary format: NAME — 850 cal | 65 g protein | 45 g carbs | 42 g fat
  // Also accept: NAME - 850 cal, 65p, 45c, 42f
  // Also accept:  850 cal 65P 45C 42F — NAME
  // Also accept: JSON {"name": "...", "cal": 850, "p": 65, "c": 45, "f": 42}

  // JSON first
  if (text.startsWith('{')) {
    try {
      const j = JSON.parse(text);
      const cal = Number(j.cal ?? j.calories);
      const p = Number(j.p ?? j.protein);
      const c = Number(j.c ?? j.carbs ?? j.carbohydrates);
      const f = Number(j.f ?? j.fat);
      if ([cal, p, c, f].every(Number.isFinite)) {
        return { name: String(j.name || 'Meal'), cal, p, c, f, servingDesc: '1 serving' };
      }
    } catch {}
  }

  // Regex extraction — tolerant
  const cal = Number((text.match(/(\d+(?:\.\d+)?)\s*(?:k?cal|calories)/i) || [])[1]);
  const p = Number((text.match(/(\d+(?:\.\d+)?)\s*g?\s*(?:p\b|protein)/i) || [])[1]);
  const c = Number((text.match(/(\d+(?:\.\d+)?)\s*g?\s*(?:c\b|carb)/i) || [])[1]);
  const f = Number((text.match(/(\d+(?:\.\d+)?)\s*g?\s*(?:f\b|fat)/i) || [])[1]);

  if ([cal, p, c, f].every(Number.isFinite)) {
    // Extract name: text before — or - or first digit; fall back to "Meal".
    const sep = text.search(/[—\-]/);
    const before = sep > 0 ? text.slice(0, sep).trim() : '';
    const after = sep > 0 ? text.slice(sep + 1).trim() : '';
    // Name is whichever side has letters and no digits (heuristic).
    const hasDigits = (s) => /\d/.test(s);
    const name =
      before && !hasDigits(before)
        ? before
        : after && !hasDigits(after.split(/\d/)[0])
          ? after.split(/\d/)[0].trim().replace(/[—\-|]\s*$/, '').trim()
          : 'Meal';
    return { name: name || 'Meal', cal, p, c, f, servingDesc: '1 serving' };
  }

  return null;
};

export const AI_PROMPT = `Estimate macros for this meal. Output EXACTLY one line in this format, nothing else:

NAME — CAL cal | P g protein | C g carbs | F g fat

Where NAME is the dish, CAL/P/C/F are integers. No explanation, no bullets, no code block.

Meal:
[describe the meal here, or attach a photo]`;
```

Unit-wise this is always a serving entry (`unit: 'serving'`, `amount: 1` by default). User can adjust in the Edit stage like any other food.

## Work items

### 1. `src/lib/foodParse.js` (new file)

As above. Tight and dependency-free. No tests file needed — exercise it through the UI.

### 2. `src/components/FoodEntrySheet.jsx` — Manual tab header

At the top of the Manual tab content (before the Name input — currently around line 470), add a collapsible "Paste from AI" section:

```jsx
// Pseudo-sketch — make it match Kintsugi exactly.
<details className="border border-bone/[0.06]">
  <summary className="px-4 py-3 text-[10px] font-mono uppercase tracking-[0.22em] text-gold cursor-pointer select-none flex items-center justify-between">
    <span>Paste from AI</span>
    <Sparkles size={12} />
  </summary>
  <div className="p-4 space-y-3 border-t border-bone/[0.06]">
    <button
      onClick={handleCopyPrompt}
      className="w-full py-2.5 border border-bone/10 text-bone/80 text-[11px] font-mono uppercase tracking-[0.22em] active:scale-[0.99]"
    >
      Copy prompt for ChatGPT / Claude
    </button>
    <textarea
      value={pasteText}
      onChange={(e) => setPasteText(e.target.value)}
      placeholder={`Paste the one-line response here, e.g.\nChicken parm — 850 cal | 65g protein | 45g carbs | 42g fat`}
      rows={3}
      className="w-full bg-ink/60 border border-bone/[0.08] px-4 py-3 text-bone text-sm font-mono focus:border-gold/60 focus:outline-none placeholder:text-bone/20 resize-none"
    />
    {parseErr && <div className="text-[11px] text-vermillion font-mono">{parseErr}</div>}
    <button
      onClick={handleParsePaste}
      disabled={!pasteText.trim()}
      className="w-full py-2.5 bg-gold text-ink text-[11px] font-mono uppercase tracking-[0.22em] disabled:opacity-40 active:scale-[0.99]"
    >
      Parse → fill form
    </button>
  </div>
</details>
```

Use `Sparkles` from `lucide-react` for the icon.

### 3. Handlers

```js
import { parseAiMacros, AI_PROMPT } from '../lib/foodParse.js';

const [pasteText, setPasteText] = useState('');
const [parseErr, setParseErr] = useState('');

const handleCopyPrompt = async () => {
  try {
    await navigator.clipboard.writeText(AI_PROMPT);
    // brief inline toast, no library needed — use a transient state flag
  } catch {
    // clipboard API fails in non-secure contexts; fallback: select the text
  }
};

const handleParsePaste = () => {
  setParseErr('');
  const parsed = parseAiMacros(pasteText);
  if (!parsed) {
    setParseErr("Couldn't parse. Expected: NAME — 850 cal | 65g P | 45g C | 42g F");
    return;
  }
  setManual({
    name: parsed.name,
    cal: String(parsed.cal),
    p: String(parsed.p),
    c: String(parsed.c),
    f: String(parsed.f),
    servingDesc: parsed.servingDesc,
  });
  setPasteText('');
  // Also: reset the unit toggle added in Phase 1 to 'serving'.
};
```

Reset `pasteText` when the sheet opens (extend the existing `useEffect` that resets state on `isOpen`).

### 4. Copy-prompt feedback

After successful copy, flash a small confirmation — toggle a boolean for 1.5s and render "Copied ✓" in the button or a subtle line of text underneath. No external toast library.

## Visual acceptance

- The "Paste from AI" block sits at the top of Manual, above Name. Collapsible via `<details>` so it's out of the way when not needed.
- Textarea uses `font-mono` — AI output looks right that way.
- On parse success the block auto-collapses (close the `<details>`) and the Manual form below it now has the parsed values filled in. Consider calling `handleManualSubmit` directly if all required fields are present — that takes the user into the Edit stage in one tap.
- Error state: vermillion text, single line, non-intrusive.

## Test plan

1. Open Manual tab. Expand "Paste from AI."
2. Paste: `Chicken parm — 850 cal | 65g protein | 45g carbs | 42g fat`. Click Parse. Name, cal, P, C, F fill in. Click Continue → Edit stage shows 850 cal etc.
3. Paste: `{"name":"Sushi combo","cal":650,"p":38,"c":85,"f":12}`. Parse. Fields fill.
4. Paste: garbage (`lol idk`). Error message appears, form untouched.
5. Paste with weird spacing: `chicken parm  —  850cal  65P   45C  42F`. Still parses.
6. Click "Copy prompt." Paste into a scratch editor — you should see the full prompt text with the Meal: placeholder.
7. `npm run build:andrew` succeeds.

## Out of scope

- Any in-app LLM call. This phase **explicitly** does not add any API integration. If you find yourself adding `fetch()` to an LLM provider, stop.
- Voice input.
- Image upload in the app (the user sends images to their AI subscription outside the app).
- Persisting paste history.
- Auto-save parsed items to library (user can check the existing "Save to library" box in Edit stage if they want).

## Handoff artifact

`docs/food-upgrade/PHASE-2-COMPLETE.md`:

```markdown
# Phase 2 complete — AI paste

## What shipped
- `src/lib/foodParse.js` — `parseAiMacros(text)`, `AI_PROMPT` export
- Manual tab in FoodEntrySheet now has a collapsible "Paste from AI" section with copy-prompt and parse-paste buttons

## Format support
- Primary: `NAME — CAL cal | P g protein | C g carbs | F g fat`
- JSON: `{"name":..., "cal":..., "p":..., "c":..., "f":...}`
- Tolerant regex: accepts hyphen/em-dash separators, case variants, commas instead of pipes

## Test results
[pass/fail for each step in the Test Plan]

## Deferred / gotchas
[anything surprising]

## Next phase
Phase 3 (restaurants) now unblocked.
```
