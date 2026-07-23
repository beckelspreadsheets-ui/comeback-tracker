// M3 frozen comparison sheet (Ordinals rebuild): objective proof that the
// Inscription Circuit shares NO visual/topology basis with Comeback City or
// Penguin Village. Emits docs/evidence/m3/comparison-sheet.html with:
//   1. normalized centerline SVG overlays of all three tracks + geometry stats
//   2. retired-map proof frames vs new district frames (visual language)
//   3. palette swatch comparison
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMEBACK_CITY_TRACK } from '../src/game/race/tracks/comebackCity.js';
import { PENGUIN_VILLAGE_TRACK, PENGUIN_VILLAGE_GEOMETRY } from '../src/game/race/tracks/penguinVillage.js';
import { INSCRIPTION_CIRCUIT_TRACK, INSCRIPTION_CIRCUIT_GEOMETRY } from '../src/game/race/tracks/inscriptionCircuit.js';
import { validateCenterline } from '../src/game/race/tracks/buildCenterline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'docs', 'evidence', 'm3');

const ccGeometry = validateCenterline(COMEBACK_CITY_TRACK.course.centerline);

const svgFor = (points, color) => {
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const w = maxX - minX;
  const h = maxZ - minZ;
  const scale = 300 / Math.max(w, h);
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${((p.x - minX) * scale + 8).toFixed(1)},${((p.z - minZ) * scale + 8).toFixed(1)}`)
    .join(' ');
  return `<svg width="${(w * scale + 16).toFixed(0)}" height="${(h * scale + 16).toFixed(0)}" viewBox="0 0 ${(w * scale + 16).toFixed(0)} ${(h * scale + 16).toFixed(0)}" style="background:#0d0a1c"><path d="${d} Z" fill="none" stroke="${color}" stroke-width="3"/></svg>`;
};

const statsFor = (name, geometry, extra) =>
  `<tr><td>${name}</td><td>${geometry.length}</td><td>${geometry.minRadius}</td><td>${geometry.points}</td><td>${geometry.selfIntersections}</td><td>${extra}</td></tr>`;

const swatch = (hex, label) =>
  `<span style="display:inline-block;margin:2px 6px 2px 0"><span style="display:inline-block;width:18px;height:18px;background:${hex};border:1px solid #555;vertical-align:middle"></span> <small>${label}</small></span>`;

const figure = (src, caption) =>
  `<figure style="margin:0;border:1px solid #333;background:#111"><img src="${src}" style="display:block;width:100%" alt="${caption}"><figcaption style="padding:8px 10px;font-size:13px">${caption}</figcaption></figure>`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>M3 — Inscription Circuit vs retired maps</title>
<style>body{margin:0;background:#0b0916;color:#e8e4f4;font:14px system-ui,sans-serif}main{max-width:1200px;margin:0 auto;padding:24px}h1{font-size:20px}h2{font-size:15px;margin-top:32px;text-transform:uppercase;letter-spacing:.12em;color:#b08aff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:14px}td,th{padding:4px 10px;border-bottom:1px solid #2a2440;text-align:left;font-size:13px}</style></head>
<body><main>
<h1>M3 frozen comparison — Inscription Circuit vs Comeback City / Penguin Village</h1>
<p>Generated ${new Date().toISOString()} from the live track definitions. The retired maps remain in the repo only as rejection evidence and legacy test fixtures.</p>

<h2>1 · Topology (normalized centerlines, same scale method)</h2>
<div class="grid">
${figure('', '')}
<div>${svgFor(COMEBACK_CITY_TRACK.course.centerline, '#e94d3f')}<p>Comeback City (retired) — city-grid loop, central bridge</p></div>
<div>${svgFor(PENGUIN_VILLAGE_TRACK.course.centerline, '#00d5ff')}<p>Penguin Village (retired) — dented oval</p></div>
<div>${svgFor(INSCRIPTION_CIRCUIT_TRACK.course.centerline, '#2ee6c8')}<p>Inscription Circuit (NEW) — straight + east sweep + north pinch + west climb</p></div>
</div>
<table><tr><th>track</th><th>length</th><th>min radius</th><th>points</th><th>self-intersections</th><th>signature</th></tr>
${statsFor('comeback-city (retired)', ccGeometry, 'grid + bridge')}
${statsFor('penguin-village (retired)', PENGUIN_VILLAGE_GEOMETRY, 'oval + dent')}
${statsFor('inscription-circuit (NEW)', INSCRIPTION_CIRCUIT_GEOMETRY, '3 districts + mesa crest + shortcut')}
</table>

<h2>2 · Visual language (retired proofs vs new world)</h2>
<div class="grid">
${figure('../../../src/assets/game/proof/comeback-city-kart-proof-desktop-v1.png', 'RETIRED Comeback City proof (neon-deco city)')}
${figure('launch-straight.png', 'NEW Launch Yard — runway gantries, strip lights, dusk spaceport')}
${figure('wharf-switchbacks.png', 'NEW Blackflag Wharf — timber masts, lantern gold, harbor water')}
${figure('mesa-arch.png', 'NEW Layer23 Mesa — violet rock, stone arches, gold beacons')}
${figure('mesa-crest.png', 'NEW mesa crest jump — signature airtime')}
${figure('legibility-gfx-off.png', 'NEW racing line with effects OFF (legibility gate)')}
</div>

<h2>3 · Palette</h2>
<p>Retired CC: ${swatch('#e94d3f', 'barrier red')} ${swatch('#36e2ff', 'neon cyan')} ${swatch('#6fc663', 'park green')} ${swatch('#c04a6e', 'magenta dusk')}
Retired PV: ${swatch('#eaf4fa', 'snow')} ${swatch('#00e5ff', 'ice cyan')} ${swatch('#58c8f1', 'arctic sky')}</p>
<p>NEW Inscription Circuit: ${swatch('#2a2438', 'carved stone')} ${swatch('#2ee6c8', 'runway teal')} ${swatch('#ff8b21', 'runway orange')} ${swatch('#ffb23e', 'lantern gold')} ${swatch('#b08aff', 'mesa violet')} ${swatch('#ffd34f', 'beacon gold')} ${swatch('#d43a2e', 'flag red')}</p>
</main></body></html>`;

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'comparison-sheet.html'), html);
console.log('comparison sheet written to docs/evidence/m3/comparison-sheet.html');
console.log(JSON.stringify({ comebackCity: ccGeometry, penguinVillage: PENGUIN_VILLAGE_GEOMETRY, inscriptionCircuit: INSCRIPTION_CIRCUIT_GEOMETRY }));
