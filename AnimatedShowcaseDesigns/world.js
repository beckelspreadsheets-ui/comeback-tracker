import * as THREE from "./vendor/three/three.module.min.js";
import { growthExhibits, stations } from "./world-data.js?v=higgsfield-blender-world-20260620-4";
import { cameraForViewport, layoutForViewport, roomLayout, worldReconstruction } from "./world-layout.js?v=higgsfield-blender-world-20260620-4";

const params = new URLSearchParams(window.location.search);
const qaMode = params.get("qa") === "1";
const verifyMode = params.get("verifyMode") === "1";
const calibrationMode = params.get("calibrate") === "1" && isLocalhost();
const referenceViewAllowed = params.get("referenceView") === "1" && !qaMode && !calibrationMode && !stationIdIsValid(params.get("inspect"));
const renderedWorld = document.getElementById("renderedWorld");
const worldCanvas = document.getElementById("worldCanvas");
const screenOverlayLayer = document.getElementById("screenOverlayLayer");
const qualityPill = document.getElementById("qualityPill");
const fullscreenButton = document.getElementById("fullscreenButton");
const panelToggleButton = document.getElementById("panelToggleButton");
const stationPanel = document.querySelector(".station-panel");
const stationPanelBody = document.getElementById("stationPanelBody");
const stationList = document.getElementById("stationList");
const walkControls = document.getElementById("walkControls");
const stationTitle = document.getElementById("stationTitle");
const stationDescription = document.getElementById("stationDescription");
const growthList = document.getElementById("growthList");
const openLiveButton = document.getElementById("openLiveButton");
const caseStudyButton = document.getElementById("caseStudyButton");
const inspectHint = document.getElementById("inspectHint");
const screenViewer = document.getElementById("screenViewer");
const screenViewerTitle = document.getElementById("screenViewerTitle");
const screenViewerClose = document.getElementById("screenViewerClose");
const screenViewerScroll = document.getElementById("screenViewerScroll");
const screenViewerImage = document.getElementById("screenViewerImage");
const screenViewerScrollUp = document.getElementById("screenViewerScrollUp");
const screenViewerScrollDown = document.getElementById("screenViewerScrollDown");
const screenViewerFullscreen = document.getElementById("screenViewerFullscreen");
const screenViewerLive = document.getElementById("screenViewerLive");
const cinematicIntro = document.getElementById("cinematicIntro");
const cinematicIntroVideo = document.getElementById("cinematicIntroVideo");
const cinematicIntroSkip = document.getElementById("cinematicIntroSkip");
const calibrationPanel = document.getElementById("calibrationPanel");
const fallback = document.getElementById("fallback");
const fallbackMessage = document.getElementById("fallbackMessage");
const tryAnywayButton = document.getElementById("tryAnywayButton");

const MODE_STORAGE_KEY = "showcase-mode-preference";
const INTRO_SESSION_KEY = "showcase-world-rendered-intro-seen-v1";
const VIEW_SCROLL_STEP = 220;
const STATION_SLOT_ORDER = ["left", "center", "right"];
const WEBSITE_TEXTURE_HEIGHT = 1400;
const WEBSITE_TEXTURE_MIN_WIDTH = 360;
const WEBSITE_MATTE_COLOR = "#f5ead8";
const INPUT_VECTOR = {
  up: { x: 0, z: -1 },
  down: { x: 0, z: 1 },
  left: { x: -1, z: 0 },
  right: { x: 1, z: 0 }
};

let selectedStationId = stationIdIsValid(params.get("station")) ? params.get("station") : stations[0].id;
let activeSlots = {};
let currentLayoutKey = "";
let currentPoseName = "";
let inspectionOpen = false;
let qaPanel = null;
let renderer = null;
let scene = null;
let camera = null;
let frameMeshes = new Map();
let frameMaterials = new Map();
let reconstructionShellMeshes = new Set();
let stationTextures = new Map();
let blenderCoverWebsiteTextures = new Map();
let screenFitDiagnostics = {};
let plateTextures = new Map();
let materialTextures = new Map();
let referenceBackdrop = null;
let renderCount = 0;
let renderQueued = false;
let animationFrame = 0;
let lastFrameTime = 0;
let pointerLook = null;
let hadManualMovement = false;
const shellOpacityMaterials = new Set();
const RESTING_SHELL_OPACITY_SCALE = 1;
let referenceViewActive = referenceViewAllowed;
let verifierFrameVisibilityOverride = null;
let calibrationState = {
  target: "desktopHero"
};

const player = {
  position: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  input: { forward: 0, strafe: 0 },
  activeControlPointers: new Map()
};

const BACKDROP_DISTANCE = 7.2;

if (params.get("lite") === "1") {
  setModePreference(null);
  exposeModePreferenceForVerifier();
  window.location.replace("/?lite=1");
} else {
  startWorld();
}

function startWorld() {
  document.documentElement.setAttribute("data-engine", "blender-reconstruction");
  document.documentElement.setAttribute("data-world-layout-version", roomLayout.version);
  document.documentElement.toggleAttribute("data-calibrate", calibrationMode);
  document.documentElement.toggleAttribute("data-reduced-motion", hasReducedMotion());
  document.documentElement.toggleAttribute("data-verify-mode", verifyMode);
  syncReferenceView();
  setModePreference("world");
  exposeModePreferenceForVerifier();

  if (qualityPill) {
    qualityPill.textContent = referenceViewActive ? "Reference view" : calibrationMode ? "Calibration" : hasReducedMotion() ? "Manual 3D" : "Blender calibrated";
  }

  renderGrowthList();
  renderStationList();
  updateStationPanel();

  try {
    initThreeWorld();
  } catch (error) {
    console.error(error);
    showFallback("The 3D reconstruction could not start on this device.", true);
    return;
  }

  bindEvents();
  syncReferenceView();
  renderRoomScreens();
  setupQaPanel();
  setupCalibration();
  exposeWorldApi();
  exposeRuntimeMetrics();
  setupCinematicIntro();
  setupInitialInspection();
  runVerifierProbes();
  requestRender();

  if (isLocalhost() && params.get("simulateContextLoss") === "1") {
    showFallback("The local verification hook simulated a graphics context loss.", true);
  }

  track("mode_enter_world", {
    engine: "blender-reconstruction",
    layout: roomLayout.version,
    calibration: calibrationMode
  });
}

function bindEvents() {
  window.addEventListener("resize", handleResize);
  fullscreenButton?.addEventListener("click", toggleWorldFullscreen);
  panelToggleButton?.addEventListener("click", () => syncStationPanelMode(stationPanel?.classList.contains("is-compact")));
  bindWalkControls();
  openLiveButton?.addEventListener("click", () => openLiveSite(selectedStation()));
  caseStudyButton?.addEventListener("click", openSelectedCaseStudy);
  inspectHint?.addEventListener("click", () => enterInspection(selectedStation()));
  screenViewerClose?.addEventListener("click", () => exitInspection());
  screenViewerScrollUp?.addEventListener("click", () => scrollActiveScreenBy(-VIEW_SCROLL_STEP));
  screenViewerScrollDown?.addEventListener("click", () => scrollActiveScreenBy(VIEW_SCROLL_STEP));
  screenViewerFullscreen?.addEventListener("click", toggleInspectionFullscreen);
  screenViewerLive?.addEventListener("click", () => openLiveSite(selectedStation()));
  tryAnywayButton?.addEventListener("click", () => {
    fallback.hidden = true;
    requestRender();
  });

  window.addEventListener("keydown", handleGlobalKeyDown);
  window.addEventListener("keyup", handleGlobalKeyUp);
  window.addEventListener("blur", clearMovementInput);
  window.addEventListener("popstate", handleHistoryPop);
  setupWorldLookControls();

  for (const link of document.querySelectorAll("[data-static-link]")) {
    link.addEventListener("click", () => {
      setModePreference("static");
      track("mode_return_static", { source: "world" });
    });
  }
}

