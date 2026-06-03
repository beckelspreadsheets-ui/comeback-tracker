# /world Photo-Match Gallery PRD

| Field | Details |
| --- | --- |
| Product | Showcase Designs `/world` interactive gallery |
| PRD focus | Make the current `/world` build visually match the rightmost hyperrealistic gallery reference |
| Date | 2026-05-11 |
| Status | Ready for code-mode implementation |
| Primary route | `/world` |
| Stable preview | `https://showcase-designs-preview.pages.dev/world` |
| Target reference | `img/world/hyperrealistic-gallery-target-right.png` |
| Current mismatch capture | `verification/studio-quality-hero-wall-local-4.png` |

## 1. Product Intent

The current `/world` preview performs well, but it does not yet look like the target photo. The next implementation pass must prioritize photographic believability over adding features.

The target is not "a dark room with framed websites." It is a high-end architectural interior with real material response, visible indirect light, grounded objects, and a camera composition that looks like a professional render.

The finished first view must read as the rightmost reference within three seconds, before the user walks or clicks.

## 2. Decision Record

The older "do not cluster two exhibits on one wall" rule is superseded for this visual direction. The owner approved doing whatever looks best and allows growth on 2026-05-09. The right-reference layout may keep three hero exhibits on the main wall and use side walls for growth.

This PRD also supersedes any earlier audit wording that marked the visual direction complete. The current preview is a performant first pass, not a photo-match pass.

On 2026-05-11, the owner selected option C: a hybrid/generated room-plate approach is approved for the next visual pass because the goal is a closer 1:1 match to the rightmost target image. This approval applies to preview implementation only until the owner explicitly approves production.

The current deployed preview is approved only for preview sharing. It is not approved for final launch.

The case-study/site copy is not approved. The owner requested a 1:1 copy match, so implementation must wait for the exact source copy before changing text.

Any remaining decision below marked "Owner decision" must be confirmed before implementation if code mode cannot satisfy both visual match and the listed constraints.

## 3. Reference Diagnosis

### 3.1 Target Photo Signals

The rightmost reference has these dominant cues:

| Cue | Target behavior |
| --- | --- |
| Camera | Human-height architectural viewpoint, slightly wide but not fisheye, looking across the room with ceiling, floor, glass wall, bench, and three exhibits all visible |
| Glass wall | Left side is a real glass-wall volume, with black mullions, depth, reflections, and visible exterior planting |
| Main wall | Dark graphite stone panels, not black planes; visible slab variation and subtle vertical panel seams |
| Ceiling | Dark textured ceiling with a bright perimeter cove and small black downlights/track heads |
| Wall light | Each exhibit has a soft warm wall-wash cone above it, with real falloff on the stone |
| Floor | Polished dark stone with imperfect blurred reflections and warm pools under exhibits |
| Frames | Thin black metal gallery frames, thick enough to cast shadows, with slight bevel highlights |
| Screens | Website captures fill the frames like digital artworks; no phone hardware, no notches, no device silhouette |
| Seating | Low leather ottoman centered in the foreground, proportionally heavy, with contact shadow and mild top highlight |
| UI | No panel dominates the photographic view |

### 3.2 Current Preview Mismatches

The latest capture, `verification/studio-quality-hero-wall-local-4.png`, still misses the reference in these ways:

| Area | Current problem | Required correction |
| --- | --- | --- |
| Overall light | Scene reads too black and game-like, with large areas lacking recoverable surface detail | Raise indirect light and material albedo while keeping the room moody |
| Ceiling | Top of viewport is a broad black void with thin trim lines | Add visible textured ceiling surface, cove bounce, and believable downlight geometry |
| Wall material | Main wall reads as flat dark panels | Replace with stronger graphite stone/concrete texture, subtle roughness variation, and visible slab scale |
| Floor | Floor lacks the glossy, imperfect reflection pattern of the target | Add baked light-pool/reflection masks, micro-scratch texture, and tuned roughness |
| Frame depth | Frames read as flat screen borders | Add physical frame thickness, bevels, side faces, and contact shadows |
| Wall wash | Light pools are too weak and rectangular | Use soft radial/cone masks above each frame, aligned with fixtures |
| Bench | Bench is too dark, cropped, and not materially convincing | Reposition and relight the ottoman so it anchors the foreground like the photo |
| Glass wall | Glass is present but too flat and low contrast | Add mullion depth, interior/exterior reflection, garden depth, and contact shadows |
| UI | QA and station panels visually compete with the room | Add a visual review/presentation mode with minimal overlay footprint |
| Composition | The frame feels like a wide game camera, not a cropped architectural photograph | Retune default camera position, yaw, pitch, FOV, and station spacing against screenshot gates |

