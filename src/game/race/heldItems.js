// Held-item system — pure math, deterministic (no Math.random).
// Themed item set (owner-approved): Hot Cocoa (boost), Fish Bone (dropped
// hazard), Ice Shield (one-hit shield), Snowball (forward projectile that
// renders with a per-character skin — carrot for CRRT Bunny, ice shard for
// the penguins — identical stats, cosmetic flavor only).

const wrap01 = (value) => ((value % 1) + 1) % 1;
const shortDelta = (a, b) => {
  let delta = Math.abs(wrap01(a) - wrap01(b));
  if (delta > 0.5) delta = 1 - delta;
  return delta;
};

export const ITEM_KEYS = ['aurora', 'avalanche', 'blizzard', 'cocoa', 'fishbone', 'iceshield', 'march', 'sardine', 'slapfish', 'snowball'];

// HUD labels for the themed names (keys stay terse for telemetry).
export const ITEM_LABELS = {
  aurora: 'AURORA',
  avalanche: 'AVALANCHE',
  blizzard: 'BLIZZARD',
  cocoa: 'COCOA',
  fishbone: 'FISH BONE',
  iceshield: 'ICE SHIELD',
  march: 'MARCH',
  sardine: 'SARDINE',
  slapfish: 'SLAP FISH',
  snowball: 'SNOWBALL',
};

// Aurora Boost: ~3s of invincible speed — fish bones, projectiles, blizzard
// fog and kart contact all bounce off (they spin, you don't).
export const AURORA = {
  duration: 3,
  speedKick: 60,
};

// Comeback logic (owner direction): the further back you are, the more
// aggressive your pickups. Leaders get defense only, mid-pack gets skirmish
// and zone items, tailenders get the passing tools. Deterministic — table
// indexed by (boxIndex + lap).
const ITEM_TABLES = {
  1: ['fishbone', 'iceshield', 'fishbone', 'iceshield'],
  2: ['cocoa', 'slapfish', 'iceshield', 'blizzard'],
  3: ['snowball', 'slapfish', 'sardine', 'cocoa'],
  4: ['snowball', 'sardine', 'snowball', 'cocoa'],
};
// Ultimates are P4-final-lap exclusive (owner-approved tiering): earned by
// desperation, deterministic, tunable.
const FINAL_LAP_P4_TABLE = ['avalanche', 'aurora', 'march', 'sardine'];

// Slap Fish: melee swipe — spins any kart riding alongside. The counter to
// bumper personalities; useless at range, hilarious in a scrum.
export const SLAP_FISH = {
  hitLane: 0.55, // generous side window — it's a fish, it's big
  hitProgress: 12, // world units fore/aft that count as "alongside"
  swingDuration: 0.55,
};

// Names of every racer the swipe connects with (the swiper never hits
// themselves).
export const slapFishHitsFor = (racers, swiperName, progress, lane, trackLength) =>
  racers
    .filter(
      (racer) =>
        racer.name !== swiperName &&
        shortDelta(progress, racer.progress) * trackLength < SLAP_FISH.hitProgress &&
        Math.abs(lane - racer.lane) < SLAP_FISH.hitLane
    )
    .map((racer) => racer.name);

// Avalanche: the leader-killer ultimate. Locks onto whoever is P1 when
// fired, rumbles a warning, then buries them — through any shield.
export const AVALANCHE = {
  spinDuration: 1.5,
  speedScale: 0.35,
  warningDuration: 1.5,
};

// Snowball: thrown forward, outruns the field, spins out the first kart it
// catches. The basic "you're behind — do something about it" item.
export const SNOWBALL = {
  hitLane: 0.17,
  hitProgress: 9,
  relSpeed: 95,
  ttl: 2.6,
};

export const throwSnowball = (projectiles, owner, progress, lane, speed, skin = 'snowball') => {
  projectiles.push({
    lane,
    owner,
    progress: wrap01(progress + 6 / 3000),
    skin,
    speed: speed + SNOWBALL.relSpeed,
    ttl: SNOWBALL.ttl,
  });
};

