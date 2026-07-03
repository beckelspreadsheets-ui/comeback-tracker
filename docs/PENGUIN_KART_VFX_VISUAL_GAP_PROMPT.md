# Prompt: Close the Visual Gap Between Character Cards and In-Game Race

## Context

We are working on **Comeback City Kart Racer**, an arcade kart-racer mode inside a React/Vite PWA. The project uses **Three.js** for the 3D race runtime.

The owner has produced high-quality character/trait cards with ChatGPT Image Gen 2 (the "character sheets"). These look great. The in-game race currently does not. We need a second pair of eyes — an agent with strong visual/graphics judgment — to inspect the gap and propose a concrete, achievable plan to make the in-game race look visually appealing and aligned with the character cards.

## Current state

### Approved visual target

- `docs/race-visual-target-brief.md` — owner-approved visual target, scope, and IP boundary.
- `src/assets/game/reference/comeback-city-original-reference.png` — the owner-supplied original ChatGPT Image Gen 2 reference screenshot for composition, color, and mood.

### Character / art direction cards

Inspect these to understand the intended look:

- `src/assets/game/art-direction/v2/hero-red-kart-trait-card-v2.png`
- `src/assets/game/art-direction/v2/purple-tech-rival-trait-card-v2.png`
- `src/assets/game/art-direction/v2/orange-muscle-rival-trait-card-v2.png`
- `src/assets/game/art-direction/v2/blue-speed-rival-trait-card-v2.png`
- `src/assets/game/art-direction/v2/material-lighting-camera-trait-card-v2.png`
- `src/assets/game/art-direction/v2/pickups-boost-vfx-trait-card-v2.png`
- `src/assets/game/art-direction/v2/district-portals-facades-trait-card-v2.png`
- `src/assets/game/art-direction/v2/roadside-props-barriers-trait-card-v2.png`
- `src/assets/game/art-direction/v2/track-geometry-road-system-trait-card-v2.png`
- `src/assets/game/art-direction/comeback-city-world-trait-sheet-v1.png`

### Current in-game evidence

Look at the most recent captures to see what actually renders right now:

- `.agent/runs/kart-racer-production-readiness/evidence/phase5-automation-2026-06-17/route-check/race-hash-landing.png` — current live `/#race` route, Comeback City track.
- `.agent/runs/kart-racer-production-readiness/evidence/phase5-automation-2026-06-17/route-check/race-playtest.png` — old `ArcadeRace3D` route (legacy, for comparison only).
- `.agent/runs/kart-racer-production-readiness/evidence/phase5-capture-2026-06-17T19-14-36-932Z/sustained-normal-play.png` — sustained normal-play screenshot.
- `.agent/runs/kart-racer-production-readiness/evidence/fresh-user-clip-2026-06-17T19-15-16-086Z/fresh-user-10s.webm` — 10-second silent clip of live race.

### Current 3D implementation surface

- `src/game/ComebackCityThreeKartRace.jsx` — main live race component.
- `src/game/race/render/createRaceScenery.js` — scenery/rendering logic (recent optimization pass completed here).
- `src/game/race/camera/chaseCamera.js` — camera logic.
- `src/assets/game/models/` — current GLB models (Kenney kit + Tripo-generated avatars/karts).
- `src/assets/game/select/` — auto-generated select-screen portraits from the GLBs.
- `src/assets/game/asset-manifest.json` — provenance and role notes for each asset.

### Current performance context

- Latest sustained capture showed ~14 average FPS in the automated environment, but this may be environment-specific.
- The PRD targets: desktop 55–60 FPS, ordinary laptop 45+ FPS, modern phone 30+ FPS.
- Recent optimization pass reduced triangles ~12% and improved FPS ~18%.
- Any visual upgrade must not blow the performance budget.

## What the owner wants

The owner observed that the in-game race does not look visually appealing or like the character cards. They want to know **how to make it match the quality and style of the character cards**, similar to how the penguin/avatar work achieved that alignment.

## Your task

1. **Inspect the gap.** Compare the reference art, trait cards, and current in-game screenshots side by side. Identify the biggest visual problems in specific terms (lighting, materials, models, environment, camera, post-processing, color, composition, VFX, UI/HUD).

2. **Propose concrete techniques.** For each problem area, suggest achievable techniques using the existing stack (Three.js, React, Vite). Consider:
   - Material upgrades (PBR, toon shading, emissive accents, rim lighting).
   - Lighting upgrades (ambient, directional, hemisphere, fake GI, light cookies).
   - Environment dressing (props, decals, instanced details, skybox/atmosphere).
   - Camera and framing improvements.
   - Post-processing (bloom, color grading, vignette, tonemapping).
   - Asset pipeline improvements (better Tripo prompts, texture painting, ChatGPT Image Gen 2 generated textures, GLB optimization).
   - VFX for boost, drift, items, hazards.

3. **Respect constraints.**
   - Must run on Mac mini M4 Brave + iPhone 16 Pro Safari.
   - Must not introduce unlicensed external assets.
   - Must stay within or justify any bundle-size impact.
   - Must preserve the current gameplay/controls/camera behavior unless a change is explicitly justified.
   - Must not copy Nintendo/Mario Kart protected trade dress.

4. **Produce a plan document.** Write your findings and plan to:
   - `docs/PENGUIN_KART_VFX_VISUAL_GAP_PLAN.md`

   Include:
   - Executive summary of the top 3–5 visual problems.
   - A prioritized table of fixes with: problem, proposed technique, files to touch, estimated effort, performance risk, evidence needed.
   - A "quick wins" section for changes that can be tried immediately with low risk.
   - A "deep cuts" section for changes that require more time or owner decision.
   - Before/after mock descriptions or references.
   - Stop points — when the agent should pause and ask the owner before proceeding.

5. **Do not implement yet.** This pass is analysis and planning only. Do not modify source files except for the plan document itself.

## Questions to answer in the plan

- Why does the current in-game look flat / low-detail compared to the cards?
- Which single change would give the biggest visual improvement for the least risk?
- Can we generate/paint textures from the existing ChatGPT Image Gen 2 art to wrap the 3D models?
- Should we replace any of the current Kenney/Tripo assets with owner-generated alternatives?
- What post-processing stack (if any) is appropriate for V1 without hurting mobile FPS?
- Does the camera framing and horizon placement match the approved visual target? If not, what should change?
- What is the minimum set of changes needed to make Comeback City look like an intentional arcade kart racer rather than a prototype?

## Output

Return a concise summary of the plan document path and the top 3 recommendations. The owner will review the plan and decide which items to green-light for implementation.