function initThreeWorld() {
  renderer = new THREE.WebGLRenderer({ canvas: worldCanvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setClearColor(0x15110d, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(pixelRatioCap());

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15110d);
  camera = new THREE.PerspectiveCamera(52, 1, 0.05, 90);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  const ambient = new THREE.HemisphereLight(0xfff1d0, 0x23180f, 3.1);
  scene.add(ambient);
  const mainLight = new THREE.DirectionalLight(0xffd08a, 3.4);
  mainLight.position.set(0.5, 2.8, 1.2);
  scene.add(mainLight);
  const frameLight = new THREE.PointLight(0xffb65a, 13, 7.5, 1.8);
  frameLight.position.set(0, 2.35, -1.3);
  scene.add(frameLight);

  applyViewportCamera({ force: true });
  buildReconstructionMeshes();
  buildReferenceBackdrop();
  loadReferencePlateTextures();
  loadStationTextures();
  handleResize();
}

function pixelRatioCap() {
  const mobile = window.innerHeight > window.innerWidth || window.innerWidth < 760;
  return Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75);
}

function buildReconstructionMeshes() {
  const solidShellLayer = { transparent: false, depthWrite: true };
  const glassShellLayer = { transparent: true, depthWrite: false };
  const materialPaths = worldReconstruction.materials || {};
  const wallAlbedo = loadMaterialTexture("wall-albedo", materialPaths.wall?.albedo, THREE.SRGBColorSpace, 1.35, 1.05);
  const wallNormal = loadMaterialTexture("wall-normal", materialPaths.wall?.normal, THREE.NoColorSpace, 2.2, 1.2);
  const wallRoughness = loadMaterialTexture("wall-roughness", materialPaths.wall?.roughness, THREE.NoColorSpace, 2.2, 1.2);
  const floorAlbedo = loadMaterialTexture("floor-albedo", materialPaths.floor?.albedo, THREE.SRGBColorSpace, 1.45, 1.25);
  const floorRoughness = loadMaterialTexture("floor-roughness", materialPaths.floor?.roughness, THREE.NoColorSpace, 2.4, 2.4);
  const floorReflectionMask = loadMaterialTexture("floor-reflection-mask", materialPaths.floor?.reflectionMask, THREE.NoColorSpace, 1, 1);
  const frameMetalRoughness = loadMaterialTexture("frame-metal-roughness", materialPaths.frameMetal?.roughness, THREE.NoColorSpace, 1, 1);
  const glassReflectionMask = loadMaterialTexture("glass-reflection-mask", materialPaths.glass?.reflectionMask, THREE.NoColorSpace, 1, 1);
  const wallWashMask = loadMaterialTexture("wall-wash-mask", materialPaths.lighting?.wallWashMask, THREE.NoColorSpace, 1, 1);
  const materials = {
    wall: registerShellMaterial(new THREE.MeshStandardMaterial({
      ...solidShellLayer,
      color: 0xb19b84,
      map: wallAlbedo,
      bumpMap: wallNormal,
      bumpScale: 0.035,
      roughnessMap: wallRoughness,
      roughness: 0.88,
      metalness: 0.02,
      opacity: 1
    }), 1),
    floor: registerShellMaterial(new THREE.MeshStandardMaterial({
      ...solidShellLayer,
      color: 0x685142,
      map: floorAlbedo,
      roughnessMap: floorRoughness,
      roughness: 0.34,
      metalness: 0.16,
      opacity: 1
    }), 1),
    ceiling: registerShellMaterial(new THREE.MeshStandardMaterial({ ...solidShellLayer, color: 0x3f372f, roughness: 0.78, opacity: 1 }), 1),
    metal: registerShellMaterial(new THREE.MeshStandardMaterial({ ...solidShellLayer, color: 0x5a351c, roughnessMap: frameMetalRoughness, roughness: 0.42, metalness: 0.72, opacity: 1 }), 1),
    mullion: registerShellMaterial(new THREE.MeshStandardMaterial({ ...solidShellLayer, color: 0x21150f, roughness: 0.5, metalness: 0.62, opacity: 1 }), 1),
    brass: registerShellMaterial(new THREE.MeshStandardMaterial({ ...solidShellLayer, color: 0xb18247, roughness: 0.36, metalness: 0.78, opacity: 1 }), 1),
    glass: registerShellMaterial(new THREE.MeshStandardMaterial({ ...glassShellLayer, color: 0xa7c7d2, alphaMap: glassReflectionMask, roughness: 0.16, metalness: 0.0, opacity: 0.26, side: THREE.DoubleSide }), 0.26),
    leather: registerShellMaterial(new THREE.MeshStandardMaterial({ ...solidShellLayer, color: 0x3a2b20, roughness: 0.62, metalness: 0.04, opacity: 1 }), 1),
    warm: registerShellMaterial(new THREE.MeshBasicMaterial({ color: 0xffbb6a, map: wallWashMask, transparent: true, opacity: 0.026, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), 0.026),
    reflection: registerShellMaterial(new THREE.MeshBasicMaterial({ color: 0xffb868, map: floorReflectionMask, transparent: true, opacity: 0.006, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), 0.006),
    cityGlass: new THREE.MeshBasicMaterial({ color: 0x253343, transparent: true, opacity: 0.72, depthWrite: false }),
    cityWarm: new THREE.MeshBasicMaterial({ color: 0xffc36a, transparent: true, opacity: 0.82, depthWrite: false }),
    cityCool: new THREE.MeshBasicMaterial({ color: 0xcfd8de, transparent: true, opacity: 0.44, depthWrite: false })
  };

  addBox("Room_Floor", [0, -0.03, 0], [8.8, 0.06, 8.0], materials.floor, { shell: true });
  addBox("Room_Ceiling", [0, 3.02, -0.2], [8.8, 0.08, 8.2], materials.ceiling, { shell: true });
  addGraphiteSlabWall(materials.wall);
  addGraphiteReturnWalls(materials.wall);
  addCityWindowView(materials);
  addBackGlassWall(materials);
  addBox("Wall_Left_Glass_Base", [-4.42, 1.5, 0], [0.12, 3.0, 8.0], materials.glass, { shell: true });
  addBox("Soft_Cove_Main", [0, 2.83, -2.36], [7.2, 0.035, 0.05], materials.warm, { shell: true });
  addBox("Soft_Cove_Left", [-4.05, 2.75, 0], [0.04, 0.035, 6.8], materials.warm, { shell: true });
  addBox("Bench_Center_Leather", [1.55, 0.34, -1.16], [2.35, 0.36, 0.52], materials.leather, { shell: true });
  addBox("Bench_Recessed_Base", [1.55, 0.12, -1.16], [2.0, 0.18, 0.38], materials.metal, { shell: true });

  for (const z of [-2.08, -1.2, -0.3, 0.6, 1.5, 2.4, 3.2]) {
    addBox(`Glass_Mullion_${z}`, [-4.12, 1.45, z], [0.05, 2.62, 0.055], materials.mullion, { shell: true });
  }
  addTrackLights(materials);

  for (const [name, frame] of Object.entries(worldReconstruction.frames)) {
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.48,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
    frameMaterials.set(name, material);
    const mesh = new THREE.Mesh(geometryFromFrame(frame), material);
    mesh.name = frame.objectName;
    mesh.userData.frameName = name;
    scene.add(mesh);
    frameMeshes.set(name, mesh);
    addFrameRails(name, frame, materials.metal, materials.warm);
    addFrameGlass(name, frame, materials.glass);
    addSoftWallWash(name, frame, materials.warm);
    addFloorReflection(name, frame, materials.reflection);
  }
  syncReconstructionShellVisibility();
}

function registerShellMaterial(material, baseOpacity) {
  material.userData.baseOpacity = baseOpacity;
  shellOpacityMaterials.add(material);
  syncShellMaterialOpacity(material);
  return material;
}

function syncShellMaterialOpacity(material = null) {
  const scale = hadManualMovement ? 1 : RESTING_SHELL_OPACITY_SCALE;
  const materials = material ? [material] : shellOpacityMaterials;
  for (const shellMaterial of materials) {
    if (typeof shellMaterial.userData.baseOpacity !== "number") continue;
    shellMaterial.opacity = shellMaterial.userData.baseOpacity * scale;
    shellMaterial.needsUpdate = true;
  }
}

function markManualMovement() {
  if (hadManualMovement) return;
  hadManualMovement = true;
  syncShellMaterialOpacity();
}

function loadMaterialTexture(name, path, colorSpace, repeatX, repeatY) {
  if (!path) return null;
  const url = path.startsWith("/") ? path : `/${path}`;
  const loader = new THREE.TextureLoader();
  const texture = loader.load(url, () => requestRender());
  texture.name = name;
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  materialTextures.set(name, texture);
  return texture;
}

function addGraphiteSlabWall(material) {
  for (const [row, y] of [0.48, 1.22, 1.96, 2.7].entries()) {
    for (const [column, x] of [-0.05, 1.7, 3.45].entries()) {
      const z = -2.82 - ((row + column) % 3 === 0 ? 0.01 : 0);
      addBox(`Wall_Main_Graphite_Slab_${row}_${column}`, [x, y, z], [1.68, 0.7, 0.18], material, { shell: true });
    }
  }
}

function addGraphiteReturnWalls(material) {
  for (const [index, z] of [-2.7, -1.35, 0, 1.35, 2.7].entries()) {
    addBox(`Wall_Right_Graphite_Return_Slab_${index}`, [4.42, 1.5, z], [0.13, 2.9, 1.22], material, { shell: true });
  }
  for (const [index, x] of [-3.3, -1.1, 1.1, 3.3].entries()) {
    addBox(`Wall_Back_Graphite_Return_Slab_${index}`, [x, 1.5, 3.95], [2.1, 2.9, 0.13], material, { shell: true });
  }
}

function addCityWindowView(materials) {
  addBox("City_View_Dusk_Backdrop", [-2.32, 1.48, -2.96], [3.8, 2.55, 0.05], materials.cityGlass, { shell: true });
  const rows = [0.7, 1.0, 1.3, 1.6, 1.9, 2.2];
  const columns = [-3.75, -3.18, -2.61, -2.04, -1.47, -0.9, -0.42];
  for (const [columnIndex, x] of columns.entries()) {
    const towerHeight = 0.8 + (columnIndex % 4) * 0.28;
    addBox(`City_Tower_${columnIndex}`, [x, 0.62 + towerHeight / 2, -2.93], [0.36, towerHeight, 0.045], materials.cityGlass, { shell: true });
    for (const [rowIndex, y] of rows.entries()) {
      if (y > 0.62 + towerHeight || (rowIndex + columnIndex) % 3 === 0) continue;
      const material = (rowIndex + columnIndex) % 2 === 0 ? materials.cityWarm : materials.cityCool;
      addBox(`City_Window_${columnIndex}_${rowIndex}`, [x, y, -2.89], [0.16, 0.035, 0.035], material, { shell: true });
    }
  }
}

function addBackGlassWall(materials) {
  addBox("Back_Glass_Window_Field", [-2.32, 1.5, -2.64], [3.78, 2.8, 0.05], materials.glass, { shell: true });
  for (const [index, x] of [-4.05, -3.28, -2.51, -1.74, -0.97, -0.28].entries()) {
    addBox(`Back_Glass_Mullion_${index}`, [x, 1.45, -2.55], [0.035, 2.62, 0.06], materials.mullion, { shell: true });
  }
  addBox("Back_Glass_Rail", [-2.28, 1.05, -2.52], [3.62, 0.035, 0.065], materials.brass, { shell: true });
  addBox("Back_Glass_Lower_Rail", [-2.28, 0.82, -2.49], [3.62, 0.026, 0.052], materials.brass, { shell: true });
}

function addTrackLights(materials) {
  addBox("Ceiling_Track_Main", [1.65, 2.86, -2.0], [2.8, 0.028, 0.035], materials.brass, { shell: true });
  for (const [index, x] of [0.7, 1.55, 2.4].entries()) {
    addBox(`Ceiling_Track_Head_${index}`, [x, 2.78, -1.88], [0.12, 0.13, 0.08], materials.brass, { shell: true });
  }
}

function addBox(name, center, size, material, options = {}) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(center[0], center[1], center[2]);
  if (options.shell) {
    reconstructionShellMeshes.add(mesh);
    mesh.visible = reconstructionShellVisible();
  } else if (options.visible === false) {
    mesh.visible = false;
  }
  scene.add(mesh);
  return mesh;
}

function geometryFromFrame(frame) {
  return geometryFromCorners(frame.websitePlaneCornersWorld || frame.innerScreenCornersWorld || frame.cornersWorld);
}

function geometryFromCorners(corners) {
  const [tl, tr, br, bl] = corners.map((corner) => new THREE.Vector3(corner[0], corner[1], corner[2]));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    tl.x, tl.y, tl.z,
    tr.x, tr.y, tr.z,
    br.x, br.y, br.z,
    tl.x, tl.y, tl.z,
    br.x, br.y, br.z,
    bl.x, bl.y, bl.z
  ], 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute([
    0, 1,
    1, 1,
    1, 0,
    0, 1,
    1, 0,
    0, 0
  ], 2));
  geometry.computeVertexNormals();
  return geometry;
}

