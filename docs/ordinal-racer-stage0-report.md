# Ordinal Racer Stage 0 Report — Seth + Layer23

Generated 2026-07-21 on `experiment/ordinal-racers-seth-layer23-20260721`. This report covers Stage 0 and only the factual inventory/identity-brief portion of Stage 1. No protected asset was replaced.

## Inventory and provenance

| Asset | SHA-256 | Dimensions / bytes | Geometry and resources | Likely provenance |
| --- | --- | ---: | --- | --- |
| `src/assets/game/models/avatars/seth-penguin.glb` | `ec6348cf…ce2da` | 505,868 B | 12,826 tris; 12,017 upload vertices; 1 material; 1×512 texture; 0 clips; ~1 draw call | Manifest: owner-generated with Tripo on 2026-06-11 from `seth-3dpengu`, then optimized in-repo |
| `src/assets/game/select/char-seth-penguin.png` | `2a51bda1…54e` | 480×480; 161,517 B | PNG portrait rendered from runtime GLB | `scripts/select-portraits-capture.mjs` |
| `src/assets/game/models/avatars/layer23-penguin.glb` | `6e5afbbc…339b` | 254,860 B | 21,999 tris; 14,105 upload vertices; 1 material; 1×512 texture; 0 clips; ~1 draw call; Meshopt + quantization | Approved Blender-decimated/Meshopt candidate promoted 2026-06-20 |
| `asset-pipeline/raw/runtime-copies/layer23-penguin__0622be5ab6c7.glb` | `0622be5a…58ec` | 4,030,820 B | 100,350 tris; 87,255 upload vertices; 1 material; 1×512 texture; 0 clips; ~1 draw call | Raw runtime copy and documented source of promoted Layer23 candidate |
| `src/assets/game/select/char-layer23.png` | `867f0780…e9b71` | 480×480; 156,607 B | PNG portrait rendered from runtime GLB | `scripts/select-portraits-capture.mjs` |
| `asset-pipeline/raw/references/layer23-meshy-input.png` | `daf82ff2…6422` | 1024×1024; 1,201,692 B | PNG reference | Meshy input; generation/provenance record absent |
| `asset-pipeline/raw/references/layer23-meshy-input-clean.png` | `0d7e20cf…14bf` | 1024×1024; 1,191,476 B | PNG reference | Cleaned Meshy input; generation/provenance record absent |

The historical canonical/source paths `sethhpengu.png`, `seth-3dpengu.glb`, `layer23pixelated.png`, and `layer233d.glb` under `3d generations:character sheets/` are referenced by repo docs/config but are absent from this worktree. Neither character's Ordinal inscription ID is recorded. Therefore no available image is asserted to be canonical Ordinal art. Those missing files and IDs block honest canonical-art side-by-side target sheets.

Runtime contract facts: both racers use `driverHeight: 6.4`, `driverYaw: -π/2`, and the Kenney dragster family in `KART_CHARACTERS`. Both GLBs validate and parse. Layer23 exceeds the current 16k target but remains below its 25k hard cap. Neither GLB contains a skeleton animation clip.

## Reproducible evidence

- `node scripts/ordinal-racer-stage0-audit.mjs` writes machine-readable inventory to `tmp/ordinal-racer-prototype/stage0/metrics.json`.
- `node scripts/render-asset-gallery.mjs --asset seth-penguin --asset layer23-penguin --outputRoot tmp/ordinal-racer-prototype/stage0/neutral-gallery` produces front, left, right, rear, and three-quarter neutral renders plus a contact sheet.
- `npm run build:kart && node scripts/ordinal-racer-stage0-capture.mjs` produces character-select and real Three.js chase/seated-kart captures for each character at 1440×900 desktop and 390×844 mobile, with telemetry and page errors recorded in `capture-report.json`.

All 18 requested/relevant frames were captured without page errors: ten neutral views and eight gameplay/select frames. The chase frame is also the honest seated-kart view because the existing game exposes the seated model through the live chase camera; no separate seat-inspection camera exists. Mobile select and mobile chase frames are explicit mobile evidence. No capture was faked.

## Identity briefs (available evidence only)

### Seth Penguin

Verified in the available runtime-derived portrait/model: rounded dark penguin body; white face/belly marking; orange beak and feet; large cyan/blue visor goggles; bright orange padded parka; black scarf/neck wrap, gloves, and lower body; cyan shoulder patch; seated, forward-held flippers.

Uncertain: whether every garment detail, visor shape, palette value, rear silhouette, and patch emblem matches the actual Ordinal; canonical source art and inscription ID are missing. Treat all current traits as a reconstruction reference, not canonical truth.

### Layer23

Verified across the two available Meshy-input references and runtime-derived portrait/model: blocky/pixel-influenced penguin proportions; black head/body with white face/belly; small orange block beak and orange feet; square black eyes; oversized brown cowboy hat with red/orange band; long dark-purple coat with high collar; dark gloves; small orange coat accents; seated pose.

Uncertain: whether the Meshy input itself is canonical, exact hat/coat geometry and rear details, precise palette, meaning of coat accents, and inscription identity. The references are consistent with each other but have no provenance record or inscription ID. Layer23 clearly needs a silhouette-specific variation rather than a Seth color swap because the cowboy hat, squared face language, and long coat dominate its outline.

## Gate decision

Stage 0 evidence and factual briefs are complete and reproducible. Modeling/runtime replacement must not begin. Owner approval is required, and the owner should supply or confirm highest-resolution canonical art plus both inscription IDs before approving target sheets.
