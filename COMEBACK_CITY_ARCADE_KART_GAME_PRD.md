# Comeback City Arcade Kart Game PRD

## Goal
Build Comeback City Arcade Kart into a production-quality browser arcade kart game, starting with one fully playable Comeback City Grand Prix track that proves the approved V2 trait-card art direction can become a real grounded 3D racing experience.

## Success Means
- `/#race` becomes a real playable kart race with moving 3D track geometry, grounded karts, rivals, pickups, boost pads, VFX, lap flow, finish/results, and restart.
- The first production track is Comeback City Grand Prix using the approved V2 trait cards in `src/assets/game/art-direction/v2/`.
- The runtime uses a low-poly Three.js arcade kart architecture that can scale to the existing track concepts in `src/game/raceTracks.js`.
- The game produces desktop and mobile screenshots/videos that show visible play, not telemetry-only proof.
- The QA suite fails when gameplay regresses to static screenshots, flat overlays, or hidden-state-only movement.
- The next implementation goal can reference this PRD and the focused runtime PRD without needing a giant pasted prompt.

## Stop Condition
Stop the first implementation goal when Comeback City Grand Prix is playable end-to-end on `/#race`, passes the visual/playability gates, and has evidence files proving desktop/mobile motion, full-lap completion, and restart.

## Source Of Truth
- Full game PRD: `COMEBACK_CITY_ARCADE_KART_GAME_PRD.md`
- Immediate runtime PRD: `COMEBACK_CITY_V2_3D_KART_RUNTIME_PRD.md`
- Approved V2 art sheet: `src/assets/game/art-direction/v2/approval-sheet.html`
- Approved V2 prompt notes: `src/assets/game/art-direction/v2/PROMPTS.md`
- Existing track data: `src/game/raceTracks.js`
- Existing Comeback City course data: `src/game/courseV2.js`

## Current Approved Art Direction
Use the V2 trait cards as design-lock references:
- `hero-red-kart-trait-card-v2.png`
- `purple-tech-rival-trait-card-v2.png`
- `blue-speed-rival-trait-card-v2.png`
- `orange-muscle-rival-trait-card-v2.png`
- `green-utility-rival-trait-card-v2.png`
- `black-gold-elite-rival-trait-card-v2.png`
- `white-red-support-rival-trait-card-v2.png`
- `track-geometry-road-system-trait-card-v2.png`
- `district-portals-facades-trait-card-v2.png`
- `roadside-props-barriers-trait-card-v2.png`
- `pickups-boost-vfx-trait-card-v2.png`
- `material-lighting-camera-trait-card-v2.png`

The shared direction is a premium original arcade kart racer with N64-era readability, modern polish, glossy toy-like materials, chunky silhouettes, saturated clean color, and readable chase-camera composition.

## Product Scope

### MVP: Comeback City Grand Prix
Deliver one polished track and one complete arcade race loop:
- One hero kart.
- Three active rivals.
- Countdown/start.
- Acceleration, braking, steering, hop/drift, mini-turbo, boost pads, item boxes.
- One complete Comeback City route with three laps.
- Finish gate, results, and restart.
- Desktop keyboard controls.
- Mobile touch controls.
- DOM HUD for readable speed, lap, held item, drift/boost state, placement, and finish state.
- Evidence videos and screenshots for desktop and mobile.

### V1: Multi-Track Arcade Cup
Expand after the Comeback City runtime is proven:
- Comeback City Grand Prix.
- Tide Pier.
- Static Storm Plateau.
- Magnet Mine Descent.
- Shared kart physics and race systems.
- Track-specific scenery, hazards, items, rivals, camera beats, and encounter rhythms.
- Cup flow, track select, scoring, restart, and replay evidence.

### Later Scope
Add after V1 fundamentals are stable:
- Roster select.
- Rival personalities.
- Unlocks/progression.
- Additional item variety.
- Advanced mobile tuning.
- Hover/vehicle-switch maps.
- Audio polish.
- Accessibility settings.

## Answer: Do We Need More Sheets First?
Use the approved V2 sheets to start the Comeback City implementation now. They are enough for the first 3D runtime spike because they lock cart style, generic road kit, portals/facades, props, pickups/VFX, materials, lighting, and camera.

