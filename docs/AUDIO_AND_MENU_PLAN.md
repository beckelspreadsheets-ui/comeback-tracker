# Music, audio and the menu revamp — execution plan

Written 2026-08-03 for a **fresh context**. Everything needed to start is in this
file; nothing depends on remembering the session that produced it.

Owner scoped both of these as end-of-project work, in his words:

> "at the end we def need to get music and correct audio can use suno if thats
> best" · "revamping the menus to look way better (can use higgsfield)"

Both are now the front of the queue. Trailers and the full item pass remain after.

---

## State when this was written

- Branch `aaa-kart-ci`. Preview live and byte-verified at
  **https://aaa-preview.comeback-city-kart.pages.dev** (`?freebody=1` for the new
  handling).
- Nine headless gates, none needing frames: `test:spline`, `test:freebody`,
  `test:laps`, `test:wrongway`, `test:offroad`, `test:pit`, `test:drift`,
  `test:minimap`, `test:race`. Plus `test:kart-playable`, `test:audio:kart`,
  `test:bundle:kart`.
- Higgsfield credits authorised by the owner, standing: *"spend the higgsfield
  credits we are close anytime needed we using those credits."* Balance was
  ~2434 after the walker regeneration.

---

## TRAPS — read before touching anything

Each of these has already cost this project a wave, or is the same shape as
something that did.

**1. The kart game's audio is NOT where the docs say it is.**
`docs/PENGUIN_KART_AUDIO_DEFERRED.md` says a silent `AudioManager` is "wired into
`ArcadeRace3D.jsx`" and tells you to drop assets in `public/audio/` and implement
`playCue()` in `src/game/audio/AudioManager.js`.

**The kart build loads none of that.** `index.kart.html` → `src/kart/main.jsx` →
`KartApp.jsx` → `ComebackCityThreeKartRace.jsx`, which imports
`src/game/race/kartAudio.js`. `AudioManager.js` and `raceAudio.js` belong to the
fitness app. This is the identical trap that hid the missing minimap for nine
waves — a file that exists, works, and is never loaded by the shipped game.

**2. There is no sample-playback path at all.** `kartAudio.js` is oscillator
synthesis: 4 `createOscillator` calls, **0** `decodeAudioData`, **0**
`AudioBuffer`. Playing a music file or a recorded SFX means building buffer
loading and playback first. Budget for that before budgeting for content.

**3. There are zero audio assets in the repo.** No `.mp3`, `.ogg`, `.wav`,
`.m4a` anywhere under `src/assets`.

**4. ~~The bundle is the binding constraint~~ — RAISED 2026-08-04, owner ack.**
*"why can we not raise the budget it still seems to run great so I dont see a
problem."* He was right, and the correction is worth carrying: bundle size does
not touch frame rate once the game is loaded. These totals protect
TIME-TO-PLAYABLE on a phone on cellular — a different claim that happened to
agree with his.

And audio does not even cost that, because it is not precached (trap 5): music
streams on demand and is never in the first-paint path. It is the same class as
the GLBs — CDN/disk footprint, not startup cost — so counting it against the
same ceiling as JS was measuring the wrong thing.

Now: **totals 16 -> 22 MiB and 12000 -> 17000 KiB gz, plus a dedicated
`audioTotalMiB` cap of 6.** Headroom today is **8.97 MiB / 6637 KiB gz overall
and a full 6 MiB of audio**, which comfortably fits three beds plus the SFX at
good bitrates. JS caps are UNCHANGED and must stay that way — JS blocks first
paint, and a soundtrack must not buy headroom that later gets spent on script.
The audio cap is negative-tested: a 7 MB file fails it.

**5. Audio is not precached by the service worker.** `vite.config.kart.js:85`
globs `**/*.{js,css,html,svg,png,ico,woff2,webp}` — no audio extensions. So music
streams on demand and will not work offline. That is probably the right default
(it keeps the precache small), but it is a decision, not an accident, and the
owner should know the game is silent offline.

**6. THE MENU MIRROR RULE IS RETIRED.** Older notes say `KartApp.jsx` must be
mirrored into `src/game/RaceScreen.jsx`. **That file is deleted** (app split,
2026-07-13) and `KartApp.jsx:1-10` says so: *"This file is now the ONLY owner of
the intro → select flow; edit freely."* 419 lines. Do not go looking for a copy
to keep in sync — there isn't one.

