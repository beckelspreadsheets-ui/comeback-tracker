// On-device performance readout: the switch (RELEASE_V1_PLAN Phase 2).
//
// The readout itself is src/kart/devicePerfProbe.js, opt-in and dynamically
// imported so players who never ask for it never download it. It used to be
// reachable only through ?perf=1, and the iOS app has no address bar, so the
// race's pause menu now toggles it as well and the choice is remembered on the
// device. ?perf=1 / ?perf=0 still force it either way.
const PERF_PREF_KEY = 'cc-kart-perf-overlay';

export const readPerfProbePref = () => {
  if (typeof window === 'undefined') return false;
  const forced = new URLSearchParams(window.location.search).get('perf');
  if (forced === '1') return true;
  if (forced === '0') return false;
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
