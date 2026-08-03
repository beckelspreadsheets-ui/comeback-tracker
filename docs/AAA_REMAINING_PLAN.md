# AAA kart overhaul — plan for the remaining work (v3, audited)

**Rewritten 2026-08-03 after a 12-agent adversarial audit** (1.3M tokens, two
stages: investigate-to-refute, then a second auditor attacking the first).
Branch `aaa-kart-ci` @ `a7cd9a7b`.

**v2 of this plan would have failed on contact.** Three of its premises were
wrong in ways that produce immediate, expensive failure. This version records
what was verified, what was refuted, and — where a claim is still soft — says so.

Ends in a **preview deploy on a new branch**. Production and `main` untouched.

---

## Phase −1 — preconditions. Nothing dispatches before these · S

> **STATUS 2026-08-03: all three CLOSED.** Items 1 and 2 applied; item 3 ruled on
> by the owner. Dispatch is unblocked.

**1. ~~Set the worktree base ref~~ — DONE.** `{"worktree":{"baseRef":"head"}}`
merged into `.claude/settings.local.json` alongside the existing `permissions`
key. Confirmed absent from both the project and user settings beforehand. That
file is gitignored globally (`~/.config/git/ignore`), so **this setting does not
travel with the branch** — a fresh clone or another machine must set it again, or
every agent lands on `main` as described below.

**2. ~~Add `.claude/worktrees/` to `.gitignore`~~ — DONE.** Committed, so this
one does travel.

**Original text of item 1, kept because the failure mode is worth carrying:**

Claude-created worktrees default to `worktree.baseRef: "fresh"`, which branches
from the **remote default branch**. Here that is `main` — nine waves behind, an
obsolete 2025-era tree with a five-dependency manifest. Every dispatched agent
would land somewhere it cannot build, and would either fail or "helpfully"
rewrite from scratch. No settings file on this machine currently has a
`worktree` key.

```json
{ "worktree": { "baseRef": "head" } }
```

`baseRef` accepts only `"fresh"` or `"head"` — it cannot take a branch name.
Budget **~985 MiB per agent** once this is set (~557 MiB tracked + ~428 MiB
`node_modules`); the default's 0.45 MiB checkout is small only because it cannot
build the project.

(And why item 2 mattered: without it every agent worktree surfaces as untracked
files in every `git status` — noise that makes rule 7, *never `git add -A`*,
much easier to violate.)

**3. ~~Decide the pass bar~~ — ANSWERED 2026-08-03. Option (a), with the axis-11
wiring moved to Phase 5.** The bar is **eleven scored axes, every axis ≥ 8, no
total threshold**; `88/120` is deleted from the rubric. The instrument is now
committed at **`docs/AAA_CRITIC_BRIEF.md`** and is what critics are dispatched
with, so a rubric edit finally changes what gets scored.

Two things found while committing it:

- The ruling **changes no historical score**. All thirty critic reports in
  `tmp/aaa-plan/` already carry exactly eleven score keys — axis 11 has never
  been scored by anyone — so this writes down the instrument that has been
  running since wave 1. Every wave stays comparable; nothing needs re-scoring.
- **`88` was redundant even on its own terms.** Eleven axes each ≥ 8 forces a
  total ≥ 88, so the per-axis floor was always the binding constraint. Rule 4 of
  this plan — *a gate that duplicates the data it checks stops checking it* —
  describes how the number then drifted to a `/120` denominator unchallenged.

Under the new bar, still nothing passes. Wave 8's best is 86 with four axes under
8, and all three critics agree on three of them: **`materials`, `environment`,
`post`** (`lighting` is sub-8 for two of three). That is the live target list, and
it is a check on this plan's sequencing: Phase 2 aims at environment, materials
and lighting, Phase 6 owns post. No phase is aimed at an axis already passing.

**Phase 8's exit criteria are now defined.** The axis-11 scorer is a Phase 5
prerequisite — see that phase.

<details><summary>The original open question, kept for the record</summary>

The rubric said
"every axis ≥ 8 **and total ≥ 88/120**" across twelve axes. Axis 11, *Motion &
feel*, is video/telemetry-only and the still-frame critics score **eleven**. So
the 12-axis gate has never been evaluable and **"nothing has passed" is not a
measurement** — wave 10 could hit ≥8 on all eleven scored axes and there would
still be no defined answer to "did it pass".

