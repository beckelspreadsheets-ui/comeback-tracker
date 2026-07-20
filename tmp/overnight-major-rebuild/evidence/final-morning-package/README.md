# Penguin Kart — Overnight Major Rebuild: Morning Package

**Branch:** `overnight-major-rebuild-20260719` (isolated worktree, never merged/deployed)
**Rollback checkpoint:** `a6f21473c39beed370c2bc76b994a309142a4313` (preflight-repaired baseline)
**Milestone checkpoints:** M1 `52616ed` → M2+M3 `907d7b1` → M4–M7 `120d96a` → final package (this commit)
**Playable preview (LAN, production build):** http://5.78.180.55:5303/ — no debug params needed; intro → racer/track/kart select → race works on phone and desktop.

## What changed (visual rebuild, mechanics preserved)

- **Hero frame:** one solid seated Ordinal Penguin in a grounded four-wheel kart; calm elevated chase camera (60° desktop / 63° mobile, was 70°/68° with 7° speed stretch — now 3°); restrained mini-turbo FOV kick.
- **Roster:** all rivals race the SAME hero kart+penguin system at near-equal mass in their own liveries (was: tiny boxy driverless karts). Roster sheet: `roster-sheet.png`.
- **Comeback City:** real instanced city massing — deco blocks, stepped roofs, vertical window strips, awnings, landmark towers, far silhouettes — the flat skyline cards are now distant support only.
- **Penguin Village:** new instanced alpine kit — A-frame timber cabins, snow roofs, warm windows, chimneys, pines, snowbanks, far ice ridge. Instantly distinct from CC in both silhouette and color tests.
- **Materials/lighting:** road glitter fixed (roughness/env/detail-map rebalance); ice-shield crystal cage replaced with a clean dome; massing on cheap Lambert; effects-off frames stand on geometry alone (see `*-gfx-off.png`).
- **Onboarding:** verified first-session flow end-to-end (intro guide → select → race) on desktop and mobile (`onboarding-report.json`).

## Preserved (gate-verified)

Steering, drift charge tiers/boosts, items, AI personalities + rubber-banding, lap/checkpoint logic, collision behavior, race timing, mobile controls, reduced-motion path, `?gfx=off` low-effects fallback. Drift-chain telemetry traces on the preflight build vs the rebuild are **byte-identical** (dual-build probe, `tmp/trace-*.json`).

## Test summary (all run against the production build)

| Gate | Result |
|---|---|
| `test:race` (mechanics playtest, node) | ✅ pass |
| `test:kart-playable` full proof (desktop+mobile+PV autoplay, manual controls, GLB mounts) | ✅ pass |
| `test:audio:kart` (audio unlock + drift tier-3 cue chain) | ✅ pass |
| `test:track-visuals` | ✅ pass |
| `test:bundle:kart` (budget) | ✅ pass |
| `test:kart-proof` (static guard) | ✅ pass |
| race-proof scenario gates (motion, draw calls ≤800, triangles ≤900k, console/network) | ✅ pass |
| race-proof **desktop minFps ≥ 8** (headless, video-recorded) | ⚠️ environment-limited — see below |

## Performance

- Draw calls **570** (budget 800; peaked 761 before the per-material merge diet). Triangles **109k** (budget 900k).
- New **software-GL adaptive path** (SwiftShader/llvmpipe only — real GPUs unchanged): no MSAA, reduced internal resolution, wider sim dt clamp, PMREM env probe skipped. `?swQuality=full` opts out.
- Measured on this GPU-less host today: headless proof fps went from **1 (preflight commit a6f2147, measured now) to 3–5 desktop / 7–18 mobile**; isolated page (no video capture) ~10–12fps desktop; JS frame work ~4ms steady (render-bound only).
- ⚠️ **Known issue:** the race-proof desktop minFps-8 sub-gate is unreachable *on this host today* — the harness records video (CDP screencast ≈ +160ms/frame), and a6f2147 itself scores **1** under the same protocol now (it passed at preflight when the host was faster). Mobile passes. Recommend re-measuring on the reference GPU host (historical canonical truth: vsync-144) or re-baselining that sub-gate with Seth.
- Historical headed canonical numbers (2026-07-11, real GPU): 143.9–144 fps both tracks at 461–783 draw calls; the rebuild sits between those budgets with far fewer triangles (109k vs 499k).

## Known issues / honest notes

1. race-proof desktop minFps-8 red on this host (above) — both preflight and rebuild fail it today; rebuild is 3–5× faster than preflight under the same protocol.
2. PV mid-distance still shows a mild wet-ice sheen under the dawn sun (reduced from heavy glitter; intentional ice read).
3. The painted backdrop ring can show two sun discs on Comeback City (mirrored repeat) — distant support only.
4. Rival karts share the hero geometry; authored GLB bodies remain available behind `?authoredAssets=1` for future roster upgrades.
5. `race:proof:capture` leaves its preview server running on exit (pre-existing harness quirk — use `timeout` when scripting it).

## Decision request

Approve the rebuild direction, request focused revisions, or reject it. Internal checkpoints M1–M7 were executed autonomously per the approved overnight plan; no merge or deployment has occurred.

## Files in this package

- `comparison.html` — before/rebuild sheets per world incl. effects-off and mobile
- `gameplay-desktop-10s.webm`, `gameplay-mobile-10s.webm` — autoplay race recordings
- `roster-sheet.png`, `onboarding-intro.png`, `onboarding-report.json`
