import { useEffect, useState } from 'react';
import { sumEntries } from '../lib/foodHelpers.js';

export const TemplateSaveModal = ({ isOpen, meal, entries, onSave, onClose }) => {
  const [name, setName] = useState('');
  const totals = sumEntries(entries);
  const mealLabel = meal ? `${meal[0].toUpperCase()}${meal.slice(1)}` : '';

  useEffect(() => {
    if (isOpen) setName('');
  }, [isOpen]);

  if (!isOpen) return null;

  const canSave = name.trim().length >= 2;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-ink border-t border-gold/20 p-5 space-y-4 safe-bottom">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-gold">
          Save {mealLabel} as template
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name this template (e.g. Usual oats bowl)"
          className="w-full bg-ink/60 border border-bone/[0.08] px-4 py-3 text-bone text-base focus:border-gold/60 focus:outline-none placeholder:text-bone/20"
        />
        <div className="grid grid-cols-4 gap-1 border border-bone/[0.06]">
          {[
            { label: 'Items', v: entries.length },
            { label: 'Cal', v: Math.round(totals.cal) },
            { label: 'P', v: `${Math.round(totals.p)}g` },
            { label: 'C', v: `${Math.round(totals.c)}g` },
          ].map((metric) => (
            <div
              key={metric.label}
              className="p-3 text-center border-r border-bone/[0.06] last:border-0"
            >
              <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-stone">
                {metric.label}
              </div>
              <div className="font-mono tabular-nums text-bone mt-1.5 text-sm">{metric.v}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-bone/15 text-bone/80 font-mono text-[11px] uppercase tracking-[0.22em] active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(name.trim(), meal, entries)}
            disabled={!canSave}
            className="flex-[2] py-3 bg-gold text-ink font-mono text-[11px] uppercase tracking-[0.22em] disabled:opacity-40 active:scale-[0.98]"
          >
            Save template
          </button>
        </div>
      </div>
    </>
  );
};