function addFrameRails(name, frame, metalMaterial, warmMaterial) {
  const outerCorners = frame.outerCornersWorld || frame.cornersWorld;
  const xs = outerCorners.map((corner) => corner[0]);
  const ys = outerCorners.map((corner) => corner[1]);
  const z = outerCorners[0][2] + (frame.railDepth || 0.09) * 0.5;
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  addBox(`Frame_${name}_TopRail`, [centerX, maxY + 0.055, z], [width + 0.16, 0.07, 0.08], metalMaterial, { shell: true });
  addBox(`Frame_${name}_BottomRail`, [centerX, minY - 0.055, z], [width + 0.16, 0.07, 0.08], metalMaterial, { shell: true });
  addBox(`Frame_${name}_LeftRail`, [minX - 0.055, centerY, z], [0.07, height + 0.16, 0.08], metalMaterial, { shell: true });
  addBox(`Frame_${name}_RightRail`, [maxX + 0.055, centerY, z], [0.07, height + 0.16, 0.08], metalMaterial, { shell: true });
}

function addFrameGlass(name, frame, material) {
  if (!frame.glassCornersWorld) return;
  const mesh = new THREE.Mesh(geometryFromCorners(frame.glassCornersWorld), material);
  mesh.name = `Frame_${name}_GlassPane`;
  reconstructionShellMeshes.add(mesh);
  mesh.visible = reconstructionShellVisible();
  scene.add(mesh);
}

function addSoftWallWash(name, frame, material) {
  if (!frame.wallWashRegion) return;
  const mesh = new THREE.Mesh(geometryFromCorners(frame.wallWashRegion), material);
  mesh.name = `Soft_Wall_Wash_${name}`;
  reconstructionShellMeshes.add(mesh);
  mesh.visible = reconstructionShellVisible();
  scene.add(mesh);
}

function addFloorReflection(name, frame, material) {
  if (!frame.floorReflectionRegion) return;
  const mesh = new THREE.Mesh(geometryFromCorners(frame.floorReflectionRegion), material);
  mesh.name = `FloorReflection_${name}`;
  reconstructionShellMeshes.add(mesh);
  mesh.visible = reconstructionShellVisible();
  scene.add(mesh);
}

function buildReferenceBackdrop() {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    depthTest: false,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  referenceBackdrop = new THREE.Mesh(geometry, material);
  referenceBackdrop.name = "WorldAnchoredBlenderCalibratedReferenceBackdrop";
  referenceBackdrop.renderOrder = -1000;
  referenceBackdrop.frustumCulled = false;
  referenceBackdrop.visible = false;
  scene.add(referenceBackdrop);
  updateReferenceBackdropFit();
}

function loadReferencePlateTextures() {
  const loader = new THREE.TextureLoader();
  const assets = {
    desktopHero: roomLayout.assets.desktopPlate,
    fullscreenHero: roomLayout.assets.desktopPlate,
    mobileHero: roomLayout.assets.mobilePlateWebp || roomLayout.assets.mobilePlate,
    inspectSelected: roomLayout.assets.inspectPlate
  };
  for (const [poseName, url] of Object.entries(assets)) {
    loader.load(url, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      plateTextures.set(poseName, texture);
      updateReferenceBackdropTexture();
      requestRender();
    });
  }
}

function updateReferenceBackdropTexture() {
  if (!referenceBackdrop) return;
  const texture = plateTextures.get(currentPoseName) || plateTextures.get("desktopHero");
  referenceBackdrop.visible = referenceViewActive && Boolean(texture);
  if (!texture) return;
  referenceBackdrop.material.map = texture;
  referenceBackdrop.material.needsUpdate = true;
  coverTextureToViewport(texture);
}

function coverTextureToViewport(texture) {
  const image = texture.image || {};
  const imageWidth = image.naturalWidth || image.videoWidth || image.width || 1;
  const imageHeight = image.naturalHeight || image.videoHeight || image.height || 1;
  const imageAspect = imageWidth / Math.max(1, imageHeight);
  const viewportAspect = Math.max(0.1, window.innerWidth / Math.max(1, window.innerHeight));

  texture.center.set(0, 0);
  if (viewportAspect < imageAspect) {
    texture.repeat.set(viewportAspect / imageAspect, 1);
  } else {
    texture.repeat.set(1, imageAspect / viewportAspect);
  }
  texture.offset.set((1 - texture.repeat.x) / 2, (1 - texture.repeat.y) / 2);
  texture.needsUpdate = true;
}

