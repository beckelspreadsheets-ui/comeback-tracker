// M3 world captures (Ordinals rebuild): one frame per district beat, an
// effects-off racing-line legibility frame, and a top-down overview.
// Progress-targeted via telemetry so every shot is what it claims to be.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.M3_CAPTURE_PORT || 5301);
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = path.join(root, 'tmp', 'm3-districts');

const SHOTS = [
  { key: 'launch-straight', progress: 0.05 },
  { key: 'opening-sweep', progress: 0.3 },
  { key: 'wharf-switchbacks', progress: 0.48 },
  { key: 'wharf-boardwalk', progress: 0.58 },
  { key: 'mesa-arch', progress: 0.7 },
  { key: 'mesa-crest', progress: 0.845 },
  { key: 'final-descent', progress: 0.93 },
];

const waitForServer = async (url) => {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch { await new Promise((r2) => setTimeout(r2, 350)); }
  }
  throw new Error('server not ready');
};

const telemetry = (page) => page.evaluate(() => window.__comebackCityKartTelemetry || null);

const captureAtProgress = async (page, key, target) => {
  const deadline = Date.now() + 240000;
  let last = null;
  let laps = 0;
  while (Date.now() < deadline) {
    const t = await telemetry(page);
    if (t && t.countdown <= 0 && t.speed > 0) {
      const d = t.routeProgress - target;
      // Capture on crossing OR on first sample already past the target
      // (covers fast races where the first poll lands after the mark).
      const crossed = last !== null && last < 0 && d >= 0;
      const firstPast = last === null && d >= 0 && d < 0.04;
      const near = d >= 0 && d < 0.006;
      if (crossed || firstPast || near) {
        await page.screenshot({ path: path.join(outputDir, `${key}.png`) });
        console.log(`captured ${key} @ ${t.routeProgress.toFixed(3)} lap ${t.lap}`);
        return true;
      }
      last = d;
    }
    laps += 1;
    if (laps % 200 === 0) console.log(`…waiting ${key}`, JSON.stringify(t && { rp: t.routeProgress, lap: t.lap, speed: t.speed }));
    await page.waitForTimeout(100);
  }
  console.log(`WARN ${key} timed out`);
  return false;
};

const run = async () => {
  await mkdir(outputDir, { recursive: true });
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = spawn(npm, ['run', 'dev:kart', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    detached: process.platform !== 'win32',
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let browser;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch({ headless: true });

    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    await page.goto(`${baseUrl}/?playableAutoplay=1#race`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 60000 });
    for (const shot of SHOTS) await captureAtProgress(page, shot.key, shot.progress);
    await page.close();

    // Effects-off legibility: racing line must read with the gfx stack down.
    const off = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    await off.goto(`${baseUrl}/?playableAutoplay=1&gfx=off#race`, { waitUntil: 'networkidle' });
    await off.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 60000 });
    await captureAtProgress(off, 'legibility-gfx-off', 0.28);
    await off.close();

    // Top-down overview of the whole new topology.
    const top = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    await top.goto(`${baseUrl}/?playableAutoplay=1&proofCamera=top#race`, { waitUntil: 'networkidle' });
    await top.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 60000 });
    await top.waitForTimeout(2600);
    await top.screenshot({ path: path.join(outputDir, 'top-down.png') });
    await top.close();

    console.log('M3 captures written to', path.relative(root, outputDir));
  } finally {
    if (browser) await browser.close();
    try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
