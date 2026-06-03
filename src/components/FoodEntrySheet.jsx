import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Search,
  Camera,
  Pencil,
  BookMarked,
  Loader2,
  WifiOff,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner.jsx';
import { searchFoods, lookupBarcode, isOnline, hasUsdaKey } from '../lib/foodApi.js';
import {
  hasRestaurantKey,
  searchRestaurants,
  fetchItemDetails,
} from '../lib/restaurantApi.js';
import { PORTION_CHIPS, CHIP_CATEGORIES } from '../lib/portionChips.js';
import { makeEntryId, MEAL_BUCKETS } from '../lib/foodHelpers.js';
import { parseAiMacros, AI_PROMPT } from '../lib/foodParse.js';

const TABS = [
  { key: 'library', label: 'Library', icon: BookMarked },
  { key: 'search', label: 'Search', icon: Search },
  { key: 'scan', label: 'Scan', icon: Camera },
  { key: 'rest', label: 'Rest.', icon: Utensils },
  { key: 'manual', label: 'Manual', icon: Pencil },
];

const emptyManual = {
  name: '',
  cal: '',
  p: '',
  c: '',
  f: '',
  servingDesc: '1 serving',
  unit: 'serving',
};

const DEFAULT_AMOUNT = { serving: 1, gram: 100 };
const STEP = { serving: 0.25, gram: 5 };
const MIN_AMOUNT = { serving: 0.25, gram: 0 };

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
  const [restQuery, setRestQuery] = useState('');
  const [restResults, setRestResults] = useState([]);
  const [restSearching, setRestSearching] = useState(false);
  const [restErr, setRestErr] = useState('');
  const [restPickingId, setRestPickingId] = useState('');

  const [draft, setDraft] = useState(null); // food being edited
  const [amount, setAmount] = useState(1);
  const [saveToLib, setSaveToLib] = useState(false);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLookup, setScanLookup] = useState(false);
  const [manual, setManual] = useState(emptyManual);

  const [pasteText, setPasteText] = useState('');
  const [parseErr, setParseErr] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);
  const pasteDetailsRef = useRef(null);

  const abortRef = useRef(null);
  const restaurantEnabled = hasRestaurantKey();
  const visibleTabs = restaurantEnabled ? TABS : TABS.filter((tabDef) => tabDef.key !== 'rest');
  const tabGridClass = restaurantEnabled ? 'grid-cols-5' : 'grid-cols-4';

  const getRestaurantError = (err, fallback = 'Restaurant search failed. Try again.') => {
    const message = err?.message;
    if (message === 'no-key') {
      console.warn('Restaurant search attempted without the FatSecret provider enabled.');
      return fallback;
    }
    if (message === 'offline') return 'offline';
    if (message === 'fatsecret-429' || message === 'fatsecret-api-429') {
      return 'Rate limited — try again later.';
    }
    if (message === 'fatsecret-api-14') {
      return 'FatSecret scope missing. Check API account access.';
    }
    if (message === 'fatsecret-api-21') {
      return 'FatSecret rejected this caller IP. Update the API IP allowlist or use a static-egress proxy.';
    }
    return fallback;
  };

  const cancelInFlight = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

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
      setRestQuery('');
      setRestResults([]);
      setRestSearching(false);
      setRestErr('');
      setRestPickingId('');
      setDraft(null);
      setAmount(1);
      setSaveToLib(false);
      setScannerOpen(false);
      setScanLookup(false);
      setManual(emptyManual);
      setPasteText('');
      setParseErr('');
      setPromptCopied(false);
    }
    return () => {
      cancelInFlight();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!restaurantEnabled && tab === 'rest') setTab('library');
  }, [restaurantEnabled, tab]);

  // Debounced OFF search
  useEffect(() => {
    if (tab !== 'search' || mode !== 'browse') return;
    if (!query.trim() || query.trim().length < 2) {
      cancelInFlight();
      setResults([]);
      setSearching(false);
      setSearchErr('');
      return;
    }
    if (!isOnline()) {
      cancelInFlight();
      setResults([]);
      setSearching(false);
      setSearchErr('offline');
      return;
    }
    setSearching(true);
    setSearchErr('');
    cancelInFlight();
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
      if (abortRef.current === ctrl) abortRef.current = null;
    };
  }, [query, tab, mode]);

  useEffect(() => {
    if (tab !== 'rest' || mode !== 'browse') return;
    if (!restQuery.trim() || restQuery.trim().length < 2) {
      cancelInFlight();
      setRestResults([]);
      setRestSearching(false);
      setRestErr('');
      return;
    }
    if (!isOnline()) {
      cancelInFlight();
      setRestResults([]);
      setRestSearching(false);
      setRestErr('offline');
      return;
    }
    setRestSearching(true);
    setRestErr('');
    cancelInFlight();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const t = setTimeout(async () => {
      try {
        const r = await searchRestaurants(restQuery, { signal: ctrl.signal });
        setRestResults(r);
      } catch (err) {
        if (err.name !== 'AbortError') setRestErr(getRestaurantError(err));
      } finally {
        setRestSearching(false);
      }
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
      if (abortRef.current === ctrl) abortRef.current = null;
    };
  }, [restQuery, tab, mode]);

  const libraryFiltered = useMemo(() => {
    const q = libQuery.trim().toLowerCase();
    const sorted = [...library].sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
    if (!q) return sorted;
    return sorted.filter((it) => (it.name || '').toLowerCase().includes(q));
  }, [library, libQuery]);

  const pickFood = (food) => {
    const unit = food.unit === 'gram' ? 'gram' : 'serving';
    setDraft({
      name: food.name,
      cal: Number(food.cal) || 0,
      p: Number(food.p) || 0,
      c: Number(food.c) || 0,
      f: Number(food.f) || 0,
      unit,
      servingDesc: food.servingDesc || (unit === 'gram' ? '1 g' : '1 serving'),
      barcode: food.barcode || '',
      itemId: food.id || undefined,
      source: food.source || 'library',
    });
    setAmount(DEFAULT_AMOUNT[unit]);
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
      amount: Number(amount) || 0,
      unit: draft.unit,
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
        unit: draft.unit,
        servingDesc: draft.servingDesc,
        barcode: draft.barcode,
      });
    }
    onClose();
  };

  const handleManualSubmit = () => {
    if (!manual.name.trim() || !manual.cal) return;
    const unit = manual.unit === 'gram' ? 'gram' : 'serving';
    const food = {
      name: manual.name.trim(),
      cal: Number(manual.cal) || 0,
      p: Number(manual.p) || 0,
      c: Number(manual.c) || 0,
      f: Number(manual.f) || 0,
      unit,
      servingDesc: unit === 'gram' ? '1 g' : manual.servingDesc || '1 serving',
      source: 'manual',
    };
    setSaveToLib(true); // default to saving manual entries
    pickFood(food);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 1500);
    } catch {
      // Clipboard unavailable (non-secure context). Fall back: stuff the prompt into
      // the paste textarea so the user can at least select/copy from there.
      setPasteText(AI_PROMPT);
    }
  };

  const handleParsePaste = () => {
    setParseErr('');
    const parsed = parseAiMacros(pasteText);
    if (!parsed) {
      setParseErr("Couldn't parse. Expected: NAME — 850 cal | 65g P | 45g C | 42g F");
      return;
    }
    setManual({
      name: parsed.name,
      cal: String(parsed.cal),
      p: String(parsed.p),
      c: String(parsed.c),
      f: String(parsed.f),
      servingDesc: parsed.servingDesc,
      unit: 'serving',
    });
    setPasteText('');
    if (pasteDetailsRef.current) pasteDetailsRef.current.open = false;
  };

  const applyChip = (chip) => {
    setManual({
      name: chip.name,
      cal: String(chip.cal),
      p: String(chip.p),
      c: String(chip.c),
      f: String(chip.f),
      servingDesc: chip.servingDesc,
      unit: 'serving',
    });
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

  const handleTabSelect = (nextTab) => {
    cancelInFlight();
    setTab(nextTab);
    if (nextTab === 'scan') setScannerOpen(true);
    if (nextTab !== 'rest') setRestPickingId('');
  };

  const handleRestaurantPick = async (item) => {
    const restaurantItemId = item?.restaurantItemId;
    if (!restaurantItemId) return;
    cancelInFlight();
    setRestErr('');
    setRestPickingId(restaurantItemId);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const food = await fetchItemDetails(restaurantItemId, { signal: ctrl.signal });
      if (!food) {
        setRestErr('Restaurant search failed. Try again.');
        return;
      }
      pickFood(food);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setRestErr(getRestaurantError(err));
      }
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
      setRestPickingId((current) => (current === restaurantItemId ? '' : current));
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
                {draft.unit === 'gram' ? 'Grams' : 'Servings'}
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const step = STEP[draft.unit];
                    const min = MIN_AMOUNT[draft.unit];
                    setAmount((a) => {
                      const next = Number((Number(a) - step).toFixed(2));
                      return Math.max(min, next);
                    });
                  }}
                  className="w-11 h-11 border border-bone/10 text-bone font-mono active:scale-95"
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode={draft.unit === 'gram' ? 'numeric' : 'decimal'}
                  step={STEP[draft.unit]}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  placeholder={draft.unit === 'gram' ? '100' : '1'}
                  className="flex-1 text-center bg-ink/60 border border-bone/[0.08] px-4 py-3 text-bone text-base font-mono tabular-nums focus:border-gold/60 focus:outline-none placeholder:text-stone"
                />
                <button
                  onClick={() => {
                    const step = STEP[draft.unit];
                    setAmount((a) => Number((Number(a) + step).toFixed(2)));
                  }}
                  className="w-11 h-11 border border-bone/10 text-bone font-mono active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1 border border-bone/[0.06]">
              {[
                { label: 'Cal', v: Math.round(draft.cal * amount) },
                { label: 'P', v: Math.round(draft.p * amount) + 'g' },
                { label: 'C', v: Math.round(draft.c * amount) + 'g' },
                { label: 'F', v: Math.round(draft.f * amount) + 'g' },
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
            <div className={`grid ${tabGridClass} border-b border-bone/[0.06] shrink-0`}>
              {visibleTabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => handleTabSelect(t.key)}
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
                            {it.unit === 'gram'
                              ? `${it.cal.toFixed(2)} kcal/g`
                              : `${Math.round(it.cal)} kcal`}
                          </div>
                        </div>
                        <div className="flex items-baseline justify-between mt-1">
                          <div className="text-[10px] font-mono text-stone">
                            {it.unit === 'gram' ? 'per g' : it.servingDesc}
                          </div>
                          <div className="text-[10px] font-mono text-stone tabular-nums">
                            {it.unit === 'gram'
                              ? `P ${Number(it.p).toFixed(2)} · C ${Number(it.c).toFixed(2)} · F ${Number(it.f).toFixed(2)}`
                              : `P ${Math.round(it.p)} · C ${Math.round(it.c)} · F ${Math.round(it.f)}`}
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
                  {searchErr && searchErr !== 'offline' && (
                    <div className="text-xs text-vermillion">{searchErr}</div>
                  )}
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

              {/* RESTAURANT TAB */}
              {tab === 'rest' && restaurantEnabled && (
                <div className="p-4 space-y-3">
                  <div className="relative">
                    <Utensils
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-stone pointer-events-none"
                    />
                    <input
                      type="text"
                      autoFocus
                      value={restQuery}
                      onChange={(e) => setRestQuery(e.target.value)}
                      placeholder="Search chain menu items…"
                      className="w-full bg-ink/60 border border-bone/[0.08] pl-9 pr-4 py-3 text-bone text-base focus:border-gold/60 focus:outline-none placeholder:text-bone/20"
                    />
                  </div>
                  {!isOnline() && (
                    <div className="flex items-center gap-2 text-xs text-vermillion">
                      <WifiOff size={12} /> Offline — use library or manual entry.
                    </div>
                  )}
                  {restSearching && (
                    <div className="flex items-center gap-2 text-xs text-stone">
                      <Loader2 size={12} className="animate-spin" /> Searching…
                    </div>
                  )}
                  {restErr && restErr !== 'offline' && (
                    <div className="text-xs text-vermillion">{restErr}</div>
                  )}
                  <div className="divide-y divide-bone/[0.06]">
                    {restResults.map((item) => {
                      const selecting = restPickingId === item.restaurantItemId;
                      return (
                        <button
                          key={item.restaurantItemId}
                          onClick={() => handleRestaurantPick(item)}
                          disabled={!!restPickingId}
                          className="w-full text-left py-3 px-1 active:bg-bone/[0.02] min-h-[56px] disabled:opacity-70"
                        >
                          <div className="flex items-center gap-3">
                            {item.photo ? (
                              <img
                                src={item.photo}
                                alt=""
                                className="w-10 h-10 shrink-0 object-cover border border-bone/10 bg-bone/[0.02]"
                              />
                            ) : (
                              <div className="w-10 h-10 shrink-0 border border-bone/10 bg-bone/[0.02]" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-display text-base text-bone leading-tight truncate">
                                    {item.name}
                                  </div>
                                  <div className="text-[10px] font-mono text-stone mt-1 truncate">
                                    {item.brand || '—'} · {item.servingDesc}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-mono text-xs text-gold tabular-nums">
                                    {Math.round(item.cal)} kcal
                                  </div>
                                  <div className="text-[10px] font-mono text-stone mt-1">
                                    {selecting ? (
                                      <span className="inline-flex items-center gap-1">
                                        <Loader2 size={10} className="animate-spin" />
                                        Loading…
                                      </span>
                                    ) : (
                                      'Select →'
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {!restSearching &&
                      restQuery.trim().length >= 2 &&
                      restResults.length === 0 &&
                      !restErr && (
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
                  <details
                    ref={pasteDetailsRef}
                    className="border border-bone/[0.06]"
                  >
                    <summary className="px-4 py-3 text-[10px] font-mono uppercase tracking-[0.22em] text-gold cursor-pointer select-none flex items-center justify-between min-h-[44px]">
                      <span>Paste from AI</span>
                      <Sparkles size={12} />
                    </summary>
                    <div className="p-4 space-y-3 border-t border-bone/[0.06]">
                      <button
                        onClick={handleCopyPrompt}
                        className="w-full py-2.5 border border-bone/10 text-bone/80 text-[11px] font-mono uppercase tracking-[0.22em] active:scale-[0.99] min-h-[44px]"
                      >
                        {promptCopied ? 'Copied ✓' : 'Copy prompt for ChatGPT / Claude'}
                      </button>
                      <textarea
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        placeholder={`Paste the one-line response here, e.g.\nChicken parm — 850 cal | 65g protein | 45g carbs | 42g fat`}
                        rows={3}
                        className="w-full bg-ink/60 border border-bone/[0.08] px-4 py-3 text-bone text-sm font-mono focus:border-gold/60 focus:outline-none placeholder:text-bone/20 resize-none"
                      />
                      {parseErr && (
                        <div className="text-[11px] text-vermillion font-mono">{parseErr}</div>
                      )}
                      <button
                        onClick={handleParsePaste}
                        disabled={!pasteText.trim()}
                        className="w-full py-2.5 bg-gold text-ink text-[11px] font-mono uppercase tracking-[0.22em] disabled:opacity-40 active:scale-[0.99] min-h-[44px]"
                      >
                        Parse → fill form
                      </button>
                    </div>
                  </details>
                  <div className="border border-bone/[0.06]">
                    <div className="px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.22em] text-gold border-b border-bone/[0.06]">
                      Quick portions
                    </div>
                    <div className="p-3 space-y-3">
                      {CHIP_CATEGORIES.map((cat) => {
                        const chips = PORTION_CHIPS.filter((chip) => chip.category === cat.key);
                        return (
                          <div key={cat.key}>
                            <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-stone mb-1.5">
                              {cat.label}
                            </div>
                            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
                              {chips.map((chip) => (
                                <button
                                  key={chip.id}
                                  onClick={() => applyChip(chip)}
                                  className="shrink-0 px-3 py-2 border border-bone/10 text-bone/80 text-[11px] font-mono whitespace-nowrap hover:border-gold/40 active:scale-[0.97]"
                                  title={chip.example}
                                >
                                  {chip.label}
                                  <span className="ml-1.5 text-gold tabular-nums">{chip.cal}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone block mb-1.5">
                      Unit
                    </label>
                    <div className="grid grid-cols-2 border border-bone/[0.08]">
                      {[
                        { k: 'serving', label: 'Per serving' },
                        { k: 'gram', label: 'Per gram' },
                      ].map((opt) => {
                        const active = manual.unit === opt.k;
                        return (
                          <button
                            key={opt.k}
                            onClick={() => setManual((m) => ({ ...m, unit: opt.k }))}
                            className={`py-3 text-[10px] font-mono uppercase tracking-[0.22em] transition-colors min-h-[44px] ${
                              active ? 'bg-gold text-ink' : 'text-stone hover:text-bone'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
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
                  {manual.unit !== 'gram' && (
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
                  )}
                  {manual.unit === 'gram' && (
                    <div className="text-[10px] font-mono text-stone/70 leading-relaxed">
                      Enter per-gram values (e.g. chicken breast: 1.65 cal/g, 0.31 P/g).
                    </div>
                  )}
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
                          step={manual.unit === 'gram' ? '0.01' : '1'}
                          value={manual[f.k]}
                          onChange={(e) => setManual((m) => ({ ...m, [f.k]: e.target.value }))}
                          className="w-full bg-ink/60 border border-bone/[0.08] px-2 py-3 text-bone text-base font-mono tabular-nums focus:border-gold/60 focus:outline-none placeholder:text-bone/20"
                          placeholder={manual.unit === 'gram' && f.k === 'cal' ? '1.65' : '0'}
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
