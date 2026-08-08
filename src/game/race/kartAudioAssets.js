// The audio asset manifest — the only module that knows which sound FILES
// exist. Everything else (kartAudio.js, the monolith, the tests) takes this
// shape as data, which is why it is a separate file.
//
// Two deliberate deviations from how the rest of the repo loads assets:
//
// 1. A GLOB, not the usual explicit `import x from '...glb?url'`. A named
//    import of a file that has not been generated yet is a BUILD ERROR, and
//    this manifest has to ship before any content does — the sample path is
//    step A1 of docs/AUDIO_AND_MENU_PLAN.md, the content is A5. Globbing means
//    a one-shot activates itself by being dropped into the folder, and a cue
//    with no file quietly keeps its oscillator recipe instead.
// 2. Vite-only syntax lives HERE and not in kartAudio.js, because
//    `import.meta.glob` does not exist in plain Node and kartAudio.js has to
//    stay importable by scripts/test-kart-audio-samples.mjs.
//
// SFX file names are cue names verbatim — the inventory in `cuesForTransition`
// is the spec, so `coin.mp3` wires itself to the `coin` cue with no table to
// keep in sync. Music file names are track keys from KART_TRACKS
// (`comeback-city`, `penguin-village`) plus `menu`.

const urlsByStem = (modules) => {
  const out = {};
  Object.entries(modules).forEach(([filePath, url]) => {
    const stem = filePath.split('/').pop().replace(/\.[^.]+$/, '');
    out[stem] = url;
  });
  return out;
};

const sfxModules = import.meta.glob('../../assets/game/audio/sfx/*.{mp3,m4a,ogg,wav}', {
  eager: true,
  import: 'default',
  query: '?url',
});

const musicModules = import.meta.glob('../../assets/game/audio/music/*.{mp3,m4a,ogg,wav}', {
  eager: true,
  import: 'default',
  query: '?url',
});

// The EXACT musical length of each bed in seconds, straight out of
// scripts/render-kart-music.mjs (bars x beats / bpm). These are not "roughly
// how long the file is" — they are the number the loop has to be, and the file
// is longer than this because mp3 encoding adds delay and padding.
//
// That padding is why this is a duration and not a pair of cut points. Encoder
// delay is silence baked onto the head of the decoded buffer, and Chrome,
// Firefox and Safari disagree about whether to strip it. Hard-coding loopStart
// would be right on one browser and off-the-beat on another, every single
// lap — so kartAudio.js MEASURES the lead-in on the decoded buffer at runtime
// and derives loopStart from it, with loopEnd = loopStart + this number.
//
// `gain` trims a bed that mixes hotter or quieter than the others.
export const MUSIC_LOOP_SECONDS = {
  'comeback-city': 61.935484,
  menu: 80,
  'penguin-village': 68.571429,
};

// The engine loops are WAVs on purpose — see scripts/render-kart-engine.mjs.
// mp3 encoder padding is silence baked onto each end of the file, which is an
// inaudible latency on a one-shot and a GAP on something that loops twice a
// second for the whole race.
const engineModules = import.meta.glob('../../assets/game/audio/engine/*.{wav,mp3,m4a,ogg}', {
  eager: true,
  import: 'default',
  query: '?url',
});

// The engine is MULTI-SAMPLED: `engine-loop-<baseHz>.wav`, one per layer,
// crossfaded by speed in kartAudio.js. The base frequency lives in the FILE
// NAME rather than in a table here, because a table is a second place for the
// same fact to live and the two would drift the first time a layer is retuned.
// Anything in the folder that does not carry a base frequency is ignored —
// which is what stops a stale single-loop file being loaded as a layer with no
// pitch to play it at.
//
// Sorted ascending so the crossfade's neighbours are adjacent, and so the
// order a gate reads them in is stable.
export const ENGINE_LAYERS = Object.entries(urlsByStem(engineModules))
  .map(([stem, url]) => {
    const match = /^engine-loop-(\d+)$/.exec(stem);
    return match ? { baseHz: Number(match[1]), url } : null;
  })
  .filter(Boolean)
  .sort((a, b) => a.baseHz - b.baseHz);

export const KART_AUDIO_ASSETS = {
  engine: ENGINE_LAYERS.length ? ENGINE_LAYERS : null,
  music: Object.fromEntries(
    Object.entries(urlsByStem(musicModules)).map(([name, url]) => [
      name,
      { loopSeconds: MUSIC_LOOP_SECONDS[name] || 0, url },
    ])
  ),
  sfx: urlsByStem(sfxModules),
};

export default KART_AUDIO_ASSETS;
