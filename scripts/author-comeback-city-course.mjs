// Comeback City custom-map course author — custom-comeback-city-pass Stage 1.
// Builds the six-district route from exact straight/arc primitives, closes the
// loop with a Dubins (CSC) return section, validates (length, curvature,
// self-intersection vs elevation separation, marker clearance), renders an
// overhead draft PNG, and with --write emits src/game/courseV2Authored.js.
//
// Districts (progress order):
//   1 ice-plaza        start/finish boulevard
//   2 neon-downtown    S-curve slalom
//   3 crypto-arcade    long straight
//   4 harbor           coastal boardwalk + dare shortcut
//   5 skyline-run      elevated climb/overpass/descent (elevation band)
//   6 comeback-tunnel  covered final descent + last skill corner
//
// Usage: node scripts/author-comeback-city-course.mjs [--write]
import * as THREE from 'three';
import { writeFile, mkdir } from 'node:fs/promises';
import { PNG } from 'pngjs';

const DEG = Math.PI / 180;

// ---------------- authored primitive plan -----------------------------------
// ['straight', len, width] | ['arc', radius, signedDegrees, width]
// signedDegrees: + turns toward +Z when heading 0 (+X); a full CCW-ish loop.
const W = {
  plaza: 56,
  city: 47,
  sweeper: 54,
  arcade: 47,
  harbor: 50,
  skyline: 45,
  tunnel: 44,
};

const buildPrims = (P) => [
  // 1 — Ice Plaza boulevard (start/finish), the north straight heading east.
  { kind: 'straight', len: P.plazaLen || 700, width: W.plaza, district: 'ice-plaza' },
  // 2 — Neon Downtown: down the east side with an S-slalom.
  { kind: 'arc', radius: 170, deg: 90, width: W.city, district: 'neon-downtown' },
  { kind: 'straight', len: 200, width: W.city, district: 'neon-downtown' },
  { kind: 'arc', radius: 140, deg: -50, width: W.city, district: 'neon-downtown' },
  { kind: 'arc', radius: 140, deg: 65, width: W.city, district: 'neon-downtown' },
  { kind: 'straight', len: 150, width: W.city, district: 'neon-downtown' },
  { kind: 'arc', radius: 160, deg: 75, width: W.sweeper, district: 'neon-downtown' },
  // 3 — Crypto Arcade strip: the south straight heading west.
  { kind: 'straight', len: 750, width: W.arcade, district: 'crypto-arcade' },
  // 4 — Harbor: south-west corner up the coast, boardwalk straight, cut inland.
  { kind: 'arc', radius: 170, deg: 90, width: W.sweeper, district: 'harbor' },
  { kind: 'straight', len: P.harborLen, width: W.harbor, district: 'harbor' },
  { kind: 'arc', radius: 150, deg: P.cutDeg, width: W.harbor, district: 'harbor' },
  // 5 — Elevated Skyline Run: climb, high sweeper back east, dive to ground.
  { kind: 'straight', len: P.climbLen, width: W.skyline, district: 'skyline-run' },
  { kind: 'arc', radius: P.swingR, deg: P.swingDeg, width: W.skyline, district: 'skyline-run' },
  { kind: 'straight', len: P.skyStraight, width: W.skyline, district: 'skyline-run' },
  // 6 — Comeback Tunnel + final descent (Dubins return completes the loop).
  { kind: 'arc', radius: 170, deg: P.tunnelArc, width: W.tunnel, district: 'comeback-tunnel' },
  { kind: 'straight', len: P.tunnelLen, width: W.tunnel, district: 'comeback-tunnel' },
];

const DUBINS_RADIUS = 150;

