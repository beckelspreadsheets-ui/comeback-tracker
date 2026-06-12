import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright';
import { RACE_TRACKS } from '../src/game/raceTracks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.RACE_PLAYTEST_PORT || 5187);
const baseUrl = `http://127.0.0.1:${port}`;
const screenshotsDir = path.join(root, 'tmp', 'race-playtests');
const visualSnapshotReadyTimeoutMs = Number(process.env.RACE_VISUAL_READY_TIMEOUT_MS || 25000);
const visualThresholds = {
  desktop: {
    kartMax: 0.42,
    kartMin: 0.14,
    roadAheadMin: 0.45,
  },
  mobile: {
    kartMax: 0.28,
    kartMin: 0.16,
    roadAheadMin: 0.45,
  },
};

const fail = (message, detail = {}) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
};

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

const getGitMetadata = () => {
  try {
    return {
      branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim() || null,
      commit: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() || null,
    };
  } catch {
    return { branch: null, commit: null };
  }
};

const paethPredictor = (left, up, upLeft) => {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  return upDistance <= upLeftDistance ? up : upLeft;
};

const decodePng = (buffer) => {
  const signature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== signature) fail('Screenshot was not a PNG file');
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += length + 12;
  }

  const channelsByColorType = new Map([
    [0, 1],
    [2, 3],
    [4, 2],
    [6, 4],
  ]);
  const channels = channelsByColorType.get(colorType);
  if (!width || !height || bitDepth !== 8 || !channels || !idatChunks.length) {
    fail('Screenshot PNG format was unsupported for visual blank check', {
      bitDepth,
      colorType,
      height,
      idatChunks: idatChunks.length,
      width,
    });
  }

  const inflated = inflateSync(Buffer.concat(idatChunks));
  const stride = width * channels;
  const pixels = Buffer.alloc(width * height * channels);
  let sourceOffset = 0;
  let targetOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const row = Buffer.from(inflated.subarray(sourceOffset, sourceOffset + stride));
    sourceOffset += stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? row[x - channels] : 0;
      const up = previous[x] || 0;
      const upLeft = x >= channels ? previous[x - channels] || 0 : 0;
      if (filter === 1) row[x] = (row[x] + left) & 255;
      else if (filter === 2) row[x] = (row[x] + up) & 255;
      else if (filter === 3) row[x] = (row[x] + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) row[x] = (row[x] + paethPredictor(left, up, upLeft)) & 255;
      else if (filter !== 0) fail('Screenshot PNG used unsupported row filter', { filter });
    }
    row.copy(pixels, targetOffset);
    targetOffset += stride;
    previous = row;
  }

  return {
    channels,
    height,
    pixels,
    width,
  };
};

const visualStatsForPng = ({ channels, height, pixels, width }) => {
  const minX = Math.floor(width * 0.18);
  const maxX = Math.ceil(width * 0.82);
  const minY = Math.floor(height * 0.18);
  const maxY = Math.ceil(height * 0.82);
  const xStep = Math.max(1, Math.floor((maxX - minX) / 96));
  const yStep = Math.max(1, Math.floor((maxY - minY) / 72));
  const colorBuckets = new Set();
  let luminanceMin = Infinity;
  let luminanceMax = -Infinity;
  let sampleCount = 0;

  for (let y = minY; y < maxY; y += yStep) {
    for (let x = minX; x < maxX; x += xStep) {
      const index = (y * width + x) * channels;
      const r = pixels[index] || 0;
      const g = channels >= 3 ? pixels[index + 1] || 0 : r;
      const b = channels >= 3 ? pixels[index + 2] || 0 : r;
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      luminanceMin = Math.min(luminanceMin, luminance);
      luminanceMax = Math.max(luminanceMax, luminance);
      colorBuckets.add(`${r >> 4}:${g >> 4}:${b >> 4}`);
      sampleCount += 1;
    }
  }

  return {
    colorBucketCount: colorBuckets.size,
    luminanceRange: Number((luminanceMax - luminanceMin).toFixed(2)),
    sampleCount,
  };
};

const assertScreenshotNonBlank = async (screenshotPath, detail = {}) => {
  const stats = visualStatsForPng(decodePng(await readFile(screenshotPath)));
  if (stats.sampleCount < 100 || stats.luminanceRange < 8 || stats.colorBucketCount < 8) {
    fail('Race screenshot rendered visually blank or too uniform', {
      ...detail,
      screenshotPath,
      stats,
    });
  }
  return stats;
};

const captureScreenshotWithVisualCheck = async ({
  attempts = 3,
  delayMs = 450,
  detail = {},
  page,
  screenshotPath,
} = {}) => {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await page.screenshot({ fullPage: false, path: screenshotPath });
    try {
      return await assertScreenshotNonBlank(screenshotPath, {
        ...detail,
        attempt,
      });
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
      await page.waitForTimeout(delayMs);
    }
  }
  throw lastError;
};

const summarizeVisualTelemetry = (telemetry) => ({
  activeSurface: telemetry?.activeSurface ?? null,
  audioMuted: telemetry?.player?.audioMuted ?? null,
  boostActive: telemetry?.player?.boostActive ?? null,
  boostPadVisualActive: telemetry?.player?.boostPadVisualActive ?? null,
  boostBurstVisualActive: telemetry?.player?.boostBurstVisualActive ?? null,
  boostSource: telemetry?.player?.boostSource ?? null,
  cameraAvoidanceCount: telemetry?.camera?.avoidanceCount ?? null,
  cameraClipCount: telemetry?.camera?.clipCount ?? null,
  collisionSpeedLossRatio: telemetry?.player?.collisionSpeedLossRatio ?? null,
  driftActive: telemetry?.player?.driftActive ?? null,
  driftTier: telemetry?.player?.driftTier ?? null,
  driftTierSeen: telemetry?.player?.driftTierSeen ?? null,
  driftTrailVisualActive: telemetry?.player?.driftTrailVisualActive ?? null,
  deliveredFps: telemetry?.deliveredFps ?? null,
  actualFps: telemetry?.actualFps ?? null,
  fps: telemetry?.fps ?? null,
  frameBudgetMissCount: telemetry?.frameBudgetMissCount ?? null,
  frameBudgetMissRatio: telemetry?.frameBudgetMissRatio ?? null,
  frameCount: telemetry?.frameCount ?? null,
  frameDtMs: telemetry?.frameDtMs ?? null,
  frameElapsedMs: telemetry?.frameElapsedMs ?? null,
  frameElapsedTotalMs: telemetry?.frameElapsedTotalMs ?? null,
  framePhaseMaxMs: telemetry?.framePhaseMaxMs ?? null,
  framePhaseMs: telemetry?.framePhaseMs ?? null,
  telemetryIntervalMs: telemetry?.telemetry?.intervalMs ?? null,
  telemetryPublishCount: telemetry?.telemetry?.publishCount ?? null,
  telemetrySkipCount: telemetry?.telemetry?.skipCount ?? null,
  frameWorkMaxMs: telemetry?.frameWorkMaxMs ?? null,
  frameWorkMs: telemetry?.frameWorkMs ?? null,
  heldItemKey: telemetry?.race?.heldItemKey ?? null,
  horizonYRatio: telemetry?.camera?.horizonYRatio ?? null,
  itemBoxPickupDelay: telemetry?.player?.itemBoxPickupDelay ?? null,
  kartHeightRatio: telemetry?.player?.kartScreenCoverage?.heightRatio ?? null,
  lap: telemetry?.race?.lap ?? null,
  normalizedSpeed: telemetry?.player?.normalizedSpeed ?? null,
  offroadSlowdown: telemetry?.offroadSlowdown ?? null,
  offroadSpeedLossRatio: telemetry?.player?.offroadSpeedLossRatio ?? null,
  playerProgress: telemetry?.player?.progress ?? null,
  reducedMotion: telemetry?.reducedMotion ?? telemetry?.player?.reducedMotion ?? null,
  renderCalls: telemetry?.renderer?.calls ?? null,
  renderGeometries: telemetry?.renderer?.geometries ?? null,
  renderPrograms: telemetry?.renderer?.programs ?? null,
  renderTextures: telemetry?.renderer?.textures ?? null,
  renderTriangles: telemetry?.renderer?.triangles ?? null,
  roadAheadCoverage: telemetry?.camera?.roadAheadCoverage ?? null,
  routeLookaheadSeconds: telemetry?.camera?.routeLookaheadSeconds ?? null,
  rivalPackAverageDistance: telemetry?.race?.rivalPackAverageDistance ?? null,
  rivalPackNearestDistance: telemetry?.race?.rivalPackNearestDistance ?? null,
  sceneBudget: telemetry?.sceneBudget ?? null,
  reverseSpeedCapRatio: telemetry?.player?.reverseSpeedCapRatio ?? null,
  reverseSpeedRatio: telemetry?.player?.reverseSpeedRatio ?? null,
  reverseTuningRatio: telemetry?.player?.reverseTuningRatio ?? null,
  shield: telemetry?.player?.shield ?? null,
  shieldBurstVisualActive: telemetry?.player?.shieldBurstVisualActive ?? null,
  shieldVisualActive: telemetry?.player?.shieldVisualActive ?? null,
  steeringTurn90Time: telemetry?.player?.steeringTurn90Time ?? null,
  stuckRecoveryCount: telemetry?.player?.stuckRecoveryCount ?? null,
  timeFromTopSpeedTo25: telemetry?.player?.timeFromTopSpeedTo25 ?? null,
  timeToSpeed80: telemetry?.player?.timeToSpeed80 ?? null,
  timeToSpeed98: telemetry?.player?.timeToSpeed98 ?? null,
  visibleRivals: telemetry?.race?.visibleRivals ?? null,
  visibleRivalsSeen: telemetry?.race?.visibleRivalsSeen ?? null,
});

const rounded = (value, digits = 2) => (Number.isFinite(value) ? Number(value.toFixed(digits)) : null);

const numericMetricSummary = (values = []) => {
  const finiteValues = values.filter(Number.isFinite);
  if (!finiteValues.length) {
    return {
      average: null,
      max: null,
      min: null,
      sampleCount: 0,
    };
  }
  return {
    average: rounded(finiteValues.reduce((total, value) => total + value, 0) / finiteValues.length),
    max: rounded(Math.max(...finiteValues)),
    min: rounded(Math.min(...finiteValues)),
    sampleCount: finiteValues.length,
  };
};

