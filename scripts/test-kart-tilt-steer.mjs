// Tilt steering maths (src/game/race/tiltSteer.js).
import assert from 'node:assert/strict';
import { foldBeta, smoothTiltAxis, TILT_DEAD_DEG, TILT_LOCK_DEG, tiltAxis, tiltRoll, wheelAngle } from '../src/game/race/tiltSteer.js';

const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} vs ${expected}`);

// The upright-phone flip: the same pose reported as 10 or 170 reads as 10.
assert.equal(foldBeta(10), 10);
assert.equal(foldBeta(170), 10);
assert.equal(foldBeta(-170), -10);
assert.equal(foldBeta(90), 90);
assert.equal(foldBeta(NaN), 0);

// A phone turned `wheel` degrees like a steering wheel and leaned back `lean`
// degrees from vertical, as the browser would report it. side: which long
// edge is on the left (+1 is the pose screen.orientation calls 90).
const pose = (wheel, lean, side = 1) => {
  const rad = Math.PI / 180;
  const up = [side * Math.cos(wheel * rad) * Math.cos(lean * rad), Math.sin(wheel * rad) * Math.cos(lean * rad), Math.sin(lean * rad)];
  const beta = Math.asin(up[1]) / rad;
  const gamma = Math.atan2(-up[0], up[2]) / rad;
  // The browser keeps gamma inside -90..90 and flips beta instead.
  return Math.abs(gamma) > 90 ? { beta: (beta >= 0 ? 180 : -180) - beta, gamma: gamma - Math.sign(gamma) * 180 } : { beta, gamma };
};
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 0.01, `${message}: ${actual} vs ${expected}`);

// The wheel angle comes back whatever the lean, including past vertical
// (where the browser's angles flip) and either way round.
for (const lean of [-20, 0, 20, 45, 60]) {
  for (const wheel of [-30, -12, 0, 12, 25]) {
    close(tiltRoll({ angle: 90, ...pose(wheel, lean, 1) }), wheel, `wheel ${wheel} lean ${lean}`);
    close(tiltRoll({ angle: 270, ...pose(wheel, lean, -1) }), -wheel, `wheel ${wheel} lean ${lean}, other way round`);
  }
}
// The 2026-11-25 phone report: leaned back 50 degrees, the old reading (lift
// of the long edge alone) saw a 25 degree turn as 16.
close(foldBeta(pose(25, 50).beta), 15.76, 'old reading');
close(wheelAngle(pose(25, 50).beta, pose(25, 50).gamma), 25, 'new reading');
// The flip that slammed the steering on 2026-11-12 still changes nothing.
close(tiltRoll({ angle: 90, beta: 12, gamma: -80 }), tiltRoll({ angle: 90, beta: 168, gamma: 80 }), 'flip');
// Nearly flat on a table the reading is the plain lift, and level is zero.
close(wheelAngle(5, 3), 5, 'nearly flat');
assert.equal(wheelAngle(0, 0), 0);
assert.equal(wheelAngle(NaN, NaN), 0);
// Portrait uses gamma; the soft lock signs the wheel by gamma.
assert.equal(tiltRoll({ angle: 0, beta: 50, gamma: 9 }), 9);
assert.ok(tiltRoll({ beta: 15, gamma: -40, soft: true }) < -15);
assert.ok(tiltRoll({ beta: 15, gamma: 40, soft: true }) > 15);

// Dead zone, symmetry, full lock, and no step at the dead-zone edge.
assert.equal(tiltAxis(0), 0);
assert.equal(tiltAxis(TILT_DEAD_DEG), 0);
assert.equal(tiltAxis(-TILT_DEAD_DEG + 0.5), 0);
assert.ok(tiltAxis(TILT_DEAD_DEG + 0.5) < 0.01);
assert.equal(tiltAxis(TILT_LOCK_DEG), 1);
assert.equal(tiltAxis(80), 1);
assert.equal(tiltAxis(-80), -1);
near(tiltAxis(-20), -tiltAxis(20), 'symmetric');
// A 15-degree turn is about a third of full steer, 20 degrees over half, and
// the curve only ever rises.
assert.ok(tiltAxis(15) > 0.3 && tiltAxis(15) < 0.4, `15 degrees gives ${tiltAxis(15)}`);
assert.ok(tiltAxis(20) > 0.5 && tiltAxis(20) < 0.6, `20 degrees gives ${tiltAxis(20)}`);
for (let deg = 0; deg < 60; deg += 1) assert.ok(tiltAxis(deg + 1) >= tiltAxis(deg));

// Smoothing: first reading passes through, later ones move part of the way
// and never overshoot.
assert.equal(smoothTiltAxis(null, 0.6, 16), 0.6);
assert.equal(smoothTiltAxis(0.2, 0.6, 0), 0.6);
const step = smoothTiltAxis(0, 1, 16);
assert.ok(step > 0.15 && step < 0.3, `one 16 ms step gives ${step}`);
assert.ok(smoothTiltAxis(0, 1, 1000) > 0.999);
let value = 0;
for (let i = 0; i < 12; i += 1) value = smoothTiltAxis(value, 1, 16);
assert.ok(value > 0.9 && value <= 1, `after 190 ms: ${value}`);

console.log('kart tilt steer: ok');
