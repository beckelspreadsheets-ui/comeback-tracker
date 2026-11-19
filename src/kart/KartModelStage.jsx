// The select screen's live model stage.
//
// Owner, verbatim: "the menus just need to pop look 3d and really show the
// characters and cars off better than they do instead of look like a nintendo
// waiting screen we want nintendo switch quality."
//
// The diagnosis was in the assets, not the layout: the screen was showing flat
// PNG plates of characters and karts that ALREADY EXIST AS GLBs. Nothing moved,
// nothing was lit, nothing responded — which is what a waiting screen is. So
// this renders the real models, lit in the colours of THE TRACK YOU JUST
// PICKED, so the menu previews the race instead of sitting outside it. Change
// your track and the light and the backdrop change with it.
//
// The driver is seated in the kart (owner call 2026-08-07; see the selection
// effect), and the two turn as one rig.
//
// STAGING (2026-11, owner on the App Store shot: the kart "looks cheap"). The
// models were not the whole problem: the rig sat small in an empty flat panel,
// seen from above, under about half the light it needed. So the stage is now a
// showroom:
//   - a low three-quarter FRONT view that the rig holds, swaying a little,
//     instead of a full turntable that spent half its time showing the back;
//   - the camera fits itself to each rig, so every kart fills the panel;
//   - a round glossy platform with a contact shadow, a dim mirror image of the
//     rig, and a ring and underglow in the track's colour;
//   - a neutral key from the front, a coloured rim and the track's sun from
//     behind, a soft fill, and a small procedural environment map so glossy
//     and metallic materials have something to reflect;
//   - the track's own menu art behind it, out of focus, with its horizon on
//     the camera's horizon.
// The measured KART_NOSE_YAW is applied as before (this project does not guess
// facings); HERO_YAW is the one stage-wide turn on top of it.
import { useEffect, useRef, useState } from 'react';
import {
  AdditiveBlending,
  AlwaysStencilFunc,
  Box3,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  DirectionalLight,
  EqualStencilFunc,
  EquirectangularReflectionMapping,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  Plane,
  PMREMGenerator,
  ReplaceStencilOp,
  RingGeometry,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import backdropComebackCityUrl from '../assets/game/select/menu-backdrop-comeback-city.webp';
import backdropPenguinVillageUrl from '../assets/game/select/menu-backdrop-penguin-village.webp';
import { KART_CHARACTERS, KART_NOSE_YAW } from '../game/ComebackCityThreeKartRace.jsx';
import { KART_TRACKS } from '../game/race/tracks/index.js';
import { createGameGltfLoader } from '../game/race/render/gltfLoader.js';
import { collectRendererTextures, disposeTextures } from '../game/race/render/releaseTextures.js';
import { SELECT_CHARACTER_MODELS, SELECT_KART_MODELS } from './selectModels.js';
import { applyStagePaint, createStagePaintUniform, setStagePaint } from './stagePaint.js';
import { DEBUG_HOOKS } from '../game/race/storeBuild.js';

// The track's own sun colour, read off the SHIPPED track palettes rather than
// raceSceneTheme.js — that module is marked LEGACY and the monolith imports
// none of it, so lighting the menu from it would have looked right in code and
// wrong on screen. On the stage the sun is the warm light from BEHIND the rig
// (it is the sunset in the backdrop); the key is a fixed neutral light on the
// camera's side, so a kart's paint reads the same on every track.
const SUN_FALLBACK = '#ffb85a';

// One look per track. `rim` is the coloured back light and the platform ring;
// `glow` is the pool of light around the platform when no character accent is
// passed in; `sky` and `haze` paint the
// environment map (top of the sky, and the band at the horizon); `horizon` is
// where the horizon sits in the backdrop image, as a share of its height.
const STAGE_THEMES = {
  'comeback-city': {
    backdrop: backdropComebackCityUrl,
    floor: 'rgba(38,20,48,0.28)',
    glow: '#ff5fc8',
    haze: '#ff9a5c',
    horizon: 0.845,
    horizonGlow: 'rgba(255,150,90,0.34)',
    rim: '#5ff0ff',
    sky: '#2a1740',
  },
  'penguin-village': {
    backdrop: backdropPenguinVillageUrl,
    floor: 'rgba(30,40,80,0.3)',
    glow: '#6fe9ff',
    haze: '#ffc9a0',
    horizon: 0.775,
    horizonGlow: 'rgba(190,225,255,0.3)',
    rim: '#7dffd6',
    sky: '#1b2748',
  },
  // No menu art of its own yet (the page behind falls back to the city), so
  // the stage borrows Penguin Village's mountains and cools them to the
  // track's blue hour.
  'satoshi-summit': {
    backdrop: backdropPenguinVillageUrl,
    backdropFilter: 'hue-rotate(-28deg) saturate(0.8) brightness(0.72)',
    floor: 'rgba(24,26,70,0.34)',
    glow: '#8f9bff',
    haze: '#8a8fd6',
    horizon: 0.775,
    horizonGlow: 'rgba(150,160,255,0.26)',
    rim: '#9db2ff',
    sky: '#171a44',
  },
};
const themeFor = (trackKey) => STAGE_THEMES[trackKey] || STAGE_THEMES['comeback-city'];

// Avatars carry their own measured front-facing convention. Read off
// KART_CHARACTERS.driverYaw rather than restated, for the same reason the kart
// yaw is imported: two copies of a measured facing is how they drift apart.
const KART_CHARACTER_YAW = Object.fromEntries(KART_CHARACTERS.map((entry) => [entry.key, entry.driverYaw]));

// Seated-driver proportions, in units of the kart's own fitted height so they
// hold across a roster whose bodies range from a near-cubic ice block to an
// open-wheel single-seater. The race's own numbers are absolute (driverHeight
// 5.7-6.4 against KART_FIT_MAX_HEIGHT 7.8) and do not transfer to a stage that
// fits each kart to a fixed frame, so these are the ratio equivalents.
const KART_STAGE_HEIGHT = 0.72;
const DRIVER_HEIGHT_RATIO = 1.15;
const DRIVER_SEAT_DEPTH = 0.42; // how far the avatar sinks into the shell
const DRIVER_LEAN = 0.13; // matches mountDriverAvatar's rest pose

// ── camera and idle ───────────────────────────────────────────────────────
// The rig rests nose toward the camera and to the right (clear of the name
// plate, which is bottom left), and sways SWAY either
// side of that. Reduce motion holds it at HERO_YAW.
const HERO_YAW = 0.7;
const SWAY = 0.2;
const SWAY_SECONDS = 11;
const CAMERA_FOV = 30;
// In units of the rig's height, so every kart gets the same view: the camera
// sits below the driver's shoulders and looks slightly up at the rig.
const CAMERA_HEIGHT = 0.4;
const CAMERA_TARGET = 0.47;
// The share of the panel the rig may fill, top to bottom and side to side.
const FILL_HEIGHT = 0.74;
const FILL_WIDTH = 0.56;
// The rig stands a little right of centre: the name plate is bottom left, and
// the long karts' rear wheels were landing on it.
const RIG_SHIFT = 0.035;
// Where the camera's horizon falls in the panel, from the top. It follows from
// the three numbers above (the camera looks up by under two degrees), and the
// backdrop puts its own horizon on the same line.
const STAGE_HORIZON = 0.53;

const sunColorFor = (trackKey) => KART_TRACKS.find((entry) => entry.key === trackKey)?.palette?.sunColor || SUN_FALLBACK;

const makeCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext('2d')];
};

