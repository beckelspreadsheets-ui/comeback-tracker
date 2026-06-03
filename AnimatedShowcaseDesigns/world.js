import { growthExhibits, stations } from "./world-data.js?v=studio-quality-hero-wall-20260509-1";

const THREE_URL = "https://unpkg.com/three@0.160.0/build/three.module.js";
const THREE_LOAD_TIMEOUT_MS = 3500;

const canvas = document.getElementById("studioCanvas");
const worldShell = document.querySelector(".world-shell");
const fallback = document.getElementById("fallback");
const fallbackMessage = document.getElementById("fallbackMessage");
const tryAnywayButton = document.getElementById("tryAnywayButton");
const stationList = document.getElementById("stationList");
const stationTitle = document.getElementById("stationTitle");
const stationDescription = document.getElementById("stationDescription");
const growthList = document.getElementById("growthList");
const openLiveButton = document.getElementById("openLiveButton");
const caseStudyButton = document.getElementById("caseStudyButton");
const qualityPill = document.getElementById("qualityPill");
const fullscreenButton = document.getElementById("fullscreenButton");
const stationPanel = document.querySelector(".station-panel");
const panelToggleButton = document.getElementById("panelToggleButton");
const inspectHint = document.getElementById("inspectHint");
const screenViewer = document.getElementById("screenViewer");
const screenViewerTitle = document.getElementById("screenViewerTitle");
const screenViewerImage = document.getElementById("screenViewerImage");
const screenViewerScroll = document.getElementById("screenViewerScroll");
const screenViewerClose = document.getElementById("screenViewerClose");
const screenViewerScrollUp = document.getElementById("screenViewerScrollUp");
const screenViewerScrollDown = document.getElementById("screenViewerScrollDown");
const screenViewerFullscreen = document.getElementById("screenViewerFullscreen");
const screenViewerLive = document.getElementById("screenViewerLive");
const mobileMoveControls = document.getElementById("mobileMoveControls");
const mobileMovePad = document.getElementById("mobileMovePad");
const mobileMoveStick = document.getElementById("mobileMoveStick");

const params = new URLSearchParams(window.location.search);
const hoveredIds = new Set();
const qaMode = params.get("qa") === "1" || params.has("qa");
const qaMinimal = params.get("qa") === "minimal";
const presentationMode = params.get("presentation") === "1" || params.has("presentation");

let THREE = null;
let scene = null;
let camera = null;
let renderer = null;
let raycaster = null;
let pointer = null;
let renderRequested = false;
let selectedStation = stations[0];
let hoveredStationId = null;
let quality = "standard";
let animationToken = 0;
let pixelChecksRemaining = 4;
let lastPixelCheck = { nonBlack: 0, samples: 0 };
let lastWarmup = { frames: 0, duration: 0 };
let idleActive = false;
let introComplete = false;
let qaState = null;
let panelPreference = null;
let activeScreenStationId = null;
let adaptivePixelScale = 1;
let inspectionHistoryActive = false;
let inspectionProbeResult = "";
let suppressInspectionPop = false;
let glassReflectionTexture = null;
let contactShadowTexture = null;
let wallContactShadowTexture = null;
let floorReflectionTexture = null;
let screenFloorReflectionTexture = null;
let loungeRugTexture = null;
let studioEnvironmentTexture = null;
let leatherTexture = null;
let glassWallTexture = null;
let ceilingPhotoTexture = null;
let lookState = {
  yaw: 0,
  pitch: 0,
  targetYaw: 0,
  targetPitch: 0,
  smoothingFrame: 0,
  dragging: false,
  dragMoved: false,
  pointerId: null,
  pointerLocked: false,
  lastX: 0,
  lastY: 0,
  basePosition: null,
  baseTarget: null
};
const moveState = {
  keys: new Set(),
  frame: 0,
  lastAt: 0,
  lastRenderAt: 0,
  skipNextRender: false,
  touchPointerId: null,
  touchSide: 0,
  touchForward: 0,
  touchActive: false
};
const inspectionDragState = {
  pointerId: null,
  lastY: 0,
  moved: false
};
const renderState = {
  frame: 0,
  lastAt: 0,
  force: false
};

const stationObjects = new Map();
const interactiveObjects = [];
const galleryColliders = [];
const STUDIO = {
  width: 13.4,
  depth: 13.2,
  backZ: -6.12,
  frontZ: 6.35,
  wallHeight: 3.86,
  ceilingY: 3.72
};
const GALLERY_LAYOUT_VERSION = "right-reference-hero-wall-20260509";
const HERO_WALL_CLUSTER_APPROVED = true;
const STATION_SCALE = 1.02;
const SCREEN_INTERACTION_DISTANCE = 5.9;
const PLAYER_RADIUS = 0.34;

if (qaMinimal) {
  document.documentElement.setAttribute("data-qa-minimal", "true");
}

if (presentationMode) {
  document.documentElement.setAttribute("data-presentation", "true");
}

function isLocalhost() {
  return ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
}

function staticUrl() {
  const verifierSuffix = params.get("verifyMode") === "1" ? "&verifyMode=1" : "";
  return isLocalhost() ? `index.html?lite=1${verifierSuffix}` : `/?lite=1${verifierSuffix}`;
}

function resolveCaseStudyUrl(anchor) {
  if (!isLocalhost()) return anchor;
  return anchor.replace(/^\/#/, "index.html#");
}

function track(eventName, detail = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, detail });
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, detail);
  }
}

function formatSeconds(ms) {
  return `${Math.round(ms / 1000)}s`;
}

function setModePreference(value) {
  try {
    if (value) {
      window.localStorage.setItem("mode-preference", value);
    } else {
      window.localStorage.removeItem("mode-preference");
    }
  } catch (error) {}
}

function exposeModePreferenceForVerifier() {
  if (!isLocalhost() || params.get("verifyMode") !== "1") return;
  try {
    document.documentElement.setAttribute("data-mode-preference", window.localStorage.getItem("mode-preference") || "null");
  } catch (error) {}
}

function renderMetrics() {
  if (!renderer) return null;
  return {
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    textures: renderer.info.memory.textures,
    geometries: renderer.info.memory.geometries,
    pixelRatio: Number(renderer.getPixelRatio().toFixed(2))
  };
}

function exposeWorldMetricsForVerifier() {
  if (!isLocalhost() || params.get("verifyMode") !== "1") return;
  const metrics = renderMetrics();
  if (!metrics) return;
  document.documentElement.setAttribute("data-world-render-calls", String(metrics.calls));
  document.documentElement.setAttribute("data-world-render-triangles", String(metrics.triangles));
  document.documentElement.setAttribute("data-world-textures", String(metrics.textures));
  document.documentElement.setAttribute("data-world-geometries", String(metrics.geometries));
  document.documentElement.setAttribute("data-world-pixel-ratio", String(metrics.pixelRatio));
  document.documentElement.setAttribute("data-world-colliders", String(galleryColliders.length));
  document.documentElement.setAttribute("data-world-inspecting", activeScreenStationId ? "true" : "false");
  document.documentElement.setAttribute("data-world-collision-probe", collisionProbeForVerifier());
  document.documentElement.setAttribute("data-world-inspection-probe", inspectionProbeForVerifier());
}

function initStaticLinks() {
  document.querySelectorAll("[data-static-link]").forEach((link) => {
    link.setAttribute("href", staticUrl());
    link.addEventListener("click", () => {
      setModePreference("static");
      track("mode_return_static", { source: "world_link" });
    });
  });
}

function hasReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hasWebGL2() {
  try {
    const testCanvas = document.createElement("canvas");
    return !!testCanvas.getContext("webgl2", {
      antialias: false,
      powerPreference: "high-performance"
    });
  } catch (error) {
    return false;
  }
}

function deviceSignals() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return {
    memory: navigator.deviceMemory,
    saveData: !!(connection && connection.saveData),
    effectiveType: connection && connection.effectiveType ? connection.effectiveType : "unknown",
    coarsePointer: window.matchMedia && window.matchMedia("(pointer: coarse)").matches
  };
}

function isLowTierDevice() {
  const signals = deviceSignals();
  if (signals.saveData) return true;
  if (typeof signals.memory === "number" && signals.memory < 3) return true;
  return false;
}

function detectQuality() {
  const signals = deviceSignals();
  if (signals.coarsePointer || window.innerWidth < 760) return "lite";
  if (typeof signals.memory === "number" && signals.memory < 4) return "lite";
  return "standard";
}

function seamlessMode() {
  return params.get("cinematic") !== "1";
}

function defaultAdaptivePixelScale() {
  return 1;
}

function renderPixelRatioLimit() {
  if (!seamlessMode()) return quality === "lite" ? 1 : 1.08;
  return quality === "lite" ? 0.88 : 1;
}

function currentRenderPixelRatio() {
  const minimum = quality === "lite" ? 0.66 : 0.78;
  return Math.max(minimum, Math.min(window.devicePixelRatio || 1, renderPixelRatioLimit()) * adaptivePixelScale);
}

function fullSceneDetail() {
  return quality !== "lite" && !seamlessMode();
}

function textureIterationCount(count) {
  if (!seamlessMode()) return count;
  const ratio = quality === "lite" ? 0.24 : 0.5;
  return Math.max(1, Math.round(count * ratio));
}

function realtimeShadowsEnabled() {
  return false;
}

function createGalleryMaterial(options) {
  if (!seamlessMode()) return new THREE.MeshPhysicalMaterial(options);

  const {
    clearcoat,
    clearcoatRoughness,
    sheen,
    sheenColor,
    ...standardOptions
  } = options;

  if (quality !== "lite") {
    return new THREE.MeshStandardMaterial({
      ...standardOptions,
      toneMapped: standardOptions.toneMapped ?? true
    });
  }

  const {
    bumpMap,
    bumpScale,
    envMapIntensity,
    metalness,
    roughness,
    emissive,
    emissiveIntensity,
    ...basicOptions
  } = standardOptions;
  return new THREE.MeshBasicMaterial({
    ...basicOptions,
    toneMapped: basicOptions.toneMapped ?? true
  });
}

function initQaDiagnostics() {
  if (!qaMode) return;

  const overlay = document.createElement("aside");
  overlay.className = "qa-panel";
  overlay.setAttribute("aria-label", "Studio QA diagnostics");
  overlay.innerHTML = [
    '<div class="qa-panel__head">',
    '<div class="qa-panel__title">QA</div>',
    '<button class="qa-panel__copy" type="button" data-qa-copy>Copy report</button>',
    '</div>',
    '<dl class="qa-panel__grid">',
    '<div><dt>Route</dt><dd data-qa="route">starting</dd></div>',
    '<div><dt>FPS</dt><dd data-qa="fps">--</dd></div>',
    '<div><dt>Min</dt><dd data-qa="minFps">--</dd></div>',
    '<div><dt>Jank</dt><dd data-qa="jank">--</dd></div>',
    '<div><dt>Time</dt><dd data-qa="time">0s</dd></div>',
    '<div><dt>Canvas</dt><dd data-qa="canvas">--</dd></div>',
    '<div><dt>Device</dt><dd data-qa="device">--</dd></div>',
    '<div><dt>Pixels</dt><dd data-qa="pixels">--</dd></div>',
    '</dl>'
  ].join("");
  document.body.appendChild(overlay);

  qaState = {
    overlay,
    route: "starting",
    startedAt: performance.now(),
    lastFrameAt: 0,
    lastReportAt: 0,
    frameCount: 0,
    reportFrameCount: 0,
    fps: 0,
    minFps: Infinity,
    maxFps: 0,
    jankFrames: 0,
    longFrames: 0,
    completed90s: false
  };

  overlay.querySelector("[data-qa-copy]").addEventListener("click", copyQaReport);
  updateQaDiagnostics({ route: "checking" });
}

function updateQaDiagnostics(detail = {}) {
  if (!qaState) return;
  Object.assign(qaState, detail);

  const signals = deviceSignals();
  const canvasSize = canvas.width && canvas.height ? `${canvas.width}x${canvas.height}` : "--";
  const device = [
    typeof signals.memory === "number" ? `${signals.memory}GB` : "mem ?",
    signals.effectiveType,
    signals.saveData ? "save-data" : "data ok",
    signals.coarsePointer ? "coarse" : "fine"
  ].join(" / ");
  const pixels = lastPixelCheck.samples ? `${lastPixelCheck.nonBlack}/${lastPixelCheck.samples}` : "--";
  const elapsed = performance.now() - qaState.startedAt;

  const values = {
    route: qaState.route || "running",
    fps: qaState.fps ? String(Math.round(qaState.fps)) : "--",
    minFps: Number.isFinite(qaState.minFps) ? String(Math.round(qaState.minFps)) : "--",
    jank: `${qaState.jankFrames}/${qaState.longFrames}`,
    time: formatSeconds(elapsed),
    canvas: canvasSize,
    device,
    pixels
  };

  Object.keys(values).forEach((key) => {
    const node = qaState.overlay.querySelector(`[data-qa="${key}"]`);
    if (node) node.textContent = values[key];
  });

  qaState.overlay.classList.toggle("is-complete", qaState.completed90s);
}

async function copyQaReport() {
  if (!qaState) return;
  const button = qaState.overlay.querySelector("[data-qa-copy]");
  const report = JSON.stringify(getQaSummary(), null, 2);

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(report);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = report;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    if (button) button.textContent = "Copied";
  } catch (error) {
    console.log("Showcase QA report", report);
    if (button) button.textContent = "Console";
  }

  window.setTimeout(() => {
    if (button) button.textContent = "Copy report";
  }, 2200);
}

function runQaFrameProbe() {
  if (!qaState || qaState.running) return;
  qaState.running = true;

  function frame(now) {
    if (!qaState) return;

    if (qaState.lastFrameAt) {
      const delta = now - qaState.lastFrameAt;
      if (delta > 50) qaState.jankFrames += 1;
      if (delta > 100) qaState.longFrames += 1;
    }

    qaState.lastFrameAt = now;
    qaState.frameCount += 1;
    qaState.reportFrameCount += 1;

    if (now - qaState.lastReportAt >= 1000) {
      qaState.fps = qaState.reportFrameCount / ((now - qaState.lastReportAt) / 1000 || 1);
      qaState.minFps = Math.min(qaState.minFps, qaState.fps);
      qaState.maxFps = Math.max(qaState.maxFps, qaState.fps);
      qaState.reportFrameCount = 0;
      qaState.lastReportAt = now;
      updateQaDiagnostics();
    }

    const elapsed = now - qaState.startedAt;
    if (!qaState.completed90s && elapsed >= 90000) {
      qaState.completed90s = true;
      track("world_qa_90s_complete", getQaSummary());
      updateQaDiagnostics({ route: "90s complete" });
    }

    if (renderer && scene && camera) {
      renderScene();
    }

    window.requestAnimationFrame(frame);
  }

  qaState.lastReportAt = performance.now();
  window.requestAnimationFrame(frame);
}

function getQaSummary() {
  if (!qaState) return null;
  return {
    route: qaState.route,
    durationSeconds: Math.round((performance.now() - qaState.startedAt) / 1000),
    fps: Math.round(qaState.fps || 0),
    minFps: Number.isFinite(qaState.minFps) ? Math.round(qaState.minFps) : null,
    maxFps: Math.round(qaState.maxFps || 0),
    jankFrames: qaState.jankFrames,
    longFrames: qaState.longFrames,
    quality,
    pixelCheck: lastPixelCheck,
    warmup: lastWarmup,
    render: renderMetrics(),
    device: deviceSignals(),
    userAgent: navigator.userAgent,
    viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 },
    canvas: { width: canvas.width, height: canvas.height }
  };
}

function showFallback(message, allowTryAnyway) {
  fallbackMessage.textContent = message || "The studio view is optimized for devices that support interactive 3D.";
  fallback.hidden = false;
  canvas.style.visibility = "hidden";
  tryAnywayButton.hidden = !allowTryAnyway;
  track("world_fallback_shown", { allowTryAnyway: !!allowTryAnyway });
  updateQaDiagnostics({ route: allowTryAnyway ? "low-tier fallback" : "fallback" });
}

function importWithTimeout(url, timeoutMs) {
  return Promise.race([
    import(url),
    new Promise((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(`Timed out loading ${url}`));
      }, timeoutMs);
    })
  ]);
}

function routeGuards() {
  if (params.get("lite") === "1") {
    setModePreference(null);
    exposeModePreferenceForVerifier();
    track("mode_return_static", { source: "query_param" });
    window.location.replace(staticUrl());
    return false;
  }

  if (hasReducedMotion()) {
    setModePreference("static");
    exposeModePreferenceForVerifier();
    track("reduced_motion_redirect", { source: "world" });
    window.location.replace(staticUrl());
    return false;
  }

  const webglSupported = hasWebGL2();
  if (!webglSupported) {
    showFallback("The studio view is optimized for devices that support interactive 3D.", false);
    return false;
  }

  const forced = window.sessionStorage.getItem("world-try-anyway") === "1" || params.get("try") === "1" || params.has("try");
  if (!forced && isLowTierDevice()) {
    showFallback("The studio view is optimized for devices that support interactive 3D.", true);
    return false;
  }

  return true;
}

function roundedRectShape(width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function createRoundedCanvasRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;

  for (let index = 0; index < words.length; index += 1) {
    const testLine = line ? `${line} ${words[index]}` : words[index];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      lines += 1;
      line = words[index];
      if (lines >= maxLines - 1) break;
    } else {
      line = testLine;
    }
  }

  if (line && lines < maxLines) {
    ctx.fillText(line, x, y);
  }
}

