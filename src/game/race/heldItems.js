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

export const ITEM_KEYS = ['cocoa', 'fishbone', 'iceshield', 'snowball'];

// HUD labels for the themed names (keys stay terse for telemetry).
export const ITEM_LABELS = {
  cocoa: 'COCOA',
  fishbone: 'FISH BONE',
  iceshield: 'ICE SHIELD',
  snowball: 'SNOWBALL',
};

// Comeback logic (owner direction): the further back you are, the more
// aggressive your pickups. Leaders get defense, tailenders get snowballs
// and speed. Deterministic — table indexed by (boxIndex + lap).
const ITEM_TABLES = {
  1: ['fishbone', 'iceshield', 'fishbone', 'iceshield'],
  2: ['cocoa', 'fishbone', 'iceshield', 'snowball'],
  3: ['snowball', 'cocoa', 'fishbone', 'cocoa'],
  4: ['snowball', 'cocoa', 'snowball', 'cocoa'],
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

export const updateProjectiles = (projectiles, dt, trackLength) => {
  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const ball = projectiles[index];
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
// reliably arms you.
export const itemForPickup = (boxIndex, lap, position = 4) => {
  const table = ITEM_TABLES[Math.min(4, Math.max(1, position))];
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
