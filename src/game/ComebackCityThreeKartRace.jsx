import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Carrot, CloudSnow, Coffee, Fish, FishSymbol, Flag, Footprints, Gauge, MountainSnow, Rainbow, Rocket, RotateCcw, Shield, Snowflake, Sparkles, Trophy, Zap } from 'lucide-react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
// B4: pmndrs chain rides behind ?post=1 until the owner signs the post-ban
// supersession at the M2 benchmark review; the three-examples chain above
// stays the shipped default until then.
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
import iceSledUrl from '../assets/game/models/tripo/ice-sled.glb?url';
import mizzleModelUrl from '../assets/game/models/avatars/mizzle.glb?url';
import tclowModelUrl from '../assets/game/models/avatars/tclow-penguin.glb?url';
import layer23ModelUrl from '../assets/game/models/avatars/layer23-penguin.glb?url';
import clinicFacadeUrl from '../assets/game/generated/district-facade-clinic.png';
import foodFacadeUrl from '../assets/game/generated/district-facade-food.png';
import garageFacadeUrl from '../assets/game/generated/district-facade-garage.png';
import gymFacadeUrl from '../assets/game/generated/district-facade-gym.png';
import labFacadeUrl from '../assets/game/generated/district-facade-lab.png';
import { DEFAULT_TRACK_KEY, KART_TRACKS, trackByKey } from './race/tracks/index.js';
import {
  DRIFT_FEEL,
  createDriftState,
  driftLaneRate,
  hopHeightFor,
  updateDriftFeel,
} from './race/driftFeel.js';
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
import { createRaceRenderer, fitRaceRendererToCanvas } from './race/render/createRaceScene.js';
import { createGameGltfLoader } from './race/render/gltfLoader.js';
import { applyToonRim, TOON_RIM_SHARED_TINT } from './race/render/toonRimShader.js';
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
export const KART_OPTIONS = [
  { key: 'hero', name: 'Hero Kart', stats: { accel: 1.0, handling: 1.0, topSpeed: 1.0 }, tagline: 'Balanced' },
  { key: 'icesled', name: 'Ice Sled', stats: { accel: 0.94, handling: 0.92, topSpeed: 1.05 }, tagline: 'Fast & slippery' },
  { key: 'kenney', name: 'Dragster', stats: { accel: 1.08, handling: 1.04, topSpeed: 0.96 }, tagline: 'Quick off the line' },
];
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
const DISTRICT_FACADE_URLS = {
  clinic: clinicFacadeUrl,
  food: foodFacadeUrl,
  garage: garageFacadeUrl,
  gym: gymFacadeUrl,
  lab: labFacadeUrl,
};

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
  shortcut: createShortcutState(),
  speed: 0,
  spinOuts: 0,
  spinTimer: 0,
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

