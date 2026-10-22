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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bitcoin, BookOpen, ChevronDown, Sparkles, Trophy, Wind } from 'lucide-react';
import {
  ComebackCityThreeKartRace,
  DEFAULT_CHARACTER_KEY,
  HeldItemIcon,
  KART_CHARACTERS,
  KART_OPTIONS,
} from '../game/ComebackCityThreeKartRace.jsx';
import { ALL_TRACKS, DEFAULT_TRACK_KEY, KART_TRACKS, PREVIEW_TRACKS, isKnownTrackKey } from '../game/race/tracks/index.js';
import { DEFAULT_RACE_CLASS, QA_RACE_CLASS, RACE_CLASSES } from '../game/race/raceClasses.js';
import {
  migrateLegacyRaceResultsOnce,
  readRaceResults,
  readReducedMotion,
  recordRaceFinish,
} from './kartLocalStore.js';
import { KartModelStage } from './KartModelStage.jsx';
import { GestureArt, RampGlyph } from './TouchGestureArt.jsx';
import { applyRaceToCup, createCup, cupStandings, isCupOver } from './cupMode.js';
import { MirrorModeToggle, MirrorUnlockedNote } from './MirrorModeToggle.jsx';
import {
  cupUnlocksMirror,
  initialMirrorSetup,
  isMirrorActive,
  mirrorAvailable,
  unlockMirror,
  writeMirrorChoice,
} from './mirrorUnlock.js';
import { recordsForMode } from '../game/race/mirrorMode.js';
import {
  awardRaceFinish,
  mergeEarnings,
  paintById,
  purchasePaint,
  racePaintFor,
  readPaints,
  readWallet,
  selectPaint,
} from '../game/race/progress.js';
import { EarningsToast, PaintShop, WalletChip } from './KartPaintShop.jsx';
import { createKartAudio, readStoredMute } from '../game/race/kartAudio.js';
import { KART_AUDIO_ASSETS } from '../game/race/kartAudioAssets.js';
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

const GuideCard = ({ children, note, title, ...rest }) => (
  <div className={`${PANEL} p-5`} {...rest}>
    <div className="mb-3 flex items-center gap-2">
      <span className="h-3.5 w-[3px] rounded-full bg-[#ffd34f]" />
      <span className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#ffd34f]">{title}</span>
      {note ? (
        <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">{note}</span>
      ) : null}
    </div>
    {children}
  </div>
);

const Key = ({ children }) => (
  <span className="mx-0.5 inline-block rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]">
    {children}
  </span>
);

// ── Touch-first guide (RELEASE_V1_PLAN 1.11) ─────────────────────────────
// The iPhone app is most players' first controller, and the guide used to be
// keyboard-first with the whole touch scheme in one grey sentence at the
// bottom of the Drive card. Phones now get the touch card FIRST and the
// keyboard behind a disclosure; desktops keep the keyboard cards on top and
// get the touch card second.
//
// Same gate as the race's touch UI (`touchControls` in
// ComebackCityThreeKartRace.jsx: ?touchControls=1|0, else a coarse primary
// pointer), so the guide never teaches a scheme the race won't show. Not
// maxTouchPoints: a touchscreen laptop reports touch points but races on the
// keyboard, because its primary pointer is fine.
const detectTouchFirst = () => {
  if (typeof window === 'undefined') return false;
  try {
    const forced = new URLSearchParams(window.location.search).get('touchControls');
    if (forced === '1' || forced === '0') return forced === '1';
    return window.matchMedia?.('(pointer: coarse)')?.matches === true;
  } catch {
    return false;
  }
};

// Drift tiers in the colours the race paints them (DRIFT_FEEL.sparkColors in
// src/game/race/driftFeel.js). Tier 2 is the boost gold #FFD34F; this guide
// used to call it orange.
const SparkLadder = () => (
  <>
    <span className="font-semibold text-[#00e5ff]">blue</span> →{' '}
    <span className="font-semibold text-[#ffd34f]">gold</span> →{' '}
    <span className="font-semibold text-[#c879ff]">purple</span>
  </>
);

const Em = ({ children }) => <span className="font-semibold text-white/90">{children}</span>;

// Miniatures of the race's own touch controls (.three-kart-race__cluster-*,
// __tilt-toggle and the gold countdown digit in comebackCityThreeKartRace.css)
// so the names here match what is on screen mid-race. Decorative: the sentence
// beside each one says what it does.
const CHIP = 'flex shrink-0 items-center justify-center border font-mono font-black uppercase leading-none';
const BUTTON_CHIP = `${CHIP} h-10 w-10 flex-col gap-0.5 rounded-[11px] bg-white/[0.08] text-[7px]`;
const Chip = ({ children, className }) => (
  <span aria-hidden="true" className={className}>
    {children}
  </span>
);
const DriftChip = () => (
  <Chip className={`${BUTTON_CHIP} border-[#38d7ff]/30 text-[#7ff4ff]`}>
    <Sparkles size={15} />
    Drift
  </Chip>
);
const ItemChip = () => (
  <Chip className={`${BUTTON_CHIP} border-[#ffd34f]/45 text-[#ffd34f]`}>
    <HeldItemIcon heldItem="snowball" projectileSkin="snowball" size={17} />
    Item
  </Chip>
);

