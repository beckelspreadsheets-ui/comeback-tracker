// Juice pass gate: race/juice.js derives impact events from rising edges of
// sim state and spends them on presentation only. This pins the derivation
// (what counts as a hit, how hard, whose hit it was) and the camera kick's
// contract with the existing feel model, in node, with no browser.
//
//   node scripts/test-race-juice.mjs
//
// The race objects here are minimal stand-ins carrying only the fields the
// tracker reads; the sim itself is never imported, which is the point — the
// tracker must work off whatever the sim already keeps.
import { createJuiceTracker, detectJuiceEvents, JUICE } from '../src/game/race/juice.js';
import {
  advanceChaseFeel,
  createChaseFeelState,
  impulseChaseKick,
} from '../src/game/race/camera/chaseCameraFeel.js';

const cases = [];
const check = (name, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  cases.push({ actual, expected, name, pass });
  process.stdout.write(
    `  ${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(58)} got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}\n`
  );
};

const baseRace = () => ({
  avalanche: null,
  bumps: 0,
  finished: false,
  fishBones: [],
  lane: 0,
  march: null,
  position: 3,
  projectiles: [],
  raceTime: 10,
  rivals: [
    { name: 'a', progress: 0.5, spinTimer: 0 },
    { name: 'b', progress: 0.7, spinTimer: 0 },
  ],
  shieldActive: false,
  shieldTimer: 0,
  slapTimer: 0,
  speed: 200,
  spinOuts: 0,
  spinTimer: 0,
  wallContact: false,
  wobbleTimer: 0,
});
const frame = (tracker, race, dt = 1 / 60) => {
  race.raceTime += dt;
  return detectJuiceEvents(tracker, race, { dt, trackLength: 10000 }).map(
    (event) => `${event.kind}:${event.severity.toFixed(2)}`
  );
};
const fresh = () => {
  const tracker = createJuiceTracker();
  const race = baseRace();
  frame(tracker, race);
  return { race, tracker };
};

process.stdout.write('race juice\n');

{
  const tracker = createJuiceTracker();
  check('first frame never fires', frame(tracker, baseRace()), []);
}

// Being hit.
{
  const { race, tracker } = fresh();
  race.spinTimer = 0.95;
  race.spinOuts = 1;
  check('item/contact spin-out (spinOuts++) is a full hit', frame(tracker, race), ['spin:1.00']);
  race.spinTimer = 0.9;
  check('a spin already under way does not re-fire', frame(tracker, race), []);
}
{
  const { race, tracker } = fresh();
  race.spinTimer = 0.6;
  check('rocket-start flood (no spinOuts) is a nudge', frame(tracker, race), ['flood:1.00']);
}
{
  const { race, tracker } = fresh();
  race.shieldActive = true;
  race.shieldTimer = 5;
  frame(tracker, race);
  race.shieldActive = false;
  race.shieldTimer = 0;
  check('shield eating a hit is an impact', frame(tracker, race), ['shield:1.00']);
  race.shieldActive = true;
  race.shieldTimer = 0.01;
  frame(tracker, race);
  race.shieldActive = false;
  race.shieldTimer = 0;
  check('shield running out is not', frame(tracker, race), []);
}

// Walls scale with speed and a scrape is one hit, not a hit per toggle.
{
  const { race, tracker } = fresh();
  race.speed = 220;
  race.wallContact = true;
  check('full-speed wall slam is severity 1', frame(tracker, race), ['wall:1.00']);
  race.wallContact = false;
  frame(tracker, race);
  race.wallContact = true;
  check('re-contact inside a scrape is not a new hit', frame(tracker, race), []);
  race.wallContact = false;
  for (let i = 0; i < 30; i += 1) frame(tracker, race);
  race.speed = 70;
  race.wallContact = true;
  check('slow lean on the rail is a light hit', frame(tracker, race), ['wall:0.30']);
}

// Kart contact.
{
  const { race, tracker } = fresh();
  race.bumps = 1;
  check('plain contact', frame(tracker, race), ['bump:0.60']);
  race.bumps = 2;
  race.wobbleTimer = 0.4;
  check('wobble-tier contact is the hard bump', frame(tracker, race), ['bump:1.00']);
  race.bumps = 3;
  race.spinTimer = 0.95;
  race.spinOuts = 1;
  check('contact that spins you reads as the spin only', frame(tracker, race), ['spin:1.00']);
}