// A soft round gradient standing in for a contact shadow. A real shadow map
// for two small models on one plane is a lot of GPU for a blur — this reads
// the same and costs one texture. The stage stretches it to the kart's own
// footprint, so a long kart gets a long shadow.
const makeShadowTexture = () => {
  const size = 128;
  const [canvas, context] = makeCanvas(size, size);
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.92)');
  gradient.addColorStop(0.55, 'rgba(0,0,0,0.8)');
  gradient.addColorStop(0.82, 'rgba(0,0,0,0.3)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
};

// White falling off to nothing: tinted per track, it is the pool of light the
// platform throws on the ground around it.
const makeGlowTexture = () => {
  const size = 128;
  const [canvas, context] = makeCanvas(size, size);
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // The inner half is under the platform and never drawn (see GLOW_REACH).
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.68, 'rgba(255,255,255,0.32)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
};

// The environment the materials reflect: a small painted panorama, not a
// photograph. A dark sky, a band of the track's haze at the horizon, a dark
// floor, one broad white softbox above the camera (the reflection of the key),
// a strip of the rim colour behind, and the sun low behind. 256 x 128 is
// plenty: three blurs it into a 336 x 256 lookup and nothing here is sharp.
// Across the canvas: 0.75 faces the camera, 0.25 is directly behind the rig.
const paintEnvironment = (context, width, height, theme, sunColor) => {
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#05070f');
  sky.addColorStop(0.3, theme.sky);
  sky.addColorStop(0.5, theme.haze);
  sky.addColorStop(0.56, '#141627');
  sky.addColorStop(1, '#05060c');
  context.globalAlpha = 1;
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);
  // Take the horizon band down: it is there to tint, not to light.
  context.fillStyle = 'rgba(6,8,18,0.55)';
  context.fillRect(0, 0, width, height);
  const blob = (u, v, radiusU, radiusV, color, alpha) => {
    // Drawn three times so a blob on the seam wraps around.
    [-1, 0, 1].forEach((wrap) => {
      context.save();
      context.translate((u + wrap) * width, v * height);
      context.scale(radiusU * width, radiusV * height);
      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      context.globalAlpha = alpha;
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(0, 0, 1, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
  };
  blob(0.7, 0.16, 0.2, 0.2, '#ffffff', 1); // softbox, above and camera-left
  blob(0.92, 0.3, 0.07, 0.16, '#dfe9ff', 0.7); // a second, smaller one to the side
  blob(0.36, 0.34, 0.1, 0.2, theme.rim, 0.95); // rim, behind right
  blob(0.14, 0.44, 0.08, 0.1, sunColor, 1); // sun, low behind left
  context.globalAlpha = 1;
};

// Scale to a target size and sit the model's feet on y = 0.
const groundInto = (object3d, targetHeight) => {
  const box = new Box3().setFromObject(object3d);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const scale = targetHeight / Math.max(size.y || 1, 1e-4);
  object3d.scale.setScalar(scale);
  object3d.position.set(-center.x * scale, -(center.y - size.y / 2) * scale, -center.z * scale);
  return { scale, size };
};

// ── grounding ─────────────────────────────────────────────────────────────
// The height at which a kart actually STANDS, which is not always its lowest
// point. The Ice Sled has a motor strut under the stern that reaches well
// below its runners; grounded on the strut, the sled hovered over the
// platform on a stick.
//
// Whatever a kart stands on is spread out under it: four tyres, two runners.
// A strut, a fin or an exhaust tip is not. So walk the vertices from the
// bottom up and stop at the first height where everything at or below it
// covers CONTACT_SPREAD of the kart's length AND of its width. For a kart on
// wheels that is the bottom of its tyres, within a few millimetres of the
// lowest point, and anything under CONTACT_MIN is treated as no difference at
// all, so those karts stand exactly where they did.
//
// Measured 2026-11-19, in stage units (a kart is 0.72 tall): Ice Sled 0.215,
// Hash Runner 0.022, the other nine under 0.007.
//
// CONTACT_OVERRIDES is the escape hatch for a body this reads wrongly: the
// height to stand on, in stage units above the model's lowest point. Empty
// today; all eleven karts were checked against the measured value.
const CONTACT_SPREAD = 0.5;
const CONTACT_MIN = 0.05;
const CONTACT_OVERRIDES = {};

const contactHeight = (object3d, kartKey) => {
  if (CONTACT_OVERRIDES[kartKey] !== undefined) return CONTACT_OVERRIDES[kartKey];
  const points = [];
  const vertex = new Vector3();
  object3d.updateMatrixWorld(true);
  object3d.traverse((node) => {
    const position = node.isMesh && node.geometry?.attributes?.position;
    if (!position) return;
    for (let index = 0; index < position.count; index += 1) {
      vertex.fromBufferAttribute(position, index).applyMatrix4(node.matrixWorld);
      points.push([vertex.y, vertex.x, vertex.z]);
    }
  });
  if (!points.length) return 0;
  points.sort((a, b) => a[0] - b[0]);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  points.forEach(([, x, z]) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  });
  const needX = (maxX - minX) * CONTACT_SPREAD;
  const needZ = (maxZ - minZ) * CONTACT_SPREAD;
  const floor = points[0][0];
  let lowX = Infinity;
  let highX = -Infinity;
  let lowZ = Infinity;
  let highZ = -Infinity;
  for (const [y, x, z] of points) {
    lowX = Math.min(lowX, x);
    highX = Math.max(highX, x);
    lowZ = Math.min(lowZ, z);
    highZ = Math.max(highZ, z);
    if (highX - lowX >= needX && highZ - lowZ >= needZ) {
      const height = y - floor;
      return height < CONTACT_MIN ? 0 : height;
    }
  }
  return 0;
};

const disposeTree = (root) => {
  root?.traverse?.((node) => {
    if (node.geometry) node.geometry.dispose();
    const material = node.material;
    if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
    else material?.dispose?.();
  });
};

// A model leaving the stage takes its textures with it. disposeTree alone left
// every kart and driver you had tried on in GPU memory until the screen closed.
const disposeModel = (root) => {
  root?.traverse?.((node) => {
    (Array.isArray(node.material) ? node.material : [node.material]).forEach((material) => {
      if (!material) return;
      Object.values(material).forEach((value) => {
        if (value?.isTexture) value.dispose();
      });
    });
  });
  disposeTree(root);
};

// ── platform ──────────────────────────────────────────────────────────────
// Built at radius 1 and scaled to each rig. Top to bottom of the draw order:
//   base   opaque near-black disc. Writes the stencil, not depth, so the
//          mirror image under it can be drawn "through" it and nowhere else.
//   mirror the rig again, upside down under the floor (see mirrorOf).
//   gloss  the visible surface: dark, glossy, about two thirds opaque. It dims the mirror
//          image to a reflection and picks up the environment at a low angle.
//   ring   the lit edge, in the track's rim colour.
//   wall   the side of the platform.
//   glow   the light the ring throws on the ground around the platform.
const PLATFORM_WALL = 0.07;
const GLOW_REACH = 2; // glow radius, in platform radii
const MIRROR_STENCIL = 1;

const makePlatform = (glowTexture) => {
  const group = new Group();
  const disc = new CircleGeometry(1, 64);
  disc.rotateX(-Math.PI / 2);
  const base = new Mesh(
    disc,
    new MeshBasicMaterial({
      color: '#04060c',
      depthWrite: false,
      stencilFunc: AlwaysStencilFunc,
      stencilRef: MIRROR_STENCIL,
      stencilWrite: true,
      stencilZPass: ReplaceStencilOp,
    })
  );
  base.renderOrder = -3;
  const gloss = new Mesh(
    disc,
    new MeshStandardMaterial({ color: '#4a557f', depthWrite: false, metalness: 0.1, opacity: 0.64, roughness: 0.3, transparent: true })
  );
  gloss.position.y = 0.001;
  gloss.renderOrder = 1;
  const ringGeometry = new RingGeometry(0.962, 1, 64);
  ringGeometry.rotateX(-Math.PI / 2);
  const ring = new Mesh(ringGeometry, new MeshBasicMaterial({ toneMapped: false }));
  ring.position.y = 0.004;
  const wall = new Mesh(
    new CylinderGeometry(1, 1.03, PLATFORM_WALL, 64, 1, true),
    new MeshStandardMaterial({ color: '#161c30', metalness: 0.6, roughness: 0.38 })
  );
  wall.position.y = -PLATFORM_WALL / 2;
  const glowGeometry = new RingGeometry(1, GLOW_REACH, 64);
  glowGeometry.rotateX(-Math.PI / 2);
  const glow = new Mesh(
    glowGeometry,
    new MeshBasicMaterial({ blending: AdditiveBlending, depthWrite: false, map: glowTexture, opacity: 0.55, toneMapped: false, transparent: true })
  );
  glow.position.y = -PLATFORM_WALL;
  group.add(base, gloss, ring, wall, glow);
  return { glow, group, ring };
};

// The reflection: the same meshes again, flipped under the floor by the group
// they are put in. Geometry and textures are shared with the model on the
// stage; only the materials are copies, because they need the stencil test
// that keeps the image inside the platform top. Two more draw calls, no
// render target, no second pass.
const mirrorOf = (object3d) => {
  const copy = object3d.clone(true);
  const mirrorMaterial = (material) => {
    const mirrored = material.clone();
    mirrored.stencilFunc = EqualStencilFunc;
    mirrored.stencilRef = MIRROR_STENCIL;
    mirrored.stencilWrite = true;
    return mirrored;
  };
  copy.traverse((node) => {
    if (!node.isMesh) return;
    node.material = Array.isArray(node.material) ? node.material.map(mirrorMaterial) : mirrorMaterial(node.material);
    node.renderOrder = -2;
  });
  return copy;
};

const ABOVE_FLOOR = new Plane(new Vector3(0, 1, 0), 0);
const BELOW_FLOOR = new Plane(new Vector3(0, -1, 0), 0);

const DEFAULT_RIG = { halfX: 1, halfZ: 0.6, height: KART_STAGE_HEIGHT * 1.57 };

// The backdrop: the picked track's menu art, out of focus, with its horizon on
// the camera's horizon so the platform sits IN the scene rather than in front
// of a wallpaper. Plain CSS under a transparent canvas, so it costs the GPU
// nothing per frame. Below the art's bottom edge a floor gradient carries on
// to the bottom of the panel; a glow on the horizon lifts the rig's outline
// and a vignette keeps the corners (and the name plate) quiet.
const StageBackdrop = ({ trackKey }) => {
  const theme = themeFor(trackKey);
  const horizon = `${STAGE_HORIZON * 100}%`;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-[#070a14]" data-testid="race-select-stage-backdrop">
      <img
        src={theme.backdrop}
        alt=""
        className="absolute left-[45%] max-w-none"
        style={{
          filter: `blur(4px) ${theme.backdropFilter || 'brightness(0.9)'}`,
          top: horizon,
          transform: `translate(-50%, -${theme.horizon * 100}%)`,
          width: '128%',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ background: `linear-gradient(180deg, ${theme.floor} 0%, rgba(6,8,18,0.9) 78%)`, top: horizon }}
      />
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse 46% 30% at 50% ${horizon}, ${theme.horizonGlow} 0%, transparent 100%)` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_78%_105%_at_50%_46%,transparent_52%,rgba(4,6,14,0.72)_100%)]" />
    </div>
  );
};

// `accent`: the picked character's colour, for the glow around the platform.
// `paint`: the race/progress.js palette entry to preview on the kart body —
// the equipped paint, or a locked one the player is trying on — or null for
// Factory (the GLB as authored).
export const KartModelStage = ({ accent = null, characterKey, kartKey, paint = null, reducedMotion = false, trackKey }) => {
  const hostRef = useRef(null);
  const stageRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const paintRef = useRef(paint);
  paintRef.current = paint;
  // Read by the render loop. A ref, so switching Reduce motion does not tear
  // the stage down: the old stage was rebuilt on every switch and came back
  // EMPTY, because nothing reloaded the models into the new one.
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  // ── mount: renderer, camera, lights, platform, loop ─────────────────────
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    // The canvas is created HERE rather than in JSX, and that is load-bearing.
    // React 18 StrictMode mounts every effect twice in dev; cleanup calls
    // forceContextLoss(), which permanently retires the canvas element it ran
    // on. With a JSX canvas the second mount gets the same dead element and
    // `new WebGLRenderer` throws — the stage came up blank on the first try for
    // exactly this reason. A fresh canvas per mount is safe both ways: the
    // remount gets a live element, and the context still gets released.
    const canvas = document.createElement('canvas');
    canvas.className = 'h-full w-full';
    host.appendChild(canvas);
    let renderer;
    try {
      // stencil: the mirror image under the platform is cut to the platform
      // top with it. three no longer asks for a stencil buffer by default.
      renderer = new WebGLRenderer({ alpha: true, antialias: true, canvas, stencil: true });
    } catch {
      // No WebGL here. Degrades to the backdrop with the name plate rather
      // than an empty box; the picker tiles below still carry the portraits.
      setFailed(true);
      canvas.remove();
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // Done in the material shaders, not as a pass. Neutral leaves colours
    // below about 0.8 alone (so a paint still matches its swatch) and rolls
    // off above it, which is what lets the lights be bright enough for a dark
    // kart without a white one clipping.
    renderer.toneMapping = NeutralToneMapping;
    // For the floor cut on a kart that stands lower than its lowest point.
    renderer.localClippingEnabled = true;

    const scene = new Scene();
    const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.3, 40);

    const turntable = new Group();
    turntable.rotation.y = HERO_YAW;
    scene.add(turntable);
    const mirror = new Group();
    mirror.scale.y = -1;
    turntable.add(mirror);

    // Key: neutral, high, on the camera's side and to its left. Rim and sun:
    // behind the rig on either side, so both edges of it are outlined against
    // the backdrop. Fill: sky and ground, soft, so the shadow side is never
    // black. Four lights, the same number as before.
    const key = new DirectionalLight('#fff3e4', 3.5);
    key.position.set(-2.2, 3.2, 3.4);
    const rim = new DirectionalLight('#5ff0ff', 4.6);
    rim.position.set(3.4, 1.9, -2.3);
    const sun = new DirectionalLight(SUN_FALLBACK, 2.3);
    sun.position.set(-3.4, 1.4, -2.6);
    const fill = new HemisphereLight('#dbe6ff', '#2a2440', 1.5);
    scene.add(key, rim, sun, fill);

    const shadowTexture = makeShadowTexture();
    const shadowGeometry = new CircleGeometry(1, 40);
    shadowGeometry.rotateX(-Math.PI / 2);
    const shadow = new Mesh(shadowGeometry, new MeshBasicMaterial({ depthWrite: false, map: shadowTexture, transparent: true }));
    shadow.position.y = 0.006;
    shadow.renderOrder = 2;
    turntable.add(shadow);

    const glowTexture = makeGlowTexture();
    const platform = makePlatform(glowTexture);
    scene.add(platform.group);

    const [environmentCanvas, environmentContext] = makeCanvas(256, 128);
    const environmentSource = new CanvasTexture(environmentCanvas);
    environmentSource.mapping = EquirectangularReflectionMapping;
    environmentSource.colorSpace = SRGBColorSpace;
    const pmrem = new PMREMGenerator(renderer);
    let environmentTarget = null;

    const paintUniform = createStagePaintUniform();
    setStagePaint(paintUniform, paintRef.current);
    const stage = {
      camera,
      mirror,
      models: {},
      paintUniform,
      platform,
      popAt: 0,
      renderer,
      rig: DEFAULT_RIG,
      rim,
      scene,
      shadow,
      sun,
      turntable,
    };

    // Fit the camera to the rig on the stage: as large as FILL_HEIGHT and
    // FILL_WIDTH allow, at the widest the rig gets across its sway.
    stage.frame = () => {
      const { halfX, halfZ, height } = stage.rig;
      const tanHalf = Math.tan((CAMERA_FOV * Math.PI) / 360);
      const halfWidth = Math.max(
        ...[HERO_YAW - SWAY, HERO_YAW, HERO_YAW + SWAY].map((yaw) => Math.abs(halfX * Math.cos(yaw)) + Math.abs(halfZ * Math.sin(yaw)))
      );
      const distance = Math.max(height / 2 / (tanHalf * FILL_HEIGHT), halfWidth / (tanHalf * camera.aspect * FILL_WIDTH));
      camera.position.set(0, height * CAMERA_HEIGHT, distance);
      camera.lookAt(0, height * CAMERA_TARGET, 0);
    };

    // Relight for a track: light colours, platform colours and the
    // environment map. Runs on mount and on every track change.
    stage.relight = (trackKey, accent) => {
      const theme = themeFor(trackKey);
      const sunColor = sunColorFor(trackKey);
      rim.color.set(theme.rim);
      sun.color.set(sunColor);
      platform.ring.material.color.set(theme.rim);
      platform.glow.material.color.set(accent || theme.glow);
      paintEnvironment(environmentContext, 256, 128, theme, sunColor);
      environmentSource.needsUpdate = true;
      const previous = environmentTarget;
      environmentTarget = pmrem.fromEquirectangular(environmentSource);
      scene.environment = environmentTarget.texture;
      previous?.dispose();
    };
    stageRef.current = stage;

    const resize = () => {
      const width = canvas.clientWidth || 1;
      const height = canvas.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.setViewOffset(width, height, -RIG_SHIFT * width, 0, width, height);
      stage.frame();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let swayClock = 0;
    const tick = (nowMs) => {
      const dt = Math.min(0.05, (nowMs - last) / 1000);
      last = nowMs;
      const still = reducedMotionRef.current;
      // Idle: a slow sway either side of the hero angle. Under Reduce motion
      // the rig eases back to the hero angle and stays there.
      if (!still) swayClock += dt;
      const yaw = still ? HERO_YAW : HERO_YAW + SWAY * Math.sin((swayClock * Math.PI * 2) / SWAY_SECONDS);
      turntable.rotation.y += (yaw - turntable.rotation.y) * Math.min(1, dt * 6);
      // Selection pop: a short spring on scale, so changing your pick is
      // something the stage DOES, not something it displays. Skipped under
      // Reduce motion.
      const since = (nowMs - stage.popAt) / 1000;
      if (stage.popAt && since < 0.6 && !still) {
        const decay = Math.exp(-since * 7);
        turntable.scale.setScalar(1 + 0.11 * decay * Math.cos(since * 26));
      } else if (stage.popAt) {
        turntable.scale.setScalar(1);
        stage.popAt = 0;
      }
      renderer.render(scene, camera);
      // Published so a headless gate can prove the stage is LIVE. A canvas
      // that mounted but never loaded a model, or loaded one and stopped
      // rendering, is indistinguishable from a working one via the DOM — and
      // navigator.webdriver skips this screen entirely, so nothing else here
      // is ever exercised by the existing harnesses.
      if (DEBUG_HOOKS && typeof window !== 'undefined') {
        window.__comebackCityKartSelectStage = {
          characterLoaded: Boolean(stage.models.character),
          drawCalls: renderer.info.render.calls,
          frames: (window.__comebackCityKartSelectStage?.frames || 0) + 1,
          kartLoaded: Boolean(stage.models.kart),
          paintAmount: stage.paintUniform.value.w,
          triangles: renderer.info.render.triangles,
          yaw: turntable.rotation.y,
        };
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      // Before renderer.dispose(): the shared textures (three's DFG lookup,
      // cached GLB maps) would otherwise keep this stage's renderer alive
      // once per trip through the menu. See releaseTextures.js.
      const rendererTextures = collectRendererTextures(renderer, scene);
      disposeTree(scene);
      shadowTexture.dispose();
      glowTexture.dispose();
      environmentSource.dispose();
      environmentTarget?.dispose();
      pmrem.dispose();
      renderer.dispose();
      disposeTextures(rendererTextures);
      // Menus mount and unmount repeatedly and browsers cap live WebGL
      // contexts (~16). Without this the race can boot into a lost context
      // after a few trips through the select screen.
      renderer.forceContextLoss?.();
      canvas.remove();
      stageRef.current = null;
    };
  }, []);

  // ── track change: relight ───────────────────────────────────────────────
  useEffect(() => {
    stageRef.current?.relight(trackKey, accent);
  }, [accent, trackKey]);

  // ── selection change: swap the models ───────────────────────────────────
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    let cancelled = false;
    const loader = createGameGltfLoader();
    const characterUrl = SELECT_CHARACTER_MODELS[characterKey];
    const kartUrl = SELECT_KART_MODELS[kartKey];

    const load = (url) =>
      url
        ? new Promise((resolve) => loader.load(url, (gltf) => resolve(gltf.scene), undefined, () => resolve(null)))
        : Promise.resolve(null);

    Promise.all([load(characterUrl), load(kartUrl)]).then(([characterScene, kartScene]) => {
      // stageRef, not just "a stage exists": StrictMode's first mount is torn
      // down while its models are still loading, and they must not land in
      // the second mount's scene from here.
      if (cancelled || stageRef.current !== stage) return;
      Object.values(stage.models).forEach((model) => {
        model.parent?.remove(model);
        disposeModel(model);
      });
      stage.models = {};
      if (!characterScene && !kartScene) {
        setFailed(true);
        return;
      }
      setFailed(false);

      // Owner call 2026-08-07: "the character should go inside it". So the two
      // models are one rig now, seated the way the race seats them — the avatar
      // is a STANDING figure sunk into the body and pitched forward, which is
      // exactly what mountDriverAvatar does in the monolith ("an avatar
      // standing behind a steering wheel" vs "a driver reaching for it").
      //
      // The lean is applied to a seat group OUTSIDE the avatar's own yaw, and
      // that is load-bearing for the same reason it is in the race: every Tripo
      // avatar carries a ±90° yaw, so an X rotation on the avatar itself is a
      // ROLL, and the figure would tip sideways out of the seat.
      const kartHeight = KART_STAGE_HEIGHT;
      const rigBox = new Box3();
      let footprint = null;
      let sink = 0;
      if (kartScene) {
        kartScene.rotation.y = KART_NOSE_YAW[kartKey] ?? -Math.PI / 2;
        groundInto(kartScene, KART_STAGE_HEIGHT);
        footprint = new Box3().setFromObject(kartScene);
        // Stand the kart on what touches the floor (see contactHeight). Zero
        // for every kart on wheels; the Ice Sled drops until its runners are
        // on the platform and its strut is under it.
        sink = contactHeight(kartScene, kartKey);
        kartScene.position.y -= sink;
        footprint.translate(new Vector3(0, -sink, 0));
        footprint.min.y = 0;
        rigBox.union(footprint);
        stage.models.kart = kartScene;
      }
      if (characterScene) {
        const yaw = KART_CHARACTER_YAW[characterKey];
        if (yaw !== undefined) characterScene.rotation.y = yaw;
        groundInto(characterScene, kartHeight * DRIVER_HEIGHT_RATIO);
        const seat = new Group();
        seat.rotation.x = DRIVER_LEAN;
        // Feet inside the shell, torso and head clear of it. Centred rather
        // than pushed back: without frames I can judge, a driver in the middle
        // of the kart reads correctly from every angle the turntable shows,
        // and an offset guessed blind does not.
        seat.position.y = kartHeight * DRIVER_SEAT_DEPTH - sink;
        // A rebuilt kart says where its seat is: an empty node `seat_mount`
        // in the file (scripts/blender/kart-revamp/README.md), the same node
        // the race reads. The driver goes over it instead of over the middle
        // of the kart, which on a rear-seated body left a gap to the seat back.
        const seatMount = kartScene?.getObjectByName('seat_mount');
        if (seatMount) {
          kartScene.updateMatrixWorld(true);
          const seatAt = seatMount.getWorldPosition(new Vector3());
          seat.position.x = seatAt.x;
          seat.position.z = seatAt.z;
        }
        seat.add(characterScene);
        rigBox.union(new Box3().setFromObject(seat));
        stage.models.character = seat;
      }
      // Mirror copies first: they clone the materials, and must do it before
      // the paint hook marks the originals as done.
      const models = Object.values(stage.models);
      const mirrors = models.map(mirrorOf);
      models.forEach((model) => stage.turntable.add(model));
      mirrors.forEach((model, index) => {
        stage.mirror.add(model);
        stage.models[`mirror${index}`] = model;
      });
      if (kartScene) [kartScene, mirrors[0]].forEach((model) => applyStagePaint(model, stage.paintUniform));
      // Whatever now hangs below the floor is cut off at it, on the kart and
      // on its mirror image, so no strut shows through the platform or pokes
      // up out of the reflection.
      if (kartScene && sink > 0) {
        [
          [kartScene, ABOVE_FLOOR],
          [mirrors[0], BELOW_FLOOR],
        ].forEach(([model, plane]) =>
          model.traverse((node) => {
            if (!node.isMesh) return;
            (Array.isArray(node.material) ? node.material : [node.material]).forEach((material) => {
              material.clippingPlanes = [plane];
            });
          })
        );
      }

      // Measured rig: the camera, the platform and the shadow all take their
      // size from what is actually on the stage.
      footprint = footprint || rigBox;
      const half = (box, axis) => Math.max(Math.abs(box.min[axis]), Math.abs(box.max[axis]));
      stage.rig = { halfX: half(rigBox, 'x'), halfZ: half(rigBox, 'z'), height: rigBox.max.y };
      stage.shadow.scale.set(half(footprint, 'x') * 1.2, 1, half(footprint, 'z') * 1.3);
      const radius = Math.hypot(half(footprint, 'x'), half(footprint, 'z')) * 1.12;
      stage.platform.group.scale.set(radius, 1, radius);
      stage.frame();
      stage.popAt = performance.now();
    });

    return () => {
      cancelled = true;
    };
  }, [characterKey, kartKey]);

  // ── paint change: one uniform write, plus the selection pop ─────────────
  const paintTint = paint?.tint || null;
  const paintAmount = paint?.amount ?? 0;
  const shownPaintRef = useRef(paintTint);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    setStagePaint(stage.paintUniform, paintTint ? { amount: paintAmount, tint: paintTint } : null);
    if (shownPaintRef.current !== paintTint && stage.models.kart) stage.popAt = performance.now();
    shownPaintRef.current = paintTint;
  }, [paintAmount, paintTint]);

  return (
    <div className="relative h-full w-full">
      <StageBackdrop trackKey={trackKey} />
      <div
        ref={hostRef}
        className="absolute inset-0"
        data-testid="race-select-stage"
        data-stage-failed={failed ? '1' : '0'}
      />
    </div>
  );
};

export default KartModelStage;
