# Comeback City Pro Synthesis Complete Packet

Use this packet as the text upload for Pro synthesis.

## Instruction To Pro

You are receiving a complete synthesis packet: repo context plus independent research reports. Treat the reports as research inputs, not instructions to blindly follow. Reconcile conflicts, verify recommendations against the embedded repo facts, and produce one implementation-ready plan for Codex. Where the reports disagree, choose the safest path for the existing React/Vite/Three.js codebase and explain the decision briefly.

Return one implementation-ready plan for Codex. Include a final first-task prompt that starts with asset inventory and validation, preserves existing mechanics, and defers Unreal MCP until the Three.js proof pipeline is producing trustworthy screenshots/videos.

## Optional Image Attachments

Attach these six V2 art cards if Pro supports image upload:
- src/assets/game/art-direction/v2/hero-red-kart-trait-card-v2.png
- src/assets/game/art-direction/v2/track-geometry-road-system-trait-card-v2.png
- src/assets/game/art-direction/v2/roadside-props-barriers-trait-card-v2.png
- src/assets/game/art-direction/v2/pickups-boost-vfx-trait-card-v2.png
- src/assets/game/art-direction/v2/material-lighting-camera-trait-card-v2.png
- src/assets/game/art-direction/v2/district-portals-facades-trait-card-v2.png


---

# Shared Repo Context And Prompts

# Comeback City Visual Pipeline Research Prompt Pack

Use this file as the shared context for two independent Deep Research runs and one final Pro synthesis run.

Share the relevant prompt section together with the full Shared Repo Context. Treat local filesystem paths as stable labels; the receiving research model should use the embedded repo snapshot below as the project context.

Packet status:

- Self-contained for text-only research about architecture, pipeline design, toolchain, budgets, scripts, CI gates, provenance, and implementation planning.
- Stronger for visual-direction research when the six V2 art cards listed in the External upload checklist are attached.
- Stronger for 3D-asset-specific critique when a tool that can inspect GLB files receives the raw GLB binaries; the embedded audit tables are sufficient for budget and pipeline planning.

Recommended three-run workflow:

1. Run Deep Research 1 with the full Shared Repo Context and the `Deep Research Prompt 1` section.
2. Run Deep Research 2 with the full Shared Repo Context and the `Deep Research Prompt 2` section.
3. Run the Pro synthesis with the full Shared Repo Context, both completed research reports, and the `Pro Synthesis Prompt` section.

Research source rules:

- Use current official or primary documentation for tool behavior, licensing, version support, and command syntax.
- Include source links for each material recommendation.
- Distinguish sourced facts, repo-context facts, and implementation judgment.
- Treat June 17, 2026 as the project-context date; verify time-sensitive tool, licensing, and Unreal MCP details against current sources at research time.

## Shared Repo Context

Project path:

`/Users/andrewferguson/Downloads/comeback-tracker`

Portable-use note:

The research model receiving this prompt will not have local filesystem access to this path. Use the path as a project label. Use the embedded repo snapshot, asset inventories, package data, architecture notes, and constraints below as the authoritative project context. Ask for a pasted file excerpt only when exact source text, image inspection, or binary asset inspection is required to make a decision.

Project goal:

Build an automated Three.js asset and track production pipeline for the Comeback City kart game. The gameplay mechanics are already strong; the main gap is producing runtime visuals, character/kart assets, props, and tracks that match the approved character sheets and V2 art direction.

Current stack:

- React 18.3.1
- Vite 8.0.16
- Three.js 0.184.0
- Pixi.js 8.19.0 exists in the repo, but the race direction has moved to Three.js.
- Playwright 1.59.1 is available for browser QA and screenshot/video capture.
- The app is a web/PWA project, not a native Unreal project.

Important package scripts:

- `npm run dev`
- `npm run build`
- `npm run test:kart-proof`
- `npm run test:kart-playable`
- `npm run test:kart-3d-spike`
- `npm run test:visual`
- `npm run test:webgl`
- `npm run test:bundle`
- `npm run test:race`
- `npm run test:race:browser`

Package scripts snapshot:

```json
{
  "dev": "vite",
  "build": "vite build",
  "build:andrew": "VITE_USER_PRESET=andrew vite build",
  "build:alexander": "VITE_USER_PRESET=alexander vite build",
  "preview": "vite preview",
  "test:bundle": "node scripts/bundle-asset-budget-report.mjs",
  "test:race": "node scripts/race-content-playtest.mjs",
  "test:race:browser": "node scripts/race-browser-playtest.mjs",
  "test:kart-proof": "node scripts/kart-proof-static-guard.mjs",
  "test:kart-playable": "node scripts/kart-playable-proof-test.mjs",
  "test:kart-3d-spike": "node scripts/kart-3d-spike-test.mjs",
  "test:webgl": "node scripts/webgl-context-smoke-test.mjs",
  "test:visual": "node scripts/visual-reference-checks.mjs"
}
```

Package dependency snapshot:

```json
{
  "dependencies": {
    "@zxing/browser": "^0.1.5",
    "lucide-react": "^0.400.0",
    "pixi.js": "^8.19.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.12.7",
    "three": "^0.184.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^6.0.2",
    "playwright": "^1.59.1",
    "pngjs": "^7.0.0",
    "tailwindcss": "^3.4.4",
    "vite": "^8.0.16",
    "vite-plugin-pwa": "^1.3.0",
    "workbox-window": "^7.4.1"
  }
}
```

Important source folders:

- `3d generations:character sheets/`
- `src/assets/game/models/`
- `src/assets/game/art-direction/v2/`
- `src/assets/game/generated-race-v2/`
- `src/game/race/`
- `src/game/race/tracks/`
- `src/game/race/render/`
- `scripts/`

Race source file inventory:

```text
src/game/race/airTricks.js
src/game/race/camera/chaseCamera.js
src/game/race/driftFeel.js
src/game/race/heldItems.js
src/game/race/physics/kartPhysics.js
src/game/race/physics/kartTuning.js
src/game/race/physics/surfacePhysics.js
src/game/race/playtest/raceAutoplay.js
src/game/race/playtest/racePlaytestControls.js
src/game/race/playtest/racePlaytestNoopRuntime.js
src/game/race/playtest/racePlaytestRuntime.js
src/game/race/playtest/racePlaytestState.js
src/game/race/playtest/raceVisualScenarios.js
src/game/race/raceAudio.js
src/game/race/raceBreakables.js
src/game/race/raceCameraRuntime.js
src/game/race/raceControls.js
src/game/race/raceControlsBase.js
src/game/race/raceCrossers.js
src/game/race/raceDropRuntime.js
src/game/race/raceFinishRuntime.js
src/game/race/raceFrameClock.js
src/game/race/raceFrameUpdates.js
src/game/race/raceHitRuntime.js
src/game/race/raceHud.jsx
src/game/race/raceMotionRuntime.js
src/game/race/racePlayerFrame.js
src/game/race/raceProgress.js
src/game/race/raceRivals.js
src/game/race/raceRuntimeActions.js
src/game/race/raceRuntimeBaseSetup.js
src/game/race/raceRuntimeSetup.js
src/game/race/raceSceneRuntime.js
src/game/race/raceState.js
src/game/race/raceTelemetry.js
src/game/race/raceTelemetryDiagnostics.js
src/game/race/raceTelemetryRuntime.js
src/game/race/raceUpdateRuntime.js
src/game/race/raceVehicleRuntime.js
src/game/race/render/createBillboardText.js
src/game/race/render/createKartModel.js
src/game/race/render/createRacePickups.js
src/game/race/render/createRaceScene.js
src/game/race/render/createRaceScenery.js
src/game/race/render/createRaceVehicles.js
src/game/race/render/createTrackMesh.js
src/game/race/render/raceSceneTheme.js
src/game/race/render/raceVfx.js
src/game/race/render/syncRaceMeshes.js
src/game/race/rivalRacers.js
src/game/race/shortcutTriggers.js
src/game/race/track/trackGeometry.js
src/game/race/tracks/buildCenterline.js
src/game/race/tracks/comebackCity.js
src/game/race/tracks/index.js
src/game/race/tracks/penguinVillage.js
```

Game asset inventory snapshot:

```text
src/assets/game/art-direction/COMEBACK_CITY_ART_BIBLE.md
src/assets/game/art-direction/avatars/crrt-penguin-sheet.png
src/assets/game/art-direction/comeback-city-world-trait-sheet-v1.png
src/assets/game/art-direction/hud-controls-trait-sheet-v1.png
src/assets/game/art-direction/pickups-vfx-trait-sheet-v1.png
src/assets/game/art-direction/player-kart-trait-sheet-v1.png
src/assets/game/art-direction/rival-kart-family-trait-sheet-v1.png
src/assets/game/art-direction/v2/PROMPTS.md
src/assets/game/art-direction/v2/black-gold-elite-rival-trait-card-v2.png
src/assets/game/art-direction/v2/blue-speed-rival-trait-card-v2.png
src/assets/game/art-direction/v2/district-portals-facades-trait-card-v2.png
src/assets/game/art-direction/v2/green-utility-rival-trait-card-v2.png
src/assets/game/art-direction/v2/hero-red-kart-trait-card-v2.png
src/assets/game/art-direction/v2/material-lighting-camera-trait-card-v2.png
src/assets/game/art-direction/v2/orange-muscle-rival-trait-card-v2.png
src/assets/game/art-direction/v2/pickups-boost-vfx-trait-card-v2.png
src/assets/game/art-direction/v2/purple-tech-rival-trait-card-v2.png
src/assets/game/art-direction/v2/roadside-props-barriers-trait-card-v2.png
src/assets/game/art-direction/v2/track-geometry-road-system-trait-card-v2.png
src/assets/game/art-direction/v2/white-red-support-rival-trait-card-v2.png
src/assets/game/asset-manifest.json
src/assets/game/generated-race-v2/pickups/pickups-vfx-alpha-sheet.png
src/assets/game/generated-race-v2/player/player-boost.png
src/assets/game/generated-race-v2/player/player-lean-left.png
src/assets/game/generated-race-v2/player/player-lean-right.png
src/assets/game/generated-race-v2/player/player-straight.png
src/assets/game/generated-race-v2/rivals/rival-blue-a.png
src/assets/game/generated-race-v2/rivals/rival-blue-b.png
src/assets/game/generated-race-v2/rivals/rival-orange-a.png
src/assets/game/generated-race-v2/rivals/rival-orange-b.png
src/assets/game/generated-race-v2/rivals/rival-purple-a.png
src/assets/game/generated-race-v2/rivals/rival-purple-b.png
src/assets/game/generated-race-v2/road/road-boost-lane.png
src/assets/game/generated-race-v2/road/road-curve-left.png
src/assets/game/generated-race-v2/road/road-curve-right.png
src/assets/game/generated-race-v2/road/road-straight.png
src/assets/game/generated-race-v2/sheets/pickups-vfx-source.png
src/assets/game/generated-race-v2/sheets/player-kart-states-source.png
src/assets/game/generated-race-v2/sheets/rival-kart-family-source.png
src/assets/game/generated-race-v2/sheets/road-modules-source.png
src/assets/game/generated-race-v2/sheets/road-perspective-modules-source.png
src/assets/game/generated/district-facade-clinic.png
src/assets/game/generated/district-facade-food.png
src/assets/game/generated/district-facade-garage.png
src/assets/game/generated/district-facade-gym.png
src/assets/game/generated/district-facade-lab.png
src/assets/game/models/avatars/crrt-bunny.glb
src/assets/game/models/avatars/layer23-penguin.glb
src/assets/game/models/avatars/mizzle.glb
src/assets/game/models/avatars/seth-penguin.glb
src/assets/game/models/avatars/tclow-penguin.glb
src/assets/game/models/toy-car-kit/colormap.png
src/assets/game/models/toy-car-kit/item-banana.glb
src/assets/game/models/toy-car-kit/item-box.glb
src/assets/game/models/toy-car-kit/item-cone.glb
src/assets/game/models/toy-car-kit/vehicle-drag-racer.glb
src/assets/game/models/toy-car-kit/vehicle-racer-low.glb
src/assets/game/models/toy-car-kit/vehicle-racer.glb
src/assets/game/models/toy-car-kit/vehicle-vintage-racer.glb
src/assets/game/models/tripo/hero-kart-tripo.glb
src/assets/game/models/tripo/ice-sled.glb
src/assets/game/proof/comeback-city-kart-proof-desktop-v1.png
src/assets/game/proof/comeback-city-kart-proof-mobile-v1.png
src/assets/game/select/char-crrt-bunny.png
src/assets/game/select/char-layer23.png
src/assets/game/select/char-mizzle.png
src/assets/game/select/char-seth-penguin.png
src/assets/game/select/char-tclow.png
src/assets/game/select/kart-hero.png
src/assets/game/select/kart-icesled.png
src/assets/game/select/kart-kenney.png
```

Important repo documents:

- `COMEBACK_CITY_V2_3D_KART_RUNTIME_PRD.md`
- `src/assets/game/art-direction/v2/PROMPTS.md`
- `src/assets/game/asset-manifest.json`

Current V2 PRD summary:

- Build a new low-poly Three.js 3D kart runtime.
- Use real track geometry with curves/elevation.
- Use a chase camera following the player kart.
- Render grounded player kart, rivals, boost pads, item boxes, finish gate, and props.
- Use the V2 trait-card visual language.
- Use real 3D scene construction for the gameplay world.
- Promote to `/#race` only after visual, motion, playability, and QA gates pass.

Approved V2 art direction summary:

- Source of truth lives in `src/assets/game/art-direction/v2/`.
- Trait cards are design-lock references, not direct runtime sprites.
- Shared visual target: premium original arcade kart racer, N64-era readability with modern polish, glossy toy-like materials, chunky silhouettes, saturated clean color.
- Key V2 cards:
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

Raw asset folder facts:

`3d generations:character sheets/` contains high-resolution PNG concept sheets plus seven Tripo-generated GLB source models:

- `crrt-bunny.glb`
- `seth-3dpengu.glb`
- `tclow-ordinalpenguin.glb`
- `layer233d.glb`
- `mizzlepixelated3d.glb`
- `red+go-kart+3d+model.glb`
- `ice+sled+3d+model.glb`

Raw PNG/source sheet inventory:

| Source image | Dimensions | Apparent role |
|---|---:|---|
| `bunnycart.png` | 1254x1254 | CRRT Bunny/kart concept source |
| `glidercart.png` | 1536x1024 | Ice sled/glider cart source |
| `gokartred.png` | 1535x1024 | Red kart source |
| `hero-red-kart-trait-card-v2.png` | 1536x1024 | Approved hero kart V2 reference |
| `icefishitem.png` | 1254x1254 | Item concept |
| `icy game UI items.png` | 1491x1055 | Icy UI/item concept sheet |
| `layer23pixelated.png` | 1254x1254 | Layer 23 character source |
| `mizzlesitting.png` | 1254x1254 | Mizzle seated character source |
| `penguincoolercart.png` | 1254x1254 | Penguin cooler cart concept |
| `penguinglider.png` | 1536x1024 | Penguin glider concept |
| `sethhpengu.png` | 1254x1254 | Seth Penguin source |
| `shoppingcartracer.png` | 1254x1254 | Shopping cart racer concept |
| `stylized 3d game crates.png` | 1448x1086 | Prop/crate concept sheet |
| `tclow.png` | 1024x1536 | T Clow character source |
| `tclowjpeg.png` | 192x192 | T Clow small source/reference |
| `vechile select list.png` | 1672x941 | Vehicle selection concept sheet |
| `winter asset material concept.png` | 1491x1055 | Winter material concept |
| `winter themed game props.png` | 1448x1086 | Winter prop concept sheet |
| `winter themed items icons grid.png` | 1491x1055 | Winter item/icon concept sheet |

Raw GLB audit facts:

| Source GLB | Approx file size | Vertices | Triangles | Materials | Textures | Animations |
|---|---:|---:|---:|---:|---:|---:|
| `crrt-bunny.glb` | 14.7 MB | 281,749 | 488,998 | 1 | 1 JPEG | 0 |
| `ice+sled+3d+model.glb` | 15.8 MB | 293,087 | 501,388 | 1 | 1 JPEG | 0 |
| `layer233d.glb` | 15.5 MB | 300,716 | 501,594 | 1 | 1 JPEG | 0 |
| `mizzlepixelated3d.glb` | 15.4 MB | 297,312 | 501,420 | 1 | 1 JPEG | 0 |
| `red+go-kart+3d+model.glb` | 15.7 MB | 293,520 | 502,030 | 1 | 1 JPEG | 0 |
| `seth-3dpengu.glb` | 15.0 MB | 282,819 | 501,358 | 1 | 1 JPEG | 0 |
| `tclow-ordinalpenguin.glb` | 14.9 MB | 279,408 | 501,650 | 1 | 1 JPEG | 0 |

Raw GLB interpretation:

- The Tripo GLBs are useful as source art.
- The raw exports are too heavy for direct web/mobile race usage.
- The production pipeline needs automated audit, optimization, validation, and promotion.

Existing optimized runtime GLB facts:

The repo already contains smaller optimized runtime assets:

| Runtime GLB | Approx file size | Vertices | Triangles | Materials | Textures | Animations |
|---|---:|---:|---:|---:|---:|---:|
| `src/assets/game/models/avatars/crrt-bunny.glb` | 0.55 MB | 14,202 | 14,932 | 1 | 1 | 0 |
| `src/assets/game/models/avatars/seth-penguin.glb` | 0.48 MB | 12,017 | 12,826 | 1 | 1 | 0 |
| `src/assets/game/models/avatars/tclow-penguin.glb` | 1.94 MB | 50,023 | 64,948 | 1 | 1 | 0 |
| `src/assets/game/models/avatars/layer23-penguin.glb` | 3.84 MB | 87,255 | 100,350 | 1 | 1 | 0 |
| `src/assets/game/models/avatars/mizzle.glb` | 3.38 MB | 76,582 | 88,030 | 1 | 1 | 0 |
| `src/assets/game/models/tripo/hero-kart-tripo.glb` | 1.00 MB | 23,125 | 23,172 | 1 | 1 | 0 |
| `src/assets/game/models/tripo/ice-sled.glb` | 3.12 MB | 69,268 | 81,820 | 1 | 1 | 0 |

Existing runtime architecture facts:

- `src/game/ComebackCityThreeKartRace.jsx` imports Three.js, GLTFLoader, optimized avatar GLBs, optimized Tripo kart GLBs, generated facade images, track definitions, race mechanics, render helpers, and race CSS.
- The runtime has selectable characters and karts:
  - CRRT Bunny with Hero Kart
  - T Clow with Ice Sled
  - Seth Penguin
  - Mizzle
  - Layer 23
- The race has existing mechanics for acceleration, braking, steering, drift, boost pads, item pickups, rivals, lap progress, finish trigger, restart, held items, air tricks, and race telemetry.
- `src/game/race/tracks/index.js` registers tracks as content:
  - `COMEBACK_CITY_TRACK`
  - `PENGUIN_VILLAGE_TRACK`
- `src/game/race/render/createRaceScene.js` creates the Three.js renderer, ACES filmic tonemapping, fog, lighting, camera, and world group.
- `src/game/race/render/createTrackMesh.js` creates track render materials, boost pad visuals, road geometry, curbs, barriers, lanes, and related track visual meshes.
- `src/assets/game/asset-manifest.json` records asset provenance, license, role, budget, and fallback behavior.

Route and runtime facts:

- Main promoted race route: `/#race`.
- Isolated Three.js spike route: `/#race-3d-spike`.
- Visual/reference routes include `/#visual-plaza`, `/#visual-districts`, `/#visual-kart`, `/#visual-hud`, `/#visual-kart-proof`, and `/#visual-kart-playable`.
- The Three.js race root uses `data-testid="comeback-city-3d-kart-race"` and `data-race-renderer="three-kart"`.
- The race canvas uses `data-race-renderer="three-kart"` and `data-visual-canvas="race"`.
- The production visual asset set is `comeback-city-v2-three-runtime`.
- Authored model loading currently keeps procedural fallbacks in place if optional GLBs fail to load.
- Tripo rigs are lab-verified to face `+X`; the runtime applies `yaw = -Math.PI / 2` to face the driving direction.
- The Kenney drag racer faces `-Z`; the runtime applies `yaw = Math.PI`.
- The player can force the Kenney fallback body with `?kenneyKart=1`.
- A Blender-baked spike shell can be A/B loaded with `?bakedSpike=1`.
- Baked building GLBs can replace procedural districts while procedural boxes remain fallback.

Renderer facts:

- `createRaceRenderer` uses `THREE.WebGLRenderer`.
- Renderer options: antialias enabled, depth enabled, `powerPreference: "high-performance"`, `preserveDrawingBuffer: false`.
- Output color space: `THREE.SRGBColorSpace`.
- Tonemapping: `THREE.ACESFilmicToneMapping`.
- Tonemapping exposure: `1.2`.
- Runtime render scale: desktop `0.58`, mobile `0.6`.
- Raw DPR is capped at `2`.
- Race camera far plane is `580`.
- Fog near/far is `210`/`580`.
- Current race scene uses hemisphere, sun, and rim lights.
- Shadows are disabled in the main race renderer for performance.

Telemetry facts:

`window.__comebackCityKartTelemetry` currently exposes:

```text
airborne, auroraActive, avalanchePending, marchActive, avalancheTarget,
blizzardsOnTrack, character, kart, track, laps, slapping, fishBonesOnTrack,
boostHits, countdown, drift, driftCharge, driftTier, finished, heldItem,
fpsEstimate, itemPickups, lap, miniTurbo, miniTurboTier, position, propCount,
raceTime, renderer, rivalCount, rivalPositions, route, routeProgress, speed,
spinOuts, steer, tricksLanded, visualAssetSet, wallContact
```

Track data facts:

- `src/game/race/tracks/index.js` exports `KART_TRACKS = [COMEBACK_CITY_TRACK, PENGUIN_VILLAGE_TRACK]`.
- Default track key: `comeback-city`.
- Track definitions are pure data so Node-based QA scripts can import them.
- `COMEBACK_CITY_TRACK` uses `COMEBACK_CITY_COURSE_V2`, 3 laps, start offset `0.03`, bridge elevation band `{ from: 0.4, peak: 21, to: 0.534 }`, two ramps, one risky shortcut, opening facades, roadside props, and QA budgets `{ finishSeconds: 45, speedFloor: 140 }`.
- `PENGUIN_VILLAGE_TRACK` is a grey-box/new-track pass with built centerline waypoints, road ribbons, boost pads, item boxes, bridge elevation band `{ from: 0.55, peak: 17, to: 0.67 }`, one ramp, surface bands for asphalt/ice/snow, breakable objects, crossers, arctic palette, and QA budgets `{ finishSeconds: 45, speedFloor: 130 }`.
- Existing track content fields include `key`, `name`, `tagline`, `course`, `laps`, `startOffset`, `elevation`, `ramps`, `shortcut`, `surfaceBands`, `breakableObjects`, `crossers`, `palette`, `dressing`, and `budgets`.
- Existing course content fields include centerline/minimap path, road ribbons, boost pads, item boxes, district anchors, and scenery anchors.

Existing QA gate facts:

- `scripts/kart-3d-spike-test.mjs` runs against a production `vite preview` server after `npm run build`.
- It captures `#race-3d-spike` desktop at `1365x768`, `#race-3d-spike` mobile at `390x844`, and promoted `#race` desktop at `1365x768`.
- It records a desktop 10-second WebM.
- It waits for `[data-testid="comeback-city-3d-kart-race"][data-race-renderer="three-kart"]`.
- It requires telemetry renderer `three-kart`.
- It requires countdown complete and `fpsEstimate >= 34`.
- It samples median FPS and fails below `34`.
- It requires one Three.js race canvas, zero Pixi race canvases, zero old arcade WebGL canvases, and `propCount >= 20`.
- It requires telemetry `visualAssetSet === "comeback-city-v2-three-runtime"`.
- It compares start/motion screenshots and requires visible image change.
- Existing `scripts/visual-reference-checks.mjs` captures visual panels and compares them against a reference image with mean-difference thresholds.
- Existing visual checks verify required selectors, forbidden fallback/reference elements, WebGL canvas presence, layout boxes, aspect ratios, and route-specific DOM markers.

Existing asset provenance notes:

- Some models are owner-generated with Tripo from owner-authored renders or approved V2 trait cards.
- Some toy car kit models come from Kenney Toy Car Kit under CC0.
- The manifest records source, license, runtime role, size budget, and fallback for game assets.

Strategic direction:

- Keep the current React/Vite/Three.js game runtime and existing mechanics.
- Build a repeatable asset pipeline around the existing runtime.
- Promote raw generated assets into optimized runtime GLBs through scripted audit, optimization, validation, and visual proof.
- Build visually stronger tracks through data-driven track definitions plus modular track kits and optional authored GLB segments.
- Use Unreal Engine 5.8 MCP as an optional look-development and track staging lab.
- Use Unreal outputs as references, GLB exports, textures, or staging proofs that feed back into the Three.js runtime.
- Defer Seedance/video-generation subscriptions until actual runtime screenshots and videos prove the playable game visuals.

