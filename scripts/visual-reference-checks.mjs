import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.VISUAL_CHECK_PORT || 5190);
const baseUrl = `http://127.0.0.1:${port}`;
const screenshotsDir = path.join(root, 'tmp', 'visual-reference-checks');
const referenceImage =
  process.env.COMEBACK_REFERENCE_IMAGE ||
  path.join(root, 'src', 'assets', 'game', 'reference', 'comeback-city-original-reference.png');
const plazaSpecPath = path.join(root, 'src', 'assets', 'game', 'plaza-reference-spec.json');
const plazaReferenceSpec = JSON.parse(await readFile(plazaSpecPath, 'utf8'));

const fail = (message, detail = {}) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
};

const assertNoDesktopReferencePlateSource = async () => {
  const scenePath = path.join(root, 'src', 'game', 'ComebackCityScene3D.jsx');
  const source = await readFile(scenePath, 'utf8');
  const forbiddenPatterns = [
    {
      label: 'full-panel traced raster texture creator',
      pattern: /createTracedPlazaRasterLayerTexture/,
    },
    {
      label: 'full-panel traced raster layer call',
      pattern: /addTracedPlazaRasterLayer\s*\(/,
    },
  ];
  const matches = forbiddenPatterns.filter(({ pattern }) => pattern.test(source)).map(({ label }) => label);
  if (matches.length) {
    fail('desktop plaza uses a full-panel reference-derived raster plate in runtime scene code', { matches, scenePath });
  }
};

const panels = [
  {
    appPath: 'panel-1-desktop-plaza-app.png',
    aspectRange: [1.74, 1.82],
    canvasSelector: 'canvas[data-visual-canvas="plaza"]',
    crop: { h: 522, w: 1058, x: 4, y: 5 },
    forbidden: ['.world-destination-button', '.race-track-card', '.arcade-mobile-controls', '.world-hud-panel', '.ref-district--scene', '.reference-canvas'],
    id: 'panel-1',
    layoutAssertions: {
      landmarks: {
        beacon: { centerX: [0.45, 0.66], centerY: [0.28, 0.72], height: [0.2, 0.95], width: [0.04, 0.18] },
        clinic: { centerX: [0.58, 0.82], centerY: [0.34, 0.72], height: [0.16, 0.52], width: [0.08, 0.32] },
        food: { centerX: [0.22, 0.4], centerY: [0.34, 0.72], height: [0.16, 0.52], width: [0.08, 0.32] },
        garage: { centerX: [0.76, 1.03], centerY: [0.34, 0.74], height: [0.16, 0.54], width: [0.08, 0.38] },
        gym: { centerX: [0.06, 0.27], centerY: [0.36, 0.74], height: [0.16, 0.56], width: [0.08, 0.32] },
        lab: { centerX: [0.38, 0.58], centerY: [0.3, 0.72], height: [0.18, 0.58], width: [0.07, 0.32] },
        mountainsClouds: { centerX: [0.25, 0.75], centerY: [-0.15, 0.38], height: [0.08, 0.8], width: [0.6, 1.6] },
        roundabout: { centerX: [0.44, 0.68], centerY: [0.62, 0.88], height: [0.12, 0.37], width: [0.14, 0.5] },
        skyline: { centerX: [0.35, 0.68], centerY: [0.08, 0.42], height: [0.18, 0.62], width: [0.54, 1.2] },
        waterBridge: { centerX: [-0.25, 0.32], centerY: [0.64, 1.2], height: [0.05, 0.5], width: [0.25, 1.2] },
      },
      orderedDistricts: ['gym', 'food', 'lab', 'clinic', 'garage'],
    },
    maxMeanDiff: 44,
    regionMaxMeanDiff: {
      districts: 49,
      logo: 54,
      roads: 46,
      roundabout: 44,
    },
    minBox: { h: 650, w: 1180 },
    name: 'desktop plaza',
    plazaSpec: true,
    referencePath: 'panel-1-desktop-plaza-reference.png',
    requireWebGL: true,
    required: ['.comeback-city-logo', 'canvas[data-visual-canvas="plaza"]', '.reference-plaza__hit--gym', '.reference-plaza__hit--food', '.reference-plaza__hit--lab', '.reference-plaza__hit--clinic', '.reference-plaza__hit--garage'],
    selector: '[data-visual-section="desktop-plaza"]',
    url: `${baseUrl}/#visual-plaza`,
    viewport: { height: 900, width: 1440 },
  },
  {
    appPath: 'panel-2-mobile-race-app.png',
    aspectRange: [0.43, 0.48],
    canvasSelector: 'canvas[data-visual-canvas="race"]',
    crop: { h: 690, w: 466, x: 1066, y: 5 },
    forbidden: ['.race-track-card', '.arcade-mobile-controls', '.arcade-touch-controls', '.mobile-race-reference', '.mobile-race-reference__backdrop', '[src*="comeback-city-race-backdrop"]', '.kart-css', '[aria-label="Drift"]', '[aria-label="Jump"]', '.world-destination-button'],
    id: 'panel-2',
    maxMeanDiff: 54,
    minBox: { h: 830, w: 380 },
    name: 'mobile race',
    referencePath: 'panel-2-mobile-race-reference.png',
    requireWebGL: true,
    required: ['canvas[data-visual-canvas="race"]', '.objective-card', '.currency-stack', '.race-minimap', '.arcade-go-button'],
    selector: '[data-visual-section="mobile-race"]',
    url: `${baseUrl}/#race`,
    viewport: { height: 844, isMobile: true, width: 390 },
  },
  {
    appPath: 'panel-3-district-closeups-app.png',
    aspectRange: [5.4, 7.2],
    canvasSelector: 'canvas[data-visual-canvas="district-gym"]',
    crop: { h: 166, w: 1058, x: 4, y: 530 },
    forbidden: ['.world-destination-button', '.race-track-card', '.ref-district--closeup'],
    id: 'panel-3',
    maxMeanDiff: 80,
    minBox: { h: 160, w: 1000 },
    name: 'district closeups',
    referencePath: 'panel-3-district-closeups-reference.png',
    requireWebGL: true,
    required: ['.district-closeups__tag', '.district-closeups__panel', 'canvas[data-visual-canvas="district-gym"]', 'canvas[data-visual-canvas="district-food"]', 'canvas[data-visual-canvas="district-lab"]', 'canvas[data-visual-canvas="district-clinic"]', 'canvas[data-visual-canvas="district-garage"]', '[title="Gym"]', '[title="Food Court"]', '[title="Lab"]', '[title="Clinic"]', '[title="Garage"]'],
    selector: '[data-visual-section="district-closeups"]',
    url: `${baseUrl}/#visual-districts`,
    viewport: { height: 260, width: 1120 },
  },
  {
    appPath: 'panel-4-kart-sheet-app.png',
    aspectRange: [2.35, 2.85],
    canvasSelector: 'canvas[data-visual-canvas="kart-hero"]',
    crop: { h: 319, w: 844, x: 4, y: 701 },
    forbidden: ['.race-track-card', '.arcade-mobile-controls', '.kart-css'],
    id: 'panel-4',
    maxMeanDiff: 58,
    minBox: { h: 300, w: 820 },
    name: 'kart design sheet',
    referencePath: 'panel-4-kart-sheet-reference.png',
    requireWebGL: true,
    required: ['[data-visual-section="garage-sheet"]', 'canvas[data-visual-canvas="kart-hero"]', 'canvas[data-visual-canvas="kart-front"]', 'canvas[data-visual-canvas="kart-side"]', 'canvas[data-visual-canvas="kart-back"]', 'canvas[data-visual-canvas="kart-top"]', '.kart-sheet__swatches', '.kart-sheet__stats', '.kart-sheet__tagline'],
    selector: '[data-visual-section="garage-sheet"]',
    url: `${baseUrl}/#visual-kart`,
    viewport: { height: 420, width: 980 },
  },
  {
    appPath: 'panel-5-hud-board-app.png',
    aspectRange: [1.95, 2.25],
    crop: { h: 319, w: 680, x: 852, y: 701 },
    forbidden: ['.race-track-card', '.arcade-mobile-controls'],
    id: 'panel-5',
    maxMeanDiff: 42,
    minBox: { h: 300, w: 650 },
    name: 'HUD mood board',
    referencePath: 'panel-5-hud-board-reference.png',
    required: ['[data-visual-section="hud-board"]', '.hud-board__level', '.hud-board__xp', '.currency-stack', '.objective-card', '.hud-board__districts', '.hud-board__progress', '.hud-board__daily', '.arcade-go-button'],
    selector: '[data-visual-section="hud-board"]',
    url: `${baseUrl}/#visual-hud`,
    viewport: { height: 420, width: 840 },
  },
];

const waitForServer = async (url, timeoutMs = 30000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  fail('Vite server did not become ready', { url });
};

const dataUrlFromFile = async (file) => {
  const buffer = await readFile(file);
  return `data:image/png;base64,${buffer.toString('base64')}`;
};

const writeDataUrl = async (file, dataUrl) => {
  const [, base64] = dataUrl.split(',');
  await writeFile(file, Buffer.from(base64, 'base64'));
};

const cropReferencePanel = async (imagePage, panel) => {
  const dataUrl = await dataUrlFromFile(referenceImage);
  const cropUrl = await imagePage.evaluate(
    async ({ crop, src }) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = crop.w;
      canvas.height = crop.h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
      return canvas.toDataURL('image/png');
    },
    { crop: panel.crop, src: dataUrl }
  );
  const outputPath = path.join(screenshotsDir, panel.referencePath);
  await writeDataUrl(outputPath, cropUrl);
  return outputPath;
};

