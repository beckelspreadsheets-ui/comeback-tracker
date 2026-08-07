// GLB URLs for the select-screen model stage.
//
// The select screen used to show flat PNG plates of characters and karts that
// already exist as 3D models — the player was looking at photographs of the
// assets instead of the assets, which is exactly why it read as a waiting
// screen. These maps are what let it show the real thing.
//
// THE BUG THIS ALSO FIXES. `KART_OPTIONS` carries 12 karts; the old
// `KART_PORTRAITS` map in KartApp.jsx has 7. The five wave-8 bodies
// (hash-runner, cold-wallet, sat-stacker, pixel-pickup, node-runner) were
// added to the roster without portraits, so the picker has been rendering
// `<img src={undefined}>` for five of twelve karts. Every key here is covered,
// and scripts/test-select-models.mjs fails if a roster entry ever loses its
// model again — which is the check that would have caught it the first time.
//
// No bundle cost: every one of these files is already imported by the race
// monolith, so Vite emits one hashed asset and both importers share it. What
// this adds is LOAD TIME on the select screen, and only for the two models
// actually on the stage.
import { KART_CHARACTERS, KART_OPTIONS } from '../game/ComebackCityThreeKartRace.jsx';

import crrtBunnyUrl from '../assets/game/models/avatars/crrt-bunny.glb?url';
import layer23Url from '../assets/game/models/avatars/layer23-penguin.glb?url';
import lifoladenUrl from '../assets/game/models/avatars/lifoladen.glb?url';
import mizzleUrl from '../assets/game/models/avatars/mizzle.glb?url';
import sethPenguinUrl from '../assets/game/models/avatars/seth-penguin.glb?url';
import tclowUrl from '../assets/game/models/avatars/tclow-penguin.glb?url';

import btcKartUrl from '../assets/game/models/karts/btc-kart.glb?url';
import coldWalletUrl from '../assets/game/models/karts/cold-wallet.glb?url';
import hashRunnerUrl from '../assets/game/models/karts/hash-runner.glb?url';
import iceBlockUrl from '../assets/game/models/karts/ice-block.glb?url';
import iceRacerUrl from '../assets/game/models/karts/ice-racer.glb?url';
import miamiCruiserUrl from '../assets/game/models/karts/miami-cruiser.glb?url';
import nodeRunnerUrl from '../assets/game/models/karts/node-runner.glb?url';
import pixelPickupUrl from '../assets/game/models/karts/pixel-pickup.glb?url';
import satStackerUrl from '../assets/game/models/karts/sat-stacker.glb?url';
import heroKartUrl from '../assets/game/models/tripo/hero-kart-tripo.glb?url';
import iceSledUrl from '../assets/game/models/tripo/ice-sled.glb?url';
import dragRacerUrl from '../assets/game/models/toy-car-kit/vehicle-drag-racer.glb?url';

export const SELECT_CHARACTER_MODELS = {
  'crrt-bunny': crrtBunnyUrl,
  layer23: layer23Url,
  lifoladen: lifoladenUrl,
  mizzle: mizzleUrl,
  'seth-penguin': sethPenguinUrl,
  tclow: tclowUrl,
};

export const SELECT_KART_MODELS = {
  btckart: btcKartUrl,
  coldwallet: coldWalletUrl,
  hashrunner: hashRunnerUrl,
  hero: heroKartUrl,
  iceblock: iceBlockUrl,
  iceracer: iceRacerUrl,
  icesled: iceSledUrl,
  // The three "Dragster" seats (Seth / Mizzle / Layer 23) all ride the Kenney
  // drag racer; the race recolours it per driver, the stage shows the body.
  kenney: dragRacerUrl,
  miamicruiser: miamiCruiserUrl,
  noderunner: nodeRunnerUrl,
  pixelpickup: pixelPickupUrl,
  satstacker: satStackerUrl,
};

// Exported for the gate — keeps the "is every roster entry covered?" question
// answerable without importing the JSX.
export const rosterCoverage = () => ({
  characters: KART_CHARACTERS.map((entry) => entry.key).filter((key) => !SELECT_CHARACTER_MODELS[key]),
  karts: KART_OPTIONS.map((entry) => entry.key).filter((key) => !SELECT_KART_MODELS[key]),
});
