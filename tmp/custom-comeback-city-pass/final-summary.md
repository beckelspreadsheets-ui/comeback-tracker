# Comeback City Custom Map Pass — Final Summary

**Implementation branch:** `overnight-major-rebuild-20260719`  
**Protected branch (untouched):** `graphics-compare-hermes-kimi-k3` @ `2c27a537dc5fef9973d37ccf8239068c29c418ba`  
**Preview URL:** https://comeback-city-kart-preview.vercel.app/  
**Objective:** Author a fully recognizable six-district Comeback City course, grounded Bitcoin pickups, personal racer GLB avatars, original arcade soundtrack, evidence package, and HTTPS preview deploy — without changing Penguin Village or merging to protected/default branches.

## What changed (Stage 2 → Stage 7)

| Stage | Change | Key files |
|-------|--------|-----------|
| 2 | Volumetric district kits for Ice Plaza and Neon Downtown; effects-off default, effects-on opt-in. | `src/game/ComebackCityThreeKartRace.jsx` |
| 3a | Coins derive visual + collision transforms from `TrackSurfaceAnchor` (`sampler.pointAt`), low hover inside drivable envelope. | `src/game/ComebackCityThreeKartRace.jsx`, `src/game/race/raceCoins.js` |
| 3b | Authored kits for Crypto Arcade, Harbor, Skyline Run, Comeback Tunnel; no card-like planes. | `src/game/ComebackCityThreeKartRace.jsx` |
| 4 | Authored GLB driver avatars enabled by default so the six personal racers render on track. | `src/game/ComebackCityThreeKartRace.jsx` |
| 5 | Shared visual/collision pickup transform; hover reduced to 1.1. | `src/game/ComebackCityThreeKartRace.jsx` |
| 6 | Original synthesized arcade-racing music loop (bass, chords, arp, drums) integrated with engine/drift cues. | `src/game/race/kartMusicLoop.js`, `src/game/race/kartAudio.js` |
| 7 | Final QA, evidence package, capture-script robustness fixes, branch push. | `scripts/capture-race-proof.mjs`, this summary, `state.json` |

## Final QA results

- `npm run build:kart` — PASS (dist-kart rebuilt, ~3 MB hashed assets).
- `npm run test:race` — PASS.
- `npm run test:kart-playable:kart` — PASS.
- `npm run test:audio:kart` — PASS.
- `RACE_PROOF_SERVER_MODE=preview:kart npm run race:proof:capture` — PASS; desktop + mobile start/mid/end screenshots and 10 s videos captured.
- `npm run race:proof:compare` — 2 residual errors, both **headless SwiftShader min-FPS gate misses** (desktop 5, mobile 6 vs gate 8). All motion, route-progress, screenshot-count, and renderer gates pass. This matches the documented environmental behavior in `BLOCKERS.md` / `COMEBACK_CITY_V2_3D_KART_RUNTIME_PRD.md`.

## Evidence locations

- Latest race proof run: `asset-pipeline/proof/runs/2026-07-21T00-41-29-489Z__race-proof`
- Contact sheet: `asset-pipeline/proof/runs/2026-07-21T00-41-29-489Z__race-proof/visual-review-contact-sheet.html`
- Kart playable proof: `tmp/kart-playable-proof-test/kart-playable-proof-report.json`
- Audio smoke report: `tmp/kart-audio-smoke/kart-audio-smoke-report.json`
- Build output: `dist-kart/`

## Protected-fingerprint check

- Protected worktree HEAD unchanged: `2c27a537dc5fef9973d37ccf8239068c29c418ba`.
- No Penguin Village files touched in implementation branch (`git diff 431df0e..HEAD --name-only | grep -iE 'penguin|village'` returns empty).
- No merge to `main` or protected branch performed.

## Deployment status

- Isolated branch pushed to `origin/overnight-major-rebuild-20260719` (HEAD `cd40e40`).
- The configured preview URL `https://comeback-city-kart-preview.vercel.app/` was polled after the push and continued to serve the **stale** build (HTML script hash `DAR_T_i5`); the local `dist-kart/index.html` hash is `DOtq5ScL`.
- Vercel CLI has **no usable credentials**: `vercel deploy --prebuilt --cwd dist-kart --yes` reports `Error: No existing credentials found. Please run \`vercel login\` or pass "--token"`. The CLI auth file `/home/openclaw/.local/share/com.vercel.cli/auth.json` exists but is empty (0 keys), and no `VERCEL_TOKEN` environment variable is present.
- Without a token or dashboard access, the current process cannot authorize a deploy to the existing preview URL, nor can it confirm the Vercel project/GitHub linkage.

## Rollback pointer

If this Stage 7 commit needs to be reverted, reset to `431df0e3726d7c9f867c85c31ebaf4492b729816` (Stage 0 baseline) or the Stage 7 marker recorded in `tmp/custom-comeback-city-pass/state.json`.

## Status

Stage 7 implementation and QA are complete; deployment to the configured Vercel preview URL is **blocked pending authorization**. The build artifact (`dist-kart/`) is ready to deploy once credentials are provided.
