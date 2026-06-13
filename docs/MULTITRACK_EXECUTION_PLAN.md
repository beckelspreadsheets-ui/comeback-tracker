# Multi-Track Execution Plan — phased, owner-approved (2026-06-12)

The working doc for the multi-track era. Strategy and the 12-track ranking live in
[TRACK_SYSTEMS_PLAN.md](TRACK_SYSTEMS_PLAN.md); the arctic art kit and readability research
live in [PENGUIN_WORLD_PLAN.md](PENGUIN_WORLD_PLAN.md). This doc is the build order.

---

## ⏸ PAUSE / HANDOFF NOTE (2026-06-12)

Session paused here because **Claude Fable 5 was discontinued mid-build**; continuing on
Opus 4.8, which is a different (less capable on this particular agentic-throughput work)
model. Everything through this point is committed AND pushed to
`origin/codex/release-v1-comebacktracker-kart-racer` (tip `9b008cc`). Nothing is lost.

**Exactly where we are in Phase 0:**
- ✅ **Phase 0.1 DONE & GREEN** (commit `9b008cc`): `TrackDefinition` extracted —
  comeback-city is now pure data at `src/game/race/tracks/comebackCity.js`, with a registry
  at `src/game/race/tracks/index.js`. Runtime takes a `track` prop + `?track=` override and
  threads `trackDef` through the sampler, builders, shortcut/ramp/crest logic, laps, HUD.
  `airTricks` shortcut helpers now take the track's shortcut def. Build + all three gates
  pass; behavior-neutral (this was a pure refactor — the game plays identically).
- ⏭ **Phase 0.2 NOT STARTED**: track-select row in the RaceScreen cup UI + `cc-kart-track`
  localStorage + passing the `track` prop from RaceScreen. NOT blocking — only one track
  exists, and the runtime already defaults to comeback-city, so the game is fully playable
  without it. Do this when track #2 is near.
- ⏭ **Phase 0.3 NOT STARTED**: make `kart-playable` read `budgets` from the track def
  (already present on the def: `{ finishSeconds: 45, speedFloor: 140 }`) and accept a
  `TRACK=<key>` env. Mechanical; do it alongside the first new track.