Create more sheets before scaling beyond Comeback City. The current V2 set does not fully lock every track layout, biome, obstacle family, camera beat, or track-specific model kit for Tide Pier, Static Storm Plateau, and Magnet Mine Descent.

Recommended sequence:
1. Build the Comeback City 3D runtime from the approved V2 sheets.
2. Prove the pipeline with screenshots, video, telemetry, tests, and owner playtest.
3. Generate track-layout and biome sheets for the next track after the runtime pipeline is working.
4. Expand one track at a time.

## Missing Sheets For Full Game Scale
Create these sheets after the Comeback City runtime proves the pipeline:

### Track Layout Blueprint Sheet
One per track:
- Top-down route map.
- Start grid and finish placement.
- Lap route direction.
- Major turns and apex cues.
- Elevation profile.
- Boost pad placement.
- Item box placement.
- Rival line placements.
- Hazard placement.
- Shortcut placement.
- Camera landmark beats.
- Mobile crop risk zones.

### Track Environment Identity Sheet
One per track:
- Biome color palette.
- Landmark silhouettes.
- Building/facade kit.
- Ground/road materials.
- Background skyline.
- Side props.
- Signage language.
- Lighting mood.
- Weather/time-of-day treatment.

### Gameplay Encounter Sheet
One per track:
- Opening 10-second race read.
- First turn challenge.
- Mid-lap decision point.
- Signature hazard.
- Boost rhythm.
- Item-box rhythm.
- Rival overtake moments.
- Final stretch.
- Restart/result framing.

### Asset Production Sheet
One per track or shared kit:
- Required meshes.
- Required textures.
- Required sprite/VFX atlases.
- LOD rules.
- Collision boundaries.
- Instancing candidates.
- Texture atlas packing.
- Reuse rules from Comeback City.

## Existing Track Concepts
The current code names these tracks in `src/game/raceTracks.js`:
- `comeback-city`: Comeback City Grand Prix, Kart Arcade Circuit, Standard.
- `tide-pier`: Tide Pier, Switching, Beginner.
- `static-storm-plateau`: Static Storm Plateau, Air Mastery, Expert.
- `magnet-mine-descent`: Magnet Mine Descent, Polarity, Intermediate.

Use Comeback City as the first production track. Treat the other three as future V1 expansion tracks until each receives track-layout and environment identity sheets.

## Core Game Pillars

### Pillar 1: Playable First
Every visual system should respond to player control:
- Throttle increases speed, camera energy, engine VFX, and track motion.
- Steering shifts kart position, kart lean, camera follow, and racing line.
- Braking reduces speed and changes engine/exhaust presentation.
- Drift changes kart yaw, adds sparks, charges mini-turbo, and releases visible boost.
- Boost pads create speed spike, camera pulse, flame burst, and road-speed read.
- Item boxes move through the world, get collected by lane/timing, and update held item.

### Pillar 2: Grounded 3D Scene
Build the gameplay world from real runtime objects:
- Track mesh.
- Curbs.
- Guardrails.
- Props.
- Portals.
- Buildings.
- Karts.
- Pickups.
- Boost pads.
- Finish gate.
- VFX.
- Camera.

Use approved V2 images as reference for models, materials, textures, and camera, not as the playable world surface.

### Pillar 3: N64 Readability With Modern Polish
Prioritize:
- Chunky silhouettes.
- Clear road boundaries.
- Large kart reads.
- Readable item cubes and boost pads.
- Strong color accents.
- Simple geometry.
- Polished materials.
- Stable chase camera.
- Mobile-safe composition.

### Pillar 4: Evidence-Based Approval
Every implementation phase should produce:
- Desktop screenshot.
- Mobile screenshot.
- Desktop 10-second video when motion changes.
- Mobile 10-second video when mobile framing changes.
- Telemetry JSON.
- Contact sheet comparing approved V2 references and current runtime.

## Technical Architecture

### Runtime Stack
Use React for route/HUD and Three.js for race rendering.

Core pieces:
- `RaceScreen`: route shell, track selection, production route mount.
- `ComebackCityThreeKartRace`: current 3D spike/runtime component or its successor.
- `race/physics`: pure kart movement, steering, drift, boost, item state.
- `race/render`: Three.js scene, track mesh, vehicles, scenery, pickups, VFX.
- `race/playtest`: deterministic automation and screenshot/video evidence capture.
- `raceTelemetry`: browser-visible telemetry for tests and manual QA.