// ---------------- chain building --------------------------------------------
const sampleChain = (PRIMS) => {
  let x = 0;
  let z = 0;
  let heading = 0;
  const pts = [{ x, z }];
  const markers = [];
  let dist = 0;
  const STEP = 10;
  for (const prim of PRIMS) {
    const startDist = dist;
    if (prim.kind === 'straight') {
      const steps = Math.max(1, Math.round(prim.len / STEP));
      for (let i = 0; i < steps; i += 1) {
        x += Math.cos(heading * DEG) * (prim.len / steps);
        z += Math.sin(heading * DEG) * (prim.len / steps);
        dist += prim.len / steps;
        pts.push({ x, z });
      }
    } else {
      const arcLen = prim.radius * Math.abs(prim.deg) * DEG;
      const steps = Math.max(2, Math.round(arcLen / STEP));
      for (let i = 0; i < steps; i += 1) {
        const h0 = heading;
        const h1 = heading + prim.deg / steps;
        // Exact circle step: Δx=R(sin h1−sin h0), Δz=−R(cos h1−cos h0).
        const R = prim.radius * Math.sign(prim.deg);
        x += R * (Math.sin(h1 * DEG) - Math.sin(h0 * DEG));
        z += -R * (Math.cos(h1 * DEG) - Math.cos(h0 * DEG));
        heading = h1;
        dist += arcLen / steps;
        pts.push({ x, z });
      }
    }
    markers.push({ district: prim.district, width: prim.width, startDist, endDist: dist, x, z, heading });
  }
  return { pts, markers, end: { x, z, heading }, dist };
};

// ---------------- Dubins CSC closer -----------------------------------------
// Standard Dubins shortest-path between poses (x,z,headingDeg), radius R.
const mod2pi = (a) => {
  let v = a % (2 * Math.PI);
  if (v < 0) v += 2 * Math.PI;
  return v;
};
const dubinsCSC = (start, goal, R) => {
  // Work in a normalized frame: start at origin heading 0.
  const dx = goal.x - start.x;
  const dz = goal.z - start.z;
  const D = Math.hypot(dx, dz);
  const d = D / R;
  const phi = Math.atan2(dz, dx);
  const alpha = mod2pi(start.heading * DEG - phi);
  const beta = mod2pi(goal.heading * DEG - phi);
  const sa = Math.sin(alpha);
  const sb = Math.sin(beta);
  const ca = Math.cos(alpha);
  const cb = Math.cos(beta);
  const c_ab = Math.cos(alpha - beta);
  const paths = [];
  // LSL
  {
    const tmp = d + sa - sb;
    const p2 = 2 + d * d - 2 * c_ab + 2 * d * (sa - sb);
    if (p2 >= 0) {
      const t = mod2pi(Math.atan2(cb - ca, tmp) - alpha);
      const p = Math.sqrt(p2);
      const q = mod2pi(beta - Math.atan2(cb - ca, tmp));
      paths.push({ type: 'LSL', segs: [t, p, q], length: t + p + q });
    }
  }
  // RSR
  {
    const tmp = d - sa + sb;
    const p2 = 2 + d * d - 2 * c_ab + 2 * d * (sb - sa);
    if (p2 >= 0) {
      const t = mod2pi(alpha - Math.atan2(ca - cb, tmp));
      const p = Math.sqrt(p2);
      const q = mod2pi(-beta + Math.atan2(ca - cb, tmp));
      paths.push({ type: 'RSR', segs: [t, p, q], length: t + p + q });
    }
  }
  // LSR
  {
    const p2 = -2 + d * d + 2 * c_ab + 2 * d * (sa + sb);
    if (p2 >= 0) {
      const p = Math.sqrt(p2);
      const tmp = Math.atan2(-ca - cb, d + sa + sb) - Math.atan2(-2, p);
      const t = mod2pi(tmp - alpha);
      const q = mod2pi(tmp - mod2pi(beta));
      paths.push({ type: 'LSR', segs: [t, p, q], length: t + p + q });
    }
  }
  // RSL
  {
    const p2 = -2 + d * d + 2 * c_ab - 2 * d * (sa + sb);
    if (p2 >= 0) {
      const p = Math.sqrt(p2);
      const tmp = Math.atan2(ca + cb, d - sa - sb) - Math.atan2(2, p);
      const t = mod2pi(alpha - tmp);
      const q = mod2pi(beta - tmp);
      paths.push({ type: 'RSL', segs: [t, p, q], length: t + p + q });
    }
  }
  if (!paths.length) return null;
  paths.sort((a, b) => a.length - b.length);
  return paths[0];
};

