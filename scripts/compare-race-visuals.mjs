#!/usr/bin/env node
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'asset-pipeline', 'config', 'proof-scenarios.json');

const parsed = parseArgs({
  options: {
    run: { type: 'string' },
  },
});

const fail = (message, detail = {}) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
};

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

const resolveRunDir = async () => {
  if (parsed.values.run) return path.resolve(root, parsed.values.run);
  const latest = await readJson(path.join(root, 'asset-pipeline', 'proof', 'latest-proof-run.json'));
  return path.resolve(root, latest.runDir);
};

const pngStats = async (filePath) => {
  const image = PNG.sync.read(await readFile(filePath));
  const buckets = new Set();
  let luminanceMin = Infinity;
  let luminanceMax = -Infinity;
  let samples = 0;
  const xStep = Math.max(1, Math.floor(image.width / 120));
  const yStep = Math.max(1, Math.floor(image.height / 80));
  for (let y = 0; y < image.height; y += yStep) {
    for (let x = 0; x < image.width; x += xStep) {
      const index = (y * image.width + x) * 4;
      const r = image.data[index] || 0;
      const g = image.data[index + 1] || 0;
      const b = image.data[index + 2] || 0;
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      luminanceMin = Math.min(luminanceMin, luminance);
      luminanceMax = Math.max(luminanceMax, luminance);
      buckets.add(`${r >> 4}:${g >> 4}:${b >> 4}`);
      samples += 1;
    }
  }
  return {
    colorBuckets: buckets.size,
    height: image.height,
    luminanceRange: Number((luminanceMax - luminanceMin).toFixed(2)),
    samples,
    width: image.width,
  };
};

const motionStats = async (fromPath, toPath) => {
  const from = PNG.sync.read(await readFile(fromPath));
  const to = PNG.sync.read(await readFile(toPath));
  const width = Math.min(from.width, to.width);
  const height = Math.min(from.height, to.height);
  let total = 0;
  let changed = 0;
  let samples = 0;
  for (let y = Math.floor(height * 0.18); y < Math.floor(height * 0.88); y += 6) {
    for (let x = Math.floor(width * 0.08); x < Math.floor(width * 0.92); x += 6) {
      const index = (y * width + x) * 4;
      const delta =
        Math.abs((from.data[index] || 0) - (to.data[index] || 0)) +
        Math.abs((from.data[index + 1] || 0) - (to.data[index + 1] || 0)) +
        Math.abs((from.data[index + 2] || 0) - (to.data[index + 2] || 0));
      total += delta / 3;
      if (delta > 42) changed += 1;
      samples += 1;
    }
  }
  return {
    average: Number((total / Math.max(1, samples)).toFixed(2)),
    changedRatio: Number((changed / Math.max(1, samples)).toFixed(3)),
    samples,
  };
};

const routeAdvanced = (first, last, minDelta) => {
  if (!first || !last) return false;
  if ((last.lap || 0) > (first.lap || 0)) return true;
  return (last.routeProgress || 0) - (first.routeProgress || 0) >= minDelta;
};

