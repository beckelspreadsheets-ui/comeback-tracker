# Handoff for the next run — the renderer is measured out; go and race it

**Rewritten 2026-08-07 (second session).** Paste the prompt at the bottom into a
fresh context. Everything here is measured this session, not recollection.

The previous version of this file sent a run at two targets that **do not
exist**. Both are disproven below with the numbers. Read that section before
planning anything, or you will spend the round the way the last one nearly did.

`docs/AUDIO_AND_MENU_PLAN.md` is still DONE and still must not be worked from.

---

## STATE

Branch `aaa-kart-ci`. `main` untouched, nothing on production.

| commit | what |
|---|---|
| `aa1e0962` | the warm-up was compiling every material twice — the program fix |
| `916677b4` | `?perf=1` device readout; audit breakdown stops shipping |
| `33999f2d` | the engine is multi-sampled; JS gzip threshold 500 → 520 (owner ack) |

**Deployed and byte-verified twice** at
https://aaa-preview.comeback-city-kart.pages.dev (Showcasedesigns account,
`9f01a1b31a298b112c22c3e00fe70a45`).

All 15 gates green after every change, including a full pass at load 32.

---

## THE ONE THING THE OWNER IS OWED NEXT: A NUMBER FROM REAL HARDWARE

Nothing in the renderer is over budget any more. Everything left is a judgement
call about where time actually goes, and **this machine cannot make it** — it
ran at load 8–32 all session, and the repo's history is full of fps figures
that measured the capture conditions rather than the build.

So the next move is not code. It is:

> Open **https://aaa-preview.comeback-city-kart.pages.dev/?perf=1** on the
> gaming machine, and again on the phone. Race about half a lap on each track so
> the window fills, then screenshot the panel.

Add `&track=penguin-village` for the other track. The readout is five lines:

```
buffer 1434x663  dpr 3
p50 7.0ms (143 fps)  p95 7.8  worst 14.5
floor 6.0ms  >20ms 0/512  work 3.1ms
SOFT — occasional dropped beat
comeback-city  draws 87  tris 519775  programs 51
```

**How to read it, because the verdict line decides what gets optimised:**

- `floor` is the smallest frame the device has ever managed. If `p95` is close
  to `floor`, the display is pacing us and there is headroom. If `p95` is ~2x
  `floor`, we are dropping whole beats — a GPU spike or host contention, NOT a
  uniformly more expensive frame. Those need opposite fixes.
- `work` is our own JavaScript frame time. If it is more than ~60% of `p50`,
  the CPU side owns the frame and geometry work is the wrong target.
- `buffer` and `dpr` first, always. A phone's device pixel ratio squares the
  post chain's fill cost, and no amount of triangle reduction touches that. On
  a dpr-3 phone viewport the renderer already clamps a 2532-wide drawing buffer
  to 1434 — confirm what a real phone does before assuming geometry is the
  problem.

The flag is opt-in and the chunk is not downloaded without it (verified), so it
costs a normal player nothing.

`npm run audit:renderer` remains the structural measurement and is safe to run
anywhere. Its timing line is advisory and must never be quoted as a verdict.

---

## THE TWO TARGETS THE LAST HANDOFF INVENTED

Neither survived measurement. Do not re-open either without new evidence.

### "Item-prop material sharing will fix the 101 shader programs" — no.

A shader program is one **program cache key**, and that key contains no material
identity whatsoever. N byte-identical materials cost exactly ONE program between
them. Sharing materials cannot change a program count, which is also why the
per-rig kart attempt at `c0d7465d` measured exactly zero.

The real cause, found by making the audit print programs by material type: every
type had split into an `srgb` and an `srgb-linear` variant. `SpriteMaterial` and
`PointsMaterial` had exactly two programs each with nothing else differing.

`renderer.compile()` links against the renderer's **current output state**, and
the race draws through the post chain's render target, never to the canvas. Two
cache-key fields flip on that difference: `outputColorSpace` and `toneMapping`.
The countdown warm-up was linking an unused second variant of every material in
the scene *and* leaving the variant the race renders cold.

