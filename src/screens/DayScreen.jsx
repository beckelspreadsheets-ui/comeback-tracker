import { ChevronRight, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Card, Pill } from '../components/primitives.jsx';
import { RestTimerChips } from '../components/RestTimer.jsx';
import { PROGRAM } from '../lib/program.js';
import { calcTargetWeight, isDeloadWeek, round5 } from '../lib/utils.js';

export const DayScreen = ({ state, setState, day, onBack, timer }) => {
  const dayData = PROGRAM.find((d) => d.day === day);
  if (!dayData) return null;

  const logKey = `w${state.currentWeek}d${day}`;
  const log = state.logs[logKey] || {
    exercises: dayData.exercises.map(() => ({
      sets: [{ wt: '', reps: '' }],
      note: '',
      joint: 'green',
    })),
  };

  const updateLog = (newLog) => {
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

      <div className="space-y-4">
        {dayData.exercises.map((ex, exIdx) => {
          const exLog = log.exercises[exIdx] || { sets: [{ wt: '', reps: '' }], note: '', joint: 'green' };
          const target = calcTargetWeight(ex, state.oneRMs);
          const displayTarget = deload && typeof target === 'number' ? round5(target * 0.8) : target;

          return (
            <Card key={exIdx} className="p-4">
              {/* Header — type pill, prescription, name, target */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Pill type={ex.type} />
                    <span className="text-[10px] font-mono text-stone tracking-[0.05em]">
                      {ex.sets}×{ex.reps}
                      {ex.rir && ` @ RIR ${ex.rir}`}
                    </span>
                  </div>
                  <div className="font-display text-xl text-bone leading-tight tracking-tight">{ex.name}</div>
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
                {exLog.sets.map((st, setIdx) => (
                  <div
                    key={setIdx}
                    className="grid grid-cols-[28px_1fr_16px_1fr_28px] items-center gap-3 py-2 border-b border-bone/[0.04] last:border-0"
                  >
                    <div className="font-display italic text-stone text-lg tabular-nums text-center">
                      {setIdx + 1}
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={st.wt}
                      onChange={(e) => updateSet(exIdx, setIdx, 'wt', e.target.value)}
                      placeholder="wt"
                      className="w-full bg-transparent border-0 border-b border-bone/[0.08] focus:border-gold px-1 py-1.5 text-bone text-base font-mono tabular-nums focus:outline-none placeholder:text-bone/20 placeholder:tracking-[0.1em] transition-colors"
                    />
                    <span className="text-stone font-display italic text-base text-center">×</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={st.reps}
                      onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                      placeholder="reps"
                      className="w-full bg-transparent border-0 border-b border-bone/[0.08] focus:border-gold px-1 py-1.5 text-bone text-base font-mono tabular-nums focus:outline-none placeholder:text-bone/20 placeholder:tracking-[0.1em] transition-colors"
                    />
                    {exLog.sets.length > 1 ? (
                      <button
                        onClick={() => removeSet(exIdx, setIdx)}
                        className="w-6 h-6 border border-transparent hover:border-vermillion/40 hover:text-vermillion text-stone/40 flex items-center justify-center active:scale-95 transition-all"
                        aria-label="Remove set"
                      >
                        <Trash2 size={11} />
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addSet(exIdx)}
                  className="w-full mt-2 py-2 border border-dashed border-bone/[0.08] hover:border-gold/40 hover:text-gold text-[10px] font-mono uppercase tracking-[0.22em] text-stone flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
                >
                  <Plus size={10} /> Set
                </button>
              </div>

              {/* Rest chips */}
              <RestTimerChips onStart={timer.start} />

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
                onChange={(e) => updateNote(exIdx, 'note', e.target.value)}
                placeholder="Notes — form cues, twinges, PRs…"
                className="w-full mt-3 bg-ink/40 border border-bone/[0.06] focus:border-gold/50 px-3 py-2 text-bone/90 text-sm font-display italic focus:outline-none placeholder:text-bone/25 placeholder:not-italic placeholder:font-sans transition-colors"
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
};
