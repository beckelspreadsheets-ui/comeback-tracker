// Renderer audit — how does this scene compare to top-tier browser Three.js?
//
//   node scripts/audit-renderer.mjs
//
// WHAT THIS CAN AND CANNOT MEASURE HERE. Draw calls, triangle counts, texture
// memory, program counts and scene composition are STRUCTURE: they are the
// same number whether the machine is idle or at load 30, so they are safe to
// measure anywhere. Frame timing is not — this repo's own notes record fps
// numbers that measured the capture conditions rather than the build. So this
// script reports structure as fact and timing as ADVISORY ONLY, clearly
// labelled, and the verdict never rests on the timing.
//
// The comparison targets below are the ones that matter for a browser game on
// a mid-range phone, which is what this ships to. They are not console
// budgets and should not be read as such.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { chromiumGlArgs } from './lib/chromium-gl-args.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.RENDER_AUDIT_PORT || 5311);
const baseUrl = process.env.RENDER_AUDIT_URL || `http://127.0.0.1:${port}`;
const outputDir = path.join(root, 'tmp', 'renderer-audit');

// Budgets for a browser kart racer targeting mid-range phones at 60fps.
// `warn` is "worth knowing", `over` is "this is the thing costing you".
const BUDGETS = {
  gpuCalls: { over: 300, warn: 180, unit: 'draw calls/frame' },
  gpuTriangles: { over: 900000, warn: 500000, unit: 'triangles/frame' },
  programs: { over: 90, warn: 60, unit: 'shader programs' },
  textureBytes: { over: 220 * 1024 * 1024, warn: 120 * 1024 * 1024, unit: 'bytes of texture' },
  meshCount: { over: 900, warn: 500, unit: 'visible meshes' },
};

const TRACKS = ['comeback-city', 'penguin-village'];

const waitForServer = async (url, timeoutMs = 40000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  throw new Error(`server never came up at ${url}`);
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

const sampleTrack = async (browser, track) => {
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  // Turns on the opt-in deep breakdown in estimateSceneRenderStats.
  await page.addInitScript(() => {
    window.__kartRenderAudit = true;
  });
  const url = `${baseUrl}/?track=${track}&playableAutoplay=1`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
    timeout: 30000,
  });
  // Let the countdown warm-up finish — it links shaders and uploads textures
  // on purpose, so sampling before it ends measures a half-built scene.
  await page.waitForFunction(() => (window.__comebackCityKartTelemetry?.countdown ?? 9) <= 0, null, {
    timeout: 40000,
  });
  await page.waitForTimeout(1500);

  const samples = [];
  for (let i = 0; i < 24; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const sample = await page.evaluate(() => {
      const t = window.__comebackCityKartTelemetry || {};
      const stats = t.rendererStats || {};
      return {
        drawCalls: stats.drawCalls ?? null,
        frameElapsedMs: t.frameElapsedMs ?? null,
        frameWorkMs: t.frameWorkMs ?? null,
        geometries: stats.geometries ?? null,
        gpuCalls: stats.gpuCalls ?? null,
        gpuTriangles: stats.gpuTriangles ?? null,
        meshCount: stats.meshCount ?? null,
        postChainEnabled: t.postChainEnabled ?? null,
        programs: stats.programs ?? null,
        propCount: t.propCount ?? null,
        sceneTextures: stats.sceneTextures ?? null,
        shadowMapEnabled: stats.shadowMapEnabled ?? null,
        textureBytes: stats.textureBytes ?? null,
        textures: stats.textures ?? null,
        triangles: stats.triangles ?? null,
        breakdown: stats.breakdown ?? null,
      };
    });
    samples.push(sample);
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(250);
  }
  await page.close();

  const pick = (key) => median(samples.map((s) => s[key]).filter((v) => typeof v === 'number'));
  const last = samples[samples.length - 1];
  return {
    track,
    drawCallsEstimated: pick('drawCalls'),
    geometries: pick('geometries'),
    gpuCalls: pick('gpuCalls'),
    gpuTriangles: pick('gpuTriangles'),
    meshCount: pick('meshCount'),
    postChainEnabled: last.postChainEnabled,
    programs: pick('programs'),
    propCount: pick('propCount'),
    sceneTextures: pick('sceneTextures'),
    shadowMapEnabled: last.shadowMapEnabled,
    textureBytes: pick('textureBytes'),
    textures: pick('textures'),
    trianglesInGraph: pick('triangles'),
    breakdown: last.breakdown,
    // ADVISORY ONLY on a loaded machine. Reported, never judged.
    advisoryFrameElapsedMs: Number(pick('frameElapsedMs').toFixed(2)),
    advisoryFrameWorkMs: Number(pick('frameWorkMs').toFixed(2)),
  };
};