Primary research target:

Find the best production workflow for turning the existing local source assets and V2 art direction into optimized, visually strong, testable Three.js race visuals and tracks.

External upload checklist:

- Upload this Markdown file or paste the relevant prompt plus the full Shared Repo Context.
- Upload V2 art cards when the research model can inspect images:
  - `hero-red-kart-trait-card-v2.png`
  - `track-geometry-road-system-trait-card-v2.png`
  - `roadside-props-barriers-trait-card-v2.png`
  - `pickups-boost-vfx-trait-card-v2.png`
  - `material-lighting-camera-trait-card-v2.png`
  - `district-portals-facades-trait-card-v2.png`
- Upload one or two current runtime screenshots if the research run supports image review.
- Use the embedded GLB audit tables for research. Upload raw GLB binaries only for a tool or model that can inspect 3D files directly.
- Use the final Pro synthesis run with both completed research reports pasted in full.

---

## Deep Research Prompt 1: Three.js Asset And Runtime Pipeline

```markdown
Goal: Produce a practical, implementation-ready Three.js asset pipeline for the Comeback City kart game.

Success means:
- The report defines a repeatable path from raw GLB/PNG source assets to optimized runtime assets.
- The report fits the shared repo context exactly.
- The report gives concrete GLB, texture, triangle, memory, and bundle budgets for a browser/mobile kart game.
- The report identifies exact tools, commands, scripts, package dependencies, and CI gates.
- The report explains how to preserve the existing React/Vite/Three.js race mechanics while improving the visuals.
- The report cites current official or primary documentation for Three.js, glTF, glTF-Transform, Blender if used, Playwright, and WebGL/mobile performance.
- The report labels assumptions and asks exact follow-up questions where the embedded context is insufficient.

Stop when a coding agent can implement the first version of the asset pipeline from the report alone.

Use the Shared Repo Context above as the fixed project context.

Research and return:

1. Executive Recommendation
Explain the best asset pipeline in plain engineering language.

2. Runtime Asset Pipeline
Design the flow:
raw source folder -> audit -> classify -> optimize -> validate -> preview -> capture proof -> promote -> update manifest.

3. GLB Optimization Strategy
Specify the exact use of glTF-Transform and related tools:
- inspect
- validate
- weld
- dedup
- prune
- texture resize
- simplification
- optional meshopt or Draco choices
- output format choices for Vite/Three.js
- fallback strategy for unsupported compression

4. Asset Budgets
Recommend budget targets for:
- hero kart
- rival kart
- seated character
- simple prop
- complex prop
- item box
- boost pad
- track module
- full visible race scene
- texture dimensions
- GLB file size
- GPU memory
- draw calls

5. Script Plan
Propose exact scripts and npm commands:
- `scripts/audit-game-assets.mjs`
- `scripts/optimize-game-glbs.mjs`
- `scripts/validate-game-assets.mjs`
- `scripts/render-asset-gallery.mjs`
- `scripts/capture-race-proof.mjs`
- `scripts/compare-race-visuals.mjs`
- `scripts/promote-approved-assets.mjs`

For each script, include:
- inputs
- outputs
- required packages
- command examples
- pass/fail criteria
- generated files

6. File Structure
Recommend exact folders for:
- raw assets
- working assets
- optimized runtime assets
- rejected assets
- generated thumbnails
- visual proof evidence
- manifests
- asset budgets

7. Runtime Integration
Explain how the optimized assets should integrate with:
- `src/game/ComebackCityThreeKartRace.jsx`
- `src/game/race/render/*`
- `src/game/race/tracks/*`
- `src/assets/game/asset-manifest.json`

8. Visual Proof
Define an automated screenshot/video proof workflow using Playwright:
- desktop screenshot
- mobile screenshot
- 10-second desktop video
- 10-second mobile video
- asset gallery screenshot
- contact sheet against V2 references
- WebGL nonblank canvas checks
- fallback detection checks

9. CI Gates
Define gates that work with existing scripts:
- `npm run build`
- `npm run test:kart-proof`
- `npm run test:kart-playable`
- `npm run test:kart-3d-spike`
- `npm run test:visual`
- `npm run test:webgl`
- `npm run test:bundle`

10. Implementation Phases
Break implementation into small phases a coding agent can execute.

11. Risks And Decisions
List open questions and exact decisions needed from the owner.

12. Sources
Link every official or primary source used.
```

---

## Deep Research Prompt 2: Track Production, Visual Direction, And Unreal MCP Look-Dev

```markdown
Goal: Produce a practical track and look-development workflow for making Comeback City race visuals match the approved V2 art direction while keeping the game in Three.js.

Success means:
- The report defines how to build visually strong tracks for the existing data-driven Three.js race runtime.
- The report compares procedural Three.js tracks, modular track kits, Blender-authored GLB segments, and Unreal MCP look-development.
- The report explains where Unreal Engine 5.8 MCP adds value as an optional lab.
- The report explains how outputs from Unreal or Blender can feed back into the Three.js runtime.
- The report defines acceptance criteria for track visuals, camera, lighting, props, grounding, density, and performance.
- The report cites current official or primary documentation for Unreal MCP, Unreal Engine 5.8, Blender/glTF export, Three.js, and relevant licensing.
- The report labels assumptions and asks exact follow-up questions where the embedded context is insufficient.

Stop when a coding agent can implement a first track-kit and visual proof workflow from the report alone.

Use the Shared Repo Context above as the fixed project context.

Research and return:

1. Executive Recommendation
Recommend the best track production workflow for this repo.

2. Track Authoring Strategy
Compare these options:
- pure JS/JSON track definitions
- procedural Three.js mesh generation
- modular track kit pieces
- Blender-authored GLB track segments
- Unreal-authored look-dev scenes exported back to Three.js

3. Recommended Hybrid Workflow
Design the best hybrid workflow for this game:
- keep mechanics data-driven
- use authored visual modules where they improve quality
- keep track collision/progress deterministic
- use art cards as the visual source of truth
- use visual proof before route promotion

4. Track Data Model
Recommend fields for track definitions:
- centerline
- width bands
- elevation
- banking
- boost pads
- item boxes
- finish gate
- hazards
- props
- district portals
- scenery zones
- camera hints
- mobile crop hints

5. Modular Track Kit
Define the runtime-ready track kit:
- straight
- left curve
- right curve
- S-curve
- ramp up
- ramp down
- tunnel approach
- bridge/overpass
- curb sections
- barriers
- rails
- lane markings
- boost pad
- item box
- finish/checkpoint gate
- district facade/portal props

6. Visual Style Translation
Explain how to translate the V2 cards into runtime choices:
- glossy toy-like materials
- chunky silhouettes
- readable N64-era shapes with modern polish
- saturated clean color
- neon accents
- asphalt, curb, rubber, portal glow, fire, foliage, barriers
- chase camera and mobile framing

7. Unreal MCP Optional Lab
Research Unreal Engine 5.8 MCP and explain:
- setup requirements
- what MCP exposes to an AI coding agent
- how it can stage lighting, materials, layout, and track-kit previews
- how it can create reference scenes
- how GLB/texture outputs can come back to Three.js
- how to keep Unreal as optional look-dev instead of the production runtime
- what evidence should prove Unreal adds value before expanding usage

8. Blender Optional Workflow
Explain when Blender CLI should be used:
- cleanup
- origin correction
- scale normalization
- decimation
- UV/material fixes
- GLB export
- track segment baking

9. Visual QA Gates
Define track-specific visual gates:
- real 3D geometry
- grounded karts
- readable road edge
- visible elevation or curve
- prop density target
- district identity
- no placeholder/fallback visuals
- no blank WebGL canvas
- stable desktop/mobile framing
- FPS target

10. Evidence Plan
Define the proof artifacts:
- desktop screenshot
- mobile screenshot
- 10-second desktop video
- 10-second mobile video
- top-down track layout
- contact sheet against V2 cards
- asset gallery
- track module gallery

11. Licensing And Provenance
Explain how to record:
- owner-generated Tripo assets
- Kenney CC0 assets
- paid Fab/Marketplace assets if used
- Unreal-rendered reference output
- Unreal-generated/exported runtime assets
- third-party textures/HDRIs/plugins

12. Implementation Roadmap
Break the work into phases:
- track-kit schema
- first modular visual kit
- first authored visual segment
- first proof route
- first screenshot/video gate
- optional Unreal MCP lab
- final route promotion

13. Sources
Link every official or primary source used.
```

---

## Pro Synthesis Prompt: Combine Two Research Reports Into The Final Build Plan

```markdown
Goal: Synthesize two Deep Research reports into one final implementation plan for the Comeback City automated Three.js asset and track pipeline.

Success means:
- The final plan chooses one clear workflow.
- The final plan preserves the existing React/Vite/Three.js game mechanics.
- The final plan turns raw generated assets into optimized runtime assets through repeatable scripts.
- The final plan creates visually strong data-driven tracks with modular assets and proof gates.
- The final plan places Unreal MCP in the correct optional role.
- The final plan gives a coding agent exact files, scripts, phases, commands, and acceptance criteria.
- The final plan resolves conflicts between the two reports with explicit reasoning.
- The final plan lists the smallest set of owner decisions required before implementation.

Stop when the output is ready to paste into Codex as an implementation brief.

Inputs:

1. Shared Repo Context from the prompt pack.
2. Deep Research Report 1: Three.js Asset And Runtime Pipeline.
3. Deep Research Report 2: Track Production, Visual Direction, And Unreal MCP Look-Dev.

Read both reports and produce:

1. Final Recommendation
State the chosen workflow in one page or less.

2. Implementation Brief For Codex
Write a direct build brief that a coding agent can execute in the repo.

3. Final File Structure
List the exact folders and files to create or modify.

4. NPM Scripts
List the exact `package.json` scripts to add.

5. Automation Scripts
For each script, define:
- path
- purpose
- inputs
- outputs
- packages used
- pass/fail behavior
- first implementation scope

6. Asset Budgets
Return final budget numbers for:
- source GLB acceptance
- optimized GLB acceptance
- kart
- character
- prop
- track module
- full scene
- texture dimensions
- bundle size
- FPS

7. Track Workflow
Return the final track production workflow:
- track definition schema
- visual module kit
- authored asset integration
- runtime placement
- camera/framing proof
- mobile proof

8. Visual QA Gates
Return final gates that can be automated:
- asset audit gate
- optimization gate
- manifest gate
- route render gate
- screenshot gate
- video gate
- visual comparison gate
- FPS/bundle gate

9. Unreal MCP Role
Define exactly when to use Unreal MCP and what output counts as useful:
- reference screenshots
- lighting/material staging
- modular track layout
- exported GLB/texture assets
- evidence that improves the Three.js runtime

10. Seedance Decision
State when video generation becomes useful and what proof should come first.

11. Owner Decisions
List only the questions the owner must answer before implementation.

12. Phase Plan
Return a phase-by-phase build plan:
- Phase 1: inventory and manifest
- Phase 2: GLB optimization scripts
- Phase 3: asset preview gallery
- Phase 4: track-kit schema
- Phase 5: first visual proof route
- Phase 6: automated screenshot/video evidence
- Phase 7: route promotion
- Phase 8: optional Unreal MCP lab

13. First Codex Task
Write the exact first prompt to give Codex to start implementation.
```


---

# Gemini Report

# Comeback City V2: Automated Three.js Asset Pipeline and Track Production Implementation Synthesis

_Source: Gemini report pasted by owner. Raw one-line attachment preserved at `docs/research/gemini-visual-pipeline-report.raw.txt`._

## Final Recommendation

The architectural directive for Comeback City V2 mandates the retention of the existing React, Vite, and Three.js application stack. The fundamental gameplay mechanics, telemetry, and racing logic are already robust, operating successfully within the web-based, Progressive Web Application (PWA) environment. The primary friction point lies not in the runtime engine, but in the asset ingestion and visual rendering pipeline. The project currently relies on generative, high-polygon 3D models (such as those output by Tripo) and placeholder track generation systems that fail to meet the stringent performance budgets required for stable 60 frames-per-second (FPS) execution on mobile browsers.

The optimal workflow requires constructing a deterministic, offline Node.js pipeline utilizing the @gltf-transform/core and @gltf-transform/functions packages to programmatically audit, simplify, and compress raw generative assets into production-ready WebGL binaries. This approach entirely bypasses the need for manual intervention in graphical Digital Content Creation (DCC) software like Blender for standard asset optimization. For track production, the system must abandon procedural mesh generation in favor of a hybrid data-driven model. The track logic will remain as pure JavaScript schema definitions dictating splines and elevation curves, while the visual representation will rely on instantiating modular, pre-authored glTF track kit segments along those programmatic paths.

To enforce rigorous quality standards without human oversight, a Continuous Integration (CI) gate utilizing Playwright is essential. This automated testing suite must be uniquely configured with specific Chromium channel distributions and graphical hardware acceleration flags to successfully capture, record, and validate the headless WebGL rendering canvas. Finally, the introduction of Unreal Engine 5.8 and its Model Context Protocol (MCP) server provides a profound advancement in Look-Development (LookDev). However, the engine will function strictly as an optional, offline laboratory. The MCP plugin will enable AI agents to orchestrate Unreal's advanced lighting and material systems to produce high-fidelity reference imagery and baked asset exports, which are then integrated back into the localized Three.js web ecosystem. This synthesized approach establishes a resilient, scalable, and highly automated production capability.

## Implementation Brief For Codex

The implementation effort requires the construction of an end-to-end asset ingestion, optimization, and verification pipeline that operates transparently within the existing Vite and Node.js environment. The core task involves creating a suite of isolated Node.js modules within the scripts/ directory that programmatically manipulate .glb files. The coding agent must utilize the glTF Transform SDK, a toolchain specifically engineered for the fast, reproducible, and lossless control of low-level 3D model details, automatically managing complex array indices and byte offsets that would otherwise require manual calculation.

The raw generative source assets, particularly those derived from Tripo, are universally too heavy for runtime deployment. They possess massive vertex counts (frequently exceeding 280,000 vertices) and rely on numerous unoptimized JPEG materials. The agent must implement an optimization sequence that repairs fragmented topologies by welding coincident vertices, a necessary prerequisite because algorithms like the MeshoptSimplifier are topology-aware and cannot simplify geometry across split edges with hard normals. Following topological repair, the agent must programmatically prune unreferenced data, consolidate duplicate accessors, and dramatically compress texture payloads by resizing them to bounded dimensions and encoding them into the WebP format utilizing the sharp library. The geometric streams must then be compressed utilizing the EXT_meshopt_compression extension to ensure minimal payload sizes and rapid CPU-side decoding within the Three.js runtime.Simultaneously, the coding agent must expand the track rendering architecture located within src/game/race/render/createTrackMesh.js. The agent is directed to parse the mathematical representations of the racing circuits located in src/game/race/tracks/ and implement instantiation logic that populates these splines with modular track kit pieces (e.g., straight roads, curves, barriers) rather than procedurally generating raw WebGL buffers. The integration must conclude with the establishment of automated visual proofing utilizing Playwright, specifically ensuring that the testing environment forces hardware acceleration and preserves the WebGL drawing buffer to capture accurate telemetry and visual evidence without encountering the blank canvas errors common in headless graphics testing.

## Final File Structure

A rigorous filesystem taxonomy is mandatory to support automated programmatic routing, ensuring that raw assets are never inadvertently bundled by the Vite compiler, and that visual validation evidence is securely archived. The following directory structures and files must be instituted or modified.Directory / File PathPurpose and Contentssrc/assets/game/models/raw/The ingestion directory for heavy Tripo .glb exports, high-resolution source .png files, and raw Blender DCC outputs. These files exist exclusively for offline processing.src/assets/game/models/optimized/The strict destination folder for binaries output by the gltf-transform scripts. The React/Three.js runtime exclusively imports .glb files from this location.src/assets/game/models/track-kit/Contains the authored modular visual elements (e.g., road-straight.glb, ramp-up.glb, barrier-neon.glb) required by the track generation logic.src/assets/game/manifests/asset-manifest.jsonThe existing file, updated to track provenance, licensing (e.g., Kenney CC0 versus Tripo), and the designated fallback behaviors for each optimized asset.src/assets/game/manifests/asset-budgets.jsonA newly generated programmatic ledger storing the precise byte sizes, triangle counts, and texture dimensions of every file in the raw/ and optimized/ directories.src/assets/game/proofs/The destination for automated Playwright artifacts, including desktop/mobile .png captures, 10-second telemetry .webm videos, and regression diffs.scripts/pipeline/The directory housing the discrete Node.js operational scripts for auditing, optimizing, capturing, and comparing visual outputs.src/game/race/tracks/schema/Houses the pure JavaScript/JSON data models dictating the track centerline paths, elevation nodes, and logic coordinates for interactive elements.playwright.config.jsThe test runner configuration, heavily modified to enforce specific Chromium channels, graphical pipeline flags, and automated trace viewer recording metrics.

## NPM Scripts

The Node package configuration must expose deterministic command interfaces for executing the disparate phases of the asset pipeline, CI validation, and experimental look-development synchronization. The entries below must be appended to the package.json file.

Script NameExecution CommandOperational Intentpipeline:auditnode scripts/pipeline/audit-game-assets.mjsTraverses the raw/ directory to measure geometries and payload sizes, emitting a structural ledger to the asset-budgets.json file.pipeline:optimizenode scripts/pipeline/optimize-game-glbs.mjsExecutes the sequential glTF Transform operations, converting raw inputs into highly compressed, runtime-ready WebGL binaries.pipeline:gallerynode scripts/pipeline/render-asset-gallery.mjsGenerates HTML/React staging routes necessary for isolating individual assets for lighting evaluation and Playwright visual capture.test:visual:capturenode scripts/pipeline/capture-race-proof.mjsInvokes Playwright in a forced-hardware headless mode to extract screenshots and .webm screencasts of the active Three.js canvas.test:visual:diffnode scripts/pipeline/compare-race-visuals.mjsPerforms pixel-level differential analysis, comparing the captured runtime artifacts against the approved V2 art direction references.test:promotenode scripts/pipeline/promote-approved-assets.mjsFinalizes the asset promotion logic, updating asset-manifest.json statuses based on the successful passage of all prior visual and budget gates.lab:mcp:syncnode scripts/pipeline/unreal-mcp-sync.mjsEstablishes the HTTP JSON-RPC connection to the local Unreal 5.8 instance, triggering programmatic lighting rigs and asset baking tools.

## Automation Scripts

The procedural automation pipeline is highly reliant on discrete Node.js execution contexts. Each script serves a targeted function, utilizing specific external libraries and emitting deterministic pass/fail signals essential for CI integration.

### audit-game-assets.mjs

This module functions as the initial gatekeeper. Its purpose is to programmatically inspect all models located within the raw/ directory and log their architectural footprint. The script utilizes @gltf-transform/core and specific bounding helpers to map the internal data model. It receives no external parameters, statically mapping the designated input directory, and outputs a structured JSON report detailing the vertex count, triangle count, node depth, material count, and maximum texture resolution of each file. If a raw file surpasses the 500,000 triangle threshold or exceeds 20 MB, the script emits a terminal warning but conditionally passes; the file is permitted to enter the optimization queue, as raw generative outputs consistently breach these dimensions prior to decimation.

### optimize-game-glbs.mjs

Serving as the primary engine for geometric translation, this script processes the audited files and generates the runtime binaries. It imports the @gltf-transform/functions package and applies a rigorous chain of automated modifications. The execution strictly follows this sequence: weld() to merge coincident vertices and repair broken topology; dedup() to eliminate overlapping accessors; and prune() to discard orphaned nodes or unreferenced materials. For texture optimization, the script invokes the textureCompress() API utilizing the sharp encoder to resize all image assets to a maximum dimension of 1024x1024 pixels via a Lanczos3 interpolation filter, subsequently encoding them into the WebP format for superior network payload reduction. To address the geometric density, it executes the simplify() command backed by the MeshoptSimplifier, aiming for an aggressive reduction ratio. Finally, the resulting streams are compressed using meshopt() to reduce file size further while maintaining rapid CPU decoding. The script fails and aborts the pipeline if the resulting output file size exceeds the strict limits established in the runtime budgets.

### validate-game-assets.mjs

This script ensures the outputs from the optimization phase conform to structural specifications before they are exposed to the React/Vite development server. It utilizes the gltf-transform validate methodology to parse the newly generated files against the official glTF schema. The script requires the output path as an input and ensures that the EXT_meshopt_compression and EXT_texture_webp extensions are properly declared as required within the binary manifest. It fails the build if validation errors are detected or if the total draw call count (inferred from the number of discrete material/mesh pairings) exceeds the engine's budget allocation.

### render-asset-gallery.mjs

To facilitate isolated testing and lighting evaluation, this script programmatically edits the Vite application routing definitions to surface hidden /visual-kart and /visual-props endpoints. The script accepts the updated asset-manifest.json as input and dynamically generates a React testing harness that loads every optimized asset into a neutral Three.js scene utilizing THREE.ACESFilmicToneMapping and an exposure level of 1.2. The output is a functional web route designed explicitly for consumption by the Playwright capture utility. The script passes upon successful generation of the localized testing routes.

### capture-race-proof.mjs

This script captures incontrovertible visual evidence of the rendering pipeline. Testing WebGL performance in headless browsers is notoriously fragile, often resulting in pure black artifacts because the browser clears the drawing buffer immediately after presentation to conserve memory. The script utilizes the playwright package, specifically launching the full channel: 'chromium' binary rather than the default, lightweight headless shell, ensuring the rendering behavior perfectly mirrors a headed browser context. The launchOptions must inject the --use-angle=gl and --no-sandbox hardware acceleration arguments to engage the host GPU. During the page context initialization, the script intercepts the Three.js renderer construction and injects preserveDrawingBuffer: true, allowing Playwright's API to capture non-blank frame data. The script utilizes the Page.

Screencast API to record a 10-second .webm visual loop and captures static .png images of both desktop and mobile viewports. It fails if the telemetry object (window.__comebackCityKartTelemetry.fpsEstimate) drops below the 34 FPS threshold.

### compare-race-visuals.mjs

This utility executes pixel-level differential analysis. Utilizing packages like pixelmatch or pngjs, it compares the screenshots generated by the Playwright capture sequence against the approved V2 trait cards and historical baseline renders. It calculates the mean pixel difference and flags significant deviations in lighting, framing, or material rendering. The script outputs a differential image highlighting the mismatched regions. It passes if the deviation remains below a predefined tolerance threshold, acknowledging that slight anti-aliasing variations will exist across different GPU architectures.

### promote-approved-assets.mjs

The final operation in the continuous integration pipeline, this script acts upon the success signals of all prior operations. It updates the central asset-manifest.json file, transitioning the status of the newly optimized models from staged to promoted, and updates the bundle budget statistics. It guarantees that the main /#race route will automatically retrieve the correct, verified assets during the next production build.

## Asset Budgets

The execution of real-time 3D environments within mobile web browsers dictates unforgiving constraints regarding memory allocation, geometric complexity, and GPU draw calls. The Three.js WebGLRenderer is exceptionally sensitive to the number of discrete draw calls dispatched per frame; therefore, merging meshes and sharing materials via the join() and palette() operations within the glTF Transform pipeline is a foundational requirement. Furthermore, while compressed texture formats reduce the initial download time, the texture data must be fully decompressed into Video RAM (VRAM) upon execution. Large dimensions dramatically inflate memory consumption, necessitating strict boundary limits. The operational parameters below delineate the acceptance criteria for both the raw source files and the finalized runtime artifacts.

Asset ClassMax Source File AcceptanceMax Optimized Runtime FileMax Optimized TrianglesMax Texture Res / CountMax Draw CallsHero Kart20.0 MB / 500k tris1.5 MB25,0001024x1024 / 2 maps2Rival Kart Family20.0 MB / 500k tris1.0 MB15,0001024x1024 / 1 atlas1Character (Seated)15.0 MB / 300k tris1.0 MB12,000512x512 / 1 atlas1Interactive Prop5.0 MB / 50k tris0.5 MB2,500512x512 / 1 atlas1Track Module (Kit)10.0 MB / 100k tris2.0 MB10,0001024x1024 / 2 maps1Full Race SceneN/A15.0 MB (Total payload)150,000N/A60The target bundle size for the entire initial visual payload, including the Three.js library overhead and the essential track definition modules, must remain below 15.0 MB. The strict 60 draw call limit for the entire visible scene necessitates the use of THREE.InstancedMesh for rendering recurring track modules, barriers, and environmental props. The minimum operational threshold for visual validation gates is a sustained 34 FPS, recognizing the inherent performance overhead introduced by headless testing environments.

## Track Workflow

The track architecture represents a deliberate synthesis of programmatic data management and visually authored graphical components. Historical approaches utilizing pure procedural Three.js mesh generation produced unstable geometry, poor UV mapping, and a visual aesthetic that starkly contradicted the "chunky silhouette" mandate dictated by the V2 art direction. Conversely, attempting to bake an entire race circuit into a single massive .glb file destroys modularity, inflates memory utilization, and prevents dynamic, data-driven interactions like rival AI spline tracking or programmatic boost pad placement.

The chosen workflow bifurcates the logical track definition from its visual representation. The track data model, encoded as pure JavaScript/JSON schemas within src/game/race/tracks/, dictates the mathematical reality of the course. The schema fields include the centerline (defined by Bezier curves or dense waypoint arrays), width bands, elevation curves, and banking angles. Additionally, it contains arrays of coordinate anchors identifying boost pads, item boxes, scenery zones, and camera hints for mobile crop framing. The underlying physics engine and the telemetry systems operate exclusively on this mathematical abstraction, remaining entirely agnostic to the graphical rendering pipeline.

To materialize the visual presentation, the implementation relies on a modular track kit. This kit consists of highly optimized, discrete 3D .glb models: straight road segments, left and right curves, S-curves, ramps, bridge overpasses, curb sections, and district facade portals. The createTrackMesh.js script iterates sequentially over the data schema and instantiates these kit modules, calculating the required tangent vectors and quaternion rotations to align the assets precisely to the underlying spline.

Translating the V2 art cards into runtime visual decisions requires precise material calibration. The shared visual target of "glossy toy-like materials" and "saturated clean color" necessitates utilizing THREE.MeshStandardMaterial with specific configurations: low roughness and high metallic properties for vehicular and metallic surfaces, illuminated by a carefully calibrated environment map to provide rich specular highlights. The V2 neon accents and portal glows demand the utilization of emissive maps and, optionally, a lightweight post-processing bloom pass, provided the GPU budget allows. Visual proofs must be generated using the chase camera perspective to ensure the track kit alignment maintains a seamless visual horizon on both desktop (16:9) and heavily cropped mobile (19.5:9) viewports.

## Visual QA Gates

The automated promotion of code revisions, newly ingested assets, or modified track layouts is exclusively contingent upon passing a rigorous suite of visual Quality Assurance (QA) gates executed by Playwright. Validating complex WebGL states in CI environments introduces severe technical challenges, primarily related to headless browser rendering pipelines and unpredictable GPU compositing behaviors. The required visual gates are structured to overcome these specific architectural hurdles.

The foundational check is the Asset Audit and Optimization Gate. Before integration, the scripts must verify that the geometric payloads conform to the established 25,000 triangle limit for primary vehicles and the 1.5 MB file size threshold. The output manifests must record the successful application of WebP and meshopt compression layers.

The second check is the Route Render and Non-Blank Canvas Gate. When executing the test suites, the headless browser intrinsically clears the rendering buffer post-composition, frequently leading to readPixels or native screenshot APIs capturing pure black imagery. To circumvent this, the test suite must programmatically inject preserveDrawingBuffer: true into the THREE.WebGLRenderer initialization exclusively during test execution, ensuring the pixel data persists in memory for capture. The Playwright configuration must also assert the DOM presence of the <canvas data-testid="comeback-city-3d-kart-race"> element and confirm that the internal telemetry engine is actively broadcasting physical state updates.

The third gate is the Performance and Stability Gate. Playwright must launch utilizing the full channel: 'chromium' binary rather than the default chrome-headless-shell, as the shell environment lacks the requisite graphics compositing architecture necessary for accurate WebGL timing and rendering evaluations. The test runner must execute with explicit launchOptions passing the --use-angle=gl and --no-sandbox arguments, forcing the virtual environment to utilize hardware acceleration. During the execution, the test will sample the fpsEstimate emitted by the window.__comebackCityKartTelemetry object, failing the gate immediately if the median frame rate over a 10-second window drops below 34 FPS.

The final validations include the Screenshot, Video, and Trace Gates. The Playwright testing suite must generate localized desktop and mobile .png screenshots, alongside a 10-second telemetry-rich .webm capture utilizing the Page.

Screencast API. Furthermore, Playwright's Trace Viewer architecture must be configured with trace: 'on-first-retry', compiling an immutable timeline of DOM snapshots, network waterfall requests, and console error logs. This trace artifact ensures that if a model fails to load, or a material throws a compilation error, the precise cause is documented for developer review.

## Unreal MCP Role

The introduction of Unreal Engine 5.8 alongside its Model Context Protocol (MCP) server provides a profound capability for Look-Development and asset preparation. The protocol establishes an open-standard gateway, embedding an HTTP JSON-RPC server directly within the Unreal Editor process, binding locally to http://127.0.0.1:8000/mcp. This interface allows external AI agents, utilizing tools like Claude or custom testing scripts, to orchestrate editor functionality programmatically.However, despite these capabilities, Unreal Engine is strictly constrained to an offline, experimental laboratory role. The Comeback City project is a web-native application; attempting to compile Unreal Engine to WebAssembly or utilize heavy pixel-streaming solutions fundamentally violates the requirement for instant, frictionless mobile deployment.

The MCP integration is utilized specifically to leverage Unreal's superior rendering architecture for reference generation. By connecting to the local MCP port, the automated scripts can command the engine to spawn instances of the Three.js track kit modules and arrange them according to the JSON data schema. The scripts can then apply Unreal's new MegaLights system—which supports hundreds of dynamic, shadow-casting area lights—to perfectly mimic the lighting scenarios depicted in the V2 trait cards. Furthermore, the engine's advanced Substrate Non-Photorealistic Rendering (NPR) framework can be leveraged to establish the exact "glossy toy-like" material parameters required by the art direction.

The output from this Unreal lab is considered useful only when it generates incontrovertible reference screenshots via the Movie Render Graph, or when it exports cleanly baked textures and GLB assets that can be fed directly back into the Three.js raw/ ingestion directory. The MCP server logs its initialization parameters to the internal Output Log; testing scripts must monitor this log to verify the local port is active and gracefully skip the Unreal integration phase if the engine is not currently running.

## Seedance Decision

The potential utilization of external generative video platforms, such as Seedance, to produce promotional gameplay footage is definitively deferred. Relying on external, non-real-time rendering solutions creates an unacceptable layer of obfuscation regarding the actual capabilities of the Three.js web engine. Generating marketing materials that outpace the genuine fidelity of the playable runtime introduces significant product risk and invalidates the primary goal of the project, which is to build a performant, playable visual pipeline.

External video generation subscriptions will only become viable after the automated Playwright visual QA gates successfully and repeatedly generate unedited 10-second .webm screencasts of the authentic WebGL runtime, demonstrating stable physics and adherence to the V2 art direction. The baseline fidelity of the Three.js renderer must be irrefutably proven via these locally generated artifacts before synthetic amplification is considered.

## Owner Decisions

While the architectural pathways are rigidly defined within this synthesis, executing the pipeline requires the project owner to resolve three highly specific implementation parameters.

Compression Fallback Infrastructure: The optimization pipeline relies heavily on the EXT_meshopt_compression extension for vertex reduction. If telemetry indicates a significant portion of the target mobile demographic operates on legacy browsers lacking the required WebAssembly decoding support, does the owner authorize the generation of an uncompressed, secondary fallback .glb for every asset, effectively doubling the required build time and storage capacity, or is a baseline uncompressed fallback body (e.g., the Kenney asset) acceptable for all such failures?Track Kit Authorship Delegation: The automated pipeline is designed to optimize, place, and render the modular track kit components. However, who is responsible for authoring the raw geometric shape of the straight, curve, and ramp modules? Must these be algorithmically generated, processed via Tripo from 2D concepts, or manually authored by an artist in a DCC application like Blender before ingestion into the raw/ directory?Hardware Acceleration Availability in CI: The Playwright verification scripts mandate the injection of the --use-angle=gl hardware acceleration flags. If the remote CI environment (e.g., standard GitHub Action runners) lacks virtualized GPU capabilities and is forced to fall back to SwiftShader emulation, the rendering performance will invariably plunge. Does the owner intend to provision GPU-backed remote runners, or must the Playwright scripts detect the environment and conditionally lower the fpsEstimate threshold from 34 FPS to 15 FPS when executing purely in software emulation?

## Phase Plan

To ensure systemic stability, the implementation of the synthesized architecture is segmented into eight sequential phases. Progressing to a subsequent phase is contingent upon the successful execution and validation of the prior requirements.

Execution PhasePhase TitleTechnical Objectives and DeliverablesPhase 1Inventory and Manifest InitializationConstruct the strict filesystem hierarchy (raw/, optimized/, manifests/). Implement the initial scripts/pipeline/audit-game-assets.mjs utility utilizing the gltf-transform inspect APIs to document the baseline geometric reality of the unoptimized Tripo assets, saving the output strictly to the asset-budgets.json ledger.Phase 2GLB Optimization Script ConstructionDevelop the core processing engine, scripts/pipeline/optimize-game-glbs.mjs. Chain the requisite @gltf-transform/functions: weld(), dedup(), prune(), textureCompress({ encoder: sharp, targetFormat: 'webp' }), and simplify({ simplifier: MeshoptSimplifier }). Ensure the pipeline gracefully processes and outputs the optimized binaries into the targeted directory.Phase 3Asset Preview Gallery DeploymentProgrammatically update the Vite application routing to expose the /#visual-kart-proof testing environment. Configure this staging area with THREE.ACESFilmicToneMapping and proper environment lighting to allow for immediate visual validation of the meshopt and webp artifacts.Phase 4Track-Kit Schema IntegrationRefactor the src/game/race/tracks/ schema definitions to support explicit modular kit references. Overhaul the createTrackMesh.js rendering logic to iterate over the purely mathematical data structures, instantiating the optimized .glb kit pieces using THREE.InstancedMesh and calculating exact quaternion alignments relative to the track splines.Phase 5First Visual Proof Route AssemblyCombine the optimized assets and the new track instantiation logic to assemble a complete, playable track loop. Configure the chase camera algorithms and lighting rigs to rigorously match the V2 trait card references, ensuring the route is stable for automated visitation.Phase 6Automated Playwright Evidence GenerationImplement the scripts/pipeline/capture-race-proof.mjs test suite. Configure the browser explicitly with channel: 'chromium' and the requisite --use-angle=gl hardware flags. Force preserveDrawingBuffer: true within the Three.js context and execute the Page.

Screencast capture logic to acquire incontrovertible visual evidence.Phase 7CI Route Promotion LogicFinalize the CI architecture by linking the test outputs to the deployment mechanism. Implement the compare-race-visuals.mjs pixel diffing script and the promote-approved-assets.mjs script, strictly ensuring that any failure in frame rate stability or visual regression permanently blocks the promotion of the asset payload to the production /#race route.Phase 8Optional Unreal MCP Lab SynchronizationDevelop the scripts/pipeline/unreal-mcp-sync.mjs utility. Establish the HTTP JSON-RPC stream connection to 127.0.0.1:8000/mcp. Send test orchestration commands to manipulate MegaLights lighting rigs and document the procedures required for exporting baked reference textures back into the Three.js ecosystem.

## First Codex Task

To initiate the architectural execution, the coding agent must be supplied with the following highly specific prompt:

```text
"Execute Phase 1 and Phase 2 of the Comeback City V2 Asset Pipeline Implementation. Begin by restructuring the local filesystem: instantiate the src/assets/game/models/raw/, src/assets/game/models/optimized/, and src/assets/game/manifests/ directories. Transfer all existing Tripo generative .glb files from 3d generations/ and the root models folder directly into the new raw/ directory. Next, utilize the @gltf-transform/core and @gltf-transform/cli packages to implement the scripts/pipeline/audit-game-assets.mjs script. This module must iteratively parse the vertex counts, triangle counts, and maximum texture dimensions of every binary in the raw/ folder, serializing the output securely to asset-budgets.json. Finally, implement the central processing script, scripts/pipeline/optimize-game-glbs.mjs. This script must ingest the raw files and sequentially apply the weld(), dedup(), prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], resizeFilter: 'lanczos3' }), and simplify({ simplifier: MeshoptSimplifier }) functions using the @gltf-transform/functions API, followed by final compression using meshopt(). Ensure that normal maps are safely preserved or correctly disposed of during the simplification phase to prevent topology tearing. Route all processed binaries into the optimized/ directory. Conclude by appending the required pipeline:audit and pipeline:optimize execution triggers to the package.json file."
```


---

# Kimi Report

# Comeback City - Automated Three.js Asset & Track Pipeline

_Final Implementation Plan. Source: Kimi deep research report pasted by owner. Raw attachment preserved at `docs/research/kimi-visual-pipeline-report.raw.txt`._

_Formatting note: this readable copy preserves the report content and adds Markdown headings/fences. The source report had numbering gaps and plain-text tables; consult the raw file for exact original formatting._

## 1. Final Recommendation
Chosen workflow: A scripted glTF-Transform optimization pipeline for assets combined with a hybrid modular track system for visuals. Unreal Engine 5.8 MCP is positioned as an optional backlogged look-dev lab — valuable for reference but not on the critical path.
Why this workflow wins:
Preserves existing investment: All React/Vite/Three.js race mechanics, telemetry, and QA gates remain untouched. No engine migration.
Repeatable asset production: Raw Tripo GLBs (15 MB, 280K triangles) become runtime assets (1–4 MB, 12–50K triangles) through a single npm run test:asset-optimize command.
Data-driven tracks with authored visuals: Track collision, progress, and AI pathing stay in JavaScript. Visuals upgrade from procedural boxes to instanced GLB modules + authored scenery.
CI-native: Every gate runs headless in CI. No GUI tools required for standard operations.
Optional Unreal MCP: The experimental UE 5.8 MCP plugin is real and available, but the project does not depend on it. It can be activated later if look-development needs justify the setup cost.

## 2. Implementation Brief for Codex

### 2.1 What to Build
Build an automated asset pipeline and modular track system for the Comeback City kart game. The pipeline turns raw GLB sources into optimized runtime assets. The track system replaces procedural road boxes with reusable visual modules while keeping all existing race mechanics intact.

### 2.2 Core Constraints
Do not modify existing race mechanics (physics, controls, items, AI, telemetry)
Do not change the React/Vite/Three.js stack
Do not add runtime dependencies beyond three (already present)
Do not require Unreal Engine for any production task
Preserve all existing test scripts and their pass criteria
Add new scripts alongside existing ones; don't rename or remove

## 3. File Structure

```text
comeback-tracker/
├── src/
│   ├── assets/
│   │   └── game/
│   │       ├── models/
│   │       │   ├── _raw/trip/              # NEW: incoming Tripo GLBs
│   │       │   ├── _raw/kenney/            # NEW: incoming Kenney GLBs
│   │       │   ├── avatars/                # EXISTING
│   │       │   ├── toy-car-kit/            # EXISTING
│   │       │   ├── tripo/                  # EXISTING
│   │       │   ├── track-modules/          # NEW: road/curb/barrier GLBs
│   │       │   └── props/                  # NEW: district props
│   │       └── art-direction/
│   │           └── v2/reference-screenshots/ # NEW
│   ├── game/
│   │   └── race/
│   │       ├── tracks/
│   │       │   ├── modules/                # NEW: track kit logic
│   │       │   │   ├── TrackModuleLoader.js
│   │       │   │   ├── ModulePlacer.js
│   │       │   │   └── MaterialPresets.js
│   │       │   └── index.js                # MODIFY: add visual fields
│   │       └── render/
│   │           ├── createTrackMesh.js      # MODIFY: instanced modules
│   │           └── createRaceScenery.js    # MODIFY: scenery anchors
│   └── ComebackCityThreeKartRace.jsx       # MODIFY: Draco loader
├── scripts/
│   ├── audit-game-assets.mjs               # NEW
│   ├── optimize-game-glbs.mjs              # NEW
│   ├── validate-game-assets.mjs            # NEW
│   ├── render-asset-gallery.mjs            # NEW
│   ├── capture-race-proof.mjs              # NEW
│   ├── compare-race-visuals.mjs            # NEW
│   ├── promote-approved-assets.mjs         # NEW
│   └── bundle-asset-budget-report.mjs      # EXISTING
├── .asset-workspace/                       # NEW: gitignored
│   ├── audit/
│   ├── optimized/
│   ├── rejected/
│   ├── gallery/
│   └── proof/
├── vite.config.js                          # MODIFY
└── package.json                            # MODIFY
```

## 4. NPM Scripts
Add these to package.json alongside existing ones:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",

    "test:asset-audit": "node scripts/audit-game-assets.mjs",
    "test:asset-optimize": "node scripts/optimize-game-glbs.mjs",
    "test:asset-validate": "node scripts/validate-game-assets.mjs",
    "test:asset-gallery": "node scripts/render-asset-gallery.mjs",
    "test:capture-proof": "node scripts/capture-race-proof.mjs",
    "test:visual-compare": "node scripts/compare-race-visuals.mjs",
    "test:asset-promote": "node scripts/promote-approved-assets.mjs",

    "test:kart-proof": "node scripts/kart-proof-static-guard.mjs",
    "test:kart-playable": "node scripts/kart-playable-proof-test.mjs",
    "test:kart-3d-spike": "node scripts/kart-3d-spike-test.mjs",
    "test:visual": "node scripts/visual-reference-checks.mjs",
    "test:webgl": "node scripts/webgl-context-smoke-test.mjs",
    "test:bundle": "node scripts/bundle-asset-budget-report.mjs",
    "test:race": "node scripts/race-content-playtest.mjs",
    "test:race:browser": "node scripts/race-browser-playtest.mjs"
  }
}
```

## 5. Automation Scripts

### 5.1 audit-game-assets.mjs

```text
Field	Value
Path	scripts/audit-game-assets.mjs
Purpose	Scan _raw/ GLBs and produce audit reports
Inputs	src/assets/game/models/_raw/**/*.glb
Outputs	.asset-workspace/audit-report.json, .asset-workspace/audit-summary.md
Packages	@gltf-transform/core, @gltf-transform/extensions
Pass	Valid GLB, >=1 mesh, has UVs, >=1 material, <500K tris, <50 MB
Fail	Move to .asset-workspace/rejected/ with diagnostic JSON; exit 1
First scope	Audit all 7 Tripo GLBs and Kenney assets
```

### 5.2 optimize-game-glbs.mjs

```text
Field	Value
Path	scripts/optimize-game-glbs.mjs
Purpose	Run weld -> dedup -> simplify -> resize -> webp -> draco
Inputs	.asset-workspace/audit-report.json (PASS assets)
Outputs	.asset-workspace/optimized/*.glb, .asset-workspace/optimization-log.json
Packages	@gltf-transform/cli, sharp
Pass	Output size < budget, tris < budget, validates
Fail	Log failure, exit 1
First scope	Optimize hero kart (red) + one rival kart (purple)
Command used:
```

```bash
gltf-transform optimize input.glb output.glb \
  --compress draco \
  --texture-compress webp \
  --texture-size 1024 \
  --simplify-ratio 0.5
Optimization profiles:
```

```text
Profile	Simplify Ratio	Texture Size	Draco Quantization
hero	0.5	1024	14
rival	0.35	1024	12
character	0.6	1024	14
prop-simple	0.3	512	11
prop-complex	0.4	1024	12
track	0.3	512	10
```

### 5.3 validate-game-assets.mjs

```text
Field	Value
Path	scripts/validate-game-assets.mjs
Purpose	Validate optimized assets against spec and budgets
Inputs	.asset-workspace/optimized/*.glb
Outputs	.asset-workspace/validation-report.json
Packages	@gltf-transform/cli
Pass	gltf-transform validate passes, all budgets met
Fail	List violations, exit 1
First scope	Validate optimized hero + rival karts
```

### 5.4 render-asset-gallery.mjs

```text
Field	Value
Path	scripts/render-asset-gallery.mjs
Purpose	Generate HTML gallery with Three.js preview
Inputs	.asset-workspace/optimized/*.glb
Outputs	.asset-workspace/gallery/index.html
Packages	three
Pass	Gallery loads, all previews render
Fail	Log failed previews, exit 1
First scope	Gallery for 2 optimized karts
```

### 5.5 capture-race-proof.mjs

```text
Field	Value
Path	scripts/capture-race-proof.mjs
Purpose	Capture screenshots and videos via Playwright
Inputs	Running preview server, /#race route
Outputs	.asset-workspace/proof/*.{png,webm}
Packages	playwright (existing)
Pass	Screenshots non-blank, race selector present
Fail	Attach artifacts, exit 1
First scope	Desktop + mobile screenshot of #race
```

### 5.6 compare-race-visuals.mjs

```text
Field	Value
Path	scripts/compare-race-visuals.mjs
Purpose	Compare screenshots against reference images
Inputs	Current screenshots, src/assets/game/proof/reference/*.png
Outputs	Mean difference report, diff images
Packages	pngjs (existing), pixelmatch
Pass	Mean pixel difference < 5%
Fail	Generate diff overlay, exit 1
First scope	Compare against existing kart-proof-desktop-v1.png
```

### 5.7 promote-approved-assets.mjs

```text
Field	Value
Path	scripts/promote-approved-assets.mjs
Purpose	Copy validated assets to runtime folder, update manifest
Inputs	.asset-workspace/optimized/*.glb (validation-passed)
Outputs	src/assets/game/models/**/*, updated asset-manifest.json
Packages	Node.js fs/promises
Pass	Files copied, manifest updated, git-ready
Fail	Rollback partial copy, exit 1
First scope	Promote optimized hero kart
6. Asset Budgets (Final)
```

### 6.1 Source GLB Acceptance

```text
Metric	Minimum	Reject If
File size	Any	>100 MB
Triangles	Any	>1,000,000
UV mapping	Has UV1	No UVs
Materials	>=1	0
Format	GLB 2.0	Not GLB
```

### 6.2 Optimized GLB Acceptance

```text
Asset Type	Max Size	Max Triangles	Max Vertices	Max Texture
Hero kart	1.5 MB	25,000	25,000	1024x1024
Rival kart	1.0 MB	15,000	15,000	1024x1024
Seated character	2.0 MB	50,000	50,000	1024x1024
Simple prop	0.3 MB	5,000	5,000	512x512
Complex prop	0.8 MB	15,000	15,000	1024x1024
Item box	0.2 MB	3,000	3,000	512x512
Track module	0.5 MB	10,000	10,000	512x512
```

### 6.3 Scene Budgets

```text
Metric	Mobile Target	Desktop Target
Draw calls	<100	<200
On-screen triangles	<100,000	<500,000
Texture memory	<50 MB	<200 MB
Total GLB download	<15 MB	<25 MB
Bundle size	<20 MB	<20 MB
FPS (median)	>=34 (existing gate)	>=60 (target)
Load time (first race)	<5s	<3s
```

## 7. Track Workflow

### 7.1 Track Definition Schema (Extended)

```javascript
const EXAMPLE_TRACK = {
  // EXISTING (preserved exactly)
  key: 'comeback-city',
  name: 'Comeback City',
  course: COURSE_DATA,
  laps: 3,
  startOffset: 0.03,
  elevation: { from: 0.4, peak: 21, to: 0.534 },
  ramps: [...],
  shortcut: { ... },
  surfaceBands: [...],
  breakableObjects: [...],
  crossers: [...],
  palette: { ... },
  budgets: { finishSeconds: 45, speedFloor: 140 },

  // NEW: Visual modules
  visualModules: {
    roadStyle: 'asphalt-neon',
    curbStyle: 'red-white-striped',
    barrierStyle: 'plastic-red',
    laneMarking: 'yellow-dashed',
  },

  // NEW: Camera hints
  cameraHints: [
    { t: 0.0, height: 2.5, distance: 6.0 },
    { t: 0.5, height: 2.0, distance: 5.5 },
  ],

  // NEW: Mobile framing
  mobileCropHints: [
    { t: 0.0, fov: 65, renderScale: 0.6 },
    { t: 0.5, fov: 70, renderScale: 0.55 },
  ],

  // NEW: Scenery anchors
  sceneryAnchors: [
    { t: 0.1, offset: { x: 8, y: 0, z: 0 }, asset: 'district-facade-gym', scale: 1.0 },
  ],

  // NEW: District portals
  districtPortals: [
    { t: 0.15, district: 'gym', facadeAsset: 'district-facade-gym', portalGlowColor: 0x00ff88 },
  ],

  // NEW: Prop density zones
  propZones: [
    { tFrom: 0.0, tTo: 0.3, density: 'high', types: ['barrier', 'cone'] },
  ],
};
```

### 7.2 Visual Module Kit

```text
Module	File	Budget	Instanced
Road straight	road-straight.glb	<500 tris	Yes
Road curve left	road-curve-left.glb	<1000 tris	Yes
Road curve right	road-curve-right.glb	<1000 tris	Yes
Curb section	curb-1m.glb	<100 tris	Yes
Barrier	barrier-plastic.glb	<300 tris	Yes
Finish gate	finish-gate.glb	<3000 tris	No
District facade	facade-{district}.glb	<5000 tris	No
```

### 7.3 Runtime Placement (InstancedMesh)

```javascript
const roadGeo = await loadGLBModule('road-straight.glb');
const instances = new THREE.InstancedMesh(roadGeo, roadMaterial, maxCount);

