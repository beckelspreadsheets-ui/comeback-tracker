import * as THREE from 'three';

export const RACE_RENDERER_OPTIONS = Object.freeze({
  antialias: false,
  depth: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: false,
});

export const RACE_RENDER_SCALE = Object.freeze({
  desktop: 0.92,
  mobile: 0.86,
});

export const configureRaceRenderer = (renderer) => {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = false;
  return renderer;
};

export const createRaceRenderer = ({
  canvas,
  consoleRef = console,
  onUnavailable = null,
  RendererClass = THREE.WebGLRenderer,
} = {}) => {
  try {
    return configureRaceRenderer(
      new RendererClass({
        ...RACE_RENDERER_OPTIONS,
        canvas,
      })
    );
  } catch (error) {
    consoleRef?.warn?.('Comeback City race WebGL renderer unavailable, using 2D fallback:', error);
    onUnavailable?.(error);
    return null;
  }
};

export const fitRaceRendererToCanvas = ({
  camera,
  canvas,
  raceViewport,
  renderer,
  windowRef = globalThis.window,
} = {}) => {
  const rect = canvas.getBoundingClientRect();
  raceViewport.width = Math.max(1, rect.width || 1);
  raceViewport.height = Math.max(1, rect.height || 1);
  raceViewport.mobile = raceViewport.width / raceViewport.height < 0.74;
  const rawDpr = Math.min(windowRef?.devicePixelRatio || 1, 2);
  const renderScale = raceViewport.mobile ? RACE_RENDER_SCALE.mobile : RACE_RENDER_SCALE.desktop;
  const dpr = Math.max(0.75, rawDpr * renderScale);
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  const previousDpr = raceViewport.dpr;
  const previousAspect = raceViewport.aspect;
  raceViewport.dpr = dpr;
  raceViewport.rawDpr = rawDpr;
  raceViewport.renderScale = renderScale;
  raceViewport.aspect = Math.max(0.1, rect.width / Math.max(1, rect.height));
  if (previousDpr !== dpr) renderer.setPixelRatio(dpr);
  if (canvas.width !== width || canvas.height !== height) {
    renderer.setSize(rect.width, rect.height, false);
  }
  if (camera.aspect !== raceViewport.aspect || previousAspect !== raceViewport.aspect) {
    camera.aspect = raceViewport.aspect;
    camera.updateProjectionMatrix();
  }
  return rect;
};

export const createRaceSceneShell = ({ theme = {} } = {}) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.sky || '#59c6ed');
  scene.fog = new THREE.Fog(theme.fog || '#bdf6ff', 210, 620);

  const camera = new THREE.PerspectiveCamera(76, 1, 0.25, 620);

  const skyLight = new THREE.HemisphereLight('#fff8cf', '#2085a4', 3.15);
  scene.add(skyLight);

  const sun = new THREE.DirectionalLight('#fff2b9', 3.55);
  sun.position.set(-64, 98, -54);
  sun.castShadow = false;
  scene.add(sun);

  const rim = new THREE.DirectionalLight('#63e6ff', 1.45);
  rim.position.set(84, 52, 76);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);

  return {
    camera,
    rim,
    scene,
    skyLight,
    sun,
    world,
  };
};
