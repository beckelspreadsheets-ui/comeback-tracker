import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Carrot, Coffee, Fish, Flag, Gauge, RotateCcw, Shield, Snowflake, Sparkles, Trophy, Zap } from 'lucide-react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import racerModelUrl from '../assets/game/models/toy-car-kit/vehicle-drag-racer.glb?url';
import itemBoxModelUrl from '../assets/game/models/toy-car-kit/item-box.glb?url';
import kartColormapUrl from '../assets/game/models/toy-car-kit/colormap.png';
import crrtBunnyModelUrl from '../assets/game/models/avatars/crrt-bunny.glb?url';
import sethPenguinModelUrl from '../assets/game/models/avatars/seth-penguin.glb?url';
import heroKartTripoUrl from '../assets/game/models/tripo/hero-kart-tripo.glb?url';
import iceSledUrl from '../assets/game/models/tripo/ice-sled.glb?url';
import mizzleModelUrl from '../assets/game/models/avatars/mizzle.glb?url';
import tclowModelUrl from '../assets/game/models/avatars/tclow-penguin.glb?url';
import clinicFacadeUrl from '../assets/game/generated/district-facade-clinic.png';
import foodFacadeUrl from '../assets/game/generated/district-facade-food.png';
import garageFacadeUrl from '../assets/game/generated/district-facade-garage.png';
import gymFacadeUrl from '../assets/game/generated/district-facade-gym.png';
import labFacadeUrl from '../assets/game/generated/district-facade-lab.png';
import { COMEBACK_CITY_COURSE_V2 } from './courseV2.js';
import {
  DRIFT_FEEL,
  createDriftState,
  driftLaneRate,
  hopHeightFor,
  updateDriftFeel,
} from './race/driftFeel.js';
import {
  createRivalRacers,
  playerPositionOf,
  rivalPositionsOf,
  updateRivalRacers,
} from './race/rivalRacers.js';
import {
  ageFishBones,
  dropFishBone,
  fishBoneHitFor,
  ITEM_FEEL,
  ITEM_LABELS,
  itemForPickup,
  projectileHitFor,
  throwSnowball,
  updateProjectiles,
} from './race/heldItems.js';
import {
  airPitchFor,
  createAirState,
  createShortcutState,
  launchAir,
  launchShortcut,
  RAMPS,
  SHORTCUT,
  shortcutArcHeight,
  shortcutPitchFor,
  TRICK_FEEL,
  updateAir,
  updateShortcut,
} from './race/airTricks.js';
import { createBasicMaterial } from './race/render/createKartModel.js';
import { createRaceRenderer, fitRaceRendererToCanvas } from './race/render/createRaceScene.js';
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

const TOTAL_LAPS = COMEBACK_CITY_COURSE_V2.laps || 3;
const ROAD_WIDTH = COMEBACK_CITY_COURSE_V2.mainRoadWidth || 50;
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

// Spawn just past the finish line so the gate frames the lap wrap at progress 0
// without crowding the spawn camera.
const START_PROGRESS = wrap01((COMEBACK_CITY_COURSE_V2.startProgress || 0) + 0.03);