**7. `navigator.webdriver` SKIPS intro/select.** Any headless capture deep-links
straight into the race, so a menu screenshot needs that override or you will
photograph the track and conclude the menu is fine.

**8. Frames for JUDGEMENT must not be captured on the owner's machine.** It runs a
VM at 200%+ CPU with load 10–200; frames from it measure the capture conditions.
Numeric/headless checks are fine locally. Menu work is inherently visual, so plan
for a capture run on a free or gaming machine.

---

## Part A — audio

### A1. Build the sample path (blocking, do first)

Add buffer load + playback to `kartAudio.js`, alongside the existing synthesis
rather than replacing it: the synth cues are a working fallback if a file 404s,
and losing them to a typo'd path would be a silent regression.

- `fetch` → `decodeAudioData` → cache by name.
- One `GainNode` per bus: `music`, `sfx`, and the existing engine synth. Mute
  must cut all three (`readStoredMute`/`writeStoredMute` already persist it).
- Autoplay policy: browsers block audio until a gesture. The intro screen's first
  tap is the unlock — `test:audio:kart` already drives an input for exactly this.
- Keep `playCue(name)` the only entry point. Cues are derived centrally in
  `cuesForTransition`; do not scatter playback calls into the monolith.

**Exit:** a cue plays from a file, mute silences it, a missing file falls back to
the synth without throwing, and `test:audio:kart` still passes.

### A2. Where the audio comes from — DECIDED 2026-08-03

**Music: SUNO, generated by the owner.** He raised it and knows it; the
instrumental quality is there for arcade racing; and he can judge output without
a round trip. The generator was never the hard part — see A3 — so picking the one
he can drive costs nothing.

Prompt guidance for those beds: **instrumental, steady tempo, no big structural
breaks, ~2 minutes.** Suno's instinct is to write a song — intro, build, drop —
and structure is what fights a loop played fifty times in a session. Ask for a
groove, not an arrangement. Beds should be slightly LESS interesting than feels
right on first listen; the hook that sells it on listen one is the one that
grates by lap three.

**SFX: `mirelo_text_to_audio`, generated here.** Suno is the wrong tool for 20
short one-shots. mirelo takes a duration and credits are authorised, so this
runs unattended. ElevenLabs is connected as an MCP server if mirelo disappoints.

The split is by what each side can judge: owner generates the three music beds,
this side does the SFX plus all looping, cutting and wiring.

### A3. The loop seam is the real technical risk

Neither generator promises a seamless loop. A music bed that clicks every 45
seconds is worse than none. Mitigations, in order of preference: generate long
and cut at a zero crossing on a bar line; cross-fade the tail into the head with
a Web Audio `loopStart`/`loopEnd` on an `AudioBufferSourceNode`; or accept a
one-shot intro + looping body split.

**Exit:** a loop plays for 3 minutes with no audible discontinuity. This is a
listening test, not a numeric one — the owner has to sign it off.

### A4. Music inventory

| track | where | notes |
|---|---|---|
| menu theme | intro + select | Ties into Part B; the menu is where a player first hears the game. |
| Comeback City | race | Neon dusk, Miami. Warm, driving. |
| Penguin Village | race | Arctic sunset. Colder, brighter. |

Plus a short finish/results sting. **Three beds is already ~3–4 MB at sane
bitrates against 2.97 MiB of headroom** — see trap 4. If they do not fit, the
options are lower bitrate, shorter loops, or the owner raising the budget (he
still owes an ack on the revised 13 MiB / 9800 KiB gz figure).

### A5. SFX — the inventory is ALREADY AUTHORED

`cuesForTransition` in `kartAudio.js` fires exactly these 20 names. This is the
spec; no design work is needed to decide what sounds exist.

```
countdown-3  countdown-2  countdown-1  go
lap          finish
item-pickup  item-use     coin         coin-loss
spin-out     land         boost
drift-start  tier-1  tier-2  tier-3
mini-turbo-1 mini-turbo-2 mini-turbo-3
```

Note `tier-*` and `mini-turbo-*` are three-step ladders — they should sound like
a rising set, not three unrelated noises. Drift tiers were just retuned to
0.45/0.95/1.6s so all three are now reachable; before that, tiers 2 and 3 were
unreachable and **their sounds would never have been heard**.

