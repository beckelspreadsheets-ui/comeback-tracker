// K6 probe: lifoladen as PLAYER (Miami Cruiser) and as RIVAL — mounts clean,
// seated read, autoplay alive. Uses the RUNNING 5173 dev server.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });

const probe = async (label, url, shots) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });
  const t0 = Date.now();
  const taken = new Set();
  while (Date.now() - t0 < 60000 && taken.size < shots.length) {
    const t = await page.evaluate(() => {
      const w = window.__comebackCityKartTelemetry;
      return w && { lap: w.lap, progress: w.routeProgress, speed: w.speed, mounts: w.miamiMounts };
    });
    if (t) {
      for (const shot of shots) {
        if (!taken.has(shot.name) && t.progress >= shot.at && (shot.lap ? t.lap >= shot.lap : true)) {
          await page.screenshot({ path: `tmp/k6-lifoladen/${label}-${shot.name}.png` });
          taken.add(shot.name);
          console.log(`${label}: shot ${shot.name} at progress ${t.progress.toFixed(3)} lap ${t.lap} speed ${Math.round(t.speed)}`);
        }
      }
    }
    await page.waitForTimeout(80);
  }
  const final = await page.evaluate(() => {
    const w = window.__comebackCityKartTelemetry;
    return { mounts: w.miamiMounts, lap: w.lap };
  });
  console.log(`${label}: final mounts=${JSON.stringify(final.mounts)} lap=${final.lap}`);
};

await probe(
  'player',
  'http://localhost:5173/?character=lifoladen&kart=miamicruiser&raceAutoplay=1#race',
  [{ name: 'start', at: 0.01 }, { name: 'mid', at: 0.3 }]
);
await probe(
  'rival',
  'http://localhost:5173/?character=crrt-bunny&raceAutoplay=1#race',
  [{ name: 'start', at: 0.01 }, { name: 'mid', at: 0.3 }]
);
await browser.close();