const createComparisonImages = async (imagePage, panel, referencePath, appPath, telemetry = null) => {
  const referenceUrl = await dataUrlFromFile(referencePath);
  const appUrl = await dataUrlFromFile(appPath);
  const result = await imagePage.evaluate(
    async ({ appSrc, refSrc, spec, telemetry }) => {
      const load = async (src) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        return image;
      };
      const [reference, app] = await Promise.all([load(refSrc), load(appSrc)]);
      const w = reference.naturalWidth;
      const h = reference.naturalHeight;
      const gutter = 18;

      const scaled = document.createElement('canvas');
      scaled.width = w;
      scaled.height = h;
      const scaledCtx = scaled.getContext('2d');
      scaledCtx.drawImage(app, 0, 0, w, h);

      const refCanvas = document.createElement('canvas');
      refCanvas.width = w;
      refCanvas.height = h;
      const refCtx = refCanvas.getContext('2d');
      refCtx.drawImage(reference, 0, 0, w, h);

      const refData = refCtx.getImageData(0, 0, w, h);
      const appData = scaledCtx.getImageData(0, 0, w, h);
      const diffCanvas = document.createElement('canvas');
      diffCanvas.width = w;
      diffCanvas.height = h;
      const diffCtx = diffCanvas.getContext('2d');
      const diffData = diffCtx.createImageData(w, h);
      let sum = 0;
      let highDrift = 0;

      for (let index = 0; index < refData.data.length; index += 4) {
        const dr = Math.abs(refData.data[index] - appData.data[index]);
        const dg = Math.abs(refData.data[index + 1] - appData.data[index + 1]);
        const db = Math.abs(refData.data[index + 2] - appData.data[index + 2]);
        const delta = (dr + dg + db) / 3;
        sum += delta;
        if (delta > 120) highDrift += 1;
        diffData.data[index] = Math.min(255, dr * 2.2);
        diffData.data[index + 1] = Math.min(255, dg * 2.2);
        diffData.data[index + 2] = Math.min(255, db * 2.2);
        diffData.data[index + 3] = 255;
      }
      diffCtx.putImageData(diffData, 0, 0);

      const side = document.createElement('canvas');
      side.width = w * 2 + gutter;
      side.height = h;
      const sideCtx = side.getContext('2d');
      sideCtx.fillStyle = '#10151d';
      sideCtx.fillRect(0, 0, side.width, side.height);
      sideCtx.drawImage(reference, 0, 0, w, h);
      sideCtx.drawImage(scaled, w + gutter, 0, w, h);

      const overlay = document.createElement('canvas');
      overlay.width = w;
      overlay.height = h;
      const overlayCtx = overlay.getContext('2d');
      overlayCtx.drawImage(reference, 0, 0, w, h);
      overlayCtx.globalAlpha = 0.52;
      overlayCtx.drawImage(scaled, 0, 0, w, h);
      overlayCtx.globalAlpha = 1;

      const drawCropSideBySide = (box) => {
        const crop = document.createElement('canvas');
        crop.width = box.width * 2 + gutter;
        crop.height = box.height;
        const ctx = crop.getContext('2d');
        ctx.fillStyle = '#10151d';
        ctx.fillRect(0, 0, crop.width, crop.height);
        ctx.drawImage(reference, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
        ctx.drawImage(scaled, box.x, box.y, box.width, box.height, box.width + gutter, 0, box.width, box.height);
        return crop.toDataURL('image/png');
      };

      const meanDiffForBox = (box) => {
        let regionSum = 0;
        let samples = 0;
        const left = Math.max(0, Math.round(box.x));
        const top = Math.max(0, Math.round(box.y));
        const right = Math.min(w, Math.round(box.x + box.width));
        const bottom = Math.min(h, Math.round(box.y + box.height));
        for (let y = top; y < bottom; y += 1) {
          for (let x = left; x < right; x += 1) {
            const index = (y * w + x) * 4;
            regionSum +=
              (Math.abs(refData.data[index] - appData.data[index]) +
                Math.abs(refData.data[index + 1] - appData.data[index + 1]) +
                Math.abs(refData.data[index + 2] - appData.data[index + 2])) /
              3;
            samples += 1;
          }
        }
        return samples ? regionSum / samples : 0;
      };

      const drawSpecAnnotations = (baseImage, mode) => {
        if (!spec) return null;
        const annotated = document.createElement('canvas');
        annotated.width = w;
        annotated.height = h;
        const ctx = annotated.getContext('2d');
        ctx.drawImage(baseImage, 0, 0, w, h);
        ctx.font = '700 12px Arial';
        ctx.textBaseline = 'top';

        const label = (text, x, y, color) => {
          const textWidth = ctx.measureText(text).width + 8;
          ctx.fillStyle = 'rgba(3, 8, 20, 0.78)';
          ctx.fillRect(Math.max(0, x), Math.max(0, y - 14), textWidth, 15);
          ctx.fillStyle = color;
          ctx.fillText(text, Math.max(0, x) + 4, Math.max(0, y - 13));
        };
        const box = (target, text, color, lineWidth = 2) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          ctx.strokeRect(target.x, target.y, target.width, target.height);
          label(text, target.x, target.y, color);
        };
        const polyline = (points, text, color) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.stroke();
          points.forEach(([x, y]) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
          });
          const [x, y] = points[Math.floor(points.length / 2)];
          label(text, x + 5, y - 5, color);
        };
        const polygon = (points, text, color) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
          ctx.stroke();
          label(text, points[0][0] + 4, points[0][1] + 4, color);
        };
        const telemetryBox = (source) => ({
          height: source.height * h,
          width: source.width * w,
          x: source.left * w,
          y: source.top * h,
        });
        const telemetryPoint = (source) => [source.x * w, source.y * h];

        const targetColor = mode === 'app' ? '#00f5ff' : '#ffea00';
        const actualColor = '#ff3b3b';
        box(spec.ui.logoBox, 'logo', '#ffffff');
        box(spec.ui.sloganBox, 'slogan', '#ffffff');
        Object.entries(spec.landmarks).forEach(([key, target]) => {
          box(target.full, `${key} target`, targetColor);
          box(target.portal, `${key} portal`, '#7cff5b');
          box(target.sign, `${key} sign`, '#7cff5b');
        });
        const beaconTarget = (() => {
          const boxes = [spec.beacon.beam, spec.beacon.badge, spec.beacon.base];
          const left = Math.min(...boxes.map((item) => item.x));
          const top = Math.min(...boxes.map((item) => item.y));
          const right = Math.max(...boxes.map((item) => item.x + item.width));
          const bottom = Math.max(...boxes.map((item) => item.y + item.height));
          return { x: left, y: top, width: right - left, height: bottom - top };
        })();
        box(beaconTarget, 'beacon target', targetColor);
        box(spec.beacon.badge, 'badge', '#7cff5b');
        box(spec.roundabout.outerEllipse, 'roundabout target', '#ff4fd8');
        box(spec.roundabout.innerIsland, 'island target', '#ff4fd8');
        spec.roads.forEach((road) => polyline(road.polyline, road.id, '#ff4fd8'));
        spec.crosswalks.forEach((crosswalk) => box(crosswalk.box, crosswalk.id, '#ffffff'));
        polygon(spec.bridge.deckPolygon, 'bridge', '#7cff5b');
        polygon(spec.water.polygon, 'water', '#7cff5b');
        box(spec.skyline.band, 'skyline target', '#7cff5b');
        box(spec.mountains.visibilityBand, 'mountains target', '#7cff5b');
        box(spec.clouds.visibilityBand, 'clouds target', '#7cff5b');

        if (mode === 'app' && telemetry?.landmarks) {
          Object.entries(telemetry.landmarks).forEach(([key, source]) => {
            if (!source) return;
            if (['gym', 'food', 'lab', 'clinic', 'garage', 'beacon', 'roundabout', 'skyline', 'mountainsClouds'].includes(key)) {
              box(telemetryBox(source), `${key} actual`, actualColor, 2);
            }
          });
          Object.entries(telemetry.roadCurves || {}).forEach(([key, curve]) => {
            if (!curve?.points?.length) return;
            polyline(curve.points.map(telemetryPoint), `${key} actual`, actualColor);
          });
        }

        return annotated.toDataURL('image/png');
      };

      return {
        annotatedApp: drawSpecAnnotations(scaled, 'app'),
        annotatedReference: drawSpecAnnotations(reference, 'reference'),
        crops: spec
          ? {
              districts: drawCropSideBySide({ x: 30, y: 185, width: 1020, height: 205 }),
              logo: drawCropSideBySide({ x: 0, y: 0, width: 300, height: 205 }),
              roads: drawCropSideBySide({ x: 0, y: 330, width: 1058, height: 192 }),
              roundabout: drawCropSideBySide({ x: 430, y: 315, width: 350, height: 170 }),
            }
          : null,
        diff: diffCanvas.toDataURL('image/png'),
        highDriftRatio: highDrift / (w * h),
        meanDiff: sum / (w * h),
        overlay: overlay.toDataURL('image/png'),
        regionDiffs: spec
          ? {
              districts: meanDiffForBox({ x: 30, y: 185, width: 1020, height: 205 }),
              logo: meanDiffForBox({ x: 0, y: 0, width: 300, height: 205 }),
              roads: meanDiffForBox({ x: 0, y: 330, width: 1058, height: 192 }),
              roundabout: meanDiffForBox({ x: 430, y: 315, width: 350, height: 170 }),
            }
          : null,
        sideBySide: side.toDataURL('image/png'),
      };
    },
    { appSrc: appUrl, refSrc: referenceUrl, spec: panel.plazaSpec ? plazaReferenceSpec : null, telemetry }
  );

  const sideBySidePath = path.join(screenshotsDir, `${panel.id}-${panel.name.replaceAll(' ', '-')}-side-by-side.png`);
  const overlayPath = path.join(screenshotsDir, `${panel.id}-${panel.name.replaceAll(' ', '-')}-overlay.png`);
  const diffPath = path.join(screenshotsDir, `${panel.id}-${panel.name.replaceAll(' ', '-')}-diff.png`);
  await writeDataUrl(sideBySidePath, result.sideBySide);
  await writeDataUrl(overlayPath, result.overlay);
  await writeDataUrl(diffPath, result.diff);
  const annotatedReferencePath = panel.plazaSpec ? path.join(screenshotsDir, 'panel-1-reference-annotated.png') : null;
  const annotatedAppPath = panel.plazaSpec ? path.join(screenshotsDir, 'panel-1-app-annotated.png') : null;
  if (annotatedReferencePath && result.annotatedReference) await writeDataUrl(annotatedReferencePath, result.annotatedReference);
  if (annotatedAppPath && result.annotatedApp) await writeDataUrl(annotatedAppPath, result.annotatedApp);
  const cropPaths = {};
  if (panel.plazaSpec && result.crops) {
    for (const [name, dataUrl] of Object.entries(result.crops)) {
      const cropPath = path.join(screenshotsDir, `panel-1-${name}-crop-side-by-side.png`);
      await writeDataUrl(cropPath, dataUrl);
      cropPaths[name] = cropPath;
    }
  }

  const regionFailures = Object.entries(panel.regionMaxMeanDiff || {})
    .map(([name, maxMeanDiff]) => ({
      maxMeanDiff,
      meanDiff: result.regionDiffs?.[name],
      name,
    }))
    .filter((region) => Number.isFinite(region.meanDiff) && region.meanDiff > region.maxMeanDiff)
    .map((region) => ({
      ...region,
      meanDiff: Number(region.meanDiff.toFixed(1)),
    }));
  const meanFailure = result.meanDiff > panel.maxMeanDiff || result.highDriftRatio > 0.24;

  return {
    annotatedAppPath,
    annotatedReferencePath,
    cropPaths,
    diffPath,
    driftFailure:
      meanFailure || regionFailures.length
        ? {
            highDriftRatio: Number(result.highDriftRatio.toFixed(3)),
            maxMeanDiff: panel.maxMeanDiff,
            meanDiff: Number(result.meanDiff.toFixed(1)),
            panel: panel.id,
            regionFailures,
          }
        : null,
    highDriftRatio: result.highDriftRatio,
    meanDiff: result.meanDiff,
    overlayPath,
    sideBySidePath,
  };
};

