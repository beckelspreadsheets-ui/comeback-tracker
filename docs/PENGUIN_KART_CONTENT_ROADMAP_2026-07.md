# Penguin Kart Content Roadmap — July 2026

**Date:** 2026-07-07 · **Owner:** Andrew · **Status:** owner-drafted scope, agent-detailed. This is the "what are we adding and in what order" doc the owner asked for. Execution detail for W0 lives in the handoff doc (JOB 1 checklist); this doc owns the queue.

**Owner quotes anchoring scope:** "we need 5 new cars"; "I'm going to add more penguins as characters I have the JPEGS or character sheets for"; "one named outplayasians (that I have 3d rendered can share) and hes going to walk across the finish line slowly blocking part of it on the penguin village"; "penguin village is loading the miami vice vibes instead of its own full map"; "the ICE IS NICE needs to be way better of a sign and cooler"; "re vamp the entire side 3d items like we did with miami vice"; boost/item feedback from the same session (see W2).

---

## Priority order (start at the top)

| # | Workstream | Size | Blocked on |
|---|---|---|---|
| W1 | **BUGFIX: track select ignored when `?track=` is in the URL** — ✅ DONE 2026-07-07 | hours | nothing — do first |
| W0 | **Ship miami mode** (promotion; handoff JOB 1 checklist) — ✅ SHIPPED 2026-07-07 | 1-2 days | W1 (so the owner can verify both tracks properly) |
| W2 | **Item/track clarity revamp** (boost pads, item audit, item boxes, held-item HUD icon) | 2-3 days | W0 shipped |
| W3 | **Penguin Village visual revamp** (arctic 3D set + ICE IS NICE + outplayasians crosser) | 2-4 days | owner asset intake (partial); W0 pipeline reuse |
| W4 | **Roster expansion** (5 new karts + new penguin characters) | 2-4 days | owner character sheets/GLB intake |
| W5 | **Item 3D renders** (item props get the same generated-3D treatment) | 1-2 days | W2 (audit first, then beautify) |

---

## W1 — Bugfix: cup-select track choice loses to the `?track=` URL param

**Verified root cause (2026-07-07):** `ComebackCityThreeKartRace.jsx` trackKey resolution (`useMemo` ~:3972) returns the `?track=` URL param UNCONDITIONALLY when present, overriding the `track` prop from the RaceScreen cup select. Any URL carrying `?track=comeback-city` (e.g. the sky-lab drive links) locks every subsequent race to Comeback City no matter what the owner picks — which is exactly "penguin village is loading the miami vice vibes instead of its own full map."

**Fix:** the URL param must SEED the initial selection, not override the pick. Preferred: RaceScreen reads `?track=` once to preselect the cup-select entry; the race component trusts its `track` prop (delete the param branch from trackKey, keep `?character`/`?kart` QA behavior consistent — audit them for the same trap while in there). QA capture URLs keep working because they never touch the select flow.

**Verify:** manual — load `/?track=comeback-city&skyLab=1#race`, back out, select Penguin Village, confirm arctic map; suites — test:race, test:kart-playable (both tracks use ?track and must keep working).

