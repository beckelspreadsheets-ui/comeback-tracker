import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, SectionTitle } from '../components/primitives.jsx';
import { FoodEntrySheet } from '../components/FoodEntrySheet.jsx';
import { calcTargets, PHASES } from '../lib/nutrition.js';
import {
  MEAL_BUCKETS,
  getDayLog,
  sumDay,
  sumEntries,
  todayKey,
  shiftDateKey,
  formatDateKey,
  weekSeries,
  weekCompliance,
  makeEntryId,
} from '../lib/foodHelpers.js';

const GOLD = '#d4af37';

const PROGRESS_COLORS = {
  ok: 'bg-gold',
  over: 'bg-vermillion',
};

const ProgressRow = ({ label, value, target, unit }) => {
  const pct = target > 0 ? (value / target) * 100 : 0;
  const clamped = Math.min(pct, 100);
  const over = pct > 105;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone">{label}</div>
        <div className="text-[11px] font-mono tabular-nums text-bone/80">
          <span className={over ? 'text-vermillion' : 'text-bone'}>{Math.round(value)}</span>
          <span className="text-stone"> / {Math.round(target)}{unit}</span>
        </div>
      </div>
      <div className="relative h-1 bg-bone/[0.06]">
        <div
          className={`absolute left-0 top-0 h-full transition-all duration-500 ${
            over ? PROGRESS_COLORS.over : PROGRESS_COLORS.ok
          }`}
          style={{ width: `${clamped}%` }}
        />
        {over && (
          <div
            className="absolute top-0 h-full bg-vermillion/50"
            style={{ left: '100%', width: `${Math.min(pct - 100, 20)}%` }}
          />
        )}
      </div>
    </div>
  );
};

