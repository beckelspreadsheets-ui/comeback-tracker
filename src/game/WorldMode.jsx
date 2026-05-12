import { useCallback, useMemo, useState } from 'react';
import {
  ChevronRight,
  Dumbbell,
  FlaskConical,
  Gauge,
  Home,
  Map,
  Shield,
  Trophy,
  Utensils,
  Wrench,
} from 'lucide-react';
import { deriveGameProfile } from './gameProfile.js';
import { buildGameMissions, getActiveMission } from './gameMissions.js';
import { HudOverlay } from './HudOverlay.jsx';
import { WorldScene } from './WorldScene.jsx';
import { getWorldDestinations } from './worldConfig.js';

const ICONS = {
  Dumbbell,
  FlaskConical,
  Home,
  Shield,
  Trophy,
  Utensils,
  Wrench,
};

const ShellDestinationButton = ({ destination, onEnter }) => {
  const Icon = ICONS[destination.icon] || Map;

  return (
    <button
      type="button"
      onClick={() => onEnter(destination)}
      className="flex min-w-0 flex-col items-center justify-center gap-1 text-stone transition-colors hover:text-bone"
      title={destination.title}
    >
      <Icon size={17} />
      <span className="max-w-full truncate text-[9px] font-mono uppercase tracking-[0.18em]">
        {destination.shortTitle}
      </span>
    </button>
  );
};

export const WorldMode = ({
  notice,
  readOnly = false,
  renderScreen,
  screen,
  setScreen,
  setState,
  state,
}) => {
  const [nearbyDestination, setNearbyDestination] = useState(null);
  const profile = useMemo(() => deriveGameProfile(state), [state]);
  const destinations = useMemo(() => getWorldDestinations(state, profile), [profile, state]);
  const missions = useMemo(() => buildGameMissions(state, profile), [profile, state]);
  const activeMission = useMemo(() => getActiveMission(missions), [missions]);

  const setMode = useCallback(
    (homeMode) => {
      if (readOnly) return;
      setState((current) => ({
        ...current,
        game: { ...(current.game || {}), homeMode },
      }));
    },
    [readOnly, setState]
  );

  const enterDestination = useCallback(
    (destination) => {
      if (!destination?.route) return;
      setScreen(destination.route);
    },
    [setScreen]
  );

  const activeDestination =
    destinations.find((destination) => destination.route === screen) ||
    (screen.match(/^day-\d$/) ? destinations.find((destination) => destination.key === 'gym') : null);

  if (screen === 'home') {
    return (
      <div className="world-mode min-h-screen overflow-hidden bg-[#10151d] text-white">
        <main className="relative h-[100svh] min-h-[620px]">
          <WorldScene
            activeDestinationKey={!activeMission?.complete ? activeMission?.destinationKey : null}
            destinations={destinations}
            onEnter={enterDestination}
            onNearbyChange={setNearbyDestination}
            profile={profile}
          />
          <HudOverlay
            destinations={destinations}
            activeMission={activeMission}
            missions={missions}
            nearbyDestination={nearbyDestination}
            onBasicMode={() => setMode('basic')}
            onEnter={enterDestination}
            profile={profile}
          />
          {notice && (
            <div className="pointer-events-auto absolute left-3 right-3 top-[252px] z-30 mx-auto max-w-2xl sm:left-5 sm:right-auto sm:top-[266px] sm:w-[520px]">
              {notice}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-bone antialiased">
      <header className={`${screen === 'race' ? 'hidden' : 'sticky'} top-0 z-40 border-b border-gold/15 bg-ink/92 backdrop-blur-xl`}>
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={() => setScreen('home')}
            className="flex min-w-0 items-center gap-2 text-left text-gold transition-colors hover:text-bone"
          >
            <Map size={15} />
            <span className="truncate font-mono text-[11px] font-bold uppercase tracking-[0.18em]">
              {activeDestination?.title || 'Comeback City'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode('basic')}
            disabled={readOnly}
            className="flex h-8 shrink-0 items-center gap-1.5 border border-bone/[0.1] px-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-stone transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50"
          >
            <Gauge size={12} />
            Basic
          </button>
        </div>
      </header>

      <main className={screen === 'race' ? 'px-0 py-0 pb-0' : 'mx-auto max-w-2xl px-4 py-5 pb-28'}>
        {notice}
        <div className={screen === 'race' ? 'hidden' : 'mb-4 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-stone'}>
          <button
            type="button"
            onClick={() => setScreen('home')}
            className="text-gold transition-colors hover:text-bone"
          >
            City
          </button>
          <ChevronRight size={12} />
          <span>{activeDestination?.shortTitle || 'Run'}</span>
        </div>
        {renderScreen()}
      </main>

      <nav className={`${screen === 'race' ? 'hidden' : 'block'} fixed bottom-0 inset-x-0 z-40 border-t border-gold/15 bg-ink/92 backdrop-blur-xl safe-bottom`}>
        <div
          className="mx-auto grid h-16 max-w-2xl px-2"
          style={{ gridTemplateColumns: `repeat(${destinations.length}, minmax(0, 1fr))` }}
        >
          {destinations.map((destination) => (
            <ShellDestinationButton
              key={destination.key}
              destination={destination}
              onEnter={enterDestination}
            />
          ))}
        </div>
      </nav>
    </div>
  );
};