const summarizeSustainedTelemetrySamples = (samples = []) => {
  const telemetrySamples = samples.map((sample) => sample.telemetry).filter(Boolean);
  const first = telemetrySamples[0] || {};
  const latest = telemetrySamples[telemetrySamples.length - 1] || {};
  const sampleTimes = samples.map((sample) => sample.at).filter(Number.isFinite);
  const firstTime = sampleTimes[0] ?? null;
  const lastTime = sampleTimes[sampleTimes.length - 1] ?? null;
  const budgetMissStart = Number.isFinite(first.frameBudgetMissCount) ? first.frameBudgetMissCount : null;
  const budgetMissEnd = Number.isFinite(latest.frameBudgetMissCount) ? latest.frameBudgetMissCount : null;
  const frameCountStart = Number.isFinite(first.frameCount) ? first.frameCount : null;
  const frameCountEnd = Number.isFinite(latest.frameCount) ? latest.frameCount : null;
  const frameElapsedTotalStart = Number.isFinite(first.frameElapsedTotalMs) ? first.frameElapsedTotalMs : null;
  const frameElapsedTotalEnd = Number.isFinite(latest.frameElapsedTotalMs) ? latest.frameElapsedTotalMs : null;
  const actualFps = numericMetricSummary(telemetrySamples.map((telemetry) => telemetry.actualFps));
  const deliveredFrameCount =
    Number.isFinite(frameCountStart) && Number.isFinite(frameCountEnd)
      ? Math.max(0, frameCountEnd - frameCountStart)
      : null;
  const deliveredElapsedMs =
    Number.isFinite(frameElapsedTotalStart) && Number.isFinite(frameElapsedTotalEnd)
      ? Math.max(0, frameElapsedTotalEnd - frameElapsedTotalStart)
      : null;
  const deliveredFps =
    Number.isFinite(deliveredFrameCount) && deliveredFrameCount > 0 && Number.isFinite(deliveredElapsedMs) && deliveredElapsedMs > 0
      ? rounded(deliveredFrameCount / (deliveredElapsedMs / 1000))
      : null;
  const budgetMissCount =
    Number.isFinite(budgetMissStart) && Number.isFinite(budgetMissEnd)
      ? Math.max(0, budgetMissEnd - budgetMissStart)
      : null;
  const budgetMissRatio =
    Number.isFinite(budgetMissCount) && Number.isFinite(deliveredFrameCount) && deliveredFrameCount > 0
      ? rounded(budgetMissCount / deliveredFrameCount, 3)
      : null;
  const visibleRivalValues = telemetrySamples
    .map((telemetry) => telemetry.race?.visibleRivals)
    .filter(Number.isFinite);
  const rivalNearestDistances = telemetrySamples
    .map((telemetry) => telemetry.race?.rivalPackNearestDistance)
    .filter(Number.isFinite);
  const rivalAverageDistances = telemetrySamples
    .map((telemetry) => telemetry.race?.rivalPackAverageDistance)
    .filter(Number.isFinite);
  const visibleRivalsActiveSamples = visibleRivalValues.filter((value) => value > 0).length;
  const rivalPackCloseSamples = rivalNearestDistances.filter((value) => value <= 160).length;

  return {
    actualFps,
    budgetMissCount,
    budgetMissRatio,
    captureWindowSeconds: Number.isFinite(firstTime) && Number.isFinite(lastTime) ? rounded(lastTime - firstTime, 3) : null,
    deliveredElapsedMs: Number.isFinite(deliveredElapsedMs) ? rounded(deliveredElapsedMs) : null,
    deliveredFps,
    deliveredFrameCount,
    firstSampleAt: firstTime,
    frameElapsedMs: numericMetricSummary(telemetrySamples.map((telemetry) => telemetry.frameElapsedMs)),
    frameWorkMs: numericMetricSummary(telemetrySamples.map((telemetry) => telemetry.frameWorkMs)),
    latest: summarizeVisualTelemetry(latest),
    latestSampleAt: lastTime,
    metricSampleCount: telemetrySamples.length,
    renderer: latest.renderer ?? null,
    renderPhaseMaxMs: numericMetricSummary(telemetrySamples.map((telemetry) => telemetry.framePhaseMaxMs?.render)),
    renderPhaseMs: numericMetricSummary(telemetrySamples.map((telemetry) => telemetry.framePhaseMs?.render)),
    rivalPackAverageDistance: numericMetricSummary(rivalAverageDistances),
    rivalPackCloseRatio: rivalNearestDistances.length ? rounded(rivalPackCloseSamples / rivalNearestDistances.length, 3) : null,
    rivalPackNearestDistance: numericMetricSummary(rivalNearestDistances),
    sceneBudget: latest.sceneBudget ?? null,
    sampledDeliveredFps: numericMetricSummary(telemetrySamples.map((telemetry) => telemetry.deliveredFps)),
    smoothedActualFps: actualFps,
    visibleRivals: numericMetricSummary(visibleRivalValues),
    visibleRivalsActiveRatio: visibleRivalValues.length ? rounded(visibleRivalsActiveSamples / visibleRivalValues.length, 3) : null,
  };
};

const rectArea = (rect = {}) =>
  Math.max(0, (rect.right || 0) - (rect.left || 0)) * Math.max(0, (rect.bottom || 0) - (rect.top || 0));

const assertHudLayoutEvidence = (layout, { name, scenario }) => {
  if (!layout?.kartRect || rectArea(layout.kartRect) <= 1) {
    fail('Race HUD layout check could not resolve the kart screen rect', { layout, name, scenario });
  }
  const kartOverlaps = (layout.elements || []).filter((entry) => entry.overlapWithKartArea > 1);
  if (kartOverlaps.length) {
    fail('Race HUD element overlapped the kart screen rect', { kartOverlaps, layout, name, scenario });
  }
  const focusOverlaps = (layout.elements || []).filter((entry) => entry.overlapWithRoadFocusArea > 1);
  if (focusOverlaps.length) {
    fail('Race HUD element overlapped the protected road focus rect', { focusOverlaps, layout, name, scenario });
  }
};

const measureHudLayout = async (page, telemetry) =>
  page.evaluate((telemetryArg) => {
    const viewport = {
      height: window.innerHeight,
      width: window.innerWidth,
    };
    const coverage = telemetryArg?.player?.kartScreenCoverage || {};
    const heightRatio = Number.isFinite(coverage.heightRatio) ? coverage.heightRatio : 0;
    const widthRatio = Number.isFinite(coverage.widthRatio) ? coverage.widthRatio : heightRatio * 1.35;
    const centerX = Number.isFinite(coverage.centerXRatio) ? coverage.centerXRatio : 0.5;
    const centerY = Number.isFinite(coverage.centerYRatio)
      ? coverage.centerYRatio
      : Number.isFinite(coverage.bottomYRatio)
      ? coverage.bottomYRatio - heightRatio / 2
      : 0.76;
    const leftX = Number.isFinite(coverage.leftXRatio) ? coverage.leftXRatio : centerX - widthRatio / 2;
    const rightX = Number.isFinite(coverage.rightXRatio) ? coverage.rightXRatio : centerX + widthRatio / 2;
    const topY = centerY - heightRatio / 2;
    const bottomY = Number.isFinite(coverage.bottomYRatio) ? coverage.bottomYRatio : centerY + heightRatio / 2;
    const kartRect = {
      bottom: bottomY * viewport.height,
      left: leftX * viewport.width,
      right: rightX * viewport.width,
      top: topY * viewport.height,
    };
    const roadFocusRect = {
      bottom: viewport.height * 0.78,
      left: viewport.width * 0.18,
      right: viewport.width * 0.82,
      top: viewport.height * 0.24,
    };
    const area = (rect) => Math.max(0, rect.right - rect.left) * Math.max(0, rect.bottom - rect.top);
    const overlap = (first, second) =>
      Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left)) *
      Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
    const selectors = [
      ['liveHud', '[data-testid="race-live-hud"]'],
      ['audioToggle', '[data-testid="race-audio-toggle"]'],
      ['finishSprint', '[data-testid="race-finish-sprint"]'],
      ['itemPanel', '[data-testid="race-item-panel"]'],
      ['controlHint', '[data-testid="race-control-hint"]'],
      ['minimap', '[data-testid="race-minimap"]'],
      ['goButton', '[data-testid="race-go-button"]'],
    ];
    const elements = selectors.flatMap(([key, selector]) => {
      const node = document.querySelector(selector);
      if (!node) return [];
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const visible =
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || 1) !== 0 &&
        rect.width > 0 &&
        rect.height > 0;
      if (!visible) return [];
      const elementRect = {
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        top: rect.top,
      };
      const roadFocusArea = overlap(elementRect, roadFocusRect);
      const kartArea = overlap(elementRect, kartRect);
      return [
        {
          area: Number(area(elementRect).toFixed(2)),
          key,
          overlapWithKartArea: Number(kartArea.toFixed(2)),
          overlapWithRoadFocusArea: Number(roadFocusArea.toFixed(2)),
          rect: Object.fromEntries(Object.entries(elementRect).map(([name, value]) => [name, Number(value.toFixed(2))])),
        },
      ];
    });
    return {
      elements,
      kartRect: Object.fromEntries(Object.entries(kartRect).map(([name, value]) => [name, Number(value.toFixed(2))])),
      maxKartOverlapArea: Math.max(0, ...elements.map((entry) => entry.overlapWithKartArea)),
      maxRoadFocusOverlapArea: Math.max(0, ...elements.map((entry) => entry.overlapWithRoadFocusArea)),
      roadFocusRect: Object.fromEntries(Object.entries(roadFocusRect).map(([name, value]) => [name, Number(value.toFixed(2))])),
      viewport,
    };
  }, telemetry);

