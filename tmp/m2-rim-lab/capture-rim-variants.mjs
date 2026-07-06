// B3 rim lab: renders BOTH tracks under candidate fresnel-rim value sets
// (strength / power / tint) and writes one chase-cam capture per candidate
// keyed on telemetry routeProgress ~0.30 (never wall-clock), plus a kart
// close-up crop per shot — the rim is judged on the player kart/driver
// silhouette, so the crop is the primary gate tile.
// Overrides ride ?rimLab=1 + window.__rimLabOverrides (dev-only hook next
// to createToonMaterial in ComebackCityThreeKartRace.jsx); shipped defaults
// are untouched — V0 control has no rimLab param at all, so it IS the
// shipped look.
// Two bonus tiles capture the mid candidate under ?post=1 (B4 pmndrs chain)
// as an interplay reference — the rim adds outgoingLight, so bloom picks up
// bright edges; the owner gate is judged on the DEFAULT-chain tiles, and the
// interplay shots are visual-only (excluded from the program-sharing guard —
// the pmndrs chain has its own program population).
// LAB LESSON (B1, applies here too): candidates vary the rim term only —
// never whole-frame luminance; pushing bright surfaces past the bloom
// threshold cascades to white-out. Rim strengths stay <= 0.55 additive on
// edge pixels only.
// HARD RULE: never run concurrently with another vite-spawning suite
// (dep-cache ping-pong + CPU contention = phantom knife-edge failures).
// Output: tmp/m2-rim-lab/<track>-<key>-p0p30.png (+ -crop.png),
// capture-telemetry.json, and rim-lab.html at repo root.
// Regen: node tmp/m2-rim-lab/capture-rim-variants.mjs
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const PORT = 5314; // 5195 phase5 / 5197 b4-post / 5304 portraits / 5313 palette

const TRACKS = ['comeback-city', 'penguin-village'];

// Kart close-up region in the 1440x900 chase cam: frames the player kart +
// driver + the nearest rivals at routeProgress 0.30 (probe-verified — B4's
// SMAA crop region {40,560} shows only road/curb and is wrong for rim).
const CROP = { height: 270, width: 480, x: 560, y: 330 };

// Candidate looks. `overrides: null` = rim OFF (current shipped default,
// the control). tint null = the per-track palette rimLightColor (Penguin
// Village '#00d5ff', Comeback City fallback '#4fd8ff'); otherwise a
// per-track hex map so each track keeps a tint that belongs to its dusk.
const VARIANTS = [
  // V0 forces the rim OFF via ?rimLab=0 — since the V6 pick landed, Penguin
  // Village SHIPS rim-on, so "no param" is no longer the off-control there.
  { key: 'v0-off', label: 'V0 — rim OFF (control)', overrides: null },
  { key: 'v1-whisper', label: 'V1 — whisper: subtle edge, tight falloff', overrides: { power: 3.2, strength: 0.22 } },
  { key: 'v2-plan-default', label: 'V2 — plan default: the execution-plan starting values', overrides: { power: 2.6, strength: 0.32 } },
  { key: 'v3-bold', label: 'V3 — bold: stronger, wider edge', overrides: { power: 2.2, strength: 0.45 } },
  { key: 'v4-halo-tight', label: 'V4 — tight halo: brightest rim squeezed onto the last pixels of the silhouette', overrides: { power: 4.5, strength: 0.55 } },
  { key: 'v5-sheen-wide', label: 'V5 — wide sheen: soft broad wrap, almost a second fill', overrides: { power: 1.7, strength: 0.24 } },
  {
    key: 'v6-ice-white',
    label: 'V6 — V2 strength, neutral ice-white tint (reads as backlight, not neon)',
    overrides: { power: 2.6, strength: 0.32, tint: { 'comeback-city': '#eaf6ff', 'penguin-village': '#eaf6ff' } },
  },
  {
    key: 'v7-electric',
    label: 'V7 — hotter, per-track electric tint (CC violet neon / PV aurora teal)',
    overrides: { power: 2.8, strength: 0.38, tint: { 'comeback-city': '#7c5cff', 'penguin-village': '#00ffd5' } },
  },
];

const INTERPLAY = {
  key: 'v2-post',
  label: 'V2 under ?post=1 (B4 pmndrs chain) — interplay reference, not a gate tile',
  overrides: { power: 2.6, strength: 0.32 },
};

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