const sampleDubins = (start, goal, R, path, pts) => {
  let { x, z } = start;
  let heading = start.heading;
  let dist = 0;
  const STEP = 10;
  const dirs = { L: 1, R: -1, S: 0 };
  for (let s = 0; s < 3; s += 1) {
    const kind = path.type[s];
    const amount = path.segs[s]; // turns in radians (normalized by R), straight in units of R
    if (kind === 'S') {
      const len = amount * R;
      const steps = Math.max(1, Math.round(len / STEP));
      for (let i = 0; i < steps; i += 1) {
        x += Math.cos(heading * DEG) * (len / steps);
        z += Math.sin(heading * DEG) * (len / steps);
        dist += len / steps;
        pts.push({ x, z });
      }
    } else {
      const signedDeg = (amount / DEG) * dirs[kind];
      const arcLen = R * amount;
      const steps = Math.max(2, Math.round(arcLen / STEP));
      for (let i = 0; i < steps; i += 1) {
        const h0 = heading;
        const h1 = heading + signedDeg / steps;
        const Rsigned = R * Math.sign(signedDeg);
        x += Rsigned * (Math.sin(h1 * DEG) - Math.sin(h0 * DEG));
        z += -Rsigned * (Math.cos(h1 * DEG) - Math.cos(h0 * DEG));
        heading = h1;
        dist += arcLen / steps;
        pts.push({ x, z });
      }
    }
  }
  return dist;
};

// ---------------- build + close ---------------------------------------------
// ---------------- evaluation -------------------------------------------------
// Builds chain + dubins close, samples the closed CatmullRom, computes:
// length, bounds, min radius (wide stencil), crossing events with elevation
// separation against a candidate skyline elevation band.
const evaluate = (P, { N = 700, verbose = false } = {}) => {
  const PRIMS = buildPrims(P);
  const { pts, markers, end, dist: chainDist } = sampleChain(PRIMS);
  const goal = { x: 0, z: 0, heading: 0 };
  const dubins = dubinsCSC(end, goal, DUBINS_RADIUS);
  if (!dubins) return null;
  const dubinsDist = sampleDubins(end, goal, DUBINS_RADIUS, dubins, pts);
  pts.pop();
  const totalDist = chainDist + dubinsDist;
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x, 0, p.z)), true, 'catmullrom', 0.38);
  const length = curve.getLength();
  const samples = [];
  for (let i = 0; i < N; i += 1) samples.push(curve.getPointAt(i / N));

  // District progress ranges (from chain distances; dubins = final descent).
  const districtRanges = markers.map((m) => ({
    district: m.district,
    start: m.startDist / totalDist,
    end: m.endDist / totalDist,
  }));

  // Elevation band over the skyline climb..dive span.
  const skyline = districtRanges.filter((d) => d.district === 'skyline-run');
  const bandFrom = skyline[0].start + 0.012;
  const bandTo = skyline[skyline.length - 1].end - 0.008;
  const bandPeak = P.bandPeak || 20;
  const elevationAt = (p) => {
    const w = ((p % 1) + 1) % 1;
    if (w > bandFrom && w < bandTo) {
      const t = (w - bandFrom) / (bandTo - bandFrom);
      return Math.sin(t * Math.PI) * bandPeak;
    }
    return 0;
  };

  // Min radius with a wide stencil (kills sample-noise false positives).
  let minRadius = Infinity;
  let minRadiusProgress = 0;
  for (let i = 0; i < N; i += 1) {
    const a = samples[(i + N - 4) % N];
    const b = samples[i];
    const c = samples[(i + 4) % N];
    const ab = Math.hypot(b.x - a.x, b.z - a.z);
    const bc = Math.hypot(c.x - b.x, c.z - b.z);
    const ca = Math.hypot(a.x - c.x, a.z - c.z);
    const cross = Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x));
    const radius = (ab * bc * ca) / Math.max(cross, 1e-6);
    if (radius < minRadius) {
      minRadius = radius;
      minRadiusProgress = i / N;
    }
  }

  const bounds = samples.reduce(
    (acc, p) => ({ maxX: Math.max(acc.maxX, p.x), maxZ: Math.max(acc.maxZ, p.z), minX: Math.min(acc.minX, p.x), minZ: Math.min(acc.minZ, p.z) }),
    { maxX: -Infinity, maxZ: -Infinity, minX: Infinity, minZ: Infinity }
  );

  // Crossing events: near-misses between distant progress samples.
  const events = [];
  for (let i = 0; i < N; i += 1) {
    for (let j = i + 40; j < N; j += 1) {
      // Skip pairs that are close ACROSS the lap seam (the finish merge is a
      // deliberate tangential join, not a conflict).
      if (i + (N - j) < 40) continue;
      const d = Math.hypot(samples[i].x - samples[j].x, samples[i].z - samples[j].z);
      if (d < 95) {
        const e1 = elevationAt(i / N);
        const e2 = elevationAt(j / N);
        events.push({ p1: i / N, p2: j / N, dist: d, e1, e2, separated: Math.abs(e1 - e2) >= 9 });
      }
    }
  }
  // Cluster.
  const clusters = [];
  for (const ev of events) {
    const last = clusters[clusters.length - 1];
    if (last && ev.p1 - last.p1end < 0.03 && Math.abs(ev.p2 - last.p2end) < 0.03) {
      last.p1end = ev.p1;
      last.p2end = Math.max(last.p2end, ev.p2);
      last.minDist = Math.min(last.minDist, ev.dist);
      last.allSeparated = last.allSeparated && ev.separated;
    } else {
      clusters.push({ p1: ev.p1, p1end: ev.p1, p2: ev.p2, p2end: ev.p2, minDist: ev.dist, allSeparated: ev.separated });
    }
  }
  const bad = clusters.filter((c) => !c.allSeparated && c.minDist < 90);
  const result = {
    P,
    length,
    totalDist,
    dubinsType: dubins.type,
    dubinsDist,
    minRadius,
    minRadiusProgress,
    bounds,
    spanX: bounds.maxX - bounds.minX,
    spanZ: bounds.maxZ - bounds.minZ,
    band: { from: bandFrom, to: bandTo, peak: bandPeak },
    clusters,
    bad,
    districtRanges,
    curve,
    samples,
    pts,
    markers,
    chainDist,
    elevationAt,
  };
  if (verbose) {
    console.log(`chain=${Math.round(chainDist)} dubins=${Math.round(dubinsDist)} (${dubins.type}) total~${Math.round(totalDist)}`);
    markers.forEach((m) =>
      console.log(`  ${m.district.padEnd(16)} p ${(m.startDist / totalDist).toFixed(3)}-${(m.endDist / totalDist).toFixed(3)}  end=(${Math.round(m.x)},${Math.round(m.z)}) h=${Math.round(m.heading)}`)
    );
  }
  return result;
};

