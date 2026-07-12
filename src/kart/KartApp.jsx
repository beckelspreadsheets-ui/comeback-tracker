// K1: standalone kart-game shell. Mounts the SHIPPED intro → select →
// ComebackCityThreeKartRace flow with zero fitness-app involvement — no
// usePersistedState, no ArcadeRace3D (whose static import chain carries the
// 2.71MB plaza-scene-shapes.json), no WorldMode. Race results + reducedMotion
// live in kartLocalStore.js.
//
// MIRROR RULE: KartIntroScreen, KartStatBar, KartCharacterSelect,
// urlSeededKey, the portrait maps, and the select-flow state machine are
// copied VERBATIM from src/game/RaceScreen.jsx:49-60, 1727-1948, 1953-2043
// and 2184-2228 (the live first return). RaceScreen cannot be imported here:
// its module-level `import { ArcadeRace3D }` (RaceScreen.jsx:29) would bundle
// the exact dead fitness chain K1 exists to remove, and editing RaceScreen
// would break the fitness build's byte-identity guarantee. Until the fitness
// copy is deleted (K2/V2 cleanup), intro/select edits MUST be applied to both
// files.

import { useCallback, useEffect, useState } from 'react';
import { Bitcoin, BookOpen } from 'lucide-react';
import {
  ComebackCityThreeKartRace,
  DEFAULT_CHARACTER_KEY,
  HeldItemIcon,
  KART_CHARACTERS,
  KART_OPTIONS,
} from '../game/ComebackCityThreeKartRace.jsx';
import { DEFAULT_TRACK_KEY, KART_TRACKS } from '../game/race/tracks/index.js';
import {
  migrateLegacyRaceResultsOnce,
  readReducedMotion,
  recordRaceFinish,
} from './kartLocalStore.js';
import charCrrtBunnyUrl from '../assets/game/select/char-crrt-bunny.png';
import charSethPenguinUrl from '../assets/game/select/char-seth-penguin.png';
import charMizzleUrl from '../assets/game/select/char-mizzle.png';
import charTclowUrl from '../assets/game/select/char-tclow.png';
import charLayer23Url from '../assets/game/select/char-layer23.png';
import kartHeroUrl from '../assets/game/select/kart-hero.png';
import kartIcesledUrl from '../assets/game/select/kart-icesled.png';
import kartKenneyUrl from '../assets/game/select/kart-kenney.png';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Portraits are prerendered from the real GLBs by
// scripts/select-portraits-capture.mjs — rerun it when the roster changes.
const CHARACTER_PORTRAITS = {
  'crrt-bunny': charCrrtBunnyUrl,
  layer23: charLayer23Url,
  mizzle: charMizzleUrl,
  'seth-penguin': charSethPenguinUrl,
  tclow: charTclowUrl,
};
const KART_PORTRAITS = {
  hero: kartHeroUrl,
  icesled: kartIcesledUrl,
  kenney: kartKenneyUrl,
};

