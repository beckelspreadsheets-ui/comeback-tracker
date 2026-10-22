// Ground clearance gate: the infield ground must never rise above the road
// surface anywhere in the road's footprint (deck + welded kerb/run-off/verge).
//
// WHY THIS EXISTS. Owner report 2026-10-15: "when you drove through the snow
// it like distorted your character". Penguin Village's bayfront valley (amp
// -28) had white snow wedges standing across the road at p0.38-0.43 — the
// ground plane's terrain ramp started inside the road footprint, and its
// 38-unit triangles tilted up through the asphalt, so the kart and driver
// were sliced by the snow surface as they drove through. The earlier Z-mirror
// fix (b9d0743d) checked the CENTRELINE only; the wedges were at the edges and
// shoulders, which a centreline probe cannot see.
//
// This runs src/game/race/render/groundTerrain.js — the module the runtime
// uses — over the real ground grid (same size, same pitch, same triangle
// split as THREE.PlaneGeometry) and interpolates each triangle exactly as the
// GPU does, then probes the road footprint every unit along and across it.
//
//   node scripts/test-ground-clearance.mjs            # gate (exit 1 on fail)
//   node scripts/test-ground-clearance.mjs --legacy   # the pre-fix follow, to
//                                                     # show what it caught
//
// The sampler is the previewer's mirror of the runtime's (mirror-checked
// against the monolith's source), imported rather than copied again.
import { makeSampler, mirrorCheck } from './track-layout-preview.mjs';
import { ALL_TRACKS } from '../src/game/race/tracks/index.js';
import { roadEdgeSection } from '../src/game/race/render/buildRoadEdgeProfile.js';
import {
  GROUND_BASE_Y,
  createGroundTerrain,
  groundPlaneLayout,
  measureTrackHalfExtent,
} from '../src/game/race/render/groundTerrain.js';

const LEGACY = process.argv.includes('--legacy');
// The visible surface over the footprint, relative to the elevation: the
// crowned deck (ROAD_LIFT - ROAD_CROWN * lane^2, mirrored from the runtime's
// crownAt) out to lane 1, then the welded edge profile from the deck's edge
// to the barrier's inner face. The barrier's own back face is meant to be
// buried (footDrop), so the footprint stops at the wall.
const ROAD_LIFT = 0.05;
const ROAD_CROWN = 0.07;
const surfaceYAt = (lane, section, outward) => {
  if (Math.abs(lane) <= 1) return ROAD_LIFT - ROAD_CROWN * lane * lane;
  const edgeY = ROAD_LIFT - ROAD_CROWN;
  for (let index = 1; index <= 6; index += 1) {
    if (outward <= section[index].u) {
      const span = section[index].u - section[index - 1].u;
      const t = span > 0 ? (outward - section[index - 1].u) / span : 1;
      return edgeY + section[index - 1].y + (section[index].y - section[index - 1].y) * t;
    }
  }
  return edgeY + section[6].y;
};
// Curb width the runtime uses when a track has no visual-road bands
// (curbWidthAt's fallback), which is the case for both shipped tracks.
const SHIPPED_CURB_WIDTH = 3.4;
const STEP_ALONG = 1;
const STEP_ACROSS = 1;

const smoothstep01 = (value) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};

// The follow as it shipped before this fix (runtime lines replaced by
// groundTerrain.js): one fade for relief AND terrain, flat only out to
// widestHalfRoad + 16. Kept here only so --legacy can show the failure.
const createLegacyTerrain = ({ bridgeBand, centreAt, length, widthAt }) => {
  const samples = Math.min(1200, Math.max(128, Math.round(length / 11)));
  const pts = [];
  let widestHalfRoad = 0;
  for (let i = 0; i < samples; i += 1) {
    const c = centreAt(i / samples);
    pts.push(c);
    widestHalfRoad = Math.max(widestHalfRoad, widthAt(i / samples) * 0.44);
  }
  const clearInner = widestHalfRoad + 16;
  const clearOuter = clearInner + 40;
  const result = { displaceFade: 1, reliefFade: 1, terrainLift: 0 };
  return {
    solve(x, z) {
      let nearest = Infinity;
      let nearestSample = -1;
      for (let i = 0; i < samples; i += 1) {
        const d = (x - pts[i].x) ** 2 + (z - pts[i].z) ** 2;
        if (d < nearest) {
          nearest = d;
          nearestSample = i;
        }
      }
      const fade = nearest > clearOuter * clearOuter ? 1 : smoothstep01((Math.sqrt(nearest) - clearInner) / (clearOuter - clearInner));
      result.reliefFade = fade;
      result.displaceFade = fade;
      result.terrainLift = 0;
      if (nearest < clearOuter * clearOuter) {
        const p = nearestSample / samples;
        const bridge = bridgeBand && p > bridgeBand.from && p < bridgeBand.to;
        if (!bridge) result.terrainLift = pts[nearestSample].y * (1 - fade);
      }
      return result;
    },
  };
};

