import { Plus } from 'lucide-react';
import { Card, SectionTitle } from '../components/primitives.jsx';
import { CALIBRATION_STARTS, EFFORT_GUIDE } from '../lib/program.js';
import { epley1RM } from '../lib/utils.js';

export const CalibrationScreen = ({ state, setState }) => {
  const updateEpley = (idx, key, val) => {
    setState((s) => {
      const rows = [...s.epleyRows];
      rows[idx] = { ...rows[idx], [key]: val };
      return { ...s, epleyRows: rows };
    });
  };

  const addEpleyRow = () =>
    setState((s) => ({
      ...s,
      epleyRows: [...s.epleyRows, { name: '', wt: '', reps: '', rir: '' }],
    }));

  return (
    <div className="space-y-10">
      <SectionTitle
        eyebrow="Weeks 1–2"
        title="Calibration protocol"
        desc="Find your real starting weights before running the percentage program."
      />

      {/* The method — numbered steps in gold-outlined circles */}
      <Card className="p-5">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone mb-4">
          The method
        </div>
        <ol className="space-y-3">
          {[
            "Start with a weight you're confident you could hit for 20 reps. Feel silly light.",
            'Do prescribed sets × reps. Do NOT grind. Stop if form breaks.',
            'Rate effort 1–10 after each top set.',
            'Adjust next session per the guide below.',
            'After 3 sessions on an exercise, use the Epley calculator → enter 1RM in Settings.',
            'From Week 3 onward, use the Program tab. Estimates will be accurate.',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 border border-gold/50 text-gold font-display italic text-base flex items-center justify-center tabular-nums">
                {i + 1}
              </span>
              <span className="text-bone/80 leading-relaxed pt-0.5 text-sm">{step}</span>
            </li>
          ))}
        </ol>
      </Card>

      {/* Effort-based adjustments */}
      <Card className="p-5">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone mb-4">
          Effort-based adjustments
        </div>
        <div className="text-xs">
          <div className="grid grid-cols-12 gap-2 pb-2 border-b border-bone/[0.08] text-[9px] font-mono uppercase tracking-[0.22em] text-stone">
            <div className="col-span-2">RPE</div>
            <div className="col-span-4">Feel</div>
            <div className="col-span-2">Compound</div>
            <div className="col-span-2">Iso</div>
            <div className="col-span-2">Joint-sens.</div>
          </div>
          {EFFORT_GUIDE.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 py-2.5 border-b border-bone/[0.04] last:border-0">
              <div className="col-span-2 font-mono font-bold text-gold">{r.effort}</div>
              <div className="col-span-4 text-bone/80">{r.feel}</div>
              <div className="col-span-2 text-stone font-mono text-[10px] tabular-nums">{r.compound}</div>
              <div className="col-span-2 text-stone font-mono text-[10px] tabular-nums">{r.iso}</div>
              <div className="col-span-2 text-stone font-mono text-[10px] tabular-nums">{r.joint}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Conservative starting points */}
      <Card className="p-5">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone mb-4">
          Conservative starting points · Week 1
        </div>
        <p className="text-xs text-stone mb-4 leading-relaxed italic font-display text-sm">
          Deliberately low. Muscles can handle more but tendons can't.
        </p>
        <div>
          {CALIBRATION_STARTS.map((row, i) => (
            <div key={i} className="py-3 border-b border-bone/[0.04] last:border-0">
              <div className="font-display text-base text-bone leading-tight mb-1">{row[0]}</div>
              <div className="text-[11px] text-gold/90 font-mono tabular-nums mb-1 tracking-[0.02em]">{row[1]}</div>
              <div className="text-xs text-stone leading-relaxed">{row[2]}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Epley calculator */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone">
            Epley 1RM calculator
          </div>
          <button
            onClick={addEpleyRow}
            className="text-[10px] font-mono uppercase tracking-[0.22em] text-gold hover:text-gold/80 flex items-center gap-1"
          >
            <Plus size={12} /> Row
          </button>
        </div>
        <p className="text-xs text-stone mb-4 font-mono tracking-[0.02em]">
          1RM = Weight × (1 + (Reps + RIR) / 30)
        </p>
        <div className="space-y-2">
          {state.epleyRows.map((row, i) => {
            const est = epley1RM(row.wt, row.reps, row.rir);
            return (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  value={row.name}
                  onChange={(e) => updateEpley(i, 'name', e.target.value)}
                  placeholder="Exercise"
                  className="col-span-4 bg-ink/60 border border-bone/[0.08] px-2 py-2 text-bone text-xs focus:border-gold/50 focus:outline-none placeholder:text-bone/20"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={row.wt}
                  onChange={(e) => updateEpley(i, 'wt', e.target.value)}
                  placeholder="Wt"
                  className="col-span-2 bg-ink/60 border border-bone/[0.08] px-2 py-2 text-bone text-xs font-mono tabular-nums focus:border-gold/50 focus:outline-none placeholder:text-bone/20"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  value={row.reps}
                  onChange={(e) => updateEpley(i, 'reps', e.target.value)}
                  placeholder="Reps"
                  className="col-span-2 bg-ink/60 border border-bone/[0.08] px-2 py-2 text-bone text-xs font-mono tabular-nums focus:border-gold/50 focus:outline-none placeholder:text-bone/20"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  value={row.rir}
                  onChange={(e) => updateEpley(i, 'rir', e.target.value)}
                  placeholder="RIR"
                  className="col-span-2 bg-ink/60 border border-bone/[0.08] px-2 py-2 text-bone text-xs font-mono tabular-nums focus:border-gold/50 focus:outline-none placeholder:text-bone/20"
                />
                <div className="col-span-2 text-right font-display text-lg text-gold tabular-nums italic">
                  {est ? `${est}` : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
