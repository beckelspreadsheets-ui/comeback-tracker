/**
 * B4 post-chain A/B captures — step-1 parity pairs (default three-examples
 * chain vs ?post=1 pmndrs chain, vignette OFF) on BOTH tracks, plus SMAA
 * edge crops and the step-2 vignette on/off pair (its own owner gate).
 *
 * Captures run against the PRODUCTION build via vite preview (run
 * `npm run build` first) — parity is judged on the shipped pipeline, and
 * SMAA is evaluated at the A3-landed 0.85 render scale (Amendment 6), not
 * the old 0.58. Screenshots are keyed on telemetry routeProgress (0.30,
 * pond sweep / mid-lap), never wall-clock.
 *
 * Regen: npm run build && node tmp/m2-b4-post-chain/capture-post-ab.mjs
 * HARD RULE: never run concurrently with another vite-spawning suite.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const PORT = 5197;
const BASE = `http://127.0.0.1:${PORT}`;
// Crop rect with road edge + rail content at p0.30 on a 1440x900 chase cam —
// the left neon rail/curb diagonals, where edge crawl reads most clearly.
const CROP = { x: 40, y: 560, width: 480, height: 270 };

// Vignette defaults ON inside ?post=1 since the 2026-07-06 gate-2 approval;
// the parity shots pin it OFF so regen reproduces the as-approved gate-1
// evidence, and the vignette shot pins it ON explicitly.
const SHOTS = [
  { key: 'comeback-city-default', track: 'comeback-city', query: '', crop: true },
  { key: 'comeback-city-post', track: 'comeback-city', query: '&post=1&postVignette=0', crop: true },
  { key: 'penguin-village-default', track: 'penguin-village', query: '', crop: true },
  { key: 'penguin-village-post', track: 'penguin-village', query: '&post=1&postVignette=0', crop: true },
  { key: 'comeback-city-post-vignette', track: 'comeback-city', query: '&post=1&postVignette=1', crop: false },
];

const waitForServer = async (url, timeoutMs = 30000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error('vite preview not ready');
};

await mkdir(__dirname, { recursive: true });
const server = spawn(
  'npm',
  ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
  { cwd: root, stdio: 'ignore' }
);
const telemetryByKey = {};
try {
  await waitForServer(`${BASE}/`);
  const browser = await chromium.launch();
  for (const shot of SHOTS) {
    const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await page.goto(`${BASE}/?playableAutoplay=1&track=${shot.track}${shot.query}#race`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(
      () => window.__comebackCityKartTelemetry?.renderer === 'three-kart',
      null,
      { timeout: 30000 }
    );
    await page.waitForFunction(
      () => (window.__comebackCityKartTelemetry?.routeProgress || 0) >= 0.3,
      null,
      { timeout: 120000 }
    );
    const telemetry = await page.evaluate(() => {
      const t = window.__comebackCityKartTelemetry;
      return {
        postChainEnabled: t.postChainEnabled,
        frameWorkMs: t.frameWorkMs,
        drawCalls: t.rendererStats?.drawCalls ?? null,
        routeProgress: t.routeProgress,
        bakedBuildings: t.bakedBuildings,
      };
    });
    const expectedPost = shot.query.includes('post=1');
    if (telemetry.postChainEnabled !== expectedPost) {
      throw new Error(`${shot.key}: telemetry postChainEnabled=${telemetry.postChainEnabled}, expected ${expectedPost}`);
    }
    telemetryByKey[shot.key] = { ...telemetry, consoleErrors };
    await page.screenshot({ path: path.join(__dirname, `${shot.key}-p0p30.png`) });
    if (shot.crop) {
      await page.screenshot({ path: path.join(__dirname, `${shot.key}-crop.png`), clip: CROP });
    }
    await page.close();
    if (consoleErrors.length) {
      console.warn(`${shot.key}: ${consoleErrors.length} console error(s):`, consoleErrors.slice(0, 3));
    }
    console.log('captured', shot.key, JSON.stringify(telemetry));
  }
  await browser.close();

  const pair = (title, leftKey, leftLabel, rightKey, rightLabel, note, suffix = 'p0p30') => `
    <section>
      <h2>${title}</h2>
      <p class="hint">${note}</p>
      <div class="pair">
        <figure><img src="/tmp/m2-b4-post-chain/${leftKey}-${suffix}.png" loading="lazy" /><figcaption>${leftLabel}</figcaption></figure>
        <figure><img src="/tmp/m2-b4-post-chain/${rightKey}-${suffix}.png" loading="lazy" /><figcaption>${rightLabel}</figcaption></figure>
      </div>
    </section>`;

  const html = `<!doctype html>
<!-- B4 post-chain lab: step-1 parity pairs + SMAA crops + step-2 vignette gate.
     Regen: npm run build && node tmp/m2-b4-post-chain/capture-post-ab.mjs -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Post Lab — pmndrs chain B4</title>
    <style>
      body { margin: 0; padding: 20px; background: #0c1020; color: #dfe8ff; font: 14px/1.5 -apple-system, sans-serif; }
      h1 { font-size: 18px; } h2 { font-size: 15px; margin: 28px 0 4px; }
      p.hint { color: #93a3c8; max-width: 80ch; margin-top: 2px; }
      .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      figure { margin: 0; background: #131a30; border: 1px solid #2a3450; border-radius: 8px; overflow: hidden; }
      img { width: 100%; display: block; image-rendering: auto; }
      .crops img { image-rendering: pixelated; }
      figcaption { padding: 8px 10px; font-size: 13px; }
      code { color: #8fd8a8; }
    </style>
  </head>
  <body>
    <h1>Post Lab — B4 pmndrs chain (<code>?post=1</code>)</h1>
    <p class="hint">Production build, both tracks, captured at routeProgress 0.30. The pmndrs chain
    replaces UnrealBloomPass with mipmap bloom and adds SMAA + ACES in one merged pass; it ships
    behind <code>?post=1</code> until you sign the post-ban supersession at the M2 benchmark review.
    GATE 1 (parity): left/right should read near-identical — same neon glow, no washout, no crush.
    GATE 2 (vignette): separate on/off call at the bottom. Effect toggles for the benchmark review:
    <code>&postBloom=0 &postSmaa=0 &postTone=0 &postVignette=1</code>.</p>
${pair('Comeback City — parity', 'comeback-city-default', 'CURRENT: three-examples UnrealBloom', 'comeback-city-post', 'B4: pmndrs bloom + SMAA + ACES', 'Judge the neon glow on signs/rails and overall exposure.')}
${pair('Penguin Village — parity', 'penguin-village-default', 'CURRENT: three-examples UnrealBloom', 'penguin-village-post', 'B4: pmndrs bloom + SMAA + ACES', 'KNOWN DIFFERENCE, your call: the legacy chain ran bloom on a 30%-resolution target, which oversizes its halos — that is where the CURRENT frame&apos;s big soft glow on the peak/snowbanks comes from. The pmndrs mipmap bloom is resolution-independent; radius 0.7 + soft knee 0.22 is as close as it gets without overglowing the neon. The tighter snow highlights also align with the B1 lab lesson (snow past the bloom threshold cascades to white-out). If you want MORE halo back, say so — intensity is one number.')}
    <div class="crops">
${pair('SMAA — edge crops (Comeback City)', 'comeback-city-default', 'no AA (composer kills MSAA)', 'comeback-city-post', 'SMAA MEDIUM', 'Zoomed road-edge/rail crop at the A3 0.85 render scale — look for stair-stepping on the rails.', 'crop')}
${pair('SMAA — edge crops (Penguin Village)', 'penguin-village-default', 'no AA', 'penguin-village-post', 'SMAA MEDIUM', 'Same crop rect, arctic track.', 'crop')}
    </div>
${pair('GATE 2 — Vignette on/off (separate approval)', 'comeback-city-post', 'post chain, vignette OFF (ships this way)', 'comeback-city-post-vignette', 'post chain + vignette (offset 0.32, darkness 0.45)', 'One-variable pair: both sides are the pmndrs chain; only the vignette differs.')}
    <script>document.title = 'Post Lab — pmndrs chain B4';</script>
  </body>
</html>`;
  await writeFile(path.join(root, 'post-lab.html'), html);
  await writeFile(path.join(__dirname, 'capture-telemetry.json'), JSON.stringify(telemetryByKey, null, 2));
  console.log('wrote post-lab.html + capture-telemetry.json');
} finally {
  server.kill();
}
