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

// Loop points, in SECONDS on the decoded buffer, for beds whose seam needs
// help. A bed absent from this map loops over its whole buffer, which is only
// right if it was cut at a zero crossing on a bar line. Filled in per-bed when
// the beds are cut — see A3 in the plan: the seam is the real technical risk.
// `gain` trims a bed that mixes hotter or quieter than the others.
export const MUSIC_LOOP_POINTS = {
  // 'comeback-city': { loopStart: 0, loopEnd: 118.4, gain: 1 },
};

// The engine loop is a WAV on purpose — see scripts/render-kart-engine.mjs.
// mp3 encoder padding is silence baked onto each end of the file, which is an
// inaudible latency on a one-shot and a GAP on something that loops twice a
// second for the whole race.
const engineModules = import.meta.glob('../../assets/game/audio/engine/*.{wav,mp3,m4a,ogg}', {
  eager: true,
  import: 'default',
  query: '?url',
});

export const KART_AUDIO_ASSETS = {
  engine: urlsByStem(engineModules)['engine-loop'] || null,
  music: Object.fromEntries(
    Object.entries(urlsByStem(musicModules)).map(([name, url]) => [
      name,
      { url, ...(MUSIC_LOOP_POINTS[name] || {}) },
    ])
  ),
  sfx: urlsByStem(sfxModules),
};

export default KART_AUDIO_ASSETS;
