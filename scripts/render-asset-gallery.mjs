#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { auditGltfFile } from './lib/gltf-metrics.mjs';
import { candidatesByTargetRuntime, loadCandidateIndex } from './lib/candidate-index.mjs';
import {
  classifyAsset,
  fromRepoPath,
  hashFile,
  loadPipelineConfig,
  writeJsonFile,
} from './lib/asset-pipeline-config.mjs';
import { createRunMetadata } from './lib/run-metadata.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const startedAt = new Date().toISOString();
const parsed = parseArgs({
  options: {
    asset: { type: 'string', multiple: true },
    'candidate-report': { type: 'string', multiple: true },
    port: { type: 'string', default: '5321' },
    outputRoot: { type: 'string', default: 'asset-pipeline/gallery/runs' },
  },
  allowPositionals: true,
});

const PHASE_2_GROUPS = [
  {
    id: 'layer23-penguin',
    label: 'Layer 23 Penguin',
    source: '3d generations:character sheets/layer233d.glb',
    runtime: 'src/assets/game/models/avatars/layer23-penguin.glb',
  },
  {
    id: 'mizzle',
    label: 'Mizzle',
    source: '3d generations:character sheets/mizzlepixelated3d.glb',
    runtime: 'src/assets/game/models/avatars/mizzle.glb',
  },
  {
    id: 'ice-sled',
    label: 'Ice Sled',
    source: '3d generations:character sheets/ice+sled+3d+model.glb',
    runtime: 'src/assets/game/models/tripo/ice-sled.glb',
  },
  {
    id: 'tclow-penguin',
    label: 'T Clow Penguin',
    source: '3d generations:character sheets/tclow-ordinalpenguin.glb',
    runtime: 'src/assets/game/models/avatars/tclow-penguin.glb',
  },
  {
    id: 'item-banana',
    label: 'Item Banana',
    source: null,
    runtime: 'src/assets/game/models/toy-car-kit/item-banana.glb',
  },
  {
    id: 'item-cone',
    label: 'Item Cone',
    source: null,
    runtime: 'src/assets/game/models/toy-car-kit/item-cone.glb',
  },
];

const VIEWS = ['front', 'side', 'rear', 'top'];
const V2_REFERENCE_IMAGES = [
  'src/assets/game/art-direction/v2/hero-red-kart-trait-card-v2.png',
  'src/assets/game/art-direction/v2/blue-speed-rival-trait-card-v2.png',
  'src/assets/game/art-direction/v2/orange-muscle-rival-trait-card-v2.png',
  'src/assets/game/art-direction/v2/purple-tech-rival-trait-card-v2.png',
  'src/assets/game/art-direction/v2/roadside-props-barriers-trait-card-v2.png',
  'src/assets/game/art-direction/v2/track-geometry-road-system-trait-card-v2.png',
  'src/assets/game/art-direction/v2/material-lighting-camera-trait-card-v2.png',
];

const port = Number(parsed.values.port || 5321);
const baseUrl = `http://127.0.0.1:${port}`;
const runId = `${startedAt.replace(/[:.]/g, '-') }__asset-gallery`;
const outputRoot = parsed.values.outputRoot;
const runDir = path.join(repoRoot, outputRoot, runId);
const screenshotDir = path.join(runDir, 'screenshots');
const requestedAssets = [...(parsed.values.asset || []), ...(parsed.positionals || [])].filter(Boolean);

try {
  await fs.mkdir(screenshotDir, { recursive: true });
  const config = await loadPipelineConfig(repoRoot);
  const candidateIndex = await loadCandidateIndex(repoRoot, parsed.values['candidate-report'] || []);
  const groups = await buildGalleryGroups({ candidateIndex, config, requestedAssets });
  if (!groups.length) throw new Error('No gallery assets selected');

  const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: repoRoot,
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
    await waitForServer(`${baseUrl}/asset-pipeline/gallery/viewer.html`);
    browser = await chromium.launch();
    const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { height: 512, width: 512 } });
    const captures = [];
    for (const group of groups) {
      for (const asset of group.assets) {
        for (const view of VIEWS) {
          captures.push(await captureAssetView({ asset, group, page, view }));
        }
      }
    }

    const completedAt = new Date().toISOString();
    const run = await createRunMetadata({
      repoRoot,
      runId,
      kind: 'asset-gallery',
      scope: 'gallery',
      strict: false,
      startedAt,
      completedAt,
      args: process.argv.slice(2),
    });
    const report = {
      schemaVersion: 1,
      run,
      outputRoot,
      groups,
      captures,
      v2ReferenceImages: V2_REFERENCE_IMAGES,
      contactSheet: path.relative(repoRoot, path.join(runDir, 'contact-sheet.html')),
      approvalTemplate: path.relative(repoRoot, path.join(runDir, 'approval-template.json')),
    };

    await writeJsonFile(path.join(runDir, 'gallery-report.json'), report);
    await fs.writeFile(path.join(runDir, 'contact-sheet.html'), formatContactSheet(report));
    await writeJsonFile(path.join(runDir, 'approval-template.json'), formatApprovalTemplate(report));
    await writeJsonFile(path.join(repoRoot, outputRoot, 'latest-gallery.json'), report);

    console.log(`Asset gallery written to ${path.relative(repoRoot, runDir)}`);
    console.log(`groups=${groups.length} assets=${groups.reduce((sum, group) => sum + group.assets.length, 0)} captures=${captures.length}`);
  } catch (error) {
    if (serverLog) error.serverLog = serverLog.slice(-4000);
    throw error;
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
} catch (error) {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  if (error.serverLog) console.error(error.serverLog);
  process.exitCode = 1;
}