function updateReferenceBackdropFit() {
  if (!referenceBackdrop || !camera) return;
  const pose = cameraForViewport(window.innerWidth, window.innerHeight);
  const aspect = Math.max(0.1, window.innerWidth / Math.max(1, window.innerHeight));
  const anchorRotation = new THREE.Euler(pose.pitch, pose.yaw, 0, "YXZ");
  const anchorPosition = new THREE.Vector3(pose.position[0], pose.position[1], pose.position[2]);
  const anchorForward = new THREE.Vector3(0, 0, -1).applyEuler(anchorRotation);
  const anchorCenter = anchorPosition.addScaledVector(anchorForward, BACKDROP_DISTANCE);
  const height = 2 * BACKDROP_DISTANCE * Math.tan(THREE.MathUtils.degToRad(pose.fov) / 2);
  const width = height * aspect;
  referenceBackdrop.position.copy(anchorCenter);
  referenceBackdrop.rotation.copy(anchorRotation);
  referenceBackdrop.scale.set(width, height, 1);
  referenceBackdrop.userData.anchorPoseName = poseNameForViewport(window.innerWidth, window.innerHeight);
  referenceBackdrop.userData.worldAnchored = true;
  referenceBackdrop.userData.distanceMeters = BACKDROP_DISTANCE;
  if (referenceBackdrop.material.map) coverTextureToViewport(referenceBackdrop.material.map);
}

function loadStationTextures() {
  const loader = new THREE.TextureLoader();
  for (const station of stations) {
    loader.load(station.screenshotUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() || 1);
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      stationTextures.set(station.id, texture);
      updateFrameMaterials();
      requestRender();
    });
  }
}

function updateFrameMaterials() {
  activeSlots = stationSlotsForSelection();
  screenFitDiagnostics = {};
  for (const slot of STATION_SLOT_ORDER) {
    const material = frameMaterials.get(slot);
    const station = activeSlots[slot];
    if (!material || !station) continue;
    const fitted = buildBlenderCoverWebsiteTexture(slot, station);
    material.map = fitted?.texture || null;
    if (fitted?.diagnostics) screenFitDiagnostics[slot] = fitted.diagnostics;
    material.color.set(material.map ? 0xffffff : 0x2d343e);
    material.needsUpdate = true;
  }
  syncReferenceFrameVisibility();
}

function buildBlenderCoverWebsiteTexture(slot, station) {
  const sourceTexture = stationTextures.get(station.id);
  const sourceImage = sourceTexture?.image;
  const sourceWidth = sourceImage?.naturalWidth || sourceImage?.videoWidth || sourceImage?.width || 0;
  const sourceHeight = sourceImage?.naturalHeight || sourceImage?.videoHeight || sourceImage?.height || 0;
  const frame = worldReconstruction.frames[slot];
  if (!sourceTexture || !sourceImage || !sourceWidth || !sourceHeight || !frame) return null;

  const frameAspect = websiteFrameAspect(frame);
  const sourceAspect = sourceWidth / sourceHeight;
  const placement = frame.screenPlacement || {};
  const cropAnchor = placement.cropAnchor || { x: 0.5, y: 0.5 };
  const cacheKey = `${slot}:${station.id}:${sourceWidth}x${sourceHeight}:${round(frameAspect, 4)}:${placement.contentMode || "cover"}`;
  const cached = blenderCoverWebsiteTextures.get(cacheKey);
  if (cached) return cached;

  const canvasHeight = WEBSITE_TEXTURE_HEIGHT;
  const canvasWidth = Math.max(WEBSITE_TEXTURE_MIN_WIDTH, Math.round(canvasHeight * frameAspect));
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = WEBSITE_MATTE_COLOR;
  context.fillRect(0, 0, canvasWidth, canvasHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  let drawWidth = canvasWidth;
  let drawHeight = canvasHeight;
  if (sourceAspect > frameAspect) {
    drawHeight = canvasHeight;
    drawWidth = canvasHeight * sourceAspect;
  } else {
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / sourceAspect;
  }
  const drawX = (canvasWidth - drawWidth) * clamp(Number(cropAnchor.x ?? 0.5), 0, 1);
  const drawY = (canvasHeight - drawHeight) * clamp(Number(cropAnchor.y ?? 0.5), 0, 1);
  context.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `blender-cover-${station.id}-${slot}`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  texture.needsUpdate = true;

  const hiddenTop = Math.max(0, -drawY);
  const hiddenBottom = Math.max(0, drawY + drawHeight - canvasHeight);
  const hiddenLeft = Math.max(0, -drawX);
  const hiddenRight = Math.max(0, drawX + drawWidth - canvasWidth);
  const visibleHeight = Math.max(0, Math.min(canvasHeight, drawY + drawHeight) - Math.max(0, drawY));
  const visibleWidth = Math.max(0, Math.min(canvasWidth, drawX + drawWidth) - Math.max(0, drawX));
  const visibleRatio = (visibleWidth * visibleHeight) / (drawWidth * drawHeight);

  const diagnostics = {
    slot,
    stationId: station.id,
    source: station.screenshotUrl,
    contentMode: "blender-cover",
    placementSource: placement.placementSource || "blender-export",
    frameAspect: round(frameAspect, 6),
    sourceAspect: round(sourceAspect, 6),
    cropAnchor: { x: round(Number(cropAnchor.x ?? 0.5), 3), y: round(Number(cropAnchor.y ?? 0.5), 3) },
    canvasSize: { width: canvasWidth, height: canvasHeight },
    sourceSize: { width: sourceWidth, height: sourceHeight },
    drawRect: {
      x: round(drawX, 3),
      y: round(drawY, 3),
      width: round(drawWidth, 3),
      height: round(drawHeight, 3)
    },
    matte: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    },
    coverFillRatio: 1,
    horizontalFillRatio: 1,
    verticalFillRatio: 1,
    horizontalCropRatio: round((hiddenLeft + hiddenRight) / drawWidth, 6),
    verticalCropRatio: round((hiddenTop + hiddenBottom) / drawHeight, 6),
    sourceVisibleRatio: round(visibleRatio, 6),
    aspectDistortion: 0,
    cropped: hiddenTop > 0 || hiddenBottom > 0 || hiddenLeft > 0 || hiddenRight > 0,
    horizontalCrop: hiddenLeft > 0 || hiddenRight > 0,
    verticalCrop: hiddenTop > 0 || hiddenBottom > 0,
    screenPlacement: placement,
    stretched: false
  };
  const fitted = { texture, diagnostics };
  blenderCoverWebsiteTextures.set(cacheKey, fitted);
  return fitted;
}

function websiteFrameAspect(frame) {
  const corners = frame.websitePlaneCornersWorld || frame.innerScreenCornersWorld || frame.cornersWorld;
  const topWidth = distance2d(corners[0], corners[1]);
  const bottomWidth = distance2d(corners[3], corners[2]);
  const leftHeight = distance2d(corners[0], corners[3]);
  const rightHeight = distance2d(corners[1], corners[2]);
  return ((topWidth + bottomWidth) / 2) / Math.max(0.001, (leftHeight + rightHeight) / 2);
}

function distance2d(a, b) {
  return Math.hypot((a?.[0] || 0) - (b?.[0] || 0), (a?.[1] || 0) - (b?.[1] || 0));
}

function renderGrowthList() {
  if (!growthList) return;
  growthList.innerHTML = growthExhibits.map((item) => `
    <div class="growth-item">
      <strong>${escapeHtml(item.displayName)}</strong>
      <span>${escapeHtml(item.headline)}</span>
    </div>
  `).join("");
}

function renderStationList() {
  if (!stationList) return;
  stationList.innerHTML = stations.map((station, index) => `
    <button
      class="station-chip"
      type="button"
      data-station-id="${escapeHtml(station.id)}"
      aria-pressed="false"
      data-index="${index}"
    >
      <strong>${escapeHtml(station.displayName)}</strong>
      <span>${escapeHtml(station.kind === "live" ? "Live site" : "Template")}</span>
    </button>
  `).join("");

  for (const button of stationList.querySelectorAll(".station-chip")) {
    button.addEventListener("click", () => selectStation(button.dataset.stationId));
    button.addEventListener("keydown", handleStationChipKeydown);
  }
}

