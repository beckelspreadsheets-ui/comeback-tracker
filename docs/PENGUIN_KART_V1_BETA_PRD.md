# Penguin Kart V1-Beta PRD — standalone game, share-ready

**Date:** 2026-07-11 · **Parent docs:** [PENGUIN_KART_GRAPHICS_V2_PRD.md](PENGUIN_KART_GRAPHICS_V2_PRD.md) (budgets §8, gates §9), [PENGUIN_KART_CONTENT_ROADMAP_2026-07.md](PENGUIN_KART_CONTENT_ROADMAP_2026-07.md) (W4–W7 specs + STANDING RULES), [GRAPHICS_REVAMP_HANDOFF_PROMPT.md](GRAPHICS_REVAMP_HANDOFF_PROMPT.md) (live-state checkpoint).
**Provenance:** drafted from a 3-agent scout (split feasibility / mobile controls / roadmap extraction) with file:line refs verified at draft time (2026-07-11, HEAD 6c0a4a37).

**Owner scope approvals (2026-07-11, verbatim):**
- Split: *"lets split the fitness app and turn this into the actual penguin go kart game"* — approved, named a "huge win".
- Release strategy: beta share first, then V2 — *"its perfect currently as a little beta to share"*, *"then work on things for V2"*.
- Content before sharing: *"I do want to add in all the roster expansion item renders ect before sharing though they will make a huge jump."*
- Controls: *"the controls need to be better and more intuitive"* (his phone re-test pending).
- Explicitly deferred: share polish (*"not worried about the share polish YET"*), track improvements (*"tracks need some improvements"* → V2).
- Open: the game's NAME (*"I need to come up with a name for lol"*) — see §5.

---

## §1 The web-app "ceiling" — settled understanding

