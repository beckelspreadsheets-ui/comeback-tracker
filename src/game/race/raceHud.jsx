// LEGACY - NOT THE SHIPPED GAME. Editing this file changes nothing the
// owner ever sees. The racer that ships is the ComebackCityThreeKartRace.jsx
// monolith, which imports NONE of this module tree (its only render-layer
// imports are raceParticles / toonRimShader / gltfLoader / createRaceScene
// (renderer+canvas fit only) / createBasicMaterial).
//
// The HUD a player actually sees is inline JSX at the bottom of
// ComebackCityThreeKartRace.jsx (~6540), styled by
// src/game/comebackCityThreeKartRace.css. This one only renders inside
// ArcadeRace3D via race-playtest.html.

import { useMemo } from 'react';
import {
  ArrowUp,
  ChevronsRight,
  Flag,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { itemLabel } from '../raceItems.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const makeRaceMinimap = (track) => {
  const course = track.courseV2;
  const source = course?.minimapPath?.length
    ? course.minimapPath
    : (track.points || []).map((point) => ({ x: point.x, z: point.y }));
  const branches = course?.branches || track.shortcuts || [];
  if (!source.length) return null;
  const allPoints = [
    ...source,
    ...branches.flatMap((branch) => branch.points || []),
  ].map((point) => ({ x: point.x || 0, z: point.z ?? point.y ?? 0 }));
  const bounds = allPoints.reduce(
    (acc, point) => ({
      maxX: Math.max(acc.maxX, point.x),
      maxZ: Math.max(acc.maxZ, point.z),
      minX: Math.min(acc.minX, point.x),
      minZ: Math.min(acc.minZ, point.z),
    }),
    { maxX: -Infinity, maxZ: -Infinity, minX: Infinity, minZ: Infinity }
  );
  const spanX = Math.max(1, bounds.maxX - bounds.minX);
  const spanZ = Math.max(1, bounds.maxZ - bounds.minZ);
  const pad = 12;
  const mapPoint = (point) => {
    const x = pad + ((point.x - bounds.minX) / spanX) * (100 - pad * 2);
    const y = pad + ((point.z - bounds.minZ) / spanZ) * (100 - pad * 2);
    return [Number(x.toFixed(2)), Number(y.toFixed(2))];
  };
  const pathFor = (points, closed = false) => {
    const mapped = points.map((point) => mapPoint({ x: point.x || 0, z: point.z ?? point.y ?? 0 }));
    if (!mapped.length) return '';
    const body = mapped.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
    return closed ? `${body} Z` : body;
  };
  return {
    branches: branches.map((branch) => ({
      accent: branch.accent || '#46d9ef',
      d: pathFor(branch.points || [], false),
      key: branch.key,
    })),
    route: pathFor(source, true),
  };
};

const ordinal = (value) =>
  value === 1 ? '1st' : value === 2 ? '2nd' : value === 3 ? '3rd' : `${value}th`;

const formatTime = (seconds = 0) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00.00';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(2).padStart(5, '0')}`;
};

