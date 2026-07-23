# Kimi Gaming PC Handoff — Ordinals Kart Engine Bake-Off

Public, sanitized handoff for continuing the benchmark without GitHub
authentication.

## Paste everything below into Kimi

```text
Continue the Ordinals Kart browser-engine bake-off on this gaming PC. Work
autonomously through every safe milestone, but do not migrate or deploy the
production game and do not declare a winner without Seth's review.

PUBLIC SOURCE

Repository:
https://github.com/beckelspreadsheets-ui/comeback-tracker.git

Completed Ordinals game branch and immutable baseline:
kimi/ordinals-inscription-circuit-20260722
commit 32f75eaa99defbe7917af20478053131f2dda44c

Benchmark harness branch and immutable baseline:
codex/browser-engine-bakeoff-20260723
commit ed799cf31c72fb3df7894cdbf6adbd4bec0825cd

Clone the public repo, fetch both branches, and create an isolated branch named:
kimi/browser-engine-bakeoff-gaming-pc-20260723

Never work directly on either baseline branch. Preserve unrelated local changes.
Record the starting commit and git status before mutation.

GOAL

Build and measure the same production-quality 20–30 second Inscription Circuit
Wharf segment in:

1. Existing Three.js runtime (control)
2. PlayCanvas WebGPU/WebGL2
3. Unity 6 URP Web
4. Unity Editor + Needle Engine

The quick VPS run was only a synthetic harness test under SwiftShader. It is
not engine-selection evidence. Do not reuse its FPS ranking or substitute toy
geometry for the real Wharf segment.

G0 — PREFLIGHT

Before building, record in
benchmarks/browser-engine/gaming-pc/environment.json:

- OS/version
- CPU
- physical GPU/driver
- RAM and free disk
- Chrome/Edge versions
- Node/npm versions
- Unity Hub/Editor versions and installed web modules
- Needle version, if installed

Verify browser hardware acceleration and record the browser renderer/API.
SwiftShader or software rendering invalidates performance results.

Read before implementation:

- benchmarks/browser-engine/README.md
- benchmarks/browser-engine/metrics.schema.json
- benchmarks/browser-engine/equal-input-assets.json
- docs/INSCRIPTION_CIRCUIT_ART_DIRECTION.md
- docs/evidence/m3/
- docs/evidence/final/
- the actual Three.js race implementation and telemetry

Persist milestone state in:
benchmarks/browser-engine/gaming-pc-state.json

Do not silently install large global tools or sign into accounts. Project-local
npm installs are allowed. If Unity, its Web module, Needle, or licensing is
missing, report the exact install/version/disk requirement and wait for Seth.

EQUAL-INPUT CONTRACT

Extract one real 20–30 second Wharf segment and freeze it as a canonical,
portable scene package. Every lane must receive the same:

- animated hero kart GLB, including wheels/suspension where available
- track geometry and deterministic camera path
- flagship Wharf landmark
- docks/piers, water, barriers, props, particles, and sky
- textures, lightmap targets, LODs, and material intent
- desktop and mobile quality tiers
- resolution, DPR, capture timestamps, and run duration

Create a manifest containing source path, role, transform, byte size, SHA-256,
LOD, quality tier, and conversion provenance. If an engine requires converted
assets, retain source and converted hashes. No lane may use replacement art,
different prop counts, different camera framing, prerecorded footage, or
engine-favoring omissions.

Native engine materials/renderers are allowed, but visible content, visual
intent, lighting targets, effects, camera, and tier must match. Build an
automatic parity validator and a human-readable parity report.

MILESTONES

G1 Canonical Wharf package
- portable scene spec and assets
- hash manifest
- deterministic camera/timestamps
- desktop/mobile tier definitions
- reference captures from the shipped Three.js scene

G2 Three.js control
- use the existing proven renderer, not a recreation
- three headed cold-cache desktop runs
- three headed cold-cache mobile-tier runs
- fixed screenshots and continuous playable capture

G3 PlayCanvas
- same scene/assets/camera/effects
- record WebGPU or WebGL2 and fallback behavior
- identical measurement matrix

G4 Unity 6 URP Web
- same canonical scene
- record Unity version, compression, stripping, memory, threading, graphics API,
  build settings, build time, and web output size
- identical measurement matrix

G5 Unity + Needle
- export the same Unity scene/assets through Needle
- record Unity, Needle, package, and export settings
- identical measurement matrix

G6 Physical mobile
- host identical previews where licensing permits
- test at least one real phone; ideally iPhone Safari and Android Chrome
- record device/OS/browser, startup, frame pacing, orientation, controls,
  crashes/memory failures, and obvious thermal degradation
- desktop browser emulation does not count as physical-phone evidence

G7 Owner review package
- side-by-side fixed screenshots
- four continuous captures
- every raw metrics run plus median table
- parity validation
- compatibility matrix
- editor iteration/asset-update timing
- deployment/licensing/source-control/maintenance comparison
- migration-risk estimate
- honest limitations and disqualified lanes
- recommendation with confidence level, but no migration

MEASUREMENT PROTOCOL

Use headed, hardware-accelerated browsers. Run at least three repetitions per
lane/tier and keep every raw run.

Record:

- median FPS and 1% low
- frame-time p50/p95/p99
- frame counts over 33.3, 50, and 100 ms
- maximum frame spike
- cold-cache transfer and request count
- navigation and scene-ready startup
- peak JS heap and engine memory where available
- draw calls, visible triangles, materials, textures, programs/shaders
- estimated texture/GPU memory where available
- shader compilation stalls
- animation correctness
- editor cold-open time
- one controlled asset-update round trip
- build time and output size

Every run must include commit, lane config, GPU, browser, graphics API,
resolution, DPR, tier, cache state, and timestamp. A number without environment
metadata is invalid.

Capture all lanes at identical deterministic moments:

- opening
- flagship landmark
- dense docks
- water/reflections
- particles/VFX
- kart chase close-up
- segment end

Create an HTML visual comparison. Leave Seth's subjective visual-score fields
blank.

DISQUALIFICATION GATES

- Different art/camera/content fails parity.
- Software rendering fails performance ranking.
- Failure on representative mobile web prevents default-browser selection.
- Screenshot quality cannot outweigh bad startup/frame pacing.
- Do not recommend replacing roughly 16,625 lines of proven race code without
  a material measured advantage and migration-risk estimate.
- Do not begin a migration after the benchmark.

DELIVERABLES

Commit reproducible source/config/docs under:
benchmarks/browser-engine/gaming-pc/

Raw evidence:
benchmarks/browser-engine/gaming-pc/evidence/<lane>/<run-id>/

Required files:

- GAMING-PC-README.md
- environment.json
- canonical-scene.json
- equal-input-assets.json
- parity-report.json
- results.json
- results-summary.md
- visual-comparison.html
- compatibility-matrix.md
- iteration-burden.md
- migration-risk.md
- owner-review.md

Do not commit node_modules, Unity Library folders, caches, or redundant builds.
For videos/outputs too large for git, preserve them separately and document
paths and SHA-256 hashes.

FINAL VALIDATION

- all lanes reference the canonical scene ID/source hashes
- three valid desktop and mobile-tier runs per lane
- physical mobile clearly separated from emulation
- matching capture timestamps/cameras
- manifest/hash validator passes
- secret scan passes
- production branch/deployment untouched
- isolated branch pushed with a public GitHub review link

After every milestone report completed/total, last artifact, last activity
timestamp, verified worker status, and exact blocker. Never claim work is
running without a live verified process. Never fabricate Unity/Needle results.

Begin with G0 now. Stop only for an owner-only login/license/large-install
decision, a destructive action, or genuinely missing source.
```
