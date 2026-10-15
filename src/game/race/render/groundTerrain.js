// Infield terrain follow: how high the ground plane sits near the road.
//
// Pure (no THREE) so scripts/test-ground-clearance.mjs can run the exact code
// the runtime runs over the real ground grid. The runtime builds the plane,
// the albedo mottle and the relief NORMALS itself; this module owns only the
// decisions that put the ground above or below the road: the plane's size and
// pitch, the road-clearance fades, and the terrain lift.
//
// WHY THE TERRAIN BAND IS WIDER THAN THE RELIEF BAND (owner report 2026-10-15:
// "when you drove through the snow it like distorted your character"). The
// ground is one 27-unit-pitch PlaneGeometry, so a single triangle spans up to
// 27 * sqrt(2) = 38 units and the GPU interpolates height linearly across it.
// The old follow held the infield at road height only out to
// widestHalfRoad + 16 (~41 units on Penguin Village) before ramping back to
// the plane, and the road plus its welded kerb / run-off / barrier profile
// already reaches ~38 units from the centreline. So wherever the road sits
// BELOW the plane (the bayfront valley, amp -28) the first triangle of the
// ramp still overlapped the footprint and tilted up through it: white snow
// wedges across the road at penguin-village p0.38-0.43 that the kart drove
// through, slicing the kart and driver as it passed. On hills the same
// triangles hung the barrier over a gap instead.
//
// The rule now: every triangle that can touch the road footprint has all
// three vertices inside the flat band, i.e. the band is footprint + one
// triangle diagonal wide before the ramp starts. The relief NORMALS keep their
// old, narrower fade (that is the approved surface read); only height moves.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep01 = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

export const GROUND_VERTEX_PITCH = 27;
export const GROUND_REFERENCE_SIZE = 2600;
export const GROUND_FOG_MARGIN = 1300;
// World y of the plane before any lift. The road's outer edge sits at about
// -0.02 (ROAD_LIFT - ROAD_CROWN), so this is the whole vertical budget.
export const GROUND_BASE_Y = -0.06;

// Centreline table chord. The rule is that it stays well under the vertex
// pitch it is compared against, or the fades alias into the ramp.
const CLEAR_CHORD_UNITS = 11;
// Relief fade (normals + displacement), unchanged from the shipped look.
const RELIEF_CLEAR_PAD = 16;
const RELIEF_RAMP = 40;
// Terrain lift ramp back to the plane once the flat band ends.
const TERRAIN_RAMP = 40;
const TERRAIN_BAND_PAD = 2;
const TRIANGLE_DIAGONAL = GROUND_VERTEX_PITCH * Math.SQRT2;
// Deepest the bend allowance may drop the band. With the base offset and the
// sag term on top it stays inside the barrier's buried back face (footDrop
// 1.0 in roadEdgeSection), so the wall still meets the ground.
const BEND_ALLOWANCE_CAP = 0.38;

// Same sample count the runtime's trackSampleCount uses for extents.
const EXTENT_SAMPLE_UNITS = 26;

export const measureTrackHalfExtent = (centreAt, length) => {
  const count = clamp(Math.round(length / EXTENT_SAMPLE_UNITS), 112, 640);
  let halfExtent = 0;
  for (let index = 0; index < count; index += 1) {
    const centre = centreAt(index / count);
    halfExtent = Math.max(halfExtent, Math.abs(centre.x), Math.abs(centre.z));
  }
  return halfExtent;
};

export const groundPlaneLayout = (trackHalfExtent) => {
  const size = Math.max(GROUND_REFERENCE_SIZE, Math.ceil((trackHalfExtent + GROUND_FOG_MARGIN) * 2));
  return { scale: size / GROUND_REFERENCE_SIZE, segments: Math.round(size / GROUND_VERTEX_PITCH), size };
};