async function buildGalleryGroups({ candidateIndex, config, requestedAssets }) {
  const candidatesByRuntime = candidatesByTargetRuntime(candidateIndex);
  const requested = new Set(requestedAssets);
  const groups = [];

  for (const group of PHASE_2_GROUPS) {
    if (requested.size && !requested.has(group.runtime) && !requested.has(group.source) && !requested.has(group.id)) {
      continue;
    }
    const assets = [];
    for (const entry of [
      { kind: 'source', repoPath: group.source },
      { kind: 'runtime', repoPath: group.runtime },
      ...(candidatesByRuntime.get(group.runtime) || []).map((candidate) => ({
        kind: 'candidate',
        repoPath: candidate.candidateRepoPath,
        candidate,
        variant: candidate.profileName,
        budgetStatus: candidate.budgetStatus,
      })),
    ]) {
      if (!entry.repoPath) continue;
      assets.push(await buildAssetEntry({
        budgetStatus: entry.budgetStatus || null,
        config,
        group,
        kind: entry.kind,
        candidate: entry.candidate || null,
        repoPath: entry.repoPath,
        variant: entry.variant || null,
      }));
    }
    groups.push({
      id: group.id,
      label: group.label,
      runtimeRepoPath: group.runtime,
      sourceRepoPath: group.source,
      assets,
    });
  }

  return groups;
}

async function buildAssetEntry({ budgetStatus, candidate, config, group, kind, repoPath, variant }) {
  const absolutePath = fromRepoPath(repoRoot, repoPath);
  const exists = await fileExists(absolutePath);
  if (!exists) throw new Error(`Gallery asset is missing: ${repoPath}`);

  const targetRuntimeRepoPath = candidate?.targetRuntimeRepoPath || group.runtime;
  const classification = classifyAsset(kind === 'candidate' ? targetRuntimeRepoPath : repoPath, config.profiles);
  const audit = await auditGltfFile({
    repoRoot,
    file: {
      absolutePath,
      missingRoot: false,
      repoPath,
      rootId: kind === 'source' ? 'legacy-character-sheets' : kind === 'runtime' ? 'promoted-runtime-models' : candidate?.candidatePipeline || 'candidate',
      rootKind: kind === 'source' ? 'immutable-source' : kind === 'runtime' ? 'runtime' : 'candidate',
      rootPath: kind === 'source' ? '3d generations:character sheets' : kind === 'runtime' ? 'src/assets/game/models' : path.dirname(repoPath),
      targetRuntimeRepoPath: kind === 'candidate' ? targetRuntimeRepoPath : null,
      candidatePipeline: candidate?.candidatePipeline || null,
      profileName: candidate?.profileName || variant || null,
    },
    config,
    includeValidator: true,
  });
  const sha256 = await hashFile(absolutePath);
  const stagedRepoPath = await stageAssetForBrowser({ absolutePath, repoPath, sha256 });
  const variantId = kind === 'candidate' && variant
    ? `candidate-${safeName(candidate?.candidatePipeline || 'candidate')}-${safeName(variant)}`
    : kind;
  const label = kind === 'candidate' && variant
    ? `candidate ${candidate?.candidatePipeline || 'candidate'} ${variant}`
    : kind;

  return {
    id: `${group.id}-${variantId}`,
    kind,
    label,
    variant,
    candidatePipeline: candidate?.candidatePipeline || null,
    sourceRepoPath: candidate?.sourceRepoPath || null,
    sourceHash: candidate?.sourceHash || null,
    targetRuntimeRepoPath,
    budgetStatus,
    repoPath,
    stagedRepoPath,
    urlPath: repoPathToUrl(stagedRepoPath),
    sha256,
    classification,
    validatorPassed: Boolean(audit.validator?.passed),
    parseOk: Boolean(audit.parse?.ok),
    metrics: {
      encodedBytes: audit.encodedBytes || 0,
      renderTriangles: audit.metrics?.renderTriangles || 0,
      uploadVertices: audit.metrics?.uploadVertices || 0,
      materials: audit.metrics?.materials || 0,
      textures: audit.metrics?.textureCount || 0,
      maxTextureDimension: audit.metrics?.maxTextureDimension || 0,
      requiredExtensions: audit.metrics?.requiredExtensions || [],
      usedExtensions: audit.metrics?.usedExtensions || [],
    },
  };
}