const verdictFor = (value, budget) => {
  if (typeof value !== 'number' || !budget) return 'n/a';
  if (value > budget.over) return 'OVER';
  if (value > budget.warn) return 'warn';
  return 'ok';
};

const run = async () => {
  await mkdir(outputDir, { recursive: true });
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = process.env.RENDER_AUDIT_URL
    ? null
    : spawn(npm, ['run', 'dev:kart', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
        cwd: root,
        stdio: 'ignore',
      });
  let browser = null;
  try {
    if (server) await waitForServer(baseUrl);
    browser = await chromium.launch({ args: chromiumGlArgs() });
    const results = [];
    for (const track of TRACKS) {
      // eslint-disable-next-line no-await-in-loop
      results.push(await sampleTrack(browser, track));
    }

    const lines = [];
    lines.push('RENDERER AUDIT — structural measurements (load-independent)');
    lines.push('');
    for (const result of results) {
      lines.push(`${result.track}`);
      lines.push(`  post chain      ${result.postChainEnabled ? 'ON' : 'off'}    shadow map ${result.shadowMapEnabled ? 'ON' : 'off'}`);
      const rows = [
        ['GPU draw calls/frame', result.gpuCalls, BUDGETS.gpuCalls],
        ['GPU triangles/frame', result.gpuTriangles, BUDGETS.gpuTriangles],
        ['visible meshes (graph)', result.meshCount, BUDGETS.meshCount],
        ['triangles in graph', result.trianglesInGraph, null],
        ['shader programs', result.programs, BUDGETS.programs],
        ['texture bytes', result.textureBytes, BUDGETS.textureBytes],
        ['unique scene textures', result.sceneTextures, null],
        ['renderer texture objects', result.textures, null],
        ['geometries', result.geometries, null],
        ['props mounted', result.propCount, null],
      ];
      rows.forEach(([label, value, budget]) => {
        const verdict = verdictFor(value, budget);
        const shown = label === 'texture bytes' ? `${(value / (1024 * 1024)).toFixed(1)} MiB` : String(value);
        lines.push(
          `  ${label.padEnd(26)} ${shown.padStart(12)}  ${budget ? `/ ${budget.over}` .padEnd(10): ''.padEnd(10)} ${verdict}`
        );
      });
      if (result.breakdown) {
        lines.push(`  meshes per geometry        ${String(result.breakdown.meshesPerGeometry).padStart(12)}   (1.0 = nothing shared or instanced)`);
        lines.push(`  meshes per material        ${String(result.breakdown.meshesPerMaterial).padStart(12)}   (${result.breakdown.uniqueMaterials} unique materials)`);
        lines.push('  heaviest groups by triangles:');
        result.breakdown.topByTriangles.forEach((entry) => {
          lines.push(`    ${entry.name.slice(0, 30).padEnd(31)} x${String(entry.count).padStart(4)}  ${String(entry.triangles).padStart(9)} tris`);
        });
      }
      lines.push(
        `  [advisory, NOT a verdict — this machine is loaded] frame ${result.advisoryFrameElapsedMs}ms elapsed, ${result.advisoryFrameWorkMs}ms work`
      );
      lines.push('');
    }

    const report = { budgets: BUDGETS, capturedAt: new Date().toISOString(), results };
    await writeFile(path.join(outputDir, 'renderer-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${lines.join('\n')}\n`);
    process.stdout.write(`full report: tmp/renderer-audit/renderer-audit.json\n`);
  } catch (error) {
    process.stderr.write(`FAIL: ${error.message}\n`);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    server?.kill('SIGTERM');
  }
};

run();
