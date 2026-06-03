import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  Dumbbell,
  FlaskConical,
  Gauge,
  Home,
  Map as MapIcon,
  Shield,
  Trophy,
  Utensils,
  Wrench,
} from 'lucide-react';
import { deriveGameProfile } from './gameProfile.js';
import { buildGameMissions, getActiveMission } from './gameMissions.js';
import { HudOverlay } from './HudOverlay.jsx';
import { filterRaceDestinations, RACE_DESTINATION_KEY } from './raceAvailability.js';
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

const clampPct = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const unique = (items) => [...new Set(items)];

const summarizeRaceResults = (state) =>
  Object.values(state.game?.raceResults || {}).reduce(
    (summary, result) => ({
      podiums: summary.podiums + (Number(result?.podiums) || 0),
      runs: summary.runs + (Number(result?.runs) || 0),
      wins: summary.wins + (Number(result?.wins) || 0),
    }),
    { podiums: 0, runs: 0, wins: 0 }
  );

const buildCompletedHubActions = (profile, raceSummary) => {
  const actions = [];
  const completedCourses = profile.workout?.completedCourses || 0;
  if (completedCourses > 0) {
    actions.push({
      districtKey: 'gym',
      key: `gym-course-${completedCourses}`,
      label: 'Gym lights online',
    });
  }
  if (profile.foodDays > 0) {
    actions.push({
      districtKey: 'food',
      key: `food-log-${profile.foodDays}`,
      label: 'Food Court fueled',
    });
  }
  if (profile.filledRMs > 0) {
    actions.push({
      districtKey: 'lab',
      key: `lab-calibration-${profile.filledRMs}`,
      label: 'Lab data tuned',
    });
  }
  if (profile.metricWeeks > 0) {
    actions.push({
      districtKey: 'home',
      key: `home-metrics-${profile.metricWeeks}`,
      label: 'Base recap updated',
    });
  }
  if (profile.race?.credits > 0) {
    actions.push({
      districtKey: 'raceway',
      key: `raceway-credits-${profile.race.credits}`,
      label: 'Raceway payout ready',
    });
  }
  if (raceSummary.runs > 0) {
    actions.push({
      districtKey: 'raceway',
      key: `raceway-results-${raceSummary.runs}-${raceSummary.podiums}-${raceSummary.wins}`,
      label:
        raceSummary.wins > 0
          ? 'Raceway trophy lit'
          : raceSummary.podiums > 0
          ? 'Raceway podium posted'
          : 'Raceway lap posted',
    });
  }
  return actions;
};

const buildDistrictFeedback = (destination, mission, profile, raceSummary) => {
  if (destination.key === 'gym') {
    const complete = (profile.workout?.completedCourses || 0) > 0;
    return {
      complete,
      progressPct: complete ? 100 : clampPct(mission?.progressPct),
      state: complete ? 'complete' : mission ? 'progress' : 'available',
    };
  }

  if (destination.key === 'home') {
    const complete = (profile.metricWeeks || 0) > 0;
    return {
      complete,
      progressPct: complete ? 100 : clampPct(mission?.progressPct),
      state: complete ? 'complete' : mission ? 'progress' : 'available',
    };
  }

  if (destination.key === 'raceway') {
    const credits = profile.race?.credits || 0;
    const runs = raceSummary.runs || 0;
    const wins = raceSummary.wins || 0;
    const podiums = raceSummary.podiums || 0;
    if (runs > 0) {
      return {
        complete: wins > 0,
        progressPct: clampPct(wins > 0 ? 100 : podiums > 0 ? 82 : 48),
        state: wins > 0 ? 'complete' : podiums > 0 ? 'reward' : 'progress',
      };
    }
    return {
      complete: false,
      progressPct: credits > 0 ? 100 : 0,
      state: credits > 0 ? 'reward' : 'available',
    };
  }

  if (destination.key === 'garage') {
    const upgrades = profile.race?.garage?.upgrades || {};
    const upgradeCount = Object.values(upgrades).reduce((sum, level) => sum + (Number(level) || 0), 0);
    return {
      complete: upgradeCount > 0,
      progressPct: clampPct(upgradeCount * 16),
      state: upgradeCount > 0 ? 'complete' : 'available',
    };
  }

  return {
    complete: Boolean(mission?.complete),
    progressPct: clampPct(mission?.progressPct),
    state: mission?.complete ? 'complete' : mission ? 'progress' : 'available',
  };
};

