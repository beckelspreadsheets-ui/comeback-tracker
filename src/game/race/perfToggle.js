// On-device performance readout: the switch (RELEASE_V1_PLAN Phase 2).
//
// The readout itself is src/kart/devicePerfProbe.js, opt-in and dynamically
// imported so players who never ask for it never download it. It used to be
// reachable only through ?perf=1, and the iOS app has no address bar, so the
// race's pause menu now toggles it as well and the choice is remembered on the
// device. ?perf=1 / ?perf=0 still force it either way.
//
// The pause-menu button is for test builds only (audit 2026-11-09: App Review
// guideline 2.5.19, and it reads as unfinished to a player). A store build
// has no button. `npm run ios:sync:test` builds with VITE_KART_PERF_TOGGLE=1
// for the device checks; on the web, ?perf=1 or ?perf=0 brings it back.
const PERF_PREF_KEY = 'cc-kart-perf-overlay';

export const perfToggleAvailable = () => {
  if (import.meta.env?.VITE_KART_PERF_TOGGLE === '1') return true;
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('perf');
};

export const readPerfProbePref = () => {
  if (typeof window === 'undefined') return false;
  const forced = new URLSearchParams(window.location.search).get('perf');
  if (forced === '1') return true;
  if (forced === '0') return false;
  // A choice remembered by a test build is ignored where there is no button
  // to turn it off again.
  if (!perfToggleAvailable()) return false;
  try {
    return window.localStorage?.getItem(PERF_PREF_KEY) === '1';
  } catch {
    return false;
  }
};

export const setPerfProbe = (on, { remember = false } = {}) => {
  if (remember) {
    try {
      if (on) window.localStorage?.setItem(PERF_PREF_KEY, '1');
      else window.localStorage?.removeItem(PERF_PREF_KEY);
    } catch {
      // Not remembered; the toggle still works for this session.
    }
  }
  return import('../../kart/devicePerfProbe.js')
    .then(({ mountDevicePerfProbe, unmountDevicePerfProbe }) => {
      if (on) mountDevicePerfProbe();
      else unmountDevicePerfProbe();
    })
    .catch(() => {});
};
