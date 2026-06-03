// Parse AI-generated macro lines. Returns { name, cal, p, c, f, servingDesc } or null.
export const parseAiMacros = (raw) => {
  if (!raw) return null;
  const text = raw.trim().replace(/\s+/g, ' ');
  if (!text) return null;

  // JSON first: { "name": "...", "cal": 850, "p": 65, "c": 45, "f": 42 }
  if (text.startsWith('{')) {
    try {
      const j = JSON.parse(text);
      const cal = Number(j.cal ?? j.calories);
      const p = Number(j.p ?? j.protein);
      const c = Number(j.c ?? j.carbs ?? j.carbohydrates);
      const f = Number(j.f ?? j.fat);
      if ([cal, p, c, f].every(Number.isFinite)) {
        return {
          name: String(j.name || 'Meal').trim() || 'Meal',
          cal,
          p,
          c,
          f,
          servingDesc: '1 serving',
        };
      }
    } catch {
      // fall through to regex
    }
  }

  // Tolerant regex extraction.
  // Primary: NAME — 850 cal | 65 g protein | 45 g carbs | 42 g fat
  // Also:    NAME - 850cal, 65P, 45C, 42F
  // Also:    850 cal 65P 45C 42F — NAME
  const cal = Number((text.match(/(\d+(?:\.\d+)?)\s*(?:k?cal|calories)\b/i) || [])[1]);
  const p = Number(
    (text.match(/(\d+(?:\.\d+)?)\s*g?\s*(?:protein|p)\b/i) || [])[1],
  );
  const c = Number(
    (text.match(/(\d+(?:\.\d+)?)\s*g?\s*(?:carbs?|carbohydrates?|c)\b/i) || [])[1],
  );
  const f = Number((text.match(/(\d+(?:\.\d+)?)\s*g?\s*(?:fat|f)\b/i) || [])[1]);

  if (![cal, p, c, f].every(Number.isFinite)) return null;

  // Extract name: text before the first separator (— or -) that has letters and no digits,
  // otherwise the trailing side's leading words, otherwise "Meal".
  const hasDigits = (s) => /\d/.test(s);
  const clean = (s) =>
    s.replace(/^[\s—\-|:]+|[\s—\-|:]+$/g, '').trim();

  let name = 'Meal';
  const sepIdx = text.search(/[—\-]/);
  if (sepIdx > 0) {
    const before = clean(text.slice(0, sepIdx));
    const after = clean(text.slice(sepIdx + 1));
    if (before && !hasDigits(before)) {
      name = before;
    } else if (after) {
      const leading = after.split(/\d/)[0];
      const candidate = clean(leading);
      if (candidate) name = candidate;
    }
  } else {
    // No separator — try the text up to the first digit.
    const leading = clean(text.split(/\d/)[0]);
    if (leading) name = leading;
  }

  return {
    name: name || 'Meal',
    cal,
    p,
    c,
    f,
    servingDesc: '1 serving',
  };
};

export const AI_PROMPT = `Estimate macros for this meal. Output EXACTLY one line in this format, nothing else:

NAME — CAL cal | P g protein | C g carbs | F g fat

Where NAME is the dish, CAL/P/C/F are integers. No explanation, no bullets, no code block.

Meal:
[describe the meal here, or attach a photo]`;
