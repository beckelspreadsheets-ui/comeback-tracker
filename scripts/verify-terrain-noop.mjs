// AAA item 7 slice A verification: prove the terrain-heightfield term is a NO-OP
// with today's elevation profile by reading the ACTUAL ground-plane vertex Z
// (the local displacement the setZ writes) with the flag ON (default) vs OFF
// (?terrainGrade=0), on both bridge-bearing tracks. If the term is a no-op the
// two Z arrays are byte-identical. Deterministic geometry compare, not pixel A/B.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { chromiumGlArgs } from './lib/chromium-gl-args.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const PORT = 5371;

const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' });
const waitUp = async () => {
  for (let i = 0; i < 150; i += 1) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/`); if (r.ok || r.status === 404) return; } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('vite never came up');
};

const readGroundZ = async (browser, track, query) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`http://127.0.0.1:${PORT}/kart-playtest.html?raceAutoplay=1&track=${track}${query}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__g3ParticlesDebug && window.__g3ParticlesDebug.group && window.__g3ParticlesDebug.group.parent, null, { timeout: 90000 });
  const res = await page.evaluate(() => {
    let o = window.__g3ParticlesDebug.group;
    const seen = new Set();
    while (o.parent && !seen.has(o.parent)) { seen.add(o.parent); o = o.parent; }
    const scene = o;
    if (!scene.traverse) return null;
    let ground = null, best = -1;
    scene.traverse((n) => {
      if (n.isMesh && n.geometry && n.geometry.type === 'PlaneGeometry') {
        const c = n.geometry.attributes.position.count;
        if (c > best) { best = c; ground = n; }
      }
    });
    if (!ground) return null;
    const pos = ground.geometry.attributes.position;
    const z = new Array(pos.count);
    for (let i = 0; i < pos.count; i += 1) z[i] = pos.getZ(i);
    return { count: pos.count, z };
  });
  await page.close();
  return res;
};

(async () => {
  await waitUp();
  const browser = await chromium.launch({ args: chromiumGlArgs() });
  const out = {};
  for (const track of ['comeback-city', 'penguin-village']) {
    const on = await readGroundZ(browser, track, ''); // default: terrainGrade on
    const off = await readGroundZ(browser, track, '&terrainGrade=0');
    if (!on || !off) { out[track] = { error: 'ground mesh not found' }; continue; }
    if (on.count !== off.count) { out[track] = { error: `count mismatch ${on.count} vs ${off.count}` }; continue; }
    let maxAbsDiff = 0, nonZeroOn = 0, nonZeroOff = 0, diffs = 0;
    for (let i = 0; i < on.count; i += 1) {
      const d = Math.abs(on.z[i] - off.z[i]);
      if (d > maxAbsDiff) maxAbsDiff = d;
      if (d !== 0) diffs += 1;
      if (on.z[i] !== 0) nonZeroOn += 1;
      if (off.z[i] !== 0) nonZeroOff += 1;
    }
    out[track] = { count: on.count, maxAbsDiff, differingVerts: diffs, nonZeroDisplacedVerts_on: nonZeroOn, nonZeroDisplacedVerts_off: nonZeroOff };
  }
  await browser.close();
  server.kill('SIGTERM');
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
})().catch((e) => { console.error(e); server.kill('SIGTERM'); process.exit(1); });