Worse: the 11-axis instrument lives in an **uncommitted brief**, not in this
repo. Editing `AAA_NEXT_RUN.md` or the rubric changes nothing about what the
next critics actually score.

Owner's call, one of:
- **(a)** Declare the bar to be 11 axes, every axis ≥ 8, and delete `88/120`
  from the rubric; or
- **(b)** Stand up video/telemetry scoring for axis 11 — the harness already
  emits `desktop-10s.webm`, `mobile-10s.webm` and full autoplay telemetry, so
  this is wiring, not new capture.

Phase 7's exit criteria are undefined until this is answered.

</details>

---

## Phase 0 — corrections that DELETE work · S · do these first

Every item here either removes a later phase or fixes an instrument the later
phases are measured by. Cheapest work in the plan.

**1. ~~Fix the previewer's arc-length mirror~~ — DONE, and the headline claim
holds.** The previewer ran at three's default 200 arc-length divisions while
`makeTrackCurve` has scaled to ~3 units per division since wave 8. Fixed by
mirroring that scaling. **Comeback City's crest-caused announcement defect is
gone**, exactly as predicted — one of Phase 3's two named defects deleted.

Measured, before → after:

| | before | after |
|---|---|---|
| CC non-passing corners | C14 (crest) 1.30s, C16 (frame-side) 1.45s | **C16 only** |
| CC length / lap | 11643.4u / 44.78s | 11659.0u / 44.84s |
| PV length / lap | 11128.7u / 42.80s | 11144.1u / 42.86s |
| worst position gap vs shipped | CC 5.99u, **PV 10.12u** | 0 |
| step uniformity | CC ×0.745–1.267, **PV ×0.223–2.002** | ×0.958–1.012 |

**Two corrections to the wording above, which the measurement contradicts:**

- **C16 was never crest-hidden.** It is `frame-side` in both the before and the
  after report. Only C14 was ever a crest corner. Calling them "the *corners*"
  overcounted a one-corner defect as two.
- **The crest occlusion is not an artifact — the announcement shortfall was.**
  C14 is still crest-occluded after the fix, and so is PV's C5; the `hiddenBy`
  histogram is unchanged on both tracks (CC `crest:1`, PV `crest:1`). What the
  200-division sampler got wrong was *how much announcement the crest costs*:
  C14 measures **1.30s → 1.64s**, which crosses the 1.5s authoring bar and turns
  `tight` into `pass`. Nobody should go looking for a crest to move.

**A second finding, and the reason this drifted at all.** The sampler's header
comment claimed the duplication was "CHECKED", with a "ground-truth assertion
below [that] fails loudly instead of drifting quietly". **No such assertion
existed anywhere in the file**, and its quoted numbers (2896.9u, 11.14s lap) were
from the retired 2,897-unit loop. An unchecked duplicate then drifted for two
waves exactly as one does.

So the check now exists: `mirrorCheck()` reads the monolith's source text and
compares the four constants this sampler duplicates — curve tension, arc units
per division, width-table size, width smoothing passes. It cannot verify
behaviour, only an import could, and the monolith's size forecloses that; but it
fails loudly on the drift that actually happened, and on the monolith being
restructured so that the mirror can no longer be verified at all.

Each of the four rows was **individually falsified before being trusted** — the
first draft compared a hardcoded `224` against the monolith rather than the value
`makeWidthTable` uses, so three of the four rows would have passed while the file
did something else. The first negative test also caught the gate printing `FAIL`
and still exiting 0. Rule 2 earned its place twice in one item.

**2. ~~Rebuild the flatness metric~~ — DONE, committed as
`scripts/ground-flatness.mjs`.** All three audit faults fixed: the road is masked
**per pixel**, projected from the shipped curve through the previewer's own
camera (imported, not copied); the free σ threshold is **gone**, replaced by the
median σ, which needs no cut-off to defend; and one run reads exactly one
capture directory, so two sets cannot be spliced.

Measured on `wave8-r3`, the newest capture with both tracks on the 4x layouts:

| track | off-road median σ | road median σ | ratio |
|---|---|---|---|
| comeback-city | **1.15** | 2.94 | 2.6× flatter |
| penguin-village | 2.56 | 3.48 | 1.4× flatter |

**The localisation holds, but only for Comeback City.** PV's off-road ground is
close to its own road; CC's is not. So this is a CC ground problem, not "the
ground" in general — which narrows Phase 2 rather than justifying its full scope.

Note how much the retired threshold destroyed: at σ<2.0 the same frames read
58.9% vs 47.1% and 45.5% vs 43.3%, turning a 2.6× gap into 1.25× and a 1.4× gap
into nothing at all. A cut-off on a unimodal distribution discards most of the
signal — a stronger argument against it than "the threshold was arbitrary".

**Two things I could not deliver, stated plainly.** The r = −0.71 correlation
does not transfer to the new statistic, and it **cannot be recovered from the
archive**: the road mask is projected from the shipped curve, so it is only valid
on frames captured on that layout, and waves 1–7 were shot on the ~2.9k-unit
tracks. Only wave 8 onward is scoreable, which is one data point. Until several
more waves land, this is a **relative** measure between two builds of the same
layout — which is how a ground change will use it — and not a calibrated
predictor of the environment score. `--validate` says so rather than printing an
r from one point.

Second: the band still contains a thin strip of above-horizon geometry at its
top edge. Visible in the `--overlay` output, not yet excluded.

**`--overlay` exists because the first two masks were both wrong and only
looking caught it** — a per-scanline min/max mask striped the road red-and-green
once the whole lap was projected, and the quad rasteriser left 1px seams across
the corridor that leaked road into the off-road set. Neither showed up in the
numbers; both were obvious in one frame. Rule 1.

<details><summary>The original finding, kept for the record</summary>

The 62.3% figure that justified the largest work item does not survive audit:

- The measured band is **68% road on Comeback City** — a fixed vertical slab
  (`x∈[35%,65%]`) cannot exclude a perspective trapezoid.
- `σ < 2.0` is a **free parameter**: the σ distribution is unimodal with no
  valley there, and the same frames read **45.6% or 83.4%** under equally
  arbitrary radii.
- The Penguin Village line in v2 **spliced two capture sets** — "52.0%" from
  `tmp/aaa-visual/scratch` (where it is 7 of 9 marks, not 3) and "3 of 9" from
  `wave7-r3` (where the total is 48.1%).
- The script was never committed, yet v2 told a future agent to "re-run the
  flatness measure".

**What survives, and why it is still worth having:** within the measured band,
CC's off-road ground reads **67–69% flat against 48–59% for the road corridor**,
so the localisation to off-road ground holds; and the band statistic correlates
**r = −0.71 with the critics' environment score across seven waves**. It is a
cheap automated proxy for an expensive human gate. Rebuild it with **per-scanline
road masking** and a threshold justified against the σ distribution, **commit it
as a script**, and only then let a Phase 2 exit criterion depend on it.

</details>

**3. ~~Measure Penguin Village's mean speed~~ — DONE, and BOTH tracks were
wrong.** New harness `scripts/measure-mean-speed.mjs`; four races, two per
track, all four usable, 59–66 fps with the game clock tracking the wall clock to
within 0.7%.

| track | racing laps | length | measured |
|---|---|---|---|
| comeback-city | 47.44 / 47.46 s | 11659.0 | **245.7** |
| penguin-village | 45.33 / 45.39 s | 11144.1 | **245.7** |

`MEAN_SPEED` was **260 for both**, so every second-valued number the previewer
reported was 5.8% short. The plan said only PV needed measuring, because the
previewer's comment called CC "measured" — it was, from
`tmp/k2.5-launch-repro/telemetry-autoplay.json`, which drove the **retired
2,897-unit loop**. The same file is already rejected by the previewer's own
staleness check for grading lap time, while being trusted to set the scale lap
time is computed *from*. Rule 4, exactly.

The old comment's *reasoning* about PV — that once wave 8 moved the ice off the
racing line, "PV should mean what CC means" — turns out to be **right**: the two
measure identically to four significant figures. It was the inherited number
that was stale, not the argument for sharing it.

