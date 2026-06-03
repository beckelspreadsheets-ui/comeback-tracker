import { Card, SectionTitle, NumInput } from '../components/primitives.jsx';
import { deriveGameProfile, GAME_AVATARS } from '../game/gameProfile.js';
import { RACE_UPGRADES, normalizeRaceGarage, upgradeCost } from '../game/raceProgression.js';
import { LIFTS } from '../lib/program.js';
import { round5 } from '../lib/utils.js';
import { clearAllData } from '../hooks/usePersistedState.js';
import { Car, Flag, Gauge, Palette, ShoppingCart, Sparkles, Trash2, Zap } from 'lucide-react';

const DEFAULT_HUB_COSMETICS = {
  bannerSet: 'classic',
  kartPaint: 'nova',
  trailColor: '#ffd34f',
};

const TRAIL_COLORS = [
  { key: 'gold', label: 'Gold', value: '#ffd34f' },
  { key: 'cyan', label: 'Cyan', value: '#49d9ff' },
  { key: 'green', label: 'Green', value: '#71f09a' },
  { key: 'purple', label: 'Purple', value: '#c879ff' },
];

const BANNER_SETS = [
  { key: 'classic', label: 'Classic' },
  { key: 'neon', label: 'Neon' },
  { key: 'race', label: 'Race' },
];

