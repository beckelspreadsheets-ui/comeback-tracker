import { Pause, Play, X, Plus } from 'lucide-react';
import { formatTime } from '../lib/utils.js';

export const RestTimerFAB = ({ timer }) => {
  if (!timer.running && timer.seconds === 0) return null;

  const progress = timer.duration > 0 ? (timer.seconds / timer.duration) * 100 : 0;
  const urgent = timer.seconds <= 10 && timer.running;

  return (
    <div className="fixed bottom-20 right-4 z-50 safe-bottom">
      <div
        className={`relative border backdrop-blur-xl shadow-2xl transition-all ${
          urgent
            ? 'bg-vermillion/20 border-vermillion/40 shadow-vermillion/20'
            : 'bg-charcoal/90 border-bone/10'
        }`}
      >
        {/* Progress seam — fills left-to-right as time passes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className={`absolute left-0 top-0 bottom-0 ${urgent ? 'bg-vermillion/10' : 'bg-gold/10'}`}
            style={{ width: `${progress}%`, transition: 'width 1s linear' }}
          />
          {/* Gold hairline along the bottom */}
          <div
            className={`absolute left-0 bottom-0 h-px ${urgent ? 'bg-vermillion' : 'bg-gold'}`}
            style={{ width: `${progress}%`, transition: 'width 1s linear' }}
          />
        </div>

        <div className="relative flex items-center gap-3 px-3 py-2">
          <div className="text-center">
            <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-stone leading-none mb-1">
              Rest
            </div>
            <div
              className={`font-display text-2xl tabular-nums leading-none ${
                urgent ? 'text-vermillion' : 'text-bone'
              }`}
            >
              {formatTime(timer.seconds)}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => timer.addTime(15)}
              className="px-2 py-0.5 border border-bone/10 hover:border-gold/40 text-stone hover:text-gold text-[10px] font-mono flex items-center gap-0.5 transition-colors"
              title="+15 sec"
            >
              <Plus size={8} strokeWidth={3} />
              15
            </button>
            <button
              onClick={timer.stop}
              className="px-2 py-0.5 border border-bone/10 hover:border-vermillion/60 text-stone hover:text-vermillion text-[10px] font-mono flex items-center justify-center transition-colors"
              title="Stop"
            >
              <X size={10} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RestTimerChips = ({ onStart }) => (
  <div className="flex items-center gap-1.5 mt-3">
    <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-stone mr-0.5">
      Rest
    </span>
    {[60, 90, 120, 180].map((s) => (
      <button
        key={s}
        onClick={() => onStart(s)}
        className="px-2 py-1 border border-bone/[0.08] text-stone hover:border-gold/50 hover:text-gold text-[10px] font-mono tabular-nums transition-colors"
      >
        {s < 60 ? `${s}s` : `${s / 60}m${s % 60 ? ':' + (s % 60) : ''}`}
      </button>
    ))}
  </div>
);
