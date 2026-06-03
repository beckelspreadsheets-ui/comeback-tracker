export const cueFrequencyFor = (name = '') =>
  name.includes('lightning') || name.includes('storm')
    ? 180
    : name.includes('anchor') || name.includes('drill') || name.includes('polarity')
    ? 120
    : name.includes('shield') || name.includes('surge')
    ? 520
    : name.includes('boost') || name.includes('turbo')
    ? 720
    : name.includes('trap') || name.includes('bubble')
    ? 260
    : 360;

export const cueWaveTypeFor = (name = '') => (name?.includes('hit') || name?.includes('drag') ? 'square' : 'triangle');

export const ambientVoicesFor = (trackKey = '') =>
  trackKey === 'static-storm-plateau'
    ? [
        { frequency: 54, gain: 0.008, type: 'sawtooth' },
        { frequency: 122, gain: 0.004, type: 'square' },
        { frequency: 320, gain: 0.002, type: 'triangle' },
      ]
    : trackKey === 'magnet-mine-descent'
    ? [
        { frequency: 42, gain: 0.01, type: 'square' },
        { frequency: 96, gain: 0.004, type: 'sawtooth' },
        { frequency: 186, gain: 0.002, type: 'triangle' },
      ]
    : [
        { frequency: 72, gain: 0.008, type: 'sine' },
        { frequency: 188, gain: 0.003, type: 'triangle' },
        { frequency: 420, gain: 0.0018, type: 'sine' },
      ];

export const createRaceAudioController = ({
  audioWindow = typeof window === 'undefined' ? null : window,
  muted: initialMuted = false,
  trackKey = '',
} = {}) => {
  let audioContext = null;
  let ambientNodes = [];
  let muted = Boolean(initialMuted);

  const resumeAudioContext = () => {
    if (!audioContext || audioContext.state !== 'suspended') return;
    try {
      const resumeResult = audioContext.resume?.();
      if (resumeResult && typeof resumeResult.catch === 'function') resumeResult.catch(() => {});
    } catch {}
  };

  const suspendAudioContext = () => {
    if (!audioContext || audioContext.state !== 'running') return;
    try {
      const suspendResult = audioContext.suspend?.();
      if (suspendResult && typeof suspendResult.catch === 'function') suspendResult.catch(() => {});
    } catch {}
  };

  const ensureAudio = () => {
    if (muted) return null;
    if (!audioWindow) return null;
    const AudioCtor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioCtor) return null;
    try {
      if (!audioContext) audioContext = new AudioCtor();
    } catch {
      return null;
    }
    resumeAudioContext();
    return audioContext;
  };

  const startAmbientAudio = () => {
    if (muted) return;
    const ctx = ensureAudio();
    if (!ctx || ambientNodes.length) return;
    ambientNodes = ambientVoicesFor(trackKey).map((voice) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = voice.type;
      oscillator.frequency.value = voice.frequency;
      gain.gain.value = voice.gain;
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      return { gain, oscillator, voice };
    });
  };

  const setAmbientMuteState = () => {
    ambientNodes.forEach(({ gain, voice }) => {
      gain.gain.value = muted ? 0 : voice.gain;
    });
  };

  const setMuted = (nextMuted) => {
    muted = Boolean(nextMuted);
    setAmbientMuteState();
    return muted;
  };

  const playCue = (name, duration = 0.11) => {
    if (muted) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    startAmbientAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = cueWaveTypeFor(name);
    osc.frequency.setValueAtTime(cueFrequencyFor(name), ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  };

  const dispose = () => {
    ambientNodes.forEach((node) => node.oscillator.stop());
    ambientNodes = [];
  };

  return {
    dispose,
    isMuted: () => muted,
    playCue,
    resume: resumeAudioContext,
    setMuted,
    suspend: suspendAudioContext,
    startAmbientAudio,
  };
};