const captureShot = async (browser, { track, variant, extraQuery = '' }) => {
  const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleErrors.push(`[${message.type()}] ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => consoleErrors.push(`[pageerror] ${error.message}`));
  if (variant.overrides) {
    await page.addInitScript(
      (overrides) => {
        window.__rimLabOverrides = overrides;
      },
      {
        power: variant.overrides.power,
        strength: variant.overrides.strength,
        tint: variant.overrides.tint ? variant.overrides.tint[track] : null,
      }
    );
  }
  const rimQuery = variant.overrides ? '&rimLab=1' : '&rimLab=0';
  await page.goto(`http://127.0.0.1:${PORT}/?playableAutoplay=1&track=${track}${rimQuery}${extraQuery}#race`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
    timeout: 30000,
  });
  await page.waitForFunction(() => (window.__comebackCityKartTelemetry?.routeProgress || 0) >= 0.3, null, {
    timeout: 120000,
  });
  const telemetry = await page.evaluate(() => {
    const t = window.__comebackCityKartTelemetry;
    return {
      bakedBuildings: t.bakedBuildings,
      drawCalls: t.rendererStats?.drawCalls ?? null,
      fpsEstimate: t.fpsEstimate,
      postChainEnabled: t.postChainEnabled,
      programs: t.rendererStats?.programs ?? null,
      routeProgress: t.routeProgress,
    };
  });
  const expectPost = extraQuery.includes('post=1');
  if (telemetry.postChainEnabled !== expectPost) {
    throw new Error(`${track}/${variant.key}: postChainEnabled=${telemetry.postChainEnabled}, expected ${expectPost}`);
  }
  if (telemetry.programs == null) {
    // The program-sharing acceptance check below cannot default missing
    // evidence to a passing value — fail the run instead.
    throw new Error(`${track}/${variant.key}: telemetry.programs is null — program-sharing acceptance cannot be measured`);
  }
  const base = `${track}-${variant.key}`;
  await page.screenshot({ path: path.join(__dirname, `${base}-p0p30.png`) });
  await page.screenshot({ clip: CROP, path: path.join(__dirname, `${base}-crop.png`) });
  await page.close();
  // A broken injection surfaces as a WebGL program/link error before it
  // surfaces visually — fail the whole run loudly, never ship blind tiles.
  // Warnings stay recorded but non-fatal: Chromium logs a benign "GPU stall
  // due to ReadPixels" performance warning for the screenshot readback
  // itself (fires on the rim-OFF control too).
  const shaderErrors = consoleErrors.filter(
    (line) => !line.startsWith('[warning]') && /shader|webgl|glsl|program/i.test(line)
  );
  if (shaderErrors.length) {
    throw new Error(`${track}/${variant.key}: shader/WebGL console errors:\n${shaderErrors.join('\n')}`);
  }
  return { base, consoleErrors, telemetry, track, variantKey: variant.key };
};

const escapeHtml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const tile = (shot, variant) => `      <figure>
        <img class="crop" src="/tmp/m2-rim-lab/${shot}-crop.png" alt="${escapeHtml(variant.label)} — kart close-up" loading="lazy" />
        <img src="/tmp/m2-rim-lab/${shot}-p0p30.png" alt="${escapeHtml(variant.label)} — full frame" loading="lazy" />
        <figcaption><strong>${escapeHtml(variant.key.split('-')[0].toUpperCase())}</strong> — ${escapeHtml(variant.label.replace(/^V\d+ — /, ''))}<br />
        <code>${variant.overrides ? escapeHtml(JSON.stringify(variant.overrides)) : 'no rim (shipped default)'}</code></figcaption>
      </figure>`;