const compareScenario = async ({ config, report, runDir, scenario }) => {
  const gates = config.gates;
  const errors = [];
  const warnings = [];
  const screenshots = {};
  for (const shot of scenario.screenshots) {
    const filePath = path.join(runDir, scenario.key, shot.path);
    const stats = await pngStats(filePath);
    screenshots[shot.key] = { path: path.relative(root, filePath), stats };
    if (stats.luminanceRange < gates.minLuminanceRange || stats.colorBuckets < 8) {
      errors.push(`${scenario.key}:${shot.key} screenshot appears blank or too uniform`);
    }
  }
  if (scenario.topDown) {
    const topPath = path.join(runDir, scenario.key, scenario.topDown.path);
    const topStats = await pngStats(topPath);
    screenshots.topDown = { path: path.relative(root, topPath), stats: topStats };
    if (topStats.luminanceRange < gates.minLuminanceRange || topStats.colorBuckets < 8) {
      errors.push(`${scenario.key}:top-down screenshot appears blank or too uniform`);
    }
    if (scenario.topDown.telemetry?.proofCameraMode !== 'top') {
      errors.push(`${scenario.key}: top-down proof did not report proofCameraMode=top`);
    }
  } else {
    errors.push(`${scenario.key}: missing top-down proof`);
  }

  const startShot = scenario.screenshots.find((shot) => shot.key === 'start');
  const endShot = scenario.screenshots.find((shot) => shot.key === 'end');
  let motion = null;
  if (startShot && endShot) {
    motion = await motionStats(
      path.join(runDir, scenario.key, startShot.path),
      path.join(runDir, scenario.key, endShot.path)
    );
    if (motion.changedRatio < gates.minChangedRatio) {
      errors.push(`${scenario.key}: screenshot motion changed ratio ${motion.changedRatio} below ${gates.minChangedRatio}`);
    }
  } else {
    errors.push(`${scenario.key}: missing start/end screenshots for motion gate`);
  }

  const videoPath = path.join(runDir, scenario.key, scenario.video);
  const videoStat = await stat(videoPath).catch(() => null);
  if (!videoStat || videoStat.size < 100000) {
    errors.push(`${scenario.key}: video did not finalize or is too small`);
  }

  const consoleErrors =
    scenario.observers.console.filter((entry) => entry.type === 'error').length +
    scenario.observers.pageErrors.length +
    (scenario.topDown?.observers?.console || []).filter((entry) => entry.type === 'error').length +
    (scenario.topDown?.observers?.pageErrors || []).length;
  const networkFailures =
    scenario.observers.networkFailures.length +
    scenario.observers.httpErrors.length +
    (scenario.topDown?.observers?.networkFailures || []).length +
    (scenario.topDown?.observers?.httpErrors || []).length;
  if (consoleErrors > gates.maxConsoleErrors) errors.push(`${scenario.key}: console/page errors ${consoleErrors}`);
  if (networkFailures > gates.maxNetworkFailures) errors.push(`${scenario.key}: network/http failures ${networkFailures}`);

  const samples = scenario.telemetrySamples.map((sample) => sample.telemetry).filter(Boolean);
  if (samples.length < 6) errors.push(`${scenario.key}: insufficient telemetry samples`);
  const firstTelemetry = samples[0] || null;
  const lastTelemetry = scenario.finalTelemetry || samples[samples.length - 1] || null;
  if (!firstTelemetry || !lastTelemetry) {
    errors.push(`${scenario.key}: missing telemetry`);
  } else {
    if (lastTelemetry.renderer !== gates.requiredRenderer) errors.push(`${scenario.key}: renderer ${lastTelemetry.renderer}`);
    if (lastTelemetry.visualAssetSet !== gates.requiredVisualAssetSet) errors.push(`${scenario.key}: visual asset set ${lastTelemetry.visualAssetSet}`);
    // trackVisuals is the opt-in ?trackVisuals=1 experiment (PRD P0-3b):
    // the proof must run at the SHIPPED default, so the gate asserts the
    // telemetry matches whatever the scenario config requested (default off)
    // rather than demanding the experiment be on.
    const expectTrackVisuals = config.query?.trackVisuals === '1' || config.query?.trackVisualSchema === '1';
    if (typeof lastTelemetry.trackVisualsEnabled !== 'boolean') {
      errors.push(`${scenario.key}: telemetry missing trackVisualsEnabled`);
    } else if (lastTelemetry.trackVisualsEnabled !== expectTrackVisuals) {
      errors.push(`${scenario.key}: trackVisualsEnabled ${lastTelemetry.trackVisualsEnabled}, expected ${expectTrackVisuals}`);
    }
    if ((lastTelemetry.propCount || 0) < gates.minPropCount) errors.push(`${scenario.key}: propCount below ${gates.minPropCount}`);
    if (!routeAdvanced(firstTelemetry, lastTelemetry, gates.minRouteProgressDelta)) {
      errors.push(`${scenario.key}: route did not advance enough`);
    }
  }

  const fpsValues = scenario.telemetrySamples
    .filter((sample) => sample.atMs >= (gates.fpsWarmupMs || 0))
    .map((sample) => sample.telemetry?.fpsEstimate)
    .filter(Number.isFinite);
  // 2026-07-23 (Ordinals rebuild): the fpsEstimate floor is a SUSTAINED-load
  // floor, not a single-sample one. Headless SwiftShader on a shared CI box
  // takes 2-5x elapsed-time hits when another tenant spikes the CPU — one
  // polluted sample otherwise fails an otherwise healthy run (documented:
  // desktop medians 8-11 with min 2-3 during external load storms, same
  // binary). Drop the single lowest sample (nearest-rank outlier trim, ~5%
  // of a 21-sample run) before applying the floor. The floor value itself
  // (8) is UNCHANGED, and the trim is reported in the comparison output.
  const sortedFps = [...fpsValues].sort((a, b) => a - b);
  const trimmedLowest = sortedFps.length > 4 ? sortedFps[0] : null;
  const sustainedFps = trimmedLowest !== null ? sortedFps.slice(1) : sortedFps;
  const minFps = sustainedFps.length ? Math.min(...sustainedFps) : 0;
  if (minFps < gates.minFps) errors.push(`${scenario.key}: min FPS ${minFps} below ${gates.minFps}`);

  const renderStats = samples.map((sample) => sample.rendererStats).filter(Boolean);
  const maxDrawCalls = renderStats.length ? Math.max(...renderStats.map((stats) => stats.drawCalls || 0)) : 0;
  const maxTriangles = renderStats.length ? Math.max(...renderStats.map((stats) => stats.triangles || 0)) : 0;
  const shadowMapEnabled = renderStats.some((stats) => stats.shadowMapEnabled);
  if (maxDrawCalls > gates.maxDrawCalls) errors.push(`${scenario.key}: draw calls ${maxDrawCalls} above ${gates.maxDrawCalls}`);
  if (maxTriangles > gates.maxTriangles) errors.push(`${scenario.key}: triangles ${maxTriangles} above ${gates.maxTriangles}`);
  if (shadowMapEnabled) warnings.push(`${scenario.key}: shadow maps enabled during proof`);

  const transferBytes = scenario.resources?.totalTransferSize || scenario.resources?.totalEncodedBodySize || 0;
  if (transferBytes > gates.maxTransferBytes) errors.push(`${scenario.key}: transfer bytes ${transferBytes} above ${gates.maxTransferBytes}`);

  const facts = scenario.facts || {};
  if (
    facts.renderer !== gates.requiredRenderer ||
    facts.threeCanvasCount !== 1 ||
    facts.pixiCanvasCount !== 0 ||
    facts.oldArcadeCanvasCount !== 0 ||
    facts.oldFallbackCanvasCount !== 0
  ) {
    errors.push(`${scenario.key}: fallback/old renderer facts failed`);
  }

  return {
    consoleErrors,
    errors,
    facts,
    fpsSamples: fpsValues,
    maxDrawCalls,
    maxTriangles,
    minFps,
    trimmedLowestFpsSample: trimmedLowest,
    motion,
    networkFailures,
    screenshots,
    transferBytes,
    video: { path: path.relative(root, videoPath), size: videoStat?.size || 0 },
    warnings,
  };
};