function updateStationPanel() {
  const station = selectedStation();
  if (!station) return;
  if (stationTitle) stationTitle.textContent = station.displayName;
  if (stationDescription) stationDescription.textContent = station.description;

  for (const button of document.querySelectorAll(".station-chip")) {
    const active = button.dataset.stationId === station.id;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function syncStationPanelMode(expanded) {
  if (!stationPanel || !panelToggleButton) return;
  stationPanel.classList.toggle("is-compact", !expanded);
  panelToggleButton.setAttribute("aria-expanded", expanded ? "true" : "false");
  panelToggleButton.setAttribute("aria-label", expanded ? "Collapse station panel" : "Expand station panel");
  panelToggleButton.querySelector("span").textContent = expanded ? "-" : "+";
  if (expanded) stationPanelBody?.removeAttribute("hidden");
}

function syncReferenceView() {
  document.documentElement.toggleAttribute("data-reference-view", referenceViewActive);
  if (qualityPill) {
    qualityPill.textContent = referenceViewActive
      ? "Reference view"
      : calibrationMode
        ? "Calibration"
        : hasReducedMotion()
          ? "Manual 3D"
          : "Blender calibrated";
  }
  updateReferenceBackdropTexture();
  syncReconstructionShellVisibility();
  syncReferenceFrameVisibility();
}

function reconstructionShellVisible() {
  return calibrationMode || params.get("debugGeometry") === "1" || !referenceViewActive;
}

function syncReconstructionShellVisibility() {
  const visible = reconstructionShellVisible();
  for (const mesh of reconstructionShellMeshes) {
    mesh.visible = visible;
  }
}

function syncReferenceFrameVisibility() {
  for (const mesh of frameMeshes.values()) {
    mesh.visible = verifierFrameVisibilityOverride ?? !referenceViewActive;
  }
}

function setVerifierFrameVisibility(visible) {
  if (!verifyMode) return false;
  verifierFrameVisibilityOverride = Boolean(visible);
  syncReferenceFrameVisibility();
  requestRender();
  return true;
}

function exitReferenceView() {
  if (!referenceViewActive) return;
  referenceViewActive = false;
  syncReferenceView();
  requestRender();
  exposeRuntimeMetrics();
}

function renderRoomScreens() {
  if (!screenOverlayLayer) return;
  activeSlots = stationSlotsForSelection();
  screenOverlayLayer.innerHTML = STATION_SLOT_ORDER.map((slot) => {
    const station = activeSlots[slot];
    if (!station) return "";
    const active = station.id === selectedStationId ? " is-active" : "";
    return `
      <button class="screen-target${active}" type="button" data-slot="${slot}" data-station-id="${escapeHtml(station.id)}" aria-label="Select ${escapeHtml(station.displayName)}">
        <span class="screen-label">${escapeHtml(station.displayName)}</span>
      </button>
    `;
  }).join("");

  for (const button of screenOverlayLayer.querySelectorAll(".screen-target")) {
    button.addEventListener("click", () => selectStation(button.dataset.stationId, { source: "screen" }));
    button.addEventListener("dblclick", (event) => {
      event.preventDefault();
      enterInspection(stationById(button.dataset.stationId));
    });
  }

  updateProjectedHitTargets();
}

function updateProjectedHitTargets() {
  if (!camera || !screenOverlayLayer) return;
  for (const button of screenOverlayLayer.querySelectorAll(".screen-target")) {
    const frame = worldReconstruction.frames[button.dataset.slot];
    if (!frame) continue;
    const corners = projectInnerScreenCorners(frame);
    const visible = corners.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
    button.hidden = !visible;
    if (!visible) continue;
    applyScreenPolygon(button, corners);
  }
}

function applyScreenPolygon(element, corners) {
  const xs = corners.map((point) => point[0]);
  const ys = corners.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const clip = corners.map(([x, y]) => `${round(((x - minX) / width) * 100)}% ${round(((y - minY) / height) * 100)}%`).join(", ");
  Object.assign(element.style, {
    left: `${round(minX)}px`,
    top: `${round(minY)}px`,
    width: `${round(width)}px`,
    height: `${round(height)}px`,
    clipPath: `polygon(${clip})`
  });
}

function projectFrameCorners(frame) {
  return projectInnerScreenCorners(frame);
}

function projectInnerScreenCorners(frame) {
  return (frame.innerScreenCornersWorld || frame.cornersWorld).map((corner) => projectWorldPoint(corner));
}

function projectOuterFrameCorners(frame) {
  return (frame.outerCornersWorld || frame.cornersWorld).map((corner) => projectWorldPoint(corner));
}

function projectWorldPoint(corner) {
  const vector = new THREE.Vector3(corner[0], corner[1], corner[2]);
  vector.project(camera);
  const rect = renderer.domElement.getBoundingClientRect();
  return [
    (vector.x + 1) * 0.5 * rect.width + rect.left,
    (1 - vector.y) * 0.5 * rect.height + rect.top
  ];
}

function stationSlotsForSelection() {
  const index = stations.findIndex((station) => station.id === selectedStationId);
  const safeIndex = index >= 0 ? index : 0;
  const last = stations.length - 1;
  return {
    left: stations[safeIndex === 0 ? last : safeIndex - 1],
    center: stations[safeIndex],
    right: stations[(safeIndex + 1) % stations.length]
  };
}

function selectStation(stationId, options = {}) {
  if (!stationIdIsValid(stationId)) return;
  exitReferenceView();
  selectedStationId = stationId;
  updateStationPanel();
  updateFrameMaterials();
  renderRoomScreens();
  if (inspectionOpen) updateInspectionContent();
  requestRender();
  if (options.source) track("station_hover", { station: stationId, source: options.source });
}

function handleStationChipKeydown(event) {
  const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
  if (!keys.includes(event.key)) return;
  event.preventDefault();
  const buttons = [...stationList.querySelectorAll(".station-chip")];
  const currentIndex = buttons.indexOf(event.currentTarget);
  let nextIndex = currentIndex;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % buttons.length;
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = buttons.length - 1;
  buttons[nextIndex]?.focus();
  selectStation(buttons[nextIndex]?.dataset.stationId);
}

function setupInitialInspection() {
  const inspectId = params.get("inspect");
  if (stationIdIsValid(inspectId)) {
    selectedStationId = inspectId;
    enterInspection(selectedStation(), { pushHistory: false });
  }
}

function enterInspection(station, options = {}) {
  if (!station || !screenViewer) return;
  if (!options.preserveReferenceView) exitReferenceView();
  selectedStationId = station.id;
  inspectionOpen = true;
  document.body.classList.add("is-inspecting");
  screenViewer.hidden = false;
  updateInspectionContent();
  updateStationPanel();
  updateFrameMaterials();
  renderRoomScreens();
  track("station_inspect", { station: station.id });

  if (options.pushHistory !== false && !verifyMode) {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set("inspect", station.id);
    window.history.pushState({ worldInspect: station.id }, "", `${window.location.pathname}?${nextParams.toString()}`);
  }
}

function updateInspectionContent() {
  const station = selectedStation();
  if (!station) return;
  screenViewerTitle.textContent = station.displayName;
  screenViewerImage.src = station.screenshotUrl;
  screenViewerImage.alt = `${station.displayName} website screenshot`;
  screenViewerScroll.scrollTop = 0;
  positionInspectionScreen();
}

function positionInspectionScreen() {
  if (!screenViewer || screenViewer.hidden || !screenViewerScroll) return;
  const rect = screenViewer.getBoundingClientRect();
  const polygon = roomLayout.inspect.screen;
  const points = polygon.map(([x, y]) => [rect.left + x * rect.width, rect.top + y * rect.height]);
  applyInspectionPolygon(screenViewerScroll, points);
}

function applyInspectionPolygon(element, points) {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const clip = points.map(([x, y]) => `${round(((x - minX) / width) * 100)}% ${round(((y - minY) / height) * 100)}%`).join(", ");
  Object.assign(element.style, {
    left: `${round(minX)}px`,
    top: `${round(minY)}px`,
    width: `${round(width)}px`,
    height: `${round(height)}px`,
    clipPath: `polygon(${clip})`
  });
}

function exitInspection(options = {}) {
  if (!inspectionOpen || !screenViewer) return;
  inspectionOpen = false;
  document.body.classList.remove("is-inspecting");
  screenViewer.hidden = true;
  if (options.fromPop !== true && !verifyMode && window.history.state?.worldInspect) {
    window.history.back();
  }
}

function handleHistoryPop() {
  if (inspectionOpen) exitInspection({ fromPop: true });
}

function handleGlobalKeyDown(event) {
  if (event.key === "Escape" && inspectionOpen) {
    event.preventDefault();
    exitInspection();
    return;
  }

  if (inspectionOpen || event.defaultPrevented || isInteractiveTarget(event.target)) return;
  exitReferenceView();
  const key = event.key.toLowerCase();
  let handled = true;
  if (key === "w" || key === "arrowup") player.input.forward = 1;
  else if (key === "s" || key === "arrowdown") player.input.forward = -1;
  else if (key === "a" || key === "arrowleft") player.input.strafe = -1;
  else if (key === "d" || key === "arrowright") player.input.strafe = 1;
  else if (key === "0") resetPlayerPose();
  else handled = false;
  if (!handled) return;
  event.preventDefault();
  markManualMovement();
  ensureMovementLoop();
}

function handleGlobalKeyUp(event) {
  const key = event.key.toLowerCase();
  if ((key === "w" || key === "arrowup") && player.input.forward > 0) player.input.forward = 0;
  if ((key === "s" || key === "arrowdown") && player.input.forward < 0) player.input.forward = 0;
  if ((key === "a" || key === "arrowleft") && player.input.strafe < 0) player.input.strafe = 0;
  if ((key === "d" || key === "arrowright") && player.input.strafe > 0) player.input.strafe = 0;
}

function bindWalkControls() {
  if (!walkControls) return;
  walkControls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-walk]");
    if (!button) return;
    const direction = button.dataset.walk;
    if (direction === "reset") resetPlayerPose();
  });
  walkControls.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-walk]");
    if (!button) return;
    const direction = button.dataset.walk;
    if (direction === "reset") {
      resetPlayerPose();
      return;
    }
    if (!startWalkControl(direction, event.pointerId)) return;
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
  });
  walkControls.addEventListener("mousedown", (event) => {
    const button = event.target.closest("[data-walk]");
    if (!button) return;
    if (button.dataset.walk === "reset") return;
    if (startWalkControl(button.dataset.walk, "mouse")) event.preventDefault();
  });
  window.addEventListener("mouseup", () => {
    stopWalkControl("mouse");
  });
  for (const eventName of ["pointerup", "pointercancel", "pointerleave"]) {
    walkControls.addEventListener(eventName, (event) => {
      stopWalkControl(event.pointerId);
    });
  }
}

