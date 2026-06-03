import { useMemo } from 'react';
import { CheckCircle2, Dumbbell, FlaskConical, HeartPulse, Plus, Target, Trophy, Utensils } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, SectionTitle } from '../components/primitives.jsx';
import { deriveGameProfile } from '../game/gameProfile.js';
import { buildGameMissions, getActiveMission } from '../game/gameMissions.js';
import { calcTargets } from '../lib/nutrition.js';
import { proteinCompliance12w } from '../lib/foodHelpers.js';
import { LIFTS, PROGRAM } from '../lib/program.js';

// Kintsugi gold for chart stroke — must match Tailwind gold.DEFAULT
const GOLD = '#d4af37';
const PINE = '#6b9e7a';

const pct = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const RecapStat = ({ Icon, label, value, suffix = '' }) => (
  <div className="border border-bone/[0.08] bg-ink/45 p-3">
    <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.18em] text-stone">
      <Icon size={12} className="text-gold" />
      {label}
    </div>
    <div className="mt-2 font-display text-3xl leading-none text-bone tabular-nums">
      {value}
      {suffix && <span className="ml-1 font-mono text-[10px] text-stone">{suffix}</span>}
    </div>
  </div>
);

export const MetricsScreen = ({ state, setState }) => {
  const rows = state.metrics.length
    ? state.metrics
    : Array.from({ length: 12 }, (_, i) => ({
        week: i + 1,
        date: '',
        bw: '',
        waist: '',
        arm: '',
        thigh: '',
        knee: 'green',
        shoulder: 'green',
        notes: '',
      }));

  const update = (idx, key, val) => {
    setState((s) => {
      const base = s.metrics.length ? [...s.metrics] : rows.map((r) => ({ ...r }));
      base[idx] = { ...base[idx], [key]: val };
      return { ...s, metrics: base };
    });
  };

  const addWeek = () => {
    setState((s) => {
      const base = s.metrics.length ? [...s.metrics] : rows.map((r) => ({ ...r }));
      base.push({
        week: base.length + 1,
        date: '',
        bw: '',
        waist: '',
        arm: '',
        thigh: '',
        knee: 'green',
        shoulder: 'green',
        notes: '',
      });
      return { ...s, metrics: base };
    });
  };

  const chartData = useMemo(() => {
    return rows
      .filter((r) => r.bw && !isNaN(Number(r.bw)))
      .map((r) => ({
        week: `W${r.week}`,
        weekNum: r.week,
        bw: Number(r.bw),
        waist: r.waist ? Number(r.waist) : null,
        arm: r.arm ? Number(r.arm) : null,
      }));
  }, [rows]);

  const hasChartData = chartData.length >= 2;
  const targetBW = state.settings.targetBW;
  const startBW = chartData[0]?.bw || state.settings.currentBW;
  const latestBW = chartData[chartData.length - 1]?.bw || state.settings.currentBW;
  const gained = latestBW - startBW;

  const foodTargets = useMemo(
    () => calcTargets(state.settings, state.food.targets),
    [state.settings, state.food.targets]
  );
  const complianceData = useMemo(
    () => proteinCompliance12w(state.food.log, foodTargets),
    [state.food.log, foodTargets]
  );
  const hasComplianceData = complianceData.some((d) => d.logged > 0);
  const profile = useMemo(() => deriveGameProfile(state), [state]);
  const missions = useMemo(() => buildGameMissions(state, profile), [state, profile]);
  const activeMission = useMemo(() => getActiveMission(missions), [missions]);
  const xpPct = pct((profile.currentLevelXp / profile.nextLevelXp) * 100);

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Tracking"
        title="Home Base"
        desc="Body metrics, city progress recap, and the next useful mission from Comeback City."
      />

      <Card className="p-5 border-sky-400/20 bg-sky-400/[0.03]" data-testid="home-base-recap">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-gold">
              <Trophy size={13} />
              Home Base Recap
            </div>
            <div className="mt-3 grid grid-cols-[52px_1fr] items-center gap-3">
              <div className="grid h-[52px] w-[52px] place-items-center border-2 border-gold bg-gold/[0.08] font-display text-3xl leading-none text-gold">
                {profile.level}
              </div>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone">
                    City XP
                  </span>
                  <span className="font-mono text-[10px] text-gold tabular-nums">
                    {profile.currentLevelXp}/{profile.nextLevelXp}
                  </span>
                </div>
                <div className="mt-2 h-2 border border-bone/[0.12] bg-ink/70">
                  <div className="h-full bg-gold transition-all duration-500" style={{ width: `${xpPct}%` }} />
                </div>
              </div>
            </div>
            {activeMission && (
              <div className="mt-4 border border-gold/20 bg-ink/50 p-3" data-testid="home-base-next-mission">
                <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.18em] text-gold">
                  {activeMission.complete ? <CheckCircle2 size={12} /> : <Target size={12} />}
                  Next mission
                </div>
                <div className="mt-2 font-display text-2xl leading-none text-bone">
                  {activeMission.title}
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-stone">
                  {activeMission.summary}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <RecapStat
              Icon={Dumbbell}
              label="Courses"
              value={profile.workout.completedCourses}
              suffix={`/${PROGRAM.length}`}
            />
            <RecapStat Icon={Utensils} label="Food days" value={profile.foodDays} />
            <RecapStat Icon={FlaskConical} label="Calibrated" value={profile.filledRMs} suffix={`/${LIFTS.length}`} />
            <RecapStat Icon={HeartPulse} label="Shield" value={profile.recoveryShield} />
          </div>
        </div>
      </Card>

      {hasChartData && (
        <Card className="p-5">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone">
                Body weight · trajectory
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="font-display text-4xl text-bone tabular-nums leading-none">{latestBW}</span>
                <span
                  className={`text-sm font-mono font-bold tabular-nums ${
                    gained > 0 ? 'text-pine' : gained < 0 ? 'text-vermillion' : 'text-stone'
                  }`}
                >
                  {gained > 0 ? '+' : ''}
                  {gained.toFixed(1)} lb
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone">Target</div>
              <div className="font-display text-2xl text-gold tabular-nums leading-none mt-2">
                {targetBW}
              </div>
            </div>
          </div>
          <div className="h-48 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <XAxis
                  dataKey="week"
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
                  domain={['dataMin - 3', (dataMax) => Math.max(dataMax + 3, targetBW + 2)]}
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
                  y={targetBW}
                  stroke={GOLD}
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                  label={{ value: 'Target', position: 'right', fill: GOLD, fontSize: 9, fontFamily: 'JetBrains Mono' }}
                />
                <Line
                  type="monotone"
                  dataKey="bw"
                  stroke={GOLD}
                  strokeWidth={1.5}
                  dot={{ fill: GOLD, r: 3 }}
                  activeDot={{ r: 5, fill: GOLD }}
                  name="BW (lb)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {!hasChartData && (
        <Card className="p-5 border-gold/20 bg-gold/[0.03]">
          <p className="text-xs text-stone leading-relaxed">
            Log body weight for at least 2 weeks to see your progress chart here.
          </p>
        </Card>
      )}

      {/* Macro compliance — 12 week protein-hit rate */}
      <Card className="p-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone">
              Macro compliance · 12 week
            </div>
            <div className="mt-2 font-display text-lg text-bone leading-none">
              Protein hit rate
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone">Goal</div>
            <div className="font-display text-xl text-pine tabular-nums leading-none mt-2">80%</div>
          </div>
        </div>
        {hasComplianceData ? (
          <div className="h-44 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complianceData} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <XAxis
                  dataKey="week"
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
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(11,11,14,0.95)',
                    border: '1px solid rgba(107,158,122,0.3)',
                    borderRadius: 0,
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono',
                  }}
                  labelStyle={{ color: 'rgba(243,236,224,0.5)' }}
                  itemStyle={{ color: PINE }}
                  formatter={(v) => `${v}%`}
                />
                <ReferenceLine
                  y={80}
                  stroke={PINE}
                  strokeDasharray="3 3"
                  strokeOpacity={0.6}
                />
                <Bar dataKey="pct" fill={PINE} radius={[2, 2, 0, 0]} name="Hit rate" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-stone leading-relaxed">
            Log food in the Food tab to see weekly protein compliance here.
          </p>
        )}
      </Card>

      {/* Week rows */}
      <div className="space-y-2">
        {rows.map((row, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-8 border border-gold/40 text-gold text-[11px] font-mono font-bold flex items-center justify-center tabular-nums tracking-[0.05em]">
                W{row.week}
              </div>
              <input
                type="date"
                value={row.date || ''}
                onChange={(e) => update(i, 'date', e.target.value)}
                className="flex-1 bg-ink/60 border border-bone/[0.08] px-2 py-1.5 text-bone text-xs focus:border-gold/50 focus:outline-none"
              />
              <div className="flex gap-1 items-center">
                {['green', 'yellow', 'red'].map((c) => (
                  <button
                    key={`k${c}`}
                    onClick={() => update(i, 'knee', c)}
                    className={`w-7 h-7 text-xs transition-all ${
                      row.knee === c ? 'border border-bone/30 bg-bone/5' : 'opacity-30'
                    }`}
                    aria-label={`Knee ${c}`}
                  >
                    {c === 'green' ? '🟢' : c === 'yellow' ? '🟡' : '🔴'}
                  </button>
                ))}
                <span className="text-[9px] font-mono text-stone px-0.5">K</span>
              </div>
              <div className="flex gap-1 items-center">
                {['green', 'yellow', 'red'].map((c) => (
                  <button
                    key={`s${c}`}
                    onClick={() => update(i, 'shoulder', c)}
                    className={`w-7 h-7 text-xs transition-all ${
                      row.shoulder === c ? 'border border-bone/30 bg-bone/5' : 'opacity-30'
                    }`}
                    aria-label={`Shoulder ${c}`}
                  >
                    {c === 'green' ? '🟢' : c === 'yellow' ? '🟡' : '🔴'}
                  </button>
                ))}
                <span className="text-[9px] font-mono text-stone px-0.5">S</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { key: 'bw', label: 'BW', sfx: 'lb' },
                { key: 'waist', label: 'Waist', sfx: 'in' },
                { key: 'arm', label: 'Arm', sfx: 'in' },
                { key: 'thigh', label: 'Thigh', sfx: 'in' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-[9px] font-mono uppercase tracking-[0.18em] text-stone block mb-1">
                    {f.label}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={row[f.key] ?? ''}
                      onChange={(e) =>
                        update(i, f.key, e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full bg-ink/60 border border-bone/[0.08] px-2 py-1.5 text-bone text-xs font-mono tabular-nums focus:border-gold/50 focus:outline-none placeholder:text-bone/20"
                      placeholder="—"
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-stone font-mono pointer-events-none">
                      {f.sfx}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
        <button
          onClick={addWeek}
          className="w-full py-3 border border-dashed border-bone/[0.1] hover:border-gold/40 hover:text-gold text-[10px] font-mono uppercase tracking-[0.22em] text-stone flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
        >
          <Plus size={12} /> Add week
        </button>
      </div>
    </div>
  );
};
