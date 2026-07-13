// K7 boost-pad rebuild capture: far/near/at-pad tiles on lap 2+ (field
// spread out — lap-1 shots hide the pad behind the start pack; W2 lab
// lesson). Runs against the ALREADY-RUNNING 5173 dev server (never spawn a
// second vite next to the owner's — dep-cache ping-pong).
// Usage: node tmp/k7-boost-pad/pad-capture.mjs <label>
import { chromium } from 'playwright';
import fs from 'node:fs';

const label = process.argv[2] || 'shot';
const outDir = 'tmp/k7-boost-pad';
fs.mkdirSync(outDir, { recursive: true });

// One representative pad per track; far = reaction distance at race speed,
// near = commit distance, at = on the pad.
const PLAN = [
  { track: 'comeback-city', pad: 0.435, name: 'bridge-climb' },
  { track: 'penguin-village', pad: 0.33, name: 'pond' },
];
const SHOTS = [
  { key: 'far', lead: 0.04 },
  { key: 'near', lead: 0.013 },
  { key: 'at', lead: 0.002 },
];

const browser = await chromium.launch();
const summary = {};
for (const { track, pad, name } of PLAN) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  await page.goto(`http://localhost:5173/?raceAutoplay=1&track=${track}#race`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });
  const shots = [];
  for (const shot of SHOTS) {
    const target = pad - shot.lead;
    // lap >= 2 and a fresh lap each shot; screenshot latency can slide past a
    // window — the next lap's pass is an equally valid tile.
    await page.waitForFunction(
      (t) => {
        const w = window.__comebackCityKartTelemetry;
        return w && !w.finished && w.lap >= 2 && w.routeProgress >= t && w.routeProgress < t + 0.012;
      },
      target,
      { timeout: 180000 }
    );
    const file = `${outDir}/${label}-${track}-${name}-${shot.key}.png`;
    await page.screenshot({ path: file });
    shots.push(file);
  }
  const boostHits = await page.evaluate(() => window.__comebackCityKartTelemetry?.boostHits);
  summary[track] = { shots, boostHits };
  console.log(track, JSON.stringify(summary[track]));
  await page.close();
}
fs.writeFileSync(`${outDir}/${label}-summary.json`, JSON.stringify(summary, null, 2));
await browser.close();
