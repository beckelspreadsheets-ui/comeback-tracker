// Trial a rebuilt kart in the real game on the dev server and write down what
// was seen: the setup screen, a paint try-on, a chase-camera race frame, and
// measurements of the live model (named wheels, spin, steer, axle height,
// where the driver sits). Desktop Chromium only: this says nothing about a
// phone.
//
//   node scripts/blender/kart-revamp/game-shots.mjs <outDir> [name=query ...]
//   e.g. node scripts/blender/kart-revamp/game-shots.mjs tmp/kart-revamp v2=hashRunner=v2 current=
//
// Each variant is the extra query string that selects the model ('' for the
// shipped one). GAME_SHOTS_CHARACTER (default seth-penguin) picks the racer,
// GAME_SHOTS_TRACK the track, GAME_SHOTS_PAINT the paint tried on and raced,
// GAME_SHOTS_RACE_MARKS the race times (seconds) to shoot at.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { chromiumGlArgs } from '../../lib/chromium-gl-args.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.resolve(process.argv[2] || 'tmp/kart-revamp');
const VARIANTS = (process.argv.slice(3).length ? process.argv.slice(3) : ['v2=hashRunner=v2']).map((arg) => {
  const index = arg.indexOf('=');
  return { name: arg.slice(0, index), query: arg.slice(index + 1) };
});
const PORT = Number(process.env.GAME_SHOTS_PORT || 5377);
const CHARACTER = process.env.GAME_SHOTS_CHARACTER || 'tclow';
const TRACK = process.env.GAME_SHOTS_TRACK || 'comeback-city';
const PAINT = process.env.GAME_SHOTS_PAINT || 'ice-cyan';
// the kart key the bought paint is equipped under (the kart CHARACTER starts in)
const KART_KEY = process.env.GAME_SHOTS_KART_KEY || 'hashrunner';
const TURNTABLE_FRAMES = Number(process.env.GAME_SHOTS_TURNTABLE_FRAMES || 8);
const RACE_MARKS = (process.env.GAME_SHOTS_RACE_MARKS || '4.5,7,9.5,12').split(',').map(Number);
const baseUrl = `http://127.0.0.1:${PORT}`;
mkdirSync(OUT, { recursive: true });

const waitForServer = async (url, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
};

// Reads the player's kart straight off the scene graph (dev-only hook).
const measure = () => {
  const model = window.__comebackCityKartPlayerModel;
  if (!model) return null;
  const round = (value) => Math.round(value * 1000) / 1000;
  const box = (object) => {
    let min = null;
    let max = null;
    object.updateWorldMatrix(true, true);
    object.traverse((node) => {
      if (!node.isMesh || !node.geometry) return;
      if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
      const b = node.geometry.boundingBox;
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
        const v = b.min.clone().set(x, y, z).applyMatrix4(node.matrixWorld);
        const local = model.group.worldToLocal(v);
        if (!min) {
          min = local.clone();
          max = local.clone();
        }
        min.min(local);
        max.max(local);
      }
    });
    return min ? { max: [round(max.x), round(max.y), round(max.z)], min: [round(min.x), round(min.y), round(min.z)] } : null;
  };
  const inDriver = (node) => {
    for (let parent = node; parent; parent = parent.parent) if (parent === model.driverMount) return true;
    return false;
  };
  const bodyBox = { max: [-1e9, -1e9, -1e9], min: [1e9, 1e9, 1e9] };
  model.bodyMeshes.filter((mesh) => !inDriver(mesh)).forEach((mesh) => {
    const b = box(mesh);
    if (!b) return;
    for (let i = 0; i < 3; i += 1) {
      bodyBox.min[i] = Math.min(bodyBox.min[i], b.min[i]);
      bodyBox.max[i] = Math.max(bodyBox.max[i], b.max[i]);
    }
  });
  return {
    body: bodyBox,
    driver: box(model.driverMount),
    driverMount: model.driverMount.position.toArray().map(round),
    wheels: model.wheels.map((wheel) => {
      const p = model.group.worldToLocal(wheel.getWorldPosition(wheel.position.clone()));
      // radius from the wheel's own geometry (its box in its own frame, times
      // the scale it is drawn at), so the spin angle does not inflate it
      let radius = null;
      wheel.traverse((node) => {
        if (radius !== null || !node.isMesh) return;
        if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
        const size = node.geometry.boundingBox.max.clone().sub(node.geometry.boundingBox.min);
        const scale = node.getWorldScale(size.clone());
        radius = round((size.y * scale.y) / 2);
      });
      return {
        front: Boolean(wheel.userData.front),
        name: wheel.name,
        position: [round(p.x), round(p.y), round(p.z)],
        radius,
        spinBand: Boolean(wheel.userData.spinBand),
        spinX: round(wheel.rotation.x),
        steerY: round(wheel.rotation.y),
      };
    }),
  };
};