function startWalkControl(direction, controlId) {
  const vector = INPUT_VECTOR[direction];
  if (!vector) return false;
  exitReferenceView();
  player.activeControlPointers.set(controlId, vector);
  updateInputFromControlPointers();
  markManualMovement();
  ensureMovementLoop();
  return true;
}

function stopWalkControl(controlId) {
  if (!player.activeControlPointers.has(controlId)) return;
  player.activeControlPointers.delete(controlId);
  updateInputFromControlPointers();
}

function updateInputFromControlPointers() {
  let forward = 0;
  let strafe = 0;
  for (const vector of player.activeControlPointers.values()) {
    forward += -vector.z;
    strafe += vector.x;
  }
  player.input.forward = clamp(forward, -1, 1);
  player.input.strafe = clamp(strafe, -1, 1);
}

function setupWorldLookControls() {
  if (!renderedWorld) return;
  renderedWorld.addEventListener("pointerdown", (event) => {
    if (inspectionOpen || calibrationMode || event.button !== 0 || isInteractiveTarget(event.target)) return;
    exitReferenceView();
    pointerLook = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    renderedWorld.setPointerCapture?.(event.pointerId);
    document.body.classList.add("is-walking");
  });
  window.addEventListener("pointermove", (event) => {
    if (!pointerLook || pointerLook.pointerId !== event.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - pointerLook.x;
    const dy = event.clientY - pointerLook.y;
    pointerLook.x = event.clientX;
    pointerLook.y = event.clientY;
    player.yaw -= dx * 0.003;
    player.pitch = clamp(player.pitch - dy * 0.0024, -0.58, 0.42);
    markManualMovement();
    applyCamera();
    requestRender();
  });
  for (const eventName of ["pointerup", "pointercancel"]) {
    window.addEventListener(eventName, (event) => {
      if (!pointerLook || pointerLook.pointerId !== event.pointerId) return;
      renderedWorld?.releasePointerCapture?.(event.pointerId);
      pointerLook = null;
      document.body.classList.remove("is-walking");
    });
  }
}

function ensureMovementLoop() {
  if (animationFrame) return;
  lastFrameTime = performance.now();
  animationFrame = window.requestAnimationFrame(stepMovement);
}

function stepMovement(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
  lastFrameTime = now;
  const moving = Math.abs(player.input.forward) > 0 || Math.abs(player.input.strafe) > 0;
  if (moving && !inspectionOpen) {
    const speed = worldReconstruction.movement.speedMetersPerSecond;
    const forward = new THREE.Vector3(Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, Math.sin(player.yaw));
    const delta = new THREE.Vector3()
      .addScaledVector(forward, player.input.forward)
      .addScaledVector(right, player.input.strafe);
    if (delta.lengthSq() > 0) {
      delta.normalize().multiplyScalar(speed * dt);
      movePlayerBy(delta.x, delta.z);
      track("world_walk", { x: round(player.position.x), z: round(player.position.z), yaw: round(player.yaw) });
    }
    animationFrame = window.requestAnimationFrame(stepMovement);
  } else {
    animationFrame = 0;
  }
}

function movePlayerBy(deltaX, deltaZ, options = {}) {
  const current = player.position.clone();
  const nextX = resolvePlayerPosition(current.x + deltaX, current.z);
  player.position.x = nextX.x;
  player.position.z = nextX.z;
  const nextZ = resolvePlayerPosition(player.position.x, player.position.z + deltaZ);
  player.position.x = nextZ.x;
  player.position.z = nextZ.z;
  player.position.y = worldReconstruction.movement.cameraHeight.default;
  applyCamera();
  if (!options.silent) {
    requestRender();
    exposeRuntimeMetrics();
  }
  return { before: current.toArray(), after: player.position.toArray() };
}

function resolvePlayerPosition(x, z) {
  const movement = worldReconstruction.movement;
  const radius = movement.playerRadius;
  const bounds = movement.navBounds;
  const clamped = {
    x: clamp(x, bounds.min[0] + radius, bounds.max[0] - radius),
    z: clamp(z, bounds.min[2] + radius, bounds.max[2] - radius)
  };
  for (const blocker of movement.blockers) {
    if (circleIntersectsAabb(clamped.x, clamped.z, radius, blocker)) {
      return { x: player.position.x, z: player.position.z };
    }
  }
  return clamped;
}

function circleIntersectsAabb(x, z, radius, blocker) {
  const nearestX = clamp(x, blocker.min[0], blocker.max[0]);
  const nearestZ = clamp(z, blocker.min[2], blocker.max[2]);
  const dx = x - nearestX;
  const dz = z - nearestZ;
  return dx * dx + dz * dz < radius * radius;
}

function clearMovementInput() {
  player.input.forward = 0;
  player.input.strafe = 0;
  player.activeControlPointers.clear();
}

function resetPlayerPose() {
  applyViewportCamera({ force: true });
  hadManualMovement = false;
  syncShellMaterialOpacity();
  requestRender();
  exposeRuntimeMetrics();
}

function applyViewportCamera(options = {}) {
  const pose = cameraForViewport(window.innerWidth, window.innerHeight);
  currentPoseName = poseNameForViewport(window.innerWidth, window.innerHeight);
  currentLayoutKey = currentPoseName === "mobileHero" ? "mobile" : "desktop";
  if (options.force || !hadManualMovement) {
    player.position.set(pose.position[0], pose.position[1], pose.position[2]);
    player.yaw = pose.yaw;
    player.pitch = pose.pitch;
  }
  applyCamera();
}

function poseNameForViewport(width, height) {
  if (width >= 1800 && height >= 1000 && width >= height) return "fullscreenHero";
  return height > width ? "mobileHero" : "desktopHero";
}

function applyCamera() {
  if (!camera) return;
  const pose = cameraForViewport(window.innerWidth, window.innerHeight);
  camera.fov = pose.fov;
  camera.aspect = Math.max(0.1, window.innerWidth / Math.max(1, window.innerHeight));
  camera.position.copy(player.position);
  camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");
  camera.updateProjectionMatrix();
  updateReferenceBackdropFit();
  updateReferenceBackdropTexture();
}

function handleResize() {
  if (!renderer || !camera) return;
  renderer.setPixelRatio(pixelRatioCap());
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  applyViewportCamera();
  positionInspectionScreen();
  requestRender();
  exposeRuntimeMetrics();
}

function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  window.requestAnimationFrame(renderWorld);
}

function renderWorld() {
  renderQueued = false;
  if (!renderer || !scene || !camera) return;
  renderer.render(scene, camera);
  renderCount += 1;
  updateProjectedHitTargets();
  exposeRuntimeMetrics();
}

