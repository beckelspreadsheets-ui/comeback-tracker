import { useState, useEffect, useRef, useCallback } from 'react';

// Rest timer — persists across screen navigation within a session
// Plays a subtle beep on completion using Web Audio API (no asset download needed)

export const useRestTimer = () => {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);

  const playBeep = useCallback(() => {
    try {
      // Lazy-init AudioContext (requires user gesture, which start() provides)
      if (!audioContextRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioContextRef.current = new AC();
      }
      const ctx = audioContextRef.current;
      const playTone = (freq, start, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + start + 0.02);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      playTone(880, 0, 0.15);
      playTone(1320, 0.18, 0.25);
    } catch (err) {
      // Silent failure — timer still visually completes
    }
  }, []);

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            setRunning(false);
            playBeep();
            // Vibrate on mobile if supported
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, seconds, playBeep]);

  const start = useCallback((secs) => {
    setSeconds(secs);
    setDuration(secs);
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    setSeconds(0);
    setDuration(0);
  }, []);

  const addTime = useCallback((delta) => {
    setSeconds((s) => Math.max(0, s + delta));
    if (delta > 0 && !running && seconds === 0) {
      setRunning(true);
    }
  }, [running, seconds]);

  return { seconds, running, duration, start, stop, addTime };
};
