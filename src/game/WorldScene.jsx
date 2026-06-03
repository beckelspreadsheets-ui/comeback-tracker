import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CornerDownRight } from 'lucide-react';
import * as THREE from 'three';
import { CAMERA_PRESETS, VISUAL_PALETTE } from './comebackCityVisuals.jsx';
import { GAME_AVATARS } from './gameProfile.js';
import { WORLD_BOUNDS } from './worldConfig.js';

const DRIVE = {
  acceleration: 56,
  airGrip: 1.25,
  brake: 72,
  boostImpulse: 32,
  boostMaxSpeed: 64,
  coastDrag: 0.54,
  driftChargeRate: 0.92,
  driftGrip: 1.7,
  driftHopVelocity: 7.6,
  driftMinSpeed: 10,
  driftReleaseBoosts: [
    { charge: 2.45, duration: 1.05, impulse: 35, level: 3 },
    { charge: 1.48, duration: 0.82, impulse: 27, level: 2 },
    { charge: 0.72, duration: 0.58, impulse: 19, level: 1 },
  ],
  driftSlipForce: 11.5,
  driftTurnAssist: 0.82,
  gravity: 52,
  jumpCooldown: 0.34,
  jumpVelocity: 20,
  lateralGrip: 12.6,
  maxSpeed: 45,
  reverseAcceleration: 25,
  reverseMaxSpeed: 15,
  rollingDrag: 0.018,
  steerRate: 2.92,
  steerSmoothing: 14,
  throttleSmoothing: 12,
};

const PLAZA_CENTER = new THREE.Vector3(0, 0, 18);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const CITY_STYLE = {
  cream: '#fff8d5',
  fog: '#c9f4f8',
  horizon: '#bdefff',
  ink: '#10151d',
  rim: VISUAL_PALETTE.cyan,
  sky: '#66c8ed',
  skyTop: '#4fb5e4',
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const DEFAULT_SPAWN = { x: 0, z: -42, heading: 0 };
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const sanitizeSpawn = (spawn) => {
  const x = Number(spawn?.x);
  const z = Number(spawn?.z);
  const heading = Number(spawn?.heading);
  return {
    heading: Number.isFinite(heading) ? heading : DEFAULT_SPAWN.heading,
    x: Number.isFinite(x) ? clamp(x, WORLD_BOUNDS.minX + 4, WORLD_BOUNDS.maxX - 4) : DEFAULT_SPAWN.x,
    z: Number.isFinite(z) ? clamp(z, WORLD_BOUNDS.minZ + 4, WORLD_BOUNDS.maxZ - 4) : DEFAULT_SPAWN.z,
  };
};

const normalizeHexColor = (value, fallback) => {
  const raw = String(value || '').trim();
  if (!HEX_COLOR.test(raw)) return fallback;
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
  }
  return raw.toLowerCase();
};

const normalizeHubCosmetics = (cosmetics, avatar) => {
  const paintChoice = GAME_AVATARS.find((item) => item.key === cosmetics?.kartPaint);
  const rawPaintColor = paintChoice?.chassis || cosmetics?.kartPaint;
  const kartPaintColor = normalizeHexColor(rawPaintColor, avatar?.chassis || '#ef4334');
  const trailColor = normalizeHexColor(cosmetics?.trailColor, paintChoice?.accent || avatar?.accent || '#ffd34f');
  const bannerSet = ['classic', 'neon', 'race'].includes(cosmetics?.bannerSet)
    ? cosmetics.bannerSet
    : 'classic';

  return {
    bannerSet,
    kartPaint: paintChoice?.key || (normalizeHexColor(cosmetics?.kartPaint, null) ? 'custom' : avatar?.key || 'nova'),
    kartPaintColor,
    trailColor,
  };
};

const damp = (current, target, smoothing, dt) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-smoothing * dt));

const shade = (hex, amount) => {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = clamp((num >> 16) + amount, 0, 255);
  const g = clamp(((num >> 8) & 255) + amount, 0, 255);
  const b = clamp((num & 255) + amount, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
};

const toVec3 = ({ x, z }, y = 0) => new THREE.Vector3(x, y, z);

const directionToYaw = (direction) => Math.atan2(direction.x, direction.z);

const fitCanvasText = (ctx, text, maxWidth, startSize, weight = 900) => {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  } while (size >= 22);
  return size;
};

const frontBasis = (frontDirection) => ({
  front: frontDirection.clone().normalize(),
  right: new THREE.Vector3(frontDirection.z, 0, -frontDirection.x).normalize(),
});

const worldToFallbackPoint = (position) => ({
  left: `${((position.x - WORLD_BOUNDS.minX) / (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX)) * 100}%`,
  top: `${((position.z - WORLD_BOUNDS.minZ) / (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ)) * 100}%`,
});

const createEmptyPerformanceTelemetry = () => ({
  drawCalls: 0,
  geometries: 0,
  instancedMeshCount: 0,
  lines: 0,
  meshCount: 0,
  objectCount: 0,
  points: 0,
  textures: 0,
  triangles: 0,
});

const isHubDebugOverlayEnabled = () => {
  if (typeof window === 'undefined') return false;
  const query = new URLSearchParams(window.location.search);
  if (query.get('hubDebug') === '1' || query.get('hubDebug') === 'true') return true;
  try {
    return window.localStorage?.getItem('comeback-city-hub-debug') === '1';
  } catch {
    return false;
  }
};

