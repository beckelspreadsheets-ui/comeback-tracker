import {
  AlertTriangle,
  Car,
  Check,
  ChevronRight,
  Home,
  Minus,
  Plus,
  Settings,
} from 'lucide-react';
import { Card } from '../components/primitives.jsx';
import { isWorkoutDayComplete, nextSuggestedDay } from '../lib/workoutStatus.js';
import { PROGRAM, LIFTS } from '../lib/program.js';
import { phaseForWeek, isDeloadWeek } from '../lib/utils.js';

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

  // The world-hub home retired with the app split (2026-07-13) — the kart
  // game is its own app now; this screen is the fitness dashboard, period.
  return (
    <div className="space-y-5">
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
    </div>
  );
};
