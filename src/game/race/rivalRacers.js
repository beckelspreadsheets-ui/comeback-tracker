// Phase 2 rival racer simulation — pure math, deterministic (no Math.random),
// no Three.js. Each rival runs an independent progress/lane/speed loop with a
// corner-aware speed governor (same centrifugal model as the player), a simple
// racing line toward the apex, boost-pad usage, MK-style rubber-banding, and
// full kart-vs-kart contact (KART_CONTACT: per-frame push-apart separation +
// cooldown-gated bumps + symmetric rear-hit spin-outs, owner 2026-07-06).
// Personalities follow the avatar sheets. Phase 3 added fish-bone hits +
// item spin-outs + deterministic item gates; Phase 3.5 added ballistic
// ramp/crest launches (rivals jump, but don't trick).
import {
  BLIZZARD,
  dropFishBone,
  fishBoneHitFor,
  insideBlizzard,
  ITEM_FEEL,
  marchHitFor,
  projectileHitFor,
  rivalItemActionAt,
  throwSnowball,
} from './heldItems.js';
import { launchAir, TRICK_FEEL, updateAir } from './airTricks.js';
import { breakableHitFor } from './raceBreakables.js';
import {
  applyCrosserHitToRacer,
  crosserAvoidanceLanes,
  crosserHitFor,
} from './raceCrossers.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const wrap01 = (value) => ((value % 1) + 1) % 1;
const shortDelta = (a, b) => {
  let delta = Math.abs(wrap01(a) - wrap01(b));
  if (delta > 0.5) delta = 1 - delta;
  return delta;
};

export const RIVAL_PERSONALITIES = {
  // CRRT Penguin — clean, dependable lines: early braking, safe margins.
  // Front-runner: paces above the player's raw max — beating him takes
  // mini-turbos and boost pads, which he doesn't have.
  'Blue Speed': {
    authority: 1.25,
    brakeLookahead: 26,
    pace: 1.05,
    risk: 0.92,
    wobble: 0.015,
  },
  // Seth Penguin — erratic late-braker: short lookahead, overcooks corners.
  'Purple Lab': {
    authority: 1.1,
    brakeLookahead: 11,
    pace: 0.99,
    risk: 1.07,
    wobble: 0.06,
  },
  // Orange Muscle — aggressive bumper: hunts the player's lane when close.
  'Orange Muscle': {
    authority: 1.15,
    brakeLookahead: 20,
    bumper: true,
    pace: 0.96,
    risk: 1.0,
    wobble: 0.03,
  },
};

export const RUBBER_BAND = {
  aheadMaxSeconds: 3,
  behindMaxSeconds: 4,
  catchUpBoost: 1.12,
  finalLapCatchUp: 1.03,
  slowDown: 0.93,
};