placeAlongCurve(centerline, spacing, (point, tangent, t) => {
  dummy.position.copy(point);
  dummy.rotation.y = Math.atan2(tangent.x, tangent.z);
  dummy.updateMatrix();
  instances.setMatrixAt(index++, dummy.matrix);
});
```

### 7.4 Camera/Framing Proof
Desktop: 1365x768, FOV 65deg, render scale 0.58
Mobile: 390x844, FOV 70deg, render scale 0.55-0.6
Capture via Playwright after countdown + 2s gameplay
8. Visual QA Gates (Final)

```text
Gate	Script	Criteria	Blocks Promotion?
Asset audit	test:asset-audit	All raw assets valid	Yes
Optimization	test:asset-optimize	All assets optimize	Yes
Validation	test:asset-validate	All within budget	Yes
Manifest	test:asset-promote	Manifest updated	Yes
Route render	test:kart-3d-spike	Renderer=three-kart, FPS>=34	Yes
Screenshot	test:capture-proof	Desktop+mobile captured	Yes
Visual compare	test:visual-compare	Mean diff < 5%	Yes
Bundle size	test:bundle	Total < 20 MB	Yes
WebGL context	test:webgl	Non-blank canvas	Yes
Gate execution order:
```

```text
build -> asset-audit -> asset-optimize -> asset-validate -> webgl 
-> kart-3d-spike -> capture-proof -> visual-compare -> bundle -> kart-playable
```

## 9. Unreal MCP Role

### 9.1 When to Use Unreal MCP

```text
Scenario	Action
Current track looks good in Three.js	Do not use Unreal
Lighting looks flat, needs reference	Use Unreal MCP
New district needs material exploration	Use Unreal MCP
CI pipeline or runtime	Never use Unreal
```

### 9.2 What Counts as Useful Output

```text
Output Type	Use in Three.js
Reference screenshot	Visual QA comparison
Lighting parameters	Replicate in Three.js renderer
Material settings	Apply to MeshStandardMaterial
Exported GLB	Through optimization pipeline
```

### 9.3 Setup (Backlogged)
Install Unreal Engine 5.8
Enable ModelContextProtocol experimental plugin
Install ChiR24/Unreal_mcp or preferred MCP server
Stage one track section
Export reference screenshot + parameters
Replicate settings in Three.js
Evaluate value before expanding

## 10. Seedance Decision
When video generation becomes useful: After the race route produces stable, visually strong screenshots matching V2 art direction.
Proof that should come first:
Desktop screenshot of /race with modular track + authored scenery
Mobile screenshot showing readable HUD and stable framing
10-second WebM from Playwright showing smooth gameplay
Contact sheet against V2 trait cards
Only then consider Seedance 2.0 for promotional trailers.

## 11. Owner Decisions Required

```text
#	Question	Default if Unanswered
1	Are the 7 Tripo GLBs the complete raw set?	Assume complete
2	What is the minimum target device?	iPhone 12 equivalent
3	Should Kenney assets also be optimized?	Leave as-is
4	Is WebP sufficient, or plan KTX2?	WebP for launch
5	Are new kart/character designs in progress?	Pipeline supports incremental
```

## 12. Phase Plan
Phase 1: Inventory & Manifest (Days 1-2)
Install @gltf-transform/cli and @gltf-transform/core
Create .asset-workspace/ structure
Create src/assets/game/models/_raw/ folders
Update vite.config.js with assetsInclude: ['**/*.glb']
Update asset-manifest.json schema
Phase 2: GLB Optimization Scripts (Days 3-5)
Implement audit-game-assets.mjs
Implement optimize-game-glbs.mjs with profiles
Implement validate-game-assets.mjs
Add npm scripts
Run on hero kart + one rival kart
Phase 3: Asset Preview Gallery (Days 6-7)
Implement render-asset-gallery.mjs
Create HTML gallery with Three.js preview
Generate for optimized assets
Phase 4: Track Kit Schema (Days 8-10)
Define TrackModuleLoader.js interface
Create MaterialPresets.js
Implement ModulePlacer.js
Add visual fields to track definitions
Test with COMEBACK_CITY_TRACK
Phase 5: First Visual Proof Route (Days 11-13)
Create/source first track module GLBs
Implement instanced placement in createTrackMesh.js
Add one district facade
Run visual proof capture
Generate contact sheet vs V2 cards
Phase 6: Automated Evidence (Days 14-15)
Implement capture-race-proof.mjs
Implement compare-race-visuals.mjs
Set reference images
Integrate into CI pipeline
Phase 7: Route Promotion (Days 16-17)
Run full gate suite
Update visualAssetSet telemetry
Promote /race route
Document pipeline for team
Phase 8: Optional Unreal MCP Lab (Backlogged)
Install Unreal 5.8 + MCP plugin
Stage lighting reference
Export parameters for Three.js
Evaluate value
13. First Codex Task (Exact Prompt)

```text
Implement the Comeback City asset audit and optimization pipeline.

