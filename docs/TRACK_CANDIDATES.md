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
node tmp/track-candidates/gate-topspeed.mjs  # the two gates added in wave 7 r1 (§7)
node tmp/track-candidates/gate-width.mjs     # the road-width gate, wave 7 r2 (§8)
node tmp/track-candidates/export-centerlines.mjs
node tmp/track-candidates/build-sheet.mjs    # rebuilds index.html
```

Two of the numbers below are **not** measured at 260. A straight is not driven
at the lap mean, and a corner class is not decided by the ends of the radius
range. Wave 7 added a gate for each; both are in §7, both run from
`gate-topspeed.mjs`, and both are rows on the owner's sheet. A and B were
changed to pass them; C already did.

**Six of the numbers below do not come from the previewer at all.** Road width
is the one axis the previewer reports without measuring — its `minWidth` /
`maxWidth` are the *authored* ribbon extremes, the numbers a designer typed,
not what the runtime hands the camera. §8 is the gate that closes that hole,
it runs from `gate-width.mjs`, and it changed A and C. B passed it unchanged.

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

### Width — the Lighthouse squeeze

`62 · 48 · 56 · 46 · 64 · 44 · 52` (delivered 44–64 u, ratio 1.455, 5 levels).

**Changed in wave 7 round 2.** The causeway is the widest road on the lap and
now empties straight into the narrowest: the Lighthouse ribbon went 54 → **44**,
a 20-unit squeeze arriving exactly where A's one hard braking point is. The
ribbon also starts at 0.695 rather than 0.72 — roughly two standard deviations
of the runtime's width smoother ahead of the corner, so the full 44 u is
delivered *at* the entry instead of half of it (§8 explains why that is not a
detail). The palm chicane went 50 → 48 for the same reason at a smaller scale.
Grid width is 60.8 u, so nothing was squeezed onto the start line.

### Verdict

**Hits 22 of 24 targets.** Misses:

- **Handedness 31%** against a ≥33% bar (5 of 16 corners turn left). This is
  structural, not a tuning miss — see §6.
- **Road/terrain value**, identically to B, C and the shipped track — see §6.

Everything else clears, including all three wave-7 gates (§7, §8) and
`--strict-sight`: **worst corner announcement 1.93 s**, the only candidate where
every corner clears the 1.5 s authoring bar with no exceptions.

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

### Width — unchanged, and the only candidate that needed nothing

`60 · 46 · 52 · 64 · 44 · 50` (delivered 44–64 u, ratio 1.455, 5 levels).

B is the one candidate that passed the wave-7 round-2 width gate **as authored**,
and for a reason worth recording: its width was already coupled to its layout.
The Expressway is the widest road on the lap at 64 and the Old Town switchbacks
are the narrowest at 44, they are adjacent, and the step lands at p0.66 — one
sample before C10, the first switchback. That is an 18.1-unit straight-to-hairpin
delta and a 0.57 s 8-unit squeeze without a single edit. Where A and C authored
a width *range*, B had authored a width *decision*.

### Verdict

**Hits 22 of 24 targets.** Misses:

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

### Width — rewritten in wave 7 round 2

`60 · 54 · 44 · 56 · 62 · 42 · 54` (delivered 42–62 u, ratio 1.476, 4 levels).

C was the **worst of the three** on the width gate and by a distance: its
authored 46–60 undulated so gently that the fastest 8-unit change on the whole
lap took **1.37 s** against the shipped track's 0.29, and only 4% of frames
carried any width contrast at all. On the candidate whose entire pitch is a set
piece, that was the most damaging place for it to be true.

The rewrite gives C a width story that matches its elevation story. The market
row is the technical middle at 44. The **viaduct opens to 62** — it is the pass
window, and it is the only place on any of the three candidates where the road
gets *wider as it climbs*, which is a large part of why the crossing reads as an
event. Both hairpins at the bottom of the 39-unit descent sit at **42**, the
narrowest road on any candidate, and the ribbon starts at 0.85 so the full 42 is
delivered by C14's 0.875 entry. A 54 u harbour approach opens the road back out
across the start/finish line so the grid does not form on the narrowest road on
the track (delivered grid width 59.3 u).

**No geometry moved.** The centerline, every corner, every straight, the
self-crossing, the sightline verdicts and the beat map are byte-for-byte what
they were — re-running the previewer after the edit returns the same 11,643.4 u,
16 corners, 9.72 s straight and 1.3 s worst announcement.

### Verdict

**Hits 22 of 24 targets.** Misses:

- **`--strict-sight`: two corners under 1.5 s.** C14, the viaduct hairpin, is
  announced at **1.3 s** and it is the crest that hides it — the corner arrives
  off a 30-unit drop. C16 is at 1.45 s, hidden frame-side. Both clear the 0.8 s
  gate. C14 is the one to watch in a build: it is a hairpin at the bottom of a
  descent, which is the most demanding thing on any of the three candidates.
- **Road/terrain value** — see §6.

C also has the longest straight of the three at 9.72 s (**8.84 s at top
speed**, the widest margin of the three), and the only second straight that
reaches the 5 s end of the 4–5 s target. C passed both round-1 gates unchanged
and needed the largest width rewrite of the three in round 2 — but **its
geometry has not been touched in either round.** Every corner, straight and
sightline number above is the round-0 solve, re-measured.

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

## 7. The two gates wave 7 round 1 added, and what they caught

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

## 8. Road width — the third axis, and the runtime line it needs

This section exists because of one sentence from the wave-7 round-2 blind-A/B
judge, written after that judge had picked the overhaul build over the baseline
**18 pairs out of 18**:

> Across 18 frames and two tracks the road is the same width with the same
> gentle constant-radius bends and one crest. Nothing in the set shows a
> hairpin, an elevation drop, a narrowing, or a fork. Any 4× length track
> candidate should be judged on whether a randomly sampled frame is identifiable
> as a specific corner — none of these 18 are. **Bring candidates that vary road
> width and radius, not just length.**

Radius was already gated twice (§7b, and the corner-variety rows in §9). Width
was **authored in every candidate and measured in none**, because the previewer
reports `road.minWidth` / `road.maxWidth` — the authored ribbon extremes. A
sheet that says "46–64" while the camera never sees the difference is worse than
a sheet with no width row at all. `tmp/track-candidates/gate-width.mjs` closes
that, and the owner's sheet imports it rather than reimplementing it, so the
page and the terminal cannot disagree.

### 8a. What it found: authoring MORE width at 4× delivers LESS

The runtime's width profile is `makeWidthTable` in the monolith — 224 samples
indexed by **progress**, smoothed with 14 passes of a 1-2-1 kernel. Both
constants are fractions of a lap, so every width transition scales with lap
length. The kernel's standard deviation is √(14 × 0.5) = 2.65 samples = 0.0118
of a lap:

| | lap | kernel |
|---|---|---|
| Comeback City (shipped) | 2,889 u | **34.1 u** — matches the monolith's own comment, "soft transitions (~35 world units)" |
| Penguin Village (shipped) | 2,445 u | 28.9 u |
| any 4× candidate | ~11,700 u | **~138 u** |

So a 4× track authored in the shipped style spreads its width changes over four
times the distance, i.e. four times the seconds. Measured **before** this
round's edits, and the direction is the surprise:

| | authored range | delivered ratio | fastest 8 u change | frames with ≥4 u of contrast |
|---|---|---|---|---|
| Comeback City (shipped) | 45–56 | 1.244 | **0.29 s** | **44%** |
| Penguin Village (shipped) | 58–64 | 1.103 | **never** | 14% |
| A round-1 | 46–64 | 1.391 | 0.66 s | 13% |
| B round-1 | 44–64 | 1.455 | 0.57 s | 11% |
| C round-1 | 46–60 | 1.304 | 1.37 s | **4%** |

Every candidate authored a **wider** range than the shipped track and put
**less** width in a frame. And Penguin Village — which produced nine of the
judge's eighteen frames — has no 8-unit width change anywhere on its lap and
spends 82% of it within ±5% of its own median width. *"One wide constant-radius
boulevard"* is not an impression. It is the width table.

### 8b. The bars, and where each number comes from

Every bar is anchored to a measured shipped value, because the complaint is
comparative and the only defensible reference is the road that already exists.

| | bar | why |
|---|---|---|
| **W1** delivered width ratio | ≥ 1.30 | The two shipped tracks bracket the problem: CC delivers 1.244, PV 1.103, and the judge called both of them one road. The bar sits above the better of the two, because a 4× lap has four times as much road to differentiate. |
| **W2** share of the lap at one width | ≤ 45% within ±5% of the median | 5% of a 55 u road is 2.75 u — under half a kart width, invisible from the seat. CC 31%, PV 82%. |
| **W3** fastest 8 u change | ≤ 0.60 s | 8 u is a bit over one kart width, the smallest narrowing that is unmistakable in a frame. CC does it in 0.29 s; the bar allows twice as slow because a 4× lap can afford a longer transition. |
| **W4** populated width levels | ≥ 3, each ≥ 6 u apart and held for ≥ 5% of the lap | Exactly the shape of the radius-class gate in §7b, for the same reason: a range says the ends exist, not that the road ever sits at them. |
| **W5** modal frame signature | ≤ 30% of the lap | The judge's actual test. 100 marks by arc length, each reduced to what one frame shows — width band × curvature class and handedness × gradient class. PV 43%, CC 22%. |
| **W6** straight-to-hairpin width delta | ≥ 12 u | Width **coupled** to the layout, not merely varied: the two ends of the lap — the place a pass happens and the tightest corner — have to be visibly different roads. |

Two judgement calls, stated because they are calls rather than arithmetic:

1. **W6 is a magnitude, not a direction.** Comeback City's tightest corner is
   *wider* than its longest straight (−2 u) and that is deliberate — the owner's
   own 2026-06-12 direction was "the drift carousels open up wide; everything
   else stays narrow so the lap takes skill", and CC's tightest radius sits
   inside a carousel. A stop-and-turn hairpin and a drift carousel want opposite
   things, so the gate asks that the two ends of the lap differ by two kart
   widths and leaves the sign to the design. All three candidates chose to
   close down into the hairpin, because all three put their hairpins at the end
   of their overtaking straight.
2. **The frame signature deliberately ignores landmarks.** Signage, props and
   districts are the dressing pass and would flatter every layout equally. The
   question this metric answers is narrower and harder: does the *road itself*
   carry identity.

### 8c. What it caught, and what the edits did

A and C were changed; B passed unchanged. **No centerline moved**, so every
corner, straight, sightline and beat number in §3–§5 and §7 still stands — the
previewer was re-run after the edits and returns identical geometry.

| | 8 u squeeze | straight→hairpin | modal frame | verdict |
|---|---|---|---|---|
| A | 0.66 → **0.56 s** | 8.5 → **20 u** | 20 → 29% | now PASS |
| B | 0.57 s | 18.1 u | 18% | PASS unchanged |
| C | 1.37 → **0.56 s** | 8 → **19.7 u** | 27 → 28% | now PASS |
| Comeback City | 0.29 s | −2 u ❌ | 22% | fails W1/W4/W6 |
| Penguin Village | never ❌ | −4.5 u ❌ | 43% ❌ | fails all six |

A's and C's modal-signature share went **up** slightly, which is worth being
honest about: making one section unmistakable makes the rest of the lap
marginally more alike by comparison, and W5 measures the lap rather than the
corner. Both still clear the 30% bar, and the number that answers the judge's
complaint directly — how different the signature corner is from the road it
arrives off — more than doubled on both (A 8.5 → 20 u, C 8 → 19.7 u).

### 8d. The runtime prerequisite — one line, and it is not in this package

Authoring can only do half of this. The other half is that the smoothing kernel
is defined in lap fractions, and **that is a runtime constant in
`src/game/ComebackCityThreeKartRace.jsx`, which this package does not own.** It
is written down here rather than edited:

> `makeWidthTable` should take the lap length and size its table from it —
> `N = Math.max(224, Math.round(224 * (lapLength / 2897)))` — so the 14-pass
> kernel stays ~35 **world** units instead of ~1.2% of a lap. The shipped tracks
> are unaffected (they solve to N = 224 and N = 189 → clamped to 224, i.e. the
> table they have today); only a long track changes.

Scaling the *passes* instead does not work: the kernel width goes as √passes, so
matching a 4× lap would need 14 ÷ 16 of a pass. The resolution is the only lever.

Priced, on the three candidates as they now stand:

| | 8 u squeeze | best in-frame width contrast |
|---|---|---|
| A | 0.56 s → **0.16 s** | 10.6 u → **19.9 u** |
| B | 0.57 s → **0.16 s** | 10.2 u → **19.9 u** |
| C | 0.56 s → **0.16 s** | 10.6 u → **19.9 u** |

Cost is one `Float32Array` of ~900 floats and 14 smoothing passes over it
(~12.6k iterations), once, at track load. **Do it before building the picked layout, not after** — it
changes how a squeeze feels, so authored ribbon values should be tuned against
the runtime that will ship them.

### 8e. What this section does NOT answer

- **Radius variety across frames.** The judge asked for width *and* radius. The
  radius half was already gated in §7b and all three candidates pass it, but
  none of that was re-derived here — the corner tables in §3–§5 are the
  previewer's and remain the authority.
- **"Nothing shows a fork."** All three candidates carry a dare shortcut
  (`candidate.shortcut`, drawn on the plan as a purple diamond), which is the
  closest thing to a fork the runtime has. Whether that reads as a fork in a
  frame cannot be answered from a plan view.
- **The frames themselves.** This is a plan-view gate. It says a randomly
  sampled frame *should* be identifiable; it cannot prove one is until the
  picked layout is built and captured.

---

## 9. Side by side

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
| **delivered width range (§8)** | **44–64, 1.455× ✅** | **44–64, 1.455× ✅** | **42–62, 1.476× ✅** | 45–56, 1.244× ❌ |
| **≤ 45% of the lap at one width (§8)** | **24% ✅** | **39% ✅** | **31% ✅** | 31% ✅ |
| **8 u of narrowing in ≤ 0.6 s (§8)** | **0.56 s ✅** | **0.57 s ✅** | **0.56 s ✅** | 0.29 s ✅ |
| **straight→hairpin width ≥ 12 u (§8)** | **20 u ✅** | **18.1 u ✅** | **19.7 u ✅** | −2 u ❌ |
| **modal frame signature ≤ 30% (§8)** | **29% ✅** | **18% ✅** | **28% ✅** | 22% ✅ |
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

**One piece of outside evidence for the beat spacing, from the wave-7 round-2
rubric critic** — who was reviewing the render, not this proposal, and looked at
the eighteen capture frames rather than at any of these plans:

> beat density is high enough that four of nine CC frames have a rival, a coin,
> a shield and a boost all firing at once.

That is the shipped 0.70 s beat gap seen from the camera rather than from a
spreadsheet, and it is the strongest argument in the record for the one rule
that survives whichever letter is picked: **the same 15–16 beats, spread over
four times the lap.**

---

## 10. What happens after a letter is picked

0. **Scale the width table with lap length** (§8d) — one line in
   `makeWidthTable`, and it comes first because it changes how every authored
   width step feels. Tuning ribbon values against a runtime that is about to
   change is the same mistake as tuning a palette before the layout is picked.
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
4. **Then build geometry**, and re-run the previewer, `gate-topspeed.mjs`
   *and* `gate-width.mjs` afterwards so the JSON reports land in the record next
   to the frames.
5. **Add capture marks at the start/finish line.** Three separate wave-7 critics
   independently noted that the capture points run 0.06–0.90 and never cross the
   line, so the start/finish geometry ships unreviewed. A 4× track makes that
   worse, not better: nine marks over a 45 s lap is one frame every 5 s. That is
   a harness change and belongs to whoever owns the harness, but a layout this
   long should not be captured at the density a 11 s lap was.

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

## 11. Files

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
  gate-width.mjs                   the road-width gate in §8; build-sheet.mjs imports it too
  solve-c.mjs                      closure/crossing search used while shaping C
  build-sheet.mjs                  rebuilds index.html from the previewer's JSON
  export-centerlines.mjs           emits runtime-shaped centerline JSON
  cc4x-*-centerline.json           the centerline data itself
  preview/                         previewer output: *-layout.json, *-plan.png,
                                   plus width-gate.json from `gate-width.mjs --json`
```