**This deleted Phase 3's SECOND named defect.** Corner announcement is
units ÷ mean speed, so a 5.8% overstatement of speed understated every
announcement. `C16@0.983` moves 1.45s → **1.54s**, crossing the 1.5s authoring
bar. Both tracks now report **zero non-passing corners**, and `--strict-sight`
exits 0 for the first time. Caveat worth keeping: C16 clears by 0.04s, so it is
marginal rather than comfortable, and a future layout edit could push it back.

**4. CI capture reaches 2 of 9 marks.** Hypothesis (still unverified): under
SwiftShader the frames are genuinely slow, the dt clamp turns that into slow
motion, and the race ends in *game* time before later marks arrive. Fix by
driving game time directly rather than waiting on it. **Labelled a hypothesis
because it has not been tested.**

---

## Phase 1 — score wave 9 · S · checkpoint, not a gate

Wave 9 is unscored and shipped a lighting change. Only the **lighting** sub-item
in Phase 3 is genuinely score-gated; everything else is a named defect that needs
fixing regardless. Do not block other phases on this.

When reading the result: wave 8's environment regression is **carried entirely by
one critic** (−3). A wave-10 re-score that does not reproduce it is *not*
automatically evidence the fix worked.

---

## Phase 2 — THE MONOLITH BRANCH · single owner, serialized · L

The audit moved three items into this branch that v2 had outside it. All of the
following edit `ComebackCityThreeKartRace.jsx` and **share the `attachCharacter`
call site at `:9509-9551`**:

| item | where |
|---|---|
| near dressing | `:5981` `addDistrictsAndProps`, `:7011` `addPenguinVillageDressing`, + 9 monolith-local helpers |
| **ground material** | `:4128-4415` — **not** `createTrackMesh.js` |
| atlas recolour | `KENNEY_BODY_SWATCHES:2940`, `KENNEY_SWATCH_CONTRAST:2949`, `makeKartPaletteTexture:2951`, sites `:9538/:9600` |
| driver seat anchor | anchor `:1105-1107`, overwritten `:3296` (authored bodies) and `:3336` (Kenney) |

**`createTrackMesh.js` is a dead tombstone.** It is not in the kart build —
`vite.config.kart.js` has a single HTML entry and `race-playtest.html` is never
bundled. It reaches the player through nothing. It **is** live to `test:race`
(`race-content-playtest.mjs:4184`, `:4314`), so do not delete it.

### Three hazards inside this branch

**The contrast gate is a tripwire.** Comeback City has **zero road-vs-terrain
margin on 7 of 7 segments** — any darkening of `palette.ground`
(`comebackCity.js:147-165`) turns the previewer's contrast gate red and it exits
non-zero. Penguin Village is exposed at exactly one segment,
`glacier-shore@0.290`. Check the gate on every ground-material iteration.

**The atlas is a two-file system with a silent failure mode.** Recolour lives in
the monolith; the **per-texel paint classifier** lives in
`kartMaterials.js:112` (`PAINT_CHROMA = [0.08, 0.3]`) and reaches the shader via
`toonRimShader.js:724/765`. Changing `KENNEY_SWATCH_CONTRAST` can push swatches
across the 0.08 boundary and **reclassify paint as rubber** in a file this
package does not own. `kartMaterials.js:110-113` documents exactly this trap.
Either own both files in this branch or hold `PAINT_CHROMA` fixed and verify
classification after every swatch change.

**The atlas cap is CHEAP to fix, not expensive.** v2 said the 0.247 value-spread
"needs a new atlas cell, not a cleverer remap". **Refuted.** Swatch1 is not one
flat value — it carries a 14-step orange→amber gradient (G 157→114) that is
invisible to HSL-L but present in luma. Re-keying the remap on **luma** recovers
~0.12 raw / **~0.25 after the ×2.1 expansion at `:3036`**, with no new atlas
cell. Do the cheap fix first.

### Scope and axes

Near-ground work is two code paths — `palette.ground` +
the mottle/relief block at `:4218-4265`, and
`dressingCount`/`buildDressingDensity` `:521-610` driving `:6089/:6166/:7043/:7064`
— and it touches **three** failing axes, not two: environment (5), materials (6)
and lighting (6). Its grounding behaviour is gated by `raceShadowRig`, not free.
**Re-score materials after this lands** rather than assuming sufficiency.