const score = (r) => {
  if (!r) return -1e9;
  let s = 0;
  if (r.length < 5000 || r.length > 6400) s -= Math.abs(r.length - 5700);
  if (r.minRadius < 85) s -= (85 - r.minRadius) * 20;
  for (const b of r.bad) s -= (90 - b.minDist) * 10 + 500;
  // Reward exactly 1-2 clean elevation-separated crossings (the overpass set piece).
  const good = r.clusters.filter((c) => c.allSeparated).length;
  s += Math.min(good, 2) * 150;
  return s;
};

// ---------------- modes ------------------------------------------------------
const mode = process.argv.includes('--search') ? 'search' : 'eval';

if (mode === 'search') {
  const grid = [];
  for (const plazaLen of [700, 780])
   for (const harborLen of [300, 340, 380])
    for (const cutDeg of [45, 55, 65])
      for (const climbLen of [220, 300, 380])
        for (const swingR of [200, 240])
          for (const swingDeg of [45, 70, 95])
            for (const skyStraight of [260, 340])
              for (const tunnelArc of [-45, -70, -95])
                for (const tunnelLen of [120, 200])
                  grid.push({ plazaLen, harborLen, cutDeg, climbLen, swingR, swingDeg, skyStraight, tunnelArc, tunnelLen });
  console.log(`searching ${grid.length} combos...`);
  const scored = [];
  for (const P of grid) {
    const r = evaluate(P, { N: 420 });
    if (r) scored.push({ s: score(r), P, r });
  }
  scored.sort((a, b) => b.s - a.s);
  for (const { s, P, r } of scored.slice(0, 12)) {
    console.log(`score=${s.toFixed(0)} len=${Math.round(r.length)} minR=${Math.round(r.minRadius)} bad=${r.bad.length} clean=${r.clusters.filter((c) => c.allSeparated).length} ${JSON.stringify(P)}`);
    r.bad.slice(0, 4).forEach((b) => console.log(`   bad p${b.p1.toFixed(2)}-${b.p1end.toFixed(2)} x p${b.p2.toFixed(2)}-${b.p2end.toFixed(2)} d=${b.minDist.toFixed(0)}`));
  }
  process.exit(0);
}