const assertVisualTelemetry = (telemetry, { name, scenario, thresholds }) => {
  if (!telemetry) fail('Race visual telemetry was missing', { name });
  const kartHeight = telemetry.player?.kartScreenCoverage?.heightRatio;
  const roadAhead = telemetry.camera?.roadAheadCoverage;
  const clipCount = telemetry.camera?.clipCount;
  const routeLookaheadCurvature = telemetry.camera?.routeLookaheadCurvature;
  const routeLookaheadSeconds = telemetry.camera?.routeLookaheadSeconds;
  const vehicleMode = telemetry.player?.vehicleMode;
  const failures = [];

  if (vehicleMode !== 'kart') failures.push(`expected kart vehicle mode, got ${vehicleMode || 'missing'}`);
  if (!Number.isFinite(kartHeight) || kartHeight < thresholds.kartMin || kartHeight > thresholds.kartMax) {
    failures.push(`kart height ${kartHeight} outside ${thresholds.kartMin}-${thresholds.kartMax}`);
  }
  if (!Number.isFinite(roadAhead) || roadAhead < thresholds.roadAheadMin) {
    failures.push(`road ahead coverage ${roadAhead} below ${thresholds.roadAheadMin}`);
  }
  if (clipCount !== 0) failures.push(`camera clip count ${clipCount} is not zero`);
  if (scenario === 'idle') {
    if ((telemetry.player?.normalizedSpeed || 0) > 0.05) {
      failures.push(`idle scenario speed ${telemetry.player?.normalizedSpeed} above idle range`);
    }
  }
  if (scenario === 'driving' && thresholds.requireVisibleRivals) {
    if ((telemetry.race?.visibleRivalsSeen || 0) < thresholds.requireVisibleRivals) {
      failures.push(
        `normal driving visible rivals seen ${telemetry.race?.visibleRivalsSeen || 0} below ${thresholds.requireVisibleRivals}`
      );
    }
  }
  if (scenario === 'drift') {
    if (!telemetry.player?.driftActive) failures.push('drift scenario did not report active drift');
    if ((telemetry.player?.driftTier || 0) < 1) failures.push(`drift tier ${telemetry.player?.driftTier || 0} below 1`);
    if (!telemetry.player?.driftTrailVisualActive) failures.push('drift scenario did not report active drift trail visual');
  }
  if (scenario === 'drift-tier-1') {
    if (!telemetry.player?.driftActive) failures.push('drift tier 1 scenario did not report active drift');
    if (telemetry.player?.driftTier !== 1) failures.push(`drift tier 1 scenario reported tier ${telemetry.player?.driftTier || 0}`);
    if ((telemetry.player?.driftTierSeen || 0) < 1) failures.push(`drift tier seen ${telemetry.player?.driftTierSeen || 0} below 1`);
  }
  if (scenario === 'drift-mechanics') {
    if ((telemetry.player?.driftHopStartCount || 0) < 1) {
      failures.push(`drift mechanics hop start count ${telemetry.player?.driftHopStartCount || 0} below 1`);
    }
    if (!Number.isFinite(telemetry.player?.driftHopStartTime) || telemetry.player.driftHopStartTime > 0.2) {
      failures.push(`drift mechanics hop start time ${telemetry.player?.driftHopStartTime} above 0.2 seconds`);
    }
    if (
      !Number.isFinite(telemetry.player?.driftHopDuration) ||
      telemetry.player.driftHopDuration < 0.18 ||
      telemetry.player.driftHopDuration > 0.3
    ) {
      failures.push(`drift mechanics hop duration ${telemetry.player?.driftHopDuration} outside 0.18-0.30 seconds`);
    }
    if ((telemetry.player?.driftStartCount || 0) < 1) {
      failures.push(`drift mechanics drift start count ${telemetry.player?.driftStartCount || 0} below 1`);
    }
    if ((telemetry.player?.driftTierSeen || 0) < 2) {
      failures.push(`drift mechanics max drift tier ${telemetry.player?.driftTierSeen || 0} below 2`);
    }
    if (!telemetry.player?.boostActive || telemetry.player?.boostSource !== 'drift') {
      failures.push(`drift mechanics boost source ${telemetry.player?.boostSource || 'missing'} was not active drift boost`);
    }
  }
  if (scenario === 'boost') {
    if (!telemetry.player?.boostActive) failures.push('boost scenario did not report active boost');
    if (!telemetry.player?.boostSource) failures.push('boost scenario did not report boost source');
  }
  if (scenario === 'boost-pad-mechanics') {
    if (!telemetry.player?.boostActive || telemetry.player?.boostSource !== 'pad') {
      failures.push(`boost pad mechanics source ${telemetry.player?.boostSource || 'missing'} was not active pad boost`);
    }
    if (!telemetry.player?.boostPadVisualActive) failures.push('boost pad mechanics did not report active boost pad visual');
    if (!telemetry.player?.boostBurstVisualActive) failures.push('boost pad mechanics did not report active boost burst visual');
    if (!Number.isFinite(telemetry.player?.boostPadActivationDelay) || telemetry.player.boostPadActivationDelay > 0.35) {
      failures.push(`boost pad activation delay ${telemetry.player?.boostPadActivationDelay} above 0.35 seconds`);
    }
    if (!Number.isFinite(telemetry.player?.boostPadSpeedBefore) || !Number.isFinite(telemetry.player?.boostPadSpeedAfter)) {
      failures.push('boost pad speed before/after telemetry was missing');
    } else if (telemetry.player.boostPadSpeedAfter - telemetry.player.boostPadSpeedBefore < 0.18) {
      failures.push(
        `boost pad speed delta ${telemetry.player.boostPadSpeedAfter - telemetry.player.boostPadSpeedBefore} below 0.18`
      );
    }
    if ((telemetry.player?.normalizedSpeed || 0) < 0.75) {
      failures.push(`boost pad capture speed ${telemetry.player?.normalizedSpeed || 0} below 0.75`);
    }
    if ((telemetry.camera?.fov || 0) < 62) {
      failures.push(`boost pad FOV ${telemetry.camera?.fov || 0} below boosted FOV threshold`);
    }
  }
  if (scenario === 'drift-release') {
    if (!telemetry.player?.boostActive) failures.push('drift-release scenario did not report active boost');
    if (telemetry.player?.boostSource !== 'drift') {
      failures.push(`drift-release boost source ${telemetry.player?.boostSource || 'missing'} was not drift`);
    }
  }
  if (scenario === 'item-pickup') {
    if (!telemetry.race?.heldItemKey) failures.push('item scenario did not report a held item');
    if ((telemetry.player?.shield || 0) <= 0) failures.push('item scenario did not report active shield use');
    if (!telemetry.player?.shieldVisualActive) failures.push('item scenario did not report active shield visual');
    if (!telemetry.player?.shieldBurstVisualActive) failures.push('item scenario did not report active shield burst visual');
  }
  if (scenario === 'item-box-mechanics') {
    if (!telemetry.race?.heldItemKey) failures.push('item box mechanics did not report a held item');
    if (!telemetry.player?.itemBoxPickupKey) failures.push('item box mechanics pickup key was missing');
    if (telemetry.player?.itemBoxPickupKey && telemetry.player.itemBoxPickupKey !== telemetry.race?.heldItemKey) {
      failures.push(
        `item box pickup key ${telemetry.player.itemBoxPickupKey} did not match held item ${telemetry.race?.heldItemKey}`
      );
    }
    if (!Number.isFinite(telemetry.player?.itemBoxPickupDelay) || telemetry.player.itemBoxPickupDelay > 0.4) {
      failures.push(`item box pickup delay ${telemetry.player?.itemBoxPickupDelay} above 0.4 seconds`);
    }
    if ((telemetry.player?.normalizedSpeed || 0) < 0.35) {
      failures.push(`item box pickup capture speed ${telemetry.player?.normalizedSpeed || 0} below 0.35`);
    }
  }
  if (scenario === 'opening-sequence') {
    if (!Number.isFinite(telemetry.player?.progress) || telemetry.player.progress < 0.235) {
      failures.push(`opening sequence progress ${telemetry.player?.progress} below early route cue`);
    }
    if (!telemetry.camera?.routeLookaheadUsed) failures.push('opening sequence did not use route camera lookahead');
    if (!Number.isFinite(routeLookaheadSeconds) || routeLookaheadSeconds < 1 || routeLookaheadSeconds > 1.5) {
      failures.push(`opening sequence lookahead seconds ${routeLookaheadSeconds} outside 1.0-1.5`);
    }
    if ((telemetry.race?.visibleRivalsSeen || 0) < 3) {
      failures.push(`opening sequence visible rivals seen ${telemetry.race?.visibleRivalsSeen || 0} below 3`);
    }
  }
  if (scenario === 'rival-cluster') {
    if ((telemetry.race?.visibleRivals || 0) < 3) {
      failures.push(`rival cluster visible rivals ${telemetry.race?.visibleRivals || 0} below 3`);
    }
    if (!Number.isFinite(telemetry.race?.rivalPackNearestDistance) || telemetry.race.rivalPackNearestDistance > 30) {
      failures.push(`rival cluster nearest distance ${telemetry.race?.rivalPackNearestDistance} above 30`);
    }
    if (!Number.isFinite(telemetry.race?.rivalPackAverageDistance) || telemetry.race.rivalPackAverageDistance > 45) {
      failures.push(`rival cluster average distance ${telemetry.race?.rivalPackAverageDistance} above 45`);
    }
  }
  if (scenario === 'finish-line' && (telemetry.race?.lap || 0) < 3) {
    failures.push(`finish scenario lap ${telemetry.race?.lap || 0} below final lap`);
  }
  if (scenario === 'stuck-recovery' && (telemetry.player?.stuckRecoveryCount || 0) < 1) {
    failures.push(`stuck recovery count ${telemetry.player?.stuckRecoveryCount || 0} below 1`);
  }
  if (scenario === 'stuck-recovery' && (telemetry.player?.normalizedSpeed || 0) < 0.35) {
    failures.push(`stuck recovery speed ${telemetry.player?.normalizedSpeed || 0} below recovered motion threshold`);
  }
  if (scenario === 'acceleration') {
    const timeToSpeed80 = telemetry.player?.timeToSpeed80;
    const timeToSpeed98 = telemetry.player?.timeToSpeed98;
    if (!Number.isFinite(timeToSpeed80) || timeToSpeed80 < 1.2 || timeToSpeed80 > 1.8) {
      failures.push(`time to 80% speed ${timeToSpeed80} outside 1.2-1.8 seconds`);
    }
    if (!Number.isFinite(timeToSpeed98) || timeToSpeed98 < 2.2 || timeToSpeed98 > 3) {
      failures.push(`time to 98% speed ${timeToSpeed98} outside 2.2-3.0 seconds`);
    }
    if (telemetry.player?.boostActive || telemetry.player?.boostSource) {
      failures.push(`acceleration scenario reported boost source ${telemetry.player?.boostSource || 'active'}`);
    }
    if ((telemetry.player?.normalizedSpeed || 0) < 0.98) {
      failures.push(`acceleration capture speed ${telemetry.player?.normalizedSpeed || 0} below 0.98`);
    }
  }
  if (scenario === 'braking') {
    const timeFromTopSpeedTo25 = telemetry.player?.timeFromTopSpeedTo25;
    if (!Number.isFinite(timeFromTopSpeedTo25) || timeFromTopSpeedTo25 < 0.8 || timeFromTopSpeedTo25 > 1.3) {
      failures.push(`braking time to 25% speed ${timeFromTopSpeedTo25} outside 0.8-1.3 seconds`);
    }
    if ((telemetry.player?.normalizedSpeed || 0) < 0.08) {
      failures.push(`braking scenario speed ${telemetry.player?.normalizedSpeed || 0} below stopped capture threshold`);
    }
    if ((telemetry.player?.normalizedSpeed || 0) > 0.32) {
      failures.push(`braking scenario speed ${telemetry.player?.normalizedSpeed || 0} above stopped capture threshold`);
    }
  }
  if (scenario === 'reverse') {
    const reverseSpeedRatio = telemetry.player?.reverseSpeedRatio;
    const reverseCapRatio = telemetry.player?.reverseSpeedCapRatio;
    if (!Number.isFinite(reverseSpeedRatio) || reverseSpeedRatio < 0.2 || reverseSpeedRatio > 0.28) {
      failures.push(`reverse speed ratio ${reverseSpeedRatio} outside 0.20-0.28`);
    }
    if (!Number.isFinite(reverseCapRatio) || Math.abs(reverseSpeedRatio - reverseCapRatio) > 0.03) {
      failures.push(`reverse speed ratio ${reverseSpeedRatio} did not match cap ${reverseCapRatio}`);
    }
    if ((telemetry.player?.normalizedSpeed || 0) >= 0.35) {
      failures.push(`reverse normalized speed ${telemetry.player?.normalizedSpeed || 0} was not slower than forward speed`);
    }
  }
  if (scenario === 'collision-mechanics') {
    if ((telemetry.player?.collisionCount || 0) < 1) {
      failures.push(`collision mechanics count ${telemetry.player?.collisionCount || 0} below 1`);
    }
    if (
      !Number.isFinite(telemetry.player?.collisionSpeedLossRatio) ||
      telemetry.player.collisionSpeedLossRatio < 0.25 ||
      telemetry.player.collisionSpeedLossRatio > 0.5
    ) {
      failures.push(`collision speed loss ratio ${telemetry.player?.collisionSpeedLossRatio} outside 0.25-0.50`);
    }
    if ((telemetry.player?.normalizedSpeed || 0) < 0.25) {
      failures.push(`collision recovery speed ${telemetry.player?.normalizedSpeed || 0} below 0.25`);
    }
  }
  if (scenario === 'offroad-slowdown') {
    if (telemetry.activeSurface !== 'offroad') {
      failures.push(`offroad slowdown active surface ${telemetry.activeSurface || 'missing'} was not offroad`);
    }
    if (!telemetry.offroadSlowdownSeen || !(telemetry.offroadSlowdown < 1)) {
      failures.push(`offroad slowdown ${telemetry.offroadSlowdown} was not recorded`);
    }
    if (
      !Number.isFinite(telemetry.player?.offroadSpeedLossRatio) ||
      telemetry.player.offroadSpeedLossRatio < 0.25 ||
      telemetry.player.offroadSpeedLossRatio > 0.45
    ) {
      failures.push(`offroad speed loss ratio ${telemetry.player?.offroadSpeedLossRatio} outside 0.25-0.45`);
    }
    if ((telemetry.player?.normalizedSpeed || 0) < 0.45 || (telemetry.player?.normalizedSpeed || 0) > 0.65) {
      failures.push(`offroad capture speed ${telemetry.player?.normalizedSpeed || 0} outside 0.45-0.65`);
    }
  }
  if (scenario === 'steering-low-speed') {
    const steeringTurn90Time = telemetry.player?.steeringTurn90Time;
    if (!Number.isFinite(steeringTurn90Time) || steeringTurn90Time < 0.65 || steeringTurn90Time > 0.95) {
      failures.push(`low-speed 90 degree steering time ${steeringTurn90Time} outside 0.65-0.95 seconds`);
    }
    if ((telemetry.player?.normalizedSpeed || 0) < 0.25 || (telemetry.player?.normalizedSpeed || 0) > 0.36) {
      failures.push(`low-speed steering speed ${telemetry.player?.normalizedSpeed || 0} outside 0.25-0.36`);
    }
  }
  if (scenario === 'steering-high-speed') {
    const steeringTurn90Time = telemetry.player?.steeringTurn90Time;
    if (!Number.isFinite(steeringTurn90Time) || steeringTurn90Time < 0.55 || steeringTurn90Time > 1.45) {
      failures.push(`high-speed 90 degree steering time ${steeringTurn90Time} outside 0.55-1.45 seconds`);
    }
    if ((telemetry.player?.normalizedSpeed || 0) < 0.72 || (telemetry.player?.normalizedSpeed || 0) > 0.88) {
      failures.push(`high-speed steering speed ${telemetry.player?.normalizedSpeed || 0} outside 0.72-0.88`);
    }
  }
  if (scenario === 'driving') {
    if (!telemetry.camera?.routeLookaheadUsed) failures.push('driving scenario did not use route camera lookahead');
    if (!Number.isFinite(routeLookaheadSeconds) || routeLookaheadSeconds < 1 || routeLookaheadSeconds > 1.5) {
      failures.push(`route lookahead seconds ${routeLookaheadSeconds} outside 1.0-1.5`);
    }
  }
  if (scenario === 'turn-approach') {
    if (!telemetry.camera?.routeLookaheadUsed) failures.push('turn approach did not use route camera lookahead');
    if (!Number.isFinite(routeLookaheadSeconds) || routeLookaheadSeconds < 1 || routeLookaheadSeconds > 1.5) {
      failures.push(`turn approach lookahead seconds ${routeLookaheadSeconds} outside 1.0-1.5`);
    }
    if (!Number.isFinite(routeLookaheadCurvature) || Math.abs(routeLookaheadCurvature) < 0.5) {
      failures.push(`turn approach curvature ${routeLookaheadCurvature} below 0.5 radians`);
    }
    if (!telemetry.player?.driftActive) failures.push('turn approach did not report active drift');
    if ((telemetry.player?.driftTier || 0) < 1) {
      failures.push(`turn approach drift tier ${telemetry.player?.driftTier || 0} below 1`);
    }
    if (!telemetry.player?.driftTrailVisualActive) failures.push('turn approach did not report active drift trail visual');
    if ((telemetry.race?.visibleRivals || 0) < 2) {
      failures.push(`turn approach visible rivals ${telemetry.race?.visibleRivals || 0} below 2`);
    }
    if (!Number.isFinite(telemetry.race?.rivalPackNearestDistance) || telemetry.race.rivalPackNearestDistance > 60) {
      failures.push(`turn approach nearest rival distance ${telemetry.race?.rivalPackNearestDistance} above 60`);
    }
  }

  if (failures.length) fail('Race visual telemetry thresholds failed', { failures, name, telemetry });
};

