import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, Camera, Pencil, BookMarked, Loader2, WifiOff } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner.jsx';
import { searchFoods, lookupBarcode, isOnline, hasUsdaKey } from '../lib/foodApi.js';
import { makeEntryId, MEAL_BUCKETS } from '../lib/foodHelpers.js';

const TABS = [
  { key: 'library', label: 'Library', icon: BookMarked },
  { key: 'search', label: 'Search', icon: Search },
  { key: 'scan', label: 'Scan', icon: Camera },
  { key: 'manual', label: 'Manual', icon: Pencil },
];

const emptyManual = {
  name: '',
  cal: '',
  p: '',
  c: '',
  f: '',
  servingDesc: '1 serving',
};

// Bottom sheet modal for adding food to a meal bucket.
export const FoodEntrySheet = ({
  isOpen,
  meal,
  library = [],
  onAdd,
  onSaveToLibrary,
  onClose,
}) => {
  const [tab, setTab] = useState('library');
  const [mode, setMode] = useState('browse'); // 'browse' | 'edit'

  const [libQuery, setLibQuery] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');

  const [draft, setDraft] = useState(null); // food being edited
  const [servings, setServings] = useState(1);
  const [saveToLib, setSaveToLib] = useState(false);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLookup, setScanLookup] = useState(false);
  const [manual, setManual] = useState(emptyManual);

  const abortRef = useRef(null);

  // Reset state whenever the sheet opens.
  useEffect(() => {
    if (isOpen) {
      setTab('library');
      setMode('browse');
      setLibQuery('');
      setQuery('');
      setResults([]);
      setSearching(false);
      setSearchErr('');
      setDraft(null);
      setServings(1);
      setSaveToLib(false);
      setScannerOpen(false);
      setScanLookup(false);
      setManual(emptyManual);
    }
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [isOpen]);

  // Debounced OFF search
  useEffect(() => {
    if (tab !== 'search' || mode !== 'browse') return;
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setSearchErr('');
      return;
    }
    if (!isOnline()) {
      setResults([]);
      setSearchErr('offline');
      return;
    }
    setSearching(true);
    setSearchErr('');
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const t = setTimeout(async () => {
      try {
        const r = await searchFoods(query, { signal: ctrl.signal });
        setResults(r);
      } catch (err) {
        if (err.name !== 'AbortError') setSearchErr('Search failed. Try again.');
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, tab, mode]);

  const libraryFiltered = useMemo(() => {
    const q = libQuery.trim().toLowerCase();
    const sorted = [...library].sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
    if (!q) return sorted;
    return sorted.filter((it) => (it.name || '').toLowerCase().includes(q));
  }, [library, libQuery]);

  const pickFood = (food) => {
    setDraft({
      name: food.name,
      cal: Number(food.cal) || 0,
      p: Number(food.p) || 0,
      c: Number(food.c) || 0,
      f: Number(food.f) || 0,
      servingDesc: food.servingDesc || '1 serving',
      barcode: food.barcode || '',
      itemId: food.id || undefined,
      source: food.source || 'library',
    });
    setServings(1);
    setSaveToLib(food.source !== 'library' && !food.id);
    setMode('edit');
  };

  const mealLabel = MEAL_BUCKETS.find((b) => b.key === meal)?.label || '';

  const handleConfirmAdd = () => {
    if (!draft) return;
    const entry = {
      id: makeEntryId(),
      itemId: draft.itemId,
      name: draft.name,
      cal: Number(draft.cal) || 0,
      p: Number(draft.p) || 0,
      c: Number(draft.c) || 0,
      f: Number(draft.f) || 0,
      servings: Number(servings) || 1,
      servingDesc: draft.servingDesc,
      at: Date.now(),
    };
    onAdd(entry);
    if (saveToLib) {
      onSaveToLibrary({
        name: draft.name,
        cal: entry.cal,
        p: entry.p,
        c: entry.c,
        f: entry.f,
        servingDesc: draft.servingDesc,
        barcode: draft.barcode,
      });
    }
    onClose();
  };

  const handleManualSubmit = () => {
    if (!manual.name.trim() || !manual.cal) return;
    const food = {
      name: manual.name.trim(),
      cal: Number(manual.cal) || 0,
      p: Number(manual.p) || 0,
      c: Number(manual.c) || 0,
      f: Number(manual.f) || 0,
      servingDesc: manual.servingDesc || '1 serving',
      source: 'manual',
    };
    setSaveToLib(true); // default to saving manual entries
    pickFood(food);
  };

  const handleBarcodeDetected = async (code) => {
    setScannerOpen(false);
    setScanLookup(true);
    try {
      const food = await lookupBarcode(code);
      if (food) {
        pickFood(food);
      } else {
        // fall back to manual, prefill barcode
        setManual({ ...emptyManual, name: '', servingDesc: '1 serving' });
        setTab('manual');
        alert(`Barcode ${code} not found in OpenFoodFacts. Enter manually.`);
      }
    } catch (err) {
      alert('Barcode lookup failed. Check your connection.');
    } finally {
      setScanLookup(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm animate-[fadeIn_0.18s_ease-out]"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-ink border-t border-gold/20 max-h-[92vh] flex flex-col animate-[slideUp_0.22s_ease-out] safe-bottom">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-bone/[0.06] shrink-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-gold">
            Add to {mealLabel}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-stone hover:text-bone active:scale-95"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Edit stage — servings adjust + confirm */}
        {mode === 'edit' && draft && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="border border-bone/[0.06] p-4">
              <div className="font-display text-xl text-bone leading-tight">{draft.name}</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone mt-1">
                {draft.servingDesc} · {draft.source}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone block mb-2">
                Servings
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setServings((s) => Math.max(0.25, Number((s - 0.25).toFixed(2))))}
                  className="w-11 h-11 border border-bone/10 text-bone font-mono active:scale-95"
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.25"
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value) || 0)}
                  className="flex-1 text-center bg-ink/60 border border-bone/[0.08] px-4 py-3 text-bone text-base font-mono tabular-nums focus:border-gold/60 focus:outline-none"
                />
                <button
                  onClick={() => setServings((s) => Number((s + 0.25).toFixed(2)))}
                  className="w-11 h-11 border border-bone/10 text-bone font-mono active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1 border border-bone/[0.06]">
              {[
                { label: 'Cal', v: Math.round(draft.cal * servings) },
                { label: 'P', v: Math.round(draft.p * servings) + 'g' },
                { label: 'C', v: Math.round(draft.c * servings) + 'g' },
                { label: 'F', v: Math.round(draft.f * servings) + 'g' },
              ].map((m) => (
                <div key={m.label} className="p-3 text-center border-r border-bone/[0.06] last:border-0">
                  <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-stone">
                    {m.label}
                  </div>
                  <div className="font-mono tabular-nums text-bone mt-1.5 text-sm">{m.v}</div>
                </div>
              ))}
            </div>

            {draft.source !== 'library' && (
              <label className="flex items-center gap-3 text-sm text-bone/80 py-2 cursor-pointer select-none min-h-[44px]">
                <input
                  type="checkbox"
                  checked={saveToLib}
                  onChange={(e) => setSaveToLib(e.target.checked)}
                  className="w-4 h-4 accent-gold"
                />
                Save to library for quick re-logging
              </label>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setMode('browse');
                  setDraft(null);
                }}
                className="flex-1 py-3 border border-bone/15 text-bone/80 font-mono text-[11px] uppercase tracking-[0.22em] active:scale-[0.98] min-h-[44px]"
              >
                Back
              </button>
              <button
                onClick={handleConfirmAdd}
                className="flex-[2] py-3 bg-gold text-ink font-mono text-[11px] uppercase tracking-[0.22em] active:scale-[0.98] min-h-[44px]"
              >
                Add to {mealLabel}
              </button>
            </div>
          </div>
        )}

        {/* Browse stage */}
        {mode === 'browse' && (
          <>
            {/* Tabs */}
            <div className="grid grid-cols-4 border-b border-bone/[0.06] shrink-0">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      setTab(t.key);
                      if (t.key === 'scan') setScannerOpen(true);
                    }}
                    className={`flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors relative ${
                      active ? 'text-gold' : 'text-stone hover:text-bone/70'
                    }`}
                  >
                    <Icon size={16} strokeWidth={active ? 2.25 : 1.75} />
                    <span className="text-[9px] font-mono uppercase tracking-[0.22em]">{t.label}</span>
                    {active && <div className="absolute top-0 h-px w-8 bg-gold" />}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* LIBRARY TAB */}
              {tab === 'library' && (
                <div className="p-4 space-y-3">
                  <input
                    type="text"
                    value={libQuery}
                    onChange={(e) => setLibQuery(e.target.value)}
                    placeholder="Search library…"
                    className="w-full bg-ink/60 border border-bone/[0.08] px-4 py-3 text-bone text-base focus:border-gold/60 focus:outline-none placeholder:text-bone/20"
                  />
                  {libraryFiltered.length === 0 && (
                    <div className="text-xs text-stone text-center py-8">
                      {library.length === 0
                        ? 'No saved foods yet. Add from Search, Scan, or Manual entry.'
                        : 'No matches.'}
                    </div>
                  )}
                  <div className="divide-y divide-bone/[0.06]">
                    {libraryFiltered.map((it) => (
                      <button
                        key={it.id}
                        onClick={() => pickFood({ ...it, source: 'library' })}
                        className="w-full text-left py-3 px-1 active:bg-bone/[0.02] min-h-[56px]"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="font-display text-base text-bone leading-tight truncate">
                            {it.name}
                          </div>
                          <div className="font-mono text-xs text-gold tabular-nums shrink-0">
                            {Math.round(it.cal)} kcal
                          </div>
                        </div>
                        <div className="flex items-baseline justify-between mt-1">
                          <div className="text-[10px] font-mono text-stone">{it.servingDesc}</div>
                          <div className="text-[10px] font-mono text-stone tabular-nums">
                            P {Math.round(it.p)} · C {Math.round(it.c)} · F {Math.round(it.f)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SEARCH TAB */}
              {tab === 'search' && (
                <div className="p-4 space-y-3">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-stone pointer-events-none"
                    />
                    <input
                      type="text"
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search OpenFoodFacts…"
                      className="w-full bg-ink/60 border border-bone/[0.08] pl-9 pr-4 py-3 text-bone text-base focus:border-gold/60 focus:outline-none placeholder:text-bone/20"
                    />
                  </div>
                  {!isOnline() && (
                    <div className="flex items-center gap-2 text-xs text-vermillion">
                      <WifiOff size={12} /> Offline — use library or manual entry.
                    </div>
                  )}
                  {hasUsdaKey() && (
                    <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-stone/70">
                      OFF + USDA enabled
                    </div>
                  )}
                  {searching && (
                    <div className="flex items-center gap-2 text-xs text-stone">
                      <Loader2 size={12} className="animate-spin" /> Searching…
                    </div>
                  )}
                  {searchErr && <div className="text-xs text-vermillion">{searchErr}</div>}
                  <div className="divide-y divide-bone/[0.06]">
                    {results.map((r, i) => (
                      <button
                        key={`${r.barcode || r.name}-${i}`}
                        onClick={() => pickFood(r)}
                        className="w-full text-left py-3 px-1 active:bg-bone/[0.02] min-h-[56px]"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="font-display text-base text-bone leading-tight truncate">
                            {r.name}
                          </div>
                          <div className="font-mono text-xs text-gold tabular-nums shrink-0">
                            {Math.round(r.cal)} kcal
                          </div>
                        </div>
                        <div className="flex items-baseline justify-between mt-1">
                          <div className="text-[10px] font-mono text-stone truncate">
                            {r.brand || '—'} · {r.servingDesc}
                          </div>
                          <div className="text-[10px] font-mono text-stone tabular-nums shrink-0">
                            P {r.p} · C {r.c} · F {r.f}
                          </div>
                        </div>
                      </button>
                    ))}
                    {!searching && query.length >= 2 && results.length === 0 && !searchErr && (
                      <div className="text-xs text-stone text-center py-8">No results.</div>
                    )}
                  </div>
                </div>
              )}

              {/* SCAN TAB — the actual camera lives in an overlay */}
              {tab === 'scan' && (
                <div className="p-6 text-center space-y-4">
                  {scanLookup ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-stone">
                      <Loader2 size={12} className="animate-spin" /> Looking up barcode…
                    </div>
                  ) : (
                    <>
                      <Camera size={22} className="text-gold mx-auto" />
                      <p className="text-sm text-stone leading-relaxed max-w-xs mx-auto">
                        Point your camera at a product barcode.
                      </p>
                      <button
                        onClick={() => setScannerOpen(true)}
                        className="px-6 py-3 bg-gold text-ink font-mono text-[11px] uppercase tracking-[0.22em] active:scale-[0.98] min-h-[44px]"
                      >
                        Open scanner
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* MANUAL TAB */}
              {tab === 'manual' && (
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone block mb-1.5">
                      Name
                    </label>
                    <input
                      type="text"
                      value={manual.name}
                      onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
                      className="w-full bg-ink/60 border border-bone/[0.08] px-4 py-3 text-bone text-base focus:border-gold/60 focus:outline-none placeholder:text-bone/20"
                      placeholder="e.g. Chicken breast"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone block mb-1.5">
                      Serving
                    </label>
                    <input
                      type="text"
                      value={manual.servingDesc}
                      onChange={(e) => setManual((m) => ({ ...m, servingDesc: e.target.value }))}
                      className="w-full bg-ink/60 border border-bone/[0.08] px-4 py-3 text-bone text-base focus:border-gold/60 focus:outline-none placeholder:text-bone/20"
                      placeholder="e.g. 4oz or 1 cup"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { k: 'cal', label: 'Cal' },
                      { k: 'p', label: 'P (g)' },
                      { k: 'c', label: 'C (g)' },
                      { k: 'f', label: 'F (g)' },
                    ].map((f) => (
                      <div key={f.k}>
                        <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone block mb-1.5">
                          {f.label}
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={manual[f.k]}
                          onChange={(e) => setManual((m) => ({ ...m, [f.k]: e.target.value }))}
                          className="w-full bg-ink/60 border border-bone/[0.08] px-2 py-3 text-bone text-base font-mono tabular-nums focus:border-gold/60 focus:outline-none placeholder:text-bone/20"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleManualSubmit}
                    disabled={!manual.name.trim() || !manual.cal}
                    className="w-full py-3 bg-gold text-ink font-mono text-[11px] uppercase tracking-[0.22em] disabled:opacity-40 active:scale-[0.98] min-h-[44px]"
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {scannerOpen && (
        <BarcodeScanner
          onDetect={handleBarcodeDetected}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </>
  );
};