// Rocket Sardine: a homing snowball aimed at the kart DIRECTLY AHEAD of the
// shooter — the passing tool (Avalanche is the leader-killer). It steers its
// lane toward the target while it flies; a shield still eats the hit.
export const SARDINE = {
  laneSteer: 2.4, // lane units/s it can correct toward the target
  relSpeed: 88,
  ttl: 3.4,
};

// The racer directly ahead of the shooter, or null if nobody is.
export const sardineTargetFor = (racers, shooterTotal) => {
  let target = null;
  racers.forEach((racer) => {
    const gap = (racer.lap - 1 + racer.progress) - shooterTotal;
    if (gap > 0 && (!target || gap < target.gap)) target = { gap, name: racer.name };
  });
  return target ? target.name : null;
};

export const throwSardine = (projectiles, owner, progress, lane, speed, targetName) => {
  projectiles.push({
    homing: targetName, // null = flies straight, plain snowball rules
    lane,
    owner,
    progress: wrap01(progress + 6 / 3000),
    skin: 'sardine',
    speed: speed + SARDINE.relSpeed,
    ttl: SARDINE.ttl,
  });
};

// racers (optional) lets homing projectiles steer toward their target's
// live lane; plain snowballs ignore it.
export const updateProjectiles = (projectiles, dt, trackLength, racers = null) => {
  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const ball = projectiles[index];
    if (ball.homing && racers) {
      const target = racers.find((racer) => racer.name === ball.homing);
      if (target) {
        const delta = target.lane - ball.lane;
        const step = SARDINE.laneSteer * dt;
        ball.lane += Math.abs(delta) < step ? delta : Math.sign(delta) * step;
      }
    }
    ball.progress = wrap01(ball.progress + (ball.speed / trackLength) * dt);
    ball.ttl -= dt;
    if (ball.ttl <= 0) projectiles.splice(index, 1);
  }
};

// Returns the snowball that hit this kart (and removes it), or null. Your
// own snowball flies forward faster than you — it can never hit you.
export const projectileHitFor = (projectiles, kartName, progress, lane, trackLength) => {
  for (let index = 0; index < projectiles.length; index += 1) {
    const ball = projectiles[index];
    if (ball.owner === kartName) continue;
    if (
      shortDelta(progress, ball.progress) * trackLength < SNOWBALL.hitProgress &&
      Math.abs(lane - ball.lane) < SNOWBALL.hitLane
    ) {
      projectiles.splice(index, 1);
      return ball;
    }
  }
  return null;
};

export const ITEM_FEEL = {
  fishBoneDropBack: 14, // world units behind the dropper
  fishBoneHitLane: 0.16, // lane distance that counts as a hit
  fishBoneHitProgress: 9, // world units that count as a hit
  fishBonePerKartCap: 2,
  spinDuration: 0.95,
  spinSpeedScale: 0.45,
};

// Deterministic pickup: the kart's live position picks the comeback table,
// (boxIndex + lap) rotates within it — reproducible, but being behind
// reliably arms you. P4 on the final lap unlocks the ultimates.
export const itemForPickup = (boxIndex, lap, position = 4, finalLap = false) => {
  const clamped = Math.min(4, Math.max(1, position));
  const table = finalLap && clamped === 4 ? FINAL_LAP_P4_TABLE : ITEM_TABLES[clamped];
  return table[(boxIndex + lap) % table.length];
};

export const createFishBoneField = () => [];

export const dropFishBone = (fishBones, owner, progress, lane, trackLength) => {
  const owned = fishBones.filter((bone) => bone.owner === owner);
  if (owned.length >= ITEM_FEEL.fishBonePerKartCap) fishBones.splice(fishBones.indexOf(owned[0]), 1);
  fishBones.push({
    grace: 1.4, // seconds the dropper is immune to their fresh drop
    lane,
    owner,
    progress: wrap01(progress - ITEM_FEEL.fishBoneDropBack / trackLength),
  });
};

