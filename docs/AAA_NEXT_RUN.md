# AAA kart overhaul — handoff for the next run

**Written 2026-08-03 after wave 8, updated after wave 9.** Paste the loop prompt
at the bottom into a fresh context. Everything below is verified state, not
recollection.

---

## WAVE 9 (2026-08-03) — items 1-4 are DONE

Branch `aaa-kart-ci`, commits `d9ae56d4` and `4ea01c28`, pushed. Still nothing
deployed, `main` still untouched.

1. **The five kart bodies were ALREADY WIRED** at `b9eb09e1` — imports,
   `Promise.all`, `kartScenes`, `KART_OPTIONS` and `KART_NOSE_YAW` all present
   and manifest-registered. Item 1 below was already paid for. Verified, not
   assumed.
2. **Coin rows 8 -> 30 per track.** Density restored to 0.670/0.668 rows per
   second against the shipped 0.717, and 30 (not 4x of 8) is what leaves the
   coin economy untouched — time-to-cap stays ~14 s.
3. **Previewer re-baselined and green.**
4. **PV cast shadows: SOLVED by splitting the key**, not by raising it. 65% of
   the energy stays at 12 degrees and carries the sunset, 35% sits at 20 degrees
   and casts. Owner picked this option.

### Three corrections to what wave 8 handed over

- **`test:race` had been RED SINCE WAVE 4** and the "ALL CHECKS PASS" line above
  never covered it. Wave 4 (`e658f8b8`) deliberately moved kart roughness
  0.68 -> 0.58 and did not update the gate, so the script aborted there and
  **every assertion below it went unrun for five waves**. Now green.
- **The candidate coin sheets were NOT "clear of every pickup by ±0.02"** as
  claimed — 14 of 30 CC rows and 11 of 30 PV rows sat inside it. But ±0.02 is
  itself the wrong unit: it was authored on the 2,897-unit lap where it meant
  58 units, and 58 units is the real guard. Same class as `startOffset`.
- **"A shadow-only light that contributes no diffuse" cannot work.** three
  darkens by removing the casting light's own contribution, so a zero-intensity
  caster renders nothing. Splitting the key is the working form.

### Method note worth keeping

**Pixel A/B cannot verify a render change on this harness.** A control capture
of *identical code* differs on 4-20% of pixels (snow, boost flames, rival
positions) with darkening ≈ brightening. Verify by walking the live scene graph
instead — boot with `?playableAutoplay=1&track=<key>`, reach a scene object via
`window.__g2AmbientDebug.snow`, then walk `.parent` to the Scene. Measure a
kart-riding light's direction as `position - target.position`, never from the
world origin.

### Still open from wave 9

- **`test:audio:kart` and `test:kart-playable` are not cleared.** Both die on
  `page.waitForFunction` timeouts. `test:audio:kart` was confirmed to fail
  IDENTICALLY at `b9eb09e1`, so it is pre-existing, not wave 9 — but neither has
  been seen green, and the machine never dropped below load 6.4 all session.
  **Re-run both quiet before calling wave 9 green.**
- **PV mean speed 248 -> 260 is INFERRED, not measured** (the ice stopped being
  a full-width tax in wave 8). Needs a real PV autoplay capture.
- Items 5-8 below are untouched.

---

## Where things stand

- **Branch `aaa-kart-ci`**, last commit **`82e6d779`**, fully pushed to
  `github.com/beckelspreadsheets-ui/comeback-tracker`. Working tree clean.
- **`main` is untouched. Nothing has been deployed.** The live game is
  unchanged. Shipping is the owner's call and has never been given.
- **`aaa-kart-overhaul-full` is local-only and must NEVER be pushed** — a
  checkpoint once ran `git add -A` and swept 820 pre-existing files and 530
  binaries (several 50+ MB) into commit `9c8364bf`.
- Nothing is running. Load was 5.6 at handoff.

### Eight waves, measured

Three independent critics score every round against `docs/AAA_KART_RUBRIC.md`.
Pass bar is 88/110 **with every axis ≥ 8**. Nothing has passed; the honest
state is "much better, still failing".

