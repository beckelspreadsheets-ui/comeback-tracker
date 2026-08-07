# Handoff for the next run — renderer, trailers, and what audio/menus left behind

**Written 2026-08-07.** Paste the prompt at the bottom into a fresh context.
Everything here is verified state, measured this session, not recollection.

This supersedes `docs/AUDIO_AND_MENU_PLAN.md`, which is now **DONE** — do not
work from it. Its traps have been carried forward below where they still apply.

---

## STATE

Branch `aaa-kart-ci`. **Ten commits, none pushed.** `main` untouched.

| commit | what |
|---|---|
| `bbc7f5c1` | sample-playback path in `kartAudio.js` + `test:audio:samples` |
| `219949d1` | the 20 SFX one-shots, rendered offline |
| `a9a3e162` | sampled looping engine |
| `a510c744` | five missing kart portraits + `test:select:models` |
| `b3d3cc66` | live 3D select stage + premium rebuild of all 3 menu screens |
| `9b18dd29` | three music beds + measured mp3 loop point |
| `4a29739c` | `npm run audit:renderer` |
| `2331eca7` | scenery material/geometry sharing |
| `c0d7465d` | per-rig kart materials (measured zero — read the message) |

**Deployed:** everything up to and including the music (`9b18dd29`) is live and
byte-verified at https://aaa-preview.comeback-city-kart.pages.dev. The three
renderer commits are **committed but NOT deployed** — see the wrangler note.

**Owner verdicts:** menus "premium now" ✅ · SFX "good" ✅ · music "good" ✅ ·
engine sample "still not right — wait for ElevenLabs" (parked).

---

## THE ONE THING THE OWNER OWES

**ElevenLabs OAuth.** He has to run `/mcp` and pick "claude.ai ElevenLabs".
Until then there is no route to a *generated* engine loop or generated music:
Higgsfield's `sonilo_music` AND `mirelo_text_to_audio` are both marked **"Game
pipeline only"** in the tool description and the model catalog, which rules
them out for our assets. Everything shipped so far is authored offline instead.

He also switches Cloudflare accounts deliberately, so wrangler reverts. **Run
`npx wrangler whoami` before every deploy** — the kart project lives under
Showcasedesigns `9f01a1b31a298b112c22c3e00fe70a45`. If it says
`beckelspreadsheets@`, stop and ask; do not work around it.

---

## OPEN WORK, in the order it is worth doing

### 1. Item-prop material sharing — the actual fix for the program count

`npm run audit:renderer` measures this. Penguin Village is at **101 shader
programs against a 90 budget**, the only metric over.

The audit names the owners: the two largest duplicate groups (x44 and x17
`MeshToonMaterial` with a map) belong to **item props and coins** — owners come
back as `tripo_node_*` and `coin-flip`, with **106 props mounted** on Comeback
City. Each prop is its own GLB clone with its own material, so the fix is a
cache keyed by **prop type, shared across instances**.

**THE TRAP.** `fitItemPropScene` has an `unlit` branch for the blizzard fog
shells, and those get per-instance opacity writes in the frame loop
(`holder.userData.shells[0].material.opacity = 0.3 * fade`). A per-type cache
must exclude that branch or every fog dome fades together. This is the same
class of bug as the kart proximity ghost — which writes
`mesh.material.opacity = proximity` over every mesh of a kart — so **any**
material sharing has to be checked against who mutates it.

Do NOT re-try per-rig sharing on kart bodies and driver avatars. It was tried
at `c0d7465d` and measured exactly zero: those bodies already resolve to one
material each.

### 2. InstancedMesh for the procedural scenery

The `unnamed` group is **812 meshes / 543k triangles** on Penguin Village,
**476 / 447k** on Comeback City — repeated procedural scenery, the textbook
`InstancedMesh` case, and the biggest remaining lever on draw calls and
triangles. Bigger than item 1, and a real refactor of how scenery is built.

Related and worth questioning independently: **106 individually-mounted GLB
prop clones on one track** is a lot regardless of their materials.

### 3. Real-hardware frame timing

Nothing in this session judged frame rate, on purpose. This machine ran at load
**16–35** throughout. Structure (draw calls, triangles, texture bytes, program
counts) reads identically under load and is reported as fact; timing does not
and is printed by the audit as *advisory only*. Before optimising further it is
worth getting real numbers from the owner's gaming machine and a phone, so
effort goes where it is slow rather than where it is untidy.

### 4. Trailers

Owner wants these "at the end". The capture harness exists and there is finally
a soundtrack to cut against. Frames for a trailer must NOT come from this
machine — see the load note above.

---

## CURRENT RENDERER NUMBERS (`npm run audit:renderer`)

| | Comeback City | Penguin Village | budget |
|---|---|---|---|
| GPU draw calls/frame | 173–182 | 237 | 300 |
| GPU triangles/frame | ~746k | ~659k | 900k |
| shader programs | 85 | **101** | 90 |
| texture memory | 27.7 MiB | 27.3 MiB | 220 MiB |
| unique materials | 330 | 524 | — |
| duplicate copies | 183 | 237 | — |
| meshes per geometry | 1.19 | 1.22 | 1.0 = nothing shared |

Verdict given to the owner: a well-built mid-tier scene whose gap to top-tier
is **batching discipline, not visual features**. Texture memory is a non-issue;
do not spend effort there.

---

## GATES — 16, all green at handoff