// eval mode: report the current PRIMS parameters in detail.
const CURRENT = {
  plazaLen: 700,
  harborLen: 380,
  cutDeg: 45,
  climbLen: 380,
  swingR: 200,
  swingDeg: 45,
  skyStraight: 340,
  tunnelArc: -70,
  tunnelLen: 200,
};
const r = evaluate(CURRENT, { N: 2000, verbose: true });
console.log(JSON.stringify({
  length: Math.round(r.length),
  estAutoplayLapSec: +(r.length / 190).toFixed(1),
  minRadius: Math.round(r.minRadius),
  minRadiusAt: +r.minRadiusProgress.toFixed(3),
  spanX: Math.round(r.spanX),
  spanZ: Math.round(r.spanZ),
  bounds: Object.fromEntries(Object.entries(r.bounds).map(([k, v]) => [k, Math.round(v)])),
  band: r.band,
  bad: r.bad,
  cleanCrossings: r.clusters.filter((c) => c.allSeparated),
}, null, 1));

// ---------------- overhead draft render -------------------------------------
// ---------------- authored module emission ----------------------------------
// Marker placement: pads/boxes/coins/bananas must keep ±0.02 mutual clearance
// (race-content-playtest coin-discipline gate) and stay off the overpass
// crossing span + the lap seam.
const CROSSING_PROGRESS = [0.021];
const overlapsCrossing = (p) => CROSSING_PROGRESS.some((c) => Math.abs(p - c) < 0.025);
const markerClear = (p, others, minDelta = 0.021) =>
  others.every((o) => {
    const d = Math.min(Math.abs(p - o), 1 - Math.abs(p - o));
    return d >= minDelta;
  });

const AUTHORED_MARKERS = {
  boostPads: [
    { key: 'plaza-grid-pad', progress: 0.055, side: 0 },
    { key: 'arcade-strip-pad', progress: 0.345, side: 0.14 },
    { key: 'harbor-boardwalk-pad', progress: 0.485, side: 0 },
    { key: 'skyline-crest-pad', progress: 0.645, side: 0 },
    { key: 'final-descent-pad', progress: 0.9, side: -0.16 },
  ],
  itemBoxes: [
    { progress: 0.115, side: -0.18 },
    { progress: 0.135, side: 0.16 },
    { progress: 0.225, side: -0.16 },
    { progress: 0.375, side: 0.18 },
    { progress: 0.515, side: -0.16 },
    { progress: 0.615, side: 0.18 },
    { progress: 0.78, side: -0.18 },
    { progress: 0.955, side: 0.16 },
  ],
  coinRows: [0.085, 0.175, 0.265, 0.44, 0.555, 0.72, 0.83, 0.985],
  bananas: [
    { progress: 0.045, side: -0.18 },
    { progress: 0.1, side: 0.18 },
    { progress: 0.155, side: -0.08 },
    { progress: 0.205, side: 0.22 },
    { progress: 0.255, side: -0.2 },
    { progress: 0.315, side: 0.12 },
    { progress: 0.36, side: -0.18 },
    { progress: 0.41, side: 0.22 },
    { progress: 0.46, side: -0.1 },
    { progress: 0.535, side: 0.16 },
    { progress: 0.585, side: -0.2 },
    { progress: 0.66, side: 0.12 },
    { progress: 0.705, side: -0.16 },
    { progress: 0.76, side: 0.2 },
    { progress: 0.815, side: -0.14 },
    { progress: 0.87, side: 0.18 },
    { progress: 0.925, side: -0.08 },
    { progress: 0.975, side: 0.12 },
  ],
};

