# Kart audio assets

Drop files here and they wire themselves up. `src/game/race/kartAudioAssets.js`
globs this directory, so there is no table to edit and no import to add.

- `sfx/<cue-name>.mp3` — the stem MUST be a cue name exactly as it appears in
  `cuesForTransition` in `src/game/race/kartAudio.js`. That list is the spec:

      countdown-3  countdown-2  countdown-1  go
      lap          finish
      item-pickup  item-use     coin         coin-loss
      spin-out     land         boost
      drift-start  tier-1  tier-2  tier-3
      mini-turbo-1 mini-turbo-2 mini-turbo-3

  A cue with no file here keeps its oscillator recipe — that fallback is the
  point, not an oversight. `tier-*` and `mini-turbo-*` are rising three-step
  ladders and should sound like one set.

- `music/<track-key>.mp3` — `menu`, `comeback-city`, `penguin-village`. Track
  keys come from `KART_TRACKS`.

Format is mp3: it is the only codec `decodeAudioData` accepts on every browser
this game ships to, iOS Safari included.

If a bed's loop seam is audible, add cut points to `MUSIC_LOOP_POINTS` in
`kartAudioAssets.js` rather than re-cutting the file blindly — the values are
seconds on the decoded buffer, and a bed with no entry loops over the whole
buffer.

Audio is NOT precached by the service worker (`vite.config.kart.js` globs no
audio extensions), so it streams on demand and the installed PWA is silent
offline. That is a decision — see docs/AUDIO_AND_MENU_PLAN.md trap 5.