## 4. Non-Negotiables

1. Keep the four current website exhibits: EvenPath Homes, Felco Vending, Abel M. Fitness, and Beckel Spreadsheets.
2. Preserve `/` as the fast static marketing route.
3. Preserve clickable live-site actions.
4. Preserve first-person movement, inspection, screenshot scroll, Escape/back exit, collision, fullscreen, and mobile controls.
5. Do not add empty placeholder canvases.
6. Do not use phone silhouettes, camera notches, speakers, or fake device hardware.
7. Do not add bright game outlines, neon halos, arcade bloom, or dominant gold trim.
8. Do not use a continuous idle render loop.
9. Mobile must remain usable and smooth.
10. A hybrid/generated room-plate approach is approved for the next visual pass, but it must preserve walking, inspection, screenshot scroll, collision, fullscreen, mobile controls, and live-site actions.

## 5. Target Experience

### 5.1 Default View

When `/world?try=1&qa=minimal` opens at desktop size, the user should see:

1. A left glass wall occupying roughly 12-25% of the viewport width.
2. A main graphite exhibit wall occupying the center and right side.
3. Three framed digital exhibits visible on the main wall.
4. A low leather ottoman in the lower center or lower right foreground.
5. A polished floor with visible soft warm reflections.
6. A ceiling cove and downlights visible in the upper band.
7. Minimal UI that does not cover the gallery composition.

### 5.2 Walking Mode

Walking remains first-person, horizontal, bounded, and grounded. Movement should feel like a person walking through a gallery, not a flying camera.

The camera should use:

| Setting | Target |
| --- | --- |
| Eye height | 1.55m to 1.7m equivalent |
| FOV | 48-58 degrees desktop, tuned per viewport |
| Pitch | Slightly downward or level enough to show floor reflections without losing ceiling cove |
| Movement speed | Smooth, gallery-paced, no acceleration spikes |
| Collision | Walls, glass, exhibits, ottoman, and major fixtures block movement |

### 5.3 Inspection Mode

Inspection must still feel like standing in front of a premium digital artwork:

1. Camera eases to a comfortable front-of-frame distance.
2. The selected website remains inside its physical frame.
3. Wheel, trackpad, touch drag, and compact controls scroll the screenshot vertically.
4. A compact `Open site` action remains available.
5. Escape, Done, browser back, or tapping away exits without reload.
6. The room remains visible enough around the exhibit to preserve immersion.

## 6. Visual Requirements

### 6.1 Composition

| Requirement | Acceptance criteria |
| --- | --- |
| Match target silhouette | First desktop screenshot has the same major masses as the right reference: glass left, wall center/right, bench foreground, ceiling band, reflective floor |
| Avoid game-camera feeling | No extreme wide angle, no exaggerated vanishing, no empty black ceiling void |
| Hero-wall spacing | Three main exhibits align horizontally with breathing room and similar top/bottom heights |
| Growth path | Side walls and data model can accept future exhibits without changing the hero-wall composition |

### 6.2 Walls

The wall must read as large-format graphite stone or architectural concrete.

Implementation requirements:

1. Replace flat procedural darkness with stronger albedo, roughness, and subtle normal/bump variation.
2. Use visible large slab seams at architectural scale.
3. Add per-panel variation so the wall is not a repeated tile.
4. Keep seams restrained; no gold outlines or decorative linework.
5. Preserve mobile performance through baked texture maps or low-cost canvas textures.