Secondary owner to be aware of: `race/tracks/trackVisualSchema.js` owns the
`?trackVisuals=1` half of dressing. That path is dark by default
(`trackVisualsEnabled` false at `:7451`), so it only matters if this branch is
scoped to include the trackVisuals experiment.

---

## Phase 3 — camera · M · AFTER Phase 0's previewer fix

**PHASE 0 DELETED BOTH NAMED DEFECTS. There is no corner work left here.**

Re-measured 2026-08-03 after Phase 0 items 1 and 3, both tracks now report
**zero non-passing corners**, and `--strict-sight` exits 0 for the first time:

| defect | deleted by | how |
|---|---|---|
| `C14@0.875` crest | item 1, arc-length mirror | announcement 1.30s → **1.64s** |
| `C16@0.983` frame-side | item 3, mean speed 260 → 245.7 | announcement 1.45s → **1.54s** |

**Neither was a camera problem.** Both were measurement errors in the tool that
reported them — one sampler running at the wrong arc-length resolution, one unit
conversion carried over from a retired track. No camera, layout or elevation
change was involved in either.

Two cautions before treating this as free. C16 clears the 1.5s authoring bar by
**0.04s**, which is thin enough that a layout edit could push it back — and the
whole result rests on the mean speed being right, so it is worth re-checking
after any physics or rival-AI change. C14 is also **still crest-occluded**; it
simply now has enough announcement to pass, so do not read this as "the crest
was imaginary".

**What actually remains in this phase is the rival readability item below**,
which is unaffected by any of the above.

Camera is a **genuine two-file split**, not monolith-dominant and not
`chaseCameraFeel.js`-only:

- The monolith owns the rig and the seed values — 6 real symbol sites
  (`:424`, `:9376`, `:11591-11593`, `:11600`), handing `advanceChaseFeel` 17
  named inputs including `boomBase`, `eyeBase`, `fovBase`, `lookUpBase`.
- `chaseCameraFeel.js` (1052 lines, camera-only) owns the **dynamics** —
  `CHASE_FEEL_DEFAULTS:105`, `advanceChaseFeel:650`, `solveFramingCorrection:957`.