```
shader programs   Comeback City 86 -> 54    Penguin Village 103 -> 62   (budget 90)
```

### "812 meshes / 543k triangles of procedural scenery — the textbook InstancedMesh case" — it is the ROAD.

The audit now resolves each group to the builder that mounted it, and that
`unnamed x812` group comes back as **`real-3d-track-mesh`**: the track ribbon,
its edge profiles, rails and paint. Same on Comeback City (`x476`). It is not
scatter dressing and it is not instanceable — every segment is a unique piece of
road, and the segmentation is precisely what lets frustum culling throw most of
it away (Penguin Village draws 236 of 883 meshes).

The audit also prints the real candidate list, keyed on what an `InstancedMesh`
actually requires — the same geometry object AND the same material object:

- **Comeback City: zero candidates.**
- Penguin Village: best is 11 copies of an 80-triangle prop, spread over 4,368
  world units.

`meshes per geometry` is 1.19 / 1.22, i.e. nearly every procedural prop builds
its own buffers. Instancing is not blocked by a missing refactor; there is
nothing to instance until the builders are changed to share geometry first, and
the payoff would be draw calls that are already 35% under budget.

**And beware the spread column.** One `InstancedMesh` has one bounding sphere.
Converting a batch spread across a 4,368-unit lap stops it being culled, so it
trades draw calls for triangles actually drawn. On this track that is a loss.

---

## CURRENT RENDERER NUMBERS (`npm run audit:renderer`)

| | Comeback City | Penguin Village | budget |
|---|---|---|---|
| GPU draw calls/frame | 194 | 236 | 300 |
| GPU triangles/frame | 746k | 659k | 900k |
| visible meshes | 571 | 883 | 900 |
| shader programs | **54** | **62** | 90 |
| texture memory | 27.7 MiB | 27.3 MiB | 220 MiB |
| unique materials | 330 | 524 | — |
| duplicate copies | 183 | 237 | — |
| meshes per geometry | 1.19 | 1.22 | 1.0 = nothing shared |

Nothing is over. Texture memory is a non-issue; do not spend effort there.

**If a device reading says geometry is the problem**, the ranked levers are:

1. **The palm cluster: 10,748 triangles x 17 mounts = 182k on Comeback City**,
   about a quarter of everything drawn there. Rival kart bodies are 7,185 x 20
   on both tracks. Decimation, not instancing, is the tool. (Note the standing
   rule: never `gltf-transform optimize`.)
