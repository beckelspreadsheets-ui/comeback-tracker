// Turn-and-run layout walker.
//
// Placing waypoints by hand controls POSITION but not deflection, and
// deflection is what decides whether a corner is a sweeper, a turn or a
// hairpin — i.e. whether the lap has any variety in it at all. This inverts
// that: author the corner angles and the runs between them, and let the
// geometry fall out. The last two run lengths are SOLVED so the loop closes
// exactly, which is the one constraint a hand-placed list keeps breaking.
//
// Convention matches the previewer: x east, z south, heading 0 = east, and a
// POSITIVE turn is a right-hander — which in this frame swings the heading
// toward -z, exactly the sign the previewer's corner detector reports.

export const walk = ({ start, heading = 0, moves }) => {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dirOf = (deg) => ({ x: Math.cos(rad(deg)), z: -Math.sin(rad(deg)) });

  // Directions of every run, from the turn sequence alone.
  let phi = heading;
  const dirs = [];
  for (const move of moves) {
    dirs.push(dirOf(phi));
    phi += move.turn;
  }

  const n = moves.length;
  const fixed = moves.slice(0, n - 2);
  let point = { ...start };
  const points = [{ ...start }];
  fixed.forEach((move, index) => {
    point = { x: point.x + dirs[index].x * move.run, z: point.z + dirs[index].z * move.run };
    points.push({ ...point });
  });

  // Solve the final two runs so the loop closes on `start` exactly.
  const d1 = dirs[n - 2];
  const d2 = dirs[n - 1];
  const rx = start.x - point.x;
  const rz = start.z - point.z;
  const det = d1.x * d2.z - d1.z * d2.x;
  if (Math.abs(det) < 1e-6) throw new Error('final two runs are parallel — cannot close the loop');
  const a = (rx * d2.z - rz * d2.x) / det;
  const b = (d1.x * rz - d1.z * rx) / det;
  if (a <= 0 || b <= 0) throw new Error(`closure needs negative runs (a=${a.toFixed(0)}, b=${b.toFixed(0)}) — adjust the turn sequence`);
  point = { x: point.x + d1.x * a, z: point.z + d1.z * a };
  points.push({ ...point });

  const closureTurn = moves.reduce((sum, move) => sum + move.turn, 0);
  return {
    waypoints: points,
    solvedRuns: [Math.round(a), Math.round(b)],
    totalTurnDeg: Math.round(closureTurn),
  };
};
