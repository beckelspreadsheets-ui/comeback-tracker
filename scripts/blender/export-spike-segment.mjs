// Exports a centerline segment (the gym sweeper) as world-space samples for
// the Blender bake spike. The spline data stays the single source of truth —
// the baked shell is built around the exact gameplay geometry.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { COMEBACK_CITY_COURSE_V2 } from '../../src/game/courseV2.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wrap01 = (value) => ((value % 1) + 1) % 1;

// Matches the runtime: elevation bands keyed to progress.
const BRIDGE_BAND = { from: 0.52, peak: 16, to: 0.75 };
const getElevation = (progress) => {
  const p = wrap01(progress);
  if (p > BRIDGE_BAND.from && p < BRIDGE_BAND.to) {
    const t = (p - BRIDGE_BAND.from) / (BRIDGE_BAND.to - BRIDGE_BAND.from);
    return Math.sin(t * Math.PI) * BRIDGE_BAND.peak;
  }
  if (p > 0.83 && p < 0.93) {
    const t = (p - 0.83) / 0.1;
    return Math.sin(t * Math.PI) * 4.2;
  }
  return 0;
};

const points = COMEBACK_CITY_COURSE_V2.centerline.map(
  (point, index, list) => new THREE.Vector3(point.x, getElevation(index / list.length), point.z)
);
const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.38);
const length = curve.getLength();

const FROM = 0.055;
const TO = 0.165;
const SAMPLES = 56;
const samples = [];
for (let index = 0; index <= SAMPLES; index += 1) {
  const progress = FROM + (TO - FROM) * (index / SAMPLES);
  const center = curve.getPointAt(wrap01(progress));
  center.y = getElevation(progress);
  const tangent = curve.getTangentAt(wrap01(progress));
  tangent.y = 0;
  tangent.normalize();
  const ahead = curve.getTangentAt(wrap01(progress + 3 / length));
  ahead.y = 0;
  ahead.normalize();
  const normal = { x: -tangent.z, z: tangent.x };
  const curvature = ((ahead.x - tangent.x) * normal.x + (ahead.z - tangent.z) * normal.z) / 3;
  samples.push({
    curvature,
    nx: normal.x,
    nz: normal.z,
    x: center.x,
    y: center.y,
    z: center.z,
  });
}

const payload = {
  from: FROM,
  roadWidth: COMEBACK_CITY_COURSE_V2.mainRoadWidth || 50,
  samples,
  to: TO,
  trackLength: length,
};
const out = path.join(__dirname, '../../tmp/baked-spike/segment.json');
await writeFile(out, JSON.stringify(payload, null, 1));
console.log('wrote', out, 'samples:', samples.length);
