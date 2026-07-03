# Codex Research Prompt: Penguin Kart VFX, Track Dressing, and Audio Plan

## Mission

You are doing a **research-and-planning pass only** for a React/Vite/Three.js arcade kart racer in this GitHub repo:

- Repo: `https://github.com/beckelspreadsheets-ui/comeback-tracker.git`
- Branch: `codex/release-v1-comebacktracker-kart-racer`

Do **not** implement code yet. Do **not** edit files. Do **not** commit anything.

Your job is to inspect the actual repo on the exact branch above, understand the current race/VFX/track/audio architecture, and return a detailed implementation plan that a future CLI coding agent can execute safely in small visual checkpoints.

The primary goal is to improve:

1. Kart/race visual effects
2. Penguin Village track dressing
3. Audio planning

while preserving the current toy-like 3D arcade kart-racer style and avoiding risky physics/gameplay changes.

---

## Critical Style Correction

Ignore any earlier version of this project direction that described the style as strict “N64.”

The correct art direction is:

**Toy-like 3D arcade kart-racer assets with rounded chunky shapes, soft bevels, clean simplified PBR materials, readable silhouettes, mascot-friendly proportions, and simple emissive accents.**

The current attached/project GLB art is real game art and is the visual source of truth. The game should feel like polished toy/game-asset renders, not jagged retro N64 hardware.

Use “low-poly/faceted” only where it naturally fits:

- Ice chunks
- Crystals
- Drift sparks
- Snowball pieces
- Fish bone hazard
- Blizzard geometry
- Aurora panels
- Other simple mesh-based VFX particles

Do not make the whole game jagged, blocky, or rough just to satisfy “low-poly.” The world should feel like a cohesive toy-like penguin kart racer.

If reference assets are attached or available in the repo, use them as the visual source of truth:

- Current red go-kart
- Current ice sled
- Seth penguin
- T Clow penguin
- Any other Ordinal Penguin character GLBs

---

## Visual Style Rules

Preserve this style:

- Toy-like 3D game assets
- Rounded chunky shapes
- Soft beveled edges
- Clean simplified forms
- Smooth but not realistic
- Slight low-poly/faceted treatment only for ice, crystals, and VFX
- Bright readable silhouettes
- Mascot-friendly proportions
- Arcade kart-racer energy
- Clean PBR-style materials
- Matte plastic, rubber, painted metal, frosted ice, and simple emissive accents
- Cyan/ice-blue VFX accents
- Warm amber only for windows, signage, or cozy decorative accents

Avoid:

- Strict N64 hardware look
- Jagged blocky models everywhere
- Gritty realism
- Photorealistic materials
- Cinematic lighting
- Bloom-heavy effects
- Lens flare
- Volumetric fog
- Realistic smoke/fire/snow simulations
- Thin fragile details
- High-poly particle systems
- Replacing the current game vibe with a different art style

---

## Color Palette

Use this palette consistently:

| Hex | Name | Use |
|---|---|---|
| `#F5F8FF` | Ice White | Snow, crystal base, spark base |
| `#00E5FF` | Bright Cyan | Primary VFX accent, trails, shield edges |
| `#7EC8E8` | Ice Blue | Secondary ice material, shield, fish bone |
| `#FF8C00` | Flame Orange | Boost flame core |
| `#FFD34F` | Flame Yellow | Boost flame mid, pickup ring |
| `#00E5C9` | Aurora Teal | Aurora ultimate left band |
| `#39FF8C` | Aurora Green | Aurora ultimate center band |
| `#7B61FF` | Aurora Violet | Aurora ultimate right band |
| `#F5A623` | Warm Amber | Windows, signage, cozy accents only |

---

## Hard Constraints for the Future CLI Agent

The eventual coding agent must follow these rules:

1. Study existing code before writing anything.
2. Use grep/read-only inspection first.
3. Make one meaningful change at a time.
4. After each significant visual change, run the game with `npm run dev`.
5. Capture a screenshot from the actual game, preferably chase-cam/kart view.
6. If a screenshot looks wrong, stop and fix that change before moving on.
7. Do not batch multiple VFX changes together.
8. Preserve the current toy-like 3D arcade kart-racer aesthetic.
9. Use simple mesh-based VFX, not expensive particle systems.
10. Use emissive materials only for glow effects.
11. Do not add point lights.
12. Do not add bloom or post-processing.
13. Do not touch physics/gameplay systems unless absolutely necessary and explicitly justified.
14. Do not use strict N64 style.
15. Do not force all geometry to be jagged or blocky.
16. Do not alter gameplay balance unless explicitly required and justified.

---

## First Local Verification Steps

Before planning, verify these assumptions locally:

1. Confirm current branch is `codex/release-v1-comebacktracker-kart-racer`.
2. Confirm whether `src/game/ComebackCityThreeKartRace.jsx` is still the main runtime.
3. Confirm whether Penguin Village dressing is inside `ComebackCityThreeKartRace.jsx`, under `src/game/race/render/`, or somewhere else.
4. Confirm exact GLB paths for Seth, T Clow, ice sled, red kart, and other Ordinal Penguin characters.
5. Confirm whether audio folders or audio systems already exist.
6. Confirm screenshot/playtest commands that work on this branch.
7. Confirm whether `createVehicleModel` or `createGroundedKartModel` is the active vehicle factory.
8. Confirm where current drift/boost/item VFX are created and updated.
9. Confirm whether current item VFX pools already exist.
10. Confirm which files are safe to touch later.

If the repo differs from the assumptions in this prompt, explain the difference and adapt the plan to the actual branch.

---

## Required Discovery Commands

Run these commands before writing the plan:

```bash
git status --short
git branch --show-current
git checkout codex/release-v1-comebacktracker-kart-racer

grep -n "driftSpark" src/game/ComebackCityThreeKartRace.jsx
grep -n "boostFlame" src/game/ComebackCityThreeKartRace.jsx
grep -n "idleFlame" src/game/ComebackCityThreeKartRace.jsx

grep -n "sparkColors\|DRIFT_FEEL\|chargeTimes\|releaseFlash" src/game/race/driftFeel.js

grep -n "createVehicleModel\|createGroundedKartModel\|driftSparkGroup\|boostFlame\|return {" src/game/ComebackCityThreeKartRace.jsx | head -80

grep -n "palette" src/game/race/tracks/penguinVillage.js | head -20

grep -rn "dressing" src/game/race/ --include="*.js" | head -80

grep -rn "audio\|sound\|Audio\|playSound" src/game/ --include="*.js" | head -80

find public -name "*.glb" | head -80
find src/assets -name "*.glb" | head -120

find public -iname "*seth*" -o -iname "*penguin*" -o -iname "*tclow*" -o -iname "*clow*"
find src/assets -iname "*seth*" -o -iname "*penguin*" -o -iname "*tclow*" -o -iname "*clow*"

find public -path "*audio*" -o -path "src/assets/audio/*"

cat package.json | sed -n '1,120p'
```

Also inspect these files if they exist:

```bash
sed -n '1,260p' src/game/race/driftFeel.js
sed -n '1,260p' src/game/race/tracks/penguinVillage.js
sed -n '1,220p' src/game/race/tracks/comebackCity.js
sed -n '1,220p' src/game/race/render/createRaceScene.js
sed -n '1,260p' src/game/race/render/createRaceScenery.js
sed -n '1,220p' src/game/race/render/createBillboardText.js
sed -n '1,340p' src/game/race/heldItems.js
```

Use additional greps as needed.

---

## Files to Inspect First

### Core race / vehicle / VFX

- `src/game/ComebackCityThreeKartRace.jsx`
- `src/game/race/driftFeel.js`
- Any existing VFX module under `src/game/race/render/`

Focus on:

- Vehicle model creation
- Drift spark creation
- Boost flame creation
- Idle flame creation, if present
- Shield visuals, if present
- Projectile / item VFX pools, if present
- Game loop / per-frame updates
- Race initialization
- How `engine.playerModel` is created and accessed
- What object references are safe to attach to the player model

### Track / scenery

- `src/game/race/tracks/penguinVillage.js`
- `src/game/race/tracks/comebackCity.js`
- `src/game/race/render/createRaceScene.js`
- `src/game/race/render/createRaceScenery.js`
- `src/game/city3dAssets.js`
- `src/game/race/render/createBillboardText.js`

Focus on:

- Track palette
- Track dressing flags
- Waypoints/progress placement
- Existing scenery factory functions
- How billboard text works
- Where Penguin Village-specific dressing should live
- Whether Penguin Village already has procedural dressing

### Items / audio

- `src/game/race/heldItems.js`
- `src/game/race/raceState.js`
- Any file matching audio/sound patterns
- `public/audio/`
- `src/assets/audio/`

Focus on:

- Item trigger points
- Boost state
- Drift state
- Lap complete state
- Whether an audio system already exists
- Whether new sound assets should be placed in `public/audio/`
- Whether item VFX hooks can remain non-invasive

### Character GLB models

Search for Penguin/Seth/T Clow model paths:

```bash
find public -name "*.glb" | head -80
find src/assets -name "*.glb" | head -120

find public -iname "*seth*" -o -iname "*penguin*" -o -iname "*tclow*" -o -iname "*clow*"
find src/assets -iname "*seth*" -o -iname "*penguin*" -o -iname "*tclow*" -o -iname "*clow*"
```

