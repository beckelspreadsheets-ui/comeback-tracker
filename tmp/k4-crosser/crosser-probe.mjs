// K4 probe: outplayasians crosser on the PV finish straight — visible,
// moving, mounts guard clean, autoplay survives.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const server = spawn('npx', ['vite', 'preview', '--config', 'vite.config.kart.js', '--port', '5334', '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
await page.goto('http://localhost:5334/?raceAutoplay=1&track=penguin-village#race', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });
const shots = new Set();
const t0 = Date.now();
let lastLap = 0;
while (Date.now() - t0 < 180000) {
  const t = await page.evaluate(() => {
    const w = window.__comebackCityKartTelemetry;
    return w && { lap: w.lap, progress: w.routeProgress, mounts: w.miamiMounts, finished: w.finished, spinOuts: w.spinOuts };
  });
  if (t) {
    lastLap = t.lap;
    if (!shots.has('approach') && t.progress > 0.955) {
      await page.screenshot({ path: 'tmp/k4-crosser/finish-approach.png' });
      shots.add('approach');
      console.log('shot approach at', t.progress, 'lap', t.lap);
    }
    if (!shots.has('crossing') && t.progress > 0.0 && t.progress < 0.035 && t.lap > 1) {
      await page.screenshot({ path: 'tmp/k4-crosser/finish-crossing.png' });
      shots.add('crossing');
      console.log('shot crossing at', t.progress, 'lap', t.lap, 'spinOuts', t.spinOuts);
    }
    if (t.finished) {
      console.log('race finished; mounts', JSON.stringify(t.mounts), 'spinOuts', t.spinOuts);
      break;
    }
  }
  await page.waitForTimeout(60);
}
await browser.close();
server.kill();
console.log('shots:', [...shots].join(', '));
