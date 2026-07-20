import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Bitcoin, Flag, Gauge, RotateCcw, Sparkles, Trophy, Volume2, VolumeX, Zap } from 'lucide-react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
// B4: pmndrs is the default post chain. The three-examples chain above remains
// available behind ?post=0 for A/B diagnosis.
import {
  BloomEffect,
  EffectComposer as PmndrsEffectComposer,
  EffectPass,
  RenderPass as PmndrsRenderPass,
  SMAAEffect,
  SMAAPreset,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing';
import racerModelUrl from '../assets/game/models/toy-car-kit/vehicle-drag-racer.glb?url';
import itemBoxModelUrl from '../assets/game/models/toy-car-kit/item-box.glb?url';
import kartColormapUrl from '../assets/game/models/toy-car-kit/colormap.png';
import crrtBunnyModelUrl from '../assets/game/models/avatars/crrt-bunny.glb?url';
import sethPenguinModelUrl from '../assets/game/models/avatars/seth-penguin.glb?url';
import heroKartTripoUrl from '../assets/game/models/tripo/hero-kart-tripo.glb?url';
import iceRacerKartUrl from '../assets/game/models/karts/ice-racer.glb?url';
import iceSledUrl from '../assets/game/models/tripo/ice-sled.glb?url';
import miamiCruiserKartUrl from '../assets/game/models/karts/miami-cruiser.glb?url';
import mizzleModelUrl from '../assets/game/models/avatars/mizzle.glb?url';
import tclowModelUrl from '../assets/game/models/avatars/tclow-penguin.glb?url';
import layer23ModelUrl from '../assets/game/models/avatars/layer23-penguin.glb?url';
import lifoladenModelUrl from '../assets/game/models/avatars/lifoladen.glb?url';
import fishboneTrapModelUrl from '../assets/game/models/items/fishbone-trap.glb?url';
import sardineRocketModelUrl from '../assets/game/models/items/sardine-rocket.glb?url';
import avalancheMoundModelUrl from '../assets/game/models/items/avalanche-mound.glb?url';
import blizzardCloudModelUrl from '../assets/game/models/items/blizzard-cloud.glb?url';
import itemAuroraIconUrl from '../assets/game/items/item-aurora.webp';
import itemAvalancheIconUrl from '../assets/game/items/item-avalanche.webp';
import itemBlizzardIconUrl from '../assets/game/items/item-blizzard.webp';
import itemCarrotIconUrl from '../assets/game/items/item-carrot.webp';
import itemCocoaIconUrl from '../assets/game/items/item-cocoa.webp';
import itemFishboneIconUrl from '../assets/game/items/item-fishbone.webp';
import itemIceshardIconUrl from '../assets/game/items/item-iceshard.webp';
import itemIceshieldIconUrl from '../assets/game/items/item-iceshield.webp';
import itemMarchIconUrl from '../assets/game/items/item-march.webp';
import itemSardineIconUrl from '../assets/game/items/item-sardine.webp';
import itemSlapfishIconUrl from '../assets/game/items/item-slapfish.webp';
import itemSnowballIconUrl from '../assets/game/items/item-snowball.webp';
import miamiCondoTowerUrl from '../assets/game/models/miami/condo-tower.glb?url';
import miamiCornerArcadeUrl from '../assets/game/models/miami/corner-arcade.glb?url';
import miamiDecoHotelUrl from '../assets/game/models/miami/deco-hotel.glb?url';
import miamiLifeguardUrl from '../assets/game/models/miami/lifeguard-tower.glb?url';
import miamiPalmClusterUrl from '../assets/game/models/miami/palm-cluster.glb?url';
import miamiRetroDinerUrl from '../assets/game/models/miami/retro-diner.glb?url';
import outplayasiansCrosserUrl from '../assets/game/models/pv-tribute/outplayasians-crosser.glb?url';
import pvCrapsUrl from '../assets/game/models/pv-tribute/pv-craps.glb?url';
import pvBlackjackUrl from '../assets/game/models/pv-tribute/pv-blackjack.glb?url';
import pvBitcoinMonumentUrl from '../assets/game/models/pv-tribute/pv-bitcoin-monument.glb?url';
import pvRunestoneUrl from '../assets/game/models/pv-tribute/pv-runestone.glb?url';
import pvOddsBoardUrl from '../assets/game/models/pv-tribute/pv-odds-board.glb?url';
import pvTokenClusterUrl from '../assets/game/models/pv-tribute/pv-token-cluster.glb?url';
import itemBoxCcCoinUrl from '../assets/game/models/items/item-box-cc-coin.glb?url';
import itemBoxPvIceUrl from '../assets/game/models/items/item-box-pv-ice.glb?url';
import backdropCcFarUrl from '../assets/game/generated/backdrops/cc-far.webp';
import backdropCcNearUrl from '../assets/game/generated/backdrops/cc-near.webp';
import backdropPvFarUrl from '../assets/game/generated/backdrops/pv-far.webp';
import backdropPvNearUrl from '../assets/game/generated/backdrops/pv-near.webp';
import {
  buildCoinField,
  coinSpeedMultiplier,
  coinsAfterSpin,
  collectCoinsForFrame,
  respawnCoins,
} from './race/raceCoins.js';
import { DEFAULT_TRACK_KEY, KART_TRACKS, trackByKey } from './race/tracks/index.js';
import {
  DRIFT_FEEL,
  createDriftState,
  driftLaneRate,
  hopHeightFor,
  updateDriftFeel,
} from './race/driftFeel.js';
import { createKartAudio, readStoredMute } from './race/kartAudio.js';
import {
  createRivalRacers,
  KART_CONTACT,
  playerPositionOf,
  rivalPositionsOf,
  totalProgressOf,
  updateRivalRacers,
} from './race/rivalRacers.js';
import {
  ageFishBones,
  AURORA,
  AVALANCHE,
  BLIZZARD,
  dropBlizzard,
  dropFishBone,
  fishBoneHitFor,
  insideBlizzard,
  ITEM_FEEL,
  ITEM_LABELS,
  itemForPickup,
  MARCH,
  marchHitFor,
  projectileHitFor,
  sardineTargetFor,
  startMarch,
  SLAP_FISH,
  slapFishHitsFor,
  throwSardine,
  throwSnowball,
  updateBlizzards,
  updateMarch,
  updateProjectiles,
} from './race/heldItems.js';
import {
  createCrossers,
  crosserHitFor,
  updateCrossersForFrame,
} from './race/raceCrossers.js';
import {
  airPitchFor,
  createAirState,
  createShortcutState,
  launchAir,
  launchShortcut,
  shortcutArcHeight,
  shortcutPitchFor,
  TRICK_FEEL,
  updateAir,
  updateShortcut,
} from './race/airTricks.js';
import { createBasicMaterial } from './race/render/createKartModel.js';
import { createMomentSample, resolveMoments, sampleMoments } from './race/paletteMoments.js';
import { createRaceRenderer, fitRaceRendererToCanvas, softwareQualityAdapted } from './race/render/createRaceScene.js';
import { createGameGltfLoader } from './race/render/gltfLoader.js';
import { applyToonRim, TOON_RIM_SHARED_TINT } from './race/render/toonRimShader.js';
import { resolveGraphicsConfig } from './graphics.config.js';
import { atmosphereGradeFor } from './race/render/graphicsAtmosphere.js';
import { applyGraphicsEnvironment, disposeGraphicsEnvironment } from './race/render/graphicsEnvironment.js';
import { createGraphicsPostFx } from './race/render/graphicsPostFx.js';
import { createGraphicsParticles } from './race/render/graphicsParticles.js';
import { makeAsphaltDetailNormalMap, makeAsphaltRoughnessMap } from './race/render/graphicsTrackDetail.js';
import { makeGraphicsSkyTexture } from './race/render/graphicsSky.js';
import { buildCityMassing } from './race/render/cityMassing.js';
import { buildPenguinVillageMassing } from './race/render/penguinVillageMassing.js';
import {
  buildVisualPlacementAnchors,
  resolveTrackVisuals,
  roadVisualBandAt,
} from './race/tracks/trackVisualSchema.js';
import './comebackCityThreeKartRace.css';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const wrap01 = (value) => ((value % 1) + 1) % 1;
const shortProgressDelta = (a, b) => {
  let delta = Math.abs(wrap01(a) - wrap01(b));
  if (delta > 0.5) delta = 1 - delta;
  return delta;
};
const formatTime = (seconds = 0) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(2).padStart(5, '0')}`;
};

const TRACK_SAMPLES = 112;
const MAX_SPEED = 228;
const BOOST_SPEED = 284;
// One scale for every kart — mixed sizes read as a bug (owner feedback).
// Trimmed 1.24 -> 1.12 -> 1.01 across owner feel-checks ("10% more = perfect").
const KART_SCALE = 1.01;
// The playable roster (owner's characters; more ordinals coming). The player
// picks one — the other three fill the rival seats. `kart` selects the body
// pipeline ('hero' / 'icesled' = owner-rendered Tripo GLBs, 'kenney' =
// recolored drag racer); `projectileSkin` is the cosmetic snowball flavor
// (carrot for the bunny, ice shards for the penguins — identical stats);
// `driverYaw` is the lab-verified authored yaw (all Tripo rigs face +X).
export const KART_CHARACTERS = [
  { accent: '#46d9ef', color: '#e8261d', driverHeight: 5.7, driverYaw: -Math.PI / 2, kart: 'hero', kartName: 'Hero Kart', key: 'crrt-bunny', name: 'CRRT Bunny', projectileSkin: 'carrot' },
  // Lifoladen (K6): human wizard king, not a penguin — plain 'snowball' skin
  // keeps him out of the Penguin March pool. Meshy rig, lab-verified +Z
  // front → driverYaw 0. Second in the roster so he auto-fills a rival seat
  // for every other pick.
  { accent: '#a7f542', color: '#8e1a43', driverHeight: 6.4, driverYaw: 0, kart: 'miamicruiser', kartName: 'Miami Cruiser', key: 'lifoladen', name: 'Lifoladen', projectileSkin: 'snowball' },
  // Owner correction (round 8): the penguin previously labeled "CRRT
  // Penguin" IS T Clow — one character, the ice sled is his ride.
  { accent: '#9fe7ff', color: '#2378ff', driverHeight: 6.4, driverYaw: -Math.PI / 2, kart: 'icesled', kartName: 'Ice Sled', key: 'tclow', name: 'T Clow', projectileSkin: 'iceshard' },
  { accent: '#38d7ff', color: '#7e35f4', driverHeight: 6.4, driverYaw: -Math.PI / 2, kart: 'kenney', kartName: 'Purple Dragster', key: 'seth-penguin', name: 'Seth Penguin', projectileSkin: 'iceshard' },
  { accent: '#ffd34f', color: '#f28b2e', driverHeight: 6.4, driverYaw: -Math.PI / 2, kart: 'kenney', kartName: 'Orange Dragster', key: 'mizzle', name: 'Mizzle', projectileSkin: 'iceshard' },
  { accent: '#ffd9a0', color: '#a86b32', driverHeight: 6.4, driverYaw: -Math.PI / 2, kart: 'kenney', kartName: 'Bronze Dragster', key: 'layer23', name: 'Layer 23', projectileSkin: 'iceshard' },
];

// Karts are picked separately from characters (owner request, round 8) —
// light stat spreads so the choice matters without breaking the QA speed
// budgets. Multipliers apply to top speed cap, throttle accel, and steering
// lane rate. 'hero' (1/1/1) is the gate-default baseline.
// REBALANCED 2026-07-13 (owner: "the speeds are all over the place it needs
// to be a bit more balanced since the race is so short"): top speed ±2%
// (was −6/+8%), accel ±4%, handling ±5%. Rivals pace against the hero
// baseline, so wide player multipliers were deciding ~34s races by
// themselves — the probe at the first pass (±3%) still cost miamicruiser
// the WIN on kart choice alone (36.9s/2nd vs iceracer 33.2s/1st); at ±2%
// the measured autoplay spread is 1.0s and every kart WINS. V2 NOTE (owner, same
// message): when tracks reach MK-length 2-3 min races the spreads can
// widen back out — pre-rebalance values are in git at 511dc12b.
export const KART_OPTIONS = [
  { key: 'hero', name: 'Hero Kart', stats: { accel: 1.0, handling: 1.0, topSpeed: 1.0 }, tagline: 'Balanced' },
  { key: 'icesled', name: 'Ice Sled', stats: { accel: 0.97, handling: 0.96, topSpeed: 1.015 }, tagline: 'Fast & slippery' },
  { key: 'kenney', name: 'Dragster', stats: { accel: 1.04, handling: 1.02, topSpeed: 0.99 }, tagline: 'Quick off the line' },
  // K5 owner picks 2026-07-12 ("i meant the ice racer and miami cruser"):
  { key: 'iceracer', name: 'Ice Racer', stats: { accel: 0.98, handling: 0.95, topSpeed: 1.02 }, tagline: 'Frozen top end' },
  { key: 'miamicruiser', name: 'Miami Cruiser', stats: { accel: 1.03, handling: 1.04, topSpeed: 0.985 }, tagline: 'Grips the neon' },
];
// Generated kart bodies arrive in two facing conventions: Tripo = nose +X
// (mount -π/2), Meshy = nose -X (mount +π/2). Lab-verified per kart.
const KART_NOSE_YAW = {
  hero: -Math.PI / 2,
  icesled: -Math.PI / 2,
  iceracer: Math.PI / 2,
  miamicruiser: Math.PI / 2,
};
const kartByKey = (key) => KART_OPTIONS.find((entry) => entry.key === key) || KART_OPTIONS[0];
export const DEFAULT_CHARACTER_KEY = 'crrt-bunny';
const characterByKey = (key) =>
  KART_CHARACTERS.find((entry) => entry.key === key) || KART_CHARACTERS[0];

// The three rival SEATS: fixed personalities (rivalRacers.js keys on `name`),
// grid lanes, and AI flavor — whichever characters aren't the player fill
// them in roster order.
const RIVALS = [
  { lane: -0.46, name: 'Purple Lab' },
  { lane: 0.04, name: 'Blue Speed' },
  { lane: 0.52, name: 'Orange Muscle' },
];
const rivalSeatsFor = (playerKey) => {
  const remaining = KART_CHARACTERS.filter((entry) => entry.key !== playerKey);
  return RIVALS.map((seat, index) => ({
    ...seat,
    accent: remaining[index].accent,
    character: remaining[index],
    color: remaining[index].color,
    projectileSkin: remaining[index].projectileSkin,
  }));
};
const ordinal = (position) => ['1st', '2nd', '3rd', '4th'][position - 1] || `${position}th`;
const PROP_COUNT = 36;
const VISUAL_ASSET_SET = 'comeback-city-v2-three-runtime';

// Spawn offset past the finish line lives in the track def (startOffset).
const startProgressFor = (trackDef) =>
  wrap01((trackDef.course.startProgress || 0) + (trackDef.startOffset || 0));

const createInitialRace = (
  rivalSeats = rivalSeatsFor(DEFAULT_CHARACTER_KEY),
  trackDef = trackByKey(DEFAULT_TRACK_KEY)
) => ({
  airState: createAirState(),
  // Pending leader-killer: { by, target, timer } during the rumble warning.
  avalanche: null,
  avalancheBurst: 0,
  auroraTimer: 0,
  avalancheTarget: null,
  blizzards: [],
  // Live Penguin March crossing: { head, progress } while the train walks.
  march: null,
  boostHits: 0,
  fishBones: [],
  slapTimer: 0,
  projectiles: [],
  boostTimer: 0,
  bumpCooldown: 0,
  countdown: 2.2,
  drift: false,
  driftCharge: 0,
  driftState: createDriftState(),
  driftTier: 0,
  finished: false,
  heldItem: null,
  itemFireCooldown: 0,
  itemPickups: 0,
  landSquashTimer: 0,
  lap: 1,
  laps: trackDef.laps,
  lane: 0,
  position: 1 + RIVALS.length,
  previousProgress: startProgressFor(trackDef),
  progress: startProgressFor(trackDef),
  raceTime: 0,
  // Independent rival sim (Phase 2) — player starts at the back of the grid.
  rivals: createRivalRacers(rivalSeats, { gridProgress: startProgressFor(trackDef) }),
  // K4: crosser hazards (pure sim state; rivals already know how to dodge
  // them — rivalRacers has consumed `crossers` since Phase 0.4).
  crossers: trackDef.crossers?.length ? createCrossers(trackDef) : null,
  crosserGraceTimer: 0,
  shortcut: createShortcutState(),
  speed: 0,
  spinOuts: 0,
  spinTimer: 0,
  // ₿ coins carried this race (owner concept: "bitcoins you collect").
  coins: 0,
  wasSpinning: false,
  squash: 1,
  steer: 0,
  shieldActive: false,
  tricksLanded: 0,
  wallContact: false,
});

// Elevation comes from the track def's bridge band (sin bump between
// from/to peaking at `peak`); the crest is the free natural launch window.
const crestProgressFor = (trackDef) => {
  const band = trackDef.elevation.bridgeBand;
  return (band.from + band.to) / 2;
};
const makeElevation = (trackDef) => {
  const band = trackDef.elevation.bridgeBand;
  return (progress) => {
    const p = wrap01(progress);
    if (p > band.from && p < band.to) {
      const t = (p - band.from) / (band.to - band.from);
      return Math.sin(t * Math.PI) * band.peak;
    }
    return 0;
  };
};

const makeTrackCurve = (trackDef, elevationAt) => {
  const points = trackDef.course.centerline.map(
    (point, index, list) => new THREE.Vector3(point.x, elevationAt(index / list.length), point.z)
  );
  return new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.38);
};

// Smoothed road-width table from the authored ribbons — wide carousels,
// narrow skill sections, soft transitions (~35 world units).
const makeWidthTable = (trackDef) => {
  const N = 224;
  const ribbons = trackDef.course.roadRibbons;
  const table = new Float32Array(N);
  for (let index = 0; index < N; index += 1) {
    const p = index / N;
    const ribbon =
      ribbons.find((entry) => p >= entry.startProgress && p < entry.endProgress) || ribbons[ribbons.length - 1];
    table[index] = ribbon.width;
  }
  for (let pass = 0; pass < 14; pass += 1) {
    const copy = Float32Array.from(table);
    for (let index = 0; index < N; index += 1) {
      table[index] = (copy[(index + N - 1) % N] + copy[index] * 2 + copy[(index + 1) % N]) / 4;
    }
  }
  return table;
};

const makeSampler = (trackDef) => {
  const elevationAt = makeElevation(trackDef);
  const curve = makeTrackCurve(trackDef, elevationAt);
  const length = curve.getLength();
  const widthTable = makeWidthTable(trackDef);
  const widthAt = (progress) => {
    const scaled = wrap01(progress) * widthTable.length;
    const low = Math.floor(scaled) % widthTable.length;
    const high = (low + 1) % widthTable.length;
    return lerp(widthTable[low], widthTable[high], scaled - Math.floor(scaled));
  };
  return {
    curve,
    elevationAt,
    length,
    pointAt(progress, lane = 0) {
      const p = wrap01(progress);
      const center = curve.getPointAt(p);
      center.y = elevationAt(p);
      const tangent = curve.getTangentAt(p);
      tangent.y = 0;
      tangent.normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
      const point = center.clone().addScaledVector(normal, lane * widthAt(p) * 0.44);
      return { center, normal, point, tangent };
    },
    widthAt,
  };
};

const setFlatTransform = (object) => {
  object.updateMatrix();
  object.matrixAutoUpdate = false;
  return object;
};

const makeBox = (size, position, material) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
};

const makeRoundedBox = (size, position, material, radius = 1) => {
  const safeRadius = Math.min(radius, Math.min(size.x, size.y, size.z) * 0.32);
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(size.x, size.y, size.z, 1, safeRadius), material);
  mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
};

const createAssetMaterial = (loader, url, { colorKeyMagenta = false } = {}) => {
  // Alpha-tested, depth-writing material so facades occlude and are occluded
  // like solid geometry instead of rendering through the scene.
  const material = new THREE.MeshBasicMaterial({
    alphaTest: 0.45,
    side: THREE.DoubleSide,
  });
  loader.load(url, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    if (!colorKeyMagenta) {
      material.map = texture;
      material.needsUpdate = true;
      return;
    }
    const image = texture.image;
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const red = pixels.data[index];
      const green = pixels.data[index + 1];
      const blue = pixels.data[index + 2];
      if (red > 210 && green < 90 && blue > 190) pixels.data[index + 3] = 0;
    }
    ctx.putImageData(pixels, 0, 0);
    const keyedTexture = new THREE.CanvasTexture(canvas);
    keyedTexture.colorSpace = THREE.SRGBColorSpace;
    keyedTexture.anisotropy = 4;
    material.map = keyedTexture;
    material.needsUpdate = true;
    texture.dispose();
  });
  return material;
};

const createAssetPlane = (loader, url, width, height, options = {}) => {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    createAssetMaterial(loader, url, options)
  );
  mesh.renderOrder = options.renderOrder || 10;
  mesh.userData.kind = options.kind || 'asset-plane';
  return mesh;
};

const addGlowDisc = (group, color, scale = 1) => {
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(8 * scale, 24),
    new THREE.MeshBasicMaterial({
      color,
      depthWrite: false,
      opacity: 0.22,
      transparent: true,
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.08;
  group.add(glow);
  return glow;
};

const createProceduralSeatedPenguin = ({
  accent = '#38d7ff',
  suit = '#171d2b',
} = {}) => {
  const rig = new THREE.Group();
  rig.userData.kind = 'procedural-seated-ordinal-penguin';
  const blackMat = createToonMaterial('#141a25', { emissive: '#05080d', emissiveIntensity: 0.08 });
  const bellyMat = createToonMaterial('#f3f7ff');
  const beakMat = createToonMaterial('#f1a33a');
  const accentMat = createToonMaterial(accent, { emissive: accent, emissiveIntensity: 0.24 });
  const suitMat = createToonMaterial(suit);

  const hips = new THREE.Mesh(new THREE.SphereGeometry(1.28, 12, 8), suitMat);
  hips.scale.set(1.05, 0.82, 0.92);
  hips.position.set(0, 1.0, -0.18);
  rig.add(hips);

  const torso = new THREE.Mesh(new THREE.SphereGeometry(1.55, 14, 10), blackMat);
  torso.scale.set(0.92, 1.2, 0.72);
  torso.position.set(0, 2.25, -0.1);
  rig.add(torso);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(1.12, 12, 8), bellyMat);
  belly.scale.set(0.78, 1.05, 0.28);
  belly.position.set(0, 2.12, 0.92);
  rig.add(belly);

  const head = new THREE.Mesh(new THREE.SphereGeometry(1.34, 14, 10), blackMat);
  head.scale.set(1.02, 0.96, 0.92);
  head.position.set(0, 3.98, 0.12);
  rig.add(head);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.92, 12, 8), bellyMat);
  face.scale.set(0.78, 0.76, 0.22);
  face.position.set(0, 4.02, 1.13);
  rig.add(face);

  [-0.36, 0.36].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), createToonMaterial('#05070b'));
    eye.position.set(x, 4.22, 1.33);
    rig.add(eye);
  });
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.72, 4), beakMat);
  beak.position.set(0, 4.02, 1.52);
  beak.rotation.x = Math.PI / 2;
  rig.add(beak);

  [-1, 1].forEach((side) => {
    const flipper = new THREE.Mesh(new THREE.SphereGeometry(0.46, 8, 6), blackMat);
    flipper.scale.set(0.42, 1.18, 0.24);
    flipper.position.set(side * 1.35, 2.45, 0.42);
    flipper.rotation.set(0.42, 0, side * 0.62);
    rig.add(flipper);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 5), accentMat);
    hand.position.set(side * 0.78, 2.58, 1.34);
    rig.add(hand);

    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 5), beakMat);
    foot.scale.set(1.25, 0.32, 0.78);
    foot.position.set(side * 0.48, 0.32, 0.64);
    rig.add(foot);
  });

  const trait = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.26, 0.18), accentMat);
  trait.position.set(0, 4.9, 0.25);
  rig.add(trait);

  rig.rotation.x = -0.08;
  rig.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = false;
      node.receiveShadow = false;
    }
  });
  return rig;
};

// Low-poly kart modeled to the V2 hero trait card: chunky tires dominate the
// silhouette, wide low glossy body, twin hood stripes, glowing headlight strip,
// bucket seat with a procedural seated driver, rear light bar, twin exhausts
// with flames.
const createGroundedKartModel = ({
  accent = '#38d7ff',
  color = '#ef4334',
  // ?trackVisuals=1 look: stronger blob + accent contact glow. The renderer
  // shadow pass is disabled globally for this presentation slice, so contact
  // grounding remains a mesh-only visual.
  contactGrounding = false,
  scale = 1,
  // Graphics overhaul preset (graphics.config.js). Resolved per race and
  // threaded in so the body material can upgrade to PBR metal/paint. 'off'
  // keeps this kart body on the flat MeshToon path.
  gfx = { name: 'off' },
} = {}) => {
  const group = new THREE.Group();
  group.userData.kind = 'grounded-3d-kart';
  const model = new THREE.Group();
  model.scale.setScalar(scale);
  group.add(model);
  // Everything in bodyGroup is the swappable body (procedural fallback now,
  // authored GLB once loaded); VFX, shadow, and the driver mount live outside
  // it so they survive body swaps.
  const bodyGroup = new THREE.Group();
  model.add(bodyGroup);
  const driverMount = new THREE.Group();
  driverMount.position.set(0, 3.05, -1.15);
  model.add(driverMount);
  const fallbackDriver = createProceduralSeatedPenguin({ accent });
  // Hero-slice presence: the seated Ordinal Penguin must read clearly above
  // the seat at chase distance — slightly oversized beats hidden.
  fallbackDriver.scale.setScalar(1.04);
  driverMount.add(fallbackDriver);

  // GRAPHICS OVERHAUL (Phase 1 materials): the kart body is the hero surface
  // the player stares at all race. On 'high' we upgrade it from flat MeshToon
  // to MeshStandardMaterial with a metallic paint response (clear-coat-like
  // sheen from the RoomEnvironment IBL probe baked in createScene). The toon
  // rim shader still applies (hero pop), so the kart keeps its cel silhouette
  // but gains metal definition + a sun specular. ?gfx=off restores the flat
  // MeshToon body exactly. Roughness/metalness tuned for glossy painted
  // metal, not chrome: metalness low enough to keep the base color dominant.
  const usePbrBody = gfx.name === 'high';
  const bodyMat = usePbrBody
    ? applyHeroRim(
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.16,
          metalness: 0.42,
          roughness: 0.34,
        })
      )
    : createToonMaterial(color, { emissive: color, emissiveIntensity: 0.2 });
  const blackMat = createToonMaterial('#191c28');
  const tireMat = createToonMaterial('#10121c');
  // Wheel hubs read as machined metal under the env probe on 'high'.
  const hubMat = usePbrBody
    ? new THREE.MeshStandardMaterial({ color: '#3a4054', metalness: 0.78, roughness: 0.3 })
    : createToonMaterial('#343a4c');
  const trimMat = createToonMaterial('#f6fbff');
  const seatMat = createToonMaterial('#1d2233');
  const accentGlowMat = createBasicMaterial(accent, { emissive: accent, emissiveIntensity: 1.1 });

  const addPart = (mesh, x, y, z, rx = 0) => {
    mesh.position.set(x, y, z);
    if (rx) mesh.rotation.x = rx;
    bodyGroup.add(mesh);
    return mesh;
  };
  const box = (w, h, d, material, radius = 0.3) =>
    new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d, 1, Math.min(radius, Math.min(w, h, d) * 0.34)),
      material
    );

  // Body tub, sloped hood, nose lip — capped with a rounded cowl so the
  // front reads bulbous like the card kart, not flat.
  addPart(box(6.6, 1.8, 9.6, bodyMat, 0.55), 0, 2.5, 0.2);
  addPart(box(6.2, 0.7, 4.8, bodyMat, 0.3), 0, 3.25, 2.9, -0.13);
  addPart(box(6.6, 1.0, 1.4, bodyMat, 0.4), 0, 2.2, 5.6);
  const cowl = new THREE.Mesh(new THREE.SphereGeometry(3.3, 12, 9), bodyMat);
  cowl.scale.set(1.0, 0.52, 1.3);
  addPart(cowl, 0, 2.85, 4.4);
  // Twin white racing stripes on the hood
  [-0.62, 0.62].forEach((x) => {
    addPart(box(0.75, 0.1, 4.6, trimMat), x, 3.68, 2.9, -0.13);
    addPart(box(0.75, 0.1, 1.5, trimMat), x, 2.76, 5.58);
  });
  // Front bumper + glowing headlight strip and lamps
  addPart(box(6.9, 0.9, 0.8, blackMat), 0, 1.65, 6.0);
  addPart(box(4.6, 0.55, 0.32, accentGlowMat), 0, 2.55, 6.22);
  [-2.35, 2.35].forEach((x) => addPart(box(1.0, 0.7, 0.28, accentGlowMat), x, 2.45, 6.18));
  // Cockpit: open inset with a real bucket seat (base, tall back, side
  // bolsters, headrest, accent piping) and a steering wheel — sized so an
  // avatar can sit in it later.
  addPart(box(3.6, 0.5, 3.4, blackMat), 0, 3.5, -0.5);
  addPart(box(3.3, 0.6, 2.7, seatMat, 0.25), 0, 3.62, -1.3);
  addPart(box(3.3, 2.4, 1.0, seatMat, 0.32), 0, 4.7, -2.55, 0.12);
  [-1, 1].forEach((side) => addPart(box(0.55, 1.9, 1.15, seatMat, 0.2), side * 1.6, 4.55, -2.25, 0.12));
  addPart(box(2.0, 1.05, 0.9, seatMat, 0.32), 0, 6.15, -2.72);
  addPart(box(2.6, 0.18, 0.18, accentGlowMat), 0, 5.55, -2.28, 0.12);
  const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.17, 6, 14), blackMat);
  addPart(steeringWheel, 0, 4.35, 0.95, -0.55);
  addPart(box(0.32, 1.4, 0.32, hubMat, 0.1), 0, 3.75, 1.25, 0.5);
  // Rear wing for the kart-racer silhouette
  addPart(box(6.4, 0.42, 1.7, bodyMat, 0.18), 0, 5.05, -4.5);
  [-2.35, 2.35].forEach((x) => addPart(box(0.42, 1.35, 0.95, blackMat, 0.12), x, 4.15, -4.45));
  // Side pods with accent glow strips
  [-1, 1].forEach((side) => {
    addPart(box(1.05, 1.15, 4.8, blackMat), side * 3.78, 2.0, 0.2);
    addPart(box(0.16, 0.42, 4.2, accentGlowMat), side * 4.34, 2.1, 0.2);
  });
  // Rear bumper, light bar, exhausts
  addPart(box(6.9, 1.05, 0.9, blackMat), 0, 2.2, -4.95);
  addPart(box(4.2, 0.42, 0.26, createBasicMaterial('#ff4a3d', { emissive: '#ff4a3d', emissiveIntensity: 1.0 })), 0, 2.95, -5.2);
  const flameMat = createBasicMaterial('#FF8C00', { emissive: '#FF8C00', emissiveIntensity: 1.0 });
  const idleFlames = [];
  [-1.5, 1.5].forEach((x) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.54, 1.2, 8), hubMat);
    addPart(pipe, x, 2.1, -5.45, Math.PI / 2);
    // Flames live on the model (not the swappable body) so they survive the
    // authored-body swap.
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.6, 6), flameMat);
    flame.position.set(x, 2.1, -6.4);
    flame.rotation.x = -Math.PI / 2;
    model.add(flame);
    idleFlames.push(flame);
  });

  // Chunky tires — the dominant silhouette read on the card. Lathe profile
  // gives rounded sidewalls instead of hard cylinder edges; geometry is shared
  // across all four wheels.
  const tireProfile = [
    new THREE.Vector2(1.1, -1.1),
    new THREE.Vector2(2.15, -0.92),
    new THREE.Vector2(2.5, -0.5),
    new THREE.Vector2(2.5, 0.5),
    new THREE.Vector2(2.15, 0.92),
    new THREE.Vector2(1.1, 1.1),
  ];
  const tireGeometry = new THREE.LatheGeometry(tireProfile, 10);
  const wheels = [];
  [
    [-4.6, 2.5, -3.3],
    [4.6, 2.5, -3.3],
    [-4.6, 2.5, 3.4],
    [4.6, 2.5, 3.4],
  ].forEach(([x, y, z]) => {
    const wheel = new THREE.Group();
    wheel.position.set(x, y, z);
    wheel.userData.front = z > 0;
    const tire = new THREE.Mesh(tireGeometry, tireMat);
    tire.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 2.3, 9), hubMat);
    hub.rotation.z = Math.PI / 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.13, 5, 16), accentGlowMat);
    ring.rotation.y = Math.PI / 2;
    wheel.add(tire, hub, ring);
    bodyGroup.add(wheel);
    wheels.push(wheel);
  });

  const boostFlame = new THREE.Group();
  boostFlame.visible = false;
  const boostFlameMat = createBasicMaterial('#FF8C00', { emissive: '#FFD34F', emissiveIntensity: 1.1 });
  [-1.5, 1.5].forEach((x) => {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4.6, 7), boostFlameMat.clone());
    flame.position.set(x, 2.1, -8.0);
    flame.rotation.x = -Math.PI / 2;
    boostFlame.add(flame);
  });
  model.add(boostFlame);

  const driftSparkGroup = new THREE.Group();
  driftSparkGroup.visible = false;
  [-1, 1].forEach((side) => {
    for (let index = 0; index < 5; index += 1) {
      const spark = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.4 + index * 0.08, 0),
        createBasicMaterial(index % 2 ? '#ffd34f' : accent, {
          emissive: index % 2 ? '#ffd34f' : accent,
          emissiveIntensity: 0.5,
        })
      );
      spark.position.set(side * (5.0 + index * 0.3), 0.9 + index * 0.2, -4.2 - index * 0.8);
      // Rest pose + phase for the per-frame fountain arc (position animated in
      // the render loop; faster and taller as the drift tier climbs).
      spark.userData.side = side;
      spark.userData.phase = index * 1.7 + (side > 0 ? 0.9 : 0);
      spark.userData.baseX = 5.0 + index * 0.3;
      spark.userData.baseY = 0.9 + index * 0.2;
      spark.userData.baseZ = -4.2 - index * 0.8;
      driftSparkGroup.add(spark);
    }
  });
  model.add(driftSparkGroup);

  // Tier 2+ ground ice trail — low-poly shards that scrape the road during
  // high-tier drifts. Created once, toggled by drift tier in the render loop.
  const driftIceTrailGroup = new THREE.Group();
  driftIceTrailGroup.visible = false;
  const iceTrailMaterial = createBasicMaterial('#7EC8E8', {
    emissive: '#7EC8E8',
    emissiveIntensity: 0.85,
    opacity: 0.85,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  [-1, 1].forEach((side) => {
    for (let index = 0; index < 4; index += 1) {
      const shard = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.42 + index * 0.08, 0),
        iceTrailMaterial.clone()
      );
      shard.scale.set(1.0, 0.55, 2.0);
      shard.position.set(side * (4.3 + index * 0.42), 0.35, -5.4 - index * 1.25);
      shard.rotation.set(
        ((side * 37 + index * 13) % 10) * 0.04,
        ((side * 19 + index * 7) % 8) * 0.39,
        ((side * 53 + index * 11) % 10) * 0.04
      );
      driftIceTrailGroup.add(shard);
    }
  });
  model.add(driftIceTrailGroup);

  // Mini-turbo cyan burst ring — created once, animated during mini-turbo.
  const miniTurboRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.4, 0.22, 4, 16),
    createBasicMaterial('#00E5FF', {
      emissive: '#00E5FF',
      emissiveIntensity: 1.0,
      opacity: 0.95,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  miniTurboRing.rotation.x = -Math.PI / 2;
  miniTurboRing.position.y = 1.35;
  miniTurboRing.visible = false;
  miniTurboRing.renderOrder = 35;
  model.add(miniTurboRing);

  // Tier-up pop ring — a single fast expand+fade burst in the NEW tier's
  // color the frame a charging drift banks the next tier, so tier changes
  // read as an event at race speed instead of a silent color swap.
  const driftTierPopRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.3, 4, 14),
    createBasicMaterial('#00E5FF', {
      emissive: '#00E5FF',
      emissiveIntensity: 1.0,
      opacity: 0.9,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  driftTierPopRing.rotation.x = -Math.PI / 2;
  driftTierPopRing.position.y = 0.9;
  driftTierPopRing.visible = false;
  driftTierPopRing.renderOrder = 35;
  model.add(driftTierPopRing);

  // Blob shadow keeps karts grounded; with contactGrounding (?trackVisuals=1)
  // it deepens and gains an accent glow disc to replace the shadow pass.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry((contactGrounding ? 7.0 : 6.2) * scale, contactGrounding ? 24 : 22),
    new THREE.MeshBasicMaterial({
      color: '#03060c',
      depthWrite: false,
      opacity: contactGrounding ? 0.34 : 0.24,
      transparent: true,
    })
  );
  shadow.scale.y = contactGrounding ? 1.42 : 1.35;
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.07;
  shadow.renderOrder = 2;
  group.add(shadow);
  let contactGlow = null;
  if (contactGrounding) {
    contactGlow = new THREE.Mesh(
      new THREE.CircleGeometry(5.8 * scale, 24),
      new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: accent,
        depthWrite: false,
        opacity: 0.14,
        transparent: true,
      })
    );
    contactGlow.scale.y = 1.55;
    contactGlow.rotation.x = -Math.PI / 2;
    contactGlow.position.y = 0.085;
    contactGlow.renderOrder = 3;
    group.add(contactGlow);
  }

  model.traverse((node) => {
    if (node.isMesh) node.castShadow = true;
  });
  [boostFlame, driftSparkGroup, driftIceTrailGroup, miniTurboRing, driftTierPopRing].forEach((vfx) =>
    vfx.traverse((node) => {
      node.castShadow = false;
    })
  );
  idleFlames.forEach((flame) => {
    flame.castShadow = false;
  });
  shadow.castShadow = false;

  const replaceBody = (rig) => {
    bodyGroup.traverse((node) => {
      node.geometry?.dispose?.();
      node.material?.dispose?.();
    });
    bodyGroup.clear();
    wheels.length = 0;
    bodyGroup.add(rig);
    KENNEY_WHEEL_NODES.forEach((name) => {
      const wheel = rig.getObjectByName(name);
      if (wheel) {
        wheel.userData.front = name.includes('-f');
        wheels.push(wheel);
      }
    });
  };

  return {
    bodyGroup,
    boostFlame,
    contactGlow,
    driftIceTrailGroup,
    driftSparkGroup,
    driftTierPop: { lastTier: 0, tier: 0, timer: 0 },
    driftTierPopRing,
    driverMount,
    group,
    idleFlames,
    miniTurboRing,
    replaceBody,
    shadow,
    wheels,
  };
};

// Draw-call diet for roster propagation: merge every direct-child static mesh
// of a container by material into one mesh per material. Groups (wheels,
// steering rigs) are skipped so per-frame animation keeps working. Used for
// rival karts — the hero player model keeps its original part hierarchy for
// the authored-body swap path.
const mergeStaticMeshesByMaterial = (container) => {
  const buckets = new Map();
  container.children.forEach((child) => {
    if (!child.isMesh) return;
    child.updateMatrix();
    const key = child.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { material: child.material, geometries: [] });
    const geometry = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
    geometry.applyMatrix4(child.matrix);
    buckets.get(key).geometries.push(geometry);
  });
  const stills = container.children.filter((child) => child.isMesh);
  stills.forEach((child) => {
    container.remove(child);
    child.geometry?.dispose?.();
  });
  buckets.forEach(({ material, geometries }) => {
    const merged = new THREE.Mesh(mergeGeometries(geometries, false), material);
    merged.castShadow = false;
    merged.receiveShadow = false;
    container.add(merged);
    geometries.forEach((geometry) => geometry.dispose?.());
  });
};

// Stage 2 draw-call diet: recursively collapse all static meshes inside a
// district group (including authored subgroups) into one merged mesh per
// material. Sprites and non-mesh children are left untouched.
const mergeStaticMeshesByMaterialDeep = (container) => {
  const buckets = new Map();
  const walk = (obj, parentMatrix) => {
    const children = obj.children.slice();
    children.forEach((child) => {
      if (child.isMesh) {
        const matrix = new THREE.Matrix4().multiplyMatrices(parentMatrix, child.matrix);
        const key = child.material.uuid;
        if (!buckets.has(key)) buckets.set(key, { material: child.material, geometries: [] });
        const geometry = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
        geometry.applyMatrix4(matrix);
        buckets.get(key).geometries.push(geometry);
        obj.remove(child);
      } else if (child.isGroup) {
        const nextMatrix = new THREE.Matrix4().multiplyMatrices(parentMatrix, child.matrix);
        walk(child, nextMatrix);
        if (child.children.length === 0) obj.remove(child);
      }
    });
  };
  walk(container, new THREE.Matrix4());
  buckets.forEach(({ material, geometries }) => {
    if (!geometries.length) return;
    const merged = new THREE.Mesh(mergeGeometries(geometries, false), material);
    merged.castShadow = false;
    merged.receiveShadow = false;
    container.add(merged);
    geometries.forEach((geometry) => geometry.dispose?.());
  });
};

const makeQuestionTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = '900 92px "Arial Black", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(10, 25, 40, 0.9)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('?', 64, 70);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const ITEM_BOX_COLORS = ['#00E5FF', '#7EC8E8', '#F5F8FF', '#39FF8C', '#7B61FF'];

const makeNoiseTexture = ({ base, repeat = 8, speckles = [] }) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  // Deterministic speckle pattern — no Math.random so renders stay reproducible.
  let seed = 1234567;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  speckles.forEach(({ color, count, size }) => {
    ctx.fillStyle = color;
    for (let index = 0; index < count; index += 1) {
      const x = next() * 256;
      const y = next() * 256;
      const s = size * (0.5 + next());
      ctx.globalAlpha = 0.25 + next() * 0.45;
      ctx.fillRect(x, y, s, s);
    }
  });
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 4;
  return texture;
};

// Vertical sky gradient from per-track stops [[offset, color], ...] (top→
// bottom). Default = the comeback-city dusk.
const DUSK_SKY_STOPS = [
  [0, '#0a0f28'],
  [0.5, '#1c2150'],
  [0.74, '#462a66'],
  [0.86, '#a04a74'],
  [1, '#e08a5a'],
];
const makeSkyTexture = (stops = DUSK_SKY_STOPS) => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const makeGlowTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.32)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

// 4-band gradient map gives MeshToonMaterial the stepped, Switch-style cel
// shading read instead of smooth PBR falloff.
let sharedToonGradient = null;
const getToonGradient = () => {
  if (sharedToonGradient) return sharedToonGradient;
  const data = new Uint8Array([
    90, 90, 90, 255,
    150, 150, 150, 255,
    215, 215, 215, 255,
    255, 255, 255, 255,
  ]);
  const texture = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  sharedToonGradient = texture;
  return texture;
};
// B3 rim: palette-tinted fresnel rim on the hero set — karts, drivers,
// marchers, item boxes; scenery stays rim-free (rim-on-everything cheapens
// the read). Per-track via palette.heroRim: Penguin Village carries the
// owner-picked V6 "ice white" (2026-07-06); Comeback City has no heroRim key
// and remains rim-off pending its own pick from rim-lab.html.
// Dev hook (same pattern as ?paletteLab=1): ?rimLab=1 + optional
// window.__rimLabOverrides = { strength, power, tint } forces a candidate
// look; ?rimLab=0 forces the rim OFF (the lab's control tile on a track
// whose palette default is rim-on). The URL hook overrides the active palette
// config so the lab can keep exploring on either track. Returns
// undefined when the param is absent (no opinion — palette decides).
const heroRimConfig = () => {
  if (typeof window === 'undefined') return undefined;
  const param = new URLSearchParams(window.location.search).get('rimLab');
  if (param === '0') return null;
  if (param !== '1') return undefined;
  const overrides = window.__rimLabOverrides || {};
  return {
    power: Number.isFinite(overrides.power) ? overrides.power : 2.6,
    strength: Number.isFinite(overrides.strength) ? overrides.strength : 0.32,
    tint: typeof overrides.tint === 'string' ? overrides.tint : null,
  };
};
// Resolved by createScene per race (lab hook wins over palette.heroRim);
// hero materials are created after createScene within the same mount, so
// every applyHeroRim call sees the active track's config.
let activeHeroRim = null;
const applyHeroRim = (material) =>
  activeHeroRim ? applyToonRim(material, activeHeroRim) : material;

// B2 palette moments dev hook (same pattern as ?rimLab): ?momentsLab=1 +
// window.__momentsLabOverrides = [{ progress, fog, hemi, sun, rim, rimTint,
// bloom }, ...] REPLACES palette.moments for a lab capture session;
// ?momentsLab=0 forces moments OFF (the control tile on a track whose
// palette carries a moments key). Returns undefined when the param is absent
// (no opinion — palette decides). Current default is moment-LESS on every
// track until the owner picks a set from moments-lab.html.
const momentsLabConfig = () => {
  if (typeof window === 'undefined') return undefined;
  const param = new URLSearchParams(window.location.search).get('momentsLab');
  if (param === '0') return null;
  if (param !== '1') return undefined;
  return Array.isArray(window.__momentsLabOverrides) ? window.__momentsLabOverrides : null;
};

// Generated backdrop rings are the default presentation layer. ?skyLab=0 is
// the diagnostic escape hatch for the rings only — not a route back to the old
// skyline/facade/boxy dressing, which was deleted. window.__skyLabOverrides =
// { far, near } still swaps candidate strip URLs for lab work.
const skyLabConfig = () => {
  if (typeof window === 'undefined') return null;
  if (new URLSearchParams(window.location.search).get('skyLab') === '0') return null;
  const overrides = window.__skyLabOverrides || {};
  return {
    far: typeof overrides.far === 'string' ? overrides.far : null,
    near: typeof overrides.near === 'string' ? overrides.near : null,
  };
};

// H8 Miami trackside set (city-lab: hotel / condo tower / corner arcade /
// palms / lifeguard tower + retro diner). This presentation slice keeps those
// heavier generated mounts behind
// ?glbTrackside=1 and uses lightweight procedural facades by default. Every
// load goes through createGameGltfLoader (house rule), one cached template per
// URL, cloned per placement, converted unlit (MeshBasicMaterial + baked map).
// Tripo rigs natively face +X; the facade/district group convention puts the
// road on the group's -Z side, so MIAMI_FRONT_YAW turns +X onto -Z.
const MIAMI_ASSETS = {
  condoTower: miamiCondoTowerUrl,
  cornerArcade: miamiCornerArcadeUrl,
  decoHotel: miamiDecoHotelUrl,
  lifeguard: miamiLifeguardUrl,
  palmCluster: miamiPalmClusterUrl,
  retroDiner: miamiRetroDinerUrl,
};
// Loud-failure counters (same job the retired bakedBuildings==='active'
// proof gate did for the old bakes): kart-playable asserts every requested
// Miami mount actually resolved a template.
const miamiMountStats = { failed: 0, mounted: 0, requested: 0 };
const MIAMI_FRONT_YAW = Math.PI / 2;
// W3 Penguin Village tribute set (owner list + "I love the assets",
// 2026-07-07): casino/crypto trackside props, all penguin-free empty
// furniture per the no-generic-penguins rule — real ordinal penguins get
// posed at them in a later round. Shares the mount machinery + template
// cache + telemetry mounts guard with the Miami set.
const PV_TRIBUTE_ASSETS = {
  // K4: Meshy mesh (not Tripo) — front is +Z, so its mounts pass yaw: 0
  // instead of MIAMI_FRONT_YAW (orientation lab tmp/k4-crosser/).
  outplayasiansCrosser: outplayasiansCrosserUrl,
  pvBitcoinMonument: pvBitcoinMonumentUrl,
  pvBlackjack: pvBlackjackUrl,
  pvCraps: pvCrapsUrl,
  pvOddsBoard: pvOddsBoardUrl,
  pvRunestone: pvRunestoneUrl,
  pvTokenCluster: pvTokenClusterUrl,
};
Object.assign(MIAMI_ASSETS, PV_TRIBUTE_ASSETS);
// Placements chosen off the PV course markers (pads 0.12/0.33/0.58/0.85,
// box rows 0.06-0.74) so nothing crowds a pickup; clearBuildingPlacement /
// centerline checks still guard the racing line at mount time. The casino
// corner (craps + blackjack) sits on the market row.
const PV_TRIBUTE_TRACKSIDE = [
  { asset: 'pvBitcoinMonument', footprint: 22, progress: 0.08, side: 1 },
  { asset: 'pvTokenCluster', footprint: 10, progress: 0.22, side: -1 },
  { asset: 'pvRunestone', footprint: 14, progress: 0.38, side: 1 },
  { asset: 'pvCraps', footprint: 16, progress: 0.5, side: -1 },
  { asset: 'pvBlackjack', footprint: 14, progress: 0.54, side: -1 },
  { asset: 'pvOddsBoard', footprint: 20, progress: 0.66, side: 1 },
  { asset: 'pvTokenCluster', footprint: 11, progress: 0.9, side: 1 },
];
const addPvTributeTrackside = (world, sampler, roadWidth) => {
  PV_TRIBUTE_TRACKSIDE.forEach((entry) => {
    const { normal, point, tangent } = sampler.pointAt(entry.progress);
    const position = point.clone().addScaledVector(normal, entry.side * (sampler.widthAt(entry.progress) * 0.85 + 10));
    if (minCenterlineDistance(sampler, position.x, position.z) < roadWidth * 0.62) return;
    const group = new THREE.Group();
    group.position.copy(position);
    group.rotation.y = Math.atan2(tangent.x, tangent.z) + (entry.side > 0 ? -Math.PI / 2 : Math.PI / 2);
    mountMiamiAsset(group, entry.asset, { footprint: entry.footprint });
    world.add(group);
  });
};
const miamiMeshCache = new Map();
const loadMiamiAsset = (url) => {
  if (!miamiMeshCache.has(url)) {
    miamiMeshCache.set(
      url,
      new Promise((resolve) => {
        createGameGltfLoader().load(
          url,
          (gltf) => resolve(gltf.scene),
          undefined,
          () => resolve(null)
        );
      })
    );
  }
  return miamiMeshCache.get(url);
};
const mountMiamiAsset = (target, assetKey, { footprint, yaw = MIAMI_FRONT_YAW, z = 0 }) => {
  miamiMountStats.requested += 1;
  loadMiamiAsset(MIAMI_ASSETS[assetKey]).then((template) => {
    if (!template) {
      miamiMountStats.failed += 1;
      console.warn(`[kart] miami asset '${assetKey}' failed to load — slot left empty`);
      return;
    }
    miamiMountStats.mounted += 1;
    const rig = template.clone(true);
    rig.traverse((node) => {
      if (node.isMesh) {
        node.material = new THREE.MeshBasicMaterial({ map: node.material?.map || null });
        node.castShadow = false;
        node.receiveShadow = false;
      }
    });
    rig.rotation.y = yaw;
    const bounds = new THREE.Box3().setFromObject(rig);
    const size = bounds.getSize(new THREE.Vector3());
    rig.scale.setScalar(footprint / Math.max(size.x, size.z));
    const fitted = new THREE.Box3().setFromObject(rig);
    const center = fitted.getCenter(new THREE.Vector3());
    rig.position.x -= center.x;
    rig.position.z -= center.z - z;
    rig.position.y -= fitted.min.y;
    target.add(rig);
  });
};
// Opening straight (same anchors as OPENING_FACADES) + roadside dressing.
// Footprints follow the old slots (50-ish opening, 36 districts); the
// condo tower gets a smaller footprint because footprint scales the
// horizontal bounds and the tower is ~3x taller than wide.
const MIAMI_OPENING_RUN = [
  { asset: 'retroDiner', footprint: 34, progress: 0.072, side: -1 },
  { asset: 'decoHotel', footprint: 52, progress: 0.092, side: -1 },
  { asset: 'condoTower', footprint: 36, progress: 0.112, side: 1 },
  { asset: 'cornerArcade', footprint: 48, progress: 0.136, side: 1 },
  { asset: 'decoHotel', footprint: 52, progress: 0.16, side: 1 },
];
const MIAMI_DISTRICT_ASSETS = ['decoHotel', 'condoTower', 'cornerArcade', 'retroDiner', 'decoHotel'];
const MIAMI_ROADSIDE = [
  { asset: 'palmCluster', footprint: 18, progress: 0.05, side: 1 },
  { asset: 'palmCluster', footprint: 16, progress: 0.21, side: -1 },
  { asset: 'lifeguard', footprint: 14, progress: 0.3, side: 1 },
  { asset: 'palmCluster', footprint: 18, progress: 0.4, side: 1 },
  { asset: 'palmCluster', footprint: 16, progress: 0.52, side: -1 },
  { asset: 'retroDiner', footprint: 26, progress: 0.6, side: -1 },
  { asset: 'palmCluster', footprint: 17, progress: 0.68, side: 1 },
  { asset: 'lifeguard', footprint: 14, progress: 0.78, side: -1 },
  { asset: 'palmCluster', footprint: 18, progress: 0.88, side: 1 },
  { asset: 'palmCluster', footprint: 16, progress: 0.95, side: -1 },
];
const addMiamiTrackside = (world, sampler, roadWidth) => {
  MIAMI_OPENING_RUN.forEach((entry) => {
    const { normal, point, tangent } = sampler.pointAt(entry.progress);
    const placement = clearBuildingPlacement(sampler, point, normal, entry.side, 64);
    if (!placement) return;
    const group = new THREE.Group();
    group.position.copy(placement);
    group.rotation.y = Math.atan2(tangent.x, tangent.z) + (entry.side > 0 ? -Math.PI / 2 : Math.PI / 2);
    mountMiamiAsset(group, entry.asset, { footprint: entry.footprint });
    world.add(group);
  });
  MIAMI_ROADSIDE.forEach((entry) => {
    const { normal, point, tangent } = sampler.pointAt(entry.progress);
    const position = point.clone().addScaledVector(normal, entry.side * (sampler.widthAt(entry.progress) * 0.85 + 8));
    if (minCenterlineDistance(sampler, position.x, position.z) < roadWidth * 0.62) return;
    const group = new THREE.Group();
    group.position.copy(position);
    group.rotation.y = Math.atan2(tangent.x, tangent.z) + (entry.side > 0 ? -Math.PI / 2 : Math.PI / 2);
    mountMiamiAsset(group, entry.asset, { footprint: entry.footprint });
    world.add(group);
  });
};

// B2: wrap-aware atmosphere lerp driven by per-lap race.progress, called
// once per frame right before the composer renders. No-op unless
// createScene precompiled engine.paletteMoments. Zero per-frame
// allocations: sampleMoments mutates the scratch sample made in
// createScene. Colors were lerped in sRGB by the pure module, so
// setRGB(..., SRGBColorSpace) lands each endpoint exactly where the same
// hex lands through new THREE.Color(hex).
const applyPaletteMoments = (engine, progress) => {
  const moments = engine.paletteMoments;
  if (!moments) return;
  const out = sampleMoments(moments.resolved, progress, moments.sample);
  const fog = engine.scene.fog;
  fog.color.setRGB(out.fogColor.r, out.fogColor.g, out.fogColor.b, THREE.SRGBColorSpace);
  fog.near = out.fogNear;
  // resolveMoments clamps fogFar <= 840 (camera far 860 silently no-ops).
  fog.far = out.fogFar;
  engine.hemi.color.setRGB(out.hemiSky.r, out.hemiSky.g, out.hemiSky.b, THREE.SRGBColorSpace);
  engine.hemi.groundColor.setRGB(
    out.hemiGround.r,
    out.hemiGround.g,
    out.hemiGround.b,
    THREE.SRGBColorSpace
  );
  engine.sun.color.setRGB(out.sunColor.r, out.sunColor.g, out.sunColor.b, THREE.SRGBColorSpace);
  engine.sun.intensity = out.sunIntensity;
  engine.rimLight.color.setRGB(out.rim.r, out.rim.g, out.rim.b, THREE.SRGBColorSpace);
  TOON_RIM_SHARED_TINT.value.setRGB(
    out.rimTint.r,
    out.rimTint.g,
    out.rimTint.b,
    THREE.SRGBColorSpace
  );
  // bloom moments are multipliers on whichever bloom the live chain
  // carries; ?post=1&postBloom=0 leaves BOTH refs null (bloomBase null).
  if (moments.bloomBase !== null) {
    if (engine.postChainEnabled) engine.bloomEffect.intensity = moments.bloomBase * out.bloom;
    else engine.bloomPass.strength = moments.bloomBase * out.bloom;
  }
};
const createToonMaterial = (color, options = {}) => {
  // B3: `rim: true` opts a material into the hero fresnel rim; it is a
  // helper flag, not a THREE.Material property, so it must not reach the
  // constructor (setValues warns on unknown keys).
  const { rim = false, ...materialOptions } = options;
  const material = new THREE.MeshToonMaterial({ color, gradientMap: getToonGradient(), ...materialOptions });
  return rim ? applyHeroRim(material) : material;
};

// ---- Authored models (Kenney Toy Car Kit v1.2, CC0) ------------------------
// The procedural kart builds instantly as a fallback; the authored body is
// hot-swapped in once the GLB resolves.
let kartAssetsPromise = null;
const loadKartAssets = () => {
  if (!kartAssetsPromise) {
    const gltfLoader = createGameGltfLoader({
      resourceMap: {
        'Textures/colormap.png': kartColormapUrl,
      },
    });
    kartAssetsPromise = Promise.all([
      gltfLoader.loadAsync(racerModelUrl),
      gltfLoader.loadAsync(itemBoxModelUrl),
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = kartColormapUrl;
      }),
      // Driver avatars are optional — a failed load must not block the karts.
      gltfLoader.loadAsync(crrtBunnyModelUrl).catch(() => null),
      gltfLoader.loadAsync(sethPenguinModelUrl).catch(() => null),
      gltfLoader.loadAsync(heroKartTripoUrl).catch(() => null),
      gltfLoader.loadAsync(mizzleModelUrl).catch(() => null),
      gltfLoader.loadAsync(iceSledUrl).catch(() => null),
      gltfLoader.loadAsync(tclowModelUrl).catch(() => null),
      gltfLoader.loadAsync(layer23ModelUrl).catch(() => null),
      gltfLoader.loadAsync(lifoladenModelUrl).catch(() => null),
      gltfLoader.loadAsync(iceRacerKartUrl).catch(() => null),
      gltfLoader.loadAsync(miamiCruiserKartUrl).catch(() => null),
      // K7 item-prop renders — optional like the avatars; the procedural
      // stand-ins stay as instant fallbacks when a GLB fails to load.
      gltfLoader.loadAsync(fishboneTrapModelUrl).catch(() => null),
      gltfLoader.loadAsync(sardineRocketModelUrl).catch(() => null),
      gltfLoader.loadAsync(avalancheMoundModelUrl).catch(() => null),
      gltfLoader.loadAsync(blizzardCloudModelUrl).catch(() => null),
    ]).then(([racerGltf, itemBoxGltf, colormapImage, bunnyGltf, sethGltf, tripoKartGltf, mizzleGltf, iceSledGltf, tclowGltf, layer23Gltf, lifoladenGltf, iceRacerGltf, miamiCruiserGltf, fishboneGltf, sardineGltf, avalancheGltf, blizzardGltf]) => ({
      colormapImage,
      // Keyed by KART_CHARACTERS entries — seats are assigned at race start.
      driverScenes: {
        'crrt-bunny': bunnyGltf?.scene || null,
        layer23: layer23Gltf?.scene || null,
        lifoladen: lifoladenGltf?.scene || null,
        mizzle: mizzleGltf?.scene || null,
        'seth-penguin': sethGltf?.scene || null,
        tclow: tclowGltf?.scene || null,
      },
      itemBoxScene: itemBoxGltf.scene,
      itemPropScenes: {
        avalanche: avalancheGltf?.scene || null,
        blizzard: blizzardGltf?.scene || null,
        fishbone: fishboneGltf?.scene || null,
        sardine: sardineGltf?.scene || null,
      },
      kartScenes: {
        hero: tripoKartGltf?.scene || null,
        icesled: iceSledGltf?.scene || null,
        iceracer: iceRacerGltf?.scene || null,
        miamicruiser: miamiCruiserGltf?.scene || null,
      },
      racerScene: racerGltf.scene,
    }));
  }
  return kartAssetsPromise;
};

const makeKartPaletteTexture = (colormapImage, bodyHex = null) => {
  const canvas = document.createElement('canvas');
  canvas.width = colormapImage.naturalWidth || colormapImage.width;
  canvas.height = colormapImage.naturalHeight || colormapImage.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(colormapImage, 0, 0);
  if (bodyHex) {
    // Remap the kit's orange body swatches to the kart's V2 color while
    // keeping the baked gradient shading.
    const targetHsl = { h: 0, l: 0, s: 0 };
    new THREE.Color(bodyHex).getHSL(targetHsl);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const probe = new THREE.Color();
    const hsl = { h: 0, l: 0, s: 0 };
    for (let index = 0; index < pixels.data.length; index += 4) {
      probe.setRGB(pixels.data[index] / 255, pixels.data[index + 1] / 255, pixels.data[index + 2] / 255);
      probe.getHSL(hsl);
      if (hsl.h > 0.04 && hsl.h < 0.12 && hsl.s > 0.55 && hsl.l > 0.25 && hsl.l < 0.78) {
        probe.setHSL(targetHsl.h, clamp(targetHsl.s, 0.45, 1), hsl.l * (0.65 + targetHsl.l * 0.5));
        pixels.data[index] = Math.round(probe.r * 255);
        pixels.data[index + 1] = Math.round(probe.g * 255);
        pixels.data[index + 2] = Math.round(probe.b * 255);
      }
    }
    ctx.putImageData(pixels, 0, 0);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  return texture;
};

const KENNEY_WHEEL_NODES = ['wheel-fl', 'wheel-fr', 'wheel-bl', 'wheel-br'];

// Rig facing is authored per asset and verified against the orientation lab
// (orientation-lab.html → scripts/orientation-lab-capture.mjs), which renders
// every GLB at 4 yaws facing a known camera — never inferred from bboxes or
// gameplay shots (both guessed wrong). Lab ground truth 2026-06-12: ALL
// Tripo rigs (kart + seated avatars) natively face +X → yaw -π/2; the
// Kenney drag racer faces -Z → yaw π.
// Per-character authored yaws live in KART_CHARACTERS.driverYaw.
const KENNEY_BODY_YAW = Math.PI;

// Seat the avatar on the kart's driver mount: toon-shaded with its baked
// texture, normalized so the seated character reads MK-style oversized.
const mountDriverAvatar = (kartModel, driverScene, { castsShadow = true, height = 5.7, yaw = 0 } = {}) => {
  const rig = driverScene.clone(true);
  rig.traverse((node) => {
    if (node.isMesh) {
      node.material = applyHeroRim(
        new THREE.MeshToonMaterial({
          gradientMap: getToonGradient(),
          map: node.material?.map || null,
        })
      );
      node.castShadow = castsShadow;
    }
  });
  const bounds = new THREE.Box3().setFromObject(rig);
  const size = bounds.getSize(new THREE.Vector3());
  rig.rotation.y = yaw;
  const fit = height / Math.max(0.0001, size.y);
  rig.scale.setScalar(fit);
  rig.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(rig);
  const center = fitted.getCenter(new THREE.Vector3());
  rig.position.x -= center.x;
  rig.position.z -= center.z;
  rig.position.y -= fitted.min.y;
  kartModel.driverMount.clear();
  kartModel.driverMount.add(rig);
  return rig;
};

// K7 item-prop fit: clone a rendered GLB, go unlit (the projectile/marker
// family uses emissive-bright materials so items read at race speed), size
// it to the MK-oversize target, and either center it or seat it on y=0.
const fitItemPropScene = (scene, targetSize, { seat = false, yaw = 0 } = {}) => {
  const rig = scene.clone(true);
  rig.traverse((node) => {
    if (node.isMesh) {
      node.material = new THREE.MeshBasicMaterial({ map: node.material?.map || null });
      node.castShadow = false;
    }
  });
  rig.rotation.y = yaw;
  const bounds = new THREE.Box3().setFromObject(rig);
  const size = bounds.getSize(new THREE.Vector3());
  rig.scale.setScalar(targetSize / Math.max(0.0001, size.x, size.y, size.z));
  rig.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(rig);
  const center = fitted.getCenter(new THREE.Vector3());
  rig.position.x -= center.x;
  rig.position.z -= center.z;
  if (seat) rig.position.y -= fitted.min.y;
  else rig.position.y -= center.y;
  return rig;
};

// K7 prop swaps: rendered GLBs replace the procedural stand-ins INSIDE the
// existing pools — every position/visibility/burst hook drives the same
// holders, so item SEMANTICS are untouched (validators prove it) and the
// procedural mesh remains the instant fallback when a GLB fails to load.
const swapItemPropVisuals = (engine, itemPropScenes) => {
  const removeMeshes = (group) => {
    [...group.children]
      .filter((child) => child.isMesh)
      .forEach((child) => {
        child.geometry?.dispose?.();
        child.material?.dispose?.();
        group.remove(child);
      });
  };
  if (itemPropScenes.fishbone) {
    engine.fishBonePool.forEach((holder) => {
      removeMeshes(holder);
      const rig = fitItemPropScene(itemPropScenes.fishbone, 7, { seat: true });
      rig.position.y += 0.3;
      holder.add(rig);
    });
  }
  if (itemPropScenes.sardine) {
    engine.projectilePool.forEach((holder) => {
      const variant = holder.children.find((child) => child.userData.skin === 'sardine');
      if (!variant) return;
      removeMeshes(variant);
      // Lab-verified nose = -X (Meshy convention) -> +π/2 puts it on the
      // holder's +Z travel axis like the procedural rocket.
      variant.add(fitItemPropScene(itemPropScenes.sardine, 6.4, { yaw: Math.PI / 2 }));
    });
  }
  if (itemPropScenes.avalanche) {
    // Purely additive: the mound erupts inside the existing warning ring —
    // ring + glow stay (the frame loop drives their opacity/pulse).
    const mound = fitItemPropScene(itemPropScenes.avalanche, 13, { seat: true });
    engine.avalancheMarker.add(mound);
  }
  if (itemPropScenes.blizzard) {
    engine.blizzardPool.forEach((holder) => {
      // The fog shells stay (they ARE the slow-zone read + fade hook); the
      // rendered cloud crowns the dome and spins with the holder.
      const cloud = fitItemPropScene(itemPropScenes.blizzard, 15, { seat: true });
      cloud.position.y += 2.4;
      holder.add(cloud);
    });
  }
};

// A/B variant: AI-generated kart body with its own baked texture. One fused
// mesh — no wheel nodes, so wheels are static (acceptable for the visual A/B).
const attachTripoKartBody = (kartModel, tripoScene, castsShadow, noseYaw = -Math.PI / 2) => {
  const rig = tripoScene.clone(true);
  rig.traverse((node) => {
    if (node.isMesh) {
      node.material = applyHeroRim(
        new THREE.MeshToonMaterial({
          gradientMap: getToonGradient(),
          map: node.material?.map || null,
        })
      );
      node.castShadow = castsShadow;
    }
  });
  const bounds = new THREE.Box3().setFromObject(rig);
  const size = bounds.getSize(new THREE.Vector3());
  // Per-kart nose yaw (KART_NOSE_YAW): Tripo bodies face +X (-π/2 to put
  // the nose on +Z, our driving direction — the old +π/2 guess drove
  // backward, owner-reported), Meshy K5 bodies face -X (+π/2).
  rig.rotation.y = noseYaw;
  const fit = 15.6 / Math.max(size.x, size.z);
  rig.scale.setScalar(fit);
  rig.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(rig);
  rig.position.y -= fitted.min.y;
  // This body is taller and cowled — seat the driver higher and further back
  // than the Kenney cockpit default. Nose is on +Z (lab-verified), so the
  // cockpit sits in the rear half at -z.
  kartModel.driverMount.position.set(0, (fitted.max.y - fitted.min.y) * 0.58, -1.9);
  kartModel.replaceBody(rig);
};

const attachAuthoredKartBody = (kartModel, racerScene, texture, castsShadow, fitLength = 15.6) => {
  const rig = racerScene.clone(true);
  const material = applyHeroRim(new THREE.MeshToonMaterial({ gradientMap: getToonGradient(), map: texture }));
  rig.traverse((node) => {
    if (node.isMesh) {
      node.material = material;
      node.castShadow = castsShadow;
    }
  });
  const bounds = new THREE.Box3().setFromObject(rig);
  const size = bounds.getSize(new THREE.Vector3());
  // Lab-verified: the Kenney drag racer natively faces -Z; π puts its nose
  // on +Z, our driving direction (rivals drove tail-first until 2026-06-12).
  rig.rotation.y = KENNEY_BODY_YAW;
  const fit = fitLength / Math.max(size.x, size.z);
  rig.scale.setScalar(fit);
  rig.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(rig);
  rig.position.y -= fitted.min.y;
  kartModel.driverMount.position.set(0, 1.9, -1.3);
  kartModel.replaceBody(rig);
};

let sharedGlowTexture = null;
const addGlowSprite = (parent, color, spriteScale, opacity = 0.5, y = 0) => {
  if (!sharedGlowTexture) sharedGlowTexture = makeGlowTexture();
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      blending: THREE.AdditiveBlending,
      color,
      depthWrite: false,
      map: sharedGlowTexture,
      opacity,
      transparent: true,
    })
  );
  sprite.scale.setScalar(spriteScale);
  sprite.position.y = y;
  sprite.renderOrder = 28;
  parent.add(sprite);
  return sprite;
};

const addTrack = (world, sampler, trackDef, trackVisuals = resolveTrackVisuals(trackDef, { enabled: false })) => {
  const bridgeBand = trackDef.elevation.bridgeBand;
  const roadWidth = trackDef.course.mainRoadWidth || 50;
  const palette = trackDef.palette || {};
  // Graphics overhaul: per-track grade for the road/ground specular lift.
  // Atmosphere off (or ?gfx=off) falls back to the renderer material baseline.
  const gfxCfg = resolveGraphicsConfig();
  const roadGrade = gfxCfg.atmosphere ? atmosphereGradeFor(trackDef.key) : null;
  // Phase 3: procedural detail normal + roughness maps give the asphalt
  // micro-surface relief + a broken-up wet sheen. One-time canvas bake, then
  // a single texture lookup per fragment. Tiling matches the color texture.
  const roadDetailMaps = gfxCfg.trackDetailMaps
    ? {
        normalMap: makeAsphaltDetailNormalMap({ repeat: 8 }),
        roughnessMap: makeAsphaltRoughnessMap({ repeat: 8, base: roadGrade ? roadGrade.road.roughness : 0.6, variance: 0.1 }),
      }
    : null;
  const visualRoadEnabled = trackVisuals.enabled && Boolean(trackDef.visual);
  const visualRoad = trackVisuals.road;
  const bankYOffsetAt = (progress, signedWidthMultiplier) => {
    if (!visualRoadEnabled) return 0;
    const band = roadVisualBandAt(trackVisuals, progress);
    const degrees = band?.bankingDegrees || 0;
    return signedWidthMultiplier * sampler.widthAt(progress) * Math.sin(THREE.MathUtils.degToRad(degrees));
  };
  const surfacePointAt = (progress, lane = 0) => {
    const sample = sampler.pointAt(progress, lane);
    sample.point.y += bankYOffsetAt(progress, lane * 0.44);
    return sample;
  };
  const resolveMul = (value, progress, width, band) =>
    typeof value === 'function' ? value(progress, width, band) : value;
  const shoulderWidthAt = (progress, width, band) =>
    visualRoadEnabled ? Math.max(0, band?.shoulderWidth ?? visualRoad.shoulder.width) : Math.max(0, width * 0.06);
  const curbWidthAt = (progress, width, band) =>
    visualRoadEnabled ? Math.max(0.5, band?.curbWidth ?? visualRoad.curb.width) : Math.max(0.5, width * 0.06);
  const shoulderOuterMulAt = (progress, width, band) => 0.44 + shoulderWidthAt(progress, width, band) / width;
  const curbInnerMulAt = (progress, width, band) => shoulderOuterMulAt(progress, width, band) + 0.006;
  const curbOuterMulAt = (progress, width, band) =>
    curbInnerMulAt(progress, width, band) + curbWidthAt(progress, width, band) / width;
  const barrierMulAt = (progress, width, band) => curbOuterMulAt(progress, width, band) + 0.055;
  const vertices = [];
  const uvs = [];
  const indices = [];
  for (let index = 0; index <= TRACK_SAMPLES; index += 1) {
    const progress = index / TRACK_SAMPLES;
    const left = surfacePointAt(progress, -1).point;
    const right = surfacePointAt(progress, 1).point;
    left.y += 0.05;
    right.y += 0.05;
    vertices.push(left.x, left.y, left.z, right.x, right.y, right.z);
    uvs.push(0, index * 0.4, 1, index * 0.4);
    if (index < TRACK_SAMPLES) {
      const a = index * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const asphaltTexture = makeNoiseTexture({
    base: visualRoadEnabled ? visualRoad.asphalt.base : '#2c3450',
    repeat: 1,
    speckles: visualRoadEnabled
      ? visualRoad.asphalt.speckles
      : [
          { color: '#343f5c', count: 380, size: 2.4 },
          { color: '#202840', count: 340, size: 3.1 },
          { color: '#3c4a6e', count: 90, size: 1.6 },
        ],
  });
  const road = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: asphaltTexture,
      // Graphics overhaul: the grade pushes the asphalt toward a wet/glossy
      // response so sun + neon streak across it under the env probe. The
      // envMapIntensity scales this material's IBL on top of the scene-wide
      // environmentIntensity. ?gfx=off leaves the baseline 0.06/0.6 flat mat.
      metalness: roadGrade ? roadGrade.road.metalness : 0.06,
      roughness: roadGrade ? roadGrade.road.roughness : 0.6,
      envMapIntensity: roadGrade ? roadGrade.road.envMapIntensity : 1.0,
      // Phase 3 detail: normal relief + varying roughness break the specular
      // into believable aggregate. normalScale kept subtle so the road reads
      // as asphalt, not gravel. Absent on ?gfx=off.
      normalMap: roadDetailMaps ? roadDetailMaps.normalMap : null,
      normalScale: roadDetailMaps ? new THREE.Vector2(gfxCfg.trackDetailNormalScale, gfxCfg.trackDetailNormalScale) : new THREE.Vector2(1, 1),
      roughnessMap: roadDetailMaps ? roadDetailMaps.roughnessMap : null,
      side: THREE.DoubleSide,
    })
  );
  road.receiveShadow = true;
  road.userData.kind = 'real-3d-track-mesh';
  world.add(road);

  const grassTexture = makeNoiseTexture(
    palette.ground || {
      base: '#1f4636',
      repeat: 16,
      speckles: [
        { color: '#28593f', count: 380, size: 3.4 },
        { color: '#16352a', count: 320, size: 4.2 },
      ],
    }
  );
  // Ground plane sized from the course world bounds (custom map ships
  // worldBounds; legacy courses keep the authored 1120×1060 plane).
  const worldBounds = trackDef.course.worldBounds || null;
  const groundSpanX = worldBounds ? worldBounds.maxX - worldBounds.minX + 220 : 1120;
  const groundSpanZ = worldBounds ? worldBounds.maxZ - worldBounds.minZ + 220 : 1060;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundSpanX, groundSpanZ, 18, 18),
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: grassTexture,
      roughness: roadGrade ? roadGrade.ground.roughness : 0.92,
      envMapIntensity: roadGrade ? roadGrade.ground.envMapIntensity : 1.0,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.06;
  if (worldBounds) {
    ground.position.x = (worldBounds.minX + worldBounds.maxX) / 2;
    ground.position.z = (worldBounds.minZ + worldBounds.maxZ) / 2;
  }
  ground.receiveShadow = true;
  world.add(setFlatTransform(ground));

  const CURB_RED = new THREE.Color(palette.curb?.a || '#ff5d4f');
  const CURB_WHITE = new THREE.Color(palette.curb?.b || '#f8fbff');
  const buildCheckerRibbon = ({
    checkerEvery = 1,
    colorA = CURB_RED,
    colorB = CURB_WHITE,
    innerMul,
    outerMul,
    side,
    unlit = false,
    yBottom = 0.3,
    yTop = 0.3,
  }) => {
    const positions = [];
    const colors = [];
    const indices = [];
    const samples = [];
    for (let index = 0; index <= TRACK_SAMPLES; index += 1) {
      const progress = index / TRACK_SAMPLES;
      const band = roadVisualBandAt(trackVisuals, progress);
      const { normal, point, tangent } = sampler.pointAt(progress);
      const width = sampler.widthAt(progress);
      const innerValue = resolveMul(innerMul, progress, width, band);
      const outerValue = resolveMul(outerMul, progress, width, band);
      const inner = point.clone().addScaledVector(normal, side * innerValue * width);
      const outer = point.clone().addScaledVector(normal, side * outerValue * width);
      inner.y += yBottom + bankYOffsetAt(progress, side * innerValue);
      outer.y += yTop + bankYOffsetAt(progress, side * outerValue);
      samples.push({ inner, outer, tangent });
      positions.push(inner.x, inner.y, inner.z, outer.x, outer.y, outer.z);
      const color = Math.floor(index / checkerEvery) % 2 === 0 ? colorA : colorB;
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    }
    for (let index = 0; index < TRACK_SAMPLES; index += 1) {
      // On hairpins tighter than the offset radius the offset curve folds back
      // on itself; skip those segments instead of drawing crossed ribbons.
      const step = samples[index + 1].outer.clone().sub(samples[index].outer);
      step.y = 0;
      if (step.dot(samples[index].tangent) <= 0) continue;
      const a = index * 2;
      if (side > 0) indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      else indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const ribbon = new THREE.Mesh(
      geometry,
      unlit
        ? new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, vertexColors: true })
        : new THREE.MeshStandardMaterial({
            flatShading: true,
            metalness: 0.04,
            roughness: 0.5,
            side: THREE.DoubleSide,
            vertexColors: true,
          })
    );
    ribbon.receiveShadow = true;
    return ribbon;
  };
  const buildProgressRibbon = ({
    color,
    endProgress,
    innerMul,
    outerMul,
    side,
    startProgress,
    steps = 8,
    yBottom = 0.42,
    yTop = 0.42,
  }) => {
    const positions = [];
    const colors = [];
    const indices = [];
    const span = ((endProgress - startProgress) % 1 + 1) % 1 || 1;
    const tint = new THREE.Color(color);
    for (let step = 0; step <= steps; step += 1) {
      const progress = wrap01(startProgress + span * (step / steps));
      const band = roadVisualBandAt(trackVisuals, progress);
      const { normal, point, tangent } = sampler.pointAt(progress);
      const width = sampler.widthAt(progress);
      const innerValue = resolveMul(innerMul, progress, width, band);
      const outerValue = resolveMul(outerMul, progress, width, band);
      const inner = point.clone().addScaledVector(normal, side * innerValue * width);
      const outer = point.clone().addScaledVector(normal, side * outerValue * width);
      inner.y += yBottom + bankYOffsetAt(progress, side * innerValue);
      outer.y += yTop + bankYOffsetAt(progress, side * outerValue);
      positions.push(inner.x, inner.y, inner.z, outer.x, outer.y, outer.z);
      colors.push(tint.r, tint.g, tint.b, tint.r, tint.g, tint.b);
      if (step < steps) {
        // Skip folded offset spans on the tightest bend; the full road mesh
        // remains continuous, and these are additive glow accents only.
        const nextProgress = wrap01(startProgress + span * ((step + 1) / steps));
        const nextPoint = sampler.pointAt(nextProgress, 0).point;
        if (nextPoint.clone().sub(point).dot(tangent) <= 0) continue;
        const a = step * 2;
        if (side > 0) indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        else indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const ribbon = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.82,
        side: THREE.DoubleSide,
        transparent: true,
        vertexColors: true,
      })
    );
    ribbon.userData.kind = 'district-edge-glow-ribbon';
    return ribbon;
  };

  [-1, 1].forEach((side) => {
    if (visualRoadEnabled && visualRoad.shoulder.enabled) {
      const shoulderColor = new THREE.Color(visualRoad.shoulder.color);
      const shoulder = buildCheckerRibbon({
        checkerEvery: TRACK_SAMPLES * 2,
        colorA: shoulderColor,
        colorB: shoulderColor,
        innerMul: 0.44,
        outerMul: shoulderOuterMulAt,
        side,
        yBottom: 0.16,
        yTop: 0.12,
      });
      shoulder.userData.kind = 'visual-shoulder-ribbon';
      world.add(shoulder);
    }
    const curb = buildCheckerRibbon({
      colorA: new THREE.Color(visualRoadEnabled ? visualRoad.curb.colorA : CURB_RED),
      colorB: new THREE.Color(visualRoadEnabled ? visualRoad.curb.colorB : CURB_WHITE),
      innerMul: visualRoadEnabled ? curbInnerMulAt : 0.5,
      outerMul: visualRoadEnabled ? curbOuterMulAt : 0.56,
      side,
      unlit: true,
      yBottom: 0.32,
      yTop: 0.18,
    });
    curb.userData.kind = 'curb-ribbon';
    world.add(curb);
    const wall = buildCheckerRibbon({
      checkerEvery: 2,
      colorA: new THREE.Color(visualRoadEnabled ? visualRoad.barrier.wallA : palette.wall?.a || '#e94d3f'),
      colorB: new THREE.Color(visualRoadEnabled ? visualRoad.barrier.wallB : palette.wall?.b || '#f8fbff'),
      innerMul: visualRoadEnabled ? barrierMulAt : 0.62,
      outerMul: visualRoadEnabled ? barrierMulAt : 0.62,
      side,
      yBottom: 0.02,
      yTop: 2.6,
    });
    wall.userData.kind = 'barrier-wall-ribbon';
    world.add(wall);
    // Continuous neon edge rail on top of the barrier — the "curb lights &
    // edge lighting" module from the roadside-props card.
    const railColor = new THREE.Color(visualRoadEnabled ? visualRoad.barrier.railColor : palette.rail || '#36e2ff').multiplyScalar(1.7);
    const railTop = buildCheckerRibbon({
      checkerEvery: TRACK_SAMPLES * 2,
      colorA: railColor,
      colorB: railColor,
      innerMul: visualRoadEnabled
        ? (progress, width, band) => barrierMulAt(progress, width, band) - 0.015
        : 0.605,
      outerMul: visualRoadEnabled
        ? (progress, width, band) => barrierMulAt(progress, width, band) + 0.015
        : 0.635,
      side,
      unlit: true,
      yBottom: 2.6,
      yTop: 2.6,
    });
    railTop.userData.kind = 'barrier-cap-ribbon';
    world.add(railTop);
  });

  const laneMarkings = visualRoadEnabled ? visualRoad.laneMarkings : { color: '#ffd34f', enabled: true, everySamples: 4, mode: 'center-dash' };
  if (laneMarkings.enabled && laneMarkings.mode !== 'none') {
    const lineMat = createBasicMaterial(laneMarkings.color, { emissive: laneMarkings.color, emissiveIntensity: 0.65 });
    // All center dashes bake into ONE mesh — 28 separate draws was pure
    // SwiftShader tax on the headless gate host.
    const dashGeometries = [];
    for (let index = 0; index < TRACK_SAMPLES; index += laneMarkings.everySamples) {
      const progress = index / TRACK_SAMPLES;
      const { point, tangent } = surfacePointAt(progress);
      const geometry = new THREE.BoxGeometry(1.15, 0.08, 11.5).toNonIndexed();
      const transform = new THREE.Matrix4().compose(
        new THREE.Vector3(point.x, point.y + 0.22, point.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(tangent.x, tangent.z), 0)),
        new THREE.Vector3(1, 1, 1)
      );
      geometry.applyMatrix4(transform);
      dashGeometries.push(geometry);
    }
    if (dashGeometries.length) {
      const dashes = new THREE.Mesh(mergeGeometries(dashGeometries, false), lineMat);
      dashes.userData.kind = 'visual-lane-marking';
      dashGeometries.forEach((geometry) => geometry.dispose());
      world.add(setFlatTransform(dashes));
    }
  }
  if (visualRoadEnabled) {
    (trackVisuals.districtCues || []).forEach((cue) => {
      [-1, 1].forEach((side) => {
        const ribbon = buildProgressRibbon({
          color: cue.accent,
          endProgress: cue.progress + cue.span * 0.5,
          innerMul: (progress, width, band) => barrierMulAt(progress, width, band) - 0.08,
          outerMul: (progress, width, band) => barrierMulAt(progress, width, band) - 0.02,
          side,
          startProgress: cue.progress - cue.span * 0.5,
          steps: 10,
          yBottom: 2.84,
          yTop: 2.84,
        });
        ribbon.userData.districtKey = cue.key;
        world.add(ribbon);
      });
    });
  }
  // ---- Bridge structure (owner feedback: the climb must read as a real
  // bridge, not a floating road). Deck skirts hang below both road edges
  // with a neon underline; chunky pillar pairs with cross-beams carry it.
  const bridgeCfg = palette.bridge || {};
  const skirtMat = createBasicMaterial(bridgeCfg.skirt || '#1a2438', {
    emissive: bridgeCfg.skirt || '#1a2438',
    emissiveIntensity: 0.15,
  });
  const skirtGlowMat = createBasicMaterial(bridgeCfg.glow || '#36e2ff', {
    emissive: bridgeCfg.glow || '#36e2ff',
    emissiveIntensity: 1.1,
  });
  const SKIRT_STEPS = 26;
  [-1, 1].forEach((side) => {
    [
      { depth: 6.2, material: skirtMat, top: 0.26 },
      { depth: 6.9, material: skirtGlowMat, top: -6.2 },
    ].forEach(({ depth, material, top }) => {
      const positions = [];
      const indices = [];
      for (let step = 0; step <= SKIRT_STEPS; step += 1) {
        const p = bridgeBand.from - 0.008 + (bridgeBand.to - bridgeBand.from + 0.016) * (step / SKIRT_STEPS);
        const { point } = sampler.pointAt(p, side);
        positions.push(point.x, point.y + top, point.z, point.x, Math.max(0.05, point.y - depth), point.z);
        if (step < SKIRT_STEPS) {
          const a = step * 2;
          if (side > 0) indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
          else indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const skirt = new THREE.Mesh(geometry, material);
      skirt.material.side = THREE.DoubleSide;
      skirt.userData.kind = 'bridge-skirt';
      world.add(skirt);
    });
  });

  const pillarMat = createBasicMaterial(bridgeCfg.pillar || '#3a4a63', {
    emissive: bridgeCfg.pillarEmissive || '#22304a',
    emissiveIntensity: 0.3,
  });
  const beamMat = createBasicMaterial(bridgeCfg.beam || '#2a3852');
  // A pillar position that lands on the lower road (the routes share ground at
  // the crossing) would stand in the racing line — skip those.
  const onLowerRoad = (x, z) => {
    for (let index = 0; index < TRACK_SAMPLES; index += 1) {
      const { center } = sampler.pointAt(index / TRACK_SAMPLES);
      if (center.y < 2 && Math.hypot(center.x - x, center.z - z) < roadWidth * 0.62) return true;
    }
    return false;
  };
  for (let p = bridgeBand.from + 0.012; p < bridgeBand.to - 0.01; p += 0.018) {
    const deckHeight = sampler.elevationAt(p);
    if (deckHeight < 3.2) continue;
    const { point: beamPoint, tangent } = sampler.pointAt(p, 0);
    let pairClear = true;
    [-0.36, 0.36].forEach((lane) => {
      const { point } = sampler.pointAt(p, lane);
      if (onLowerRoad(point.x, point.z)) {
        pairClear = false;
        return;
      }
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(4.2, deckHeight, 4.2), pillarMat);
      pillar.position.set(point.x, deckHeight / 2 - 0.3, point.z);
      world.add(setFlatTransform(pillar));
    });
    if (pairClear && deckHeight > 6) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(sampler.widthAt(p) * 0.36, 1.6, 2.4), beamMat);
      beam.position.set(beamPoint.x, deckHeight - 4.6, beamPoint.z);
      beam.rotation.y = Math.atan2(tangent.x, tangent.z);
      world.add(setFlatTransform(beam));
    }
  }

  // K2.5 round 2 (owner 2026-07-12: "bridge still did not read sadly") —
  // skirts/pillars/beams all face outward or down, so the DRIVER on the
  // deck never sees any of it. Rails are the from-the-deck read: a glowing
  // band along both deck edges through the span, merged into ONE mesh.
  // Palette-gated (bridge.rail) so PV's 799/800 draw budget is untouched.
  if (bridgeCfg.rail) {
    const railMat = createBasicMaterial(bridgeCfg.rail, { emissive: bridgeCfg.rail, emissiveIntensity: 1.15 });
    railMat.side = THREE.DoubleSide;
    const positions = [];
    const indices = [];
    const RAIL_STEPS = 30;
    const RAIL_TOP = 1.5;
    const RAIL_BAND = 0.45;
    [-1, 1].forEach((side) => {
      const base = positions.length / 3;
      for (let step = 0; step <= RAIL_STEPS; step += 1) {
        const p = bridgeBand.from + (bridgeBand.to - bridgeBand.from) * (step / RAIL_STEPS);
        const { point } = sampler.pointAt(p, side);
        positions.push(point.x, point.y + RAIL_TOP, point.z, point.x, point.y + RAIL_TOP - RAIL_BAND, point.z);
      }
      for (let step = 0; step < RAIL_STEPS; step += 1) {
        const a = base + step * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const railGeometry = new THREE.BufferGeometry();
    railGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    railGeometry.setIndex(indices);
    railGeometry.computeVertexNormals();
    const rails = new THREE.Mesh(railGeometry, railMat);
    rails.userData.kind = 'bridge-rails';
    world.add(rails);
  }

  const arrowMat = new THREE.MeshBasicMaterial({ color: '#2cc4e8' });
  for (let index = 0; index < 11; index += 1) {
    const progress = (0.04 + index * 0.085) % 1;
    [-0.38, 0.38].forEach((lane) => {
      const { point, tangent } = sampler.pointAt(progress, lane);
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(3.4, 9.5, 3), arrowMat);
      arrow.position.copy(point);
      arrow.position.y += 0.26;
      arrow.rotation.set(Math.PI / 2, 0, -Math.PI / 2 + Math.atan2(tangent.z, tangent.x));
      arrow.scale.set(1.25, 1, 0.2);
      world.add(setFlatTransform(arrow));
    });
  }
  let visualPropCount = 0;
  if (visualRoadEnabled) {
    const anchors = buildVisualPlacementAnchors(trackVisuals);
    if (anchors.length) {
      const geometry = new THREE.CylinderGeometry(0.85, 1.25, 6.2, 6);
      const material = createBasicMaterial(anchors[0].color || visualRoad.barrier.railColor, {
        emissive: anchors[0].color || visualRoad.barrier.railColor,
        emissiveIntensity: 1.15,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, anchors.length);
      const matrixSource = new THREE.Object3D();
      anchors.forEach((anchor, index) => {
        const progress = anchor.progress;
        const band = roadVisualBandAt(trackVisuals, progress);
        const width = sampler.widthAt(progress);
        const edgeOffset =
          shoulderOuterMulAt(progress, width, band) * width +
          curbWidthAt(progress, width, band) +
          anchor.offset;
        const { normal, point, tangent } = sampler.pointAt(progress, 0);
        matrixSource.position.copy(point).addScaledVector(normal, anchor.side * edgeOffset);
        matrixSource.position.y += bankYOffsetAt(progress, anchor.side * edgeOffset / width) + 3.1 * anchor.scale + anchor.verticalOffset;
        matrixSource.rotation.set(0, Math.atan2(tangent.x, tangent.z) + (anchor.side > 0 ? Math.PI / 2 : -Math.PI / 2), 0);
        matrixSource.scale.setScalar(anchor.scale);
        matrixSource.updateMatrix();
        mesh.setMatrixAt(index, matrixSource.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.userData.kind = 'visual-instanced-barrier-family';
      mesh.userData.assetId = anchors[0].assetId;
      mesh.userData.instanceCount = anchors.length;
      world.add(mesh);
      visualPropCount = anchors.length;
    }
  }
  return visualPropCount;
};

// W2 boost-pad clarity lab (dev-only, house hook pattern): ?boostLab=1 +
// window.__boostLabOverrides = { variant: 'v1'|'v2'|'v3' } REPLACES the pad
// treatment; ?boostLab=0 or absent = current default untouched until the owner
// picks (owner 2026-07-07: "The boost aren't very clear").
const boostLabVariant = () => {
  if (typeof window === 'undefined') return null;
  if (new URLSearchParams(window.location.search).get('boostLab') !== '1') return null;
  const variant = window.__boostLabOverrides?.variant;
  return variant === 'v1' || variant === 'v2' || variant === 'v3' ? variant : null;
};

// W2 camera lab (dev-only, house hook pattern): ?camLab=1 +
// window.__camLabOverrides = { back, height, lookAhead, lookUp } replaces
// the chase-camera framing numbers — built to answer the owner's "see the
// boost pads earlier on approach" ask with SMALL camera adjustments.
// Default framing untouched without the param.
const camLabConfig = () => {
  if (typeof window === 'undefined') return null;
  if (new URLSearchParams(window.location.search).get('camLab') !== '1') return null;
  const overrides = window.__camLabOverrides || {};
  const num = (value) => (Number.isFinite(value) ? value : null);
  return {
    back: num(overrides.back),
    height: num(overrides.height),
    lookAhead: num(overrides.lookAhead),
    lookUp: num(overrides.lookUp),
  };
};

// K7 boost-pad rebuild geometry (concept: tmp/k7-item-lab/boost-pad.png; the
// pad stays authored geometry, not a GLB lift). Shared lazily across every pad
// on both tracks. The chevron carries
// its white-hot-core→ember-bevel gradient in HDR vertex colors (the post
// chain blooms >1 channels, same trick as the multiplyScalar materials) so
// each chevron stays ONE draw call and can still pulse per-chevron.
let hotChevronGeometry = null;
const getHotChevronGeometry = () => {
  if (hotChevronGeometry) return hotChevronGeometry;
  // Flat chevron band extrude: apex +Y in shape space → +Z (direction of
  // travel) once rotated flat; base rests on y=0.
  const buildChevronSlab = (halfWidth, rake, band, depth, bevelThickness, bevelSize) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, band);
    shape.lineTo(halfWidth, band - halfWidth * rake);
    shape.lineTo(halfWidth, -halfWidth * rake);
    shape.lineTo(0, 0);
    shape.lineTo(-halfWidth, -halfWidth * rake);
    shape.lineTo(-halfWidth, band - halfWidth * rake);
    shape.closePath();
    const slab = new THREE.ExtrudeGeometry(shape, {
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize,
      bevelThickness,
      depth,
    });
    slab.rotateX(Math.PI / 2);
    slab.computeBoundingBox();
    slab.translate(0, -slab.boundingBox.min.y, 0);
    return slab;
  };
  const paintByHeight = (geometry, low, high) => {
    geometry.computeBoundingBox();
    const span = geometry.boundingBox.max.y - geometry.boundingBox.min.y || 1;
    const base = geometry.boundingBox.min.y;
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i += 1) {
      const t = (positions.getY(i) - base) / span;
      colors.set(
        [low[0] + (high[0] - low[0]) * t, low[1] + (high[1] - low[1]) * t, low[2] + (high[2] - low[2]) * t],
        i * 3
      );
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  };
  const rake = 0.42;
  // Body: ember at the road climbing to molten orange at the top face.
  const body = buildChevronSlab(5.8, rake, 1.7, 0.6, 0.24, 0.3);
  paintByHeight(body, [0.9, 0.22, 0.04], [1.75, 0.62, 0.08]);
  // White-hot core: an inset strip riding the top face (the concept's molten
  // center; a vertex-color spine can't render on the cap — no interior
  // vertices — so it's real geometry, merged to keep ONE draw call).
  const core = buildChevronSlab(5.0, rake, 0.72, 0.1, 0.07, 0.09);
  paintByHeight(core, [2.0, 1.15, 0.32], [2.35, 2.05, 1.5]);
  core.translate(0, 1.03, 0.49); // atop the body, centered in the arm
  hotChevronGeometry = mergeGeometries([body, core]);
  return hotChevronGeometry;
};

// Glowing edge trim: outer band + inner pinstripe as ONE extrude (one draw
// call), rounded corners like the concept frame.
let padTrimGeometry = null;
const getPadTrimGeometry = () => {
  if (padTrimGeometry) return padTrimGeometry;
  const roundedRect = (target, halfX, halfZ, radius) => {
    target.moveTo(-halfX + radius, -halfZ);
    target.lineTo(halfX - radius, -halfZ);
    target.absarc(halfX - radius, -halfZ + radius, radius, -Math.PI / 2, 0, false);
    target.lineTo(halfX, halfZ - radius);
    target.absarc(halfX - radius, halfZ - radius, radius, 0, Math.PI / 2, false);
    target.lineTo(-halfX + radius, halfZ);
    target.absarc(-halfX + radius, halfZ - radius, radius, Math.PI / 2, Math.PI, false);
    target.lineTo(-halfX, -halfZ + radius);
    target.absarc(-halfX + radius, -halfZ + radius, radius, Math.PI, Math.PI * 1.5, false);
    return target;
  };
  const frame = (halfX, halfZ, bandWidth, radius) => {
    const outline = roundedRect(new THREE.Shape(), halfX, halfZ, radius);
    outline.holes.push(
      roundedRect(new THREE.Path(), halfX - bandWidth, halfZ - bandWidth, Math.max(radius - bandWidth, 0.2))
    );
    return outline;
  };
  padTrimGeometry = new THREE.ExtrudeGeometry(
    [frame(9.6, 6.4, 0.62, 1.3), frame(8.5, 5.4, 0.3, 0.9)],
    { bevelEnabled: false, depth: 0.12 }
  );
  padTrimGeometry.rotateX(-Math.PI / 2);
  return padTrimGeometry;
};

const addPad = (world, sampler, pad, index) => {
  const group = new THREE.Group();
  const { point, tangent } = sampler.pointAt(pad.progress, pad.side || 0);
  group.position.copy(point);
  group.position.y += 0.18;
  group.rotation.y = Math.atan2(tangent.x, tangent.z);
  group.userData.kind = 'boost-pad';
  group.userData.progress = pad.progress;
  group.userData.index = index;
  const variant = boostLabVariant();
  if (variant === 'v2') {
    // V2 "raised ramp slab": a visibly RAISED wedge with a bright lip bar —
    // reads as 3D road furniture from distance, not paint.
    const slab = new THREE.Mesh(new THREE.BoxGeometry(16.4, 1.7, 11.4), createBasicMaterial('#132033'));
    slab.rotation.x = -0.13;
    slab.position.y = 0.6;
    group.add(slab);
    const face = new THREE.Mesh(
      new THREE.BoxGeometry(15.2, 0.24, 10),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#19c8e8').multiplyScalar(1.7) })
    );
    face.rotation.x = -0.13;
    face.position.y = 1.52;
    group.add(face);
    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(15.6, 0.5, 0.7),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#eafcff').multiplyScalar(1.9) })
    );
    lip.position.set(0, 1.35, -5.2);
    group.add(lip);
    [-2.6, 0.4, 3.4].forEach((z, order) => {
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(2.7, 3.2, 3),
        new THREE.MeshBasicMaterial({ color: '#ecfeff', transparent: true })
      );
      arrow.position.set(0, 1.66 - (z + 0.4) * 0.128, z);
      arrow.rotation.set(Math.PI / 2 - 0.13, 0, Math.PI);
      arrow.scale.set(2, 1, 0.32);
      arrow.userData.chevronOrder = order;
      group.add(arrow);
    });
    addGlowSprite(group, '#2cd8f6', 18, 0.5, 2.2);
  } else if (variant === 'v3') {
    // V3 "light gate": the default pad plus side pylons and a glowing
    // crossbar overhead — visible over kart roofs and from far upstream.
    group.add(makeBox({ x: 16.4, y: 0.42, z: 10.6 }, { y: 0.04 }, createBasicMaterial('#0d1726')));
    const glowPanel = new THREE.Mesh(
      new THREE.BoxGeometry(14.8, 0.2, 9),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#0fa9cc').multiplyScalar(1.6) })
    );
    glowPanel.position.y = 0.34;
    group.add(glowPanel);
    [-2.9, 0, 2.9].forEach((z, order) => {
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(2.3, 2.7, 3),
        new THREE.MeshBasicMaterial({ color: '#ecfeff', transparent: true })
      );
      arrow.position.set(0, 0.56, z - 0.4);
      arrow.rotation.set(Math.PI / 2, 0, Math.PI);
      arrow.scale.set(1.7, 1, 0.3);
      arrow.userData.chevronOrder = order;
      group.add(arrow);
    });
    [-8.6, 8.6].forEach((x) => {
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 7.2, 8), createBasicMaterial('#16283e'));
      pylon.position.set(x, 3.6, 0);
      group.add(pylon);
    });
    const crossbar = new THREE.Mesh(
      new THREE.BoxGeometry(18.4, 0.7, 1.1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#38e8ff').multiplyScalar(1.8) })
    );
    crossbar.position.y = 7.4;
    crossbar.userData.chevronOrder = 1; // rides the shared pulse animation
    group.add(crossbar);
    addGlowSprite(group, '#2cd8f6', 22, 0.5, 7.4);
  } else {
    // DEFAULT: K7 authored rebuild of the W2 V1 "hot chevrons"
    // pick, matched to tmp/k7-item-lab/boost-pad.png
    // — three CHUNKY beveled chevrons with white-hot cores cooling to ember
    // down the bevels, framed by a glowing edge trim on a charcoal plate.
    // Same amber-hot identity + footprint as V1; chevronOrder still rides
    // the shared pulse. Pad cost DROPS 8→6 draw calls (?boostLab=1 'v1'
    // falls through here too; v2/v3 stay reachable for future rounds).
    group.add(makeBox({ x: 19.6, y: 0.42, z: 13.2 }, { y: 0.04 }, createBasicMaterial('#170b03')));
    const trim = new THREE.Mesh(
      getPadTrimGeometry(),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff9a2e').multiplyScalar(2.05) })
    );
    trim.position.y = 0.25;
    group.add(trim);
    [-2.55, 0.35, 3.25].forEach((z, order) => {
      const chevron = new THREE.Mesh(
        getHotChevronGeometry(),
        new THREE.MeshBasicMaterial({ transparent: true, vertexColors: true })
      );
      chevron.position.set(0, 0.26, z);
      chevron.userData.chevronOrder = order;
      group.add(chevron);
    });
    addGlowSprite(group, '#ffab3d', 20, 0.55, 1.8);
  }
  world.add(group);
  return group;
};

const makeWinterItemCrate = (accent = '#00E5FF') => {
  const crate = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: '#7EC8E8',
    emissive: '#00E5FF',
    emissiveIntensity: 0.35,
    flatShading: true,
    metalness: 0.08,
    opacity: 0.82,
    roughness: 0.28,
    transparent: true,
  });
  const body = new THREE.Mesh(new RoundedBoxGeometry(6.8, 6.8, 6.8, 1, 0.85), bodyMat);
  crate.add(body);
  const edgeMat = createBasicMaterial(accent, { emissive: accent, emissiveIntensity: 0.9 });
  [
    { size: [7.35, 0.32, 0.32], rotation: [0, 0, 0] },
    { size: [0.32, 7.35, 0.32], rotation: [0, 0, 0] },
  ].forEach(({ size, rotation }) => {
    const band = new THREE.Mesh(new THREE.BoxGeometry(...size), edgeMat);
    band.rotation.set(...rotation);
    crate.add(band);
  });
  crate.traverse((n) => {
    n.castShadow = true;
  });
  return crate;
};

// W2 owner picks (2026-07-07: "keep the bottom two in the game ... the
// icebox one for penguin city and the other for comeback city"): generated
// bitcoin item boxes, per track. The procedural winter crate mounts first
// and stays as the VISIBLE fallback until (unless) the GLB template
// resolves; load failures count into the same telemetry mounts guard the
// Miami set uses, so kart-playable fails loud on a 404.
const ITEM_BOX_ASSETS = {
  'comeback-city': itemBoxCcCoinUrl,
  'penguin-village': itemBoxPvIceUrl,
};
const itemBoxTemplateCache = new Map();
// Scratch transforms for the instanced coin field — one compose per face
// per frame, zero per-frame allocation. Collected coins park on a
// zero-scale pose (degenerate triangles rasterize nothing).
const coinPoseScratch = new THREE.Matrix4();
const COIN_UNIT_SCALE = new THREE.Vector3(1, 1, 1);
const COIN_COLLECTED_POSE = new THREE.Matrix4().makeScale(0, 0, 0);

const loadItemBoxTemplate = (url) => {
  if (!itemBoxTemplateCache.has(url)) {
    itemBoxTemplateCache.set(
      url,
      new Promise((resolve) => {
        createGameGltfLoader().load(
          url,
          (gltf) => resolve(gltf.scene),
          undefined,
          () => resolve(null)
        );
      })
    );
  }
  return itemBoxTemplateCache.get(url);
};

const addItemBox = (world, sampler, box, index, questionTexture) => {
  const group = new THREE.Group();
  const { point } = sampler.pointAt(box.progress, box.side || 0);
  group.position.copy(point);
  group.position.y += 4.9;
  group.userData.kind = 'item-box';
  group.userData.progress = box.progress;
  group.userData.index = index;
  const color = ITEM_BOX_COLORS[index % ITEM_BOX_COLORS.length];
  const crate = makeWinterItemCrate(color);
  crate.rotation.z = 0.42;
  crate.rotation.x = 0.3;
  crate.userData.kind = 'item-cube-fallback';
  group.add(crate);
  const question = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 4.4),
    new THREE.MeshBasicMaterial({
      depthWrite: false,
      map: questionTexture,
      side: THREE.DoubleSide,
      transparent: true,
    })
  );
  question.renderOrder = 22;
  question.userData.kind = 'item-question';
  group.add(question);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(5.1, 16, 8),
    new THREE.MeshBasicMaterial({
      color,
      depthWrite: false,
      opacity: 0.14,
      transparent: true,
    })
  );
  group.add(glow);
  addGlowSprite(group, color, 16, 0.45, 0);
  world.add(group);
  return group;
};

// Bold upward chevrons on a dark face — the ramp's "drive at me" billboard.
const makeRampFaceTexture = (base, chevron) => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 256);
  ctx.strokeStyle = chevron;
  ctx.lineWidth = 22;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  [196, 124, 52].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(22, y + 26);
    ctx.lineTo(64, y - 14);
    ctx.lineTo(106, y + 26);
    ctx.stroke();
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

// Trick ramp: a true wedge (triangular prism) whose sloped face is a glowing
// chevron billboard pointing up the launch, with a bright lip bar and corner
// pylons. The dare variant (carousel shortcut) is bigger, purple and gold —
// a visibly different decision.
const addRamp = (world, sampler, ramp, { dare = false } = {}) => {
  const accent = dare ? '#c879ff' : '#38d7ff';
  // K2.5 owner pick (c) 2026-07-11: trick ramps grow to cover the FULL
  // launch trigger (rampHitLane 0.22 ≈ 22 world units on a 50-wide road) —
  // you can no longer launch without visibly driving onto a wedge. The dare
  // ramp keeps its original footprint (it was already scaled up).
  const W = dare ? 21 : 22;
  const L = dare ? 26.6 : 24;
  const H = dare ? 7.28 : 5.8;
  const { point, tangent } = sampler.pointAt(ramp.progress, ramp.side);
  const group = new THREE.Group();
  group.position.copy(point);
  group.rotation.y = Math.atan2(tangent.x, tangent.z);
  group.userData.kind = dare ? 'dare-ramp' : 'trick-ramp';

  // Prism: ground back edge -> raised lip edge at +z (direction of travel).
  const half = W / 2;
  const positions = [
    -half, 0.12, -L / 2, half, 0.12, -L / 2, half, H, L / 2, -half, H, L / 2,
    -half, H, L / 2, half, H, L / 2, half, 0, L / 2, -half, 0, L / 2,
    -half, 0.12, -L / 2, -half, H, L / 2, -half, 0, L / 2,
    half, 0.12, -L / 2, half, 0, L / 2, half, H, L / 2,
  ];
  const uvs = [0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1];
  const indices = [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 8, 9, 10, 11, 12, 13];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const wedge = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      map: makeRampFaceTexture(dare ? '#241640' : '#13233f', dare ? '#ffd34f' : '#7ff4ff'),
    })
  );
  group.add(wedge);

  // Glowing lip bar on the launch edge.
  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.6, 0.7, 1.1),
    createBasicMaterial(accent, { emissive: accent, emissiveIntensity: 1.35 })
  );
  lip.position.set(0, H + 0.2, L / 2 - 0.4);
  group.add(lip);
  // Pylons with bright tips at the lip corners read from a long way out.
  [-1, 1].forEach((side) => {
    const pylon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.62, H + 4.4, 6),
      createBasicMaterial(accent, { emissive: accent, emissiveIntensity: 0.9 })
    );
    pylon.position.set(side * (half + 1.2), (H + 4.4) / 2, L / 2 - 0.4);
    group.add(pylon);
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 8, 6),
      createBasicMaterial('#f7fbff', { emissive: '#f7fbff', emissiveIntensity: 1.2 })
    );
    tip.position.set(side * (half + 1.2), H + 4.6, L / 2 - 0.4);
    group.add(tip);
  });
  addGlowSprite(group, accent, dare ? 22.4 : 17, 0.45, H + 1);
  world.add(group);
  return group;
};

// K2.5 owner pick (c): painted chevrons on the asphalt leading into every
// trick ramp — the launch cause must read BEFORE the kart is on it. All
// decals for a track merge into ONE mesh (PV runs one draw call from its
// 800 budget: 798 → 799).
const makeRoadChevronTexture = (accent) => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = accent;
  ctx.lineWidth = 26;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(20, 96);
  ctx.lineTo(64, 40);
  ctx.lineTo(108, 96);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const addRampApproachChevrons = (world, sampler, ramps) => {
  if (!ramps?.length) return;
  const positions = [];
  const uvs = [];
  const indices = [];
  const SIZE = 7.5;
  ramps.forEach((ramp) => {
    [26, 46, 66].forEach((backUnits) => {
      const progress = (ramp.progress - backUnits / sampler.length + 1) % 1;
      const { point, tangent } = sampler.pointAt(progress, ramp.side);
      const forward = tangent.clone().normalize().multiplyScalar(SIZE / 2);
      const right = new THREE.Vector3(forward.z, 0, -forward.x).normalize().multiplyScalar((SIZE / 2) * 0.9);
      const y = point.y + 0.42;
      const base = positions.length / 3;
      positions.push(
        point.x - right.x - forward.x, y, point.z - right.z - forward.z,
        point.x + right.x - forward.x, y, point.z + right.z - forward.z,
        point.x + right.x + forward.x, y, point.z + right.z + forward.z,
        point.x - right.x + forward.x, y, point.z - right.z + forward.z
      );
      uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const decals = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      depthWrite: false,
      map: makeRoadChevronTexture('#7ff4ff'),
      side: THREE.DoubleSide,
      transparent: true,
    })
  );
  decals.renderOrder = 2;
  decals.userData.kind = 'ramp-approach-chevrons';
  world.add(decals);
};

const addFinishGate = (world, sampler, trackDef, trackVisuals = resolveTrackVisuals(trackDef, { enabled: false })) => {
  const gateWidth = sampler.widthAt(0);
  // Schema colors and beacon/halo dressing are opt-in via ?trackVisuals=1;
  // flag-off keeps the simpler gate baseline for this presentation slice.
  const gateVisual = (trackVisuals.enabled && trackDef.visual?.finishGate) || {};
  const gateAccent = gateVisual.beacon || '#38d7ff';
  const gateHalo = gateVisual.halo || '#ffd34f';
  const gateTrim = gateVisual.trim || '#f8fbff';
  const group = new THREE.Group();
  const { point, tangent } = sampler.pointAt(0);
  group.position.copy(point);
  group.rotation.y = Math.atan2(tangent.x, tangent.z);
  group.userData.kind = 'finish-gate';
  // Tracks with their own start gantry (e.g. Penguin Village's arch) skip the
  // default overhead posts/board — only the ground checker line remains.
  if (!trackDef.dressing?.customStartArch) {
    const postMat = createBasicMaterial(gateTrim);
    const boardMat = createBasicMaterial('#16213e', { emissive: gateAccent, emissiveIntensity: 0.4 });
    const beaconMat = trackVisuals.enabled
      ? createBasicMaterial(gateAccent, { emissive: gateAccent, emissiveIntensity: 1.25 })
      : null;
    [-1, 1].forEach((side) => {
      const post = new THREE.Mesh(new RoundedBoxGeometry(2.2, 30, 2.2, 1, 0.5), postMat);
      post.position.set(side * gateWidth * 0.58, 15, 0);
      group.add(post);
      if (beaconMat) {
        const beacon = new THREE.Mesh(new THREE.DodecahedronGeometry(2.8, 0), beaconMat);
        beacon.position.set(side * gateWidth * 0.58, 31.4, 0);
        group.add(beacon);
        addGlowSprite(group, gateAccent, 16, 0.28, 31.4).position.x = side * gateWidth * 0.58;
      }
    });
    const board = new THREE.Mesh(new RoundedBoxGeometry(gateWidth * 1.25, 8.2, 3.2, 1, 0.9), boardMat);
    // Keep the board above the chase camera's max height so the camera never
    // clips through it when crossing the line.
    board.position.set(0, 32, 0);
    group.add(board);
    for (let x = -22; x <= 22; x += 7.4) {
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 2.3, 3.2),
        createBasicMaterial(Math.round(x / 7.4) % 2 === 0 ? '#f8fbff' : '#111827')
      );
      tile.position.set(x, 32.3, -1.8);
      group.add(tile);
    }
    if (trackVisuals.enabled) {
      const haloRing = new THREE.Mesh(
        new THREE.TorusGeometry(gateWidth * 0.46, 0.42, 8, 44),
        new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: gateHalo,
          depthWrite: false,
          opacity: 0.72,
          transparent: true,
        })
      );
      haloRing.position.set(0, 32, -2.25);
      haloRing.scale.y = 0.2;
      group.add(haloRing);
      const lowerGlow = new THREE.Mesh(
        new THREE.BoxGeometry(gateWidth * 1.02, 0.38, 1.2),
        createBasicMaterial(gateHalo, { emissive: gateHalo, emissiveIntensity: 1.05 })
      );
      lowerGlow.position.set(0, 27.6, -2.2);
      group.add(lowerGlow);
    }
  }
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 10; column += 1) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(gateWidth * 0.1, 0.06, 2.2),
        createBasicMaterial((column + row) % 2 === 0 ? '#f8fbff' : '#10151d')
      );
      stripe.position.set(
        -gateWidth * 0.45 + column * gateWidth * 0.1,
        0.14,
        row === 0 ? -1.15 : 1.15
      );
      group.add(setFlatTransform(stripe));
    }
  }
  world.add(group);
  return group;
};

// Buildings are anchored relative to one road point, but the route curves
// back on itself — a setback that clears its own road section can still sit
// on another one. Push outward along the anchor normal until the position
// clears the whole centerline; returns null when no clear spot exists (the
// caller must SKIP — a missing building beats one on the racing line, which
// is exactly what happened at the carousel entry, owner-reported 2026-06-12).
// Clearance covers road half (28) + building half (~27) + margin.
const minCenterlineDistance = (sampler, x, z) => {
  let minDistance = Infinity;
  for (let index = 0; index < TRACK_SAMPLES; index += 1) {
    const { center } = sampler.pointAt(index / TRACK_SAMPLES);
    const distance = Math.hypot(center.x - x, center.z - z);
    if (distance < minDistance) minDistance = distance;
  }
  return minDistance;
};

const clearBuildingPlacement = (sampler, basePoint, normal, side, startOffset, clearance = 68) => {
  const position = basePoint.clone();
  let offset = startOffset;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    position.copy(basePoint).addScaledVector(normal, side * offset);
    const minDistance = minCenterlineDistance(sampler, position.x, position.z);
    if (minDistance >= clearance) return position;
    offset += clearance - minDistance + 4;
  }
  return null;
};

// Stage 2 custom district palettes — coastal city art-deco/neon.
const CC_PALETTE = Object.freeze({
  cream: '#f6e7cc',
  coral: '#e98f6e',
  teal: '#6aaaa6',
  cyan: '#7ee7ff',
  navy: '#204052',
  gold: '#ffd34f',
  amber: '#ffb44f',
  concrete: '#c9c3b8',
  warmWhite: '#fff7e0',
  glass: '#fff8d6',
});

const makeSignLetters = (text, materials, { x = 0, y = 0, z = 0, scale = 1 }) => {
  const letters = new THREE.Group();
  letters.position.set(x, y, z);
  const letterMat = materials.gold;
  const spacing = 2.2 * scale;
  const width = text.length * spacing;
  letters.add(makeBox({ x: width + 2, y: 3.2 * scale, z: 0.6 * scale }, { y: 1.6 * scale }, materials.navy));
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    if (ch === ' ') continue;
    const lx = -width * 0.5 + spacing * 0.5 + index * spacing;
    letters.add(makeBox({ x: 1.2 * scale, y: 1.8 * scale, z: 0.25 * scale }, { x: lx, y: 1.6 * scale, z: 0.45 * scale }, letterMat));
  }
  mergeStaticMeshesByMaterial(letters);
  return letters;
};

const makePenguinStatue = (materials, height = 10) => {
  const g = new THREE.Group();
  const s = height / 10;
  const white = materials.cream;
  const dark = materials.navy;
  const beak = materials.coral;
  const pedestal = makeBox({ x: 5 * s, y: 2.4 * s, z: 5 * s }, { y: 1.2 * s }, materials.concrete);
  g.add(pedestal);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.4 * s, 3 * s, 5.8 * s, 10), dark);
  body.position.y = 4.1 * s;
  g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(2.2 * s, 10, 8), white);
  belly.scale.set(0.8, 1.25, 0.55);
  belly.position.set(0, 4.2 * s, 1.5 * s);
  g.add(belly);
  const head = new THREE.Mesh(new THREE.SphereGeometry(2.2 * s, 12, 9), dark);
  head.position.y = 7.8 * s;
  g.add(head);
  const beakMesh = new THREE.Mesh(new THREE.ConeGeometry(0.7 * s, 1.6 * s, 7), beak);
  beakMesh.rotation.x = Math.PI / 2;
  beakMesh.position.set(0, 7.6 * s, 2.2 * s);
  g.add(beakMesh);
  [-1, 1].forEach((side) => {
    const flipper = new THREE.Mesh(new THREE.SphereGeometry(0.9 * s, 6, 6), dark);
    flipper.scale.set(0.35, 1.4, 0.8);
    flipper.position.set(side * 2.8 * s, 4 * s, 0);
    g.add(flipper);
  });
  mergeStaticMeshesByMaterial(g);
  return g;
};

const makeArtDecoTower = (materials, { x = 0, z = 0, height = 55, width = 18, depth = 18, accent }) => {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const bodyMat = materials.cream;
  const trimMat = materials.navy;
  const accentMat = accent || materials.coral;
  // Stepped art-deco massing
  g.add(makeBox({ x: width, y: height * 0.55, z: depth }, { y: height * 0.275 }, bodyMat));
  g.add(makeBox({ x: width * 0.82, y: height * 0.3, z: depth * 0.82 }, { y: height * 0.55 + height * 0.15 }, bodyMat));
  g.add(makeBox({ x: width * 0.55, y: height * 0.15, z: depth * 0.55 }, { y: height * 0.85 + height * 0.075 }, bodyMat));
  // Window read is carried by the emissive cornice and material color;
  // separate window geometry is omitted to keep fragment overdraw low.
  // Cornice neon trim
  g.add(makeBox({ x: width + 1.2, y: 1.2, z: depth + 1.2 }, { y: height }, accentMat));
  // Rooftop antenna / spire
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.7, 8, 6), accentMat)).position.set(0, height + 4, 0);
  mergeStaticMeshesByMaterial(g);
  return g;
};

const makeRowBuilding = (materials, { x = 0, z = 0, width = 22, depth = 14, height = 30, accent }) => {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const bodyMat = materials.cream;
  const trimMat = materials.navy;
  const accentMat = accent || materials.coral;
  // Main block with real depth
  g.add(makeBox({ x: width, y: height, z: depth }, { y: height * 0.5 }, bodyMat));
  // Ground-floor storefront recess
  g.add(makeBox({ x: width - 1.2, y: 5.5, z: depth - 2 }, { y: 2.75, z: 1.1 }, trimMat));
  // Awning
  g.add(makeBox({ x: width - 2, y: 1.2, z: 3.2 }, { y: 6.2, z: depth * 0.5 + 1.6 }, accentMat));
  // Lit windows are omitted in effects-off; the emissive roofline/neon
  // accents and storefront recess give the block its night-city read.
  // Balconies
  const floors = Math.floor(height / 5.5);
  for (let floor = 2; floor < floors; floor += 2) {
    g.add(makeBox({ x: width - 1.6, y: 0.6, z: 2.2 }, { y: 3.2 + floor * 4.8, z: depth * 0.5 + 1.1 }, trimMat));
  }
  // Rooftop AC / trim
  g.add(makeBox({ x: 4, y: 2.2, z: 3.2 }, { y: height + 1.1, z: -depth * 0.2 }, trimMat));
  // Neon tube accent along roofline
  g.add(makeBox({ x: width + 0.6, y: 0.5, z: 0.6 }, { y: height + 0.25, z: depth * 0.5 + 0.3 }, accentMat));
  mergeStaticMeshesByMaterial(g);
  return g;
};

const makeStreetLamp = (materials, { x = 0, z = 0 }) => {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 7.5, 6), materials.navy);
  post.position.y = 3.75;
  g.add(post);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), materials.cyan);
  globe.position.y = 8;
  g.add(globe);
  // Street-lamp glow is carried by the emissive globe material in effects-off
  // to keep transparent overdraw low; the sprite is omitted here.
  mergeStaticMeshesByMaterial(g);
  return g;
};

const buildIcePlazaDistrict = (group, district, roadLocalZ, roadWidth, materials) => {
  const cream = materials.cream;
  const coral = materials.coral;
  const teal = materials.teal;
  const cyan = materials.cyan;
  const navy = materials.navy;
  const gold = materials.gold;
  const concrete = materials.concrete;

  // 1. Start gantry / arch spanning the road at start-line height
  const pillarZLeft = roadLocalZ - 34;
  const pillarZRight = roadLocalZ + 34;
  [-1, 1].forEach((side) => {
    const pz = side === -1 ? pillarZLeft : pillarZRight;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 22, 6), cream);
    pillar.position.set(0, 11, pz);
    group.add(pillar);
    group.add(makeBox({ x: 1, y: 22, z: 0.8 }, { x: 2.5, y: 11, z: pz }, teal));
    group.add(makeBox({ x: 1, y: 22, z: 0.8 }, { x: -2.5, y: 11, z: pz }, coral));
  });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(34, 2.2, 6, 16, Math.PI), coral);
  arch.rotation.y = -Math.PI / 2;
  arch.position.set(0, 22, roadLocalZ);
  group.add(arch);
  group.add(makeBox({ x: 1, y: 1, z: 66 }, { y: 22, z: roadLocalZ }, teal));
  // Sign board
  group.add(makeSignLetters('COMEBACK CITY', materials, { y: 24.8, z: roadLocalZ, scale: 1.15 }));

  // 2. Grandstands on both sides
  const buildStand = (baseZ, direction, length = 50) => {
    const stand = new THREE.Group();
    const rows = 3;
    const rowDepth = 3;
    const rowHeight = 1.2;
    const dotGeom = new THREE.CapsuleGeometry(0.35, 0.6, 4, 6);
    for (let row = 0; row < rows; row += 1) {
      const z = baseZ + direction * row * rowDepth;
      stand.add(makeBox({ x: length, y: rowHeight, z: rowDepth + 0.2 }, { y: row * rowHeight + rowHeight * 0.5, z: z + direction * rowDepth * 0.5 }, concrete));
      // Crowd dots — fewer, shared materials
      for (let seat = -length * 0.4; seat <= length * 0.4; seat += 4.2) {
        const colorMat = (seat + row) % 3 === 0 ? coral : (seat + row) % 3 === 1 ? teal : gold;
        const dot = new THREE.Mesh(dotGeom, colorMat);
        dot.position.set(seat, row * rowHeight + 1.1, z + direction * 0.8);
        stand.add(dot);
      }
    }
    return stand;
  };
  const standNear = buildStand(roadLocalZ + 26, 1, 56);
  mergeStaticMeshesByMaterial(standNear);
  group.add(standNear);
  const standFar = buildStand(roadLocalZ - 26, -1, 56);
  mergeStaticMeshesByMaterial(standFar);
  group.add(standFar);

  // 3. Paddock / sponsor garages behind near stand
  const garageZ = 62;
  const bayCount = 4;
  const bayWidth = 15;
  for (let bay = 0; bay < bayCount; bay += 1) {
    const bx = -22.5 + bay * bayWidth;
    const bayGroup = new THREE.Group();
    bayGroup.position.set(bx, 0, garageZ);
    bayGroup.add(makeBox({ x: bayWidth - 0.6, y: 11, z: 22 }, { y: 5.5 }, cream));
    bayGroup.add(makeBox({ x: bayWidth - 0.4, y: 0.8, z: 22.4 }, { y: 11.4 }, teal));
    // Rollup door
    bayGroup.add(makeBox({ x: 8, y: 7, z: 0.4 }, { y: 3.5, z: 11.2 }, navy));
    for (let stripe = 0; stripe < 3; stripe += 1) {
      bayGroup.add(makeBox({ x: 8.1, y: 0.28, z: 0.5 }, { y: 1 + stripe * 2.2, z: 11.3 }, cream));
    }
    // Sponsor logo panel
    const sponsorColors = [coral, teal, gold, cyan];
    const logoColor = sponsorColors[bay % sponsorColors.length];
    bayGroup.add(makeBox({ x: 6, y: 2.6, z: 0.3 }, { y: 9, z: 11.3 }, logoColor));
    // Simple geometric symbol
    bayGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.3, 6), navy)).rotation.x = Math.PI / 2;
    mergeStaticMeshesByMaterial(bayGroup);
    group.add(bayGroup);
  }

  // 4. Timing tower near start line off road
  const towerX = -38;
  const towerZ = roadLocalZ + 42;
  const tower = new THREE.Group();
  tower.position.set(towerX, 0, towerZ);
  tower.add(makeBox({ x: 6, y: 34, z: 6 }, { y: 17 }, cream));
  tower.add(makeBox({ x: 6.6, y: 1, z: 6.6 }, { y: 20 }, teal));
  // Display board "LAP 1/3"
  tower.add(makeBox({ x: 14, y: 4.5, z: 1.2 }, { y: 26, z: 3.1 }, navy));
  tower.add(makeBox({ x: 2.2, y: 2.2, z: 0.2 }, { x: -4.2, y: 26, z: 3.8 }, coral)); // L
  tower.add(makeBox({ x: 2.2, y: 2.2, z: 0.2 }, { x: -1.4, y: 26, z: 3.8 }, gold)); // A
  tower.add(makeBox({ x: 2.2, y: 2.2, z: 0.2 }, { x: 1.4, y: 26, z: 3.8 }, teal)); // P
  tower.add(makeBox({ x: 2.2, y: 2.2, z: 0.2 }, { x: 4.2, y: 26, z: 3.8 }, cyan)); // 1/3ish
  tower.add(makeBox({ x: 2.8, y: 0.35, z: 0.25 }, { x: 4.2, y: 26.7, z: 3.8 }, navy));
  tower.add(makeBox({ x: 0.35, y: 2.2, z: 0.25 }, { x: 4.2, y: 26, z: 3.8 }, navy));
  mergeStaticMeshesByMaterial(tower);
  group.add(tower);

  // 5. Starting lights gantry on left side of road
  const lightsX = 0;
  const lightsZ = roadLocalZ - 22;
  const lightPole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 12, 6), navy);
  lightPole.position.set(lightsX, 6, lightsZ);
  group.add(lightPole);
  group.add(makeBox({ x: 5, y: 0.8, z: 1.5 }, { x: lightsX, y: 12, z: lightsZ }, navy));
  const lightColors = [coral, coral, teal];
  for (let index = 0; index < 3; index += 1) {
    const mat = lightColors[index];
    const ly = 10.5 - index * 2.6;
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.85, 6, 4), mat);
    light.position.set(lightsX, ly, lightsZ + 0.9);
    group.add(light);
  }
  // Gantry glow comes from the emissive light spheres; no extra sprite.

  // 6. Flags along grandstands
  const flagColors = [coral, teal, cyan, gold];
  [-1, 1].forEach((side) => {
    const baseZ = side === 1 ? roadLocalZ + 28 : roadLocalZ - 28;
    for (let index = 0; index < 4; index += 1) {
      const fx = -18 + index * 12;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 8, 5), navy);
      pole.position.set(fx, 4, baseZ + side * 2);
      group.add(pole);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.15), flagColors[index % flagColors.length]);
      flag.position.set(fx + 1.2, 7.2, baseZ + side * 2);
      group.add(flag);
    }
  });

  // 7. Penguin hero statue on plaza center island
  const statue = makePenguinStatue(materials, 8);
  statue.position.set(0, 0, roadLocalZ + 8);
  group.add(statue);
  // Penguin statue group is already merged inside makePenguinStatue.
  // (No ground glow disc — saves a transparent draw call in effects-off.)
};

const buildNeonDowntownDistrict = (group, district, roadLocalZ, roadWidth, materials) => {
  const accent = createBasicMaterial(district.accent, { emissive: district.accent, emissiveIntensity: 0.85 });
  // Landmark corner tower — tallest, slightly further back so it reads from multiple angles
  group.add(makeArtDecoTower(materials, { x: -18, z: 28, height: 68, width: 20, depth: 20, accent }));
  // Glowing sign face on the tower
  const signFace = makeBox({ x: 12, y: 7, z: 0.6 }, { x: -18, y: 58, z: 38.3 }, accent);
  group.add(signFace);
  // Row buildings along the road
  group.add(makeRowBuilding(materials, { x: 16, z: 18, width: 20, depth: 16, height: 32, accent }));
  group.add(makeRowBuilding(materials, { x: -42, z: 20, width: 18, depth: 14, height: 28, accent }));
  // One building across the road to frame the corner
  group.add(makeRowBuilding(materials, { x: 10, z: roadLocalZ - 38, width: 24, depth: 16, height: 34, accent }));
  // Street lamps and planters
  for (let index = 0; index < 3; index += 1) {
    const lx = -26 + index * 26;
    group.add(makeStreetLamp(materials, { x: lx, z: roadLocalZ + 18 }));
    const planter = makeBox({ x: 4.5, y: 1.6, z: 4.5 }, { x: lx + 8, y: 0.8, z: roadLocalZ + 18 }, materials.concrete);
    group.add(planter);
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4, 0), materials.teal);
    bush.position.set(lx + 8, 3, roadLocalZ + 18);
    group.add(bush);
  }
};

const addDistrictsAndProps = (world, sampler, loader, trackDef, trackVisuals = resolveTrackVisuals(trackDef, { enabled: false })) => {
  const roadWidth = trackDef.course.mainRoadWidth || 50;
  const propMat = {
    cone: createBasicMaterial(CC_PALETTE.coral, { emissive: CC_PALETTE.coral, emissiveIntensity: 0.25 }),
    lamp: createBasicMaterial(CC_PALETTE.cyan, { emissive: CC_PALETTE.cyan, emissiveIntensity: 1.1 }),
    planter: createBasicMaterial(CC_PALETTE.teal),
    trunk: createBasicMaterial('#70452a'),
    leaf: createBasicMaterial('#5ac4a8'),
    tire: createBasicMaterial('#151923'),
    barrier: createBasicMaterial('#263241'),
    bush: createBasicMaterial('#4a9d8f'),
  };
  let propCount = 0;
  const generatedTrackside =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('glbTrackside') === '1';

  // Shared Stage 2 district materials (reused across authored districts)
  const ccMaterials = {
    cream: createBasicMaterial(CC_PALETTE.cream, { emissive: CC_PALETTE.cream, emissiveIntensity: 0.06 }),
    coral: createBasicMaterial(CC_PALETTE.coral, { emissive: CC_PALETTE.coral, emissiveIntensity: 0.45 }),
    teal: createBasicMaterial(CC_PALETTE.teal, { emissive: CC_PALETTE.teal, emissiveIntensity: 0.35 }),
    cyan: createBasicMaterial(CC_PALETTE.cyan, { emissive: CC_PALETTE.cyan, emissiveIntensity: 0.65 }),
    navy: createBasicMaterial(CC_PALETTE.navy),
    gold: createBasicMaterial(CC_PALETTE.gold, { emissive: CC_PALETTE.gold, emissiveIntensity: 0.55 }),
    amber: createBasicMaterial(CC_PALETTE.amber, { emissive: CC_PALETTE.amber, emissiveIntensity: 0.4 }),
    concrete: createBasicMaterial(CC_PALETTE.concrete),
    warmWhite: createBasicMaterial(CC_PALETTE.warmWhite, { emissive: CC_PALETTE.warmWhite, emissiveIntensity: 0.3 }),
    glass: createBasicMaterial(CC_PALETTE.glass, { emissive: CC_PALETTE.glass, emissiveIntensity: 0.28 }),
  };

  trackDef.course.districtAnchors.forEach((district, districtIndex) => {
    const { normal, point, tangent } = sampler.pointAt(district.progress);
    const placement = clearBuildingPlacement(sampler, point, normal, district.side, district.setback * 0.82);
    if (!placement) return;
    const group = new THREE.Group();
    group.position.copy(placement);
    group.rotation.y = Math.atan2(tangent.x, tangent.z) + (district.side > 0 ? -Math.PI / 2 : Math.PI / 2);
    group.userData.kind = `district-${district.key}`;
    // Local Z of the road center in this group's coordinate space (negative).
    const roadLocalZ = point.clone().sub(placement).dot(normal) * district.side;
    // Stage 2 authored kits for the first two districts; generic volumetric
    // placeholder for the rest. ?glbTrackside=1 restores generated GLB mounts.
    if (generatedTrackside) {
      mountMiamiAsset(group, MIAMI_DISTRICT_ASSETS[districtIndex % MIAMI_DISTRICT_ASSETS.length], {
        footprint: 40,
        z: 6,
      });
    } else if (district.key === 'ice-plaza') {
      buildIcePlazaDistrict(group, district, roadLocalZ, roadWidth, ccMaterials);
    } else if (district.key === 'neon-downtown') {
      buildNeonDowntownDistrict(group, district, roadLocalZ, roadWidth, ccMaterials);
    } else {
      const bodyPalette = ['#f3d4bd', '#e98f6e', '#76b7b2', '#f6e7cc', '#5d8aa8'];
      const trimPalette = ['#f8fbff', '#204052', '#2f6f73'];
      const bodyColor = bodyPalette[districtIndex % bodyPalette.length];
      const trimColor = trimPalette[districtIndex % trimPalette.length];
      const bodyMat = createBasicMaterial(bodyColor, { emissive: bodyColor, emissiveIntensity: 0.04 });
      const trimMat = createBasicMaterial(trimColor);
      const roofMat = createBasicMaterial(district.dark || '#204052');
      const bodyHeight = 25 + (districtIndex % 3) * 5;
      const paneMat = createBasicMaterial('#f7f1c8', { emissive: '#ffd58a', emissiveIntensity: 0.22 });
      group.add(makeRoundedBox({ x: 30, y: bodyHeight, z: 18 }, { y: bodyHeight / 2, z: 2 }, bodyMat, 1.2));
      group.add(makeBox({ x: 24, y: 4, z: 20 }, { y: bodyHeight + 2, z: 2 }, roofMat));
      group.add(makeBox({ x: 18, y: 8, z: 14 }, { y: bodyHeight + 8, z: -1 }, trimMat));
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          if ((row + col + districtIndex) % 4 === 0) continue;
          group.add(makeBox(
            { x: 2.4, y: 1.7, z: 0.2 },
            { x: -9 + col * 6, y: 8 + row * 5, z: -7.12 },
            paneMat
          ));
        }
      }
    }
    // Standing neon arch doorway (volumetric portal only — no card-like plane).
    const accent = createBasicMaterial(district.accent, { emissive: district.accent, emissiveIntensity: 1.25 });
    const portal = new THREE.Mesh(new THREE.TorusGeometry(7.8, 1.05, 8, 22, Math.PI), accent);
    portal.position.set(0, 8.2, -10.9);
    group.add(portal);
    [-1, 1].forEach((side) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 8.2, 8), accent);
      post.position.set(side * 7.8, 4.1, -10.9);
      group.add(post);
    });
    // Portal glow is omitted in effects-off; the emissive torus/post materials
    // and the small beacon column carry the neon read.
    // Replace the generic floating dodecahedron beacon with a small volumetric column.
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 6.5, 8), accent);
    beacon.position.set(0, 15, 0);
    group.add(beacon);
    // Draw-call diet: every district facade/portal mesh is static — fold them
    // into one mesh per material (sprites stay live for the additive glow).
    mergeStaticMeshesByMaterialDeep(group);
    world.add(group);
    propCount += 1;
    // Roadside district cue posts are ?trackVisuals=1 dressing (they also
    // inflate propCount telemetry, so the gate keeps flag-off telemetry equal).
    if (!trackVisuals.enabled) return;
    const cuePosition = point.clone().addScaledVector(normal, district.side * (sampler.widthAt(district.progress) * 0.5 + 16));
    if (minCenterlineDistance(sampler, cuePosition.x, cuePosition.z) >= roadWidth * 0.58) {
      const cue = new THREE.Group();
      cue.position.copy(cuePosition);
      cue.rotation.y = Math.atan2(tangent.x, tangent.z) + (district.side > 0 ? -Math.PI / 2 : Math.PI / 2);
      cue.userData.kind = `district-${district.key}-road-cue`;
      const cueMat = createBasicMaterial(district.accent, { emissive: district.accent, emissiveIntensity: 1.15 });
      const darkMat = createBasicMaterial(district.dark);
      [-1, 1].forEach((postSide) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 8.6, 6), cueMat);
        post.position.set(postSide * 4.2, 4.3, 0);
        cue.add(post);
      });
      const base = makeRoundedBox({ x: 11.5, y: 1.2, z: 2.1 }, { y: 0.6 }, darkMat, 0.35);
      cue.add(base);
      const crest = new THREE.Mesh(new THREE.DodecahedronGeometry(2.1, 0), cueMat);
      crest.position.y = 9.8;
      cue.add(crest);
      addGlowSprite(cue, district.accent, 14, 0.32, 5.4);
      world.add(setFlatTransform(cue));
      propCount += 1;
    }
  });

  // Roadside scatter (trees / lamps / cones / planters / barriers) is comeback-city
  // neon-district dressing — opt-in; new tracks bring their own props.
  if (trackDef.dressing?.roadsideProps) for (let index = 0; index < 24; index += 1) {
    const progress = (0.035 + index * 0.041) % 1;
    const side = index % 2 === 0 ? -1 : 1;
    const { normal, point, tangent } = sampler.pointAt(progress);
    const group = new THREE.Group();
    group.position.copy(point).addScaledVector(normal, side * (sampler.widthAt(progress) * 0.82 + (index % 3) * 9));
    // The anchor's own road section is cleared by construction, but the
    // route folds back on itself — skip props that land on another section.
    if (minCenterlineDistance(sampler, group.position.x, group.position.z) < roadWidth * 0.62) continue;
    group.rotation.y = Math.atan2(tangent.x, tangent.z);
    const variant = index % 6;
    if (variant === 0) {
      group.add(makeBox({ x: 2, y: 7, z: 2 }, { y: 3.5 }, propMat.trunk));
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(5.2, 0), propMat.leaf);
      crown.position.y = 9.6;
      group.add(crown);
    } else if (variant === 1) {
      group.add(makeBox({ x: 2, y: 10, z: 2 }, { y: 5 }, propMat.barrier));
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), propMat.lamp);
      lamp.position.y = 11.5;
      group.add(lamp);
      addGlowSprite(group, CC_PALETTE.cyan, 11, 0.5, 11.5);
    } else if (variant === 2) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.5, 6.8, 4), propMat.cone);
      cone.position.y = 3.4;
      group.add(cone);
    } else if (variant === 3) {
      group.add(makeBox({ x: 7.2, y: 2.4, z: 4.8 }, { y: 1.2 }, propMat.planter));
      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(3.6, 0), propMat.bush);
      bush.position.y = 4.4;
      group.add(bush);
    } else if (variant === 4) {
      group.add(makeBox({ x: 8, y: 1.4, z: 2.4 }, { y: 0.7 }, propMat.barrier));
      group.add(makeBox({ x: 0.8, y: 3.2, z: 0.8 }, { y: 1.6 }, propMat.barrier));
    } else {
      group.add(makeBox({ x: 2.2, y: 9, z: 2.2 }, { y: 4.5 }, propMat.trunk));
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(4.2, 0), propMat.leaf);
      crown.position.y = 8.5;
      group.add(crown);
    }
    group.userData.kind = 'roadside-v2-prop';
    mergeStaticMeshesByMaterial(group);
    world.add(group);
    propCount += 1;
  }

  if (trackDef.dressing?.roadsideProps) for (let index = 0; index < 7; index += 1) {
    const progress = (0.12 + index * 0.12) % 1;
    const side = index % 2 === 0 ? -1 : 1;
    const { normal, point } = sampler.pointAt(progress);
    const stack = new THREE.Group();
    stack.position.copy(point).addScaledVector(normal, side * sampler.widthAt(progress) * 0.74);
    if (minCenterlineDistance(sampler, stack.position.x, stack.position.z) < roadWidth * 0.62) continue;
    for (let tier = 0; tier < 3; tier += 1) {
      const tire = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.72, 6, 14), propMat.tire);
      tire.position.y = 1 + tier * 1.1;
      tire.rotation.x = Math.PI / 2;
      stack.add(tire);
    }
    mergeStaticMeshesByMaterial(stack);
    world.add(stack);
    propCount += 1;
  }

  trackDef.course.sceneryAnchors.forEach((anchor) => {
    if (anchor.kind === 'water') {
      const water = new THREE.Mesh(
        new THREE.BoxGeometry(anchor.w, 0.4, anchor.d),
        createBasicMaterial(anchor.color, { emissive: anchor.color, emissiveIntensity: 0.24 })
      );
      water.position.set(anchor.x, -0.01, anchor.z);
      world.add(setFlatTransform(water));
    }
    // 'skyline' anchors are ignored since the W0 promotion: the painted
    // backdrop rings replaced the old 14-box procedural skyline row for
    // good (owner 2026-07-07: "get rid of the old building so we just
    // keep the new theme").
  });

  // Optional generated trackside capture: city-lab set fills the opening
  // straight and dresses the roadside with palms, lifeguard towers, and the
  // diner. CC-only (openingFacades dressing).
  if (generatedTrackside && trackDef.dressing?.openingFacades) {
    addMiamiTrackside(world, sampler, roadWidth);
  }
  // Penguin Village tribute dressing rides the same opt-in generated gate.
  if (generatedTrackside && trackDef.dressing?.penguinVillage) {
    addPvTributeTrackside(world, sampler, roadWidth);
  }

  return propCount;
};

// ---- Penguin Village dressing: the arctic/ordinal identity --------------
// Procedural for now (no async GLB dependency); the giant statues read
// clearly as penguins. Owner can later swap real ordinal GLBs into the
// statue mounts. All unlit/toon, no shadow casters — cheap.
const makeIcePenguin = (height) => {
  const g = new THREE.Group();
  const s = height / 10;
  const ice = createToonMaterial('#dcebf6', { emissive: '#9fcfe6', emissiveIntensity: 0.3 });
  const belly = createToonMaterial('#f6fbff', { emissive: '#d8ecf6', emissiveIntensity: 0.25 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.6 * s, 3.2 * s, 6.4 * s, 10), ice);
  body.position.y = 3.4 * s;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(2.5 * s, 12, 9), ice);
  head.position.y = 7.6 * s;
  g.add(head);
  const bellyMesh = new THREE.Mesh(new THREE.SphereGeometry(2.2 * s, 10, 8), belly);
  bellyMesh.scale.set(0.82, 1.3, 0.6);
  bellyMesh.position.set(0, 3.7 * s, 1.7 * s);
  g.add(bellyMesh);
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.7 * s, 2 * s, 7),
    createBasicMaterial('#ff9a2e', { emissive: '#ff7d1f', emissiveIntensity: 0.4 })
  );
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 7.4 * s, 2.5 * s);
  g.add(beak);
  [-1, 1].forEach((side) => {
    const flipper = new THREE.Mesh(new THREE.SphereGeometry(1 * s, 6, 6), ice);
    flipper.scale.set(0.4, 1.6, 0.85);
    flipper.position.set(side * 3 * s, 3.6 * s, 0);
    g.add(flipper);
  });
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

const makeIceStatue = (height) => {
  const g = new THREE.Group();
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(height * 0.34, height * 0.42, height * 0.4, 8),
    createToonMaterial('#bcd9ec', { emissive: '#8fc0db', emissiveIntensity: 0.2 })
  );
  pedestal.position.y = height * 0.2;
  g.add(pedestal);
  const penguin = makeIcePenguin(height * 0.78);
  penguin.position.y = height * 0.4;
  g.add(penguin);
  addGlowSprite(g, '#bfeaff', height * 0.9, 0.22, height * 0.55);
  return g;
};

const makeIgloo = (radius) => {
  const g = new THREE.Group();
  const snow = createToonMaterial('#eef6fb', { emissive: '#cfe4f0', emissiveIntensity: 0.18 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), snow);
  g.add(dome);
  const entrance = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.7, radius * 0.6, radius * 0.7), snow);
  entrance.position.set(0, radius * 0.3, radius * 0.92);
  g.add(entrance);
  const hole = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.26, 12),
    createBasicMaterial('#0a1622')
  );
  hole.position.set(0, radius * 0.32, radius * 1.28);
  g.add(hole);
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

// Jagged background iceberg — a tall faceted ice peak with a bright cap.
const makeIceberg = (height) => {
  const g = new THREE.Group();
  const ice = createToonMaterial('#cfe6f5', { emissive: '#7fb8d8', emissiveIntensity: 0.22 });
  const main = new THREE.Mesh(new THREE.ConeGeometry(height * 0.5, height, 5), ice);
  main.position.y = height / 2;
  g.add(main);
  const secondary = new THREE.Mesh(new THREE.ConeGeometry(height * 0.32, height * 0.6, 5), ice);
  secondary.position.set(height * 0.42, height * 0.3, height * 0.18);
  secondary.rotation.y = 0.6;
  g.add(secondary);
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(height * 0.18, height * 0.28, 5),
    createBasicMaterial('#eafaff', { emissive: '#bfeaff', emissiveIntensity: 0.55 })
  );
  cap.position.y = height * 0.86;
  g.add(cap);
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

// Small real-colored penguin (spectator/waddler) — black/white with a beak.
const makePenguinSpectator = (s = 1.1) => {
  const g = new THREE.Group();
  const black = createToonMaterial('#222d3f');
  const white = createToonMaterial('#f4f8ff');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1 * s, 1.3 * s, 2.6 * s, 8), black);
  body.position.y = 1.5 * s;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1 * s, 8, 6), black);
  head.position.y = 3.3 * s;
  g.add(head);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.9 * s, 8, 6), white);
  belly.scale.set(0.8, 1.2, 0.55);
  belly.position.set(0, 1.7 * s, 0.7 * s);
  g.add(belly);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.28 * s, 0.7 * s, 6), createBasicMaterial('#ff9a2e'));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 3.2 * s, 1 * s);
  g.add(beak);
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

// Slogan banner texture matching the owner's reference: teal radial panel,
// inset glowing border, and glowing white brushy text. The white outer frame
// is geometry (built around this panel in the arch).
const makeSloganTexture = (text) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(512, 128, 40, 512, 128, 640);
  grad.addColorStop(0, '#1f6480');
  grad.addColorStop(1, '#0b2c40');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 256);
  // Inset glowing border.
  ctx.strokeStyle = 'rgba(206,240,255,0.92)';
  ctx.lineWidth = 6;
  ctx.shadowColor = '#bfeaff';
  ctx.shadowBlur = 18;
  ctx.strokeRect(28, 28, 968, 200);
  // Glowing white text — heavy condensed font + double-pass halo to read as
  // the reference's brushy glow.
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 italic 150px "Trebuchet MS", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(150,220,255,0.95)';
  ctx.shadowBlur = 30;
  ctx.fillText(text, 512, 142);
  ctx.shadowBlur = 14;
  ctx.fillText(text, 512, 142);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

// ---- Penguin Village track dressing props (Phase 3) ------------------------

const makeFishCrate = (size = 1) => {
  const g = new THREE.Group();
  const wood = createToonMaterial('#9c6b3c');
  const metal = createToonMaterial('#b8d4e8');
  g.add(makeRoundedBox({ x: 6 * size, y: 5 * size, z: 6 * size }, { y: 2.5 * size }, wood, 0.45 * size));
  // Metal corner brackets and bands.
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
    g.add(makeBox({ x: 1.1 * size, y: 5.2 * size, z: 1.1 * size }, { x: sx * 2.9 * size, y: 2.6 * size, z: sz * 2.9 * size }, metal));
  });
  [-1, 1].forEach((sz) => {
    g.add(makeBox({ x: 6.2 * size, y: 1 * size, z: 1.1 * size }, { y: (sz > 0 ? 4.8 : 0.4) * size, z: sz * 2.9 * size }, metal));
    g.add(makeBox({ x: 1.1 * size, y: 1 * size, z: 6.2 * size }, { x: -2.9 * size, y: (sz > 0 ? 4.8 : 0.4) * size, z: 0 }, metal));
    g.add(makeBox({ x: 1.1 * size, y: 1 * size, z: 6.2 * size }, { x: 2.9 * size, y: (sz > 0 ? 4.8 : 0.4) * size, z: 0 }, metal));
  });
  // Simple fish emblem on the front face.
  const emblem = new THREE.Group();
  const fishBody = new THREE.Mesh(new THREE.SphereGeometry(1.1 * size, 8, 6), createBasicMaterial('#F5F8FF'));
  fishBody.scale.set(1.3, 1, 0.55);
  emblem.add(fishBody);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.65 * size, 1.3 * size, 4), createBasicMaterial('#F5F8FF'));
  tail.rotation.z = -Math.PI / 2;
  tail.position.set(-1.5 * size, 0, 0);
  emblem.add(tail);
  emblem.position.set(0, 2.5 * size, 3.05 * size);
  g.add(emblem);
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

const makeMarketStall = () => {
  const g = new THREE.Group();
  const wood = createToonMaterial('#9c6b3c');
  const snow = createToonMaterial('#F5F8FF');
  const blue = createToonMaterial('#00E5FF');
  const white = createToonMaterial('#F5F8FF');
  // Counter and back panel.
  g.add(makeRoundedBox({ x: 11, y: 3.6, z: 6 }, { y: 1.8 }, wood, 0.35));
  g.add(makeBox({ x: 11, y: 5, z: 1 }, { y: 5.8, z: -2.6 }, wood));
  // Corner posts.
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 8, 8), wood);
    post.position.set(sx * 5, 4, sz * 2.6);
    g.add(post);
  });
  // Roof frame and striped awning.
  g.add(makeBox({ x: 12.4, y: 0.5, z: 7.2 }, { y: 8.1 }, wood));
  for (let i = 0; i < 4; i += 1) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.4, 7.6), i % 2 === 0 ? blue : white);
    stripe.position.set(-4.65 + i * 3.1, 7.6, 0.4);
    stripe.rotation.z = 0.18;
    g.add(stripe);
  }
  // Snow cap on the roof.
  g.add(makeBox({ x: 12.8, y: 0.9, z: 7.6 }, { y: 8.7 }, snow));
  // A fish crate displayed on the counter.
  const crate = makeFishCrate(0.35);
  crate.position.set(0, 3.6, 0);
  g.add(crate);
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

const makeFishBarrel = () => {
  const g = new THREE.Group();
  const wood = createToonMaterial('#9c6b3c');
  const metal = createToonMaterial('#7EC8E8');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 5.6, 12), wood);
  body.position.y = 2.8;
  g.add(body);
  [1.0, 4.6].forEach((y) => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(2.42, 0.22, 6, 16), metal);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    g.add(band);
  });
  // Fish emblem.
  const emblem = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), createBasicMaterial('#F5F8FF'));
  emblem.scale.set(1.3, 0.9, 0.35);
  emblem.position.set(0, 2.8, 2.45);
  g.add(emblem);
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

const makeCannerySignTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b2c40';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#F5A623';
  ctx.font = '900 74px "Arial Black", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SARDINE', 256, 92);
  ctx.font = '900 56px "Arial Black", Arial, sans-serif';
  ctx.fillText('CANNERY', 256, 172);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const makeCannerySign = () => {
  const g = new THREE.Group();
  const frame = createToonMaterial('#8b5a2b');
  const snow = createToonMaterial('#F5F8FF');
  // Posts.
  [-1, 1].forEach((sx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 10, 8), frame);
    post.position.set(sx * 8, 5, 0);
    g.add(post);
  });
  // Board and sign face.
  const board = new THREE.Mesh(new RoundedBoxGeometry(18, 7, 0.8, 1, 0.4), frame);
  board.position.set(0, 7.5, 0);
  g.add(board);
  const faceMat = new THREE.MeshBasicMaterial({ map: makeCannerySignTexture() });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(16, 5.6), faceMat);
  face.position.set(0, 7.5, 0.45);
  g.add(face);
  const faceBack = face.clone();
  faceBack.position.z = -0.45;
  faceBack.rotation.y = Math.PI;
  g.add(faceBack);
  // Snow cap.
  g.add(makeBox({ x: 18.6, y: 0.8, z: 1.2 }, { y: 11.1 }, snow));
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

const makeSnowyLampPost = () => {
  const g = new THREE.Group();
  const poleMat = createToonMaterial('#4a5568');
  const snowMat = createToonMaterial('#F5F8FF');
  const amber = createBasicMaterial('#F5A623', { emissive: '#FFD34F', emissiveIntensity: 0.9 });
  // Pole and base.
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 11, 8), poleMat);
  pole.position.y = 5.5;
  g.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 1.2, 8), poleMat);
  base.position.y = 0.6;
  g.add(base);
  const snowBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.7, 8), snowMat);
  snowBase.position.y = 0.35;
  g.add(snowBase);
  // Lantern arm and glowing lamp.
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 2.4), poleMat);
  arm.position.set(0, 9.8, 0.8);
  g.add(arm);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2, 1.4), amber);
  lamp.position.set(0, 9, 2);
  g.add(lamp);
  // Snow cap on the pole top.
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1, 1.2, 8), snowMat);
  cap.position.y = 11.6;
  g.add(cap);
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

const makePennantFlags = () => {
  const g = new THREE.Group();
  const poleMat = createToonMaterial('#4a5568');
  const snowMat = createToonMaterial('#F5F8FF');
  const colors = ['#00E5FF', '#F5F8FF', '#FFD34F'];
  [-1, 1].forEach((sx) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 9, 8), poleMat);
    pole.position.set(sx * 5, 4.5, 0);
    g.add(pole);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.6, 8), snowMat);
    base.position.set(sx * 5, 0.3, 0);
    g.add(base);
  });
  // String with triangular pennants.
  for (let i = 0; i < 5; i += 1) {
    const t = (i + 1) / 6;
    const x = -5 + t * 10;
    const y = 8.2 - Math.sin(t * Math.PI) * 1.2;
    const flag = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 1.4, 3),
      createBasicMaterial(colors[i % colors.length])
    );
    flag.rotation.z = -Math.PI / 2;
    flag.rotation.y = Math.PI / 2;
    flag.position.set(x, y - 0.7, 0);
    g.add(flag);
  }
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

const makePenguinCrossingTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#00E5FF';
  ctx.beginPath();
  ctx.moveTo(128, 8);
  ctx.lineTo(248, 128);
  ctx.lineTo(128, 248);
  ctx.lineTo(8, 128);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#F5F8FF';
  ctx.lineWidth = 10;
  ctx.stroke();
  // Simple penguin silhouette.
  ctx.fillStyle = '#F5F8FF';
  ctx.beginPath();
  ctx.ellipse(128, 120, 38, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(128, 70, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#00E5FF';
  ctx.beginPath();
  ctx.ellipse(128, 132, 22, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const makePenguinCrossingSign = () => {
  const g = new THREE.Group();
  const poleMat = createToonMaterial('#4a5568');
  const snowMat = createToonMaterial('#F5F8FF');
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 8.5, 8), poleMat);
  pole.position.y = 4.25;
  g.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.8, 8), snowMat);
  base.position.y = 0.4;
  g.add(base);
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 4.4),
    new THREE.MeshBasicMaterial({ map: makePenguinCrossingTexture(), side: THREE.DoubleSide })
  );
  board.position.set(0, 7.4, 0.35);
  g.add(board);
  const boardBack = board.clone();
  boardBack.position.z = -0.35;
  boardBack.rotation.y = Math.PI;
  g.add(boardBack);
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

const makeChunkyIceCrystal = (scale = 1) => {
  const g = new THREE.Group();
  const crystalMat = createBasicMaterial('#00E5FF', {
    emissive: '#7EC8E8',
    emissiveIntensity: 0.55,
    opacity: 0.82,
    transparent: true,
  });
  const capMat = createBasicMaterial('#F5F8FF', {
    emissive: '#F5F8FF',
    emissiveIntensity: 0.35,
    opacity: 0.9,
    transparent: true,
  });
  [
    { r: 1.6, h: 6.2, x: 0, z: 0, ry: 0 },
    { r: 1.1, h: 4.4, x: -2.2, z: 0.8, ry: 0.5 },
    { r: 1.2, h: 4.8, x: 2.1, z: -0.6, ry: -0.4 },
    { r: 0.85, h: 3.2, x: 0.6, z: 2, ry: 0.9 },
  ].forEach(({ r, h, x, z, ry }) => {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(r * scale, h * scale, 5), crystalMat);
    shard.position.set(x * scale, (h * scale) / 2, z * scale);
    shard.rotation.y = ry;
    g.add(shard);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55 * scale, h * 0.35 * scale, 5), capMat);
    cap.position.set(x * scale, (h * scale) * 0.92, z * scale);
    cap.rotation.y = ry;
    g.add(cap);
  });
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

const makeSnowMound = (scale = 1) => {
  const g = new THREE.Group();
  const snow = createToonMaterial('#F5F8FF', { emissive: '#EAF4FA', emissiveIntensity: 0.12 });
  const mound = new THREE.Mesh(new THREE.SphereGeometry(4 * scale, 8, 6), snow);
  mound.scale.set(1.5, 0.55, 1.5);
  mound.position.y = 0.6 * scale;
  g.add(mound);
  const top = new THREE.Mesh(new THREE.SphereGeometry(2.2 * scale, 7, 5), snow);
  top.scale.set(1, 0.8, 1);
  top.position.y = 2.1 * scale;
  g.add(top);
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

const makeFrozenTireBumper = () => {
  const g = new THREE.Group();
  const tireMat = createToonMaterial('#2a3a4a');
  const iceMat = createBasicMaterial('#7EC8E8', { emissive: '#00E5FF', emissiveIntensity: 0.45 });
  const snowMat = createToonMaterial('#F5F8FF');
  [0, 2.4].forEach((y) => {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.9, 8, 16), tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.position.y = y + 1.4;
    g.add(tire);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.25, 6, 16), iceMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = y + 1.4;
    g.add(rim);
  });
  const snowCap = new THREE.Mesh(new THREE.SphereGeometry(2.8, 8, 6), snowMat);
  snowCap.scale.set(1, 0.5, 1);
  snowCap.position.y = 5.2;
  g.add(snowCap);
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

const makeVillageBench = () => {
  const g = new THREE.Group();
  const wood = createToonMaterial('#9c6b3c');
  const snow = createToonMaterial('#F5F8FF');
  const metal = createToonMaterial('#7EC8E8');
  // Seat and back slats.
  g.add(makeBox({ x: 7, y: 0.5, z: 2.2 }, { y: 1.5, z: 0.6 }, wood));
  g.add(makeBox({ x: 7, y: 2.2, z: 0.4 }, { y: 2.6, z: -0.4 }, wood));
  // Legs / armrests.
  [-1, 1].forEach((sx) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.2, 2.4), metal);
    arm.position.set(sx * 3.6, 1.6, 0.4);
    g.add(arm);
  });
  // Snow on the seat and back.
  g.add(makeBox({ x: 7.2, y: 0.35, z: 2.4 }, { y: 1.8, z: 0.6 }, snow));
  g.add(makeBox({ x: 7.2, y: 0.35, z: 0.6 }, { y: 3.75, z: -0.4 }, snow));
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

const makeIglooMailbox = () => {
  const g = new THREE.Group();
  const ice = createToonMaterial('#EAF4FA', { emissive: '#D6ECF7', emissiveIntensity: 0.15 });
  const door = createToonMaterial('#00E5FF');
  const poleMat = createToonMaterial('#4a5568');
  // Pole.
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 4.5, 8), poleMat);
  pole.position.y = 2.25;
  g.add(pole);
  // Igloo body.
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), ice);
  dome.position.y = 4.2;
  g.add(dome);
  // Door slot.
  const slot = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.4), door);
  slot.position.set(0, 4.2, 2.0);
  g.add(slot);
  // Little flag.
  const flag = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.1), createBasicMaterial('#F5A623'));
  flag.position.set(1.4, 5.4, 0);
  g.add(flag);
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

const makeSledCart = () => {
  const g = new THREE.Group();
  const wood = createToonMaterial('#9c6b3c');
  const metal = createToonMaterial('#7EC8E8');
  const rope = createToonMaterial('#c49a6c');
  // Bed.
  g.add(makeBox({ x: 8, y: 0.6, z: 4 }, { y: 1.4 }, wood));
  // Side rails.
  [-1, 1].forEach((sz) => {
    g.add(makeBox({ x: 8.4, y: 0.5, z: 0.4 }, { y: 2.0, z: sz * 2.0 }, metal));
  });
  // Front handlebars.
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 4, 8), metal);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(4.8, 2.4, 0);
  g.add(handle);
  const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.6, 8), metal);
  upright.position.set(4.2, 2.0, 0);
  g.add(upright);
  // Runners.
  [-1, 1].forEach((sz) => {
    const runner = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.3, 0.4), metal);
    runner.position.set(-0.3, 0.4, sz * 2.2);
    g.add(runner);
  });
  // Rope coil at the front.
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.2, 6, 12), rope);
  coil.rotation.x = Math.PI / 2;
  coil.position.set(5.4, 0.5, 0);
  g.add(coil);
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

const makeIceBlockBarrier = () => {
  const g = new THREE.Group();
  const ice = createToonMaterial('#7EC8E8', { emissive: '#00E5FF', emissiveIntensity: 0.25 });
  const metal = createToonMaterial('#F5F8FF');
  // Two rows of ice blocks.
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 2.6), ice);
      block.position.set(col * 2.7 - 4.05, 1.2 + row * 2.3, (row % 2 ? 0.6 : -0.6));
      g.add(block);
    }
  }
  // Corner brackets.
  [-1, 1].forEach((sx) => {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5.2, 0.8), metal);
    bracket.position.set(sx * 5.4, 2.6, 0);
    g.add(bracket);
  });
  g.traverse((n) => {
    n.castShadow = false;
  });
  return g;
};

const addPenguinVillageDressing = (world, sampler, trackDef) => {
  const roadWidth = trackDef.course.mainRoadWidth || 56;
  // Giant ordinal-penguin ice statues at signature spots — the landmark.
  [
    { p: 0.16, side: 1, h: 48 },
    { p: 0.5, side: -1, h: 42 },
    { p: 0.82, side: 1, h: 46 },
  ].forEach(({ p, side, h }) => {
    const { normal, point } = sampler.pointAt(p);
    const pos = point.clone().addScaledVector(normal, side * (sampler.widthAt(p) * 0.5 + 64));
    if (minCenterlineDistance(sampler, pos.x, pos.z) < roadWidth * 0.7) return;
    const statue = makeIceStatue(h);
    statue.position.copy(pos);
    statue.rotation.y = Math.atan2(point.x - pos.x, point.z - pos.z); // face the road
    world.add(statue);
  });
  // Igloos around the loop.
  for (let i = 0; i < 10; i += 1) {
    const p = (0.04 + i * 0.097) % 1;
    const side = i % 2 === 0 ? -1 : 1;
    const { normal, point, tangent } = sampler.pointAt(p);
    const pos = point.clone().addScaledVector(normal, side * (sampler.widthAt(p) * 0.5 + 26 + (i % 3) * 10));
    if (minCenterlineDistance(sampler, pos.x, pos.z) < roadWidth * 0.62) continue;
    const igloo = makeIgloo(7 + (i % 3) * 1.6);
    igloo.position.copy(pos);
    igloo.rotation.y = Math.atan2(tangent.x, tangent.z) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
    world.add(setFlatTransform(igloo));
  }
  // Snow mounds + ice-shard clusters as low filler, tuned to the concept palette.
  for (let i = 0; i < 16; i += 1) {
    const p = (0.02 + i * 0.061) % 1;
    const side = i % 2 === 0 ? 1 : -1;
    const { normal, point } = sampler.pointAt(p);
    const pos = point.clone().addScaledVector(normal, side * (sampler.widthAt(p) * 0.5 + 14 + (i % 4) * 6));
    if (minCenterlineDistance(sampler, pos.x, pos.z) < roadWidth * 0.56) continue;
    if (i % 2 === 0) {
      const mound = makeSnowMound(0.9 + (i % 3) * 0.12);
      mound.position.copy(pos);
      world.add(setFlatTransform(mound));
    } else {
      const shard = new THREE.Mesh(
        new THREE.ConeGeometry(1.5, 6 + (i % 3) * 2, 5),
        createBasicMaterial('#00E5FF', { emissive: '#7EC8E8', emissiveIntensity: 0.6 })
      );
      shard.position.copy(pos);
      shard.position.y = 3.2;
      world.add(setFlatTransform(shard));
    }
  }
  // Pond-sweep prop dressing (0.24–0.42): chunky crystals, snow mounds, frozen tire bumpers.
  {
    const pondProps = [
      { p: 0.26, side: -1, type: 'crystal', offset: 18 },
      { p: 0.3, side: 1, type: 'crystal', offset: 16 },
      { p: 0.36, side: -1, type: 'crystal', offset: 20 },
      { p: 0.4, side: 1, type: 'crystal', offset: 17 },
      { p: 0.28, side: 1, type: 'mound', offset: 14 },
      { p: 0.34, side: -1, type: 'mound', offset: 15 },
      { p: 0.39, side: 1, type: 'mound', offset: 13 },
      { p: 0.32, side: -1, type: 'bumper', offset: 18 },
      { p: 0.38, side: 1, type: 'bumper', offset: 17 },
    ];
    pondProps.forEach(({ p, side, type, offset }) => {
      const { normal, point, tangent } = sampler.pointAt(p);
      const pos = point.clone().addScaledVector(normal, side * (sampler.widthAt(p) * 0.5 + offset));
      if (minCenterlineDistance(sampler, pos.x, pos.z) < roadWidth * 0.58) return;
      const prop =
        type === 'crystal'
          ? makeChunkyIceCrystal(1.0 + (Math.floor(p * 100) % 3) * 0.12)
          : type === 'mound'
          ? makeSnowMound(1.0 + (Math.floor(p * 100) % 2) * 0.15)
          : makeFrozenTireBumper();
      prop.position.copy(pos);
      prop.position.y = 0;
      prop.rotation.y = Math.atan2(tangent.x, tangent.z) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      world.add(setFlatTransform(prop));
    });
  }
  // Main-street prop dressing along the long start straight (0.0–0.24).
  {
    const streetProps = [
      { p: 0.04, side: -1, type: 'lamp' },
      { p: 0.09, side: 1, type: 'lamp' },
      { p: 0.14, side: -1, type: 'lamp' },
      { p: 0.19, side: 1, type: 'lamp' },
      { p: 0.06, side: 1, type: 'flags' },
      { p: 0.16, side: -1, type: 'flags' },
      { p: 0.22, side: 1, type: 'crossing' },
    ];
    streetProps.forEach(({ p, side, type }) => {
      const { normal, point, tangent } = sampler.pointAt(p);
      const offset = type === 'crossing' ? 22 : type === 'flags' ? 18 : 16;
      const pos = point.clone().addScaledVector(normal, side * (sampler.widthAt(p) * 0.5 + offset));
      if (minCenterlineDistance(sampler, pos.x, pos.z) < roadWidth * 0.58) return;
      const prop = type === 'lamp' ? makeSnowyLampPost() : type === 'flags' ? makePennantFlags() : makePenguinCrossingSign();
      prop.position.copy(pos);
      prop.position.y = 0;
      prop.rotation.y = Math.atan2(tangent.x, tangent.z) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      world.add(setFlatTransform(prop));
    });
  }
  // Frozen river crossing UNDER the bridge overpass — what the road bridges.
  const band = trackDef.elevation?.bridgeBand;
  if (band && band.peak > 0) {
    const crest = (band.from + band.to) / 2;
    const { point, tangent } = sampler.pointAt(crest);
    const river = new THREE.Group();
    river.position.set(point.x, 0.2, point.z);
    river.rotation.y = Math.atan2(tangent.x, tangent.z); // local z = along road
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(280, 0.4, 70),
      createBasicMaterial('#2a6a8a', { emissive: '#1a4a64', emissiveIntensity: 0.32 })
    );
    river.add(water);
    const sheen = new THREE.Mesh(
      new THREE.BoxGeometry(280, 0.1, 22),
      new THREE.MeshBasicMaterial({ color: '#cfeeff', transparent: true, opacity: 0.4 })
    );
    sheen.position.y = 0.3;
    river.add(sheen);
    // Ice-floe shards drifting on the river.
    [-90, -30, 40, 100].forEach((x, i) => {
      const floe = new THREE.Mesh(
        new THREE.CylinderGeometry(6 + (i % 2) * 3, 6 + (i % 2) * 3, 0.6, 6),
        createToonMaterial('#eef6fb')
      );
      floe.position.set(x, 0.5, (i % 2 ? 1 : -1) * 16);
      river.add(floe);
    });
    river.traverse((n) => {
      n.castShadow = false;
    });
    world.add(setFlatTransform(river));
  }
  // Background icebergs ringing the horizon — the "iceberg" read. Far out
  // beyond the track envelope, tall and jagged, skipping any near the road.
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2 + 0.25;
    const r = 500 + (i % 3) * 22;
    const h = 58 + (i % 4) * 24;
    const pos = { x: Math.cos(a) * r, z: Math.sin(a) * r };
    if (minCenterlineDistance(sampler, pos.x, pos.z) < 70) continue;
    const berg = makeIceberg(h);
    berg.position.set(pos.x, -2, pos.z);
    berg.rotation.y = a * 1.7;
    world.add(setFlatTransform(berg));
  }
  // Penguin spectator clusters along the rails — more penguins everywhere.
  [0.1, 0.36, 0.6, 0.88].forEach((p, ci) => {
    const side = ci % 2 === 0 ? -1 : 1;
    const { normal, point, tangent } = sampler.pointAt(p);
    for (let k = 0; k < 4; k += 1) {
      const lateral = sampler.widthAt(p) * 0.5 + 8 + (k % 2) * 4;
      const along = (k - 1.5) * 4.5;
      const pos = point.clone().addScaledVector(normal, side * lateral).addScaledVector(tangent, along);
      if (minCenterlineDistance(sampler, pos.x, pos.z) < roadWidth * 0.5) continue;
      const penguin = makePenguinSpectator(1.1);
      penguin.position.copy(pos);
      penguin.position.y = 0;
      penguin.rotation.y = Math.atan2(point.x - pos.x, point.z - pos.z); // watch the race
      world.add(setFlatTransform(penguin));
    }
  });
  // Fish-market prop dressing along the market-row straight (0.42–0.72).
  {
    const marketProps = [
      { p: 0.44, side: -1, type: 'crate', offset: 16 },
      { p: 0.47, side: -1, type: 'crate', offset: 18 },
      { p: 0.52, side: 1, type: 'crate', offset: 17 },
      { p: 0.58, side: 1, type: 'crate', offset: 15 },
      { p: 0.64, side: -1, type: 'crate', offset: 16 },
      { p: 0.46, side: 1, type: 'barrel', offset: 16 },
      { p: 0.56, side: -1, type: 'barrel', offset: 15 },
      { p: 0.68, side: 1, type: 'barrel', offset: 16 },
      { p: 0.5, side: 1, type: 'stall', offset: 28 },
      { p: 0.62, side: -1, type: 'stall', offset: 28 },
      { p: 0.7, side: -1, type: 'sign', offset: 34 },
    ];
    marketProps.forEach(({ p, side, type, offset }, index) => {
      const { normal, point, tangent } = sampler.pointAt(p);
      const pos = point.clone().addScaledVector(normal, side * (sampler.widthAt(p) * 0.5 + offset));
      if (minCenterlineDistance(sampler, pos.x, pos.z) < roadWidth * 0.58) return;
      const prop =
        type === 'crate'
          ? makeFishCrate(0.9 + (index % 3) * 0.08)
          : type === 'barrel'
          ? makeFishBarrel()
          : type === 'stall'
          ? makeMarketStall()
          : makeCannerySign();
      prop.position.copy(pos);
      prop.position.y = 0;
      prop.rotation.y = Math.atan2(tangent.x, tangent.z) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      world.add(setFlatTransform(prop));
    });
  }
  // Return-bend village prop dressing (0.72–1.0).
  {
    const returnProps = [
      { p: 0.74, side: -1, type: 'bench', offset: 16 },
      { p: 0.78, side: 1, type: 'mailbox', offset: 15 },
      { p: 0.84, side: -1, type: 'sled', offset: 18 },
      { p: 0.9, side: 1, type: 'barrier', offset: 16 },
      { p: 0.95, side: -1, type: 'bench', offset: 16 },
      { p: 0.98, side: 1, type: 'mailbox', offset: 14 },
    ];
    returnProps.forEach(({ p, side, type, offset }) => {
      const { normal, point, tangent } = sampler.pointAt(p);
      const pos = point.clone().addScaledVector(normal, side * (sampler.widthAt(p) * 0.5 + offset));
      if (minCenterlineDistance(sampler, pos.x, pos.z) < roadWidth * 0.58) return;
      const prop =
        type === 'bench'
          ? makeVillageBench()
          : type === 'mailbox'
          ? makeIglooMailbox()
          : type === 'sled'
          ? makeSledCart()
          : makeIceBlockBarrier();
      prop.position.copy(pos);
      prop.position.y = 0;
      prop.rotation.y = Math.atan2(tangent.x, tangent.z) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      world.add(setFlatTransform(prop));
    });
  }
  // "THE ICE IS NICE" gantry over the start/finish — white frame + teal
  // glowing sign, matching the owner's reference. Driven under each lap.
  {
    const { point, tangent } = sampler.pointAt(wrap01(trackDef.course.startProgress || 0));
    const width = sampler.widthAt(0);
    const arch = new THREE.Group();
    arch.position.copy(point);
    arch.rotation.y = Math.atan2(tangent.x, tangent.z);
    const frameMat = createToonMaterial('#f4f9ff', { emissive: '#dceefb', emissiveIntensity: 0.3 });
    const signY = 24;
    const bannerW = width * 0.98;
    const bannerH = width * 0.26;
    const t = 2.4; // frame thickness
    // Tall white posts at the road edges.
    [-1, 1].forEach((s) => {
      const post = new THREE.Mesh(new RoundedBoxGeometry(t * 1.4, signY + bannerH / 2 + 2, t * 1.4, 1, 0.6), frameMat);
      post.position.set(s * (width * 0.5 + 4), (signY + bannerH / 2) / 2, 0);
      arch.add(post);
    });
    // White rectangular frame around the sign panel.
    [bannerH / 2 + t / 2, -bannerH / 2 - t / 2].forEach((dy) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(bannerW + t * 2, t, t), frameMat);
      bar.position.set(0, signY + dy, 0);
      arch.add(bar);
    });
    [bannerW / 2 + t / 2, -bannerW / 2 - t / 2].forEach((dx) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(t, bannerH, t), frameMat);
      bar.position.set(dx, signY, 0);
      arch.add(bar);
    });
    // Teal glowing sign panel (readable side faces oncoming racers).
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(bannerW, bannerH),
      new THREE.MeshBasicMaterial({ map: makeSloganTexture('THE ICE IS NICE'), side: THREE.DoubleSide })
    );
    banner.position.set(0, signY, 0.2);
    banner.rotation.y = Math.PI;
    arch.add(banner);
    const bannerBack = banner.clone();
    bannerBack.position.z = -0.2;
    bannerBack.rotation.y = 0;
    arch.add(bannerBack);
    addGlowSprite(arch, '#bfeaff', 30, 0.25, signY);
    arch.traverse((n) => {
      n.castShadow = false;
    });
    world.add(arch);
  }
};

const createScene = ({
  canvas,
  onUnavailable,
  playerCharacter = characterByKey(DEFAULT_CHARACTER_KEY),
  postChainEnabled = false,
  rivalSeats = rivalSeatsFor(DEFAULT_CHARACTER_KEY),
  trackDef = trackByKey(DEFAULT_TRACK_KEY),
  trackVisualsEnabled = false,
}) => {
  let palette = trackDef.palette || {};
  // Palette lab (dev QA, B1/B2 variant review): ?paletteLab=1 merges
  // window.__paletteLabOverrides over the track palette so the variant lab
  // captures candidate looks without touching presentation defaults.
  if (
    typeof window !== 'undefined' &&
    window.__paletteLabOverrides &&
    new URLSearchParams(window.location.search).get('paletteLab') === '1'
  ) {
    palette = { ...palette, ...window.__paletteLabOverrides };
  }
  const renderer = createRaceRenderer({ canvas, onUnavailable });
  if (!renderer) return null;
  // Graphics overhaul (Hermes): resolve the active preset once per race.
  // ?gfx=low|high|off overrides; 'off' skips this module's additive visual
  // features before they touch the scene. Rendering-only — physics untouched.
  const gfx = resolveGraphicsConfig();
  const atmosphereGrade = atmosphereGradeFor(trackDef.key);
  renderer.setClearColor(palette.clearColor || '#131a36', 1);
  // Tone exposure: the grade lifts the 1.05 renderer fallback for a richer
  // key light. ?gfx=off leaves that fallback untouched.
  if (gfx.toneExposure !== null && gfx.toneExposure !== undefined) {
    renderer.toneMappingExposure = gfx.toneExposure;
  } else {
    renderer.toneMappingExposure = 1.05;
  }
  // Presentation slice default: skip the real-time shadow pass and rely on
  // mesh blob/contact grounding. This keeps the frame budget focused on the
  // visible kart/body/track work without touching physics.
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.BasicShadowMap;

  const scene = new THREE.Scene();
  scene.background = makeSkyTexture(palette.sky);
  // B1: atmosphere reads from the track palette; the fallbacks reproduce
  // Comeback City exactly (its palette has no fog/hemi/sun keys, by
  // construction). GRAPHICS OVERHAUL: when the atmosphere feature is on, the
  // per-track grade (graphicsAtmosphere.js) supplies the presentation lighting
  // base; an explicit palette key still wins over the grade, and the
  // hardcoded defaults sit last. NOTE fog.far must stay <= 840 —
  // camera far is 860 and fog far beyond camera far silently no-ops the haze.
  const fogCfg = palette.fog || (gfx.atmosphere ? atmosphereGrade.fog : {});
  scene.fog = new THREE.Fog(fogCfg.color || '#272252', fogCfg.near ?? 240, fogCfg.far ?? 820);
  const camera = new THREE.PerspectiveCamera(66, 1, 0.25, 860);
  const world = new THREE.Group();
  scene.add(world);
  const loader = new THREE.TextureLoader();
  const hemiCfg = palette.hemi || (gfx.atmosphere ? atmosphereGrade.hemi : {});
  const hemi = new THREE.HemisphereLight(
    hemiCfg.sky || '#8d8ce0',
    hemiCfg.ground || '#2a1e4a',
    hemiCfg.intensity ?? 3.3
  );
  scene.add(hemi);
  // Environment reflection probe (Phase 1 materials): PMREM RoomEnvironment
  // -> scene.environment so kart paint/metal + road specular pick up a subtle
  // IBL sheen. 'low' gets a dimmer bake, 'off' skips it.
  // Baked once here; disposed in the teardown below.
  // Environment reflection probe (Phase 1 materials): PMREM RoomEnvironment
  // -> scene.environment so kart paint/metal + road specular pick up a subtle
  // IBL sheen. 'low' gets a dimmer bake, 'off' skips it.
  // Baked once here; disposed in the teardown below.
  // Software-GL sessions skip it too: per-fragment PMREM sampling is the
  // single largest SwiftShader cost (160ms -> 86ms frames without it).
  const gfxEnv = gfx.environmentMap && !softwareQualityAdapted() ? applyGraphicsEnvironment({ renderer, scene, intensity: gfx.environmentIntensity }) : null;
  // Key light rides with the kart. The shadow camera settings remain in place
  // for local A/B toggles, but castShadow stays off in this slice.
  const sun = new THREE.DirectionalLight(
    palette.sunColor || (gfx.atmosphere ? atmosphereGrade.sunColor : '#ffae72'),
    gfx.atmosphere ? atmosphereGrade.sunIntensity : 2.6
  );
  sun.position.set(-150, 52, -70);
  sun.castShadow = false;
  sun.shadow.mapSize.set(gfx.shadowBoost ? gfx.shadowMapSize : 384, gfx.shadowBoost ? gfx.shadowMapSize : 384);
  sun.shadow.camera.left = gfx.shadowBoost ? -72 : -64;
  sun.shadow.camera.right = gfx.shadowBoost ? 72 : 64;
  sun.shadow.camera.top = gfx.shadowBoost ? 72 : 64;
  sun.shadow.camera.bottom = gfx.shadowBoost ? -72 : -64;
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 420;
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  scene.add(sun.target);
  const rimLight = new THREE.DirectionalLight(
    palette.rimLightColor || (gfx.atmosphere ? atmosphereGrade.rimLightColor : '#4fd8ff'),
    gfx.atmosphere ? atmosphereGrade.rimLightIntensity : 2.0
  );
  rimLight.position.set(92, 56, 74);
  scene.add(rimLight);
  // Sun-fill bounce (Phase 1, new): a soft low-intensity light opposite the
  // key that fakes sky/ground bounce so shaded kart faces aren't flat black.
  // Cheap (no shadow), 'low'/'off' drop it. Sits between the key and rim so
  // it lifts the dark side without fighting the rim edge.
  let sunFill = null;
  if (gfx.sunFill) {
    sunFill = new THREE.DirectionalLight(
      palette.sunFillColor || atmosphereGrade.sunFillColor,
      atmosphereGrade.sunFillIntensity
    );
    sunFill.position.set(120, 34, 96);
    sunFill.castShadow = false;
    scene.add(sunFill);
    scene.add(sunFill.target);
  }
  // GRAPHICS OVERHAUL Phase 2 particles: drift smoke, boost sparks, ambient
  // motes. Visual-only — they read race state for emission triggers but never
  // feed back into physics. Absent on ?gfx=off; ambient cut on 'low'.
  const gfxParticles = createGraphicsParticles({ gfx, trackKey: trackDef.key });
  world.add(gfxParticles.group);

  // B3: resolve the hero fresnel rim for this race — the dev lab hook wins,
  // else the track's active palette.heroRim (PV V6 "ice white"; CC has no
  // key = rim off). One shared tint drives every rimmed hero material; a
  // heroRim.tint overrides the palette rimLightColor for the shader rim
  // only (the rimLight above keeps its own color).
  const labRim = heroRimConfig();
  activeHeroRim = labRim !== undefined ? labRim : palette.heroRim || null;
  TOON_RIM_SHARED_TINT.value.set(activeHeroRim?.tint || palette.rimLightColor || '#4fd8ff');

  // Generated backdrop presentation layer: two parallax billboard
  // rings — an opaque far band (its own sky + horizon glow, top 35%
  // alpha-faded into the procedural gradient) and an alpha-keyed nearer
  // silhouette row, bundled from src/assets/game/generated/backdrops/.
  // Rings are fog-exempt (the art is pre-hazed) and never write depth, so
  // the world always overdraws them; camera.far 1800 is the backdrop value
  // when the layer is on (?skyLab=0 diagnostic drops back to 860 — the
  // fog.far <= 840 rule is about FOG and is unaffected either way).
  const skyLab = skyLabConfig();
  const worldBoundsForRings = trackDef.course?.worldBounds || null;
  if (skyLab) {
    const SKY_LAB_STRIPS = {
      'comeback-city': {
        far: backdropCcFarUrl,
        near: backdropCcNearUrl,
      },
      // PV ships the b-takes: the a-take ice row keyed out DARK (teal +
      // gold cracks) and read like CC's dark tower skyline — the owner
      // flagged the two tracks as "the same exact background". The b-takes
      // carry the pale GLOWING shelf from the picked concept, so the
      // arctic horizon is unmistakably ice. Far bands carry the W0
      // fade_frac 0.35 top fade (the 0.16 band showed a hard seam).
      'penguin-village': {
        far: backdropPvFarUrl,
        near: backdropPvNearUrl,
      },
    };
    const strips = SKY_LAB_STRIPS[trackDef.key] || {};
    camera.far = 1800;
    camera.updateProjectionMatrix();
    // Ring placement: courses with authored worldBounds (the custom map)
    // center the rings on the course and push them outside the far edge so
    // the band never cuts through a district; legacy courses keep the
    // owner-approved origin-centered radii.
    const ringCenter = worldBoundsForRings
      ? { x: (worldBoundsForRings.minX + worldBoundsForRings.maxX) / 2, z: (worldBoundsForRings.minZ + worldBoundsForRings.maxZ) / 2 }
      : { x: 0, z: 0 };
    const ringRadius = worldBoundsForRings
      ? Math.ceil(Math.max(worldBoundsForRings.maxX - ringCenter.x, worldBoundsForRings.maxZ - ringCenter.z, ringCenter.x - worldBoundsForRings.minX, ringCenter.z - worldBoundsForRings.minZ) / 50) * 50
      : null;
    const addBackdropRing = (url, { height, order, radius, repeats, y }) => {
      if (!url) return;
      loader.load(url, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.MirroredRepeatWrapping;
        texture.repeat.x = repeats;
        const ring = new THREE.Mesh(
          new THREE.CylinderGeometry(radius, radius, height, 64, 1, true),
          new THREE.MeshBasicMaterial({
            depthWrite: false,
            fog: false,
            map: texture,
            side: THREE.BackSide,
            transparent: true,
          })
        );
        ring.position.x = ringCenter.x;
        ring.position.z = ringCenter.z;
        ring.position.y = y;
        ring.renderOrder = order;
        scene.add(ring);
      });
    };
    if (ringRadius) {
      addBackdropRing(skyLab.far || strips.far, { height: 520, order: -20, radius: ringRadius + 420, repeats: 7, y: 200 });
      addBackdropRing(skyLab.near || strips.near, { height: 300, order: -19, radius: ringRadius + 180, repeats: 9, y: 115 });
    } else {
      addBackdropRing(skyLab.far || strips.far, { height: 380, order: -20, radius: 780, repeats: 5, y: 140 });
      addBackdropRing(skyLab.near || strips.near, { height: 210, order: -19, radius: 590, repeats: 7, y: 78 });
    }
  }

  // Post-processing is opt-in for the vertical slice. The default proof frame
  // must stand up without bloom/color tricks, so direct rendering is the
  // baseline and ?post=1 enables the pmndrs A/B chain.
  let composer;
  let bloomPass = null;
  let bloomEffect = null;
  // GRAPHICS OVERHAUL Phase 2 post FX (color grade + speed CA). Built once
  // here so the frame loop can drive the speed-reactive bits. Null when the
  // chain is off or every Phase-2 post feature is disabled.
  let gfxPostFx = null;
  // Snapshot the active bloom intensity so the Phase-2 speed swell multiplies
  // a stable base instead of compounding against palette moments.
  let gfxBloomBase = 0.18;
  if (postChainEnabled) {
    // B4 (?post=1): mipmap bloom + SMAA + optional vignette + ACES merged in ONE
    // EffectPass. Each effect is individually toggleable for the M2
    // benchmark review: ?post=1&postBloom=0 / &postSmaa=0 / &postTone=0 /
    // &postVignette=1.
    const postParams = new URLSearchParams(window.location.search);
    const wantBloom = postParams.get('postBloom') !== '0';
    const wantSmaa = postParams.get('postSmaa') !== '0';
    const wantTone = postParams.get('postTone') !== '0';
    // Vignette is opt-in for this slice; it is useful for capture comparison
    // but too easy to read as a darkened frame in the playable default.
    const wantVignette = postParams.get('postVignette') === '1';
    // The pmndrs chain owns tone mapping (ToneMappingEffect below), so the
    // renderer must hand over linear HDR frames. LOCAL override only: the
    // shared configureRaceRenderer (createRaceScene.js) still sets ACES for
    // the legacy ArcadeRace3D stack and must not be edited. Exposure: the
    // old chain applied toneMappingExposure 1.05 via OutputPass; whether
    // pmndrs ToneMappingEffect honors it is judged by the step-1 parity
    // A/B capture — if the frame reads dim, scale hemi/sun by 1.05 instead.
    renderer.toneMapping = THREE.NoToneMapping;
    composer = new PmndrsEffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
    composer.addPass(new PmndrsRenderPass(scene, camera));
    const effects = [];
    if (wantBloom) {
      // pmndrs radius/intensity semantics differ from UnrealBloomPass. These
      // reduced values preserve neon read without washing out the kart.
      bloomEffect = new BloomEffect({
        mipmapBlur: true,
        intensity: 0.22,
        // Keep the mipmap bloom radius restrained; snow and road highlights
        // should support the kart silhouette, not haze over it.
        radius: 0.38,
        luminanceThreshold: 1.0,
        luminanceSmoothing: 0.22,
      });
      effects.push(bloomEffect);
    }
    if (wantSmaa) effects.push(new SMAAEffect({ preset: SMAAPreset.MEDIUM }));
    if (wantVignette) effects.push(new VignetteEffect({ offset: 0.32, darkness: 0.45 }));
    // GRAPHICS OVERHAUL Phase 2: color grade (LUT-style vibrance + contrast)
    // and speed-reactive radial chromatic aberration. Null on ?gfx=off so the
    // chain stays isolated from additive presentation features. Grade sits before tone
    // mapping (operates in HDR), CA after (screen-space fringing).
    gfxPostFx = createGraphicsPostFx({ gfx });
    if (gfxPostFx && gfxPostFx.effects.length) effects.push(...gfxPostFx.effects);
    // Snapshot the active bloom base once the bloom effect exists so the
    // frame-loop speed swell multiplies a constant (not the live, moments-
    // adjusted value — that would compound each frame).
    if (bloomEffect) gfxBloomBase = bloomEffect.intensity;
    // LUT3DEffect goes here, before ToneMappingEffect, when owner supplies a LUT texture.
    if (wantTone) effects.push(new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }));
    if (effects.length) composer.addPass(new EffectPass(camera, ...effects));
    // ChromaticAberrationEffect is a convolution effect and CANNOT be merged
    // into the shared EffectPass above (pmndrs throws). It rides in its own
    // pass appended after the merged pass; its offset is driven per-frame by
    // speed (zero at rest, so this pass is a near-no-op until speed builds).
    if (gfxPostFx?.chromaticAberration) {
      composer.addPass(new EffectPass(camera, gfxPostFx.chromaticAberration));
    }
  }

  // B2: per-lap palette moments — resolved ONCE per race into decoded lerp
  // endpoints (see paletteMoments.js); null when the track has no moments
  // key so the per-frame hook is a single truthy check. No track ships a
  // moments key yet (owner pick pending in moments-lab.html) — today this
  // only activates through the ?momentsLab=1 dev hook. The rimTint base
  // mirrors the TOON_RIM_SHARED_TINT line above (the ACTIVE rim tint, lab
  // override included); bloomBase snapshots whichever bloom the live chain
  // carries so moment bloom values stay chain-agnostic multipliers.
  const labMoments = momentsLabConfig();
  const momentsSource = labMoments !== undefined ? labMoments : palette.moments;
  let paletteMoments = null;
  if (Array.isArray(momentsSource) && momentsSource.length) {
    const bloomRef = postChainEnabled ? bloomEffect : bloomPass;
    paletteMoments = {
      bloomBase: bloomRef ? (postChainEnabled ? bloomRef.intensity : bloomRef.strength) : null,
      resolved: resolveMoments(
        { ...palette, moments: momentsSource },
        { rimTint: activeHeroRim?.tint || palette.rimLightColor || '#4fd8ff' }
      ),
      sample: createMomentSample(),
    };
  }

  const sampler = makeSampler(trackDef);
  const trackVisuals = resolveTrackVisuals(trackDef, { enabled: trackVisualsEnabled });
  const trackVisualPropCount = addTrack(world, sampler, trackDef, trackVisuals);
  const questionTexture = makeQuestionTexture();
  const boostPads = trackDef.course.boostPads.map((pad, index) => addPad(world, sampler, pad, index));
  const itemBoxes = trackDef.course.itemBoxes.map((box, index) =>
    addItemBox(world, sampler, box, index, questionTexture)
  );
  // ₿ collectible coins (owner concept 2026-07-07): rows from the pure
  // module; the visual clones ONE face-node of the active CC coin box
  // K4: crosser rigs — one positioned group per track crosser, loaded via
  // the guarded miami mount machinery (loud 404, telemetry mounts guard).
  // The frame loop drives position/facing from the pure crosser sim. Only
  // the ordinalWalker visual exists so far (outplayasians, Meshy mesh:
  // front = +Z per the orientation lab -> yaw 0).
  const crosserRigs = (trackDef.crossers || []).map((entry) => {
    const group = new THREE.Group();
    // footprint 6 → 8 (owner 2026-07-12: "hard to see asians at the end").
    mountMiamiAsset(group, 'outplayasiansCrosser', { footprint: 8, yaw: 0 });
    world.add(group);
    return { group, key: entry.key };
  });

  // template at small scale — zero new bundle bytes, one draw call per
  // coin. Coins pop in when the shared template resolves (same loud-
  // failure mounts guard as every generated mount).
  const coinField = buildCoinField(trackDef.key);
  const coinMeshes = coinField.map((coin) => {
    const group = new THREE.Group();
    const sample = sampler.pointAt(coin.progress, coin.lane);
    group.position.copy(sample.point);
    group.position.y += 2.3;
    world.add(group);
    return group;
  });
  // The whole coin field draws as ONE InstancedMesh. children[0] picks
  // the composite's FRONT face node (its 'coin-flip' back-face sibling
  // sits at the scene root and has never rendered — the clones used the
  // same children[0]), so the field is coins × 1 face = 24 instances in
  // one draw call. The per-coin clones this replaces cost 1 call each —
  // that +24-call bill is what sank the HEADLESS SwiftShader proof to
  // minFps 6 while headed truth stayed vsync-144 both tracks (median-of-3
  // evidence phase5-capture-2026-07-11*). The groups above stay as
  // per-coin transform + visibility proxies so collect/respawn/spin
  // logic is untouched.
  const coinInstanced = { faceMatrices: null, mesh: null };
  if (coinField.length) {
    miamiMountStats.requested += 1;
    loadItemBoxTemplate(itemBoxCcCoinUrl).then((template) => {
      const source = template && (template.children[0] || template);
      // Fit rig — same math as the retired per-coin clones (scale to 2.7
      // world units, recenter on the scaled bounds); never added to the
      // scene, only sampled for matrices.
      const rig = source ? source.clone(true) : null;
      const faces = [];
      rig?.traverse((node) => {
        if (node.isMesh && node.geometry) faces.push(node);
      });
      const sharedFaces = faces.filter((face) => face.geometry === faces[0]?.geometry);
      if (sharedFaces.length !== faces.length) {
        console.warn('[kart] coin template faces stopped sharing one geometry — extra faces dropped');
      }
      if (!sharedFaces.length) {
        miamiMountStats.failed += 1;
        console.warn('[kart] coin template failed to load — collectible coins invisible');
        return;
      }
      miamiMountStats.mounted += 1;
      const bounds = new THREE.Box3().setFromObject(rig);
      const size = bounds.getSize(new THREE.Vector3());
      rig.scale.setScalar(2.7 / Math.max(size.x, size.y, size.z));
      rig.updateMatrixWorld(true);
      const fitted = new THREE.Box3().setFromObject(rig);
      rig.position.sub(fitted.getCenter(new THREE.Vector3()));
      // Bake the clone-era per-coin yaw (index * 1.3) into per-face rig
      // matrices; the frame loop composes group pose × baked face matrix,
      // keeping the instanced field transform-identical to the clones.
      coinInstanced.faceMatrices = coinMeshes.map((group, index) => {
        rig.rotation.y = index * 1.3;
        rig.updateMatrixWorld(true);
        return sharedFaces.map((face) => face.matrixWorld.clone());
      });
      const instanced = new THREE.InstancedMesh(
        sharedFaces[0].geometry,
        new THREE.MeshBasicMaterial({ map: sharedFaces[0].material?.map || null }),
        coinMeshes.length * sharedFaces.length
      );
      instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // Instances span the whole track; the shared geometry's bounding
      // sphere is one coin face — never let three.js cull the field by it.
      instanced.frustumCulled = false;
      instanced.castShadow = false;
      instanced.receiveShadow = false;
      world.add(instanced);
      coinInstanced.mesh = instanced;
    });
  }
  trackDef.ramps.forEach((ramp) => addRamp(world, sampler, ramp));
  // K2.5 round 2 (owner 2026-07-12: "bridge still did not read") — the
  // chevron trail now MEANS "launch ahead"; run it up the climb into the
  // crest too so the bridge jump gets the same lead-in as the ramps.
  // Same merged mesh, zero extra draw calls.
  const chevronSites = trackDef.elevation.crestLaunch
    ? [...trackDef.ramps, { progress: crestProgressFor(trackDef), side: 0 }]
    : trackDef.ramps;
  addRampApproachChevrons(world, sampler, chevronSites);
  if (trackDef.shortcut) {
    addRamp(world, sampler, { progress: trackDef.shortcut.launchProgress, side: trackDef.shortcut.side }, { dare: true });
  }
  // Fish Bone pool — meshes recycled to mirror the live fish-bone list each
  // frame (themed banana-class hazard). One merged skeleton geometry per
  // holder keeps the draw count identical to the old single-mesh drop.
  const fishBoneGeometry = (() => {
    const parts = [];
    const spine = new THREE.CylinderGeometry(0.2, 0.2, 4.6, 6);
    spine.rotateX(Math.PI / 2);
    parts.push(spine);
    const skull = new THREE.ConeGeometry(1.05, 1.7, 5);
    skull.rotateX(Math.PI / 2);
    skull.translate(0, 0, 2.9);
    parts.push(skull);
    [-1.55, -0.45, 0.65].forEach((z, order) => {
      const rib = new THREE.CylinderGeometry(0.11, 0.11, 2.3 - order * 0.35, 5);
      rib.translate(0, 0, z);
      parts.push(rib);
    });
    const tail = new THREE.OctahedronGeometry(1.05);
    tail.scale(0.18, 1.5, 1);
    tail.translate(0, 0, -2.85);
    parts.push(tail);
    // The octahedron is non-indexed while cylinders/cones are indexed —
    // mergeGeometries refuses mixed inputs, so normalize first.
    return mergeGeometries(parts.map((part) => part.toNonIndexed()));
  })();
  const fishBonePool = [];
  for (let index = 0; index < 8; index += 1) {
    const holder = new THREE.Group();
    holder.visible = false;
    const bone = new THREE.Mesh(
      fishBoneGeometry,
      createToonMaterial('#F5F8FF', { emissive: '#7EC8E8', emissiveIntensity: 0.32 })
    );
    // Items read oversized on purpose (MK rule) — at race speed and camera
    // distance a true-scale prop disappears. (Round-7 owner feedback:
    // "still pretty hard to tell what they are" → another size/glow step.)
    bone.scale.setScalar(1.5);
    bone.position.y = 2.1;
    holder.add(bone);
    addGlowSprite(holder, '#00E5FF', 9, 0.42, 1.6);
    world.add(holder);
    fishBonePool.push(holder);
  }
  // Projectile pool — the snowball slot renders with a cosmetic per-character
  // skin (identical stats): snowball default, carrot for the CRRT Bunny
  // player, ice shard for the penguin rivals. One variant visible at a time.
  const projectilePool = [];
  for (let index = 0; index < 6; index += 1) {
    const holder = new THREE.Group();
    holder.visible = false;
    const snowball = new THREE.Group();
    snowball.userData.skin = 'snowball';
    snowball.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(2.1, 10, 8),
        createBasicMaterial('#F5F8FF', { emissive: '#00E5FF', emissiveIntensity: 0.7 })
      )
    );
    addGlowSprite(snowball, '#00E5FF', 9, 0.45, 0);
    const carrot = new THREE.Group();
    carrot.userData.skin = 'carrot';
    const carrotBody = new THREE.ConeGeometry(1.5, 5.6, 8);
    carrotBody.rotateX(Math.PI / 2);
    carrot.add(
      new THREE.Mesh(carrotBody, createBasicMaterial('#ff8a2a', { emissive: '#ff7d1f', emissiveIntensity: 0.6 }))
    );
    const carrotLeaf = new THREE.ConeGeometry(0.85, 2.2, 5);
    carrotLeaf.rotateX(-Math.PI / 2);
    carrotLeaf.translate(0, 0, -3.3);
    carrot.add(
      new THREE.Mesh(carrotLeaf, createBasicMaterial('#5fd068', { emissive: '#4cba55', emissiveIntensity: 0.55 }))
    );
    addGlowSprite(carrot, '#ffb066', 10, 0.55, 0);
    const iceShard = new THREE.Group();
    iceShard.userData.skin = 'iceshard';
    const shardGeometry = new THREE.OctahedronGeometry(2.3);
    shardGeometry.scale(0.8, 0.8, 1.6);
    iceShard.add(
      new THREE.Mesh(shardGeometry, createBasicMaterial('#7EC8E8', { emissive: '#00E5FF', emissiveIntensity: 0.8 }))
    );
    addGlowSprite(iceShard, '#00E5FF', 10, 0.55, 0);
    // Rocket Sardine — a little silver fish with a rocket flame, nose-first.
    const sardine = new THREE.Group();
    sardine.userData.skin = 'sardine';
    const sardineBody = new THREE.SphereGeometry(1, 10, 8);
    sardineBody.scale(0.8, 1.0, 2.4);
    sardine.add(
      new THREE.Mesh(sardineBody, createBasicMaterial('#cfe8f4', { emissive: '#9fdcff', emissiveIntensity: 0.6 }))
    );
    const sardineTail = new THREE.OctahedronGeometry(1.0);
    sardineTail.scale(0.16, 1.1, 0.8);
    sardineTail.translate(0, 0, -2.7);
    sardine.add(
      new THREE.Mesh(sardineTail, createBasicMaterial('#b7dcec', { emissive: '#9fdcff', emissiveIntensity: 0.6 }))
    );
    const sardineFlame = new THREE.ConeGeometry(0.7, 2.2, 6);
    sardineFlame.rotateX(-Math.PI / 2);
    sardineFlame.translate(0, 0, -3.6);
    sardine.add(
      new THREE.Mesh(sardineFlame, createBasicMaterial('#FF8C00', { emissive: '#FFD34F', emissiveIntensity: 1.2 }))
    );
    addGlowSprite(sardine, '#FFD34F', 10, 0.55, 0);
    [snowball, carrot, iceShard, sardine].forEach((variant) => {
      variant.visible = false;
      variant.position.y = 1.7;
      holder.add(variant);
    });
    world.add(holder);
    projectilePool.push(holder);
  }
  // Blizzard dome pool — fog hemispheres mirroring the live blizzard list.
  // Two nested transparent shells read as depth without real volumetrics.
  const blizzardPool = [];
  for (let index = 0; index < 3; index += 1) {
    const holder = new THREE.Group();
    holder.visible = false;
    const outer = new THREE.Mesh(
      new THREE.SphereGeometry(15, 18, 12),
      new THREE.MeshBasicMaterial({ color: '#7EC8E8', depthWrite: false, opacity: 0.28, transparent: true })
    );
    outer.scale.set(1, 0.5, 1);
    holder.add(outer);
    const inner = new THREE.Mesh(
      new THREE.SphereGeometry(10, 14, 10),
      new THREE.MeshBasicMaterial({ color: '#F5F8FF', depthWrite: false, opacity: 0.36, transparent: true })
    );
    inner.scale.set(1, 0.5, 1);
    holder.add(inner);
    addGlowSprite(holder, '#00E5FF', 20, 0.22, 5);
    holder.userData.shells = [outer, inner];
    holder.traverse((node) => {
      node.castShadow = false;
    });
    world.add(holder);
    blizzardPool.push(holder);
  }
  // Visible crest kicker — the bridge-top launch was firing invisibly
  // (owner-reported); now a glowing lip strip marks exactly where and why.
  // Only tracks with a real bridge launch get one (flat tracks opt out).
  if (trackDef.elevation.crestLaunch) {
    const crest = wrap01(crestProgressFor(trackDef));
    const { point, tangent } = sampler.pointAt(crest);
    const kicker = new THREE.Group();
    kicker.position.copy(point);
    kicker.rotation.y = Math.atan2(tangent.x, tangent.z);
    kicker.userData.kind = 'crest-kicker';
    const crestWidth = sampler.widthAt(crest) * 0.92;
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(crestWidth, 0.5, 5.4),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#bfeaff').multiplyScalar(1.5) })
    );
    strip.position.y = 0.32;
    kicker.add(strip);
    [-2.0, 0, 2.0].forEach((z, order) => {
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(2.4, 2.8, 3),
        new THREE.MeshBasicMaterial({ color: '#ecfeff', transparent: true, opacity: 0.85 - order * 0.18 })
      );
      arrow.position.set(0, 0.62, z - 0.4);
      arrow.rotation.set(Math.PI / 2, 0, Math.PI);
      arrow.scale.set(2.2, 1, 0.3);
      kicker.add(arrow);
    });
    [-1, 1].forEach((side) => {
      const pylon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.6, 7.5, 6),
        createBasicMaterial('#9fdcff', { emissive: '#9fdcff', emissiveIntensity: 1.0 })
      );
      pylon.position.set(side * (crestWidth / 2 + 1.6), 3.75, 0);
      kicker.add(pylon);
    });
    addGlowSprite(kicker, '#bfeaff', 18, 0.4, 2);
    world.add(kicker);
  }
  addFinishGate(world, sampler, trackDef, trackVisuals);

  // Dev course visualization (?devOverlay=1): temporary debug overlay showing
  // centerline (white), legal lane envelope edges (green), AI racing line
  // (magenta), boost pads (orange), item boxes (cyan), and coin pickup
  // anchors (gold). Diagnostic only — never on by default, zero cost off.
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('devOverlay') === '1') {
    const overlay = new THREE.Group();
    overlay.userData.kind = 'dev-course-overlay';
    const overlayLine = (points, color, y = 1.6) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(p.x, (p.y || 0) + y, p.z)));
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.9 }));
      line.renderOrder = 60;
      overlay.add(line);
    };
    const STEPS = 400;
    const centerPts = [];
    const leftEdge = [];
    const rightEdge = [];
    const aiLine = [];
    for (let i = 0; i <= STEPS; i += 1) {
      const p = i / STEPS;
      const width = sampler.widthAt(p);
      centerPts.push(sampler.pointAt(p, 0).point);
      leftEdge.push(sampler.pointAt(p, -1.16).point);
      rightEdge.push(sampler.pointAt(p, 1.16).point);
      // Approximate AI racing line: apex-seeking bias toward corner inside.
      const ahead = sampler.pointAt(p + 0.01, 0).tangent;
      const here = sampler.pointAt(p, 0).tangent;
      const turn = ahead.x * here.z - ahead.z * here.x;
      aiLine.push(sampler.pointAt(p, THREE.MathUtils.clamp(turn * 6, -0.55, 0.55)).point);
    }
    overlayLine(centerPts, '#ffffff');
    overlayLine(leftEdge, '#3aff88', 1.2);
    overlayLine(rightEdge, '#3aff88', 1.2);
    overlayLine(aiLine, '#ff4fd8', 2.0);
    (trackDef.course.boostPads || []).forEach((padDef) => {
      const { point } = sampler.pointAt(padDef.progress, padDef.side);
      const marker = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff9d2e', depthTest: false }));
      marker.position.copy(point).y += 4;
      marker.renderOrder = 61;
      overlay.add(marker);
    });
    (trackDef.course.itemBoxes || []).forEach((boxDef) => {
      const { point } = sampler.pointAt(boxDef.progress, boxDef.side);
      const marker = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.4, 3.4), new THREE.MeshBasicMaterial({ color: '#54c8ff', depthTest: false }));
      marker.position.copy(point).y += 4;
      marker.renderOrder = 61;
      overlay.add(marker);
    });
    coinField.forEach((coin) => {
      const { point } = sampler.pointAt(coin.progress, coin.lane);
      const marker = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd34f', depthTest: false }));
      marker.position.copy(point).y += 2.6;
      marker.renderOrder = 61;
      overlay.add(marker);
    });
    world.add(overlay);
  }
  const cityMassingCount =
    buildCityMassing({ world, sampler, trackDef, minCenterlineDistance }) +
    buildPenguinVillageMassing({ world, sampler, trackDef, minCenterlineDistance });
  const propCount =
    addDistrictsAndProps(world, sampler, loader, trackDef, trackVisuals) + trackVisualPropCount + cityMassingCount;
  if (trackDef.dressing?.penguinVillage) addPenguinVillageDressing(world, sampler, trackDef);

  // Owner feedback 2026-06-12: karts read ~20% too big against the track.
  const playerModel = createGroundedKartModel({
    accent: playerCharacter.accent,
    color: playerCharacter.color,
    contactGrounding: trackVisuals.enabled,
    gfx,
    scale: KART_SCALE,
  });
  const player = playerModel.group;
  player.userData.kind = 'player-kart';
  // Ice Shield bubble (themed one-hit shield) — faceted ice dome: a low-poly
  // crystal shell with a glowing edge wireframe, plus a ring of ice shards
  // that orbit while the bubble spins.
  const shieldBubble = new THREE.Group();
  shieldBubble.visible = false;
  const shieldShellGeometry = new THREE.IcosahedronGeometry(7.4 * KART_SCALE, 1);
  const shieldShell = new THREE.Mesh(
    shieldShellGeometry,
    // Hero slice: one clean translucent dome — the wireframe facet overlay
    // read as a cracked egg hiding the kart/driver at gameplay distance.
    new THREE.MeshBasicMaterial({ color: '#7EC8E8', depthWrite: false, opacity: 0.1, transparent: true })
  );
  shieldShell.scale.set(1.12, 0.7, 1.3);
  shieldShell.position.y = 3.4;
  shieldBubble.add(shieldShell);
  // Thin equator rim keeps the shield readable as a bubble without a
  // faceted cage around the kart.
  const shieldRim = new THREE.Mesh(
    new THREE.TorusGeometry(7.4 * KART_SCALE, 0.16, 6, 40),
    new THREE.MeshBasicMaterial({ color: '#bfeaff', depthWrite: false, opacity: 0.4, transparent: true })
  );
  shieldRim.rotation.x = Math.PI / 2;
  shieldRim.scale.set(1.12, 1.3, 1);
  shieldRim.position.y = 3.4;
  shieldBubble.add(shieldRim);
  const orbitShardGeometry = new THREE.OctahedronGeometry(0.55);
  orbitShardGeometry.scale(0.7, 1.6, 0.7);
  for (let index = 0; index < 3; index += 1) {
    const shard = new THREE.Mesh(
      orbitShardGeometry,
      createBasicMaterial('#F5F8FF', { emissive: '#00E5FF', emissiveIntensity: 0.5 })
    );
    const angle = (index / 3) * Math.PI * 2;
    shard.position.set(Math.cos(angle) * 7.6 * KART_SCALE, 3.2, Math.sin(angle) * 7.6 * KART_SCALE);
    shard.rotation.y = -angle;
    shieldBubble.add(shard);
  }
  shieldBubble.traverse((node) => {
    node.castShadow = false;
  });
  player.add(shieldBubble);
  // Slap Fish swing rig — a big silver fish on an invisible arm that sweeps
  // a full circle around the kart while the swipe timer runs.
  const slapFishRig = new THREE.Group();
  slapFishRig.visible = false;
  {
    const fish = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(1, 10, 8),
      createBasicMaterial('#cfe8f4', { emissive: '#9fdcff', emissiveIntensity: 0.5 })
    );
    body.scale.set(1.1, 1.5, 3.1);
    fish.add(body);
    const tailGeometry = new THREE.OctahedronGeometry(1.4);
    tailGeometry.scale(0.16, 1.2, 0.9);
    tailGeometry.translate(0, 0, -3.6);
    fish.add(new THREE.Mesh(tailGeometry, createBasicMaterial('#b7dcEC', { emissive: '#9fdcff', emissiveIntensity: 0.5 })));
    fish.position.set(7.6, 4.4, 0);
    slapFishRig.add(fish);
    addGlowSprite(fish, '#bfeaff', 8, 0.4, 0);
    slapFishRig.traverse((node) => {
      node.castShadow = false;
    });
  }
  player.add(slapFishRig);
  // Aurora Boost trail — translucent northern-light ribbons waving behind
  // the kart while invincibility runs. Additive, no depth write, cheap.
  const auroraRig = new THREE.Group();
  auroraRig.visible = false;
  {
    const ribbonCanvas = document.createElement('canvas');
    ribbonCanvas.width = 64;
    ribbonCanvas.height = 256;
    const ribbonCtx = ribbonCanvas.getContext('2d');
    const ribbonGradient = ribbonCtx.createLinearGradient(0, 0, 0, 256);
    ribbonGradient.addColorStop(0, 'rgba(0, 229, 201, 0)');
    ribbonGradient.addColorStop(0.35, 'rgba(57, 255, 140, 0.85)');
    ribbonGradient.addColorStop(0.7, 'rgba(123, 97, 255, 0.75)');
    ribbonGradient.addColorStop(1, 'rgba(0, 229, 201, 0)');
    ribbonCtx.fillStyle = ribbonGradient;
    ribbonCtx.fillRect(0, 0, 64, 256);
    const ribbonTexture = new THREE.CanvasTexture(ribbonCanvas);
    [-2.6, 0, 2.6].forEach((x, order) => {
      const ribbon = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 15),
        new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          map: ribbonTexture,
          side: THREE.DoubleSide,
          transparent: true,
        })
      );
      ribbon.position.set(x, 5 + order * 0.8, -9);
      ribbon.rotation.x = Math.PI / 2 - 0.35;
      ribbon.userData.phase = order * 2.1;
      auroraRig.add(ribbon);
    });
    addGlowSprite(auroraRig, '#39FF8C', 14, 0.35, 3);
  }
  auroraRig.traverse((node) => {
    node.castShadow = false;
  });
  player.add(auroraRig);
  // Avalanche marker — rumble ring during the warning, expanding flash on
  // the burst. Repositioned over the locked target every frame.
  const avalancheMarker = new THREE.Group();
  avalancheMarker.visible = false;
  const avalancheRing = new THREE.Mesh(
    new THREE.TorusGeometry(7.8, 0.55, 6, 26),
    new THREE.MeshBasicMaterial({ color: '#ffffff', depthWrite: false, opacity: 0.85, transparent: true })
  );
  avalancheRing.rotation.x = Math.PI / 2;
  avalancheMarker.add(avalancheRing);
  const avalancheGlow = addGlowSprite(avalancheMarker, '#f4fbff', 16, 0.55, 4);
  avalancheMarker.traverse((node) => {
    node.castShadow = false;
  });
  world.add(avalancheMarker);
  // Penguin March rig — seven marchers repositioned along the crossing
  // every frame. Procedural stand-ins until the roster GLBs swap in.
  const marchRig = new THREE.Group();
  marchRig.visible = false;
  const marchers = [];
  for (let index = 0; index < 7; index += 1) {
    const wrapper = new THREE.Group();
    const inner = new THREE.Group();
    const standIn = new THREE.Group();
    standIn.userData.kind = 'march-fallback';
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 2.1, 4.6, 8),
      createToonMaterial('#1c2433', { emissive: '#0e1420', emissiveIntensity: 0.2 })
    );
    body.position.y = 2.3;
    standIn.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), createToonMaterial('#1c2433'));
    head.position.y = 5.2;
    standIn.add(head);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), createToonMaterial('#f4f8ff'));
    belly.scale.set(0.8, 1.3, 0.55);
    belly.position.set(1.0, 2.5, 0);
    standIn.add(belly);
    inner.add(standIn);
    wrapper.add(inner);
    wrapper.traverse((node) => {
      node.castShadow = false;
    });
    marchRig.add(wrapper);
    marchers.push({ inner, wrapper });
  }
  world.add(marchRig);
  world.add(player);
  const rivalModels = rivalSeats.map((rival) => {
    // Roster cohesion (major rebuild): rivals race the SAME grounded hero
    // kart + seated penguin system as the player, at near-equal mass, in
    // their own livery. One kart language on track; identity comes from
    // color/accent, not a smaller weaker model.
    const model = createGroundedKartModel({
      accent: rival.accent,
      color: rival.color,
      // Rivals stay on the cheap toon body path even on 'high' — three PBR
      // hero bodies are per-pixel cost nobody reads at chase distance.
      gfx: { ...gfx, name: 'low' },
      scale: 0.94,
    });
    model.group.userData.kind = 'grounded-rival-kart';
    // Roster draw-call diet: fold the static body trim + seated penguin into
    // one mesh per material. Wheels stay grouped so spin/steer still animate.
    mergeStaticMeshesByMaterial(model.bodyGroup);
    model.driverMount.children.forEach((child) => {
      if (child.isGroup) mergeStaticMeshesByMaterial(child);
    });
    model.group.traverse((node) => {
      node.castShadow = false;
    });
    world.add(model.group);
    return { ...rival, model };
  });

  return {
    auroraRig,
    avalancheGlow,
    avalancheMarker,
    avalancheRing,
    // Baked-GLB load state machine (pending -> active | missing). The
    // bakedBuildings machine retired with the W0 promotion — buildings
    // come from the Miami GLBs now, guarded by miamiMountStats in
    // telemetry (kart-playable FAILS if any requested mount doesn't
    // resolve — the 2026-07-02 silent-404 lesson carries over).
    bakedSpike: 'inactive',
    marchers,
    marchRig,
    blizzardPool,
    // Exactly one of bloomPass (legacy chain) / bloomEffect (?post=1 pmndrs
    // chain) is non-null; branch on postChainEnabled before touching either.
    bloomPass,
    bloomEffect,
    postChainEnabled: Boolean(postChainEnabled),
    // Adaptive quality: true when a software rasterizer was detected (and not
    // overridden by ?swQuality=full). Widens the frame dt clamp in the loop.
    softwareGL: softwareQualityAdapted(),
    boostPads,
    fishBonePool,
    projectilePool,
    slapFishRig,
    coinField,
    coinInstanced,
    coinMeshes,
    crosserRigs,
    camera,
    composer,
    // B1: atmosphere handles exposed so B2's palette moments can lerp
    // fog/hemi/sun/rim at runtime (scene.fog is reachable via scene).
    hemi,
    itemBoxes,
    // B2: precompiled per-lap palette moments (null = none for this race);
    // consumed by applyPaletteMoments in the frame loop.
    paletteMoments,
    playerModel,
    propCount,
    renderer,
    rimLight,
    rivalModels,
    sampler,
    scene,
    shieldBubble,
    sun,
    sunFill,
    // Graphics overhaul handles: the PMREM env probe to dispose on teardown,
    // and the resolved preset for any per-frame feature checks.
    gfxEnv,
    gfx,
    // Phase 2: particle systems + post-FX driver for the frame loop.
    gfxParticles,
    gfxPostFx,
    // Active bloom base for the Phase-2 speed swell (multiplied per frame).
    gfxBloomBase,
    trackVisualsEnabled: trackVisuals.enabled,
    world,
  };
};

const RENDER_STATS_REFRESH_MS = 750;
const geometryTriangleCounts = new WeakMap();

const triangleCountForGeometry = (geometry) => {
  if (!geometry) return 0;
  const cached = geometryTriangleCounts.get(geometry);
  if (cached !== undefined) return cached;
  const indexCount = geometry.index?.count || geometry.attributes?.position?.count || 0;
  const triangles = Math.floor(indexCount / 3);
  geometryTriangleCounts.set(geometry, triangles);
  return triangles;
};

const estimateSceneRenderStats = (world, renderer) => {
  const geometries = new Set();
  let drawCalls = 0;
  let meshCount = 0;
  let triangles = 0;
  world.traverse((object) => {
    if (!object.visible || (!object.isMesh && !object.isInstancedMesh)) return;
    meshCount += 1;
    const materialCount = Array.isArray(object.material) ? object.material.length : 1;
    drawCalls += materialCount;
    if (object.geometry) {
      geometries.add(object.geometry.uuid);
      const baseTriangles = triangleCountForGeometry(object.geometry);
      triangles += baseTriangles * (object.isInstancedMesh ? object.count || 1 : 1);
    }
  });
  return {
    drawCalls,
    geometries: geometries.size,
    meshCount,
    // B3 acceptance check: the rim must add exactly one shared program
    // variant (merged customProgramCacheKey), never one per material.
    programs: renderer.info.programs?.length ?? null,
    shadowMapEnabled: renderer.shadowMap.enabled,
    textures: renderer.info.memory.textures,
    triangles,
  };
};

// Signed curvature of the track toward +lane at progress (1/world units).
// Drives the centrifugal understeer push — corners are no longer free.
const trackCurvatureAt = (sampler, progress) => {
  const deltaUnits = 3;
  const a = sampler.pointAt(progress);
  const b = sampler.pointAt(progress + deltaUnits / sampler.length);
  return (
    ((b.tangent.x - a.tangent.x) * a.normal.x + (b.tangent.z - a.tangent.z) * a.normal.z) /
    deltaUnits
  );
};

// Lane-units/s the corner shoves the kart toward the outside wall. Lateral
// demand grows with speed² (real centripetal physics) so carrying speed into
// a corner costs road where crawling doesn't — that's the slow/steer/drift
// decision. κ^0.7 compresses the spread between bends and the seam hairpin.
// Calibration (κ^0.7 · v² · 0.00052 vs steer 0.72 / drift 1.15): gentle
// bends need active steering at top speed, the p90 corners are full-speed
// only in a drift, the hairpin caps a full drift near ~150.
const cornerPushFor = (kappa, speed) =>
  -Math.sign(kappa) * Math.min(4, Math.pow(Math.abs(kappa), 0.7) * speed * speed * 0.00052);

// Autoplay item sense: the demo driver dodges what a human sees — fish
// bones sitting ahead on its line and rival snowballs closing from behind.
// Deterministic, progress-space windows (~0.02 of a lap ≈ 50-60 wu) so it
// stays track-size agnostic. Without this, kart-vs-kart contact keeps the
// autoplay kart in real traffic where rival item gates connect (the old
// ghost-through overtakes dodged items by accident, not by skill).
const autoplayDodgeBias = (race) => {
  let bias = 0;
  const away = (threatLane) =>
    threatLane === race.lane ? (threatLane >= 0 ? -1 : 1) : Math.sign(race.lane - threatLane);
  race.fishBones?.forEach((bone) => {
    const aheadBy = wrap01(bone.progress - race.progress);
    if (aheadBy < 0.022 && Math.abs(bone.lane - race.lane) < 0.34) {
      bias += away(bone.lane) * (1 - aheadBy / 0.022);
    }
  });
  race.projectiles?.forEach((ball) => {
    const behindBy = wrap01(race.progress - ball.progress);
    if (ball.owner !== 'player' && behindBy < 0.025 && Math.abs(ball.lane - race.lane) < 0.3) {
      bias += away(ball.lane) * (1 - behindBy / 0.025);
    }
  });
  // K4: dodge crossers the same way rivals do — they're slow and partial
  // width, so a lane change always clears them (kart-playable's gate).
  race.crossers?.instances?.forEach((crosser) => {
    const aheadBy = wrap01(crosser.progress - race.progress);
    if (aheadBy < 0.03 && Math.abs(crosser.lane - race.lane) < 0.5) {
      bias += away(crosser.lane) * (1 - aheadBy / 0.03) * 1.4;
    }
  });
  return clamp(bias, -1, 1);
};

const readInput = (input, autoplay, race, cornerPush = 0) => {
  if (!autoplay) return input.current;
  // Steer against the centrifugal push (into the corner) plus a pull back
  // toward road center, with the item-dodge bias strong enough to beat the
  // center pull; drift the demanding bends, brake for the hairpin, trick
  // when airborne, fire held items on straights. Deterministic.
  const desired = clamp(-cornerPush * 1.4 - race.lane * 0.9 + autoplayDodgeBias(race) * 1.2, -1, 1);
  return {
    brake: Math.abs(cornerPush) > 1.5,
    drift: (Math.abs(cornerPush) > 0.55 && race.speed > 80) || race.airState.airborne,
    item: Boolean(race.heldItem) && Math.abs(cornerPush) < 0.3,
    left: desired < -0.12,
    restart: false,
    right: desired > 0.12,
    throttle: true,
  };
};

const rollingAverage = (samples) => {
  if (!samples.length) return null;
  let total = 0;
  for (const value of samples) total += value;
  return Number((total / samples.length).toFixed(2));
};

const publishTelemetry = (
  race,
  fpsEstimate,
  propCount,
  mode,
  characterKey = DEFAULT_CHARACTER_KEY,
  kartKey = 'hero',
  trackKey = DEFAULT_TRACK_KEY,
  runtimeStats = {}
) => {
  if (typeof window === 'undefined') return;
  const trackVisualsEnabled = Boolean(window.__comebackCityKartTrackVisualsEnabled);
  window.__comebackCityKartTelemetry = {
    airborne: race.airState.airborne,
    auroraActive: race.auroraTimer > 0,
    avalanchePending: Boolean(race.avalanche),
    audioMuted: runtimeStats.audioMuted ?? null,
    audioRunning: runtimeStats.audioRunning ?? false,
    bakedSpike: runtimeStats.bakedSpike ?? null,
    // W0 loud-failure guard: kart-playable asserts mounted === requested
    // and failed === 0 on comeback-city (module-level counters — they
    // accumulate across scene rebuilds, growing in lockstep).
    miamiMounts: runtimeStats.miamiMounts ?? null,
    marchActive: Boolean(race.march),
    avalancheTarget: race.avalanche?.target || race.avalancheTarget || null,
    blizzardsOnTrack: race.blizzards.length,
    character: characterKey,
    kart: kartKey,
    track: trackKey,
    trackVisualsEnabled,
    laps: race.laps,
    slapping: race.slapTimer > 0,
    fishBonesOnTrack: race.fishBones.length,
    boostHits: race.boostHits,
    coins: race.coins,
    countdown: Number(race.countdown.toFixed(2)),
    drift: race.drift,
    driftCharge: Number(race.driftCharge.toFixed(2)),
    driftTier: race.driftTier,
    finished: race.finished,
    frameElapsedMs: runtimeStats.frameElapsedMs ?? null,
    frameWorkMs: runtimeStats.frameWorkMs ?? null,
    heldItem: race.heldItem,
    fpsEstimate: Math.round(fpsEstimate),
    itemPickups: race.itemPickups,
    lane: Number(race.lane.toFixed(3)),
    lap: race.lap,
    miniTurbo: Number(race.driftState.miniTurboTimer.toFixed(2)),
    miniTurboTier: race.driftState.miniTurboTier,
    paletteMomentsEnabled: Boolean(runtimeStats.paletteMoments),
    position: race.position,
    propCount,
    postChainEnabled: Boolean(runtimeStats.postChainEnabled),
    proofCameraMode: runtimeStats.proofCameraMode || 'chase',
    raceTime: Number(race.raceTime.toFixed(2)),
    renderer: 'three-kart',
    rendererStats: runtimeStats.rendererStats || null,
    rivalCount: RIVALS.length,
    rivalPositions: rivalPositionsOf((race.finished ? race.laps : race.lap - 1) + race.progress, race.rivals),
    route: mode === 'spike' ? 'race-3d-spike' : 'race',
    routeProgress: Number(race.progress.toFixed(3)),
    speed: Math.round(race.speed),
    spinOuts: race.spinOuts,
    steer: Number(race.steer.toFixed(2)),
    tricksLanded: race.tricksLanded,
    visualAssetSet: VISUAL_ASSET_SET,
    wallContact: Boolean(race.wallContact),
  };
};

// One icon source for every held-item surface (top badge, throw button,
// held-item chip, pickup pop, intro item guide). K7 rendered tiles replace the
// lucide stand-ins. Exported so the intro guide ALWAYS matches the HUD.
export const ITEM_ICON_URLS = {
  aurora: itemAuroraIconUrl,
  avalanche: itemAvalancheIconUrl,
  blizzard: itemBlizzardIconUrl,
  cocoa: itemCocoaIconUrl,
  fishbone: itemFishboneIconUrl,
  iceshield: itemIceshieldIconUrl,
  march: itemMarchIconUrl,
  sardine: itemSardineIconUrl,
  slapfish: itemSlapfishIconUrl,
};
// The snowball slot wears the character's projectile skin.
const SNOWBALL_SKIN_ICON_URLS = {
  carrot: itemCarrotIconUrl,
  iceshard: itemIceshardIconUrl,
  snowball: itemSnowballIconUrl,
};

export const HeldItemIcon = ({ heldItem, projectileSkin, size = 15 }) => {
  const src =
    heldItem === 'snowball'
      ? SNOWBALL_SKIN_ICON_URLS[projectileSkin] || SNOWBALL_SKIN_ICON_URLS.snowball
      : ITEM_ICON_URLS[heldItem] || SNOWBALL_SKIN_ICON_URLS.snowball;
  return (
    <img
      alt=""
      draggable={false}
      height={size}
      src={src}
      style={{ borderRadius: Math.max(3, Math.round(size * 0.2)), display: 'block', objectFit: 'cover' }}
      width={size}
    />
  );
};

const heldItemLabel = (heldItem, projectileSkin) => {
  if (heldItem === 'snowball') {
    if (projectileSkin === 'carrot') return 'CARROT';
    if (projectileSkin === 'snowball') return 'SNOWBALL';
    return 'ICE SHARD';
  }
  return ITEM_LABELS[heldItem] || heldItem.toUpperCase();
};

export const ComebackCityThreeKartRace = ({
  character = DEFAULT_CHARACTER_KEY,
  kart = null,
  mode = 'race',
  onFinish = null,
  onRestart = null,
  reducedMotion = false,
  runId = 1,
  track = DEFAULT_TRACK_KEY,
}) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  // Synthesized race audio (zero assets): context unlocks on first gesture,
  // cues derive from state transitions inside updateFrame — see kartAudio.js.
  const audioRef = useRef(null);
  const [audioMuted, setAudioMuted] = useState(() => readStoredMute());
  useEffect(() => {
    // Created inside the effect (not render) so a StrictMode double-mount
    // gets a fresh manager after the first cleanup disposed it.
    const audio = createKartAudio({ muted: readStoredMute() });
    audioRef.current = audio;
    audio.attach();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') audio.suspend();
      else audio.resume();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      audio.dispose();
      audioRef.current = null;
    };
  }, []);
  // steerAxis: analog float from the touch joystick (null = digital keys
  // rule); autoThrottle: coarse-pointer sessions accelerate by default (K3).
  const inputRef = useRef({ autoThrottle: false, brake: false, drift: false, item: false, left: false, restart: false, right: false, steerAxis: null, throttle: false });
  const finishReportedRef = useRef(false);
  const [snapshot, setSnapshot] = useState(createInitialRace);
  const [webglError, setWebglError] = useState(null);
  // K7 chip revision, owner pick B (2026-07-12): a new pickup pops the item's
  // icon oversized for ~0.6s (MK-style "you got X"), then the normal chip/
  // button display carries it. Purely cosmetic — input and item semantics
  // untouched.
  const [itemPop, setItemPop] = useState(null);
  const lastHeldItemRef = useRef(null);
  useEffect(() => {
    const held = snapshot.heldItem;
    if (held && held !== lastHeldItemRef.current) {
      setItemPop({ item: held, at: Date.now() });
      lastHeldItemRef.current = held;
      const timer = setTimeout(() => setItemPop(null), 680);
      return () => clearTimeout(timer);
    }
    lastHeldItemRef.current = held;
    return undefined;
  }, [snapshot.heldItem]);
  const autoplay = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('playableAutoplay') === '1' || params.get('raceAutoplay') === '1';
  }, []);
  // K3 touch controls gate: coarse pointers get the joystick + cluster and
  // auto-accel; fine pointers (desktop) get NO touch UI (keyboard only).
  // ?touchControls=1/0 forces either way (QA + synthetic-pointer smoke).
  const touchControls = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const forced = new URLSearchParams(window.location.search).get('touchControls');
    if (forced === '1') return true;
    if (forced === '0') return false;
    return window.matchMedia?.('(pointer: coarse)')?.matches === true;
  }, []);
  useEffect(() => {
    inputRef.current = { ...inputRef.current, autoThrottle: touchControls && !autoplay };
  }, [touchControls, autoplay]);
  // Gyro steering opt-in (owner 2026-07-12: "how possible would a gyro
  // mobile option be"): tilt maps to the same analog steerAxis; the thumb
  // always wins while a drag is active. iOS requires a user-gesture
  // permission prompt, which is why this is a toggle, not a default.
  const [tiltEnabled, setTiltEnabled] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage?.getItem('cc-kart-tilt') === '1';
    } catch {
      return false;
    }
  });
  const toggleTilt = async () => {
    if (!tiltEnabled && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') return;
      } catch {
        return;
      }
    }
    // NO fullscreen/orientation.lock attempts (owner 2026-07-12: "the
    // camera changes when it goes into fullscreen mode and looks wild") —
    // iOS half-supports the pair and the transitions thrashed the viewport
    // mid-race. The counter-rotation soft lock below is THE mechanism on
    // every platform: stable, no mode switches.
    setTiltEnabled((value) => {
      const next = !value;
      try {
        window.localStorage?.setItem('cc-kart-tilt', next ? '1' : '0');
      } catch {
        /* private mode */
      }
      return next;
    });
  };
  // Soft lock (owner 2026-07-12: "my phone starts changing the landscape so
  // it was hard to test" + "it should be played widescreen for better
  // experience so make it happen"): on touch devices the RACE always
  // presents landscape — a portrait viewport gets the whole game
  // counter-rotated 90°. The drag/flick axes and tilt roll mapping swap
  // with it. iPhone has no web orientation lock, so this IS the lock.
  const [softLandscape, setSoftLandscape] = useState(false);
  const softLandscapeRef = useRef(false);
  useEffect(() => {
    if (!touchControls || typeof window === 'undefined') {
      softLandscapeRef.current = false;
      setSoftLandscape(false);
      return undefined;
    }
    const evaluate = () => {
      const portrait = window.innerHeight > window.innerWidth;
      softLandscapeRef.current = portrait;
      setSoftLandscape(portrait);
    };
    evaluate();
    window.addEventListener('resize', evaluate);
    window.addEventListener('orientationchange', evaluate);
    return () => {
      window.removeEventListener('resize', evaluate);
      window.removeEventListener('orientationchange', evaluate);
      softLandscapeRef.current = false;
      setSoftLandscape(false);
    };
  }, [touchControls]);
  // Entering/leaving the soft lock re-lays-out the canvas without any
  // window resize — nudge the engine's fit handler after the class lands.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const raf = window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    return () => window.cancelAnimationFrame(raf);
  }, [softLandscape]);
  useEffect(() => {
    if (!tiltEnabled || typeof window === 'undefined') return undefined;
    const onOrientation = (event) => {
      if (joystickStateRef.current.active) return; // an active drag always wins
      // Portrait steering roll = gamma; landscape = ±beta (device axes are
      // defined in portrait frame, so remap by the screen angle). Under the
      // soft lock the OS *reports* portrait but the phone is physically
      // landscape — roll is beta, signed by which way round it's held
      // (gamma's sign tells landscape-left from landscape-right).
      const angle = window.screen?.orientation?.angle ?? window.orientation ?? 0;
      const beta = event.beta ?? 0;
      const gamma = event.gamma ?? 0;
      const roll = softLandscapeRef.current
        ? beta * (gamma >= 0 ? 1 : -1)
        : angle === 90 ? beta : angle === 270 || angle === -90 ? -beta : gamma;
      const axis = Math.abs(roll) < 2.5 ? 0 : clamp(roll / 22, -1, 1);
      inputRef.current = { ...inputRef.current, steerAxis: axis };
    };
    window.addEventListener('deviceorientation', onOrientation);
    return () => {
      window.removeEventListener('deviceorientation', onOrientation);
      if (!joystickStateRef.current.active) inputRef.current = { ...inputRef.current, steerAxis: null };
    };
  }, [tiltEnabled]);
  // Seat/kart/track come from props ONLY. The old ?character/?kart/?track
  // URL overrides let a stale param (e.g. a shared lab link) silently beat
  // the cup-select pick (roadmap W1: "penguin village is loading the miami
  // vice vibes"). QA keeps the params: RaceScreen seeds its select state
  // from the URL on mount, and kart-playtest.html passes them as props.
  const characterKey = useMemo(
    () => (KART_CHARACTERS.some((entry) => entry.key === character) ? character : DEFAULT_CHARACTER_KEY),
    [character]
  );
  const playerCharacter = characterByKey(characterKey);
  // Kart is picked separately; defaults to the character's signature ride.
  const kartKey = useMemo(() => {
    if (kart && KART_OPTIONS.some((entry) => entry.key === kart)) return kart;
    return playerCharacter.kart;
  }, [kart, playerCharacter]);
  const playerKart = kartByKey(kartKey);
  const trackKey = useMemo(
    () => (KART_TRACKS.some((entry) => entry.key === track) ? track : DEFAULT_TRACK_KEY),
    [track]
  );
  const trackVisualsEnabled = useMemo(() => {
    // Track schema dressing remains opt-in while this slice concentrates on
    // kart/body/post/trackside readability and frame budget.
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('trackVisuals') === '1' || params.get('trackVisualSchema') === '1';
  }, []);
  const proofCameraMode = useMemo(() => {
    if (typeof window === 'undefined') return 'chase';
    return new URLSearchParams(window.location.search).get('proofCamera') === 'top' ? 'top' : 'chase';
  }, []);
  // Resolved once — the chase block runs per frame and must not parse URLs.
  const camLab = useMemo(() => camLabConfig(), []);
  const postChainEnabled = useMemo(() => {
    // ?post=1 keeps the pmndrs chain reachable for A/B and diagnosis. The
    // shipped vertical slice defaults to direct effects-off rendering.
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('post') === '1';
  }, []);
  const trackDef = trackByKey(trackKey);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const crestProgress = crestProgressFor(trackDef);
    const startProgress = startProgressFor(trackDef);
    const rivalSeats = rivalSeatsFor(characterKey);
    const engine = createScene({
      canvas,
      onUnavailable: (error) => setWebglError(error?.message || 'WebGL unavailable'),
      playerCharacter,
      postChainEnabled,
      rivalSeats,
      trackDef,
      trackVisualsEnabled,
    });
    if (!engine) return undefined;
    if (typeof window !== 'undefined') window.__comebackCityKartTrackVisualsEnabled = engine.trackVisualsEnabled;
    engineRef.current = engine;
    finishReportedRef.current = false;
    const race = createInitialRace(rivalSeats, trackDef);
    // ?itemShowcase=1 parks one of each item visual just past the spawn and
    // raises the ice shield — deterministic close-ups for the approval
    // previews (the live moments are too fast for polled screenshots).
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('itemShowcase') === '1') {
      // Road-edge lanes — the rivals start ahead and sweep the straight, and
      // anything inside their racing line gets eaten before the camera
      // arrives.
      race.fishBones.push({ grace: 0, lane: -0.8, owner: 'showcase', progress: wrap01(startProgress + 0.038) });
      race.projectiles.push(
        { lane: 0.8, owner: 'showcase', progress: wrap01(startProgress + 0.044), skin: 'carrot', speed: 0, ttl: 9999 },
        { lane: -0.8, owner: 'showcase', progress: wrap01(startProgress + 0.05), skin: 'iceshard', speed: 0, ttl: 9999 }
      );
      race.shieldActive = true;
    }
    // ?giveItem=<key> keeps that item in the slot whenever it's empty —
    // deterministic captures/tests of any single item (autoplay fires it on
    // the next straight).
    const giveItemKey =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('giveItem')
        : null;
    const viewport = { aspect: 1, dpr: 1, height: 1, mobile: false, width: 1 };
    const frameTimes = [];
    // A2 instrumentation: UNCLAMPED frame-to-frame elapsed vs post-render work
    // time. The elapsed/work split is what exposed the legacy rAF-throttling
    // artifact (1.6ms work inside 52.9ms elapsed frames) — fpsEstimate alone
    // cannot distinguish "GPU-bound" from "browser throttled".
    const frameElapsedSamples = [];
    const frameWorkSamples = [];
    let raf = 0;
    let disposed = false;
    let previousFrameTime = performance.now();
    let snapshotTimer = 0;

    const setInputKey = (key, value) => {
      inputRef.current = { ...inputRef.current, [key]: value };
    };
    const keyMap = {
      ArrowDown: 'brake',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'throttle',
      Enter: 'item',
      KeyA: 'left',
      KeyD: 'right',
      KeyE: 'item',
      KeyF: 'item',
      KeyR: 'restart',
      KeyS: 'brake',
      KeyW: 'throttle',
      ShiftLeft: 'item',
      ShiftRight: 'item',
      Space: 'drift',
    };
    const handleKeyDown = (event) => {
      const key = keyMap[event.code];
      if (!key) return;
      event.preventDefault();
      setInputKey(key, true);
    };
    const handleKeyUp = (event) => {
      const key = keyMap[event.code];
      if (!key) return;
      event.preventDefault();
      setInputKey(key, false);
    };
    const handleResize = () => {
      fitRaceRendererToCanvas({
        camera: engine.camera,
        canvas,
        raceViewport: viewport,
        renderer: engine.renderer,
      });
      if (engine.postChainEnabled) {
        // pmndrs composer has no setPixelRatio; third arg false keeps the
        // canvas CSS that fitRaceRendererToCanvas just set. The legacy 30%
        // bloom-target hack is obsolete under mipmapBlur.
        const dbw = canvas.width;
        const dbh = canvas.height;
        engine.composer.setSize(viewport.width, viewport.height, false);
        if (import.meta.env.DEV && (canvas.width !== dbw || canvas.height !== dbh)) {
          console.warn('[kart] pmndrs composer.setSize changed the drawing buffer', {
            before: { width: dbw, height: dbh },
            after: { width: canvas.width, height: canvas.height },
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);
    handleResize();

    // Authored GLB swaps stay available for roster/contact-sheet work, but the
    // vertical-slice default keeps the procedural kart, seated driver, item
    // boxes, and item VFX fallbacks. Those forms are faster, deterministic in
    // headless proof, and satisfy the effects-off hero-frame gate.
    const useAuthoredRuntimeAssets =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('authoredAssets') === '1';
    if (useAuthoredRuntimeAssets) {
      loadKartAssets()
        .then(({ colormapImage, driverScenes, itemBoxScene, itemPropScenes, kartScenes, racerScene }) => {
        if (disposed || engineRef.current !== engine) return;
        // ?kenneyKart=1 keeps the recolored Kenney body reachable for
        // comparison on the player kart; it is also the automatic fallback
        // when a character's authored kart GLB fails to load.
        const wantsKenneyKart =
          typeof window !== 'undefined' &&
          new URLSearchParams(window.location.search).get('kenneyKart') === '1';
        const attachCharacter = (model, characterEntry, isPlayer) => {
          // The player's kart pick overrides the character's signature ride.
          const kartKind = isPlayer ? kartKey : characterEntry.kart;
          const authoredKart =
            kartKind !== 'kenney' && !(isPlayer && wantsKenneyKart) ? kartScenes[kartKind] : null;
          if (authoredKart) {
            attachTripoKartBody(model, authoredKart, isPlayer, KART_NOSE_YAW[kartKind] ?? -Math.PI / 2);
          } else {
            // Drag-racer silhouette is long and slim — fit it larger than
            // the hero body so every kart reads the same mass.
            attachAuthoredKartBody(
              model,
              racerScene,
              makeKartPaletteTexture(colormapImage, characterEntry.color),
              isPlayer,
              18.2
            );
          }
          const driverScene = driverScenes[characterEntry.key];
          if (driverScene) {
            mountDriverAvatar(model, driverScene, {
              castsShadow: false,
              height: characterEntry.driverHeight,
              yaw: characterEntry.driverYaw,
            });
          }
        };
        attachCharacter(engine.playerModel, playerCharacter, true);
        // K7: rendered item props take over from the procedural stand-ins.
        swapItemPropVisuals(engine, itemPropScenes);
        // Penguin March marchers: swap the stand-ins for the real roster
        // penguins, cycling through every penguin character — the train
        // gets richer automatically as the owner adds ordinals.
        const penguinKeys = KART_CHARACTERS.filter((entry) => entry.projectileSkin === 'iceshard').map(
          (entry) => entry.key
        );
        engine.marchers.forEach((marcher, index) => {
          const scene = driverScenes[penguinKeys[index % penguinKeys.length]];
          if (!scene) return;
          const fallback = marcher.inner.children.find((child) => child.userData.kind === 'march-fallback');
          const rig = scene.clone(true);
          rig.traverse((node) => {
            if (node.isMesh) {
              node.material = applyHeroRim(
                new THREE.MeshToonMaterial({
                  gradientMap: getToonGradient(),
                  map: node.material?.map || null,
                })
              );
              node.castShadow = false;
            }
          });
          const bounds = new THREE.Box3().setFromObject(rig);
          const size = bounds.getSize(new THREE.Vector3());
          rig.scale.setScalar(7 / Math.max(0.0001, size.y));
          rig.updateMatrixWorld(true);
          const fitted = new THREE.Box3().setFromObject(rig);
          const center = fitted.getCenter(new THREE.Vector3());
          rig.position.set(-center.x, -fitted.min.y, -center.z);
          if (fallback) marcher.inner.remove(fallback);
          marcher.inner.add(rig);
        });
        // W2 owner picks (2026-07-07): per-track GENERATED item boxes —
        // the golden ₿ coin on Comeback City, the ₿-frozen-in-ice cube on
        // Penguin Village ("keep the bottom two ... the icebox one for
        // penguin city and the other for comeback city"). The Kenney cube
        // stays as the fallback if the generated GLB fails (visible, not
        // silent) and the load counts into the telemetry mounts guard.
        const itemMaterial = applyHeroRim(
          new THREE.MeshToonMaterial({
            gradientMap: getToonGradient(),
            map: makeKartPaletteTexture(colormapImage),
          })
        );
        const generatedBoxUrl = ITEM_BOX_ASSETS[trackDef.key];
        if (generatedBoxUrl) miamiMountStats.requested += 1;
        (generatedBoxUrl ? loadItemBoxTemplate(generatedBoxUrl) : Promise.resolve(null)).then((boxTemplate) => {
          if (disposed || engineRef.current !== engine) return;
          if (generatedBoxUrl) {
            if (boxTemplate) miamiMountStats.mounted += 1;
            else {
              miamiMountStats.failed += 1;
              console.warn(`[kart] generated item box failed to load — Kenney fallback (track ${trackDef.key})`);
            }
          }
          engine.itemBoxes.forEach((box) => {
            [...box.children]
              .filter(
                (child) =>
                  child.userData.kind === 'item-cube-fallback' || child.userData.kind === 'item-question'
              )
              .forEach((child) => {
                child.geometry?.dispose?.();
                child.material?.dispose?.();
                box.remove(child);
              });
            const rig = (boxTemplate || itemBoxScene).clone(true);
            rig.traverse((node) => {
              if (node.isMesh) {
                // Generated boxes keep their own baked texture inside the
                // hero toon+rim family (marcher pattern); the Kenney
                // fallback keeps the shared kart palette.
                node.material = boxTemplate
                  ? applyHeroRim(
                      new THREE.MeshToonMaterial({
                        gradientMap: getToonGradient(),
                        map: node.material?.map || null,
                      })
                    )
                  : itemMaterial;
                node.castShadow = true;
              }
            });
            const bounds = new THREE.Box3().setFromObject(rig);
            const size = bounds.getSize(new THREE.Vector3());
            rig.scale.setScalar(7.4 / Math.max(size.x, size.y, size.z));
            rig.updateMatrixWorld(true);
            const fitted = new THREE.Box3().setFromObject(rig);
            rig.position.sub(fitted.getCenter(new THREE.Vector3()));
            // The coin spins upright on the group's Y rotation (faces on
            // ±X); the ice cube takes a playful tilt like the old crate.
            if (boxTemplate && trackDef.key === 'penguin-village') rig.rotation.z = 0.2;
            box.add(rig);
          });
        });
        })
        .catch(() => {
          // Procedural fallback bodies stay in place.
        });
    }

    // Blender bake spike (A/B): ?bakedSpike=1 overlays the offline-baked
    // gym-sweeper shell (public/baked-spike.glb) on the procedural road.
    // Rendered unlit — all lighting is in the baked texture.
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('bakedSpike') === '1') {
      engine.bakedSpike = 'pending';
      createGameGltfLoader().load(
        '/baked-spike.glb',
        (gltf) => {
          if (disposed || engineRef.current !== engine) return;
          const shell = gltf.scene;
          shell.traverse((node) => {
            if (node.isMesh) {
              node.material = new THREE.MeshBasicMaterial({ map: node.material?.map || null });
              node.castShadow = false;
              node.receiveShadow = false;
            }
          });
          shell.position.y = 0.12;
          shell.userData.kind = 'baked-spike-shell';
          engine.world.add(shell);
          engine.bakedSpike = 'active';
        },
        undefined,
        (error) => {
          console.warn('[kart] /baked-spike.glb failed to load — spike overlay skipped', error);
          engine.bakedSpike = 'missing';
        }
      );
    }

    // The /baked-buildings.glb loader retired with the W0 promotion: the
    // buildings it swapped in were the old procedural boxes' bakes, and
    // both are gone — trackside buildings are the Miami GLBs, mounted in
    // addDistrictsAndProps/addMiamiTrackside with miamiMountStats as the
    // loud-failure guard.

    const restartRace = () => {
      Object.assign(race, createInitialRace(rivalSeats));
      // Coin rows reset with the race (carried count already zeroed above).
      if (engine.coinField) {
        respawnCoins(engine.coinField);
        engine.coinMeshes.forEach((mesh) => {
          mesh.visible = true;
        });
      }
      finishReportedRef.current = false;
      onRestart?.();
    };

    const updateVehiclePose = (group, sample, steer = 0, drift = false, pose = null) => {
      group.position.copy(sample.point);
      group.position.y += 0.05 + (pose?.hop || 0);
      // Player pose carries the smoothed drift slide yaw (kart visibly points
      // off its velocity direction); rivals keep the simple steer-based yaw.
      // extraYaw carries trick spins and spin-outs for either.
      const yawOffset = pose ? pose.slideYaw + steer * (drift ? 0 : 0.16) : steer * (drift ? 0.32 : 0.16);
      group.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z) - yawOffset + (pose?.extraYaw || 0);
      group.rotation.z = pose ? -(pose.slideYaw * 0.3 + steer * 0.1) : -steer * 0.12;
      group.rotation.x =
        Math.sin(race.raceTime * 12) * clamp(race.speed / MAX_SPEED, 0, 1) * 0.025 - (pose?.pitch || 0);
      if (pose) group.scale.y = pose.squash;
    };
    const spinOutYaw = (spinTimer) =>
      spinTimer > 0 ? (1 - spinTimer / ITEM_FEEL.spinDuration) * Math.PI * 2 : 0;

    let cachedRendererStats = estimateSceneRenderStats(engine.world, engine.renderer);
    let nextRendererStatsRefresh = performance.now() + RENDER_STATS_REFRESH_MS;
    const rendererStatsForFrame = (now) => {
      if (now >= nextRendererStatsRefresh) {
        cachedRendererStats = estimateSceneRenderStats(engine.world, engine.renderer);
        nextRendererStatsRefresh = now + RENDER_STATS_REFRESH_MS;
      }
      return cachedRendererStats;
    };

    const frame = () => {
      if (disposed) return;
      const now = performance.now();
      // Unclamped delta sampled BEFORE the physics clamp — throttled frames
      // must show their real length here even though the sim clamps to 40ms.
      frameElapsedSamples.push(now - previousFrameTime);
      while (frameElapsedSamples.length > 40) frameElapsedSamples.shift();
      // Keep normal-frame physics identical, but avoid proof/browser
      // time-dilation when headless Chromium throttles rAF. The cap is still
      // bounded so a background-tab pause cannot explode the simulation.
      // Software-GL sessions (CPU rasterizer) get a wider clamp so the sim
      // stays real-time at single-digit frame rates — same integration,
      // just longer steps, matching what autoplay already does.
      const maxFrameDt = autoplay ? 0.5 : engine.softwareGL ? 0.25 : 0.12;
      const rawDt = Math.min(maxFrameDt, Math.max(0.001, (now - previousFrameTime) / 1000));
      previousFrameTime = now;
      const dt = reducedMotion ? rawDt * 0.86 : rawDt;
      frameTimes.push(now);
      while (frameTimes.length > 12) frameTimes.shift();
      const elapsedWindow = frameTimes.length > 1 ? (frameTimes[frameTimes.length - 1] - frameTimes[0]) / 1000 : 1;
      // 12-frame window: at single-digit rates (software GL) a 40-frame
      // average lags 10+ seconds behind the real rate and poisons sustained
      // samples long after the warmup ramp is over. 12 frames stays smooth
      // at 60fps yet responds within ~2s at 5fps.
      const fpsEstimate = frameTimes.length > 1 ? (frameTimes.length - 1) / Math.max(0.001, elapsedWindow) : 60;
      const cornerPush = cornerPushFor(trackCurvatureAt(engine.sampler, race.progress), race.speed);
      const input = readInput(inputRef, autoplay, race, cornerPush);
      if (input.restart) {
        inputRef.current.restart = false;
        restartRace();
      }
      if (!race.finished) {
        race.countdown = Math.max(0, race.countdown - dt);
        if (race.countdown <= 0) {
          race.raceTime += dt;
          if (race.shortcut.active) {
            // Shortcut flight: the kart soars over the carousel infield —
            // ground physics, pads, boxes and fish bones are all skipped.
            if (input.drift && !race.shortcut.styled) race.shortcut.styled = true;
            const flight = updateShortcut(race.shortcut, trackDef.shortcut, dt);
            const landTarget = race.shortcut.failed ? trackDef.shortcut.failLandProgress : trackDef.shortcut.landProgress;
            race.previousProgress = race.progress;
            race.progress = lerp(race.shortcut.fromProgress, landTarget, race.shortcut.t);
            if (!race.shortcut.failed) race.lane = lerp(race.shortcut.fromLane, -0.1, race.shortcut.t);
            if (flight.landed) {
              race.landSquashTimer = 0.18;
              if (flight.failed) {
                race.spinTimer = trackDef.shortcut.failSpin;
                race.bumpCooldown = KART_CONTACT.spinCooldown;
                race.spinOuts += 1;
                race.speed = trackDef.shortcut.failSpeed;
              } else if (race.shortcut.styled) {
                race.driftState.miniTurboTier = 2;
                race.driftState.miniTurboTimer = DRIFT_FEEL.boostDurations[1];
                race.driftState.releaseFlashTimer = DRIFT_FEEL.releaseFlash;
              }
            }
          } else {
          // Touch sessions auto-accelerate (brake overrides); the joystick's
          // analog steerAxis wins over the digital left/right keys when live.
          const throttle = (input.autoThrottle ? !input.brake : input.throttle) ? 1 : 0;
          const brake = input.brake ? 1 : 0;
          const targetSteer = input.steerAxis ?? ((input.right ? 1 : 0) - (input.left ? 1 : 0));
          race.steer = lerp(race.steer, targetSteer, 1 - Math.pow(0.001, dt));
          const driftState = race.driftState;
          const airState = race.airState;
          const spinning = race.spinTimer > 0;
          race.spinTimer = Math.max(0, race.spinTimer - dt);
          // While airborne or spun out, the drift machine sees no input —
          // launching a ramp ends a drift, spinning cancels one.
          const driftEvents = updateDriftFeel(driftState, {
            dt,
            held: Boolean(input.drift) && !airState.airborne && !spinning,
            speed: race.speed,
            steer: race.steer,
          });
          race.drift = driftState.active;
          race.driftCharge = driftState.charge;
          race.driftTier = driftState.tier;
          if (driftEvents.landed) race.landSquashTimer = 0.14;
          race.landSquashTimer = Math.max(0, race.landSquashTimer - dt);
          if (driftEvents.released > 0) {
            race.speed = clamp(race.speed + DRIFT_FEEL.boostKick[driftEvents.released - 1], 0, BOOST_SPEED);
          }
          // Ramps and the bridge crest launch the kart; the drift button
          // doubles as the trick button mid-air (MK-style).
          if (!airState.airborne && !spinning) {
            trackDef.ramps.forEach((ramp) => {
              if (
                shortProgressDelta(race.progress, ramp.progress) * engine.sampler.length <
                  TRICK_FEEL.rampHitProgress &&
                Math.abs(race.lane - ramp.side) < TRICK_FEEL.rampHitLane
              ) {
                launchAir(airState, race.speed);
              }
            });
            if (
              trackDef.elevation.crestLaunch &&
              race.previousProgress < crestProgress &&
              race.progress >= crestProgress
            ) {
              launchAir(airState, race.speed, { big: true });
            }
            // The dare ramp: commit with boost speed or eat a long spin-out.
            // Only present on tracks that define a shortcut.
            if (
              trackDef.shortcut &&
              shortProgressDelta(race.progress, trackDef.shortcut.launchProgress) * engine.sampler.length <
                TRICK_FEEL.rampHitProgress &&
              Math.abs(race.lane - trackDef.shortcut.side) < TRICK_FEEL.rampHitLane &&
              race.speed > 120
            ) {
              launchShortcut(race.shortcut, trackDef.shortcut, race.speed, race.progress, race.lane);
            }
          }
          const airEvents = updateAir(airState, { actionHeld: Boolean(input.drift), dt });
          if (airEvents.landed) race.landSquashTimer = 0.16;
          if (airEvents.trickTier > 0) {
            race.tricksLanded += 1;
            driftState.miniTurboTier = airEvents.trickTier;
            driftState.miniTurboTimer = DRIFT_FEEL.boostDurations[airEvents.trickTier - 1];
            driftState.releaseFlashTimer = DRIFT_FEEL.releaseFlash;
            race.speed = clamp(race.speed + DRIFT_FEEL.boostKick[airEvents.trickTier - 1] * 0.8, 0, BOOST_SPEED);
          }
          if (giveItemKey && !race.heldItem && race.countdown <= 0) race.heldItem = giveItemKey;
          // Held item fire: cocoa boost, ice shield, fish bone behind, a
          // snowball forward (rendered with the character's projectile
          // skin), a slap-fish swipe, or the avalanche ultimate.
          race.itemFireCooldown = Math.max(0, race.itemFireCooldown - dt);
          if (input.item && race.heldItem && race.itemFireCooldown <= 0) {
            if (race.heldItem === 'cocoa') {
              driftState.miniTurboTier = 2;
              driftState.miniTurboTimer = DRIFT_FEEL.boostDurations[1];
              driftState.releaseFlashTimer = DRIFT_FEEL.releaseFlash;
              race.speed = clamp(race.speed + DRIFT_FEEL.boostKick[1], 0, BOOST_SPEED);
            } else if (race.heldItem === 'iceshield') {
              race.shieldActive = true;
            } else if (race.heldItem === 'fishbone') {
              dropFishBone(race.fishBones, 'player', race.progress, race.lane, engine.sampler.length);
            } else if (race.heldItem === 'snowball') {
              throwSnowball(race.projectiles, 'player', race.progress, race.lane, race.speed, playerCharacter.projectileSkin);
            } else if (race.heldItem === 'slapfish') {
              race.slapTimer = SLAP_FISH.swingDuration;
              slapFishHitsFor(race.rivals, 'player', race.progress, race.lane, engine.sampler.length).forEach(
                (name) => {
                  const struck = race.rivals.find((rival) => rival.name === name);
                  if (struck) {
                    struck.spinTimer = ITEM_FEEL.spinDuration;
                    struck.bumpCooldown = KART_CONTACT.spinCooldown;
                  }
                }
              );
            } else if (race.heldItem === 'avalanche') {
              // Lock onto whoever leads RIGHT NOW — possibly a regret.
              const leadRival = race.rivals.reduce(
                (best, rival) => (totalProgressOf(rival) > totalProgressOf(best) ? rival : best),
                race.rivals[0]
              );
              const target =
                race.position === 1 || !leadRival ? 'player' : leadRival.name;
              race.avalanche = { by: 'player', target, timer: AVALANCHE.warningDuration };
            } else if (race.heldItem === 'sardine') {
              const playerTotalNow = race.lap - 1 + race.progress;
              throwSardine(
                race.projectiles,
                'player',
                race.progress,
                race.lane,
                race.speed,
                sardineTargetFor(race.rivals, playerTotalNow)
              );
            } else if (race.heldItem === 'blizzard') {
              dropBlizzard(race.blizzards, 'player', race.progress, race.lane, engine.sampler.length);
            } else if (race.heldItem === 'aurora') {
              race.auroraTimer = AURORA.duration;
              race.speed = clamp(race.speed + AURORA.speedKick, 0, BOOST_SPEED);
            } else if (race.heldItem === 'march') {
              race.march = startMarch(race.progress, engine.sampler.length);
            }
            race.heldItem = null;
            race.itemFireCooldown = 0.35;
          }
          race.boostTimer = Math.max(0, race.boostTimer - dt);
          race.auroraTimer = Math.max(0, race.auroraTimer - dt);
          const auroraActive = race.auroraTimer > 0;
          // Kart stats: top speed cap, throttle accel, and steering rate all
          // scale with the chosen kart (hero = 1/1/1, the gate baseline).
          // Carried ₿ coins nudge the cap a little (classic kart-coin rule;
          // capped in coinSpeedMultiplier).
          const maxSpeed =
            (race.boostTimer > 0 || driftState.miniTurboTimer > 0 || auroraActive ? BOOST_SPEED : MAX_SPEED) *
            playerKart.stats.topSpeed *
            coinSpeedMultiplier(race.coins);
          const accel = throttle && !spinning ? 118 * playerKart.stats.accel : spinning ? -150 : -48;
          const miniTurboAccel = driftState.miniTurboTimer > 0 ? 150 : auroraActive ? 130 : 0;
          const brakeDrag = brake ? -180 : 0;
          const steeringDrag = Math.abs(race.steer) * (race.drift ? -8 : -22);
          race.speed = clamp(race.speed + (accel + miniTurboAccel + brakeDrag + steeringDrag) * dt, 0, maxSpeed);
          if (!throttle && !brake) race.speed = Math.max(0, race.speed - 38 * dt);
          if (spinning) race.speed = Math.max(46, race.speed);
          // Blizzard fog caps grounded karts — yours included. Fly over it,
          // steer around it, or plow through it with an aurora.
          if (
            !airState.airborne &&
            !auroraActive &&
            insideBlizzard(race.blizzards, race.progress, race.lane, engine.sampler.length)
          ) {
            race.speed = Math.min(race.speed, BLIZZARD.capSpeed);
          }
          // While drifting the slide owns the lane: direction is locked,
          // steering tightens/widens the arc instead of switching sides.
          // The corner push shoves toward the outside wall — the player must
          // steer or drift through bends, they are no longer automatic.
          // Airborne karts fly straight (no lane control, no corner push);
          // spun-out karts barely steer.
          if (!airState.airborne) {
            const steerAuthority = spinning ? 0.12 : 1;
            const laneRate =
              (race.drift ? driftLaneRate(driftState, race.steer) * 1.15 : race.steer * 0.72) *
              steerAuthority *
              playerKart.stats.handling;
            race.lane = clamp(race.lane + (laneRate + cornerPush) * dt, -0.95, 0.95);
            race.wallContact =
              (race.lane >= 0.95 && laneRate + cornerPush > 0) ||
              (race.lane <= -0.95 && laneRate + cornerPush < 0);
            // Wall scrape bleeds speed until the corner becomes holdable.
            if (race.wallContact) race.speed = Math.max(70, race.speed - 200 * dt);
          } else {
            race.wallContact = false;
          }
          race.previousProgress = race.progress;
          race.progress = wrap01(race.progress + (race.speed / engine.sampler.length) * dt);
          if (race.previousProgress > 0.86 && race.progress < 0.18) {
            race.lap += 1;
            if (race.lap > race.laps) {
              race.lap = race.laps;
              race.finished = true;
              race.speed = 0;
            }
            // Coin rows respawn every lap (carried coins keep their bonus).
            if (engine.coinField) {
              respawnCoins(engine.coinField);
              engine.coinMeshes.forEach((mesh) => {
                mesh.visible = true;
              });
            }
          }
          // ₿ coins: grab on drive-through; a spin-out START shakes a few
          // loose (single detection point so every spin source counts).
          if (engine.coinField && !airState.airborne) {
            collectCoinsForFrame(engine.coinField, race.progress, race.lane, engine.sampler.length).forEach(
              (id) => {
                race.coins += 1;
                const mesh = engine.coinMeshes[id];
                if (mesh) mesh.visible = false;
              }
            );
          }
          const spinningNow = race.spinTimer > 0;
          if (spinningNow && !race.wasSpinning) race.coins = coinsAfterSpin(race.coins);
          race.wasSpinning = spinningNow;
          trackDef.course.boostPads.forEach((pad) => {
            const key = `boost-${pad.key}`;
            if (shortProgressDelta(race.progress, pad.progress) < 0.012 && Math.abs(race.lane - (pad.side || 0)) < 0.36) {
              if (!race[key]) {
                race[key] = true;
                race.boostHits += 1;
                race.boostTimer = 1.15;
              }
            } else if (shortProgressDelta(race.progress, pad.progress) > 0.04) {
              race[key] = false;
            }
          });
          trackDef.course.itemBoxes.forEach((box, index) => {
            const key = `item-${index}`;
            if (shortProgressDelta(race.progress, box.progress) < 0.014 && Math.abs(race.lane - (box.side || 0)) < 0.42) {
              if (!race[key]) {
                race[key] = true;
                race.itemPickups += 1;
                if (!race.heldItem)
                  race.heldItem = itemForPickup(index, race.lap, race.position, race.lap === race.laps);
              }
            } else if (shortProgressDelta(race.progress, box.progress) > 0.05) {
              race[key] = false;
            }
          });
          // Fish bones: age drop-immunity, then check the player (airborne
          // karts fly over them; an ice shield eats the hit instead of
          // spinning out).
          ageFishBones(race.fishBones, dt);
          updateBlizzards(race.blizzards, dt);
          if (race.march && updateMarch(race.march, dt)) race.march = null;
          // Rivals are the homing targets sardines steer toward.
          updateProjectiles(race.projectiles, dt, engine.sampler.length, race.rivals);
          // The waddle-train spins anyone grounded who runs the line (an
          // aurora plows through; an ice shield eats the hit).
          if (
            race.march &&
            !airState.airborne &&
            !spinning &&
            race.spinTimer <= 0 &&
            race.auroraTimer <= 0 &&
            marchHitFor(race.march, race.progress, race.lane, engine.sampler.length)
          ) {
            if (race.shieldActive) {
              race.shieldActive = false;
            } else {
              race.spinTimer = ITEM_FEEL.spinDuration;
              race.bumpCooldown = KART_CONTACT.spinCooldown;
              race.spinOuts += 1;
              race.speed *= 0.45;
            }
          }
          // K4: crosser hazards — advance the pure sim, drive the rigs, and
          // hit the player march-style (grace timer stops per-frame re-hits
          // while overlapping the same slow walker).
          if (race.crossers) {
            updateCrossersForFrame({ crossers: race.crossers, dt });
            race.crosserGraceTimer = Math.max(0, race.crosserGraceTimer - dt);
            engine.crosserRigs.forEach((rig, index) => {
              const instance = race.crossers.instances[index];
              if (!instance) return;
              const sample = engine.sampler.pointAt(instance.progress, instance.lane);
              rig.group.position.copy(sample.point);
              // Face the walk direction: +normal is the +lane axis; the
              // mesh fronts +Z, so yaw comes straight from the walk vector.
              const walkX = sample.normal.x * instance.direction;
              const walkZ = sample.normal.z * instance.direction;
              rig.group.rotation.y = Math.atan2(walkX, walkZ);
            });
            if (
              !airState.airborne &&
              race.spinTimer <= 0 &&
              race.auroraTimer <= 0 &&
              race.crosserGraceTimer <= 0 &&
              crosserHitFor({
                crossers: race.crossers,
                lane: race.lane,
                progress: race.progress,
                trackLength: engine.sampler.length,
              })
            ) {
              if (race.shieldActive) {
                race.shieldActive = false;
                race.crosserGraceTimer = 1.2;
              } else {
                race.spinTimer = ITEM_FEEL.spinDuration;
                race.bumpCooldown = KART_CONTACT.spinCooldown;
                race.spinOuts += 1;
                race.speed *= 0.45;
                race.crosserGraceTimer = 1.6;
              }
            }
          }
          if (!airState.airborne && !spinning && race.spinTimer <= 0) {
            const struck = projectileHitFor(race.projectiles, 'player', race.progress, race.lane, engine.sampler.length);
            if (struck && race.auroraTimer <= 0) {
              // (an aurora'd kart still destroys the projectile — it just
              // doesn't care)
              if (race.shieldActive) {
                race.shieldActive = false;
              } else {
                race.spinTimer = ITEM_FEEL.spinDuration;
                race.bumpCooldown = KART_CONTACT.spinCooldown;
                race.spinOuts += 1;
                race.speed *= 0.5;
              }
            }
          }
          if (!airState.airborne && !spinning) {
            const fishBoneHit = fishBoneHitFor(race.fishBones, 'player', race.progress, race.lane, engine.sampler.length);
            if (fishBoneHit && race.auroraTimer <= 0) {
              if (race.shieldActive) {
                race.shieldActive = false;
              } else {
                race.spinTimer = ITEM_FEEL.spinDuration;
                race.bumpCooldown = KART_CONTACT.spinCooldown;
                race.spinOuts += 1;
                race.speed *= 0.5;
                driftState.active = false;
                driftState.charge = 0;
                driftState.tier = 0;
              }
            }
          }
          }
          // Rivals run their own race; contact separates karts every frame
          // and a square rear hit spins the slower kart (both directions).
          race.bumpCooldown = Math.max(0, race.bumpCooldown - dt);
          const playerTotal = (race.finished ? race.laps : race.lap - 1) + race.progress;
          const { avalancheBy, playerBump, playerNudgeLane, playerSpin } = updateRivalRacers(race.rivals, {
            boostPads: trackDef.course.boostPads,
            boostSpeed: BOOST_SPEED,
            cornerPushFor,
            blizzards: race.blizzards,
            crossers: race.crossers,
            march: race.march,
            crestProgress: crestProgress,
            curvatureAt: (progress) => trackCurvatureAt(engine.sampler, progress),
            dt,
            finalLap: race.lap === race.laps,
            fishBones: race.fishBones,
            laneScale: engine.sampler.widthAt(race.progress) * 0.44,
            maxSpeed: MAX_SPEED,
            ramps: trackDef.ramps,
            projectiles: race.projectiles,
            player: {
              // Shortcut flight never touches airState — it must still
              // count as airborne or the sim spins rivals the player is
              // flying 26 wu above (and vice versa).
              airborne: race.airState.airborne || race.shortcut.active,
              aurora: race.auroraTimer > 0,
              bumpCooldown: race.bumpCooldown,
              lane: race.lane,
              progress: race.progress,
              speed: race.speed,
              spinning: race.spinTimer > 0,
              total: playerTotal,
            },
            raceTime: race.raceTime,
            trackLength: engine.sampler.length,
            wallLane: 0.95,
          });
          // Separation is continuous (karts never render through each
          // other); the bump impulse stays cooldown-gated.
          if (playerNudgeLane) race.lane = clamp(race.lane + playerNudgeLane, -0.95, 0.95);
          if (playerBump) {
            race.bumpCooldown = playerBump.cooldown;
            race.lane = clamp(race.lane + playerBump.lanePush, -0.95, 0.95);
            race.speed *= playerBump.speedScale;
          }
          // A rival landed a perfect rear hit on the player. The ice shield
          // holds against a physical shove (and is NOT consumed — unlike
          // item hits); aurora invulnerability is handled in the sim.
          // Never mid-flight (airState or shortcut) and never on/after the
          // finish frame (race.finished parks the player at speed 0, which
          // would read as an easy rear-hit target).
          if (
            playerSpin &&
            race.spinTimer <= 0 &&
            !race.finished &&
            !race.airState.airborne &&
            !race.shortcut.active &&
            !race.shieldActive
          ) {
            race.spinTimer = ITEM_FEEL.spinDuration;
            race.bumpCooldown = KART_CONTACT.spinCooldown;
            race.spinOuts += 1;
            race.speed *= KART_CONTACT.spinSpeedScale;
            race.driftState.active = false;
            race.driftState.charge = 0;
            race.driftState.tier = 0;
          }
          race.position = playerPositionOf(playerTotal, race.rivals);
          // A desperate last-place rival just fired the leader-killer.
          if (avalancheBy && !race.avalanche) {
            const leadRival = race.rivals.reduce(
              (best, rival) => (totalProgressOf(rival) > totalProgressOf(best) ? rival : best),
              race.rivals[0]
            );
            const target = race.position === 1 || !leadRival ? 'player' : leadRival.name;
            race.avalanche = { by: avalancheBy, target, timer: AVALANCHE.warningDuration };
          }
          // Avalanche countdown: rumble the target, then bury them. It
          // pierces the ice shield — being P1 is supposed to be scary.
          race.slapTimer = Math.max(0, race.slapTimer - dt);
          race.avalancheBurst = Math.max(0, race.avalancheBurst - dt);
          if (race.avalanche) {
            race.avalanche.timer -= dt;
            if (race.avalanche.timer <= 0) {
              if (race.avalanche.target === 'player') {
                race.spinTimer = AVALANCHE.spinDuration;
                race.bumpCooldown = KART_CONTACT.spinCooldown;
                race.spinOuts += 1;
                race.speed *= AVALANCHE.speedScale;
                race.driftState.active = false;
                race.driftState.charge = 0;
                race.driftState.tier = 0;
              } else {
                const buried = race.rivals.find((rival) => rival.name === race.avalanche.target);
                if (buried) {
                  buried.spinTimer = AVALANCHE.spinDuration;
                  buried.bumpCooldown = KART_CONTACT.spinCooldown;
                  buried.speed = Math.max(46, buried.speed * AVALANCHE.speedScale);
                }
              }
              race.avalancheBurst = 0.45;
              race.avalancheTarget = race.avalanche.target;
              race.avalanche = null;
            }
          }
        }
      }

      const driftState = race.driftState;
      // Hop squash & stretch: slight stretch while airborne, quick squash on
      // landing, eased back to neutral.
      const squashTarget = driftState.hopTimer > 0 ? 1.07 : race.landSquashTimer > 0 ? 0.86 : 1;
      race.squash = lerp(race.squash, squashTarget, 1 - Math.pow(0.000001, dt));
      const playerSample = engine.sampler.pointAt(race.progress, race.lane);
      updateVehiclePose(engine.playerModel.group, playerSample, race.steer, race.drift, {
        extraYaw:
          race.airState.spin +
          spinOutYaw(race.spinTimer) +
          (race.shortcut.active && race.shortcut.styled ? race.shortcut.t * Math.PI * 2 : 0),
        hop:
          hopHeightFor(driftState.hopTimer) +
          race.airState.height +
          (race.shortcut.active ? shortcutArcHeight(race.shortcut, trackDef.shortcut) : 0),
        pitch: airPitchFor(race.airState) + shortcutPitchFor(race.shortcut),
        slideYaw: driftState.slideYaw,
        squash: race.squash,
      });
      engine.shieldBubble.visible = race.shieldActive;
      if (race.shieldActive) {
        engine.shieldBubble.rotation.y += dt * 1.6;
      }
      // Slap Fish sweep: one full revolution across the swing window.
      engine.slapFishRig.visible = race.slapTimer > 0;
      if (race.slapTimer > 0) {
        engine.slapFishRig.rotation.y = (1 - race.slapTimer / SLAP_FISH.swingDuration) * Math.PI * 2;
      }
      // Penguin March: reposition the waddle-train along the crossing —
      // single file across the road, bobbing and rocking as they go.
      engine.marchRig.visible = Boolean(race.march);
      if (race.march) {
        const crossing = engine.sampler.pointAt(race.march.progress, 0);
        const facingYaw = Math.atan2(-crossing.normal.z, crossing.normal.x);
        engine.marchers.forEach((marcher, index) => {
          const lane = race.march.head - ((index + 0.5) / engine.marchers.length) * MARCH.trainLength;
          marcher.wrapper.visible = lane > MARCH.startLane + 0.05 && lane < MARCH.endLane - 0.05;
          if (!marcher.wrapper.visible) return;
          const spot = engine.sampler.pointAt(race.march.progress, lane);
          marcher.wrapper.position.copy(spot.point);
          marcher.wrapper.rotation.y = facingYaw;
          marcher.inner.position.y = Math.abs(Math.sin(race.raceTime * 9 + index * 1.7)) * 0.55;
          marcher.inner.rotation.z = Math.sin(race.raceTime * 9 + index * 1.7) * 0.12;
        });
      }
      // Aurora ribbons sway and shimmer while invincibility runs.
      engine.auroraRig.visible = race.auroraTimer > 0;
      if (race.auroraTimer > 0) {
        engine.auroraRig.children.forEach((ribbon) => {
          if (ribbon.isMesh) {
            ribbon.rotation.z = Math.sin(race.raceTime * 3 + ribbon.userData.phase) * 0.35;
            ribbon.material.opacity = 0.65 + Math.sin(race.raceTime * 6 + ribbon.userData.phase) * 0.3;
          }
        });
      }
      // Avalanche marker: pulsing rumble ring over the locked target during
      // the warning, an expanding flash on the burst.
      {
        const markerTarget = race.avalanche ? race.avalanche.target : race.avalancheBurst > 0 ? race.avalancheTarget : null;
        engine.avalancheMarker.visible = Boolean(markerTarget);
        if (markerTarget) {
          const targetGroup =
            markerTarget === 'player'
              ? engine.playerModel.group
              : engine.rivalModels.find((rival) => rival.name === markerTarget)?.model.group;
          if (targetGroup) {
            engine.avalancheMarker.position.copy(targetGroup.position);
            engine.avalancheMarker.position.y += 5;
          }
          if (race.avalanche) {
            const pulse = 1 + Math.sin(race.raceTime * 16) * 0.18;
            engine.avalancheMarker.scale.setScalar(pulse);
            engine.avalancheRing.material.opacity = 0.85;
            engine.avalancheGlow.material.opacity = 0.55;
          } else {
            const burst = 1 - race.avalancheBurst / 0.45;
            engine.avalancheMarker.scale.setScalar(1 + burst * 2.6);
            engine.avalancheRing.material.opacity = 0.85 * (1 - burst);
            engine.avalancheGlow.material.opacity = 0.8 * (1 - burst);
          }
        }
      }
      engine.projectilePool.forEach((holder, index) => {
        const ball = race.projectiles[index];
        holder.visible = Boolean(ball);
        if (ball) {
          const sample = engine.sampler.pointAt(ball.progress, ball.lane);
          holder.position.copy(sample.point);
          holder.position.y += 0.3;
          // Face the direction of travel so carrots and shards read as
          // thrown things; rolling around the travel axis sells the speed.
          holder.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z);
          holder.children.forEach((variant) => {
            const active = variant.userData.skin === (ball.skin || 'snowball');
            variant.visible = active;
            if (active) variant.rotation.z += dt * 9;
          });
        }
      });
      // Blizzard domes: mirror the live list, swirl slowly, fade out over
      // the last second of their life.
      engine.blizzardPool.forEach((holder, index) => {
        const cloud = race.blizzards[index];
        holder.visible = Boolean(cloud);
        if (cloud) {
          const sample = engine.sampler.pointAt(cloud.progress, cloud.lane);
          holder.position.copy(sample.point);
          holder.rotation.y += dt * 0.8;
          const fade = Math.min(1, cloud.ttl / 1.2);
          holder.userData.shells[0].material.opacity = 0.3 * fade;
          holder.userData.shells[1].material.opacity = 0.4 * fade;
        }
      });
      // Mirror the live fish-bone list onto the pooled meshes.
      engine.fishBonePool.forEach((holder, index) => {
        const bone = race.fishBones[index];
        holder.visible = Boolean(bone);
        if (bone) {
          const sample = engine.sampler.pointAt(bone.progress, bone.lane);
          holder.position.copy(sample.point);
          holder.position.y += 0.2;
          holder.rotation.y += dt * 2.2;
        }
      });
      const miniTurboActive = driftState.miniTurboTimer > 0;
      engine.playerModel.boostFlame.visible = race.boostTimer > 0 || miniTurboActive;
      engine.playerModel.boostFlame.children.forEach((flame) => {
        flame.scale.setScalar(miniTurboActive ? 1 + driftState.miniTurboTier * 0.22 : 1);
        // Tier-3 mini-turbo burns violet — the MK ultra-turbo read; everything
        // else keeps the stock amber flame.
        flame.material.emissive?.set(
          miniTurboActive && driftState.miniTurboTier >= 3 ? '#C879FF' : '#FFD34F'
        );
      });
      // Drift sparks escalate through the tier colors while charging and
      // flash big in the banked tier's color on release. Banking a new tier
      // fires a one-shot pop (ring burst + spark punch) so the tier change
      // reads as an event at race speed.
      const releaseFlash = !race.drift && driftState.releaseFlashTimer > 0;
      const tierPop = engine.playerModel.driftTierPop;
      if (race.drift && driftState.tier > tierPop.lastTier) {
        tierPop.timer = 0.45;
        tierPop.tier = driftState.tier;
      }
      if (!race.drift && !releaseFlash) tierPop.timer = 0;
      tierPop.lastTier = race.drift ? driftState.tier : 0;
      tierPop.timer = Math.max(0, tierPop.timer - dt);
      const tierPopPunch = tierPop.timer / 0.45;
      engine.playerModel.driftSparkGroup.visible = race.drift || releaseFlash;
      if (engine.playerModel.driftSparkGroup.visible) {
        const sparkTier = releaseFlash ? driftState.miniTurboTier : driftState.tier;
        const sparkColor = DRIFT_FEEL.sparkColors[sparkTier] || DRIFT_FEEL.sparkColors[0];
        engine.playerModel.driftSparkGroup.children.forEach((spark, sparkIndex) => {
          spark.material.color.set(sparkColor);
          spark.material.emissive?.set(sparkColor);
          if (spark.material.emissiveIntensity !== undefined) {
            spark.material.emissiveIntensity = 0.55 + sparkTier * 0.18;
          }
          // Fountain arc off the rear wheels — faster and taller per tier so
          // the spray itself carries the tier read, not just the color.
          const rest = spark.userData;
          const arc = race.raceTime * (9 + sparkTier * 3) + rest.phase;
          spark.position.set(
            rest.side * (rest.baseX + Math.sin(arc * 0.8) * 0.3 + sparkTier * 0.2),
            rest.baseY + Math.abs(Math.sin(arc)) * (0.5 + sparkTier * 0.35),
            rest.baseZ - Math.abs(Math.sin(arc * 0.6)) * (0.5 + sparkTier * 0.4)
          );
          spark.scale.setScalar(
            0.7 +
              sparkTier * 0.3 +
              Math.sin(race.raceTime * 22 + sparkIndex * 1.7) * 0.18 +
              (releaseFlash ? 0.9 : 0) +
              tierPopPunch * 0.5
          );
        });
      }
      // Tier-up pop ring: one fast expand+fade burst in the new tier's color.
      const popRing = engine.playerModel.driftTierPopRing;
      popRing.visible = tierPopPunch > 0;
      if (popRing.visible) {
        const popColor = DRIFT_FEEL.sparkColors[tierPop.tier] || DRIFT_FEEL.sparkColors[0];
        popRing.material.color.set(popColor);
        popRing.material.emissive?.set(popColor);
        popRing.material.opacity = 0.9 * tierPopPunch;
        popRing.scale.setScalar(0.5 + (1 - tierPopPunch) * (1.9 + tierPop.tier * 0.2));
      }
      // Tier 2+ ground trail: visible while charging tier 2/3 drift, tinted
      // to the live tier color (amber → violet) to double the readable area.
      const iceTrailTier = race.drift ? driftState.tier : 0;
      engine.playerModel.driftIceTrailGroup.visible = iceTrailTier >= 2;
      if (engine.playerModel.driftIceTrailGroup.visible) {
        const trailColor = DRIFT_FEEL.sparkColors[iceTrailTier] || DRIFT_FEEL.sparkColors[0];
        engine.playerModel.driftIceTrailGroup.children.forEach((shard, shardIndex) => {
          const trailIntensity = 0.6 + (iceTrailTier - 2) * 0.35;
          shard.material.color.set(trailColor);
          shard.material.emissive?.set(trailColor);
          shard.material.opacity = 0.5 + trailIntensity * 0.45 + Math.sin(race.raceTime * 18 + shardIndex * 1.3) * 0.12;
          shard.material.emissiveIntensity = 0.55 + trailIntensity * 0.45;
          shard.scale.setScalar(0.9 + trailIntensity * 0.45 + Math.sin(race.raceTime * 14 + shardIndex * 2.1) * 0.12);
        });
      }
      // Mini-turbo burst ring: scale up + fade out for the boost duration,
      // in the banked tier's color.
      const ring = engine.playerModel.miniTurboRing;
      ring.visible = miniTurboActive;
      if (miniTurboActive) {
        const ringColor = DRIFT_FEEL.sparkColors[driftState.miniTurboTier] || DRIFT_FEEL.sparkColors[1];
        ring.material.color.set(ringColor);
        ring.material.emissive?.set(ringColor);
        const ringDuration = DRIFT_FEEL.boostDurations[driftState.miniTurboTier - 1] || 1;
        const ringProgress = 1 - driftState.miniTurboTimer / ringDuration;
        const ringScale = 0.35 + ringProgress * (1.7 + driftState.miniTurboTier * 0.25);
        ring.scale.setScalar(ringScale);
        ring.material.opacity = 0.95 * (1 - ringProgress);
      }
      engine.playerModel.wheels.forEach((wheel) => {
        wheel.rotation.x -= dt * race.speed * 0.12;
        if (wheel.userData.front) wheel.rotation.y = race.steer * 0.38;
      });
      engine.playerModel.idleFlames.forEach((flame, flameIndex) => {
        flame.visible = race.speed > 16;
        const heat = clamp(race.speed / MAX_SPEED, 0, 1);
        flame.scale.setScalar(0.65 + heat * 0.65 + Math.sin(race.raceTime * 26 + flameIndex * 2.1) * 0.16);
      });
      engine.itemBoxes.forEach((box, index) => {
        box.rotation.y += dt * 1.4;
        box.position.y += Math.sin(race.raceTime * 2.4 + index) * 0.012;
        box.visible = !race[`item-${index}`] || race.finished;
        box.children.forEach((child) => {
          if (child.userData.kind === 'item-question') child.lookAt(engine.camera.position);
        });
      });
      engine.coinMeshes.forEach((group, index) => {
        if (!group.visible) return;
        group.rotation.y += dt * 2.6;
        group.position.y += Math.sin(race.raceTime * 3 + index * 0.7) * 0.01;
      });
      if (engine.coinInstanced?.mesh) {
        const { faceMatrices, mesh: coinFieldMesh } = engine.coinInstanced;
        engine.coinMeshes.forEach((group, index) => {
          const perFace = faceMatrices[index];
          for (let face = 0; face < perFace.length; face += 1) {
            const slot = index * perFace.length + face;
            if (group.visible) {
              coinPoseScratch.compose(group.position, group.quaternion, COIN_UNIT_SCALE).multiply(perFace[face]);
              coinFieldMesh.setMatrixAt(slot, coinPoseScratch);
            } else {
              coinFieldMesh.setMatrixAt(slot, COIN_COLLECTED_POSE);
            }
          }
        });
        coinFieldMesh.instanceMatrix.needsUpdate = true;
      }
      engine.boostPads.forEach((pad, index) => {
        pad.children.forEach((child) => {
          if (child.userData.chevronOrder !== undefined) {
            child.material.opacity =
              0.55 + Math.sin(race.raceTime * 6 - child.userData.chevronOrder * 1.4 + index) * 0.45;
          }
        });
      });
      engine.rivalModels.forEach((rival, index) => {
        const racer = race.rivals[index];
        const sample = engine.sampler.pointAt(racer.progress, racer.lane);
        updateVehiclePose(rival.model.group, sample, clamp(racer.laneVel * 0.6, -1, 1), false, {
          extraYaw: spinOutYaw(racer.spinTimer),
          hop: racer.air.height,
          pitch: airPitchFor(racer.air),
          slideYaw: 0,
          squash: 1,
        });
        rival.model.boostFlame.visible = racer.boostTimer > 0;
        rival.model.idleFlames.forEach((flame, flameIndex) => {
          flame.visible = racer.speed > 16;
          flame.scale.setScalar(0.75 + Math.sin(race.raceTime * 24 + index * 3 + flameIndex * 2.1) * 0.16);
        });
        rival.model.wheels.forEach((wheel) => {
          wheel.rotation.x -= dt * racer.speed * 0.12;
          if (wheel.userData.front) wheel.rotation.y = clamp(racer.laneVel * 0.5, -0.5, 0.5);
        });
      });

      let targetFov;
      if (proofCameraMode === 'top') {
        const target = playerSample.point.clone().addScaledVector(playerSample.tangent, 22);
        const desiredCamera = target.clone().add(new THREE.Vector3(0, viewport.mobile ? 180 : 220, 0.01));
        engine.camera.position.lerp(desiredCamera, 1 - Math.pow(0.00003, dt));
        engine.camera.lookAt(target);
        targetFov = viewport.mobile ? 58 : 54;
      } else {
        // Arcade chase camera: low, close, and locked to the track path behind
        // the kart — the camera rides the road, so corners can never put it
        // inside walls or buildings. Slight duck under the bridge.
        const underpass = race.progress > 0.15 && race.progress < 0.24;
        // Owner 2026-07-12: "you look tiny ... hard to control" + "the
        // camera changes ... and looks wild" — phones get ONE pinned
        // framing (closer + narrower), never re-evaluated: the soft lock
        // guarantees a landscape view, and viewport-aspect flips from
        // browser-chrome collapse must not change the camera mid-race.
        const phoneWide = touchControls;
        // After the finish, pull up slightly for a results tableau centered on
        // the kart (staying short of the gate behind it).
        const cameraBackUnits = race.finished ? 30 : camLab?.back ?? (phoneWide ? 34 : viewport.mobile ? 42 : 38);
        const cameraHeight = race.finished
          ? 13
          : (camLab?.height ?? (phoneWide ? 11.5 : viewport.mobile ? 13.5 : 12)) * (underpass ? 0.62 : 1);
        const cameraProgress = wrap01(race.progress - cameraBackUnits / engine.sampler.length);
        const cameraSample = engine.sampler.pointAt(cameraProgress, race.lane * 0.6);
        const desiredCamera = cameraSample.point
          .clone()
          .add(new THREE.Vector3(0, cameraHeight + clamp(race.speed / 90, 0, 2.2), 0));
        engine.camera.position.lerp(desiredCamera, 1 - Math.pow(0.00003, dt));
        // Vertical follow stays tight so bridge climbs/descents keep the kart
        // framed instead of the camera floating above the drop.
        engine.camera.position.y = lerp(engine.camera.position.y, desiredCamera.y, 1 - Math.pow(0.0000005, dt));
        const lookAt = race.finished
          ? playerSample.point.clone().add(new THREE.Vector3(0, 6, 0))
          : playerSample.point
              .clone()
              .addScaledVector(playerSample.tangent, camLab?.lookAhead ?? (phoneWide ? 30 : viewport.mobile ? 28 : 34))
              .add(new THREE.Vector3(0, camLab?.lookUp ?? (viewport.mobile && !phoneWide ? 5.5 : 4.5), 0));
        engine.camera.lookAt(lookAt);
        // Mini-turbo gets a small extra FOV kick on top of the speed widening.
        targetFov =
          (phoneWide ? 61 : viewport.mobile ? 63 : 60) +
          clamp(race.speed / MAX_SPEED, 0, 1.15) * 3 +
          (miniTurboActive ? 2 : 0);
      }
      if (Math.abs(engine.camera.fov - targetFov) > 0.1) {
        engine.camera.fov = lerp(engine.camera.fov, targetFov, 1 - Math.pow(0.001, dt));
        engine.camera.updateProjectionMatrix();
      }
      // Keep the key/rim direction centered on the action.
      engine.sun.position.set(playerSample.point.x - 95, playerSample.point.y + 110, playerSample.point.z - 45);
      engine.sun.target.position.copy(playerSample.point);
      engine.sun.target.updateMatrixWorld();
      // B2: per-lap palette moments (no-op unless the race precompiled a
      // moments set — no track ships one until the owner picks).
      applyPaletteMoments(engine, race.progress);
      // GRAPHICS OVERHAUL Phase 2: drive particles + speed-reactive post FX.
      // Reads race state for emission triggers only — never writes it back.
      const speedRatio = clamp(race.speed / MAX_SPEED, 0, 1.15);
      const playerWorldPos = engine.playerModel.group.position;
      engine.gfxParticles.updateFrame({
        dt,
        drift: { active: race.drift, tier: driftState.tier, position: playerWorldPos },
        boost: { active: race.boostTimer > 0 || miniTurboActive, tier: driftState.miniTurboTier, position: playerWorldPos },
        camPosition: engine.camera.position,
      });
      // Tint spark/smoke pools to the live tier (amber -> violet grammar).
      engine.gfxParticles.setTierColor(
        DRIFT_FEEL.sparkColors[miniTurboActive ? driftState.miniTurboTier : driftState.tier] || DRIFT_FEEL.sparkColors[0],
        null
      );
      // Speed-reactive post: restrained bloom swell at top speed. CA remains
      // wired through the graphics config, but the presentation default keeps
      // it at zero for a cleaner chase view.
      const gfxBloomMul = engine.gfxPostFx ? engine.gfxPostFx.updateFrame({ speedRatio }) : 1;
      if (engine.postChainEnabled && engine.bloomEffect) {
        // Compose: active base × speed swell × any palette-moment multiplier
        // (applyPaletteMoments runs above and sets intensity = moments.bloomBase
        // × out.bloom; we re-derive the moment factor so the speed swell stacks
        // multiplicatively instead of being overwritten). When no moments are
        // active the moment factor is 1.
        const momentMul = engine.paletteMoments && engine.paletteMoments.bloomBase
          ? engine.bloomEffect.intensity / engine.paletteMoments.bloomBase
          : 1;
        engine.bloomEffect.intensity = engine.gfxBloomBase * gfxBloomMul * momentMul;
      }
      // pmndrs composer takes the frame delta (seconds) for time-based effects.
      if (engine.postChainEnabled) engine.composer.render(dt);
      else engine.renderer.render(engine.scene, engine.camera);
      frameWorkSamples.push(performance.now() - now);
      while (frameWorkSamples.length > 40) frameWorkSamples.shift();
      // Audio observer: engine pitch + drift scrape follow this frame's state,
      // one-shot cues fire off state transitions (see kartAudio.js).
      audioRef.current?.updateFrame({ driftState: race.driftState, race });
      publishTelemetry(race, fpsEstimate, engine.propCount, mode, characterKey, kartKey, trackKey, {
        audioMuted: audioRef.current?.isMuted() ?? null,
        audioRunning: audioRef.current?.isRunning() ?? false,
        bakedSpike: engine.bakedSpike,
        miamiMounts: { ...miamiMountStats },
        paletteMoments: engine.paletteMoments,
        postChainEnabled: engine.postChainEnabled,
        frameElapsedMs: rollingAverage(frameElapsedSamples),
        frameWorkMs: rollingAverage(frameWorkSamples),
        proofCameraMode,
        rendererStats: rendererStatsForFrame(now),
      });
      snapshotTimer += dt;
      if (snapshotTimer > 0.14 || race.finished) {
        snapshotTimer = 0;
        setSnapshot({
          boostHits: race.boostHits,
          coins: race.coins,
          countdown: race.countdown,
          drift: race.drift,
          finished: race.finished,
          heldItem: race.heldItem,
          itemPickups: race.itemPickups,
          lap: race.lap,
          laps: race.laps,
          position: race.position,
          progress: race.progress,
          raceTime: race.raceTime,
          shieldActive: race.shieldActive,
          speed: race.speed,
          steer: race.steer,
        });
      }
      if (race.finished && !finishReportedRef.current) {
        finishReportedRef.current = true;
        onFinish?.({
          bestLap: null,
          place: race.position,
          time: race.raceTime,
          trackKey,
        });
      }
      raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(raf);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      engine.composer?.dispose?.();
      engine.renderer.dispose();
      // Graphics overhaul: free the PMREM env probe (render target + PMREM
      // generator) before the material sweep below.
      disposeGraphicsEnvironment({ scene: engine.scene, handle: engine.gfxEnv });
      // Phase 2 particles: dispose pools (geometry + sprite textures).
      engine.gfxParticles?.dispose?.();
      // Scene traversal below handles geometry/material; the instance
      // matrix attribute needs the InstancedMesh's own dispose.
      engine.coinInstanced?.mesh?.dispose();
      engine.scene.traverse((object) => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
        else object.material?.dispose?.();
      });
      if (engineRef.current === engine) engineRef.current = null;
      if (window.__comebackCityKartTrackVisualsEnabled === engine.trackVisualsEnabled) {
        delete window.__comebackCityKartTrackVisualsEnabled;
      }
    };
  }, [autoplay, characterKey, kartKey, mode, onFinish, onRestart, playerCharacter, playerKart, postChainEnabled, proofCameraMode, reducedMotion, runId, trackVisualsEnabled]);

  const setTouch = (key, value) => {
    inputRef.current = { ...inputRef.current, [key]: value };
  };
  // K3 touch scheme: hold-buttons capture their pointer (slide-off never
  // sticks an input — pointerup/cancel always reach the button), and the
  // joystick steers analog from a floating origin (where the thumb lands).
  const capturePointer = (event) => {
    // Throws on already-released or synthetic pointers — never let a failed
    // capture eat the input itself.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* capture is an optimization, not a requirement */
    }
  };
  const holdTouch = (key) => (event) => {
    capturePointer(event);
    setTouch(key, true);
  };
  const releaseTouch = (key) => () => setTouch(key, false);
  const itemTouchDown = (event) => {
    capturePointer(event);
    if (snapshot.heldItem) navigator.vibrate?.(30);
    setTouch('item', true);
  };
  // Tour-style one-thumb grammar (owner 2026-07-12: "mario kart does that
  // all with touch right"): DRAG steers (floating origin, analog), a fast
  // FLICK during the drag engages drift (held until the thumb lifts —
  // release pays the mini-turbo exactly like the button), and a TAP throws
  // the held item. The buttons stay as redundant fallbacks.
  const joystickStateRef = useRef({ active: false, flicked: false, lastT: 0, lastX: 0, lastY: 0, maxDist: 0, originX: 0, originY: 0, pointerId: null, startT: 0 });
  const joystickPuckRef = useRef(null);
  const steerIndicatorRef = useRef(null);
  const JOYSTICK_RANGE_PX = 64;
  const FLICK_SPEED_PX_MS = 0.55; // horizontal thumb speed that reads as a deliberate flick
  const TAP_MAX_MS = 220;
  const TAP_MAX_PX = 12;
  const joystickDown = (event) => {
    event.preventDefault();
    capturePointer(event);
    const now = performance.now();
    joystickStateRef.current = {
      active: true, flicked: false, lastT: now, lastX: event.clientX, lastY: event.clientY, maxDist: 0,
      originX: event.clientX, originY: event.clientY, pointerId: event.pointerId, startT: now,
    };
    const indicator = steerIndicatorRef.current;
    if (indicator) {
      const zone = event.currentTarget.getBoundingClientRect();
      indicator.style.left = `${Math.round(event.clientX - zone.left)}px`;
      indicator.style.top = `${Math.round(event.clientY - zone.top)}px`;
      indicator.style.display = 'flex';
      indicator.classList.remove('three-kart-race__steer-indicator--drifting');
    }
  };
  const joystickMove = (event) => {
    const stick = joystickStateRef.current;
    if (!stick.active || event.pointerId !== stick.pointerId) return;
    const now = performance.now();
    // Under the soft landscape lock the game is rotated 90° — the VISUAL
    // horizontal is the viewport's Y axis.
    const soft = softLandscapeRef.current;
    const horizontal = soft ? event.clientY : event.clientX;
    const lastHorizontal = soft ? stick.lastY : stick.lastX;
    const originHorizontal = soft ? stick.originY : stick.originX;
    const stepX = horizontal - lastHorizontal;
    const stepMs = Math.max(1, now - stick.lastT);
    stick.lastX = event.clientX;
    stick.lastY = event.clientY;
    stick.lastT = now;
    stick.maxDist = Math.max(stick.maxDist, Math.hypot(event.clientX - stick.originX, event.clientY - stick.originY));
    if (!stick.flicked && Math.abs(stepX) >= 8 && Math.abs(stepX) / stepMs >= FLICK_SPEED_PX_MS) {
      stick.flicked = true;
      setTouch('drift', true);
      steerIndicatorRef.current?.classList.add('three-kart-race__steer-indicator--drifting');
    }
    const axis = clamp((horizontal - originHorizontal) / JOYSTICK_RANGE_PX, -1, 1);
    inputRef.current = { ...inputRef.current, steerAxis: axis };
    if (joystickPuckRef.current) joystickPuckRef.current.style.transform = `translateX(${Math.round(axis * 34)}px)`;
  };
  const joystickEnd = (event) => {
    const stick = joystickStateRef.current;
    if (!stick.active || event.pointerId !== stick.pointerId) return;
    const wasTap = !stick.flicked && performance.now() - stick.startT < TAP_MAX_MS && stick.maxDist < TAP_MAX_PX;
    joystickStateRef.current = { ...stick, active: false, pointerId: null };
    inputRef.current = { ...inputRef.current, steerAxis: null };
    if (stick.flicked) setTouch('drift', false); // release pays the mini-turbo
    if (joystickPuckRef.current) joystickPuckRef.current.style.transform = '';
    if (steerIndicatorRef.current) steerIndicatorRef.current.style.display = 'none';
    if (wasTap && event.type !== 'pointercancel') {
      if (snapshot.heldItem) navigator.vibrate?.(30);
      setTouch('item', true);
      window.setTimeout(() => setTouch('item', false), 90);
    }
  };
  const restart = () => {
    inputRef.current = { ...inputRef.current, restart: true };
  };

  return (
    <div
      className={`three-kart-race${softLandscape ? ' three-kart-race--soft-landscape' : ''}`}
      data-prop-count={PROP_COUNT}
      data-race-renderer="three-kart"
      data-testid="comeback-city-3d-kart-race"
      data-track-visuals-enabled={trackVisualsEnabled ? 'true' : 'false'}
    >
      <canvas
        ref={canvasRef}
        aria-label="Comeback City V2 low-poly 3D kart race"
        className="three-kart-race__canvas"
        data-race-renderer="three-kart"
        data-visual-canvas="race"
      />
      {webglError ? (
        <div className="three-kart-race__fallback">
          <strong>3D renderer unavailable</strong>
          <span>{webglError}</span>
        </div>
      ) : null}
      <div className="three-kart-race__hud" aria-live="polite">
        <div className="three-kart-race__badge" data-testid="race-position-badge">
          <Trophy size={15} />
          <span>{ordinal(snapshot.position)}</span>
        </div>
        <div className="three-kart-race__badge">
          <Gauge size={15} />
          <span>{Math.round(snapshot.speed)}</span>
        </div>
        <div className="three-kart-race__badge">
          <Flag size={15} />
          <span>{snapshot.lap}/{snapshot.laps}</span>
        </div>
        <div className="three-kart-race__badge">
          <Zap size={15} />
          <span>{snapshot.boostHits}</span>
        </div>
        <div className="three-kart-race__badge">
          <Sparkles size={15} />
          <span>{snapshot.itemPickups}</span>
        </div>
        <div className="three-kart-race__badge" data-testid="race-coins" data-coins={snapshot.coins}>
          <Bitcoin size={15} />
          <span>{snapshot.coins}</span>
        </div>
        <button
          type="button"
          className="three-kart-race__badge three-kart-race__audio-toggle"
          data-testid="race-audio-toggle"
          data-audio-muted={audioMuted ? '1' : '0'}
          aria-label={audioMuted ? 'Unmute sound' : 'Mute sound'}
          onClick={() => {
            const next = !audioMuted;
            setAudioMuted(next);
            audioRef.current?.setMuted(next);
          }}
        >
          {audioMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
        <div className="three-kart-race__badge" data-testid="race-held-item" data-held-item={snapshot.heldItem || 'none'}>
          {snapshot.heldItem ? (
            <HeldItemIcon heldItem={snapshot.heldItem} projectileSkin={playerCharacter.projectileSkin} />
          ) : snapshot.shieldActive ? (
            <HeldItemIcon heldItem="iceshield" />
          ) : (
            <span style={{ filter: 'grayscale(0.7)', opacity: 0.45 }}>
              <HeldItemIcon heldItem="snowball" projectileSkin={playerCharacter.projectileSkin} />
            </span>
          )}
          <span>
            {snapshot.heldItem
              ? heldItemLabel(snapshot.heldItem, playerCharacter.projectileSkin)
              : snapshot.shieldActive
                ? 'ON'
                : '—'}
          </span>
        </div>
      </div>
      {snapshot.countdown > 0 ? (
        <div className="three-kart-race__countdown">{Math.ceil(snapshot.countdown)}</div>
      ) : null}
      {itemPop ? (
        <div className="three-kart-race__item-pop" data-testid="race-item-pickup-pop" key={itemPop.at}>
          <HeldItemIcon heldItem={itemPop.item} projectileSkin={playerCharacter.projectileSkin} size={112} />
        </div>
      ) : null}
      {snapshot.finished ? (
        <div className="three-kart-race__results">
          <div>
            <span>Finish · {ordinal(snapshot.position)}</span>
            <strong>{formatTime(snapshot.raceTime)}</strong>
          </div>
          <button type="button" onClick={restart}>
            <RotateCcw size={15} />
            Restart
          </button>
        </div>
      ) : null}
      {touchControls && !snapshot.finished ? (
        <>
          {/* K3 mobile controls V2 (owner: "maybe a joystick to drive with" +
              "something made to smash on the screen"). Coarse pointers only —
              desktop plays keyboard with zero phantom buttons. Auto-accel is
              on (autoThrottle), so the layout is: analog steer left thumb,
              brake/drift/item right thumb. Hidden once the race finishes —
              the results panel owns the screen (UI sweep 2026-07-12). */}
          <div
            aria-label="Drag anywhere to steer"
            className="three-kart-race__steer-zone"
            data-testid="race-touch-joystick"
            onPointerCancel={joystickEnd}
            onPointerDown={joystickDown}
            onPointerMove={joystickMove}
            onPointerUp={joystickEnd}
          >
            <div className="three-kart-race__steer-indicator" ref={steerIndicatorRef}>
              <div className="three-kart-race__joystick-puck" ref={joystickPuckRef} />
            </div>
          </div>
          <button
            aria-label="Toggle tilt steering"
            aria-pressed={tiltEnabled}
            className={`three-kart-race__tilt-toggle${tiltEnabled ? ' three-kart-race__tilt-toggle--on' : ''}`}
            data-testid="race-touch-tilt"
            onClick={toggleTilt}
            type="button"
          >
            Tilt {tiltEnabled ? 'on' : 'off'}
          </button>
          <div aria-label="Race touch controls" className="three-kart-race__touch three-kart-race__touch--cluster">
            <button
              aria-label="Brake"
              className="three-kart-race__cluster-brake"
              data-testid="race-touch-brake"
              onPointerCancel={releaseTouch('brake')}
              onPointerDown={holdTouch('brake')}
              onPointerUp={releaseTouch('brake')}
              type="button"
            >
              <ArrowDown size={22} />
            </button>
            <button
              aria-label="Hold to drift"
              className="three-kart-race__cluster-drift"
              data-testid="race-touch-drift"
              onPointerCancel={releaseTouch('drift')}
              onPointerDown={holdTouch('drift')}
              onPointerUp={releaseTouch('drift')}
              type="button"
            >
              <Sparkles size={26} />
              <span>Drift</span>
            </button>
            {/* The smash button IS the held-item display on touch (W2 chip
                retired here — 9px was unreadable on phones, owner 2026-07-11).
                The label keeps the race-held-item-chip contract. */}
            <button
              aria-label="Fire held item"
              className={`three-kart-race__cluster-item${snapshot.heldItem ? ' three-kart-race__item-button--armed' : ''}`}
              data-testid="race-touch-item"
              onPointerCancel={releaseTouch('item')}
              onPointerDown={itemTouchDown}
              onPointerUp={releaseTouch('item')}
              type="button"
            >
              {snapshot.heldItem ? (
                <HeldItemIcon heldItem={snapshot.heldItem} projectileSkin={playerCharacter.projectileSkin} size={38} />
              ) : (
                <span style={{ filter: 'grayscale(0.7)', opacity: 0.45 }}>
                  <HeldItemIcon heldItem="snowball" projectileSkin={playerCharacter.projectileSkin} size={38} />
                </span>
              )}
              <span className="three-kart-race__cluster-item-label" data-testid="race-held-item-chip">
                {snapshot.heldItem ? heldItemLabel(snapshot.heldItem, playerCharacter.projectileSkin) : 'Item'}
              </span>
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
};
