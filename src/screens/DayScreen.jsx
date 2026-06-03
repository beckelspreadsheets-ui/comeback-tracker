import {
  AlertTriangle,
  Check,
  ChevronRight,
  Flame,
  Map,
  Plus,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  Zap,
} from 'lucide-react';
import { Card, Pill } from '../components/primitives.jsx';
import { RestTimerChips } from '../components/RestTimer.jsx';
import { PROGRAM } from '../lib/program.js';
import { calcTargetWeight, isDeloadWeek, round5 } from '../lib/utils.js';

const GAME_RANKS = [
  { min: 100, label: 'Victory', Icon: Trophy },
  { min: 75, label: 'Boss', Icon: Shield },
  { min: 50, label: 'Combo', Icon: Flame },
  { min: 25, label: 'Quest', Icon: Swords },
  { min: 0, label: 'Ready', Icon: Zap },
];

const hasSetEntry = (set) =>
  String(set?.wt ?? '').trim() !== '' || String(set?.reps ?? '').trim() !== '';

const prescribedSetCount = (exercise) => Math.max(1, Number(exercise.sets) || 1);

const makeExerciseLog = (exercise) => ({
  sets: Array.from({ length: prescribedSetCount(exercise) }, () => ({ wt: '', reps: '' })),
  note: '',
  joint: 'green',
});

const fillExerciseSets = (exercise, exerciseLog) => {
  const base = makeExerciseLog(exercise);
  const sets = Array.isArray(exerciseLog?.sets) ? exerciseLog.sets : [];
  const missingCount = Math.max(0, prescribedSetCount(exercise) - sets.length);

  return {
    ...base,
    ...(exerciseLog || {}),
    sets: [
      ...sets,
      ...Array.from({ length: missingCount }, () => ({ wt: '', reps: '' })),
    ],
  };
};

const buildDayLog = (dayData, savedLog) => ({
  ...(savedLog || {}),
  exercises: dayData.exercises.map((exercise, index) =>
    fillExerciseSets(exercise, savedLog?.exercises?.[index])
  ),
});

const exerciseProgress = (exercise, exerciseLog) => {
  const prescribed = prescribedSetCount(exercise);
  const loggedSets = (exerciseLog?.sets || []).filter(hasSetEntry).length;
  const clearedSets = Math.min(loggedSets, prescribed);

  return {
    prescribed,
    clearedSets,
    percent: Math.round((clearedSets / prescribed) * 100),
    bonusSets: Math.max(0, loggedSets - prescribed),
    complete: clearedSets >= prescribed,
  };
};

const buildGameStats = (dayData, log) => {
  const exercises = dayData.exercises.map((exercise, index) =>
    exerciseProgress(exercise, log.exercises[index])
  );
  const prescribedSets = exercises.reduce((sum, item) => sum + item.prescribed, 0);
  const clearedSets = exercises.reduce((sum, item) => sum + item.clearedSets, 0);
  const bonusSets = exercises.reduce((sum, item) => sum + item.bonusSets, 0);
  const clearedExercises = exercises.filter((item) => item.complete).length;
  const progressPct = prescribedSets > 0 ? Math.round((clearedSets / prescribedSets) * 100) : 0;
  const nextExerciseIdx = exercises.findIndex((item) => !item.complete);
  const activeIndex = nextExerciseIdx === -1 ? dayData.exercises.length - 1 : nextExerciseIdx;
  const activeProgress = exercises[activeIndex] || exercises[0];
  const jointFlags = (log.exercises || []).reduce(
    (flags, exerciseLog) => {
      if (exerciseLog?.joint === 'red') return { ...flags, red: flags.red + 1 };
      if (exerciseLog?.joint === 'yellow') return { ...flags, yellow: flags.yellow + 1 };
      return flags;
    },
    { yellow: 0, red: 0 }
  );
  const jointHp = Math.max(0, 100 - jointFlags.yellow * 12 - jointFlags.red * 30);
  const rank = GAME_RANKS.find((item) => progressPct >= item.min) || GAME_RANKS[GAME_RANKS.length - 1];
  const combo = nextExerciseIdx === -1 ? exercises.length : nextExerciseIdx;

  return {
    exercises,
    prescribedSets,
    clearedSets,
    bonusSets,
    clearedExercises,
    progressPct,
    nextExerciseIdx: activeIndex,
    activeProgress,
    activeHp: activeProgress ? Math.max(0, 100 - activeProgress.percent) : 100,
    combo,
    jointHp,
    xp: clearedSets * 35 + clearedExercises * 90 + bonusSets * 50,
    rank,
  };
};