async function stageAssetForBrowser({ absolutePath, repoPath, sha256 }) {
  const extension = path.extname(repoPath);
  const filename = `${safeName(path.basename(repoPath, extension))}__${shortHash(sha256)}${extension}`;
  const stagedPath = path.join(runDir, 'served-assets', filename);
  await fs.mkdir(path.dirname(stagedPath), { recursive: true });
  await fs.copyFile(absolutePath, stagedPath);
  return path.relative(repoRoot, stagedPath).split(path.sep).join('/');
}

async function captureAssetView({ asset, group, page, view }) {
  const errors = [];
  page.removeAllListeners('pageerror');
  page.removeAllListeners('console');
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  const url = `${baseUrl}/asset-pipeline/gallery/viewer.html?model=${encodeURIComponent(asset.urlPath)}&expectedHash=${encodeURIComponent(asset.sha256)}&view=${encodeURIComponent(view)}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__assetGalleryReady || window.__assetGalleryError, null, { timeout: 30000 });
  const state = await page.evaluate(() => ({
    error: window.__assetGalleryError || null,
    ready: window.__assetGalleryReady || null,
  }));
  if (state.error) {
    throw withDetail(new Error(`Gallery render failed for ${asset.repoPath} ${view}`), state.error);
  }
  if (errors.length) {
    throw withDetail(new Error(`Gallery console/page error for ${asset.repoPath} ${view}`), { errors });
  }

  const screenshotName = `${safeName(asset.id)}__${view}.png`;
  const screenshotPath = path.join(screenshotDir, screenshotName);
  await page.locator('canvas').screenshot({ path: screenshotPath });
  const blank = await inspectScreenshot(screenshotPath);
  if (blank.blank) {
    throw withDetail(new Error(`Gallery blank render for ${asset.repoPath} ${view}`), blank);
  }

  return {
    assetId: asset.id,
    assetKind: asset.kind,
    groupId: group.id,
    repoPath: asset.repoPath,
    screenshotPath: path.relative(repoRoot, screenshotPath),
    view,
    renderState: state.ready,
    screenshotStats: blank,
  };
}

async function inspectScreenshot(filePath) {
  const png = PNG.sync.read(await fs.readFile(filePath));
  let samples = 0;
  let changed = 0;
  let sum = 0;
  let sumSq = 0;
  const bg = [238, 242, 246];
  for (let y = Math.floor(png.height * 0.12); y < Math.floor(png.height * 0.88); y += 4) {
    for (let x = Math.floor(png.width * 0.12); x < Math.floor(png.width * 0.88); x += 4) {
      const index = (y * png.width + x) * 4;
      const r = png.data[index];
      const g = png.data[index + 1];
      const b = png.data[index + 2];
      const lum = (r + g + b) / 3;
      const delta = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]);
      if (delta > 30) changed += 1;
      sum += lum;
      sumSq += lum * lum;
      samples += 1;
    }
  }
  const mean = sum / Math.max(1, samples);
  const variance = sumSq / Math.max(1, samples) - mean * mean;
  const changedRatio = changed / Math.max(1, samples);
  return {
    blank: changedRatio < 0.012 || variance < 4,
    changedRatio: Number(changedRatio.toFixed(4)),
    variance: Number(variance.toFixed(2)),
    samples,
  };
}

function formatContactSheet(report) {
  const capturesByAssetView = new Map(report.captures.map((capture) => [`${capture.assetId}:${capture.view}`, capture]));
  const groupHtml = report.groups.map((group) => {
    const assetRows = group.assets.map((asset) => {
      const viewCells = VIEWS.map((view) => {
        const capture = capturesByAssetView.get(`${asset.id}:${view}`);
        const src = capture ? relFromRun(capture.screenshotPath) : '';
        return `<figure><img src="${src}" alt="${escapeHtml(group.label)} ${asset.kind} ${view}"><figcaption>${view}</figcaption></figure>`;
      }).join('');
      return `<section class="asset">
        <h3>${escapeHtml(group.label)} ${escapeHtml(asset.label || asset.kind)}</h3>
        <p><code>${escapeHtml(asset.repoPath)}</code></p>
        <p><code>${escapeHtml(asset.sha256)}</code></p>
        <p>${asset.metrics.encodedBytes.toLocaleString()} bytes · ${asset.metrics.renderTriangles.toLocaleString()} tris · ${asset.metrics.uploadVertices.toLocaleString()} verts · ${asset.metrics.materials} mats · ${asset.metrics.textures} textures${asset.budgetStatus ? ` · budget ${escapeHtml(asset.budgetStatus)}` : ''}</p>
        <div class="views">${viewCells}</div>
      </section>`;
    }).join('');
    return `<section class="group"><h2>${escapeHtml(group.label)}</h2>${assetRows}</section>`;
  }).join('');
  const refs = report.v2ReferenceImages.map((repoPath) => {
    const src = relFromRun(repoPath);
    return `<figure><img src="${src}" alt="${escapeHtml(path.basename(repoPath))}"><figcaption>${escapeHtml(path.basename(repoPath))}</figcaption></figure>`;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Asset Gallery ${escapeHtml(report.run.runId)}</title>
  <style>
    body { margin: 0; background: #101722; color: #eef4ff; font: 14px system-ui, sans-serif; }
    header { padding: 18px 22px; border-bottom: 1px solid rgba(255,255,255,.14); background: #0a0f18; }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 18px; text-transform: uppercase; letter-spacing: .08em; }
    h2 { margin-top: 26px; font-size: 18px; }
    h3 { font-size: 15px; text-transform: uppercase; letter-spacing: .06em; }
    main { padding: 18px; }
    .asset { margin-top: 14px; padding: 14px; border: 1px solid rgba(160,190,230,.22); background: rgba(255,255,255,.035); }
    .asset p { margin-top: 7px; color: #b8c7dc; font-size: 12px; }
    code { color: #d8ecff; word-break: break-all; }
    .views, .refs { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 12px; }
    figure { margin: 0; border: 1px solid rgba(160,190,230,.2); background: #eaf0f7; color: #172033; }
    img { display: block; width: 100%; height: auto; }
    figcaption { padding: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  </style>
</head>
<body>
  <header>
    <h1>Asset Gallery ${escapeHtml(report.run.runId)}</h1>
    <p>${report.groups.length} groups · ${report.captures.length} captures · no promotion</p>
  </header>
  <main>
    ${groupHtml}
    <section class="group">
      <h2>V2 Reference Cards</h2>
      <div class="refs">${refs}</div>
    </section>
  </main>
</body>
</html>
`;
}

