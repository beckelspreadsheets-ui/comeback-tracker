// Phase 3 held-item system — pure math, deterministic (no Math.random).
// Item boxes grant a held item; firing produces a boost, a one-hit shield,
// or a banana dropped behind that spins out whoever runs it over.

const wrap01 = (value) => ((value % 1) + 1) % 1;
const shortDelta = (a, b) => {
  let delta = Math.abs(wrap01(a) - wrap01(b));
  if (delta > 0.5) delta = 1 - delta;
  return delta;
};

export const ITEM_KEYS = ['boost', 'banana', 'shield', 'snowball'];

// Comeback logic (owner direction): the further back you are, the more
// aggressive your pickups. Leaders get defense, tailenders get snowballs
// and speed. Deterministic — table indexed by (boxIndex + lap).
const ITEM_TABLES = {
  1: ['banana', 'shield', 'banana', 'shield'],
  2: ['boost', 'banana', 'shield', 'snowball'],
  3: ['snowball', 'boost', 'banana', 'boost'],
  4: ['snowball', 'boost', 'snowball', 'boost'],
};

// Snowball: thrown forward, outruns the field, spins out the first kart it
// catches. The basic "you're behind — do something about it" item.
export const SNOWBALL = {
  hitLane: 0.17,
  hitProgress: 9,
  relSpeed: 95,
  ttl: 2.6,
};

export const throwSnowball = (projectiles, owner, progress, lane, speed) => {
  projectiles.push({
    lane,
    owner,
    progress: wrap01(progress + 6 / 3000),
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
  bananaDropBack: 14, // world units behind the dropper
  bananaHitLane: 0.16, // lane distance that counts as a hit
  bananaHitProgress: 9, // world units that count as a hit
  bananaPerKartCap: 2,
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

export const createBananaField = () => [];

export const dropBanana = (bananas, owner, progress, lane, trackLength) => {
  const owned = bananas.filter((banana) => banana.owner === owner);
  if (owned.length >= ITEM_FEEL.bananaPerKartCap) bananas.splice(bananas.indexOf(owned[0]), 1);
  bananas.push({
    grace: 1.4, // seconds the dropper is immune to their fresh drop
    lane,
    owner,
    progress: wrap01(progress - ITEM_FEEL.bananaDropBack / trackLength),
  });
};

// Call once per frame to age drop-immunity.
export const ageBananas = (bananas, dt) => {
  bananas.forEach((banana) => {
    banana.grace = Math.max(0, banana.grace - dt);
  });
};

// Returns the banana hit by the kart (and removes it), or null. A kart's
// own banana only becomes dangerous to them once its grace expires —
// everyone else can hit it immediately.
export const bananaHitFor = (bananas, kartName, progress, lane, trackLength) => {
  for (let index = 0; index < bananas.length; index += 1) {
    const banana = bananas[index];
    if (banana.owner === kartName && banana.grace > 0) continue;
    if (
      shortDelta(progress, banana.progress) * trackLength < ITEM_FEEL.bananaHitProgress &&
      Math.abs(lane - banana.lane) < ITEM_FEEL.bananaHitLane
    ) {
      bananas.splice(index, 1);
      return banana;
    }
  }
  return null;
};

// Deterministic rival item behavior: each rival fires at fixed progress
// gates each lap — bumper personalities drop bananas, racers boost.
export const rivalItemActionAt = (rivalIndex, previousProgress, progress) => {
  const gates = [
    { action: 'banana', at: 0.31 },
    { action: 'boost', at: 0.66 },
  ];
  for (const gate of gates) {
    const trigger = wrap01(gate.at + rivalIndex * 0.07);
    if (previousProgress < trigger && progress >= trigger) return gate.action;
  }
  return null;
};
