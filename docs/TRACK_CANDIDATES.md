# Comeback City 4x — three candidate layouts

Three designs for the approved 4× Comeback City track, for the owner to choose
between. **Nothing here is built.** They are centerlines, plan views and
measured numbers, because iterating as plan views costs seconds and iterating
in geometry does not.

**The sheet to look at first: `tmp/track-candidates/index.html`** — all three
plan views at one shared scale, with today's track for size, readable on a
phone.

| | file | plan view | numbers |
|---|---|---|---|
| A — Bayfront Sweep | `tmp/track-candidates/candidate-a.mjs` | `tmp/track-candidates/preview/cc4x-a-bayfront-plan.png` | `preview/cc4x-a-bayfront-layout.json` |
| B — Downtown Deadline | `tmp/track-candidates/candidate-b.mjs` | `preview/cc4x-b-downtown-plan.png` | `preview/cc4x-b-downtown-layout.json` |
| C — Skyline Viaduct | `tmp/track-candidates/candidate-c.mjs` | `preview/cc4x-c-skyline-plan.png` | `preview/cc4x-c-skyline-layout.json` |

Runtime-shaped centerlines (`Array<{x, z}>`, exactly what `course.centerline`
takes) plus the waypoints/radii they were generated from:
`tmp/track-candidates/cc4x-*-centerline.json`.

---

## 1. How these were made, and why you can trust the numbers

