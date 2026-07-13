import { Card, SectionTitle, NumInput } from '../components/primitives.jsx';
import { LIFTS } from '../lib/program.js';
import { round5 } from '../lib/utils.js';
import { clearAllData } from '../hooks/usePersistedState.js';
import { Trash2 } from 'lucide-react';

export const SettingsScreen = ({ state, setState }) => {
  const update = (key, val) => setState((s) => ({ ...s, settings: { ...s.settings, [key]: val } }));
  const updateRM = (key, val) => setState((s) => ({ ...s, oneRMs: { ...s.oneRMs, [key]: val } }));

  const handleReset = () => {
    if (window.confirm('Clear ALL data? This cannot be undone. (Export first if you want a backup.)')) {
      clearAllData();
    }
  };

  return (
    <div className="space-y-10">
      <SectionTitle
        eyebrow="Settings"
        title="Body & Program"
        desc="Keep the metrics that drive training targets current."
      />

      <Card className="p-5">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone mb-4">
          Body metrics
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone block mb-2">
              Current BW
            </label>
            <NumInput value={state.settings.currentBW} onChange={(v) => update('currentBW', v)} suffix="lb" />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone block mb-2">
              Target BW
            </label>
            <NumInput value={state.settings.targetBW} onChange={(v) => update('targetBW', v)} suffix="lb" />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone block mb-2">
              Height
            </label>
            <NumInput value={state.settings.height} onChange={(v) => update('height', v)} suffix="in" />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone block mb-2">
              Age
            </label>
            <NumInput value={state.settings.age} onChange={(v) => update('age', v)} />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone block mb-2">
              Activity multiplier
            </label>
            <select
              value={state.settings.activity}
              onChange={(e) => update('activity', Number(e.target.value))}
              className="w-full bg-ink/60 border border-bone/[0.08] px-4 py-3 text-bone text-base focus:border-gold/60 focus:outline-none"
            >
              <option value={1.4}>1.40 — Sedentary</option>
              <option value={1.55}>1.55 — Moderate</option>
              <option value={1.725}>1.73 — Active</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone">
            Estimated 1RMs
          </div>
          <div className="text-[10px] font-mono text-stone tracking-[0.1em]">70% / 78%</div>
        </div>
        <p className="text-xs text-stone leading-relaxed mb-4 italic font-display text-sm">
          Fill these after calibration. Use the Epley calculator on the Calibration tab. Working
          weights round to nearest 5 lb.
        </p>
        <div>
          {LIFTS.map((lift) => {
            const rm = state.oneRMs[lift.key];
            const pct70 = rm ? round5(rm * 0.7) : null;
            const pct78 = rm ? round5(rm * 0.78) : null;
            return (
              <div
                key={lift.key}
                className="grid grid-cols-12 items-center gap-2 py-2 border-b border-bone/[0.04] last:border-0"
              >
                <div className="col-span-6 text-sm text-bone/80 leading-tight">{lift.name}</div>
                <div className="col-span-3">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={rm ?? ''}
                    onChange={(e) =>
                      updateRM(lift.key, e.target.value === '' ? undefined : Number(e.target.value))
                    }
                    placeholder="—"
                    className="w-full bg-ink/60 border border-bone/[0.08] px-2 py-1.5 text-bone text-xs font-mono tabular-nums focus:border-gold/60 focus:outline-none placeholder:text-bone/20"
                  />
                </div>
                <div className="col-span-3 text-right text-[10px] font-mono tabular-nums">
                  {rm ? (
                    <>
                      <span className="text-gold/80">{pct70}</span>
                      <span className="text-stone/40 mx-1">·</span>
                      <span className="text-vermillion/80">{pct78}</span>
                    </>
                  ) : (
                    <span className="text-stone/40">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5 border-vermillion/20">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-vermillion/80 mb-2">
          Danger zone
        </div>
        <p className="text-xs text-stone leading-relaxed mb-3">
          Wipe all stored data — settings, 1RMs, logs, metrics. Use Export (top right) to back up
          first.
        </p>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-3 py-2 border border-vermillion/40 hover:bg-vermillion/10 text-vermillion text-[11px] font-mono uppercase tracking-[0.22em] transition-all"
        >
          <Trash2 size={12} />
          Reset all data
        </button>
      </Card>
    </div>
  );
};