**✅ FIXED 2026-07-07.** As specced: the race component is now PROP-ONLY for track/character/kart (all three had the identical trap — param branches deleted from the `trackKey`/`characterKey`/`kartKey` useMemos); `RaceScreen` seeds its select state from `?track`/`?character`/`?kart` (param → localStorage → default, visible as the preselected tile) and the seed is ONE-SHOT — a RaceScreen effect strips the three params via `history.replaceState` once consumed, so a stale share/lab URL can't re-seed over the saved pick on later re-entries (the app router deliberately preserves `location.search`; without the strip, a stale param would shadow the owner's saved pick on every remount — adversarial-review finding); `KartPlaytestHarness` (kart-playtest.html — prop-less mount used by phase5) now reads the params itself and passes them as props. Verified: `tmp/w1-track-select/probe-track-select.mjs` (4 scenarios: owner repro with webdriver spoofed off — stale `?track=comeback-city` + Penguin Village pick → races penguin-village with the seed visibly preselecting CC; one-shot strip + SPA re-entry preselects the SAVED pick; `#race` QA seed path; harness prop path — ALL PASS), test:race green, test:kart-playable green both tracks (PV leg's `?track=penguin-village` exercises the seed path, `passed: true`, bakedBuildings active). A 3-lens adversarial review swept EVERY repo consumer of these params (scripts/, tmp/ lab captures, docs, CI — all Playwright consumers are webdriver contexts that skip the select, so the seed reaches the race as props) — all compatible. Known accepted change: the `#race-3d-spike` route (prop-less App.jsx mounts) no longer honors `?track=` — no committed script used it (kart-3d-spike-test.mjs passes only `?playableAutoplay=1`); seed props in App.jsx if ever wanted again. Pre-existing, untouched, noted for later: the race component's main scene effect omits `trackKey` from its dep array (unreachable today — no caller swaps the track prop while mounted), and `data-race-track` on the RaceScreen shell still reflects the legacy 2D `RACE_TRACKS` state, not the kart track raced.

## W0 — Ship miami mode (promotion)

Full checklist lives in `docs/GRAPHICS_REVAMP_HANDOFF_PROMPT.md` (JOB 1). Headline: bundle math (~7.6MB new assets vs ~2.5MiB headroom → 512px texture re-diet + meshopt, else owner threshold decision), asset moves + manifest + similarity-review records, corner-arcade neon regen (letter-ish squiggles), far-band top-fade smoothing, default flip with `?skyLab=0` escape, retire old dressing + baked-buildings gate deliberately, full battery + proof re-baseline.

**✅ SHIPPED 2026-07-07 (all six checklist items).** MIAMI MODE IS THE DEFAULT — `?skyLab=0` is a bare-districts diagnostic (the old skyline/facade-run/boxy-district dressing is deleted for good; the district facade PNGs stay for the WORLD HUB, which still uses them). Key numbers/decisions: (1) bundle GREEN 13.008 MiB / 8056.9 KiB gz vs 15.0/8500 — required a HARD diet (second simplify at ratio 0.35 / **error 0.01** — a second pass at error 0.001 is a NO-OP, the error bound caps collapse; then resize 512 + meshopt): six GLBs total 1.20 MB, per-asset A/B turntables in `tmp/w0-ship/diet-ab-*.png` show silhouettes/railings intact; (2) corner-arcade regenerated for the no-text rule — roll 1 (job 640dc6be) rejected (lost the approved two-story massing, chevron neon read "V<"), roll 2 (job 3eb890c1, detailed quality) SHIPPED: approved massing + strictly circles/dots/bars neon (A/Bs `tmp/w0-ship/arcade-regen*-ab.png`, 10cr total); (3) far bands reprocessed from the same CDN jobs at fade_frac 0.35; (4) assets promoted to `src/assets/game/models/miami/` (under the audited runtime root — new `trackside-building` budget class + classifications; `assets:check` fail=0) + `generated/backdrops/`; manifest records carry jobIds, both hashes, owner approval quotes/dates; workbox globPatterns gained `webp`; (5) baked-buildings.glb + loader + kart-playable `bakedBuildings==='active'` assertion retired DELIBERATELY, replaced by the `miamiMounts` loud-failure telemetry gate (requested/mounted/failed — kart-playable asserts 0 failures; the 2026-07-02 silent-404 lesson carries over); (6) battery: test:race ✓ test:kart-playable ✓ both tracks (miamiMounts 40/40/0) ✓ test:bundle ✓ assets:check ✓ test:track-visuals ✓ test:kart-proof ✓ `?skyLab=0` probe ✓ race:proof re-baselined `status=pass errors=0` — proof gates moved with owner note (maxDrawCalls 650→800: shipped camera.far 1800 un-culls under the top-down proof camera, measured 746; minFps 12→8: headless diagnostic, measured 10; rationale in proof-scenarios.json `gatesNote`, **owner sign-off pending**) ✓ phase5 HEADED median-of-3: **CC 143.75 / PV 143.88 — vsync-locked 144 both tracks**, tris 499k vs 900k gate. PRD §8 headroom updated: 1.99 MiB raw / 443 KiB gz / ~1.83 MiB images remain — the gzip envelope is now Phase C's binding constraint. Deploy is owner-triggered per repo deploy rules.

## W2 — Item/track clarity revamp

Owner feedback verbatim: "The boost aren't very clear. It's hard to tell and sometimes the fish doesn't spin you out so I feel like we just need to re-look over all the items. Make sure they work and actually add in a couple different item boxes and way for when you pick up an item you know what it is maybe a little icon underneath near the item throw."

1. **Boost pads** — clarity lab: 3-4 treatments captured in-game, owner picks. Owner 2026-07-07: boost (and drift) "should also get 3d renders" — so candidates include generated-3D pad geometry (raised chevron ramp, glowing arrow slab) alongside brighter/animated texture options; drift feedback assets (spark/trail/mini-turbo tier visuals) get a render pass in W5.
2. **Item audit** — pure-node validators in race-content-playtest proving EVERY heldItems.js item applies its effect + every rival/player interaction path. **Fish-bone no-spin suspect:** the 0.3s arm delay added with kart-contact (6a016533) — point-blank hits inside the window never arm. Decide the feel fix with the owner (shorter arm / armed-state visual / arm-on-throw-clear).
3. **Item box variety** — 2-3 new box designs via the tripo_3d pipeline; keep the `?` readability rule (oversize + glow, race-speed legible).
4. **Held-item HUD icon** — icon near the item/throw button (mobile + desktop) showing the held item. Ties into H5: generated `ITEM_ICON_URLS` sprite map replacing the lucide ternary chain (~:4500s). Icons are a similarity trap — owner review per icon, original shapes only.

## W3 — Penguin Village visual revamp (the Miami treatment, arctic edition)

Same pipeline that built Miami (tripo_3d text-to-3D → diet-mesh.sh → turntable lab → owner picks → mount tables), PV flavor:

1. **PV trackside 3D set** — candidates: ice-block hotel / aurora lodge, ice-fishing huts, market stalls v2, igloo cluster v2, frozen-fountain / ice-sculpture props, **gambling/trading tribute props** (ordinals group culture — ASK THE OWNER FOR HIS LIST before generating; he has one, per session memory).
2. **THE ICE IS NICE gantry, "way better and cooler"** — lab 2-3 directions: (a) giant 3D ice-sculpture letters with cyan inner glow on a new gantry, (b) animated neon flipbook billboard (H4 spec + `scripts/make-flipbook.mjs` are ready and validated), (c) carved-into-a-glacier-face marquee. The slogan text itself is an owner brand element — composite the real lettering deliberately (flipbook spec rule), never generator gibberish.
3. **Existing dressing policy** — penguin statues STAY (community identity; owner may later swap real ordinal GLBs into the mounts); igloos/stalls replaced piece-by-piece only where the generated version wins an A/B.
4. **W3.5 — start-line "haunt" figures (owner 2026-07-07):** Lifo is NOT a playable character — he becomes trackside assets that "haunt people as they race to start," and the owner wants "a few like that" (a small family of ambient character presences: looming/watching figures near the start grid, half-lit at the edges of the opening straight). Rationale: ambient character presence makes the world read inhabited ("a lot more realistic" — same instinct as the PRD "everything animates" pillar). Build: 2-4 haunt figure meshes (Lifo likeness from Lifo.jpg via Meshy image-to-3D — non-ordinal, cheap pipeline allowed — plus a couple of owner-steered companions), placement/intensity lab round (subtle vs prominent, eyes-glow vs silhouette), owner picks; track assignment owner call (start areas of PV and/or CC). Keep them stationary-spooky, not gameplay-affecting (no collision on the racing line).
5. **outplayasians finish-line crosser** — owner-supplied 3D render becomes a SLOW walker crossing the finish line, partially blocking it, PV only. Implementation: the crosser system (`raceCrossers.js`; penguin-march at progress 0.82 is the template) gains a `finish-blocker` entry near progress ~0.0 with low speed + partial-width coverage. Gameplay-affecting: tune width/speed so a line always exists, autoplay dodge sense must handle it (kart-playable both tracks must stay green), and hit = normal crosser penalty. Character mesh through orientation lab first.

## W4 — Roster expansion

1. **5 new karts.** Kart bodies are player-selectable (hero-adjacent). Plan: generate candidates cheap via tripo_3d (quality=detailed) in a kart-lab turntable; owner judges against the V2 trait-card bar (chunky tires, wide low body, empty cockpit with driverMount headrest). Any that miss the bar fall back to the owner's Tripo Studio multi-view flow. Each kart: orientation lab (authored yaw), stat spread in KART_OPTIONS, select-screen portrait capture, wheel nodes optional (Kenney-style spin/steer only if the mesh has them).
2. **New penguin characters from owner character sheets.** Owner has JPEGs/sheets ready (currently in `~/Downloads/3d animations/`). Per character: sheet → owner Tripo Studio (seated driving pose, no held props — docs/TRIPO_AVATAR_HANDOFF.md) → GLB intake → meshopt diet → orientation lab → KART_CHARACTERS + rival seat + select portrait. **outplayasians** already has an owner 3D render — goes straight to intake, doubles as the W3 crosser and (owner call) a playable character.
3. **Intake DELIVERED 2026-07-07** — `3d generations:character sheets/fresh add ons/` (in-repo path, kept UNTRACKED like the rest of the raw-art folder; this inventory is the record). Owner: "all ordinal penguins besides lifo and lifoladen." Per-file pipeline:

| File | Character key | What it is | Next step |
|---|---|---|---|
| `AK-47-pengu.png` (927 B) | `ak47` | tiny ordinal pixel source | needs a multi-view character sheet first — OWNER ChatGPT flow (H1 default; do NOT upload ordinal art to Higgsfield — §2.2 license gate still open) → owner Tripo Studio → GLB |
| `Denomad-pengu.png` (748 B) | `denomad` | tiny ordinal pixel source | same as ak47 |
| `georgefx.png` (709 B) | `georgefx` | tiny ordinal pixel source | same as ak47 |
| `Lifo.jpg` (42 KB) | `lifo` | small art (NOT ordinal) | **NOT PLAYABLE (owner 2026-07-07): Lifo becomes start-line "haunt" ambience — see W3.5.** Non-ordinal, so the cheap pipeline is allowed: Meshy image_to_3d from Lifo.jpg for likeness (or tripo_3d prompt), diet, orientation lab |
| `lifoladen-charactersheet.png` (2.9 MB) | `lifoladen` | ready character sheet (NOT ordinal) | straight to owner Tripo Studio (seated driving pose, TRIPO_AVATAR_HANDOFF.md) |
| `Outplayasians 3d pengu.png` (1.7 MB) | `outplayasians` | render IMAGE of the owner's existing 3D model | **need the actual GLB** — owner said "can share"; drop as `outplayasians.glb` in the same folder. Doubles as the W3 finish-line crosser |

   Every delivered GLB: meshopt diet → orientation lab → KART_CHARACTERS roster + rival seat + select portrait + manifest.

## W5 — Item + feel 3D renders (after W2)

Once the audit proves behavior, re-skin item props (fish bone, snowball, cocoa, shield bubble, sardine rocket, blizzard cloud, avalanche marker) via the same generated-3D pipeline, one lab round, oversized + glowing per the race-speed readability rule. Held-item HUD icons (W2.4) reuse these renders for visual consistency. **Also in scope (owner 2026-07-07): boost pad geometry and drift feel assets** — 3D pad ramps/arrows (picked in the W2 lab) and drift spark/trail/mini-turbo tier visuals, so the core feel effects match the new asset quality bar ("now that we have the pipeline down we can really improve assets").

---

**Standing rules that govern all of the above:** every GLB through createGameGltfLoader; orientation lab before promotion; diet with individual verbs (never blanket optimize); manifest + fingerprint + owner similarity review per asset; one variable per change with A/B captures; FPS floors 45/30; no Nintendo trade dress; PV/CC track identities stay visually distinct (owner enforced this on the backdrops).