Acceptance criteria:

1. At 1440x900, the wall has visible texture detail in the screenshot, not a near-black flat fill.
2. The stone panel seams are visible but not graphic.
3. Exhibit shadows and wall-wash light reveal the wall surface.

### 6.3 Floor

The floor must be polished dark stone or concrete, glossy but imperfect.

Implementation requirements:

1. Use a floor albedo texture with micro-scratches, stone variation, and low-frequency mottling.
2. Use roughness variation so reflections are blurred and uneven.
3. Add baked reflection/light-pool decals below wall washes and exhibits.
4. Add subtle bench reflection and contact darkening.
5. Avoid mirror-perfect reflection on mobile.

Acceptance criteria:

1. Warm reflection pools are visible under all three hero-wall exhibits.
2. The floor still shows material texture inside bright reflection areas.
3. The bench casts or fakes a grounded contact shadow.

### 6.4 Ceiling And Lighting

The ceiling must be visible and physically motivated.

Implementation requirements:

1. Build a recessed ceiling perimeter cove with warm light strips.
2. Use black track or downlight fixtures aligned above the exhibit wall.
3. Add soft wall-wash masks centered above each exhibit.
4. Add small ceiling downlight pools near the glass wall and main wall.
5. Use baked/fake light geometry for mobile and keep realtime shadows limited or off.

Acceptance criteria:

1. The upper viewport has a visible textured ceiling, not a black void.
2. Cove lighting creates a continuous soft edge glow along the room perimeter.
3. Each exhibit has a distinct but soft wall-wash pool.
4. Fixtures look mounted to the architecture, not floating UI props.

### 6.5 Frames And Screens

The frames must read as premium black metal artwork frames.

Implementation requirements:

1. Build each frame from physical side/top/bottom geometry, not a single flat border.
2. Add bevel-like highlights through geometry, material roughness, and narrow light strips.
3. Add a very subtle glass/screen reflection layer only at grazing angles.
4. Keep screenshots edge-to-edge inside the inner frame.
5. Normalize screenshot exposure so bright sites do not blow out and dark sites do not vanish.

Acceptance criteria:

1. Frames have visible thickness and shadow.
2. Screens do not resemble phones or tablets.
3. All four stations remain clickable and inspectable.

### 6.6 Glass Wall And Exterior

The left glass wall must feel like a real architectural boundary.

Implementation requirements:

1. Use black mullions with actual depth and contact shadows.
2. Add layered glass panes with low opacity and subtle roughness.
3. Add exterior/garden silhouettes with depth variation, not a flat green smudge.
4. Add reflected interior light streaks on glass.
5. Collision must prevent walking through the glass wall.

Acceptance criteria:

1. Glass wall is legible in the first view.
2. Exterior planting is visible but not distracting.
3. Glass reads reflective/transparent without expensive realtime effects.

### 6.7 Seating

The ottoman must anchor the room.

Implementation requirements:

1. Use target-like dimensions: low, wide, rectangular, leather top, recessed base.
2. Add top leather grain and edge highlights.
3. Add contact shadow and a soft floor reflection.
4. Keep its collider aligned with the visual mesh.

Acceptance criteria:

1. Bench is visible enough in the first view to establish scale.
2. It does not look like a black block.
3. The player cannot walk through it.

### 6.8 UI

The UI must support operation without ruining the photo.

Implementation requirements:

1. Add a visual review or presentation state, for example `?presentation=1`, that hides QA panels and collapses station controls after load.
2. Keep essential controls reachable through compact buttons.
3. Never cover the hero-wall exhibits in the first view.
4. Mobile controls must remain ergonomic but translucent and scene-aware.

Acceptance criteria:

1. In desktop visual-review screenshots, UI covers less than 5% of the viewport after initial load.
2. In normal mode, station and QA controls remain usable.
3. In mobile portrait, movement controls do not cover the active exhibit interaction UI.

## 7. Technical Direction

### 7.1 Preferred Approach