### Route Strategy
Implement in this order:
1. Keep `/#race-3d-spike` as the isolated build route while proving the runtime.
2. Promote the runtime to `/#race` after gates pass.
3. Keep legacy/debug routes reachable for comparison evidence.
4. Keep `/#visual-kart-proof` and `/#visual-kart-playable` as visual reference routes only.

### Scene Layers
Build the Three.js scene from these systems:
- Track geometry system.
- Kart model system.
- Rival model system.
- Pickup/item system.
- Boost pad system.
- Scenery/prop system.
- Portal/facade system.
- VFX system.
- Lighting/material system.
- Camera system.
- HUD bridge.
- Telemetry bridge.

### Performance Target
Start with 34 FPS minimum on desktop evidence captures.

Design for later improvement:
- Use low-poly geometry.
- Use shared materials.
- Use instanced meshes for repeated props.
- Use texture atlases for small signs/decals/VFX.
- Keep runtime object counts visible in telemetry.
- Keep mobile detail scaling explicit.

## Immediate Implementation Plan

### Phase 0: Goal Ledger And Audit
Create or update:
- `.agent/runs/comeback-city-v2-3d-kart-runtime/GOAL.md`
- `.agent/runs/comeback-city-v2-3d-kart-runtime/implementation-notes.html`
- `.agent/runs/comeback-city-v2-3d-kart-runtime/evidence/`

Record:
- Approved V2 art paths.
- Current route state.
- Existing tests.
- Current visual failure modes.
- Target route strategy.
- Decisions made during implementation.
- Evidence produced at each gate.

### Phase 1: Runtime Spike
Build `/#race-3d-spike` as a clean Three.js kart scene:
- Real road mesh with at least one broad turn and one elevation/bridge beat.
- Curbs and guardrails from the V2 road-system card.
- Hero red kart modeled from the V2 hero card.
- Three rivals modeled from the V2 rival cards.
- Boost pad from the V2 pickups/VFX card.
- Item cube from the V2 pickups/VFX card.
- Finish gate placeholder using V2 road/facade language.
- 20-40 instanced props from V2 roadside and facade cards.
- Chase camera matching the V2 material/lighting/camera card.
- Basic telemetry.

Gate:
- Capture desktop and mobile screenshots.
- Capture a 10-second desktop video.
- Compare against current `/#race` and approved V2 cards.
- Continue only when the spike is visibly closer to V2 than the current route.

### Phase 2: Core Kart Feel
Implement pure simulation and visible motion:
- Speed curve.
- Steering curve.
- Reverse/brake behavior.
- Hop/drift input.
- Drift yaw and lateral slide.
- Drift spark tiers.
- Mini-turbo release.
- Boost state.
- Off-road slowdown.
- Simple collision bounds.
- Camera lag and speed FOV.

Gate:
- Keyboard and mobile controls visibly change the kart, track, camera, and VFX.
- Screenshot diffs show gameplay-region motion.
- Telemetry matches visible state.

### Phase 3: Race Loop
Implement one full Comeback City lap loop:
- Start countdown.
- Three-lap progress.
- Rivals with deterministic progress.
- Boost pad triggers.
- Item box pickups.
- Finish gate.
- Results screen.
- Restart.

Gate:
- Desktop automation completes a full race.
- Manual controls can complete at least one lap.
- Restart returns kart, rivals, pickups, telemetry, and HUD to initial state.

### Phase 4: V2 Art Integration
Refine the runtime against the trait cards:
- Replace placeholder shapes with V2-informed meshes.
- Add kart body depth, rear lights, tire shapes, exhaust, shadows, and boost state.
- Add rival variants with silhouette/color differences.
- Add district portals and facades as low-poly landmarks.
- Add road arrows, lane paint, curb flashes, barriers, and signs.
- Add item cube glow, boost pad glow, drift sparks, exhaust flames, and finish burst.
- Add material tuning for asphalt, paint, rubber, neon, fire, portal glow, foliage, and buildings.
- Tune desktop and mobile chase camera composition.

Gate:
- Desktop and mobile screenshots read as the approved V2 world.
- Karts look grounded on the track.
- The road looks like a playable 3D course, not a pasted panel.

