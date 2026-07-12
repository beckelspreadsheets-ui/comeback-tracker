import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bitcoin,
  BookOpen,
  Car,
  Fish,
  Flag,
  Gauge,
  Medal,
  Rocket,
  Shield,
  ShoppingCart,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { Card } from '../components/primitives.jsx';
import { deriveGameProfile } from './gameProfile.js';
import {
  RACE_ITEMS,
  RACE_UPGRADES,
  normalizeRaceGarage,
  upgradeCost,
} from './raceProgression.js';
import { ArcadeRace3D } from './ArcadeRace3D.jsx';
import {
  ComebackCityThreeKartRace,
  DEFAULT_CHARACTER_KEY,
  HeldItemIcon,
  KART_CHARACTERS,
  KART_OPTIONS,
} from './ComebackCityThreeKartRace.jsx';
import { DEFAULT_TRACK_KEY, KART_TRACKS } from './race/tracks/index.js';
import charCrrtBunnyUrl from '../assets/game/select/char-crrt-bunny.png';
import charSethPenguinUrl from '../assets/game/select/char-seth-penguin.png';
import charMizzleUrl from '../assets/game/select/char-mizzle.png';
import charTclowUrl from '../assets/game/select/char-tclow.png';
import charLayer23Url from '../assets/game/select/char-layer23.png';
import kartHeroUrl from '../assets/game/select/kart-hero.png';
import kartIcesledUrl from '../assets/game/select/kart-icesled.png';
import kartKenneyUrl from '../assets/game/select/kart-kenney.png';

// Portraits are prerendered from the real GLBs by
// scripts/select-portraits-capture.mjs — rerun it when the roster changes.
const CHARACTER_PORTRAITS = {
  'crrt-bunny': charCrrtBunnyUrl,
  layer23: charLayer23Url,
  mizzle: charMizzleUrl,
  'seth-penguin': charSethPenguinUrl,
  tclow: charTclowUrl,
};
const KART_PORTRAITS = {
  hero: kartHeroUrl,
  icesled: kartIcesledUrl,
  kenney: kartKenneyUrl,
};
import { BANKED_ITEMS, COMMON_BOX_ITEMS, ITEM_META } from './raceItems.js';
import { RACE_TRACKS } from './raceTracks.js';

export { RACE_TRACKS } from './raceTracks.js';

const WORLD = { h: 768, w: 1024 };
const CAMERA_ZOOM = { desktop: 1.58, mobile: 1.34 };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const wrap01 = (value) => ((value % 1) + 1) % 1;
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const clampCamera = (value, span, size) =>
  span >= size ? size / 2 : clamp(value, span / 2, size - span / 2);