Stay in the current static Three.js architecture, but treat the next pass as an architectural-rendering pass:

1. Improve camera and composition first.
2. Replace flat materials with stronger PBR-style material maps.
3. Add baked lighting masks and reflection decals.
4. Improve frame, glass, and bench geometry.
5. Add screenshot-based visual verification.

Three.js `MeshStandardMaterial` supports roughness, metalness, normal, ambient occlusion, emissive, light, and environment-map based workflows. The next pass should use those features where they improve realism without breaking mobile budgets.

Three.js color management should be treated as part of the visual system. Color textures such as JPEG/PNG albedo maps and website screenshots should use sRGB color space, while roughness/normal/non-color maps should remain non-color data.

For realistic PBR response, add an environment map through `RoomEnvironment` or another lightweight PMREM source in desktop/high quality mode. Mobile may keep a cheaper baked-light approximation if PMREM costs too much.

### 7.2 Asset Strategy

Create optimized local assets under `img/world/`:

| Asset | Purpose | Initial target |
| --- | --- | --- |
| `photo-match-wall-albedo.webp` | Graphite stone/concrete color | 1024px or 1536px wide |
| `photo-match-wall-roughness.webp` | Wall roughness variation | 1024px |
| `photo-match-wall-normal.webp` | Subtle stone normal/bump | 1024px |
| `photo-match-floor-albedo.webp` | Polished dark floor base | 1024px or 1536px wide |
| `photo-match-floor-roughness.webp` | Floor reflection breakup | 1024px |
| `photo-match-floor-reflection-mask.webp` | Warm reflection pools | 1024px |
| `photo-match-leather.webp` | Ottoman leather texture | 512px |
| `photo-match-garden-depth.webp` | Exterior planting/glass depth | 768px |
| `photo-match-wall-wash-mask.webp` | Soft exhibit wall-wash shape | 512px |

Generated bitmap texture assets are allowed if they are local, optimized, and verified visually. A full generated room/backdrop plate is approved for the next preview-only visual pass, provided it stays hybrid and does not turn `/world` into a static screenshot.

### 7.3 Geometry Strategy

Use fewer, better meshes:

1. Main wall: separate large slab panels with tiny depth differences and material variation.
2. Ceiling: actual recessed perimeter cove geometry with light strips.
3. Floor: one main floor mesh plus low-cost reflection/shadow decals.
4. Frames: side/top/bottom metal bars with depth and bevel-like highlights.
5. Screens: inner artwork plane plus optional transparent glass plane.
6. Glass wall: mullion bars, glass panes, exterior layered cards.
7. Bench: rounded-edge illusion through geometry segments, leather texture, recessed base, contact shadow.

### 7.4 Rendering Strategy

1. Keep demand-driven rendering.
2. Keep adaptive DPR capped around mobile-safe values.
3. Use no mobile postprocessing.
4. Use baked light and shadow planes before realtime shadows.
5. If desktop cinematic mode is used, keep it behind `?cinematic=1`.
6. Keep visible mobile draw calls under 120 and visible triangles under 20k.
7. Use `renderer.info` in QA to verify draw calls and triangles during movement.

### 7.5 Approved Hybrid Room-Plate Direction

The next implementation pass may use a generated or composited architectural room plate to get closer to the target photo, with live Three.js geometry and interaction layered where needed.

Implementation constraints:

1. The room plate must match the rightmost reference composition: glass wall left, dark stone hero wall, three main framed exhibits, low ottoman foreground, visible cove ceiling, and polished reflective floor.
2. The four approved website exhibits must remain real interactive targets. The artwork surfaces can be aligned over the plate, but click, inspect, scroll, and open-site actions must still work.
3. The route must still support first-person walking. A plate can be used as the default/presentation composition, but walking mode needs coherent bounds, collisions, and visible parallax/depth cues.
4. Do not bake fake phone hardware, notches, speakers, or placeholder artworks into the plate.
5. Use exact approved website screenshots or live capture crops for the visible artwork surfaces; do not rely on generated placeholder text inside frames.
6. Keep the plate and any new textures optimized for preview deployment. The texture payload must remain launchable on mobile.
7. `?presentation=1` should show the cleanest near-1:1 view with minimal UI. Normal mode should keep controls available without covering the target composition.
8. If the hybrid approach makes any P0 interaction weaker, stop and document the tradeoff before shipping it.

