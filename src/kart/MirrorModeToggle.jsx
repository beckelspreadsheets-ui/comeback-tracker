// Race Setup's Mirror Mode switch, and the podium line that announces the
// unlock. State and rules live in mirrorUnlock.js; this is markup only.
//
// The panel classes come from KartApp's menu tokens (PANEL / PANEL_HOVER /
// PANEL_SELECTED) so the switch cannot drift from the pickers around it.
import { FlipHorizontal2, Lock } from 'lucide-react';

const TITLE = 'font-mono text-[13px] font-black uppercase tracking-[0.05em]';
const ICON_BOX = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-black/30';

export const MirrorModeToggle = ({ enabled, locked, onToggle, panel, panelHover, panelSelected }) => {
  if (locked) {
    // A disabled switch rather than a bare label, so assistive tech still
    // reads it as the Mirror Mode control and says why it cannot be used.
    return (
      <button
        type="button"
        role="switch"
        aria-checked="false"
        className={`${panel} flex w-full cursor-not-allowed items-center gap-3 p-3 text-left`}
        data-mirror-state="locked"
        data-testid="race-mirror-toggle"
        disabled
      >
        <span className={`${ICON_BOX} border-white/10 text-white/45`}>
          <Lock size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`${TITLE} block text-white/70`}>Mirror Mode</span>
          <span className="mt-0.5 block text-[10px] leading-snug text-white/55" data-testid="race-mirror-locked">
            Win a Grand Prix to unlock
          </span>
        </span>
        <span className="shrink-0 rounded-md border border-white/15 bg-white/[0.06] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/50">
          Locked
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled ? 'true' : 'false'}
      className={`flex w-full items-center gap-3 p-3 text-left ${enabled ? panelSelected : `${panel} ${panelHover}`}`}
      data-mirror-state={enabled ? 'on' : 'off'}
      data-testid="race-mirror-toggle"
      onClick={onToggle}
    >
      <span className={`${ICON_BOX} ${enabled ? 'border-[#ffd34f]/50 text-[#ffd34f]' : 'border-white/10 text-[#7eefff]'}`}>
        <FlipHorizontal2 size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`${TITLE} block text-white`}>Mirror Mode</span>
        <span className="mt-0.5 block text-[10px] leading-snug text-white/55">
          Every track flipped left to right, with its own records
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2" aria-hidden="true">
        <span className={`font-mono text-[10px] font-black uppercase tracking-[0.16em] ${enabled ? 'text-[#ffd34f]' : 'text-white/45'}`}>
          {enabled ? 'On' : 'Off'}
        </span>
        <span
          className={`relative h-6 w-11 rounded-full border transition-colors duration-200 ${
            enabled ? 'border-[#ffd34f]/80 bg-[#ffd34f]/35' : 'border-white/20 bg-black/40'
          }`}
        >
          <span
            className={`absolute top-[2px] h-[18px] w-[18px] rounded-full transition-all duration-200 ${
              enabled ? 'left-[22px] bg-[#ffd34f] shadow-[0_0_10px_rgba(255,211,79,0.8)]' : 'left-[2px] bg-white/70'
            }`}
          />
        </span>
      </span>
    </button>
  );
};

// Shown on the Grand Prix podium the moment a cup win unlocks the mode.
export const MirrorUnlockedNote = () => (
  <div
    className="mx-auto mt-4 inline-flex items-center gap-2 rounded-xl border border-[#7eefff]/40 bg-[#7eefff]/10 px-4 py-2 font-mono text-[11px] font-black uppercase tracking-[0.14em] text-[#7eefff] shadow-[0_0_28px_-10px_rgba(126,239,255,0.8)]"
    data-testid="race-cup-mirror-unlocked"
    role="status"
  >
    <FlipHorizontal2 size={14} />
    Mirror Mode unlocked · switch it on in Race Setup
  </div>
);