const formatTime = (seconds = 0) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(2).padStart(5, '0')}`;
};
const ordinal = (value) => (value === 1 ? '1st' : value === 2 ? '2nd' : value === 3 ? '3rd' : `${value}th`);
const scoreCar = (car) => (car.lap - 1) + car.progress + (car.finished ? 10 : 0);

const hasWebGLSupport = () => {
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
};

const angleDelta = (a, b) => {
  let delta = a - b;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
};

const buildSegments = (points, closed = true) => {
  const segments = [];
  let totalLength = 0;
  const limit = closed ? points.length : points.length - 1;
  for (let index = 0; index < limit; index += 1) {
    const point = points[index];
    const next = points[(index + 1) % points.length];
    const dx = next.x - point.x;
    const dy = next.y - point.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    segments.push({
      a: point,
      b: next,
      dx,
      dy,
      length,
      start: totalLength,
      tangent: { x: dx / length, y: dy / length },
    });
    totalLength += length;
  }
  return { segments, totalLength };
};

const pointOnSegments = (segments, totalLength, progress) => {
  const target = clamp(progress, 0, 1) * totalLength;
  const segment =
    segments.find((item) => target >= item.start && target <= item.start + item.length) ||
    segments[segments.length - 1];
  const t = clamp((target - segment.start) / segment.length, 0, 1);
  return {
    point: {
      x: segment.a.x + segment.dx * t,
      y: segment.a.y + segment.dy * t,
    },
    progress: target / totalLength,
    tangent: segment.tangent,
  };
};

const nearestOnSegments = (segments, totalLength, position) => {
  let best = null;
  segments.forEach((segment) => {
    const ax = position.x - segment.a.x;
    const ay = position.y - segment.a.y;
    const t = clamp((ax * segment.dx + ay * segment.dy) / (segment.length * segment.length), 0, 1);
    const point = {
      x: segment.a.x + segment.dx * t,
      y: segment.a.y + segment.dy * t,
    };
    const dist = distance(position, point);
    if (!best || dist < best.distance) {
      const progress = (segment.start + segment.length * t) / totalLength;
      const normal = {
        x: -segment.tangent.y,
        y: segment.tangent.x,
      };
      const side = (position.x - point.x) * normal.x + (position.y - point.y) * normal.y >= 0 ? 1 : -1;
      best = {
        distance: dist,
        normal: { x: normal.x * side, y: normal.y * side },
        point,
        progress,
        tangent: segment.tangent,
      };
    }
  });
  return best;
};

const compileTrack = (track) => {
  const base = buildSegments(track.points, true);
  const pointAt = (progress) => pointOnSegments(base.segments, base.totalLength, wrap01(progress));
  const nearest = (position) => nearestOnSegments(base.segments, base.totalLength, position);
  const shortcuts = (track.shortcuts || []).map((shortcut) => {
    const compiled = buildSegments(shortcut.points, false);
    return {
      ...shortcut,
      pointAt: (progress) => pointOnSegments(compiled.segments, compiled.totalLength, progress),
      nearest: (position) => nearestOnSegments(compiled.segments, compiled.totalLength, position),
      segments: compiled.segments,
      totalLength: compiled.totalLength,
    };
  });

  return { ...track, nearest, pointAt, segments: base.segments, shortcuts, totalLength: base.totalLength };
};

const fillRoundRect = (ctx, x, y, w, h, r = 8) => {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.fill();
};

const drawTrackPath = (ctx, points, width, color, dash = null, closed = true) => {
  if (!points.length) return;
  ctx.beginPath();
  if (closed && points.length > 2) {
    const first = midpoint(points[points.length - 1], points[0]);
    ctx.moveTo(first.x, first.y);
    points.forEach((point, index) => {
      const next = points[(index + 1) % points.length];
      const mid = midpoint(point, next);
      ctx.quadraticCurveTo(point.x, point.y, mid.x, mid.y);
    });
    ctx.closePath();
  } else {
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  if (dash) ctx.setLineDash(dash);
  ctx.stroke();
  if (dash) ctx.setLineDash([]);
};

const drawRotatedRect = (ctx, x, y, w, h, yaw, fill, stroke = null, radius = 7) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(yaw);
  ctx.fillStyle = fill;
  fillRoundRect(ctx, -w / 2, -h / 2, w, h, radius);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
};

const drawSpark = (ctx, x, y, radius, color, time) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.lineTo(radius * 0.3, -radius * 0.3);
  ctx.lineTo(radius, 0);
  ctx.lineTo(radius * 0.3, radius * 0.3);
  ctx.lineTo(0, radius);
  ctx.lineTo(-radius * 0.3, radius * 0.3);
  ctx.lineTo(-radius, 0);
  ctx.lineTo(-radius * 0.3, -radius * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawCar = (ctx, car, isPlayer, raceTime) => {
  const wobble = car.spinTimer > 0 ? Math.sin(car.spinTimer * 34) * 0.22 : 0;
  const yaw = car.heading + wobble;
  const lift = car.jumpHeight || 0;
  const jumpScale = 1 + lift * 0.0025;

  ctx.save();
  ctx.translate(car.position.x, car.position.y);
  ctx.globalAlpha = car.finished ? 0.68 : 1;
  ctx.fillStyle = `rgba(0, 0, 0, ${car.jumpHeight > 0 ? 0.16 : 0.34})`;
  ctx.beginPath();
  ctx.ellipse(0, 18, Math.max(12, 24 - lift * 0.04), Math.max(5, 9 - lift * 0.018), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, -lift * 0.54);
  ctx.scale(jumpScale, jumpScale);
  ctx.rotate(yaw);

  if (car.draftTimer > 0 || car.boostTimer > 0) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = car.boostTimer > 0 ? car.accent : 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(-16, 24);
    ctx.lineTo(0, 58 + Math.sin(raceTime * 22) * 5);
    ctx.lineTo(16, 24);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = car.finished ? 0.68 : 1;
  }

  ctx.fillStyle = '#10151d';
  [-15, 15].forEach((x) => {
    fillRoundRect(ctx, x - 5, -20, 10, 16, 4);
    fillRoundRect(ctx, x - 5, 8, 10, 17, 4);
  });

  const body = ctx.createLinearGradient(-18, -28, 18, 26);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(0.08, car.color);
  body.addColorStop(1, '#111827');
  ctx.fillStyle = body;
  ctx.strokeStyle = '#050813';
  ctx.lineWidth = 3;
  fillRoundRect(ctx, -17, -28, 34, 56, 9);
  ctx.stroke();

  ctx.fillStyle = car.accent;
  fillRoundRect(ctx, -11, -19, 22, 9, 4);
  ctx.fillStyle = 'rgba(247, 251, 255, 0.94)';
  fillRoundRect(ctx, -10, -31, 20, 7, 4);
  ctx.fillStyle = 'rgba(5, 8, 19, 0.72)';
  fillRoundRect(ctx, -10, 5, 20, 10, 5);

  if (car.driftActive) {
    const sparkColor = car.driftCharge > 1.7 ? '#ffd34f' : car.driftCharge > 0.82 ? '#00d4ff' : '#f7fbff';
    drawSpark(ctx, -27, 10, 6, sparkColor, raceTime * 8);
    drawSpark(ctx, 27, 10, 6, sparkColor, -raceTime * 8);
  }

  if (car.jumpHeight > 0) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 29 + Math.sin(raceTime * 18) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  if (car.shieldTimer > 0 || car.gripTimer > 0 || car.phaseTimer > 0) {
    ctx.save();
    ctx.strokeStyle =
      car.phaseTimer > 0
        ? 'rgba(155, 255, 122, 0.76)'
        : car.gripTimer > 0
        ? 'rgba(124, 247, 255, 0.72)'
        : 'rgba(243, 236, 224, 0.72)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(car.position.x, car.position.y - lift * 0.54, 29 + Math.sin(raceTime * 12) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (!isPlayer) {
    ctx.save();
    ctx.font = '700 10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.76)';
    ctx.fillText(car.name, car.position.x, car.position.y - 34);
    ctx.restore();
  }
};

const createCar = ({ ai = null, compiled, color, accent, lane = 0, name, player = false, progressOffset = 0 }) => {
  const start = compiled.pointAt(compiled.startProgress + progressOffset);
  const right = { x: -start.tangent.y, y: start.tangent.x };
  return {
    accent,
    ai,
    bestLap: null,
    boostTimer: 0,
    color,
    draftReady: false,
    draftTimer: 0,
    driftActive: false,
    driftCharge: 0,
    finished: false,
    finishTime: null,
    gripTimer: 0,
    hitCooldown: 0,
    heading: Math.atan2(start.tangent.y, start.tangent.x),
    heldItem: null,
    itemUseAt: 0,
    jumpCooldown: 0,
    jumpHeight: 0,
    jumpVelocity: 0,
    landingTimer: 0,
    lap: 1,
    lapStartTime: 0,
    name,
    phaseTimer: 0,
    player,
    position: {
      x: start.point.x + right.x * lane * 18,
      y: start.point.y + right.y * lane * 18,
    },
    progress: start.progress,
    rank: 1,
    shieldTimer: 0,
    shortcutPenalty: 0,
    signatureUsed: false,
    spinTimer: 0,
    speed: 0,
    steerInput: 0,
  };
};

const createRace = (compiled, profile) => {
  const player = createCar({
    accent: profile.avatar.accent,
    color: profile.avatar.chassis,
    compiled,
    lane: -1.25,
    name: profile.avatar.name,
    player: true,
  });
  const rivals = compiled.aiRivals.map((plan, index) =>
    createCar({
      accent: plan.accent,
      ai: plan,
      color: plan.color,
      compiled,
      lane: plan.lane,
      name: plan.name,
      progressOffset: -0.01 * (index + 1),
    })
  );
  return {
    boxCooldowns: compiled.itemBoxes.map(() => 0),
    camera: { x: player.position.x, y: player.position.y, zoom: CAMERA_ZOOM.mobile },
    hazards: [],
    padCooldowns: compiled.boostPads.map(() => 0),
    phaseOverride: 0,
    player,
    rivals,
    startedAt: 0,
    time: 0,
    trackPulse: 0,
  };
};

/**
 * @deprecated Fallback-only Canvas2D renderer for browsers without WebGL.
 * ArcadeRace3D is the primary race mode; do not add kart-racer V1 mechanics here.
 */
const RaceCanvasFallback = ({ command, inventory, onFinish, onInventoryUse, profile, runId, track }) => {
  const canvasRef = useRef(null);
  const commandRef = useRef(null);
  const inventoryRef = useRef(inventory);
  const onFinishRef = useRef(onFinish);
  const onInventoryUseRef = useRef(onInventoryUse);
  const touchRef = useRef({ brake: 0, drift: false, jump: false, steer: 0, throttle: 0 });
  const [telemetry, setTelemetry] = useState({
    boost: 0,
    draft: 0,
    drift: 0,
    grip: 0,
    heldItem: null,
    jump: 0,
    lap: 1,
    phase: 0,
    place: 1,
    running: false,
    shield: 0,
    speed: 0,
    time: 0,
  });

  useEffect(() => {
    commandRef.current = command;
  }, [command]);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    onInventoryUseRef.current = onInventoryUse;
  }, [onInventoryUse]);

  useEffect(() => {
    if (!runId) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const compiled = compileTrack(track);
    const race = createRace(compiled, profile);
    const keys = new Set();
    const mechanics = profile.race.mechanics;
    let raf = 0;
    let lastFrame = performance.now();
    let finished = false;
    let jumpQueued = false;
    let lastTelemetry = 0;
    let handledCommand = 0;

    const relevantKeys = new Set([
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'KeyA',
      'KeyD',
      'KeyE',
      'KeyF',
      'KeyQ',
      'KeyR',
      'KeyS',
      'KeyW',
      'ShiftLeft',
      'ShiftRight',
      'Space',
    ]);

    const keyDown = (event) => {
      if (!relevantKeys.has(event.code)) return;
      event.preventDefault();
      if (event.code === 'Space' && !keys.has('Space')) jumpQueued = true;
      keys.add(event.code);
    };
    const keyUp = (event) => {
      if (!relevantKeys.has(event.code)) return;
      event.preventDefault();
      keys.delete(event.code);
    };

    window.addEventListener('keydown', keyDown, { passive: false });
    window.addEventListener('keyup', keyUp, { passive: false });

    const fitCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const viewW = rect.width || 1;
      const viewH = rect.height || 1;
      const scale = Math.min(viewW / WORLD.w, viewH / WORLD.h);
      return {
        dpr,
        offsetX: (viewW - WORLD.w * scale) / 2,
        offsetY: (viewH - WORLD.h * scale) / 2,
        scale,
        viewH,
        viewW,
      };
    };

    const cyclePhase = (cycle = 5, phase = 0) => wrap01(race.time / cycle + phase);
    const inWindow = (cycle, start, end, phase = 0) => {
      const value = cyclePhase(cycle, phase);
      return start <= end ? value >= start && value <= end : value >= start || value <= end;
    };
    const hazardIsOpen = (hazard) =>
      inWindow(hazard.cycle || 5, hazard.openStart ?? 0.2, hazard.openEnd ?? 0.75, hazard.phase || 0);
    const shortcutOpen = (shortcut, car) => {
      if (car.phaseTimer > 0 || race.phaseOverride > 0) return true;
      if (shortcut.condition === 'waterLow') {
        const lapNarrowing = car.lap >= 3 ? 0.34 : 0.48;
        return inWindow(6.4, 0.06, lapNarrowing);
      }
      if (shortcut.condition === 'giantStill') {
        return race.trackPulse <= 0 && !inWindow(6.4, 0.52, 0.72);
      }
      if (shortcut.condition === 'phaseGreen') {
        return inWindow(5.8, 0.16, 0.54);
      }
      return true;
    };

    const hazardPoint = (hazard) => {
      const sample = compiled.pointAt(hazard.progress);
      const normal = { x: -sample.tangent.y, y: sample.tangent.x };
      const side =
        hazard.type === 'swing'
          ? (hazard.side || 0) + Math.sin((race.time / (hazard.cycle || 4) + (hazard.phase || 0)) * Math.PI * 2) * (hazard.travel || 44)
          : hazard.side || 0;
      return {
        ...sample,
        normal,
        point: {
          x: sample.point.x + normal.x * side,
          y: sample.point.y + normal.y * side,
        },
      };
    };

    const addBoost = (car, seconds, multiplier = 1) => {
      car.boostTimer = Math.max(car.boostTimer, seconds * multiplier);
      car.speed = Math.max(car.speed, mechanics.boostSpeed * (0.68 + 0.08 * multiplier));
    };

    const hitCar = (car, severity = 1, source = null) => {
      if (car.jumpHeight > 10 && ['oil', 'wet', 'swing', 'slam', 'tremor'].includes(source)) return;
      if (car.hitCooldown > 0 && source !== 'rocket') return;
      if (car.shieldTimer > 0) {
        car.shieldTimer = Math.max(0, car.shieldTimer - 1.3 * severity);
        car.speed *= 0.92;
        car.hitCooldown = 0.28;
        return;
      }
      if (car.gripTimer > 0 && source === 'wet') {
        car.speed *= 0.96;
        return;
      }
      if (car.phaseTimer > 0 && (source === 'laser' || source === 'gravity')) {
        car.speed *= 0.94;
        return;
      }
      if (source === 'wet') {
        car.speed *= 0.9;
        car.heading += Math.sin(race.time * 10) * 0.025;
        car.hitCooldown = 0.24;
        return;
      }
      car.spinTimer = Math.max(car.spinTimer, 0.72 + severity * 0.42);
      car.speed *= clamp(0.72 - severity * 0.13, 0.36, 0.72);
      car.hitCooldown = 0.42 + severity * 0.18;
    };

    const opponentsFor = (car) => {
      if (car.player) return race.rivals.filter((rival) => !rival.finished);
      return [race.player, ...race.rivals.filter((rival) => rival !== car && !rival.finished)];
    };

    const useItem = (car, item) => {
      if (!item) return false;
      if (item === 'boost') {
        addBoost(car, 1.45, mechanics.driftBoost);
        return true;
      }
      if (item === 'shield') {
        car.shieldTimer = Math.max(car.shieldTimer, 4.3);
        return true;
      }
      if (item === 'rocket') {
        const targets = opponentsFor(car)
          .map((opponent) => ({
            opponent,
            gap: Math.abs(scoreCar(opponent) - scoreCar(car)),
          }))
          .sort((a, b) => a.gap - b.gap);
        const target = targets[0]?.opponent;
        if (target) {
          hitCar(target, 1.25, 'rocket');
          addBoost(car, 0.55, 1);
        }
        return true;
      }
      if (item === 'oil') {
        race.hazards.push({
          life: 9,
          owner: car,
          position: { ...car.position },
          type: 'oil',
        });
        return true;
      }
      if (item === 'boardwalkGrip') {
        car.gripTimer = Math.max(car.gripTimer, 5.6);
        addBoost(car, 0.65, 0.82);
        return true;
      }
      if (item === 'warhorn') {
        race.trackPulse = Math.max(race.trackPulse, 2.4);
        opponentsFor(car).forEach((opponent) => {
          if (distance(car.position, opponent.position) < 230 || scoreCar(opponent) > scoreCar(car)) {
            hitCar(opponent, 1.05, 'tremor');
          }
        });
        addBoost(car, 1.0, 1.15);
        return true;
      }
      if (item === 'phaseKey') {
        race.phaseOverride = Math.max(race.phaseOverride, 4.8);
        car.phaseTimer = Math.max(car.phaseTimer, 4.8);
        addBoost(car, 0.82, 1);
        return true;
      }
      return false;
    };

    const chooseBoxItem = (car) => {
      const pool = [...COMMON_BOX_ITEMS, compiled.signatureItem.key];
      if (compiled.raceStyle === 'technical') pool.push('shield', 'boardwalkGrip');
      if (compiled.raceStyle === 'chaotic') pool.push('rocket', 'rocket', 'oil', 'warhorn');
      if (compiled.raceStyle === 'puzzle') pool.push('shield', 'phaseKey', 'phaseKey');
      if (car.rank >= 3) pool.push('boost', 'rocket');
      return pool[Math.floor(Math.random() * pool.length)];
    };

    const useBankedItem = (item) => {
      if (!BANKED_ITEMS.includes(item)) return;
      if ((inventoryRef.current?.[item] || 0) <= 0) return;
      if (useItem(race.player, item)) onInventoryUseRef.current?.(item);
    };

    const updateProgress = (car) => {
      const previous = car.progress;
      const nearest = compiled.nearest(car.position);
      car.progress = nearest.progress;
      if (!car.finished && previous > 0.82 && car.progress < 0.18) {
        const lapTime = race.time - car.lapStartTime;
        if (car.lap > 0) car.bestLap = car.bestLap ? Math.min(car.bestLap, lapTime) : lapTime;
        car.lap += 1;
        car.lapStartTime = race.time;
        if (car.lap > compiled.laps) {
          car.finished = true;
          car.finishTime = race.time;
          car.speed *= 0.55;
        }
      } else if (previous < 0.18 && car.progress > 0.82) {
        car.progress = previous;
        car.speed *= 0.72;
      }
      return nearest;
    };

    const shortcutSurface = (position) => {
      let best = null;
      compiled.shortcuts.forEach((shortcut) => {
        const nearest = shortcut.nearest(position);
        if (!best || nearest.distance < best.nearest.distance) best = { nearest, shortcut };
      });
      return best;
    };

    const applyTrackSurface = (car, nearest, dt) => {
      if (car.jumpHeight > 8) return;
      const shortcut = shortcutSurface(car.position);
      const onShortcut = shortcut && shortcut.nearest.distance < shortcut.shortcut.width / 2;
      const openShortcut = onShortcut && shortcutOpen(shortcut.shortcut, car);
      if (onShortcut && !openShortcut && car.shortcutPenalty <= 0) {
        car.shortcutPenalty = 0.9;
        hitCar(car, 0.8, shortcut.shortcut.condition === 'phaseGreen' ? 'laser' : 'wet');
      }

      const rough = nearest.distance > compiled.width / 2 && !openShortcut;
      const wallLimit = compiled.width / 2 + (openShortcut ? 92 : 44);
      const gripProtected = car.shieldTimer > 0 || car.gripTimer > 0;
      if (rough && !gripProtected) {
        const targetSpeed = mechanics.topSpeed * mechanics.offroadGrip;
        if (car.speed > targetSpeed) car.speed -= (car.speed - targetSpeed) * clamp(dt * 5.4, 0, 1);
      }
      if (!openShortcut && nearest.distance > wallLimit) {
        car.position.x = nearest.point.x + nearest.normal.x * wallLimit;
        car.position.y = nearest.point.y + nearest.normal.y * wallLimit;
        car.speed *= car.shieldTimer > 0 ? 0.82 : 0.48;
      }
    };

    const updateTimers = (car, dt) => {
      const wasAirborne = car.jumpHeight > 0;
      if (car.jumpHeight > 0 || car.jumpVelocity > 0) {
        car.jumpHeight = Math.max(0, car.jumpHeight + car.jumpVelocity * dt);
        car.jumpVelocity -= 720 * dt;
        if (car.jumpHeight <= 0 && wasAirborne) {
          car.jumpHeight = 0;
          car.jumpVelocity = 0;
          car.landingTimer = 0.22;
          if (car.driftActive && Math.abs(car.steerInput || 0) > 0.28) addBoost(car, 0.32, 0.72);
        }
      }
      car.boostTimer = Math.max(0, car.boostTimer - dt);
      car.shieldTimer = Math.max(0, car.shieldTimer - dt);
      car.gripTimer = Math.max(0, car.gripTimer - dt);
      car.hitCooldown = Math.max(0, car.hitCooldown - dt);
      car.jumpCooldown = Math.max(0, car.jumpCooldown - dt);
      car.landingTimer = Math.max(0, car.landingTimer - dt);
      car.phaseTimer = Math.max(0, car.phaseTimer - dt);
      car.shortcutPenalty = Math.max(0, car.shortcutPenalty - dt);
      car.draftTimer = Math.max(0, car.draftTimer - dt * 0.72);
    };

    const updatePlayer = (dt) => {
      const player = race.player;
      const touch = touchRef.current;
      const rawSteer =
        (keys.has('ArrowLeft') ? -1 : 0) +
        (keys.has('ArrowRight') ? 1 : 0) +
        (keys.has('KeyA') ? -1 : 0) +
        (keys.has('KeyD') ? 1 : 0) +
        touch.steer;
      player.steerInput += (clamp(rawSteer, -1, 1) - player.steerInput) * clamp(dt * 12, 0, 1);
      const throttle = keys.has('ArrowUp') || keys.has('KeyW') || touch.throttle > 0;
      const brake = keys.has('ArrowDown') || keys.has('KeyS') || touch.brake > 0;
      const driftPressed = keys.has('ShiftLeft') || keys.has('ShiftRight') || touch.drift;
      const jumpPressed = jumpQueued || touch.jump;
      const nearest = updateProgress(player);
      const rough = nearest.distance > compiled.width / 2;
      const gripBonus = player.gripTimer > 0 ? 1.16 : 1;
      const arcadeTopSpeed = mechanics.topSpeed * 0.86;
      const boostTop = player.boostTimer > 0 ? mechanics.boostSpeed * 0.9 : arcadeTopSpeed;
      const maxSpeed = boostTop * (rough && player.shieldTimer <= 0 && player.gripTimer <= 0 ? mechanics.offroadGrip : 1);

      if (jumpPressed && player.jumpCooldown <= 0 && player.jumpHeight <= 0 && player.speed > 34) {
        player.jumpVelocity = 245 + clamp(player.speed, 0, arcadeTopSpeed) * 0.18;
        player.jumpCooldown = 0.46;
        player.speed = Math.max(player.speed, 88);
      }
      jumpQueued = false;
      touch.jump = false;

      if (player.spinTimer > 0) {
        player.spinTimer = Math.max(0, player.spinTimer - dt);
        player.speed *= 1 - clamp(dt * 1.8, 0, 0.9);
      } else {
        if (throttle) player.speed += mechanics.acceleration * dt * (player.speed < 80 ? 1.24 : 1) * (player.gripTimer > 0 ? 1.04 : 1);
        if (brake) player.speed -= mechanics.braking * dt;
        if (!throttle && !brake) player.speed -= player.speed * clamp(dt * 1.05, 0, 1);
      }

      player.speed = clamp(player.speed, -arcadeTopSpeed * 0.34, maxSpeed);
      const speedRatio = clamp(Math.abs(player.speed) / arcadeTopSpeed, 0.2, 1.08);
      const driftAllowed = driftPressed && Math.abs(player.steerInput) > 0.15 && player.speed > 76;

      if (driftAllowed) {
        player.driftActive = true;
        player.driftCharge = clamp(player.driftCharge + dt * mechanics.driftBoost * gripBonus * (player.jumpHeight > 0 ? 0.72 : 1), 0, 2.65);
      } else if (player.driftActive) {
        if (player.driftCharge > 1.65) addBoost(player, 1.25, mechanics.driftBoost);
        else if (player.driftCharge > 0.78) addBoost(player, 0.78, mechanics.driftBoost * 0.84);
        player.driftActive = false;
        player.driftCharge = 0;
      }

      const highSpeedGrip = clamp(1.2 - speedRatio * 0.3, 0.74, 1.12);
      const airGrip = player.jumpHeight > 0 ? 0.48 : 1;
      const steerPower = mechanics.handling * 0.7 * highSpeedGrip * gripBonus * airGrip * (player.driftActive ? 1.18 : 1);
      player.heading += player.steerInput * steerPower * dt * (player.speed >= 0 ? 1 : -1);
      const roadEdge = clamp((nearest.distance - compiled.width * 0.28) / (compiled.width * 0.58), 0, 1);
      const trackHeading = Math.atan2(nearest.tangent.y, nearest.tangent.x);
      const assist = roadEdge * (player.driftActive ? 0.18 : 0.55) + (Math.abs(player.steerInput) < 0.1 ? 0.12 : 0);
      player.heading += angleDelta(trackHeading, player.heading) * clamp(dt * assist, 0, 0.035);
      const slip = player.driftActive ? player.steerInput * player.speed * 0.13 * dt * (player.jumpHeight > 0 ? 0.25 : 1) : 0;
      player.position.x += Math.cos(player.heading) * player.speed * dt + -Math.sin(player.heading) * slip;
      player.position.y += Math.sin(player.heading) * player.speed * dt + Math.cos(player.heading) * slip;
      if (roadEdge > 0 && player.speed > 42 && player.gripTimer <= 0 && player.jumpHeight <= 0) {
        const nudge = roadEdge * clamp(dt * 42, 0, 2.4);
        player.position.x -= nearest.normal.x * nudge;
        player.position.y -= nearest.normal.y * nudge;
      }
      updateTimers(player, dt);
      applyTrackSurface(player, nearest, dt);

      if (player.heldItem && keys.has('KeyF')) {
        if (useItem(player, player.heldItem)) player.heldItem = null;
        keys.delete('KeyF');
      }
      if (keys.has('KeyQ')) {
        useBankedItem('boost');
        keys.delete('KeyQ');
      }
      if (keys.has('KeyE')) {
        useBankedItem('shield');
        keys.delete('KeyE');
      }
      if (keys.has('KeyR')) {
        useBankedItem('rocket');
        keys.delete('KeyR');
      }
    };

    const upcomingClosedGate = (rival) =>
      compiled.hazards.some((hazard) => {
        if (!['laser', 'gate', 'slam'].includes(hazard.type)) return false;
        const ahead = wrap01(hazard.progress - rival.progress);
        return ahead > 0 && ahead < 0.055 && !hazardIsOpen(hazard) && rival.phaseTimer <= 0;
      });

    const maybeUseRivalSignature = (rival) => {
      if (rival.signatureUsed || !rival.ai?.signature) return;
      if (rival.ai.signature === 'lap3-grip' && rival.lap >= 3 && rival.progress > 0.42 && rival.progress < 0.56) {
        useItem(rival, 'boardwalkGrip');
        rival.signatureUsed = true;
      }
      if (rival.ai.signature === 'wake-horn' && rival.progress > 0.32 && rival.progress < 0.44) {
        useItem(rival, 'warhorn');
        rival.signatureUsed = true;
      }
      if (rival.ai.signature === 'phase-airlock' && rival.progress > 0.18 && rival.progress < 0.3) {
        useItem(rival, 'phaseKey');
        rival.signatureUsed = true;
      }
    };

    const updateRival = (rival, index, dt) => {
      if (rival.finished) {
        rival.speed *= 1 - clamp(dt * 1.2, 0, 1);
        return;
      }
      const nearest = updateProgress(rival);
      maybeUseRivalSignature(rival);

      const plan = rival.ai || {};
      const gateCaution = upcomingClosedGate(rival);
      const lookahead = 0.038 + (plan.risk || 0.4) * 0.018 - (gateCaution ? 0.018 : 0);
      const target = compiled.pointAt(rival.progress + lookahead + index * 0.004);
      const normal = { x: -target.tangent.y, y: target.tangent.x };
      const lineOffset = plan.lineOffset || 0;
      const targetPoint = {
        x: target.point.x + normal.x * lineOffset,
        y: target.point.y + normal.y * lineOffset,
      };
      const desired = Math.atan2(targetPoint.y - rival.position.y, targetPoint.x - rival.position.x);
      const delta = angleDelta(desired, rival.heading);
      const aiSkill = 0.86 + index * 0.03 + profile.level * 0.004 + (plan.risk || 0.4) * 0.07;
      const rubberband = clamp((scoreCar(race.player) - scoreCar(rival)) * 0.12, -0.05, 0.07);

      if (rival.spinTimer > 0) {
        rival.spinTimer = Math.max(0, rival.spinTimer - dt);
        rival.speed *= 1 - clamp(dt * 2.2, 0, 0.9);
      } else {
        rival.heading += clamp(delta, -1, 1) * mechanics.handling * (0.76 + (plan.patience || 0.5) * 0.18) * dt;
        const caution = gateCaution ? 0.72 : 1;
        const aggression = compiled.raceStyle === 'chaotic' ? 1 + (plan.aggression || 0.4) * 0.08 : 1;
        const boostSpeed = rival.boostTimer > 0 ? mechanics.boostSpeed : mechanics.topSpeed;
        const targetSpeed = boostSpeed * (aiSkill + rubberband) * caution * aggression * (nearest.distance > compiled.width / 2 ? 0.74 : 1);
        rival.speed += (targetSpeed - rival.speed) * clamp(dt * (1.25 + (plan.risk || 0.4) * 0.55), 0, 1);
      }
      rival.position.x += Math.cos(rival.heading) * rival.speed * dt;
      rival.position.y += Math.sin(rival.heading) * rival.speed * dt;
      updateTimers(rival, dt);
      applyTrackSurface(rival, nearest, dt);

      if (rival.heldItem && race.time >= rival.itemUseAt) {
        const shouldUse =
          rival.heldItem === compiled.signatureItem.key ||
          rival.heldItem === 'boost' ||
          (rival.heldItem === 'shield' && upcomingClosedGate(rival)) ||
          (rival.heldItem === 'rocket' && Math.abs(scoreCar(race.player) - scoreCar(rival)) < 0.18) ||
          (rival.heldItem === 'oil' && scoreCar(rival) > scoreCar(race.player));
        if (shouldUse && useItem(rival, rival.heldItem)) rival.heldItem = null;
      }
    };

    const updatePickups = (dt) => {
      race.padCooldowns = race.padCooldowns.map((value) => Math.max(0, value - dt));
      race.boxCooldowns = race.boxCooldowns.map((value) => Math.max(0, value - dt));

      compiled.boostPads.forEach((progress, index) => {
        const pad = compiled.pointAt(progress);
        [race.player, ...race.rivals].forEach((car) => {
          if (race.padCooldowns[index] <= 0 && distance(car.position, pad.point) < 36) {
            addBoost(car, 1.08, car.player ? mechanics.driftBoost : 1);
            race.padCooldowns[index] = 1.05;
          }
        });
      });

      compiled.itemBoxes.forEach((progress, index) => {
        const box = compiled.pointAt(progress);
        if (race.boxCooldowns[index] > 0) return;
        const collector = [race.player, ...race.rivals].find(
          (car) => !car.heldItem && !car.finished && distance(car.position, box.point) < 31
        );
        if (collector) {
          collector.heldItem = chooseBoxItem(collector);
          collector.itemUseAt = race.time + (collector.player ? 0 : 1.1 + Math.random() * 1.6);
          race.boxCooldowns[index] = 5.2;
        }
      });
    };

    const updateDroppedHazards = (dt) => {
      race.hazards = race.hazards
        .map((hazard) => ({ ...hazard, life: hazard.life - dt }))
        .filter((hazard) => hazard.life > 0);
      race.hazards.forEach((hazard) => {
        [race.player, ...race.rivals].forEach((car) => {
          if (car === hazard.owner || car.finished) return;
          if (distance(car.position, hazard.position) < 25) {
            hitCar(car, 0.9, 'oil');
            hazard.life = 0;
          }
        });
      });
    };

    const updateTrackHazards = (dt) => {
      race.phaseOverride = Math.max(0, race.phaseOverride - dt);
      race.trackPulse = Math.max(0, race.trackPulse - dt);
      [race.player, ...race.rivals].forEach((car) => {
        if (car.finished) return;
        compiled.hazards.forEach((hazard) => {
          const sample = hazardPoint(hazard);
          const gap = distance(car.position, sample.point);
          if (hazard.type === 'wet') {
            const radius = hazard.radius + Math.max(0, car.lap - (hazard.activeLap || 1)) * (hazard.grow || 0);
            if (car.lap >= (hazard.activeLap || 1) && gap < radius && car.gripTimer <= 0 && car.shieldTimer <= 0) {
              car.speed *= 1 - clamp(dt * 1.65, 0, 0.18);
              if (gap < radius * 0.46) hitCar(car, 0.18, 'wet');
            }
          }
          if (hazard.type === 'swing' && gap < hazard.radius) hitCar(car, 0.82, 'swing');
          if ((hazard.type === 'gate' || hazard.type === 'laser') && !hazardIsOpen(hazard) && gap < hazard.radius) {
            hitCar(car, hazard.type === 'laser' ? 1.05 : 0.82, hazard.type);
          }
          if (hazard.type === 'slam' && hazardIsOpen(hazard) && gap < hazard.radius) hitCar(car, 1.12, 'slam');
          if (hazard.type === 'tremor' && (hazardIsOpen(hazard) || race.trackPulse > 0) && gap < hazard.radius) {
            hitCar(car, 0.78, 'tremor');
          }
          if (hazard.type === 'gust' && hazardIsOpen(hazard) && gap < hazard.radius && car.jumpHeight <= 8) {
            const force = (hazard.force || 70) * (car.shieldTimer > 0 ? 0.32 : 1);
            car.position.x += sample.normal.x * force * dt;
            car.position.y += sample.normal.y * force * dt;
            car.speed *= 1 - clamp(dt * 0.28, 0, 0.06);
          }
          if (hazard.type === 'conveyor' && gap < hazard.radius && car.phaseTimer <= 0 && car.jumpHeight <= 8) {
            const flip = car.lap % 2 === 0 ? -1 : 1;
            car.position.x += sample.normal.x * (hazard.force || 70) * flip * dt;
            car.position.y += sample.normal.y * (hazard.force || 70) * flip * dt;
            car.speed += 22 * dt;
          }
          if (hazard.type === 'gravity' && hazardIsOpen(hazard) && gap < hazard.radius && car.phaseTimer <= 0 && car.jumpHeight <= 8) {
            car.position.x += sample.normal.x * (hazard.force || 60) * dt;
            car.position.y += sample.normal.y * (hazard.force || 60) * dt;
          }
        });
      });
    };

    const updateDrafting = (dt) => {
      const player = race.player;
      const target = race.rivals.find((rival) => {
        if (rival.finished || scoreCar(rival) <= scoreCar(player)) return false;
        const gap = distance(player.position, rival.position);
        const facing = Math.cos(player.heading) * Math.cos(rival.heading) + Math.sin(player.heading) * Math.sin(rival.heading);
        return gap < 120 && facing > 0.68;
      });
      if (!target || player.spinTimer > 0) {
        player.draftReady = false;
        return;
      }
      player.draftTimer = clamp(player.draftTimer + dt, 0, 1.45);
      if (player.draftTimer >= 1.35 && !player.draftReady) {
        player.draftReady = true;
        addBoost(player, 0.7, 0.95);
      }
    };

    const updateCollisions = () => {
      race.rivals.forEach((rival) => {
        const gap = distance(race.player.position, rival.position);
        if (gap >= 33 || gap <= 0) return;
        const nx = (race.player.position.x - rival.position.x) / gap;
        const ny = (race.player.position.y - rival.position.y) / gap;
        const push = (33 - gap) * 0.52;
        race.player.position.x += nx * push;
        race.player.position.y += ny * push;
        rival.position.x -= nx * push;
        rival.position.y -= ny * push;
        if (race.player.shieldTimer > 0) {
          hitCar(rival, 0.72, 'shield');
        } else {
          const chaosHit = compiled.raceStyle === 'chaotic' && (rival.ai?.aggression || 0) > 0.7;
          race.player.speed *= chaosHit ? 0.74 : 0.84;
          rival.speed *= 0.91;
          if (chaosHit && Math.abs(race.player.speed - rival.speed) > 80) hitCar(race.player, 0.34, 'bump');
        }
      });
    };

    const updateRankings = () => {
      const racers = [race.player, ...race.rivals].sort((a, b) => scoreCar(b) - scoreCar(a));
      racers.forEach((car, index) => {
        car.rank = index + 1;
      });
    };

    const updateCamera = (dt) => {
      const player = race.player;
      const lookahead = clamp(player.speed, -80, 360) * 0.26;
      const targetX = player.position.x + Math.cos(player.heading) * lookahead;
      const targetY = player.position.y + Math.sin(player.heading) * lookahead;
      race.camera.x += (targetX - race.camera.x) * clamp(dt * 5.8, 0, 1);
      race.camera.y += (targetY - race.camera.y) * clamp(dt * 5.8, 0, 1);
      const targetZoom = canvas.clientWidth < 720 ? CAMERA_ZOOM.mobile : CAMERA_ZOOM.desktop;
      race.camera.zoom += (targetZoom - race.camera.zoom) * clamp(dt * 4, 0, 1);
    };

    const drawBackground = (ctx) => {
      const bg = ctx.createLinearGradient(0, 0, 0, WORLD.h);
      bg.addColorStop(0, compiled.sky);
      bg.addColorStop(1, '#05060c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);

      if (compiled.key === 'orbital-relay') {
        ctx.fillStyle = 'rgba(247, 251, 255, 0.72)';
        for (let i = 0; i < 70; i += 1) {
          const x = (i * 137) % WORLD.w;
          const y = (i * 89) % WORLD.h;
          const r = 1 + (i % 3) * 0.7;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = compiled.grass;
        ctx.fillRect(34, 34, WORLD.w - 68, WORLD.h - 68);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
        for (let x = 60; x < WORLD.w; x += 42) {
          ctx.fillRect(x, 34, 1, WORLD.h - 68);
        }
        for (let y = 58; y < WORLD.h; y += 42) {
          ctx.fillRect(34, y, WORLD.w - 68, 1);
        }
      }
    };

    const drawScenery = (ctx) => {
      drawBackground(ctx);
      compiled.scenery.forEach((item) => {
        ctx.save();
        if (item.kind === 'ferris') {
          ctx.strokeStyle = `${item.color}99`;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
          ctx.stroke();
          for (let i = 0; i < 10; i += 1) {
            const a = (Math.PI * 2 * i) / 10 + race.time * 0.12;
            ctx.beginPath();
            ctx.moveTo(item.x, item.y);
            ctx.lineTo(item.x + Math.cos(a) * item.r, item.y + Math.sin(a) * item.r);
            ctx.stroke();
            ctx.fillStyle = i % 2 ? '#ffd166' : '#f65f7a';
            fillRoundRect(ctx, item.x + Math.cos(a) * item.r - 7, item.y + Math.sin(a) * item.r - 5, 14, 10, 4);
          }
        } else if (item.kind === 'giant') {
          ctx.fillStyle = item.color;
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.ellipse(item.x, item.y, item.w / 2, item.h / 2, -0.08, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(255, 176, 0, 0.12)';
          ctx.beginPath();
          ctx.ellipse(item.x + 170, item.y - 80, 110, 52, 0.25, 0, Math.PI * 2);
          ctx.fill();
        } else if (item.kind === 'station') {
          ctx.strokeStyle = 'rgba(155, 255, 122, 0.38)';
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.ellipse(item.x, item.y, item.w / 2, item.h / 2, 0.12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(247, 251, 255, 0.18)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(item.x, item.y, item.w / 2 + 44, item.h / 2 + 22, -0.08, 0, Math.PI * 2);
          ctx.stroke();
        } else if (item.kind === 'planet') {
          const planet = ctx.createRadialGradient(item.x - 28, item.y - 32, 10, item.x, item.y, item.r);
          planet.addColorStop(0, '#dff4ff');
          planet.addColorStop(0.45, item.color);
          planet.addColorStop(1, '#162a5f');
          ctx.fillStyle = planet;
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (item.kind === 'water') {
          ctx.fillStyle = `${item.color}88`;
          fillRoundRect(ctx, item.x, item.y, item.w, item.h, 18);
          ctx.strokeStyle = 'rgba(124, 247, 255, 0.4)';
          ctx.lineWidth = 2;
          for (let y = item.y + 16; y < item.y + item.h; y += 22) {
            ctx.beginPath();
            ctx.moveTo(item.x + 10, y + Math.sin(race.time * 2 + y) * 4);
            ctx.quadraticCurveTo(item.x + item.w / 2, y - 10, item.x + item.w - 10, y + 4);
            ctx.stroke();
          }
        } else if (item.kind === 'strap') {
          ctx.translate(item.x, item.y);
          ctx.rotate(item.x > 500 ? -0.2 : 0.34);
          ctx.fillStyle = item.color;
          fillRoundRect(ctx, -item.w / 2, -item.h / 2, item.w, item.h, 12);
        } else if (item.kind === 'solar') {
          ctx.fillStyle = 'rgba(155, 255, 122, 0.18)';
          ctx.strokeStyle = 'rgba(155, 255, 122, 0.55)';
          ctx.lineWidth = 2;
          fillRoundRect(ctx, item.x, item.y, item.w, item.h, 6);
          ctx.stroke();
          for (let x = item.x + 18; x < item.x + item.w; x += 28) ctx.fillRect(x, item.y + 6, 2, item.h - 12);
        } else {
          ctx.fillStyle = item.color;
          fillRoundRect(ctx, item.x, item.y, item.w, item.h, 8);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
          fillRoundRect(ctx, item.x + 10, item.y + 10, item.w - 20, 8, 4);
        }
        ctx.restore();
      });
    };

    const drawShortcuts = (ctx) => {
      compiled.shortcuts.forEach((shortcut) => {
        const open = shortcutOpen(shortcut, race.player);
        drawTrackPath(ctx, shortcut.points, shortcut.width + 28, open ? `${shortcut.accent}34` : 'rgba(255,255,255,0.08)', [18, 16], false);
        drawTrackPath(ctx, shortcut.points, shortcut.width, open ? 'rgba(16, 21, 29, 0.82)' : 'rgba(30, 24, 30, 0.72)', null, false);
        drawTrackPath(ctx, shortcut.points, 4, open ? shortcut.accent : 'rgba(255, 255, 255, 0.18)', [10, 12], false);
      });
    };

    const drawTrack = (ctx) => {
      drawShortcuts(ctx);
      drawTrackPath(ctx, compiled.points, compiled.width + 94, 'rgba(0,0,0,0.34)');
      drawTrackPath(ctx, compiled.points, compiled.width + 76, `${compiled.hazard}dd`);
      drawTrackPath(ctx, compiled.points, compiled.width + 52, compiled.curbB);
      drawTrackPath(ctx, compiled.points, compiled.width + 38, compiled.curbA);
      drawTrackPath(ctx, compiled.points, compiled.width + 20, '#0b0f17');
      drawTrackPath(ctx, compiled.points, compiled.width, compiled.asphalt);
      drawTrackPath(ctx, compiled.points, 4, 'rgba(255, 255, 255, 0.34)', [22, 24]);

      compiled.boostPads.forEach((progress) => {
        const pad = compiled.pointAt(progress);
        const yaw = Math.atan2(pad.tangent.y, pad.tangent.x);
        drawRotatedRect(ctx, pad.point.x, pad.point.y, 58, 30, yaw, `${compiled.accent}cc`, 'rgba(247,251,255,0.76)', 9);
        ctx.save();
        ctx.translate(pad.point.x, pad.point.y);
        ctx.rotate(yaw);
        ctx.fillStyle = 'rgba(5, 8, 19, 0.58)';
        ctx.beginPath();
        ctx.moveTo(13, 0);
        ctx.lineTo(-7, -10);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-7, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      const start = compiled.pointAt(compiled.startProgress);
      const yaw = Math.atan2(start.tangent.y, start.tangent.x);
      ctx.save();
      ctx.translate(start.point.x, start.point.y);
      ctx.rotate(yaw + Math.PI / 2);
      for (let row = -3; row <= 2; row += 1) {
        for (let col = -5; col <= 4; col += 1) {
          ctx.fillStyle = (row + col) % 2 === 0 ? '#f7fbff' : '#10151d';
          ctx.fillRect(col * 10, row * 10, 10, 10);
        }
      }
      ctx.restore();
    };

    const drawTrackHazards = (ctx) => {
      compiled.hazards.forEach((hazard) => {
        const sample = hazardPoint(hazard);
        const active = hazard.type === 'wet' || hazard.type === 'swing' || hazardIsOpen(hazard) || race.trackPulse > 0;
        ctx.save();
        if (hazard.type === 'wet') {
          ctx.fillStyle = 'rgba(0, 212, 255, 0.26)';
          ctx.beginPath();
          ctx.ellipse(sample.point.x, sample.point.y, hazard.radius + race.player.lap * 4, hazard.radius * 0.48, race.time * 0.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (hazard.type === 'swing') {
          ctx.strokeStyle = 'rgba(247, 251, 255, 0.4)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sample.point.x, sample.point.y - 72);
          ctx.lineTo(sample.point.x, sample.point.y);
          ctx.stroke();
          ctx.fillStyle = '#f65f7a';
          fillRoundRect(ctx, sample.point.x - 24, sample.point.y - 12, 48, 24, 8);
        } else if (hazard.type === 'gate' || hazard.type === 'laser') {
          const yaw = Math.atan2(sample.tangent.y, sample.tangent.x) + Math.PI / 2;
          drawRotatedRect(
            ctx,
            sample.point.x,
            sample.point.y,
            compiled.width * 0.86,
            hazard.type === 'laser' ? 10 : 16,
            yaw,
            active ? 'rgba(155, 255, 122, 0.22)' : 'rgba(246, 95, 122, 0.76)',
            active ? 'rgba(155, 255, 122, 0.6)' : 'rgba(255, 255, 255, 0.52)',
            7
          );
        } else if (hazard.type === 'slam' || hazard.type === 'tremor') {
          ctx.strokeStyle = active ? 'rgba(255, 176, 0, 0.58)' : 'rgba(255, 176, 0, 0.12)';
          ctx.lineWidth = 4;
          const pulse = (race.time * 44) % Math.max(30, hazard.radius);
          ctx.beginPath();
          ctx.arc(sample.point.x, sample.point.y, 24 + pulse, 0, Math.PI * 2);
          ctx.stroke();
        } else if (hazard.type === 'gust') {
          ctx.strokeStyle = active ? 'rgba(255, 240, 199, 0.48)' : 'rgba(255, 240, 199, 0.14)';
          ctx.lineWidth = 6;
          for (let i = -1; i <= 1; i += 1) {
            ctx.beginPath();
            ctx.moveTo(sample.point.x - sample.normal.x * 45 + i * sample.tangent.x * 22, sample.point.y - sample.normal.y * 45 + i * sample.tangent.y * 22);
            ctx.quadraticCurveTo(sample.point.x, sample.point.y - 16, sample.point.x + sample.normal.x * 58, sample.point.y + sample.normal.y * 58);
            ctx.stroke();
          }
        } else if (hazard.type === 'conveyor' || hazard.type === 'gravity') {
          ctx.strokeStyle = hazard.type === 'gravity' ? 'rgba(155, 255, 122, 0.46)' : 'rgba(0, 212, 255, 0.44)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(sample.point.x, sample.point.y, hazard.radius * 0.54, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      });

      race.hazards.forEach((hazard) => {
        ctx.fillStyle = `rgba(12, 12, 16, ${clamp(hazard.life / 9, 0.16, 0.72)})`;
        ctx.beginPath();
        ctx.ellipse(hazard.position.x, hazard.position.y, 23, 14, race.time, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.stroke();
      });
    };

    const drawPickups = (ctx) => {
      compiled.itemBoxes.forEach((progress, index) => {
        const box = compiled.pointAt(progress);
        ctx.save();
        ctx.translate(box.point.x, box.point.y);
        ctx.rotate(Math.PI / 4 + race.time * 1.8);
        ctx.fillStyle = race.boxCooldowns[index] > 0 ? 'rgba(247, 251, 255, 0.24)' : '#f7fbff';
        ctx.strokeStyle = compiled.accent;
        ctx.lineWidth = 4;
        fillRoundRect(ctx, -14, -14, 28, 28, 6);
        ctx.stroke();
        ctx.fillStyle = compiled.accent;
        ctx.fillRect(-3, -10, 6, 20);
        ctx.fillRect(-10, -3, 20, 6);
        ctx.restore();
      });
    };

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const frame = fitCanvas();
      ctx.setTransform(frame.dpr, 0, 0, frame.dpr, 0, 0);
      ctx.clearRect(0, 0, frame.viewW, frame.viewH);
      ctx.save();
      const zoom = race.camera.zoom || CAMERA_ZOOM.mobile;
      const viewWorldW = frame.viewW / (frame.scale * zoom);
      const viewWorldH = frame.viewH / (frame.scale * zoom);
      const cameraX = clampCamera(race.camera.x, viewWorldW, WORLD.w);
      const cameraY = clampCamera(race.camera.y, viewWorldH, WORLD.h);
      ctx.translate(frame.viewW / 2, frame.viewH / 2);
      ctx.scale(frame.scale * zoom, frame.scale * zoom);
      ctx.translate(-cameraX, -cameraY);
      drawScenery(ctx);
      drawTrack(ctx);
      drawTrackHazards(ctx);
      drawPickups(ctx);
      race.rivals.forEach((rival) => drawCar(ctx, rival, false, race.time));
      drawCar(ctx, race.player, true, race.time);
      ctx.restore();
    };

    const tick = (now) => {
      const dt = clamp((now - lastFrame) / 1000, 0, 0.033);
      lastFrame = now;
      race.time += dt;

      const nextCommand = commandRef.current;
      if (nextCommand?.id && nextCommand.id !== handledCommand) {
        handledCommand = nextCommand.id;
        useBankedItem(nextCommand.type);
      }

      updatePlayer(dt);
      race.rivals.forEach((rival, index) => updateRival(rival, index, dt));
      updatePickups(dt);
      updateDroppedHazards(dt);
      updateTrackHazards(dt);
      updateDrafting(dt);
      updateCollisions();
      updateRankings();
      updateCamera(dt);
      draw();

      if (now - lastTelemetry > 90) {
        lastTelemetry = now;
        setTelemetry({
          boost: race.player.boostTimer,
          draft: race.player.draftTimer,
          drift: race.player.driftCharge,
          grip: race.player.gripTimer,
          heldItem: race.player.heldItem,
          jump: race.player.jumpHeight,
          lap: Math.min(race.player.lap, compiled.laps),
          phase: race.phaseOverride || race.player.phaseTimer,
          place: race.player.rank,
          running: !race.player.finished,
          shield: race.player.shieldTimer,
          speed: Math.max(0, Math.round(race.player.speed)),
          time: race.time,
        });
      }

      if (race.player.finished && !finished) {
        finished = true;
        const result = {
          bestLap: race.player.bestLap,
          place: race.player.rank,
          time: race.player.finishTime,
          trackKey: compiled.key,
        };
        onFinishRef.current?.(result);
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
  }, [profile, runId, track]);

  const press = (patch) => (event) => {
    event.preventDefault();
    Object.assign(touchRef.current, patch);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const release = (patch) => (event) => {
    event.preventDefault();
    Object.assign(touchRef.current, patch);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const heldMeta = telemetry.heldItem ? ITEM_META.get(telemetry.heldItem) : null;

  return (
    <div className="race-shell relative overflow-hidden border border-white/12 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
      <canvas
        ref={canvasRef}
        className="race-canvas block h-[min(72vh,620px)] min-h-[420px] w-full touch-none"
        data-testid="race-fallback-canvas"
        data-visual-canvas="race-fallback"
      />
      <div className="pointer-events-none absolute left-3 right-3 top-3 grid grid-cols-4 gap-2 text-bone sm:left-4 sm:right-auto sm:w-[520px]">
        <div className="race-hud-panel border border-white/18 bg-ink/78 p-2 backdrop-blur-md">
          <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-stone">Lap</div>
          <div className="mt-1 font-mono text-sm font-black">{telemetry.lap}/{track.laps}</div>
        </div>
        <div className="race-hud-panel border border-white/18 bg-ink/78 p-2 backdrop-blur-md">
          <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-stone">Place</div>
          <div className="mt-1 font-mono text-sm font-black text-gold">{ordinal(telemetry.place)}</div>
        </div>
        <div className="race-hud-panel border border-white/18 bg-ink/78 p-2 backdrop-blur-md">
          <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-stone">Speed</div>
          <div className="mt-1 font-mono text-sm font-black">{telemetry.speed}</div>
        </div>
        <div className="race-hud-panel border border-white/18 bg-ink/78 p-2 backdrop-blur-md">
          <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-stone">Time</div>
          <div className="mt-1 font-mono text-sm font-black">{formatTime(telemetry.time)}</div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 grid gap-2 text-bone sm:left-auto sm:w-[260px]">
        <div className="race-hud-panel border border-white/18 bg-ink/82 p-2 backdrop-blur-md">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <Sparkles size={13} className="text-gold" />
            <div className="h-1.5 rounded-full border border-white/14 bg-black/32">
              <div
                className="h-full rounded-full bg-gold transition-all"
                style={{ width: `${clamp((telemetry.drift / 2.6) * 100, 0, 100)}%` }}
              />
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-stone">Drift</div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-stone">
              Item <span className="text-bone">{heldMeta?.name || '--'}</span>
            </div>
            <div className="text-right font-mono text-[9px] uppercase tracking-[0.12em] text-stone">
              Boost <span className="text-bone">{telemetry.boost > 0 ? telemetry.boost.toFixed(1) : '--'}</span>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1 font-mono text-[8px] uppercase tracking-[0.1em] text-stone">
            <span>Grip {telemetry.grip > 0 ? telemetry.grip.toFixed(1) : '--'}</span>
            <span>Phase {telemetry.phase > 0 ? telemetry.phase.toFixed(1) : '--'}</span>
            <span>Draft {telemetry.draft > 0 ? telemetry.draft.toFixed(1) : '--'}</span>
            <span>Jump {telemetry.jump > 0 ? Math.round(telemetry.jump) : '--'}</span>
          </div>
        </div>
      </div>

      <div className="race-touch-controls pointer-events-none absolute inset-x-0 bottom-24 flex justify-between px-3 sm:hidden">
        <div className="pointer-events-auto flex gap-1.5">
          <button
            type="button"
            className="race-touch-button"
            onPointerDown={press({ steer: -1 })}
            onPointerUp={release({ steer: 0 })}
            onPointerCancel={release({ steer: 0 })}
            aria-label="Steer left"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            type="button"
            className="race-touch-button"
            onPointerDown={press({ steer: 1 })}
            onPointerUp={release({ steer: 0 })}
            onPointerCancel={release({ steer: 0 })}
            aria-label="Steer right"
          >
            <ArrowRight size={20} />
          </button>
        </div>
        <div className="pointer-events-auto flex gap-1.5">
          <button
            type="button"
            className="race-touch-button"
            onPointerDown={press({ jump: true })}
            onPointerUp={release({ jump: false })}
            onPointerCancel={release({ jump: false })}
            aria-label="Jump"
          >
            <Zap size={18} />
          </button>
          <button
            type="button"
            className="race-touch-button"
            onPointerDown={press({ drift: true })}
            onPointerUp={release({ drift: false })}
            onPointerCancel={release({ drift: false })}
            aria-label="Drift"
          >
            <Sparkles size={18} />
          </button>
          <button
            type="button"
            className="race-touch-button"
            onPointerDown={press({ brake: 1 })}
            onPointerUp={release({ brake: 0 })}
            onPointerCancel={release({ brake: 0 })}
            aria-label="Brake"
          >
            <ArrowDown size={19} />
          </button>
          <button
            type="button"
            className="race-touch-button"
            onPointerDown={press({ throttle: 1 })}
            onPointerUp={release({ throttle: 0 })}
            onPointerCancel={release({ throttle: 0 })}
            aria-label="Accelerate"
          >
            <ArrowUp size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

const StatBar = ({ label, value }) => (
  <div>
    <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-stone">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <div className="h-2 rounded-full border border-bone/[0.08] bg-ink/80">
      <div className="h-full rounded-full bg-gold" style={{ width: `${value}%` }} />
    </div>
  </div>
);

const MiniKartModel = ({ accent, color, label, view = 'hero' }) => {
  const sideView = view === 'side';
  const topView = view === 'top';
  const backView = view === 'back';
  return (
    <div className="relative h-full min-h-[74px] overflow-hidden rounded-lg border border-bone/[0.08] bg-ink/55">
      <span className="absolute inset-x-0 top-0 z-10 bg-ink/70 py-1 text-center font-mono text-[8px] font-black uppercase tracking-[0.16em] text-bone">
        {label}
      </span>
      <div className="absolute inset-x-5 bottom-4 h-2 rounded-full bg-black/30 blur-sm" />
      <div
        className={`absolute left-1/2 top-1/2 h-12 rounded-[18px] border border-white/20 ${
          sideView ? 'w-28 -translate-x-1/2 -translate-y-1/2' : topView ? 'w-16 -translate-x-1/2 -translate-y-1/2' : 'w-20 -translate-x-1/2 -translate-y-1/2'
        }`}
        style={{
          background: `linear-gradient(135deg, ${color}, ${accent})`,
          transform: `translate(-50%, -50%) ${backView ? 'rotate(180deg)' : ''}`,
        }}
      >
        <span className="absolute left-1/2 top-2 h-5 w-9 -translate-x-1/2 rounded-full bg-white/30" />
        <span className="absolute bottom-1 left-1/2 h-2 w-10 -translate-x-1/2 rounded-full bg-ink/55" />
        <span className="absolute -left-2 top-2 h-4 w-4 rounded-full bg-zinc-950" />
        <span className="absolute -right-2 top-2 h-4 w-4 rounded-full bg-zinc-950" />
        <span className="absolute -left-2 bottom-2 h-4 w-4 rounded-full bg-zinc-950" />
        <span className="absolute -right-2 bottom-2 h-4 w-4 rounded-full bg-zinc-950" />
      </div>
    </div>
  );
};

const KartDesignSheet = ({ profile }) => {
  const stats = profile?.race?.statBars || {};
  const avatar = profile?.avatar || {};
  const color = avatar.chassis || '#36a7e2';
  const accent = avatar.accent || '#ffd34f';
  const swatches = [color, accent, '#f4f7f8', '#202837', '#2cc8ff'];

  return (
    <section
      className="overflow-hidden rounded-lg border border-bone/[0.08] bg-gradient-to-br from-zinc-500/35 via-slate-700/40 to-ink p-4 shadow-2xl"
      data-visual-section="garage-sheet"
    >
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-gold">
        <Car size={14} />
        Kart Design Sheet
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.05fr_1.4fr]">
        <MiniKartModel accent={accent} color={color} label={avatar.name || 'Kart'} />
        <div className="grid grid-cols-4 gap-2">
          <MiniKartModel accent={accent} color={color} label="Front" view="front" />
          <MiniKartModel accent={accent} color={color} label="Side" view="side" />
          <MiniKartModel accent={accent} color={color} label="Back" view="back" />
          <MiniKartModel accent={accent} color={color} label="Top" view="top" />
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex items-center gap-2">
          {swatches.map((swatch) => (
            <span
              key={swatch}
              className="h-8 flex-1 rounded border border-white/30 shadow-lg"
              style={{ background: swatch }}
            />
          ))}
        </div>
        <div className="rounded-lg border border-bone/[0.06] bg-ink/44 p-3">
          <div className="grid gap-2">
            <StatBar label="Speed" value={Math.max(0, Math.min(100, Number(stats.speed) || 72))} />
            <StatBar label="Acceleration" value={Math.max(0, Math.min(100, Number(stats.acceleration) || 62))} />
            <StatBar label="Handling" value={Math.max(0, Math.min(100, Number(stats.grip) || 55))} />
            <StatBar label="Boost" value={Math.max(0, Math.min(100, Number(stats.boost) || 66))} />
          </div>
        </div>
      </div>
    </section>
  );
};

const InventoryButton = ({ count, icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={count <= 0}
    className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-bone/[0.08] bg-ink/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-bone transition-colors hover:border-gold/40 disabled:cursor-not-allowed disabled:opacity-40"
  >
    <Icon size={14} />
    {label}
    <span className="text-gold">{count}</span>
  </button>
);

const IntelBlock = ({ title, children }) => (
  <div className="rounded-lg border border-bone/[0.07] bg-ink/44 p-3">
    <div className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-gold">{title}</div>
    <div className="mt-2 text-xs leading-relaxed text-stone">{children}</div>
  </div>
);

const IntelList = ({ items }) => (
  <ul className="space-y-1.5">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

const TrackIntel = ({ track }) => (
  <Card className="p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          {track.discipline} track
        </div>
        <div className="mt-1 font-display text-4xl leading-none text-bone">{track.name}</div>
      </div>
      <div className="rounded-lg border border-bone/[0.08] bg-ink/60 px-3 py-2 text-right font-mono text-[9px] uppercase tracking-[0.14em] text-stone">
        <div className="text-bone">{track.difficulty}</div>
        <div>{track.laps} laps</div>
      </div>
    </div>

    <div className="mt-4 grid gap-3 lg:grid-cols-3">
      <IntelBlock title="Theme">
        <p>{track.theme.atmosphere}</p>
        <p className="mt-2">{track.theme.time} / {track.theme.weather}</p>
        <p className="mt-2">{track.theme.music}</p>
      </IntelBlock>
      <IntelBlock title="Layout">
        <p>{track.layout.shape}</p>
        <p className="mt-2">{track.layout.philosophy}</p>
        {track.layout.branches?.[0] ? <p className="mt-2">{track.layout.branches[0]}</p> : null}
      </IntelBlock>
      <IntelBlock title="Shortcut">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-bone">
          {track.riskRewardShortcut.name}
        </p>
        <p className="mt-2">{track.riskRewardShortcut.summary}</p>
      </IntelBlock>
    </div>

    <div className="mt-3 grid gap-3 lg:grid-cols-3">
      <IntelBlock title="Obstacles">
        <IntelList items={track.signatureObstacles} />
      </IntelBlock>
      <IntelBlock title="Dynamic">
        <IntelList items={track.dynamicElements} />
      </IntelBlock>
      <IntelBlock title="Power-up and AI">
        <p>
          <span className="text-bone">{track.signatureItem.name}:</span> {track.signatureItem.summary}
        </p>
        <p className="mt-2">{track.powerUpIntel.placement}</p>
        <p className="mt-2">{track.aiIntel.signatureMove}</p>
      </IntelBlock>
    </div>
  </Card>
);


// First-time start screen: controls, drift/trick school, and the item table.
// QA automation (navigator.webdriver / autoplay params) skips it.
const KartIntroScreen = ({ onStart }) => (
  <div
    className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#0c1124]/[0.97] p-4"
    data-testid="race-intro-screen"
  >
    <div className="w-full max-w-3xl space-y-5 py-6">
      <div className="text-center">
        <div className="font-mono text-[11px] font-black uppercase tracking-[0.3em] text-[#7eefff]">Comeback City</div>
        <h2 className="mt-1 font-mono text-2xl font-black uppercase tracking-[0.08em] text-white">Grand Prix — How to Race</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border border-white/12 bg-white/[0.03] p-4">
          <div className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd34f]">Drive</div>
          <ul className="space-y-1.5 text-[13px] leading-snug text-white/80">
            <li><span className="text-white">↑ / W</span> — accelerate</li>
            <li><span className="text-white">← → / A D</span> — steer</li>
            <li><span className="text-white">↓ / S</span> — brake</li>
            <li><span className="text-white">SHIFT / ENTER / E / F</span> — fire item</li>
            <li>On mobile you auto-accelerate: drag to steer, flick the drag to drift, tap to throw — the big buttons work too. TILT switches to motion steering.</li>
          </ul>
        </div>
        <div className="border border-white/12 bg-white/[0.03] p-4">
          <div className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd34f]">Drift &amp; Tricks</div>
          <ul className="space-y-1.5 text-[13px] leading-snug text-white/80">
            <li><span className="text-white">SPACE</span> in a corner — hop into a drift; hold it.</li>
            <li>Sparks charge <span className="text-[#46d9ef]">blue</span> → <span className="text-[#ff9a2e]">orange</span> → <span className="text-[#c879ff]">purple</span>; release for a bigger boost.</li>
            <li>Tap <span className="text-white">SPACE</span> mid-air off any ramp — land a trick for a boost.</li>
            <li>The <span className="text-[#c879ff]">purple dare ramp</span> jumps the whole corner — only with boost speed. Miss it and you crawl.</li>
          </ul>
        </div>
        <div className="border border-white/12 bg-white/[0.03] p-4">
          <div className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd34f]">Items</div>
          {/* Icons come from the SAME map as the in-race HUD chip (HeldItemIcon),
              so what you read here is exactly what you'll see next to the
              throw button when you're holding it. */}
          <ul className="space-y-2 text-[13px] leading-snug text-white/80">
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#ffd34f]"><HeldItemIcon heldItem="cocoa" /></span> <span><span className="text-white">Hot Cocoa</span> — chug it for an instant mini-turbo.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#49d9ff]"><HeldItemIcon heldItem="iceshield" /></span> <span><span className="text-white">Ice Shield</span> — a crystal dome that eats the next hit.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#f2ecd9]"><HeldItemIcon heldItem="fishbone" /></span> <span><span className="text-white">Fish Bone</span> — drops behind you and arms after a beat; spins out whoever runs it over.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#9fdcff]"><HeldItemIcon heldItem="snowball" projectileSkin="snowball" /></span> <span><span className="text-white">Snowball</span> — throws forward; first kart it catches spins out. Bunny throws carrots, penguins throw ice shards. You get these when you're behind.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#cfe8f4]"><HeldItemIcon heldItem="slapfish" /></span> <span><span className="text-white">Slap Fish</span> — swings a big fish; spins anyone riding alongside.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#ffb066]"><HeldItemIcon heldItem="sardine" /></span> <span><span className="text-white">Rocket Sardine</span> — homes in on the kart directly ahead. A shield blocks it.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#dff3ff]"><HeldItemIcon heldItem="blizzard" /></span> <span><span className="text-white">Blizzard Cloud</span> — parks a fog dome on the road for 8s; everyone inside crawls. Yours slows you too.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#f4fbff]"><HeldItemIcon heldItem="avalanche" /></span> <span><span className="text-white">Avalanche</span> — last place, final lap only: buries whoever is in 1st. Watch for the rumble.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#9ff5d0]"><HeldItemIcon heldItem="aurora" /></span> <span><span className="text-white">Aurora Boost</span> — last place, final lap only: 3s of invincible speed. Everything you touch spins; you don't.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#f4f8ff]"><HeldItemIcon heldItem="march" /></span> <span><span className="text-white">Penguin March</span> — last place, final lap only: a waddle-train of ordinal penguins crosses the road ahead. Hit the line and you spin.</span></li>
            <li>Question boxes hand you one — the icon shows next to the throw button while you hold it.</li>
            <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#ffb52e]"><Bitcoin size={15} /></span> <span><span className="text-white">₿ Coins</span> — collect them off the road; every coin nudges your top speed (up to 10). Spin out and a few shake loose. Rows come back each lap.</span></li>
          </ul>
        </div>
      </div>
      <div className="text-center">
        <button
          type="button"
          className="border border-[#ffd34f]/60 bg-[#ffd34f]/10 px-8 py-3 font-mono text-sm font-black uppercase tracking-[0.2em] text-[#ffd34f] transition-colors hover:bg-[#ffd34f]/20"
          data-testid="race-intro-start"
          onClick={onStart}
        >
          Start Race
        </button>
        <div className="mt-2 text-[11px] text-white/40">Beat Blue Speed for the win — he's fast, but he can't drift like you.</div>
      </div>
    </div>
  </div>
);

// Stat spread is 0.92–1.08 — map onto bars so the differences read.
const statPercent = (value) => Math.round(clamp(((value - 0.9) / 0.18) * 100, 8, 100));
const KartStatBar = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <span className="w-12 shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-white/45">{label}</span>
    <div className="h-1.5 flex-1 bg-white/10">
      <div className="h-full bg-[#7eefff]" style={{ width: `${statPercent(value)}%` }} />
    </div>
  </div>
);

// Pre-race garage: pick your racer AND your kart (karts carry light stat
// spreads). The remaining characters take the rival seats in their signature
// rides. Shown every visit after the one-time intro; QA automation skips it.
const KartCharacterSelect = ({ kartKey, onShowGuide, onStart, selectedKey, setKartKey, setSelectedKey, setTrackKey, trackKey }) => (
  <div
    className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#0c1124]/[0.97] p-4"
    data-testid="race-character-select"
  >
    <div className="w-full max-w-4xl space-y-5 py-6">
      <div className="text-center">
        <div className="font-mono text-[11px] font-black uppercase tracking-[0.3em] text-[#7eefff]">Comeback City Grand Prix</div>
        <h2 className="mt-1 font-mono text-2xl font-black uppercase tracking-[0.08em] text-white">Race Setup</h2>
        <p className="mt-1 text-[12px] text-white/50">Pick your track, your racer, and your kart.</p>
        {/* W2 (owner): the intro's full item guide must be reachable every
            visit, not just the first — "so people are not just guessing". */}
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-2 border border-white/20 bg-white/[0.04] px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/75 transition-colors hover:border-[#7eefff]/60 hover:text-[#7eefff]"
          data-testid="race-open-item-guide"
          onClick={onShowGuide}
        >
          <BookOpen size={13} />
          How to race &amp; item guide
        </button>
      </div>
      <div className="text-center">
        <h3 className="font-mono text-sm font-black uppercase tracking-[0.14em] text-white">Pick Your Track</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {KART_TRACKS.map((entry) => {
          const selected = entry.key === trackKey;
          return (
            <button
              key={entry.key}
              type="button"
              data-testid={`race-track-${entry.key}`}
              onClick={() => setTrackKey(entry.key)}
              className={`border p-4 text-left transition-colors ${
                selected ? 'border-[#ffd34f] bg-[#ffd34f]/10' : 'border-white/12 bg-white/[0.03] hover:border-white/30'
              }`}
            >
              <div className="font-mono text-[12px] font-black uppercase tracking-[0.08em] text-white">{entry.name}</div>
              <div className="mt-1 text-[11px] text-white/55">{entry.tagline}</div>
              <div className="mt-1 text-[10px] text-[#7eefff]">{entry.laps} laps</div>
            </button>
          );
        })}
      </div>
      <div className="text-center">
        <h3 className="font-mono text-sm font-black uppercase tracking-[0.14em] text-white">Pick Your Racer</h3>
        <p className="text-[11px] text-white/45">The rest of the crew lines up against you.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {KART_CHARACTERS.map((entry) => {
          const selected = entry.key === selectedKey;
          return (
            <button
              key={entry.key}
              type="button"
              data-testid={`race-character-${entry.key}`}
              onClick={() => {
                setSelectedKey(entry.key);
                setKartKey(entry.kart);
              }}
              className={`border p-3 text-center transition-colors ${
                selected
                  ? 'border-[#ffd34f] bg-[#ffd34f]/10'
                  : 'border-white/12 bg-white/[0.03] hover:border-white/30'
              }`}
            >
              <img
                src={CHARACTER_PORTRAITS[entry.key]}
                alt={entry.name}
                className="mx-auto mb-2 h-24 w-24 object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)]"
              />
              <div className="font-mono text-[11px] font-black uppercase tracking-[0.08em] text-white">{entry.name}</div>
              <div className="mt-1 text-[10px]" style={{ color: entry.accent }}>
                throws {entry.projectileSkin === 'carrot' ? 'carrots' : 'ice shards'}
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-center">
        <h3 className="font-mono text-sm font-black uppercase tracking-[0.14em] text-white">Pick Your Kart</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {KART_OPTIONS.map((entry) => {
          const selected = entry.key === kartKey;
          return (
            <button
              key={entry.key}
              type="button"
              data-testid={`race-kart-${entry.key}`}
              onClick={() => setKartKey(entry.key)}
              className={`border p-4 transition-colors ${
                selected
                  ? 'border-[#ffd34f] bg-[#ffd34f]/10'
                  : 'border-white/12 bg-white/[0.03] hover:border-white/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={KART_PORTRAITS[entry.key]}
                  alt={entry.name}
                  className="h-20 w-20 shrink-0 object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)]"
                />
                <div className="min-w-0 flex-1 text-left">
                  <div className="font-mono text-[11px] font-black uppercase tracking-[0.08em] text-white">{entry.name}</div>
                  <div className="mb-2 text-[10px] text-white/50">{entry.tagline}</div>
                  <div className="space-y-1">
                    <KartStatBar label="Speed" value={entry.stats.topSpeed} />
                    <KartStatBar label="Accel" value={entry.stats.accel} />
                    <KartStatBar label="Turn" value={entry.stats.handling} />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-center">
        <button
          type="button"
          className="border border-[#ffd34f]/60 bg-[#ffd34f]/10 px-8 py-3 font-mono text-sm font-black uppercase tracking-[0.2em] text-[#ffd34f] transition-colors hover:bg-[#ffd34f]/20"
          data-testid="race-character-start"
          onClick={onStart}
        >
          Start Race
        </button>
      </div>
    </div>
  </div>
);