const KartIntroScreen = ({ onStart }) => (
  <div
    className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#0c1124]/[0.97] p-4"
    data-testid="race-intro-screen"
  >
    <div className="w-full max-w-3xl space-y-5 py-6">
      <div className="text-center">
        <div className="font-mono text-[11px] font-black uppercase tracking-[0.3em] text-[#7eefff]">Comeback City</div>
        <h2 className="mt-1 font-mono text-2xl font-black uppercase tracking-[0.08em] text-white">Grand Prix — How to Race</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border border-white/12 bg-white/[0.03] p-4">
          <div className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd34f]">Drive</div>
          <ul className="space-y-1.5 text-[13px] leading-snug text-white/80">
            <li><span className="text-white">↑ / W</span> — accelerate</li>
            <li><span className="text-white">← → / A D</span> — steer</li>
            <li><span className="text-white">↓ / S</span> — brake</li>
            <li><span className="text-white">SHIFT / ENTER / E / F</span> — fire item</li>
            <li>On mobile you auto-accelerate: joystick steers, big buttons drift + fire.</li>
          </ul>
        </div>
        <div className="border border-white/12 bg-white/[0.03] p-4">
          <div className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd34f]">Drift &amp; Tricks</div>
          <ul className="space-y-1.5 text-[13px] leading-snug text-white/80">
            <li><span className="text-white">SPACE</span> in a corner — hop into a drift; hold it.</li>
            <li>Sparks charge <span className="text-[#46d9ef]">blue</span> → <span className="text-[#ff9a2e]">orange</span> → <span className="text-[#c879ff]">purple</span>; release for a bigger boost.</li>
            <li>Tap <span className="text-white">SPACE</span> mid-air off any ramp — land a trick for a boost.</li>
            <li>The <span className="text-[#c879ff]">purple dare ramp</span> jumps the whole corner — only with boost speed. Miss it and you crawl.</li>
          </ul>
        </div>
        <div className="border border-white/12 bg-white/[0.03] p-4">
          <div className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd34f]">Items</div>
          {/* Icons come from the SAME map as the in-race HUD chip (HeldItemIcon),
              so what you read here is exactly what you'll see next to the
              throw button when you're holding it. */}
          <ul className="space-y-2 text-[13px] leading-snug text-white/80">
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#ffd34f]"><HeldItemIcon heldItem="cocoa" /></span> <span><span className="text-white">Hot Cocoa</span> — chug it for an instant mini-turbo.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#49d9ff]"><HeldItemIcon heldItem="iceshield" /></span> <span><span className="text-white">Ice Shield</span> — a crystal dome that eats the next hit.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#f2ecd9]"><HeldItemIcon heldItem="fishbone" /></span> <span><span className="text-white">Fish Bone</span> — drops behind you and arms after a beat; spins out whoever runs it over.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#9fdcff]"><HeldItemIcon heldItem="snowball" projectileSkin="snowball" /></span> <span><span className="text-white">Snowball</span> — throws forward; first kart it catches spins out. Bunny throws carrots, penguins throw ice shards. You get these when you're behind.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#cfe8f4]"><HeldItemIcon heldItem="slapfish" /></span> <span><span className="text-white">Slap Fish</span> — swings a big fish; spins anyone riding alongside.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#ffb066]"><HeldItemIcon heldItem="sardine" /></span> <span><span className="text-white">Rocket Sardine</span> — homes in on the kart directly ahead. A shield blocks it.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#dff3ff]"><HeldItemIcon heldItem="blizzard" /></span> <span><span className="text-white">Blizzard Cloud</span> — parks a fog dome on the road for 8s; everyone inside crawls. Yours slows you too.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#f4fbff]"><HeldItemIcon heldItem="avalanche" /></span> <span><span className="text-white">Avalanche</span> — last place, final lap only: buries whoever is in 1st. Watch for the rumble.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#9ff5d0]"><HeldItemIcon heldItem="aurora" /></span> <span><span className="text-white">Aurora Boost</span> — last place, final lap only: 3s of invincible speed. Everything you touch spins; you don't.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#f4f8ff]"><HeldItemIcon heldItem="march" /></span> <span><span className="text-white">Penguin March</span> — last place, final lap only: a waddle-train of ordinal penguins crosses the road ahead. Hit the line and you spin.</span></li>
            <li>Question boxes hand you one — the icon shows next to the throw button while you hold it.</li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#ffb52e]"><Bitcoin size={15} /></span> <span><span className="text-white">₿ Coins</span> — collect them off the road; every coin nudges your top speed (up to 10). Spin out and a few shake loose. Rows come back each lap.</span></li>
          </ul>
        </div>
      </div>
      <div className="text-center">
        <button
          type="button"
          className="border border-[#ffd34f]/60 bg-[#ffd34f]/10 px-8 py-3 font-mono text-sm font-black uppercase tracking-[0.2em] text-[#ffd34f] transition-colors hover:bg-[#ffd34f]/20"
          data-testid="race-intro-start"
          onClick={onStart}
        >
          Start Race
        </button>
        <div className="mt-2 text-[11px] text-white/40">Beat Blue Speed for the win — he's fast, but he can't drift like you.</div>
      </div>
    </div>
  </div>
);

// Stat spread is 0.92–1.08 — map onto bars so the differences read.
const statPercent = (value) => Math.round(clamp(((value - 0.9) / 0.18) * 100, 8, 100));
const KartStatBar = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <span className="w-12 shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-white/45">{label}</span>
    <div className="h-1.5 flex-1 bg-white/10">
      <div className="h-full bg-[#7eefff]" style={{ width: `${statPercent(value)}%` }} />
    </div>
  </div>
);