const TouchTip = ({ chips, children }) => (
  <li className="flex items-center gap-3">
    <span className="flex w-[84px] shrink-0 justify-end gap-1">{chips}</span>
    <span className="min-w-0">{children}</span>
  </li>
);

// Checked against the race's touch handlers (joystickDown/Move/End): the
// steer zone is everything left of the button cluster, the stick floats from
// wherever the thumb lands (±64px = full lock), a fast sideways flick during
// a drag holds drift until the thumb lifts, and a tap under 220ms / 12px
// fires the item.
const TOUCH_GESTURES = [
  {
    kind: 'drag',
    title: 'Drag to steer',
    text: 'Touch down anywhere left of the buttons and slide left or right. Slide further to turn harder.',
  },
  {
    kind: 'flick',
    title: 'Flick to drift',
    text: (
      <>
        Into a corner, flick your thumb fast toward the turn and keep it down. Sparks charge <SparkLadder />; lift to
        fire the boost.
      </>
    ),
  },
  {
    kind: 'tap',
    title: 'Tap to throw',
    text: 'A quick tap uses your item. The big gold button on the right shows what you’re holding.',
  },
];

// raceTips: the two control-free tips that otherwise live only in the keyboard
// cards — needed when those sit behind the disclosure.
const TouchControlsCard = ({ note, raceTips }) => (
  <GuideCard data-testid="race-touch-guide" note={note} title="Touch controls">
    <p className="text-[13px] leading-relaxed text-white/75">
      Your kart accelerates by itself. Steer, drift and throw with one thumb on the left of the screen.
    </p>
    <ul className="mt-4 grid gap-4 sm:grid-cols-3">
      {TOUCH_GESTURES.map((gesture) => (
        <li className="flex items-center gap-4 sm:flex-col sm:items-stretch sm:gap-3" key={gesture.kind}>
          <span className="h-[76px] w-[108px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30 sm:h-24 sm:w-full [@media(max-height:500px)]:h-20">
            <GestureArt kind={gesture.kind} />
          </span>
          <span className="min-w-0">
            <span className="block font-mono text-[13px] font-black uppercase tracking-[0.08em] text-white">
              {gesture.title}
            </span>
            <span className="mt-1 block text-[13px] leading-snug text-white/75">{gesture.text}</span>
          </span>
        </li>
      ))}
    </ul>
    <div className="mt-5 border-t border-white/10 pt-4">
      <div className={EYEBROW}>Buttons &amp; extras</div>
      <ul className="mt-3 grid gap-x-6 gap-y-3 text-[13px] leading-snug text-white/75 md:grid-cols-2">
        <TouchTip chips={<><DriftChip /><ItemChip /></>}>
          Prefer buttons? Hold <Em>Drift</Em> through a corner and let go to boost, or tap <Em>Item</Em> to throw. The
          red <span className="font-semibold text-[#ff8f8f]">↓</span> brakes.
        </TouchTip>
        <TouchTip chips={<ItemChip />}>
          <Em>Shield trick:</Em> got a fish bone, snowball or sardine? Hold <Em>Item</Em> to trail it behind you — it
          blocks the next shot. Let go to use it.
        </TouchTip>
        <TouchTip
          chips={
            <Chip className={`${CHIP} h-7 rounded-full border-[#38d7ff]/30 bg-[#0c101d]/70 px-2.5 text-[8px] text-[#9fc2d8]`}>
              Tilt off
            </Chip>
          }
        >
          <Em>Tilt</Em> (top right) steers by tilting your phone. Your thumb still takes over whenever it’s down.
        </TouchTip>
        <TouchTip
          chips={
            <>
              <Chip className={`${CHIP} h-10 w-10 rounded-full border-2 border-[#ffd34f]/70 text-[19px] text-[#ffd34f]`}>2</Chip>
              <DriftChip />
            </>
          }
        >
          <Em>Rocket start:</Em> hold <Em>Drift</Em> just as the <span className="font-semibold text-[#ffd34f]">2</span>{' '}
          appears and keep holding to GO. Too early floods the engine.
        </TouchTip>
        <TouchTip chips={<Chip className={`${BUTTON_CHIP} border-white/15 text-[#7eefff]`}><RampGlyph /></Chip>}>
          <Em>Tricks:</Em> tap <Em>Drift</Em> in mid-air off a ramp, then land it for a boost.
        </TouchTip>
        {raceTips ? (
          <>
            <TouchTip chips={<Chip className={`${BUTTON_CHIP} border-white/15 text-[#7eefff]`}><Wind size={18} /></Chip>}>
              <Em>Slipstream:</Em> tuck in behind a rival — hold it and you slingshot past.
            </TouchTip>
            <TouchTip chips={<Chip className={`${BUTTON_CHIP} border-[#c879ff]/40 text-[#c879ff]`}><RampGlyph /></Chip>}>
              The <span className="font-semibold text-[#c879ff]">purple dare ramp</span> jumps the whole corner, but only
              at boost speed. Miss it and you crawl.
            </TouchTip>
          </>
        ) : null}
      </ul>
    </div>
  </GuideCard>
);