function scrollActiveScreenBy(delta) {
  if (!screenViewerScroll || screenViewer.hidden) return;
  screenViewerScroll.scrollBy({ top: delta, behavior: hasReducedMotion() ? "auto" : "smooth" });
  track("station_screenshot_scroll", { station: selectedStationId, delta });
}

function openLiveSite(station) {
  if (!station) return;
  window.open(station.liveUrl, "_blank", "noopener");
  track("station_click_live", { station: station.id, url: station.liveUrl });
}

function openSelectedCaseStudy() {
  const station = selectedStation();
  if (!station) return;
  window.location.href = resolveCaseStudyUrl(station.caseStudyAnchor);
  track("station_click_case_study", { station: station.id, anchor: station.caseStudyAnchor });
}

function resolveCaseStudyUrl(anchor) {
  if (!anchor) return "/";
  if (anchor.startsWith("/")) return anchor;
  return `/${anchor}`;
}

function toggleWorldFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
    return;
  }
  document.documentElement.requestFullscreen?.();
}

function toggleInspectionFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
    return;
  }
  screenViewer?.requestFullscreen?.();
}

function setupCinematicIntro() {
  if (!shouldShowCinematicIntro()) return;
  cinematicIntroVideo.src = roomLayout.assets.introVideo;
  cinematicIntro.hidden = false;
  window.requestAnimationFrame(() => cinematicIntro.classList.add("is-active"));
  cinematicIntroSkip?.addEventListener("click", () => dismissCinematicIntro("button"), { once: true });
  cinematicIntroVideo.addEventListener("ended", () => dismissCinematicIntro("ended"), { once: true });
  window.setTimeout(() => dismissCinematicIntro("auto"), 6500);
  const playPromise = cinematicIntroVideo.play();
  if (playPromise?.catch) playPromise.catch(() => dismissCinematicIntro("autoplay-blocked"));
  track("world_cinematic_intro_show", { asset: "traileranimated12" });
}

function shouldShowCinematicIntro() {
  if (!cinematicIntro || !cinematicIntroVideo) return false;
  if (hasReducedMotion() || qaMode || verifyMode || calibrationMode) return false;
  if (params.get("intro") !== "1") return false;
  try {
    return window.sessionStorage.getItem(INTRO_SESSION_KEY) !== "1";
  } catch {
    return true;
  }
}

function dismissCinematicIntro(source) {
  if (!cinematicIntro || cinematicIntro.hidden) return;
  cinematicIntro.classList.remove("is-active");
  try {
    cinematicIntroVideo.pause();
    window.sessionStorage.setItem(INTRO_SESSION_KEY, "1");
  } catch {}
  window.setTimeout(() => {
    cinematicIntro.hidden = true;
    cinematicIntroVideo.removeAttribute("src");
    cinematicIntroVideo.load();
  }, 440);
  track("world_cinematic_intro_dismiss", { source });
}

function setupCalibration() {
  if (!calibrationMode || !calibrationPanel) return;
  calibrationPanel.hidden = false;
  calibrationPanel.innerHTML = `
    <h2>Blender Calibration</h2>
    <p>Exported frame corners and movement blockers are active.</p>
    <div class="calibration-grid">
      <select id="calibrationTarget">
        <option value="desktopHero">Desktop hero</option>
        <option value="mobileHero">Mobile hero</option>
        <option value="inspectSelected">Inspection</option>
        <option value="fullscreenHero">Fullscreen</option>
      </select>
      <button type="button" id="calibrationCopy">Copy JSON</button>
      <button type="button" id="calibrationReset">Reset Pose</button>
      <button type="button" id="calibrationInspect">Inspect</button>
    </div>
    <textarea id="calibrationOutput" readonly></textarea>
  `;
  const target = document.getElementById("calibrationTarget");
  target.addEventListener("change", () => {
    calibrationState.target = target.value;
    updateCalibrationOutput();
  });
  document.getElementById("calibrationCopy").addEventListener("click", () => copyText(document.getElementById("calibrationOutput").value));
  document.getElementById("calibrationReset").addEventListener("click", resetPlayerPose);
  document.getElementById("calibrationInspect").addEventListener("click", () => enterInspection(selectedStation(), { pushHistory: false }));
  updateCalibrationOutput();
}

function updateCalibrationOutput() {
  const output = document.getElementById("calibrationOutput");
  if (!output) return;
  output.value = JSON.stringify({
    version: worldReconstruction.version,
    camera: calibrationState.target,
    player: playerState(),
    frames: Object.fromEntries(Object.entries(worldReconstruction.frames).map(([slot, frame]) => [slot, {
      cornersWorld: frame.cornersWorld,
      innerScreenCornersWorld: frame.innerScreenCornersWorld,
      outerCornersWorld: frame.outerCornersWorld,
      projectedNow: projectInnerScreenCorners(frame),
      projectedOuterNow: projectOuterFrameCorners(frame),
      exported: frame.verification[calibrationState.target]
    }])),
    movement: worldReconstruction.movement
  }, null, 2);
}

function setupQaPanel() {
  if (!qaMode) return;
  qaPanel = document.createElement("section");
  qaPanel.className = "qa-panel";
  qaPanel.setAttribute("aria-label", "World QA");
  qaPanel.innerHTML = `
    <strong>Blender World QA</strong>
    <span data-qa="route">world running</span>
    <span data-qa="engine">blender-reconstruction</span>
    <span data-qa="layout">${escapeHtml(roomLayout.version)}</span>
    <button type="button" data-qa-copy>Copy report</button>
  `;
  document.body.appendChild(qaPanel);
  qaPanel.querySelector("[data-qa-copy]").addEventListener("click", copyQaReport);
}

async function copyQaReport() {
  await copyText(getQaReport());
}

function getQaReport() {
  return JSON.stringify(getWorldState(), null, 2);
}

function getWorldState() {
  return {
    engine: "blender-reconstruction",
    selectedStationId,
    activeSlots: Object.fromEntries(Object.entries(activeSlots).map(([slot, station]) => [slot, station?.id])),
    inspectionOpen,
    layout: currentLayoutKey,
    layoutVersion: roomLayout.version,
    currentPoseName,
    referenceViewActive,
    referenceBackdrop: referenceBackdrop ? {
      parent: referenceBackdrop.parent === scene ? "scene" : referenceBackdrop.parent === camera ? "camera" : "other",
      visible: referenceBackdrop.visible === true,
      worldAnchored: referenceBackdrop.userData.worldAnchored === true,
      anchorPoseName: referenceBackdrop.userData.anchorPoseName || "",
      distanceMeters: referenceBackdrop.userData.distanceMeters || 0
    } : null,
    player: playerState(),
    frameGeometry: Object.fromEntries(Object.entries(worldReconstruction.frames).map(([slot, frame]) => [slot, {
      stationId: activeSlots[slot]?.id,
      cornersWorld: frame.cornersWorld,
      innerScreenCornersWorld: frame.innerScreenCornersWorld || frame.cornersWorld,
      websitePlaneCornersWorld: frame.websitePlaneCornersWorld || frame.innerScreenCornersWorld || frame.cornersWorld,
      outerCornersWorld: frame.outerCornersWorld || frame.cornersWorld,
      screenPlacement: frame.screenPlacement || null,
      projectedCorners: projectInnerScreenCorners(frame),
      projectedInnerScreenCorners: projectInnerScreenCorners(frame),
      projectedOuterCorners: projectOuterFrameCorners(frame)
    }])),
    screenFit: screenFitDiagnostics,
    movement: {
      navBounds: worldReconstruction.movement.navBounds,
      blockers: worldReconstruction.movement.blockers,
      probe: runMovementProbe({ restore: true })
    },
    alignment: alignmentProbe(),
    calibrating: calibrationMode,
    reducedMotion: hasReducedMotion(),
    fallbackMode: fallback && !fallback.hidden ? "fallback-visible" : "none",
    qa: {
      mode: qaMode,
      verifyMode,
      referenceViewActive,
      render: renderMetrics()
    }
  };
}

function playerState() {
  return {
    position: player.position.toArray().map(round),
    yaw: round(player.yaw),
    pitch: round(player.pitch),
    input: { ...player.input }
  };
}

