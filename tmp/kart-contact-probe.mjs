// One-off diagnosis probe for the kart-contact autoplay regression: polls
// telemetry on Penguin Village autoplay and logs the player's speed/lane/
// position trace so wall-pinning, bump-grinding, and spin-outs are
// distinguishable. Not a test — a lab instrument.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const PORT = 5316;

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

const run = async () => {
  const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  });
  let browser = null;
  try {
    await waitForServer();
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
    await page.goto(`http://127.0.0.1:${PORT}/?playableAutoplay=1&track=penguin-village#race`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
      timeout: 30000,
    });
    await page.waitForFunction(
      () => window.__comebackCityKartTelemetry && window.__comebackCityKartTelemetry.countdown <= 0,
      null,
      { timeout: 30000 }
    );
    for (let sample = 0; sample < 340; sample += 1) {
      const t = await page.evaluate(() => {
        const tele = window.__comebackCityKartTelemetry;
        return {
          lane: null,
          position: tele.position,
          raceTime: tele.raceTime,
          routeProgress: tele.routeProgress,
          speed: tele.speed,
          spinOuts: tele.spinOuts,
          steer: tele.steer,
          wallContact: tele.wallContact,
        };
      });
      console.log(JSON.stringify(t));
      await page.waitForTimeout(400);
    }
    await page.close();
  } finally {
    await browser?.close();
    server.kill();
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
