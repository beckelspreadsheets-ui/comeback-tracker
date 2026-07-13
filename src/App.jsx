import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import {
  Dumbbell,
  Settings as SettingsIcon,
  Calculator,
  Activity,
  Apple,
  Shield,
  Download,
  Upload,
  Cloud,
  AlertTriangle,
  WifiOff,
  Trophy,
} from 'lucide-react';
import { normalizeState, usePersistedState } from './hooks/usePersistedState.js';
import { useRestTimer } from './hooks/useRestTimer.js';
import { RestTimerFAB } from './components/RestTimer.jsx';

// 2026-07-13 owner call ("make it completely separate apps for space"): the
// fitness app no longer bundles ANY of src/game/ — no world hub, no race
// runtime, no kart GLBs. Penguin Kart lives at its own Pages project; the
// Race nav item and legacy #race deep links go there.
const KART_APP_URL = 'https://comeback-city-kart.pages.dev';

const lazyNamed = (loader, exportName) =>
  lazy(() => loader().then((module) => ({ default: module[exportName] })));

const HomeScreen = lazyNamed(() => import('./screens/HomeScreen.jsx'), 'HomeScreen');
const SettingsScreen = lazyNamed(() => import('./screens/SettingsScreen.jsx'), 'SettingsScreen');
const CalibrationScreen = lazyNamed(() => import('./screens/CalibrationScreen.jsx'), 'CalibrationScreen');
const DayScreen = lazyNamed(() => import('./screens/DayScreen.jsx'), 'DayScreen');
const MetricsScreen = lazyNamed(() => import('./screens/MetricsScreen.jsx'), 'MetricsScreen');
const FoodScreen = lazyNamed(() => import('./screens/FoodScreen.jsx'), 'FoodScreen');
const JointScreen = lazyNamed(() => import('./screens/JointScreen.jsx'), 'JointScreen');

const syncTone = {
  synced: 'text-pine border-pine/25',
  saving: 'text-gold border-gold/30',
  offline: 'text-gold border-gold/30',
  conflict: 'text-vermillion border-vermillion/35',
  'local-only': 'text-stone border-bone/[0.08]',
  'needs-decision': 'text-gold border-gold/30',
  checking: 'text-stone border-bone/[0.08]',
  error: 'text-vermillion border-vermillion/35',
};

const SyncStatus = ({ sync }) => {
  const Icon =
    sync.status === 'conflict' || sync.status === 'error'
      ? AlertTriangle
      : sync.status === 'offline' || sync.status === 'local-only'
      ? WifiOff
      : Cloud;
  return (
    <div
      className={`flex h-8 items-center gap-1.5 border px-2 text-[10px] font-mono uppercase tracking-[0.16em] ${
        syncTone[sync.status] || syncTone.checking
      }`}
      title={sync.statusLabel}
    >
      <Icon size={12} />
      <span className="hidden sm:inline">{sync.statusLabel}</span>
    </div>
  );
};