// W1: share/QA URLs may carry ?character/?kart/?track. They SEED the select
// state here (visible as the preselected entry) and never override a later
// pick — the race component is prop-only, so whatever the cup select
// confirms is what races. While the param stays in the URL, a fresh visit
// to this screen re-seeds from it; the pick always wins for the race run.
const urlSeededKey = (name, isValid) => {
  if (typeof window === 'undefined') return null;
  const param = new URLSearchParams(window.location.search).get(name);
  return param && isValid(param) ? param : null;
};

export const RaceScreen = ({ onExit = null, readOnly = false, setState, state }) => {
  const profile = useMemo(() => deriveGameProfile(state), [state]);
  const raceStageRef = useRef(null);
  const [trackKey, setTrackKey] = useState(RACE_TRACKS[0].key);
  const [runId, setRunId] = useState(1);
  const [introSeen, setIntroSeen] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (window.navigator?.webdriver) return true; // QA harness skips the intro
    const params = new URLSearchParams(window.location.search);
    if (params.get('playableAutoplay') === '1' || params.get('raceAutoplay') === '1') return true;
    try {
      return window.localStorage?.getItem('cc-kart-intro-seen') === '1';
    } catch {
      return true;
    }
  });
  const dismissIntro = useCallback(() => {
    try {
      window.localStorage?.setItem('cc-kart-intro-seen', '1');
    } catch {
      // localStorage unavailable — show it again next time, no harm.
    }
    setIntroSeen(true);
  }, []);
  // Character select: shown every visit (QA automation skips it, same rules
  // as the intro). The last pick is remembered and preselected.
  const [characterReady, setCharacterReady] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (window.navigator?.webdriver) return true;
    const params = new URLSearchParams(window.location.search);
    return params.get('playableAutoplay') === '1' || params.get('raceAutoplay') === '1';
  });
  const [characterKey, setCharacterKey] = useState(() => {
    const seeded = urlSeededKey('character', (key) => KART_CHARACTERS.some((entry) => entry.key === key));
    if (seeded) return seeded;
    if (typeof window === 'undefined') return DEFAULT_CHARACTER_KEY;
    try {
      const saved = window.localStorage?.getItem('cc-kart-character');
      return KART_CHARACTERS.some((entry) => entry.key === saved) ? saved : DEFAULT_CHARACTER_KEY;
    } catch {
      return DEFAULT_CHARACTER_KEY;
    }
  });
  const [kartKey, setKartKey] = useState(() => {
    const seeded = urlSeededKey('kart', (key) => KART_OPTIONS.some((entry) => entry.key === key));
    if (seeded) return seeded;
    if (typeof window === 'undefined') return null;
    try {
      const saved = window.localStorage?.getItem('cc-kart-kart');
      return KART_OPTIONS.some((entry) => entry.key === saved) ? saved : null;
    } catch {
      return null;
    }
  });
  const [kartTrackKey, setKartTrackKey] = useState(() => {
    const seeded = urlSeededKey('track', (key) => KART_TRACKS.some((entry) => entry.key === key));
    if (seeded) return seeded;
    if (typeof window === 'undefined') return DEFAULT_TRACK_KEY;
    try {
      const saved = window.localStorage?.getItem('cc-kart-track');
      return KART_TRACKS.some((entry) => entry.key === saved) ? saved : DEFAULT_TRACK_KEY;
    } catch {
      return DEFAULT_TRACK_KEY;
    }
  });
  const confirmCharacter = useCallback(() => {
    try {
      window.localStorage?.setItem('cc-kart-character', characterKey);
      window.localStorage?.setItem('cc-kart-track', kartTrackKey);
      if (kartKey) window.localStorage?.setItem('cc-kart-kart', kartKey);
    } catch {
      // localStorage unavailable — the pick still applies this session.
    }
    setCharacterReady(true);
  }, [characterKey, kartKey, kartTrackKey]);
  useEffect(() => {
    // W1: the URL seed is ONE-SHOT. Strip the select params once the
    // initializers above have consumed them, so a stale share/lab URL can't
    // keep re-seeding over the owner's saved pick on every re-entry (the
    // app-shell router deliberately preserves location.search). Idempotent;
    // QA contexts are fresh page loads, so their seeded mount is unaffected.
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has('track') && !params.has('character') && !params.has('kart')) return;
    params.delete('track');
    params.delete('character');
    params.delete('kart');
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    );
  }, []);
  const [raceProfile, setRaceProfile] = useState(null);
  const [command, setCommand] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [webGLAvailable, setWebGLAvailable] = useState(hasWebGLSupport);
  const track = RACE_TRACKS.find((item) => item.key === trackKey) || RACE_TRACKS[0];
  const garage = profile.race.garage;
  const results = state.game?.raceResults || {};

  const issueCommand = (type) => {
    setCommand({ id: Date.now() + Math.random(), type });
  };

  const startRace = useCallback(
    (nextTrackKey = track.key) => {
      setTrackKey(nextTrackKey);
      setLastResult(null);
      setRaceProfile(profile);
      setRunId((value) => value + 1);
      window.setTimeout(() => {
        raceStageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    },
    [profile, track.key]
  );

  const purchaseUpgrade = useCallback(
    (upgrade) => {
      if (readOnly) return;
      setState((current) => {
        const currentProfile = deriveGameProfile(current);
        const currentGarage = normalizeRaceGarage(current.game?.raceGarage);
        const level = clamp(Number(currentGarage.upgrades[upgrade.key]) || 0, 0, upgrade.maxLevel);
        if (level >= upgrade.maxLevel) return current;
        const cost = upgradeCost(upgrade, level);
        if (currentProfile.race.credits < cost) return current;
        return {
          ...current,
          game: {
            ...(current.game || {}),
            raceGarage: {
              ...currentGarage,
              spentCredits: currentGarage.spentCredits + cost,
              upgrades: {
                ...currentGarage.upgrades,
                [upgrade.key]: level + 1,
              },
            },
          },
        };
      });
    },
    [readOnly, setState]
  );

  const purchaseItem = useCallback(
    (item) => {
      if (readOnly) return;
      setState((current) => {
        const currentProfile = deriveGameProfile(current);
        const currentGarage = normalizeRaceGarage(current.game?.raceGarage);
        if (currentProfile.race.credits < item.cost) return current;
        return {
          ...current,
          game: {
            ...(current.game || {}),
            raceGarage: {
              ...currentGarage,
              inventory: {
                ...currentGarage.inventory,
                [item.key]: (currentGarage.inventory[item.key] || 0) + 1,
              },
              spentCredits: currentGarage.spentCredits + item.cost,
            },
          },
        };
      });
    },
    [readOnly, setState]
  );

  const consumeInventory = useCallback(
    (itemKey) => {
      if (readOnly) return;
      setState((current) => {
        const currentGarage = normalizeRaceGarage(current.game?.raceGarage);
        const count = currentGarage.inventory[itemKey] || 0;
        if (count <= 0) return current;
        return {
          ...current,
          game: {
            ...(current.game || {}),
            raceGarage: {
              ...currentGarage,
              inventory: {
                ...currentGarage.inventory,
                [itemKey]: count - 1,
              },
            },
          },
        };
      });
    },
    [readOnly, setState]
  );

  const handleFinish = useCallback(
    (result) => {
      setLastResult(result);
      if (readOnly) return;
      setState((current) => {
        const previous = current.game?.raceResults?.[result.trackKey] || {};
        const bestTime =
          !previous.bestTime || result.time < previous.bestTime ? result.time : previous.bestTime;
        const bestLap =
          result.bestLap && (!previous.bestLap || result.bestLap < previous.bestLap)
            ? result.bestLap
            : previous.bestLap;
        return {
          ...current,
          game: {
            ...(current.game || {}),
            raceResults: {
              ...(current.game?.raceResults || {}),
              [result.trackKey]: {
                ...previous,
                bestLap,
                bestPlace: previous.bestPlace ? Math.min(previous.bestPlace, result.place) : result.place,
                bestTime,
                podiums: (previous.podiums || 0) + (result.place <= 3 ? 1 : 0),
                runs: (previous.runs || 0) + 1,
                wins: (previous.wins || 0) + (result.place === 1 ? 1 : 0),
              },
            },
          },
        };
      });
    },
    [readOnly, setState]
  );

  return (
    <div
      ref={raceStageRef}
      className="relative min-h-[100svh] overflow-hidden bg-[#10151d]"
      data-race-renderer="three-kart"
      data-race-track={track.key}
      data-testid="race-screen"
    >
      {onExit && (
        <button
          type="button"
          className="arcade-hud-panel pointer-events-auto absolute left-3 top-3 z-50 flex min-h-11 items-center gap-2 border border-white/18 bg-[#10151d]/[0.86] px-3 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-[0_14px_34px_rgba(0,0,0,0.3)] backdrop-blur-md transition-colors hover:bg-[#ffd34f]/10 hover:text-[#ffd34f] sm:left-5 sm:top-5"
          data-testid="race-exit-button"
          onClick={onExit}
        >
          <ArrowLeft size={14} />
          Today
        </button>
      )}
      {!introSeen ? (
        <KartIntroScreen onStart={dismissIntro} />
      ) : !characterReady ? (
        <KartCharacterSelect
          kartKey={kartKey || (KART_CHARACTERS.find((entry) => entry.key === characterKey) || KART_CHARACTERS[0]).kart}
          onShowGuide={() => setIntroSeen(false)}
          onStart={confirmCharacter}
          selectedKey={characterKey}
          setKartKey={setKartKey}
          setSelectedKey={setCharacterKey}
          setTrackKey={setKartTrackKey}
          trackKey={kartTrackKey}
        />
      ) : (
        <ComebackCityThreeKartRace
          character={characterKey}
          kart={kartKey}
          mode="race"
          onFinish={handleFinish}
          reducedMotion={Boolean(state.game?.hub?.reducedMotion)}
          runId={runId}
          track={kartTrackKey}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div ref={raceStageRef} className="grid gap-4 scroll-mt-16">
        <div className="space-y-3">
          <ArcadeRace3D
            command={command}
            inventory={garage.inventory}
            onFinish={handleFinish}
            onInventoryUse={consumeInventory}
            profile={raceProfile || profile}
            reducedMotion={Boolean(state.game?.hub?.reducedMotion)}
            runId={runId}
            track={track}
          />

          <div className="mx-auto hidden w-full max-w-6xl gap-2 px-4 sm:grid md:grid-cols-3">
            {RACE_TRACKS.map((item) => {
              const active = item.key === track.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => startRace(item.key)}
                  className={`race-track-card min-h-[82px] border p-3 text-left transition-transform active:scale-[0.98] ${
                    active
                      ? 'border-gold/60 bg-gold/[0.08] text-bone'
                      : 'border-bone/[0.08] bg-bone/[0.015] text-stone hover:border-gold/35 hover:text-bone'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-gold">
                        {item.discipline}
                      </span>
                      <span className="mt-1 block truncate font-display text-2xl leading-none">
                        {item.shortName}
                      </span>
                    </span>
                    <Flag size={17} style={{ color: item.accent }} />
                  </div>
                  <span className="mt-2 block font-mono text-[9px] font-black uppercase tracking-[0.14em] text-bone">
                    Join Track
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4">
            <button
              type="button"
              onClick={() => startRace()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-gold/45 bg-gold px-4 py-2 font-mono text-[11px] font-black uppercase tracking-[0.16em] text-ink transition-transform active:scale-[0.98]"
            >
              <Flag size={14} />
              Restart Race
            </button>
            <InventoryButton
              count={garage.inventory.boost || 0}
              icon={Zap}
              label="Turbo"
              onClick={() => issueCommand('boost')}
            />
            <InventoryButton
              count={garage.inventory.shield || 0}
              icon={Shield}
              label="Guard"
              onClick={() => issueCommand('shield')}
            />
            <InventoryButton
              count={garage.inventory.rocket || 0}
              icon={Rocket}
              label="Pulse"
              onClick={() => issueCommand('rocket')}
            />
          </div>

          <div className="mx-auto w-full max-w-6xl px-4">
            <KartDesignSheet profile={profile} />
          </div>

          {lastResult && (
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Medal size={18} className="text-gold" />
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
                      Finish
                    </div>
                    <div className="mt-1 font-display text-3xl leading-none text-bone">
                      {ordinal(lastResult.place)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-right font-mono text-[10px] uppercase tracking-[0.14em] text-stone">
                  <div>
                    <div>Time</div>
                    <div className="mt-1 text-bone">{formatTime(lastResult.time)}</div>
                  </div>
                  <div>
                    <div>Best Lap</div>
                    <div className="mt-1 text-bone">{formatTime(lastResult.bestLap)}</div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
              <Gauge size={13} className="text-gold" />
              Tuning
            </div>
            <div className="space-y-3">
              <StatBar label="Top speed" value={profile.race.statBars.speed} />
              <StatBar label="Acceleration" value={profile.race.statBars.acceleration} />
              <StatBar label="Grip" value={profile.race.statBars.grip} />
              <StatBar label="Boost" value={profile.race.statBars.boost} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
              <ShoppingCart size={13} className="text-gold" />
              Upgrades
            </div>
            <div className="space-y-3">
              {RACE_UPGRADES.map((upgrade) => {
                const level = clamp(Number(garage.upgrades[upgrade.key]) || 0, 0, upgrade.maxLevel);
                const cost = upgradeCost(upgrade, level);
                const maxed = level >= upgrade.maxLevel;
                return (
                  <div key={upgrade.key} className="rounded-lg border border-bone/[0.06] bg-ink/44 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-[11px] font-black uppercase tracking-[0.14em] text-bone">
                          {upgrade.name}
                        </div>
                        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-stone">
                          {upgrade.stat} {level}/{upgrade.maxLevel}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => purchaseUpgrade(upgrade)}
                        disabled={readOnly || maxed || profile.race.credits < cost}
                        className="shrink-0 rounded-md border border-gold/35 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-gold transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {maxed ? 'Max' : cost}
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-6 gap-1">
                      {Array.from({ length: upgrade.maxLevel }).map((_, index) => (
                        <span
                          key={index}
                          className={`h-1.5 rounded-full ${index < level ? 'bg-gold' : 'bg-bone/[0.08]'}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
              <Zap size={13} className="text-gold" />
              Items
            </div>
            <div className="space-y-2">
              {RACE_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => purchaseItem(item)}
                  disabled={readOnly || profile.race.credits < item.cost}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-bone/[0.06] bg-ink/44 p-3 text-left transition-colors hover:border-gold/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-[11px] font-black uppercase tracking-[0.14em] text-bone">
                      {item.name}
                    </span>
                    <span className="mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.12em] text-stone">
                      Owned {garage.inventory[item.key] || 0}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold">
                    {item.cost}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {RACE_TRACKS.map((item) => {
          const active = item.key === track.key;
          const result = results[item.key];
          return (
            <div
              key={item.key}
              className={`race-track-card border p-4 text-left transition-colors ${
                active
                  ? 'border-gold/55 bg-gold/[0.06] text-bone'
                  : 'border-bone/[0.08] bg-bone/[0.015] text-stone hover:border-bone/20 hover:text-bone'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTrackKey(item.key);
                    setLastResult(null);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
                    {item.discipline}
                  </div>
                  <div className="mt-1 truncate font-display text-3xl leading-none">{item.name}</div>
                </button>
                <Flag size={20} style={{ color: item.accent }} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-stone">
                <span>{item.laps} laps</span>
                <span>{result?.bestPlace ? ordinal(result.bestPlace) : '--'}</span>
                <span>{formatTime(result?.bestTime)}</span>
              </div>
              <div className="mt-3 text-xs leading-relaxed text-stone">{item.difficultyWhy}</div>
              <button
                type="button"
                onClick={() => startRace(item.key)}
                className={`mt-4 inline-flex min-h-[38px] w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.14em] transition-transform active:scale-[0.98] ${
                  active
                    ? 'border-gold/60 bg-gold text-ink'
                    : 'border-bone/[0.14] bg-ink/54 text-bone hover:border-gold/45'
                }`}
              >
                <Flag size={13} />
                Join Track
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-stone">
            <Trophy size={13} className="text-gold" />
            Level
          </div>
          <div className="mt-2 font-display text-4xl leading-none text-bone">{profile.level}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-stone">
            <ShoppingCart size={13} className="text-gold" />
            Credits
          </div>
          <div className="mt-2 font-display text-4xl leading-none text-gold">{profile.race.credits}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-stone">
            <Gauge size={13} className="text-gold" />
            Speed
          </div>
          <div className="mt-2 font-display text-4xl leading-none text-bone">
            {profile.race.statBars.speed}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-stone">
            <Car size={13} className="text-gold" />
            Grip
          </div>
          <div className="mt-2 font-display text-4xl leading-none text-bone">
            {profile.race.statBars.grip}
          </div>
        </Card>
      </div>

      <TrackIntel track={track} />
    </div>
  );
};