const runVisualSnapshot = async (browser, { git, name, scenario = 'driving', thresholds, viewport }) => {
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });

  const url = `${baseUrl}/race-playtest.html?raceAutoplay=1&raceTrack=comeback-city&raceMode=visual-kart&raceVisualScenario=${scenario}&raceIndex=${name}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(
    ({ scenario, thresholds }) => {
      const telemetry = window.__raceVisualTelemetry;
      const samples = window.__raceVisualTelemetrySamples || [];
      const latestSample = samples[samples.length - 1];
      return (
        latestSample?.at >= (scenario === 'braking' ? 0.9 : 1.2) &&
        telemetry?.trackKey === 'comeback-city' &&
        telemetry?.player?.vehicleMode === 'kart' &&
        (scenario === 'idle' ||
          scenario === 'acceleration' ||
          scenario === 'braking' ||
          scenario === 'collision-mechanics' ||
          scenario === 'item-box-mechanics' ||
          scenario === 'offroad-slowdown' ||
          scenario === 'reverse' ||
          scenario === 'steering-low-speed' ||
          scenario === 'stuck-recovery' ||
          telemetry?.player?.normalizedSpeed >= 0.55) &&
        Number.isFinite(telemetry?.camera?.roadAheadCoverage) &&
        (!thresholds.requireVisibleRivals ||
          (telemetry?.race?.visibleRivalsSeen || 0) >= thresholds.requireVisibleRivals) &&
        (scenario !== 'drift' ||
          (telemetry?.player?.driftActive &&
            (telemetry?.player?.driftTier || 0) >= 1 &&
            telemetry?.player?.driftTrailVisualActive)) &&
        (scenario !== 'drift-tier-1' ||
          (telemetry?.player?.driftActive &&
            telemetry?.player?.driftTier === 1 &&
            (telemetry?.player?.driftTierSeen || 0) >= 1)) &&
        (scenario !== 'drift-mechanics' ||
          ((telemetry?.player?.driftHopStartCount || 0) >= 1 &&
            telemetry?.player?.driftHopStartTime <= 0.2 &&
            telemetry?.player?.driftHopDuration >= 0.18 &&
            telemetry?.player?.driftHopDuration <= 0.3 &&
            (telemetry?.player?.driftStartCount || 0) >= 1 &&
            (telemetry?.player?.driftTierSeen || 0) >= 2 &&
            telemetry?.player?.boostActive &&
            telemetry?.player?.boostSource === 'drift')) &&
        (scenario !== 'boost' || telemetry?.player?.boostActive) &&
        (scenario !== 'boost-pad-mechanics' ||
          (telemetry?.player?.boostActive &&
            telemetry?.player?.boostSource === 'pad' &&
            telemetry?.player?.boostPadVisualActive &&
            telemetry?.player?.boostBurstVisualActive &&
            telemetry?.player?.boostPadActivationDelay <= 0.35 &&
            telemetry?.player?.boostPadSpeedAfter - telemetry?.player?.boostPadSpeedBefore >= 0.18 &&
            (telemetry?.player?.normalizedSpeed || 0) >= 0.75 &&
            (telemetry?.camera?.fov || 0) >= 62)) &&
        (scenario !== 'drift-release' ||
          (telemetry?.player?.boostActive && telemetry?.player?.boostSource === 'drift')) &&
        (scenario !== 'item-pickup' ||
          (Boolean(telemetry?.race?.heldItemKey) &&
            (telemetry?.player?.shield || 0) > 0 &&
            telemetry?.player?.shieldVisualActive &&
            telemetry?.player?.shieldBurstVisualActive)) &&
        (scenario !== 'item-box-mechanics' ||
          (Boolean(telemetry?.race?.heldItemKey) &&
            Boolean(telemetry?.player?.itemBoxPickupKey) &&
            telemetry?.player?.itemBoxPickupKey === telemetry?.race?.heldItemKey &&
            telemetry?.player?.itemBoxPickupDelay <= 0.4 &&
            (telemetry?.player?.normalizedSpeed || 0) >= 0.35)) &&
        (scenario !== 'opening-sequence' ||
          ((telemetry?.player?.progress || 0) >= 0.235 &&
            telemetry?.camera?.routeLookaheadUsed &&
            telemetry?.camera?.routeLookaheadSeconds >= 1 &&
            telemetry?.camera?.routeLookaheadSeconds <= 1.5 &&
            (telemetry?.race?.visibleRivalsSeen || 0) >= 3)) &&
        (scenario !== 'rival-cluster' ||
          ((telemetry?.race?.visibleRivals || 0) >= 3 &&
            Number.isFinite(telemetry?.race?.rivalPackNearestDistance) &&
            telemetry.race.rivalPackNearestDistance <= 30 &&
            Number.isFinite(telemetry?.race?.rivalPackAverageDistance) &&
            telemetry.race.rivalPackAverageDistance <= 45)) &&
        (scenario !== 'finish-line' || (telemetry?.race?.lap || 0) >= 3) &&
        (scenario !== 'stuck-recovery' ||
          ((telemetry?.player?.stuckRecoveryCount || 0) >= 1 &&
            (telemetry?.player?.normalizedSpeed || 0) >= 0.35)) &&
        (scenario !== 'acceleration' ||
          (telemetry?.player?.timeToSpeed80 >= 1.2 &&
            telemetry?.player?.timeToSpeed80 <= 1.8 &&
            telemetry?.player?.timeToSpeed98 >= 2.2 &&
            telemetry?.player?.timeToSpeed98 <= 3 &&
            !telemetry?.player?.boostActive &&
            !telemetry?.player?.boostSource &&
            (telemetry?.player?.normalizedSpeed || 0) >= 0.98)) &&
        (scenario !== 'braking' ||
          (telemetry?.player?.timeFromTopSpeedTo25 >= 0.8 &&
            telemetry?.player?.timeFromTopSpeedTo25 <= 1.3 &&
            (telemetry?.player?.normalizedSpeed || 0) >= 0.08 &&
            (telemetry?.player?.normalizedSpeed || 0) <= 0.32)) &&
        (scenario !== 'reverse' ||
          (telemetry?.player?.reverseSpeedRatio >= 0.2 &&
            telemetry?.player?.reverseSpeedRatio <= 0.28 &&
            Math.abs(telemetry?.player?.reverseSpeedRatio - telemetry?.player?.reverseSpeedCapRatio) <= 0.03 &&
            (telemetry?.player?.normalizedSpeed || 0) < 0.35)) &&
        (scenario !== 'collision-mechanics' ||
          ((telemetry?.player?.collisionCount || 0) >= 1 &&
            telemetry?.player?.collisionSpeedLossRatio >= 0.25 &&
            telemetry?.player?.collisionSpeedLossRatio <= 0.5 &&
            (telemetry?.player?.normalizedSpeed || 0) >= 0.25)) &&
        (scenario !== 'offroad-slowdown' ||
          (telemetry?.activeSurface === 'offroad' &&
            telemetry?.offroadSlowdownSeen &&
            telemetry?.offroadSlowdown < 1 &&
            telemetry?.player?.offroadSpeedLossRatio >= 0.25 &&
            telemetry?.player?.offroadSpeedLossRatio <= 0.45 &&
            (telemetry?.player?.normalizedSpeed || 0) >= 0.45 &&
            (telemetry?.player?.normalizedSpeed || 0) <= 0.65)) &&
        (scenario !== 'steering-low-speed' ||
          (telemetry?.player?.steeringTurn90Time >= 0.65 &&
            telemetry?.player?.steeringTurn90Time <= 0.95 &&
            (telemetry?.player?.normalizedSpeed || 0) >= 0.25 &&
            (telemetry?.player?.normalizedSpeed || 0) <= 0.36)) &&
        (scenario !== 'steering-high-speed' ||
          (telemetry?.player?.steeringTurn90Time >= 0.55 &&
            telemetry?.player?.steeringTurn90Time <= 1.45 &&
            (telemetry?.player?.normalizedSpeed || 0) >= 0.72 &&
            (telemetry?.player?.normalizedSpeed || 0) <= 0.88)) &&
        (scenario !== 'turn-approach' ||
          (Math.abs(telemetry?.camera?.routeLookaheadCurvature || 0) >= 0.5 &&
            telemetry?.player?.driftActive &&
            (telemetry?.player?.driftTier || 0) >= 1 &&
            telemetry?.player?.driftTrailVisualActive &&
            (telemetry?.race?.visibleRivals || 0) >= 2 &&
            Number.isFinite(telemetry?.race?.rivalPackNearestDistance) &&
            telemetry.race.rivalPackNearestDistance <= 60))
      );
    },
    { scenario, thresholds },
    { timeout: visualSnapshotReadyTimeoutMs }
  );

  const artifactBase = `visual-${name}`;
  const screenshotPath = path.join(screenshotsDir, `${artifactBase}.png`);
  const screenshotVisualStats = await captureScreenshotWithVisualCheck({
    attempts: 2,
    detail: { name, scenario },
    page,
    screenshotPath,
  });
  const telemetry = await page.evaluate(() => window.__raceVisualTelemetry || null);
  const hudLayout = await measureHudLayout(page, telemetry);
  const samples = await page.evaluate(() => (window.__raceVisualTelemetrySamples || []).slice(-40));
  const telemetryPath = path.join(screenshotsDir, `${artifactBase}.telemetry.json`);
  await writeFile(
    telemetryPath,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        git,
        hudLayout,
        routeUrl: url,
        scenario,
        samples,
        screenshotPath,
        screenshotVisualStats,
        telemetry,
        thresholds,
        viewport,
      },
      null,
      2
    )
  );

  if (pageErrors.length) fail('Browser console errors during race visual snapshot', { errors: pageErrors, name });
  assertVisualTelemetry(telemetry, { name, scenario, thresholds });
  assertHudLayoutEvidence(hudLayout, { name, scenario });
  await page.close();
  return {
    hudLayout: {
      maxKartOverlapArea: hudLayout.maxKartOverlapArea,
      maxRoadFocusOverlapArea: hudLayout.maxRoadFocusOverlapArea,
      visibleElementCount: hudLayout.elements.length,
    },
    name,
    routeUrl: url,
    scenario,
    screenshotPath,
    screenshotVisualStats,
    summary: summarizeVisualTelemetry(telemetry),
    telemetryPath,
    thresholds,
    viewport,
  };
};

const runSustainedNormalPlayCapture = async (browser, { git }) => {
  const viewport = { height: 900, width: 1440 };
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });

  const captureDurationMs = Number(process.env.RACE_SUSTAINED_CAPTURE_MS || 9000);
  const url = `${baseUrl}/race-playtest.html?raceAutoplay=1&raceTrack=comeback-city&raceMode=free-switch&raceIndex=901&raceNoFinish=1`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(
    () => {
      const telemetry = window.__raceVisualTelemetry;
      const latestSample = (window.__raceVisualTelemetrySamples || []).at(-1);
      return (
        telemetry?.trackKey === 'comeback-city' &&
        latestSample?.at >= 2 &&
        Number.isFinite(telemetry?.actualFps) &&
        Number.isFinite(telemetry?.frameElapsedMs) &&
        Number.isFinite(telemetry?.frameWorkMs) &&
        Number.isFinite(telemetry?.framePhaseMs?.render) &&
        telemetry?.sceneBudget?.scene?.objects > 0
      );
    },
    null,
    { timeout: visualSnapshotReadyTimeoutMs }
  );

  const captureStartedAt = await page.evaluate(() => (window.__raceVisualTelemetrySamples || []).at(-1)?.at ?? 0);
  await page.waitForTimeout(captureDurationMs);
  const samples = await page.evaluate(
    (startAt) => (window.__raceVisualTelemetrySamples || []).filter((sample) => sample.at >= startAt),
    captureStartedAt
  );
  const telemetry = await page.evaluate(() => window.__raceVisualTelemetry || null);
  const summary = summarizeSustainedTelemetrySamples(samples);

  if (!samples.length || summary.metricSampleCount < 8) {
    fail('Sustained normal-play capture did not collect enough telemetry samples', {
      sampleCount: samples.length,
      summary,
    });
  }
  if (!summary.sceneBudget?.scene?.objects || !summary.sceneBudget?.categories?.track?.meshes) {
    fail('Sustained normal-play capture did not include scene budget telemetry', { summary });
  }
  if (
    !Number.isFinite(summary.visibleRivalsActiveRatio) ||
    summary.visibleRivalsActiveRatio < 0.55 ||
    !Number.isFinite(summary.rivalPackCloseRatio) ||
    summary.rivalPackCloseRatio < 0.55 ||
    !Number.isFinite(summary.rivalPackNearestDistance?.average) ||
    summary.rivalPackNearestDistance.average > 180
  ) {
    fail('Sustained normal-play capture did not keep enough rival race pressure in view', {
      summary: {
        rivalPackCloseRatio: summary.rivalPackCloseRatio,
        rivalPackNearestDistance: summary.rivalPackNearestDistance,
        visibleRivals: summary.visibleRivals,
        visibleRivalsActiveRatio: summary.visibleRivalsActiveRatio,
      },
    });
  }

  const significantErrors = pageErrors.filter(
    (message) => !message.includes('Failed to load resource: the server responded with a status of 404')
  );
  if (significantErrors.length) {
    fail('Browser console errors during sustained normal-play capture', {
      errors: significantErrors,
      ignoredErrors: pageErrors.filter((message) => !significantErrors.includes(message)),
    });
  }

  const artifactBase = 'sustained-normal-play-comeback-city';
  const screenshotPath = path.join(screenshotsDir, `${artifactBase}.png`);
  const screenshotVisualStats = await captureScreenshotWithVisualCheck({
    attempts: 2,
    detail: { scenario: 'sustained-normal-play' },
    page,
    screenshotPath,
  });
  const telemetryPath = path.join(screenshotsDir, `${artifactBase}.telemetry.json`);
  await writeFile(
    telemetryPath,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        captureDurationMs,
        captureStartedAt,
        git,
        ignoredConsoleErrors: pageErrors.filter((message) => !significantErrors.includes(message)),
        routeUrl: url,
        samples,
        scenario: 'sustained-normal-play',
        screenshotPath,
        screenshotVisualStats,
        summary,
        telemetry,
        viewport,
      },
      null,
      2
    )
  );

  await page.close();
  return {
    captureDurationMs,
    name: 'comeback-city-sustained-normal-play',
    routeUrl: url,
    scenario: 'sustained-normal-play',
    screenshotPath,
    screenshotVisualStats,
    summary,
    telemetryPath,
    viewport,
  };
};

const summarizeNoMinimapLapSamples = ({ events = [], samples = [] } = {}) => {
  const telemetrySamples = samples.map((sample) => sample.telemetry).filter(Boolean);
  const lapEvents = events.filter((event) => event.type === 'lap');
  const numericValues = (mapper) => telemetrySamples.map(mapper).filter(Number.isFinite);
  const roadAheadValues = numericValues((telemetry) => telemetry.camera?.roadAheadCoverage);
  const clipValues = numericValues((telemetry) => telemetry.camera?.clipCount);
  const rivalValues = numericValues((telemetry) => telemetry.race?.visibleRivalsSeen);
  const routeLookaheadValues = numericValues((telemetry) => telemetry.camera?.routeLookaheadSeconds);

  return {
    cameraClipMax: clipValues.length ? Math.max(...clipValues) : null,
    lapEvents: lapEvents.length,
    latest: summarizeVisualTelemetry(telemetrySamples.at(-1)),
    metricSampleCount: telemetrySamples.length,
    roadAheadCoverageMin: roadAheadValues.length ? rounded(Math.min(...roadAheadValues), 3) : null,
    routeLookaheadSeconds: numericMetricSummary(routeLookaheadValues),
    routeLookaheadUsedSamples: telemetrySamples.filter((telemetry) => telemetry.camera?.routeLookaheadUsed).length,
    visibleRivalsSeenMax: rivalValues.length ? Math.max(...rivalValues) : null,
  };
};

const summarizeCoreKartLoopEvidence = ({ noMinimapLapReadability = null, races = [], visualChecks = [] } = {}) => {
  const byScenario = new Map(visualChecks.map((check) => [check.scenario, check.summary || {}]));
  const byName = new Map(visualChecks.map((check) => [check.name, check.summary || {}]));
  const scenario = (key) => byScenario.get(key) || {};
  const named = (key) => byName.get(key) || {};
  const raceTelemetry = races.flatMap((race) => (race.playtestSummary ? [race.playtestSummary] : []));
  const itemRace = raceTelemetry.find(
    (telemetry) =>
      telemetry.signatureUsed &&
      (telemetry.itemUses || 0) >= 1 &&
      (telemetry.itemBoxesCollected || 0) >= 1
  );
  const finishedRaces = races.filter((race) => race.trackKey === 'comeback-city' && Number.isFinite(race.time) && race.time > 0);
  const evidence = {
    acceleration: {
      normalizedSpeed: scenario('acceleration').normalizedSpeed ?? null,
      timeToSpeed80: scenario('acceleration').timeToSpeed80 ?? null,
      passed:
        (scenario('acceleration').normalizedSpeed || 0) >= 0.8 &&
        Number.isFinite(scenario('acceleration').timeToSpeed80),
    },
    braking: {
      normalizedSpeed: scenario('braking').normalizedSpeed ?? null,
      timeFromTopSpeedTo25: scenario('braking').timeFromTopSpeedTo25 ?? null,
      passed:
        (scenario('braking').normalizedSpeed || 1) <= 0.25 &&
        Number.isFinite(scenario('braking').timeFromTopSpeedTo25),
    },
    boostPads: {
      boostActive: scenario('boost-pad-mechanics').boostActive ?? null,
      boostPadVisualActive: scenario('boost-pad-mechanics').boostPadVisualActive ?? null,
      boostBurstVisualActive: scenario('boost-pad-mechanics').boostBurstVisualActive ?? null,
      boostSource: scenario('boost-pad-mechanics').boostSource ?? null,
      passed:
        scenario('boost-pad-mechanics').boostActive &&
        scenario('boost-pad-mechanics').boostSource === 'pad' &&
        scenario('boost-pad-mechanics').boostPadVisualActive &&
        scenario('boost-pad-mechanics').boostBurstVisualActive,
    },
    camera: {
      noMinimapCameraClipMax: noMinimapLapReadability?.summary?.cameraClipMax ?? null,
      noMinimapRoadAheadCoverageMin: noMinimapLapReadability?.summary?.roadAheadCoverageMin ?? null,
      noMinimapRouteLookaheadUsedSamples: noMinimapLapReadability?.summary?.routeLookaheadUsedSamples ?? null,
      passed:
        noMinimapLapReadability?.summary?.cameraClipMax === 0 &&
        (noMinimapLapReadability?.summary?.roadAheadCoverageMin || 0) >= visualThresholds.desktop.roadAheadMin &&
        (noMinimapLapReadability?.summary?.routeLookaheadUsedSamples || 0) >= 1,
    },
    driftMiniTurbo: {
      driftBoostActive: scenario('drift-mechanics').boostActive ?? null,
      driftBoostSource: scenario('drift-mechanics').boostSource ?? null,
      driftTierSeen: Math.max(scenario('drift').driftTierSeen || 0, scenario('drift-mechanics').driftTierSeen || 0),
      releaseBoostSource: scenario('drift-release').boostSource ?? null,
      passed:
        (scenario('drift').driftTierSeen || 0) >= 1 &&
        scenario('drift-mechanics').boostActive &&
        scenario('drift-mechanics').boostSource === 'drift' &&
        scenario('drift-release').boostSource === 'drift',
    },
    hopDrift: {
      driftActive: scenario('drift').driftActive ?? null,
      driftTier: scenario('drift').driftTier ?? null,
      passed: scenario('drift').driftActive && (scenario('drift').driftTier || 0) >= 1,
    },
    itemBoxesAndSimpleItems: {
      heldItemKey: scenario('item-box-mechanics').heldItemKey ?? named('comeback-city-desktop-item-pickup').heldItemKey ?? null,
      itemBoxPickupDelay: scenario('item-box-mechanics').itemBoxPickupDelay ?? null,
      itemBoxesCollected: itemRace?.itemBoxesCollected ?? null,
      itemUses: itemRace?.itemUses ?? null,
      shieldBurstVisualActive: named('comeback-city-desktop-item-pickup').shieldBurstVisualActive ?? null,
      signatureUsed: itemRace?.signatureUsed ?? null,
      passed:
        Boolean(scenario('item-box-mechanics').heldItemKey || named('comeback-city-desktop-item-pickup').heldItemKey) &&
        Number.isFinite(scenario('item-box-mechanics').itemBoxPickupDelay) &&
        scenario('item-box-mechanics').itemBoxPickupDelay <= 0.4 &&
        named('comeback-city-desktop-item-pickup').shieldBurstVisualActive &&
        Boolean(itemRace),
    },
    lapAndFinishFlow: {
      finishedRaceCount: finishedRaces.length,
      finishLineLap: scenario('finish-line').lap ?? null,
      noMinimapLapEvents: noMinimapLapReadability?.summary?.lapEvents ?? null,
      passed:
        finishedRaces.length >= 1 &&
        (scenario('finish-line').lap || 0) >= 3 &&
        (noMinimapLapReadability?.summary?.lapEvents || 0) >= 1,
    },
    rivals: {
      rivalPackAverageDistance: scenario('rival-cluster').rivalPackAverageDistance ?? null,
      rivalPackNearestDistance: scenario('rival-cluster').rivalPackNearestDistance ?? null,
      visibleRivals: scenario('rival-cluster').visibleRivals ?? null,
      visibleRivalsSeen: Math.max(scenario('rival-cluster').visibleRivalsSeen || 0, scenario('driving').visibleRivalsSeen || 0),
      passed:
        (scenario('rival-cluster').visibleRivals || 0) >= 3 &&
        Number.isFinite(scenario('rival-cluster').rivalPackNearestDistance) &&
        scenario('rival-cluster').rivalPackNearestDistance <= 30 &&
        Number.isFinite(scenario('rival-cluster').rivalPackAverageDistance) &&
        scenario('rival-cluster').rivalPackAverageDistance <= 45,
    },
    steering: {
      highSpeedTurn90Time: scenario('steering-high-speed').steeringTurn90Time ?? null,
      lowSpeedTurn90Time: scenario('steering-low-speed').steeringTurn90Time ?? null,
      passed:
        Number.isFinite(scenario('steering-low-speed').steeringTurn90Time) &&
        Number.isFinite(scenario('steering-high-speed').steeringTurn90Time),
    },
  };
  return {
    evidence,
    passed: Object.values(evidence).every((entry) => entry.passed),
  };
};

const assertCoreKartLoopEvidence = (coreKartLoopEvidence) => {
  const failed = Object.entries(coreKartLoopEvidence?.evidence || {})
    .filter(([, evidence]) => !evidence.passed)
    .map(([key, evidence]) => ({ key, evidence }));
  if (failed.length) {
    fail('Core kart loop evidence is incomplete', { failed });
  }
};

const runNoMinimapLapReadabilityCapture = async (browser, { git }) => {
  const viewport = { height: 900, width: 1440 };
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });

  const url = `${baseUrl}/race-playtest.html?raceAutoplay=1&raceTrack=comeback-city&raceMode=free-switch&raceIndex=no-minimap-lap&raceNoFinish=1&raceHideMinimap=1`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(
    () =>
      window.__raceVisualTelemetry?.trackKey === 'comeback-city' &&
      document.querySelector('[data-testid="arcade-race-shell"]')?.dataset.raceMinimapVisible === 'false' &&
      document.querySelectorAll('[data-testid="race-minimap"]').length === 0,
    null,
    { timeout: 15000 }
  );
  await page.waitForFunction(
    () =>
      (window.__racePlaytestEvents || []).filter((event) => event.type === 'lap').length >= 1 &&
      (window.__raceVisualTelemetrySamples || []).length >= 6,
    null,
    { timeout: 20000 }
  );

  const detail = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="arcade-race-shell"]');
    const events = window.__racePlaytestEvents || [];
    const samples = window.__raceVisualTelemetrySamples || [];
    return {
      events,
      minimapElementCount: document.querySelectorAll('[data-testid="race-minimap"]').length,
      samples,
      shellMinimapVisible: shell?.dataset?.raceMinimapVisible || null,
      telemetry: window.__raceVisualTelemetry || null,
    };
  });
  const summary = summarizeNoMinimapLapSamples(detail);
  if (
    detail.minimapElementCount !== 0 ||
    detail.shellMinimapVisible !== 'false' ||
    summary.lapEvents < 1 ||
    summary.metricSampleCount < 6 ||
    summary.cameraClipMax !== 0 ||
    !Number.isFinite(summary.roadAheadCoverageMin) ||
    summary.roadAheadCoverageMin < visualThresholds.desktop.roadAheadMin ||
    (summary.visibleRivalsSeenMax || 0) < 3 ||
    summary.routeLookaheadUsedSamples < 1
  ) {
    fail('No-minimap full-lap readability capture did not meet camera and route-cue thresholds', {
      detail: {
        minimapElementCount: detail.minimapElementCount,
        shellMinimapVisible: detail.shellMinimapVisible,
      },
      summary,
    });
  }

  const significantErrors = pageErrors.filter(
    (message) => !message.includes('Failed to load resource: the server responded with a status of 404')
  );
  if (significantErrors.length) {
    fail('Browser console errors during no-minimap full-lap readability capture', {
      errors: significantErrors,
      ignoredErrors: pageErrors.filter((message) => !significantErrors.includes(message)),
    });
  }

  const artifactBase = 'no-minimap-full-lap-comeback-city';
  const screenshotPath = path.join(screenshotsDir, `${artifactBase}.png`);
  const screenshotVisualStats = await captureScreenshotWithVisualCheck({
    attempts: 2,
    detail: { scenario: 'no-minimap-full-lap' },
    page,
    screenshotPath,
  });
  const telemetryPath = path.join(screenshotsDir, `${artifactBase}.telemetry.json`);
  await writeFile(
    telemetryPath,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        events: detail.events,
        git,
        ignoredConsoleErrors: pageErrors.filter((message) => !significantErrors.includes(message)),
        routeUrl: url,
        samples: detail.samples,
        scenario: 'no-minimap-full-lap',
        screenshotPath,
        screenshotVisualStats,
        summary,
        telemetry: detail.telemetry,
        viewport,
      },
      null,
      2
    )
  );

  await page.close();
  return {
    name: 'comeback-city-no-minimap-full-lap',
    routeUrl: url,
    scenario: 'no-minimap-full-lap',
    screenshotPath,
    screenshotVisualStats,
    summary,
    telemetryPath,
    viewport,
  };
};

const runWebGLFallbackSnapshot = async (browser, { git }) => {
  const viewport = { height: 900, width: 1440 };
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });
  await page.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function patchedGetContext(type, ...args) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(String(type))) return null;
      return originalGetContext.call(this, type, ...args);
    };
  });

  const url = `${baseUrl}/#race`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="race-screen"][data-race-renderer="canvas2d-fallback"]', {
    timeout: 15000,
  });
  await page.waitForSelector('[data-testid="race-fallback-canvas"]', { timeout: 15000 });
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-testid="race-fallback-canvas"]');
    return canvas && canvas.toDataURL('image/png').length > 1200;
  });

  const significantErrors = pageErrors.filter(
    (message) => !message.includes('Failed to load resource: the server responded with a status of 404')
  );
  if (significantErrors.length) {
    fail('Browser console errors during race WebGL fallback snapshot', {
      errors: significantErrors,
      ignoredErrors: pageErrors.filter((message) => !significantErrors.includes(message)),
    });
  }

  const artifactBase = 'visual-comeback-city-webgl-fallback';
  const screenshotPath = path.join(screenshotsDir, `${artifactBase}.png`);
  await page.screenshot({ fullPage: false, path: screenshotPath });
  const detail = await page.evaluate(() => {
    const screen = document.querySelector('[data-testid="race-screen"]');
    const canvas = document.querySelector('[data-testid="race-fallback-canvas"]');
    return {
      canvasDataUrlLength: canvas?.toDataURL('image/png').length || 0,
      renderer: screen?.getAttribute('data-race-renderer') || null,
      text: document.body.innerText.slice(0, 500),
    };
  });
  const telemetryPath = path.join(screenshotsDir, `${artifactBase}.telemetry.json`);
  await writeFile(
    telemetryPath,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        detail,
        git,
        ignoredConsoleErrors: pageErrors.filter((message) => !significantErrors.includes(message)),
        routeUrl: url,
        scenario: 'webgl-fallback',
        screenshotPath,
        viewport,
      },
      null,
      2
    )
  );

  if (detail.renderer !== 'canvas2d-fallback') fail('Race WebGL fallback renderer was not active', { detail });
  if (detail.canvasDataUrlLength < 1200) fail('Race WebGL fallback canvas rendered blank', { detail });

  await page.close();
  return {
    name: 'comeback-city-webgl-fallback',
    routeUrl: url,
    scenario: 'webgl-fallback',
    screenshotPath,
    summary: {
      canvasDataUrlLength: detail.canvasDataUrlLength,
      renderer: detail.renderer,
    },
    telemetryPath,
    viewport,
  };
};

