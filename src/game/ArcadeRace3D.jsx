import { useEffect, useRef, useState } from 'react';
import {
  CAMERA_PRESETS,
  VISUAL_PALETTE,
} from './comebackCityVisualTokens.jsx';
import {
  DEFAULT_VEHICLE_BY_STYLE,
  VEHICLES,
} from './race/physics/kartTuning.js';
import {
  RACE_RENDER_SCALE_LEGACY,
  fitRaceRendererToCanvas,
} from './race/render/createRaceScene.js';
import {
  createDroppedBananaMaterial,
} from './race/render/createRacePickups.js';
import { syncRaceMeshes } from './race/render/syncRaceMeshes.js';
import {
  normalizedSpeedFor,
  recordSteeringTurn90,
} from './race/raceTelemetry.js';
import { RaceHud } from './race/raceHud.jsx';
import { createRaceAudioController } from './race/raceAudio.js';
import {
  applyRaceKeyDown,
  applyRaceKeyUp,
  applyRaceTouchPatch,
  defaultRaceTouchControls,
  processRaceCommandFrame,
  resolveRaceControls,
} from './race/raceControlsBase.js';
import { scoreRacer } from './race/raceProgress.js';
import { createRacePlaytestNoopRuntime } from './race/playtest/racePlaytestNoopRuntime.js';
import { createRaceRuntimeActions } from './race/raceRuntimeActions.js';
import { createRaceVehicleRuntime } from './race/raceVehicleRuntime.js';
import {
  advanceRaceFrameClock,
  recordRaceFramePhaseStats,
} from './race/raceFrameClock.js';
import { publishRaceFinishResult } from './race/raceFinishRuntime.js';
import { createRaceRuntimeBaseSetup } from './race/raceRuntimeBaseSetup.js';
import { createRaceRuntimeScene } from './race/raceSceneRuntime.js';
import { createRaceUpdateRuntime } from './race/raceUpdateRuntime.js';
import { createRaceCameraRuntime } from './race/raceCameraRuntime.js';
import { createRaceTelemetryRuntime } from './race/raceTelemetryRuntime.js';
import { createRaceMotionRuntime } from './race/raceMotionRuntime.js';

const distance2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const RACE_PLAYTEST_HOOK_FLAG = import.meta.env.VITE_RACE_PLAYTEST_HOOKS;
const RACE_PLAYTEST_RUNTIME_ENABLED =
  import.meta.env.DEV ||
  RACE_PLAYTEST_HOOK_FLAG === 'true' ||
  RACE_PLAYTEST_HOOK_FLAG === 'TRUE' ||
  RACE_PLAYTEST_HOOK_FLAG === 'True';
const RACE_DIAGNOSTIC_TELEMETRY_FLAG = import.meta.env.VITE_RACE_DIAGNOSTIC_TELEMETRY;
const RACE_DIAGNOSTIC_TELEMETRY_ENABLED =
  RACE_PLAYTEST_RUNTIME_ENABLED ||
  RACE_DIAGNOSTIC_TELEMETRY_FLAG === 'true' ||
  RACE_DIAGNOSTIC_TELEMETRY_FLAG === 'TRUE' ||
  RACE_DIAGNOSTIC_TELEMETRY_FLAG === 'True';

const loadRacePlaytestRuntime = async () => {
  if (!RACE_PLAYTEST_RUNTIME_ENABLED) return createRacePlaytestNoopRuntime();
  const module = await import('./race/playtest/racePlaytestRuntime.js');
  return module.createRacePlaytestRuntime();
};

const raceTelemetryDiagnosticsNoop = {
  publish: () => null,
  reset: () => {},
};

const loadRaceTelemetryDiagnostics = async () => {
  if (!RACE_DIAGNOSTIC_TELEMETRY_ENABLED) return raceTelemetryDiagnosticsNoop;
  const module = await import('./race/raceTelemetryDiagnostics.js');
  return module.createRaceTelemetryDiagnostics(window);
};