const finiteOr = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizePose = (pose) => ({
  heading: finiteOr(pose?.heading, 0),
  x: finiteOr(pose?.x, 0),
  z: finiteOr(pose?.z, -42),
});

const finiteNonNegative = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

const normalizeHubMetrics = (metrics = {}) => ({
  bestFirstActionMs:
    Number.isFinite(Number(metrics.bestFirstActionMs)) && Number(metrics.bestFirstActionMs) >= 0
      ? Number(metrics.bestFirstActionMs)
      : null,
  citySessions: finiteNonNegative(metrics.citySessions),
  districtEntriesFromCity: finiteNonNegative(metrics.districtEntriesFromCity),
  firstCitySessionAt: typeof metrics.firstCitySessionAt === 'string' ? metrics.firstCitySessionAt : null,
  lastDistrictKey: typeof metrics.lastDistrictKey === 'string' ? metrics.lastDistrictKey : null,
  lastCitySessionAt: typeof metrics.lastCitySessionAt === 'string' ? metrics.lastCitySessionAt : null,
  lastFirstActionMs:
    Number.isFinite(Number(metrics.lastFirstActionMs)) && Number(metrics.lastFirstActionMs) >= 0
      ? Number(metrics.lastFirstActionMs)
      : null,
  raceStartsFromCity: finiteNonNegative(metrics.raceStartsFromCity),
  returnSessions: finiteNonNegative(metrics.returnSessions),
  trackerActionsCompletedFromCity: finiteNonNegative(metrics.trackerActionsCompletedFromCity),
  trackerFeedbackEvents: finiteNonNegative(metrics.trackerFeedbackEvents),
});