// Low-poly kart modeled to the V2 hero trait card: chunky tires dominate the
// silhouette, wide low glossy body, twin hood stripes, glowing headlight strip,
// empty bucket seat with headrest (the cards show no driver), rear light bar,
// twin exhausts with flames.
const createGroundedKartModel = ({
  accent = '#38d7ff',
  color = '#ef4334',
  // ?trackVisuals=1 look: stronger blob + accent contact glow standing in for
  // the disabled renderer shadow pass. Default keeps the approved shipped look.
  contactGrounding = false,
  scale = 1,
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
  driverMount.position.set(0, 1.9, -1.3);
  model.add(driverMount);

  const bodyMat = createToonMaterial(color, { emissive: color, emissiveIntensity: 0.2 });
  const blackMat = createToonMaterial('#191c28');
  const tireMat = createToonMaterial('#10121c');
  const hubMat = createToonMaterial('#343a4c');
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
  [boostFlame, driftSparkGroup, driftIceTrailGroup, miniTurboRing].forEach((vfx) =>
    vfx.traverse((node) => {
      node.castShadow = false;
    })
  );
  idleFlames.forEach((flame) => {
    flame.castShadow = false;
  });
  shadow.castShadow = false;

  // Neon underglow — color-codes each racer against the dark road.
  addGlowSprite(group, accent, 9.5, 0.3, 0.6);

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

  return { boostFlame, contactGlow, driftIceTrailGroup, driftSparkGroup, driverMount, group, idleFlames, miniTurboRing, replaceBody, shadow, wheels };
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
// the read). SHIPPED per track via palette.heroRim: Penguin Village carries
// the owner-picked V6 "ice white" (2026-07-06); Comeback City has no
// heroRim key and ships rim-off pending its own pick from rim-lab.html.
// Dev hook (same pattern as ?paletteLab=1): ?rimLab=1 + optional
// window.__rimLabOverrides = { strength, power, tint } forces a candidate
// look; ?rimLab=0 forces the rim OFF (the lab's control tile on a track
// whose shipped default is rim-on). The URL hook overrides the shipped
// palette config so the lab can keep exploring on either track. Returns
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
// shipped palette carries a moments key). Returns undefined when the param
// is absent (no opinion — palette decides). Shipped default today is
// moment-LESS on every track until the owner picks a set from
// moments-lab.html.
const momentsLabConfig = () => {
  if (typeof window === 'undefined') return undefined;
  const param = new URLSearchParams(window.location.search).get('momentsLab');
  if (param === '0') return null;
  if (param !== '1') return undefined;
  return Array.isArray(window.__momentsLabOverrides) ? window.__momentsLabOverrides : null;
};

// H8 sky lab (generated backdrops, dev-only) hook: ?skyLab=1 mounts the
// generated far/near backdrop rings (per-track default strips resolved in
// createScene); window.__skyLabOverrides = { far, near } swaps candidate
// strip URLs. Absent param = shipped look untouched.
const skyLabConfig = () => {
  if (typeof window === 'undefined') return null;
  if (new URLSearchParams(window.location.search).get('skyLab') !== '1') return null;
  const overrides = window.__skyLabOverrides || {};
  return {
    far: typeof overrides.far === 'string' ? overrides.far : null,
    near: typeof overrides.near === 'string' ? overrides.near : null,
  };
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
    ]).then(([racerGltf, itemBoxGltf, colormapImage, bunnyGltf, sethGltf, tripoKartGltf, mizzleGltf, iceSledGltf, tclowGltf, layer23Gltf]) => ({
      colormapImage,
      // Keyed by KART_CHARACTERS entries — seats are assigned at race start.
      driverScenes: {
        'crrt-bunny': bunnyGltf?.scene || null,
        layer23: layer23Gltf?.scene || null,
        mizzle: mizzleGltf?.scene || null,
        'seth-penguin': sethGltf?.scene || null,
        tclow: tclowGltf?.scene || null,
      },
      itemBoxScene: itemBoxGltf.scene,
      kartScenes: {
        hero: tripoKartGltf?.scene || null,
        icesled: iceSledGltf?.scene || null,
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

// A/B variant: AI-generated kart body with its own baked texture. One fused
// mesh — no wheel nodes, so wheels are static (acceptable for the visual A/B).
const attachTripoKartBody = (kartModel, tripoScene, castsShadow) => {
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
  // The Tripo hero kart arrives facing +X (long axis); -π/2 brings its nose
  // onto +Z, our driving direction. The old +π/2 guess had it driving
  // backward — owner-reported, probe-confirmed.
  rig.rotation.y = -Math.PI / 2;
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
          { color: '#3a4666', count: 420, size: 2.4 },
          { color: '#202840', count: 360, size: 3.1 },
          { color: '#46537a', count: 130, size: 1.6 },
        ],
  });
  const road = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: asphaltTexture,
      metalness: 0.06,
      roughness: 0.6,
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
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1120, 1060, 18, 18),
    new THREE.MeshStandardMaterial({ color: '#ffffff', map: grassTexture, roughness: 0.92 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.06;
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
    for (let index = 0; index < TRACK_SAMPLES; index += laneMarkings.everySamples) {
      const progress = index / TRACK_SAMPLES;
      const { point, tangent } = surfacePointAt(progress);
      const mark = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 11.5), lineMat);
      mark.position.copy(point);
      mark.position.y += 0.22;
      mark.rotation.y = Math.atan2(tangent.x, tangent.z);
      mark.userData.kind = 'visual-lane-marking';
      world.add(setFlatTransform(mark));
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

const addPad = (world, sampler, pad, index) => {
  const group = new THREE.Group();
  const { point, tangent } = sampler.pointAt(pad.progress, pad.side || 0);
  group.position.copy(point);
  group.position.y += 0.18;
  group.rotation.y = Math.atan2(tangent.x, tangent.z);
  group.userData.kind = 'boost-pad';
  group.userData.progress = pad.progress;
  group.userData.index = index;
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
  addGlowSprite(group, '#2cd8f6', 15, 0.4, 1.6);
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
  const bracketMat = new THREE.MeshStandardMaterial({
    color: '#F5F8FF',
    emissive: accent,
    emissiveIntensity: 0.65,
    flatShading: true,
    metalness: 0.45,
    roughness: 0.22,
  });
  const body = new THREE.Mesh(new RoundedBoxGeometry(6.8, 6.8, 6.8, 1, 0.85), bodyMat);
  crate.add(body);
  // Metal corner brackets.
  [
    [-1, -1, -1],
    [-1, -1, 1],
    [-1, 1, -1],
    [-1, 1, 1],
    [1, -1, -1],
    [1, -1, 1],
    [1, 1, -1],
    [1, 1, 1],
  ].forEach(([x, y, z]) => {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), bracketMat);
    bracket.position.set(x * 3.1, y * 3.1, z * 3.1);
    crate.add(bracket);
  });
  // Glowing edge bands.
  const edgeMat = createBasicMaterial(accent, { emissive: accent, emissiveIntensity: 0.9 });
  [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]].forEach(([x, y, z]) => {
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(x ? 7.2 : 0.25, y ? 7.2 : 0.25, z ? 7.2 : 0.25),
      edgeMat
    );
    edge.position.set(x * 3.42, y * 3.42, z * 3.42);
    crate.add(edge);
  });
  crate.traverse((n) => {
    n.castShadow = true;
  });
  return crate;
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
  const scale = dare ? 1.4 : 1;
  const W = 15 * scale;
  const L = 19 * scale;
  const H = 5.2 * scale;
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
  addGlowSprite(group, accent, 16 * scale, 0.45, H + 1);
  world.add(group);
  return group;
};

