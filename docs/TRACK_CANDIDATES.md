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
show a corner in time (§8 of the same document).

```bash
node scripts/track-layout-preview.mjs --file tmp/track-candidates/candidate-a.mjs \
  --speed 260 --out tmp/track-candidates/preview
node tmp/track-candidates/probe.mjs          # fast geometry loop, no browser
node tmp/track-candidates/gate-topspeed.mjs  # the two gates added in wave 7 (§7)
node tmp/track-candidates/export-centerlines.mjs
node tmp/track-candidates/build-sheet.mjs    # rebuilds index.html
```

Two of the numbers below are **not** measured at 260. A straight is not driven
at the lap mean, and a corner class is not decided by the ends of the radius
range. Wave 7 added a gate for each; both are in §7, both run from
`gate-topspeed.mjs`, and both are rows on the owner's sheet. A and B were
changed to pass them; C already did.

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

**11,678.4 u · 44.92 s lap · 134.75 s race · 16 corners · 9.22 s pass window
(8.38 s at top speed)**

Start straight east along the bay front, a three-element Palm chicane, the
Ocean Drive flyover, four flowing sweepers up the east side, the Marina dent
and squeeze, then the **Causeway** — 2,362 u of dead straight — into the
**Lighthouse Hairpin**, three long esses down the west side and the
**Boulevard Hairpin** onto the start straight.

### Corners

| # | p | dir | arc° | radius | min r | sec | type |
|---|---|---|---|---|---|---|---|
| C1 | 0.107 | right | 32.0 | 240.1 | 201.3 | 0.52 | turn |
| C2 | 0.125 | left | 60.6 | 141.9 | 111.1 | 0.58 | sweeper · chicane |
| C3 | 0.140 | right | 55.9 | 137.4 | 100.9 | 0.52 | sweeper · chicane |
| C4 | 0.159 | left | 23.3 | 177.2 | 113.6 | 0.28 | turn |
| C5 | 0.251 | right | 32.1 | 253.6 | 210.9 | 0.55 | turn |
| C6 | 0.301 | right | 38.2 | 228.0 | 185.1 | 0.58 | turn |
| C7 | 0.351 | right | 29.1 | 228.8 | 184.7 | 0.45 | turn |
| C8 | 0.396 | right | 20.4 | 224.9 | 166.6 | 0.31 | turn |
| C9 | 0.424 | left | 65.0 | 141.0 | 119.1 | 0.62 | sweeper · chicane |
| C10 | 0.438 | right | 65.2 | 133.5 | 107.5 | 0.58 | sweeper · chicane |
| C11 | 0.504 | right | 46.0 | 179.3 | 145.8 | 0.55 | sweeper |
| **C12** | 0.721 | right | **126.8** | **93.1** | **76.1** | 0.79 | **hairpin** (Lighthouse) |
| C13 | 0.776 | left | 66.0 | 217.1 | 189.6 | 0.96 | sweeper |
| C14 | 0.839 | right | 63.6 | 225.3 | 200.1 | 0.96 | sweeper |
| C15 | 0.902 | left | 74.3 | 211.2 | 186.9 | 1.05 | sweeper |
| **C16** | 0.979 | right | **131.3** | **115.2** | 97.0 | 1.02 | **hairpin** (Boulevard) |

8 sweeper · 2 hairpin · 6 turn · 2 chicanes · 5 left / 11 right · 0 kinks

