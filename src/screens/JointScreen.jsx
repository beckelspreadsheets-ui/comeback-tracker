import { Card, SectionTitle } from '../components/primitives.jsx';
import { JOINT_DURING, JOINT_NEXTDAY, SUBS_KNEE, SUBS_SHOULDER } from '../lib/program.js';

// Map severity -> explicit Tailwind classes so JIT picks them up
const sevClasses = {
  red: 'bg-red-500/5 border-red-500/20',
  yellow: 'bg-amber-500/5 border-amber-500/20',
  green: 'bg-emerald-500/5 border-emerald-500/20',
};

const sevDot = (sev) => (sev === 'red' ? '🔴' : sev === 'yellow' ? '🟡' : '🟢');

const DecisionList = ({ items }) => (
  <div className="space-y-2.5">
    {items.map((r, i) => (
      <div key={i} className={`flex gap-3 p-3 border ${sevClasses[r.sev]}`}>
        <span className="text-sm shrink-0">{sevDot(r.sev)}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-display text-bone leading-tight mb-1">{r.sign}</div>
          <div className="text-[11px] text-stone leading-relaxed">{r.action}</div>
        </div>
      </div>
    ))}
  </div>
);

const SubsTable = ({ rows }) => (
  <div className="text-xs">
    {rows.map((r, i) => (
      <div
        key={i}
        className="grid grid-cols-3 gap-2 py-2.5 border-b border-bone/[0.04] last:border-0"
      >
        <div className="text-bone font-display text-base leading-tight">{r[0]}</div>
        <div className="text-pine font-mono text-[11px] tracking-[0.02em]">→ {r[1]}</div>
        <div className="text-stone text-[11px] leading-relaxed">{r[3]}</div>
      </div>
    ))}
  </div>
);

export const JointScreen = () => (
  <div className="space-y-8">
    <SectionTitle
      eyebrow="Non-negotiable"
      title="Joint protection"
      desc="Read before every session for the first 8 weeks."
    />

    <Card className="p-5">
      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-vermillion mb-4">
        During a set — stop if you feel
      </div>
      <DecisionList items={JOINT_DURING} />
    </Card>

    <Card className="p-5">
      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-gold mb-4">
        Next-day signals — modify next session
      </div>
      <DecisionList items={JOINT_NEXTDAY} />
    </Card>

    <Card className="p-5">
      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone mb-4">
        Subs · knees flaring
      </div>
      <SubsTable rows={SUBS_KNEE} />
    </Card>

    <Card className="p-5">
      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone mb-4">
        Subs · shoulders flaring
      </div>
      <SubsTable rows={SUBS_SHOULDER} />
    </Card>

    <Card className="p-5">
      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone mb-4">
        Daily prehab · 5 minutes, every session
      </div>
      <div className="text-xs">
        {[
          ['Band pull-aparts', '2 × 15'],
          ['Face pulls / ext. rotations', '2 × 15'],
          ['BW squat to depth', '2 × 10'],
          ['Leg swings (F-B, S-S)', '10 per leg per dir'],
          ['Wall slides / dead hangs', '30–60s'],
        ].map((r, i) => (
          <div key={i} className="flex justify-between items-baseline py-2.5 border-b border-bone/[0.04] last:border-0">
            <span className="font-display text-base text-bone">{r[0]}</span>
            <span className="font-mono text-stone tabular-nums text-[11px]">{r[1]}</span>
          </div>
        ))}
      </div>
    </Card>
  </div>
);
