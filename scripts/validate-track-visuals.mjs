#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KART_TRACKS } from '../src/game/race/tracks/index.js';
import {
  buildCenterlineFrameSamples,
  buildVisualPlacementAnchors,
  formatTrackVisualValidation,
  resolveTrackVisuals,
  validateTrackVisuals,
} from '../src/game/race/tracks/trackVisualSchema.js';
import { compileTrack3D } from '../src/game/race/track/trackGeometry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const startedAt = new Date().toISOString();
const runId = `${startedAt.replace(/[:.]/g, '-') }__track-visual-validation`;
const runDir = path.join(root, 'asset-pipeline', 'audit', runId);

const fail = (message, detail = {}) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
};

const stripVisual = (track) => {
  const { visual, ...rest } = track;
  return rest;
};

const vectorDistance = (a, b) => Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0), (a.z || 0) - (b.z || 0));

const makeCompiledSampler = (compiled) => ({
  pointAt(progress, lane = 0) {
    const sample = compiled.pointAt(progress);
    const normal = { x: -sample.tangent.z, y: 0, z: sample.tangent.x };
    const point = sample.point.clone();
    point.x += normal.x * lane * compiled.roadWidth * 0.44;
    point.z += normal.z * lane * compiled.roadWidth * 0.44;
    return {
      center: sample.point,
      normal,
      point,
      tangent: sample.tangent,
      width: compiled.roadWidth,
    };
  },
  widthAt() {
    return compiled.roadWidth;
  },
});

const assertCompiledMechanicsEqual = (track) => {
  const withVisuals = compileTrack3D(track);
  const withoutVisuals = compileTrack3D(stripVisual(track));
  const diffs = [];
  if (Math.abs(withVisuals.totalLength - withoutVisuals.totalLength) > 0.000001) {
    diffs.push(`totalLength ${withVisuals.totalLength} !== ${withoutVisuals.totalLength}`);
  }
  if (Math.abs(withVisuals.roadWidth - withoutVisuals.roadWidth) > 0.000001) {
    diffs.push(`roadWidth ${withVisuals.roadWidth} !== ${withoutVisuals.roadWidth}`);
  }
  for (let index = 0; index < 32; index += 1) {
    const progress = index / 32;
    const a = withVisuals.pointAt(progress);
    const b = withoutVisuals.pointAt(progress);
    if (vectorDistance(a.point, b.point) > 0.000001 || vectorDistance(a.tangent, b.tangent) > 0.000001) {
      diffs.push(`pointAt(${progress.toFixed(3)}) changed`);
      break;
    }
  }
  if (diffs.length) fail(`${track.key}: visual data changed compiled track mechanics`, { diffs });
  return {
    roadWidth: withVisuals.roadWidth,
    totalLength: Number(withVisuals.totalLength.toFixed(3)),
  };
};

try {
  const validation = validateTrackVisuals(KART_TRACKS);
  if (!validation.ok) fail('Track visual validation failed', { validation });

  const summaries = [];
  for (const track of KART_TRACKS) {
    const mechanics = assertCompiledMechanicsEqual(track);
    const enabledVisuals = resolveTrackVisuals(track);
    const disabledVisuals = resolveTrackVisuals(track, { enabled: false });
    const anchors = buildVisualPlacementAnchors(enabledVisuals);
    const disabledAnchors = buildVisualPlacementAnchors(disabledVisuals);
    if (disabledAnchors.length) {
      fail(`${track.key}: disabled visuals still emitted placement anchors`, { disabledAnchors: disabledAnchors.length });
    }
    const frames = buildCenterlineFrameSamples(makeCompiledSampler(compileTrack3D(track)), { sampleCount: 16 });
    if (frames.length !== 17 || frames.some((frame) => !Number.isFinite(frame.center.x) || !Number.isFinite(frame.tangent.z))) {
      fail(`${track.key}: deterministic centerline frames were invalid`, { frameCount: frames.length });
    }
    summaries.push({
      anchorCount: anchors.length,
      disabledAnchorCount: disabledAnchors.length,
      frameCount: frames.length,
      mechanics,
      roadBandCount: enabledVisuals.road.bands.length,
      track: track.key,
      visualsEnabled: enabledVisuals.enabled,
    });
  }

  const badTrack = {
    ...KART_TRACKS[0],
    visual: {
      schemaVersion: 1,
      placements: [{ assetId: 'missing.visual-asset', every: 0.1, key: 'bad-placement', sides: [1], startProgress: 0, endProgress: 0.5 }],
    },
  };
  const badValidation = validateTrackVisuals([badTrack]);
  if (badValidation.ok || !badValidation.errors.some((error) => error.includes('missing.visual-asset'))) {
    fail('Unknown visual asset ID did not fail validation', { badValidation });
  }

  await mkdir(runDir, { recursive: true });
  const report = {
    badAssetRejected: true,
    runId,
    startedAt,
    summaries,
    validation,
  };
  await writeFile(path.join(runDir, 'track-visual-validation.json'), JSON.stringify(report, null, 2));
  await writeFile(
    path.join(runDir, 'track-visual-validation.md'),
    `# Track Visual Validation ${runId}

- Tracks: ${summaries.length}
- Validation errors: ${validation.errors.length}
- Validation warnings: ${validation.warnings.length}
- Bad asset rejected: true

## Tracks

| Track | Road bands | Anchors | Disabled anchors | Frames | Total length | Road width |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${summaries.map((summary) => `| ${summary.track} | ${summary.roadBandCount} | ${summary.anchorCount} | ${summary.disabledAnchorCount} | ${summary.frameCount} | ${summary.mechanics.totalLength} | ${summary.mechanics.roadWidth} |`).join('\n')}

## Messages

${formatTrackVisualValidation(validation) || '- none'}
`
  );
  console.log(`Track visual validation written to ${path.relative(root, runDir)}`);
  console.log(`tracks=${summaries.length} badAssetRejected=true`);
} catch (error) {
  console.error(error.stack || error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  process.exitCode = 1;
}
