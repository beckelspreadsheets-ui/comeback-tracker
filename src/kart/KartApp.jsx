// K1: standalone kart-game shell. Mounts the SHIPPED intro → select →
// ComebackCityThreeKartRace flow with zero fitness-app involvement — no
// usePersistedState, no ArcadeRace3D (whose static import chain carries the
// 2.71MB plaza-scene-shapes.json), no WorldMode. Race results + reducedMotion
// live in kartLocalStore.js.
//
// MIRROR RULE RETIRED 2026-07-13 (app split): src/game/RaceScreen.jsx — the
// fitness copy this file used to mirror — is DELETED. The fitness app no
// longer routes to the game at all (its Race nav links out to this app).
// This file is now the ONLY owner of the intro → select flow; edit freely.

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
import { KartModelStage } from './KartModelStage.jsx';
import charCrrtBunnyUrl from '../assets/game/select/char-crrt-bunny.png';
import charSethPenguinUrl from '../assets/game/select/char-seth-penguin.png';
import charMizzleUrl from '../assets/game/select/char-mizzle.png';
import charTclowUrl from '../assets/game/select/char-tclow.png';
import charLayer23Url from '../assets/game/select/char-layer23.png';
import charLifoladenUrl from '../assets/game/select/char-lifoladen.webp';
import kartHeroUrl from '../assets/game/select/kart-hero.png';
import kartIcesledUrl from '../assets/game/select/kart-icesled.png';
import kartIceracerUrl from '../assets/game/select/kart-iceracer.png';
import kartKenneyUrl from '../assets/game/select/kart-kenney.png';
import kartMiamicruiserUrl from '../assets/game/select/kart-miamicruiser.png';
import kartIceblockUrl from '../assets/game/select/kart-iceblock.png';
import kartBtckartUrl from '../assets/game/select/kart-btckart.png';
// The five wave-8 bodies. They were added to KART_OPTIONS without portraits,
// so the picker rendered a broken image for five of twelve karts from that day
// until 2026-08-07. Captured from the real GLBs by
// scripts/select-portraits-capture.mjs and shipped as .webp — 44 KB for all
// five, against 428 KB had they stayed PNG like their predecessors.
import kartHashrunnerUrl from '../assets/game/select/kart-hashrunner.webp';
import kartColdwalletUrl from '../assets/game/select/kart-coldwallet.webp';
import kartSatstackerUrl from '../assets/game/select/kart-satstacker.webp';
import kartPixelpickupUrl from '../assets/game/select/kart-pixelpickup.webp';
import kartNoderunnerUrl from '../assets/game/select/kart-noderunner.webp';

import backdropComebackCityUrl from '../assets/game/select/menu-backdrop-comeback-city.webp';
import backdropPenguinVillageUrl from '../assets/game/select/menu-backdrop-penguin-village.webp';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// ── Menu design tokens ────────────────────────────────────────────────────
// Owner, 2026-08-07: the menus "read like a cheap UI instead of premium".
// The diagnosis is in the markup rather than the art: every surface was a
// SHARP-CORNERED FLAT PANEL — `border border-white/12 bg-white/[0.03]` — with
// no depth, no blur, no shadow and no transition, which is the visual grammar
// of a developer tool. Nothing here is a new idea; it is the same information
// given a surface that behaves like glass over a lit backdrop.
//
// Kept as shared constants so the three screens cannot drift apart, which is
// how the old ones ended up looking like three different products.
const PANEL =
  'rounded-2xl border border-white/10 bg-white/[0.055] backdrop-blur-xl shadow-[0_24px_70px_-28px_rgba(0,0,0,0.95)] ring-1 ring-inset ring-white/[0.07]';
const PANEL_HOVER = 'transition-all duration-200 hover:border-white/25 hover:bg-white/[0.09] hover:-translate-y-0.5';
// Selection has to be unmistakable at a glance on a phone, so it is three
// signals at once — border, glow and lift — not just a border colour.
const PANEL_SELECTED =
  'rounded-2xl border border-[#ffd34f] bg-[#ffd34f]/[0.13] shadow-[0_0_34px_-6px_rgba(255,211,79,0.65),0_24px_70px_-28px_rgba(0,0,0,0.95)] ring-1 ring-inset ring-[#ffd34f]/40 -translate-y-0.5';
