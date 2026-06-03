# World Studio Quality Code Mode Plan

Objective: make `/world` visually match the rightmost reference image in `img/world/hyperrealistic-gallery-target-right.png`, while preserving the fast static `/` route, four current exhibits, inspection/scroll/open-site behavior, collisions, mobile controls, fallbacks, and the existing verification discipline.

## Current Visual Gap

Evidence inspected:

- Current in-app browser view: `http://127.0.0.1:8765/world?try=1#inspect-evenpath`
- Target reference: `img/world/hyperrealistic-gallery-target-right.png`
- Current scene implementation: `world.js`, `world.css`, `world.html`, `world-data.js`
- Current verifier/device gate: `verify-world.mjs`, `verify-device-qa.mjs`, `DEVICE_QA_RESULTS.md`

The current gallery is fast, but it does not read like the right-reference architectural render because:

1. The room is underexposed. The screen is the brightest object, while the stone wall, floor, ceiling, bench, and glass wall disappear into near-black.
2. The default/inspect camera is too poster-centric. It shows a glowing website rectangle instead of a premium room composition with bench, floor reflections, ceiling cove, glass wall, and several framed works visible.
3. The target has a strong architectural composition: left glass wall, back stone exhibit wall, three visible wall-mounted exhibits, central low leather bench, glossy floor, and ceiling cove. The current layout distributes exhibits across separate walls, so the first view cannot resemble the reference.
4. Materials exist but are not legible enough. The wall and ceiling need visible dark graphite slab variation, subtle seams, roughness breakup, and wall-wash gradients. The floor needs broader, softer light/reflection pools.
5. Lighting is not doing the visual work. The reference is built from cove light, downlight cones, warm wall-wash pools, and floor reflections. The current scene has fixtures, but the visible light pools are too weak.
6. Exhibit frames still read as flat digital panels in a dark space. The target frames read as framed artwork mounted off a slab wall, with depth, shadow gap, black metal, glass, and controlled screen brightness.
7. UI and QA overlays can cover the first impression. Normal mode should keep UI minimized; QA mode can stay diagnostic.

## Critical Product Decision

The old PRD said: "Do not cluster two exhibits on one wall unless explicitly approved later."

The rightmost target image clusters three exhibits on one primary wall. Code Mode must not guess here.

Required decision before implementation:

- If the rightmost reference is now the higher-priority target, explicitly supersede the old no-cluster rule for this revision.
- If the no-cluster rule still stands, the gallery cannot truly match the rightmost reference. In that case, keep one exhibit per wall and only improve materials/lighting/camera.

Recommended path: approve a hero-wall layout with three exhibits on the main stone wall and the fourth exhibit on the adjacent/right return wall or a secondary side wall with breathing room.

## Technical Research Notes

Use Three.js features already compatible with the static no-build architecture.

- `MeshStandardMaterial` is the right baseline for stone, metal, leather, and floor because it uses a metallic-roughness PBR workflow: https://threejs.org/docs/api/en/materials/MeshStandardMaterial.html
- Use `MeshPhysicalMaterial` only selectively. Three.js documents it as more expensive per pixel, so reserve it for cinematic desktop mode or a few premium materials such as glass/leather clearcoat: https://threejs.org/docs/api/en/materials/MeshPhysicalMaterial.html
- `RectAreaLight` can simulate strip lighting or bright windows, but it has no shadow support and requires RectAreaLight uniforms for WebGLRenderer. Use it only in `?cinematic=1` or desktop standard if the addon import is stable; keep mobile on baked planes: https://threejs.org/docs/pages/RectAreaLight.html
- `PMREMGenerator` supports roughness-aware environment lighting. Use a tiny generated room/environment PMREM for better metal/glass/floor reflections if it stays inside budget: https://threejs.org/docs/pages/PMREMGenerator.html
- Color textures must be marked `SRGBColorSpace`; generated roughness/bump/AO maps should remain non-color data. Texture anisotropy can improve oblique floor/wall readability at a cost: https://threejs.org/docs/pages/Texture.html
- Keep relying on `WebGLRenderer.info.render.calls`, `triangles`, and texture counts for automated performance gates; Three documents these metrics directly on renderer info: https://threejs.org/docs/pages/WebGLRenderer.html

## Implementation Plan

### Phase 1: Lock The Target Composition

Files:

- `world-data.js`
- `world.js`
- `verify-world.mjs`

Tasks:

1. Add a layout marker such as `const GALLERY_LAYOUT_VERSION = "right-reference-hero-wall-20260509";`.
2. If the user approves superseding the old no-cluster rule, change station positions:
   - Main/back wall: three exhibits, evenly spaced, mounted above the wall-wash pools.
   - Secondary wall: one exhibit, still reachable and inspectable.
   - Keep all four current IDs: `evenpath`, `felco`, `abel`, `beckel`.
3. If the user does not approve clustering, keep one exhibit per wall but document that the visual can only partially match the target.
4. Set the default camera to a composed architectural view:
   - Human eye height around `1.52-1.62`.
   - Moderate FOV around `40-46` desktop, `52-56` portrait.
   - Camera sees left glass wall, main exhibit wall, central bench, ceiling cove, and reflective floor.