const runAudioMuteControlSnapshot = async (browser, { git }) => {
  const viewport = { height: 900, width: 1440 };
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });

  const url = `${baseUrl}/#race`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForSelector('[data-testid="race-audio-toggle"]', { timeout: 15000 });
  await page.waitForFunction(() => window.__raceVisualTelemetry?.trackKey === 'comeback-city', null, {
    timeout: 15000,
  });

  const toggle = page.locator('[data-testid="race-audio-toggle"]');
  const toggleCount = await toggle.count();
  if (toggleCount !== 1) fail('Race audio mute toggle count was not exactly one', { toggleCount });

  const beforePressed = await toggle.getAttribute('aria-pressed');
  const beforeLabel = await toggle.getAttribute('aria-label');
  if (beforePressed !== 'false' || beforeLabel !== 'Mute race audio') {
    fail('Race audio mute toggle initial state was incorrect', { beforeLabel, beforePressed });
  }

  await toggle.click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="race-audio-toggle"]')?.getAttribute('aria-pressed') === 'true' &&
      window.__raceVisualTelemetry?.player?.audioMuted === true,
    null,
    { timeout: 5000 }
  );

  const afterPressed = await toggle.getAttribute('aria-pressed');
  const afterLabel = await toggle.getAttribute('aria-label');

  const telemetry = await page.evaluate(() => window.__raceVisualTelemetry || null);
  if (afterPressed !== 'true' || afterLabel !== 'Unmute race audio' || telemetry?.player?.audioMuted !== true) {
    fail('Race audio mute toggle did not publish muted state after click', {
      afterLabel,
      afterPressed,
      telemetryAudioMuted: telemetry?.player?.audioMuted,
    });
  }
  const significantErrors = pageErrors.filter(
    (message) => !message.includes('Failed to load resource: the server responded with a status of 404')
  );
  if (significantErrors.length) {
    fail('Browser console errors during race audio mute control check', {
      errors: significantErrors,
      ignoredErrors: pageErrors.filter((message) => !significantErrors.includes(message)),
    });
  }

  const artifactBase = 'visual-comeback-city-audio-mute-control';
  const screenshotPath = path.join(screenshotsDir, `${artifactBase}.png`);
  const screenshotVisualStats = await captureScreenshotWithVisualCheck({
    attempts: 2,
    detail: { scenario: 'audio-mute-control' },
    page,
    screenshotPath,
  });
  const telemetryPath = path.join(screenshotsDir, `${artifactBase}.telemetry.json`);
  const detail = {
    afterLabel,
    afterPressed,
    beforeLabel,
    beforePressed,
    screenshotVisualStats,
    telemetryAudioMuted: telemetry.player.audioMuted,
  };
  await writeFile(
    telemetryPath,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        detail,
        git,
        ignoredConsoleErrors: pageErrors.filter((message) => !significantErrors.includes(message)),
        routeUrl: url,
        scenario: 'audio-mute-control',
        screenshotPath,
        screenshotVisualStats,
        telemetry,
        viewport,
      },
      null,
      2
    )
  );

  await page.close();
  return {
    name: 'comeback-city-audio-mute-control',
    routeUrl: url,
    scenario: 'audio-mute-control',
    screenshotPath,
    summary: detail,
    telemetryPath,
    viewport,
  };
};

