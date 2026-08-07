// The select screen's live model stage.
//
// Owner, verbatim: "the menus just need to pop look 3d and really show the
// characters and cars off better than they do instead of look like a nintendo
// waiting screen we want nintendo switch quality."
//
// The diagnosis was in the assets, not the layout: the screen was showing flat
// PNG plates of characters and karts that ALREADY EXIST AS GLBs. Nothing moved,
// nothing was lit, nothing responded — which is what a waiting screen is. So
// this renders the real models, on a turntable, lit with the KEY LIGHT OF THE
// TRACK YOU JUST PICKED, so the menu previews the race instead of sitting
// outside it. Change your track and the light changes with it.
//
// Composition is character BESIDE kart rather than seated in it. Seating needs
// the race's per-character driverHeight/driverYaw rig to land correctly, and a
// driver floating an inch above the seat reads as broken in a way a lineup
// never does. Both models are on one contact-shadow disc and the pair rotates
// together, so you still read them as a set. Easy to switch to seated later.
//
// The turntable is also why exact initial facing is not critical here: the
// measured KART_NOSE_YAW is applied (this project does not guess facings), but
// every side comes past the camera within a few seconds regardless.
import { useEffect, useRef, useState } from 'react';
import {
  Box3,
  CanvasTexture,
  CircleGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { KART_CHARACTERS, KART_NOSE_YAW } from '../game/ComebackCityThreeKartRace.jsx';
import { KART_TRACKS } from '../game/race/tracks/index.js';
import { createGameGltfLoader } from '../game/race/render/gltfLoader.js';
import { SELECT_CHARACTER_MODELS, SELECT_KART_MODELS } from './selectModels.js';

// The track's own key, read off the SHIPPED track palettes rather than
// raceSceneTheme.js — that module is marked LEGACY and the monolith imports
// none of it, so lighting the menu from it would have looked right in code and
// wrong on screen. Intensities are scaled down because the race renderer runs
// its own tone mapping and this stage does not.
const KEY_LIGHT_FALLBACK = { color: '#ffb85a', elevationDeg: 21, intensity: 2.4, rim: '#7eefff' };
const RIM_BY_TRACK = { 'comeback-city': '#7eefff', 'penguin-village': '#bfe4ff' };

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

const keyLightFor = (trackKey) => {
  const track = KART_TRACKS.find((entry) => entry.key === trackKey);
  const palette = track?.palette;
  if (!palette?.sun) return KEY_LIGHT_FALLBACK;
  return {
    azimuthDeg: palette.sun.azimuthDeg,
    color: palette.sunColor || KEY_LIGHT_FALLBACK.color,
    elevationDeg: palette.sun.elevationDeg,
    intensity: Math.min(2.9, (palette.sunIntensity || 4.4) * 0.55),
    rim: RIM_BY_TRACK[trackKey] || KEY_LIGHT_FALLBACK.rim,
  };
};

// A soft round gradient standing in for a contact shadow. A real shadow map
// for two small models on one plane is a lot of GPU for a blur — this reads
// the same and costs one texture.
const makeShadowTexture = () => {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.55)');
  gradient.addColorStop(0.55, 'rgba(0,0,0,0.22)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
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

const disposeTree = (root) => {
  root?.traverse?.((node) => {
    if (node.geometry) node.geometry.dispose();
    const material = node.material;
    if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
    else material?.dispose?.();
  });
};

export const KartModelStage = ({ characterKey, kartKey, reducedMotion = false, trackKey }) => {
  const hostRef = useRef(null);
  const stageRef = useRef(null);
  const [failed, setFailed] = useState(false);

  // ── mount: renderer, camera, lights, loop ───────────────────────────────
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
      renderer = new WebGLRenderer({ alpha: true, antialias: true, canvas });
    } catch {
      // No WebGL here. Degrades to the lit panel with the name plate rather
      // than an empty box; the picker tiles below still carry the portraits.
      setFailed(true);
      canvas.remove();
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new Scene();
    const camera = new PerspectiveCamera(34, 1, 0.1, 100);
    // Framed for ONE seated rig at the origin, not the old two-object lineup.
    camera.position.set(0, 1.02, 3.35);
    camera.lookAt(0, 0.6, 0);

    const turntable = new Group();
    scene.add(turntable);

    const key = new DirectionalLight('#ffb85a', 2.4);
    const rim = new DirectionalLight('#7eefff', 1.9);
    rim.position.set(-2.4, 2.1, -3.2);
    const fill = new HemisphereLight('#cfe6ff', '#1a1533', 0.85);
    scene.add(key, rim, fill);

    const shadowTexture = makeShadowTexture();
    const shadow = new Mesh(
      new CircleGeometry(1.05, 48),
      new MeshBasicMaterial({ depthWrite: false, map: shadowTexture, transparent: true })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    scene.add(shadow);

    const stage = { camera, key, models: {}, popAt: 0, renderer, rim, scene, shadow, shadowTexture, turntable };
    stageRef.current = stage;

    const resize = () => {
      const width = canvas.clientWidth || 1;
      const height = canvas.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let raf = 0;
    let last = performance.now();
    const tick = (nowMs) => {
      const dt = Math.min(0.05, (nowMs - last) / 1000);
      last = nowMs;
      if (!reducedMotion) turntable.rotation.y += dt * 0.42;
      // Selection pop: a short spring on scale plus a yaw kick, so changing
      // your pick is something the stage DOES, not something it displays.
      const since = (nowMs - stage.popAt) / 1000;
      if (stage.popAt && since < 0.6) {
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
      if (typeof window !== 'undefined') {
        window.__comebackCityKartSelectStage = {
          characterLoaded: Boolean(stage.models.character),
          frames: (window.__comebackCityKartSelectStage?.frames || 0) + 1,
          kartLoaded: Boolean(stage.models.kart),
        };
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      disposeTree(scene);
      shadowTexture.dispose();
      renderer.dispose();
      // Menus mount and unmount repeatedly and browsers cap live WebGL
      // contexts (~16). Without this the race can boot into a lost context
      // after a few trips through the select screen.
      renderer.forceContextLoss?.();
      canvas.remove();
      stageRef.current = null;
    };
  }, [reducedMotion]);

  // ── track change: relight ───────────────────────────────────────────────
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const light = keyLightFor(trackKey);
    const azimuth = ((light.azimuthDeg ?? 248) * Math.PI) / 180;
    const elevation = ((light.elevationDeg ?? 21) * Math.PI) / 180;
    const radius = 6;
    stage.key.position.set(
      Math.cos(elevation) * Math.sin(azimuth) * radius,
      Math.max(1.5, Math.sin(elevation) * radius + 2.2),
      Math.cos(elevation) * Math.cos(azimuth) * radius
    );
    stage.key.color = new Color(light.color);
    stage.key.intensity = light.intensity;
    stage.rim.color = new Color(light.rim);
  }, [trackKey]);

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
      if (cancelled || !stageRef.current) return;
      Object.values(stage.models).forEach((model) => {
        stage.turntable.remove(model);
        disposeTree(model);
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
      if (kartScene) {
        kartScene.rotation.y = KART_NOSE_YAW[kartKey] ?? -Math.PI / 2;
        groundInto(kartScene, KART_STAGE_HEIGHT);
        stage.turntable.add(kartScene);
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
        seat.position.y = kartHeight * DRIVER_SEAT_DEPTH;
        seat.add(characterScene);
        stage.turntable.add(seat);
        stage.models.character = seat;
      }
      stage.popAt = performance.now();
    });

    return () => {
      cancelled = true;
    };
  }, [characterKey, kartKey]);

  return (
    <div
      ref={hostRef}
      className="h-full w-full"
      data-testid="race-select-stage"
      data-stage-failed={failed ? '1' : '0'}
    />
  );
};

export default KartModelStage;