export const SettingsScreen = ({ state, setState }) => {
  const update = (key, val) => setState((s) => ({ ...s, settings: { ...s.settings, [key]: val } }));
  const updateRM = (key, val) => setState((s) => ({ ...s, oneRMs: { ...s.oneRMs, [key]: val } }));
  const profile = deriveGameProfile(state);
  const raceGarage = profile.race?.garage || normalizeRaceGarage(state.game?.raceGarage);
  const raceCredits = Number(profile.race?.credits) || 0;
  const hubCosmetics = {
    ...DEFAULT_HUB_COSMETICS,
    ...(state.game?.hub?.cosmetics || {}),
  };
  const hubReducedMotion = Boolean(state.game?.hub?.reducedMotion);
  const updateHubSettings = (patch) =>
    setState((s) => {
      const game = s.game || {};
      const hub = game.hub || {};
      return {
        ...s,
        game: {
          ...game,
          hub: {
            ...hub,
            ...patch,
          },
        },
      };
    });
  const purchaseRaceUpgrade = (upgrade) =>
    setState((s) => {
      const currentProfile = deriveGameProfile(s);
      const currentGarage = normalizeRaceGarage(s.game?.raceGarage);
      const level = Math.min(
        upgrade.maxLevel,
        Math.max(0, Number(currentGarage.upgrades[upgrade.key]) || 0)
      );
      const cost = upgradeCost(upgrade, level);
      if (level >= upgrade.maxLevel || currentProfile.race.credits < cost) return s;
      return {
        ...s,
        game: {
          ...(s.game || {}),
          raceGarage: {
            ...currentGarage,
            spentCredits: currentGarage.spentCredits + cost,
            upgrades: {
              ...currentGarage.upgrades,
              [upgrade.key]: level + 1,
            },
          },
        },
      };
    });
  const updateHubCosmetics = (patch) =>
    setState((s) => {
      const game = s.game || {};
      const hub = game.hub || {};
      return {
        ...s,
        game: {
          ...game,
          hub: {
            ...hub,
            cosmetics: {
              ...DEFAULT_HUB_COSMETICS,
              ...(hub.cosmetics || {}),
              ...patch,
            },
          },
        },
      };
    });

  const handleReset = () => {
    if (window.confirm('Clear ALL data? This cannot be undone. (Export first if you want a backup.)')) {
      clearAllData();
    }
  };

  return (
    <div className="space-y-10">
      <SectionTitle
        eyebrow="Settings"
        title="City Garage & Body"
        desc="Tune your kart, spend race credits, and keep the metrics that drive training targets current."
      />

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-gold">
              City Garage
            </div>
            <div className="mt-1 text-xs text-stone">Kart style, race credits, and tuning</div>
          </div>
          <Car size={20} className="text-gold" />
        </div>

        <div className="space-y-5">
          <div className="grid gap-3 border border-bone/[0.08] bg-ink/50 p-3 sm:grid-cols-[140px_1fr]">
            <div className="border border-gold/20 bg-gold/[0.06] p-3">
              <div className="flex items-center gap-2 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-gold">
                <ShoppingCart size={12} />
                Credits
              </div>
              <div className="mt-2 font-display text-3xl leading-none text-gold" data-testid="garage-race-credits">
                {raceCredits}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {RACE_UPGRADES.map((upgrade) => {
                const level = Math.min(
                  upgrade.maxLevel,
                  Math.max(0, Number(raceGarage.upgrades?.[upgrade.key]) || 0)
                );
                const cost = upgradeCost(upgrade, level);
                const maxed = level >= upgrade.maxLevel;
                return (
                  <div key={upgrade.key} className="border border-bone/[0.08] bg-ink/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-[10px] font-black uppercase tracking-[0.14em] text-bone">
                          {upgrade.name}
                        </div>
                        <div className="mt-1 truncate font-mono text-[8px] uppercase tracking-[0.12em] text-stone">
                          {upgrade.stat} {level}/{upgrade.maxLevel}
                        </div>
                      </div>
                      <Gauge size={13} className="shrink-0 text-gold" />
                    </div>
                    <div className="mt-3 grid grid-cols-6 gap-1">
                      {Array.from({ length: upgrade.maxLevel }).map((_, index) => (
                        <span
                          key={index}
                          className={`h-1.5 ${index < level ? 'bg-gold' : 'bg-bone/[0.1]'}`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => purchaseRaceUpgrade(upgrade)}
                      disabled={maxed || raceCredits < cost}
                      data-testid={`garage-upgrade-${upgrade.key}`}
                      className="mt-3 flex min-h-[34px] w-full items-center justify-center gap-1.5 border border-gold/35 px-2 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-gold transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Zap size={11} />
                      {maxed ? 'Max' : `Buy ${cost}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-stone">
              <Palette size={12} />
              Kart paint
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GAME_AVATARS.map((avatar) => {
                const active = hubCosmetics.kartPaint === avatar.key;
                return (
                  <button
                    key={avatar.key}
                    type="button"
                    data-testid={`garage-paint-${avatar.key}`}
                    onClick={() => updateHubCosmetics({ kartPaint: avatar.key })}
                    className={`flex min-h-[48px] items-center gap-2 border px-3 py-2 text-left transition-colors ${
                      active
                        ? 'border-gold bg-gold/[0.08] text-bone'
                        : 'border-bone/[0.08] bg-ink/50 text-stone hover:border-gold/40 hover:text-bone'
                    }`}
                  >
                    <span
                      className="h-5 w-5 shrink-0 border border-bone/20"
                      style={{ backgroundColor: avatar.chassis }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[10px] font-black uppercase tracking-[0.14em]">
                        {avatar.name}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[8px] uppercase tracking-[0.12em] text-stone">
                        {avatar.role}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-stone">
                <Zap size={12} />
                Trail
              </div>
              <div className="grid grid-cols-4 gap-2">
                {TRAIL_COLORS.map((color) => {
                  const active = hubCosmetics.trailColor === color.value;
                  return (
                    <button
                      key={color.key}
                      type="button"
                      aria-label={`${color.label} trail`}
                      data-testid={`garage-trail-${color.key}`}
                      onClick={() => updateHubCosmetics({ trailColor: color.value })}
                      className={`grid h-11 place-items-center border transition-colors ${
                        active ? 'border-gold bg-gold/[0.08]' : 'border-bone/[0.08] bg-ink/50 hover:border-gold/40'
                      }`}
                    >
                      <span className="h-5 w-5 border border-bone/20" style={{ backgroundColor: color.value }} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-stone">
                <Flag size={12} />
                Banners
              </div>
              <div className="grid grid-cols-3 gap-2">
                {BANNER_SETS.map((set) => {
                  const active = hubCosmetics.bannerSet === set.key;
                  return (
                    <button
                      key={set.key}
                      type="button"
                      data-testid={`garage-banner-${set.key}`}
                      onClick={() => updateHubCosmetics({ bannerSet: set.key })}
                      className={`flex min-h-[44px] items-center justify-center gap-1.5 border px-2 font-mono text-[9px] font-black uppercase tracking-[0.14em] transition-colors ${
                        active
                          ? 'border-gold bg-gold/[0.08] text-gold'
                          : 'border-bone/[0.08] bg-ink/50 text-stone hover:border-gold/40 hover:text-bone'
                      }`}
                    >
                      <Sparkles size={11} />
                      {set.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border border-bone/[0.08] bg-ink/50 px-3 py-3">
            <label htmlFor="garage-reduced-motion" className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center border border-bone/[0.08] bg-ink/70 text-gold">
                <Zap size={14} />
              </span>
              <span className="min-w-0">
                <span className="block font-mono text-[10px] font-black uppercase tracking-[0.14em] text-bone">
                  Reduced motion
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-stone">
                  Slow city camera, portal, and reward animation.
                </span>
              </span>
            </label>
            <input
              id="garage-reduced-motion"
              type="checkbox"
              checked={hubReducedMotion}
              data-testid="garage-reduced-motion"
              onChange={(event) => updateHubSettings({ reducedMotion: event.target.checked })}
              className="h-5 w-5 shrink-0 accent-gold"
            />
          </div>
        </div>
      </Card>

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
