// Renders the labeled overhead route map for the authored Comeback City
// custom course: legal driving envelope, centerline, district spans, boost
// pads, item boxes, coin rows, shortcut, start/finish, elevation band.
// Output: SVG + PNG (rasterized via headless chromium).
// Usage: node scripts/render-course-overhead.mjs [outBase]
import * as THREE from 'three';
import { writeFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { COMEBACK_CITY_AUTHORED } from '../src/game/courseV2Authored.js';

const outBase = process.argv[2] || 'tmp/custom-comeback-city-pass/stage1/overhead-route-map';

const curve = new THREE.CatmullRomCurve3(
  COMEBACK_CITY_AUTHORED.centerline.map((p) => new THREE.Vector3(p.x, 0, p.z)),
  true,
  'catmullrom',
  0.38
);
const length = curve.getLength();

// Width table mirroring the runtime (makeWidthTable: ribbons + 14 smoothing passes).
const widthTable = (() => {
  const N = 224;
  const ribbons = COMEBACK_CITY_AUTHORED.roadRibbons;
  const table = new Float64Array(N);
  for (let i = 0; i < N; i += 1) {
    const p = i / N;
    const ribbon = ribbons.find((r) => p >= r.startProgress && p < r.endProgress) || ribbons[ribbons.length - 1];
    table[i] = ribbon.width;
  }
  for (let pass = 0; pass < 14; pass += 1) {
    const copy = Float64Array.from(table);
    for (let i = 0; i < N; i += 1) table[i] = (copy[(i + N - 1) % N] + copy[i] * 2 + copy[(i + 1) % N]) / 4;
  }
  return table;
})();
const widthAt = (p) => widthTable[Math.floor((((p % 1) + 1) % 1) * widthTable.length) % widthTable.length];

const N = 720;
const left = [];
const right = [];
const center = [];
for (let i = 0; i < N; i += 1) {
  const p = i / N;
  const c = curve.getPointAt(p);
  const t = curve.getTangentAt(p);
  const n = { x: -t.z, z: t.x };
  const half = (widthAt(p) * 0.44) + 3.2; // legal lane envelope incl. curb band
  center.push(c);
  left.push({ x: c.x + n.x * half, z: c.z + n.z * half });
  right.push({ x: c.x - n.x * half, z: c.z - n.z * half });
}

const bounds = center.reduce(
  (acc, p) => ({ maxX: Math.max(acc.maxX, p.x), maxZ: Math.max(acc.maxZ, p.z), minX: Math.min(acc.minX, p.x), minZ: Math.min(acc.minZ, p.z) }),
  { maxX: -Infinity, maxZ: -Infinity, minX: Infinity, minZ: Infinity }
);
const pad = 90;
const W = 1400;
const scale = W / (bounds.maxX - bounds.minX + pad * 2);
const H = Math.ceil((bounds.maxZ - bounds.minZ + pad * 2) * scale);
const X = (x) => ((x - bounds.minX + pad) * scale).toFixed(1);
const Z = (z) => ((z - bounds.minZ + pad) * scale).toFixed(1);

const polyline = (pts) => pts.map((p) => `${X(p.x)},${Z(p.z)}`).join(' ');
const envelopePath = `${polyline(left)} ${right.slice().reverse().map((p) => `${X(p.x)},${Z(p.z)}`).join(' ')}`;

const DISTRICT_COLORS = {
  'ice-plaza': '#7ee7ff',
  'neon-downtown': '#ff7ad9',
  'crypto-arcade': '#ffd34f',
  harbor: '#54e0c7',
  'skyline-run': '#ffa25e',
  'comeback-tunnel': '#b49aff',
  'final-descent': '#9df08a',
};
const districts = COMEBACK_CITY_AUTHORED.metrics.districts;
const band = COMEBACK_CITY_AUTHORED.elevation.bridgeBand;

const districtArc = (from, to, color) => {
  const pts = [];
  for (let i = 0; i <= 60; i += 1) {
    const p = from + ((to - from) * i) / 60;
    pts.push(curve.getPointAt(((p % 1) + 1) % 1));
  }
  return `<polyline points="${polyline(pts)}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" opacity="0.95"/>`;
};

const markerAt = (progress, side = 0) => {
  const c = curve.getPointAt(progress);
  const t = curve.getTangentAt(progress);
  const n = { x: -t.z, z: t.x };
  const off = side * widthAt(progress) * 0.44;
  return { x: c.x + n.x * off, z: c.z + n.z * off };
};

const labels = [];
const LABEL_POS = {
  'ice-plaza': [0.06, -60],
  'neon-downtown': [0.2, 60],
  'crypto-arcade': [0.35, 60],
  harbor: [0.48, -70],
  'skyline-run': [0.6, -70],
  'comeback-tunnel': [0.71, 40],
  'final-descent': [0.87, -60],
};
for (const d of districts) {
  const [p, dy] = LABEL_POS[d.key] || [(d.start + d.end) / 2, 50];
  const c = curve.getPointAt(p);
  labels.push(`<text x="${X(c.x)}" y="${+Z(c.z) + dy}" fill="${DISTRICT_COLORS[d.key] || '#fff'}" font-size="26" font-weight="700" text-anchor="middle" style="paint-order:stroke" stroke="#12141e" stroke-width="6">${d.key.toUpperCase().replace('-', ' ')}</text>`);
}

const pads = COMEBACK_CITY_AUTHORED.boostPads
  .map((p) => {
    const m = markerAt(p.progress, p.side);
    return `<rect x="${+X(m.x) - 10}" y="${+Z(m.z) - 6}" width="20" height="12" rx="3" fill="#ff9d2e" stroke="#12141e" stroke-width="2"/>`;
  })
  .join('');
const boxes = COMEBACK_CITY_AUTHORED.itemBoxes
  .map((b) => {
    const m = markerAt(b.progress, b.side);
    return `<rect x="${+X(m.x) - 6}" y="${+Z(m.z) - 6}" width="12" height="12" fill="#54c8ff" stroke="#12141e" stroke-width="2" transform="rotate(45 ${X(m.x)} ${Z(m.z)})"/>`;
  })
  .join('');
const coins = COMEBACK_CITY_AUTHORED.coinRows
  .map((p) => {
    const m = markerAt(p, 0);
    return `<circle cx="${X(m.x)}" cy="${Z(m.z)}" r="7" fill="#ffd34f" stroke="#12141e" stroke-width="2"/>`;
  })
  .join('');
const sc = COMEBACK_CITY_AUTHORED.shortcut;
const scLaunch = markerAt(sc.launchProgress, sc.side * 0.5);
const scLand = markerAt(sc.landProgress, 0);
const shortcutSvg = `
  <line x1="${X(scLaunch.x)}" y1="${Z(scLaunch.z)}" x2="${X(scLand.x)}" y2="${Z(scLand.z)}" stroke="#ff5d4f" stroke-width="5" stroke-dasharray="14 10"/>
  <circle cx="${X(scLaunch.x)}" cy="${Z(scLaunch.z)}" r="10" fill="#ff5d4f" stroke="#12141e" stroke-width="2"/>
  <text x="${X(scLaunch.x)}" y="${+Z(scLaunch.z) - 18}" fill="#ff5d4f" font-size="20" font-weight="700" text-anchor="middle" style="paint-order:stroke" stroke="#12141e" stroke-width="5">DARE SHORTCUT</text>`;
const start = curve.getPointAt(0);
const startT = curve.getTangentAt(0);
const startN = { x: -startT.z, z: startT.x };
const startSvg = `
  <line x1="${X(start.x + startN.x * 30)}" y1="${Z(start.z + startN.z * 30)}" x2="${X(start.x - startN.x * 30)}" y2="${Z(start.z - startN.z * 30)}" stroke="#ffffff" stroke-width="8"/>
  <text x="${X(start.x)}" y="${+Z(start.z) - 24}" fill="#ffffff" font-size="24" font-weight="800" text-anchor="middle" style="paint-order:stroke" stroke="#12141e" stroke-width="6">START / FINISH</text>`;
// Elevation band ticks
const elevPts = [];
for (let i = 0; i <= 40; i += 1) elevPts.push(curve.getPointAt(band.from + ((band.to - band.from) * i) / 40));
const elevSvg = `<polyline points="${polyline(elevPts)}" fill="none" stroke="#ffffff" stroke-width="15" opacity="0.35" stroke-linecap="round"/>
  <text x="${X(curve.getPointAt((band.from + band.to) / 2).x)}" y="${+Z(curve.getPointAt((band.from + band.to) / 2).z) - 34}" fill="#ffffff" font-size="19" font-weight="700" text-anchor="middle" style="paint-order:stroke" stroke="#12141e" stroke-width="5">ELEVATED OVERPASS (peak ${band.peak}u)</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + 130}" viewBox="0 0 ${W} ${H + 130}">
  <rect width="${W}" height="${H + 130}" fill="#12141e"/>
  <text x="${W / 2}" y="42" fill="#ffffff" font-size="30" font-weight="800" text-anchor="middle">COMEBACK CITY — CUSTOM MAP · AUTHORED ROUTE (lap ${Math.round(length)}u, 3 laps)</text>
  <g transform="translate(0,70)">
  <polygon points="${envelopePath}" fill="#232a44" stroke="none"/>
  ${districts.map((d) => districtArc(d.start, d.end, DISTRICT_COLORS[d.key] || '#fff')).join('')}
  ${elevSvg}
  ${pads}${boxes}${coins}${shortcutSvg}${startSvg}
  ${labels.join('')}
  </g>
  <g transform="translate(24,${H + 84})" font-size="18" fill="#dfe6f5">
    <rect x="0" y="-14" width="18" height="10" rx="2" fill="#ff9d2e"/><text x="26" y="-4">boost pad</text>
    <rect x="140" y="-16" width="14" height="14" fill="#54c8ff" transform="rotate(45 147 -9)"/><text x="166" y="-4">item box</text>
    <circle cx="300" cy="-9" r="8" fill="#ffd34f"/><text x="316" y="-4">coin row</text>
    <line x1="440" y1="-9" x2="486" y2="-9" stroke="#ff5d4f" stroke-width="5" stroke-dasharray="12 8"/><text x="496" y="-4">harbor dare shortcut</text>
    <rect x="700" y="-18" width="22" height="16" fill="#232a44" stroke="#5a6488" stroke-width="1"/><text x="732" y="-4">legal driving envelope</text>
    <line x1="930" y1="-9" x2="990" y2="-9" stroke="#ffffff" stroke-width="10" opacity="0.4"/><text x="1000" y="-4">elevated band</text>
  </g>
</svg>`;
await mkdir(outBase.split('/').slice(0, -1).join('/'), { recursive: true });
await writeFile(`${outBase}.svg`, svg);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H + 130 } });
await page.goto(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
await page.screenshot({ path: `${outBase}.png` });
await browser.close();
console.log(`wrote ${outBase}.svg / .png  length=${Math.round(length)}`);
