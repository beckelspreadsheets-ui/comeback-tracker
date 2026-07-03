# Flipbook Billboard Spec — LOCKED

**Date:** 2026-07-01 · **Status:** decisions locked; toolchain + runtime recipe **validated end-to-end on the dev machine** (see §8).
**Feeds:** [HIGGSFIELD_MCP_INTEGRATION_PLAN.md](HIGGSFIELD_MCP_INTEGRATION_PLAN.md) H4 (animated billboards) and Execution Plan D1 (everything-animates). Ship gates: H0 governance amendment for generated content; A4 bundle headroom; owner similarity review per sheet.
**Provenance of decisions:** three.js findings verified by reading the installed r184 source (`node_modules/three/src`); toolchain commands verified by running them on this machine (ffmpeg 8.1 + cwebp 1.5.0, both installed — note the local ffmpeg is a slim build with **no WebP encoder**, so cwebp is mandatory).

---

## 1. Locked decisions (summary)

| Decision | Locked choice | Why (short) |
|---|---|---|
| Animation vehicle | Flipbook sprite sheet, **never** `THREE.VideoTexture` | 1 VRAM upload vs per-frame re-upload (~5×, three.js #28980); mips (no shimmer); no iOS Low-Power failure; PWA-precache friendly |
| Frame stepping | `texture.offset` mutation on per-screen clones | r184 `Texture.clone()` shares the `Source` → ONE GPU copy for all screens; offset is just a mat3 uniform; no library, no custom shader |
| Cell layout | 256px power-of-two cells; 8×1 strip (2048×256) or 4×4 grid (1024×1024) | POT alignment = zero mip-generation bleed until cells < 2px |
| Gutter | 8px duplicated-edge (smeared) inside each cell; content = 240px; UVs inset | Protects mip levels 0–3 (racing distance uses mips 2–4); ffmpeg `tile=padding` is a SOLID-COLOR gap — verified wrong, do not use |
| Sampling | `minFilter=LinearMipmapLinearFilter`, `magFilter=LinearFilter`, `anisotropy=4`, `ClampToEdgeWrapping`, full mip chain ON | Trilinear kills shimmer (which otherwise flickers the bloom); aniso keeps glancing angles off deep mips |
| Material | `MeshBasicMaterial({ map, toneMapped:false })` + **`color.setRGB(k,k,k)` with k = 1.5–4** | Unlit + cheapest shader; `.color` is an unclamped float multiplier over `.map` → HDR values reach the HalfFloat composer buffer and cross bloom threshold 1.0 (see §7 — this was verified in r184 source; an earlier claim that Basic can't bloom is wrong *when k>1*) |
| Looping | Wrap (frame N−1 → 0), content authored to loop; pingpong ONLY for non-directional pulse content | Direction reversal reads as a rewind glitch on ticker/arrow content |
| Cadence | 10 Hz base; per-screen golden-ratio phase (`phase = i·N·0.618`) + ±7% rate detune; write `offset` only on frame-index change | Reads as "video"; screens never blink in sync; zero per-frame allocation |
| Encoding | `cwebp -q 90 -m 6 -sharp_yuv` (lossy) or `-lossless -z 9` for small readable text | `-sharp_yuv` stops chroma smear on saturated neon edges (+14% size); measured ~26–50 KB/strip, ~53–102 KB/grid |
| Color pipeline | `scale=…:in_color_matrix=bt709:in_range=tv` in ffmpeg; `SRGBColorSpace` on texture; nothing else | Pins the one YUV→RGB conversion (untagged AI mp4s otherwise get matrix-guessed → hue shift on neon) |
| Seam QA | PSNR(source first frame, last frame) ≥ 40 dB or reject the clip | Objective gate; a true Kling FLF loop scores ≥40 (measured 44.6 dB on the x264-encoded test loop) |

## 2. Asset format standard

- File: `src/assets/game/generated/flipbook-<name>.webp` (ES-imported; see §6).
- 8 frames → 8×1 strip (2048×256); 16 frames → 4×4 grid (1024×1024). Budget ≤150 KB lossy / ≤300 KB lossless-text per sheet.
- Every cell: 240px content centered + 8px smeared-edge gutter. Frames ordered left→right, top→bottom in image space.
- Loop-authored: frame N−1 flows into frame 0 (source clip generated with Kling first/last-frame using the SAME still in both slots; the converter drops the duplicate final frame automatically).

## 3. Generation (Higgsfield) → conversion

1. Still: Nano Banana Pro / GPT Image 2, billboard aspect, bold few-word text (bloom eats thin strokes; composite real text over generated backgrounds when in doubt).
2. Loop: Kling 3.0 first/last-frame, same still both slots, 2–4 s.
3. Convert: **`node scripts/make-flipbook.mjs --in loop.mp4 --out flipbook-<name>.webp --frames 8|16 [--lossless]`**
   The script: probes real frame count (`ffprobe -count_frames`) → seam-gates (PSNR ≥ 40 dB, override `--seam-min` / `--no-seam-check`) → samples indices `round(i·(N−1)/K)` (never the duplicate last frame) → `scale=240:240:flags=lanczos:in_color_matrix=bt709:in_range=tv` → `pad=256:256:8:8` → `fillborders=…:mode=smear` (duplicated-edge gutter) → `tile` → `cwebp`.

## 4. Runtime recipe (goes in ComebackCityThreeKartRace.jsx per the wiring audit)

**Material factory** (new sibling after `createAssetMaterial`, ~line 355 — do NOT reuse `createAssetMaterial`: it's alpha-tested/clamped and can't bloom):

```js
// Flipbook billboard screens: unlit map + unclamped HDR color multiplier so
// lit frames cross the bloom threshold (UnrealBloomPass 1.0 today, pmndrs
// luminanceThreshold after B4) regardless of scene lighting.
const FLIPBOOK_CELL = 256;
const FLIPBOOK_GUTTER = 8;
const createFlipbookMaterial = (loader, url, { cols, rows, frames, registry, k = 2.5, side = THREE.FrontSide }) => {
  const material = new THREE.MeshBasicMaterial({ toneMapped: false, side });
  material.color.setRGB(k, k, k);
  loader.load(url, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 4;
    const content = FLIPBOOK_CELL - FLIPBOOK_GUTTER * 2;
    texture.repeat.set(content / (FLIPBOOK_CELL * cols), content / (FLIPBOOK_CELL * rows));
    material.map = texture;
    material.needsUpdate = true;
    registry.push({ texture, cols, rows, frames, lastFrame: -1, phase: registry.length * frames * 0.618, hz: 10 * (1 + (registry.length % 2 ? -0.07 : 0.07)) });
  }, undefined, () => {});
  return material;
};
```

**Stepper** (in `frame()`, directly after the boost-pad chevron block ~4344; `flipbookBillboards` array created next to `buildingSwaps` ~3080 and returned on the engine object):

```js
for (let i = 0; i < flipbookBillboards.length; i += 1) {
  const screen = flipbookBillboards[i];
  const frameIndex = Math.floor(race.raceTime * screen.hz + screen.phase) % screen.frames;
  if (frameIndex !== screen.lastFrame) {
    screen.lastFrame = frameIndex;
    const col = frameIndex % screen.cols;
    const row = (frameIndex / screen.cols) | 0;
    // flipY=true: V origin is bottom-left; image row 0 (top) = highest V band.
    screen.texture.offset.set(
      (col * 256 + 8) / (256 * screen.cols),
      1 - ((row + 1) * 256 - 8) / (256 * screen.rows)
    );
  }
}
```

**Hard rules:** all sampler params are set on the base texture before first render and NEVER touched per-screen afterward (r184 keys the shared GPU copy on sampler params — any deviation silently forks a second VRAM upload). Only `offset`/`repeat` may differ between clones. If multiple screens share one sheet, `clone()` the loaded texture per screen; a mesh `.clone()` (like the gantry's back face) shares the material and animates for free.

## 5. Wiring points (verified against current code)

| Surface | Where | Note |
|---|---|---|
| Finish-gate screen (Comeback City only) | overlay `PlaneGeometry(gateWidth*1.15, 7.2)` proud of the board front (`addFinishGate`, board at :1648-1652) | board housing stays; Penguin Village skips this gate (`customStartArch`) |
| ICE IS NICE gantry (Penguin Village) | swap the banner material (:2822-2832) for the factory output | `bannerBack` is a mesh clone sharing the material — both faces animate free |
| District rooftop marquees (Comeback City) | NEW plane in front of the roof bar (:1763-1769) | must NOT carry `userData.kind='procedural-building'` or the baked-GLB swap (:3732-3738) disposes it mid-session |

## 6. Asset entry + ship gates

1. ES-import next to the facade imports (:20-24); `FLIPBOOK_SHEET_URLS` map next to `DISTRICT_FACADE_URLS` (:158).
2. `asset-manifest.json` record (six fields; `source` names generator+model+date+prompt authorship per the H0 amendment).
3. **`vite.config.js:44` globPatterns is missing `webp`** — add it in the same change as the first sheet or sheets 404 offline: `'**/*.{js,css,html,svg,png,webp,ico,woff2}'`.
4. `.webp` counts against the images bundle category (verified) — ship after A4 re-baselines the budget.
5. Owner similarity review per sheet (H0/trade-dress rules); FPS A/B per house rules (expected cost ≈ zero: offset writes are cheaper than the chevron opacity writes they sit beside).

## 7. Resolved discrepancy (do not "fix" this later)

An earlier audit claimed `MeshBasicMaterial` "can never bloom at threshold 1.0" and required `MeshStandardMaterial` + `emissiveMap`. That's only true at the default `color = white(1,1,1)`. Verified in r184 source: `meshbasic.glsl.js` computes `diffuse * map` with **no clamp**, `THREE.Color` components are unclamped floats, and tone mapping applies only when rendering to the null target — so `color.setRGB(2.5,2.5,2.5)` pushes bright texels to 2.5 in the HalfFloat composer buffer, crossing threshold 1.0. The Basic recipe is cheaper (no PBR, no `scene.environment` sampling) and is the locked choice. Caveat: the bloom high-pass uses Rec.709 luminance — saturated pure-blue content needs near-white cores or a higher per-screen `k`.

## 8. Validation evidence (this machine, 2026-07-01)

- `scripts/make-flipbook.mjs` run on a synthetic mathematically-seamless loop: seam gate measured 44.6 dB (pass), sampled indices `[0,6,12,…,42]` of 49 (duplicate last frame correctly dropped), produced `test-neon-8x1.webp` (25.9 KB) and `test-neon-4x4.webp` (53.2 KB) — sizes match research predictions.
- `flipbook-lab.html` (root, importmap booth pattern like orientation-lab) rendered both sheets over the game's exact bloom chain (UnrealBloom 0.55/0.45/1.0, ACES exposure 1.05): frames advance independently with desynced phases (verified via `window.__flipbookLabFrames`), k=2.5 screens visibly bloom vs the k=1.0 control, no gutter seams or neighbor-frame bleed.
- Lab usage for real sheets: `vite dev` → `/flipbook-lab.html?sheet=/src/assets/game/generated/flipbook-<name>.webp&cols=4&rows=4&frames=16`.

## 9. Per-sheet QA checklist

- [ ] Seam gate ≥ 40 dB (converter enforces)
- [ ] Sheet ≤ 150 KB lossy (≤ 300 KB lossless text sheets)
- [ ] Lab check: cadence reads as video at 10 Hz; no neighbor-frame flash at cell edges; text readable at ~10% zoom
- [ ] Hue parity: sheet vs paused source frame side by side (BT.709 pin should make this a non-issue)
- [ ] Bloom pop at the target `k` without eating text strokes
- [ ] Manifest entry + fingerprint + owner similarity review
- [ ] FPS A/B capture unchanged

## 10. Open choices (small, non-blocking)

- `reducedMotion` scales `dt` 0.86× (:3783); stepping from `race.raceTime` inherits the slowdown (~8.6 Hz) — arguably honors the setting; use wall-clock if exact 10 Hz ever matters.
- First flipbook is also the repo's first animated `texture.offset` — the stepper comment marks it as the precedent for future UV-scroll surfaces.