const validateMarkers = () => {
  const pads = AUTHORED_MARKERS.boostPads.map((p) => p.progress);
  const boxes = AUTHORED_MARKERS.itemBoxes.map((b) => b.progress);
  const coins = AUTHORED_MARKERS.coinRows;
  const problems = [];
  for (const c of coins) {
    if (!markerClear(c, [...pads, ...boxes])) problems.push(`coin row ${c} crowds a pad/box`);
    if (overlapsCrossing(c)) problems.push(`coin row ${c} on the overpass crossing`);
  }
  for (const p of [...pads, ...boxes]) {
    if (overlapsCrossing(p)) problems.push(`marker ${p} on the overpass crossing`);
  }
  if (AUTHORED_MARKERS.itemBoxes.length !== 8) problems.push('itemBoxes must be 8');
  if (AUTHORED_MARKERS.bananas.length !== 18) problems.push('bananas must be 18');
  return problems;
};

const DISTRICT_META = {
  'ice-plaza': { accent: '#7ee7ff', base: '#3f9fd8', dark: '#1d4d78', icon: 'flag', label: 'ICE PLAZA', roof: '#eafaff' },
  'neon-downtown': { accent: '#ff7ad9', base: '#c14ba4', dark: '#55204e', icon: 'city', label: 'NEON DOWNTOWN', roof: '#ffe3f6' },
  'crypto-arcade': { accent: '#ffd34f', base: '#d8a02c', dark: '#6b4a10', icon: 'bitcoin', label: 'CRYPTO ARCADE', roof: '#fff3c4' },
  harbor: { accent: '#54e0c7', base: '#2a9d8f', dark: '#144a4f', icon: 'anchor', label: 'HARBOR', roof: '#d8fff6' },
  'skyline-run': { accent: '#ffa25e', base: '#d8722c', dark: '#5f3413', icon: 'tower', label: 'SKYLINE RUN', roof: '#ffe8d4' },
  'comeback-tunnel': { accent: '#b49aff', base: '#7a5fd8', dark: '#342464', icon: 'tunnel', label: 'COMEBACK TUNNEL', roof: '#ece4ff' },
};