const createInitialRace = (rivalSeats = rivalSeatsFor(DEFAULT_CHARACTER_KEY)) => ({
  airState: createAirState(),
  boostHits: 0,
  fishBones: [],
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
  lane: 0,
  position: 1 + RIVALS.length,
  previousProgress: START_PROGRESS,
  progress: START_PROGRESS,
  raceTime: 0,
  // Independent rival sim (Phase 2) — player starts at the back of the grid.
  rivals: createRivalRacers(rivalSeats, { gridProgress: START_PROGRESS }),
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

// Bridge band peaks at progress ~0.467 where the climb crosses over the
// dive (which passes under at ~0.191); peak must clear kart visual height.
// Measured from the generated centerline's self-intersection.
const BRIDGE_BAND = { from: 0.4, peak: 21, to: 0.534 };
// Crest of the bridge — crossing it at speed is a free launch window.
const CREST_PROGRESS = (BRIDGE_BAND.from + BRIDGE_BAND.to) / 2;
const getElevation = (progress) => {
  const p = wrap01(progress);
  if (p > BRIDGE_BAND.from && p < BRIDGE_BAND.to) {
    const t = (p - BRIDGE_BAND.from) / (BRIDGE_BAND.to - BRIDGE_BAND.from);
    return Math.sin(t * Math.PI) * BRIDGE_BAND.peak;
  }
  return 0;
};

const makeTrackCurve = () => {
  const points = COMEBACK_CITY_COURSE_V2.centerline.map(
    (point, index, list) => new THREE.Vector3(point.x, getElevation(index / list.length), point.z)
  );
  return new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.38);
};

// Smoothed road-width table from the authored ribbons — wide carousels,
// narrow skill sections, soft transitions (~35 world units).
const makeWidthTable = () => {
  const N = 224;
  const ribbons = COMEBACK_CITY_COURSE_V2.roadRibbons;
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

const makeSampler = (curve) => {
  const length = curve.getLength();
  const widthTable = makeWidthTable();
  const widthAt = (progress) => {
    const scaled = wrap01(progress) * widthTable.length;
    const low = Math.floor(scaled) % widthTable.length;
    const high = (low + 1) % widthTable.length;
    return lerp(widthTable[low], widthTable[high], scaled - Math.floor(scaled));
  };
  return {
    curve,
    length,
    pointAt(progress, lane = 0) {
      const p = wrap01(progress);
      const center = curve.getPointAt(p);
      center.y = getElevation(p);
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
  const flameMat = createBasicMaterial('#ff7e14', { emissive: '#ff6a08', emissiveIntensity: 1.25 });
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
  [-1.5, 1.5].forEach((x) => {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4.6, 7), flameMat.clone());
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
          emissiveIntensity: 1.0,
        })
      );
      spark.position.set(side * (5.0 + index * 0.3), 0.9 + index * 0.2, -4.2 - index * 0.8);
      driftSparkGroup.add(spark);
    }
  });
  model.add(driftSparkGroup);

  // Real shadow map does the grounding now; keep a faint blob for soft contact.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(6.2 * scale, 22),
    new THREE.MeshBasicMaterial({
      color: '#03060c',
      depthWrite: false,
      opacity: 0.24,
      transparent: true,
    })
  );
  shadow.scale.y = 1.35;
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.07;
  shadow.renderOrder = 2;
  group.add(shadow);

  model.traverse((node) => {
    if (node.isMesh) node.castShadow = true;
  });
  [boostFlame, driftSparkGroup].forEach((vfx) =>
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

  return { boostFlame, driftSparkGroup, driverMount, group, idleFlames, replaceBody, wheels };
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

const ITEM_BOX_COLORS = ['#38d7ff', '#b56cff', '#ff8b21', '#7ee06b', '#ff5d68'];

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

const makeDuskSkyTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#0a0f28');
  gradient.addColorStop(0.5, '#1c2150');
  gradient.addColorStop(0.74, '#462a66');
  gradient.addColorStop(0.86, '#a04a74');
  gradient.addColorStop(1, '#e08a5a');
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
const createToonMaterial = (color, options = {}) =>
  new THREE.MeshToonMaterial({ color, gradientMap: getToonGradient(), ...options });

// ---- Authored models (Kenney Toy Car Kit v1.2, CC0) ------------------------
// The procedural kart builds instantly as a fallback; the authored body is
// hot-swapped in once the GLB resolves.
let kartAssetsPromise = null;
const loadKartAssets = () => {
  if (!kartAssetsPromise) {
    const gltfLoader = new GLTFLoader();
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
    ]).then(([racerGltf, itemBoxGltf, colormapImage, bunnyGltf, sethGltf, tripoKartGltf, mizzleGltf, iceSledGltf, tclowGltf]) => ({
      colormapImage,
      // Keyed by KART_CHARACTERS entries — seats are assigned at race start.
      driverScenes: {
        'crrt-bunny': bunnyGltf?.scene || null,
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
      node.material = new THREE.MeshToonMaterial({
        gradientMap: getToonGradient(),
        map: node.material?.map || null,
      });
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
      node.material = new THREE.MeshToonMaterial({
        gradientMap: getToonGradient(),
        map: node.material?.map || null,
      });
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
  const material = new THREE.MeshToonMaterial({ gradientMap: getToonGradient(), map: texture });
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

const addTrack = (world, sampler) => {
  const vertices = [];
  const uvs = [];
  const indices = [];
  for (let index = 0; index <= TRACK_SAMPLES; index += 1) {
    const progress = index / TRACK_SAMPLES;
    const left = sampler.pointAt(progress, -1).point;
    const right = sampler.pointAt(progress, 1).point;
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
    base: '#2c3450',
    repeat: 1,
    speckles: [
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

  const grassTexture = makeNoiseTexture({
    base: '#1f4636',
    repeat: 16,
    speckles: [
      { color: '#28593f', count: 380, size: 3.4 },
      { color: '#16352a', count: 320, size: 4.2 },
    ],
  });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1120, 1060, 18, 18),
    new THREE.MeshStandardMaterial({ color: '#ffffff', map: grassTexture, roughness: 0.92 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.06;
  ground.receiveShadow = true;
  world.add(setFlatTransform(ground));

  const CURB_RED = new THREE.Color('#ff5d4f');
  const CURB_WHITE = new THREE.Color('#f8fbff');
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
      const { normal, point, tangent } = sampler.pointAt(progress);
      const width = sampler.widthAt(progress);
      const inner = point.clone().addScaledVector(normal, side * innerMul * width);
      const outer = point.clone().addScaledVector(normal, side * outerMul * width);
      inner.y += yBottom;
      outer.y += yTop;
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

  [-1, 1].forEach((side) => {
    const curb = buildCheckerRibbon({
      innerMul: 0.5,
      outerMul: 0.56,
      side,
      unlit: true,
      yBottom: 0.32,
      yTop: 0.18,
    });
    curb.userData.kind = 'curb-ribbon';
    world.add(curb);
    const wall = buildCheckerRibbon({
      checkerEvery: 2,
      colorA: new THREE.Color('#e94d3f'),
      colorB: new THREE.Color('#f8fbff'),
      innerMul: 0.62,
      outerMul: 0.62,
      side,
      yBottom: 0.02,
      yTop: 2.6,
    });
    wall.userData.kind = 'barrier-wall-ribbon';
    world.add(wall);
    // Continuous neon edge rail on top of the barrier — the "curb lights &
    // edge lighting" module from the roadside-props card.
    const railTop = buildCheckerRibbon({
      checkerEvery: TRACK_SAMPLES * 2,
      colorA: new THREE.Color('#36e2ff').multiplyScalar(1.7),
      colorB: new THREE.Color('#36e2ff').multiplyScalar(1.7),
      innerMul: 0.605,
      outerMul: 0.635,
      side,
      unlit: true,
      yBottom: 2.6,
      yTop: 2.6,
    });
    railTop.userData.kind = 'barrier-cap-ribbon';
    world.add(railTop);
  });

  const lineMat = createBasicMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.65 });
  for (let index = 0; index < TRACK_SAMPLES; index += 4) {
    const progress = index / TRACK_SAMPLES;
    const { point, tangent } = sampler.pointAt(progress);
    const mark = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 11.5), lineMat);
    mark.position.copy(point);
    mark.position.y += 0.22;
    mark.rotation.y = Math.atan2(tangent.x, tangent.z);
    world.add(setFlatTransform(mark));
  }
  // ---- Bridge structure (owner feedback: the climb must read as a real
  // bridge, not a floating road). Deck skirts hang below both road edges
  // with a neon underline; chunky pillar pairs with cross-beams carry it.
  const skirtMat = createBasicMaterial('#1a2438', { emissive: '#1a2438', emissiveIntensity: 0.15 });
  const skirtGlowMat = createBasicMaterial('#36e2ff', { emissive: '#36e2ff', emissiveIntensity: 1.1 });
  const SKIRT_STEPS = 26;
  [-1, 1].forEach((side) => {
    [
      { depth: 6.2, material: skirtMat, top: 0.26 },
      { depth: 6.9, material: skirtGlowMat, top: -6.2 },
    ].forEach(({ depth, material, top }) => {
      const positions = [];
      const indices = [];
      for (let step = 0; step <= SKIRT_STEPS; step += 1) {
        const p = BRIDGE_BAND.from - 0.008 + (BRIDGE_BAND.to - BRIDGE_BAND.from + 0.016) * (step / SKIRT_STEPS);
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

  const pillarMat = createBasicMaterial('#3a4a63', { emissive: '#22304a', emissiveIntensity: 0.3 });
  const beamMat = createBasicMaterial('#2a3852');
  // A pillar position that lands on the lower road (the routes share ground at
  // the crossing) would stand in the racing line — skip those.
  const onLowerRoad = (x, z) => {
    for (let index = 0; index < TRACK_SAMPLES; index += 1) {
      const { center } = sampler.pointAt(index / TRACK_SAMPLES);
      if (center.y < 2 && Math.hypot(center.x - x, center.z - z) < ROAD_WIDTH * 0.62) return true;
    }
    return false;
  };
  for (let p = BRIDGE_BAND.from + 0.012; p < BRIDGE_BAND.to - 0.01; p += 0.018) {
    const deckHeight = getElevation(p);
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

const addItemBox = (world, sampler, box, index, questionTexture) => {
  const group = new THREE.Group();
  const { point } = sampler.pointAt(box.progress, box.side || 0);
  group.position.copy(point);
  group.position.y += 4.9;
  group.userData.kind = 'item-box';
  group.userData.progress = box.progress;
  group.userData.index = index;
  const color = ITEM_BOX_COLORS[index % ITEM_BOX_COLORS.length];
  const cube = new THREE.Mesh(
    new RoundedBoxGeometry(6.8, 6.8, 6.8, 1, 0.85),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.72,
      flatShading: true,
      metalness: 0.12,
      opacity: 0.78,
      roughness: 0.24,
      transparent: true,
    })
  );
  cube.rotation.z = 0.42;
  cube.rotation.x = 0.3;
  cube.castShadow = true;
  cube.userData.kind = 'item-cube-fallback';
  group.add(cube);
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

const addFinishGate = (world, sampler) => {
  const gateWidth = sampler.widthAt(0);
  const group = new THREE.Group();
  const { point, tangent } = sampler.pointAt(0);
  group.position.copy(point);
  group.rotation.y = Math.atan2(tangent.x, tangent.z);
  group.userData.kind = 'finish-gate';
  const postMat = createBasicMaterial('#f8fbff');
  const boardMat = createBasicMaterial('#16213e', { emissive: '#38d7ff', emissiveIntensity: 0.4 });
  [-1, 1].forEach((side) => {
    const post = new THREE.Mesh(new RoundedBoxGeometry(2.2, 30, 2.2, 1, 0.5), postMat);
    post.position.set(side * gateWidth * 0.58, 15, 0);
    group.add(post);
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

const addDistrictsAndProps = (world, sampler, loader, buildingSwaps) => {
  const propMat = {
    cone: createBasicMaterial('#ff8b21', { emissive: '#ff8b21', emissiveIntensity: 0.18 }),
    lamp: createBasicMaterial('#9feeff', { emissive: '#56e2ff', emissiveIntensity: 1.3 }),
    planter: createBasicMaterial('#2f8f59'),
    trunk: createBasicMaterial('#70452a'),
    leaf: createBasicMaterial('#7ee06b'),
    tire: createBasicMaterial('#151923'),
  };
  let propCount = 0;
  addOpeningFacadeRun(world, sampler, loader, buildingSwaps);

  COMEBACK_CITY_COURSE_V2.districtAnchors.forEach((district) => {
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
  });

  for (let index = 0; index < 24; index += 1) {
    const progress = (0.035 + index * 0.041) % 1;
    const side = index % 2 === 0 ? -1 : 1;
    const { normal, point, tangent } = sampler.pointAt(progress);
    const group = new THREE.Group();
    group.position.copy(point).addScaledVector(normal, side * (sampler.widthAt(progress) * 0.82 + (index % 3) * 9));
    // The anchor's own road section is cleared by construction, but the
    // route folds back on itself — skip props that land on another section.
    if (minCenterlineDistance(sampler, group.position.x, group.position.z) < ROAD_WIDTH * 0.62) continue;
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

  for (let index = 0; index < 7; index += 1) {
    const progress = (0.12 + index * 0.12) % 1;
    const side = index % 2 === 0 ? -1 : 1;
    const { normal, point } = sampler.pointAt(progress);
    const stack = new THREE.Group();
    stack.position.copy(point).addScaledVector(normal, side * sampler.widthAt(progress) * 0.74);
    if (minCenterlineDistance(sampler, stack.position.x, stack.position.z) < ROAD_WIDTH * 0.62) continue;
    for (let tier = 0; tier < 3; tier += 1) {
      const tire = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.72, 6, 14), propMat.tire);
      tire.position.y = 1 + tier * 1.1;
      tire.rotation.x = Math.PI / 2;
      stack.add(tire);
    }
    world.add(stack);
    propCount += 1;
  }

  COMEBACK_CITY_COURSE_V2.sceneryAnchors.forEach((anchor) => {
    if (anchor.kind === 'water') {
      const water = new THREE.Mesh(
        new THREE.BoxGeometry(anchor.w, 0.4, anchor.d),
        createBasicMaterial(anchor.color, { emissive: anchor.color, emissiveIntensity: 0.24 })
      );
      water.position.set(anchor.x, -0.01, anchor.z);
      world.add(setFlatTransform(water));
    }
    if (anchor.kind === 'skyline') {
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

const createScene = ({
  canvas,
  onUnavailable,
  playerCharacter = characterByKey(DEFAULT_CHARACTER_KEY),
  rivalSeats = rivalSeatsFor(DEFAULT_CHARACTER_KEY),
}) => {
  const renderer = createRaceRenderer({ canvas, onUnavailable });
  if (!renderer) return null;
  renderer.setClearColor('#131a36', 1);
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  // Hard-edged shadows match the toon shading and are markedly cheaper than PCF.
  renderer.shadowMap.type = THREE.BasicShadowMap;

  const scene = new THREE.Scene();
  scene.background = makeDuskSkyTexture();
  scene.fog = new THREE.Fog('#272252', 240, 820);
  const camera = new THREE.PerspectiveCamera(66, 1, 0.25, 860);
  const world = new THREE.Group();
  scene.add(world);
  const loader = new THREE.TextureLoader();
  scene.add(new THREE.HemisphereLight('#8d8ce0', '#2a1e4a', 3.3));
  // Shadow-casting key light rides with the kart so a small, sharp shadow
  // frustum covers the action instead of a blurry one covering the world.
  const sun = new THREE.DirectionalLight('#ffae72', 2.6);
  sun.position.set(-150, 52, -70);
  sun.castShadow = true;
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
  const rim = new THREE.DirectionalLight('#4fd8ff', 2.0);
  rim.position.set(92, 56, 74);
  scene.add(rim);

  // Post-processing: bloom is what makes the neon dusk actually glow.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(640, 360), 0.55, 0.45, 1.0);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const curve = makeTrackCurve();
  const sampler = makeSampler(curve);
  addTrack(world, sampler);
  const questionTexture = makeQuestionTexture();
  const boostPads = COMEBACK_CITY_COURSE_V2.boostPads.map((pad, index) => addPad(world, sampler, pad, index));
  const itemBoxes = COMEBACK_CITY_COURSE_V2.itemBoxes.map((box, index) =>
    addItemBox(world, sampler, box, index, questionTexture)
  );
  RAMPS.forEach((ramp) => addRamp(world, sampler, ramp));
  addRamp(world, sampler, { progress: SHORTCUT.launchProgress, side: SHORTCUT.side }, { dare: true });
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
      createToonMaterial('#f7f1de', { emissive: '#e3d9b4', emissiveIntensity: 0.32 })
    );
    // Items read oversized on purpose (MK rule) — at race speed and camera
    // distance a true-scale prop disappears. (Round-7 owner feedback:
    // "still pretty hard to tell what they are" → another size/glow step.)
    bone.scale.setScalar(1.5);
    bone.position.y = 2.1;
    holder.add(bone);
    addGlowSprite(holder, '#f7f1de', 9, 0.42, 1.6);
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
        createBasicMaterial('#f4fbff', { emissive: '#bfeaff', emissiveIntensity: 0.7 })
      )
    );
    addGlowSprite(snowball, '#9fdcff', 9, 0.45, 0);
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
      new THREE.Mesh(shardGeometry, createBasicMaterial('#dff6ff', { emissive: '#9fdcff', emissiveIntensity: 0.8 }))
    );
    addGlowSprite(iceShard, '#bfeaff', 10, 0.55, 0);
    [snowball, carrot, iceShard].forEach((variant) => {
      variant.visible = false;
      variant.position.y = 1.7;
      holder.add(variant);
    });
    world.add(holder);
    projectilePool.push(holder);
  }
  // Visible crest kicker — the bridge-top launch was firing invisibly
  // (owner-reported); now a glowing lip strip marks exactly where and why.
  {
    const crest = wrap01((BRIDGE_BAND.from + BRIDGE_BAND.to) / 2);
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
  addFinishGate(world, sampler);
  const buildingSwaps = [];
  const propCount = addDistrictsAndProps(world, sampler, loader, buildingSwaps);

  // Owner feedback 2026-06-12: karts read ~20% too big against the track.
  const playerModel = createGroundedKartModel({
    accent: playerCharacter.accent,
    color: playerCharacter.color,
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
    new THREE.MeshBasicMaterial({ color: '#7fdcff', depthWrite: false, opacity: 0.22, transparent: true })
  );
  shieldShell.scale.set(1.12, 0.7, 1.3);
  shieldShell.position.y = 3.4;
  shieldBubble.add(shieldShell);
  const shieldFacets = new THREE.Mesh(
    shieldShellGeometry,
    new THREE.MeshBasicMaterial({ color: '#bfeaff', depthWrite: false, opacity: 0.45, transparent: true, wireframe: true })
  );
  shieldFacets.scale.copy(shieldShell.scale);
  shieldFacets.position.copy(shieldShell.position);
  shieldBubble.add(shieldFacets);
  const orbitShardGeometry = new THREE.OctahedronGeometry(0.85);
  orbitShardGeometry.scale(0.7, 1.6, 0.7);
  for (let index = 0; index < 6; index += 1) {
    const shard = new THREE.Mesh(
      orbitShardGeometry,
      createBasicMaterial('#ecfeff', { emissive: '#9fdcff', emissiveIntensity: 0.85 })
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
  world.add(player);
  const rivalModels = rivalSeats.map((rival) => {
    const model = createGroundedKartModel({
      accent: rival.accent,
      color: rival.color,
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
    bloomPass,
    boostPads,
    fishBonePool,
    projectilePool,
    buildingSwaps,
    camera,
    composer,
    itemBoxes,
    playerModel,
    propCount,
    renderer,
    rivalModels,
    sampler,
    scene,
    shieldBubble,
    sun,
    world,
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

const readInput = (input, autoplay, race, cornerPush = 0) => {
  if (!autoplay) return input.current;
  // Steer against the centrifugal push (into the corner) plus a pull back
  // toward road center; drift the demanding bends, brake for the hairpin,
  // trick when airborne, fire held items on straights. Deterministic.
  const desired = clamp(-cornerPush * 1.4 - race.lane * 0.9, -1, 1);
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

const publishTelemetry = (race, fpsEstimate, propCount, mode, characterKey = DEFAULT_CHARACTER_KEY, kartKey = 'hero') => {
  if (typeof window === 'undefined') return;
  window.__comebackCityKartTelemetry = {
    airborne: race.airState.airborne,
    character: characterKey,
    kart: kartKey,
    fishBonesOnTrack: race.fishBones.length,
    boostHits: race.boostHits,
    countdown: Number(race.countdown.toFixed(2)),
    drift: race.drift,
    driftCharge: Number(race.driftCharge.toFixed(2)),
    driftTier: race.driftTier,
    finished: race.finished,
    heldItem: race.heldItem,
    fpsEstimate: Math.round(fpsEstimate),
    itemPickups: race.itemPickups,
    lap: race.lap,
    miniTurbo: Number(race.driftState.miniTurboTimer.toFixed(2)),
    miniTurboTier: race.driftState.miniTurboTier,
    position: race.position,
    propCount,
    raceTime: Number(race.raceTime.toFixed(2)),
    renderer: 'three-kart',
    rivalCount: RIVALS.length,
    rivalPositions: rivalPositionsOf((race.finished ? TOTAL_LAPS : race.lap - 1) + race.progress, race.rivals),
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const rivalSeats = rivalSeatsFor(characterKey);
    const engine = createScene({
      canvas,
      onUnavailable: (error) => setWebglError(error?.message || 'WebGL unavailable'),
      playerCharacter,
      rivalSeats,
    });
    if (!engine) return undefined;
    engineRef.current = engine;
    finishReportedRef.current = false;
    const race = createInitialRace(rivalSeats);
    // ?itemShowcase=1 parks one of each item visual just past the spawn and
    // raises the ice shield — deterministic close-ups for the approval
    // previews (the live moments are too fast for polled screenshots).
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('itemShowcase') === '1') {
      // Road-edge lanes — the rivals start ahead and sweep the straight, and
      // anything inside their racing line gets eaten before the camera
      // arrives.
      race.fishBones.push({ grace: 0, lane: -0.8, owner: 'showcase', progress: wrap01(START_PROGRESS + 0.038) });
      race.projectiles.push(
        { lane: 0.8, owner: 'showcase', progress: wrap01(START_PROGRESS + 0.044), skin: 'carrot', speed: 0, ttl: 9999 },
        { lane: -0.8, owner: 'showcase', progress: wrap01(START_PROGRESS + 0.05), skin: 'iceshard', speed: 0, ttl: 9999 }
      );
      race.shieldActive = true;
    }
    const viewport = { aspect: 1, dpr: 1, height: 1, mobile: false, width: 1 };
    const frameTimes = [];
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
      engine.composer.setPixelRatio(viewport.dpr);
      engine.composer.setSize(viewport.width, viewport.height);
      // Bloom is gaussian-blurred anyway — run it at low resolution.
      engine.bloomPass.setSize(viewport.width * viewport.dpr * 0.3, viewport.height * viewport.dpr * 0.3);
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
        const itemMaterial = new THREE.MeshToonMaterial({
          gradientMap: getToonGradient(),
          map: makeKartPaletteTexture(colormapImage),
        });
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
      new GLTFLoader().load('/baked-spike.glb', (gltf) => {
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
      });
    }

    // Baked building family (Blender, owner-approved direction): swap the
    // procedural district/facade boxes for clean lightmapped buildings.
    // Procedural boxes remain the fallback if the GLB is missing.
    new GLTFLoader().load(
      '/baked-buildings.glb',
      (gltf) => {
        if (disposed || engineRef.current !== engine) return;
        const variants = ['bldg-tower', 'bldg-block', 'bldg-arcade']
          .map((name) => gltf.scene.getObjectByName(name))
          .filter(Boolean);
        if (!variants.length) return;
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
      },
      undefined,
      () => {}
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

    const frame = () => {
      if (disposed) return;
      const now = performance.now();
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
            const flight = updateShortcut(race.shortcut, dt);
            const landTarget = race.shortcut.failed ? SHORTCUT.failLandProgress : SHORTCUT.landProgress;
            race.previousProgress = race.progress;
            race.progress = lerp(race.shortcut.fromProgress, landTarget, race.shortcut.t);
            if (!race.shortcut.failed) race.lane = lerp(race.shortcut.fromLane, -0.1, race.shortcut.t);
            if (flight.landed) {
              race.landSquashTimer = 0.18;
              if (flight.failed) {
                race.spinTimer = SHORTCUT.failSpin;
                race.spinOuts += 1;
                race.speed = SHORTCUT.failSpeed;
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
            RAMPS.forEach((ramp) => {
              if (
                shortProgressDelta(race.progress, ramp.progress) * engine.sampler.length <
                  TRICK_FEEL.rampHitProgress &&
                Math.abs(race.lane - ramp.side) < TRICK_FEEL.rampHitLane
              ) {
                launchAir(airState, race.speed);
              }
            });
            if (race.previousProgress < CREST_PROGRESS && race.progress >= CREST_PROGRESS) {
              launchAir(airState, race.speed, { big: true });
            }
            // The dare ramp: commit with boost speed or eat a long spin-out.
            if (
              shortProgressDelta(race.progress, SHORTCUT.launchProgress) * engine.sampler.length <
                TRICK_FEEL.rampHitProgress &&
              Math.abs(race.lane - SHORTCUT.side) < TRICK_FEEL.rampHitLane &&
              race.speed > 120
            ) {
              launchShortcut(race.shortcut, race.speed, race.progress, race.lane);
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
          // Held item fire: cocoa boost, ice shield, fish bone behind, or a
          // snowball forward (rendered with the character's projectile skin).
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
            }
            race.heldItem = null;
            race.itemFireCooldown = 0.35;
          }
          race.boostTimer = Math.max(0, race.boostTimer - dt);
          // Kart stats: top speed cap, throttle accel, and steering rate all
          // scale with the chosen kart (hero = 1/1/1, the gate baseline).
          const maxSpeed =
            (race.boostTimer > 0 || driftState.miniTurboTimer > 0 ? BOOST_SPEED : MAX_SPEED) *
            playerKart.stats.topSpeed;
          const accel = throttle && !spinning ? 118 * playerKart.stats.accel : spinning ? -150 : -48;
          const miniTurboAccel = driftState.miniTurboTimer > 0 ? 150 : 0;
          const brakeDrag = brake ? -180 : 0;
          const steeringDrag = Math.abs(race.steer) * (race.drift ? -8 : -22);
          race.speed = clamp(race.speed + (accel + miniTurboAccel + brakeDrag + steeringDrag) * dt, 0, maxSpeed);
          if (!throttle && !brake) race.speed = Math.max(0, race.speed - 38 * dt);
          if (spinning) race.speed = Math.max(46, race.speed);
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
            if (race.lap > TOTAL_LAPS) {
              race.lap = TOTAL_LAPS;
              race.finished = true;
              race.speed = 0;
            }
          }
          COMEBACK_CITY_COURSE_V2.boostPads.forEach((pad) => {
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
          COMEBACK_CITY_COURSE_V2.itemBoxes.forEach((box, index) => {
            const key = `item-${index}`;
            if (shortProgressDelta(race.progress, box.progress) < 0.014 && Math.abs(race.lane - (box.side || 0)) < 0.42) {
              if (!race[key]) {
                race[key] = true;
                race.itemPickups += 1;
                if (!race.heldItem) race.heldItem = itemForPickup(index, race.lap, race.position);
              }
            } else if (shortProgressDelta(race.progress, box.progress) > 0.05) {
              race[key] = false;
            }
          });
          // Fish bones: age drop-immunity, then check the player (airborne
          // karts fly over them; an ice shield eats the hit instead of
          // spinning out).
          ageFishBones(race.fishBones, dt);
          updateProjectiles(race.projectiles, dt, engine.sampler.length);
          if (!airState.airborne && !spinning && race.spinTimer <= 0) {
            const struck = projectileHitFor(race.projectiles, 'player', race.progress, race.lane, engine.sampler.length);
            if (struck) {
              if (race.shieldActive) {
                race.shieldActive = false;
              } else {
                race.spinTimer = ITEM_FEEL.spinDuration;
                race.spinOuts += 1;
                race.speed *= 0.5;
              }
            }
          }
          if (!airState.airborne && !spinning) {
            const fishBoneHit = fishBoneHitFor(race.fishBones, 'player', race.progress, race.lane, engine.sampler.length);
            if (fishBoneHit) {
              if (race.shieldActive) {
                race.shieldActive = false;
              } else {
                race.spinTimer = ITEM_FEEL.spinDuration;
                race.spinOuts += 1;
                race.speed *= 0.5;
                driftState.active = false;
                driftState.charge = 0;
                driftState.tier = 0;
              }
            }
          }
          }
          // Rivals run their own race; bumps knock both karts.
          race.bumpCooldown = Math.max(0, race.bumpCooldown - dt);
          const playerTotal = (race.finished ? TOTAL_LAPS : race.lap - 1) + race.progress;
          const { playerBump } = updateRivalRacers(race.rivals, {
            boostPads: COMEBACK_CITY_COURSE_V2.boostPads,
            boostSpeed: BOOST_SPEED,
            cornerPushFor,
            crestProgress: CREST_PROGRESS,
            curvatureAt: (progress) => trackCurvatureAt(engine.sampler, progress),
            dt,
            finalLap: race.lap === TOTAL_LAPS,
            fishBones: race.fishBones,
            laneScale: engine.sampler.widthAt(race.progress) * 0.44,
            maxSpeed: MAX_SPEED,
            ramps: RAMPS,
            projectiles: race.projectiles,
            player: {
              bumpCooldown: race.bumpCooldown,
              lane: race.lane,
              progress: race.progress,
              speed: race.speed,
              total: playerTotal,
            },
            raceTime: race.raceTime,
            trackLength: engine.sampler.length,
            wallLane: 0.95,
          });
          if (playerBump) {
            race.bumpCooldown = playerBump.cooldown;
            race.lane = clamp(race.lane + playerBump.lanePush, -0.95, 0.95);
            race.speed *= playerBump.speedScale;
          }
          race.position = playerPositionOf(playerTotal, race.rivals);
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
          (race.shortcut.active ? shortcutArcHeight(race.shortcut) : 0),
        pitch: airPitchFor(race.airState) + shortcutPitchFor(race.shortcut),
        slideYaw: driftState.slideYaw,
        squash: race.squash,
      });
      engine.shieldBubble.visible = race.shieldActive;
      if (race.shieldActive) {
        engine.shieldBubble.rotation.y += dt * 1.6;
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
            spark.material.emissiveIntensity = 0.9 + sparkTier * 0.25;
          }
          spark.scale.setScalar(
            0.7 +
              sparkTier * 0.3 +
              Math.sin(race.raceTime * 22 + sparkIndex * 1.7) * 0.18 +
              (releaseFlash ? 0.9 : 0)
          );
        });
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

      // Mario-Kart-style chase camera: low, close, and locked to the track
      // path behind the kart — the camera rides the road, so corners can
      // never put it inside walls or buildings. Slight duck under the bridge.
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
      const targetFov =
        (viewport.mobile ? 68 : 70) +
        clamp(race.speed / MAX_SPEED, 0, 1.15) * 7 +
        (miniTurboActive ? 3.5 : 0);
      if (Math.abs(engine.camera.fov - targetFov) > 0.1) {
        engine.camera.fov = lerp(engine.camera.fov, targetFov, 1 - Math.pow(0.001, dt));
        engine.camera.updateProjectionMatrix();
      }
      // Keep the shadow frustum centered on the action.
      engine.sun.position.set(playerSample.point.x - 95, playerSample.point.y + 110, playerSample.point.z - 45);
      engine.sun.target.position.copy(playerSample.point);
      engine.sun.target.updateMatrixWorld();
      engine.composer.render();
      publishTelemetry(race, fpsEstimate, engine.propCount, mode, characterKey, kartKey);
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
          trackKey: 'comeback-city',
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
    };
  }, [autoplay, characterKey, kartKey, mode, onFinish, onRestart, playerCharacter, playerKart, reducedMotion, runId]);

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
          <span>{snapshot.lap}/{TOTAL_LAPS}</span>
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
