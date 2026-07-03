import {
  Car,
  CheckCircle2,
  ChevronsRight,
  Compass,
  Dumbbell,
  FlaskConical,
  Gauge,
  HelpCircle,
  HeartPulse,
  Home,
  MapPin,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Utensils,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  ComebackCityLogo,
  CurrencyStack,
  DISTRICT_VISUALS,
  DistrictCloseupStrip,
} from './comebackCityVisualTokens.jsx';
import { WORLD_BOUNDS } from './worldConfig.js';

const ICONS = {
  Dumbbell,
  FlaskConical,
  Home,
  Shield,
  Trophy,
  Utensils,
  Wrench,
};

const Stat = ({ label, value, suffix = '', tone = 'text-white' }) => (
  <div className="min-w-0">
    <div className="text-[8px] font-mono uppercase leading-none tracking-[0.16em] text-white/58">{label}</div>
    <div className={`mt-1 font-mono text-[13px] font-black leading-none tabular-nums ${tone}`}>
      {value}
      {suffix && <span className="ml-1 text-[8px] font-bold text-white/55">{suffix}</span>}
    </div>
  </div>
);

const pct = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const miniMapPoint = (position) => ({
  left: `${((position.x - WORLD_BOUNDS.minX) / (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX)) * 100}%`,
  top: `${100 - ((position.z - WORLD_BOUNDS.minZ) / (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ)) * 100}%`,
});

const CONTROL_HINTS = {
  drive: {
    Icon: Car,
    label: 'Drive',
    desktop: 'WASD / Arrows',
    mobile: 'Pad + gas',
    secondaryDesktop: 'S/Down Brake / Space Drift',
    secondaryMobile: 'Brake / Drift / Enter',
  },
  portal: {
    Icon: Target,
    label: 'Portal',
    desktop: 'Approach glow',
    mobile: 'Tap district',
  },
  enter: {
    Icon: Zap,
    label: 'Enter',
    desktop: 'E / Enter',
    mobile: 'Tap Enter',
  },
};

