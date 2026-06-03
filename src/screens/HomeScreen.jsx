import { useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Car,
  Check,
  ChevronRight,
  Dumbbell,
  FlaskConical,
  Gauge,
  Home,
  MapPin,
  Minus,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { Card } from '../components/primitives.jsx';
import { GAME_AVATARS, isWorkoutDayComplete, nextSuggestedDay } from '../game/gameProfile.js';
import { PROGRAM, LIFTS } from '../lib/program.js';
import { phaseForWeek, isDeloadWeek } from '../lib/utils.js';

const AVATAR_UI = {
  apex: {
    frame: 'border-bone/35 bg-bone/10 text-bone',
    glow: 'from-bone/35 via-vermillion/20 to-transparent',
  },
  forge: {
    frame: 'border-vermillion/35 bg-vermillion/10 text-vermillion',
    glow: 'from-vermillion/35 via-gold/20 to-transparent',
  },
  nova: {
    frame: 'border-sky-500/35 bg-sky-500/10 text-sky-300',
    glow: 'from-sky-500/35 via-gold/20 to-transparent',
  },
  pulse: {
    frame: 'border-pine/40 bg-pine/10 text-pine',
    glow: 'from-pine/35 via-teal-300/20 to-transparent',
  },
  rift: {
    frame: 'border-violet-400/35 bg-violet-500/10 text-violet-200',
    glow: 'from-violet-500/35 via-teal-300/20 to-transparent',
  },
  terra: {
    frame: 'border-amber-300/35 bg-amber-300/10 text-amber-200',
    glow: 'from-amber-300/35 via-pine/20 to-transparent',
  },
};

const AVATARS = GAME_AVATARS.map((avatar) => ({
  ...avatar,
  ...(AVATAR_UI[avatar.key] || AVATAR_UI.nova),
}));

const hasSetEntry = (set) =>
  String(set?.wt ?? '').trim() !== '' || String(set?.reps ?? '').trim() !== '';

const dayFromLogKey = (key) => Number(key.match(/d(\d+)$/)?.[1]);

const prescribedSetCount = (exercise) => Math.max(1, Number(exercise.sets) || 1);

const summarizeWorkoutProgress = (state) => {
  let loggedSets = 0;
  let completedExercises = 0;
  let jointWarnings = 0;

  Object.entries(state.logs || {}).forEach(([logKey, log]) => {
    const dayData = PROGRAM.find((day) => day.day === dayFromLogKey(logKey));
    (log.exercises || []).forEach((exerciseLog, index) => {
      const setCount = (exerciseLog.sets || []).filter(hasSetEntry).length;
      const prescribed = prescribedSetCount(dayData?.exercises?.[index] || {});
      loggedSets += setCount;
      if (setCount >= prescribed) completedExercises += 1;
      if (exerciseLog.joint === 'yellow') jointWarnings += 1;
      if (exerciseLog.joint === 'red') jointWarnings += 3;
    });
  });

  return { loggedSets, completedExercises, jointWarnings };
};

const countFoodDays = (foodLog = {}) =>
  Object.values(foodLog).filter((day) =>
    Object.values(day || {}).some((entries) => Array.isArray(entries) && entries.length > 0)
  ).length;

const countMetricWeeks = (metrics = []) =>
  metrics.filter((row) => row?.bw || row?.waist || row?.arm || row?.thigh).length;

const buildGameProfile = (state) => {
  const workout = summarizeWorkoutProgress(state);
  const foodDays = countFoodDays(state.food?.log);
  const metricWeeks = countMetricWeeks(state.metrics);
  const filledRMs = Object.values(state.oneRMs).filter((v) => v && !isNaN(v)).length;
  const totalXp =
    workout.loggedSets * 35 +
    workout.completedExercises * 90 +
    foodDays * 120 +
    metricWeeks * 160 +
    filledRMs * 40;
  const level = Math.max(1, Math.floor(totalXp / 500) + 1);
  const currentLevelXp = totalXp % 500;
  const avatar = AVATARS.find((item) => item.key === state.game?.avatar) || AVATARS[0];
  const jointHp = Math.max(0, 100 - workout.jointWarnings * 8);

  return {
    avatar,
    totalXp,
    level,
    currentLevelXp,
    nextLevelXp: 500,
    workout,
    foodDays,
    metricWeeks,
    filledRMs,
    jointHp,
  };
};

const ModeSwitch = ({ mode, onMode }) => (
  <div className="grid grid-cols-2 border border-bone/[0.07] bg-ink/60">
    {[
      { key: 'world', label: 'World', Icon: MapPin },
      { key: 'basic', label: 'Basic', Icon: Gauge },
    ].map((item) => {
      const Icon = item.Icon;
      const active = mode === item.key;
      return (
        <button
          key={item.key}
          onClick={() => onMode(item.key)}
          className={`flex items-center justify-center gap-2 px-3 py-3 text-[10px] font-mono uppercase tracking-[0.22em] transition-colors ${
            active ? 'bg-gold/[0.08] text-gold' : 'text-stone hover:text-bone'
          }`}
        >
          <Icon size={13} />
          {item.label}
        </button>
      );
    })}
  </div>
);

const StatCell = ({ label, value, tone = 'text-bone', suffix = '' }) => (
  <div className="border-r border-bone/[0.06] p-3 last:border-r-0">
    <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-stone">{label}</div>
    <div className={`mt-1 font-display text-3xl leading-none tabular-nums ${tone}`}>
      {value}
      {suffix && <span className="ml-1 font-mono text-[10px] text-stone">{suffix}</span>}
    </div>
  </div>
);

const AvatarPicker = ({ state, setState, game }) => (
  <div className="grid grid-cols-3 gap-2">
    {AVATARS.map((avatar) => {
      const active = game.avatar.key === avatar.key;
      return (
        <button
          key={avatar.key}
          onClick={() =>
            setState((s) => ({
              ...s,
              game: { ...(s.game || {}), avatar: avatar.key },
            }))
          }
          className={`min-w-0 border p-3 text-left transition-all ${
            active ? avatar.frame : 'border-bone/[0.07] bg-bone/[0.015] text-stone hover:text-bone'
          }`}
        >
          <div className="flex h-10 items-center justify-center">
            <div className={`relative h-8 w-8 border ${active ? 'border-current' : 'border-bone/[0.12]'}`}>
              <div className={`absolute inset-1 bg-gradient-to-br ${avatar.glow}`} />
              <Car size={16} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>
          <div className="mt-2 truncate text-center font-display text-base leading-none">{avatar.name}</div>
          <div className="mt-1 truncate text-center text-[9px] font-mono uppercase tracking-[0.16em]">
            {avatar.role}
          </div>
        </button>
      );
    })}
  </div>
);

const shade = (hex, amount) => {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (num & 255) + amount));
  return `rgb(${r}, ${g}, ${b})`;
};

