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

### The audio/playable gates are FIXED — and it was never load (`f2d4b026`)

Both had been failing on `countdown <= 0` timeouts, blamed on machine load for
waves. It was not load: the audio gate failed from a quiet start at load 5.3 and
now **passes at load 12.0**.

Headless chromium launched with no GL flags does not fail — it silently drives
requestAnimationFrame at ~2 fps. The game's own work was fine there
(`frameWorkMs` 2–4 ms); the gap BETWEEN frames was 412–1790 ms. The engine
clamps dt per frame as every game loop must, and that clamp converts a slow
renderer into SLOW MOTION: game time advanced ~1/24 s per frame however long the
frame really took, so a 3-second countdown took 22 seconds and no 20-second
deadline could cover it.

```
no GL flags   fpsEstimate 1-2    frameElapsedMs 412-1790   countdown took 22s
these flags   fpsEstimate ~110   frameElapsedMs ~9         countdown took <2s
                                                           raceTime tracks real time 1:1
```

The flags were never new — `aaa-visual-capture.mjs` always had them, which is
why single-frame captures worked while anything needing SUSTAINED frames timed
out. Three scripts had hand-rolled their own launch args and only one was right;
they now share `scripts/lib/chromium-gl-args.mjs`.

### Still open from wave 9

- ~~PV mean speed 248 → 260 is INFERRED, not measured~~ **MEASURED 2026-08-13**
  via `scripts/measure-mean-speed.mjs`, three autoplay races per track at ~80fps,
  wall/game 1.000, every run usable. Racing laps (lap 1 excluded): CC
  47.10/47.32/47.11 s → **247.1 u/s** (spread 0.47%); PV 46.25/46.28/46.35 s →
  **240.7 u/s** (spread 0.22%). The 2026-08-03 pair (245.7/245.7) was correct
  when taken — the 2026-08-08 difficulty retune (corner load 0.00052→0.00062)
  slowed PV 2.0%, outside its spread. `MEAN_SPEED` updated; the previewer (exit 0)
  now reports CC 47.2 s lap / 141.6 s race and PV 46.3 s lap / 138.9 s race.
  Any pace or corner-cost retune re-opens this measurement.
- ~~`test:kart-proof` is red~~ **RETIRED 2026-08-03.** It guarded a reference
  route the app split (`76513be9`) deliberately deleted, ran against the FITNESS
  app for a kart artifact, and its real coverage — does the kart game render at
  desktop and mobile — is done better by `test:kart-playable` capturing the live
  game on both tracks. Removed with it: the three orphaned exports in
  `comebackCityVisuals.jsx` (`ArcadeKartProofScene`, `PlayableKartProofScene`,
  `KartDesignSheet`) and that module's ~4.5 MiB proof-PNG imports. The PNGs stay
  on disk as artifacts and one still feeds the kart-playable contact sheet.
- Items 5–8 below are untouched.

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

### Nine waves, measured

Three independent critics score every round against `docs/AAA_KART_RUBRIC.md`,
dispatched with `docs/AAA_CRITIC_BRIEF.md`.

