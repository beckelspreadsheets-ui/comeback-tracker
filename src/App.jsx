import { useState } from 'react';
import {
  Dumbbell,
  Settings as SettingsIcon,
  Calculator,
  Activity,
  Apple,
  Shield,
  Download,
  Upload,
} from 'lucide-react';
import { usePersistedState } from './hooks/usePersistedState.js';
import { useRestTimer } from './hooks/useRestTimer.js';
import { RestTimerFAB } from './components/RestTimer.jsx';
import { HomeScreen } from './screens/HomeScreen.jsx';
import { SettingsScreen } from './screens/SettingsScreen.jsx';
import { CalibrationScreen } from './screens/CalibrationScreen.jsx';
import { DayScreen } from './screens/DayScreen.jsx';
import { MetricsScreen } from './screens/MetricsScreen.jsx';
import { FoodScreen } from './screens/FoodScreen.jsx';
import { JointScreen } from './screens/JointScreen.jsx';

export default function App() {
  const [state, setState] = usePersistedState();
  const [screen, setScreen] = useState('home');
  const timer = useRestTimer();

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
          setState(parsed);
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
          state={state}
          setState={setState}
          day={Number(dayMatch[1])}
          onBack={() => setScreen('home')}
          timer={timer}
        />
      );
    }
    switch (screen) {
      case 'settings':
        return <SettingsScreen state={state} setState={setState} />;
      case 'calibration':
        return <CalibrationScreen state={state} setState={setState} />;
      case 'metrics':
        return <MetricsScreen state={state} setState={setState} />;
      case 'food':
        return <FoodScreen state={state} setState={setState} />;
      case 'joint':
        return <JointScreen />;
      default:
        return <HomeScreen state={state} setState={setState} onNav={setScreen} />;
    }
  };

  const navItems = [
    { key: 'home', label: 'Today', icon: Dumbbell },
    { key: 'calibration', label: 'Calib', icon: Calculator },
    { key: 'joint', label: 'Joints', icon: Shield },
    { key: 'metrics', label: 'Body', icon: Activity },
    { key: 'food', label: 'Food', icon: Apple },
    { key: 'settings', label: 'Setup', icon: SettingsIcon },
  ];

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
          <div className="flex items-center gap-1">
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
      <main className="max-w-2xl mx-auto px-4 py-6 pb-28">{renderScreen()}</main>

      {/* Floating rest timer - only renders when active */}
      <RestTimerFAB timer={timer} />

      {/* Bottom nav — gold hairline, gold tick over the active item */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-gold/15 bg-ink/92 backdrop-blur-xl safe-bottom">
        <div className="max-w-2xl mx-auto px-2 h-16 grid grid-cols-6 relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              screen === item.key || (item.key === 'home' && (screen === 'home' || dayMatch));
            return (
              <button
                key={item.key}
                onClick={() => setScreen(item.key)}
                className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
                  active ? 'text-gold' : 'text-stone hover:text-bone/70'
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                <span className="text-[9px] font-mono uppercase tracking-[0.22em]">{item.label}</span>
                {active && (
                  <div className="absolute top-0 h-px w-6 bg-gold" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
