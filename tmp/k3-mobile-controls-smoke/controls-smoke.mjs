// K3 mobile controls V2 — synthetic-pointer smoke over dist-kart.
// Phone-shaped context proves: coarse-gated joystick/cluster render, auto-
// accel with ZERO input, analog joystick steers + releases clean, drift
// engages one-thumb, the smash button fires the held item (slapfish →
// telemetry.slapping), held-item label readable contract (race-held-item-chip
// on the button). Desktop context proves: no touch UI, E key fires items.
// Run: node tmp/k3-mobile-controls-smoke/controls-smoke.mjs
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 5331;
const BASE = `http://localhost:${PORT}`;
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const telemetry = (page) => page.evaluate(() => {
  const w = window.__comebackCityKartTelemetry;
  return w && {
    countdown: w.countdown, drift: w.drift, driftCharge: w.driftCharge, heldItem: w.heldItem,
    lane: w.lane, slapping: w.slapping, speed: w.speed, steer: w.steer,
  };
});

const server = spawn('npx', ['vite', 'preview', '--config', 'vite.config.kart.js', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await new Promise((resolve) => setTimeout(resolve, 2500));
const browser = await chromium.launch();

try {
  // ---------- Phone-shaped context ----------
  const phone = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 844, height: 390 } });
  const page = await phone.newPage();
  await page.goto(`${BASE}/?touchControls=1&track=comeback-city&giveItem=slapfish#race`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });

  const joystick = page.getByTestId('race-touch-joystick');
  const driftBtn = page.getByTestId('race-touch-drift');
  const itemBtn = page.getByTestId('race-touch-item');
  const brakeBtn = page.getByTestId('race-touch-brake');
  check('touch UI renders (joystick + brake + drift + item)',
    await joystick.isVisible() && await driftBtn.isVisible() && await itemBtn.isVisible() && await brakeBtn.isVisible());
  const clusterButtons = await page.locator('.three-kart-race__touch--cluster button').count();
  check('cluster is exactly brake/drift/item (no legacy 6-button row)', clusterButtons === 3, `buttons=${clusterButtons}`);

  // Regression guard: min-height:620px used to push the controls below the
  // fold on landscape phones — every control must sit inside the viewport.
  const viewportH = page.viewportSize().height;
  const joyBox = await joystick.boundingBox();
  const itemBox = await itemBtn.boundingBox();
  check(
    'controls are fully on-screen in landscape (no below-the-fold layout)',
    joyBox.y >= 0 && joyBox.y + joyBox.height <= viewportH + 1 && itemBox.y + itemBox.height <= viewportH + 1,
    `joystick bottom=${Math.round(joyBox.y + joyBox.height)}, item bottom=${Math.round(itemBox.y + itemBox.height)}, viewport=${viewportH}`
  );

  // Auto-accel: not a single input dispatched yet.
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.speed > 80, null, { timeout: 15000 })
    .then(() => check('auto-accel: speed > 80 with zero input', true))
    .catch(async () => check('auto-accel: speed > 80 with zero input', false, JSON.stringify(await telemetry(page))));

  // Tour-style drag steer: press anywhere on the zone (center of screen
  // here), drag right, hold — steer goes positive and the floating
  // indicator appears under the pointer.
  const box = await joystick.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  const indicatorShown = await page.locator('.three-kart-race__steer-indicator').evaluate((el) => getComputedStyle(el).display !== 'none');
  check('floating steer indicator appears under the touch', indicatorShown);
  await page.mouse.move(cx + 55, cy, { steps: 6 });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.steer > 0.3, null, { timeout: 2500 })
    .then(() => check('joystick drag-right → analog steer > 0.3', true))
    .catch(async () => check('joystick drag-right → analog steer > 0.3', false, JSON.stringify(await telemetry(page))));

  // One-thumb drift while steering: hold the drift button with a second pointer.
  await driftBtn.dispatchEvent('pointerdown', { pointerId: 7, isPrimary: false });
  await page.waitForFunction(() => {
    const w = window.__comebackCityKartTelemetry;
    return w && (w.drift === true || w.driftCharge > 0);
  }, null, { timeout: 4000 })
    .then(() => check('drift engages while joystick steers (two thumbs, no throttle needed)', true))
    .catch(async () => check('drift engages while joystick steers', false, JSON.stringify(await telemetry(page))));
  await driftBtn.dispatchEvent('pointerup', { pointerId: 7, isPrimary: false });

  // Release the joystick: steer decays back toward center.
  await page.mouse.up();
  await page.waitForFunction(() => Math.abs(window.__comebackCityKartTelemetry?.steer ?? 1) < 0.15, null, { timeout: 2500 })
    .then(() => check('joystick release → steer decays to center (no stuck input)', true))
    .catch(async () => check('joystick release → steer decays to center', false, JSON.stringify(await telemetry(page))));

  // Smash button: held item shows on the button, tap fires it.
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.heldItem === 'slapfish', null, { timeout: 10000 });
  const label = (await page.getByTestId('race-held-item-chip').textContent()) || '';
  check('smash button displays the held item name', /slap/i.test(label), `label="${label}"`);
  const armed = await itemBtn.evaluate((el) => el.className.includes('item-button--armed'));
  check('smash button armed glow while holding an item', armed);
  await itemBtn.dispatchEvent('pointerdown', { pointerId: 9, isPrimary: true });
  await itemBtn.dispatchEvent('pointerup', { pointerId: 9, isPrimary: true });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.slapping === true, null, { timeout: 3000 })
    .then(() => check('smash button fires the item (slapfish swings)', true))
    .catch(async () => check('smash button fires the item', false, JSON.stringify(await telemetry(page))));

  await page.screenshot({ path: 'tmp/k3-mobile-controls-smoke/phone-landscape.png' });
  await phone.close();

  // ---------- Portrait phone: coarse detect via real media query is not
  // emulatable headless, so prove the ?touchControls=0 override kills the UI.
  const phone2 = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page2 = await phone2.newPage();
  await page2.goto(`${BASE}/?touchControls=0&track=comeback-city#race`, { waitUntil: 'domcontentloaded' });
  await page2.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });
  check('?touchControls=0 override renders no touch UI', (await page2.getByTestId('race-touch-joystick').count()) === 0);
  await phone2.close();

  // ---------- Desktop context ----------
  const desktop = await browser.newContext({ viewport: { width: 1365, height: 768 } });
  const page3 = await desktop.newPage();
  await page3.goto(`${BASE}/?track=comeback-city&giveItem=slapfish#race`, { waitUntil: 'domcontentloaded' });
  await page3.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });
  check('desktop (fine pointer): zero touch UI', (await page3.locator('.three-kart-race__touch, .three-kart-race__joystick').count()) === 0);
  // Desktop does NOT auto-accel; drive with W, fire with the new E binding.
  await page3.keyboard.down('KeyW');
  await page3.waitForFunction(() => window.__comebackCityKartTelemetry?.heldItem === 'slapfish' && window.__comebackCityKartTelemetry?.speed > 80, null, { timeout: 15000 });
  await page3.keyboard.press('KeyE');
  await page3.waitForFunction(() => window.__comebackCityKartTelemetry?.slapping === true, null, { timeout: 3000 })
    .then(() => check('keyboard E fires the item (WASD-friendly key, W7.1)', true))
    .catch(async () => check('keyboard E fires the item', false, JSON.stringify(await telemetry(page3))));
  const speedBefore = (await telemetry(page3)).speed;
  await page3.keyboard.up('KeyW');
  await page3.waitForTimeout(2500);
  const speedAfter = (await telemetry(page3)).speed;
  check('desktop does NOT auto-accel (throttle release slows the kart)', speedAfter < speedBefore - 20, `${speedBefore} → ${speedAfter}`);
  await desktop.close();
} catch (error) {
  check(`aborted: ${error.message.split('\n')[0]}`, false);
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