export const RaceHud = ({
  audioMuted = false,
  canvasRef,
  hideMinimap = false,
  onAudioMutedChange,
  onCommand,
  onPress,
  onRelease,
  reducedMotion = false,
  telemetry,
  track,
}) => {
  const minimap = useMemo(() => makeRaceMinimap(track), [track]);
  const heldItem = telemetry.heldBalloon;
  const heldItemKey = typeof heldItem === 'string' ? heldItem : heldItem?.itemKey || heldItem?.key;
  const heldItemLabel = heldItem ? heldItem.label || itemLabel(heldItemKey) || 'Item' : 'Empty';
  const driftPct = clamp((telemetry.drift / 2.8) * 100, 0, 100);
  const boostPct = clamp((telemetry.boost / 1.2) * 100, 0, 100);
  const shieldActive = (telemetry.shield || 0) > 0;
  const motionReduced = Boolean(reducedMotion || telemetry.reducedMotion);
  const speedRatio = Number.isFinite(telemetry.speedRatio) ? telemetry.speedRatio : 0;
  const raceTime = Number.isFinite(telemetry.time) ? telemetry.time : 0;
  const visibleRivals = clamp(Math.round(telemetry.visibleRivals || 0), 0, 3);
  const visibleRivalsSeen = clamp(Math.round(telemetry.visibleRivalsSeen || 0), 0, 3);
  const finalLapActive = Number(telemetry.lap || 1) >= Number(track.laps || 1);
  const pressureLabel =
    visibleRivals >= 3
      ? 'Pack fight'
      : visibleRivals > 0
        ? `${visibleRivals} in view`
        : visibleRivalsSeen > 0
          ? 'Chase line'
          : 'Build speed';

  return (
    <div
      className="arcade-race-shell relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-[#10151d]"
      data-race-audio-muted={audioMuted ? 'true' : 'false'}
      data-race-lap={telemetry.lap}
      data-race-minimap-visible={hideMinimap ? 'false' : 'true'}
      data-race-place={telemetry.place}
      data-race-speed-ratio={speedRatio.toFixed(3)}
      data-race-time={raceTime.toFixed(2)}
      data-race-track={track.key}
      data-visual-section="mobile-race"
      data-reduced-motion={motionReduced ? 'true' : 'false'}
      data-testid="arcade-race-shell"
    >
      <canvas
        ref={canvasRef}
        className="arcade-race-canvas block h-full w-full touch-none"
        data-visual-canvas="race"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,transparent_58%,rgba(5,13,22,0.24)_100%)]" />

      {!motionReduced && telemetry.speedRatio > 0.8 && (
        <div
          className="pointer-events-none absolute inset-0 opacity-45 mix-blend-screen"
          data-testid="race-speed-lines"
        >
          <div className="absolute inset-y-0 left-0 w-1/2 bg-[repeating-linear-gradient(100deg,transparent_0_18px,rgba(255,255,255,0.16)_18px_20px,transparent_20px_42px)]" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[repeating-linear-gradient(80deg,transparent_0_18px,rgba(255,255,255,0.16)_18px_20px,transparent_20px_42px)]" />
        </div>
      )}

      {telemetry.cameraFlash > 0 && (
        <div
          className="pointer-events-none absolute inset-0 bg-white mix-blend-screen"
          style={{ opacity: clamp(telemetry.cameraFlash / 0.18, 0, motionReduced ? 0.12 : 0.34) }}
        />
      )}

      {finalLapActive && (
        <div
          className="arcade-hud-panel pointer-events-none absolute left-1/2 top-[66px] z-20 hidden -translate-x-1/2 items-center gap-3 border border-[#ffd34f]/45 bg-[#10151d]/[0.82] px-4 py-2 text-white shadow-[0_14px_34px_rgba(0,0,0,0.3)] backdrop-blur-md sm:flex"
          data-testid="race-finish-sprint"
        >
          <span className="grid h-8 w-8 place-items-center border border-[#ffd34f]/70 bg-[#ffd34f]/16 text-[#ffd34f]">
            <Flag size={16} strokeWidth={2.8} />
          </span>
          <span className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-white/52">Final lap</span>
          <strong className="font-mono text-sm font-black uppercase leading-none text-[#ffd34f]">Finish sprint</strong>
        </div>
      )}

      <div className="objective-card race-objective-card" aria-label="Race objective">
        <div className="objective-card__eyebrow">Next Objective</div>
        <div className="objective-card__body">
          <span className="objective-card__icon">
            <Flag size={20} strokeWidth={2.8} />
          </span>
          <div>
            <p>
              Hold <strong>{ordinal(telemetry.place)}</strong>
            </p>
            <b>Lap {telemetry.lap}/{track.laps}</b>
          </div>
        </div>
      </div>

      <div className="currency-stack race-status-stack" aria-label="Race status">
        <div>
          <ChevronsRight size={17} />
          <strong>{telemetry.speed}</strong>
          <span>MPH</span>
        </div>
        <div>
          <ArrowUp size={17} />
          <strong>{heldItemLabel}</strong>
          <span>F</span>
        </div>
      </div>

      <button
        type="button"
        aria-label={audioMuted ? 'Unmute race audio' : 'Mute race audio'}
        aria-pressed={audioMuted}
        className="arcade-hud-panel pointer-events-auto absolute right-3 top-3 z-30 grid h-11 w-11 place-items-center border border-white/18 bg-[#10151d]/[0.82] text-[#ffd34f] shadow-[0_14px_34px_rgba(0,0,0,0.3)] backdrop-blur-md transition-colors hover:bg-[#ffd34f]/10 sm:right-5 sm:top-5"
        data-testid="race-audio-toggle"
        onClick={() => onAudioMutedChange?.(!audioMuted)}
        title={audioMuted ? 'Unmute race audio' : 'Mute race audio'}
      >
        {audioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <div
        className="arcade-hud-panel pointer-events-none absolute left-3 top-3 z-20 hidden w-[min(58vw,270px)] border border-white/14 bg-[#10151d]/[0.68] p-2.5 text-white shadow-[0_12px_28px_rgba(0,0,0,0.22)] backdrop-blur-sm sm:left-4 sm:top-4 sm:block sm:w-[292px]"
        data-testid="race-live-hud"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[8px] font-black uppercase leading-none tracking-[0.18em] text-[#ffd34f]">
              {track.discipline || 'Kart'} GP
            </div>
            <div className="mt-1 truncate font-mono text-sm font-black uppercase leading-none sm:text-base">
              {track.name}
            </div>
          </div>
          <div className="grid h-8 w-10 shrink-0 place-items-center border border-[#ffd34f]/55 bg-[#ffd34f]/12 font-mono text-xs font-black text-[#ffd34f]">
            {ordinal(telemetry.place)}
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2 font-mono text-[8px] uppercase tracking-[0.1em] text-white/54">
          <div>
            <div>Lap</div>
            <div className="mt-1 text-xs font-black text-white">{telemetry.lap}/{track.laps}</div>
          </div>
          <div>
            <div>Speed</div>
            <div className="mt-1 text-xs font-black text-white">{telemetry.speed}</div>
          </div>
          <div>
            <div>Time</div>
            <div className="mt-1 text-xs font-black text-white">{formatTime(telemetry.time)}</div>
          </div>
        </div>
        <div className="mt-3 grid gap-1.5">
          <div className="h-1.5 border border-white/16 bg-black/38">
            <div className="h-full bg-[#49d9ff]" style={{ width: `${driftPct}%` }} />
          </div>
          <div className="flex items-center justify-between font-mono text-[8px] font-black uppercase tracking-[0.14em] text-white/52">
            <span>Drift {telemetry.driftTier > 0 ? `Tier ${telemetry.driftTier}` : telemetry.driftActive ? 'charging' : 'ready'}</span>
            <span>{telemetry.vehicleMode}</span>
          </div>
          <div className="h-1.5 border border-white/16 bg-black/38">
            <div className="h-full bg-[#ffd34f]" style={{ width: `${boostPct}%` }} />
          </div>
        </div>
      </div>

      <div
        className="arcade-hud-panel pointer-events-auto absolute right-3 top-[72px] z-20 hidden min-w-[142px] border border-white/12 bg-[#10151d]/[0.52] p-2 text-white shadow-[0_8px_20px_rgba(0,0,0,0.18)] backdrop-blur-sm sm:right-4 sm:top-[72px] sm:block"
        data-testid="race-item-panel"
      >
        <div className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-white/52">Held item</div>
        <div className="mt-1 truncate font-mono text-sm font-black uppercase leading-none text-[#ffd34f]">
          {heldItemLabel}
        </div>
        <button
          type="button"
          onClick={() => onCommand('item')}
          disabled={!telemetry.heldBalloon}
          className={`mt-2 flex min-h-[32px] w-full items-center justify-center gap-2 rounded-md border px-2 py-1.5 font-mono text-[8px] font-black uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
            shieldActive
              ? 'border-[#49d9ff]/60 bg-[#49d9ff]/12 text-[#49d9ff]'
              : 'border-[#ffd34f]/40 text-[#ffd34f] hover:bg-[#ffd34f]/10'
          }`}
        >
          {shieldActive ? <Sparkles size={12} /> : <ArrowUp size={12} />}
          {shieldActive ? 'Shield active' : 'Use item'}
        </button>
      </div>

      <div
        className="arcade-hud-panel pointer-events-none absolute right-3 top-[176px] z-20 hidden min-w-[142px] border border-white/12 bg-[#10151d]/[0.48] p-2 text-white shadow-[0_8px_20px_rgba(0,0,0,0.16)] backdrop-blur-sm sm:right-4 sm:top-[176px] sm:block"
        data-testid="race-rival-pressure"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-white/52">Rival pressure</div>
            <div className="mt-1 font-mono text-sm font-black uppercase leading-none text-white">{pressureLabel}</div>
          </div>
          <div className="flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className={`h-2.5 w-5 border ${index < visibleRivals ? 'border-[#ff4f7b] bg-[#ff4f7b]' : index < visibleRivalsSeen ? 'border-[#ffd34f] bg-[#ffd34f]/45' : 'border-white/22 bg-white/8'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {!hideMinimap && (
      <div className="race-minimap" data-testid="race-minimap">
        <span className="race-minimap__north">N</span>
        {minimap ? (
          <svg className="race-minimap__svg" viewBox="0 0 100 100" aria-hidden="true">
            <path className="race-minimap__svg-route" d={minimap.route} />
            {minimap.branches.map((branch) => (
              <path
                key={branch.key}
                className="race-minimap__svg-branch"
                d={branch.d}
                style={{ stroke: branch.accent }}
              />
            ))}
          </svg>
        ) : (
          <span className="race-minimap__route" />
        )}
        <span className="race-minimap__arrow" />
      </div>
      )}

      <button
        type="button"
        className="arcade-go-button sm:hidden"
        data-testid="race-go-button"
        onPointerDown={onPress({ throttle: 1 })}
        onPointerUp={onRelease({ throttle: 0 })}
        onPointerCancel={onRelease({ throttle: 0 })}
        aria-label="Go"
      >
        <ChevronsRight size={43} strokeWidth={4} />
        <span>Go!</span>
      </button>

      <div className="pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom)+100px)] left-3 hidden gap-2">
        <button
          type="button"
          onClick={() => onCommand('reset')}
          className="arcade-hud-panel flex h-10 items-center gap-2 border border-white/18 bg-[#10151d]/[0.82] px-3 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-white backdrop-blur-md"
        >
          <RotateCcw size={13} />
          Reset
        </button>
        <button
          type="button"
          onClick={() => onCommand('item')}
          disabled={!telemetry.heldBalloon}
          className="arcade-hud-panel flex h-10 items-center gap-2 border border-white/18 bg-[#10151d]/[0.82] px-3 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-white backdrop-blur-md disabled:opacity-45"
        >
          <ArrowUp size={13} />
          Use Item
        </button>
      </div>
    </div>
  );
};