CONTEXT:
- React 18 + Vite + Three.js 0.184 kart racing game
- Raw Tripo GLBs are 15 MB / 280K triangles - too heavy for web
- Need automated scripts to turn them into optimized runtime assets
- Pipeline must be CI-friendly (headless, no GUI)

TASKS:

1. Install packages:
   npm install -D @gltf-transform/cli @gltf-transform/core @gltf-transform/extensions

2. Create directory structure:
   - .asset-workspace/ (add to .gitignore)
   - .asset-workspace/audit/
   - .asset-workspace/optimized/
   - .asset-workspace/rejected/
   - .asset-workspace/gallery/
   - .asset-workspace/proof/
   - src/assets/game/models/_raw/trip/
   - src/assets/game/models/_raw/kenney/

3. Create scripts/audit-game-assets.mjs:
   - Scan src/assets/game/models/_raw/**/*.glb
   - Use @gltf-transform/core NodeIO to parse each GLB
   - Extract: mesh count, material count, texture count, triangle count, vertex count, file size
   - Check: valid GLB, has UVs, has materials, triangles < 500000, size < 50MB
   - Output: .asset-workspace/audit-report.json with metrics and PASS/FAIL verdict
   - Output: .asset-workspace/audit-summary.md (human-readable table)
   - FAIL assets: move to .asset-workspace/rejected/ with diagnostic JSON
   - Exit code 0 if all PASS, 1 if any FAIL

4. Create scripts/optimize-game-glbs.mjs:
   - Read .asset-workspace/audit-report.json
   - For each PASS asset, run:
     gltf-transform optimize input.glb output.glb --compress draco --texture-compress webp --texture-size 1024
   - Support profiles: hero (ratio 0.5), rival (ratio 0.35), character (ratio 0.6)
   - Profile selected by filename pattern (configurable mapping)
   - Output: .asset-workspace/optimized/{original-name}.glb
   - Output: .asset-workspace/optimization-log.json with before/after
   - Exit code 0 on success, 1 on failure