const LowPolyCityCanvas = ({ avatarKey }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let raf = 0;

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return rect;
    };

    const drawPoly = (points, fill, stroke = 'rgba(243,236,224,0.08)') => {
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const draw = () => {
      const { width, height } = fit();
      const w = width;
      const h = height;
      frame += 1;

      const camera = { x: 0, y: 96, z: -190 };
      const pitch = -0.48;
      const cos = Math.cos(pitch);
      const sin = Math.sin(pitch);
      const focal = Math.min(w, h) * 0.86;
      const horizon = h * 0.52;

      const project = (x, y, z) => {
        const dx = x - camera.x;
        const dy = y - camera.y;
        const dz = z - camera.z;
        const cy = dy * cos - dz * sin;
        const cz = Math.max(20, dy * sin + dz * cos);
        return {
          x: w / 2 + (dx * focal) / cz,
          y: horizon - (cy * focal) / cz,
          scale: focal / cz,
        };
      };

      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.58);
      sky.addColorStop(0, '#3e6fa6');
      sky.addColorStop(0.45, '#7bb0c8');
      sky.addColorStop(1, '#f0b35b');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#244e40';
      ctx.fillRect(0, h * 0.42, w, h * 0.58);

      drawPoly(
        [
          project(-260, 0, 0),
          project(260, 0, 0),
          project(420, 0, 420),
          project(-420, 0, 420),
        ],
        '#2f7a53',
        'rgba(255,255,255,0.08)'
      );

      const drawRoadStrip = (path, widthPx, fill = '#4c4e58') => {
        for (let i = 0; i < path.length - 1; i += 1) {
          const a = path[i];
          const b = path[i + 1];
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          const len = Math.max(1, Math.hypot(dx, dz));
          const nx = (-dz / len) * widthPx;
          const nz = (dx / len) * widthPx;
          drawPoly(
            [
              project(a.x + nx, 0.5, a.z + nz),
              project(a.x - nx, 0.5, a.z - nz),
              project(b.x - nx, 0.5, b.z - nz),
              project(b.x + nx, 0.5, b.z + nz),
            ],
            fill,
            'rgba(255,255,255,0.16)'
          );
        }
      };

      const loop = Array.from({ length: 34 }, (_, i) => {
        const t = (Math.PI * 2 * i) / 33;
        return { x: Math.cos(t) * 118, z: 190 + Math.sin(t) * 88 };
      });
      drawRoadStrip(loop, 22, '#454850');
      drawRoadStrip(
        [
          { x: -168, z: 64 },
          { x: -72, z: 120 },
          { x: 4, z: 170 },
          { x: 84, z: 220 },
          { x: 172, z: 276 },
        ],
        19,
        '#555861'
      );
      drawRoadStrip(
        [
          { x: 38, z: 0 },
          { x: 6, z: 86 },
          { x: -12, z: 162 },
          { x: -42, z: 258 },
          { x: -86, z: 374 },
        ],
        18,
        '#51545f'
      );

      ctx.strokeStyle = 'rgba(244,214,92,0.88)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 12]);
      [
        [
          { x: -168, z: 64 },
          { x: 172, z: 276 },
        ],
        [
          { x: 38, z: 0 },
          { x: -86, z: 374 },
        ],
      ].forEach((line) => {
        const a = project(line[0].x, 2, line[0].z);
        const b = project(line[1].x, 2, line[1].z);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      const drawBox = ({ x, z, w: bw, d, h: bh, color }) => {
        const y = 0;
        const p = {
          f1: project(x - bw, y, z - d),
          f2: project(x + bw, y, z - d),
          f3: project(x + bw, y, z + d),
          f4: project(x - bw, y, z + d),
          t1: project(x - bw, y + bh, z - d),
          t2: project(x + bw, y + bh, z - d),
          t3: project(x + bw, y + bh, z + d),
          t4: project(x - bw, y + bh, z + d),
        };
        drawPoly([p.f1, p.f2, p.t2, p.t1], shade(color, -24));
        drawPoly([p.f2, p.f3, p.t3, p.t2], shade(color, -42));
        drawPoly([p.f3, p.f4, p.t4, p.t3], shade(color, -34));
        drawPoly([p.t1, p.t2, p.t3, p.t4], shade(color, 24), 'rgba(255,255,255,0.18)');
      };

      [
        { x: -130, z: 112, w: 24, d: 18, h: 54, color: '#d65842' },
        { x: 128, z: 112, w: 28, d: 20, h: 46, color: '#d8ad35' },
        { x: -122, z: 238, w: 26, d: 18, h: 38, color: '#4e94d1' },
        { x: 128, z: 242, w: 22, d: 18, h: 62, color: '#74b887' },
        { x: -118, z: 330, w: 24, d: 20, h: 44, color: '#83b978' },
        { x: 112, z: 330, w: 24, d: 18, h: 40, color: '#d0a13a' },
      ]
        .sort((a, b) => b.z - a.z)
        .forEach(drawBox);

      const kartColor =
        avatarKey === 'forge' ? '#d65842' : avatarKey === 'pulse' ? '#74b887' : '#5ca9df';
      const bob = Math.sin(frame / 18) * 1.4;
      const kartT = frame / 120;
      const kartX = Math.cos(kartT) * 84;
      const kartZ = 190 + Math.sin(kartT) * 62;
      const shadow = project(kartX, 1, kartZ + 6);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(shadow.x, shadow.y, Math.max(14, shadow.scale * 13), Math.max(5, shadow.scale * 5), 0, 0, Math.PI * 2);
      ctx.fill();
      drawBox({ x: kartX, z: kartZ, w: 16, d: 23, h: 10 + bob, color: kartColor });
      drawBox({ x: kartX, z: kartZ - 10, w: 10, d: 10, h: 22 + bob, color: shade(kartColor, 18) });
      [
        [kartX - 18, kartZ - 18],
        [kartX + 18, kartZ - 18],
        [kartX - 18, kartZ + 18],
        [kartX + 18, kartZ + 18],
      ].forEach(([x, z]) => {
        const wheel = project(x, 5, z);
        ctx.fillStyle = '#111216';
        ctx.beginPath();
        ctx.arc(wheel.x, wheel.y, Math.max(3, wheel.scale * 5), 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener('resize', fit);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
    };
  }, [avatarKey]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
};

const CityNode = ({ title, Icon, meta, onClick, className = '', tone = 'gold' }) => (
  <button
    onClick={onClick}
    className={`city-building group absolute z-20 w-[118px] border p-2.5 text-left shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition-all hover:-translate-y-0.5 sm:w-[138px] ${className} ${
      tone === 'sky'
        ? 'border-sky-500/30 bg-sky-500/[0.08] hover:border-sky-400/55'
        : tone === 'pine'
        ? 'border-pine/35 bg-pine/[0.08] hover:border-pine/60'
        : tone === 'red'
        ? 'border-vermillion/35 bg-vermillion/[0.08] hover:border-vermillion/60'
        : 'border-gold/30 bg-gold/[0.07] hover:border-gold/60'
    }`}
  >
    <div className="flex items-center gap-2">
      <div className="grid h-8 w-8 shrink-0 place-items-center border border-current text-current">
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <div className="font-display text-sm leading-none text-bone sm:text-base">{title}</div>
        <div className="mt-1 text-[9px] font-mono uppercase tracking-[0.18em] text-stone">{meta}</div>
      </div>
    </div>
    <div className="mt-2 flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.18em] text-current opacity-80">
      Drive in <ChevronRight size={11} />
    </div>
  </button>
);

const CityMap = ({ state, onNav, game }) => {
  const suggestedDay = nextSuggestedDay(state);

  return (
    <section className="city-world relative min-h-[660px] overflow-hidden border border-bone/[0.07] bg-charcoal">
      <LowPolyCityCanvas avatarKey={game.avatar.key} />

      <div className="absolute left-5 top-5 z-30 max-w-[230px]">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-gold">
          <Sparkles size={12} />
          Comeback City
        </div>
        <h1 className="mt-2 font-display text-4xl leading-none tracking-tight text-bone">
          Open road training
        </h1>
      </div>

      <div className="absolute right-5 top-5 z-30 border border-gold/25 bg-ink/80 px-3 py-2 text-right">
        <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-stone">Level</div>
        <div className="font-display text-4xl leading-none text-gold tabular-nums">{game.level}</div>
      </div>

      <CityNode
        title="Gym District"
        Icon={Dumbbell}
        meta={`Day ${suggestedDay}`}
        onClick={() => onNav(`day-${suggestedDay}`)}
        tone="red"
        className="left-4 top-[31%]"
      />
      <CityNode
        title="Food Court"
        Icon={Utensils}
        meta={`${game.foodDays} food days`}
        onClick={() => onNav('food')}
        tone="gold"
        className="right-4 top-[31%]"
      />
      <CityNode
        title="Home Base"
        Icon={Home}
        meta={`${game.metricWeeks} check-ins`}
        onClick={() => onNav('metrics')}
        tone="sky"
        className="left-4 top-[54%]"
      />
      <CityNode
        title="Lab"
        Icon={FlaskConical}
        meta={`${game.filledRMs}/${LIFTS.length} lifts`}
        onClick={() => onNav('calibration')}
        tone="pine"
        className="right-4 top-[54%]"
      />
      <CityNode
        title="Clinic"
        Icon={Shield}
        meta={`${game.jointHp} HP`}
        onClick={() => onNav('joint')}
        tone="pine"
        className="left-4 bottom-5"
      />
      <CityNode
        title="Garage"
        Icon={Settings}
        meta="systems"
        onClick={() => onNav('settings')}
        tone="gold"
        className="right-4 bottom-5"
      />
    </section>
  );
};

const CourseList = ({ state, onNav }) => (
  <section>
    <div className="mb-3 flex items-baseline justify-between">
      <span className="font-display italic text-bone text-xl">Gym Courses</span>
      <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone">
        Week {state.currentWeek}
      </span>
    </div>
    <div className="grid gap-2">
      {PROGRAM.map((day) => {
        const logged = isWorkoutDayComplete(day, state.logs?.[`w${state.currentWeek}d${day.day}`]);
        const isHeavy = day.name.includes('Heavy');
        return (
          <button
            key={day.day}
            onClick={() => onNav(`day-${day.day}`)}
            className="grid grid-cols-[42px_1fr_auto] items-center gap-3 border border-bone/[0.06] bg-bone/[0.015] px-3 py-3 text-left transition-colors hover:border-gold/35 hover:bg-gold/[0.025]"
          >
            <div className={`grid h-9 w-9 place-items-center border ${logged ? 'border-gold text-gold' : 'border-bone/[0.1] text-stone'}`}>
              {logged ? <Check size={13} /> : day.day}
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-lg leading-tight text-bone">{day.name}</div>
              <div className={`mt-0.5 text-[9px] font-mono uppercase tracking-[0.2em] ${isHeavy ? 'text-vermillion' : 'text-pine'}`}>
                {isHeavy ? 'Boss course' : 'Recovery route'} · {day.exercises.length} stages
              </div>
            </div>
            <ChevronRight size={14} className="text-stone" />
          </button>
        );
      })}
    </div>
  </section>
);

const WorldHome = ({ state, setState, onNav, phase, deload, game }) => {
  const xpPct = Math.round((game.currentLevelXp / game.nextLevelXp) * 100);

  return (
    <div className="space-y-6">
      <CityMap state={state} onNav={onNav} game={game} />

      <section className="grid grid-cols-3 border border-bone/[0.06] bg-ink/40">
        <StatCell label="XP" value={game.currentLevelXp} suffix="/500" tone="text-gold" />
        <StatCell label="Combo" value={game.workout.completedExercises} suffix="stages" />
        <StatCell
          label="Shield"
          value={game.jointHp}
          tone={game.jointHp < 70 ? 'text-vermillion' : game.jointHp < 90 ? 'text-gold' : 'text-pine'}
        />
      </section>

      <section className="border border-bone/[0.07] bg-charcoal/55 p-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone">Driver</div>
            <div className="mt-1 font-display text-2xl leading-none text-bone">{game.avatar.name}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone">Phase</div>
            <div className="mt-1 font-mono text-xs font-bold tracking-[0.08em] text-gold">
              {phase}{deload ? ' · DELOAD' : ''}
            </div>
          </div>
        </div>
        <div className="mb-4 h-2 border border-bone/[0.08] bg-bone/[0.025]">
          <div className="h-full bg-gold transition-all duration-500" style={{ width: `${xpPct}%` }} />
        </div>
        <AvatarPicker state={state} setState={setState} game={game} />
      </section>

      <CourseList state={state} onNav={onNav} />
    </div>
  );
};

const BasicHome = ({
  state,
  setState,
  onNav,
  readOnly,
  phase,
  deload,
  filledRMs,
  calibrated,
  totalSessions,
  weeksLogged,
  progressPct,
  toGo,
}) => (
  <div className="space-y-8">
    <section className="border-b border-bone/[0.06] pb-6">
      <div className="font-display italic text-gold text-base mb-3">
        The Comeback · 181 → 238
      </div>
      <div className="font-display flex items-baseline gap-3 flex-wrap tabular-nums leading-none">
        <span className="text-6xl md:text-7xl text-bone">
          {state.settings.currentBW}
        </span>
        <span className="text-gold italic text-4xl md:text-5xl">→</span>
        <span className="text-6xl md:text-7xl text-gold">
          {state.settings.targetBW}
        </span>
        <span className="text-stone text-sm font-mono tracking-[0.15em] self-end mb-1">LB</span>
      </div>
      <p className="mt-4 text-sm text-stone leading-relaxed max-w-md">
        {toGo > 0 ? (
          <>
            <span className="text-bone font-medium tabular-nums">{toGo}</span> pounds to go —{' '}
            <span className="text-bone italic font-display text-base">arms</span> and{' '}
            <span className="text-bone italic font-display text-base">hamstrings</span> specialization.
          </>
        ) : toGo < 0 ? (
          <>
            <span className="text-bone font-medium tabular-nums">{Math.abs(toGo)}</span> pounds past target — recomp mode.
          </>
        ) : (
          <>At target weight — recomp phase.</>
        )}
      </p>

      <div className="mt-6 relative h-px bg-bone/[0.06]">
        <div
          className="absolute inset-y-0 left-0 bg-gold transition-all duration-500"
          style={{ width: `${progressPct}%`, height: '1px' }}
        />
      </div>
      <div className="mt-2 flex justify-between">
        <span className="text-[10px] font-mono tracking-[0.22em] text-stone">181 · START</span>
        <span className="text-[10px] font-mono tracking-[0.22em] text-gold">238 · TARGET</span>
      </div>
    </section>

    <section className="grid grid-cols-3 border border-bone/[0.06]">
      <div className="p-4 border-r border-bone/[0.06]">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone mb-3">Week</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setState((s) => ({ ...s, currentWeek: Math.max(1, s.currentWeek - 1) }))}
            className="w-5 h-5 border border-bone/10 hover:border-gold/50 hover:text-gold flex items-center justify-center text-stone active:scale-95 transition-all"
            aria-label="Previous week"
          >
            <Minus size={10} />
          </button>
          <div className="flex-1 text-center font-display text-3xl tabular-nums text-bone leading-none">
            {state.currentWeek}
          </div>
          <button
            onClick={() => setState((s) => ({ ...s, currentWeek: s.currentWeek + 1 }))}
            className="w-5 h-5 border border-bone/10 hover:border-gold/50 hover:text-gold flex items-center justify-center text-stone active:scale-95 transition-all"
            aria-label="Next week"
          >
            <Plus size={10} />
          </button>
        </div>
      </div>
      <div className="p-4 border-r border-bone/[0.06]">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone mb-3">Phase</div>
        <div
          className={`font-mono text-[13px] font-bold tracking-[0.08em] ${
            phase === 'CALIBRATION'
              ? 'text-gold'
              : phase === 'GRIND'
              ? 'text-vermillion'
              : 'text-pine'
          }`}
        >
          {phase}
        </div>
      </div>
      <div className="p-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone mb-3">Deload</div>
        <div className={`font-mono text-[13px] font-bold tracking-[0.08em] ${deload ? 'text-gold' : 'text-stone/60'}`}>
          {deload ? 'YES · −20%' : 'No'}
        </div>
      </div>
    </section>

    {!readOnly && !calibrated && (
      <Card className="p-5 border-gold/30">
        <div className="flex gap-4">
          <div className="shrink-0 w-9 h-9 border border-gold/50 flex items-center justify-center text-gold">
            <AlertTriangle size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl text-bone leading-none mb-1 italic">Read this first</div>
            <p className="text-sm text-stone leading-relaxed mt-2">
              You've filled{' '}
              <span className="font-mono text-bone tabular-nums">{filledRMs}</span> of{' '}
              <span className="font-mono text-bone tabular-nums">{LIFTS.length}</span> 1RMs.
              Target weights show <span className="font-mono text-gold italic">calibrate</span> until Settings are filled.
              Run weeks 1–2 calibration first.
            </p>
            <button
              onClick={() => onNav('calibration')}
              className="mt-3 text-[11px] font-mono uppercase tracking-[0.22em] text-gold hover:text-gold/80 inline-flex items-center gap-1"
            >
              Go to calibration <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </Card>
    )}

    <section>
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-display italic text-bone text-xl">Today</span>
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone">
          Week {state.currentWeek} · {PROGRAM.length} days
        </span>
      </div>
      <div className="border-y border-bone/[0.06]">
        {PROGRAM.map((d) => {
          const logged = isWorkoutDayComplete(d, state.logs?.[`w${state.currentWeek}d${d.day}`]);
          const isHeavy = d.name.includes('Heavy');
          return (
            <button
              key={d.day}
              onClick={() => onNav(`day-${d.day}`)}
              className="w-full text-left grid grid-cols-[52px_1fr_auto] items-center gap-4 px-3 py-4 border-b border-bone/[0.04] last:border-0 hover:bg-gold/[0.025] active:bg-gold/[0.04] transition-colors"
            >
              <div>
                <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-stone mb-0.5">Day</div>
                <div className="font-display italic text-3xl text-gold leading-none tabular-nums">
                  {d.day}
                </div>
              </div>
              <div className="min-w-0">
                <div className="font-display text-lg text-bone leading-tight tracking-tight">
                  {d.name}
                </div>
                <div
                  className={`mt-0.5 text-[10px] font-mono uppercase tracking-[0.22em] ${
                    isHeavy ? 'text-vermillion' : 'text-pine'
                  }`}
                >
                  {isHeavy ? 'Heavy' : 'Recovery'} · {d.exercises.length} ex
                </div>
              </div>
              <div className="shrink-0">
                {logged ? (
                  <div className="w-6 h-6 border border-gold flex items-center justify-center text-gold font-display italic text-sm">
                    <Check size={12} />
                  </div>
                ) : (
                  <span className="text-stone/40 font-mono text-sm">·</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>

    <section>
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-display italic text-bone text-xl">Ledger</span>
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone">
          Since week one
        </span>
      </div>
      <div className="grid grid-cols-3 border border-bone/[0.06]">
        <div className="p-4 border-r border-bone/[0.06]">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone mb-3">Sessions</div>
          <div className="font-display text-3xl text-bone tabular-nums leading-none">{totalSessions}</div>
          <div className="mt-2 text-[10px] font-mono text-stone">total</div>
        </div>
        <div className="p-4 border-r border-bone/[0.06]">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone mb-3">Weeks</div>
          <div className="font-display text-3xl text-bone tabular-nums leading-none">{weeksLogged}</div>
          <div className="mt-2 text-[10px] font-mono text-stone">logged</div>
        </div>
        <div className="p-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone mb-3">1RMs set</div>
          <div className="font-display text-3xl text-gold tabular-nums leading-none">{filledRMs}</div>
          <div className="mt-2 text-[10px] font-mono text-stone">of {LIFTS.length}</div>
        </div>
      </div>
    </section>
  </div>
);

export const HomeScreen = ({ state, setState, onNav, readOnly = false }) => {
  const phase = phaseForWeek(state.currentWeek);
  const deload = isDeloadWeek(state.currentWeek);
  const filledRMs = Object.values(state.oneRMs).filter((v) => v && !isNaN(v)).length;
  const calibrated = filledRMs >= 8;
  const game = buildGameProfile(state);
  const mode = state.game?.homeMode || 'world';

  const totalSessions = Object.keys(state.logs).length;
  const weeksLogged = state.metrics.filter((m) => m.bw).length;
  const progressPct = Math.min(
    100,
    Math.max(
      0,
      ((state.settings.currentBW - 181) / (state.settings.targetBW - 181)) * 100
    )
  );
  const toGo = state.settings.targetBW - state.settings.currentBW;

  const setMode = (homeMode) =>
    setState((s) => ({ ...s, game: { ...(s.game || {}), homeMode } }));

  return (
    <div className="space-y-5">
      {!readOnly && <ModeSwitch mode={mode} onMode={setMode} />}
      {mode === 'basic' ? (
        <BasicHome
          state={state}
          setState={setState}
          onNav={onNav}
          readOnly={readOnly}
          phase={phase}
          deload={deload}
          filledRMs={filledRMs}
          calibrated={calibrated}
          totalSessions={totalSessions}
          weeksLogged={weeksLogged}
          progressPct={progressPct}
          toGo={toGo}
        />
      ) : (
        <WorldHome
          state={state}
          setState={setState}
          onNav={onNav}
          phase={phase}
          deload={deload}
          game={game}
        />
      )}
    </div>
  );
};