### A6. Engine note

The engine loop is synthesised from `engineFrequencyFor(speedRatio, boosting)`.
It works and is speed-reactive. Replacing it with a sample is a downgrade unless
the sample is pitch-shifted the same way — leave it alone unless the owner asks.

---

## Part B — the menu revamp

### B1. Look at what ships now, first

`KartApp.jsx` owns intro → select. Existing art is already in
`src/assets/game/select/`: `char-*.png` (crrt-bunny, seth-penguin, mizzle, tclow,
layer23, lifoladen) and `kart-*.png` (hero, icesled, iceracer, kenney, …).

**Capture the real flow before redesigning it** — remember trap 7 (`webdriver`
skips the menu) and trap 8 (frames from the owner's machine do not count). The
owner has not said what specifically looks cheap, only "way better", so the first
deliverable is a shared view of the current state.

### B2. Art direction — SETTLED 2026-08-03. The answer is LIVE 3D.

Owner, verbatim: *"the menus just need to pop look 3d and really show the
characters and cars off better than they do instead of look like a ninentdo
waiting screen we want ninetendo switch quality."*

**The diagnosis is in the assets.** The select screen shows flat PNG plates —
`char-*.png`, `kart-*.png` — of characters and karts that ALREADY EXIST AS 3D
MODELS. The player is looking at photographs of the assets instead of the
assets. That is precisely why it reads as a waiting screen: nothing moves,
nothing is lit, nothing responds.

Available right now, already approved and shipping:

- `src/assets/game/models/avatars/` — `seth-penguin.glb`, `layer23-penguin.glb`,
  `tclow-penguin.glb` (+ others in that directory)
- `src/assets/game/models/karts/` — 9 GLBs: `btc-kart`, `miami-cruiser`,
  `ice-racer`, `cold-wallet`, `hash-runner`, `ice-block`, `node-runner`,
  `pixel-pickup`, `sat-stacker`

So the work is a **live model stage**, not new 2D art:

- A small Three.js scene on the select screen, rendering the selected character
  and kart on a slow turntable.
- Lit with the game's own key — neon dusk or arctic sunset, matching the track
  being chosen — so the menu previews the race rather than sitting outside it.
- Motion on selection: the model reacts when you change pick. A static render is
  a photograph again.
- Depth: a floor with a real contact shadow, a rim light. The rig work already
  exists in `raceShadowRig.js` and `toonRimShader.js`.

**Do NOT regenerate the character likenesses.** They are owner-approved
(2026-07-10 "asians looked great", and the roster art beyond that). Higgsfield
credits are authorised, but spend them on FRAMING — backdrops, panel art,
lighting plates — not on re-rolling approved faces. Regenerating an approved
likeness is a risk, not an upgrade.

Cost note: the select screen would now boot a Three.js context and load GLBs it
did not before. Both are already in the bundle for the race, so this is load
TIME, not bundle bytes — but it lands before the race, on the first screen the
player sees, so measure it.

### B4. Gate

`test:kart-playable` boots through the flow; keep it green. Watch
`test:bundle:kart` if menu art grows — the image category has its own 2.5 MiB cap
and images are already at ~1.92 MiB.

---

## Sequencing

1. **A1 sample path** — blocking, and cheap to verify headlessly.
2. **A5 SFX via `mirelo`** — 20 short files, the inventory is already written,
   and it proves the whole pipeline end to end at low byte cost.
3. **B1 menu capture** — needs the owner's other machine, so start the request
   early and do it in parallel with the audio work.
4. **A2/A3/A4 music** — after the owner's source decision, because generating
   three beds twice is the expensive mistake here.
5. **B2/B3 menu build.**
6. Re-measure `test:bundle:kart`, deploy preview, owner listens and looks.

## Open questions for the owner

1. ~~Music source~~ — **decided: Suno for beds (owner), mirelo for SFX (here).**
2. ~~Bundle~~ — **raised 2026-08-04 with owner ack. 6 MiB of audio headroom;
   beds do not need to be compromised.**
3. **Offline** — audio is not precached, so the installed PWA is silent with no
   network. Fine, or should music join the precache?
4. ~~What reads as cheap about the menus~~ — **answered: flat PNG plates of
   models that exist in 3D. The fix is a live model stage. See B2.**
