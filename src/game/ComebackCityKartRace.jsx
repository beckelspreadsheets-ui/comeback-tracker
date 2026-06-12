import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Application, Assets, Container, Graphics, Sprite } from 'pixi.js';
import { ArrowLeft, ArrowRight, Flag, Gauge, RotateCcw, Sparkles, Zap } from 'lucide-react';
import raceBackdrop from '../assets/game/comeback-city-race-backdrop-v2.png';
import boostPadSprite from '../assets/game/karts/boost-pad-proof.png';
import itemBoxSprite from '../assets/game/karts/item-box-proof.png';
import playerBoostSprite from '../assets/game/generated-race-v2/player/player-boost.png';
import playerLeanLeftSprite from '../assets/game/generated-race-v2/player/player-lean-left.png';
import playerLeanRightSprite from '../assets/game/generated-race-v2/player/player-lean-right.png';
import playerStraightSprite from '../assets/game/generated-race-v2/player/player-straight.png';
import rivalBlueSprite from '../assets/game/generated-race-v2/rivals/rival-blue-a.png';
import rivalOrangeSprite from '../assets/game/generated-race-v2/rivals/rival-orange-a.png';
import rivalPurpleSprite from '../assets/game/generated-race-v2/rivals/rival-purple-a.png';
import clinicFacadeSprite from '../assets/game/generated/district-facade-clinic.png';
import foodFacadeSprite from '../assets/game/generated/district-facade-food.png';
import garageFacadeSprite from '../assets/game/generated/district-facade-garage.png';
import gymFacadeSprite from '../assets/game/generated/district-facade-gym.png';
import labFacadeSprite from '../assets/game/generated/district-facade-lab.png';
import './comebackCityKartRace.css';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const wrap01 = (value) => ((value % 1) + 1) % 1;
const formatTime = (seconds = 0) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(2).padStart(5, '0')}`;
};

const LAP_DISTANCE = 1720;
const TOTAL_LAPS = 3;
const MAX_BASE_SPEED = 188;
const MAX_BOOST_SPEED = 248;
const WORLD_MARKERS = [
  { kind: 'boost', lane: 0, progress: 0.22 },
  { kind: 'item', lane: -0.55, progress: 0.38 },
  { kind: 'boost', lane: 0.55, progress: 0.58 },
  { kind: 'item', lane: 0.45, progress: 0.76 },
];
const RIVALS = [
  { color: 0x8f33ff, lane: -0.72, phase: 0.18 },
  { color: 0x29b7ff, lane: 0.02, phase: 0.34 },
  { color: 0xff8b21, lane: 0.7, phase: 0.52 },
];
const DISTRICTS = [
  { depth: 0.13, side: -1, scale: 0.48 },
  { depth: 0.27, side: 1, scale: 0.42 },
  { depth: 0.42, side: -1, scale: 0.38 },
  { depth: 0.58, side: 1, scale: 0.34 },
  { depth: 0.75, side: -1, scale: 0.3 },
];
const playerScreenPosition = (race, size, mobile) => {
  const x = size.width / 2 - race.lane * size.width * (mobile ? 0.1 : 0.085);
  const y = size.height * (mobile ? 0.86 : 0.84) + Math.sin(race.raceTime * 10) * clamp(race.speed / 140, 0, 2);
  return { x, y };
};
const selectPlayerTexture = (race, textures) => {
  if (!textures) return null;
  if (race.boostTimer > 0 || race.driftReleaseTimer > 0) return textures.boost;
  if (race.steer < -0.28) return textures.leanLeft;
  if (race.steer > 0.28) return textures.leanRight;
  return textures.straight;
};
const createInitialRace = () => ({
  boostHits: 0,
  boostTimer: 0,
  countdown: 3,
  distance: 0,
  drift: false,
  driftCharge: 0,
  driftReleaseTimer: 0,
  finished: false,
  heldItem: 'EMPTY',
  itemPickups: 0,
  lane: 0,
  lap: 1,
  miniTurbo: 0,
  raceTime: 0,
  routeProgress: 0,
  speed: 0,
  steer: 0,
});

const getInput = (input, autoplay) => {
  if (autoplay) {
    const wave = Math.sin(performance.now() / 760);
    return {
      brake: false,
      drift: Math.abs(wave) > 0.42,
      left: wave < -0.28,
      right: wave > 0.28,
      throttle: true,
    };
  }
  return input.current;
};

const publishTelemetry = (race, fpsEstimate) => {
  if (typeof window === 'undefined') return;
  window.__comebackCityKartTelemetry = {
    boostActive: race.boostTimer > 0,
    boostHits: race.boostHits,
    countdown: Number(race.countdown.toFixed(2)),
    drift: race.drift,
    finished: race.finished,
    fpsEstimate: Math.round(fpsEstimate),
    heldItem: race.heldItem,
    itemPickups: race.itemPickups,
    lap: race.lap,
    miniTurbo: Number(race.miniTurbo.toFixed(2)),
    raceTime: Number(race.raceTime.toFixed(2)),
    renderer: 'pixi-kart',
    rivalCount: RIVALS.length,
    route: 'comeback-city',
    routeProgress: Number(race.routeProgress.toFixed(3)),
    speed: Math.round(race.speed),
    steer: Number(race.steer.toFixed(2)),
    visualAssetSet: 'comeback-city-generated-race-v2',
  };
};

const drawRoundRect = (graphics, x, y, width, height, radius, fill, alpha = 1, stroke = null) => {
  graphics.fill({ alpha, color: fill });
  if (stroke) graphics.stroke(stroke);
  graphics.roundRect(x, y, width, height, radius);
  graphics.fill();
  if (stroke) graphics.stroke();
};

const drawBackground = (graphics, backdrop, race, size, mobile) => {
  graphics.clear();
  const { height, width } = size;
  if (backdrop) {
    const textureWidth = backdrop.texture?.width || 1536;
    const textureHeight = backdrop.texture?.height || 864;
    const cover = Math.max(width / textureWidth, height / textureHeight);
    const speedZoom = clamp(race.speed / 7000, 0, 0.045);
    const mobileZoom = mobile ? 1.16 : 1.06;
    backdrop.scale.set(cover * (mobileZoom + speedZoom));
    backdrop.position.set(
      width / 2 - race.lane * width * 0.028,
      height / 2 + Math.sin(race.routeProgress * Math.PI * 2) * height * 0.01 - race.speed * 0.012
    );
  }

  graphics.fill({ color: 0x061522, alpha: 0.08 });
  graphics.rect(0, 0, width, height);
  graphics.fill();
};

const roadPoint = (size, lane, depth, race, mobile) => {
  const { height, width } = size;
  const horizonY = mobile ? height * 0.31 : height * 0.3;
  const bottomY = height + height * 0.16;
  const t = clamp(depth, 0, 1);
  const yT = Math.pow(t, 1.72);
  const roadT = Math.pow(t, 1.2);
  const routeCurve = Math.sin((race.routeProgress * 2.35 + t * 0.92) * Math.PI * 2);
  const steerCurve = race.steer * width * 0.018 * t;
  const curve = routeCurve * width * 0.12 * Math.pow(t, 1.45) + steerCurve;
  const roadHalf = lerp(width * (mobile ? 0.06 : 0.045), width * (mobile ? 0.72 : 0.64), roadT);
  return {
    centerX: width / 2 + curve - race.lane * width * 0.16 * t,
    x: width / 2 + curve - race.lane * width * 0.16 * t + lane * roadHalf * 0.56,
    y: lerp(horizonY, bottomY, yT),
    roadHalf,
  };
};

const drawRoad = (graphics, race, size, mobile) => {
  graphics.clear();
  const segmentCount = mobile ? 30 : 34;
  const scroll = wrap01(race.distance / 185);
  const boostWindow = race.boostTimer > 0 || Math.sin(race.routeProgress * Math.PI * 8) > 0.72;

  const farLeft = roadPoint(size, -1.85, 0.02, race, mobile);
  const farRight = roadPoint(size, 1.85, 0.02, race, mobile);
  const nearLeft = roadPoint(size, -1.85, 1, race, mobile);
  const nearRight = roadPoint(size, 1.85, 1, race, mobile);
  graphics.beginPath();
  graphics.fill({ color: 0x1b242d, alpha: 0.98 });
  graphics.moveTo(farLeft.x, farLeft.y);
  graphics.lineTo(farRight.x, farRight.y);
  graphics.lineTo(nearRight.x, nearRight.y);
  graphics.lineTo(nearLeft.x, nearLeft.y);
  graphics.closePath();
  graphics.fill();

  for (let index = 0; index < segmentCount; index += 1) {
    const t0 = wrap01(index / segmentCount + scroll);
    const t1 = clamp(t0 + lerp(0.012, 0.038, t0), 0, 1);
    if (t0 < 0.025 || t0 > 0.98 || t1 <= t0) continue;
    const curbColor = (index + Math.floor(race.distance / 52)) % 2 ? 0xf3f7ff : 0xff5d4f;
    [
      [-2.02, -1.82],
      [1.82, 2.02],
    ].forEach(([outerLane, innerLane]) => {
      const o0 = roadPoint(size, outerLane, t0, race, mobile);
      const i0 = roadPoint(size, innerLane, t0, race, mobile);
      const i1 = roadPoint(size, innerLane, t1, race, mobile);
      const o1 = roadPoint(size, outerLane, t1, race, mobile);
      graphics.beginPath();
      graphics.fill({ color: curbColor, alpha: lerp(0.18, 0.78, t0) });
      graphics.moveTo(o0.x, o0.y);
      graphics.lineTo(i0.x, i0.y);
      graphics.lineTo(i1.x, i1.y);
      graphics.lineTo(o1.x, o1.y);
      graphics.closePath();
      graphics.fill();
    });
  }

  graphics.beginPath();
  graphics.stroke({ color: 0xf2f7ff, alpha: 0.78, width: mobile ? 5 : 7 });
  graphics.moveTo(farLeft.x, farLeft.y);
  graphics.lineTo(nearLeft.x, nearLeft.y);
  graphics.moveTo(farRight.x, farRight.y);
  graphics.lineTo(nearRight.x, nearRight.y);
  graphics.stroke();

  for (let index = 0; index < segmentCount; index += 1) {
    const t0 = wrap01(index / segmentCount + scroll);
    const t1 = clamp(t0 + lerp(0.012, 0.045, t0), 0, 1);
    if (t0 < 0.025 || t0 > 0.98 || t1 <= t0) continue;
    [-0.62, 0.62].forEach((laneMark) => {
      const m0 = roadPoint(size, laneMark, t0, race, mobile);
      const m1 = roadPoint(size, laneMark, t1, race, mobile);
      graphics.beginPath();
      graphics.stroke({ color: 0xf2f7ff, alpha: lerp(0.18, 0.82, t0), width: lerp(1, mobile ? 5 : 7, t0) });
      graphics.moveTo(m0.x, m0.y);
      graphics.lineTo(m1.x, m1.y);
      graphics.stroke();
    });

    const c0 = roadPoint(size, 0, t0, race, mobile);
    const c1 = roadPoint(size, 0, t1, race, mobile);
    graphics.beginPath();
    graphics.stroke({ color: 0xffd34f, alpha: lerp(0.26, 0.9, t0), width: lerp(1.5, mobile ? 5 : 7, t0) });
    graphics.moveTo(c0.x - lerp(2, 7, t0), c0.y);
    graphics.lineTo(c1.x - lerp(2, 7, t0), c1.y);
    graphics.moveTo(c0.x + lerp(2, 7, t0), c0.y);
    graphics.lineTo(c1.x + lerp(2, 7, t0), c1.y);
    graphics.stroke();

    if (index % 3 === 0) {
      const grainLane = Math.sin(index * 12.989 + race.distance * 0.03) * 1.2;
      const g0 = roadPoint(size, grainLane, t0, race, mobile);
      const g1 = roadPoint(size, grainLane + 0.08, Math.min(1, t1 + 0.02), race, mobile);
      graphics.beginPath();
      graphics.stroke({ color: 0xffffff, alpha: lerp(0.02, 0.11, t0), width: lerp(1, mobile ? 3 : 4, t0) });
      graphics.moveTo(g0.x, g0.y);
      graphics.lineTo(g1.x, g1.y);
      graphics.stroke();
    }

    if (boostWindow && index % 5 === 0 && t0 > 0.16) {
      const b0 = roadPoint(size, 0, t0, race, mobile);
      const b1 = roadPoint(size, 0, t1, race, mobile);
      const padHalf0 = b0.roadHalf * 0.26;
      const padHalf1 = b1.roadHalf * 0.26;
      graphics.beginPath();
      graphics.fill({ color: 0x32dff8, alpha: lerp(0.12, 0.34, t0) });
      graphics.moveTo(b0.centerX - padHalf0, b0.y);
      graphics.lineTo(b0.centerX + padHalf0, b0.y);
      graphics.lineTo(b1.centerX + padHalf1, b1.y);
      graphics.lineTo(b1.centerX - padHalf1, b1.y);
      graphics.closePath();
      graphics.fill();
    }
  }
};

const markerDepth = (markerProgress, race) => wrap01(markerProgress - race.routeProgress);

const drawItemBox = (graphics, x, y, scale) => {
  graphics.save();
  graphics.fill({ color: 0xff4bd7, alpha: 0.86 });
  graphics.stroke({ color: 0xfff481, alpha: 0.98, width: Math.max(2, 4 * scale) });
  graphics.roundRect(x - 34 * scale, y - 34 * scale, 68 * scale, 68 * scale, 10 * scale);
  graphics.fill();
  graphics.stroke();
  graphics.fill({ color: 0xffffff, alpha: 0.96 });
  graphics.circle(x, y - 6 * scale, 8 * scale);
  graphics.rect(x - 4 * scale, y + 2 * scale, 8 * scale, 18 * scale);
  graphics.fill();
  graphics.restore();
};

const drawBoostPad = (graphics, x, y, scale) => {
  graphics.fill({ color: 0x42e7ff, alpha: 0.2 });
  graphics.stroke({ color: 0x7df6ff, alpha: 0.75, width: Math.max(2, 3 * scale) });
  graphics.roundRect(x - 95 * scale, y - 16 * scale, 190 * scale, 32 * scale, 8 * scale);
  graphics.fill();
  graphics.stroke();
  graphics.fill({ color: 0xbdfaff, alpha: 0.45 });
  for (let index = 0; index < 5; index += 1) {
    graphics.roundRect(x - 78 * scale + index * 36 * scale, y - 10 * scale, 22 * scale, 20 * scale, 5 * scale);
  }
  graphics.fill();
};

const mixColor = (color, target, amount) => {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const tr = (target >> 16) & 255;
  const tg = (target >> 8) & 255;
  const tb = target & 255;
  return (
    (Math.round(lerp(r, tr, amount)) << 16) |
    (Math.round(lerp(g, tg, amount)) << 8) |
    Math.round(lerp(b, tb, amount))
  );
};

const drawPickups = (graphics, sprites, race, size, mobile) => {
  graphics.clear();
  sprites?.forEach((sprite) => {
    sprite.visible = false;
  });
  WORLD_MARKERS.forEach((marker, index) => {
    const depth = markerDepth(marker.progress, race);
    if (depth > 0.7) return;
    const t = Math.pow(1 - depth / 0.7, 1.2);
    if (t < 0.04) return;
    const p = roadPoint(size, marker.lane, t, race, mobile);
    const scale = marker.kind === 'boost'
      ? lerp(mobile ? 0.22 : 0.26, mobile ? 0.9 : 1.05, t)
      : lerp(mobile ? 0.18 : 0.2, mobile ? 0.7 : 0.84, t);
    placeKartSprite(sprites?.[index], p.x, p.y, scale, 0);
  });
};

const drawDistricts = (sprites, race, size, mobile) => {
  sprites?.forEach((sprite, index) => {
    const district = DISTRICTS[index % DISTRICTS.length];
    const depth = wrap01(district.depth - race.routeProgress * 0.85);
    if (depth > 0.84) {
      sprite.visible = false;
      return;
    }
    const t = Math.pow(1 - depth / 0.84, 1.35);
    const edgeLane = district.side * lerp(2.4, 3.05, t);
    const p = roadPoint(size, edgeLane, t, race, mobile);
    const scale = district.scale * lerp(mobile ? 0.22 : 0.24, mobile ? 0.88 : 0.96, t);
    sprite.visible = true;
    sprite.anchor.set(0.5, 0.82);
    sprite.position.set(p.x, p.y + lerp(14, 46, t));
    sprite.scale.set(scale * district.side, scale);
    sprite.alpha = lerp(0.22, 0.92, t);
  });
};

const drawKart = (graphics, x, y, scale, color, options = {}) => {
  const lean = options.lean || 0;
  const isPlayer = options.player === true;
  const main = color;
  const dark = mixColor(color, 0x07101c, 0.45);
  const light = mixColor(color, 0xffffff, 0.22);
  const sx = (value) => x + (value + lean * Math.abs(value) * 0.12) * scale;
  const sy = (value) => y + value * scale;

  graphics.fill({ color: 0x000000, alpha: isPlayer ? 0.42 : 0.34 });
  graphics.ellipse(x, sy(48), (isPlayer ? 96 : 82) * scale, (isPlayer ? 26 : 20) * scale);
  graphics.fill();

  graphics.fill({ color: 0x050a12 });
  graphics.roundRect(sx(-82), sy(-20), 32 * scale, 86 * scale, 16 * scale);
  graphics.roundRect(sx(50), sy(-20), 32 * scale, 86 * scale, 16 * scale);
  graphics.roundRect(sx(-70), sy(-64), 30 * scale, 58 * scale, 15 * scale);
  graphics.roundRect(sx(40), sy(-64), 30 * scale, 58 * scale, 15 * scale);
  graphics.fill();

  graphics.fill({ color: 0x151f2f, alpha: 0.88 });
  graphics.roundRect(sx(-77), sy(-12), 22 * scale, 72 * scale, 12 * scale);
  graphics.roundRect(sx(55), sy(-12), 22 * scale, 72 * scale, 12 * scale);
  graphics.fill();

  graphics.fill({ color: dark });
  graphics.roundRect(sx(-70), sy(-2), 140 * scale, 74 * scale, 18 * scale);
  graphics.fill();

  graphics.fill({ color: main });
  graphics.roundRect(sx(-56), sy(-56), 112 * scale, 108 * scale, 18 * scale);
  graphics.fill();

  graphics.fill({ color: light, alpha: 0.94 });
  graphics.roundRect(sx(-44), sy(-50), 88 * scale, 26 * scale, 14 * scale);
  graphics.fill();

  graphics.fill({ color: 0xf8fbff, alpha: 0.96 });
  graphics.roundRect(sx(-7), sy(-57), 14 * scale, 114 * scale, 6 * scale);
  graphics.fill();

  graphics.fill({ color: 0x0b1c29 });
  graphics.roundRect(sx(-40), sy(-32), 80 * scale, 56 * scale, 15 * scale);
  graphics.fill();

  graphics.fill({ color: 0x18394a });
  graphics.roundRect(sx(-31), sy(-24), 62 * scale, 42 * scale, 13 * scale);
  graphics.fill();

  graphics.fill({ color: main });
  graphics.roundRect(sx(-66), sy(18), 32 * scale, 38 * scale, 12 * scale);
  graphics.roundRect(sx(34), sy(18), 32 * scale, 38 * scale, 12 * scale);
  graphics.fill();

  graphics.fill({ color: 0x46e7ff, alpha: 0.98 });
  graphics.roundRect(sx(-36), sy(22), 26 * scale, 18 * scale, 6 * scale);
  graphics.roundRect(sx(10), sy(22), 26 * scale, 18 * scale, 6 * scale);
  graphics.fill();

  graphics.fill({ color: 0xffc04b, alpha: 0.98 });
  graphics.circle(sx(-28), sy(66), 11 * scale);
  graphics.circle(sx(28), sy(66), 11 * scale);
  graphics.fill();

  graphics.fill({ color: 0x0b1019 });
  graphics.roundRect(sx(-18), sy(56), 36 * scale, 17 * scale, 8 * scale);
  graphics.fill();

  graphics.stroke({ color: 0xffffff, alpha: 0.28, width: Math.max(1.5, 2.2 * scale) });
  graphics.roundRect(sx(-54), sy(-54), 108 * scale, 102 * scale, 18 * scale);
  graphics.stroke();

  if (isPlayer) {
    graphics.fill({ color: 0x46e7ff, alpha: 0.24 });
    graphics.roundRect(sx(-58), sy(74), 116 * scale, 12 * scale, 6 * scale);
    graphics.fill();
  }
};

const placeKartSprite = (sprite, x, y, scale, lean = 0) => {
  if (!sprite) return;
  sprite.visible = true;
  sprite.position.set(x, y);
  sprite.scale.set(scale);
  sprite.rotation = lean * 0.06;
  sprite.skew.x = lean * 0.03;
};

const drawRivals = (graphics, sprites, race, size, mobile) => {
  graphics.clear();
  RIVALS.forEach((rival, index) => {
    const depth = wrap01(rival.phase + race.routeProgress * 0.72 + index * 0.05);
    const t = clamp(0.2 + depth * 0.36, 0.18, 0.56);
    const p = roadPoint(size, rival.lane + Math.sin(race.raceTime * 0.9 + index) * 0.08, t, race, mobile);
    const scale = lerp(mobile ? 0.13 : 0.14, mobile ? 0.38 : 0.44, t);
    placeKartSprite(sprites?.[index], p.x, p.y, scale, Math.sin(race.raceTime * 1.7 + index) * 0.24);
  });
};

const drawPlayer = (graphics, sprite, textures, race, size, mobile) => {
  graphics.clear();
  const { x, y } = playerScreenPosition(race, size, mobile);
  const selectedTexture = selectPlayerTexture(race, textures);
  if (selectedTexture && sprite?.texture !== selectedTexture) sprite.texture = selectedTexture;
  const scale = mobile ? 0.78 : 0.86;
  placeKartSprite(sprite, x, y, scale, -race.steer * 0.42);
};

const drawVfx = (graphics, race, size, mobile) => {
  graphics.clear();
  const { x, y } = playerScreenPosition(race, size, mobile);
  const speedAlpha = clamp(race.speed / MAX_BOOST_SPEED, 0, 1);
  if (speedAlpha > 0.25 || race.boostTimer > 0 || race.drift) {
    graphics.fill({ color: race.boostTimer > 0 ? 0xff8b21 : 0x46d9ef, alpha: race.boostTimer > 0 ? 0.72 : 0.42 });
    for (let index = 0; index < 9; index += 1) {
      const side = index % 2 ? 1 : -1;
      const px = x + side * (mobile ? 36 : 46) + side * (index % 5) * 13 + Math.sin(race.raceTime * 19 + index) * 12;
      const py = y + (mobile ? 92 : 108) + index * 6 + speedAlpha * 22;
      graphics.circle(px, py, (4 + (index % 4)) * (race.boostTimer > 0 ? 1.3 : 1));
    }
    graphics.fill();
  }
  if (race.drift || race.driftReleaseTimer > 0) {
    graphics.stroke({ color: race.miniTurbo > 0.45 ? 0xffd34f : 0x46e7ff, alpha: 0.86, width: 3 });
    for (let index = 0; index < 7; index += 1) {
      const side = index % 2 ? 1 : -1;
      const px = x + side * ((mobile ? 84 : 108) + index * 5);
      const py = y + (mobile ? 54 : 68) + Math.sin(race.raceTime * 20 + index) * 20;
      graphics.moveTo(px - 12 * side, py - 8);
      graphics.lineTo(px + 10 * side, py + 8);
    }
    graphics.stroke();
  }
};

const drawFinishGate = (graphics, race, size, mobile) => {
  graphics.clear();
  const depth = race.finished ? 0.7 : markerDepth(0.985, race);
  if (race.lap < TOTAL_LAPS && !race.finished) return;
  if (depth > 0.58 && !race.finished) return;
  const t = race.finished ? 0.72 : Math.pow(1 - depth / 0.58, 1.15);
  const left = roadPoint(size, -1.25, t, race, mobile);
  const right = roadPoint(size, 1.25, t, race, mobile);
  graphics.stroke({ color: 0xffffff, alpha: 0.94, width: Math.max(3, 7 * t) });
  graphics.moveTo(left.x, left.y);
  graphics.lineTo(right.x, right.y);
  graphics.stroke();
  const tileWidth = (right.x - left.x) / 16;
  for (let index = 0; index < 16; index += 1) {
    graphics.fill({ color: index % 2 ? 0xffffff : 0x10151d, alpha: 0.94 });
    graphics.rect(left.x + index * tileWidth, left.y - 22 * t, tileWidth, 24 * t);
    graphics.fill();
  }
};

const renderScene = (layers, race, host) => {
  const width = Math.max(1, host.clientWidth);
  const height = Math.max(1, host.clientHeight);
  const mobile = width < 760 || height > width;
  drawBackground(layers.background, layers.backdrop, race, { height, width }, mobile);
  drawDistricts(layers.districtSprites, race, { height, width }, mobile);
  drawRoad(layers.road, race, { height, width }, mobile);
  drawPickups(layers.pickups, layers.pickupSprites, race, { height, width }, mobile);
  drawRivals(layers.rivals, layers.rivalSprites, race, { height, width }, mobile);
  drawFinishGate(layers.finish, race, { height, width }, mobile);
  drawPlayer(layers.player, layers.playerSprite, layers.playerTextures, race, { height, width }, mobile);
  drawVfx(layers.vfx, race, { height, width }, mobile);
};

export const ComebackCityKartRace = ({
  onFinish,
  reducedMotion = false,
  track,
}) => {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const layersRef = useRef(null);
  const raceRef = useRef(createInitialRace());
  const inputRef = useRef({ brake: false, drift: false, left: false, right: false, throttle: false });
  const finishSentRef = useRef(false);
  const fpsRef = useRef({ estimate: 60, last: performance.now() });
  const [race, setRace] = useState(() => raceRef.current);
  const autoplay = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('playableAutoplay') === '1';
  }, []);

  const resetRace = useCallback(() => {
    const next = createInitialRace();
    raceRef.current = next;
    finishSentRef.current = false;
    setRace(next);
  }, []);

  useEffect(() => {
    const down = (event) => {
      if (event.code === 'ArrowUp' || event.code === 'KeyW') inputRef.current.throttle = true;
      if (event.code === 'ArrowDown' || event.code === 'KeyS') inputRef.current.brake = true;
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') inputRef.current.left = true;
      if (event.code === 'ArrowRight' || event.code === 'KeyD') inputRef.current.right = true;
      if (event.code === 'Space' || event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        event.preventDefault();
        inputRef.current.drift = true;
      }
    };
    const up = (event) => {
      if (event.code === 'ArrowUp' || event.code === 'KeyW') inputRef.current.throttle = false;
      if (event.code === 'ArrowDown' || event.code === 'KeyS') inputRef.current.brake = false;
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') inputRef.current.left = false;
      if (event.code === 'ArrowRight' || event.code === 'KeyD') inputRef.current.right = false;
      if (event.code === 'Space' || event.code === 'ShiftLeft' || event.code === 'ShiftRight') inputRef.current.drift = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver;
    let frame = 0;

    const setup = async () => {
      const host = hostRef.current;
      if (!host) return;
      const app = new Application();
      await app.init({
        antialias: false,
        autoDensity: true,
        backgroundAlpha: 0,
        powerPreference: 'high-performance',
        resolution: Math.min(1, window.devicePixelRatio || 1) * 0.5,
        resizeTo: host,
      });
      if (cancelled) {
        app.destroy(true);
        return;
      }
      app.canvas.dataset.visualCanvas = 'race';
      app.canvas.dataset.raceRenderer = 'pixi-kart';
      app.canvas.className = 'comeback-kart-race__canvas';
      host.appendChild(app.canvas);
      appRef.current = app;

      const root = new Container();
      const [
        backgroundTexture,
        playerStraightTexture,
        playerLeanLeftTexture,
        playerLeanRightTexture,
        playerBoostTexture,
        purpleTexture,
        blueTexture,
        orangeTexture,
        itemTexture,
        boostTexture,
        gymTexture,
        foodTexture,
        labTexture,
        clinicTexture,
        garageTexture,
      ] = await Promise.all([
        Assets.load(raceBackdrop),
        Assets.load(playerStraightSprite),
        Assets.load(playerLeanLeftSprite),
        Assets.load(playerLeanRightSprite),
        Assets.load(playerBoostSprite),
        Assets.load(rivalPurpleSprite),
        Assets.load(rivalBlueSprite),
        Assets.load(rivalOrangeSprite),
        Assets.load(itemBoxSprite),
        Assets.load(boostPadSprite),
        Assets.load(gymFacadeSprite),
        Assets.load(foodFacadeSprite),
        Assets.load(labFacadeSprite),
        Assets.load(clinicFacadeSprite),
        Assets.load(garageFacadeSprite),
      ]);
      const backdrop = new Sprite(backgroundTexture);
      backdrop.anchor.set(0.5);
      const playerTextures = {
        boost: playerBoostTexture,
        leanLeft: playerLeanLeftTexture,
        leanRight: playerLeanRightTexture,
        straight: playerStraightTexture,
      };
      const playerSpriteNode = new Sprite(playerStraightTexture);
      playerSpriteNode.anchor.set(0.5, 0.62);
      const rivalSprites = [purpleTexture, blueTexture, orangeTexture].map((texture) => {
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5, 0.62);
        return sprite;
      });
      const pickupSprites = WORLD_MARKERS.map((marker) => {
        const sprite = new Sprite(marker.kind === 'boost' ? boostTexture : itemTexture);
        sprite.anchor.set(0.5, 0.62);
        sprite.visible = false;
        return sprite;
      });
      const districtSprites = [gymTexture, foodTexture, labTexture, clinicTexture, garageTexture].map((texture) => {
        const sprite = new Sprite(texture);
        sprite.visible = false;
        return sprite;
      });
      const background = new Graphics();
      const road = new Graphics();
      const pickups = new Graphics();
      const rivals = new Graphics();
      const finish = new Graphics();
      const player = new Graphics();
      const vfx = new Graphics();
      root.addChild(backdrop, background, ...districtSprites, road, pickups, ...pickupSprites, rivals, finish, ...rivalSprites, playerSpriteNode, player, vfx);
      app.stage.addChild(root);
      layersRef.current = {
        backdrop,
        background,
        districtSprites,
        finish,
        pickupSprites,
        pickups,
        player,
        playerSprite: playerSpriteNode,
        playerTextures,
        rivals,
        rivalSprites,
        road,
        vfx,
      };

      const render = () => {
        const layers = layersRef.current;
        const hostNow = hostRef.current;
        if (!layers || !hostNow) return;
        renderScene(layers, raceRef.current, hostNow);
      };

      resizeObserver = new ResizeObserver(render);
      resizeObserver.observe(host);

      const tick = (now) => {
        const previous = raceRef.current;
        const last = fpsRef.current.last;
        const dt = reducedMotion
          ? 1 / 30
          : Math.min(0.05, Math.max(0.001, (now - last) / 1000));
        fpsRef.current.last = now;
        fpsRef.current.estimate = lerp(fpsRef.current.estimate, 1 / Math.max(dt, 0.001), 0.08);
        const input = getInput(inputRef, autoplay);
        const countdown = Math.max(0, previous.countdown - dt);
        const raceActive = countdown <= 0 && !previous.finished;
        const steerTarget = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const steer = previous.steer + (steerTarget - previous.steer) * Math.min(1, dt * 8);
        const boostTimer = Math.max(0, previous.boostTimer - dt);
        const driftActive = raceActive && input.drift && Math.abs(steer) > 0.12 && previous.speed > 72;
        const driftCharge = driftActive
          ? clamp(previous.driftCharge + dt * (0.44 + Math.abs(steer) * 0.42), 0, 1)
          : Math.max(0, previous.driftCharge - dt * 0.8);
        const justReleasedDrift = previous.drift && !driftActive && previous.driftCharge > 0.45;
        const driftReleaseTimer = justReleasedDrift ? 0.9 : Math.max(0, previous.driftReleaseTimer - dt);
        const miniTurbo = justReleasedDrift ? previous.driftCharge : Math.max(0, previous.miniTurbo - dt * 0.75);
        let speed = previous.speed;
        if (raceActive) {
          speed += input.throttle ? 190 * dt : -42 * dt;
          speed -= input.brake ? 250 * dt : 0;
          speed -= speed * (input.brake ? 0.46 : 0.075) * dt;
          if (boostTimer > 0) speed += 92 * dt;
          if (justReleasedDrift) speed += 74 * previous.driftCharge;
        } else {
          speed -= speed * 0.2 * dt;
        }
        speed = clamp(speed, 0, boostTimer > 0 || miniTurbo > 0 ? MAX_BOOST_SPEED : MAX_BASE_SPEED);
        const lane = clamp(previous.lane + steer * dt * (0.7 + speed / 250), -1, 1);
        const nextDistance = previous.distance + (raceActive ? speed * dt : 0);
        const lapRaw = Math.floor(nextDistance / LAP_DISTANCE) + 1;
        const lap = clamp(lapRaw, 1, TOTAL_LAPS);
        const routeProgress = (nextDistance % LAP_DISTANCE) / LAP_DISTANCE;
        const activeMarker = WORLD_MARKERS.find((marker) => {
          const depth = markerDepth(marker.progress, { routeProgress });
          return depth > 0.93 && Math.abs(marker.lane - lane) < 0.8;
        });
        const boostTriggered = raceActive && activeMarker?.kind === 'boost' && previous.boostTimer <= 0.02;
        const itemTriggered = raceActive && activeMarker?.kind === 'item' && previous.heldItem === 'EMPTY';
        const finished = previous.finished || nextDistance >= LAP_DISTANCE * TOTAL_LAPS;
        const next = {
          boostHits: previous.boostHits + (boostTriggered ? 1 : 0),
          boostTimer: boostTriggered ? 1.45 : boostTimer,
          countdown,
          distance: nextDistance,
          drift: driftActive,
          driftCharge,
          driftReleaseTimer,
          finished,
          heldItem: itemTriggered ? 'TRAINER SPARK' : previous.heldItem,
          itemPickups: previous.itemPickups + (itemTriggered ? 1 : 0),
          lane,
          lap,
          miniTurbo,
          raceTime: previous.raceTime + (raceActive ? dt : 0),
          routeProgress,
          speed,
          steer,
        };
        raceRef.current = next;
        publishTelemetry(next, fpsRef.current.estimate);
        render();
        if (frame % 5 === 0) setRace(next);
        if (next.finished && !finishSentRef.current) {
          finishSentRef.current = true;
          onFinish?.({
            bestLap: next.raceTime / TOTAL_LAPS,
            place: 1,
            time: next.raceTime,
            trackKey: track?.key || 'comeback-city',
          });
        }
        frame += 1;
      };

      app.ticker.add(() => tick(performance.now()));
      render();
    };

    setup();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: false });
        appRef.current = null;
      }
      layersRef.current = null;
    };
  }, [autoplay, onFinish, reducedMotion, track?.key]);

  const setTouch = (key, value) => (event) => {
    event.preventDefault();
    inputRef.current[key] = value;
  };

  const countdownText = race.countdown > 0 ? Math.ceil(race.countdown) : race.finished ? 'FINISH' : 'GO!';
  const objectiveDistance = Math.max(0, Math.round((1 - race.routeProgress) * 320));

  return (
    <section
      className={`comeback-kart-race ${race.boostTimer > 0 ? 'comeback-kart-race--boost' : ''}`}
      data-finished={race.finished ? 'true' : 'false'}
      data-race-renderer="pixi-kart"
      data-testid="comeback-city-kart-race"
    >
      <div ref={hostRef} className="comeback-kart-race__stage" />
      <div className="comeback-kart-race__hud comeback-kart-race__hud--top">
        <div>
          <strong>COMEBACK CITY GP</strong>
          <span>Lap {race.lap}/{TOTAL_LAPS}</span>
        </div>
        <div>
          <strong>{Math.round(race.speed)}</strong>
          <span>Speed</span>
        </div>
        <div>
          <strong>{race.heldItem}</strong>
          <span>Held item</span>
        </div>
      </div>
      <div className="comeback-kart-race__objective">
        <strong>Next Objective</strong>
        <span>Reach the Gym - {objectiveDistance}m</span>
      </div>
      <div className="comeback-kart-race__meter" aria-label="Race progress">
        <i style={{ width: `${((race.lap - 1 + race.routeProgress) / TOTAL_LAPS) * 100}%` }} />
      </div>
      <div className="comeback-kart-race__countdown" aria-live="polite">{countdownText}</div>
      <div className="comeback-kart-race__drift">
        <span>Drift</span>
        <i style={{ width: `${Math.max(race.driftCharge, race.miniTurbo) * 100}%` }} />
      </div>
      {race.finished && (
        <div className="comeback-kart-race__results">
          <strong>Finish</strong>
          <span>{formatTime(race.raceTime)} - 1st Place</span>
          <button type="button" onClick={resetRace}>
            <RotateCcw size={15} />
            Restart
          </button>
        </div>
      )}
      <div className="comeback-kart-race__go" aria-label="Accelerate control">
        <Gauge size={18} />
        GO!
      </div>
      <div className="comeback-kart-race__touch" aria-label="Kart race touch controls">
        <button type="button" onPointerCancel={setTouch('left', false)} onPointerDown={setTouch('left', true)} onPointerUp={setTouch('left', false)}>
          <ArrowLeft size={16} />
          Left
        </button>
        <button type="button" onPointerCancel={setTouch('throttle', false)} onPointerDown={setTouch('throttle', true)} onPointerUp={setTouch('throttle', false)}>
          <Zap size={16} />
          Go
        </button>
        <button type="button" onPointerCancel={setTouch('drift', false)} onPointerDown={setTouch('drift', true)} onPointerUp={setTouch('drift', false)}>
          <Sparkles size={16} />
          Drift
        </button>
        <button type="button" onPointerCancel={setTouch('right', false)} onPointerDown={setTouch('right', true)} onPointerUp={setTouch('right', false)}>
          <ArrowRight size={16} />
          Right
        </button>
      </div>
      <div className="comeback-kart-race__finish-pill">
        <Flag size={15} />
        Full lap route
      </div>
    </section>
  );
};