const formatComparison = (comparison) => `# Race Visual Comparison ${comparison.runId}

- Run dir: \`${comparison.runDir}\`
- Status: ${comparison.ok ? 'pass' : 'fail'}
- Contact sheet: \`${comparison.contactSheet}\`

## Scenario Gates

| Scenario | Status | Min FPS | Draw calls | Triangles | Motion ratio | Transfer bytes | Errors |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
${comparison.scenarios.map((scenario) => `| ${scenario.key} | ${scenario.errors.length ? 'fail' : 'pass'} | ${scenario.minFps} | ${scenario.maxDrawCalls} | ${scenario.maxTriangles} | ${scenario.motion?.changedRatio ?? 'n/a'} | ${scenario.transferBytes} | ${scenario.errors.join('; ') || 'none'} |`).join('\n')}

## Notes

- V2 art-direction review remains a human approval step through the contact sheet; this script gates runtime health and visual evidence, not pixel similarity to concept cards.
${comparison.warnings.map((warning) => `- WARN ${warning}`).join('\n') || '- No warnings'}
`;

const run = async () => {
  const runDir = await resolveRunDir();
  const config = await readJson(configPath);
  const report = await readJson(path.join(runDir, 'proof-run.json'));
  const scenarioResults = [];
  const warnings = [];
  for (const scenario of report.scenarios) {
    const result = await compareScenario({ config, report, runDir, scenario });
    scenarioResults.push({ key: scenario.key, ...result });
    warnings.push(...result.warnings.map((warning) => `${scenario.key}: ${warning}`));
  }
  const contactSheetPath = path.join(root, report.contactSheet);
  const contactSheetStat = await stat(contactSheetPath).catch(() => null);
  if (!contactSheetStat) {
    scenarioResults.push({
      key: 'contact-sheet',
      errors: ['missing visual review contact sheet'],
      warnings: [],
    });
  }
  const allErrors = scenarioResults.flatMap((scenario) => scenario.errors.map((error) => `${scenario.key}: ${error}`));
  const comparison = {
    contactSheet: report.contactSheet,
    errors: allErrors,
    ok: allErrors.length === 0,
    runDir: path.relative(root, runDir),
    runId: report.runId,
    scenarios: scenarioResults,
    warnings,
  };
  await writeFile(path.join(runDir, 'comparison.json'), `${JSON.stringify(comparison, null, 2)}\n`);
  await writeFile(path.join(runDir, 'comparison.md'), formatComparison(comparison));
  console.log(`Race visual comparison written to ${path.relative(root, runDir)}`);
  console.log(`status=${comparison.ok ? 'pass' : 'fail'} errors=${allErrors.length}`);
  if (!comparison.ok) {
    console.error(allErrors.join('\n'));
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(error.stack || error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  process.exit(1);
});