const KeyboardGuide = () => (
  <div className="grid gap-4 lg:grid-cols-2">
    <GuideCard title="Drive">
      <ul className="space-y-2 text-[13px] leading-relaxed text-white/75">
        <li><Key>↑</Key><Key>W</Key> accelerate</li>
        <li><Key>←</Key><Key>→</Key><Key>A</Key><Key>D</Key> steer</li>
        <li><Key>↓</Key><Key>S</Key> brake</li>
        <li><Key>SHIFT</Key><Key>ENTER</Key><Key>E</Key><Key>F</Key> fire item — <span className="text-white/90">hold</span> a fish bone, snowball or sardine to trail it behind you as a shield, release to use it</li>
        <li><Key>ESC</Key><Key>P</Key> pause · controllers work too (A gas, B brake, RB drift, LB item)</li>
        <li className="text-white/90">Rocket start: press gas just as the <span className="font-semibold text-[#ffd34f]">2</span> appears and hold it to GO. Too early floods the engine.</li>
        <li>Tuck in behind a rival to build a <span className="font-semibold text-[#7eefff]">slipstream</span> — hold it and you slingshot past.</li>
      </ul>
    </GuideCard>
    <GuideCard title="Drift &amp; Tricks">
      <ul className="space-y-2 text-[13px] leading-relaxed text-white/75">
        <li><Key>SPACE</Key> in a corner — hop into a drift; hold it.</li>
        <li>
          Sparks charge <SparkLadder />; release for a bigger boost.
        </li>
        <li>Tap <Key>SPACE</Key> mid-air off any ramp — land a trick for a boost.</li>
        <li>
          The <span className="font-semibold text-[#c879ff]">purple dare ramp</span> jumps the whole corner — only
          with boost speed. Miss it and you crawl.
        </li>
      </ul>
    </GuideCard>
  </div>
);