Pure Node, immune to machine load:
`test:audio:samples` (54 checks) · `test:select:models` · `test:spline` ·
`test:freebody` · `test:laps` · `test:wrongway` · `test:offroad` · `test:pit` ·
`test:drift` · `test:minimap` · `test:race` · `test:bundle:kart`

Playwright (judge a red against `uptime` first — see traps):
`test:audio:kart` (12) · `test:select:stage` (14) · `test:kart-playable`

Not a gate, run it to measure: `npm run audit:renderer`
Renderers of content: `render-kart-sfx.mjs`, `render-kart-engine.mjs`,
`render-kart-music.mjs`, `select-portraits-capture.mjs` — all deterministic.

Budget headroom: total 5.3 MiB / 2958 KiB gz · audio 2.6 MiB · images 0.35 MiB ·
**JS gzip 1.7 KiB (498.3 / 500 — effectively full, treat as a hard wall).**

---

## TRAPS — every one of these cost time this session

1. **`renderer.info` resets on every `render()` call**, and the post chain makes
   several per frame. Reading it after the composer describes only the final
   pass — one fullscreen triangle. The audit reported "1 draw call, 1 triangle"
   for a scene drawing 571 meshes. `autoReset = false` + a manual `reset()` per
   frame is already wired; do not undo it.
2. **Vite inlines assets under 4 KB as base64.** Eight of the twenty SFX went
   into `race-runtime.js` at +33%, spending the JS budget — the one cap the
   audio work was barred from touching. `assetsInlineLimit` exempts audio and
   `test:bundle:kart` fails on inlined audio. JS gzip has ~2 KiB left, so this
   would breach it today.
3. **mp3 encoder padding breaks loops.** The engine loop ships as WAV for this
   reason. Music is mp3 and gets its loop point **measured** off the decoded
   buffer at runtime, because Chrome/Firefox/Safari disagree about stripping
   the delay.
4. **Loop crossfades go on the START of a buffer**, blending in material that
   followed the end. Fading the END connects to nothing. And judge a seam
   against **p99** of sample steps, never the mean — a seam landing on a steep
   part of the waveform is not a click.
5. **Filters need a warm-up lap on a loop.** A biquad from zero state emits a
   transient, and on a loop those samples ARE the loop point. Run it once
   around discarding output first. Worth 5.14x → 0.02x on the menu bed.
6. **StrictMode + `forceContextLoss()`** permanently retires a canvas element.
   Create the canvas inside the effect, never in JSX, or the second mount gets
   a dead element and the stage renders blank.
7. **`navigator.webdriver` skips intro AND select.** Every harness races past
   the menus; a "menu screenshot" photographs the track. `test:select:stage`
   overrides it — copy that pattern for any menu work.
8. **Cloudflare Pages propagation race:** a just-uploaded asset falls through
   `_redirects` (`/* /index.html 200`) and returns **index.html at 2092 bytes
   with a 200**, which looks exactly like a corrupt file. Verify a deploy
   twice, or poll until sizes match.
9. **Machine load fakes reds.** `test:kart-playable` failed at load 27.9 and
   passed clean on re-run. Check `uptime` before diagnosing any Playwright red.
   Greens always count.
10. **`raceSceneTheme.js` and `raceShadowRig.js` are LEGACY** — the monolith
    imports neither. Light anything new from the shipped track palettes
    (`tracks/comebackCity.js`, `penguinVillage.js`).
11. **Material disposal exists** at three sites (`replaceBody` + two GLB rig
    swaps), all traversing kart body groups, never the world. Scenery caches
    are safe *because of that*; route a kart material through a module-level
    cache and the next rig swap disposes it out from under everything.
12. **The menu mirror rule is retired.** `src/game/RaceScreen.jsx` is deleted;
    `src/kart/KartApp.jsx` is the sole owner of intro → select.

---

## PROMPT FOR THE FRESH CONTEXT

> Continue Penguin Kart in /Users/andrewferguson/Downloads/comeback-tracker,
> branch `aaa-kart-ci`. Read `docs/NEXT_RUN_RENDERER.md` FIRST — it is the
> authoritative handoff and lists twelve traps that each cost time last session.
> Do not work from `docs/AUDIO_AND_MENU_PLAN.md`; audio and menus are done.
>
> The work is renderer optimisation, in this order: (1) item-prop material
> sharing per prop TYPE — the fix for Penguin Village's 101 shader programs
> against a 90 budget — excluding the blizzard fog shells, which take
> per-instance opacity writes; (2) `InstancedMesh` for the procedural scenery,
> which is 812 meshes / 543k triangles on PV. Measure with
> `npm run audit:renderer` before and after; it prints duplicate materials with
> their owners, so nothing here needs guessing.
>
> Gates before and after: `npm run build:kart` then test:audio:samples /
> select:models / select:stage / audio:kart / kart-playable / bundle:kart /
> spline / freebody / laps / wrongway / offroad / pit / drift / minimap / race.
> Check `uptime` before believing any Playwright red — this machine runs at load
> 16-35 and fakes failures. Never judge frames or frame rate here.
>
> Deploy with `npm run deploy:kart:preview` — NEVER `npm run deploy:kart`, which
> is production. Run `npx wrangler whoami` first: the project is under
> Showcasedesigns `9f01a1b3…`, and the owner switches accounts so it reverts.
> Verify the origin twice after deploying (propagation race, trap 8).
>
> The owner wants to be asked with the AskUserQuestion tool, batching two or
> three items per round rather than checking in after each one. He still owes an
> ElevenLabs OAuth (`/mcp`), which is the only route to a generated engine loop —
> the current sampled engine is parked because he said it is "still not right".