function createLabelTexture(station) {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 1024;
  canvasEl.height = 512;
  const ctx = canvasEl.getContext("2d");

  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  createRoundedCanvasRect(ctx, 24, 24, 976, 464, 34);
  ctx.fillStyle = "rgba(248, 242, 232, 0.96)";
  ctx.fill();
  ctx.strokeStyle = "rgba(96, 74, 28, 0.28)";
  ctx.lineWidth = 3;
  ctx.stroke();

  createRoundedCanvasRect(ctx, 64, 64, station.kind === "live" ? 142 : 230, 56, 28);
  ctx.fillStyle = station.kind === "live" ? "#c9a227" : "rgba(255,255,255,0.12)";
  ctx.fill();
  ctx.fillStyle = station.kind === "live" ? "#0a0a0a" : "#f5f0e8";
  ctx.font = "700 24px Manrope, sans-serif";
  ctx.letterSpacing = "3px";
  ctx.fillText(station.kind.toUpperCase(), 92, 101);

  ctx.fillStyle = "#16130f";
  ctx.font = "48px Prata, serif";
  wrapText(ctx, station.displayName, 64, 190, 850, 58, 2);

  ctx.fillStyle = "#5e5548";
  ctx.font = "500 30px Manrope, sans-serif";
  wrapText(ctx, station.description, 64, 292, 820, 42, 3);

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

function createSignTexture(kicker, title, body) {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 1024;
  canvasEl.height = 384;
  const ctx = canvasEl.getContext("2d");

  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  createRoundedCanvasRect(ctx, 28, 28, 968, 328, 28);
  ctx.fillStyle = "rgba(11, 10, 8, 0.78)";
  ctx.fill();
  ctx.strokeStyle = "rgba(201, 162, 39, 0.24)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#c9a227";
  ctx.font = "800 24px Manrope, sans-serif";
  ctx.fillText(kicker.toUpperCase(), 72, 96);

  ctx.fillStyle = "#f5f0e8";
  ctx.font = "58px Prata, serif";
  ctx.fillText(title, 72, 180);

  ctx.fillStyle = "#a9a397";
  ctx.font = "500 30px Manrope, sans-serif";
  wrapText(ctx, body, 72, 250, 810, 40, 2);

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

function createGrowthHeaderTexture() {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 1024;
  canvasEl.height = 192;
  const ctx = canvasEl.getContext("2d");

  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  createRoundedCanvasRect(ctx, 22, 34, 980, 124, 30);
  ctx.fillStyle = "rgba(248, 242, 232, 0.9)";
  ctx.fill();
  ctx.strokeStyle = "rgba(96, 74, 28, 0.34)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#c9a227";
  ctx.font = "800 24px Manrope, sans-serif";
  ctx.fillText("GOOGLE GROWTH WALL", 70, 87);

  ctx.fillStyle = "#17130e";
  ctx.font = "48px Prata, serif";
  ctx.fillText("Search momentum on display", 70, 132);

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

function createGrowthTexture(exhibit) {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 1024;
  canvasEl.height = 640;
  const ctx = canvasEl.getContext("2d");
  const chartPoints = [
    [542, 438],
    [612, 414],
    [680, 376],
    [748, 328],
    [816, 272],
    [888, 210]
  ];

  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  createRoundedCanvasRect(ctx, 28, 28, 968, 584, 34);
  ctx.fillStyle = "rgba(248, 242, 232, 0.94)";
  ctx.fill();
  ctx.strokeStyle = "rgba(96, 74, 28, 0.32)";
  ctx.lineWidth = 3;
  ctx.stroke();

  const shine = ctx.createLinearGradient(28, 28, 996, 612);
  shine.addColorStop(0, "rgba(219, 185, 78, 0.16)");
  shine.addColorStop(0.42, "rgba(219, 185, 78, 0.05)");
  shine.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = shine;
  ctx.fill();

  createRoundedCanvasRect(ctx, 68, 70, 230, 54, 27);
  ctx.fillStyle = "rgba(201, 162, 39, 0.96)";
  ctx.fill();
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "800 22px Manrope, sans-serif";
  ctx.fillText("GOOGLE GROWTH", 96, 105);

  ctx.fillStyle = "#17130e";
  ctx.font = "54px Prata, serif";
  wrapText(ctx, exhibit.displayName, 68, 190, 430, 62, 2);

  ctx.fillStyle = "#7c641e";
  ctx.font = "800 27px Manrope, sans-serif";
  wrapText(ctx, exhibit.headline.toUpperCase(), 70, 310, 410, 34, 2);

  ctx.fillStyle = "#5e5548";
  ctx.font = "500 25px Manrope, sans-serif";
  wrapText(ctx, exhibit.summary, 70, 388, 390, 34, 3);

  ctx.strokeStyle = "rgba(22, 19, 14, 0.12)";
  ctx.lineWidth = 3;
  [454, 392, 330, 268, 206].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(520, y);
    ctx.lineTo(920, y);
    ctx.stroke();
  });

  ctx.strokeStyle = "rgba(219, 185, 78, 0.92)";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  chartPoints.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point[0], point[1]);
    } else {
      ctx.lineTo(point[0], point[1]);
    }
  });
  ctx.stroke();

  chartPoints.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point[0], point[1], 12, 0, Math.PI * 2);
    ctx.fillStyle = "#17130e";
    ctx.fill();
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 5;
    ctx.stroke();
  });

  exhibit.signals.slice(0, 3).forEach((signal, index) => {
    const x = 68 + (index % 2) * 214;
    const y = 510 + Math.floor(index / 2) * 58;
    createRoundedCanvasRect(ctx, x, y, 190, 42, 21);
    ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
    ctx.fill();
    ctx.fillStyle = "#4f473d";
    ctx.font = "700 17px Manrope, sans-serif";
    wrapText(ctx, signal, x + 18, y + 27, 152, 20, 1);
  });

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

function createStationNumberTexture(index, kind) {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 256;
  canvasEl.height = 128;
  const ctx = canvasEl.getContext("2d");
  const number = String(index).padStart(2, "0");

  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  createRoundedCanvasRect(ctx, 14, 22, 228, 84, 42);
  ctx.fillStyle = kind === "live" ? "rgba(201, 162, 39, 0.94)" : "rgba(245, 240, 232, 0.16)";
  ctx.fill();
  ctx.fillStyle = kind === "live" ? "#0a0a0a" : "#f5f0e8";
  ctx.font = "800 42px Manrope, sans-serif";
  ctx.fillText(number, 44, 78);
  ctx.font = "800 19px Manrope, sans-serif";
  ctx.fillText(kind.toUpperCase(), 124, 73);

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

function createStationHeaderTexture(station, index) {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 1024;
  canvasEl.height = 192;
  const ctx = canvasEl.getContext("2d");
  const number = String(index).padStart(2, "0");
  const title = station.displayName.toUpperCase();

  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  createRoundedCanvasRect(ctx, 22, 44, 980, 104, 8);
  ctx.fillStyle = "rgba(236, 229, 216, 0.88)";
  ctx.fill();

  ctx.fillStyle = "rgba(18, 16, 14, 0.82)";
  ctx.font = "700 24px Manrope, sans-serif";
  ctx.fillText(number, 68, 108);

  ctx.fillStyle = "rgba(18, 16, 14, 0.92)";
  let fontSize = 40;
  do {
    ctx.font = `700 ${fontSize}px Manrope, sans-serif`;
    fontSize -= 2;
  } while (ctx.measureText(title).width > 720 && fontSize >= 28);
  ctx.fillText(title, 128, 106);

  ctx.fillStyle = "rgba(18, 16, 14, 0.54)";
  ctx.font = "600 18px Manrope, sans-serif";
  ctx.fillText(station.kind.toUpperCase(), 130, 132);

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

function createStationGlowTexture(kind) {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 512;
  canvasEl.height = 512;
  const ctx = canvasEl.getContext("2d");
  const accent = kind === "live" ? "255, 222, 176" : "236, 241, 248";
  const glow = ctx.createRadialGradient(256, 256, 18, 256, 256, 248);

  glow.addColorStop(0, `rgba(${accent}, 0.18)`);
  glow.addColorStop(0.36, `rgba(${accent}, 0.065)`);
  glow.addColorStop(0.72, `rgba(${accent}, 0.018)`);
  glow.addColorStop(1, `rgba(${accent}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createWallTexture() {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 1024;
  canvasEl.height = 512;
  const ctx = canvasEl.getContext("2d");

  const base = ctx.createLinearGradient(0, 0, 0, canvasEl.height);
  base.addColorStop(0, "#4a4741");
  base.addColorStop(0.34, "#34322e");
  base.addColorStop(0.74, "#252420");
  base.addColorStop(1, "#171716");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  for (let i = 0; i < textureIterationCount(7200); i += 1) {
    const shade = 96 + Math.random() * 86;
    const alpha = 0.01 + Math.random() * 0.025;
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade * 0.96}, ${alpha})`;
    ctx.fillRect(Math.random() * canvasEl.width, Math.random() * canvasEl.height, 1, 1);
  }

  for (let i = 0; i < textureIterationCount(18); i += 1) {
    const x = Math.random() * canvasEl.width;
    const y = Math.random() * canvasEl.height;
    const r = 90 + Math.random() * 220;
    const mottling = ctx.createRadialGradient(x, y, 6, x, y, r);
    mottling.addColorStop(0, `rgba(225, 220, 207, ${0.026 + Math.random() * 0.04})`);
    mottling.addColorStop(1, "rgba(225, 220, 207, 0)");
    ctx.fillStyle = mottling;
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
  }

  [256, 512, 768].forEach((x) => {
    const seam = ctx.createLinearGradient(x - 3, 0, x + 3, 0);
    seam.addColorStop(0, "rgba(255, 255, 255, 0)");
    seam.addColorStop(0.48, "rgba(9, 9, 9, 0.34)");
    seam.addColorStop(0.55, "rgba(210, 205, 190, 0.055)");
    seam.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = seam;
    ctx.fillRect(x - 4, 0, 8, canvasEl.height);
  });

  [170, 340].forEach((y) => {
    const seam = ctx.createLinearGradient(0, y - 2, 0, y + 3);
    seam.addColorStop(0, "rgba(255, 255, 255, 0)");
    seam.addColorStop(0.46, "rgba(7, 7, 7, 0.24)");
    seam.addColorStop(0.62, "rgba(215, 210, 196, 0.04)");
    seam.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = seam;
    ctx.fillRect(0, y - 3, canvasEl.width, 6);
  });

  for (let i = 0; i < textureIterationCount(34); i += 1) {
    const x = Math.random() * canvasEl.width;
    const y = Math.random() * canvasEl.height;
    ctx.strokeStyle = `rgba(230, 226, 216, ${0.012 + Math.random() * 0.02})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 28 + Math.random() * 70, y + (Math.random() - 0.5) * 10);
    ctx.stroke();
  }

  const vignette = ctx.createRadialGradient(512, 235, 170, 512, 280, 650);
  vignette.addColorStop(0, "rgba(235, 230, 216, 0.07)");
  vignette.addColorStop(0.52, "rgba(235, 230, 216, 0.018)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.16)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.2, 1.15);
  texture.anisotropy = 2;
  return texture;
}

function createShowroomWallTexture(wallSpan, bayCenters) {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 2048;
  canvasEl.height = 768;
  const ctx = canvasEl.getContext("2d");
  const width = canvasEl.width;
  const height = canvasEl.height;
  const toCanvasX = (x) => ((x + wallSpan / 2) / wallSpan) * width;

  ctx.clearRect(0, 0, width, height);

  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, "rgba(20, 19, 17, 0.24)");
  base.addColorStop(0.52, "rgba(0, 0, 0, 0.02)");
  base.addColorStop(1, "rgba(0, 0, 0, 0.32)");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const topGlow = ctx.createLinearGradient(0, 70, 0, 330);
  topGlow.addColorStop(0, "rgba(244, 226, 198, 0.24)");
  topGlow.addColorStop(0.5, "rgba(239, 203, 155, 0.075)");
  topGlow.addColorStop(1, "rgba(239, 203, 155, 0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 70, width, 310);

  for (let i = 0; i < textureIterationCount(2400); i += 1) {
    const alpha = 0.006 + Math.random() * 0.016;
    const shade = 188 + Math.random() * 38;
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade * 0.94}, ${alpha})`;
    ctx.fillRect(Math.random() * width, 96 + Math.random() * 560, 1, 1);
  }

  const slabColumns = Math.max(3, Math.round(wallSpan / 2.5));
  for (let i = 1; i < slabColumns; i += 1) {
    const x = Math.round((width / slabColumns) * i);
    const seam = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
    seam.addColorStop(0, "rgba(0, 0, 0, 0)");
    seam.addColorStop(0.42, "rgba(0, 0, 0, 0.26)");
    seam.addColorStop(0.58, "rgba(255, 250, 232, 0.045)");
    seam.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = seam;
    ctx.fillRect(x - 5, 96, 10, 575);
  }

  [290, 515].forEach((y) => {
    const seam = ctx.createLinearGradient(0, y - 4, 0, y + 4);
    seam.addColorStop(0, "rgba(0, 0, 0, 0)");
    seam.addColorStop(0.46, "rgba(0, 0, 0, 0.2)");
    seam.addColorStop(0.62, "rgba(255, 250, 232, 0.038)");
    seam.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = seam;
    ctx.fillRect(0, y - 5, width, 10);
  });

  const sideGlow = ctx.createLinearGradient(0, 0, 180, 0);
  sideGlow.addColorStop(0, "rgba(0, 0, 0, 0.34)");
  sideGlow.addColorStop(0.64, "rgba(0, 0, 0, 0.08)");
  sideGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = sideGlow;
  ctx.fillRect(0, 70, 230, 650);

  const rightGlow = ctx.createLinearGradient(width, 0, width - 180, 0);
  rightGlow.addColorStop(0, "rgba(0, 0, 0, 0.34)");
  rightGlow.addColorStop(0.64, "rgba(0, 0, 0, 0.08)");
  rightGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = rightGlow;
  ctx.fillRect(width - 230, 70, 230, 650);

  bayCenters.forEach((bayCenter) => {
    const center = toCanvasX(bayCenter);

    const wallGlow = ctx.createRadialGradient(center, 230, 28, center, 285, 315);
    wallGlow.addColorStop(0, "rgba(255, 237, 212, 0.34)");
    wallGlow.addColorStop(0.4, "rgba(244, 203, 158, 0.12)");
    wallGlow.addColorStop(1, "rgba(244, 203, 158, 0)");
    ctx.fillStyle = wallGlow;
    ctx.fillRect(center - 360, 72, 720, 470);

    const lowerFalloff = ctx.createLinearGradient(0, 410, 0, 690);
    lowerFalloff.addColorStop(0, "rgba(255, 226, 190, 0.035)");
    lowerFalloff.addColorStop(1, "rgba(0, 0, 0, 0.18)");
    ctx.fillStyle = lowerFalloff;
    ctx.fillRect(center - 260, 410, 520, 280);
  });

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

function nearRotation(value, target) {
  return Math.abs(value - target) < 0.02;
}

function createBackWallShowroomTexture() {
  const centers = stations
    .filter((station) => station.position.z < STUDIO.backZ + 0.5 && nearRotation(station.rotation.y, 0))
    .map((station) => station.position.x);
  return createShowroomWallTexture(STUDIO.width, centers);
}

function createFrontWallShowroomTexture() {
  const centers = stations
    .filter((station) => station.position.z > STUDIO.frontZ - 0.55 && Math.abs(Math.abs(station.rotation.y) - Math.PI) < 0.02)
    .map((station) => station.position.x);
  return createShowroomWallTexture(STUDIO.width, centers);
}

function createLeftWallShowroomTexture() {
  const centers = stations
    .filter((station) => station.position.x < -STUDIO.width / 2 + 0.5 && nearRotation(station.rotation.y, Math.PI / 2))
    .map((station) => -(station.position.z - 0.1));
  return createShowroomWallTexture(STUDIO.depth, centers);
}

function createRightWallShowroomTexture() {
  const centers = stations
    .filter((station) => station.position.x > STUDIO.width / 2 - 0.5 && nearRotation(station.rotation.y, -Math.PI / 2))
    .map((station) => station.position.z - 0.1);
  return createShowroomWallTexture(STUDIO.depth, centers);
}

function createFloorTexture() {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 1024;
  canvasEl.height = 1024;
  const ctx = canvasEl.getContext("2d");

  const base = ctx.createRadialGradient(512, 280, 80, 512, 520, 760);
  base.addColorStop(0, "#615d55");
  base.addColorStop(0.32, "#403e38");
  base.addColorStop(0.68, "#24231f");
  base.addColorStop(1, "#11110f");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  for (let i = 0; i < textureIterationCount(8500); i += 1) {
    const value = 82 + Math.random() * 92;
    const alpha = 0.011 + Math.random() * 0.026;
    ctx.fillStyle = `rgba(${value}, ${value}, ${value * 0.92}, ${alpha})`;
    ctx.fillRect(Math.random() * canvasEl.width, Math.random() * canvasEl.height, 1, 1);
  }

  [256, 512, 768].forEach((x) => {
    const seam = ctx.createLinearGradient(x - 4, 0, x + 5, 0);
    seam.addColorStop(0, "rgba(255,255,255,0)");
    seam.addColorStop(0.43, "rgba(0,0,0,0.28)");
    seam.addColorStop(0.58, "rgba(230,224,210,0.045)");
    seam.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = seam;
    ctx.fillRect(x - 5, 0, 10, canvasEl.height);
  });

  [256, 512, 768].forEach((y) => {
    const seam = ctx.createLinearGradient(0, y - 4, 0, y + 5);
    seam.addColorStop(0, "rgba(255,255,255,0)");
    seam.addColorStop(0.44, "rgba(0,0,0,0.24)");
    seam.addColorStop(0.6, "rgba(230,224,210,0.04)");
    seam.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = seam;
    ctx.fillRect(0, y - 5, canvasEl.width, 10);
  });

  for (let i = 0; i < textureIterationCount(58); i += 1) {
    const y = Math.random() * canvasEl.height;
    const x = Math.random() * canvasEl.width;
    ctx.strokeStyle = `rgba(245, 240, 228, ${0.012 + Math.random() * 0.026})`;
    ctx.lineWidth = 0.45 + Math.random() * 0.75;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 70, y - 20, x + 210, y + 24, x + 360, y + 4);
    ctx.stroke();
  }

  const polish = ctx.createLinearGradient(0, 0, canvasEl.width, canvasEl.height);
  polish.addColorStop(0, "rgba(255, 255, 255, 0)");
  polish.addColorStop(0.34, "rgba(255, 238, 210, 0.032)");
  polish.addColorStop(0.49, "rgba(255, 255, 255, 0.096)");
  polish.addColorStop(0.64, "rgba(255, 238, 210, 0.026)");
  polish.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = polish;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 2.4);
  texture.anisotropy = 2;
  return texture;
}

function createSurfaceBumpTexture(kind) {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 512;
  canvasEl.height = 512;
  const ctx = canvasEl.getContext("2d");
  const base = kind === "floor" ? 128 : 122;

  ctx.fillStyle = `rgb(${base}, ${base}, ${base})`;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  for (let i = 0; i < textureIterationCount(5200); i += 1) {
    const value = base - 24 + Math.random() * 48;
    ctx.fillStyle = `rgba(${value}, ${value}, ${value}, ${0.18 + Math.random() * 0.26})`;
    ctx.fillRect(Math.random() * canvasEl.width, Math.random() * canvasEl.height, 1, 1);
  }

  for (let i = 0; i < textureIterationCount(kind === "floor" ? 16 : 10); i += 1) {
    const x = Math.random() * canvasEl.width;
    const y = Math.random() * canvasEl.height;
    const radius = 34 + Math.random() * 90;
    const value = base + (Math.random() > 0.5 ? 18 : -18);
    const pore = ctx.createRadialGradient(x, y, 0, x, y, radius);
    pore.addColorStop(0, `rgba(${value}, ${value}, ${value}, 0.12)`);
    pore.addColorStop(1, `rgba(${value}, ${value}, ${value}, 0)`);
    ctx.fillStyle = pore;
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
  }

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === "floor" ? 2.4 : 2.2, kind === "floor" ? 2.4 : 1.15);
  texture.anisotropy = 2;
  return texture;
}