const KartIntroScreen = ({ onStart, trackKey }) => {
  // Read once per mount, so plugging a keyboard into a tablet mid-read does
  // not reshuffle the page under the player.
  const [touchFirst] = useState(detectTouchFirst);
  const [keysOpen, setKeysOpen] = useState(false);
  return (
  <div
    className="absolute inset-0 z-40 overflow-y-auto"
    data-testid="race-intro-screen"
    data-touch-first={touchFirst ? '1' : '0'}
  >
    <MenuBackdrop trackKey={trackKey} />
    {/* Side padding clears the notch: the iPhone app runs landscape-only
        under viewport-fit=cover, where the side safe-area inset (~47-59px)
        is wider than the old 16/24px gutter. Short (landscape phone)
        viewports lose the deep top padding so the three gestures fit the
        first screen at 844x390. */}
    <div className="relative flex min-h-full justify-center py-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:py-6 sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] [@media(max-height:500px)]:py-2">
      <div className="my-auto w-full max-w-5xl space-y-6 py-6 [@media(max-height:500px)]:space-y-4 [@media(max-height:500px)]:py-2">
        <div className="text-center">
          <div className={EYEBROW}>Comeback City</div>
          <h2 className="mt-2 font-mono text-3xl font-black uppercase tracking-[0.04em] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] sm:text-4xl [@media(max-height:500px)]:text-3xl">
            How to Race
          </h2>
          <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-[#ffd34f]/70 to-transparent" />
        </div>

        {touchFirst ? (
          <>
            <TouchControlsCard raceTips />
            <div className="text-center">
              <button
                aria-controls="race-guide-keys"
                aria-expanded={keysOpen}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/75 backdrop-blur-md transition-all duration-200 hover:border-[#7eefff]/60 hover:bg-[#7eefff]/10 hover:text-[#7eefff]"
                data-testid="race-guide-keys-toggle"
                onClick={() => setKeysOpen((open) => !open)}
                type="button"
              >
                Keyboard &amp; controller
                <ChevronDown className={`transition-transform duration-200 ${keysOpen ? 'rotate-180' : ''}`} size={14} />
              </button>
            </div>
            {/* A bare wrapper carries `hidden`: on the grid itself Tailwind's
                .grid display rule would beat preflight's [hidden]. */}
            <div hidden={!keysOpen} id="race-guide-keys">
              <KeyboardGuide />
            </div>
          </>
        ) : (
          <>
            <KeyboardGuide />
            <TouchControlsCard note="Phone & tablet" />
          </>
        )}

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
};

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
const KartSelectHero = ({ characterKey, kartKey, paint = null, reducedMotion, trackKey }) => {
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
        paint={paint}
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
          {ALL_TRACKS.find((entry) => entry.key === trackKey)?.name}
        </div>
      </div>
    </div>
  );
};

const GAME_MODES = [
  { key: 'cup', name: 'Grand Prix', tagline: 'Race the whole cup for points and a trophy' },
  { key: 'single', name: 'Single Race', tagline: 'One track, your pick' },
  { key: 'timetrial', name: 'Time Trial', tagline: 'Solo against the clock and your ghost' },
];

// Cup finale: the podium. Top three on plinths, the rest listed below.
const CupPodium = ({ cup, mirrorUnlocked = false, onDone }) => {
  const standings = cupStandings(cup);
  const nameToKey = Object.fromEntries(KART_CHARACTERS.map((entry) => [entry.name, entry.key]));
  const podium = [standings[1], standings[0], standings[2]];
  const heights = ['h-24', 'h-32', 'h-16'];
  const playerPlace = standings.findIndex((row) => row.isPlayer) + 1;
  return (
    <div className="absolute inset-0 z-50 overflow-y-auto" data-testid="race-cup-podium">
      <MenuBackdrop trackKey={cup.trackKeys[cup.trackKeys.length - 1]} />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6 py-6 text-center">
          <div>
            <div className={EYEBROW}>Grand Prix complete</div>
            <h2 className="mt-2 font-mono text-3xl font-black uppercase tracking-[0.04em] text-white sm:text-4xl">
              {playerPlace === 1 ? 'You won the cup!' : `You finished ${['1st', '2nd', '3rd'][playerPlace - 1] || `${playerPlace}th`}`}
            </h2>
            {mirrorUnlocked ? <MirrorUnlockedNote /> : null}
          </div>
          <div className="flex items-end justify-center gap-3">
            {podium.map((row, index) =>
              row ? (
                <div className="flex w-28 flex-col items-center" key={row.name}>
                  {nameToKey[row.name] ? (
                    <img
                      alt={row.name}
                      className="h-24 w-24 object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,0.7)]"
                      src={CHARACTER_PORTRAITS[nameToKey[row.name]]}
                    />
                  ) : null}
                  <div className={`font-mono text-[11px] font-black uppercase ${row.isPlayer ? 'text-[#ffd34f]' : 'text-white'}`}>
                    {row.name}
                  </div>
                  <div className="font-mono text-[10px] text-white/60">{row.total} pts</div>
                  <div
                    className={`mt-2 flex w-full items-start justify-center rounded-t-xl border border-[#ffd34f]/40 bg-gradient-to-b from-[#ffd34f]/30 to-[#ffd34f]/5 pt-2 ${heights[index]}`}
                  >
                    {index === 1 ? <Trophy className="text-[#ffd34f]" size={28} /> : (
                      <span className="font-mono text-lg font-black text-[#ffd34f]">{index === 0 ? '2' : '3'}</span>
                    )}
                  </div>
                </div>
              ) : null
            )}
          </div>
          {standings.length > 3 ? (
            <ol className="mx-auto max-w-sm space-y-1.5 text-left">
              {standings.slice(3).map((row, index) => (
                <li
                  className={`flex justify-between rounded-lg px-3 py-2 font-mono text-[12px] ${row.isPlayer ? 'bg-[#ffd34f]/15 text-[#ffd34f]' : 'bg-white/5 text-white/80'}`}
                  key={row.name}
                >
                  <span>{index + 4}th · {row.name}</span>
                  <span>{row.total} pts</span>
                </li>
              ))}
            </ol>
          ) : null}
          <button type="button" className={CTA} data-testid="race-cup-done" onClick={onDone}>
            Back to menu
          </button>
        </div>
      </div>
    </div>
  );
};

const formatBestTime = (seconds) => {
  if (!Number.isFinite(seconds)) return null;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds - minutes * 60).toFixed(2).padStart(5, '0')}`;
};

// Unlocks: `wallet` (the ₿ chip) and `paintShop` (the swatch row) are built
// by KartApp, which owns the progress state; `stagePaint` is what the 3D stage
// shows on the kart — the equipped paint, or a locked one being tried on.
const KartCharacterSelect = ({ gameMode, kartKey, mirror = null, onShowGuide, onStart, paintShop = null, raceClass, reducedMotion, selectedKey, setGameMode, setKartKey, setRaceClass, setSelectedKey, setTrackKey, stagePaint = null, trackKey, wallet = null }) => {
  // Saved bests per track (kartLocalStore). Read per mount: the screen
  // remounts on every return from a race, which is when they change.
  const [savedResults] = useState(() => readRaceResults() || {});
  // With Mirror Mode on, the track cards show the mirror records instead.
  const bestResults = recordsForMode(savedResults, mirror?.active);
  const [pickerTracks] = useState(() => (readPreviewTracksFlag() ? [...KART_TRACKS, ...PREVIEW_TRACKS] : KART_TRACKS));
  return (
  <div className="absolute inset-0 z-40 overflow-y-auto" data-testid="race-character-select">
    <MenuBackdrop trackKey={trackKey} />
    <div className="relative flex min-h-full justify-center p-4 sm:p-6">
      <div className="my-auto w-full max-w-4xl space-y-6 py-6">
      <div className="relative text-center">
        {wallet ? <div className="mb-3 flex justify-center sm:absolute sm:right-0 sm:top-0 sm:mb-0">{wallet}</div> : null}
        <div className={EYEBROW}>Comeback City Grand Prix</div>
        <h2 className="mt-2 font-mono text-3xl font-black uppercase tracking-[0.04em] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] sm:text-4xl">
          Race Setup
        </h2>
        <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-[#ffd34f]/70 to-transparent" />
      </div>
      <KartSelectHero
        characterKey={selectedKey}
        kartKey={kartKey}
        paint={stagePaint}
        reducedMotion={reducedMotion}
        trackKey={trackKey}
      />
      {paintShop}
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
        <h3 className={`${SECTION_TITLE} mb-3`}>Pick Your Mode</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {GAME_MODES.map((entry) => {
          const selected = entry.key === gameMode;
          return (
            <button
              key={entry.key}
              type="button"
              data-testid={`race-mode-${entry.key}`}
              onClick={() => setGameMode(entry.key)}
              className={`p-3 text-left ${selected ? PANEL_SELECTED : `${PANEL} ${PANEL_HOVER}`}`}
            >
              <div className="font-mono text-[13px] font-black uppercase tracking-[0.05em] text-white">{entry.name}</div>
              <div className="mt-1 text-[10px] leading-snug text-white/55">{entry.tagline}</div>
            </button>
          );
        })}
      </div>
      <div>
        <h3 className={`${SECTION_TITLE} mb-3`}>{gameMode === 'cup' ? 'The Cup' : 'Pick Your Track'}</h3>
        {gameMode === 'cup' ? (
          <p className="-mt-1 mb-3 text-[11px] text-white/40">Every track in order. Points for every finish; most points takes the trophy.</p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(gameMode === 'cup' ? KART_TRACKS : pickerTracks).map((entry) => {
          const selected = entry.key === trackKey;
          return (
            <button
              key={entry.key}
              type="button"
              data-testid={`race-track-${entry.key}`}
              onClick={() => setTrackKey(entry.key)}
              disabled={gameMode === 'cup'}
              className={`relative overflow-hidden p-4 text-left ${
                gameMode === 'cup' ? PANEL : selected ? PANEL_SELECTED : `${PANEL} ${PANEL_HOVER}`
              }`}
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
              {bestResults[entry.key]?.bestTime ? (
                <div className="mt-2 flex flex-wrap gap-x-3 font-mono text-[10px] uppercase tracking-[0.1em] text-[#ffd34f]" data-testid={`race-track-best-${entry.key}`}>
                  <span>Best {formatBestTime(bestResults[entry.key].bestTime)}</span>
                  {bestResults[entry.key].bestLap ? <span>Lap {formatBestTime(bestResults[entry.key].bestLap)}</span> : null}
                  {bestResults[entry.key].wins ? <span>{bestResults[entry.key].wins} {bestResults[entry.key].wins === 1 ? "win" : "wins"}</span> : null}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
      <div>
        <h3 className={`${SECTION_TITLE} mb-3`}>Pick Your Class</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {RACE_CLASSES.map((entry) => {
          const selected = entry.key === raceClass;
          return (
            <button
              key={entry.key}
              type="button"
              data-testid={`race-class-${entry.key}`}
              onClick={() => setRaceClass(entry.key)}
              className={`p-3 text-left ${selected ? PANEL_SELECTED : `${PANEL} ${PANEL_HOVER}`}`}
            >
              <div className="font-mono text-[15px] font-black uppercase tracking-[0.04em] text-white">{entry.name}</div>
              <div className="mt-1 text-[10px] leading-snug text-white/55">{entry.tagline}</div>
            </button>
          );
        })}
      </div>
      {mirror ? (
        <MirrorModeToggle
          enabled={mirror.enabled}
          locked={mirror.locked}
          onToggle={mirror.onToggle}
          panel={PANEL}
          panelHover={PANEL_HOVER}
          panelSelected={PANEL_SELECTED}
        />
      ) : null}
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
};

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

// Preview tracks (built and raceable, not yet owner-approved) are listed in
// the picker only behind ?previewTracks=1, remembered from the first time the
// flag is seen (localStorage cc-kart-preview-tracks). The cup never includes
// them; a direct ?track=<key> QA link still races them either way.
const readPreviewTracksFlag = () => {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('previewTracks') === '1') {
      window.localStorage?.setItem('cc-kart-preview-tracks', '1');
      return true;
    }
    return window.localStorage?.getItem('cc-kart-preview-tracks') === '1';
  } catch {
    return false;
  }
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
    const seeded = urlSeededKey('track', isKnownTrackKey);
    if (seeded) return seeded;
    if (typeof window === 'undefined') return DEFAULT_TRACK_KEY;
    try {
      const saved = window.localStorage?.getItem('cc-kart-track');
      const pickable = KART_TRACKS.some((entry) => entry.key === saved) ||
        (readPreviewTracksFlag() && PREVIEW_TRACKS.some((entry) => entry.key === saved));
      return pickable ? saved : DEFAULT_TRACK_KEY;
    } catch {
      return DEFAULT_TRACK_KEY;
    }
  });
  const [gameMode, setGameMode] = useState(() => {
    if (typeof window === 'undefined' || window.navigator?.webdriver) return 'single';
    try {
      const saved = window.localStorage?.getItem('cc-kart-mode');
      return saved === 'single' || saved === 'timetrial' ? saved : 'cup';
    } catch {
      return 'cup';
    }
  });
  // Live Grand Prix: null outside a cup. cupFinal shows the podium.
  const [cup, setCup] = useState(null);
  const [cupFinal, setCupFinal] = useState(false);
  // Engine class. QA harnesses race the tuned 150cc field so gate behaviour
  // is unchanged; players default to 100cc and the pick is remembered.
  const [raceClass, setRaceClass] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_RACE_CLASS;
    if (window.navigator?.webdriver) return QA_RACE_CLASS;
    try {
      const saved = window.localStorage?.getItem('cc-kart-class');
      return RACE_CLASSES.some((entry) => entry.key === saved) ? saved : DEFAULT_RACE_CLASS;
    } catch {
      return DEFAULT_RACE_CLASS;
    }
  });
  // MIRROR MODE (mirrorUnlock.js). Locked until the player wins a Grand Prix;
  // then a remembered on/off that every mode honours. ?mirror=1|0 seeds it on
  // or off for QA, and =1 works even while locked.
  const [mirrorSetup, setMirrorSetup] = useState(initialMirrorSetup);
  const mirrorActive = isMirrorActive(mirrorSetup);
  const toggleMirror = () => {
    if (!mirrorAvailable(mirrorSetup)) return;
    const enabled = !mirrorSetup.enabled;
    writeMirrorChoice(enabled);
    setMirrorSetup((current) => ({ ...current, enabled }));
  };
  useEffect(() => {
    // The unlock: the cup is over and the player tops it. `news` puts the
    // announcement on the podium; leaving the cup clears it.
    if (cupUnlocksMirror(cup)) {
      unlockMirror();
      setMirrorSetup((current) => (current.unlocked ? current : { ...current, news: true, unlocked: true }));
    } else if (!cup) {
      setMirrorSetup((current) => (current.news ? { ...current, news: false } : current));
    }
  }, [cup]);
  const confirmCharacter = useCallback(() => {
    if (gameMode === 'cup') {
      const trackKeys = KART_TRACKS.map((entry) => entry.key);
      setCup(createCup(trackKeys));
      setCupFinal(false);
      setKartTrackKey(trackKeys[0]);
    } else {
      setCup(null);
    }
    try {
      window.localStorage?.setItem('cc-kart-mode', gameMode);
      window.localStorage?.setItem('cc-kart-class', raceClass);
      window.localStorage?.setItem('cc-kart-character', characterKey);
      window.localStorage?.setItem('cc-kart-track', kartTrackKey);
      if (kartKey) window.localStorage?.setItem('cc-kart-kart', kartKey);
    } catch {
      // localStorage unavailable — the pick still applies this session.
    }
    setCharacterReady(true);
  }, [characterKey, gameMode, kartKey, kartTrackKey, raceClass]);
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
  // ── Unlocks & progress (src/game/race/progress.js) ─────────────────────
  // Read once, then kept in step with storage by the handlers below. The
  // session token makes each finish's award id unique across app launches,
  // which is what lets the wallet's double-count guard persist.
  const [wallet, setWallet] = useState(readWallet);
  const [paints, setPaints] = useState(readPaints);
  const [paintPreview, setPaintPreview] = useState(null);
  const [menuToast, setMenuToast] = useState(null);
  const [progressSession] = useState(() => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
  const pendingEarningsRef = useRef(null);
  const raceNonceRef = useRef(1);
  const cupRef = useRef(cup);
  cupRef.current = cup;
  const handleFinish = useCallback((result) => {
    recordRaceFinish(result);
    // Only a FINISH reaches here — quitting never calls onFinish — so this is
    // the one place that pays. A ref'd copy of the cup is advanced to learn
    // whether THIS finish ends it; the podium bonus rides on this finish's
    // award id, so a replayed callback or the cup advance cannot pay it again.
    // "Race again" restarts inside one mount; its finish time differs, so it
    // gets a new id and pays as the new race it is.
    const cupAfter = cupRef.current ? applyRaceToCup(cupRef.current, result?.standings) : null;
    const cupPlace =
      cupAfter && isCupOver(cupAfter) ? cupStandings(cupAfter).findIndex((row) => row.isPlayer) + 1 || null : null;
    const award = awardRaceFinish({
      awardId: `race:${progressSession}:${raceNonceRef.current}:${result?.time}`,
      coins: result?.coins,
      cupPlace,
      place: result?.place,
      timeTrial: result?.timeTrial,
    });
    if (award.applied) {
      pendingEarningsRef.current = mergeEarnings(pendingEarningsRef.current, award.earnings);
      setWallet(award.wallet);
    }
    setCup((current) => (current ? applyRaceToCup(current, result.standings) : current));
  }, [progressSession]);
  // Race exits. Every new race is a fresh mount (keyed on raceNonce) so a
  // track change rebuilds the whole scene rather than trusting the race
  // effect to notice a prop change.
  const [raceNonce, setRaceNonce] = useState(1);
  raceNonceRef.current = raceNonce;
  const exitToMenu = useCallback(() => {
    setCharacterReady(false);
    setCup(null);
    setCupFinal(false);
    setRaceNonce((value) => value + 1);
    // Back at the menu: show what the finished race(s) paid, once. Always
    // replaced (null after a quit with nothing new) so an earlier toast can
    // never resurface.
    setMenuToast(pendingEarningsRef.current);
    pendingEarningsRef.current = null;
  }, []);
  // Cup: after a finish, the results button either starts the next round or
  // opens the podium. The cup has already absorbed the race (handleFinish).
  const cupAdvance = useCallback(() => {
    if (!cup) return;
    if (isCupOver(cup)) {
      setCupFinal(true);
      return;
    }
    setCup((current) => ({ ...current, round: current.results.length }));
    setKartTrackKey(cup.trackKeys[cup.results.length]);
    setRaceNonce((value) => value + 1);
  }, [cup]);
  const cupProp = useMemo(() => {
    if (!cup) return null;
    const summary = cup.lastRace && cup.results.length === cup.round + 1
      ? cup.lastRace.map((row) => ({ gained: row.gained, name: row.name, total: cup.totals[row.name] || 0 }))
      : null;
    return { round: cup.round, rounds: cup.trackKeys.length, summary };
  }, [cup]);
  const cupNextLabel = cup
    ? isCupOver(cup)
      ? 'Final standings'
      : cup.results.length === cup.round + 1
        ? `Race ${cup.round + 2}: ${KART_TRACKS.find((entry) => entry.key === cup.trackKeys[cup.round + 1])?.name || ''}`
        : null
    : null;
  const nextTrack = useMemo(() => {
    const index = KART_TRACKS.findIndex((entry) => entry.key === kartTrackKey);
    return KART_TRACKS.length > 1 ? KART_TRACKS[(index + 1) % KART_TRACKS.length] : null;
  }, [kartTrackKey]);
  const goNextTrack = useCallback(() => {
    if (!nextTrack) return;
    setKartTrackKey(nextTrack.key);
    try {
      window.localStorage?.setItem('cc-kart-track', nextTrack.key);
    } catch {
      // Session-only pick is fine.
    }
    setRaceNonce((value) => value + 1);
  }, [nextTrack]);

  // Paint for the kart actually being raced (same fallback the race uses).
  const effectiveKartKey =
    kartKey || (KART_CHARACTERS.find((entry) => entry.key === characterKey) || KART_CHARACTERS[0]).kart;
  const handleEquipPaint = useCallback((kart, paintId) => {
    const result = selectPaint(kart, paintId);
    if (result.ok) setPaints(result.paints);
    return result;
  }, []);
  // Storage is the source of truth: a refused buy still resyncs the screen to
  // what is actually saved (the result carries the stored wallet and paints).
  const handleBuyPaint = useCallback((kart, paintId) => {
    const result = purchasePaint(paintId, kart);
    setPaints(result.paints);
    setWallet(result.wallet);
    return result;
  }, []);
  // A try-on is "this paint on this kart": switch karts and it lapses.
  const handlePreviewPaint = useCallback(
    (paintId) => setPaintPreview(paintId ? { kartKey: effectiveKartKey, paintId } : null),
    [effectiveKartKey]
  );
  const previewPaintId = paintPreview?.kartKey === effectiveKartKey ? paintPreview.paintId : null;
  const dismissMenuToast = useCallback(() => setMenuToast(null), []);
  const racerColor = (KART_CHARACTERS.find((entry) => entry.key === characterKey) || KART_CHARACTERS[0]).color;

  // Menu music. The race component owns its own audio manager, so the menu
  // needs one of its own — it is the first thing a player hears and it existed
  // in silence until now. Torn down the moment the race takes over, which
  // releases the AudioContext before the race creates its own (browsers cap
  // how many can be live at once).
  useEffect(() => {
    if (characterReady) return undefined;
    const audio = createKartAudio({ assets: KART_AUDIO_ASSETS, muted: readStoredMute() });
    audio.attach();
    audio.playMusic('menu');
    return () => {
      audio.stopMusic({ fadeMs: 260 });
      audio.dispose();
    };
  }, [characterReady]);

  return (
    <div
      className="relative min-h-[100svh] overflow-hidden bg-[#10151d]"
      data-race-renderer="three-kart"
      data-race-track={kartTrackKey}
      data-testid="race-screen"
    >
      {cupFinal && cup ? (
        <CupPodium cup={cup} mirrorUnlocked={mirrorSetup.news} onDone={exitToMenu} />
      ) : !introSeen ? (
        <KartIntroScreen onStart={dismissIntro} trackKey={kartTrackKey} />
      ) : !characterReady ? (
        <KartCharacterSelect
          kartKey={kartKey || (KART_CHARACTERS.find((entry) => entry.key === characterKey) || KART_CHARACTERS[0]).kart}
          onShowGuide={() => setIntroSeen(false)}
          gameMode={gameMode}
          mirror={{
            active: mirrorActive,
            enabled: mirrorSetup.enabled,
            locked: !mirrorAvailable(mirrorSetup),
            onToggle: toggleMirror,
          }}
          onStart={confirmCharacter}
          raceClass={raceClass}
          setGameMode={setGameMode}
          reducedMotion={reducedMotion}
          setRaceClass={setRaceClass}
          selectedKey={characterKey}
          setKartKey={setKartKey}
          setSelectedKey={setCharacterKey}
          setTrackKey={setKartTrackKey}
          trackKey={kartTrackKey}
          paintShop={
            <PaintShop
              kartKey={effectiveKartKey}
              kartName={KART_OPTIONS.find((entry) => entry.key === effectiveKartKey)?.name || 'Kart'}
              onBuy={handleBuyPaint}
              onEquip={handleEquipPaint}
              onPreview={handlePreviewPaint}
              paints={paints}
              previewId={previewPaintId}
              racerColor={racerColor}
              walletCoins={wallet.coins}
            />
          }
          stagePaint={paintById(previewPaintId) || racePaintFor(paints, effectiveKartKey)}
          wallet={<WalletChip coins={wallet.coins} pulse={Boolean(menuToast)} />}
        />
      ) : (
        <ComebackCityThreeKartRace
          allowRestart={!cup}
          cup={cupProp}
          character={characterKey}
          difficulty={raceClass}
          timeTrial={!cup && gameMode === 'timetrial'}
          kart={kartKey}
          key={`race-${raceNonce}`}
          mirror={mirrorActive}
          mode="race"
          nextTrackLabel={cup ? cupNextLabel : nextTrack ? nextTrack.name : null}
          onExit={exitToMenu}
          onFinish={handleFinish}
          onNextTrack={cup ? (cupNextLabel ? cupAdvance : null) : nextTrack ? goNextTrack : null}
          playerPaint={racePaintFor(paints, effectiveKartKey)}
          reducedMotion={reducedMotion}
          runId={raceNonce}
          track={kartTrackKey}
        />
      )}
      {menuToast && !characterReady ? <EarningsToast onDone={dismissMenuToast} summary={menuToast} /> : null}
    </div>
  );
};
