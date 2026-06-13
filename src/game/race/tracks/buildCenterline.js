// Reusable track-centerline generator. Turns a closed loop of corner
// waypoints into a dense {x,z} centerline by running straights between
// corners and filleted arcs through them. Guarantees a clean, closed loop
// (the runtime further smooths it with a CatmullRom curve), so new tracks
// are authored as a handful of corners + radii instead of ~80 hand-placed
// points. Pure JS (no THREE) so the QA gate scripts can import it.

const sub = (a, b) => ({ x: a.x - b.x, z: a.z - b.z });
const add = (a, b) => ({ x: a.x + b.x, z: a.z + b.z });
const scale = (a, s) => ({ x: a.x * s, z: a.z * s });
const len = (a) => Math.hypot(a.x, a.z);
const norm = (a) => {
  const l = len(a) || 1;
  return { x: a.x / l, z: a.z / l };
};

// waypoints: closed loop of corner positions (do NOT repeat the first).
// radius: fillet radius — a single number, or per-corner array.
// spacing: target distance between emitted points (~24 matches courseV2).
export const buildCenterline = (waypoints, { radius = 90, spacing = 22 } = {}) => {
  const n = waypoints.length;
  const radii = Array.isArray(radius) ? radius : waypoints.map(() => radius);
  // For each corner compute its two tangent points and the arc between them.
  const corners = waypoints.map((v, i) => {
    const prev = waypoints[(i + n - 1) % n];
    const next = waypoints[(i + 1) % n];
    const din = norm(sub(v, prev)); // heading arriving at the corner
    const dout = norm(sub(next, v)); // heading leaving the corner
    // Deflection angle (signed) between din and dout.
    const cross = din.x * dout.z - din.z * dout.x;
    const dot = din.x * dout.x + din.z * dout.z;
    const turn = Math.atan2(cross, dot); // (-π, π]; sign = turn direction
    let r = radii[i];
    // Tangent distance can't exceed half of either adjacent edge.
    const tWanted = r * Math.tan(Math.abs(turn) / 2);
    const halfPrev = len(sub(v, prev)) * 0.49;
    const halfNext = len(sub(next, v)) * 0.49;
    const t = Math.min(tWanted, halfPrev, halfNext);
    if (tWanted > 0) r = t / Math.tan(Math.abs(turn) / 2); // shrink radius to fit
    const pIn = sub(v, scale(din, t)); // arc entry (on incoming edge)
    const pOut = add(v, scale(dout, t)); // arc exit (on outgoing edge)
    // Arc centre: perpendicular to din from pIn, toward the turn side.
    const sign = Math.sign(cross) || 1;
    const nIn = { x: -din.z * sign, z: din.x * sign };
    const centre = add(pIn, scale(nIn, r));
    return { centre, din, dout, pIn, pOut, r, turn, v };
  });

  const points = [];
  const pushSpaced = (a, b) => {
    // Emit points along the straight a→b (excluding b; next arc adds it).
    const d = sub(b, a);
    const l = len(d);
    const steps = Math.max(1, Math.round(l / spacing));
    for (let s = 0; s < steps; s += 1) points.push(add(a, scale(d, s / steps)));
  };
  for (let i = 0; i < n; i += 1) {
    const c = corners[i];
    const cNext = corners[(i + 1) % n];
    // Straight from this corner's exit to the next corner's entry.
    pushSpaced(c.pOut, cNext.pIn);
    // Arc through the next corner (pIn → pOut around its centre).
    const startAng = Math.atan2(cNext.pIn.z - cNext.centre.z, cNext.pIn.x - cNext.centre.x);
    const endAng = Math.atan2(cNext.pOut.z - cNext.centre.z, cNext.pOut.x - cNext.centre.x);
    let sweep = endAng - startAng;
    const dir = Math.sign(cNext.turn) || 1;
    // Normalise sweep to match the turn direction.
    while (dir > 0 && sweep < 0) sweep += Math.PI * 2;
    while (dir < 0 && sweep > 0) sweep -= Math.PI * 2;
    const arcLen = Math.abs(sweep) * cNext.r;
    const steps = Math.max(1, Math.round(arcLen / spacing));
    for (let s = 0; s < steps; s += 1) {
      const a = startAng + sweep * (s / steps);
      points.push({ x: cNext.centre.x + Math.cos(a) * cNext.r, z: cNext.centre.z + Math.sin(a) * cNext.r });
    }
  }
  return points;
};

// Geometry validation — closure, length, tightest corner, and a coarse
// self-intersection check (non-adjacent segments crossing). Returns a report
// the track author/gates can assert against.
export const validateCenterline = (points) => {
  const n = points.length;
  let length = 0;
  for (let i = 0; i < n; i += 1) length += len(sub(points[(i + 1) % n], points[i]));
  // Min turn radius ≈ from the discrete curvature at each point.
  let minRadius = Infinity;
  for (let i = 0; i < n; i += 1) {
    const a = points[(i + n - 1) % n];
    const b = points[i];
    const c = points[(i + 1) % n];
    const ab = sub(b, a);
    const bc = sub(c, b);
    const turn = Math.abs(Math.atan2(ab.x * bc.z - ab.z * bc.x, ab.x * bc.x + ab.z * bc.z));
    const seg = (len(ab) + len(bc)) / 2;
    if (turn > 1e-4) minRadius = Math.min(minRadius, seg / turn);
  }
  // Self-intersection: any non-adjacent segment pair crossing.
  const cross2 = (p, a, b) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
  const segCross = (a, b, c, d) => {
    const d1 = cross2(c, a, b);
    const d2 = cross2(d, a, b);
    const d3 = cross2(a, c, d);
    const d4 = cross2(b, c, d);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
  };
  let intersections = 0;
  for (let i = 0; i < n; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % n];
    for (let j = i + 2; j < n; j += 1) {
      if (i === 0 && j === n - 1) continue; // adjacent across wrap
      const c = points[j];
      const d = points[(j + 1) % n];
      if (segCross(a, b, c, d)) intersections += 1;
    }
  }
  return { length: Math.round(length), minRadius: Math.round(minRadius), points: n, selfIntersections: intersections };
};
