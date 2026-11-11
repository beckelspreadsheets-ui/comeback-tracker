// The App Store build (audit 2026-11-11, section 15, findings 1 and 4).
//
// `npm run ios:sync` builds with VITE_KART_STORE=1. In that build:
//   - the page address is wiped to a bare path before anything reads it, so
//     none of the ~50 QA switches (?giveItem, ?playableAutoplay, ?freebody,
//     ?mirror=1, the ?post* and ?*Lab families, #race ...) can do anything.
//     One guard here instead of a flag at every read, so a switch added later
//     is covered without anyone remembering to gate it;
//   - the window.__* debug hooks are not set (DEBUG_HOOKS).
// The web build, the dev server, the gates and the screenshot script are not
// store builds and keep every switch and hook.
//
// `npm run ios:sync:test` is the store build plus the pause-menu performance
// readout. The readout reads the race telemetry hook, so that one build keeps
// the hooks.
export const STORE_BUILD = import.meta.env?.VITE_KART_STORE === '1';
export const DEBUG_HOOKS = !STORE_BUILD || import.meta.env?.VITE_KART_PERF_TOGGLE === '1';

// The address with its query and hash removed, or null when there is nothing
// to remove.
export const storeCleanUrl = (href) => {
  const url = new URL(href);
  if (!url.search && !url.hash) return null;
  return url.pathname;
};

export const applyStoreUrlGuard = ({ enabled = STORE_BUILD, location, history } = {}) => {
  if (!enabled) return false;
  const where = location ?? (typeof window !== 'undefined' ? window.location : null);
  const stack = history ?? (typeof window !== 'undefined' ? window.history : null);
  if (!where || !stack) return false;
  try {
    const clean = storeCleanUrl(where.href);
    if (!clean) return false;
    stack.replaceState(stack.state ?? null, '', clean);
    return true;
  } catch {
    return false;
  }
};

// Runs when this module is first imported. src/kart/main.jsx imports it
// before anything else, so it is done before any other module reads the URL.
applyStoreUrlGuard();