const ShellDestinationButton = ({ destination, onEnter }) => {
  const Icon = ICONS[destination.icon] || MapIcon;

  return (
    <button
      type="button"
      onClick={() => onEnter(destination)}
      data-destination-key={destination.key}
      data-testid={`shell-destination-${destination.key}`}
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
  raceAvailability = { disabled: false, reason: '' },
  readOnly = false,
  renderScreen,
  screen,
  setScreen,
  setState,
  state,
}) => {
  const profileStateKey = useMemo(
    () =>
      JSON.stringify({
        currentWeek: state.currentWeek,
        foodLog: state.food?.log || {},
        foodTargets: state.food?.targets || {},
        gameAvatar: state.game?.avatar || null,
        logs: state.logs || {},
        metrics: state.metrics || [],
        oneRMs: state.oneRMs || {},
        raceGarage: state.game?.raceGarage || {},
        raceResults: state.game?.raceResults || {},
        settings: state.settings || {},
      }),
    [
      state.currentWeek,
      state.food?.log,
      state.food?.targets,
      state.game?.avatar,
      state.game?.raceGarage,
      state.game?.raceResults,
      state.logs,
      state.metrics,
      state.oneRMs,
      state.settings,
    ]
  );
  const profile = useMemo(() => deriveGameProfile(state), [profileStateKey]);
  const baseDestinations = useMemo(
    () => filterRaceDestinations(getWorldDestinations(state, profile), raceAvailability),
    [profile, raceAvailability.disabled]
  );
  const missions = useMemo(() => {
    const nextMissions = buildGameMissions(state, profile);
    if (!raceAvailability.disabled) return nextMissions;
    return nextMissions.filter((mission) => mission.destinationKey !== RACE_DESTINATION_KEY);
  }, [profile, raceAvailability.disabled]);
  const activeMission = useMemo(() => getActiveMission(missions), [missions]);
  const [nearbyDestination, setNearbyDestination] = useState(null);
  const onboardingSeen = Boolean(state.game?.hub?.onboardingSeen);
  const [onboardingStep, setOnboardingStep] = useState(onboardingSeen ? 'done' : 'drive');
  const [rewardPulse, setRewardPulse] = useState(null);
  const firstActionRecordedRef = useRef(false);
  const sessionRecordedRef = useRef(false);
  const sessionStartRef = useRef(
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now()
  );
  const raceSummary = useMemo(() => summarizeRaceResults(state), [state.game?.raceResults]);
  const missionsByDestination = useMemo(
    () => new Map(missions.map((mission) => [mission.destinationKey, mission])),
    [missions]
  );
  const completedHubActions = useMemo(() => {
    const actions = buildCompletedHubActions(profile, raceSummary);
    if (!raceAvailability.disabled) return actions;
    return actions.filter((action) => action.districtKey !== RACE_DESTINATION_KEY);
  }, [profile, raceAvailability.disabled, raceSummary]);
  const destinations = useMemo(
    () =>
      baseDestinations.map((destination) => {
        const mission = missionsByDestination.get(destination.key);
        const feedback = buildDistrictFeedback(destination, mission, profile, raceSummary);
        return {
          ...destination,
          hubComplete: feedback.complete,
          hubFeedbackState: feedback.state,
          hubMissionKey: mission?.key || null,
          hubProgressPct: feedback.progressPct,
        };
      }),
    [baseDestinations, missionsByDestination, profile, raceSummary]
  );

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
      if (raceAvailability.disabled && destination.key === RACE_DESTINATION_KEY) return;
      setOnboardingStep('done');
      if (!readOnly) {
        const firstActionMs = Math.max(
          0,
          Math.round(
            (typeof performance !== 'undefined' && typeof performance.now === 'function'
              ? performance.now()
              : Date.now()) - sessionStartRef.current
          )
        );
        const shouldRecordFirstAction = !firstActionRecordedRef.current;
        if (shouldRecordFirstAction) firstActionRecordedRef.current = true;
        setState((current) => {
          const currentGame = current.game || {};
          const currentHub = currentGame.hub || {};
          const discoveredDistricts = Array.isArray(currentHub.discoveredDistricts)
            ? currentHub.discoveredDistricts
            : [];
          const nextDiscovered = discoveredDistricts.includes(destination.key)
            ? discoveredDistricts
            : [...discoveredDistricts, destination.key];
          const currentMetrics = normalizeHubMetrics(currentHub.metrics);
          const bestFirstActionMs = shouldRecordFirstAction
            ? currentMetrics.bestFirstActionMs == null
              ? firstActionMs
              : Math.min(currentMetrics.bestFirstActionMs, firstActionMs)
            : currentMetrics.bestFirstActionMs;

          return {
            ...current,
            game: {
              ...currentGame,
              hub: {
                ...currentHub,
                cityXp: Math.max(Number(currentHub.cityXp) || 0, profile.totalXp || 0),
                discoveredDistricts: nextDiscovered,
                metrics: {
                  ...currentMetrics,
                  bestFirstActionMs,
                  districtEntriesFromCity: currentMetrics.districtEntriesFromCity + 1,
                  lastDistrictKey: destination.key,
                  lastFirstActionMs: shouldRecordFirstAction
                    ? firstActionMs
                    : currentMetrics.lastFirstActionMs,
                  raceStartsFromCity:
                    currentMetrics.raceStartsFromCity + (destination.key === 'raceway' ? 1 : 0),
                },
                onboardingSeen: true,
              },
            },
          };
        });
      }
      setScreen(destination.route);
    },
    [profile.totalXp, raceAvailability.disabled, readOnly, setScreen, setState]
  );

  const handleNearbyChange = useCallback(
    (destination) => {
      setNearbyDestination(destination);
      if (onboardingSeen) return;
      setOnboardingStep((current) => {
        if (destination) return 'enter';
        return current === 'enter' ? 'portal' : current;
      });
    },
    [onboardingSeen]
  );

  const handlePlayerPoseChange = useCallback(
    (pose) => {
      if (readOnly) return;
      if (!onboardingSeen) {
        setOnboardingStep((current) => (current === 'drive' ? 'portal' : current));
      }
      const nextPose = normalizePose(pose);
      setState((current) => {
        const currentGame = current.game || {};
        const currentHub = currentGame.hub || {};
        const currentSpawn = normalizePose(currentHub.lastSpawn);
        const unchanged =
          Math.hypot(nextPose.x - currentSpawn.x, nextPose.z - currentSpawn.z) < 0.35 &&
          Math.abs(nextPose.heading - currentSpawn.heading) < 0.025;
        if (unchanged) return current;
        return {
          ...current,
          game: {
            ...currentGame,
            hub: {
              ...currentHub,
              lastSpawn: nextPose,
            },
          },
        };
      });
    },
    [onboardingSeen, readOnly, setState]
  );

  const handleShowWorldHelp = useCallback(() => {
    setOnboardingStep('drive');
    if (readOnly) return;
    setState((current) => {
      const currentGame = current.game || {};
      const currentHub = currentGame.hub || {};
      if (currentHub.onboardingSeen === false) return current;
      return {
        ...current,
        game: {
          ...currentGame,
          hub: {
            ...currentHub,
            onboardingSeen: false,
          },
        },
      };
    });
  }, [readOnly, setState]);

  useEffect(() => {
    if (readOnly || screen !== 'home' || sessionRecordedRef.current) return;
    sessionRecordedRef.current = true;
    setState((current) => {
      const currentGame = current.game || {};
      const currentHub = currentGame.hub || {};
      const currentMetrics = normalizeHubMetrics(currentHub.metrics);
      const sessionAt = new Date().toISOString();
      const wasReturnSession = currentMetrics.citySessions > 0;
      return {
        ...current,
        game: {
          ...currentGame,
          hub: {
            ...currentHub,
            metrics: {
              ...currentMetrics,
              citySessions: currentMetrics.citySessions + 1,
              firstCitySessionAt: currentMetrics.firstCitySessionAt || sessionAt,
              lastCitySessionAt: sessionAt,
              returnSessions: currentMetrics.returnSessions + (wasReturnSession ? 1 : 0),
            },
          },
        },
      };
    });
  }, [readOnly, screen, setState]);

  useEffect(() => {
    setOnboardingStep((current) => {
      if (onboardingSeen) return 'done';
      return current === 'done' ? 'drive' : current;
    });
  }, [onboardingSeen]);

  useEffect(() => {
    if (readOnly || screen !== 'home') return;
    const hub = state.game?.hub || {};
    const previousXp = Number(hub.cityXp) || 0;
    const currentXp = Number(profile.totalXp) || 0;
    const knownActions = Array.isArray(hub.completedHubActions) ? hub.completedHubActions : [];
    const newActions = completedHubActions.filter((action) => !knownActions.includes(action.key));
    const xpDelta = Math.max(0, currentXp - previousXp);

    if (xpDelta <= 0 && newActions.length === 0) return;

    const nextDestination = destinations.find((destination) => destination.key === activeMission?.destinationKey);
    const pulse = {
      actions: newActions.map((action) => action.label),
      districtKeys: unique(newActions.map((action) => action.districtKey)),
      id: `${currentXp}-${newActions.map((action) => action.key).join('|')}`,
      nextDestinationKey: nextDestination?.key || null,
      nextDestinationTitle: nextDestination?.title || null,
      nextMissionKey: activeMission?.key || null,
      nextMissionTitle: activeMission?.title || null,
      xpDelta,
    };
    setRewardPulse(pulse);

    setState((current) => {
      const currentGame = current.game || {};
      const currentHub = currentGame.hub || {};
      const currentActions = Array.isArray(currentHub.completedHubActions)
        ? currentHub.completedHubActions
        : [];
      const currentMetrics = normalizeHubMetrics(currentHub.metrics);
      return {
        ...current,
        game: {
          ...currentGame,
          hub: {
            ...currentHub,
            cityXp: Math.max(Number(currentHub.cityXp) || 0, currentXp),
            completedHubActions: unique([
              ...currentActions,
              ...completedHubActions.map((action) => action.key),
            ]),
            metrics: {
              ...currentMetrics,
              trackerActionsCompletedFromCity:
                currentMetrics.trackerActionsCompletedFromCity + newActions.length,
              trackerFeedbackEvents:
                currentMetrics.trackerFeedbackEvents + (newActions.length > 0 ? 1 : 0),
            },
          },
        },
      };
    });
  }, [activeMission, completedHubActions, destinations, profile.totalXp, readOnly, screen, setState, state.game?.hub]);

  useEffect(() => {
    if (!rewardPulse) return undefined;
    const timeout = window.setTimeout(() => {
      setRewardPulse((current) => (current?.id === rewardPulse.id ? null : current));
    }, 9000);
    return () => window.clearTimeout(timeout);
  }, [rewardPulse]);

  const activeDestination =
    destinations.find((destination) => destination.route === screen) ||
    (screen.match(/^day-\d$/) ? destinations.find((destination) => destination.key === 'gym') : null);

  if (screen === 'home') {
    const objectiveDestinationKey = !activeMission?.complete
      ? activeMission?.destinationKey
      : null;
    const telemetryDetails = {
      activeMission: activeMission
        ? {
            complete: activeMission.complete,
            destinationKey: activeMission.destinationKey,
            key: activeMission.key,
            progressPct: activeMission.progressPct,
            title: activeMission.title,
          }
        : null,
      cityXp: profile.totalXp,
      districtFeedback: destinations.map((destination) => ({
        complete: destination.hubComplete,
        key: destination.key,
        missionKey: destination.hubMissionKey,
        progressPct: Math.round(destination.hubProgressPct || 0),
        state: destination.hubFeedbackState,
      })),
      hubMetrics: normalizeHubMetrics(state.game?.hub?.metrics),
      reducedMotionSetting: Boolean(state.game?.hub?.reducedMotion),
    };

    return (
      <div className="world-mode min-h-screen overflow-hidden bg-[#10151d] text-white" data-testid="playable-world-home">
        <main className="relative h-[100svh] min-h-[620px] overflow-hidden">
          <WorldScene
            activeDestinationKey={objectiveDestinationKey}
            destinations={destinations}
            hubCosmetics={state.game?.hub?.cosmetics}
            initialSpawn={state.game?.hub?.lastSpawn}
            onEnter={enterDestination}
            onNearbyChange={handleNearbyChange}
            onPlayerPoseChange={handlePlayerPoseChange}
            profile={profile}
            reducedMotion={Boolean(state.game?.hub?.reducedMotion)}
            telemetryDetails={telemetryDetails}
          />
          <HudOverlay
            activeMission={activeMission}
            destinations={destinations}
            missions={missions}
            nearbyDestination={nearbyDestination}
            onBasicMode={() => setMode('basic')}
            onEnter={enterDestination}
            onboardingStep={onboardingStep}
            onShowHelp={handleShowWorldHelp}
            profile={profile}
            hub={state.game?.hub}
            rewardPulse={rewardPulse}
          />
          {notice && (
            <div className="pointer-events-auto absolute left-3 right-3 top-[72px] z-[70] mx-auto max-w-2xl sm:left-5 sm:right-auto sm:top-[78px] sm:w-[520px]">
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
            <MapIcon size={15} />
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
