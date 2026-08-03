# Free-body kart — execution plan

> **STATUS 2026-08-03: P1–P6 LANDED. P7 is gated on the owner driving it.**
>
> | | | commit |
> |---|---|---|
> | P1 | projection primitive, inert | `a67d96dd` |
> | P2 | free-body behind `?freebody=1` | `381a01d4` |
> | P3 | backwards laps do not count | `eae2d1ec` |
> | P4 | TURN AROUND sign | `70a8252c` |
> | P5 | off-road + rescue | `2a2ef20e` |
> | P6 | pit manoeuvres | `d14d691e` |
>
> **Rails is still the default.** Everything above is behind `?freebody=1`;
> `freeBody` null IS the rails path, so the shipped build is unchanged.
>
> **Drive it:** `https://aaa-preview.comeback-city-kart.pages.dev/?freebody=1`
> once the preview is redeployed — it currently serves the pre-free-body build.
>
> Seven sim suites now gate this work, all runnable headless with no frames and
> so no gaming machine needed: `test:spline`, `test:freebody`, `test:laps`,
> `test:wrongway`, `test:offroad`, `test:pit`, plus `test:race`.
>
> Each of P3–P6 had a real bug caught by its own test before shipping: the lap
> exploit awarded 10 laps under the old rule, the wrong-way timer hung for ten
> seconds after a long reverse, the off-road test's control was invalid, and the
> pit's closing term fed back on its own separation impulse.


Owner approved 2026-08-03 after playing the preview: *"yes lets make it more
free body I think it will make it harder to drive too overall"*, plus *"add the
backwards not counting and a little thing that says turn around like mario kart
has"*.

Ordered to be knocked out **back to back**. Every step ships on its own, is
verifiable on its own, and leaves the game playable if the next one never lands.

---

## What is true today

The kart is on rails. `race.lane` is clamped to ±0.95 at all three sites that
move it, and world position is derived:

```js
sampler.pointAt(progress, lane)                     // position
race.lane = clamp(race.lane + laneRate * dt, -0.95, 0.95)   // "steering"
group.rotation.y = tangentYaw + slideYaw + steer * 0.16     // yaw is COSMETIC
```

There is no heading, no velocity vector and no reverse. Lane `1.0` is the road
edge, so the `offroad` surface defined in `surfacePhysics.js` is **unreachable**.

Everything else in the race speaks `progress` + `lane`: rival AI, projectile
targeting, coin rows, crosser hits, the shortcut, lap counting, the camera.

## The approach: player-only, projection-derived

**World position becomes authoritative for the PLAYER ONLY.** `progress` and
`lane` stay, but become a *derived projection* of the player's world position
onto the spline, recomputed every frame.

Rivals stay on rails. Every item, hazard, coin and camera path keeps reading the
same two numbers it reads today and needs no change. That is the whole reason
for this shape — a big-bang rewrite breaks all of them simultaneously.

---

## P1 — the projection primitive, with nothing depending on it yet

Add `projectToSpline(worldX, worldZ, progressHint)` → `{ progress, lane,
tangent, distance }`. Local search around `progressHint`: at 245 u/s and 60 fps
the kart moves ~4 units a frame, so a small window is enough and a global search
is never needed.

**Ship it inert.** Rails still drive the kart. Each frame, project the rails
position back and assert the round-trip returns the progress and lane it started
from. If the projection is wrong, this is where it is cheap to find out — not
three steps later with physics on top of it.

**Exit:** round-trip error under 0.001 progress and 0.01 lane across a full
autoplay lap on both tracks. Committed as a check, not a one-off print.

## P2 — free-body integration behind a flag

Add to player state: `pos {x, z}`, `heading`, `vel {x, z}`. Integrate:

- steering rotates `heading` (rate scaling with speed, so it does not spin on
  the spot at 250 km/h)
- throttle/brake accelerate along `heading`
- lateral velocity decays by a grip term — this is where drift lives later
- `progress`/`lane` are derived from `projectToSpline` each frame

Gated on `?freebody=1` so rails stays the default until it feels right. Rivals,
items and the camera are untouched — they read the derived values.

**Exit:** a full autoplay lap under the flag with lap count, coins, item boxes
and crosser hits all still firing.

## P3 — backwards laps do not count

Today lap counting watches `progress` wrap. Once the player can turn around,
progress runs backwards and a wrap fires in reverse — you could farm laps by
reversing over the line.

Replace the wrap test with **signed cumulative progress**: accumulate the
per-frame signed delta, and count a lap only when cumulative distance crosses
`+1 lap` in the forward direction. Reversing subtracts what it gave back and
re-crossing forward does not re-award.

**Exit:** driving backwards over the start line decrements nothing and awards
nothing; driving a full clean lap awards exactly one; reversing over the line
and re-crossing forward awards exactly one, not two.

## P4 — the TURN AROUND indicator

Mario Kart's wrong-way sign. Compare `heading` against the spline tangent at the
derived progress:

```
wrongWay = dot(heading, tangent) < 0
```

Debounced — a spin, a drift or a hard hairpin must not flash it. Show after
~0.6 s of sustained wrong-way and clear immediately on correction. HUD element
in the kart's own HUD, which is the monolith's, not `raceHud.jsx` (the kart
build never loads that file — see the minimap finding).

**Exit:** visible within a second of actually facing backwards, never fires
during a full-speed drift or a spinout on either track.

## P5 — off-map, off-road grip, and the rescue

- Open the lane clamp past ±0.95 in authored spans (or everywhere, and let the
  rescue bound it).
- Apply the `offroad` grip values already sitting unused in
  `surfacePhysics.js`.
- Rescue: beyond a bound, or stationary off-track for N seconds, fade and
  replace on the spline at the last valid progress, facing forward — with a
  short i-frame so you are not immediately re-hit.

**Exit:** you can leave the road, it costs you time, and you always get back.

## P6 — pit manoeuvres

Owner: *"I want pit maneuvers to work if I slide up on someone and try to spin
them up from the side."* With free-body this is a real physical test: contact
with high relative lateral velocity, applied near a rival's rear quarter, spins
them. Rivals already have `spinTimer` and contact already has a cooldown, so
this is a new condition on existing machinery.

**Exit:** a deliberate side-slide into a rival's rear quarter spins them;
ordinary side-by-side racing contact does not.

## P7 — flip the default, delete the rails path

Only after the owner has driven P2–P6 under the flag and confirmed the feel.
Rails removal is its own commit so it can be reverted alone.

---

## Rules for this run

1. **One step per commit**, each with its build + `test:race` +
   `test:kart-playable` result in the message.
2. **Never capture frames on this machine for judgement** — captures for scoring
   go to a free/gaming machine. Sim-level verification (headless, numeric) is
   fine here and is what every exit criterion above is written against.
3. **Rivals stay on rails** for the whole plan. If a step needs a rival change,
   it is out of scope — say so rather than widening.
4. The bundle is at **490/500 KiB gzip JS**. Any step that adds meaningful code
   checks `test:bundle:kart` before committing.