export const ArcadeRace3D = ({
  command,
  inventory,
  onFinish,
  onInventoryUse,
  onWebGLUnavailable = null,
  profile,
  reducedMotion = false,
  runId,
  track,
}) => {
  const canvasRef = useRef(null);
  const raceAudioRef = useRef(null);
  const commandRef = useRef(command);
  const inventoryRef = useRef(inventory);
  const onFinishRef = useRef(onFinish);
  const onInventoryUseRef = useRef(onInventoryUse);
  const onWebGLUnavailableRef = useRef(onWebGLUnavailable);
  const audioMutedRef = useRef(false);
  const localCommandRef = useRef(null);
  const touchRef = useRef(defaultRaceTouchControls());
  const [audioMuted, setAudioMutedState] = useState(false);
  const [hideMinimap, setHideMinimap] = useState(false);
  const [telemetry, setTelemetry] = useState({
    altitude: 0,
    audioMuted: false,
    bananas: 0,
    boost: 0,
    boostTier: 0,
    cameraFlash: 0,
    drift: 0,
    driftActive: false,
    driftTier: 0,
    doubleSlotUses: 0,
    heldBalloon: null,
    itemTier: 0,
    jump: 0,
    lap: 1,
    lapSplits: [],
    perfect: false,
    place: 1,
    positionNotice: null,
    rareNextPickup: false,
    reducedMotion: false,
    secondaryHeldItem: null,
    shield: 0,
    offroad: false,
    speed: 0,
    speedRatio: 0,
    time: 0,
    upgradeAvailable: false,
    vehicleMode: DEFAULT_VEHICLE_BY_STYLE[track.raceStyle] || 'kart',
  });

  useEffect(() => {
    commandRef.current = command;
  }, [command]);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    onInventoryUseRef.current = onInventoryUse;
  }, [onInventoryUse]);

  useEffect(() => {
    onWebGLUnavailableRef.current = onWebGLUnavailable;
  }, [onWebGLUnavailable]);

  const queueLocalCommand = (type) => {
    localCommandRef.current = { id: Date.now() + Math.random(), type };
  };

  const setAudioMuted = (nextMuted) => {
    const muted = Boolean(nextMuted);
    audioMutedRef.current = muted;
    raceAudioRef.current?.setMuted(muted);
    setAudioMutedState(muted);
  };

  useEffect(() => {
    if (!runId) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let disposed = false;
    let teardown = () => {};

    const startRaceRuntime = async () => {
      const [playtestRuntime, telemetryDiagnostics] = await Promise.all([
        loadRacePlaytestRuntime(),
        loadRaceTelemetryDiagnostics(),
      ]);
      if (disposed) return;
      const playtest = playtestRuntime.createRacePlaytestState(window.location.search);
      setHideMinimap(Boolean(playtest.hideMinimap));
      const {
        compiled,
        defaultVehicle,
        kartOnly,
        keys,
        race,
        relevantKeys,
        visualStats,
      } = createRaceRuntimeBaseSetup({
        playtest,
        profile,
        track,
      });

      const runtimeScene = createRaceRuntimeScene({
        canvas,
        compiled,
        defaultVehicle,
        onWebGLUnavailable: () => onWebGLUnavailableRef.current?.(),
        profile,
        race,
        visualPalette: VISUAL_PALETTE,
      });
      const { renderer } = runtimeScene;
      if (!renderer) return;

      const {
        balloonMeshes,
        bananaMeshes,
        bounds,
        camera,
        cameraCollisionObjects,
        collisionCircles,
        flightGateMeshes,
        playerVehicle,
        rivalModels,
        scene,
        sceneBudget,
        switchPadMeshes,
        switchRing,
        trackHazardMeshes,
        world,
        zipperMeshes,
      } = runtimeScene;

      const droppedBananaMat = createDroppedBananaMaterial();
      const droppedBananaMeshes = [];
      const trapMeshes = [];

      let raf = 0;
      let lastFrame = performance.now();
      const commandState = {
        lastExternalCommandId: 0,
        lastLocalCommandId: 0,
      };
      let jumpQueued = false;
      let reportedFinish = false;
      const raceViewport = { height: 1, mobile: false, width: 1 };
      const raceMotion = createRaceMotionRuntime({
        canvas,
        reducedMotionSetting: reducedMotion,
        windowRef: window,
      });
      playtestRuntime.resetRacePlaytestGlobals({ playtest, windowRef: window });
      telemetryDiagnostics.reset({ trackKey: compiled.key });

      const recordPlaytest = (type, detail = {}) => {
        playtestRuntime.recordRacePlaytestEvent({
          compiled,
          detail,
          playtest,
          race,
          type,
          windowRef: window,
        });
      };

      const fitRenderer = () =>
        fitRaceRendererToCanvas({
          camera,
          canvas,
          raceViewport,
          renderer,
          // Legacy stays at the scale its browser-suite pixel thresholds were
          // calibrated at; the shipped racer's A3 raise does not apply here.
          scaleTable: RACE_RENDER_SCALE_LEGACY,
          windowRef: window,
        });

      const currentControls = () =>
        resolveRaceControls({
          jumpQueued,
          keys,
          playtest,
          playtestControlsFor: playtestRuntime.resolveRacePlaytestControls,
          touch: touchRef.current,
          visualStats,
        });

      const raceAudio = createRaceAudioController({
        muted: audioMutedRef.current,
        trackKey: compiled.key,
      });
      raceAudioRef.current = raceAudio;
      window.__raceWebGLContextStatus = {
        fallbackRequested: false,
        lost: false,
        restored: false,
        trackKey: compiled.key,
      };
      const playCue = raceAudio.playCue;
      const {
        addBoost,
        nextVehicleMode,
        setVehicleMode,
      } = createRaceVehicleRuntime({
        defaultVehicle,
        kartOnly,
        playCue,
        playerVehicle,
        race,
        vehicles: VEHICLES,
        visualStats,
      });

      const raceActions = createRaceRuntimeActions({
        addBoost,
        compiled,
        defaultVehicle,
        distanceBetween: distance2D,
        droppedBananaMat,
        droppedBananaMeshes,
        inventoryRef,
        kartOnly,
        nextVehicleMode,
        onInventoryUseRef,
        playCue,
        playerVehicle,
        race,
        scoreRacer,
        setVehicleMode,
        trapMeshes,
        visualStats,
        world,
      });
      const {
        applyRaceItem,
        buyDoubleSlot,
        buyRareNextPickup,
        collectBalloon,
        hitPlayer,
        hitRival,
        upgradeHeldItem,
      } = raceActions;

      const {
        updateAutoplayPlayer,
        updateBreakables,
        updateCrossers,
        updatePlayer,
        updateRankings,
        updateRivals,
        updateTrackEvents,
        updateTrackHazards,
      } = createRaceUpdateRuntime({
        addBoost,
        applyItem: applyRaceItem,
        bounds,
        buyDoubleSlot,
        buyRareNextPickup,
        collectBalloon,
        collisionCircles,
        compiled,
        defaultVehicle,
        distanceBetween: distance2D,
        getControls: currentControls,
        getTouchControls: () => touchRef.current,
        hitPlayer,
        hitRival,
        kartOnly,
        nextVehicleMode,
        playtest,
        profile,
        race,
        recordPlaytest,
        score: scoreRacer,
        setJumpQueued: (nextJumpQueued) => {
          jumpQueued = nextJumpQueued;
        },
        setVehicleMode,
        updateAutoplay: playtestRuntime.updateRaceAutoplayPlayer,
        upgradeHeldItem,
        useVisualRivalCluster: playtestRuntime.isVisualRivalCluster,
        vehicles: VEHICLES,
        visualStats,
      });

      const raceCamera = createRaceCameraRuntime({
        camera,
        cameraCollisionObjects,
        compiled,
        getMobile: () => raceViewport.mobile,
        getReducedMotion: raceMotion.isReduced,
        mobilePreset: CAMERA_PRESETS.mobileChase,
        playtest,
        race,
        useHeadingCameraFor: playtestRuntime.visualScenarioUsesHeadingCamera,
        vehicles: VEHICLES,
        visualStats,
      });
      const raceTelemetry = createRaceTelemetryRuntime({
        camera,
        boostPadMeshes: zipperMeshes,
        brakingTelemetryActiveFor: playtestRuntime.isVisualBrakingScenario,
        collisionCircles,
        compiled,
        getCameraRouteLookahead: raceCamera.getRouteLookahead,
        includeVisualTelemetry: RACE_DIAGNOSTIC_TELEMETRY_ENABLED,
        kartOnly,
        playtest,
        playerVehicleGroup: playerVehicle.group,
        publishDiagnostics: telemetryDiagnostics.publish,
        race,
        renderer,
        sceneBudget,
        setTelemetry,
        stats: visualStats,
        vehicles: VEHICLES,
        windowRef: window,
      });

      let webglContextLost = false;
      const tick = (now) => {
        if (webglContextLost) return;
        const frameStartedAt = performance.now();
        let phaseStartedAt = frameStartedAt;
        const framePhases = {};
        const markPhase = (phaseKey, { also = [] } = {}) => {
          const phaseEndedAt = performance.now();
          const duration = phaseEndedAt - phaseStartedAt;
          framePhases[phaseKey] = duration;
          also.forEach((key) => {
            framePhases[key] = duration;
          });
          phaseStartedAt = phaseEndedAt;
        };

        race.audioMuted = audioMutedRef.current;
        race.reducedMotion = raceMotion.isReduced();
        const frameClock = advanceRaceFrameClock({
          lastFrame,
          now,
          playtest,
          race,
          stats: visualStats,
        });
        const { dt } = frameClock;
        lastFrame = frameClock.lastFrame;
        markPhase('clock');
        fitRenderer();
        markPhase('fitRenderer');

        processRaceCommandFrame({
          actions: raceActions,
          commandState,
          externalCommand: commandRef.current,
          keys,
          localCommand: localCommandRef.current,
        });
        markPhase('commands');

        const manualScenarioActive = playtestRuntime.manualVisualScenarioIsActive(playtest);
        const manualScenarioPrimedBeforeFrame =
          manualScenarioActive && playtestRuntime.manualVisualScenarioIsPrimed(playtest);
        playtestRuntime.primeVisualKartScenario({
          collisionCircles,
          compiled,
          normalizedSpeedFor,
          playtest,
          race,
          setVehicleMode,
          vehicles: VEHICLES,
          visualStats,
        });
        markPhase('visualPrime', {
          also: manualScenarioActive
            ? [manualScenarioPrimedBeforeFrame ? 'visualPrimeRuntime' : 'visualPrimeSetup']
            : [],
        });
        if (manualScenarioActive) {
          updatePlayer(dt);
          playtestRuntime.applyVisualKartScenarioFrame({
            compiled,
            normalizedSpeedFor,
            playtest,
            race,
            recordSteeringTurn90,
            vehicles: VEHICLES,
            visualStats,
          });
        } else if (playtest.enabled) updateAutoplayPlayer(dt);
        else updatePlayer(dt);
        markPhase('player');
        updateRivals(dt);
        updateTrackEvents(dt);
        updateTrackHazards(dt);
        updateBreakables(dt);
        updateCrossers(dt);
        updateRankings();
        markPhase('world');
        syncRaceMeshes({
          balloonMeshes,
          bananaMeshes,
          compiled,
          defaultVehicle,
          droppedBananaMeshes,
          dt,
          flightGateMeshes,
          now,
          playerVehicle,
          race,
          rivalModels,
          switchPadMeshes,
          switchRing,
          trackHazardMeshes,
          trapMeshes,
          world,
          zipperMeshes,
        });
        markPhase('syncMeshes');
        raceCamera.updateCamera(dt);
        markPhase('camera');
        renderer.render(scene, camera);
        markPhase('render');
        raceTelemetry.publishTelemetry(now);
        markPhase('telemetry');

        if (race.player.finished && !reportedFinish) {
          reportedFinish = true;
          publishRaceFinishResult({
            compiled,
            onFinishRef,
            playtest,
            publishPlaytestResult: (result) =>
              playtestRuntime.publishRacePlaytestResult({ result, windowRef: window }),
            race,
            recordPlaytest,
          });
        }
        markPhase('finish');
        recordRaceFramePhaseStats({
          phases: framePhases,
          stats: visualStats,
          totalMs: performance.now() - frameStartedAt,
        });

        raf = window.requestAnimationFrame(tick);
      };

      const keyDown = (event) => {
        jumpQueued = applyRaceKeyDown({ event, jumpQueued, keys, relevantKeys }).jumpQueued;
      };
      const keyUp = (event) => {
        applyRaceKeyUp({ event, keys, relevantKeys });
      };
      const clearLifecycleInput = () => {
        const hadKeyboardInput = keys.size > 0 || jumpQueued;
        const touch = touchRef.current || defaultRaceTouchControls();
        const hadTouchInput =
          Boolean(touch.drift || touch.jump) ||
          Math.abs(Number(touch.steer) || 0) > 0 ||
          Math.abs(Number(touch.throttle) || 0) > 0 ||
          Math.abs(Number(touch.brake) || 0) > 0;
        keys.clear();
        touchRef.current = defaultRaceTouchControls();
        jumpQueued = false;
        if (hadKeyboardInput || hadTouchInput) {
          visualStats.lifecycleInputClearCount = (visualStats.lifecycleInputClearCount || 0) + 1;
        }
      };
      const pauseForLifecycle = (eventType) => {
        clearLifecycleInput();
        raceAudio.suspend?.();
        visualStats.lifecycleAudioSuspendCount = (visualStats.lifecycleAudioSuspendCount || 0) + 1;
        visualStats.lifecycleLastEvent = eventType;
        visualStats.lifecyclePauseCount = (visualStats.lifecyclePauseCount || 0) + 1;
      };
      const resumeFromLifecycle = (eventType) => {
        lastFrame = performance.now();
        raceAudio.resume?.();
        visualStats.lifecycleAudioResumeCount = (visualStats.lifecycleAudioResumeCount || 0) + 1;
        visualStats.lifecycleLastEvent = eventType;
        visualStats.lifecycleLastFrameResetAt = Number((lastFrame / 1000).toFixed(3));
        visualStats.lifecycleResumeCount = (visualStats.lifecycleResumeCount || 0) + 1;
      };
      const handleVisibilityChange = () => {
        if (document.hidden) pauseForLifecycle('visibility-hidden');
        else resumeFromLifecycle('visibility-visible');
      };
      const handlePageHide = (event) => {
        if (event?.persisted) {
          visualStats.lifecyclePageHidePersistedCount = (visualStats.lifecyclePageHidePersistedCount || 0) + 1;
        }
        pauseForLifecycle('pagehide');
      };
      const handlePageShow = (event) => {
        if (event?.persisted) {
          visualStats.lifecyclePageShowPersistedCount = (visualStats.lifecyclePageShowPersistedCount || 0) + 1;
        }
        resumeFromLifecycle('pageshow');
      };
      const handleBlur = () => pauseForLifecycle('blur');
      const handleFocus = () => resumeFromLifecycle('focus');
      const handleWebGLContextLost = (event) => {
        event?.preventDefault?.();
        if (webglContextLost) return;
        webglContextLost = true;
        window.cancelAnimationFrame(raf);
        clearLifecycleInput();
        raceAudio.suspend?.();
        visualStats.webglContextLostCount = (visualStats.webglContextLostCount || 0) + 1;
        visualStats.webglFallbackRequestCount = (visualStats.webglFallbackRequestCount || 0) + 1;
        visualStats.webglLastContextEvent = 'webglcontextlost';
        window.__raceWebGLContextStatus = {
          defaultPrevented: Boolean(event?.defaultPrevented),
          fallbackRequested: true,
          lost: true,
          restored: false,
          trackKey: compiled.key,
        };
        onWebGLUnavailableRef.current?.();
      };
      const handleWebGLContextRestored = () => {
        visualStats.webglContextRestoredCount = (visualStats.webglContextRestoredCount || 0) + 1;
        visualStats.webglLastContextEvent = 'webglcontextrestored';
        window.__raceWebGLContextStatus = {
          ...(window.__raceWebGLContextStatus || {}),
          restored: true,
          trackKey: compiled.key,
        };
      };

      window.addEventListener('keydown', keyDown, { passive: false });
      window.addEventListener('keyup', keyUp, { passive: false });
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('pagehide', handlePageHide);
      window.addEventListener('pageshow', handlePageShow);
      window.addEventListener('blur', handleBlur);
      window.addEventListener('focus', handleFocus);
      canvas.addEventListener('webglcontextlost', handleWebGLContextLost, false);
      canvas.addEventListener('webglcontextrestored', handleWebGLContextRestored, false);
      raf = window.requestAnimationFrame(tick);

      teardown = () => {
        window.cancelAnimationFrame(raf);
        window.removeEventListener('keydown', keyDown);
        window.removeEventListener('keyup', keyUp);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('pageshow', handlePageShow);
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('focus', handleFocus);
        canvas.removeEventListener('webglcontextlost', handleWebGLContextLost);
        canvas.removeEventListener('webglcontextrestored', handleWebGLContextRestored);
        raceAudio.dispose();
        telemetryDiagnostics.reset({ trackKey: compiled.key });
        setHideMinimap(false);
        raceMotion.dispose();
        renderer.dispose();
        if (raceAudioRef.current === raceAudio) raceAudioRef.current = null;
      };
    };

    startRaceRuntime().catch((error) => {
      if (disposed) return;
      console.error('Race runtime startup failed', error);
      onWebGLUnavailableRef.current?.();
    });

    return () => {
      disposed = true;
      teardown();
    };
  }, [profile, reducedMotion, runId, track]);

  const press = (patch) => (event) => {
    applyRaceTouchPatch({ event, patch, touch: touchRef.current });
  };
  const release = (patch) => (event) => {
    applyRaceTouchPatch({ capture: 'release', event, patch, touch: touchRef.current });
  };

  return (
    <RaceHud
      audioMuted={audioMuted}
      canvasRef={canvasRef}
      hideMinimap={hideMinimap}
      onAudioMutedChange={setAudioMuted}
      onCommand={queueLocalCommand}
      onPress={press}
      onRelease={release}
      reducedMotion={reducedMotion}
      telemetry={telemetry}
      track={track}
    />
  );
};