| wave | what landed | totals |
|---|---|---|
| 1 | closed sky dome, one sun, light rig, HUD CSS, dead tree cut | 57/64/42 |
| 2 | post chain, per-track LUT grade, kart material classes, mid-ground belt | 63/67/62 |
| 3 | road rebuilt as one crowned object, PV regrade, spatial particles | 65/63/60 |
| 4 | chase camera, **real cast shadows**, PV sky root-caused, env probe | 77/71/61 |
| 5 | six monolith handoffs, kart materials, event VFX | 75/68/73 |
| 6 | **arc-length/lane progress**, HUD markup, camera feel *(tier package reverted)* | — |
| 7 | kart diet, spline kinks, JS chunk split | 85/80/82 → **93** at r2 |
| 8 | **both 4× tracks built**, dead normal maps stripped, PV shadow split | 86/77/79 |

**Blind A/B has picked the build over the original baseline 18/18 with zero
ties, every wave since wave 1.**

### Current measurements

```
Comeback City  → Skyline Viaduct   11,643u · 44.78 s/lap · 134.35 s race
Penguin Village → Bayfront Sweep    11,678u · 44.92 s/lap · 134.75 s race
16 corners each · 0 kinks · longest straight 9.72 s / 9.67 s  (was 2.19 s)
15 beats at a 2.99 s mean gap  (was one every 0.70 s)

bundle 13.6/16 MiB raw · 10,948/12,000 KiB gz · ALL CHECKS PASS
largest JS gzip 253/400 KiB  (was 425.9 and failing)
18/18 frames · zero console errors
```

Axes still under the bar: **camera** (lowest throughout), **lighting**,
**materials**.

---

## What to do next, in order

### 1. Wire the five kart bodies · S · do this first

The owner picked and approved these; they are dieted, turntable-verified,
manifest-registered, and **now affordable** — wave 8's normal-map strip freed
the room (bundle sits at 10,948/12,000 gz).

Files in `src/assets/game/models/karts/`: `hash-runner.glb` (314 KB),
`cold-wallet.glb` (260), `sat-stacker.glb` (300), `pixel-pickup.glb` (251),
`node-runner.glb` (251).

Four edits per body in the monolith: an import, an entry in the `Promise.all`,
an entry in `kartScenes`, a `KART_OPTIONS` row.

- **All five are Meshy lifts → nose faces local −X → `KART_NOSE_YAW: Math.PI / 2`.**
  Measured per body in wave 7 against two independent cues each. **Do not
  re-derive and do not guess** — the orientation lab exists because bbox
  heuristics and eyeballing both produced wrong answers repeatedly.
- `sat-stacker` is the tallest (0.96 vs 0.58–0.72) because of its crate stack,
  so `KART_FIT_MAX_HEIGHT` will govern its scale rather than the footprint fit
  — same clamp the ice block needed.
- Top-speed spread was already widened ±2% → ±3.5% in wave 8 (the owner's
  recorded call for when 2–3 minute tracks land). New karts should sit inside
  that spread.

### 2. Coin rows — currently 4× too sparse · S

Both tracks still get **8 coin rows over a 45-second lap**, where the shipped
density was 8 over an 11-second lap. `COIN_ROWS` in
`src/game/race/raceCoins.js`.

The candidate sheets authored **30 rows each** and the lists are ready to
paste: `tmp/track-candidates/candidate-c.mjs` and `candidate-a.mjs`, key
`coinRows`. Placement rule in their header: rows are hand-placed clear of every
item-box row and boost pad by ±0.02 so pickups never compete for the same
moment.

### 3. Re-baseline the previewer · S

`scripts/track-layout-preview.mjs` still validates against the OLD track, so it
reports ~300% deviation and **exits 1**.