const assertVisible = async (page, selector, label) => {
  const locator = page.locator(selector);
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible()) return;
  }
  fail(`${label} is missing`, { count, selector });
};

const assertNotVisible = async (page, selector, label) => {
  const locator = page.locator(selector);
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible()) {
      const text = await locator.nth(index).innerText().catch(() => '');
      fail(`${label} contains a non-reference control`, { selector, text });
    }
  }
};

const assertCanvasNonblank = async (page, variant, label) => {
  const result = await page.evaluate((canvasVariant) => {
    const canvas = canvasVariant.startsWith?.('canvas')
      ? document.querySelector(canvasVariant)
      : document.querySelector(`[data-visual-canvas="${canvasVariant}"]`);
    if (!canvas) return { exists: false };
    const w = canvas.width;
    const h = canvas.height;
    const isWebGL = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    if (w < 20 || h < 20) return { exists: true, invalid: true, isWebGL, w, h };
    const probe = document.createElement('canvas');
    probe.width = w;
    probe.height = h;
    const ctx = probe.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { exists: true, invalid: true, isWebGL, w, h };
    ctx.drawImage(canvas, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let samples = 0;
    let sum = 0;
    let sumSq = 0;
    const step = Math.max(4, Math.floor(data.length / 2400 / 4) * 4);
    for (let index = 0; index < data.length; index += step) {
      const value = (data[index] + data[index + 1] + data[index + 2]) / 3;
      sum += value;
      sumSq += value * value;
      samples += 1;
    }
    const mean = sum / samples;
    const variance = sumSq / samples - mean * mean;
    return { exists: true, h, isWebGL, mean, samples, variance, w };
  }, variant);

  // WebGL canvases can read back as black when preserveDrawingBuffer is false.
  // The following screenshot comparison still catches blank WebGL output.
  if (!result.exists || result.invalid || (!result.isWebGL && result.variance < 80)) {
    fail(`${label} canvas rendered blank`, result);
  }
  return result;
};

const assertFraming = async (page, panel) => {
  const box = await page.locator(panel.selector).first().boundingBox();
  if (!box) fail(`${panel.name} panel is not measurable`);
  const aspect = box.width / box.height;
  const [minAspect, maxAspect] = panel.aspectRange;
  if (box.width < panel.minBox.w || box.height < panel.minBox.h || aspect < minAspect || aspect > maxAspect) {
    fail(`${panel.name} framing is outside target`, {
      aspect: Number(aspect.toFixed(3)),
      box,
      expectedAspect: panel.aspectRange,
      minBox: panel.minBox,
    });
  }
};

const assertRaceTelemetry = async (page, panel) => {
  if (panel.id !== 'panel-2') return;
  await page.waitForFunction(() => window.__raceVisualTelemetry?.trackKey === 'comeback-city', null, {
    timeout: 10000,
  });
  const telemetry = await page.evaluate(() => window.__raceVisualTelemetry);
  const coverage = telemetry?.kartScreenCoverage || {};
  if (
    !telemetry ||
    telemetry.assetLoadState?.externalAssets !== 0 ||
    coverage.heightRatio < 0.13 ||
    coverage.heightRatio > 0.38 ||
    coverage.centerYRatio < 0.55 ||
    coverage.centerYRatio > 0.88 ||
    telemetry.roadAheadCoverage?.value < 0.45
  ) {
    fail('mobile race telemetry is outside target bands', {
      assetLoadState: telemetry?.assetLoadState,
      kartScreenCoverage: coverage,
      roadAheadCoverage: telemetry?.roadAheadCoverage,
    });
  }
};

const assertInRange = (value, range, label) => {
  if (!Number.isFinite(value) || value < range[0] || value > range[1]) {
    fail(`${label} is outside target band`, {
      actual: Number.isFinite(value) ? Number(value.toFixed(4)) : value,
      expected: range,
    });
  }
};

const assertNoStaticReferenceUsage = async (page, panel) => {
  if (!panel.plazaSpec) return;
  const basename = path.basename(referenceImage);
  const matches = await page.evaluate((needle) => {
    const urls = [
      ...performance.getEntriesByType('resource').map((entry) => entry.name),
      ...Array.from(document.images).map((image) => image.currentSrc || image.src),
      ...Array.from(document.querySelectorAll('*')).map((element) => {
        const style = getComputedStyle(element);
        return `${style.backgroundImage} ${style.content}`;
      }),
    ];
    return urls.filter((url) => url && url.includes(needle));
  }, basename);
  if (matches.length) {
    fail(`${panel.name} uses the static reference image at runtime`, { matches });
  }
};

const unionBoxes = (boxes) => {
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { height: bottom - top, width: right - left, x: left, y: top };
};

const telemetryBoxToPixels = (box) => ({
  height: box.height * plazaReferenceSpec.source.size.height,
  width: box.width * plazaReferenceSpec.source.size.width,
  x: box.left * plazaReferenceSpec.source.size.width,
  y: box.top * plazaReferenceSpec.source.size.height,
});

const boxCenter = (box) => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const round = (value) => Number(value.toFixed(1));

const compactBox = (box) => ({
  height: round(box.height),
  width: round(box.width),
  x: round(box.x),
  y: round(box.y),
});

const collectBoxFailure = (failures, label, telemetryBox, targetBox, options = {}) => {
  if (!telemetryBox) {
    failures.push({ label, reason: 'missing telemetry box' });
    return;
  }
  const actual = telemetryBoxToPixels(telemetryBox);
  const targetCenter = options.targetCenter || boxCenter(targetBox);
  const centerErrorPx = distance(boxCenter(actual), targetCenter);
  const widthErrorRatio = Math.abs(actual.width - targetBox.width) / Math.max(1, targetBox.width);
  const heightErrorRatio = Math.abs(actual.height - targetBox.height) / Math.max(1, targetBox.height);
  const centerTolerancePx = options.centerTolerancePx ?? plazaReferenceSpec.testTolerances.landmarkCenterPx;
  const sizeRatioTolerance = options.sizeRatioTolerance ?? plazaReferenceSpec.testTolerances.landmarkSizeRatio;

  if (
    centerErrorPx > centerTolerancePx ||
    widthErrorRatio > sizeRatioTolerance ||
    heightErrorRatio > sizeRatioTolerance
  ) {
    failures.push({
      actual: compactBox(actual),
      centerErrorPx: round(centerErrorPx),
      centerTolerancePx,
      heightErrorRatio: Number(heightErrorRatio.toFixed(3)),
      label,
      target: compactBox(targetBox),
      widthErrorRatio: Number(widthErrorRatio.toFixed(3)),
    });
  }
};

const interpolatePoint = (points, t) => {
  if (points.length === 1) return points[0];
  const scaled = t * (points.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(points.length - 1, index + 1);
  const local = scaled - index;
  return {
    x: points[index].x + (points[nextIndex].x - points[index].x) * local,
    y: points[index].y + (points[nextIndex].y - points[index].y) * local,
  };
};

const collectRoadFailure = (failures, road, telemetryCurve) => {
  if (!telemetryCurve?.points?.length) {
    failures.push({ label: `road ${road.id}`, reason: 'missing road curve telemetry' });
    return;
  }
  const actualPoints = telemetryCurve.points.map((point) => ({
    x: point.x * plazaReferenceSpec.source.size.width,
    y: point.y * plazaReferenceSpec.source.size.height,
  }));
  const errors = road.polyline.map(([x, y], index) => {
    const t = road.polyline.length === 1 ? 0 : index / (road.polyline.length - 1);
    return Math.hypot(interpolatePoint(actualPoints, t).x - x, interpolatePoint(actualPoints, t).y - y);
  });
  const averagePointErrorPx = errors.reduce((sum, value) => sum + value, 0) / errors.length;
  const tolerancePx = plazaReferenceSpec.testTolerances.roadAveragePointPx;
  if (averagePointErrorPx > tolerancePx) {
    failures.push({
      averagePointErrorPx: round(averagePointErrorPx),
      label: `road ${road.id}`,
      maxPointErrorPx: round(Math.max(...errors)),
      pointCount: road.polyline.length,
      tolerancePx,
    });
  }
};

const collectPlazaSpecFailures = (telemetry) => {
  const failures = [];
  const landmarks = telemetry?.landmarks || {};
  const required = ['gym', 'food', 'lab', 'clinic', 'garage', 'beacon', 'roundabout', 'skyline', 'mountainsClouds'];
  const missing = required.filter((key) => !landmarks[key]);
  if (missing.length) failures.push({ label: 'required landmarks', missing });

  for (let index = 1; index < plazaReferenceSpec.districtOrder.length; index += 1) {
    const previous = landmarks[plazaReferenceSpec.districtOrder[index - 1]];
    const next = landmarks[plazaReferenceSpec.districtOrder[index]];
    if (!previous || !next || previous.centerX >= next.centerX) {
      failures.push({
        label: 'district order',
        order: Object.fromEntries(plazaReferenceSpec.districtOrder.map((key) => [key, landmarks[key]?.centerX ?? null])),
      });
      break;
    }
  }

  Object.entries(plazaReferenceSpec.landmarks).forEach(([key, target]) => {
    collectBoxFailure(failures, `landmark ${key}`, landmarks[key], target.full);
  });

  const beaconTarget = unionBoxes([
    plazaReferenceSpec.beacon.beam,
    plazaReferenceSpec.beacon.badge,
    plazaReferenceSpec.beacon.base,
  ]);
  collectBoxFailure(failures, 'landmark beacon', landmarks.beacon, beaconTarget, {
    centerTolerancePx: 30,
    sizeRatioTolerance: 0.3,
  });
  collectBoxFailure(failures, 'roundabout outer ellipse', landmarks.roundabout, plazaReferenceSpec.roundabout.outerEllipse, {
    centerTolerancePx: plazaReferenceSpec.testTolerances.roundaboutCenterPx,
    sizeRatioTolerance: plazaReferenceSpec.testTolerances.roundaboutSizeRatio,
    targetCenter: plazaReferenceSpec.roundabout.center,
  });
  collectBoxFailure(failures, 'skyline band', landmarks.skyline, plazaReferenceSpec.skyline.band, {
    centerTolerancePx: 58,
    sizeRatioTolerance: 0.42,
  });
  collectBoxFailure(
    failures,
    'mountains/clouds band',
    landmarks.mountainsClouds,
    unionBoxes([plazaReferenceSpec.mountains.visibilityBand, plazaReferenceSpec.clouds.visibilityBand]),
    {
      centerTolerancePx: 72,
      sizeRatioTolerance: 0.5,
    }
  );

  plazaReferenceSpec.roads.forEach((road) => {
    collectRoadFailure(failures, road, telemetry?.roadCurves?.[road.id]);
  });

  return failures;
};

const getPlazaTelemetry = async (page, panel) => {
  if (!panel.layoutAssertions && !panel.plazaSpec) return { failures: [], telemetry: null };
  await page.waitForFunction(() => window.__plazaVisualTelemetry?.landmarks?.roundabout, null, {
    timeout: 10000,
  });
  const telemetry = await page.evaluate(() => window.__plazaVisualTelemetry);
  if (panel.plazaSpec) return { failures: collectPlazaSpecFailures(telemetry), telemetry };

  const landmarks = telemetry?.landmarks || {};
  const missing = Object.keys(panel.layoutAssertions.landmarks).filter((key) => !landmarks[key]);
  if (missing.length) {
    fail('desktop plaza landmark telemetry is missing required objects', { missing, telemetry });
  }

  Object.entries(panel.layoutAssertions.landmarks).forEach(([key, expectations]) => {
    Object.entries(expectations).forEach(([metric, range]) => {
      assertInRange(landmarks[key]?.[metric], range, `${panel.name}: ${key}.${metric}`);
    });
  });

  const ordered = panel.layoutAssertions.orderedDistricts || [];
  for (let index = 1; index < ordered.length; index += 1) {
    const prev = landmarks[ordered[index - 1]];
    const next = landmarks[ordered[index]];
    if (!(prev.centerX < next.centerX)) {
      fail('desktop plaza district order is wrong', {
        landmarks: Object.fromEntries(ordered.map((key) => [key, landmarks[key]?.centerX])),
      });
    }
  }

  return { failures: [], telemetry };
};

const capturePanel = async (browser, panel) => {
  const page = await browser.newPage({ viewport: panel.viewport });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error' && !text.includes('the server responded with a status of 404')) {
      errors.push(text);
    }
  });

  await page.goto(panel.url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForSelector(panel.selector, { timeout: 15000 });
  await page.waitForTimeout(1000);

  for (const selector of panel.required) {
    await assertVisible(page, selector, `${panel.name}: ${selector}`);
  }
  for (const selector of panel.forbidden) {
    await assertNotVisible(page, selector, panel.name);
  }
  if (panel.canvasSelector || panel.canvas) {
    const canvasResult = await assertCanvasNonblank(page, panel.canvasSelector || panel.canvas, panel.name);
    if (panel.requireWebGL && !canvasResult.isWebGL) {
      fail(`${panel.name} canvas is not a WebGL/Three.js canvas`, canvasResult);
    }
  }
  await assertNoStaticReferenceUsage(page, panel);
  await assertFraming(page, panel);
  const plazaTelemetry = await getPlazaTelemetry(page, panel);
  await assertRaceTelemetry(page, panel);

  const appPath = path.join(screenshotsDir, panel.appPath);
  await page.locator(panel.selector).first().screenshot({ path: appPath });
  if (errors.length) fail(`${panel.name} reported browser errors`, { errors });
  await page.close();
  return { appPath, plazaFailures: plazaTelemetry.failures, plazaTelemetry: plazaTelemetry.telemetry };
};

