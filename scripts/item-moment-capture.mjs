// Diagnostic probe: screenshots the live autoplay race at item moments —
// pickup, carrot/snowball flight, ice shield up, fish bones on track, player
// hit — so item visuals can be reviewed without scrubbing video. Not part of
// CI. Usage: node scripts/item-moment-capture.mjs
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 5311;
const OUT = process.env.PROBE_OUT || 'tmp/item-moments';
const QUERY = process.env.PROBE_QUERY || '?playableAutoplay=1';

mkdirSync(OUT, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
});
await new Promise((resolve) => setTimeout(resolve, 1800));

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { height: 768, width: 1366 } });
  await page.goto(`http://127.0.0.1:${PORT}/${QUERY}#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
    timeout: 20000,
  });

  const captured = [];
  const counts = {};
  const shoot = async (label, max = 2) => {
    counts[label] = (counts[label] || 0) + 1;
    if (counts[label] > max) return;
    const path = `${OUT}/${label}-${counts[label]}.png`;
    await page.screenshot({ path });
    captured.push(path);
  };

  let prev = { fishBones: 0, heldItem: null, pickups: 0, spinOuts: 0 };
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const t = await page.evaluate(() => ({
      finished: window.__comebackCityKartTelemetry?.finished,
      fishBones: window.__comebackCityKartTelemetry?.fishBonesOnTrack ?? 0,
      heldItem: window.__comebackCityKartTelemetry?.heldItem ?? null,
      pickups: window.__comebackCityKartTelemetry?.itemPickups ?? 0,
      spinOuts: window.__comebackCityKartTelemetry?.spinOuts ?? 0,
    }));
    if (t.finished) break;
    if (t.pickups > prev.pickups && t.heldItem) await shoot(`held-${t.heldItem}`);
    if (prev.heldItem === 'snowball' && !t.heldItem) {
      await shoot('carrot-flight');
      await page.waitForTimeout(350);
      await shoot('carrot-flight-far');
    }
    if (prev.heldItem === 'iceshield' && !t.heldItem) await shoot('iceshield-up');
    if (t.fishBones > prev.fishBones) await shoot('fishbone-on-track', 3);
    if (t.spinOuts > prev.spinOuts) await shoot('player-hit');
    prev = t;
    await page.waitForTimeout(60);
  }
  console.log(`captured ${captured.length} moments:`);
  captured.forEach((path) => console.log(`  ${path}`));
  await page.close();
} finally {
  await browser.close();
  server.kill();
}
