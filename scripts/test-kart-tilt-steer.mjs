// Tilt steering maths (src/game/race/tiltSteer.js).
import assert from 'node:assert/strict';
import { foldBeta, smoothTiltAxis, TILT_DEAD_DEG, TILT_LOCK_DEG, tiltAxis, tiltRoll } from '../src/game/race/tiltSteer.js';

const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} vs ${expected}`);

// The upright-phone flip: the same pose reported as 10 or 170 reads as 10.
assert.equal(foldBeta(10), 10);
assert.equal(foldBeta(170), 10);
assert.equal(foldBeta(-170), -10);
assert.equal(foldBeta(90), 90);
assert.equal(foldBeta(NaN), 0);

// Landscape either way round, and the flip never changes the answer.
assert.equal(tiltRoll({ angle: 90, beta: 12, gamma: -80 }), 12);
assert.equal(tiltRoll({ angle: 90, beta: 168, gamma: 80 }), 12);
assert.equal(tiltRoll({ angle: 270, beta: 12 }), -12);
assert.equal(tiltRoll({ angle: -90, beta: -168 }), 12);
// Portrait uses gamma; the soft lock signs beta by gamma.
assert.equal(tiltRoll({ angle: 0, beta: 50, gamma: 9 }), 9);
assert.equal(tiltRoll({ beta: 15, gamma: -40, soft: true }), -15);
assert.equal(tiltRoll({ beta: 165, gamma: 40, soft: true }), 15);

// Dead zone, symmetry, full lock, and no step at the dead-zone edge.
assert.equal(tiltAxis(0), 0);
assert.equal(tiltAxis(TILT_DEAD_DEG), 0);
assert.equal(tiltAxis(-TILT_DEAD_DEG + 0.5), 0);
assert.ok(tiltAxis(TILT_DEAD_DEG + 0.5) < 0.01);
assert.equal(tiltAxis(TILT_LOCK_DEG), 1);
assert.equal(tiltAxis(80), 1);
assert.equal(tiltAxis(-80), -1);
near(tiltAxis(-20), -tiltAxis(20), 'symmetric');
// Gentler than the old 24-degree lock: a 15-degree tilt stays under a quarter
// steer, and the curve only ever rises.
assert.ok(tiltAxis(15) < 0.25, `15 degrees gives ${tiltAxis(15)}`);
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