const emitAuthoredModule = async (r) => {
  const problems = validateMarkers();
  if (problems.length) {
    console.error('MARKER PROBLEMS:', problems);
    process.exit(1);
  }
  const centerline = r.pts.map((p) => ({ x: Math.round(p.x * 10) / 10, z: Math.round(p.z * 10) / 10 }));
  // District anchors: one per district, placed mid-district on the roomier side.
  const districtProgress = {
    'ice-plaza': 0.05,
    'neon-downtown': 0.21,
    'crypto-arcade': 0.35,
    harbor: 0.475,
    'skyline-run': 0.6,
    'comeback-tunnel': 0.71,
  };
  const districtAnchors = r.districtRanges
    .filter((d, i, list) => list.findIndex((e) => e.district === d.district) === i)
    .map((d) => {
      const progress = districtProgress[d.district] ?? (d.start + d.end) / 2;
      const sample = r.curve.getPointAt(progress);
      const tangent = r.curve.getTangentAt(progress);
      const normal = { x: -tangent.z, z: tangent.x };
      // Roomier side: probe both sides for the far side of the map.
      const setback = d.district === 'harbor' ? 96 : 88;
      const probe = (side) => {
        const px = sample.x + normal.x * side * setback;
        const pz = sample.z + normal.z * side * setback;
        let min = Infinity;
        for (let i = 0; i < r.samples.length; i += 4) {
          const s = r.samples[i];
          min = Math.min(min, Math.hypot(s.x - px, s.z - pz));
        }
        return min;
      };
      const side = d.district === 'harbor' ? -1 : probe(1) >= probe(-1) ? 1 : -1;
      return {
        key: d.district,
        ...DISTRICT_META[d.district],
        progress: +progress.toFixed(3),
        side,
        setback,
      };
    });
  // Collision zones: building cores at each district anchor (offset off-road).
  const collisionZones = districtAnchors.map((anchor) => {
    const sample = r.curve.getPointAt(anchor.progress);
    const tangent = r.curve.getTangentAt(anchor.progress);
    const normal = { x: -tangent.z, z: tangent.x };
    return {
      key: `${anchor.key}-block`,
      shape: 'circle',
      position: {
        x: Math.round((sample.x + normal.x * anchor.side * anchor.setback * 0.82) * 10) / 10,
        z: Math.round((sample.z + normal.z * anchor.side * anchor.setback * 0.82) * 10) / 10,
      },
      radius: 30,
    };
  });
  // Scenery: harbor water west of the boardwalk + plaza water feature.
  const sceneryAnchors = [
    { kind: 'water', x: -460, z: 520, w: 560, d: 420, color: '#0ea5c8' },
    { kind: 'water', x: -380, z: -420, w: 420, d: 300, color: '#0e9fc4' },
  ];
  const surfaceZones = [
    { key: 'plaza-asphalt', type: 'asphalt', progress: 0.05, radius: 160 },
    { key: 'arcade-wet-spill', type: 'wet', progress: 0.36, side: -8, radius: 16 },
    { key: 'skyline-grip', type: 'asphalt', progress: 0.6, radius: 90 },
    { key: 'tunnel-damp', type: 'wet', progress: 0.72, side: 7, radius: 15 },
    { key: 'harbor-salt-edge', type: 'offroad', progress: 0.5, side: 31, radius: 26 },
  ];
  const cameraCheckpoints = [
    { key: 'mobile-start', profile: 'mobile', progress: 0.04, targetBandFromBottom: [0.25, 0.33] },
    { key: 'desktop-start', profile: 'desktop', progress: 0.04, targetBandFromBottom: [0.14, 0.22] },
    { key: 'skyline-reveal', profile: 'all', progress: 0.58 },
    { key: 'camera-near-tunnel', profile: 'all', progress: 0.71, collisionClearanceMin: 1.5 },
  ];
  // Harbor dare shortcut: jump the harbor cut from the boardwalk onto the
  // skyline climb. Same risk shape as the retired carousel dare.
  const shortcut = {
    failFlightTime: 0.85,
    failLandProgress: 0.545,
    failSpeed: 40,
    failSpin: 1.8,
    flightTime: 1.5,
    landProgress: 0.605,
    launchProgress: 0.495,
    minSpeed: 232,
    peakHeight: 24,
    side: -0.7,
  };
  const module = `// GENERATED by scripts/author-comeback-city-course.mjs (${new Date().toISOString()})
// custom-comeback-city-pass Stage 1 — do not hand-edit; regenerate with
//   node scripts/author-comeback-city-course.mjs --write
// Route: six authored districts, one closed loop, one elevation-separated
// overpass (skyline run crosses the ice-plaza boulevard), Dubins final return.
export const COMEBACK_CITY_AUTHORED = Object.freeze(${JSON.stringify(
    {
      centerline,
      districtAnchors,
      collisionZones,
      sceneryAnchors,
      surfaceZones,
      cameraCheckpoints,
      boostPads: AUTHORED_MARKERS.boostPads,
      itemBoxes: AUTHORED_MARKERS.itemBoxes,
      bananaPlacements: AUTHORED_MARKERS.bananas,
      coinRows: AUTHORED_MARKERS.coinRows,
      roadRibbons: r.districtRanges.length ? buildRibbons(r) : [],
      elevation: { bridgeBand: { from: +r.band.from.toFixed(4), to: +r.band.to.toFixed(4), peak: r.band.peak }, crestLaunch: true },
      shortcut,
      worldBounds: {
        minX: Math.round(r.bounds.minX - 140),
        maxX: Math.round(r.bounds.maxX + 140),
        minZ: Math.round(r.bounds.minZ - 140),
        maxZ: Math.round(r.bounds.maxZ + 140),
      },
      metrics: {
        length: Math.round(r.length),
        estAutoplayLapSec: +(r.length / 190).toFixed(1),
        spanX: Math.round(r.spanX),
        spanZ: Math.round(r.spanZ),
        dubins: r.dubinsType,
        districts: r.districtRanges.map((d) => ({ key: d.district, start: +d.start.toFixed(3), end: +d.end.toFixed(3) })),
      },
    },
    null,
    1
  )});
`;
  const outPath = new URL('../src/game/courseV2Authored.js', import.meta.url).pathname;
  await writeFile(outPath, module);
  console.log(`wrote ${outPath} (${centerline.length} centerline points)`);
};

