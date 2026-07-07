// B2 moments lab: renders Penguin Village under candidate per-lap
// palette-moment SETS and writes one capture per authored lap moment
// (telemetry routeProgress 0.05 / 0.30 / 0.55 / 0.84 — never wall-clock),
// plus a SEAM PAIR (routeProgress 0.96, then 0.06 on the next lap): the
// wrap segment must land back on the 0.02 anchor, so the two seam tiles of
// every candidate should read as the same atmosphere — any visible pop is
// a failed candidate regardless of how good its mid-lap moments look.
// Overrides ride ?momentsLab=1 + window.__momentsLabOverrides (dev-only
// hook in ComebackCityThreeKartRace.jsx, same pattern as ?rimLab); the
// shipped default is moment-LESS everywhere, and V0 forces ?momentsLab=0
// so it stays the valid control even after a pick lands as
// palette.moments.
// LAB LESSONS (B1, encoded below): hemi moment colors are LUMA-NORMALIZED
// to the V8 base at capture time (normalizeMoments) — raising hemi
// luminance pushes the white snow past the bloom threshold (1.0) and the
// frame cascades to white-out; candidates vary HUE, never brightness. Fog
// stays pale/milky (scene.background is fog-exempt; dark fog barely reads
// on white geometry) and fog.far <= 840 (camera far 860 no-ops beyond —
// resolveMoments clamps, but author sane values anyway). Every set anchors
// moment 0.02 at the V8 base so the lap wrap has no color pop, and the
// owner-picked V6 "ice white" hero-rim tint is deliberately NOT a moment
// channel in any candidate (rimTint stays constant; `rim` below drives the
// rimLight DirectionalLight only).
// HARD RULE: never run concurrently with another vite-spawning suite
// (dep-cache ping-pong + CPU contention = phantom knife-edge failures).
// Output: tmp/m2-moments-lab/penguin-village-<key>-p0p05|p0p30|p0p55|p0p84
// |seam-out|seam-in.png, capture-telemetry.json, moments-lab.html at repo
// root. Captions print the NORMALIZED values — a landed pick copies those
// literals into penguinVillage.js palette.moments verbatim.
// Regen: node tmp/m2-moments-lab/capture-moments-variants.mjs
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const PORT = 5315; // 5195 phase5 / 5197 b4-post / 5304 portraits / 5313 palette / 5314 rim

const TRACK = 'penguin-village';
// The four authored lap moments (progress keys the candidates share) plus
// the seam pair. 0.05 stands in for the 0.02 anchor — autoplay spawns at
// ~0.03, so 0.02 is already behind the kart on lap 1.
const MOMENT_SHOTS = [
  { key: 'p0p05', label: 'main street (anchor 0.02)', progress: 0.05 },
  { key: 'p0p30', label: 'pond sweep (0.30)', progress: 0.3 },
  { key: 'p0p55', label: 'market row (0.55)', progress: 0.55 },
  { key: 'p0p84', label: 'return bend (0.84)', progress: 0.84 },
];

// V8 "storm front" base (landed B1 values) — anchor + luma reference.
const BASE_HEMI = { sky: '#689bb8', ground: '#0f273f' };