2. Material dedup in `mountMiamiAsset` — every GLB mount clones its template but
   builds fresh materials per node, which is where the 41/34/17 duplicate groups
   come from. Cuts material count and helps batching; moves neither programs nor
   draw calls. **Trap:** a module-level cache would be disposed by the teardown
   traversal and then reused dead on the next race (this is trap 11's shape), so
   any such cache must be per-race.

---

## BUDGET — READ BEFORE WRITING A LINE OF SHIPPED CODE

```
JS gzip   500.20 / 520 KiB      headroom 19.8 KiB
audio       3.45 / 6 MiB
```

**Raised 500 → 520 on 2026-08-07 with the owner's ack** — the first time the JS
caps have ever moved, and the reasoning is written into
`scripts/bundle-asset-budget-report.mjs` rather than left as a number. The short
version: the build had reached 499.90/500, which is a tripwire rather than a
budget, and what spent the last of it was a **dynamically imported** diagnostic
chunk that first load never requests, against a cap whose own note says it is a
first-load budget.

This does not license growth in the first-paint path. If a future change spends
this headroom on eagerly-loaded script, push back on that rather than on the
number. Note also that audit-only code must not ship: `import.meta.env.DEV` in
the condition lets Vite fold it to `false` and the minifier drop it, which is
what reclaimed 1.5 KiB here.

---

## GATES — 15, all green

Pure Node, immune to machine load:
`test:audio:samples` · `test:select:models` · `test:spline` · `test:freebody` ·
`test:laps` · `test:wrongway` · `test:offroad` · `test:pit` · `test:drift` ·
`test:minimap` · `test:race` · `test:bundle:kart`

Playwright: `test:audio:kart` · `test:select:stage` · `test:kart-playable`

Not a gate, run it to measure: `npm run audit:renderer`.
Not a gate, one manual check if `?perf=1` is ever touched: load the preview
with and without the flag — without it, nothing paints and the chunk is never
requested.

---

## AUDIO — the engine is rebuilt; it needs the owner's ear

**No audio generator can make SFX here, and settling that mattered less than
what it uncovered.** The ElevenLabs connector exposes only `text_to_speech` (it
is already authenticated — no OAuth needed, contrary to the last handoff).
Higgsfield's `generate_audio` states in its own description that it cannot
produce music or sound effects for general use. Everything shipped is authored
offline by `scripts/render-kart-*.mjs`, deterministic, and that remains the
route.

**But a generator was never the fix.** `engineFrequencyFor` runs 42 Hz at idle
to 269 Hz on a boost, and the loop was rendered at 100 Hz — a **6.4x
playbackRate range**. Resampling moves everything, so the induction hiss and
every resonance were dragged 1.25 octaves down at idle and pushed 1.43 up on
boost. That is what "still not right" was, and no single clip survives it.

The engine is now **multi-sampled**: `engine-loop-56/112/224.wav`, an octave
apart, each played near its native rate and crossfaded by speed. Worst-case
stretch is 0.50 octaves instead of 1.43. Shipped and deployed.

**Open: the owner has not heard it yet.** That is the next thing to ask for.
If it is still wrong, the levers in order are (a) a fourth layer, which halves
the crossover error again, (b) the harmonic stack and firing-pulse shape in
`render-kart-engine.mjs`, (c) the mix constants in `kartAudio.js`, which he has
already retuned once ("too loud to hear the whole time").

Design notes worth keeping:

- A base must be a multiple of **four**, not two: the seam closes only if the
  fundamental AND the half-order firing pulse both complete whole cycles in the
  0.5 s loop.
- The noise layer is deliberately **not** scaled with the base. Its
  coefficients are absolute, so every layer shares one induction band while the
  harmonic stacks move — that is the whole difference between multi-sampling
  and pitch-shifting.
- The crossfade is constant **power**, not amplitude: the layers carry
  independently seeded noise, so they sum incoherently and equal-amplitude
  would dip ~3 dB through every handover.
- Each base lives in its **file name** and is parsed by the manifest. Retuning
  a layer is a re-render and nothing else. A file in that folder without a base
  in its name is ignored.

The manifest is a glob elsewhere too: a file dropped into
`src/assets/game/audio/{sfx,music}/` activates itself.

---

## TRAPS

The first five are new and each cost time this session.

1. **A program is a CACHE KEY, not a material.** Before "fixing" a program count
   by deduplicating materials, read the audit's per-type program breakdown. It
   prints the cache-key fields that differ within each type, which is the only
   thing that can actually be changed.
2. **Binding the composer's own `inputBuffer` around `renderer.compile()`
   renders the entire scene BLACK.** From the first countdown tick on. Nothing
   else breaks — the sim keeps running, the kart still reaches 112 km/h, the
   draw calls and the corrected program count still report correctly. Only the
   image is gone, behind an intact HUD. Use the 1x1 scratch target that is
   there now: the only thing about the bound target that reaches the cache key
   is whether it is null.
3. **`test:kart-playable` caught that, and it is the ONLY gate that would
   have.** Its manual-throttle motion check read changedRatio 0.02 against 0.53.
   Trap 9 below is real, but do not reach for it before looking at a frame: a
   red at load 5.6 that reproduces three times is not the machine.
4. **Bisect a suspected regression against the commit, not against HEAD.**
   `git stash` alone still leaves the committed change in place, which for one
   round looked like proof the change was innocent.
5. **Audit-only code costs production bytes.** The deep breakdown was 1.5 KiB
   gzip against a budget with 1.7 KiB of headroom in total. `import.meta.env.DEV`
   in the condition lets Vite fold it to `false` and the minifier drop it, and
   every consumer runs against `dev:kart` anyway.
6. **`renderer.info` resets on every `render()` call**, and the post chain makes
   several per frame. `autoReset = false` + a manual `reset()` per frame is
   already wired; do not undo it.
7. **Vite inlines assets under 4 KB as base64.** `assetsInlineLimit` exempts
   audio and `test:bundle:kart` fails on inlined audio. JS gzip is full, so this
   would breach it today.
8. **mp3 encoder padding breaks loops.** The engine loop ships as WAV. Music is
   mp3 and gets its loop point measured off the decoded buffer at runtime.
9. **Loop crossfades go on the START of a buffer.** Fading the END connects to
   nothing. Judge a seam against **p99** of sample steps, never the mean.
10. **Filters need a warm-up lap on a loop.** A biquad from zero state emits a
    transient, and on a loop those samples ARE the loop point.
11. **StrictMode + `forceContextLoss()`** permanently retires a canvas element.
    Create the canvas inside the effect, never in JSX.
12. **`navigator.webdriver` skips intro AND select.** `test:select:stage`
    overrides it — copy that pattern for any menu work.
13. **Cloudflare Pages propagation race:** a just-uploaded asset falls through
    `_redirects` and returns **index.html at 2092 bytes with a 200**, which
    looks exactly like a corrupt file. It happened again this session on
    `race-runtime`. Verify every deploy twice, comparing sizes against
    `dist-kart/assets`.
14. **Machine load fakes reds.** Check `uptime` before diagnosing any Playwright
    red. Greens always count — the full battery passed at load 32.
15. **`raceSceneTheme.js` and `raceShadowRig.js` are LEGACY** — the monolith
    imports neither. Light anything new from the shipped track palettes.
16. **Material disposal exists** at three sites, all traversing kart body
    groups, never the world. Route a kart material through a module-level cache
    and the next rig swap disposes it out from under everything.
17. **The menu mirror rule is retired.** `src/game/RaceScreen.jsx` is deleted;
    `src/kart/KartApp.jsx` is the sole owner of intro → select.
18. **`npx wrangler whoami` before every deploy.** The owner switches accounts,
    so it reverts. The kart project is under Showcasedesigns
    `9f01a1b31a298b112c22c3e00fe70a45`; if it says `beckelspreadsheets@`, stop
    and ask. Deploy with `deploy:kart:preview`, NEVER `deploy:kart`.

---

## PROMPT FOR THE FRESH CONTEXT

> Continue Penguin Kart in /Users/andrewferguson/Downloads/comeback-tracker,
> branch `aaa-kart-ci`. Read `docs/NEXT_RUN_RENDERER.md` FIRST — it is the
> authoritative handoff. Do not work from `docs/AUDIO_AND_MENU_PLAN.md`.
>
> Renderer optimisation is PARKED and the reason matters: nothing is over budget
> any more, and the last handoff's two targets were both disproven by
> measurement — a shader program is a cache key so material sharing cannot move
> the count, and the "812-mesh procedural scenery" is the road. Do not re-open
> either. The next renderer decision is waiting on a real-hardware reading the
> owner takes himself at `?perf=1` on the preview; ask him for it, then read the
> "If a device reading says geometry is the problem" list.
>
> AUDIO: the engine was rebuilt as a three-layer multi-sample and deployed, but
> the owner has NOT heard it yet — ask him for that verdict first. Do not reach
> for an audio generator: neither connector can produce sound effects, and the
> fault was a 6.4x playbackRate stretch that no clip would have survived.
>
> Gates before and after: `npm run build:kart` then test:audio:samples /
> select:models / select:stage / audio:kart / kart-playable / bundle:kart /
> spline / freebody / laps / wrongway / offroad / pit / drift / minimap / race.
> Check `uptime` before believing a Playwright red — but look at a frame before
> blaming the machine, because that is how a real regression got through this
> session. Never judge frames or frame rate here.
>
> Deploy with `npm run deploy:kart:preview` — NEVER `npm run deploy:kart`. Run
> `npx wrangler whoami` first (Showcasedesigns `9f01a1b3…`) and verify the
> origin twice afterwards against `dist-kart/assets` sizes.
>
> He wants to be asked with the AskUserQuestion tool, two or three items a round.