const SyncBanner = ({ sync, onExport }) => {
  if (sync.conflict) {
    return (
      <div className="mb-5 border border-vermillion/35 bg-vermillion/[0.04] p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="mt-0.5 text-vermillion shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-display italic text-lg text-bone leading-none">Sync conflict</div>
            <p className="mt-2 text-xs text-stone leading-relaxed">
              Cloud changed after this device started editing. Export a backup before choosing which copy wins.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={onExport}
                className="px-3 py-2 border border-gold/45 text-gold text-[10px] font-mono uppercase tracking-[0.18em]"
              >
                Export backup
              </button>
              <button
                onClick={sync.loadCloud}
                className="px-3 py-2 border border-bone/[0.1] text-stone hover:text-bone text-[10px] font-mono uppercase tracking-[0.18em]"
              >
                Load cloud
              </button>
              <button
                onClick={sync.overwriteCloud}
                className="px-3 py-2 border border-vermillion/40 text-vermillion text-[10px] font-mono uppercase tracking-[0.18em]"
              >
                Overwrite cloud
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!sync.decision) return null;

  const chooseSource = sync.decision.type === 'choose-source';
  return (
    <div className="mb-5 border border-gold/30 bg-gold/[0.035] p-4">
      <div className="flex items-start gap-3">
        <Cloud size={16} className="mt-0.5 text-gold shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-display italic text-lg text-bone leading-none">
            {sync.decision.message}
          </div>
          <p className="mt-2 text-xs text-stone leading-relaxed">
            This device will keep saving locally until you choose a cloud action.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {chooseSource && (
              <button
                onClick={sync.loadCloud}
                className="px-3 py-2 border border-gold/45 text-gold text-[10px] font-mono uppercase tracking-[0.18em]"
              >
                Use cloud data
              </button>
            )}
            <button
              onClick={() => sync.uploadLocal({ force: chooseSource })}
              className="px-3 py-2 border border-gold/45 text-gold text-[10px] font-mono uppercase tracking-[0.18em]"
            >
              Upload this device
            </button>
            <button
              onClick={sync.pauseSync}
              className="px-3 py-2 border border-bone/[0.1] text-stone hover:text-bone text-[10px] font-mono uppercase tracking-[0.18em]"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Legacy race deep links (#race, #race-3d-spike) predate the app split —
// send those visitors to the standalone kart app instead of a dead route.
const legacyRaceHash = () => {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash.replace(/^#/, '');
  return hash === 'race' || hash === 'race-3d-spike';
};

const initialScreenFromHash = () => 'home';

const RouteFallback = ({ fullScreen = false }) => (
  <div
    aria-hidden="true"
    className={fullScreen ? 'min-h-screen bg-ink' : 'min-h-32'}
    data-testid="route-loading"
  />
);

export default function App() {
  const [state, setState, sync] = usePersistedState();
  const [screen, setScreen] = useState(initialScreenFromHash);
  const timer = useRestTimer();
  const readOnly = sync.viewOnly;
  const activeState = readOnly ? sync.viewedState || state : state;
  const activeSetState = readOnly ? sync.setViewedState : setState;

  const navigateToScreen = useCallback((nextScreen) => {
    setScreen(nextScreen);
  }, []);

  useEffect(() => {
    const redirectLegacyRaceHash = () => {
      if (legacyRaceHash()) window.location.replace(`${KART_APP_URL}/#race`);
    };
    redirectLegacyRaceHash();
    window.addEventListener('hashchange', redirectLegacyRaceHash);
    return () => window.removeEventListener('hashchange', redirectLegacyRaceHash);
  }, []);

  useEffect(() => {
    if (readOnly && screen !== 'home' && !screen.match(/^day-\d$/)) {
      setScreen('home');
    }
  }, [readOnly, screen]);

  useEffect(() => {
    const syncHashScreen = () => setScreen(initialScreenFromHash());
    window.addEventListener('hashchange', syncHashScreen);
    return () => window.removeEventListener('hashchange', syncHashScreen);
  }, []);

  // Export full app state to JSON file — for backups or device migration
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comeback-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed || typeof parsed !== 'object') throw new Error('bad file');
        if (
          window.confirm(
            'Import this file? This will REPLACE all your current data. (Export first if you want a backup.)'
          )
        ) {
          setState(normalizeState(parsed));
        }
      } catch {
        alert('Invalid file — expected a Comeback Tracker JSON export.');
      }
    };
    reader.readAsText(file);
    // Reset the input so the same file can be re-imported if needed
    e.target.value = '';
  };

  const dayMatch = screen.match(/^day-(\d)$/);

  const renderScreen = () => {
    if (dayMatch) {
      return (
        <DayScreen
          state={activeState}
          setState={activeSetState}
          day={Number(dayMatch[1])}
          onBack={() => setScreen('home')}
          timer={timer}
          readOnly={readOnly}
        />
      );
    }
    switch (screen) {
      case 'settings':
        return <SettingsScreen state={activeState} setState={activeSetState} />;
      case 'calibration':
        return <CalibrationScreen state={activeState} setState={activeSetState} />;
      case 'metrics':
        return <MetricsScreen state={activeState} setState={activeSetState} />;
      case 'food':
        return <FoodScreen state={activeState} setState={activeSetState} />;
      case 'joint':
        return <JointScreen />;
      default:
        return (
          <HomeScreen
            state={activeState}
            setState={activeSetState}
            onNav={navigateToScreen}
            readOnly={readOnly}
            profileName={sync.viewedLabel}
          />
        );
    }
  };

  const navItems = [
    { key: 'home', label: 'Today', icon: Dumbbell },
    { key: 'calibration', label: 'Calib', icon: Calculator },
    { key: 'joint', label: 'Joints', icon: Shield },
    { key: 'metrics', label: 'Body', icon: Activity },
    { key: 'food', label: 'Food', icon: Apple },
    // Penguin Kart is its own app now — this opens it, nothing game-side
    // ships in this bundle.
    { key: 'race', label: 'Race', icon: Trophy, href: `${KART_APP_URL}/#race` },
    { key: 'settings', label: 'Setup', icon: SettingsIcon },
  ];
  const visibleNavItems = readOnly ? navItems.filter((item) => item.key === 'home') : navItems;
  const hasNotice = Boolean(sync.conflict || sync.decision || readOnly);
  const notice = hasNotice ? (
    <>
      <SyncBanner sync={sync} onExport={exportData} />
      {readOnly && (
        <div className="mb-5 border border-bone/[0.06] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-stone">
          Viewing {sync.viewedLabel} read-only
        </div>
      )}
    </>
  ) : null;

  return (
    <div className="min-h-screen bg-ink text-bone antialiased">
      {/* Warm paper-grain overlay — sits on top of the sumi ink ground */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04] z-50 mix-blend-overlay grain-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence baseFrequency='0.8' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 0.83 0 0 0 0 0.68 0 0 0 0 0.22 0 0 0 0.14 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* Header — gold-hairline under a compact brand */}
      <header className="sticky top-0 z-40 border-b border-gold/15 bg-ink/85 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setScreen('home')}
            className="flex items-center gap-2.5 active:scale-95 transition-transform"
            aria-label="Home"
          >
            <span className="w-7 h-7 border border-gold/70 flex items-center justify-center font-display italic text-gold text-lg leading-none">
              金
            </span>
            <span className="font-display italic text-base text-bone tracking-tight">Comeback</span>
          </button>
          <div className="flex items-center gap-1.5">
            {sync.user && sync.profiles.length > 1 && (
              <select
                value={sync.viewedUserId || sync.user.userId}
                onChange={(e) => {
                  sync.selectViewedUser(e.target.value);
                  setScreen('home');
                }}
                className="h-8 max-w-[116px] bg-transparent border border-bone/[0.08] px-2 text-[10px] font-mono uppercase tracking-[0.14em] text-bone focus:border-gold/60 focus:outline-none"
                aria-label="Profile"
              >
                {sync.profiles.map((profile) => (
                  <option key={profile.userId} value={profile.userId} className="bg-ink text-bone">
                    {profile.userId === sync.user.userId ? 'My data' : profile.displayName}
                  </option>
                ))}
              </select>
            )}
            <SyncStatus sync={sync} />
            <button
              onClick={exportData}
              title="Export JSON backup"
              aria-label="Export JSON backup"
              className="w-8 h-8 border border-transparent hover:border-bone/10 flex items-center justify-center text-stone hover:text-bone active:scale-95 transition-all"
            >
              <Download size={14} />
            </button>
            <label
              title="Import JSON backup"
              aria-label="Import JSON backup"
              className="w-8 h-8 border border-transparent hover:border-bone/10 flex items-center justify-center text-stone hover:text-bone cursor-pointer active:scale-95 transition-all"
            >
              <Upload size={14} />
              <input
                type="file"
                accept="application/json"
                onChange={importData}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </header>

      {/* Main body */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
        {notice}
        <Suspense fallback={<RouteFallback />}>
          {renderScreen()}
        </Suspense>
      </main>

      {/* Floating rest timer - only renders when active */}
      <RestTimerFAB timer={timer} />

      {/* Bottom nav — gold hairline, gold tick over the active item */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-gold/15 bg-ink/92 backdrop-blur-xl safe-bottom">
        <div
          className="max-w-2xl mx-auto px-2 h-16 grid relative"
          style={{ gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))` }}
        >
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active =
              screen === item.key || (item.key === 'home' && (screen === 'home' || dayMatch));
            const itemClass = `flex flex-col items-center justify-center gap-1 transition-colors relative ${
              active ? 'text-gold' : 'text-stone hover:text-bone/70'
            }`;
            const body = (
              <>
                <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                <span className="text-[9px] font-mono uppercase tracking-[0.22em]">{item.label}</span>
                {active && (
                  <div className="absolute top-0 h-px w-6 bg-gold" />
                )}
              </>
            );
            if (item.href) {
              return (
                <a key={item.key} href={item.href} className={itemClass} data-testid="nav-kart-link">
                  {body}
                </a>
              );
            }
            return (
              <button key={item.key} onClick={() => navigateToScreen(item.key)} className={itemClass}>
                {body}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
