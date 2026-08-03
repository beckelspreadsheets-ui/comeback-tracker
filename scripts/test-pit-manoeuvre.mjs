// P6 exit criterion, docs/FREE_BODY_PLAN.md.
//
// Owner: "I want pit maneuvers to work if I slide up on someone and try to spin
// them up from the side."
//
// A pit has to be a SKILL, which means it has exactly two ways to be wrong: it
// never fires when you do it deliberately, or it fires when you did not. The
// second is worse — if ordinary side-by-side racing spins people, the pack
// becomes a demolition derby and nobody can pass cleanly.
//
//   node scripts/test-pit-manoeuvre.mjs
//
// Drives the real updateRivalRacers, so this exercises the shipped contact
// resolution rather than a copy of it.
import { updateRivalRacers, createRivalRacers, KART_CONTACT } from '../src/game/race/rivalRacers.js';

const DT = 1 / 60;
const TRACK_LENGTH = 11659;
const LANE_SCALE = 26;
const cases = [];
const check = (name, actual, expected) => {
  const pass = actual === expected;
  cases.push({ pass });
  process.stdout.write(`  ${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(60)} got ${actual}, want ${expected}\n`);
};

// One rival, parked in a known place, and a player alongside it with a chosen
// sideways speed. Returns whether the rival got spun.
const attempt = ({ lateralVel, laneGap, longitudinalUnits, playerSpinning = false }) => {
  const field = createRivalRacers([{ character: 'penguin', kart: 'hero', name: 'Target' }], {
    gridProgress: 0.2,
  });
  const rival = field[0];
  rival.progress = 0.2 + longitudinalUnits / TRACK_LENGTH;
  rival.lap = 1;
  rival.lane = laneGap;
  rival.speed = 240;
  rival.laneVel = 0;
  rival.spinTimer = 0;
  rival.bumpCooldown = 0;

  let spun = false;
  for (let i = 0; i < 12; i += 1) {
    updateRivalRacers(field, {
      // A straight, empty stretch: the pit rule is what is under test, not
      // cornering or boost behaviour, so the track model is deliberately inert.
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
        lateralVel,
        progress: 0.2,
        speed: 240,
        spinning: playerSpinning,
        total: 0.2,
      },
      raceTime: 5,
      trackLength: TRACK_LENGTH,
      wallLane: 0.95,
    });
    if (rival.spinTimer > 0) spun = true;
  }
  return spun;
};

process.stdout.write('pit manoeuvre\n');
process.stdout.write(
  `  (needs |lat| >= ${KART_CONTACT.pitMinLatUnits}u, gap ${KART_CONTACT.pitRearQuarterMin}-${KART_CONTACT.pitRearQuarterMax}u, ` +
    `lateral closing > ${KART_CONTACT.pitLateralSpeed} wu/s)\n`
);

// MUST FIRE — the deliberate move: alongside, slightly behind, flicking in.
{
  const spun = attempt({ lateralVel: 45, laneGap: 0.2, longitudinalUnits: 4 });
  check('deliberate side flick into the rear quarter spins them', spun, true);
}

// MUST NOT FIRE — running side by side with no sideways input. This is the one
// that matters: clean racing must stay clean.
{
  const spun = attempt({ lateralVel: 0, laneGap: 0.2, longitudinalUnits: 4 });
  check('side-by-side with no lateral input does NOT spin', spun, false);
}

// MUST NOT FIRE — drifting toward them gently. A pit is a flick, not a lean.
{
  const spun = attempt({ lateralVel: KART_CONTACT.pitLateralSpeed * 0.5, laneGap: 0.2, longitudinalUnits: 4 });
  check('a gentle lean does NOT spin', spun, false);
}

// MUST NOT FIRE — flicking the same way while nowhere near them longitudinally.
{
  const spun = attempt({ lateralVel: 45, laneGap: 0.2, longitudinalUnits: 40 });
  check('flicking with nobody alongside does NOT spin', spun, false);
}

// MUST NOT FIRE — hitting their NOSE rather than their back half. Leaning on
// the front of a kart is not a pit and should not spin it.
{
  const spun = attempt({ lateralVel: 45, laneGap: 0.2, longitudinalUnits: -6 });
  check('leaning on their nose does NOT spin', spun, false);
}

// MUST NOT FIRE — while the attacker is already spinning. Otherwise a spun kart
// flails sideways and takes people with it.
{
  const spun = attempt({ lateralVel: 45, laneGap: 0.2, longitudinalUnits: 4, playerSpinning: true });
  check('a spinning attacker does NOT pit anyone', spun, false);
}

// MUST NOT FIRE — flicking AWAY from them.
{
  const spun = attempt({ lateralVel: -45, laneGap: 0.2, longitudinalUnits: 4 });
  check('flicking away from them does NOT spin', spun, false);
}

const failed = cases.filter((c) => !c.pass).length;
process.stdout.write(`\n${cases.length} cases -> ${failed ? `${failed} FAILURES` : 'PASS'}\n`);
if (failed) process.exit(1);