function createFloorReflectionTexture() {
  if (floorReflectionTexture) return floorReflectionTexture;

  const canvasEl = document.createElement("canvas");
  canvasEl.width = 1024;
  canvasEl.height = 512;
  const ctx = canvasEl.getContext("2d");

  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  const glow = ctx.createLinearGradient(0, 0, 0, canvasEl.height);
  glow.addColorStop(0, "rgba(255, 231, 178, 0.32)");
  glow.addColorStop(0.22, "rgba(225, 170, 82, 0.2)");
  glow.addColorStop(0.54, "rgba(255, 226, 166, 0.085)");
  glow.addColorStop(1, "rgba(204, 151, 61, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  const streak = ctx.createLinearGradient(0, 120, 0, 260);
  streak.addColorStop(0, "rgba(255, 222, 160, 0)");
  streak.addColorStop(0.48, "rgba(255, 238, 196, 0.18)");
  streak.addColorStop(1, "rgba(255, 222, 160, 0)");
  ctx.fillStyle = streak;
  ctx.fillRect(0, 110, canvasEl.width, 170);

  [
    { x: 190, color: "rgba(245, 240, 232, 0.08)" },
    { x: 395, color: "rgba(55, 168, 126, 0.075)" },
    { x: 650, color: "rgba(231, 193, 94, 0.08)" },
    { x: 838, color: "rgba(245, 240, 232, 0.08)" }
  ].forEach((band) => {
    const screenGlow = ctx.createRadialGradient(band.x, 90, 12, band.x, 110, 180);
    screenGlow.addColorStop(0, band.color);
    screenGlow.addColorStop(0.5, band.color.replace("0.08", "0.035").replace("0.075", "0.032"));
    screenGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = screenGlow;
    ctx.fillRect(band.x - 190, 0, 380, 300);
  });

  floorReflectionTexture = new THREE.CanvasTexture(canvasEl);
  floorReflectionTexture.colorSpace = THREE.SRGBColorSpace;
  return floorReflectionTexture;
}

function createHeroWallWashTexture() {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 512;
  canvasEl.height = 1024;
  const ctx = canvasEl.getContext("2d");
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  const cone = ctx.createRadialGradient(256, 190, 18, 256, 330, 430);
  cone.addColorStop(0, "rgba(255, 241, 220, 0.62)");
  cone.addColorStop(0.2, "rgba(251, 222, 188, 0.4)");
  cone.addColorStop(0.58, "rgba(232, 181, 118, 0.16)");
  cone.addColorStop(1, "rgba(230, 178, 112, 0)");
  ctx.fillStyle = cone;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  const vertical = ctx.createLinearGradient(0, 0, 0, canvasEl.height);
  vertical.addColorStop(0, "rgba(255, 241, 218, 0.22)");
  vertical.addColorStop(0.38, "rgba(255, 222, 180, 0.11)");
  vertical.addColorStop(0.72, "rgba(255, 222, 180, 0.018)");
  vertical.addColorStop(1, "rgba(255, 222, 180, 0)");
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCoveSpillTexture() {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 1024;
  canvasEl.height = 256;
  const ctx = canvasEl.getContext("2d");
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  const horizontal = ctx.createLinearGradient(0, 0, canvasEl.width, 0);
  horizontal.addColorStop(0, "rgba(255, 225, 183, 0.04)");
  horizontal.addColorStop(0.18, "rgba(255, 235, 205, 0.34)");
  horizontal.addColorStop(0.5, "rgba(255, 235, 205, 0.46)");
  horizontal.addColorStop(0.82, "rgba(255, 235, 205, 0.34)");
  horizontal.addColorStop(1, "rgba(255, 225, 183, 0.04)");
  ctx.fillStyle = horizontal;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  const falloff = ctx.createLinearGradient(0, 0, 0, canvasEl.height);
  falloff.addColorStop(0, "rgba(255, 246, 225, 0.48)");
  falloff.addColorStop(0.54, "rgba(245, 205, 150, 0.16)");
  falloff.addColorStop(1, "rgba(245, 205, 150, 0)");
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = falloff;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFloorLightPoolTexture() {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 768;
  canvasEl.height = 1024;
  const ctx = canvasEl.getContext("2d");
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  const pool = ctx.createRadialGradient(384, 250, 18, 384, 400, 455);
  pool.addColorStop(0, "rgba(255, 241, 214, 0.42)");
  pool.addColorStop(0.3, "rgba(249, 211, 158, 0.24)");
  pool.addColorStop(0.72, "rgba(214, 154, 82, 0.08)");
  pool.addColorStop(1, "rgba(211, 151, 80, 0)");
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  const streak = ctx.createLinearGradient(0, 0, 0, canvasEl.height);
  streak.addColorStop(0, "rgba(255, 244, 224, 0.24)");
  streak.addColorStop(0.28, "rgba(255, 244, 224, 0.14)");
  streak.addColorStop(0.7, "rgba(255, 226, 178, 0.018)");
  streak.addColorStop(1, "rgba(255, 226, 178, 0)");
  ctx.fillStyle = streak;
  ctx.fillRect(270, 0, 228, canvasEl.height);

  for (let i = 0; i < textureIterationCount(900); i += 1) {
    ctx.fillStyle = `rgba(255, 248, 232, ${0.005 + Math.random() * 0.012})`;
    ctx.fillRect(Math.random() * canvasEl.width, Math.random() * canvasEl.height, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createScreenFloorReflectionTexture() {
  if (screenFloorReflectionTexture) return screenFloorReflectionTexture;

  const canvasEl = document.createElement("canvas");
  canvasEl.width = 512;
  canvasEl.height = 1024;
  const ctx = canvasEl.getContext("2d");
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  const mainReflection = ctx.createLinearGradient(0, 48, 0, 940);
  mainReflection.addColorStop(0, "rgba(255, 244, 224, 0.28)");
  mainReflection.addColorStop(0.16, "rgba(247, 220, 182, 0.18)");
  mainReflection.addColorStop(0.46, "rgba(224, 174, 112, 0.07)");
  mainReflection.addColorStop(0.8, "rgba(197, 134, 72, 0.018)");
  mainReflection.addColorStop(1, "rgba(197, 134, 72, 0)");
  ctx.fillStyle = mainReflection;
  createRoundedCanvasRect(ctx, 150, 46, 212, 900, 56);
  ctx.fill();

  const screenCore = ctx.createLinearGradient(0, 70, 0, 660);
  screenCore.addColorStop(0, "rgba(255, 255, 246, 0.18)");
  screenCore.addColorStop(0.28, "rgba(234, 215, 180, 0.12)");
  screenCore.addColorStop(0.62, "rgba(75, 190, 135, 0.035)");
  screenCore.addColorStop(1, "rgba(75, 190, 135, 0)");
  ctx.fillStyle = screenCore;
  createRoundedCanvasRect(ctx, 188, 88, 136, 610, 38);
  ctx.fill();

  const polish = ctx.createRadialGradient(256, 215, 16, 256, 360, 390);
  polish.addColorStop(0, "rgba(255, 250, 232, 0.24)");
  polish.addColorStop(0.36, "rgba(255, 230, 190, 0.08)");
  polish.addColorStop(1, "rgba(255, 230, 190, 0)");
  ctx.fillStyle = polish;
  ctx.fillRect(32, 0, 448, 760);

  for (let i = 0; i < textureIterationCount(320); i += 1) {
    const y = 80 + Math.random() * 780;
    const alpha = 0.006 + Math.random() * 0.014;
    ctx.strokeStyle = `rgba(255, 247, 232, ${alpha})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.2;
    ctx.beginPath();
    ctx.moveTo(168 + Math.random() * 24, y);
    ctx.bezierCurveTo(205, y - 8, 300, y + 10, 344 + Math.random() * 22, y + 2);
    ctx.stroke();
  }

  screenFloorReflectionTexture = new THREE.CanvasTexture(canvasEl);
  screenFloorReflectionTexture.colorSpace = THREE.SRGBColorSpace;
  return screenFloorReflectionTexture;
}

function createCeilingPhotoTexture() {
  if (ceilingPhotoTexture) return ceilingPhotoTexture;

  const canvasEl = document.createElement("canvas");
  canvasEl.width = 1024;
  canvasEl.height = 1024;
  const ctx = canvasEl.getContext("2d");

  const base = ctx.createLinearGradient(0, 0, 0, canvasEl.height);
  base.addColorStop(0, "#4f473c");
  base.addColorStop(0.38, "#332f29");
  base.addColorStop(1, "#171615");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  for (let i = 0; i < textureIterationCount(6200); i += 1) {
    const shade = 80 + Math.random() * 85;
    ctx.fillStyle = `rgba(${shade}, ${shade * 0.96}, ${shade * 0.88}, ${0.012 + Math.random() * 0.028})`;
    ctx.fillRect(Math.random() * canvasEl.width, Math.random() * canvasEl.height, 1, 1);
  }

  const backCove = ctx.createLinearGradient(0, 0, 0, 260);
  backCove.addColorStop(0, "rgba(255, 239, 212, 0.56)");
  backCove.addColorStop(0.18, "rgba(255, 221, 176, 0.3)");
  backCove.addColorStop(1, "rgba(255, 221, 176, 0)");
  ctx.fillStyle = backCove;
  ctx.fillRect(0, 0, canvasEl.width, 300);

  const leftCove = ctx.createLinearGradient(0, 0, 230, 0);
  leftCove.addColorStop(0, "rgba(255, 239, 212, 0.42)");
  leftCove.addColorStop(0.28, "rgba(255, 221, 176, 0.18)");
  leftCove.addColorStop(1, "rgba(255, 221, 176, 0)");
  ctx.fillStyle = leftCove;
  ctx.fillRect(0, 0, 260, canvasEl.height);

  [250, 520, 780].forEach((x) => {
    const downlight = ctx.createRadialGradient(x, 315, 18, x, 390, 210);
    downlight.addColorStop(0, "rgba(255, 236, 204, 0.2)");
    downlight.addColorStop(0.42, "rgba(239, 199, 144, 0.09)");
    downlight.addColorStop(1, "rgba(239, 199, 144, 0)");
    ctx.fillStyle = downlight;
    ctx.fillRect(x - 230, 120, 460, 420);
  });

  for (let i = 0; i < 5; i += 1) {
    const y = 190 + i * 145;
    const seam = ctx.createLinearGradient(0, y - 2, 0, y + 3);
    seam.addColorStop(0, "rgba(0, 0, 0, 0)");
    seam.addColorStop(0.45, "rgba(0, 0, 0, 0.18)");
    seam.addColorStop(0.62, "rgba(255, 244, 224, 0.035)");
    seam.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = seam;
    ctx.fillRect(0, y - 4, canvasEl.width, 8);
  }

  ceilingPhotoTexture = new THREE.CanvasTexture(canvasEl);
  ceilingPhotoTexture.colorSpace = THREE.SRGBColorSpace;
  ceilingPhotoTexture.wrapS = THREE.RepeatWrapping;
  ceilingPhotoTexture.wrapT = THREE.RepeatWrapping;
  ceilingPhotoTexture.repeat.set(1.15, 1.15);
  ceilingPhotoTexture.anisotropy = 2;
  return ceilingPhotoTexture;
}

function createGardenSilhouetteTexture() {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 512;
  canvasEl.height = 1024;
  const ctx = canvasEl.getContext("2d");
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  const night = ctx.createLinearGradient(0, 0, 0, canvasEl.height);
  night.addColorStop(0, "rgba(8, 13, 12, 0.76)");
  night.addColorStop(0.52, "rgba(12, 19, 16, 0.62)");
  night.addColorStop(1, "rgba(3, 4, 4, 0.82)");
  ctx.fillStyle = night;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  for (let i = 0; i < textureIterationCount(34); i += 1) {
    const x = 40 + Math.random() * 420;
    const y = 230 + Math.random() * 540;
    const radius = 18 + Math.random() * 44;
    const leaf = ctx.createRadialGradient(x, y, 2, x, y, radius);
    leaf.addColorStop(0, `rgba(96, 135, 71, ${0.11 + Math.random() * 0.12})`);
    leaf.addColorStop(1, "rgba(45, 75, 42, 0)");
    ctx.fillStyle = leaf;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  const planter = ctx.createLinearGradient(0, 790, 0, 940);
  planter.addColorStop(0, "rgba(27, 23, 18, 0.75)");
  planter.addColorStop(1, "rgba(5, 5, 5, 0.85)");
  ctx.fillStyle = planter;
  ctx.fillRect(64, 790, 380, 112);

  const warm = ctx.createRadialGradient(246, 322, 6, 246, 332, 260);
  warm.addColorStop(0, "rgba(255, 216, 150, 0.16)");
  warm.addColorStop(1, "rgba(255, 216, 150, 0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 120, canvasEl.width, 520);

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createLoungeRugTexture() {
  if (loungeRugTexture) return loungeRugTexture;

  const canvasEl = document.createElement("canvas");
  canvasEl.width = 1024;
  canvasEl.height = 640;
  const ctx = canvasEl.getContext("2d");

  const base = ctx.createLinearGradient(0, 0, 0, canvasEl.height);
  base.addColorStop(0, "#24211d");
  base.addColorStop(0.5, "#1a1815");
  base.addColorStop(1, "#12100e");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  for (let i = 0; i < textureIterationCount(7600); i += 1) {
    const value = 52 + Math.random() * 62;
    const alpha = 0.03 + Math.random() * 0.05;
    ctx.fillStyle = `rgba(${value}, ${value * 0.92}, ${value * 0.8}, ${alpha})`;
    ctx.fillRect(Math.random() * canvasEl.width, Math.random() * canvasEl.height, 1, 1);
  }

  for (let y = 10; y < canvasEl.height; y += 14) {
    const thread = ctx.createLinearGradient(0, y, canvasEl.width, y + 2);
    thread.addColorStop(0, "rgba(255, 232, 196, 0.018)");
    thread.addColorStop(0.5, "rgba(255, 232, 196, 0.045)");
    thread.addColorStop(1, "rgba(255, 232, 196, 0.015)");
    ctx.fillStyle = thread;
    ctx.fillRect(0, y, canvasEl.width, 1);
  }

  const edgeShade = ctx.createRadialGradient(512, 320, 110, 512, 320, 620);
  edgeShade.addColorStop(0, "rgba(255, 255, 255, 0.025)");
  edgeShade.addColorStop(1, "rgba(0, 0, 0, 0.42)");
  ctx.fillStyle = edgeShade;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  loungeRugTexture = new THREE.CanvasTexture(canvasEl);
  loungeRugTexture.colorSpace = THREE.SRGBColorSpace;
  loungeRugTexture.anisotropy = 2;
  return loungeRugTexture;
}

function createLeatherTexture() {
  if (leatherTexture) return leatherTexture;

  const canvasEl = document.createElement("canvas");
  canvasEl.width = 768;
  canvasEl.height = 512;
  const ctx = canvasEl.getContext("2d");

  const base = ctx.createLinearGradient(0, 0, 0, canvasEl.height);
  base.addColorStop(0, "#211b17");
  base.addColorStop(0.48, "#15110e");
  base.addColorStop(1, "#0c0908");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  for (let i = 0; i < textureIterationCount(6200); i += 1) {
    const value = 38 + Math.random() * 42;
    const alpha = 0.024 + Math.random() * 0.055;
    ctx.fillStyle = `rgba(${value}, ${Math.max(20, value - 7)}, ${Math.max(15, value - 15)}, ${alpha})`;
    ctx.fillRect(Math.random() * canvasEl.width, Math.random() * canvasEl.height, 1, 1);
  }

  for (let y = 64; y < canvasEl.height; y += 96) {
    const seam = ctx.createLinearGradient(0, y - 2, 0, y + 3);
    seam.addColorStop(0, "rgba(255, 236, 210, 0)");
    seam.addColorStop(0.48, "rgba(0, 0, 0, 0.26)");
    seam.addColorStop(0.62, "rgba(255, 236, 210, 0.035)");
    seam.addColorStop(1, "rgba(255, 236, 210, 0)");
    ctx.fillStyle = seam;
    ctx.fillRect(0, y - 3, canvasEl.width, 6);
  }

  const sheen = ctx.createLinearGradient(0, 0, canvasEl.width, canvasEl.height);
  sheen.addColorStop(0, "rgba(255, 226, 196, 0.08)");
  sheen.addColorStop(0.34, "rgba(255, 226, 196, 0.018)");
  sheen.addColorStop(0.55, "rgba(255, 255, 255, 0.055)");
  sheen.addColorStop(1, "rgba(255, 226, 196, 0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  leatherTexture = new THREE.CanvasTexture(canvasEl);
  leatherTexture.colorSpace = THREE.SRGBColorSpace;
  leatherTexture.wrapS = THREE.RepeatWrapping;
  leatherTexture.wrapT = THREE.RepeatWrapping;
  leatherTexture.repeat.set(1.8, 1);
  leatherTexture.anisotropy = 2;
  return leatherTexture;
}

function createArchitecturalGlassTexture() {
  if (glassWallTexture) return glassWallTexture;

  const canvasEl = document.createElement("canvas");
  canvasEl.width = 512;
  canvasEl.height = 1024;
  const ctx = canvasEl.getContext("2d");

  const base = ctx.createLinearGradient(0, 0, canvasEl.width, canvasEl.height);
  base.addColorStop(0, "rgba(180, 200, 210, 0.16)");
  base.addColorStop(0.48, "rgba(22, 26, 27, 0.18)");
  base.addColorStop(1, "rgba(255, 244, 220, 0.08)");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  const diagonal = ctx.createLinearGradient(40, 0, 390, 1024);
  diagonal.addColorStop(0, "rgba(255,255,255,0)");
  diagonal.addColorStop(0.46, "rgba(255,255,255,0.2)");
  diagonal.addColorStop(0.53, "rgba(255,255,255,0.035)");
  diagonal.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = diagonal;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  for (let i = 0; i < textureIterationCount(90); i += 1) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.012 + Math.random() * 0.026})`;
    ctx.fillRect(26 + Math.random() * 460, 60 + Math.random() * 860, 1, 1);
  }

  glassWallTexture = new THREE.CanvasTexture(canvasEl);
  glassWallTexture.colorSpace = THREE.SRGBColorSpace;
  return glassWallTexture;
}

function createGlassReflectionTexture() {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 512;
  canvasEl.height = 1024;
  const ctx = canvasEl.getContext("2d");

  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  const reflection = ctx.createLinearGradient(70, 0, 420, 1024);
  reflection.addColorStop(0, "rgba(255, 255, 255, 0)");
  reflection.addColorStop(0.34, "rgba(255, 255, 255, 0.04)");
  reflection.addColorStop(0.48, "rgba(255, 255, 255, 0.23)");
  reflection.addColorStop(0.62, "rgba(255, 255, 255, 0.035)");
  reflection.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = reflection;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  const softbox = ctx.createLinearGradient(0, 42, 512, 210);
  softbox.addColorStop(0, "rgba(255, 255, 255, 0)");
  softbox.addColorStop(0.5, "rgba(255, 244, 220, 0.18)");
  softbox.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = softbox;
  ctx.fillRect(0, 54, canvasEl.width, 150);

  for (let i = 0; i < textureIterationCount(115); i += 1) {
    const x = 36 + Math.random() * 440;
    const y = 110 + Math.random() * 780;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.015 + Math.random() * 0.035})`;
    ctx.fillRect(x, y, 1, 1);
  }

  const shadow = ctx.createLinearGradient(0, 0, 0, 1024);
  shadow.addColorStop(0, "rgba(0, 0, 0, 0.04)");
  shadow.addColorStop(0.5, "rgba(0, 0, 0, 0)");
  shadow.addColorStop(1, "rgba(0, 0, 0, 0.28)");
  ctx.fillStyle = shadow;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function getContactShadowTexture() {
  if (contactShadowTexture) return contactShadowTexture;

  const canvasEl = document.createElement("canvas");
  canvasEl.width = 512;
  canvasEl.height = 512;
  const ctx = canvasEl.getContext("2d");
  ctx.clearRect(0, 0, 512, 512);
  ctx.save();
  ctx.translate(256, 256);
  ctx.scale(1, 0.42);
  const shadow = ctx.createRadialGradient(0, 0, 20, 0, 0, 246);
  shadow.addColorStop(0, "rgba(0, 0, 0, 0.54)");
  shadow.addColorStop(0.35, "rgba(0, 0, 0, 0.26)");
  shadow.addColorStop(0.72, "rgba(0, 0, 0, 0.075)");
  shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = shadow;
  ctx.fillRect(-256, -256, 512, 512);
  ctx.restore();

  contactShadowTexture = new THREE.CanvasTexture(canvasEl);
  return contactShadowTexture;
}

function getWallContactShadowTexture() {
  if (wallContactShadowTexture) return wallContactShadowTexture;

  const canvasEl = document.createElement("canvas");
  canvasEl.width = 512;
  canvasEl.height = 768;
  const ctx = canvasEl.getContext("2d");
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.save();
  ctx.translate(256, 386);
  ctx.scale(0.64, 1);
  const shadow = ctx.createRadialGradient(0, 0, 18, 0, 0, 330);
  shadow.addColorStop(0, "rgba(0, 0, 0, 0.45)");
  shadow.addColorStop(0.48, "rgba(0, 0, 0, 0.18)");
  shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = shadow;
  ctx.fillRect(-360, -420, 720, 840);
  ctx.restore();

  wallContactShadowTexture = new THREE.CanvasTexture(canvasEl);
  return wallContactShadowTexture;
}

function createStudioEnvironmentTexture() {
  if (studioEnvironmentTexture) return studioEnvironmentTexture;

  function face(top, bottom, glow) {
    const canvasEl = document.createElement("canvas");
    canvasEl.width = 256;
    canvasEl.height = 256;
    const ctx = canvasEl.getContext("2d");
    const base = ctx.createLinearGradient(0, 0, 0, 256);
    base.addColorStop(0, top);
    base.addColorStop(1, bottom);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);

    const g = ctx.createRadialGradient(128, 82, 6, 128, 98, 160);
    g.addColorStop(0, glow);
    g.addColorStop(0.45, glow.replace("0.68", "0.18").replace("0.56", "0.15"));
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = "rgba(255, 244, 218, 0.16)";
    ctx.fillRect(32, 54, 192, 8);
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(0, 216, 256, 40);
    return canvasEl;
  }

  studioEnvironmentTexture = new THREE.CubeTexture([
    face("#312a20", "#070707", "rgba(255, 221, 165, 0.56)"),
    face("#1d2225", "#060707", "rgba(169, 206, 255, 0.18)"),
    face("#4a3a24", "#16100a", "rgba(255, 237, 205, 0.68)"),
    face("#171717", "#060606", "rgba(95, 110, 120, 0.12)"),
    face("#2f2922", "#070707", "rgba(255, 219, 157, 0.52)"),
    face("#181a1b", "#050505", "rgba(190, 216, 255, 0.14)")
  ]);
  studioEnvironmentTexture.colorSpace = THREE.SRGBColorSpace;
  studioEnvironmentTexture.needsUpdate = true;
  return studioEnvironmentTexture;
}

function createStudio() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x11100e);
  scene.environment = createStudioEnvironmentTexture();
  scene.fog = new THREE.Fog(0x11100e, 15.5, 34);

  const portraitViewport = window.innerHeight > window.innerWidth;
  const cameraFov = portraitViewport ? 62 : 54;
  camera = new THREE.PerspectiveCamera(cameraFov, window.innerWidth / window.innerHeight, 0.1, 80);
  const basePose = galleryCameraPose();
  lookState.basePosition = basePose.position;
  lookState.baseTarget = basePose.target;
  camera.position.copy(basePose.position);
  camera.lookAt(basePose.target);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isLowTierDevice(),
    alpha: false,
    depth: true,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(currentRenderPixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = quality === "lite" ? 1.46 : 1.66;
  renderer.shadowMap.enabled = realtimeShadowsEnabled();
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  const ambient = new THREE.HemisphereLight(0xfff1df, 0x1f1a15, quality === "lite" ? 1.36 : 1.26);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffecd2, quality === "lite" ? 2.2 : 2.3);
  key.position.set(-4.2, 5.9, 4.35);
  key.castShadow = realtimeShadowsEnabled();
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -7.4;
  key.shadow.camera.right = 7.4;
  key.shadow.camera.top = 5.3;
  key.shadow.camera.bottom = -1.4;
  key.shadow.camera.near = 0.6;
  key.shadow.camera.far = 13.5;
  key.shadow.bias = -0.00028;
  key.shadow.normalBias = 0.018;
  scene.add(key);

  if (fullSceneDetail()) {
    const rim = new THREE.DirectionalLight(0xb8c7ff, 0.28);
    rim.position.set(5.2, 3.4, -2.4);
    scene.add(rim);

    const fill = new THREE.PointLight(0xffd9ad, 0.82, 11.5, 2.2);
    fill.position.set(-1.9, 2.62, 2.65);
    scene.add(fill);

    const glassFill = new THREE.PointLight(0xc8ddff, 0.34, 8.5, 2.4);
    glassFill.position.set(-5.85, 2.05, -1.4);
    scene.add(glassFill);
  }

  const floorMat = createGalleryMaterial({
    color: 0x6a655d,
    map: createFloorTexture(),
    bumpMap: createSurfaceBumpTexture("floor"),
    bumpScale: 0.018,
    roughness: 0.26,
    metalness: 0.04,
    clearcoat: 0.34,
    clearcoatRoughness: 0.62,
    envMapIntensity: 1.08
  });
  const wallMat = createGalleryMaterial({
    color: 0x514d45,
    map: createWallTexture(),
    bumpMap: createSurfaceBumpTexture("wall"),
    bumpScale: 0.012,
    roughness: 0.88,
    metalness: 0.02,
    emissive: 0x070604,
    emissiveIntensity: quality === "lite" ? 0.28 : 0.36,
    clearcoat: 0.04,
    clearcoatRoughness: 0.9,
    envMapIntensity: 0.24
  });
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0x3c372f,
    map: createCeilingPhotoTexture(),
    roughness: 0.72,
    metalness: 0.03,
    emissive: 0x090706,
    emissiveIntensity: 0.44,
    envMapIntensity: 0.22
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(STUDIO.width, STUDIO.depth), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0.1);
  floor.receiveShadow = realtimeShadowsEnabled();
  scene.add(floor);

  const floorReflection = new THREE.Mesh(
    new THREE.PlaneGeometry(STUDIO.width * 0.82, 4.9),
    new THREE.MeshBasicMaterial({
      map: createFloorReflectionTexture(),
      transparent: true,
      opacity: quality === "lite" ? 0.68 : 0.82,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    })
  );
  floorReflection.rotation.x = -Math.PI / 2;
  floorReflection.position.set(0, 0.038, -2.72);
  scene.add(floorReflection);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(STUDIO.width, STUDIO.depth), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, STUDIO.ceilingY, 0.1);
  ceiling.receiveShadow = realtimeShadowsEnabled();
  scene.add(ceiling);

  const ceilingDetail = new THREE.Mesh(
    new THREE.PlaneGeometry(STUDIO.width, STUDIO.depth),
    new THREE.MeshBasicMaterial({
      map: createCeilingPhotoTexture(),
      transparent: false,
      depthWrite: true,
      side: THREE.DoubleSide,
      toneMapped: false
    })
  );
  ceilingDetail.rotation.x = Math.PI / 2;
  ceilingDetail.position.set(0, STUDIO.ceilingY - 0.026, 0.1);
  scene.add(ceilingDetail);

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(STUDIO.width, STUDIO.wallHeight), wallMat);
  backWall.position.set(0, STUDIO.wallHeight / 2, STUDIO.backZ);
  backWall.receiveShadow = realtimeShadowsEnabled();
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(STUDIO.depth, STUDIO.wallHeight), wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-STUDIO.width / 2, STUDIO.wallHeight / 2, 0.1);
  leftWall.receiveShadow = realtimeShadowsEnabled();
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(STUDIO.depth, STUDIO.wallHeight), wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(STUDIO.width / 2, STUDIO.wallHeight / 2, 0.1);
  rightWall.receiveShadow = realtimeShadowsEnabled();
  scene.add(rightWall);

  const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(STUDIO.width, STUDIO.wallHeight), wallMat);
  frontWall.rotation.y = Math.PI;
  frontWall.position.set(0, STUDIO.wallHeight / 2, STUDIO.frontZ - 0.06);
  frontWall.receiveShadow = realtimeShadowsEnabled();
  scene.add(frontWall);

  addPhysicalStoneSlabRelief();
  addStoneSlabMaterialOverlays();
  addArchitecturalDetails();
  addHeroWallLighting();
  addGlassWallFeature();
  addFloorReflectionDecals();
  addCeilingBaffles();
  addGallerySeatingAndLighting();
}

function addHeroWallLighting() {
  const heroStations = stations.filter((station) => (
    station.position.z < STUDIO.backZ + 0.5 && nearRotation(station.rotation.y, 0)
  ));
  const washTexture = createHeroWallWashTexture();
  const washMat = new THREE.MeshBasicMaterial({
    map: washTexture,
    transparent: true,
    opacity: quality === "lite" ? 1 : 1,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });

  heroStations.forEach((station) => {
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 3.5), washMat.clone());
    wash.position.set(station.position.x, 1.96, STUDIO.backZ + 0.052);
    scene.add(wash);
  });

  const coveSpill = new THREE.Mesh(
    new THREE.PlaneGeometry(STUDIO.width - 1.05, 1.08),
    new THREE.MeshBasicMaterial({
      map: createCoveSpillTexture(),
      transparent: true,
      opacity: quality === "lite" ? 1 : 1,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    })
  );
  coveSpill.position.set(0, STUDIO.ceilingY - 0.46, STUDIO.backZ + 0.058);
  scene.add(coveSpill);

  const ceilingSpill = new THREE.Mesh(
    new THREE.PlaneGeometry(STUDIO.width - 1.15, 1.6),
    new THREE.MeshBasicMaterial({
      map: createCoveSpillTexture(),
      transparent: true,
      opacity: quality === "lite" ? 0.62 : 0.76,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    })
  );
  ceilingSpill.rotation.x = Math.PI / 2;
  ceilingSpill.position.set(0, STUDIO.ceilingY - 0.024, STUDIO.backZ + 0.82);
  scene.add(ceilingSpill);

  const grooveMat = new THREE.MeshBasicMaterial({
    color: 0x090908,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    toneMapped: false
  });
  [-4.35, -1.45, 1.45, 4.35].forEach((x) => {
    const groove = new THREE.Mesh(new THREE.PlaneGeometry(0.028, STUDIO.wallHeight - 0.44), grooveMat);
    groove.position.set(x, STUDIO.wallHeight / 2, STUDIO.backZ + 0.06);
    scene.add(groove);
  });
}

function addFloorReflectionDecals() {
  const heroStations = stations.filter((station) => (
    station.position.z < STUDIO.backZ + 0.5 && nearRotation(station.rotation.y, 0)
  ));
  const poolTexture = createFloorLightPoolTexture();
  const screenReflectionTexture = createScreenFloorReflectionTexture();
  heroStations.forEach((station) => {
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(2.35, 4.25),
      new THREE.MeshBasicMaterial({
        map: poolTexture,
        transparent: true,
      opacity: quality === "lite" ? 0.78 : 0.92,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false
      })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(station.position.x, 0.043, -3.28);
    scene.add(pool);

    const screenReflection = new THREE.Mesh(
      new THREE.PlaneGeometry(1.05, 3.25),
      new THREE.MeshBasicMaterial({
        map: screenReflectionTexture,
        transparent: true,
        opacity: quality === "lite" ? 0.34 : 0.48,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false
      })
    );
    screenReflection.rotation.x = -Math.PI / 2;
    screenReflection.position.set(station.position.x, 0.046, -3.72);
    scene.add(screenReflection);
  });

  const glassReflection = new THREE.Mesh(
    new THREE.PlaneGeometry(2.25, 5.7),
    new THREE.MeshBasicMaterial({
      map: createFloorLightPoolTexture(),
      transparent: true,
      opacity: quality === "lite" ? 0.28 : 0.36,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    })
  );
  glassReflection.rotation.x = -Math.PI / 2;
  glassReflection.rotation.z = -0.08;
  glassReflection.position.set(-4.9, 0.044, -1.2);
  scene.add(glassReflection);
}

function addArchitecturalDetails() {
  const shadowLineMat = new THREE.MeshStandardMaterial({
    color: 0x0a0908,
    roughness: 0.72,
    metalness: 0.18,
    envMapIntensity: 0.18
  });
  const baseboardMat = createGalleryMaterial({
    color: 0x14120f,
    roughness: 0.48,
    metalness: 0.28,
    clearcoat: 0.18,
    clearcoatRoughness: 0.42,
    envMapIntensity: 0.38
  });

  [
    { size: [STUDIO.width - 0.38, 0.065, 0.035], position: [0, 0.09, STUDIO.backZ + 0.032], rotation: [0, 0, 0] },
    { size: [STUDIO.width - 0.38, 0.065, 0.035], position: [0, 0.09, STUDIO.frontZ - 0.092], rotation: [0, Math.PI, 0] },
    { size: [STUDIO.depth - 0.44, 0.065, 0.035], position: [-STUDIO.width / 2 + 0.032, 0.09, 0.1], rotation: [0, Math.PI / 2, 0] },
    { size: [STUDIO.depth - 0.44, 0.065, 0.035], position: [STUDIO.width / 2 - 0.032, 0.09, 0.1], rotation: [0, -Math.PI / 2, 0] }
  ].forEach(({ size, position, rotation }) => {
    const baseboard = new THREE.Mesh(new THREE.BoxGeometry(...size), baseboardMat);
    baseboard.position.set(position[0], position[1], position[2]);
    baseboard.rotation.set(rotation[0], rotation[1], rotation[2]);
    baseboard.castShadow = realtimeShadowsEnabled();
    baseboard.receiveShadow = realtimeShadowsEnabled();
    scene.add(baseboard);
  });

  const coveMat = new THREE.MeshBasicMaterial({
    color: 0xe8d7bd,
    transparent: true,
    opacity: quality === "lite" ? 0.22 : 0.34,
    depthWrite: false,
    toneMapped: false
  });

  [
    { size: [STUDIO.width - 0.8, 0.018, 0.055], position: [0, STUDIO.ceilingY - 0.16, STUDIO.backZ + 0.18], rotation: [0, 0, 0] },
    { size: [STUDIO.width - 0.8, 0.018, 0.055], position: [0, STUDIO.ceilingY - 0.16, STUDIO.frontZ - 0.24], rotation: [0, Math.PI, 0] },
    { size: [0.055, 0.018, STUDIO.depth - 0.9], position: [-STUDIO.width / 2 + 0.18, STUDIO.ceilingY - 0.16, 0.08], rotation: [0, Math.PI / 2, 0] },
    { size: [0.055, 0.018, STUDIO.depth - 0.9], position: [STUDIO.width / 2 - 0.18, STUDIO.ceilingY - 0.16, 0.08], rotation: [0, -Math.PI / 2, 0] }
  ].forEach(({ size, position, rotation }) => {
    const cove = new THREE.Mesh(new THREE.BoxGeometry(...size), coveMat);
    cove.position.set(position[0], position[1], position[2]);
    cove.rotation.set(rotation[0], rotation[1], rotation[2]);
    scene.add(cove);
  });

  [
    { size: [STUDIO.width - 0.7, 0.022, 0.028], position: [0, STUDIO.ceilingY - 0.11, STUDIO.backZ + 0.07], rotation: [0, 0, 0] },
    { size: [STUDIO.width - 0.7, 0.022, 0.028], position: [0, STUDIO.ceilingY - 0.11, STUDIO.frontZ - 0.13], rotation: [0, Math.PI, 0] },
    { size: [STUDIO.depth - 0.8, 0.022, 0.028], position: [-STUDIO.width / 2 + 0.07, STUDIO.ceilingY - 0.11, 0.1], rotation: [0, Math.PI / 2, 0] },
    { size: [STUDIO.depth - 0.8, 0.022, 0.028], position: [STUDIO.width / 2 - 0.07, STUDIO.ceilingY - 0.11, 0.1], rotation: [0, -Math.PI / 2, 0] }
  ].forEach(({ size, position, rotation }) => {
    const reveal = new THREE.Mesh(new THREE.BoxGeometry(...size), shadowLineMat);
    reveal.position.set(position[0], position[1], position[2]);
    reveal.rotation.set(rotation[0], rotation[1], rotation[2]);
    scene.add(reveal);
  });
}

function addGallerySeatingAndLighting() {
  const leatherMat = createGalleryMaterial({
    color: 0x3a261b,
    map: createLeatherTexture(),
    roughness: 0.34,
    metalness: 0.04,
    clearcoat: 0.44,
    clearcoatRoughness: 0.46,
    sheen: 0.22,
    sheenColor: new THREE.Color(0x3a2418),
    envMapIntensity: 0.92
  });
  const blackMetalMat = createGalleryMaterial({
    color: 0x080807,
    roughness: 0.34,
    metalness: 0.82,
    clearcoat: 0.16,
    clearcoatRoughness: 0.4,
    envMapIntensity: 0.5
  });
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffd6a4,
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });

  const benchGroup = new THREE.Group();
  benchGroup.position.set(-1.55, 0.42, 0.28);
  benchGroup.rotation.y = -0.04;

  const cushion = new THREE.Mesh(createBeveledPlateGeometry(3.42, 1.18, 0.055, 0.22, 0.012), leatherMat);
  cushion.rotation.x = -Math.PI / 2;
  cushion.castShadow = realtimeShadowsEnabled();
  cushion.receiveShadow = realtimeShadowsEnabled();
  benchGroup.add(cushion);

  const cushionSheen = new THREE.Mesh(
    new THREE.PlaneGeometry(3.18, 1.02),
    new THREE.MeshBasicMaterial({
      color: 0xffdfb0,
      transparent: true,
      opacity: quality === "lite" ? 0.1 : 0.15,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    })
  );
  cushionSheen.rotation.x = -Math.PI / 2;
  cushionSheen.position.y = 0.135;
  benchGroup.add(cushionSheen);

  const leatherTop = new THREE.Mesh(
    new THREE.PlaneGeometry(3.1, 0.98),
    new THREE.MeshBasicMaterial({
      map: createLeatherTexture(),
      color: 0x513323,
      transparent: true,
      opacity: quality === "lite" ? 0.5 : 0.62,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    })
  );
  leatherTop.rotation.x = -Math.PI / 2;
  leatherTop.position.y = 0.142;
  benchGroup.add(leatherTop);

  const lowerBase = new THREE.Mesh(new THREE.BoxGeometry(3.16, 0.15, 0.94), blackMetalMat);
  lowerBase.position.y = -0.2;
  lowerBase.castShadow = realtimeShadowsEnabled();
  lowerBase.receiveShadow = realtimeShadowsEnabled();
  benchGroup.add(lowerBase);

  [
    [-1.36, -0.41],
    [1.36, -0.41],
    [-1.36, 0.41],
    [1.36, 0.41]
  ].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.08), blackMetalMat);
    leg.position.set(x, -0.42, z);
    leg.castShadow = realtimeShadowsEnabled();
    benchGroup.add(leg);
  });

  scene.add(benchGroup);
  addContactShadow(3.72, 1.56, new THREE.Vector3(-1.55, 0.046, 0.28), 0.48, 0.04);
  addGalleryCollider(-1.55, 0.28, 1.9, 0.84);

  const benchReflection = new THREE.Mesh(
    new THREE.PlaneGeometry(3.7, 1.68),
    new THREE.MeshBasicMaterial({
      map: createFloorReflectionTexture(),
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    })
  );
  benchReflection.rotation.x = -Math.PI / 2;
  benchReflection.rotation.z = 0.04;
  benchReflection.position.set(-1.55, 0.041, 0.28);
  scene.add(benchReflection);

  const wallSconces = [
    { position: [-5.86, 2.36, -5.92], rotationY: 0 },
    { position: [5.86, 2.36, -5.92], rotationY: 0 },
    { position: [-6.58, 2.36, -2.25], rotationY: Math.PI / 2 },
    { position: [6.58, 2.36, 2.25], rotationY: -Math.PI / 2 },
    { position: [-2.2, 2.36, 6.18], rotationY: Math.PI },
    { position: [5.58, 2.36, 6.18], rotationY: Math.PI }
  ];
  wallSconces.forEach(({ position, rotationY }) => {
    const sconce = new THREE.Group();
    sconce.position.set(position[0], position[1], position[2]);
    sconce.rotation.y = rotationY;

    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.055, 0.035), blackMetalMat);
    plate.castShadow = realtimeShadowsEnabled();
    sconce.add(plate);

    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.72), glowMat.clone());
    glow.material.opacity = quality === "lite" ? 0.055 : 0.085;
    glow.position.set(0, -0.24, 0.026);
    sconce.add(glow);
    scene.add(sconce);
  });
}

function addContactShadow(width, depth, position, opacity, rotationZ = 0) {
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({
      map: getContactShadowTexture(),
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.rotation.z = rotationZ;
  shadow.position.copy(position);
  scene.add(shadow);
  return shadow;
}

function addGalleryCollider(x, z, halfX, halfZ) {
  galleryColliders.push({ x, z, halfX, halfZ });
}

function addWallExhibitCollider(position, rotationY, width = 2.9, depth = 0.9) {
  const facesBackOrFront = Math.abs(Math.sin(rotationY)) < 0.5;
  addGalleryCollider(
    position.x,
    position.z,
    facesBackOrFront ? width / 2 : depth / 2,
    facesBackOrFront ? depth / 2 : width / 2
  );
}

function collidesWithGallery(position) {
  return galleryColliders.some((collider) => (
    Math.abs(position.x - collider.x) < collider.halfX + PLAYER_RADIUS &&
    Math.abs(position.z - collider.z) < collider.halfZ + PLAYER_RADIUS
  ));
}

function applyGalleryCollision(previous, proposed) {
  const next = previous.clone();
  const tryX = next.clone();
  tryX.x = proposed.x;
  clampGalleryPosition(tryX);
  if (!collidesWithGallery(tryX)) {
    next.x = tryX.x;
  }

  const tryZ = next.clone();
  tryZ.z = proposed.z;
  clampGalleryPosition(tryZ);
  if (!collidesWithGallery(tryZ)) {
    next.z = tryZ.z;
  }

  next.y = proposed.y;
  clampGalleryPosition(next);
  return next;
}

function collisionProbeForVerifier() {
  if (!THREE || !galleryColliders.length) return "colliders:0;blocked:0;safe:0;endpointClear:0;clamp:0";

  const blockedCenters = galleryColliders.filter((collider) => (
    collidesWithGallery(new THREE.Vector3(collider.x, 1.6, collider.z))
  )).length;
  const safePoint = new THREE.Vector3(4.8, 1.6, 4.8);
  const safeClear = !collidesWithGallery(safePoint);
  const targetCollider = galleryColliders[0];
  const blockedTarget = new THREE.Vector3(targetCollider.x, 1.6, targetCollider.z);
  const resolved = applyGalleryCollision(safePoint, blockedTarget);
  const endpointClear = !collidesWithGallery(resolved);
  const outside = new THREE.Vector3(999, 9, -999);
  clampGalleryPosition(outside);
  const clampOk = outside.x <= 5.46 && outside.x >= -5.46 && outside.z <= 5.86 && outside.z >= -4.72 && outside.y <= 1.95 && outside.y >= 1.34;

  return [
    `colliders:${galleryColliders.length}`,
    `blocked:${blockedCenters}`,
    `safe:${safeClear ? 1 : 0}`,
    `endpointClear:${endpointClear ? 1 : 0}`,
    `clamp:${clampOk ? 1 : 0}`
  ].join(";");
}

function addPhysicalStoneSlabRelief() {
  const slabMaterialBase = {
    roughness: 0.86,
    metalness: 0.03,
    clearcoat: 0.02,
    clearcoatRoughness: 0.92,
    envMapIntensity: 0.18
  };
  const slabLayout = [
    { x: -4.66, width: 2.02, color: 0x413d36, depth: 0.018 },
    { x: -2.56, width: 1.98, color: 0x36332e, depth: 0.024 },
    { x: -0.42, width: 2.1, color: 0x47423a, depth: 0.014 },
    { x: 1.78, width: 2.02, color: 0x38352f, depth: 0.026 },
    { x: 4.0, width: 2.1, color: 0x464037, depth: 0.019 }
  ];

  slabLayout.forEach((slab, index) => {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(slab.width, STUDIO.wallHeight - 0.56, slab.depth),
      createGalleryMaterial({
        ...slabMaterialBase,
        color: slab.color,
        emissive: 0x050403,
        emissiveIntensity: quality === "lite" ? 0.08 : 0.12
      })
    );
    panel.position.set(slab.x, STUDIO.wallHeight / 2 - 0.02, STUDIO.backZ + 0.012 + index * 0.0015);
    panel.receiveShadow = realtimeShadowsEnabled();
    scene.add(panel);
  });

  const seamMat = new THREE.MeshBasicMaterial({
    color: 0x080706,
    transparent: true,
    opacity: quality === "lite" ? 0.16 : 0.24,
    depthWrite: false,
    toneMapped: false
  });

  [-3.58, -1.5, 0.72, 2.88, 5.04].forEach((x) => {
    const recess = new THREE.Mesh(new THREE.BoxGeometry(0.018, STUDIO.wallHeight - 0.68, 0.012), seamMat);
    recess.position.set(x, STUDIO.wallHeight / 2 - 0.02, STUDIO.backZ + 0.047);
    scene.add(recess);
  });
}

function addStoneSlabMaterialOverlays() {
  const overlay = new THREE.Mesh(
    new THREE.PlaneGeometry(STUDIO.width - 0.42, STUDIO.wallHeight - 0.3),
    new THREE.MeshBasicMaterial({
      map: createBackWallShowroomTexture(),
      transparent: true,
      opacity: quality === "lite" ? 0.78 : 0.88,
      depthWrite: false,
      toneMapped: false
    })
  );
  overlay.position.set(0, STUDIO.wallHeight / 2, STUDIO.backZ + 0.042);
  scene.add(overlay);

  [
    { x: -STUDIO.width / 2 + 0.042, rotationY: Math.PI / 2, texture: createLeftWallShowroomTexture() },
    { x: STUDIO.width / 2 - 0.042, rotationY: -Math.PI / 2, texture: createRightWallShowroomTexture() }
  ].forEach(({ x, rotationY, texture }) => {
    const sideOverlay = new THREE.Mesh(
      new THREE.PlaneGeometry(STUDIO.depth - 0.42, STUDIO.wallHeight - 0.3),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: quality === "lite" ? 0.68 : 0.76,
        depthWrite: false,
        toneMapped: false
      })
    );
    sideOverlay.rotation.y = rotationY;
    sideOverlay.position.set(x, STUDIO.wallHeight / 2, 0.1);
    scene.add(sideOverlay);
  });

  const frontOverlay = new THREE.Mesh(
    new THREE.PlaneGeometry(STUDIO.width - 0.42, STUDIO.wallHeight - 0.3),
    new THREE.MeshBasicMaterial({
      map: createFrontWallShowroomTexture(),
      transparent: true,
      opacity: quality === "lite" ? 0.58 : 0.66,
      depthWrite: false,
      toneMapped: false
    })
  );
  frontOverlay.rotation.y = Math.PI;
  frontOverlay.position.set(0, STUDIO.wallHeight / 2, STUDIO.frontZ - 0.112);
  scene.add(frontOverlay);

}

function addGlassWallFeature() {
  const glassMat = new THREE.MeshBasicMaterial({
    map: createArchitecturalGlassTexture(),
    transparent: true,
    opacity: quality === "lite" ? 0.48 : 0.64,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const mullionMat = createGalleryMaterial({
    color: 0x050505,
    roughness: 0.32,
    metalness: 0.84,
    clearcoat: 0.12,
    clearcoatRoughness: 0.42,
    envMapIntensity: 0.48
  });
  const glassGroup = new THREE.Group();
  glassGroup.position.set(-5.42, 1.82, -2.42);
  glassGroup.rotation.y = Math.PI / 2;

  const garden = new THREE.Mesh(
    new THREE.PlaneGeometry(5.78, 2.84),
    new THREE.MeshBasicMaterial({
      map: createGardenSilhouetteTexture(),
      transparent: true,
      opacity: quality === "lite" ? 0.66 : 0.82,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    })
  );
  garden.position.z = -0.028;
  glassGroup.add(garden);

  const glass = new THREE.Mesh(new THREE.PlaneGeometry(5.78, 2.9), glassMat);
  glass.position.z = 0.012;
  glassGroup.add(glass);

  [-2.89, -0.96, 0.96, 2.89].forEach((x) => {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.035, 2.96, 0.055), mullionMat);
    mullion.position.set(x, 0, 0.035);
    glassGroup.add(mullion);
  });

  [-1.45, 1.45].forEach((y) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(5.88, 0.035, 0.055), mullionMat);
    rail.position.set(0, y, 0.035);
    glassGroup.add(rail);
  });

  const reflectedCove = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 0.18),
    new THREE.MeshBasicMaterial({
      color: 0xf2d4a8,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      toneMapped: false
    })
  );
  reflectedCove.position.set(0, 1.18, 0.045);
  glassGroup.add(reflectedCove);

  scene.add(glassGroup);
  addGalleryCollider(-5.42, -2.42, 0.24, 3.06);
}

function addCeilingBaffles() {
  const trackMat = new THREE.MeshStandardMaterial({
    color: 0x080807,
    roughness: 0.52,
    metalness: 0.62,
    envMapIntensity: 0.3
  });
  const fixtureMat = createGalleryMaterial({
    color: 0x11100e,
    roughness: 0.38,
    metalness: 0.74,
    clearcoat: 0.18,
    clearcoatRoughness: 0.32,
    envMapIntensity: 0.48
  });
  const lensMat = new THREE.MeshBasicMaterial({
    color: 0xffdfb0,
    transparent: true,
    opacity: 0.72,
    toneMapped: false
  });

  [
    { size: [STUDIO.width - 2.0, 0.034, 0.052], position: [0, STUDIO.ceilingY - 0.18, STUDIO.backZ + 1.05] },
    { size: [STUDIO.width - 2.2, 0.034, 0.052], position: [0, STUDIO.ceilingY - 0.18, STUDIO.frontZ - 1.25] },
    { size: [0.052, 0.034, STUDIO.depth - 2.4], position: [-STUDIO.width / 2 + 1.05, STUDIO.ceilingY - 0.18, 0] },
    { size: [0.052, 0.034, STUDIO.depth - 2.4], position: [STUDIO.width / 2 - 1.05, STUDIO.ceilingY - 0.18, 0] }
  ].forEach((track) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(...track.size), trackMat);
    rail.position.set(track.position[0], track.position[1], track.position[2]);
    rail.receiveShadow = realtimeShadowsEnabled();
    scene.add(rail);
  });

  const addFixture = (position, targetPosition, rotationY = 0) => {
    const fixture = new THREE.Group();
    fixture.position.copy(position);
    fixture.rotation.y = rotationY;

    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.022, 0.2), fixtureMat);
    fixture.add(yoke);

    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.074, 0.17, quality === "lite" ? 10 : 18), fixtureMat);
    can.rotation.x = Math.PI / 2;
    can.position.y = -0.082;
    can.castShadow = realtimeShadowsEnabled();
    fixture.add(can);

    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.052, quality === "lite" ? 10 : 18), lensMat);
    lens.rotation.x = -Math.PI / 2;
    lens.position.set(0, -0.082, 0.09);
    fixture.add(lens);
    scene.add(fixture);
  };

  stations.forEach((station, index) => {
    const rotation = new THREE.Euler(station.rotation.x, station.rotation.y, station.rotation.z);
    const normal = new THREE.Vector3(0, 0, 1).applyEuler(rotation).normalize();
    const side = new THREE.Vector3(1, 0, 0).applyEuler(rotation).normalize();
    const lightPosition = new THREE.Vector3(
      station.position.x + normal.x * 0.32,
      STUDIO.ceilingY - 0.12,
      station.position.z + normal.z * 0.32
    ).add(side.multiplyScalar(index % 2 === 0 ? -1.36 : 1.36));
    const targetPosition = new THREE.Vector3(station.position.x, 1.74, station.position.z);
    addFixture(lightPosition, targetPosition, station.rotation.y);
  });

  [
    { position: new THREE.Vector3(-1.6, STUDIO.ceilingY - 0.36, 0.72), target: new THREE.Vector3(-1.2, 0.62, 0.52), rotationY: -0.18 },
    { position: new THREE.Vector3(1.6, STUDIO.ceilingY - 0.36, -0.64), target: new THREE.Vector3(1.2, 0.62, -0.44), rotationY: Math.PI - 0.18 }
  ].forEach(({ position, target, rotationY }) => addFixture(position, target, rotationY));
}

function addStudioSignage() {
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.95, 1.1),
    new THREE.MeshBasicMaterial({
      map: createSignTexture(
        "Showcase Designs",
        "Studio Gallery",
        "A walk-through view of active client websites and conversion systems."
      ),
      transparent: true,
      toneMapped: false
    })
  );
  sign.position.set(-STUDIO.width / 2 + 0.035, 2.32, 2.85);
  sign.rotation.y = Math.PI / 2;
  scene.add(sign);
}

function addGrowthGallery() {
  if (!growthExhibits.length) return;

  const rotation = new THREE.Euler(0, -Math.PI / 2, 0);
  const frameMat = new THREE.MeshBasicMaterial({
    color: 0x5a4630,
    transparent: true,
    opacity: 0.16
  });

  const header = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 0.52),
    new THREE.MeshBasicMaterial({
      map: createGrowthHeaderTexture(),
      transparent: true,
      depthWrite: false,
      toneMapped: false
    })
  );
  header.position.set(4.965, 3.08, 2.18);
  header.rotation.copy(rotation);
  scene.add(header);

  growthExhibits.slice(0, 2).forEach((exhibit, index) => {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.98, 1.24),
      new THREE.MeshBasicMaterial({
        map: createGrowthTexture(exhibit),
        transparent: true,
        depthWrite: false,
        toneMapped: false
      })
    );
    const y = 2.28 - index * 1.34;
    const z = 2.18;
    panel.position.set(4.958, y, z);
    panel.rotation.copy(rotation);
    scene.add(panel);

    [
      { size: [0.026, 0.026, 2.12], position: [4.94, y + 0.69, z] },
      { size: [0.026, 0.026, 2.12], position: [4.94, y - 0.69, z] },
      { size: [0.026, 1.36, 0.026], position: [4.94, y, z - 1.06] },
      { size: [0.026, 1.36, 0.026], position: [4.94, y, z + 1.06] }
    ].forEach((line) => {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(...line.size), frameMat.clone());
      frame.position.set(line.position[0], line.position[1], line.position[2]);
      scene.add(frame);
    });
  });

  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 3.45), frameMat.clone());
  rail.position.set(4.9, 1.1, 2.18);
  scene.add(rail);
}

function getStationSideVector(object) {
  return new THREE.Vector3(1, 0, 0).applyEuler(object.group.rotation).normalize();
}

function createBeveledPlateGeometry(width, height, radius, depth, bevel) {
  const geometry = new THREE.ExtrudeGeometry(roundedRectShape(width, height, radius), {
    depth,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: seamlessMode() ? quality === "lite" ? 1 : 4 : quality === "lite" ? 3 : 7,
    curveSegments: seamlessMode() ? quality === "lite" ? 8 : 18 : quality === "lite" ? 16 : 28
  });
  geometry.translate(0, 0, -depth * 0.5);
  return geometry;
}

function createStation(station, index) {
  const group = new THREE.Group();
  group.position.set(station.position.x, station.position.y, station.position.z);
  group.rotation.set(station.rotation.x, station.rotation.y, station.rotation.z);
  group.scale.setScalar(STATION_SCALE);
  group.userData.stationId = station.id;
  const panelWidth = 1.5;
  const panelHeight = 2.64;
  const frameBar = 0.036;
  const frameDepth = 0.082;

  const bodyMaterial = createGalleryMaterial({
    color: 0x050504,
    roughness: 0.38,
    metalness: 0.48,
    clearcoat: 0.16,
    clearcoatRoughness: 0.46,
    envMapIntensity: 0.42,
    emissive: 0x000000,
    emissiveIntensity: 0
  });
  const frameMaterial = createGalleryMaterial({
    color: 0x090807,
    roughness: 0.26,
    metalness: 0.84,
    clearcoat: 0.18,
    clearcoatRoughness: 0.32,
    envMapIntensity: 0.72,
    emissive: 0x020101,
    emissiveIntensity: 0.01
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(panelWidth + 0.15, panelHeight + 0.15, 0.052), bodyMaterial);
  body.position.set(0, 0.25, 0.038);
  body.castShadow = realtimeShadowsEnabled();
  body.receiveShadow = realtimeShadowsEnabled();
  group.add(body);

  [
    { size: [panelWidth + frameBar * 2, frameBar, frameDepth], position: [0, 0.25 + panelHeight / 2 + frameBar / 2, 0.104] },
    { size: [panelWidth + frameBar * 2, frameBar, frameDepth], position: [0, 0.25 - panelHeight / 2 - frameBar / 2, 0.104] },
    { size: [frameBar, panelHeight, frameDepth], position: [-panelWidth / 2 - frameBar / 2, 0.25, 0.104] },
    { size: [frameBar, panelHeight, frameDepth], position: [panelWidth / 2 + frameBar / 2, 0.25, 0.104] }
  ].forEach(({ size, position }) => {
    const framePiece = new THREE.Mesh(new THREE.BoxGeometry(...size), frameMaterial);
    framePiece.position.set(position[0], position[1], position[2]);
    framePiece.castShadow = realtimeShadowsEnabled();
    framePiece.receiveShadow = realtimeShadowsEnabled();
    group.add(framePiece);
  });

  const rimMaterial = new THREE.MeshBasicMaterial({
    color: 0xb9b3aa,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const rim = new THREE.Mesh(new THREE.PlaneGeometry(panelWidth + 0.28, panelHeight + 0.28), rimMaterial);
  rim.position.set(0, 0.25, 0.07);
  group.add(rim);

  const screenGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
  const screenMaterial = new THREE.MeshBasicMaterial({ color: 0x11100f, toneMapped: false });
  const screen = new THREE.Mesh(screenGeometry, screenMaterial);
  screen.position.set(0, 0.25, 0.142);
  group.add(screen);

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(panelWidth, panelHeight),
    new THREE.MeshBasicMaterial({
      map: glassReflectionTexture || (glassReflectionTexture = createGlassReflectionTexture()),
      transparent: true,
      opacity: quality === "lite" ? 0.075 : 0.115,
      depthWrite: false,
      toneMapped: false
    })
  );
  glass.position.set(0, 0.25, 0.154);
  group.add(glass);

  const hitPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(panelWidth + 0.28, panelHeight + 0.32),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      visible: false
    })
  );
  hitPlane.position.set(0, 0.25, 0.18);
  hitPlane.userData.stationId = station.id;
  group.add(hitPlane);
  interactiveObjects.push(hitPlane);

  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    station.screenshotUrl,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 0.7);
      texture.offset.y = 0.18;
      texture.anisotropy = quality === "lite" ? 1 : 4;
      screenMaterial.map = texture;
      screenMaterial.color.set(0xd8d2c5);
      screenMaterial.needsUpdate = true;
      requestRender();
    },
    undefined,
    () => {
      screenMaterial.color.set(0x28251d);
      requestRender();
    }
  );

  scene.add(group);
  addWallExhibitCollider(group.position, group.rotation.y);

  const normal = new THREE.Vector3(0, 0, 1).applyEuler(group.rotation).normalize();
  const wallShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.42, 3.12),
    new THREE.MeshBasicMaterial({
      map: getWallContactShadowTexture(),
      transparent: true,
      opacity: quality === "lite" ? 0.3 : 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    })
  );
  wallShadow.position.copy(group.position).add(normal.clone().multiplyScalar(-0.255));
  wallShadow.position.y += 0.26;
  wallShadow.rotation.copy(group.rotation);
  scene.add(wallShadow);

  addContactShadow(
    2.18,
    0.78,
    group.position.clone().add(normal.clone().multiplyScalar(0.55)).setY(0.044),
    quality === "lite" ? 0.3 : 0.44
  );

  if (fullSceneDetail()) {
    const plaqueOffset = getStationSideVector({ group }).multiplyScalar(0);
    const wallPlaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.26, 0.2),
      new THREE.MeshBasicMaterial({
        map: createStationHeaderTexture(station, index + 1),
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        toneMapped: false
      })
    );
    wallPlaque.position.copy(group.position).add(normal.clone().multiplyScalar(-0.22)).add(plaqueOffset);
    wallPlaque.position.y = 0.56;
    wallPlaque.rotation.copy(group.rotation);
    scene.add(wallPlaque);
  }

  const haloMaterial = new THREE.MeshBasicMaterial({
    map: fullSceneDetail() ? createStationGlowTexture(station.kind) : null,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const halo = fullSceneDetail() ? new THREE.Mesh(new THREE.PlaneGeometry(2.18, 3.0), haloMaterial) : { material: haloMaterial };
  if (fullSceneDetail()) {
    halo.position.copy(group.position).add(normal.clone().multiplyScalar(-0.2));
    halo.position.y += 0.24;
    halo.rotation.copy(group.rotation);
    scene.add(halo);
  }

  const markerMaterial = new THREE.MeshBasicMaterial({
    color: 0xf4dfba,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const marker = fullSceneDetail() ? new THREE.Mesh(new THREE.RingGeometry(0.32, 0.38, 48), markerMaterial) : { material: markerMaterial };
  if (fullSceneDetail()) {
    marker.position.copy(group.position).add(normal.clone().multiplyScalar(0.74));
    marker.position.y = 0.028;
    marker.rotation.x = -Math.PI / 2;
  }
  if (fullSceneDetail()) {
    const plinthGroup = new THREE.Group();
    plinthGroup.position.copy(group.position).add(normal.clone().multiplyScalar(0.38));
    plinthGroup.position.y = 0.07;
    plinthGroup.rotation.copy(group.rotation);

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(1.34, 0.13, 0.38),
      createGalleryMaterial({
        color: 0x11100e,
        roughness: 0.42,
        metalness: 0.2,
        clearcoat: 0.16,
        clearcoatRoughness: 0.46,
        envMapIntensity: 0.28
      })
    );
    plinth.castShadow = realtimeShadowsEnabled();
    plinth.receiveShadow = realtimeShadowsEnabled();
    plinthGroup.add(plinth);

    const plinthAccent = new THREE.Mesh(
      new THREE.BoxGeometry(1.24, 0.02, 0.026),
      new THREE.MeshBasicMaterial({
        color: 0x17130e,
        transparent: true,
        opacity: 0.55
      })
    );
    plinthAccent.position.set(0, 0.078, 0.24);
    plinthGroup.add(plinthAccent);
    scene.add(plinthGroup);
  }

  stationObjects.set(station.id, {
    station,
    group,
    body,
    rim,
    halo,
    marker,
    screenMaterial,
    scrollDirection: -1,
    scrollActive: false
  });
}

function createStationControls() {
  stationList.innerHTML = "";
  stations.forEach((station) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "station-chip";
    button.textContent = station.displayName;
    button.dataset.stationId = station.id;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("mouseenter", () => setHover(station.id));
    button.addEventListener("mouseleave", () => setHover(null));
    button.addEventListener("focus", () => setHover(station.id));
    button.addEventListener("click", () => selectStation(station.id, { openLive: false, glide: true }));
    button.addEventListener("keydown", handleStationChipKeydown);
    stationList.appendChild(button);
  });

  openLiveButton.addEventListener("click", () => {
    openLiveSite(selectedStation);
  });

  caseStudyButton.addEventListener("click", () => {
    setModePreference("static");
    track("station_click_case_study", { station: selectedStation.id });
    window.location.href = resolveCaseStudyUrl(selectedStation.caseStudyAnchor);
  });
}

function createGrowthControls() {
  if (!growthList) return;
  growthList.innerHTML = "";

  growthExhibits.forEach((exhibit) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "growth-item";
    button.dataset.stationId = exhibit.stationId;
    button.innerHTML = [
      `<span>${exhibit.displayName}</span>`,
      '<span class="growth-meter" aria-hidden="true"><i></i><i></i><i></i><i></i></span>',
      `<small>${exhibit.headline}</small>`
    ].join("");
    button.addEventListener("click", () => {
      selectStation(exhibit.stationId, { openLive: false, glide: true });
      track("growth_wall_focus", { station: exhibit.stationId });
    });
    growthList.appendChild(button);
  });
}

function isPortraitPanelViewport() {
  return window.matchMedia && window.matchMedia("(max-width: 760px)").matches && window.innerHeight > window.innerWidth;
}

function setPanelCompact(compact, options = {}) {
  if (!stationPanel || !panelToggleButton) return;
  const nextCompact = Boolean(compact);
  stationPanel.classList.toggle("is-compact", nextCompact);
  panelToggleButton.setAttribute("aria-expanded", String(!nextCompact));
  panelToggleButton.setAttribute("aria-label", nextCompact ? "Expand station panel" : "Minimize station panel");
  const icon = panelToggleButton.querySelector("span");
  if (icon) icon.textContent = nextCompact ? "+" : "-";

  if (options.remember) {
    panelPreference = nextCompact ? "compact" : "expanded";
    track("world_panel_toggle", { state: panelPreference });
  }
}

function syncStationPanelMode() {
  if (!stationPanel || !panelToggleButton) return;
  if (!isPortraitPanelViewport()) {
    setPanelCompact(panelPreference ? panelPreference === "compact" : true);
    return;
  }

  setPanelCompact(panelPreference ? panelPreference === "compact" : true);
}

function initStationPanelToggle() {
  if (!stationPanel || !panelToggleButton || panelToggleButton.dataset.bound === "true") return;
  panelToggleButton.dataset.bound = "true";
  panelToggleButton.addEventListener("click", () => {
    setPanelCompact(!stationPanel.classList.contains("is-compact"), { remember: true });
  });
  syncStationPanelMode();
}

function handleStationChipKeydown(event) {
  const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
  if (!keys.includes(event.key)) return;

  const buttons = Array.from(stationList.querySelectorAll(".station-chip"));
  const currentIndex = buttons.indexOf(event.currentTarget);
  let nextIndex = currentIndex;

  if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = Math.min(currentIndex + 1, buttons.length - 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = Math.max(currentIndex - 1, 0);
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = buttons.length - 1;

  event.preventDefault();
  buttons[nextIndex].focus();
  selectStation(buttons[nextIndex].dataset.stationId, { openLive: false, glide: true });
}

function animateStationFocus(object, active) {
  const interacting = object.station.id === activeScreenStationId;
  const next = {
    rim: interacting ? 0.12 : active ? 0.065 : 0,
    halo: interacting ? 0.08 : active ? 0.045 : 0.018,
    marker: 0,
    emissive: interacting ? 0.11 : active ? 0.055 : 0
  };

  if (object.body.material.emissive) {
    object.body.material.emissive.setHex(interacting || active ? 0x14100a : 0x000000);
  } else if (object.body.material.color) {
    object.body.material.color.setHex(interacting || active ? 0x19130c : 0x080706);
  }

  if (seamlessMode()) {
    object.rim.material.opacity = next.rim;
    object.halo.material.opacity = next.halo;
    object.marker.material.opacity = next.marker;
    if ("emissiveIntensity" in object.body.material) object.body.material.emissiveIntensity = next.emissive;
    requestRender();
    return;
  }

  if (window.gsap) {
    [
      [object.rim.material, "opacity", next.rim],
      [object.halo.material, "opacity", next.halo],
      [object.marker.material, "opacity", next.marker],
      [object.body.material, "emissiveIntensity", next.emissive]
    ].forEach(([target, property, value]) => {
      window.gsap.to(target, {
        [property]: value,
        duration: 0.46,
        ease: "power2.out",
        overwrite: "auto",
        onUpdate: requestRender
      });
    });
    return;
  }

  object.rim.material.opacity = next.rim;
  object.halo.material.opacity = next.halo;
  object.marker.material.opacity = next.marker;
  object.body.material.emissiveIntensity = next.emissive;
}

function setHover(stationId) {
  if (hoveredStationId === stationId) return;
  hoveredStationId = stationId;

  stationObjects.forEach((object, id) => {
    const active = id === stationId || id === selectedStation.id;
    animateStationFocus(object, active);
  });

  if (stationId) {
    const object = stationObjects.get(stationId);
    if (object && stationId !== activeScreenStationId) animateScreenshot(object);
    if (!hoveredIds.has(stationId)) {
      hoveredIds.add(stationId);
      track("station_hover", { station: stationId });
    }
  }

  updateInspectHint(stationId || selectedStation?.id);
  requestRender();
}

function selectStation(stationId, options = {}) {
  const station = stations.find((item) => item.id === stationId);
  if (!station) return;

  if (activeScreenStationId && activeScreenStationId !== stationId) {
    clearStationInteraction();
  }

  selectedStation = station;
  stationTitle.textContent = station.displayName;
  stationDescription.textContent = station.description;

  document.querySelectorAll(".station-chip").forEach((button) => {
    const active = button.dataset.stationId === stationId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
    if (active) {
      button.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  });

  document.querySelectorAll(".growth-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.stationId === stationId);
  });

  setHover(stationId);
  updateInspectHint(stationId);

  const object = stationObjects.get(stationId);
  if (object && options.glide !== false) {
    glideCameraTo(object);
    animateScreenshot(object);
  }

  if (options.openLive) {
    openLiveSite(station);
  }
}

function openLiveSite(station) {
  track("station_click_live", { station: station.id });
  window.open(station.liveUrl, "_blank", "noopener");
}

function isWorldFullscreen() {
  return !!document.fullscreenElement;
}

function syncFullscreenControls() {
  const fullscreen = isWorldFullscreen();
  document.body.classList.toggle("is-fullscreen", fullscreen);
  if (fullscreenButton) fullscreenButton.textContent = fullscreen ? "Exit full screen" : "Full screen";
  if (screenViewerFullscreen) {
    screenViewerFullscreen.textContent = screenViewer?.classList.contains("is-fullscreen") ? "Exit full screen" : "Full screen";
  }
  requestRender({ force: true });
}

function toggleWorldFullscreen() {
  if (!document.fullscreenElement) {
    const target = worldShell || document.documentElement;
    if (target.requestFullscreen) {
      target.requestFullscreen().catch(() => {});
      track("world_fullscreen_enter", { source: "topbar" });
    }
    return;
  }

  if (document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
    track("world_fullscreen_exit", { source: "topbar" });
  }
}

function toggleScreenViewerFullscreen(force) {
  if (!screenViewer) return;
  const next = typeof force === "boolean" ? force : !screenViewer.classList.contains("is-fullscreen");
  screenViewer.classList.toggle("is-fullscreen", next);
  if (screenViewerFullscreen) screenViewerFullscreen.textContent = next ? "Exit full screen" : "Full screen";

  if (next && screenViewer.requestFullscreen && document.fullscreenElement !== screenViewer) {
    screenViewer.requestFullscreen().catch(() => {});
  } else if (!next && document.fullscreenElement === screenViewer && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }

  window.requestAnimationFrame(() => syncScreenViewerFromTexture(stationObjects.get(activeScreenStationId)));
  requestRender({ force: true });
}

function handleFullscreenChange() {
  if (screenViewer && document.fullscreenElement !== screenViewer) {
    screenViewer.classList.remove("is-fullscreen");
  }
  syncFullscreenControls();
  const activeObject = stationObjects.get(activeScreenStationId);
  if (activeObject) {
    const pose = inspectionCameraPose(activeObject);
    setBaseCamera(pose.position, pose.target);
  }
}

function updateInspectHint(stationId = hoveredStationId || selectedStation?.id) {
  if (!inspectHint) return;
  if (activeScreenStationId) {
    inspectHint.hidden = true;
    return;
  }
  const object = stationObjects.get(stationId);
  const visible = !!object && canInteractWithStationScreen(object);
  inspectHint.hidden = !visible;
  if (!visible) return;
  inspectHint.dataset.stationId = stationId;
  inspectHint.setAttribute("aria-label", `Inspect ${object.station.displayName}`);
}

function pushInspectionHistory(stationId) {
  if (!window.history?.pushState || inspectionHistoryActive) return;
  const url = new URL(window.location.href);
  url.hash = `inspect-${stationId}`;
  window.history.pushState({ showcaseInspection: stationId }, "", url);
  inspectionHistoryActive = true;
}

function clearInspectionHistory() {
  if (!inspectionHistoryActive || suppressInspectionPop) return;
  inspectionHistoryActive = false;
  if (window.history?.state?.showcaseInspection) {
    suppressInspectionPop = true;
    window.history.back();
  }
}

function handleHistoryPop() {
  if (suppressInspectionPop) {
    suppressInspectionPop = false;
    return;
  }
  if (activeScreenStationId) {
    inspectionHistoryActive = false;
    clearStationInteraction({ skipHistory: true });
  }
}

function syncScreenViewerFromTexture(object) {
  if (!screenViewerScroll || !object?.screenMaterial?.map) return;
  const texture = object.screenMaterial.map;
  const range = 0.28;
  const progress = Math.max(0, Math.min(1, (0.3 - texture.offset.y) / range));
  const maxScroll = Math.max(0, screenViewerScroll.scrollHeight - screenViewerScroll.clientHeight);
  screenViewerScroll.scrollTop = maxScroll * progress;
}

function syncTextureFromScreenViewer() {
  if (!activeScreenStationId) return;
  const object = stationObjects.get(activeScreenStationId);
  const texture = object?.screenMaterial?.map;
  if (!texture || !screenViewerScroll) return;
  const maxScroll = Math.max(1, screenViewerScroll.scrollHeight - screenViewerScroll.clientHeight);
  const progress = Math.max(0, Math.min(1, screenViewerScroll.scrollTop / maxScroll));
  texture.offset.y = Math.max(0.02, Math.min(0.3, 0.3 - progress * 0.28));
  texture.needsUpdate = true;
  requestRender();
}

function openScreenViewer(object, requestFullscreen = false) {
  if (!screenViewer || !screenViewerImage || !screenViewerTitle) return;
  screenViewerTitle.textContent = object.station.displayName;
  screenViewerImage.alt = `${object.station.displayName} website preview`;
  if (screenViewerImage.getAttribute("src") !== object.station.screenshotUrl) {
    screenViewerImage.src = object.station.screenshotUrl;
  }
  screenViewer.hidden = false;
  document.body.classList.add("is-inspecting");
  window.requestAnimationFrame(() => syncScreenViewerFromTexture(object));

  if (requestFullscreen) {
    toggleScreenViewerFullscreen(true);
  }
}

function closeScreenViewer({ clearActive = true } = {}) {
  if (screenViewer) {
    screenViewer.hidden = true;
    screenViewer.classList.remove("is-fullscreen");
  }
  document.body.classList.remove("is-inspecting");
  if (screenViewerFullscreen) screenViewerFullscreen.textContent = "Full screen";
  if (document.fullscreenElement === screenViewer && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  if (clearActive) clearStationInteraction();
}

function distanceToStationScreen(object) {
  return camera.position.distanceTo(object.group.position);
}

function canInteractWithStationScreen(object) {
  return !!object && distanceToStationScreen(object) <= SCREEN_INTERACTION_DISTANCE;
}

function refreshStationFocusStates() {
  stationObjects.forEach((object, id) => {
    const active = id === hoveredStationId || id === selectedStation.id || id === activeScreenStationId;
    animateStationFocus(object, active);
  });
}

function activateStationInteraction(object, options = {}) {
  if (!object || !canInteractWithStationScreen(object)) return false;
  activeScreenStationId = object.station.id;
  object.scrollActive = false;
  if (object.screenMaterial?.map) {
    object.screenMaterial.map.offset.y = 0.3;
    object.screenMaterial.map.needsUpdate = true;
  }
  refreshStationFocusStates();
  if (options.skipGlide) {
    const pose = inspectionCameraPose(object);
    setBaseCamera(pose.position, pose.target);
  } else {
    glideCameraToInspection(object);
  }
  openScreenViewer(object, false);
  if (!options.skipHistory) pushInspectionHistory(object.station.id);
  track("station_screen_interaction", { station: object.station.id });
  requestRender();
  return true;
}

function clearStationInteraction(options = {}) {
  if (!activeScreenStationId) return;
  activeScreenStationId = null;
  closeScreenViewer({ clearActive: false });
  inspectionDragState.pointerId = null;
  if (!options.skipHistory) clearInspectionHistory();
  refreshStationFocusStates();
  updateInspectHint();
  requestRender();
}

function inspectionProbeForVerifier() {
  if (params.get("verifyMode") !== "1") return "disabled";
  if (inspectionProbeResult) return inspectionProbeResult;

  const object = stationObjects.get(stations[0]?.id);
  const texture = object?.screenMaterial?.map;
  if (!object || !texture) return "ready:0;activated:0;scrolled:0;exited:0";

  const originalStationId = selectedStation.id;
  const originalPosition = lookState.basePosition?.clone();
  const originalTarget = lookState.baseTarget?.clone();
  const originalOffset = texture.offset.y;

  focusStationCameraInstant(object.station.id);
  const activated = activateStationInteraction(object, { skipGlide: true, skipHistory: true });
  const active = activated && activeScreenStationId === object.station.id && screenViewer && !screenViewer.hidden && document.body.classList.contains("is-inspecting");

  const beforeScroll = texture.offset.y;
  const scrolled = scrollStationPreview(object, 320) && Math.abs(texture.offset.y - beforeScroll) > 0.01;
  clearStationInteraction({ skipHistory: true });
  const exited = !activeScreenStationId && screenViewer?.hidden && !document.body.classList.contains("is-inspecting");

  texture.offset.y = originalOffset;
  texture.needsUpdate = true;
  if (originalPosition && originalTarget) {
    selectedStation = stations.find((station) => station.id === originalStationId) || selectedStation;
    setBaseCamera(originalPosition, originalTarget);
  }

  inspectionProbeResult = [
    "ready:1",
    `activated:${active ? 1 : 0}`,
    `scrolled:${scrolled ? 1 : 0}`,
    `exited:${exited ? 1 : 0}`
  ].join(";");
  return inspectionProbeResult;
}

function getStationNormal(object) {
  return new THREE.Vector3(0, 0, 1).applyEuler(object.group.rotation).normalize();
}

function lookAtTarget(position, target) {
  camera.position.copy(position);
  camera.lookAt(target);
}

function easeGallery(value) {
  return value < 0.5 ? 16 * value * value * value * value * value : 1 - Math.pow(-2 * value + 2, 5) / 2;
}

function setBaseCamera(position, target) {
  lookState.basePosition = position.clone();
  lookState.baseTarget = target.clone();
  applyLookOffset();
}

function galleryCameraPose(object = null) {
  const portraitViewport = window.innerHeight > window.innerWidth;
  if (!object) {
    return {
      position: portraitViewport ? new THREE.Vector3(-4.72, 1.5, 4.86) : new THREE.Vector3(-4.45, 1.58, 3.92),
      target: portraitViewport ? new THREE.Vector3(-0.8, 1.4, -5.18) : new THREE.Vector3(0.48, 1.5, -5.42)
    };
  }

  const group = object.group || object;
  const station = object.station || null;
  const normal = new THREE.Vector3(0, 0, 1).applyEuler(group.rotation).normalize();
  const side = new THREE.Vector3(1, 0, 0).applyEuler(group.rotation).normalize();
  const distance = station?.camera?.distance || (portraitViewport ? 4.4 : 3.65);
  const sideOffset = station?.camera?.sideOffset || 0;
  const targetSideOffset = station?.camera?.targetSideOffset || 0;
  const position = group.position.clone()
    .add(normal.clone().multiplyScalar(distance))
    .add(side.clone().multiplyScalar(sideOffset));
  const target = group.position.clone().add(side.clone().multiplyScalar(targetSideOffset));
  position.y = portraitViewport ? 1.54 : 1.62;
  target.y = 1.42;

  return {
    position,
    target
  };
}

function inspectionCameraPose(object) {
  const portraitViewport = window.innerHeight > window.innerWidth;
  const group = object.group || object;
  const normal = new THREE.Vector3(0, 0, 1).applyEuler(group.rotation).normalize();
  const distance = portraitViewport ? 5.55 : document.fullscreenElement ? 4.18 : 4.55;
  const position = group.position.clone().add(normal.multiplyScalar(distance));
  const target = group.position.clone();
  position.y = portraitViewport ? 1.5 : 1.58;
  target.y = 1.7;
  return { position, target };
}

function applyLookOffset() {
  if (!lookState.basePosition || !lookState.baseTarget) return;
  const direction = lookState.baseTarget.clone().sub(lookState.basePosition);
  direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), lookState.yaw);
  const right = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
  direction.applyAxisAngle(right, lookState.pitch);
  camera.position.copy(lookState.basePosition);
  camera.lookAt(lookState.basePosition.clone().add(direction));
}

function resetLookOffset() {
  lookState.yaw = 0;
  lookState.pitch = 0;
  lookState.targetYaw = 0;
  lookState.targetPitch = 0;
}

function clampGalleryPosition(position) {
  position.x = Math.max(-5.46, Math.min(5.46, position.x));
  position.z = Math.max(-4.72, Math.min(5.86, position.z));
  position.y = Math.max(1.34, Math.min(1.95, position.y));
}

function movementFrameInterval() {
  if (!seamlessMode()) return 0;
  return quality === "lite" ? 1000 / 45 : 1000 / 30;
}

function renderFrameInterval() {
  if (!seamlessMode()) return 0;
  return quality === "lite" ? 1000 / 45 : 1000 / 30;
}

function hasMovementInput() {
  return moveState.keys.size > 0 || moveState.touchActive;
}

function currentMovementVector() {
  let forward = 0;
  let side = 0;
  if (moveState.keys.has("KeyW") || moveState.keys.has("ArrowUp")) forward += 1;
  if (moveState.keys.has("KeyS") || moveState.keys.has("ArrowDown")) forward -= 1;
  if (moveState.keys.has("KeyD") || moveState.keys.has("ArrowRight")) side += 1;
  if (moveState.keys.has("KeyA") || moveState.keys.has("ArrowLeft")) side -= 1;

  side += moveState.touchSide;
  forward += moveState.touchForward;

  const length = Math.hypot(side, forward);
  if (length > 1) {
    side /= length;
    forward /= length;
  }

  return { side, forward, length: Math.min(length, 1) };
}

function moveGallery(sideAmount, forwardAmount) {
  if (!introComplete || !lookState.basePosition || !lookState.baseTarget) return;

  animationToken += 1;
  const before = lookState.basePosition.clone();
  const forward = lookState.baseTarget.clone().sub(lookState.basePosition);
  forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), lookState.yaw);
  forward.y = 0;
  if (forward.lengthSq() < 0.0001) forward.set(0, 0, -1);
  forward.normalize();

  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const delta = right.multiplyScalar(sideAmount).add(forward.multiplyScalar(forwardAmount));
  const proposed = lookState.basePosition.clone().add(delta);
  clampGalleryPosition(proposed);
  lookState.basePosition.copy(applyGalleryCollision(before, proposed));

  const applied = lookState.basePosition.clone().sub(before);
  lookState.baseTarget.add(applied);
  if (activeScreenStationId) {
    const activeObject = stationObjects.get(activeScreenStationId);
    if (!activeObject || !canInteractWithStationScreen(activeObject)) {
      clearStationInteraction();
    }
  }
  applyLookOffset();
  updateInspectHint();
  if (moveState.skipNextRender) {
    moveState.skipNextRender = false;
  } else {
    requestRender();
  }
}

function movementInputAllowed(event) {
  if (activeScreenStationId) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  const target = event.target;
  if (!target || target === document.body || target === canvas) return true;
  const tagName = target.tagName ? target.tagName.toLowerCase() : "";
  return !["a", "button", "input", "select", "textarea"].includes(tagName);
}

function requestMovementFrame() {
  if (moveState.frame) return;

  function frame(now) {
    moveState.frame = 0;
    if (!hasMovementInput()) {
      moveState.lastAt = 0;
      return;
    }

    const previous = moveState.lastAt || now;
    const dt = Math.min((now - previous) / 1000, 0.05);
    moveState.lastAt = now;

    const { side, forward, length } = currentMovementVector();

    if (length > 0.01) {
      const touchOnly = moveState.touchActive && !moveState.keys.size;
      const speed = moveState.keys.has("ShiftLeft") || moveState.keys.has("ShiftRight") ? 2.9 : touchOnly ? 1.42 : 1.75;
      const targetFrameMs = movementFrameInterval();
      const shouldRender = !targetFrameMs || now - moveState.lastRenderAt >= targetFrameMs;
      moveState.skipNextRender = !shouldRender;
      moveGallery(side * speed * dt, forward * speed * dt);
      if (shouldRender) moveState.lastRenderAt = now;
    }

    moveState.frame = window.requestAnimationFrame(frame);
  }

  moveState.frame = window.requestAnimationFrame(frame);
}

function handleGalleryKeyDown(event) {
  const movementCodes = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight", "ShiftLeft", "ShiftRight"];
  if (!introComplete || !movementCodes.includes(event.code) || !movementInputAllowed(event)) return;
  event.preventDefault();
  moveState.keys.add(event.code);
  requestMovementFrame();
}

function handleGalleryKeyUp(event) {
  moveState.keys.delete(event.code);
  if (!hasMovementInput()) {
    moveState.skipNextRender = false;
    requestRender();
  }
}

function handleScreenViewerKeyDown(event) {
  if (!screenViewer || screenViewer.hidden || event.key !== "Escape") return;
  closeScreenViewer();
}

function handleInspectionWheel(event) {
  if (!activeScreenStationId) return;
  const object = stationObjects.get(activeScreenStationId);
  if (!object || !canInteractWithStationScreen(object)) return;
  event.preventDefault();
  scrollStationPreview(object, event.deltaY);
}

function scrollActiveScreenBy(deltaY) {
  if (!activeScreenStationId) return;
  const object = stationObjects.get(activeScreenStationId);
  if (!object || !canInteractWithStationScreen(object)) return;
  scrollStationPreview(object, deltaY);
}

function handleInspectionScrollKey(event) {
  if (!activeScreenStationId) return;
  const keyDelta = {
    ArrowDown: 72,
    ArrowUp: -72,
    PageDown: 360,
    PageUp: -360,
    Home: -1200,
    End: 1200
  };
  const delta = keyDelta[event.key];
  if (!Number.isFinite(delta)) return;
  const object = stationObjects.get(activeScreenStationId);
  if (!object || !canInteractWithStationScreen(object)) return;
  event.preventDefault();
  scrollActiveScreenBy(delta);
}

function handleGalleryWheel(event) {
  if (!introComplete || event.target !== canvas) return;
  event.preventDefault();
  if (activeScreenStationId) {
    const object = stationObjects.get(activeScreenStationId);
    if (object && canInteractWithStationScreen(object)) {
      scrollStationPreview(object, event.deltaY);
      return;
    }
    clearStationInteraction();
  }
  const amount = Math.max(-0.72, Math.min(0.72, -event.deltaY * 0.0028));
  moveGallery(0, amount);
}

function updateMovePadVisual(side, forward) {
  if (!mobileMoveStick) return;
  mobileMoveStick.style.setProperty("--move-x", `${side * 1.25}rem`);
  mobileMoveStick.style.setProperty("--move-y", `${-forward * 1.25}rem`);
}

function resetMovePad() {
  moveState.touchPointerId = null;
  moveState.touchSide = 0;
  moveState.touchForward = 0;
  moveState.touchActive = false;
  moveState.skipNextRender = false;
  mobileMoveControls?.classList.remove("is-active");
  updateMovePadVisual(0, 0);
  requestRender();
}

function updateMovePadFromPointer(event) {
  if (!mobileMovePad) return;
  const rect = mobileMovePad.getBoundingClientRect();
  const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.42);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const rawSide = (event.clientX - centerX) / radius;
  const rawForward = (centerY - event.clientY) / radius;
  const length = Math.hypot(rawSide, rawForward);
  const scale = length > 1 ? 1 / length : 1;
  const deadZone = 0.12;
  const side = Math.abs(rawSide) < deadZone && length < deadZone ? 0 : rawSide * scale;
  const forward = Math.abs(rawForward) < deadZone && length < deadZone ? 0 : rawForward * scale;

  moveState.touchSide = side;
  moveState.touchForward = forward;
  moveState.touchActive = true;
  mobileMoveControls?.classList.add("is-active");
  updateMovePadVisual(side, forward);
  requestMovementFrame();
}

function handleMovePadPointerDown(event) {
  if (!introComplete || !mobileMovePad) return;
  event.preventDefault();
  moveState.touchPointerId = event.pointerId;
  mobileMovePad.setPointerCapture(event.pointerId);
  updateMovePadFromPointer(event);
}

function handleMovePadPointerMove(event) {
  if (moveState.touchPointerId !== event.pointerId) return;
  event.preventDefault();
  updateMovePadFromPointer(event);
}

function handleMovePadPointerUp(event) {
  if (moveState.touchPointerId !== event.pointerId) return;
  event.preventDefault();
  try {
    mobileMovePad?.releasePointerCapture(event.pointerId);
  } catch (error) {}
  resetMovePad();
}

function handleMovePadKeyDown(event) {
  const keyMap = {
    ArrowUp: [0, 1],
    KeyW: [0, 1],
    ArrowDown: [0, -1],
    KeyS: [0, -1],
    ArrowLeft: [-1, 0],
    KeyA: [-1, 0],
    ArrowRight: [1, 0],
    KeyD: [1, 0]
  };
  const vector = keyMap[event.code];
  if (!vector || !introComplete) return;
  event.preventDefault();
  event.stopPropagation();
  moveState.touchSide = vector[0];
  moveState.touchForward = vector[1];
  moveState.touchActive = true;
  mobileMoveControls?.classList.add("is-active");
  updateMovePadVisual(vector[0], vector[1]);
  requestMovementFrame();
}

function handleMovePadKeyUp(event) {
  if (!["ArrowUp", "KeyW", "ArrowDown", "KeyS", "ArrowLeft", "KeyA", "ArrowRight", "KeyD"].includes(event.code)) return;
  event.preventDefault();
  event.stopPropagation();
  resetMovePad();
}

function updateLookTargetFromDelta(dx, dy, sensitivity = 0.0025) {
  lookState.targetYaw -= dx * sensitivity;
  lookState.targetPitch = Math.max(-0.48, Math.min(0.48, lookState.targetPitch - dy * sensitivity * 0.8));
  requestSmoothLook();
}

function enterPointerLook() {
  if (!canvas.requestPointerLock || document.pointerLockElement === canvas || window.innerWidth < 760) return;
  try {
    canvas.requestPointerLock();
    track("world_pointer_lock_enter", { source: "gallery_canvas" });
  } catch (error) {}
}

function handlePointerLockChange() {
  lookState.pointerLocked = document.pointerLockElement === canvas;
  if (lookState.pointerLocked) {
    lookState.dragging = false;
    lookState.pointerId = null;
    canvas.style.cursor = "none";
  } else {
    canvas.style.cursor = "grab";
  }
}

function handlePointerLockMove(event) {
  if (!lookState.pointerLocked || !introComplete) return;
  updateLookTargetFromDelta(event.movementX || 0, event.movementY || 0, 0.0022);
}

function scrollStationPreview(object, deltaY) {
  const texture = object.screenMaterial.map;
  if (!texture) return false;
  object.scrollActive = false;
  const nextOffset = Math.max(0.02, Math.min(0.3, texture.offset.y - deltaY * 0.00055));
  texture.offset.y = nextOffset;
  texture.needsUpdate = true;
  syncScreenViewerFromTexture(object);
  requestRender();
  return true;
}

function requestSmoothLook() {
  if (lookState.smoothingFrame) return;

  function frame() {
    lookState.smoothingFrame = 0;
    const yawDelta = lookState.targetYaw - lookState.yaw;
    const pitchDelta = lookState.targetPitch - lookState.pitch;

    const smoothing = seamlessMode() ? 0.34 : 0.18;
    lookState.yaw += yawDelta * smoothing;
    lookState.pitch += pitchDelta * smoothing;

    if (Math.abs(yawDelta) < 0.0005 && Math.abs(pitchDelta) < 0.0005) {
      lookState.yaw = lookState.targetYaw;
      lookState.pitch = lookState.targetPitch;
    }

    applyLookOffset();
    requestRender();

    if (lookState.yaw !== lookState.targetYaw || lookState.pitch !== lookState.targetPitch) {
      lookState.smoothingFrame = window.requestAnimationFrame(frame);
    }
  }

  lookState.smoothingFrame = window.requestAnimationFrame(frame);
}

function glideCameraTo(object) {
  animationToken += 1;
  const token = animationToken;
  const start = performance.now();
  const duration = seamlessMode() ? 260 : quality === "lite" ? 760 : 980;
  const fromPosition = camera.position.clone();
  const fromQuaternion = camera.quaternion.clone();
  const pose = galleryCameraPose(object);
  const toPosition = pose.position;
  const lookTarget = pose.target;
  const targetCamera = camera.clone();
  targetCamera.position.copy(toPosition);
  targetCamera.lookAt(lookTarget);
  const toQuaternion = targetCamera.quaternion.clone();
  const toBaseTarget = lookTarget.clone();
  resetLookOffset();

  function updateGlide(progress) {
    if (token !== animationToken) return;
    const eased = easeGallery(progress);
    const lift = Math.sin(eased * Math.PI) * (quality === "lite" ? 0.04 : 0.12);
    camera.position.lerpVectors(fromPosition, toPosition, eased);
    camera.position.y += lift;
    camera.quaternion.copy(fromQuaternion).slerp(toQuaternion, eased);
    renderScene();
  }

  if (window.gsap) {
    const tweenState = { progress: 0 };
    window.gsap.to(tweenState, {
      progress: 1,
      duration: duration / 1000,
      ease: "none",
      onUpdate() {
        updateGlide(tweenState.progress);
      },
      onComplete() {
        if (token !== animationToken) return;
        setBaseCamera(toPosition, toBaseTarget);
      }
    });
    return;
  }

  function frame(now) {
    if (token !== animationToken) return;
    const progress = Math.min((now - start) / duration, 1);
    updateGlide(progress);
    if (progress < 1) {
      window.requestAnimationFrame(frame);
    } else {
      setBaseCamera(toPosition, toBaseTarget);
    }
  }

  window.requestAnimationFrame(frame);
}

function glideCameraToInspection(object) {
  animationToken += 1;
  const token = animationToken;
  const start = performance.now();
  const duration = seamlessMode() ? 220 : quality === "lite" ? 520 : 720;
  const fromPosition = camera.position.clone();
  const fromQuaternion = camera.quaternion.clone();
  const pose = inspectionCameraPose(object);
  const targetCamera = camera.clone();
  targetCamera.position.copy(pose.position);
  targetCamera.lookAt(pose.target);
  const toQuaternion = targetCamera.quaternion.clone();
  resetLookOffset();

  function updateGlide(progress) {
    if (token !== animationToken) return;
    const eased = easeGallery(progress);
    camera.position.lerpVectors(fromPosition, pose.position, eased);
    camera.quaternion.copy(fromQuaternion).slerp(toQuaternion, eased);
    renderScene();
  }

  function finishGlide() {
    if (token !== animationToken) return;
    setBaseCamera(pose.position, pose.target);
  }

  if (window.gsap) {
    const tweenState = { progress: 0 };
    window.gsap.to(tweenState, {
      progress: 1,
      duration: duration / 1000,
      ease: "none",
      onUpdate() {
        updateGlide(tweenState.progress);
      },
      onComplete: finishGlide
    });
    return;
  }

  function frame(now) {
    if (token !== animationToken) return;
    const progress = Math.min((now - start) / duration, 1);
    updateGlide(progress);
    if (progress < 1) {
      window.requestAnimationFrame(frame);
    } else {
      finishGlide();
    }
  }

  window.requestAnimationFrame(frame);
}

function focusStationCameraInstant(stationId) {
  const object = stationObjects.get(stationId);
  if (!object) return;
  const pose = galleryCameraPose(object);
  resetLookOffset();
  setBaseCamera(pose.position, pose.target);
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
}

function runIntroGlide() {
  if (!camera || !lookState.basePosition || !lookState.baseTarget) return;
  animationToken += 1;
  const token = animationToken;
  const fromPosition = camera.position.clone();
  const fromTarget = new THREE.Vector3(0, 1.38, -3.65);
  const toPosition = lookState.basePosition.clone();
  const toTarget = lookState.baseTarget.clone();

  document.body.classList.add("intro-active");
  resetLookOffset();
  introComplete = false;
  track("world_pov_intro", { quality });

  if (seamlessMode()) {
    introComplete = true;
    idleActive = false;
    setBaseCamera(toPosition, toTarget);
    document.body.classList.remove("intro-active");
    requestRender();
    return;
  }

  idleActive = true;

  const state = { progress: 0 };
  const duration = quality === "lite" ? 1.55 : 2.75;

  function updateIntro(progress) {
    if (token !== animationToken) return;
    const eased = easeGallery(progress);
    const position = fromPosition.clone().lerp(toPosition, eased);
    const target = fromTarget.clone().lerp(toTarget, eased);
    const sway = Math.sin(eased * Math.PI * 1.65) * 0.06 * (1 - eased);
    position.x += sway;
    lookAtTarget(position, target);
    renderScene();
  }

  if (window.gsap) {
    window.gsap.to(state, {
      progress: 1,
      duration,
      ease: "none",
      onUpdate() {
        updateIntro(state.progress);
      },
      onComplete() {
        if (token !== animationToken) return;
        introComplete = true;
        idleActive = false;
        setBaseCamera(toPosition, toTarget);
        document.body.classList.remove("intro-active");
        requestRender();
      }
    });
  } else {
    const start = performance.now();
    function frame(now) {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      updateIntro(progress);
      if (progress < 1) {
        window.requestAnimationFrame(frame);
      } else {
        introComplete = true;
        idleActive = false;
        setBaseCamera(toPosition, toTarget);
        document.body.classList.remove("intro-active");
        requestRender();
      }
    }
    window.requestAnimationFrame(frame);
  }

  requestIdleLook();
}

function requestIdleLook() {
  if (!idleActive) return;
  const started = performance.now();
  function frame(now) {
    if (!idleActive) return;
    const t = (now - started) / 1000;
    lookState.yaw = Math.sin(t * 1.1) * 0.022;
    lookState.pitch = Math.sin(t * 0.8) * 0.009;
    lookState.targetYaw = lookState.yaw;
    lookState.targetPitch = lookState.pitch;
    applyLookOffset();
    renderScene();
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);
}

function animateScreenshot(object) {
  const texture = object.screenMaterial.map;
  if (!texture || object.scrollActive) return;

  object.scrollActive = true;
  const start = performance.now();
  const duration = 1700;
  const from = texture.offset.y;
  const to = object.scrollDirection < 0 ? 0.02 : 0.24;
  object.scrollDirection *= -1;

  if (seamlessMode()) {
    texture.offset.y = to;
    texture.needsUpdate = true;
    object.scrollActive = false;
    requestRender();
    return;
  }

  if (window.gsap) {
    const state = { progress: 0 };
    window.gsap.to(state, {
      progress: 1,
      duration: duration / 1000,
      ease: "none",
      onComplete() {
        object.scrollActive = false;
      },
      onStart() {
        texture.offset.y = from;
      },
      onUpdate() {
        texture.offset.y = from + (to - from) * easeGallery(state.progress);
        renderScene();
      }
    });
    return;
  }

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    texture.offset.y = from + (to - from) * easeGallery(progress);
    renderScene();
    if (progress < 1) {
      window.requestAnimationFrame(frame);
    } else {
      object.scrollActive = false;
    }
  }

  window.requestAnimationFrame(frame);
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function getStationIntersection(event = null) {
  if (lookState.pointerLocked) {
    pointer.set(0, 0);
  } else if (event) {
    updatePointer(event);
  }
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(interactiveObjects, false)[0] || null;
}

function handlePointerMove(event) {
  if (lookState.pointerLocked) return;
  if (inspectionDragState.pointerId === event.pointerId) {
    const object = stationObjects.get(activeScreenStationId);
    if (!object) return;
    const dy = event.clientY - inspectionDragState.lastY;
    inspectionDragState.lastY = event.clientY;
    if (Math.abs(dy) > 1) {
      inspectionDragState.moved = true;
      scrollStationPreview(object, -dy * 2.4);
    }
    return;
  }
  if (lookState.dragging && lookState.pointerId === event.pointerId) {
    const dx = event.clientX - lookState.lastX;
    const dy = event.clientY - lookState.lastY;
    lookState.lastX = event.clientX;
    lookState.lastY = event.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 3) {
      lookState.dragMoved = true;
    }
    updateLookTargetFromDelta(dx, dy);
    return;
  }

  const intersection = getStationIntersection(event);
  const nextId = intersection ? intersection.object.userData.stationId : null;
  setHover(nextId);
  canvas.style.cursor = nextId ? "pointer" : "grab";
}

function handlePointerClick(event) {
  if (!introComplete) return;
  if (inspectionDragState.moved) {
    inspectionDragState.moved = false;
    return;
  }
  if (lookState.dragMoved) {
    lookState.dragMoved = false;
    return;
  }
  const intersection = getStationIntersection(event);
  if (activeScreenStationId && (!intersection || intersection.object.userData.stationId !== activeScreenStationId)) {
    clearStationInteraction();
    return;
  }
  if (!intersection) {
    clearStationInteraction();
    enterPointerLook();
    return;
  }
  const stationId = intersection.object.userData.stationId;
  const object = stationObjects.get(stationId);
  if (!object) return;

  if (canInteractWithStationScreen(object)) {
    selectStation(stationId, { openLive: false, glide: false });
    activateStationInteraction(object);
    if (event.detail >= 2) {
      openLiveSite(object.station);
    }
    return;
  }

  clearStationInteraction();
  selectStation(stationId, { openLive: false, glide: true });
}

function handlePointerDown(event) {
  if (!introComplete || event.target !== canvas) return;
  if (lookState.pointerLocked) return;
  if (activeScreenStationId) {
    const intersection = getStationIntersection(event);
    if (intersection && intersection.object.userData.stationId === activeScreenStationId) {
      inspectionDragState.pointerId = event.pointerId;
      inspectionDragState.lastY = event.clientY;
      inspectionDragState.moved = false;
      canvas.setPointerCapture(event.pointerId);
      return;
    }
  }
  lookState.dragging = true;
  lookState.dragMoved = false;
  lookState.pointerId = event.pointerId;
  lookState.lastX = event.clientX;
  lookState.lastY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
}

function handlePointerUp(event) {
  if (inspectionDragState.pointerId === event.pointerId) {
    inspectionDragState.pointerId = null;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (error) {}
    return;
  }
  if (lookState.pointerId !== event.pointerId) return;
  lookState.dragging = false;
  lookState.pointerId = null;
  try {
    canvas.releasePointerCapture(event.pointerId);
  } catch (error) {}
}

function renderScene() {
  if (!renderer || !scene || !camera) return;
  renderer.render(scene, camera);
  exposeWorldMetricsForVerifier();
  if (pixelChecksRemaining > 0) {
    pixelChecksRemaining -= 1;
    lastPixelCheck = sampleRenderedCanvas();
    updateQaDiagnostics();
  }
}

function sampleRenderedCanvas() {
  try {
    const gl = renderer.getContext();
    const width = canvas.width;
    const height = canvas.height;
    const pixel = new Uint8Array(4);
    let nonBlack = 0;
    let samples = 0;

    for (let gx = 1; gx <= 9; gx += 1) {
      for (let gy = 1; gy <= 7; gy += 1) {
        const x = Math.floor(width * gx / 10);
        const y = Math.floor(height * gy / 8);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        samples += 1;
        if (pixel[0] + pixel[1] + pixel[2] > 24 && pixel[3] > 0) {
          nonBlack += 1;
        }
      }
    }

    return { nonBlack, samples, width, height };
  } catch (error) {
    return { nonBlack: 0, samples: 0, width: canvas.width, height: canvas.height };
  }
}

function requestRender(options = {}) {
  const force = options === true || options.force === true;
  renderState.force = renderState.force || force;
  if (renderRequested) return;
  renderRequested = true;

  function frame(now) {
    const interval = renderState.force ? 0 : renderFrameInterval();
    if (interval && renderState.lastAt && now - renderState.lastAt < interval) {
      renderState.frame = window.requestAnimationFrame(frame);
      return;
    }

    renderState.frame = 0;
    renderState.lastAt = now;
    renderState.force = false;
    renderRequested = false;
    renderScene();
  }

  renderState.frame = window.requestAnimationFrame(frame);
}

function handleResize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(currentRenderPixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  updateQaDiagnostics();
  requestRender();
}

function runWarmupCheck() {
  const start = performance.now();
  let frames = 0;

  if (seamlessMode() && !qaMode) {
    lastWarmup = { frames: 0, duration: 0, skipped: true };
    return;
  }

  function frame(now) {
    frames += 1;
    renderScene();
    if (now - start < 900) {
      window.requestAnimationFrame(frame);
      return;
    }

    lastWarmup = { frames, duration: Math.round(now - start) };
    if (frames < 38) {
      adaptivePixelScale = quality === "lite" ? 0.7 : 0.84;
      renderer.setPixelRatio(currentRenderPixelRatio());
      qualityPill.textContent = "Performance mode";
      track("world_warmup_low_fps", { ...lastWarmup, adaptivePixelScale });
      requestRender();
    }
  }

  window.requestAnimationFrame(frame);
}

async function startWorld() {
  try {
    quality = detectQuality();
    adaptivePixelScale = defaultAdaptivePixelScale();
    qualityPill.textContent = seamlessMode() ? "Smooth studio" : quality === "lite" ? "Lite studio" : "Studio view";
    THREE = await importWithTimeout(THREE_URL, THREE_LOAD_TIMEOUT_MS);
    document.documentElement.setAttribute("data-engine", `three.js r${THREE.REVISION}`);
    setModePreference("world");
    exposeModePreferenceForVerifier();
    track("mode_enter_world", { source: "world_route", quality });
    createStudio();
    stations.forEach(createStation);
    createStationControls();
    createGrowthControls();
    initStationPanelToggle();
    const requestedStation = stations.find((station) => station.id === params.get("station"));
    const initialStation = requestedStation || stations[0];
    selectStation(initialStation.id, { openLive: false, glide: false });
    if (requestedStation) {
      focusStationCameraInstant(requestedStation.id);
    }
    window.__showcaseWorldReady = true;
    window.__showcaseWorld = {
      getState() {
        return {
          stationCount: stations.length,
          selectedStationId: selectedStation.id,
          activeScreenStationId,
          inspecting: !!activeScreenStationId,
          fullscreen: !!document.fullscreenElement,
          colliderCount: galleryColliders.length,
          layoutVersion: GALLERY_LAYOUT_VERSION,
          heroWallClusterApproved: HERO_WALL_CLUSTER_APPROVED,
          quality,
          camera: {
            x: Number(camera.position.x.toFixed(3)),
            y: Number(camera.position.y.toFixed(3)),
            z: Number(camera.position.z.toFixed(3)),
            yaw: Number(lookState.yaw.toFixed(3)),
            pitch: Number(lookState.pitch.toFixed(3))
          },
          render: renderMetrics(),
          pixelCheck: lastPixelCheck,
          warmup: lastWarmup,
          qa: getQaSummary()
        };
      },
      getQaReport() {
        return JSON.stringify(getQaSummary(), null, 2);
      }
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("click", handlePointerClick);
    canvas.addEventListener("wheel", handleGalleryWheel, { passive: false });
    mobileMovePad?.addEventListener("pointerdown", handleMovePadPointerDown);
    mobileMovePad?.addEventListener("pointermove", handleMovePadPointerMove);
    mobileMovePad?.addEventListener("pointerup", handleMovePadPointerUp);
    mobileMovePad?.addEventListener("pointercancel", handleMovePadPointerUp);
    mobileMovePad?.addEventListener("keydown", handleMovePadKeyDown);
    mobileMovePad?.addEventListener("keyup", handleMovePadKeyUp);
    inspectHint?.addEventListener("click", () => {
      const stationId = inspectHint.dataset.stationId || selectedStation.id;
      const object = stationObjects.get(stationId);
      if (!object) return;
      selectStation(stationId, { openLive: false, glide: !canInteractWithStationScreen(object) });
      if (canInteractWithStationScreen(object)) activateStationInteraction(object);
    });
    fullscreenButton?.addEventListener("click", toggleWorldFullscreen);
    screenViewerClose?.addEventListener("click", () => closeScreenViewer());
    screenViewerScrollUp?.addEventListener("click", () => scrollActiveScreenBy(-320));
    screenViewerScrollDown?.addEventListener("click", () => scrollActiveScreenBy(320));
    screenViewerFullscreen?.addEventListener("click", () => toggleScreenViewerFullscreen());
    screenViewerLive?.addEventListener("click", () => {
      const stationId = activeScreenStationId || selectedStation.id;
      const object = stationObjects.get(stationId);
      openLiveSite(object?.station || selectedStation);
    });
    screenViewerScroll?.addEventListener("scroll", syncTextureFromScreenViewer, { passive: true });
    screenViewerScroll?.addEventListener("keydown", handleInspectionScrollKey);
    screenViewer?.addEventListener("wheel", handleInspectionWheel, { passive: false });
    screenViewerImage?.addEventListener("load", () => {
      if (!activeScreenStationId) return;
      syncScreenViewerFromTexture(stationObjects.get(activeScreenStationId));
    });
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("mousemove", handlePointerLockMove);
    window.addEventListener("popstate", handleHistoryPop);
    window.addEventListener("keydown", handleGalleryKeyDown);
    window.addEventListener("keydown", handleScreenViewerKeyDown);
    window.addEventListener("keyup", handleGalleryKeyUp);
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      track("webgl_context_lost", {});
      showFallback("The studio view paused because the graphics context was lost.", false);
    });
    canvas.addEventListener("webglcontextrestored", () => {
      requestRender();
    });
    window.addEventListener("resize", handleResize);
    window.addEventListener("resize", syncStationPanelMode);

    if (isLocalhost() && params.get("simulateContextLoss") === "1") {
      window.setTimeout(() => {
        canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
      }, 160);
    }

    window.setTimeout(() => {
      track("world_session_90s", {});
    }, 90000);

    requestRender();
    runWarmupCheck();
    runIntroGlide();
    updateQaDiagnostics({ route: "world running" });
    runQaFrameProbe();
  } catch (error) {
    track("world_dependency_failed", { message: error && error.message ? error.message : "unknown" });
    showFallback("The studio view could not load its 3D engine. Use the standard view instead.", false);
  }
}

initStaticLinks();
initQaDiagnostics();

tryAnywayButton.addEventListener("click", () => {
  window.sessionStorage.setItem("world-try-anyway", "1");
  fallback.hidden = true;
  canvas.style.visibility = "visible";
  updateQaDiagnostics({ route: "try anyway" });
  startWorld();
});

if (routeGuards()) {
  startWorld();
}
