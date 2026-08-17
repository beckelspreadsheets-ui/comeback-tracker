// Graduated contact (owner 2026-08-17: "spin out other characters when you
// run into them ... based on physics of how hard, side swipes etc").
//
// Three tiers, and the boundaries are the whole feature:
//   closing <= wobbleSpeedDiff (45)  -> plain bump (unchanged shipped feel)
//   45 < closing <= spinSpeedDiff(85)-> WOBBLE: real speed loss + yaw shake,
//                                       no control loss, no spin chain risk
//   closing > 85                     -> full spin-out (boost-grade, unchanged)
//
// Also covers the rails pit gain: a full-steer side swipe on rails maps to
// laneRate x laneScale x railsPitGain and must clear the pit gate; a half
// steer must not (the "gentle lean" regression the pit test guards from the
// free-body side).
//
//   node scripts/test-contact-tiers.mjs
//
// Drives the real updateRivalRacers — the shipped contact resolution.
import { updateRivalRacers, createRivalRacers, KART_CONTACT } from '../src/game/race/rivalRacers.js';

const DT = 1 / 60;
const TRACK_LENGTH = 11659;
const LANE_SCALE = 26;
const cases = [];
const check = (name, actual, expected) => {
  const pass = actual === expected;
  cases.push({ pass });
  process.stdout.write(`  ${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(62)} got ${actual}, want ${expected}\n`);
};

// Player square behind a rival, closing at a chosen speed delta. Returns what the
// contact did to the rival on the first impulse frame.
const ram = ({ closing, frames = 8 }) => {
  const field = createRivalRacers([{ character: 'penguin', kart: 'hero', name: 'Target' }], {
    gridProgress: 0.2,
  });
  const rival = field[0];
  rival.progress = 0.2 + 6 / TRACK_LENGTH; // square in the back, inside the box
  rival.lap = 1;
  rival.lane = 0.02; // well under spinLatUnits/laneScale — a square hit
  rival.speed = 150;
  rival.laneVel = 0;
  rival.spinTimer = 0;
  rival.bumpCooldown = 0;
  const speedBefore = rival.speed;

  let wobbled = false;
  let spun = false;
  for (let i = 0; i < frames; i += 1) {
    updateRivalRacers(field, {
      boostPads: [],
      boostSpeed: 300,
      cornerPushFor: () => 0,
      crossers: null,
      curvatureAt: () => 0,
      dt: DT,
      finalLap: false,
      laneScale: LANE_SCALE,
      maxSpeed: 300,
      player: {
        airborne: false,
        aurora: false,
        bumpCooldown: 0,
        lane: 0,
        lateralVel: 0,
        progress: 0.2,
        speed: 150 + closing,
        spinning: false,
        total: 0.2,
      },
      raceTime: 5,
      trackLength: TRACK_LENGTH,
      wallLane: 0.95,
    });
    if (rival.wobbleTimer > 0) wobbled = true;
    if (rival.spinTimer > 0) spun = true;
  }
  return { wobbled, spun, lostSpeed: rival.speed < speedBefore - 1 };
};

process.stdout.write('graduated contact tiers\n');
process.stdout.write(
  `  (bump <= ${KART_CONTACT.wobbleSpeedDiff}, wobble ${KART_CONTACT.wobbleSpeedDiff}-${KART_CONTACT.spinSpeedDiff}, spin > ${KART_CONTACT.spinSpeedDiff} wu/s closing)\n`
);

const gentle = ram({ closing: 20 });
check('slow contact stays a plain bump (no wobble)', gentle.wobbled, false);
check('slow contact never spins', gentle.spun, false);

const medium = ram({ closing: 60 });
check('hard non-boost hit wobbles the victim', medium.wobbled, true);
check('hard non-boost hit does NOT spin', medium.spun, false);
check('the wobble costs the victim real speed', medium.lostSpeed, true);

const hard = ram({ closing: 120 });
check('boost-grade hit still spins (tier above intact)', hard.spun, true);

// Rails pit gain: full steer maps over the gate, half steer stays under.
const railsLateral = (steerFraction) =>
  steerFraction * 0.72 * LANE_SCALE * KART_CONTACT.railsPitGain;
check(
  'full rails steer clears the pit lateral gate',
  railsLateral(1) > KART_CONTACT.pitLateralSpeed,
  true
);
check(
  'half rails steer stays under the pit lateral gate',
  railsLateral(0.5) > KART_CONTACT.pitLateralSpeed,
  false
);

const failures = cases.filter((entry) => !entry.pass).length;
process.stdout.write(`\n${cases.length} cases -> ${failures ? `${failures} FAIL` : 'PASS'}\n`);
if (failures) process.exitCode = 1;