// Pre-race garage: pick your racer AND your kart (karts carry light stat
// spreads). The remaining characters take the rival seats in their signature
// rides. Shown every visit after the one-time intro; QA automation skips it.
const KartCharacterSelect = ({ kartKey, onShowGuide, onStart, selectedKey, setKartKey, setSelectedKey, setTrackKey, trackKey }) => (
  <div
    className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#0c1124]/[0.97] p-4"
    data-testid="race-character-select"
  >
    <div className="w-full max-w-4xl space-y-5 py-6">
      <div className="text-center">
        <div className="font-mono text-[11px] font-black uppercase tracking-[0.3em] text-[#7eefff]">Comeback City Grand Prix</div>
        <h2 className="mt-1 font-mono text-2xl font-black uppercase tracking-[0.08em] text-white">Race Setup</h2>
        <p className="mt-1 text-[12px] text-white/50">Pick your track, your racer, and your kart.</p>
        {/* W2 (owner): the intro's full item guide must be reachable every
            visit, not just the first — "so people are not just guessing". */}
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-2 border border-white/20 bg-white/[0.04] px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/75 transition-colors hover:border-[#7eefff]/60 hover:text-[#7eefff]"
          data-testid="race-open-item-guide"
          onClick={onShowGuide}
        >
          <BookOpen size={13} />
          How to race &amp; item guide
        </button>
      </div>
      <div className="text-center">
        <h3 className="font-mono text-sm font-black uppercase tracking-[0.14em] text-white">Pick Your Track</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {KART_TRACKS.map((entry) => {
          const selected = entry.key === trackKey;
          return (
            <button
              key={entry.key}
              type="button"
              data-testid={`race-track-${entry.key}`}
              onClick={() => setTrackKey(entry.key)}
              className={`border p-4 text-left transition-colors ${
                selected ? 'border-[#ffd34f] bg-[#ffd34f]/10' : 'border-white/12 bg-white/[0.03] hover:border-white/30'
              }`}
            >
              <div className="font-mono text-[12px] font-black uppercase tracking-[0.08em] text-white">{entry.name}</div>
              <div className="mt-1 text-[11px] text-white/55">{entry.tagline}</div>
              <div className="mt-1 text-[10px] text-[#7eefff]">{entry.laps} laps</div>
            </button>
          );
        })}
      </div>
      <div className="text-center">
        <h3 className="font-mono text-sm font-black uppercase tracking-[0.14em] text-white">Pick Your Racer</h3>
        <p className="text-[11px] text-white/45">The rest of the crew lines up against you.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {KART_CHARACTERS.map((entry) => {
          const selected = entry.key === selectedKey;
          return (
            <button
              key={entry.key}
              type="button"
              data-testid={`race-character-${entry.key}`}
              onClick={() => {
                setSelectedKey(entry.key);
                setKartKey(entry.kart);
              }}
              className={`border p-3 text-center transition-colors ${
                selected
                  ? 'border-[#ffd34f] bg-[#ffd34f]/10'
                  : 'border-white/12 bg-white/[0.03] hover:border-white/30'
              }`}
            >
              <img
                src={CHARACTER_PORTRAITS[entry.key]}
                alt={entry.name}
                className="mx-auto mb-2 h-24 w-24 object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)]"
              />
              <div className="font-mono text-[11px] font-black uppercase tracking-[0.08em] text-white">{entry.name}</div>
              <div className="mt-1 text-[10px]" style={{ color: entry.accent }}>
                throws {entry.projectileSkin === 'carrot' ? 'carrots' : 'ice shards'}
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-center">
        <h3 className="font-mono text-sm font-black uppercase tracking-[0.14em] text-white">Pick Your Kart</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {KART_OPTIONS.map((entry) => {
          const selected = entry.key === kartKey;
          return (
            <button
              key={entry.key}
              type="button"
              data-testid={`race-kart-${entry.key}`}
              onClick={() => setKartKey(entry.key)}
              className={`border p-4 transition-colors ${
                selected
                  ? 'border-[#ffd34f] bg-[#ffd34f]/10'
                  : 'border-white/12 bg-white/[0.03] hover:border-white/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={KART_PORTRAITS[entry.key]}
                  alt={entry.name}
                  className="h-20 w-20 shrink-0 object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)]"
                />
                <div className="min-w-0 flex-1 text-left">
                  <div className="font-mono text-[11px] font-black uppercase tracking-[0.08em] text-white">{entry.name}</div>
                  <div className="mb-2 text-[10px] text-white/50">{entry.tagline}</div>
                  <div className="space-y-1">
                    <KartStatBar label="Speed" value={entry.stats.topSpeed} />
                    <KartStatBar label="Accel" value={entry.stats.accel} />
                    <KartStatBar label="Turn" value={entry.stats.handling} />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-center">
        <button
          type="button"
          className="border border-[#ffd34f]/60 bg-[#ffd34f]/10 px-8 py-3 font-mono text-sm font-black uppercase tracking-[0.2em] text-[#ffd34f] transition-colors hover:bg-[#ffd34f]/20"
          data-testid="race-character-start"
          onClick={onStart}
        >
          Start Race
        </button>
      </div>
    </div>
  </div>
);

// W1: share/QA URLs may carry ?character/?kart/?track. They SEED the select
// state here (visible as the preselected entry) and never override a later
// pick — the race component is prop-only, so whatever the cup select
// confirms is what races. While the param stays in the URL, a fresh visit
// to this screen re-seeds from it; the pick always wins for the race run.
const urlSeededKey = (name, isValid) => {
  if (typeof window === 'undefined') return null;
  const param = new URLSearchParams(window.location.search).get(name);
  return param && isValid(param) ? param : null;
};

export const KartApp = () => {
  // One-shot legacy import before anything reads results; runs before the
  // first race can finish, so kart-local entries always win afterwards.
  useState(() => {
    migrateLegacyRaceResultsOnce();
    return true;
  });
  const [reducedMotion] = useState(readReducedMotion);
  const [introSeen, setIntroSeen] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (window.navigator?.webdriver) return true; // QA harness skips the intro
    const params = new URLSearchParams(window.location.search);
    if (params.get('playableAutoplay') === '1' || params.get('raceAutoplay') === '1') return true;
    try {
      return window.localStorage?.getItem('cc-kart-intro-seen') === '1';
    } catch {
      return true;
    }
  });
  const dismissIntro = useCallback(() => {
    try {
      window.localStorage?.setItem('cc-kart-intro-seen', '1');
    } catch {
      // localStorage unavailable — show it again next time, no harm.
    }
    setIntroSeen(true);
  }, []);
  // Character select: shown every visit (QA automation skips it, same rules
  // as the intro). The last pick is remembered and preselected.
  const [characterReady, setCharacterReady] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (window.navigator?.webdriver) return true;
    const params = new URLSearchParams(window.location.search);
    return params.get('playableAutoplay') === '1' || params.get('raceAutoplay') === '1';
  });
  const [characterKey, setCharacterKey] = useState(() => {
    const seeded = urlSeededKey('character', (key) => KART_CHARACTERS.some((entry) => entry.key === key));
    if (seeded) return seeded;
    if (typeof window === 'undefined') return DEFAULT_CHARACTER_KEY;
    try {
      const saved = window.localStorage?.getItem('cc-kart-character');
      return KART_CHARACTERS.some((entry) => entry.key === saved) ? saved : DEFAULT_CHARACTER_KEY;
    } catch {
      return DEFAULT_CHARACTER_KEY;
    }
  });
  const [kartKey, setKartKey] = useState(() => {
    const seeded = urlSeededKey('kart', (key) => KART_OPTIONS.some((entry) => entry.key === key));
    if (seeded) return seeded;
    if (typeof window === 'undefined') return null;
    try {
      const saved = window.localStorage?.getItem('cc-kart-kart');
      return KART_OPTIONS.some((entry) => entry.key === saved) ? saved : null;
    } catch {
      return null;
    }
  });
  const [kartTrackKey, setKartTrackKey] = useState(() => {
    const seeded = urlSeededKey('track', (key) => KART_TRACKS.some((entry) => entry.key === key));
    if (seeded) return seeded;
    if (typeof window === 'undefined') return DEFAULT_TRACK_KEY;
    try {
      const saved = window.localStorage?.getItem('cc-kart-track');
      return KART_TRACKS.some((entry) => entry.key === saved) ? saved : DEFAULT_TRACK_KEY;
    } catch {
      return DEFAULT_TRACK_KEY;
    }
  });
  const confirmCharacter = useCallback(() => {
    try {
      window.localStorage?.setItem('cc-kart-character', characterKey);
      window.localStorage?.setItem('cc-kart-track', kartTrackKey);
      if (kartKey) window.localStorage?.setItem('cc-kart-kart', kartKey);
    } catch {
      // localStorage unavailable — the pick still applies this session.
    }
    setCharacterReady(true);
  }, [characterKey, kartKey, kartTrackKey]);
  useEffect(() => {
    // W1: the URL seed is ONE-SHOT. Strip the select params once the
    // initializers above have consumed them, so a stale share/lab URL can't
    // keep re-seeding over the owner's saved pick on every re-entry. QA
    // contexts are fresh page loads, so their seeded mount is unaffected.
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has('track') && !params.has('character') && !params.has('kart')) return;
    params.delete('track');
    params.delete('character');
    params.delete('kart');
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    );
  }, []);
  const handleFinish = useCallback((result) => {
    recordRaceFinish(result);
  }, []);

  return (
    <div
      className="relative min-h-[100svh] overflow-hidden bg-[#10151d]"
      data-race-renderer="three-kart"
      data-race-track={kartTrackKey}
      data-testid="race-screen"
    >
      {!introSeen ? (
        <KartIntroScreen onStart={dismissIntro} />
      ) : !characterReady ? (
        <KartCharacterSelect
          kartKey={kartKey || (KART_CHARACTERS.find((entry) => entry.key === characterKey) || KART_CHARACTERS[0]).kart}
          onShowGuide={() => setIntroSeen(false)}
          onStart={confirmCharacter}
          selectedKey={characterKey}
          setKartKey={setKartKey}
          setSelectedKey={setCharacterKey}
          setTrackKey={setKartTrackKey}
          trackKey={kartTrackKey}
        />
      ) : (
        <ComebackCityThreeKartRace
          character={characterKey}
          kart={kartKey}
          mode="race"
          onFinish={handleFinish}
          reducedMotion={reducedMotion}
          runId={1}
          track={kartTrackKey}
        />
      )}
    </div>
  );
};