Every number below comes from `scripts/track-layout-preview.mjs`, run with
`--speed 260` (Comeback City's measured mean speed). That tool mirrors the
shipped sampler and asserts itself against shipped ground truth on every run:
lap length to 0.00%, lap time to −0.09%. It also gates the two things that are
invisible until a capture — whether the driver can find the road against the
terrain (§7 of `docs/TRACK_DESIGN_NOTES.md`) and whether the chase camera can
show a corner in time (§8).

```bash
node scripts/track-layout-preview.mjs --file tmp/track-candidates/candidate-a.mjs \
  --speed 260 --out tmp/track-candidates/preview
node tmp/track-candidates/probe.mjs          # fast geometry loop, no browser
node tmp/track-candidates/export-centerlines.mjs
node tmp/track-candidates/build-sheet.mjs    # rebuilds index.html
```

Two authoring decisions are worth stating because they are the reason the
sheets come back clean:

1. **Centerlines are waypoints + per-corner fillet radii through the shipped
   `buildCenterline()`, never hand-placed points.** That is the recommendation
   in the design notes and the evidence is measured: Penguin Village
   (generated) has zero spline kinks; Comeback City (hand-placed) shipped two
   of radius ~12 on its own start/finish line. All three candidates report
   **0 kinks**, first try. It also makes radius a number you *state* rather
   than one you discover from the sheet.
2. **Candidate C's centerline was authored as a turn-and-run sequence**
   (`tmp/track-candidates/walk.mjs`) rather than by placing points. Corner
   *angle* is what decides whether a corner is a sweeper, a turn or a hairpin;
   placing points controls position and leaves angle to chance. That tool is
   how C got 7 sweepers and 2 hairpins out of 16 corners instead of the 13
   near-identical 30° turns the hand-placed draft produced.

All three borrow **Comeback City's palette verbatim**, so their contrast
verdicts *are* the reference build's verdicts (see §6). Authoring new palette
values now would mean tuning three palettes to throw two away.

---

## 2. The three theses in one line each

| | thesis | the lap in one sentence | build cost |
|---|---|---|---|
| **A** | **flow** | One hard braking point; long sweepers everywhere else, and a nine-second causeway across the bay into the only real hairpin. | Cheapest — no new structural systems. |
| **B** | **technical** | A city block circuit: square corners, staircase chicanes, three switchbacks, one Expressway where it all pays off. | Medium — 17 corners of downtown need 17 corners of city. |
| **C** | **set piece** | The lap crosses itself: a viaduct climbs back across the infield and passes 30 units over the start/finish straight at its crest. | Highest — a deck, an underside, supports, road-over-road. |

They are deliberately not three versions of one idea. A is the fewest, longest
corners; B is the most, tightest corners; C is a topology the other two cannot
have.

---

## 3. Candidate A — "Bayfront Sweep"

**11,647 u · 44.80 s lap · 134.4 s race · 16 corners · 9.08 s pass window**

Start straight east along the bay front, a three-element Palm chicane, the
Ocean Drive flyover, four flowing sweepers up the east side, the Marina dent
and squeeze, then the **Causeway** — 2,362 u of dead straight — into the
**Lighthouse Hairpin**, three long esses down the west side and the
**Boulevard Hairpin** onto the start straight.

### Corners

| # | p | dir | arc° | radius | min r | sec | type |
|---|---|---|---|---|---|---|---|
| C1 | 0.107 | right | 32.0 | 240.1 | 201.2 | 0.52 | turn |
| C2 | 0.126 | left | 60.6 | 141.9 | 111.1 | 0.58 | sweeper · chicane |
| C3 | 0.141 | right | 55.6 | 136.0 | 100.9 | 0.51 | sweeper · chicane |
| C4 | 0.159 | left | 23.3 | 177.2 | 113.7 | 0.28 | turn |
| C5 | 0.252 | right | 32.1 | 253.5 | 210.9 | 0.55 | turn |
| C6 | 0.302 | right | 38.2 | 227.9 | 185.0 | 0.58 | turn |
| C7 | 0.352 | right | 28.8 | 226.8 | 184.6 | 0.44 | turn |
| C8 | 0.397 | right | 20.4 | 224.9 | 166.5 | 0.31 | turn |
| C9 | 0.425 | left | 65.0 | 141.0 | 119.1 | 0.62 | sweeper · chicane |
| C10 | 0.440 | right | 65.0 | 132.2 | 107.5 | 0.58 | sweeper · chicane |
| C11 | 0.505 | right | 46.3 | 180.7 | 145.7 | 0.56 | sweeper |
| **C12** | 0.720 | right | **126.5** | **110.5** | 93.0 | 0.94 | **hairpin** (Lighthouse) |
| C13 | 0.775 | left | 66.3 | 217.9 | 189.4 | 0.97 | sweeper |
| C14 | 0.838 | right | 63.6 | 225.3 | 200.0 | 0.96 | sweeper |
| C15 | 0.902 | left | 74.3 | 211.2 | 186.9 | 1.05 | sweeper |
| **C16** | 0.979 | right | **131.3** | **115.2** | 97.0 | 1.02 | **hairpin** (Boulevard) |

8 sweeper · 2 hairpin · 6 turn · 2 chicanes · 5 left / 11 right · 0 kinks

### Straights

| from → to | units | seconds |
|---|---|---|
| **C11 exit → C12 entry (the Causeway)** | **2,361.8** | **9.08** |
| C16 exit → C1 entry (start straight) | 1,235.9 | 4.75 |
| C4 exit → C5 entry (the flyover run) | 1,009.9 | 3.88 |
| C15 exit → C16 entry | 621.9 | 2.39 |
| C10 exit → C11 entry | 611.9 | 2.35 |

### Beats — 15, one every 2.99 s (min 1.79 s, max 4.03 s)

`0.020` box · `0.080` pad · `0.120` box · `0.191` **crest launch** · `0.240`
ramp · `0.320` pad · `0.410` **shortcut** · `0.470` box · `0.550` pad ·
`0.620` box · `0.700` box · `0.765` ramp · `0.820` pad · `0.885` box ·
`0.960` box. Plus 30 coin rows, which are not beats.

### Elevation

Band p0.168–0.213, peak 28 u over 524 u, **16.8%** max gradient, free ballistic
launch off the crest. It is on the run out of the Palm chicane and **not** on
the causeway, deliberately: a crest in the middle of the overtaking straight is
exactly the shipped fault the sightline gate found (`cc-C4`, 0.44 s), and the
straight a pass is set up on is the one place forward sight has to be longest.
Crest to the next corner entry is 605 u = 2.3 s, clear of the 1.5 s rule.

### Verdict

**Hits 15 of 17 targets.** Misses:

- **Handedness 31%** against a ≥33% bar (5 of 16 corners turn left). This is
  structural, not a tuning miss — see §5.
- **Road/terrain value**, identically to B, C and the shipped track — see §6.

Everything else clears, including `--strict-sight`: **worst corner
announcement 1.85 s**, the only candidate where every corner clears the 1.5 s
authoring bar with no exceptions.

---

## 4. Candidate B — "Downtown Deadline"

**11,814.6 u · 45.44 s lap · 136.3 s race · 17 corners · 8.41 s pass window**

Start straight east along Exchange Avenue, two staircase chicanes south-east
through the blocks, down the east avenue, west along the **Expressway**, then
the **Old Town switchbacks** — two 130°+ stop-and-turns back to back — a third
chicane on the civic return, and a final 135° hairpin onto the start straight.

### Corners

| # | p | dir | arc° | radius | min r | sec | type |
|---|---|---|---|---|---|---|---|
| C1 | 0.088 | left | 89.4 | 146.1 | 122.9 | 0.88 | sweeper · chicane |
| C2 | 0.111 | right | 89.3 | 145.1 | 124.5 | 0.87 | sweeper · chicane |
| C3 | 0.161 | left | 89.3 | 145.0 | 123.6 | 0.87 | sweeper · chicane |
| C4 | 0.183 | right | 89.5 | 146.0 | 122.6 | 0.88 | sweeper · chicane |
| C5 | 0.272 | left | 89.6 | 134.2 | 110.3 | 0.81 | sweeper |
| C6 | 0.316 | right | 43.8 | 177.8 | 142.4 | 0.52 | turn |
| C7 | 0.357 | left | 44.0 | 177.2 | 137.1 | 0.52 | turn |
| C8 | 0.412 | left | 48.0 | 150.3 | 113.2 | 0.48 | sweeper |
| C9 | 0.463 | left | 40.7 | 160.4 | 118.9 | 0.44 | turn |
| C10 | 0.658 | left | 41.5 | 146.4 | 103.4 | 0.41 | turn |
| C11 | 0.707 | left | 47.3 | 167.3 | 133.3 | 0.53 | sweeper |
| **C12** | 0.759 | left | **130.1** | **96.0** | 77.6 | 0.84 | **hairpin** (Old Town 1) |
| **C13** | 0.807 | right | **137.6** | **95.7** | 78.5 | 0.88 | **hairpin** (Old Town 2) |
| C14 | 0.866 | right | 40.5 | 172.7 | 134.1 | 0.47 | turn |
| C15 | 0.905 | left | 81.8 | 144.3 | 122.0 | 0.79 | sweeper · chicane |
| C16 | 0.923 | right | 77.9 | 145.6 | 123.6 | 0.76 | sweeper · chicane |
| **C17** | 0.977 | left | **134.7** | **119.9** | 101.9 | 1.08 | **hairpin** (Exchange) |

9 sweeper · 3 hairpin · 5 turn · **3 chicanes** · **11 left / 6 right** ·
0 kinks · **radii 95.7–177.8**, the tightest and narrowest band of the three

### Straights

| from → to | units | seconds |
|---|---|---|
| **C9 exit → C10 entry (the Expressway)** | **2,186.1** | **8.41** |
| C17 exit → C1 entry (start straight) | 1,032.1 | 3.97 |
| C4 exit → C5 entry | 832.0 | 3.20 |
| C7 exit → C8 entry | 514.0 | 1.98 |
| C11 exit → C12 entry | 482.0 | 1.85 |

### Beats — 16, one every 2.84 s (min 1.82 s, max 3.77 s)

`0.030` box · `0.070` pad · `0.145` box · `0.228` **crest launch** · `0.300`
ramp · `0.340` box · `0.390` pad · `0.440` **shortcut** · `0.500` box ·
`0.570` pad · `0.640` box · `0.720` box · `0.790` ramp · `0.850` box ·
`0.890` pad · `0.960` box. Plus 30 coin rows.

### Elevation

Band p0.207–0.249, peak 26.7 u over 496 u, **17.1%** — the Convention Center
ramp, a short steep hump on the run out of the block staircase, with a free
launch. Crest to next corner entry 520 u = 2.0 s.

### Verdict

**Hits 15 of 17 targets.** Misses:

- **`--strict-sight`: two corners under the 1.5 s authoring bar.** C2 and C4,
  the second element of each staircase chicane, are announced at **0.82 s**
  against a 0.8 s hard gate. They are drivable on sight, but there is no room
  in them for an item decision or a line change. This is the real cost of a
  90°/90° staircase: the first corner turns the second one out of the lens, and
  the fix is to open the link between them — which is also what would stop them
  registering as chicanes. **The trade is chicanes vs. announcement, and B
  chose chicanes.**
- **Road/terrain value** — see §6.

B is the only candidate to hit every corner-variety target outright: 3 hairpins,
3 chicanes, 9 sweepers, and 35% of corners turning the non-dominant way.

---

## 5. Candidate C — "Skyline Viaduct"

**11,643.4 u · 44.78 s lap · 134.4 s race · 16 corners · 9.72 s pass window**

Harbour straight east, up and around the east lobe through the Plaza chicane,
west along the north edge through the Market and Rail chicanes, out to the far
west, then the **Viaduct**: 2,528 u of climbing diagonal straight that passes
**directly over the start/finish straight** at its crest, launches, and drops
into two stop-and-turn hairpins.

**The crossing is measured, not asserted.** The centerline passes within
**8.6 units** of itself at **p0.843** (viaduct) and **p0.009** (start straight)
— the same point of ground, 40 units apart vertically. `validateCenterline`
reports exactly **1 self-intersection**.

### Corners

| # | p | dir | arc° | radius | min r | sec | type |
|---|---|---|---|---|---|---|---|
| C1 | 0.119 | right | 53.2 | 206.7 | 177.0 | 0.74 | sweeper |
| C2 | 0.192 | right | 48.1 | 216.9 | 187.1 | 0.70 | sweeper |
| C3 | 0.246 | left | 39.7 | 164.4 | 111.9 | 0.44 | turn · chicane |
| C4 | 0.259 | right | 51.7 | 166.1 | 131.1 | 0.58 | sweeper · chicane |
| C5 | 0.339 | right | 60.7 | 200.0 | 175.8 | 0.82 | sweeper |
| C6 | 0.414 | left | 44.6 | 164.4 | 124.0 | 0.49 | turn · chicane |
| C7 | 0.428 | right | 43.5 | 168.5 | 126.9 | 0.49 | turn · chicane |
| C8 | 0.459 | left | 33.5 | 181.1 | 129.8 | 0.41 | turn |
| C9 | 0.479 | right | 36.5 | 175.7 | 130.3 | 0.43 | turn |
| C10 | 0.547 | right | 61.4 | 192.2 | 160.3 | 0.79 | sweeper |
| C11 | 0.584 | left | 33.7 | 194.0 | 150.6 | 0.44 | turn |
| C12 | 0.603 | right | 33.8 | 193.5 | 150.9 | 0.44 | turn |
| C13 | 0.641 | right | 69.1 | 167.5 | 139.8 | 0.78 | sweeper (onto the viaduct) |
| **C14** | 0.875 | left | **126.7** | **110.4** | 91.6 | 0.94 | **hairpin** (Viaduct) |
| **C15** | 0.939 | left | **124.4** | **105.9** | 88.8 | 0.88 | **hairpin** (Harbour) |
| C16 | 0.983 | left | 62.5 | 189.0 | 157.7 | 0.79 | sweeper |

7 sweeper · 2 hairpin · 7 turn · 2 chicanes · **7 left / 9 right (44%
non-dominant, the best of the three)** · 0 kinks

### Straights

| from → to | units | seconds |
|---|---|---|
| **C13 exit → C14 entry (the Viaduct)** | **2,527.9** | **9.72** |
| C16 exit → C1 entry (Harbour straight) | 1,383.9 | 5.32 |
| C4 exit → C5 entry | 784.0 | 3.02 |
| C9 exit → C10 entry | 678.0 | 2.61 |
| C5 exit → C6 entry | 668.0 | 2.57 |

### Beats — 15, one every 2.99 s (min 2.46 s, max 3.58 s)

`0.030` box · `0.090` pad · `0.160` box · `0.220` box · `0.300` pad · `0.380`
box · `0.450` ramp · `0.520` box · `0.575` **shortcut** · `0.630` ramp ·
`0.700` pad · `0.770` box · `0.825` **crest launch** · `0.905` box · `0.965`
pad. Plus 30 coin rows. The most evenly spread beat map of the three.

### Elevation — the set piece

Band p0.785–0.865, **peak 39.2 u** over 931 u, **13.5%** max gradient, free
ballistic launch. Nearly twice the shipped bridge's height at a *gentler*
gradient, because it is spread over more than twice the length. Crest sits at
p0.825, which puts ~30 u of air over the start/finish line, and leaves 582 u
(2.2 s) of descent before the viaduct hairpin's entry.

### Verdict

**Hits 15 of 17 targets.** Misses:

- **`--strict-sight`: two corners under 1.5 s.** C14, the viaduct hairpin, is
  announced at **1.3 s** and it is the crest that hides it — the corner arrives
  off a 30-unit drop. C16 is at 1.45 s, hidden frame-side. Both clear the 0.8 s
  gate. C14 is the one to watch in a build: it is a hairpin at the bottom of a
  descent, which is the most demanding thing on any of the three candidates.
- **Road/terrain value** — see §6.

C also has the longest straight of the three at 9.72 s, and the only second
straight that reaches the 5 s end of the 4–5 s target.

---

## 6. What all three miss, identically, and why it is not a layout problem

**The road/terrain value gate (§7 of the design notes) fails on every segment
of every candidate — exactly as it fails on Comeback City today.** The road
solves to luminance 46.9 against a 38.5–43.4 verge, i.e. **8%** against a 20%
bar, and what carries it in every shipped frame is the painted red/white kerb
at **81%** separation. The previewer calls that `edge-only`: reported, not
failed.

These candidates inherit Comeback City's palette verbatim, so their contrast
verdicts *are* the reference build's verdicts, which is the honest baseline for
comparing three layouts. It also means the palette work is real and still owed:
`--strict-contrast` fails on all four tracks including the shipped one, and a
new layout should be authored to that bar. **That is the step after a layout is
picked**, and doing it now would be tuning three palettes to throw two away.

### Handedness is topology, not tuning

A smooth convex loop turns one way. The other direction only appears where the
road is *concave* — a dent, a chicane, an esse, a crossing. That is why:

- **A** lands at **31%** however it is tuned: it is a flowing convex loop, and
  each extra esse adds one corner of each handedness, which moves the ratio
  almost not at all;
- **B** reaches **35%** by being a slalom of square corners — more corners, each
  deflecting more, which is the only thing that shifts the ratio;
- **C** gets **44%** for free, because a loop that crosses itself has a total
  turning of zero and therefore *must* turn both ways to close.

If using both drift directions matters, that is a reason to prefer B or C. It
is not a number to nudge on A.

---

## 7. Side by side

| target | A | B | C | today |
|---|---|---|---|---|
| lap length (~11,700 u) | 11,647 ✅ | 11,814.6 ✅ | 11,643.4 ✅ | 2,889.7 |
| lap / race (~45 s / ~135 s) | 44.80 / 134.4 ✅ | 45.44 / 136.3 ✅ | 44.78 / 134.4 ✅ | 11.11 / 33.3 |
| corners (15–25) | 16 ✅ | 17 ✅ | 16 ✅ | 5 |
| **overtaking straight (8–10 s)** | **9.08 ✅** | **8.41 ✅** | **9.72 ✅** | **2.18** |
| second straight (4–5 s) | 4.75 ✅ | 3.97 ⚠️ just under | 5.32 ⚠️ just over | 1.5 |
| beats (13–16, spread) | 15 @ 2.99 s ✅ | 16 @ 2.84 s ✅ | 15 @ 2.99 s ✅ | 16 @ 0.69 s |
| sweepers ≥ 6 | 8 ✅ | 9 ✅ | 7 ✅ | 3 |
| hairpins ≥ 2 | 2 ✅ | 3 ✅ | 2 ✅ | 1 |
| chicanes ≥ 2 | 2 ✅ | 3 ✅ | 2 ✅ | 0 |
| handedness ≥ 33% | 31% ❌ | 35% ✅ | 44% ✅ | 40% |
| radius spread | 110.5–253.5 ✅ | 95.7–177.8 ✅ | 105.9–216.9 ✅ | 110.5–179.7 |
| kinks 0 | 0 ✅ | 0 ✅ | 0 ✅ | 0 |
| elevation ≤ 18% | 28 u @ 16.8% ✅ | 26.7 u @ 17.1% ✅ | 39.2 u @ 13.5% ✅ | 20.9 u @ 17% |
| no blind corners (0.8 s) | 1.85 s ✅ | 0.82 s ✅ | 1.30 s ✅ | 0.52 s ❌ |
| every corner ≥ 1.5 s | all clear ✅ | 2 under ❌ | 2 under ❌ | 1 under |
| sight on the straight ≥ 2.5 s | 2.90 s ✅ | 2.71 s ✅ | 2.86 s ✅ | 1.65 s |
| road vs terrain ≥ 20% | 8% (kerb 81%) ❌ | 8% ❌ | 8% ❌ | 8% |

Every candidate is ~4.0× the shipped lap and turns its longest straight from
2.18 s into 8.4–9.7 s, which was the single most important target.

*(Today's column is measured against the working tree, so it already includes
the start/finish kink fix: the two r12 kinks are gone and the lap is 2,889.7 u
rather than the 2,897 u quoted in the design notes.)*

---

## 8. What happens after a letter is picked

1. **Author the palette** for the picked layout and re-run with
   `--strict-contrast` until it passes. A road nobody can find is not something
   to discover from a capture two waves later — and at 4× length the defect is
   4× larger.
2. **Place the coin rows** — ~30, scaling with length so the per-second density
   is unchanged. One `InstancedMesh`, so effectively free. They are already
   sketched in each candidate module (`candidate.coinRows`).
3. **Fix the candidate's own miss** before building it: A's handedness is only
   fixable by adding concavity (a second dent complex on the east side); B's
   two 0.82 s staircase corners want ~50 u more link, which costs the chicane
   flag; C's viaduct hairpin wants either a lower crest or 200 u more descent.
4. **Then build geometry**, and re-run the previewer afterwards so the JSON
   report lands in the record next to the frames.

Beats stay at **15–16 for the whole 45 s lap**. Do not multiply them. Adding
props proportionally recreates today's cram at four times the cost, and the
whole reason the pacing lands at ~3 s per beat is that the beat count did not
move.

---

## 9. Files

```
tmp/track-candidates/
  index.html                       the owner's comparison sheet (open this)
  candidate-a.mjs                  A — Bayfront Sweep    (runtime-shaped TrackDefinition)
  candidate-b.mjs                  B — Downtown Deadline
  candidate-c.mjs                  C — Skyline Viaduct
  candidate-kit.mjs                shared scaffolding; borrows CC's palette
  walk.mjs                         turn-and-run centerline walker (C was authored with it)
  probe.mjs                        fast geometry loop — length, deflections, straights
  solve-c.mjs                      closure/crossing search used while shaping C
  build-sheet.mjs                  rebuilds index.html from the previewer's JSON
  export-centerlines.mjs           emits runtime-shaped centerline JSON
  cc4x-*-centerline.json           the centerline data itself
  preview/                         previewer output: *-layout.json, *-plan.png
```