// Candidate moment SETS. `overrides: null` = moments OFF (?momentsLab=0
// control — the shipped look). Each set anchors 0.02 at the V8 base ({} =
// every field fills from the palette) and returns near it by 0.84 so the
// wrap segment stays gentle. All hemi values below are authored as HUE
// choices and pass through normalizeMoments before captioning/capture.
const VARIANTS = [
  { key: 'v0-off', label: 'V0 — no moments (shipped default, control)', overrides: null },
  {
    key: 'v1-subtle',
    label: 'V1 — subtle drift: the lap breathes, nobody could say where it changed',
    overrides: [
      { progress: 0.02 },
      {
        progress: 0.3,
        fog: { color: '#52707f', far: 740 },
        hemi: { sky: '#63a4bb', ground: '#0f283b' },
        sun: { color: '#e2cba8' },
      },
      {
        progress: 0.55,
        fog: { color: '#5a6675', near: 160 },
        hemi: { sky: '#7291ab', ground: '#152338' },
        sun: { color: '#efc08e', intensity: 2.7 },
      },
      {
        progress: 0.84,
        fog: { color: '#465e74', near: 135 },
        hemi: { sky: '#6090c0', ground: '#0e2138' },
        sun: { color: '#dfc4a4', intensity: 2.45 },
        rim: '#18dcff',
      },
    ],
  },
  {
    key: 'v2-journey',
    label: 'V2 — journey: the execution-plan intent — open pond, lantern market, dusk return',
    overrides: [
      { progress: 0.02 },
      {
        progress: 0.3,
        fog: { color: '#5d8290', near: 170, far: 800 },
        hemi: { sky: '#5aa8c4', ground: '#0f2b3d' },
        sun: { color: '#dccfb2' },
        rim: '#00e5ff',
      },
      {
        progress: 0.55,
        fog: { color: '#5f6472', near: 140 },
        hemi: { sky: '#7e93ae', ground: '#1f2436' },
        sun: { color: '#f2b579', intensity: 2.85 },
        rim: '#22c9e8',
      },
      {
        progress: 0.84,
        fog: { color: '#3f566e', near: 122, far: 640 },
        hemi: { sky: '#5c86ba', ground: '#0d2036' },
        sun: { color: '#d8b795', intensity: 2.3 },
        rim: '#2be2ff',
      },
    ],
  },
  {
    key: 'v3-dramatic',
    label: 'V3 — dramatic swing: strong hue turns + bloom moments (pond glare, market ember, aurora return)',
    overrides: [
      { progress: 0.02 },
      {
        progress: 0.3,
        fog: { color: '#6e93a0', near: 185, far: 830 },
        hemi: { sky: '#48b2d4', ground: '#0e3145' },
        sun: { color: '#cfd3c0' },
        rim: '#00f2ff',
        bloom: 1.08,
      },
      {
        progress: 0.55,
        fog: { color: '#6d6470', near: 132 },
        hemi: { sky: '#8d8aa0', ground: '#2a1e3a' },
        sun: { color: '#f7a75e', intensity: 3 },
        rim: '#3ab8d8',
        bloom: 0.92,
      },
      {
        progress: 0.84,
        fog: { color: '#35506b', near: 112, far: 620 },
        hemi: { sky: '#4a7fc0', ground: '#0a1c34' },
        sun: { color: '#c9a98c', intensity: 2.15 },
        rim: '#40eaff',
        bloom: 1.12,
      },
    ],
  },
];

// Luma normalization (copied from tmp/m2-palette-lab/capture-palette-variants.mjs
// — the B1 white-out lesson): rescale each hemi hue so its Rec.709 luma
// matches the V8 base, then caption the normalized values so the landed
// pick copies what was actually captured.
const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgbToHex = (rgb) =>
  `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;
const luma = (rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
const matchLuma = (hex, referenceHex) => {
  const rgb = hexToRgb(hex);
  const scale = luma(hexToRgb(referenceHex)) / Math.max(1, luma(rgb));
  return rgbToHex(rgb.map((v) => v * scale));
};
const normalizeMoments = (moments) =>
  moments?.map((moment) =>
    moment.hemi
      ? {
          ...moment,
          hemi: {
            ...moment.hemi,
            sky: matchLuma(moment.hemi.sky, BASE_HEMI.sky),
            ground: matchLuma(moment.hemi.ground, BASE_HEMI.ground),
          },
        }
      : moment
  ) ?? null;

const waitForServer = async () => {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/`);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('vite dev not ready');
};