The surviving camera item is **rival readability at distance** ("a rival 40m up
the road is a flat coloured lump"), which shares a root with the atlas work in
Phase 2 — sequence them together.

---

## Phase 4 — elevation · M · and the coupling that reverses the order

**MISSING COUPLING, found by the audit: elevation mechanically DELETES the near
dressing Phase 2 adds.** The `onElevatedSpan` guard (defined `:625`) skips
near-dressing at **8 call sites** — `:2494`, `:2742`, `:2756`, `:6089`, `:6166`,
`:7023`, `:7043`, `:7064` — and today it blanks **8.0% of Comeback City's lap**
(band 0.785–0.865) and **4.7% of Penguin Village's** (0.1665–0.2136). A Phase 4
that adds relief across the lap, with that guard unchanged, deletes the dressing
Phase 2 just paid for.

(A ninth near-dressing run, the iceberg ring at `:7219+`, is deliberately exempt
because it forces its own `y` — the comment at `:7223` says so. Verified: a raw
`grep -c` returns 11, which is the definition plus two comments plus the eight
real sites. Counting textual hits instead of call sites is how this kind of
number goes wrong.)

So the two are not independent and the naive order is wrong. Either:
- change the guard so elevated spans carry their own near dressing, **then** add
  relief; or
- author the relief only outside the dressed bands and accept less grade.

Resolve this **before** either phase, not between them.

---

## Phase 5 — rival AI over a 134-second race · M

`rivalRacers.js`, 7 monolith call sites. Nothing is broken — personalities tuned
over 34 seconds have never been checked over 134. A design pass.

Now measurable rather than eyeballed: autoplay telemetry runs at real speed since
the GL-flag fix, so judge on lead changes and gap-over-time across the full race.

**PREREQUISITE — wire axis 11 before the design pass, not after.** This is the
phase whose work lands on *Motion & feel*, and it is the only phase that does. Do
the design pass without the scorer and it is the one piece of the overhaul with
no gate at all, judged by the same eyeballing this phase exists to replace.

The scorer is wiring over artefacts that already exist — `desktop-10s.webm`,
`mobile-10s.webm`, and autoplay telemetry that has run at real speed since
`f2d4b026`. Adding it: score `motionFeel` into `scores`, restore the row in the
rubric table, and update the header of `docs/AAA_CRITIC_BRIEF.md`. **Do not
renumber the other axes** — ten waves of history reference them — and **do not
reintroduce a total threshold**; with twelve axes each ≥ 8 the total is implied
again, which is how the deleted one came to be wrong.

Sequencing consequence: Phase 8 can run its final critics on eleven axes if the
scorer is not in by then. It cannot run them on twelve *and* have Phase 5's work
be the first thing ever measured on the new axis — the axis would be scoring
itself into existence with no prior reading to compare against. Wire it first,
take a baseline reading on the current build, then do the design pass.

---

## Phase 6 — post-chain and renderer tiers · M · ONE CHANGE AT A TIME

The wave-6 revert is the precedent and it was **four files**, so the discipline
must name all of them — including **`vite.config.kart.js`**, which v2 left
outside the fence. The bundle coupling is documented history, not a forecast:
reverting the chunk split immediately broke the largest-JS-gzip check by 26 KiB.

**Expect a false red.** `RACE_RENDER_SCALE` is imported by
`scripts/race-content-playtest.mjs`, so changing it will turn `test:race` red as
a **fixture mismatch, not a regression**. Update the fixture in the same change.

`RACE_RENDER_SCALE` is 0.85 desktop / 0.6 mobile. The 0.6 branch is unreachable
**on phones** (`touchControls === false` skips the soft lock at `:9230-9234`) but
is reachable on any non-touch surface taller than 0.74 aspect — a narrow desktop
window, docked devtools, a portrait headless capture. **Do not delete it as
dead**, and do not assume phones are already on a cheap path.

---

## Phase 7 — remaining items · S

- **On-demand kart pool, runtime half** — real, but justify it on **first-load
  time and VRAM**. The bundle-budget rationale is foreclosed by the manifest in
  five separate places.
- ~~Legacy 2D minimap~~ — **dropped. Not a defect.** `raceTracks.js:128` affects
  only a dev harness excluded from the build, and the kart HUD's minimap
  auto-normalises. Effort priced against it is wasted.
- ~~Driver hero rim~~ — **dropped, already shipped.** Both tracks carry a
  `heroRim`; the comment at `:2360` claiming CC ships rim-off is stale. Fix the
  comment. Only the seat anchor is real (Phase 2).
- ~~Fallback kart `rim: true`~~ — **dropped, already fixed.** Do not re-open from
  `docs/AAA_RESTART_PROMPT.md:20`; that note is stale and additionally mis-lists
  `tireMat`, which is excluded on purpose.
- **Near-plane snow — re-scoped.** Tuning `SNOW_NEAR_FADE` is a **no-op** on the
  reported artifact: the blobs are the monolith's **ambient Points cloud**, not
  the streak system in `raceParticles.js`. Severity is also lower than the critic
  implied — ~1.8 flakes within the ≥44 px band at any instant, so one or two
  conspicuous blobs, not a field.

---

## Phase 8 — verify, then preview deploy · S

1. Full battery at load < 5: `build:kart`, `test:bundle:kart`, `test:race`,
   `test:track-visuals`, `test:audio:kart`, `test:kart-playable`, the previewer,
   `test:core`.
2. Final capture, critics, blind A/B against baseline. **Exit criteria (defined
   2026-08-03):** three independent critics dispatched with
   `docs/AAA_CRITIC_BRIEF.md`; every scored axis ≥ 8 on all three; no automatic
   blockers; blind A/B still picks the build over baseline. No total threshold.
   Score twelve axes if Phase 5 landed the axis-11 scorer, eleven if not — the
   brief's header states which, and it is the authority over this line.
3. Preview deploy:

```
npm run deploy:kart:preview      # --branch=aaa-preview
```

- Account **Showcasedesigns.co@gmail.com** (`9f01a1b3…`), verified, the only
  account this token reaches. Never Abel's.
- **Never `npm run deploy:kart`** — it targets `--branch=main`, which is
  production for this Pages project.
- Verify the deployed origin serves the new build rather than trusting the
  deploy output.

**Out of scope:** production deploy and `main` (owner's call, never given), and
the ordinal roster (blocked on the owner's art, not on engineering).

---

## Parallelism: an honest reckoning

The manager-of-branches model needs work that can actually be split. **This
codebase mostly cannot be, yet.** After audit, the genuinely
independent-of-the-monolith work is:

- `scripts/track-layout-preview.mjs` — previewer sampler + flatness metric
- `scripts/race-content-playtest.mjs` — the `RACE_RENDER_SCALE` fixture
- `rivalRacers.js` internals, if the design pass avoids its 7 call sites

Everything else — dressing, ground, atlas, seat anchor, camera seeds, the
elevation guard — lands in one 12.6k-line file, and the project's own rule
(*one monolith owner per verified capture*) exists because ignoring it already
cost Penguin Village three waves.

So: **run Phase 0 and Phase 5 as parallel branches; run Phase 2 as a single
serialized owner.** Widening beyond that means decomposing the monolith first,
which is its own project and is not in this plan.

---

## Corrections ledger — what v2 got wrong

Kept so the next reader can calibrate how much to trust an inherited plan.

| v2 claim | verdict |
|---|---|
| P2 ground material is self-contained in `createTrackMesh.js`, 0 monolith refs | **wrong** — that file is a dead tombstone; shipped ground is monolith `:4128-4415` |
| "camera + ground material" is a safe parallel first-test pair | **wrong** — ground is monolith, so the pair collides with dressing |
| Only 3 of 9 items own monolith work | **wrong** — 4+, and the count came from a circular check |
| CC 62.3% flat off-road band | **band is 68% road**; threshold arbitrary; direction survives, number does not |
| PV "52.0% flat, 3 of 9 marks" | **spliced two capture sets** |
| Atlas cap "needs a new atlas cell, not a remap" | **refuted** — luma re-key recovers ~0.25, no new cell |
| Snow: tune the existing `nearFade` | **no-op** — wrong particle system entirely |
| Legacy minimap is an open item | **not a defect** |
| Camera "needs the same +1 as six other axes" | **four** other axes sit at min 7 |
| `AAA_NEXT_RUN.md` introduced the 88/110 conflation | **upstream** — it faithfully reports an uncommitted brief's scale. *Resolved: the brief is committed at `docs/AAA_CRITIC_BRIEF.md` and the threshold is deleted.* |
| Elevation and dressing are independent | **wrong** — `onElevatedSpan` deletes dressing on 8 sites |
| Previewer's "hidden by crest" corners are `CC C14, C16` | **C16 was never a crest corner** — it is `frame-side` before and after. A one-corner defect counted as two. |
| Those corners are "an artifact of a 200-division sampler" | **half right** — the crest occlusion is real and still there on both tracks. The *announcement shortfall* was the artifact: C14 measured 1.30s, actually 1.64s. |
| The previewer's sampler duplication is "CHECKED" by a ground-truth assertion | **no such assertion existed**, and its quoted numbers were from the retired 2,897-unit loop. Written in v1, carried through v2 and v3 unchallenged. |
| Wave 7 scored `85/80/82 → 93 at r2` | **unsourced** — found while committing the brief. The only wave-7 artifact reads **83/85/65**, and no `-r2` file exists for any wave after wave 1. A 93 would be the best score ever recorded. Corrected in `AAA_NEXT_RUN.md`. |

## Rules this plan leans on

1. **Read the frames.** Wave 6: green build, zero console errors, 18/18 frames,
   cyan noise. Only looking caught it.
2. **A check that could not have failed is not a check.** Two audit rounds and
   the v2 plan all shipped verdicts resting on greps that were guaranteed to
   return what they returned.
3. **Render-pipeline changes one at a time**, and name every file in the fence.
4. **A gate that duplicates the data it checks stops checking it.**
5. **"Load-fake red" is a hypothesis, not a verdict.**
6. **Verify a claim before carrying it forward** — this rewrite dropped four
   items that were already fixed or never real.
7. **Never `git add -A`.** Stage owned paths explicitly.
