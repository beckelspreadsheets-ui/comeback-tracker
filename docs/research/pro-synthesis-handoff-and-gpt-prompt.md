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