const server = spawn('npx', ['vite', '--config', 'vite.config.kart.js', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
});
const report = [];
let browser;
try {
  if (!(await waitForServer(`${baseUrl}/`, 60000))) throw new Error('dev server never came up');
  browser = await chromium.launch({ args: chromiumGlArgs() });
  for (const variant of VARIANTS) {
    const extra = variant.query ? `&${variant.query}` : '';
    const entry = { errors: [], name: variant.name, query: variant.query };
    const listen = (page) => {
      page.on('pageerror', (error) => entry.errors.push(String(error).slice(0, 300)));
      page.on('console', (message) => {
        if (message.type() === 'error') entry.errors.push(message.text().slice(0, 300));
      });
    };

    // ---- setup screen: the real menu (webdriver masked so it is not skipped)
    const menu = await browser.newContext({ deviceScaleFactor: 2, hasTouch: true, isMobile: true, viewport: { height: 440, width: 956 } });
    await menu.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
      try {
        window.localStorage.setItem('cc-kart-intro-seen', '1');
      } catch {}
    });
    let page = await menu.newPage();
    listen(page);
    await page.goto(`${baseUrl}/?character=${CHARACTER}${extra}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="race-select-stage"] canvas', { timeout: 60000 });
    await page.waitForFunction(() => window.__comebackCityKartSelectStage?.kartLoaded && window.__comebackCityKartSelectStage?.characterLoaded, null, { timeout: 60000 });
    await page.evaluate(() => {
      const stage = document.querySelector('[data-testid="race-select-stage"]');
      const scroller = stage?.closest('.overflow-y-auto');
      if (scroller) scroller.scrollTop += stage.getBoundingClientRect().top - 8;
    });
    const stageShot = async (file) => {
      const stage = page.locator('[data-testid="race-select-stage"]');
      await page.screenshot({ path: path.join(OUT, `${variant.name}-${file}.png`) });
      await stage.screenshot({ path: path.join(OUT, `${variant.name}-${file}-stage.png`) });
    };
    // the turntable turns all the way round; a frame every 1.5 s, the best
    // angles are picked by eye afterwards
    await page.waitForTimeout(2500);
    for (let frame = 0; frame < TURNTABLE_FRAMES; frame += 1) {
      await stageShot(`setup-${frame}`);
      await page.waitForTimeout(1500);
    }
    // paint try-on: tapping a locked paint previews it on the stage
    const swatch = page.locator(`[data-testid="race-paint-${PAINT}"]`);
    if (await swatch.count()) {
      await swatch.scrollIntoViewIfNeeded();
      await swatch.click();
      await page.waitForTimeout(600);
      entry.stagePaintAmount = await page.evaluate(() => window.__comebackCityKartSelectStage?.paintAmount);
      await page.evaluate(() => {
        const stage = document.querySelector('[data-testid="race-select-stage"]');
        const scroller = stage?.closest('.overflow-y-auto');
        if (scroller) scroller.scrollTop += stage.getBoundingClientRect().top - 8;
      });
      await page.waitForTimeout(2500);
      await stageShot('setup-paint');
    } else {
      entry.stagePaintAmount = 'no paint swatch found';
    }
    await menu.close();

    // ---- race: chase camera, autoplay driver. Second pass with a bought paint.
    for (const pass of ['race', 'race-paint']) {
      const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { height: 675, width: 1200 } });
      if (pass === 'race-paint') {
        await context.addInitScript(({ kartKey, paint }) => {
          try {
            window.localStorage.setItem('cc-kart-paints', JSON.stringify({ equipped: { [kartKey]: paint }, owned: ['stock', paint] }));
          } catch {}
        }, { kartKey: KART_KEY, paint: PAINT });
      }
      page = await context.newPage();
      listen(page);
      await page.goto(`${baseUrl}/?playableAutoplay=1&track=${TRACK}&character=${CHARACTER}${extra}#race`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 120000 });
      const telemetry = () =>
        page.evaluate(() => {
          const t = window.__comebackCityKartTelemetry || {};
          return { countdown: t.countdown, raceTime: t.raceTime, speed: t.speed };
        });
      const until = async (test, ms) => {
        const end = Date.now() + ms;
        while (Date.now() < end) {
          const t = await telemetry();
          if (test(t)) return t;
          await page.waitForTimeout(100);
        }
        return telemetry();
      };
      if (pass === 'race') {
        // standing on the grid, before the lights: the kart is level, so this
        // is where axle height can be compared with wheel radius
        await until((t) => t.countdown !== undefined && t.countdown > 0 && t.countdown < 2.2, 60000);
        entry.atRest = await page.evaluate(measure);
        await page.screenshot({ path: path.join(OUT, `${variant.name}-race-grid.png`) });
      }
      await until((t) => t.countdown !== undefined && t.countdown <= 0 && t.raceTime > 0.2, 60000);
      if (pass === 'race') await page.screenshot({ path: path.join(OUT, `${variant.name}-race-start.png`) });
      // several frames: a rival ghosting through the camera or a held item
      // can cover the kart, so the clean one is picked by eye afterwards
      for (const seconds of RACE_MARKS) {
        const shot = await until((t) => t.raceTime >= seconds, 90000);
        const tag = `${variant.name}-${pass}-${String(seconds).replace('.', '_')}s`;
        await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
        await page.screenshot({ clip: { height: 300, width: 460, x: 370, y: 270 }, path: path.join(OUT, `${tag}-crop.png`) });
        entry[`${pass}Times`] = [...(entry[`${pass}Times`] || []), shot.raceTime];
      }
      if (pass === 'race') {
        const first = await page.evaluate(measure);
        await page.waitForTimeout(2500);
        const second = await page.evaluate(measure);
        // steering is sampled while the autoplay driver corners
        let steer = 0;
        const end = Date.now() + 6000;
        while (Date.now() < end) {
          const sample = await page.evaluate(measure);
          for (const wheel of sample?.wheels || []) if (wheel.front) steer = Math.max(steer, Math.abs(wheel.steerY));
          await page.waitForTimeout(120);
        }
        entry.model = second;
        entry.wheelSpin = (second?.wheels || []).map((wheel, index) => ({
          name: wheel.name,
          turned: Math.round((wheel.spinX - (first?.wheels?.[index]?.spinX ?? 0)) * 100) / 100,
        }));
        entry.maxFrontSteer = Math.round(steer * 1000) / 1000;
        entry.rearSteer = Math.max(0, ...(second?.wheels || []).filter((wheel) => !wheel.front).map((wheel) => Math.abs(wheel.steerY)));
      }
      await context.close();
    }
    entry.errors = [...new Set(entry.errors)];
    report.push(entry);
    console.log(JSON.stringify(entry));
  }
} finally {
  await browser?.close();
  server.kill();
}
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