const FallbackWorld = ({ activeDestinationKey, destinations, onEnter, reducedMotion = false }) => (
  <div
    className="absolute inset-0 overflow-hidden bg-[#10151d]"
    data-active-destination-key={activeDestinationKey || ''}
    data-draw-calls="0"
    data-fallback="true"
    data-geometry-count="0"
    data-scene-instanced-mesh-count="0"
    data-scene-mesh-count="0"
    data-scene-object-count="0"
    data-telemetry-ready="true"
    data-reduced-motion={reducedMotion ? 'true' : 'false'}
    data-route-guide-active-key={activeDestinationKey || ''}
    data-route-guide-arrived-key=""
    data-route-guide-intensity="1"
    data-route-guide-target-key={activeDestinationKey || ''}
    data-texture-count="0"
    data-triangles="0"
    data-testid="world-fallback-map"
  >
    <div className="absolute inset-0 bg-[linear-gradient(#20384b_1px,transparent_1px),linear-gradient(90deg,#20384b_1px,transparent_1px)] bg-[size:34px_34px] opacity-35" />
    <div className="absolute inset-x-[-18%] top-[24%] h-24 rotate-[-9deg] bg-[#323844] shadow-[0_0_0_2px_rgba(255,226,119,0.18)]" />
    <div className="absolute inset-x-[-18%] top-[53%] h-24 rotate-[8deg] bg-[#323844] shadow-[0_0_0_2px_rgba(255,226,119,0.18)]" />
    <div className="absolute left-1/2 top-1/2 h-40 w-56 -translate-x-1/2 -translate-y-1/2 rounded-[999px] border-[22px] border-[#323844] bg-[#586b77] shadow-[0_0_0_2px_rgba(255,226,119,0.32)]" />
    <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 border-2 border-[#ffd34f] bg-[#20384b] shadow-[0_0_28px_rgba(255,211,79,0.28)]" />
    {destinations.map((destination) => {
      const active = activeDestinationKey === destination.key;
      return (
        <button
          key={destination.key}
          type="button"
          onClick={() => onEnter(destination)}
          data-destination-key={destination.key}
          data-testid={`fallback-destination-${destination.key}`}
          className={`world-hud-panel pointer-events-auto absolute z-10 w-[96px] -translate-x-1/2 -translate-y-1/2 border px-2 py-2 text-left shadow-[0_16px_38px_rgba(0,0,0,0.34)] backdrop-blur-sm transition-transform hover:scale-105 ${
            active ? 'border-[#ffd34f] bg-[#10151d]/[0.92] text-[#ffd34f]' : 'border-white/14 bg-[#10151d]/[0.76] text-white'
          }`}
          style={{
            ...worldToFallbackPoint(destination.position),
            '--destination': destination.accent,
          }}
          title={destination.title}
        >
          <span className="block truncate font-mono text-[10px] font-black uppercase leading-none">
            {destination.shortTitle}
          </span>
          <span className="mt-1 block truncate font-mono text-[8px] uppercase tracking-[0.1em] text-white/54">
            {destination.meta}
          </span>
        </button>
      );
    })}
  </div>
);

export const WorldScene = ({
  activeDestinationKey,
  destinations,
  hubCosmetics = null,
  initialSpawn = null,
  profile,
  onEnter,
  onNearbyChange,
  onPlayerPoseChange = null,
  referenceMode = false,
  reducedMotion = false,
  telemetryDetails = null,
}) => {
  const canvasRef = useRef(null);
  const activeDestinationRef = useRef(activeDestinationKey);
  const initialSpawnRef = useRef(initialSpawn);
  const onPlayerPoseChangeRef = useRef(onPlayerPoseChange);
  const telemetryDetailsRef = useRef(telemetryDetails);
  const touchControlRef = useRef({ drift: 0, jumpQueued: false, steer: 0, throttle: 0 });
  const nearbyDestinationRef = useRef(null);
  const [renderFallback, setRenderFallback] = useState(false);

  useEffect(() => {
    activeDestinationRef.current = activeDestinationKey;
  }, [activeDestinationKey]);

  useEffect(() => {
    telemetryDetailsRef.current = telemetryDetails;
  }, [telemetryDetails]);

  useEffect(() => {
    onPlayerPoseChangeRef.current = onPlayerPoseChange;
  }, [onPlayerPoseChange]);

  useEffect(() => {
    if (!renderFallback || referenceMode || typeof window === 'undefined') return undefined;
    const effectiveReducedMotion = Boolean(
      reducedMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    );
    window.__comebackCityHubTelemetry = {
      ...(telemetryDetailsRef.current || {}),
      activeDestinationKey: activeDestinationRef.current || null,
      fallback: true,
      fpsEstimate: null,
      hubCosmetics: normalizeHubCosmetics(hubCosmetics, profile.avatar),
      nearbyDestinationKey: null,
      performance: createEmptyPerformanceTelemetry(),
      player: null,
      ready: true,
      reducedMotion: effectiveReducedMotion,
      routeGuide: {
        activeKey: activeDestinationRef.current || null,
        arrivedKey: null,
        intensity: 1,
        targetKey: activeDestinationRef.current || null,
      },
    };
    return () => {
      if (window.__comebackCityHubTelemetry?.fallback) {
        delete window.__comebackCityHubTelemetry;
      }
    };
  }, [hubCosmetics, profile.avatar, reducedMotion, referenceMode, renderFallback]);

  const pressDrive = (input) => (event) => {
    event.preventDefault();
    Object.assign(touchControlRef.current, input);
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic pointer events used by smoke tests may not own a browser pointer capture.
    }
  };

  const releaseDrive = (input) => (event) => {
    event.preventDefault();
    Object.assign(touchControlRef.current, input);
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // See pressDrive.
    }
  };

  const jumpDrive = (event) => {
    event.preventDefault();
    touchControlRef.current.jumpQueued = true;
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // See pressDrive.
    }
  };

  const enterNearby = (event) => {
    event.preventDefault();
    if (nearbyDestinationRef.current) onEnter(nearbyDestinationRef.current);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (renderFallback) return undefined;
    if (!canvas) return undefined;

    const webglProbe = document.createElement('canvas');
    const webglSupported = Boolean(
      webglProbe.getContext('webgl2') ||
        webglProbe.getContext('webgl') ||
        webglProbe.getContext('experimental-webgl')
    );
    if (!webglSupported) {
      setRenderFallback(true);
      return undefined;
    }

    const driveTune = { ...DRIVE, ...(profile.avatar.drive || {}) };
    const hubTheme = normalizeHubCosmetics(hubCosmetics, profile.avatar);
    const getBannerColor = (destination) => {
      if (hubTheme.bannerSet === 'neon') return destination.accent;
      if (hubTheme.bannerSet === 'race') return hubTheme.trailColor;
      return destination.banner || destination.accent;
    };
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(CITY_STYLE.sky);
    scene.fog = new THREE.Fog(CITY_STYLE.fog, 248, 560);

    const camera = new THREE.PerspectiveCamera(58, 1, 0.35, 620);
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        depth: true,
        powerPreference: 'high-performance',
        stencil: false,
      });
    } catch (error) {
      console.warn('Comeback City WebGL renderer unavailable, using 2D world fallback:', error);
      setRenderFallback(true);
      return undefined;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const reducedMotionQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    const getReducedMotion = (mediaMatches = reducedMotionQuery?.matches) =>
      Boolean(reducedMotion || mediaMatches);
    const motionState = { reduced: getReducedMotion() };
    const syncReducedMotion = (event) => {
      motionState.reduced = getReducedMotion(event.matches);
      canvas.dataset.reducedMotion = motionState.reduced ? 'true' : 'false';
    };
    canvas.dataset.reducedMotion = motionState.reduced ? 'true' : 'false';
    if (reducedMotionQuery?.addEventListener) {
      reducedMotionQuery.addEventListener('change', syncReducedMotion);
    } else {
      reducedMotionQuery?.addListener?.(syncReducedMotion);
    }

    let lastFrameTime = performance.now();
    const interactiveObjects = [];
    const collisionBoxes = [];
    const destinationGroups = new Map();
    const destinationEffects = new Map();
    const portalPads = new Map();
    const routeGuides = new Map();
    const boostPads = [];
    const debugOverlayEnabled = !referenceMode && isHubDebugOverlayEnabled();
    const animatedClouds = [];
    const animatedBanners = [];
    const animatedDistrictParts = [];
    const drivableRoutes = destinations.map((destination) => ({
      destination,
      entry: toVec3(destination.entry || destination.position),
    }));
    const keys = new Set();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const cameraLookTarget = new THREE.Vector3(0, 7, -8);
    const viewport = { mobile: false };
    const gestureDrive = { active: false, originX: 0, originY: 0, steer: 0, throttle: 0 };
    const pointerDown = { x: 0, y: 0, t: 0, moved: false };
    const spawn = sanitizeSpawn(initialSpawnRef.current);
    const kartState = {
      boostTimer: 0,
      boostTier: 0,
      driftActive: false,
      driftCharge: 0,
      driftDirection: 0,
      driftInput: 0,
      driftReleasePulse: 0,
      grounded: true,
      heading: spawn.heading,
      height: 0,
      jumpCooldown: 0,
      jumpQueued: false,
      landPulse: 0,
      nearbyKey: null,
      position: new THREE.Vector3(spawn.x, 0, spawn.z),
      speed: 0,
      steerInput: 0,
      throttleInput: 0,
      velocity: new THREE.Vector3(0, 0, 0),
      verticalVelocity: 0,
      visualRoll: 0,
    };
    let poseEmitElapsed = 0;
    let lastPoseEmit = { heading: spawn.heading, x: spawn.x, z: spawn.z };

    const emitPlayerPose = (force = false) => {
      const pose = {
        heading: Number(kartState.heading.toFixed(3)),
        x: Number(kartState.position.x.toFixed(2)),
        z: Number(kartState.position.z.toFixed(2)),
      };
      const moved =
        Math.hypot(pose.x - lastPoseEmit.x, pose.z - lastPoseEmit.z) > 1.2 ||
        Math.abs(pose.heading - lastPoseEmit.heading) > 0.08;
      if (!force && !moved) return;
      lastPoseEmit = pose;
      onPlayerPoseChangeRef.current?.(pose);
    };

    const createToonRampTexture = () => {
      const data = new Uint8Array([
        54, 62, 78, 255,
        126, 140, 154, 255,
        210, 222, 224, 255,
        255, 249, 214, 255,
      ]);
      const texture = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
      return texture;
    };

    const toonRampTexture = createToonRampTexture();

    const flatMaterial = (color, options = {}) => {
      const {
        metalness,
        roughness,
        ...toonOptions
      } = options;
      return new THREE.MeshToonMaterial({
        color,
        gradientMap: toonRampTexture,
        ...toonOptions,
      });
    };

    const basicMaterial = (color, options = {}) =>
      new THREE.MeshBasicMaterial({ color, ...options });

    const surfaceMaterial = (color, options = {}) =>
      new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        metalness: 0,
        roughness: 0.88,
        ...options,
      });

    const translucentMaterial = (color, opacity) =>
      basicMaterial(color, {
        depthWrite: false,
        opacity,
        side: THREE.DoubleSide,
        transparent: true,
      });

    const setGuideObjectOpacity = (object, opacityScale) => {
      if (!object) return;
      const targets = Array.isArray(object) ? object : [object];
      targets.forEach((target) => {
        target?.traverse?.((node) => {
          const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
          materials.forEach((material) => {
            if (material.userData.baseGuideOpacity == null) {
              material.userData.baseGuideOpacity = material.opacity == null ? 1 : material.opacity;
            }
            material.transparent = true;
            material.opacity = material.userData.baseGuideOpacity * opacityScale;
          });
        });
      });
    };

    const createSurfaceTexture = (base, accents, flecks = 900) => {
      const textureCanvas = document.createElement('canvas');
      textureCanvas.width = 256;
      textureCanvas.height = 256;
      const ctx = textureCanvas.getContext('2d');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

      for (let i = 0; i < flecks; i += 1) {
        ctx.fillStyle = accents[i % accents.length];
        const x = Math.random() * textureCanvas.width;
        const y = Math.random() * textureCanvas.height;
        const width = 1 + Math.random() * 3.5;
        const height = 1 + Math.random() * 3.5;
        ctx.globalAlpha = 0.18 + Math.random() * 0.34;
        ctx.fillRect(x, y, width, height);
      }
      ctx.globalAlpha = 1;

      const texture = new THREE.CanvasTexture(textureCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2.8, 2.8);
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      return texture;
    };

    const createBlobShadowTexture = () => {
      const textureCanvas = document.createElement('canvas');
      textureCanvas.width = 128;
      textureCanvas.height = 128;
      const ctx = textureCanvas.getContext('2d');
      const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 58);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
      gradient.addColorStop(0.54, 'rgba(0, 0, 0, 0.26)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
      const texture = new THREE.CanvasTexture(textureCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const asphaltTexture = createSurfaceTexture('#454c56', ['#343b45', '#58616c', '#68727c'], 1400);
    const grassTexture = createSurfaceTexture('#57ac63', ['#3d884b', '#6dc977', '#2f7441'], 1100);
    const plazaTexture = createSurfaceTexture('#6d7880', ['#59646d', '#83909a', '#95a4ad'], 900);
    const blobShadowTexture = createBlobShadowTexture();

    const darkMaterial = flatMaterial('#121824');
    const asphaltMaterial = surfaceMaterial('#454c56', { map: asphaltTexture, roughness: 0.94 });
    const asphaltShadeMaterial = surfaceMaterial('#343b45', { map: asphaltTexture, roughness: 0.95 });
    const curbMaterial = surfaceMaterial('#8d969e');
    const curbLipMaterial = basicMaterial('#f3ece0');
    const dashMaterial = basicMaterial('#ffe277');
    const grassMaterial = surfaceMaterial('#57ac63', { map: grassTexture, roughness: 0.98 });
    const grassShadeMaterial = surfaceMaterial('#438f52', { roughness: 0.98 });
    const cityBlockMaterial = surfaceMaterial('#718587', { map: plazaTexture, roughness: 0.94 });
    const plazaMaterial = surfaceMaterial('#6d7880', { map: plazaTexture, roughness: 0.92 });
    const plazaTierMaterial = surfaceMaterial('#7d8d95', { map: plazaTexture, roughness: 0.9 });
    const vehicleShadowMaterial = basicMaterial('#000000', {
      depthWrite: false,
      map: blobShadowTexture,
      opacity: 0.28,
      transparent: true,
    });
    const glassMaterial = flatMaterial('#bdf6ff', {
      emissive: '#44d7d0',
      emissiveIntensity: 0.32,
      roughness: 0.32,
    });

    scene.add(new THREE.HemisphereLight('#fff6d6', '#225464', 2.65));
    const sun = new THREE.DirectionalLight('#fff0be', 3.45);
    sun.position.set(-74, 116, -58);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 240;
    sun.shadow.camera.left = -150;
    sun.shadow.camera.right = 150;
    sun.shadow.camera.top = 150;
    sun.shadow.camera.bottom = -150;
    scene.add(sun);

    const rimLight = new THREE.DirectionalLight(CITY_STYLE.rim, 1.25);
    rimLight.position.set(86, 55, 92);
    scene.add(rimLight);

    const warmFill = new THREE.DirectionalLight('#ffb46f', 0.54);
    warmFill.position.set(42, 32, -88);
    scene.add(warmFill);

    const world = new THREE.Group();
    scene.add(world);

    const addEdgeOutline = (mesh, opacity = 0.34) => {
      if (!mesh?.geometry) return mesh;
      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry, 24),
        new THREE.LineBasicMaterial({
          color: '#07111b',
          depthWrite: false,
          opacity,
          transparent: true,
        })
      );
      outline.renderOrder = 2;
      mesh.add(outline);
      return mesh;
    };

    const addMesh = (geometry, material, position, rotation = {}, parent = world) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
      mesh.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      if (parent !== world && geometry.type === 'BoxGeometry') addEdgeOutline(mesh, 0.28);
      return mesh;
    };

    const addLocalBox = (parent, size, position, material, rotation = {}) =>
      addMesh(
        new THREE.BoxGeometry(size.x, size.y, size.z),
        material,
        position,
        rotation,
        parent
      );

    const makeLabelTexture = (text, fill, stroke = '#10151d') => {
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 896;
      labelCanvas.height = 256;
      const ctx = labelCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(20, 18, labelCanvas.width - 40, 24);
      ctx.fillStyle = shade(fill, -34);
      ctx.fillRect(20, labelCanvas.height - 44, labelCanvas.width - 40, 24);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 18;
      ctx.strokeRect(9, 9, labelCanvas.width - 18, labelCanvas.height - 18);
      ctx.strokeStyle = '#fff8d5';
      ctx.lineWidth = 5;
      ctx.strokeRect(32, 32, labelCanvas.width - 64, labelCanvas.height - 64);

      const label = text.toUpperCase();
      const words = label.split(' ');
      const lines = label.length > 12 && words.length > 1 ? [words[0], words.slice(1).join(' ')] : [label];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      const fontSize = lines.length > 1 ? 66 : fitCanvasText(ctx, label, 760, 86);
      ctx.font = `900 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      lines.forEach((line, index) => {
        const y = lines.length > 1 ? 96 + index * 70 : labelCanvas.height / 2 + 5;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 12;
        ctx.strokeText(line, labelCanvas.width / 2, y);
        ctx.fillStyle = '#fff8d5';
        ctx.fillText(line, labelCanvas.width / 2, y);
      });

      const texture = new THREE.CanvasTexture(labelCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      return texture;
    };

    const makeSpriteLabelTexture = (text, accent, icon = '') => {
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 768;
      labelCanvas.height = 224;
      const ctx = labelCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = shade(accent, -48);
      ctx.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(labelCanvas.width - 42, 0);
      ctx.lineTo(labelCanvas.width, 42);
      ctx.lineTo(labelCanvas.width, labelCanvas.height);
      ctx.lineTo(42, labelCanvas.height);
      ctx.lineTo(0, labelCanvas.height - 42);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, labelCanvas.width, 30);
      ctx.fillRect(0, labelCanvas.height - 18, labelCanvas.width, 18);
      ctx.strokeStyle = '#f6fbff';
      ctx.lineWidth = 7;
      ctx.strokeRect(13, 13, labelCanvas.width - 26, labelCanvas.height - 26);
      ctx.fillStyle = 'rgba(8, 20, 32, 0.28)';
      ctx.fillRect(32, 54, labelCanvas.width - 64, 18);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      const label = text.toUpperCase();
      const fontSize = fitCanvasText(ctx, label, 610, 92);
      ctx.font = `900 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.strokeStyle = '#061522';
      ctx.lineWidth = 16;
      ctx.strokeText(label, labelCanvas.width / 2 + (icon ? 42 : 0), 127);
      ctx.fillStyle = '#f6fbff';
      ctx.fillText(label, labelCanvas.width / 2 + (icon ? 42 : 0), 127);

      if (icon) {
        ctx.fillStyle = '#f6fbff';
        ctx.strokeStyle = '#061522';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.roundRect?.(56, 78, 96, 96, 14);
        if (!ctx.roundRect) {
          ctx.rect(56, 78, 96, 96);
        }
        ctx.fill();
        ctx.stroke();
        ctx.font = '900 54px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillStyle = shade(accent, -58);
        ctx.fillText(icon, 104, 129);
      }

      const texture = new THREE.CanvasTexture(labelCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      return texture;
    };

    const createFloatingLabel = (destination, label, icon, position, width = 20.8, height = 6.1) => {
      const texture = makeSpriteLabelTexture(label, destination.accent, icon);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          depthWrite: false,
          map: texture,
          transparent: true,
        })
      );
      sprite.position.copy(position);
      sprite.scale.set(width, height, 1);
      sprite.renderOrder = 4;
      world.add(sprite);
      return sprite;
    };

    const createBillboardSign = ({
      accent = '#ffd34f',
      fill,
      height,
      stroke = '#10151d',
      text,
      width,
    }) => {
      const group = new THREE.Group();
      const frameMaterial = flatMaterial(stroke);
      const texture = makeLabelTexture(text, fill, stroke);
      const signMaterial = basicMaterial('#ffffff', { map: texture, side: THREE.FrontSide });

      const halo = new THREE.Mesh(
        new THREE.PlaneGeometry(width + 3.2, height + 2.1),
        translucentMaterial(accent, 0.16)
      );
      halo.position.z = 0.1;
      group.add(halo);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 1.4, height + 1, 0.58), frameMaterial);
      frame.castShadow = true;
      frame.receiveShadow = true;
      group.add(frame);

      const front = new THREE.Mesh(new THREE.PlaneGeometry(width, height), signMaterial);
      front.position.z = 0.34;
      group.add(front);

      const back = new THREE.Mesh(new THREE.PlaneGeometry(width, height), signMaterial.clone());
      back.position.z = -0.34;
      back.rotation.y = Math.PI;
      group.add(back);

      group.userData.halo = halo;
      group.userData.frameMaterial = frameMaterial;
      group.userData.baseY = 0;
      return group;
    };

    const markInteractive = (group, destination) => {
      group.userData.destinationId = destination.key;
      group.traverse((child) => {
        child.userData.destinationId = destination.key;
        if (child.isMesh) interactiveObjects.push(child);
      });
    };

    const registerDestinationEffect = (destination, effect) => {
      const current = destinationEffects.get(destination.key) || {
        banners: [],
        gates: [],
        signs: [],
        statusMarkers: [],
      };
      Object.entries(effect).forEach(([key, value]) => {
        if (Array.isArray(current[key])) current[key].push(value);
        else current[key] = value;
      });
      destinationEffects.set(destination.key, current);
    };

    const createSkyGradient = () => {
      const skyDome = new THREE.Mesh(
        new THREE.SphereGeometry(262, 32, 16),
        new THREE.ShaderMaterial({
          depthWrite: false,
          fog: false,
          side: THREE.BackSide,
          uniforms: {
            bottomColor: { value: new THREE.Color('#89d895') },
            horizonColor: { value: new THREE.Color(CITY_STYLE.horizon) },
            topColor: { value: new THREE.Color(CITY_STYLE.skyTop) },
          },
          vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
              vec4 worldPosition = modelMatrix * vec4(position, 1.0);
              vWorldPosition = worldPosition.xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 bottomColor;
            uniform vec3 horizonColor;
            uniform vec3 topColor;
            varying vec3 vWorldPosition;
            void main() {
              float h = normalize(vWorldPosition).y;
              vec3 low = mix(bottomColor, horizonColor, smoothstep(-0.55, 0.04, h));
              vec3 high = mix(horizonColor, topColor, smoothstep(0.02, 0.82, h));
              gl_FragColor = vec4(mix(low, high, smoothstep(-0.02, 0.42, h)), 1.0);
            }
          `,
        })
      );
      skyDome.position.set(0, 32, 18);
      world.add(skyDome);

      [
        { y: 42, h: 28, color: CITY_STYLE.horizon, z: 214, opacity: 0.035 },
        { y: 78, h: 44, color: '#d9f4f6', z: 218, opacity: 0.018 },
      ].forEach((band) => {
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(380, band.h),
          basicMaterial(band.color, {
            opacity: band.opacity,
            side: THREE.DoubleSide,
            transparent: true,
          })
        );
        plane.position.set(0, band.y, band.z);
        world.add(plane);
      });

      const sunDisc = new THREE.Mesh(
        new THREE.CircleGeometry(14, 28),
        basicMaterial('#fff3a0', { opacity: 0.82, side: THREE.DoubleSide, transparent: true })
      );
      sunDisc.position.set(88, 102, 181);
      world.add(sunDisc);

      const cloudMaterial = basicMaterial('#f6fbff', { transparent: true, opacity: 0.78 });
      const cloudGeometry = new THREE.DodecahedronGeometry(1, 0);
      [
        { x: -92, y: 88, z: 176, scale: 7.2 },
        { x: -28, y: 107, z: 184, scale: 5.4 },
        { x: 42, y: 92, z: 178, scale: 6.3 },
        { x: 112, y: 76, z: 170, scale: 4.8 },
      ].forEach((cloud, cloudIndex) => {
        const group = new THREE.Group();
        group.position.set(cloud.x, cloud.y, cloud.z);
        group.userData.cloudSpeed = 0.018 + cloudIndex * 0.004;
        [-1.6, -0.45, 0.8, 1.85].forEach((offset, puffIndex) => {
          const puff = new THREE.Mesh(cloudGeometry, cloudMaterial);
          puff.position.set(offset * cloud.scale, Math.sin(puffIndex) * cloud.scale * 0.18, 0);
          puff.scale.set(
            cloud.scale * (0.82 + puffIndex * 0.08),
            cloud.scale * (0.42 + (puffIndex % 2) * 0.12),
            cloud.scale * 0.34
          );
          group.add(puff);
        });
        animatedClouds.push(group);
        world.add(group);
      });
    };

    const createGround = () => {
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(340, 330, 18, 18), grassMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.08;
      ground.receiveShadow = true;
      world.add(ground);

      const cityBase = new THREE.Mesh(new THREE.PlaneGeometry(258, 246, 10, 10), cityBlockMaterial);
      cityBase.rotation.x = -Math.PI / 2;
      cityBase.position.set(0, -0.045, 18);
      cityBase.receiveShadow = true;
      world.add(cityBase);

      [
        { x: -88, z: -72, w: 46, d: 30 },
        { x: 88, z: -72, w: 46, d: 30 },
        { x: -95, z: 68, w: 38, d: 58 },
        { x: 95, z: 68, w: 38, d: 58 },
        { x: -17, z: 104, w: 20, d: 20 },
        { x: 17, z: 104, w: 20, d: 20 },
      ].forEach((patch) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(patch.w, 0.08, patch.d), grassShadeMaterial);
        mesh.position.set(patch.x, 0.01, patch.z);
        mesh.receiveShadow = true;
        world.add(mesh);
      });
    };

    const createRoadArrow = (x, z, yaw, color = '#ffe277', scale = 1) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 5);
      shape.lineTo(3.7, 0.6);
      shape.lineTo(1.4, 0.6);
      shape.lineTo(1.4, -4.5);
      shape.lineTo(-1.4, -4.5);
      shape.lineTo(-1.4, 0.6);
      shape.lineTo(-3.7, 0.6);
      shape.lineTo(0, 5);
      const arrow = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        basicMaterial(color, { side: THREE.DoubleSide })
      );
      arrow.position.set(x, 0.31, z);
      arrow.rotation.x = -Math.PI / 2;
      arrow.rotation.z = yaw + Math.PI;
      arrow.scale.setScalar(scale);
      world.add(arrow);
      return arrow;
    };

    const createRoadChevron = (x, z, yaw, color, scale = 1) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 4.2);
      shape.lineTo(4.6, -2.5);
      shape.lineTo(2.2, -4.2);
      shape.lineTo(0, -0.9);
      shape.lineTo(-2.2, -4.2);
      shape.lineTo(-4.6, -2.5);
      shape.lineTo(0, 4.2);
      const chevron = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        basicMaterial(color, { opacity: 0.78, side: THREE.DoubleSide, transparent: true })
      );
      chevron.position.set(x, 0.37, z);
      chevron.rotation.x = -Math.PI / 2;
      chevron.rotation.z = yaw + Math.PI;
      chevron.scale.setScalar(scale);
      world.add(chevron);
      return chevron;
    };

    const createRoadDecals = () => {
      for (let lane = -1; lane <= 1; lane += 1) {
        for (let row = 0; row < 4; row += 1) {
          const tile = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 0.06, 2.5),
            basicMaterial(row % 2 === Math.abs(lane) % 2 ? CITY_STYLE.cream : '#1c2631', {
              opacity: row % 2 === Math.abs(lane) % 2 ? 0.84 : 0.58,
              transparent: true,
            })
          );
          tile.position.set(lane * 3.1, 0.39, -54 + row * 3);
          world.add(tile);
        }
      }

      const createCrosswalk = (center, yaw, accent) => {
        for (let i = -2; i <= 2; i += 1) {
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.72, 0.08, 7.8),
            basicMaterial(i % 2 === 0 ? '#f6fbff' : '#dbe7ea', { opacity: 0.82, transparent: true })
          );
          stripe.position.set(center.x, 0.41, center.z);
          stripe.rotation.y = yaw;
          stripe.translateX(i * 1.65);
          world.add(stripe);
        }

        const routeLine = new THREE.Mesh(
          new THREE.BoxGeometry(0.48, 0.09, 12.5),
          basicMaterial(accent, { opacity: 0.65, transparent: true })
        );
        routeLine.position.set(center.x, 0.43, center.z);
        routeLine.rotation.y = yaw;
        world.add(routeLine);
      };

      destinations.forEach((destination) => {
        const entry = toVec3(destination.entry || destination.position);
        const travel = entry.clone().sub(PLAZA_CENTER);
        const yaw = directionToYaw(travel);
        [0.56, 0.69, 0.82].forEach((t, index) => {
          const point = PLAZA_CENTER.clone().lerp(entry, t);
          createRoadChevron(point.x, point.z, yaw, destination.accent, 0.58 + index * 0.08);
        });
        createCrosswalk(PLAZA_CENTER.clone().lerp(entry, 0.88), yaw, destination.accent);
      });
    };

    const addRoadSegment = (a, b, width = 16, dashes = true, y = 0.09) => {
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.max(1, Math.hypot(dx, dz));
      const angle = -Math.atan2(dz, dx);
      const mid = new THREE.Vector3((a.x + b.x) / 2, y, (a.z + b.z) / 2);
      const nx = -dz / length;
      const nz = dx / length;

      const road = new THREE.Mesh(new THREE.BoxGeometry(length, 0.2, width), asphaltMaterial);
      road.position.copy(mid);
      road.rotation.y = angle;
      road.receiveShadow = true;
      world.add(road);

      [-1, 1].forEach((side) => {
        const curb = new THREE.Mesh(new THREE.BoxGeometry(length, 0.46, 0.9), curbMaterial);
        curb.position.copy(mid);
        curb.position.x += nx * side * (width / 2 + 0.5);
        curb.position.z += nz * side * (width / 2 + 0.5);
        curb.position.y += 0.12;
        curb.rotation.y = angle;
        curb.castShadow = true;
        curb.receiveShadow = true;
        world.add(curb);

        const lip = new THREE.Mesh(new THREE.BoxGeometry(length, 0.12, 0.24), curbLipMaterial);
        lip.position.copy(curb.position);
        lip.position.y += 0.3;
        lip.rotation.y = angle;
        world.add(lip);
      });

      if (!dashes) return;
      for (let offset = 7; offset < length - 4; offset += 14) {
        const t = offset / length;
        const dash = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.07, 0.58), dashMaterial);
        dash.position.set(a.x + dx * t, y + 0.18, a.z + dz * t);
        dash.rotation.y = angle;
        world.add(dash);
      }
    };

    const addRoadPath = (points, width = 13, closed = false, y = 0.09) => {
      for (let i = 0; i < points.length - 1; i += 1) {
        addRoadSegment(points[i], points[i + 1], width, true, y);
      }
      if (closed) addRoadSegment(points[points.length - 1], points[0], width, true, y);
    };

    const addRoadLoop = () => {
      const points = Array.from({ length: 42 }, (_, index) => {
        const t = (Math.PI * 2 * index) / 42;
        return {
          x: Math.cos(t) * 56,
          z: PLAZA_CENTER.z + Math.sin(t) * 44,
        };
      });
      addRoadPath(points, 15.5, true);
    };

    const createBoostPad = (x, z, yaw, color = '#44d7d0') => {
      const group = new THREE.Group();
      group.position.set(x, 0.35, z);
      group.rotation.y = yaw;

      const padMaterial = flatMaterial(color, { emissive: color, emissiveIntensity: 0.34, roughness: 0.62 });
      const pad = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.28, 6.4), padMaterial);
      pad.castShadow = true;
      pad.receiveShadow = true;
      group.add(pad);

      const strips = [];
      [-2.7, 0, 2.7].forEach((offset) => {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.09, 5.3), basicMaterial('#fff8bf'));
        strip.position.set(offset, 0.22, 0);
        strip.rotation.z = 0.45;
        strips.push(strip);
        group.add(strip);
      });

      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(13.2, 8.6),
        translucentMaterial(color, 0.16)
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.02;
      group.add(glow);

      boostPads.push({
        cooldown: 0,
        glow,
        group,
        padMaterial,
        position: new THREE.Vector3(x, 0, z),
        strips,
      });
      world.add(group);
    };

    const createStreetLight = (x, z, color = '#ffd34f', height = 10) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, height, 6), darkMaterial);
      pole.position.y = height / 2;
      pole.castShadow = true;
      group.add(pole);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.34, 0.34), darkMaterial);
      arm.position.set(1.8, height - 1.2, 0);
      arm.castShadow = true;
      group.add(arm);

      const bulb = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.45, 0),
        flatMaterial(color, { emissive: color, emissiveIntensity: 0.95 })
      );
      bulb.position.set(4.1, height - 1.25, 0);
      group.add(bulb);

      const glow = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), translucentMaterial(color, 0.16));
      glow.position.copy(bulb.position);
      glow.rotation.y = Math.PI / 2;
      group.add(glow);
      world.add(group);
      return group;
    };

    const createTree = (x, z, scale = 1, color = '#2f8a57') => {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62 * scale, 0.9 * scale, 4 * scale, 5),
        flatMaterial('#795139')
      );
      trunk.position.set(x, 2 * scale, z);
      trunk.castShadow = true;
      world.add(trunk);

      const lower = new THREE.Mesh(new THREE.DodecahedronGeometry(3.3 * scale, 0), flatMaterial(color));
      lower.position.set(x, 5.1 * scale, z);
      lower.scale.y = 1.05;
      lower.castShadow = true;
      lower.receiveShadow = true;
      world.add(lower);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(3.4 * scale, 4.3 * scale, 6), flatMaterial(shade(color, 18)));
      cap.position.set(x, 8.3 * scale, z);
      cap.castShadow = true;
      world.add(cap);
    };

    const createBanner = (x, z, yaw, color, label = '') => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.rotation.y = yaw;
      [-3.6, 3.6].forEach((offset) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.48, 8.8, 0.48), darkMaterial);
        post.position.set(offset, 4.4, 0);
        post.castShadow = true;
        group.add(post);
      });
      const cloth = new THREE.Mesh(
        new THREE.BoxGeometry(6.8, 3.25, 0.3),
        flatMaterial(color, { emissive: color, emissiveIntensity: 0.12 })
      );
      cloth.position.set(0, 6.25, 0);
      cloth.castShadow = true;
      group.add(cloth);
      if (label) {
        const tag = createBillboardSign({
          accent: color,
          fill: color,
          height: 1.65,
          text: label,
          width: 5.3,
        });
        tag.position.set(0, 6.25, 0.28);
        group.add(tag);
      }
      group.userData.cloth = cloth;
      group.userData.baseY = cloth.position.y;
      animatedBanners.push(group);
      world.add(group);
      return group;
    };

    const createWindowGrid = ({
      columns = 4,
      frontDirection,
      height,
      material,
      parent,
      rows = 3,
      surfaceDistance,
      width,
      y,
    }) => {
      const { front, right } = frontBasis(frontDirection);
      const windowW = Math.min(2.4, width / (columns * 1.7));
      const windowH = Math.min(2, height / (rows * 2.6));
      const xStep = width / columns;
      const yStep = height / rows;
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const lateral = -width / 2 + xStep * (column + 0.5);
          const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(windowW, windowH, 0.28), material);
          const position = front
            .clone()
            .multiplyScalar(surfaceDistance)
            .add(right.clone().multiplyScalar(lateral));
          windowMesh.position.set(position.x, y + row * yStep, position.z);
          windowMesh.rotation.y = directionToYaw(front);
          parent.add(windowMesh);
        }
      }
    };

    const addDistrictPad = (destination) => {
      const palette = destination.palette || {};
      const entry = destination.entry || destination.position;
      const district = new THREE.Group();
      const front = toVec3(entry).sub(toVec3(destination.position)).normalize();
      district.position.set(destination.position.x, 0.02, destination.position.z);
      district.rotation.y = directionToYaw(front);

      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(31, 35, 0.22, 8),
        flatMaterial(palette.pad || destination.districtColor || shade(destination.color, -38), { roughness: 0.94 })
      );
      pad.scale.z = 0.74;
      pad.position.z = 3.2;
      pad.receiveShadow = true;
      district.add(pad);

      const inset = new THREE.Mesh(
        new THREE.CylinderGeometry(23, 26, 0.12, 8),
        flatMaterial(shade(palette.pad || destination.districtColor || destination.color, 18), { roughness: 0.9 })
      );
      inset.scale.z = 0.62;
      inset.position.set(0, 0.18, 3.2);
      inset.receiveShadow = true;
      district.add(inset);

      const trim = new THREE.Mesh(
        new THREE.TorusGeometry(31.2, 0.28, 4, 8),
        basicMaterial(palette.trim || destination.accent)
      );
      trim.rotation.x = Math.PI / 2;
      trim.scale.z = 0.74;
      trim.position.set(0, 0.22, 3.2);
      district.add(trim);

      world.add(district);
    };

    const addWallSign = (destination, group, frontDirection) => {
      const { w, d } = destination.size;
      const signConfig = destination.sign || {};
      const width = (signConfig.width || Math.max(17, Math.min(24, w * 0.9))) * 0.82;
      const height = (signConfig.height || 5.2) * 0.86;
      const surfaceDistance = Math.abs(frontDirection.x) > Math.abs(frontDirection.z) ? w / 2 + 0.5 : d / 2 + 0.5;
      const sign = createBillboardSign({
        accent: destination.accent,
        fill: destination.banner || destination.accent,
        height,
        text: destination.title,
        width,
      });
      sign.position.copy(frontDirection.clone().multiplyScalar(surfaceDistance));
      sign.position.y = (signConfig.y || destination.size.h * 0.7) + 0.35;
      sign.rotation.y = directionToYaw(frontDirection);
      group.add(sign);
      registerDestinationEffect(destination, { signs: sign });
      return sign;
    };

    const addRooftopSign = (destination, group) => {
      const { h, w } = destination.size;
      const label =
        destination.key === 'food'
          ? 'Food Court'
          : destination.key === 'home'
          ? 'Home Base'
          : destination.shortTitle;
      const sign = createBillboardSign({
        accent: destination.accent,
        fill: CITY_STYLE.ink,
        height: 5.2,
        text: label,
        width: Math.max(15, Math.min(24, w * 0.8)),
      });
      const faceToPlaza = PLAZA_CENTER.clone().sub(toVec3(destination.position)).normalize();
      const offset = faceToPlaza.multiplyScalar(Math.max(w, destination.size.d) * 0.42);
      sign.position.set(offset.x, h + 12.4, offset.z);
      sign.rotation.y = directionToYaw(faceToPlaza);
      group.add(sign);
      registerDestinationEffect(destination, { signs: sign });
      return sign;
    };

    const addFrontBox = (parent, frontDirection, surfaceDistance, lateral, y, size, material) => {
      const { front, right } = frontBasis(frontDirection);
      const position = front
        .clone()
        .multiplyScalar(surfaceDistance)
        .add(right.clone().multiplyScalar(lateral));
      const mesh = addLocalBox(
        parent,
        size,
        { x: position.x, y, z: position.z },
        material,
        { y: directionToYaw(front) }
      );
      return mesh;
    };

    const addFacadeTrim = (destination, group, frontDirection, materials) => {
      const { w, d, h } = destination.size;
      const surfaceDistance = Math.abs(frontDirection.x) > Math.abs(frontDirection.z) ? w / 2 + 0.74 : d / 2 + 0.74;
      const trimY = h * 0.56 + 2.4;
      [-0.48, 0.48].forEach((side) => {
        addFrontBox(
          group,
          frontDirection,
          surfaceDistance,
          side * w * 0.43,
          trimY,
          { x: 0.86, y: h * 0.66, z: 0.5 },
          materials.trim
        );
      });
      addFrontBox(
        group,
        frontDirection,
        surfaceDistance + 0.06,
        0,
        h * 0.68 + 2.4,
        { x: w * 0.82, y: 0.86, z: 0.56 },
        materials.trim
      );
      addFrontBox(
        group,
        frontDirection,
        surfaceDistance + 0.08,
        0,
        h * 0.24 + 2.4,
        { x: w * 0.58, y: 0.64, z: 0.6 },
        materials.light
      );

      const cornerMat = materials.side;
      [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].forEach(([xSide, zSide]) => {
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.4, h * 0.64, 1.4), cornerMat);
        pylon.position.set(xSide * (w / 2 + 0.7), h * 0.32 + 2.5, zSide * (d / 2 + 0.7));
        pylon.castShadow = true;
        pylon.receiveShadow = true;
        group.add(pylon);
      });
    };

    const addFacadePortal = (destination, group, frontDirection, materials) => {
      const { w, d, h } = destination.size;
      const surfaceDistance = Math.abs(frontDirection.x) > Math.abs(frontDirection.z) ? w / 2 + 1.1 : d / 2 + 1.1;
      const doorWidth = Math.min(w * 0.58, 15.5);
      const doorHeight = Math.min(h * 0.58, 15.5);
      const portalY = doorHeight * 0.5 + 2.1;

      addFrontBox(
        group,
        frontDirection,
        surfaceDistance,
        0,
        portalY,
        { x: doorWidth, y: doorHeight, z: 0.86 },
        darkMaterial
      );

      [-1, 1].forEach((side) => {
        addFrontBox(
          group,
          frontDirection,
          surfaceDistance + 0.42,
          side * (doorWidth * 0.5 + 1.1),
          portalY + 0.3,
          { x: 1.25, y: doorHeight + 2.4, z: 1.22 },
          materials.trim
        );
        addFrontBox(
          group,
          frontDirection,
          surfaceDistance + 0.7,
          side * (doorWidth * 0.5 + 2.05),
          portalY,
          { x: 0.52, y: doorHeight * 0.82, z: 0.48 },
          materials.light
        );
      });

      addFrontBox(
        group,
        frontDirection,
        surfaceDistance + 0.46,
        0,
        portalY + doorHeight * 0.54 + 1.2,
        { x: doorWidth + 4.6, y: 1.7, z: 1.24 },
        materials.trim
      );

      addFrontBox(
        group,
        frontDirection,
        surfaceDistance + 0.8,
        0,
        portalY,
        { x: doorWidth * 0.66, y: doorHeight * 0.08, z: 0.36 },
        materials.light
      );

      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(doorWidth + 7, doorHeight + 6),
        translucentMaterial(destination.accent, 0.2)
      );
      glow.position.copy(frontDirection.clone().multiplyScalar(surfaceDistance + 0.92));
      glow.position.y = portalY + 0.5;
      glow.rotation.y = directionToYaw(frontDirection);
      group.add(glow);

      const icon = createBillboardSign({
        accent: destination.accent,
        fill: destination.banner || destination.accent,
        height: 2.9,
        text: destination.shortTitle,
        width: Math.min(doorWidth + 5.5, 17.5),
      });
      icon.position.copy(frontDirection.clone().multiplyScalar(surfaceDistance + 1.18));
      icon.position.y = portalY + doorHeight * 0.58 + 3.25;
      icon.rotation.y = directionToYaw(frontDirection);
      group.add(icon);
      registerDestinationEffect(destination, { signs: icon });
    };

    const createLandmarkProp = (destination, group, frontDirection, prop) => {
      const palette = destination.palette || {};
      const { w, d, h } = destination.size;
      const baseMat = flatMaterial(palette.base || destination.color);
      const sideMat = flatMaterial(palette.side || shade(destination.color, -38));
      const trimMat = flatMaterial(palette.trim || destination.accent, {
        emissive: palette.trim || destination.accent,
        emissiveIntensity: 0.15,
      });
      const lightMat = flatMaterial(palette.light || destination.accent, {
        emissive: palette.light || destination.accent,
        emissiveIntensity: 0.72,
      });
      const surfaceDistance = Math.abs(frontDirection.x) > Math.abs(frontDirection.z) ? w / 2 + 0.8 : d / 2 + 0.8;

      if (prop === 'barbell-towers') {
        [-0.37, 0.37].forEach((side) => {
          const tower = addLocalBox(
            group,
            { x: 4.9, y: h * 0.78, z: 5.2 },
            { x: side * w * 0.78, y: h * 0.88, z: 0 },
            trimMat
          );
          tower.rotation.y = 0.12 * side;
          const plate = new THREE.Mesh(new THREE.BoxGeometry(5.8, 5.8, 1.25), sideMat);
          plate.position.set(side * w * 0.78, h * 1.34, 0);
          plate.castShadow = true;
          group.add(plate);
        });
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, w * 0.96, 6), trimMat);
        bar.position.set(0, h * 1.34, 0);
        bar.rotation.z = Math.PI / 2;
        bar.castShadow = true;
        group.add(bar);
      }

      if (prop === 'training-banners') {
        [-0.32, 0.32].forEach((side) => {
          addFrontBox(
            group,
            frontDirection,
            surfaceDistance + 0.25,
            side * w * 0.27,
            h * 0.42,
            { x: 4.8, y: 7.8, z: 0.38 },
            trimMat
          );
        });
      }

      if (prop === 'awnings') {
        [-0.32, 0, 0.32].forEach((side, index) => {
          const awning = addFrontBox(
            group,
            frontDirection,
            surfaceDistance + 2.5,
            side * w,
            h * 0.48,
            { x: w * 0.28, y: 2.2, z: 5.2 },
            index % 2 === 0 ? trimMat : baseMat
          );
          awning.rotation.x = -0.12;
        });
      }

      if (prop === 'vendor-stalls') {
        [-0.28, 0.28].forEach((side) => {
          addFrontBox(
            group,
            frontDirection,
            surfaceDistance + 5.6,
            side * w * 0.48,
            3,
            { x: 7.4, y: 4.6, z: 4.8 },
            sideMat
          );
          addFrontBox(
            group,
            frontDirection,
            surfaceDistance + 5.8,
            side * w * 0.48,
            6.3,
            { x: 8.2, y: 1.1, z: 5.6 },
            trimMat
          );
        });
      }

      if (prop === 'neon-sign') {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 1.8, 5.7, 7), lightMat);
        cup.position.set(-w * 0.26, h + 5.2, 0);
        cup.rotation.z = -0.08;
        cup.castShadow = true;
        group.add(cup);
        const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 6.2, 5), trimMat);
        straw.position.set(-w * 0.18, h + 8.3, 0.3);
        straw.rotation.z = -0.34;
        group.add(straw);
      }

      if (prop === 'clubhouse-dome') {
        const dome = new THREE.Mesh(new THREE.DodecahedronGeometry(w * 0.33, 0), trimMat);
        dome.position.set(0, h + 5.2, 0);
        dome.scale.y = 0.48;
        dome.castShadow = true;
        group.add(dome);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.54, 6.5, 6), flatMaterial(palette.roof || destination.color));
        roof.position.set(0, h + 2.9, 0);
        roof.castShadow = true;
        group.add(roof);
      }

      if (prop === 'flags') {
        [-0.42, 0.42].forEach((side) => {
          const pole = addLocalBox(
            group,
            { x: 0.42, y: 10.5, z: 0.42 },
            { x: side * w * 0.62, y: h + 5.6, z: -d * 0.18 },
            darkMaterial
          );
          const flag = addLocalBox(
            group,
            { x: 4.4, y: 2.5, z: 0.36 },
            { x: side * w * 0.62 + 2.1 * Math.sign(side), y: h + 10, z: -d * 0.18 },
            trimMat
          );
          flag.rotation.z = 0.08 * Math.sign(side);
          pole.castShadow = true;
        });
      }

      if (prop === 'progress-beacon') {
        const mini = new THREE.Mesh(
          new THREE.DodecahedronGeometry(2.1, 0),
          flatMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.55 })
        );
        mini.position.set(0, h + 10.2, 0);
        mini.userData.spin = true;
        group.userData.homeBeacon = mini;
        group.add(mini);
      }

      if (prop === 'antenna') {
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.78, 14.5, 6), trimMat);
        mast.position.set(0, h + 8.6, 0);
        mast.castShadow = true;
        group.add(mast);
      }

      if (prop === 'dish') {
        const dish = new THREE.Mesh(new THREE.ConeGeometry(5, 3.2, 7), trimMat);
        dish.position.set(0, h + 17.4, 0);
        dish.rotation.x = Math.PI;
        dish.rotation.z = 0.16;
        dish.castShadow = true;
        group.add(dish);
      }

      if (prop === 'glow-tubes') {
        [-0.32, 0.32].forEach((side) => {
          const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, h * 0.72, 8), glassMaterial);
          tube.position.set(side * w * 0.34, h * 0.48 + 2.1, d * 0.18);
          tube.castShadow = true;
          group.add(tube);
          const capTop = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.8, 8), trimMat);
          capTop.position.set(side * w * 0.34, h * 0.84 + 2.1, d * 0.18);
          group.add(capTop);
        });
      }

      if (prop === 'shield-icon') {
        const shield = new THREE.Group();
        shield.position.copy(frontDirection.clone().multiplyScalar(surfaceDistance + 0.38));
        shield.position.y = h * 0.6;
        shield.rotation.y = directionToYaw(frontDirection);
        const top = new THREE.Mesh(new THREE.BoxGeometry(8.2, 5.6, 0.55), trimMat);
        top.position.y = 1.2;
        const point = new THREE.Mesh(new THREE.ConeGeometry(4.2, 4.8, 4), trimMat);
        point.position.y = -3.4;
        point.rotation.z = Math.PI / 4;
        const markA = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6.8, 0.7), baseMat);
        const markB = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.2, 0.72), baseMat);
        markA.position.z = 0.3;
        markB.position.z = 0.34;
        shield.add(top, point, markA, markB);
        group.add(shield);
      }

      if (prop === 'soft-lights') {
        [-0.38, 0.38].forEach((side) => {
          addFrontBox(
            group,
            frontDirection,
            surfaceDistance + 0.3,
            side * w * 0.3,
            h * 0.33,
            { x: 3.8, y: 4.6, z: 0.44 },
            lightMat
          );
        });
      }

      if (prop === 'wide-door') {
        const door = addFrontBox(
          group,
          frontDirection,
          surfaceDistance + 0.25,
          0,
          h * 0.27,
          { x: w * 0.66, y: h * 0.52, z: 0.72 },
          flatMaterial('#202837')
        );
        const stripeCount = 5;
        for (let i = 0; i < stripeCount; i += 1) {
          addFrontBox(
            group,
            frontDirection,
            surfaceDistance + 0.66,
            -w * 0.25 + i * (w * 0.125),
            h * 0.3,
            { x: 0.42, y: h * 0.44, z: 0.28 },
            trimMat
          );
        }
        door.castShadow = true;
      }

      if (prop === 'ramps') {
        [-0.28, 0.28].forEach((side) => {
          const ramp = addFrontBox(
            group,
            frontDirection,
            surfaceDistance + 7,
            side * w * 0.34,
            1,
            { x: 8.8, y: 1.2, z: 9.4 },
            asphaltShadeMaterial
          );
          ramp.rotation.x = -0.18;
        });
      }

      if (prop === 'tires') {
        [-0.43, 0.43].forEach((side) => {
          for (let i = 0; i < 3; i += 1) {
            const tire = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.45, 6, 10), darkMaterial);
            const { front, right } = frontBasis(frontDirection);
            const position = front
              .clone()
              .multiplyScalar(surfaceDistance + 4.4)
              .add(right.clone().multiplyScalar(side * w * 0.48));
            tire.position.set(position.x, 2.2 + i * 1.6, position.z);
            tire.rotation.y = directionToYaw(frontDirection);
            tire.castShadow = true;
            group.add(tire);
          }
        });
      }
    };

    const createDistrictProps = (destination, group, frontDirection) => {
      (destination.landmarkProps || []).forEach((prop) =>
        createLandmarkProp(destination, group, frontDirection, prop)
      );

      const palette = destination.palette || {};
      const { w, d, h } = destination.size;
      const surfaceDistance = Math.abs(frontDirection.x) > Math.abs(frontDirection.z) ? w / 2 + 1.2 : d / 2 + 1.2;
      const trimMat = flatMaterial(palette.trim || destination.accent, {
        emissive: palette.trim || destination.accent,
        emissiveIntensity: 0.34,
      });
      const lightMat = flatMaterial(palette.light || destination.accent, {
        emissive: palette.light || destination.accent,
        emissiveIntensity: 0.78,
      });

      if (destination.architecture === 'gymArena') {
        [-0.42, 0.42].forEach((side) => {
          for (let i = 0; i < 4; i += 1) {
            const plate = new THREE.Mesh(new THREE.CylinderGeometry(2.1 - i * 0.14, 2.1 - i * 0.14, 0.62, 8), trimMat);
            const { front, right } = frontBasis(frontDirection);
            const p = front
              .clone()
              .multiplyScalar(surfaceDistance + 5.4)
              .add(right.clone().multiplyScalar(side * w * 0.42));
            plate.position.set(p.x, 0.9 + i * 0.66, p.z);
            plate.rotation.x = Math.PI / 2;
            plate.castShadow = true;
            group.add(plate);
          }
        });
      }

      if (destination.architecture === 'foodMarket') {
        [-0.22, 0.22].forEach((side) => {
          const fork = addFrontBox(
            group,
            frontDirection,
            surfaceDistance + 0.55,
            side * w * 0.34,
            h + 5.8,
            { x: 0.5, y: 7.8, z: 0.48 },
            lightMat
          );
          fork.rotation.z = side * 0.1;
          [-0.65, 0, 0.65].forEach((offset) => {
            addFrontBox(
              group,
              frontDirection,
              surfaceDistance + 0.65,
              side * w * 0.34 + offset,
              h + 9.7,
              { x: 0.24, y: 1.9, z: 0.38 },
              lightMat
            );
          });
        });
      }

      if (destination.architecture === 'scienceTower') {
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(1.1, 2.8, h * 0.9, 8, 1, true),
          translucentMaterial(palette.light || destination.accent, 0.16)
        );
        beam.position.set(0, h * 0.55 + 5.5, 0);
        beam.userData.scanBeam = true;
        group.add(beam);
        animatedDistrictParts.push({ object: beam, phase: animatedDistrictParts.length * 0.63, type: 'scanBeam' });
      }

      if (destination.architecture === 'recoveryStation') {
        const cross = new THREE.Group();
        cross.position.set(0, h + 9.2, 0);
        cross.add(new THREE.Mesh(new THREE.BoxGeometry(2, 8, 0.8), lightMat));
        cross.add(new THREE.Mesh(new THREE.BoxGeometry(7.6, 2, 0.84), lightMat));
        cross.rotation.y = directionToYaw(frontDirection);
        group.add(cross);
        animatedDistrictParts.push({ object: cross, phase: animatedDistrictParts.length * 0.63, type: 'pulse' });
      }

      if (destination.architecture === 'tuningGarage') {
        const wrench = new THREE.Group();
        wrench.position.set(0, h + 5.6, 0);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(1.1, 8.5, 0.7), trimMat);
        handle.rotation.z = -0.62;
        const head = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.34, 6, 12, Math.PI * 1.35), trimMat);
        head.position.set(2.6, 2.9, 0);
        head.rotation.z = 0.92;
        wrench.add(handle, head);
        group.add(wrench);
        animatedDistrictParts.push({ object: wrench, phase: animatedDistrictParts.length * 0.63, type: 'wrench' });
      }

      if (destination.architecture === 'homeBase') {
        const rings = new THREE.Group();
        rings.position.set(0, h + 8.8, 0);
        for (let i = 0; i < 3; i += 1) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(3.2 + i * 1.15, 0.14, 5, 16),
            translucentMaterial(palette.light || destination.accent, 0.3 - i * 0.05)
          );
          ring.rotation.x = Math.PI / 2;
          ring.userData.homeRing = true;
          rings.add(ring);
          animatedDistrictParts.push({ object: ring, phase: i * 0.72, type: 'homeRing' });
        }
        group.add(rings);
      }
    };

    const addDistrictProgressMarker = (destination, group, frontDirection) => {
      const progress = clamp(Number(destination.hubProgressPct) || 0, 0, 100) / 100;
      const complete = destination.hubComplete || progress >= 1;
      const { w, d } = destination.size;
      const surfaceDistance = Math.abs(frontDirection.x) > Math.abs(frontDirection.z) ? w / 2 + 7 : d / 2 + 7;
      const { front, right } = frontBasis(frontDirection);
      const marker = new THREE.Group();
      const markerPosition = front
        .clone()
        .multiplyScalar(surfaceDistance)
        .add(right.clone().multiplyScalar(w * 0.42));
      marker.position.set(markerPosition.x, 0.2, markerPosition.z);
      marker.rotation.y = directionToYaw(frontDirection);

      const color = complete ? '#71f09a' : destination.accent;
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.25, 1.55, 1.1, 7),
        flatMaterial('#20384b', { roughness: 0.82 })
      );
      base.position.y = 0.55;
      base.castShadow = true;
      marker.add(base);

      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.48, 7.4, 7),
        flatMaterial('#10151d', { roughness: 0.86 })
      );
      mast.position.y = 4.55;
      mast.castShadow = true;
      marker.add(mast);

      const fillHeight = Math.max(0.42, 6.2 * progress);
      const fill = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.72, fillHeight, 7),
        flatMaterial(color, { emissive: color, emissiveIntensity: complete ? 0.84 : 0.48 })
      );
      fill.position.y = 1.2 + fillHeight / 2;
      marker.add(fill);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.95, 0.16, 5, 18),
        translucentMaterial(color, complete ? 0.42 : 0.28)
      );
      ring.position.y = 8.85;
      ring.rotation.x = Math.PI / 2;
      marker.add(ring);

      const badge = new THREE.Mesh(
        complete
          ? new THREE.DodecahedronGeometry(1.1, 0)
          : new THREE.BoxGeometry(2.4, 0.56, 0.44),
        flatMaterial(color, { emissive: color, emissiveIntensity: complete ? 1 : 0.62 })
      );
      badge.position.y = 8.85;
      if (!complete) badge.scale.x = Math.max(0.28, progress);
      marker.add(badge);

      marker.userData.statusProgress = progress;
      marker.userData.statusComplete = complete;
      group.add(marker);
      animatedDistrictParts.push({
        baseScale: complete ? 1.08 : 0.94,
        object: ring,
        phase: animatedDistrictParts.length * 0.63,
        type: 'statusRing',
      });
      registerDestinationEffect(destination, { statusMarkers: marker });
    };

    const createTrimmedBuilding = (destination) => {
      addDistrictPad(destination);

      const group = new THREE.Group();
      group.position.set(destination.position.x, 0, destination.position.z);

      const palette = destination.palette || {};
      const { w, d, h } = destination.size;
      const entry = destination.entry || destination.position;
      const frontDirection = toVec3(entry).sub(toVec3(destination.position)).normalize();
      const baseMat = flatMaterial(palette.base || destination.color);
      const sideMat = flatMaterial(palette.side || shade(destination.color, -40));
      const trimMat = flatMaterial(palette.trim || destination.accent, {
        emissive: palette.trim || destination.accent,
        emissiveIntensity: 0.13,
      });
      const roofMat = flatMaterial(palette.roof || shade(destination.color, -18));
      const surfaceDistance = Math.abs(frontDirection.x) > Math.abs(frontDirection.z) ? w / 2 : d / 2;

      addLocalBox(group, { x: w + 7.5, y: 2.4, z: d + 7 }, { x: 0, y: 1.2, z: 0 }, sideMat);

      if (destination.architecture === 'gymArena') {
        addLocalBox(group, { x: w, y: h * 0.62, z: d }, { x: 0, y: h * 0.31 + 2.2, z: 0 }, baseMat);
        addLocalBox(group, { x: w * 0.76, y: h * 0.38, z: d * 0.78 }, { x: 0, y: h * 0.78 + 2.2, z: 0 }, sideMat);
        addLocalBox(group, { x: w + 2.8, y: 2.4, z: d + 2.8 }, { x: 0, y: h * 0.66 + 2.5, z: 0 }, trimMat);
        addLocalBox(group, { x: w * 0.82, y: 2.2, z: d * 0.86 }, { x: 0, y: h + 3.2, z: 0 }, trimMat);
        addFrontBox(group, frontDirection, surfaceDistance + 0.4, 0, h * 0.34, { x: w * 0.72, y: h * 0.5, z: 0.62 }, sideMat);
        createWindowGrid({
          columns: 5,
          frontDirection,
          height: 6.6,
          material: glassMaterial,
          parent: group,
          rows: 2,
          surfaceDistance: surfaceDistance + 0.8,
          width: w * 0.62,
          y: h * 0.23 + 3,
        });
      } else if (destination.architecture === 'foodMarket') {
        addLocalBox(group, { x: w, y: h * 0.62, z: d }, { x: 0, y: h * 0.31 + 2.2, z: 0 }, baseMat);
        addLocalBox(group, { x: w + 3.4, y: 3.1, z: d + 2.2 }, { x: 0, y: h * 0.66 + 3.3, z: 0 }, roofMat);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.58, 6.2, 4), trimMat);
        roof.position.set(0, h + 5.1, 0);
        roof.rotation.y = Math.PI / 4;
        roof.scale.z = 0.74;
        roof.castShadow = true;
        group.add(roof);
        createWindowGrid({
          columns: 4,
          frontDirection,
          height: 4.8,
          material: glassMaterial,
          parent: group,
          rows: 1,
          surfaceDistance: surfaceDistance + 0.55,
          width: w * 0.62,
          y: h * 0.38 + 2.5,
        });
      } else if (destination.architecture === 'homeBase') {
        addLocalBox(group, { x: w, y: h * 0.72, z: d }, { x: 0, y: h * 0.36 + 2.2, z: 0 }, baseMat);
        addLocalBox(group, { x: w * 0.78, y: h * 0.38, z: d * 0.82 }, { x: 0, y: h * 0.88 + 2.1, z: 0 }, sideMat);
        addLocalBox(group, { x: w + 2.8, y: 2, z: d + 2.8 }, { x: 0, y: h * 0.76 + 2.4, z: 0 }, trimMat);
        createWindowGrid({
          columns: 3,
          frontDirection,
          height: 5.4,
          material: glassMaterial,
          parent: group,
          rows: 2,
          surfaceDistance: surfaceDistance + 0.55,
          width: w * 0.55,
          y: h * 0.3 + 2.6,
        });
      } else if (destination.architecture === 'scienceTower') {
        addLocalBox(group, { x: w * 0.82, y: h, z: d * 0.82 }, { x: 0, y: h / 2 + 2.2, z: 0 }, baseMat);
        addLocalBox(group, { x: w * 0.52, y: h * 1.1, z: d * 0.52 }, { x: w * 0.16, y: h * 0.55 + 3.4, z: 0 }, sideMat);
        addLocalBox(group, { x: w + 2.4, y: 2.4, z: d + 2.4 }, { x: 0, y: h * 0.42 + 2.4, z: 0 }, trimMat);
        addLocalBox(group, { x: w * 0.78, y: 2.4, z: d * 0.78 }, { x: 0, y: h + 3.6, z: 0 }, trimMat);
        createWindowGrid({
          columns: 3,
          frontDirection,
          height: 13,
          material: glassMaterial,
          parent: group,
          rows: 4,
          surfaceDistance: surfaceDistance * 0.82 + 0.55,
          width: w * 0.48,
          y: h * 0.22 + 2.8,
        });
      } else if (destination.architecture === 'recoveryStation') {
        addLocalBox(group, { x: w, y: h * 0.76, z: d }, { x: 0, y: h * 0.38 + 2.2, z: 0 }, baseMat);
        addLocalBox(group, { x: w * 0.86, y: 3.1, z: d * 1.05 }, { x: 0, y: h * 0.82 + 3, z: 0 }, trimMat);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.54, 6, 6), roofMat);
        roof.position.set(0, h + 4.6, 0);
        roof.castShadow = true;
        group.add(roof);
        createWindowGrid({
          columns: 3,
          frontDirection,
          height: 4.8,
          material: glassMaterial,
          parent: group,
          rows: 1,
          surfaceDistance: surfaceDistance + 0.58,
          width: w * 0.52,
          y: h * 0.32 + 2.4,
        });
      } else {
        addLocalBox(group, { x: w, y: h * 0.7, z: d }, { x: 0, y: h * 0.35 + 2.2, z: 0 }, baseMat);
        addLocalBox(group, { x: w + 3, y: 3, z: d + 2.2 }, { x: 0, y: h * 0.74 + 3, z: 0 }, roofMat);
        addLocalBox(group, { x: w * 0.68, y: 2.2, z: d * 0.78 }, { x: 0, y: h + 2.6, z: 0 }, trimMat);
        createWindowGrid({
          columns: 3,
          frontDirection,
          height: 4.2,
          material: glassMaterial,
          parent: group,
          rows: 1,
          surfaceDistance: surfaceDistance + 0.58,
          width: w * 0.5,
          y: h * 0.48 + 2.5,
        });
      }

      addFacadeTrim(destination, group, frontDirection, {
        light: flatMaterial(palette.light || destination.accent, {
          emissive: palette.light || destination.accent,
          emissiveIntensity: 0.56,
        }),
        side: sideMat,
        trim: trimMat,
      });
      addFacadePortal(destination, group, frontDirection, {
        light: flatMaterial(palette.light || destination.accent, {
          emissive: palette.light || destination.accent,
          emissiveIntensity: 0.78,
        }),
        trim: trimMat,
      });
      createDistrictProps(destination, group, frontDirection);
      addDistrictProgressMarker(destination, group, frontDirection);
      addWallSign(destination, group, frontDirection);
      if (!referenceMode) {
        addRooftopSign(destination, group);

        const floatingLabels = {
          clinic: ['Clinic', '+'],
          food: ['Food Court', 'F'],
          garage: ['Garage', 'W'],
          gym: ['Gym', 'G'],
          home: ['Home Base', 'H'],
          lab: ['Lab', 'L'],
        };
        const [floatingLabel, floatingIcon] = floatingLabels[destination.key] || [
          destination.shortTitle,
          destination.shortTitle.charAt(0),
        ];
        const labelFace = PLAZA_CENTER.clone().sub(toVec3(destination.position)).normalize();
        const labelPosition = toVec3(destination.position, destination.size.h + 18).add(
          labelFace.multiplyScalar(Math.max(w, d) * 0.64)
        );
        createFloatingLabel(destination, floatingLabel, floatingIcon, labelPosition);
      }

      markInteractive(group, destination);
      destinationGroups.set(destination.key, group);
      world.add(group);

      const padding = destination.collisionPadding ?? 5;
      collisionBoxes.push({
        maxX: destination.position.x + w / 2 + padding,
        maxZ: destination.position.z + d / 2 + padding,
        minX: destination.position.x - w / 2 - padding,
        minZ: destination.position.z - d / 2 - padding,
      });

      return group;
    };

    const createDistrictGate = (destination) => {
      const entry = destination.entry || destination.position;
      const building = toVec3(destination.position);
      const entryPosition = toVec3(entry);
      const towardBuilding = building.sub(entryPosition).normalize();
      const gate = new THREE.Group();
      gate.position.set(entry.x + towardBuilding.x * 5.6, 0, entry.z + towardBuilding.z * 5.6);
      gate.rotation.y = directionToYaw(towardBuilding.clone().multiplyScalar(-1));

      const color = destination.gate?.color || destination.accent;
      const width = destination.gate?.width || 22;
      const gateMat = flatMaterial(color, { emissive: color, emissiveIntensity: 0.2 });
      [-width / 2, width / 2].forEach((x) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(1.5, 10.5, 1.5), gateMat);
        post.position.set(x, 5.25, 0);
        post.castShadow = true;
        gate.add(post);
      });
      const beam = new THREE.Mesh(new THREE.BoxGeometry(width + 3, 1.6, 1.7), gateMat);
      beam.position.set(0, 10.2, 0);
      beam.castShadow = true;
      gate.add(beam);

      const tag = createBillboardSign({
        accent: color,
        fill: destination.banner || color,
        height: 2.4,
        text: destination.gate?.label || destination.shortTitle,
        width: 10.2,
      });
      tag.position.set(0, 12.15, 0.1);
      gate.add(tag);

      markInteractive(gate, destination);
      registerDestinationEffect(destination, { gates: gate, signs: tag });
      world.add(gate);
      return gate;
    };

    const createFreestandingBillboard = (destination) => {
      const entry = destination.entry || destination.position;
      const target = PLAZA_CENTER.clone().add(new THREE.Vector3(0, 0, -18));
      const face = target.sub(toVec3(entry)).normalize();
      const side = new THREE.Vector3(face.z, 0, -face.x).normalize();
      const position = toVec3(entry)
        .add(side.multiplyScalar(destination.position.x < 0 ? -8 : 8))
        .add(face.multiplyScalar(-2));
      const sign = createBillboardSign({
        accent: destination.accent,
        fill: destination.banner || destination.accent,
        height: 4.8,
        text: destination.title,
        width: destination.sign?.width || 20,
      });
      sign.position.set(position.x, 8.3, position.z);
      sign.rotation.y = directionToYaw(face);
      [-7.2, 7.2].forEach((offset) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8.2, 0.6), darkMaterial);
        post.position.set(offset, -4.1, -0.2);
        post.castShadow = true;
        sign.add(post);
      });
      markInteractive(sign, destination);
      registerDestinationEffect(destination, { signs: sign });
      world.add(sign);
      return sign;
    };

    const createPortal = (destination) => {
      const group = new THREE.Group();
      const color = destination.accent;
      const entry = destination.entry || destination.position;
      const building = toVec3(destination.position);
      const entryPosition = toVec3(entry);
      const outward = entryPosition.clone().sub(building).normalize();
      const portalPosition = entryPosition.clone().lerp(building, 0.18);
      group.position.set(portalPosition.x, 0, portalPosition.z);
      group.rotation.y = directionToYaw(outward);

      const padMaterial = flatMaterial(destination.color, {
        emissive: destination.color,
        emissiveIntensity: 0.38,
        roughness: 0.68,
      });
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(13.8, 15.6, 0.48, 8), padMaterial);
      pad.position.y = 0.24;
      pad.scale.z = 0.74;
      pad.receiveShadow = true;
      group.add(pad);

      const archMaterial = flatMaterial(destination.color, {
        emissive: destination.color,
        emissiveIntensity: 0.5,
      });
      const trimMaterial = flatMaterial(color, { emissive: color, emissiveIntensity: 0.95 });
      [-8.6, 8.6].forEach((x) => {
        const column = new THREE.Mesh(new THREE.BoxGeometry(3.4, 15.4, 3.4), archMaterial);
        column.position.set(x, 7.9, -0.28);
        column.castShadow = true;
        column.receiveShadow = true;
        group.add(column);

        const trim = new THREE.Mesh(new THREE.BoxGeometry(1.16, 14.2, 3.8), trimMaterial);
        trim.position.set(x * 0.98, 8.05, 0.08);
        trim.castShadow = true;
        group.add(trim);
      });
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(21.2, 3.45, 3.55), archMaterial);
      lintel.position.set(0, 15.2, -0.28);
      lintel.castShadow = true;
      lintel.receiveShadow = true;
      group.add(lintel);
      const lintelGlow = new THREE.Mesh(new THREE.BoxGeometry(18.4, 1.05, 3.8), trimMaterial);
      lintelGlow.position.set(0, 16.75, 0.08);
      group.add(lintelGlow);

      const outerRingMaterial = flatMaterial(color, { emissive: color, emissiveIntensity: 1.08 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(7.7, 0.84, 8, 26), outerRingMaterial);
      ring.position.set(0, 8.35, 0.38);
      ring.scale.y = 1.18;
      group.add(ring);

      const aura = new THREE.Mesh(
        new THREE.PlaneGeometry(24.5, 21.5),
        translucentMaterial(color, 0.32)
      );
      aura.position.set(0, 8.35, 0.22);
      aura.scale.y = 1.12;
      group.add(aura);

      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(4.95, 0.32, 5, 18), basicMaterial('#fff8bf'));
      innerRing.position.set(0, 8.35, 0.54);
      innerRing.scale.y = 1.14;
      group.add(innerRing);

      const veil = new THREE.Mesh(new THREE.CircleGeometry(5.9, 22), translucentMaterial(color, 0.28));
      veil.position.set(0, 8.35, 0.3);
      veil.scale.y = 1.28;
      group.add(veil);

      const swirls = [];
      for (let i = 0; i < 3; i += 1) {
        const swirl = new THREE.Mesh(
          new THREE.TorusGeometry(3.35 + i * 1.28, 0.09, 4, 22, Math.PI * 1.52),
          translucentMaterial(i % 2 === 0 ? color : CITY_STYLE.cream, 0.2)
        );
        swirl.position.set(0, 8.35, 0.62 + i * 0.06);
        swirl.scale.y = 1.24;
        swirl.rotation.z = i * 1.24;
        swirl.userData.phase = i * 0.72;
        swirls.push(swirl);
        group.add(swirl);
      }

      const portalLight = new THREE.PointLight(color, 1.55, 70, 2.0);
      portalLight.position.set(0, 9, 0.5);
      group.add(portalLight);

      [-5.9, 5.9].forEach((x) => {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 11.4, 0.9),
          flatMaterial(color, { emissive: color, emissiveIntensity: 0.22 })
        );
        post.position.set(x, 6.1, 1.26);
        post.castShadow = true;
        group.add(post);
      });

      const sparks = [];
      for (let i = 0; i < 6; i += 1) {
        const spark = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.55, 0),
          flatMaterial(i % 2 === 0 ? color : '#fff8bf', {
            emissive: i % 2 === 0 ? color : '#fff8bf',
            emissiveIntensity: 0.8,
          })
        );
        spark.userData.phase = (Math.PI * 2 * i) / 6;
        sparks.push(spark);
        group.add(spark);
      }

      const enterSign = createBillboardSign({
        accent: color,
        fill: color,
        height: 2.5,
        text: destination.shortTitle,
        width: 11.2,
      });
      enterSign.position.set(0, 16.35, 0.1);
      group.add(enterSign);

      group.userData.innerRing = innerRing;
      group.userData.outerRingMaterial = outerRingMaterial;
      group.userData.aura = aura;
      group.userData.padMaterial = padMaterial;
      group.userData.portalLight = portalLight;
      group.userData.ring = ring;
      group.userData.sparks = sparks;
      group.userData.swirls = swirls;
      group.userData.veil = veil;
      markInteractive(group, destination);
      portalPads.set(destination.key, group);
      registerDestinationEffect(destination, { signs: enterSign });
      world.add(group);
      return group;
    };

    const createObjectiveGuide = (destination) => {
      const group = new THREE.Group();
      const color = destination.accent;
      const beamColor = '#49d9ff';
      const entry = toVec3(destination.entry || destination.position);
      const start = PLAZA_CENTER.clone().add(new THREE.Vector3(0, 0, -12));
      const travel = entry.clone().sub(start);
      const rings = [];

      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(2.4, 5.8, 62, 8, 1, true),
        translucentMaterial(beamColor, 0.18)
      );
      beam.position.set(entry.x, 31, entry.z);
      group.add(beam);

      const beamCrown = new THREE.Mesh(
        new THREE.TorusGeometry(5.8, 0.18, 5, 18),
        translucentMaterial(CITY_STYLE.cream, 0.36)
      );
      beamCrown.position.set(entry.x, 61, entry.z);
      beamCrown.rotation.x = Math.PI / 2;
      group.add(beamCrown);

      for (let i = 0; i < 4; i += 1) {
        const t = 0.18 + i * 0.2;
        const point = start.clone().lerp(entry, t);
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(2.7 + i * 0.16, 0.16, 5, 18),
          translucentMaterial(color, 0.36)
        );
        ring.position.set(point.x, 0.68, point.z);
        ring.rotation.x = Math.PI / 2;
        ring.userData.phase = i * 0.72;
        rings.push(ring);
        group.add(ring);

        const marker = new THREE.Mesh(
          new THREE.ConeGeometry(1.35, 3.4, 4),
          flatMaterial(color, { emissive: color, emissiveIntensity: 0.42, opacity: 0.88, transparent: true })
        );
        marker.position.set(point.x, 1.3, point.z);
        marker.rotation.x = Math.PI / 2;
        marker.rotation.z = -directionToYaw(travel) + Math.PI;
        marker.userData.phase = i * 0.72;
        rings.push(marker);
        group.add(marker);
      }

      const signFace = PLAZA_CENTER.clone().sub(entry).normalize();
      const sign = createBillboardSign({
        accent: color,
        fill: destination.banner || color,
        height: 2.45,
        text: 'Next',
        width: 9.8,
      });
      sign.position.set(entry.x, 14.2, entry.z);
      sign.rotation.y = directionToYaw(signFace);
      group.add(sign);

      group.visible = false;
      group.userData.beam = beam;
      group.userData.beamCrown = beamCrown;
      group.userData.sign = sign;
      group.userData.signBaseY = sign.position.y;
      group.userData.rings = rings;
      routeGuides.set(destination.key, group);
      world.add(group);
      return group;
    };

    const createProgressTower = () => {
      const group = new THREE.Group();
      group.position.copy(PLAZA_CENTER);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 10, 3, 8), flatMaterial('#20384b'));
      base.position.y = 1.5;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);

      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 7, 3.2, 8), flatMaterial('#f3ece0'));
      pedestal.position.y = 4;
      pedestal.castShadow = true;
      group.add(pedestal);

      const rings = clamp(Math.floor(profile.level / 2) + 1, 1, 7);
      const ringMeshes = [];
      for (let i = 0; i < rings; i += 1) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(5.7 + i * 0.42, 0.18, 4, 12),
          basicMaterial(i % 2 === 0 ? '#ffd34f' : profile.avatar.accent)
        );
        ring.position.y = 6.1 + i * 1.35;
        ring.rotation.x = Math.PI / 2;
        ringMeshes.push(ring);
        group.add(ring);
      }

      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.86, 17, 6), flatMaterial('#20384b'));
      mast.position.y = 11.8;
      mast.castShadow = true;
      group.add(mast);

      const beacon = new THREE.Mesh(
        new THREE.DodecahedronGeometry(2.65, 0),
        flatMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.62 })
      );
      beacon.position.y = 21.5;
      group.add(beacon);

      const cityBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 4.8, 92, 8, 1, true),
        translucentMaterial('#49d9ff', 0.2)
      );
      cityBeam.position.y = 54;
      group.add(cityBeam);

      const beamCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.58, 1.1, 98, 8, 1, true),
        translucentMaterial('#dff8ff', 0.38)
      );
      beamCore.position.y = 57;
      group.add(beamCore);

      const objectiveBadge = new THREE.Mesh(
        new THREE.DodecahedronGeometry(5.2, 0),
        flatMaterial('#1f8bff', { emissive: '#49d9ff', emissiveIntensity: 0.82 })
      );
      objectiveBadge.position.y = 35.5;
      objectiveBadge.scale.z = 0.32;
      group.add(objectiveBadge);

      const halo = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), translucentMaterial('#ffd34f', 0.18));
      halo.position.y = 21.5;
      halo.rotation.y = Math.PI / 2;
      group.add(halo);

      group.userData.beacon = beacon;
      group.userData.beamCore = beamCore;
      group.userData.cityBeam = cityBeam;
      group.userData.halo = halo;
      group.userData.objectiveBadge = objectiveBadge;
      group.userData.rings = ringMeshes;
      world.add(group);

      collisionBoxes.push({
        maxX: PLAZA_CENTER.x + 7.5,
        maxZ: PLAZA_CENTER.z + 7.5,
        minX: PLAZA_CENTER.x - 7.5,
        minZ: PLAZA_CENTER.z - 7.5,
      });

      return group;
    };

    const createOverpass = () => {
      const bridgeMat = flatMaterial('#65717f');
      const trimMat = flatMaterial('#f3ece0');
      const deck = new THREE.Mesh(new THREE.BoxGeometry(58, 1.2, 11.5), bridgeMat);
      deck.position.set(0, 1.25, 75.5);
      deck.castShadow = true;
      deck.receiveShadow = true;
      world.add(deck);

      [-32, 32].forEach((x) => {
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(22, 1.1, 11.5), bridgeMat);
        ramp.position.set(x, 0.9, 75.5);
        ramp.rotation.z = x < 0 ? -0.1 : 0.1;
        ramp.castShadow = true;
        ramp.receiveShadow = true;
        world.add(ramp);
      });

      [-26, 26].forEach((x) => {
        [-4.9, 4.9].forEach((zOffset) => {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(18, 0.55, 0.42), trimMat);
          rail.position.set(x, 2.2, 75.5 + zOffset);
          rail.castShadow = true;
          world.add(rail);
        });
      });
    };

    const createBackgroundSilhouettes = () => {
      const skylineMaterials = [
        flatMaterial('#2b6fb0'),
        flatMaterial('#4e86a8'),
        flatMaterial('#315b8d'),
        flatMaterial('#3d8a74'),
        flatMaterial('#e28d47'),
        flatMaterial('#8a53df'),
      ];
      const skylineWindow = basicMaterial('#dff8ff', { opacity: 0.62, transparent: true });
      for (let i = 0; i < 29; i += 1) {
        const x = -132 + i * 9.4;
        const z = 138 + (i % 5) * 7;
        const h = 20 + (i % 7) * 7.2;
        const w = 6.4 + (i % 3) * 2.8;
        const d = 8 + (i % 2) * 4.2;
        const block = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          skylineMaterials[i % skylineMaterials.length]
        );
        block.position.set(x, h / 2 - 1.5, z);
        block.rotation.y = (i % 4 - 1.5) * 0.035;
        block.castShadow = true;
        addEdgeOutline(block, 0.16);
        world.add(block);

        if (i % 4 === 0) {
          const spire = new THREE.Mesh(
            new THREE.ConeGeometry(w * 0.36, 8 + (i % 3) * 3, 5),
            flatMaterial(i % 2 ? '#f3ece0' : '#49d9ff', {
              emissive: i % 2 ? '#f3ece0' : '#49d9ff',
              emissiveIntensity: 0.12,
            })
          );
          spire.position.set(x, h + 3.4, z);
          spire.castShadow = true;
          world.add(spire);
        }

        for (let row = 0; row < Math.min(7, Math.floor(h / 6)); row += 1) {
          [-0.25, 0.25].forEach((side) => {
            const window = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.05, 0.14), skylineWindow);
            window.position.set(x + side * w, 5.5 + row * 5, z - d / 2 - 0.12);
            window.rotation.y = block.rotation.y;
            world.add(window);
          });
        }
      }

      [
        { x: -78, z: 224, r: 32, h: 48, c: '#8eb3c8', cap: '#f6fbff' },
        { x: -36, z: 232, r: 24, h: 36, c: '#9bc2d3', cap: '#f6fbff' },
        { x: 88, z: 224, r: 34, h: 50, c: '#8eb3c8', cap: '#f6fbff' },
        { x: 132, z: 230, r: 24, h: 38, c: '#9bc2d3', cap: '#f6fbff' },
      ].forEach((mountain) => {
        const peak = new THREE.Mesh(new THREE.ConeGeometry(mountain.r, mountain.h, 4), surfaceMaterial(mountain.c));
        peak.position.set(mountain.x, mountain.h / 2 - 6, mountain.z);
        peak.rotation.y = Math.PI / 4;
        peak.castShadow = true;
        world.add(peak);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(mountain.r * 0.42, mountain.h * 0.28, 4), basicMaterial(mountain.cap));
        cap.position.set(mountain.x, mountain.h - 8, mountain.z);
        cap.rotation.y = Math.PI / 4;
        world.add(cap);
      });

      [
        { x: -132, z: 120, r: 25, h: 32, c: '#2e7c62' },
        { x: 130, z: 124, r: 29, h: 38, c: '#316d75' },
        { x: -115, z: -102, r: 27, h: 28, c: '#366f59' },
        { x: 120, z: -102, r: 24, h: 30, c: '#2d6674' },
        { x: -148, z: 16, r: 19, h: 31, c: '#486b5c' },
        { x: 148, z: 18, r: 19, h: 31, c: '#486b5c' },
      ].forEach((hill) => {
        const mesh = new THREE.Mesh(new THREE.ConeGeometry(hill.r, hill.h, 5), flatMaterial(hill.c));
        mesh.position.set(hill.x, hill.h / 2 - 2, hill.z);
        mesh.castShadow = true;
        world.add(mesh);
      });

      [
        { x: -124, z: -82, w: 23, h: 30, color: '#32576b' },
        { x: 126, z: -78, w: 19, h: 36, color: '#375f6f' },
        { x: -134, z: 58, w: 21, h: 34, color: '#2f5860' },
        { x: 136, z: 64, w: 21, h: 31, color: '#34596b' },
      ].forEach((landmark) => {
        const tower = new THREE.Mesh(
          new THREE.CylinderGeometry(landmark.w * 0.28, landmark.w * 0.38, landmark.h, 6),
          flatMaterial(landmark.color)
        );
        tower.position.set(landmark.x, landmark.h / 2 - 1, landmark.z);
        tower.castShadow = true;
        world.add(tower);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(landmark.w * 0.46, 8, 6), flatMaterial('#f3ece0'));
        cap.position.set(landmark.x, landmark.h + 2.4, landmark.z);
        cap.castShadow = true;
        world.add(cap);
      });
    };

    const createCityFillerBlocks = () => {
      const blockMaterials = [
        surfaceMaterial('#d9e3e6', { roughness: 0.86 }),
        surfaceMaterial('#8ab5c8', { roughness: 0.88 }),
        surfaceMaterial('#6f93a7', { roughness: 0.88 }),
        surfaceMaterial('#f0b05c', { roughness: 0.84 }),
        surfaceMaterial('#b9d784', { roughness: 0.86 }),
      ];
      const roofMaterials = [
        flatMaterial('#2e5870'),
        flatMaterial('#e7743d'),
        flatMaterial('#f3ece0'),
        flatMaterial('#3d8a61'),
      ];

      const blocks = [
        [-90, -5, 12, 16, 25, 0],
        [-105, 18, 11, 14, 32, 1],
        [-90, 49, 14, 13, 28, 4],
        [-108, 84, 12, 18, 24, 2],
        [88, -5, 12, 16, 25, 0],
        [105, 18, 11, 14, 34, 1],
        [90, 49, 14, 13, 28, 4],
        [108, 84, 12, 18, 24, 2],
        [-34, 106, 13, 15, 28, 1],
        [0, 112, 16, 14, 37, 0],
        [34, 106, 13, 15, 31, 1],
      ];

      blocks.forEach(([x, z, w, d, h, materialIndex], index) => {
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          blockMaterials[materialIndex % blockMaterials.length]
        );
        base.position.set(x, h / 2, z);
        base.rotation.y = (index % 3 - 1) * 0.08;
        base.castShadow = true;
        base.receiveShadow = true;
        addEdgeOutline(base, 0.2);
        world.add(base);

        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 1.2, 2.2, d + 1.2),
          roofMaterials[index % roofMaterials.length]
        );
        roof.position.set(x, h + 1.1, z);
        roof.rotation.y = base.rotation.y;
        roof.castShadow = true;
        addEdgeOutline(roof, 0.22);
        world.add(roof);

        const windowMat = basicMaterial('#dff8ff', { opacity: 0.72, transparent: true });
        for (let row = 0; row < Math.min(5, Math.floor(h / 5)); row += 1) {
          [-0.3, 0, 0.3].forEach((side) => {
            const window = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.18), windowMat);
            window.position.set(x + side * w, 5 + row * 4.4, z - d / 2 - 0.12);
            window.rotation.y = base.rotation.y;
            world.add(window);
          });
        }

        if (index % 2 === 0) {
          const awning = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.74, 1.15, 1.5),
            flatMaterial(index % 4 ? '#ffd34f' : '#49d9ff', {
              emissive: index % 4 ? '#ffd34f' : '#49d9ff',
              emissiveIntensity: 0.18,
            })
          );
          awning.position.set(x, 5.2, z - d / 2 - 0.7);
          awning.rotation.y = base.rotation.y;
          awning.castShadow = true;
          addEdgeOutline(awning, 0.2);
          world.add(awning);
        }
      });
    };

    const createCityLogo = () => {
      const texture = makeSpriteLabelTexture('Comeback City', '#ffd34f', '');
      const logo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          depthWrite: false,
          map: texture,
          transparent: true,
        })
      );
      logo.position.set(-72, 72, 84);
      logo.scale.set(43, 13, 1);
      logo.renderOrder = 5;
      world.add(logo);
      return logo;
    };

    const createSkylineLandmark = () => {
      const group = new THREE.Group();
      group.position.set(-124, 18, 126);
      group.rotation.y = Math.PI;
      const wheelMat = basicMaterial('#f3ece0', { opacity: 0.74, transparent: true });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(14, 0.42, 6, 32), wheelMat);
      group.add(ring);
      for (let i = 0; i < 8; i += 1) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.38, 14, 0.38), wheelMat);
        spoke.rotation.z = (Math.PI * i) / 8;
        group.add(spoke);
        const gondola = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 1.4, 0.6),
          flatMaterial(i % 2 ? '#ffd34f' : '#49d9ff', {
            emissive: i % 2 ? '#ffd34f' : '#49d9ff',
            emissiveIntensity: 0.25,
          })
        );
        gondola.position.set(Math.sin((Math.PI * 2 * i) / 8) * 14, Math.cos((Math.PI * 2 * i) / 8) * 14, 0);
        group.add(gondola);
      }
      const baseA = new THREE.Mesh(new THREE.BoxGeometry(0.8, 24, 0.8), wheelMat);
      baseA.position.set(-5, -11, 0);
      baseA.rotation.z = -0.28;
      const baseB = baseA.clone();
      baseB.position.x = 5;
      baseB.rotation.z = 0.28;
      group.add(baseA, baseB);
      world.add(group);
      animatedDistrictParts.push({ object: group, phase: 0.4, type: 'ferris' });
    };

    const createBoundary = () => {
      const boundaryMaterial = flatMaterial('#20384b');
      [
        { x: 0, z: WORLD_BOUNDS.minZ - 2, w: WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX + 10, d: 3 },
        { x: 0, z: WORLD_BOUNDS.maxZ + 2, w: WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX + 10, d: 3 },
        { x: WORLD_BOUNDS.minX - 2, z: 15, w: 3, d: WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ + 10 },
        { x: WORLD_BOUNDS.maxX + 2, z: 15, w: 3, d: WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ + 10 },
      ].forEach((wall) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(wall.w, 2.5, wall.d), boundaryMaterial);
        mesh.position.set(wall.x, 1.25, wall.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        world.add(mesh);
      });
    };

    const createDebugOverlay = () => {
      if (!debugOverlayEnabled) {
        return {
          boostPads: boostPads.length,
          collisionBoxes: collisionBoxes.length,
          enabled: false,
          portals: portalPads.size,
        };
      }

      const group = new THREE.Group();
      group.name = 'HubDebugOverlay';
      group.renderOrder = 80;
      const collisionMaterial = new THREE.LineBasicMaterial({
        color: '#ff4f8b',
        depthTest: false,
        transparent: true,
        opacity: 0.9,
      });
      const portalMaterial = new THREE.LineBasicMaterial({
        color: '#49d9ff',
        depthTest: false,
        transparent: true,
        opacity: 0.88,
      });
      const boostMaterial = new THREE.LineBasicMaterial({
        color: '#ffd34f',
        depthTest: false,
        transparent: true,
        opacity: 0.9,
      });

      collisionBoxes.forEach((box) => {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(box.minX, 0.72, box.minZ),
          new THREE.Vector3(box.maxX, 0.72, box.minZ),
          new THREE.Vector3(box.maxX, 0.72, box.maxZ),
          new THREE.Vector3(box.minX, 0.72, box.maxZ),
        ]);
        const line = new THREE.LineLoop(geometry, collisionMaterial);
        line.renderOrder = 82;
        group.add(line);
      });

      destinations.forEach((destination) => {
        const entry = destination.entry || destination.position;
        const radius = destination.portalRadius || 13;
        const points = [];
        for (let index = 0; index < 48; index += 1) {
          const angle = (Math.PI * 2 * index) / 48;
          points.push(new THREE.Vector3(entry.x + Math.cos(angle) * radius, 0.86, entry.z + Math.sin(angle) * radius));
        }
        const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), portalMaterial);
        line.renderOrder = 83;
        group.add(line);
      });

      boostPads.forEach((boost) => {
        const width = 13.2;
        const depth = 8.6;
        const points = [
          new THREE.Vector3(-width / 2, 0.95, -depth / 2),
          new THREE.Vector3(width / 2, 0.95, -depth / 2),
          new THREE.Vector3(width / 2, 0.95, depth / 2),
          new THREE.Vector3(-width / 2, 0.95, depth / 2),
        ];
        const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), boostMaterial);
        line.position.copy(boost.group.position);
        line.rotation.copy(boost.group.rotation);
        line.renderOrder = 84;
        group.add(line);
      });

      world.add(group);
      return {
        boostPads: boostPads.length,
        collisionBoxes: collisionBoxes.length,
        enabled: true,
        portals: portalPads.size,
      };
    };

    createSkyGradient();
    createGround();

    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(30, 34, 0.26, 12), plazaMaterial);
    plaza.position.set(PLAZA_CENTER.x, 0.08, PLAZA_CENTER.z);
    plaza.scale.z = 0.76;
    plaza.receiveShadow = true;
    world.add(plaza);

    const plazaTier = new THREE.Mesh(new THREE.CylinderGeometry(18, 21, 0.26, 12), plazaTierMaterial);
    plazaTier.position.set(PLAZA_CENTER.x, 0.24, PLAZA_CENTER.z);
    plazaTier.scale.z = 0.72;
    plazaTier.receiveShadow = true;
    world.add(plazaTier);

    const plazaRing = new THREE.Mesh(new THREE.TorusGeometry(29.2, 0.42, 4, 12), basicMaterial('#ffe277'));
    plazaRing.position.set(PLAZA_CENTER.x, 0.34, PLAZA_CENTER.z);
    plazaRing.rotation.x = Math.PI / 2;
    plazaRing.scale.z = 0.76;
    world.add(plazaRing);

    addRoadPath(
      [
        { x: 0, z: -92 },
        { x: 0, z: -58 },
        { x: 0, z: -18 },
        { x: 0, z: 2 },
      ],
      18
    );
    addRoadLoop();
    addRoadPath([{ x: -18, z: -17 }, { x: -28, z: -21 }, { x: -34, z: -22 }], 14.5);
    addRoadPath([{ x: 18, z: -17 }, { x: 28, z: -21 }, { x: 34, z: -22 }], 14.5);
    addRoadPath([{ x: -51, z: 17 }, { x: -48, z: 25 }, { x: -42, z: 30 }], 14.5);
    addRoadPath([{ x: 51, z: 17 }, { x: 48, z: 25 }, { x: 42, z: 30 }], 14.5);
    addRoadPath([{ x: -39, z: 50 }, { x: -35, z: 64 }, { x: -30, z: 74 }], 14.5);
    addRoadPath([{ x: 39, z: 50 }, { x: 35, z: 64 }, { x: 30, z: 74 }], 14.5);
    addRoadPath([{ x: -30, z: 74 }, { x: 0, z: 76 }, { x: 30, z: 74 }], 13.5);

    [
      { x: 0, z: -62, yaw: 0 },
      { x: 0, z: -20, yaw: 0 },
      { x: -28, z: -21, yaw: -0.82 },
      { x: 28, z: -21, yaw: 0.82 },
      { x: -45, z: 23, yaw: 1.95 },
      { x: 45, z: 23, yaw: -1.95 },
      { x: -34, z: 62, yaw: 2.64 },
      { x: 34, z: 62, yaw: -2.64 },
    ].forEach((arrow) => createRoadArrow(arrow.x, arrow.z, arrow.yaw, '#ffe277', 0.82));
    createRoadDecals();

    createBoostPad(-14, -34, -0.55, '#44d7d0');
    createBoostPad(14, -34, 0.55, '#44d7d0');
    createBoostPad(-43, 48, 0.44, '#ffd34f');
    createBoostPad(43, 48, -0.44, '#ffd34f');
    createOverpass();

    destinations.forEach((destination) => {
      createTrimmedBuilding(destination);
      if (!referenceMode) createFreestandingBillboard(destination);
      createPortal(destination);
      createObjectiveGuide(destination);
    });

    destinations.forEach((destination) => {
      const entry = destination.entry || destination.position;
      const building = toVec3(destination.position);
      const entryPosition = toVec3(entry);
      const facing = building.sub(entryPosition).normalize();
      const yaw = directionToYaw(facing);
      if (!referenceMode) {
        createBanner(
          entry.x + facing.x * 11 + facing.z * 8,
          entry.z + facing.z * 11 - facing.x * 8,
          yaw,
          getBannerColor(destination),
          destination.shortTitle
        );
      }
      createStreetLight(
        entry.x + facing.x * 6 + facing.z * 7,
        entry.z + facing.z * 6 - facing.x * 7,
        destination.accent
      );
      createStreetLight(
        entry.x + facing.x * 6 - facing.z * 7,
        entry.z + facing.z * 6 + facing.x * 7,
        destination.accent
      );
    });

    [
      [-96, -60, 1.08, '#2f8a57'],
      [-104, -4, 0.92, '#3f9f62'],
      [-96, 68, 1.2, '#2b8052'],
      [-76, 116, 0.95, '#3f9f62'],
      [-15, 118, 1.05, '#2f8a57'],
      [15, 118, 1.05, '#2f8a57'],
      [76, 116, 0.95, '#3f9f62'],
      [96, 68, 1.2, '#2b8052'],
      [104, -4, 0.92, '#3f9f62'],
      [96, -60, 1.08, '#2f8a57'],
      [-38, -82, 0.85, '#367a51'],
      [38, -82, 0.85, '#367a51'],
    ].forEach(([x, z, scale, color]) => createTree(x, z, scale, color));

    const progressTower = createProgressTower();
    createCityFillerBlocks();
    createBackgroundSilhouettes();
    createSkylineLandmark();
    createBoundary();
    const debugOverlayStats = createDebugOverlay();

    const createKartModel = (vehicleAvatar, { scale = 1, showDriver = true } = {}) => {
      const body = new THREE.Group();
      body.scale.setScalar(scale);
      const style = vehicleAvatar.carStyle || 'sprinter';
      const heroKart = showDriver && scale >= 0.9;
      const chassisColor = heroKart ? vehicleAvatar.hubChassis || '#ef4334' : vehicleAvatar.chassis;
      const accentColor = heroKart ? vehicleAvatar.hubAccent || '#46d9ef' : vehicleAvatar.accent;
      const suitColor = heroKart ? '#202837' : vehicleAvatar.suit;
      const trimColor = heroKart ? vehicleAvatar.hubTrim || '#eef5f2' : vehicleAvatar.accent;
      const chassisMaterial = flatMaterial(chassisColor, {
        emissive: chassisColor,
        emissiveIntensity: heroKart ? 0.18 : 0.12,
      });
      const accentMaterial = flatMaterial(accentColor, {
        emissive: accentColor,
        emissiveIntensity: heroKart ? 0.52 : 0.2,
      });
      const suitMaterial = flatMaterial(suitColor);
      const trimVehicleMaterial = flatMaterial(trimColor, {
        emissive: trimColor,
        emissiveIntensity: heroKart ? 0.08 : 0.02,
      });
      const glassVehicleMaterial = flatMaterial(style === 'prototype' ? '#bdf6ff' : accentColor, {
        emissive: style === 'prototype' ? '#44d7d0' : accentColor,
        emissiveIntensity: heroKart ? 0.48 : 0.24,
        roughness: 0.35,
      });

      const addBodyBox = (size, position, material = chassisMaterial) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
        mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        addEdgeOutline(mesh, heroKart ? 0.42 : 0.28);
        body.add(mesh);
        return mesh;
      };

      const addCone = (radius, height, position, material = chassisMaterial, sides = 4) => {
        const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, height, sides), material);
        mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
        mesh.rotation.x = Math.PI / 2;
        mesh.rotation.y = Math.PI / 4;
        mesh.castShadow = true;
        addEdgeOutline(mesh, heroKart ? 0.34 : 0.22);
        body.add(mesh);
        return mesh;
      };

      const wheelSpec =
        style === 'buggy'
          ? { x: 5.8, y: 2.05, rearZ: -4.9, frontZ: 5.1, radius: 2.85, width: 2.28 }
          : style === 'muscle'
          ? { x: 5.95, y: 1.95, rearZ: -5, frontZ: 5.2, radius: 2.75, width: 2.32 }
          : { x: 5.75, y: 1.95, rearZ: -4.7, frontZ: 5, radius: 2.62, width: 2.18 };

      if (style === 'muscle') {
        addBodyBox({ x: 9.4, y: 2.5, z: 13.4 }, { y: 2.45 }, chassisMaterial);
        addBodyBox({ x: 8.2, y: 1.1, z: 5.4 }, { y: 3.85, z: 2.8 }, accentMaterial);
        addBodyBox({ x: 5.6, y: 3.2, z: 4.7 }, { y: 4.75, z: -2.4 }, glassVehicleMaterial);
        addBodyBox({ x: 10.5, y: 0.72, z: 1.4 }, { y: 2.45, z: 7.2 }, accentMaterial);
        [-1, 1].forEach((side) => {
          addBodyBox({ x: 0.58, y: 0.58, z: 5.8 }, { x: side * 5.25, y: 2.15, z: -1.3 }, accentMaterial);
        });
      } else if (style === 'rally') {
        addBodyBox({ x: 8.8, y: 2.55, z: 11.8 }, { y: 2.7 }, chassisMaterial);
        addBodyBox({ x: 6.2, y: 3.2, z: 4.6 }, { y: 4.85, z: -1.5 }, glassVehicleMaterial);
        addBodyBox({ x: 5.4, y: 0.72, z: 2.8 }, { y: 6.75, z: -1.4 }, accentMaterial);
        addCone(3.8, 4.8, { y: 2.8, z: 7.2 }, chassisMaterial);
        const spare = new THREE.Mesh(new THREE.TorusGeometry(2, 0.48, 6, 12), darkMaterial);
        spare.position.set(0, 4.05, -7.1);
        spare.rotation.x = Math.PI / 2;
        spare.castShadow = true;
        body.add(spare);
      } else if (style === 'prototype') {
        addBodyBox({ x: 7.8, y: 1.65, z: 13.8 }, { y: 2.05 }, chassisMaterial);
        addCone(4.1, 6.7, { y: 2.05, z: 8.2 }, chassisMaterial);
        addBodyBox({ x: 4.8, y: 2.25, z: 5.2 }, { y: 3.55, z: -1.7 }, glassVehicleMaterial);
        addBodyBox({ x: 10.6, y: 0.52, z: 2.1 }, { y: 4.7, z: -7.4 }, accentMaterial);
        addBodyBox({ x: 9.7, y: 0.35, z: 1.2 }, { y: 1.85, z: 6.9 }, accentMaterial);
      } else if (style === 'drifter') {
        addBodyBox({ x: 8.7, y: 2.25, z: 12.4 }, { y: 2.35 }, chassisMaterial);
        addBodyBox({ x: 6.1, y: 2.8, z: 4.6 }, { y: 4.35, z: -1.6 }, glassVehicleMaterial);
        addCone(3.9, 5.4, { y: 2.35, z: 7.6 }, chassisMaterial);
        addBodyBox({ x: 11.3, y: 0.62, z: 2.1 }, { y: 5.35, z: -7.15 }, accentMaterial);
        [-1, 1].forEach((side) => {
          addBodyBox({ x: 0.56, y: 0.52, z: 11.6 }, { x: side * 4.75, y: 1.82, z: 0 }, accentMaterial);
        });
      } else if (style === 'buggy') {
        addBodyBox({ x: 7.4, y: 1.75, z: 10.6 }, { y: 2.3 }, chassisMaterial);
        addCone(3.3, 4.4, { y: 2.35, z: 6.7 }, chassisMaterial);
        addBodyBox({ x: 5.7, y: 0.54, z: 4.7 }, { y: 5.6, z: -1.7 }, accentMaterial);
        [-1, 1].forEach((side) => {
          addBodyBox({ x: 0.5, y: 4.5, z: 0.5 }, { x: side * 2.7, y: 4.35, z: -3.4 }, darkMaterial);
          addBodyBox({ x: 0.5, y: 4.5, z: 0.5 }, { x: side * 2.7, y: 4.35, z: 1.2 }, darkMaterial);
        });
      } else {
        addBodyBox({ x: 8, y: 2.1, z: 12 }, { y: 2.4 }, chassisMaterial);
        addCone(4.2, 5.6, { y: 2.45, z: 7.8 }, chassisMaterial);
        addBodyBox({ x: 4.8, y: 3.4, z: 4.2 }, { y: 4.3, z: -1.5 }, accentMaterial);
        addBodyBox({ x: 9.5, y: 0.7, z: 2.2 }, { y: 5.2, z: -7.1 }, accentMaterial);
      }

      addBodyBox({ x: 8.8, y: 0.9, z: 5.8 }, { y: 1.65, z: 5.2 }, accentMaterial);
      addBodyBox({ x: 6.2, y: 0.72, z: 6.8 }, { y: 2.08, z: 6.45 }, chassisMaterial);
      addBodyBox({ x: 4.5, y: 0.58, z: 1.1 }, { y: 2.7, z: 8.95 }, glassVehicleMaterial);
      [-1, 1].forEach((side) => {
        addBodyBox({ x: 1.9, y: 0.72, z: 5.6 }, { x: side * 4.95, y: 2.35, z: 4.8 }, accentMaterial);
        addBodyBox({ x: 1.15, y: 0.7, z: 7.4 }, { x: side * 5.68, y: 2.1, z: -0.35 }, darkMaterial);
        addBodyBox({ x: 1.9, y: 0.5, z: 1.2 }, { x: side * 2.2, y: 2.78, z: 8.35 }, glassVehicleMaterial);
      });

      addBodyBox({ x: 9.6, y: 0.58, z: 12.6 }, { y: 1.12, z: 0.1 }, darkMaterial);
      addBodyBox({ x: 7.2, y: 0.48, z: 4.1 }, { y: 2.92, z: 6.05 }, trimVehicleMaterial);
      addBodyBox({ x: 5.2, y: 0.55, z: 3.4 }, { y: 3.25, z: 7.15 }, chassisMaterial);
      addBodyBox({ x: 8.8, y: 0.46, z: 1.25 }, { y: 2.28, z: 9.35 }, trimVehicleMaterial);
      addBodyBox({ x: 9.4, y: 0.44, z: 1.1 }, { y: 2.4, z: -7.9 }, darkMaterial);
      addBodyBox({ x: 6.8, y: 0.58, z: 1.05 }, { y: 5.95, z: -7.95 }, accentMaterial);
      [-1, 1].forEach((side) => {
        const sidePod = addBodyBox(
          { x: 1.85, y: 1.18, z: 6.8 },
          { x: side * 4.65, y: 2.68, z: 0.7 },
          chassisMaterial
        );
        sidePod.rotation.z = side * 0.06;
        addBodyBox({ x: 1.06, y: 0.58, z: 1.9 }, { x: side * 2.7, y: 2.84, z: 8.62 }, accentMaterial);
        addBodyBox({ x: 0.64, y: 0.42, z: 1.4 }, { x: side * 2.8, y: 3.08, z: 8.9 }, glassVehicleMaterial);
        addBodyBox({ x: 0.62, y: 3.85, z: 0.58 }, { x: side * 3.18, y: 6.55, z: -2.35 }, darkMaterial);
      });

      const wheels = [];
      const wheelGeometry = new THREE.CylinderGeometry(wheelSpec.radius, wheelSpec.radius, wheelSpec.width, 10);
      const wheelHubGeometry = new THREE.CylinderGeometry(wheelSpec.radius * 0.42, wheelSpec.radius * 0.42, wheelSpec.width + 0.22, 6);
      const wheelGlowGeometry = new THREE.TorusGeometry(wheelSpec.radius * 0.52, 0.13, 5, 16);
      [
        [-wheelSpec.x, wheelSpec.y, wheelSpec.rearZ],
        [wheelSpec.x, wheelSpec.y, wheelSpec.rearZ],
        [-wheelSpec.x, wheelSpec.y, wheelSpec.frontZ],
        [wheelSpec.x, wheelSpec.y, wheelSpec.frontZ],
      ].forEach(([x, y, z]) => {
        const wheel = new THREE.Group();
        wheel.position.set(x, y, z);
        wheel.userData.baseY = y;
        wheel.userData.front = z > 0;
        const tire = new THREE.Mesh(wheelGeometry, darkMaterial);
        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;
        const hub = new THREE.Mesh(wheelHubGeometry, accentMaterial);
        hub.rotation.z = Math.PI / 2;
        const rim = new THREE.Mesh(wheelGlowGeometry, glassVehicleMaterial);
        rim.rotation.y = Math.PI / 2;
        wheel.add(tire, hub, rim);
        wheels.push(wheel);
        body.add(wheel);
      });

      if (showDriver) {
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 2, 3, 6), suitMaterial);
        torso.position.set(0, style === 'prototype' ? 5.9 : 7.15, style === 'buggy' ? -2.3 : -2.2);
        torso.castShadow = true;
        body.add(torso);

        const helmet = new THREE.Mesh(new THREE.DodecahedronGeometry(1.9, 0), accentMaterial);
        helmet.position.set(0, style === 'prototype' ? 8.05 : 9.45, style === 'buggy' ? -2.4 : -2.35);
        helmet.castShadow = true;
        body.add(helmet);

        [-1, 1].forEach((side) => {
          const cage = addBodyBox(
            { x: 0.44, y: 5.8, z: 0.44 },
            { x: side * 2.55, y: 6.4, z: -2.2 },
            darkMaterial
          );
          cage.rotation.z = side * 0.12;
        });
        addBodyBox({ x: 5.6, y: 0.42, z: 0.5 }, { y: 8.9, z: -2.2 }, darkMaterial);
      }

      addBodyBox({ x: 10.8, y: 0.42, z: 1.2 }, { y: 1.55, z: 6.8 }, accentMaterial);
      addBodyBox({ x: 10.4, y: 0.34, z: 0.78 }, { y: 1.38, z: -6.8 }, darkMaterial);
      addBodyBox({ x: 11.8, y: 0.34, z: 0.34 }, { y: 1.88, z: wheelSpec.frontZ }, darkMaterial);
      addBodyBox({ x: 11.8, y: 0.34, z: 0.34 }, { y: 1.88, z: wheelSpec.rearZ }, darkMaterial);
      [-1, 1].forEach((side) => {
        addBodyBox({ x: 1.45, y: 0.54, z: 0.34 }, { x: side * 2.65, y: 2.85, z: 7.05 }, glassVehicleMaterial);
        addBodyBox({ x: 0.46, y: 0.46, z: 6.2 }, { x: side * 5.15, y: 2.2, z: 0.2 }, accentMaterial);
        addBodyBox({ x: 1.38, y: 0.5, z: 0.48 }, { x: side * 2.45, y: 2.36, z: 8.42 }, glassVehicleMaterial);
      });

      const underglow = new THREE.Mesh(
        new THREE.PlaneGeometry(8.4, 14.2),
        translucentMaterial(accentColor, 0.18)
      );
      underglow.rotation.x = -Math.PI / 2;
      underglow.position.y = 0.42;
      body.add(underglow);

      const boostFlame = new THREE.Group();
      const boostFlames = [];
      [-2.2, 2.2].forEach((x) => {
        const flame = new THREE.Mesh(
          new THREE.ConeGeometry(0.9, 4.3, 5),
          flatMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.78 })
        );
        flame.position.set(x, 2.2, -8.25);
        flame.rotation.x = -Math.PI / 2;
        boostFlames.push(flame);
        boostFlame.add(flame);
      });
      const boostRing = new THREE.Mesh(
        new THREE.TorusGeometry(4.2, 0.18, 5, 12),
        translucentMaterial('#ffd34f', 0.5)
      );
      boostRing.position.set(0, 2.4, -9.2);
      boostRing.rotation.x = Math.PI / 2;
      boostFlame.add(boostRing);
      boostFlame.visible = false;
      boostFlame.userData.flames = boostFlames;
      body.add(boostFlame);

      return { body, boostFlame, boostRing, wheels };
    };

    const kart = new THREE.Group();
    const baseAvatar = profile.avatar;
    const avatar = {
      ...baseAvatar,
      accent: hubTheme.trailColor,
      chassis: hubTheme.kartPaintColor,
      hubAccent: hubTheme.trailColor,
      hubChassis: hubTheme.kartPaintColor,
      hubTrim: hubTheme.bannerSet === 'race' ? '#ffd34f' : '#eef5f2',
    };
    const {
      body: kartBody,
      boostFlame,
      boostRing,
      wheels,
    } = createKartModel(avatar, { scale: 1.12 });

    const disableDynamicShadows = (object) => {
      object.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = false;
      });
    };

    const createVehicleShadow = (scale = 1) => {
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(14 * scale, 20 * scale),
        vehicleShadowMaterial.clone()
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.33;
      shadow.renderOrder = 1;
      world.add(shadow);
      return shadow;
    };

    kart.add(kartBody);
    disableDynamicShadows(kart);
    kart.visible = !referenceMode;
    world.add(kart);
    const kartShadow = createVehicleShadow(1.12);
    kartShadow.visible = !referenceMode;

    const rivalCars = GAME_AVATARS.filter((item) => item.key !== baseAvatar.key)
      .slice(0, 5)
      .map((rival, index) => {
        const group = new THREE.Group();
        const vehicle = createKartModel(rival, { scale: 0.58 });
        group.add(vehicle.body);
        disableDynamicShadows(group);
        group.visible = !referenceMode;
        world.add(group);
        const shadow = createVehicleShadow(0.58);
        shadow.visible = !referenceMode;
        return {
          group,
          phase: index * 1.25 + 0.4,
          radiusX: 48 + (index % 2) * 6,
          radiusZ: 35 + (index % 3) * 3,
          shadow,
          speed: 0.29 + index * 0.025,
          wheels: vehicle.wheels,
        };
      });

    const skidMarks = [];
    let skidCursor = 0;
    let skidEmitTimer = 0;
    for (let i = 0; i < 56; i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.3, 5.8),
        basicMaterial('#111821', { depthWrite: false, opacity: 0, transparent: true })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.36;
      mesh.visible = false;
      world.add(mesh);
      skidMarks.push({ life: 0, mesh });
    }

    const sparkColors = [
      new THREE.Color('#fff8bf'),
      new THREE.Color('#49d9ff'),
      new THREE.Color('#ffad32'),
      new THREE.Color('#c879ff'),
    ];
    const sparkDummy = new THREE.Object3D();
    const driftSparkMesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.42, 0),
      basicMaterial('#ffffff', { vertexColors: true }),
      96
    );
    driftSparkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    driftSparkMesh.frustumCulled = false;
    world.add(driftSparkMesh);
    const driftSparks = Array.from({ length: driftSparkMesh.count }, () => ({
      color: 0,
      life: 0,
      maxLife: 0,
      position: new THREE.Vector3(),
      scale: 0,
      velocity: new THREE.Vector3(),
    }));
    let driftSparkCursor = 0;
    let driftSparkEmitTimer = 0;
    driftSparks.forEach((_, index) => {
      sparkDummy.scale.setScalar(0);
      sparkDummy.updateMatrix();
      driftSparkMesh.setMatrixAt(index, sparkDummy.matrix);
      driftSparkMesh.setColorAt(index, sparkColors[0]);
    });

    const boostTrailColors = [
      new THREE.Color(CITY_STYLE.cream),
      new THREE.Color(hubTheme.trailColor),
      new THREE.Color('#49d9ff'),
    ];
    const boostTrailMesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.72, 0),
      basicMaterial('#ffffff', { opacity: 0.72, transparent: true, vertexColors: true }),
      72
    );
    boostTrailMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    boostTrailMesh.frustumCulled = false;
    world.add(boostTrailMesh);
    const boostTrails = Array.from({ length: boostTrailMesh.count }, () => ({
      color: 0,
      life: 0,
      maxLife: 0,
      position: new THREE.Vector3(),
      scale: 0,
      velocity: new THREE.Vector3(),
    }));
    let boostTrailCursor = 0;
    let boostTrailEmitTimer = 0;
    boostTrails.forEach((_, index) => {
      sparkDummy.scale.setScalar(0);
      sparkDummy.updateMatrix();
      boostTrailMesh.setMatrixAt(index, sparkDummy.matrix);
      boostTrailMesh.setColorAt(index, boostTrailColors[0]);
    });

    const spawnBoostTrail = (origin, forwardDirection, sideOffset, colorIndex) => {
      const trail = boostTrails[boostTrailCursor];
      const index = boostTrailCursor;
      boostTrailCursor = (boostTrailCursor + 1) % boostTrails.length;
      const lateral = new THREE.Vector3(forwardDirection.z, 0, -forwardDirection.x).multiplyScalar(sideOffset);
      trail.life = 0.36 + Math.random() * 0.14;
      trail.maxLife = trail.life;
      trail.position.copy(origin).add(lateral);
      trail.position.y += 1.3 + Math.random() * 1.4;
      trail.velocity.copy(forwardDirection).multiplyScalar(-18 - Math.random() * 7);
      trail.velocity.y = 1.2 + Math.random() * 2.4;
      trail.scale = 0.86 + Math.random() * 0.52;
      trail.color = colorIndex;
      boostTrailMesh.setColorAt(index, boostTrailColors[colorIndex % boostTrailColors.length]);
      boostTrailMesh.instanceColor.needsUpdate = true;
    };

    const getDriftSparkLevel = () =>
      kartState.driftCharge >= driveTune.driftReleaseBoosts[0].charge
        ? 3
        : kartState.driftCharge >= driveTune.driftReleaseBoosts[1].charge
        ? 2
        : kartState.driftCharge >= driveTune.driftReleaseBoosts[2].charge
        ? 1
        : 0;

    const spawnDriftSpark = (origin, velocity, level, intensity) => {
      const spark = driftSparks[driftSparkCursor];
      const index = driftSparkCursor;
      driftSparkCursor = (driftSparkCursor + 1) % driftSparks.length;
      spark.life = 0.32 + intensity * 0.22;
      spark.maxLife = spark.life;
      spark.position.copy(origin);
      spark.velocity.copy(velocity);
      spark.velocity.x += (Math.random() - 0.5) * 4.2;
      spark.velocity.y += 4.4 + Math.random() * 3.8;
      spark.velocity.z += (Math.random() - 0.5) * 4.2;
      spark.scale = 0.55 + intensity * 0.45 + level * 0.12;
      spark.color = level;
      driftSparkMesh.setColorAt(index, sparkColors[level]);
      driftSparkMesh.instanceColor.needsUpdate = true;
    };

    const sceneMetrics = createEmptyPerformanceTelemetry();
    scene.traverse((object) => {
      if (object !== scene) sceneMetrics.objectCount += 1;
      if (object.isMesh) sceneMetrics.meshCount += 1;
      if (object.isInstancedMesh) sceneMetrics.instancedMeshCount += 1;
    });

    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;

    const renderSize = {
      height: 1,
      maxPixelRatio: 1,
      minPixelRatio: 0.85,
      pixelRatio: 1,
      ready: false,
      width: 1,
    };
    let qualityElapsed = 0;
    let qualityFrames = 0;
    let lastFpsEstimate = null;
    const destinationScreenPoint = new THREE.Vector3();

    const setRendererPixelRatio = (ratio) => {
      const next = clamp(ratio, renderSize.minPixelRatio, renderSize.maxPixelRatio);
      if (Math.abs(next - renderSize.pixelRatio) < 0.025) return;
      renderSize.pixelRatio = next;
      renderer.setPixelRatio(next);
      renderer.setSize(renderSize.width, renderSize.height, false);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      viewport.mobile = width / height < 0.74;
      renderSize.width = width;
      renderSize.height = height;
      renderSize.maxPixelRatio = Math.min(window.devicePixelRatio || 1, viewport.mobile ? 1.35 : 1.72);
      renderSize.minPixelRatio = viewport.mobile ? 0.82 : 0.9;
      if (!renderSize.ready) {
        renderSize.pixelRatio = renderSize.maxPixelRatio;
        renderSize.ready = true;
      }
      renderSize.pixelRatio = clamp(renderSize.pixelRatio, renderSize.minPixelRatio, renderSize.maxPixelRatio);
      renderer.setPixelRatio(renderSize.pixelRatio);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = viewport.mobile ? 68 : CAMERA_PRESETS.desktopPlaza.fov;
      camera.updateProjectionMatrix();
    };

    const findDestinationFromObject = (object) => {
      let current = object;
      while (current) {
        if (current.userData.destinationId) {
          return destinations.find((destination) => destination.key === current.userData.destinationId);
        }
        current = current.parent;
      }
      return null;
    };

    const getDestinationScreenPoints = () =>
      Object.fromEntries(
        destinations.map((destination) => {
          destinationScreenPoint
            .set(
              destination.position.x,
              Math.max(4, (destination.size?.h || 18) * 0.54),
              destination.position.z
            )
            .project(camera);
          return [
            destination.key,
            {
              visible: destinationScreenPoint.z >= -1 && destinationScreenPoint.z <= 1,
              x: Number((((destinationScreenPoint.x + 1) / 2) * renderSize.width).toFixed(1)),
              y: Number((((-destinationScreenPoint.y + 1) / 2) * renderSize.height).toFixed(1)),
            },
          ];
        })
      );

    const enterDestination = (destination) => {
      if (!destination) return;
      emitPlayerPose(true);
      kartState.speed = 0;
      kartState.velocity.set(0, 0, 0);
      onEnter(destination);
    };

    const handlePointerDown = (event) => {
      pointerDown.x = event.clientX;
      pointerDown.y = event.clientY;
      pointerDown.t = performance.now();
      pointerDown.moved = false;
      if (event.pointerType !== 'mouse') {
        gestureDrive.active = true;
        gestureDrive.originX = event.clientX;
        gestureDrive.originY = event.clientY;
        canvas.setPointerCapture?.(event.pointerId);
      }
    };

    const handlePointerMove = (event) => {
      const dx = event.clientX - pointerDown.x;
      const dy = event.clientY - pointerDown.y;
      if (Math.hypot(dx, dy) > 8) pointerDown.moved = true;
      if (!gestureDrive.active) return;
      gestureDrive.steer = clamp((event.clientX - gestureDrive.originX) / 90, -1, 1);
      gestureDrive.throttle = clamp((gestureDrive.originY - event.clientY) / 90, -1, 1);
    };

    const handlePointerUp = (event) => {
      if (gestureDrive.active) {
        gestureDrive.active = false;
        gestureDrive.steer = 0;
        gestureDrive.throttle = 0;
        canvas.releasePointerCapture?.(event.pointerId);
      }

      const elapsed = performance.now() - pointerDown.t;
      if (pointerDown.moved || elapsed > 360) return;

      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(interactiveObjects, true)[0];
      const destination = hit ? findDestinationFromObject(hit.object) : null;
      if (destination) enterDestination(destination);
    };

    const handleKeyDown = (event) => {
      keys.add(event.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      if (event.code === 'Space' && !event.repeat) {
        kartState.jumpQueued = true;
      }
      if ((event.code === 'Enter' || event.code === 'KeyE') && kartState.nearbyKey) {
        enterDestination(destinations.find((destination) => destination.key === kartState.nearbyKey));
      }
    };

    const handleKeyUp = (event) => {
      keys.delete(event.code);
    };

    const updateNearby = (destination) => {
      const nextKey = destination?.key || null;
      nearbyDestinationRef.current = destination || null;
      if (nextKey === kartState.nearbyKey) return;
      kartState.nearbyKey = nextKey;
      onNearbyChange(destination || null);
    };

    const resolveCollisions = (position) => {
      let collided = false;
      collisionBoxes.forEach((box) => {
        if (
          position.x < box.minX ||
          position.x > box.maxX ||
          position.z < box.minZ ||
          position.z > box.maxZ
        ) {
          return;
        }

        const overlaps = [
          { axis: 'x', value: Math.abs(position.x - box.minX), target: box.minX - 0.06 },
          { axis: 'x', value: Math.abs(box.maxX - position.x), target: box.maxX + 0.06 },
          { axis: 'z', value: Math.abs(position.z - box.minZ), target: box.minZ - 0.06 },
          { axis: 'z', value: Math.abs(box.maxZ - position.z), target: box.maxZ + 0.06 },
        ].sort((a, b) => a.value - b.value);
        position[overlaps[0].axis] = overlaps[0].target;
        collided = true;
      });
      return collided;
    };

    const constrainToRoadNetwork = (position) => {
      const current = new THREE.Vector3(position.x, 0, position.z);
      const plazaRadius = 37;
      const roadHalfWidth = 14.5;
      let bestPoint = null;
      let bestDistance = Infinity;

      const consider = (point) => {
        const distance = current.distanceTo(point);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestPoint = point;
        }
      };

      const plazaOffset = current.clone().sub(PLAZA_CENTER);
      plazaOffset.y = 0;
      const plazaDistance = plazaOffset.length();
      if (plazaDistance <= plazaRadius) return false;
      consider(PLAZA_CENTER.clone().add(plazaOffset.normalize().multiplyScalar(plazaRadius)));

      for (const route of drivableRoutes) {
        const start = PLAZA_CENTER;
        const end = route.entry;
        const segment = end.clone().sub(start);
        segment.y = 0;
        const lengthSq = Math.max(1, segment.lengthSq());
        const t = clamp(current.clone().sub(start).dot(segment) / lengthSq, 0, 1);
        const roadPoint = start.clone().add(segment.multiplyScalar(t));
        const portalRadius = Math.max(route.destination.portalRadius || 13, roadHalfWidth);
        const allowedRadius = t > 0.78 ? portalRadius + 5.5 : roadHalfWidth;
        const offset = current.clone().sub(roadPoint);
        offset.y = 0;
        const distance = offset.length();
        if (distance <= allowedRadius) return false;
        const normal = distance > 0.001 ? offset.normalize() : new THREE.Vector3(0, 0, 1);
        consider(roadPoint.add(normal.multiplyScalar(allowedRadius)));

        const entryOffset = current.clone().sub(end);
        entryOffset.y = 0;
        const entryRadius = portalRadius + 6.5;
        const entryDistance = entryOffset.length();
        if (entryDistance <= entryRadius) return false;
        const entryNormal = entryDistance > 0.001 ? entryOffset.normalize() : new THREE.Vector3(0, 0, 1);
        consider(end.clone().add(entryNormal.multiplyScalar(entryRadius)));
      }

      if (!bestPoint) return false;
      position.x = bestPoint.x;
      position.z = bestPoint.z;
      return true;
    };

    const animateSign = (sign, active, now, phase = 0) => {
      if (!sign?.userData?.halo) return;
      const halo = sign.userData.halo;
      const wave = motionState.reduced ? 0 : Math.sin(now / 140 + phase);
      const pulse = active ? 0.3 + wave * 0.11 : 0.12;
      halo.material.opacity = pulse;
      halo.scale.setScalar(active ? 1.04 + wave * 0.025 : 1);
      sign.position.y = sign.userData.baseY + (active ? wave * 0.12 : 0);
    };

    const animate = () => {
      const now = performance.now();
      const dt = Math.min((now - lastFrameTime) / 1000, 0.04);
      lastFrameTime = now;
      const motionScale = motionState.reduced ? 0 : 1;
      const pulseScale = motionState.reduced ? 0.18 : 1;
      qualityElapsed += dt;
      qualityFrames += 1;
      if (qualityElapsed >= 0.75) {
        const fps = qualityFrames / qualityElapsed;
        lastFpsEstimate = fps;
        const pixelStep = fps < 52 ? -0.14 : fps > 58 ? 0.08 : 0;
        if (pixelStep !== 0) setRendererPixelRatio(renderSize.pixelRatio + pixelStep);
        qualityElapsed = 0;
        qualityFrames = 0;
      }

      const keyboardThrottle =
        keys.has('ArrowUp') || keys.has('KeyW')
          ? 1
          : keys.has('ArrowDown') || keys.has('KeyS')
          ? -1
          : 0;
      const keyboardSteer =
        (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) -
        (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
      const touchInput = touchControlRef.current;
      const rawThrottle = gestureDrive.active ? gestureDrive.throttle : touchInput.throttle || keyboardThrottle;
      const rawSteer = gestureDrive.active ? gestureDrive.steer : touchInput.steer || keyboardSteer;

      if (touchInput.jumpQueued) {
        kartState.jumpQueued = true;
        touchInput.jumpQueued = false;
      }

      const driftPressed =
        touchInput.drift || keys.has('Space') || keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyX');
      kartState.throttleInput = damp(
        kartState.throttleInput,
        clamp(rawThrottle, -1, 1),
        driveTune.throttleSmoothing,
        dt
      );
      kartState.steerInput = damp(
        kartState.steerInput,
        clamp(rawSteer, -1, 1),
        driveTune.steerSmoothing,
        dt
      );

      let forward = new THREE.Vector3(Math.sin(kartState.heading), 0, Math.cos(kartState.heading));
      let right = new THREE.Vector3(forward.z, 0, -forward.x);
      const speedBefore = kartState.velocity.length();
      const forwardSpeedBefore = kartState.velocity.dot(forward);
      const preJumpSpeedRatio = clamp(speedBefore / driveTune.maxSpeed, 0, 1);

      const releaseDrift = () => {
        const turbo = driveTune.driftReleaseBoosts.find((tier) => kartState.driftCharge >= tier.charge);
        if (turbo) {
          kartState.boostTimer = Math.max(kartState.boostTimer, turbo.duration);
          kartState.boostTier = Math.max(kartState.boostTier, turbo.level);
          kartState.driftReleasePulse = 1;
          kartState.velocity.addScaledVector(forward, turbo.impulse);
          if (kartState.velocity.length() > driveTune.boostMaxSpeed) {
            kartState.velocity.setLength(driveTune.boostMaxSpeed);
          }
        }
        kartState.driftActive = false;
        kartState.driftCharge = 0;
        kartState.driftDirection = 0;
      };

      const driftSpeedOk = speedBefore > driveTune.driftMinSpeed && forwardSpeedBefore > 2;
      const steeringForDrift = Math.abs(kartState.steerInput) > 0.16;
      if (!kartState.driftActive && driftPressed && driftSpeedOk && steeringForDrift) {
        kartState.driftActive = true;
        kartState.driftCharge = 0;
        kartState.driftDirection = Math.sign(kartState.steerInput) || 1;
        if (kartState.grounded) {
          kartState.verticalVelocity = Math.max(kartState.verticalVelocity, driveTune.driftHopVelocity);
          kartState.grounded = false;
        }
      } else if (kartState.driftActive && (!driftPressed || !driftSpeedOk)) {
        releaseDrift();
      }

      if (kartState.driftActive) {
        const counterSteer = kartState.steerInput * kartState.driftDirection < -0.25;
        const steerCharge = 0.58 + Math.abs(kartState.steerInput) * 0.64;
        const chargeRate = driveTune.driftChargeRate * steerCharge * (counterSteer ? 0.68 : 1);
        kartState.driftCharge = clamp(
          kartState.driftCharge + chargeRate * (0.7 + preJumpSpeedRatio * 0.48) * dt,
          0,
          3.1
        );
      }
      kartState.driftInput = damp(kartState.driftInput, kartState.driftActive ? 1 : 0, 14, dt);

      kartState.jumpCooldown = Math.max(0, kartState.jumpCooldown - dt);
      if (kartState.jumpQueued && kartState.grounded && kartState.jumpCooldown <= 0) {
        kartState.verticalVelocity = driveTune.jumpVelocity + preJumpSpeedRatio * 3.2;
        kartState.grounded = false;
        kartState.jumpCooldown = driveTune.jumpCooldown;
      }
      kartState.jumpQueued = false;

      if (!kartState.grounded || kartState.height > 0.001) {
        kartState.height += kartState.verticalVelocity * dt;
        kartState.verticalVelocity -= driveTune.gravity * dt;
        if (kartState.height <= 0) {
          kartState.height = 0;
          kartState.verticalVelocity = 0;
          kartState.grounded = true;
          kartState.landPulse = 1;
        }
      }

      let engineForce = 0;
      if (kartState.throttleInput > 0.04) {
        const topEndLoss = clamp(forwardSpeedBefore / driveTune.maxSpeed, 0, 1) * 0.42;
        engineForce =
          kartState.throttleInput *
          (forwardSpeedBefore < -1 ? driveTune.brake : driveTune.acceleration * (1 - topEndLoss));
      } else if (kartState.throttleInput < -0.04) {
        engineForce =
          kartState.throttleInput *
          (forwardSpeedBefore > 2.4 ? driveTune.brake : driveTune.reverseAcceleration);
      }
      if (!kartState.grounded) engineForce *= 0.34;
      kartState.velocity.addScaledVector(forward, engineForce * dt);

      const currentSpeed = kartState.velocity.length();
      const drag = driveTune.coastDrag + currentSpeed * driveTune.rollingDrag;
      if (Math.abs(kartState.throttleInput) < 0.08) {
        kartState.velocity.multiplyScalar(Math.max(0, 1 - drag * dt));
      } else {
        kartState.velocity.multiplyScalar(Math.max(0, 1 - 0.035 * dt));
      }

      const lateralSpeed = kartState.velocity.dot(right);
      const counterSteerGrip =
        kartState.driftActive ? clamp(-(kartState.steerInput * kartState.driftDirection), 0, 1) : 0;
      const grip = kartState.grounded
        ? kartState.driftActive
          ? THREE.MathUtils.lerp(driveTune.driftGrip, driveTune.lateralGrip * 0.62, counterSteerGrip)
          : THREE.MathUtils.lerp(driveTune.lateralGrip, driveTune.driftGrip, kartState.driftInput)
        : driveTune.airGrip;
      kartState.velocity.addScaledVector(right, -lateralSpeed * clamp(grip * dt, 0, 1));
      if (kartState.driftActive && kartState.grounded) {
        kartState.velocity.addScaledVector(
          right,
          kartState.driftDirection * driveTune.driftSlipForce * (0.44 + preJumpSpeedRatio * 0.72) * dt
        );
      }

      const signedSpeed = kartState.velocity.dot(forward);
      const steeringSpeedRatio = clamp(Math.abs(signedSpeed) / driveTune.maxSpeed, 0, 1);
      const driftTurnInput = kartState.driftActive
        ? kartState.driftDirection * (driveTune.driftTurnAssist + Math.abs(kartState.steerInput) * 0.42) +
          kartState.steerInput * 0.2
        : kartState.steerInput;
      const turnResponse =
        (0.26 + steeringSpeedRatio * 0.92) *
        (1 + kartState.driftInput * 0.42) *
        (kartState.grounded ? 1 : 0.46);
      if (kartState.velocity.length() > 0.35 || Math.abs(kartState.throttleInput) > 0.15) {
        kartState.heading +=
          driftTurnInput *
          Math.sign(signedSpeed || kartState.throttleInput || 1) *
          driveTune.steerRate *
          turnResponse *
          dt;
      }

      forward = new THREE.Vector3(Math.sin(kartState.heading), 0, Math.cos(kartState.heading));
      right = new THREE.Vector3(forward.z, 0, -forward.x);
      const reverseSpeed = kartState.velocity.dot(forward);
      if (reverseSpeed < -driveTune.reverseMaxSpeed) {
        kartState.velocity.addScaledVector(forward, -driveTune.reverseMaxSpeed - reverseSpeed);
      }

      const speedLimit = kartState.boostTimer > 0 ? driveTune.boostMaxSpeed : driveTune.maxSpeed;
      if (kartState.velocity.length() > speedLimit) kartState.velocity.setLength(speedLimit);
      if (kartState.velocity.length() < 0.035) kartState.velocity.set(0, 0, 0);

      const previousPosition = kartState.position.clone();
      kartState.position.addScaledVector(kartState.velocity, dt);
      const boundedX = clamp(kartState.position.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX);
      const boundedZ = clamp(kartState.position.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ);
      if (boundedX !== kartState.position.x) kartState.velocity.x *= -0.24;
      if (boundedZ !== kartState.position.z) kartState.velocity.z *= -0.24;
      kartState.position.set(boundedX, 0, boundedZ);
      if (constrainToRoadNetwork(kartState.position)) {
        kartState.velocity.multiplyScalar(0.38);
        kartState.landPulse = Math.max(kartState.landPulse, 0.28);
      }
      if (resolveCollisions(kartState.position)) {
        kartState.velocity.copy(previousPosition.sub(kartState.position).multiplyScalar(5.4));
        kartState.landPulse = Math.max(kartState.landPulse, 0.45);
      }

      boostPads.forEach((pad, index) => {
        pad.cooldown = Math.max(0, pad.cooldown - dt);
        const distance = pad.position.distanceTo(kartState.position);
        const armed = distance < 6.2 && pad.cooldown <= 0 && kartState.velocity.length() > 4.2;
        if (armed) {
          kartState.boostTimer = 0.92;
          kartState.boostTier = Math.max(kartState.boostTier, 2);
          kartState.velocity.addScaledVector(forward, driveTune.boostImpulse);
          if (kartState.velocity.length() > driveTune.boostMaxSpeed) {
            kartState.velocity.setLength(driveTune.boostMaxSpeed);
          }
          pad.cooldown = 1.15;
        }
        const pulse = 1 + Math.sin(now / 95 + index) * 0.04 * pulseScale;
        pad.group.scale.set(pulse, 1, pulse);
        pad.glow.material.opacity = 0.14 + Math.sin(now / 120 + index) * 0.06 * pulseScale;
        pad.strips.forEach((strip, stripIndex) => {
          strip.position.y = 0.22 + Math.sin(now / 90 + stripIndex) * 0.035 * pulseScale;
        });
      });
      kartState.boostTimer = Math.max(0, kartState.boostTimer - dt);
      if (kartState.boostTimer <= 0) kartState.boostTier = 0;

      const speedRatio = clamp(kartState.velocity.length() / driveTune.maxSpeed, 0, 1);
      kartState.speed = kartState.velocity.dot(forward);
      const slipAmount = Math.abs(kartState.velocity.dot(right));
      const driftIntensity = clamp((slipAmount / 10 + kartState.driftInput * 0.55) * speedRatio, 0, 1);
      skidEmitTimer -= dt;
      if (!motionState.reduced && kartState.grounded && driftIntensity > 0.28 && skidEmitTimer <= 0) {
        [-1, 1].forEach((side) => {
          const mark = skidMarks[skidCursor];
          skidCursor = (skidCursor + 1) % skidMarks.length;
          const offset = new THREE.Vector3(side * 4.45, 0, -5.6).applyAxisAngle(Y_AXIS, kartState.heading);
          mark.mesh.position.set(
            kartState.position.x + offset.x,
            0.38,
            kartState.position.z + offset.z
          );
          mark.mesh.rotation.set(-Math.PI / 2, 0, kartState.heading);
          mark.mesh.scale.set(1, 1 + speedRatio * 0.72, 1);
          mark.mesh.material.opacity = 0.14 + driftIntensity * 0.24;
          mark.mesh.visible = true;
          mark.life = 0.72;
        });
        skidEmitTimer = 0.055;
      }
      skidMarks.forEach((mark) => {
        if (mark.life <= 0) return;
        mark.life = Math.max(0, mark.life - dt);
        mark.mesh.material.opacity = Math.min(mark.mesh.material.opacity, mark.life * 0.46);
        if (mark.life <= 0) mark.mesh.visible = false;
      });

      driftSparkEmitTimer -= dt;
      if (!motionState.reduced && kartState.driftActive && driftIntensity > 0.18 && driftSparkEmitTimer <= 0) {
        const sparkLevel = getDriftSparkLevel();
        [-1, 1].forEach((side) => {
          const offset = new THREE.Vector3(side * 4.55, 0.55, -5.9).applyAxisAngle(Y_AXIS, kartState.heading);
          const origin = kartState.position.clone().add(offset);
          const sparkVelocity = right
            .clone()
            .multiplyScalar(side * (7.2 + driftIntensity * 4.4))
            .addScaledVector(forward, -5.8 - speedRatio * 5.5);
          spawnDriftSpark(origin, sparkVelocity, sparkLevel, driftIntensity);
        });
        driftSparkEmitTimer = getDriftSparkLevel() > 0 ? 0.027 : 0.045;
      }
      driftSparks.forEach((spark, index) => {
        if (spark.life > 0) {
          spark.life = Math.max(0, spark.life - dt);
          spark.position.addScaledVector(spark.velocity, dt);
          spark.velocity.y -= 20 * dt;
          spark.position.y = Math.max(0.5, spark.position.y);
          const fade = spark.maxLife > 0 ? spark.life / spark.maxLife : 0;
          sparkDummy.position.copy(spark.position);
          sparkDummy.rotation.set(now / 210 + index, now / 180 + index * 0.4, now / 160);
          sparkDummy.scale.setScalar(spark.scale * (0.25 + fade * 0.85));
        } else {
          sparkDummy.position.set(0, -80, 0);
          sparkDummy.rotation.set(0, 0, 0);
          sparkDummy.scale.setScalar(0);
        }
        sparkDummy.updateMatrix();
        driftSparkMesh.setMatrixAt(index, sparkDummy.matrix);
      });
      driftSparkMesh.instanceMatrix.needsUpdate = true;

      kart.position.copy(kartState.position);
      kart.position.y =
        0.22 + kartState.height + Math.sin(now / 110) * (0.018 + speedRatio * 0.065) * pulseScale;
      kart.rotation.y = kartState.heading;
      kart.visible =
        kartState.velocity.length() > 0.9 ||
        Math.abs(kartState.throttleInput) > 0.05 ||
        Math.abs(kartState.steerInput) > 0.08;
      kartShadow.position.set(kartState.position.x, 0.34, kartState.position.z);
      kartShadow.rotation.z = -kartState.heading;
      kartShadow.visible = kart.visible;
      kartShadow.material.opacity = 0.12 + clamp(1 - kartState.height / 18, 0, 1) * 0.18;
      kartState.visualRoll = damp(
        kartState.visualRoll,
        (-kartState.steerInput * 0.18 - Math.sign(kartState.velocity.dot(right) || 0) * driftIntensity * 0.08) *
          speedRatio,
        9,
        dt
      );
      kartBody.rotation.y = damp(
        kartBody.rotation.y,
        kartState.driftActive ? -kartState.driftDirection * (0.2 + driftIntensity * 0.24) : 0,
        8,
        dt
      );
      kartBody.rotation.z = kartState.visualRoll;
      kartBody.rotation.x = damp(
        kartBody.rotation.x,
        kartState.grounded ? -speedRatio * 0.08 : clamp(kartState.verticalVelocity * 0.012, -0.28, 0.22),
        7,
        dt
      );
      kartState.landPulse = damp(kartState.landPulse, 0, 8, dt);
      kartState.driftReleasePulse = damp(kartState.driftReleasePulse, 0, 7, dt);
      kartBody.scale.set(
        1 + kartState.landPulse * 0.04 + kartState.driftReleasePulse * 0.06,
        1 - kartState.landPulse * 0.12,
        1 + kartState.landPulse * 0.05 + kartState.driftReleasePulse * 0.1
      );
      kartBody.position.y = Math.sin(now / 76) * speedRatio * 0.12 - kartState.landPulse * 0.18;
      wheels.forEach((wheel, wheelIndex) => {
        wheel.position.y =
          wheel.userData.baseY +
          Math.sin(now / 92 + wheelIndex * 0.84) * speedRatio * 0.09 * pulseScale -
          kartState.landPulse * 0.16;
        wheel.rotation.x += kartState.speed * dt * 2.35;
        if (wheel.userData.front) wheel.rotation.y = kartState.steerInput * 0.38;
      });
      boostFlame.visible = kartState.boostTimer > 0.02;
      if (boostFlame.visible) {
        const turboColor = sparkColors[kartState.boostTier] || sparkColors[0];
        boostFlame.userData.flames.forEach((flame) => {
          flame.material.color.copy(turboColor);
          flame.material.emissive.copy(turboColor);
          flame.material.emissiveIntensity = 0.88 + kartState.boostTier * 0.08;
        });
        boostRing.material.color.copy(turboColor);
        boostRing.material.opacity = 0.42 + kartState.boostTier * 0.08;
        const flameScale = 0.82 + Math.sin(now / 45) * 0.2 * pulseScale + speedRatio * 0.28;
        boostFlame.scale.set(1, 1, flameScale);
        boostRing.rotation.z += dt * 5.4 * motionScale;
      }

      boostTrailEmitTimer -= dt;
      if (!motionState.reduced && boostFlame.visible && boostTrailEmitTimer <= 0) {
        const exhaustOrigin = kartState.position.clone().addScaledVector(forward, -8.2);
        [-2.25, 2.25].forEach((side, sideIndex) => {
          spawnBoostTrail(exhaustOrigin, forward, side, (kartState.boostTier + sideIndex) % boostTrailColors.length);
        });
        boostTrailEmitTimer = 0.026;
      }
      boostTrails.forEach((trail, index) => {
        if (trail.life > 0) {
          trail.life = Math.max(0, trail.life - dt);
          trail.position.addScaledVector(trail.velocity, dt);
          trail.velocity.y += 1.8 * dt;
          const fade = trail.maxLife > 0 ? trail.life / trail.maxLife : 0;
          sparkDummy.position.copy(trail.position);
          sparkDummy.rotation.set(now / 180 + index, now / 150 + index * 0.3, now / 120);
          sparkDummy.scale.setScalar(trail.scale * fade);
        } else {
          sparkDummy.position.set(0, -80, 0);
          sparkDummy.rotation.set(0, 0, 0);
          sparkDummy.scale.setScalar(0);
        }
        sparkDummy.updateMatrix();
        boostTrailMesh.setMatrixAt(index, sparkDummy.matrix);
      });
      boostTrailMesh.instanceMatrix.needsUpdate = true;

      rivalCars.forEach((rival, index) => {
        rival.group.visible = !viewport.mobile;
        rival.shadow.visible = !viewport.mobile;
        if (viewport.mobile) return;
        const phase = rival.phase + (now / 1000) * rival.speed;
        const x = Math.cos(phase) * rival.radiusX;
        const z = PLAZA_CENTER.z + Math.sin(phase) * rival.radiusZ;
        const dx = -Math.sin(phase) * rival.radiusX;
        const dz = Math.cos(phase) * rival.radiusZ;
        rival.group.position.set(x, 0.22 + Math.sin(now / 160 + index) * 0.03, z);
        rival.group.rotation.y = directionToYaw({ x: dx, z: dz });
        rival.shadow.position.set(x, 0.34, z);
        rival.shadow.rotation.z = -rival.group.rotation.y;
        rival.shadow.material.opacity = 0.2;
        rival.group.children[0].rotation.z = Math.sin(phase * 1.6) * 0.035;
        rival.wheels.forEach((wheel) => {
          wheel.rotation.x += dt * 11;
          if (wheel.userData.front) wheel.rotation.y = Math.sin(phase * 1.3) * 0.14;
        });
      });

      let nearbyDestination = null;
      let nearbyDistance = Infinity;
      const objectiveKey = activeDestinationRef.current;
      let routeGuideActiveKey = null;
      let routeGuideArrivedKey = null;
      let routeGuideIntensity = 0;
      destinations.forEach((destination, index) => {
        const entry = toVec3(destination.entry || destination.position);
        const distance = entry.distanceTo(kartState.position);
        const group = destinationGroups.get(destination.key);
        const portal = portalPads.get(destination.key);
        const effects = destinationEffects.get(destination.key);
        const guide = routeGuides.get(destination.key);
        const portalRadius = destination.portalRadius || 13;
        const active = distance < portalRadius;
        const objective = objectiveKey === destination.key;
        if (group) {
          const targetScale = active ? 1.045 : objective ? 1.022 : 1;
          group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
          if (group.userData.homeBeacon) {
            group.userData.homeBeacon.rotation.y += dt * 1.2;
            group.userData.homeBeacon.scale.setScalar(1 + Math.sin(now / 260) * 0.05);
          }
        }
        if (portal) {
          const highlighted = active || objective;
          const pulse = active
            ? 1 + Math.sin(now / 125 + index) * 0.065 * pulseScale
            : objective
            ? 1 + Math.sin(now / 160 + index) * 0.04 * pulseScale
            : 1 + Math.sin(now / 260 + index) * 0.018 * pulseScale;
          portal.scale.lerp(new THREE.Vector3(pulse, active ? 1.09 : objective ? 1.045 : 1, pulse), 0.12);
          portal.userData.ring.rotation.z += dt * (active ? 1.8 : objective ? 1.1 : 0.48) * motionScale;
          portal.userData.innerRing.rotation.z -= dt * (active ? 2.3 : objective ? 1.45 : 0.62) * motionScale;
          portal.userData.veil.material.opacity = active
            ? 0.23 + Math.sin(now / 120) * 0.07 * pulseScale
            : objective
            ? 0.18 + Math.sin(now / 180) * 0.045 * pulseScale
            : 0.12;
          portal.userData.aura.material.opacity = active
            ? 0.28 + Math.sin(now / 140) * 0.08 * pulseScale
            : objective
            ? 0.22 + Math.sin(now / 190) * 0.06 * pulseScale
            : 0.16;
          portal.userData.aura.scale.setScalar(active ? 1.08 : objective ? 1.03 : 1);
          portal.userData.outerRingMaterial.emissiveIntensity = active ? 1.45 : objective ? 1.16 : 0.86;
          portal.userData.portalLight.intensity = active ? 2.8 : objective ? 1.55 : 0.82;
          portal.userData.swirls?.forEach((swirl, swirlIndex) => {
            swirl.rotation.z +=
              dt * (active ? 2.35 : objective ? 1.35 : 0.54) * (swirlIndex % 2 ? -1 : 1) * motionScale;
            swirl.material.opacity = active
              ? 0.26 + Math.sin(now / 115 + swirl.userData.phase) * 0.08 * pulseScale
              : objective
              ? 0.2 + Math.sin(now / 180 + swirl.userData.phase) * 0.05 * pulseScale
              : 0.12;
          });
          portal.userData.sparks.forEach((spark) => {
            const phase =
              spark.userData.phase + (motionState.reduced ? 0 : now / (active ? 430 : highlighted ? 560 : 760));
            spark.position.set(Math.cos(phase) * 6.2, 8.35 + Math.sin(phase * 1.7) * 2.6, Math.sin(phase) * 0.56 + 0.5);
            spark.scale.setScalar(active ? 1.15 : objective ? 1 : 0.86);
          });
        }
        if (guide) {
          const fadeStart = portalRadius * 1.85;
          const fadeEnd = portalRadius * 0.72;
          const guideFade =
            objective && fadeStart > fadeEnd ? clamp((distance - fadeEnd) / (fadeStart - fadeEnd), 0, 1) : 0;
          const guideArrived = objective && active;
          const pathOpacity = guideFade;
          const beaconOpacity = objective ? (guideArrived ? 0.34 : clamp(0.48 + guideFade * 0.52, 0, 1)) : 0;
          const signOpacity = objective ? (guideArrived ? 0.36 : clamp(0.68 + guideFade * 0.32, 0, 1)) : 0;
          guide.visible = objective && (guideFade > 0.02 || guideArrived);
          guide.userData.pathOpacity = pathOpacity;
          guide.userData.beaconOpacity = beaconOpacity;
          guide.userData.signOpacity = signOpacity;
          if (objective) {
            routeGuideIntensity = Number(guideFade.toFixed(2));
            if (guideFade > 0.08) routeGuideActiveKey = destination.key;
            if (guideArrived) routeGuideArrivedKey = destination.key;
            guide.userData.rings?.forEach((ring, ringIndex) => {
              const wave = Math.sin(now / 155 + ring.userData.phase + ringIndex * 0.15) * pulseScale;
              ring.scale.setScalar(1.02 + wave * 0.08);
              ring.rotation.z += dt * (0.7 + ringIndex * 0.04) * motionScale;
              if (ring.material?.opacity != null) {
                ring.material.opacity = Math.max(0, (0.24 + wave * 0.08) * pathOpacity);
              }
            });
            if (guide.userData.beam) {
              const beamWave = Math.sin(now / 240 + index) * pulseScale;
              guide.userData.beam.scale.set(1 + beamWave * 0.05, 1, 1 + beamWave * 0.05);
              guide.userData.beam.material.opacity = Math.max(0, (0.1 + beamWave * 0.035) * beaconOpacity);
              guide.userData.beamCrown.rotation.z += dt * 0.74 * motionScale;
              guide.userData.beamCrown.material.opacity = Math.max(0, (0.3 + beamWave * 0.08) * beaconOpacity);
            }
            if (guide.userData.sign) {
              guide.userData.sign.visible = signOpacity > 0.08;
              setGuideObjectOpacity(guide.userData.sign, signOpacity);
              guide.userData.sign.position.y =
                guide.userData.signBaseY + Math.sin(now / 220 + index) * 0.16 * pulseScale;
            }
          }
        }
        effects?.signs?.forEach((sign, signIndex) => animateSign(sign, active || objective, now, index + signIndex));
        effects?.gates?.forEach((gate) => {
          const target = active ? 1.04 : objective ? 1.02 : 1;
          gate.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
        });
        if (distance < nearbyDistance) {
          nearbyDistance = distance;
          nearbyDestination = distance < (destination.portalRadius || 13) ? destination : null;
        }
      });
      updateNearby(nearbyDestination);

      animatedBanners.forEach((banner, index) => {
        const cloth = banner.userData.cloth;
        if (!cloth) return;
        cloth.rotation.z = Math.sin(now / 520 + index) * 0.025 * pulseScale;
        cloth.position.y = banner.userData.baseY + Math.sin(now / 650 + index) * 0.06 * pulseScale;
      });

      animatedDistrictParts.forEach((part) => {
        const wave = Math.sin(now / 420 + part.phase) * pulseScale;
        if (part.type === 'scanBeam') {
          part.object.rotation.y += dt * 0.38 * motionScale;
          part.object.material.opacity = 0.12 + wave * 0.04;
        } else if (part.type === 'homeRing') {
          part.object.rotation.z += dt * (0.34 + part.phase * 0.03) * motionScale;
          part.object.scale.setScalar(1 + wave * 0.055);
        } else if (part.type === 'wrench') {
          part.object.rotation.z = wave * 0.045;
        } else if (part.type === 'pulse') {
          part.object.scale.setScalar(1 + wave * 0.035);
        } else if (part.type === 'statusRing') {
          part.object.rotation.z += dt * (0.48 + part.phase * 0.015) * motionScale;
          part.object.scale.setScalar((part.baseScale || 1) * (1 + wave * 0.07));
        } else if (part.type === 'ferris') {
          part.object.rotation.z += dt * 0.06 * motionScale;
        }
      });

      animatedClouds.forEach((cloud, index) => {
        cloud.position.x += cloud.userData.cloudSpeed * motionScale;
        if (cloud.position.x > 158) cloud.position.x = -158;
        cloud.rotation.z = Math.sin(now / 1800 + index) * 0.015 * pulseScale;
      });

      if (progressTower.userData.beacon) {
        progressTower.userData.beacon.rotation.y += dt * 0.8 * motionScale;
        progressTower.userData.beacon.scale.setScalar(1 + Math.sin(now / 270) * 0.065 * pulseScale);
        progressTower.userData.cityBeam.rotation.y += dt * 0.12 * motionScale;
        progressTower.userData.cityBeam.material.opacity = 0.16 + Math.sin(now / 360) * 0.04 * pulseScale;
        progressTower.userData.beamCore.material.opacity = 0.28 + Math.sin(now / 220) * 0.08 * pulseScale;
        progressTower.userData.objectiveBadge.rotation.y += dt * 0.9 * motionScale;
        progressTower.userData.objectiveBadge.position.y = 35.5 + Math.sin(now / 340) * 0.45 * pulseScale;
        progressTower.userData.halo.rotation.z += dt * 0.32 * motionScale;
        progressTower.userData.halo.material.opacity = 0.16 + Math.sin(now / 300) * 0.06 * pulseScale;
        progressTower.userData.rings.forEach((ring, index) => {
          ring.rotation.z += dt * (0.18 + index * 0.02) * motionScale;
        });
      }

      const baseFov = viewport.mobile ? 68 : CAMERA_PRESETS.desktopPlaza.fov;
      const targetFov =
        baseFov + speedRatio * (motionState.reduced ? 1.2 : 4) + (kartState.boostTimer > 0 && !motionState.reduced ? 1.6 : 0);
      camera.fov = damp(camera.fov, targetFov, 4.2, dt);
      camera.updateProjectionMatrix();

      const cameraDistance =
        (viewport.mobile ? 58 : CAMERA_PRESETS.desktopPlaza.distance * 0.68) + speedRatio * 10;
      const cameraHeight =
        (viewport.mobile ? 28 : CAMERA_PRESETS.desktopPlaza.height * 0.82) + speedRatio * 5;
      const sideOffset = new THREE.Vector3(Math.cos(kartState.heading), 0, -Math.sin(kartState.heading)).multiplyScalar(
        -4.8 * kartState.steerInput * speedRatio
      );
      let desiredCamera = kartState.position
        .clone()
        .addScaledVector(forward, -cameraDistance)
        .add(sideOffset)
        .add(new THREE.Vector3(0, cameraHeight, viewport.mobile ? -3 : -18));
      const vistaBlend = clamp(1 - kartState.velocity.length() / 12, 0, viewport.mobile ? 0.86 : 1);
      if (vistaBlend > 0.02) {
        const vistaCamera = new THREE.Vector3(
          kartState.position.x * (viewport.mobile ? 0.26 : 0.12),
          viewport.mobile ? 82 : CAMERA_PRESETS.desktopPlaza.height,
          viewport.mobile ? -178 : -CAMERA_PRESETS.desktopPlaza.distance
        );
        desiredCamera = desiredCamera.lerp(vistaCamera, vistaBlend);
      }
      desiredCamera.x = clamp(desiredCamera.x, WORLD_BOUNDS.minX - 42, WORLD_BOUNDS.maxX + 42);
      desiredCamera.z = clamp(
        desiredCamera.z,
        WORLD_BOUNDS.minZ - (viewport.mobile ? 30 : 146),
        WORLD_BOUNDS.maxZ + 42
      );
      if (kartState.boostTimer > 0 && !motionState.reduced) {
        const shake = 0.18 + kartState.boostTier * 0.08;
        desiredCamera.x += Math.sin(now / 34) * shake;
        desiredCamera.y += Math.sin(now / 41) * shake * 0.35;
      }
      camera.position.lerp(desiredCamera, 1 - Math.exp(-(5.2 + speedRatio * 1.8) * dt));

      const lookAhead = (viewport.mobile ? 18 : 52) + speedRatio * 22;
      let desiredLookTarget = kartState.position
        .clone()
        .addScaledVector(forward, lookAhead)
        .add(new THREE.Vector3(0, viewport.mobile ? 4.2 : CAMERA_PRESETS.desktopPlaza.lookHeight * 0.54, 0));
      if (vistaBlend > 0.02) {
        const vistaLookTarget = PLAZA_CENTER.clone().add(
          new THREE.Vector3(0, viewport.mobile ? 20 : CAMERA_PRESETS.desktopPlaza.lookHeight, 6)
        );
        desiredLookTarget = desiredLookTarget.lerp(vistaLookTarget, vistaBlend);
      }
      if (nearbyDestination) {
        const entry = toVec3(nearbyDestination.entry || nearbyDestination.position);
        const building = toVec3(nearbyDestination.position);
        const focus = entry.lerp(building, 0.58).add(new THREE.Vector3(0, viewport.mobile ? 15 : 12, 0));
        const focusBlend = clamp(1 - nearbyDistance / (nearbyDestination.portalRadius || 13), 0, 0.7);
        desiredLookTarget = desiredLookTarget.lerp(focus, focusBlend);
      }
      cameraLookTarget.lerp(desiredLookTarget, 1 - Math.exp(-6.5 * dt));
      camera.lookAt(cameraLookTarget);

      renderer.render(scene, camera);
      if (!referenceMode && typeof window !== 'undefined') {
        poseEmitElapsed += dt;
        if (poseEmitElapsed >= 1.1) {
          poseEmitElapsed = 0;
          emitPlayerPose();
        }
        const telemetry = {
          ...(telemetryDetailsRef.current || {}),
          activeDestinationKey: activeDestinationRef.current || null,
          destinationScreenPoints: getDestinationScreenPoints(),
          fallback: false,
          fpsEstimate: lastFpsEstimate ? Number(lastFpsEstimate.toFixed(1)) : null,
          hubCosmetics: hubTheme,
          nearbyDestinationKey: nearbyDestination?.key || null,
          performance: {
            ...sceneMetrics,
            drawCalls: renderer.info.render.calls || 0,
            geometries: renderer.info.memory.geometries || 0,
            lines: renderer.info.render.lines || 0,
            points: renderer.info.render.points || 0,
            textures: renderer.info.memory.textures || 0,
            triangles: renderer.info.render.triangles || 0,
          },
          pixelRatio: Number(renderSize.pixelRatio.toFixed(2)),
          player: {
            driftActive: Boolean(kartState.driftActive),
            driftCharge: Number(kartState.driftCharge.toFixed(2)),
            forwardSpeed: Number(kartState.velocity.dot(forward).toFixed(2)),
            heading: Number(kartState.heading.toFixed(3)),
            speed: Number(kartState.velocity.length().toFixed(2)),
            x: Number(kartState.position.x.toFixed(2)),
            z: Number(kartState.position.z.toFixed(2)),
          },
          ready: true,
          reducedMotion: motionState.reduced,
          routeGuide: {
            activeKey: routeGuideActiveKey,
            arrivedKey: routeGuideArrivedKey,
            intensity: routeGuideIntensity,
            targetKey: objectiveKey || null,
          },
          debugOverlay: debugOverlayStats,
          viewport: {
            height: renderSize.height,
            mobile: viewport.mobile,
            width: renderSize.width,
          },
        };
        window.__comebackCityHubTelemetry = telemetry;
        canvas.dataset.telemetryReady = 'true';
        canvas.dataset.activeDestinationKey = telemetry.activeDestinationKey || '';
        canvas.dataset.activeMissionKey = telemetry.activeMission?.key || '';
        canvas.dataset.districtFeedback = JSON.stringify(telemetry.districtFeedback || []);
        canvas.dataset.drawCalls = String(telemetry.performance.drawCalls);
        canvas.dataset.fallback = 'false';
        canvas.dataset.fpsEstimate = telemetry.fpsEstimate == null ? '' : String(telemetry.fpsEstimate);
        canvas.dataset.debugBoostPadCount = String(telemetry.debugOverlay.boostPads);
        canvas.dataset.debugCollisionBoxCount = String(telemetry.debugOverlay.collisionBoxes);
        canvas.dataset.debugOverlayEnabled = telemetry.debugOverlay.enabled ? 'true' : 'false';
        canvas.dataset.debugPortalCount = String(telemetry.debugOverlay.portals);
        canvas.dataset.geometryCount = String(telemetry.performance.geometries);
        canvas.dataset.hubBannerSet = telemetry.hubCosmetics.bannerSet;
        canvas.dataset.hubKartPaint = telemetry.hubCosmetics.kartPaint;
        canvas.dataset.hubKartPaintColor = telemetry.hubCosmetics.kartPaintColor;
        canvas.dataset.hubTrailColor = telemetry.hubCosmetics.trailColor;
        canvas.dataset.nearbyDestinationKey = telemetry.nearbyDestinationKey || '';
        canvas.dataset.pixelRatio = String(telemetry.pixelRatio);
        canvas.dataset.playerDriftActive = telemetry.player.driftActive ? 'true' : 'false';
        canvas.dataset.playerDriftCharge = String(telemetry.player.driftCharge);
        canvas.dataset.playerForwardSpeed = String(telemetry.player.forwardSpeed);
        canvas.dataset.playerHeading = String(telemetry.player.heading);
        canvas.dataset.playerSpeed = String(telemetry.player.speed);
        canvas.dataset.playerX = String(telemetry.player.x);
        canvas.dataset.playerZ = String(telemetry.player.z);
        canvas.dataset.reducedMotion = telemetry.reducedMotion ? 'true' : 'false';
        canvas.dataset.routeGuideActiveKey = telemetry.routeGuide.activeKey || '';
        canvas.dataset.routeGuideArrivedKey = telemetry.routeGuide.arrivedKey || '';
        canvas.dataset.routeGuideIntensity = String(telemetry.routeGuide.intensity);
        canvas.dataset.routeGuideTargetKey = telemetry.routeGuide.targetKey || '';
        canvas.dataset.sceneInstancedMeshCount = String(telemetry.performance.instancedMeshCount);
        canvas.dataset.sceneMeshCount = String(telemetry.performance.meshCount);
        canvas.dataset.sceneObjectCount = String(telemetry.performance.objectCount);
        canvas.dataset.textureCount = String(telemetry.performance.textures);
        canvas.dataset.triangles = String(telemetry.performance.triangles);
        canvas.dataset.viewportMobile = telemetry.viewport.mobile ? 'true' : 'false';
      }
      frame = requestAnimationFrame(animate);
    };

    let frame = requestAnimationFrame(animate);
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (reducedMotionQuery?.removeEventListener) {
        reducedMotionQuery.removeEventListener('change', syncReducedMotion);
      } else {
        reducedMotionQuery?.removeListener?.(syncReducedMotion);
      }
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      nearbyDestinationRef.current = null;
      onNearbyChange(null);
      if (!referenceMode && typeof window !== 'undefined' && !window.__comebackCityHubTelemetry?.fallback) {
        delete window.__comebackCityHubTelemetry;
      }
      const disposedMaterials = new Set();
      const disposedGeometries = new Set();
      const disposedTextures = new Set();
      scene.traverse((object) => {
        if (object.geometry && !disposedGeometries.has(object.geometry)) {
          disposedGeometries.add(object.geometry);
          object.geometry.dispose();
        }
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.filter(Boolean).forEach((material) => {
          if (disposedMaterials.has(material)) return;
          disposedMaterials.add(material);
          ['map', 'alphaMap', 'aoMap', 'bumpMap', 'emissiveMap', 'gradientMap', 'normalMap'].forEach((key) => {
            const texture = material[key];
            if (texture && !disposedTextures.has(texture)) {
              disposedTextures.add(texture);
              texture.dispose();
            }
          });
          material.dispose();
        });
      });
      renderer.dispose();
    };
  }, [
    destinations,
    hubCosmetics,
    onEnter,
    onNearbyChange,
    profile.avatar,
    profile.level,
    reducedMotion,
    referenceMode,
    renderFallback,
  ]);

  return (
    <>
      {renderFallback ? (
        <FallbackWorld
          activeDestinationKey={activeDestinationKey}
          destinations={destinations}
          onEnter={onEnter}
          reducedMotion={reducedMotion}
        />
      ) : (
        <>
          <canvas
            ref={canvasRef}
            className="world-scene-canvas absolute inset-0 h-full w-full"
            aria-label="Comeback City 3D world"
            data-playable-world="true"
            data-testid="world-scene-canvas"
          />
          {!referenceMode && (
          <div className="world-touch-controls pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-30 flex items-end justify-between px-4">
            <div className="pointer-events-auto grid grid-cols-3 gap-2">
              <span />
              <button
                type="button"
                aria-label="Accelerate"
                className="world-touch-button"
                onPointerDown={pressDrive({ throttle: 1 })}
                onPointerUp={releaseDrive({ throttle: 0 })}
                onPointerCancel={releaseDrive({ throttle: 0 })}
              >
                <ArrowUp size={20} />
              </button>
              <span />
              <button
                type="button"
                aria-label="Steer left"
                className="world-touch-button"
                onPointerDown={pressDrive({ steer: -1 })}
                onPointerUp={releaseDrive({ steer: 0 })}
                onPointerCancel={releaseDrive({ steer: 0 })}
              >
                <ArrowLeft size={20} />
              </button>
              <button
                type="button"
                aria-label="Brake or reverse"
                className="world-touch-button"
                onPointerDown={pressDrive({ throttle: -1 })}
                onPointerUp={releaseDrive({ throttle: 0 })}
                onPointerCancel={releaseDrive({ throttle: 0 })}
              >
                <ArrowDown size={20} />
              </button>
              <button
                type="button"
                aria-label="Steer right"
                className="world-touch-button"
                onPointerDown={pressDrive({ steer: 1 })}
                onPointerUp={releaseDrive({ steer: 0 })}
                onPointerCancel={releaseDrive({ steer: 0 })}
              >
                <ArrowRight size={20} />
              </button>
            </div>
            <div className="pointer-events-auto flex flex-col gap-2">
              <button
                type="button"
                aria-label="Jump"
                className="world-touch-enter"
                onPointerDown={jumpDrive}
                onPointerUp={releaseDrive({})}
                onPointerCancel={releaseDrive({})}
              >
                <ArrowUp size={18} />
                Jump
              </button>
              <button
                type="button"
                aria-label="Drift"
                className="world-touch-enter"
                onPointerDown={pressDrive({ drift: 1 })}
                onPointerUp={releaseDrive({ drift: 0 })}
                onPointerCancel={releaseDrive({ drift: 0 })}
              >
                <ArrowLeft size={18} />
                Drift
              </button>
              <button
                type="button"
                aria-label="Enter nearby destination"
                className="world-touch-enter"
                onPointerDown={enterNearby}
              >
                <CornerDownRight size={20} />
                Enter
              </button>
            </div>
          </div>
          )}
        </>
      )}
    </>
  );
};
