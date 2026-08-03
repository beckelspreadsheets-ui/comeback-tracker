# Comeback City Kart — Gameplay Feel Plan (Phases 1–5)

Owner-approved roadmap (2026-06-12) to take `/#race` from "looks premium" to "plays amazing."
Execute phases **in order, one at a time**, each ending with the full QA gate suite and an
updated `tmp/v2-approval-preview.html` for owner review.

## Context for a fresh session

- Runtime: `src/game/ComebackCityThreeKartRace.jsx` (single-file Three.js runtime mounted at `/#race` via `RaceScreen.jsx`). Neon-dusk world, bloom + shadows, MK-style track-locked camera.
- Art is owner-approved: Tripo hero-card kart = player body; Kenney recolors = rival bodies; roster = CRRT Bunny (player), CRRT Penguin (Blue Speed), Seth Penguin (Purple Lab); Orange Muscle seat open.
- QA gates (all must pass after every phase): `npm run build`, `test:kart-playable`, `test:kart-3d-spike` (FPS median ≥ 34 on production build), `test:race`. Visual check: `node scripts/camera-probe-capture.mjs`.
- Key sim facts: progress is 0..1 along a CatmullRom centerline (`sampler.pointAt(progress, lane)`); lane is −0.66..0.66; speed max 228 (boost 284); lap wrap at progress 0; physics constants live at the top of the runtime file. Legacy modules under `src/game/race/` (kartTuning.js has 3-tier drift constants; raceAudio.js exists) can be mined for tuning values.

## Phase 1 — Drift & mini-turbo feel (the central mechanic)

Goal: MK-style drift that is *the* reason corners are fun.

- Hop: tap drift → small visual hop (~0.3s squash/stretch), drift starts on landing if steering.
- Committed drift: while drifting, the kart slides — drift direction locks to the initial steer side; steering within the drift tightens/widens the arc (counter-steer control) instead of switching sides.
- Visible slide angle: kart yaw offsets from velocity direction (~18–30°) with lateral slip.
- 3 spark tiers by held duration (mine `kartTuning.js` DRIFT_TUNING: charge times ≈ 0.55s / 1.3s / 2.15s): tier colors blue → orange → purple on the existing drift spark group; spark size/intensity escalates.
- Release: mini-turbo boost scaled by tier (≈0.5s / 0.9s / 1.4s), exhaust flare, small FOV/camera kick, boost trail.
- Tuning targets: drift should hold through the gym sweeper and lab S-turn on one charge; tier 3 reachable only on the two longest corners.
- Telemetry: add `driftTier`, expose `miniTurbo` properly (PRD contract lists them).
- Gate: drift visibly changes kart pose + sparks tier up + release boost reads on screen; all QA suites pass; owner feel-check.

## Phase 2 — Real rivals & positions (make it a race)

Goal: rivals you can actually pass and lose to.

- Replace phase-locked rivals (currently `race.progress + phase` — impossible to pass) with independent per-rival progress simulation: target speed per rival personality, simple racing line (lane drift toward apex), boost pad usage.
- Rubber-band: rivals never fall > ~4s behind or pull > ~3s ahead before the final lap; final lap loosens so finishes are earned.
- Kart-vs-kart collision: radial bump with small speed penalty + knock impulse; no spinouts yet.
- Position tracking: live placement (1st–4th) from progress+lap; HUD position badge; final placement on results (replaces hardcoded `place: 1`).
- Personalities from the avatar sheets: Penguin (Blue Speed) = clean dependable lines; Seth (Purple Lab) = erratic late-braker; Orange Muscle = aggressive bumper.
- Telemetry: `position`, `rivalPositions` (PRD contract).
- Gate: automation can finish 2nd/3rd (not always 1st); overtakes visible; QA suites pass.

## Phase 3 — Items that work

Goal: item boxes give a held item you fire.

- Held-item state + HUD slot (icon in DOM HUD): roster for MVP = **boost bolt** (instant mini-turbo tier 2), **shield** (blocks one hit, visual bubble — shield visuals exist in legacy `createKartModel.js`), **banana** (drops behind; spins out karts that hit it — model already at `src/assets/game/models/toy-car-kit/item-banana.glb`).
- Fire input: desktop = Shift/Enter; mobile = item button (replace one HUD slot).
- Rivals use items occasionally (random-free: keyed to progress thresholds for determinism).
- Spin-out state: brief 360° spin + speed drop when hit (also used by Phase 2 collisions later).
- Resolve the banana-vs-V2-card mismatch noted in the PRD review: bananas are now IN (model exists); update PRD item table.
- Gate: pickup → HUD shows item → fire → visible world effect; QA suites pass.

## Phase 4 — Audio

Goal: the race *sounds* alive (WebAudio, no asset downloads needed — synthesize or adapt legacy `src/game/race/raceAudio.js`).

- Engine loop: pitch/volume tracks speed (the single biggest feel multiplier).
- Drift screech while drifting; tier-up chirp per spark tier; mini-turbo whoosh on release.
- Boost pad hit stinger, item pickup chime, item fire sound, banana-hit comedic slip.
- Countdown beeps + start blast; finish fanfare; position-change sting.
- Respect `reducedMotion`/mute: reuse the audio toggle pattern from legacy `raceHud.jsx` (`race-audio-toggle` testid — also un-breaks part of the legacy browser-playtest expectations).
- Page lifecycle: suspend AudioContext on blur (there's a `test:lifecycle` smoke test for this).
- Gate: audio reacts to speed/drift/boost/items; mute works; QA suites + `test:lifecycle` pass.

## Phase 5 — Juice (screen feel)

Goal: every event has visual punch.

- Boost: radial speed lines (screen-space sprite ring), slight camera shake, FOV already widens.
- Drift release: spark burst + short trail ribbons behind wheels.
- Landing from bridge/hop: dust puff + small camera dip.
- Overtake: brief position badge pulse.
- Per-character VFX (owner's idea): CRRT Bunny = carrot-rocket boost trail; penguins = ice-shard drift sparks. Implement as per-driver VFX palette swap.
- Finish: confetti burst at the gate (matches "MISSION COMPLETE!" energy of the avatar sheets).
- Budget rule: every effect must keep FPS median ≥ 34 in the spike gate; prefer additive sprites over particles-per-frame allocations.
- Gate: QA suites pass; owner playtest scores the feel rubric (the final Race-V1 DoD item).

## After Phase 5

- Owner manual QA rubric + 10s fresh-user clip (last Definition-of-Done items).
- Then: more characters/karts via the proven Tripo pipeline (`docs/TRIPO_AVATAR_HANDOFF.md`), Orange Muscle avatar, track expansion per the game PRD (Tide Pier next, needs its sheet set first).

## Ultraplan kickoff prompt (paste this in the next session)

```
Read docs/GAMEPLAY_FEEL_PLAN.md and the memory file kart-art-direction-feedback.
We are executing the gameplay feel plan phase by phase, starting with Phase 1
(drift & mini-turbo). The art direction is owner-approved and locked — do not
change the look, lighting, models, or camera framing. Work only in
src/game/ComebackCityThreeKartRace.jsx and new modules under src/game/race/.
After each phase: run npm run build, test:kart-playable,
test:kart-3d-spike, test:race; regenerate the camera probe
(node scripts/camera-probe-capture.mjs); update tmp/v2-approval-preview.html
with a phase section; and stop for my feel-check before the next phase.
```
