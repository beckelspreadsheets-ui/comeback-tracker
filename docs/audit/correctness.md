# Penguin Kart — Correctness Audit

Scope: the live race runtime (`src/game/ComebackCityThreeKartRace.jsx`, `src/game/race/**`,
`src/game/race/tracks/**`, `src/kart/**`). The tracker app was out of scope and not read.

Method: read the code paths, not the comments. The shipped game runs the **rails**
progress path (`?freebody=1` is off by default, `ComebackCityThreeKartRace.jsx:10097`),
so findings are graded by their effect on the shipped rails build. The `raceState.js` /
`kartPhysics.js` collision helpers (`applyPlayerHitResponse`, `resolveWorldCircleCollision`,
`createRaceState`, …) belong to the legacy `ArcadeRace3D` / `ComebackCityScene3D` path that
`KartApp` deliberately does **not** import, so they are noted but not graded against the kart game.

## Headline

No crash, desync, wrong-winner, or lap-miscount bug was found in the shipped rails path.
The recently added elevation system (`makeElevation`, `kartGradePitch`, the ground-follow term,
crest launch) is arithmetically sound: both tracks author their terrain **clear of the bridge
band and clear of the start/finish seam** (elevation and its slope are 0 at `progress≈0`), so the
wrap-boundary and bridge-edge cases the brief worried about do not fire. The one real gameplay
logic bug is a missed track-length rescale in the projectile spawn (Finding 1).

## Severity-sorted findings

| # | Sev | Location | Summary |
|---|-----|----------|---------|
| 1 | Medium | `src/game/race/heldItems.js:107,138` | Snowball/Sardine spawn offset hardcodes the old 3000-unit reference lap → projectile spawns ~23u ahead (not 6u) on the 4x tracks and leapfrogs a close target |
| 2 | Low | `ComebackCityThreeKartRace.jsx:642-647` (`onElevatedSpan`) | Prop-anchor elevation guard only knows the bridge band, not the newly-authored terrain hills; props on a hill can float/sink past the ground-follow falloff |
| 3 | Low | `ComebackCityThreeKartRace.jsx:4449-4451, 4510-4519, 4573-4577` | Elevation ground-follow comments still claim "identically 0 / a NO-OP today / byte-for-byte" — false now that grade is authored; misleads future edits |
| 4 | Low | `src/kart/kartLocalStore.js:97-105` (`recordRaceFinish`) | Write path does no numeric validation of `result.place`; a non-finite place would persist NaN `bestPlace`/`podiums`/`wins` (sanitize runs only on the migration read) |
| 5 | Info | `ComebackCityThreeKartRace.jsx:11114-11148`, `splineProjection.js` | Free-body reprojection + rescue is `?freebody=1`-gated (off by default); sound as written but unshipped/untuned — the brief's desync-risk items pertain to a path the shipped game never runs |
| 6 | Info | `ComebackCityThreeKartRace.jsx:10908-10910, 11170` vs `rivalRacers.js:484-565` | Player crest-launch / wrong-way test reads `progress`/`previousProgress` one frame before they advance, so the player evaluates on the previous frame's delta (1-frame lag) while rivals evaluate same-frame. Fires exactly once — cosmetic |
| 7 | Info | `ComebackCityThreeKartRace.jsx:11197-11205`, `raceCoins`/lap credit | Lap/best-lap boundary is `cumulativeProgress` reaching a whole number = the **grid** position (`startProgress`), ~87u past the painted checker line on CC. Consistent every lap and arguably correct, but offset from the visual line |
| 8 | Info | `ComebackCityThreeKartRace.jsx:10430-10435` (`kartGradePitch`) | Two `sampler.pointAt` (each a `getPointAt`+`getTangentAt`+Vector3 allocs) per frame purely to read elevation slope — a perf note, not a correctness defect. Result is NaN-safe (`atan2`, `length>0`) |

---

## Detail

### 1 — [Medium] Projectile spawn offset never got the 4x-track rescale
`src/game/race/heldItems.js:107` and `:138`

```js
export const throwSnowball = (projectiles, owner, progress, lane, speed, skin = 'snowball') => {
  projectiles.push({ ... progress: wrap01(progress + 6 / 3000), ... });
};
export const throwSardine = (projectiles, owner, progress, lane, speed, targetName) => {
  projectiles.push({ ... progress: wrap01(progress + 6 / 3000), ... });
};
```

`6 / 3000` means "spawn 6 world units ahead **assuming a 3000-unit lap**". The AAA wave-8
refactor converted every other proximity constant in the item system to real world units
divided by the live `trackLength` (see the extensive comments in `raceCoins.js` and the
`padArmUnits`/`boxArmUnits` block in `ComebackCityThreeKartRace.jsx:11233-11246`) — these two
spawn offsets were missed. A repo-wide grep confirms `/3000` survives **only** here.