**Changed in wave 7:** the Lighthouse fillet went 100 → 82, taking C12 from
110.5/93.0 to 93.1/**76.1**. At 93 its tightest instant sat inside the medium
band, so A had eight sweepers, four mediums and — measured rather than
asserted — **no genuine stop-and-turn anywhere on the lap**, which is the exact
opposite of its own "one hard braking point" pitch. 76.1 is a real hairpin and
still clear of the 72 floor that Penguin Village's W3 dent proved drivable. The
tighter fillet also shortens the corner-cut into the causeway, so the pass
window went **up**, 2,361.8 → 2,398.1 u, and every corner still clears
`--strict-sight` (worst announcement improved 1.85 → **1.93 s**).

### Straights

| from → to | units | seconds |
|---|---|---|
| **C11 exit → C12 entry (the Causeway)** | **2,398.1** | **9.22** (8.38 at 286) |
| C16 exit → C1 entry (start straight) | 1,236.0 | 4.75 |
| C4 exit → C5 entry (the flyover run) | 1,010.0 | 3.88 |
| C15 exit → C16 entry | 622.0 | 2.39 |
| C10 exit → C11 entry | 612.0 | 2.35 |

### Beats — 15, one every 2.99 s (min 1.80 s, max 4.04 s)

`0.020` box · `0.080` pad · `0.120` box · `0.191` **crest launch** · `0.240`
ramp · `0.320` pad · `0.410` **shortcut** · `0.470` box · `0.550` pad ·
`0.620` box · `0.700` box · `0.765` ramp · `0.820` pad · `0.885` box ·
`0.960` box. Plus 30 coin rows, which are not beats.

### Elevation

Band p0.168–0.213, peak 28 u over 525.5 u, **16.7%** max gradient, free
ballistic launch off the crest. It is on the run out of the Palm chicane and **not** on
the causeway, deliberately: a crest in the middle of the overtaking straight is
exactly the shipped fault the sightline gate found (`cc-C4`, 0.44 s), and the
straight a pass is set up on is the one place forward sight has to be longest.
Crest to the next corner entry is 605 u = 2.3 s, clear of the 1.5 s rule.

### Verdict

**Hits 17 of 19 targets.** Misses:

- **Handedness 31%** against a ≥33% bar (5 of 16 corners turn left). This is
  structural, not a tuning miss — see §6.
- **Road/terrain value**, identically to B, C and the shipped track — see §6.

Everything else clears, including both wave-7 gates (§7) and `--strict-sight`:
**worst corner announcement 1.93 s**, the only candidate where every corner
clears the 1.5 s authoring bar with no exceptions.

---

## 4. Candidate B — "Downtown Deadline"

**11,877.5 u · 45.68 s lap · 137.05 s race · 17 corners · 9.26 s pass window
(8.42 s at top speed)**

Start straight east along Exchange Avenue, two staircase chicanes south-east
through the blocks, down the east avenue, west along the **Expressway**, then
the **Old Town switchbacks** — two 130°+ stop-and-turns back to back — a third
chicane on the civic return, and a final 135° hairpin onto the start straight.

### Corners

| # | p | dir | arc° | radius | min r | sec | type |
|---|---|---|---|---|---|---|---|
| C1 | 0.088 | left | 89.4 | 146.1 | 122.9 | 0.88 | sweeper · chicane |
| C2 | 0.110 | right | 89.2 | 145.1 | 124.5 | 0.87 | sweeper · chicane |
| C3 | 0.160 | left | 89.3 | 144.9 | 123.7 | 0.87 | sweeper · chicane |
| C4 | 0.182 | right | 89.5 | 146.0 | 122.6 | 0.88 | sweeper · chicane |
| C5 | 0.271 | left | 89.6 | 134.2 | 110.3 | 0.81 | sweeper |
| C6 | 0.314 | right | 43.8 | 177.8 | 142.5 | 0.52 | turn |
| C7 | 0.355 | left | 44.0 | 177.2 | 136.9 | 0.52 | turn |
| C8 | 0.402 | left | 30.0 | 168.0 | 97.8 | 0.34 | turn |
| **C9** | 0.445 | left | **58.2** | **224.4** | 192.8 | 0.88 | **sweeper** (onto the Expressway) |
| C10 | 0.667 | left | 52.8 | 136.8 | 101.7 | 0.48 | sweeper |
| C11 | 0.709 | left | 36.4 | 176.2 | 125.3 | 0.43 | turn |
| **C12** | 0.760 | left | **130.1** | **96.0** | 77.6 | 0.84 | **hairpin** (Old Town 1) |
| **C13** | 0.808 | right | **137.4** | **95.1** | 78.5 | 0.88 | **hairpin** (Old Town 2) |
| C14 | 0.867 | right | 40.5 | 172.7 | 134.1 | 0.47 | turn |
| C15 | 0.905 | left | 81.8 | 144.2 | 122.0 | 0.79 | sweeper · chicane |
| C16 | 0.924 | right | 77.9 | 145.6 | 123.6 | 0.76 | sweeper · chicane |
| **C17** | 0.977 | left | **134.7** | **119.9** | 102.0 | 1.08 | **hairpin** (Exchange) |

9 sweeper · 3 hairpin · 5 turn · **3 chicanes** · **11 left / 6 right** ·
0 kinks · **radii 95.1–224.4**

**Changed in wave 7 — one edit, two misses.** T8/T9/T10 moved and T9's fillet
went 130 → 210.

- **The Expressway was under the bar at the speed it is actually driven.** At
  2,186 u it read 8.41 s at the lap mean and **7.64 s at 286**, which is the
  HUD number on exactly the kind of mark a pass is set up on. The leg is now
  2,600 u and the straight measures 2,407.9 u = **8.42 s at 286**.
- **B had no sweeper.** Every corner but the switchbacks sat in a 134–178
  sustained band — seventeen corners, one corner shape, which is the same "every
  corner is taken the same way" complaint the shipped track earns, just at a
  different radius. Pulling T8 north steepens the approach so C9's deflection
  goes 41° → 58.2°, which is what lets a 224 u radius buy a held drift instead
  of simply erasing the corner. It is deliberately the corner *onto* the
  Expressway: the one place carrying speed pays for the whole straight.

The knock-on is worth recording because it will happen again to whoever builds
the picked layout: a longer lap shifts every **progress-addressed** beat
backwards relative to the corners, and the Convention Center crest drifted onto
C5's shoulder, dropping it to exactly 1.50 s of announcement. Pulling the
elevation band back 0.011 of a lap restored it. **Re-run the sightline gate
after any centerline edit, however local it looks.**

### Straights

| from → to | units | seconds |
|---|---|---|
| **C9 exit → C10 entry (the Expressway)** | **2,407.9** | **9.26** (8.42 at 286) |
| C17 exit → C1 entry (start straight) | 1,032.0 | 3.97 |
| C4 exit → C5 entry | 832.0 | 3.20 |
| C11 exit → C12 entry | 498.0 | 1.92 |
| C13 exit → C14 entry | 464.0 | 1.78 |

### Beats — 16, one every 2.86 s (min 1.83 s, max 3.79 s)

`0.030` box · `0.070` pad · `0.145` box · `0.217` **crest launch** · `0.300`
ramp · `0.340` box · `0.390` pad · `0.440` **shortcut** · `0.500` box ·
`0.570` pad · `0.640` box · `0.720` box · `0.790` ramp · `0.850` box ·
`0.890` pad · `0.960` box. Plus 30 coin rows.

### Elevation

Band p0.196–0.238, peak 26.3 u over 498.9 u, **17.0%** — the Convention Center
ramp, a short steep hump on the run out of the block staircase, with a free
launch. Moved 0.011 of a lap earlier in wave 7 so the crest stops occluding C5;
see the change note above.

### Verdict

**Hits 17 of 19 targets.** Misses:

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

**Hits 17 of 19 targets.** Misses:

- **`--strict-sight`: two corners under 1.5 s.** C14, the viaduct hairpin, is
  announced at **1.3 s** and it is the crest that hides it — the corner arrives
  off a 30-unit drop. C16 is at 1.45 s, hidden frame-side. Both clear the 0.8 s
  gate. C14 is the one to watch in a build: it is a hairpin at the bottom of a
  descent, which is the most demanding thing on any of the three candidates.
- **Road/terrain value** — see §6.

C also has the longest straight of the three at 9.72 s (**8.84 s at top
speed**, the widest margin of the three), and the only second straight that
reaches the 5 s end of the 4–5 s target. **C is the only candidate that passed
both wave-7 gates unchanged** — its geometry is untouched this round.

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

## 7. The two gates wave 7 added, and what they caught

Both come from a wave-7 critic review of the round-0 sheet. Both are real holes
in how round 0 judged the candidates, and each caught something the original
gate passed. They run from `tmp/track-candidates/gate-topspeed.mjs`, which the
owner's sheet **imports** rather than reimplements, so the terminal and the
sheet cannot disagree about a verdict.

### 7a. The overtaking straight, measured at the speed it is actually driven

Round 0 measured every straight at Comeback City's lap mean of 260 u/s. That is
the right unit for a lap and the wrong one for a pass. The shipped autoplay
telemetry (`tmp/k2.5-launch-repro/telemetry-autoplay.json`, 898 rows) is
bimodal, not centred:

| band | share of the moving race | what it is |
|---|---|---|
| 220–240 u/s | **45.2%** | unboosted top speed |
| 280–300 u/s | **40.7%** | boosted; peak 295, p90 293 |
| everything else | 14.1% | the launch, spin-outs, corner exits |

So the mean is a number the kart is rarely *at*, and 285–286 is the HUD reading
on exactly the marks where a pass gets set up. The gate is now **≥ 8 s at
286 u/s**, with the 10 s ceiling still checked at cruise so a straight cannot
pass at boost by being tediously long the rest of the time.

*(The game's HUD says km/h but the value is world units per second: 2,897 u ÷
260 u/s = 11.14 s against a shipped lap of 11.15 s. No conversion is involved,
which is why "286 km/h" and "286 u/s" are the same number here.)*

**What it caught:** B's Expressway measured 8.41 s at the mean and **7.64 s at
286** — under the floor in the one situation the straight exists for. Fixed by
lengthening the leg 2,300 → 2,600 u. A and C already cleared it.

| | at 231 (cruise) | at 260 (mean) | **at 286 (boost)** |
|---|---|---|---|
| A — Causeway | 10.38 s | 9.22 s | **8.38 s ✅** |
| B — Expressway | 10.42 s | 9.26 s | **8.42 s ✅** (was 7.64 ❌) |
| C — Viaduct | 10.94 s | 9.72 s | **8.84 s ✅** |
| today | 2.46 s | 2.18 s | **1.99 s ❌** |

### 7b. Three *populated* radius classes, not just a wide range

The old "radius spread" target only checked the **ends** of the range, so a
layout whose corners all sit inside a 45-unit band passes it as long as one
corner is tight. That is exactly how B shipped seventeen corners with no
sweeper anywhere. The new gate requires at least one corner in each of three
separated classes.

Two details, stated because they are judgement calls rather than arithmetic:

1. **Each class is judged on the radius that defines it.** The previewer reports
   two per corner and they answer different questions. A **sweeper** is what you
   can hold on the throttle the whole way round, so it is judged on the
   *sustained* radius (arc ÷ angle) — a 217 u sweeper that pinches to 187 for
   one sample is still a sweeper from the seat. A **hairpin** is the instant
   that forces you off the throttle, so it is judged on the *tightest* radius —
   a corner whose mean is 96 but which never drops below 78 brakes like a
   hairpin. Both numbers are in every corner table above, so the call is
   checkable.
2. **The hairpin bound is < 90 with a floor of 72, not the < 70 that was asked
   for.** The previewer fails a sheet outright below **60** (`KINK_RADIUS`)
   because nothing below that was ever authored — it is the signature of
   centerline points sitting too close together. The tightest radius either
   shipped track authors is **72**, Penguin Village's W3 dent, and it is the
   only tight radius proven drivable in a real build. "< 70" is therefore a
   ten-unit slot between the proven floor and the tool's own defect alarm, and
   authoring into it would put a corner nearer the kink threshold than to
   anything ever driven. The *intent* — three separated populations instead of
   one 95–180 smear — is adopted in full. The count below 70 is reported by the
   gate so the deviation stays visible.

**What it caught:**

| | sweeper > 200 | medium 90–140 | hairpin < 90 | tightest |
|---|---|---|---|---|
| A | 8 | 3 | **1** (was **0** ❌) | 76.1 |
| B | **1** (was **0** ❌) | 3 | 2 | 77.6 |
| C | 2 | 1 | 1 | 88.8 |
| today | **0** ❌ | **0** ❌ | 2 | 81 |

A had eight sweepers, four mediums and **no genuine stop-and-turn on the lap** —
against a pitch whose whole thesis is "one hard braking point". B had two
switchbacks and fifteen corners inside a 134–178 band. In both cases the missing
class was the one the candidate's own thesis pushed it away from, and in both
cases one corner fixed it. C, whose thesis is a set piece rather than a corner
philosophy, already spanned all three.

Note the shipped track's row: **no sweeper and no medium**, only two hairpins
and two mid-range turns. That is the "every corner is taken the same way"
finding arriving from a third direction.

---

## 8. Side by side

| target | A | B | C | today |
|---|---|---|---|---|
| lap length (~11,700 u) | 11,678.4 ✅ | 11,877.5 ✅ | 11,643.4 ✅ | 2,889.7 |
| lap / race (~45 s / ~135 s) | 44.92 / 134.75 ✅ | 45.68 / 137.05 ✅ | 44.78 / 134.35 ✅ | 11.11 / 33.3 |
| corners (15–25) | 16 ✅ | 17 ✅ | 16 ✅ | 5 |
| **overtaking straight (8–10 s)** | **9.22 ✅** | **9.26 ✅** | **9.72 ✅** | **2.18** |
| **…at top speed, 286 u/s (§7a)** | **8.38 ✅** | **8.42 ✅** | **8.84 ✅** | **1.99 ❌** |
| second straight (4–5 s) | 4.75 ✅ | 3.97 ⚠️ just under | 5.32 ⚠️ just over | 1.5 |
| beats (13–16, spread) | 15 @ 2.99 s ✅ | 16 @ 2.86 s ✅ | 15 @ 2.99 s ✅ | 16 @ 0.69 s |
| sweepers ≥ 6 | 8 ✅ | 9 ✅ | 7 ✅ | 3 |
| hairpins ≥ 2 | 2 ✅ | 3 ✅ | 2 ✅ | 1 |
| chicanes ≥ 2 | 2 ✅ | 3 ✅ | 2 ✅ | 0 |
| handedness ≥ 33% | 31% ❌ | 35% ✅ | 44% ✅ | 40% |
| radius spread | 93.1–253.6 ✅ | 95.1–224.4 ✅ | 105.9–216.9 ✅ | 110.5–179.7 |
| **three populated radius classes (§7b)** | **8/3/1 ✅** | **1/3/2 ✅** | **2/1/1 ✅** | **0/0/2 ❌** |
| kinks 0 | 0 ✅ | 0 ✅ | 0 ✅ | 0 |
| elevation ≤ 18% | 28 u @ 16.7% ✅ | 26.3 u @ 17.0% ✅ | 39.2 u @ 13.5% ✅ | 20.9 u @ 17% |
| no blind corners (0.8 s) | 1.93 s ✅ | 0.82 s ✅ | 1.30 s ✅ | 0.52 s ❌ |
| every corner ≥ 1.5 s | all clear ✅ | 2 under ❌ | 2 under ❌ | 1 under |
| sight on the straight ≥ 2.5 s | 2.89 s ✅ | 2.72 s ✅ | 2.86 s ✅ | 1.65 s |
| road vs terrain ≥ 20% | 8% (kerb 81%) ❌ | 8% ❌ | 8% ❌ | 8% |

Every candidate is ~4.0× the shipped lap and turns its longest straight from
2.18 s into 9.2–9.7 s — **8.4–8.8 s even at boosted top speed** — which was the
single most important target.

*(Today's column is measured against the working tree, so it already includes
the start/finish kink fix: the two r12 kinks are gone and the lap is 2,889.7 u
rather than the 2,897 u quoted in the design notes.)*

---

## 9. What happens after a letter is picked

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
4. **Then build geometry**, and re-run the previewer *and*
   `gate-topspeed.mjs` afterwards so the JSON report lands in the record next
   to the frames.

Beats stay at **15–16 for the whole 45 s lap**. Do not multiply them. Adding
props proportionally recreates today's cram at four times the cost, and the
whole reason the pacing lands at ~3 s per beat is that the beat count did not
move.

**Progress-addressed beats are not invariant under a length change.** Every
`progress` in a candidate module — item boxes, pads, ramps, the shortcut, the
elevation band — addresses a *fraction* of the lap, so any centerline edit
slides all of them relative to the corners. Wave 7 lengthened B's Expressway by
300 units and that alone drifted the Convention Center crest onto C5's
shoulder, taking it from clear to exactly 1.50 s of announcement. Nothing about
C5 changed. Re-run the sightline gate after any centerline edit, however local
the edit looks.

---

## 10. Files

```
tmp/track-candidates/
  index.html                       the owner's comparison sheet (open this)
  candidate-a.mjs                  A — Bayfront Sweep    (runtime-shaped TrackDefinition)
  candidate-b.mjs                  B — Downtown Deadline
  candidate-c.mjs                  C — Skyline Viaduct
  candidate-kit.mjs                shared scaffolding; borrows CC's palette
  walk.mjs                         turn-and-run centerline walker (C was authored with it)
  probe.mjs                        fast geometry loop — length, deflections, straights
  gate-topspeed.mjs                the two gates in §7; build-sheet.mjs imports it
  solve-c.mjs                      closure/crossing search used while shaping C
  build-sheet.mjs                  rebuilds index.html from the previewer's JSON
  export-centerlines.mjs           emits runtime-shaped centerline JSON
  cc4x-*-centerline.json           the centerline data itself
  preview/                         previewer output: *-layout.json, *-plan.png
```