const run = async () => {
  await rm(screenshotsDir, { force: true, recursive: true });
  await mkdir(screenshotsDir, { recursive: true });
  await assertNoDesktopReferencePlateSource();

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = spawn(npm, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverLog = '';
  server.stdout.on('data', (chunk) => {
    serverLog += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    serverLog += chunk.toString();
  });

  let browser;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch({
      args: ['--ignore-gpu-blocklist', '--use-gl=swiftshader'],
      headless: true,
    });
    const imagePage = await browser.newPage();

    const results = [];
    const driftFailures = [];
    const strictFailures = [];
    for (const panel of panels) {
      const referencePath = await cropReferencePanel(imagePage, panel);
      const capture = await capturePanel(browser, panel);
      const comparison = await createComparisonImages(
        imagePage,
        panel,
        referencePath,
        capture.appPath,
        capture.plazaTelemetry
      );
      if (comparison.driftFailure) {
        driftFailures.push({ name: panel.name, ...comparison.driftFailure });
      }
      if (capture.plazaFailures?.length) {
        strictFailures.push({
          failures: capture.plazaFailures,
          name: panel.name,
        });
      }
      results.push({
        annotatedAppPath: comparison.annotatedAppPath,
        annotatedReferencePath: comparison.annotatedReferencePath,
        appPath: capture.appPath,
        comparisonPath: comparison.sideBySidePath,
        cropPaths: comparison.cropPaths,
        diffPath: comparison.diffPath,
        meanDiff: Number(comparison.meanDiff.toFixed(1)),
        name: panel.name,
        overlayPath: comparison.overlayPath,
        referencePath,
      });
    }
    await imagePage.close();

    console.log(JSON.stringify({ referenceImage, screenshotsDir, results }, null, 2));
    if (strictFailures.length || driftFailures.length) {
      fail('Visual reference checks detected desktop plaza spec drift or obvious color/layout drift', {
        driftFailures,
        screenshotsDir,
        strictFailures,
      });
    }
  } catch (error) {
    if (serverLog) error.serverLog = serverLog.slice(-4000);
    throw error;
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
};

run().catch((error) => {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  if (error.serverLog) console.error(error.serverLog);
  process.exit(1);
});