const MiniMap = ({ activeMission, className = '', destinations, nearbyDestination, onEnter }) => {
  const objectiveKey = !activeMission?.complete ? activeMission?.destinationKey : null;

  return (
    <div className={`world-hud-panel pointer-events-auto w-[132px] border border-white/18 bg-[#10151d]/[0.9] p-2 text-white shadow-[0_14px_34px_rgba(0,0,0,0.32)] backdrop-blur-md ${className}`}>
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 font-mono text-[9px] font-black uppercase leading-none tracking-[0.16em] text-white/62">
          <Compass size={12} className="text-[#ffd34f]" />
          Map
        </div>
        <div className="font-mono text-[8px] font-black uppercase tracking-[0.12em] text-[#ffd34f]">
          {nearbyDestination ? 'Dock' : 'Route'}
        </div>
      </div>
      <div className="world-minimap mx-auto mt-2 h-[108px] w-[108px] overflow-hidden rounded-full border border-white/18 bg-black/30">
        <span className="world-map-route left-[50%] top-[48%] h-[72%] rotate-[0deg]" />
        <span className="world-map-route left-[50%] top-[48%] h-[54%] rotate-[62deg]" />
        <span className="world-map-route left-[50%] top-[48%] h-[54%] rotate-[-62deg]" />
        <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 border-2 border-[#ffd34f] bg-[#10151d]" />
        {destinations.map((destination) => {
          const objective = objectiveKey === destination.key;
          const nearby = nearbyDestination?.key === destination.key;
          return (
            <button
              key={destination.key}
              type="button"
              onClick={() => onEnter(destination)}
              className={`world-map-dot ${objective ? 'world-objective-pulse' : ''}`}
              style={{
                ...miniMapPoint(destination.position),
                '--dot': destination.accent,
              }}
              title={destination.title}
            >
              <span className={nearby ? 'scale-125' : ''} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

const MissionPanel = ({ destination, mission, onEnter }) => {
  if (!mission) return null;
  const MissionIcon = mission.complete ? CheckCircle2 : Target;
  const progress = pct(mission.progressPct);
  const DestinationIcon = destination ? ICONS[destination.icon] || Sparkles : MissionIcon;

  return (
    <div
      className="world-hud-panel pointer-events-auto border border-white/18 bg-[#10151d]/[0.92] px-3 py-2.5 text-white shadow-[0_14px_32px_rgba(0,0,0,0.32)] backdrop-blur-md"
      data-testid="world-mission-panel"
    >
      <div className="grid grid-cols-[38px_1fr_auto] items-center gap-2.5">
        <div
          className="grid h-[38px] w-[38px] place-items-center border bg-black/28"
          style={{ borderColor: destination?.accent || '#ffd34f', color: destination?.accent || '#ffd34f' }}
        >
          <DestinationIcon size={21} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase leading-none tracking-[0.16em] text-white/62">
            <MissionIcon size={10} className={mission.complete ? 'text-[#71f09a]' : 'text-[#ffd34f]'} />
            Next Objective
          </div>
          <div className="mt-1 truncate font-mono text-[11px] font-black uppercase leading-none text-white sm:text-sm">
            {mission.title}
          </div>
          <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.1em] text-white/56">
            {mission.summary}
          </div>
        </div>
        {destination && !mission.complete && (
          <button
            type="button"
            onClick={() => onEnter(destination)}
            className="world-portal-cta grid h-9 w-12 shrink-0 place-items-center border border-[#ffd34f]/60 bg-[#ffd34f] font-mono text-[8px] font-black uppercase tracking-[0.12em] text-[#10151d] transition-transform active:scale-[0.98]"
            title={`Route to ${destination.title}`}
          >
            <Zap size={16} />
          </button>
        )}
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2">
        <div className="h-1.5 border border-white/14 bg-black/32">
          <div
            className={`h-full transition-all duration-500 ${
              mission.complete ? 'bg-[#71f09a]' : 'bg-[#ffd34f]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="font-mono text-[8px] font-black uppercase leading-none tracking-[0.12em] text-[#ffd34f]">
          {mission.complete ? 'Clear' : `${progress}%`}
        </div>
      </div>
      <div className="mt-1 truncate font-mono text-[8px] uppercase tracking-[0.12em] text-white/48">
        {mission.reward}
      </div>
      <div className="hidden h-2 border border-white/14 bg-black/32">
        <div
          className={`h-full transition-all duration-500 ${
            mission.complete ? 'bg-[#71f09a]' : 'bg-[#ffd34f]'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="hidden items-center justify-between gap-3">
        <span className="truncate font-mono text-[8px] uppercase tracking-[0.12em] text-white/48">
          {mission.reward}
        </span>
        {destination && !mission.complete && (
          <button
            type="button"
            onClick={() => onEnter(destination)}
            className="world-portal-cta flex shrink-0 items-center gap-1 border border-[#ffd34f]/60 bg-[#ffd34f] px-2.5 py-1.5 font-mono text-[8px] font-black uppercase tracking-[0.12em] text-[#10151d] transition-transform active:scale-[0.98]"
          >
            <Zap size={10} />
            Route
          </button>
        )}
      </div>
    </div>
  );
};

const DestinationButton = ({ active, activeMission, destination, mission, onEnter }) => {
  const Icon = ICONS[destination.icon] || Sparkles;
  const missionProgress = mission ? pct(mission.progressPct) : null;
  const isObjective = activeMission?.destinationKey === destination.key && !activeMission.complete;

  return (
    <button
      type="button"
      onClick={() => onEnter(destination)}
      data-destination-key={destination.key}
      data-testid={`world-destination-${destination.key}`}
      className={`world-destination-button pointer-events-auto relative grid h-[48px] min-w-[80px] grid-cols-[22px_1fr] items-center gap-2 overflow-hidden border px-2 pb-3 text-left text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur-md transition-all hover:-translate-y-0.5 active:translate-y-0 sm:h-[46px] sm:min-w-[74px] sm:flex-1 ${
        active || isObjective
          ? 'border-[#ffd34f] bg-[#10151d]/[0.94]'
          : 'border-white/16 bg-[#10151d]/[0.9] hover:border-white/32'
      }`}
      style={{ '--destination': destination.accent }}
      title={destination.title}
    >
      <span
        className="grid h-[22px] w-[22px] place-items-center border"
        style={{ borderColor: destination.accent, color: destination.accent }}
      >
        <Icon size={14} />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-mono text-[10px] font-black uppercase leading-none">
          {destination.shortTitle}
        </span>
        <span className="mt-1 block truncate text-[8px] font-mono uppercase tracking-[0.1em] text-white/52">
          {mission ? (mission.complete ? 'Clear' : `${missionProgress}% route`) : destination.meta}
        </span>
      </span>
      {mission && (
        <span className="absolute inset-x-2 bottom-1 h-1 border border-white/10 bg-black/38">
          <span
            className="block h-full"
            style={{
              backgroundColor: mission.complete ? '#71f09a' : destination.accent,
              width: `${missionProgress}%`,
            }}
          />
        </span>
      )}
      {isObjective && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 bg-[#ffd34f]" />}
    </button>
  );
};

const ControlHintPanel = ({ hub, nearbyDestination, step = 'drive' }) => {
  if (hub?.onboardingSeen || step === 'done') return null;
  const hint = CONTROL_HINTS[step] || CONTROL_HINTS.drive;
  const Icon = hint.Icon;
  const enterLabel = nearbyDestination ? nearbyDestination.shortTitle : 'Portal';
  const SecondaryIcon = step === 'enter' ? Zap : MapPin;
  const secondaryDesktop = hint.secondaryDesktop || (step === 'enter' ? enterLabel : 'Mission route');
  const secondaryMobile = hint.secondaryMobile || (step === 'enter' ? enterLabel : 'Mission route');

  return (
    <div
      className="world-hud-panel pointer-events-auto absolute left-2 top-[174px] z-[55] w-[min(64vw,230px)] border border-white/18 bg-[#10151d]/[0.88] px-3 py-2 text-white shadow-[0_14px_34px_rgba(0,0,0,0.32)] backdrop-blur-md sm:left-5 sm:top-auto sm:bottom-[172px] sm:w-[218px]"
      data-onboarding-step={step}
      data-testid="world-control-hints"
    >
      <div className="flex items-center gap-2 font-mono text-[8px] font-black uppercase leading-none tracking-[0.16em] text-[#ffd34f]">
        <Icon size={11} />
        {hint.label}
      </div>
      <div className="mt-2 grid gap-1.5 font-mono text-[9px] font-black uppercase tracking-[0.1em] text-white/72">
        <div className="hidden items-center gap-2 sm:flex">
          <ChevronsRight size={12} className="text-[#46d9ef]" />
          {hint.desktop}
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <SecondaryIcon size={12} className="text-[#ffd34f]" />
          {secondaryDesktop}
        </div>
        <div className="flex items-center gap-2 sm:hidden">
          <ChevronsRight size={12} className="text-[#46d9ef]" />
          {hint.mobile}
        </div>
        <div className="flex items-center gap-2 sm:hidden">
          <SecondaryIcon size={12} className="text-[#ffd34f]" />
          {secondaryMobile}
        </div>
      </div>
    </div>
  );
};

const WorldHelpButton = ({ onShowHelp }) => (
  <button
    type="button"
    aria-label="Show world controls"
    className="pointer-events-auto grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/20 bg-[#10151d]/[0.94] text-white shadow-[0_12px_28px_rgba(0,0,0,0.3)] backdrop-blur-md transition-colors hover:border-[#ffd34f]/70 hover:text-[#ffd34f] sm:h-11 sm:w-11"
    data-testid="world-help-button"
    onClick={onShowHelp}
    title="Show controls"
  >
    <HelpCircle size={15} />
  </button>
);

const RewardPulse = ({ rewardPulse }) => {
  if (!rewardPulse) return null;
  const actionSummary =
    rewardPulse.actions?.length > 0
      ? rewardPulse.actions.slice(0, 2).join(' / ')
      : 'City progress updated';
  const extraCount = Math.max(0, (rewardPulse.actions?.length || 0) - 2);
  const nextRoute =
    rewardPulse.nextMissionTitle && rewardPulse.nextDestinationTitle
      ? `${rewardPulse.nextMissionTitle} -> ${rewardPulse.nextDestinationTitle}`
      : null;

  return (
    <div
      className="world-hud-panel pointer-events-auto absolute left-1/2 top-[74px] z-[65] w-[min(88vw,360px)] -translate-x-1/2 border border-[#ffd34f]/60 bg-[#10151d]/[0.94] px-4 py-3 text-white shadow-[0_18px_46px_rgba(0,0,0,0.34)] backdrop-blur-md sm:top-5"
      data-action-count={rewardPulse.actions?.length || 0}
      data-next-destination-key={rewardPulse.nextDestinationKey || ''}
      data-next-mission-key={rewardPulse.nextMissionKey || ''}
      data-testid="world-reward-pulse"
      data-xp-delta={rewardPulse.xpDelta || 0}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center border border-[#ffd34f]/80 bg-[#ffd34f]/16 text-[#ffd34f]">
          <Sparkles size={20} />
        </div>
        <div className="min-w-0">
          <div className="font-mono text-[8px] font-black uppercase leading-none tracking-[0.16em] text-[#ffd34f]">
            City Feedback
          </div>
          <div className="mt-1 truncate font-mono text-sm font-black uppercase leading-none">
            +{rewardPulse.xpDelta || 0} City XP
          </div>
          <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.1em] text-white/58">
            {actionSummary}
            {extraCount > 0 ? ` +${extraCount}` : ''}
          </div>
          {nextRoute && (
            <div className="mt-2 flex min-w-0 items-center gap-1.5 border-t border-white/12 pt-2 font-mono text-[8px] font-black uppercase tracking-[0.12em] text-[#ffd34f]">
              <Target size={10} />
              <span className="truncate">Next route: {nextRoute}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const HudOverlay = ({
  activeMission,
  destinations,
  hub,
  missions = [],
  nearbyDestination,
  onBasicMode,
  onEnter,
  onboardingStep = 'drive',
  onShowHelp,
  profile,
  rewardPulse,
}) => {
  const xpPct = Math.round((profile.currentLevelXp / profile.nextLevelXp) * 100);
  const shieldTone =
    profile.recoveryShield < 70
      ? 'text-[#ff7a70]'
      : profile.recoveryShield < 90
      ? 'text-[#ffd34f]'
      : 'text-[#71f09a]';
  const currentDestinationLabel = nearbyDestination?.title || 'Cruising';
  const missionDestination = activeMission
    ? destinations.find((destination) => destination.key === activeMission.destinationKey)
    : null;
  const raceDestination = destinations.find((destination) => destination.key === 'raceway');
  const routeDestination = nearbyDestination || (!activeMission?.complete ? missionDestination : null);
  const closeupDestinations = destinations.filter((destination) => DISTRICT_VISUALS[destination.key]);
  const missionsByDestination = new Map(
    missions.map((mission) => [mission.destinationKey, mission])
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <div className="pointer-events-none absolute left-5 top-5 hidden sm:block">
        <ComebackCityLogo />
      </div>

      <div className="comeback-slogan-badge pointer-events-none absolute left-1/2 top-[126px] hidden -translate-x-1/2 px-5 py-2 font-mono text-[11px] font-black uppercase tracking-[0.12em] text-white sm:block">
        Train. Improve. Comeback.
      </div>

      <ControlHintPanel hub={hub} nearbyDestination={nearbyDestination} step={onboardingStep} />
      <RewardPulse rewardPulse={rewardPulse} />

      <div className="world-hud-panel pointer-events-auto absolute left-5 top-[132px] hidden w-[300px] border border-white/18 bg-[#061522]/[0.88] p-2.5 text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur-md xl:block">
        <div className="grid grid-cols-[44px_1fr] items-center gap-2.5">
          <div className="grid h-11 w-11 place-items-center rounded-full border-2 border-[#46d9ef] bg-[#46d9ef]/15 font-mono text-lg font-black text-white">
            {profile.level}
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-white/64">
              Trainer
            </div>
            <div className="mt-1 h-2 border border-white/18 bg-black/34">
              <div
                className="h-full bg-[#9bff4f] transition-all duration-500"
                style={{ width: `${xpPct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-white/58">
              <span>{profile.currentLevelXp}</span>
              <span>{profile.nextLevelXp} XP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-2 right-2 top-2 flex items-start justify-end gap-2 sm:left-4 sm:right-4 sm:top-4">
        <div className="world-hud-panel hidden min-w-0 w-[278px] flex-none border border-white/18 bg-[#10151d]/[0.9] p-2 text-white shadow-[0_14px_38px_rgba(0,0,0,0.34)] backdrop-blur-md">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[9px] font-mono font-black uppercase leading-none tracking-[0.18em] text-[#ffd34f]">
                <Car size={12} />
                World Mode
              </div>
              <div className="mt-1 truncate font-mono text-[17px] font-black uppercase leading-none sm:text-[22px]">
                Comeback City
              </div>
            </div>
            <div className="grid h-9 w-9 shrink-0 place-items-center border-2 border-[#ffd34f] bg-[#ffd34f]/14 text-[#ffd34f] sm:h-10 sm:w-10">
              <span className="font-mono text-base font-black leading-none tabular-nums sm:text-lg">{profile.level}</span>
            </div>
          </div>

          <div className="mt-1.5 grid grid-cols-[1fr_auto] items-center gap-2">
            <div>
              <div className="h-1.5 border border-white/18 bg-black/34">
                <div
                  className="h-full bg-[#ffd34f] transition-all duration-500"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
              <div className="mt-1 hidden justify-between font-mono text-[8px] uppercase tracking-[0.12em] text-white/55 sm:flex">
                <span>XP {profile.currentLevelXp}/{profile.nextLevelXp}</span>
                <span>{xpPct}%</span>
              </div>
            </div>
            <div className="font-mono text-[8px] uppercase leading-tight tracking-[0.12em] text-white/58 sm:hidden">
              Level
            </div>
          </div>

          <div className="mt-2 hidden grid-cols-3 gap-2 border-t border-white/12 pt-2">
            <Stat label="Streak" value={profile.streak} suffix="d" />
            <Stat label="Combo" value={profile.combo} suffix="x" tone="text-[#ffd34f]" />
            <Stat label="Shield" value={profile.recoveryShield} tone={shieldTone} />
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <CurrencyStack className="hidden sm:grid" />
          {onShowHelp && <WorldHelpButton onShowHelp={onShowHelp} />}
          {raceDestination && (
            <button
              type="button"
              onClick={() => onEnter(raceDestination)}
              className="pointer-events-auto flex h-10 shrink-0 items-center gap-2 rounded-lg border border-[#ffd34f]/70 bg-[#ffd34f] px-3 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#10151d] shadow-[0_12px_28px_rgba(0,0,0,0.3)] transition-transform active:scale-[0.98] sm:h-11 sm:px-4"
            >
              <Trophy size={14} />
              Race GP
            </button>
          )}
          <button
            type="button"
            onClick={onBasicMode}
            className="pointer-events-auto flex h-10 shrink-0 items-center gap-2 rounded-lg border border-white/20 bg-[#10151d]/[0.94] px-3 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-[0_12px_28px_rgba(0,0,0,0.3)] backdrop-blur-md transition-colors hover:border-[#ffd34f]/70 hover:text-[#ffd34f] sm:h-11 sm:px-4"
          >
            <Gauge size={14} />
            Basic
          </button>
        </div>
      </div>

      <div className="absolute left-2 top-[58px] grid max-w-[min(74vw,286px)] gap-2 sm:hidden">
        <div className="world-hud-panel hidden border border-white/18 bg-[#10151d]/[0.94] px-3 py-2 text-white shadow-[0_10px_26px_rgba(0,0,0,0.3)] backdrop-blur-md">
          <div className="flex items-center gap-2 font-mono text-[9px] font-black uppercase leading-none tracking-[0.16em] text-white/62">
            <MapPin size={12} className="text-[#ffd34f]" />
            Nearby
          </div>
          <div className="mt-1 truncate font-mono text-sm font-black uppercase leading-none text-white">
            {currentDestinationLabel}
          </div>
        </div>
        <MissionPanel destination={missionDestination} mission={activeMission} onEnter={onEnter} />
      </div>

      {nearbyDestination && (
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+174px)] left-1/2 w-[min(88vw,360px)] -translate-x-1/2 sm:bottom-6">
          <button
            type="button"
            onClick={() => onEnter(nearbyDestination)}
            className="pointer-events-auto flex w-full items-center justify-center gap-2 border-2 border-[#ffd34f] bg-[#ffd34f] px-4 py-3 font-mono text-sm font-black uppercase tracking-[0.14em] text-[#10151d] shadow-[0_18px_46px_rgba(0,0,0,0.34)] transition-transform active:scale-[0.98]"
          >
            <Zap size={16} />
            Enter {nearbyDestination.title}
          </button>
        </div>
      )}

      {routeDestination && (
        <button
          type="button"
          onClick={() => onEnter(routeDestination)}
          className="world-mobile-go pointer-events-auto absolute bottom-[118px] z-[60] grid h-[78px] w-[78px] place-items-center rounded-full border-2 border-white/65 bg-[#ffd34f] font-mono text-[12px] font-black uppercase tracking-[0.08em] text-[#10151d] shadow-[0_18px_44px_rgba(0,0,0,0.42)] sm:hidden"
          style={{ left: 'min(calc(100% - 90px), 300px)' }}
          title={`Route to ${routeDestination.title}`}
        >
          <span className="grid place-items-center leading-none">
            <ChevronsRight size={31} strokeWidth={3.2} />
            <span>Go</span>
          </span>
        </button>
      )}

      <div className="absolute bottom-24 left-2 z-30 sm:hidden">
        <MiniMap
          activeMission={activeMission}
          className="scale-[0.82] origin-bottom-left"
          destinations={destinations}
          nearbyDestination={nearbyDestination}
          onEnter={onEnter}
        />
      </div>

      <div className="absolute bottom-4 left-4 hidden sm:block">
        <MiniMap
          activeMission={activeMission}
          className="hidden sm:block"
          destinations={destinations}
          nearbyDestination={nearbyDestination}
          onEnter={onEnter}
        />
      </div>

      <div className="absolute bottom-[86px] left-1/2 hidden -translate-x-1/2 lg:block">
        <DistrictCloseupStrip destinations={closeupDestinations} onEnter={onEnter} />
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-white/14 bg-[#10151d]/[0.93] px-2 pb-[calc(env(safe-area-inset-bottom)+7px)] pt-2 backdrop-blur-md sm:left-1/2 sm:right-auto sm:top-auto sm:bottom-4 sm:w-[min(720px,calc(100vw-360px))] sm:-translate-x-1/2 sm:border sm:p-2">
        <div className="mb-1 hidden items-center gap-2 px-1 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-white/48 sm:flex">
          <HeartPulse size={11} />
          Districts
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none sm:overflow-visible">
          {destinations.map((destination) => (
            <DestinationButton
              key={destination.key}
              active={nearbyDestination?.key === destination.key}
              activeMission={activeMission}
              destination={destination}
              mission={missionsByDestination.get(destination.key)}
              onEnter={onEnter}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