// Width ribbons from the authored district ranges (+ dubins final descent).
const buildRibbons = (r) => {
  const widths = { 'ice-plaza': [56, 7], 'neon-downtown': [47, 6], 'crypto-arcade': [47, 6], harbor: [50, 6.5], 'skyline-run': [45, 5.5], 'comeback-tunnel': [44, 5.5] };
  // Merge consecutive ranges of the same district.
  const merged = [];
  for (const d of r.districtRanges) {
    const last = merged[merged.length - 1];
    if (last && last.district === d.district) last.end = d.end;
    else merged.push({ ...d });
  }
  const ribbons = merged.map((d) => {
    const [width, shoulderWidth] = widths[d.district] || [47, 6];
    return { key: d.district, role: 'main', width, shoulderWidth, startProgress: +d.start.toFixed(4), endProgress: +d.end.toFixed(4) };
  });
  // Dubins final descent: last skill corner + finish approach.
  ribbons.push({ key: 'final-descent', role: 'main', width: 48, shoulderWidth: 6, startProgress: ribbons[ribbons.length - 1].endProgress, endProgress: 1 });
  return ribbons;
};

if (process.argv.includes('--write')) {
  await emitAuthoredModule(r);
}

// ---------------- overhead draft render -------------------------------------
const renderOverhead = async (outPath) => {
  const { bounds, samples, markers, chainDist, totalDist } = r;
  const N = samples.length;
  const pad = 120;
  const scale = 0.62;
  const w = Math.ceil((bounds.maxX - bounds.minX + pad * 2) * scale);
  const h = Math.ceil((bounds.maxZ - bounds.minZ + pad * 2) * scale);
  const png = new PNG({ width: w, height: h });
  const px = (x, z) => [Math.round((x - bounds.minX + pad) * scale), Math.round((z - bounds.minZ + pad) * scale)];
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 18;
    png.data[i + 1] = 20;
    png.data[i + 2] = 30;
    png.data[i + 3] = 255;
  }
  const dot = (x, z, rr, g, b, size = 2) => {
    const [cx, cy] = px(x, z);
    for (let dy = -size; dy <= size; dy += 1)
      for (let dx = -size; dx <= size; dx += 1) {
        const X = cx + dx;
        const Y = cy + dy;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        const o = (Y * w + X) * 4;
        png.data[o] = rr;
        png.data[o + 1] = g;
        png.data[o + 2] = b;
      }
  };
  const DISTRICT_HUES = { 'ice-plaza': [160, 220, 255], 'neon-downtown': [255, 120, 220], 'crypto-arcade': [255, 210, 80], harbor: [80, 220, 200], 'skyline-run': [255, 150, 80], 'comeback-tunnel': [180, 160, 255], dubins: [120, 255, 140] };
  const districtAt = (progress) => {
    const d = progress * totalDist;
    if (d > chainDist) return 'dubins';
    for (const m of markers) if (d >= m.startDist && d < m.endDist) return m.district;
    return 'dubins';
  };
  for (let i = 0; i < N; i += 1) {
    const [rr, g, b] = DISTRICT_HUES[districtAt(i / N)] || [255, 255, 255];
    dot(samples[i].x, samples[i].z, rr, g, b, 2);
  }
  dot(samples[0].x, samples[0].z, 255, 255, 255, 5);
  await mkdir(new URL('../tmp/custom-comeback-city-pass/stage1/', import.meta.url).pathname, { recursive: true }).catch(() => {});
  await writeFile(outPath, PNG.sync.write(png));
  console.log(`overhead: ${outPath} (${w}x${h})`);
};
await renderOverhead(new URL('../tmp/custom-comeback-city-pass/stage1/route-draft.png', import.meta.url).pathname);