const addFinishGate = (world, sampler, trackDef, trackVisuals = resolveTrackVisuals(trackDef, { enabled: false })) => {
  const gateWidth = sampler.widthAt(0);
  // Schema colors and the beacon/halo dressing are part of the ?trackVisuals=1
  // experiment; flag-off reproduces the approved gate exactly.
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

const OPENING_FACADES = [
  { accent: '#7ee06b', base: '#23503a', key: 'gym', progress: 0.072, scale: 1.08, side: -1 },
  { accent: '#ffac32', base: '#5a3a16', key: 'food', progress: 0.092, scale: 1.02, side: -1 },
  { accent: '#d45cff', base: '#3a2356', key: 'lab', progress: 0.112, scale: 1, side: 1 },
  { accent: '#ff5d68', base: '#5c2230', key: 'clinic', progress: 0.136, scale: 1.03, side: 1 },
  { accent: '#38d7ff', base: '#1d3c5e', key: 'garage', progress: 0.16, scale: 1.08, side: 1 },
];

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

const addOpeningFacadeRun = (world, sampler, loader, buildingSwaps) => {
  OPENING_FACADES.forEach((entry) => {
    const { normal, point, tangent } = sampler.pointAt(entry.progress);
    const placement = clearBuildingPlacement(sampler, point, normal, entry.side, 64);
    if (!placement) return;
    const group = new THREE.Group();
    buildingSwaps.push({ footprint: 50 * entry.scale, group, rotate: 0 });
    group.position.copy(placement);
    group.position.y += 1.5;
    group.rotation.y = Math.atan2(tangent.x, tangent.z) + (entry.side > 0 ? -Math.PI / 2 : Math.PI / 2);
    const baseMat = createBasicMaterial(entry.base, { emissive: entry.base, emissiveIntensity: 0.06 });
    const body = makeRoundedBox(
      { x: 50 * entry.scale, y: 50 * entry.scale, z: 14 },
      { y: 25 * entry.scale, z: 7.6 },
      baseMat,
      2.2
    );
    body.userData.kind = 'procedural-building';
    group.add(setFlatTransform(body));
    const roof = makeRoundedBox(
      { x: 54 * entry.scale, y: 3.4, z: 17 },
      { y: 51 * entry.scale, z: 7.6 },
      createBasicMaterial('#141d29'),
      1.1
    );
    roof.userData.kind = 'procedural-building';
    group.add(setFlatTransform(roof));
    const sign = makeBox(
      { x: 16 * entry.scale, y: 2.2, z: 1.2 },
      { y: 53.4 * entry.scale, z: 7.6 },
      createBasicMaterial(entry.accent, { emissive: entry.accent, emissiveIntensity: 0.7 })
    );
    sign.userData.kind = 'procedural-building';
    group.add(setFlatTransform(sign));
    const facade = createAssetPlane(loader, DISTRICT_FACADE_URLS[entry.key], 58 * entry.scale, 58 * entry.scale, {
      colorKeyMagenta: true,
      kind: `opening-${entry.key}-facade`,
      renderOrder: 24,
    });
    facade.position.y = 28;
    facade.rotation.y = Math.PI;
    group.add(facade);
    addGlowDisc(group, entry.accent, 1.35);
    world.add(group);
  });
};

const addDistrictsAndProps = (world, sampler, loader, buildingSwaps, trackDef, trackVisuals = resolveTrackVisuals(trackDef, { enabled: false })) => {
  const roadWidth = trackDef.course.mainRoadWidth || 50;
  const propMat = {
    cone: createBasicMaterial('#ff8b21', { emissive: '#ff8b21', emissiveIntensity: 0.18 }),
    lamp: createBasicMaterial('#9feeff', { emissive: '#56e2ff', emissiveIntensity: 1.3 }),
    planter: createBasicMaterial('#2f8f59'),
    trunk: createBasicMaterial('#70452a'),
    leaf: createBasicMaterial('#7ee06b'),
    tire: createBasicMaterial('#151923'),
  };
  let propCount = 0;
  // The hand-placed opening facade run is comeback-city dressing — opt-in.
  if (trackDef.dressing?.openingFacades) addOpeningFacadeRun(world, sampler, loader, buildingSwaps);

  trackDef.course.districtAnchors.forEach((district) => {
    const { normal, point, tangent } = sampler.pointAt(district.progress);
    const placement = clearBuildingPlacement(sampler, point, normal, district.side, district.setback * 0.82);
    if (!placement) return;
    const group = new THREE.Group();
    group.position.copy(placement);
    group.rotation.y = Math.atan2(tangent.x, tangent.z) + (district.side > 0 ? -Math.PI / 2 : Math.PI / 2);
    group.userData.kind = `district-${district.key}`;
    const base = createBasicMaterial(district.base, { emissive: district.base, emissiveIntensity: 0.08 });
    const dark = createBasicMaterial(district.dark);
    const accent = createBasicMaterial(district.accent, { emissive: district.accent, emissiveIntensity: 1.25 });
    buildingSwaps.push({ footprint: 36, group, rotate: Math.PI });
    [
      makeRoundedBox({ x: 34, y: 24, z: 18 }, { y: 12 }, base, 1.6),
      makeRoundedBox({ x: 39, y: 4, z: 21 }, { y: 26 }, createBasicMaterial(district.roof), 1.2),
      makeRoundedBox({ x: 18, y: 14, z: 1.4 }, { y: 10, z: -9.8 }, dark, 0.4),
    ].forEach((mesh) => {
      mesh.userData.kind = 'procedural-building';
      group.add(mesh);
    });
    // Standing neon arch doorway, like the portal modules on the district card
    const portal = new THREE.Mesh(new THREE.TorusGeometry(7.8, 1.05, 8, 22, Math.PI), accent);
    portal.position.set(0, 8.2, -10.9);
    group.add(portal);
    [-1, 1].forEach((side) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 8.2, 8), accent);
      post.position.set(side * 7.8, 4.1, -10.9);
      group.add(post);
    });
    const doorway = new THREE.Mesh(
      new THREE.PlaneGeometry(13.4, 13.8),
      new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: district.accent,
        depthWrite: false,
        opacity: 0.22,
        transparent: true,
      })
    );
    doorway.position.set(0, 6.9, -10.6);
    group.add(doorway);
    addGlowSprite(group, district.accent, 30, 0.5, 8.6).position.z = -10.9;
    const beacon = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 0), accent);
    beacon.position.set(0, 31, 0);
    group.add(beacon);
    const facade = createAssetPlane(loader, DISTRICT_FACADE_URLS[district.key], 54, 54, {
      colorKeyMagenta: true,
      kind: `district-${district.key}-facade-sprite`,
      renderOrder: 16,
    });
    facade.position.set(0, 21, -12.5);
    facade.rotation.y = Math.PI;
    group.add(facade);
    addGlowDisc(group, district.accent, 1.25).position.set(0, 0.16, -14);
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

  // Roadside scatter (trees / lamps / cones / planters) is comeback-city
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
    if (index % 4 === 0) {
      group.add(makeBox({ x: 2, y: 7, z: 2 }, { y: 3.5 }, propMat.trunk));
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(5.2, 0), propMat.leaf);
      crown.position.y = 9.6;
      group.add(crown);
    } else if (index % 4 === 1) {
      group.add(makeBox({ x: 2, y: 10, z: 2 }, { y: 5 }, createBasicMaterial('#263241')));
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), propMat.lamp);
      lamp.position.y = 11.5;
      group.add(lamp);
      addGlowSprite(group, '#56e2ff', 11, 0.5, 11.5);
    } else if (index % 4 === 2) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.5, 6.8, 4), propMat.cone);
      cone.position.y = 3.4;
      group.add(cone);
    } else {
      group.add(makeBox({ x: 7.2, y: 2.4, z: 4.8 }, { y: 1.2 }, propMat.planter));
      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(3.6, 0), propMat.leaf);
      bush.position.y = 4.4;
      group.add(bush);
    }
    group.userData.kind = 'roadside-v2-prop';
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
    if (anchor.kind === 'skyline') {
      // H8: the generated painted backdrop REPLACES this old 14-box
      // procedural skyline row — the boxes would stand in front of the
      // backdrop rings and clash with the new theme (owner 2026-07-07:
      // "get rid of the old building so we just keep the new theme").
      // The row still builds when the backdrop is off, so the shipped
      // default look is unchanged until the sky-lab pick is promoted.
      if (skyLabConfig()) return;
      for (let index = 0; index < 14; index += 1) {
        const building = new THREE.Mesh(
          new THREE.BoxGeometry(16 + (index % 3) * 7, 28 + (index % 5) * 10, 18),
          createBasicMaterial('#1b2342', {
            emissive: index % 2 === 0 ? '#38d7ff' : '#b14fd8',
            emissiveIntensity: index % 3 === 0 ? 0.3 : 0.12,
          })
        );
        building.position.set(anchor.x - anchor.w / 2 + index * 39, building.geometry.parameters.height / 2, anchor.z);
        world.add(setFlatTransform(building));
      }
    }
  });

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
  // captures candidate looks without touching shipped defaults.
  if (
    typeof window !== 'undefined' &&
    window.__paletteLabOverrides &&
    new URLSearchParams(window.location.search).get('paletteLab') === '1'
  ) {
    palette = { ...palette, ...window.__paletteLabOverrides };
  }
  const renderer = createRaceRenderer({ canvas, onUnavailable });
  if (!renderer) return null;
  renderer.setClearColor(palette.clearColor || '#131a36', 1);
  renderer.toneMappingExposure = 1.05;
  // The ?trackVisuals=1 experiment trades real-time shadows for stronger
  // blob/contact grounding; the shipped default keeps the approved
  // shadow-mapped look until the owner signs the §9 default-on gate.
  renderer.shadowMap.enabled = !trackVisualsEnabled;
  renderer.shadowMap.type = THREE.BasicShadowMap;

  const scene = new THREE.Scene();
  scene.background = makeSkyTexture(palette.sky);
  // B1: atmosphere reads from the track palette; the fallbacks reproduce
  // Comeback City exactly (its palette has no fog/hemi/sun keys, by
  // construction). NOTE fog.far must stay <= 840 — camera far is 860 and
  // fog far beyond camera far silently no-ops the haze.
  const fogCfg = palette.fog || {};
  scene.fog = new THREE.Fog(fogCfg.color || '#272252', fogCfg.near ?? 240, fogCfg.far ?? 820);
  const camera = new THREE.PerspectiveCamera(66, 1, 0.25, 860);
  const world = new THREE.Group();
  scene.add(world);
  const loader = new THREE.TextureLoader();
  const hemi = new THREE.HemisphereLight(
    palette.hemi?.sky || '#8d8ce0',
    palette.hemi?.ground || '#2a1e4a',
    palette.hemi?.intensity ?? 3.3
  );
  scene.add(hemi);
  // Shadow-casting key light rides with the kart so a small, sharp shadow
  // frustum covers the action instead of a blurry one covering the world.
  const sun = new THREE.DirectionalLight(palette.sunColor || '#ffae72', 2.6);
  sun.position.set(-150, 52, -70);
  sun.castShadow = !trackVisualsEnabled;
  sun.shadow.mapSize.set(384, 384);
  sun.shadow.camera.left = -64;
  sun.shadow.camera.right = 64;
  sun.shadow.camera.top = 64;
  sun.shadow.camera.bottom = -64;
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 420;
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  scene.add(sun.target);
  const rimLight = new THREE.DirectionalLight(palette.rimLightColor || '#4fd8ff', 2.0);
  rimLight.position.set(92, 56, 74);
  scene.add(rimLight);
  // B3: resolve the hero fresnel rim for this race — the dev lab hook wins,
  // else the track's shipped palette.heroRim (PV V6 "ice white"; CC has no
  // key = rim off). One shared tint drives every rimmed hero material; a
  // heroRim.tint overrides the palette rimLightColor for the shader rim
  // only (the rimLight above keeps its own color).
  const labRim = heroRimConfig();
  activeHeroRim = labRim !== undefined ? labRim : palette.heroRim || null;
  TOON_RIM_SHARED_TINT.value.set(activeHeroRim?.tint || palette.rimLightColor || '#4fd8ff');

  // H8 sky lab (dev-only, owner gate open): ?skyLab=1 mounts the generated
  // backdrop as two parallax billboard rings — an opaque far band (its own
  // sky + horizon glow, top edge alpha-faded into the procedural gradient)
  // and an alpha-keyed nearer silhouette row. Strips are dev-served from
  // tmp/m3-sky-lab/production/ (NOT in the production bundle); an approved
  // pick moves to src/assets/game/generated/ + manifest at promotion.
  // Rings are fog-exempt (the art is pre-hazed) and never write depth, so
  // the world always overdraws them; camera.far is raised for the lab only
  // (shipped far stays 860 — the fog.far <= 840 rule is about FOG).
  const skyLab = skyLabConfig();
  if (skyLab) {
    const SKY_LAB_STRIPS = {
      'comeback-city': {
        far: '/tmp/m3-sky-lab/production/cc-far-a.webp',
        near: '/tmp/m3-sky-lab/production/cc-near-a.webp',
      },
      'penguin-village': {
        far: '/tmp/m3-sky-lab/production/pv-far-a.webp',
        near: '/tmp/m3-sky-lab/production/pv-near-a.webp',
      },
    };
    const strips = SKY_LAB_STRIPS[trackDef.key] || {};
    camera.far = 1800;
    camera.updateProjectionMatrix();
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
        ring.position.y = y;
        ring.renderOrder = order;
        scene.add(ring);
      });
    };
    addBackdropRing(skyLab.far || strips.far, { height: 380, order: -20, radius: 780, repeats: 5, y: 140 });
    addBackdropRing(skyLab.near || strips.near, { height: 210, order: -19, radius: 590, repeats: 7, y: 78 });
  }

  // Post-processing: bloom is what makes the neon dusk actually glow.
  let composer;
  let bloomPass = null;
  let bloomEffect = null;
  if (postChainEnabled) {
    // B4 (?post=1): mipmap bloom + SMAA + vignette + ACES merged in ONE
    // EffectPass. Each effect is individually toggleable for the M2
    // benchmark review: ?post=1&postBloom=0 / &postSmaa=0 / &postTone=0 /
    // &postVignette=0.
    const postParams = new URLSearchParams(window.location.search);
    const wantBloom = postParams.get('postBloom') !== '0';
    const wantSmaa = postParams.get('postSmaa') !== '0';
    const wantTone = postParams.get('postTone') !== '0';
    // Vignette ships ON inside the chain — owner signed the gate-2 on/off
    // pair 2026-07-06 ("every change in the post lab is amazing").
    const wantVignette = postParams.get('postVignette') !== '0';
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
      // pmndrs radius/intensity semantics differ from UnrealBloomPass —
      // these values were tuned for parity with the old chain (0.55/0.45/1.0),
      // judged by the step-1 A/B capture, not by matching numbers.
      bloomEffect = new BloomEffect({
        mipmapBlur: true,
        intensity: 0.55,
        // radius 0.7 / smoothing 0.22 (up from the planned 0.45 / 0.08):
        // the legacy chain ran UnrealBloom on a 30%-resolution target, which
        // oversizes its halos; mipmap bloom is resolution-independent, so it
        // needs a wider radius and softer knee to reproduce the approved glow
        // on Penguin Village's near-threshold snow. Neon sits above threshold
        // and is unaffected. Judged by the step-1 parity captures.
        radius: 0.7,
        luminanceThreshold: 1.0,
        luminanceSmoothing: 0.22,
      });
      effects.push(bloomEffect);
    }
    if (wantSmaa) effects.push(new SMAAEffect({ preset: SMAAPreset.MEDIUM }));
    if (wantVignette) effects.push(new VignetteEffect({ offset: 0.32, darkness: 0.45 }));
    // LUT3DEffect goes here, before ToneMappingEffect, when owner supplies a LUT texture.
    if (wantTone) effects.push(new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }));
    if (effects.length) composer.addPass(new EffectPass(camera, ...effects));
  } else {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(640, 360), 0.55, 0.45, 1.0);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
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
  trackDef.ramps.forEach((ramp) => addRamp(world, sampler, ramp));
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
  const buildingSwaps = [];
  const propCount = addDistrictsAndProps(world, sampler, loader, buildingSwaps, trackDef, trackVisuals) + trackVisualPropCount;
  if (trackDef.dressing?.penguinVillage) addPenguinVillageDressing(world, sampler, trackDef);

  // Owner feedback 2026-06-12: karts read ~20% too big against the track.
  const playerModel = createGroundedKartModel({
    accent: playerCharacter.accent,
    color: playerCharacter.color,
    contactGrounding: trackVisuals.enabled,
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
    new THREE.MeshBasicMaterial({ color: '#7EC8E8', depthWrite: false, opacity: 0.22, transparent: true })
  );
  shieldShell.scale.set(1.12, 0.7, 1.3);
  shieldShell.position.y = 3.4;
  shieldBubble.add(shieldShell);
  const shieldFacets = new THREE.Mesh(
    shieldShellGeometry,
    new THREE.MeshBasicMaterial({ color: '#F5F8FF', depthWrite: false, opacity: 0.45, transparent: true, wireframe: true })
  );
  shieldFacets.scale.copy(shieldShell.scale);
  shieldFacets.position.copy(shieldShell.position);
  shieldBubble.add(shieldFacets);
  const orbitShardGeometry = new THREE.OctahedronGeometry(0.85);
  orbitShardGeometry.scale(0.7, 1.6, 0.7);
  for (let index = 0; index < 6; index += 1) {
    const shard = new THREE.Mesh(
      orbitShardGeometry,
      createBasicMaterial('#F5F8FF', { emissive: '#00E5FF', emissiveIntensity: 0.85 })
    );
    const angle = (index / 6) * Math.PI * 2;
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
    const model = createGroundedKartModel({
      accent: rival.accent,
      color: rival.color,
      contactGrounding: trackVisuals.enabled,
      scale: KART_SCALE,
    });
    model.group.userData.kind = 'grounded-rival-kart';
    // Rivals keep only blob shadows — their cast shadows read as nothing at
    // race distance but triple the shadow pass draw count.
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
    // Baked-GLB load state machines (pending -> active | missing |
    // loaded-but-empty). Surfaced in telemetry; the kart-playable proof
    // FAILS the comeback-city run unless bakedBuildings reaches 'active' —
    // the 404-into-silent-procedural-fallback regression may never recur
    // silently (2026-07-02 incident).
    bakedBuildings: 'pending',
    bakedSpike: 'inactive',
    marchers,
    marchRig,
    blizzardPool,
    // Exactly one of bloomPass (legacy chain) / bloomEffect (?post=1 pmndrs
    // chain) is non-null; branch on postChainEnabled before touching either.
    bloomPass,
    bloomEffect,
    postChainEnabled: Boolean(postChainEnabled),
    boostPads,
    fishBonePool,
    projectilePool,
    slapFishRig,
    buildingSwaps,
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
    bakedBuildings: runtimeStats.bakedBuildings ?? null,
    bakedSpike: runtimeStats.bakedSpike ?? null,
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
  const inputRef = useRef({ brake: false, drift: false, item: false, left: false, restart: false, right: false, throttle: false });
  const finishReportedRef = useRef(false);
  const [snapshot, setSnapshot] = useState(createInitialRace);
  const [webglError, setWebglError] = useState(null);
  const autoplay = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('playableAutoplay') === '1' || params.get('raceAutoplay') === '1';
  }, []);
  // ?character= overrides the picker — used by QA captures to exercise any
  // seat assignment without the select UI.
  const characterKey = useMemo(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('character');
      if (param && KART_CHARACTERS.some((entry) => entry.key === param)) return param;
    }
    return KART_CHARACTERS.some((entry) => entry.key === character) ? character : DEFAULT_CHARACTER_KEY;
  }, [character]);
  const playerCharacter = characterByKey(characterKey);
  // Kart is picked separately; defaults to the character's signature ride.
  // ?kart= override mirrors ?character= for QA.
  const kartKey = useMemo(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('kart');
      if (param && KART_OPTIONS.some((entry) => entry.key === param)) return param;
    }
    if (kart && KART_OPTIONS.some((entry) => entry.key === kart)) return kart;
    return playerCharacter.kart;
  }, [kart, playerCharacter]);
  const playerKart = kartByKey(kartKey);
  // Track is a registry pick; ?track= override mirrors the other QA params.
  const trackKey = useMemo(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('track');
      if (param && KART_TRACKS.some((entry) => entry.key === param)) return param;
    }
    return KART_TRACKS.some((entry) => entry.key === track) ? track : DEFAULT_TRACK_KEY;
  }, [track]);
  const trackVisualsEnabled = useMemo(() => {
    // Opt-in experiment (PRD P0-3b): default OFF everywhere until the owner
    // signs the §9 trackVisualSchema default-on gate.
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('trackVisuals') === '1' || params.get('trackVisualSchema') === '1';
  }, []);
  const proofCameraMode = useMemo(() => {
    if (typeof window === 'undefined') return 'chase';
    return new URLSearchParams(window.location.search).get('proofCamera') === 'top' ? 'top' : 'chase';
  }, []);
  const postChainEnabled = useMemo(() => {
    // B4 pmndrs post chain: DEFAULT ON — owner signed the §9 post-ban
    // supersession at the M2 close (2026-07-06; post-lab gates were
    // "every change in the post lab is amazing"). ?post=0 keeps the legacy
    // UnrealBloom chain reachable for A/B and diagnosis; ?post=1 stays a
    // no-op for older capture URLs.
    if (typeof window === 'undefined') return true;
    return new URLSearchParams(window.location.search).get('post') !== '0';
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
      } else {
        engine.composer.setPixelRatio(viewport.dpr);
        engine.composer.setSize(viewport.width, viewport.height);
        // Bloom is gaussian-blurred anyway — run it at low resolution.
        engine.bloomPass.setSize(viewport.width * viewport.dpr * 0.3, viewport.height * viewport.dpr * 0.3);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);
    handleResize();

    // Swap procedural fallback bodies for the authored models — the chosen
    // character drives the player kart, the rest take the rival seats.
    loadKartAssets()
      .then(({ colormapImage, driverScenes, itemBoxScene, kartScenes, racerScene }) => {
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
            attachTripoKartBody(model, authoredKart, isPlayer);
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
        engine.rivalModels.forEach((rival) => {
          attachCharacter(rival.model, rival.character, false);
        });
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
        const itemMaterial = applyHeroRim(
          new THREE.MeshToonMaterial({
            gradientMap: getToonGradient(),
            map: makeKartPaletteTexture(colormapImage),
          })
        );
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
          const rig = itemBoxScene.clone(true);
          rig.traverse((node) => {
            if (node.isMesh) {
              node.material = itemMaterial;
              node.castShadow = true;
            }
          });
          const bounds = new THREE.Box3().setFromObject(rig);
          const size = bounds.getSize(new THREE.Vector3());
          rig.scale.setScalar(7.4 / Math.max(size.x, size.y, size.z));
          rig.updateMatrixWorld(true);
          const fitted = new THREE.Box3().setFromObject(rig);
          rig.position.sub(fitted.getCenter(new THREE.Vector3()));
          box.add(rig);
        });
      })
      .catch(() => {
        // Procedural fallback bodies stay in place.
      });

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

    // Baked building family (Blender, owner-approved direction): swap the
    // procedural district/facade boxes for clean lightmapped buildings.
    // Procedural boxes remain the fallback if the GLB is missing.
    createGameGltfLoader().load(
      '/baked-buildings.glb',
      (gltf) => {
        if (disposed || engineRef.current !== engine) return;
        const variants = ['bldg-tower', 'bldg-block', 'bldg-arcade']
          .map((name) => gltf.scene.getObjectByName(name))
          .filter(Boolean);
        if (!variants.length) {
          console.warn('[kart] /baked-buildings.glb loaded but contains no known building variants — procedural fallback active');
          engine.bakedBuildings = 'loaded-but-empty';
          return;
        }
        engine.buildingSwaps.forEach((swap, index) => {
          const rig = variants[index % variants.length].clone(true);
          rig.traverse((node) => {
            if (node.isMesh) {
              node.material = new THREE.MeshBasicMaterial({ map: node.material?.map || null });
              node.castShadow = false;
              node.receiveShadow = false;
            }
          });
          rig.rotation.y = swap.rotate || 0;
          const bounds = new THREE.Box3().setFromObject(rig);
          const size = bounds.getSize(new THREE.Vector3());
          rig.scale.setScalar(swap.footprint / Math.max(size.x, size.z));
          rig.updateMatrixWorld(true);
          const fitted = new THREE.Box3().setFromObject(rig);
          const center = fitted.getCenter(new THREE.Vector3());
          rig.position.x -= center.x;
          rig.position.z -= center.z;
          rig.position.y -= fitted.min.y;
          swap.group.children
            .filter((child) => child.userData.kind === 'procedural-building')
            .forEach((child) => {
              child.geometry?.dispose?.();
              child.material?.dispose?.();
              swap.group.remove(child);
            });
          swap.group.add(rig);
        });
        engine.bakedBuildings = 'active';
      },
      undefined,
      (error) => {
        console.warn('[kart] /baked-buildings.glb failed to load — procedural fallback active', error);
        engine.bakedBuildings = 'missing';
      }
    );

    const restartRace = () => {
      Object.assign(race, createInitialRace(rivalSeats));
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
      const rawDt = Math.min(0.04, Math.max(0.001, (now - previousFrameTime) / 1000));
      previousFrameTime = now;
      const dt = reducedMotion ? rawDt * 0.86 : rawDt;
      frameTimes.push(now);
      while (frameTimes.length > 40) frameTimes.shift();
      const elapsedWindow = frameTimes.length > 1 ? (frameTimes[frameTimes.length - 1] - frameTimes[0]) / 1000 : 1;
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
          const throttle = input.throttle ? 1 : 0;
          const brake = input.brake ? 1 : 0;
          const targetSteer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
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
          const maxSpeed =
            (race.boostTimer > 0 || driftState.miniTurboTimer > 0 || auroraActive ? BOOST_SPEED : MAX_SPEED) *
            playerKart.stats.topSpeed;
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
          }
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
      });
      // Drift sparks escalate through the tier colors while charging and
      // flash big in the banked tier's color on release.
      const releaseFlash = !race.drift && driftState.releaseFlashTimer > 0;
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
          spark.scale.setScalar(
            0.7 +
              sparkTier * 0.3 +
              Math.sin(race.raceTime * 22 + sparkIndex * 1.7) * 0.18 +
              (releaseFlash ? 0.9 : 0)
          );
        });
      }
      // Tier 2+ ground ice trail: visible while charging tier 2/3 drift.
      const iceTrailTier = race.drift ? driftState.tier : 0;
      engine.playerModel.driftIceTrailGroup.visible = iceTrailTier >= 2;
      if (engine.playerModel.driftIceTrailGroup.visible) {
        engine.playerModel.driftIceTrailGroup.children.forEach((shard, shardIndex) => {
          const trailIntensity = 0.6 + (iceTrailTier - 2) * 0.35;
          shard.material.opacity = 0.5 + trailIntensity * 0.45 + Math.sin(race.raceTime * 18 + shardIndex * 1.3) * 0.12;
          shard.material.emissiveIntensity = 0.55 + trailIntensity * 0.45;
          shard.scale.setScalar(0.9 + trailIntensity * 0.45 + Math.sin(race.raceTime * 14 + shardIndex * 2.1) * 0.12);
        });
      }
      // Mini-turbo cyan burst ring: scale up + fade out for the boost duration.
      const ring = engine.playerModel.miniTurboRing;
      ring.visible = miniTurboActive;
      if (miniTurboActive) {
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
        // After the finish, pull up slightly for a results tableau centered on
        // the kart (staying short of the gate behind it).
        const cameraBackUnits = race.finished ? 30 : viewport.mobile ? 43 : 38;
        const cameraHeight = race.finished
          ? 13
          : (viewport.mobile ? 12.5 : 10.5) * (underpass ? 0.62 : 1);
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
              .addScaledVector(playerSample.tangent, viewport.mobile ? 26 : 30)
              .add(new THREE.Vector3(0, viewport.mobile ? 5.5 : 4.5, 0));
        engine.camera.lookAt(lookAt);
        // Mini-turbo gets a small extra FOV kick on top of the speed widening.
        targetFov =
          (viewport.mobile ? 68 : 70) +
          clamp(race.speed / MAX_SPEED, 0, 1.15) * 7 +
          (miniTurboActive ? 3.5 : 0);
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
      // pmndrs composer takes the frame delta (seconds) for time-based effects.
      if (engine.postChainEnabled) engine.composer.render(dt);
      else engine.composer.render();
      frameWorkSamples.push(performance.now() - now);
      while (frameWorkSamples.length > 40) frameWorkSamples.shift();
      publishTelemetry(race, fpsEstimate, engine.propCount, mode, characterKey, kartKey, trackKey, {
        bakedBuildings: engine.bakedBuildings,
        bakedSpike: engine.bakedSpike,
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
      engine.composer.dispose?.();
      engine.renderer.dispose();
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
  const restart = () => {
    inputRef.current = { ...inputRef.current, restart: true };
  };

  return (
    <div
      className="three-kart-race"
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
        <div className="three-kart-race__badge" data-testid="race-held-item" data-held-item={snapshot.heldItem || 'none'}>
          {snapshot.heldItem === 'fishbone' ? (
            <Fish size={15} />
          ) : snapshot.heldItem === 'slapfish' ? (
            <FishSymbol size={15} />
          ) : snapshot.heldItem === 'avalanche' ? (
            <MountainSnow size={15} />
          ) : snapshot.heldItem === 'sardine' ? (
            <Rocket size={15} />
          ) : snapshot.heldItem === 'blizzard' ? (
            <CloudSnow size={15} />
          ) : snapshot.heldItem === 'aurora' ? (
            <Rainbow size={15} />
          ) : snapshot.heldItem === 'march' ? (
            <Footprints size={15} />
          ) : snapshot.heldItem === 'snowball' ? (
            // The snowball slot wears the character's projectile skin.
            playerCharacter.projectileSkin === 'carrot' ? <Carrot size={15} /> : <Snowflake size={15} />
          ) : snapshot.heldItem === 'cocoa' ? (
            <Coffee size={15} />
          ) : snapshot.heldItem === 'iceshield' || snapshot.shieldActive ? (
            <Shield size={15} />
          ) : (
            <Snowflake size={15} />
          )}
          <span>
            {snapshot.heldItem === 'snowball'
              ? playerCharacter.projectileSkin === 'carrot'
                ? 'CARROT'
                : 'ICE SHARD'
              : snapshot.heldItem
                ? ITEM_LABELS[snapshot.heldItem] || snapshot.heldItem.toUpperCase()
                : snapshot.shieldActive
                  ? 'ON'
                  : '—'}
          </span>
        </div>
      </div>
      {snapshot.countdown > 0 ? (
        <div className="three-kart-race__countdown">{Math.ceil(snapshot.countdown)}</div>
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
      <div className="three-kart-race__touch" aria-label="Race touch controls">
        <button
          type="button"
          onPointerDown={() => setTouch('left', true)}
          onPointerLeave={() => setTouch('left', false)}
          onPointerUp={() => setTouch('left', false)}
        >
          <ArrowLeft size={18} />
        </button>
        <button
          type="button"
          onPointerDown={() => setTouch('right', true)}
          onPointerLeave={() => setTouch('right', false)}
          onPointerUp={() => setTouch('right', false)}
        >
          <ArrowRight size={18} />
        </button>
        <button
          type="button"
          onPointerDown={() => setTouch('brake', true)}
          onPointerLeave={() => setTouch('brake', false)}
          onPointerUp={() => setTouch('brake', false)}
        >
          <ArrowDown size={18} />
        </button>
        <button
          type="button"
          onPointerDown={() => setTouch('throttle', true)}
          onPointerLeave={() => setTouch('throttle', false)}
          onPointerUp={() => setTouch('throttle', false)}
        >
          <ArrowUp size={18} />
        </button>
        <button
          type="button"
          onPointerDown={() => setTouch('drift', true)}
          onPointerLeave={() => setTouch('drift', false)}
          onPointerUp={() => setTouch('drift', false)}
        >
          <Sparkles size={18} />
        </button>
        <button
          type="button"
          aria-label="Fire held item"
          onPointerDown={() => setTouch('item', true)}
          onPointerLeave={() => setTouch('item', false)}
          onPointerUp={() => setTouch('item', false)}
        >
          {playerCharacter.projectileSkin === 'carrot' ? <Carrot size={18} /> : <Snowflake size={18} />}
        </button>
      </div>
    </div>
  );
};