Acceptance criteria:

1. A side-by-side review can visually justify that the first viewport is now materially closer to `img/world/hyperrealistic-gallery-target-right.png`.
2. The implementation still passes `node verify-world.mjs`, `node verify-photo-match.mjs`, preview `verify-production`, and real-device QA before launch.
3. The stable preview may be shared while production remains blocked until explicit approval.

## 8. File Requirements

| File | Required work |
| --- | --- |
| `world.js` | Camera retune, scene geometry, material builders, cove/wall-wash/reflection masks, frame depth, glass wall, bench lighting, collision updates, presentation mode hooks |
| `world.css` | Presentation/minimal UI, mobile control placement, reduced QA visual footprint, inspection controls |
| `world.html` | Any required presentation/visual-review hooks and accessible controls |
| `world-data.js` | Station positions, rotations, sizes, camera offsets, colliders, future expansion metadata |
| `verify-world.mjs` | Preserve existing functional checks and add stricter scene hooks |
| `verify-photo-match.mjs` | New screenshot-region verifier for visual composition and luminance gates |
| `img/world/*` | Optimized texture/light/reflection assets |
| `COMPLETION_AUDIT.md` | Mark photo-match status separately from functional/performance status |

## 9. Implementation Phases

### Phase 1: Visual Contract And Harness

1. Add `verify-photo-match.mjs`.
2. Capture desktop `1440x900` and mobile `390x844` screenshots from local `/world?try=1&qa=minimal&presentation=1`.
3. Add screenshot-region assertions for major target cues:
   - left glass wall coverage
   - top cove/ceiling visibility
   - three hero frames visible
   - bench visible in lower foreground
   - floor reflection/luminance pools visible
   - UI footprint below threshold
4. Store comparison captures in `verification/`.

Exit criteria: verifier fails against the current preview for the known visual gaps, then becomes the gate for the next implementation pass.

### Phase 2: Camera And Layout Match

1. Retune default camera position, yaw, pitch, FOV, and target.
2. Reposition ottoman so it resembles the target foreground mass.
3. Rebalance hero-wall exhibit spacing and sizes.
4. Adjust glass wall width and angle to match the reference silhouette.

Exit criteria: the first screenshot has the correct large shapes before material work.

### Phase 3: Architecture Materials

1. Replace wall/floor procedural textures with optimized photo-match material maps.
2. Add slab panel variation and subtle wall depth.
3. Add roughness/normal behavior to floor and wall materials.
4. Tune renderer exposure and color space so material detail is visible.

Exit criteria: wall and floor no longer read as flat black planes.

### Phase 4: Lighting And Reflections

1. Rebuild cove lighting as visible architectural geometry.
2. Add wall-wash masks above each hero exhibit.
3. Add warm floor reflection masks tied to exhibit light pools.
4. Add contact shadows for frames, bench, wall panels, glass mullions, and fixtures.
5. Add desktop environment lighting if it improves frame/floor material response.

Exit criteria: screenshot has target-like warm pools and grounded objects without mobile postprocessing.

### Phase 5: Exhibit Hardware

1. Rebuild frames with physical black metal geometry.
2. Add inner screen glass plane and subtle reflection.
3. Adjust screenshot tone and crop inside frames.
4. Preserve inspect, scroll, hover, and open-site actions.

Exit criteria: exhibits read as premium digital artworks, not web mockups or phones.

### Phase 6: Glass Wall And Garden

1. Rebuild mullions with depth and correct contact.
2. Add layered exterior planting cards.
3. Add glass reflection streaks and darker transparent panes.
4. Preserve glass collision.

Exit criteria: left glass wall reads like the reference and improves depth.

### Phase 7: UI De-Emphasis