### Phase 5: Production Promotion
Promote the proven runtime:
- Mount the new runtime at `/#race`.
- Keep `/#race-3d-spike` as debug/evidence if useful.
- Preserve reference routes.
- Update tests to target production `/#race`.
- Keep telemetry stable for QA.

Gate:
- `/#race` opens directly to the production-quality playable track.
- The route shows real play before inspecting telemetry.
- Legacy renderers stay out of the production route.

### Phase 6: QA And Evidence
Run:
- `npm run build`
- `npm run test:kart-proof`
- `npm run test:kart-playable`
- `npm run test:kart-3d-spike`
- Browser smoke for `/#race`

Create:
- `tmp/kart-playable-proof-test/desktop-10s.webm`
- `tmp/kart-playable-proof-test/mobile-10s.webm`
- `tmp/kart-playable-proof-test/kart-visual-approval-sheet.html`
- `tmp/kart-playable-proof-test/visible-motion-report.json`
- Contact sheet with approved V2 references, spike, final desktop, final mobile, drift, boost/item, and finish.

## QA Requirements

### Visible Motion Tests
Assert meaningful pixel changes in gameplay regions:
- Idle to throttle.
- Throttle to steering.
- Steering to drift.
- Drift to mini-turbo.
- Boost pad trigger.
- Item pickup.
- Rival movement.
- Finish gate.
- Restart.

### Runtime Guard Tests
Assert production route identity:
- `/#race` reports the V2 Three.js runtime telemetry.
- `/#race` exposes `visualAssetSet: comeback-city-v2-three-runtime`.
- `/#race` maintains FPS estimate at or above 34 in desktop capture.
- `/#race` renders a WebGL scene with moving track/kart/rival regions.

### Static Regression Tests
Detect these failures:
- Main race view remains mostly unchanged while telemetry changes.
- Only HUD text changes.
- Player kart is a flat overlay that does not ground with track/camera.
- Rivals do not change world position.
- Boost/item events appear only in telemetry.
- Finish/restart works only in state, not visually.

## Telemetry Contract
Expose on `window.__comebackCityKartTelemetry`:
- `renderer`
- `route`
- `visualAssetSet`
- `fpsEstimate`
- `speed`
- `steer`
- `brake`
- `drift`
- `driftCharge`
- `miniTurbo`
- `boosting`
- `boostHits`
- `itemPickups`
- `heldItem`
- `rivalCount`
- `rivalPositions`
- `lap`
- `lapProgress`
- `finished`
- `canRestart`
- `sceneObjectCount`
- `instancedMeshCount`
- `trackGeometryMode`
- `evidenceMode`

## Asset Pipeline

### Modeling Rules
Model from trait-card references:
- Use simple low-poly forms.
- Use strong silhouette first.
- Use material color/glow to carry detail.
- Use shared materials and atlases.
- Use separate meshes for animated or interactive objects.
- Use instancing for repeated props.

### Asset Buckets
Produce or derive:
- Hero kart mesh.
- Rival kart meshes.
- Wheels/tires.
- Exhaust flame VFX.
- Drift spark VFX.
- Mini-turbo VFX.
- Boost pad mesh/material.
- Item cube mesh/material.
- Finish gate mesh.
- Road mesh modules.
- Curb modules.
- Guardrail modules.
- Barrier modules.
- Portal/facade modules.
- Trees/lamps/signs/cones/tire stacks.
- Billboard/sign decal atlas.

### Evidence For Assets
Each major asset pass should produce:
- In-game screenshot.
- Close-up screenshot.
- Trait-card reference shown in contact sheet.
- Notes on what was modeled, approximated, or deferred.

## Track Expansion Plan

### Track 1: Comeback City Grand Prix
Status: V2 art direction approved.

Implementation goal:
- Build and ship as MVP.

Additional sheet need:
- Optional full track layout blueprint if current `courseV2.js` is insufficient during implementation.

### Track 2: Tide Pier
Status: Track concept exists in code.

Needed sheets before production:
- Tide Pier layout blueprint.
- Coastal pier environment identity sheet.
- Tide/water hazard encounter sheet.
- Switching route camera sheet if vehicle switching remains in scope.

### Track 3: Static Storm Plateau
Status: Track concept exists in code.

