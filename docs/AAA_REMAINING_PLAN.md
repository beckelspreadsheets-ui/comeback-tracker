# AAA kart overhaul — what's left

State at wave 6 close (`bc6fb3bb`). Six waves committed on `aaa-kart-ci`,
nothing deployed, `main` untouched.

Critic totals by wave: **57/64/42 → 63/67/62 → 65/63/60 → 77/71/61 → 75/68/73 → (wave 6 pending re-score)**
against a pass bar of 88/110 with every axis ≥ 8. Blind A/B has picked the
build over the original baseline **18/18 with zero ties**, every wave.

---

## Tier 1 — blocked work that is now unblocked

### 1. The 4× track  ·  L  ·  the biggest single win left

The arc-length fix landed in wave 6, which was the gate. Now buildable.

Measured: Comeback City is 2,897 units = 11.15 s/lap = 33.5 s race (shipped
telemetry says 34.08 s, so the model is sound). A 45 s lap needs **×4.04**.

Non-obvious facts that should shape the design:

- **Lap count and speed are the wrong levers.** 12–14 laps of the same loop
  is a hamster wheel; a 75% speed cut guts mechanics you already like.
- **Do NOT multiply the content.** Beat density is one beat every 0.70 s
  today. Stretching 4× with the *same* 13–16 authored beats lands at ~3 s
  between events, which is MK8 pacing for free. Adding props proportionally
  recreates today's cram at four times the cost.
- **Target 15–25 corners** (currently 7 per lap; MK8 runs 12–20) with
  deliberate variety — sweepers to hold a long drift, hairpins to force a
  stop-and-turn, chicanes to break rhythm.
- **At least one 8–10 s straight** as the designated overtaking zone. The
  longest straight on either track today is **2.19 s**, which is why there is
  never a window to set up a pass.

Workflow: author candidate layouts, render each through
`scripts/track-layout-preview.mjs`, judge them as plan views, and only build
geometry once a layout is picked. Iterating in 2D is nearly free; iterating in
geometry is not. See `docs/TRACK_DESIGN_NOTES.md`.

### 2. Start/finish spline kinks  ·  S  ·  do this first, it's tiny

The previewer found two kinks of radius 12.6 sitting **directly on the
start/finish line** — the authored centerline's first and last points are 3.0
world units apart where every other gap is ~30. One-point nudge in
`src/game/courseV2.js`. Every lap crosses it.

---

## Tier 2 — the two things wave 6 dropped

### 3. JS chunk split  ·  M  ·  a real budget breach, overhaul-caused

`largest JavaScript gzip size` is **425.9 / 400 KiB and FAILING**. The monolith
grew 6,703 → 10,831 lines across six waves and the new render modules bundle
into the same `index.kart` chunk.

Fix by code-splitting the race runtime behind the existing screen flow (it is
only needed once a race starts, not on intro or character select) — **not** by
raising the limit. Wave 6 attempted this and it rode along with the package
that broke the render, so it was reverted. **Redo it alone, verify with a
capture before trusting it.**

### 4. Phone quality tiers  ·  M

Everything grew this overhaul — shadow maps landed, the post chain became
three passes, particles tripled, a mid-ground belt and an environment probe
appeared. Desktop absorbed it (144 → ~120/102 fps, still well above 60). **The
phone tier has never been re-measured.**

Tiers must preserve the art direction: the LUT and vignette carry the look and
should survive; SMAA and the heavier effects are the candidates to drop. Also
worth revisiting `RACE_RENDER_SCALE`, hardcoded 0.85 desktop / 0.6 mobile — a
fixed cut means the game never renders at native resolution even on hardware
that could.

**Both of these were in the package that destroyed the render.** Redo them as
separate, individually verified changes.

---

## Tier 3 — assets ready and waiting

### 5. Kart diet + on-demand pool  ·  M

Five approved bodies are lifted and verified by turntable: **hash-runner,
cold-wallet, sat-stacker, pixel-pickup-v2, node-runner-v2**, in
`tmp/kart-lifts/` at 3.9–4.5 MB raw each.

Two steps before they race:

- **Diet** to ~350–550 KB each (weld → simplify → resize → meshopt). Precedent:
  lifoladen went 9.7 MB → 353 KB.
- **On-demand pool.** At the existing diet precedent, five more karts put the
  raw bundle at **~16.0 / 16 MiB** — at or over the cap. The pool architecture
  is already the approved plan for the 100 characters; karts should ride it.
  Only the karts in a race need to load.

Wiring each kart also needs a `KART_NOSE_YAW` entry — Meshy models face −X,
Tripo +X. Verify with the orientation lab; do not guess.

### 6. Ordinal roster  ·  L, mostly waiting on art

Pipeline proven end to end on the three ordinals on disk. Per penguin:
ordinal PNG → turnaround sheet (~2 cr) → `scripts/ordinal-sheet-crop.mjs` →
Meshy `multi_image_to_3d` (~30 cr) → diet → roster entry.

~94 remaining need images. Batch as a workflow, one agent per penguin — doing
it inline exhausts context. AK-47's lift is downloaded and awaiting diet;
georgefx lifted; Denomad not started.

---

## Tier 4 — known defects, none blocking

- **Penguin Village karts cast no shadow.** Diagnosed as the 12° key throwing
  the shadow ribbon *behind* the kart where the chase camera cannot see it.
  Unverified against a running build.
- **Rival value-spread capped at 0.247** by the shipped texture atlas — half the
  body texels come from a cell that is one flat value. Needs a new atlas cell,
  not a cleverer remap.
- **Fallback kart** `blackMat`/`tireMat`/`seatMat` still lack `rim: true`, so
  ~40% of its surface gets no kart shading — and it appears exactly when a GLB
  fails, i.e. when the frame already looks worst.
- **Camera still the lowest axis.** Rebuilt twice; the remaining fix is a
  screen-space rival ghost, which lives in the monolith.
- **CI capture only gets 2 of 9 marks per track** — at 1–2 fps under software
  rendering the race ends before the later marks come round.

---

## Suggested order

1. Spline kinks (S, minutes)
2. Kart diet + pool (M) — unblocks five bodies already paid for
3. JS chunk split (M) — clears a failing gate, done alone this time
4. Track layout design → owner picks → build (L) — the biggest win
5. Phone tiers (M) — after the track lands, so it is measured against final content
6. Tier 4 defects, opportunistically

## Rules that stay in force

- Never `git add -A` in a checkpoint; stage owned paths explicitly.
- One monolith owner per wave.
- Verify a failing package **owns** the file its fix lives in.
- Read the frames. A green build with zero console errors rendered cyan noise
  in wave 6 and only looking caught it.
- Gate on machine load; treat regressions measured above load 12 as suspect.
- `aaa-kart-overhaul-full` is local-only and must never be pushed.