5. Create scripts/validate-game-assets.mjs:
   - Read .asset-workspace/optimized/*.glb
   - Run: gltf-transform validate on each
   - Check budgets: hero < 1.5MB + < 25K tris, rival < 1.0MB + < 15K tris
   - Output: .asset-workspace/validation-report.json
   - Exit code 0 if all pass, 1 if any fail

6. Update package.json:
   - Add scripts: test:asset-audit, test:asset-optimize, test:asset-validate

7. Update vite.config.js:
   - Add assetsInclude: ['**/*.glb', '**/*.gltf']

8. Run the full pipeline on existing assets and report results.

CONSTRAINTS:
- Do not modify existing race mechanics files
- Do not remove existing npm scripts
- Use ES modules (.mjs) for all new scripts
- All scripts must run headless
- Log progress to console with clear PASS/FAIL indicators
14. GLB Optimization Deep Dive
```

### 14.1 Single-Asset Command

```bash
gltf-transform optimize input.glb output.glb \
  --compress draco \
  --texture-compress webp \
  --texture-size 1024 \
  --simplify-ratio 0.5 \
  --simplify-lock-border \
  --vertex-layout interleaved
```

### 14.2 Pipeline Stages

```text
Stage	Effect	Typical Reduction
Deduplicate	Remove duplicate accessors/textures	5-15%
Weld	Merge equivalent vertices	10-30% vertices
Simplify	Reduce triangles	30-70% triangles
Flatten	Collapse scene graph	Node overhead
Join	Merge compatible primitives	Fewer draw calls
Prune	Remove unreferenced properties	Cleanup
Texture resize	Cap to 1024x1024	VRAM reduction
Texture compress (WebP)	50-70% texture size	Download reduction
Draco compress	90-95% geometry	File size reduction
```

### 14.3 Draco Decoder Setup

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
```

### 14.4 Fallback Strategy
Primary: Load Draco-compressed GLB
Fallback 1: Load uncompressed GLB if Draco decoder fails
Fallback 2: Use procedural geometry if GLB 404s
Log: Report to telemetry which fallback activated
15. Material Presets (V2 Style)

```text
Preset	Color	Roughness	Metalness	Emissive
asphalt-neon	#2a2a2a	0.8	0.0	0x000000
curb-red	#cc2222	0.6	0.0	0x000000
curb-white	#eeeeee	0.6	0.0	0x000000
barrier-red	#dd1111	0.4	0.1	0x000000
metal-rail	#888888	0.3	0.8	0x000000
glow-boost	#00ffff	0.2	0.0	0x00ffff
district-gym	#00ff88	0.5	0.2	0x004422
district-lab	#8844ff	0.5	0.2	0x220044
16. Playwright Capture Implementation
```

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.createContext({
  viewport: { width: 1365, height: 768 },
  recordVideo: { dir: './proof/', size: { width: 1365, height: 768 } }
});
const page = await context.newPage();

await page.goto('http://localhost:4173/#race');
await page.waitForSelector('[data-testid="comeback-city-3d-kart-race"]');
await page.waitForFunction(() => {
  const t = window.__comebackCityKartTelemetry;
  return t && t.countdown === 0;
}, { timeout: 30000 });

await page.waitForTimeout(2000);
await page.screenshot({ path: './proof/desktop-race.png' });
await context.close();
17. Vite Configuration
```

```javascript
// vite.config.js
export default defineConfig({
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name.split('.').pop();
          if (ext === 'glb' || ext === 'gltf') {
            return `assets/game/models/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    }
  }
});
18. Asset Manifest Schema
```

```json
{
  "assets": [
    {
      "id": "hero-kart-tripo",
      "source": "Tripo 3D from V2 trait card",
      "license": "owner-generated",
      "role": "player-kart-primary",
      "path": "models/tripo/hero-kart-tripo.glb",
      "budget": { "maxSizeMB": 1.5, "maxTriangles": 25000, "maxTextureSize": 1024 },
      "actual": { "sizeMB": 1.00, "triangles": 23172, "textureSize": 1024 },
      "fallback": "procedural-kart-hero",
      "dracoCompressed": true,
      "webpTextures": true,
      "verified": "2026-06-18"
    }
  ]
}
Generated from Deep Research Reports 1 & 2. Sources: glTF-Transform CLI docs, Three.js documentation, Playwright docs, Unreal Engine 5.8 release notes, web/mobile 3D performance research.
```


---

# Claude Report 1 - Asset Runtime Pipeline

# Comeback City - Research Report 1: Three.js Asset & Runtime Pipeline

_Source: Claude report one pasted by owner. Raw attachment preserved at `docs/research/claude-report-1-asset-runtime-pipeline.raw.txt`._


**Stage 1 of 3.** Scope: a repeatable, scripted path from raw Tripo GLB / PNG source assets to optimized, testable Three.js runtime assets, without disturbing the existing React/Vite/Three.js race mechanics. Companion deliverables: Report 2 (tracks + Unreal look-dev) and the Pro synthesis (Codex build brief).

Date context: 2026-06-17. Tool behavior verified against current primary docs at research time (see §12).

Convention in this doc:
- **[sourced]** = verified against official/primary documentation.
- **[repo]** = fact taken from the embedded repo context you provided.
- **[judgment]** = engineering recommendation, not a sourced fact.

---

## 1. Executive Recommendation

Build a **five-stage, file-system-driven, idempotent asset pipeline** that lives entirely in `scripts/` and is gated by your existing test harness. The pipeline is:

```
raw/  →  audit  →  optimize  →  validate  →  proof  →  promote → manifest
```

Core decisions:

1. **Geometry compression: meshopt (EXT_meshopt_compression), not Draco.** [judgment, grounded in sourced facts] Three.js bundles the meshopt decoder and enables it with one call (`setMeshoptDecoder`) **[sourced]**; meshopt decodes fast and is designed to compress further under gzip **[sourced]**. Draco yields marginally smaller files but needs an externally-hosted decoder and is slower to decode — the wrong tradeoff for a game that streams many small models. Keep Draco as a documented fallback only.

2. **Geometry reduction: `weld` → `simplify` (meshoptimizer's `MeshoptSimplifier`).** [judgment] Your raw Tripo exports are ~280k–300k triangles each **[repo]**; your *working* runtime karts/characters prove that 13k–25k triangles read beautifully in this art style. The optimizer's job is to make that reduction automatic and consistent instead of the hand-done, inconsistent result currently in the repo (your bunny is 15k tris / 0.55 MB but two of your penguins are still 88k–100k tris / 3.4–3.8 MB).

3. **Textures: resize + WebP as the baseline; KTX2/Basis (ETC1S) as an optional Phase-2 upgrade.** [judgment] Your source models carry a single ~JPEG texture each **[repo]**. Resizing to 512–1024 and re-encoding to WebP wins download size with no runtime decoder cost. KTX2/ETC1S additionally cuts GPU VRAM (it transcodes to native compressed formats on device) but adds the Basis transcoder dependency and `detectSupport(renderer)` wiring **[sourced]** — defer it until asset count or mobile VRAM telemetry justifies it.

4. **Write the optimizer as a scripted Node program using the glTF-Transform JS API, not the one-shot `gltf-transform optimize` CLI.** [judgment] The bundled `optimize` command runs `prune({ keepAttributes: false })` internally, which strips secondary UV channels and applies a fixed join/flatten profile **[sourced]** — fine for many models, but you want per-asset-class control over simplify ratio, texture size, and weld tolerance. The functional API gives that control and matches your existing `.mjs` script convention **[repo]**.

5. **Preserve mechanics by treating optimized GLBs as drop-in replacements at the same import paths.** [judgment] Your runtime already loads optimized avatars/karts from `src/assets/game/models/...` with procedural fallbacks if a GLB fails **[repo]**. The pipeline writes to those same promoted paths; mechanics code (`kartPhysics`, `raceProgress`, track data) never imports raw assets and never changes.

The whole thing is enforced by gates you already have: `test:bundle`, `test:visual`, `test:webgl`, `test:kart-proof`, `test:kart-playable`, `test:kart-3d-spike` **[repo]**. The pipeline adds three new gates (audit, optimize-verify, manifest) that slot into the same `npm run` pattern.

---

## 2. Runtime Asset Pipeline

The pipeline is a directed flow over a fixed folder layout (§6). Each stage is a script (§5), reads from the previous stage's output folder, and is **idempotent** — re-running with unchanged inputs produces unchanged outputs (use a content hash to skip work).

```
┌────────────┐   audit     ┌────────────┐  optimize   ┌─────────────┐
│  raw/      │────────────▶│ audit JSON │────────────▶│ optimized/  │
│ (Tripo GLB │  measure +  │ + flags    │ weld/simp/  │ (runtime    │
│  + PNG)    │  classify   │            │ tex/meshopt │  candidates)│
└────────────┘             └────────────┘             └──────┬──────┘
                                                             │ validate
                          ┌──────────────────────────────────┘
                          ▼
                  ┌──────────────┐  pass → ┌──────────────┐  proof  ┌──────────────┐
                  │ validate     │────────▶│ gallery +    │────────▶│ Playwright   │
                  │ (budgets,    │  fail → │ contact-sheet│ render  │ screenshots/ │
                  │  spec, dims) │  reject/│ render       │         │ video        │
                  └──────────────┘         └──────────────┘         └──────┬───────┘
                          │                                                │
                          ▼ (on fail)                                      ▼ pass
                  ┌──────────────┐                              ┌──────────────────┐
                  │ rejected/    │                              │ promote → copy to│
                  │ + reason log │                              │ src/.../models/  │
                  └──────────────┘                              │ + update manifest│
                                                                └──────────────────┘
```

Stage responsibilities:

- **audit** — measure every source asset (size, vertices, triangles, materials, textures, texture dims, animation count, bounding box, up-axis guess), classify it (kart / character / prop / item / track-module), and flag what exceeds source-acceptance budgets. Output is a machine-readable report; nothing is modified.
- **optimize** — apply the per-class transform chain, write candidates to `optimized/`. Deterministic; logs before/after deltas.
- **validate** — assert each candidate against the optimized-acceptance budgets (§4) and re-validate against the glTF spec. Pass → eligible for promotion. Fail → moved to `rejected/` with a reason.
- **proof** — render candidates into a static gallery route and capture Playwright evidence (still + video), plus a contact sheet against the V2 trait cards.
- **promote** — copy approved candidates to the runtime model folders and rewrite `asset-manifest.json` provenance/budget/fallback entries.

---

## 3. GLB Optimization Strategy

### 3.1 Transform chain (per asset, scripted)

Order matters. Recommended chain **[judgment, built from sourced function behavior]**:

1. `dedup()` — collapse duplicate accessors/textures. **[sourced]**
2. `weld({ tolerance: 0.0001 })` — merge coincident vertices so simplify has a clean topology to work on. Required before `simplify` or it under-performs. **[sourced]**
3. `simplify({ simplifier: MeshoptSimplifier, ratio, error })` — the triangle reducer. `ratio` is the fraction of vertices to *keep*; `error` is the allowed deviation as a fraction of mesh radius. **[sourced]** Per-class ratios in §3.3.
4. `join({ keepNamed: false })` — merge compatible primitives to cut draw calls. **[sourced]** (Skip/loosen for assets whose named sub-meshes you animate or swap.)
5. `prune({ keepAttributes: true })` — drop unreferenced nodes/textures/data. Keep `keepAttributes: true` so you don't silently lose a UV set you need. **[sourced]**
6. `textureResize({ size: [W, H] })` (or `textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [...] })`) — clamp texture dimensions / re-encode to WebP. WebP requires the `sharp` encoder on Node. **[sourced]**
7. `reorder({ encoder: MeshoptEncoder })` — optimize vertex/index order for GPU and for meshopt compression. **[sourced]**
8. Write with the meshopt extension enabled (the CLI equivalent is `gltf-transform meshopt in out --level medium`). **[sourced]**

`MeshoptSimplifier` and `MeshoptEncoder` come from the `meshoptimizer` npm package; you must `await MeshoptSimplifier.ready` / `MeshoptEncoder.ready` before use. **[sourced]**

### 3.2 Inspect & validate commands (audit + validate stages)

- `gltf-transform inspect model.glb` — full stats table (mesh, material, texture, animation). **[sourced]**
- `gltf-transform validate model.glb` — spec conformance. **[sourced]**
- Programmatic vertex counts for the audit: `getSceneVertexCount`, `getMeshVertexCount`, `getPrimitiveVertexCount` from `@gltf-transform/functions`. **[sourced]**

### 3.3 Per-class simplify targets (first-pass settings)

| Class | `simplify` ratio | `error` | Texture clamp |
|---|---|---|---|
| Hero kart | 0.10–0.15 | 0.01 | 1024 |
| Rival kart | 0.08–0.12 | 0.02 | 1024 (shared atlas where possible) |
| Seated character | 0.10–0.15 | 0.01 | 1024 |
| Complex prop / facade | 0.10 | 0.02 | 512 |
| Simple prop / item / boost pad | 0.05–0.10 | 0.03 | 256 |

These ratios reproduce roughly what your *good* existing assets already are (300k → ~15–25k tris). Tune per-asset; the validate gate (§4) is the backstop. Note that `simplify` cannot exceed the mesh's ability to preserve topology under `error`; if output stalls above target, lower `error` and re-weld with `toleranceNormal: 0.5` for more aggressive merging. **[sourced]**

### 3.4 Compression decision matrix

| Option | Geometry | Texture | Runtime cost | Verdict |
|---|---|---|---|---|
| **meshopt** | EXT_meshopt_compression | — | tiny bundled WASM decoder, fast | **Primary (geometry)** |
| Draco | KHR_draco_mesh_compression | — | external decoder, slower | Fallback only |
| WebP textures | — | EXT_texture_webp | none (native browser) | **Primary (texture, Phase 1)** |
| KTX2 / ETC1S | — | KHR_texture_basisu | Basis transcoder + `detectSupport` | Optional (Phase 2, VRAM) |
| gzip | lossless wrapper | — | server/transport | Enable at hosting layer |

### 3.5 Fallback strategy for unsupported compression

Two independent layers, both already compatible with your runtime:

1. **Decode availability.** Meshopt needs WebAssembly; this is universal in your modern-browser/PWA target, so no JS fallback buffers are required. (If you ever need legacy support, `gltfpack -cf` emits uncompressed fallback buffers — out of scope here.) **[sourced]**
2. **Asset-load failure.** Your runtime already keeps procedural fallback meshes if an optional GLB fails to load **[repo]**. The pipeline preserves this: never make a procedural primitive unreachable, and record the fallback path in the manifest per asset.

---

## 4. Asset Budgets

Anchored on your shipping runtime GLBs (proven at your ≥34 FPS gate) **[repo]**, not invented. Your bunny (14.9k tris / 0.55 MB) and hero-kart-tripo (23.1k tris / 1.0 MB) are the empirical "good" reference; your 88k–100k-tri penguins are over budget and should be re-optimized.

### 4.1 Source-acceptance (into `raw/`, untouched — these are *flags*, not rejections)

- Flag for mandatory optimization if: > 8 MB **OR** > 150k triangles **OR** texture > 2048² **OR** > 1 material with no atlas plan.
- Your Tripo exports (~15 MB, ~300k tris) all trip this — expected.

### 4.2 Optimized-acceptance (the promotion gate)

| Asset class | Triangles (max) | File size (max) | Texture (max) | Draw calls |
|---|---|---|---|---|
| Hero kart | 25k | 1.2 MB | 1024² | 1–2 |
| Rival kart | 18k | 0.8 MB | 1024² (shared) | 1 |
| Seated character | 25k | 1.0 MB | 1024² | 1–2 |
| Simple prop (cone/box) | 1.5k | 0.10 MB | 256² | 1 |
| Complex prop / facade | 8k | 0.50 MB | 512² | 1–3 |
| Item box | 2k | 0.12 MB | 256–512² | 1 |
| Boost pad | 1k | 0.08 MB | 256² + emissive | 1 |
| Track module | 6k | 0.40 MB | 512–1024² (tiling) | 1–2 |

### 4.3 Full visible race scene

| Metric | Mobile target | Desktop ceiling |
|---|---|---|
| Triangles on screen | ≤ 350k | ≤ 700k |
| Draw calls | ≤ 120 | ≤ 180 |
| GPU texture memory | ≤ 120 MB | ≤ 200 MB |
| Over-the-wire GLB payload (one race load) | ≤ 8 MB | ≤ 12 MB |
| Median FPS (existing gate) | ≥ 34 floor / 50+ target | ≥ 34 floor / 60 target |

**Draw-call note** [judgment]: the single biggest mobile-WebGL lever here is *not* triangle count — it's draw calls. Reuse one kart GLB across rivals via `THREE.InstancedMesh` (collapses N rivals to 1 draw call), and `join()` static props. Characters differ per racer and stay separate. Your existing scene keeps shadows off in the main renderer **[repo]** — keep that; it's the right call for this budget.

### 4.4 Bundle vs. asset payload

Keep this distinction explicit in `test:bundle`: the **JS bundle** (Three.js ~150 KB gzipped + app) should stay ≤ ~600 KB gzipped; **GLB assets** are loaded at runtime (via `?url` import or `public/`) and are budgeted separately as "race payload" above. Don't let large GLBs leak into the JS chunk graph.

---

## 5. Script Plan

All scripts are ESM `.mjs` in `scripts/`, matching your existing harness **[repo]**. Shared helper module `scripts/lib/asset-pipeline.mjs` holds the glTF-Transform I/O setup, class inference, and budget tables (single source of truth).

Shared dev dependencies to add:
`@gltf-transform/core`, `@gltf-transform/functions`, `@gltf-transform/extensions`, `meshoptimizer`, `sharp`. (`@gltf-transform/cli` optionally, for ad-hoc inspection.) Optional Phase 2: `draco3dgltf` (only if you enable Draco fallback).

### 5.1 `scripts/audit-game-assets.mjs`
- **Inputs:** every GLB/PNG under `raw/` (and optionally the current `src/assets/game/models/**`).
- **Outputs:** `asset-pipeline/audit/audit-report.json` + a human `audit-report.md`.
- **Packages:** `@gltf-transform/core`, `@gltf-transform/functions`.
- **Command:** `npm run assets:audit`
- **Pass/fail:** non-blocking by default; `--strict` exits non-zero if any *promoted* runtime asset exceeds §4.2.
- **Generates:** per-asset record `{ path, class, bytes, vertices, triangles, materials, textures, maxTexDim, animations, bbox, flags[] }`.

### 5.2 `scripts/optimize-game-glbs.mjs`  ← load-bearing
- **Inputs:** `raw/**.glb` (+ class config map).
- **Outputs:** `asset-pipeline/optimized/<class>/<name>.glb` + `optimize-log.json` (before/after tris, bytes, % reduction).
- **Packages:** `@gltf-transform/core`, `@gltf-transform/functions`, `meshoptimizer`, `sharp`.
- **Command:** `npm run assets:optimize` (optionally `-- --only crrt-bunny`).
- **Pass/fail:** fails if any output still exceeds its class budget after optimization, or if `gltf-transform validate` fails.
- **Generates:** optimized candidates + log; content-hash cache to skip unchanged inputs.

Reference implementation core (first scope — single-mesh, single-texture Tripo assets):

```js
// scripts/optimize-game-glbs.mjs (core)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, simplify, join, prune, textureCompress, reorder }
  from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

export async function optimizeAsset(inPath, outPath, cfg) {
  const doc = await io.read(inPath);
  await doc.transform(
    dedup(),
    weld({ tolerance: 0.0001 }),
    simplify({ simplifier: MeshoptSimplifier, ratio: cfg.ratio, error: cfg.error }),
    join({ keepNamed: cfg.keepNamed ?? false }),
    prune({ keepAttributes: true }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [cfg.tex, cfg.tex] }),
    reorder({ encoder: MeshoptEncoder }),
  );
  // Enable meshopt compression on write (extension registered above).
  await io.write(outPath, doc);
}
```

(Per-class `cfg` from §3.3 / §4.2. For meshopt write specifics, mirror the CLI `meshopt --level medium` behavior; verify the current `@gltf-transform/functions` meshopt write helper signature at implementation time — see §11.)

### 5.3 `scripts/validate-game-assets.mjs`
- **Inputs:** `asset-pipeline/optimized/**`.
- **Outputs:** `validate-report.json`; moves failures to `asset-pipeline/rejected/` with `reason.txt`.
- **Packages:** `@gltf-transform/core`, `@gltf-transform/functions` (+ a glTF validator step).
- **Command:** `npm run assets:validate`
- **Pass/fail:** exits non-zero on any budget breach or spec-invalid asset.
- **Generates:** pass/fail manifest feeding promote.

### 5.4 `scripts/render-asset-gallery.mjs`
- **Inputs:** optimized candidates.
- **Outputs:** a static gallery served at `/#asset-gallery` (a dev-only route that loads each candidate on a turntable), consumed by the proof step.
- **Packages:** none new (uses the existing Three.js runtime + a minimal gallery scene).
- **Command:** `npm run assets:gallery` (builds the route) — captured by §5.5.
- **Pass/fail:** n/a (render target); blank-canvas check happens in proof.

### 5.5 `scripts/capture-race-proof.mjs`
- **Inputs:** built preview server (`vite preview` after `npm run build`), routes `/#race-3d-spike`, `/#race`, `/#asset-gallery`.
- **Outputs:** `asset-pipeline/proof/<timestamp>/` — desktop PNG (1365×768), mobile PNG (390×844), 10 s desktop WebM, 10 s mobile WebM, gallery PNG.
- **Packages:** `playwright` (already present **[repo]**), `pngjs` (already present **[repo]**).
- **Command:** `npm run assets:proof`
- **Pass/fail:** fails on blank/near-uniform canvas, missing `[data-race-renderer="three-kart"]`, or `fpsEstimate < 34` (reuses your spike-test thresholds).
- **Generates:** evidence folder + `proof-index.json`.

### 5.6 `scripts/compare-race-visuals.mjs`
- **Inputs:** proof PNGs + V2 trait cards in `src/assets/game/art-direction/v2/`.
- **Outputs:** a contact sheet (candidate render beside its reference card) + a mean-difference report.
- **Packages:** `pngjs` (present), `sharp` (for compositing the sheet).
- **Command:** `npm run assets:compare`
- **Pass/fail:** soft gate — mean-difference threshold flags drift for human review (extends your existing `visual-reference-checks.mjs` pattern **[repo]**). Not a hard auto-fail (art is subjective).
- **Generates:** `contact-sheet.png`, `visual-diff.json`.

### 5.7 `scripts/promote-approved-assets.mjs`
- **Inputs:** validate pass-manifest + (optional) human approval flag.
- **Outputs:** copies approved GLBs to `src/assets/game/models/...`; rewrites `src/assets/game/asset-manifest.json` (source, license, role, byte budget, fallback, optimize stats, proof artifact ref).
- **Packages:** none new.
- **Command:** `npm run assets:promote -- --approve`
- **Pass/fail:** refuses to promote any asset not present in the validate pass-manifest; refuses if manifest write would orphan a runtime import.
- **Generates:** updated runtime assets + manifest + a `CHANGELOG` line.

`package.json` additions:
```json
{
  "assets:audit":   "node scripts/audit-game-assets.mjs",
  "assets:optimize":"node scripts/optimize-game-glbs.mjs",
  "assets:validate":"node scripts/validate-game-assets.mjs",
  "assets:gallery": "node scripts/render-asset-gallery.mjs",
  "assets:proof":   "node scripts/capture-race-proof.mjs",
  "assets:compare": "node scripts/compare-race-visuals.mjs",
  "assets:promote": "node scripts/promote-approved-assets.mjs",
  "assets:all":     "npm run assets:audit && npm run assets:optimize && npm run assets:validate"
}
```

---

## 6. File Structure

New top-level pipeline workspace (kept **out** of `src/` so working files never ship):

```
asset-pipeline/
  raw/                      # immutable copies of Tripo GLB + source PNG (drop zone)
    karts/  characters/  props/  items/  track/
  optimized/                # candidates produced by optimize stage
    karts/  characters/  props/  items/  track/
  rejected/                 # validate failures + reason.txt
  audit/                    # audit-report.json / .md
  proof/<timestamp>/        # Playwright screenshots, WebM, gallery, contact sheet
  config/
    asset-classes.json      # name → class → simplify/texture/budget overrides
  README.md
scripts/
  lib/asset-pipeline.mjs    # shared IO + budgets + class inference
  audit-game-assets.mjs
  optimize-game-glbs.mjs
  validate-game-assets.mjs
  render-asset-gallery.mjs
  capture-race-proof.mjs
  compare-race-visuals.mjs
  promote-approved-assets.mjs
```

Runtime targets (existing, written to by promote) **[repo]**:
```
src/assets/game/models/avatars/*.glb
src/assets/game/models/tripo/*.glb
src/assets/game/asset-manifest.json
```

Rationale: `raw/` is your single source of truth and is never mutated; everything downstream is reproducible from it. `proof/` is your audit trail for promotion decisions. Only `promote` ever writes into `src/`.

---

## 7. Runtime Integration

No mechanics change. Integration points **[repo]**:

- **`src/game/ComebackCityThreeKartRace.jsx`** — already imports optimized avatar + Tripo kart GLBs and constructs the loader. Add (once) the meshopt decoder:
  ```js
  import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
  loader.setMeshoptDecoder(MeshoptDecoder); // before .load() — sourced
  ```
  If/when you enable KTX2 (Phase 2), additionally:
  ```js
  import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
  const ktx2 = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer);
  loader.setKTX2Loader(ktx2); // must be set before loading KTX2 textures — sourced
  ```
  (Copy `three/examples/jsm/libs/basis/` into `public/basis/` so Vite serves it.) **[judgment]**

- **`src/game/race/render/*`** — `createKartModel.js` / `createRaceVehicles.js` keep consuming GLBs by path; only the *files* improve. Keep the existing yaw corrections (Tripo rigs face +X → `yaw = -π/2`; Kenney faces −Z → `yaw = π`) **[repo]**. The pipeline must **not** re-orient meshes; orientation stays a runtime concern so the data model is stable. Preserve `?kenneyKart=1` and `?bakedSpike=1` A/B switches.

- **`src/game/race/tracks/*`** — unaffected by this report; track *visuals* are Report 2. Track data stays pure/Node-importable so QA scripts keep working.

- **`src/assets/game/asset-manifest.json`** — becomes the contract. `promote` writes, per asset: `source`, `license`, `role`, `sizeBudgetBytes`, `actualBytes`, `triangles`, `fallback`, `optimizedFrom`, `proofRef`. Runtime and CI both read it; the manifest gate (§9) fails if a promoted file's actual stats violate its recorded budget.

---

## 8. Visual Proof (Playwright)

Extends your working `kart-3d-spike-test.mjs` pattern (build → `vite preview` → navigate → assert telemetry → screenshot/WebM) **[repo]**. Artifacts per run, written to `asset-pipeline/proof/<timestamp>/`:

| Artifact | Spec | Pass condition |
|---|---|---|
| Desktop still | `/#race` @ 1365×768 | non-blank canvas; `data-race-renderer="three-kart"` present |
| Mobile still | `/#race` @ 390×844 | non-blank; stable framing (kart in frame) |
| Desktop video | 10 s WebM @ 1365×768 | start vs. mid frame differ (motion proven) |
| Mobile video | 10 s WebM @ 390×844 | motion proven |
| Asset gallery | `/#asset-gallery` desktop | every candidate renders, none blank |
| Contact sheet | candidate vs. V2 card | mean-diff under review threshold (soft) |

Blank-canvas detection: sample the WebGL canvas pixels (you already use `pngjs` + `preserveDrawingBuffer:false`, so read via `page.screenshot` of the canvas element, not `toDataURL`). Fallback detection: assert **zero** Pixi canvases, **zero** legacy arcade canvases, **exactly one** three-kart canvas, `propCount >= 20`, and `visualAssetSet === "comeback-city-v2-three-runtime"` — all already in your spike test **[repo]**.

Video capture in Playwright is configured at the browser-context level (`recordVideo`), so wrap the proof navigation in a context that records, then trim/keep the 10 s window. Verify the exact `recordVideo` option names against current Playwright docs at build time (§11).

---

## 9. CI Gates

Wire into the gates you already run **[repo]**, in this order. Earlier = cheaper = fails faster.

```
1. npm run assets:audit -- --strict     # promoted assets within budget        (NEW)
2. npm run build                          # app + assets build
3. npm run test:bundle                    # JS bundle + asset payload budgets    [repo]
4. npm run test:webgl                     # WebGL context smoke                  [repo]
5. npm run test:kart-proof                # static guard                        [repo]
6. npm run test:kart-playable             # playability proof                    [repo]
7. npm run test:visual                    # visual reference checks              [repo]
8. npm run test:kart-3d-spike             # 3D spike + FPS≥34 + non-blank        [repo]
9. npm run assets:validate                # optimized-asset budget/spec gate     (NEW)
10. (manifest gate) promoted stats == manifest budgets                          (NEW)
```

The three NEW gates reuse the shared budget table in `scripts/lib/asset-pipeline.mjs`, so a budget change is a one-file edit. Don't duplicate thresholds across scripts.

---

## 10. Implementation Phases

Sized so a coding agent ships each in one focused session.

- **P1 — Inventory + manifest contract.** Create `asset-pipeline/` tree; copy raw Tripo GLBs into `raw/`; write `audit-game-assets.mjs` + `lib/asset-pipeline.mjs`; emit first audit report; define manifest schema. *Exit:* `npm run assets:audit` prints stats for all current assets.
- **P2 — Optimizer.** Implement `optimize-game-glbs.mjs` (the §5.2 core) + `validate-game-assets.mjs`. Re-optimize the two over-budget penguins as the proof case. *Exit:* every candidate passes §4.2; before/after log shows the penguins down from ~100k to ≤25k tris.
- **P3 — Gallery + proof.** `render-asset-gallery.mjs` + `/#asset-gallery` route; `capture-race-proof.mjs`; `compare-race-visuals.mjs`. *Exit:* one proof folder with stills, two WebMs, gallery, contact sheet; blank/fallback checks pass.
- **P4 — Promote + manifest gate.** `promote-approved-assets.mjs`; manifest rewrite; CI manifest gate. *Exit:* promoting a candidate updates `src/` + manifest and the existing race route still passes `test:kart-3d-spike`.
- **P5 — Wire all gates + docs.** Add NEW gates to CI sequence; `asset-pipeline/README.md` runbook. *Exit:* `npm run assets:all` + full test suite green on a clean checkout.

---

## 11. Risks & Decisions

Open questions for you (only what blocks implementation):

1. **Meshopt vs. KTX2 timing.** Recommend meshopt-geometry + WebP-texture now, KTX2 later. Confirm, or do you want KTX2/ETC1S in P2 (adds the Basis transcoder to `public/` and the `detectSupport` wiring)?
2. **Rival instancing.** Do rivals reuse one kart mesh (best for draw calls; collapses to 1 `InstancedMesh`) or does each rival need a visually distinct kart from the V2 rival cards? This changes the rival budget (18k each vs. one shared mesh) and the scene draw-call ceiling.
3. **Promotion approval.** Fully automated promotion on green gates, or require a manual `--approve` flag after you eyeball the contact sheet? (I default to manual for art, auto for everything else.)
4. **Character LOD.** Two of your penguins are 88k–100k tris. Re-optimize in place to ≤25k, or keep a high-poly "hero/select-screen" variant and a low-poly "race" variant? (Recommend single ≤25k for race; reuse the existing select-screen PNGs for the menu, so no high-poly GLB needed.)
5. **Texture floor.** Is 512² acceptable for characters/karts in the N64-era-with-polish target, or do you want 1024² held for the hero kart specifically? (512² roughly halves VRAM.)

Risks to manage:

- **Over-simplification artifacts** on organic characters (penguins/bunny) — `simplify` can collapse fingers/beaks. Mitigation: per-asset ratio override in `config/asset-classes.json` + the contact-sheet gate catches it visually before promote.
- **`optimize` CLI surprises** (uv1 stripping, aggressive join) — mitigated by using the functional API with `prune({keepAttributes:true})` and explicit `join`. **[sourced]**
- **Meshopt write helper signature drift** in `@gltf-transform/functions` — verify the current meshopt application step at build time; the CLI `gltf-transform meshopt` path is the stable fallback.
- **Decoder path under Vite** — `meshopt_decoder.module.js` imports cleanly from the `three` package; KTX2 Basis transcoder needs files served from `public/`. Test both in `vite preview`, not just `vite dev`.
- **glTF-Transform licensing** — MIT; free for commercial use, with sponsorship requested for for-profit projects. No license blocker for CRRT. **[sourced]**

---

## 12. Sources

- glTF-Transform — CLI command reference: https://gltf-transform.dev/cli
- glTF-Transform — Functions package & API (transform chain, `textureCompress`, MIT license): https://github.com/donmccurdy/glTF-Transform
- glTF-Transform — CLI package (Draco/meshopt/KTX2/WebP/resize commands): https://www.npmjs.com/package/@gltf-transform/cli
- glTF-Transform — CHANGELOG (vertex-count helpers, `prune` `keepExtras`, simplify via meshoptimizer): https://github.com/donmccurdy/glTF-Transform/blob/main/CHANGELOG.md
- glTF-Transform — `optimize` internals / `prune({keepAttributes:false})` UV stripping: https://github.com/donmccurdy/glTF-Transform/discussions/1296
- glTF-Transform — `weld` + `simplify` ordering and parameters: https://github.com/donmccurdy/glTF-Transform/discussions/1658
- meshoptimizer / gltfpack — `EXT_meshopt_compression`, three.js r122+ `setMeshoptDecoder`, `-cf` fallback buffers: https://meshoptimizer.org/gltf/
- three.js — GLTFLoader docs: https://threejs.org/docs/#examples/en/loaders/GLTFLoader
- three.js — KTX2Loader docs (`setTranscoderPath`, `detectSupport`): https://threejs.org/docs/#examples/en/loaders/KTX2Loader
- Unreal Engine 5.8 — first-party MCP plugin (referenced for Report 2): https://dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor

---

*End of Report 1. Next: Report 2 — Track Production, Visual Direction, and Unreal MCP Look-Dev.*


---

# Claude Report 2 - Track Visual Unreal MCP

# Comeback City - Research Report 2: Track Production, Visual Direction & Unreal MCP Look-Dev

_Source: Claude report two pasted by owner. Raw attachment preserved at `docs/research/claude-report-2-track-visual-unreal-mcp.raw.txt`._


**Stage 2 of 3.** Scope: how to build visually strong tracks for the existing data-driven Three.js race runtime, how to translate the V2 art cards into runtime choices, and where (if anywhere) Unreal Engine 5.8 MCP earns a place. Companion deliverables: Report 1 (asset pipeline) and the Pro synthesis (Codex build brief).

Date context: 2026-06-17. Tool/licensing claims verified against current primary docs at research time (see §13).

Tags as in Report 1: **[sourced]** / **[repo]** / **[judgment]**.

---

## 1. Executive Recommendation

**Build tracks as data-driven definitions + a procedural Three.js "track kit," and use Blender-authored GLBs surgically for hero set-pieces. Treat Unreal MCP as an optional, evidence-gated reference lab that is not in the critical path.** [judgment]

The reasoning is concrete and specific to this game:

- Your art target — low-poly, glossy/toy-like, chunky silhouettes, N64-era readability with modern polish, saturated clean color **[repo]** — is exactly what procedural Three.js geometry plus a tiny authored prop kit produces best and cheapest. It does *not* need Nanite-class geometry density or Lumen GI.
- Your repo already has the data-driven track spine (`tracks/*.js`, `buildCenterline.js`, `trackGeometry.js`) and procedural visual generation (`createTrackMesh.js`, `createRaceScene.js`) **[repo]**. The job is to extend, not replace.
- **Unreal's marginal visual gains mostly don't survive export to the web.** Unreal ships an in-engine glTF exporter (since 5.1) that handles static/skeletal meshes, animation, levels, and materials with baked textures **[sourced]**, but material baking/expression matching isn't available at runtime and requires hand-built glTF *proxy* materials **[sourced]**, and Nanite/Lumen are engine-internal rendering systems that have no Three.js equivalent. So you'd export simplified static meshes + baked textures at best — something Blender does more directly and for free.
- Running UE 5.8 (whose MCP is a first-party but **experimental, incomplete, API-unstable** plugin **[sourced]**) on your 24 GB M4 Mac Mini **[repo]** is a poor cost/benefit for a solo operator versus Blender + Three.js.

So: **Blender is the authoring workhorse, Three.js is the renderer, Unreal is a curiosity you keep at arm's length** until it proves a specific, hard-to-get-otherwise win (§7).

---

## 2. Track Authoring Strategy

| Option | Effort | Visual ceiling | Determinism | Web fit | Verdict |
|---|---|---|---|---|---|
| Pure JS/JSON definitions | Low | n/a (data only) | Total | Native | **Spine — keep & extend** |
| Procedural Three.js mesh gen | Med | High for this style | Total | Native | **Primary visual generator** |
| Modular track-kit pieces | Med | High | Total | Native | **Primary — code kit + a few GLBs** |
| Blender-authored GLB segments | Med-High | Very high | High (static) | Native after optimize | **Surgical — hero set-pieces only** |
| Unreal look-dev → export to Three.js | High | High in UE, **lossy to web** | Low | Poor (proxy mats, no Lumen/Nanite) | **Optional reference lab only** |

Key distinctions:

- **Determinism lives in data, visuals live in meshes.** Collision/progress (centerline, width, surface bands, lap logic) must stay pure data so your Node QA scripts keep importing tracks headlessly **[repo]**. Visual richness is layered on top and never feeds back into collision.
- **Procedural vs. authored is a per-element decision, not a whole-track decision.** Road ribbons, curbs, barriers, lane markings, boost pads, ramps → procedural from data (cheap, instant iteration, deterministic). District facades, finish gate, signature hero props → authored GLB (where silhouette/detail matters and procedural looks generic).

---

## 3. Recommended Hybrid Workflow

Four layers, built in this order:

```
Layer 0 — TRACK DATA (deterministic, pure JS)
   centerline · width bands · elevation · banking · surface bands
   boost pads · item boxes · finish gate · hazards · lap logic
   → imported by runtime AND by Node QA scripts (unchanged contract)
        │
Layer 1 — PROCEDURAL VISUAL KIT (code-generated Three.js meshes)
   road ribbon · curbs · barriers · rails · lane markings · ramps
   · boost-pad visuals · tunnel/bridge shells
   → generated in createTrackMesh.js from Layer 0 data
        │
Layer 2 — AUTHORED HERO GLBs (Blender → Report 1 optimizer)
   district facades/portals · finish/checkpoint gate · signature props
   → placed at Layer-0 anchor points; procedural box stays as fallback
        │
Layer 3 — VISUAL PROOF GATE (Report 1 harness)
   real-3D / grounded / readable-edge / density / FPS checks
   → must pass before a track route is promoted to /#race
```

Rules:
- **Art cards are the visual source of truth** **[repo]**. Procedural materials and authored GLBs both target the V2 card for their element; the contact-sheet gate (§10) flags drift.
- **Every authored GLB has a procedural fallback** so a failed load degrades, never blanks — matching your existing fallback architecture **[repo]**.
- **No route promotion without proof** **[repo]**.

---

## 4. Track Data Model

Extends your existing fields (`key, name, tagline, course, laps, startOffset, elevation, ramps, shortcut, surfaceBands, breakableObjects, crossers, palette, dressing, budgets`; course has `centerline/minimap path, road ribbons, boost pads, item boxes, district anchors, scenery anchors`) **[repo]**. Additions in **bold**; keep everything pure/serializable so Node imports it.

```js
// track definition (additions in comments)
{
  key, name, tagline,
  laps, startOffset,
  course: {
    centerline,            // [repo] waypoints / minimap path
    roadRibbons,           // [repo]
    boostPads,             // [repo]
    itemBoxes,             // [repo]
    districtAnchors,       // [repo]
    sceneryAnchors,        // [repo]
    // ADD:
    widthBands,            // [{ from, to, halfWidth }] per-segment road width
    banking,               // [{ from, to, rollDeg }] per-segment roll for curves
    finishGate,            // { t, style, kitPiece } placement on centerline
    hazards,               // [{ t, type, params }] (oil, ice patch, mover)
    props,                 // [{ t, offset, kitPiece, glb?, scale, yaw }]
    districtPortals,       // [{ t, district, facadeGlb?, glow }]
    sceneryZones,          // [{ from, to, palette, fogTint, density }]
    cameraHints,           // [{ from, to, fov, height, distance, lookAhead }]
    mobileCropHints        // [{ from, to, fov, height }] mobile-only overrides
  },
  elevation,               // [repo] { from, peak, to } band
  ramps, shortcut,         // [repo]
  surfaceBands,            // [repo] asphalt/ice/snow friction zones
  breakableObjects, crossers, // [repo]
  palette, dressing,       // [repo]
  budgets                  // [repo] { finishSeconds, speedFloor }
}
```

`t` = normalized position along the centerline (0–1), so every placement is resolution-independent and survives centerline edits. `cameraHints`/`mobileCropHints` let the chase camera (§6) tighten on hairpins and widen on straights without per-track camera code.

---

## 5. Modular Track Kit

Each piece is parameterized off Layer-0 data. "Source" column = how it's built first.

| Piece | Source | Key params | Collision note |
|---|---|---|---|
| Straight | Procedural | length, halfWidth | from width band |
| Left / Right curve | Procedural | radius, arc, banking | centerline + roll |
| S-curve | Procedural | composed curves | centerline |
| Ramp up / down | Procedural | rise, run | elevation band drives physics |
| Tunnel approach | Procedural | shell radius, length | visual only; road collides |
| Bridge / overpass | Procedural | span, pier spacing | elevation band (you already have `peak`) |
| Curb sections | Procedural | profile, contrast color | non-collide trim (visual edge) |
| Barriers | Procedural | height, repeat | collide (wall contact telemetry exists) |
| Rails | Procedural | post spacing | optional collide |
| Lane markings | Procedural | dash len/gap, color | non-collide decal |
| Boost pad | Procedural | size, emissive, pulse | trigger volume (boost telemetry exists) |
| Item box | Procedural **or** Kenney GLB | spin, bob | trigger volume |
| Finish / checkpoint gate | **Authored GLB** | width, banner | trigger plane |
| District facade / portal | **Authored GLB** | district id, glow | non-collide backdrop |
| Signature hero prop | **Authored GLB** | per-prop | non-collide or box-collide |

First implementation scope: ship the **procedural** pieces first (they cover ~80% of the visible track and need no art pipeline), then add the three **authored** classes via Blender once the procedural kit passes proof.

---

## 6. Visual Style Translation (V2 cards → runtime)

Anchor on your existing renderer config — ACES filmic tonemapping at exposure 1.2, sRGB output, hemisphere + sun + rim lights, fog 210/580, render scale 0.58 desktop / 0.6 mobile, DPR cap 2, shadows off for performance **[repo]**. Translate the V2 language onto that base:

| V2 trait | Three.js recipe |
|---|---|
| Glossy toy-like materials | `MeshStandardMaterial`, roughness 0.2–0.4, metalness 0.0–0.3, **a shared environment map** for the "clearcoat sheen" (cheap, big payoff with shadows off) |
| Chunky silhouettes, N64 readability | low-poly beveled forms + **rim light** to pop the silhouette against fog; avoid micro-detail that reads as noise at mobile scale |
| Saturated clean color | sRGB + ACES (you have it); keep AO subtle so colors stay clean, not muddy; per-district `palette` from data |
| Neon accents | **emissive materials + a bloom pass** (selective bloom on boost pads, portals, finish gate) |
| Asphalt | dark low-roughness base + faint normal/tiling; lane markings as bright decals |
| Curb / rubber | high-contrast curb color; rubber barriers slightly rougher than karts |
| Portal glow / fire | emissive + bloom; animate intensity for life |
| Foliage / barriers | flat-shaded low-poly; instanced for density without draw-call cost |
| Chase camera | follow player kart; use `cameraHints` (fov/height/distance/lookAhead) per zone |
| Mobile framing | `mobileCropHints` widen FOV + raise height so the road reads on a 390-wide viewport |

Two style levers that matter most here [judgment]: (1) **a single shared env map** does most of the "premium glossy" work once shadows are off; (2) **selective bloom** is what sells "neon arcade" — keep it on emissive-flagged materials only so the whole scene doesn't wash out. Both are cheap on mobile.

---

## 7. Unreal MCP Optional Lab

### 7.1 What it actually is, today
UE 5.8 ships a **first-party** MCP plugin (engine id `ModelContextProtocol`, friendly name "Unreal MCP") that embeds an MCP server in the editor on `http://127.0.0.1:8000/mcp` and exposes engine functions — spawning actors, configuring lighting, creating material instances, inspecting Slate widgets, running automation tests — as tools any MCP client (Claude Code, Cursor) can call **[sourced]**. It is **experimental**: many features are incomplete and APIs/data formats may change **[sourced]**, and 5.8 itself is a mid-May-2026 preview **[sourced]**. Community alternatives exist (e.g. flopperam hosted MCP for UE 5.5–5.7; a Go-binary `mcp-unreal` using the Remote Control API on port 30010) **[sourced]** but carry the same "AI touching engine internals" risk class **[sourced]**.

### 7.2 Setup (if you try it)
Enable the plugin in Edit > Plugins (it pulls in the Toolset Registry dependency), set Auto-Start in Editor Preferences > Model Context Protocol, run `ModelContextProtocol.GenerateClientConfig` to emit the client config, then launch your MCP agent from the workspace root **[sourced]**. Optionally use the in-editor Terminal plugin to keep the agent in one window **[sourced]**.

### 7.3 What it can usefully do for you
- **Layout blockout:** ask the agent to place blocks/proxy meshes to compose a city/district arrangement quickly, then read back transforms as **reference coordinates** for your Layer-0 `districtAnchors`.
- **Lighting/material mood reference:** stage a lighting setup and **screenshot it** as a visual target to reproduce by hand in Three.js.
- **Static-mesh + baked-texture export:** via the in-engine glTF exporter (Python-scriptable: `unreal.GLTFExporter.export_to_gltf`) **[sourced]** — but only with **pre-baked/proxy materials** **[sourced]**, and the result still goes through the Report 1 optimizer.

### 7.4 What does NOT transfer (the honesty section)
- **Lumen** (real-time GI) — no web equivalent; bake or eyeball only.
- **Nanite** geometry density — UE-internal; doesn't round-trip via glTF well **[sourced]** and Three.js can't render it anyway.
- **Complex material graphs** — collapse to baked textures / proxy materials; you lose the procedural material network **[sourced]**.

### 7.5 The evidence bar before expanding Unreal usage
Adopt Unreal beyond a one-off experiment **only if** it produces, in a timeboxed trial, **a specific reference image or static GLB that measurably improved the Three.js runtime AND could not be gotten faster in Blender or directly in Three.js.** Concretely: one proof-folder comparison where the Unreal-derived asset/reference beats the hand-built version on the contact-sheet gate. Absent that, Unreal stays off the critical path. Given your hardware and solo bandwidth, the honest default is **skip it for v1**.

---

## 8. Blender Optional Workflow (the actual workhorse)

Blender is free, scriptable headless, and exports clean GLBs that feed straight into the Report 1 optimizer. Use it for cleanup *and* hero authoring.

Headless invocation **[sourced]**:
```bash
# macOS executable path
/Applications/Blender.app/Contents/MacOS/Blender -b input.blend \
  --python scripts/blender/export_glb.py -- --out asset-pipeline/raw/...

# or one-liner export
/Applications/Blender.app/Contents/MacOS/Blender -b in.blend \
  --python-expr "import bpy; bpy.ops.export_scene.gltf(filepath='out.glb')"
```

`bpy` ops you'll script **[sourced]**:
- Import source (`bpy.ops.import_scene.gltf` / fbx / obj).
- **Origin correction:** `bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY')` so the Report 1 pipeline and runtime get consistent pivots (your runtime applies yaw fixes by convention **[repo]** — keep pivots predictable so those stay valid).
- **Scale normalize:** set dimensions, then `bpy.ops.object.transform_apply(scale=True)`.
- **Decimate:** add a `DECIMATE` modifier and apply (coarse pass; the Report 1 `simplify` does the precise web-target reduction).
- **Normals / UV / material fixes:** recalc normals, basic UV cleanup, assign a single PBR material to match the toy-like target.
- **Export:** `bpy.ops.export_scene.gltf(filepath=..., export_format='GLB')`.

When to use Blender:
- **Pre-clean Tripo source** (origin/scale/normals) *before* the Report 1 optimizer, so the optimizer only does web reduction.
- **Author hero GLB segments** — district facades, finish gate, signature props — modeled to the V2 cards.
- **Track-segment baking** (optional) if a procedural piece can't hit the look.

Output target: `asset-pipeline/raw/...` → Report 1 audit → optimize → validate → proof → promote. One pipeline, two source origins (Tripo-generated and Blender-authored).

---

## 9. Visual QA Gates (track-specific)

Automatable, layered on Report 1's harness + your telemetry **[repo]**:

| Gate | Check | Signal |
|---|---|---|
| Real 3D geometry | scene is not a flat plane | depth variance in render / non-zero elevation in data |
| Grounded karts | kart Y ≈ road surface Y | telemetry `airborne=false` on flat segments; no float/sink |
| Readable road edge | curb/road contrast present | contact-sheet vs. track card |
| Visible elevation/curve | camera sees non-straight world | start-vs-mid frame differ (you already diff these) |
| Prop density | enough world dressing | `propCount >= 20` (existing gate) |
| District identity | each district visually distinct | gallery render per district |
| No placeholder/fallback | no procedural-box where GLB expected | forbidden-element check (existing pattern) |
| No blank canvas | WebGL canvas non-uniform | pixel-sample (existing) |
| Stable framing | desktop + mobile both readable | stills at 1365×768 and 390×844 |
| FPS | playable | median `fpsEstimate >= 34` (existing gate) |
| Renderer identity | three-kart, not Pixi/legacy | `data-race-renderer="three-kart"`, zero Pixi canvases (existing) |

---

## 10. Evidence Plan

Reuse the Report 1 proof harness; add track-specific artifacts. Per track, per run → `asset-pipeline/proof/<timestamp>/`:

- Desktop still (`/#race` 1365×768) and mobile still (390×844).
- 10 s desktop WebM + 10 s mobile WebM (motion proven via frame diff).
- **Top-down track layout** — orthographic render of centerline + road ribbons + boost/item/finish markers (proves real geometry and lap shape; render headlessly from Layer-0 data).
- **Contact sheet vs. V2 cards** — track/material/prop renders beside their reference cards.
- **Track-module gallery** — each kit piece rendered in isolation on `/#asset-gallery` (or a `/#track-kit` route).

---

## 11. Licensing & Provenance

Record per asset in `asset-manifest.json` (Report 1 §7). Sources and their handling:

| Source | License | Web-shippable? | Manifest fields |
|---|---|---|---|
| Owner-generated Tripo (from your own renders/cards) | Owner-owned | **Yes** | source=tripo, derivedFrom=<card>, license=owner |
| Kenney Toy Car Kit | CC0 | **Yes** | source=kenney, license=CC0 |
| Blender-authored (you) | Owner-owned | **Yes** | source=blender-authored, license=owner |
| Unreal-**rendered** reference image | reference only | n/a (not shipped) | reference asset; you reproduce the look, don't ship their pixels |
| Unreal-**exported** GLB of engine/Fab content | **Epic EULA — verify** | **Often NO** | flag: Epic-licensed content is generally Unreal-only; do not ship to a web runtime without confirming the specific asset's license |
| Third-party textures / HDRIs / plugins | varies | verify each | record source URL + license + seat |

**The real trap** [judgment]: Epic/Fab/Quixel content is typically licensed for use *within Unreal Engine projects*. Exporting such an asset as GLB into a non-Unreal web game can breach the license. **Owner-generated and CC0 are clean; Epic-sourced art is not freely portable.** Using an Unreal *render* as a visual *target* you reproduce by hand is fine — shipping their actual meshes/textures is not. Verify any specific asset's terms before promotion.

---

## 12. Implementation Roadmap

- **T1 — Track-kit schema.** Extend the track data model (§4) with `widthBands`, `banking`, `finishGate`, `hazards`, `props`, `districtPortals`, `sceneryZones`, `cameraHints`, `mobileCropHints`. Keep Node-importable; existing QA scripts still pass. *Exit:* both existing tracks load with the new fields (defaulted).
- **T2 — First procedural visual kit.** Implement the procedural pieces (§5) in `createTrackMesh.js` driven by the new fields: width bands, banking, curbs, barriers, lane markings, boost-pad visuals, ramps, bridge/tunnel shells. *Exit:* `comeback-city` renders with real width/banking/curbs and passes the §9 gates.
- **T3 — First authored hero segment.** In Blender, author one district facade or the finish gate to its V2 card; run it through the Report 1 optimizer; place it at its Layer-0 anchor with procedural fallback. *Exit:* authored GLB renders grounded with the procedural box as fallback.
- **T4 — First proof route.** Add `/#track-kit` (and reuse `/#asset-gallery`) for module/track review. *Exit:* gallery renders every kit piece, none blank.
- **T5 — Screenshot/video gate.** Wire the §10 evidence into the Report 1 proof script (add the top-down layout render). *Exit:* one proof folder with stills, two WebMs, top-down layout, contact sheet.
- **T6 — Optional Unreal MCP lab (only if pursued).** Timeboxed trial against the §7.5 evidence bar. *Exit:* either a proof-folder win that justifies it, or a written "not worth it for v1" and move on.
- **T7 — Route promotion.** Promote the improved track to `/#race` only after all gates pass **[repo]**. *Exit:* `test:kart-3d-spike` green on the new visuals.

---

## 13. Sources

- Unreal Engine 5.8 — first-party MCP plugin (setup, `127.0.0.1:8000/mcp`, exposed tools, experimental status): https://dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor
- Unreal Engine — glTF Exporter (in-engine since 5.1; meshes/materials/levels): https://dev.epicgames.com/documentation/en-us/unreal-engine/exporting-unreal-engine-content-to-gltf
- Unreal Engine — How the glTF Exporter handles content (special considerations): https://dev.epicgames.com/documentation/en-us/unreal-engine/how-the-gltf-exporter-handles-unreal-engine-content
- Unreal Engine — Scripting glTF exports (Python `GLTFExporter.export_to_gltf`; runtime needs proxy materials): https://dev.epicgames.com/documentation/unreal-engine/scripting-gltf-exports-in-unreal-engine
- Blender — Command-line arguments (`-b`, `--python`, `--python-expr`): https://docs.blender.org/manual/en/latest/advanced/command_line/arguments.html
- Blender — `bpy.ops.export_scene.gltf` parameters: https://docs.blender.org/api/current/bpy.ops.export_scene.html
- Khronos — Blender glTF converter (headless CLI pattern): https://github.khronos.org/glTF-Tutorials/BlenderGltfConverter/
- three.js — GLTFLoader / KTX2Loader (runtime decode; Report 1 §12 for full list): https://threejs.org/docs/#examples/en/loaders/GLTFLoader
- (Report 1 §12 covers glTF-Transform and meshopt sources used by the shared pipeline.)

---

*End of Report 2. Next: Pro Synthesis — combine Reports 1 and 2 into a single Codex implementation brief, resolve conflicts, and list the owner decisions.*


---

# Claude Report 3 - Final Build Plan

# Comeback City - Final Build Plan & Codex Implementation Brief

_Source: Claude stage 3 synthesis report pasted by owner. Raw attachment preserved at `docs/research/claude-report-3-final-build-plan.raw.txt`._

**Stage 3 of 3 (synthesis).** Combines Report 1 (asset pipeline) and Report 2 (tracks + Unreal look-dev) into one chosen workflow, resolves where they diverge, and produces a paste-ready Codex brief. Inputs assumed present: the Shared Repo Context, Report 1, Report 2.

Date context: 2026-06-17. All sourced tool facts are verified in Reports 1–2 §Sources; this document does not re-derive them.

---

## 1. Final Recommendation

**One workflow:** a scripted, file-system-driven asset pipeline (`raw → audit → optimize → validate → proof → promote → manifest`) feeding a Three.js runtime whose tracks are **data-driven definitions + a procedural track kit**, with **Blender-authored GLBs used surgically** for hero set-pieces. Mechanics never change. Unreal MCP is an **optional, evidence-gated reference lab, off the critical path**. Video generation (Seedance) is **deferred until the playable game produces real proof footage**.

**Compression:** meshopt for geometry (decoder ships in three.js, one `setMeshoptDecoder` call), WebP for textures now, KTX2/Basis optional later. **Reduction:** scripted `weld → simplify` via meshoptimizer, using the glTF-Transform JS API (not the one-shot CLI). **Proof:** extend the existing Playwright spike-test harness; nothing reaches `/#race` without passing visual + FPS gates.

### Conflicts between the two reports, resolved
1. **Sequencing — assets first or tracks first?** The two tracks of work are largely independent. The **procedural track kit is pure code and needs no asset pipeline**, so it can proceed in parallel with asset optimization. **Authored hero GLBs depend on the optimizer existing.** Resolution: build the asset pipeline (Phases 1–2) and the track-kit schema + procedural kit (Phase 4) as parallel-eligible work; gate authored track GLBs behind the optimizer. The canonical phase order below interleaves them.
2. **Gallery route naming** — Report 1 proposed `/#asset-gallery`, Report 2 proposed `/#track-kit`. Resolution: **one route, `/#asset-gallery`, with a mode**: `?set=models` (default) and `?set=track`. Less surface area, one capture path.
3. **Blender's role** — Report 1 treated it as optional cleanup; Report 2 as the authoring workhorse. Resolution: **both, and not required for v1.** Blender pre-cleans Tripo source (origin/scale/normals) and authors hero GLBs; the v1 procedural track path ships without it. All Blender output flows into the same Report-1 optimizer.
4. **Rival karts — shared mesh or distinct bodies?** This is the biggest budget-shaping decision (owner decision A below). **Default for v1: rivals reuse one kart mesh via `InstancedMesh`** (collapses N rivals to ~1 draw call). Distinct V2 rival bodies are a later upgrade.

---

## 2. Implementation Brief For Codex

> Build a repeatable Three.js asset-and-track pipeline in the `comeback-tracker` repo **without changing game mechanics**. The runtime (React 18 / Vite 8 / Three.js r184) keeps its existing race mechanics, routes, telemetry, and selectable characters/karts. You are adding: (1) a scripted pipeline that turns raw Tripo/Blender GLBs into optimized runtime GLBs, (2) a data-driven procedural track kit, (3) automated visual proof, and (4) manifest-enforced promotion.
>
> **Hard constraints:**
> - Never modify physics, progress, lap, drift, boost, item, rival, or telemetry logic. Mechanics import only *promoted* assets at existing paths.
> - Never re-orient or re-pivot meshes in the pipeline — orientation stays a runtime concern (Tripo faces +X → runtime yaw −π/2; Kenney faces −Z → runtime yaw π). Keep `?kenneyKart=1` and `?bakedSpike=1` working.
> - Keep all track data pure/serializable so Node QA scripts import it headlessly.
> - Every authored GLB must keep a procedural fallback; a failed load degrades, never blanks.
> - Geometry compression = meshopt; textures = WebP (KTX2 deferred). ESM `.mjs` scripts only.
> - Nothing promotes to `/#race` until the visual + FPS gates pass.
>
> Work phase by phase (§12). Each phase has explicit exit criteria. Start with the First Codex Task (§13).

---

## 3. Final File Structure

```
asset-pipeline/                      # NEW — working area, never shipped in src bundle
  raw/{karts,characters,props,items,track}/      # immutable source (Tripo + Blender)
  optimized/{karts,characters,props,items,track}/ # candidates
  rejected/                          # validate failures + reason.txt
  audit/                             # audit-report.json / .md
  proof/<timestamp>/                 # stills, WebMs, top-down layout, contact sheet
  config/asset-classes.json          # name → class → simplify/texture/budget overrides
  README.md
scripts/                             # NEW scripts alongside existing harness
  lib/asset-pipeline.mjs             # shared IO + budget tables + class inference (single source of truth)
  blender/export_glb.py              # headless Blender clean/export (optional path)
  audit-game-assets.mjs
  optimize-game-glbs.mjs
  validate-game-assets.mjs
  render-asset-gallery.mjs
  capture-race-proof.mjs
  compare-race-visuals.mjs
  promote-approved-assets.mjs
src/                                 # MODIFY (additively)
  game/ComebackCityThreeKartRace.jsx # add setMeshoptDecoder once
  game/race/render/createTrackMesh.js # procedural track kit (data-driven)
  game/race/tracks/*.js              # extended track data model (new fields, defaulted)
  assets/game/asset-manifest.json    # promote rewrites provenance/budget/fallback
  assets/game/models/**              # promote target (optimized GLBs land here)
  # NEW route: /#asset-gallery?set=models|track (dev/proof only)
```

Only `promote-approved-assets.mjs` ever writes into `src/`.

---

## 4. NPM Scripts

Add to `package.json` (existing scripts untouched):

```json
{
  "assets:audit":    "node scripts/audit-game-assets.mjs",
  "assets:optimize": "node scripts/optimize-game-glbs.mjs",
  "assets:validate": "node scripts/validate-game-assets.mjs",
  "assets:gallery":  "node scripts/render-asset-gallery.mjs",
  "assets:proof":    "node scripts/capture-race-proof.mjs",
  "assets:compare":  "node scripts/compare-race-visuals.mjs",
  "assets:promote":  "node scripts/promote-approved-assets.mjs",
  "assets:all":      "npm run assets:audit && npm run assets:optimize && npm run assets:validate"
}
```

Dev dependencies to add: `@gltf-transform/core`, `@gltf-transform/functions`, `@gltf-transform/extensions`, `meshoptimizer`, `sharp`. Optional: `@gltf-transform/cli` (ad-hoc inspection), `draco3dgltf` (only if Draco fallback is ever enabled).

---

## 5. Automation Scripts

Shared module `scripts/lib/asset-pipeline.mjs` holds the glTF-Transform `NodeIO` setup, class inference, and the budget table (§6) — every script imports budgets from here; never duplicate thresholds.

| Script | Purpose | Inputs | Outputs | Packages | Pass/fail | First scope |
|---|---|---|---|---|---|---|
| `audit-game-assets.mjs` | Measure + classify + flag | `raw/**`, current `src/.../models/**` | `audit/audit-report.{json,md}` | core, functions | non-blocking; `--strict` fails if a *promoted* asset breaks budget | stats + flags for all current assets |
| `optimize-game-glbs.mjs` | weld→simplify→join→prune→texWebP→reorder→meshopt write | `raw/**.glb` + class config | `optimized/<class>/*.glb` + `optimize-log.json` | core, functions, meshoptimizer, sharp | fails if output > class budget or spec-invalid | single-mesh single-texture Tripo assets; re-optimize the 2 over-budget penguins first |
| `validate-game-assets.mjs` | Budget + glTF-spec gate | `optimized/**` | `validate-report.json`; failures → `rejected/` + `reason.txt` | core, functions | non-zero on any breach | budget table assertions + validate |
| `render-asset-gallery.mjs` | Build `/#asset-gallery?set=` route data | optimized candidates / track kit | gallery route payload | (none new) | n/a (render target) | models set first, track set second |
| `capture-race-proof.mjs` | Playwright stills + WebM + gallery + top-down layout | built `vite preview`; routes `/#race`, `/#race-3d-spike`, `/#asset-gallery` | `proof/<ts>/` artifacts + `proof-index.json` | playwright, pngjs | fails on blank canvas, missing three-kart, `fpsEstimate<34` | reuse spike-test thresholds; add top-down layout render |
| `compare-race-visuals.mjs` | Contact sheet vs V2 cards | proof PNGs + `art-direction/v2/*` | `contact-sheet.png`, `visual-diff.json` | pngjs, sharp | soft gate (flags drift for review) | extend existing `visual-reference-checks.mjs` pattern |
| `promote-approved-assets.mjs` | Copy to `src/`, rewrite manifest | validate pass-manifest + `--approve` | updated `src/.../models/**` + `asset-manifest.json` + CHANGELOG line | (none new) | refuses unvalidated assets; refuses orphaning a runtime import | manual `--approve` default |

Optimizer core (the load-bearing script) — first implementation:

```js
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, simplify, join, prune, textureCompress, reorder }
  from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

export async function optimizeAsset(inPath, outPath, cfg) {
  const doc = await io.read(inPath);
  await doc.transform(
    dedup(),
    weld({ tolerance: 0.0001 }),
    simplify({ simplifier: MeshoptSimplifier, ratio: cfg.ratio, error: cfg.error }),
    join({ keepNamed: cfg.keepNamed ?? false }),
    prune({ keepAttributes: true }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [cfg.tex, cfg.tex] }),
    reorder({ encoder: MeshoptEncoder }),
  );
  await io.write(outPath, doc); // meshopt extension enabled via registered extensions
}
```

Per-class `cfg` from the budget table. Verify the current `@gltf-transform/functions` meshopt write helper signature at build time; the CLI `gltf-transform meshopt in out --level medium` is the stable fallback.

---

## 6. Asset Budgets (final)

**Source acceptance (flag for mandatory optimization, not rejection):** > 8 MB **OR** > 150k triangles **OR** texture > 2048² **OR** > 1 material with no atlas plan. (All Tripo exports trip this — expected.)

**Optimized acceptance (promotion gate):**

| Class | Triangles max | File size max | Texture max | Draw calls |
|---|---|---|---|---|
| Hero kart | 25k | 1.2 MB | 1024² | 1–2 |
| Rival kart | 18k | 0.8 MB | 1024² (shared) | 1 |
| Seated character | 25k | 1.0 MB | 1024² | 1–2 |
| Simple prop | 1.5k | 0.10 MB | 256² | 1 |
| Complex prop / facade | 8k | 0.50 MB | 512² | 1–3 |
| Item box | 2k | 0.12 MB | 256–512² | 1 |
| Boost pad | 1k | 0.08 MB | 256² + emissive | 1 |
| Track module | 6k | 0.40 MB | 512–1024² | 1–2 |

**Full visible race scene:**

| Metric | Mobile target | Desktop ceiling |
|---|---|---|
| Triangles on screen | ≤ 350k | ≤ 700k |
| Draw calls | ≤ 120 | ≤ 180 |
| GPU texture memory | ≤ 120 MB | ≤ 200 MB |
| Race GLB payload (wire) | ≤ 8 MB | ≤ 12 MB |
| Median FPS | ≥ 34 floor / 50+ target | ≥ 34 floor / 60 target |

**Bundle vs payload:** JS bundle ≤ ~600 KB gzipped; GLBs are runtime-loaded and budgeted as "race payload" above. Don't let GLBs leak into the JS chunk graph.

Anchor reference (proven-good shipping assets): bunny 14.9k tris / 0.55 MB; hero-kart-tripo 23.1k / 1.0 MB. Over-budget today and first to re-optimize: layer23-penguin (~100k / 3.84 MB), mizzle (~88k / 3.38 MB).

---

## 7. Track Workflow (final)

**Track definition schema** = existing fields + additions (normalized `t` ∈ 0–1 positioning): `widthBands`, `banking`, `finishGate`, `hazards`, `props`, `districtPortals`, `sceneryZones`, `cameraHints`, `mobileCropHints`. Pure data; Node-importable; existing QA scripts still pass with fields defaulted.

**Visual module kit** — procedural first (no art pipeline needed): straight, L/R/S curves, ramps, tunnel/bridge shells, curbs, barriers, rails, lane markings, boost-pad visuals. **Authored GLB** (Blender → optimizer): finish/checkpoint gate, district facade/portal, signature hero props. Item box = procedural or Kenney GLB.

**Authored asset integration:** Blender pre-clean (origin/scale/normals/coarse decimate) → `raw/` → Report-1 optimizer → placed at Layer-0 anchors with procedural fallback. One pipeline, two source origins.

**Runtime placement:** `createTrackMesh.js` generates procedural pieces from track data; authored GLBs load at anchor `t` values. Collision/progress stays on the deterministic centerline + width bands — never on the visual mesh.

**Camera/framing proof:** chase camera reads `cameraHints` (fov/height/distance/lookAhead) per zone; `mobileCropHints` widen for 390-wide viewports. Proven by desktop (1365×768) + mobile (390×844) stills and 10 s WebMs in the same proof folder.

**Visual style levers (highest ROI):** one shared environment map for the glossy/premium look (shadows stay off); selective bloom on emissive-flagged materials only for neon-arcade accents. Keep ACES tonemapping at exposure 1.2 and the existing hemisphere/sun/rim lighting.

---

## 8. Visual QA Gates (final, automatable)

In CI order (cheap fails first):

```
1. assets:audit --strict     # promoted assets within budget                (asset audit gate)
2. npm run build
3. test:bundle               # JS bundle + race payload budgets             (bundle gate)
4. test:webgl                # WebGL context smoke
5. test:kart-proof           # static guard
6. test:kart-playable        # playability
7. test:visual               # visual reference checks
8. test:kart-3d-spike        # three-kart renderer + propCount≥20 + FPS≥34 + non-blank
9. assets:validate           # optimized-asset budget + glTF-spec gate      (optimization gate)
10. manifest gate            # promoted stats == manifest budgets           (manifest gate)
11. assets:proof             # stills + WebM + top-down layout (route render + screenshot + video gates)
12. assets:compare           # contact sheet vs V2 cards (visual comparison gate, soft)
```

Track-specific assertions folded into the proof step: real 3D geometry (not flat plane), grounded karts (no float/sink), readable road edge, visible elevation/curve (start-vs-mid frame differ), district identity, no placeholder where GLB expected, stable desktop/mobile framing.

---

## 9. Unreal MCP Role (final)

**Optional reference lab. Off the critical path. Skip for v1 unless it clears the evidence bar.**

- **Use only for:** (a) reference screenshots of a lighting/material mood you then reproduce by hand in Three.js; (b) rapid layout blockout whose actor transforms you read back as `districtAnchors`; (c) at most, static-mesh + baked-texture GLB export with hand-built proxy materials, which still goes through the Report-1 optimizer.
- **Does not transfer to web:** Lumen GI, Nanite geometry, complex material graphs (collapse to baked proxies on export).
- **Evidence bar to expand usage:** in a timeboxed trial, produce one reference or GLB that **beats the hand-built version on the contact-sheet gate** and could not be gotten faster in Blender/Three.js. Otherwise document "not worth it for v1" and move on.
- **Setup if pursued:** enable the UE 5.8 first-party `ModelContextProtocol` plugin, auto-start on `127.0.0.1:8000/mcp`, run `ModelContextProtocol.GenerateClientConfig`, connect Claude Code from the workspace root. Note: experimental, API-unstable; heavy on a 24 GB M4 Mac Mini.
- **Licensing guardrail:** never ship Epic/Fab/Quixel meshes or textures in the web runtime — that content is generally Unreal-only. Reproducing a *look* from an Unreal render is fine; shipping their assets is not. Owner-generated Tripo and Kenney CC0 are clean.

---

## 10. Seedance / Video-Generation Decision

**Defer. Proof comes first.** Video generation becomes useful **only after** a track is promoted to `/#race` and passes every visual + FPS gate, *and* the Playwright-captured 10 s desktop/mobile WebMs prove the playable visuals hold up. At that point Seedance-class tools are for **marketing/trailer/promo** material — not for building or validating the game. Trigger condition to revisit: a green `/#race` proof folder you'd be comfortable putting in front of players. Until then, the real running-game WebMs are the only footage that matters.

---

## 11. Owner Decisions (the only ones that block implementation)

Codex can start Phase 1 without these, but you should answer A–C before Phase 2 completes and D–E before authored assets:

- **A. Rival karts:** shared instanced mesh (default; best draw calls) or distinct V2 rival bodies (higher fidelity, higher budget)? *Recommend shared for v1.*
- **B. Promotion:** auto-promote on green gates, or require manual `--approve` after you eyeball the contact sheet? *Recommend manual for art, auto for everything else.*
- **C. Texture floor:** 512² for characters/karts (halves VRAM) or hold 1024² for the hero kart specifically? *Recommend 512² baseline, 1024² hero only.*
- **D. Character LOD:** re-optimize the two heavy penguins in place to ≤25k (recommended; reuse existing select-screen PNGs for menus), or keep separate high-poly select-screen variants?
- **E. KTX2 timing:** WebP now + KTX2 later (default), or KTX2/Basis in Phase 2 (adds the transcoder to `public/` + `detectSupport` wiring)?

---

## 12. Phase Plan

| Phase | Work | Exit criteria |
|---|---|---|
| **1 — Inventory & manifest** | `asset-pipeline/` tree; copy raw Tripo GLBs into `raw/`; `lib/asset-pipeline.mjs` + `audit-game-assets.mjs`; manifest schema | `npm run assets:audit` prints stats + flags for all current assets |
| **2 — GLB optimization** | `optimize-game-glbs.mjs` (the §5 core) + `validate-game-assets.mjs`; re-optimize the 2 heavy penguins as proof case | every candidate passes §6; log shows penguins ~100k→≤25k tris |
| **3 — Asset preview gallery** | `render-asset-gallery.mjs` + `/#asset-gallery?set=models` route | gallery renders every candidate, none blank |
| **4 — Track-kit schema** *(parallel-eligible with 1–2)* | extend track data model (§7); procedural kit in `createTrackMesh.js` (width bands, banking, curbs, barriers, lane markings, ramps, bridge/tunnel) | `comeback-city` renders real width/banking/curbs; existing QA still passes |
| **5 — First visual proof route** | `?set=track` gallery + first authored hero GLB (finish gate or one facade) via Blender→optimizer, placed with procedural fallback | authored GLB renders grounded; procedural fallback works |
| **6 — Screenshot/video evidence** | `capture-race-proof.mjs` + `compare-race-visuals.mjs`; add top-down layout render; wire gates into CI | one proof folder: stills, 2 WebMs, top-down layout, contact sheet; gates pass |
| **7 — Route promotion** | `promote-approved-assets.mjs` + manifest gate; promote improved assets/track | `test:kart-3d-spike` green on new visuals at `/#race` |
| **8 — Optional Unreal MCP lab** | timeboxed trial against §9 evidence bar | a proof-folder win that justifies it, or a written "skip for v1" |

Phases 1–3 are the asset pipeline; 4–7 the track + proof + promotion; 8 optional. Phase 4 can run alongside 1–2.

---

## 13. First Codex Task (paste this)

> **Task: Phase 1 — asset pipeline inventory + audit + manifest schema.**
>
> Repo: `comeback-tracker` (React 18 / Vite 8 / Three.js r184). Do not change any game mechanics, routes, or telemetry. This phase only adds a working area and an audit script; it does not modify any runtime asset.
>
> 1. Create the `asset-pipeline/` tree: `raw/{karts,characters,props,items,track}/`, `optimized/{karts,characters,props,items,track}/`, `rejected/`, `audit/`, `proof/`, `config/`, and a `README.md` describing the pipeline (`raw → audit → optimize → validate → proof → promote → manifest`).
> 2. Copy the raw Tripo source GLBs from `3d generations:character sheets/` into `asset-pipeline/raw/` under the right class subfolders (karts vs characters vs items). Treat `raw/` as immutable from here on.
> 3. Add dev deps: `@gltf-transform/core`, `@gltf-transform/functions`, `@gltf-transform/extensions`, `meshoptimizer`, `sharp`.
> 4. Create `scripts/lib/asset-pipeline.mjs` exporting: a configured glTF-Transform `NodeIO`; a `classify(filename)` helper (kart/character/prop/item/track); and a `BUDGETS` table matching the optimized-acceptance budgets (hero kart 25k/1.2MB/1024², rival 18k/0.8MB, character 25k/1.0MB, simple prop 1.5k/0.10MB/256², complex prop 8k/0.5MB/512², item 2k/0.12MB, boost pad 1k/0.08MB, track module 6k/0.4MB). This module is the single source of truth for budgets.
> 5. Create `scripts/audit-game-assets.mjs` (ESM). For every GLB in `asset-pipeline/raw/**` and every GLB in `src/assets/game/models/**`, measure: bytes, vertices, triangles, materials, textures, max texture dimension, animation count, bounding box. Use glTF-Transform vertex-count helpers. Classify each asset and attach `flags[]` for source-acceptance breaches (>8MB OR >150k tris OR texture >2048² OR >1 material). Write `asset-pipeline/audit/audit-report.json` and a readable `audit-report.md`. Default exit 0; add a `--strict` flag that exits non-zero if any asset already under `src/.../models/**` exceeds its optimized budget.
> 6. Add `"assets:audit": "node scripts/audit-game-assets.mjs"` to `package.json`.
> 7. Define (in the README and a JSON schema/comment) the per-asset manifest contract that a later promote step will write into `src/assets/game/asset-manifest.json`: `source`, `license`, `role`, `sizeBudgetBytes`, `actualBytes`, `triangles`, `fallback`, `optimizedFrom`, `proofRef`.
>
> **Acceptance:** `npm run assets:audit` runs clean and prints a table of every current asset with its class, size, triangle count, and flags — including the two over-budget penguins (`layer23-penguin` ~100k tris, `mizzle` ~88k tris) and the well-optimized bunny (~15k). No file under `src/` is modified. Report what you created and paste the audit table.
>
> Do **not** start optimization, meshopt, or any GLB rewriting in this task — that is Phase 2.

---

*End of synthesis. Reports 1 and 2 hold the sourced detail behind every decision here. This brief is ready to paste into Codex as the implementation starting point; hand it the First Codex Task (§13) first.*


---

# ChatGPT Technical Risk Audit

# Three.js Asset Pipeline for Comeback City Kart

_Source: ChatGPT deep research report pasted by owner. Raw attachment preserved at `docs/research/chatgpt-deep-research-technical-risk-audit.raw.txt`._

## Executive recommendation

The best first version for Comeback City is a dual-variant glTF pipeline centered on GLB as the runtime container, glTF Transform as the offline optimizer, Meshopt as the default geometry compression, and KTX2/Basis Universal as the default texture compression. In practice, that means every approved asset produces two runtime outputs: a primary asset using EXT_meshopt_compression plus KHR_texture_basisu, and a fallback asset using quantized but uncompressed geometry plus WebP or PNG/JPEG textures. That choice fits browser delivery well because glTF is designed for efficient transmission and loading, GLB keeps the asset self-contained in one binary, Three.js GLTFLoader supports KHR_mesh_quantization, KHR_texture_basisu, KHR_meshopt_compression, EXT_meshopt_compression, and Draco, and Vite’s public directory is the cleanest way to serve exact asset filenames referenced by a JSON manifest. 

For a kart game, Meshopt should be the default geometry path, not Draco. The reason is runtime behavior: glTF Transform documents Meshopt as lightweight, fast to decode, and appropriate for models of any size, while Draco is best reserved for geometry-heavy assets and can lose its advantage on smaller assets because decoder cost may outweigh size savings. That tradeoff matters in a racing game, where visible assets stream in while maintaining responsiveness on mobile hardware. Keep Draco as an opt-in override for unusually large static track modules when download size beats decode latency in your target environment. 

The implementation principle is simple: do not let imported art own gameplay. Preserve the current React/Vite/Three.js race mechanics by keeping collision, lap logic, boosts, checkpoints, input, and item behavior in the existing gameplay files, while moving only the visual surface to manifest-driven GLB assets. That keeps the current race playable even if an asset fails validation or falls back to a simpler visual. Three.js also makes this separation practical because repeated props can be instanced to reduce draw calls, renderer statistics can be sampled through renderer.info, and materials and textures can be explicitly disposed when assets are swapped or unloaded. 

If Blender is part of the source toolchain, keep authoring constraints intentionally narrow for the first shipping version: export Binary .glb, restrict materials to Principled BSDF or Unlit, and use Actions/NLA for any animation that must survive export. Blender’s glTF documentation and API docs explicitly describe GLB export, supported material families, and Actions/NLA animation export. 

Assumptions used in this report: I can see the target file paths you named — src/game/ComebackCityThreeKartRace.jsx, src/game/race/render/*, src/game/race/tracks/*, and src/assets/game/asset-manifest.json — but I could not inspect the current repository contents in this conversation. So the report assumes: the project already runs on React + Vite + Three.js; the existing race is already playable with placeholder or procedural visuals; the listed npm scripts already exist or can be re-wired; and the owner is willing to add build-time asset generation outside the browser runtime. Where those assumptions may be wrong, I call out exact owner questions later in the report.

## Pipeline design

The repeatable path should be:

```text
game-assets/raw
  -> audit
  -> classify
  -> optimize
  -> validate
  -> preview
  -> capture proof
  -> promote
  -> update manifest
  -> consume in runtime
```
That flow matches the strengths of the tooling. glTF Transform provides audit, validation, restructuring, quantization, simplification, texture conversion, and compression tooling; Khronos’s glTF-Validator emits machine-readable JSON reports with both issues and asset stats; Playwright captures screenshots, videos, and visual comparisons; and Vite cleanly serves finalized runtime assets from public while leaving your source manifest in src/assets/game. 

A practical implementation-ready flow for each asset should look like this:

Stage	What happens	Primary tools	Pass condition	Artifacts
Raw source	Artist drops *.glb, source textures, and sidecar metadata	Blender export, file conventions	File opens, naming valid	game-assets/raw/...
Audit	Read file stats, materials, textures, triangles, animations, extensions	inspect, validate, gltf-validator	No fatal parse/spec errors	*.audit.json
Classify	Assign budget class and optimization profile	custom script + metadata	Class known, budget profile attached	asset-audit.json
Optimize	Dedup, prune, weld, join, quantize, simplify, texture compress, geometry compress	glTF Transform API/CLI	Both primary and fallback assets produced	*.primary.glb, *.fallback.glb
Validate	Run spec validation + custom budget checks + manifest schema	gltf-validator, custom checks	Zero errors, zero hard-budget violations	asset-validation.json
Preview	Load assets in the same loader path the game uses	local Vite preview + Three.js	Asset renders, no blank canvas, no runtime loader error	gallery page, thumb PNGs
Capture proof	Desktop/mobile screenshots, videos, gallery shot, diff data	Playwright	Proof artifacts captured and nonblank	proof/...
Promote	Copy approved outputs into runtime folder	Node FS scripts	Only validated assets promoted	public/game/runtime/...
Update manifest	Write URLs, metrics, fallback URLs, revision	JSON generator	Manifest schema valid	src/assets/game/asset-manifest.json

The classification step is not optional. The optimization settings that are correct for a hero kart are wrong for an instanced traffic cone. Put that decision in a sidecar metadata file such as asset.meta.json, living next to the raw asset, with fields like id, kind, budgetClass, compression, allowSimplify, requiredAnchors, proofCamera, collisionSource, and authoringNotes. That gives the scripts a stable way to avoid over-compressing hero assets or under-optimizing repeated props. This is consistent with glTF Transform’s scripting model, which is built around reading a document, applying staged transforms, and writing deterministic outputs. 

## GLB optimization strategy

Use .glb only for runtime delivery. A GLB is a single binary with one buffer, which makes cache handling, copying, manifesting, and Preview/Playwright proofing simpler than multipart .gltf + .bin + textures. For browser delivery in a game repo, that operational simplicity is more valuable than hand-editability. 

The canonical optimization sequence should be:

```bash
# audit
npx gltf-transform inspect input.glb
npx gltf-transform validate input.glb

# structure cleanup
npx gltf-transform dedup input.glb step1.glb
npx gltf-transform prune step1.glb step2.glb
npx gltf-transform weld step2.glb step3.glb
npx gltf-transform reorder step3.glb step4.glb
npx gltf-transform quantize step4.glb step5.glb

# draw-call reduction when safe
npx gltf-transform join step5.glb step6.glb

# lossy reduction only if the class allows it
npx gltf-transform simplify step6.glb step7.glb

# primary runtime variant
npx gltf-transform uastc step7.glb step8.glb \
  --slots "{normalTexture,occlusionTexture,metallicRoughnessTexture}" \
  --level 4 --rdo --rdo-lambda 4 --zstd 18 --verbose
npx gltf-transform etc1s step8.glb primary.glb --quality 255 --verbose
npx gltf-transform meshopt primary.glb primary.glb --level medium

# fallback runtime variant
# do this in the Node API with textureCompress(...slots:/^(?!normalTexture).*$/...)
```
That sequence is grounded in what the official tools actually expose. inspect reports whether the model is geometry-heavy, texture-heavy, or draw-call-heavy. validate checks spec correctness. dedup removes duplicate accessors, textures, materials, and meshes. prune removes unreferenced data. weld merges identical vertices and improves cache efficiency. reorder optimizes locality of reference and is explicitly recommended for Web-oriented transmission size or GPU efficiency. quantize reduces memory footprint with KHR_mesh_quantization. join reduces draw calls. simplify is deliberately lossy and therefore should be conditional on class. resample should also be added whenever an asset contains baked animation. 

For texture handling, use KTX2 in the primary variant and WebP/PNG in the fallback. Khronos’s KHR_texture_basisu extension exists specifically to use KTX2 with Basis Universal supercompression for more efficient transmission and reduced GPU memory footprint, and Three.js requires KTX2Loader to decode those textures. glTF Transform’s own guidance shows a mixed approach: use UASTC for normal and packed data textures, and ETC1S for the rest. That is the right trade for a kart game because normal maps and packed ORM textures are the maps most likely to show block artifacts under aggressive ETC1S compression. 

The default geometry compression should be Meshopt, using meshopt after structure cleanup and before final validation. Meshopt provides very fast runtime decompression and a lightweight decoder, and glTF Transform explicitly notes that compression alone does not improve framerate directly; framerate gains come from reducing vertex count and draw calls with simplification and joining. That is why your pipeline should always combine Meshopt with budget-driven simplification and draw-call reduction, not treat compression as a performance feature by itself. 

Use Draco only as an override, not the default. A reasonable policy is: if raw geometry payload is above roughly 1 MB and the asset is mostly static and rarely hot-swapped, allow compression: "draco" in the asset metadata. glTF Transform documents Draco as especially valuable when geometry dominates file size, but also notes that for geometry smaller than 1 MB the decoder library may outweigh the savings. Three.js supports Draco, but it requires explicit loader wiring and decoder assets. 

The fallback strategy should be a separate GLB, not optional fallback images embedded into the same GLB. The Khronos extension spec allows optional PNG fallback images in the same asset, but glTF Transform’s KHRTextureBasisu docs state that when the extension is added by glTF Transform it should be required, and the tool does not support writing fallback PNG/JPEG data into the same asset. That makes separate primary and fallback GLBs the cleanest and most deterministic implementation in this repo. 

## Budgets and file structure

The following budgets are recommended engineering targets, not official industry standards. They are derived from the constraints official docs emphasize for WebGL apps: keep VRAM under a measured budget, batch draw calls, use mipmaps for 3D textures, use compressed texture formats to reduce GPU memory, and use instancing where repeated meshes share geometry and material. Those principles are what the numbers below are trying to make concrete for a mobile-first browser racer. 

Asset budgets
Asset class	Triangles target	Hard max	Materials / draw calls target	Texture cap	Primary GLB target	Fallback GLB max	Estimated active GPU memory target
Hero kart	12k	18k	1 material / 1–2 calls	1×1024 color, 1×1024 normal, 1×512 ORM	250–450 KB	700 KB	2.5–3.5 MiB
Rival kart	8k	12k	1 material / 1 call	1×1024 color, 1×512 normal/ORM	180–320 KB	500 KB	1.5–2.5 MiB
Seated character	10k	15k	1–2 materials / 1–2 calls	1×1024 color, 1×512 normal, 1×512 ORM	220–420 KB	650 KB	2–3 MiB
Simple prop	300	1k	1 material / 1 call before instancing	1×256 or shared atlas	10–40 KB	80 KB	0.05–0.2 MiB
Complex prop	2k	6k	1 material / 1–2 calls	1×512 color, optional 1×512 ORM	60–180 KB	300 KB	0.5–1.2 MiB
Item box	1k	2k	1 material / 1 call	1×512 color+emissive	40–120 KB	180 KB	0.4–0.9 MiB
Boost pad	500	1.5k	1 material / 1 call	1×256 or 1×512	20–80 KB	120 KB	0.2–0.6 MiB
Track module	10k	25k	1–2 materials / 1–3 calls	1×1024 atlas, optional 1×1024 detail/normal	250–900 KB	1.3 MB	3–6 MiB
Full visible race scene	80k–120k	140k mobile / 220k desktop	60–90 calls mobile / 120 desktop	active unique texture set <= 12 MiB compressed assets	first visible set <= 4.5 MB compressed	<= 7 MB	70–120 MiB total scene budget

For texture dimensions, keep the default ceilings at 256 for tiny props and decals, 512 for most props and interactive pickups, 1024 for hero vehicles and close-view characters, and 2048 only when the track module truly needs an atlas and can prove it in screenshots. A mipmapped 1024² uncompressed RGBA8 texture costs about 5.33 MiB, while a 1024² compressed texture around 4–8 bits per pixel is roughly 0.67–1.33 MiB including mip overhead; the same relationship scales to 2048² textures as roughly 21.33 MiB uncompressed versus 2.67–5.33 MiB compressed. Those latter numbers are an engineering inference based on MDN’s compressed-format memory behavior, MDN’s 30% mip overhead note, and common ETC2/ASTC-class bit rates that KTX2 transcoders target at runtime. 

For bundle budgets, keep asset bytes out of the JS bundle entirely. The race route should lazy-load visual decoders and runtime assets only when the player enters the race. A good first target is: main app JS+CSS <= 320 KB gzip, race-mode async JS <= 450 KB gzip, decoders <= 400 KB compressed and lazy-loaded, and initial race asset payload <= 5 MB compressed on mobile. Those numbers are recommendations based on the fact that Vite treats public assets separately from the source graph, so you can keep the race art payload from inflating initial route JS. 

Recommended file structure
Use exact folders like this:

```text
game-assets/
  raw/
    karts/
    characters/
    props/
    tracks/
  working/
    primary/
    fallback/
    metrics/
  rejected/
  thumbs/
  proof/
    screenshots/
    videos/
    diffs/
    contact-sheets/
    traces/
  manifests/
    asset-audit.json
    asset-validation.json
    asset-gallery.json
    asset-promotion-log.json
  budgets/
    game-asset-budgets.json

public/
  game/
    runtime/
      glb/
        karts/
        characters/
        props/
        tracks/
      decoders/
        basis/
        draco/

src/
  assets/
    game/
      asset-manifest.json
```
Put raw, working, rejected, proof, budgets, and manifests outside src/ so they never enter the app bundle accidentally. Put promoted runtime GLBs and decoder blobs in public/game/runtime, because Vite serves public files at root and copies them to the output directory as-is without transformation. Keep the source-of-truth manifest in src/assets/game/asset-manifest.json, because the app should import that JSON directly and use its public-root-relative URLs like /game/runtime/glb/.... 

Scripts, commands, and dependencies
Install the new toolchain like this:

```bash
npm i -D \
  @gltf-transform/cli \
  @gltf-transform/core \
  @gltf-transform/extensions \
  @gltf-transform/functions \
  gltf-validator \
  sharp \
  meshoptimizer \
  draco3dgltf \
  fast-glob \
  execa \
  zod \
  pngjs \
  pixelmatch \
  wait-on \
  playwright \
  @playwright/test

npx playwright install --with-deps
```
That dependency set directly matches the primary docs: glTF Transform exposes both CLI and scripting APIs; sharp is the recommended image encoder for texture optimization in Node; Playwright’s official install flow downloads browser binaries with npx playwright install --with-deps; and the mesh/Draco packages align with the official glTF Transform scripting examples for Node I/O and compression dependencies. 

These package.json entries are the simplest wiring for the first version:

```json
{
  "scripts": {
    "assets:audit": "node scripts/audit-game-assets.mjs",
    "assets:optimize": "node scripts/optimize-game-glbs.mjs",
    "assets:validate": "node scripts/validate-game-assets.mjs",
    "assets:gallery": "node scripts/render-asset-gallery.mjs",
    "assets:proof": "node scripts/capture-race-proof.mjs",
    "assets:compare": "node scripts/compare-race-visuals.mjs",
    "assets:promote": "node scripts/promote-approved-assets.mjs"
  }
}
```
## Script plan

Script	Inputs	Outputs	Required packages	Command example	Pass / fail criteria	Generated files
scripts/audit-game-assets.mjs	game-assets/raw/**/*.glb, optional asset.meta.json	consolidated audit + per-asset reports	@gltf-transform/core, @gltf-transform/extensions, @gltf-transform/functions, gltf-validator, fast-glob, zod	node scripts/audit-game-assets.mjs --src game-assets/raw --out game-assets/manifests/asset-audit.json	Pass: every file loads, validates, and classifies. Fail: parse errors, spec errors, duplicate IDs, unknown budget class without override.	game-assets/manifests/asset-audit.json, game-assets/manifests/per-asset/*.audit.json
scripts/optimize-game-glbs.mjs	raw assets + audit manifest + budget config	primary and fallback working GLBs + metrics	execa, sharp, meshoptimizer, draco3dgltf, glTF Transform packages, fast-glob	node scripts/optimize-game-glbs.mjs --src game-assets/raw --work game-assets/working --budgets game-assets/budgets/game-asset-budgets.json	Pass: each approved raw asset emits primary and fallback. Fail: missing variant, failed transform, size regression > threshold, hard budget violation.	game-assets/working/primary/**/*.glb, game-assets/working/fallback/**/*.glb, game-assets/working/metrics/*.json
scripts/validate-game-assets.mjs	working GLBs + budget config + audit data	validation summary	gltf-validator, @gltf-transform/functions, zod	node scripts/validate-game-assets.mjs --work game-assets/working --out game-assets/manifests/asset-validation.json	Pass: validator errors = 0, hard budgets = 0, required anchors present, manifest fields resolvable. Fail: any spec error or hard-budget miss.	game-assets/manifests/asset-validation.json
scripts/render-asset-gallery.mjs	validated working assets	thumbnail PNGs + gallery manifest + optional static gallery HTML/JSON	playwright, sharp, fast-glob, wait-on	node scripts/render-asset-gallery.mjs --work game-assets/working --out game-assets/thumbs	Pass: every promoted asset has a nonblank thumb and metadata row. Fail: missing thumbnails, blank renders, loader errors.	game-assets/thumbs/**/*.png, game-assets/manifests/asset-gallery.json
scripts/capture-race-proof.mjs	local preview server + runtime manifest + proof seed	screenshots, videos, trace, metrics	playwright, wait-on, execa	node scripts/capture-race-proof.mjs --url http://127.0.0.1:4173 --seed asset-pipeline	Pass: desktop/mobile screenshots + videos saved, canvas nonblank, race scene renders, proof metrics captured. Fail: blank canvas, console errors, loader errors, unexpected fallback, missing output artifacts.	game-assets/proof/screenshots/*.png, game-assets/proof/videos/*.webm, game-assets/proof/traces/*.zip, game-assets/proof/metrics.json
scripts/compare-race-visuals.mjs	proof screenshots + baseline refs	diffs + contact sheets + summary	pixelmatch, pngjs, sharp, fast-glob	node scripts/compare-race-visuals.mjs --actual game-assets/proof/screenshots --expected tests/visual/references/v2	Pass: diff under configured threshold. Fail: threshold exceeded or baseline missing in strict CI mode.	game-assets/proof/diffs/*.png, game-assets/proof/contact-sheets/*.png, game-assets/proof/visual-compare.json
scripts/promote-approved-assets.mjs	validated working assets + approval manifest	runtime files + updated manifest + promotion log	node:fs/promises, crypto, fast-glob, zod	node scripts/promote-approved-assets.mjs --from game-assets/working --to public/game/runtime --manifest src/assets/game/asset-manifest.json	Pass: only validated assets copied, manifest rewritten atomically, all URLs exist. Fail: promotion without validation, URL mismatch, stale metrics.	public/game/runtime/**, src/assets/game/asset-manifest.json, game-assets/manifests/asset-promotion-log.json

For optimize-game-glbs.mjs, the actual implementation should use both the glTF Transform scripting API and CLI. Use the Node API for audit, custom per-class conditionals, fallback texture conversion with textureCompress, and JSON metrics; use the CLI only for the KTX2/Basis passes where the official tool already exposes uastc, etc1s, and ktxfix commands cleanly. That hybrid approach is more maintainable than trying to force every step through the CLI or every step through raw extension plumbing. 

## Runtime integration and visual proof

src/game/ComebackCityThreeKartRace.jsx should remain the authoritative gameplay orchestrator. Do not replace race logic with artist-authored scene graphs. Instead, introduce a visual asset layer that maps existing gameplay entities to manifest IDs. A kart entity that the game already knows as “player kart” or “rival kart” should gain only a visualAssetId and possibly visualVariant, while physics size, wheelbase, hitbox, boost behavior, slipstream logic, and checkpoint behavior remain in code. This keeps the race mechanics stable while visual assets can iterate independently. 

Inside src/game/race/render/*, add a small loader stack. At minimum, you want: raceAssetRegistry.ts or .js to read the manifest; loadRaceAsset.ts to choose primary vs fallback; cloneRaceAssetScene.ts to return reusable scene instances; and disposeRaceAssetScene.ts to traverse the scene and call dispose() on geometry, materials, and textures when appropriate. This is important because GLTFLoader uses image bitmaps and Three.js docs warn that they are not automatically garbage-collected when no longer referenced; explicit cleanup matters if you swap scenes, re-enter races, or hot-reload in development. 

Inside src/game/race/tracks/*, keep the current track definition authoritative for layout, checkpoints, collision, spline, item spawn points, and boost triggers, but let each module reference a promoted visual asset ID. In other words: the track files become the place where logical track pieces say “use track.module.corner-neon-01 here”, not the place where raw meshes are authored. This lets you preserve today’s race behavior while upgrading scenery piece by piece.

src/assets/game/asset-manifest.json should become a generated file with a schema like this:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-06-17T00:00:00.000Z",
  "runtimeBaseUrl": "/game/runtime",
  "decoders": {
    "basisTranscoderPath": "/game/runtime/decoders/basis/",
    "dracoDecoderPath": "/game/runtime/decoders/draco/"
  },
  "assets": {
    "kart.hero.comeback-city": {
      "kind": "kart",
      "budgetClass": "hero-kart",
      "primary": "/game/runtime/glb/karts/comeback-city.primary.glb",
      "fallback": "/game/runtime/glb/karts/comeback-city.fallback.glb",
      "thumbnail": "/game-assets/thumbs/karts/comeback-city.png",
      "metrics": {
        "triangles": 11842,
        "materials": 1,
        "drawCallsExpected": 1,
        "primaryBytes": 392144,
        "fallbackBytes": 581923
      },
      "anchors": {
        "seat": [0, 0.42, -0.08],
        "frontAxle": [0, 0.18, 0.66],
        "rearAxle": [0, 0.18, -0.61]
      }
    }
  }
}
```
The runtime loader should choose the primary variant whenever KTX2 and the selected geometry codec are available, and otherwise choose fallback. The required Three.js wiring is straightforward and official: GLTFLoader.setKTX2Loader() is required for KTX2, KTX2Loader.detectSupport(renderer) must run before loading textures, GLTFLoader.setMeshoptDecoder() is required for EXT_meshopt_compression, and GLTFLoader.setDRACOLoader() is required only for Draco assets. 

A practical loader skeleton looks like this:

js
Copy
import manifest from '@/assets/game/asset-manifest.json';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';

export function createRaceAssetLoader(renderer) {
  const gltfLoader = new GLTFLoader();

  const ktx2Loader = new KTX2Loader()
    .setTranscoderPath(manifest.decoders.basisTranscoderPath)
    .detectSupport(renderer);

  const dracoLoader = new DRACOLoader()
    .setDecoderPath(manifest.decoders.dracoDecoderPath);

  gltfLoader.setKTX2Loader(ktx2Loader);
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  gltfLoader.setDRACOLoader(dracoLoader);

  function pickVariant(entry) {
    return entry.primary ?? entry.fallback;
  }

  return {
    async load(assetId) {
      const entry = manifest.assets[assetId];
      const url = pickVariant(entry);
      return gltfLoader.loadAsync(url);
    },
    dispose() {
      ktx2Loader.dispose();
      dracoLoader.dispose();
    }
  };
}
To preserve visuals correctly, do not regress Three.js color handling. Current Three.js docs show the renderer’s outputColorSpace default as SRGBColorSpace, and GLTFLoader natively supports the modern glTF material and texture extensions you want to use. Unless your repo is pinned to a much older Three.js release, you should keep that modern color-management path intact rather than manually overriding glTF-loaded texture color spaces. 

## Visual proof workflow

The proof workflow should be automated with Playwright and produce these artifacts on every promoted asset batch:

Artifact	Required viewport / device	What it proves	Implementation note
Desktop screenshot	1440×900 Chromium	primary race scene visually loads	page.screenshot() or toHaveScreenshot()
Mobile screenshot	393×851 mobile emulation	mobile-safe layout and asset readability	Playwright emulation with touch/mobile context
Desktop video	10 seconds	motion, shader stability, streaming, no mid-race blanks	browser context with recordVideo; close context to save
Mobile video	10 seconds	same proof under mobile emulation	same as above with mobile context
Asset gallery screenshot	full-page	every promoted asset renders in browser	one gallery route, full-page screenshot
Contact sheet vs V2 references	static image sheet	easy human review of old vs new look	sharp montage + diff labels
WebGL nonblank checks	JS eval + image histogram	catches “canvas exists but scene never rendered”	inspect renderer.info, canvas pixels, alpha coverage
Fallback detection checks	JS eval + console scan	proves fallback only happens when expected	expose window.__assetPipelineMetrics

Playwright’s official docs cover screenshots, full-page screenshots, stored visual comparisons through toHaveScreenshot(), mobile emulation via device/context options, and test video output. They also recommend using traces on CI retries for debugging. That makes Playwright a good fit not just for proof capture, but for actionable failure artifacts. 

For the nonblank-canvas gate, do two checks. First, inspect runtime counters in the page: renderer.info.render.calls > 0, renderer.info.memory.geometries > 0, and renderer.info.memory.textures > 0. Second, analyze the captured PNG and fail if more than 98% of pixels are the same color or if alpha is effectively zero across the frame. That two-part approach catches both logic bugs and rendering bugs. Three.js exposes the render stats officially through renderer.info, and Playwright provides screenshot buffers for post-processing. 

For the fallback gate, instrument the runtime with a small metrics object such as:

js
Copy
window.__assetPipelineMetrics = {
  usedFallbackAssets: [],
  failedPrimaryAssets: [],
  renderCalls: 0,
  textureCount: 0,
  geometryCount: 0
};
Then make Playwright read it with page.evaluate(). In the normal desktop/mobile proof runs, usedFallbackAssets should be empty. In a dedicated “fallback simulation” run, intentionally disable KTX2 or Meshopt and assert that the fallback assets render correctly instead of failing the scene. That is the simplest way to prove your resilience path actually works.

## CI gates and implementation phases

The existing script names you provided should become hard gates with these behaviors:

Existing command	Gate behavior
npm run build	Must build the app, emit a valid manifest, and confirm that all promoted runtime URLs exist under public/game/runtime.
npm run test:kart-proof	Must run the Playwright proof capture and produce desktop/mobile screenshots, desktop/mobile 10-second videos, metrics JSON, and no blank-canvas failures.
npm run test:kart-playable	Must prove the optimized assets do not break race mechanics: race starts, input or bot controls work, at least one lap/checkpoint flow still completes, and no asset-load error halts play.
npm run test:kart-3d-spike	Must smoke-test GLTFLoader + manifest + decoder integration in isolation on one kart, one track module, one prop, and one fallback path.
npm run test:visual	Must run screenshot comparisons and diff thresholds against the accepted visual baseline.
npm run test:webgl	Must assert WebGL context creation, nonblank rendering, compressed texture support detection, and fallback functioning when codecs are unavailable.
npm run test:bundle	Must assert JS bundle budgets and that runtime art bytes stay out of the initial JS bundle.

The test:visual gate should use toHaveScreenshot() or equivalent pixel diffing for desktop race, mobile race, and asset gallery images. For deterministic results, freeze the race seed, lock the camera path, disable volatile overlays, and if necessary apply a Playwright stylePath to hide transient UI that would otherwise produce meaningless diffs. Playwright documents both snapshot generation/update flow and custom stylePath for determinism. 

The test:webgl gate should include three specific assertions. First, the page must create a WebGL context successfully. Second, it must render at least one frame with nonzero renderer.info stats. Third, it must pass a fallback simulation where KTX2 or Meshopt use is disabled and the scene still renders with fallback assets. That gate matters because official loader docs show KTX2 depends on WebAssembly and detected format support, while compressed texture availability varies by device and browser extensions. 

## Implementation phases

Phase one should add the folder structure, budget config, raw metadata schema, and audit-game-assets.mjs. Do not optimize anything yet. The deliverable is a truthful inventory of what the raw assets contain and which ones can already pass validation. 

Phase two should implement optimize-game-glbs.mjs and validate-game-assets.mjs, producing primary and fallback variants for one hero kart, one rival kart, one seated character, one prop, one boost pad, and one track module. That is the smallest slice that exercises every major budget class. 

Phase three should integrate manifest-driven loading into src/game/ComebackCityThreeKartRace.jsx and src/game/race/render/*, but only swap visuals for one lane of content at a time. Start with the player kart and one track module while leaving everything else on current visuals. That minimizes the blast radius on race mechanics.

Phase four should add Playwright proof capture and visual compare, along with the dedicated proof seed and asset gallery route. Do this before promoting a full art drop, so every future asset batch has machine-verifiable proof from day one. 

Phase five should expand coverage to all track modules and repeated props, add instancing where the renderer path permits it, and enforce the CI hard gates. This is where draw-call and VRAM wins become visible, because repeated scenery is where batching and instancing matter most for a kart game. 

## Risks, decisions, assumptions, and exact owner questions

The highest-risk decisions are these. First, whether you want runtime assets in public/ or hashed imports from src/. This report recommends public/ because the manifest is JSON and Vite explicitly supports exact-path public assets served and copied as-is. Second, whether you want Meshopt-only or Meshopt plus rare Draco overrides. This report recommends Meshopt-first. Third, whether your current gameplay layer derives any behavior from render mesh bounds; if it does, you need to stop doing that before replacing visual meshes wholesale. 

The main technical risks are predictable. Over-compressing hero assets will produce visible surface artifacts; KTX2 without a fallback path will fail on unsupported environments; letting track art define gameplay layout will destabilize racing logic; and not disposing old materials/textures will leak memory across route reloads or repeated sessions. Those are exactly the kinds of issues the primary docs warn about: compressed texture formats vary by platform, KTX2 depends on runtime support detection, and Three.js resources should be explicitly disposed when no longer used. 

## Exact follow-up questions for the owner

What Three.js version is currently pinned in the repo, and does the existing renderer already use the modern outputColorSpace path?
Does src/assets/game/asset-manifest.json already have a schema in production, or can it be replaced outright with a generated schema?
Does the current race logic derive collision, wheel placement, kart size, or checkpoint behavior from visual mesh bounds anywhere in src/game/ComebackCityThreeKartRace.jsx or src/game/race/render/*?
Do src/game/race/tracks/* currently separate collision/layout data from decorative render data, or are those still mixed together?
Are you willing to serve runtime art from public/game/runtime, or do you need transformed and hashed asset URLs from within src/?
Are there already V2 reference screenshots/videos in the repo for the visual comparison gate, or must the first approved run generate them?
Which mobile devices define success for this project: low-end Android, mid-range Android, recent iPhone, or a mixed set?
Is the seated character intended to stay mostly static, or do you need a skinned animated driver in the first version?
Are you willing to ship the Basis and Draco decoder files in public/game/runtime/decoders, or is there an existing asset-hosting constraint?
Do any assets need to remain editable in external DCC tooling after optimization, or can optimized GLBs be treated as strictly generated artifacts?

## Sources

Three.js official docs

GLTFLoader support and loader setup. 
KTX2Loader setup, detectSupport(), transcoder path, and WASM requirement. 
DRACOLoader decoder path and worker controls. 
InstancedMesh draw-call reduction. 
Renderer.outputColorSpace and renderer.info. 
Material.dispose() and Texture.dispose(). 
glTF and Khronos primary docs

glTF overview and positioning as runtime delivery format. 
glTF 2.0 specification. 
KHR_texture_basisu extension spec and fallback examples. 
EXT_meshopt_compression extension spec. 
KHR_draco_mesh_compression extension spec. 
Official glTF Validator. 
glTF Transform official docs

CLI quickstart and command list. 
Scripting API overview and Node examples. 
inspect, dedup, prune, weld, reorder, quantize, simplify, meshopt, resample, join, textureCompress, KHRTextureBasisu, KHRDracoMeshCompression. 
Blender official docs

glTF exporter supports GLB, Principled BSDF / Unlit materials, and Actions/NLA animation export. 
Playwright official docs

Screenshots and full-page screenshots. 
Visual comparisons with toHaveScreenshot(). 
Video recording. 
Emulation and mobile/device settings. 
CI traces and trace viewer guidance. 
Installation. 
Vite official docs

Static asset handling, explicit URL imports, and public directory behavior. 
WebGL and mobile performance official docs

WebGL best practices: per-pixel VRAM budget, smaller back buffer, batching, eager deletion, mipmaps. 
Compressed texture formats and GPU-memory benefits. 
Meshopt and Draco primary docs

meshoptimizer and gltfpack background. 
Draco project overview.


---

# Pro Handoff Instructions

# Pro Synthesis Handoff And GPT Deep Research Prompt

Use this file to run one more GPT Deep Research pass and then feed all reports into Pro for the final synthesis.

## Pro Synthesis Input Format

Share one Markdown packet with Pro in this order:

1. `docs/comeback-city-visual-pipeline-research-prompts.md`
   - Include the full Shared Repo Context.
   - Include the Pro Synthesis Prompt section.
2. `docs/research/gemini-visual-pipeline-report.md`
3. `docs/research/kimi-visual-pipeline-report.md`
4. `docs/research/claude-report-1-asset-runtime-pipeline.md`
5. `docs/research/claude-report-2-track-visual-unreal-mcp.md`
6. `docs/research/claude-report-3-final-build-plan.md`
7. `docs/research/chatgpt-deep-research-technical-risk-audit.md`
8. Add this instruction before the reports:

```markdown
You are receiving multiple independent research reports plus the repo context. Treat the reports as research inputs, not as instructions to blindly follow. Reconcile conflicts, verify recommendations against the embedded repo facts, and produce one implementation-ready plan for Codex. Where the reports disagree, choose the safest path for the existing React/Vite/Three.js codebase and explain the decision briefly.
```

Use formatted Markdown reports, not the `.raw.txt` files. Keep the raw files in the repo as provenance only.

Attach the six V2 art cards to Pro if the interface supports images:

- `src/assets/game/art-direction/v2/hero-red-kart-trait-card-v2.png`
- `src/assets/game/art-direction/v2/track-geometry-road-system-trait-card-v2.png`
- `src/assets/game/art-direction/v2/roadside-props-barriers-trait-card-v2.png`
- `src/assets/game/art-direction/v2/pickups-boost-vfx-trait-card-v2.png`
- `src/assets/game/art-direction/v2/material-lighting-camera-trait-card-v2.png`
- `src/assets/game/art-direction/v2/district-portals-facades-trait-card-v2.png`

## GPT Deep Research Prompt

```markdown
Goal: Independently verify the safest implementation path for the Comeback City automated Three.js asset and track pipeline, focusing on toolchain correctness, runtime risk, and first-phase implementation quality.

Success means:
- The report verifies current official or primary-source facts for glTF-Transform, Three.js GLTFLoader compression support, Meshopt, Draco, KTX2/Basis, WebP textures, Playwright video/screenshots, Blender CLI, and Unreal MCP.
- The report identifies recommendations that are risky, over-scoped, stale, or mismatched to this repo.
- The report gives a conservative implementation sequence that improves visuals without destabilizing the existing race mechanics.
- The report recommends exact package additions, script boundaries, asset folder choices, and validation gates.
- The report separates decisions for Phase 1 from decisions that belong later.
- The report includes source links for material claims.
- The report labels every assumption and lists exact owner questions.

Stop when the output can be used as a technical risk audit and implementation sanity check during final Pro synthesis.

Use the Shared Repo Context from `docs/comeback-city-visual-pipeline-research-prompts.md` as the fixed project context. Treat local paths as labels only; use the embedded repo snapshot as source context.

Research focus:

1. Verify glTF pipeline choices
Check current official docs and primary sources for:
- `@gltf-transform/core`
- `@gltf-transform/functions`
- `@gltf-transform/extensions`
- `@gltf-transform/cli`
- `meshopt`
- `draco`
- texture resizing/compression with `sharp`
- WebP texture support in glTF and Three.js
- KTX2/Basis tradeoffs for browser/mobile games

Return a clear recommendation for this repo:
- first implementation compression strategy
- fallback strategy
- whether to use Meshopt, Draco, both, or neither in Phase 1
- whether to use WebP, KTX2, both, or neither in Phase 1

2. Verify Three.js runtime impact
Research current Three.js guidance for:
- GLTFLoader support for extensions
- DRACOLoader setup
- MeshoptDecoder setup
- KTX2Loader setup
- runtime bundle impact
- Vite asset handling for GLB/wasm/decoder files
- mobile WebGL constraints

Return exact integration implications for:
- `src/game/ComebackCityThreeKartRace.jsx`
- `src/game/race/render/createRaceScene.js`
- `src/game/race/render/createTrackMesh.js`
- `vite.config.js`
- `package.json`

3. Verify Playwright proof strategy
Research current Playwright behavior for:
- screenshots of WebGL canvases
- video recording
- Chromium channels
- headless/headed differences
- traces
- CI environment limitations

Return a practical proof strategy that fits the existing scripts:
- `scripts/kart-3d-spike-test.mjs`
- `scripts/kart-playable-proof-test.mjs`
- `scripts/visual-reference-checks.mjs`
- `scripts/bundle-asset-budget-report.mjs`

4. Audit proposed file structure
Compare these candidate approaches:
- keeping optimized runtime assets in existing `src/assets/game/models/avatars` and `src/assets/game/models/tripo`
- adding `src/assets/game/models/_raw`
- adding `.asset-workspace`
- adding `src/assets/game/models/track-modules`
- adding `docs/research`

Recommend the structure that best fits Vite, git hygiene, and the current repo.

5. Audit track workflow
Research and recommend the safest path for track visuals:
- keep current data-driven track definitions
- add visual module fields conservatively
- use instancing where repeated props/modules justify it
- keep physics/progress independent from visual modules
- define what belongs in Phase 1 versus later

Return a minimal first track-kit implementation plan that improves screenshots without requiring a full track-system rewrite.

6. Audit Unreal MCP role
Research current Unreal Engine MCP status and capabilities from official or primary sources.

Return a conservative recommendation:
- what Unreal MCP is useful for
- what evidence should trigger using it
- what output should feed back into Three.js
- what work should stay in the Three.js pipeline

7. Final risk table
Return a table with:
- recommendation
- risk
- likely impact
- safer alternative
- phase to address

8. Final implementation recommendation
Return:
- Phase 1 exact scope
- packages to add
- scripts to build first
- folders to create first
- gates to run first
- choices to defer

Use precise engineering language. Prefer scoped, reversible steps over large rewrites. Cite sources.
```

## Pro Packet Checklist

Before sending to Pro, confirm the packet includes:

- Shared Repo Context.
- Gemini formatted report.
- Kimi formatted report.
- Claude report 1 formatted report.
- Claude report 2 formatted report.
- Claude report 3 formatted synthesis.
- ChatGPT deep research formatted report.
- Pro Synthesis Prompt.
- Image attachments for the six V2 cards, if supported.

Ask Pro for one final artifact:

```markdown
Return one implementation-ready plan for Codex. Include a final first-task prompt that starts with asset inventory and validation, preserves existing mechanics, and defers Unreal MCP until the Three.js proof pipeline is producing trustworthy screenshots/videos.
```