// Call once per frame to age drop-immunity.
export const ageFishBones = (fishBones, dt) => {
  fishBones.forEach((bone) => {
    bone.grace = Math.max(0, bone.grace - dt);
  });
};

// Returns the fish bone hit by the kart (and removes it), or null. A kart's
// own fish bone only becomes dangerous to them once its grace expires —
// everyone else can hit it immediately.
export const fishBoneHitFor = (fishBones, kartName, progress, lane, trackLength) => {
  for (let index = 0; index < fishBones.length; index += 1) {
    const bone = fishBones[index];
    if (bone.owner === kartName && bone.grace > 0) continue;
    if (
      shortDelta(progress, bone.progress) * trackLength < ITEM_FEEL.fishBoneHitProgress &&
      Math.abs(lane - bone.lane) < ITEM_FEEL.fishBoneHitLane
    ) {
      fishBones.splice(index, 1);
      return bone;
    }
  }
  return null;
};

// Blizzard Cloud: a fog dome parked on the road for ~8s that caps the speed
// of anyone grounded inside it. Readable, dodgeable, brutal where the road
// narrows.
export const BLIZZARD = {
  capSpeed: 96,
  dropBack: 20, // world units behind the dropper — it's a trap, not a hat
  duration: 8,
  hitLane: 0.55,
  hitProgress: 15, // world units — the dome is big
};

export const dropBlizzard = (blizzards, owner, progress, lane, trackLength) => {
  blizzards.push({
    lane,
    owner,
    progress: wrap01(progress - BLIZZARD.dropBack / trackLength),
    ttl: BLIZZARD.duration,
  });
};

export const updateBlizzards = (blizzards, dt) => {
  for (let index = blizzards.length - 1; index >= 0; index -= 1) {
    blizzards[index].ttl -= dt;
    if (blizzards[index].ttl <= 0) blizzards.splice(index, 1);
  }
};

// True when the kart is grounded inside any dome (no owner immunity — your
// own blizzard slows you too; drop it wisely).
export const insideBlizzard = (blizzards, progress, lane, trackLength) =>
  blizzards.some(
    (cloud) =>
      shortDelta(progress, cloud.progress) * trackLength < BLIZZARD.hitProgress &&
      Math.abs(lane - cloud.lane) < BLIZZARD.hitLane
  );

// Penguin March: the signature ultimate. A waddle-train of ordinal penguins
// crosses the road ahead of the firer, sweeping from one edge to the other —
// anyone grounded who hits the line spins. The train is drawn from the
// roster, so it grows as the owner adds penguins.
export const MARCH = {
  aheadUnits: 110, // crossing point ahead of the firer — visible, avoidable
  endLane: 1.45,
  hitProgress: 9,
  laneSpeed: 0.6, // lane units/s the train waddles across
  startLane: -1.35, // head starts off-road
  trainLength: 1.1, // lane units the train occupies
};

export const startMarch = (progress, trackLength) => ({
  head: MARCH.startLane,
  progress: wrap01(progress + MARCH.aheadUnits / trackLength),
});

// Advances the train; returns true when the tail has cleared the far edge.
export const updateMarch = (march, dt) => {
  march.head += MARCH.laneSpeed * dt;
  return march.head - MARCH.trainLength > MARCH.endLane;
};

export const marchHitFor = (march, progress, lane, trackLength) =>
  shortDelta(progress, march.progress) * trackLength < MARCH.hitProgress &&
  lane <= march.head &&
  lane >= march.head - MARCH.trainLength;

// Deterministic rival item behavior: each rival fires at fixed progress
// gates each lap — bumper personalities drop fish bones, racers boost.
export const rivalItemActionAt = (rivalIndex, previousProgress, progress) => {
  const gates = [
    { action: 'fishbone', at: 0.31 },
    { action: 'cocoa', at: 0.66 },
  ];
  for (const gate of gates) {
    const trigger = wrap01(gate.at + rivalIndex * 0.07);
    if (previousProgress < trigger && progress >= trigger) return gate.action;
  }
  return null;
};