// Kart-vs-kart contact tuning (owner-requested 2026-07-06: karts must not
// render through each other, and a faster kart square in a slower kart's
// back spins it out — symmetric, player included).
// Box: 9 wu long x 7.5 wu lat matches the kart footprint (15.6 wu long,
// ~10 wu wide) with arcade forgiveness — same numbers the original bump
// shipped with. Separation slides overlapping karts apart every frame
// (7.5 wu resolves in ~0.3 s); impulses stay cooldown-gated so packs
// don't machine-gun bumps.
export const KART_CONTACT = {
  boxLatUnits: 7.5,
  boxLongUnits: 9,
  bumpCooldown: 0.7,
  bumpLanePush: 0.12,
  frontSpeedScale: 0.96,
  rearSpeedScale: 0.9,
  // Separation must beat steering authority (~30-50 wu/s at laneScale ~26)
  // or a passing kart steer-locks into a tailgate on the shared racing line
  // — right where rivals drop fish bones (probe 2026-07-06: 5 item hits per
  // autoplay race at 26 wu/s vs 0 at baseline). 55 resolves a full overlap
  // in ~0.14 s: an MK-style snappy shove, and passes stay passes.
  separationRate: 55, // wu/s of lateral push-apart while overlapping
  // Covers the FULL victim recovery: spin 0.95 s + re-accel from the 46
  // floor past ~180 at ~118 wu/s² ≈ 2.1 s. Every spin start (contact OR
  // item/march/avalanche) must set bumpCooldown to this — otherwise the
  // frame a spin ends the victim sits at 46 and anything behind trivially
  // clears the rear-hit differential, chaining spins forever.
  spinCooldown: 2.4,
  spinLanePush: 0.16,
  spinLatUnits: 3.5, // "perfect in the back" — much tighter than the box
  // Boost-grade differential: a spin needs a deliberate ram (mini-turbo /
  // boost-pad hit, or a target already slowed by a hit or hard corner) —
  // NOT routine pack traffic. At 60 a rubber-banded boosted rival spun the
  // autoplay player twice per lap (probe 2026-07-06); at 85 max-speed
  // deltas (284 boost vs ~228 cruise = 56) stay under it.
  spinSpeedDiff: 85, // closing wu/s the rear kart needs to trigger the spin
  // PIT MANOEUVRE (owner 2026-08-03: "I want pit maneuvers to work if I slide
  // up on someone and try to spin them up from the side"). The rear hit above
  // is a straight-line ram; this is the opposite input — alongside, moving
  // sideways INTO them, landing on their back half.
  //
  // Three gates, and all three matter. Without the lateral-speed gate every
  // side-by-side corner becomes a spin. Without the rear-quarter band you could
  // pit someone by leaning on their nose, which is not a pit. Without the
  // minimum lateral offset it would fire on rear hits that are already handled
  // above, and the two would double-spin.
  pitLateralSpeed: 26, // wu/s of sideways closing needed — a deliberate flick
  pitMinLatUnits: 3.5, // must be genuinely alongside, not square behind
  pitRearQuarterMin: 0.5, // attacker's nose must be at/behind the victim's middle
  pitRearQuarterMax: 9, // ...and no further back than a kart length
  pitAttackerSpeedScale: 0.94, // a pit costs the attacker a little, too
  spinSpeedScale: 0.5, // matches a projectile hit's speed penalty
};

export const createRivalRacers = (rivals, { gridProgress = 0 } = {}) =>
  rivals.map((rival, index) => ({
    air: { airborne: false, big: false, height: 0, spin: 0, trickArmed: false, trickDone: false, verticalVel: 0, wasAction: false },
    boostTimer: 0,
    bumpCooldown: 0,
    lane: rival.lane,
    laneVel: 0,
    lap: 1,
    name: rival.name,
    pads: {},
    personality: RIVAL_PERSONALITIES[rival.name] || RIVAL_PERSONALITIES['Blue Speed'],
    projectileSkin: rival.projectileSkin || 'snowball',
    previousProgress: wrap01(gridProgress + 0.004 + index * 0.005),
    // Staggered grid slots just ahead of the player (player starts P4).
    progress: wrap01(gridProgress + 0.004 + index * 0.005),
    rubber: 1,
    speed: 0,
    spinTimer: 0,
  }));

export const totalProgressOf = (racer) => racer.lap - 1 + racer.progress;

// Live placement: 1 + number of racers ahead of the player.
export const playerPositionOf = (playerTotal, field) =>
  1 + field.reduce((count, rival) => count + (totalProgressOf(rival) > playerTotal ? 1 : 0), 0);

export const rivalPositionsOf = (playerTotal, field) => {
  const standings = [
    { name: 'player', total: playerTotal },
    ...field.map((rival) => ({ name: rival.name, total: totalProgressOf(rival) })),
  ].sort((a, b) => b.total - a.total);
  return standings.map((entry, index) => ({ name: entry.name, position: index + 1 }));
};