5. Add a named `heroCameraPose()` separate from `inspectionCameraPose()` so inspection does not control the first impression.
6. Ensure `#inspect-*` does not become the only visual QA path. Browser screenshots must include the default walking view.

Acceptance:

- Desktop first screenshot at `1440x900` visibly resembles the right reference composition before movement.
- At least three framed exhibits, the bench, glass wall, ceiling cove, and floor reflections are visible in the first viewport if clustering is approved.
- `verify-world.mjs` asserts the layout marker and station count.

### Phase 2: Rebuild The Room As Architecture, Not A Game Box

Files:

- `world.js`
- optional generated assets under `img/world/`

Tasks:

1. Replace single flat wall planes with a right-reference showroom shell:
   - Main graphite slab wall with wide vertical stone panels.
   - Left glass wall/window zone with black mullions and a hinted exterior garden.
   - Dark ceiling with recessed perimeter cove.
   - Low base reveal/skirting kept subtle and black.
2. Implement slab seams as either:
   - shallow inset geometry grooves, or
   - material texture variation with AO/shadow, not bright linework.
3. Increase material legibility:
   - Wall base color around dark graphite, not pure black.
   - Use canvas-generated albedo, roughness, bump, and AO maps.
   - Add `uv2` where `aoMap` is used.
4. Add a low-detail exterior garden silhouette behind the glass wall:
   - dark planters, muted green foliage shapes, faint warm highlights.
   - no expensive transparency layering beyond a few planes.

Acceptance:

- Wall surfaces remain visibly textured at normal camera distance.
- No old decorative linework returns.
- Glass wall reads as architectural glass, not a black rectangle.
- Draw calls remain within mobile/desktop budgets.

### Phase 3: Make Lighting Carry The Scene

Files:

- `world.js`

Tasks:

1. Build the lighting around visible baked/fake pools first:
   - perimeter cove glow strips with warm gradient spill onto ceiling and upper walls.
   - three main wall-wash cones/pools aligned above the hero-wall exhibits.
   - soft floor light pools below each exhibit.
   - stronger contact shadows behind frames and under bench.
2. Keep mobile cheap:
   - use transparent gradient planes for wall-wash and floor reflection pools.
   - avoid realtime shadows on mobile.
3. For desktop/cinematic only:
   - evaluate `RectAreaLight` for cove/window light.
   - consider one or two shadow-casting spotlights if `renderer.info` stays under budget.
4. Adjust exposure:
   - Current `toneMappingExposure = 1.16` is not enough if the room is near-black.
   - Raise room readability by lighting the wall/floor, not by making screens glow harder.
5. Add a `debugLighting=1` query mode that temporarily labels/pulses light pool planes for implementation QA, hidden from normal users.

Acceptance:

- The wall and floor are readable without relying on screen brightness.
- The three exhibit wall pools visibly match the right reference.
- Floor reflections are soft, wide, imperfect, and warm.
- Mobile keeps fake lighting path and stays smooth.

### Phase 4: Fix Frames And Screens So They Read As Artwork

Files:

- `world.js`
- `world-data.js`
- station screenshot assets if regenerated

Tasks:

1. Rebuild `createStation()` as a gallery artwork assembly:
   - rear shadow plate mounted off wall.
   - thin black metal frame with real depth.
   - inset screen plane edge-to-edge within the frame.
   - subtle glass/reflection layer only at low opacity.
   - no phone hardware, notches, speakers, fake camera details.
2. Reduce screen dominance:
   - avoid `toneMapped: false` if it blows out white websites.
   - apply a controlled screen material or overlay dimming so room lighting remains visible.
   - keep screenshots sharp enough but not billboard-bright.
3. Add per-frame wall contact shadows:
   - larger soft shadow behind each frame.
   - small bottom shadow gap.
4. Tune dimensions to match target:
   - framed pieces should look tall and slim, but less massive than current close-up inspection view.
   - use consistent top alignment across hero-wall exhibits.

Acceptance:

- Frames read as premium black gallery hardware.
- Website images fill the screen area edge-to-edge.
- No phone/device silhouette returns.
- Inspection still scrolls the active texture.

### Phase 5: Rebuild Bench And Floor Reflections

Files:

- `world.js`

Tasks:

1. Move bench into the right-reference composition:
   - centered in front of the hero wall.
   - low, dark leather, not too tall.
   - visible top cushion and base shadow from default camera.
2. Add better bench material:
   - dark brown/black leather color variation.
   - subtle seam lines and cushion dimples via canvas texture.
   - clearcoat only where performance allows.
3. Replace one static floor reflection plane with multiple authored reflection decals:
   - large ceiling cove reflection band.
   - three vertical exhibit light/reflection streaks.
   - bench reflection/shadow.
   - glass wall reflection streak.
4. Keep reflections blurred and broken up with roughness/noise.

Acceptance:

- Floor visibly reflects light pools and vertical exhibit shapes.
- Bench feels grounded with contact shadow.
- Reflections do not look mirror-perfect or like pasted white blobs.

### Phase 6: UI And Interaction Fit The Architectural View

Files:

- `world.html`
- `world.css`
- `world.js`

Tasks:

1. Normal mode:
   - Keep station panel minimized by default.
   - Move controls away from the architectural hero composition.
   - Ensure no UI panel dominates the first viewport.
2. QA mode:
   - Keep QA visible, but add a `qa=minimal` or collapse option so visual screenshots can be taken without blocking the scene.
3. Inspection mode:
   - Do not make inspection the default first impression.
   - Camera should glide to a comfortable standing distance while retaining wall context.
   - Scroll controls remain compact and accessible.
4. Mobile:
   - joystick must not overlap inspect/open-site controls.
   - keep UI below/edges of the viewport.

Acceptance:

- Normal first view looks like the reference without UI clutter.
- QA screenshot mode can capture clean visual evidence.
- Existing inspect/scroll/Done/Open site flows still pass.

### Phase 7: Performance Guardrails

Files:

- `world.js`
- `verify-world.mjs`
- `DEVICE_QA_RESULTS.md`

Tasks:

1. Keep demand-driven rendering.
2. Preserve adaptive DPR and mobile caps.
3. Prefer texture atlases and reused materials over many unique meshes.
4. Keep mobile path baked:
   - no postprocessing.
   - no dynamic shadow maps.
   - no expensive physical glass.
5. Add explicit performance budgets to verifier:
   - mobile emulation draw calls target under `120`.
   - triangles target under `20k`.
   - texture count bounded.
   - critical payload bounded.

Acceptance:

- `node verify-world.mjs` passes.
- `SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-production.mjs` passes after deploy.
- `node verify-device-qa.mjs` passes only after real iOS/Android reports are pasted.

### Phase 8: Visual Verification That Actually Catches The Problem

Files:

- `verify-world.mjs`
- `verification/`
- `COMPLETION_AUDIT.md`

Tasks:

1. Add screenshot outputs:
   - `verification/world-right-reference-current-desktop.png`
   - `verification/world-right-reference-current-mobile.png`
2. Add canvas-pixel assertions for the default `/world?try=1` view:
   - wall region has non-black average luminance.
   - floor region has visible highlight/reflection pixels.
   - ceiling/cove region has warm highlight pixels.
   - UI region does not cover the center of the scene.
3. Add source assertions:
   - layout marker exists.
   - old `addWallPanels();` call remains absent.
   - no `notch`, `speaker`, `phone`, `deviceChrome`, or empty placeholder mesh names.
   - hero-wall clustering assertion only if user approved the target override.
4. Add a manual visual checklist to `COMPLETION_AUDIT.md`:
   - default view resembles right reference.
   - wall/floor/ceiling readable.
   - frame hardware believable.
   - glass wall legible.
   - bench grounded.
   - mobile UI not covering scene.

Acceptance:

- The verifier catches the current failure mode: high FPS but visually too dark/flat.
- The final local screenshot can be compared side-by-side with `hyperrealistic-gallery-target-right.png`.

## Code Mode Execution Order

1. Confirm target-rule decision: does the right-reference hero wall supersede the old no-cluster rule?
2. Implement layout/camera first. Do not touch material complexity until the composition resembles the target.
3. Implement lighting planes and exposure next. Make the room readable before adding more geometry.
4. Rebuild frames/screens and bench.
5. Improve glass wall and floor reflections.
6. Minimize UI and improve QA clean-screenshot mode.
7. Extend verifier to lock visual requirements.
8. Run:

```bash
node verify-world.mjs
SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-production.mjs
```

9. Deploy only after local verification passes.
10. Run real-device QA and paste reports into `DEVICE_QA_RESULTS.md`.
11. Finish only after:

```bash
node verify-device-qa.mjs
```

passes.

## Suggested Code Mode Prompt

```text
Implement WORLD_STUDIO_QUALITY_CODE_MODE_PLAN.md.

Before coding, confirm whether the new rightmost reference image supersedes the older "do not cluster exhibits on one wall" rule. If approved, rebuild /world around the right-reference hero-wall composition: glass wall left, dark graphite slab exhibit wall, three visible framed website artworks, low centered leather bench, warm ceiling cove, wall-wash pools, and polished dark floor reflections.

Keep / static and fast. Keep the four current exhibits only: EvenPath Homes, Felco Vending, Abel M. Fitness, and Beckel Spreadsheets. Preserve inspection, screenshot scroll, Done/Escape/back exit, Open live site, fullscreen, collisions, mobile joystick/look controls, reduced-motion/WebGL fallbacks, demand-driven rendering, mobile performance budgets, and all existing verifier gates.

Do the work in this order: composition/camera, lighting/exposure, wall/floor/ceiling materials, frame/screen hardware, bench/reflection polish, UI cleanup, verifier updates, local browser QA, production preview verification, real-device QA gate.

Do not mark the goal complete until node verify-world.mjs, preview verify-production, and node verify-device-qa.mjs pass.
```