Both functions are called on the shipped rails path
(`ComebackCityThreeKartRace.jsx:10952` snowball, `:10975` sardine), and both current tracks are
~11.6k-unit loops.

- **Failure scenario:** `6/3000 = 0.002` of a lap. On an 11,654-unit lap that is **~23.3 units
  ahead of the thrower**, not the intended 6. Since `SNOWBALL.hitProgress = 9`, a rival sitting
  0–23 units directly ahead is spawned *behind* the ball — the snowball starts already past them
  and, being faster than the field, never comes back. The "throw at the kart directly ahead"
  item silently leapfrogs its closest, most-wanted target. Sardine (homing) is less affected
  because it steers back, but still starts ~17u too far downrange.
- **Why it matters:** item combat is the mechanic the owner signed off as "amazing"; this
  degrades it on every shipped track.
- **Fix:** thread `trackLength` into both functions (they already receive it at every call site
  via other args, or the caller passes `engine.sampler.length`) and use `progress + 6 / trackLength`.
  A module constant fallback (e.g. `SPAWN_LEAD_UNITS = 6`) keeps the intent readable.

### 2 — [Low] `onElevatedSpan` guards the bridge but not the authored terrain hills
`ComebackCityThreeKartRace.jsx:642-647`

```js
const onElevatedSpan = (trackDef, progress) => {
  const band = trackDef?.elevation?.bridgeBand;
  if (!band) return false;
  const p = wrap01(progress);
  return p > band.from - 0.004 && p < band.to + 0.004;
};
```

A scatter prop is anchored at `sampler.pointAt(progress)` whose `.y` **is** the road elevation
(`makeElevation` is baked into `pointAt`, lines 1049-1050). `onElevatedSpan` exists to skip props
that would float in the bridge gap — but it only inspects `bridgeBand`. Item 7c added signed
`terrain` hills (`comebackCity.js:60-64`, amp up to **34**; `penguinVillage.js:227-231`, amp up
to **32**), which `onElevatedSpan` is blind to.

- **Failure scenario:** a prop anchored inside a hill band (e.g. CC `0.34–0.46`) is planted at
  crest height (~+34). The infield ground-follow (`4578-4585`) lifts the ground to match the road
  only within `clearInner`, fading back to the base plane by `clearOuter` (~56u past the road
  edge). A prop offset beyond that falloff keeps `y≈+34` while the ground under it is back at 0 —
  a ~30-unit float (or the reverse in a −28 valley: a buried prop). This is the *same* class of
  defect the bridge guard was written to prevent, now un-guarded on the hills.
- **Caveat:** cosmetic and magnitude-dependent on actual prop lateral distances; verify against
  the placement lists before acting. Not a gameplay/logic error.