const buildLabHtml = () => {
  const trackSection = (track, title, blurb) => `    <section>
      <h2>${title}</h2>
      <p class="hint">${blurb}</p>
      <div class="grid">
${VARIANTS.map((variant) => tile(`${track}-${variant.key}`, variant)).join('\n')}
      </div>
    </section>`;
  return `<!-- B3 rim lab: hero fresnel-rim candidates on both tracks at routeProgress 0.30.
     Regen: node tmp/m2-rim-lab/capture-rim-variants.mjs -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Rim Lab — hero fresnel rim (B3)</title>
<style>
body { margin: 0; padding: 20px; background: #0c1020; color: #dfe8ff; font: 14px/1.5 -apple-system, sans-serif; }
h1 { font-size: 18px; }
h2 { font-size: 15px; margin-top: 28px; }
p.hint { color: #93a3c8; max-width: 72ch; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(430px, 1fr)); gap: 18px; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
figure { margin: 0; background: #131a30; border: 1px solid #2a3450; border-radius: 8px; overflow: hidden; }
img { width: 100%; display: block; }
img.crop { border-bottom: 1px solid #2a3450; }
figcaption { padding: 10px 12px; }
code { display: block; margin-top: 6px; font-size: 10px; color: #7f90b8; word-break: break-all; }
</style>
</head>
<body>
  <h1>Rim lab — B3 hero fresnel rim (karts / drivers / marchers / item boxes)</h1>
  <p class="hint">Every tile is the same autoplay moment (telemetry routeProgress 0.30). Top image =
  kart close-up crop (judge the rim here — it should lift the kart and driver off the dark road
  without reading as an outline sticker); bottom = full frame (scenery must stay untouched — the rim
  is hero-only). V0 is today's shipped look. Pick a number, or name a blend (e.g. "V2 strength with
  V6's tint"). The pick lands as the shipped default; until then the game is unchanged.</p>
${trackSection('comeback-city', 'Comeback City — neon dusk (palette tint #4fd8ff unless the candidate overrides it)', 'Cyan rim against the purple dusk. Watch the kart hood and the driver head/shoulders.')}
${trackSection('penguin-village', 'Penguin Village — storm front (palette tint #00d5ff unless the candidate overrides it)', 'Ice-cyan rim against the grey-blue haze. Snow is bright — the rim has to read on edges, not add glow to faces.')}
    <section>
      <h2>Interplay reference — V2 under the B4 post chain (?post=1)</h2>
      <p class="hint">Not a gate tile. Shows how the picked rim will behave if the post-ban
      supersession signs at the M2 benchmark review (bloom picks up the brightest rim pixels).</p>
      <div class="pair">
${TRACKS.map(
    (track) => `        <figure>
          <img class="crop" src="/tmp/m2-rim-lab/${track}-v2-post-crop.png" alt="${track} V2 under post chain — close-up" loading="lazy" />
          <img src="/tmp/m2-rim-lab/${track}-v2-post-p0p30.png" alt="${track} V2 under post chain" loading="lazy" />
          <figcaption><strong>${track}</strong> — V2 + ?post=1<br /><code>${escapeHtml(JSON.stringify(INTERPLAY.overrides))}</code></figcaption>
        </figure>`
  ).join('\n')}
      </div>
    </section>
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
    for (const track of TRACKS) {
      for (const variant of VARIANTS) {
        const shot = await captureShot(browser, { track, variant });
        results.push(shot);
        console.log(`captured ${shot.base} (programs=${shot.telemetry.programs}, routeProgress=${shot.telemetry.routeProgress})`);
      }
      const interplay = await captureShot(browser, { extraQuery: '&post=1', track, variant: INTERPLAY });
      results.push(interplay);
      console.log(`captured ${interplay.base} (post chain interplay)`);
    }
    // B3 acceptance: rimmed materials share ONE program per shader
    // permutation (merged customProgramCacheKey), never one per material.
    // Measured reality: delta 0 — every toon+map material in the scene is
    // a hero material, so the rim variant REPLACES the plain-toon program
    // one-for-one. The v2-post interplay shot is visual-only and excluded:
    // the pmndrs chain has its own program population (22 vs 25), so it
    // would poison the default-chain delta in either direction.
    for (const track of TRACKS) {
      const control = results.find((entry) => entry.track === track && entry.variantKey === 'v0-off');
      if (!control) throw new Error(`${track}: no v0-off control shot — delta has no baseline`);
      const rimmed = results.filter(
        (entry) => entry.track === track && entry.variantKey !== 'v0-off' && entry.variantKey !== INTERPLAY.key
      );
      const maxPrograms = Math.max(...rimmed.map((entry) => entry.telemetry.programs));
      const delta = maxPrograms - control.telemetry.programs;
      console.log(`${track}: programs control=${control.telemetry.programs} rim-max=${maxPrograms} delta=${delta}`);
      if (delta > 2) {
        throw new Error(
          `${track}: rim changed shared-program count by +${delta} — expected 0 (rim variants replace the hero plain-toon programs one-for-one), at most +2 (map/no-map split); program sharing is broken`
        );
      }
    }
    await writeFile(path.join(__dirname, 'capture-telemetry.json'), `${JSON.stringify(results, null, 2)}\n`);
    await writeFile(path.join(root, 'rim-lab.html'), buildLabHtml());
    console.log('rim-lab.html written at repo root');
  } finally {
    await browser?.close();
    server.kill();
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