const runReducedMotionSnapshot = async (browser, { git }) => {
  const viewport = { height: 900, width: 1440 };
  const page = await browser.newPage({ viewport });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });

  const url = `${baseUrl}/race-playtest.html?raceAutoplay=1&raceTrack=comeback-city&raceMode=visual-kart&raceVisualScenario=acceleration&raceIndex=comeback-city-reduced-motion`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForSelector('[data-testid="arcade-race-shell"]', { timeout: 15000 });
  await page.waitForFunction(
    () =>
      window.__raceVisualTelemetry?.trackKey === 'comeback-city' &&
      window.__raceVisualTelemetry?.reducedMotion === true &&
      (window.__raceVisualTelemetry?.player?.normalizedSpeed || 0) >= 0.98 &&
      document.querySelector('[data-testid="arcade-race-shell"]')?.dataset.reducedMotion === 'true' &&
      document.querySelector('[data-visual-canvas="race"]')?.dataset.reducedMotion === 'true',
    null,
    { timeout: visualSnapshotReadyTimeoutMs }
  );

  const detail = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="arcade-race-shell"]');
    const canvas = document.querySelector('[data-visual-canvas="race"]');
    const telemetry = window.__raceVisualTelemetry || null;
    return {
      canvasReducedMotion: canvas?.dataset?.reducedMotion || null,
      normalizedSpeed: telemetry?.player?.normalizedSpeed ?? null,
      reducedMotion: telemetry?.reducedMotion ?? null,
      shellReducedMotion: shell?.dataset?.reducedMotion || null,
      speedLineCount: document.querySelectorAll('[data-testid="race-speed-lines"]').length,
      telemetryPlayerReducedMotion: telemetry?.player?.reducedMotion ?? null,
    };
  });

  if (
    detail.reducedMotion !== true ||
    detail.telemetryPlayerReducedMotion !== true ||
    detail.shellReducedMotion !== 'true' ||
    detail.canvasReducedMotion !== 'true' ||
    detail.speedLineCount !== 0 ||
    detail.normalizedSpeed < 0.98
  ) {
    fail('Reduced-motion browser check did not suppress speed-line feedback at speed', detail);
  }

  const significantErrors = pageErrors.filter(
    (message) => !message.includes('Failed to load resource: the server responded with a status of 404')
  );
  if (significantErrors.length) {
    fail('Browser console errors during race reduced-motion check', {
      errors: significantErrors,
      ignoredErrors: pageErrors.filter((message) => !significantErrors.includes(message)),
    });
  }

  const telemetry = await page.evaluate(() => window.__raceVisualTelemetry || null);
  const artifactBase = 'visual-comeback-city-reduced-motion';
  const screenshotPath = path.join(screenshotsDir, `${artifactBase}.png`);
  const screenshotVisualStats = await captureScreenshotWithVisualCheck({
    attempts: 2,
    detail: { scenario: 'reduced-motion' },
    page,
    screenshotPath,
  });
  const telemetryPath = path.join(screenshotsDir, `${artifactBase}.telemetry.json`);
  await writeFile(
    telemetryPath,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        detail,
        git,
        ignoredConsoleErrors: pageErrors.filter((message) => !significantErrors.includes(message)),
        routeUrl: url,
        scenario: 'reduced-motion',
        screenshotPath,
        screenshotVisualStats,
        telemetry,
        viewport,
      },
      null,
      2
    )
  );

  await page.close();
  return {
    name: 'comeback-city-reduced-motion',
    routeUrl: url,
    scenario: 'reduced-motion',
    screenshotPath,
    summary: {
      ...detail,
      screenshotVisualStats,
    },
    telemetryPath,
    viewport,
  };
};