// Landing a hit — and NOT claiming hits the player did not land.
{
  const { race, tracker } = fresh();
  race.projectiles.push({ held: false, owner: 'player', progress: 0.5005 });
  frame(tracker, race);
  race.projectiles.length = 0;
  race.rivals[0].spinTimer = 0.95;
  check('player snowball vanishing beside a spinning rival', frame(tracker, race), ['landed:0.75']);
}
{
  const { race, tracker } = fresh();
  race.fishBones.push({ owner: 'b', progress: 0.5 });
  frame(tracker, race);
  race.fishBones.length = 0;
  race.rivals[0].spinTimer = 0.95;
  check('rival-on-rival hit is not the player', frame(tracker, race), []);
}
{
  const { race, tracker } = fresh();
  race.projectiles.push({ owner: 'player', progress: 0.2 });
  frame(tracker, race);
  race.projectiles.length = 0;
  check('player projectile expiring is not a hit', frame(tracker, race), []);
}
{
  const { race, tracker } = fresh();
  race.slapTimer = 0.4;
  race.rivals[0].spinTimer = 0.95;
  race.rivals[1].spinTimer = 0.95;
  check('slap fish catching two rivals', frame(tracker, race), ['landed:1.00']);
}
{
  const { race, tracker } = fresh();
  race.avalanche = { by: 'player', target: 'b', timer: 0.1 };
  frame(tracker, race);
  race.avalanche = null;
  race.rivals[1].spinTimer = 1.2;
  check('player avalanche burying its target', frame(tracker, race), ['landed:0.75']);
}

// The flag, and a restart.
{
  const { race, tracker } = fresh();
  race.finished = true;
  check('finish fires once', frame(tracker, race), ['finish:1.00']);
  race.spinTimer = 1;
  check('nothing fires after the flag', frame(tracker, race), []);
  check('the flag settles the camera, lighter than a spin-out', JUICE.kick.finish > 0 && JUICE.kick.finish < JUICE.kick.spin, true);
  Object.assign(race, { ...baseRace(), raceTime: 0 });
  check('a restart re-syncs instead of firing', frame(tracker, race), []);
  check('a restart clears the finish', tracker.finished, false);
}

// The kick goes through the existing feel state, and reduced motion zeroes it.
{
  const input = { boomBase: 30, dt: 1 / 60, eyeBase: 10, fovBase: 60, lookUpBase: 4.5, speed01: 0.8, targetYaw: 0 };
  const feel = createChaseFeelState();
  advanceChaseFeel(feel, input);
  const restingEye = advanceChaseFeel(feel, input).eyeLift;
  impulseChaseKick(feel, JUICE.kick.spin);
  let lowestEye = Infinity;
  let peakShake = 0;
  for (let i = 0; i < 60; i += 1) {
    const out = advanceChaseFeel(feel, input);
    lowestEye = Math.min(lowestEye, out.eyeLift);
    peakShake = Math.max(peakShake, Math.abs(out.shakeYaw), Math.abs(out.shakePitch));
  }
  check('kick dips the eye', lowestEye < restingEye - 0.3, true);
  check('kick shake stays under 1.3 degrees', peakShake > 0 && peakShake < 0.0227, true);
  check('kick has settled after a second', Math.abs(advanceChaseFeel(feel, input).eyeLift - restingEye) < 0.05, true);

  const calm = createChaseFeelState();
  advanceChaseFeel(calm, { ...input, reducedMotion: true });
  impulseChaseKick(calm, 1);
  const out = advanceChaseFeel(calm, { ...input, reducedMotion: true });
  check('reduced motion: no shake', out.shakeYaw === 0 && out.shakePitch === 0, true);
  check('reduced motion: no dip', calm.landDip, 0);
}

const failed = cases.filter((c) => !c.pass).length;
process.stdout.write(`\n${cases.length} cases -> ${failed ? `${failed} FAILURES` : 'PASS'}\n`);
if (failed) process.exit(1);
