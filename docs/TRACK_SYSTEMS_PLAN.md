# Track Systems Plan — the multi-track era (owner direction, 2026-06-12)

Owner decision: **the current neon track stays as-is** ("keep this race track on the side
for now just cause it works") while NEW tracks are built. Build tracks from **repeatable
systems** (ramps, moving blockers, boost pads, pickups, hazards, shortcuts, checkpoints,
landmarks), never as custom one-offs. The owner supplied a 12-track idea list with
practicality rankings; this doc maps it onto our actual codebase.

Supersedes the "re-dress the current track" part of docs/PENGUIN_WORLD_PLAN.md — that
doc's research and element kit (aurora sky, icebergs, snowfield, ordinal statues, snow
props, ice palettes) now feeds the NEW tracks instead. The round-7 resize/bridge notes for
the current track are PARKED (track works; don't touch).

## What we already have (the systems audit)

| Owner's system | Status in code |
|---|---|
| Normal road circuit | ✅ generated centerline (turtle script → courseV2), variable width, elevation band, walls |
| Ramps + tricks | ✅ `airTricks.js` RAMPS (data-driven placement) |
| Risk/reward shortcut | ✅ dare ramp (SHORTCUT in airTricks) — pattern generalizes |
| Boost pads | ✅ data-driven per course |
| Item boxes / pickups | ✅ data-driven; full themed item system |
| Static hazards (snowmen/crates) | 🟡 new but trivial — fish bone hit-test pattern + prop mesh; "breakable" = hide + puff |
| Moving hazards (fish carts, minecarts) | 🟡 **Penguin March IS this system** — a parameterized crossing object (progress, lane sweep, hit window). Generalize `march` → `crossers` and a minecart/fish cart is content |
| Moving platforms | 🟠 new (A→B→A on a fixed path); only needed for Harbor — defer to track 2 |
| Slippery zones | 🟡 trigger band + steering/slide modifier — same shape as blizzard's `insideBlizzard` |
| Shortcut doors / timed gates | 🟡 timed open/close + blocker hit window — readable-state rule (red/flash/green) |
| Lap UI / checkpoints / finish | ✅ exists (lap wrap detection; no formal checkpoints — fine for closed circuits) |
| Respawn / fall zones | 🔴 doesn't exist (current track is fully walled). Needed for Harbor water; NOT for Village |
| Track select | 🔴 doesn't exist — runtime hardcodes COMEBACK_CITY_COURSE_V2 |
| Decorative landmarks | ✅ buildings/props pipelines + clearBuildingPlacement; ordinal statues = scaled roster GLBs |

## The real prerequisite: Phase 0 — track plumbing

Before any new track: make the course a **selectable data bundle**, so tracks are content.

- `TrackDefinition` = { key, name, centerline points, width ribbons, elevation bands,
  boostPads, itemBoxes, ramps, shortcut(s), crossers (moving hazards), staticHazards,
  zones (slippery/slow), dressing builder (props/buildings/sky/palette), laps, playable
  budgets (finish time / speed floor for gates) }.
- Current track becomes `comeback-city` — the first cup entry, untouched.
- Track select joins the character select flow (cup screen); `?track=` override for QA.
- Gates run per-track (the playable test takes the track's own budgets).
- Each new track fills the owner's template (Name / Theme / Palette / Length / Laps /
  Main route / Shortcut / Signature mechanic / 3 hazards / Collectibles / 3 landmarks /
  Respawn zones / Checkpoints / Performance concerns) IN ITS PR before any code.

## Build order (owner's ranking, accepted with codebase notes)

**Phase 1 — three stable tracks (reuse everything):**
1. **Penguin Village Rooftop Rally** (10/10 — agreed, first): snow village loop, igloo
   tunnel (bridge/underpass tech reused), rooftop shortcut (dare-ramp pattern), frozen-pond
   drift zone (slippery band, mild), fish-cart crossers (generalized march), breakable
   snowmen, fish-market props. Cozy beginner track. Art = PENGUIN_WORLD_PLAN kit.
2. **Iceberg Harbor Heist** (9/10): docks/containers/crane (boxes + prisms), warehouse
   tunnel, container-bridge shortcut, ONE moving cargo platform (A→B→A), fish crates,
   water respawn zones ← **the one new core system (respawn)**.
3. **Satoshi Snow Mine** (8.5/10): mine tunnel walls (repeated pieces), crystal props,
   minecart crossers, rail boost shortcut, falling-rock timed hazard, warm orange sat
   lighting (palette swap proves the dressing system).

**Phase 2 — skill/identity:** Black Ice Canyon (mild slip modifier only — don't break the
loved handling), Ordinal Gallery Circuit (frame-tunnels not portals; showcase ordinals),
Mempool Mountain (readable timed block gates: red/flash/green).

**Phase 3 — chaos/flex:** Whale Market Speedway, Deep Freeze Labs (fake low-grav with
launch pads), Frozen Pizza Run (conveyor zones).

**Phase 4 — finale spectacle:** Glacier Casino (predictable rotating gates, never pure
random), Ice Shard Skyway (needs bulletproof respawn first), Block Height Speedway
(lap-state track: lap 2 bridge rises, lap 3 shortcut opens — SAVE FOR LAST).

## Owner's hard rules (adopted verbatim)

- Roads stay readable: clear edge colors, direction arrows, wide turns, guiding landmarks,
  hazards visible before they hit, shortcuts tempting but readable. Background must never
  beat the road.
- Randomness never decides races — timers and telegraphs, skill must matter.
- Moving things use fixed paths, not physics. Low gravity is faked with pads. No real
  portals/rail-grinding/destruction in MVPs.
- Every track ships as MVP first (the owner's per-track MVP lists), juice later.

## Status

- Phase 0 (plumbing + track select) — NOT STARTED, next engineering step.
- Audio (Phase 4 of the feel plan) still pending; slots naturally after Phase 0 or
  alongside track 1 (per-track music hooks).