Confirm exact paths before recommending GLB statue placement.

---

## Research Output Required

Return a detailed plan with the sections below.

Do not guess. Base findings on the actual branch and cite local file paths with approximate line ranges.

---

# 1. Short Architecture Summary

Explain where these systems currently live, using file paths and approximate line ranges:

- Main kart race runtime
- Vehicle model creation
- Authored GLB loading and swapping
- Driver/avatar mounting
- Drift sparks
- Boost flames
- Idle flames, if present
- Race loop / per-frame updates
- Race initialization
- Player model setup
- Item VFX pools
- Shield, snowball, fish bone, blizzard, aurora, and other current item visuals
- Track definition
- Track palette
- Track dressing/scenery placement
- Penguin Village dressing, if already present
- Billboard text
- Existing city/ice/scenery asset factories
- Item system hooks
- Audio system, or lack of one
- Character GLB model locations
- Screenshot/playtest scripts

---

# 2. Current Implementation Risk Assessment

Identify risks before changing anything:

- Which systems are tightly coupled inside `ComebackCityThreeKartRace.jsx`
- Which objects are safe to attach to `engine.playerModel`
- Whether a new VFX module should be created
- Whether changes should stay local inside existing files
- Whether object pooling is already present
- Whether new object pooling is needed for trails/particles
- Whether existing material/helper functions should be reused
- Whether screenshot automation is available or screenshots must be manual
- Which files should not be touched because they affect gameplay/physics
- Whether existing bloom/post-processing already exists and why not to add more

---

# 3. Corrected Visual Direction

Define the final art direction clearly:

The target is toy-like 3D arcade kart racer, not strict N64.

Use:

- Rounded chunky toy shapes
- Clean PBR-style materials
- Soft bevels
- Simple mesh-based VFX
- Faceted ice/crystals/particles only where appropriate
- Cyan/ice-blue emissive accents
- Warm amber cozy accent lighting for windows/signage
- Readable silhouettes at racing speed

Avoid:

- Harsh jagged geometry everywhere
- Overly realistic VFX
- Heavy bloom/post-processing
- Gritty textures
- Tiny fragile details
- Modern cinematic effects

Also explicitly note that attached art/GLBs are real game art references and should guide the plan.

---

# 4. Phase Roadmap

Create a plan in this exact order.

---

## Phase 1: Existing Drift VFX Polish

This phase should make the smallest safe visual improvements first.

Tasks:

1. Change only `sparkColors` in `src/game/race/driftFeel.js`.
2. Lower spark emissive intensity and preserve/favor faceted polished ice-gem styling.
3. Add a mini-turbo burst ring.
4. Add a capped ground ice trail for tier 2+ drifts.

For each task, include:

- File path
- Existing code location/pattern to search for
- Exact change description
- Whether the change preserves the current toy-like asset style
- Acceptance criteria
- Screenshot angle required
- What can go wrong
- How to revert safely
- Suggested commit message

Important: the drift VFX should look like polished chunky ice-gem effects, not rough N64 particles.

Stop after Phase 1. Do not plan implementation beyond Phase 1 as one coding batch.

---

## Phase 2: Particle / Item VFX

Plan each effect separately:

1. Boost flame improvement
2. Ice shield
3. Snowball projectile
4. Fish bone hazard
5. Blizzard item
6. Aurora ultimate
7. Pickup, air trick, and lap-complete micro effects

For each effect, define:

- Whether it should attach to the kart, scene, item object, or VFX manager
- Geometry budget
- Material style
- Animation lifecycle
- Pooling strategy
- Trigger source
- Screenshot test
- Fallback plan if item hooks are unclear

Performance target:

- Keep all active particle geometry simple and low-poly enough for a web game.
- Avoid unbounded mesh creation.
- Use cleanup or pooling.
- Do not create/destroy meshes every frame.

Correct VFX style:

- Drift sparks: chunky polished ice gems/dodecahedrons
- Mini-turbo ring: clean cyan torus, faceted but polished
- Ice trails: simple frosted ice rectangles/chips
- Boost flames: stacked cone shapes, arcade-like, orange/yellow/white
- Shield: rounded faceted ice dome, transparent blue, cyan panel lines
- Snowball: chunky icosahedron-like snowball
- Fish bone: funny cartoon hazard, rounded low-poly bones, not creepy or sharp
- Blizzard: simple spiral mesh geometry, not fog
- Aurora: flat curved colored energy panels, not volumetric realism

---

## Phase 3: Penguin Village Track Dressing

Plan changes to:

1. Penguin Village palette
2. Start/finish ice arch
3. “ICE IS NICE” sign
4. Seth and T Clow GLB statue placement, only after exact model paths are confirmed
5. Igloo buildings
6. Frozen pond crystals
7. Fish market stalls
8. Penguin spectator statues

For each dressing feature, include:

- Placement strategy using track progress/lane offsets if available
- Whether to reuse existing factory functions
- Whether to add a new `dressPenguinVillage.js`
- Whether models should be loaded from existing GLBs
- Screenshot acceptance criteria
- Collision/drivability safety rules
- Performance risks
- Suggested commit message

Correct track dressing style:

- Penguin Village should feel like a polished toy playset.
- Use rounded igloos, chunky ice arch, soft beveled market stalls, cozy warm amber windows, cyan-white curbs, frosted blue crystals, and cute penguin ice statues.
- Dressing must stay outside the drivable road unless it is clearly part of the start/finish arch and does not interfere with gameplay.

---

## Phase 4: Audio Plan

Audit whether audio already exists.

Then propose a practical web-game audio plan:

- Engine loop
- Drift tier sounds
- Mini-turbo release
- Pickup
- Snowball throw
- Fish bone drop
- Shield activate
- Blizzard
- Aurora
- Lap complete
- Penguin cheers/honks
- Background music loop

For each sound, specify:

- File name
- Target length
- Loop or one-shot
- Trigger condition
- Volume/pitch behavior
- Whether it can be synthesized with Web Audio first or needs an asset file
- Where it should live, likely `public/audio/`
- How to avoid copyrighted audio
- How to keep the audio whimsical and consistent with a toy-like penguin kart racer

Do not wire audio before the visual systems are stable unless the repo already has a clean audio system ready.

---

# 5. CLI Agent Execution Protocol

Create a second section that can be pasted directly into a CLI coding agent.

It should include:

- Branch checkout
- Dependency install
- Dev server command
- Grep commands
- Screenshot protocol
- Commit strategy
- “Stop after Phase 1” rule
- No batching rule
- Files allowed to touch
- Files not allowed to touch

The CLI agent plan must be broken into small task cards. Each task card should include:

- Objective
- Commands to inspect
- Files to edit
- Exact code-level intent
- Validation command
- Screenshot requirement
- Commit message
- Stop/continue condition

The CLI agent should not move from one task to the next unless the screenshot looks correct.

---

# 6. Files the CLI Agent May Touch Later

Allowed files:

- `src/game/ComebackCityThreeKartRace.jsx`
- `src/game/race/driftFeel.js`, but only `sparkColors` unless research proves a safe reason
- Existing or new files under `src/game/race/render/`
- `src/game/race/tracks/penguinVillage.js`
- New Penguin Village dressing file if appropriate, such as `src/game/race/render/dressPenguinVillage.js`
- `public/audio/` for new original/generated audio files

---

# 7. Files the CLI Agent Should Not Touch Later

Do not touch these unless the research plan gives a very specific reason:

- `src/game/race/physics/kartTuning.js`
- `src/game/race/physics/kartPhysics.js`
- `src/game/race/physics/surfacePhysics.js`
- `src/game/race/airTricks.js`
- `src/game/race/heldItems.js`
- `src/game/race/rivalRacers.js`
- `src/game/race/raceBreakables.js`
- `src/game/race/raceCrossers.js`

If item VFX needs hooks from held items, prefer non-invasive event/VFX hooks. Do not rewrite item behavior.

---

# 8. What Not To Do

Explicitly warn the CLI agent not to:

- Touch physics/tuning files
- Replace existing systems wholesale
- Add point lights
- Add bloom/post-processing
- Add realistic smoke, fog, fire, or snow simulations
- Create particles every frame without pooling or cleanup
- Use high-poly spheres for particles
- Implement all phases in one pass
- Add audio before visual systems are stable
- Add GLB statues before confirming exact model paths
- Force every object into a jagged N64 style
- Degrade the current rounded toy-like GLB asset vibe
- Batch multiple visual changes into one commit
- Commit research-only work unless asked

---

# 9. Final Deliverable Format

Return the answer in this format:

1. Short architecture summary
2. Risk checklist
3. Corrected visual style guide
4. Phase roadmap
5. Detailed Phase 1 CLI task cards
6. Phase 2 planned task cards
7. Phase 3 planned task cards
8. Phase 4 audio task cards
9. Screenshot checklist
10. Suggested git commit sequence
11. Open questions / unknowns that require repo inspection

Do not write production code except for small illustrative snippets if they clarify the plan.

The main deliverable is a precise, repo-grounded implementation plan that a future CLI agent can safely execute one visual checkpoint at a time.

Again: do not edit code. Do not commit. Research and planning only.
