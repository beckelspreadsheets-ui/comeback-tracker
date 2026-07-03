# Kart Face Art Intake — Expression Sheets → Runtime Atlases (E1 format lock)

**Date:** 2026-07-02 · **Task:** E1 (PENGUIN_KART_GRAPHICS_REVAMP_EXECUTION_PLAN.md) · **Status:** format LOCKED — owner acknowledgment pending (record message/date here when signed: ☐ ____________)
**Companion:** [CHARACTER_EXPRESSION_SHEET_BRIEF.md](CHARACTER_EXPRESSION_SHEET_BRIEF.md) (the generation prompt the owner is already running) · Consumers: E2 (state machine), E4 (runtime decal path), E5 (Blender decal fit + final atlases)

This document is the **runtime contract** for face art. The owner's five expression sheets are already in production per the brief; everything below locks how those sheets become the textures the game reads. Cell order, framing, and file layout here may not change without updating E2's `DRIVER_EXPRESSIONS` in the same commit.

---

## 1. Cell order — the contract

3×2 grid, indexed left→right, top→bottom. Index = atlas cell index = `DRIVER_EXPRESSIONS` index (E2, `src/game/race/render/raceVfx.js`):

| Index | Key | Sheet caption | Reads as |
|---|---|---|---|
| 0 | `neutral` | NEUTRAL | relaxed default, eyes open |
| 1 | `blink` | BLINK | both eyes fully closed |
| 2 | `boost` | BOOST | boost-grin: thrilled open-beak/mouth grin, wide eyes |
| 3 | `hit` | HIT | hit-gasp: startled wide eyes, open gasp |
| 4 | `win` | WIN | triumphant closed-beak smile, happy arched eyes |
| 5 | `lose` | LOSE | grumpy pout, half-lidded eyes |

Top row = cells 0–2, bottom row = cells 3–5. `faceAtlasOffsetFor(index)` (E2) maps index → UV offset in glTF convention (`texture.flipY === false`); this doc and that function are the only two places the convention lives.

## 2. Delivery format (what the owner hands over)

- **One sheet per character**, 3×2 grid in the cell order above, per the brief's generation prompt (white background + thin gray borders + captions is FINE — intake slices and cleans; do not re-run good sheets just to remove captions).
- **Cells:** square, ≥512×512 px each at delivery (sheet ≥1536×1024). Higher is fine; cells are downsampled to 256 px for the final atlas.
- **Framing (per cell):** straight-on front-facing head-and-shoulders; eye-line centered horizontally, at ~55% of cell height from the top; face spans ~80% of cell width. Identical head position/size/lighting in all six cells — a drifted cell is unusable (regenerate the sheet, not the cell).
- **Style:** flat toon shading matching the existing baked baseColor look — no painted shadows/highlights beyond the toy style, blocky/pixel shapes per the ordinal originals. **No Nintendo/Mario Kart trade dress.**
- **Drop location:** `3d generations:character sheets/<key>-expressions.png` — keys: `crrt-bunny`, `tclow`, `seth-penguin`, `mizzle`, `layer23`.

## 3. Atlas build spec (what the runtime reads)

- **Per-character external atlas:** `src/assets/game/textures/faces/<key>-faces.webp` — 768×512 WebP (3 cols × 2 rows of 256 px cells), quality ~90, **with alpha** (cell backgrounds removed to transparent at intake).
- Atlases are **external runtime textures, never embedded in GLBs** — art iterates without re-promoting hash-locked avatar GLBs.
- WebP is the owner-approved format (KTX2 explicitly NOT approved yet — PRD §9).
- Each atlas ships with a manifest provenance entry + owner similarity review, same as every art asset (house rule).

## 4. Intake checklist (run per character)

1. Receive sheet at `3d generations:character sheets/<key>-expressions.png`.
2. Slice the 6 cells (crop borders/captions out).
3. Normalize framing against the template overlay (eye-line 55%, face width 80%) — flip between cells; nothing may "jump".
4. Remove backgrounds to alpha.
5. Assemble the 3×2 atlas in contract cell order, 256 px cells.
6. Export WebP q~90 with alpha to `src/assets/game/textures/faces/<key>-faces.webp`.
7. Drop the raw sheet in `asset-pipeline/raw/` with a provenance line (generator, date, owner).
8. Gallery render for owner approval, then per-avatar Blender decal fit (E5 — per-character double gate).

## 5. Per-character notes

Keys must match `KART_CHARACTERS` (`src/game/ComebackCityThreeKartRace.jsx:108-116`). These are NFT ordinal characters the community recognizes — trait fidelity matters; pull palettes from each avatar's baked baseColor texture.

### `crrt-bunny` — CRRT Bunny
A BUNNY, not a penguin: expressions use muzzle/mouth, whiskers/nose, and long ears (ears perk on BOOST/WIN, droop on LOSE). Buck-tooth option welcome; BOOST may bite a carrot, echoing its `projectileSkin: 'carrot'`.

### `tclow` — T Clow
Ordinal penguin — beak instead of mouth. One character (the ice sled is his ride; do not confuse with any "CRRT Penguin" label from older art rounds). Keep his ordinal colors/traits exactly.

### `seth-penguin` — Seth Penguin
Ordinal penguin — beak expressions per the §1 table; keep individual ordinal traits/colors from the baked texture.

### `mizzle` — Mizzle
Ordinal penguin. His orange pixel sunglasses stay ON in every cell — emotion reads through beak, brow ridge above the frames, head-feather angle; lens glint on BOOST/WIN, drooping brows on LOSE.

### `layer23` — Layer 23
Ordinal penguin. Cowboy hat identical in every cell; his square pixel eyes are the main expression carrier.

## 6. Example row

The E4 debug atlas (generated placeholder art behind `?faces=1`) doubles as the filled example: once E4 lands, insert one rendered row here showing exact framing expectations. ☐ *placeholder — E4 inserts `tmp/flipbook-lab/face-debug-example-row.png` render*

## 7. Owner acknowledgment

- ☐ Format approved (this doc): ____________
- ☐ Committed to delivering 5 sheets per §2: ____________ (in production as of 2026-07-02 per PRD §9)

This gate blocks only E5 final art; E2–E4 proceed on the debug atlas.