function formatApprovalTemplate(report) {
  return {
    schemaVersion: 1,
    approvalType: 'asset-gallery-review',
    galleryRunId: report.run.runId,
    reviewer: '',
    reviewedAt: '',
    proofPaths: {
      contactSheet: report.contactSheet,
      galleryReport: path.relative(repoRoot, path.join(runDir, 'gallery-report.json')),
    },
    records: report.groups.flatMap((group) => {
      const runtime = group.assets.find((asset) => asset.kind === 'runtime');
      const candidates = group.assets.filter((asset) => asset.kind === 'candidate');
      const source = group.assets.find((asset) => asset.kind === 'source');
      return candidates.map((candidate) => ({
            assetId: candidate.id,
            assetGroupId: group.id,
            assetLabel: group.label,
            assetClass: candidate.classification?.assetClass || '',
            candidatePipeline: candidate.candidatePipeline || '',
            candidateProfile: candidate.variant || '',
            candidateBudgetStatus: candidate.budgetStatus || '',
            sourceRepoPath: candidate.sourceRepoPath || source?.repoPath || runtime?.repoPath || '',
            runtimeRepoPath: candidate.targetRuntimeRepoPath || runtime?.repoPath || '',
            targetRuntimeRepoPath: candidate.targetRuntimeRepoPath || runtime?.repoPath || '',
            candidateRepoPath: candidate.repoPath,
            candidateHash: candidate.sha256,
            sourceHash: candidate.sourceHash || source?.sha256 || runtime?.sha256 || '',
            decision: 'pending',
            approvedForPromotion: false,
            checks: {
              silhouette: 'pending',
              materials: 'pending',
              grounding: 'pending',
              scale: 'pending',
              provenance: 'pending',
            },
            notes: '',
          }));
    }),
  };
}

function repoPathToUrl(repoPath) {
  return `/${repoPath.split('/').map((part) => encodeURIComponent(part)).join('/')}`;
}

function relFromRun(repoPath) {
  return path.relative(runDir, path.join(repoRoot, repoPath)).split(path.sep).join('/');
}

function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function shortHash(value) {
  return String(value || '').replace(/^sha256:/, '').slice(0, 12);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

async function waitForServer(url, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  throw new Error(`Vite server did not become ready: ${url}`);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function withDetail(error, detail) {
  error.detail = detail;
  return error;
}
