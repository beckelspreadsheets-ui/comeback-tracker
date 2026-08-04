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

**4. The bundle is the binding constraint, and music is big.**
Headroom today: **2.97 MiB and 1637 KiB gzip.** Thresholds: `totalMiB` 16,
`totalGzipKiB` 12000, `largestFileMiB` 3. There is **no audio category cap**, so
music spends the shared total. `scripts/bundle-asset-budget-report.mjs:87` already
classifies `.wav/.mp3/.ogg/.m4a` as `audio`, so it will show up the moment a file
lands.

A 2-minute stereo loop at 128 kbps is ~1.9 MB. Three of those does not fit.
Mono, 96 kbps, and short seamless loops are the difference between shipping and
not. **Measure with `test:bundle:kart` after the first file, not after the last.**

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

### A2. Where the audio comes from — OWNER DECISION

| | |
|---|---|
| **Suno** (owner's suggestion) | Best musical quality, longest coherent pieces. Not available as a tool here — the owner generates and hands over files. Blocks on him. |
| **Higgsfield `sonilo_music`** | Text-to-music, `duration` param, credits already authorised. I can generate and iterate unattended. Quality unknown for this use. |
| **Higgsfield `mirelo_text_to_audio`** | Text-to-SFX with duration. The obvious fit for the 20 cues below. |

Recommendation: **`mirelo` for SFX regardless**, since 20 short cues is exactly
its job. For music, generate a `sonilo` sample first and let the owner A/B it
against a Suno track before committing to a source.

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

### B2. Art direction

The game's identity is settled and should not be re-litigated: neon dusk /
arctic sunset, chunky toy-like forms, Kintsugi-adjacent palette, ordinal penguin
characters as the roster. The menu is currently the least authored surface in the
product.

Higgsfield is authorised for backgrounds, panel art and character plates. The
roster art already exists and is owner-approved — **regenerating approved
likenesses is a risk, not an upgrade.** Prefer new *framing* around existing
plates over new plates.

### B3. Implementation

Single file, `KartApp.jsx`, plus `comebackCityThreeKartRace.css` (or a menu-scoped
stylesheet). No mirror. Keep every `data-testid` — the smoke suites assert on
them.

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

1. **Music source** — Suno (he generates) or Higgsfield `sonilo` (I generate and
   iterate)? A2.
2. **Bundle** — three music beds likely need more than the 2.97 MiB headroom. Raise
   the budget, or ship shorter/lower-bitrate loops?
3. **Offline** — audio is not precached, so the installed PWA is silent with no
   network. Fine, or should music join the precache?
4. **Menus** — what specifically reads as cheap? "Way better" is a direction, not
   a target, and B1's capture exists to turn it into one.