const EYEBROW = 'font-mono text-[10px] font-black uppercase tracking-[0.28em] text-[#7eefff]';
const SECTION_TITLE = 'font-mono text-[13px] font-black uppercase tracking-[0.2em] text-white/90';
const CTA =
  'group relative overflow-hidden rounded-xl border border-[#ffd34f]/70 bg-gradient-to-b from-[#ffd34f]/25 to-[#ffb52e]/10 px-10 py-3.5 font-mono text-sm font-black uppercase tracking-[0.22em] text-[#ffe9a8] shadow-[0_0_30px_-8px_rgba(255,211,79,0.7)] transition-all duration-200 hover:from-[#ffd34f]/40 hover:to-[#ffb52e]/20 hover:text-white hover:shadow-[0_0_44px_-6px_rgba(255,211,79,0.9)] active:translate-y-px';

const MENU_BACKDROPS = {
  'comeback-city': backdropComebackCityUrl,
  'penguin-village': backdropPenguinVillageUrl,
};

// The lit plate behind every menu screen. The art is deliberately quiet in the
// centre and detailed at the edges, so the scrim can stay light enough to read
// as an ENVIRONMENT rather than a wallpaper the UI is pasted over. It also
// tracks your pick: choose Penguin Village and the whole menu goes arctic.
const MenuBackdrop = ({ trackKey }) => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <img
      src={MENU_BACKDROPS[trackKey] || backdropComebackCityUrl}
      alt=""
      aria-hidden="true"
      className="h-full w-full scale-105 object-cover transition-opacity duration-700"
      data-testid="menu-backdrop"
    />
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,11,26,0.88)_0%,rgba(8,11,26,0.7)_42%,rgba(8,11,26,0.94)_100%)]" />
  </div>
);

// Portraits are prerendered from the real GLBs by
// scripts/select-portraits-capture.mjs — rerun it when the roster changes.
const CHARACTER_PORTRAITS = {
  'crrt-bunny': charCrrtBunnyUrl,
  layer23: charLayer23Url,
  lifoladen: charLifoladenUrl,
  mizzle: charMizzleUrl,
  'seth-penguin': charSethPenguinUrl,
  tclow: charTclowUrl,
};
const KART_PORTRAITS = {
  hero: kartHeroUrl,
  icesled: kartIcesledUrl,
  iceracer: kartIceracerUrl,
  kenney: kartKenneyUrl,
  miamicruiser: kartMiamicruiserUrl,
  iceblock: kartIceblockUrl,
  btckart: kartBtckartUrl,
  hashrunner: kartHashrunnerUrl,
  coldwallet: kartColdwalletUrl,
  satstacker: kartSatstackerUrl,
  pixelpickup: kartPixelpickupUrl,
  noderunner: kartNoderunnerUrl,
};

// The item roster, as DATA. It used to be eleven hand-written <li>s, which is
// why it read as a wall of text: nothing could give the items a consistent
// shape because each one was bespoke markup. Icons still come from the SAME
// map as the in-race HUD chip (HeldItemIcon), so what you read here is exactly
// what you see next to the throw button when you are holding it.
const ITEM_GUIDE = [
  { color: '#ffd34f', item: 'cocoa', name: 'Hot Cocoa', text: 'Chug it for an instant mini-turbo.' },
  { color: '#49d9ff', item: 'iceshield', name: 'Ice Shield', text: 'A crystal dome that eats the next hit.' },
  { color: '#f2ecd9', item: 'fishbone', name: 'Fish Bone', text: 'Drops behind you and arms after a beat; spins out whoever runs it over.' },
  { color: '#9fdcff', item: 'snowball', name: 'Snowball', skin: 'snowball', text: "Throws forward; first kart it catches spins out. Bunny throws carrots, penguins throw ice shards. You get these when you're behind." },
  { color: '#cfe8f4', item: 'slapfish', name: 'Slap Fish', text: 'Swings a big fish; spins anyone riding alongside.' },
  { color: '#ffb066', item: 'sardine', name: 'Rocket Sardine', text: 'Homes in on the kart directly ahead. A shield blocks it.' },
  { color: '#dff3ff', item: 'blizzard', name: 'Blizzard Cloud', text: 'Parks a fog dome on the road for 8s; everyone inside crawls. Yours slows you too.' },
  { color: '#f4fbff', item: 'avalanche', name: 'Avalanche', rare: true, text: 'Buries whoever is in 1st. Watch for the rumble.' },
  { color: '#9ff5d0', item: 'aurora', name: 'Aurora Boost', rare: true, text: "3s of invincible speed. Everything you touch spins; you don't." },
  { color: '#f4f8ff', item: 'march', name: 'Penguin March', rare: true, text: 'A waddle-train of ordinal penguins crosses the road ahead. Hit the line and you spin.' },
];