const scrollToExercise = (index) => {
  document.getElementById(`exercise-${index}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
};

const SetTrail = ({ progress }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: progress.prescribed }).map((_, index) => (
      <span
        key={index}
        className={`h-1.5 flex-1 min-w-[18px] border ${
          index < progress.clearedSets
            ? 'border-gold bg-gold shadow-[0_0_12px_rgba(212,175,55,0.22)]'
            : 'border-bone/[0.09] bg-bone/[0.018]'
        }`}
      />
    ))}
    {progress.bonusSets > 0 && (
      <span className="ml-1 text-[9px] font-mono text-gold tabular-nums">+{progress.bonusSets}</span>
    )}
  </div>
);

const GameHud = ({ dayData, gameStats, readOnly }) => {
  const RankIcon = gameStats.rank.Icon;
  const avatarLeft = `clamp(0px, calc(${gameStats.progressPct}% - 12px), calc(100% - 24px))`;

  return (
    <section className="relative overflow-hidden border border-bone/[0.07] bg-charcoal/45 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
      <div className="quest-grid absolute inset-0 opacity-35" />
      <div className="quest-spark absolute right-5 top-5 h-12 w-12 border border-gold/20" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-gold">
              <Map size={12} />
              Run
            </div>
            <h2 className="mt-1 font-display text-3xl leading-none tracking-tight text-bone">
              Comeback Quest
            </h2>
          </div>
          <div className="shrink-0 border border-gold/25 bg-gold/[0.045] px-3 py-2 text-gold">
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em]">
              <RankIcon size={12} />
              {gameStats.rank.label}
            </div>
          </div>
        </div>

        <div className="mt-4 border border-bone/[0.07] bg-ink/40 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-stone">
                Stage {gameStats.nextExerciseIdx + 1}
              </div>
              <div className="mt-1 truncate font-display text-lg leading-none text-bone">
                {dayData.exercises[gameStats.nextExerciseIdx]?.name}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-stone">Boss HP</div>
              <div
                className={`mt-1 font-display text-2xl leading-none tabular-nums ${
                  gameStats.activeHp <= 0
                    ? 'text-gold'
                    : gameStats.activeHp <= 35
                    ? 'text-vermillion'
                    : 'text-bone'
                }`}
              >
                {gameStats.activeHp}
              </div>
            </div>
          </div>
          <div className="mt-3 h-3 border border-bone/[0.08] bg-vermillion/[0.12]">
            <div
              className="h-full bg-gold transition-all duration-500"
              style={{ width: `${gameStats.activeProgress?.percent || 0}%` }}
            />
          </div>
          <div className="mt-2">
            <SetTrail progress={gameStats.activeProgress || { prescribed: 1, clearedSets: 0, bonusSets: 0 }} />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 border border-bone/[0.06] bg-ink/35">
          <div className="p-3 border-r border-bone/[0.06]">
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-stone">XP</div>
            <div className="mt-1 font-display text-3xl leading-none text-gold tabular-nums">
              {gameStats.xp}
            </div>
          </div>
          <div className="p-3 border-r border-bone/[0.06]">
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-stone">Combo</div>
            <div className="mt-1 font-display text-3xl leading-none text-bone tabular-nums">
              {gameStats.combo}
              <span className="ml-1 font-mono text-[10px] text-stone">x</span>
            </div>
          </div>
          <div className="p-3">
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-stone">Joint HP</div>
            <div
              className={`mt-1 font-display text-3xl leading-none tabular-nums ${
                gameStats.jointHp < 70 ? 'text-vermillion' : gameStats.jointHp < 90 ? 'text-gold' : 'text-pine'
              }`}
            >
              {gameStats.jointHp}
            </div>
          </div>
        </div>

        <div className="relative mt-5 h-10">
          <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-bone/[0.09]" />
          <div
            className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-gold transition-all duration-500"
            style={{ width: `${gameStats.progressPct}%` }}
          />
          <div
            className="quest-avatar absolute top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center border border-gold bg-ink text-gold transition-all duration-500"
            style={{ left: avatarLeft }}
          >
            <Swords size={12} />
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {dayData.exercises.map((exercise, index) => {
            const progress = gameStats.exercises[index];
            const active = index === gameStats.nextExerciseIdx && !progress.complete;
            return (
              <button
                key={exercise.name}
                onClick={() => scrollToExercise(index)}
                disabled={readOnly}
                title={exercise.name}
                className={`grid h-12 w-12 shrink-0 place-items-center border text-sm font-display italic tabular-nums transition-all active:scale-95 ${
                  progress.complete
                    ? 'border-gold bg-gold/[0.08] text-gold'
                    : active
                    ? 'border-pine/70 bg-pine/[0.08] text-pine'
                    : 'border-bone/[0.08] bg-ink/25 text-stone'
                } ${readOnly ? 'cursor-default' : 'hover:border-gold/45 hover:text-gold'}`}
              >
                {progress.complete ? <Check size={14} /> : index + 1}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const DayScreen = ({ state, setState, day, onBack, timer, readOnly = false }) => {
  const dayData = PROGRAM.find((d) => d.day === day);
  if (!dayData) return null;

  const logKey = `w${state.currentWeek}d${day}`;
  const log = buildDayLog(dayData, state.logs[logKey]);

  const updateLog = (newLog) => {
    if (readOnly) return;
    setState((s) => ({ ...s, logs: { ...s.logs, [logKey]: newLog } }));
  };

  const updateSet = (exIdx, setIdx, key, val) => {
    const newLog = {
      ...log,
      exercises: log.exercises.map((e, i) =>
        i === exIdx
          ? { ...e, sets: e.sets.map((st, j) => (j === setIdx ? { ...st, [key]: val } : st)) }
          : e
      ),
    };
    updateLog(newLog);
  };

  const addSet = (exIdx) => {
    const newLog = {
      ...log,
      exercises: log.exercises.map((e, i) =>
        i === exIdx ? { ...e, sets: [...e.sets, { wt: '', reps: '' }] } : e
      ),
    };
    updateLog(newLog);
  };

  const removeSet = (exIdx, setIdx) => {
    const newLog = {
      ...log,
      exercises: log.exercises.map((e, i) =>
        i === exIdx ? { ...e, sets: e.sets.filter((_, j) => j !== setIdx) } : e
      ),
    };
    updateLog(newLog);
  };

  const updateNote = (exIdx, key, val) => {
    const newLog = {
      ...log,
      exercises: log.exercises.map((e, i) => (i === exIdx ? { ...e, [key]: val } : e)),
    };
    updateLog(newLog);
  };

  const deload = isDeloadWeek(state.currentWeek);
  const gameStats = buildGameStats(dayData, log);

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone hover:text-bone flex items-center gap-1"
      >
        <ChevronRight size={14} className="rotate-180" /> Back
      </button>

      {/* Session masthead */}
      <section className="border-b border-bone/[0.06] pb-4">
        <div className="font-display italic text-gold text-base mb-2">
          Week {state.currentWeek} · Day {day}
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight text-bone leading-none">
          {dayData.name}
        </h1>
        {deload && (
          <div className="mt-4 flex items-center justify-between border border-gold/40 px-3 py-2 text-gold">
            <div className="flex items-center gap-2 font-display italic text-sm">
              <AlertTriangle size={12} />
              Deload week — ease the vessel before the glaze
            </div>
            <span className="font-mono text-[10px] tracking-[0.22em]">−20%</span>
          </div>
        )}
      </section>

      <GameHud dayData={dayData} gameStats={gameStats} readOnly={readOnly} />

      <div className="space-y-4">
        {dayData.exercises.map((ex, exIdx) => {
          const exLog = log.exercises[exIdx] || fillExerciseSets(ex);
          const target = calcTargetWeight(ex, state.oneRMs);
          const displayTarget = deload && typeof target === 'number' ? round5(target * 0.8) : target;
          const progress = gameStats.exercises[exIdx];
          const active = exIdx === gameStats.nextExerciseIdx && !progress.complete;

          return (
            <Card
              key={exIdx}
              id={`exercise-${exIdx}`}
              className={`scroll-mt-24 p-4 transition-colors ${
                progress.complete
                  ? 'border-gold/25 bg-gold/[0.025]'
                  : active
                  ? 'border-pine/25 bg-pine/[0.025]'
                  : ''
              }`}
            >
              {/* Header — type pill, prescription, name, target */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Pill type={ex.type} />
                    <span className="text-[10px] font-mono text-stone tracking-[0.05em]">
                      {ex.sets}×{ex.reps}
                      {ex.rir && ` @ RIR ${ex.rir}`}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.2em] ${
                        progress.complete
                          ? 'border-gold/35 text-gold'
                          : active
                          ? 'border-pine/35 text-pine'
                          : 'border-bone/[0.08] text-stone'
                      }`}
                    >
                      {progress.complete ? (
                        <>
                          <Check size={10} /> Clear
                        </>
                      ) : active ? (
                        <>
                          <Sparkles size={10} /> Active
                        </>
                      ) : (
                        `${progress.clearedSets}/${progress.prescribed}`
                      )}
                    </span>
                  </div>
                  <div className="font-display text-xl text-bone leading-tight tracking-tight">{ex.name}</div>
                  <div className="mt-3 max-w-[240px]">
                    <SetTrail progress={progress} />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-2 flex-1 border border-bone/[0.08] bg-vermillion/[0.12]">
                      <div
                        className="h-full bg-gold transition-all duration-500"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                    <span
                      className={`w-12 text-right text-[10px] font-mono tabular-nums ${
                        progress.complete ? 'text-gold' : active ? 'text-pine' : 'text-stone'
                      }`}
                    >
                      {Math.max(0, 100 - progress.percent)} HP
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 border-l border-bone/[0.06] pl-4">
                  <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-stone mb-1">
                    Target
                  </div>
                  <div
                    className={`font-display tabular-nums leading-none ${
                      displayTarget === 'calibrate'
                        ? 'text-gold italic text-lg'
                        : 'text-bone text-3xl'
                    }`}
                  >
                    {displayTarget}
                    {typeof displayTarget === 'number' && (
                      <span className="ml-1 font-mono text-[10px] text-stone tracking-[0.1em]">LB</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sets — italic indices, hairline rows */}
              <div>
                {exLog.sets.map((st, setIdx) => {
                  const hit = hasSetEntry(st);
                  return (
                    <div
                      key={setIdx}
                      className={`grid grid-cols-[28px_1fr_16px_1fr_28px] items-center gap-3 py-2 border-b border-bone/[0.04] last:border-0 transition-colors ${
                        hit ? 'quest-hit bg-gold/[0.018]' : ''
                      }`}
                    >
                      <div
                        className={`flex h-7 w-7 items-center justify-center border font-display italic text-lg tabular-nums ${
                          hit ? 'border-gold/45 text-gold' : 'border-transparent text-stone'
                        }`}
                      >
                        {hit ? <Zap size={12} /> : setIdx + 1}
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={st.wt}
                        disabled={readOnly}
                        onChange={(e) => updateSet(exIdx, setIdx, 'wt', e.target.value)}
                        placeholder="wt"
                        className="w-full bg-transparent border-0 border-b border-bone/[0.08] focus:border-gold px-1 py-1.5 text-bone text-base font-mono tabular-nums focus:outline-none placeholder:text-bone/20 placeholder:tracking-[0.1em] transition-colors disabled:text-stone disabled:opacity-80"
                      />
                      <span className="text-stone font-display italic text-base text-center">×</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={st.reps}
                        disabled={readOnly}
                        onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                        placeholder="reps"
                        className="w-full bg-transparent border-0 border-b border-bone/[0.08] focus:border-gold px-1 py-1.5 text-bone text-base font-mono tabular-nums focus:outline-none placeholder:text-bone/20 placeholder:tracking-[0.1em] transition-colors disabled:text-stone disabled:opacity-80"
                      />
                      {!readOnly && exLog.sets.length > 1 ? (
                        <button
                          onClick={() => removeSet(exIdx, setIdx)}
                          className="w-6 h-6 border border-transparent hover:border-vermillion/40 hover:text-vermillion text-stone/40 flex items-center justify-center active:scale-95 transition-all"
                          aria-label="Remove set"
                        >
                          <Trash2 size={11} />
                        </button>
                      ) : (
                        <span className="text-right text-[9px] font-mono text-gold/70 tabular-nums">
                          {hit ? '+35' : ''}
                        </span>
                      )}
                    </div>
                  );
                })}
                {!readOnly && (
                  <button
                    onClick={() => addSet(exIdx)}
                    className="w-full mt-2 py-2 border border-dashed border-bone/[0.08] hover:border-gold/40 hover:text-gold text-[10px] font-mono uppercase tracking-[0.22em] text-stone flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
                  >
                    <Plus size={10} /> Set
                  </button>
                )}
              </div>

              {/* Rest chips */}
              {!readOnly && <RestTimerChips onStart={timer.start} />}

              {progress.complete && (
                <div className="mt-3 flex items-center justify-between border border-gold/25 bg-gold/[0.045] px-3 py-2 text-gold">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em]">
                    <Trophy size={12} />
                    Stage clear
                  </div>
                  <span className="text-[10px] font-mono tabular-nums">
                    +{progress.clearedSets * 35 + 90 + progress.bonusSets * 50} XP
                  </span>
                </div>
              )}

              {/* Joint traffic light */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-stone mr-1">
                  Joint
                </span>
                {[
                  { k: 'green', c: 'pine' },
                  { k: 'yellow', c: 'gold' },
                  { k: 'red', c: 'vermillion' },
                ].map((j) => {
                  const isActive = exLog.joint === j.k;
                  const activeClasses = {
                    pine: 'border-pine text-pine',
                    gold: 'border-gold text-gold',
                    vermillion: 'border-vermillion text-vermillion',
                  };
                  return (
                    <button
                      key={j.k}
                      disabled={readOnly}
                      onClick={() => updateNote(exIdx, 'joint', j.k)}
                      className={`w-7 h-7 flex items-center justify-center text-sm transition-all font-display italic ${
                        isActive
                          ? `border ${activeClasses[j.c]}`
                          : 'border border-bone/[0.08] text-stone/30 hover:text-bone/60'
                      }`}
                    >
                      ·
                    </button>
                  );
                })}
              </div>

              {/* Note */}
              <input
                value={exLog.note}
                disabled={readOnly}
                onChange={(e) => updateNote(exIdx, 'note', e.target.value)}
                placeholder="Notes — form cues, twinges, PRs…"
                className="w-full mt-3 bg-ink/40 border border-bone/[0.06] focus:border-gold/50 px-3 py-2 text-bone/90 text-sm font-display italic focus:outline-none placeholder:text-bone/25 placeholder:not-italic placeholder:font-sans transition-colors disabled:text-stone disabled:opacity-80"
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
};