export const FoodScreen = ({ state, setState }) => {
  const [date, setDate] = useState(todayKey());
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeMeal, setActiveMeal] = useState('breakfast');

  const food = state.food;
  const targets = useMemo(
    () => calcTargets(state.settings, food.targets),
    [state.settings, food.targets]
  );

  const dayLog = getDayLog(food.log, date);
  const day = useMemo(() => sumDay(dayLog), [dayLog]);
  const week = useMemo(() => weekSeries(food.log, targets), [food.log, targets]);
  const compliance = useMemo(() => weekCompliance(food.log, targets), [food.log, targets]);
  const isToday = date === todayKey();

  // --- mutators ---
  const updateFood = (updater) =>
    setState((s) => ({ ...s, food: typeof updater === 'function' ? updater(s.food) : updater }));

  const setPhase = (phase) =>
    updateFood((f) => ({ ...f, targets: { ...f.targets, phase } }));

  const setOffset = (phase, value) =>
    updateFood((f) => ({
      ...f,
      targets: {
        ...f.targets,
        offsets: { ...f.targets.offsets, [phase]: Number(value) || 0 },
      },
    }));

  const setTargetField = (key, value) =>
    updateFood((f) => ({ ...f, targets: { ...f.targets, [key]: Number(value) || 0 } }));

  const addEntry = (meal, entry) =>
    updateFood((f) => {
      const existing = f.log[date] || { breakfast: [], lunch: [], dinner: [], snacks: [] };
      return {
        ...f,
        log: {
          ...f.log,
          [date]: {
            ...existing,
            [meal]: [...(existing[meal] || []), entry],
          },
        },
      };
    });

  const removeEntry = (meal, id) =>
    updateFood((f) => {
      const existing = f.log[date];
      if (!existing) return f;
      return {
        ...f,
        log: {
          ...f.log,
          [date]: {
            ...existing,
            [meal]: (existing[meal] || []).filter((e) => e.id !== id),
          },
        },
      };
    });

  const saveToLibrary = (item) =>
    updateFood((f) => {
      const existing = f.library.find(
        (i) => i.name.toLowerCase() === item.name.toLowerCase() && i.servingDesc === item.servingDesc
      );
      const now = Date.now();
      if (existing) {
        return {
          ...f,
          library: f.library.map((i) =>
            i.id === existing.id
              ? { ...i, ...item, lastUsedAt: now, usageCount: (i.usageCount || 0) + 1 }
              : i
          ),
        };
      }
      return {
        ...f,
        library: [
          ...f.library,
          {
            id: makeEntryId(),
            ...item,
            lastUsedAt: now,
            usageCount: 1,
          },
        ],
      };
    });

  const openSheet = (meal) => {
    setActiveMeal(meal);
    setSheetOpen(true);
  };

  const handleAdd = (entry) => {
    addEntry(activeMeal, entry);
    // bump library usage if it came from the library
    if (entry.itemId) {
      updateFood((f) => ({
        ...f,
        library: f.library.map((i) =>
          i.id === entry.itemId
            ? { ...i, lastUsedAt: Date.now(), usageCount: (i.usageCount || 0) + 1 }
            : i
        ),
      }));
    }
  };

  return (
    <div className="space-y-8 pb-4">
      <SectionTitle
        eyebrow="Food"
        title="Daily fuel"
        desc="Log food, track macros, hit your phase-aware targets."
      />

      {/* Date navigator */}
      <div className="flex items-center justify-between border border-bone/[0.06]">
        <button
          onClick={() => setDate((d) => shiftDateKey(d, -1))}
          className="w-12 h-12 flex items-center justify-center text-stone hover:text-bone active:scale-95"
          aria-label="Previous day"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-stone">Day</div>
          <div className="font-display text-bone text-lg">{formatDateKey(date)}</div>
        </div>
        <button
          onClick={() => setDate((d) => shiftDateKey(d, 1))}
          disabled={isToday}
          className="w-12 h-12 flex items-center justify-center text-stone hover:text-bone active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
          aria-label="Next day"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Targets card (collapsible) */}
      <Card className="p-0 overflow-hidden">
        <button
          onClick={() => setTargetsOpen((o) => !o)}
          className="w-full flex items-baseline justify-between px-4 py-4 active:bg-bone/[0.02]"
        >
          <div className="text-left">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-gold">
              Targets · {PHASES.find((p) => p.key === targets.phase)?.label}
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-display text-3xl text-bone tabular-nums leading-none">
                {targets.calories.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-stone">kcal</span>
            </div>
            <div className="mt-1 text-[10px] font-mono text-stone tabular-nums">
              P {targets.protein} · C {targets.carbs} · F {targets.fat}
            </div>
          </div>
          {targetsOpen ? (
            <ChevronUp size={16} className="text-stone" />
          ) : (
            <ChevronDown size={16} className="text-stone" />
          )}
        </button>

        {targetsOpen && (
          <div className="px-4 pb-4 pt-0 space-y-4 border-t border-bone/[0.06]">
            {/* Phase segmented control */}
            <div className="grid grid-cols-3 border border-bone/[0.08] mt-4">
              {PHASES.map((p) => {
                const active = targets.phase === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setPhase(p.key)}
                    className={`py-3 text-[10px] font-mono uppercase tracking-[0.22em] transition-colors min-h-[44px] ${
                      active ? 'bg-gold text-ink' : 'text-stone hover:text-bone'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-3 text-[10px] font-mono tabular-nums gap-2">
              <div className="border border-bone/[0.06] p-3">
                <div className="text-stone uppercase tracking-[0.22em]">BMR</div>
                <div className="text-bone text-sm mt-1">{targets.bmr}</div>
              </div>
              <div className="border border-bone/[0.06] p-3">
                <div className="text-stone uppercase tracking-[0.22em]">TDEE</div>
                <div className="text-bone text-sm mt-1">{targets.tdee}</div>
              </div>
              <div className="border border-gold/20 p-3 bg-gold/[0.04]">
                <div className="text-gold uppercase tracking-[0.22em]">Offset</div>
                <div className="text-gold text-sm mt-1">
                  {targets.offset > 0 ? '+' : ''}
                  {targets.offset}
                </div>
              </div>
            </div>

            {/* Per-phase offset editors */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone mb-2">
                Offsets (kcal)
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PHASES.map((p) => (
                  <div key={p.key}>
                    <label className="text-[9px] font-mono uppercase tracking-[0.22em] text-stone block mb-1">
                      {p.label}
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={food.targets.offsets[p.key] ?? 0}
                      onChange={(e) => setOffset(p.key, e.target.value)}
                      className="w-full bg-ink/60 border border-bone/[0.08] px-2 py-2 text-bone text-sm font-mono tabular-nums focus:border-gold/60 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-mono uppercase tracking-[0.22em] text-stone block mb-1">
                  Protein (g/lb)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={food.targets.proteinPerLb}
                  onChange={(e) => setTargetField('proteinPerLb', e.target.value)}
                  className="w-full bg-ink/60 border border-bone/[0.08] px-2 py-2 text-bone text-sm font-mono tabular-nums focus:border-gold/60 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono uppercase tracking-[0.22em] text-stone block mb-1">
                  Fat (g/lb)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.05"
                  value={food.targets.fatGPerLb}
                  onChange={(e) => setTargetField('fatGPerLb', e.target.value)}
                  className="w-full bg-ink/60 border border-bone/[0.08] px-2 py-2 text-bone text-sm font-mono tabular-nums focus:border-gold/60 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Progress bars */}
      <div className="space-y-3 border border-bone/[0.06] p-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="font-display italic text-bone text-lg">Progress</span>
          <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone tabular-nums">
            {Math.round(day.total.cal)} / {targets.calories} kcal
          </span>
        </div>
        <ProgressRow label="Calories" value={day.total.cal} target={targets.calories} unit="" />
        <ProgressRow label="Protein" value={day.total.p} target={targets.protein} unit="g" />
        <ProgressRow label="Carbs" value={day.total.c} target={targets.carbs} unit="g" />
        <ProgressRow label="Fat" value={day.total.f} target={targets.fat} unit="g" />
      </div>

      {/* Meal buckets */}
      <div className="space-y-3">
        {MEAL_BUCKETS.map((bucket) => {
          const entries = dayLog[bucket.key] || [];
          const sub = sumEntries(entries);
          return (
            <Card key={bucket.key} className="p-0 overflow-hidden">
              <div className="flex items-baseline justify-between px-4 py-3 border-b border-bone/[0.04]">
                <div className="flex items-baseline gap-2">
                  <span className="text-gold">{bucket.emoji}</span>
                  <span className="font-display italic text-bone text-lg">{bucket.label}</span>
                </div>
                <div className="text-[10px] font-mono tabular-nums text-stone">
                  {Math.round(sub.cal)} kcal · {Math.round(sub.p)}g P
                </div>
              </div>
              {entries.length > 0 && (
                <div className="divide-y divide-bone/[0.04]">
                  {entries.map((e) => {
                    const s = Number(e.servings) || 1;
                    return (
                      <div
                        key={e.id}
                        className="flex items-start justify-between gap-3 px-4 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-bone truncate">{e.name}</div>
                          <div className="text-[10px] font-mono text-stone mt-0.5">
                            {s === 1 ? e.servingDesc : `${s} × ${e.servingDesc}`} · P{' '}
                            {Math.round(e.p * s)} · C {Math.round(e.c * s)} · F{' '}
                            {Math.round(e.f * s)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-xs font-mono text-gold tabular-nums">
                            {Math.round(e.cal * s)}
                          </div>
                          <button
                            onClick={() => removeEntry(bucket.key, e.id)}
                            className="w-8 h-8 flex items-center justify-center text-stone/60 hover:text-vermillion active:scale-90"
                            aria-label="Remove"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <button
                onClick={() => openSheet(bucket.key)}
                className="w-full py-3 border-t border-bone/[0.04] text-[10px] font-mono uppercase tracking-[0.22em] text-stone hover:text-gold flex items-center justify-center gap-1.5 active:scale-[0.99] transition-colors min-h-[44px]"
              >
                <Plus size={12} /> Add food
              </button>
            </Card>
          );
        })}
      </div>

      {/* Week aggregates */}
      <Card className="p-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone">
              Week average
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-display text-3xl text-bone tabular-nums leading-none">
                {compliance.avgCal.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-stone">kcal · {compliance.logged}/7d logged</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone">
              Compliance
            </div>
            <div className="font-display text-2xl text-gold tabular-nums leading-none mt-2">
              {compliance.pct}%
            </div>
          </div>
        </div>
        <div className="h-40 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={week} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
              <XAxis
                dataKey="label"
                stroke="rgba(243,236,224,0.3)"
                tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: 'rgba(243,236,224,0.5)' }}
                axisLine={{ stroke: 'rgba(243,236,224,0.1)' }}
                tickLine={false}
              />
              <YAxis
                stroke="rgba(243,236,224,0.3)"
                tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: 'rgba(243,236,224,0.5)' }}
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(11,11,14,0.95)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  borderRadius: 0,
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono',
                }}
                labelStyle={{ color: 'rgba(243,236,224,0.5)' }}
                itemStyle={{ color: GOLD }}
              />
              <ReferenceLine
                y={targets.calories}
                stroke={GOLD}
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <Line
                type="monotone"
                dataKey="cal"
                stroke={GOLD}
                strokeWidth={1.5}
                dot={{ fill: GOLD, r: 3 }}
                activeDot={{ r: 5, fill: GOLD }}
                name="kcal"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <FoodEntrySheet
        isOpen={sheetOpen}
        meal={activeMeal}
        library={food.library}
        onAdd={handleAdd}
        onSaveToLibrary={saveToLibrary}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
};