const GuideCard = ({ children, title }) => (
  <div className={`${PANEL} p-5`}>
    <div className="mb-3 flex items-center gap-2">
      <span className="h-3.5 w-[3px] rounded-full bg-[#ffd34f]" />
      <span className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#ffd34f]">{title}</span>
    </div>
    {children}
  </div>
);

const Key = ({ children }) => (
  <span className="mx-0.5 inline-block rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]">
    {children}
  </span>
);

const KartIntroScreen = ({ onStart, trackKey }) => (
  <div className="absolute inset-0 z-40 overflow-y-auto" data-testid="race-intro-screen">
    <MenuBackdrop trackKey={trackKey} />
    <div className="relative flex min-h-full justify-center p-4 sm:p-6">
      <div className="my-auto w-full max-w-5xl space-y-6 py-6">
        <div className="text-center">
          <div className={EYEBROW}>Comeback City</div>
          <h2 className="mt-2 font-mono text-3xl font-black uppercase tracking-[0.04em] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] sm:text-4xl">
            How to Race
          </h2>
          <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-[#ffd34f]/70 to-transparent" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <GuideCard title="Drive">
            <ul className="space-y-2 text-[13px] leading-relaxed text-white/75">
              <li><Key>↑</Key><Key>W</Key> accelerate</li>
              <li><Key>←</Key><Key>→</Key><Key>A</Key><Key>D</Key> steer</li>
              <li><Key>↓</Key><Key>S</Key> brake</li>
              <li><Key>SHIFT</Key><Key>ENTER</Key><Key>E</Key><Key>F</Key> fire item</li>
              <li className="pt-1 text-white/55">
                On mobile you auto-accelerate: drag to steer, flick the drag to drift, tap to throw — the big buttons
                work too. <span className="text-white/80">TILT</span> switches to motion steering.
              </li>
            </ul>
          </GuideCard>
          <GuideCard title="Drift &amp; Tricks">
            <ul className="space-y-2 text-[13px] leading-relaxed text-white/75">
              <li><Key>SPACE</Key> in a corner — hop into a drift; hold it.</li>
              <li>
                Sparks charge <span className="font-semibold text-[#46d9ef]">blue</span> →{' '}
                <span className="font-semibold text-[#ff9a2e]">orange</span> →{' '}
                <span className="font-semibold text-[#c879ff]">purple</span>; release for a bigger boost.
              </li>
              <li>Tap <Key>SPACE</Key> mid-air off any ramp — land a trick for a boost.</li>
              <li>
                The <span className="font-semibold text-[#c879ff]">purple dare ramp</span> jumps the whole corner — only
                with boost speed. Miss it and you crawl.
              </li>
            </ul>
          </GuideCard>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className={SECTION_TITLE}>Items</h3>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
              Question boxes hand you one
            </span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3" data-testid="race-item-guide">
            {ITEM_GUIDE.map((entry) => (
              <div key={entry.item} className={`${PANEL} ${PANEL_HOVER} flex items-start gap-3 p-3.5`}>
                <span
                  className="mt-0.5 shrink-0 rounded-lg border border-white/10 bg-black/25 p-1.5"
                  style={{ color: entry.color }}
                >
                  <HeldItemIcon size={26} heldItem={entry.item} projectileSkin={entry.skin} />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-black uppercase tracking-[0.06em] text-white">
                      {entry.name}
                    </span>
                    {entry.rare ? (
                      <span className="rounded border border-[#c879ff]/50 bg-[#c879ff]/15 px-1.5 py-px font-mono text-[8px] font-black uppercase tracking-[0.12em] text-[#dcb4ff]">
                        Last place · final lap
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-[12px] leading-snug text-white/60">{entry.text}</span>
                </span>
              </div>
            ))}
            <div className={`${PANEL} ${PANEL_HOVER} flex items-start gap-3 p-3.5`}>
              <span className="mt-0.5 shrink-0 rounded-lg border border-white/10 bg-black/25 p-1.5 text-[#ffb52e]">
                <Bitcoin size={26} />
              </span>
              <span className="min-w-0">
                <span className="font-mono text-[11px] font-black uppercase tracking-[0.06em] text-white">₿ Coins</span>
                <span className="mt-1 block text-[12px] leading-snug text-white/60">
                  Collect them off the road; every coin nudges your top speed (up to 10). Spin out and a few shake
                  loose. Rows come back each lap.
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button type="button" className={CTA} data-testid="race-intro-start" onClick={onStart}>
            Start Race
          </button>
          <div className="mt-3 text-[11px] text-white/40">
            Beat Blue Speed for the win — he's fast, but he can't drift like you.
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Stat spread is 0.92–1.08 — map onto bars so the differences read.
const statPercent = (value) => Math.round(clamp(((value - 0.9) / 0.18) * 100, 8, 100));
const KartStatBar = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <span className="w-11 shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-white/45">{label}</span>
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/40 ring-1 ring-inset ring-white/[0.06]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#46d9ef] to-[#7eefff] shadow-[0_0_10px_-1px_rgba(126,239,255,0.8)] transition-[width] duration-300"
        style={{ width: `${statPercent(value)}%` }}
      />
    </div>
  </div>
);

// Pre-race garage: pick your racer AND your kart (karts carry light stat
// spreads). The remaining characters take the rival seats in their signature
// rides. Shown every visit after the one-time intro; QA automation skips it.
// The hero stage. Sits above the pickers: one big LIT, MOVING view of what you
// have actually chosen, with the small plates below demoted to what they are
// good at — being a legible grid you pick from. That split is the whole fix.
// The stage previews the race (it borrows the chosen track's key light); the
// tiles let you choose fast.
const KartSelectHero = ({ characterKey, kartKey, reducedMotion, trackKey }) => {
  const character = KART_CHARACTERS.find((entry) => entry.key === characterKey);
  const kart = KART_OPTIONS.find((entry) => entry.key === kartKey);
  return (
    <div
      className={`${PANEL} relative h-[260px] w-full overflow-hidden sm:h-[340px]`}
      style={{ boxShadow: `0 0 60px -30px ${character?.accent || '#7eefff'}, 0 24px 70px -28px rgba(0,0,0,0.95)` }}
    >
      {/* A pool of the character's own accent under the kart, so the stage
          reacts to the pick in colour as well as in motion. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 opacity-40 transition-colors duration-500"
        style={{ background: `radial-gradient(ellipse at 50% 100%, ${character?.accent || '#7eefff'}44 0%, transparent 70%)` }}
      />
      <KartModelStage
        characterKey={characterKey}
        kartKey={kartKey}
        reducedMotion={reducedMotion}
        trackKey={trackKey}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-4">
        <div>
          <div className="font-mono text-[19px] font-black uppercase leading-none tracking-[0.05em] text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.95)]">
            {character?.name}
          </div>
          <div
            className="mt-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: character?.accent }}
          >
            {kart?.name}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-right font-mono text-[9px] uppercase tracking-[0.18em] text-white/55 backdrop-blur-sm">
          {KART_TRACKS.find((entry) => entry.key === trackKey)?.name}
        </div>
      </div>
    </div>
  );
};

const KartCharacterSelect = ({ kartKey, onShowGuide, onStart, reducedMotion, selectedKey, setKartKey, setSelectedKey, setTrackKey, trackKey }) => (
  <div className="absolute inset-0 z-40 overflow-y-auto" data-testid="race-character-select">
    <MenuBackdrop trackKey={trackKey} />
    <div className="relative flex min-h-full justify-center p-4 sm:p-6">
      <div className="my-auto w-full max-w-4xl space-y-6 py-6">
      <div className="text-center">
        <div className={EYEBROW}>Comeback City Grand Prix</div>
        <h2 className="mt-2 font-mono text-3xl font-black uppercase tracking-[0.04em] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] sm:text-4xl">
          Race Setup
        </h2>
        <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-[#ffd34f]/70 to-transparent" />
      </div>
      <KartSelectHero
        characterKey={selectedKey}
        kartKey={kartKey}
        reducedMotion={reducedMotion}
        trackKey={trackKey}
      />
      <div className="text-center">
        {/* W2 (owner): the intro's full item guide must be reachable every
            visit, not just the first — "so people are not just guessing". */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 py-2.5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/75 backdrop-blur-md transition-all duration-200 hover:border-[#7eefff]/60 hover:bg-[#7eefff]/10 hover:text-[#7eefff]"
          data-testid="race-open-item-guide"
          onClick={onShowGuide}
        >
          <BookOpen size={13} />
          How to race &amp; item guide
        </button>
      </div>
      <div>
        <h3 className={`${SECTION_TITLE} mb-3`}>Pick Your Track</h3>
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
              className={`relative overflow-hidden p-4 text-left ${selected ? PANEL_SELECTED : `${PANEL} ${PANEL_HOVER}`}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[13px] font-black uppercase tracking-[0.06em] text-white">
                  {entry.name}
                </span>
                <span className="shrink-0 rounded-md border border-[#7eefff]/30 bg-[#7eefff]/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#7eefff]">
                  {entry.laps} laps
                </span>
              </div>
              <div className="mt-1.5 text-[11px] leading-snug text-white/55">{entry.tagline}</div>
            </button>
          );
        })}
      </div>
      <div>
        <h3 className={`${SECTION_TITLE} mb-1`}>Pick Your Racer</h3>
        <p className="mb-3 text-[11px] text-white/40">The rest of the crew lines up against you.</p>
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
              className={`relative p-3 text-center ${selected ? PANEL_SELECTED : `${PANEL} ${PANEL_HOVER}`}`}
            >
              {/* The accent pool doubles as the "this one is picked" tell at a
                  glance on a phone, where the border alone is a few pixels. */}
              <span
                className="pointer-events-none absolute inset-x-3 bottom-8 h-14 rounded-full opacity-60 blur-xl transition-opacity duration-300"
                style={{ background: entry.accent, opacity: selected ? 0.4 : 0.14 }}
              />
              <img
                src={CHARACTER_PORTRAITS[entry.key]}
                alt={entry.name}
                className={`relative mx-auto mb-2 h-24 w-24 object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,0.7)] transition-transform duration-200 ${
                  selected ? 'scale-110' : 'group-hover:scale-105'
                }`}
              />
              <div className="relative font-mono text-[11px] font-black uppercase tracking-[0.06em] text-white">
                {entry.name}
              </div>
              <div className="relative mt-1 font-mono text-[9px] uppercase tracking-[0.1em]" style={{ color: entry.accent }}>
                throws {entry.projectileSkin === 'carrot' ? 'carrots' : 'ice shards'}
              </div>
            </button>
          );
        })}
      </div>
      <div>
        <h3 className={`${SECTION_TITLE} mb-3`}>Pick Your Kart</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {KART_OPTIONS.map((entry) => {
          const selected = entry.key === kartKey;
          return (
            <button
              key={entry.key}
              type="button"
              data-testid={`race-kart-${entry.key}`}
              onClick={() => setKartKey(entry.key)}
              className={`p-3.5 ${selected ? PANEL_SELECTED : `${PANEL} ${PANEL_HOVER}`}`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={KART_PORTRAITS[entry.key]}
                  alt={entry.name}
                  className={`h-20 w-20 shrink-0 object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,0.7)] transition-transform duration-200 ${
                    selected ? 'scale-105' : ''
                  }`}
                />
                <div className="min-w-0 flex-1 text-left">
                  <div className="font-mono text-[11px] font-black uppercase tracking-[0.06em] text-white">
                    {entry.name}
                  </div>
                  <div className="mb-2 text-[10px] text-white/45">{entry.tagline}</div>
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
      <div className="pt-1 text-center">
        <button type="button" className={CTA} data-testid="race-character-start" onClick={onStart}>
          Start Race
        </button>
      </div>
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
        <KartIntroScreen onStart={dismissIntro} trackKey={kartTrackKey} />
      ) : !characterReady ? (
        <KartCharacterSelect
          kartKey={kartKey || (KART_CHARACTERS.find((entry) => entry.key === characterKey) || KART_CHARACTERS[0]).kart}
          onShowGuide={() => setIntroSeen(false)}
          onStart={confirmCharacter}
          reducedMotion={reducedMotion}
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