Needed sheets before production:
- Plateau layout blueprint.
- Storm/electric environment identity sheet.
- Air mastery encounter sheet.
- Lightning hazard and vertical camera sheet.

### Track 4: Magnet Mine Descent
Status: Track concept exists in code.

Needed sheets before production:
- Mine descent layout blueprint.
- Underground/magnet environment identity sheet.
- Polarity hazard encounter sheet.
- Descent/elevation camera sheet.

## Decision Gates

### Gate A: Comeback City Spike Approval
Approve when:
- The 3D spike visibly beats the current route.
- Karts and road feel grounded.
- Camera framing works on desktop and mobile.
- Owner can see the approved V2 direction in the runtime.

### Gate B: Playability Approval
Approve when:
- Controls visibly affect the scene.
- Drift and boost feel readable.
- Rivals move through the race world.
- Item and boost events are obvious without telemetry.

### Gate C: MVP Release Approval
Approve when:
- Three-lap race works.
- Finish/results/restart work.
- Desktop and mobile evidence passes.
- Build/tests pass.
- Owner playtest score reaches target.

### Gate D: Multi-Track Expansion Approval
Approve when:
- Comeback City pipeline is stable.
- The next track has layout, environment, encounter, and asset sheets.
- Shared runtime systems accept a second track without rewriting the core.

## Owner Approval Checklist
Ask for owner approval at these points:
- V2 runtime spike visual read.
- Core kart feel.
- First full-lap playable.
- Final Comeback City MVP.
- Each new track sheet set before implementation.
- Each new production track before promotion into the cup.

## Implementation Rules For The Next Goal
Read these files first:
- `COMEBACK_CITY_ARCADE_KART_GAME_PRD.md`
- `COMEBACK_CITY_V2_3D_KART_RUNTIME_PRD.md`
- `src/assets/game/art-direction/v2/PROMPTS.md`
- `src/game/raceTracks.js`
- `src/game/courseV2.js`
- Current `src/game/ComebackCityThreeKartRace.jsx`
- Current race render/physics modules under `src/game/race/`

Build in small gates:
- Create evidence at every visual/mechanics gate.
- Use browser screenshots/videos to verify visible play.
- Use telemetry to support evidence, not replace it.
- Keep implementation notes current.
- Ask when the approved sheets are insufficient for a specific asset, track decision, or visual direction.

## Fable Goal Prompt
Use this prompt in a clean goal chat:

```text
/goal /Users/andrewferguson/Downloads/comeback-tracker/COMEBACK_CITY_ARCADE_KART_GAME_PRD.md

Goal: Implement the Comeback City Arcade Kart MVP from the game PRD, starting with the approved V2 Three.js Comeback City runtime and carrying it through production `/#race`.

Success means:
- `/#race` is a visibly playable low-poly Three.js kart race using the approved V2 trait-card art direction.
- The player kart, rivals, track, pickups, boost pads, VFX, finish gate, HUD, lap flow, results, and restart all work visibly.
- Desktop and mobile screenshots/videos prove motion and playability without relying on hidden telemetry.
- Tests and browser QA catch static-page, flat-overlay, old-renderer, and telemetry-only regressions.
- The goal ledger at `.agent/runs/comeback-city-v2-3d-kart-runtime/` is current and links final evidence.

Stop when: Comeback City Grand Prix is playable end-to-end on `/#race`, build/tests pass, evidence files are produced, and the final implementation notes explain what changed and what remains for multi-track expansion.

Read first:
- `COMEBACK_CITY_ARCADE_KART_GAME_PRD.md`
- `COMEBACK_CITY_V2_3D_KART_RUNTIME_PRD.md`
- `src/assets/game/art-direction/v2/approval-sheet.html`
- `src/assets/game/art-direction/v2/PROMPTS.md`
- `src/game/raceTracks.js`
- `src/game/courseV2.js`
- `src/game/ComebackCityThreeKartRace.jsx`
- `src/game/race/`

Implement the PRD in gated phases. Start with the real 3D runtime spike, verify it visually, add kart feel, add race loop, integrate V2 art, promote to `/#race`, and run the required QA evidence. Ask only when a required asset, track decision, or visual approval cannot be resolved from the PRD and approved V2 sheets.
```
