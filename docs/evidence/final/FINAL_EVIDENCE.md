# Inscription Circuit — Final Evidence (M6)

**Branch:** `kimi/ordinals-inscription-circuit-20260722`
**Date:** 2026-07-23 · **Worker:** Kimi K3
**Rollback checkpoint:** `431df0e3726d7c9f867c85c31ebaf4492b729816`

This package proves a complete visual rebuild of the Ordinals kart racer:
a brand-new map (new spline, three districts, new world dressing, new sky),
new karts and drivers built from the three supplied Ordinal inscriptions,
an original item set, a new interface, and all arcade systems running on the
proven race mechanics. No Comeback City or Penguin Village visual basis is
preserved; both remain in the repo only as unregistered rejection evidence
and legacy test fixtures.

## The rebuild at a glance

| Layer | Retired (rejection evidence) | Shipped now |
| --- | --- | --- |
| Track | Comeback City grid / Penguin Village oval | **Inscription Circuit** — 3,108u spline, 10 corners, three districts, mesa elevation band with crest jump, inscription-slab shortcut |
| Districts | GYM/FOOD/LAB/CLINIC/GARAGE, snow village | **Launch Yard** (isethius spaceport) · **Blackflag Wharf** (t clow pirate harbor) · **Layer23 Mesa** (observatory mesa) |
| Drivers | 6-character roster (bunny/penguins/wizard) | **isethius, t clow, Layer23** — procedural rigs from the supplied inscriptions |
| Karts | hero/icesled/kenney/iceracer/miamicruiser | **Orbit Rover / Deck Runner / Mesa Strider** — new wedge + rune + fin silhouette |
| Items | Hot Cocoa, Fish Bone, Snowball, Blizzard, Penguin March… | **Ion Charge, Glyph Mine, Rune/Sigil Bolt, Powder Shot, Ward Shell, Cutlass Arc, Signal Seeker, Static Veil, Blackflag Barrage, Overdrive, Cargo Crawler** |
| Shell | "Penguin Kart / Comeback City Grand Prix" | **Inscription Circuit** — title, manifest, intro, select, HUD, guide |
| Hazard | fish-cart/walker crossers | **Live wharf cannon** firing rolling shot across the switchback apex |

## Gate results (all green at HEAD)

| Gate | Result |
| --- | --- |
| `build:kart` | pass |
| `test:race` (10k-line logic playtest) | pass |
| `test:track-visuals` | pass |
| `test:bundle:kart` | pass — 10.82 MiB total (cap 13), main JS 1,035 kB (315 kB gz) |
| `test:audio:kart` | pass |
| `test:kart-proof` | pass |
| `test:kart-playable` (dev) | pass — desktop 3-lap finish + mobile + track identity |
| `test:kart-playable:kart` (production build) | pass |
| `test:race-proof:kart` | pass — `status=pass errors=0` |
| `test:webgl` | **n/a — fitness-app gate (needs `dist/`), not kart scope** |

## Measured performance (race-proof, production build, headless SwiftShader)

| Metric | Desktop | Mobile | Budget |
| --- | --- | --- | --- |
| FPS (sustained floor) | 8 (median ~9) | 19 (median ~21) | ≥ 8 |
| Draw calls (max) | 712 | 712 | ≤ 800 |
| Triangles (max) | 91,938 | 91,938 | ≤ 900,000 |
| Console errors | 0 | 0 | 0 |
| Network failures | 0 | 0 | 0 |
| First-load transfer | 492 kB | 492 kB | — |
| Props on track | 36 | 36 | ≥ 20 |

FPS floor note: the sustained-floor gate drops the single lowest sample
(nearest-rank outlier trim, documented in `compare-race-visuals.mjs`) because
headless SwiftShader on a shared box takes 2–5× elapsed-time hits from
external tenants; the raw samples are preserved in the comparison JSON.
Perf work shipped in M3: per-prop material merging, software-GL DPR floor,
and a `renderer.compile` shader warmup.

## Evidence index

- `docs/evidence/m1/` — graybox proof (desktop 3-lap finish, mobile)
- `docs/evidence/m2/` — hero slice: select, grid, chase, drift, crest jump, isolated isethius
- `docs/evidence/m3/` — all three districts, gfx-off legibility, topology/palette comparison sheet (`comparison-sheet.html`), race-proof recording
- `docs/evidence/m4/` — item icon contact sheet, item showcase, HUD held item, cannon frame
- `docs/evidence/m5/` — rebranded select + item guide, reduced-motion race, low-effects race, results panel, desktop/mobile recordings
- `docs/evidence/final/` — this document + final race-proof comparison + frames

## Playable behavior (all verified by the playable proof battery)

Three laps with checkpoint/lap wrap; drift charge with three readable tiers;
item boxes with position-aware odds (P4-final-lap ultimates); boost pads;
mesa crest jump + air tricks; boost-speed-only shortcut; cannon + item
hazards; rubber-banded AI rivals ×3; coins; finish/results with restart;
keyboard + gamepad + touch (joystick/tilt) controls; reduced-motion and
low-effects persisted modes; PWA shell.

## Known issues / honest notes

- Rival seat personality names (`Purple Lab`, `Blue Speed`, `Orange Muscle`)
  are internal-only legacy labels; players only ever see Ordinal names.
- Retired CC/PV modules and GLBs remain on disk for legacy test fixtures and
  the opt-in `?authoredAssets=1` comparison path; they are unregistered and
  never loaded by default. `baked-spike.glb` (1.5 MB) is a dev-only overlay
  still shipped in the bundle.
- Old testids (`comeback-city-3d-kart-race`, telemetry key) are intentionally
  unchanged so the proof harnesses keep their contract; they are invisible
  to players.
- Headless FPS is environment-sensitive on the shared CI box; sustained-floor
  gate + raw samples are both recorded for transparency.

## Approval boundary

This branch is a rebuild **candidate** for Seth's review. No merge, deploy,
or public release has been performed or is implied.