1. Add presentation mode for shareable preview screenshots.
2. Reduce normal-mode UI visual weight.
3. Hide QA panel unless explicitly requested.
4. Keep mobile controls usable and nonblocking.

Exit criteria: the first view is primarily the gallery, not the interface.

### Phase 8: Performance, Collision, And Release

1. Run `node verify-world.mjs`.
2. Run `node verify-photo-match.mjs`.
3. Run desktop browser QA at `1440x900`.
4. Run mobile browser QA at `390x844`.
5. Deploy preview.
6. Run `SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-production.mjs`.
7. Complete real-device iOS Safari and Android Chrome QA.

Exit criteria: visual, functional, production, and real-device gates pass.

## 10. Verification Requirements

### 10.1 Automated Local Commands

```bash
node verify-world.mjs
node verify-photo-match.mjs
```

### 10.2 Production Commands

```bash
SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-production.mjs
node verify-outbound.mjs
node verify-device-qa.mjs
```

### 10.3 Manual Browser QA

| QA item | Required result |
| --- | --- |
| Desktop first view | Matches the target silhouette and material direction |
| Desktop walking | Smooth, bounded, no wall/bench/exhibit clipping |
| Desktop inspect | Click exhibit, scroll screenshot, open live site, exit |
| Desktop fullscreen | Camera still frames the premium room |
| Mobile first view | Gallery readable without UI blocking the exhibit |
| Mobile walking | Joystick and touch look are usable |
| Mobile inspect | Tap exhibit, scroll screenshot, open live site, exit |
| Reduced motion | Routes to static or graceful fallback |

### 10.4 Visual Approval Gate

Automated checks are not enough. Before marking photo-match complete, create a side-by-side review with:

1. `img/world/hyperrealistic-gallery-target-right.png`
2. latest local desktop screenshot
3. latest production desktop screenshot
4. latest mobile screenshot

The owner has approved the hybrid/generated room-plate direction for the next preview pass. The owner still must approve the final visual result after implementation. If approval fails, keep the active status open.

## 11. Photo-Match Acceptance Criteria

The pass is complete only when all of these are true:

1. The default desktop view immediately resembles the rightmost target image.
2. The room no longer reads as a dark game scene.
3. Wall, floor, ceiling, frame, glass, and seating materials show visible believable variation.
4. Warm cove and exhibit wall-wash lighting are clearly visible.
5. Floor reflections are visible, blurred, and imperfect.
6. The bench feels physically grounded and correctly scaled.
7. Frames look like premium black metal gallery hardware.
8. Screens fill frames edge-to-edge without phone/device elements.
9. UI can be minimized enough for a clean preview link.
10. Walking, inspection, scrolling, collisions, fullscreen, and live-site actions still work.
11. Mobile remains smooth enough for real use.
12. `node verify-world.mjs` passes.
13. `node verify-photo-match.mjs` passes.
14. Production verifier passes on Cloudflare preview.
15. Real-device iOS Safari and Android Chrome QA reports pass.

## 12. Owner Decision Gates

Ask before proceeding if any of these become necessary:

1. Reducing interactivity to improve visual fidelity.
2. Dropping any of the four approved exhibits.
3. Hiding normal navigation or live-site controls by default.
4. Accepting a desktop-only visual effect that meaningfully changes the mobile look.
5. Changing case-study/site copy without the exact 1:1 source copy.

## 13. Technical References

Use primary Three.js documentation for implementation decisions:

1. `MeshStandardMaterial` for PBR-style roughness, metalness, normal, emissive, light, and environment maps: https://threejs.org/docs/pages/MeshStandardMaterial.html
2. `WebGLRenderer` for renderer info, output color space, animation loop, and shadow-map controls: https://threejs.org/docs/pages/WebGLRenderer.html
3. `RoomEnvironment` and PMREM for lightweight room-based environment lighting: https://threejs.org/docs/pages/RoomEnvironment.html
4. Three.js color management for assigning sRGB color textures and non-color maps correctly: https://threejs.org/manual/en/color-management.html