// centreAt(progress) -> { x, y, z } with y the road elevation; widthAt is the
// sampler's; edgeReach is how far the welded edge profile extends past the
// road's own edge (the last section point's u). bridgeBand progress is
// excluded from the follow: the deck spans a gap the pillars fill.
export const createGroundTerrain = ({ bridgeBand = null, centreAt, edgeReach, length, terrainEnabled = true, widthAt }) => {
  const samples = clamp(Math.round(length / CLEAR_CHORD_UNITS), 128, 1200);
  const centreline = new Float32Array(samples * 2);
  const centreY = new Float32Array(samples);
  let widestHalfRoad = 0;
  for (let sample = 0; sample < samples; sample += 1) {
    const progress = sample / samples;
    const centre = centreAt(progress);
    centreline[sample * 2] = centre.x;
    centreline[sample * 2 + 1] = centre.z;
    centreY[sample] = centre.y;
    widestHalfRoad = Math.max(widestHalfRoad, widthAt(progress) * 0.44);
  }

  const inBridge = (progress) => Boolean(bridgeBand) && progress > bridgeBand.from && progress < bridgeBand.to;
  // The height the GROUND follows: the road's, except along the bridge deck,
  // which spans a gap the pillars fill. The deck's grade must not feed the
  // sag or bend terms either — it is a 17-24% ramp meeting flat road, and
  // reading that kink as a sag dropped the ground ~2.7 units at both bridge
  // feet, leaving daylight under the barrier.
  const followY = new Float32Array(samples);
  for (let sample = 0; sample < samples; sample += 1) {
    followY[sample] = inBridge(sample / samples) ? 0 : centreY[sample];
  }

  const clearInner = widestHalfRoad + RELIEF_CLEAR_PAD;
  const clearOuter = clearInner + RELIEF_RAMP;
  const terrainInner = widestHalfRoad + Math.max(0, edgeReach) + TRIANGLE_DIAGONAL + TERRAIN_BAND_PAD;
  const terrainOuter = terrainInner + TERRAIN_RAMP;
  const reach = Math.max(clearOuter, terrainOuter);
  const reachSq = reach * reach;
  const terrainInnerSq = terrainInner * terrainInner;

  // Sag allowance. Inside the band every vertex sits at its nearest sample's
  // elevation, so along the road the ground is the CHORD of the grade. Where
  // the grade is concave-up (the floor of a valley) that chord lies above the
  // road by c^2 * y'' / 8; lowering the band by exactly that keeps it under
  // the road there and leaves flat road and crests untouched.
  const chord = length / samples;
  const sag = new Float32Array(samples);
  for (let sample = 0; sample < samples; sample += 1) {
    const before = followY[(sample - 1 + samples) % samples];
    const after = followY[(sample + 1) % samples];
    const curvature = (before - 2 * followY[sample] + after) / (chord * chord);
    sag[sample] = curvature > 0 ? (curvature * TRIANGLE_DIAGONAL * TRIANGLE_DIAGONAL) / 8 : 0;
  }
  // Bend allowance inputs. Near a bend the band's height field is the grade
  // wrapped around the bend's centre, y(R * theta), and theta's Hessian is
  // 1/r^2 at distance r from that centre — so beside a tight bend on a grade
  // the field is curved in plan, and a 38-unit triangle's linear
  // interpolation misses it by D^2/8 * |y'| * R / r^2. The curvature has to be
  // read FINER than the table: the spline kinks over a few units at some
  // S-bend inflections (Penguin Village p0.438: R ~80 over 6 units where the
  // 11-unit table reads R 190-380), and the triangle feels the kink. So each
  // sample keeps the TIGHTEST radius within a triangle diagonal of it,
  // measured on a 3-unit walk of the real curve.
  const FINE_UNITS = 3;
  const fineCount = Math.max(samples, Math.round(length / FINE_UNITS));
  const fineX = new Float32Array(fineCount);
  const fineZ = new Float32Array(fineCount);
  for (let index = 0; index < fineCount; index += 1) {
    const centre = centreAt(index / fineCount);
    fineX[index] = centre.x;
    fineZ[index] = centre.z;
  }
  const fineStep = length / fineCount;
  const fineTurn = new Float32Array(fineCount);
  for (let index = 0; index < fineCount; index += 1) {
    const before = (index - 1 + fineCount) % fineCount;
    const after = (index + 1) % fineCount;
    const inX = fineX[index] - fineX[before];
    const inZ = fineZ[index] - fineZ[before];
    const outX = fineX[after] - fineX[index];
    const outZ = fineZ[after] - fineZ[index];
    fineTurn[index] = Math.abs(Math.atan2(inX * outZ - inZ * outX, inX * outX + inZ * outZ)) / fineStep;
  }
  const turn = new Float32Array(samples);
  const grade = new Float32Array(samples);
  const windowFine = Math.ceil(TRIANGLE_DIAGONAL / fineStep);
  for (let sample = 0; sample < samples; sample += 1) {
    const before = (sample - 1 + samples) % samples;
    const after = (sample + 1) % samples;
    grade[sample] = Math.abs(followY[after] - followY[before]) / (2 * chord);
    const centreFine = Math.round((sample / samples) * fineCount);
    let tightest = 0;
    for (let offset = -windowFine; offset <= windowFine; offset += 1) {
      tightest = Math.max(tightest, fineTurn[(centreFine + offset + fineCount * 2) % fineCount]);
    }
    turn[sample] = tightest;
  }
  // Samples closer than this (in samples) to the nearest one are the same
  // stretch of road; anything further is ANOTHER pass of the track (a hairpin
  // leg, a crossing) and must not have the ground above it either.
  const stretchWindow = Math.ceil(terrainOuter / chord) + 1;

  // Uniform lattice over the centreline so a vertex only searches the 3x3
  // cells around itself. Cell size is the widest radius any term needs; past
  // it every fade is saturated, which is what makes the truncation exact.
  const cellSize = Math.max(reach, 1);
  const cells = new Map();
  const cellKey = (cx, cz) => cx * 73856093 + cz * 19349663;
  let bandMinX = Infinity;
  let bandMaxX = -Infinity;
  let bandMinZ = Infinity;
  let bandMaxZ = -Infinity;
  for (let sample = 0; sample < samples; sample += 1) {
    const sx = centreline[sample * 2];
    const sz = centreline[sample * 2 + 1];
    bandMinX = Math.min(bandMinX, sx);
    bandMaxX = Math.max(bandMaxX, sx);
    bandMinZ = Math.min(bandMinZ, sz);
    bandMaxZ = Math.max(bandMaxZ, sz);
    const key = cellKey(Math.floor(sx / cellSize), Math.floor(sz / cellSize));
    const bucket = cells.get(key);
    if (bucket) bucket.push(sample);
    else cells.set(key, [sample]);
  }
  const result = { displaceFade: 1, reliefFade: 1, terrainLift: 0 };
  // Height the ground takes at world (x, z), before GROUND_BASE_Y and the
  // relief displacement (which the caller scales by displaceFade). Returns a
  // shared scratch object — copy the fields out before the next call.
  const solve = (x, z) => {
    let nearest = Infinity;
    let nearestSample = -1;
    const inside =
      x >= bandMinX - reach && x <= bandMaxX + reach && z >= bandMinZ - reach && z <= bandMaxZ + reach;
    const cx = Math.floor(x / cellSize);
    const cz = Math.floor(z / cellSize);
    if (inside) {
      for (let ox = -1; ox <= 1; ox += 1) {
        for (let oz = -1; oz <= 1; oz += 1) {
          const bucket = cells.get(cellKey(cx + ox, cz + oz));
          if (!bucket) continue;
          for (let entry = 0; entry < bucket.length; entry += 1) {
            const sample = bucket[entry];
            const dx = x - centreline[sample * 2];
            const dz = z - centreline[sample * 2 + 1];
            const distanceSq = dx * dx + dz * dz;
            if (distanceSq < nearest) {
              nearest = distanceSq;
              nearestSample = sample;
            }
          }
        }
      }
    }
    const distance = nearest > reachSq ? Infinity : Math.sqrt(nearest);
    result.reliefFade = smoothstep01((distance - clearInner) / (clearOuter - clearInner));
    const terrainFade = smoothstep01((distance - terrainInner) / (terrainOuter - terrainInner));
    // Displacement is only a few centimetres, but it rides the same triangles,
    // so it is held to zero wherever the terrain band is.
    result.displaceFade = Math.min(result.reliefFade, terrainFade);
    result.terrainLift = 0;
    if (!terrainEnabled || nearestSample < 0 || distance === Infinity) return result;

    // Elevation at the vertex's FOOT on the centreline, not at the nearest
    // sample: samples sit one chord apart, so on a 6.5% grade the nearest
    // sample's height is up to 0.36 off the road beside the vertex — eight
    // times the clearance budget. Project onto the two segments either side
    // of the nearest sample and interpolate along whichever is closer.
    const previous = (nearestSample - 1 + samples) % samples;
    const next = (nearestSample + 1) % samples;
    let footY = followY[nearestSample] - sag[nearestSample];
    let footDistanceSq = nearest;
    for (const [from, to] of [
      [previous, nearestSample],
      [nearestSample, next],
    ]) {
      const ax = centreline[from * 2];
      const az = centreline[from * 2 + 1];
      const sx = centreline[to * 2] - ax;
      const sz = centreline[to * 2 + 1] - az;
      const lengthSq = sx * sx + sz * sz;
      if (lengthSq <= 0) continue;
      const t = clamp(((x - ax) * sx + (z - az) * sz) / lengthSq, 0, 1);
      const px = x - (ax + sx * t);
      const pz = z - (az + sz * t);
      const distanceSq = px * px + pz * pz;
      if (distanceSq <= footDistanceSq) {
        footDistanceSq = distanceSq;
        footY = followY[from] - sag[from] + (followY[to] - sag[to] - (followY[from] - sag[from])) * t;
      }
    }
    // Bend allowance (see the table above), taken as if the vertex were on
    // the INSIDE whichever side it is on: through an S-bend the inside swaps
    // within one triangle, and the outside's smaller error is covered anyway.
    // Capped so the barrier's buried back face (footDrop) still reaches the
    // ground; the clearance gate checks both directions.
    const curvature = turn[nearestSample];
    if (curvature > 1e-5 && grade[nearestSample] > 0) {
      const radius = 1 / curvature;
      const fromCentre = Math.max(radius * 0.25, radius - Math.sqrt(footDistanceSq));
      const bend = ((TRIANGLE_DIAGONAL * TRIANGLE_DIAGONAL) / 8) * grade[nearestSample] * radius / (fromCentre * fromCentre);
      footY -= Math.min(BEND_ALLOWANCE_CAP, bend);
    }

    let lift = 0;
    if (!inBridge(nearestSample / samples)) {
      lift = footY * (1 - terrainFade);
    }
    // Another pass of the track close enough that this vertex's triangles can
    // reach its footprint: the ground must clear that road too. Bridge-band
    // samples are the deck over a gap and never pull the ground up or down.
    for (let ox = -1; ox <= 1; ox += 1) {
      for (let oz = -1; oz <= 1; oz += 1) {
        const bucket = cells.get(cellKey(cx + ox, cz + oz));
        if (!bucket) continue;
        for (let entry = 0; entry < bucket.length; entry += 1) {
          const sample = bucket[entry];
          let apart = Math.abs(sample - nearestSample);
          apart = Math.min(apart, samples - apart);
          if (apart <= stretchWindow || inBridge(sample / samples)) continue;
          const dx = x - centreline[sample * 2];
          const dz = z - centreline[sample * 2 + 1];
          if (dx * dx + dz * dz > terrainInnerSq) continue;
          // Either neighbour may be the one beside the vertex on a grade.
          const low = Math.min(
            followY[sample],
            followY[(sample - 1 + samples) % samples],
            followY[(sample + 1) % samples]
          );
          lift = Math.min(lift, low - sag[sample]);
        }
      }
    }
    result.terrainLift = lift;
    return result;
  };

  return { clearInner, clearOuter, samples, solve, terrainInner, terrainOuter, widestHalfRoad };
};