- `GROUND_TRUTH` for `comeback-city`: 2,897 / 11.15 / 33.5 → **11,643.4 / 44.78 / 134.35**
- `MEAN_SPEED` for `penguin-village`: 248 was measured on the old ice-taxed
  loop; the new PV has no forced ice and should be re-measured (probably near
  CC's 260).
- `KNOWN_CONTRAST_DEBT['penguin-village']['pond-sweep@0.240']` and the three PV
  sightline debt entries are **dead baselines** — the debt they tracked was
  designed out in wave 8. Delete them.

### 4. Penguin Village cast shadows — an owner decision, not a bug · M

Wave 8 split this into two faults after three waves of wrong diagnoses.

**Fault A is FIXED.** The tier-2 contact patch was narrower on screen than the
kart standing on it, so from the chase camera a grounded kart occluded its own
shadow — on both tracks. Every mitigation since wave 5 scaled how *dark* a
patch nobody could see was; the quantity never touched was its **area**.

**Fault B is root-caused, not fixed, and needs a call.** PV genuinely renders
no cast shadow. Rig config, caster policy, frustum placement and receiver
materials are all identical to CC and all eliminated. The single variable that
moves it is the key light's **elevation**: forcing 45° produces a clean shadow
instantly, and the sweep 45 → 32 → 25 → 20 → 16 → 12 fades it out, with **20°
the lowest that still reads.** PV sits at **12°**.

That 12° is load-bearing twice: it is where the backdrop plate's alpha reaches
255, and it is what moves the sun's rake off the ground plane onto the ice
faces. **Raising it fixes the shadow by breaking the arctic sunset the owner
approved.** Options: accept PV without cast shadows, add a shadow-only second
light at ~20° that contributes no diffuse, or re-author the backdrop so the
sunset survives a higher key. Probe frames:
`scratchpad/probe/sw-penguin-village-p0_06-elev*.png`.

### 5. Rival AI over a 134-second race · M

`rivalRacers.js` is correctly parameterised in world units, so **nothing is
broken** — but personalities tuned to be interesting over 34 seconds have never
been checked over 134, and pacing a field across three 45-second laps is a
genuinely different design problem. This is a design pass, not a bug fix.

### 6. Post-chain and renderer quality tiers · M · one at a time

Particles were tiered in wave 8. The post chain and renderer are still
untiered, and the phone build has not been re-measured since shadow maps, the
three-pass post chain, the mid-ground belt and the environment probe all
landed.

**Do these ONE FILE AT A TIME, each verified by its own capture.** The combined
tier package is what destroyed the render in wave 6. `RACE_RENDER_SCALE` is
hardcoded 0.85 desktop / 0.6 mobile — a fixed cut means the game never renders
at native resolution even on hardware that could.

### 7. Elevation · M · the obvious next lever

Both tracks author elevation as a **single sin bump**, so the viaduct is the
only relief on an 11.6k-unit lap and everything else is dead flat. A 4× lap has
room for grade that is not a set piece, and the geometry now supports it.

### 8. Smaller open items

- **Legacy 2D minimap** (`src/game/raceTracks.js` ~line 128) maps CC's
  centerline with a hardcoded +512/+384 offset assuming a ~350-unit loop; it
  now receives 449 points spanning ±1716. Only affects `RacePlaytestHarness`
  (a dev tool excluded from the build), and the kart HUD's own minimap
  auto-normalises, so nothing shipped is wrong.
- **Rival value-spread capped at 0.247** by the shipped texture atlas — half the
  body texels come from a cell that is one flat value. Needs a new atlas cell,
  not a cleverer remap.
- **Runtime half of the on-demand kart pool** is designed and handed off in
  wave 7's notes, not built. Not urgent now that the strip freed room.
- **Ordinal roster**: pipeline proven on 3 of ~100. Needs the owner's remaining
  art. Batch as a workflow, one agent per penguin — inline exhausts context.
- **CI capture** only gets 2 of 9 marks per track (at 1–2 fps under software
  rendering the race ends before later marks come round).

---

## Rules that must survive the context reset

1. **Never `git add -A` in a checkpoint.** Stage owned paths explicitly.
2. **One monolith owner per wave.** `ComebackCityThreeKartRace.jsx` is ~11k
   lines and every wave wants it.
3. **Verify a failing package OWNS the file its fix lives in.** Penguin Village
   failed three waves because `createSkyDome.js` belonged to another package.
4. **Read the frames.** In wave 6 a green build with zero console errors and
   18/18 captured frames rendered **cyan noise**. Only looking caught it. The
   capture agent is now required to open frames and say whether the game
   renders.
5. **Render-pipeline changes one at a time**, each verified alone.
6. **Gate on machine load.** `sysctl -n vm.loadavg`; above ~7 fps is
   unreliable, above ~12 don't launch. Treat regressions measured above 12 as
   suspect and re-measure when quiet.
7. **Verify "module ships nothing" claims with grep.** A wave-2 critic made
   that claim about five modules and was wrong about four.
8. **`test:bundle:kart` measures the EXISTING dist** — build first or the
   number is stale.
9. **Carry the KNOWN TRAPS list into every wave prompt** (10 entries; copy from
   `scratchpad/aaa-wave8.js`). Fixes do not propagate as knowledge otherwise —
   wave 4 reintroduced a bug wave 3 had already fixed.
10. **Never deploy. Never switch branches.**

---

## Review links

- **https://comeback-kart-review.pages.dev** — per-wave before/after frames,
  critic verdicts, per-axis scores, perf delta
- **https://comeback-track-picks.pages.dev** — the three 4× layout candidates
- **https://comeback-kart-picks.pages.dev** — the 8 kart concepts

---

## Loop prompt for the fresh context

```
/loop Continue the AAA kart overhaul on branch aaa-kart-ci. Read docs/AAA_NEXT_RUN.md FIRST — it is the authoritative handoff, written after wave 8 at commit 82e6d779. Read tmp/aaa-plan/progress.json for wave history.

Each iteration: (1) CHECK LOAD with sysctl -n vm.loadavg — if load1 > 12 do NOT launch a wave or a local capture, just reschedule; the owner runs Godot/Codex and load above ~7 fakes proof reds. (2) If a wave workflow is in flight, do nothing and reschedule. (3) When a wave finishes: read its critic verdicts, verify the build is green (npm run build:kart THEN npm run test:bundle:kart — it measures the existing dist so build first), LOOK AT THE FRAMES YOURSELF before believing any healthy report, commit honestly stating what still fails, republish the sheet with node scripts/aaa-publish-review.mjs --label <captureLabel> --wave <N> --critics <criticsJson>, record in tmp/aaa-plan/progress.json, and push. (4) Launch the next wave as a Workflow authored to a scratchpad file and launched with scriptPath (backticks inside template literals break the parser), ALWAYS including the KNOWN TRAPS section copied from scratchpad/aaa-wave8.js.

WORK THE ORDER IN docs/AAA_NEXT_RUN.md: wire the five kart bodies first (small, already paid for, KART_NOSE_YAW is Math.PI/2 for all five — measured, do not guess), then coin rows (4x too sparse, lists ready in tmp/track-candidates/candidate-c.mjs and candidate-a.mjs), then re-baseline scripts/track-layout-preview.mjs (it exits 1 against the old track), then the Penguin Village shadow decision, then rival AI over a 134-second race, then post-chain and renderer tiers ONE FILE AT A TIME, then elevation.

STANDING RULES: never git add -A in a checkpoint; one monolith owner per wave; verify a failing package OWNS its fix's file; render-pipeline changes one at a time; verify any "module ships nothing" claim with grep; aaa-kart-overhaul-full must never be pushed. RESOLVED, do not relitigate: camera guard KEPT; Comeback City's Miami neon dusk grade is owner-confirmed; Penguin Village's arctic sunset is owner-confirmed and its 12-degree key is load-bearing.

When the list is done: run the full battery at load1 < 5 (build:kart, test:bundle:kart, test:kart-playable, test:race-proof, test:audio:kart), capture a final 18-frame set, run a final blind A/B against tmp/aaa-visual/baseline, and stop the loop with a summary. Never deploy the game. Never switch branches.
```