const launchRaceBrowser = () =>
  chromium.launch({ headless: true });

const run = async () => {
  await mkdir(screenshotsDir, { recursive: true });
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
  const results = [];
  const visualResults = [];
  const git = getGitMetadata();
  let noMinimapLapReadability = null;
  let sustainedNormalPlay = null;
  try {
    await waitForServer(`${baseUrl}/race-playtest.html`);
    browser = await launchRaceBrowser();

    for (const track of RACE_TRACKS) {
      for (const mode of ['free-switch', 'vehicle-restricted']) {
        for (let raceIndex = 1; raceIndex <= 3; raceIndex += 1) {
          const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
          const pageErrors = [];
          page.on('pageerror', (error) => pageErrors.push(error.message));
          page.on('console', (message) => {
            if (message.type() === 'error') pageErrors.push(message.text());
          });

          const url = `${baseUrl}/race-playtest.html?raceAutoplay=1&raceTrack=${track.key}&raceMode=${mode}&raceIndex=${raceIndex}`;
          await page.goto(url, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('canvas', { timeout: 15000 });
          await page.waitForFunction(
            ({ trackKey }) => {
              const telemetry = window.__raceVisualTelemetry;
              const latestSample = (window.__raceVisualTelemetrySamples || []).at(-1);
              return telemetry?.trackKey === trackKey && latestSample?.at >= 0.8;
            },
            { trackKey: track.key },
            { timeout: 15000 }
          );
          const artifactBase = `${track.key}-${mode}-${raceIndex}`;
          const screenshotPath = path.join(screenshotsDir, `${artifactBase}.png`);
          const screenshotVisualStats = await captureScreenshotWithVisualCheck({
            attempts: 5,
            detail: {
              mode,
              raceIndex,
              track: track.key,
            },
            page,
            screenshotPath,
          });
          try {
            await page.waitForFunction(() => window.__raceHarnessFinish || window.__racePlaytestResult, null, {
              timeout: 30000,
            });
          } catch {
            const debugState = await page.evaluate(() => ({
              events: window.__racePlaytestEvents?.slice(-12),
              text: document.body.innerText.slice(0, 700),
            }));
            fail('Race did not finish before browser timeout', { debugState, errors: pageErrors, mode, raceIndex, track: track.key });
          }
          const result = await page.evaluate(() => window.__raceHarnessFinish || window.__racePlaytestResult);
          const visualTelemetry = await page.evaluate(() => window.__raceVisualTelemetry || null);
          await writeFile(
            path.join(screenshotsDir, `${artifactBase}.telemetry.json`),
            JSON.stringify(
              {
                capturedAt: new Date().toISOString(),
                result,
                routeUrl: url,
                screenshotVisualStats,
                telemetry: visualTelemetry,
                viewport: { height: 900, width: 1440 },
              },
              null,
              2
            )
          );
          if (pageErrors.length) fail('Browser console errors during race playtest', { errors: pageErrors, mode, raceIndex, track: track.key });
          if (!result || result.trackKey !== track.key) fail('Race did not report a matching finish result', { mode, raceIndex, result, track: track.key });
          if (!Number.isFinite(result.time) || result.time <= 0) fail('Race finish time was invalid', { mode, raceIndex, result, track: track.key });
          const telemetry = result.playtest || {};
          const requiredLayers = track.kartOnly ? ['ground'] : ['ground', 'air', 'hybrid'];
          const requiredVehicles = track.kartOnly ? ['kart'] : ['kart', 'plane'];
          for (const layer of requiredLayers) {
            if (!telemetry.layers?.includes(layer)) fail('Autoplay did not exercise all route layers', { layer, mode, raceIndex, telemetry, track: track.key });
          }
          for (const vehicle of requiredVehicles) {
            if (!telemetry.vehicles?.includes(vehicle)) fail('Autoplay did not exercise required vehicles', { mode, raceIndex, telemetry, track: track.key, vehicle });
          }
          if (track.kartOnly && telemetry.vehicles?.some((vehicle) => vehicle !== 'kart')) {
            fail('Kart-only track used a non-kart vehicle', { mode, raceIndex, telemetry, track: track.key });
          }
          if (!telemetry.signatureUsed) fail('Track signature item was not activated', { mode, raceIndex, telemetry, track: track.key });
          if ((telemetry.itemUses || 0) < 1) fail('No item activation was recorded', { mode, raceIndex, telemetry, track: track.key });
          if ((telemetry.itemBoxesCollected || 0) < 1) fail('No item box pickup was recorded', { mode, raceIndex, telemetry, track: track.key });
          if ((telemetry.bananaMax || 0) < 16 || (telemetry.upgrades || 0) < 3) fail('Banana economy upgrades were not exercised', { mode, raceIndex, telemetry, track: track.key });
          if (!track.kartOnly && (track.switchPads || []).length && (telemetry.switchPads || 0) < 1) fail('Switch pads were not crossed', { mode, raceIndex, telemetry, track: track.key });
          if (!track.kartOnly && (track.vehicleZones || []).length && (telemetry.zones || 0) < 1) fail('Vehicle-only zones were not crossed', { mode, raceIndex, telemetry, track: track.key });
          if (!track.kartOnly && (track.vehicleLocks || []).length && (telemetry.locks || 0) < 1) fail('Vehicle-locked sections were not crossed', { mode, raceIndex, telemetry, track: track.key });
          if ((telemetry.hazardsEncountered || 0) <= 0) fail('No active track hazards were encountered', { mode, raceIndex, telemetry, track: track.key });

          results.push({
            bestLap: result.bestLap,
            mode,
            place: result.place,
            playtestSummary: {
              hazardsEncountered: telemetry.hazardsEncountered || 0,
              itemBoxesCollected: telemetry.itemBoxesCollected || 0,
              itemUses: telemetry.itemUses || 0,
              layers: telemetry.layers || [],
              signatureUsed: Boolean(telemetry.signatureUsed),
              vehicles: telemetry.vehicles || [],
            },
            raceIndex,
            screenshotPath,
            telemetryPath: path.join(screenshotsDir, `${artifactBase}.telemetry.json`),
            time: result.time,
            trackKey: track.key,
          });
          await page.close();
        }
      }
    }

    await browser.close();
    browser = null;

    const sustainedBrowser = await launchRaceBrowser();
    try {
      sustainedNormalPlay = await runSustainedNormalPlayCapture(sustainedBrowser, { git });
    } finally {
      await sustainedBrowser.close();
    }

    const noMinimapBrowser = await launchRaceBrowser();
    try {
      noMinimapLapReadability = await runNoMinimapLapReadabilityCapture(noMinimapBrowser, { git });
    } finally {
      await noMinimapBrowser.close();
    }

    const visualChecks = [
      {
        name: 'comeback-city-desktop-idle',
        scenario: 'idle',
        thresholds: visualThresholds.desktop,
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-driving',
        scenario: 'driving',
        thresholds: { ...visualThresholds.desktop, requireVisibleRivals: 3 },
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-acceleration',
        scenario: 'acceleration',
        thresholds: visualThresholds.desktop,
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-braking',
        scenario: 'braking',
        thresholds: { ...visualThresholds.desktop, kartMax: 0.29 },
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-reverse',
        scenario: 'reverse',
        thresholds: { ...visualThresholds.desktop, kartMax: 0.29 },
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-steering-low-speed',
        scenario: 'steering-low-speed',
        thresholds: { ...visualThresholds.desktop, kartMax: 0.28 },
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-steering-high-speed',
        scenario: 'steering-high-speed',
        thresholds: visualThresholds.desktop,
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-turn-approach',
        scenario: 'turn-approach',
        thresholds: { ...visualThresholds.desktop, kartMax: 0.27 },
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-opening-sequence',
        scenario: 'opening-sequence',
        thresholds: { ...visualThresholds.desktop, requireVisibleRivals: 3 },
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-collision-mechanics',
        scenario: 'collision-mechanics',
        thresholds: visualThresholds.desktop,
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-offroad-slowdown',
        scenario: 'offroad-slowdown',
        thresholds: { ...visualThresholds.desktop, kartMax: 0.28 },
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-drift',
        scenario: 'drift',
        thresholds: visualThresholds.desktop,
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-drift-tier-1',
        scenario: 'drift-tier-1',
        thresholds: visualThresholds.desktop,
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-drift-mechanics',
        scenario: 'drift-mechanics',
        thresholds: visualThresholds.desktop,
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-boost',
        scenario: 'boost',
        thresholds: visualThresholds.desktop,
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-boost-pad-mechanics',
        scenario: 'boost-pad-mechanics',
        thresholds: visualThresholds.desktop,
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-drift-release',
        scenario: 'drift-release',
        thresholds: visualThresholds.desktop,
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-item-pickup',
        scenario: 'item-pickup',
        thresholds: visualThresholds.desktop,
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-item-box-mechanics',
        scenario: 'item-box-mechanics',
        thresholds: visualThresholds.desktop,
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-rival-cluster',
        scenario: 'rival-cluster',
        thresholds: visualThresholds.desktop,
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-finish-line',
        scenario: 'finish-line',
        thresholds: { ...visualThresholds.desktop, kartMax: 0.29 },
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-desktop-stuck-recovery',
        scenario: 'stuck-recovery',
        thresholds: visualThresholds.desktop,
        viewport: { height: 900, width: 1440 },
      },
      {
        name: 'comeback-city-mobile-driving',
        scenario: 'driving',
        thresholds: visualThresholds.mobile,
        viewport: { height: 844, width: 390 },
      },
      {
        name: 'comeback-city-mobile-idle',
        scenario: 'idle',
        thresholds: visualThresholds.mobile,
        viewport: { height: 844, width: 390 },
      },
    ];

    for (const visualCheck of visualChecks) {
      const visualBrowser = await launchRaceBrowser();
      try {
        visualResults.push(await runVisualSnapshot(visualBrowser, { git, ...visualCheck }));
      } finally {
        await visualBrowser.close();
      }
    }

    const audioBrowser = await launchRaceBrowser();
    try {
      visualResults.push(await runAudioMuteControlSnapshot(audioBrowser, { git }));
    } finally {
      await audioBrowser.close();
    }

    const reducedMotionBrowser = await launchRaceBrowser();
    try {
      visualResults.push(await runReducedMotionSnapshot(reducedMotionBrowser, { git }));
    } finally {
      await reducedMotionBrowser.close();
    }

    const fallbackBrowser = await launchRaceBrowser();
    try {
      visualResults.push(await runWebGLFallbackSnapshot(fallbackBrowser, { git }));
    } finally {
      await fallbackBrowser.close();
    }
  } catch (error) {
    if (serverLog) error.serverLog = serverLog.slice(-4000);
    throw error;
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }

  const coreKartLoopEvidence = summarizeCoreKartLoopEvidence({
    noMinimapLapReadability,
    races: results,
    visualChecks: visualResults,
  });
  assertCoreKartLoopEvidence(coreKartLoopEvidence);

  const summaryPath = path.join(screenshotsDir, 'race-browser-playtest-summary.json');
  const runSummary = {
    capturedAt: new Date().toISOString(),
    coreKartLoopEvidence,
    git,
    raceCount: results.length,
    races: results,
    noMinimapLapReadability,
    summaryPath,
    sustainedNormalPlay,
    visualCheckCount: visualResults.length,
    visualChecks: visualResults,
  };
  await writeFile(summaryPath, JSON.stringify(runSummary, null, 2));
  console.log(JSON.stringify(runSummary, null, 2));
};

run().catch((error) => {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  if (error.serverLog) console.error(error.serverLog);
  process.exit(1);
});