The 15 MiB / 8500 KiB-gzip budget is **our own first-load discipline, not a platform limit**. Native games amortize size behind a one-time store download; the web equivalent is **lazy loading + PWA caching**: keep the first-load core small (shell + menu + one track's essentials), stream everything else on demand, and let the service worker make every repeat visit instant. Post-split, per-asset lazy loading (characters, tracks, renders) is the standing pattern for new content — the budget then only guards what blocks first paint. Total content is effectively unbounded.

Practical note: GLBs are ALREADY runtime-fetched (not in the JS bundle's critical path) but are not precached (`glb` missing from workbox globPatterns — offline race broken by design today). K1 fixes the caching story for the kart PWA.

## §2 Scope

**V1-beta (this PRD, in order):** K1 kart-only build target → K2 fitness race-path diet → K3 mobile controls V2 → K4 outplayasians crosser → K5 five karts (W4.1) → K6 new characters (W4.2, owner-delivery-gated) → K7 item + feel renders (W5) → K8 menu/UI beauty pass (W6, end-stage by owner call) → K9 release cut + share.

**V2 (after group feedback):** track improvements (owner), ICE IS NICE gantry revamp (3-direction lab), casino-table ordinal posing round (needs owner JPEGs), start-line haunt figures (Lifo), share polish (og-image/social card), whatever the group surfaces.

**Not in scope, unchanged:** fitness app behavior (K2 touches only provably-dead code on its race path); the two fitness Pages deploys.

## §3 Budgets & measurement

- Current combined artifact: 13.486 MiB raw / **8490.01 KiB gz vs 8500** (~10 KiB spare — effectively zero).
- Scout-predicted kart-only artifact: **≈8.8 MiB raw / ≈6700 KiB gz** (removes: visualTokens chunk 2880 KiB raw/645 gz — which is mostly the 2.71 MB `plaza-scene-shapes.json` inlined via the DEAD ArcadeRace3D import chain — district facades ~856 KiB, recharts 375, zxing 436, fitness screens/helpers ~245).
- **Consequence: the queued 8500→9500 threshold proposal is likely unnecessary for the kart deploy.** Decision deferred to K1 exit, where real numbers land. New kart-only budget thresholds are set there (owner ack) and become the single bundle truth for K4–K9. The fitness build keeps the existing §8 thresholds untouched.
- Canonical perf protocol unchanged (PRD §4.2): headed prod build, median of 3, Mac mini M4 = desktop reference (vsync-144), iPhone 16 Pro Safari = mobile reference; floors 45 desktop / 30 mobile. **The 30-FPS mobile floor is untested on reference hardware since the miami ship — K3 closes that.**
- Battery before every ship: `test:race` · `test:kart-playable` both tracks · `test:bundle` (kart variant after K1) · `assets:check` · `race:proof` (re-baseline only on designed visual change) · phase5 headed when perf could move. Headless FPS never quotable. Never run two vite-spawning suites concurrently — and check `sysctl -n vm.loadavg` before believing a red headless proof (owner's VM/Codex load fakes failures; proven 2026-07-11).
- STANDING RULES (roadmap bottom) apply to every K-task verbatim — notably NO GENERIC PENGUINS, no generator lettering, orientation lab before promotion, manifest + owner quote per asset, one variable per change, `grep "new GLTFLoader(" src/` = exactly 1 hit.

---

## §4 The PRs

### K1 — Kart-only build target (the split)

**Why:** the fitness app (~4.7 MB raw / ~1.78 MB gz incl. the dead visualTokens chain) rides in the game deploy and is precached by the SW on every first visit. The deploy target is already a separate Pages project (`comeback-city-kart`), so this is a second build artifact, not a repo split. The shipped 3D runtime is verified fitness-state-free (props only `{character, kart, track, mode, runId, reducedMotion, onFinish}`; picks in `cc-kart-*` localStorage keys).
**Effort:** ~1 day · **Depends on:** — · **Owner gate:** name + icon/manifest text when he has them (placeholder "Penguin Kart" ships the PR); ack the new kart-only budget thresholds at exit.
**Files:**
- `vite.config.kart.js` (NEW — clone plugins; kart PWA manifest name/short_name/theme/icons, landscape-friendly; workbox: add `glb` to globPatterns or a CacheFirst runtimeCaching route — all GLBs < the 4 MiB cap; keep `/sw.js` + `/registerSW.js` paths and no-cache headers so installed fitness SWs on the kart origin swap cleanly via the existing autoUpdate+reload path)
- `index.kart.html` (NEW — game title/meta; keep `viewport-fit=cover, user-scalable=no`)
- `src/kart/main.jsx` + `src/kart/KartApp.jsx` (NEW — mounts RaceScreen's intro → select → `ComebackCityThreeKartRace` flow WITHOUT `ArcadeRace3D`/WorldMode/usePersistedState; race results + reducedMotion in a small kart-local store; one-shot best-time migration from any legacy `comeback-tracker-v1` atom found on the kart origin, then ignore the atom)
- `public/kart/_headers` or build-time copy (kart CSP: keep `wasm-unsafe-eval`, `connect-src blob:`, `media-src blob:`, fonts; DROP openfoodfacts/USDA entries)
- `package.json` (`build:kart`, `deploy:kart` → `dist-kart` to `comeback-city-kart`)
- `scripts/bundle-asset-budget-report.mjs` (kart-budget mode over `dist-kart` with NEW thresholds set from measurement)
**Steps:** build the entry shell → wire config/manifest/CSP → local results store + migration → build + measure → set kart budgets → point the proof/battery suites' preview at the kart build where applicable (kart-playable and race:proof exercise `/#race` — they must run against `dist-kart` for the kart deploy; keep a fitness-mode escape hatch) → deploy on owner go → `node tmp/w0-ship/verify-live-deploy.mjs` + `tmp/live-coin-probe.mjs`.
**Acceptance criteria:**
- [ ] `npm run build:kart` produces `dist-kart` with NO recharts/zxing/fitness-screen/visualTokens chunks (verify by chunk list).
- [ ] Kart-only artifact ≤ predicted +10% (≈9.7 MiB raw / ≈7.4 MB gz worst case); new thresholds committed with owner ack.
- [ ] `npm run build` (fitness) output is byte-identical to pre-K1 (hash compare) — K1 adds, never mutates.
- [ ] Deep links + QA contract intact on the kart build: `#race`, one-shot `?track/?character/?kart` seeds, `playableAutoplay=1`, `raceAutoplay=1`, telemetry globals.
- [ ] Full battery green against `dist-kart`; live-verify + coin probe green after deploy.
- [ ] Installed-PWA upgrade path proven: a client with the old (fitness) SW on comeback-city-kart.pages.dev receives the kart shell on next visit (manual check with a kept profile).
- [ ] Offline replay works after one online race (GLB caching in effect).
**Perf gate:** none beyond battery (no runtime changes) — but capture one headed phase5 pair as the kart-build baseline label.

---

### K2 — Fitness race-path diet (dead-code removal)

**Why:** `RaceScreen.jsx` has an unreachable second `return` (old ArcadeRace3D + garage/shop/credits UI, dead since the first `return` at ~2184) whose STATIC import chain (`RaceScreen.jsx:29` → ArcadeRace3D → comebackCityVisualTokens → plaza-scene-shapes.json 2.71 MB + 5 district-facade PNGs) costs the FITNESS app 2.88 MB on every `#race` visit too. `pixi.js` is an orphaned dep (only importer has zero reverse imports).
**Effort:** hours · **Depends on:** K1 (so the kart build exists first and diffs stay reviewable) · **Owner gate:** ⚠️ confirm the credits/garage/shop economy stays shelved — deleting the dead block deletes its only (unreachable) UI. The derivation modules (`gameProfile.js`, `raceProgression.js`) STAY (world hub uses them); only the dead RaceScreen block + import go.
**Files:** `src/game/RaceScreen.jsx` (delete dead block + ArcadeRace3D import), `package.json` (remove pixi.js), world-hub visualTokens chain untouched.
**Acceptance criteria:**
- [ ] Fitness `#race` no longer loads the visualTokens chunk (network panel proof).
- [ ] World hub renders unchanged (it legitimately uses visualTokens).
- [ ] Full battery green on BOTH builds; `test:visual`/`test:race:browser` pre-existing documented reds unchanged, no new reds.
**Perf gate:** none (removal only).

---

### K3 — Mobile controls V2 + real-device perf sign-off

**Why:** owner: controls "need to be better and more intuitive." Today's touch UI is one center row of six 52 px hold-buttons: accel is a HOLD button (not auto), steering is two adjacent digital buttons, drift+throttle+steer needs three fingers, no safe-area inset, no pointer capture/cancel, cluster renders on desktop too. All input flows through `inputRef` booleans (`ComebackCityThreeKartRace.jsx:4164`) read once per frame — physics never touches DOM events, so this is a UI-layer rewrite plus one small analog hook.
**Effort:** 1–2 days · **Depends on:** K1 (ship on the kart build) · **Owner gate:** feel pass on his phone (before/after clips); layout A/B if contested.
**Spec (each maps to the existing input path):**
1. **Auto-accel on touch devices** — default `throttle=true` for coarse-pointer sessions (precedent: autoplay bot, line 4044); brake button stays for hairpins; drops the row to 4 targets.
2. **Analog steer zone, left half of canvas** — drag zone (virtual stick): add `inputRef.steerAxis` float; `targetSteer = steerAxis ?? (right−left)` at ~4599. Proven in-repo pattern: world hub `gestureDrive` (`WorldScene.jsx:393, 3422-3443`, `steer = clamp(dx/90,-1,1)`). `driftFeel` already consumes float steer (`minSteer 0.18`) — no physics change.
3. **Right-thumb cluster:** DRIFT (big, hold-to-drift is already the model — hop→commit needs steer held at landing, which analog steer satisfies) + ITEM (the 0.35 s cooldown already debounces; keep armed-glow + chip). Optional: swipe-up in right zone = same `drift` key for tricks (mid-air `actionHeld` reuses it).
4. **Layout hygiene:** split clusters bottom-left/bottom-right, ≥64 px targets, `env(safe-area-inset-bottom)` (world hub does it right at `WorldScene.jsx:4371`), `touch-action:none; user-select:none` (copy `.world-touch-button` rules `index.css:277-292`), `setPointerCapture` + `onPointerCancel` (reuse `applyRaceTouchPatch` pattern `raceControlsBase.js:232-242`), gate the whole cluster behind `pointer: coarse` (kills desktop phantom buttons), aria-labels on all controls.
5. **Perf:** extend the mobile render-scale heuristic beyond `aspect < 0.74` so landscape phones stop getting the 0.85 desktop scale (`createRaceScene.js:71-73`); `RACE_RENDER_SCALE.mobile` is the knob if the real-device pass misses the floor.
6. **QA:** testids on every control + a synthetic-pointer smoke (390×844) mirroring the select-flow probes; keep `?playableAutoplay=1` untouched.
- Tilt steering: OUT of V1-beta (iOS permission prompt + net-new plumbing; revisit on group feedback).
**Acceptance criteria:**
- [ ] One-thumb-per-hand play: steer with left thumb, drift+item with right, never >2 simultaneous touches required.
- [ ] Slide-across-steer retargets (pointer capture), no stuck inputs on `pointercancel`.
- [ ] Desktop shows no touch cluster; keyboard unchanged (W7.1 WASD item key folded in here: add E/F while keeping Shift/Enter, update guide copy).
- [ ] Synthetic-pointer smoke green; kart-playable both tracks green.
- [ ] **Real-device sign-off: iPhone 16 Pro Safari, plugged in, ≥30 FPS medians on both tracks** — first mobile reference measurement since miami; record in evidence + PRD §8.
**Perf gate:** the 30-FPS floor above; phase5 headed desktop pair to confirm no regression from input changes (expect none — UI layer only).

---

### K4 — Outplayasians finish-line crosser (approved content)

**Why:** likeness APPROVED 2026-07-10 ("asians looked great"); dieted mesh in-repo at `tmp/w3-pv-props/outplayasians-diet.glb`; the bundle blocker dissolves with K1 headroom.
**Effort:** ~½ day · **Depends on:** K1 (headroom) · **Owner gate:** in-game look check (clip); roster seat = SEPARATE owner call (K6).
**Spec (per handoff):** orientation lab FIRST (never guess facing) → wire as PV finish-line SLOW crosser via `raceCrossers.js` template (penguin-march at progress 0.82 is the model) near progress ~0.0, partial-width, tuned so a driving line ALWAYS exists; autoplay dodge must handle him.
**Acceptance criteria:**
- [ ] Orientation lab capture archived; manifest record with both hashes + approval quote.
- [ ] kart-playable BOTH tracks green (the gate — autoplay must survive him).
- [ ] Mounts guard covers the new GLB (loud 404).
- [ ] race:proof re-baseline (designed visual change) + battery green.
**Perf gate:** phase5 headed PV pair (new always-rendered mesh on track).

---

### K5 — Five new karts (W4.1)

**Why:** owner: "we need 5 new cars"; karts are agent-generatable (no ordinal likeness involved).
**Effort:** 2–3 days incl. lab rounds · **Depends on:** K1 headroom · **Owner gate:** kart-lab turntable picks (V2 trait-card bar: chunky tires, wide low body, empty cockpit w/ driverMount headrest); misses fall back to owner Tripo Studio.
**Pipeline per kart:** tripo_3d (quality=detailed, "NO people, NO animals, NO penguins" in every prompt) → diet (individual verbs, meshopt LAST, remember: second simplify at 0.001 is a NO-OP) → orientation lab → `KART_OPTIONS` stat spread → select portrait capture → manifest record.
**Acceptance criteria:**
- [ ] 5 karts selectable with distinct stat spreads; portraits in select; guide copy updated.
- [ ] Kart-only bundle within K1 thresholds (lazy-load per-kart GLBs if tight — assets are runtime-fetched already, so this is precache/manifest tuning, not code).
- [ ] Battery + race:proof + phase5 headed pair green.
**Perf gate:** phase5 headed both tracks (roster meshes affect rival seats).

---

### K6 — New penguin characters (W4.2/4.3 — owner-delivery-gated)

**Why:** the "huge jump" content. Inventory (roadmap W4.3, verbatim statuses):
| Key | Status | Needs |
|---|---|---|
| outplayasians | mesh in-repo, likeness approved | owner call: roster seat yes/no; then wiring only |
| lifoladen | sheet ready (non-ordinal) | OWNER: Tripo Studio run (seated driving pose, TRIPO_AVATAR_HANDOFF.md) |
| ak47 / denomad / georgefx | tiny ordinal pixel sources | OWNER: ChatGPT multi-view sheets (NEVER upload ordinal art to Higgsfield — §2.2 open) → owner Tripo Studio |
| lifo | non-ordinal, NOT playable | V2 haunt figure — out of K6 |
**Effort:** ~½ day per delivered GLB · **Depends on:** owner deliveries (each character lands independently — do NOT block the release on stragglers) · **Owner gate:** per-character likeness check + roster seat call.
**Pipeline per GLB:** meshopt diet → orientation lab → `KART_CHARACTERS` + rival seat + select portrait + manifest.
**Acceptance criteria (per character):**
- [ ] Selectable + appears as rival; portrait; manifest w/ owner quote; battery green.
**Perf gate:** phase5 headed pair after the batch lands.

---

### K7 — Item + feel renders (W5) + HUD icon unification

**Why:** re-skin the 7 item props (fish bone, snowball, cocoa, shield bubble, sardine rocket, blizzard cloud, avalanche marker) + boost-pad geometry + drift spark/trail/mini-turbo tiers via the proven generated-3D pipeline; held-item HUD icons reuse the renders so guide ↔ chip ↔ world share one visual language. Owner's chip revision (W7.2 — direction still TBD, ASK with the icon set in hand) folds in here.
**Effort:** 1–2 days · **Depends on:** K1 headroom · **Owner gate:** one lab round per batch (oversized + glowing per race-speed readability rule; icons are a similarity trap — owner review per icon, original shapes only).
**Acceptance criteria:**
- [ ] All 7 props + pad + drift tiers re-skinned behind owner picks; lucide fallbacks gone from HUD/guide.
- [ ] Item behavior UNTOUCHED (validators prove semantics; one variable per change).
- [ ] Battery + race:proof re-baseline + phase5 headed pair green.
**Perf gate:** phase5 headed both tracks.

---

### K8 — Menu/UI beauty pass (W6 — end-stage, immediately pre-share)

**Why:** owner parked it for exactly this moment ("things to refine at the end when we lock down everything"); it is the first thing the group sees. Diagnosis on file: three skinny columns adrift in empty navy; zero art on screens gating a game whose art is the selling point.
**Effort:** 1–2 days · **Depends on:** K5/K6/K7 (content lock: portraits + renders are the ammunition) · **Owner gate:** before/after captures.
**Spec:** backdrop strips as menu art (zero new bytes), portraits as select cards, K7 renders as guide thumbnails, 2-col item grid, bigger type, mobile pass on both screens. **Keep every existing testid** (`race-intro-*`, `race-track-*`, `race-character-*`, `race-kart-*`, `race-open-item-guide`).
**Acceptance criteria:**
- [ ] Select + guide screens pass the owner's eye on desktop AND his phone; testids intact; select-flow probes green.

---

### K9 — Release cut + share

**Why:** the beta goes to the Ordinals group for suggestions (PRD §8 community bar: link to ≥5 members; success = ≥1 unsolicited screenshot/clip within 48 h, archived).
**Depends on:** K1–K8 (K6 ships whoever has landed) · **Owner gate:** the name; final go.
**Steps:** full battery + phase5 headed medians + real-device mobile pass → freeze budgets → deploy + live-verify + coin probe → owner shares the link (share *polish* stays V2 per owner).
**Acceptance criteria:**
- [ ] Everything green at the release commit; handoff checkpoint + memory updated; V2 backlog seeded from group feedback.

---

## §5 Owner gate table (V1-beta)

| Decision | Status |
|---|---|
| Game NAME + PWA title/icon text | ⏳ OWNER — candidates to react to (no Nintendo trade dress; avoid "Pengu" = Pudgy Penguins token): Penguin Grand Prix · Waddle Wheels · Ordinal Rush · Sub-Zero Circuit · Penguin Kart (plain) · Blockchain Blizzard |
| Kart-only budget thresholds (set at K1 exit) | ⏳ measure → owner ack |
| Bundle 8500→9500 raise | 🔄 LIKELY SUPERSEDED by K1 (~1.8 MB gz freed) — decide on real K1 numbers |
| Economy (credits/garage/shop) stays shelved | ⏳ confirm before K2 deletes its dead UI |
| fpsWarmupMs 2500→4000 gatesNote | ⏳ carried from 2026-07-11 (approvals-hub top) |
| Chip revision direction (W7.2) | ⏳ ASK at K7 with the icon set in hand |
| Outplayasians roster seat | ⏳ separate from crosser (K4 ships regardless) |
| Deliveries: 3 ordinal ChatGPT sheets · lifoladen Tripo run | ⏳ OWNER — each unblocks its K6 character independently |
| Mobile controls feel pass | ⏳ at K3 on his phone |

## §6 Where owner reviews land

approvals-hub.html "Decisions waiting on you" stays THE queue; every pick recorded verbatim in the roadmap + asset manifest; per-task gates live in each K-task's Owner-gate field above (PRD §9 footnote pattern). Live game: https://comeback-city-kart.pages.dev/#race (PV: `?track=penguin-village#race`).