// One page session per variant: autoplay a lap, screenshot at each moment
// progress, then bracket the wrap seam (0.96 this lap, 0.06 next lap).
const captureVariant = async (browser, variant) => {
  const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleErrors.push(`[${message.type()}] ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => consoleErrors.push(`[pageerror] ${error.message}`));
  const normalized = normalizeMoments(variant.overrides);
  if (normalized) {
    await page.addInitScript((moments) => {
      window.__momentsLabOverrides = moments;
    }, normalized);
  }
  const momentsQuery = normalized ? '&momentsLab=1' : '&momentsLab=0';
  await page.goto(`http://127.0.0.1:${PORT}/?playableAutoplay=1&track=${TRACK}${momentsQuery}#race`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
    timeout: 30000,
  });
  const readTelemetry = () =>
    page.evaluate(() => {
      const t = window.__comebackCityKartTelemetry;
      return {
        bakedBuildings: t.bakedBuildings,
        fpsEstimate: t.fpsEstimate,
        frameWorkMs: t.frameWorkMs,
        lap: t.lap,
        paletteMomentsEnabled: t.paletteMomentsEnabled,
        postChainEnabled: t.postChainEnabled,
        routeProgress: t.routeProgress,
      };
    });
  const shots = [];
  const shoot = async (shotKey, telemetry) => {
    const file = `${TRACK}-${variant.key}-${shotKey}.png`;
    await page.screenshot({ path: path.join(__dirname, file) });
    shots.push({ shotKey, telemetry });
    console.log(
      `captured ${file} (routeProgress=${telemetry.routeProgress}, moments=${telemetry.paletteMomentsEnabled}, workMs=${telemetry.frameWorkMs?.toFixed?.(2) ?? telemetry.frameWorkMs})`
    );
  };
  for (const shot of MOMENT_SHOTS) {
    await page.waitForFunction(
      (target) => (window.__comebackCityKartTelemetry?.routeProgress || 0) >= target,
      shot.progress,
      { timeout: 120000 }
    );
    const telemetry = await readTelemetry();
    // Fail-loud gate: the hook must actually be live (or actually off for
    // the control) — a silently-inert override produces plausible tiles of
    // the wrong thing, the worst lab failure mode.
    const expectMoments = Boolean(normalized);
    if (telemetry.paletteMomentsEnabled !== expectMoments) {
      throw new Error(
        `${variant.key}/${shot.key}: paletteMomentsEnabled=${telemetry.paletteMomentsEnabled}, expected ${expectMoments}`
      );
    }
    // Shipped default since the 2026-07-06 §9 supersession: post chain ON
    // (tiles committed before the flip were captured post-off; a regen
    // reflects the new shipped look).
    if (telemetry.postChainEnabled !== true) {
      throw new Error(`${variant.key}/${shot.key}: postChainEnabled=${telemetry.postChainEnabled}, expected true`);
    }
    await shoot(shot.key, telemetry);
  }
  // Seam pair: 0.96 on this lap, then 0.06 after the wrap. The second wait
  // requires BOTH bounds so it cannot fire while we are still at 0.96+.
  await page.waitForFunction(() => (window.__comebackCityKartTelemetry?.routeProgress || 0) >= 0.96, null, {
    timeout: 120000,
  });
  await shoot('seam-out', await readTelemetry());
  await page.waitForFunction(
    () => {
      const progress = window.__comebackCityKartTelemetry?.routeProgress || 0;
      return progress >= 0.06 && progress < 0.5;
    },
    null,
    { timeout: 120000 }
  );
  await shoot('seam-in', await readTelemetry());
  await page.close();
  // A broken lerp surfaces as a WebGL/shader console error before it
  // surfaces visually — fail the whole run loudly, never ship blind tiles.
  // (The Chromium "GPU stall due to ReadPixels" screenshot-readback warning
  // is benign and stays non-fatal.)
  const shaderErrors = consoleErrors.filter(
    (line) => !line.startsWith('[warning]') && /shader|webgl|glsl|program/i.test(line)
  );
  if (shaderErrors.length) {
    throw new Error(`${variant.key}: shader/WebGL console errors:\n${shaderErrors.join('\n')}`);
  }
  return { consoleErrors, normalized, shots, variantKey: variant.key };
};

