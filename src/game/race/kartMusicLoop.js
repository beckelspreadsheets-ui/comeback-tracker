// Original upbeat arcade-racing music loop — synthesized in code, zero audio
// assets, no provenance questions. Runs as a WebAudio scheduler driven by the
// per-frame audio update so it stays synchronized with the game loop.

// E-minor racing loop, ~132 BPM, 16-step pattern (one 4/4 measure).
const TEMPO_BPM = 132;
const STEPS_PER_BEAT = 4;
const STEP_SECONDS = 60 / TEMPO_BPM / STEPS_PER_BEAT;
const PATTERN_STEPS = 16;
const LOOKAHEAD_SECONDS = 0.25;

const NOTES = {
  E2: 82.41,
  G2: 98.00,
  A2: 110.00,
  B2: 123.47,
  D3: 146.83,
  E3: 164.81,
  G3: 196.00,
  A3: 220.00,
  B3: 246.94,
  D4: 293.66,
  E4: 329.63,
  G4: 392.00,
  A4: 440.00,
  B4: 493.88,
  D5: 587.33,
  E5: 659.25,
};

const BASS_PATTERN = [
  { step: 0, note: NOTES.E2, dur: 0.34 },
  { step: 4, note: NOTES.B2, dur: 0.34 },
  { step: 8, note: NOTES.A2, dur: 0.34 },
  { step: 12, note: NOTES.G2, dur: 0.34 },
];

const MELODY_PATTERN = [
  { step: 0, note: NOTES.E4, dur: 0.18 },
  { step: 2, note: NOTES.G4, dur: 0.18 },
  { step: 4, note: NOTES.B4, dur: 0.18 },
  { step: 6, note: NOTES.E5, dur: 0.18 },
  { step: 8, note: NOTES.D5, dur: 0.18 },
  { step: 10, note: NOTES.B4, dur: 0.18 },
  { step: 12, note: NOTES.A4, dur: 0.18 },
  { step: 14, note: NOTES.G4, dur: 0.18 },
];

const KICK_STEPS = [0, 4, 8, 12];
const SNARE_STEPS = [4, 12];
const HAT_STEPS = [0, 2, 4, 6, 8, 10, 12, 14];

const buildNoiseBuffer = (ctx) => {
  const seconds = 1;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
};

export const createKartMusicLoop = (ctx, destination) => {
  if (!ctx) return { dispose: () => {}, schedule: () => {} };

  const noiseBuffer = buildNoiseBuffer(ctx);
  const musicGain = ctx.createGain();
  musicGain.gain.value = 0.12;
  musicGain.connect(destination);

  let nextStepTime = ctx.currentTime + 0.05;
  let stepIndex = 0;
  let disposed = false;

  const env = (gainNode, time, peak, attack, decay) => {
    gainNode.gain.setValueAtTime(0.0001, time);
    gainNode.gain.exponentialRampToValueAtTime(peak, time + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
  };

  const playTone = ({ at, freq, duration, type = 'triangle', peak = 0.04 }) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    const gain = ctx.createGain();
    env(gain, at, peak, 0.01, duration - 0.01);
    osc.connect(gain).connect(musicGain);
    osc.start(at);
    osc.stop(at + duration + 0.03);
  };

  const playKick = (at) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, at);
    osc.frequency.exponentialRampToValueAtTime(55, at + 0.12);
    const gain = ctx.createGain();
    env(gain, at, 0.22, 0.005, 0.12);
    osc.connect(gain).connect(musicGain);
    osc.start(at);
    osc.stop(at + 0.15);
  };

  const playSnare = (at) => {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2200;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    env(gain, at, 0.12, 0.005, 0.1);
    source.connect(filter).connect(gain).connect(musicGain);
    source.start(at);
    source.stop(at + 0.13);
  };

  const playHat = (at) => {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const gain = ctx.createGain();
    env(gain, at, 0.06, 0.003, 0.03);
    source.connect(filter).connect(gain).connect(musicGain);
    source.start(at);
    source.stop(at + 0.04);
  };

  const scheduleStep = (time, step) => {
    if (disposed) return;
    BASS_PATTERN.filter((n) => n.step === step).forEach((n) =>
      playTone({ at: time, freq: n.note, duration: n.dur, type: 'sawtooth', peak: 0.05 })
    );
    MELODY_PATTERN.filter((n) => n.step === step).forEach((n) =>
      playTone({ at: time, freq: n.note, duration: n.dur, type: 'triangle', peak: 0.055 })
    );
    if (KICK_STEPS.includes(step)) playKick(time);
    if (SNARE_STEPS.includes(step)) playSnare(time);
    if (HAT_STEPS.includes(step)) playHat(time);
  };

  const schedule = (currentTime) => {
    if (disposed) return;
    while (nextStepTime < currentTime + LOOKAHEAD_SECONDS) {
      scheduleStep(nextStepTime, stepIndex);
      stepIndex = (stepIndex + 1) % PATTERN_STEPS;
      nextStepTime += STEP_SECONDS;
    }
  };

  const dispose = () => {
    disposed = true;
    try {
      musicGain.disconnect();
    } catch {}
  };

  return { dispose, schedule };
};
