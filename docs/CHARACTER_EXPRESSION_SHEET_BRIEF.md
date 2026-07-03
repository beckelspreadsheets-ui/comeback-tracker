# Character Expression Sheet Brief — Phase E Face Atlas

**Purpose:** Owner-generated art intake for the face-atlas system (Phase E of `PENGUIN_KART_VFX_VISUAL_GAP_PLAN.md`). One sheet per playable character. Generated with ChatGPT Image Gen 2 per the visual-target brief (owner-generated art only; no external stock).

**How the art gets used:** Each sheet is sliced into 6 face states, normalized, and packed into one shared expression atlas texture. A face-decal mesh is fitted over each avatar's face in Blender and UV-mapped to the atlas; the runtime swaps `texture.offset` to change expressions (blink timer, boost, hit, win, lose). This is the same trick MK8 uses (textured mouths, not modeled ones) — so **consistent framing across cells matters more than render beauty**. A drifted head position between cells makes that cell unusable.

---

## The prompt (copy-paste, one run per character)

> Character expression sheet for a 3D game asset. Use the attached reference images of **[CHARACTER NAME]** — keep this exact character design: same colors, same proportions, same materials, same blocky pixel-toy style. Do not redesign or restyle the character.
>
> Produce a single 3×2 grid — six equal cells on a plain white background, thin gray cell borders. Every cell shows the SAME straight-on, front-facing head-and-shoulders view of the character, rendered in the same clean toy-figurine 3D style as the reference, with soft even studio lighting and no shadows across the face. The camera angle, head position, head size, and lighting must be IDENTICAL in all six cells — the ONLY thing that changes between cells is the facial expression (eyes, brow area, and beak/mouth). No head tilts, no pose changes, no new accessories, no props.
>
> Cell order, left to right, top to bottom, with a small caption under each cell:
> 1. **NEUTRAL** — relaxed default face, eyes open, calm.
> 2. **BLINK** — same face but both eyes fully closed, peaceful.
> 3. **BOOST** — thrilled racing grin: beak wide open in an excited smile, eyes wide with delight.
> 4. **HIT** — shocked "oh no!": startled wide eyes, beak open in a gasp, brows raised.
> 5. **WIN** — triumphant: beaming closed-beak smile, happy arched eyes (closed, curved upward).
> 6. **LOSE** — grumpy pout: flat, half-lidded unimpressed eyes, beak turned down in a sulk.
>
> Expressions should be bold and exaggerated enough to read clearly at very small sizes, built from the same simple blocky/pixel shapes as the character's face in the reference — not smooth cartoon curves. High resolution, square image, no watermark, no extra text besides the six captions.

---

## Per-character run sheet (5 runs)

| Character | Reference to attach | Special notes to append to the prompt |
|---|---|---|
| **CRRT Bunny** | best CRRT Bunny render/ordinal art | Replace "beak/mouth" wording with "muzzle/mouth"; note: "this character is a bunny — expressions use its mouth, whiskers/nose, and long ears (ears perk up on BOOST/WIN, droop on LOSE)." |
| **T Clow** | T Clow reference art | — |
| **Seth Penguin** | Seth reference art | — |
| **Mizzle** | `3d generations:character sheets/mizzlesitting.png` | Append: "Mizzle's eyes are hidden behind his orange pixel sunglasses, which must stay ON in every cell. Emotion reads through the beak/mouth, brow ridge above the frames, and head-feather angle — plus a bright glint on the lenses for BOOST and WIN, and drooping brows above the frames for LOSE." |
| **Layer 23** | `3d generations:character sheets/layer23 3d view.png` (front view) | Append: "Keep the cowboy hat identical in every cell; his square pixel eyes are the main expression carrier." |

## Owner QA checklist before handing sheets over

- [ ] All six cells: head in the same spot at the same size (flip between cells — nothing should "jump").
- [ ] Character is on-model (colors, hat/glasses/clothing identical to reference in every cell).
- [ ] Each expression identifiable at thumbnail size (zoom out to ~10% — can you still tell HIT from BOOST?).
- [ ] Face style stays blocky/pixel like the reference (no smooth anime eyes).
- [ ] No pose/arm changes, no added props, no watermark.
- [ ] If one cell is off but the rest are good: regenerate the whole sheet (per-cell edits usually drift the framing) or request an edit of just that cell keeping everything else pixel-identical.

**Delivery:** drop the 5 final PNGs into `3d generations:character sheets/` named `<character-key>-expressions.png` (keys: `crrt-bunny`, `tclow`, `seth-penguin`, `mizzle`, `layer23`).