const escapeHtml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const tile = (variant, shotKey, caption) => `      <figure>
        <img src="/tmp/m2-moments-lab/${TRACK}-${variant.key}-${shotKey}.png" alt="${escapeHtml(variant.label)} — ${escapeHtml(caption)}" loading="lazy" />
        <figcaption>${escapeHtml(caption)}</figcaption>
      </figure>`;

const buildLabHtml = (results) => {
  const sections = VARIANTS.map((variant) => {
    const result = results.find((entry) => entry.variantKey === variant.key);
    const values = result?.normalized
      ? escapeHtml(JSON.stringify(result.normalized))
      : 'no moments (shipped default)';
    return `    <section>
      <h2>${escapeHtml(variant.label)}</h2>
      <div class="grid">
${MOMENT_SHOTS.map((shot) => tile(variant, shot.key, shot.label)).join('\n')}
${tile(variant, 'seam-out', 'seam pair A — routeProgress 0.96')}
${tile(variant, 'seam-in', 'seam pair B — routeProgress 0.06 (next lap; must match pair A)')}
      </div>
      <code>${values}</code>
    </section>`;
  }).join('\n');
  return `<!-- B2 moments lab: per-lap palette-moment candidate sets on Penguin Village,
     captured at telemetry routeProgress 0.05/0.30/0.55/0.84 + the lap-wrap seam pair.
     Regen: node tmp/m2-moments-lab/capture-moments-variants.mjs -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Moments Lab — per-lap palette moments (B2)</title>
<style>
body { margin: 0; padding: 20px; background: #0c1020; color: #dfe8ff; font: 14px/1.5 -apple-system, sans-serif; }
h1 { font-size: 18px; }
h2 { font-size: 15px; margin-top: 28px; }
p.hint { color: #93a3c8; max-width: 72ch; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(430px, 1fr)); gap: 18px; }
figure { margin: 0; background: #131a30; border: 1px solid #2a3450; border-radius: 8px; overflow: hidden; }
img { width: 100%; display: block; }
figcaption { padding: 10px 12px; }
code { display: block; margin-top: 10px; font-size: 10px; color: #7f90b8; word-break: break-all; }
</style>
</head>
<body>
  <h1>Moments lab — B2 per-lap palette moments (Penguin Village)</h1>
  <p class="hint">Each row is one candidate SET: the same autoplay lap sampled at the four authored
  road sections (main street / pond sweep / market row / return bend), plus a seam pair either side
  of the finish line — the two seam tiles must read as the SAME atmosphere (any pop = that set
  fails, whatever its mid-lap looks like). V0 is today's shipped look: one fixed atmosphere all
  lap. Judge whether the lap reads as a journey — and that no tile drifts toward white-out on the
  snow. Pick a set, or name a blend (e.g. "V2 with V1's market"). The pick lands as
  penguinVillage.js palette.moments (values printed under each row are the exact literals);
  Comeback City is untouched either way, and until a pick lands the game ships with NO moments.</p>
${sections}
</body>
</html>
`;
};

const run = async () => {
  const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  });
  let browser = null;
  const results = [];
  try {
    await waitForServer();
    browser = await chromium.launch();
    for (const variant of VARIANTS) {
      results.push(await captureVariant(browser, variant));
    }
    await writeFile(path.join(__dirname, 'capture-telemetry.json'), `${JSON.stringify(results, null, 2)}\n`);
    await writeFile(path.join(root, 'moments-lab.html'), buildLabHtml(results));
    console.log('moments-lab.html written at repo root');
  } finally {
    await browser?.close();
    server.kill();
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