**Pass bar (owner's ruling, 2026-08-03): eleven scored axes, every axis ≥ 8, no
total threshold.** The old `88/110` line is gone — it was redundant, since eleven
axes each ≥ 8 already forces a total ≥ 88. Axis 11 *Motion & feel* stays unscored
until Phase 5 wires the video/telemetry scorer. Nothing has passed under either
reading; the honest state is "much better, still failing".

Totals below are the sum of the eleven scored axes (max 110), kept because the
trend is informative — but **the totals are not the gate.** The gate at wave 8 is
`materials`, `environment` and `post`, which all three critics put under 8, plus
`lighting`, which two of three do.

| wave | what landed | totals |
|---|---|---|
| 1 | closed sky dome, one sun, light rig, HUD CSS, dead tree cut | 57/64/42 |
| 2 | post chain, per-track LUT grade, kart material classes, mid-ground belt | 63/67/62 |
| 3 | road rebuilt as one crowned object, PV regrade, spatial particles | 65/63/60 |
| 4 | chase camera, **real cast shadows**, PV sky root-caused, env probe | 77/71/61 |
| 5 | six monolith handoffs, kart materials, event VFX | 75/68/73 |
| 6 | **arc-length/lane progress**, HUD markup, camera feel *(tier package reverted)* | — |
| 7 | kart diet, spline kinks, JS chunk split | **83/85/65** *(see note)* |
| 8 | **both 4× tracks built**, dead normal maps stripped, PV shadow split | 86/77/79 |
| 9 | coin density, **PV cast shadows via a split key**, four stale gates fixed | not scored |

**Wave 7's row was wrong and is corrected above.** It read `85/80/82 → 93 at r2`.
The only wave-7 artifact on disk is `tmp/aaa-plan/wave7-r3-critics.json`, whose
three totals are **83/85/65** — and there is no `wave7-r2-critics.json` at all,
for any wave except wave 1. **The 93 has no artifact behind it**, and a 93 would
have been the best score ever recorded, so it is the last number that should have
gone uncited. Treat it as unsourced rather than as a lost result.

Verified while correcting this: in all thirty reports on disk, the stored `total`
equals the sum of the eleven scores. The arithmetic is sound; only this row was.

**Blind A/B has picked the build over the original baseline 18/18 with zero
ties, every wave since wave 1.**

### Current measurements

Re-measured in wave 9 by running the previewer, not copied forward:

```
Comeback City  → Skyline Viaduct   11,643.4u · 44.78 s/lap · 134.35 s race
Penguin Village → Bayfront Sweep    11,128.7u · 42.80 s/lap · 128.41 s race
16 corners each · 0 kinks · longest straight 9.72 s / 8.76 s  (was 2.19 s)
15 beats at a 2.99 s / 2.85 s mean gap  (was one every 0.70 s)
30 coin rows per track

bundle 13.6/16 MiB raw · 10,948/12,000 KiB gz · all budget checks pass
largest JS gzip 253/400 KiB  (was 425.9 and failing)
18/18 frames · zero console errors
```

Two corrections to the wave-8 numbers this block used to carry. **Penguin
Village is 11,128.7u, not 11,678** — the previewer's arc-length solve disagreed
with the figure that was written down, and the tool's maths is now checked
against closed form (below), so the tool is the one to believe. Its lap time
moved for a second reason too: `MEAN_SPEED` for PV went 248 → 260, which was
INFERRED at the time. **MEASURED 2026-08-13** by `scripts/measure-mean-speed.mjs`
(three races per track, all usable, wall/game 1.000): CC 247.1, PV 240.7 —
the tracks do NOT share a number, because the 2026-08-08 difficulty retune's
corner-cost raise taxes PV's lap harder than CC's.

**"ALL CHECKS PASS" was never true of the test suite** — it described the bundle
budget only. `test:race` was red from wave 4 to wave 9, and `test:audio:kart` /
`test:kart-playable` were red until wave 9's GL-flag fix. Current honest state:

```
GREEN  build:kart · test:bundle:kart · test:race · test:track-visuals
       test:audio:kart (9/9) · test:kart-playable
RED    (none)

test:kart-proof was RETIRED 2026-08-03 rather than fixed — see below.
```

Axes still under the bar: **camera** (lowest throughout), **lighting**,
**materials**.

---

## What to do next, in order

**Items 1-4 are DONE and struck through — the queue starts at item 5.** They are
kept, not deleted, because each carries a correction worth reading once.

### ~~1. Wire the five kart bodies~~ · DONE (was already done at wave 8)

All four edits per body were present at `b9eb09e1` — imports, `Promise.all`,
`kartScenes`, `KART_OPTIONS`, `KART_NOSE_YAW` (`Math.PI / 2` on all five), and
manifest entries with render proofs. Wave 9 verified rather than redid it. **If
you are reading this as a task, it is not one.**

### ~~2. Coin rows~~ · DONE in wave 9 (`d9ae56d4`)

8 → 30 rows per track. Two things the old text here got wrong, both worth
carrying because they are general:

- The candidate sheets were **not** "hand-placed clear of every item-box row and
  boost pad by ±0.02". 14 of 30 CC rows and 11 of 30 PV rows sat inside that,
  eight and seven of them at 0.01. **Check a handoff's cheap claims.**
- ±0.02 was the wrong UNIT anyway. It was authored on the 2,897-unit lap, where
  it meant 58 world units — and 58 units is the real guard, the separation that
  keeps two pickups out of the same moment. Held as a fraction on an 11.6k lap
  it demands 233 units and blanks out over half the road. Same class as
  `startOffset` 0.03 → 0.0075. The gate in `race-content-playtest.mjs` now
  measures units against the tracks' own geometry.

30 (not 4× of 8) is also what leaves the coin ECONOMY alone: time-to-cap on
`COIN_FEEL.maxSpeedCoins` stays ~14 s. Multiplying by four would have capped the
whole field inside the first quarter-lap and pinned the +4% bonus permanently
on — flat, and larger than the entire ±3.5% top-speed spread between karts.

### ~~3. Re-baseline the previewer~~ · DONE in wave 9 (`d9ae56d4`)

Exits 0. `GROUND_TRUTH` was **not** simply updated to the new numbers — pinning
the current track's measurements is what made re-authoring a layout look like a
maths failure in the first place, and setting it to the tool's own output would
have made the check circular. It is now a **closed-form solver self-check**:
circles of radius 100/150/250 (the band corners are authored in) against exact
2πr and r. Worst arc-length error −0.019%, worst radius error 0.059%.

The estimator's envelope was measured while doing it: exact to r250, then 3.8%
at r450, 10.9% at r900, 13.9% at r1800. That tail is **not** a defect — past
`CORNER_EXIT_RADIUS` (450) the tool has already classified the geometry as
straight, where a radius figure means nothing.

Stale telemetry is now applicability-tested geometrically instead of used
blindly, so both tracks honestly report "pure geometric solve, ±3% until a race
is measured". Dead `KNOWN_CONTRAST_DEBT` / `KNOWN_SIGHT_DEBT` entries deleted
after verifying they suppressed nothing. `CONTRAST_GROUND_TRUTH` at PV p0.33 is
KEPT and still reproduces the measured frame.

### ~~4. Penguin Village cast shadows~~ · DONE in wave 9 (`4ea01c28`)

**Owner picked the split key.** 65% of the energy stays at 12° and carries the
approved sunset, 35% sits at 20° and casts. Shared azimuth, so the ground
projection is identical to six decimal places and the shadow falls on the side
it always would have — elevation sets a shadow's *length*, not its side. Total
diffuse conserved (3.315 + 1.785 = 5.100 = `palette.sunIntensity`). Comeback
City authors no `shadowKey` and keeps one light, bit-identical.

**The third option below cannot be built and the text is left only as a
warning:** a "shadow-only second light that contributes no diffuse" renders
nothing. three darkens by REMOVING the casting light's own contribution, so a
zero-intensity caster removes zero. `raceShadowRig.js` says it outright —
"shadow.intensity 1.0 removes ONE HUNDRED PERCENT of the key light".

20° was not a guess: `contactPatchKeyStrength` already encodes
`CONTACT_KEY_READABLE_SIN = 0.34 = sin(19.88°)`, which agrees with the wave-8
probe sweep to a tenth of a degree, arrived at independently.

<details><summary>Original wave-8 diagnosis, kept for the root-cause record</summary>

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

</details>

---

## THE QUEUE STARTS HERE

### 5. Rival AI over a 134-second race · M · ~~do this first~~ **DONE 2026-08-17**

Measured problem (Aug-13 capture): Blue Speed flag-to-flag 3/4 races, zero
rival lead changes, 6 s flag spread. Shipped fix, tuned over three measured
4-race rounds: personality pace ARCS over race phase (Blue fades, Purple Lab
surges lap 3 — the curves must genuinely cross), FIELD COMPRESSION (>2.5 s
behind the leader chases at 1.06, capped 1.18 with the player band), and
LEADER EASE (a rival >3 s clear of P2 eases 0.985 — rivals only; player leads
still hold to the line). Result: lead changes 2→6, spread 6.0→3.5 s, mid-race
position changes ~2×, autoplay 2/4 (baseline 1/4, n=4 noise; leaderEase is
the difficulty knob). Evidence: tmp/aaa-plan/rival-pacing-raw.json + the
harness tmp/aaa-plan/rival-pacing-capture.mjs. Same day, related:
graduated kart contact (wobble tier + rails side-swipe PIT,
scripts/test-contact-tiers.mjs).

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
11. **A browser test that waits on GAME time needs GL flags.** Headless chromium
    with no GL args silently runs rAF at ~2 fps; the engine's dt clamp turns
    that into ~9% speed game time, so a 3 s countdown takes 22 s. This is what
    made `test:audio:kart` and `test:kart-playable` look load-flaky for waves.
    Launch through `scripts/lib/chromium-gl-args.mjs` — never hand-roll args.
12. **Pixel A/B cannot verify a render change on this harness.** A control
    capture of IDENTICAL code differs on 4–20% of pixels (snow, boost flames,
    rival positions), with darkening ≈ brightening. Verify by walking the live
    scene graph: `window.__g2AmbientDebug.snow` → `.parent` up to the Scene.
    Measure a kart-riding light's direction as `position - target.position`,
    never from the world origin (it reads 1.99° instead of 20°).
13. **A gate that duplicates the data it checks stops checking it.** Four were
    found stale in wave 9, one red since wave 4. Derive from the source of
    truth, or check the code against closed form instead of the content.
14. **"Load-fake red" is a hypothesis, not a verdict.** Confirm it — the audio
    gate failed from a quiet start at load 5.3 and passes at load 12.0 now that
    the real cause is fixed. Blaming load hid a real bug for several waves.

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

WORK THE ORDER IN docs/AAA_NEXT_RUN.md, STARTING AT ITEM 5 — items 1-4 are DONE (wave 9: karts were already wired, coin rows 8->30, previewer re-baselined onto a closed-form solver check, PV cast shadows solved by SPLITTING the key 12deg look + 20deg caster). So: rival AI over a 134-second race, then post-chain and renderer tiers ONE FILE AT A TIME, then elevation, then the smaller open items. Do NOT redo 1-4.

STANDING RULES: never git add -A in a checkpoint; one monolith owner per wave; verify a failing package OWNS its fix's file; render-pipeline changes one at a time; verify any "module ships nothing" claim with grep; aaa-kart-overhaul-full must never be pushed. RESOLVED, do not relitigate: camera guard KEPT; Comeback City's Miami neon dusk grade is owner-confirmed; Penguin Village's arctic sunset is owner-confirmed and its 12-degree key is load-bearing.

When the list is done: run the full battery at load1 < 5 (build:kart, test:bundle:kart, test:kart-playable, test:race-proof, test:audio:kart), capture a final 18-frame set, run a final blind A/B against tmp/aaa-visual/baseline, and stop the loop with a summary. Never deploy the game. Never switch branches.
```