- ⏭ **Phase 0.4 (hazard-system extraction: crossers/zones/breakables) NOT STARTED.** The
  Penguin March code in `ComebackCityThreeKartRace.jsx` + `heldItems.js` is the template
  for the `crossers` system; the blizzard `insideBlizzard` check is the template for
  `zones`. Extract these when building Penguin Village (they're its core hazards).

**Resume pointer:** the next engineer/model picks up at Phase 0.2 (or jumps straight to
Phase 1 Penguin Village, doing 0.2–0.4 as that track needs them — the def system already
supports a second track being added to the registry today). Kickoff prompt at the bottom
of this doc still applies.

**Capability caveat for the next model:** Fable 5 ran this build with heavy parallel
tool use, deterministic capture tooling, and self-checking via the orientation lab + item
captures. If continuing on a less capable model, lean hard on the existing scripts
(`scripts/item-moment-capture.mjs`, `?giveItem=`, `?track=`, `?character=`, `?kart=`,
orientation lab, select-portraits booth) rather than re-deriving — they encode the
hard-won gotchas.

Standing rules for every phase: the current neon track is UNTOUCHED and stays green in the
gates; every round ends with `npm run build` + `test:kart-proof` + `test:kart-playable` +
`test:race`, a probe/capture, a new top section in `tmp/v2-approval-preview.html`, and an
owner feel-check. FPS floor 34 (idle machine only). Readability beats spectacle.

---

## Phase 0 — Track plumbing (the prerequisite; ~1 session)

Goal: tracks become selectable data, not code. Zero behavior change to the current track —
the proof of success is every existing gate passing untouched.

**0.1 Extract `TrackDefinition`.** Inventory everything the runtime hardcodes today and
move it into one bundle at `src/game/race/tracks/comebackCity.js`:
- centerline points + `startProgress` (COMEBACK_CITY_COURSE_V2), width ribbons (45/56
  table), elevation band (BRIDGE_BAND + crest), boostPads, itemBoxes
- RAMPS + SHORTCUT (move out of airTricks into the def; airTricks keeps the math)
- TOTAL_LAPS, playable-gate budgets (finish ≤ 45s, speed floor 140), spike notes
- dressing builder: `addDistrictsAndProps` + building swaps + palette become
  `dressTrack(world, sampler, loader)` owned by the track def
- per-track palette object (sky gradient stops, curb/rail neons, ground tint)

**0.2 Registry + selection.** `src/game/race/tracks/index.js` registry (key → def).
Runtime takes a `track` prop (default `comeback-city`); `?track=` QA override mirroring
`?character=`/`?kart=`. RaceScreen select flow becomes track → character → kart (cup
screen first; one Start Race button at the end; remembered picks; webdriver/autoplay
skips all of it as today).

**0.3 Gates go per-track.** `kart-playable` reads budgets from the track def and accepts
`TRACK=<key>`; CI default runs comeback-city (regression) + any track touched in the
round. Capture scripts accept the track param.

**0.4 Generalize the reusable hazard systems** (each is a small extraction of something
already shipped):
- `crossers`: the Penguin March engine parameterized (mesh set, crossing progress, lane
  sweep range/speed, loop or once, hit window) → fish carts, minecarts, marching penguins
  all become content. March itself becomes a crosser spawned by the item.
- `zones`: the blizzard inside-check generalized (band of progress/lane + effect:
  slow cap / mild slip [steer ×0.85, slide +, drift reward] / boost)
- `breakables`: static prop + hit window → puff + brief slow; respawn next lap
- Timed gates (red/flash/green states) — build the state machine now, first used Phase 3+

**Exit criteria:** all gates green on comeback-city through the new plumbing; track select
screen shipped (one entry + "more coming" slots); crossers/zones/breakables unit-covered
in test:race.

---

## Phase A — Audio (parallel/next; ~1 session; biggest remaining feel multiplier)

Engine pitch from speed, drift screech + tier chirps, item stingers (fire/hit/shield/
ultimate), countdown + finish fanfare, per-track music hook (track def gets a `music`
slot — the cup needs themes). Adapt legacy `src/game/race/raceAudio.js`. Mute toggle;
suspend AudioContext on blur (`test:lifecycle` must stay green). Can run before, during,
or right after Phase 1 — schedule at owner's preference.

---

## Phase 1 — Penguin Village Rooftop Rally (~2 sessions + feel-check rounds)

The cozy beginner track and the first proof that tracks are content.

**Template (filled):**
- Track Name: Penguin Village Rooftop Rally · Theme: snow village at arctic-neon dusk
- Difficulty: easy/beginner · Laps: 3 · Length: ~2,400–2,800 units (shorter than
  comeback-city; wide forgiving corners)
- Main Color Palette: white-blue snow, warm amber window glow, cyan ice accents, navy sky
  + aurora (PENGUIN_WORLD kit); dark asphalt stays
- Main Route: village main street → frozen pond sweep → fish-market square → gentle climb
  to rooftop ridge → drop chicane back to the gate
- Shortcut Route: ramp onto the rooftop line — narrow, trick-friendly, rejoins before the
  finish (dare-ramp pattern, milder penalty)
- Signature Mechanic: fish-cart crossers through the market + breakable snowmen
- Hazard 1: snowmen (breakable, brief slow) · Hazard 2: fish carts (crossers, spin) ·
  Hazard 3: frozen pond mild-slip zone (drift rewarded, never punishing)
- Collectible: fish pickups → small credit bonus at finish (stretch, not MVP-blocking)
- Start Landmark: village gate arch + fish-market stalls · Mid: giant ordinal penguin ice
  statue over the pond (Sherbet Land homage) · Finish: glowing igloo cluster
- Respawn Zones: none (fully walled) · Checkpoints: lap wrap (closed circuit)
- Performance: baked village family (igloos/huts/stalls via bake-buildings pipeline),
  instanced pines/snowmen, aurora-sky planes; budget per the visual-arc rules

**Build order within the phase:** centerline turtle script + sim validation → grey-box
(road/walls/pads/boxes/ramps) → playable gates tuned → crossers + snowmen + pond zone →
dressing pass (village bake, statue, aurora sky, snowfield) → captures + feel-check.
MVP skips (owner's list): laundry physics, smoke vision effects, moving villagers.

---

## Phase 2 — Iceberg Harbor Heist (~2 sessions)

First moving-platform track; introduces the ONE new core system.

- **Respawn system first**: fall/water zones → fade + reset to last good progress point
  with brief invulnerability. Built generic (Skyway and any pit track reuses it).
- One cargo platform on a fixed A→B→A path (1s dwell) — a moving road segment the sampler
  treats as a lane band whose reachability toggles; keep it ONE platform per owner's rule.
- Docks/containers/warehouse tunnel/crane ramp from box/prism primitives + harbor bake;
  container-bridge shortcut; fish-crate breakables; iceberg skyline from the world kit.
- MVP skips: swinging crane hooks, boat traffic, multiple platforms.

## Phase 3 — Satoshi Snow Mine (~1–2 sessions)

Proves the palette system (warm orange vs the blue tracks) + tunnel-heavy layout.
Minecart crossers on fixed paths, falling-rock timed hazard (telegraphed shadow + thunk),
rail boost shortcut (boost-pad chain, no real grinding), sat-crystal dressing. MVP skips:
rail grinding, collapse sequences, dynamic lighting triggers.

**Phase 1–3 exit = the starter cup**: Comeback City + Village + Harbor + Mine. Lap-count
decision (3→4–5 on comeback-city) and cup/Grand-Prix scoring get decided here.

## Phase 4+ — later tracks (build only after the cup is stable)

Black Ice Canyon (mild slip only — never break the loved handling) → Ordinal Gallery
(frame-tunnels, ordinal showcase) → Mempool Mountain (timed gates) → Whale Market / Deep
Freeze Labs (launch pads, not real low-grav) / Frozen Pizza Run (conveyor zones) →
Glacier Casino (predictable rotating gates) → Ice Shard Skyway (needs mature respawn) →
**Block Height Speedway last** (lap-state track: lap 2 bridge rises, lap 3 shortcut opens).

Every new track starts by filling the template in this doc's Phase-1 format and getting a
nod on it BEFORE code. Owner renders (kart GLBs, hero buildings, more penguins) slot in
via the proven pipelines whenever they land — never blocking.

---

## Kickoff prompt (paste in a fresh session)

```
Read docs/MULTITRACK_EXECUTION_PLAN.md, docs/TRACK_SYSTEMS_PLAN.md,
docs/PENGUIN_WORLD_PLAN.md and the memory files gameplay-feel-roadmap,
kart-art-direction-feedback, and ordinals-community-context. We are executing
the multi-track plan starting with Phase 0 (track plumbing). The current neon
track must stay untouched and green through the refactor — all gates passing
through the new plumbing is the exit criterion. After each step: run the QA
gates, update tmp/v2-approval-preview.html with a new top section, and stop
for my feel-check. Check "3d generations:character sheets/" for new GLB drops
at session start.
```
