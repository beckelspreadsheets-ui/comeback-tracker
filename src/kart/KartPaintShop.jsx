// Unlocks & progress — the menu half. The wallet chip for the setup header,
// the paint row under the select stage, and the "+N ₿" toast that greets the
// player back from a finished race. All the rules (prices, ownership, what a
// finish pays) live in src/game/race/progress.js; this file only draws them.
//
// Touch-first: every swatch is a full-column button (>= 76px tall), the
// confirm buttons are 44px, and buying never uses window.confirm — WKWebView
// can swallow it, so the confirm is an inline strip under the swatches.
import { useEffect, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import {
  DEFAULT_PAINT_ID,
  KART_PAINTS,
  describeEarnings,
  equippedPaintId,
  paintById,
} from '../game/race/progress.js';

// Swatch faces. Most paints are a glossy dot of their tint; the two metals get
// a metal sweep, and Factory shows the racer's own colour as a two-tone livery
// (it IS the racer's colour on the body, over the kart's bake).
const GLOSS = 'radial-gradient(circle at 32% 26%, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0) 34%), radial-gradient(circle at 72% 82%, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 58%)';
const SWATCH_FACES = {
  'midnight-gold': `${GLOSS}, linear-gradient(140deg, #fff0a8 0%, #ffc72e 38%, #a86d06 70%, #ffd75a 100%)`,
  'satoshi-silver': `${GLOSS}, linear-gradient(140deg, #ffffff 0%, #d0d9e6 36%, #7c879a 68%, #eef2f8 100%)`,
};
const swatchFace = (entry, racerColor) => {
  if (entry.id === DEFAULT_PAINT_ID) {
    return `${GLOSS}, linear-gradient(135deg, ${racerColor} 0%, ${racerColor} 50%, #dfe5ee 50%, #8f99aa 100%)`;
  }
  return SWATCH_FACES[entry.id] || `${GLOSS}, ${entry.tint}`;
};
const textColorFor = (entry, racerColor) => (entry.id === DEFAULT_PAINT_ID ? racerColor : entry.tint);

export const WalletChip = ({ coins, pulse = false }) => (
  <div
    aria-label={`${coins} ₿ coins`}
    className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[#ffd34f]/55 bg-[#0b0f1a]/70 px-3.5 font-mono text-[14px] font-black tabular-nums text-[#ffd34f] backdrop-blur-md transition-shadow duration-500 ${
      pulse
        ? 'shadow-[0_0_34px_-4px_rgba(255,211,79,0.95)] ring-2 ring-[#ffd34f]/60'
        : 'shadow-[0_0_24px_-10px_rgba(255,211,79,0.8)]'
    }`}
    data-testid="race-wallet"
    title="₿ coins — earned by finishing races"
  >
    <span aria-hidden="true">₿</span>
    <span data-testid="race-wallet-coins">{coins}</span>
  </div>
);

// Controlled by KartApp: `previewId` is a LOCKED paint the player tapped,
// shown on the 3D stage while the confirm strip is open (try before you buy).
// Tapping an owned paint equips it straight away.
export const PaintShop = ({ kartKey, kartName, onBuy, onEquip, onPreview, paints, previewId, racerColor, walletCoins }) => {
  const equippedId = equippedPaintId(paints, kartKey);
  const owned = new Set(paints?.owned || [DEFAULT_PAINT_ID]);
  const pending = previewId && !owned.has(previewId) ? paintById(previewId) : null;
  const [justBought, setJustBought] = useState(null);

  // The preview belongs to this screen: leaving it (Start Race) drops it, so
  // the next visit opens on what is actually equipped.
  useEffect(() => () => onPreview(null), [onPreview]);
  useEffect(() => {
    if (!justBought) return undefined;
    const timer = window.setTimeout(() => setJustBought(null), 2800);
    return () => window.clearTimeout(timer);
  }, [justBought]);

  const tap = (entry) => {
    setJustBought(null);
    if (owned.has(entry.id)) {
      onPreview(null);
      if (entry.id !== equippedId) onEquip(kartKey, entry.id);
      return;
    }
    // Second tap on the paint being previewed closes the strip.
    onPreview(previewId === entry.id ? null : entry.id);
  };
  const buy = () => {
    if (!pending) return;
    const result = onBuy(kartKey, pending.id);
    if (result?.ok) {
      setJustBought(pending.id);
      onPreview(null);
    }
  };

  const affordable = pending ? walletCoins >= pending.price : false;
  const bought = justBought ? paintById(justBought) : null;
  return (
    <section
      aria-label={`Paint for ${kartName}`}
      className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.95)] ring-1 ring-inset ring-white/[0.07] backdrop-blur-xl sm:p-4"
      data-testid="race-paint-shop"
    >
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
        <h3 className="font-mono text-[13px] font-black uppercase tracking-[0.2em] text-white/90">
          Paint <span className="text-white/45">·</span> <span className="text-[#7eefff]">{kartName}</span>
        </h3>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">
          Finish races to earn ₿ · paints unlock for every kart
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8" role="group" aria-label="Paint swatches">
        {KART_PAINTS.map((entry) => {
          const isOwned = owned.has(entry.id);
          const isEquipped = entry.id === equippedId;
          const isPreview = entry.id === previewId && !isOwned;
          const canAfford = walletCoins >= entry.price;
          const status = isEquipped
            ? 'equipped'
            : isOwned
              ? 'owned, tap to equip'
              : `locked, costs ${entry.price} coins${canAfford ? '' : `, you need ${entry.price - walletCoins} more`}`;
          return (
            <button
              aria-label={`${entry.name}${entry.id === DEFAULT_PAINT_ID ? ' (your racer’s colour)' : ''}: ${status}`}
              aria-pressed={isEquipped}
              className={`flex min-h-[82px] flex-col items-center justify-start gap-2 rounded-xl px-0.5 pb-1.5 pt-2.5 text-center outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#7eefff] ${
                isEquipped ? 'bg-[#ffd34f]/[0.12]' : isPreview ? 'bg-white/[0.08]' : 'hover:bg-white/[0.06]'
              }`}
              data-equipped={isEquipped ? '1' : '0'}
              data-owned={isOwned ? '1' : '0'}
              data-testid={`race-paint-${entry.id}`}
              key={entry.id}
              onClick={() => tap(entry)}
              type="button"
            >
              <span
                className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full shadow-[inset_0_-3px_6px_rgba(0,0,0,0.35),0_6px_14px_-6px_rgba(0,0,0,0.9)] transition-transform duration-200 ${
                  isEquipped
                    ? 'scale-110 ring-2 ring-[#ffd34f] ring-offset-2 ring-offset-[#151b28]'
                    : isPreview
                      ? 'scale-105 outline-dashed outline-2 outline-offset-[3px] outline-[#7eefff]'
                      : 'ring-1 ring-white/25'
                }`}
                style={{ background: swatchFace(entry, racerColor) }}
              >
                {!isOwned ? (
                  <span className="grid h-full w-full place-items-center rounded-full bg-[#070a12]/30">
                    <Lock aria-hidden="true" className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" size={15} strokeWidth={2.6} />
                  </span>
                ) : null}
                {isEquipped ? (
                  <span className="absolute -right-1 -top-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-[#ffd34f] text-[#10151d] shadow-[0_0_10px_rgba(255,211,79,0.9)]">
                    <Check aria-hidden="true" size={12} strokeWidth={3.2} />
                  </span>
                ) : null}
              </span>
              <span className="-mb-1 font-mono text-[9px] font-black uppercase leading-[1.15] tracking-[0.06em] text-white/85">
                {entry.name}
              </span>
              <span
                className={`font-mono text-[9px] font-bold uppercase tracking-[0.1em] ${
                  isEquipped ? 'text-[#ffd34f]' : isOwned ? 'text-white/45' : canAfford ? 'text-[#ffd34f]' : 'text-white/35'
                }`}
              >
                {isEquipped ? 'Equipped' : isOwned ? 'Owned' : `₿ ${entry.price}`}
              </span>
            </button>
          );
        })}
      </div>
      {pending ? (
        <div
          aria-live="polite"
          className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-3.5 py-2 ${
            affordable ? 'border-[#ffd34f]/45 bg-[#ffd34f]/[0.08]' : 'border-white/15 bg-black/30'
          }`}
          data-testid="race-paint-confirm-strip"
        >
          <span className="min-w-0 flex-1 text-[12px] leading-snug text-white/80">
            {affordable ? (
              <>
                Unlock <b style={{ color: textColorFor(pending, racerColor) }}>{pending.name}</b> for{' '}
                <b className="text-[#ffd34f]">₿ {pending.price}</b>? Previewing it on your kart now.
              </>
            ) : (
              <>
                <b style={{ color: textColorFor(pending, racerColor) }}>{pending.name}</b> costs{' '}
                <b className="text-[#ffd34f]">₿ {pending.price}</b> — you need <b className="text-white">₿ {pending.price - walletCoins}</b>{' '}
                more. Grab coins and podium finishes to earn it.
              </>
            )}
          </span>
          <span className="flex shrink-0 gap-2">
            <button
              className="min-h-[44px] rounded-lg border border-white/20 bg-white/[0.06] px-4 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-white/75 transition-colors hover:bg-white/[0.12]"
              data-testid="race-paint-cancel"
              onClick={() => onPreview(null)}
              type="button"
            >
              {affordable ? 'Not now' : 'OK'}
            </button>
            {affordable ? (
              <button
                className="min-h-[44px] rounded-lg border border-[#ffd34f]/80 bg-gradient-to-b from-[#ffd34f]/35 to-[#ffb52e]/15 px-5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#ffe9a8] shadow-[0_0_24px_-8px_rgba(255,211,79,0.85)] transition-all hover:from-[#ffd34f]/50 hover:text-white active:translate-y-px"
                data-testid="race-paint-confirm"
                onClick={buy}
                type="button"
              >
                Unlock · ₿ {pending.price}
              </button>
            ) : null}
          </span>
        </div>
      ) : bought ? (
        <div
          aria-live="polite"
          className="mt-3 rounded-xl border border-[#9ff5d0]/35 bg-[#9ff5d0]/[0.08] px-3.5 py-2.5 text-[12px] text-white/85"
          data-testid="race-paint-bought"
        >
          <b style={{ color: textColorFor(bought, racerColor) }}>{bought.name}</b> unlocked — it’s on your {kartName}, and
          every other kart can wear it too.
        </div>
      ) : null}
    </section>
  );
};

// "+N ₿" on the way back into the menu. Tap to dismiss; it leaves on its own.
export const EarningsToast = ({ onDone, summary }) => {
  const { parts, total } = describeEarnings(summary);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const enter = window.requestAnimationFrame(() => setShown(true));
    const leave = window.setTimeout(() => setShown(false), 4600);
    const done = window.setTimeout(onDone, 5100);
    return () => {
      window.cancelAnimationFrame(enter);
      window.clearTimeout(leave);
      window.clearTimeout(done);
    };
  }, [onDone, summary]);
  if (!total) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex justify-center px-4"
      role="status"
    >
      <button
        aria-label={`Earned ${total} coins: ${parts.join(', ')}. Dismiss.`}
        className={`pointer-events-auto rounded-2xl border border-[#ffd34f]/60 bg-[#0d1220]/90 px-6 py-2.5 text-center shadow-[0_0_44px_-10px_rgba(255,211,79,0.85),0_24px_60px_-24px_rgba(0,0,0,0.95)] backdrop-blur-xl transition-all duration-500 motion-reduce:transition-none ${
          shown ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        }`}
        data-testid="race-earnings-toast"
        onClick={onDone}
        type="button"
      >
        <span className="block font-mono text-[26px] font-black leading-none tracking-[0.02em] text-[#ffd34f] drop-shadow-[0_0_18px_rgba(255,211,79,0.6)]">
          +{total} ₿
        </span>
        <span className="mt-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
          {parts.join(' · ')}
        </span>
      </button>
    </div>
  );
};