const checkTrack = (trackDef) => {
  const sampler = makeSampler(trackDef);
  const centreAt = (progress) => sampler.pointAt(progress, 0);
  const section = roadEdgeSection({ curbWidth: SHIPPED_CURB_WIDTH });
  const edgeReach = section[section.length - 1].u;
  // The footprint the ground must clear ends at the barrier's inner face; the
  // barrier's back face is meant to be buried (footDrop).
  const footprintReach = section[6].u;
  const bridgeBand = trackDef.elevation?.bridgeBand || null;
  const options = { bridgeBand, centreAt, edgeReach, fill: trackDef.elevation?.fill || null, length: sampler.length, widthAt: sampler.widthAt };
  const terrain = LEGACY ? createLegacyTerrain(options) : createGroundTerrain(options);
  const reliefDisplace = trackDef.palette?.ground?.relief?.displace ?? 0.3;

  const { segments, size } = groundPlaneLayout(measureTrackHalfExtent(centreAt, sampler.length));
  const pitch = size / segments;
  const half = size / 2;
  const row = segments + 1;
  // World y of every vertex. The relief displacement's sign comes from noise
  // the runtime evaluates; this takes its WORST case (+amplitude) everywhere,
  // so a pass here holds whatever the noise does.
  const heights = new Float32Array(row * row);
  for (let iy = 0; iy <= segments; iy += 1) {
    for (let ix = 0; ix <= segments; ix += 1) {
      const x = ix * pitch - half;
      const localY = half - iy * pitch;
      const solved = terrain.solve(x, -localY);
      heights[iy * row + ix] = GROUND_BASE_Y + solved.terrainLift + reliefDisplace * solved.displaceFade;
    }
  }
  // THREE.PlaneGeometry's split: quad (ix, iy) is triangles (a, b, d) and
  // (b, c, d) with a=(ix,iy) b=(ix,iy+1) c=(ix+1,iy+1) d=(ix+1,iy), local y
  // falling with iy. World z is the NEGATED local y (the -90deg X rotation).
  const groundYAt = (x, z) => {
    const gx = (x + half) / pitch;
    const gy = (half + z) / pitch;
    const ix = Math.min(segments - 1, Math.max(0, Math.floor(gx)));
    const iy = Math.min(segments - 1, Math.max(0, Math.floor(gy)));
    const fx = gx - ix;
    const fy = gy - iy;
    const a = heights[iy * row + ix];
    const b = heights[(iy + 1) * row + ix];
    const c = heights[(iy + 1) * row + ix + 1];
    const d = heights[iy * row + ix + 1];
    if (fx + fy <= 1) return a + (d - a) * fx + (b - a) * fy;
    return c + (b - c) * (1 - fx) + (d - c) * (1 - fy);
  };

  let worst = { penetration: -Infinity };
  let probes = 0;
  let buried = 0;
  const buriedProgress = new Set();
  // The other direction: just behind the barrier the ground has to reach the
  // barrier's buried back face (footDrop below the road edge), or there is
  // daylight under the wall. Bridge-band samples are a deck over a gap and
  // are allowed to stand clear of the ground.
  const barrierBack = section[section.length - 1];
  let worstGap = { gap: -Infinity };
  let gaps = 0;
  const steps = Math.ceil(sampler.length / STEP_ALONG);
  for (let step = 0; step < steps; step += 1) {
    const progress = step / steps;
    const width = sampler.widthAt(progress);
    const laneScale = width * 0.44;
    const reach = laneScale + footprintReach;
    const elevation = sampler.elevationAt(progress);
    const onBridge = bridgeBand && progress > bridgeBand.from && progress < bridgeBand.to;
    if (!onBridge) {
      for (const sign of [-1, 1]) {
        const behind = sampler.pointAt(progress, (sign * (laneScale + barrierBack.u + 0.5)) / laneScale);
        const gap = elevation + ROAD_LIFT - ROAD_CROWN + barrierBack.y - groundYAt(behind.x, behind.z);
        if (gap > 0) gaps += 1;
        if (gap > worstGap.gap) worstGap = { gap, progress, sign };
      }
    }
    for (let across = -reach; across <= reach; across += STEP_ACROSS) {
      const lane = across / laneScale;
      const point = sampler.pointAt(progress, lane);
      const surface = elevation + surfaceYAt(lane, section, Math.abs(across) - laneScale);
      const penetration = groundYAt(point.x, point.z) - surface;
      probes += 1;
      if (penetration > 0) {
        buried += 1;
        buriedProgress.add(Math.round(progress * 100) / 100);
      }
      if (penetration > worst.penetration) worst = { across, penetration, progress };
    }
  }
  return {
    buried,
    buriedProgress: [...buriedProgress].sort((a, b) => a - b),
    gaps,
    key: trackDef.key,
    probes,
    terrainInner: terrain.terrainInner,
    worst,
    worstGap,
  };
};

const mirror = mirrorCheck();
if (!mirror.available || !mirror.pass) {
  console.error('sampler mirror check FAILED — the previewer no longer matches the runtime:', mirror);
  process.exit(1);
}

let failed = false;
for (const trackDef of ALL_TRACKS) {
  const report = checkTrack(trackDef);
  const { worst, worstGap } = report;
  const ok = report.buried === 0 && report.gaps === 0;
  if (!ok) failed = true;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${report.key}${LEGACY ? ' (legacy follow)' : ''}: ` +
      `${report.buried}/${report.probes} footprint probes under the ground ` +
      `(worst ${worst.penetration.toFixed(3)} at p${worst.progress.toFixed(3)} offset ${worst.across.toFixed(1)}); ` +
      `${report.gaps} daylight gaps behind the barrier (worst ${worstGap.gap.toFixed(3)} at p${worstGap.progress.toFixed(3)})` +
      (report.terrainInner ? `; flat band ${report.terrainInner.toFixed(1)}u` : '')
  );
  if (report.buried) console.log(`     buried around progress: ${report.buriedProgress.join(', ')}`);
}
process.exit(failed ? 1 : 0);