- **Fix:** extend the "elevated span" test to also cover `elevation.terrain` bands (or, better,
  compare the prop's anchor `y` against the ground-follow height at its real lateral distance).

### 3 — [Low] Stale invariant comments in the elevation ground-follow
`ComebackCityThreeKartRace.jsx:4449-4451, 4510-4519, 4573-4577`

The ground-follow block repeatedly asserts the terrain term is inert:

> "point.y IS the elevation … today it is 0 everywhere outside the bridge band, which is what
> makes the terrain term below a no-op"
> "With today's elevationAt (0 everywhere outside the bridge) terrainLift is identically 0, so
> this whole term is a NO-OP and the setZ matches the pre-slice-A value byte-for-byte"

Since `Elevation 7c: bold signature grade authored on both tracks`, `elevation.terrain` is
non-empty on both tracks, so `terrainLift` is **not** zero and the `setZ` is **not** byte-for-byte
the pre-slice-A value. The code is correct; the comments are now false and would mislead a future
dev into thinking they can freely edit the ground plane without touching the road. Update the
comments to describe the active behaviour. (Verified the *runtime* is fine: no discontinuity at
the bridge-band edge because the bridge half-sine is 0 there and no terrain is authored across the
edge; no seam issue because elevation is 0 near `progress 0` on both tracks.)

### 4 — [Low] `recordRaceFinish` trusts `result.place` on the write path
`src/kart/kartLocalStore.js:97-105`

```js
bestPlace: previous.bestPlace ? Math.min(previous.bestPlace, result.place) : result.place,
podiums: (previous.podiums || 0) + (result.place <= 3 ? 1 : 0),
wins:    (previous.wins || 0) + (result.place === 1 ? 1 : 0),
```

`sanitizeEntry` (which coerces/validates) only runs on the **migration read** path, never here.
If `onFinish` ever delivered a non-finite `place`, `Math.min(prev, NaN) === NaN` would be written
and would then poison every future best-place comparison (`NaN < x` is always false). In the
current build `place` is always `race.position` (a finite integer set at `:11538` before the
finish payload at `:13189`), so it is not triggered today — this is a defensive gap, not a live
bug. Fix: run `sanitizeEntry` (or a `Number.isFinite` guard) on the merged entry before
`writeRaceResults`.

### 5 — [Info] Free-body path is off by default
`ComebackCityThreeKartRace.jsx:10097` gates `race.freeBody = createFreeBody(...)` behind
`?freebody=1`. On that path the design is sound: `projectToSpline`
(`splineProjection.js`) does a **local** window search (`DEFAULT_PROJECTION_WINDOW = 0.02`) around
last frame's hint, which is what prevents a self-approaching track from snapping progress across a
half-lap and firing a spurious lap; the rescue (`:11123-11148`) is bounded by `RESCUE_LANE`/
`RESCUE_SECONDS`; and lap counting runs off signed `cumulativeProgress`, immune to reverse-and-
recross farming. The projection window is safe against the shipped `dt` clamp (max ~12u/frame ≪
233u window). Because it does not ship, the "freeBody x/z vs progress/lane desync" risk in the
brief is latent, not active. Worth a dedicated test pass before it is ever flipped on.

### 6 — [Info] Player crest/wrong-way test lags rivals by one frame
The player's crest-launch (`:10908-10910`) and wrong-way sign (`:11170`) read `race.progress` /
`race.previousProgress` at the **top** of the frame, but those are only advanced later
(`previousProgress` at `:11081`, `progress` at `:11119`/`:11150`). So the player evaluates the
crossing on the *previous* frame's delta, one frame after it happened, whereas each rival advances
then tests in the same frame (`rivalRacers.js:484-485` then `:555-565`). The crossing is still
detected exactly once (no double launch, no missed lap), so this is a 1-frame cosmetic lag, not a
miscount. Noted for parity only.

### 7 — [Info] Lap credit boundary sits at the grid, not the painted line
Laps are credited when `cumulativeProgress` (signed, per-frame, `:11157-11161`) reaches the next
whole number (`:11197`). Cumulative starts at 0 at the grid position `startProgressFor(trackDef)`
(`startProgress + startOffset`, ~`0.0075` on CC), so one "lap" of accumulated distance returns the
kart to the **grid**, ~87u past the checker line painted at `progress 0`. This is internally
consistent (a lap = a full lap of distance from where you started, and best-lap timing uses the
same boundary) and arguably more correct than a line-crossing detector, but if the HUD lap number
is expected to tick exactly at the visual line, it will tick ~87u late. Behavioural note only.

## Things checked and found correct
- **Lap counting / finish:** `race.lap` 1→`laps`, finish at `lap > laps` (`:11206-11210`); no
  off-by-one. `countdown` gates raceTime **and** all movement/lap accumulation
  (`:10843` block closes `:11605`), so the first lap time is not inflated by the 2.2s countdown and
  no laps accrue on the grid.
- **`wrap01` usage** across sampler, coins, items, projectiles, rival wrap — all consistent
  `((v%1)+1)%1`.
- **Division-by-zero:** `arcProgressScaleFor` is clamped ≥ `1-maxDeviation` (0.9) × (≥1), never 0
  (`kartPhysics.js:1263-1273`); rival corner cap guarded by `kappaEff > 0.0004`
  (`rivalRacers.js:414-417`); `laneArcCurvatureAt` midLength has `|| 1` (`:9462`); `widthAt` half
  has `>1e-6` guard (`splineProjection.js:91`); `makeElevation` feature divisions are guarded by
  the `p > from && p < to` interval test so an empty/inverted band never divides.
- **Event listeners:** every `addEventListener` (visibility, resize, orientation,
  deviceorientation, keydown/up, visualViewport) has a matching `removeEventListener` in the same
  effect's cleanup; `requestAnimationFrame` is cancelled and GPU objects disposed on unmount
  (`:13202-13244`). No leak found.
- **localStorage:** `kartLocalStore` and `KartApp` wrap every read/parse in try/catch and validate
  keys against the known character/kart/track lists before use — stale values fall back to
  defaults, no deref crash.
- **Coin field:** ids `rowIndex*2 + laneIndex` (0..59) map to `coinMeshes[id]`, guarded by
  `if (mesh)`; collection skipped while airborne; respawn resets on genuine new laps only
  (`lapsAwarded`), carried coins retained.
- **Rival lap reconciliation** (`:11444-11470`): the arc-length correction re-runs the sim's exact
  `0.86/0.18` wrap test on both raw and corrected progress and adjusts by the difference — no
  double count; teleports/backward frames skipped (`rawDelta>0 && rawDelta≤0.2`).
- **Boost-pad / item-box latches:** unique keys (`courseV2.js` boost pads have `key`; item boxes
  keyed by index), hysteresis arm/rearm in world units.
