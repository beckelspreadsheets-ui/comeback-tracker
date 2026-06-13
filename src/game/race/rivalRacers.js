// Phase 2 rival racer simulation — pure math, deterministic (no Math.random),
// no Three.js. Each rival runs an independent progress/lane/speed loop with a
// corner-aware speed governor (same centrifugal model as the player), a simple
// racing line toward the apex, boost-pad usage, MK-style rubber-banding, and
// radial kart-vs-kart bumps. Personalities follow the avatar sheets.
// Phase 3 adds fish-bone hits + spin-outs + deterministic item gates; Phase
// 3.5 adds ballistic ramp/crest launches (rivals jump, but don't trick).
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
    cornerPushFor,
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
        const hit = fishBoneHitFor(fishBones, rival.name, rival.progress, rival.lane, trackLength);
        if (hit) rival.spinTimer = ITEM_FEEL.spinDuration;
        if (ctx.projectiles && rival.spinTimer <= 0) {
          const struck = projectileHitFor(ctx.projectiles, rival.name, rival.progress, rival.lane, trackLength);
          if (struck) rival.spinTimer = ITEM_FEEL.spinDuration;
        }
        if (ctx.march && rival.spinTimer <= 0 && marchHitFor(ctx.march, rival.progress, rival.lane, trackLength)) {
          rival.spinTimer = ITEM_FEEL.spinDuration;
          rival.speed = Math.max(46, rival.speed * 0.45);
        }
      }
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

  // Kart-vs-kart radial bumps (no spinouts yet — Phase 3 adds those). The
  // rear kart eats the bigger penalty; both get knocked apart laterally.
  // Per-kart cooldowns stop side-by-side packs from machine-gunning bumps.
  field.forEach((rival) => {
    rival.bumpCooldown = Math.max(0, rival.bumpCooldown - dt);
  });
  let playerBump = null;
  const karts = [
    { cooldown: player.bumpCooldown || 0, lane: player.lane, ref: null, total: player.total },
    ...field.map((rival) => ({
      cooldown: rival.bumpCooldown,
      lane: rival.lane,
      ref: rival,
      total: totalProgressOf(rival),
    })),
  ];
  for (let a = 0; a < karts.length; a += 1) {
    for (let b = a + 1; b < karts.length; b += 1) {
      if (karts[a].cooldown > 0 || karts[b].cooldown > 0) continue;
      const longUnits = Math.abs(karts[a].total - karts[b].total) * trackLength;
      const latUnits = (karts[a].lane - karts[b].lane) * laneScale;
      if (longUnits > 9 || Math.abs(latUnits) > 7.5) continue;
      const apart = latUnits >= 0 ? 1 : -1;
      const rearFirst = karts[a].total < karts[b].total;
      karts[a].cooldown = 0.7;
      karts[b].cooldown = 0.7;
      // Aurora Boost: the player plows through kart contact — the rival
      // spins out and gets shoved aside, the player doesn't even wobble.
      if (player.aurora && (!karts[a].ref || !karts[b].ref)) {
        const other = karts[a].ref || karts[b].ref;
        if (other) {
          other.bumpCooldown = 0.7;
          other.spinTimer = ITEM_FEEL.spinDuration;
          other.lane = clamp(other.lane + (karts[a].ref ? apart : -apart) * 0.2, -wallLane, wallLane);
          other.speed *= 0.55;
        }
        continue;
      }
      [
        { kart: karts[a], lanePush: apart * 0.12, speedScale: rearFirst ? 0.9 : 0.96 },
        { kart: karts[b], lanePush: -apart * 0.12, speedScale: rearFirst ? 0.96 : 0.9 },
      ].forEach(({ kart, lanePush, speedScale }) => {
        if (kart.ref) {
          kart.ref.bumpCooldown = 0.7;
          kart.ref.lane = clamp(kart.ref.lane + lanePush, -wallLane, wallLane);
          kart.ref.speed *= speedScale;
        } else {
          playerBump = { cooldown: 0.7, lanePush, speedScale };
        }
      });
    }
  }
  return { avalancheBy, playerBump };
};