function alignmentProbe() {
  const poseName = currentPoseName || "desktopHero";
  const pose = worldReconstruction.cameras[poseName];
  const rect = renderer?.domElement.getBoundingClientRect?.() || { left: 0, top: 0, width: pose.verificationSize.width, height: pose.verificationSize.height };
  const scaleX = rect.width / pose.verificationSize.width;
  const scaleY = rect.height / pose.verificationSize.height;
  const frameReports = {};
  let maxError = 0;
  for (const [slot, frame] of Object.entries(worldReconstruction.frames)) {
    const expected = (frame.verification[poseName]?.projectedCorners || []).map(([x, y]) => [
      rect.left + x * scaleX,
      rect.top + y * scaleY
    ]);
    const actual = projectFrameCorners(frame);
    const errors = expected.map((point, index) => distance(point, actual[index]));
    const frameMax = Math.max(...errors, 0);
    maxError = Math.max(maxError, frameMax);
    frameReports[slot] = { expected, actual, errors: errors.map(round), maxError: round(frameMax) };
  }
  const tolerance = poseName === "mobileHero" ? worldReconstruction.overlayTolerance.mobilePx : worldReconstruction.overlayTolerance.desktopPx;
  return {
    poseName,
    tolerance,
    maxError: round(maxError),
    pass: maxError <= tolerance,
    frames: frameReports
  };
}

function distance(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function runMovementProbe(options = {}) {
  if (!player.position.lengthSq()) return { ready: 0, changed: 0, wallBlocked: 0, benchBlocked: 0 };
  const original = {
    position: player.position.clone(),
    yaw: player.yaw,
    pitch: player.pitch
  };
  const before = player.position.clone();
  movePlayerBy(0, -0.35, { silent: true });
  const changed = before.distanceTo(player.position) > 0.05 ? 1 : 0;
  player.position.set(0, worldReconstruction.movement.cameraHeight.default, -1.34);
  movePlayerBy(0, -0.7, { silent: true });
  const wallBlocked = player.position.z >= -1.341 ? 1 : 0;
  player.position.set(0, worldReconstruction.movement.cameraHeight.default, 1.55);
  movePlayerBy(0, -0.7, { silent: true });
  const benchBlocked = player.position.z > 1.45 ? 1 : 0;
  if (options.restore !== false) {
    player.position.copy(original.position);
    player.yaw = original.yaw;
    player.pitch = original.pitch;
    applyCamera();
    requestRender();
  }
  return { ready: 1, changed, wallBlocked, benchBlocked };
}

function runVerifierProbes() {
  if (!verifyMode) return;
  const movement = runMovementProbe({ restore: true });
  document.documentElement.setAttribute("data-world-movement-probe", `ready:${movement.ready};changed:${movement.changed};wallBlocked:${movement.wallBlocked};benchBlocked:${movement.benchBlocked}`);
  const alignment = alignmentProbe();
  document.documentElement.setAttribute("data-world-alignment-probe", `pose:${alignment.poseName};pass:${alignment.pass ? 1 : 0};maxError:${alignment.maxError};tolerance:${alignment.tolerance}`);
}

function exposeWorldApi() {
  window.__showcaseWorld = {
    getState: getWorldState,
    getQaReport,
    copyQaReport,
    selectStation,
    enterInspection: (id = selectedStationId) => enterInspection(stationById(id)),
    exitInspection,
    scrollActiveScreenBy,
    movePlayerBy,
    resetPlayerPose,
    getPlayer: playerState,
    getFrameGeometry: () => worldReconstruction.frames,
    getProjectedFrameCorners: (slot = "center") => projectFrameCorners(worldReconstruction.frames[slot]),
    getProjectedOuterFrameCorners: (slot = "center") => projectOuterFrameCorners(worldReconstruction.frames[slot]),
    runMovementProbe,
    alignmentProbe,
    setVerifierFrameVisibility
  };
}

function exposeRuntimeMetrics() {
  const metrics = renderMetrics();
  const root = document.documentElement;
  root.setAttribute("data-world-render-calls", String(metrics.renderCalls));
  root.setAttribute("data-world-textures", String(metrics.textures));
  root.setAttribute("data-world-screens", String(metrics.screens));
  root.setAttribute("data-world-layout-probe", `desktop:${Object.keys(worldReconstruction.frames).length};mobile:${Object.keys(worldReconstruction.frames).length};inspect:1`);
  root.setAttribute("data-world-plate-version", roomLayout.version);
  root.setAttribute("data-world-reconstruction", worldReconstruction.scene.renderMode);
  root.setAttribute("data-world-reference-view", referenceViewActive ? "1" : "0");
  root.setAttribute("data-world-screen-fit", Object.values(screenFitDiagnostics).every((fit) => fit.contentMode === "blender-cover" && fit.coverFillRatio === 1 && fit.horizontalFillRatio === 1 && fit.verticalFillRatio === 1 && fit.matte?.left === 0 && fit.matte?.right === 0 && fit.matte?.top === 0 && fit.matte?.bottom === 0 && fit.stretched === false) ? "blender-cover" : "pending");
  root.setAttribute("data-world-player", player.position.toArray().map(round).join(","));
  root.setAttribute("data-world-viewport", `${round(window.innerWidth)}x${round(window.innerHeight)}`);
  root.setAttribute("data-world-collision-blockers", String(worldReconstruction.movement.blockers.length));
  root.setAttribute("data-world-inspection-probe", inspectionProbeForVerifier());
  if (verifyMode) {
    const movement = runMovementProbe({ restore: true });
    root.setAttribute("data-world-movement-probe", `ready:${movement.ready};changed:${movement.changed};wallBlocked:${movement.wallBlocked};benchBlocked:${movement.benchBlocked}`);
    const alignment = alignmentProbe();
    root.setAttribute("data-world-alignment-probe", `pose:${alignment.poseName};pass:${alignment.pass ? 1 : 0};maxError:${alignment.maxError};tolerance:${alignment.tolerance}`);
  }
}

function renderMetrics() {
  return {
    renderCalls: renderCount,
    textures: stationTextures.size,
    screens: STATION_SLOT_ORDER.length,
    plateVersion: roomLayout.version,
    sceneObjects: scene?.children.length || 0,
    triangles: renderer?.info?.render?.triangles || 0,
    drawCalls: renderer?.info?.render?.calls || 0,
    player: playerState()
  };
}

function inspectionProbeForVerifier() {
  const wasOpen = inspectionOpen;
  const wasReferenceViewActive = referenceViewActive;
  const station = selectedStation();
  let activated = 0;
  let scrolled = 0;
  let exited = 0;

  try {
    if (wasOpen) {
      activated = screenViewer.hidden ? 0 : 1;
      scrolled = screenViewerScroll.scrollHeight > screenViewerScroll.clientHeight ? 1 : 0;
      exited = 1;
    } else {
      enterInspection(station, { pushHistory: false, preserveReferenceView: wasReferenceViewActive });
      activated = screenViewer.hidden ? 0 : 1;
      screenViewerScroll.scrollTop = 12;
      scrolled = screenViewerScroll.scrollTop > 0 || Boolean(screenViewerScroll.querySelector("img")) ? 1 : 0;
      exitInspection({ fromPop: true });
      exited = screenViewer.hidden ? 1 : 0;
    }
    if (wasReferenceViewActive) {
      referenceViewActive = true;
      syncReferenceView();
    }
  } catch {
    if (wasReferenceViewActive) {
      referenceViewActive = true;
      syncReferenceView();
    }
    return "ready:0;activated:0;scrolled:0;exited:0";
  }

  return `ready:1;activated:${activated};scrolled:${scrolled};exited:${exited}`;
}

function showFallback(message, allowTryAnyway = false) {
  if (!fallback) return;
  fallbackMessage.textContent = message;
  fallback.hidden = false;
  if (tryAnywayButton) tryAnywayButton.hidden = !allowTryAnyway;
  track("world_fallback_shown", { message });
}

function setModePreference(value) {
  try {
    if (value === null) {
      localStorage.removeItem(MODE_STORAGE_KEY);
    } else {
      localStorage.setItem(MODE_STORAGE_KEY, value);
    }
  } catch {}
}

function exposeModePreferenceForVerifier() {
  try {
    document.documentElement.setAttribute("data-mode-preference", localStorage.getItem(MODE_STORAGE_KEY) || "null");
  } catch {
    document.documentElement.setAttribute("data-mode-preference", "null");
  }
}

function track(eventName, detail = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...detail });
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, detail);
  }
}

function selectedStation() {
  return stationById(selectedStationId) || stations[0];
}

function stationById(id) {
  return stations.find((station) => station.id === id);
}

function stationIdIsValid(id) {
  return Boolean(id && stations.some((station) => station.id === id));
}

function hasReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function isLocalhost() {
  return ["localhost", "127.0.0.1", "::1", ""].includes(window.location.hostname);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isInteractiveTarget(target) {
  return Boolean(target?.closest?.("button, a, input, textarea, select, .world-ui, .screen-viewer, .calibration-panel, .qa-panel, .screen-target"));
}

async function copyText(text) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}
