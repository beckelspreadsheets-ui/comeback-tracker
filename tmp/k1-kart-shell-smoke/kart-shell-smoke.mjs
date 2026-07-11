// K1 one-off smoke: drives the BUILT kart shell (dist-kart via vite preview)
// through the QA contract the PRD lists for acceptance:
//   1. fresh visit -> intro -> select -> race (testids intact)
//   2. one-shot ?character/?kart/?track seeds preselect + strip from URL
//   3. ?playableAutoplay=1#race skips straight to the race, telemetry globals up
//   4. legacy comeback-tracker-v1 atom best-times migrate once into cc-kart-results
//   5. no fitness atom writes from the kart shell
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 5317;
const BASE = `http://127.0.0.1:${PORT}`;
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const server = spawn('npm', ['run', 'preview:kart', '--', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
const waitForServer = async () => {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('preview server never became ready');
};

try {
  await waitForServer();
  const browser = await chromium.launch();

  // --- 1. fresh visit: intro -> select -> race ---
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    // playwright sets navigator.webdriver; the shell skips intro/select for
    // webdriver sessions, so neutralize it for the human-flow checks.
    await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
    await page.goto(`${BASE}/#race`);
    await page.waitForSelector('[data-testid="race-intro-screen"]', { timeout: 15000 });
    check('fresh visit shows intro', true);
    await page.click('[data-testid="race-intro-start"]');
    await page.waitForSelector('[data-testid="race-character-select"]', { timeout: 15000 });
    const testids = ['race-track-comeback-city', 'race-track-penguin-village', 'race-character-crrt-bunny', 'race-kart-hero', 'race-open-item-guide', 'race-character-start'];
    for (const id of testids) {
      const el = await page.$(`[data-testid="${id}"]`);
      check(`select testid ${id}`, Boolean(el));
    }
    await page.click('[data-testid="race-open-item-guide"]');
    await page.waitForSelector('[data-testid="race-intro-screen"]', { timeout: 5000 });
    check('item guide reachable from select', true);
    await page.click('[data-testid="race-intro-start"]');
    await page.click('[data-testid="race-track-penguin-village"]');
    await page.click('[data-testid="race-character-start"]');
    await page.waitForSelector('[data-testid="comeback-city-3d-kart-race"]', { timeout: 30000 });
    check('race mounts after select', true);
    const attrs = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="race-screen"]');
      return { renderer: el?.dataset.raceRenderer, track: el?.dataset.raceTrack };
    });
    check('data-race-renderer=three-kart', attrs.renderer === 'three-kart', JSON.stringify(attrs));
    check('data-race-track follows pick', attrs.track === 'penguin-village', JSON.stringify(attrs));
    const stored = await page.evaluate(() => ({
      track: localStorage.getItem('cc-kart-track'),
      intro: localStorage.getItem('cc-kart-intro-seen'),
      atom: localStorage.getItem('comeback-tracker-v1'),
    }));
    check('picks persisted to cc-kart-*', stored.track === 'penguin-village' && stored.intro === '1');
    check('fitness atom untouched', stored.atom === null);
    check('no console errors (flow)', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // --- 2. one-shot URL seeds preselect + strip ---
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
    await page.addInitScript(() => localStorage.setItem('cc-kart-intro-seen', '1'));
    await page.goto(`${BASE}/?character=tclow&kart=icesled&track=penguin-village#race`);
    await page.waitForSelector('[data-testid="race-character-select"]', { timeout: 15000 });
    const seeded = await page.evaluate(() => ({
      char: document.querySelector('[data-testid="race-character-tclow"]')?.className.includes('border-[#ffd34f]'),
      kart: document.querySelector('[data-testid="race-kart-icesled"]')?.className.includes('border-[#ffd34f]'),
      track: document.querySelector('[data-testid="race-track-penguin-village"]')?.className.includes('border-[#ffd34f]'),
      search: window.location.search,
      hash: window.location.hash,
    }));
    check('?character seed preselects', seeded.char === true);
    check('?kart seed preselects', seeded.kart === true);
    check('?track seed preselects', seeded.track === true);
    check('seed params stripped from URL', seeded.search === '' && seeded.hash === '#race', JSON.stringify({ search: seeded.search, hash: seeded.hash }));
    await ctx.close();
  }

  // --- 3. playableAutoplay skips to race + telemetry globals ---
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    await page.goto(`${BASE}/?playableAutoplay=1#race`);
    await page.waitForSelector('[data-testid="comeback-city-3d-kart-race"]', { timeout: 30000 });
    check('playableAutoplay skips intro+select', true);
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 30000 });
    const telemetry = await page.evaluate(() => {
      const t = window.__comebackCityKartTelemetry;
      return { renderer: t.renderer, route: t.route, track: t.track, mounts: t.miamiMounts, visualAssetSet: t.visualAssetSet };
    });
    check('telemetry renderer/route', telemetry.renderer === 'three-kart' && telemetry.route === 'race', JSON.stringify({ route: telemetry.route }));
    check('telemetry visualAssetSet', telemetry.visualAssetSet === 'comeback-city-v2-three-runtime');
    await page.waitForFunction(
      () => {
        const m = window.__comebackCityKartTelemetry?.miamiMounts;
        return m && m.requested > 0 && m.mounted === m.requested && m.failed === 0;
      },
      null,
      { timeout: 45000 }
    );
    const mounts = await page.evaluate(() => window.__comebackCityKartTelemetry.miamiMounts);
    check('mounts guard green', true, JSON.stringify(mounts));
    check('no console errors (autoplay)', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // --- 4+5. legacy atom migration (one-shot, read-only) ---
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const legacyAtom = JSON.stringify({
      schemaVersion: 5,
      game: { raceResults: { 'comeback-city': { bestTime: 123.45, bestPlace: 2, podiums: 3, runs: 5, wins: 1 } } },
    });
    await page.addInitScript((atom) => {
      localStorage.setItem('comeback-tracker-v1', atom);
      localStorage.setItem('cc-kart-intro-seen', '1');
    }, legacyAtom);
    await page.goto(`${BASE}/#race`);
    await page.waitForSelector('[data-testid="race-screen"]', { timeout: 15000 });
    const migrated = await page.evaluate(() => ({
      results: JSON.parse(localStorage.getItem('cc-kart-results') || 'null'),
      flag: localStorage.getItem('cc-kart-results-migrated'),
      atomUnchanged: localStorage.getItem('comeback-tracker-v1'),
    }));
    check(
      'legacy best-times migrated',
      migrated.results?.['comeback-city']?.bestTime === 123.45 && migrated.flag === '1',
      JSON.stringify(migrated.results)
    );
    check('legacy atom not mutated', migrated.atomUnchanged === legacyAtom);
    // second load: migration must not run again / not clobber kart results
    await page.evaluate(() => {
      const r = JSON.parse(localStorage.getItem('cc-kart-results'));
      r['comeback-city'].bestTime = 99.9; // kart-local improvement
      localStorage.setItem('cc-kart-results', JSON.stringify(r));
    });
    await page.reload();
    await page.waitForSelector('[data-testid="race-screen"]', { timeout: 15000 });
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('cc-kart-results'))['comeback-city'].bestTime);
    check('migration is one-shot (kart results win)', after === 99.9, String(after));
    await ctx.close();
  }

  await browser.close();
} finally {
  server.kill('SIGTERM');
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