// Advance every rival one frame. ctx supplies the shared track model:
// { boostPads, boostSpeed, cornerPushFor, curvatureAt, dt, finalLap,
//   laneScale, maxSpeed, player: { lane, progress, speed, total },
//   raceTime, trackLength, wallLane }
// Returns { playerBump } — a bump the caller applies to the player
// (null when no contact this frame).
export const updateRivalRacers = (field, ctx) => {
  const {
    boostPads,
    boostSpeed,
    breakables,
    cornerPushFor,
    crossers,
    curvatureAt,
    dt,
    finalLap,
    laneScale,
    maxSpeed,
    player,
    raceTime,
    trackLength,
    wallLane,
  } = ctx;

  const { crestProgress, fishBones, ramps } = ctx;
  // Avalanche (ultimate): on the final lap, the last-place racer earns the
  // leader-killer. If that's a rival, it fires once at a fixed progress
  // gate — deterministic comeback pressure aimed at whoever leads.
  let avalancheBy = null;
  if (finalLap && fishBones) {
    let lastRival = null;
    field.forEach((rival) => {
      if (!lastRival || totalProgressOf(rival) < totalProgressOf(lastRival)) lastRival = rival;
    });
    if (
      lastRival &&
      !lastRival.avalancheUsed &&
      totalProgressOf(lastRival) < player.total &&
      lastRival.previousProgress < 0.55 &&
      lastRival.progress >= 0.55
    ) {
      lastRival.avalancheUsed = true;
      avalancheBy = lastRival.name;
    }
  }
  field.forEach((rival, index) => {
    const soul = rival.personality;

    // Spin-out (banana hit): the kart twirls, bleeds speed, and skips its
    // racing brain until it recovers.
    if (rival.spinTimer > 0) {
      rival.spinTimer = Math.max(0, rival.spinTimer - dt);
      rival.speed = Math.max(46, rival.speed - 160 * dt);
      rival.previousProgress = rival.progress;
      rival.progress = wrap01(rival.progress + (rival.speed / trackLength) * dt);
      // V2 rival lap-wrap intentionally uses 0.86; V1 uses LAP_WRAP_THRESHOLD.
      if (rival.previousProgress > 0.86 && rival.progress < 0.18) rival.lap += 1;
      return;
    }

    // Rubber-band on the time gap to the player; the final lap loosens the
    // catch-up so a lead the player earned holds to the line.
    const gapSeconds = ((totalProgressOf(rival) - player.total) * trackLength) / Math.max(60, maxSpeed);
    let rubberTarget = 1;
    if (gapSeconds > RUBBER_BAND.aheadMaxSeconds) rubberTarget = RUBBER_BAND.slowDown;
    else if (gapSeconds < -RUBBER_BAND.behindMaxSeconds) {
      rubberTarget = finalLap ? RUBBER_BAND.finalLapCatchUp : RUBBER_BAND.catchUpBoost;
    }
    rival.rubber = lerp(rival.rubber, rubberTarget, 1 - Math.pow(0.05, dt));

    // Corner-aware speed governor: respect the worst curvature between here
    // and the personality's braking lookahead — late-brakers look shorter.
    const kappaNow = curvatureAt(rival.progress);
    const kappaAhead = curvatureAt(rival.progress + soul.brakeLookahead / trackLength);
    const kappaEff = Math.max(Math.abs(kappaNow), Math.abs(kappaAhead));
    const cornerCap =
      kappaEff > 0.0004
        ? Math.sqrt((soul.authority * soul.risk) / (Math.pow(kappaEff, 0.7) * 0.00052))
        : Infinity;
    const wobble = 1 + Math.sin(rival.progress * 53 + index * 2.4) * soul.wobble;
    let targetSpeed = Math.min(maxSpeed * soul.pace * rival.rubber * wobble, cornerCap);
    if (rival.boostTimer > 0) targetSpeed = Math.min(boostSpeed, targetSpeed + 70);
    rival.boostTimer = Math.max(0, rival.boostTimer - dt);
    rival.speed =
      rival.speed < targetSpeed
        ? Math.min(targetSpeed, rival.speed + 112 * dt)
        : Math.max(targetSpeed, rival.speed - 175 * dt);

    // Racing line: pull toward the inside of the upcoming corner, detour to
    // boost pads, and (Orange Muscle) hunt the player's lane when close.
    let targetLane = clamp(kappaAhead * 90, -1, 1) * 0.55;
    boostPads.forEach((pad) => {
      const aheadBy = wrap01(pad.progress - rival.progress);
      if (aheadBy > 0 && aheadBy < 0.018) targetLane = pad.side || 0;
    });
    if (soul.bumper && Math.abs(totalProgressOf(rival) - player.total) * trackLength < 26) {
      targetLane = lerp(targetLane, player.lane, 0.75);
    }
    targetLane += Math.sin(raceTime * 0.9 + index * 2.1) * 0.05;

    // Crosser avoidance: steer away from fish carts / penguin marches ahead.
    if (crossers?.instances?.length) {
      const hints = crosserAvoidanceLanes({
        crossers,
        lane: rival.lane,
        progress: rival.progress,
        racerSpeed: rival.speed,
        trackLength,
      });
      if (hints.length) {
        const best = hints.sort((a, b) => b.urgency - a.urgency)[0];
        targetLane = lerp(targetLane, best.targetLane, best.urgency);
      }
    }

    const cornerPush = cornerPushFor(kappaNow, rival.speed);
    rival.laneVel = clamp((targetLane - rival.lane) * 2.2, -soul.authority, soul.authority);
    rival.lane = clamp(rival.lane + (rival.laneVel + cornerPush) * dt, -wallLane, wallLane);
    const scraping =
      (rival.lane >= wallLane && rival.laneVel + cornerPush > 0) ||
      (rival.lane <= -wallLane && rival.laneVel + cornerPush < 0);
    if (scraping) rival.speed = Math.max(70, rival.speed - 200 * dt);

    // Boost pads use the same trigger rules as the player.
    boostPads.forEach((pad) => {
      const key = `pad-${pad.key}`;
      if (shortDelta(rival.progress, pad.progress) < 0.012 && Math.abs(rival.lane - (pad.side || 0)) < 0.36) {
        if (!rival.pads[key]) {
          rival.pads[key] = true;
          rival.boostTimer = 1.15;
        }
      } else if (shortDelta(rival.progress, pad.progress) > 0.04) {
        rival.pads[key] = false;
      }
    });

    // Blizzard fog caps grounded karts — rivals respect it too.
    if (
      ctx.blizzards &&
      !rival.air.airborne &&
      insideBlizzard(ctx.blizzards, rival.progress, rival.lane, trackLength)
    ) {
      rival.speed = Math.min(rival.speed, BLIZZARD.capSpeed);
    }

    rival.previousProgress = rival.progress;
    rival.progress = wrap01(rival.progress + (rival.speed / trackLength) * dt);
    // V2 rival lap-wrap intentionally uses 0.86; V1 uses LAP_WRAP_THRESHOLD.
    if (rival.previousProgress > 0.86 && rival.progress < 0.18) rival.lap += 1;

    // Phase 3: deterministic item gates — at fixed progress marks each lap a
    // rival drops a fish bone when ahead, throws a snowball when chasing, or
    // pops a cocoa boost. Comeback pressure flows both ways.
    if (fishBones) {
      const action = rivalItemActionAt(index, rival.previousProgress, rival.progress);
      if (action === 'fishbone') {
        if (ctx.projectiles && gapSeconds < -0.8) {
          throwSnowball(ctx.projectiles, rival.name, rival.progress, rival.lane, rival.speed, rival.projectileSkin);
        } else {
          dropFishBone(fishBones, rival.name, rival.progress, rival.lane, trackLength);
        }
      } else if (action === 'cocoa') rival.boostTimer = Math.max(rival.boostTimer, 0.9);

      // Fish bones, snowballs and the penguin march only catch grounded
      // karts.
      if (!rival.air.airborne) {
        // Every spin start also grants contact immunity for the recovery
        // window (see KART_CONTACT.spinCooldown) so contact spins can't
        // chain onto item spins. All three hazards gate on spinTimer <= 0:
        // an already-spinning rival must not CONSUME a bone for zero
        // effect (W2 audit — the bone now waits for the recovery instead).
        if (rival.spinTimer <= 0) {
          const hit = fishBoneHitFor(fishBones, rival.name, rival.progress, rival.lane, trackLength);
          if (hit) {
            rival.spinTimer = ITEM_FEEL.spinDuration;
            rival.bumpCooldown = KART_CONTACT.spinCooldown;
          }
        }
        if (ctx.projectiles && rival.spinTimer <= 0) {
          const struck = projectileHitFor(ctx.projectiles, rival.name, rival.progress, rival.lane, trackLength);
          if (struck) {
            rival.spinTimer = ITEM_FEEL.spinDuration;
            rival.bumpCooldown = KART_CONTACT.spinCooldown;
          }
        }
        if (ctx.march && rival.spinTimer <= 0 && marchHitFor(ctx.march, rival.progress, rival.lane, trackLength)) {
          rival.spinTimer = ITEM_FEEL.spinDuration;
          rival.bumpCooldown = KART_CONTACT.spinCooldown;
          rival.speed = Math.max(46, rival.speed * 0.45);
        }
      }
    }

    // Breakable track props: rivals smash snowmen and ice pillars too.
    if (breakables?.objects?.length && !rival.air.airborne && rival.spinTimer <= 0) {
      breakableHitFor({
        breakables,
        lane: rival.lane,
        progress: rival.progress,
        trackLength,
      });
    }

    // Moving crosser hazards catch grounded rivals.
    if (crossers?.instances?.length && !rival.air.airborne && rival.spinTimer <= 0) {
      const crosser = crosserHitFor({
        crossers,
        lane: rival.lane,
        progress: rival.progress,
        trackLength,
      });
      if (crosser) applyCrosserHitToRacer({ racer: rival, crosser });
    }

    // Phase 3.5: rivals take ramps and the bridge crest (jump, no tricks).
    if (ramps && !rival.air.airborne) {
      ramps.forEach((ramp) => {
        if (
          shortDelta(rival.progress, ramp.progress) * trackLength < TRICK_FEEL.rampHitProgress &&
          Math.abs(rival.lane - ramp.side) < TRICK_FEEL.rampHitLane
        ) {
          launchAir(rival.air, rival.speed);
        }
      });
      if (
        crestProgress !== undefined &&
        rival.previousProgress < crestProgress &&
        rival.progress >= crestProgress
      ) {
        launchAir(rival.air, rival.speed, { big: true });
      }
    }
    updateAir(rival.air, { actionHeld: false, dt });
  });

  // Kart-vs-kart contact, two layers with different gating:
  // 1) SEPARATION runs every frame two grounded karts overlap — never
  //    cooldown-gated — so a kart can no longer render through another one
  //    (the old one-shot 0.12 lane push left karts interpenetrating for the
  //    whole 0.7 s cooldown; owner issue 2026-07-06).
  // 2) IMPULSES are cooldown-gated per kart: the rear-hit SPIN-OUT when a
  //    clearly faster kart lands square in a slower kart's back (victim
  //    twirls, attacker barely slows — symmetric, player included), else
  //    the plain radial bump (glancing/slow contact — the rear kart eats
  //    the bigger penalty, both get knocked apart).
  field.forEach((rival) => {
    rival.bumpCooldown = Math.max(0, rival.bumpCooldown - dt);
  });
  let playerBump = null;
  let playerNudgeLane = 0;
  let playerSpin = false;
  const karts = [
    {
      cooldown: player.bumpCooldown || 0,
      grounded: !player.airborne,
      lane: player.lane,
      // Sideways world speed. Free-body gives the player a real one; on rails
      // it is 0 and the pit manoeuvre simply never triggers, which is correct —
      // you cannot slide into someone on a rail.
      lateralVel: player.lateralVel || 0,
      ref: null,
      speed: player.speed,
      spinning: Boolean(player.spinning),
      total: player.total,
    },
    ...field.map((rival) => ({
      cooldown: rival.bumpCooldown,
      grounded: !rival.air.airborne,
      lane: rival.lane,
      // Rivals steer in lane space; laneVel is their sideways rate, converted
      // to world units so both sides of a pit are measured the same way.
      lateralVel: (rival.laneVel || 0) * laneScale,
      ref: rival,
      speed: rival.speed,
      spinning: rival.spinTimer > 0,
      total: totalProgressOf(rival),
    })),
  ];
  // Move a kart laterally now so later pairs in the same frame see the
  // post-separation lane; player motion is accumulated for the caller.
  const nudge = (kart, laneDelta) => {
    if (kart.ref) kart.ref.lane = clamp(kart.ref.lane + laneDelta, -wallLane, wallLane);
    else playerNudgeLane += laneDelta;
    kart.lane = clamp(kart.lane + laneDelta, -wallLane, wallLane);
  };
  for (let a = 0; a < karts.length; a += 1) {
    for (let b = a + 1; b < karts.length; b += 1) {
      // Airborne karts fly over contact entirely (also fixes the old
      // phantom mid-air bumps).
      if (!karts[a].grounded || !karts[b].grounded) continue;
      const longUnits = Math.abs(karts[a].total - karts[b].total) * trackLength;
      if (longUnits > KART_CONTACT.boxLongUnits) continue;
      const latUnits = (karts[a].lane - karts[b].lane) * laneScale;
      if (Math.abs(latUnits) > KART_CONTACT.boxLatUnits) continue;
      const apart = latUnits >= 0 ? 1 : -1;

      // Layer 1: slide the overlapping pair apart (rate-limited, split
      // between both karts, capped so they never over-separate).
      const overlap = KART_CONTACT.boxLatUnits - Math.abs(latUnits);
      const step = Math.min(overlap * 0.5, KART_CONTACT.separationRate * dt) / laneScale;
      nudge(karts[a], apart * step);
      nudge(karts[b], -apart * step);

      // Layer 2: impulses.
      if (karts[a].cooldown > 0 || karts[b].cooldown > 0) continue;
      // Aurora Boost: the player plows through kart contact — the rival
      // spins out and gets shoved aside, the player doesn't even wobble.
      if (player.aurora && (!karts[a].ref || !karts[b].ref)) {
        const other = karts[a].ref || karts[b].ref;
        if (other) {
          karts[a].cooldown = KART_CONTACT.spinCooldown;
          karts[b].cooldown = KART_CONTACT.spinCooldown;
          other.bumpCooldown = KART_CONTACT.spinCooldown;
          other.spinTimer = ITEM_FEEL.spinDuration;
          other.lane = clamp(other.lane + (karts[a].ref ? apart : -apart) * 0.2, -wallLane, wallLane);
          other.speed *= 0.55;
        }
        continue;
      }
      const rearFirst = karts[a].total < karts[b].total;
      const rear = rearFirst ? karts[a] : karts[b];
      const front = rearFirst ? karts[b] : karts[a];
      const square = Math.abs(latUnits) < KART_CONTACT.spinLatUnits;
      const closing = rear.speed - front.speed;

      // PIT MANOEUVRE — checked BEFORE the rear hit, because a kart that is
      // alongside and sliding in is doing something deliberate and should not
      // be reinterpreted as a glancing bump.
      //
      // The attacker is the one carrying sideways speed TOWARD the other. The
      // victim is whoever is slightly ahead of that contact point, so the hit
      // lands on their back half and spins the tail out — which is what a pit
      // actually is.
      const longitudinalGap = Math.abs(front.total - rear.total) * trackLength;
      const laterallyAlongside = Math.abs(latUnits) >= KART_CONTACT.pitMinLatUnits;
      const inRearQuarter =
        longitudinalGap >= KART_CONTACT.pitRearQuarterMin &&
        longitudinalGap <= KART_CONTACT.pitRearQuarterMax;
      // Sideways closing, measured from the ATTACKER'S INPUT ONLY — not as a
      // relative velocity between the two karts.
      //
      // Relative velocity is the obvious formula and it is wrong here. The
      // separation layer above pushes overlapping karts apart every frame, so
      // the victim always acquires lateral velocity AWAY from the attacker, and
      // that subtracts into the closing term as if the attacker were flicking
      // harder. The result was a feedback loop where merely leaning on someone
      // long enough eventually read as a pit — caught by the "gentle lean" case
      // in test-pit-manoeuvre.
      //
      // Using the rear kart's own sideways speed toward the victim also matches
      // what the owner described: "if I slide up on someone". It is the
      // attacker's deliberate input that earns the spin, not the geometry the
      // collision response happens to produce.
      const toward = Math.sign(front.lane - rear.lane) || 1;
      const lateralClosing = (rear.lateralVel || 0) * toward;
      if (
        laterallyAlongside &&
        inRearQuarter &&
        lateralClosing > KART_CONTACT.pitLateralSpeed &&
        !front.spinning &&
        !rear.spinning
      ) {
        const frontApart = front === karts[a] ? apart : -apart;
        rear.cooldown = KART_CONTACT.spinCooldown;
        front.cooldown = KART_CONTACT.spinCooldown;
        if (front.ref) {
          front.ref.bumpCooldown = KART_CONTACT.spinCooldown;
          front.ref.spinTimer = ITEM_FEEL.spinDuration;
          front.ref.speed = Math.max(46, front.ref.speed * KART_CONTACT.spinSpeedScale);
          front.ref.lane = clamp(front.ref.lane + frontApart * KART_CONTACT.spinLanePush, -wallLane, wallLane);
        } else {
          playerSpin = true;
          playerBump = {
            cooldown: KART_CONTACT.spinCooldown,
            lanePush: frontApart * KART_CONTACT.spinLanePush,
            speedScale: 1,
          };
        }
        if (rear.ref) {
          rear.ref.bumpCooldown = KART_CONTACT.spinCooldown;
          rear.ref.speed *= KART_CONTACT.pitAttackerSpeedScale;
        } else {
          playerBump = {
            cooldown: KART_CONTACT.spinCooldown,
            lanePush: -frontApart * 0.04,
            speedScale: KART_CONTACT.pitAttackerSpeedScale,
          };
        }
        continue;
      }
      if (square && closing > KART_CONTACT.spinSpeedDiff && !front.spinning && !rear.spinning) {
        // Perfect rear hit: the front kart spins out; the attacker keeps
        // nearly all its speed. The longer spin cooldown stops the same
        // pair from chaining spins while the victim recovers.
        const frontApart = front === karts[a] ? apart : -apart;
        rear.cooldown = KART_CONTACT.spinCooldown;
        front.cooldown = KART_CONTACT.spinCooldown;
        if (front.ref) {
          front.ref.bumpCooldown = KART_CONTACT.spinCooldown;
          front.ref.spinTimer = ITEM_FEEL.spinDuration;
          front.ref.speed = Math.max(46, front.ref.speed * KART_CONTACT.spinSpeedScale);
          front.ref.lane = clamp(front.ref.lane + frontApart * KART_CONTACT.spinLanePush, -wallLane, wallLane);
        } else {
          // The caller applies the spin (shield/aurora rules live there);
          // speedScale 1 — the spin itself carries the speed penalty.
          playerSpin = true;
          playerBump = {
            cooldown: KART_CONTACT.spinCooldown,
            lanePush: frontApart * KART_CONTACT.spinLanePush,
            speedScale: 1,
          };
        }
        if (rear.ref) {
          rear.ref.bumpCooldown = KART_CONTACT.spinCooldown;
          rear.ref.speed *= KART_CONTACT.frontSpeedScale;
        } else {
          playerBump = {
            cooldown: KART_CONTACT.spinCooldown,
            lanePush: -frontApart * 0.06,
            speedScale: KART_CONTACT.frontSpeedScale,
          };
        }
        continue;
      }
      karts[a].cooldown = KART_CONTACT.bumpCooldown;
      karts[b].cooldown = KART_CONTACT.bumpCooldown;
      [
        {
          kart: karts[a],
          lanePush: apart * KART_CONTACT.bumpLanePush,
          speedScale: rearFirst ? KART_CONTACT.rearSpeedScale : KART_CONTACT.frontSpeedScale,
        },
        {
          kart: karts[b],
          lanePush: -apart * KART_CONTACT.bumpLanePush,
          speedScale: rearFirst ? KART_CONTACT.frontSpeedScale : KART_CONTACT.rearSpeedScale,
        },
      ].forEach(({ kart, lanePush, speedScale }) => {
        if (kart.ref) {
          kart.ref.bumpCooldown = KART_CONTACT.bumpCooldown;
          kart.ref.lane = clamp(kart.ref.lane + lanePush, -wallLane, wallLane);
          kart.ref.speed *= speedScale;
        } else {
          playerBump = { cooldown: KART_CONTACT.bumpCooldown, lanePush, speedScale };
        }
      });
    }
  }
  return { avalancheBy, playerBump, playerNudgeLane, playerSpin };
};
